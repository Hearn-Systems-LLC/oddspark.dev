import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { ACTIVATION_ATTESTATION_DOMAIN, applicableActivationGates } from "../src/pipeline/release-decision.mjs";
import { canonicalJson } from "../src/pipeline/contracts.mjs";
import { prepareActivation, verifySignedActivation } from "./activation-preflight.mjs";

const issued = "2026-08-26T12:00:00.000Z";
const expires = "2026-08-26T13:00:00.000Z";
const manifest = () => ({ version: 2, deployed_source_identity: "deployed-source-v1", generation_ref: "a".repeat(64), judge_ref: "b".repeat(64), local: { enabled: true, full_request_ref: "c".repeat(64) }, domain: { enabled: false, evidence_ref: null, full_request_ref: null }, house_catalog_ref: "d".repeat(64), receiver_ref: null, receipt_claim_ref: null, outcome: "active" });
const selectors = () => Object.fromEntries(["deployed_source", "generation", "judge", "house_catalog", "local_full_request", "domain_evidence", "domain_full_request", "receiver", "receipt_claim"].map((key) => [key, {}]));
const target = () => ({ account_id: "account", script_name: "oddspark", environment: "production", binding: "ACTIVATION_SNAPSHOT" });
const operations = () => ({ activate: { kind: "set_whole_value", expected_current: null }, rollback: { kind: "remove_whole_value" } });
const observation = () => ({ window_seconds: 300, checks: ["snapshot_hash", "runtime_identity", "local_enabled", "domain_effective_local", "no_terminal_errors"] });
const adapters = (value = manifest()) => Object.fromEntries(applicableActivationGates(value).map((gate) => [gate.gate_id, async () => ({ current_ref: gate.evidence_ref, verified: true, approved: true, approval_expires_at: ["deployed_source", "house_catalog"].includes(gate.gate_id) ? null : expires })]));
const trust = (keys) => ({ trustedKeys: { "owner-key": keys.publicKey.export({ format: "der", type: "spki" }).toString("base64url") }, expectedKeyId: "owner-key", now: () => Date.parse(issued) + 1 });

test("unsigned preparation freezes verifier-derived bytes without signing or mutation", async () => {
  const result = await prepareActivation({ release_decision: { manifest: manifest(), key_id: "owner-key", issued_at: issued, selectors: selectors() }, target: target(), operations: operations(), observation: observation() }, adapters());
  assert.equal(result.ready, true);
  assert.match(result.prepared_sha256, /^[a-f0-9]{64}$/);
  const signingBytes = Buffer.from(result.signing_request.signing_bytes_utf8_base64url, "base64url").toString("utf8");
  assert.equal(signingBytes, `${ACTIVATION_ATTESTATION_DOMAIN}${canonicalJson(result.prepared.payload)}`);
  assert.equal(result.signing_request.domain, ACTIVATION_ATTESTATION_DOMAIN);
  assert.equal(Object.hasOwn(result.prepared, "snapshot"), false);
  assert.equal(result.prepared.rollback_expected_snapshot_sha256, null);
  const duplicate = structuredClone(result); duplicate.prepared.target.binding = "ACTIVATION_MANIFEST";
  await assert.rejects(verifySignedActivation({ prepared: duplicate.prepared, prepared_sha256: duplicate.prepared_sha256, signature: "x" }, { trustedKeys: {}, expectedKeyId: "owner-key" }), /activation_preflight_not_ready/);
});

test("signed verification binds the exact owner signature and rejects drift", async () => {
  const prepared = await prepareActivation({ release_decision: { manifest: manifest(), key_id: "owner-key", issued_at: issued, selectors: selectors() }, target: target(), operations: operations(), observation: observation() }, adapters());
  const keys = generateKeyPairSync("ed25519");
  const signature = sign(null, Buffer.from(`${ACTIVATION_ATTESTATION_DOMAIN}${canonicalJson(prepared.prepared.payload)}`), keys.privateKey).toString("base64url");
  const input = { prepared: prepared.prepared, prepared_sha256: prepared.prepared_sha256, signature };
  const verified = await verifySignedActivation(input, trust(keys));
  assert.equal(verified.ready, true); assert.match(verified.packet_sha256, /^[a-f0-9]{64}$/);
  const drifted = structuredClone(input); drifted.prepared.target.script_name = "other";
  await assert.rejects(verifySignedActivation(drifted, trust(keys)), /activation_preflight_not_ready/);
  const wrong = generateKeyPairSync("ed25519");
  assert.equal((await verifySignedActivation(input, trust(wrong))).ready, false);
  await assert.rejects(verifySignedActivation({ ...input, public_key_spki: "candidate-controlled" }, trust(keys)), /activation_preflight_not_ready/);
  await assert.rejects(verifySignedActivation(input, { trustedKeys: trust(keys).trustedKeys, expectedKeyId: "other", now: trust(keys).now }), /activation_preflight_not_ready/);
});

test("signed preflight rejects every non-local-only manifest restriction", async () => {
  const keys = generateKeyPairSync("ed25519");
  const variants = [
    (value) => { value.local = { enabled: false, full_request_ref: null }; value.domain = { enabled: true, evidence_ref: "e".repeat(64), full_request_ref: "f".repeat(64) }; },
    (value) => { value.domain = { enabled: true, evidence_ref: "e".repeat(64), full_request_ref: "f".repeat(64) }; },
    (value) => { value.receiver_ref = "1".repeat(64); },
    (value) => { value.receipt_claim_ref = "2".repeat(64); },
  ];
  for (const mutate of variants) {
    const candidateManifest = manifest(); mutate(candidateManifest);
    const prepared = await prepareActivation({ release_decision: { manifest: candidateManifest, key_id: "owner-key", issued_at: issued, selectors: selectors() }, target: target(), operations: operations(), observation: observation() }, adapters(candidateManifest));
    const signature = sign(null, Buffer.from(`${ACTIVATION_ATTESTATION_DOMAIN}${canonicalJson(prepared.prepared.payload)}`), keys.privateKey).toString("base64url");
    const result = await verifySignedActivation({ prepared: prepared.prepared, prepared_sha256: prepared.prepared_sha256, signature }, trust(keys));
    assert.equal(result.ready, false);
  }
});
