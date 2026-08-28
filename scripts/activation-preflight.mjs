#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, deepFreeze } from "../src/pipeline/contracts.mjs";
import { ACTIVATION_ATTESTATION_DOMAIN, evaluateActivationSnapshot } from "../src/pipeline/release-decision.mjs";
import { parseClosedJson, renderInput } from "./release-decision.mjs";

export const ACTIVATION_PACKET_CONTRACT = "oddspark-local-activation-packet/v1";
const FAILURE = "activation_preflight_not_ready";
const HASH = /^[a-f0-9]{64}$/;
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const nonblank = (value) => typeof value === "string" && value.trim() !== "" && value.length <= 200;

function validateTarget(target) {
  return exact(target, ["account_id", "script_name", "environment", "binding"])
    && [target.account_id, target.script_name, target.environment].every(nonblank)
    && target.binding === "ACTIVATION_SNAPSHOT";
}
function validateOperations(value) {
  return exact(value, ["activate", "rollback"])
    && exact(value.activate, ["kind", "expected_current"])
    && value.activate.kind === "set_whole_value" && value.activate.expected_current === null
    && exact(value.rollback, ["kind"]) && value.rollback.kind === "remove_whole_value";
}
function validateObservation(value) {
  return exact(value, ["window_seconds", "checks"])
    && Number.isSafeInteger(value.window_seconds) && value.window_seconds > 0 && value.window_seconds <= 3600
    && Array.isArray(value.checks)
    && canonicalJson(value.checks) === canonicalJson(["snapshot_hash", "runtime_identity", "local_enabled", "domain_effective_local", "no_terminal_errors"]);
}

export async function prepareActivation(input, adapters) {
  if (!exact(input, ["release_decision", "target", "operations", "observation"])
      || !validateTarget(input.target) || !validateOperations(input.operations) || !validateObservation(input.observation)) throw new TypeError(FAILURE);
  const release = await renderInput(canonicalJson(input.release_decision), adapters);
  if (!release.ready) return deepFreeze({ ready: false, reason: FAILURE });
  const payloadBytes = canonicalJson(release.payload);
  const signingBytes = `${ACTIVATION_ATTESTATION_DOMAIN}${payloadBytes}`;
  const prepared = {
    contract: ACTIVATION_PACKET_CONTRACT,
    target: structuredClone(input.target), operations: structuredClone(input.operations), observation: structuredClone(input.observation),
    payload: structuredClone(release.payload), payload_sha256: hash(payloadBytes), rollback_expected_snapshot_sha256: null,
  };
  return deepFreeze({ ready: true, prepared, prepared_sha256: hash(canonicalJson(prepared)), signing_request: {
    domain: ACTIVATION_ATTESTATION_DOMAIN, payload_sha256: prepared.payload_sha256,
    signing_bytes_sha256: hash(signingBytes), signing_bytes_utf8_base64url: Buffer.from(signingBytes).toString("base64url"),
  } });
}

export async function verifySignedActivation(input, { trustedKeys, expectedKeyId, now = () => Date.now() } = {}) {
  if (!exact(input, ["prepared", "prepared_sha256", "signature"])
      || !HASH.test(input.prepared_sha256 ?? "") || hash(canonicalJson(input.prepared)) !== input.prepared_sha256
      || !exact(input.prepared, ["contract", "target", "operations", "observation", "payload", "payload_sha256", "rollback_expected_snapshot_sha256"])
      || input.prepared.contract !== ACTIVATION_PACKET_CONTRACT || !validateTarget(input.prepared.target)
      || !validateOperations(input.prepared.operations) || !validateObservation(input.prepared.observation)
      || hash(canonicalJson(input.prepared.payload)) !== input.prepared.payload_sha256
      || typeof input.signature !== "string" || typeof expectedKeyId !== "string"
      || input.prepared.payload.key_id !== expectedKeyId || trustedKeys === null || typeof trustedKeys !== "object"
      || Array.isArray(trustedKeys) || !Object.hasOwn(trustedKeys, expectedKeyId)) throw new TypeError(FAILURE);
  const snapshot = { payload: input.prepared.payload, signature: input.signature };
  const evaluation = await evaluateActivationSnapshot(snapshot, { trustedKeys, now });
  const manifest = evaluation.manifest;
  if (!evaluation.ready || manifest.local.enabled !== true || manifest.domain.enabled !== false
      || manifest.domain.evidence_ref !== null || manifest.domain.full_request_ref !== null
      || manifest.receiver_ref !== null || manifest.receipt_claim_ref !== null) return deepFreeze({ ready: false, reason: evaluation.reason ?? FAILURE });
  const snapshotSha256 = hash(canonicalJson(snapshot));
  const packet = { ...structuredClone(input.prepared), snapshot, rollback_expected_snapshot_sha256: snapshotSha256 };
  return deepFreeze({ ready: true, packet, packet_sha256: hash(canonicalJson(packet)) });
}

async function main(argv) {
  if (!["prepare", "verify"].includes(argv[0]) || (argv[0] === "prepare" ? argv.length !== 2 : argv.length !== 3)) throw new TypeError(FAILURE);
  const input = parseClosedJson(await readFile(path.resolve(argv[1]), "utf8"));
  let result;
  if (argv[0] === "prepare") result = await prepareActivation(input);
  else {
    const trust = parseClosedJson(await readFile(path.resolve(argv[2]), "utf8"));
    if (!exact(trust, ["expected_key_id", "trusted_keys"])) throw new TypeError(FAILURE);
    result = await verifySignedActivation(input, { trustedKeys: trust.trusted_keys, expectedKeyId: trust.expected_key_id });
  }
  process.stdout.write(`${JSON.stringify(result)}\n`); return result.ready ? 0 : 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch(() => { process.stderr.write(`${FAILURE}\n`); process.exitCode = 1; });
}
