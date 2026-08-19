import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CANDIDATE_SCHEMA_VERSION, GROUNDING_REPORT_VERSION, buildAttemptContext, deriveCandidateRef, deriveEvidenceRef } from "./brief-contracts.mjs";
import { approvalIdentity, catalogIdentity } from "./house-briefs.mjs";
import { runStrikeOrchestrator, STRIKE_CODES } from "./strike-orchestrator.mjs";

const read = async (file) => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
const SHA256_FOR_TEST = /^[a-f0-9]{64}$/;
const evidence = () => ({ version: 1, mode: "local", priors: { region: "Blue Water Area", season: "summer", date: "current", situation: "inquiries", capability_bundle: ["software"] } });
const candidate = {
  version: 1, mode: "local", title: "A calmer inquiry handoff", plan: "Route repeated questions into one reviewed response.",
  why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." }, what_gets_better: "The team starts with a useful draft instead of an empty page.",
  before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." },
  change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true },
  stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] },
  invitation: "We can inspect this Spark together, including whether it is not worth changing.", grounded_numbers: [],
};
const candidateRef = (value = candidate) => deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, value);
const passingGate = (request, overrides = {}) => ({
  ok: true, code: "passed", judge_calls: 1,
  attempt_context: buildAttemptContext({
    attempt_id: request.evidence_context.attempt_id, candidate: request.candidate, evidence: request.evidence_context.evidence,
    grounding_report: { version: GROUNDING_REPORT_VERSION, evidence_ref: deriveEvidenceRef(request.evidence_context.evidence), entries: [], pass: true },
    rubric_version: request.evidence_context.rubric_version, candidate_ref: candidateRef(request.candidate),
  }),
  ...overrides,
});
const input = (overrides = {}) => ({
  evidence: evidence(), evidence_calls: 0, rubric_version: "voice-v1", seed: "a".repeat(64),
  season_id: "summer", selection_key: "request-1", deadline_ms: 2_000_000_000_000, minimum_call_time_ms: 100,
  ...overrides,
});
const house = { catalog: {}, approval: {}, authorities: {} };
async function approvedHouse() {
  const catalog = await read("content/house-briefs/v1/catalog.json");
  const priors = await read("content/local-priors/v1/priors.json");
  const rubric = await read("semantic/voice/v1/rubric.json");
  const approval = { schema_version: 1, catalog_version: 1, status: "approved", approver: "Justin", content_hash: catalogIdentity(catalog), identity: null, approved_at: "2026-08-18T12:00:00.000Z" };
  approval.identity = approvalIdentity(approval);
  return { catalog, approval, authorities: { priors, rubric } };
}
const deps = (overrides = {}) => ({
  generate: async () => ({ candidate, candidate_ref: candidateRef(), model_calls: 1 }),
  gate: async (request) => passingGate(request),
  primary: { generation: {}, gate: {} }, fallback: { generation: {}, gate: {} }, house, coordinator: async () => ({ status: "committed" }), now: () => 0,
  ...overrides,
});

test("primary pass reserves and consumes one complete pair then coordinates a frozen source", async () => {
  let source;
  const output = await runStrikeOrchestrator(input(), deps({ coordinator: async (value) => { source = value; return { status: "committed" }; } }));
  assert.equal(output.code, STRIKE_CODES.ACCEPTED);
  assert.equal(output.model_calls, 2);
  assert.deepEqual(output.ledger.map(({ event }) => event), ["evidence_calls_recorded", "pair_reserved", "generation_completed", "candidate_accepted", "coordinator_confirmed"]);
  assert.equal(source.role, "primary");
  assert.ok(Object.isFrozen(source) && Object.isFrozen(output));
});

test("local rejection releases only the unused judge reservation and changes role between attempts", async () => {
  const roles = [];
  let calls = 0;
  const primaryGeneration = {}; const fallbackGeneration = {}; const primaryGate = {}; const fallbackGate = {};
  const primary = { generation: primaryGeneration, gate: primaryGate }; const fallback = { generation: fallbackGeneration, gate: fallbackGate };
  const output = await runStrikeOrchestrator(input(), deps({
    primary, fallback,
    generate: async (_request, role) => { roles.push(role); calls += 1; const value = { ...candidate, title: `${candidate.title} ${["one", "two", "three"][calls - 1]}` }; return { candidate: value, candidate_ref: candidateRef(value), model_calls: 1 }; },
    gate: async (request, role) => role === primaryGate
      ? { ok: false, code: "local_rejected", judge_calls: 0, issues: [{ rule: "local" }] }
      : passingGate(request),
  }));
  assert.equal(output.code, STRIKE_CODES.ACCEPTED);
  assert.equal(output.model_calls, 3);
  assert.equal(roles[0], primaryGeneration);
  assert.equal(roles[1], fallbackGeneration);
  assert.ok(output.ledger.some(({ event }) => event === "judge_reservation_released"));
});

test("E values impose the exact candidate ceiling", async () => {
  for (const [e, expected] of [[0, 3], [1, 2], [2, 2], [3, 1], [4, 1], [5, 0], [6, 0]]) {
    let generations = 0;
    const output = await runStrikeOrchestrator(input({ evidence_calls: e }), deps({
      generate: async () => { generations += 1; const value = { ...candidate, title: `${candidate.title} ${["one", "two", "three"][generations - 1]}` }; return { candidate: value, candidate_ref: candidateRef(value), model_calls: 1 }; },
      gate: async () => ({ ok: false, code: "semantic_rejected", judge_calls: 1, issues: [] }),
    }));
    assert.equal(generations, expected, `E=${e}`);
    assert.equal(output.model_calls, e + expected * 2, `E=${e}`);
  }
});

test("deadline admission is checked before a pair and again before judging", async () => {
  let nowCalls = 0; let gateCalls = 0;
  const output = await runStrikeOrchestrator(input({ deadline_ms: 250 }), deps({
    now: () => [0, 200][Math.min(nowCalls++, 1)],
    gate: async () => { gateCalls += 1; },
  }));
  assert.equal(gateCalls, 0);
  assert.equal(output.model_calls, 1);
  assert.ok(output.ledger.some(({ event }) => event === "judge_not_admitted"));
});

test("exhaustion selects only an exact approved deterministic house Brief", async () => {
  const output = await runStrikeOrchestrator(input({ evidence_calls: 6 }), deps({ house: await approvedHouse(), now: () => Date.parse("2026-08-18T13:00:00.000Z") }));
  assert.equal(output.code, STRIKE_CODES.HOUSE_ACCEPTED);
  assert.equal(output.source.kind, "house");
  assert.equal(output.model_calls, 6);
});

test("pending house authority and ambiguous coordinator outcomes fail closed", async () => {
  const unavailable = await runStrikeOrchestrator(input({ evidence_calls: 6 }), deps());
  assert.equal(unavailable.code, STRIKE_CODES.HOUSE_UNAVAILABLE);
  const uncertain = await runStrikeOrchestrator(input(), deps({ coordinator: async () => ({ status: "maybe", brief: candidate }) }));
  assert.equal(uncertain.code, STRIKE_CODES.COORDINATOR_UNCERTAIN);
  assert.equal(Object.hasOwn(uncertain, "source"), false);
  assert.equal(JSON.stringify(uncertain).includes("A useful draft"), false);
});

test("the module imports no network API and provider errors never escape", async () => {
  const source = await readFile(new URL("./strike-orchestrator.mjs", import.meta.url), "utf8");
  assert.equal(/\b(fetch|https?|WebSocket)\b/.test(source), false);
  const output = await runStrikeOrchestrator(input(), deps({ generate: async () => { throw new Error("provider secret"); } }));
  assert.equal(JSON.stringify(output).includes("provider secret"), false);
});

test("passing Gate claims are exact and substituted or contradictory attempts reject", async () => {
  const cases = [
    (request) => passingGate(request, { code: "semantic_rejected" }),
    (request) => passingGate(request, { judge_calls: 0 }),
    (request) => passingGate(request, { ok: false }),
    (request) => { const value = structuredClone(passingGate(request)); value.attempt_context.candidate.title = "Substituted title"; return value; },
    (request) => { const value = structuredClone(passingGate(request)); value.attempt_context.evidence.priors.season = "winter"; return value; },
    (request) => { const value = structuredClone(passingGate(request)); value.attempt_context.rubric_version = "voice-v2"; return value; },
    (request) => { const value = structuredClone(passingGate(request)); value.attempt_context.candidate_ref = "f".repeat(64); return value; },
  ];
  for (const gate of cases) {
    const output = await runStrikeOrchestrator(input(), deps({ gate, house: await approvedHouse(), now: () => Date.parse("2026-08-18T13:00:00.000Z") }));
    assert.notEqual(output.code, STRIKE_CODES.ACCEPTED);
    assert.ok(output.ledger.some(({ event }) => event === "gate_rejected"));
  }
});

test("canonical Candidate identity defeats claimed-ref spoofing and audits ordinary duplicates", async () => {
  let generation = 0;
  const canonical = candidateRef();
  const output = await runStrikeOrchestrator(input(), deps({
    house: await approvedHouse(), now: () => Date.parse("2026-08-18T13:00:00.000Z"),
    generate: async () => {
      generation += 1;
      return { candidate, candidate_ref: generation === 2 ? "f".repeat(64) : canonical, model_calls: 1 };
    },
    gate: async () => ({ ok: false, code: "semantic_rejected", judge_calls: 1, issues: [] }),
  }));
  assert.equal(generation, 3);
  assert.equal(output.code, STRIKE_CODES.HOUSE_ACCEPTED);
  const invalid = output.ledger.find(({ event, code }) => event === "generation_rejected" && code === "invalid_result");
  const duplicate = output.ledger.find(({ event }) => event === "candidate_duplicate");
  assert.equal(invalid.candidate_ref, canonical);
  assert.equal(duplicate.candidate_ref, canonical);
  assert.equal(output.ledger.filter(({ event }) => event === "gate_rejected").length, 1);
});

test("generation accounting distinguishes zero-call failure, default invocation, and malformed success", async () => {
  const errors = [Object.assign(new Error("local"), { model_calls: 0 }), new Error("invoked")];
  let attempt = 0;
  const output = await runStrikeOrchestrator(input(), deps({
    generate: async () => { const current = attempt++; if (current < 2) throw errors[current]; return { candidate, candidate_ref: candidateRef(), model_calls: 0 }; },
  }));
  assert.equal(output.model_calls, 1);
  assert.deepEqual(output.ledger.filter(({ event }) => event === "generation_rejected").map(({ invoked }) => invoked), [0, 1, 0]);
  assert.equal(output.ledger[0].event, "evidence_calls_recorded");
});

test("judge throws consume one call, bind the canonical ref, and permit fallback", async () => {
  let gates = 0;
  const output = await runStrikeOrchestrator(input(), deps({
    generate: async () => { const value = { ...candidate, title: `${candidate.title} ${gates ? "two" : "one"}` }; return { candidate: value, candidate_ref: candidateRef(value), model_calls: 1 }; },
    gate: async (request) => { gates += 1; if (gates === 1) throw new Error("judge secret"); return passingGate(request); },
  }));
  assert.equal(output.code, STRIKE_CODES.ACCEPTED);
  assert.equal(output.model_calls, 4);
  const rejected = output.ledger.find(({ event }) => event === "judge_rejected");
  assert.match(rejected.candidate_ref, SHA256_FOR_TEST);
  assert.equal(JSON.stringify(output).includes("judge secret"), false);
});

test("one frozen Evidence snapshot is reused across attempts despite caller mutation", async () => {
  const original = input(); const seen = [];
  const output = await runStrikeOrchestrator(original, deps({
    generate: async (request) => { seen.push(request.evidence); original.evidence.priors.season = "winter"; const value = { ...candidate, title: `${candidate.title} ${seen.length === 1 ? "one" : "two"}` }; return { candidate: value, candidate_ref: candidateRef(value), model_calls: 1 }; },
    gate: async (request) => seen.length === 1 ? { ok: false, code: "local_rejected", judge_calls: 0, issues: [] } : passingGate(request),
  }));
  assert.equal(output.code, STRIKE_CODES.ACCEPTED);
  assert.equal(seen[0], seen[1]);
  assert.ok(Object.isFrozen(seen[0]));
  assert.equal(seen[1].priors.season, "summer");
});

test("clock failures and post-Gate deadline exhaustion fail closed without coordination", async () => {
  for (const now of [() => { throw new Error("clock"); }, () => Number.NaN]) {
    const output = await runStrikeOrchestrator(input(), deps({ now }));
    assert.ok(output.ledger.some(({ event, phase }) => event === "clock_failure" && phase === "pair_admission"));
  }
  let ticks = 0; let coordinated = 0;
  const exhausted = await runStrikeOrchestrator(input({ deadline_ms: 1_000, minimum_call_time_ms: 1 }), deps({
    now: () => [0, 0, 1_000][Math.min(ticks++, 2)], coordinator: async () => { coordinated += 1; return { status: "committed" }; },
  }));
  assert.equal(exhausted.code, STRIKE_CODES.DEADLINE_EXCEEDED);
  assert.equal(coordinated, 0);
  assert.ok(exhausted.ledger.some(({ event, phase }) => event === "deadline_exhausted" && phase === "pre_coordinator"));
  for (const bad of [-1, Number.MAX_SAFE_INTEGER + 1]) assert.equal((await runStrikeOrchestrator(input({ deadline_ms: bad }), deps())).code, STRIKE_CODES.INVALID_REQUEST);
  assert.equal((await runStrikeOrchestrator(input({ minimum_call_time_ms: Number.MAX_SAFE_INTEGER }), deps())).code, STRIKE_CODES.INVALID_REQUEST);
});

test("coordinator confirmations are closed, contained, and sanitized", async () => {
  const resolved = await runStrikeOrchestrator(input(), deps({ coordinator: async () => ({ status: "resolved" }) }));
  assert.deepEqual(Object.keys(resolved.coordinator), ["status"]);
  assert.equal(resolved.coordinator.status, "resolved");
  const variants = [
    async () => { throw new Error("secret"); },
    async () => ({ status: "committed", extra: "leak" }),
    async () => new Proxy({}, { getPrototypeOf() { throw new Error("trap"); } }),
    async () => ({ get status() { throw new Error("getter"); } }),
    async () => "committed",
  ];
  for (const coordinator of variants) {
    const output = await runStrikeOrchestrator(input(), deps({ coordinator }));
    assert.equal(output.code, STRIKE_CODES.COORDINATOR_UNCERTAIN);
    assert.equal(JSON.stringify(output).includes("secret"), false);
  }
});

test("hostile issues and every invalid house authority family remain contained", async () => {
  const issues = new Proxy([], { getOwnPropertyDescriptor() { throw new Error("issue trap"); } });
  const issueOutput = await runStrikeOrchestrator(input(), deps({ gate: async () => ({ ok: false, code: "local_rejected", judge_calls: 0, issues }) }));
  assert.equal(JSON.stringify(issueOutput).includes("issue trap"), false);
  const valid = await approvedHouse();
  const cases = [
    { ...valid, approval: { ...valid.approval, approved_at: "2027-08-18T12:00:00.000Z" } },
    { ...valid, approval: { ...valid.approval, content_hash: "f".repeat(64) } },
    { ...valid, catalog: { ...valid.catalog, extra: true } },
    { ...valid, authorities: {} },
  ];
  for (const value of cases) assert.equal((await runStrikeOrchestrator(input({ evidence_calls: 6 }), deps({ house: value, now: () => Date.parse("2026-08-18T13:00:00.000Z") }))).code, STRIKE_CODES.HOUSE_UNAVAILABLE);
  for (const overrides of [{ season_id: "monsoon" }, { selection_key: "TODO" }]) assert.equal((await runStrikeOrchestrator(input({ evidence_calls: 6, ...overrides }), deps({ house: valid, now: () => Date.parse("2026-08-18T13:00:00.000Z") }))).code, STRIKE_CODES.HOUSE_UNAVAILABLE);
});
