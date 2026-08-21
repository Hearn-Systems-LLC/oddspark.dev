#!/usr/bin/env node
// Runtime-assembly identity tooling (Story 1.23). Node-only: it reads the
// canonical src/pipeline/ module sources, hashes them, and composes the
// deterministic assembly identity through src/pipeline/identity.mjs.
//
//   node scripts/assembly-identity.mjs freeze   — write runtime-assembly.json
//   node scripts/assembly-identity.mjs verify   — fail on drift
//
// Verify also enforces the runtime-neutrality invariant on every canonical
// module: no Node builtin import in any syntax (static, side-effect,
// re-export, literal or computed dynamic), no require(), no eval()/Function(),
// and no process/Buffer global references in dot or bracket form. Matching is
// deliberately conservative: comments and string literals are scanned too,
// so a suspicious pattern fails closed rather than being parsed away.
// Any .mjs/.js file under src/pipeline/ whose name does not match the
// canonical module pattern fails freeze/verify by name, so no module can
// evade the identity or the scan.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { computeAssemblyIdentity } from "../src/pipeline/identity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PIPELINE_DIR = path.join(ROOT, "src", "pipeline");
const DEFAULT_IDENTITY_FILE = path.join(ROOT, "runtime-assembly.json");

const BARE_BUILTINS = new Set(builtinModules.map((name) => name.replace(/^node:/, "")));
const MODULE_FILE = /^[a-z][a-z0-9-]*\.mjs$/;
const JS_LIKE = /\.(?:mjs|js)$/;

// Every import/export specifier syntax, so no ordinary import form can evade
// the neutrality gate.
const SPECIFIER_PATTERNS = [
  { pattern: /\bimport\s+(?:[\w${},*\s]+\s+from\s+)?["']([^"']+)["']/g, label: "static or side-effect import" },
  { pattern: /\bexport\s+(?:[\w${},*\s]+\s+from\s+)["']([^"']+)["']/g, label: "re-export" },
  { pattern: /\bexport\s+\*\s+from\s+["']([^"']+)["']/g, label: "re-export" },
  { pattern: /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, label: "dynamic import" },
];
const GLOBAL_PATTERNS = [
  { pattern: /\brequire\s*\(/, label: "require() call" },
  { pattern: /\bprocess\s*\.\s*[A-Za-z_$]/, label: "process.* global reference" },
  { pattern: /\bprocess\s*\[/, label: "process[...] bracket access" },
  { pattern: /\bBuffer\b/, label: "Buffer global" },
  { pattern: /\bglobalThis\s*\.\s*(?:process|Buffer)\b/, label: "globalThis.process/Buffer" },
  { pattern: /\bglobalThis\s*\[\s*["'](?:process|Buffer)["']\s*\]/, label: "globalThis bracket access to process/Buffer" },
  { pattern: /\beval\s*\(/, label: "eval() call" },
  { pattern: /\bFunction\s*\(/, label: "Function() constructor" },
  { pattern: /\bimport\s*\(\s*[^"')\s]/, label: "computed dynamic import" },
];

function isBannedSpecifier(specifier) {
  if (specifier.startsWith("node:")) return true;
  return BARE_BUILTINS.has(specifier);
}

// Returns a list of human-readable violations; an empty list means the source
// is runtime-neutral.
export function findNeutralityViolations(source) {
  const violations = [];
  for (const { pattern, label } of SPECIFIER_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      if (isBannedSpecifier(match[1])) violations.push(`${label} of Node builtin "${match[1]}"`);
    }
  }
  for (const { pattern, label } of GLOBAL_PATTERNS) {
    if (pattern.test(source)) violations.push(label);
  }
  return violations;
}

export function moduleSourcesFromDir(pipelineDir, pathPrefix = "src/pipeline") {
  let entries;
  try {
    entries = readdirSync(pipelineDir);
  } catch (error) {
    throw new Error(`cannot read the canonical module directory ${pipelineDir}: ${error.message}`);
  }
  const jsLike = entries.filter((name) => JS_LIKE.test(name));
  const nonConforming = jsLike.filter((name) => !MODULE_FILE.test(name));
  if (nonConforming.length) {
    throw new Error(`canonical module file name(s) do not match ${MODULE_FILE} and would evade the identity and neutrality scan: ${nonConforming.join(", ")}`);
  }
  const names = jsLike.sort();
  if (names.length === 0) throw new Error(`${pipelineDir} contains no canonical modules`);
  return names.map((name) => {
    const source = readFileSync(path.join(pipelineDir, name), "utf8");
    const violations = findNeutralityViolations(source);
    if (violations.length) {
      throw new Error(`${pathPrefix}/${name} is not runtime-neutral: ${violations.join("; ")}`);
    }
    return {
      path: `${pathPrefix}/${name}`,
      sha256: createHash("sha256").update(source, "utf8").digest("hex"),
    };
  });
}

export function computeIdentityFromDir(pipelineDir, pathPrefix = "src/pipeline") {
  return computeAssemblyIdentity(moduleSourcesFromDir(pipelineDir, pathPrefix));
}

// Parse a stored identity file; malformed content throws a plain Error with a
// clean message (never a raw JSON stack).
export function parseStoredIdentity(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`runtime-assembly.json is not valid JSON: ${error.message}`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || value.schema_version !== 1 || !Array.isArray(value.modules)
      || typeof value.assembly_identity_sha256 !== "string") {
    throw new Error("runtime-assembly.json does not have the {schema_version: 1, modules, assembly_identity_sha256} shape");
  }
  return value;
}

// Returns the list of drift problems; empty means the stored identity matches
// the recomputed one exactly.
export function diffIdentity(stored, current) {
  const problems = [];
  const storedModules = new Map(stored.modules.map((entry) => [entry?.path, entry?.sha256]));
  const currentModules = new Map(current.modules.map((entry) => [entry.path, entry.sha256]));
  for (const [modulePath, hash] of currentModules) {
    if (!storedModules.has(modulePath)) problems.push(`module missing from stored identity: ${modulePath}`);
    else if (storedModules.get(modulePath) !== hash) problems.push(`module source drifted: ${modulePath}`);
  }
  for (const modulePath of storedModules.keys()) {
    if (!currentModules.has(modulePath)) problems.push(`stored identity names a module no longer present: ${modulePath}`);
  }
  if (!problems.length && stored.assembly_identity_sha256 !== current.assembly_identity_sha256) {
    problems.push("assembly_identity_sha256 mismatch");
  }
  return problems;
}

export function freeze(root = ROOT) {
  const identity = computeIdentityFromDir(path.join(root, "src", "pipeline"));
  const file = path.join(root, "runtime-assembly.json");
  writeFileSync(file, `${JSON.stringify(identity, null, 2)}\n`);
  return { identity, file };
}

// Verify never throws on bad input: failures come back as {ok:false, problems}.
export function verify(root = ROOT) {
  const file = path.join(root, "runtime-assembly.json");
  if (!existsSync(file)) {
    return { ok: false, problems: ["runtime-assembly.json is missing; run `npm run assembly:freeze`"] };
  }
  try {
    const stored = parseStoredIdentity(readFileSync(file, "utf8"));
    const current = computeIdentityFromDir(path.join(root, "src", "pipeline"));
    const problems = diffIdentity(stored, current);
    return problems.length ? { ok: false, problems } : { ok: true, identity: current };
  } catch (error) {
    return { ok: false, problems: [error.message] };
  }
}

export function runCli(argv = process.argv.slice(2), root = ROOT) {
  const command = argv[0];
  if (command === "freeze") {
    try {
      const { identity } = freeze(root);
      process.stdout.write(`froze runtime-assembly identity ${identity.assembly_identity_sha256} over ${identity.modules.length} modules\n`);
      return 0;
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
  }
  if (command === "verify") {
    const result = verify(root);
    if (!result.ok) {
      process.stderr.write(`runtime-assembly identity verification failed:\n${result.problems.map((problem) => `  - ${problem}`).join("\n")}\n`);
      return 1;
    }
    process.stdout.write(`OK  runtime-assembly identity ${result.identity.assembly_identity_sha256} matches (${result.identity.modules.length} runtime-neutral modules)\n`);
    return 0;
  }
  process.stderr.write("usage: node scripts/assembly-identity.mjs [freeze|verify]\n");
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli();
}
