import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

import { deriveEvidenceRef } from "./brief-contracts.mjs";
import { approvalIdentity, contentIdentity } from "./local-priors.mjs";
import {
  assembleLocalEvidence,
  assembleLocalEvidenceFromFiles,
  deriveDetroitDate,
  LocalEvidenceError,
  LOCAL_EVIDENCE_FAILURE_CODES,
} from "./local-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const priors = JSON.parse(await readFile(path.join(ROOT, "content/local-priors/v1/priors.json"), "utf8"));
const pendingApproval = JSON.parse(await readFile(path.join(ROOT, "content/local-priors/v1/approval.json"), "utf8"));

function approvedRecord(catalog = priors, approved_at = "2024-01-01T00:00:00.000Z") {
  const approval = { schema_version: 1, catalog_version: catalog.catalog_version, status: "approved", approver: "Justin", content_hash: contentIdentity(catalog), identity: null, approved_at };
  approval.identity = approvalIdentity(approval);
  return approval;
}

const base = {
  priors,
  approval: approvedRecord(),
  strike_timestamp: "2026-08-18T16:30:00.000Z",
  situation_id: "repeated-inquiries",
  capability_bundle_id: "inquiry-handoff",
};

function assertFailure(code, action) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof LocalEvidenceError);
    assert.equal(error.code, code);
    assert.ok(Object.isFrozen(error.issues));
    assert.equal(Object.hasOwn(error, "evidence"), false);
    return true;
  });
}

function assertRecursivelyFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.ok(Object.isFrozen(value));
  Object.values(value).forEach((entry) => assertRecursivelyFrozen(entry, seen));
}

test("approved assembly returns exactly frozen Evidence, its reference, and zero model calls", () => {
  const result = assembleLocalEvidence(base);
  assert.deepEqual(Object.keys(result), ["evidence", "evidence_ref", "model_calls"]);
  assert.deepEqual(Object.keys(result.evidence), ["version", "mode", "priors"]);
  assert.equal(result.evidence.mode, "local");
  assert.equal(result.evidence_ref, deriveEvidenceRef(result.evidence));
  assert.equal(result.model_calls, 0);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.evidence));
  assert.ok(Object.isFrozen(result.evidence.priors));
  assert.ok(Object.isFrozen(result.evidence.priors.capability_bundle));
  assertRecursivelyFrozen(result);
  assert.throws(() => { result.evidence.priors.date = "changed"; }, TypeError);
  const isolatedInput = structuredClone(base);
  const isolated = assembleLocalEvidence(isolatedInput);
  isolatedInput.priors.region.name = "mutated";
  isolatedInput.priors.capability_bundles[0].capabilities[0] = "mutated";
  assert.equal(isolated.evidence.priors.region, "Port Huron / Blue Water Area");
  assert.notEqual(isolated.evidence.priors.capability_bundle[0], "mutated");
});

test("Detroit calendar derivation covers DST, midnight, leap day, season, and year boundaries", () => {
  const cases = {
    "2024-02-29T04:59:59.999Z": "2024-02-28",
    "2024-02-29T05:00:00.000Z": "2024-02-29",
    "2026-03-08T06:59:59.999Z": "2026-03-08",
    "2026-03-08T07:00:00.000Z": "2026-03-08",
    "2026-11-01T05:59:59.999Z": "2026-11-01",
    "2026-11-01T06:00:00.000Z": "2026-11-01",
    "2026-06-01T03:59:59.999Z": "2026-05-31",
    "2026-06-01T04:00:00.000Z": "2026-06-01",
    "2027-01-01T04:59:59.999Z": "2026-12-31",
    "2027-01-01T05:00:00.000Z": "2027-01-01",
  };
  for (const [instant, date] of Object.entries(cases)) assert.equal(deriveDetroitDate(instant), date);
  assert.match(assembleLocalEvidence({ ...base, strike_timestamp: "2026-06-01T03:59:59.999Z" }).evidence.priors.season, /^spring:/);
  assert.match(assembleLocalEvidence({ ...base, strike_timestamp: "2026-06-01T04:00:00.000Z" }).evidence.priors.season, /^summer:/);
  for (const [instant, season] of [
    ["2026-03-01T05:00:00.000Z", "spring"],
    ["2026-06-01T04:00:00.000Z", "summer"],
    ["2026-09-01T04:00:00.000Z", "fall"],
    ["2026-12-01T05:00:00.000Z", "winter"],
  ]) assert.match(assembleLocalEvidence({ ...base, strike_timestamp: instant }).evidence.priors.season, new RegExp(`^${season}:`));
});

test("identical input is byte-for-byte deterministic and independent of host timezone", () => {
  const first = assembleLocalEvidence(base);
  const second = assembleLocalEvidence(structuredClone(base));
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  const program = `import { deriveDetroitDate } from ${JSON.stringify(new URL("./local-evidence.mjs", import.meta.url).href)}; process.stdout.write(deriveDetroitDate("2026-06-01T03:59:59.999Z"));`;
  for (const TZ of ["UTC", "Pacific/Honolulu", "Asia/Tokyo"]) {
    const run = spawnSync(process.execPath, ["--input-type=module", "--eval", program], { encoding: "utf8", env: { ...process.env, TZ } });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "2026-05-31");
  }
});

test("missing, invalid, and non-canonical strike timestamps fail as invalid requests", () => {
  for (const strike_timestamp of [undefined, null, "", "2026-08-18", "2026-08-18T16:30:00Z", "2026-02-29T00:00:00.000Z", "0000-07-01T12:00:00.000Z", "+010000-01-01T00:00:00.000Z", "not-a-date"]) {
    assertFailure(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, () => assembleLocalEvidence({ ...base, strike_timestamp }));
  }
  assert.equal(deriveDetroitDate("0001-07-01T12:00:00.000Z"), "0001-07-01");
});

test("assembly input and dependencies must be actual plain objects", async () => {
  class Request { constructor() { Object.assign(this, base); } }
  for (const input of [new Request(), new Date(), [], null]) assertFailure(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, () => assembleLocalEvidence(input));
  for (const dependencies of [new Request(), new Date(), []]) assertFailure(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, () => assembleLocalEvidence(base, dependencies));
  assertFailure(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, () => assembleLocalEvidence(base, { readFile: "not-a-function" }));
  await assert.rejects(assembleLocalEvidenceFromFiles(new Request()), { code: LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST });
  await assert.rejects(assembleLocalEvidenceFromFiles({ ...base, priors_path: "" }), { code: LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST });
  await assert.rejects(assembleLocalEvidenceFromFiles({ ...base, approval_path: "   " }), { code: LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST });
});

test("pending, drifted, and malformed approval or catalog failures preserve structured issues", () => {
  assertFailure(LOCAL_EVIDENCE_FAILURE_CODES.APPROVAL_REQUIRED, () => assembleLocalEvidence({ ...base, approval: pendingApproval }));
  const drifted = structuredClone(priors);
  drifted.region.framing += " drift";
  assertFailure(LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_INVALID, () => assembleLocalEvidence({ ...base, priors: drifted }));
  assertFailure(LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_INVALID, () => assembleLocalEvidence({ ...base, approval: { status: "approved" } }));
  assert.throws(() => assembleLocalEvidence(base, { verifyLocalPriors: () => ({ production_ready: false, structure_valid: false, issues: [] }) }), (error) => {
    assert.equal(error.code, LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_INVALID);
    assert.deepEqual(error.issues.map(({ artifact, rule }) => ({ artifact, rule })), [{ artifact: "priors", rule: "priors_invalid" }]);
    return true;
  });
});

test("unknown and incompatible selections fail without exposing partial Evidence", () => {
  for (const changed of [
    { situation_id: "missing" },
    { capability_bundle_id: "operations-bridge" },
    { situation_id: 123 },
    { capability_bundle_id: null },
    { situation_id: undefined },
  ]) {
    assert.throws(() => assembleLocalEvidence({ ...base, ...changed }), (error) => {
      assert.equal(error.code, LOCAL_EVIDENCE_FAILURE_CODES.SELECTION_INVALID);
      assert.deepEqual(error.issues.map(({ artifact, rule }) => ({ artifact, rule })), [{ artifact: "selection", rule: "invalid_or_incompatible" }]);
      return true;
    });
  }
});

test("contract rejection is contained in the typed failure family", () => {
  const issues = [{ path: "evidence", rule: "fixture", message: "rejected" }];
  assert.throws(() => assembleLocalEvidence(base, { buildEvidence() { const error = new TypeError("rejected"); error.issues = issues; throw error; } }), (error) => {
    assert.equal(error.code, LOCAL_EVIDENCE_FAILURE_CODES.CONTRACT_REJECTED);
    assert.deepEqual(error.issues, issues);
    assert.equal(Object.hasOwn(error, "evidence"), false);
    return true;
  });
  const cyclic = {};
  cyclic.self = cyclic;
  const unsafeIssue = {};
  Object.defineProperty(unsafeIssue, "message", { get() { throw new Error("getter must not run"); } });
  assert.throws(() => assembleLocalEvidence(base, { buildEvidence() { const error = new TypeError("rejected"); error.issues = [cyclic, unsafeIssue, { message: () => {} }]; throw error; } }), (error) => {
    assert.ok(error instanceof LocalEvidenceError);
    assert.equal(error.code, LOCAL_EVIDENCE_FAILURE_CODES.CONTRACT_REJECTED);
    assertRecursivelyFrozen(error.issues);
    return true;
  });
  assert.throws(() => assembleLocalEvidence(base, { deriveEvidenceRef() { const error = new Error("ref rejected"); error.issues = [cyclic]; throw error; } }), (error) => {
    assert.ok(error instanceof LocalEvidenceError);
    assert.equal(error.code, LOCAL_EVIDENCE_FAILURE_CODES.CONTRACT_REJECTED);
    assert.equal(Object.hasOwn(error, "evidence"), false);
    assert.equal(Object.hasOwn(error, "evidence_ref"), false);
    return true;
  });
});

test("file-backed assembly snapshots and validates requests before reads", async () => {
  let reads = 0;
  await assert.rejects(assembleLocalEvidenceFromFiles({ ...base, strike_timestamp: "invalid" }, { async readFile() { reads += 1; throw new Error("must not read"); } }), { code: LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST });
  assert.equal(reads, 0);
  const counts = {};
  const request = {};
  for (const [key, value] of Object.entries({ strike_timestamp: base.strike_timestamp, situation_id: base.situation_id, capability_bundle_id: base.capability_bundle_id, priors_path: "priors", approval_path: "approval" })) {
    Object.defineProperty(request, key, { enumerable: true, get() { counts[key] = (counts[key] ?? 0) + 1; return value; } });
  }
  Object.defineProperty(request, "priors", { get() { throw new Error("in-memory priors getter must not run"); } });
  Object.defineProperty(request, "approval", { get() { throw new Error("in-memory approval getter must not run"); } });
  const readFile = async (file) => file === "priors" ? JSON.stringify(priors) : JSON.stringify(base.approval);
  await assembleLocalEvidenceFromFiles(request, { readFile });
  assert.deepEqual(counts, { strike_timestamp: 1, situation_id: 1, capability_bundle_id: 1, priors_path: 1, approval_path: 1 });
});

test("file-backed assembly succeeds and returns complete frozen read/parse diagnostics", async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "oddspark-local-evidence-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const priors_path = path.join(directory, "priors.json");
  const approval_path = path.join(directory, "approval.json");
  await Promise.all([writeFile(priors_path, JSON.stringify(priors)), writeFile(approval_path, JSON.stringify(base.approval))]);
  const result = await assembleLocalEvidenceFromFiles({ ...base, priors: undefined, approval: undefined, priors_path, approval_path });
  assert.equal(result.model_calls, 0);
  for (const [artifact, rule, changed] of [
    ["priors", "json_parse", { priors_path: path.join(directory, "bad-priors.json") }],
    ["approval", "json_parse", { approval_path: path.join(directory, "bad-approval.json") }],
    ["priors", "read_failed", { priors_path: path.join(directory, "missing-priors.json") }],
    ["approval", "read_failed", { approval_path: path.join(directory, "missing-approval.json") }],
  ]) {
    if (rule === "json_parse") await writeFile(Object.values(changed)[0], "{bad json");
    await assert.rejects(assembleLocalEvidenceFromFiles({ ...base, priors_path, approval_path, ...changed }), (error) => {
      assert.ok(error instanceof LocalEvidenceError);
      assert.equal(error.code, LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_UNAVAILABLE);
      assert.equal(error.issues.length, 1);
      assert.deepEqual({ artifact: error.issues[0].artifact, rule: error.issues[0].rule }, { artifact, rule });
      assert.equal(typeof error.issues[0].message, "string");
      assert.equal(typeof error.issues[0].location, "string");
      assertRecursivelyFrozen(error.issues);
      return true;
    });
  }
  await writeFile(approval_path, JSON.stringify(pendingApproval));
  await assert.rejects(assembleLocalEvidenceFromFiles({ ...base, priors_path, approval_path }), { code: LOCAL_EVIDENCE_FAILURE_CODES.APPROVAL_REQUIRED });
});

test("assembly exposes no provider or network capability and never invokes an unrelated seam", () => {
  let calls = 0;
  const forbidden = () => { calls += 1; throw new Error("provider/network called"); };
  const result = assembleLocalEvidence({ ...base, provider: forbidden, fetch: forbidden }, { provider: forbidden, fetch: forbidden });
  assert.equal(result.model_calls, 0);
  assert.equal(calls, 0);
});
