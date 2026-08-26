import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { deriveActivationRef } from "../src/pipeline/activation.mjs";
import {
  ACTIVATION_ATTESTATION_DOMAIN,
  SNAPSHOT_REASON_CODES,
  applicableActivationGates,
  buildUnsignedActivationPayload,
  evaluateActivationSnapshot,
  renderReleaseDecision,
} from "../src/pipeline/release-decision.mjs";
import { canonicalJson } from "../src/pipeline/contracts.mjs";
import { createTrustedVerifierAdapters, parseClosedJson, renderInput } from "./release-decision.mjs";

const manifest = () => ({ version: 2, deployed_source_identity: "deployed-source-v1", generation_ref: "a".repeat(64), judge_ref: "b".repeat(64), local: { enabled: true, full_request_ref: "c".repeat(64) }, domain: { enabled: false, evidence_ref: null, full_request_ref: null }, house_catalog_ref: "d".repeat(64), receiver_ref: null, receipt_claim_ref: null, outcome: "active" });
const selectors = () => Object.fromEntries(["deployed_source", "generation", "judge", "house_catalog", "local_full_request", "domain_evidence", "domain_full_request", "receiver", "receipt_claim"].map((key) => [key, { artifact: key }]));
const issued = "2026-08-26T12:00:00.000Z";
const expires = "2026-08-26T13:00:00.000Z";

function keys() {
  const pair = generateKeyPairSync("ed25519");
  return { privateKey: pair.privateKey, spki: new Uint8Array(pair.publicKey.export({ format: "der", type: "spki" })) };
}
function envelope(payload, privateKey) {
  const signature = sign(null, Buffer.from(`${ACTIVATION_ATTESTATION_DOMAIN}${canonicalJson(payload)}`), privateKey).toString("base64url");
  return { payload, signature };
}

async function readyPayload(overrides = {}) {
  const calls = [];
  const adapters = Object.fromEntries(applicableActivationGates(manifest()).map((gate) => [gate.gate_id, async (selector) => {
    calls.push([gate.gate_id, selector]);
    return { current_ref: gate.evidence_ref, verified: true, approved: true, approval_expires_at: expires };
  }]));
  const result = await buildUnsignedActivationPayload({ manifest: manifest(), key_id: "test-key", issued_at: issued, selectors: selectors(), ...overrides }, adapters);
  return { ...result, calls };
}

test("trusted builder derives all facts through applicable adapters and emits only an unsigned payload", async () => {
  const result = await readyPayload();
  assert.equal(result.ready, true);
  assert.deepEqual(result.calls.map(([id]) => id), ["deployed_source", "generation", "judge", "house_catalog", "local_full_request"]);
  assert.equal(result.payload.expires_at, expires);
  assert.equal(Object.hasOwn(result.payload, "signature"), false);
  assert.equal(result.decision.activation_ref, deriveActivationRef(result.payload.manifest));
});

test("builder derives stale, blocked, and unapproved status and never emits a signing payload", async () => {
  for (const [expected, fact] of [
    ["stale", { current_ref: "f".repeat(64), verified: true, approved: true, approval_expires_at: expires }],
    ["blocked", { current_ref: "a".repeat(64), verified: false, approved: true, approval_expires_at: expires }],
    ["unapproved", { current_ref: "a".repeat(64), verified: true, approved: false, approval_expires_at: expires }],
  ]) {
    const adapters = Object.fromEntries(applicableActivationGates(manifest()).map((gate) => [gate.gate_id, async () => gate.gate_id === "generation" ? fact : ({ current_ref: gate.evidence_ref, verified: true, approved: true, approval_expires_at: expires })]));
    const result = await buildUnsignedActivationPayload({ manifest: manifest(), key_id: "test-key", issued_at: issued, selectors: selectors() }, adapters);
    assert.equal(result.ready, false); assert.equal(result.payload, null); assert.equal(result.decision.gates[1].status, expected);
  }
});

test("valid Ed25519 envelope activates with an injected SPKI trust key", async () => {
  const { payload } = await readyPayload(); const key = keys();
  const result = await evaluateActivationSnapshot(envelope(payload, key.privateKey), { trustedKeys: { "test-key": key.spki }, now: () => Date.parse(issued) + 1 });
  assert.equal(result.ready, true); assert.equal(result.reason, null); assert.ok(Object.isFrozen(result));
});

test("unknown, wrong, altered, expired, and not-yet-valid envelopes fail closed", async () => {
  const { payload } = await readyPayload(); const a = keys(); const b = keys(); const signed = envelope(payload, a.privateKey);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: {}, now: () => Date.parse(issued) + 1 })).reason, SNAPSHOT_REASON_CODES.KEY);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: { "test-key": b.spki }, now: () => Date.parse(issued) + 1 })).reason, SNAPSHOT_REASON_CODES.SIGNATURE);
  const altered = structuredClone(signed); altered.payload.manifest.generation_ref = "e".repeat(64);
  assert.equal((await evaluateActivationSnapshot(altered, { trustedKeys: { "test-key": a.spki }, now: () => Date.parse(issued) + 1 })).reason, SNAPSHOT_REASON_CODES.NOT_CLOSED);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: { "test-key": a.spki }, now: () => Date.parse(expires) })).reason, SNAPSHOT_REASON_CODES.TIME);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: { "test-key": a.spki }, now: () => Date.parse(issued) - 1 })).reason, SNAPSHOT_REASON_CODES.TIME);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: { "test-key": a.spki }, now: () => { throw new Error("clock"); } })).reason, SNAPSHOT_REASON_CODES.TIME);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: { "test-key": a.spki }, now: () => "now" })).reason, SNAPSHOT_REASON_CODES.TIME);
});

test("payload expiry is the earliest distinct approval expiry and invalid calendar times reject", async () => {
  const m = manifest(); const expected = applicableActivationGates(m); const times = expected.map((_, index) => `2026-08-26T1${index}:00:00.000Z`);
  const adapters = Object.fromEntries(expected.map((gate, index) => [gate.gate_id, async () => ({ current_ref: gate.evidence_ref, verified: true, approved: true, approval_expires_at: ["deployed_source", "house_catalog"].includes(gate.gate_id) ? null : times[index] })]));
  const result = await buildUnsignedActivationPayload({ manifest: m, key_id: "test-key", issued_at: "2026-08-26T09:00:00.000Z", selectors: selectors() }, adapters);
  assert.equal(result.payload.expires_at, times[1]);
  assert.equal(result.payload.gates.find(({ gate_id }) => gate_id === "deployed_source").approval_expires_at, null);
  assert.equal(result.payload.gates.find(({ gate_id }) => gate_id === "house_catalog").approval_expires_at, null);
  assert.doesNotThrow(() => renderReleaseDecision(result.payload));
  const key = keys(); const signed = envelope(result.payload, key.privateKey);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: { "test-key": key.spki }, now: () => Date.parse(times[1]) - 1 })).ready, true);
  assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: { "test-key": key.spki }, now: () => Date.parse(times[1]) })).reason, SNAPSHOT_REASON_CODES.TIME);
  const tooLate = structuredClone(result.payload); tooLate.expires_at = times[2]; assert.throws(() => renderReleaseDecision(tooLate));
  const disallowedNull = structuredClone(result.payload); disallowedNull.gates.find(({ gate_id }) => gate_id === "generation").approval_expires_at = null; assert.throws(() => renderReleaseDecision(disallowedNull));
  const noExpiringGate = structuredClone(result.payload); for (const gate of noExpiringGate.gates) gate.approval_expires_at = null; assert.throws(() => renderReleaseDecision(noExpiringGate));
  const nonExpiringAdapters = Object.fromEntries(expected.map((gate) => [gate.gate_id, async () => ({ current_ref: gate.evidence_ref, verified: true, approved: true, approval_expires_at: null })]));
  await assert.rejects(buildUnsignedActivationPayload({ manifest: m, key_id: "test-key", issued_at: "2026-08-26T09:00:00.000Z", selectors: selectors() }, nonExpiringAdapters), /activation_snapshot_unapproved/);
  const invalidDate = structuredClone(result.payload); invalidDate.issued_at = "2026-02-30T12:00:00.000Z"; assert.throws(() => renderReleaseDecision(invalidDate));
});

test("production trust map is empty and closed/descriptor/symbol/cycle attacks reject", async () => {
  const { payload } = await readyPayload(); const key = keys(); const signed = envelope(payload, key.privateKey);
  assert.equal((await evaluateActivationSnapshot(signed, { now: () => Date.parse(issued) + 1 })).reason, SNAPSHOT_REASON_CODES.KEY);
  for (const mutate of [
    (value) => { value.extra = true; },
    (value) => { value.payload.gates.pop(); },
    (value) => { value.payload.gates.push(structuredClone(value.payload.gates[0])); },
    (value) => { value.payload.manifest.semantic_ref = "f".repeat(64); },
    (value) => { value[Symbol("hidden")] = true; },
    (value) => { Object.defineProperty(value, "hidden", { value: true }); },
    (value) => { value.loop = value; },
  ]) {
    const candidate = structuredClone(signed); mutate(candidate);
    assert.equal((await evaluateActivationSnapshot(candidate, { trustedKeys: { "test-key": key.spki }, now: () => Date.parse(issued) + 1 })).ready, false);
  }
  assert.equal((await evaluateActivationSnapshot('{"payload":{},"payload":{},"signature":"x"}', { trustedKeys: { "test-key": key.spki } })).reason, SNAPSHOT_REASON_CODES.NOT_CLOSED);
  const inherited = Object.create({ "test-key": key.spki }); assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: inherited, now: () => Date.parse(issued) + 1 })).reason, SNAPSHOT_REASON_CODES.KEY);
  const accessor = {}; Object.defineProperty(accessor, "test-key", { enumerable: true, get() { throw new Error("getter"); } }); assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: accessor, now: () => Date.parse(issued) + 1 })).reason, SNAPSHOT_REASON_CODES.KEY);
  const symbolic = { "test-key": key.spki, [Symbol("extra")]: key.spki }; assert.equal((await evaluateActivationSnapshot(signed, { trustedKeys: symbolic, now: () => Date.parse(issued) + 1 })).reason, SNAPSHOT_REASON_CODES.KEY);
});

test("decision rendering is deterministic, pure, ordered, and contains every applicable gate once", async () => {
  const { payload } = await readyPayload(); const before = structuredClone(payload);
  const first = renderReleaseDecision(payload); const second = renderReleaseDecision(payload);
  assert.deepEqual(first, second); assert.deepEqual(payload, before);
  assert.deepEqual(first.gates.map(({ gate_id }) => gate_id), ["deployed_source", "generation", "judge", "house_catalog", "local_full_request"]);
});

test("conditional domain, receiver, and claim gates are literal, ordered, and omission fails closed", async () => {
  const m = manifest(); m.local = { enabled: false, full_request_ref: null }; m.domain = { enabled: true, evidence_ref: "e".repeat(64), full_request_ref: "f".repeat(64) }; m.receiver_ref = "1".repeat(64); m.receipt_claim_ref = "2".repeat(64);
  assert.deepEqual(applicableActivationGates(m).map(({ gate_id }) => gate_id), ["deployed_source", "generation", "judge", "house_catalog", "domain_evidence", "domain_full_request", "receiver", "receipt_claim"]);
  const adapters = createTrustedVerifierAdapters();
  for (const gate of ["domain_evidence", "domain_full_request", "receiver", "receipt_claim"]) {
    const fact = await adapters[gate]({}, { expected_ref: applicableActivationGates(m).find(({ gate_id }) => gate_id === gate).evidence_ref });
    assert.equal(fact.verified, false); assert.equal(fact.approved, false);
  }
  const payload = { version: 1, key_id: "test-key", issued_at: issued, expires_at: expires, manifest: m, gates: applicableActivationGates(m).map((gate) => ({ ...gate, status: "pass", approval_expires_at: expires })) };
  payload.gates.splice(5, 1); assert.throws(() => renderReleaseDecision(payload), /activation_snapshot_not_closed/);
});

test("duplicate-aware bounded parser rejects duplicates and excessive nesting", () => {
  assert.deepEqual(parseClosedJson('{"a":1,"b":[true,null]}'), { a: 1, b: [true, null] });
  assert.throws(() => parseClosedJson('{"a":1,"a":2}'), /release_decision_input_invalid/);
  assert.throws(() => parseClosedJson(`${"[".repeat(50)}0${"]".repeat(50)}`), /release_decision_input_invalid/);
  const proto = parseClosedJson('{"__proto__":{"polluted":true}}'); assert.equal(Object.getPrototypeOf(proto), Object.prototype); assert.equal(Object.hasOwn(proto, "__proto__"), true); assert.equal({}.polluted, undefined);
});

test("CLI input rendering uses verifier adapters and rejects self-attested fields", async () => {
  const input = { manifest: manifest(), key_id: "test-key", issued_at: issued, selectors: selectors() };
  const adapters = Object.fromEntries(applicableActivationGates(input.manifest).map((gate) => [gate.gate_id, async () => ({ current_ref: gate.evidence_ref, verified: true, approved: true, approval_expires_at: expires })]));
  assert.equal((await renderInput(JSON.stringify(input), adapters)).ready, true);
  assert.rejects(() => renderInput(JSON.stringify({ ...input, current: true }), adapters), /release_decision_input_invalid/);
  assert.rejects(() => renderInput('{"manifest":{},"manifest":{}}', adapters), /release_decision_input_invalid/);
});

test("real retained generation, judge, house, full-request, and assembly adapters invoke independent verifiers", async () => {
  const adapters = createTrustedVerifierAdapters();
  const source = await adapters.deployed_source({});
  assert.match(source.current_ref, /^[a-f0-9]{64}$/);
  const generation = await adapters.generation({ evidence_path: "spikes/generation-qualification/results/story-1-11-2026-08-22-l9-406d10ea-8629-4a24-ab8f-8873b0332e96.evidence.json" });
  assert.equal(generation.verified, true); assert.equal(generation.approved, true); assert.equal(generation.current_ref, "34731e26b1c1ef79acd444ba8e775143d9a616c3ab915f52481bd81475796bfc");
  const judgeStem = "spikes/judge-fidelity/results/2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9";
  const judge = await adapters.judge({ evidence_path: `${judgeStem}-v2.json`, bundle_path: `${judgeStem}-qualification.json` });
  assert.equal(judge.approved, true); assert.equal(judge.current_ref, "7dc1ec98a625a1dd16f1166067b496e4209a415e7f10854ff781f46d0d0062d0");
  const house = await adapters.house_catalog({}); assert.equal(house.verified, true); assert.equal(house.approved, true); assert.equal(house.current_ref, "9334910e17f7fa610ee2a18d54b1485bf19d00b866f8e7cd8f5258a0d17e9ad8");
  const base = "spikes/local-full-request-qualification/results/a77bfb8a3a933fd279ddff03d722fd1daee12ef4704d36e7a2beb49ba7dcba7d/approval-e1c3f58a7c8edbca";
  const stem = `${base}/5ef8222e-27e2-4d48-95f9-761991155e19`;
  const full = await adapters.local_full_request({ evidence_path: `${stem}.evidence.json`, plan_path: `${stem}.plan.json`, approval_path: `${stem}.approval.json` });
  assert.equal(full.verified, true); assert.equal(full.approved, true); assert.match(full.current_ref, /^[a-f0-9]{64}$/);
  const realSelectors = {
    deployed_source: {},
    generation: { evidence_path: "spikes/generation-qualification/results/story-1-11-2026-08-22-l9-406d10ea-8629-4a24-ab8f-8873b0332e96.evidence.json" },
    judge: { evidence_path: `${judgeStem}-v2.json`, bundle_path: `${judgeStem}-qualification.json` },
    house_catalog: {},
    local_full_request: { evidence_path: `${stem}.evidence.json`, plan_path: `${stem}.plan.json`, approval_path: `${stem}.approval.json` },
    domain_evidence: {}, domain_full_request: {}, receiver: {}, receipt_claim: {},
  };
  const realManifest = { version: 2, deployed_source_identity: source.current_ref, generation_ref: generation.current_ref, judge_ref: judge.current_ref, local: { enabled: true, full_request_ref: full.current_ref }, domain: { enabled: false, evidence_ref: null, full_request_ref: null }, house_catalog_ref: house.current_ref, receiver_ref: null, receipt_claim_ref: null, outcome: "active" };
  const realInput = { manifest: realManifest, key_id: "test-key", issued_at: "2026-08-22T00:00:00.000Z", selectors: realSelectors };
  const built = await buildUnsignedActivationPayload(realInput, adapters);
  assert.equal(built.ready, judge.verified); assert.equal(built.decision.gates[0].approval_expires_at, null); assert.equal(built.decision.gates[3].approval_expires_at, null);
  assert.deepEqual(built.decision.gates.map(({ status }) => status), ["pass", "pass", judge.verified ? "pass" : "blocked", "pass", "pass"]);
  if (built.ready) assert.equal(built.payload.expires_at, [generation.approval_expires_at, judge.approval_expires_at, full.approval_expires_at].sort()[0]);
  const rendered = await renderInput(JSON.stringify(realInput), adapters);
  assert.deepEqual(rendered, built);
});

test("CLI path boundary rejects traversal and symlink selectors without leaking paths", () => {
  const traversal = spawnSync(process.execPath, ["scripts/release-decision.mjs", "../package.json"], { encoding: "utf8" });
  assert.equal(traversal.status, 1); assert.equal(traversal.stderr, "release_decision_input_invalid\n");
  const directory = path.join(process.cwd(), ".release-decision-test"); const link = path.join(directory, "outside.json");
  mkdirSync(directory); symlinkSync("../package.json", link); writeFileSync(path.join(directory, "request.json"), "{}");
  try {
    const linked = spawnSync(process.execPath, ["scripts/release-decision.mjs", ".release-decision-test/outside.json"], { encoding: "utf8" });
    assert.equal(linked.status, 1); assert.equal(linked.stderr, "release_decision_input_invalid\n");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
