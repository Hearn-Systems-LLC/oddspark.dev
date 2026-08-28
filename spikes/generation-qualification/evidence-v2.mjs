import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CALL_CAP, DIRECT_VALID_THRESHOLD, GENERATION_PREDICATES, MAX_RETAINED_OUTPUT_BYTES, ROLE_IDENTITIES, STORY_1_3_ORACLE_HASH, STORY_1_3_ORACLE_VERSION, TAXONOMY, TIMEOUT_POLICY, TRIALS_PER_ROLE, buildRequest, classifyCall, exactObject, fixtureInput, normalizeUsage, sha256, stableStringify } from "./contract.mjs";
import { executeFixtures } from "./fixture-executor.mjs";

export const EVIDENCE_VERSION = "oddspark.generation-qualification-evidence/v2";
export const SOURCE_PATHS = Object.freeze(["package.json", "runtime-baseline.json", "scripts/generation.mjs", "scripts/brief-contracts.mjs", "spikes/judge-fidelity/contract.mjs", "spikes/generation-qualification/contract.mjs", "spikes/generation-qualification/evidence-v2.mjs", "spikes/generation-qualification/fixture-executor.mjs", "spikes/generation-qualification/fixtures.json", "spikes/generation-qualification/pricing.mjs", "spikes/generation-qualification/qualification.mjs", "spikes/generation-qualification/recovery-finder.mjs", "spikes/generation-qualification/run.mjs", "spikes/generation-qualification/start-adapter.mjs", "spikes/generation-qualification/test.mjs", "spikes/generation-qualification/verify-v2.mjs", "spikes/generation-qualification/worker.mjs", "spikes/generation-qualification/wrangler.toml"]);
const LEGACY_GENERATION = Object.freeze([
  ["story-1-11-2026-08-19-r2-ead1cb17-38d7-41ce-8369-7fdc14098b29.complete.json", "16fa1e27c35c0b4eb4f3bac4ad3d30b884a908e3c3f435f35a59c6bed857790d"],
  ["story-1-11-2026-08-19-r2-ead1cb17-38d7-41ce-8369-7fdc14098b29.evidence.json", "b880864ded0e560d9fea3421f787257eec28aa4225a414b3bc275b97ee82b908"],
  ["story-1-11-2026-08-19-r2-ead1cb17-38d7-41ce-8369-7fdc14098b29.qualification.json", "545016f6e1d12d5dd416b3cda30bc299081e6f96d470cc12fe459e7041987b5d"],
  ["story-1-11-2026-08-19-r2-ead1cb17-38d7-41ce-8369-7fdc14098b29.report.md", "9fcf5544c6bec83a2ee0140c29a54ed579f65bd552038498318784c942b53526"],
  ["story-1-11-2026-08-19-r2.approval.json", "2505dfa12dfb327a86e54b378377d1a0f89644ee83b69dca7075bed08ac10e64"],
  ["story-1-11-2026-08-19-r2.plan.json", "c333d5066df41c45c8e26f846ad84b13edcaa54a58b6c818ae90e6adc0e1783c"],
  ["story-1-11-2026-08-19-r2.spend-receipt.json", "1d072bd51470d25ef1e90c3f1f5e90761f52c5758877dfda3dd12954acd59fea"],
  ["story-1-11-2026-08-19-r3-f0da0590-4a83-4cf4-8401-6639af524959.complete.json", "09a077fd0964bba80aa5d1df786b3bbe8c10a364d2359f6e1c580b109c5ee707"],
  ["story-1-11-2026-08-19-r3-f0da0590-4a83-4cf4-8401-6639af524959.evidence.json", "c3b15bf90ecd591e43f72719f6a8c30722e6d73c47b7aa7ec6afc7fbb48c7a9b"],
  ["story-1-11-2026-08-19-r3-f0da0590-4a83-4cf4-8401-6639af524959.qualification.json", "a86b1cd1cc51b841c0b78d792e04abf89117edae483bfb29f2a3e2bc1274f8b2"],
  ["story-1-11-2026-08-19-r3-f0da0590-4a83-4cf4-8401-6639af524959.report.md", "7c60b8a2baf66d4a12936140787ce985114c90dd366cb300aeb214c0d8c9186c"],
  ["story-1-11-2026-08-19-r3.approval.json", "3b9236baefecf890db0d21d10092edf970eebe15ad977f6420cb5bc27b37642b"],
  ["story-1-11-2026-08-19-r3.plan.json", "f206baef6aad3b18a1851b720b9a6db166219a269d5dd3383635c221268c0c19"],
  ["story-1-11-2026-08-19-r3.spend-receipt.json", "e323396d69b990964ba472662543e2e1ee575505e4ef2faf0dfc866e03a21a0c"],
].map(([name, sha256]) => Object.freeze({ path: `spikes/generation-qualification/results/${name}`, sha256 })));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const same = (a, b) => stableStringify(a) === stableStringify(b);
const canonicalTime = (value) => { if (typeof value !== "string") return false; const time = Date.parse(value); return Number.isFinite(time) && new Date(time).toISOString() === value; };
const exactLoopback = (value) => { try { const url = new URL(value); return url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/" && url.href === value; } catch { return false; } };

export async function sourceIdentity(read = (relative) => readFile(path.join(ROOT, relative))) {
  return Promise.all(SOURCE_PATHS.map(async (relative) => { const bytes = await read(relative); return { path: relative, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") }; }));
}
export async function runtimeIdentity(read = (relative) => readFile(path.join(ROOT, relative))) {
  const bytes = await read("runtime-baseline.json"); const frozen = JSON.parse(bytes); return { path: "runtime-baseline.json", bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), runtime_identity_sha256: frozen.runtime_identity_sha256, node: process.version, wrangler: frozen.wrangler };
}
export async function legacyIdentity(read = (relative) => readFile(path.join(ROOT, relative))) { return Promise.all(LEGACY_GENERATION.map(async (entry) => { const bytes = await read(entry.path); const observed_sha256 = createHash("sha256").update(bytes).digest("hex"); return { ...entry, observed_sha256, immutable: observed_sha256 === entry.sha256, current_authority: false }; })); }
export function expectedHealth(sources, runtime) {
  const digest = (name) => sources.find(({ path: file }) => file === name)?.sha256 ?? null;
  return { ok: true, inference: false, schema_version: "oddspark.generation-adapter-health/v1", provider: "cloudflare-workers-ai", roles: ROLE_IDENTITIES, parameters: { temperature: 0, max_tokens: 2048 }, binding: "AI", worker_sha256: digest("spikes/generation-qualification/worker.mjs"), config_sha256: digest("spikes/generation-qualification/wrangler.toml"), runtime_sha256: runtime.runtime_identity_sha256 };
}
export function requestManifest(input = fixtureInput()) { return ROLE_IDENTITIES.map((role) => buildRequest(role, input)); }
// A scheduled call (probe or trial slot) is counted once, under its FINAL attempt's classification; earlier transient attempts remain in records but are not separate trials. Legacy zero-retry records carry no attempt field and are their own final attempt.
export function finalAttempts(records) {
  const slots = new Map();
  for (const row of records) { const key = `${row.role}${row.kind}${row.index}`; const prior = slots.get(key); if (!prior || (row.attempt ?? 1) > (prior.attempt ?? 1)) slots.set(key, row); }
  return [...slots.values()];
}
export function summarize(records) {
  const finals = finalAttempts(records);
  const by_role = {};
  for (const identity of ROLE_IDENTITIES) {
    const rows = records.filter((row) => row.kind === "trial" && row.role === identity.role); const counted = finals.filter((row) => row.kind === "trial" && row.role === identity.role); const counts = Object.fromEntries(TAXONOMY.map((key) => [key, counted.filter((row) => row.classification === key).length]));
    const costs = rows.map(({ cost_usd }) => cost_usd); const costKnown = costs.every((cost) => typeof cost === "number" && Number.isFinite(cost));
    by_role[identity.role] = { resolved_model: identity.resolved_model, total: counted.length, ...counts, direct_rate: { numerator: counts.direct_valid, denominator: counted.length, percent: counted.length ? Number((100 * counts.direct_valid / counted.length).toFixed(2)) : 0 }, latency_ms: rows.map(({ latency_ms }) => latency_ms), usage: rows.map(({ usage }) => usage), cost_usd: costKnown ? costs.reduce((sum, cost) => sum + cost, 0) : null, cost_known: costKnown, missing_usage: rows.filter(({ usage }) => usage === null).length };
  }
  return { by_role };
}
export function outcomeFor(evidence, predicateResults) {
  const by_role = {};
  const finals = finalAttempts(evidence.records);
  for (const identity of ROLE_IDENTITIES) {
    const failures = []; const summary = summarize(evidence.records).by_role[identity.role]; const probe = finals.filter((row) => row.role === identity.role && row.kind === "probe");
    if (probe.length !== 1 || probe[0]?.classification !== "direct_valid") failures.push("probe did not return a direct Candidate");
    if (summary.total !== TRIALS_PER_ROLE) failures.push(`expected ${TRIALS_PER_ROLE} trials, found ${summary.total}`);
    if (summary.direct_valid < DIRECT_VALID_THRESHOLD) failures.push(`direct-valid threshold ${DIRECT_VALID_THRESHOLD}/${TRIALS_PER_ROLE} not met`);
    if (!predicateResults.every(({ pass }) => pass)) failures.push("closed evidence predicates did not all pass");
    by_role[identity.role] = { decision: failures.length ? "NO-GO" : "GO", reasons: failures };
  }
  return { by_role };
}
export function renderReport(evidence) {
  const transient = (evidence.plan?.timeout_policy?.transient_retries ?? 0) > 0;
  const lines = ["# Generation Structural Qualification", "", `- Run: \`${evidence.run.id}\``, `- Calls: ${evidence.records.length}/${evidence.run.call_cap}`, "", "| Role | Model | Trials | Direct valid | Decision |", "| --- | --- | ---: | ---: | --- |"]; const summary = summarize(evidence.records);
  for (const role of ROLE_IDENTITIES) { const row = summary.by_role[role.role]; lines.push(`| ${role.role} | \`${role.resolved_model}\` | ${row.total} | ${row.direct_valid}/${row.total} | ${evidence.outcome.by_role[role.role].decision} |`); }
  lines.push("", transient ? "Primary and fallback results are independent. A scheduled call may retry once only after a transient provider_error or timeout attempt — never after an output classification — and the trial counts its final attempt; no replacement, repair, coercion, or prose extraction is allowed." : "Primary and fallback results are independent. Failures remain in their role denominator; no retry, replacement, repair, coercion, or prose extraction is allowed.", ""); return `${lines.join("\n")}\n`;
}
function recordValid(record, request, costForUsage, transient) {
  const keys = ["kind", "role", "resolved_model", "index", "started_at", "ended_at", "latency_ms", "call_state", "classification", "candidate", "candidate_ref", "issues", "retained", "retained_sha256", "retained_bytes", "usage", "cost_usd", "request_sha256"];
  if (!exactObject(record, transient ? [...keys.slice(0, 4), "attempt", ...keys.slice(4)] : keys)) return false;
  if (transient && (!Number.isSafeInteger(record.attempt) || record.attempt < 1 || record.attempt > 1 + TIMEOUT_POLICY.transient_retries)) return false;
  if (!["probe", "trial"].includes(record.kind) || !["received", "provider_error", "timeout"].includes(record.call_state) || record.role !== request.role || record.resolved_model !== request.resolved_model || record.request_sha256 !== request.request_sha256 || !TAXONOMY.includes(record.classification) || !canonicalTime(record.started_at) || !canonicalTime(record.ended_at) || Date.parse(record.ended_at) < Date.parse(record.started_at) || !Number.isFinite(record.latency_ms) || record.latency_ms < 0) return false;
  const usage = normalizeUsage(record.usage); if (usage === undefined || !same(usage, record.usage) || costForUsage(record.resolved_model, usage) !== record.cost_usd) return false;
  if (record.classification === "output_too_large") return record.call_state === "received" && record.retained === null && /^[a-f0-9]{64}$/.test(record.retained_sha256) && Number.isSafeInteger(record.retained_bytes) && record.retained_bytes > MAX_RETAINED_OUTPUT_BYTES && record.candidate === null && record.candidate_ref === null;
  const bytes = Buffer.from(JSON.stringify(record.retained)); if (record.retained_bytes !== bytes.byteLength || record.retained_sha256 !== sha256(bytes)) return false;
  const recomputed = classifyCall({ call_state: record.call_state, output: record.retained });
  return recomputed.classification === record.classification && recomputed.candidate_ref === record.candidate_ref && same(recomputed.candidate, record.candidate) && same(recomputed.issues, record.issues);
}
export async function verifyEvidence(evidence, dependencies = {}) {
  // The verifier binds governance from the plan embedded in each evidence set (cap, timeout/retry policy, predicate ids, source/runtime snapshots), so retained historical sets verify under their own exact plan while current plans are anchored at execution time by the runner's plan re-creation.
  const predicateIds = Array.isArray(evidence?.plan?.predicate_ids) ? evidence.plan.predicate_ids : [];
  const checks = Object.fromEntries(predicateIds.map((id) => [id, true])); const errors = [];
  const fail = (id, message) => { checks[id] = false; errors.push(`${id}: ${message}`); };
  try {
  const { costForUsage, validateApproval, validatePlan, PRICING } = await import("./qualification.mjs");
  const evidenceKeys = ["schema_version", "run", "plan", "input", "requests", "approval", "pricing", "sources", "runtime", "legacy", "adapter", "fixtures", "records", "summary", "oracle", "outcome", "predicate_results", "report"];
  if (!plain(evidence) || !exactObject(evidence, evidenceKeys) || evidence.schema_version !== EVIDENCE_VERSION) fail("evidence.shape", "wrong or open evidence envelope");
  if (evidence?.oracle?.version !== STORY_1_3_ORACLE_VERSION || evidence?.oracle?.hash !== STORY_1_3_ORACLE_HASH || !same(evidence?.oracle?.predicate_ids, predicateIds)) fail("oracle.identity", "predicate oracle mismatch");
  if (!same(evidence?.sources, evidence?.plan?.sources)) fail("source.identity", "source bytes do not match the plan");
  if (!same(evidence?.runtime, evidence?.plan?.runtime)) fail("runtime.identity", "runtime identity does not match the plan");
  const legacy = await legacyIdentity(dependencies.read); if (!same(evidence?.legacy, legacy) || !legacy.every(({ immutable }) => immutable)) fail("legacy.immutable", "pinned judge evidence drifted");
  const requests = requestManifest(evidence?.input); if (!same(evidence?.requests, requests)) fail("run.common_request", "request identities differ");
  const planCheck = validatePlan(evidence?.plan, { input: evidence?.input, requests }); if (!planCheck.valid) fail("run.authorization", planCheck.errors.join("; "));
  const callCap = evidence?.plan?.call_cap;
  const transient = same(evidence?.plan?.timeout_policy, TIMEOUT_POLICY);
  const runStart = canonicalTime(evidence?.run?.started_at) ? Date.parse(evidence.run.started_at) : Number.NaN; const approvalCheck = validateApproval(evidence?.approval, evidence?.plan, runStart); if (!approvalCheck.valid) fail("run.authorization", approvalCheck.errors.join("; "));
  const fixtures = await executeFixtures(); if (!same(evidence?.fixtures, fixtures) || !fixtures.passed) fail("fixtures.executed", "fixture catalog did not execute exactly");
  const expected = expectedHealth(evidence?.plan?.sources ?? [], evidence?.plan?.runtime ?? {}); if (!exactObject(evidence?.adapter, ["endpoint", "expected_health", "observed_health", "identity_match"]) || !exactLoopback(evidence?.adapter?.endpoint) || !same(evidence?.adapter?.expected_health, expected) || !same(evidence?.adapter?.observed_health, expected) || evidence?.adapter?.identity_match !== true) fail("adapter.identity", "adapter identity mismatch");
  const records = Array.isArray(evidence?.records) ? evidence.records : []; if (!Number.isSafeInteger(callCap) || records.length > callCap) fail("run.authorization", "call cap exceeded");
  const run = evidence?.run; if (!exactObject(run, ["id", "started_at", "ended_at", "call_cap", "calls_made"]) || typeof run.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(run.id) || !canonicalTime(run.started_at) || !canonicalTime(run.ended_at) || Date.parse(run.ended_at) < Date.parse(run.started_at) || run.call_cap !== callCap || run.calls_made !== records.length) fail("run.cardinality", "run envelope is invalid");
  for (const record of records) { const request = requests.find(({ role }) => role === record.role); if (!request || !recordValid(record, request, costForUsage, transient)) { fail("records.classified", "record classification or request binding mismatch"); fail("records.closed", "record is not closed and typed"); break; } if (canonicalTime(run?.started_at) && (Date.parse(record.started_at) < Date.parse(run.started_at) || Date.parse(record.ended_at) > Date.parse(run.ended_at))) fail("run.ordering", "record lies outside run bounds"); if (record.classification === "direct_valid" && classifyCall({ call_state: "received", output: record.candidate }).candidate_ref !== record.candidate_ref) fail("candidate.binding", "Candidate reference mismatch"); if (record.classification !== "direct_valid" && (record.candidate !== null || record.candidate_ref !== null)) fail("output.direct_candidate", "invalid output retained a Candidate"); }
  // Attempts of one scheduled call are adjacent, start at 1, and step by 1; a retry (attempt 2) may only follow a transient first attempt, and at most one retry is allowed per scheduled slot.
  const slots = []; for (const record of records) { const last = slots.at(-1); if (last && last.role === record.role && last.kind === record.kind && last.index === record.index) last.attempts.push(record); else slots.push({ role: record.role, kind: record.kind, index: record.index, attempts: [record] }); }
  if (transient) { for (const slot of slots) { if (slot.attempts.some((row, index) => row.attempt !== index + 1)) fail("schedule.transient_retry_only", "attempt indices are not sequential from 1"); if (slot.attempts.length > 1 + TIMEOUT_POLICY.transient_retries) fail("schedule.transient_retry_only", "more than one retry of a scheduled call"); if (slot.attempts.length > 1 && !TIMEOUT_POLICY.retry_states.includes(slot.attempts[0].classification)) fail("schedule.transient_retry_only", "retry follows a non-transient first attempt"); } }
  else { for (const slot of slots) if (slot.attempts.length !== 1) fail("schedule.zero_retry", "zero-retry policy retained multiple attempts for one scheduled call"); }
  for (const identity of ROLE_IDENTITIES) { const rows = slots.filter((slot) => slot.role === identity.role); const probes = rows.filter((slot) => slot.kind === "probe"); const trials = rows.filter((slot) => slot.kind === "trial"); const probeFinal = probes[0]?.attempts.at(-1); if (probes.length !== 1 || probes[0]?.index !== 1 || trials.length !== (probeFinal?.classification === "direct_valid" ? TRIALS_PER_ROLE : 0) || trials.some((slot, index) => slot.index !== index + 1)) fail("run.cardinality", `${identity.role} indices/cardinality mismatch`); }
  const expectedSchedule = [...ROLE_IDENTITIES.map(({ role }) => ({ kind: "probe", role, index: 1 })), ...ROLE_IDENTITIES.flatMap(({ role }) => { const probe = slots.find((slot) => slot.kind === "probe" && slot.role === role); return probe?.attempts.at(-1)?.classification === "direct_valid" ? Array.from({ length: TRIALS_PER_ROLE }, (_, index) => ({ kind: "trial", role, index: index + 1 })) : []; })];
  if (!same(slots.map(({ kind, role, index }) => ({ kind, role, index })), expectedSchedule)) fail("run.ordering", "global call schedule differs from the exact configured order");
  if (records.some((row, index) => index > 0 && Date.parse(records[index - 1].ended_at) > Date.parse(row.started_at))) fail("run.ordering", "global calls overlap or are out of order");
  const summary = summarize(records); if (!same(evidence?.summary, summary)) fail("summary.rates", "summary does not recompute");
  if (ROLE_IDENTITIES.some((identity) => summary.by_role[identity.role]?.resolved_model !== identity.resolved_model) || requests[0]?.request_sha256 === requests[1]?.request_sha256) fail("roles.independent", "roles are pooled or substituted");
  if (!same(evidence?.pricing, evidence?.plan?.estimate) || !same(evidence?.pricing?.pricing, PRICING) || records.some(({ cost_usd }) => cost_usd !== null && (!Number.isFinite(cost_usd) || cost_usd < 0))) fail("cost.recomputed", "pricing or cost accounting is invalid");
  const provisional = Object.entries(checks).map(([id, pass]) => ({ id, pass })); const outcome = outcomeFor(evidence, provisional); if (!same(evidence?.outcome, outcome)) fail("outcome.deterministic", "outcome does not recompute");
  const results = Object.entries(checks).map(([id, pass]) => ({ id, pass })); if (!same(evidence?.predicate_results, results)) fail("predicates.retained", "retained predicate results mismatch");
  if (evidence?.report !== renderReport({ ...evidence, outcome })) fail("report.deterministic", "report bytes mismatch");
  return { valid: errors.length === 0, errors, predicate_results: results };
  } catch (error) {
    fail("evidence.shape", `verification contained invalid evidence: ${String(error?.message ?? error)}`);
    return { valid: false, errors, predicate_results: Object.entries(checks).map(([id, pass]) => ({ id, pass })) };
  }
}

export async function buildEvidence({ run, plan, input, records, adapter, approval, pricing }) {
  const evidence = { schema_version: EVIDENCE_VERSION, run, plan, input, requests: requestManifest(input), approval, pricing, sources: await sourceIdentity(), runtime: await runtimeIdentity(), legacy: await legacyIdentity(), adapter, fixtures: await executeFixtures(), records, summary: summarize(records), oracle: { version: STORY_1_3_ORACLE_VERSION, hash: STORY_1_3_ORACLE_HASH, predicate_ids: GENERATION_PREDICATES }, outcome: { by_role: { primary: { decision: "NO-GO", reasons: [] }, fallback: { decision: "NO-GO", reasons: [] } } }, predicate_results: GENERATION_PREDICATES.map((id) => ({ id, pass: true })), report: "" };
  evidence.outcome = outcomeFor(evidence, evidence.predicate_results); evidence.report = renderReport(evidence); return evidence;
}
