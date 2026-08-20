import { stableStringify, sha256, ROLE_IDENTITIES, PARAMETERS, TIMEOUT_POLICY, CALL_CAP, GENERATION_PREDICATES } from "./contract.mjs";
import { requestManifest, sourceIdentity, runtimeIdentity, expectedHealth } from "./evidence-v2.mjs";
import { BUDGET_PRICING, MODEL_PRICING, PRICING_AS_OF, PRICING_DISCLOSURE, PRICING_SOURCE } from "./pricing.mjs";

export const PLAN_VERSION = "oddspark.generation-qualification-plan/v2";
export const APPROVAL_VERSION = "oddspark.generation-qualification-approval/v2";
export const MANIFEST_VERSION = "STRUCT-GENERATION/v2";
export const QUALIFICATION_DOMAIN = "oddspark-struct-generation-qualification/v2";
export const PLAN_DOMAIN = "oddspark-generation-qualification-plan/v2";
export const CYCLE_DOMAIN = "oddspark-generation-role-cycle/v1";
export const ROLE_QUALIFICATION_DOMAIN = "oddspark-generation-role-qualification/v1";
export const APPROVAL_MAX_AGE_MS = 4 * 60 * 60 * 1000;
export const RETENTION = Object.freeze({ provider_retention_disclosed: true, retained_locally: ["plan", "approval", "records", "bounded output envelopes", "usage", "latency", "cost", "source/runtime/adapter identities", "predicate results", "manifests", "completion marker"], forbidden: ["credentials", "account identifiers", "provider reasoning", "unbounded raw output"] });
export const PRICING = Object.freeze({ as_of: PRICING_AS_OF, source: PRICING_SOURCE, disclosure: PRICING_DISCLOSURE, currency: "USD", observed: MODEL_PRICING, budget: BUDGET_PRICING });
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function estimate(requests) {
  const roles = requests.map((request) => { const input_tokens_upper_bound = Buffer.byteLength(stableStringify(request.body), "utf8"); const calls = 21; const rate = BUDGET_PRICING[request.resolved_model]; const input_usd = calls * input_tokens_upper_bound * rate.input_per_million_usd / 1e6; const output_usd = calls * PARAMETERS.max_tokens * rate.output_per_million_usd / 1e6; return { role: request.role, resolved_model: request.resolved_model, calls, input_tokens_upper_bound, max_output_tokens_per_call: PARAMETERS.max_tokens, pricing_exact: rate.exact, input_usd, output_usd, maximum_usd: input_usd + output_usd }; }); return { pricing: PRICING, roles, call_cap: CALL_CAP, maximum_usd: roles.reduce((sum, role) => sum + role.maximum_usd, 0) };
}
function withoutRef(value, key) { const clone = structuredClone(value); delete clone[key]; return clone; }
export function derivePlanRef(plan) { return sha256(`${PLAN_DOMAIN}\n${stableStringify(withoutRef(plan, "plan_ref"))}`); }
export function deriveQualificationRef(manifest) { return sha256(`${QUALIFICATION_DOMAIN}\n${stableStringify(manifest)}`); }
export function deriveCycleRef(value) { return sha256(`${CYCLE_DOMAIN}\n${stableStringify(value)}`); }
export function deriveRoleQualificationRef(value) { return sha256(`${ROLE_QUALIFICATION_DOMAIN}\n${stableStringify(value)}`); }
export async function createPlan({ approval_run_id, created_at = new Date().toISOString(), input, authority }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(approval_run_id)) throw new TypeError("approval_run_id is invalid");
  if (!exact(authority, ["account_profile", "credential_path", "headroom_confirmed"]) || typeof authority.account_profile !== "string" || authority.account_profile.trim() === "" || authority.credential_path !== "wrangler-remote-binding" || authority.headroom_confirmed !== true) throw new TypeError("authority must be the closed reviewed provider authority");
  const requests = requestManifest(input); const sources = await sourceIdentity(); const runtime = await runtimeIdentity();
  const plan = { schema_version: PLAN_VERSION, plan_ref: "", approval_run_id, created_at, provider: "cloudflare-workers-ai", authority, roles: ROLE_IDENTITIES, parameters: PARAMETERS, timeout_policy: TIMEOUT_POLICY, input, requests, sources, runtime, expected_health: expectedHealth(sources, runtime), estimate: estimate(requests), retention: RETENTION, schedule: ROLE_IDENTITIES.map(({ role }) => ({ role, probe: 1, trials_after_successful_probe: 20, sequential: true, retries: 0, replacements: 0 })), call_cap: CALL_CAP, predicate_ids: GENERATION_PREDICATES };
  plan.plan_ref = derivePlanRef(plan); return plan;
}
export function validateApproval(approval, plan, now = Date.now()) {
  const errors = []; if (!exact(approval, ["schema_version", "plan_ref", "approval_run_id", "approved_at", "approved_by", "approved_call_cap", "approved_maximum_usd", "authorization"])) errors.push("approval is not closed");
  if (approval?.schema_version !== APPROVAL_VERSION || approval?.plan_ref !== plan.plan_ref || approval?.approval_run_id !== plan.approval_run_id) errors.push("approval does not bind the exact plan");
  if (approval?.approved_call_cap !== CALL_CAP || approval?.approved_maximum_usd !== plan.estimate.maximum_usd || approval?.authorization !== "execute-exact-plan-once") errors.push("approval authority differs from plan");
  const approvedAt = Date.parse(approval?.approved_at); const createdAt = Date.parse(plan.created_at); if (!Number.isFinite(approvedAt) || new Date(approvedAt).toISOString() !== approval?.approved_at || approvedAt < createdAt || approvedAt > now || now - approvedAt > APPROVAL_MAX_AGE_MS) errors.push("approval is stale or temporally invalid");
  if (typeof approval?.approved_by !== "string" || approval.approved_by.trim() === "") errors.push("approved_by is required"); return { valid: errors.length === 0, errors };
}
export function costForUsage(model, usage) {
  if (usage === null) return null;
  if (!exact(usage, ["input_tokens", "output_tokens"]) || ![usage.input_tokens, usage.output_tokens].every((value) => Number.isSafeInteger(value) && value >= 0)) return undefined;
  const rate = MODEL_PRICING[model];
  if (!rate) return null;
  return usage.input_tokens * rate.input_per_million_usd / 1e6 + usage.output_tokens * rate.output_per_million_usd / 1e6;
}
export function validatePlan(plan, { input, requests, sources, runtime, expected_health } = {}) {
  const keys = ["schema_version", "plan_ref", "approval_run_id", "created_at", "provider", "authority", "roles", "parameters", "timeout_policy", "input", "requests", "sources", "runtime", "expected_health", "estimate", "retention", "schedule", "call_cap", "predicate_ids"];
  const errors = []; if (!exact(plan, keys)) errors.push("plan is not closed");
  if (plan?.schema_version !== PLAN_VERSION || plan?.provider !== "cloudflare-workers-ai" || plan?.plan_ref !== derivePlanRef(plan)) errors.push("plan identity is invalid");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(plan?.approval_run_id ?? "") || !Number.isFinite(Date.parse(plan?.created_at)) || new Date(plan.created_at).toISOString() !== plan.created_at) errors.push("plan metadata is invalid");
  if (!exact(plan?.authority, ["account_profile", "credential_path", "headroom_confirmed"]) || typeof plan.authority.account_profile !== "string" || plan.authority.account_profile.trim() === "" || plan.authority.credential_path !== "wrangler-remote-binding" || plan.authority.headroom_confirmed !== true) errors.push("plan authority is invalid");
  for (const [actual, expected, label] of [[plan?.roles, ROLE_IDENTITIES, "roles"], [plan?.parameters, PARAMETERS, "parameters"], [plan?.timeout_policy, TIMEOUT_POLICY, "timeout policy"], [plan?.input, input, "input"], [plan?.requests, requests, "requests"], [plan?.sources, sources, "sources"], [plan?.runtime, runtime, "runtime"], [plan?.expected_health, expected_health, "health"], [plan?.estimate, estimate(requests ?? []), "pricing"], [plan?.retention, RETENTION, "retention"], [plan?.predicate_ids, GENERATION_PREDICATES, "predicates"]]) if (stableStringify(actual) !== stableStringify(expected)) errors.push(`plan ${label} drifted`);
  const schedule = ROLE_IDENTITIES.map(({ role }) => ({ role, probe: 1, trials_after_successful_probe: 20, sequential: true, retries: 0, replacements: 0 })); if (stableStringify(plan?.schedule) !== stableStringify(schedule) || plan?.call_cap !== CALL_CAP) errors.push("plan schedule or cap drifted");
  return { valid: errors.length === 0, errors };
}
export async function deriveManifests(evidence) {
  const { verifyEvidence } = await import("./evidence-v2.mjs"); const verification = await verifyEvidence(evidence);
  if (!verification.valid || stableStringify(verification.predicate_results) !== stableStringify(evidence.predicate_results) || verification.predicate_results.some(({ pass }) => pass !== true)) throw new Error(`verified evidence is required for qualification authority: ${verification.errors.join("; ")}`);
  const predicateResults = verification.predicate_results;
  const manifests = {}; const refs = {};
  for (const identity of ROLE_IDENTITIES) { const result = evidence.outcome.by_role[identity.role]; const manifest = { schema_version: MANIFEST_VERSION, role: identity.role, provider: "cloudflare-workers-ai", resolved_model: identity.resolved_model, decision: result.decision, reasons: result.reasons, evidence_sha256: sha256(stableStringify(evidence)), source_manifest_sha256: sha256(stableStringify(evidence.sources)), runtime_identity_sha256: evidence.runtime.runtime_identity_sha256, request_sha256: evidence.requests.find(({ role }) => role === identity.role).request_sha256, plan_ref: evidence.approval.plan_ref, predicate_results: predicateResults }; manifests[identity.role] = manifest; refs[identity.role] = result.decision === "GO" ? deriveQualificationRef(manifest) : null; }
  const ordered_members = ROLE_IDENTITIES.filter(({ role }) => refs[role] !== null).map(({ role, resolved_model }) => ({ role, resolved_model, qualification_ref: refs[role] }));
  const cycle_ref = deriveCycleRef({ plan_ref: evidence.plan.plan_ref, evidence_sha256: sha256(stableStringify(evidence)), ordered_members });
  const role_qualification_set = ordered_members.length ? { schema_version: "oddspark.generation-role-qualification-set/v1", role: "generation", cycle_ref, source_manifest_sha256: sha256(stableStringify(evidence.sources)), ordered_members } : null;
  return { manifests, qualification_refs: refs, cycle_ref, role_qualification_set, role_qualification_ref: role_qualification_set ? deriveRoleQualificationRef(role_qualification_set) : null };
}
