import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CANDIDATE_SCHEMA_VERSION, deriveCandidateRef } from "./brief-contracts.mjs";
import {
  GENERATION_FAILURE_CODES,
  GenerationError,
  MAX_GENERATION_REQUEST_BYTES,
  MAX_GENERATION_RESULT_BYTES,
  MAX_GENERATION_VALUE_DEPTH,
  classifyGenerationResult,
  generateCandidate,
} from "./generation.mjs";

const seed = "a".repeat(64);
const localEvidence = () => ({ version: 1, mode: "local", priors: { region: "Blue Water Area", season: "summer", date: "current", situation: "repeated inquiries", capability_bundle: ["software"] } });
const domainEvidence = () => ({ version: 1, mode: "domain", vertical: "services", clarity: "clear", capabilities: ["inquiry routing"], channels: [], observation: { source_id: "home", url: "https://example.com", text: "The site emphasizes quick response." }, scanned_urls: ["https://example.com"] });
const localCandidate = () => ({
  version: 1, mode: "local", title: "A calmer inquiry handoff", plan: "Route repeated questions into one reviewed response.",
  why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." }, what_gets_better: "The team starts with a useful draft instead of an empty page.",
  before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." },
  change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true },
  stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] },
  invitation: "We can inspect this Spark together, including whether it is not worth changing.", grounded_numbers: [],
});
const domainCandidate = () => ({ ...localCandidate(), mode: "domain", why_fits: { text: "The site emphasizes quick response.", breadcrumb: "Replies are handled promptly" }, grounded_numbers: [] });

function assertFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value); assert.ok(Object.isFrozen(value)); Object.values(value).forEach((entry) => assertFrozen(entry, seen));
}

async function failure(code, action, calls) {
  let caught;
  await assert.rejects(action, (error) => {
    caught = error;
    assert.ok(error instanceof GenerationError); assert.equal(error.code, code); assert.equal(error.model_calls, calls);
    assert.equal(Object.hasOwn(error, "candidate"), false); assertFrozen(error); return true;
  });
  return caught;
}

test("local and domain Evidence yield one exact direct-valid frozen Candidate and post-validation reference", async () => {
  for (const [evidence, candidate] of [[localEvidence(), localCandidate()], [domainEvidence(), domainCandidate()]]) {
    let calls = 0; let received;
    const result = await generateCandidate({ evidence, seed }, { provider(request) { calls += 1; received = request; return candidate; } });
    assert.equal(calls, 1); assert.deepEqual(result.candidate, candidate); assert.notEqual(result.candidate, candidate);
    assert.equal(result.candidate_ref, deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, candidate)); assert.equal(result.model_calls, 1);
    assertFrozen(result); assertFrozen(received); assert.deepEqual(received, { evidence, seed });
  }
});

test("request and dependencies are snapshotted, closed, and rejected before invocation", async () => {
  const badEvidence = localEvidence(); badEvidence.extra = true;
  const cyclic = localEvidence(); cyclic.priors.loop = cyclic;
  const getter = {}; Object.defineProperty(getter, "evidence", { enumerable: true, get() { throw new Error("must not run"); } }); Object.defineProperty(getter, "seed", { enumerable: true, value: seed });
  const cases = [
    { input: null, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence() }, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed: "A".repeat(64) }, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed: Symbol("seed") }, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed: 12345 }, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed: {} }, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: badEvidence, seed }, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_EVIDENCE },
    { input: { evidence: cyclic, seed }, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_EVIDENCE },
    { input: getter, dependencies: { provider() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed }, dependencies: null, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed }, dependencies: {}, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed }, dependencies: { provider: 1 }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
    { input: { evidence: localEvidence(), seed }, dependencies: { provider() {}, fetch() {} }, expectedCode: GENERATION_FAILURE_CODES.INVALID_REQUEST },
  ];
  for (const { input, dependencies: supplied, expectedCode } of cases) {
    let calls = 0; const dependencies = supplied?.provider === 1 || !supplied ? supplied : { ...supplied, ...(typeof supplied.provider === "function" ? { provider() { calls += 1; return localCandidate(); } } : {}) };
    await failure(expectedCode, () => generateCandidate(input, dependencies), 0);
    assert.equal(calls, 0);
  }
  for (const evidence of [new Date(), [], new Request("https://example.com")]) await failure(GENERATION_FAILURE_CODES.INVALID_EVIDENCE, () => generateCandidate({ evidence, seed }, { provider() { throw new Error("must not run"); } }), 0);
});

test("request reflection traps are contained before provider invocation", async () => {
  for (const trap of ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"]) {
    let calls = 0;
    const input = new Proxy({ evidence: localEvidence(), seed }, { [trap]() { throw new Error(`${trap} must be contained`); } });
    await failure(GENERATION_FAILURE_CODES.INVALID_REQUEST, () => generateCandidate(input, { provider() { calls += 1; return localCandidate(); } }), 0);
    assert.equal(calls, 0, trap);
  }
});

test("dependency reflection traps are contained before provider invocation", async () => {
  for (const trap of ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"]) {
    let calls = 0;
    const dependencies = new Proxy({ provider() { calls += 1; return localCandidate(); } }, { [trap]() { throw new Error(`${trap} must be contained`); } });
    await failure(GENERATION_FAILURE_CODES.INVALID_REQUEST, () => generateCandidate({ evidence: localEvidence(), seed }, dependencies), 0);
    assert.equal(calls, 0, trap);
  }
});

test("request Evidence has explicit aggregate UTF-8 byte and nesting bounds before invocation", async () => {
  assert.equal(MAX_GENERATION_REQUEST_BYTES, 64 * 1024); assert.equal(MAX_GENERATION_VALUE_DEPTH, 32);
  let calls = 0;
  const aggregate = localEvidence();
  aggregate.priors.region = "é".repeat(Math.floor(MAX_GENERATION_REQUEST_BYTES / 4));
  aggregate.priors.situation = "é".repeat(Math.floor(MAX_GENERATION_REQUEST_BYTES / 4));
  const aggregateFailure = await failure(GENERATION_FAILURE_CODES.INVALID_EVIDENCE, () => generateCandidate({ evidence: aggregate, seed }, { provider() { calls += 1; return localCandidate(); } }), 0);
  assert.ok(aggregateFailure.issues.some(({ rule }) => rule === "max_bytes"));
  const deep = localEvidence(); let cursor = deep.priors; for (let index = 0; index <= MAX_GENERATION_VALUE_DEPTH; index += 1) { cursor.nested = {}; cursor = cursor.nested; }
  const depthFailure = await failure(GENERATION_FAILURE_CODES.INVALID_EVIDENCE, () => generateCandidate({ evidence: deep, seed }, { provider() { calls += 1; return localCandidate(); } }), 0);
  assert.ok(depthFailure.issues.some(({ rule }) => rule === "max_depth"));
  assert.equal(calls, 0);
});

test("provider receives an isolated snapshot and caller mutation cannot alter it", async () => {
  const evidence = localEvidence(); let release; const pause = new Promise((resolve) => { release = resolve; }); let observed;
  const pending = generateCandidate({ evidence, seed }, { async provider(request) { await pause; observed = request; return localCandidate(); } });
  evidence.priors.region = "mutated"; release(); await pending;
  assert.equal(observed.evidence.priors.region, "Blue Water Area");
});

test("sync and async provider failures count once, contain details, and never retry", async () => {
  for (const provider of [() => { throw new Error("secret raw output"); }, async () => { throw { get message() { throw new Error("getter"); } }; }]) {
    let calls = 0; await failure(GENERATION_FAILURE_CODES.PROVIDER_FAILURE, () => generateCandidate({ evidence: localEvidence(), seed }, { provider: async (input) => { calls += 1; return provider(input); } }), 1);
    assert.equal(calls, 1);
  }
});

test("non-direct, multiple, wrapped, textual, fenced, and unsafe output rejects without extraction", async () => {
  const cyclic = {}; cyclic.self = cyclic;
  const accessor = {}; Object.defineProperty(accessor, "title", { enumerable: true, get() { throw new Error("must not run"); } });
  const fixtures = [undefined, null, true, 1, "plain text", "```json\n{}\n```", [], [localCandidate()], [localCandidate(), localCandidate()], { candidate: localCandidate() }, { response: JSON.stringify(localCandidate()) }, cyclic, accessor, new Date()];
  for (const output of fixtures) await failure(GENERATION_FAILURE_CODES.INVALID_OUTPUT, () => generateCandidate({ evidence: localEvidence(), seed }, { provider: () => output }), 1);
  const hidden = localCandidate(); Object.defineProperty(hidden, "legacy_raw_text", { value: "secret provider prose" });
  await failure(GENERATION_FAILURE_CODES.INVALID_OUTPUT, () => generateCandidate({ evidence: localEvidence(), seed }, { provider: () => hidden }), 1);
});

test("hidden dependency capabilities reject before provider invocation", async () => {
  let calls = 0; const dependencies = { provider() { calls += 1; return localCandidate(); } };
  Object.defineProperty(dependencies, "fetch", { value: globalThis.fetch });
  await failure(GENERATION_FAILURE_CODES.INVALID_REQUEST, () => generateCandidate({ evidence: localEvidence(), seed }, dependencies), 0);
  assert.equal(calls, 0);
});

test("offline adapter imports only the authoritative contract and exposes no network or production binding", async () => {
  const source = await readFile(fileURLToPath(new URL("./generation.mjs", import.meta.url)), "utf8");
  const imports = [...source.matchAll(/^import[\s\S]*?from\s+["']([^"']+)["'];$/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["./brief-contracts.mjs"]);
  assert.doesNotMatch(source, /\b(?:fetch|wrangler|cloudflare|workers ai|env\.AI)\b/i);
});

test("missing, unknown, nested-extra, mistyped, coerced, invented, repaired, and stale-reference output rejects", async () => {
  const fixtures = [];
  let value = localCandidate(); delete value.plan; fixtures.push(value);
  value = localCandidate(); value.extra = true; fixtures.push(value);
  value = localCandidate(); value.before_after.extra = true; fixtures.push(value);
  value = localCandidate(); value.change_level.steps_changed = "2"; fixtures.push(value);
  value = localCandidate(); value.title = " padded "; fixtures.push(value);
  value = localCandidate(); value.plan = ""; fixtures.push(value);
  value = localCandidate(); value.candidate_ref = "b".repeat(64); fixtures.push(value);
  value = localCandidate(); value.axes = { audience: "legacy" }; fixtures.push(value);
  for (const output of fixtures) await failure(GENERATION_FAILURE_CODES.INVALID_OUTPUT, () => generateCandidate({ evidence: localEvidence(), seed }, { provider: () => output }), 1);
});

test("oversized output is bounded and classified before Candidate validation", async () => {
  assert.equal(MAX_GENERATION_RESULT_BYTES, 64 * 1024);
  const output = localCandidate(); output.title = "x".repeat(MAX_GENERATION_RESULT_BYTES + 1);
  await failure(GENERATION_FAILURE_CODES.OUTPUT_TOO_LARGE, () => generateCandidate({ evidence: localEvidence(), seed }, { provider: () => output }), 1);
});

test("deep provider output is rejected after exactly one invocation without stack overflow", async () => {
  const output = localCandidate(); let cursor = output; for (let index = 0; index <= MAX_GENERATION_VALUE_DEPTH; index += 1) { cursor.nested = {}; cursor = cursor.nested; }
  let calls = 0;
  const depthFailure = await failure(GENERATION_FAILURE_CODES.INVALID_OUTPUT, () => generateCandidate({ evidence: localEvidence(), seed }, { provider() { calls += 1; return output; } }), 1);
  assert.ok(depthFailure.issues.some(({ rule }) => rule === "max_depth"));
  assert.equal(calls, 1);
});

test("classification preserves direct fields and derives no reference for invalid values", () => {
  const candidate = localCandidate(); const result = classifyGenerationResult(candidate);
  assert.deepEqual(result.candidate, candidate);
  assert.throws(() => classifyGenerationResult({ ...candidate, candidate_ref: "c".repeat(64) }), (error) => error.code === GENERATION_FAILURE_CODES.INVALID_OUTPUT && error.model_calls === 1);
});
