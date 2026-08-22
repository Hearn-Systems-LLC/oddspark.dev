import { stableStringify, sha256, ROLE_IDENTITIES, PARAMETERS, TIMEOUT_POLICY, LEGACY_TIMEOUT_POLICY, CALL_CAP, LEGACY_CALL_CAP, GENERATION_PREDICATES, LEGACY_GENERATION_PREDICATES } from "./contract.mjs";
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

// Per-role maximum covers 21 scheduled calls plus 21 transient retries; the schedule below is the exact closed template validated by validatePlan.
const scheduleEntries = (transient) => ROLE_IDENTITIES.map(({ role }) => (transient
  ? { role, probe: 1, trials_after_successful_probe: 20, sequential: true, transient_retries: TIMEOUT_POLICY.transient_retries, retry_states: [...TIMEOUT_POLICY.retry_states], replacements: 0 }
  : { role, probe: 1, trials_after_successful_probe: 20, sequential: true, retries: 0, replacements: 0 }));
export function estimate(requests) {
  const roles = requests.map((request) => { const input_tokens_upper_bound = Buffer.byteLength(stableStringify(request.body), "utf8"); const calls = 42; const rate = BUDGET_PRICING[request.resolved_model]; const input_usd = calls * input_tokens_upper_bound * rate.input_per_million_usd / 1e6; const output_usd = calls * PARAMETERS.max_tokens * rate.output_per_million_usd / 1e6; return { role: request.role, resolved_model: request.resolved_model, calls, input_tokens_upper_bound, max_output_tokens_per_call: PARAMETERS.max_tokens, pricing_exact: rate.exact, input_usd, output_usd, maximum_usd: input_usd + output_usd }; }); return { pricing: PRICING, roles, call_cap: CALL_CAP, maximum_usd: roles.reduce((sum, role) => sum + role.maximum_usd, 0) };
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
  const plan = { schema_version: PLAN_VERSION, plan_ref: "", approval_run_id, created_at, provider: "cloudflare-workers-ai", authority, roles: ROLE_IDENTITIES, parameters: PARAMETERS, timeout_policy: TIMEOUT_POLICY, input, requests, sources, runtime, expected_health: expectedHealth(sources, runtime), estimate: estimate(requests), retention: RETENTION, schedule: scheduleEntries(true), call_cap: CALL_CAP, predicate_ids: GENERATION_PREDICATES };
  plan.plan_ref = derivePlanRef(plan); return plan;
}
export function validateApproval(approval, plan, now = Date.now()) {
  const errors = []; if (!exact(approval, ["schema_version", "plan_ref", "approval_run_id", "approved_at", "approved_by", "approved_call_cap", "approved_maximum_usd", "authorization"])) errors.push("approval is not closed");
  if (approval?.schema_version !== APPROVAL_VERSION || approval?.plan_ref !== plan.plan_ref || approval?.approval_run_id !== plan.approval_run_id) errors.push("approval does not bind the exact plan");
  if (approval?.approved_call_cap !== plan.call_cap || approval?.approved_maximum_usd !== plan.estimate.maximum_usd || approval?.authorization !== "execute-exact-plan-once") errors.push("approval authority differs from plan");
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
export function validatePlan(plan, { input, requests } = {}) {
  const keys = ["schema_version", "plan_ref", "approval_run_id", "created_at", "provider", "authority", "roles", "parameters", "timeout_policy", "input", "requests", "sources", "runtime", "expected_health", "estimate", "retention", "schedule", "call_cap", "predicate_ids"];
  const errors = []; if (!exact(plan, keys)) errors.push("plan is not closed");
  if (plan?.schema_version !== PLAN_VERSION || plan?.provider !== "cloudflare-workers-ai" || plan?.plan_ref !== derivePlanRef(plan)) errors.push("plan identity is invalid");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(plan?.approval_run_id ?? "") || !Number.isFinite(Date.parse(plan?.created_at)) || new Date(plan.created_at).toISOString() !== plan.created_at) errors.push("plan metadata is invalid");
  if (!exact(plan?.authority, ["account_profile", "credential_path", "headroom_confirmed"]) || typeof plan.authority.account_profile !== "string" || plan.authority.account_profile.trim() === "" || plan.authority.credential_path !== "wrangler-remote-binding" || plan.authority.headroom_confirmed !== true) errors.push("plan authority is invalid");
  // A plan binds its own governance generation: the current transient-retry policy or the exact legacy zero-retry policy; cap, schedule, and predicate ids follow the embedded policy.
  const transient = stableStringify(plan?.timeout_policy) === stableStringify(TIMEOUT_POLICY);
  const legacy = stableStringify(plan?.timeout_policy) === stableStringify(LEGACY_TIMEOUT_POLICY);
  if (!transient && !legacy) errors.push("plan timeout policy drifted");
  const expectedCap = transient ? CALL_CAP : LEGACY_CALL_CAP;
  const expectedPredicates = transient ? GENERATION_PREDICATES : LEGACY_GENERATION_PREDICATES;
  for (const [actual, expected, label] of [[plan?.roles, ROLE_IDENTITIES, "roles"], [plan?.parameters, PARAMETERS, "parameters"], [plan?.input, input, "input"], [plan?.requests, requests, "requests"], [plan?.retention, RETENTION, "retention"], [plan?.predicate_ids, expectedPredicates, "predicates"], [plan?.schedule, (transient || legacy) ? scheduleEntries(transient) : null, "schedule"]]) if (stableStringify(actual) !== stableStringify(expected)) errors.push(`plan ${label} drifted`);
  if (plan?.call_cap !== expectedCap) errors.push("plan cap drifted");
  if (!Array.isArray(plan?.sources) || !exact(plan?.runtime, ["path", "bytes", "sha256", "runtime_identity_sha256", "node", "wrangler"]) || stableStringify(plan?.expected_health) !== stableStringify(expectedHealth(plan.sources, plan.runtime))) errors.push("plan sources, runtime, or health drifted");
  const estimateCheck = (value) => exact(value, ["pricing", "roles", "call_cap", "maximum_usd"]) && value.call_cap === expectedCap && stableStringify(value.pricing) === stableStringify(PRICING) && Array.isArray(value.roles) && value.roles.length === ROLE_IDENTITIES.length && value.roles.every((role, index) => exact(role, ["role", "resolved_model", "calls", "input_tokens_upper_bound", "max_output_tokens_per_call", "pricing_exact", "input_usd", "output_usd", "maximum_usd"]) && role.role === ROLE_IDENTITIES[index].role && role.resolved_model === ROLE_IDENTITIES[index].resolved_model && Number.isSafeInteger(role.calls) && role.calls >= 1 && role.input_tokens_upper_bound === Buffer.byteLength(stableStringify(requests?.[index]?.body ?? null), "utf8") && role.max_output_tokens_per_call === PARAMETERS.max_tokens && typeof role.pricing_exact === "boolean" && [role.input_usd, role.output_usd].every((usd) => typeof usd === "number" && Number.isFinite(usd) && usd >= 0) && role.maximum_usd === role.input_usd + role.output_usd) && typeof value.maximum_usd === "number" && value.maximum_usd === value.roles.reduce((sum, role) => sum + role.maximum_usd, 0);
  if (!estimateCheck(plan?.estimate)) errors.push("plan pricing drifted");
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
