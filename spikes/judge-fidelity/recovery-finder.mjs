// Prior recovery discovery — scans the results directory for evidence of
// previously retained operational recoveries (spend receipts, evidence files,
// partial publications). Extracted from run.mjs for testability and readability.

import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";

import { MODEL_IDS } from "./contract.mjs";
import { verifyEvidenceV2 } from "./evidence-v2.mjs";
import {
  RECOVERY_COMPLETION_VERSION,
  parseCanonicalJsonBytes,
  verifyCompletedArtifactSet,
  verifyQualificationBundle,
} from "./qualification.mjs";

const hex = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());

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
    if (!evidenceVerification?.valid || markdown !== evidence?.report) {
      if (spentReceipt) continue;
      return { evidence_file: name, qualification_file: qualificationName, qualification_refs: [], malformed: true, blocking_reason: "evidence or Markdown failed complete verification" };
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
      if (!qualificationVerification?.valid) {
        return { evidence_file: name, qualification_file: qualificationName, qualification_refs: [], malformed: true, blocking_reason: "zero-call artifact is incomplete or its qualification bundle is invalid" };
      }
      if (reservedReceipt && name.endsWith(`-${reservedReceipt.attempt_id}-v2.json`) && evidence.run.id === reservedReceipt.approval_run_id) {
        receiptFallback = {
          evidence_file: name, qualification_file: qualificationName, qualification_refs: [], refs_verified: true,
          malformed: false, receipt_file: RECOVERY_RECEIPT_FILE, safe_zero_call_receipt: true, attempt_id: reservedReceipt.attempt_id,
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
