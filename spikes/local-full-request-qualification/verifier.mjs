import { canonicalBytes, deriveFullRequestRef, exactSha, PREDICATES, sha256, validateApproval, validatePlan } from "./contract.mjs";

const result = (id, pass, detail = null) => ({ id, pass, ...(detail ? { detail } : {}) });
const finiteNonnegative = (value) => Number.isFinite(value) && value >= 0;
const boundedErrorString = (value, nullable = false) => (nullable && value === null)
  || (typeof value === "string" && value.length > 0 && value.length <= 512);
const providerErrorRetained = (call) => call?.success !== false || (
  call.provider_error !== null && typeof call.provider_error === "object"
  && boundedErrorString(call.provider_error.class)
  && boundedErrorString(call.provider_error.message)
  && (call.provider_error.http_status === null || (Number.isSafeInteger(call.provider_error.http_status)
    && call.provider_error.http_status >= 100 && call.provider_error.http_status <= 599))
  && boundedErrorString(call.provider_error.code, true)
);
const strikeLedgerRetained = (strike) => strike !== null && typeof strike === "object"
  && typeof strike.code === "string" && strike.code.length > 0
  && Number.isSafeInteger(strike.model_calls) && strike.model_calls >= 0
  && Array.isArray(strike.ledger) && strike.ledger.length > 0
  && strike.ledger.every((entry) => entry !== null && typeof entry === "object" && !Array.isArray(entry)
    && typeof entry.event === "string" && entry.event.length > 0);
const structuredFailure = (reason, evidence = null) => {
  const predicate_results = PREDICATES.map((id) => result(id, false, reason));
  const errors = [reason, ...predicate_results.map(({ id }) => `${id}: ${reason}`)];
  if (evidence?.full_request_ref != null) errors.push("failed evidence emitted a ref");
  return { valid: false, errors, predicate_results };
};

export function verifyEvidenceBytes(bytes, { planBytes, approvalBytes } = {}) {
  const failures = [];
  let evidence; let plan; let approval;
  try { evidence = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { return { valid: false, errors: ["evidence is not exactly one JSON value"], predicate_results: [] }; }
  if (evidence?.schema_version === "oddspark.local-full-request-spend/v1") {
    return structuredFailure(`spend receipt state ${String(evidence.state)} is not qualification evidence; retained run is incomplete`, evidence);
  }
  if (evidence?.schema_version !== "oddspark.local-full-request-evidence/v1") {
    return structuredFailure("input is incomplete or is not LOCAL-FULL-REQUEST evidence", evidence);
  }
  const requiredEvidenceKeys = ["plan_sha256", "approval_sha256", "authorities", "run", "attempts", "strike", "outcome", "commit", "render", "content_hashes", "predicate_results", "full_request_ref"];
  if (!requiredEvidenceKeys.every((key) => Object.hasOwn(evidence, key))) {
    return structuredFailure("LOCAL-FULL-REQUEST evidence is incomplete", evidence);
  }
  try {
  try { plan = JSON.parse(Buffer.from(planBytes).toString("utf8")); } catch { plan = null; }
  try { approval = JSON.parse(Buffer.from(approvalBytes).toString("utf8")); } catch { approval = null; }
  const checks = new Map();
  const put = (id, pass, detail) => { checks.set(id, result(id, Boolean(pass), detail)); if (!pass) failures.push(`${id}${detail ? `: ${detail}` : ""}`); };
  put("plan.approval_binding", validatePlan(plan) && evidence.plan_sha256 === sha256(planBytes)
    && evidence.approval_sha256 === sha256(approvalBytes) && validateApproval(approval, planBytes, Date.parse(evidence.run.started_at)), "plan or approval identity mismatch");
  put("authority.assembly", evidence.authorities?.assembly_identity === plan?.authorities?.assembly_identity, "assembly identity mismatch");
  put("authority.structural_refs", ["generation_ref", "generation_role_ref", "judge_ref", "house_catalog_ref", "priors_ref"].every((key) => evidence.authorities?.[key] === plan?.authorities?.[key]), "structural/content authority mismatch");
  const attempts = Array.isArray(evidence.attempts) ? evidence.attempts : [];
  const calls = attempts.flatMap((attempt) => [attempt.generation, attempt.judge].filter(Boolean));
  put("accounting.call_cap", evidence.run?.calls_started === calls.length && calls.length <= plan?.limits?.call_cap, "call count exceeds or disagrees with retained calls");
  put("accounting.attempt_cap", attempts.length <= plan?.limits?.attempt_cap && attempts.every((attempt, index) => attempt.sequence === index + 1), "attempt chronology exceeds ceiling");
  put("accounting.judge_binding", attempts.every((attempt) => (!attempt.generation?.success || exactSha(attempt.candidate_ref))
    && (!attempt.judge || (attempt.judge.candidate_ref === attempt.candidate_ref && attempt.judge.calls === 1))
    && (attempt.terminal !== "accepted" || (attempt.judge?.candidate_ref === attempt.candidate_ref && attempt.judge.calls === 1))), "candidate or judge call is unbound/repeated");
  put("accounting.deterministic_release", attempts.every((attempt) => attempt.deterministic?.pass !== false || attempt.judge === null), "deterministic rejection consumed a judge slot");
  put("accounting.house_never_judged", evidence.outcome?.source !== "house" || !calls.some((call) => call.stage === "house"), "house Brief was judged");
  put("deadline.route_ceiling", finiteNonnegative(evidence.run?.elapsed_ms) && evidence.run.elapsed_ms <= plan?.limits?.route_ceiling_ms, "route ceiling exceeded");
  put("deadline.commit_reserve", evidence.run?.commit_reserve_observed === true && evidence.run?.remaining_before_commit_ms >= plan?.limits?.commit_reserve_ms, "commit reserve missing");
  put("chronology.complete", attempts.every((attempt) => typeof attempt.terminal === "string" && attempt.terminal !== "ambiguous"
    && !(attempt.generation?.success === true && attempt.terminal === "provider_failed")) && evidence.run?.terminal === true, "attempt or run is incomplete, ambiguous, or misclassified");
  put("commit.authoritative", evidence.commit?.confirmed === true && evidence.commit?.coordinator_status === "committed" && exactSha(evidence.commit?.receipt_sha256), "authoritative commit not confirmed");
  put("render.complete", evidence.render?.completed === true && exactSha(evidence.render?.sha256) && Number.isSafeInteger(evidence.render?.bytes), "render evidence missing");
  put("telemetry.retained", strikeLedgerRetained(evidence.strike) && calls.every((call) => finiteNonnegative(call.latency_ms) && (call.timeout_ms === null || Number.isSafeInteger(call.timeout_ms))
    && exactSha(call.request_sha256) && exactSha(call.response_sha256) && Number.isSafeInteger(call.usage?.input_tokens)
    && Number.isSafeInteger(call.usage?.output_tokens) && finiteNonnegative(call.cost_usd) && providerErrorRetained(call)), "call telemetry, provider error detail, or strike ledger incomplete");
  const inputPrice = plan?.pricing?.input_usd_per_token; const outputPrice = plan?.pricing?.output_usd_per_token;
  const recomputed = finiteNonnegative(inputPrice) && finiteNonnegative(outputPrice)
    ? calls.reduce((sum, call) => sum + call.usage.input_tokens * inputPrice + call.usage.output_tokens * outputPrice, 0) : Number.NaN;
  put("cost.recomputed", Number.isFinite(recomputed) && Math.abs(recomputed - evidence.run?.cost_usd) < 1e-12 && recomputed <= plan?.limits?.maximum_cost_usd, "cost mismatch or cap exceeded");
  put("retry.orchestrator_only", attempts.every((attempt) => attempt.external_retries === 0), "external retry retained");
  put("evidence.content_hashes", Object.values(evidence.content_hashes ?? {}).length > 0 && Object.values(evidence.content_hashes ?? {}).every(exactSha)
    && evidence.content_hashes?.priors_approval_identity === plan?.authorities?.priors_ref, "content hashes or priors authority missing");
  const predicateResults = PREDICATES.map((id) => checks.get(id));
  const predicatesExact = canonicalBytes(evidence.predicate_results).equals(canonicalBytes(predicateResults));
  if (!predicatesExact) failures.push("predicate_results are not independently reproduced");
  const valid = failures.length === 0;
  if (valid && evidence.full_request_ref !== deriveFullRequestRef(evidence)) failures.push("full_request_ref mismatch");
  if (!valid && evidence.full_request_ref !== null) failures.push("failed evidence emitted a ref");
  return { valid: failures.length === 0, errors: failures, predicate_results: predicateResults };
  } catch (error) {
    return structuredFailure(`evidence verification was incomplete: ${error instanceof Error ? error.message : String(error)}`, evidence);
  }
}

export function finalizeEvidence(evidence, inputs) {
  const first = verifyEvidenceBytes(Buffer.from(JSON.stringify({ ...evidence, full_request_ref: null, predicate_results: [] })), inputs);
  const prepared = { ...evidence, predicate_results: first.predicate_results, full_request_ref: null };
  const second = verifyEvidenceBytes(Buffer.from(JSON.stringify(prepared)), inputs);
  if (second.errors.length === 1 && second.errors[0] === "full_request_ref mismatch") prepared.full_request_ref = deriveFullRequestRef(prepared);
  return prepared;
}

export const canonicalEvidenceBytes = canonicalBytes;
