// Minimal retention-expiry semantics (AD-12 / Story 1.21 shape), scoped to
// what runtime assembly needs: local public artifacts live exactly 30 days
// after commit; domain-scoped artifacts are readable only during the first
// hour after authoritative commit. Pure predicates over safe-integer millis.

export const LOCAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const DOMAIN_RESULT_TTL_MS = 60 * 60 * 1000;
export const PROFILE_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ABUSE_SLOT_RETENTION_MS = 60 * 60 * 1000;
export const NEURON_RECEIPT_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

function requireInstant(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a safe non-negative integer millisecond instant`);
  return value;
}

export function addRetentionBoundary(instantMs, durationMs, name = "instantMs") {
  const instant = requireInstant(instantMs, name);
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) throw new TypeError("durationMs must be a positive safe integer");
  const boundary = instant + durationMs;
  return requireInstant(boundary, "boundaryMs");
}

export const localArtifactExpiresAt = (committedAtMs) => addRetentionBoundary(committedAtMs, LOCAL_RETENTION_MS, "committedAtMs");
export const profileExpiresAt = (createdAtMs) => addRetentionBoundary(createdAtMs, PROFILE_RETENTION_MS, "createdAtMs");
export const abuseSlotExpiresAt = (createdAtMs) => addRetentionBoundary(createdAtMs, ABUSE_SLOT_RETENTION_MS, "createdAtMs");

export function absoluteKvExpiration(expiresAtMs, nowMs) {
  const expiresAt = requireInstant(expiresAtMs, "expiresAtMs");
  const now = requireInstant(nowMs, "nowMs");
  if (now >= expiresAt) return null;
  const seconds = Math.floor(expiresAt / 1000);
  return seconds * 1000 - now >= 60 * 1000 ? seconds : null;
}

// Live strictly before the 30-day boundary; at or after it the artifact is gone.
export function localArtifactLive(committedAtMs, nowMs) {
  requireInstant(committedAtMs, "committedAtMs");
  requireInstant(nowMs, "nowMs");
  return nowMs < localArtifactExpiresAt(committedAtMs);
}

// Readable strictly before the one-hour boundary; at or after it the domain
// result is no longer eligible.
export function domainArtifactReadable(committedAtMs, nowMs) {
  requireInstant(committedAtMs, "committedAtMs");
  requireInstant(nowMs, "nowMs");
  return nowMs - committedAtMs < DOMAIN_RESULT_TTL_MS;
}
