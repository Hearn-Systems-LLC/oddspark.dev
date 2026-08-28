import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import { acquireLock, appendAttempt, atomicWrite, releaseLock, STALE_LOCK_MS } from "./governance.mjs";
import { canonicalBytes, CURRENT_ASSEMBLY_IDENTITY, deriveFullRequestRef, PREDICATES, providerTimeoutFor, sha256, validatePlan } from "./contract.mjs";
import { preflight, runLive } from "./run.mjs";
import { createUnapprovedPlan, writeUnapprovedPlan } from "./plan-creator.mjs";
import { createApproval, readGovernedPlan, runCli as runApprovalCli, writeApproval } from "./approval-creator.mjs";
import { verifyPublication } from "./publication.mjs";
import { verifyEvidenceBytes } from "./verifier.mjs";
import { boundedProviderCall, PROVIDER_ERROR_FIELD_MAX_LENGTH, providerErrorDetail } from "./provider-call.mjs";
import { attemptsFrom, failureOutcome, qualificationCoordinator } from "./adapter-evidence.mjs";
import { ARTIFACT_VERSION, buildCommittedBrief, CANDIDATE_SCHEMA_VERSION, canonicalJson, deriveCandidateRef as derivePipelineCandidateRef } from "../../src/pipeline/contracts.mjs";
import { ACTIVATION_ATTESTATION_DOMAIN, applicableActivationGates } from "../../src/pipeline/release-decision.mjs";
import { parseReceipt } from "../../src/pipeline/receipts.mjs";
import adapterWorker from "./worker.mjs";

const planBytes = await readFile(new URL("./plans/story-1-19-local-full-request-5ef8222e-unapproved.plan.json", import.meta.url));
const plan = JSON.parse(planBytes);
const currentPlan = createUnapprovedPlan({
  output: "synthetic.plan.json", assembly_ref: CURRENT_ASSEMBLY_IDENTITY,
  generation_ref: "1".repeat(64), generation_role_ref: "2".repeat(64), judge_ref: "3".repeat(64),
  run_id: "22222222-2222-4222-8222-222222222222", strike_timestamp: "2026-08-26T15:00:00.000Z",
  route_ceiling_ms: "120000", commit_reserve_ms: "1000", provider_timeout_ms: "19833",
  call_cap: "6", attempt_cap: "3", maximum_cost_usd: "0.06",
});
const currentPlanBytes = canonicalBytes(currentPlan);
const diagnosticPlan = {
  ...structuredClone(currentPlan), schema_version: "oddspark.local-full-request-diagnostic-plan/v1",
  run_id: "11111111-1111-4111-8111-111111111111",
  purpose: { kind: "provider_error_capture", generation_calls: 1, request_shape: "frozen_production_generation", max_tokens: 2048 },
  limits: { route_ceiling_ms: 30000, commit_reserve_ms: 1000, provider_timeout_ms: 29000, call_cap: 1, attempt_cap: 1, maximum_cost_usd: 0.01 },
  schedule: [{ attempt: 1, role: "diagnostic", generation_slots: [1], judge_slots: [] }],
};
const diagnosticPlanBytes = Buffer.from(`${JSON.stringify(diagnosticPlan)}\n`);
const started = "2026-08-24T20:00:01.000Z";
const approval = {
  schema_version: "oddspark.local-full-request-approval/v1", run_id: plan.run_id,
  plan_sha256: sha256(planBytes), approved_by: "Justin", approved_at: "2026-08-24T20:00:00.000Z",
  expires_at: "2026-08-24T21:00:00.000Z", decision: "approved",
};
const approvalBytes = Buffer.from(`${JSON.stringify(approval)}\n`);
const activationKeys = generateKeyPairSync("ed25519");
function qualificationActivation(currentPlan) {
  const manifest = { version: 2, deployed_source_identity: currentPlan.authorities.assembly_identity, generation_ref: currentPlan.authorities.generation_ref, judge_ref: currentPlan.authorities.judge_ref, local: { enabled: true, full_request_ref: "0".repeat(64) }, domain: { enabled: false, evidence_ref: null, full_request_ref: null }, house_catalog_ref: currentPlan.authorities.house_catalog_ref, receiver_ref: null, receipt_claim_ref: null, outcome: "active" };
  const payload = { version: 1, key_id: "qualification-test", issued_at: "2026-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", manifest, gates: applicableActivationGates(manifest).map((gate) => ({ ...gate, status: "pass", approval_expires_at: "2030-01-01T00:00:00.000Z" })) };
  return { QUALIFICATION_ACTIVATION_SNAPSHOT: { payload, signature: sign(null, Buffer.from(`${ACTIVATION_ATTESTATION_DOMAIN}${canonicalJson(payload)}`), activationKeys.privateKey).toString("base64url") }, QUALIFICATION_ACTIVATION_TRUST_KEYS: { "qualification-test": new Uint8Array(activationKeys.publicKey.export({ format: "der", type: "spki" })) } };
}
const call = (stage, candidateRef, input = 100, output = 50) => ({
  stage, calls: 1, candidate_ref: candidateRef, started_at: started, finished_at: "2026-08-24T20:00:01.100Z",
  latency_ms: 100, timeout_ms: plan.limits.provider_timeout_ms, request_sha256: "a".repeat(64), response_sha256: "b".repeat(64), success: true,
  usage: { input_tokens: input, output_tokens: output }, cost_usd: input * plan.pricing.input_usd_per_token + output * plan.pricing.output_usd_per_token,
});
function baseEvidence() {
  const candidateRef = "c".repeat(64); const generation = call("generation", candidateRef); const judge = call("judge", candidateRef);
  return {
    schema_version: "oddspark.local-full-request-evidence/v1", plan_sha256: sha256(planBytes), approval_sha256: sha256(approvalBytes),
    authorities: structuredClone(plan.authorities),
    run: { id: plan.run_id, started_at: started, finished_at: "2026-08-24T20:00:02.000Z", elapsed_ms: 1000, calls_started: 2, cost_usd: generation.cost_usd + judge.cost_usd, remaining_before_commit_ms: 2000, commit_reserve_observed: true, terminal: true },
    attempts: [{ sequence: 1, candidate_ref: candidateRef, generation, deterministic: { pass: true }, judge, external_retries: 0, terminal: "accepted" }],
    strike: { code: "accepted", model_calls: 2, ledger: [{ event: "evidence_calls_recorded", count: 0 }, { event: "pair_reserved", attempt: 1 }, { event: "generation_completed", attempt: 1, candidate_ref: candidateRef }, { event: "candidate_accepted", attempt: 1, candidate_ref: candidateRef }] },
    outcome: { source: "candidate", code: "accepted" },
    commit: { confirmed: true, coordinator_status: "committed", receipt_sha256: "d".repeat(64), artifact_sha256: "e".repeat(64) },
    render: { completed: true, sha256: "f".repeat(64), bytes: 1234 },
    content_hashes: { priors: "1".repeat(64), priors_approval_identity: plan.authorities.priors_ref, house: "2".repeat(64), corpus: "3".repeat(64) },
    predicate_results: [], full_request_ref: null,
  };
}
function closeEvidence(value = baseEvidence()) {
  const first = verifyEvidenceBytes(Buffer.from(JSON.stringify(value)), { planBytes, approvalBytes });
  value.predicate_results = first.predicate_results;
  value.full_request_ref = deriveFullRequestRef(value);
  return value;
}
const verify = (evidence) => verifyEvidenceBytes(Buffer.from(JSON.stringify(evidence)), { planBytes, approvalBytes });

test("unapproved plan is closed, finite, and carries no execution authority", () => {
  assert.equal(validatePlan(plan), true); assert.equal(plan.limits.route_ceiling_ms, 120000); assert.equal(plan.limits.commit_reserve_ms, 1000); assert.equal(plan.limits.provider_timeout_ms, providerTimeoutFor(plan.limits)); assert.equal(plan.approval, null); assert.equal(plan.execution, null); assert.equal(plan.allowance_consumed, false);
});
test("adapter identity is derived from the independently verified runtime assembly", async () => {
  const response = await adapterWorker.fetch(new Request("http://127.0.0.1/health", { headers: { "x-qualification-authority": "authority" } }), { AUTHORITY_SHA256: "authority" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, assembly_identity: CURRENT_ASSEMBLY_IDENTITY, inference_calls: 0 });
  assert.equal(currentPlan.authorities.assembly_identity, CURRENT_ASSEMBLY_IDENTITY);
  const workerSource = await readFile(new URL("./worker.mjs", import.meta.url), "utf8");
  assert.match(workerSource, /runtimeAssembly\.assembly_identity_sha256/);
  assert.doesNotMatch(workerSource, /const ASSEMBLY_IDENTITY = "[a-f0-9]{64}"/);
});
test("governed approval creation binds exact canonical plan bytes and owner metadata", () => {
  const input = { planBytes: currentPlanBytes, plan_sha256: sha256(currentPlanBytes), run_id: currentPlan.run_id, approved_by: "Justin", approved_at: "2026-08-26T20:00:00.000Z", expires_at: "2026-08-26T21:00:00.000Z", decision: "approved" };
  const created = createApproval(input);
  assert.deepEqual(Object.keys(created).sort(), ["approved_at", "approved_by", "decision", "expires_at", "plan_sha256", "run_id", "schema_version"]);
  assert.equal(created.plan_sha256, sha256(currentPlanBytes));
  assert.equal(created.run_id, currentPlan.run_id);
  for (const bad of ["2026-08-26T20:00:00Z", "not-a-time", "2026-08-26T20:00:00.000+00:00"]) {
    assert.throws(() => createApproval({ ...input, approved_at: bad }), /canonical ISO-8601/);
  }
  assert.throws(() => createApproval({ ...input, run_id: "11111111-1111-4111-8111-111111111111" }), /run ID/);
  assert.throws(() => createApproval({ ...input, plan_sha256: "0".repeat(64) }), /SHA-256/);
  assert.throws(() => createApproval({ ...input, approved_by: " Justin" }), /owner metadata/);
  assert.throws(() => createApproval({ ...input, extra: true }), /closed approval inputs/);
  assert.throws(() => createApproval({ ...input, decision: "denied" }), /exactly approved/);
});
test("approval CLI is traversal-safe, noninteractive, refuse-overwrite, and provider-free", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-approval-"));
  const planName = "reviewed.plan.json"; const outputName = "reviewed-approval.approval.json";
  await writeFile(path.join(directory, planName), currentPlanBytes, { flag: "wx" });
  const args = ["--plan", planName, "--output", outputName, "--plan-sha256", sha256(currentPlanBytes), "--run-id", currentPlan.run_id, "--approved-by", "Justin", "--approved-at", "2026-08-26T20:00:00.000Z", "--expires-at", "2026-08-26T21:00:00.000Z", "--decision", "approved"];
  await runApprovalCli(args, { directory });
  const retained = await readFile(path.join(directory, outputName));
  assert.equal(retained.equals(canonicalBytes(JSON.parse(retained))), true);
  await assert.rejects(runApprovalCli(args, { directory }), /EEXIST/);
  await assert.rejects(readGovernedPlan("../reviewed.plan.json", { directory }), /unsafe/);
  await assert.rejects(writeApproval(JSON.parse(retained), "../escape.approval.json", { directory }), /unsafe/);
  await assert.rejects(runApprovalCli([...args, "--extra", "field"], { directory }), /all and only/);
  const source = await readFile(new URL("./approval-creator.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|AI\.run|start-adapter|worker\.mjs|spawn\s*\(|exec(?:File)?\s*\(/);
  assert.doesNotMatch(source, /process\.stdin|isatty/);
});
test("one-call diagnostic plan is closed, unapproved, and cannot drift the frozen generation request", () => {
  assert.equal(validatePlan(diagnosticPlan), true);
  assert.deepEqual(diagnosticPlan.purpose, { kind: "provider_error_capture", generation_calls: 1, request_shape: "frozen_production_generation", max_tokens: 2048 });
  assert.equal(diagnosticPlan.limits.call_cap, 1); assert.equal(diagnosticPlan.limits.attempt_cap, 1); assert.equal(diagnosticPlan.limits.maximum_cost_usd, 0.01);
  assert.deepEqual(diagnosticPlan.schedule, [{ attempt: 1, role: "diagnostic", generation_slots: [1], judge_slots: [] }]);
  assert.equal(diagnosticPlan.approval, null); assert.equal(diagnosticPlan.execution, null); assert.equal(diagnosticPlan.allowance_consumed, false);
});
test("provider errors are bounded, while current inactive-domain authority fails closed before provider dispatch", async () => {
  class ProviderShapeError extends Error { constructor() { super("invalid response_format ".repeat(40)); this.status = 400; this.code = "BAD_REQUEST_SHAPE"; } }
  const detail = providerErrorDetail(new ProviderShapeError());
  assert.deepEqual({ class: detail.class, http_status: detail.http_status, code: detail.code }, { class: "ProviderShapeError", http_status: 400, code: "BAD_REQUEST_SHAPE" });
  assert.equal(detail.message.length, PROVIDER_ERROR_FIELD_MAX_LENGTH);
  const hostile = {}; Object.defineProperty(hostile, "message", { get() { throw new Error("getter must not escape"); } }); hostile.self = hostile;
  assert.doesNotThrow(() => providerErrorDetail(hostile));

  const json = async (relative) => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
  const env = {
    ...qualificationActivation(diagnosticPlan),
    AUTHORITY_SHA256: "a".repeat(64), AI_MODEL: diagnosticPlan.pricing.model, AI_MODEL_FALLBACK: "unwired-house-fallback",
    QUALIFICATION_CONTENT: {
      priors: { priors: await json("../../content/local-priors/v1/priors.json"), approval: await json("../../content/local-priors/v1/approval.json") },
      house: { catalog: await json("../../content/house-briefs/v1/catalog.json"), approval: await json("../../content/house-briefs/v1/approval.json") },
      corpus: { rubric: await json("../../semantic/voice/v1/rubric.json"), goldens: await json("../../semantic/voice/v1/goldens.json"), anti_goldens: await json("../../semantic/voice/v1/anti-goldens.json"), approval: await json("../../semantic/voice/v1/approval.json") },
    },
    AI: { async run(_model, providerRequest) {
      assert.equal(providerRequest.max_tokens, 2048); assert.equal(providerRequest.response_format.type, "json_schema");
      throw new ProviderShapeError();
    } },
  };
  const diagnosticApproval = { ...approval, run_id: diagnosticPlan.run_id, plan_sha256: sha256(diagnosticPlanBytes) };
  const response = await adapterWorker.fetch(new Request("http://127.0.0.1/run", { method: "POST", headers: { "content-type": "application/json", "x-qualification-authority": env.AUTHORITY_SHA256 }, body: JSON.stringify({ plan: diagnosticPlan, approval: diagnosticApproval }) }), env);
  const { evidence } = await response.json();
  assert.equal(evidence.run.calls_started, 0); assert.equal(evidence.attempts.length, 0);
  assert.deepEqual(evidence.outcome, { source: "none", code: "pipeline_failed", failure_stage: "strike", error: { class: "Error", message: "inactive domain writer unavailable", http_status: null, code: null } });
});
test("Worker entry module exports only the default ExportedHandler", async () => {
  assert.deepEqual(Object.keys(await import("./worker.mjs")), ["default"]);
  assert.equal(typeof adapterWorker.fetch, "function");
});
test("qualification coordinator emits a production-parseable integer-timestamp receipt", async () => {
  const now = () => 1787678400000; const hash = async () => "0".repeat(64);
  const coord = qualificationCoordinator(now, hash);
  const scope = { kind: "domain", round: 1190001, domain: "qualification.invalid" };
  const catalog = JSON.parse(await readFile(new URL("../../content/house-briefs/v1/catalog.json", import.meta.url)));
  const brief = catalog.entries[0].brief; const candidateRef = derivePipelineCandidateRef(CANDIDATE_SCHEMA_VERSION, brief);
  const artifact = buildCommittedBrief({
    artifact_version: ARTIFACT_VERSION, id: "d-receipt-fixture", request_scope: "domain", brief, brief_schema_version: brief.version,
    policy_identity: "1".repeat(64), rubric_identity: "2".repeat(64),
    provenance: { attempt_id: "receipt-fixture", candidate_ref: candidateRef, evidence_ref: "3".repeat(64), grounding_report_version: 1, effective_mode: brief.mode },
  });
  const owner = "writer-receipt-fixture";
  await coord.post("/claim", { scope, owner });
  const receipt = await coord.post("/commit", { scope, owner, artifact });
  assert.equal(Number.isSafeInteger(receipt.committed_at) && receipt.committed_at >= 0, true);
  assert.ok(parseReceipt(receipt, scope));
});
test("accepted attempts correlate pre-notice generation refs to one authoritative judge record", () => {
  const providerRef = "4".repeat(64); const authoritativeRef = "5".repeat(64);
  const generation = call("generation", providerRef); const judge = call("judge", authoritativeRef);
  const strike = { code: "accepted", model_calls: 2, ledger: [
    { event: "pair_reserved", attempt: 1 }, { event: "generation_completed", attempt: 1, candidate_ref: authoritativeRef },
    { event: "candidate_accepted", attempt: 1, candidate_ref: authoritativeRef },
  ] };
  const [attempt] = attemptsFrom([generation, judge], strike);
  assert.equal(attempt.candidate_ref, authoritativeRef); assert.equal(attempt.generation.provider_candidate_ref, providerRef);
  assert.equal(attempt.generation.candidate_ref, authoritativeRef); assert.equal(attempt.judge, judge); assert.equal(attempt.judge.candidate_ref, authoritativeRef);
  assert.deepEqual(attempt.judge.usage, { input_tokens: 100, output_tokens: 50 }); assert.ok(attempt.judge.cost_usd > 0); assert.equal(attempt.terminal, "accepted");
  assert.throws(() => attemptsFrom([call("generation", providerRef)], strike), /exactly one judge/);
});
test("pipeline failure observability preserves strike source, bounded error class, and stage", () => {
  class CommitReceiptError extends Error {}
  const outcome = failureOutcome({ code: "accepted" }, new CommitReceiptError("malformed receipt"));
  assert.equal(outcome.source, "candidate"); assert.equal(outcome.code, "pipeline_failed"); assert.equal(outcome.failure_stage, "post_strike");
  assert.equal(outcome.error.class, "CommitReceiptError"); assert.equal(outcome.error.message, "malformed receipt");
  assert.ok(outcome.error.class.length <= PROVIDER_ERROR_FIELD_MAX_LENGTH); assert.ok(outcome.error.message.length <= PROVIDER_ERROR_FIELD_MAX_LENGTH);
});
test("zero-call preflight rejects missing, tampered, CI, and noninteractive authority without consuming allowance", async () => {
  for (const [p, a, options] of [[planBytes, Buffer.from("null"), {}], [Buffer.concat([planBytes, Buffer.from(" ")]), approvalBytes, { tty: true }], [planBytes, approvalBytes, { ci: "1", tty: true }], [planBytes, approvalBytes, { tty: false }]]) {
    const outcome = await preflight(p, a, { now: Date.parse(started), ...options }); assert.equal(outcome.ok, false); assert.equal(outcome.calls_started, 0); assert.equal(outcome.allowance_consumed, false);
  }
});
test("runner retains a zero-call refusal without touching the adapter", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-zero-")); let calls = 0;
  const outcome = await runLive({ planBytes, approvalBytes: Buffer.from("null"), resultsDirectory: directory, adapter: { health() { calls += 1; }, run() { calls += 1; } }, tty: true, ci: false, now: () => Date.parse(started) });
  assert.equal(outcome.allowance_consumed, false); assert.equal(outcome.calls_started, 0); assert.equal(calls, 0); assert.equal((await readdir(directory)).length, 1);
});
test("adapter identity mismatch remains a durable zero-call preflight", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-health-")); let runs = 0;
  const outcome = await runLive({ planBytes, approvalBytes, resultsDirectory: directory, adapter: { async health() { return { ok: true, assembly_identity: "0".repeat(64) }; }, async run() { runs += 1; } }, tty: true, ci: false, now: () => Date.parse(started) });
  assert.equal(outcome.code, "adapter_identity_mismatch"); assert.equal(outcome.allowance_consumed, false); assert.equal(runs, 0);
});
test("authorized runner consumes before adapter invocation and publishes a verified immutable set", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-live-fixture-")); let observedCalling = false;
  const receiptPath = path.join(directory, `${plan.run_id}.spend-receipt.json`);
  const adapter = {
    async health() { return { ok: true, assembly_identity: plan.authorities.assembly_identity }; },
    async run() { observedCalling = JSON.parse(await readFile(receiptPath, "utf8")).state === "calling"; return { evidence: baseEvidence() }; },
  };
  const outcome = await runLive({ planBytes, approvalBytes, resultsDirectory: directory, adapter, tty: true, ci: false, now: () => Date.parse(started) });
  assert.equal(observedCalling, true); assert.equal(outcome.ok, true, outcome.verification?.errors.join("\n")); assert.equal(outcome.allowance_consumed, true);
  assert.equal((await verifyPublication(directory, plan.run_id)).marker.members.length, 5);
});
test("adapter failure preserves a consumed-incomplete receipt and never fabricates evidence", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-incomplete-"));
  const outcome = await runLive({ planBytes, approvalBytes, resultsDirectory: directory, adapter: { async health() { return { ok: true, assembly_identity: plan.authorities.assembly_identity }; }, async run() { throw new Error("provider failed"); } }, tty: true, ci: false, now: () => Date.parse(started) });
  assert.equal(outcome.code, "adapter_failure"); assert.equal(outcome.allowance_consumed, true);
  assert.equal(JSON.parse(await readFile(path.join(directory, `${plan.run_id}.spend-receipt.json`), "utf8")).state, "consumed_incomplete");
  const retained = await readFile(new URL("./results/c2d9142a-bf7a-4a20-9f13-6ed403bd0e91.spend-receipt.json", import.meta.url));
  for (const bytes of [retained, Buffer.from("{}"), Buffer.from(JSON.stringify({ schema_version: "oddspark.local-full-request-evidence/v1", full_request_ref: null }))]) {
    let verification; assert.doesNotThrow(() => { verification = verifyEvidenceBytes(bytes, { planBytes, approvalBytes }); });
    assert.equal(verification.valid, false); assert.equal(verification.predicate_results.length, PREDICATES.length); assert.equal(verification.predicate_results.every(({ pass }) => pass === false), true); assert.match(verification.errors.join(";"), /incomplete|not qualification evidence/); assert.doesNotMatch(verification.errors.join(";"), /full_request_ref mismatch/);
  }
  const receiptPath = new URL("./results/c2d9142a-bf7a-4a20-9f13-6ed403bd0e91.spend-receipt.json", import.meta.url);
  const cli = spawnSync(process.execPath, ["./verify.mjs", fileURLToPath(receiptPath), "./plans/story-1-19-local-full-request-5ef8222e-unapproved.plan.json", fileURLToPath(receiptPath)], { cwd: fileURLToPath(new URL(".", import.meta.url)), encoding: "utf8" });
  assert.equal(cli.status, 1); assert.match(cli.stderr, /spend receipt state consumed_incomplete.*not qualification evidence/s); assert.doesNotMatch(cli.stderr, /\n\s+at /);
});
test("independent arbitrary-byte verifier accepts one complete synthetic happy path", () => { const result = verify(closeEvidence()); assert.equal(result.valid, true, result.errors.join("\n")); });
test("independent verifier requires a retained strike terminal and ledger", () => { const evidence = closeEvidence(); delete evidence.strike; evidence.full_request_ref = null; assert.match(verify(evidence).errors.join(";"), /incomplete|telemetry.retained/); });
test("plan tampering and assembly or structural identity mismatch fail closed", () => {
  const evidence = closeEvidence(); evidence.authorities.assembly_identity = "0".repeat(64); evidence.full_request_ref = null; assert.equal(verify(evidence).valid, false);
  const tamperedPlan = Buffer.from(planBytes); tamperedPlan[tamperedPlan.length - 2] ^= 1; assert.equal(verifyEvidenceBytes(Buffer.from(JSON.stringify(closeEvidence())), { planBytes: tamperedPlan, approvalBytes }).valid, false);
});
test("over-cap accounting fails closed", () => { const evidence = closeEvidence(); evidence.run.calls_started = 7; evidence.full_request_ref = null; assert.match(verify(evidence).errors.join(";"), /accounting.call_cap/); });
test("a judge call not bound to its attempt Candidate fails closed", () => { const evidence = closeEvidence(); evidence.attempts[0].judge.candidate_ref = "9".repeat(64); evidence.full_request_ref = null; assert.match(verify(evidence).errors.join(";"), /accounting.judge_binding/); });
test("missing commit reserve and coordinator uncertainty fail closed without render authority", () => { const evidence = closeEvidence(); evidence.run.commit_reserve_observed = false; evidence.commit.confirmed = false; evidence.commit.coordinator_status = "uncertain"; evidence.render.completed = false; evidence.full_request_ref = null; assert.match(verify(evidence).errors.join(";"), /deadline.commit_reserve.*commit.authoritative.*render.complete/); });
test("deterministic rejection retains zero judge calls and can advance to a later accepted attempt", () => {
  const evidence = baseEvidence(); const rejected = evidence.attempts[0]; rejected.deterministic.pass = false; rejected.judge = null; rejected.terminal = "deterministic_rejected";
  const accepted = structuredClone(baseEvidence().attempts[0]); accepted.sequence = 2; evidence.attempts.push(accepted); evidence.run.calls_started = 3; evidence.run.cost_usd = rejected.generation.cost_usd + accepted.generation.cost_usd + accepted.judge.cost_usd;
  assert.equal(verify(closeEvidence(evidence)).valid, true);
});
test("house fallback is retained and never judged", () => { const evidence = baseEvidence(); evidence.attempts[0].judge = null; evidence.attempts[0].deterministic.pass = false; evidence.attempts[0].terminal = "deterministic_rejected"; evidence.outcome = { source: "house", code: "house_accepted" }; evidence.run.calls_started = 1; evidence.run.cost_usd = evidence.attempts[0].generation.cost_usd; assert.equal(verify(closeEvidence(evidence)).valid, true); });
test("ambiguous provider attempt is terminal NO-GO and preserves evidence without a ref", () => { const evidence = closeEvidence(); evidence.attempts[0].terminal = "ambiguous"; evidence.run.terminal = false; evidence.full_request_ref = null; const outcome = verify(evidence); assert.equal(outcome.valid, false); assert.match(outcome.errors.join(";"), /chronology.complete/); });
test("provider failure evidence remains bounded and current runtime exhaustion fails closed before provider dispatch", async () => { const evidence = baseEvidence(); const failed = evidence.attempts[0].generation; failed.success = false; failed.provider_error = { class: "Error", message: "provider_timeout", http_status: null, code: null }; failed.usage = { input_tokens: 0, output_tokens: 0 }; failed.cost_usd = 0; evidence.attempts[0].judge = null; evidence.attempts[0].terminal = "provider_failed"; evidence.outcome = { source: "house", code: "house_accepted" }; evidence.run.calls_started = 1; evidence.run.cost_usd = 0; assert.equal(verify(closeEvidence(evidence)).valid, true);
  let timeout; let cleared = false;
  const timers = { setTimeout(callback, ms) { timeout = ms; callback(); return 1; }, clearTimeout(id) { assert.equal(id, 1); cleared = true; } };
  await assert.rejects(boundedProviderCall(() => new Promise(() => {}), plan.limits.provider_timeout_ms, timers), /provider_timeout/);
  assert.equal(timeout, 19833); assert.equal(cleared, true);
  const json = async (relative) => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
  const qualificationContent = {
    priors: { priors: await json("../../content/local-priors/v1/priors.json"), approval: await json("../../content/local-priors/v1/approval.json") },
    house: { catalog: await json("../../content/house-briefs/v1/catalog.json"), approval: await json("../../content/house-briefs/v1/approval.json") },
    corpus: { rubric: await json("../../semantic/voice/v1/rubric.json"), goldens: await json("../../semantic/voice/v1/goldens.json"), anti_goldens: await json("../../semantic/voice/v1/anti-goldens.json"), approval: await json("../../semantic/voice/v1/approval.json") },
  };
  let providerCalls = 0; const providerStages = [];
  const env = {
    ...qualificationActivation(currentPlan),
    AUTHORITY_SHA256: "a".repeat(64), AI_MODEL: currentPlan.pricing.model, AI_MODEL_FALLBACK: "unwired-house-fallback", QUALIFICATION_CONTENT: qualificationContent,
    AI: { run(_model, providerRequest) { providerCalls += 1; providerStages.push(providerRequest?.response_format?.json_schema?.required?.includes("gates") ? "judge" : "generation"); return new Promise(() => {}); } },
    QUALIFICATION_TIMERS: { setTimeout(callback) { queueMicrotask(callback); return providerCalls; }, clearTimeout() {} },
  };
  const currentApproval = { ...approval, run_id: currentPlan.run_id, plan_sha256: sha256(currentPlanBytes) };
  const request = new Request("http://127.0.0.1/run", { method: "POST", headers: { "content-type": "application/json", "x-qualification-authority": env.AUTHORITY_SHA256 }, body: JSON.stringify({ plan: currentPlan, approval: currentApproval }) });
  const integrationStarted = Date.now();
  const response = await Promise.race([adapterWorker.fetch(request, env), new Promise((_, reject) => setTimeout(() => reject(new Error("adapter worker hung")), 1000))]);
  const integrated = await response.json();
  assert.equal(response.status, 200); assert.equal(providerCalls, 0); assert.deepEqual(providerStages, []);
  assert.deepEqual(integrated.evidence.outcome, { source: "none", code: "pipeline_failed", failure_stage: "strike", error: { class: "Error", message: "inactive domain writer unavailable", http_status: null, code: null } });
  assert.equal(integrated.evidence.run.calls_started, 0); assert.equal(integrated.evidence.run.terminal, true); assert.equal(integrated.evidence.strike, null); assert.deepEqual(integrated.evidence.attempts, []);
  assert.equal(integrated.evidence.commit.confirmed, false); assert.equal(integrated.evidence.render.completed, false); assert.equal(integrated.evidence.full_request_ref, null);
  assert.ok(Date.now() - integrationStarted < currentPlan.limits.route_ceiling_ms - currentPlan.limits.commit_reserve_ms);
});

test("plan creator binds current assembly and synthetic accepted refs, rejects drift and collisions, and has no provider path", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-plan-")); const output = path.join(directory, "story-1-26-synthetic.plan.json");
  const options = { output, assembly_ref: CURRENT_ASSEMBLY_IDENTITY, generation_ref: "1".repeat(64), generation_role_ref: "2".repeat(64), judge_ref: "3".repeat(64), run_id: "12345678-1234-4123-8123-123456789abc", strike_timestamp: "2026-08-26T15:00:00.000Z", route_ceiling_ms: "120000", commit_reserve_ms: "1000", provider_timeout_ms: "19833", call_cap: "6", attempt_cap: "3", maximum_cost_usd: "0.06" };
  const created = createUnapprovedPlan(options); assert.equal(validatePlan(created), true); assert.equal(created.approval, null); assert.equal(created.execution, null); assert.equal(created.allowance_consumed, false);
  const retained = await writeUnapprovedPlan(created, output); assert.equal(retained.sha256, sha256(retained.bytes)); await assert.rejects(writeUnapprovedPlan(created, output), /EEXIST/);
  assert.throws(() => createUnapprovedPlan({ ...options, assembly_ref: "0".repeat(64) }), /current assembly/); assert.throws(() => createUnapprovedPlan({ ...options, judge_ref: "stale" }), /accepted Stage/); assert.throws(() => createUnapprovedPlan({ ...options, provider_timeout_ms: "19832" }), /inconsistent/);
  await assert.rejects(writeUnapprovedPlan(created, path.join(directory, "..", "escape.plan.json")), /EEXIST|unsafe|ENOENT/);
});
test("fsynced atomic accounting and append-only attempt history retain complete records", async () => { const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-accounting-")); const receipt = path.join(directory, "receipt.json"); const history = path.join(directory, "attempts.jsonl"); await atomicWrite(receipt, Buffer.from("{\"calls_started\":0}\n")); await appendAttempt(history, { sequence: 1, terminal: "provider_failed" }); await appendAttempt(history, { sequence: 2, terminal: "accepted" }); assert.match(await readFile(receipt, "utf8"), /calls_started/); assert.equal((await readFile(history, "utf8")).trim().split("\n").length, 2); });
test("cycle lock is exclusive, stale-safe, and refuses successor release", async () => { const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-lock-")); const first = await acquireLock(directory); await assert.rejects(acquireLock(directory), /live or not stale/); await releaseLock(first); const old = await acquireLock(directory, { now: 0 }); await writeFile(old.lockPath, `${JSON.stringify({ pid: 99999999, nonce: old.nonce, acquired_at: new Date(0).toISOString() })}\n`); const recovered = await acquireLock(directory, { now: STALE_LOCK_MS + 1, alive: () => false }); await assert.rejects(releaseLock(old), /successor/); await releaseLock(recovered); });
test("cycle lock deterministically closes FileHandles when write, sync, read, or parse fails", async () => {
  const directory = path.join(os.tmpdir(), "full-request-lock-injected");
  const handle = (overrides = {}) => {
    const state = { closes: 0 };
    return { state, value: { async writeFile() {}, async sync() {}, async readFile() { return "{}"; }, async close() { state.closes += 1; }, ...overrides } };
  };
  for (const [label, overrides, pattern] of [
    ["write", { async writeFile() { throw new Error("write failed"); } }, /write failed/],
    ["sync", { async sync() { throw new Error("sync failed"); } }, /sync failed/],
  ]) {
    const injected = handle(overrides);
    await assert.rejects(acquireLock(directory, { openFile: async () => injected.value }), pattern, label);
    assert.equal(injected.state.closes, 1, `${label} failure must close once`);
  }
  for (const [label, overrides, pattern] of [
    ["contended read", { async readFile() { throw new Error("read failed"); } }, /read failed/],
    ["contended parse", { async readFile() { return "{"; } }, /JSON/],
  ]) {
    const injected = handle(overrides); let calls = 0;
    const openFile = async () => { calls += 1; if (calls === 1) { const error = new Error("exists"); error.code = "EEXIST"; throw error; } return injected.value; };
    await assert.rejects(acquireLock(directory, { openFile }), pattern, label);
    assert.equal(injected.state.closes, 1, `${label} failure must close once`);
  }
  for (const [label, overrides, pattern] of [
    ["release read", { async readFile() { throw new Error("release read failed"); } }, /release read failed/],
    ["release parse", { async readFile() { return "{"; } }, /JSON/],
  ]) {
    const injected = handle(overrides);
    await assert.rejects(releaseLock({ lockPath: path.join(directory, ".cycle.lock"), nonce: "expected" }, { openFile: async () => injected.value }), pattern, label);
    assert.equal(injected.state.closes, 1, `${label} failure must close once`);
  }
});
test("cycle lock closes FileHandles on success, contention, stale recovery, and failed successor release", () => {
  const governanceUrl = new URL("./governance.mjs", import.meta.url).href;
  const program = `
    import { mkdtemp, rm, writeFile } from "node:fs/promises";
    import os from "node:os";
    import path from "node:path";
    import { acquireLock, releaseLock, STALE_LOCK_MS } from ${JSON.stringify(governanceUrl)};
    const directory = await mkdtemp(path.join(os.tmpdir(), "full-request-lock-handles-"));
    try {
      const first = await acquireLock(directory);
      for (let index = 0; index < 4; index += 1) await acquireLock(directory).then(() => { throw new Error("contention unexpectedly acquired"); }, (error) => { if (!/live or not stale/.test(error.message)) throw error; });
      await releaseLock(first);
      const old = await acquireLock(directory, { now: 0 });
      await writeFile(old.lockPath, JSON.stringify({ pid: 99999999, nonce: old.nonce, acquired_at: new Date(0).toISOString() }) + "\\n");
      const recovered = await acquireLock(directory, { now: STALE_LOCK_MS + 1, alive: () => false });
      await releaseLock(old).then(() => { throw new Error("successor release unexpectedly succeeded"); }, (error) => { if (!/successor/.test(error.message)) throw error; });
      await releaseLock(recovered);
      for (let index = 0; index < 4; index += 1) { global.gc(); await new Promise((resolve) => setImmediate(resolve)); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  `;
  const child = spawnSync(process.execPath, ["--expose-gc", "--throw-deprecation", "--input-type=module", "--eval", program], { encoding: "utf8", timeout: 10000 });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  assert.doesNotMatch(child.stderr, /Closing file descriptor|DEP0137/);
});
test("all frozen predicates are retained exactly once", () => { const evidence = closeEvidence(); assert.deepEqual(evidence.predicate_results.map(({ id }) => id), PREDICATES); assert.equal(new Set(PREDICATES).size, PREDICATES.length); });
test("check and CI scripts cannot reach the live adapter entrypoints", async () => { const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url))); const ci = await readFile(new URL("../../.github/check-ci.mjs", import.meta.url), "utf8"); assert.doesNotMatch(pkg.scripts.check, /full-request/); assert.doesNotMatch(pkg.scripts.test, /full-request/); assert.doesNotMatch(ci, /local-full-request|full-request:plan|start-adapter/); });
test("remote-required AI binding is never paired with a launcher posture that disables remote bindings", async () => {
  const launcher = await readFile(new URL("./start-adapter.mjs", import.meta.url), "utf8");
  assert.match(launcher, /ai:\s*\{\s*binding:\s*"AI",\s*remote:\s*true\s*\}/);
  assert.match(launcher, /compatibility_flags:\s*\["nodejs_compat"\]/);
  const spawnArgs = launcher.match(/spawn\("npx",\s*(\[[^\]]+\])/s);
  assert.ok(spawnArgs, "launcher must invoke npx with a literal closed argument list");
  assert.doesNotMatch(spawnArgs[1], /["']--local["']/);
});
