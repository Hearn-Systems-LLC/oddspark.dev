import { createHash } from "node:crypto";
import runtimeAssembly from "../../runtime-assembly.json" with { type: "json" };

export const ASSEMBLY_IDENTITY = "7971844c5779fe1a435970eef522cd2c23f9b7c121708f6675299e58aff96ed6";
export const CURRENT_ASSEMBLY_IDENTITY = runtimeAssembly.assembly_identity_sha256;
export const GENERATION_REF = "34731e26b1c1ef79acd444ba8e775143d9a616c3ab915f52481bd81475796bfc";
export const GENERATION_ROLE_REF = "5cf5a547b29d31304af686c610da9c4c5959299faf12d434db28493de92404b1";
export const JUDGE_REF = "7dc1ec98a625a1dd16f1166067b496e4209a415e7f10854ff781f46d0d0062d0";
export const HOUSE_CATALOG_REF = "9334910e17f7fa610ee2a18d54b1485bf19d00b866f8e7cd8f5258a0d17e9ad8";
export const PRIORS_REF = "2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded";
export const CALL_CAP = 6;
export const ATTEMPT_CAP = 3;
export const providerTimeoutFor = ({ route_ceiling_ms, commit_reserve_ms, call_cap }) =>
  Math.floor((route_ceiling_ms - commit_reserve_ms) / call_cap);
export const PREDICATES = Object.freeze([
  "plan.approval_binding", "authority.assembly", "authority.structural_refs",
  "accounting.call_cap", "accounting.attempt_cap", "accounting.judge_binding",
  "accounting.deterministic_release", "accounting.house_never_judged",
  "deadline.route_ceiling", "deadline.commit_reserve", "chronology.complete",
  "commit.authoritative", "render.complete", "telemetry.retained",
  "cost.recomputed", "retry.orchestrator_only", "evidence.content_hashes",
]);

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const canonicalBytes = (value) => Buffer.from(`${stable(value)}\n`);

const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const closed = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function validatePlan(plan) {
  const diagnostic = plan?.schema_version === "oddspark.local-full-request-diagnostic-plan/v1";
  const keys = ["schema_version", "run_id", "status", "approval", "execution", "allowance_consumed", "request", "authorities", "limits", "pricing", "retention", "schedule", "predicates", ...(diagnostic ? ["purpose"] : [])];
  if (!closed(plan, keys)) return false;
  if (!diagnostic && plan.schema_version !== "oddspark.local-full-request-plan/v1") return false;
  if (!UUID.test(plan.run_id)
      || plan.status !== "unapproved" || plan.approval !== null || plan.execution !== null
      || plan.allowance_consumed !== false) return false;
  if (diagnostic && (!closed(plan.purpose, ["kind", "generation_calls", "request_shape", "max_tokens"])
      || plan.purpose.kind !== "provider_error_capture" || plan.purpose.generation_calls !== 1
      || plan.purpose.request_shape !== "frozen_production_generation"
      || plan.purpose.max_tokens !== 2048)) return false;
  if (!closed(plan.authorities, ["assembly_identity", "generation_ref", "generation_role_ref", "judge_ref", "house_catalog_ref", "priors_ref", "activation_version"])) return false;
  const legacyAuthorities = plan.authorities.assembly_identity === ASSEMBLY_IDENTITY && plan.authorities.generation_ref === GENERATION_REF
    && plan.authorities.generation_role_ref === GENERATION_ROLE_REF && plan.authorities.judge_ref === JUDGE_REF;
  const currentAuthorities = plan.authorities.assembly_identity === CURRENT_ASSEMBLY_IDENTITY
    && [plan.authorities.generation_ref, plan.authorities.generation_role_ref, plan.authorities.judge_ref].every((value) => SHA.test(value));
  if ((!legacyAuthorities && !currentAuthorities) || plan.authorities.house_catalog_ref !== HOUSE_CATALOG_REF
      || plan.authorities.priors_ref !== PRIORS_REF || plan.authorities.activation_version !== 2) return false;
  if (!closed(plan.limits, ["route_ceiling_ms", "commit_reserve_ms", "provider_timeout_ms", "call_cap", "attempt_cap", "maximum_cost_usd"])
      || plan.limits.call_cap !== (diagnostic ? 1 : CALL_CAP) || plan.limits.attempt_cap !== (diagnostic ? 1 : ATTEMPT_CAP)
      || !Number.isSafeInteger(plan.limits.route_ceiling_ms) || !Number.isSafeInteger(plan.limits.commit_reserve_ms)
      || plan.limits.provider_timeout_ms !== providerTimeoutFor(plan.limits)
      || plan.limits.provider_timeout_ms <= 0
      || plan.limits.commit_reserve_ms <= 0 || plan.limits.commit_reserve_ms >= plan.limits.route_ceiling_ms
      || !(plan.limits.maximum_cost_usd > 0)
      || (diagnostic && (plan.limits.route_ceiling_ms !== 30000 || plan.limits.commit_reserve_ms !== 1000
        || plan.limits.maximum_cost_usd !== 0.01))) return false;
  if (!closed(plan.request, ["strike_timestamp", "dispatch"]) || !Number.isFinite(Date.parse(plan.request.strike_timestamp))
      || !closed(plan.request.dispatch, ["contract", "request_scope", "effective_mode", "claim_key", "notice_identity", "notice", "scan_allowed", "evidence_provider_allowed", "permalink_allowed"])) return false;
  return Array.isArray(plan.retention) && new Set(plan.retention).size === plan.retention.length
    && Array.isArray(plan.schedule) && plan.schedule.length === (diagnostic ? 1 : ATTEMPT_CAP)
    && (!diagnostic || closed(plan.schedule[0], ["attempt", "role", "generation_slots", "judge_slots"])
      && plan.schedule[0].attempt === 1 && plan.schedule[0].role === "diagnostic"
      && JSON.stringify(plan.schedule[0].generation_slots) === "[1]" && JSON.stringify(plan.schedule[0].judge_slots) === "[]")
    && JSON.stringify(plan.predicates) === JSON.stringify(PREDICATES);
}

export function validateApproval(approval, planBytes, now = Date.now()) {
  if (!closed(approval, ["schema_version", "run_id", "plan_sha256", "approved_by", "approved_at", "expires_at", "decision"])) return false;
  const approved = Date.parse(approval.approved_at); const expires = Date.parse(approval.expires_at);
  return approval.schema_version === "oddspark.local-full-request-approval/v1" && approval.decision === "approved"
    && approval.plan_sha256 === sha256(planBytes) && typeof approval.approved_by === "string" && approval.approved_by.trim() !== ""
    && Number.isFinite(approved) && Number.isFinite(expires) && approved <= now && now < expires;
}

export function deriveFullRequestRef(evidence) {
  const copy = structuredClone(evidence);
  delete copy.full_request_ref;
  delete copy.predicate_results;
  return sha256(Buffer.concat([Buffer.from("oddspark-local-full-request/v1\n"), canonicalBytes(copy)]));
}

export function exactSha(value) { return typeof value === "string" && SHA.test(value); }
