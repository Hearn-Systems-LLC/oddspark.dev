import {
  CANDIDATE_SCHEMA_VERSION,
  GROUNDING_REPORT_VERSION,
  buildAttemptContext,
  buildGroundingReport,
  deepFreeze,
  deriveCandidateRef,
  deriveEvidenceRef,
  personalNamePolicy,
  requiredGroundingClaimRefs,
  validateCandidate,
  validateEvidenceContext,
} from "./brief-contracts.mjs";
import { validateCorpus } from "./semantic-corpus.mjs";
import { validateJudgeResult } from "../spikes/judge-fidelity/contract.mjs";

export const COMPOSITE_GATE_CODES = Object.freeze({
  PASSED: "passed",
  LOCAL_REJECTED: "local_rejected",
  JUDGE_UNQUALIFIED: "judge_unqualified",
  JUDGE_PROVIDER_FAILED: "judge_provider_failed",
  JUDGE_CONTRACT_REJECTED: "judge_contract_rejected",
  SEMANTIC_REJECTED: "semantic_rejected",
});

const SHA256 = /^[a-f0-9]{64}$/;
const MAX_DEPTH = 64;
const localIssue = (path, rule, message) => ({ path, rule, message });
const outcome = (value) => deepFreeze(value);

class SnapshotError extends TypeError {
  constructor(path, rule, message) {
    super(`${path}: ${message}`);
    this.issue = localIssue(path, rule, message);
  }
}

function snapshot(value, path = "input", seen = new Set(), depth = 0) {
  if (depth > MAX_DEPTH) throw new SnapshotError(path, "maximum_depth", "exceeds the supported nesting depth");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new SnapshotError(path, "non_json_value", "must be a finite JSON number");
    return value;
  }
  if (typeof value !== "object") throw new SnapshotError(path, "non_json_value", `must not contain ${typeof value}`);
  if (seen.has(value)) throw new SnapshotError(path, "non_json_value", "must not contain cycles");
  let array; let prototype; let keys; const descriptors = new Map();
  try {
    array = Array.isArray(value);
    prototype = Reflect.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
    for (const key of keys) descriptors.set(key, Reflect.getOwnPropertyDescriptor(value, key));
  } catch {
    throw new SnapshotError(path, "reflection", "could not be inspected safely");
  }
  if (!array && ![Object.prototype, null].includes(prototype)) throw new SnapshotError(path, "plain_object", "must contain only plain objects");
  if (keys.some((key) => typeof key === "symbol")) throw new SnapshotError(path, "symbol_key", "must not contain symbol keys");
  const stringKeys = keys.filter((key) => typeof key === "string");
  for (const key of stringKeys) {
    const descriptor = descriptors.get(key);
    if (!descriptor) throw new SnapshotError(`${path}.${key}`, "reflection", "property descriptor is unavailable");
    if (array && key === "length") continue;
    if (!descriptor.enumerable) throw new SnapshotError(`${path}.${key}`, "hidden_property", "non-enumerable properties are forbidden");
    if (!("value" in descriptor)) throw new SnapshotError(`${path}.${key}`, "accessor", "accessor properties are forbidden");
  }
  const valueKeys = array ? stringKeys.filter((key) => key !== "length") : stringKeys;
  const lengthDescriptor = array ? descriptors.get("length") : null;
  if (array && (!lengthDescriptor || !("value" in lengthDescriptor) || lengthDescriptor.enumerable || !Number.isInteger(lengthDescriptor.value) || lengthDescriptor.value < 0)) throw new SnapshotError(`${path}.length`, "array_length", "must have a canonical array length descriptor");
  if (array && (valueKeys.length !== lengthDescriptor.value || valueKeys.some((key, index) => key !== String(index)))) throw new SnapshotError(path, "dense_array", "must be a dense unsupplemented array");
  seen.add(value);
  const copy = array ? [] : Object.create(null);
  for (const key of valueKeys) Object.defineProperty(copy, key, {
    value: snapshot(descriptors.get(key).value, array ? `${path}[${key}]` : `${path}.${key}`, seen, depth + 1),
    enumerable: true, writable: true, configurable: true,
  });
  seen.delete(value);
  return copy;
}

function claimValue(candidate, ref) {
  if (ref === "brief.title") return candidate.title;
  if (ref === "brief.plan") return candidate.plan;
  if (ref === "brief.why_fits.text") return candidate.why_fits.text;
  if (ref === "brief.why_fits.breadcrumb") return candidate.why_fits.breadcrumb;
  if (ref === "brief.what_gets_better") return candidate.what_gets_better;
  if (ref === "brief.before_after.before") return candidate.before_after.before;
  if (ref === "brief.before_after.after") return candidate.before_after.after;
  if (ref === "brief.change_level.time_range") return candidate.change_level.time_range;
  if (ref === "brief.invitation") return candidate.invitation;
  if (ref === "brief.notice") return candidate.notice;
  const preserved = /^brief\.stays_same\.(tools|authority|steps)\[(\d+)]$/.exec(ref);
  if (preserved) return candidate.stays_same[preserved[1]][Number(preserved[2])];
  const number = /^brief\.grounded_numbers\[(\d+)]$/.exec(ref);
  return number ? candidate.grounded_numbers[Number(number[1])] : undefined;
}

function candidateNameIssues(candidate) {
  const issues = [];
  const visit = (value, path) => {
    if (typeof value === "string") {
      const result = personalNamePolicy(value);
      if (result.status !== "pass") issues.push(localIssue(path, "personal_name", result.reason));
    } else if (Array.isArray(value)) value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => visit(entry, `${path}.${key}`));
  };
  visit(candidate, "candidate");
  return issues;
}

function deriveGroundingReport(candidate, evidence) {
  const evidenceRef = deriveEvidenceRef(evidence);
  if (candidate.mode === "local") return buildGroundingReport({ version: GROUNDING_REPORT_VERSION, evidence_ref: evidenceRef, entries: [], pass: true }, { brief: candidate, evidence });
  const entries = requiredGroundingClaimRefs(candidate).map((claim_ref) => {
    const claim = claimValue(candidate, claim_ref);
    const supported = typeof claim === "string" && evidence.observation.text.includes(claim);
    const pii = supported ? personalNamePolicy(claim) : { status: "unknown" };
    const numeric = claim_ref.startsWith("brief.grounded_numbers[");
    return {
      claim_ref,
      source_url: evidence.observation.url,
      source_text: supported ? claim : "unsupported claim",
      exact_match: supported,
      pii_status: pii.status,
      number_status: numeric ? (supported ? "pass" : "fail") : "not_applicable",
      reason: supported ? "exact canonical observation support" : "exact canonical observation support missing",
    };
  });
  const pass = entries.every((entry) => entry.exact_match && entry.pii_status === "pass" && !["fail", "unknown"].includes(entry.number_status));
  return buildGroundingReport({ version: GROUNDING_REPORT_VERSION, evidence_ref: evidenceRef, entries, pass }, { brief: candidate, evidence });
}

function descriptorIssues(judge) {
  const issues = [];
  const keys = ["role", "provider", "resolved_model", "qualification_ref", "status", "outcome"];
  if (!judge || typeof judge !== "object" || Array.isArray(judge) || ![Object.prototype, null].includes(Object.getPrototypeOf(judge))) return [localIssue("judge", "closed_descriptor", "must be a plain closed descriptor")];
  if (Object.keys(judge).length !== keys.length || keys.some((key) => !Object.hasOwn(judge, key))) issues.push(localIssue("judge", "closed_descriptor", "descriptor keys differ"));
  if (judge.role !== "STRUCT-JUDGE") issues.push(localIssue("judge.role", "role", "must equal STRUCT-JUDGE"));
  if (judge.status !== "active") issues.push(localIssue("judge.status", "active", "must be active"));
  if (judge.outcome !== "GO") issues.push(localIssue("judge.outcome", "qualification", "must equal GO"));
  for (const key of ["provider", "resolved_model"]) if (typeof judge[key] !== "string" || judge[key].trim() === "") issues.push(localIssue(`judge.${key}`, "nonblank_string", "must be a nonblank string"));
  if (!SHA256.test(judge.qualification_ref ?? "")) issues.push(localIssue("judge.qualification_ref", "sha256", "must be a lowercase SHA-256"));
  return issues;
}

function safeDecision(verdict) {
  return {
    pass: verdict.pass,
    gates: verdict.gates.map(({ gate, pass }) => ({ gate, pass })),
    tone: { pass: verdict.tone.pass },
    claims: { pass: verdict.claims.pass },
  };
}

function rejection(code, judgeCalls, issues = []) {
  return outcome({ ok: false, code, judge_calls: judgeCalls, issues: snapshot(issues, "issues") });
}

function captureDependencies(dependencies) {
  if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) throw new SnapshotError("dependencies", "closed_schema", "must be a closed dependency object");
  const keys = ["judge_provider", "judge", "rubric"];
  let prototype; let ownKeys; const descriptors = new Map();
  try {
    prototype = Reflect.getPrototypeOf(dependencies);
    ownKeys = Reflect.ownKeys(dependencies);
    for (const key of ownKeys) descriptors.set(key, Reflect.getOwnPropertyDescriptor(dependencies, key));
  } catch {
    throw new SnapshotError("dependencies", "reflection", "could not be inspected safely");
  }
  if (![Object.prototype, null].includes(prototype) || ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) throw new SnapshotError("dependencies", "closed_schema", "must be an exact plain dependency object");
  for (const key of keys) {
    const descriptor = descriptors.get(key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new SnapshotError(`dependencies.${key}`, "closed_schema", "must be an enumerable data property");
  }
  if (typeof descriptors.get("judge_provider").value !== "function") throw new SnapshotError("dependencies.judge_provider", "function", "must be an injected function");
  return { judge_provider: descriptors.get("judge_provider").value, values: snapshot({ judge: descriptors.get("judge").value, rubric: descriptors.get("rubric").value }, "dependencies") };
}

export async function runCompositeGate(input, dependencies) {
  let capturedInput;
  try { capturedInput = snapshot(input); } catch (error) { return rejection(COMPOSITE_GATE_CODES.LOCAL_REJECTED, 0, [error.issue ?? localIssue("input", "snapshot", "input could not be inspected safely")]); }
  const inputKeys = ["evidence_context", "candidate"];
  if (!capturedInput || Array.isArray(capturedInput) || Object.keys(capturedInput).length !== inputKeys.length || inputKeys.some((key) => !Object.hasOwn(capturedInput, key))) return rejection(COMPOSITE_GATE_CODES.LOCAL_REJECTED, 0, [localIssue("input", "closed_schema", "must contain only evidence_context and candidate")]);
  const evidenceValidation = validateEvidenceContext(capturedInput.evidence_context);
  const candidateValidation = validateCandidate(capturedInput.candidate);
  const localIssues = [
    ...evidenceValidation.issues,
    ...candidateValidation.issues.map((entry) => ({ ...entry, path: entry.path.replace(/^brief/, "candidate") })),
  ];
  if (evidenceValidation.valid && candidateValidation.valid && capturedInput.evidence_context.evidence.mode !== capturedInput.candidate.mode) localIssues.push(localIssue("input", "mode_linkage", "candidate and evidence modes differ"));
  if (candidateValidation.valid) localIssues.push(...candidateNameIssues(capturedInput.candidate));
  if (localIssues.length) return rejection(COMPOSITE_GATE_CODES.LOCAL_REJECTED, 0, localIssues);

  let groundingReport;
  try { groundingReport = deriveGroundingReport(capturedInput.candidate, capturedInput.evidence_context.evidence); } catch (error) {
    return rejection(COMPOSITE_GATE_CODES.LOCAL_REJECTED, 0, error?.issues ?? [localIssue("grounding_report", "derivation", "grounding could not be derived")]);
  }
  if (groundingReport.pass !== true) return rejection(COMPOSITE_GATE_CODES.LOCAL_REJECTED, 0, [localIssue("grounding_report", "passing_required", "exact grounding, privacy, or number provenance failed")]);

  let candidateRef; let attemptContext;
  try {
    candidateRef = deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, capturedInput.candidate);
    attemptContext = buildAttemptContext({
      attempt_id: capturedInput.evidence_context.attempt_id,
      candidate: capturedInput.candidate,
      evidence: capturedInput.evidence_context.evidence,
      grounding_report: groundingReport,
      rubric_version: capturedInput.evidence_context.rubric_version,
      candidate_ref: candidateRef,
    });
  } catch {
    return rejection(COMPOSITE_GATE_CODES.LOCAL_REJECTED, 0, [localIssue("attempt_context", "construction", "candidate reference or AttemptContext construction failed")]);
  }

  let capturedDependencies;
  try { capturedDependencies = captureDependencies(dependencies); } catch (error) { return rejection(COMPOSITE_GATE_CODES.JUDGE_UNQUALIFIED, 0, [error.issue ?? localIssue("dependencies", "snapshot", "dependencies could not be inspected safely")]); }
  const deps = capturedDependencies.values;
  const qualificationIssues = descriptorIssues(deps.judge);
  const corpus = validateCorpus(deps.rubric);
  if (corpus.readiness !== "approved") qualificationIssues.push(localIssue("rubric", "approved_authority", "complete owner-approved corpus authority is required"));
  if (deps.rubric?.rubric?.corpus_version !== capturedInput.evidence_context.rubric_version) qualificationIssues.push(localIssue("rubric.corpus_version", "linkage", "does not match EvidenceContext rubric_version"));
  if (qualificationIssues.length) return rejection(COMPOSITE_GATE_CODES.JUDGE_UNQUALIFIED, 0, qualificationIssues);

  const request = outcome({
    candidate: attemptContext.candidate,
    evidence: attemptContext.evidence,
    grounding_report: attemptContext.grounding_report,
    rubric: snapshot(deps.rubric.rubric),
    candidate_ref: attemptContext.candidate_ref,
    judge: deps.judge,
  });
  let rawResult;
  try { rawResult = await capturedDependencies.judge_provider(request); } catch { return rejection(COMPOSITE_GATE_CODES.JUDGE_PROVIDER_FAILED, 1); }
  let judgeResult;
  try { judgeResult = snapshot(rawResult, "judge_result"); } catch { return rejection(COMPOSITE_GATE_CODES.JUDGE_CONTRACT_REJECTED, 1, [localIssue("judge_result", "canonical_json", "result must be a plain canonical JSON value")]); }
  const validation = validateJudgeResult(judgeResult, candidateRef);
  if (validation.valid && !judgeResult.verdict.gates.every((gate, index) => gate.gate === index + 1)) {
    validation.valid = false;
    validation.errors.push("result.verdict.gates must be ordered from gate 1 through gate 9");
  }
  if (validation.valid) {
    const subordinatePass = judgeResult.verdict.gates.every((gate) => gate.pass) && judgeResult.verdict.tone.pass && judgeResult.verdict.claims.pass;
    if (judgeResult.verdict.pass !== subordinatePass) {
      validation.valid = false;
      validation.errors.push("result.verdict.pass must equal the conjunction of all gates, tone, and claims");
    }
  }
  if (!validation.valid) return rejection(COMPOSITE_GATE_CODES.JUDGE_CONTRACT_REJECTED, 1, validation.errors.map((message) => localIssue("judge_result", "contract", message)));
  const decision = safeDecision(judgeResult.verdict);
  if (!decision.pass) return outcome({ ok: false, code: COMPOSITE_GATE_CODES.SEMANTIC_REJECTED, judge_calls: 1, issues: [], decision });
  return outcome({ ok: true, code: COMPOSITE_GATE_CODES.PASSED, judge_calls: 1, attempt_context: attemptContext, judge: deps.judge, decision });
}

export const compositeGate = runCompositeGate;
