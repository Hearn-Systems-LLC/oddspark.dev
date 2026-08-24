// Prior recovery discovery — scans the results directory for evidence of
// previously retained operational recoveries (spend receipts, evidence files,
// partial publications). Extracted from run.mjs for testability and readability.

import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";

import { LEGACY_MODEL_IDS, MODEL_IDS, stableStringify } from "./contract.mjs";
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

// Owner-reviewed completed cycles (spec-1-4 Llama cycle change log, 2026-08-22):
// after fully-published, independently verified NO-GO cycles, Justin granted successor
// matrices (wire-schema flattening; then the adapter single-representation fix).
// These exact sets are immutable history; they no longer block plan generation, but
// any new artifact outside this list remains blocking. Verification below re-checks
// marker bytes, bundle/evidence bindings, NO-GO outcome, and zero emitted refs.
const OWNER_REVIEWED_PREFIXES = Object.freeze([
  "2026-08-22-e848e2bd-ecd55b947f985a3e-9047f82c-9e53-4db1-8d8b-744f4b92b1e4",
  "2026-08-22-e848e2bd-f5582e1bc9bfec5a-50e5102a-85d8-415a-9715-aa5e79666361",
  "2026-08-22-e848e2bd-d072356c9de6a906-c43fb299-6891-4f10-aebe-e49cbf3f770c",
  "2026-08-22-c0b94e4a-819dd1f7ed29e093-286bd0b2-4e62-4e1b-83c4-6b69653f2a31",
  "2026-08-22-c0b94e4a-d2a2402b331a4487-ee3dbc1c-50dc-48f4-9017-7790a0b6d29a",
  "2026-08-22-467ba931-9be44152aeb9a440-20d88746-a496-4b34-b0a5-8a694a4989d2",
  "2026-08-23-a0ed5363-5808d7c90aa1d93f-fd8c9785-69d0-4548-b773-d679452dc6f9",
  "2026-08-23-a0ed5363-c024fbc0a91b9098-4b10ebef-9df3-4043-a728-b508445aa67c",
  "2026-08-23-a0ed5363-e7a552940fd217c6-c1cb098e-e33a-4341-b72e-87d02d2a185c",
  "2026-08-23-a64f9601-bc745f5e28b4fd21-e2e70ad6-4b1f-4777-8f91-2d33c072ab70",
]);
// Sprint Change Proposal 2026-08-24 superseded this exact completed GO identity
// after the independently retained Story 1.18 semantic NO-GO. Its refs remain
// immutable history but cannot authorize Decision protocol v2.
const OWNER_SUPERSEDED_GO_PREFIXES = Object.freeze([
  "2026-08-23-a0ed5363-01e3976da21ab40e-620e2f14-8f42-47a2-8f83-854c41f017e6",
  "2026-08-24-7c2c3860-cec14a30a3411043-3f980f8c-8e1d-45ba-bd87-ef961d1a808c",
]);
// When a successor cycle is granted, the owner-reviewed completed-spend receipt is
// archived (bytes preserved, renamed aside) so the single-file receipt slot is reusable.
export const OWNER_REVIEWED_SPENDS = Object.freeze([
  Object.freeze({ attempt_id: "c43fb299-6891-4f10-aebe-e49cbf3f770c", approval_run_id: "e848e2bd-dc86-40e0-90da-45bee83fcc6d", calls_started: 42, archive: "2026-08-22-e848e2bd-c43fb299.spend-receipt.json" }),
  Object.freeze({ attempt_id: "20d88746-a496-4b34-b0a5-8a694a4989d2", approval_run_id: "467ba931-4e31-450a-93ce-f05f62e4db73", calls_started: 42, archive: "2026-08-22-467ba931-20d88746.spend-receipt.json" }),
  Object.freeze({ attempt_id: "620e2f14-8f42-47a2-8f83-854c41f017e6", approval_run_id: "a0ed5363-a126-4b2e-bd63-4bd4974b1c8b", calls_started: 42, archive: "2026-08-23-a0ed5363-620e2f14.spend-receipt.json" }),
  Object.freeze({ attempt_id: "3f980f8c-8e1d-45ba-bd87-ef961d1a808c", approval_run_id: "7c2c3860-77da-4b9b-aad1-3313f9704c6b", calls_started: 42, archive: "2026-08-24-7c2c3860-3f980f8c.spend-receipt.json" }),
]);
export const OWNER_REVIEWED_RECEIPT_ARCHIVES = Object.freeze(OWNER_REVIEWED_SPENDS.map((spend) => spend.archive));
async function classifyHistoricalArtifacts(resultsDir, entries) {
  const historical = new Set();
  const legacyModels = (evidence) => stableStringify(evidence?.run?.models) === stableStringify(LEGACY_MODEL_IDS);
  for (const name of entries.filter((entry) => entry.endsWith("-v2.json") || entry.endsWith("-v2-invalid.json"))) {
    try {
      const evidence = JSON.parse(await readFile(path.join(resultsDir, name), "utf8"));
      if (legacyModels(evidence)) {
        historical.add(name);
        if (name.endsWith("-v2.json")) {
          historical.add(name.replace(/\.json$/, ".md"));
          historical.add(name.replace(/-v2\.json$/, "-qualification.json"));
          historical.add(`${name.replace(/\.json$/, "")}.complete.json`);
        }
      }
    } catch { /* malformed identity remains ambiguous/current and blocking */ }
  }
  for (const markerName of entries.filter((entry) => entry.endsWith("-v2.complete.json"))) {
    try {
      const markerBytes = await readFile(path.join(resultsDir, markerName));
      const marker = JSON.parse(markerBytes.toString("utf8"));
      const expectedBase = markerName.slice(0, -".complete.json".length);
      const expected = [`${expectedBase}.json`, `${expectedBase}.md`, `${expectedBase.replace(/-v2$/, "")}-qualification.json`];
      if (!exact(marker, ["schema_version", "basename", "files"]) || !["oddspark.judge-recovery-completion/v1", "oddspark.judge-cycle-completion/v2"].includes(marker.schema_version)
        || marker.basename !== expectedBase || !Array.isArray(marker.files) || stableStringify(marker.files.map(({ name }) => name)) !== stableStringify(expected)) continue;
      const bytes = new Map();
      let valid = true;
      for (const binding of marker.files) {
        const member = await readFile(path.join(resultsDir, binding.name));
        if (!exact(binding, ["name", "bytes", "sha256"]) || member.byteLength !== binding.bytes || hash(member) !== binding.sha256) { valid = false; break; }
        bytes.set(binding.name, member);
      }
      if (!valid) continue;
      const evidence = JSON.parse(bytes.get(expected[0]).toString("utf8"));
      const bundle = JSON.parse(bytes.get(expected[2]).toString("utf8"));
      const bindingOk = bundle?.evidence?.file === expected[0] && bundle.evidence.sha256 === hash(bytes.get(expected[0]))
        && bundle.evidence.run_id === evidence?.run?.id && bytes.get(expected[1]).toString("utf8") === evidence?.report;
      const legacyOk = legacyModels(evidence) && bundle?.schema_version === "oddspark.judge-qualification-bundle/v1";
      const ownerReviewed = OWNER_REVIEWED_PREFIXES.some((prefix) => expectedBase.startsWith(prefix));
      const reviewedOk = ownerReviewed && bundle?.schema_version === "oddspark.judge-qualification-bundle/v2"
        && bundle?.outcome?.decision === "NO-GO"
        && Array.isArray(bundle?.qualification_refs) && bundle.qualification_refs.length === 0
        && (bundle?.role_qualification_ref ?? null) === null;
      const ownerSupersededGo = OWNER_SUPERSEDED_GO_PREFIXES.some((prefix) => expectedBase.startsWith(prefix));
      const supersededGoOk = ownerSupersededGo && bundle?.schema_version === "oddspark.judge-qualification-bundle/v2"
        && bundle?.outcome?.decision === "GO"
        && Array.isArray(bundle?.qualification_refs) && bundle.qualification_refs.length === MODEL_IDS.length
        && bundle.qualification_refs.every((item, index) => item?.model === MODEL_IDS[index] && hex(item?.qualification_ref))
        && hex(bundle?.role_qualification_ref);
      if (!bindingOk || (!legacyOk && !reviewedOk && !supersededGoOk)) continue;
      [markerName, ...expected].forEach((entry) => historical.add(entry));
    } catch { /* incomplete historical-looking set remains blocking unless evidence identity classified it */ }
  }
  for (const temporary of entries.filter((entry) => entry.endsWith(".tmp"))) {
    if ([...historical].some((member) => temporary.startsWith(`.${member}.`))) historical.add(temporary);
  }
  return historical;
}
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

    fail(qualification?.schema_version === "oddspark.judge-qualification-bundle/v2", "qualification bundle version mismatch");
    fail(qualification?.evidence?.file === evidenceFile
      && qualification?.evidence?.sha256 === hash(evidenceBytes)
      && qualification?.evidence?.schema_version === evidence.schema_version
      && qualification?.evidence?.run_id === run?.id
      && stableStringify(qualification?.evidence?.predicate_results) === stableStringify(evidence?.predicate_results), "qualification evidence binding mismatch");
    fail(Array.isArray(qualification?.qualification_refs) && qualification.qualification_refs.length === 0, "zero-call bundle contains qualification refs");
    fail(qualification?.outcome?.decision === "NO-GO" && qualification?.outcome?.cycle_available === true, "zero-call bundle does not preserve cycle availability");

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
      const exactPricePublished = index === 0;
      fail(observed?.computable === exactPricePublished && observed?.partial === false
        && observed?.input_usd === (exactPricePublished ? 0 : null)
        && observed?.output_usd === (exactPricePublished ? 0 : null)
        && observed?.gross_usd === (exactPricePublished ? 0 : null)
        && observed?.gross_neurons === (exactPricePublished ? 0 : null), "zero-call observed cost is not truthful for its pricing basis");
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
    RECOVERY_RECEIPT_FILE = ".judge-llama-cycle-spend.json",
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
  const historicalArtifacts = await classifyHistoricalArtifacts(resultsDir, entries);

  // --- Archived owner-reviewed receipts (renamed aside when successor cycles were granted) ---
  for (const spend of OWNER_REVIEWED_SPENDS) {
    if (!entries.includes(spend.archive)) continue;
    try {
      const archived = JSON.parse(await readFile(path.join(resultsDir, spend.archive), "utf8"));
      if (validSpendReceipt(archived, APPROVED_CALL_CAP) && archived.state === "completed-spent"
        && archived.attempt_id === spend.attempt_id
        && archived.approval_run_id === spend.approval_run_id
        && archived.calls_started === spend.calls_started) historicalArtifacts.add(spend.archive);
    } catch { /* unverifiable archive is simply not classified */ }
  }

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
    const ownerReviewedSpend = receipt.state === "completed-spent"
      && OWNER_REVIEWED_SPENDS.some((spend) => receipt.attempt_id === spend.attempt_id
        && receipt.approval_run_id === spend.approval_run_id
        && receipt.calls_started === spend.calls_started
        && [...OWNER_REVIEWED_PREFIXES, ...OWNER_SUPERSEDED_GO_PREFIXES].some((prefix) => entries.some((entry) => entry.startsWith(prefix) && entry.endsWith("-v2.complete.json"))));
    if (ownerReviewedSpend) {
      historicalArtifacts.add(RECOVERY_RECEIPT_FILE);
    } else if (receipt.calls_started > 0 || receipt.state !== "reserved") {
      spentReceipt = receipt;
      receiptFallback = { evidence_file: null, qualification_file: null, qualification_refs: [], malformed: false, receipt_file: RECOVERY_RECEIPT_FILE, blocking_reason: "spend receipt proves or cannot disprove provider invocation" };
    } else {
      reservedReceipt = receipt;
    }
  }

  // --- Invalid artifact check ---
  const invalidArtifact = entries.find((entry) => entry.endsWith("-v2-invalid.json") && !historicalArtifacts.has(entry));
  if (invalidArtifact && !spentReceipt) {
    return { evidence_file: invalidArtifact, qualification_file: null, qualification_refs: [], malformed: true, blocking_reason: "invalid retained evidence cannot disprove spend" };
  }

  // --- Evidence file enumeration ---
  const evidenceNames = entries.filter((entry) => entry.endsWith("-v2.json") && !historicalArtifacts.has(entry)).sort();
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
      !historicalArtifacts.has(entry) && ((entry.endsWith("-v2.md") && !expectedSiblings.has(entry)) ||
      (entry.endsWith("-qualification.json") && !expectedSiblings.has(entry)) ||
      (entry.endsWith("-v2.complete.json") && !expectedSiblings.has(entry)))
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
      const lastRecord = evidence.records.at(-1);
      const receiptMatchesEvidence =
        evidence.run.id === spentReceipt.approval_run_id &&
        name.includes(`-${spentReceipt.attempt_id}-v2.json`) &&
        evidence.records.length === spentReceipt.calls_started &&
        lastRecord?.kind === spentReceipt.last_call?.kind && lastRecord?.model === spentReceipt.last_call?.model
        && lastRecord?.index === spentReceipt.last_call?.index && spentReceipt.last_call?.sequence === evidence.records.length;
      if (!receiptMatchesEvidence || !qualificationVerification?.valid) continue;
      return {
        evidence_file: name, qualification_file: qualificationName,
        qualification_refs: qualification.qualification_refs, role_qualification_ref: qualification.role_qualification_ref, refs_verified: true,
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
      qualification_refs: qualificationRefs, role_qualification_ref: qualificationVerification?.valid ? qualification.role_qualification_ref : null, refs_verified: qualificationVerification?.valid === true,
      malformed: !qualificationVerification?.valid,
      blocking_reason: "verified evidence shows provider calls were started",
    };
  }

  // --- Unexplained temporary artifacts ---
  const unexplainedTemporary = temporaryArtifacts.find((entry) => !historicalArtifacts.has(entry) && !explainedTemporaryArtifacts.has(entry));
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

  if (receipt.schema_version !== "oddspark.judge-cycle-spend/v2") return false;
  if (typeof receipt.attempt_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receipt.attempt_id)) return false;
  if (typeof receipt.approval_run_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receipt.approval_run_id)) return false;

  const canonicalTimestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  if (!canonicalTimestamp(receipt.created_at) || !canonicalTimestamp(receipt.updated_at)) return false;
  if (!["reserved", "calls-started", "completed-spent", "consumed_incomplete"].includes(receipt.state)) return false;
  if (!Number.isSafeInteger(receipt.calls_started) || receipt.calls_started < 0 || receipt.calls_started > approvedCallCap) return false;

  const callKeys = ["sequence", "kind", "model", "index", "marked_at"];
  const lastCall = receipt.last_call;

  if (receipt.calls_started === 0) {
    if (receipt.state !== "reserved" || lastCall !== null) return false;
  } else {
    if (!["calls-started", "completed-spent", "consumed_incomplete"].includes(receipt.state)) return false;
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
