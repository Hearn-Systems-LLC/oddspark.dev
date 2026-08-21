// Minimal retention-expiry semantics (AD-12 / Story 1.21 shape), scoped to
// what runtime assembly needs: local public artifacts live exactly 30 days
// after commit; domain-scoped artifacts are readable only during the first
// hour after authoritative commit. Pure predicates over safe-integer millis.

export const LOCAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const DOMAIN_RESULT_TTL_MS = 60 * 60 * 1000;

function requireInstant(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a safe non-negative integer millisecond instant`);
  return value;
}

// Live strictly before the 30-day boundary; at or after it the artifact is gone.
export function localArtifactLive(committedAtMs, nowMs) {
  requireInstant(committedAtMs, "committedAtMs");
  requireInstant(nowMs, "nowMs");
  return nowMs - committedAtMs < LOCAL_RETENTION_MS;
}

// Readable strictly before the one-hour boundary; at or after it the domain
// result is no longer eligible.
export function domainArtifactReadable(committedAtMs, nowMs) {
  requireInstant(committedAtMs, "committedAtMs");
  requireInstant(nowMs, "nowMs");
  return nowMs - committedAtMs < DOMAIN_RESULT_TTL_MS;
}
