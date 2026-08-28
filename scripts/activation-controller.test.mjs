import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalJson } from "../src/pipeline/contracts.mjs";
import { ActivationControllerError, runActivationController } from "./activation-controller.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
function fixture() {
  const snapshot = { payload: { manifest: { deployed_source_identity: "runtime-1" } }, signature: "redacted" };
  const packet = { contract: "oddspark-local-activation-packet/v1", target: { account_id: "account", script_name: "oddspark", environment: "production", binding: "ACTIVATION_SNAPSHOT" }, operations: { activate: { kind: "set_whole_value", expected_current: null }, rollback: { kind: "remove_whole_value" } }, observation: { window_seconds: 300, checks: ["snapshot_hash", "runtime_identity", "local_enabled", "domain_effective_local", "no_terminal_errors"] }, payload: snapshot.payload, payload_sha256: hash(canonicalJson(snapshot.payload)), rollback_expected_snapshot_sha256: hash(canonicalJson(snapshot)), snapshot };
  const packet_sha256 = hash(canonicalJson(packet));
  return { packet, packet_sha256 };
}
function authority(value, operation) { return { contract: "oddspark-one-shot-activation-authority/v1", packet_sha256: value.packet_sha256, target: value.packet.target, operation, expires_at: "2026-08-26T14:00:00.000Z", one_shot_id: `${operation}-once` }; }
function adapter(value, { observation = {}, casMismatch = false } = {}) {
  let current = null; const used = new Set(); let mutations = 0;
  return { get mutations() { return mutations; }, get current() { return current; }, async claimOneShot(id) { if (used.has(id)) return false; used.add(id); return true; }, async compareAndSet(_target, expected, replacement) { if (casMismatch || current !== expected) return false; mutations += 1; current = replacement; return true; }, async observe(_target, operation) { return { snapshot_sha256: operation === "activate" ? value.packet.rollback_expected_snapshot_sha256 : null, runtime_identity: "runtime-1", local_enabled: operation === "activate", domain_effective_local: true, terminal_errors: 0, ...observation }; } };
}

test("controller performs one hash-bound whole-value activation and refuses retry or drift", async () => {
  const value = fixture(); const port = adapter(value); const auth = authority(value, "activate");
  const result = await runActivationController({ ...value, authority: auth, operation: "activate" }, port, { now: () => Date.parse("2026-08-26T12:30:00.000Z") });
  assert.equal(result.outcome, "activated"); assert.equal(port.mutations, 1);
  await assert.rejects(runActivationController({ ...value, authority: auth, operation: "activate" }, port, { now: () => Date.parse("2026-08-26T12:30:00.000Z") }), /activation_controller_refused/);
  const drift = structuredClone(value); drift.packet.target.script_name = "other";
  await assert.rejects(runActivationController({ ...drift, authority: authority(value, "activate"), operation: "activate" }, adapter(value)), /activation_controller_refused/);
  await assert.rejects(runActivationController({ ...value, authority: authority(value, "activate"), operation: "activate" }, adapter(value, { casMismatch: true })), /activation_controller_refused/);
});

test("rollback removes only the exact frozen snapshot", async () => {
  const value = fixture(); const port = adapter(value);
  await runActivationController({ ...value, authority: authority(value, "activate"), operation: "activate" }, port, { now: () => Date.parse("2026-08-26T12:30:00.000Z") });
  const rolled = await runActivationController({ ...value, authority: authority(value, "rollback"), operation: "rollback" }, port, { now: () => Date.parse("2026-08-26T12:31:00.000Z") });
  assert.equal(rolled.outcome, "rolled_back"); assert.equal(port.mutations, 2);
});

test("every observation-field mismatch is a distinct terminal post-mutation failure", async () => {
  const value = fixture();
  const mismatches = {
    snapshot_sha256: "0".repeat(64), runtime_identity: "wrong-runtime", local_enabled: false,
    domain_effective_local: false, terminal_errors: 1,
  };
  for (const [field, replacement] of Object.entries(mismatches)) {
    const port = adapter(value, { observation: { [field]: replacement } });
    await assert.rejects(
      runActivationController({ ...value, authority: { ...authority(value, "activate"), one_shot_id: `mismatch-${field}` }, operation: "activate" }, port, { now: () => Date.parse("2026-08-26T12:30:00.000Z") }),
      (error) => error instanceof ActivationControllerError && error.code === "activation_observation_failed"
        && error.terminal === true && error.mutation_applied === true && error.field === field,
    );
    assert.equal(port.mutations, 1);
  }
  const malformed = adapter(value); malformed.observe = async () => ({});
  await assert.rejects(
    runActivationController({ ...value, authority: { ...authority(value, "activate"), one_shot_id: "malformed-observation" }, operation: "activate" }, malformed, { now: () => Date.parse("2026-08-26T12:30:00.000Z") }),
    (error) => error.code === "activation_observation_failed" && error.field === "shape" && error.mutation_applied === true,
  );
});

test("claim, compare-and-set, and observation adapter operations are bounded", async () => {
  const value = fixture();
  for (const operationName of ["claimOneShot", "compareAndSet", "observe"]) {
    const port = adapter(value);
    port[operationName] = async () => new Promise(() => {});
    await assert.rejects(
      runActivationController({ ...value, authority: { ...authority(value, "activate"), one_shot_id: `timeout-${operationName}` }, operation: "activate" }, port, { now: () => Date.parse("2026-08-26T12:30:00.000Z"), operationTimeoutMs: 10 }),
      (error) => error.code === "activation_controller_operation_timeout" && error.terminal === true
        && error.mutation_applied === (operationName === "observe"),
    );
  }
});
