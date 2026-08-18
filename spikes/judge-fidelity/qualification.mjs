import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { MODEL_IDS, PREDICATE_ORACLE, stableStringify } from "./contract.mjs";
import { verifyEvidenceV2 } from "./evidence-v2.mjs";
import {
  PRICING_AS_OF,
  PRICING_SOURCE,
  NEURON_USD,
  FREE_NEURONS_PER_DAY,
  MODEL_PRICING,
} from "./pricing.mjs";

export const RECOVERY_PLAN_VERSION = "oddspark.judge-recovery-plan/v1";
export const RECOVERY_APPROVAL_VERSION = "oddspark.judge-recovery-approval/v1";
export const QUALIFICATION_BUNDLE_VERSION = "oddspark.judge-qualification-bundle/v1";
export const QUALIFICATION_MANIFEST_VERSION = 1;
export const RECOVERY_COMPLETION_VERSION = "oddspark.judge-recovery-completion/v1";
export const QUALIFICATION_DOMAIN = "oddspark-qualification/v1";
export const PLAN_DOMAIN = "oddspark-judge-recovery-plan/v1";
export const PROVIDER = "cloudflare-workers-ai";
export const APPROVAL_MAX_AGE_MS = 4 * 60 * 60 * 1000;
export const APPROVAL_PLAN_MAX_DELAY_MS = 60 * 60 * 1000;
export const RECOVERY_CALL_CAP = 42;

export const TIMEOUT_POLICY = Object.freeze({
  adapter_timeout_ms: 120_000,
  preflight_timeout_ms: 10_000,
  probes_must_complete_before_trials: true,
  execution: "sequential",
  retries: 0,
  replacements: 0,
});

export const RETAINED_FIELDS = Object.freeze([
  "plan (full closed recovery plan)", "approval (full closed approval record)",
  "qualification (full closed bundle)",
  "qualification.approval_check", "qualification.evidence", "qualification.manifests",
  "qualification.qualification_refs", "qualification.outcome",
  "evidence.candidate.schema_version", "evidence.candidate.value", "evidence.candidate.ref",
  "evidence.candidate.request_input", "evidence.run.id", "evidence.run.started_at",
  "evidence.run.ended_at", "evidence.run.models", "evidence.run.authorization",
  "evidence.run.preflight_checks", "evidence.run.preflight_blockers",
  "record.kind", "record.model", "record.index", "record.started_at", "record.ended_at",
  "record.call_state", "record.error_code", "record.envelope", "record.usage",
  "record.request_sha256", "record.candidate_ref", "record.classification",
  "record.repair_kind", "record.verdict_sha256", "evidence.runtime", "evidence.sources",
  "evidence.adapter", "evidence.fixtures", "evidence.summary", "evidence.outcome",
  "evidence.predicate_results", "evidence.report", "evidence.oracle", "evidence.legacy",
]);

const hash = (value) => createHash("sha256").update(value).digest("hex");
const hex = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const same = (left, right) => stableStringify(left) === stableStringify(right);
const canonicalTimestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const nonnegativeFinite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const safeNonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

export function canonicalJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

export function parseCanonicalJsonBytes(bytes, label = "JSON record") {
  try {
    const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const parsed = JSON.parse(input.toString("utf8"));
    if (!input.equals(canonicalJsonBytes(parsed))) return { valid: false, errors: [`${label} is not canonical two-space JSON with one trailing newline`], value: null };
    return { valid: true, errors: [], value: parsed };
  } catch (error) {
    return { valid: false, errors: [`${label} is invalid JSON: ${String(error?.message ?? error)}`], value: null };
  }
}

export async function verifyCompletedArtifactSet(directory, markerName, expectedMembers) {
  const errors = [];
  try {
    if (typeof markerName !== "string" || path.basename(markerName) !== markerName) return { valid: false, errors: ["completion marker name is unsafe"], marker: null };
    const markerBytes = await readFile(path.join(directory, markerName));
    const parsed = parseCanonicalJsonBytes(markerBytes, "completion marker");
    if (!parsed.valid) return { valid: false, errors: parsed.errors, marker: null };
    const marker = parsed.value;
    if (!exact(marker, ["schema_version", "basename", "files"]) || marker.schema_version !== RECOVERY_COMPLETION_VERSION
      || markerName !== `${marker.basename}.complete.json` || !Array.isArray(marker.files)) errors.push("completion marker is malformed or misnamed");
    const markerFiles = Array.isArray(marker?.files) ? marker.files : [];
    if (!Array.isArray(expectedMembers) || expectedMembers.length === 0
      || !same(markerFiles.map(({ name }) => name), expectedMembers)) errors.push("completion marker does not bind the exact expected member set");
    const seen = new Set();
    for (const file of markerFiles) {
      if (!exact(file, ["name", "bytes", "sha256"]) || typeof file.name !== "string" || path.basename(file.name) !== file.name
        || seen.has(file.name) || !safeNonnegativeInteger(file.bytes) || !hex(file.sha256)) {
        errors.push("completion marker contains an invalid member");
        continue;
      }
      seen.add(file.name);
      try {
        const memberBytes = await readFile(path.join(directory, file.name));
        if (memberBytes.byteLength !== file.bytes || hash(memberBytes) !== file.sha256) errors.push(`${file.name} does not match its completion binding`);
      } catch (error) {
        errors.push(`${file.name} is missing or unreadable: ${String(error?.code ?? error?.message ?? error)}`);
      }
    }
    return { valid: errors.length === 0, errors, marker };
  } catch (error) {
    return { valid: false, errors: [`completion verification failed: ${String(error?.code ?? error?.message ?? error)}`], marker: null };
  }
}

function safeAdd(left, right) {
  if (!safeNonnegativeInteger(left) || !safeNonnegativeInteger(right) || !Number.isSafeInteger(left + right)) return null;
  return left + right;
}

function expectedMaximumCost(requestManifest) {
  if (!exact(requestManifest, ["by_model"]) || !Array.isArray(requestManifest.by_model) || requestManifest.by_model.length !== MODEL_IDS.length) return null;
  const inputTokenUpperBound = Math.max(...requestManifest.by_model.map((entry) => Buffer.byteLength(JSON.stringify(entry?.body), "utf8")));
  const callsPerModel = 21; // 1 probe + 20 trials per model
  let grossUsd = 0;
  const byModel = {};
  for (const model of MODEL_IDS) {
    const pricing = MODEL_PRICING[model];
    const inputUsd = callsPerModel * inputTokenUpperBound * pricing.input_per_million_usd / 1_000_000;
    const outputUsd = callsPerModel * 2048 * pricing.output_per_million_usd / 1_000_000;
    byModel[model] = { calls: callsPerModel, input_usd: inputUsd, output_usd: outputUsd };
    grossUsd += inputUsd + outputUsd;
  }
  return {
    pricing_as_of: PRICING_AS_OF,
    pricing_source: PRICING_SOURCE,
    input_token_upper_bound_per_request: inputTokenUpperBound,
    max_output_tokens_per_call: 2048,
    calls_per_model: callsPerModel,
    total_calls: RECOVERY_CALL_CAP,
    gross_usd: grossUsd,
    gross_neurons: grossUsd / NEURON_USD,
    free_neurons_per_day: FREE_NEURONS_PER_DAY,
    by_model: byModel,
  };
}

function validRequestManifest(manifest) {
  if (!exact(manifest, ["by_model"]) || !Array.isArray(manifest.by_model) || manifest.by_model.length !== MODEL_IDS.length) return false;
  let candidateIdentity = null;
  return manifest.by_model.every((entry, index) => {
    if (!exact(entry, ["model", "body", "sha256", "adapter_input", "adapter_input_sha256"]) || entry.model !== MODEL_IDS[index] || !plain(entry.body) || !plain(entry.adapter_input)) return false;
    const expectedAdapterInput = { messages: entry.body.messages, max_tokens: entry.body.max_tokens, temperature: entry.body.temperature, response_format: entry.body.response_format };
    const identity = stableStringify({ candidate_schema_version: entry.body.candidate_schema_version, candidate: entry.body.candidate, candidate_ref: entry.body.candidate_ref });
    if (candidateIdentity === null) candidateIdentity = identity;
    return identity === candidateIdentity && entry.body.model === entry.model && entry.body.max_tokens === 2048 && entry.body.temperature === 0
      && entry.body.response_format?.type === "json_schema" && entry.sha256 === hash(stableStringify(entry.body))
      && same(entry.adapter_input, expectedAdapterInput) && entry.adapter_input_sha256 === hash(stableStringify(expectedAdapterInput));
  });
}

function withoutRef(plan) {
  const { plan_ref: _planRef, ...canonical } = plan;
  return canonical;
}

export function derivePlanRef(plan) {
  return hash(`${PLAN_DOMAIN}\n${stableStringify(withoutRef(plan))}`);
}

export function deriveQualificationRef(manifest) {
  return hash(`${QUALIFICATION_DOMAIN}\n${stableStringify(manifest)}`);
}

export function sourceIdentity(sources) {
  return {
    manifest_sha256: hash(stableStringify(sources)),
    entries: sources.map(({ path: sourcePath, bytes, sha256 }) => ({ path: sourcePath, bytes, sha256 })),
  };
}

export function createRecoveryPlan({
  approval_run_id,
  created_at,
  account_profile,
  plan,
  remaining_free_neurons,
  estimate,
  request_manifest,
  sources,
  runtime,
  expected_health,
  legacy,
}) {
  const modelPositions = ["primary", "fallback"];
  const timeoutPolicySha256 = hash(stableStringify(TIMEOUT_POLICY));
  const retainedFieldsSha256 = hash(stableStringify(RETAINED_FIELDS));
  const recoveryPlan = {
    schema_version: RECOVERY_PLAN_VERSION,
    plan_ref: "",
    approval_run_id,
    created_at,
    provider: PROVIDER,
    account: {
      profile: account_profile,
      plan,
      headroom_confirmed: true,
      remaining_free_neurons: plan === "free" ? remaining_free_neurons : null,
    },
    models: MODEL_IDS.map((resolved_model, index) => ({
      position: modelPositions[index],
      resolved_model,
      request_sha256: request_manifest.by_model[index].sha256,
      adapter_input_sha256: request_manifest.by_model[index].adapter_input_sha256,
    })),
    request_parameters: {
      temperature: 0,
      max_tokens: 2048,
      response_format_type: "json_schema",
    },
    request_manifest: structuredClone(request_manifest),
    identities: {
      prompt_template_sha256: expected_health.system_prompt_sha256,
      wire_schema_sha256: expected_health.wire_schema_sha256,
      adapter_sha256: expected_health.adapter_source_sha256,
      binding_version: expected_health.candidate_binding_version,
      runtime_identity_sha256: runtime.runtime_identity_sha256,
      source_identity_sha256: sourceIdentity(sources).manifest_sha256,
      timeout_policy_sha256: timeoutPolicySha256,
      retained_fields_sha256: retainedFieldsSha256,
    },
    timeout_policy: structuredClone(TIMEOUT_POLICY),
    retained_fields: [...RETAINED_FIELDS],
    call_policy: {
      probes_per_model: 1,
      trials_per_model: 20,
      approved_call_cap: RECOVERY_CALL_CAP,
      stop_after_probe_failure: true,
      ci_permitted: false,
      deployment_permitted: false,
      persistent_resources_permitted: false,
    },
    maximum_cost: structuredClone(estimate),
    governance: {
      recovery_allowance: 1,
      prior_operational_recovery: null,
      legacy_v1_evidence_sha256: legacy.find(({ path: legacyPath }) => legacyPath.endsWith(".json"))?.sha256 ?? null,
      third_matrix_permitted: false,
    },
  };
  recoveryPlan.plan_ref = derivePlanRef(recoveryPlan);
  const validation = validateRecoveryPlan(recoveryPlan, { legacy });
  if (!validation.valid) throw new TypeError(`invalid recovery plan: ${validation.errors.join("; ")}`);
  return recoveryPlan;
}

export function validateRecoveryPlan(plan, { legacy } = {}) {
  const errors = [];
  try {
    const top = ["schema_version", "plan_ref", "approval_run_id", "created_at", "provider", "account", "models", "request_parameters", "request_manifest", "identities", "timeout_policy", "retained_fields", "call_policy", "maximum_cost", "governance"];
    if (!exact(plan, top)) return { valid: false, errors: ["recovery plan must be a closed object"] };
  if (plan.schema_version !== RECOVERY_PLAN_VERSION) errors.push("unsupported recovery plan version");
  if (!hex(plan.plan_ref) || plan.plan_ref !== derivePlanRef(plan)) errors.push("plan_ref does not match canonical plan bytes");
  if (typeof plan.approval_run_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(plan.approval_run_id)) errors.push("approval_run_id is invalid");
  if (!canonicalTimestamp(plan.created_at)) errors.push("created_at must be canonical UTC");
  if (plan.provider !== PROVIDER) errors.push("provider is not the frozen provider");
  if (!exact(plan.account, ["profile", "plan", "headroom_confirmed", "remaining_free_neurons"])
    || typeof plan.account.profile !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(plan.account.profile)
    || /^[a-f0-9]{32}$/i.test(plan.account.profile)
    || !["free", "paid"].includes(plan.account.plan) || plan.account.headroom_confirmed !== true
    || (plan.account.plan === "free" && !nonnegativeFinite(plan.account.remaining_free_neurons))
    || (plan.account.plan === "paid" && plan.account.remaining_free_neurons !== null)) errors.push("account/plan/headroom disclosure is invalid");
  if (!Array.isArray(plan.models) || plan.models.length !== MODEL_IDS.length || plan.models.some((model, index) => !exact(model, ["position", "resolved_model", "request_sha256", "adapter_input_sha256"])
    || model.position !== ["primary", "fallback"][index] || model.resolved_model !== MODEL_IDS[index]
    || !hex(model.request_sha256) || !hex(model.adapter_input_sha256))) errors.push("resolved model identities are invalid or reordered");
  if (!exact(plan.request_parameters, ["temperature", "max_tokens", "response_format_type"])
    || plan.request_parameters.temperature !== 0 || plan.request_parameters.max_tokens !== 2048 || plan.request_parameters.response_format_type !== "json_schema") errors.push("request parameters are not frozen");
  if (!validRequestManifest(plan.request_manifest)
    || plan.models.some((model, index) => model.request_sha256 !== plan.request_manifest?.by_model?.[index]?.sha256
      || model.adapter_input_sha256 !== plan.request_manifest?.by_model?.[index]?.adapter_input_sha256)) errors.push("request manifest is invalid or differs from model identities");
  const identityKeys = ["prompt_template_sha256", "wire_schema_sha256", "adapter_sha256", "binding_version", "runtime_identity_sha256", "source_identity_sha256", "timeout_policy_sha256", "retained_fields_sha256"];
  if (!exact(plan.identities, identityKeys) || identityKeys.filter((key) => key !== "binding_version").some((key) => !hex(plan.identities[key]))
    || plan.identities.binding_version !== "oddspark-candidate-ref/v1"
    || plan.identities.timeout_policy_sha256 !== hash(stableStringify(TIMEOUT_POLICY))
    || plan.identities.retained_fields_sha256 !== hash(stableStringify(RETAINED_FIELDS))) errors.push("plan identities are invalid");
  if (!same(plan.timeout_policy, TIMEOUT_POLICY) || !same(plan.retained_fields, RETAINED_FIELDS)) errors.push("timeout policy or retained fields changed");
  if (!exact(plan.call_policy, ["probes_per_model", "trials_per_model", "approved_call_cap", "stop_after_probe_failure", "ci_permitted", "deployment_permitted", "persistent_resources_permitted"])
    || plan.call_policy.probes_per_model !== 1 || plan.call_policy.trials_per_model !== 20 || plan.call_policy.approved_call_cap !== RECOVERY_CALL_CAP
    || plan.call_policy.stop_after_probe_failure !== true || plan.call_policy.ci_permitted !== false
    || plan.call_policy.deployment_permitted !== false || plan.call_policy.persistent_resources_permitted !== false) errors.push("call policy is invalid");
  const maximumCostKeys = ["pricing_as_of", "pricing_source", "input_token_upper_bound_per_request", "max_output_tokens_per_call", "calls_per_model", "total_calls", "gross_usd", "gross_neurons", "free_neurons_per_day", "by_model"];
  const recomputedMaximumCost = validRequestManifest(plan.request_manifest) ? expectedMaximumCost(plan.request_manifest) : null;
  if (!exact(plan.maximum_cost, maximumCostKeys) || !recomputedMaximumCost || !same(plan.maximum_cost, recomputedMaximumCost)) errors.push("maximum-cost disclosure is invalid");
  if (plan.account?.plan === "free" && nonnegativeFinite(plan.account.remaining_free_neurons)
    && plan.account.remaining_free_neurons < plan.maximum_cost.gross_neurons) errors.push("free-plan headroom is below the disclosed maximum");
  if (!exact(plan.governance, ["recovery_allowance", "prior_operational_recovery", "legacy_v1_evidence_sha256", "third_matrix_permitted"])
    || plan.governance.recovery_allowance !== 1 || plan.governance.prior_operational_recovery !== null
    || !hex(plan.governance.legacy_v1_evidence_sha256) || plan.governance.third_matrix_permitted !== false) errors.push("recovery governance is invalid");
  const retainedLegacy = Array.isArray(legacy)
    ? legacy.find(({ path: legacyPath }) => typeof legacyPath === "string" && legacyPath.endsWith(".json") && legacyPath.includes("2026-08-16-d2b84005"))
    : null;
  const independentlyRetainedLegacyHash = retainedLegacy && retainedLegacy.sha256 === retainedLegacy.observed_sha256 ? retainedLegacy.sha256 : null;
  if (!hex(independentlyRetainedLegacyHash) || plan.governance.legacy_v1_evidence_sha256 !== independentlyRetainedLegacyHash) errors.push("legacy v1 governance hash is not independently bound");
    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: [`recovery plan validation contained malformed input: ${String(error?.message ?? error)}`] };
  }
}

export function validateApproval(approval, plan, now = new Date()) {
  const errors = [];
  try {
    const keys = ["schema_version", "plan_ref", "approval_run_id", "approved_at", "expires_at", "approved_call_cap", "maximum_cost_usd", "decision"];
    if (!exact(approval, keys)) return { valid: false, errors: ["approval must be a closed object"] };
  if (approval.schema_version !== RECOVERY_APPROVAL_VERSION) errors.push("unsupported approval version");
  if (approval.plan_ref !== plan?.plan_ref) errors.push("approval plan_ref mismatch");
  if (approval.approval_run_id !== plan?.approval_run_id) errors.push("approval_run_id mismatch");
  if (approval.approved_call_cap !== plan?.call_policy?.approved_call_cap) errors.push("approved call cap mismatch");
  if (approval.maximum_cost_usd !== plan?.maximum_cost?.gross_usd) errors.push("approved maximum cost mismatch");
  if (approval.decision !== "approved") errors.push("approval decision is not approved");
  if (!canonicalTimestamp(approval.approved_at) || !canonicalTimestamp(approval.expires_at)) errors.push("approval timestamps must be canonical UTC");
  const approvedAt = Date.parse(approval.approved_at); const expiresAt = Date.parse(approval.expires_at); const observedAt = now instanceof Date ? now.getTime() : Number.NaN;
  const planCreatedAt = Date.parse(plan?.created_at);
  if (!Number.isFinite(observedAt)) errors.push("approval observation time is invalid");
  if (Number.isFinite(approvedAt) && Number.isFinite(expiresAt)) {
    if (expiresAt <= approvedAt || expiresAt - approvedAt > APPROVAL_MAX_AGE_MS) errors.push("approval lifetime exceeds the four-hour freshness window");
    if (Number.isFinite(planCreatedAt) && approvedAt < planCreatedAt) errors.push("approval predates the disclosed plan");
    if (Number.isFinite(planCreatedAt) && approvedAt - planCreatedAt > APPROVAL_PLAN_MAX_DELAY_MS) errors.push("approval is too far removed from the plan creation and headroom disclosure");
    if (approvedAt > observedAt) errors.push("approval is future-dated");
    if (observedAt >= expiresAt) errors.push("approval is stale");
  }
    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: [`approval validation contained malformed input: ${String(error?.message ?? error)}`] };
  }
}

function summarizeModel(evidence, model, plan) {
  const records = evidence.records.filter((record) => record.model === model);
  const trials = records.filter((record) => record.kind === "trial");
  const latencies = records.map((record) => Math.max(0, Date.parse(record.ended_at) - Date.parse(record.started_at)));
  const usageRecords = records.filter((record) => record.usage !== null);
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let overflow = false;
  for (const record of usageRecords) {
    const prompt = safeAdd(usage.prompt_tokens, record.usage?.prompt_tokens);
    const completion = safeAdd(usage.completion_tokens, record.usage?.completion_tokens);
    const total = safeAdd(usage.total_tokens, record.usage?.total_tokens);
    if (prompt === null || completion === null || total === null) { overflow = true; break; }
    usage = { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total };
  }
  if (overflow) usage = { prompt_tokens: null, completion_tokens: null, total_tokens: null };
  const classifications = Object.fromEntries(["provider_error", "timeout", "empty_response", "ambiguous_envelope", "output_too_large", "unrecoverable_json", "schema_invalid", "repaired_valid", "direct_valid"].map((classification) => [classification, trials.filter((record) => record.classification === classification).length]));
  const cost = plan.maximum_cost.by_model[model];
  const pricing = MODEL_PRICING[model];
  const observedInputUsd = overflow ? null : usage.prompt_tokens * pricing.input_per_million_usd / 1_000_000;
  const observedOutputUsd = overflow ? null : usage.completion_tokens * pricing.output_per_million_usd / 1_000_000;
  const observedGrossUsd = overflow ? null : observedInputUsd + observedOutputUsd;
  return {
    trial_counts: { probes: records.filter((record) => record.kind === "probe").length, trials: trials.length, classifications },
    rates: structuredClone(evidence.summary.by_model[model]),
    latency_cost: {
      latency_ms: {
        minimum: latencies.length ? Math.min(...latencies) : 0,
        maximum: latencies.length ? Math.max(...latencies) : 0,
        total: latencies.reduce((total, value) => total + value, 0),
        mean: latencies.length ? Number((latencies.reduce((total, value) => total + value, 0) / latencies.length).toFixed(2)) : 0,
      },
      usage: { reported_calls: usageRecords.length, missing_calls: records.length - usageRecords.length, overflow, ...usage },
      observed_cost: {
        pricing_as_of: plan.maximum_cost.pricing_as_of,
        computable: !overflow,
        partial: records.length !== usageRecords.length,
        input_usd: observedInputUsd,
        output_usd: observedOutputUsd,
        gross_usd: observedGrossUsd,
        gross_neurons: overflow ? null : observedGrossUsd / NEURON_USD,
      },
      maximum_cost: { pricing_as_of: plan.maximum_cost.pricing_as_of, gross_usd: cost.input_usd + cost.output_usd, gross_neurons: (cost.input_usd + cost.output_usd) / NEURON_USD },
    },
  };
}

export function buildQualificationManifest({ evidence, plan, model, outcome }) {
  const position = MODEL_IDS.indexOf(model);
  if (position < 0) throw new TypeError("qualification model is not frozen");
  if (!["GO", "NO-GO"].includes(outcome)) throw new TypeError("qualification outcome is invalid");
  const summary = summarizeModel(evidence, model, plan);
  return {
    version: QUALIFICATION_MANIFEST_VERSION,
    role: "judge",
    provider: PROVIDER,
    resolved_model: model,
    request_parameters: structuredClone(plan.request_parameters),
    prompt_template_sha256: plan.identities.prompt_template_sha256,
    wire_schema_sha256: plan.identities.wire_schema_sha256,
    adapter_sha256: plan.identities.adapter_sha256,
    binding_version: plan.identities.binding_version,
    runtime: structuredClone(evidence.runtime),
    timeout_policy_sha256: plan.identities.timeout_policy_sha256,
    semantic_identity_sha256: null,
    fixture_result_sha256: hash(stableStringify(evidence.fixtures)),
    trial_counts: summary.trial_counts,
    rates: summary.rates,
    latency_cost: summary.latency_cost,
    outcome,
    approval_run_id: plan.approval_run_id,
    tested_source_identity: sourceIdentity(evidence.sources),
  };
}

export function validateQualificationManifest(manifest, { evidence, plan, model, outcome }) {
  const errors = [];
  try {
    const expected = buildQualificationManifest({ evidence, plan, model, outcome });
    const keys = ["version", "role", "provider", "resolved_model", "request_parameters", "prompt_template_sha256", "wire_schema_sha256", "adapter_sha256", "binding_version", "runtime", "timeout_policy_sha256", "semantic_identity_sha256", "fixture_result_sha256", "trial_counts", "rates", "latency_cost", "outcome", "approval_run_id", "tested_source_identity"];
    if (!exact(manifest, keys)) errors.push("qualification manifest must be closed");
    if (!same(manifest, expected)) errors.push("qualification manifest differs from independently derived evidence");
  } catch (error) {
    errors.push(`qualification manifest validation contained malformed input: ${String(error?.message ?? error)}`);
  }
  return { valid: errors.length === 0, errors };
}

function planEvidenceErrors(plan, evidence) {
  const errors = [];
  if (!same(evidence?.run?.models, MODEL_IDS) || evidence?.run?.id !== plan.approval_run_id) errors.push("evidence run is not bound to the approved run id and frozen models");
  const expectedCallCap = evidence?.run?.authorization?.operator_approved === true ? plan.call_policy.approved_call_cap : 0;
  if (evidence?.run?.authorization?.approved_call_cap !== expectedCallCap) errors.push("evidence call cap differs from approval authority");
  if (evidence?.run?.authorization?.plan !== plan.account.plan
    || evidence?.run?.authorization?.remaining_free_neurons !== plan.account.remaining_free_neurons
    || evidence?.run?.authorization?.estimated_gross_neurons !== plan.maximum_cost.gross_neurons) errors.push("evidence account plan, headroom, or maximum cost differs from the plan");
  for (let index = 0; index < MODEL_IDS.length; index += 1) {
    const retained = evidence?.adapter?.outbound_request?.by_model?.[index];
    if (retained?.model !== MODEL_IDS[index] || retained?.sha256 !== plan.models[index].request_sha256 || retained?.adapter_input_sha256 !== plan.models[index].adapter_input_sha256) errors.push(`${MODEL_IDS[index]} request identity differs from the plan`);
  }
  if (evidence?.adapter?.expected_health?.system_prompt_sha256 !== plan.identities.prompt_template_sha256
    || evidence?.adapter?.expected_health?.wire_schema_sha256 !== plan.identities.wire_schema_sha256
    || evidence?.adapter?.expected_health?.adapter_source_sha256 !== plan.identities.adapter_sha256
    || evidence?.adapter?.expected_health?.candidate_binding_version !== plan.identities.binding_version
    || evidence?.runtime?.runtime_identity_sha256 !== plan.identities.runtime_identity_sha256
    || sourceIdentity(evidence?.sources ?? []).manifest_sha256 !== plan.identities.source_identity_sha256) errors.push("evidence structural identity differs from the plan");
  return errors;
}

function deriveBundle({ plan, approval, evidence, evidence_file, evidence_bytes, evidence_verification }) {
  const planValidation = validateRecoveryPlan(plan, { legacy: evidence?.legacy });
  const approvalObservedAt = evidence?.run?.started_at;
  const approvalValidation = validateApproval(approval, plan, new Date(approvalObservedAt));
  const bindingErrors = planValidation.valid ? planEvidenceErrors(plan, evidence) : ["invalid plan cannot bind evidence"];
  const reasons = [];
  if (!approvalValidation.valid) reasons.push(...approvalValidation.errors);
  if (!evidence_verification.valid) reasons.push("retained evidence failed one or more Story 1.3 predicates");
  reasons.push(...bindingErrors);
  for (const model of MODEL_IDS) {
    const summary = evidence?.summary?.by_model?.[model];
    if (summary?.total !== 20 || summary?.direct_valid < 19) reasons.push(`${model}: independent direct-valid threshold was not met`);
  }
  if (evidence?.outcome?.decision !== "GO") reasons.push(...(evidence?.outcome?.reasons ?? ["evidence outcome was not GO"]));
  const uniqueReasons = [...new Set(reasons)];
  const decision = uniqueReasons.length === 0 ? "GO" : "NO-GO";
  const globalIntegrity = approvalValidation.valid && evidence_verification.valid && bindingErrors.length === 0;
  const manifests = MODEL_IDS.map((model) => {
    const summary = evidence.summary.by_model[model];
    const probe = evidence.records.filter((record) => record.kind === "probe" && record.model === model);
    const modelOutcome = globalIntegrity && probe.length === 1 && !["provider_error", "timeout", "empty_response"].includes(probe[0].classification)
      && summary.total === 20 && summary.direct_valid >= 19 ? "GO" : "NO-GO";
    return buildQualificationManifest({ evidence, plan, model, outcome: modelOutcome });
  });
  const refs = decision === "GO" ? manifests.map((manifest) => ({ model: manifest.resolved_model, qualification_ref: deriveQualificationRef(manifest) })) : [];
  const spent = (evidence?.records?.length ?? 0) > 0;
  return {
    schema_version: QUALIFICATION_BUNDLE_VERSION,
    plan: structuredClone(plan),
    approval: structuredClone(approval),
    approval_check: { observed_at: approvalObservedAt, valid: approvalValidation.valid, errors: approvalValidation.errors },
    evidence: {
      file: evidence_file,
      sha256: hash(evidence_bytes),
      schema_version: evidence.schema_version,
      run_id: evidence.run.id,
      predicate_results: structuredClone(evidence_verification.predicate_results),
    },
    manifests,
    qualification_refs: refs,
    outcome: {
      decision,
      reasons: uniqueReasons,
      mvp_review_required: spent && decision === "NO-GO",
      third_matrix_permitted: !spent,
    },
  };
}

export async function buildQualificationBundle({ plan, approval, evidence, evidence_file, evidence_bytes }, dependencies = {}) {
  const verification = await verifyEvidenceV2(evidence, dependencies);
  if (!verification.valid) throw new Error("qualification input evidence failed independent verification");
  return deriveBundle({ plan, approval, evidence, evidence_file, evidence_bytes, evidence_verification: verification });
}

export async function verifyQualificationBundle(bundle, evidence, evidenceBytes, dependencies = {}) {
  const errors = [];
  try {
    const top = ["schema_version", "plan", "approval", "approval_check", "evidence", "manifests", "qualification_refs", "outcome"];
    if (!exact(bundle, top) || bundle.schema_version !== QUALIFICATION_BUNDLE_VERSION) return { valid: false, errors: ["qualification bundle must be a closed supported object"] };
  const verification = await verifyEvidenceV2(evidence, dependencies);
  if (!verification.valid) errors.push("evidence failed independent verification");
  if (!exact(bundle.evidence, ["file", "sha256", "schema_version", "run_id", "predicate_results"])
    || typeof bundle.evidence.file !== "string" || path.basename(bundle.evidence.file) !== bundle.evidence.file
    || bundle.evidence.sha256 !== hash(evidenceBytes) || bundle.evidence.schema_version !== evidence?.schema_version
    || bundle.evidence.run_id !== evidence?.run?.id || !same(bundle.evidence.predicate_results, verification.predicate_results)) errors.push("evidence byte binding is invalid");
  if (!validateRecoveryPlan(bundle.plan, { legacy: evidence?.legacy }).valid) errors.push("recovery plan is invalid");
  if (verification.valid) {
    const expected = deriveBundle({ plan: bundle.plan, approval: bundle.approval, evidence, evidence_file: bundle.evidence.file, evidence_bytes: evidenceBytes, evidence_verification: verification });
    if (!same(bundle, expected)) errors.push("qualification bundle differs from independent derivation");
  }
  if (bundle.outcome?.decision === "GO") {
    if (!Array.isArray(bundle.manifests) || bundle.manifests.length !== MODEL_IDS.length || !Array.isArray(bundle.qualification_refs) || bundle.qualification_refs.length !== MODEL_IDS.length) errors.push("GO must contain two manifests and refs");
    for (let index = 0; index < MODEL_IDS.length; index += 1) {
      const manifest = bundle.manifests[index]; const ref = bundle.qualification_refs[index];
      if (!validateQualificationManifest(manifest, { evidence, plan: bundle.plan, model: MODEL_IDS[index], outcome: "GO" }).valid
        || !exact(ref, ["model", "qualification_ref"]) || ref.model !== MODEL_IDS[index]
        || ref.qualification_ref !== deriveQualificationRef(manifest)) errors.push(`${MODEL_IDS[index]} qualification manifest/ref is invalid`);
    }
  } else {
    if (!Array.isArray(bundle.manifests) || bundle.manifests.length !== MODEL_IDS.length) errors.push("NO-GO must retain two independent manifests");
    if ((bundle.qualification_refs?.length ?? 0) !== 0) errors.push("NO-GO must not contain qualification refs");
    for (let index = 0; index < MODEL_IDS.length; index += 1) {
      const manifest = bundle.manifests[index];
      if (!validateQualificationManifest(manifest, { evidence, plan: bundle.plan, model: MODEL_IDS[index], outcome: manifest?.outcome }).valid) errors.push(`${MODEL_IDS[index]} NO-GO manifest is invalid`);
    }
  }
    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: [`qualification verification contained malformed input: ${String(error?.message ?? error)}`] };
  }
}

async function verifyFile(bundlePath) {
  const resolved = path.resolve(bundlePath);
  try {
    const directory = path.dirname(resolved);
    const bundleName = path.basename(resolved);
    const bundleParsed = parseCanonicalJsonBytes(await readFile(resolved), "qualification bundle");
    if (!bundleParsed.valid) return bundleParsed;
    const bundle = bundleParsed.value;
    if (typeof bundle?.evidence?.file !== "string" || path.basename(bundle.evidence.file) !== bundle.evidence.file) return { valid: false, errors: ["bundle evidence file must be a sibling basename"] };
    const evidenceName = bundle.evidence.file;
    if (!evidenceName.endsWith("-v2.json")) return { valid: false, errors: ["bundle evidence file must use the v2 publication basename"] };
    const publicationBase = evidenceName.slice(0, -".json".length);
    const markdownName = `${publicationBase}.md`;
    const expectedBundleName = `${publicationBase.replace(/-v2$/, "")}-qualification.json`;
    if (bundleName !== expectedBundleName) return { valid: false, errors: ["qualification bundle is not the exact publication sibling"] };
    const completed = await verifyCompletedArtifactSet(directory, `${publicationBase}.complete.json`, [evidenceName, markdownName, bundleName]);
    if (!completed.valid) return completed;
    const evidencePath = path.join(directory, evidenceName);
    const evidenceBytes = await readFile(evidencePath);
    const evidenceParsed = parseCanonicalJsonBytes(evidenceBytes, "evidence");
    if (!evidenceParsed.valid) return evidenceParsed;
    const evidence = evidenceParsed.value;
    const markdown = await readFile(path.join(directory, markdownName), "utf8");
    if (markdown !== evidence.report) return { valid: false, errors: ["publication Markdown does not exactly match the evidence report"] };
    const result = await verifyQualificationBundle(bundle, evidence, evidenceBytes);
    if (result.valid) console.log(`PASS ${resolved} (${bundle.outcome.decision}; ${bundle.qualification_refs.length} refs)`);
    return result;
  } catch (error) {
    return { valid: false, errors: [`qualification file verification contained malformed input: ${String(error?.message ?? error)}`] };
  }
}

export async function main(argv = process.argv.slice(2)) {
  const file = argv.length === 3 && argv[0] === "verify" && argv[1] === "--file" ? argv[2]
    : argv.length === 2 && argv[0] === "verify" ? argv[1] : null;
  if (!file) throw new Error("Usage: node spikes/judge-fidelity/qualification.mjs verify --file <qualification-bundle.json>");
  const result = await verifyFile(file);
  if (!result.valid) {
    console.error(`INVALID ${path.resolve(file)}\n- ${result.errors.join("\n- ")}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
