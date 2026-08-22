import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  MODEL_IDS,
  JUDGE_RESULT_SCHEMA,
  buildJudgeMessages,
  classifyJudgeCall,
  fingerprintContractInput,
  stableStringify,
} from "./contract.mjs";
import { buildAdapterIdentity, buildOperationalEvidence, currentLegacyIdentity, currentRuntimeIdentity, currentSourceIdentity, EVIDENCE_SOURCE_PATHS, expectedAdapterHealth, retainOperationalRecord, verifyEvidenceV2 } from "./evidence-v2.mjs";
import { executeCurrentFixtureCatalog } from "./fixture-executor.mjs";
import { findPriorOperationalRecovery as _findPriorOperationalRecovery, validSpendReceipt, OWNER_REVIEWED_SPEND, OWNER_REVIEWED_RECEIPT_ARCHIVE } from "./recovery-finder.mjs";
import {
  RECOVERY_APPROVAL_VERSION,
  RECOVERY_COMPLETION_VERSION,
  buildQualificationBundle,
  createRecoveryPlan,
  parseCanonicalJsonBytes,
  validateApproval,
  validateRecoveryPlan,
  verifyCompletedArtifactSet,
  verifyQualificationBundle,
} from "./qualification.mjs";

// Structured logger with correlation IDs for machine-parseable output.
// Each log line includes a timestamp, level, correlation_id, and message.
const _correlationIdCounter = { value: 0 };
function nextCorrelationId() { return `corr-${++_correlationIdCounter.value}`; }

function logStructured(level, correlationId, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    correlation_id: correlationId,
    msg: message,
    ...meta,
  };
  // Output JSON for machine parsing; humans still see readable output via console
  console.log(JSON.stringify(entry));
}

function logInfo(correlationId, message, meta = {}) { logStructured("info", correlationId, message, meta); }
function logWarn(correlationId, message, meta = {}) { logStructured("warn", correlationId, message, meta); }
function logError(correlationId, message, meta = {}) { logStructured("error", correlationId, message, meta); }

const execFileAsync = promisify(execFile);
const SPIKE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPIKE_DIR, "../..");
const RESULTS_DIR = path.join(SPIKE_DIR, "results");
const RECOVERY_LOCK_FILE = ".judge-recovery.lock";
const RECOVERY_RECEIPT_FILE = ".judge-llama-cycle-spend.json";
const RECOVERY_RECEIPT_VERSION = "oddspark.judge-cycle-spend/v2";
const FIXTURES_PATH = path.join(SPIKE_DIR, "fixtures.json");
const TEST_PATH = path.join(SPIKE_DIR, "test.mjs");

export const RESULT_SCHEMA_VERSION = "oddspark.judge-fidelity-result/v1";
export const MODELS = MODEL_IDS;
export const TRIALS_PER_MODEL = 20;
export const PROBES_PER_MODEL = 1;
export const APPROVED_CALL_CAP = MODELS.length * (TRIALS_PER_MODEL + PROBES_PER_MODEL);
export const MAX_TOKENS = 2048;
export const REQUESTED_TEMPERATURE = 0;
export const DEFAULT_TIMEOUT_MS = 120_000;
export const PREFLIGHT_TIMEOUT_MS = 10_000;
export const DEFAULT_BASE_URL = "http://127.0.0.1:8788";
export const TERMINAL_TAXONOMY = Object.freeze([
  "provider_error",
  "timeout",
  "empty_response",
  "ambiguous_envelope",
  "output_too_large",
  "unrecoverable_json",
  "schema_invalid",
  "repaired_valid",
  "direct_valid",
]);

import {
  PRICING_AS_OF,
  PRICING_SOURCE,
  NEURON_USD,
  FREE_NEURONS_PER_DAY,
  MODEL_PRICING,
  BUDGET_PRICING,
  PRICING_DISCLOSURE,
} from "./pricing.mjs";

const SOURCE_PATHS = EVIDENCE_SOURCE_PATHS;

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, required, allowed, pathName, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${pathName} must be an object`);
    return false;
  }
  for (const key of required) if (!Object.hasOwn(value, key)) errors.push(`${pathName}.${key} is required`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${pathName}.${key} is not allowed`);
  return true;
}

export function assertLoopbackBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:") throw new TypeError("Adapter URL must use loopback HTTP");
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new TypeError("Adapter URL must use a loopback hostname");
  }
  if (url.username || url.password) throw new TypeError("Adapter URL must not contain credentials");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new TypeError("Adapter URL must not contain a path, query, or fragment");
  }
  return url;
}

export function buildModelRequest(model, input) {
  if (!MODELS.includes(model)) throw new TypeError(`Unsupported model: ${model}`);
  const candidateSchemaVersion = `oddspark-candidate/v${input.candidate.version}`;
  const candidateRef = sha256Bytes(`oddspark-candidate-ref/v1\n${stableStringify({ candidate_schema_version: candidateSchemaVersion, candidate: input.candidate })}`);
  const messages = buildJudgeMessages(input);
  messages[1] = { role: "user", content: stableStringify({ candidate_ref: candidateRef, input }) };
  return {
    model,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: REQUESTED_TEMPERATURE,
    response_format: { type: "json_schema", json_schema: JUDGE_RESULT_SCHEMA },
    candidate_schema_version: candidateSchemaVersion,
    candidate: input.candidate,
    candidate_ref: candidateRef,
  };
}

export function buildRequestManifest(input) {
  return { by_model: MODELS.map((model) => {
    const body = buildModelRequest(model, input);
    const adapter_input = {
      messages: body.messages,
      max_tokens: body.max_tokens,
      temperature: body.temperature,
      response_format: body.response_format,
    };
    return {
      model,
      body,
      sha256: sha256Bytes(stableStringify(body)),
      adapter_input,
      adapter_input_sha256: sha256Bytes(stableStringify(adapter_input)),
    };
  }) };
}

export function estimateMaximumUsage(inputTokensPerRequest) {
  if (!Number.isInteger(inputTokensPerRequest) || inputTokensPerRequest < 0) {
    throw new TypeError("inputTokensPerRequest must be a non-negative integer");
  }
  const callsPerModel = TRIALS_PER_MODEL + PROBES_PER_MODEL;
  let grossUsd = 0;
  const byModel = {};
  for (const model of MODELS) {
    const pricing = BUDGET_PRICING[model];
    const inputUsd = callsPerModel * inputTokensPerRequest * pricing.input_per_million_usd / 1_000_000;
    const outputUsd = callsPerModel * MAX_TOKENS * pricing.output_per_million_usd / 1_000_000;
    byModel[model] = { calls: callsPerModel, input_usd: inputUsd, output_usd: outputUsd };
    grossUsd += inputUsd + outputUsd;
  }
  return {
    pricing_as_of: PRICING_AS_OF,
    pricing_source: PRICING_SOURCE,
    pricing_disclosure: PRICING_DISCLOSURE,
    input_token_upper_bound_per_request: inputTokensPerRequest,
    max_output_tokens_per_call: MAX_TOKENS,
    calls_per_model: callsPerModel,
    total_calls: APPROVED_CALL_CAP,
    gross_usd: grossUsd,
    gross_neurons: grossUsd / NEURON_USD,
    free_neurons_per_day: FREE_NEURONS_PER_DAY,
    by_model: byModel,
  };
}

export async function checkAdapterHealth(baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch) {
  const url = assertLoopbackBaseUrl(baseUrl);
  const response = await fetchImpl(new URL("health", url), { redirect: "error" });
  if (!response.ok) throw new Error(`Adapter health failed with HTTP ${response.status}`);
  const body = await response.json();
  if (body?.ok !== true || body?.inference !== false) throw new Error("Adapter health response is invalid");
  return body;
}
export async function observeAdapterHealth(baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch, timeoutMs = PREFLIGHT_TIMEOUT_MS) {
  const url = assertLoopbackBaseUrl(baseUrl); const endpoint = new URL("health", url).href;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, { redirect: "error", signal: controller.signal }); let body = null;
    try { body = await response.json(); } catch { /* typed absence */ }
    return { endpoint, http_status: response.status, body };
  } finally { clearTimeout(timeout); }
}

export async function invokeAdapter({
  base_url = DEFAULT_BASE_URL,
  request_body,
  timeout_ms = DEFAULT_TIMEOUT_MS,
  fetch_impl = fetch,
}) {
  const baseUrl = assertLoopbackBaseUrl(base_url);
  const controller = new AbortController();
  const startedAt = new Date();
  const started = performance.now();
  const timeout = setTimeout(() => controller.abort(), timeout_ms);
  try {
    const response = await fetch_impl(new URL("run", baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request_body),
      redirect: "error",
      signal: controller.signal,
    });
    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const timing = {
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      latency_ms: Math.round(performance.now() - started),
    };
    if (!response.ok || body?.ok !== true) {
      return {
        ...timing,
        call_state: "provider_error",
        error_code: body?.error?.code ?? `http_${response.status}`,
        error_message: body?.error?.message ?? null,
      };
    }
    return {
      ...timing,
      call_state: "received",
      envelope: body.envelope,
      usage: Object.hasOwn(body, "usage") ? body.usage : null,
      reported_effective_values: body.reported_effective_values ?? {},
    };
  } catch (error) {
    const timing = {
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      latency_ms: Math.round(performance.now() - started),
    };
    if (error?.name === "AbortError") return { ...timing, call_state: "timeout" };
    return {
      ...timing,
      call_state: "provider_error",
      error_code: "adapter_fetch_failed",
      error_message: String(error?.message ?? error).slice(0, 500),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeRecoveryProtocol({ requests, base_url = DEFAULT_BASE_URL, invoke = invokeAdapter, before_invoke = async () => {}, on_record = () => {} }) {
  if (!Array.isArray(requests) || requests.length !== MODELS.length || requests.some((entry, i) => entry.model !== MODELS[i])) throw new TypeError("requests must bind the frozen ordered model pair");
  const canonicalCandidate = stableStringify(requests[0].body.candidate); const schema = requests[0].body.candidate_schema_version; const ref = requests[0].body.candidate_ref;
  for (const entry of requests) {
    const adapterInput = {
      messages: entry.body.messages,
      max_tokens: entry.body.max_tokens,
      temperature: entry.body.temperature,
      response_format: entry.body.response_format,
    };
    if (stableStringify(entry.body.candidate) !== canonicalCandidate
      || entry.body.candidate_schema_version !== schema
      || entry.body.candidate_ref !== ref
      || entry.sha256 !== sha256Bytes(stableStringify(entry.body))
      || stableStringify(entry.adapter_input) !== stableStringify(adapterInput)
      || entry.adapter_input_sha256 !== sha256Bytes(stableStringify(adapterInput))) {
      throw new TypeError("model requests or adapter inputs diverge from the common frozen candidate before inference");
    }
  }
  const records = [];
  const retain = async (kind, entry, index, call) => {
    const usage = normalizeProviderUsage(call.usage);
    const record = await retainOperationalRecord({ kind, model: entry.model, index, started_at: call.started_at, ended_at: call.ended_at, call_state: call.call_state,
      error_code: call.error_code ?? null, envelope: call.envelope ?? null, usage, request_sha256: entry.sha256, candidate_ref: ref });
    records.push(record);
    await on_record(structuredClone(record));
  };
  const invokeOnce = async (kind, entry, index) => {
    const started_at = new Date().toISOString();
    try {
      await before_invoke({ kind, model: entry.model, index });
      return await retain(kind, entry, index, await invoke({ base_url, request_body: entry.body }));
    } catch (error) {
      if (error?.code === "ODDSPARK_RECOVERY_GOVERNANCE_FAILURE" || error?.code === "ODDSPARK_FATAL_PROCESS_EXIT") throw error;
      const failedCall = { call_state: "provider_error", error_code: "invocation_exception", envelope: null, usage: null, started_at, ended_at: new Date().toISOString() };
      return retain(kind, entry, index, failedCall);
    }
  };
  const acceptedModels = new Set();
  for (const entry of requests) {
    await invokeOnce("probe", entry, 1);
    const probe = records.at(-1);
    if (!["provider_error", "timeout", "empty_response"].includes(probe.classification)) acceptedModels.add(entry.model);
  }
  for (const entry of requests) {
    if (acceptedModels.has(entry.model)) {
      for (let i = 1; i <= TRIALS_PER_MODEL; i += 1) await invokeOnce("trial", entry, i);
    }
  }
  return records;
}

/**
 * Normalize provider usage data to a canonical shape.
 * Returns partial usage when only some fields are available (best-effort),
 * rather than dropping the entire record. Missing fields are set to null.
 */
export function normalizeProviderUsage(value) {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  const canonical = ["prompt_tokens", "completion_tokens", "total_tokens"];
  const aliases = ["input_tokens", "output_tokens"];
  const allowed = new Set([...canonical, ...aliases, "neurons"]);
  // Allow extra keys but don't require all fields — partial is better than nothing
  const disallowedExtra = keys.filter((key) => !allowed.has(key) && !key.startsWith("_"));
  if (disallowedExtra.length > 0) return null;

  const hasCanonical = ["prompt_tokens", "completion_tokens"].some((key) => Object.hasOwn(value, key));
  const hasAliases = aliases.some((key) => Object.hasOwn(value, key));
  if (hasCanonical && hasAliases) return null;

  const prompt = hasCanonical ? value.prompt_tokens : value.input_tokens;
  const completion = hasCanonical ? value.completion_tokens : value.output_tokens;
  const rawTotal = Object.hasOwn(value, "total_tokens") ? value.total_tokens : null;

  // Compute total from prompt+completion only if both are present and no explicit total
  let total = rawTotal;
  if (total === null && !hasCanonical && Number.isSafeInteger(prompt) && Number.isSafeInteger(completion)) {
    total = prompt + completion;
  }

  // Validate what we have — partial results are acceptable
  const promptValid = Number.isSafeInteger(prompt) && prompt >= 0;
  const completionValid = Number.isSafeInteger(completion) && completion >= 0;
  const totalValid = total === null || (Number.isSafeInteger(total) && total >= 0);

  // If we have at least one valid field, return partial; otherwise null
  if (!promptValid && !completionValid && total === null) return null;
  if (promptValid && completionValid && totalValid && total !== null && total !== prompt + completion) return null;

  return {
    prompt_tokens: promptValid ? prompt : null,
    completion_tokens: completionValid ? completion : null,
    total_tokens: totalValid ? total : null,
  };
}

export async function runSequentialCalls({ model, input, count, invoke = invokeAdapter }) {
  if (!MODELS.includes(model)) throw new TypeError(`Unsupported model: ${model}`);
  if (!Number.isInteger(count) || count < 1) throw new TypeError("count must be a positive integer");
  const calls = [];
  for (let index = 1; index <= count; index += 1) {
    const call = await invoke({ request_body: buildModelRequest(model, input) });
    calls.push({ model, index, ...call });
  }
  return calls;
}

function emptyModelSummary() {
  const summary = { total: 0 };
  for (const classification of TERMINAL_TAXONOMY) summary[classification] = 0;
  summary.direct_rate = { numerator: 0, denominator: 0, percent: 0 };
  summary.post_repair_rate = { numerator: 0, denominator: 0, percent: 0 };
  return summary;
}

function rate(numerator, denominator) {
  return {
    numerator,
    denominator,
    percent: denominator === 0 ? 0 : Number((numerator * 100 / denominator).toFixed(2)),
  };
}

export function summarizeTrials(trials) {
  const byModel = Object.fromEntries(MODELS.map((model) => [model, emptyModelSummary()]));
  const aggregate = emptyModelSummary();
  for (const trial of trials) {
    if (!MODELS.includes(trial.model)) throw new TypeError(`Unknown trial model: ${trial.model}`);
    if (!TERMINAL_TAXONOMY.includes(trial.classification)) {
      throw new TypeError(`Unknown trial classification: ${trial.classification}`);
    }
    byModel[trial.model].total += 1;
    byModel[trial.model][trial.classification] += 1;
    aggregate.total += 1;
    aggregate[trial.classification] += 1;
  }
  for (const summary of [...Object.values(byModel), aggregate]) {
    summary.direct_rate = rate(summary.direct_valid, summary.total);
    summary.post_repair_rate = rate(summary.direct_valid + summary.repaired_valid, summary.total);
  }
  return { by_model: byModel, aggregate };
}

function probeAccepted(probe) {
  return probe.accepted === true
    && !["provider_error", "timeout", "empty_response"].includes(probe.classification);
}

export function decideOutcome({ probes, trials, fixture_results, preflight_blockers = [] }) {
  if (preflight_blockers.length > 0) {
    return { decision: "BLOCKED", reasons: [...preflight_blockers] };
  }

  const reasons = [];
  for (const model of MODELS) {
    const modelProbes = probes.filter((probe) => probe.model === model);
    if (modelProbes.length !== 1 || !probeAccepted(modelProbes[0])) {
      reasons.push(`${model}: exact capability probe did not return judge content`);
    }
  }
  const summary = summarizeTrials(trials);
  for (const model of MODELS) {
    const modelSummary = summary.by_model[model];
    if (modelSummary.total !== TRIALS_PER_MODEL) {
      reasons.push(`${model}: expected ${TRIALS_PER_MODEL} counted trials, found ${modelSummary.total}`);
    } else if (modelSummary.direct_valid * 100 < modelSummary.total * 95) {
      reasons.push(`${model}: direct-valid rate is below 95%`);
    }
  }
  if (fixture_results?.passed !== true) reasons.push("offline fixture contract did not pass");
  return reasons.length === 0
    ? { decision: "GO", reasons: [] }
    : { decision: "NO-GO", reasons };
}

function markdownRate(summary, key) {
  const value = summary?.[key] ?? { numerator: 0, denominator: 0, percent: 0 };
  return `${value.numerator}/${value.denominator} (${value.percent.toFixed(2)}%)`;
}

export function renderMarkdown(result) {
  const lines = [
    "# Judge Fidelity Spike Decision",
    "",
    `- Decision: **${result.outcome.decision}**`,
    `- Run ID: \`${result.run.id}\``,
    `- Started: ${result.run.started_at}`,
    `- Ended: ${result.run.ended_at}`,
    `- Offline fixtures: ${result.fixture_results.passed_count}/${result.fixture_results.total_count} passed`,
    "",
    "## Capability probes",
    "",
    "| Model | Accepted | Classification |",
    "| --- | ---: | --- |",
  ];
  for (const model of MODELS) {
    const probe = result.probes.find((item) => item.model === model);
    lines.push(`| \`${model}\` | ${probe?.accepted === true ? "yes" : "no"} | ${probe?.classification ?? "not run"} |`);
  }
  lines.push(
    "",
    "## Counted matrix",
    "",
    "| Model | Trials | Direct valid | Post-repair valid |",
    "| --- | ---: | ---: | ---: |",
  );
  for (const model of MODELS) {
    const summary = result.summary.by_model[model];
    lines.push(`| \`${model}\` | ${summary.total} | ${markdownRate(summary, "direct_rate")} | ${markdownRate(summary, "post_repair_rate")} |`);
  }
  lines.push(
    "",
    `Aggregate direct validity: ${markdownRate(result.summary.aggregate, "direct_rate")}.`,
    `Aggregate post-repair validity: ${markdownRate(result.summary.aggregate, "post_repair_rate")}.`,
    "",
    "## Outcome reasons",
    "",
  );
  if (result.outcome.reasons.length === 0) lines.push("- All GO predicates passed.");
  else for (const reason of result.outcome.reasons) lines.push(`- ${reason}`);
  lines.push(
    "",
    "## Structural boundary",
    "",
    "Allowlisted extraction is limited to `response`, `result`, or `choices[0].message.content`; duplicate handling is type-sensitive and byte-identical; extracted content is bounded to 64 KiB UTF-8; and at most one declared repair may precede strict validation.",
    "",
    "Empty or conflicting/ambiguous envelopes, oversized output, truncated or multiple objects, guessed JSON syntax, chained wrappers, schema drift, coercion, semantic omission, and `pass: true` with any reported failure remain hard failures.",
    "",
    "Semantic calibration remains a separate governed stage; this record establishes structural fidelity only.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

async function readSyntheticInput() {
  const fixtures = JSON.parse(await readFile(FIXTURES_PATH, "utf8"));
  return fixtures.synthetic_input;
}

async function sourceManifest() {
  const manifest = [];
  for (const relativePath of SOURCE_PATHS) {
    const content = await readFile(path.join(REPO_ROOT, relativePath));
    manifest.push({ path: relativePath, bytes: content.byteLength, sha256: sha256Bytes(content) });
  }
  return manifest;
}

async function runInputs(input) {
  const semantic = await fingerprintContractInput(input);
  const sources = await sourceManifest();
  const requestSha256ByModel = {};
  for (const model of MODELS) {
    requestSha256ByModel[model] = sha256Bytes(stableStringify(buildModelRequest(model, input)));
  }
  return {
    semantic,
    source_manifest: sources,
    source_manifest_sha256: sha256Bytes(stableStringify(sources)),
    request_sha256_by_model: requestSha256ByModel,
  };
}

async function runtimeContext() {
  const [{ stdout: head }, { stdout: status }, { stdout: wranglerVersion }] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT }),
    execFileAsync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: REPO_ROOT }),
    execFileAsync(path.join(REPO_ROOT, "node_modules/.bin/wrangler"), ["--version"], { cwd: REPO_ROOT }),
  ]);
  const statusText = status.trimEnd();
  return {
    baseline: {
      head: head.trim(),
      dirty: statusText.length > 0,
      dirty_entry_count: statusText.length === 0 ? 0 : statusText.split("\n").length,
      dirty_state_sha256: sha256Bytes(statusText),
    },
    runtime: { node: process.version, wrangler: wranglerVersion.trim() },
  };
}

async function offlineFixtureResult() {
  const { stdout } = await execFileAsync(process.execPath, [TEST_PATH], {
    cwd: REPO_ROOT,
    maxBuffer: 2 * 1024 * 1024,
  });
  const match = stdout.match(/(\d+)\/(\d+) spike tests passed/);
  if (!match) throw new Error("Offline spike self-test did not report a count");
  return {
    passed: match[1] === match[2],
    passed_count: Number(match[1]),
    total_count: Number(match[2]),
  };
}

function sanitizeCallRecord(record) {
  return {
    model: record.model,
    index: record.index,
    started_at: record.started_at ?? null,
    ended_at: record.ended_at ?? null,
    latency_ms: record.latency_ms ?? null,
    call_state: record.call_state,
    error_code: record.error_code ?? null,
    error_message: record.error_message ?? null,
    content_candidates: record.content_candidates ?? [],
    classification: record.classification,
    repair_kind: record.repair_kind ?? null,
    validation_errors: record.validation_errors ?? [],
    validated_verdict: record.validated_verdict ?? null,
    validated_verdict_sha256: record.validated_verdict_sha256 ?? null,
    usage: record.usage ?? {},
    reported_effective_values: record.reported_effective_values ?? {},
    request_sha256: record.request_sha256,
  };
}

async function callRecord({ model, index, call, requestSha256, probe }) {
  const classified = await classifyJudgeCall(call);
  const base = sanitizeCallRecord({
    model,
    index,
    ...call,
    content_candidates: classified.candidates,
    classification: classified.classification,
    repair_kind: classified.repair_kind,
    validation_errors: classified.validation_errors,
    validated_verdict: classified.verdict,
    validated_verdict_sha256: classified.verdict_sha256,
    request_sha256: requestSha256,
  });
  if (probe) {
    base.accepted = base.content_candidates.length > 0
      && !["provider_error", "timeout", "empty_response"].includes(base.classification);
  }
  return base;
}

function inputTokenUpperBound(input) {
  return Math.max(...MODELS.map((model) => Buffer.byteLength(JSON.stringify(buildModelRequest(model, input)), "utf8")));
}

function evidenceBasename(evidence, attemptId = randomUUID()) {
  if (typeof attemptId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(attemptId)) throw new TypeError("artifact attempt id is invalid");
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
  return `${evidence.run.started_at.slice(0, 10)}-${evidence.run.id.slice(0, 8)}-${sha256Bytes(evidenceBytes).slice(0, 16)}-${attemptId}-v2`;
}

function assertSafeBasename(value, label = "artifact") {
  if (typeof value !== "string" || path.basename(value) !== value || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/.test(value)) {
    throw new TypeError(`${label} basename is unsafe`);
  }
  return value;
}

function canonicalSystemPath(resolved) {
  // macOS exposes /tmp and /var as firmlinks into /private; other platforms resolve them literally.
  if (process.platform !== "darwin") return resolved;
  return resolved === "/var" || resolved.startsWith("/var/") ? `/private${resolved}`
    : resolved === "/tmp" || resolved.startsWith("/tmp/") ? `/private${resolved}` : resolved;
}

async function physicalDirectory(directory) {
  const resolved = path.resolve(directory);
  await mkdir(resolved, { recursive: true });
  const physical = await realpath(resolved);
  const systemCanonical = canonicalSystemPath(resolved);
  if (physical !== systemCanonical) throw new Error("output directory must not contain symlink aliases");
  return physical;
}

async function syncDirectory(directory) {
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}



async function durableWriteJson(target, value) {
  const directory = await physicalDirectory(path.dirname(target));
  if (canonicalSystemPath(path.dirname(path.resolve(target))) !== directory) throw new Error("durable JSON target escapes its physical output directory");
  const temporary = `${target}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
    await handle.sync();
    await handle.close(); handle = null;
    await rename(temporary, target);
    await syncDirectory(directory);
  } finally {
    await handle?.close().catch(() => {});
    await unlink(temporary).catch(() => {});
  }
}

/**
 * Acquire an exclusive recovery lock. Existing lock ownership is never inferred
 * from age; stale and unknown locks require explicit manual recovery.
 */
export async function acquireRecoveryLock(resultsDir = RESULTS_DIR, { now = new Date(), attempt_id = randomUUID() } = {}) {
  assertSafeBasename(attempt_id, "lock attempt");
  const directory = await physicalDirectory(resultsDir);
  const lockPath = path.join(directory, RECOVERY_LOCK_FILE);
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify({ attempt_id, pid: process.pid, created_at: now.toISOString() })}
`);
    await handle.sync();
    await syncDirectory(directory);
    let released = false;
    return {
      acquired: true,
      attempt_id,
      lockPath,
      async release() {
        if (released) return;
        released = true;
        await handle.close();
        let retained;
        try { retained = JSON.parse(await readFile(lockPath, "utf8")); } catch { throw new Error("recovery lock ownership became unprovable; manual recovery required"); }
        if (retained?.attempt_id !== attempt_id) throw new Error("recovery lock ownership changed; refusing to unlink a successor lock");
        await unlink(lockPath);
        await syncDirectory(directory);
      },
    };
  } catch (error) {
    await handle?.close().catch(() => {});
    if (error?.code === "EEXIST") {
      return { acquired: false, reason: "recovery lock exists; stale and unknown locks require manual recovery" };
    }
    throw error;
  }
}




export async function reserveRecoveryAttempt(resultsDir, attemptId, approvalRunId, now) {
  try {
    const existingBytes = await readFile(path.join(resultsDir, RECOVERY_RECEIPT_FILE));
    // The owner-reviewed completed-spend receipt of the 2026-08-22 NO-GO cycle does not
    // block the one successor matrix Justin granted; its bytes are archived aside, not deleted.
    let parsed = null;
    try { parsed = JSON.parse(existingBytes.toString("utf8")); } catch { /* unparseable */ }
    const reviewMatch = parsed && validSpendReceipt(parsed, APPROVED_CALL_CAP)
      && parsed.state === "completed-spent"
      && parsed.attempt_id === OWNER_REVIEWED_SPEND.attempt_id
      && parsed.approval_run_id === OWNER_REVIEWED_SPEND.approval_run_id
      && parsed.calls_started === OWNER_REVIEWED_SPEND.calls_started;
    if (!reviewMatch) throw new Error("an existing spend receipt requires manual recovery before another attempt can be reserved");
    await rename(path.join(resultsDir, RECOVERY_RECEIPT_FILE), path.join(resultsDir, OWNER_REVIEWED_RECEIPT_ARCHIVE));
    await syncDirectory(await physicalDirectory(resultsDir));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const timestamp = now.toISOString();
  const receipt = { schema_version: RECOVERY_RECEIPT_VERSION, attempt_id: attemptId, approval_run_id: approvalRunId, created_at: timestamp, updated_at: timestamp, state: "reserved", calls_started: 0, last_call: null };
  await durableWriteJson(path.join(resultsDir, RECOVERY_RECEIPT_FILE), receipt);
  return receipt;
}

async function clearVerifiedZeroCallReservation(resultsDir, attemptId) {
  const receiptPath = path.join(resultsDir, RECOVERY_RECEIPT_FILE);
  const parsed = parseCanonicalJsonBytes(await readFile(receiptPath), "spend receipt");
  if (!parsed.valid || !validSpendReceipt(parsed.value, APPROVED_CALL_CAP) || parsed.value.attempt_id !== attemptId
    || parsed.value.state !== "reserved" || parsed.value.calls_started !== 0) {
    throw new Error("reserved spend receipt changed before verified zero-call recovery; manual recovery required");
  }
  await unlink(receiptPath);
  await syncDirectory(await physicalDirectory(resultsDir));
}

async function markRecoveryCallStarted(resultsDir, receipt, { kind, model, index }, now = new Date()) {
  const sequence = receipt.calls_started + 1;
  const markedAt = now.toISOString();
  const next = { ...receipt, updated_at: markedAt, state: "calls-started", calls_started: sequence, last_call: { sequence, kind, model, index, marked_at: markedAt } };
  await durableWriteJson(path.join(resultsDir, RECOVERY_RECEIPT_FILE), next);
  return next;
}

async function completeRecoverySpend(resultsDir, receipt, now = new Date(), state = "completed-spent") {
  const completed = { ...receipt, updated_at: now.toISOString(), state };
  await durableWriteJson(path.join(resultsDir, RECOVERY_RECEIPT_FILE), completed);
  return completed;
}

export function approvalTemplate(plan) {
  return {
    schema_version: RECOVERY_APPROVAL_VERSION,
    plan_ref: plan.plan_ref,
    approval_run_id: plan.approval_run_id,
    approved_at: null,
    expires_at: null,
    approved_call_cap: plan.call_policy.approved_call_cap,
    maximum_cost_usd: plan.maximum_cost.gross_usd,
    decision: "REPLACE_WITH_APPROVED_AFTER_REVIEW",
  };
}

// Re-export findPriorOperationalRecovery from the dedicated module.
// The inlined implementation was extracted to recovery-finder.mjs for testability.
export const findPriorOperationalRecovery = _findPriorOperationalRecovery;


export async function buildCurrentRecoveryPlan(options, dependencies = {}) {
  const input = dependencies.input ?? await readSyntheticInput();
  const estimate = estimateMaximumUsage(inputTokenUpperBound(input));
  const requestManifest = buildRequestManifest(input);
  const [legacy, sources, runtime] = await Promise.all([
    (dependencies.currentLegacyIdentity ?? currentLegacyIdentity)(),
    (dependencies.currentSourceIdentity ?? currentSourceIdentity)(SOURCE_PATHS),
    (dependencies.currentRuntimeIdentity ?? currentRuntimeIdentity)(),
  ]);
  const expectedHealth = expectedAdapterHealth(sources, runtime);
  const remaining = options.remaining_free_neurons === null || options.remaining_free_neurons === undefined
    ? null : Number(options.remaining_free_neurons);
  const recoveryPlan = createRecoveryPlan({
    approval_run_id: options.approval_run_id ?? randomUUID(),
    created_at: options.created_at ?? new Date().toISOString(),
    account_profile: options.account_profile,
    plan: options.plan,
    remaining_free_neurons: remaining,
    estimate,
    request_manifest: requestManifest,
    sources,
    runtime,
    expected_health: expectedHealth,
    legacy,
  });
  return { recoveryPlan, input, estimate, requestManifest, legacy, sources, runtime, expectedHealth };
}

function offlinePreflightErrors({ legacy, runtime, fixtures }) {
  const errors = [];
  if (legacy.some(({ sha256, observed_sha256 }) => sha256 !== observed_sha256)) errors.push("immutable v1 evidence hash check failed");
  const legacyFacts = legacy.find(({ path: legacyPath }) => legacyPath.endsWith(".json"))?.facts;
  if (legacyFacts?.decision !== "NO-GO" || legacyFacts?.by_model?.some(({ total, direct_valid, repaired_valid }) => total !== 20 || direct_valid !== 0 || repaired_valid !== 0)) errors.push("immutable v1 NO-GO facts changed");
  const minimumNode = Number(/^>=([0-9]+)/.exec(runtime?.frozen?.node_engines)?.[1]);
  const executingNode = Number(/^v([0-9]+)/.exec(runtime?.execution?.node)?.[1]);
  if (runtime?.execution?.wrangler !== runtime?.frozen?.wrangler || !Number.isInteger(minimumNode) || !Number.isInteger(executingNode) || executingNode < minimumNode) errors.push("frozen runtime identity check failed");
  if (!Array.isArray(fixtures?.declared_ids) || fixtures.declared_ids.length !== 79
    || !Array.isArray(fixtures?.passing_ids) || stableStringify(fixtures.declared_ids) !== stableStringify(fixtures.passing_ids)
    || !Array.isArray(fixtures?.failures) || fixtures.failures.length !== 0) errors.push("shared 79-fixture gate failed");
  return errors;
}

export async function writePlanDisclosure(plan, outputPath, options = {}) {
  const resolved = path.resolve(outputPath);
  const templatePath = resolved.replace(/\.json$/, "-approval-template.json");
  if (templatePath === resolved) throw new Error("plan output path must end in .json");
  const lexicalRelative = path.relative(REPO_ROOT, resolved);
  if (lexicalRelative === "" || (!lexicalRelative.startsWith(`..${path.sep}`) && lexicalRelative !== ".." && !path.isAbsolute(lexicalRelative))) {
    throw new Error("plan disclosure output must be outside the repository");
  }
  const physicalParent = await physicalDirectory(path.dirname(resolved));
  const resolvedThroughParent = path.join(physicalParent, path.basename(resolved));
  const repositoryRelative = path.relative(REPO_ROOT, resolvedThroughParent);
  if (repositoryRelative === "" || (!repositoryRelative.startsWith(`..${path.sep}`) && repositoryRelative !== ".." && !path.isAbsolute(repositoryRelative))) {
    throw new Error("plan disclosure output must be outside the repository");
  }
  assertSafeBasename(path.basename(resolved), "plan");
  assertSafeBasename(path.basename(templatePath), "approval template");
  const completionBase = `${path.basename(resolved, ".json")}-disclosure`;
  const completed = await publishCompletedSet(physicalParent, completionBase, [
    { name: path.basename(resolved), bytes: `${JSON.stringify(plan, null, 2)}\n` },
    { name: path.basename(templatePath), bytes: `${JSON.stringify(approvalTemplate(plan), null, 2)}\n` },
  ], options);
  return { planPath: resolvedThroughParent, templatePath: path.join(physicalParent, path.basename(templatePath)), completionPath: completed.markerPath };
}

function resultSkeleton({ context, inputs, fixtures, authorization, estimate, blockers }) {
  const startedAt = new Date().toISOString();
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    run: {
      id: randomUUID(),
      started_at: startedAt,
      ended_at: startedAt,
      terminal_stage: "preflight",
      baseline: context.baseline,
      runtime: context.runtime,
      authorization,
      models: MODELS,
      request: {
        temperature: REQUESTED_TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format_type: "json_schema",
        timeout_ms: DEFAULT_TIMEOUT_MS,
      },
      inputs,
      cost_estimate: estimate,
      preflight_blockers: blockers,
    },
    fixture_results: fixtures,
    probes: [],
    trials: [],
    summary: summarizeTrials([]),
    outcome: { decision: "BLOCKED", reasons: [...blockers] },
  };
}

async function writeEvidence(result) {
  await mkdir(RESULTS_DIR, { recursive: true });
  const date = result.run.started_at.slice(0, 10);
  const basename = `${date}-${result.run.id.slice(0, 8)}`;
  const jsonPath = path.join(RESULTS_DIR, `${basename}.json`);
  const markdownPath = path.join(RESULTS_DIR, `${basename}.md`);
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  await writeFile(markdownPath, renderMarkdown(result), { flag: "wx" });
  return { jsonPath, markdownPath };
}

function envelopeFromCandidates(candidates) {
  const envelope = {};
  for (const candidate of candidates) {
    if (candidate.location === "response") envelope.response = candidate.value;
    else if (candidate.location === "result") envelope.result = candidate.value;
    else if (candidate.location === "choices[0].message.content") {
      envelope.choices = [{ message: { content: candidate.value } }];
    }
  }
  return envelope;
}

function validateResultShape(result) {
  const errors = [];
  const top = ["schema_version", "run", "fixture_results", "probes", "trials", "summary", "outcome"];
  exactKeys(result, top, top, "result", errors);
  if (result.schema_version !== RESULT_SCHEMA_VERSION) errors.push("result.schema_version is unsupported");
  const runKeys = [
    "id", "started_at", "ended_at", "terminal_stage", "baseline", "runtime", "authorization",
    "models", "request", "inputs", "cost_estimate", "preflight_blockers",
  ];
  exactKeys(result.run, runKeys, runKeys, "result.run", errors);
  if (!Array.isArray(result.probes)) errors.push("result.probes must be an array");
  if (!Array.isArray(result.trials)) errors.push("result.trials must be an array");
  if (!Array.isArray(result.outcome?.reasons)) errors.push("result.outcome.reasons must be an array");
  if (!["GO", "NO-GO", "BLOCKED"].includes(result.outcome?.decision)) errors.push("result.outcome.decision is invalid");
  if (stableStringify(result.run?.models) !== stableStringify(MODELS)) errors.push("result.run.models does not match the frozen models");
  if (result.run?.authorization?.approved_call_cap > APPROVED_CALL_CAP) errors.push("result exceeds the approved call cap");
  return errors;
}

async function verifyRecord(record, inputs, probe) {
  const call = {
    call_state: record.call_state,
    error_code: record.error_code,
    envelope: envelopeFromCandidates(record.content_candidates),
  };
  const recomputed = await classifyJudgeCall(call);
  const errors = [];
  if (recomputed.classification !== record.classification) errors.push("classification mismatch");
  if ((recomputed.repair_kind ?? null) !== record.repair_kind) errors.push("repair kind mismatch");
  if (stableStringify(recomputed.validation_errors ?? []) !== stableStringify(record.validation_errors)) {
    errors.push("validation errors mismatch");
  }
  if (stableStringify(recomputed.candidates ?? []) !== stableStringify(record.content_candidates)) {
    errors.push("content candidates mismatch");
  }
  if (stableStringify(recomputed.verdict ?? null) !== stableStringify(record.validated_verdict)) {
    errors.push("validated verdict mismatch");
  }
  if ((recomputed.verdict_sha256 ?? null) !== record.validated_verdict_sha256) {
    errors.push("validated verdict hash mismatch");
  }
  if (record.request_sha256 !== inputs.request_sha256_by_model[record.model]) {
    errors.push("request fingerprint mismatch");
  }
  if (probe) {
    const accepted = (recomputed.candidates?.length ?? 0) > 0
      && !["provider_error", "timeout", "empty_response"].includes(recomputed.classification);
    if (accepted !== record.accepted) errors.push("probe acceptance mismatch");
  }
  return errors;
}

export async function verifyRunResult(result, markdown) {
  const errors = validateResultShape(result);
  if (errors.length > 0) return errors;

  const input = await readSyntheticInput();
  const currentInputs = await runInputs(input);
  if (stableStringify(currentInputs) !== stableStringify(result.run.inputs)) {
    errors.push("executable input or source manifest drift");
  }
  const fixtureResult = await offlineFixtureResult();
  if (stableStringify(fixtureResult) !== stableStringify(result.fixture_results)) {
    errors.push("offline fixture result mismatch");
  }

  for (const probe of result.probes) {
    for (const error of await verifyRecord(probe, result.run.inputs, true)) {
      errors.push(`probe ${probe.model}: ${error}`);
    }
  }
  for (const trial of result.trials) {
    for (const error of await verifyRecord(trial, result.run.inputs, false)) {
      errors.push(`trial ${trial.model}#${trial.index}: ${error}`);
    }
  }

  for (const model of MODELS) {
    const indices = result.trials.filter((trial) => trial.model === model).map((trial) => trial.index);
    if (stableStringify(indices) !== stableStringify(Array.from({ length: indices.length }, (_, index) => index + 1))) {
      errors.push(`${model}: trial indices are not unique and contiguous`);
    }
  }
  if (result.probes.length + result.trials.length > result.run.authorization.approved_call_cap) {
    errors.push("recorded calls exceed the approved cap");
  }

  const summary = summarizeTrials(result.trials);
  if (stableStringify(summary) !== stableStringify(result.summary)) errors.push("summary arithmetic mismatch");
  const outcome = decideOutcome({
    probes: result.probes,
    trials: result.trials,
    fixture_results: result.fixture_results,
    preflight_blockers: result.run.preflight_blockers,
  });
  if (stableStringify(outcome) !== stableStringify(result.outcome)) errors.push("outcome predicate mismatch");
  if (renderMarkdown(result) !== markdown) errors.push("Markdown decision record mismatch");
  return errors;
}

async function verifyEvidenceFile(jsonPath) {
  const resolved = path.resolve(jsonPath);
  const result = JSON.parse(await readFile(resolved, "utf8"));
  const markdownPath = resolved.replace(/\.json$/, ".md");
  if (markdownPath === resolved) throw new Error(`Result path must end in .json: ${resolved}`);
  const markdown = await readFile(markdownPath, "utf8");
  const errors = await verifyRunResult(result, markdown);
  if (errors.length > 0) throw new Error(`${path.basename(resolved)}:\n- ${errors.join("\n- ")}`);
  return { result, markdownPath };
}

function parseOptions(argv) {
  const options = { positional: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      options.positional.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replaceAll("-", "_");
    if (inlineValue !== undefined) options[key] = inlineValue;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) options[key] = argv[++index];
    else options[key] = true;
  }
  return options;
}

export async function writeOperationalEvidence(evidence, resultsDir = RESULTS_DIR) {
  await mkdir(resultsDir, { recursive: true });
  const date = evidence.run.started_at.slice(0, 10);
  const basename = `${date}-${evidence.run.id.slice(0, 8)}-v2`;
  const jsonPath = path.join(resultsDir, `${basename}.json`);
  const markdownPath = path.join(resultsDir, `${basename}.md`);
  const nonce = randomUUID();
  const jsonTemp = `${jsonPath}.${nonce}.tmp`;
  const markdownTemp = `${markdownPath}.${nonce}.tmp`;
  let jsonPublished = false;
  try {
    await writeFile(jsonTemp, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
    await writeFile(markdownTemp, evidence.report, { flag: "wx" });
    await link(jsonTemp, jsonPath); jsonPublished = true;
    await link(markdownTemp, markdownPath);
  } catch (error) {
    if (jsonPublished) await unlink(jsonPath).catch(() => {});
    throw error;
  } finally {
    await Promise.all([unlink(jsonTemp).catch(() => {}), unlink(markdownTemp).catch(() => {})]);
  }
  return { jsonPath, markdownPath };
}

async function publishCompletedSet(directory, basename, members, { onBoundary = async () => {} } = {}) {
  const physical = await physicalDirectory(directory);
  assertSafeBasename(basename, "completion");
  const normalized = members.map(({ name, bytes }) => {
    assertSafeBasename(name);
    const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    return { name, bytes: value };
  });
  if (new Set(normalized.map(({ name }) => name)).size !== normalized.length) throw new Error("completion set contains duplicate names");
  const nonce = randomUUID();
  const temps = normalized.map(({ name }) => path.join(physical, `.${name}.${nonce}.tmp`));
  const targets = normalized.map(({ name }) => path.join(physical, name));
  const markerName = `${basename}.complete.json`;
  assertSafeBasename(markerName, "completion marker");
  const markerPath = path.join(physical, markerName);
  const markerTemp = path.join(physical, `.${markerName}.${nonce}.tmp`);
  const published = [];
  let markerPublished = false;
  try {
    for (let index = 0; index < normalized.length; index += 1) {
      const handle = await open(temps[index], "wx", 0o600);
      try { await handle.writeFile(normalized[index].bytes); await handle.sync(); } finally { await handle.close(); }
      await onBoundary(`prepared:${normalized[index].name}`);
    }
    for (let index = 0; index < targets.length; index += 1) {
      await link(temps[index], targets[index]);
      published.push(targets[index]);
      await syncDirectory(physical);
      await onBoundary(`published:${normalized[index].name}`);
    }
    const marker = {
      schema_version: RECOVERY_COMPLETION_VERSION,
      basename,
      files: normalized.map(({ name, bytes }) => ({ name, bytes: bytes.byteLength, sha256: sha256Bytes(bytes) })),
    };
    const markerHandle = await open(markerTemp, "wx", 0o600);
    try { await markerHandle.writeFile(`${JSON.stringify(marker, null, 2)}\n`); await markerHandle.sync(); } finally { await markerHandle.close(); }
    await onBoundary("prepared:completion");
    await link(markerTemp, markerPath); markerPublished = true;
    await syncDirectory(physical);
    await onBoundary("published:completion");
    return { markerPath, marker };
  } catch (error) {
    if (markerPublished) await unlink(markerPath).catch(() => {});
    await Promise.all(published.map((target) => unlink(target).catch(() => {})));
    await syncDirectory(physical).catch(() => {});
    throw error;
  } finally {
    await Promise.all([...temps, markerTemp].map((temporary) => unlink(temporary).catch(() => {})));
  }
}

export async function writeRecoveryArtifacts(evidence, qualification, resultsDir = RESULTS_DIR, basename = evidenceBasename(evidence), options = {}) {
  assertSafeBasename(basename, "recovery artifact");
  if (!basename.endsWith("-v2")) throw new Error("recovery artifact basename must end in -v2");
  if (qualification?.evidence?.file !== `${basename}.json`) throw new Error("qualification sibling does not match the execution artifact basename");
  const members = [
    { name: `${basename}.json`, bytes: `${JSON.stringify(evidence, null, 2)}\n` },
    { name: `${basename}.md`, bytes: evidence.report },
    { name: `${basename.replace(/-v2$/, "")}-qualification.json`, bytes: `${JSON.stringify(qualification, null, 2)}\n` },
  ];
  const completed = await publishCompletedSet(resultsDir, basename, members, options);
  return {
    jsonPath: path.join(resultsDir, members[0].name),
    markdownPath: path.join(resultsDir, members[1].name),
    qualificationPath: path.join(resultsDir, members[2].name),
    completionPath: completed.markerPath,
  };
}

async function retainInvalidEvidence(evidence, resultsDir = RESULTS_DIR, attemptId = randomUUID()) {
  const directory = await physicalDirectory(resultsDir);
  const target = path.join(directory, `${evidenceBasename(evidence, attemptId)}-invalid.json`);
  const handle = await open(target, "wx", 0o600);
  try { await handle.writeFile(`${JSON.stringify(evidence, null, 2)}\n`); await handle.sync(); } finally { await handle.close(); }
  await syncDirectory(directory);
  return target;
}

export async function runLive(options, dependencies = {}) {
  if ((dependencies.ci ?? process.env.CI) && dependencies.allowCi !== true) throw new Error("live recovery is forbidden in CI");
  const operatorPresent = dependencies.operatorPresent ?? (process.stdin.isTTY === true && process.stdout.isTTY === true);
  if (!operatorPresent) throw new Error("live recovery requires an interactive operator terminal");
  const resultsDir = dependencies.resultsDir ?? RESULTS_DIR;
  const filesystemGovernance = dependencies.recoveryGovernance === true || !Object.hasOwn(dependencies, "findPriorRecovery");
  const governanceState = { receipt: null, evidence: null, retained: false };
  const attemptId = dependencies.attemptId ?? randomUUID();
  const lock = filesystemGovernance
    ? await acquireRecoveryLock(resultsDir, { ...(dependencies.lockOptions ?? {}), attempt_id: attemptId })
    : { acquired: true, attempt_id: attemptId, async release() {} };
  if (!lock.acquired) {
    console.log(`Recovery attempt blocked: ${lock.reason}`);
    return "RECOVERY-LOCKED";
  }
  try {
    return await runLiveExclusive(options, { ...dependencies, resultsDir, _attemptId: attemptId, _filesystemGovernance: filesystemGovernance, _governanceState: governanceState });
  } catch (error) {
    if (filesystemGovernance && governanceState.receipt?.calls_started > 0) {
      governanceState.receipt = await completeRecoverySpend(resultsDir, governanceState.receipt, new Date(), "consumed_incomplete").catch(() => governanceState.receipt);
      if (governanceState.evidence && !governanceState.retained) {
        await retainInvalidEvidence(governanceState.evidence, resultsDir, governanceState.receipt.attempt_id).then(() => { governanceState.retained = true; }).catch(() => {});
      }
    }
    throw error;
  } finally {
    await lock.release();
  }
}

async function runLiveExclusive(options, dependencies = {}) {
  let prior = dependencies.findPriorRecovery
    ? await dependencies.findPriorRecovery(dependencies.resultsDir ?? RESULTS_DIR)
    : await findPriorOperationalRecovery(dependencies.resultsDir ?? RESULTS_DIR, dependencies.evidenceDependencies ?? {});
  if (prior?.safe_zero_call_receipt === true && dependencies._filesystemGovernance) {
    await clearVerifiedZeroCallReservation(dependencies.resultsDir, prior.attempt_id);
    prior = null;
  }
  if (prior) {
    console.log(`Prior operational recovery already retained: ${prior.evidence_file ?? prior.receipt_file ?? "unsafe recovery state"}`);
    if (prior.refs_verified === true && prior.qualification_refs.length) console.log(`Qualification refs: ${JSON.stringify(prior.qualification_refs)}`);
    return "PRIOR-RECOVERY";
  }
  let storedPlan;
  let immutableTemplatePath = null;
  if (Object.hasOwn(dependencies, "plan")) storedPlan = dependencies.plan;
  else {
    const planPath = path.resolve(options.plan_file);
    const planName = path.basename(planPath);
    if (!planName.endsWith(".json")) throw new Error("recovery plan file must end in .json");
    const directory = path.dirname(planPath);
    const templateName = planName.replace(/\.json$/, "-approval-template.json");
    immutableTemplatePath = path.join(directory, templateName);
    const markerName = `${planName.slice(0, -".json".length)}-disclosure.complete.json`;
    const completed = await verifyCompletedArtifactSet(directory, markerName, [planName, templateName]);
    if (!completed.valid) throw new Error(`recovery disclosure is incomplete or changed: ${completed.errors.join("; ")}`);
    const parsed = parseCanonicalJsonBytes(await readFile(planPath), "recovery plan");
    if (!parsed.valid) throw new Error(parsed.errors.join("; "));
    storedPlan = parsed.value;
  }
  let approval = dependencies.approval ?? null;
  let approvalLoadError = null;
  if (!Object.hasOwn(dependencies, "approval") && typeof options.approval_file === "string") {
    try {
      const approvalPath = path.resolve(options.approval_file);
      if (immutableTemplatePath && approvalPath === immutableTemplatePath) throw new Error("approval must be copied to a distinct canonical approval file; the disclosed template is immutable");
      const parsed = parseCanonicalJsonBytes(await readFile(approvalPath), "approval record");
      if (!parsed.valid) throw new SyntaxError(parsed.errors.join("; "));
      approval = parsed.value;
    }
    catch (error) {
      if (error instanceof SyntaxError) approvalLoadError = "approval JSON is malformed";
      else if (error?.code === "ENOENT") approvalLoadError = "approval file is missing";
      else throw error;
      approval = null;
    }
  } else if (approval === null) {
    approvalLoadError = "approval record is missing";
  }
  const current = await buildCurrentRecoveryPlan({
    approval_run_id: storedPlan.approval_run_id,
    created_at: storedPlan.created_at,
    account_profile: storedPlan.account.profile,
    plan: storedPlan.account.plan,
    remaining_free_neurons: storedPlan.account.remaining_free_neurons,
  }, dependencies);
  const { recoveryPlan: plan, input, estimate, requestManifest: manifest, legacy, sources, runtime, expectedHealth } = current;
  const storedPlanValidation = validateRecoveryPlan(storedPlan, { legacy });
  if (!storedPlanValidation.valid) throw new Error(`recovery plan is invalid: ${storedPlanValidation.errors.join("; ")}`);
  const attemptId = dependencies._attemptId;
  const receiptNow = dependencies.now ?? new Date();
  let receipt = dependencies._filesystemGovernance
    ? await reserveRecoveryAttempt(dependencies.resultsDir, attemptId, storedPlan.approval_run_id, receiptNow)
    : { schema_version: RECOVERY_RECEIPT_VERSION, attempt_id: attemptId, approval_run_id: storedPlan.approval_run_id, created_at: receiptNow.toISOString(), updated_at: receiptNow.toISOString(), state: "reserved", calls_started: 0, last_call: null };
  dependencies._governanceState.receipt = receipt;
  await dependencies.afterReceiptReserved?.(structuredClone(receipt));
  const fixtures = await (dependencies.executeFixtures ?? executeCurrentFixtureCatalog)();
  console.log(`Frozen plan: ${plan.plan_ref}; approval run: ${plan.approval_run_id}.`);
  console.log(`Frozen cap: ${APPROVED_CALL_CAP} calls; conservative gross maximum: ${estimate.gross_neurons.toFixed(0)} neurons / $${estimate.gross_usd.toFixed(4)}.`);
  const planMatches = stableStringify(storedPlan) === stableStringify(plan);
  const approvalValidation = validateApproval(approval, plan, dependencies.now ?? new Date());
  if (approvalLoadError && !approvalValidation.errors.includes(approvalLoadError)) approvalValidation.errors.unshift(approvalLoadError);
  approvalValidation.valid = approvalValidation.errors.length === 0;
  const offlineErrors = offlinePreflightErrors({ legacy, runtime, fixtures });
  const approvalPermitsPreflight = planMatches && approvalValidation.valid && offlineErrors.length === 0;
  if (offlineErrors.length) console.log(`Offline preflight blocked: ${offlineErrors.join("; ")}`);
  const baseUrl = options.base_url ?? DEFAULT_BASE_URL;
  const healthEndpoint = new URL("health", assertLoopbackBaseUrl(baseUrl)).href;
  let observed = { endpoint: healthEndpoint, http_status: 0, body: null };
  if (approvalPermitsPreflight) {
    try { observed = await (dependencies.observeHealth ?? observeAdapterHealth)(baseUrl); }
    catch { /* retain typed failed observation */ }
  }
  let adapter = buildAdapterIdentity({
    observed_health: observed.body,
    http_status: observed.http_status,
    endpoint: observed.endpoint,
    outbound_request: manifest,
    sources,
    runtime,
    observation_attempted: approvalPermitsPreflight,
  });
  const startedAt = (dependencies.runStartedAt ?? dependencies.now ?? new Date()).toISOString();
  const runApprovalValidation = validateApproval(approval, plan, new Date(startedAt));
  const approvalPermitsCalls = approvalPermitsPreflight && runApprovalValidation.valid;
  const preflightChecks = {
    plan_match: planMatches,
    approval_preflight: { valid: approvalValidation.valid, errors: [...approvalValidation.errors] },
    offline_errors: [...offlineErrors],
    adapter: { attempted: approvalPermitsPreflight, identity_match: adapter.identity_match },
    approval_at_run_start: { valid: runApprovalValidation.valid, errors: [...runApprovalValidation.errors] },
  };
  const preflightBlockers = [];
  if (!preflightChecks.plan_match) preflightBlockers.push("frozen plan differs from current repository/runtime/request disclosure");
  for (const error of preflightChecks.approval_preflight.errors) preflightBlockers.push(`approval: ${error}`);
  for (const error of preflightChecks.offline_errors) preflightBlockers.push(`offline gate: ${error}`);
  if (!preflightChecks.adapter.attempted) preflightBlockers.push("adapter identity preflight skipped because earlier authority or offline gates failed");
  else if (!preflightChecks.adapter.identity_match) preflightBlockers.push("adapter identity preflight failed");
  if (preflightChecks.approval_preflight.valid && !preflightChecks.approval_at_run_start.valid) {
    for (const error of preflightChecks.approval_at_run_start.errors) preflightBlockers.push(`run-start approval: ${error}`);
  }
  let records = [];
  if (preflightBlockers.length === 0) {
    records = await executeRecoveryProtocol({
      requests: manifest.by_model,
      base_url: baseUrl,
      invoke: dependencies.invoke ?? invokeAdapter,
      async before_invoke(call) {
        try {
          receipt = dependencies._filesystemGovernance
            ? await markRecoveryCallStarted(dependencies.resultsDir, receipt, call, dependencies.callReceiptNow?.(call) ?? new Date())
            : { ...receipt, state: "calls-started", calls_started: receipt.calls_started + 1, last_call: { sequence: receipt.calls_started + 1, ...call, marked_at: new Date().toISOString() } };
          dependencies._governanceState.receipt = receipt;
          await dependencies.afterCallReceipt?.(structuredClone(receipt));
        } catch (error) {
          if (error?.code === "ODDSPARK_FATAL_PROCESS_EXIT") throw error;
          const failure = error instanceof Error ? error : new Error(String(error));
          failure.code = "ODDSPARK_RECOVERY_GOVERNANCE_FAILURE";
          throw failure;
        }
      },
      on_record(record) { records.push(record); },
    });
  }
  const postCallInput = await (dependencies.currentInput ?? readSyntheticInput)();
  const postCallManifest = buildRequestManifest(postCallInput);
  const [postCallLegacy, postCallSources, postCallRuntime] = await Promise.all([
    (dependencies.currentLegacyIdentity ?? currentLegacyIdentity)(),
    (dependencies.currentSourceIdentity ?? currentSourceIdentity)(SOURCE_PATHS),
    (dependencies.currentRuntimeIdentity ?? currentRuntimeIdentity)(),
  ]);
  const postCallDrift = stableStringify(postCallManifest) !== stableStringify(manifest)
    || stableStringify(postCallSources) !== stableStringify(sources)
    || stableStringify(postCallRuntime) !== stableStringify(runtime)
    || stableStringify(postCallLegacy) !== stableStringify(legacy);
  if (postCallDrift && records.length > 0) {
    adapter = buildAdapterIdentity({
      observed_health: observed.body,
      http_status: observed.http_status,
      endpoint: observed.endpoint,
      outbound_request: manifest,
      sources: postCallSources,
      runtime: postCallRuntime,
      observation_attempted: approvalPermitsPreflight,
    });
    if (adapter.identity_match && stableStringify(postCallManifest) !== stableStringify(manifest)) adapter.identity_match = false;
  }
  const endedAt = new Date(Math.max(
    Date.now(),
    Date.parse(startedAt),
    ...records.map((record) => Date.parse(record.ended_at)).filter(Number.isFinite),
  )).toISOString();
  const run = {
    id: plan.approval_run_id,
    started_at: startedAt,
    ended_at: endedAt,
    models: MODELS,
    authorization: {
      operator_approved: approvalPermitsCalls,
      profile_confirmed: true,
      headroom_confirmed: true,
      approved_call_cap: approvalPermitsCalls ? plan.call_policy.approved_call_cap : 0,
      estimated_calls: APPROVED_CALL_CAP,
      calls_made: records.length,
      plan: plan.account.plan,
      remaining_free_neurons: plan.account.remaining_free_neurons,
      estimated_gross_neurons: estimate.gross_neurons,
    },
    preflight_checks: preflightChecks,
    preflight_blockers: preflightBlockers,
  };
  const evidence = await buildOperationalEvidence({
    candidate_schema_version: `oddspark-candidate/v${input.candidate.version}`,
    candidate: input.candidate,
    request_input: input,
    source_paths: SOURCE_PATHS,
    fixtures,
    adapter,
    run,
    records,
  }, {
    currentLegacyIdentity: async () => postCallLegacy,
    currentSourceIdentity: async () => postCallSources,
    currentRuntimeIdentity: async () => postCallRuntime,
    ...(dependencies.evidenceDependencies ?? {}),
  });
  dependencies._governanceState.evidence = evidence;
  const verification = await verifyEvidenceV2(evidence, {
    currentLegacyIdentity: async () => postCallLegacy,
    executeFixtures: async () => fixtures,
    currentSourceIdentity: async () => postCallSources,
    currentRuntimeIdentity: async () => postCallRuntime,
    ...(dependencies.evidenceDependencies ?? {}),
  });
  if (!verification.valid) {
    const retainedPath = await (dependencies.retainInvalidEvidence ?? retainInvalidEvidence)(evidence, dependencies.resultsDir);
    dependencies._governanceState.retained = true;
    const failed = verification.predicate_results.filter(({ pass }) => !pass).map(({ id }) => id);
    throw new Error(`retained evidence failed verification at ${retainedPath}: ${failed.join(", ")}`);
  }
  const artifactBasename = evidenceBasename(evidence, attemptId);
  const evidenceFile = `${artifactBasename}.json`;
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
  const qualification = await (dependencies.buildQualificationBundle ?? buildQualificationBundle)({ plan, approval, evidence, evidence_file: evidenceFile, evidence_bytes: evidenceBytes }, {
    currentLegacyIdentity: async () => postCallLegacy,
    executeFixtures: async () => fixtures,
    currentSourceIdentity: async () => postCallSources,
    currentRuntimeIdentity: async () => postCallRuntime,
    ...(dependencies.evidenceDependencies ?? {}),
  });
  const qualificationVerification = await (dependencies.verifyQualificationBundle ?? verifyQualificationBundle)(qualification, evidence, evidenceBytes, {
    currentLegacyIdentity: async () => postCallLegacy,
    executeFixtures: async () => fixtures,
    currentSourceIdentity: async () => postCallSources,
    currentRuntimeIdentity: async () => postCallRuntime,
    ...(dependencies.evidenceDependencies ?? {}),
  });
  if (!qualificationVerification.valid) throw new Error(`qualification bundle failed verification: ${qualificationVerification.errors.join(", ")}`);
  const files = await (dependencies.writeArtifacts ?? writeRecoveryArtifacts)(evidence, qualification, dependencies.resultsDir, artifactBasename, dependencies.publicationOptions);
  if (dependencies._filesystemGovernance) {
    if (receipt.calls_started > 0) {
      const expectedNames = [`${artifactBasename}.json`, `${artifactBasename}.md`, `${artifactBasename.replace(/-v2$/, "")}-qualification.json`];
      const completed = await verifyCompletedArtifactSet(dependencies.resultsDir, `${artifactBasename}.complete.json`, expectedNames);
      if (!completed.valid) throw new Error(`published recovery set failed independent completion verification: ${completed.errors.join("; ")}`);
      const rereadEvidenceBytes = await readFile(path.join(dependencies.resultsDir, expectedNames[0]));
      const rereadEvidenceParsed = parseCanonicalJsonBytes(rereadEvidenceBytes, "published evidence");
      const rereadQualificationParsed = parseCanonicalJsonBytes(await readFile(path.join(dependencies.resultsDir, expectedNames[2])), "published qualification");
      const rereadMarkdown = await readFile(path.join(dependencies.resultsDir, expectedNames[1]), "utf8");
      if (!rereadEvidenceParsed.valid || !rereadQualificationParsed.valid || rereadMarkdown !== rereadEvidenceParsed.value?.report) throw new Error("published recovery bytes failed independent parse or Markdown binding");
      const rereadVerification = await verifyQualificationBundle(rereadQualificationParsed.value, rereadEvidenceParsed.value, rereadEvidenceBytes, {
        currentLegacyIdentity: async () => postCallLegacy, executeFixtures: async () => fixtures,
        currentSourceIdentity: async () => postCallSources, currentRuntimeIdentity: async () => postCallRuntime,
        ...(dependencies.evidenceDependencies ?? {}),
      });
      if (!rereadVerification.valid) throw new Error(`published qualification failed independent verification: ${rereadVerification.errors.join("; ")}`);
      receipt = await completeRecoverySpend(dependencies.resultsDir, receipt);
    }
    else {
      await unlink(path.join(dependencies.resultsDir, RECOVERY_RECEIPT_FILE)).catch(() => {});
      await syncDirectory(await physicalDirectory(dependencies.resultsDir));
    }
    dependencies._governanceState.receipt = receipt.calls_started > 0 ? receipt : null;
  }
  console.log(`Decision: ${qualification.outcome.decision}`);
  console.log(`Evidence: ${files.jsonPath}`);
  console.log(`Qualification: ${files.qualificationPath}`);
  for (const ref of qualification.qualification_refs) console.log(`STRUCT-JUDGE-CONFIG ${ref.model}: ${ref.qualification_ref}`);
  if (qualification.role_qualification_ref) console.log(`STRUCT-JUDGE ${qualification.role_qualification_ref}`);
  return qualification.outcome.decision;
}

async function verifyCommand(options) {
  let paths = options.positional.map((value) => path.resolve(value));
  if (paths.length === 0) {
    const entries = await readdir(RESULTS_DIR);
    paths = entries.filter((name) => name.endsWith(".json")).sort().map((name) => path.join(RESULTS_DIR, name));
  }
  if (paths.length === 0) throw new Error("No result JSON files found");
  for (const resultPath of paths) {
    await verifyEvidenceFile(resultPath);
    console.log(`verified ${resultPath}`);
  }
}

export async function planCommand(options, dependencies = {}) {
  const prior = await (dependencies.findPriorRecovery ?? findPriorOperationalRecovery)(dependencies.resultsDir ?? RESULTS_DIR);
  if (prior && prior.safe_zero_call_receipt !== true) throw new Error(`prior operational recovery already retained: ${prior.evidence_file}`);
  if (typeof options.output !== "string" || typeof options.account_profile !== "string" || !["free", "paid"].includes(options.plan)) {
    throw new Error("plan requires --output, --account-profile, and --plan <free|paid>");
  }
  const current = await buildCurrentRecoveryPlan({
    account_profile: options.account_profile,
    plan: options.plan,
    remaining_free_neurons: options.remaining_free_neurons,
    approval_run_id: options.approval_run_id,
  }, dependencies);
  const fixtures = await (dependencies.executeFixtures ?? executeCurrentFixtureCatalog)();
  const offlineErrors = offlinePreflightErrors({ legacy: current.legacy, runtime: current.runtime, fixtures });
  if (offlineErrors.length) throw new Error(`offline plan gates failed: ${offlineErrors.join("; ")}`);
  const { recoveryPlan } = current;
  const files = await writePlanDisclosure(recoveryPlan, options.output);
  console.log(`Plan: ${files.planPath}`);
  console.log(`Plan ref: ${recoveryPlan.plan_ref}`);
  console.log(`Approval run id: ${recoveryPlan.approval_run_id}`);
  console.log(`Maximum: ${recoveryPlan.call_policy.approved_call_cap} calls / $${recoveryPlan.maximum_cost.gross_usd.toFixed(4)} / ${recoveryPlan.maximum_cost.gross_neurons.toFixed(0)} neurons.`);
  console.log(`Approval template (not authority until reviewed, timestamps are filled, and decision is changed to approved): ${files.templatePath}`);
  console.log(`Disclosure completion marker: ${files.completionPath}`);
}

function printUsage() {
  console.log("Usage:");
  console.log("  node spikes/judge-fidelity/run.mjs plan --output <plan.json> --account-profile <label> --plan <free|paid> [--remaining-free-neurons N]");
  console.log("  node spikes/judge-fidelity/run.mjs live --plan-file <plan.json> [--approval-file <approval.json>] [--base-url http://127.0.0.1:8788]");
  console.log("  node spikes/judge-fidelity/run.mjs verify [result.json ...]");
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "help") {
    printUsage();
    return 0;
  }
  const command = argv[0];
  const options = parseOptions(argv.slice(1));
  if (command === "plan") {
    await planCommand(options);
    return 0;
  }
  if (command === "live") {
    if (typeof options.plan_file !== "string") throw new Error("live requires --plan-file");
    const decision = await runLive(options);
    if (decision === "GO") return 0;
    return decision === "NO-GO" ? 2 : decision === "PRIOR-RECOVERY" ? 4 : 3;
  }
  if (command === "verify") {
    await verifyCommand(options);
    return 0;
  }
  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
