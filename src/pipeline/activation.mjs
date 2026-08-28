// Minimal closed ProductionActivationManifest validator (AD-11 as amended by
// the approved 2026-08-24 Direct-Path Activation Authority override), scoped
// to what Story 1.23 assembles: shape, nullability, and ref derivation. A
// missing or invalid manifest disables model roles and the assembled writer;
// callers observe only the stable redacted reason code — never manifest
// internals.

import { canonicalJson, deepFreeze, sha256Hex } from "./contracts.mjs";

export const PRODUCTION_ACTIVATION_VERSION = 2;

export const ACTIVATION_REASON_CODES = deepFreeze({
  MISSING: "activation_manifest_missing",
  NOT_CLOSED: "activation_manifest_not_closed",
  VERSION: "activation_manifest_version",
  OUTCOME: "activation_manifest_outcome",
  IDENTITY: "activation_manifest_identity",
  REF_MALFORMED: "activation_manifest_ref_malformed",
  REF_NULLABILITY: "activation_manifest_ref_nullability",
  NO_MODE: "activation_manifest_no_mode",
});

const SHA256 = /^[a-f0-9]{64}$/;
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const nonblank = (value) => typeof value === "string" && value.trim() !== "";
const refOrNull = (value) => value === null || SHA256.test(value ?? "");

function closed(value, keys) {
  return isPlainObject(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

export function validateProductionActivationManifest(value) {
  const keys = [
    "version", "deployed_source_identity", "generation_ref", "judge_ref",
    "local", "domain", "house_catalog_ref", "receiver_ref", "receipt_claim_ref", "outcome",
  ];
  if (!closed(value, keys)) return { valid: false, reason: ACTIVATION_REASON_CODES.NOT_CLOSED };
  if (!Number.isInteger(value.version) || value.version !== PRODUCTION_ACTIVATION_VERSION) {
    return { valid: false, reason: ACTIVATION_REASON_CODES.VERSION };
  }
  if (value.outcome !== "active") return { valid: false, reason: ACTIVATION_REASON_CODES.OUTCOME };
  if (!nonblank(value.deployed_source_identity)) return { valid: false, reason: ACTIVATION_REASON_CODES.IDENTITY };
  if (!closed(value.local, ["enabled", "full_request_ref"]) || !closed(value.domain, ["enabled", "evidence_ref", "full_request_ref"])) {
    return { valid: false, reason: ACTIVATION_REASON_CODES.NOT_CLOSED };
  }
  if (typeof value.local.enabled !== "boolean" || typeof value.domain.enabled !== "boolean") {
    return { valid: false, reason: ACTIVATION_REASON_CODES.NOT_CLOSED };
  }
  if (!SHA256.test(value.generation_ref ?? "") || !SHA256.test(value.judge_ref ?? "")
      || !SHA256.test(value.house_catalog_ref ?? "")) {
    return { valid: false, reason: ACTIVATION_REASON_CODES.REF_MALFORMED };
  }
  if (!refOrNull(value.receiver_ref) || !refOrNull(value.receipt_claim_ref)) {
    return { valid: false, reason: ACTIVATION_REASON_CODES.REF_MALFORMED };
  }
  if (!refOrNull(value.local.full_request_ref) || !refOrNull(value.domain.evidence_ref) || !refOrNull(value.domain.full_request_ref)) {
    return { valid: false, reason: ACTIVATION_REASON_CODES.REF_MALFORMED };
  }
  // Disabled modes must carry null mode-specific refs; enabled modes require them.
  if (value.local.enabled && value.local.full_request_ref === null) return { valid: false, reason: ACTIVATION_REASON_CODES.REF_NULLABILITY };
  if (!value.local.enabled && value.local.full_request_ref !== null) return { valid: false, reason: ACTIVATION_REASON_CODES.REF_NULLABILITY };
  if (value.domain.enabled && (value.domain.evidence_ref === null || value.domain.full_request_ref === null)) {
    return { valid: false, reason: ACTIVATION_REASON_CODES.REF_NULLABILITY };
  }
  if (!value.domain.enabled && (value.domain.evidence_ref !== null || value.domain.full_request_ref !== null)) {
    return { valid: false, reason: ACTIVATION_REASON_CODES.REF_NULLABILITY };
  }
  if (!value.local.enabled && !value.domain.enabled) return { valid: false, reason: ACTIVATION_REASON_CODES.NO_MODE };
  return { valid: true, reason: null };
}

export function deriveActivationRef(manifest) {
  const validation = validateProductionActivationManifest(manifest);
  if (!validation.valid) throw new TypeError(`cannot derive an activation ref: ${validation.reason}`);
  return sha256Hex(`oddspark-production-activation/v2\n${canonicalJson(manifest)}`);
}

// The activation port. `enabled` is the only authority the writer consumes;
// `reason` is a stable redacted code safe for platform observability. The
// manifest may arrive as an object or as its JSON string (the production
// binding form for a Workers var).
export function evaluateProductionActivation(value) {
  if (value === undefined || value === null) {
    return deepFreeze({ enabled: false, reason: ACTIVATION_REASON_CODES.MISSING, activation_ref: null, manifest: null });
  }
  let manifest = value;
  if (typeof value === "string") {
    try { manifest = JSON.parse(value); } catch { manifest = undefined; }
    if (manifest === undefined) {
      return deepFreeze({ enabled: false, reason: ACTIVATION_REASON_CODES.NOT_CLOSED, activation_ref: null, manifest: null });
    }
  }
  const validation = validateProductionActivationManifest(manifest);
  if (!validation.valid) {
    return deepFreeze({ enabled: false, reason: validation.reason, activation_ref: null, manifest: null });
  }
  return deepFreeze({
    enabled: true,
    reason: null,
    activation_ref: deriveActivationRef(manifest),
    manifest: deepFreeze(structuredClone(manifest)),
  });
}
