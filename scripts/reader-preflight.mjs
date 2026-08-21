#!/usr/bin/env node
// Story 1.24 compatibility-reader deployment preflight. Fully offline: it
// composes the existing gates and adds the reader-specific proofs, and it
// creates, uploads, and mutates nothing. Any failure blocks the deploy.
// Every check emits exactly one pass/fail line — no silent skips.
//
//   node scripts/reader-preflight.mjs
//
// Checks, in order:
//   1. runtime-baseline verify (toolchain identity + config isolation)
//   2. wrangler config dry runs (scripts/check-config.mjs; zero warnings,
//      zero remote resources)
//   3. runtime-assembly identity verify (Story 1.23 freeze is intact; the
//      frozen identity also binds the deployed entrypoint)
//   4. reader-projection identity match, bound to the DEPLOYED ENTRYPOINT:
//      src/worker.js must hash byte-identical to the frozen `entrypoint`
//      field; its ./pipeline/ import closure is parsed (transitively, all
//      import forms: static, side-effect, re-export, dynamic literal); every
//      closure module must hash byte-identical to runtime-assembly.json; and
//      the reader-critical modules must be present in the closure
//   5. reader-config assertion: no writer entrypoint, no activation manifest,
//      no PIPELINE_* / ACTIVATION_MANIFEST / INACTIVE_DOMAIN_WRITER var in
//      the parsed [vars] section or binding/name anywhere in wrangler.toml,
//      and no [env.*] sections (which could override main/vars per
//      environment)
//
// The Workers Builds trigger state cannot be inspected offline; it is
// documented by the operator at deploy time in the story spec's Auto Run
// Result. This script prints the reminder as the final line.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verify as verifyBaseline } from "./runtime-baseline.mjs";
import { parseStoredIdentity, verify as verifyAssembly } from "./assembly-identity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRYPOINT = "src/worker.js";

// The modules the compatibility reader cannot serve without. Each must be in
// the entrypoint's parsed import closure.
const READER_CRITICAL_MODULES = [
  "src/pipeline/contracts.mjs",
  "src/pipeline/receipts.mjs",
  "src/pipeline/rendering.mjs",
  "src/pipeline/legacy-rendering.mjs",
];

// Bindings/vars that would turn this reader deploy into a writer or an
// activation. None may exist in the deployed configuration.
const FORBIDDEN_CONFIG = /(?:PIPELINE_[A-Z0-9_]*|ACTIVATION_MANIFEST|INACTIVE_DOMAIN_WRITER)/i;

/* ------------------------------------------------------------------ *
 * Pure helpers (unit-tested in scripts/reader-preflight.test.mjs)
 * ------------------------------------------------------------------ */

// Strip full-line and trailing comments. None of the frozen values carry a
// '#' inside a quoted string, so a naive cut is exact for these configs.
export function stripTomlComments(text) {
  return text.split("\n").map((line) => {
    const hash = line.indexOf("#");
    return hash === -1 ? line : line.slice(0, hash);
  }).join("\n");
}

// Split TOML text into [{name, body}] sections; content before the first
// header lands in the "" section. A section body runs to the next header,
// however many lines that is.
export function tomlSections(text) {
  const sections = [];
  let current = { name: "", body: [] };
  for (const line of text.split("\n")) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (header) {
      sections.push(current);
      current = { name: header[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);
  return sections.map(({ name, body }) => ({ name, body: body.join("\n") }));
}

// Forbidden vars, scoped to the parsed [vars] section only.
export function findForbiddenVars(configText) {
  const vars = tomlSections(stripTomlComments(configText)).find((section) => section.name === "vars");
  if (!vars) return [];
  return [...new Set(vars.body.match(new RegExp(FORBIDDEN_CONFIG, "gi")) || [])].map((v) => v.toUpperCase());
}

// Forbidden binding/name values anywhere in the config.
export function findForbiddenBindings(configText) {
  const stripped = stripTomlComments(configText);
  return [...new Set([...stripped.matchAll(/^\s*(?:binding|name)\s*=\s*"([^"]+)"/gm)]
    .map((match) => match[1])
    .filter((name) => FORBIDDEN_CONFIG.test(name)))];
}

// [env.*] sections can override main/vars per environment; a reader deploy
// config must not carry any.
export function findEnvSections(configText) {
  return tomlSections(stripTomlComments(configText))
    .map((section) => section.name)
    .filter((name) => /^env\./.test(name));
}

// Every relative import form: static, side-effect, re-export (named and
// star), and dynamic literal. The assembly neutrality scan already rejects
// computed dynamic imports in canonical modules, so literals suffice.
const IMPORT_PATTERNS = [
  /\bimport\s+[\w${},*\s]+\s+from\s+["'](\.[^"']+)["']/g,
  /\bimport\s*["'](\.[^"']+)["']/g,
  /\bexport\s+[\w${},*\s]+\s+from\s+["'](\.[^"']+)["']/g,
  /\bexport\s+\*\s+from\s+["'](\.[^"']+)["']/g,
  /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
];
export function parseImportSpecifiers(source) {
  const specifiers = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

/* ------------------------------------------------------------------ */

let failed = false;
const ok = (label) => console.log(`OK  ${label}`);
const fail = (label, problems) => {
  failed = true;
  console.error(`FAIL ${label}`);
  for (const problem of problems) console.error(`     - ${problem}`);
};

const sha256File = (relative) =>
  createHash("sha256").update(readFileSync(path.join(ROOT, relative), "utf8"), "utf8").digest("hex");

// Parse the transitive ./pipeline/ import closure of a module, relative to
// the repo root.
function importClosure(entryRelative) {
  const seen = new Set();
  const queue = [entryRelative];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    const source = readFileSync(path.join(ROOT, current), "utf8");
    for (const specifier of parseImportSpecifiers(source)) {
      const resolved = path.normalize(path.join(path.dirname(current), specifier)).replaceAll("\\", "/");
      if (!seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

export function main() {
  // 1. runtime-baseline verify
  const baseline = verifyBaseline(ROOT);
  if (baseline.ok) ok("runtime-baseline verify (toolchain identity, config isolation)");
  else fail("runtime-baseline verify", [
    ...baseline.drift.map((entry) => `drift ${entry.field}: expected ${entry.expected}, got ${entry.actual}`),
    ...baseline.violations,
  ]);

  // 2. wrangler config dry runs (the real gate, spawned so its process exits
  //    exactly as it does under npm run check:config)
  const dryRuns = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check-config.mjs")], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  if (dryRuns.status === 0) ok("wrangler config dry runs (zero warnings, zero remote resources)");
  else fail("wrangler config dry runs", [`${dryRuns.stdout ?? ""}${dryRuns.stderr ?? ""}`.trim() || `exit ${dryRuns.status}`]);

  // 3. runtime-assembly identity verify
  const assembly = verifyAssembly(ROOT);
  if (assembly.ok) ok(`runtime-assembly identity ${assembly.identity.assembly_identity_sha256} (${assembly.identity.modules.length} modules)`);
  else fail("runtime-assembly identity verify", assembly.problems);

  // 4. reader-projection identity match, bound to the deployed entrypoint.
  //    The reader module set is DERIVED by parsing the transitive ./pipeline/
  //    import closure of src/worker.js — no hand-maintained module list.
  {
    const problems = [];
    const entrypointHash = sha256File(ENTRYPOINT);
    if (!assembly.ok) {
      problems.push("assembly identity does not verify; the projection cannot bind to it");
    } else {
      const stored = parseStoredIdentity(readFileSync(path.join(ROOT, "runtime-assembly.json"), "utf8"));
      if (!stored.entrypoint || stored.entrypoint.path !== ENTRYPOINT) {
        problems.push("runtime-assembly.json does not bind the deployed entrypoint src/worker.js; run `npm run assembly:freeze`");
      } else if (stored.entrypoint.sha256 !== entrypointHash) {
        problems.push(`deployed entrypoint drifted: ${ENTRYPOINT} (frozen ${stored.entrypoint.sha256.slice(0, 12)}…, actual ${entrypointHash.slice(0, 12)}…)`);
      }
      const frozenHashes = new Map(stored.modules.map((entry) => [entry.path, entry.sha256]));
      const closure = [...importClosure(ENTRYPOINT)].filter((module) => module.startsWith("src/pipeline/")).sort();
      for (const module of READER_CRITICAL_MODULES) {
        if (!closure.includes(module)) problems.push(`reader-critical module missing from the entrypoint import closure: ${module}`);
      }
      for (const module of closure) {
        if (!frozenHashes.has(module)) problems.push(`entrypoint import closure module missing from runtime-assembly.json: ${module}`);
        else if (sha256File(module) !== frozenHashes.get(module)) problems.push(`entrypoint import closure module hash drift: ${module}`);
      }
      if (!problems.length) {
        ok(`reader-projection identity match (entrypoint ${ENTRYPOINT} sha256 ${entrypointHash} bound and byte-identical; derived import closure of ${closure.length} modules byte-identical to the frozen assembly: ${closure.join(", ")})`);
      }
    }
    if (problems.length) fail(`reader-projection identity match (entrypoint ${ENTRYPOINT} sha256 ${entrypointHash})`, problems);
  }

  // 5. reader-config assertion: reader-only deployment configuration.
  {
    const problems = [];
    const configPath = path.join(ROOT, "wrangler.toml");
    const config = readFileSync(configPath, "utf8");
    const main = stripTomlComments(config).match(/^main\s*=\s*"([^"]+)"\s*$/m);
    if (!main || main[1] !== "src/worker.js") problems.push(`wrangler.toml main must be exactly "src/worker.js" (found ${main ? `"${main[1]}"` : "none"})`);
    const forbiddenVars = findForbiddenVars(config);
    if (forbiddenVars.length) problems.push(`wrangler.toml [vars] declares writer/activation configuration: ${forbiddenVars.join(", ")}`);
    const forbiddenBindings = findForbiddenBindings(config);
    if (forbiddenBindings.length) problems.push(`wrangler.toml declares writer/activation bindings: ${forbiddenBindings.join(", ")}`);
    const envSections = findEnvSections(config);
    if (envSections.length) problems.push(`wrangler.toml declares [env.*] sections that could override main/vars per environment: ${envSections.join(", ")}`);
    if (problems.length) fail("reader-config assertion", problems);
    else ok("reader-config assertion (no writer entrypoint, no activation manifest, no forbidden vars/bindings, no [env.*] sections)");
  }

  if (failed) {
    console.error("\nreader preflight FAILED — deployment is blocked");
    return 1;
  }
  console.log("\nreader preflight passed; no remote resource was created, modified, or deleted");
  console.log("NOTE Workers Builds trigger state (production branch auto-deploy) must be documented by the operator at deploy time in the Story 1.24 spec Auto Run Result");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
