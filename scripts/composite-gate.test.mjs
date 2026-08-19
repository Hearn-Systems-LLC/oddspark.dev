import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { COMPOSITE_GATE_CODES, runCompositeGate } from "./composite-gate.mjs";
import { deriveIdentity, loadCorpus } from "./semantic-corpus.mjs";

const clone = structuredClone;
const corpusDirectory = fileURLToPath(new URL("../semantic/voice/v1/", import.meta.url));
const pendingCorpus = await loadCorpus(corpusDirectory);

function approvedCorpus() {
  const value = clone(pendingCorpus);
  const identity = deriveIdentity(value);
  value.approval = { schema_version: 1, status: "approved", owner: "Justin", corpus_version: "voice-v1", hashes: identity.hashes, semantic_identity: identity.semantic_identity, approved_at: "2026-08-18T12:00:00Z" };
  return value;
}

const candidate = () => ({
  version: 1, mode: "local", title: "A calmer inquiry handoff", plan: "Route repeated questions into one reviewed response.",
  why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." }, what_gets_better: "The team starts with a useful draft instead of an empty page.",
  before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." },
  change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true },
  stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] },
  invitation: "We can inspect this Spark together, including whether it is not worth changing.", grounded_numbers: [],
});
const evidence = () => ({ version: 1, mode: "local", priors: { region: "Blue Water Area", season: "summer", date: "current", situation: "repeated inquiries", capability_bundle: ["software"] } });
const input = () => ({ evidence_context: { attempt_id: "attempt-1", evidence: evidence(), rubric_version: "voice-v1" }, candidate: candidate() });
const judge = () => ({ role: "STRUCT-JUDGE", provider: "offline-fixture", resolved_model: "fixture-judge-v1", qualification_ref: "a".repeat(64), status: "active", outcome: "GO" });
function verdict(candidate_ref, pass = true) {
  return { candidate_ref, verdict: { pass, gates: Array.from({ length: 9 }, (_, index) => ({ gate: index + 1, pass, reason: `provider secret ${index}` })), tone: { pass, reason: "provider secret tone" }, claims: { pass, reason: "provider secret claims" } } };
}
const dependencies = (provider) => ({ judge_provider: provider, judge: judge(), rubric: approvedCorpus() });

test("local success creates one frozen attempt, calls one bound judge, and redacts reasons", async () => {
  const approved = approvedCorpus(); const resolvedJudge = judge();
  let calls = 0; let request;
  const result = await runCompositeGate(input(), { judge_provider: async (value) => { calls += 1; request = value; return verdict(value.candidate_ref); }, judge: resolvedJudge, rubric: approved });
  assert.equal(result.code, COMPOSITE_GATE_CODES.PASSED); assert.equal(calls, 1); assert.equal(result.judge_calls, 1);
  assert.deepEqual(Object.keys(request), ["candidate", "evidence", "grounding_report", "rubric", "candidate_ref", "judge"]);
  assert.ok(Object.isFrozen(request) && Object.isFrozen(request.candidate) && Object.isFrozen(result.attempt_context));
  assert.deepEqual(request.candidate, result.attempt_context.candidate);
  assert.deepEqual(request.evidence, result.attempt_context.evidence);
  assert.deepEqual(request.grounding_report, result.attempt_context.grounding_report);
  assert.equal(JSON.stringify(request.rubric), JSON.stringify(approved.rubric));
  assert.equal(JSON.stringify(request.judge), JSON.stringify(resolvedJudge));
  assert.equal(request.candidate_ref, result.attempt_context.candidate_ref);
  assert.equal(JSON.stringify(result).includes("provider secret"), false);
});

test("domain success derives exact complete grounding while unsupported claims reject locally", async () => {
  const value = input();
  value.candidate.mode = "domain";
  value.candidate.why_fits = { text: "The site emphasizes quick response.", breadcrumb: "Replies arrive within 24 hours" };
  value.candidate.grounded_numbers = ["24"];
  const claims = [
    value.candidate.title, value.candidate.plan, value.candidate.why_fits.text, value.candidate.why_fits.breadcrumb,
    value.candidate.what_gets_better, value.candidate.before_after.before, value.candidate.before_after.after,
    value.candidate.change_level.time_range, ...value.candidate.stays_same.tools, ...value.candidate.stays_same.authority,
    ...value.candidate.stays_same.steps, value.candidate.invitation, ...value.candidate.grounded_numbers,
  ];
  value.evidence_context.evidence = { version: 1, mode: "domain", vertical: "services", clarity: "clear", capabilities: ["inquiry routing"], channels: [], observation: { source_id: "home", url: "https://example.com", text: claims.join(" | ") }, scanned_urls: ["https://example.com"] };
  let calls = 0; let request;
  const passed = await runCompositeGate(value, dependencies((captured) => { calls += 1; request = captured; return verdict(captured.candidate_ref); }));
  assert.equal(passed.code, COMPOSITE_GATE_CODES.PASSED);
  assert.equal(calls, 1);
  assert.equal(passed.attempt_context.grounding_report.entries.length, 13);
  assert.deepEqual(passed.attempt_context.grounding_report.entries.map(({ claim_ref }) => claim_ref), [
    "brief.title", "brief.plan", "brief.why_fits.text", "brief.why_fits.breadcrumb", "brief.what_gets_better",
    "brief.before_after.before", "brief.before_after.after", "brief.change_level.time_range", "brief.stays_same.tools[0]",
    "brief.stays_same.authority[0]", "brief.stays_same.steps[0]", "brief.invitation", "brief.grounded_numbers[0]",
  ]);
  assert.ok(request.grounding_report.entries.every((entry) => entry.exact_match && entry.pii_status === "pass"));
  assert.ok(request.grounding_report.entries.slice(0, -1).every((entry) => entry.number_status === "not_applicable"));
  assert.equal(request.grounding_report.entries.at(-1).number_status, "pass");
  assert.equal(request.grounding_report.evidence_ref, passed.attempt_context.grounding_report.evidence_ref);
  const unsupported = clone(value); unsupported.evidence_context.evidence.observation.text = unsupported.evidence_context.evidence.observation.text.replace(unsupported.candidate.plan, "missing");
  let rejectedCalls = 0;
  const rejected = await runCompositeGate(unsupported, dependencies(() => { rejectedCalls += 1; }));
  assert.equal(rejected.code, COMPOSITE_GATE_CODES.LOCAL_REJECTED); assert.equal(rejectedCalls, 0);
});

test("local schema, mode, name, and snapshot failures never call the judge", async () => {
  const cases = [
    () => { const value = input(); value.candidate.extra = true; return value; },
    () => { const value = input(); value.candidate.mode = "domain"; return value; },
    () => { const value = input(); value.candidate.plan = "Ask Alice Smith for approval."; return value; },
    () => { const value = input(); value.candidate.plan = "Ask JORDAN for approval."; return value; },
    () => { const value = input(); value.candidate.plan = "Save 2 hours."; return value; },
    () => { const value = input(); value.candidate.why_fits.breadcrumb = "Local breadcrumb"; return value; },
    () => { const value = input(); value.candidate.self = value.candidate; return value; },
    () => { const value = input(); Object.defineProperty(value.candidate, "trap", { enumerable: true, get() { throw new Error("must not run"); } }); return value; },
    () => { const value = input(); Object.defineProperty(value.candidate, "hidden", { value: true }); return value; },
    () => { const value = input(); Object.defineProperty(value.candidate, "__proto__", { value: { polluted: true }, enumerable: true }); return value; },
  ];
  for (const make of cases) {
    let calls = 0; const result = await runCompositeGate(make(), dependencies(() => { calls += 1; }));
    assert.equal(result.code, COMPOSITE_GATE_CODES.LOCAL_REJECTED); assert.equal(calls, 0);
  }
});

test("pending corpus and inactive, NO-GO, stale, or malformed descriptors remain unqualified", async () => {
  const variants = [
    { ...judge(), status: "inactive" }, { ...judge(), outcome: "NO-GO" }, { ...judge(), qualification_ref: "bad" }, { ...judge(), extra: true },
  ];
  for (const descriptor of variants) {
    let calls = 0; const result = await runCompositeGate(input(), { judge_provider: () => { calls += 1; }, judge: descriptor, rubric: approvedCorpus() });
    assert.equal(result.code, COMPOSITE_GATE_CODES.JUDGE_UNQUALIFIED); assert.equal(calls, 0);
  }
  const result = await runCompositeGate(input(), { judge_provider: () => assert.fail("must not call"), judge: judge(), rubric: clone(pendingCorpus) });
  assert.equal(result.code, COMPOSITE_GATE_CODES.JUDGE_UNQUALIFIED);
  const mismatch = input(); mismatch.evidence_context.rubric_version = "voice-v2";
  const mismatched = await runCompositeGate(mismatch, dependencies(() => assert.fail("must not call")));
  assert.equal(mismatched.code, COMPOSITE_GATE_CODES.JUDGE_UNQUALIFIED); assert.equal(mismatched.judge_calls, 0);
});

test("malformed dependency containers reject without reflection side effects or calls", async () => {
  const noCall = () => assert.fail("provider must not be called");
  const cases = [];
  cases.push({ judge_provider: 1, judge: judge(), rubric: approvedCorpus() });
  const accessor = { judge: judge(), rubric: approvedCorpus() };
  Object.defineProperty(accessor, "judge_provider", { enumerable: true, get() { throw new Error("getter invoked"); } }); cases.push(accessor);
  const hidden = { judge: judge(), rubric: approvedCorpus() };
  Object.defineProperty(hidden, "judge_provider", { value: noCall, enumerable: false }); cases.push(hidden);
  const symbolic = dependencies(noCall); symbolic[Symbol("hidden")] = true; cases.push(symbolic);
  cases.push(Object.assign(Object.create({ inherited: true }), dependencies(noCall)));
  cases.push(new Proxy(dependencies(noCall), { ownKeys() { throw new Error("reflection trap"); } }));
  for (const value of cases) {
    const result = await runCompositeGate(input(), value);
    assert.equal(result.code, COMPOSITE_GATE_CODES.JUDGE_UNQUALIFIED); assert.equal(result.judge_calls, 0);
  }
  const nullPrototype = Object.assign(Object.create(null), dependencies((request) => verdict(request.candidate_ref)));
  const accepted = await runCompositeGate(input(), nullPrototype);
  assert.equal(accepted.code, COMPOSITE_GATE_CODES.PASSED); assert.equal(accepted.judge_calls, 1);
});

test("provider failure, malformed result, reference mismatch, and semantic rejection are distinct and single-call", async () => {
  const thrown = await runCompositeGate(input(), dependencies(() => { throw new Error("sensitive provider detail"); }));
  assert.equal(thrown.code, COMPOSITE_GATE_CODES.JUDGE_PROVIDER_FAILED); assert.equal(JSON.stringify(thrown).includes("sensitive"), false);
  let asyncCalls = 0;
  const asyncRejected = await runCompositeGate(input(), dependencies(async () => { asyncCalls += 1; throw new Error("async sensitive detail"); }));
  assert.equal(asyncRejected.code, COMPOSITE_GATE_CODES.JUDGE_PROVIDER_FAILED); assert.equal(asyncRejected.judge_calls, 1); assert.equal(asyncCalls, 1);
  const malformed = await runCompositeGate(input(), dependencies(() => ({ response: "wrapped" })));
  assert.equal(malformed.code, COMPOSITE_GATE_CODES.JUDGE_CONTRACT_REJECTED);
  const mismatch = await runCompositeGate(input(), dependencies((request) => verdict("f".repeat(64))));
  assert.equal(mismatch.code, COMPOSITE_GATE_CODES.JUDGE_CONTRACT_REJECTED);
  const unordered = await runCompositeGate(input(), dependencies((request) => { const value = verdict(request.candidate_ref); value.verdict.gates.reverse(); return value; }));
  assert.equal(unordered.code, COMPOSITE_GATE_CODES.JUDGE_CONTRACT_REJECTED);
  const contradictory = await runCompositeGate(input(), dependencies((request) => { const value = verdict(request.candidate_ref); value.verdict.pass = false; return value; }));
  assert.equal(contradictory.code, COMPOSITE_GATE_CODES.JUDGE_CONTRACT_REJECTED);
  const rejected = await runCompositeGate(input(), dependencies((request) => verdict(request.candidate_ref, false)));
  assert.equal(rejected.code, COMPOSITE_GATE_CODES.SEMANTIC_REJECTED); assert.equal(rejected.judge_calls, 1);
  assert.equal(JSON.stringify(rejected).includes("provider secret"), false);
  const simultaneous = await runCompositeGate(input(), dependencies((request) => {
    const value = verdict(request.candidate_ref, false);
    value.verdict.gates.forEach((gate, index) => { gate.reason = `gate-secret-${index}`; });
    value.verdict.tone.reason = "tone-secret"; value.verdict.claims.reason = "claims-secret";
    return value;
  }));
  assert.equal(simultaneous.code, COMPOSITE_GATE_CODES.SEMANTIC_REJECTED);
  for (const secret of ["gate-secret", "tone-secret", "claims-secret"]) assert.equal(JSON.stringify(simultaneous).includes(secret), false);
});

test("input and provider mutations cannot alter the attempt or request", async () => {
  const original = input();
  const result = await runCompositeGate(original, dependencies(async (request) => {
    assert.throws(() => { request.candidate.title = "changed"; }, TypeError);
    original.candidate.title = "mutated outside";
    return verdict(request.candidate_ref);
  }));
  assert.equal(result.code, COMPOSITE_GATE_CODES.PASSED);
  assert.equal(result.attempt_context.candidate.title, "A calmer inquiry handoff");
});

test("array snapshots use descriptors and never invoke a hostile length get trap", async () => {
  const value = input(); let lengthReads = 0;
  value.candidate.grounded_numbers = new Proxy([], { get(target, property, receiver) { if (property === "length") lengthReads += 1; return Reflect.get(target, property, receiver); } });
  const result = await runCompositeGate(value, dependencies((request) => verdict(request.candidate_ref)));
  assert.equal(result.code, COMPOSITE_GATE_CODES.PASSED); assert.equal(result.judge_calls, 1); assert.equal(lengthReads, 0);
});
