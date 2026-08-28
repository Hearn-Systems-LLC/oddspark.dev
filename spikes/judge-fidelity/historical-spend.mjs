import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { link, open, readFile, realpath, unlink } from "node:fs/promises";
import path from "node:path";

import { MODEL_IDS, stableStringify } from "./contract.mjs";
import { canonicalJsonBytes, parseCanonicalJsonBytes, verifyCompletedArtifactSet } from "./qualification.mjs";
import { validSpendReceipt } from "./recovery-finder.mjs";

export const HISTORICAL_CLOSURE_VERSION = "oddspark.judge-historical-spend-closure/v1";
export const HISTORICAL_CLOSURE_DOMAIN = "oddspark-judge-historical-spend-closure/v1";
export const HISTORICAL_ATTEMPT_ID = "f543d3d5-80d4-44f6-b7bf-41083197fcc9";
export const HISTORICAL_RUN_ID = "ba52ec91-fe85-4987-954d-71054a0acc3d";
export const HISTORICAL_CALLS = 42;
export const HISTORICAL_RECEIPT = ".judge-llama-cycle-spend.json";
export const HISTORICAL_BASENAME = "2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-v2";
export const HISTORICAL_MEMBERS = Object.freeze([
  HISTORICAL_RECEIPT,
  `${HISTORICAL_BASENAME}.json`,
  `${HISTORICAL_BASENAME}.md`,
  `${HISTORICAL_BASENAME.replace(/-v2$/, "")}-qualification.json`,
  `${HISTORICAL_BASENAME}.complete.json`,
]);

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const hex = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const finiteNonnegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const canonicalSystemPath = (resolved) => process.platform === "darwin"
  ? (resolved === "/var" || resolved.startsWith("/var/") ? `/private${resolved}` : resolved === "/tmp" || resolved.startsWith("/tmp/") ? `/private${resolved}` : resolved)
  : resolved;

export function deriveHistoricalClosureRef(closure) {
  const { closure_ref: _ignored, ...body } = closure;
  return hash(`${HISTORICAL_CLOSURE_DOMAIN}\n${stableStringify(body)}`);
}

async function readBoundMembers(resultsDir) {
  const physical = await realpath(resultsDir);
  if (physical !== canonicalSystemPath(path.resolve(resultsDir))) throw new Error("historical results directory must not contain symlink aliases");
  const values = new Map();
  for (const name of HISTORICAL_MEMBERS) {
    const target = path.join(physical, name);
    const resolved = await realpath(target);
    if (resolved !== target) throw new Error(`historical member is a symlink or alias: ${name}`);
    values.set(name, await readFile(target));
  }
  return values;
}

export async function buildHistoricalSpendClosure(resultsDir) {
  const members = await readBoundMembers(resultsDir);
  const receiptParsed = parseCanonicalJsonBytes(members.get(HISTORICAL_RECEIPT), "historical receipt");
  const evidenceParsed = parseCanonicalJsonBytes(members.get(`${HISTORICAL_BASENAME}.json`), "historical evidence");
  const qualificationParsed = parseCanonicalJsonBytes(members.get(`${HISTORICAL_BASENAME.replace(/-v2$/, "")}-qualification.json`), "historical qualification");
  if (!receiptParsed.valid || !evidenceParsed.valid || !qualificationParsed.valid) throw new Error([...receiptParsed.errors, ...evidenceParsed.errors, ...qualificationParsed.errors].join("; "));
  const completed = await verifyCompletedArtifactSet(resultsDir, `${HISTORICAL_BASENAME}.complete.json`, [
    `${HISTORICAL_BASENAME}.json`, `${HISTORICAL_BASENAME}.md`, `${HISTORICAL_BASENAME.replace(/-v2$/, "")}-qualification.json`,
  ]);
  if (!completed.valid) throw new Error(`historical completion set is invalid: ${completed.errors.join("; ")}`);
  const receipt = receiptParsed.value;
  const evidence = evidenceParsed.value;
  const qualification = qualificationParsed.value;
  const markdown = members.get(`${HISTORICAL_BASENAME}.md`).toString("utf8");
  if (!validSpendReceipt(receipt, HISTORICAL_CALLS) || receipt.state !== "completed-spent"
    || receipt.attempt_id !== HISTORICAL_ATTEMPT_ID || receipt.approval_run_id !== HISTORICAL_RUN_ID || receipt.calls_started !== HISTORICAL_CALLS) {
    throw new Error("historical receipt is not the exact terminal completed spend");
  }
  if (evidence?.run?.id !== HISTORICAL_RUN_ID || evidence?.run?.authorization?.calls_made !== HISTORICAL_CALLS
    || !Array.isArray(evidence.records) || evidence.records.length !== HISTORICAL_CALLS || evidence.report !== markdown
    || qualification?.evidence?.run_id !== HISTORICAL_RUN_ID || qualification?.evidence?.sha256 !== hash(members.get(`${HISTORICAL_BASENAME}.json`))
    || qualification?.outcome?.cycle_available !== false || qualification?.plan?.maximum_cost?.total_calls !== HISTORICAL_CALLS) {
    throw new Error("historical evidence, receipt, and qualification do not close the same invocation");
  }
  const sequenceClosed = evidence.records.filter((record) => record?.model === MODEL_IDS[0]).length === 21
    && evidence.records.filter((record) => record?.model === MODEL_IDS[1]).length === 21
    && receipt.last_call?.sequence === HISTORICAL_CALLS
    && receipt.last_call?.model === evidence.records.at(-1)?.model
    && receipt.last_call?.kind === evidence.records.at(-1)?.kind
    && receipt.last_call?.index === evidence.records.at(-1)?.index;
  if (!sequenceClosed) throw new Error("historical call sequence does not close at the receipt boundary");
  const observed = qualification.manifests?.map((manifest) => manifest?.latency_cost?.observed_cost);
  const usage = qualification.manifests?.map((manifest) => manifest?.latency_cost?.usage);
  if (!Array.isArray(observed) || observed.length !== 2 || observed[0]?.computable !== true || observed[1]?.computable !== false
    || !finiteNonnegative(observed[0]?.gross_usd) || observed[1]?.gross_usd !== null
    || usage?.some((item) => item?.reported_calls !== 21 || item?.missing_calls !== 0 || item?.overflow !== false)) {
    throw new Error("historical cost state is incomplete or ambiguously represented");
  }
  const closure = {
    schema_version: HISTORICAL_CLOSURE_VERSION,
    closure_ref: "",
    state: "terminal-closed",
    invocation: { attempt_id: HISTORICAL_ATTEMPT_ID, approval_run_id: HISTORICAL_RUN_ID, calls_started: HISTORICAL_CALLS, runner_invocations: 1, retries: 0, replacements: 0 },
    accounting: {
      cumulative_historical_calls: HISTORICAL_CALLS,
      exact_observed_priced_usd: observed[0].gross_usd,
      unpriced_models: [MODEL_IDS[1]],
      conservative_historical_cap_usd: qualification.plan.maximum_cost.gross_usd,
      conservative_historical_cap_neurons: qualification.plan.maximum_cost.gross_neurons,
      reset_permitted: false,
    },
    identities: {
      source_identity_sha256: qualification.plan.identities.source_identity_sha256,
      runtime_identity_sha256: qualification.plan.identities.runtime_identity_sha256,
      plan_ref: qualification.plan.plan_ref,
      evidence_sha256: qualification.evidence.sha256,
    },
    members: HISTORICAL_MEMBERS.map((name) => ({ name, bytes: members.get(name).byteLength, sha256: hash(members.get(name)) })),
  };
  closure.closure_ref = deriveHistoricalClosureRef(closure);
  return closure;
}

export async function verifyHistoricalSpendClosure(resultsDir, closureOrBytes) {
  const errors = [];
  try {
    const parsed = Buffer.isBuffer(closureOrBytes) ? parseCanonicalJsonBytes(closureOrBytes, "historical closure") : { valid: true, value: closureOrBytes, errors: [] };
    if (!parsed.valid) return { valid: false, errors: parsed.errors, closure: null };
    const closure = parsed.value;
    const expected = await buildHistoricalSpendClosure(resultsDir);
    if (!exact(closure, ["schema_version", "closure_ref", "state", "invocation", "accounting", "identities", "members"])) errors.push("historical closure must be a closed object");
    if (closure?.schema_version !== HISTORICAL_CLOSURE_VERSION || closure?.state !== "terminal-closed") errors.push("historical closure state or version is invalid");
    if (!hex(closure?.closure_ref) || closure?.closure_ref !== deriveHistoricalClosureRef(closure)) errors.push("historical closure reference is invalid");
    if (stableStringify(closure) !== stableStringify(expected)) errors.push("historical closure does not match the independently reconstructed terminal set");
    return { valid: errors.length === 0, errors, closure };
  } catch (error) {
    return { valid: false, errors: [`historical closure verification failed: ${String(error?.code ?? error?.message ?? error)}`], closure: null };
  }
}

export async function writeHistoricalSpendClosure(resultsDir, outputPath) {
  const physicalParent = await realpath(path.dirname(path.resolve(outputPath)));
  if (physicalParent !== canonicalSystemPath(path.resolve(path.dirname(outputPath)))) throw new Error("historical closure output directory must not contain symlink aliases");
  const target = path.join(physicalParent, path.basename(outputPath));
  const closure = await buildHistoricalSpendClosure(resultsDir);
  const temporary = path.join(physicalParent, `.${path.basename(outputPath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(canonicalJsonBytes(closure));
    await handle.sync();
    await handle.close(); handle = null;
    await link(temporary, target);
    const directoryHandle = await open(physicalParent, "r");
    try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
    const verified = await verifyHistoricalSpendClosure(resultsDir, await readFile(target));
    if (!verified.valid) throw new Error(`created historical closure failed verification: ${verified.errors.join("; ")}`);
    return closure;
  } finally {
    await handle?.close().catch(() => {});
    await unlink(temporary).catch(() => {});
  }
}
