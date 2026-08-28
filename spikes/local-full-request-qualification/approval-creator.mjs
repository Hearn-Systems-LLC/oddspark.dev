#!/usr/bin/env node
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalBytes, sha256, validateApproval, validatePlan } from "./contract.mjs";

const PLANS_DIRECTORY = fileURLToPath(new URL("./plans/", import.meta.url));
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PLAN_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.plan\.json$/;
const APPROVAL_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.approval\.json$/;

function canonicalTimestamp(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(`${label} must be an exact canonical ISO-8601 timestamp`);
  }
  return value;
}

function safeName(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value) || value.includes("/") || value.includes("\\") || value === "." || value === "..") {
    throw new TypeError(`${label} is unsafe`);
  }
  return value;
}

export function createApproval(input) {
  const expected = ["planBytes", "plan_sha256", "run_id", "approved_by", "approved_at", "expires_at", "decision"];
  if (input === null || typeof input !== "object" || Array.isArray(input)
      || Reflect.ownKeys(input).length !== expected.length || !expected.every((key) => Object.hasOwn(input, key))) {
    throw new TypeError("all and only closed approval inputs are required");
  }
  const { planBytes, plan_sha256, run_id, approved_by, approved_at, expires_at, decision } = input;
  let plan;
  try { plan = JSON.parse(planBytes); } catch { throw new TypeError("plan must be canonical unapproved plan bytes"); }
  if (!validatePlan(plan) || !Buffer.from(planBytes).equals(canonicalBytes(plan))) throw new TypeError("plan must be canonical unapproved plan bytes");
  if (!SHA.test(plan_sha256 ?? "") || plan_sha256 !== sha256(planBytes)) throw new TypeError("plan SHA-256 does not match exact plan bytes");
  if (!UUID.test(run_id ?? "") || run_id !== plan.run_id) throw new TypeError("run ID does not match exact plan bytes");
  if (typeof approved_by !== "string" || approved_by.trim() === "" || approved_by !== approved_by.trim() || approved_by.length > 200) throw new TypeError("approved-by must be exact nonblank owner metadata");
  const approvedAt = canonicalTimestamp(approved_at, "approved-at");
  const expiresAt = canonicalTimestamp(expires_at, "expires-at");
  if (Date.parse(approvedAt) >= Date.parse(expiresAt)) throw new TypeError("approval expiry must be after approval time");
  if (decision !== "approved") throw new TypeError("decision must be exactly approved");
  const approval = { schema_version: "oddspark.local-full-request-approval/v1", run_id, plan_sha256, approved_by, approved_at: approvedAt, expires_at: expiresAt, decision };
  if (!validateApproval(approval, planBytes, Date.parse(approvedAt))) throw new TypeError("approval failed closed validation");
  return approval;
}

async function openGovernedFile(directory, name, pattern, label) {
  const safe = safeName(name, pattern, label);
  const parent = await realpath(directory);
  const handle = await open(path.join(parent, safe), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new TypeError(`${label} must be a regular file`);
    return await handle.readFile();
  } finally { await handle.close(); }
}

export async function readGovernedPlan(name, { directory = PLANS_DIRECTORY } = {}) {
  return openGovernedFile(directory, name, PLAN_NAME, "plan path");
}

export async function writeApproval(approval, name, { directory = PLANS_DIRECTORY } = {}) {
  const safe = safeName(name, APPROVAL_NAME, "output path");
  const parent = await realpath(directory);
  const resolved = path.join(parent, safe);
  const bytes = canonicalBytes(approval);
  const handle = await open(resolved, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  const directoryHandle = await open(parent, constants.O_RDONLY);
  try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
  return { path: resolved, bytes, sha256: sha256(bytes) };
}

function options(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]; const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) throw new TypeError("approval arguments must be --name value pairs");
    const key = flag.slice(2).replaceAll("-", "_");
    if (Object.hasOwn(result, key)) throw new TypeError(`duplicate approval argument: ${flag}`);
    result[key] = value;
  }
  return result;
}

export async function runCli(argv = process.argv.slice(2), { directory = PLANS_DIRECTORY } = {}) {
  const supplied = options(argv);
  const expected = ["plan", "output", "plan_sha256", "run_id", "approved_by", "approved_at", "expires_at", "decision"];
  if (Object.keys(supplied).length !== expected.length || !expected.every((key) => Object.hasOwn(supplied, key))) throw new TypeError("all and only exact approval arguments are required");
  const planBytes = await readGovernedPlan(supplied.plan, { directory });
  const approval = createApproval({
    planBytes, plan_sha256: supplied.plan_sha256, run_id: supplied.run_id,
    approved_by: supplied.approved_by, approved_at: supplied.approved_at,
    expires_at: supplied.expires_at, decision: supplied.decision,
  });
  const retained = await writeApproval(approval, supplied.output, { directory });
  process.stdout.write(`${JSON.stringify({ path: retained.path, sha256: retained.sha256, plan_sha256: approval.plan_sha256, run_id: approval.run_id, decision: approval.decision, provider_calls: 0, adapter_starts: 0 })}\n`);
  return retained;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
