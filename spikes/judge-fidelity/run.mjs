import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
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

const execFileAsync = promisify(execFile);
const SPIKE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPIKE_DIR, "../..");
const RESULTS_DIR = path.join(SPIKE_DIR, "results");
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

const MODEL_PRICING = {
  "@cf/openai/gpt-oss-120b": { input_per_million_usd: 0.35, output_per_million_usd: 0.75 },
  "@cf/openai/gpt-oss-20b": { input_per_million_usd: 0.20, output_per_million_usd: 0.30 },
};

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
    const pricing = MODEL_PRICING[model];
    const inputUsd = callsPerModel * inputTokensPerRequest * pricing.input_per_million_usd / 1_000_000;
    const outputUsd = callsPerModel * MAX_TOKENS * pricing.output_per_million_usd / 1_000_000;
    byModel[model] = { calls: callsPerModel, input_usd: inputUsd, output_usd: outputUsd };
    grossUsd += inputUsd + outputUsd;
  }
  return {
    pricing_as_of: "2026-07-29",
    pricing_source: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
    input_token_upper_bound_per_request: inputTokensPerRequest,
    max_output_tokens_per_call: MAX_TOKENS,
    calls_per_model: callsPerModel,
    total_calls: APPROVED_CALL_CAP,
    gross_usd: grossUsd,
    gross_neurons: grossUsd / 0.000011,
    free_neurons_per_day: 10_000,
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

export async function executeRecoveryProtocol({ requests, base_url = DEFAULT_BASE_URL, invoke = invokeAdapter, on_record = () => {} }) {
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
    const usage = call.usage === undefined ? null : call.usage;
    const record = await retainOperationalRecord({ kind, model: entry.model, index, started_at: call.started_at, ended_at: call.ended_at, call_state: call.call_state,
      error_code: call.error_code ?? null, envelope: call.envelope ?? null, usage, request_sha256: entry.sha256, candidate_ref: ref });
    records.push(record);
    await on_record(structuredClone(record));
  };
  const invokeRetained = async (kind, entry, index) => {
    const started_at = new Date().toISOString();
    try { await retain(kind, entry, index, await invoke({ base_url, request_body: entry.body })); }
    catch (error) {
      await retain(kind, entry, index, { call_state: "provider_error", error_code: "invocation_exception", envelope: null, usage: null, started_at, ended_at: new Date().toISOString() });
    }
  };
  for (const entry of requests) await invokeRetained("probe", entry, 1);
  if (!records.some((r) => ["provider_error", "timeout", "empty_response"].includes(r.classification))) {
    for (const entry of requests) for (let i = 1; i <= TRIALS_PER_MODEL; i += 1) await invokeRetained("trial", entry, i);
  }
  return records;
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
    "## Story 1.8 handoff",
    "",
    "Story 1.8 may adopt allowlisted extraction from `response`, `result`, or `choices[0].message.content`; type-sensitive byte-identical duplicate handling; the 64 KiB UTF-8 bound; and exactly one of BOM, lowercase whole-value JSON fence, one double-encoded JSON string, or bounded single-object surrounding-prose repair followed by strict validation.",
    "",
    "Empty or conflicting/ambiguous envelopes, oversized output, truncated or multiple objects, guessed JSON syntax, chained wrappers, schema drift, coercion, semantic omission, and `pass: true` with any reported failure remain hard failures.",
    "",
    "Semantic calibration still depends on Stories 1.3 and 1.8; this record establishes structural fidelity only.",
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

function authorizationFromOptions(options, estimate) {
  const plan = options.plan ?? null;
  const remaining = options.remaining_free_neurons === undefined
    ? null
    : Number(options.remaining_free_neurons);
  const authorization = {
    operator_approved: Number(options.approved_call_cap) === APPROVED_CALL_CAP,
    approved_call_cap: Number(options.approved_call_cap) || 0,
    approval_scope: "2 probes plus 20 counted trials per model; no retries",
    profile_confirmed: options.profile_confirmed === true,
    headroom_confirmed: options.headroom_confirmed === true,
    plan,
    remaining_free_neurons_at_check: Number.isFinite(remaining) ? remaining : null,
    account_identifier_persisted: false,
  };
  const blockers = [];
  if (!authorization.operator_approved) blockers.push(`approved call cap must equal ${APPROVED_CALL_CAP}`);
  if (!authorization.profile_confirmed) blockers.push("active Wrangler profile was not confirmed");
  if (!authorization.headroom_confirmed) blockers.push("Workers AI headroom was not confirmed");
  if (plan !== "free" && plan !== "paid") blockers.push("Workers plan must be confirmed as free or paid");
  if (plan === "free") {
    if (!Number.isFinite(remaining)) blockers.push("remaining free neurons were not recorded");
    else if (remaining < estimate.gross_neurons) blockers.push("remaining free neurons are below the conservative run estimate");
  }
  return { authorization, blockers };
}

function inputTokenUpperBound(input) {
  return Math.max(...MODELS.map((model) => Buffer.byteLength(JSON.stringify(buildModelRequest(model, input)), "utf8")));
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

export async function runLive(options, dependencies = {}) {
  const input = await readSyntheticInput();
  const estimate = estimateMaximumUsage(inputTokenUpperBound(input));
  console.log(`Approved cap: ${APPROVED_CALL_CAP} calls; conservative gross maximum: ${estimate.gross_neurons.toFixed(0)} neurons / $${estimate.gross_usd.toFixed(4)}.`);
  const { authorization, blockers } = authorizationFromOptions(options, estimate);
  const [legacy, sources, runtime, fixtures] = await Promise.all([
    (dependencies.currentLegacyIdentity ?? currentLegacyIdentity)(),
    (dependencies.currentSourceIdentity ?? currentSourceIdentity)(SOURCE_PATHS),
    (dependencies.currentRuntimeIdentity ?? currentRuntimeIdentity)(),
    (dependencies.executeFixtures ?? executeCurrentFixtureCatalog)(),
  ]);
  const baseUrl = options.base_url ?? DEFAULT_BASE_URL;
  const manifest = buildRequestManifest(input);
  const healthEndpoint = new URL("health", assertLoopbackBaseUrl(baseUrl)).href;
  let observed = { endpoint: healthEndpoint, http_status: 0, body: null };
  try { observed = await (dependencies.observeHealth ?? observeAdapterHealth)(baseUrl); }
  catch { /* retain typed failed observation */ }
  const adapter = buildAdapterIdentity({
    observed_health: observed.body,
    http_status: observed.http_status,
    endpoint: observed.endpoint,
    outbound_request: manifest,
    sources,
    runtime,
  });
  const preflightBlockers = [...blockers];
  if (!adapter.identity_match) preflightBlockers.push("adapter identity preflight failed");
  const startedAt = new Date().toISOString();
  let records = [];
  if (preflightBlockers.length === 0) {
    records = await executeRecoveryProtocol({
      requests: manifest.by_model,
      base_url: baseUrl,
      invoke: dependencies.invoke ?? invokeAdapter,
      on_record(record) { records.push(record); },
    });
  }
  const run = {
    id: randomUUID(),
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    models: MODELS,
    authorization: {
      operator_approved: authorization.operator_approved,
      profile_confirmed: authorization.profile_confirmed,
      headroom_confirmed: authorization.headroom_confirmed,
      approved_call_cap: authorization.approved_call_cap,
      estimated_calls: APPROVED_CALL_CAP,
      calls_made: records.length,
      plan: authorization.plan,
      remaining_free_neurons: authorization.remaining_free_neurons_at_check,
      estimated_gross_neurons: estimate.gross_neurons,
    },
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
    currentLegacyIdentity: async () => legacy,
    currentSourceIdentity: async () => sources,
    currentRuntimeIdentity: async () => runtime,
    ...(dependencies.evidenceDependencies ?? {}),
  });
  const files = await (dependencies.writeEvidence ?? writeOperationalEvidence)(evidence, dependencies.resultsDir);
  const verification = await verifyEvidenceV2(evidence, {
    currentLegacyIdentity: async () => legacy,
    executeFixtures: async () => fixtures,
    currentSourceIdentity: async () => sources,
    currentRuntimeIdentity: async () => runtime,
    ...(dependencies.evidenceDependencies ?? {}),
  });
  console.log(`Decision: ${evidence.outcome.decision}`);
  console.log(`Evidence: ${files.jsonPath}`);
  if (!verification.valid) {
    const failed = verification.predicate_results.filter(({ pass }) => !pass).map(({ id }) => id);
    throw new Error(`retained evidence failed verification: ${failed.join(", ")}`);
  }
  return evidence.outcome.decision;
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

function printUsage() {
  console.log("Usage:");
  console.log("  node spikes/judge-fidelity/run.mjs live --approved-call-cap 42 --profile-confirmed --headroom-confirmed --plan <free|paid> [--remaining-free-neurons N]");
  console.log("  node spikes/judge-fidelity/run.mjs verify [result.json ...]");
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "help") {
    printUsage();
    return 0;
  }
  const command = argv[0];
  const options = parseOptions(argv.slice(1));
  if (command === "live") {
    const decision = await runLive(options);
    if (decision === "GO") return 0;
    return decision === "NO-GO" ? 2 : 3;
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
