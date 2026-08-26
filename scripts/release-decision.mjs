#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verify as verifyAssembly, computeIdentityFromDir } from "./assembly-identity.mjs";
import { verifyApproval as verifyHouseApproval } from "../src/pipeline/house.mjs";
import { verifyEvidence as verifyGenerationEvidence } from "../spikes/generation-qualification/evidence-v2.mjs";
import { APPROVAL_MAX_AGE_MS as GENERATION_APPROVAL_MAX_AGE_MS, deriveManifests as deriveGenerationManifests } from "../spikes/generation-qualification/qualification.mjs";
import { verifyEvidenceV2 as verifyJudgeEvidence } from "../spikes/judge-fidelity/evidence-v2.mjs";
import { verifyQualificationBundle as verifyJudgeBundle } from "../spikes/judge-fidelity/qualification.mjs";
import { verifyEvidenceBytes as verifyFullRequestEvidence } from "../spikes/local-full-request-qualification/verifier.mjs";
import { buildUnsignedActivationPayload } from "../src/pipeline/release-decision.mjs";
import { canonicalJson } from "../src/pipeline/contracts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DEPTH = 48;
const FAILURE = "release_decision_input_invalid";

// A deliberately small JSON parser: it rejects duplicate object keys while
// parsing, bounds nesting, and accepts exactly one complete JSON value.
export function parseClosedJson(text) {
  if (typeof text !== "string" || Buffer.byteLength(text) > MAX_BYTES) throw new TypeError(FAILURE);
  let offset = 0;
  const whitespace = () => { while (/\s/.test(text[offset] ?? "")) offset += 1; };
  const string = () => {
    const start = offset++;
    for (;;) {
      if (offset >= text.length) throw new TypeError(FAILURE);
      if (text[offset] === "\\") { offset += 2; continue; }
      if (text[offset++] === '"') break;
    }
    try { return JSON.parse(text.slice(start, offset)); } catch { throw new TypeError(FAILURE); }
  };
  const value = (depth = 0) => {
    if (depth > MAX_DEPTH) throw new TypeError(FAILURE);
    whitespace(); const character = text[offset];
    if (character === '"') return string();
    if (character === "{") {
      offset += 1; whitespace(); const result = {}; const keys = new Set();
      if (text[offset] === "}") { offset += 1; return result; }
      for (;;) {
        whitespace(); if (text[offset] !== '"') throw new TypeError(FAILURE);
        const key = string(); if (keys.has(key)) throw new TypeError(FAILURE); keys.add(key);
        whitespace(); if (text[offset++] !== ":") throw new TypeError(FAILURE);
        Object.defineProperty(result, key, { value: value(depth + 1), enumerable: true, configurable: true, writable: true }); whitespace();
        if (text[offset] === "}") { offset += 1; return result; }
        if (text[offset++] !== ",") throw new TypeError(FAILURE);
      }
    }
    if (character === "[") {
      offset += 1; whitespace(); const result = [];
      if (text[offset] === "]") { offset += 1; return result; }
      for (;;) { result.push(value(depth + 1)); whitespace(); if (text[offset] === "]") { offset += 1; return result; } if (text[offset++] !== ",") throw new TypeError(FAILURE); }
    }
    const match = text.slice(offset).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
    if (!match) throw new TypeError(FAILURE); offset += match[0].length; return JSON.parse(match[0]);
  };
  const result = value(); whitespace(); if (offset !== text.length) throw new TypeError(FAILURE); return result;
}

async function artifact(relative) {
  // Keep the opened descriptor authoritative from size check through read.
  if (typeof relative !== "string" || relative === "" || path.isAbsolute(relative) || relative.includes("\0")) throw new TypeError(FAILURE);
  const normalized = path.normalize(relative); if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) throw new TypeError(FAILURE);
  const root = await realpath(ROOT); let cursor = root;
  for (const segment of normalized.split(path.sep)) { cursor = path.join(cursor, segment); if ((await lstat(cursor)).isSymbolicLink()) throw new TypeError(FAILURE); }
  const resolved = await realpath(cursor); if (!resolved.startsWith(`${root}${path.sep}`)) throw new TypeError(FAILURE);
  const handle = await open(resolved, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat(); if (!stat.isFile() || stat.size > MAX_BYTES) throw new TypeError(FAILURE);
    const bytes = await handle.readFile(); const fingerprint = createHash("sha256").update(bytes).digest("hex");
    const confirm = async () => { const reread = await artifact(relative); if (reread.fingerprint !== fingerprint) throw new TypeError(FAILURE); };
    return { bytes, value: parseClosedJson(bytes.toString("utf8")), fingerprint, confirm };
  }
  finally { await handle.close(); }
}

const exact = (value, keys) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || Reflect.ownKeys(value).length !== keys.length) return false;
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.hasOwn(descriptor, "value") && descriptor.enumerable;
  });
};
const expiryAfter = (at, duration) => new Date(Date.parse(at) + duration).toISOString();

export function createTrustedVerifierAdapters(root = ROOT) {
  if (path.resolve(root) !== ROOT) throw new TypeError(FAILURE);
  return {
    async deployed_source(selector) {
      if (!exact(selector, [])) throw new TypeError(FAILURE);
      const check = verifyAssembly(ROOT); const identity = computeIdentityFromDir(path.join(ROOT, "src", "pipeline"));
      const confirmed = computeIdentityFromDir(path.join(ROOT, "src", "pipeline"));
      const stable = canonicalJson(identity) === canonicalJson(confirmed);
      return { current_ref: identity.assembly_identity_sha256, verified: check.ok && stable, approved: check.ok && stable, approval_expires_at: null };
    },
    async generation(selector) {
      if (!exact(selector, ["evidence_path"])) throw new TypeError(FAILURE);
      const retained = await artifact(selector.evidence_path); const evidence = retained.value; const verification = await verifyGenerationEvidence(evidence);
      const derived = await deriveGenerationManifests(evidence); const current_ref = derived.qualification_refs?.primary ?? null;
      await retained.confirm();
      return { current_ref, verified: verification.valid === true, approved: evidence?.outcome?.by_role?.primary?.decision === "GO", approval_expires_at: expiryAfter(evidence.approval.approved_at, GENERATION_APPROVAL_MAX_AGE_MS) };
    },
    async judge(selector) {
      if (!exact(selector, ["evidence_path", "bundle_path"])) throw new TypeError(FAILURE);
      const evidence = await artifact(selector.evidence_path); const bundle = await artifact(selector.bundle_path);
      const evidenceCheck = await verifyJudgeEvidence(evidence.value); const bundleCheck = await verifyJudgeBundle(bundle.value, evidence.value, evidence.bytes);
      await evidence.confirm(); await bundle.confirm();
      return { current_ref: bundle.value.role_qualification_ref ?? null, verified: evidenceCheck.valid === true && bundleCheck.valid === true, approved: bundle.value.approval_check?.valid === true, approval_expires_at: bundle.value.approval?.expires_at ?? null };
    },
    async house_catalog(selector) {
      if (!exact(selector, [])) throw new TypeError(FAILURE);
      const [catalog, approval, priors, rubric] = await Promise.all([
        artifact("content/house-briefs/v1/catalog.json"), artifact("content/house-briefs/v1/approval.json"),
        artifact("content/local-priors/v1/priors.json"), artifact("semantic/voice/v1/rubric.json"),
      ]);
      const result = verifyHouseApproval(catalog.value, approval.value, { priors: priors.value, rubric: rubric.value });
      await Promise.all([catalog.confirm(), approval.confirm(), priors.confirm(), rubric.confirm()]);
      return { current_ref: approval.value?.identity ?? null, verified: result.status !== "invalid", approved: result.ready === true, approval_expires_at: null };
    },
    async local_full_request(selector) {
      if (!exact(selector, ["evidence_path", "plan_path", "approval_path"])) throw new TypeError(FAILURE);
      const evidence = await artifact(selector.evidence_path); const plan = await artifact(selector.plan_path); const approval = await artifact(selector.approval_path);
      const result = verifyFullRequestEvidence(evidence.bytes, { planBytes: plan.bytes, approvalBytes: approval.bytes });
      await evidence.confirm(); await plan.confirm(); await approval.confirm();
      return { current_ref: evidence.value.full_request_ref ?? null, verified: result.valid === true, approved: approval.value.decision === "approved", approval_expires_at: approval.value.expires_at ?? null };
    },
    async domain_evidence(selector, { expected_ref }) {
      if (!exact(selector, [])) throw new TypeError(FAILURE);
      return { current_ref: expected_ref, verified: false, approved: false, approval_expires_at: null };
    },
    async domain_full_request(selector, { expected_ref }) {
      if (!exact(selector, [])) throw new TypeError(FAILURE);
      return { current_ref: expected_ref, verified: false, approved: false, approval_expires_at: null };
    },
    async receiver(selector, { expected_ref }) {
      if (!exact(selector, [])) throw new TypeError(FAILURE);
      return { current_ref: expected_ref, verified: false, approved: false, approval_expires_at: null };
    },
    async receipt_claim(selector, { expected_ref }) {
      if (!exact(selector, [])) throw new TypeError(FAILURE);
      return { current_ref: expected_ref, verified: false, approved: false, approval_expires_at: null };
    },
  };
}

export async function renderInput(text, adapters = createTrustedVerifierAdapters()) {
  const input = parseClosedJson(text);
  if (!exact(input, ["manifest", "key_id", "issued_at", "selectors"])) throw new TypeError(FAILURE);
  return buildUnsignedActivationPayload(input, adapters);
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1) throw new TypeError(FAILURE);
  const request = await artifact(argv[0]); const result = await renderInput(request.bytes.toString("utf8"));
  process.stdout.write(`${JSON.stringify(result)}\n`); return result.ready ? 0 : 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }).catch(() => { process.stderr.write(`${FAILURE}\n`); process.exitCode = 1; });
}
