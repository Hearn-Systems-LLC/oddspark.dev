import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CALL_CAP, DIRECT_VALID_THRESHOLD, GENERATION_PREDICATES, MAX_RETAINED_OUTPUT_BYTES, ROLE_IDENTITIES, STORY_1_3_ORACLE_HASH, STORY_1_3_ORACLE_VERSION, TAXONOMY, TRIALS_PER_ROLE, buildRequest, classifyCall, exactObject, fixtureInput, normalizeUsage, sha256, stableStringify } from "./contract.mjs";
import { executeFixtures } from "./fixture-executor.mjs";

export const EVIDENCE_VERSION = "oddspark.generation-qualification-evidence/v2";
export const SOURCE_PATHS = Object.freeze(["package.json", "runtime-baseline.json", "scripts/generation.mjs", "scripts/brief-contracts.mjs", "spikes/judge-fidelity/contract.mjs", "spikes/generation-qualification/contract.mjs", "spikes/generation-qualification/evidence-v2.mjs", "spikes/generation-qualification/fixture-executor.mjs", "spikes/generation-qualification/fixtures.json", "spikes/generation-qualification/qualification.mjs", "spikes/generation-qualification/run.mjs", "spikes/generation-qualification/start-adapter.mjs", "spikes/generation-qualification/test.mjs", "spikes/generation-qualification/verify-v2.mjs", "spikes/generation-qualification/worker.mjs", "spikes/generation-qualification/wrangler.toml"]);
const LEGACY_JUDGE = Object.freeze([
  { path: "spikes/judge-fidelity/results/2026-08-16-d2b84005.json", sha256: "1cc4431088e37ba069e128e0059f19229551de2398db0d686524bc70aa752377" },
  { path: "spikes/judge-fidelity/results/2026-08-16-d2b84005.md", sha256: "0fde75016daa6556ece35be8abd54faaebc4eed6a82156fd834bd127fd263562" },
  { path: "spikes/judge-fidelity/results/2026-08-16-d2b84005-audit.md", sha256: "4695bae9056e14e8b961111f9be6802c8faab2ebf932963e6425315c43d4e16b" },
]);
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
export async function legacyIdentity(read = (relative) => readFile(path.join(ROOT, relative))) { return Promise.all(LEGACY_JUDGE.map(async (entry) => { const bytes = await read(entry.path); const observed_sha256 = createHash("sha256").update(bytes).digest("hex"); return { ...entry, observed_sha256, immutable: observed_sha256 === entry.sha256 }; })); }
export function expectedHealth(sources, runtime) {
  const digest = (name) => sources.find(({ path: file }) => file === name)?.sha256 ?? null;
  return { ok: true, inference: false, schema_version: "oddspark.generation-adapter-health/v1", provider: "cloudflare-workers-ai", roles: ROLE_IDENTITIES, parameters: { temperature: 0, max_tokens: 2048 }, binding: "AI", worker_sha256: digest("spikes/generation-qualification/worker.mjs"), config_sha256: digest("spikes/generation-qualification/wrangler.toml"), runtime_sha256: runtime.runtime_identity_sha256 };
}
export function requestManifest(input = fixtureInput()) { return ROLE_IDENTITIES.map((role) => buildRequest(role, input)); }
export function summarize(records) {
  const by_role = {};
  for (const identity of ROLE_IDENTITIES) {
    const rows = records.filter((row) => row.kind === "trial" && row.role === identity.role); const counts = Object.fromEntries(TAXONOMY.map((key) => [key, rows.filter((row) => row.classification === key).length]));
    by_role[identity.role] = { resolved_model: identity.resolved_model, total: rows.length, ...counts, direct_rate: { numerator: counts.direct_valid, denominator: rows.length, percent: rows.length ? Number((100 * counts.direct_valid / rows.length).toFixed(2)) : 0 }, latency_ms: rows.map(({ latency_ms }) => latency_ms), usage: rows.map(({ usage }) => usage), cost_usd: rows.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0), missing_usage: rows.filter(({ usage }) => usage === null).length };
  }
  return { by_role };
}
export function outcomeFor(evidence, predicateResults) {
  const by_role = {};
  for (const identity of ROLE_IDENTITIES) {
    const failures = []; const summary = summarize(evidence.records).by_role[identity.role]; const probe = evidence.records.filter((row) => row.role === identity.role && row.kind === "probe");
    if (probe.length !== 1 || probe[0]?.classification !== "direct_valid") failures.push("probe did not return a direct Candidate");
    if (summary.total !== TRIALS_PER_ROLE) failures.push(`expected ${TRIALS_PER_ROLE} trials, found ${summary.total}`);
    if (summary.direct_valid < DIRECT_VALID_THRESHOLD) failures.push(`direct-valid threshold ${DIRECT_VALID_THRESHOLD}/${TRIALS_PER_ROLE} not met`);
    if (!predicateResults.every(({ pass }) => pass)) failures.push("closed evidence predicates did not all pass");
    by_role[identity.role] = { decision: failures.length ? "NO-GO" : "GO", reasons: failures };
  }
  return { by_role };
}
export function renderReport(evidence) {
  const lines = ["# Generation Structural Qualification", "", `- Run: \`${evidence.run.id}\``, `- Calls: ${evidence.records.length}/${CALL_CAP}`, "", "| Role | Model | Trials | Direct valid | Decision |", "| --- | --- | ---: | ---: | --- |"]; const summary = summarize(evidence.records);
  for (const role of ROLE_IDENTITIES) { const row = summary.by_role[role.role]; lines.push(`| ${role.role} | \`${role.resolved_model}\` | ${row.total} | ${row.direct_valid}/${row.total} | ${evidence.outcome.by_role[role.role].decision} |`); }
  lines.push("", "Primary and fallback results are independent. Failures remain in their role denominator; no retry, replacement, repair, coercion, or prose extraction is allowed.", ""); return `${lines.join("\n")}\n`;
}
function recordValid(record, request, costForUsage) {
  if (!exactObject(record, ["kind", "role", "resolved_model", "index", "started_at", "ended_at", "latency_ms", "call_state", "classification", "candidate", "candidate_ref", "issues", "retained", "retained_sha256", "retained_bytes", "usage", "cost_usd", "request_sha256"])) return false;
  if (!["probe", "trial"].includes(record.kind) || !["received", "provider_error", "timeout"].includes(record.call_state) || record.role !== request.role || record.resolved_model !== request.resolved_model || record.request_sha256 !== request.request_sha256 || !TAXONOMY.includes(record.classification) || !canonicalTime(record.started_at) || !canonicalTime(record.ended_at) || Date.parse(record.ended_at) < Date.parse(record.started_at) || !Number.isFinite(record.latency_ms) || record.latency_ms < 0) return false;
  const usage = normalizeUsage(record.usage); if (usage === undefined || !same(usage, record.usage) || costForUsage(record.resolved_model, usage) !== record.cost_usd) return false;
  if (record.classification === "output_too_large") return record.call_state === "received" && record.retained === null && /^[a-f0-9]{64}$/.test(record.retained_sha256) && Number.isSafeInteger(record.retained_bytes) && record.retained_bytes > MAX_RETAINED_OUTPUT_BYTES && record.candidate === null && record.candidate_ref === null;
  const bytes = Buffer.from(JSON.stringify(record.retained)); if (record.retained_bytes !== bytes.byteLength || record.retained_sha256 !== sha256(bytes)) return false;
  const recomputed = classifyCall({ call_state: record.call_state, output: record.retained });
  return recomputed.classification === record.classification && recomputed.candidate_ref === record.candidate_ref && same(recomputed.candidate, record.candidate) && same(recomputed.issues, record.issues);
}
export async function verifyEvidence(evidence, dependencies = {}) {
  const checks = Object.fromEntries(GENERATION_PREDICATES.map((id) => [id, true])); const errors = [];
  const fail = (id, message) => { checks[id] = false; errors.push(`${id}: ${message}`); };
  try {
  const { costForUsage, validateApproval, validatePlan, PRICING } = await import("./qualification.mjs");
  const evidenceKeys = ["schema_version", "run", "plan", "input", "requests", "approval", "pricing", "sources", "runtime", "legacy", "adapter", "fixtures", "records", "summary", "oracle", "outcome", "predicate_results", "report"];
  if (!plain(evidence) || !exactObject(evidence, evidenceKeys) || evidence.schema_version !== EVIDENCE_VERSION) fail("evidence.shape", "wrong or open evidence envelope");
  if (evidence?.oracle?.version !== STORY_1_3_ORACLE_VERSION || evidence?.oracle?.hash !== STORY_1_3_ORACLE_HASH || !same(evidence?.oracle?.predicate_ids, GENERATION_PREDICATES)) fail("oracle.identity", "predicate oracle mismatch");
  const sources = await sourceIdentity(dependencies.read); if (!same(evidence?.sources, sources)) fail("source.identity", "source bytes do not match");
  const runtime = await runtimeIdentity(dependencies.read); if (!same(evidence?.runtime, runtime)) fail("runtime.identity", "runtime identity mismatch");
  const legacy = await legacyIdentity(dependencies.read); if (!same(evidence?.legacy, legacy) || !legacy.every(({ immutable }) => immutable)) fail("legacy.immutable", "pinned judge evidence drifted");
  const requests = requestManifest(evidence?.input); if (!same(evidence?.requests, requests)) fail("run.common_request", "request identities differ");
  const planCheck = validatePlan(evidence?.plan, { input: evidence?.input, requests, sources, runtime, expected_health: expectedHealth(sources, runtime) }); if (!planCheck.valid) fail("run.authorization", planCheck.errors.join("; "));
  const runStart = canonicalTime(evidence?.run?.started_at) ? Date.parse(evidence.run.started_at) : Number.NaN; const approvalCheck = validateApproval(evidence?.approval, evidence?.plan, runStart); if (!approvalCheck.valid) fail("run.authorization", approvalCheck.errors.join("; "));
  const fixtures = await executeFixtures(); if (!same(evidence?.fixtures, fixtures) || !fixtures.passed) fail("fixtures.executed", "fixture catalog did not execute exactly");
  const expected = expectedHealth(sources, runtime); if (!exactObject(evidence?.adapter, ["endpoint", "expected_health", "observed_health", "identity_match"]) || !exactLoopback(evidence?.adapter?.endpoint) || !same(evidence?.adapter?.expected_health, expected) || !same(evidence?.adapter?.observed_health, expected) || evidence?.adapter?.identity_match !== true) fail("adapter.identity", "adapter identity mismatch");
  const records = Array.isArray(evidence?.records) ? evidence.records : []; if (records.length > CALL_CAP) fail("run.authorization", "call cap exceeded");
  const run = evidence?.run; if (!exactObject(run, ["id", "started_at", "ended_at", "call_cap", "calls_made"]) || typeof run.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(run.id) || !canonicalTime(run.started_at) || !canonicalTime(run.ended_at) || Date.parse(run.ended_at) < Date.parse(run.started_at) || run.call_cap !== CALL_CAP || run.calls_made !== records.length) fail("run.cardinality", "run envelope is invalid");
  for (const record of records) { const request = requests.find(({ role }) => role === record.role); if (!request || !recordValid(record, request, costForUsage)) { fail("records.classified", "record classification or request binding mismatch"); fail("records.closed", "record is not closed and typed"); break; } if (canonicalTime(run?.started_at) && (Date.parse(record.started_at) < Date.parse(run.started_at) || Date.parse(record.ended_at) > Date.parse(run.ended_at))) fail("run.ordering", "record lies outside run bounds"); if (record.classification === "direct_valid" && classifyCall({ call_state: "received", output: record.candidate }).candidate_ref !== record.candidate_ref) fail("candidate.binding", "Candidate reference mismatch"); if (record.classification !== "direct_valid" && (record.candidate !== null || record.candidate_ref !== null)) fail("output.direct_candidate", "invalid output retained a Candidate"); }
  for (const identity of ROLE_IDENTITIES) { const rows = records.filter(({ role }) => role === identity.role); const probes = rows.filter(({ kind }) => kind === "probe"); const trials = rows.filter(({ kind }) => kind === "trial"); if (probes.length !== 1 || probes[0]?.index !== 1 || trials.length !== (probes[0]?.classification === "direct_valid" ? TRIALS_PER_ROLE : 0) || trials.some((row, index) => row.index !== index + 1)) fail("run.cardinality", `${identity.role} indices/cardinality mismatch`); }
  if (records.some((row, index) => index > 0 && Date.parse(records[index - 1].ended_at) > Date.parse(row.started_at))) fail("run.ordering", "global calls overlap or are out of order");
  const summary = summarize(records); if (!same(evidence?.summary, summary)) fail("summary.rates", "summary does not recompute");
  if (ROLE_IDENTITIES.some((identity) => summary.by_role[identity.role]?.resolved_model !== identity.resolved_model) || requests[0]?.request_sha256 === requests[1]?.request_sha256) fail("roles.independent", "roles are pooled or substituted");
  if (!same(evidence?.pricing, evidence?.plan?.estimate) || !same(evidence?.pricing?.pricing, PRICING) || records.some(({ cost_usd }) => !Number.isFinite(cost_usd) || cost_usd < 0) || Object.values(summary.by_role).some(({ cost_usd }) => !Number.isFinite(cost_usd))) fail("cost.recomputed", "pricing or cost accounting is invalid");
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
