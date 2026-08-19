// Prior recovery discovery — scans the results directory for evidence of
// previously retained operational recoveries (spend receipts, evidence files,
// partial publications). Extracted from run.mjs for testability and readability.

import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";

import { MODEL_IDS, stableStringify } from "./contract.mjs";
import { verifyEvidenceV2 } from "./evidence-v2.mjs";
import {
  RECOVERY_COMPLETION_VERSION,
  parseCanonicalJsonBytes,
  derivePlanRef,
  sourceIdentity,
  validateApproval,
  validateRecoveryPlan,
  verifyCompletedArtifactSet,
  verifyQualificationBundle,
} from "./qualification.mjs";

const hex = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const zeroRate = (rate) => exact(rate, ["numerator", "denominator", "percent"]) && rate.numerator === 0 && rate.denominator === 0 && rate.percent === 0;
function retainedPreflightBlockers(checks) {
  if (!plain(checks) || !plain(checks.approval_preflight) || !plain(checks.adapter) || !plain(checks.approval_at_run_start)
    || !Array.isArray(checks.offline_errors) || !Array.isArray(checks.approval_preflight.errors) || !Array.isArray(checks.approval_at_run_start.errors)) return null;
  const blockers = [];
  if (!checks.plan_match) blockers.push("frozen plan differs from current repository/runtime/request disclosure");
  for (const error of checks.approval_preflight.errors) blockers.push(`approval: ${error}`);
  for (const error of checks.offline_errors) blockers.push(`offline gate: ${error}`);
  if (!checks.adapter.attempted) blockers.push("adapter identity preflight skipped because earlier authority or offline gates failed");
  else if (!checks.adapter.identity_match) blockers.push("adapter identity preflight failed");
  if (checks.approval_preflight.valid && !checks.approval_at_run_start.valid) {
    for (const error of checks.approval_at_run_start.errors) blockers.push(`run-start approval: ${error}`);
  }
  return blockers;
}

export function verifyHistoricalZeroCall({ evidence, evidenceBytes, evidenceFile, markdown, qualification }) {
  const errors = [];
  const fail = (condition, message) => { if (!condition) errors.push(message); };
  try {
    const run = evidence?.run;
    const auth = run?.authorization;
    const checks = run?.preflight_checks;
    fail(evidence?.schema_version === "oddspark.judge-recovery-evidence/v2" && evidence?.profile === "operational", "not operational evidence-v2");
    fail(Array.isArray(evidence?.records) && evidence.records.length === 0, "records do not prove zero calls");
    fail(auth?.calls_made === 0 && Number.isSafeInteger(auth?.approved_call_cap), "authorization does not prove zero calls");
    fail(Array.isArray(run?.preflight_blockers) && run.preflight_blockers.length > 0, "run was not preflight blocked");
    const derivedBlockers = retainedPreflightBlockers(checks);
    fail(Array.isArray(derivedBlockers) && stableStringify(derivedBlockers) === stableStringify(run?.preflight_blockers), "preflight blockers do not derive from retained checks");
    fail(typeof evidence?.report === "string" && markdown === evidence.report, "Markdown does not equal retained report");
    fail(Array.isArray(evidence?.predicate_results) && evidence.predicate_results.length > 0
      && evidence.predicate_results.every((item) => exact(item, ["id", "pass"]) && typeof item.id === "string" && item.pass === true), "retained predicate result is not a historical pass");

    fail(qualification?.schema_version === "oddspark.judge-qualification-bundle/v1", "qualification bundle version mismatch");
    fail(qualification?.evidence?.file === evidenceFile
      && qualification?.evidence?.sha256 === hash(evidenceBytes)
      && qualification?.evidence?.schema_version === evidence.schema_version
      && qualification?.evidence?.run_id === run?.id
      && stableStringify(qualification?.evidence?.predicate_results) === stableStringify(evidence?.predicate_results), "qualification evidence binding mismatch");
    fail(Array.isArray(qualification?.qualification_refs) && qualification.qualification_refs.length === 0, "zero-call bundle contains qualification refs");
    fail(qualification?.outcome?.decision === "NO-GO" && qualification?.outcome?.third_matrix_permitted === true, "zero-call bundle does not preserve allowance");

    const plan = qualification?.plan;
    fail(plan?.approval_run_id === run?.id && plan?.plan_ref === derivePlanRef(plan), "plan is not bound to the zero-call run");
    fail(validateRecoveryPlan(plan, { legacy: evidence?.legacy }).valid, "retained plan is invalid");
    fail(plan?.identities?.source_identity_sha256 === sourceIdentity(evidence?.sources ?? []).manifest_sha256, "plan is not bound to retained sources");
    if (qualification?.approval !== null) {
      fail(validateApproval(qualification.approval, plan, new Date(run?.started_at)).valid, "retained approval was not valid at preflight");
      fail(qualification?.approval_check?.valid === true, "approval check was not retained as valid");
    }

    fail(Array.isArray(qualification?.manifests) && qualification.manifests.length === MODEL_IDS.length, "zero-call manifests are incomplete");
    for (const [index, manifest] of (qualification?.manifests ?? []).entries()) {
      const counts = manifest?.trial_counts;
      const rates = manifest?.rates;
      const usage = manifest?.latency_cost?.usage;
      const observed = manifest?.latency_cost?.observed_cost;
      fail(manifest?.resolved_model === MODEL_IDS[index] && manifest?.approval_run_id === run?.id && manifest?.outcome === "NO-GO", "zero-call manifest identity or outcome mismatch");
      fail(counts?.probes === 0 && counts?.trials === 0 && plain(counts?.classifications)
        && Object.values(counts.classifications).every((value) => value === 0), "zero-call manifest contains calls");
      fail(rates?.total === 0 && rates?.direct_valid === 0 && rates?.repaired_valid === 0
        && zeroRate(rates?.direct_rate) && zeroRate(rates?.post_repair_rate), "zero-call rates are nonzero");
      fail(usage?.reported_calls === 0 && usage?.missing_calls === 0 && usage?.prompt_tokens === 0
        && usage?.completion_tokens === 0 && usage?.total_tokens === 0, "zero-call usage is nonzero");
      fail(observed?.computable === true && observed?.partial === false && observed?.input_usd === 0
        && observed?.output_usd === 0 && observed?.gross_usd === 0 && observed?.gross_neurons === 0, "zero-call observed cost is nonzero");
    }
  } catch (error) {
    errors.push(`historical zero-call verification contained malformed input: ${String(error?.message ?? error)}`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Scan the results directory for evidence of prior operational recoveries.
 *
 * Returns one of:
 *   - { malformed: true, blocking_reason, ... }  — unsafe state, must resolve manually
 *   - { malformed: false, blocking_reason, ... }  — verified spend confirmed
 *   - { safe_zero_call_receipt: true, ... }       — zero-call artifact clears reservation
 *   - undefined                                   — no prior recovery found; safe to proceed
 */
export async function findPriorOperationalRecovery(resultsDir, options = {}) {
  // Support both direct dependency injection and nested evidenceDependencies pattern
  const evidenceDeps = options.evidenceDependencies ?? (options.currentSourceIdentity ? options : {});
  const {
    RECOVERY_RECEIPT_FILE = ".judge-recovery-spend.json",
    APPROVED_CALL_CAP = 42,
    verifyEvidenceV2: verifyFn = verifyEvidenceV2,
    verifyQualificationBundle: verifyQualFn = verifyQualificationBundle,
    parseCanonicalJsonBytes: parseFn = parseCanonicalJsonBytes,
  } = options;

  let entries = [];
  try { entries = await readdir(resultsDir); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  let spentReceipt = null;
  let reservedReceipt = null;
  let receiptFallback = null;

  // --- Spend receipt analysis ---
  if (entries.includes(RECOVERY_RECEIPT_FILE)) {
    let receipt;
    try {
      receipt = JSON.parse(await readFile(path.join(resultsDir, RECOVERY_RECEIPT_FILE), "utf8"));
    } catch {
      return { evidence_file: null, qualification_file: null, qualification_refs: [], malformed: true, blocking_reason: "spend receipt is unreadable" };
    }
    if (!validSpendReceipt(receipt, APPROVED_CALL_CAP)) {
      return { evidence_file: null, qualification_file: null, qualification_refs: [], malformed: true, receipt_file: RECOVERY_RECEIPT_FILE, blocking_reason: "spend receipt proves or cannot disprove provider invocation" };
    }
    if (receipt.calls_started > 0 || receipt.state !== "reserved") {
      spentReceipt = receipt;
      receiptFallback = { evidence_file: null, qualification_file: null, qualification_refs: [], malformed: false, receipt_file: RECOVERY_RECEIPT_FILE, blocking_reason: "spend receipt proves or cannot disprove provider invocation" };
    } else {
      reservedReceipt = receipt;
    }
  }

  // --- Invalid artifact check ---
  const invalidArtifact = entries.find((entry) => entry.endsWith("-v2-invalid.json"));
  if (invalidArtifact && !spentReceipt) {
    return { evidence_file: invalidArtifact, qualification_file: null, qualification_refs: [], malformed: true, blocking_reason: "invalid retained evidence cannot disprove spend" };
  }

  // --- Evidence file enumeration ---
  const evidenceNames = entries.filter((entry) => entry.endsWith("-v2.json")).sort();
  const temporaryArtifacts = entries.filter((entry) => entry.endsWith(".tmp"));
  const explainedTemporaryArtifacts = new Set();
  const expectedSiblings = new Set(
    evidenceNames.flatMap((name) => [
      name.replace(/\.json$/, ".md"),
      name.replace(/-v2\.json$/, "-qualification.json"),
      `${name.replace(/\.json$/, "")}.complete.json`,
    ])
  );

  // Partial publication check
  const partial = entries.find(
    (entry) =>
      (entry.endsWith("-v2.md") && !expectedSiblings.has(entry)) ||
      (entry.endsWith("-qualification.json") && !expectedSiblings.has(entry)) ||
      (entry.endsWith("-v2.complete.json") && !expectedSiblings.has(entry))
  );
  if (partial && !spentReceipt) {
    return { evidence_file: partial, qualification_file: null, qualification_refs: [], malformed: true, blocking_reason: "partial recovery publication cannot disprove spend" };
  }

  // --- Per-evidence verification ---
  for (const name of evidenceNames) {
    if (spentReceipt && !name.endsWith(`-${spentReceipt.attempt_id}-v2.json`)) continue;

    const basename = name.replace(/\.json$/, "");
    const markerName = `${basename}.complete.json`;
    const expectedMemberNames = [name, name.replace(/\.json$/, ".md"), name.replace(/-v2\.json$/, "-qualification.json")];

    const completed = await verifyCompletedArtifactSet(resultsDir, markerName, expectedMemberNames);
    if (!completed.valid) {
      if (spentReceipt) continue;
      return { evidence_file: name, qualification_file: expectedMemberNames[2], qualification_refs: [], malformed: true, blocking_reason: "partial recovery publication lacks a valid completion marker" };
    }

    // Explain temporary artifacts bound to this evidence set
    for (const temporary of temporaryArtifacts) {
      const boundName = [...expectedMemberNames, markerName].find(
        (member) => temporary.startsWith(`.${member}.`) && temporary.endsWith(".tmp")
      );
      if (!boundName) continue;
      try {
        const temporaryBytes = await readFile(path.join(resultsDir, temporary));
        const binding =
          boundName === markerName
            ? { bytes: Buffer.byteLength(`${JSON.stringify(completed.marker, null, 2)}\n`), sha256: hash(`${JSON.stringify(completed.marker, null, 2)}\n`) }
            : completed.marker.files.find(({ name: memberName }) => memberName === boundName);
        if (binding && temporaryBytes.byteLength === binding.bytes && hash(temporaryBytes) === binding.sha256) {
          explainedTemporaryArtifacts.add(temporary);
        }
      } catch {
        /* unexplained temporary remains blocking */
      }
    }

    // Read and verify evidence
    let evidence;
    let evidenceBytes;
    try {
      evidenceBytes = await readFile(path.join(resultsDir, name));
      evidence = JSON.parse(evidenceBytes.toString("utf8"));
    } catch {
      if (spentReceipt) continue;
      return { evidence_file: name, qualification_file: name.replace(/-v2\.json$/, "-qualification.json"), qualification_refs: [], malformed: true, blocking_reason: "evidence is unreadable" };
    }

    const markdownName = name.replace(/\.json$/, ".md");
    const qualificationName = name.replace(/-v2\.json$/, "-qualification.json");
    let markdown;
    let evidenceVerification;
    try {
      markdown = await readFile(path.join(resultsDir, markdownName), "utf8");
      evidenceVerification = await verifyFn(evidence, evidenceDeps ?? {});
    } catch {
      /* handled below */
    }
    // Read and verify qualification bundle
    let qualification;
    let qualificationVerification;
    try {
      qualification = JSON.parse(await readFile(path.join(resultsDir, qualificationName), "utf8"));
      qualificationVerification = await verifyQualFn(qualification, evidence, evidenceBytes, evidenceDeps ?? {});
    } catch {
      /* unverified */
    }

    const historicalZeroCallVerification = evidence?.records?.length === 0
      ? verifyHistoricalZeroCall({ evidence, evidenceBytes, evidenceFile: name, markdown, qualification })
      : { valid: false, errors: ["not a zero-call artifact"] };
    const currentVerificationValid = evidenceVerification?.valid === true && markdown === evidence?.report && qualificationVerification?.valid === true;
    if (!currentVerificationValid && !historicalZeroCallVerification.valid) {
      if (spentReceipt) continue;
      return { evidence_file: name, qualification_file: qualificationName, qualification_refs: [], malformed: true, blocking_reason: "evidence or Markdown failed complete verification and historical zero-call proof is invalid" };
    }

    if (spentReceipt) {
      const receiptMatchesEvidence =
        evidence.run.id === spentReceipt.approval_run_id &&
        evidence.records.length === spentReceipt.calls_started;
      if (!receiptMatchesEvidence || !qualificationVerification?.valid) continue;
      return {
        evidence_file: name, qualification_file: qualificationName,
        qualification_refs: qualification.qualification_refs, refs_verified: true,
        malformed: false, receipt_file: RECOVERY_RECEIPT_FILE,
        blocking_reason: "verified evidence shows provider calls were started",
      };
    }

    // Zero-call artifact check
    if (evidence.records.length === 0) {
      if (reservedReceipt && name.endsWith(`-${reservedReceipt.attempt_id}-v2.json`) && evidence.run.id === reservedReceipt.approval_run_id) {
        receiptFallback = {
          evidence_file: name, qualification_file: qualificationName, qualification_refs: [], refs_verified: true,
          malformed: false, receipt_file: RECOVERY_RECEIPT_FILE, safe_zero_call_receipt: true, historical_zero_call: !currentVerificationValid, attempt_id: reservedReceipt.attempt_id,
        };
      }
      continue;
    }

    const qualificationRefs = qualificationVerification?.valid ? qualification.qualification_refs : [];
    return {
      evidence_file: name, qualification_file: qualificationName,
      qualification_refs: qualificationRefs, refs_verified: qualificationVerification?.valid === true,
      malformed: !qualificationVerification?.valid,
      blocking_reason: "verified evidence shows provider calls were started",
    };
  }

  // --- Unexplained temporary artifacts ---
  const unexplainedTemporary = temporaryArtifacts.find((entry) => !explainedTemporaryArtifacts.has(entry));
  if (unexplainedTemporary && !spentReceipt) {
    return { evidence_file: unexplainedTemporary, qualification_file: null, qualification_refs: [], malformed: true, blocking_reason: "partial recovery publication cannot disprove spend" };
  }

  // --- Reserved receipt without matching zero-call artifact ---
  if (reservedReceipt && !receiptFallback?.safe_zero_call_receipt) {
    return {
      evidence_file: null, qualification_file: null, qualification_refs: [], malformed: false,
      receipt_file: RECOVERY_RECEIPT_FILE,
      blocking_reason: "reserved spend receipt lacks a complete independently verified zero-call artifact for the same attempt",
    };
  }

  return receiptFallback;
}

/**
 * Validate a spend receipt against the known schema and call cap.
 * Allows extra internal keys (prefixed with `_`) for future extensibility.
 */
export function validSpendReceipt(receipt, approvedCallCap) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return false;

  const requiredKeys = ["schema_version", "attempt_id", "approval_run_id", "created_at", "updated_at", "state", "calls_started", "last_call"];
  const allowedInternalPrefix = "_";
  const allAllowedKeys = new Set([...requiredKeys]);

  // Allow extra keys that start with underscore (internal extension mechanism)
  for (const key of Object.keys(receipt)) {
    if (!allAllowedKeys.has(key) && !key.startsWith(allowedInternalPrefix)) return false;
  }

  // Check all required keys are present
  for (const key of requiredKeys) {
    if (!Object.hasOwn(receipt, key)) return false;
  }

  if (receipt.schema_version !== "oddspark.judge-recovery-spend/v1") return false;
  if (typeof receipt.attempt_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receipt.attempt_id)) return false;
  if (typeof receipt.approval_run_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receipt.approval_run_id)) return false;

  const canonicalTimestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  if (!canonicalTimestamp(receipt.created_at) || !canonicalTimestamp(receipt.updated_at)) return false;
  if (!["reserved", "calls-started", "completed-spent"].includes(receipt.state)) return false;
  if (!Number.isSafeInteger(receipt.calls_started) || receipt.calls_started < 0 || receipt.calls_started > approvedCallCap) return false;

  const callKeys = ["sequence", "kind", "model", "index", "marked_at"];
  const lastCall = receipt.last_call;

  if (receipt.calls_started === 0) {
    if (receipt.state !== "reserved" || lastCall !== null) return false;
  } else {
    if (!["calls-started", "completed-spent"].includes(receipt.state)) return false;
    if (!lastCall || typeof lastCall !== "object" || Array.isArray(lastCall)) return false;
    if (Object.keys(lastCall).length !== callKeys.length) return false;
    for (const key of callKeys) {
      if (!Object.hasOwn(lastCall, key)) return false;
    }
    if (lastCall.sequence !== receipt.calls_started) return false;
    if (!["probe", "trial"].includes(lastCall.kind)) return false;
    if (!MODEL_IDS.includes(lastCall.model)) return false;
    if (!Number.isSafeInteger(lastCall.index) || lastCall.index < 1) return false;
    if (!canonicalTimestamp(lastCall.marked_at)) return false;
  }

  return true;
}
