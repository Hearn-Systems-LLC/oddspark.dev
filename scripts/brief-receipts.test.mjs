import assert from "node:assert/strict";
import test from "node:test";
import { CANDIDATE_SCHEMA_VERSION, deriveCandidateRef } from "./brief-contracts.mjs";
import {
  canonicalScopeKey, classifyCompatibleArtifact, defensiveFreeze, parseReceipt, parseRequestScope, validateCommitPayload,
} from "./brief-receipts.mjs";
import { LOCAL_RETENTION_MS } from "../src/pipeline/retention.mjs";

const brief = () => ({
  version: 1, mode: "local", title: "A calmer inquiry handoff", plan: "Route repeated questions into one reviewed response.",
  why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." }, what_gets_better: "The team starts with a useful draft instead of an empty page.",
  before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." },
  change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true },
  stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] },
  invitation: "We can inspect this Spark together and map a clear first step.", grounded_numbers: [],
});

function committedBrief() {
  const value = brief();
  return {
    artifact_version: 1, id: "00000000", request_scope: "local", brief: value, brief_schema_version: 1,
    policy_identity: "a".repeat(64), rubric_identity: "b".repeat(64),
    provenance: { attempt_id: "attempt-1", candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, value), evidence_ref: "c".repeat(64), grounding_report_version: 1, effective_mode: "local" },
  };
}

function legacy(kind = "local") {
  const value = {
    id: kind === "personalized" ? "p-0123456789abcdef" : "01234567", struck: "2026-08-18T12:00:00.000Z",
    idea: { headline: "A useful answer", premise: "Prepare the repeated answer.", question: "Which answer repeats?" },
    seed: { domain: "shop", lens: "answer", form: "inbox", friction: "delay", hash: "a".repeat(64), preimage: "seed" },
    window: { round: 1200, rounds: 100, seconds: 300 },
    entropy: { source: "drand", round: 1200, signature: "ab", randomness: "cd", verify: "https://example.com/drand" },
    solar: { source: "NOAA", band: "0.1-0.8nm", satellite: 18, flux: 0.000001, class: "C1.0", letter: "C", time_tag: "2026-08-18T12:00:00Z", verify: "https://example.com/solar" },
    model: "legacy-model", generated: true,
  };
  if (kind === "personalized") value.personalization = {
    version: 1, status: "personalized", domain: "example.com", scan_time: "2026-08-18T12:00:00Z", scanned_urls: ["https://example.com/"],
    vertical: "bakery", clarity: "clear", observation: { url: "https://example.com/", text: "Fresh bread." },
    what: { seeded: "inbox", adapted: "bakery inbox" }, profile_hash: "b".repeat(64), warning: null,
  };
  if (kind === "fallback") value.personalization = { version: 1, status: "unavailable", domain: "example.com", warning: "Context unavailable." };
  return value;
}

test("scope parsing is closed and canonical", () => {
  assert.equal(canonicalScopeKey({ kind: "local", round: 12 }), "local:12");
  assert.equal(canonicalScopeKey({ kind: "domain", round: 12, domain: "example.com" }), "domain:12:example.com");
  assert.equal(parseRequestScope({ kind: "local", round: 12, domain: "example.com" }), null);
});

test("unsupported envelopes and hostile inputs fail closed", () => {
  assert.equal(classifyCompatibleArtifact({ artifact_version: 2 }).status, "unsupported");
  assert.equal(classifyCompatibleArtifact({ artifact_version: 1 }).status, "miss");
  const cyclic = {}; cyclic.self = cyclic;
  assert.equal(classifyCompatibleArtifact(cyclic).status, "miss");
});

test("defensive values cannot mutate their source or result", () => {
  const source = { nested: { value: 1 } };
  const frozen = defensiveFreeze(source);
  source.nested.value = 2;
  assert.equal(frozen.nested.value, 1);
  assert.ok(Object.isFrozen(frozen.nested));
});

test("v1 CommittedBrief classification and receipt parsing are lossless, frozen, and scope-bound", () => {
  for (const mode of ["local", "domain"]) {
    const artifact = committedBrief();
    artifact.request_scope = mode;
    const scope = mode === "local" ? { kind: "local", round: 12 } : { kind: "domain", round: 12, domain: "example.com" };
    const wrongScope = mode === "local" ? { kind: "domain", round: 12, domain: "example.com" } : { kind: "local", round: 12 };
    const classified = classifyCompatibleArtifact(artifact);
    assert.equal(classified.status, "supported");
    assert.equal(classified.kind, "committed_brief");
    assert.deepEqual(classified.value, artifact);
    assert.ok(Object.isFrozen(classified) && Object.isFrozen(classified.value.brief.stays_same.tools));
    assert.throws(() => { classified.value.brief.title = "mutated"; }, TypeError);

    const commit = validateCommitPayload({ scope, owner: "owner-1", artifact });
    assert.deepEqual(commit.artifact, artifact);
    assert.equal(validateCommitPayload({ scope: wrongScope, owner: "owner-1", artifact }), null);

    const receipt = parseReceipt({ status: "committed", scope, artifact, artifact_kind: "committed_brief", committed_at: 123 }, scope);
    assert.deepEqual(receipt.artifact, artifact);
    assert.ok(Object.isFrozen(receipt) && Object.isFrozen(receipt.artifact.provenance));
    if (mode === "local") assert.equal(receipt.expires_at, 123 + LOCAL_RETENTION_MS);
    assert.equal(parseReceipt({ status: "committed", scope, artifact, artifact_kind: "committed_brief", committed_at: 123 }, wrongScope), null);
  }
});

test("all legacy families are strict and bound to their request scope", () => {
  const cases = [
    [legacy(), "legacy_local", { kind: "local", round: 1200 }],
    [legacy("personalized"), "legacy_personalized", { kind: "domain", round: 1200, domain: "example.com" }],
    [legacy("fallback"), "legacy_fallback", { kind: "domain", round: 1200, domain: "example.com" }],
  ];
  for (const [artifact, kind, scope] of cases) {
    assert.equal(classifyCompatibleArtifact(artifact).kind, kind);
    assert.ok(validateCommitPayload({ scope, owner: "owner-1", artifact }));
    assert.equal(validateCommitPayload({ scope, owner: "bad owner", artifact }), null);
    assert.equal(validateCommitPayload({ scope, owner: "owner-1", artifact, extra: true }), null);
    assert.equal(parseReceipt({ status: "committed", scope, artifact, artifact_kind: kind, committed_at: 1 }, scope)?.artifact_kind, kind);
  }
  assert.equal(validateCommitPayload({ scope: { kind: "domain", round: 1200, domain: "example.com" }, owner: "owner", artifact: legacy() }), null);
  assert.equal(validateCommitPayload({ scope: { kind: "local", round: 1200 }, owner: "owner", artifact: legacy("fallback") }), null);
  assert.equal(validateCommitPayload({ scope: { kind: "domain", round: 1201, domain: "example.com" }, owner: "owner", artifact: legacy("personalized") }), null);
  assert.equal(validateCommitPayload({ scope: { kind: "domain", round: 1200, domain: "other.example" }, owner: "owner", artifact: legacy("personalized") }), null);
});

test("malformed legacy fields and receipts fail closed", () => {
  const mutations = [
    (v) => { v.model = 3; }, (v) => { v.window.round = -1; }, (v) => { v.window.seconds = 1.5; },
    (v) => { v.solar.satellite = -1; }, (v) => { v.solar.flux = Infinity; }, (v) => { v.extra = true; },
  ];
  for (const mutate of mutations) { const value = legacy(); mutate(value); assert.equal(classifyCompatibleArtifact(value).status, "miss"); }
  const personalized = legacy("personalized"); personalized.personalization.observation.extra = true;
  assert.equal(classifyCompatibleArtifact(personalized).status, "miss");
  const fallback = legacy("fallback"); delete fallback.personalization.warning;
  assert.equal(classifyCompatibleArtifact(fallback).status, "miss");
  const scope = { kind: "local", round: 1200 }; const artifact = legacy();
  for (const committed_at of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseReceipt({ status: "committed", scope, artifact, artifact_kind: "legacy_local", committed_at }, scope), null);
  }
  assert.equal(parseReceipt({ status: "committed", scope, artifact, artifact_kind: "legacy_local", committed_at: 1, extra: true }, scope), null);
});

test("local receipt expiry is exact and legacy migration derives only from committed time", () => {
  const scope = { kind: "local", round: 1200 }; const artifact = legacy();
  const base = { status: "committed", scope, artifact, artifact_kind: "legacy_local", committed_at: 1000 };
  const expected = 1000 + LOCAL_RETENTION_MS;
  assert.equal(parseReceipt(base, scope)?.expires_at, expected);
  assert.equal(parseReceipt({ ...base, expires_at: expected }, scope)?.expires_at, expected);
  for (const expires_at of [expected - 1, expected + 1, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseReceipt({ ...base, expires_at }, scope), null);
  }
  assert.equal(parseReceipt({ ...base, committed_at: Number.MAX_SAFE_INTEGER }, scope), null);
});
