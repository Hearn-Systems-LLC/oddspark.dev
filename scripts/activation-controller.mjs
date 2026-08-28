#!/usr/bin/env node
import { createHash } from "node:crypto";
import { canonicalJson, deepFreeze } from "../src/pipeline/contracts.mjs";
import { ACTIVATION_PACKET_CONTRACT } from "./activation-preflight.mjs";

const FAILURE = "activation_controller_refused";
const TIMEOUT = "activation_controller_operation_timeout";
const OBSERVATION_FAILURE = "activation_observation_failed";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const same = (left, right) => canonicalJson(left) === canonicalJson(right);

export class ActivationControllerError extends Error {
  constructor(code, { terminal = false, mutationApplied = false, field = null } = {}) {
    super(code); this.name = "ActivationControllerError"; this.code = code;
    this.terminal = terminal; this.mutation_applied = mutationApplied; this.field = field;
  }
}

async function boundedOperation(call, deadlineMs) {
  const remaining = deadlineMs - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) throw new ActivationControllerError(TIMEOUT, { terminal: true });
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(call({ deadline_ms: deadlineMs })),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new ActivationControllerError(TIMEOUT, { terminal: true })), remaining); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function runActivationController({ packet, packet_sha256, authority, operation }, adapter, { now = () => Date.now(), operationTimeoutMs = 5000 } = {}) {
  const target = packet?.target;
  if (!packet || packet.contract !== ACTIVATION_PACKET_CONTRACT || hash(canonicalJson(packet)) !== packet_sha256
      || !["activate", "rollback"].includes(operation)
      || !exact(authority, ["contract", "packet_sha256", "target", "operation", "expires_at", "one_shot_id"])
      || authority.contract !== "oddspark-one-shot-activation-authority/v1" || authority.packet_sha256 !== packet_sha256
      || authority.operation !== operation || !same(authority.target, target)
      || !Number.isFinite(Date.parse(authority.expires_at)) || now() >= Date.parse(authority.expires_at)
      || typeof authority.one_shot_id !== "string" || authority.one_shot_id.trim() === ""
      || !Number.isSafeInteger(operationTimeoutMs) || operationTimeoutMs <= 0
      || !adapter || !["claimOneShot", "compareAndSet", "observe"].every((key) => typeof adapter[key] === "function")) throw new TypeError(FAILURE);
  const remainingAuthorityMs = Date.parse(authority.expires_at) - now();
  if (!Number.isFinite(remainingAuthorityMs) || remainingAuthorityMs <= 0) throw new TypeError(FAILURE);
  const operationDeadlineMs = Date.now() + Math.min(operationTimeoutMs, remainingAuthorityMs);
  if (await boundedOperation((terminal) => adapter.claimOneShot(authority.one_shot_id, packet_sha256, operation, terminal), operationDeadlineMs) !== true) throw new TypeError(FAILURE);
  const expected = operation === "activate" ? packet.operations.activate.expected_current : canonicalJson(packet.snapshot);
  const replacement = operation === "activate" ? canonicalJson(packet.snapshot) : null;
  const applied = await boundedOperation((terminal) => adapter.compareAndSet(target, expected, replacement, terminal), operationDeadlineMs);
  if (applied !== true) throw new TypeError(FAILURE);
  let observed;
  try {
    observed = await boundedOperation((terminal) => adapter.observe(target, operation, packet.observation, terminal), operationDeadlineMs);
  } catch (error) {
    if (error instanceof ActivationControllerError && error.code === TIMEOUT) {
      error.mutation_applied = true; throw error;
    }
    throw new ActivationControllerError(OBSERVATION_FAILURE, { terminal: true, mutationApplied: true });
  }
  const expectedHash = operation === "activate" ? packet.rollback_expected_snapshot_sha256 : null;
  const observationChecks = [
    ["shape", exact(observed, ["snapshot_sha256", "runtime_identity", "local_enabled", "domain_effective_local", "terminal_errors"])],
    ["snapshot_sha256", observed?.snapshot_sha256 === expectedHash],
    ["runtime_identity", observed?.runtime_identity === packet.payload.manifest.deployed_source_identity],
    ["local_enabled", observed?.local_enabled === (operation === "activate")],
    ["domain_effective_local", observed?.domain_effective_local === true],
    ["terminal_errors", observed?.terminal_errors === 0],
  ];
  const mismatch = observationChecks.find(([, pass]) => !pass);
  if (mismatch) throw new ActivationControllerError(OBSERVATION_FAILURE, { terminal: true, mutationApplied: true, field: mismatch[0] });
  return deepFreeze({ terminal: true, outcome: operation === "activate" ? "activated" : "rolled_back", packet_sha256, target_sha256: hash(canonicalJson(target)) });
}

if (process.argv[1]?.endsWith("activation-controller.mjs")) {
  process.stderr.write(`${FAILURE}: production adapter is intentionally unavailable; use an exact separately approved operator adapter\n`);
  process.exitCode = 1;
}
