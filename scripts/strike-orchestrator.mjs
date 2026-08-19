import { createHash } from "node:crypto";

import {
  CANDIDATE_SCHEMA_VERSION,
  buildEvidence,
  canonicalJson,
  deepFreeze,
  deriveCandidateRef,
  validateAttemptContext,
} from "./brief-contracts.mjs";
import { COMPOSITE_GATE_CODES } from "./composite-gate.mjs";
import { selectHouseBrief, verifyApproval } from "./house-briefs.mjs";

export const STRIKE_CODES = deepFreeze({
  ACCEPTED: "accepted",
  HOUSE_ACCEPTED: "house_accepted",
  INVALID_REQUEST: "invalid_request",
  HOUSE_UNAVAILABLE: "house_unavailable",
  COORDINATOR_UNCERTAIN: "coordinator_uncertain",
  DEADLINE_EXCEEDED: "deadline_exceeded",
});

const SHA256 = /^[a-f0-9]{64}$/;
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function snapshot(value, path = "value", seen = new Set(), depth = 0) {
  if (depth > 64) throw new TypeError(`${path} exceeds maximum depth`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || seen.has(value)) throw new TypeError(`${path} is not plain JSON`);
  const proto = Reflect.getPrototypeOf(value);
  const keys = Reflect.ownKeys(value);
  if ((!Array.isArray(value) && ![Object.prototype, null].includes(proto)) || keys.some((key) => typeof key !== "string")) throw new TypeError(`${path} is not plain JSON`);
  const descriptors = keys.map((key) => [key, Reflect.getOwnPropertyDescriptor(value, key)]);
  for (const [key, descriptor] of descriptors) {
    if (Array.isArray(value) && key === "length") continue;
    if (!descriptor?.enumerable || !("value" in descriptor)) throw new TypeError(`${path}.${key} is not a data property`);
  }
  const valueDescriptors = descriptors.filter(([key]) => key !== "length");
  if (Array.isArray(value) && (valueDescriptors.length !== value.length || valueDescriptors.some(([key], index) => key !== String(index)))) throw new TypeError(`${path} is not a dense array`);
  seen.add(value);
  const copy = Array.isArray(value) ? [] : Object.create(null);
  for (const [key, descriptor] of valueDescriptors) Object.defineProperty(copy, key, {
    value: snapshot(descriptor.value, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`, seen, depth + 1),
    enumerable: true, writable: true, configurable: true,
  });
  seen.delete(value);
  return copy;
}

function closed(value, keys) {
  if (!plain(value)) return false;
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && keys.every((key) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && "value" in descriptor;
  });
}

function data(value, key) {
  try {
    const descriptor = value && (typeof value === "object" || typeof value === "function")
      ? Reflect.getOwnPropertyDescriptor(value, key) : null;
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch { return undefined; }
}

function safeIssues(issues) {
  try {
    if (!Array.isArray(issues)) return [];
    const length = data(issues, "length");
    if (!Number.isSafeInteger(length) || length < 0 || length > 100) return [{ rule: "dependency_failure" }];
    const safeIssuesList = [];
    for (let index = 0; index < length; index += 1) {
      const entry = data(issues, String(index));
      let prototype; let keys;
      try { prototype = Reflect.getPrototypeOf(entry); keys = Reflect.ownKeys(entry); } catch { safeIssuesList.push({ rule: "dependency_failure" }); continue; }
      if (entry === null || typeof entry !== "object" || Array.isArray(entry) || ![Object.prototype, null].includes(prototype) || keys.some((key) => typeof key !== "string")) {
        safeIssuesList.push({ rule: "dependency_failure" }); continue;
      }
      const safe = {};
      for (const key of ["artifact", "path", "rule", "location"]) {
        const value = data(entry, key);
        if (typeof value === "string") safe[key] = value;
      }
      safeIssuesList.push(Object.keys(safe).length ? safe : { rule: "dependency_failure" });
    }
    return safeIssuesList;
  } catch { return [{ rule: "dependency_failure" }]; }
}

function seedFor(seed, attempt) {
  return createHash("sha256").update(`oddspark-strike/v1\n${seed}\n${attempt}`, "utf8").digest("hex");
}

function result(code, ledger, calls, extra = {}) {
  return deepFreeze({ ok: code === STRIKE_CODES.ACCEPTED || code === STRIKE_CODES.HOUSE_ACCEPTED, code, model_calls: calls, ledger: snapshot(ledger), ...snapshot(extra) });
}

function coordinatorStatus(value) {
  try {
    if (!closed(value, ["status"])) return null;
    const status = data(value, "status");
    return status === "committed" || status === "resolved" ? status : null;
  } catch { return null; }
}

function clock(now) {
  try {
    const value = now();
    return Number.isFinite(value) ? { ok: true, value } : { ok: false };
  } catch { return { ok: false }; }
}

function attemptMatches(attemptContext, candidate, evidence, rubricVersion, candidateRef, attemptId) {
  try {
    const validation = validateAttemptContext(attemptContext);
    return validation.valid
      && attemptContext.attempt_id === attemptId
      && attemptContext.rubric_version === rubricVersion
      && attemptContext.candidate_ref === candidateRef
      && canonicalJson(attemptContext.candidate) === canonicalJson(candidate)
      && canonicalJson(attemptContext.evidence) === canonicalJson(evidence);
  } catch { return false; }
}

/**
 * Pure generation-to-coordinator orchestration. All effectful stages, including
 * the clock and coordinator, are supplied by the caller.
 */
export async function runStrikeOrchestrator(input, dependencies) {
  const ledger = [];
  let request; let deps;
  try {
    const inputKeys = ["evidence", "evidence_calls", "rubric_version", "seed", "season_id", "selection_key", "deadline_ms", "minimum_call_time_ms"];
    const dependencyKeys = ["generate", "gate", "primary", "fallback", "house", "coordinator", "now"];
    if (!closed(input, inputKeys) || !closed(dependencies, dependencyKeys)) throw new TypeError("closed input and dependencies are required");
    request = snapshot(input, "input");
    for (const key of ["generate", "gate", "coordinator", "now"]) if (typeof data(dependencies, key) !== "function") throw new TypeError(`${key} must be a function`);
    for (const role of ["primary", "fallback"]) if (!closed(data(dependencies, role), ["generation", "gate"])) throw new TypeError(`${role} must bind separate generation and gate dependencies`);
    const house = snapshot(data(dependencies, "house"), "dependencies.house");
    deps = { generate: data(dependencies, "generate"), gate: data(dependencies, "gate"), coordinator: data(dependencies, "coordinator"), now: data(dependencies, "now"), primary: data(dependencies, "primary"), fallback: data(dependencies, "fallback"), house };
    request.evidence = buildEvidence(request.evidence);
    if (!Number.isInteger(request.evidence_calls) || request.evidence_calls < 0 || request.evidence_calls > 6) throw new TypeError("evidence_calls must be an integer from zero through six");
    if (!SHA256.test(request.seed) || typeof request.rubric_version !== "string" || request.rubric_version.trim() === "") throw new TypeError("canonical seed and rubric_version are required");
    if (!Number.isSafeInteger(request.deadline_ms) || request.deadline_ms < 0 || !Number.isSafeInteger(request.minimum_call_time_ms) || request.minimum_call_time_ms < 0 || request.minimum_call_time_ms > Math.floor(Number.MAX_SAFE_INTEGER / 2)) throw new TypeError("deadline values must be safe non-negative integers");
    request = deepFreeze(request);
  } catch {
    return result(STRIKE_CODES.INVALID_REQUEST, [{ event: "request_rejected" }], 0);
  }

  ledger.push({ event: "evidence_calls_recorded", count: request.evidence_calls });
  const ceiling = Math.min(3, Math.floor((6 - request.evidence_calls) / 2));
  let calls = request.evidence_calls;
  const judged = new Set();
  let accepted = null;

  for (let index = 0; index < ceiling; index += 1) {
    const pairClock = clock(deps.now);
    if (!pairClock.ok) {
      ledger.push({ event: "clock_failure", attempt: index + 1, phase: "pair_admission" });
      break;
    }
    if (request.deadline_ms - pairClock.value < request.minimum_call_time_ms * 2 || 6 - calls < 2) {
      ledger.push({ event: "pair_not_admitted", attempt: index + 1, reason: request.deadline_ms - pairClock.value < request.minimum_call_time_ms * 2 ? "deadline" : "capacity" });
      break;
    }
    const role = index === 0 ? "primary" : "fallback";
    const roleDependencies = deps[role];
    ledger.push({ event: "pair_reserved", attempt: index + 1, role, generation_slot: calls + 1, judge_slot: calls + 2 });
    let generated;
    try {
      generated = await deps.generate({ evidence: request.evidence, seed: seedFor(request.seed, index + 1) }, data(roleDependencies, "generation"));
      const reportedCalls = data(generated, "model_calls");
      const invoked = reportedCalls === 0 ? 0 : 1;
      calls += invoked;
    } catch (error) {
      const invoked = data(error, "model_calls") === 0 ? 0 : 1;
      calls += invoked;
      ledger.push({ event: "generation_rejected", attempt: index + 1, role, invoked });
      continue;
    }
    const generatedCandidate = data(generated, "candidate");
    const claimedCandidateRef = data(generated, "candidate_ref");
    let candidateRef;
    try { candidateRef = deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, generatedCandidate); } catch { candidateRef = null; }
    const generationCalls = data(generated, "model_calls");
    if (!candidateRef || claimedCandidateRef !== candidateRef || generationCalls !== 1) {
      ledger.push({ event: "generation_rejected", attempt: index + 1, role, invoked: generationCalls === 0 ? 0 : 1, code: "invalid_result", ...(candidateRef ? { candidate_ref: candidateRef } : {}) });
      continue;
    }
    ledger.push({ event: "generation_completed", attempt: index + 1, role, invoked: 1, candidate_ref: candidateRef });
    if (judged.has(candidateRef)) {
      ledger.push({ event: "candidate_duplicate", attempt: index + 1, role, candidate_ref: candidateRef });
      continue;
    }
    const judgeClock = clock(deps.now);
    if (!judgeClock.ok) {
      ledger.push({ event: "clock_failure", attempt: index + 1, phase: "judge_admission", candidate_ref: candidateRef });
      break;
    }
    if (request.deadline_ms - judgeClock.value < request.minimum_call_time_ms || 6 - calls < 1) {
      ledger.push({ event: "judge_not_admitted", attempt: index + 1, role, reason: request.deadline_ms - judgeClock.value < request.minimum_call_time_ms ? "deadline" : "capacity", candidate_ref: candidateRef });
      break;
    }
    let gated;
    try {
      gated = await deps.gate({
        evidence_context: { attempt_id: `strike-${index + 1}`, evidence: request.evidence, rubric_version: request.rubric_version },
        candidate: generatedCandidate,
      }, data(roleDependencies, "gate"));
    } catch {
      calls += 1;
      judged.add(candidateRef);
      ledger.push({ event: "judge_rejected", attempt: index + 1, role, code: "stage_failure", candidate_ref: candidateRef });
      continue;
    }
    const reportedJudgeCalls = data(gated, "judge_calls");
    const judgeCalls = reportedJudgeCalls === 0 ? 0 : 1;
    calls += judgeCalls;
    if (judgeCalls) judged.add(candidateRef);
    const gateCode = data(gated, "code");
    const attemptId = `strike-${index + 1}`;
    const passing = data(gated, "ok") === true && reportedJudgeCalls === 1 && gateCode === COMPOSITE_GATE_CODES.PASSED
      && attemptMatches(data(gated, "attempt_context"), generatedCandidate, request.evidence, request.rubric_version, candidateRef, attemptId);
    if (passing) {
      accepted = { kind: "candidate", attempt_context: data(gated, "attempt_context"), role };
      if (data(gated, "decision") !== undefined) accepted.decision = data(gated, "decision");
      ledger.push({ event: "candidate_accepted", attempt: index + 1, role, candidate_ref: candidateRef });
      break;
    }
    if (gateCode === COMPOSITE_GATE_CODES.LOCAL_REJECTED && reportedJudgeCalls === 0) ledger.push({ event: "judge_reservation_released", attempt: index + 1, role, code: gateCode, candidate_ref: candidateRef, issues: safeIssues(data(gated, "issues")) });
    else {
      ledger.push({ event: "gate_rejected", attempt: index + 1, role, code: typeof gateCode === "string" ? gateCode : "invalid_gate_result", judge_calls: judgeCalls, candidate_ref: candidateRef, issues: safeIssues(data(gated, "issues")) });
      if (reportedJudgeCalls !== 1) break;
    }
  }

  let terminalCode = STRIKE_CODES.ACCEPTED;
  if (!accepted) {
    let approval; let selection;
    try {
      const houseClock = clock(deps.now);
      if (!houseClock.ok) {
        ledger.push({ event: "clock_failure", phase: "house_selection" });
        return result(STRIKE_CODES.HOUSE_UNAVAILABLE, ledger, calls);
      }
      approval = verifyApproval(deps.house.catalog, deps.house.approval, deps.house.authorities, { now: new Date(houseClock.value) });
      if (approval.ready) selection = selectHouseBrief(deps.house.catalog, { season_id: request.season_id, selection_key: request.selection_key }, deps.house.authorities);
    } catch { approval = null; }
    if (!approval?.ready || !selection?.selected) return result(STRIKE_CODES.HOUSE_UNAVAILABLE, [...ledger, { event: "house_rejected" }], calls);
    accepted = { kind: "house", entry: selection.selected, catalog_content_hash: selection.content_hash, approval_identity: deps.house.approval.identity };
    terminalCode = STRIKE_CODES.HOUSE_ACCEPTED;
    ledger.push({ event: "house_selected", house_id: selection.selected.id });
  }

  const postGateClock = clock(deps.now);
  if (!postGateClock.ok) return result(STRIKE_CODES.DEADLINE_EXCEEDED, [...ledger, { event: "clock_failure", phase: "pre_coordinator" }], calls);
  if (postGateClock.value >= request.deadline_ms) return result(STRIKE_CODES.DEADLINE_EXCEEDED, [...ledger, { event: "deadline_exhausted", phase: "pre_coordinator" }], calls);
  let coordinated;
  try { coordinated = await deps.coordinator(deepFreeze(snapshot(accepted, "accepted_source"))); } catch { coordinated = null; }
  const status = coordinatorStatus(coordinated);
  if (!status) return result(STRIKE_CODES.COORDINATOR_UNCERTAIN, [...ledger, { event: "coordinator_uncertain" }], calls);
  ledger.push({ event: "coordinator_confirmed", status });
  return result(terminalCode, ledger, calls, { source: accepted, coordinator: { status } });
}

export const strike = runStrikeOrchestrator;
