#!/usr/bin/env node
// Story 1.25 inactive-writer deployment preflight. Fully offline: it composes
// the existing gates and adds the writer-specific proofs, and it creates,
// uploads, and mutates nothing. Any failure blocks the deploy. Every check
// emits exactly one pass/fail line — no silent skips — and every check is
// crash-safe: malformed JSON, missing hash fields, or unexpected verifier
// shapes produce a FAIL line, never a stack trace.
//
//   node scripts/writer-preflight.mjs
//
// Checks, in order:
//   1. runtime-baseline verify (toolchain identity + config isolation)
//   2. wrangler config dry runs (scripts/check-config.mjs; zero warnings —
//      dry-run cleanliness — zero remote resources)
//   3. runtime-assembly identity verify (the Story 1.23 freeze, refrozen for
//      1.25, binds the deployed entrypoint and every canonical module)
//   4. writer-projection identity match, bound to the DEPLOYED ENTRYPOINT:
//      src/worker.js must hash byte-identical to the frozen `entrypoint`
//      field; its parsed transitive import closure (now including
//      src/pipeline/production-ports.mjs and the bundled content JSON) must
//      hash byte-identical to runtime-assembly.json for every canonical
//      module, and the writer-critical modules and bundled content files
//      must be present in the closure
//   5. bundled-content verification, one line per content family: the
//      recomputed content identity must equal the pinned hash constant below
//      (any byte drift FAILs), and the approval is re-verified with the real
//      closed verifiers. A family still pending_owner_approval is REPORTED
//      as such — it gates nothing while ACTIVATION_MANIFEST is absent, and
//      it is never silently treated as wireable.
//   6. inactive-posture config assertion: no ACTIVATION_MANIFEST or
//      PIPELINE_* / INACTIVE_DOMAIN_WRITER var or binding anywhere in
//      wrangler.toml, no [env.*] sections, main pinned to src/worker.js, the
//      legacy AI/KV/DO bindings intact, and the frozen AI_MODEL /
//      AI_MODEL_FALLBACK vars present. TOML matching is key-order
//      insensitive (parsed per section, not regexed across lines).
//   7. offline assembly smoke (NOT the trivially-null path): the pipeline
//      env is constructed through the module's offline content seam with a
//      fully-approved content set and its provider ports are asserted
//      present — proving wireability — before absent AND malformed manifests
//      each yield a null writer, proving the inactive gate.
//
// The Workers Builds trigger state cannot be inspected offline; it is
// documented by the operator at deploy time in the story spec's Auto Run
// Result. This script prints the reminder as the final line.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verify as verifyBaseline } from "./runtime-baseline.mjs";
import { parseStoredIdentity, verify as verifyAssembly } from "./assembly-identity.mjs";
// Import-safe: reader-preflight.mjs executes its gate only under its
// entrypoint guard, so these helpers never run the reader checks on import.
import {
  findEnvSections,
  findForbiddenBindings,
  findForbiddenVars,
  importClosure,
  sha256File,
  stripTomlComments,
  tomlSections,
} from "./reader-preflight.mjs";
import {
  approvalIdentity as priorsApprovalIdentity,
  contentIdentity as priorsContentIdentity,
  verifyLocalPriors,
} from "../src/pipeline/priors.mjs";
import {
  verifyApproval as verifyHouseApproval,
} from "../src/pipeline/house.mjs";
import { validateCorpus } from "../src/pipeline/corpus.mjs";
import { createInactiveDomainWriter } from "../src/pipeline/assembly.mjs";
import { productionPipelineEnv } from "../src/pipeline/production-ports.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRYPOINT = "src/worker.js";

// The modules the assembled writer cannot exist without. Each must be in the
// entrypoint's parsed import closure.
const WRITER_CRITICAL_MODULES = [
  "src/pipeline/activation.mjs",
  "src/pipeline/assembly.mjs",
  "src/pipeline/contracts.mjs",
  "src/pipeline/corpus.mjs",
  "src/pipeline/evidence.mjs",
  "src/pipeline/gate.mjs",
  "src/pipeline/generation.mjs",
  "src/pipeline/house.mjs",
  "src/pipeline/judge.mjs",
  "src/pipeline/priors.mjs",
  "src/pipeline/production-ports.mjs",
  "src/pipeline/receipts.mjs",
  "src/pipeline/strike.mjs",
];

// The owner-governed content bundled with the Worker (imported by
// production-ports.mjs, verified at env construction). Each must be in the
// entrypoint's parsed import closure so the deployed bundle provably carries
// the exact bytes pinned below.
const BUNDLED_CONTENT_FILES = [
  "content/local-priors/v1/priors.json",
  "content/local-priors/v1/approval.json",
  "content/house-briefs/v1/catalog.json",
  "content/house-briefs/v1/approval.json",
  "semantic/voice/v1/rubric.json",
  "semantic/voice/v1/goldens.json",
  "semantic/voice/v1/anti-goldens.json",
  "semantic/voice/v1/approval.json",
];

// Pinned content identities. The closed identity functions recompute these
// from the current bytes; any drift FAILs the content check. Content changes
// are owner-governed events and must update these pins deliberately, in the
// same change, with the approval records re-bound.
const PINNED_PRIORS_CONTENT_HASH = "0d80450e2958633446a1cc9c3269888fdb8b6d1063071052c089d3d692ec3253";
const PINNED_HOUSE_CONTENT_HASH = "06f74672f2005a33c6ad030ac38d709e7021b70c45cf01dbd5d31741323ebc9b";
const PINNED_CORPUS_SEMANTIC_IDENTITY = "b387b27c7fd91062ae7b0aec39ada8103b579655b5161e2556b614b1d2f6694e";
const PINNED_CORPUS_HASHES = Object.freeze({
  rubric: "3095066ef0bb56245b8a183ded6d07308fa83838c07f2c55455fd2b8905c29ff",
  goldens: "da2203361ac3adde67c1a6972e4358bea49a84e3b83c5b2f38648ef979699915",
  anti_goldens: "0727894e09348838403e921e1ac22f6b8a02dcfca86ea3bd7e0b9581a72525e0",
  thresholds: "6c7b182ebf786e18a205818e5e89d25e9c809959f88d2bd3f8f25b85fffeb5ff",
});

let failed = false;
const ok = (label) => console.log(`OK  ${label}`);
const fail = (label, problems) => {
  failed = true;
  console.error(`FAIL ${label}`);
  for (const problem of problems) console.error(`     - ${problem}`);
};

// Crash-safe check wrapper: any throw becomes a FAIL line, never a trace.
// fn returns an array of problems (empty = pass) or { problems, passLine }
// to customize the pass line; exactly one line is emitted either way.
function check(label, fn) {
  try {
    const result = fn() ?? [];
    const problems = Array.isArray(result) ? result : result.problems;
    const passLine = Array.isArray(result) ? label : (result.passLine ?? label);
    if (problems && problems.length) fail(label, problems);
    else ok(passLine);
  } catch (error) {
    fail(label, [`check crashed: ${error instanceof Error ? error.message : String(error)}`]);
  }
}

const readJson = (relative) => JSON.parse(readFileSync(path.join(ROOT, relative), "utf8"));

export function validatePipelineJudge(pipeline, env) {
  const expected = {
    role: "STRUCT-JUDGE",
    provider: "cloudflare-workers-ai",
    resolved_model: env.AI_MODEL,
    qualification_ref: "7dc1ec98a625a1dd16f1166067b496e4209a415e7f10854ff781f46d0d0062d0",
    status: "active",
    outcome: "GO",
  };
  return isDeepStrictEqual(pipeline?.PIPELINE_JUDGE, expected)
    ? []
    : ["constructed PIPELINE_JUDGE must deep-equal the qualified STRUCT-JUDGE descriptor"];
}

export function main() {
  // 1. runtime-baseline verify
  check("runtime-baseline verify (toolchain identity, config isolation)", () => {
    const baseline = verifyBaseline(ROOT);
    if (baseline.ok) return [];
    return [
      ...baseline.drift.map((entry) => `drift ${entry.field}: expected ${entry.expected}, got ${entry.actual}`),
      ...baseline.violations,
    ];
  });

  // 2. wrangler config dry runs (the real gate, spawned so its process exits
  //    exactly as it does under npm run check:config; zero warnings is the
  //    dry-run cleanliness proof). A spawn-level throw (EINVAL, OOM, missing
  //    executable) is a FAIL line, never a stack trace.
  try {
    const dryRuns = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check-config.mjs")], {
      cwd: ROOT, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    });
    if (dryRuns.status === 0) ok("wrangler config dry runs (zero warnings, zero remote resources)");
    else fail("wrangler config dry runs", [`${dryRuns.stdout ?? ""}${dryRuns.stderr ?? ""}`.trim() || `exit ${dryRuns.status}`]);
  } catch (error) {
    fail("wrangler config dry runs", [`spawn failed: ${error instanceof Error ? error.message : String(error)}`]);
  }

  // 3. runtime-assembly identity verify
  const assembly = (() => {
    try { return verifyAssembly(ROOT); } catch (error) { return { ok: false, problems: [error instanceof Error ? error.message : String(error)] }; }
  })();
  if (assembly.ok) ok(`runtime-assembly identity ${assembly.identity.assembly_identity_sha256} (${assembly.identity.modules.length} modules)`);
  else fail("runtime-assembly identity verify", assembly.problems);

  // 4. writer-projection identity match, bound to the deployed entrypoint.
  check(`writer-projection identity match (entrypoint ${ENTRYPOINT})`, () => {
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
      const closure = [...importClosure(ENTRYPOINT)].sort();
      const closureModules = closure.filter((module) => module.startsWith("src/pipeline/"));
      // One-directional limitation: every closure module must match the
      // frozen identity, but a frozen module silently dropping OUT of the
      // closure is caught only if it is listed in WRITER_CRITICAL_MODULES
      // (which includes production-ports.mjs). Keep that list complete.
      for (const module of WRITER_CRITICAL_MODULES) {
        if (!closureModules.includes(module)) problems.push(`writer-critical module missing from the entrypoint import closure: ${module}`);
      }
      for (const content of BUNDLED_CONTENT_FILES) {
        if (!closure.includes(content)) problems.push(`bundled content missing from the entrypoint import closure: ${content}`);
      }
      for (const module of closureModules) {
        if (!frozenHashes.has(module)) problems.push(`entrypoint import closure module missing from runtime-assembly.json: ${module}`);
        else if (sha256File(module) !== frozenHashes.get(module)) problems.push(`entrypoint import closure module hash drift: ${module}`);
      }
      if (!problems.length) {
        return {
          problems: [],
          passLine: `writer-projection identity match (entrypoint ${ENTRYPOINT} sha256 ${entrypointHash} bound and byte-identical; ${closureModules.length} closure modules byte-identical to the frozen assembly; ${BUNDLED_CONTENT_FILES.length} bundled content files in the closure)`,
        };
      }
    }
    return problems;
  });

  // 5. bundled-content verification — one explicit line per family: pinned
  //    hash re-computed from current bytes, approval re-verified by the real
  //    closed verifiers, readiness reported (never silently wireable).
  //    Policy asymmetry, deliberate: priors approval is still
  //    pending_owner_approval today, and that gates nothing while
  //    ACTIVATION_MANIFEST is absent (the writer is null before any port
  //    validation), so priors pending is reported-but-passing; house and
  //    corpus approvals already exist and are consumed by the same wiring,
  //    so any unreadiness there hard-FAILs the gate.
  const now = new Date();
  const nowMs = now.valueOf();

  check("bundled content: local priors", () => {
    const priorsCatalog = readJson("content/local-priors/v1/priors.json");
    const report = verifyLocalPriors(priorsCatalog, readJson("content/local-priors/v1/approval.json"), { now });
    const problems = [];
    const recomputed = report.content_hash ?? priorsContentIdentity(priorsCatalog);
    if (recomputed !== PINNED_PRIORS_CONTENT_HASH) problems.push(`priors content drifted: pinned ${PINNED_PRIORS_CONTENT_HASH.slice(0, 12)}…, actual ${String(recomputed).slice(0, 12)}…`);
    if (!report.structure_valid || report.readiness === "invalid") problems.push(`priors content invalid: ${report.issues.map((entry) => entry.message).join("; ") || "unknown"}`);
    if (problems.length) return problems;
    return {
      problems: [],
      passLine: `bundled content: local priors (content hash pinned ${PINNED_PRIORS_CONTENT_HASH.slice(0, 12)}…; readiness ${report.readiness}${report.readiness === "pending_owner_approval" ? " — reported, NOT wireable; gates nothing while ACTIVATION_MANIFEST is absent" : ""})`,
    };
  });

  const houseAuthorities = (() => {
    try { return { priors: readJson("content/local-priors/v1/priors.json"), rubric: readJson("semantic/voice/v1/rubric.json") }; }
    catch { return {}; }
  })();

  check("bundled content: house brief catalog", () => {
    const report = verifyHouseApproval(
      readJson("content/house-briefs/v1/catalog.json"),
      readJson("content/house-briefs/v1/approval.json"),
      houseAuthorities,
      { now },
    );
    const problems = [];
    if (report.content_hash !== PINNED_HOUSE_CONTENT_HASH) problems.push(`house catalog drifted: pinned ${PINNED_HOUSE_CONTENT_HASH.slice(0, 12)}…, actual ${String(report.content_hash).slice(0, 12)}…`);
    if (report.ready !== true) problems.push(`house catalog not owner-approved over current content: ${report.status} (${report.issues.map((entry) => entry.message).join("; ") || "no issues reported"})`);
    if (problems.length) return problems;
    return { problems: [], passLine: `bundled content: house brief catalog (content hash pinned ${PINNED_HOUSE_CONTENT_HASH.slice(0, 12)}…; readiness approved)` };
  });

  check("bundled content: voice corpus", () => {
    const report = validateCorpus({
      rubric: readJson("semantic/voice/v1/rubric.json"),
      goldens: readJson("semantic/voice/v1/goldens.json"),
      anti_goldens: readJson("semantic/voice/v1/anti-goldens.json"),
      approval: readJson("semantic/voice/v1/approval.json"),
    }, { nowMs });
    const problems = [];
    if (report.semantic_identity !== PINNED_CORPUS_SEMANTIC_IDENTITY) problems.push(`voice corpus drifted: pinned ${PINNED_CORPUS_SEMANTIC_IDENTITY.slice(0, 12)}…, actual ${String(report.semantic_identity).slice(0, 12)}…`);
    const hashes = report.hashes ?? {};
    for (const [key, pinned] of Object.entries(PINNED_CORPUS_HASHES)) {
      if (hashes[key] !== pinned) problems.push(`voice corpus ${key} hash drifted: pinned ${pinned.slice(0, 12)}…, actual ${String(hashes[key]).slice(0, 12)}…`);
    }
    if (report.readiness !== "approved") problems.push(`voice corpus not owner-approved over current content: ${report.readiness}`);
    if (problems.length) return problems;
    return { problems: [], passLine: `bundled content: voice corpus (semantic identity pinned ${PINNED_CORPUS_SEMANTIC_IDENTITY.slice(0, 12)}…; readiness approved)` };
  });

  // 6. inactive-posture config assertion: zero activation authority and zero
  //    new config — content is bundled, never var-bound; the legacy bindings
  //    the 1.24 artifact serves with are intact. Section-parsed, so key order
  //    inside a section does not matter.
  check("inactive-posture config assertion", () => {
    const problems = [];
    const config = readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
    // tomlSections parses single-bracket headers; normalize array-of-tables
    // headers ([[name]] → [name]) first so [[kv_namespaces]] and both
    // [[durable_objects.bindings]] tables become named sections whose bodies
    // are matched key-order insensitively.
    const sections = tomlSections(stripTomlComments(config).replace(/^\[\[(.+?)\]\]\s*$/gm, "[$1]"));
    const main = sections.find((section) => section.name === "")?.body.match(/^main\s*=\s*"([^"]+)"\s*$/m);
    if (!main || main[1] !== ENTRYPOINT) problems.push(`wrangler.toml main must be exactly "src/worker.js" (found ${main ? `"${main[1]}"` : "none"})`);
    const forbiddenVars = findForbiddenVars(config);
    if (forbiddenVars.length) problems.push(`wrangler.toml [vars] declares writer/activation configuration: ${forbiddenVars.join(", ")}`);
    const forbiddenBindings = findForbiddenBindings(config);
    if (forbiddenBindings.length) problems.push(`wrangler.toml declares writer/activation bindings: ${forbiddenBindings.join(", ")}`);
    const envSections = findEnvSections(config);
    if (envSections.length) problems.push(`wrangler.toml declares [env.*] sections that could override main/vars per environment: ${envSections.join(", ")}`);
    const ai = sections.find((section) => section.name === "ai");
    if (!ai || !/^binding\s*=\s*"AI"\s*$/m.test(ai.body) || !/^remote\s*=\s*true\s*$/m.test(ai.body)) {
      problems.push('wrangler.toml must keep the legacy [ai] binding "AI" with remote = true');
    }
    const kv = sections.filter((section) => section.name === "kv_namespaces");
    if (!kv.some((section) => /^binding\s*=\s*"SPARKS"\s*$/m.test(section.body))) problems.push('wrangler.toml must keep the legacy KV binding "SPARKS"');
    const durableObjects = sections.filter((section) => section.name === "durable_objects.bindings");
    for (const name of ["METER", "COORD"]) {
      if (!durableObjects.some((section) => new RegExp(`^name\\s*=\\s*"${name}"\\s*$`, "m").test(section.body))) {
        problems.push(`wrangler.toml must keep the legacy Durable Object binding "${name}"`);
      }
    }
    const vars = sections.find((section) => section.name === "vars");
    for (const key of ["AI_MODEL", "AI_MODEL_FALLBACK"]) {
      if (!vars || !new RegExp(`^${key}\\s*=\\s*"[^"]+"\\s*$`, "m").test(vars.body)) {
        problems.push(`wrangler.toml [vars] must keep the frozen ${key} var the provider ports resolve/guard against`);
      }
    }
    return problems;
  });

  // 7. offline assembly smoke — NOT the trivially-null path. A fully-approved
  //    content set is constructed offline through the module's content seam
  //    (smoke authority only: computed through the real identity functions,
  //    never bundled, never deployed), the provider ports and exact qualified
  //    judge descriptor are asserted present — proving wireability — and then
  //    absent AND malformed manifests must each yield a null writer.
  check("offline assembly smoke (wireable ports + absent/malformed manifest ⇒ writer null)", () => {
    const problems = [];
    const priorsCatalog = readJson("content/local-priors/v1/priors.json");
    const houseCatalog = readJson("content/house-briefs/v1/catalog.json");
    const rubric = readJson("semantic/voice/v1/rubric.json");
    // Smoke-authority approval timestamp: derived from the current time (one
    // minute back, canonical ISO) so no hardcoded date can rot against a
    // future-dated-approval check or a time-bound approval window.
    const approvedAt = new Date(Date.now() - 60000).toISOString();
    const priorsApproval = {
      schema_version: 1, catalog_version: 1, status: "approved", approver: "Justin",
      content_hash: priorsContentIdentity(priorsCatalog), identity: null, approved_at: approvedAt,
    };
    // The priors approval identity binds its exact fields through the real
    // closed identity function — computed, never hardcoded.
    priorsApproval.identity = priorsApprovalIdentity(priorsApproval);
    const smokeContent = {
      priors: { priors: priorsCatalog, approval: priorsApproval },
      house: { catalog: houseCatalog, approval: readJson("content/house-briefs/v1/approval.json") },
      corpus: {
        rubric,
        goldens: readJson("semantic/voice/v1/goldens.json"),
        anti_goldens: readJson("semantic/voice/v1/anti-goldens.json"),
        approval: readJson("semantic/voice/v1/approval.json"),
      },
    };
    const fakeEnv = {
      AI: { async run() { throw new Error("preflight must never call a provider"); } },
      AI_MODEL: "preflight-model",
      AI_MODEL_FALLBACK: "preflight-fallback",
    };
    const coordPost = async () => { throw new Error("preflight has no coordinator"); };
    const pipeline = productionPipelineEnv(fakeEnv, smokeContent);
    if (pipeline === null) {
      problems.push("fully-approved content set must construct the pipeline env through the offline content seam");
    } else {
      for (const key of ["PIPELINE_PRIORS", "PIPELINE_HOUSE", "PIPELINE_CORPUS", "PIPELINE_GENERATE_PROVIDER", "PIPELINE_JUDGE_PROVIDER"]) {
        if (!(key in pipeline)) problems.push(`constructed pipeline env is missing ${key}`);
      }
      problems.push(...validatePipelineJudge(pipeline, fakeEnv));
    }
    for (const [name, manifest] of Object.entries({ absent: undefined, malformed: "{not json" })) {
      const env = manifest === undefined ? { ...fakeEnv } : { ...fakeEnv, ACTIVATION_MANIFEST: manifest };
      const writer = createInactiveDomainWriter({ ...env, ...(pipeline ?? {}) }, { coordPost });
      if (writer !== null) problems.push(`manifest ${name}: the assembled writer must be null`);
    }
    return problems;
  });

  if (failed) {
    console.error("\nwriter preflight FAILED — deployment is blocked");
    return 1;
  }
  console.log("\nwriter preflight passed; no remote resource was created, modified, or deleted");
  console.log("NOTE Workers Builds trigger state (production branch auto-deploy) must be documented by the operator at deploy time in the Story 1.25 spec Auto Run Result");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
