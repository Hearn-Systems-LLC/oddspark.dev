import { ARTIFACT_VERSION, buildCommittedBrief } from "./contracts.mjs";

const OWNER = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const LEGACY_ID = /^(?:[0-9a-f]{8}|p-[0-9a-f]{16})$/;

const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const keysAre = (value, required, optional = []) => plain(value)
  && required.every((key) => Object.hasOwn(value, key))
  && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
const text = (value) => typeof value === "string" && value.trim() === value && value.length > 0;
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const nonnegativeSafeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

function cloneJson(value) {
  try {
    const seen = new Set();
    const visit = (entry) => {
      if (entry === null || typeof entry === "string" || typeof entry === "boolean") return;
      if (typeof entry === "number") { if (!Number.isFinite(entry)) throw new TypeError("non-json number"); return; }
      if (!plain(entry) && !Array.isArray(entry)) throw new TypeError("non-json object");
      if (seen.has(entry) || Object.getOwnPropertySymbols(entry).length) throw new TypeError("hostile object");
      seen.add(entry);
      if (Array.isArray(entry)) {
        if (Object.keys(entry).length !== entry.length) throw new TypeError("hostile array");
        entry.forEach(visit);
      } else Object.keys(entry).forEach((key) => visit(entry[key]));
      seen.delete(entry);
    };
    visit(value);
    return structuredClone(value);
  } catch { return null; }
}

export function defensiveFreeze(value) {
  const copy = cloneJson(value);
  if (copy === null) return null;
  const freeze = (entry) => {
    if (entry && typeof entry === "object" && !Object.isFrozen(entry)) {
      Object.values(entry).forEach(freeze); Object.freeze(entry);
    }
    return entry;
  };
  return freeze(copy);
}

export function parseRequestScope(value) {
  if (!plain(value)) return null;
  if (value.kind === "local" && keysAre(value, ["kind", "round"]) && Number.isSafeInteger(value.round) && value.round >= 0) {
    return defensiveFreeze({ kind: "local", round: value.round });
  }
  if (value.kind === "domain" && keysAre(value, ["kind", "round", "domain"]) && Number.isSafeInteger(value.round)
      && value.round >= 0 && DOMAIN.test(value.domain)) {
    return defensiveFreeze({ kind: "domain", round: value.round, domain: value.domain });
  }
  return null;
}

export function canonicalScopeKey(value) {
  const scope = parseRequestScope(value);
  if (!scope) return null;
  return scope.kind === "local" ? `local:${scope.round}` : `domain:${scope.round}:${scope.domain}`;
}

function validLegacySpark(value) {
  if (!keysAre(value, ["id", "struck", "idea", "seed", "window", "entropy", "solar", "model", "generated"], ["personalization"])) return false;
  if (!LEGACY_ID.test(value.id) || !text(value.struck) || !text(value.model) || typeof value.generated !== "boolean") return false;
  if (!keysAre(value.idea, ["headline", "premise", "question"]) || !Object.values(value.idea).every(text)) return false;
  if (!keysAre(value.seed, ["domain", "lens", "form", "friction", "hash", "preimage"]) || !Object.values(value.seed).every(text)) return false;
  if (!keysAre(value.window, ["round", "rounds", "seconds"]) || !Object.values(value.window).every(nonnegativeSafeInteger)) return false;
  if (!keysAre(value.entropy, ["source", "round", "signature", "randomness", "verify"]) || !text(value.entropy.source)
      || !nonnegativeSafeInteger(value.entropy.round) || !text(value.entropy.signature) || !text(value.entropy.randomness) || !text(value.entropy.verify)) return false;
  if (!keysAre(value.solar, ["source", "band", "satellite", "flux", "class", "letter", "time_tag", "verify"])
      || !nonnegativeSafeInteger(value.solar.satellite) || !finite(value.solar.flux) || value.solar.flux < 0
      || !["source", "band", "class", "letter", "time_tag", "verify"].every((key) => text(value.solar[key]))) return false;
  if (value.personalization === undefined) return /^[0-9a-f]{8}$/.test(value.id);
  const p = value.personalization;
  if (!plain(p) || p.version !== 1 || !["personalized", "unavailable", "limited"].includes(p.status)) return false;
  if (p.status === "personalized") {
    if (!keysAre(p, ["version", "status", "domain", "scan_time", "scanned_urls", "vertical", "clarity", "observation", "what", "profile_hash", "warning"])) return false;
    if (!/^p-[0-9a-f]{16}$/.test(value.id) || !DOMAIN.test(p.domain) || !text(p.scan_time) || !Array.isArray(p.scanned_urls) || !p.scanned_urls.length || !p.scanned_urls.every(text)
      || !text(p.vertical) || !["clear", "unclear"].includes(p.clarity) || !keysAre(p.observation, ["url", "text"]) || !text(p.observation.url) || !text(p.observation.text)
      || !keysAre(p.what, ["seeded", "adapted"]) || !text(p.what.seeded) || !text(p.what.adapted) || !/^[a-f0-9]{64}$/.test(p.profile_hash)
      || !(p.warning === null || text(p.warning))) return false;
  } else if (!keysAre(p, ["version", "status", "warning", "domain"]) || !DOMAIN.test(p.domain) || !text(p.warning)) return false;
  return true;
}

function artifactMatchesScope(artifact, kind, scope) {
  if (kind === "committed_brief") return artifact.request_scope === scope.kind;
  if (artifact.window.round !== scope.round) return false;
  if (kind === "legacy_local") return scope.kind === "local";
  if (scope.kind !== "domain") return false;
  return artifact.personalization.domain === scope.domain;
}

export function classifyCompatibleArtifact(input) {
  const value = cloneJson(input);
  if (value === null || !plain(value)) return defensiveFreeze({ status: "miss", reason: "malformed" });
  if (Object.hasOwn(value, "artifact_version")) {
    if (value.artifact_version !== ARTIFACT_VERSION) return defensiveFreeze({ status: "unsupported", artifact_version: value.artifact_version });
    try { return defensiveFreeze({ status: "supported", kind: "committed_brief", value: buildCommittedBrief(value) }); }
    catch { return defensiveFreeze({ status: "miss", reason: "malformed" }); }
  }
  if (validLegacySpark(value)) {
    const kind = value.personalization?.status === "personalized" ? "legacy_personalized"
      : value.personalization ? "legacy_fallback" : "legacy_local";
    return defensiveFreeze({ status: "supported", kind, value });
  }
  return defensiveFreeze({ status: "miss", reason: "unrecognized" });
}

export const readCompatibleArtifact = classifyCompatibleArtifact;

export function validateCommitPayload(input) {
  if (!keysAre(input, ["scope", "owner", "artifact"])) return null;
  const scope = parseRequestScope(input.scope);
  const artifact = classifyCompatibleArtifact(input.artifact);
  if (!scope || !OWNER.test(input.owner || "") || artifact.status !== "supported") return null;
  if (!artifactMatchesScope(artifact.value, artifact.kind, scope)) return null;
  if (artifact.value.id && input.artifact.id !== artifact.value.id) return null;
  return defensiveFreeze({ scope, owner: input.owner, artifact: artifact.value, artifact_kind: artifact.kind });
}

export function parseReceipt(input, expectedScope) {
  if (!keysAre(input, ["status", "scope", "artifact", "artifact_kind", "committed_at"]) || input.status !== "committed") return null;
  const scope = parseRequestScope(input.scope);
  const expected = expectedScope === undefined ? scope : parseRequestScope(expectedScope);
  const artifact = classifyCompatibleArtifact(input.artifact);
  if (!scope || !expected || canonicalScopeKey(scope) !== canonicalScopeKey(expected) || artifact.status !== "supported"
      || artifact.kind !== input.artifact_kind || !nonnegativeSafeInteger(input.committed_at)) return null;
  if (!artifactMatchesScope(artifact.value, artifact.kind, scope)) return null;
  return defensiveFreeze({ status: "committed", scope, artifact: artifact.value, artifact_kind: artifact.kind, committed_at: input.committed_at });
}

export const parseCommittedReceipt = parseReceipt;
