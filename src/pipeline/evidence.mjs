// Canonical local Evidence assembly. Runtime-neutral: priors and approval
// arrive as injected data (or an injected readFile in Node tooling); the fs
// path loader stays in scripts/local-evidence.mjs.

import { buildEvidence, deepFreeze, deriveEvidenceRef } from "./contracts.mjs";
import { projectLocalPrior, verifyLocalPriors } from "./priors.mjs";

const DETROIT_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Detroit",
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const CANONICAL_STRIKE = /^(\d{4})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const LOCAL_EVIDENCE_FAILURE_CODES = deepFreeze({
  INVALID_REQUEST: "invalid_request",
  PRIORS_UNAVAILABLE: "priors_unavailable",
  PRIORS_INVALID: "priors_invalid",
  APPROVAL_REQUIRED: "approval_required",
  SELECTION_INVALID: "selection_invalid",
  CONTRACT_REJECTED: "contract_rejected",
});

export class LocalEvidenceError extends Error {
  constructor(code, message, { issues = [] } = {}) {
    super(message);
    this.name = "LocalEvidenceError";
    this.code = code;
    this.issues = deepFreeze(sanitizeIssues(issues));
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeOwnScalar(value, key) {
  if (!isPlainObject(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor)) return undefined;
  const scalar = descriptor.value;
  if (scalar === null || typeof scalar === "string" || typeof scalar === "boolean") return scalar;
  if (typeof scalar === "number" && Number.isFinite(scalar)) return scalar;
  return undefined;
}

function sanitizeIssues(issues) {
  if (!Array.isArray(issues)) return [];
  try {
    return issues.map((candidate) => {
      const sanitized = {};
      for (const key of ["artifact", "path", "rule", "message", "location"]) {
        const scalar = safeOwnScalar(candidate, key);
        if (scalar !== undefined) sanitized[key] = scalar;
      }
      return Object.keys(sanitized).length
        ? sanitized
        : { artifact: "local_evidence", rule: "unsafe_issue", message: "dependency returned an unsafe issue" };
    });
  } catch {
    return [{ artifact: "local_evidence", rule: "unsafe_issues", message: "dependency returned unsafe issues" }];
  }
}

function safeErrorIssues(error) {
  if (error === null || (typeof error !== "object" && typeof error !== "function")) return [];
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, "issues");
    return descriptor && "value" in descriptor && Array.isArray(descriptor.value) ? descriptor.value : [];
  } catch {
    return [];
  }
}

function safeErrorMessage(error, fallback) {
  try {
    return typeof error?.message === "string" ? error.message : fallback;
  } catch {
    return fallback;
  }
}

function requestIssue(rule, message, location) {
  return { artifact: "local_evidence_request", rule, message, location };
}

function requireCanonicalStrikeTimestamp(value) {
  if (typeof value !== "string") {
    throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, "strike_timestamp must be an explicit canonical ISO-8601 instant", {
      issues: [requestIssue("canonical_timestamp", "strike_timestamp must be a string", "strike_timestamp")],
    });
  }
  const match = CANONICAL_STRIKE.exec(value);
  const instant = new Date(value);
  if (!match || match[1] === "0000" || Number.isNaN(instant.valueOf()) || instant.toISOString() !== value) {
    throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, "strike_timestamp must be an explicit canonical ISO-8601 instant", {
      issues: [requestIssue("canonical_timestamp", "strike_timestamp must equal Date(value).toISOString()", "strike_timestamp")],
    });
  }
  return instant;
}

export function deriveDetroitDate(strikeTimestamp) {
  const instant = requireCanonicalStrikeTimestamp(strikeTimestamp);
  const parts = Object.fromEntries(DETROIT_DATE.formatToParts(instant)
    .filter(({ type }) => ["year", "month", "day"].includes(type))
    .map(({ type, value }) => [type, value]));
  return `${parts.year.padStart(4, "0")}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`;
}

function containFailure(error, code, message) {
  if (error instanceof LocalEvidenceError) throw error;
  const issues = safeErrorIssues(error);
  throw new LocalEvidenceError(code, message, { issues });
}

export function snapshotLocalEvidenceDependencies(dependencies) {
  if (!isPlainObject(dependencies)) {
    throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, "local Evidence dependencies must be a plain object", {
      issues: [requestIssue("object", "dependencies must be a plain object", "dependencies")],
    });
  }
  for (const [key, value] of Object.entries(dependencies)) {
    if (["verifyLocalPriors", "projectLocalPrior", "buildEvidence", "deriveEvidenceRef", "readFile"].includes(key)) {
      if (value !== undefined && typeof value !== "function") {
        throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, `dependency override ${key} must be a function`, {
          issues: [requestIssue("function", `dependency override ${key} must be a function`, key)],
        });
      }
    }
  }
  return {
    verifyLocalPriors: dependencies.verifyLocalPriors,
    projectLocalPrior: dependencies.projectLocalPrior,
    buildEvidence: dependencies.buildEvidence,
    deriveEvidenceRef: dependencies.deriveEvidenceRef,
    readFile: dependencies.readFile,
  };
}

export function snapshotLocalEvidenceRequest(input, { includePaths = false } = {}) {
  if (!isPlainObject(input)) {
    throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, "local Evidence input must be a plain object", {
      issues: [requestIssue("object", "input must be a plain object", "input")],
    });
  }
  const snapshot = {
    strike_timestamp: input.strike_timestamp,
    situation_id: input.situation_id,
    capability_bundle_id: input.capability_bundle_id,
  };
  if (includePaths) {
    const priors_path = input.priors_path;
    if (priors_path !== undefined && (typeof priors_path !== "string" || priors_path.trim() === "")) {
      throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, "priors_path must be a non-empty string when provided", {
        issues: [requestIssue("path", "priors_path must be a non-empty string", "priors_path")],
      });
    }
    const approval_path = input.approval_path;
    if (approval_path !== undefined && (typeof approval_path !== "string" || approval_path.trim() === "")) {
      throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.INVALID_REQUEST, "approval_path must be a non-empty string when provided", {
        issues: [requestIssue("path", "approval_path must be a non-empty string", "approval_path")],
      });
    }
    snapshot.priors_path = priors_path;
    snapshot.approval_path = approval_path;
  } else {
    snapshot.priors = input.priors;
    snapshot.approval = input.approval;
  }
  requireCanonicalStrikeTimestamp(snapshot.strike_timestamp);
  return snapshot;
}

export function assembleLocalEvidence(input, dependencies = {}) {
  const request = snapshotLocalEvidenceRequest(input);
  const seams = snapshotLocalEvidenceDependencies(dependencies);
  const instant = requireCanonicalStrikeTimestamp(request.strike_timestamp);
  const date = deriveDetroitDate(request.strike_timestamp);
  const verify = seams.verifyLocalPriors ?? verifyLocalPriors;
  const project = seams.projectLocalPrior ?? projectLocalPrior;
  const build = seams.buildEvidence ?? buildEvidence;
  const deriveRef = seams.deriveEvidenceRef ?? deriveEvidenceRef;

  let verification;
  try {
    verification = verify(request.priors, request.approval, { now: instant });
  } catch (error) {
    containFailure(error, LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_INVALID, "local priors verification failed");
  }
  if (!verification?.production_ready) {
    const code = verification?.structure_valid && verification?.readiness === "pending_owner_approval"
      ? LOCAL_EVIDENCE_FAILURE_CODES.APPROVAL_REQUIRED
      : LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_INVALID;
    const defaultIssue = code === LOCAL_EVIDENCE_FAILURE_CODES.APPROVAL_REQUIRED
      ? { artifact: "approval", rule: "approval_required", message: "exact current owner approval is required", location: "approval" }
      : { artifact: "priors", rule: "priors_invalid", message: "valid approved local priors are required", location: "priors" };
    const issues = verification?.issues?.length
      ? verification.issues
      : [defaultIssue];
    throw new LocalEvidenceError(code, "approved local priors are required", { issues });
  }

  let projected;
  try {
    projected = project(request.priors, {
      date,
      situation_id: request.situation_id,
      capability_bundle_id: request.capability_bundle_id,
    });
  } catch (error) {
    if (error instanceof LocalEvidenceError) throw error;
    const message = safeErrorMessage(error, "local priors selection failed");
    throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.SELECTION_INVALID, "local priors selection is invalid or incompatible", {
      issues: [{ artifact: "selection", rule: "invalid_or_incompatible", message, location: "situation_id/capability_bundle_id" }],
    });
  }

  try {
    const candidate = build({ version: 1, ...projected });
    const evidence = buildEvidence(candidate);
    const evidence_ref = deriveRef(evidence);
    const authoritativeRef = deriveEvidenceRef(evidence);
    if (evidence_ref !== authoritativeRef) throw new TypeError("derived Evidence reference does not match the authoritative contract");
    return deepFreeze({ evidence, evidence_ref, model_calls: 0 });
  } catch (error) {
    containFailure(error, LOCAL_EVIDENCE_FAILURE_CODES.CONTRACT_REJECTED, "local Evidence contract rejected the projection");
  }
}
