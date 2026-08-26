import { canonicalJson, deepFreeze } from "./contracts.mjs";
import { deriveActivationRef, validateProductionActivationManifest } from "./activation.mjs";

export const ACTIVATION_ATTESTATION_VERSION = 1;
export const ACTIVATION_ATTESTATION_DOMAIN = "oddspark-activation-attestation/v1\n";
export const PRODUCTION_ACTIVATION_TRUST_KEYS = deepFreeze({});
// Test harnesses inject ephemeral public keys through a symbol property. Such
// a property cannot be represented by Workers vars/bindings or JSON, so it is
// not a parallel production configuration surface.
export const ACTIVATION_TRUST_KEYS_TEST_PORT = Symbol("oddspark.activation-trust-keys.test-port");

export const SNAPSHOT_REASON_CODES = deepFreeze({
  MISSING: "activation_snapshot_missing",
  NOT_CLOSED: "activation_snapshot_not_closed",
  MANIFEST: "activation_snapshot_manifest_invalid",
  SIGNATURE: "activation_snapshot_signature_invalid",
  KEY: "activation_snapshot_key_unknown",
  TIME: "activation_snapshot_time_invalid",
  STALE: "activation_snapshot_stale",
  BLOCKED: "activation_snapshot_blocked",
  UNAPPROVED: "activation_snapshot_unapproved",
});

const REF = /^[a-f0-9]{64}$/;
const KEY_ID = /^[A-Za-z0-9._-]{1,64}$/;
const STATUS = new Set(["pass", "blocked", "stale", "unapproved"]);
const NON_EXPIRING_GATES = new Set(["deployed_source", "house_catalog"]);
const encoder = new TextEncoder();

function parseBoundedJson(text) {
  if (typeof text !== "string" || encoder.encode(text).byteLength > 262144) throw new TypeError("invalid json");
  let offset = 0;
  const whitespace = () => { while (/\s/.test(text[offset] ?? "")) offset += 1; };
  const string = () => { const start = offset++; for (;;) { if (offset >= text.length) throw new TypeError("invalid json"); if (text[offset] === "\\") { offset += 2; continue; } if (text[offset++] === '"') break; } return JSON.parse(text.slice(start, offset)); };
  const value = (depth = 0) => {
    if (depth > 24) throw new TypeError("invalid json"); whitespace(); const character = text[offset];
    if (character === '"') return string();
    if (character === "{") { offset += 1; whitespace(); const result = {}; const keys = new Set(); if (text[offset] === "}") { offset += 1; return result; } for (;;) { whitespace(); if (text[offset] !== '"') throw new TypeError("invalid json"); const key = string(); if (keys.has(key)) throw new TypeError("duplicate key"); keys.add(key); whitespace(); if (text[offset++] !== ":") throw new TypeError("invalid json"); result[key] = value(depth + 1); whitespace(); if (text[offset] === "}") { offset += 1; return result; } if (text[offset++] !== ",") throw new TypeError("invalid json"); } }
    if (character === "[") { offset += 1; whitespace(); const result = []; if (text[offset] === "]") { offset += 1; return result; } for (;;) { result.push(value(depth + 1)); whitespace(); if (text[offset] === "]") { offset += 1; return result; } if (text[offset++] !== ",") throw new TypeError("invalid json"); } }
    const match = text.slice(offset).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/); if (!match) throw new TypeError("invalid json"); offset += match[0].length; return JSON.parse(match[0]);
  };
  const parsed = value(); whitespace(); if (offset !== text.length) throw new TypeError("invalid json"); return parsed;
}

function dataObject(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
      || Reflect.ownKeys(value).length !== keys.length) return false;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || descriptor.enumerable !== true) return false;
  }
  return keys.every((key) => Object.hasOwn(value, key));
}

function safeTree(value, depth = 0, seen = new WeakSet()) {
  if (depth > 24) return false;
  if (value === null || ["string", "boolean"].includes(typeof value)) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) return false;
  if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) return false;
  const keys = Array.isArray(value) ? Object.keys(value) : Reflect.ownKeys(value);
  if (Array.isArray(value) && (keys.length !== value.length || keys.some((key, index) => key !== String(index)))) return false;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable
        || !safeTree(descriptor.value, depth + 1, seen)) return false;
  }
  return true;
}

export function applicableActivationGates(manifest) {
  const validation = validateProductionActivationManifest(manifest);
  if (!validation.valid) throw new TypeError(SNAPSHOT_REASON_CODES.MANIFEST);
  const gates = [
    ["deployed_source", manifest.deployed_source_identity],
    ["generation", manifest.generation_ref],
    ["judge", manifest.judge_ref],
    ["house_catalog", manifest.house_catalog_ref],
  ];
  if (manifest.local.enabled) gates.push(["local_full_request", manifest.local.full_request_ref]);
  if (manifest.domain.enabled) gates.push(["domain_evidence", manifest.domain.evidence_ref], ["domain_full_request", manifest.domain.full_request_ref]);
  if (manifest.receiver_ref !== null) gates.push(["receiver", manifest.receiver_ref]);
  if (manifest.receipt_claim_ref !== null) gates.push(["receipt_claim", manifest.receipt_claim_ref]);
  return deepFreeze(gates.map(([gate_id, evidence_ref]) => ({ gate_id, evidence_ref })));
}

function parseTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? parsed : NaN;
}

export function validateSigningPayload(payload) {
  if (!safeTree(payload) || !dataObject(payload, ["version", "key_id", "issued_at", "expires_at", "manifest", "gates"])) return false;
  if (payload.version !== ACTIVATION_ATTESTATION_VERSION || !KEY_ID.test(payload.key_id ?? "")) return false;
  const issued = parseTime(payload.issued_at); const expires = parseTime(payload.expires_at);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued) return false;
  const manifestValidation = validateProductionActivationManifest(payload.manifest);
  if (!manifestValidation.valid || !Array.isArray(payload.gates)) return false;
  const expected = applicableActivationGates(payload.manifest);
  if (payload.gates.length !== expected.length) return false;
  let hasExpiringGate = false;
  for (const [index, gate] of payload.gates.entries()) {
    if (!dataObject(gate, ["gate_id", "evidence_ref", "status", "approval_expires_at"])
        || gate.gate_id !== expected[index].gate_id || gate.evidence_ref !== expected[index].evidence_ref
        || !STATUS.has(gate.status)) return false;
    if (gate.approval_expires_at === null) {
      if (gate.status !== "pass" || !NON_EXPIRING_GATES.has(gate.gate_id)) return false;
      continue;
    }
    const gateExpiry = parseTime(gate.approval_expires_at);
    if (!Number.isFinite(gateExpiry) || expires > gateExpiry) return false;
    hasExpiringGate = true;
  }
  return hasExpiringGate;
}

export function renderReleaseDecision(payload) {
  if (!validateSigningPayload(payload)) throw new TypeError(SNAPSHOT_REASON_CODES.NOT_CLOSED);
  const gates = payload.gates.map((gate) => ({ gate_id: gate.gate_id, evidence_ref: gate.evidence_ref, status: gate.status, approval_expires_at: gate.approval_expires_at }));
  return deepFreeze({
    ready: gates.every(({ status }) => status === "pass"),
    activation_ref: deriveActivationRef(payload.manifest),
    gates,
  });
}

function decodeBase64Url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new TypeError("invalid signature");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importTrustKey(spki) {
  const bytes = typeof spki === "string" ? decodeBase64Url(spki) : spki;
  if (!(bytes instanceof Uint8Array)) throw new TypeError("invalid key");
  return crypto.subtle.importKey("spki", bytes, { name: "Ed25519" }, false, ["verify"]);
}

export async function evaluateActivationSnapshot(value, { trustedKeys = PRODUCTION_ACTIVATION_TRUST_KEYS, now = () => Date.now() } = {}) {
  const reject = (reason) => deepFreeze({ valid: false, ready: false, reason, decision: null, manifest: null });
  if (value === undefined || value === null) return reject(SNAPSHOT_REASON_CODES.MISSING);
  let envelope = value;
  if (typeof value === "string") {
    try { envelope = parseBoundedJson(value); } catch { return reject(SNAPSHOT_REASON_CODES.NOT_CLOSED); }
  }
  if (!safeTree(envelope) || !dataObject(envelope, ["payload", "signature"]) || !validateSigningPayload(envelope.payload)) return reject(SNAPSHOT_REASON_CODES.NOT_CLOSED);
  if (trustedKeys === null || typeof trustedKeys !== "object" || Array.isArray(trustedKeys)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(trustedKeys))
      || Reflect.ownKeys(trustedKeys).some((key) => typeof key === "symbol")) return reject(SNAPSHOT_REASON_CODES.KEY);
  for (const key of Reflect.ownKeys(trustedKeys)) {
    const descriptor = Object.getOwnPropertyDescriptor(trustedKeys, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) return reject(SNAPSHOT_REASON_CODES.KEY);
  }
  const keyDescriptor = Object.getOwnPropertyDescriptor(trustedKeys, envelope.payload.key_id);
  if (!keyDescriptor || !Object.hasOwn(keyDescriptor, "value")) return reject(SNAPSHOT_REASON_CODES.KEY);
  const spki = keyDescriptor.value;
  try {
    const key = await importTrustKey(spki);
    const verified = await crypto.subtle.verify("Ed25519", key, decodeBase64Url(envelope.signature), encoder.encode(`${ACTIVATION_ATTESTATION_DOMAIN}${canonicalJson(envelope.payload)}`));
    if (!verified) return reject(SNAPSHOT_REASON_CODES.SIGNATURE);
  } catch { return reject(SNAPSHOT_REASON_CODES.SIGNATURE); }
  let nowMs;
  try { nowMs = now(); } catch { return reject(SNAPSHOT_REASON_CODES.TIME); }
  const issued = parseTime(envelope.payload.issued_at); const expires = parseTime(envelope.payload.expires_at);
  if (!Number.isFinite(nowMs) || nowMs < issued || nowMs >= expires) return reject(SNAPSHOT_REASON_CODES.TIME);
  const decision = renderReleaseDecision(envelope.payload);
  if (!decision.ready) {
    const status = decision.gates.find(({ status }) => status !== "pass")?.status;
    return reject(SNAPSHOT_REASON_CODES[status?.toUpperCase()] ?? SNAPSHOT_REASON_CODES.BLOCKED);
  }
  return deepFreeze({ valid: true, ready: true, reason: null, decision, manifest: deepFreeze(structuredClone(envelope.payload.manifest)) });
}

export async function buildUnsignedActivationPayload({ manifest, key_id, issued_at, selectors }, adapters) {
  if (!dataObject(selectors, ["deployed_source", "generation", "judge", "house_catalog", "local_full_request", "domain_evidence", "domain_full_request", "receiver", "receipt_claim"])) {
    throw new TypeError(SNAPSHOT_REASON_CODES.NOT_CLOSED);
  }
  const expected = applicableActivationGates(manifest);
  const gates = [];
  let earliest = Infinity;
  for (const gate of expected) {
    const verify = adapters?.[gate.gate_id];
    if (typeof verify !== "function") throw new TypeError(SNAPSHOT_REASON_CODES.BLOCKED);
    const fact = await verify(selectors[gate.gate_id], { expected_ref: gate.evidence_ref, manifest });
    if (!dataObject(fact, ["current_ref", "verified", "approved", "approval_expires_at"])) throw new TypeError(SNAPSHOT_REASON_CODES.BLOCKED);
    const status = fact.current_ref !== gate.evidence_ref ? "stale" : fact.verified !== true ? "blocked" : fact.approved !== true ? "unapproved" : "pass";
    const expiry = fact.approval_expires_at === null ? null : parseTime(fact.approval_expires_at);
    if (status === "pass" && fact.approval_expires_at === null && !NON_EXPIRING_GATES.has(gate.gate_id)) throw new TypeError(SNAPSHOT_REASON_CODES.UNAPPROVED);
    if (status === "pass" && fact.approval_expires_at !== null && !Number.isFinite(expiry)) throw new TypeError(SNAPSHOT_REASON_CODES.UNAPPROVED);
    if (status === "pass" && Number.isFinite(expiry)) earliest = Math.min(earliest, expiry);
    gates.push({ ...gate, status, approval_expires_at: fact.approval_expires_at });
  }
  if (!gates.every(({ status }) => status === "pass") || !Number.isFinite(earliest)) return deepFreeze({ ready: false, payload: null, decision: deepFreeze({ ready: false, activation_ref: deriveActivationRef(manifest), gates }) });
  const payload = { version: ACTIVATION_ATTESTATION_VERSION, key_id, issued_at, expires_at: new Date(earliest).toISOString(), manifest: structuredClone(manifest), gates };
  if (!validateSigningPayload(payload) || parseTime(issued_at) >= earliest) throw new TypeError(SNAPSHOT_REASON_CODES.TIME);
  const decision = renderReleaseDecision(payload);
  return deepFreeze({ ready: true, payload, decision });
}
