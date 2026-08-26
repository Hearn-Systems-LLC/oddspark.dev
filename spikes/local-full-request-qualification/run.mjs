import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isatty } from "node:tty";
import { acquireLock, atomicWrite, releaseLock } from "./governance.mjs";
import { canonicalBytes, sha256, validateApproval, validatePlan } from "./contract.mjs";
import { publishArtifactSet } from "./publication.mjs";
import { finalizeEvidence, verifyEvidenceBytes } from "./verifier.mjs";
import { createUnapprovedPlan, writeUnapprovedPlan } from "./plan-creator.mjs";

const planUrl = new URL("./plans/story-1-19-local-full-request-2385cc23-unapproved.plan.json", import.meta.url);
const zero = (code) => ({ ok: false, calls_started: 0, allowance_consumed: false, code });

export async function preflight(planBytes, approvalBytes, { now = Date.now(), ci = process.env.CI, tty = isatty(0) && isatty(1) } = {}) {
  let plan; let approval;
  try { plan = JSON.parse(planBytes); approval = JSON.parse(approvalBytes); } catch { return zero("invalid_bytes"); }
  if (ci || !tty || !validatePlan(plan) || !validateApproval(approval, planBytes, now) || approval.run_id !== plan.run_id) return zero("not_authorized");
  return { ok: true, calls_started: 0, allowance_consumed: false, plan_sha256: sha256(planBytes), plan, approval };
}

function zeroCallEvidence(plan, planBytes, approvalBytes, code, at) {
  return {
    schema_version: "oddspark.local-full-request-zero-call/v1", run_id: plan?.run_id ?? null, code,
    retained_at: new Date(at).toISOString(), plan_sha256: sha256(planBytes), approval_sha256: sha256(approvalBytes),
    calls_started: 0, allowance_consumed: false,
  };
}

export async function runLive({ planBytes, approvalBytes, resultsDirectory, adapter, now = Date.now, ci = process.env.CI, tty = isatty(0) && isatty(1) }) {
  await mkdir(resultsDirectory, { recursive: true });
  let parsedPlan = null; try { parsedPlan = JSON.parse(planBytes); } catch { /* retained below */ }
  const checked = await preflight(planBytes, approvalBytes, { now: now(), ci, tty });
  const runName = parsedPlan?.run_id ?? `invalid-${sha256(planBytes).slice(0, 16)}`;
  if (!checked.ok) {
    const evidence = zeroCallEvidence(parsedPlan, planBytes, approvalBytes, checked.code, now());
    await atomicWrite(path.join(resultsDirectory, `${runName}.zero-call.json`), canonicalBytes(evidence));
    return { ...checked, evidence };
  }
  const lock = await acquireLock(resultsDirectory);
  try {
    const health = await adapter.health({ authority: sha256(approvalBytes) });
    if (health?.ok !== true || health.assembly_identity !== checked.plan.authorities.assembly_identity) {
      const evidence = zeroCallEvidence(checked.plan, planBytes, approvalBytes, "adapter_identity_mismatch", now());
      await atomicWrite(path.join(resultsDirectory, `${runName}.zero-call.json`), canonicalBytes(evidence));
      return { ok: false, calls_started: 0, allowance_consumed: false, code: evidence.code, evidence };
    }
    const receiptPath = path.join(resultsDirectory, `${runName}.spend-receipt.json`);
    const reserved = { schema_version: "oddspark.local-full-request-spend/v1", run_id: runName, plan_sha256: checked.plan_sha256, approval_sha256: sha256(approvalBytes), state: "reserved", calls_started: 0, allowance_consumed: false, reserved_at: new Date(now()).toISOString() };
    await atomicWrite(receiptPath, canonicalBytes(reserved));
    const startedAt = now();
    const calling = { ...reserved, state: "calling", calls_started: 1, allowance_consumed: true, first_call_started_at: new Date(startedAt).toISOString() };
    await atomicWrite(receiptPath, canonicalBytes(calling));
    let response;
    try { response = await adapter.run({ authority: sha256(approvalBytes), plan: checked.plan, approval: checked.approval }); }
    catch {
      const incomplete = { ...calling, state: "consumed_incomplete", failed_at: new Date(now()).toISOString(), error_class: "adapter_failure" };
      await atomicWrite(receiptPath, canonicalBytes(incomplete));
      return { ok: false, calls_started: 1, allowance_consumed: true, code: "adapter_failure" };
    }
    const base = structuredClone(response.evidence);
    base.plan_sha256 = checked.plan_sha256; base.approval_sha256 = sha256(approvalBytes); base.authorities = structuredClone(checked.plan.authorities);
    const evidence = finalizeEvidence(base, { planBytes, approvalBytes });
    const evidenceBytes = canonicalBytes(evidence);
    const verification = verifyEvidenceBytes(evidenceBytes, { planBytes, approvalBytes });
    const completed = { ...calling, state: verification.valid ? "completed" : "completed_no_go", calls_started: evidence.run?.calls_started ?? 1, completed_at: new Date(now()).toISOString(), evidence_sha256: sha256(evidenceBytes), full_request_ref: verification.valid ? evidence.full_request_ref : null };
    await atomicWrite(receiptPath, canonicalBytes(completed));
    const report = Buffer.from(`# LOCAL-FULL-REQUEST ${verification.valid ? "GO" : "NO-GO"}\n\n${verification.errors.length ? verification.errors.map((error) => `- ${error}`).join("\n") : `- Ref: ${evidence.full_request_ref}`}\n`);
    const publication = await publishArtifactSet(resultsDirectory, runName, {
      "plan.json": Buffer.from(planBytes), "approval.json": Buffer.from(approvalBytes), "evidence.json": evidenceBytes,
      "receipt.json": canonicalBytes(completed), "report.md": report,
    });
    return { ok: verification.valid, calls_started: completed.calls_started, allowance_consumed: true, code: verification.valid ? "go" : "no_go", evidence, verification, publication };
  } finally { await releaseLock(lock); }
}

function httpAdapter(endpoint) {
  const invoke = async (route, options) => {
    const response = await fetch(`${endpoint}${route}`, options); const value = await response.json();
    if (!response.ok) throw new Error(`adapter ${route} failed`); return value;
  };
  return {
    health: ({ authority }) => invoke("/health", { headers: { "x-qualification-authority": authority } }),
    run: ({ authority, plan, approval }) => invoke("/run", { method: "POST", headers: { "content-type": "application/json", "x-qualification-authority": authority }, body: JSON.stringify({ plan, approval }) }),
  };
}

function planOptions(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const flag = argv[index]; const value = argv[index + 1]; if (!flag?.startsWith("--") || value === undefined) throw new TypeError("plan arguments must be --name value pairs"); const key = flag.slice(2).replaceAll("-", "_"); if (Object.hasOwn(result, key)) throw new TypeError(`duplicate plan argument: ${flag}`); result[key] = value; } return result; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "plan";
  if (command === "plan") {
    const options = planOptions(process.argv.slice(3)); if (typeof options.output !== "string") throw new Error("plan requires --output and all exact authority/run/limit inputs");
    const plan = createUnapprovedPlan(options); const retained = await writeUnapprovedPlan(plan, options.output);
    console.log(JSON.stringify({ path: retained.path, sha256: retained.sha256, assembly_ref: plan.authorities.assembly_identity, generation_ref: plan.authorities.generation_ref, generation_role_ref: plan.authorities.generation_role_ref, judge_ref: plan.authorities.judge_ref, run_id: plan.run_id, limits: plan.limits, approval: null, execution: null, approved: false, allowance_consumed: false, provider_calls: 0 }));
  } else if (command === "live") {
    const [planPath, approvalPath, resultsDirectory, endpoint = "http://127.0.0.1:8787"] = process.argv.slice(3);
    if (!planPath || !approvalPath || !resultsDirectory) throw new Error("usage: run.mjs live PLAN APPROVAL RESULTS [LOOPBACK_ENDPOINT]");
    const outcome = await runLive({ planBytes: await readFile(planPath), approvalBytes: await readFile(approvalPath), resultsDirectory, adapter: httpAdapter(endpoint) });
    console.log(JSON.stringify({ ok: outcome.ok, code: outcome.code, calls_started: outcome.calls_started, allowance_consumed: outcome.allowance_consumed }));
    if (!outcome.ok) process.exitCode = 1;
  } else throw new Error("command must be plan or live");
}
