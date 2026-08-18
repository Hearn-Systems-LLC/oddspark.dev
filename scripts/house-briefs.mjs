import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { canonicalJson, deepFreeze, personalNamePolicy, validateBrief } from "./brief-contracts.mjs";
import { validatePriors } from "./local-priors.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "content/house-briefs/v1/catalog.json");
const APPROVAL_PATH = path.join(ROOT, "content/house-briefs/v1/approval.json");
const PRIORS_PATH = path.join(ROOT, "content/local-priors/v1/priors.json");
const RUBRIC_PATH = path.join(ROOT, "semantic/voice/v1/rubric.json");
const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CANONICAL_GATES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PLACEHOLDER = /(?:\b(?:todo|tbd|placeholder|lorem ipsum|fixme)\b|<{2,}|>{2,})/i;
const FORBIDDEN_CLAIM = /(?:\b(?:roi|revenue|profit|sales|customers?|conversion|guarantee[ds]?|weather|festival|touris[mt])\b|[%$£€])/i;

const issue = (artifact, rule, message, location = null) => ({ artifact, rule, message, location });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const nonblank = (value) => typeof value === "string" && value.trim() !== "" && value === value.trim();

function exactKeys(value, expected, artifact, location, issues) {
  if (!isObject(value)) { issues.push(issue(artifact, "object", `${location} must be a plain object`, location)); return false; }
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

function strings(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(strings);
}

export function domainHash(domain, value) {
  return createHash("sha256").update(`oddspark.house-briefs.v1\0${domain}\0${canonicalJson(value)}`, "utf8").digest("hex");
}

export const catalogIdentity = (catalog) => domainHash("catalog", catalog);
export const approvalIdentity = ({ catalog_version, content_hash, approver, approved_at }) => domainHash("approval", { catalog_version, content_hash, approver, approved_at });
export const authorityHashes = ({ priors, rubric } = {}) => ({
  priors: domainHash("canonical-priors-authority", priors),
  voice_rubric: domainHash("canonical-voice-rubric-authority", rubric),
});

function canonicalSeasons(priors, issues) {
  const validation = validatePriors(priors);
  if (!validation.valid) {
    issues.push(issue("authority", "canonical_seasons", "canonical season authority failed its production validation", "priors.seasons"));
    return [];
  }
  if (!isObject(priors) || !Array.isArray(priors.seasons)) {
    issues.push(issue("authority", "canonical_seasons", "canonical season authority is unavailable", "priors.seasons"));
    return [];
  }
  const ids = priors.seasons.map((season) => season?.id);
  if (ids.length === 0 || ids.some((id) => !nonblank(id)) || new Set(ids).size !== ids.length) {
    issues.push(issue("authority", "canonical_seasons", "canonical season authority is malformed", "priors.seasons"));
    return [];
  }
  return ids;
}

function validateRubricAuthority(rubric, issues) {
  if (!isObject(rubric)) {
    issues.push(issue("authority", "voice_rubric", "voice rubric authority must be a plain object", "rubric"));
    return false;
  }
  let valid = true;
  if (!Array.isArray(rubric.gate_order) || rubric.gate_order.length !== CANONICAL_GATES.length
    || rubric.gate_order.some((gate, index) => gate !== CANONICAL_GATES[index])) {
    issues.push(issue("authority", "gate_set", "voice rubric must define Gates 1-9 in exact canonical order", "rubric.gate_order"));
    valid = false;
  }
  if (!Array.isArray(rubric.banned_registers) || rubric.banned_registers.length === 0
    || rubric.banned_registers.some((value) => !nonblank(value))) {
    issues.push(issue("authority", "banned_registers", "voice rubric banned_registers must be a nonempty array of trimmed nonblank strings", "rubric.banned_registers"));
    valid = false;
  }
  return valid;
}

function validateExpected(expected, location, issues) {
  if (!exactKeys(expected, ["gates", "tone", "claims"], "catalog", location, issues)) return;
  if (!isObject(expected.gates) || canonicalJson(Object.keys(expected.gates)) !== canonicalJson(CANONICAL_GATES.map(String))) {
    issues.push(issue("catalog", "gate_expectations", `${location}.gates must declare canonical Gates 1-9 in order`, `${location}.gates`));
  } else if (Object.values(expected.gates).some((outcome) => outcome !== "pass")) {
    issues.push(issue("catalog", "gate_expectations", `${location}.gates must declare every Gate as pass`, `${location}.gates`));
  }
  if (expected.tone !== "pass") issues.push(issue("catalog", "tone_expectation", `${location}.tone must equal pass`, `${location}.tone`));
  if (expected.claims !== "pass") issues.push(issue("catalog", "claims_expectation", `${location}.claims must equal pass`, `${location}.claims`));
}

export function validateCatalog(catalog, authorities = {}) {
  const issues = [];
  const { priors, rubric } = isObject(authorities) ? authorities : {};
  try { canonicalJson(catalog); } catch (error) { return { valid: false, issues: [issue("catalog", "non_json_value", error.message)] }; }
  if (!exactKeys(catalog, ["schema_version", "catalog_version", "authority", "entries"], "catalog", "catalog", issues)) return { valid: false, issues };
  if (catalog.schema_version !== 1 || catalog.catalog_version !== 1) issues.push(issue("catalog", "version", "catalog must use integer schema and catalog version 1"));
  const authorityShape = exactKeys(catalog.authority, ["author", "owner", "status", "production_authorized", "canonical_priors_hash", "canonical_voice_rubric_hash"], "catalog", "catalog.authority", issues);
  if (authorityShape
    && (catalog.authority.author !== "developer" || catalog.authority.owner !== "Justin" || catalog.authority.status !== "pending_owner_approval" || catalog.authority.production_authorized !== false)) {
    issues.push(issue("catalog", "authority", "catalog authority must remain developer-authored, pending owner approval, and non-production"));
  }
  const seasons = canonicalSeasons(priors, issues);
  const rubricValid = validateRubricAuthority(rubric, issues);
  if (authorityShape && seasons.length > 0 && rubricValid) {
    const expected = authorityHashes({ priors, rubric });
    if (!SHA256.test(catalog.authority.canonical_priors_hash ?? "") || catalog.authority.canonical_priors_hash !== expected.priors) issues.push(issue("catalog", "priors_authority_hash", "catalog is not bound to the exact canonical priors authority", "catalog.authority.canonical_priors_hash"));
    if (!SHA256.test(catalog.authority.canonical_voice_rubric_hash ?? "") || catalog.authority.canonical_voice_rubric_hash !== expected.voice_rubric) issues.push(issue("catalog", "voice_rubric_authority_hash", "catalog is not bound to the exact canonical voice-rubric authority", "catalog.authority.canonical_voice_rubric_hash"));
  }
  const ids = new Set();
  const content = new Set();
  const counts = new Map(seasons.map((season) => [season, 0]));
  if (!Array.isArray(catalog.entries)) issues.push(issue("catalog", "entries", "catalog.entries must be an array", "catalog.entries"));
  else for (const [index, entry] of catalog.entries.entries()) {
    const location = `catalog.entries[${index}]`;
    if (!exactKeys(entry, ["id", "season_id", "brief", "expected_outcome"], "catalog", location, issues)) continue;
    if (!nonblank(entry.id) || !IDENTIFIER.test(entry.id) || PLACEHOLDER.test(entry.id)) issues.push(issue("catalog", "stable_id", `${location}.id must be a stable non-placeholder kebab-case identifier`, `${location}.id`));
    else if (ids.has(entry.id)) issues.push(issue("catalog", "duplicate_id", `duplicate entry id: ${entry.id}`, `${location}.id`));
    else ids.add(entry.id);
    if (!seasons.includes(entry.season_id)) issues.push(issue("catalog", "season", `${location}.season_id must name a canonical season`, `${location}.season_id`));
    else counts.set(entry.season_id, counts.get(entry.season_id) + 1);
    const briefValidation = validateBrief(entry.brief);
    issues.push(...briefValidation.issues.map((entryIssue) => issue("catalog", `brief_${entryIssue.rule}`, entryIssue.message, `${location}.${entryIssue.path}`)));
    if (entry.brief?.mode !== "local") issues.push(issue("catalog", "brief_mode", `${location}.brief must use local mode`, `${location}.brief.mode`));
    let fingerprint;
    try { fingerprint = domainHash("brief-content", entry.brief); } catch { fingerprint = null; }
    if (fingerprint && content.has(fingerprint)) issues.push(issue("catalog", "duplicate_content", "catalog Brief content must be unique", `${location}.brief`));
    else if (fingerprint) content.add(fingerprint);
    const text = strings(entry.brief).join(" ");
    if (PLACEHOLDER.test(text)) issues.push(issue("catalog", "placeholder", "Brief content must not contain placeholders", `${location}.brief`));
    if (FORBIDDEN_CLAIM.test(text)) issues.push(issue("catalog", "prohibited_claim", "Brief content must not contain business-specific, pricing, percentage, outcome, event, tourism, or weather claims", `${location}.brief`));
    if (rubricValid && rubric.banned_registers.some((phrase) => text.toLocaleLowerCase("en-US").includes(phrase.toLocaleLowerCase("en-US")))) issues.push(issue("catalog", "banned_register", "Brief content must not use a voice-rubric banned register", `${location}.brief`));
    const name = strings(entry.brief).map((value) => personalNamePolicy(value)).find((result) => result.status !== "pass");
    if (name) issues.push(issue("catalog", "personal_name", name.reason, `${location}.brief`));
    validateExpected(entry.expected_outcome, `${location}.expected_outcome`, issues);
  }
  for (const season of seasons) if ((counts.get(season) ?? 0) < 2) issues.push(issue("catalog", "season_coverage", `season ${season} must contain at least two Briefs`, "catalog.entries"));
  return { valid: issues.length === 0, issues };
}

export function buildCatalog(catalog, authorities) {
  const validation = validateCatalog(catalog, authorities);
  if (!validation.valid) return { catalog: null, content_hash: null, issues: validation.issues };
  const copy = structuredClone(catalog);
  return { catalog: deepFreeze(copy), content_hash: catalogIdentity(copy), issues: [] };
}

export function selectHouseBrief(catalog, { season_id, selection_key } = {}, authorities = {}) {
  const built = buildCatalog(catalog, authorities);
  if (built.issues.length) return { selected: null, issues: built.issues };
  if (!nonblank(season_id) || !authorities.priors.seasons.some((season) => season.id === season_id)) return { selected: null, issues: [issue("selection", "season", "season_id must name a canonical season", "season_id")] };
  if (!nonblank(selection_key) || PLACEHOLDER.test(selection_key)) return { selected: null, issues: [issue("selection", "selection_key", "selection_key must be explicit, stable, and non-placeholder", "selection_key")] };
  const entries = built.catalog.entries.filter((entry) => entry.season_id === season_id);
  const hash = domainHash("selection", { season_id, selection_key });
  const index = Number(BigInt(`0x${hash}`) % BigInt(entries.length));
  return { selected: entries[index], content_hash: built.content_hash, issues: [] };
}

export function verifyApproval(catalog, approval, authorities = {}, { now = new Date() } = {}) {
  const built = buildCatalog(catalog, authorities);
  if (built.issues.length) return { ready: false, status: "invalid", content_hash: null, issues: built.issues };
  const issues = [];
  try { canonicalJson(approval); } catch (error) { return { ready: false, status: "invalid", content_hash: built.content_hash, issues: [issue("approval", "non_json_value", error.message)] }; }
  if (!exactKeys(approval, ["schema_version", "catalog_version", "status", "approver", "content_hash", "identity", "approved_at"], "approval", "approval", issues)) return { ready: false, status: "invalid", content_hash: built.content_hash, issues };
  if (approval.schema_version !== 1 || approval.catalog_version !== catalog.catalog_version) issues.push(issue("approval", "version", "approval versions must match catalog version 1"));
  if (approval.content_hash !== built.content_hash) issues.push(issue("approval", "content_hash", "approval content hash does not match the current canonical catalog"));
  if (approval.status === "pending_owner_approval") {
    if (approval.approver !== null || approval.identity !== null || approval.approved_at !== null) issues.push(issue("approval", "pending_shape", "pending approval cannot name an approver, identity, or approval time"));
    return { ready: false, status: issues.length ? "invalid" : "pending_owner_approval", content_hash: built.content_hash, issues };
  }
  if (approval.status !== "approved") issues.push(issue("approval", "status", "approval status must be pending_owner_approval or approved"));
  if (approval.approver !== "Justin") issues.push(issue("approval", "approver", "only Justin's explicit approval is accepted"));
  const approvedAt = typeof approval.approved_at === "string" ? new Date(approval.approved_at) : new Date(NaN);
  if (Number.isNaN(approvedAt.valueOf()) || approvedAt.toISOString() !== approval.approved_at) issues.push(issue("approval", "timestamp", "approved_at must be a canonical ISO timestamp"));
  else if (!(now instanceof Date) || Number.isNaN(now.valueOf()) || approvedAt > now) issues.push(issue("approval", "timestamp", "approved_at must not be in the future and now must be valid"));
  if (approval.identity !== approvalIdentity(approval)) issues.push(issue("approval", "identity", "approval identity does not match its exact bound fields"));
  return { ready: issues.length === 0, status: issues.length ? "invalid" : "approved", content_hash: built.content_hash, issues };
}

export async function loadHouseBriefInputs({ catalogPath = CATALOG_PATH, approvalPath = APPROVAL_PATH, priorsPath = PRIORS_PATH, rubricPath = RUBRIC_PATH } = {}) {
  const read = async (file, artifact) => {
    try { return { value: JSON.parse(await readFile(file, "utf8")), issues: [] }; }
    catch (error) { return { value: null, issues: [issue(artifact, "json_parse", error.message)] }; }
  };
  const [catalog, approval, priors, rubric] = await Promise.all([read(catalogPath, "catalog"), read(approvalPath, "approval"), read(priorsPath, "priors"), read(rubricPath, "rubric")]);
  return { catalog: catalog.value, approval: approval.value, priors: priors.value, rubric: rubric.value, issues: [...catalog.issues, ...approval.issues, ...priors.issues, ...rubric.issues] };
}

export async function runCli(options = {}) {
  const input = await loadHouseBriefInputs(options);
  if (input.issues.length) return { schema_version: 1, structure_valid: false, readiness: "invalid", production_ready: false, content_hash: null, issues: input.issues };
  const result = verifyApproval(input.catalog, input.approval, { priors: input.priors, rubric: input.rubric });
  return { schema_version: 1, structure_valid: !result.issues.some((entry) => entry.artifact === "catalog" || entry.artifact === "authority"), readiness: result.status, production_ready: result.ready, content_hash: result.content_hash, issues: result.issues };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await runCli();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.production_ready ? 0 : 1;
}
