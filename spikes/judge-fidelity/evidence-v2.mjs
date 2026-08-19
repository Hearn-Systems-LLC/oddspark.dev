import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  MODEL_IDS,
  LEGACY_MODEL_IDS,
  JUDGE_RESULT_SCHEMA,
  PREDICATE_ORACLE,
  PREDICATE_ORACLE_HASH,
  PREDICATE_ORACLE_VERSION,
  classifyJudgeCall,
  buildJudgeMessages,
  deriveCandidateRef,
  SYSTEM_PROMPT,
  stableStringify,
  validateJudgeResult,
  validateSpikeInput,
} from "./contract.mjs";

export const EVIDENCE_V2 = "oddspark.judge-recovery-evidence/v2";
export const EVIDENCE_SOURCE_PATHS = Object.freeze([
  "package.json", "spikes/judge-fidelity/contract.mjs", "spikes/judge-fidelity/evidence-v2.mjs",
  "spikes/judge-fidelity/fixture-executor.mjs", "spikes/judge-fidelity/fixtures.json",
  "spikes/judge-fidelity/pricing.mjs", "spikes/judge-fidelity/qualification.mjs", "spikes/judge-fidelity/recovery-finder.mjs", "spikes/judge-fidelity/run.mjs", "spikes/judge-fidelity/start-adapter.mjs", "spikes/judge-fidelity/test.mjs",
  "spikes/judge-fidelity/worker.mjs", "spikes/judge-fidelity/verify-launcher.mjs", "spikes/judge-fidelity/verify-v2.mjs", "spikes/judge-fidelity/wrangler.toml",
]);
const CLASSIFICATIONS = ["provider_error", "timeout", "empty_response", "ambiguous_envelope", "output_too_large", "unrecoverable_json", "schema_invalid", "repaired_valid", "direct_valid"];
const REPAIRS = [null, "bom", "json_fence", "double_encoded_json", "surrounding_prose"];
export const LEGACY_FILES = Object.freeze([
  { path: "spikes/judge-fidelity/results/2026-08-16-d2b84005.json", sha256: "1cc4431088e37ba069e128e0059f19229551de2398db0d686524bc70aa752377" },
  { path: "spikes/judge-fidelity/results/2026-08-16-d2b84005.md", sha256: "0fde75016daa6556ece35be8abd54faaebc4eed6a82156fd834bd127fd263562" },
  { path: "spikes/judge-fidelity/results/2026-08-16-d2b84005-audit.md", sha256: "4695bae9056e14e8b961111f9be6802c8faab2ebf932963e6425315c43d4e16b" },
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const execFileAsync = promisify(execFile);
const hex = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const same = (a, b) => stableStringify(a) === stableStringify(b);

function closedEnvelopeShape(envelope, candidateRef) {
  if (envelope === null) return true;
  if (!plain(envelope) || Object.keys(envelope).some((key) => !["response", "result", "choices"].includes(key))) return false;
  for (const key of ["response", "result"]) {
    if (!Object.hasOwn(envelope, key)) continue;
    const value = envelope[key];
    if (typeof value !== "string" && !validateJudgeResult(value, candidateRef).valid) return false;
  }
  if (Object.hasOwn(envelope, "choices")) {
    if (!Array.isArray(envelope.choices) || envelope.choices.length !== 1 || !exact(envelope.choices[0], ["message"]) || !exact(envelope.choices[0].message, ["content"]) || typeof envelope.choices[0].message.content !== "string") return false;
  }
  return true;
}
const canonicalTimestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const safeNonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

function jsonTree(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value) || Object.getOwnPropertySymbols(value).length) return false;
  if (!Array.isArray(value) && !plain(value)) return false;
  if (Array.isArray(value) && (Object.keys(value).length !== value.length || Object.keys(value).some((key, index) => key !== String(index)))) return false;
  seen.add(value);
  const valid = (Array.isArray(value) ? value : Object.values(value)).every((item) => jsonTree(item, seen));
  seen.delete(value);
  return valid;
}

export async function currentLegacyIdentity(read = (relative) => readFile(path.join(ROOT, relative))) {
  return Promise.all(LEGACY_FILES.map(async (entry) => {
    const bytes = await read(entry.path);
    const retained = { ...entry, observed_sha256: hash(bytes) };
    if (entry.path.endsWith(".json")) {
      const result = JSON.parse(bytes.toString("utf8"));
      retained.facts = {
        decision: result.outcome?.decision ?? null,
        by_model: LEGACY_MODEL_IDS.map((model) => ({
          model,
          total: result.summary?.by_model?.[model]?.total ?? null,
          direct_valid: result.summary?.by_model?.[model]?.direct_valid ?? null,
          repaired_valid: result.summary?.by_model?.[model]?.repaired_valid ?? null,
        })),
      };
    }
    return retained;
  }));
}

export async function currentRuntimeIdentity(read = (relative) => readFile(path.join(ROOT, relative)), execute = execFileAsync) {
  const bytes = await read("runtime-baseline.json");
  const baseline = JSON.parse(bytes.toString("utf8"));
  const { stdout } = await execute(path.join(ROOT, "node_modules/.bin/wrangler"), ["--version"], { cwd: ROOT });
  return { path: "runtime-baseline.json", bytes: bytes.byteLength, sha256: hash(bytes), runtime_identity_sha256: baseline.runtime_identity_sha256,
    frozen: { node_engines: baseline.node_engines, wrangler: baseline.wrangler, workerd: baseline.workerd }, execution: { node: process.version, wrangler: stdout.trim() } };
}

export async function currentSourceIdentity(paths, read = (relative) => readFile(path.join(ROOT, relative))) {
  return Promise.all(paths.map(async (relative) => {
    const bytes = await read(relative);
    return { path: relative, bytes: bytes.byteLength, sha256: hash(bytes) };
  }));
}

export function expectedAdapterHealth(sources, runtime) {
  const sourceHash = (sourcePath) => sources.find(({ path: retainedPath }) => retainedPath === sourcePath)?.sha256;
  return {
    ok: true, inference: false, schema_version: "oddspark-judge-adapter-health/v2", result_contract_version: "oddspark-judge-result/v2",
    candidate_binding_version: "oddspark-candidate-ref/v1", models: MODEL_IDS, parameters: { temperature: 0, max_tokens: 2048 }, binding: "AI",
    system_prompt_sha256: hash(SYSTEM_PROMPT), message_contract_sha256: hash(stableStringify({ roles: ["system", "user"], user_shape: { candidate_ref: "sha256", input: "canonical-json" } })), wire_schema_sha256: hash(stableStringify({ type: "json_schema", json_schema: JUDGE_RESULT_SCHEMA })),
    adapter_source_sha256: sourceHash("spikes/judge-fidelity/worker.mjs"), config_source_sha256: sourceHash("spikes/judge-fidelity/wrangler.toml"), runtime_sha256: runtime.runtime_identity_sha256,
    identity_complete: true,
  };
}

async function rebuildRequestManifest(candidate) {
  const ref = await deriveCandidateRef(candidate.schema_version, candidate.value);
  return { by_model: MODEL_IDS.map((model) => {
    const messages = buildJudgeMessages(candidate.request_input);
    messages[1] = { role: "user", content: stableStringify({ candidate_ref: ref, input: candidate.request_input }) };
    const adapter_input = { messages, max_tokens: 2048, temperature: 0, response_format: { type: "json_schema", json_schema: JUDGE_RESULT_SCHEMA } };
    const body = { model, ...adapter_input, candidate_schema_version: candidate.schema_version, candidate: candidate.value, candidate_ref: ref };
    return { model, body, sha256: hash(stableStringify(body)), adapter_input, adapter_input_sha256: hash(stableStringify(adapter_input)) };
  }) };
}

export function buildAdapterIdentity({ observed_health, http_status, endpoint, outbound_request, sources, runtime, observation_attempted = true }) {
  const expected_health = expectedAdapterHealth(sources, runtime);
  const identity_match = http_status === 200 && same(observed_health, expected_health);
  return {
    schema_version: "oddspark-judge-adapter-health/v2", endpoint, http_status, observation_attempted, identity_match,
    expected_health, expected_health_sha256: hash(stableStringify(expected_health)),
    observed_health: structuredClone(observed_health), observed_health_sha256: hash(stableStringify(observed_health)),
    outbound_request: structuredClone(outbound_request), outbound_request_sha256: hash(stableStringify(outbound_request)),
  };
}

export async function executeFixtureCatalog(fixtures, execute) {
  if (!Array.isArray(fixtures) || fixtures.length === 0) return { declared_ids: [], passing_ids: [], failures: ["fixture catalog is empty"] };
  const declared_ids = fixtures.map(({ id }) => id);
  const failures = [];
  if (declared_ids.some((id) => typeof id !== "string" || id.trim() === "")) failures.push("fixture IDs must be nonblank strings");
  if (new Set(declared_ids).size !== declared_ids.length) failures.push("fixture IDs must be unique");
  const passing_ids = [];
  for (const fixture of fixtures) {
    try { if (await execute(fixture)) passing_ids.push(fixture.id); else failures.push(`${fixture.id}: failed`); }
    catch (error) { failures.push(`${fixture.id}: ${String(error?.message ?? error)}`); }
  }
  return { declared_ids, passing_ids, failures };
}

export function summarize(records) {
  const trials = records.filter((record) => record.kind === "trial");
  const by_model = {};
  for (const model of MODEL_IDS) {
    const rows = trials.filter((record) => record.model === model);
    const direct = rows.filter((record) => record.classification === "direct_valid").length;
    const repaired = rows.filter((record) => record.classification === "repaired_valid").length;
    by_model[model] = { total: rows.length, direct_valid: direct, repaired_valid: repaired,
      direct_rate: { numerator: direct, denominator: rows.length, percent: rows.length ? Number((direct * 100 / rows.length).toFixed(2)) : 0 },
      post_repair_rate: { numerator: direct + repaired, denominator: rows.length, percent: rows.length ? Number(((direct + repaired) * 100 / rows.length).toFixed(2)) : 0 } };
  }
  return { by_model };
}

export function deterministicOutcome(evidence, integrityPass = true) {
  if (evidence.profile === "synthetic") return { decision: "SYNTHETIC-NO-GO", reasons: ["Synthetic evidence cannot authorize operational recovery."] };
  const reasons = [...evidence.run.preflight_blockers];
  if (!integrityPass) reasons.push("One or more evidence integrity predicates failed.");
  if (evidence.run.preflight_blockers.length > 0) return { decision: "NO-GO", reasons };
  for (const model of MODEL_IDS) {
    const probe = evidence.records.filter((r) => r.kind === "probe" && r.model === model);
    if (probe.length !== 1 || ["provider_error", "timeout", "empty_response"].includes(probe[0]?.classification)) reasons.push(`${model}: capability probe did not return content.`);
    const summary = summarize(evidence.records).by_model[model];
    if (summary.total < 20) reasons.push(`${model}: expected at least 20 counted trials, found ${summary.total}.`);
    else if (summary.direct_valid * 100 < summary.total * 95) reasons.push(`${model}: direct-valid rate is below 95%.`);
  }
  return { decision: reasons.length ? "NO-GO" : "GO", reasons };
}

export function renderV2Markdown(evidence) {
  const usage = evidence.records.reduce((total, record) => ({ prompt_tokens: total.prompt_tokens + (record.usage?.prompt_tokens ?? 0), completion_tokens: total.completion_tokens + (record.usage?.completion_tokens ?? 0), total_tokens: total.total_tokens + (record.usage?.total_tokens ?? 0) }), { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
  const taxonomy = Object.fromEntries(CLASSIFICATIONS.map((classification) => [classification, evidence.records.filter((record) => record.classification === classification).length]));
  const latencyMs = evidence.records.reduce((total, record) => total + Math.max(0, Date.parse(record.ended_at) - Date.parse(record.started_at)), 0);
  const missingUsage = evidence.records.filter((record) => record.usage === null).length;
  const lines = ["# Judge Recovery Evidence v2", "", `- Profile: **${evidence.profile}**`, `- Decision: **${evidence.outcome.decision}**`, `- Run: \`${evidence.run.id}\` (${evidence.run.started_at} to ${evidence.run.ended_at})`, `- Predicate oracle: \`${evidence.oracle.hash}\``, `- Fixtures: ${evidence.fixtures.passing_ids.length}/${evidence.fixtures.declared_ids.length} passed`, `- Calls: ${evidence.records.length}/${evidence.run.authorization.approved_call_cap}`, `- Recorded call latency: ${latencyMs} ms`, `- Usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} reported tokens; ${missingUsage} calls missing usage`, `- Adapter health: \`${evidence.adapter.observed_health_sha256}\``, `- Outbound request manifest: \`${evidence.adapter.outbound_request_sha256}\``, "", "## Counted rates", ""];
  for (const model of MODEL_IDS) {
    const rate = evidence.summary.by_model[model];
    lines.push(`- \`${model}\`: ${rate.total} trials; ${rate.direct_rate.numerator}/${rate.direct_rate.denominator} direct-valid (${rate.direct_rate.percent.toFixed(2)}%); ${rate.post_repair_rate.numerator}/${rate.post_repair_rate.denominator} post-repair (${rate.post_repair_rate.percent.toFixed(2)}%)`);
  }
  lines.push("", "## Taxonomy", "", ...Object.entries(taxonomy).map(([classification, count]) => `- \`${classification}\`: ${count}`), "", "## Source provenance", "", ...evidence.sources.map((source) => `- \`${source.path}\`: ${source.bytes} bytes, \`${source.sha256}\``), "", "## Predicates", "");
  for (const predicate of evidence.predicate_results) lines.push(`- ${predicate.pass ? "PASS" : "FAIL"} \`${predicate.id}\``);
  lines.push("", "## Reasons", "");
  for (const reason of evidence.outcome.reasons) lines.push(`- ${reason}`);
  return `${lines.join("\n")}\n`;
}

const TOP_KEYS = ["schema_version", "profile", "oracle", "legacy", "runtime", "sources", "candidate", "adapter", "run", "fixtures", "records", "summary", "outcome", "predicate_results", "report"];

export async function verifyEvidenceV2(evidence, dependencies = {}) {
  const diagnostics = Object.fromEntries(PREDICATE_ORACLE.map(({ id }) => [id, []]));
  const fail = (id, message) => diagnostics[id].push(message);
  try {
    if (!jsonTree(evidence) || !exact(evidence, TOP_KEYS) || evidence.schema_version !== EVIDENCE_V2 || !["synthetic", "operational"].includes(evidence.profile)) fail("evidence.shape", "invalid or open evidence-v2 shape");
    const recomputedOracleHash = hash(`${PREDICATE_ORACLE_VERSION}\n${stableStringify(PREDICATE_ORACLE)}`);
    if (recomputedOracleHash !== PREDICATE_ORACLE_HASH || !exact(evidence?.oracle, ["version", "hash", "predicates"]) || evidence.oracle.version !== PREDICATE_ORACLE_VERSION || evidence.oracle.hash !== PREDICATE_ORACLE_HASH || !same(evidence.oracle.predicates, PREDICATE_ORACLE)) fail("oracle.identity", "predicate oracle identity mismatch");

    const legacy = await (dependencies.currentLegacyIdentity ?? currentLegacyIdentity)();
    const legacyFacts = legacy.find(({ path: legacyPath }) => legacyPath.endsWith(".json"))?.facts;
    if (!same(evidence?.legacy, legacy) || legacy.some((item) => item.observed_sha256 !== item.sha256)
      || legacyFacts?.decision !== "NO-GO" || !same(legacyFacts?.by_model, LEGACY_MODEL_IDS.map((model) => ({ model, total: 20, direct_valid: 0, repaired_valid: 0 })))) fail("legacy.immutable", "legacy v1 bytes or frozen NO-GO facts changed");
    const runtime = await (dependencies.currentRuntimeIdentity ?? currentRuntimeIdentity)();
    const minimumNode = Number(/^>=([0-9]+)/.exec(runtime.frozen.node_engines)?.[1]);
    const executingNode = Number(/^v([0-9]+)/.exec(runtime.execution.node)?.[1]);
    if (!same(evidence?.runtime, runtime) || runtime.execution.wrangler !== runtime.frozen.wrangler || !Number.isInteger(minimumNode) || !Number.isInteger(executingNode) || executingNode < minimumNode) fail("runtime.identity", "frozen and executing runtime identity mismatch");
    const sourcePaths = Array.isArray(evidence?.sources) ? evidence.sources.map((item) => item.path) : [];
    const sourceManifestMatches = same(sourcePaths, EVIDENCE_SOURCE_PATHS);
    if (!sourceManifestMatches) fail("source.identity", "source manifest mismatch");
    const sources = await (dependencies.currentSourceIdentity ?? currentSourceIdentity)(EVIDENCE_SOURCE_PATHS);
    if (!same(evidence?.sources, sources)) fail("source.identity", "source bytes do not match the frozen manifest");

    const candidateRef = await deriveCandidateRef(evidence?.candidate?.schema_version, evidence?.candidate?.value);
    const inputValidation = validateSpikeInput(evidence?.candidate?.request_input);
    const expectedCandidateSchemaVersion = `oddspark-candidate/v${evidence?.candidate?.value?.version}`;
    if (!exact(evidence?.candidate, ["schema_version", "value", "ref", "request_input"]) || evidence.candidate.ref !== candidateRef
      || evidence.candidate.schema_version !== expectedCandidateSchemaVersion || !inputValidation.valid
      || !same(evidence.candidate.request_input?.candidate, evidence.candidate.value)) fail("candidate.binding", "candidate reference, schema version, or complete request input mismatch");
    const expectedHealthKeys = ["ok", "inference", "schema_version", "result_contract_version", "candidate_binding_version", "models", "parameters", "binding", "system_prompt_sha256", "message_contract_sha256", "wire_schema_sha256", "adapter_source_sha256", "config_source_sha256", "runtime_sha256", "identity_complete"];
    const expectedHealth = evidence?.adapter?.expected_health;
    const workerSource = sources.find(({ path: sourcePath }) => sourcePath === "spikes/judge-fidelity/worker.mjs");
    const configSource = sources.find(({ path: sourcePath }) => sourcePath === "spikes/judge-fidelity/wrangler.toml");
    const independentlyExpectedHealth = expectedAdapterHealth(sources, runtime);
    let permittedEndpoint = false;
    try { const endpoint = new URL(evidence?.adapter?.endpoint); permittedEndpoint = endpoint.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname) && endpoint.pathname === "/health" && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash; } catch { /* false */ }
    const observedMatch = evidence?.adapter?.http_status === 200 && same(evidence?.adapter?.observed_health, independentlyExpectedHealth);
    if (!exact(evidence?.adapter, ["schema_version", "endpoint", "http_status", "observation_attempted", "identity_match", "expected_health", "expected_health_sha256", "observed_health", "observed_health_sha256", "outbound_request", "outbound_request_sha256"])
      || evidence.adapter.schema_version !== "oddspark-judge-adapter-health/v2" || !permittedEndpoint || typeof evidence.adapter.observation_attempted !== "boolean"
      || (!evidence.adapter.observation_attempted && (evidence.adapter.http_status !== 0 || evidence.adapter.observed_health !== null))
      || !Number.isInteger(evidence.adapter.http_status) || evidence.adapter.identity_match !== observedMatch
      || !exact(expectedHealth, expectedHealthKeys) || (observedMatch && !exact(evidence.adapter.observed_health, expectedHealthKeys)) || !jsonTree(evidence.adapter.observed_health)
      || !same(expectedHealth, independentlyExpectedHealth)
      || hash(stableStringify(evidence.adapter.expected_health)) !== evidence.adapter.expected_health_sha256
      || hash(stableStringify(evidence.adapter.observed_health)) !== evidence.adapter.observed_health_sha256
      || hash(stableStringify(evidence.adapter.outbound_request)) !== evidence.adapter.outbound_request_sha256
      || (!evidence.adapter.identity_match && ((evidence.records?.length ?? 0) !== 0
        || !(evidence.run?.preflight_blockers ?? []).some((reason) => reason === "adapter identity preflight failed" || reason.startsWith("adapter identity preflight skipped"))))) fail("adapter.identity", "adapter handshake or outbound request retention mismatch");
    const requestEntries = evidence?.adapter?.outbound_request?.by_model;
    const independentlyRebuiltRequests = await rebuildRequestManifest(evidence.candidate);
    if (!exact(evidence?.adapter?.outbound_request, ["by_model"]) || !Array.isArray(requestEntries) || requestEntries.length !== MODEL_IDS.length
      || requestEntries.some((entry, index) => !exact(entry, ["model", "body", "sha256", "adapter_input", "adapter_input_sha256"]) || entry.model !== MODEL_IDS[index] || !hex(entry.sha256) || !hex(entry.adapter_input_sha256)
        || !same(entry, independentlyRebuiltRequests.by_model[index]))) fail("adapter.identity", "outbound request manifest differs from independent frozen reconstruction");

    const executeFixtures = dependencies.executeFixtures ?? (async () => {
      const { executeCurrentFixtureCatalog } = await import("./fixture-executor.mjs");
      return executeCurrentFixtureCatalog();
    });
    const executed = await executeFixtures();
    if (!exact(evidence?.fixtures, ["declared_ids", "passing_ids", "failures"]) || !same(executed, evidence.fixtures) || evidence.fixtures.failures.length || !same(evidence.fixtures.declared_ids, evidence.fixtures.passing_ids)) fail("fixtures.executed", "fixture coverage was not independently reproduced");
    if (!Array.isArray(evidence?.records)) fail("records.closed", "records must be an array");
    const recomputedRecords = [];
    for (const record of evidence?.records ?? []) {
      const keys = ["kind", "model", "index", "started_at", "ended_at", "call_state", "error_code", "envelope", "usage", "request_sha256", "candidate_ref", "classification", "repair_kind", "verdict_sha256"];
      if (!exact(record, keys) || !["probe", "trial"].includes(record.kind) || !MODEL_IDS.includes(record.model) || !Number.isInteger(record.index) || record.index < 1
        || !["received", "provider_error", "timeout"].includes(record.call_state) || !(record.error_code === null || typeof record.error_code === "string")
        || !CLASSIFICATIONS.includes(record.classification) || !REPAIRS.includes(record.repair_kind) || !(record.verdict_sha256 === null || hex(record.verdict_sha256))
        || !hex(record.request_sha256) || record.candidate_ref !== candidateRef || !jsonTree(record.envelope) || !closedEnvelopeShape(record.envelope, candidateRef) || !jsonTree(record.usage)
        || (record.call_state === "received" && (record.error_code !== null || record.envelope === null))
        || (record.call_state === "provider_error" && (typeof record.error_code !== "string" || !record.error_code.trim() || record.envelope !== null || record.usage !== null))
        || (record.call_state === "timeout" && (record.error_code !== null || record.envelope !== null || record.usage !== null))) fail("records.closed", "record shape, call-state provenance, or scalar invalid");
      const classified = await classifyJudgeCall({ call_state: record.call_state, envelope: record.envelope, error_code: record.error_code }, candidateRef);
      recomputedRecords.push(classified);
      if (classified.classification !== record.classification || (classified.repair_kind ?? null) !== record.repair_kind || (classified.verdict ? hash(stableStringify(classified.verdict)) : null) !== record.verdict_sha256) fail("records.classified", "retained record classification mismatch");
      const modelRequest = requestEntries?.find((entry) => entry.model === record.model);
      if (record.request_sha256 !== modelRequest?.sha256 || !same(modelRequest?.body?.candidate, evidence.candidate.value) || modelRequest?.body?.candidate_schema_version !== evidence.candidate.schema_version) fail("run.common_request", "record request differs from frozen model request or common candidate");
      const usageKeys = ["prompt_tokens", "completion_tokens", "total_tokens"];
      if (record.usage !== null && (!exact(record.usage, usageKeys) || !usageKeys.every((key) => safeNonnegativeInteger(record.usage[key])) || record.usage.total_tokens !== record.usage.prompt_tokens + record.usage.completion_tokens)) fail("records.closed", "usage arithmetic invalid");
    }
    const calls = evidence?.records?.length ?? 0;
    const auth = evidence?.run?.authorization;
    const checks = evidence?.run?.preflight_checks;
    const checkKeys = ["plan_match", "approval_preflight", "offline_errors", "adapter", "approval_at_run_start"];
    const approvalCheckKeys = ["valid", "errors"];
    const adapterCheckKeys = ["attempted", "identity_match"];
    const checksValid = exact(checks, checkKeys) && typeof checks.plan_match === "boolean"
      && exact(checks.approval_preflight, approvalCheckKeys) && typeof checks.approval_preflight.valid === "boolean" && Array.isArray(checks.approval_preflight.errors) && checks.approval_preflight.errors.every((item) => typeof item === "string")
      && Array.isArray(checks.offline_errors) && checks.offline_errors.every((item) => typeof item === "string")
      && exact(checks.adapter, adapterCheckKeys) && typeof checks.adapter.attempted === "boolean" && typeof checks.adapter.identity_match === "boolean"
      && exact(checks.approval_at_run_start, approvalCheckKeys) && typeof checks.approval_at_run_start.valid === "boolean" && Array.isArray(checks.approval_at_run_start.errors) && checks.approval_at_run_start.errors.every((item) => typeof item === "string");
    const expectedBlockers = [];
    if (evidence?.profile === "operational" && checksValid) {
      if (!checks.plan_match) expectedBlockers.push("frozen plan differs from current repository/runtime/request disclosure");
      for (const error of checks.approval_preflight.errors) expectedBlockers.push(`approval: ${error}`);
      for (const error of checks.offline_errors) expectedBlockers.push(`offline gate: ${error}`);
      if (!checks.adapter.attempted) expectedBlockers.push("adapter identity preflight skipped because earlier authority or offline gates failed");
      else if (!checks.adapter.identity_match) expectedBlockers.push("adapter identity preflight failed");
      if (checks.approval_preflight.valid && !checks.approval_at_run_start.valid) {
        for (const error of checks.approval_at_run_start.errors) expectedBlockers.push(`run-start approval: ${error}`);
      }
    }
    const blocked = expectedBlockers.length > 0;
    const acceptedProbeCount = MODEL_IDS.filter((model) => {
      const probe = (evidence?.records ?? []).find((record) => record.kind === "probe" && record.model === model);
      return probe && !["provider_error", "timeout", "empty_response"].includes(probe.classification);
    }).length;
    const expectedOperationalCalls = 2 + (20 * acceptedProbeCount);
    const authKeys = ["operator_approved", "profile_confirmed", "headroom_confirmed", "approved_call_cap", "estimated_calls", "calls_made", "plan", "remaining_free_neurons", "estimated_gross_neurons"];
    const expectedOperatorApproval = checksValid && checks.plan_match && checks.approval_preflight.valid && checks.offline_errors.length === 0 && checks.approval_at_run_start.valid;
    if (!checksValid || (evidence.profile === "operational" && (checks.adapter.attempted !== evidence?.adapter?.observation_attempted || checks.adapter.identity_match !== evidence?.adapter?.identity_match))
      || !exact(auth, authKeys) || ![auth.operator_approved, auth.profile_confirmed, auth.headroom_confirmed].every((v) => typeof v === "boolean") || ![auth.approved_call_cap, auth.estimated_calls, auth.calls_made].every(Number.isInteger)
      || !(auth.plan === null || auth.plan === "free" || auth.plan === "paid") || !(auth.remaining_free_neurons === null || (typeof auth.remaining_free_neurons === "number" && Number.isFinite(auth.remaining_free_neurons) && auth.remaining_free_neurons >= 0))
      || !(auth.estimated_gross_neurons === null || (typeof auth.estimated_gross_neurons === "number" && Number.isFinite(auth.estimated_gross_neurons) && auth.estimated_gross_neurons >= 0))
      || auth.operator_approved !== expectedOperatorApproval || auth.approved_call_cap !== (expectedOperatorApproval ? 42 : 0)
      || (evidence.profile === "operational" && (auth.profile_confirmed !== true || auth.headroom_confirmed !== true))
      || auth.calls_made !== calls || auth.calls_made > auth.approved_call_cap
      || (evidence.profile === "operational" && !blocked && (auth.operator_approved !== true || auth.profile_confirmed !== true || auth.headroom_confirmed !== true || auth.approved_call_cap !== 42 || auth.estimated_calls !== 42 || auth.calls_made !== expectedOperationalCalls))
      || (evidence.profile === "operational" && !blocked && (!['free', 'paid'].includes(auth.plan) || auth.estimated_gross_neurons === null || (auth.plan === "free" && (auth.remaining_free_neurons === null || auth.remaining_free_neurons < auth.estimated_gross_neurons))))
      || (evidence.profile === "operational" && blocked && calls !== 0)) fail("run.authorization", "authorization or call accounting mismatch");
    if (!exact(evidence?.run, ["id", "started_at", "ended_at", "models", "authorization", "preflight_checks", "preflight_blockers"]) || typeof evidence.run.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(evidence.run.id)
      || !same(evidence.run.models, MODEL_IDS) || !Array.isArray(evidence.run.preflight_blockers) || !same(evidence.run.preflight_blockers, expectedBlockers)) fail("run.authorization", "run envelope or derived preflight blockers invalid");
    const started = Date.parse(evidence?.run?.started_at); const ended = Date.parse(evidence?.run?.ended_at);
    if (!canonicalTimestamp(evidence?.run?.started_at) || !canonicalTimestamp(evidence?.run?.ended_at)) fail("run.ordering", "run timestamps must be canonical UTC ISO strings");
    let priorEnd = started;
    for (const record of evidence?.records ?? []) {
      const begin = Date.parse(record.started_at); const finish = Date.parse(record.ended_at);
      if (!canonicalTimestamp(record.started_at) || !canonicalTimestamp(record.ended_at) || !Number.isFinite(begin) || !Number.isFinite(finish) || begin < priorEnd || finish < begin || begin < started || finish > ended) fail("run.ordering", "record timestamps are noncanonical, overlap, or escape run bounds");
      priorEnd = finish;
    }
    if (evidence?.profile === "operational" && !blocked) {
      const acceptedModels = MODEL_IDS.filter((model) => {
        const probe = (evidence.records ?? []).find((record) => record.kind === "probe" && record.model === model);
        return probe && !["provider_error", "timeout", "empty_response"].includes(probe.classification);
      });
      const expectedOrder = [
        ...MODEL_IDS.map((model) => ["probe", model, 1]),
        ...acceptedModels.flatMap((model) => Array.from({ length: 20 }, (_, index) => ["trial", model, index + 1])),
      ];
      const actualOrder = (evidence.records ?? []).map(({ kind, model, index }) => [kind, model, index]);
      if (!same(actualOrder, expectedOrder)) fail("run.ordering", "records do not follow the exact frozen probe and per-model trial sequence");
    }
    for (const model of MODEL_IDS) {
      const probes = (evidence?.records ?? []).filter((r) => r.kind === "probe" && r.model === model);
      const trials = (evidence?.records ?? []).filter((r) => r.kind === "trial" && r.model === model);
      const accepted = probes.length === 1 && !["provider_error", "timeout", "empty_response"].includes(probes[0].classification);
      if (evidence?.profile === "operational" && !blocked && (probes.length !== 1 || probes[0]?.index !== 1 || trials.length !== (accepted ? 20 : 0) || trials.some((r, i) => r.index !== i + 1))) fail("run.cardinality", "operational model cardinality invalid");
      if (evidence?.profile === "operational" && blocked && (probes.length !== 0 || trials.length !== 0)) fail("run.cardinality", "preflight-blocked evidence must contain no calls");
    }
    const summary = summarize(evidence?.records ?? []);
    if (!same(evidence?.summary, summary)) fail("summary.rates", "summary or rates mismatch");

    const provisionalPass = Object.entries(diagnostics).filter(([id]) => !["outcome.deterministic", "predicates.retained", "report.deterministic"].includes(id)).every(([, errors]) => errors.length === 0);
    const outcome = deterministicOutcome(evidence, provisionalPass);
    if (!same(evidence?.outcome, outcome)) fail("outcome.deterministic", "outcome or reasons mismatch");
    const reportInput = { ...evidence, outcome };
    if (evidence?.report !== renderV2Markdown(reportInput)) fail("report.deterministic", "deterministic Markdown mismatch");
    const retained = PREDICATE_ORACLE.map(({ id }) => ({ id, pass: id === "predicates.retained" ? true : diagnostics[id].length === 0 }));
    if (!same(evidence?.predicate_results, retained)) fail("predicates.retained", "retained predicate results mismatch");
  } catch (error) {
    fail("evidence.shape", `verification exception contained: ${String(error?.message ?? error)}`);
  }
  if (diagnostics["evidence.shape"].length > 0) {
    for (const { id } of PREDICATE_ORACLE) if (id !== "evidence.shape" && diagnostics[id].length === 0) diagnostics[id].push("not evaluated because evidence.shape failed");
  }
  const predicate_results = PREDICATE_ORACLE.map(({ id }) => ({ id, pass: diagnostics[id].length === 0 }));
  return { valid: predicate_results.every(({ pass }) => pass), predicate_results, diagnostics };
}

export async function finalizeEvidenceV2(evidence, dependencies = {}) {
  evidence.summary = summarize(evidence.records);
  evidence.outcome = deterministicOutcome(evidence, true);
  evidence.predicate_results = PREDICATE_ORACLE.map(({ id }) => ({ id, pass: true }));
  evidence.report = renderV2Markdown(evidence);
  const verified = await verifyEvidenceV2(evidence, dependencies);
  evidence.predicate_results = verified.predicate_results;
  evidence.outcome = deterministicOutcome(evidence, verified.predicate_results.filter(({ id }) => !["outcome.deterministic", "predicates.retained", "report.deterministic"].includes(id)).every(({ pass }) => pass));
  evidence.report = renderV2Markdown(evidence);
  return evidence;
}

export async function buildSyntheticEvidence({ candidate_schema_version, candidate, request_input, source_paths, fixtures, adapter }, dependencies = {}) {
  if (!same(source_paths, EVIDENCE_SOURCE_PATHS)) throw new TypeError("synthetic evidence must bind the complete frozen source manifest");
  const ref = await deriveCandidateRef(candidate_schema_version, candidate);
  const evidence = {
    schema_version: EVIDENCE_V2, profile: "synthetic",
    oracle: { version: PREDICATE_ORACLE_VERSION, hash: PREDICATE_ORACLE_HASH, predicates: PREDICATE_ORACLE },
    legacy: await (dependencies.currentLegacyIdentity ?? currentLegacyIdentity)(), runtime: await (dependencies.currentRuntimeIdentity ?? currentRuntimeIdentity)(),
    sources: await (dependencies.currentSourceIdentity ?? currentSourceIdentity)(source_paths),
    candidate: { schema_version: candidate_schema_version, value: candidate, ref, request_input }, adapter,
    run: { id: "synthetic-offline-self-test", started_at: "2026-08-17T00:00:00.000Z", ended_at: "2026-08-17T00:00:00.000Z", models: MODEL_IDS, authorization: { operator_approved: false, profile_confirmed: false, headroom_confirmed: false, approved_call_cap: 0, estimated_calls: 0, calls_made: 0, plan: null, remaining_free_neurons: null, estimated_gross_neurons: null }, preflight_checks: { plan_match: false, approval_preflight: { valid: false, errors: [] }, offline_errors: [], adapter: { attempted: false, identity_match: false }, approval_at_run_start: { valid: false, errors: [] } }, preflight_blockers: [] },
    fixtures, records: [], summary: { by_model: {} }, outcome: {}, predicate_results: [], report: "",
  };
  return finalizeEvidenceV2(evidence, dependencies);
}

export async function retainOperationalRecord({ kind, model, index, started_at, ended_at, call_state, error_code = null, envelope = null, usage, request_sha256, candidate_ref }) {
  const classified = await classifyJudgeCall({ call_state, envelope, error_code }, candidate_ref);
  return {
    kind, model, index, started_at, ended_at, call_state, error_code, envelope, usage,
    request_sha256, candidate_ref, classification: classified.classification,
    repair_kind: classified.repair_kind ?? null,
    verdict_sha256: classified.verdict ? hash(stableStringify(classified.verdict)) : null,
  };
}

export async function buildOperationalEvidence(input, dependencies = {}) {
  const required = ["candidate_schema_version", "candidate", "request_input", "source_paths", "fixtures", "adapter", "run", "records"];
  if (!exact(input, required)) throw new TypeError("operational evidence input must be closed and complete");
  if (!same(input.source_paths, EVIDENCE_SOURCE_PATHS)) throw new TypeError("operational evidence must bind the complete frozen source manifest");
  const ref = await deriveCandidateRef(input.candidate_schema_version, input.candidate);
  if (input.records.some((record) => record.candidate_ref !== ref)) throw new TypeError("operational record candidate_ref mismatch");
  const evidence = {
    schema_version: EVIDENCE_V2, profile: "operational",
    oracle: { version: PREDICATE_ORACLE_VERSION, hash: PREDICATE_ORACLE_HASH, predicates: PREDICATE_ORACLE },
    legacy: await (dependencies.currentLegacyIdentity ?? currentLegacyIdentity)(),
    runtime: await (dependencies.currentRuntimeIdentity ?? currentRuntimeIdentity)(),
    sources: await (dependencies.currentSourceIdentity ?? currentSourceIdentity)(input.source_paths),
    candidate: { schema_version: input.candidate_schema_version, value: input.candidate, ref, request_input: input.request_input },
    adapter: structuredClone(input.adapter), run: structuredClone(input.run), fixtures: structuredClone(input.fixtures),
    records: structuredClone(input.records), summary: { by_model: {} }, outcome: {}, predicate_results: [], report: "",
  };
  return finalizeEvidenceV2(evidence, dependencies);
}
