// Canonical local-priors validation, identity, and projection. Runtime-neutral:
// the Node fs loaders and CLI stay in scripts/local-priors.mjs.

import { domainSeparatedHash, encodeCanonicalJson } from "./contracts.mjs";

// The pinned local-priors canonical-JSON error flavor is the contracts strict
// encoder; there is no second canonicalization algorithm.
export const canonicalJson = encodeCanonicalJson;

const SEASONS = ["winter", "spring", "summer", "fall"];
const REQUIRED_CATEGORIES = ["software", "ai_automation", "integrations", "data_workflows", "online_opportunities", "adjacent_digital_systems"];
const PROHIBITED_CLAIM_CLASSES = [
  "business-specific facts or performance claims",
  "personally identifiable information",
  "reviews, cookies, sessions, or inferred visitor behavior",
  "off-site research or unsupported local assertions",
  "weather forecasts, events, or changing business facts",
  "numeric outcomes, pricing, or return-on-investment claims",
];

function issue(artifact, rule, message, location = null) {
  return { artifact, rule, message, location };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPlainObject(value) {
  if (!isObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonblank(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isTrimmedNonblank(value) {
  return isNonblank(value) && value === value.trim();
}

function exactKeys(value, expected, artifact, location, issues) {
  if (!isPlainObject(value)) {
    issues.push(issue(artifact, "object", `${location} must be a plain object`, location));
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join("\0") !== wanted.join("\0")) {
    const missing = wanted.filter((key) => !actual.includes(key));
    const unknown = actual.filter((key) => !wanted.includes(key));
    issues.push(issue(artifact, "closed_schema", `${location} keys differ; missing=[${missing.join(", ")}], unknown=[${unknown.join(", ")}]`, location));
    return false;
  }
  return true;
}

function stringArray(value, artifact, location, issues, { min = 1, unique = false, trimmed = false } = {}) {
  const validString = trimmed ? isTrimmedNonblank : isNonblank;
  if (!Array.isArray(value) || value.length < min || value.some((entry) => !validString(entry))) {
    issues.push(issue(artifact, trimmed ? "identifier_whitespace" : "string_array", `${location} must contain at least ${min} ${trimmed ? "trimmed " : ""}nonblank string(s)`, location));
    return false;
  }
  if (unique && new Set(value).size !== value.length) issues.push(issue(artifact, "duplicate_value", `${location} must contain unique values`, location));
  return true;
}

export function domainHash(domain, value) {
  return domainSeparatedHash("oddspark.local-priors.v1", domain, value);
}

export function contentIdentity(priors) {
  return domainHash("catalog", priors);
}

export function approvalIdentity({ catalog_version, content_hash, approver, approved_at }) {
  return domainHash("approval", { catalog_version, content_hash, approver, approved_at });
}

export function validatePriors(priors) {
  const issues = [];
  try {
    canonicalJson(priors);
  } catch (error) {
    issues.push(issue("priors", error.rule ?? "non_json_value", error.message));
    return { valid: false, issues };
  }
  if (!exactKeys(priors, ["schema_version", "catalog_version", "authority", "region", "seasons", "capability_bundles", "situations", "prohibited_claim_classes"], "priors", "priors", issues)) return { valid: false, issues };
  if (priors.schema_version !== 1 || priors.catalog_version !== 1) issues.push(issue("priors", "version", "priors must use schema and catalog version 1"));
  if (exactKeys(priors.authority, ["author", "owner", "status", "production_authorized"], "priors", "authority", issues)) {
    if (priors.authority.author !== "developer" || priors.authority.owner !== "Justin" || priors.authority.status !== "pending_owner_approval" || priors.authority.production_authorized !== false) issues.push(issue("priors", "authority", "catalog authority must remain developer-authored, pending, and non-production"));
  }
  if (exactKeys(priors.region, ["id", "name", "framing"], "priors", "region", issues)) {
    if (priors.region.id !== "port-huron-blue-water-area" || priors.region.name !== "Port Huron / Blue Water Area" || !isNonblank(priors.region.framing)) issues.push(issue("priors", "region", "region must be the fixed Port Huron / Blue Water Area framing"));
  }

  const seasonIds = [];
  const coveredMonths = [];
  if (!Array.isArray(priors.seasons) || priors.seasons.length !== 4) issues.push(issue("priors", "season_count", "seasons must contain exactly four entries"));
  else priors.seasons.forEach((season, index) => {
    const location = `seasons[${index}]`;
    if (!exactKeys(season, ["id", "months", "cues"], "priors", location, issues)) return;
    if (!isTrimmedNonblank(season.id)) issues.push(issue("priors", "identifier_whitespace", `${location}.id must be a trimmed nonblank identifier`, location));
    seasonIds.push(season.id);
    if (!Array.isArray(season.months) || season.months.length !== 3 || season.months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) issues.push(issue("priors", "season_months", `${location}.months must contain three calendar months`, location));
    else coveredMonths.push(...season.months);
    stringArray(season.cues, "priors", `${location}.cues`, issues, { min: 1 });
  });
  if (canonicalJson(seasonIds) !== canonicalJson(SEASONS)) issues.push(issue("priors", "season_ids", "season ids must be winter, spring, summer, fall in order"));
  if (canonicalJson([...coveredMonths].sort((a, b) => a - b)) !== canonicalJson([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])) issues.push(issue("priors", "season_coverage", "every calendar month must map to exactly one season"));

  const bundleIds = new Set();
  const coveredCategories = new Set();
  if (!Array.isArray(priors.capability_bundles) || priors.capability_bundles.length === 0) issues.push(issue("priors", "capability_bundles", "capability_bundles must be a nonempty array"));
  else priors.capability_bundles.forEach((bundle, index) => {
    const location = `capability_bundles[${index}]`;
    if (!exactKeys(bundle, ["id", "name", "categories", "capabilities"], "priors", location, issues)) return;
    if (!isTrimmedNonblank(bundle.id)) issues.push(issue("priors", "identifier_whitespace", `${location}.id must be a trimmed nonblank identifier`, location));
    else if (bundleIds.has(bundle.id)) issues.push(issue("priors", "duplicate_id", `${location}.id must be unique`, location));
    else bundleIds.add(bundle.id);
    if (!isNonblank(bundle.name)) issues.push(issue("priors", "bundle_name", `${location}.name must be nonblank`, location));
    if (stringArray(bundle.categories, "priors", `${location}.categories`, issues, { unique: true, trimmed: true })) bundle.categories.forEach((category) => {
      if (!REQUIRED_CATEGORIES.includes(category)) issues.push(issue("priors", "unknown_category", `unknown delivery category: ${category}`, location));
      else coveredCategories.add(category);
    });
    stringArray(bundle.capabilities, "priors", `${location}.capabilities`, issues, { min: 1, unique: true });
  });
  for (const category of REQUIRED_CATEGORIES) if (!coveredCategories.has(category)) issues.push(issue("priors", "category_coverage", `missing required delivery category: ${category}`));

  const situationIds = new Set();
  if (!Array.isArray(priors.situations) || priors.situations.length < 3) issues.push(issue("priors", "situations", "situations must contain multiple recognizable small-business situations"));
  else priors.situations.forEach((situation, index) => {
    const location = `situations[${index}]`;
    if (!exactKeys(situation, ["id", "description", "compatible_capability_bundle_ids", "preservation"], "priors", location, issues)) return;
    if (!isTrimmedNonblank(situation.id)) issues.push(issue("priors", "identifier_whitespace", `${location}.id must be a trimmed nonblank identifier`, location));
    else if (situationIds.has(situation.id)) issues.push(issue("priors", "duplicate_id", `${location}.id must be unique`, location));
    else situationIds.add(situation.id);
    if (!isNonblank(situation.description)) issues.push(issue("priors", "situation_description", `${location}.description must be nonblank`, location));
    if (stringArray(situation.compatible_capability_bundle_ids, "priors", `${location}.compatible_capability_bundle_ids`, issues, { unique: true, trimmed: true })) {
      for (const id of situation.compatible_capability_bundle_ids) if (!bundleIds.has(id)) issues.push(issue("priors", "dangling_bundle", `${location} references unknown bundle ${id}`, location));
    }
    if (exactKeys(situation.preservation, ["tools", "decision_authority", "untouched_steps"], "priors", `${location}.preservation`, issues)) {
      for (const key of ["tools", "decision_authority", "untouched_steps"]) if (!isNonblank(situation.preservation[key])) issues.push(issue("priors", "preservation", `${location}.preservation.${key} must be nonblank`, location));
    }
  });
  if (canonicalJson(priors.prohibited_claim_classes) !== canonicalJson(PROHIBITED_CLAIM_CLASSES)) issues.push(issue("priors", "prohibited_claim_classes", "prohibited_claim_classes must equal the six canonical local-claim restrictions"));
  return { valid: issues.length === 0, issues };
}

export function resolveSeason(date, priors) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError("date must be a valid ISO calendar date (YYYY-MM-DD)");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) throw new TypeError("date must be a valid ISO calendar date (YYYY-MM-DD)");
  const month = parsed.getUTCMonth() + 1;
  const matches = Array.isArray(priors?.seasons) ? priors.seasons.filter((season) => Array.isArray(season?.months) && season.months.includes(month)) : [];
  if (matches.length !== 1) throw new TypeError(`date month must resolve to exactly one season; found ${matches.length}`);
  return matches[0];
}

export function projectLocalPrior(priors, options) {
  if (!isPlainObject(options)) throw new TypeError("projection options must be a plain object");
  const { date, situation_id, capability_bundle_id } = options;
  const validation = validatePriors(priors);
  if (!validation.valid) throw new TypeError("cannot project an invalid priors catalog");
  const season = resolveSeason(date, priors);
  const situation = priors.situations.find((entry) => entry.id === situation_id);
  if (!situation) throw new TypeError(`unknown situation: ${situation_id}`);
  const bundle = priors.capability_bundles.find((entry) => entry.id === capability_bundle_id);
  if (!bundle) throw new TypeError(`unknown capability bundle: ${capability_bundle_id}`);
  if (!situation.compatible_capability_bundle_ids.includes(bundle.id)) throw new TypeError(`capability bundle ${bundle.id} is incompatible with situation ${situation.id}`);
  return {
    mode: "local",
    priors: {
      region: priors.region.name,
      season: `${season.id}: ${season.cues.join(" ")}`,
      date,
      situation: situation.description,
      capability_bundle: [...bundle.capabilities],
    },
  };
}

export function verifyApproval(priors, approval, options = {}) {
  const issues = [];
  const priorValidation = validatePriors(priors);
  if (!priorValidation.valid) return { approved: false, status: "invalid", issues: priorValidation.issues };
  try {
    canonicalJson(approval);
  } catch (error) {
    issues.push(issue("approval", error.rule ?? "non_json_value", error.message));
    return { approved: false, status: "invalid", issues };
  }
  const now = isPlainObject(options) && Object.hasOwn(options, "now") ? options.now : new Date();
  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) issues.push(issue("approval", "clock", "now must be a valid Date"));
  if (!exactKeys(approval, ["schema_version", "catalog_version", "status", "approver", "content_hash", "identity", "approved_at"], "approval", "approval", issues)) return { approved: false, status: "invalid", issues };
  if (approval.schema_version !== 1) issues.push(issue("approval", "version", "approval schema_version must equal 1"));
  if (approval.status === "pending_owner_approval") {
    if (approval.catalog_version !== priors?.catalog_version || approval.approver !== null || approval.content_hash !== null || approval.identity !== null || approval.approved_at !== null) issues.push(issue("approval", "pending_placeholder", "pending approval must match catalog version and contain only null approval fields"));
    return { approved: false, status: issues.length ? "invalid" : "pending_owner_approval", issues };
  }
  if (approval.status !== "approved") issues.push(issue("approval", "status", "approval status must be pending_owner_approval or approved"));
  if (approval.catalog_version !== priors?.catalog_version) issues.push(issue("approval", "catalog_version", "approval catalog version does not match content"));
  if (approval.approver !== "Justin") issues.push(issue("approval", "approver", "exact owner approval must be authored by Justin"));
  const expectedContentHash = contentIdentity(priors);
  if (approval.content_hash !== expectedContentHash) issues.push(issue("approval", "content_hash", "approval content hash does not match canonical content"));
  const timestamp = typeof approval.approved_at === "string" ? new Date(approval.approved_at) : new Date(NaN);
  if (!isNonblank(approval.approved_at) || Number.isNaN(timestamp.valueOf()) || timestamp.toISOString() !== approval.approved_at) issues.push(issue("approval", "timestamp", "approved_at must be a canonical ISO timestamp"));
  else if (now instanceof Date && !Number.isNaN(now.valueOf()) && timestamp.valueOf() > now.valueOf()) issues.push(issue("approval", "future_timestamp", "approved_at cannot be in the future"));
  if (isNonblank(approval.approver) && isNonblank(approval.approved_at) && typeof approval.catalog_version === "number" && isNonblank(approval.content_hash)) {
    const expectedIdentity = approvalIdentity(approval);
    if (approval.identity !== expectedIdentity) issues.push(issue("approval", "identity", "approval identity does not match its bound fields"));
  } else if (!isNonblank(approval.identity)) issues.push(issue("approval", "identity", "approved record must contain an identity"));
  return { approved: issues.length === 0, status: issues.length === 0 ? "approved" : "invalid", issues };
}

export function verifyLocalPriors(priors, approval, options = {}) {
  const structure = validatePriors(priors);
  let approvalResult = { approved: false, status: "not_checked", issues: [] };
  if (structure.valid) approvalResult = verifyApproval(priors, approval, options);
  const report = {
    schema_version: 1,
    structure_valid: structure.valid,
    readiness: structure.valid ? approvalResult.status : "invalid",
    production_ready: structure.valid && approvalResult.approved,
    content_hash: structure.valid ? contentIdentity(priors) : null,
    issues: [...structure.issues, ...approvalResult.issues],
  };
  if (approvalResult.approved) report.approved_identity = approval.identity;
  return report;
}
