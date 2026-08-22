import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import path from "node:path";
import { CALL_CAP, LEGACY_CALL_CAP } from "./contract.mjs";
import { deriveManifests, derivePlanRef, validateApproval } from "./qualification.mjs";
import { verifyEvidence } from "./evidence-v2.mjs";

const RECEIPT = /^(?<run>[A-Za-z0-9][A-Za-z0-9._-]{0,127})-(?<attempt>[0-9a-f-]{36})\.spend-receipt\.json$/;
const MARKER = /^(?<run>[A-Za-z0-9][A-Za-z0-9._-]{0,127})-(?<attempt>[0-9a-f-]{36})\.complete\.json$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const canonicalTime = (value) => typeof value === "string" && new Date(value).toISOString() === value;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const safe = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && path.basename(value) === value;

/** Read retained bytes once through O_NOFOLLOW and reject concurrent rewrites. */
export async function readStableNoFollow(file, hooks = {}) {
  const before = await lstat(file);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error("retained member is not a regular file");
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("retained member changed before open");
    const bytes = Buffer.alloc(opened.size); let offset = 0;
    while (offset < bytes.length) { const result = await handle.read(bytes, offset, bytes.length - offset, offset); if (result.bytesRead === 0) break; offset += result.bytesRead; }
    await hooks.afterRead?.({ file, handle, bytes }); const after = await handle.stat();
    if (offset !== bytes.length || after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs) throw new Error("retained member changed while read");
    return bytes;
  } finally { await handle.close(); }
}

export function receiptValid(receipt, match) {
  const common = ["schema_version", "plan_ref", "approval_sha256", "approval_run_id", "attempt_id", "reserved_at", "call_cap", "calls_started", "state"];
  const stateKeys = { "zero-call": common, calling: [...common, "first_call_started_at"], consumed_incomplete: [...common, "first_call_started_at", "failed_at", "original_error"], "completed-spent": [...common, "first_call_started_at", "completed_at", "calls_made", "actual_spend_usd", "actual_spend_known", "completion_marker"] };
  if (!receipt || !exact(receipt, stateKeys[receipt?.state] ?? []) || receipt.schema_version !== "oddspark.generation-spend-receipt/v1") return false;
  if (receipt.approval_run_id !== match.groups.run || receipt.attempt_id !== match.groups.attempt || !UUID.test(receipt.attempt_id) || !/^[a-f0-9]{64}$/.test(receipt.plan_ref) || !/^[a-f0-9]{64}$/.test(receipt.approval_sha256)) return false;
  if (!canonicalTime(receipt.reserved_at) || (receipt.call_cap !== CALL_CAP && receipt.call_cap !== LEGACY_CALL_CAP) || !Number.isInteger(receipt.calls_started) || receipt.calls_started < 0 || receipt.calls_started > receipt.call_cap) return false;
  const allowed = new Set(["zero-call", "calling", "consumed_incomplete", "completed-spent"]); if (!allowed.has(receipt.state)) return false;
  if ((receipt.state === "zero-call") !== (receipt.calls_started === 0)) return false;
  if (receipt.calls_started > 0 && !canonicalTime(receipt.first_call_started_at)) return false;
  if (receipt.first_call_started_at && Date.parse(receipt.first_call_started_at) < Date.parse(receipt.reserved_at)) return false;
  if (receipt.state === "consumed_incomplete" && (!canonicalTime(receipt.failed_at) || Date.parse(receipt.failed_at) < Date.parse(receipt.first_call_started_at) || typeof receipt.original_error !== "string" || receipt.original_error === "")) return false;
  if (receipt.state === "completed-spent" && (!canonicalTime(receipt.completed_at) || Date.parse(receipt.completed_at) < Date.parse(receipt.first_call_started_at) || receipt.calls_made !== receipt.calls_started || typeof receipt.actual_spend_known !== "boolean" || (receipt.actual_spend_known ? !Number.isFinite(receipt.actual_spend_usd) : receipt.actual_spend_usd !== null) || typeof receipt.completion_marker !== "string")) return false;
  return true;
}

async function verifyCompletion(directory, receipt, markerName, dependencies) {
  const expectedBase = `${receipt.approval_run_id}-${receipt.attempt_id}`;
  if (markerName !== `${expectedBase}.complete.json` || receipt.completion_marker !== markerName) throw new Error("receipt marker binding mismatch");
  const markerBytes = await readStableNoFollow(path.join(directory, markerName)); const marker = JSON.parse(markerBytes);
  const expectedNames = [`${expectedBase}.evidence.json`, `${expectedBase}.report.md`, `${expectedBase}.qualification.json`];
  if (!exact(marker, ["schema_version", "basename", "files"]) || marker.schema_version !== "oddspark.generation-qualification-complete/v1" || marker.basename !== expectedBase || !Array.isArray(marker.files) || marker.files.length !== expectedNames.length) throw new Error("completion marker is not closed");
  if (marker.files.some((member, index) => !exact(member, ["name", "bytes", "sha256"]) || member.name !== expectedNames[index] || !safe(member.name) || !Number.isInteger(member.bytes) || member.bytes < 0 || !/^[a-f0-9]{64}$/.test(member.sha256))) throw new Error("completion member is not closed");
  const bytes = new Map(); for (const member of marker.files) { const value = await readStableNoFollow(path.join(directory, member.name)); if (value.length !== member.bytes || hash(value) !== member.sha256) throw new Error("completion member hash mismatch"); bytes.set(member.name, value); }
  const evidence = JSON.parse(bytes.get(expectedNames[0])); const qualification = JSON.parse(bytes.get(expectedNames[2]));
  const checked = await (dependencies.verifyEvidence ?? verifyEvidence)(evidence, dependencies.evidenceDependencies ?? {});
  if (!checked.valid || bytes.get(expectedNames[1]).toString() !== evidence.report) throw new Error("published evidence failed verification");
  const derived = await deriveManifests(evidence); if (JSON.stringify(qualification) !== JSON.stringify(derived)) throw new Error("published qualification failed derivation");
  if (evidence.run.id !== receipt.attempt_id || evidence.plan.plan_ref !== receipt.plan_ref || evidence.plan.approval_run_id !== receipt.approval_run_id || evidence.records.length !== receipt.calls_started) throw new Error("receipt evidence binding mismatch");
  if (derivePlanRef(evidence.plan) !== receipt.plan_ref || !validateApproval(evidence.approval, evidence.plan, new Date(evidence.run.started_at)).valid) throw new Error("plan or approval binding mismatch");
  if (hash(Buffer.from(JSON.stringify(evidence.approval))) !== receipt.approval_sha256 || Date.parse(receipt.first_call_started_at) > Date.parse(evidence.records[0].started_at) || Date.parse(receipt.completed_at) < Date.parse(evidence.run.ended_at)) throw new Error("receipt approval or chronology mismatch");
  const spend = evidence.records.map((record) => record.cost_usd); const known = spend.every(Number.isFinite); const total = known ? spend.reduce((sum, value) => sum + value, 0) : null;
  if (receipt.actual_spend_known !== known || receipt.actual_spend_usd !== total) throw new Error("receipt spend mismatch");
  return { evidence, qualification, marker };
}

/** Exhaustively classify the current Llama cycle before deciding whether it may run. */
export async function findPriorOperationalRecovery(directory, dependencies = {}) {
  let names = []; try { names = await readdir(directory); } catch (error) { if (error.code === "ENOENT") return { state: "available", zero_call_attempts: [] }; throw error; }
  const legacy = (name) => /^story-1-11-2026-08-19-r[23](?:-|\.)/.test(name) || /^story-1-11-2026-08-22-l[24678](?:-|\.)/.test(name);
  const currentSuffix = /\.(?:spend-receipt\.json|complete\.json|evidence\.json|qualification\.json|report\.md)$/;
  const malformedCurrent = names.filter((name) => currentSuffix.test(name) && !legacy(name) && !RECEIPT.test(name) && !MARKER.test(name) && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:evidence\.json|qualification\.json|report\.md)$/.test(name));
  if (malformedCurrent.length) throw new Error(`malformed current-looking artifact names: ${malformedCurrent.sort().join(", ")}`);
  const currentMember = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:evidence\.json|qualification\.json|report\.md)$/;
  const current = names.filter((name) => !legacy(name) && (RECEIPT.test(name) || MARKER.test(name) || currentMember.test(name)));
  const receiptNames = current.filter((name) => RECEIPT.test(name)).sort(); const markerNames = current.filter((name) => MARKER.test(name)).sort();
  const receipts = []; for (const name of receiptNames) { const match = name.match(RECEIPT); let receipt; try { receipt = JSON.parse(await readStableNoFollow(path.join(directory, name))); } catch (error) { throw new Error(`unreadable receipt ${name}: ${error.message}`); } if (!receiptValid(receipt, match)) throw new Error(`invalid receipt ${name}`); receipts.push({ name, receipt }); }
  const planRefs = new Set(receipts.map(({ receipt }) => receipt.plan_ref)); const approvals = new Set(receipts.map(({ receipt }) => receipt.approval_sha256)); const runIds = new Set(receipts.map(({ receipt }) => receipt.approval_run_id)); const attempts = new Set(receipts.map(({ receipt }) => receipt.attempt_id));
  if (attempts.size !== receipts.length || planRefs.size > 1 || approvals.size > 1 || runIds.size > 1) throw new Error("receipt history crosses plan/run/approval cycle or duplicates an attempt");
  const completed = [];
  for (const item of receipts.filter(({ receipt }) => receipt.state === "completed-spent")) completed.push({ ...item, verified: await verifyCompletion(directory, item.receipt, item.receipt.completion_marker, dependencies) });
  const referenced = new Set(completed.flatMap(({ verified }) => [verified.marker.basename + ".complete.json", ...verified.marker.files.map(({ name }) => name)]));
  const orphans = current.filter((name) => !receiptNames.includes(name) && !referenced.has(name)); if (orphans.length) throw new Error(`orphan or conflicting current artifacts: ${orphans.join(", ")}`);
  if (markerNames.some((name) => !referenced.has(name))) throw new Error("orphan completion marker");
  const blocking = receipts.filter(({ receipt }) => receipt.calls_started > 0 && receipt.state !== "completed-spent");
  if (completed.length > 1 || (completed.length && blocking.length)) throw new Error("conflicting completed/called attempts");
  if (completed.length) return { state: "completed", allowance_consumed: true, ...completed[0] };
  if (blocking.length) return { state: "consumed_incomplete", allowance_consumed: true, attempts: blocking };
  if (receipts.some(({ receipt }) => receipt.state !== "zero-call")) throw new Error("ambiguous reservation cannot prove zero calls");
  return { state: "available", allowance_consumed: false, plan_ref: receipts[0]?.receipt.plan_ref ?? null, approval_run_id: receipts[0]?.receipt.approval_run_id ?? null, zero_call_attempts: receipts };
}
