import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { canonicalBytes, CURRENT_ASSEMBLY_IDENTITY, HOUSE_CATALOG_REF, PREDICATES, PRIORS_REF, providerTimeoutFor, sha256, validatePlan } from "./contract.mjs";

const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const safeBase = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.plan\.json$/.test(value);
const integer = (value) => Number.isSafeInteger(value) && value > 0;

export function createUnapprovedPlan(options) {
  if (!UUID.test(options.run_id ?? "") || options.assembly_ref !== CURRENT_ASSEMBLY_IDENTITY
      || ![options.generation_ref, options.generation_role_ref, options.judge_ref].every((value) => SHA.test(value))) throw new TypeError("current assembly, exact run ID, and accepted Stage 1/2 refs are required");
  const limits = { route_ceiling_ms: Number(options.route_ceiling_ms), commit_reserve_ms: Number(options.commit_reserve_ms), provider_timeout_ms: Number(options.provider_timeout_ms), call_cap: Number(options.call_cap), attempt_cap: Number(options.attempt_cap), maximum_cost_usd: Number(options.maximum_cost_usd) };
  if (![limits.route_ceiling_ms, limits.commit_reserve_ms, limits.provider_timeout_ms, limits.call_cap, limits.attempt_cap].every(integer)
      || !Number.isFinite(limits.maximum_cost_usd) || limits.maximum_cost_usd <= 0 || limits.call_cap !== 6 || limits.attempt_cap !== 3
      || limits.provider_timeout_ms !== providerTimeoutFor(limits)) throw new TypeError("route/deadline/call/cost limits are invalid or inconsistent");
  if (typeof options.strike_timestamp !== "string" || new Date(options.strike_timestamp).toISOString() !== options.strike_timestamp) throw new TypeError("strike timestamp must be canonical ISO-8601");
  const scope = { kind: "domain", round: 1190001, domain: "qualification.invalid" };
  const plan = {
    schema_version: "oddspark.local-full-request-plan/v1", run_id: options.run_id, status: "unapproved", approval: null, execution: null, allowance_consumed: false,
    request: { strike_timestamp: options.strike_timestamp, dispatch: { contract: "inactive-domain-dispatch/v1", request_scope: scope, effective_mode: "local", claim_key: "domain:1190001:qualification.invalid", notice_identity: "pre-activation", notice: "Website reading is not switched on yet, so this plan is built from local patterns only.", scan_allowed: false, evidence_provider_allowed: false, permalink_allowed: false } },
    authorities: { assembly_identity: options.assembly_ref, generation_ref: options.generation_ref, generation_role_ref: options.generation_role_ref, judge_ref: options.judge_ref, house_catalog_ref: HOUSE_CATALOG_REF, priors_ref: PRIORS_REF, activation_version: 2 },
    limits, pricing: { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", source: "Cloudflare Workers AI model catalog accessed 2026-08-24", input_usd_per_token: 0.00000029, output_usd_per_token: 0.00000225 },
    retention: ["plan_bytes", "approval_bytes", "activation_manifest_bytes", "content_hashes", "request_hashes", "response_hashes", "provider_error_class", "provider_error_message", "provider_error_http_status", "provider_error_code", "strike_terminal_code", "strike_ledger", "stage_started_at", "stage_finished_at", "stage_latency_ms", "stage_timeout_ms", "attempt_sequence", "attempt_terminal", "candidate_ref", "judge_candidate_ref", "ledger_events", "usage_tokens", "cost_usd", "route_ceiling_ms", "commit_reserve_ms", "receipt_bytes", "receipt_identity", "render_bytes", "render_hash"],
    schedule: [{ attempt: 1, role: "primary", generation_slots: [1], judge_slots: [2] }, { attempt: 2, role: "fallback", generation_slots: [3], judge_slots: [4] }, { attempt: 3, role: "fallback", generation_slots: [5], judge_slots: [6] }], predicates: [...PREDICATES],
  };
  if (!validatePlan(plan)) throw new TypeError("created plan failed closed validation");
  return plan;
}

export async function writeUnapprovedPlan(plan, output) {
  if (!safeBase(path.basename(output)) || output.split(/[\\/]/).includes("..")) throw new TypeError("output path is unsafe");
  const parent = await realpath(path.dirname(path.resolve(output))); const resolved = path.join(parent, path.basename(output));
  const bytes = canonicalBytes(plan); const handle = await open(resolved, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  const directory = await open(parent, constants.O_RDONLY); try { await directory.sync(); } finally { await directory.close(); }
  return { path: resolved, bytes, sha256: sha256(bytes) };
}
