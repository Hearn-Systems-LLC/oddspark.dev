import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  CONTRACT_VERSION,
  MAX_EXTRACTED_BYTES,
  SYSTEM_PROMPT,
  VERDICT_RESPONSE_FORMAT,
  VERDICT_SCHEMA,
  PREDICATE_ORACLE,
  buildJudgeMessages,
  classifyJudgeCall,
  extractJudgeContent,
  fingerprintContractInput,
  stableStringify,
  validateSpikeInput,
  validateVerdict,
} from "./contract.mjs";
import adapter from "./worker.mjs";
import {
  APPROVED_CALL_CAP,
  DEFAULT_BASE_URL,
  MODELS,
  RESULT_SCHEMA_VERSION,
  assertLoopbackBaseUrl,
  buildModelRequest,
  buildRequestManifest,
  decideOutcome,
  estimateMaximumUsage,
  renderMarkdown,
  runSequentialCalls,
  executeRecoveryProtocol,
  runLive,
  summarizeTrials,
} from "./run.mjs";
import { executeCurrentFixtureCatalog } from "./fixture-executor.mjs";
import {
  EVIDENCE_SOURCE_PATHS,
  buildAdapterIdentity,
  buildOperationalEvidence,
  currentRuntimeIdentity,
  currentSourceIdentity,
  expectedAdapterHealth,
  verifyEvidenceV2,
} from "./evidence-v2.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const packageJson = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8"),
);
const spikeWrangler = await readFile(new URL("./wrangler.toml", import.meta.url), "utf8");

const tests = [];
const execFileAsync = promisify(execFile);

function test(name, fn) {
  tests.push({ name, fn });
}

function clone(value) {
  return structuredClone(value);
}

function setPath(target, path, value) {
  const segments = path.split(".");
  const key = segments.pop();
  let cursor = target;
  for (const segment of segments) cursor = cursor[segment];
  cursor[key] = value;
}

function deletePath(target, path) {
  const segments = path.split(".");
  const key = segments.pop();
  let cursor = target;
  for (const segment of segments) cursor = cursor[segment];
  delete cursor[key];
}

function materializeContractCase(fixture) {
  const value = Object.hasOwn(fixture, "literal")
    ? clone(fixture.literal)
    : clone(fixtures.valid_verdict);
  if (fixture.reverse_gates) value.gates.reverse();
  for (const [path, replacement] of Object.entries(fixture.set ?? {})) {
    setPath(value, path, replacement);
  }
  for (const path of fixture.delete ?? []) deletePath(value, path);
  if (fixture.truncate_gates !== undefined) {
    value.gates = value.gates.slice(0, fixture.truncate_gates);
  }
  if (fixture.append_gate) value.gates.push(fixture.append_gate);
  return value;
}

function verdictText(value = fixtures.valid_verdict) {
  return JSON.stringify(value);
}

function materializeNormalizationCase(fixture) {
  const text = verdictText();
  const invalid = clone(fixtures.valid_verdict);
  invalid.pass = "true";

  switch (fixture.shape) {
    case "provider_error":
      return { call_state: "provider_error", error_code: "provider_rejected" };
    case "timeout":
      return { call_state: "timeout" };
    case "empty":
      return { call_state: "received", envelope: { response: "  " } };
    case "unknown_location":
      return { call_state: "received", envelope: { output: text } };
    case "response_object":
      return { call_state: "received", envelope: { response: clone(fixtures.valid_verdict) } };
    case "response_text":
      return { call_state: "received", envelope: { response: text } };
    case "result_text":
      return { call_state: "received", envelope: { result: text } };
    case "choice_text":
      return { call_state: "received", envelope: { choices: [{ message: { content: text } }] } };
    case "identical_duplicates":
      return { call_state: "received", envelope: { response: text, result: text } };
    case "semantic_but_not_byte_duplicates":
      return { call_state: "received", envelope: { response: text, result: JSON.stringify(fixtures.valid_verdict, null, 2) } };
    case "object_and_text_duplicates":
      return { call_state: "received", envelope: { response: clone(fixtures.valid_verdict), result: text } };
    case "bom":
      return { call_state: "received", envelope: { response: `\uFEFF${text}` } };
    case "json_fence":
      return { call_state: "received", envelope: { response: `\`\`\`json\n${text}\n\`\`\`` } };
    case "double_encoded_json":
      return { call_state: "received", envelope: { response: JSON.stringify(text) } };
    case "surrounding_prose":
      return { call_state: "received", envelope: { response: `Judge verdict follows. ${text} End verdict.` } };
    case "surrounding_prose_with_string_braces": {
      const withBraces = clone(fixtures.valid_verdict);
      withBraces.gates[0].reason = "The routine uses {braces} and an escaped quote: \"okay\".";
      return { call_state: "received", envelope: { response: `Start ${verdictText(withBraces)} End` } };
    }
    case "truncated":
      return { call_state: "received", envelope: { response: text.slice(0, -1) } };
    case "two_objects":
      return { call_state: "received", envelope: { response: `${text}\n${text}` } };
    case "trailing_comma":
      return { call_state: "received", envelope: { response: text.replace(/}$/, ",}") } };
    case "single_quotes":
      return { call_state: "received", envelope: { response: "{'pass':true}" } };
    case "unquoted_keys":
      return { call_state: "received", envelope: { response: "{pass:true}" } };
    case "comments":
      return { call_state: "received", envelope: { response: text.replace("{", "{/* no */") } };
    case "unlabeled_fence":
      return { call_state: "received", envelope: { response: `\`\`\`\n${text}\n\`\`\`` } };
    case "multiple_fences":
      return { call_state: "received", envelope: { response: `\`\`\`json\n${text}\n\`\`\`\n\`\`\`json\n${text}\n\`\`\`` } };
    case "array":
      return { call_state: "received", envelope: { response: "[]" } };
    case "primitive":
      return { call_state: "received", envelope: { response: "true" } };
    case "schema_invalid":
      return { call_state: "received", envelope: { response: JSON.stringify(invalid) } };
    case "bom_plus_fence":
      return { call_state: "received", envelope: { response: `\uFEFF\`\`\`json\n${text}\n\`\`\`` } };
    case "fence_plus_prose":
      return { call_state: "received", envelope: { response: `Start \`\`\`json\n${text}\n\`\`\` End` } };
    case "double_double_encoded":
      return { call_state: "received", envelope: { response: JSON.stringify(JSON.stringify(text)) } };
    case "exact_size": {
      const prefix = "x".repeat(MAX_EXTRACTED_BYTES - Buffer.byteLength(text) - 2);
      return { call_state: "received", envelope: { response: `${prefix} ${text} ` } };
    }
    case "over_size":
      return { call_state: "received", envelope: { response: "x".repeat(MAX_EXTRACTED_BYTES + 1) } };
    case "conflict_with_oversize":
      return { call_state: "received", envelope: { response: "x".repeat(MAX_EXTRACTED_BYTES + 1), result: text } };
    case "identical_oversize": {
      const oversized = "x".repeat(MAX_EXTRACTED_BYTES + 1);
      return { call_state: "received", envelope: { response: oversized, result: oversized } };
    }
    default:
      throw new Error(`Unknown normalization fixture shape: ${fixture.shape}`);
  }
}

test("the provider schema is the exact strict AD-2 verdict shape", () => {
  assert.equal(CONTRACT_VERSION, 1);
  assert.equal(VERDICT_RESPONSE_FORMAT.type, "json_schema");
  assert.equal(VERDICT_RESPONSE_FORMAT.json_schema, VERDICT_SCHEMA);
  assert.deepEqual(VERDICT_SCHEMA.required, ["pass", "gates", "tone", "claims"]);
  assert.equal(VERDICT_SCHEMA.additionalProperties, false);
  assert.equal(VERDICT_SCHEMA.properties.gates.minItems, 9);
  assert.equal(VERDICT_SCHEMA.properties.gates.maxItems, 9);
  assert.equal(VERDICT_SCHEMA.properties.gates.items.additionalProperties, false);
  assert.equal(VERDICT_SCHEMA.properties.gates.items.properties.reason.pattern, "\\S");
  assert.equal(VERDICT_SCHEMA.properties.gates.allOf.length, 9);
  assert.equal(VERDICT_SCHEMA.properties.tone.additionalProperties, false);
  assert.equal(VERDICT_SCHEMA.properties.claims.additionalProperties, false);
  assert.equal(VERDICT_SCHEMA.allOf.length, 1);
  assert.equal(MAX_EXTRACTED_BYTES, 64 * 1024);
});

test("the synthetic judge input contains and validates every AD-5 field", () => {
  const result = validateSpikeInput(fixtures.synthetic_input);
  assert.deepEqual(result, { valid: true, errors: [] });
  assert.equal(fixtures.synthetic_input.synthetic, true);
  assert.deepEqual(Object.keys(fixtures.synthetic_input.candidate).sort(), [
    "before_after",
    "change_level",
    "grounded_numbers",
    "invitation",
    "mode",
    "plan",
    "stays_same",
    "title",
    "version",
    "what_gets_better",
    "why_fits",
  ]);
});

test("the prompt contains all nine gates and the exact output instruction", () => {
  for (let gate = 1; gate <= 9; gate += 1) {
    assert.match(SYSTEM_PROMPT, new RegExp(`(?:^|\\n)${gate}\\.`));
  }
  assert.match(SYSTEM_PROMPT, /Return only one JSON value/i);
  const messages = buildJudgeMessages(fixtures.synthetic_input);
  assert.deepEqual(messages.map(({ role }) => role), ["system", "user"]);
  assert.equal(messages[0].content, SYSTEM_PROMPT);
  assert.deepEqual(JSON.parse(messages[1].content), fixtures.synthetic_input);
});

test("the strict validator agrees with every versioned contract fixture", () => {
  for (const fixture of fixtures.verdict_contract_cases) {
    const result = validateVerdict(materializeContractCase(fixture));
    assert.equal(
      result.valid,
      fixture.valid,
      `${fixture.id}: ${result.errors.join("; ")}`,
    );
    assert.ok(
      fixture.valid || result.errors.length > 0,
      `${fixture.id}: invalid values need a diagnostic`,
    );
  }
});

test("pass false is preserved while pass true cannot coexist with a reported failure", () => {
  const failSafe = clone(fixtures.valid_verdict);
  failSafe.pass = false;
  assert.equal(validateVerdict(failSafe).valid, true);

  const unsafe = clone(fixtures.valid_verdict);
  unsafe.tone.pass = false;
  unsafe.tone.reason = "The wording sounds like a pitch.";
  assert.equal(validateVerdict(unsafe).valid, false);
  assert.equal(unsafe.pass, true);
});

test("contract fingerprints are deterministic and bind every frozen input", async () => {
  const first = await fingerprintContractInput(fixtures.synthetic_input);
  const second = await fingerprintContractInput(clone(fixtures.synthetic_input));
  assert.deepEqual(first, second);
  assert.match(first.system_prompt_sha256, /^[a-f0-9]{64}$/);
  assert.match(first.fixture_sha256, /^[a-f0-9]{64}$/);
  assert.match(first.schema_sha256, /^[a-f0-9]{64}$/);
  assert.match(first.contract_sha256, /^[a-f0-9]{64}$/);

  const changed = clone(fixtures.synthetic_input);
  changed.candidate.title += " changed";
  assert.notEqual(
    (await fingerprintContractInput(changed)).contract_sha256,
    first.contract_sha256,
  );
});

test("normalization and one-step repair match every declared fixture", async () => {
  let recoverable = 0;
  let recovered = 0;
  let rejected = 0;
  let correctlyRejected = 0;

  for (const fixture of fixtures.normalization_cases) {
    const input = materializeNormalizationCase(fixture);
    const before = structuredClone(input);
    const result = await classifyJudgeCall(input);
    assert.equal(result.classification, fixture.classification, fixture.id);
    assert.equal(result.repair_kind ?? null, fixture.repair_kind ?? null, fixture.id);
    assert.deepEqual(input, before, `${fixture.id}: classification mutated its input`);

    if (fixture.classification === "repaired_valid") {
      recoverable += 1;
      if (result.verdict && validateVerdict(result.verdict).valid) recovered += 1;
    } else if (!fixture.classification.endsWith("valid")) {
      rejected += 1;
      if (!result.verdict) correctlyRejected += 1;
    }
  }

  assert.equal(recovered, recoverable, "all supported repairs recover");
  assert.equal(correctlyRejected, rejected, "all declared hard failures reject");
});

test("envelope extraction preserves every allowlisted content candidate", async () => {
  const input = materializeNormalizationCase({ shape: "identical_duplicates" });
  const result = await extractJudgeContent(input.envelope);
  assert.equal(result.status, "content");
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map(({ location }) => location), ["response", "result"]);
  for (const candidate of result.candidates) {
    assert.match(candidate.sha256, /^[a-f0-9]{64}$/);
    assert.equal(candidate.kind, "text");
  }
});

test("classification precedence handles envelope ambiguity before size", async () => {
  assert.equal(
    (await classifyJudgeCall(materializeNormalizationCase({ shape: "conflict_with_oversize" }))).classification,
    "ambiguous_envelope",
  );
  assert.equal(
    (await classifyJudgeCall(materializeNormalizationCase({ shape: "identical_oversize" }))).classification,
    "output_too_large",
  );
});

test("the live request is frozen to both configured models and exact parameters", () => {
  assert.deepEqual(MODELS, ["@cf/openai/gpt-oss-120b", "@cf/openai/gpt-oss-20b"]);
  assert.equal(APPROVED_CALL_CAP, 42);
  assert.equal(DEFAULT_BASE_URL, "http://127.0.0.1:8788");
  const request = buildModelRequest(MODELS[0], fixtures.synthetic_input);
  assert.deepEqual(Object.keys(request).sort(), [
    "candidate",
    "candidate_ref",
    "candidate_schema_version",
    "max_tokens",
    "messages",
    "model",
    "response_format",
    "temperature",
  ]);
  assert.equal(request.temperature, 0);
  assert.equal(request.max_tokens, 2048);
  assert.equal(request.response_format.type, "json_schema");
});

test("the spike config and scripts cannot deploy or touch production bindings", () => {
  assert.match(spikeWrangler, /name = "oddspark-judge-fidelity-spike-local-only"/);
  assert.match(spikeWrangler, /\[ai\][\s\S]*binding = "AI"[\s\S]*remote = true/);
  assert.match(spikeWrangler, /AI_MODEL = "@cf\/openai\/gpt-oss-120b"/);
  assert.match(spikeWrangler, /AI_MODEL_FALLBACK = "@cf\/openai\/gpt-oss-20b"/);
  assert.doesNotMatch(spikeWrangler, /\b(?:routes?|kv_namespaces|durable_objects|assets|r2_buckets|d1_databases)\b/i);
  assert.equal(packageJson.scripts.dev, "wrangler dev --config wrangler.offline.toml");
  assert.equal(packageJson.scripts.test, "node test.mjs");
  assert.equal(packageJson.scripts.deploy, "wrangler deploy");
  assert.doesNotMatch(packageJson.scripts["spike:judge:dev"], /--remote|--local|deploy/);
  assert.doesNotMatch(packageJson.scripts["spike:judge:live"], /wrangler|deploy/);
});

test("the runner accepts loopback only", () => {
  assert.equal(assertLoopbackBaseUrl("http://127.0.0.1:8788").hostname, "127.0.0.1");
  assert.throws(() => assertLoopbackBaseUrl("https://example.com"), /loopback/i);
  assert.throws(() => assertLoopbackBaseUrl("http://127.0.0.1:8788/path"), /path/i);
  assert.throws(() => assertLoopbackBaseUrl("http://user@127.0.0.1:8788"), /credentials/i);
});

test("the maximum-usage estimate binds the exact 42-call cap", () => {
  const estimate = estimateMaximumUsage(6000);
  assert.equal(estimate.total_calls, 42);
  assert.equal(estimate.calls_per_model, 21);
  assert.equal(estimate.max_output_tokens_per_call, 2048);
  assert.ok(estimate.gross_usd > 0.11 && estimate.gross_usd < 0.12);
  assert.ok(estimate.gross_neurons > 10000);
});

test("the adapter health route makes no inference and live POST makes exactly one", async () => {
  const calls = [];
  const env = {
    AI_MODEL: MODELS[0],
    AI_MODEL_FALLBACK: MODELS[1],
    ADAPTER_SOURCE_SHA256: "a".repeat(64),
    CONFIG_SOURCE_SHA256: "b".repeat(64),
    RUNTIME_SHA256: "c".repeat(64),
    AI: {
      async run(model, input) {
        calls.push({ model, input });
        return {
          response: { candidate_ref: buildModelRequest(model, fixtures.synthetic_input).candidate_ref, result: clone(fixtures.valid_verdict) },
          usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300, secret: 1 },
        };
      },
    },
  };

  const health = await adapter.fetch(new Request("http://127.0.0.1/health"), env);
  assert.equal(health.status, 200);
  assert.equal(calls.length, 0);

  const invalid = await adapter.fetch(new Request("http://127.0.0.1/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...buildModelRequest(MODELS[0], fixtures.synthetic_input), model: "other" }),
  }), env);
  assert.equal(invalid.status, 400);
  assert.equal(calls.length, 0);

  const response = await adapter.fetch(new Request("http://127.0.0.1/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildModelRequest(MODELS[0], fixtures.synthetic_input)),
  }), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input, buildRequestManifest(fixtures.synthetic_input).by_model[0].adapter_input);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.envelope.response.result, fixtures.valid_verdict);
  assert.deepEqual(body.usage, { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 });
  assert.equal(Object.hasOwn(body, "tool_calls"), false);
});

test("the adapter rejects non-JSON, alternate routes, and preflight without inference", async () => {
  let calls = 0;
  const env = {
    AI_MODEL: MODELS[0],
    AI_MODEL_FALLBACK: MODELS[1],
    AI: { async run() { calls += 1; return {}; } },
  };
  const requests = [
    new Request("http://127.0.0.1/run", { method: "OPTIONS" }),
    new Request("http://127.0.0.1/other", { method: "POST" }),
    new Request("http://127.0.0.1/run", { method: "POST", body: "{}" }),
  ];
  for (const request of requests) {
    const response = await adapter.fetch(request, env);
    assert.ok(response.status >= 400);
  }
  assert.equal(calls, 0);
});

test("the sequential runner counts every invocation and never retries", async () => {
  let invoked = 0;
  const calls = await runSequentialCalls({
    model: MODELS[0],
    input: fixtures.synthetic_input,
    count: 3,
    async invoke() {
      invoked += 1;
      return { call_state: "received", envelope: { response: clone(fixtures.valid_verdict) } };
    },
  });
  assert.equal(invoked, 3);
  assert.deepEqual(calls.map(({ index }) => index), [1, 2, 3]);

  invoked = 0;
  const timedOut = await runSequentialCalls({
    model: MODELS[0],
    input: fixtures.synthetic_input,
    count: 3,
    async invoke() {
      invoked += 1;
      return { call_state: "timeout" };
    },
  });
  assert.equal(invoked, 3);
  assert.equal(timedOut.length, 3);
});

function classifiedRecords(perModelDirect = 20) {
  return MODELS.flatMap((model) => Array.from({ length: 20 }, (_, index) => ({
    model,
    index: index + 1,
    classification: index < perModelDirect ? "direct_valid" : "schema_invalid",
  })));
}

test("summary arithmetic and GO threshold use each model independently", () => {
  assert.equal(RESULT_SCHEMA_VERSION, "oddspark.judge-fidelity-result/v1");
  const probes = MODELS.map((model) => ({ model, accepted: true }));
  const fixtureResults = { passed: true };

  const atThreshold = classifiedRecords(19);
  const summary = summarizeTrials(atThreshold);
  for (const model of MODELS) {
    assert.equal(summary.by_model[model].total, 20);
    assert.equal(summary.by_model[model].direct_valid, 19);
    assert.equal(summary.by_model[model].direct_rate.numerator, 19);
    assert.equal(summary.by_model[model].direct_rate.denominator, 20);
  }
  assert.equal(decideOutcome({ probes, trials: atThreshold, fixture_results: fixtureResults, preflight_blockers: [] }).decision, "GO");
  assert.equal(decideOutcome({ probes, trials: classifiedRecords(18), fixture_results: fixtureResults, preflight_blockers: [] }).decision, "NO-GO");
});

test("the Markdown decision record is deterministic and carries the Story 1.8 boundary", () => {
  const trials = classifiedRecords(19);
  const result = {
    schema_version: RESULT_SCHEMA_VERSION,
    run: {
      id: "fixture-run",
      started_at: "2026-08-16T00:00:00.000Z",
      ended_at: "2026-08-16T00:01:00.000Z",
      models: MODELS,
    },
    fixture_results: { passed: true, passed_count: 14, total_count: 14 },
    probes: MODELS.map((model) => ({ model, accepted: true, classification: "direct_valid" })),
    trials,
    summary: summarizeTrials(trials),
    outcome: { decision: "GO", reasons: [] },
  };
  const first = renderMarkdown(result);
  assert.equal(renderMarkdown(structuredClone(result)), first);
  assert.match(first, /Story 1\.8 handoff/);
  assert.match(first, /Semantic calibration still depends on Stories 1\.3 and 1\.8/);
  assert.match(first, /ambiguous envelopes/i);
});

test("the shared exhaustive v2 catalog executes all 79 declared fixtures", async () => {
  const result = await executeCurrentFixtureCatalog();
  assert.equal(result.declared_ids.length, 79);
  assert.deepEqual(result.passing_ids, result.declared_ids);
  assert.deepEqual(result.failures, []);
  const altered = clone(fixtures);
  altered.v2_cases[0].classification = "timeout";
  const alteredResult = await executeCurrentFixtureCatalog(altered);
  assert.equal(alteredResult.failures.length, 1);
  const duplicated = clone(fixtures);
  duplicated.v2_cases[1].id = duplicated.v2_cases[0].id;
  const duplicateResult = await executeCurrentFixtureCatalog(duplicated);
  assert.match(duplicateResult.failures.join("\n"), /unique/);
});

test("the live protocol runs both probes first and counts timeout and provider errors without retries", async () => {
  const manifest = buildRequestManifest(fixtures.synthetic_input);
  const order = [];
  let tick = Date.parse("2026-08-17T01:00:00.000Z");
  const records = await executeRecoveryProtocol({
    requests: manifest.by_model,
    async invoke({ request_body }) {
      const position = order.length;
      order.push(request_body.model);
      const started_at = new Date(tick).toISOString();
      tick += 10;
      const ended_at = new Date(tick).toISOString();
      tick += 10;
      if (position === 6) return { call_state: "timeout", started_at, ended_at };
      if (position === 29) return { call_state: "provider_error", error_code: "counted-provider-error", started_at, ended_at };
      return { call_state: "received", envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null, started_at, ended_at };
    },
  });
  assert.equal(records.length, 42);
  assert.deepEqual(records.slice(0, 2).map(({ kind, model }) => [kind, model]), MODELS.map((model) => ["probe", model]));
  assert.equal(records[6].classification, "timeout");
  assert.equal(records[29].classification, "provider_error");
  assert.deepEqual(records.filter(({ kind, model }) => kind === "trial" && model === MODELS[0]).map(({ index }) => index), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(records.filter(({ kind, model }) => kind === "trial" && model === MODELS[1]).map(({ index }) => index), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.ok(records.every(({ usage }) => usage === null));
});

test("request and adapter-input divergence is rejected before inference", async () => {
  for (const mutate of [
    (manifest) => { manifest.by_model[1].body.candidate.title = "divergent"; },
    (manifest) => { manifest.by_model[1].body.candidate_ref = "0".repeat(64); },
    (manifest) => { manifest.by_model[1].body.candidate_schema_version = "oddspark-candidate/v999"; },
    (manifest) => { manifest.by_model[1].adapter_input.max_tokens = 1; },
  ]) {
    const manifest = buildRequestManifest(fixtures.synthetic_input);
    mutate(manifest);
    let calls = 0;
    await assert.rejects(executeRecoveryProtocol({ requests: manifest.by_model, async invoke() { calls += 1; } }), /before inference/);
    assert.equal(calls, 0);
  }
});

async function operationalEvidence({ blocked = false, endpoint = "http://127.0.0.1:9127/health", missingUsage = false } = {}) {
  const [sources, runtime, fixtureResult] = await Promise.all([
    currentSourceIdentity(EVIDENCE_SOURCE_PATHS), currentRuntimeIdentity(), executeCurrentFixtureCatalog(),
  ]);
  const manifest = buildRequestManifest(fixtures.synthetic_input);
  const health = expectedAdapterHealth(sources, runtime);
  const adapterIdentity = buildAdapterIdentity({ observed_health: blocked ? null : health, http_status: blocked ? 503 : 200, endpoint, outbound_request: manifest, sources, runtime });
  let tick = Date.parse("2026-08-17T02:00:00.010Z");
  const records = blocked ? [] : await executeRecoveryProtocol({ requests: manifest.by_model, async invoke({ request_body }) {
    const started_at = new Date(tick).toISOString(); tick += 10;
    const ended_at = new Date(tick).toISOString(); tick += 10;
    return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: missingUsage ? undefined : { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } };
  } });
  const evidence = await buildOperationalEvidence({
    candidate_schema_version: `oddspark-candidate/v${fixtures.synthetic_input.candidate.version}`,
    candidate: fixtures.synthetic_input.candidate,
    request_input: fixtures.synthetic_input,
    source_paths: EVIDENCE_SOURCE_PATHS,
    fixtures: fixtureResult,
    adapter: adapterIdentity,
    run: { id: "operational-fixture", started_at: "2026-08-17T02:00:00.000Z", ended_at: new Date(tick + 10).toISOString(), models: MODELS,
      authorization: { operator_approved: !blocked, profile_confirmed: !blocked, headroom_confirmed: !blocked, approved_call_cap: blocked ? 0 : 42, estimated_calls: 42, calls_made: records.length, plan: blocked ? null : "paid", remaining_free_neurons: null, estimated_gross_neurons: 11000 },
      preflight_blockers: blocked ? ["adapter identity preflight failed"] : [] },
    records,
  }, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime });
  return { evidence, sources, runtime, fixtureResult };
}

test("operational evidence validates exact nondefault loopback health, 42 calls, order, and missing-usage honesty", async () => {
  const { evidence, sources, runtime, fixtureResult } = await operationalEvidence({ missingUsage: true });
  const verified = await verifyEvidenceV2(evidence, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult });
  assert.equal(verified.valid, true);
  assert.equal(evidence.records.length, 42);
  assert.match(evidence.report, /42 calls missing usage/);
  assert.doesNotMatch(evidence.report, /42 calls missing usage[\s\S]*reported tokens; 0 calls missing usage/);

  const badRuntime = clone(runtime);
  badRuntime.execution.wrangler = "0.0.0";
  const runtimeMismatch = clone(evidence);
  runtimeMismatch.runtime = badRuntime;
  const runtimeResult = await verifyEvidenceV2(runtimeMismatch, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => badRuntime, executeFixtures: async () => fixtureResult });
  assert.equal(runtimeResult.predicate_results.find(({ id }) => id === "runtime.identity").pass, false);

  const forbiddenEndpoint = clone(evidence);
  forbiddenEndpoint.adapter.endpoint = "http://192.0.2.1:9127/health";
  const endpointResult = await verifyEvidenceV2(forbiddenEndpoint, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult });
  assert.equal(endpointResult.predicate_results.find(({ id }) => id === "adapter.identity").pass, false);
});

test("preflight identity failure is retained as a verifiable zero-call NO-GO artifact", async () => {
  const { evidence, sources, runtime, fixtureResult } = await operationalEvidence({ blocked: true });
  const verified = await verifyEvidenceV2(evidence, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult });
  assert.equal(verified.valid, true);
  assert.equal(evidence.records.length, 0);
  assert.equal(evidence.outcome.decision, "NO-GO");
  assert.deepEqual(evidence.run.preflight_blockers, ["adapter identity preflight failed"]);
});

test("independent reconstruction catches a self-consistent mutated request manifest", async () => {
  const { evidence, sources, runtime, fixtureResult } = await operationalEvidence();
  evidence.adapter.outbound_request.by_model[0].body.max_tokens = 1024;
  evidence.adapter.outbound_request.by_model[0].sha256 = createHash("sha256").update(stableStringify(evidence.adapter.outbound_request.by_model[0].body)).digest("hex");
  evidence.adapter.outbound_request_sha256 = createHash("sha256").update(stableStringify(evidence.adapter.outbound_request)).digest("hex");
  const verified = await verifyEvidenceV2(evidence, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult });
  assert.equal(verified.valid, false);
  assert.equal(verified.predicate_results.find(({ id }) => id === "adapter.identity").pass, false);
});

test("the explicit artifact verifier executes the shared fixture executor", async () => {
  const { evidence } = await operationalEvidence();
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-explicit-verifier-"));
  const evidencePath = path.join(directory, "evidence-v2.json");
  await writeFile(evidencePath, `${JSON.stringify(evidence)}\n`);
  const { stdout } = await execFileAsync(process.execPath, [new URL("./verify-v2.mjs", import.meta.url).pathname, evidencePath], { cwd: new URL("../..", import.meta.url).pathname });
  assert.match(stdout, /PASS \(18 predicates, 79 fixtures\)/);
});

test("all 18 frozen predicates are retained and malformed input is contained without throwing", async () => {
  const { evidence, sources, runtime, fixtureResult } = await operationalEvidence();
  assert.deepEqual(evidence.predicate_results.map(({ id }) => id), PREDICATE_ORACLE.map(({ id }) => id));
  assert.equal(PREDICATE_ORACLE.length, 18);
  for (const malformed of [null, [], { schema_version: "wrong" }, { ...evidence, records: { length: 42 } }]) {
    const result = await verifyEvidenceV2(malformed, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult });
    assert.equal(result.valid, false);
    assert.equal(result.predicate_results.length, 18);
  }
  const unknownVersion = clone(evidence);
  unknownVersion.schema_version = "oddspark.judge-recovery-evidence/v999";
  const rejectedVersion = await verifyEvidenceV2(unknownVersion, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult });
  assert.equal(rejectedVersion.valid, false);
  assert.match(rejectedVersion.diagnostics["evidence.shape"].join("\n"), /shape/);
});

test("each frozen predicate has a direct mutation route", async () => {
  const { evidence, sources, runtime, fixtureResult } = await operationalEvidence();
  const mutations = {
    "evidence.shape": (x) => { x.unexpected = true; },
    "oracle.identity": (x) => { x.oracle.hash = "0".repeat(64); },
    "legacy.immutable": (x) => { x.legacy[0].observed_sha256 = "0".repeat(64); },
    "runtime.identity": (x) => { x.runtime.execution.wrangler = "0.0.0"; },
    "source.identity": (x) => { x.sources[0].sha256 = "0".repeat(64); },
    "adapter.identity": (x) => { x.adapter.endpoint = "https://example.com/health"; },
    "candidate.binding": (x) => { x.candidate.ref = "0".repeat(64); },
    "fixtures.executed": (x) => { x.fixtures.passing_ids.pop(); },
    "records.classified": (x) => { x.records[0].classification = "timeout"; },
    "records.closed": (x) => { x.records[0].unexpected = true; },
    "run.authorization": (x) => { x.run.authorization.calls_made = 41; },
    "run.cardinality": (x) => { x.records.pop(); x.run.authorization.calls_made = 41; },
    "run.ordering": (x) => { x.records[2].started_at = "2026-08-17T01:00:00.000Z"; },
    "run.common_request": (x) => { x.records[0].request_sha256 = "0".repeat(64); },
    "summary.rates": (x) => { x.summary.by_model[MODELS[0]].total = 999; },
    "outcome.deterministic": (x) => { x.outcome.decision = "NO-GO"; },
    "predicates.retained": (x) => { x.predicate_results[0].pass = false; },
    "report.deterministic": (x) => { x.report += "mutation\n"; },
  };
  assert.deepEqual(Object.keys(mutations), PREDICATE_ORACLE.map(({ id }) => id));
  for (const [target, mutate] of Object.entries(mutations)) {
    const changed = clone(evidence); mutate(changed);
    const result = await verifyEvidenceV2(changed, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult });
    assert.equal(result.predicate_results.find(({ id }) => id === target).pass, false, `${target} mutation did not route to its predicate`);
  }
});

test("post-call verification failure retains the evidence file before failing closed", async () => {
  const [sources, runtime] = await Promise.all([currentSourceIdentity(EVIDENCE_SOURCE_PATHS), currentRuntimeIdentity()]);
  const health = expectedAdapterHealth(sources, runtime);
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-evidence-retention-"));
  let retainedPath;
  let tick = Date.parse("2026-08-17T03:00:00.000Z");
  await assert.rejects(runLive({ approved_call_cap: 42, profile_confirmed: true, headroom_confirmed: true, plan: "paid", base_url: "http://127.0.0.1:9567" }, {
    currentSourceIdentity: async () => sources,
    currentRuntimeIdentity: async () => runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9567/health", http_status: 200, body: health }),
    async invoke({ request_body }) {
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
    async writeEvidence(evidence) {
      evidence.records[0].classification = "timeout";
      retainedPath = path.join(directory, "retained.json");
      await writeFile(retainedPath, `${JSON.stringify(evidence)}\n`);
      return { jsonPath: retainedPath, markdownPath: path.join(directory, "retained.md") };
    },
  }), /retained evidence failed verification/);
  const retained = JSON.parse(await readFile(retainedPath, "utf8"));
  assert.equal(retained.records.length, 42);
  assert.equal(retained.records[0].classification, "timeout");
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    console.error(`  not ok   ${name}`);
    throw error;
  }
}

console.log(`\n${passed}/${tests.length} spike tests passed`);
const finalFixtureCoverage = await executeCurrentFixtureCatalog();
console.log(`${finalFixtureCoverage.passing_ids.length}/${finalFixtureCoverage.declared_ids.length} shared fixtures passed`);
console.log(`${PREDICATE_ORACLE.length}/${PREDICATE_ORACLE.length} evidence predicates covered`);
