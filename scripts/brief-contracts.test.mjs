import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  CANDIDATE_SCHEMA_VERSION,
  buildAttemptContext,
  buildBrief,
  buildCommittedBrief,
  buildEvidenceContext,
  buildGroundingReport,
  canonicalJson,
  deriveCandidateRef,
  deriveEvidenceRef,
  personalNamePolicy,
  requiredGroundingClaimRefs,
  validateAttemptContext,
  validateBrief,
  validateCommittedBrief,
  validateEvidence,
  validateGroundingReport,
} from "./brief-contracts.mjs";

const clone = structuredClone;
const hash = "a".repeat(64);
const localBrief = () => ({
  version: 1, mode: "local", title: "A calmer inquiry handoff", plan: "Route repeated questions into one reviewed response.",
  why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." }, what_gets_better: "The team starts with a useful draft instead of an empty page.",
  before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." },
  change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true },
  stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] },
  invitation: "We can inspect this Spark together and map a clear first step.", grounded_numbers: [],
});
const domainBrief = () => ({ ...localBrief(), mode: "domain", why_fits: { text: "The site emphasizes quick response.", breadcrumb: "Replies arrive within 24 hours" }, grounded_numbers: ["24"] });
const localEvidence = () => ({ version: 1, mode: "local", priors: { region: "Blue Water Area", season: "summer", date: "current", situation: "repeated inquiries", capability_bundle: ["software"] } });
const DOMAIN_REFS = [
  "brief.title", "brief.plan", "brief.why_fits.text", "brief.why_fits.breadcrumb", "brief.what_gets_better",
  "brief.before_after.before", "brief.before_after.after", "brief.change_level.time_range", "brief.stays_same.tools[0]",
  "brief.stays_same.authority[0]", "brief.stays_same.steps[0]", "brief.invitation", "brief.grounded_numbers[0]",
];
function claimText(brief, ref) {
  if (ref === "brief.title") return brief.title; if (ref === "brief.plan") return brief.plan; if (ref === "brief.why_fits.text") return brief.why_fits.text;
  if (ref === "brief.why_fits.breadcrumb") return brief.why_fits.breadcrumb; if (ref === "brief.what_gets_better") return brief.what_gets_better;
  if (ref === "brief.before_after.before") return brief.before_after.before; if (ref === "brief.before_after.after") return brief.before_after.after;
  if (ref === "brief.change_level.time_range") return brief.change_level.time_range; if (ref === "brief.invitation") return brief.invitation; if (ref === "brief.notice") return brief.notice;
  const array = /brief\.stays_same\.(tools|authority|steps)\[(\d+)]/.exec(ref); if (array) return brief.stays_same[array[1]][Number(array[2])];
  const numeric = /brief\.grounded_numbers\[(\d+)]/.exec(ref); if (numeric) return brief.grounded_numbers[Number(numeric[1])];
  throw new Error(`unknown fixture ref ${ref}`);
}
const domainEvidence = (brief = domainBrief()) => ({ version: 1, mode: "domain", vertical: "services", clarity: "clear", capabilities: ["inquiry routing"], channels: [], observation: { source_id: "home", url: "https://example.com", text: [...new Set(DOMAIN_REFS.map((ref) => claimText(brief, ref)))].join(" | ") }, scanned_urls: ["https://example.com", "https://example.com/about"] });
function report(brief, evidence) {
  return { version: 1, evidence_ref: deriveEvidenceRef(evidence), entries: requiredGroundingClaimRefs(brief).map((claim_ref) => ({ claim_ref, source_url: "https://example.com", source_text: claimText(brief, claim_ref), exact_match: true, pii_status: "pass", number_status: claim_ref.includes("grounded_numbers") ? "pass" : "not_applicable", reason: "exact source support" })), pass: true };
}

test("valid local and domain Brief unions enforce eight semantic elements and optional notice", () => {
  assert.deepEqual(validateBrief(localBrief()), { valid: true, issues: [] });
  const domain = domainBrief(); domain.notice = "Website context was available.";
  assert.deepEqual(validateBrief(domain), { valid: true, issues: [] });
});

test("Briefs reject unsupported versions, unknown and missing fields, nested drift, bad mode cardinality, pricing, pitch, and untracked numbers", () => {
  const mutations = [
    (b) => { b.version = 2; }, (b) => { b.extra = true; }, (b) => { delete b.plan; }, (b) => { b.before_after.extra = true; },
    (b) => { b.why_fits.breadcrumb = "not local"; }, (b) => { b.title = "$50 setup"; }, (b) => { b.invitation = "Book now for this Spark."; },
    (b) => { b.plan = "Save 20 hours."; },
  ];
  for (const mutate of mutations) { const value = localBrief(); mutate(value); assert.equal(validateBrief(value).valid, false); }
  const domain = domainBrief(); delete domain.why_fits.breadcrumb; assert.equal(validateBrief(domain).valid, false);
  const emptyGroups = localBrief(); emptyGroups.stays_same = { tools: [], authority: [], steps: [] };
  assert.equal(validateBrief(emptyGroups).valid, true);
});

test("Candidate identity sorts object keys, preserves array order, and changes with validated content", () => {
  const brief = domainBrief(); const reordered = Object.fromEntries(Object.entries(brief).reverse());
  assert.equal(deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief), deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, reordered));
  const changedArray = clone(brief); changedArray.stays_same.tools.push("Existing calendar");
  assert.notEqual(deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief), deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, changedArray));
  assert.throws(() => deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, { ...brief, surprise: true }), /unknown/);
  assert.throws(() => canonicalJson({ bad: undefined }), /undefined/);
  const symbol = Symbol("hidden"); const symbolic = domainBrief(); symbolic[symbol] = "not hashed";
  assert.equal(validateBrief(symbolic).valid, false); assert.throws(() => canonicalJson(symbolic), /symbol keys/);
});

test("runtime-neutral Candidate and Evidence refs match the Node SHA-256 oracle", () => {
  const candidate = localBrief(); candidate.title = "A calmer café handoff ☀";
  const evidence = localEvidence(); evidence.priors.region = "Blue Water café area ☀";
  const candidatePreimage = `oddspark-candidate-ref/v1\n${canonicalJson({ candidate_schema_version: CANDIDATE_SCHEMA_VERSION, candidate })}`;
  const evidencePreimage = `oddspark-evidence-ref/v1\n${canonicalJson(evidence)}`;
  assert.equal(deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, candidate), createHash("sha256").update(candidatePreimage, "utf8").digest("hex"));
  assert.equal(deriveEvidenceRef(evidence), createHash("sha256").update(evidencePreimage, "utf8").digest("hex"));
});

test("Evidence union is closed, versioned, and mode-specific", () => {
  assert.equal(validateEvidence(localEvidence()).valid, true); assert.equal(validateEvidence(domainEvidence()).valid, true);
  for (const mutate of [(e) => { e.version = 2; }, (e) => { e.extra = true; }, (e) => { e.priors.capability_bundle = []; }]) { const evidence = localEvidence(); mutate(evidence); assert.equal(validateEvidence(evidence).valid, false); }
  const malformed = domainEvidence(); delete malformed.observation.source_id; assert.equal(validateEvidence(malformed).valid, false);
});

test("ports build closed deeply frozen values", () => {
  const evidence = localEvidence(); const evidenceContext = buildEvidenceContext({ attempt_id: "attempt-1", evidence, rubric_version: "voice-v1" });
  assert.ok(Object.isFrozen(evidenceContext) && Object.isFrozen(evidenceContext.evidence.priors.capability_bundle));
  assert.throws(() => { evidenceContext.evidence.priors.region = "elsewhere"; }, TypeError);
  const candidate = localBrief(); const grounding_report = report(candidate, evidence);
  const attempt = buildAttemptContext({ attempt_id: "attempt-1", candidate, evidence, grounding_report, rubric_version: "voice-v1", candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, candidate) });
  assert.ok(Object.isFrozen(attempt) && Object.isFrozen(attempt.candidate.before_after));
});

test("grounding requires exactly one passing entry for every domain claim, Breadcrumb, and grounded number", () => {
  const brief = domainBrief(); const evidence = domainEvidence(); const valid = report(brief, evidence);
  assert.deepEqual(requiredGroundingClaimRefs(brief), DOMAIN_REFS);
  const withNotice = domainBrief(); withNotice.notice = "Website context was available.";
  assert.deepEqual(requiredGroundingClaimRefs(withNotice), [...DOMAIN_REFS.slice(0, -1), "brief.notice", "brief.grounded_numbers[0]"]);
  assert.equal(validateGroundingReport(valid, { brief, evidence }).valid, true);
  for (const mutate of [
    (r) => { r.entries.pop(); }, (r) => { r.entries.push(clone(r.entries[0])); }, (r) => { r.entries[0].exact_match = false; },
    (r) => { r.entries[0].pii_status = "unknown"; }, (r) => { r.entries.at(-1).number_status = "fail"; }, (r) => { r.evidence_ref = hash; },
  ]) { const changed = report(brief, evidence); mutate(changed); assert.equal(validateGroundingReport(changed, { brief, evidence }).valid, false); }
  const built = buildGroundingReport(valid, { brief, evidence }); assert.ok(Object.isFrozen(built.entries[0]));
});

test("domain grounding proves claim text, canonical observation, URL, PII, and numeric provenance mechanically", () => {
  const brief = domainBrief(); const evidence = domainEvidence(brief);
  const mutations = [
    (r) => { r.entries[0].source_text = "fabricated exact match"; },
    (r) => { r.entries[0].source_url = "https://unrelated.example"; },
    (r) => { r.entries[0].source_text = `${r.entries[0].source_text} Alice Smith`; r.entries[0].pii_status = "pass"; },
    (r) => { const entry = r.entries.find(({ claim_ref }) => claim_ref === "brief.grounded_numbers[0]"); entry.source_text = "no declared token here"; entry.number_status = "pass"; },
  ];
  for (const mutate of mutations) { const changed = report(brief, evidence); mutate(changed); assert.equal(validateGroundingReport(changed, { brief, evidence }).valid, false); }
  const omitted = report(brief, evidence); omitted.entries = omitted.entries.filter(({ claim_ref }) => claim_ref !== "brief.invitation"); assert.equal(validateGroundingReport(omitted, { brief, evidence }).valid, false);
});

test("failed or unknown GroundingReports remain structurally buildable but cannot enter AttemptContext", () => {
  const brief = domainBrief(); const evidence = domainEvidence(brief); const failed = report(brief, evidence); failed.pass = false; failed.entries[0].pii_status = "unknown"; failed.entries[0].source_text = "Jordan";
  const frozen = buildGroundingReport(failed, { brief, evidence }); assert.ok(Object.isFrozen(frozen) && Object.isFrozen(frozen.entries[0]));
  const attempt = { attempt_id: "attempt-1", candidate: brief, evidence, grounding_report: failed, rubric_version: "voice-v1", candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief) };
  const validation = validateAttemptContext(attempt); assert.equal(validation.valid, false); assert.ok(validation.issues.some(({ path }) => path === "attempt_context.grounding_report.pass"));
});

test("name policy is deterministic tri-state and fail or unknown cannot be mistaken for pass", () => {
  assert.deepEqual(personalNamePolicy("replies from the support desk"), { status: "pass", reason: "name-policy/v1:no-personal-name-signal" });
  assert.deepEqual(personalNamePolicy("Ask Dr. Smith for approval"), { status: "fail", reason: "name-policy/v1:personal-name-detected" });
  assert.deepEqual(personalNamePolicy("Ask Jordan for approval"), { status: "unknown", reason: "name-policy/v1:ambiguous-capitalized-token" });
  assert.deepEqual(personalNamePolicy(""), { status: "unknown", reason: "name-policy/v1:input-not-plain-text" });
  for (const text of ["Alice Smith approved it", "José García approved it", "Anne-Marie O'Connor approved it", "Dr. D'Arcy approved it"]) assert.equal(personalNamePolicy(text).status, "fail", text);
  for (const text of ["Sarah Chen", "Dr. Smith", "John OBrien"]) assert.equal(personalNamePolicy(text).status, "fail", text);
  for (const text of ["Plan Your Week in Ten Minutes", "Summer Handoff Bridge", "Get Things Done Before Noon"]) assert.equal(personalNamePolicy(text).status, "pass", text);
  assert.equal(personalNamePolicy("Spark's invitation remains optional.").status, "pass");
  assert.equal(personalNamePolicy("Ask JORDAN for approval").status, "unknown");
});

test("attempt linkage rejects stale references and cross-mode evidence", () => {
  const candidate = domainBrief(); const evidence = domainEvidence(); const value = { attempt_id: "attempt-1", candidate, evidence, grounding_report: report(candidate, evidence), rubric_version: "voice-v1", candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, candidate) };
  assert.equal(validateAttemptContext(value).valid, true);
  const stale = clone(value); stale.candidate_ref = hash; assert.equal(validateAttemptContext(stale).valid, false);
  const crossed = clone(value); crossed.evidence = localEvidence(); crossed.grounding_report.evidence_ref = deriveEvidenceRef(crossed.evidence); assert.equal(validateAttemptContext(crossed).valid, false);
});

test("committed envelope keeps request scope separate from effective and Brief mode", () => {
  const brief = localBrief(); const value = { artifact_version: 1, id: "p-0123456789abcdef", request_scope: "domain", brief, brief_schema_version: 1, policy_identity: hash, rubric_identity: hash, provenance: { attempt_id: "attempt-1", candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief), evidence_ref: hash, grounding_report_version: 1, effective_mode: "local" } };
  assert.equal(validateCommittedBrief(value).valid, true); assert.ok(Object.isFrozen(buildCommittedBrief(value).provenance));
  for (const mutate of [(v) => { v.artifact_version = 2; }, (v) => { v.brief_schema_version = 2; }, (v) => { v.provenance.effective_mode = "domain"; }, (v) => { v.provenance.candidate_ref = hash; }, (v) => { v.provenance.extra = true; }]) { const changed = clone(value); mutate(changed); assert.equal(validateCommittedBrief(changed).valid, false); }
});

test("validators contain cycles and non-array grounding entries with structured issues", () => {
  const cyclic = localBrief(); cyclic.why_fits.loop = cyclic;
  let briefResult; assert.doesNotThrow(() => { briefResult = validateBrief(cyclic); }); assert.equal(briefResult.valid, false); assert.ok(briefResult.issues.some(({ rule }) => rule === "non_json_value"));
  const malformed = { version: 1, evidence_ref: hash, entries: {}, pass: false };
  let reportResult; assert.doesNotThrow(() => { reportResult = validateGroundingReport(malformed, { brief: localBrief(), evidence: localEvidence() }); }); assert.equal(reportResult.valid, false); assert.ok(reportResult.issues.some(({ path }) => path === "grounding_report.entries"));
  const attempt = { attempt_id: "a", candidate: cyclic, evidence: localEvidence(), grounding_report: malformed, rubric_version: "v1", candidate_ref: hash };
  let attemptResult; assert.doesNotThrow(() => { attemptResult = validateAttemptContext(attempt); }); assert.equal(attemptResult.valid, false);
});

test("number grammar rejects bypass forms and malformed grounded declarations", () => {
  for (const token of ["-2", "1,000", ".5", "1.5", "1e3", "12%"] ) { const local = localBrief(); local.plan = `Save ${token} hours.`; assert.equal(validateBrief(local).valid, false, token); }
  for (const token of ["1,000", ".5", "+2", "01", "1E3"]) { const domain = domainBrief(); domain.grounded_numbers = [token]; domain.why_fits.breadcrumb = `Volume is ${token}`; assert.equal(validateBrief(domain).valid, false, token); }
  const undeclared = domainBrief(); undeclared.plan = "Volume increased by -2.5%."; assert.equal(validateBrief(undeclared).valid, false);
});

test("AttemptContext rebases nested contract issue paths", () => {
  const candidate = localBrief(); candidate.before_after.extra = true; const evidence = localEvidence(); evidence.priors.extra = true;
  const value = { attempt_id: "attempt-1", candidate, evidence, grounding_report: { version: 1, evidence_ref: hash, entries: {}, pass: true }, rubric_version: "voice-v1", candidate_ref: hash };
  const paths = validateAttemptContext(value).issues.map(({ path }) => path);
  assert.ok(paths.some((path) => path.startsWith("attempt_context.candidate."))); assert.ok(paths.some((path) => path.startsWith("attempt_context.evidence."))); assert.ok(paths.some((path) => path.startsWith("attempt_context.grounding_report.")));
});

test("malformed nested values and mutation attempts fail closed without partial objects", () => {
  const malformed = localBrief(); malformed.change_level.steps_changed = "two"; assert.equal(validateBrief(malformed).valid, false); assert.throws(() => buildBrief(malformed), /steps_changed/);
  const frozen = buildBrief(localBrief()); assert.throws(() => frozen.stays_same.tools.push("new"), TypeError);
});
