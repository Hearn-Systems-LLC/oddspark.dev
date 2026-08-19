export const BRIEF_SCHEMA_VERSION = 1;
export const EVIDENCE_VERSION = 1;
export const GROUNDING_REPORT_VERSION = 1;
export const ARTIFACT_VERSION = 1;
export const CANDIDATE_SCHEMA_VERSION = "brief/v1";

const IDENTIFIER = /^[a-z0-9][a-z0-9._/-]*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const PRICE = /(?:[$£€]\s*\d|\b(?:price|pricing|costs?|fee|subscription|per month|per year)\b)/i;
const NUMBER = /(?<![\w.])[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?%?(?![\w.])/g;
const CANONICAL_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?(?:0|[1-9]\d*))?%?$/;
const PITCH = /\b(?:act now|book now|buy now|limited time|schedule (?:a|your) call|sales call|don't miss|last chance)\b/i;

// Synchronous SHA-256 keeps the pure contract builders usable in both plain
// Node and the Worker isolate without pulling a Node compatibility shim into
// the production bundle.
function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const k = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,
    0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,
    0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  const w = new Uint32Array(64);
  const rotr = (value, shift) => (value >>> shift) | (value << (32 - shift));
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const t1 = (hh + s1 + ((e & f) ^ (~e & g)) + k[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    h[0]=(h[0]+a)>>>0; h[1]=(h[1]+b)>>>0; h[2]=(h[2]+c)>>>0; h[3]=(h[3]+d)>>>0;
    h[4]=(h[4]+e)>>>0; h[5]=(h[5]+f)>>>0; h[6]=(h[6]+g)>>>0; h[7]=(h[7]+hh)>>>0;
  }
  return [...h].map((word) => word.toString(16).padStart(8, "0")).join("");
}

export class ContractValidationError extends TypeError {
  constructor(issues) {
    super(issues.map(({ path, message }) => `${path}: ${message}`).join("; "));
    this.name = "ContractValidationError";
    this.issues = issues;
  }
}

const issue = (path, rule, message) => ({ path, rule, message });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const nonblank = (value) => typeof value === "string" && value.trim() !== "" && value === value.trim();

function closed(value, required, optional, path, issues) {
  if (!isObject(value)) { issues.push(issue(path, "object", "must be a plain object")); return false; }
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (missing.length || unknown.length) {
    issues.push(issue(path, "closed_schema", `keys differ; missing=[${missing.join(", ")}], unknown=[${unknown.join(", ")}]`));
    return false;
  }
  return true;
}

function string(value, path, issues) {
  if (!nonblank(value)) issues.push(issue(path, "nonblank_string", "must be a trimmed nonblank string"));
}

function strings(value, path, issues, { allowEmpty = false, unique = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    issues.push(issue(path, "string_array", `must be ${allowEmpty ? "an" : "a non-empty"} array of strings`)); return;
  }
  value.forEach((entry, index) => string(entry, `${path}[${index}]`, issues));
  if (unique && new Set(value).size !== value.length) issues.push(issue(path, "duplicate", "must not contain duplicates"));
}

function jsonCheck(value, path, issues, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") { if (!Number.isFinite(value)) issues.push(issue(path, "non_json_value", "must contain finite JSON numbers")); return; }
  if (typeof value !== "object") { issues.push(issue(path, "non_json_value", `must not contain ${typeof value}`)); return; }
  if (seen.has(value)) { issues.push(issue(path, "non_json_value", "must not contain cycles")); return; }
  if (!Array.isArray(value) && !isObject(value)) { issues.push(issue(path, "non_json_value", "must contain only plain objects")); return; }
  if (Object.getOwnPropertySymbols(value).length) { issues.push(issue(path, "non_json_value", "must not contain symbol keys")); return; }
  seen.add(value);
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length || value.some((_, index) => !Object.hasOwn(value, index))) issues.push(issue(path, "non_json_value", "must not contain sparse or supplemented arrays"));
    value.forEach((entry, index) => jsonCheck(entry, `${path}[${index}]`, issues, seen));
  } else Object.keys(value).forEach((key) => jsonCheck(value[key], `${path}.${key}`, issues, seen));
  seen.delete(value);
}

export function canonicalJson(value) {
  const issues = []; jsonCheck(value, "value", issues);
  if (issues.length) throw new ContractValidationError(issues);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value); Object.values(value).forEach((entry) => deepFreeze(entry, seen));
  return Object.freeze(value);
}

const result = (issues) => ({ valid: issues.length === 0, issues });
function build(value, validator) {
  const validation = validator(value); if (!validation.valid) throw new ContractValidationError(validation.issues);
  return deepFreeze(structuredClone(value));
}

export function validateBrief(value) {
  const issues = []; jsonCheck(value, "brief", issues);
  if (issues.length) return result(issues);
  const required = ["version", "mode", "title", "plan", "why_fits", "what_gets_better", "before_after", "change_level", "stays_same", "invitation", "grounded_numbers"];
  if (!closed(value, required, ["notice"], "brief", issues)) return result(issues);
  if (value.version !== BRIEF_SCHEMA_VERSION) issues.push(issue("brief.version", "unsupported_version", `must equal ${BRIEF_SCHEMA_VERSION}`));
  if (!["local", "domain"].includes(value.mode)) issues.push(issue("brief.mode", "tag", "must be local or domain"));
  ["title", "plan", "what_gets_better", "invitation"].forEach((key) => string(value[key], `brief.${key}`, issues));
  if (Object.hasOwn(value, "notice")) string(value.notice, "brief.notice", issues);
  if (closed(value.why_fits, ["text"], ["breadcrumb"], "brief.why_fits", issues)) {
    string(value.why_fits.text, "brief.why_fits.text", issues);
    if (value.mode === "domain" && !Object.hasOwn(value.why_fits, "breadcrumb")) issues.push(issue("brief.why_fits.breadcrumb", "cardinality", "is required exactly once in domain mode"));
    if (value.mode === "local" && Object.hasOwn(value.why_fits, "breadcrumb")) issues.push(issue("brief.why_fits.breadcrumb", "cardinality", "is forbidden in local mode"));
    if (Object.hasOwn(value.why_fits, "breadcrumb")) string(value.why_fits.breadcrumb, "brief.why_fits.breadcrumb", issues);
  }
  if (closed(value.before_after, ["before", "after"], [], "brief.before_after", issues)) ["before", "after"].forEach((key) => string(value.before_after[key], `brief.before_after.${key}`, issues));
  if (closed(value.change_level, ["time_range", "steps_changed", "steps_removed", "preliminary"], [], "brief.change_level", issues)) {
    string(value.change_level.time_range, "brief.change_level.time_range", issues);
    for (const key of ["steps_changed", "steps_removed"]) if (!Number.isInteger(value.change_level[key]) || value.change_level[key] < 0) issues.push(issue(`brief.change_level.${key}`, "integer", "must be a non-negative integer"));
    if (value.change_level.preliminary !== true) issues.push(issue("brief.change_level.preliminary", "literal", "must be true"));
  }
  if (closed(value.stays_same, ["tools", "authority", "steps"], [], "brief.stays_same", issues)) for (const key of ["tools", "authority", "steps"]) strings(value.stays_same[key], `brief.stays_same.${key}`, issues, { unique: true });
  strings(value.grounded_numbers, "brief.grounded_numbers", issues, { allowEmpty: true, unique: true });
  if (Array.isArray(value.grounded_numbers)) value.grounded_numbers.forEach((token, index) => {
    if (!CANONICAL_NUMBER.test(token)) issues.push(issue(`brief.grounded_numbers[${index}]`, "canonical_number", "must be a canonical numeric token"));
  });
  const text = collectStrings(value).join(" ");
  if (PRICE.test(text)) issues.push(issue("brief", "pricing", "pricing is forbidden"));
  if (!/\bSpark\b/.test(value.invitation ?? "") || !/not worth changing/i.test(value.invitation ?? "") || PITCH.test(value.invitation ?? "")) issues.push(issue("brief.invitation", "invitation", "must name the Spark, permit 'not worth changing', and avoid pitch language"));
  if (value.mode === "local") {
    if (value.grounded_numbers?.length) issues.push(issue("brief.grounded_numbers", "local_qualitative", "must be empty in local mode"));
    const qualitative = collectStrings({ ...value, change_level: null }).flatMap(numberTokens);
    if (qualitative.length) issues.push(issue("brief", "local_qualitative", "local narrative claims must be qualitative"));
  }
  if (value.mode === "domain") {
    const outside = collectStrings({ ...value, grounded_numbers: [], change_level: null }).join(" ");
    for (const token of numberTokens(outside)) if (!value.grounded_numbers?.includes(token)) issues.push(issue("brief.grounded_numbers", "number_provenance", `numeric token ${token} is not declared exactly`));
  }
  return result(issues);
}

function numberTokens(text) {
  return typeof text === "string" ? [...text.matchAll(NUMBER)].map((match) => match[0]) : [];
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectStrings);
}

export const buildBrief = (value) => build(value, validateBrief);
export const validateCandidate = validateBrief;
export const buildCandidate = buildBrief;

export function deriveCandidateRef(candidateSchemaVersion, candidate) {
  if (!IDENTIFIER.test(candidateSchemaVersion ?? "")) throw new ContractValidationError([issue("candidate_schema_version", "identifier", "must be a lowercase canonical identifier")]);
  const validation = validateCandidate(candidate); if (!validation.valid) throw new ContractValidationError(validation.issues);
  return sha256Hex(`oddspark-candidate-ref/v1\n${canonicalJson({ candidate_schema_version: candidateSchemaVersion, candidate })}`);
}

export function validateEvidence(value) {
  const issues = []; jsonCheck(value, "evidence", issues);
  if (issues.length) return result(issues);
  if (!isObject(value)) { issues.push(issue("evidence", "object", "must be a plain object")); return result(issues); }
  if (value.mode === "local") {
    if (closed(value, ["version", "mode", "priors"], [], "evidence", issues)) {
      if (value.version !== EVIDENCE_VERSION) issues.push(issue("evidence.version", "unsupported_version", `must equal ${EVIDENCE_VERSION}`));
      if (closed(value.priors, ["region", "season", "date", "situation", "capability_bundle"], [], "evidence.priors", issues)) {
        ["region", "season", "date", "situation"].forEach((key) => string(value.priors[key], `evidence.priors.${key}`, issues)); strings(value.priors.capability_bundle, "evidence.priors.capability_bundle", issues, { unique: true });
      }
    }
  } else if (value.mode === "domain") {
    if (closed(value, ["version", "mode", "vertical", "clarity", "capabilities", "channels", "observation", "scanned_urls"], [], "evidence", issues)) {
      if (value.version !== EVIDENCE_VERSION) issues.push(issue("evidence.version", "unsupported_version", `must equal ${EVIDENCE_VERSION}`));
      string(value.vertical, "evidence.vertical", issues); if (!["clear", "unclear"].includes(value.clarity)) issues.push(issue("evidence.clarity", "enum", "must be clear or unclear"));
      strings(value.capabilities, "evidence.capabilities", issues, { unique: true }); strings(value.channels, "evidence.channels", issues, { allowEmpty: true, unique: true }); strings(value.scanned_urls, "evidence.scanned_urls", issues, { unique: true });
      if (closed(value.observation, ["source_id", "url", "text"], [], "evidence.observation", issues)) ["source_id", "url", "text"].forEach((key) => string(value.observation[key], `evidence.observation.${key}`, issues));
    }
  } else issues.push(issue("evidence.mode", "tag", "must be local or domain"));
  return result(issues);
}

export const buildEvidence = (value) => build(value, validateEvidence);
export function deriveEvidenceRef(evidence) {
  const validation = validateEvidence(evidence); if (!validation.valid) throw new ContractValidationError(validation.issues);
  return sha256Hex(`oddspark-evidence-ref/v1\n${canonicalJson(evidence)}`);
}

export function validateEvidenceContext(value) {
  const issues = []; jsonCheck(value, "evidence_context", issues); if (issues.length) return result(issues); if (!closed(value, ["attempt_id", "evidence", "rubric_version"], [], "evidence_context", issues)) return result(issues);
  string(value.attempt_id, "evidence_context.attempt_id", issues); string(value.rubric_version, "evidence_context.rubric_version", issues); issues.push(...validateEvidence(value.evidence).issues.map((entry) => ({ ...entry, path: `evidence_context.${entry.path}` })));
  return result(issues);
}
export const buildEvidenceContext = (value) => build(value, validateEvidenceContext);

export function personalNamePolicy(text) {
  if (!nonblank(text)) return deepFreeze({ status: "unknown", reason: "name-policy/v1:input-not-plain-text" });
  const policyText = text.replace(/\bSpark\b/g, "spark");
  const nameWord = String.raw`(?:[\p{Lu}][\p{Ll}\p{M}]+(?:-[\p{Lu}]?[\p{Ll}\p{M}]+)*(?:['’][\p{Lu}]?[\p{Ll}\p{M}]+)*|[\p{Lu}]['’][\p{Lu}][\p{Ll}\p{M}]+)`;
  const fullName = new RegExp(`(?:^|[^\\p{L}])(${nameWord})\\s+(${nameWord})(?=$|[^\\p{L}])`, "u").exec(policyText);
  const titledName = new RegExp(`\\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\\.?\\s+${nameWord}(?=$|[^\\p{L}])`, "u");
  const sentenceLead = fullName && /^(?:Ask|The|This|That|These|Those|Our|Your|Their|We|They|It|A|An)$/u.test(fullName[1]);
  if ((fullName && !sentenceLead) || titledName.test(policyText)) return deepFreeze({ status: "fail", reason: "name-policy/v1:personal-name-detected" });
  if (/(?:^|[^\p{L}])\p{Lu}{2,}(?:[-'’]\p{Lu}+)*(?=$|[^\p{L}])/u.test(policyText)) return deepFreeze({ status: "unknown", reason: "name-policy/v1:ambiguous-all-caps-token" });
  const words = policyText.match(new RegExp(`(?:^|[^\\p{L}])(${nameWord})(?=$|[^\\p{L}])`, "gu")) ?? [];
  const sentenceStarts = policyText.match(new RegExp(`(?:^|[.!?]\\s+)${nameWord}(?=$|[^\\p{L}])`, "gu"))?.length ?? 0;
  if (words.length > sentenceStarts) return deepFreeze({ status: "unknown", reason: "name-policy/v1:ambiguous-capitalized-token" });
  return deepFreeze({ status: "pass", reason: "name-policy/v1:no-personal-name-signal" });
}
export const evaluatePersonalName = personalNamePolicy;

export function requiredGroundingClaimRefs(brief) {
  const validation = validateBrief(brief); if (!validation.valid) throw new ContractValidationError(validation.issues);
  if (brief.mode === "local") return deepFreeze([]);
  return deepFreeze([
    "brief.title", "brief.plan", "brief.why_fits.text", "brief.why_fits.breadcrumb", "brief.what_gets_better",
    "brief.before_after.before", "brief.before_after.after", "brief.change_level.time_range",
    ...brief.stays_same.tools.map((_, index) => `brief.stays_same.tools[${index}]`),
    ...brief.stays_same.authority.map((_, index) => `brief.stays_same.authority[${index}]`),
    ...brief.stays_same.steps.map((_, index) => `brief.stays_same.steps[${index}]`),
    "brief.invitation", ...(Object.hasOwn(brief, "notice") ? ["brief.notice"] : []),
    ...brief.grounded_numbers.map((_, index) => `brief.grounded_numbers[${index}]`),
  ]);
}

function groundingClaims(brief) {
  const claims = new Map([
    ["brief.title", brief.title], ["brief.plan", brief.plan], ["brief.why_fits.text", brief.why_fits.text],
    ["brief.why_fits.breadcrumb", brief.why_fits.breadcrumb], ["brief.what_gets_better", brief.what_gets_better],
    ["brief.before_after.before", brief.before_after.before], ["brief.before_after.after", brief.before_after.after],
    ["brief.change_level.time_range", brief.change_level.time_range], ["brief.invitation", brief.invitation],
  ]);
  for (const key of ["tools", "authority", "steps"]) brief.stays_same[key].forEach((text, index) => claims.set(`brief.stays_same.${key}[${index}]`, text));
  if (Object.hasOwn(brief, "notice")) claims.set("brief.notice", brief.notice);
  brief.grounded_numbers.forEach((text, index) => claims.set(`brief.grounded_numbers[${index}]`, text));
  return claims;
}

export function validateGroundingReport(value, { brief, evidence } = {}) {
  const issues = []; jsonCheck(value, "grounding_report", issues); if (issues.length) return result(issues); if (!closed(value, ["version", "evidence_ref", "entries", "pass"], [], "grounding_report", issues)) return result(issues);
  if (value.version !== GROUNDING_REPORT_VERSION) issues.push(issue("grounding_report.version", "unsupported_version", `must equal ${GROUNDING_REPORT_VERSION}`));
  if (!SHA256.test(value.evidence_ref ?? "")) issues.push(issue("grounding_report.evidence_ref", "sha256", "must be a lowercase SHA-256"));
  if (typeof value.pass !== "boolean") issues.push(issue("grounding_report.pass", "boolean", "must be a boolean"));
  if (!Array.isArray(value.entries)) issues.push(issue("grounding_report.entries", "array", "must be an array")); else value.entries.forEach((entry, index) => {
    const path = `grounding_report.entries[${index}]`; if (!closed(entry, ["claim_ref", "source_url", "source_text", "exact_match", "pii_status", "number_status", "reason"], [], path, issues)) return;
    ["claim_ref", "source_url", "source_text", "reason"].forEach((key) => string(entry[key], `${path}.${key}`, issues)); if (typeof entry.exact_match !== "boolean") issues.push(issue(`${path}.exact_match`, "boolean", "must be a boolean"));
    if (!["pass", "fail", "unknown"].includes(entry.pii_status)) issues.push(issue(`${path}.pii_status`, "enum", "must be pass, fail, or unknown")); if (!["pass", "fail", "not_applicable"].includes(entry.number_status)) issues.push(issue(`${path}.number_status`, "enum", "must be pass, fail, or not_applicable"));
  });
  let evidenceValid = false; if (evidence) { const validation = validateEvidence(evidence); issues.push(...validation.issues); evidenceValid = validation.valid; if (validation.valid && value.evidence_ref !== deriveEvidenceRef(evidence)) issues.push(issue("grounding_report.evidence_ref", "linkage", "does not match evidence")); }
  const coverage = [];
  if (brief && Array.isArray(value.entries)) {
    let refs = []; let claims = new Map(); try { refs = requiredGroundingClaimRefs(brief); claims = groundingClaims(brief); } catch (error) { issues.push(...error.issues); }
    if (brief.mode === "local" && value.entries.length !== 0) issues.push(issue("grounding_report.entries", "local_cardinality", "local reports must contain zero scan-grounding entries"));
    for (const ref of refs) {
      const matches = value.entries.filter((entry) => entry?.claim_ref === ref);
      if (matches.length !== 1) { coverage.push(issue("grounding_report.entries", "coverage", `${ref} must have exactly one entry`)); continue; }
      const entry = matches[0]; const path = `grounding_report.entries.${ref}`; const claimText = claims.get(ref); const numeric = ref.startsWith("brief.grounded_numbers");
      if (typeof entry.source_text !== "string" || !entry.source_text.includes(claimText)) coverage.push(issue(`${path}.source_text`, "claim_text", "must contain the actual Brief claim text"));
      if (ref === "brief.why_fits.breadcrumb" && typeof entry.source_text === "string" && !entry.source_text.includes(brief.why_fits.breadcrumb)) coverage.push(issue(`${path}.source_text`, "breadcrumb", "must contain the exact Breadcrumb"));
      if (evidenceValid && evidence.mode === "domain") {
        if (!evidence.observation.text.includes(entry.source_text ?? "")) coverage.push(issue(`${path}.source_text`, "exact_source", "must be an exact canonical observation substring"));
        const urls = new Set([evidence.observation.url, ...evidence.scanned_urls]); if (!urls.has(entry.source_url)) coverage.push(issue(`${path}.source_url`, "source_url", "must match the observation URL or a declared scanned URL"));
      }
      const name = personalNamePolicy(entry.source_text); if (name.status !== "pass") coverage.push(issue(`${path}.pii_status`, "personal_name", name.reason));
      if (!entry.exact_match || entry.pii_status !== "pass") coverage.push(issue(path, "passing_coverage", "entry does not pass exact-match and PII status"));
      if (numeric) { if (!entry.source_text?.includes(claimText)) coverage.push(issue(`${path}.number_status`, "number_provenance", "source text must contain the declared numeric token")); if (entry.number_status !== "pass") coverage.push(issue(`${path}.number_status`, "number_status", "grounded number must pass")); }
      else if (entry.number_status !== "not_applicable") coverage.push(issue(`${path}.number_status`, "number_status", "non-numeric claim must be not_applicable"));
    }
    const unexpected = value.entries.filter((entry) => !refs.includes(entry.claim_ref)); if (unexpected.length) coverage.push(issue("grounding_report.entries", "coverage", "contains unexpected claim references"));
  }
  if (value.pass === true) issues.push(...coverage);
  return result(issues);
}
export const buildGroundingReport = (value, options) => build(value, (input) => validateGroundingReport(input, options));

export function validateAttemptContext(value) {
  const issues = []; jsonCheck(value, "attempt_context", issues); if (issues.length) return result(issues); if (!closed(value, ["attempt_id", "candidate", "evidence", "grounding_report", "rubric_version", "candidate_ref"], [], "attempt_context", issues)) return result(issues);
  string(value.attempt_id, "attempt_context.attempt_id", issues); string(value.rubric_version, "attempt_context.rubric_version", issues); if (!SHA256.test(value.candidate_ref ?? "")) issues.push(issue("attempt_context.candidate_ref", "sha256", "must be a SHA-256"));
  const rebase = (entries, prefix) => entries.map((entry) => ({ ...entry, path: `${prefix}${entry.path.replace(/^[^.]+/, "")}` }));
  const candidate = validateCandidate(value.candidate); issues.push(...rebase(candidate.issues, "attempt_context.candidate")); const evidence = validateEvidence(value.evidence); issues.push(...rebase(evidence.issues, "attempt_context.evidence"));
  if (candidate.valid && value.candidate_ref !== deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, value.candidate)) issues.push(issue("attempt_context.candidate_ref", "linkage", "does not match candidate"));
  const grounding = validateGroundingReport(value.grounding_report, { brief: value.candidate, evidence: value.evidence }); issues.push(...rebase(grounding.issues, "attempt_context.grounding_report"));
  if (grounding.valid && value.grounding_report?.pass !== true) issues.push(issue("attempt_context.grounding_report.pass", "passing_required", "must be true before entering AttemptContext"));
  if (candidate.valid && evidence.valid && value.candidate.mode !== value.evidence.mode) issues.push(issue("attempt_context", "mode_linkage", "candidate and evidence modes differ"));
  return result(issues);
}
export const buildAttemptContext = (value) => build(value, validateAttemptContext);

export function validateCommittedBrief(value) {
  const issues = []; jsonCheck(value, "committed_brief", issues); if (issues.length) return result(issues); if (!closed(value, ["artifact_version", "id", "request_scope", "brief", "brief_schema_version", "policy_identity", "rubric_identity", "provenance"], [], "committed_brief", issues)) return result(issues);
  if (value.artifact_version !== ARTIFACT_VERSION) issues.push(issue("committed_brief.artifact_version", "unsupported_version", `must equal ${ARTIFACT_VERSION}`)); string(value.id, "committed_brief.id", issues);
  if (!["local", "domain"].includes(value.request_scope)) issues.push(issue("committed_brief.request_scope", "enum", "must be local or domain"));
  const brief = validateBrief(value.brief); issues.push(...brief.issues); if (value.brief_schema_version !== value.brief?.version) issues.push(issue("committed_brief.brief_schema_version", "linkage", "must equal brief.version"));
  for (const key of ["policy_identity", "rubric_identity"]) if (!SHA256.test(value[key] ?? "")) issues.push(issue(`committed_brief.${key}`, "sha256", "must be a SHA-256"));
  if (!closed(value.provenance, ["attempt_id", "candidate_ref", "evidence_ref", "grounding_report_version", "effective_mode"], [], "committed_brief.provenance", issues)) return result(issues);
  string(value.provenance.attempt_id, "committed_brief.provenance.attempt_id", issues); for (const key of ["candidate_ref", "evidence_ref"]) if (!SHA256.test(value.provenance[key] ?? "")) issues.push(issue(`committed_brief.provenance.${key}`, "sha256", "must be a SHA-256"));
  if (brief.valid && value.provenance.candidate_ref !== deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, value.brief)) issues.push(issue("committed_brief.provenance.candidate_ref", "linkage", "does not match the committed Brief"));
  if (value.provenance.grounding_report_version !== GROUNDING_REPORT_VERSION) issues.push(issue("committed_brief.provenance.grounding_report_version", "version", "must equal the grounding report version")); if (value.provenance.effective_mode !== value.brief?.mode) issues.push(issue("committed_brief.provenance.effective_mode", "mode_linkage", "must equal brief.mode"));
  return result(issues);
}
export const buildCommittedBrief = (value) => build(value, validateCommittedBrief);
