import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, readdir, symlink, unlink, writeFile } from "node:fs/promises";
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
  acquireRecoveryLock,
  approvalTemplate,
  assertLoopbackBaseUrl,
  buildModelRequest,
  buildCurrentRecoveryPlan,
  buildRequestManifest,
  decideOutcome,
  estimateMaximumUsage,
  renderMarkdown,
  runSequentialCalls,
  executeRecoveryProtocol,
  findPriorOperationalRecovery,
  normalizeProviderUsage,
  observeAdapterHealth,
  runLive,
  summarizeTrials,
  writeRecoveryArtifacts,
  writePlanDisclosure,
  writeOperationalEvidence,
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
import {
  APPROVAL_MAX_AGE_MS,
  APPROVAL_PLAN_MAX_DELAY_MS,
  RETAINED_FIELDS,
  RECOVERY_APPROVAL_VERSION,
  buildQualificationManifest,
  buildQualificationBundle,
  derivePlanRef,
  deriveQualificationRef,
  validateApproval,
  validateQualificationManifest,
  validateRecoveryPlan,
  verifyQualificationBundle,
} from "./qualification.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const packageJson = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8"),
);
const spikeWrangler = await readFile(new URL("./wrangler.toml", import.meta.url), "utf8");
const ciWorkflow = await readFile(new URL("../../.github/workflows/test.yml", import.meta.url), "utf8");

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
  assert.equal(packageJson.scripts["spike:judge:verify"], "node spikes/judge-fidelity/verify-v2.mjs");
  assert.equal(packageJson.scripts["spike:judge:verify:v1"], "node spikes/judge-fidelity/run.mjs verify");
  assert.equal(packageJson.scripts["spike:judge:plan"], "node spikes/judge-fidelity/run.mjs plan");
  assert.equal(packageJson.scripts["spike:judge:qualification:verify"], "node spikes/judge-fidelity/qualification.mjs verify");
  assert.equal(packageJson.scripts.check.match(/(?:^|&&\s*)npm run spike:judge:self-test(?:\s*&&|$)/g)?.length, 1);
  assert.match(ciWorkflow, /npm run check/);
  assert.doesNotMatch(packageJson.scripts["spike:judge:dev"], /--remote|--local|deploy/);
  assert.doesNotMatch(packageJson.scripts["spike:judge:live"], /wrangler|deploy/);
});

test("the runner accepts loopback only", () => {
  assert.equal(assertLoopbackBaseUrl("http://127.0.0.1:8788").hostname, "127.0.0.1");
  assert.throws(() => assertLoopbackBaseUrl("https://example.com"), /loopback/i);
  assert.throws(() => assertLoopbackBaseUrl("http://127.0.0.1:8788/path"), /path/i);
  assert.throws(() => assertLoopbackBaseUrl("http://user@127.0.0.1:8788"), /credentials/i);
});

test("operator-only live execution rejects CI and non-interactive command use", async () => {
  await assert.rejects(runLive({}, { operatorPresent: true, ci: true, findPriorRecovery: async () => null }), /forbidden in CI/);
  await assert.rejects(runLive({}, { operatorPresent: false, ci: false, findPriorRecovery: async () => null }), /interactive operator terminal/);
  await assert.rejects(execFileAsync(process.execPath, [new URL("./run.mjs", import.meta.url).pathname, "live", "--plan-file", path.join(tmpdir(), "unused-plan.json")], { cwd: new URL("../..", import.meta.url).pathname }), /interactive operator terminal/);
});

test("the maximum-usage estimate binds the exact 42-call cap", () => {
  const estimate = estimateMaximumUsage(6000);
  assert.equal(estimate.total_calls, 42);
  assert.equal(estimate.calls_per_model, 21);
  assert.equal(estimate.max_output_tokens_per_call, 2048);
  assert.ok(estimate.gross_usd > 0.11 && estimate.gross_usd < 0.12);
  assert.ok(estimate.gross_neurons > 10000);
});

test("provider usage normalization retains only complete unambiguous token evidence", () => {
  assert.deepEqual(normalizeProviderUsage({ prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 }), { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 });
  assert.deepEqual(normalizeProviderUsage({ input_tokens: 10, output_tokens: 4 }), { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 });
  assert.deepEqual(normalizeProviderUsage({ input_tokens: 10, output_tokens: 4, total_tokens: 14, neurons: 99 }), { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 });
  assert.equal(normalizeProviderUsage({ neurons: 99 }), null);
  // Invalid types in individual fields produce partial results rather than all-or-nothing
  assert.deepEqual(normalizeProviderUsage({ prompt_tokens: 10, completion_tokens: "4", total_tokens: 14 }), { prompt_tokens: 10, completion_tokens: null, total_tokens: 14 });
  assert.equal(normalizeProviderUsage({ prompt_tokens: 10, completion_tokens: 4, total_tokens: 99 }), null);
  assert.equal(normalizeProviderUsage({ prompt_tokens: 10, completion_tokens: 4, total_tokens: 14, input_tokens: 10, output_tokens: 4 }), null);
});

test("provider usage normalization captures partial best-effort when some fields are missing", () => {
  // When a provider returns only prompt tokens, capture what we can
  assert.deepEqual(normalizeProviderUsage({ prompt_tokens: 100 }), { prompt_tokens: 100, completion_tokens: null, total_tokens: null });
  assert.deepEqual(normalizeProviderUsage({ completion_tokens: 50 }), { prompt_tokens: null, completion_tokens: 50, total_tokens: null });
  // Mixed valid + invalid: valid fields captured, invalid set to null
  assert.deepEqual(normalizeProviderUsage({ prompt_tokens: 100, total_tokens: "bad" }), { prompt_tokens: 100, completion_tokens: null, total_tokens: null });
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
          response: { candidate_ref: buildModelRequest(model, fixtures.synthetic_input).candidate_ref, verdict: clone(fixtures.valid_verdict) },
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

  const mismatched = buildModelRequest(MODELS[0], fixtures.synthetic_input);
  const wrapped = JSON.parse(mismatched.messages[1].content);
  wrapped.input.candidate.title = "different candidate";
  mismatched.messages[1].content = stableStringify(wrapped);
  const mismatchResponse = await adapter.fetch(new Request("http://127.0.0.1/run", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mismatched),
  }), env);
  assert.equal(mismatchResponse.status, 400);
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
  assert.deepEqual(body.envelope.response.verdict, fixtures.valid_verdict);
  assert.deepEqual(body.usage, { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 });
  assert.equal(Object.hasOwn(body, "tool_calls"), false);

  env.AI.run = async () => ({ response: { candidate_ref: buildModelRequest(MODELS[0], fixtures.synthetic_input).candidate_ref, verdict: clone(fixtures.valid_verdict), reasoning: "must not retain" } });
  const metadataResponse = await adapter.fetch(new Request("http://127.0.0.1/run", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildModelRequest(MODELS[0], fixtures.synthetic_input)),
  }), env);
  assert.deepEqual((await metadataResponse.json()).envelope, {});
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

test("the Markdown decision record is deterministic and carries the structural boundary", () => {
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
  assert.match(first, /Structural boundary/);
  assert.match(first, /Semantic calibration remains a separate governed stage/);
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

async function operationalEvidence({ blocked = false, endpoint = "http://127.0.0.1:9127/health", missingUsage = false, runId = "operational-fixture", directByModel = [20, 20], runStartedAt = "2026-08-18T12:00:00.000Z" } = {}) {
  const fixtureInput = JSON.parse(await readFile(new URL("./fixtures.json", import.meta.url), "utf8")).synthetic_input;
  const [sources, runtime, fixtureResult] = await Promise.all([
    currentSourceIdentity(EVIDENCE_SOURCE_PATHS), currentRuntimeIdentity(), executeCurrentFixtureCatalog(),
  ]);
  const manifest = buildRequestManifest(fixtureInput);
  const maximumEstimate = estimateMaximumUsage(Math.max(...MODELS.map((model) => Buffer.byteLength(JSON.stringify(buildModelRequest(model, fixtureInput)), "utf8"))));
  const health = expectedAdapterHealth(sources, runtime);
  const adapterIdentity = buildAdapterIdentity({ observed_health: blocked ? null : health, http_status: blocked ? 0 : 200, endpoint, outbound_request: manifest, sources, runtime, observation_attempted: !blocked });
  let tick = Date.parse(runStartedAt) + 10;
  const callsByModel = Object.fromEntries(MODELS.map((model) => [model, 0]));
  const records = blocked ? [] : await executeRecoveryProtocol({ requests: manifest.by_model, async invoke({ request_body }) {
    const callIndex = callsByModel[request_body.model]++;
    const started_at = new Date(tick).toISOString(); tick += 10;
    const ended_at = new Date(tick).toISOString(); tick += 10;
    const modelIndex = MODELS.indexOf(request_body.model);
    const direct = callIndex === 0 || callIndex <= directByModel[modelIndex];
    const response = direct
      ? { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) }
      : JSON.stringify({ candidate_ref: request_body.candidate_ref, verdict: { ...clone(fixtures.valid_verdict), pass: "true" } });
    return { call_state: "received", started_at, ended_at, envelope: { response }, usage: missingUsage ? undefined : { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } };
  } });
  const evidence = await buildOperationalEvidence({
    candidate_schema_version: `oddspark-candidate/v${fixtureInput.candidate.version}`,
    candidate: fixtureInput.candidate,
    request_input: fixtureInput,
    source_paths: EVIDENCE_SOURCE_PATHS,
    fixtures: fixtureResult,
    adapter: adapterIdentity,
    run: { id: runId, started_at: runStartedAt, ended_at: new Date(tick + 10).toISOString(), models: MODELS,
      authorization: { operator_approved: !blocked, profile_confirmed: true, headroom_confirmed: true, approved_call_cap: blocked ? 0 : 42, estimated_calls: 42, calls_made: records.length, plan: "paid", remaining_free_neurons: null, estimated_gross_neurons: maximumEstimate.gross_neurons },
      preflight_checks: blocked
        ? { plan_match: true, approval_preflight: { valid: false, errors: ["approval must be a closed object"] }, offline_errors: [], adapter: { attempted: false, identity_match: false }, approval_at_run_start: { valid: false, errors: ["approval must be a closed object"] } }
        : { plan_match: true, approval_preflight: { valid: true, errors: [] }, offline_errors: [], adapter: { attempted: true, identity_match: true }, approval_at_run_start: { valid: true, errors: [] } },
      preflight_blockers: blocked ? [
        "approval: approval must be a closed object",
        "adapter identity preflight skipped because earlier authority or offline gates failed",
      ] : [] },
    records,
  }, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime });
  return { evidence, sources, runtime, fixtureResult };
}

async function approvedRecovery({ approvalRunId = "approval-run-fixture", now = new Date("2026-08-18T12:00:00.000Z"), planType = "paid", remainingFreeNeurons = 20_000 } = {}) {
  const [sources, runtime] = await Promise.all([currentSourceIdentity(EVIDENCE_SOURCE_PATHS), currentRuntimeIdentity()]);
  const current = await buildCurrentRecoveryPlan({
    approval_run_id: approvalRunId,
    created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    account_profile: "test-profile",
    plan: planType,
    remaining_free_neurons: planType === "free" ? remainingFreeNeurons : null,
  }, { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime });
  const approval = {
    schema_version: RECOVERY_APPROVAL_VERSION,
    plan_ref: current.recoveryPlan.plan_ref,
    approval_run_id: approvalRunId,
    approved_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    expires_at: new Date(now.getTime() + (3 * 60 + 55) * 60 * 1000).toISOString(),
    approved_call_cap: 42,
    maximum_cost_usd: current.recoveryPlan.maximum_cost.gross_usd,
    decision: "approved",
  };
  assert.equal(validateRecoveryPlan(current.recoveryPlan, { legacy: current.legacy }).valid, true);
  assert.equal(validateApproval(approval, current.recoveryPlan, now).valid, true);
  return { ...current, approval, now, sources, runtime };
}

async function publishValidQualification(directory, basename = "public-v2", runId = "public-verifier-run") {
  const setup = await approvedRecovery({ approvalRunId: runId });
  const retained = await operationalEvidence({ runId, directByModel: [19, 19] });
  const evidenceBytes = Buffer.from(`${JSON.stringify(retained.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => retained.sources, currentRuntimeIdentity: async () => retained.runtime, executeFixtures: async () => retained.fixtureResult };
  const qualification = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: setup.approval, evidence: retained.evidence,
    evidence_file: `${basename}.json`, evidence_bytes: evidenceBytes }, dependencies);
  const files = await writeRecoveryArtifacts(retained.evidence, qualification, directory, basename);
  return { ...files, evidence: retained.evidence, qualification, dependencies };
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
  assert.deepEqual(evidence.run.preflight_blockers, [
    "approval: approval must be a closed object",
    "adapter identity preflight skipped because earlier authority or offline gates failed",
  ]);
});

test("runLive retains adapter-identity preflight failure without inference", async () => {
  const setup = await approvedRecovery();
  let calls = 0; let retained; let qualification;
  const decision = await runLive({ base_url: "http://127.0.0.1:9657" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9657/health", http_status: 503, body: null }),
    async invoke() { calls += 1; throw new Error("must not infer"); },
    async writeArtifacts(evidence, bundle) { retained = clone(evidence); qualification = clone(bundle); return { jsonPath: "retained.json", markdownPath: "retained.md", qualificationPath: "qualification.json" }; },
  });
  assert.equal(decision, "NO-GO");
  assert.equal(calls, 0);
  assert.equal(retained.records.length, 0);
  assert.deepEqual(retained.run.preflight_blockers, ["adapter identity preflight failed"]);
  assert.equal(retained.adapter.observation_attempted, true);
  assert.equal(retained.run.authorization.operator_approved, true);
  assert.equal(retained.run.authorization.approved_call_cap, 42);
  assert.equal(qualification.outcome.decision, "NO-GO");
  assert.deepEqual(qualification.qualification_refs, []);
});

test("artifact-controlled source paths are rejected before any read", async () => {
  const { evidence, sources, runtime, fixtureResult } = await operationalEvidence();
  evidence.sources[0].path = "../../unexpected";
  let observedPaths;
  const result = await verifyEvidenceV2(evidence, {
    currentSourceIdentity: async (paths) => { observedPaths = paths; return sources; },
    currentRuntimeIdentity: async () => runtime,
    executeFixtures: async () => fixtureResult,
  });
  assert.deepEqual(observedPaths, EVIDENCE_SOURCE_PATHS);
  assert.equal(result.predicate_results.find(({ id }) => id === "source.identity").pass, false);
});

test("record provenance, exact order, canonical timestamps, and safe usage are enforced", async () => {
  const { evidence, sources, runtime, fixtureResult } = await operationalEvidence();
  const dependencies = { currentSourceIdentity: async () => sources, currentRuntimeIdentity: async () => runtime, executeFixtures: async () => fixtureResult };
  const contradictory = clone(evidence); contradictory.records[0].error_code = "impossible";
  assert.equal((await verifyEvidenceV2(contradictory, dependencies)).predicate_results.find(({ id }) => id === "records.closed").pass, false);
  const interleaved = clone(evidence); [interleaved.records[2], interleaved.records[22]] = [interleaved.records[22], interleaved.records[2]];
  assert.equal((await verifyEvidenceV2(interleaved, dependencies)).predicate_results.find(({ id }) => id === "run.ordering").pass, false);
  const noncanonical = clone(evidence); noncanonical.records[0].started_at = noncanonical.records[0].started_at.replace(".010Z", ".01Z");
  assert.equal((await verifyEvidenceV2(noncanonical, dependencies)).predicate_results.find(({ id }) => id === "run.ordering").pass, false);
  const unsafeUsage = clone(evidence); unsafeUsage.records[0].usage = { prompt_tokens: Number.MAX_SAFE_INTEGER + 1, completion_tokens: 0, total_tokens: Number.MAX_SAFE_INTEGER + 1 };
  assert.equal((await verifyEvidenceV2(unsafeUsage, dependencies)).predicate_results.find(({ id }) => id === "records.closed").pass, false);
});

test("adapter health observation aborts at its bounded deadline", async () => {
  await assert.rejects(observeAdapterHealth("http://127.0.0.1:9788", (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  }), 5), /aborted/i);
});

test("paired evidence publication rolls back JSON when Markdown cannot publish", async () => {
  const { evidence } = await operationalEvidence();
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-paired-evidence-"));
  const basename = `${evidence.run.started_at.slice(0, 10)}-${evidence.run.id.slice(0, 8)}-v2`;
  const jsonPath = path.join(directory, `${basename}.json`);
  const markdownPath = path.join(directory, `${basename}.md`);
  await writeFile(markdownPath, "occupied");
  await assert.rejects(writeOperationalEvidence(evidence, directory));
  await assert.rejects(access(jsonPath));
  assert.equal(await readFile(markdownPath, "utf8"), "occupied");
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

test("the documented package evidence verifier --file command executes the shared fixture executor", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-explicit-verifier-"));
  const { jsonPath: evidencePath } = await publishValidQualification(directory, "evidence-v2");
  const { stdout } = await execFileAsync("npm", ["run", "spike:judge:verify", "--", "--file", evidencePath], { cwd: new URL("../..", import.meta.url).pathname });
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

test("closed recovery plans and approvals bind every disclosed identity and reject unknown fields", async () => {
  const setup = await approvedRecovery({ approvalRunId: "closed-plan-run" });
  assert.equal(setup.recoveryPlan.plan_ref, derivePlanRef(setup.recoveryPlan));
  assert.deepEqual(setup.recoveryPlan.models.map(({ resolved_model }) => resolved_model), MODELS);
  assert.equal(setup.recoveryPlan.call_policy.approved_call_cap, 42);
  assert.equal(setup.recoveryPlan.maximum_cost.total_calls, 42);
  assert.equal(setup.recoveryPlan.governance.prior_operational_recovery, null);

  const openPlan = clone(setup.recoveryPlan); openPlan.unexpected = true; openPlan.plan_ref = derivePlanRef(openPlan);
  assert.equal(validateRecoveryPlan(openPlan).valid, false);
  const legacyMutation = clone(setup.recoveryPlan);
  legacyMutation.governance.legacy_v1_evidence_sha256 = "f".repeat(64);
  legacyMutation.plan_ref = derivePlanRef(legacyMutation);
  assert.match(validateRecoveryPlan(legacyMutation, { legacy: setup.legacy }).errors.join("\n"), /legacy v1 governance hash/);
  const openApproval = { ...setup.approval, unexpected: true };
  assert.equal(validateApproval(openApproval, setup.recoveryPlan, setup.now).valid, false);
  const stale = { ...setup.approval, approved_at: "2026-08-18T01:00:00.000Z", expires_at: "2026-08-18T05:00:00.000Z" };
  assert.match(validateApproval(stale, setup.recoveryPlan, setup.now).errors.join("\n"), /stale/);
  const premature = {
    ...setup.approval,
    approved_at: new Date(Date.parse(setup.recoveryPlan.created_at) - 1).toISOString(),
    expires_at: new Date(Date.parse(setup.recoveryPlan.created_at) + APPROVAL_MAX_AGE_MS - 1).toISOString(),
  };
  assert.match(validateApproval(premature, setup.recoveryPlan, setup.now).errors.join("\n"), /predates the disclosed plan/);
});

test("approval freshness uses exact start, exclusive expiry, and a four-hour ceiling", async () => {
  const setup = await approvedRecovery({ approvalRunId: "approval-boundary-run" });
  const start = new Date(setup.recoveryPlan.created_at);
  const exact = {
    ...setup.approval,
    approved_at: start.toISOString(),
    expires_at: new Date(start.getTime() + APPROVAL_MAX_AGE_MS).toISOString(),
  };
  assert.equal(validateApproval(exact, setup.recoveryPlan, start).valid, true);
  assert.match(validateApproval(exact, setup.recoveryPlan, new Date(exact.expires_at)).errors.join("\n"), /stale/);
  assert.match(validateApproval(exact, setup.recoveryPlan, new Date(start.getTime() - 1)).errors.join("\n"), /future-dated/);
  const over = { ...exact, expires_at: new Date(start.getTime() + APPROVAL_MAX_AGE_MS + 1).toISOString() };
  assert.match(validateApproval(over, setup.recoveryPlan, start).errors.join("\n"), /four-hour/);
  const planBoundary = { ...setup.approval,
    approved_at: new Date(start.getTime() + APPROVAL_PLAN_MAX_DELAY_MS).toISOString(),
    expires_at: new Date(start.getTime() + APPROVAL_PLAN_MAX_DELAY_MS + 1).toISOString() };
  assert.equal(validateApproval(planBoundary, setup.recoveryPlan, new Date(planBoundary.approved_at)).valid, true);
  const afterPlanBoundary = { ...planBoundary,
    approved_at: new Date(start.getTime() + APPROVAL_PLAN_MAX_DELAY_MS + 1).toISOString(),
    expires_at: new Date(start.getTime() + APPROVAL_PLAN_MAX_DELAY_MS + 2).toISOString() };
  assert.match(validateApproval(afterPlanBoundary, setup.recoveryPlan, new Date(afterPlanBoundary.approved_at)).errors.join("\n"), /too far removed/);
});

test("public qualification validators contain arbitrary malformed nested JSON", async () => {
  const setup = await approvedRecovery({ approvalRunId: "malformed-validator-run" });
  for (const malformed of [null, [], {}, { ...setup.recoveryPlan, account: null }, { ...setup.recoveryPlan, models: [null, null] }]) {
    assert.doesNotThrow(() => validateRecoveryPlan(malformed));
    assert.equal(validateRecoveryPlan(malformed).valid, false);
  }
  for (const malformed of [null, [], {}, { ...setup.approval, approved_at: {} }]) {
    assert.doesNotThrow(() => validateApproval(malformed, null, {}));
    assert.equal(validateApproval(malformed, null, {}).valid, false);
  }
  const malformedBundle = { schema_version: "oddspark.judge-qualification-bundle/v1", plan: null, approval: null, approval_check: null, evidence: null, manifests: null, qualification_refs: null, outcome: null };
  const result = await verifyQualificationBundle(malformedBundle, null, Buffer.alloc(0));
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.equal(validateQualificationManifest(null, { evidence: null, plan: null, model: null, outcome: null }).valid, false);
});

test("retained-field disclosure is comprehensive and account profiles cannot be Cloudflare account IDs", async () => {
  const setup = await approvedRecovery({ approvalRunId: "retained-disclosure-run" });
  for (const required of [
    "plan (full closed recovery plan)", "approval (full closed approval record)", "qualification.manifests",
    "qualification.qualification_refs", "evidence.candidate.request_input", "evidence.run.authorization",
    "evidence.run.started_at", "evidence.run.ended_at", "evidence.adapter", "record.envelope",
  ]) assert.ok(RETAINED_FIELDS.includes(required), `${required} was not disclosed`);
  const accountIdPlan = clone(setup.recoveryPlan);
  accountIdPlan.account.profile = "0123456789abcdef0123456789abcdef";
  accountIdPlan.plan_ref = derivePlanRef(accountIdPlan);
  assert.match(validateRecoveryPlan(accountIdPlan).errors.join("\n"), /account\/plan\/headroom/);
});

test("maximum cost independently recomputes every frozen pricing and arithmetic component", async () => {
  const setup = await approvedRecovery({ approvalRunId: "cost-recompute-run" });
  const mutations = [
    (plan) => { plan.maximum_cost.pricing_as_of = "2026-07-30"; },
    (plan) => { plan.maximum_cost.pricing_source = "https://example.com/pricing"; },
    (plan) => { plan.maximum_cost.input_token_upper_bound_per_request += 1; },
    (plan) => { plan.maximum_cost.max_output_tokens_per_call -= 1; },
    (plan) => { plan.maximum_cost.calls_per_model -= 1; },
    (plan) => { plan.maximum_cost.total_calls -= 1; },
    (plan) => { plan.maximum_cost.gross_usd += 0.000001; },
    (plan) => { plan.maximum_cost.gross_neurons += 1; },
    (plan) => { plan.maximum_cost.free_neurons_per_day += 1; },
    (plan) => { plan.maximum_cost.by_model[MODELS[0]].calls -= 1; },
    (plan) => { plan.maximum_cost.by_model[MODELS[0]].input_usd += 0.000001; },
    (plan) => { plan.maximum_cost.by_model[MODELS[1]].output_usd += 0.000001; },
  ];
  for (const mutate of mutations) {
    const changed = clone(setup.recoveryPlan); mutate(changed); changed.plan_ref = derivePlanRef(changed);
    assert.match(validateRecoveryPlan(changed).errors.join("\n"), /maximum-cost disclosure/, JSON.stringify(changed.maximum_cost));
  }
});

test("free-plan headroom rejects insufficient allowance and accepts the exact conservative maximum", async () => {
  const paid = await approvedRecovery({ approvalRunId: "headroom-basis-run" });
  const exact = paid.recoveryPlan.maximum_cost.gross_neurons;
  await assert.rejects(approvedRecovery({ approvalRunId: "headroom-insufficient-run", planType: "free", remainingFreeNeurons: exact - 0.000001 }), /free-plan headroom/);
  const exactSetup = await approvedRecovery({ approvalRunId: "headroom-exact-run", planType: "free", remainingFreeNeurons: exact });
  assert.equal(validateRecoveryPlan(exactSetup.recoveryPlan, { legacy: exactSetup.legacy }).valid, true);
});

test("approval templates require explicit timestamps and plan publication is external and rollback-safe", async () => {
  const setup = await approvedRecovery({ approvalRunId: "template-safety-run" });
  const template = approvalTemplate(setup.recoveryPlan);
  assert.equal(template.approved_at, null);
  assert.equal(template.expires_at, null);
  assert.equal(validateApproval({ ...template, decision: "approved" }, setup.recoveryPlan, setup.now).valid, false);

  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-plan-command-"));
  const output = path.join(directory, "recovery-plan.json");
  const { stdout } = await execFileAsync(process.execPath, [new URL("./run.mjs", import.meta.url).pathname, "plan", "--output", output, "--account-profile", "test-profile", "--plan", "paid", "--approval-run-id", "command-plan-run"], { cwd: new URL("../..", import.meta.url).pathname });
  assert.match(stdout, /Approval template \(not authority/);
  const commandTemplate = JSON.parse(await readFile(output.replace(/\.json$/, "-approval-template.json"), "utf8"));
  assert.equal(commandTemplate.approved_at, null);
  assert.equal(commandTemplate.expires_at, null);

  const repositoryOutput = path.join(new URL("../..", import.meta.url).pathname, ".forbidden-recovery-plan.json");
  await assert.rejects(writePlanDisclosure(setup.recoveryPlan, repositoryOutput), /outside the repository/);
  await assert.rejects(access(repositoryOutput));

  const rollbackPlan = path.join(directory, "rollback-plan.json");
  const rollbackTemplate = rollbackPlan.replace(/\.json$/, "-approval-template.json");
  await writeFile(rollbackTemplate, "occupied");
  await assert.rejects(writePlanDisclosure(setup.recoveryPlan, rollbackPlan));
  await assert.rejects(access(rollbackPlan));
  assert.equal(await readFile(rollbackTemplate, "utf8"), "occupied");
});

test("runLive accepts the completed immutable on-disk disclosure and distinct canonical approval without network activity", async () => {
  const setup = await approvedRecovery({ approvalRunId: "disk-live-run" });
  const disclosureDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-disk-live-"));
  const planPath = path.join(disclosureDirectory, "recovery-plan.json");
  await writePlanDisclosure(setup.recoveryPlan, planPath);
  const approvalPath = path.join(disclosureDirectory, "recovery-plan-approval.json");
  await writeFile(approvalPath, `${JSON.stringify(setup.approval, null, 2)}\n`);
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  let calls = 0; let retained;
  const decision = await runLive({ plan_file: planPath, approval_file: approvalPath, base_url: "http://127.0.0.1:9781" }, {
    operatorPresent: true, now: setup.now, runStartedAt: setup.now, findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources, currentRuntimeIdentity: async () => setup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9781/health", http_status: 200, body: health }),
    async invoke({ request_body }) {
      calls += 1;
      const started_at = new Date(setup.now.getTime() + calls * 2).toISOString();
      const ended_at = new Date(setup.now.getTime() + calls * 2 + 1).toISOString();
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
    async writeArtifacts(evidence) { retained = clone(evidence); return { jsonPath: "disk.json", markdownPath: "disk.md", qualificationPath: "disk-qualification.json" }; },
  });
  assert.equal(decision, "GO");
  assert.equal(calls, 42);
  assert.equal(retained.records.length, 42);
});

test("real file loading rejects noncanonical and duplicate-key plan or approval bytes", async () => {
  const setup = await approvedRecovery({ approvalRunId: "canonical-file-run" });
  const baseDependencies = { operatorPresent: true, now: setup.now, findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources, currentRuntimeIdentity: async () => setup.runtime,
    async observeHealth() { throw new Error("invalid files must block health"); }, async invoke() { throw new Error("invalid files must block inference"); },
    async writeArtifacts() { return { jsonPath: "invalid.json", markdownPath: "invalid.md", qualificationPath: "invalid-qualification.json" }; } };
  const planDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-noncanonical-plan-"));
  const planPath = path.join(planDirectory, "plan.json");
  const disclosed = await writePlanDisclosure(setup.recoveryPlan, planPath);
  const approvalPath = path.join(planDirectory, "plan-approval.json");
  await writeFile(approvalPath, `${JSON.stringify(setup.approval, null, 2)}\n`);
  const canonicalPlan = await readFile(planPath, "utf8");
  const duplicatePlan = canonicalPlan.replace('  "schema_version":', `  "schema_version": ${JSON.stringify(setup.recoveryPlan.schema_version)},\n  "schema_version":`);
  await writeFile(planPath, duplicatePlan);
  const marker = JSON.parse(await readFile(disclosed.completionPath, "utf8"));
  const bound = marker.files.find(({ name }) => name === path.basename(planPath));
  bound.bytes = Buffer.byteLength(duplicatePlan); bound.sha256 = createHash("sha256").update(duplicatePlan).digest("hex");
  await writeFile(disclosed.completionPath, `${JSON.stringify(marker, null, 2)}\n`);
  await assert.rejects(runLive({ plan_file: planPath, approval_file: approvalPath }, baseDependencies), /not canonical/);

  const approvalDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-noncanonical-approval-"));
  const approvalPlanPath = path.join(approvalDirectory, "plan.json");
  await writePlanDisclosure(setup.recoveryPlan, approvalPlanPath);
  const duplicateApproval = `${JSON.stringify(setup.approval, null, 2)}\n`.replace('  "schema_version":', `  "schema_version": ${JSON.stringify(setup.approval.schema_version)},\n  "schema_version":`);
  const duplicateApprovalPath = path.join(approvalDirectory, "plan-approval.json");
  await writeFile(duplicateApprovalPath, duplicateApproval);
  const decision = await runLive({ plan_file: approvalPlanPath, approval_file: duplicateApprovalPath }, baseDependencies);
  assert.equal(decision, "NO-GO");
});

test("missing approval records and missing approval files retain verified zero-call artifacts while invalid plans still throw", async () => {
  const setup = await approvedRecovery({ approvalRunId: "missing-approval-run" });
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-missing-approval-"));
  const missingPath = path.join(directory, "does-not-exist.json");
  const malformedPath = path.join(directory, "malformed.json");
  await writeFile(malformedPath, "{not-json");
  for (const [options, expectedReason] of [
    [{ base_url: "http://127.0.0.1:9658" }, /approval record is missing/],
    [{ base_url: "http://127.0.0.1:9658", approval_file: missingPath }, /approval file is missing/],
    [{ base_url: "http://127.0.0.1:9658", approval_file: malformedPath }, /approval JSON is malformed/],
  ]) {
    let calls = 0; let healthChecks = 0; let retained; let bundle;
    const decision = await runLive(options, {
      operatorPresent: true,
      plan: setup.recoveryPlan,
      now: setup.now,
      findPriorRecovery: async () => null,
      currentSourceIdentity: async () => setup.sources,
      currentRuntimeIdentity: async () => setup.runtime,
      async observeHealth() { healthChecks += 1; },
      async invoke() { calls += 1; },
      async writeArtifacts(evidence, qualification) { retained = clone(evidence); bundle = clone(qualification); return { jsonPath: "missing.json", markdownPath: "missing.md", qualificationPath: "missing-qualification.json" }; },
    });
    assert.equal(decision, "NO-GO");
    assert.equal(healthChecks, 0);
    assert.equal(calls, 0);
    assert.equal(retained.records.length, 0);
    assert.equal(bundle.approval, null);
    assert.equal(bundle.approval_check.valid, false);
    assert.match(retained.run.preflight_blockers.join("\n"), expectedReason);
    assert.equal(retained.adapter.observation_attempted, false);
    assert.equal((await verifyQualificationBundle(bundle, retained, Buffer.from(`${JSON.stringify(retained, null, 2)}\n`), {
      currentSourceIdentity: async () => setup.sources,
      currentRuntimeIdentity: async () => setup.runtime,
      executeFixtures: executeCurrentFixtureCatalog,
    })).valid, true);
  }
  const invalidPlan = clone(setup.recoveryPlan); invalidPlan.unexpected = true;
  await assert.rejects(runLive({ approval_file: missingPath }, {
    operatorPresent: true,
    plan: invalidPlan,
    findPriorRecovery: async () => null,
  }), /recovery plan is invalid/);
});

test("missing, open, stale, and mismatched approval records retain verified zero-call NO-GO artifacts", async () => {
  const setup = await approvedRecovery({ approvalRunId: "approval-rejection-run" });
  const variants = [
    (() => { const value = clone(setup.approval); delete value.decision; return value; })(),
    { ...setup.approval, unexpected: true },
    { ...setup.approval, approved_at: "2026-08-18T01:00:00.000Z", expires_at: "2026-08-18T05:00:00.000Z" },
    { ...setup.approval, plan_ref: "0".repeat(64) },
    { ...setup.approval, approval_run_id: "wrong-approval-run" },
    { ...setup.approval, approved_call_cap: 41 },
    { ...setup.approval, maximum_cost_usd: setup.approval.maximum_cost_usd + 0.01 },
  ];
  for (const approval of variants) {
    let calls = 0; let healthChecks = 0; let retained; let bundle;
    const decision = await runLive({ base_url: "http://127.0.0.1:9658" }, {
      operatorPresent: true,
      plan: setup.recoveryPlan,
      approval,
      now: setup.now,
      findPriorRecovery: async () => null,
      currentSourceIdentity: async () => setup.sources,
      currentRuntimeIdentity: async () => setup.runtime,
      async observeHealth() { healthChecks += 1; throw new Error("approval must gate adapter preflight"); },
      async invoke() { calls += 1; throw new Error("approval must gate inference"); },
      async writeArtifacts(evidence, qualification) { retained = clone(evidence); bundle = clone(qualification); return { jsonPath: "blocked.json", markdownPath: "blocked.md", qualificationPath: "blocked-qualification.json" }; },
    });
    assert.equal(decision, "NO-GO");
    assert.equal(healthChecks, 0);
    assert.equal(calls, 0);
    assert.equal(retained.records.length, 0);
    assert.equal(bundle.approval_check.valid, false);
    assert.equal(bundle.manifests.length, 2);
    assert.ok(bundle.manifests.every(({ outcome }) => outcome === "NO-GO"));
    assert.deepEqual(bundle.qualification_refs, []);
    assert.equal(bundle.outcome.third_matrix_permitted, true);
  }
});

test("source identity drift after approval blocks before adapter preflight and inference", async () => {
  const setup = await approvedRecovery({ approvalRunId: "identity-drift-run" });
  const driftedSources = clone(setup.sources);
  driftedSources.find(({ path: sourcePath }) => sourcePath === "spikes/judge-fidelity/run.mjs").sha256 = "1".repeat(64);
  let healthChecks = 0; let calls = 0; let bundle; let retained;
  const decision = await runLive({ base_url: "http://127.0.0.1:9659" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => driftedSources,
    currentRuntimeIdentity: async () => setup.runtime,
    async observeHealth() { healthChecks += 1; throw new Error("identity drift must block health"); },
    async invoke() { calls += 1; throw new Error("identity drift must block inference"); },
    async writeArtifacts(evidence, qualification) { retained = clone(evidence); bundle = clone(qualification); return { jsonPath: "drift.json", markdownPath: "drift.md", qualificationPath: "drift-qualification.json" }; },
  });
  assert.equal(decision, "NO-GO");
  assert.equal(healthChecks, 0);
  assert.equal(calls, 0);
  assert.match(bundle.approval_check.errors.join("\n"), /plan_ref mismatch/);
  assert.match(retained.run.preflight_blockers.join("\n"), /frozen plan differs/);
  assert.match(retained.run.preflight_blockers.join("\n"), /approval: approval plan_ref mismatch/);
  assert.equal(retained.adapter.observation_attempted, false);
});

test("offline fixture failure blocks adapter preflight and provider calls", async () => {
  const setup = await approvedRecovery({ approvalRunId: "offline-gate-failure-run" });
  let healthChecks = 0; let calls = 0; let retained;
  await assert.rejects(runLive({ base_url: "http://127.0.0.1:9662" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    executeFixtures: async () => ({ declared_ids: ["broken"], passing_ids: [], failures: ["broken: failed"] }),
    async observeHealth() { healthChecks += 1; },
    async invoke() { calls += 1; },
    async retainInvalidEvidence(evidence) { retained = clone(evidence); return "offline-invalid.json"; },
  }), /retained evidence failed verification/);
  assert.equal(healthChecks, 0);
  assert.equal(calls, 0);
  assert.equal(retained.records.length, 0);
  assert.match(retained.run.preflight_blockers.join("\n"), /offline gate: shared 79-fixture gate failed/);
  assert.equal(retained.adapter.observation_attempted, false);
});

test("independent 19-of-20 thresholds emit two deterministic AD-11 manifests and never pool rates", async () => {
  const goSetup = await approvedRecovery({ approvalRunId: "qualification-go-run" });
  const goEvidence = await operationalEvidence({ runId: "qualification-go-run", directByModel: [19, 19] });
  assert.deepEqual(goSetup.recoveryPlan.models.map(({ request_sha256, adapter_input_sha256 }) => [request_sha256, adapter_input_sha256]), goEvidence.evidence.adapter.outbound_request.by_model.map(({ sha256, adapter_input_sha256 }) => [sha256, adapter_input_sha256]));
  const goBytes = Buffer.from(`${JSON.stringify(goEvidence.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => goEvidence.sources, currentRuntimeIdentity: async () => goEvidence.runtime, executeFixtures: async () => goEvidence.fixtureResult };
  const first = await buildQualificationBundle({ plan: goSetup.recoveryPlan, approval: goSetup.approval, evidence: goEvidence.evidence, evidence_file: "go-v2.json", evidence_bytes: goBytes, now: goSetup.now }, dependencies);
  const second = await buildQualificationBundle({ plan: goSetup.recoveryPlan, approval: goSetup.approval, evidence: goEvidence.evidence, evidence_file: "go-v2.json", evidence_bytes: goBytes, now: goSetup.now }, dependencies);
  assert.equal(first.outcome.decision, "GO", first.outcome.reasons.join("; "));
  assert.equal(first.manifests.length, 2);
  assert.equal(first.qualification_refs.length, 2);
  assert.deepEqual(first.qualification_refs, second.qualification_refs);
  for (let index = 0; index < MODELS.length; index += 1) {
    assert.equal(first.manifests[index].rates.direct_valid, 19);
    assert.equal(first.manifests[index].rates.direct_rate.denominator, 20);
    assert.equal(first.qualification_refs[index].qualification_ref, deriveQualificationRef(first.manifests[index]));
    assert.equal(validateQualificationManifest(first.manifests[index], { evidence: goEvidence.evidence, plan: goSetup.recoveryPlan, model: MODELS[index], outcome: "GO" }).valid, true);
  }
  assert.equal((await verifyQualificationBundle(first, goEvidence.evidence, goBytes, dependencies, goSetup.now)).valid, true);

  const noGoSetup = await approvedRecovery({ approvalRunId: "qualification-no-go-run" });
  const noGoEvidence = await operationalEvidence({ runId: "qualification-no-go-run", directByModel: [20, 18] });
  const noGoBytes = Buffer.from(`${JSON.stringify(noGoEvidence.evidence, null, 2)}\n`);
  const noGoDependencies = { currentSourceIdentity: async () => noGoEvidence.sources, currentRuntimeIdentity: async () => noGoEvidence.runtime, executeFixtures: async () => noGoEvidence.fixtureResult };
  const noGo = await buildQualificationBundle({ plan: noGoSetup.recoveryPlan, approval: noGoSetup.approval, evidence: noGoEvidence.evidence, evidence_file: "no-go-v2.json", evidence_bytes: noGoBytes, now: noGoSetup.now }, noGoDependencies);
  assert.equal(noGoEvidence.evidence.summary.by_model[MODELS[0]].direct_valid + noGoEvidence.evidence.summary.by_model[MODELS[1]].direct_valid, 38);
  assert.equal(noGo.outcome.decision, "NO-GO");
  assert.deepEqual(noGo.manifests.map(({ outcome }) => outcome), ["GO", "NO-GO"]);
  assert.deepEqual(noGo.qualification_refs, []);
  assert.equal(noGo.outcome.mvp_review_required, true);
  assert.equal(noGo.outcome.third_matrix_permitted, false);
});

test("qualification metrics keep latency, reported usage, missingness, actual cost, maximum cost, and overflow separate", async () => {
  const setup = await approvedRecovery({ approvalRunId: "qualification-metrics-run" });
  const retained = await operationalEvidence({ runId: "qualification-metrics-run" });
  const manifest = buildQualificationManifest({ evidence: retained.evidence, plan: setup.recoveryPlan, model: MODELS[0], outcome: "GO" });
  assert.deepEqual(manifest.latency_cost.latency_ms, { minimum: 10, maximum: 10, total: 210, mean: 10 });
  assert.deepEqual(manifest.latency_cost.usage, { reported_calls: 21, missing_calls: 0, overflow: false, prompt_tokens: 21, completion_tokens: 42, total_tokens: 63 });
  assert.equal(manifest.latency_cost.observed_cost.partial, false);
  assert.equal(manifest.latency_cost.observed_cost.input_usd, 21 * 0.35 / 1_000_000);
  assert.equal(manifest.latency_cost.observed_cost.output_usd, 42 * 0.75 / 1_000_000);
  assert.ok(manifest.latency_cost.maximum_cost.gross_usd > manifest.latency_cost.observed_cost.gross_usd);

  const missing = await operationalEvidence({ runId: "qualification-missing-metrics-run", missingUsage: true });
  const missingManifest = buildQualificationManifest({ evidence: missing.evidence, plan: setup.recoveryPlan, model: MODELS[0], outcome: "GO" });
  assert.equal(missingManifest.latency_cost.usage.reported_calls, 0);
  assert.equal(missingManifest.latency_cost.usage.missing_calls, 21);
  assert.equal(missingManifest.latency_cost.observed_cost.partial, true);
  assert.equal(missingManifest.latency_cost.observed_cost.gross_usd, 0);

  const overflowEvidence = clone(retained.evidence);
  for (const record of overflowEvidence.records.filter(({ model }) => model === MODELS[0]).slice(0, 2)) {
    record.usage = { prompt_tokens: Number.MAX_SAFE_INTEGER, completion_tokens: 0, total_tokens: Number.MAX_SAFE_INTEGER };
  }
  const overflowManifest = buildQualificationManifest({ evidence: overflowEvidence, plan: setup.recoveryPlan, model: MODELS[0], outcome: "GO" });
  assert.equal(overflowManifest.latency_cost.usage.overflow, true);
  assert.equal(overflowManifest.latency_cost.usage.total_tokens, null);
  assert.equal(overflowManifest.latency_cost.observed_cost.computable, false);
  assert.equal(overflowManifest.latency_cost.observed_cost.gross_usd, null);
});

test("the qualification domain has an independently pinned canonical SHA-256 vector", () => {
  const vector = {
    version: 1,
    role: "judge",
    provider: "cloudflare-workers-ai",
    resolved_model: "@cf/openai/gpt-oss-120b",
    request_parameters: { temperature: 0, max_tokens: 2048, response_format_type: "json_schema" },
    prompt_template_sha256: "1".repeat(64),
    wire_schema_sha256: "2".repeat(64),
    adapter_sha256: "3".repeat(64),
    binding_version: "oddspark-candidate-ref/v1",
    runtime: { runtime_identity_sha256: "4".repeat(64) },
    timeout_policy_sha256: "5".repeat(64),
    semantic_identity_sha256: null,
    fixture_result_sha256: "6".repeat(64),
    trial_counts: { probes: 1, trials: 20, classifications: { direct_valid: 19, repaired_valid: 1 } },
    rates: { total: 20, direct_valid: 19, repaired_valid: 1, direct_rate: { numerator: 19, denominator: 20, percent: 95 }, post_repair_rate: { numerator: 20, denominator: 20, percent: 100 } },
    latency_cost: { latency_ms: { minimum: 1, maximum: 21, total: 210, mean: 10 }, usage: { reported_calls: 20, missing_calls: 1, overflow: false, prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 }, observed_cost: { pricing_as_of: "2026-07-29", computable: true, partial: true, input_usd: 0.00007, output_usd: 0.000075, gross_usd: 0.000145, gross_neurons: 13.181818181818182 }, maximum_cost: { pricing_as_of: "2026-07-29", gross_usd: 0.1, gross_neurons: 9090.90909090909 } },
    outcome: "GO",
    approval_run_id: "qualification-vector-run",
    tested_source_identity: { manifest_sha256: "7".repeat(64), entries: [] },
  };
  const canonical = (value) => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  };
  const expected = "c2323f335f273f4ad7c11919d9252fc691bb22b763e1f71a904863c803ee0671";
  assert.equal(deriveQualificationRef(vector), expected);
  assert.equal(expected, createHash("sha256").update(`oddspark-qualification/v1\n${canonical(vector)}`).digest("hex"));
  assert.notEqual(expected, createHash("sha256").update(`different-domain\n${canonical(vector)}`).digest("hex"));
});

test("qualification approval is bound to run start and retained bundles verify after wall-clock expiry", async () => {
  const setup = await approvedRecovery({ approvalRunId: "retained-authority-run" });
  const retained = await operationalEvidence({ runId: "retained-authority-run", runStartedAt: setup.now.toISOString() });
  const bytes = Buffer.from(`${JSON.stringify(retained.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => retained.sources, currentRuntimeIdentity: async () => retained.runtime, executeFixtures: async () => retained.fixtureResult };
  const bundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: setup.approval, evidence: retained.evidence, evidence_file: "retained-v2.json", evidence_bytes: bytes }, dependencies);
  assert.deepEqual(bundle.approval_check, { observed_at: retained.evidence.run.started_at, valid: true, errors: [] });
  const verifierWallClockAfterExpiry = new Date(Date.parse(setup.approval.expires_at) + 24 * 60 * 60 * 1000);
  assert.equal((await verifyQualificationBundle(bundle, retained.evidence, bytes, dependencies, verifierWallClockAfterExpiry)).valid, true);

  const lateEvidence = await operationalEvidence({ runId: "retained-authority-run", runStartedAt: new Date(Date.parse(setup.approval.expires_at) + 1).toISOString() });
  const lateBytes = Buffer.from(`${JSON.stringify(lateEvidence.evidence, null, 2)}\n`);
  const lateDependencies = { currentSourceIdentity: async () => lateEvidence.sources, currentRuntimeIdentity: async () => lateEvidence.runtime, executeFixtures: async () => lateEvidence.fixtureResult };
  const lateBundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: setup.approval, evidence: lateEvidence.evidence, evidence_file: "late-v2.json", evidence_bytes: lateBytes }, lateDependencies);
  assert.equal(lateBundle.approval_check.valid, false);
  assert.match(lateBundle.approval_check.errors.join("\n"), /stale/);
  assert.equal(lateBundle.outcome.decision, "NO-GO");
  assert.deepEqual(lateBundle.qualification_refs, []);
});

test("zero-call qualification binds cap 42 for approved adapter failure and cap 0 without approval", async () => {
  const approvedSetup = await approvedRecovery({ approvalRunId: "approved-zero-cap-run" });
  let approvedEvidence; let approvedBundle;
  await runLive({ base_url: "http://127.0.0.1:9668" }, {
    operatorPresent: true,
    plan: approvedSetup.recoveryPlan,
    approval: approvedSetup.approval,
    now: approvedSetup.now,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => approvedSetup.sources,
    currentRuntimeIdentity: async () => approvedSetup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9668/health", http_status: 503, body: null }),
    async invoke() { throw new Error("adapter failure must block inference"); },
    async writeArtifacts(evidence, qualification) { approvedEvidence = clone(evidence); approvedBundle = clone(qualification); return { jsonPath: "approved-zero.json", markdownPath: "approved-zero.md", qualificationPath: "approved-zero-qualification.json" }; },
  });
  assert.equal(approvedEvidence.records.length, 0);
  assert.equal(approvedEvidence.run.authorization.operator_approved, true);
  assert.equal(approvedEvidence.run.authorization.approved_call_cap, 42);
  assert.equal(approvedBundle.outcome.decision, "NO-GO");

  const unapproved = await operationalEvidence({ blocked: true, runId: "unapproved-zero-cap-run" });
  const unapprovedSetup = await approvedRecovery({ approvalRunId: "unapproved-zero-cap-run" });
  const bytes = Buffer.from(`${JSON.stringify(unapproved.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => unapproved.sources, currentRuntimeIdentity: async () => unapproved.runtime, executeFixtures: async () => unapproved.fixtureResult };
  const bundle = await buildQualificationBundle({ plan: unapprovedSetup.recoveryPlan, approval: null, evidence: unapproved.evidence, evidence_file: "unapproved-zero-v2.json", evidence_bytes: bytes }, dependencies);
  assert.equal(bundle.outcome.decision, "NO-GO");
  assert.equal(unapproved.evidence.run.authorization.approved_call_cap, 0);
  const mutatedEvidence = clone(unapproved.evidence);
  mutatedEvidence.run.authorization.approved_call_cap = 42;
  const mutatedBytes = Buffer.from(`${JSON.stringify(mutatedEvidence, null, 2)}\n`);
  assert.equal((await verifyQualificationBundle(bundle, mutatedEvidence, mutatedBytes, dependencies)).valid, false);
});

test("approval expiry between adapter preflight and run start blocks every provider call", async () => {
  const setup = await approvedRecovery({ approvalRunId: "run-start-expiry-run" });
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  let calls = 0; let healthChecks = 0; let retained; let bundle;
  const runStartedAt = new Date(Date.parse(setup.approval.expires_at) + 1);
  const decision = await runLive({ base_url: "http://127.0.0.1:9663" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    runStartedAt,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    async observeHealth() { healthChecks += 1; return { endpoint: "http://127.0.0.1:9663/health", http_status: 200, body: health }; },
    async invoke() { calls += 1; },
    async writeArtifacts(evidence, qualification) { retained = clone(evidence); bundle = clone(qualification); return { jsonPath: "expired.json", markdownPath: "expired.md", qualificationPath: "expired-qualification.json" }; },
  });
  assert.equal(decision, "NO-GO");
  assert.equal(healthChecks, 1);
  assert.equal(calls, 0);
  assert.equal(retained.records.length, 0);
  assert.equal(bundle.approval_check.observed_at, runStartedAt.toISOString());
  assert.match(bundle.approval_check.errors.join("\n"), /stale/);
});

test("qualification verification rejects manifest, ref, evidence-byte, and unknown-field mutations", async () => {
  const setup = await approvedRecovery({ approvalRunId: "qualification-mutation-run" });
  const retained = await operationalEvidence({ runId: "qualification-mutation-run", directByModel: [20, 20] });
  const bytes = Buffer.from(`${JSON.stringify(retained.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => retained.sources, currentRuntimeIdentity: async () => retained.runtime, executeFixtures: async () => retained.fixtureResult };
  const bundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: setup.approval, evidence: retained.evidence, evidence_file: "mutation-v2.json", evidence_bytes: bytes, now: setup.now }, dependencies);
  for (const mutate of [
    (value) => { value.manifests[0].resolved_model = MODELS[1]; },
    (value) => { value.qualification_refs[0].qualification_ref = "0".repeat(64); },
    (value) => { value.evidence.sha256 = "0".repeat(64); },
    (value) => { value.unexpected = true; },
  ]) {
    const changed = clone(bundle); mutate(changed);
    assert.equal((await verifyQualificationBundle(changed, retained.evidence, bytes, dependencies, setup.now)).valid, false);
  }
  const openManifest = { ...bundle.manifests[0], unexpected: true };
  assert.equal(validateQualificationManifest(openManifest, { evidence: retained.evidence, plan: setup.recoveryPlan, model: MODELS[0], outcome: "GO" }).valid, false);
});

test("the explicit qualification verifier independently verifies a sibling evidence artifact", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-qualification-verifier-"));
  const { qualificationPath: bundlePath } = await publishValidQualification(directory, "explicit-evidence-v2", "explicit-qualification-run");
  const { stdout } = await execFileAsync(process.execPath, [new URL("./qualification.mjs", import.meta.url).pathname, "verify", "--file", bundlePath], { cwd: new URL("../..", import.meta.url).pathname });
  assert.match(stdout, /PASS .*\(GO; 2 refs\)/);
});

test("public verifiers reject missing, malformed, stale, hash-mismatched, and member-missing publications", async () => {
  const cases = {
    "missing-marker": async (files) => unlink(files.completionPath),
    "malformed-marker": async (files) => writeFile(files.completionPath, "{}\n"),
    "stale-marker": async (files) => writeFile(files.jsonPath, `${JSON.stringify({ ...files.evidence, report: `${files.evidence.report}\nstale` }, null, 2)}\n`),
    "hash-mismatch": async (files) => {
      const marker = JSON.parse(await readFile(files.completionPath, "utf8"));
      marker.files[0].sha256 = "0".repeat(64);
      await writeFile(files.completionPath, `${JSON.stringify(marker, null, 2)}\n`);
    },
    "member-missing": async (files) => unlink(files.markdownPath),
  };
  for (const [name, mutate] of Object.entries(cases)) {
    const directory = await mkdtemp(path.join(tmpdir(), `oddspark-public-${name}-`));
    const files = await publishValidQualification(directory, `${name}-v2`, `${name}-run`);
    await mutate(files);
    await assert.rejects(execFileAsync(process.execPath, [new URL("./verify-v2.mjs", import.meta.url).pathname, "--file", files.jsonPath]), (error) => {
      assert.notEqual(error.code, 0); assert.match(`${error.stdout}${error.stderr}`, /FAIL/); return true;
    });
    await assert.rejects(execFileAsync(process.execPath, [new URL("./qualification.mjs", import.meta.url).pathname, "verify", "--file", files.qualificationPath]), (error) => {
      assert.notEqual(error.code, 0); assert.match(`${error.stdout}${error.stderr}`, /INVALID/); return true;
    });
  }
});

test("recovery artifact publication is atomic when the qualification target is occupied", async () => {
  const setup = await approvedRecovery({ approvalRunId: "atomic-recovery-run" });
  const retained = await operationalEvidence({ runId: "atomic-recovery-run" });
  const bytes = Buffer.from(`${JSON.stringify(retained.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => retained.sources, currentRuntimeIdentity: async () => retained.runtime, executeFixtures: async () => retained.fixtureResult };
  const basename = "2026-08-18-atomic-r-0123456789abcdef-atomic-attempt-v2";
  const bundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: setup.approval, evidence: retained.evidence, evidence_file: `${basename}.json`, evidence_bytes: bytes }, dependencies);
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-recovery-atomic-"));
  const qualificationPath = path.join(directory, `${basename.replace(/-v2$/, "")}-qualification.json`);
  await writeFile(qualificationPath, "occupied");
  await assert.rejects(writeRecoveryArtifacts(retained.evidence, bundle, directory, basename));
  await assert.rejects(access(path.join(directory, `${basename}.json`)));
  await assert.rejects(access(path.join(directory, `${basename}.md`)));
  assert.equal(await readFile(qualificationPath, "utf8"), "occupied");
});

test("real child termination at every publication boundary exposes only incomplete or marker-verified sets", async () => {
  const setup = await approvedRecovery({ approvalRunId: "publication-crash-run" });
  const retained = await operationalEvidence({ blocked: true, runId: "publication-crash-run" });
  const bytes = Buffer.from(`${JSON.stringify(retained.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => retained.sources, currentRuntimeIdentity: async () => retained.runtime, executeFixtures: async () => retained.fixtureResult };
  const control = await mkdtemp(path.join(tmpdir(), "oddspark-publication-control-"));
  const evidenceControl = path.join(control, "evidence.json");
  await writeFile(evidenceControl, bytes);
  const boundaries = [
    "prepared:evidence.json", "prepared:evidence.md", "prepared:qualification.json",
    "published:evidence.json", "published:evidence.md", "published:qualification.json",
    "prepared:completion", "published:completion",
  ];
  for (let index = 0; index < boundaries.length; index += 1) {
    const directory = await mkdtemp(path.join(tmpdir(), "oddspark-publication-crash-"));
    const basename = `publication-${index}-v2`;
    const bundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: null, evidence: retained.evidence, evidence_file: `${basename}.json`, evidence_bytes: bytes }, dependencies);
    const qualificationControl = path.join(control, `qualification-${index}.json`);
    await writeFile(qualificationControl, `${JSON.stringify(bundle, null, 2)}\n`);
    const memberNames = [`${basename}.json`, `${basename}.md`, `${basename.replace(/-v2$/, "")}-qualification.json`];
    const concreteBoundary = boundaries[index]
      .replace("evidence.json", memberNames[0])
      .replace("evidence.md", memberNames[1])
      .replace("qualification.json", memberNames[2]);
    await assert.rejects(execFileAsync(process.execPath, [new URL("./test.mjs", import.meta.url).pathname, "--publication-child", directory, basename, evidenceControl, qualificationControl, concreteBoundary]));
    const discovered = await findPriorOperationalRecovery(directory, dependencies);
    if (boundaries[index] === "published:completion") assert.equal(discovered, null);
    else assert.match(discovered.blocking_reason, /partial recovery publication/);
  }
});

test("physical output containment rejects symlinked result parents", async () => {
  const setup = await approvedRecovery({ approvalRunId: "symlink-output-run" });
  const retained = await operationalEvidence({ blocked: true, runId: "symlink-output-run" });
  const bytes = Buffer.from(`${JSON.stringify(retained.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => retained.sources, currentRuntimeIdentity: async () => retained.runtime, executeFixtures: async () => retained.fixtureResult };
  const basename = "symlink-output-v2";
  const bundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: null, evidence: retained.evidence, evidence_file: `${basename}.json`, evidence_bytes: bytes }, dependencies);
  const parent = await mkdtemp(path.join(tmpdir(), "oddspark-symlink-parent-"));
  const physical = await mkdtemp(path.join(tmpdir(), "oddspark-symlink-target-"));
  const alias = path.join(parent, "results");
  await symlink(physical, alias);
  await assert.rejects(writeRecoveryArtifacts(retained.evidence, bundle, alias, basename), /symlink aliases/);
  assert.deepEqual(await readdir(physical), []);
});

test("a prior spent recovery stops without reading approval or invoking provider calls", async () => {
  let calls = 0;
  const decision = await runLive({}, {
    operatorPresent: true,
    findPriorRecovery: async () => ({ evidence_file: "existing-v2.json", qualification_file: "existing-qualification.json", qualification_refs: [{ model: MODELS[0], qualification_ref: "a".repeat(64) }] }),
    async invoke() { calls += 1; },
  });
  assert.equal(decision, "PRIOR-RECOVERY");
  assert.equal(calls, 0);
});

test("exclusive recovery locking prevents concurrent live attempts from both invoking", async () => {
  const setup = await approvedRecovery({ approvalRunId: "concurrent-lock-run" });
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-concurrent-lock-"));
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  let releaseFirst;
  const firstMayContinue = new Promise((resolve) => { releaseFirst = resolve; });
  let firstReceiptMarked;
  const firstMarked = new Promise((resolve) => { firstReceiptMarked = resolve; });
  let firstCalls = 0; let secondCalls = 0;
  let tick = setup.now.getTime() + 10;
  const common = {
    operatorPresent: true,
    recoveryGovernance: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    runStartedAt: setup.now,
    resultsDir: directory,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9665/health", http_status: 200, body: health }),
  };
  const first = runLive({ base_url: "http://127.0.0.1:9665" }, {
    ...common,
    attemptId: "concurrent-first",
    async afterCallReceipt(receipt) { if (receipt.calls_started === 1) { firstReceiptMarked(); await firstMayContinue; } },
    async invoke({ request_body }) {
      firstCalls += 1;
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      if (firstCalls === 1) return { call_state: "timeout", started_at, ended_at };
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
  });
  await firstMarked;
  const second = await runLive({ base_url: "http://127.0.0.1:9665" }, {
    ...common,
    attemptId: "concurrent-second",
    async invoke() { secondCalls += 1; throw new Error("concurrent attempt must not invoke"); },
  });
  assert.equal(second, "RECOVERY-LOCKED");
  assert.equal(secondCalls, 0);
  releaseFirst();
  assert.equal(await first, "NO-GO");
  assert.equal(firstCalls, 2);
});

test("stale and unknown lock paths always require fail-closed manual recovery", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-stale-zero-lock-"));
  const timestamp = "2026-08-18T12:00:00.000Z";
  await writeFile(path.join(directory, ".judge-recovery-spend.json"), `${JSON.stringify({
    schema_version: "oddspark.judge-recovery-spend/v1",
    attempt_id: "stale-zero-attempt",
    approval_run_id: "stale-zero-run",
    created_at: timestamp,
    updated_at: timestamp,
    state: "reserved",
    calls_started: 0,
    last_call: null,
  })}\n`);
  const lockPath = path.join(directory, ".judge-recovery.lock");
  await writeFile(lockPath, `${JSON.stringify({ attempt_id: "stale-zero-attempt", pid: 2_147_483_647, created_at: timestamp })}\n`);
  const [first, second] = await Promise.all([
    acquireRecoveryLock(directory, { now: new Date(), attempt_id: "contender-one" }),
    acquireRecoveryLock(directory, { now: new Date(), attempt_id: "contender-two" }),
  ]);
  assert.equal(first.acquired, false);
  assert.equal(second.acquired, false);
  assert.match(first.reason, /manual recovery/);
  assert.equal(JSON.parse(await readFile(lockPath, "utf8")).attempt_id, "stale-zero-attempt");

  const childPath = new URL("./test.mjs", import.meta.url).pathname;
  const [childOne, childTwo] = await Promise.all([
    execFileAsync(process.execPath, [childPath, "--lock-acquire-child", directory, "child-contender-one"]),
    execFileAsync(process.execPath, [childPath, "--lock-acquire-child", directory, "child-contender-two"]),
  ]);
  assert.equal(JSON.parse(childOne.stdout).acquired, false);
  assert.equal(JSON.parse(childTwo.stdout).acquired, false);
});

test("real child termination preserves attempt-bound lock and durable spend state", async () => {
  const childPath = new URL("./test.mjs", import.meta.url).pathname;
  for (const boundary of ["lock-acquired", "receipt-renamed", "call-started"]) {
    const directory = await mkdtemp(path.join(tmpdir(), `oddspark-governance-${boundary}-`));
    await assert.rejects(execFileAsync(process.execPath, [childPath, "--governance-crash-child", directory, boundary]));
    const lock = JSON.parse(await readFile(path.join(directory, ".judge-recovery.lock"), "utf8"));
    assert.equal(lock.attempt_id, `governance-${boundary}`);
    const contender = await acquireRecoveryLock(directory, { attempt_id: `later-${boundary}` });
    assert.equal(contender.acquired, false);
    if (boundary === "lock-acquired") await assert.rejects(access(path.join(directory, ".judge-recovery-spend.json")));
    else {
      const receipt = JSON.parse(await readFile(path.join(directory, ".judge-recovery-spend.json"), "utf8"));
      assert.equal(receipt.attempt_id, lock.attempt_id);
      assert.equal(receipt.calls_started, boundary === "call-started" ? 1 : 0);
      assert.equal(receipt.state, boundary === "call-started" ? "calls-started" : "reserved");
    }
  }
});

test("a crash after the durable call-start receipt blocks every later attempt", async () => {
  const setup = await approvedRecovery({ approvalRunId: "crash-receipt-run" });
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-crash-receipt-"));
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  let invoked = 0;
  const common = {
    operatorPresent: true,
    recoveryGovernance: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    runStartedAt: setup.now,
    resultsDir: directory,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9666/health", http_status: 200, body: health }),
  };
  await assert.rejects(runLive({ base_url: "http://127.0.0.1:9666" }, {
    ...common,
    attemptId: "crashed-attempt",
    async afterCallReceipt() { const error = new Error("simulated process crash"); error.code = "ODDSPARK_FATAL_PROCESS_EXIT"; throw error; },
    async invoke() { invoked += 1; },
  }), /simulated process crash/);
  assert.equal(invoked, 0);
  let laterCalls = 0;
  assert.equal(await runLive({ base_url: "http://127.0.0.1:9666" }, {
    ...common,
    attemptId: "later-attempt",
    async invoke() { laterCalls += 1; },
  }), "PRIOR-RECOVERY");
  assert.equal(laterCalls, 0);
  const prior = await findPriorOperationalRecovery(directory);
  assert.match(prior.blocking_reason, /spend receipt/);
});

test("a successful filesystem-governed run reports verified evidence and refs despite its durable spend receipt", async () => {
  const setup = await approvedRecovery({ approvalRunId: "successful-receipt-run" });
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-successful-receipt-"));
  const baseUrl = "http://127.0.0.1:9668";
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  const fixtureResult = await executeCurrentFixtureCatalog();
  let calls = 0;
  let tick = setup.now.getTime() + 10;
  const verificationDependencies = {
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    executeFixtures: async () => fixtureResult,
  };
  assert.equal(await runLive({ base_url: baseUrl }, {
    operatorPresent: true,
    recoveryGovernance: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    runStartedAt: setup.now,
    attemptId: "successful-receipt-attempt",
    resultsDir: directory,
    ...verificationDependencies,
    observeHealth: async () => ({ endpoint: `${baseUrl}/health`, http_status: 200, body: health }),
    async invoke({ request_body }) {
      calls += 1;
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
  }), "GO");
  assert.equal(calls, 42);

  const receipt = JSON.parse(await readFile(path.join(directory, ".judge-recovery-spend.json"), "utf8"));
  assert.equal(receipt.state, "completed-spent");
  assert.equal(receipt.calls_started, 42);
  const evidenceNames = (await readdir(directory)).filter((name) => name.endsWith("-v2.json"));
  assert.equal(evidenceNames.length, 1);
  const qualificationName = evidenceNames[0].replace(/-v2\.json$/, "-qualification.json");
  const qualification = JSON.parse(await readFile(path.join(directory, qualificationName), "utf8"));

  const prior = await findPriorOperationalRecovery(directory, verificationDependencies);
  assert.equal(prior.evidence_file, evidenceNames[0]);
  assert.equal(prior.qualification_file, qualificationName);
  assert.equal(prior.refs_verified, true);
  assert.equal(prior.malformed, false);
  assert.deepEqual(prior.qualification_refs, qualification.qualification_refs);
  assert.equal(prior.qualification_refs.length, 2);
});

test("prior recovery discovery ignores verified zero-call blocks but fails closed on spent or malformed v2 artifacts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-prior-recovery-"));
  const zeroSetup = await approvedRecovery({ approvalRunId: "prior-zero-run" });
  const zero = await operationalEvidence({ blocked: true, runId: "prior-zero-run" });
  const zeroBytes = Buffer.from(`${JSON.stringify(zero.evidence, null, 2)}\n`);
  const zeroDependencies = { currentSourceIdentity: async () => zero.sources, currentRuntimeIdentity: async () => zero.runtime, executeFixtures: async () => zero.fixtureResult };
  const zeroBasename = "2026-08-18-prior-ze-0123456789abcdef-complete-zero-v2";
  const zeroBundle = await buildQualificationBundle({ plan: zeroSetup.recoveryPlan, approval: null, evidence: zero.evidence, evidence_file: `${zeroBasename}.json`, evidence_bytes: zeroBytes }, zeroDependencies);
  await writeRecoveryArtifacts(zero.evidence, zeroBundle, directory, zeroBasename);
  assert.equal(await findPriorOperationalRecovery(directory, zeroDependencies), null);
  await writeFile(path.join(directory, "2026-08-18-spent-v2.json"), JSON.stringify({ schema_version: "oddspark.judge-recovery-evidence/v2", profile: "operational", records: [{}] }));
  assert.equal((await findPriorOperationalRecovery(directory, zeroDependencies)).evidence_file, "2026-08-18-spent-v2.json");
  const malformedDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-prior-malformed-"));
  await writeFile(path.join(malformedDirectory, "2026-08-18-unknown-v2.json"), "not json");
  assert.equal((await findPriorOperationalRecovery(malformedDirectory)).malformed, true);
});

test("reserved receipts reopen only for a complete independently verified zero-call artifact from the same attempt", async () => {
  const attempt = "reserved-match-attempt";
  const runId = "reserved-match-run";
  const setup = await approvedRecovery({ approvalRunId: runId });
  const zero = await operationalEvidence({ blocked: true, runId });
  const bytes = Buffer.from(`${JSON.stringify(zero.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => zero.sources, currentRuntimeIdentity: async () => zero.runtime, executeFixtures: async () => zero.fixtureResult };
  const bundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: null, evidence: zero.evidence,
    evidence_file: `2026-08-18-zero-${attempt}-v2.json`, evidence_bytes: bytes }, dependencies);
  const receipt = { schema_version: "oddspark.judge-recovery-spend/v1", attempt_id: attempt, approval_run_id: runId,
    created_at: setup.now.toISOString(), updated_at: setup.now.toISOString(), state: "reserved", calls_started: 0, last_call: null };

  const matched = await mkdtemp(path.join(tmpdir(), "oddspark-reserved-matched-"));
  await writeRecoveryArtifacts(zero.evidence, bundle, matched, `2026-08-18-zero-${attempt}-v2`);
  await writeFile(path.join(matched, ".judge-recovery-spend.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  const recoverable = await findPriorOperationalRecovery(matched, dependencies);
  assert.equal(recoverable.safe_zero_call_receipt, true);
  assert.equal(recoverable.attempt_id, attempt);

  const mismatched = await mkdtemp(path.join(tmpdir(), "oddspark-reserved-mismatched-"));
  await writeRecoveryArtifacts(zero.evidence, bundle, mismatched, `2026-08-18-zero-${attempt}-v2`);
  await writeFile(path.join(mismatched, ".judge-recovery-spend.json"), `${JSON.stringify({ ...receipt, attempt_id: "different-attempt" }, null, 2)}\n`);
  assert.match((await findPriorOperationalRecovery(mismatched, dependencies)).blocking_reason, /same attempt/);

  const missing = await mkdtemp(path.join(tmpdir(), "oddspark-reserved-missing-"));
  await writeFile(path.join(missing, ".judge-recovery-spend.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.match((await findPriorOperationalRecovery(missing, dependencies)).blocking_reason, /same attempt/);
});

test("an older verified zero-call artifact never masks an unrelated later temporary publication", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-zero-plus-temp-"));
  const zeroSetup = await approvedRecovery({ approvalRunId: "older-zero-run" });
  const zero = await operationalEvidence({ blocked: true, runId: "older-zero-run" });
  const bytes = Buffer.from(`${JSON.stringify(zero.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => zero.sources, currentRuntimeIdentity: async () => zero.runtime, executeFixtures: async () => zero.fixtureResult };
  const basename = "2026-08-18-older-zero-complete-attempt-v2";
  const bundle = await buildQualificationBundle({ plan: zeroSetup.recoveryPlan, approval: null, evidence: zero.evidence, evidence_file: `${basename}.json`, evidence_bytes: bytes }, dependencies);
  await writeRecoveryArtifacts(zero.evidence, bundle, directory, basename);
  await writeFile(path.join(directory, ".unrelated-later-publication.tmp"), "orphan");
  assert.match((await findPriorOperationalRecovery(directory, dependencies)).blocking_reason, /partial recovery publication/);
});

test("invalid, partial, tampered, and unverified-ref artifacts never reopen or embellish the allowance", async () => {
  const invalidDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-prior-invalid-"));
  await writeFile(path.join(invalidDirectory, "attempt-v2-invalid.json"), "{}\n");
  assert.match((await findPriorOperationalRecovery(invalidDirectory)).blocking_reason, /cannot disprove spend/);

  const partialDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-prior-partial-"));
  await writeFile(path.join(partialDirectory, "attempt-qualification.json"), "{}\n");
  assert.match((await findPriorOperationalRecovery(partialDirectory)).blocking_reason, /partial recovery publication/);

  const setup = await approvedRecovery({ approvalRunId: "unverified-refs-run" });
  const spent = await operationalEvidence({ runId: "unverified-refs-run" });
  const bytes = Buffer.from(`${JSON.stringify(spent.evidence, null, 2)}\n`);
  const dependencies = { currentSourceIdentity: async () => spent.sources, currentRuntimeIdentity: async () => spent.runtime, executeFixtures: async () => spent.fixtureResult };
  const basename = "2026-08-18-unverifi-0123456789abcdef-spent-v2";
  const bundle = await buildQualificationBundle({ plan: setup.recoveryPlan, approval: setup.approval, evidence: spent.evidence, evidence_file: `${basename}.json`, evidence_bytes: bytes }, dependencies);
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-unverified-refs-"));
  const files = await writeRecoveryArtifacts(spent.evidence, bundle, directory, basename);
  const tamperedBundle = clone(bundle);
  tamperedBundle.qualification_refs[0].qualification_ref = "f".repeat(64);
  await writeFile(files.qualificationPath, `${JSON.stringify(tamperedBundle, null, 2)}\n`);
  const prior = await findPriorOperationalRecovery(directory, dependencies);
  assert.deepEqual(prior.qualification_refs, []);
  assert.notEqual(prior.refs_verified, true);
  assert.equal(prior.malformed, true);

  const zeroSetup = await approvedRecovery({ approvalRunId: "tampered-zero-run" });
  const zero = await operationalEvidence({ blocked: true, runId: "tampered-zero-run" });
  const zeroBytes = Buffer.from(`${JSON.stringify(zero.evidence, null, 2)}\n`);
  const zeroDependencies = { currentSourceIdentity: async () => zero.sources, currentRuntimeIdentity: async () => zero.runtime, executeFixtures: async () => zero.fixtureResult };
  const zeroBasename = "2026-08-18-tampered-0123456789abcdef-zero-v2";
  const zeroBundle = await buildQualificationBundle({ plan: zeroSetup.recoveryPlan, approval: null, evidence: zero.evidence, evidence_file: `${zeroBasename}.json`, evidence_bytes: zeroBytes }, zeroDependencies);
  const zeroDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-tampered-zero-"));
  const zeroFiles = await writeRecoveryArtifacts(zero.evidence, zeroBundle, zeroDirectory, zeroBasename);
  const tamperedEvidence = clone(zero.evidence); tamperedEvidence.run.ended_at = "2026-08-18T12:00:00.001Z";
  await writeFile(zeroFiles.jsonPath, `${JSON.stringify(tamperedEvidence, null, 2)}\n`);
  assert.match((await findPriorOperationalRecovery(zeroDirectory, zeroDependencies)).blocking_reason, /completion marker|failed complete verification/);
});

test("blocked and corrected attempts with one approval run id publish without collisions or data loss", async () => {
  const setup = await approvedRecovery({ approvalRunId: "same-run-publication" });
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-attempt-publication-"));
  const baseUrl = "http://127.0.0.1:9664";
  const common = {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    now: setup.now,
    runStartedAt: setup.now,
    resultsDir: directory,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
  };
  assert.equal(await runLive({ base_url: baseUrl }, { ...common, attemptId: "blocked-attempt-one" }), "NO-GO");
  assert.equal(await runLive({ base_url: baseUrl }, { ...common, attemptId: "blocked-attempt-two" }), "NO-GO");

  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  let calls = 0;
  let tick = setup.now.getTime() + 10;
  assert.equal(await runLive({ base_url: baseUrl }, {
    ...common,
    approval: setup.approval,
    runStartedAt: new Date(setup.now.getTime() + 1),
    attemptId: "corrected-full-attempt",
    observeHealth: async () => ({ endpoint: `${baseUrl}/health`, http_status: 200, body: health }),
    async invoke({ request_body }) {
      calls += 1;
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
  }), "GO");
  assert.equal(calls, 42);

  const names = await readdir(directory);
  const evidenceNames = names.filter((name) => name.endsWith("-v2.json")).sort();
  const qualificationNames = names.filter((name) => name.endsWith("-qualification.json")).sort();
  assert.equal(evidenceNames.length, 3);
  assert.equal(new Set(evidenceNames).size, 3);
  assert.equal(qualificationNames.length, 3);
  const retained = await Promise.all(evidenceNames.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))));
  assert.deepEqual(retained.map(({ records }) => records.length).sort((left, right) => left - right), [0, 0, 42]);
  for (const qualificationName of qualificationNames) {
    const qualification = JSON.parse(await readFile(path.join(directory, qualificationName), "utf8"));
    assert.ok(evidenceNames.includes(qualification.evidence.file));
  }
  assert.equal((await findPriorOperationalRecovery(directory)).malformed, false);
});

test("a rejected probe retains exactly two calls, no trials, and no qualification refs", async () => {
  const setup = await approvedRecovery({ approvalRunId: "probe-stop-fixture" });
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  let calls = 0; let retained; let bundle;
  let tick = setup.now.getTime() + 10;
  const decision = await runLive({ base_url: "http://127.0.0.1:9661" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9661/health", http_status: 200, body: health }),
    async invoke({ request_body }) {
      calls += 1;
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      if (calls === 1) return { call_state: "timeout", started_at, ended_at };
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
    async retainInvalidEvidence() { throw new Error("unexpected invalid probe-stop evidence"); },
    async writeArtifacts(evidence, qualification) { retained = clone(evidence); bundle = clone(qualification); return { jsonPath: "probe.json", markdownPath: "probe.md", qualificationPath: "probe-qualification.json" }; },
  });
  assert.equal(decision, "NO-GO");
  assert.equal(calls, 2);
  assert.equal(retained.records.length, 2);
  assert.equal(retained.records.filter(({ kind }) => kind === "trial").length, 0);
  assert.deepEqual(bundle.qualification_refs, []);
  assert.equal(bundle.outcome.mvp_review_required, true);
});

test("exact fresh approval runs the full matrix and emits independently verified refs", async () => {
  const setup = await approvedRecovery({ approvalRunId: "full-live-fixture" });
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  let calls = 0; let retained; let bundle;
  let tick = setup.now.getTime() + 10;
  const decision = await runLive({ base_url: "http://127.0.0.1:9660" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9660/health", http_status: 200, body: health }),
    async invoke({ request_body }) {
      calls += 1;
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } };
    },
    async retainInvalidEvidence() { throw new Error("unexpected invalid evidence in full live fixture"); },
    async writeArtifacts(evidence, qualification) { retained = clone(evidence); bundle = clone(qualification); return { jsonPath: "full.json", markdownPath: "full.md", qualificationPath: "full-qualification.json" }; },
  });
  assert.equal(decision, "GO");
  assert.equal(calls, 42);
  assert.equal(retained.records.length, 42);
  assert.deepEqual(retained.records.slice(0, 2).map(({ kind }) => kind), ["probe", "probe"]);
  assert.equal(bundle.manifests.length, 2);
  assert.equal(bundle.qualification_refs.length, 2);
});

test("post-call verification failure retains the evidence file before failing closed", async () => {
  const setup = await approvedRecovery({ approvalRunId: "post-call-integrity-run" });
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-evidence-retention-"));
  let retainedPath;
  let tick = setup.now.getTime() + 10;
  await assert.rejects(runLive({ base_url: "http://127.0.0.1:9567" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    findPriorRecovery: async () => null,
    currentSourceIdentity: async () => setup.sources,
    currentRuntimeIdentity: async () => setup.runtime,
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9567/health", http_status: 200, body: health }),
    async invoke({ request_body }) {
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
    evidenceDependencies: { executeFixtures: async () => ({ declared_ids: ["post-call-drift"], passing_ids: [], failures: ["post-call-drift: failed"] }) },
    async retainInvalidEvidence(evidence) {
      retainedPath = path.join(directory, "retained.json");
      await writeFile(retainedPath, `${JSON.stringify(evidence)}\n`);
      return retainedPath;
    },
  }), /retained evidence failed verification/);
  const retained = JSON.parse(await readFile(retainedPath, "utf8"));
  assert.equal(retained.records.length, 42);
  assert.equal(retained.records[0].classification, "direct_valid");
});

test("post-call source, runtime, and request identities are freshly re-read before qualification", async () => {
  const setup = await approvedRecovery({ approvalRunId: "post-call-identity-reread-run" });
  const health = expectedAdapterHealth(setup.sources, setup.runtime);
  const changedSources = clone(setup.sources);
  changedSources[0].sha256 = "f".repeat(64);
  const changedRuntime = clone(setup.runtime);
  changedRuntime.runtime_identity_sha256 = "e".repeat(64);
  const changedInput = clone(setup.input);
  changedInput.candidate.title = `${changedInput.candidate.title} drift`;
  let sourceReads = 0; let runtimeReads = 0; let calls = 0; let retained;
  let tick = setup.now.getTime() + 10;
  await assert.rejects(runLive({ base_url: "http://127.0.0.1:9568" }, {
    operatorPresent: true,
    plan: setup.recoveryPlan,
    approval: setup.approval,
    now: setup.now,
    findPriorRecovery: async () => null,
    input: setup.input,
    currentInput: async () => changedInput,
    currentSourceIdentity: async () => (++sourceReads === 1 ? setup.sources : changedSources),
    currentRuntimeIdentity: async () => (++runtimeReads === 1 ? setup.runtime : changedRuntime),
    observeHealth: async () => ({ endpoint: "http://127.0.0.1:9568/health", http_status: 200, body: health }),
    async invoke({ request_body }) {
      calls += 1;
      const started_at = new Date(tick).toISOString(); tick += 10;
      const ended_at = new Date(tick).toISOString(); tick += 10;
      return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
    },
    async retainInvalidEvidence(evidence) { retained = clone(evidence); return "post-call-identity-invalid.json"; },
  }), /retained evidence failed verification/);
  assert.equal(calls, 42);
  assert.equal(sourceReads, 2);
  assert.equal(runtimeReads, 2);
  assert.equal(retained.records.length, 42);
  assert.equal(retained.adapter.identity_match, false);
});

test("qualification and publication failures after calls retain discoverable evidence and spend receipts", async () => {
  for (const failureMode of ["qualification", "publication"]) {
    const setup = await approvedRecovery({ approvalRunId: `post-call-${failureMode}-run` });
    const directory = await mkdtemp(path.join(tmpdir(), `oddspark-post-call-${failureMode}-`));
    const health = expectedAdapterHealth(setup.sources, setup.runtime);
    let calls = 0; let tick = setup.now.getTime() + 10;
    const dependencies = {
      operatorPresent: true,
      recoveryGovernance: true,
      plan: setup.recoveryPlan,
      approval: setup.approval,
      now: setup.now,
      runStartedAt: setup.now,
      resultsDir: directory,
      currentSourceIdentity: async () => setup.sources,
      currentRuntimeIdentity: async () => setup.runtime,
      observeHealth: async () => ({ endpoint: "http://127.0.0.1:9667/health", http_status: 200, body: health }),
      async invoke({ request_body }) {
        calls += 1;
        const started_at = new Date(tick).toISOString(); tick += 10;
        const ended_at = new Date(tick).toISOString(); tick += 10;
        if (calls === 1) return { call_state: "timeout", started_at, ended_at };
        return { call_state: "received", started_at, ended_at, envelope: { response: { candidate_ref: request_body.candidate_ref, verdict: clone(fixtures.valid_verdict) } }, usage: null };
      },
    };
    if (failureMode === "qualification") dependencies.buildQualificationBundle = async () => { throw new Error("qualification construction failed"); };
    else dependencies.writeArtifacts = async () => { throw new Error("publication failed"); };
    await assert.rejects(runLive({ base_url: "http://127.0.0.1:9667" }, dependencies), new RegExp(`${failureMode} .*failed`));
    assert.equal(calls, 2);
    const names = await readdir(directory);
    assert.ok(names.some((name) => name.endsWith("-v2-invalid.json")));
    assert.ok(names.includes(".judge-recovery-spend.json"));
    assert.ok((await findPriorOperationalRecovery(directory)).blocking_reason.includes("spend receipt"));
  }
});

async function runChildMode(argv) {
  const [mode, ...args] = argv;
  if (mode === "--publication-child") {
    const [directory, basename, evidencePath, qualificationPath, boundary] = args;
    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    const qualification = JSON.parse(await readFile(qualificationPath, "utf8"));
    await writeRecoveryArtifacts(evidence, qualification, directory, basename, {
      async onBoundary(stage) { if (stage === boundary) process.kill(process.pid, "SIGKILL"); },
    });
    return;
  }
  if (mode === "--lock-acquire-child") {
    const [directory, attemptId] = args;
    const lock = await acquireRecoveryLock(directory, { attempt_id: attemptId });
    console.log(JSON.stringify({ acquired: lock.acquired, reason: lock.reason ?? null }));
    if (lock.acquired) await lock.release();
    return;
  }
  if (mode === "--governance-crash-child") {
    const [directory, boundary] = args;
    const setup = await approvedRecovery({ approvalRunId: `governance-${boundary}-run` });
    const health = expectedAdapterHealth(setup.sources, setup.runtime);
    const die = () => process.kill(process.pid, "SIGKILL");
    const dependencies = {
      operatorPresent: true,
      recoveryGovernance: true,
      plan: setup.recoveryPlan,
      approval: setup.approval,
      now: setup.now,
      runStartedAt: setup.now,
      attemptId: `governance-${boundary}`,
      resultsDir: directory,
      findPriorRecovery: boundary === "lock-acquired" ? async () => die() : async () => null,
      currentSourceIdentity: async () => setup.sources,
      currentRuntimeIdentity: async () => setup.runtime,
      async afterReceiptReserved() { if (boundary === "receipt-renamed") die(); },
      observeHealth: async () => ({ endpoint: "http://127.0.0.1:9777/health", http_status: 200, body: health }),
      async afterCallReceipt() { if (boundary === "call-started") die(); },
      async invoke() { throw new Error("crash boundary failed to stop before provider dispatch"); },
    };
    await runLive({ base_url: "http://127.0.0.1:9777" }, dependencies);
    throw new Error("governance child did not terminate at requested boundary");
  }
  throw new Error(`unknown child mode: ${mode}`);
}

if (process.argv[2]?.startsWith("--") && process.argv[2]?.endsWith("-child")) {
  await runChildMode(process.argv.slice(2));
} else {
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
}
