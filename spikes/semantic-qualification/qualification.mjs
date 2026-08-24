import { createHash } from "node:crypto";
import {
  PREDICATE_ORACLE,
  PREDICATE_ORACLE_HASH,
  PREDICATE_ORACLE_VERSION,
  stableStringify,
} from "../judge-fidelity/contract.mjs";

export const PLAN_VERSION = "oddspark.semantic-qualification-plan/v1";
export const APPROVAL_VERSION = "oddspark.semantic-qualification-approval/v1";
export const REPORT_VERSION = "oddspark.semantic-qualification-leg-report/v1";
export const MANIFEST_VERSION = "SEMANTIC/v1";
export const COMPLETION_VERSION = "oddspark.semantic-qualification-complete/v1";
export const PLAN_DOMAIN = "ODDSPARK:SEMANTIC-PLAN:v1";
export const SEMANTIC_DOMAIN = "ODDSPARK:SEMANTIC:v1";
export const APPROVAL_WINDOW_MS = 60 * 60 * 1000;
export const CALL_TIMEOUT_MS = 120_000;
export const CALL_COUNT = 38;
export const LEG_CALL_COUNT = 19;
export const PROVIDER = "cloudflare-workers-ai";
export const DATA_USE_DISCLOSURE =
  "Cloudflare states that customer content is not used for model training or service improvement without explicit consent; no provider-side deletion period is asserted.";

const hex = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) =>
  object(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const same = (a, b) => stableStringify(a) === stableStringify(b);
const timestamp = (value) =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
export const canonicalBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
export const derivePlanRef = (plan) => {
  const { plan_ref: _, ...rest } = plan;
  return sha256(`${PLAN_DOMAIN}\n${stableStringify(rest)}`);
};
export const deriveSemanticRef = (manifest) =>
  sha256(`${SEMANTIC_DOMAIN}\n${stableStringify(manifest)}`);

function safe(fn, label) {
  try {
    return fn();
  } catch (error) {
    return {
      valid: false,
      errors: [`${label}: ${String(error?.message ?? error)}`],
    };
  }
}

export function validatePlan(plan) {
  return safe(() => {
    const errors = [];
    const keys = [
      "schema_version",
      "plan_ref",
      "run_id",
      "created_at",
      "provider",
      "identities",
      "schedule",
      "requests",
      "thresholds",
      "oracle",
      "pricing",
      "retention",
      "data_use",
    ];
    if (!exact(plan, keys))
      return { valid: false, errors: ["plan must be a closed object"] };
    if (plan.schema_version !== PLAN_VERSION || plan.provider !== PROVIDER)
      errors.push("plan version or provider changed");
    if (
      !timestamp(plan.created_at) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(plan.run_id ?? "")
    )
      errors.push("plan time or run id is invalid");
    if (!hex(plan.plan_ref) || plan.plan_ref !== derivePlanRef(plan))
      errors.push("plan_ref mismatch");
    const identityKeys = [
      "corpus_version",
      "semantic_identity",
      "catalog_identity",
      "generation_model",
      "generation_config_ref",
      "generation_role_ref",
      "judge_role_ref",
      "judge_legs",
      "runtime_sha256",
      "source_sha256",
      "request_set_sha256",
    ];
    if (
      !exact(plan.identities, identityKeys) ||
      plan.identities.corpus_version !== "voice-v1" ||
      [
        "semantic_identity",
        "catalog_identity",
        "generation_config_ref",
        "generation_role_ref",
        "judge_role_ref",
        "runtime_sha256",
        "source_sha256",
        "request_set_sha256",
      ].some((k) => !hex(plan.identities[k])) ||
      !Array.isArray(plan.identities.judge_legs) ||
      plan.identities.judge_legs.length !== 2
    )
      errors.push("identity binding is invalid");
    const legs = Array.isArray(plan.identities?.judge_legs)
      ? plan.identities.judge_legs
      : [];
    if (
      legs.some(
        (leg, index) =>
          !exact(leg, ["leg", "model", "qualification_ref"]) ||
          leg.leg !== ["primary", "fallback"][index] ||
          !hex(leg.qualification_ref),
      ) ||
      legs.some((leg) =>
        plan.requests
          ?.filter((r) => r.leg === leg.leg)
          .some(
            (r) =>
              r.model !== leg.model ||
              r.qualification_ref !== leg.qualification_ref,
          ),
      )
    )
      errors.push("judge leg identity does not bind every request");
    if (Array.isArray(plan.requests) && plan.requests.length === CALL_COUNT) {
      const primary = plan.requests.slice(0, 19),
        fallback = plan.requests.slice(19);
      if (
        primary.some(
          (r, i) =>
            r.fixture_id !== fallback[i].fixture_id ||
            r.candidate_ref !== fallback[i].candidate_ref,
        )
      )
        errors.push("judge legs do not share the exact candidate population");
    }
    if (
      !exact(plan.schedule, [
        "order",
        "execution",
        "timeout_ms",
        "retries",
        "replacements",
        "substitutions",
        "generation_calls",
        "judge_calls_per_leg",
        "total_calls",
      ]) ||
      !same(plan.schedule.order, ["primary", "fallback"]) ||
      plan.schedule.execution !== "sequential" ||
      plan.schedule.timeout_ms !== CALL_TIMEOUT_MS ||
      plan.schedule.retries !== 0 ||
      plan.schedule.replacements !== 0 ||
      plan.schedule.substitutions !== 0 ||
      plan.schedule.generation_calls !== 0 ||
      plan.schedule.judge_calls_per_leg !== LEG_CALL_COUNT ||
      plan.schedule.total_calls !== CALL_COUNT
    )
      errors.push("schedule is not frozen");
    if (
      !Array.isArray(plan.requests) ||
      plan.requests.length !== CALL_COUNT ||
      plan.requests.some(
        (r, i) =>
          !exact(r, [
            "sequence",
            "leg",
            "fixture_id",
            "model",
            "qualification_ref",
            "candidate_ref",
            "request_sha256",
            "body",
          ]) ||
          r.sequence !== i + 1 ||
          r.leg !== (i < LEG_CALL_COUNT ? "primary" : "fallback") ||
          !hex(r.qualification_ref) ||
          !hex(r.candidate_ref) ||
          !hex(r.request_sha256) ||
          r.request_sha256 !==
            sha256(
              stableStringify({
                sequence: r.sequence,
                leg: r.leg,
                fixture_id: r.fixture_id,
                model: r.model,
                qualification_ref: r.qualification_ref,
                candidate_ref: r.candidate_ref,
                body: r.body,
              }),
            ),
      )
    )
      errors.push("request set is invalid, reordered, or drifted");
    if (
      plan.identities.request_set_sha256 !==
      sha256(
        stableStringify(
          plan.requests.map(
            ({
              sequence,
              leg,
              fixture_id,
              model,
              qualification_ref,
              candidate_ref,
              request_sha256,
            }) => ({
              sequence,
              leg,
              fixture_id,
              model,
              qualification_ref,
              candidate_ref,
              request_sha256,
            }),
          ),
        ),
      )
    )
      errors.push("request set identity mismatch");
    if (
      !exact(plan.oracle, ["version", "hash", "predicates"]) ||
      plan.oracle.version !== PREDICATE_ORACLE_VERSION ||
      plan.oracle.hash !== PREDICATE_ORACLE_HASH ||
      !same(plan.oracle.predicates, PREDICATE_ORACLE)
    )
      errors.push("ordered predicate oracle changed");
    if (
      !object(plan.thresholds) ||
      !exact(plan.pricing, [
        "as_of",
        "source",
        "disclosure",
        "by_model",
        "total_calls",
        "maximum_usd",
      ]) ||
      plan.pricing.total_calls !== CALL_COUNT ||
      !Number.isFinite(plan.pricing.maximum_usd) ||
      plan.pricing.maximum_usd < 0
    )
      errors.push("threshold or pricing disclosure is invalid");
    else {
      const priced = Object.values(plan.pricing.by_model ?? {});
      if (
        priced.length !== 2 ||
        priced.some(
          (x) =>
            !exact(x, [
              "calls",
              "largest_request_bytes",
              "framing_token_allowance",
              "input_tokens_upper_bound",
              "max_output_tokens_per_call",
              "input_usd",
              "output_usd",
              "basis",
            ]) ||
            x.calls !== 19 ||
            x.framing_token_allowance !== 4096 ||
            x.input_tokens_upper_bound !== x.largest_request_bytes + 4096 ||
            x.max_output_tokens_per_call !== 2048 ||
            ![x.input_usd, x.output_usd].every(Number.isFinite),
        ) ||
        Math.abs(
          priced.reduce((n, x) => n + x.input_usd + x.output_usd, 0) -
            plan.pricing.maximum_usd,
        ) > Number.EPSILON
      )
        errors.push("pricing arithmetic or conservative bounds changed");
    }
    if (
      !exact(plan.retention, ["immutable", "incomplete_runs_retained"]) ||
      plan.retention.immutable !== true ||
      plan.retention.incomplete_runs_retained !== true ||
      plan.data_use !== DATA_USE_DISCLOSURE
    )
      errors.push("retention or data-use disclosure changed");
    return { valid: errors.length === 0, errors };
  }, "plan validation failed");
}

export function approvalTemplate(plan) {
  return {
    schema_version: APPROVAL_VERSION,
    plan_ref: plan.plan_ref,
    run_id: plan.run_id,
    approved_at: null,
    expires_at: null,
    approved_by: null,
    maximum_usd: plan.pricing.maximum_usd,
    total_calls: CALL_COUNT,
    decision: null,
  };
}
export function validateApproval(approval, plan, now = new Date()) {
  return safe(() => {
    const errors = [];
    const keys = [
      "schema_version",
      "plan_ref",
      "run_id",
      "approved_at",
      "expires_at",
      "approved_by",
      "maximum_usd",
      "total_calls",
      "decision",
    ];
    if (!exact(approval, keys))
      return { valid: false, errors: ["approval must be a closed object"] };
    if (
      !validatePlan(plan).valid ||
      approval.schema_version !== APPROVAL_VERSION ||
      approval.plan_ref !== plan.plan_ref ||
      approval.run_id !== plan.run_id ||
      approval.maximum_usd !== plan.pricing.maximum_usd ||
      approval.total_calls !== CALL_COUNT ||
      approval.decision !== "approved" ||
      typeof approval.approved_by !== "string" ||
      !approval.approved_by
    )
      errors.push("approval does not exactly authorize the plan");
    if (!timestamp(approval.approved_at) || !timestamp(approval.expires_at))
      errors.push("approval timestamps are invalid");
    else {
      const start = Date.parse(approval.approved_at),
        end = Date.parse(approval.expires_at),
        current = now.getTime();
      if (
        end - start !== APPROVAL_WINDOW_MS ||
        current < start ||
        current >= end
      )
        errors.push("approval is outside its exclusive one-hour window");
    }
    return { valid: errors.length === 0, errors };
  }, "approval validation failed");
}

export function validateLegReport(report, plan, leg) {
  return safe(() => {
    const errors = [];
    const requests = plan?.requests?.filter((r) => r.leg === leg) ?? [];
    if (
      !exact(report, [
        "schema_version",
        "run_id",
        "plan_ref",
        "leg",
        "model",
        "qualification_ref",
        "started_at",
        "ended_at",
        "records",
        "regression_sha256",
        "regression_report",
        "predicate_results",
        "outcome",
      ])
    )
      return { valid: false, errors: ["leg report must be a closed object"] };
    if (
      report.schema_version !== REPORT_VERSION ||
      report.run_id !== plan.run_id ||
      report.plan_ref !== plan.plan_ref ||
      report.leg !== leg ||
      !timestamp(report.started_at) ||
      !timestamp(report.ended_at) ||
      Date.parse(report.ended_at) < Date.parse(report.started_at)
    )
      errors.push("leg report identity or time is invalid");
    if (
      !Array.isArray(report.records) ||
      report.records.length !== LEG_CALL_COUNT ||
      report.records.some(
        (r, i) =>
          !exact(r, [
            "sequence",
            "fixture_id",
            "request_sha256",
            "started_at",
            "ended_at",
            "state",
            "response",
            "response_sha256",
          ]) ||
          r.sequence !== requests[i]?.sequence ||
          r.fixture_id !== requests[i]?.fixture_id ||
          r.request_sha256 !== requests[i]?.request_sha256 ||
          !timestamp(r.started_at) ||
          !timestamp(r.ended_at) ||
          !["completed", "failed", "timed_out"].includes(r.state) ||
          (r.state === "completed"
            ? r.response_sha256 !== sha256(stableStringify(r.response))
            : r.response !== null || r.response_sha256 !== null),
      )
    )
      errors.push("leg records are incomplete, reordered, or drifted");
    if (
      report.model !== requests[0]?.model ||
      report.qualification_ref !== requests[0]?.qualification_ref
    )
      errors.push("leg qualification identity mismatch");
    if (
      !Array.isArray(report.predicate_results) ||
      !same(
        report.predicate_results.map((x) => x.id),
        PREDICATE_ORACLE.map((x) => x.id),
      ) ||
      report.predicate_results.some(
        (x) => !exact(x, ["id", "pass"]) || typeof x.pass !== "boolean",
      )
    )
      errors.push("predicate results do not retain the ordered oracle");
    if (
      report.regression_sha256 !==
        sha256(canonicalBytes(report.regression_report)) ||
      !["pass", "fail"].includes(report.outcome) ||
      (report.outcome === "pass" &&
        (report.records.some((r) => r.state !== "completed") ||
          report.predicate_results.some((r) => !r.pass) ||
          report.regression_report?.summary?.mismatched !== 0 ||
          report.regression_report?.summary?.judge_calls !== LEG_CALL_COUNT ||
          report.regression_report?.fixtures?.length !== 24))
    )
      errors.push("leg outcome is not total");
    return { valid: errors.length === 0, errors };
  }, "leg validation failed");
}

function deriveManifest({ plan, reports, evidence }) {
  const ordered = ["primary", "fallback"].map((leg) =>
    reports.find((r) => r.leg === leg),
  );
  return {
    schema_version: MANIFEST_VERSION,
    outcome: "GO",
    provider: PROVIDER,
    corpus: {
      version: plan.identities.corpus_version,
      semantic_identity: plan.identities.semantic_identity,
      catalog_identity: plan.identities.catalog_identity,
    },
    generation: {
      model: plan.identities.generation_model,
      config_ref: plan.identities.generation_config_ref,
      role_ref: plan.identities.generation_role_ref,
    },
    judge: {
      role_ref: plan.identities.judge_role_ref,
      legs: ordered.map((r) => ({
        leg: r.leg,
        model: r.model,
        struct_ref: r.qualification_ref,
        report_sha256: sha256(canonicalBytes(r)),
      })),
    },
    execution: plan.schedule,
    bindings: {
      plan_ref: plan.plan_ref,
      runtime_sha256: plan.identities.runtime_sha256,
      source_sha256: plan.identities.source_sha256,
      request_set_sha256: plan.identities.request_set_sha256,
      oracle_version: plan.oracle.version,
      oracle_hash: plan.oracle.hash,
      predicate_ids: plan.oracle.predicates.map((x) => x.id),
    },
    evidence: {
      bundle_sha256: sha256(canonicalBytes(evidence)),
      retention: plan.retention,
    },
    thresholds: plan.thresholds,
    pricing: plan.pricing,
  };
}
export function buildManifest({ plan, reports, evidence }) {
  const manifest = deriveManifest({ plan, reports, evidence });
  const validation = validateManifest(manifest, { plan, reports, evidence });
  if (!validation.valid) throw new TypeError(validation.errors.join("; "));
  return manifest;
}
export function validateManifest(manifest, { plan, reports, evidence } = {}) {
  return safe(() => {
    const errors = [];
    if (
      !exact(manifest, [
        "schema_version",
        "outcome",
        "provider",
        "corpus",
        "generation",
        "judge",
        "execution",
        "bindings",
        "evidence",
        "thresholds",
        "pricing",
      ]) ||
      manifest.schema_version !== MANIFEST_VERSION ||
      manifest.outcome !== "GO" ||
      manifest.provider !== PROVIDER
    )
      return { valid: false, errors: ["manifest is not the closed GO schema"] };
    if (!validatePlan(plan).valid) errors.push("bound plan is invalid");
    for (const leg of ["primary", "fallback"])
      if (
        !validateLegReport(
          reports?.find((r) => r.leg === leg),
          plan,
          leg,
        ).valid ||
        reports.find((r) => r.leg === leg)?.outcome !== "pass"
      )
        errors.push(`${leg} leg is not independently passing`);
    if (
      errors.length === 0 &&
      !same(manifest, deriveManifest({ plan, reports, evidence }))
    )
      errors.push("manifest differs from independent derivation");
    return { valid: errors.length === 0, errors };
  }, "manifest validation failed");
}
