// Shim: the canonical runtime-neutral local Evidence assembly lives in
// src/pipeline/evidence.mjs (Story 1.23). This file re-exports it and keeps
// only the Node fs path loader.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  LOCAL_EVIDENCE_FAILURE_CODES,
  LocalEvidenceError,
  assembleLocalEvidence,
  snapshotLocalEvidenceDependencies,
  snapshotLocalEvidenceRequest,
} from "../src/pipeline/evidence.mjs";

export * from "../src/pipeline/evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_PRIORS_PATH = path.join(ROOT, "content/local-priors/v1/priors.json");
export const DEFAULT_APPROVAL_PATH = path.join(ROOT, "content/local-priors/v1/approval.json");

function safeFileLocation(file) {
  return typeof file === "string" ? file : "<invalid-path>";
}

function safeErrorMessage(error, fallback) {
  try {
    return typeof error?.message === "string" ? error.message : fallback;
  } catch {
    return fallback;
  }
}

async function readJson(file, artifact, read = readFile) {
  let source;
  try {
    source = await read(file, "utf8");
  } catch (error) {
    throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_UNAVAILABLE, `unable to load ${artifact}`, {
      issues: [{ artifact, rule: "read_failed", message: safeErrorMessage(error, "read failed"), location: safeFileLocation(file) }],
    });
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new LocalEvidenceError(LOCAL_EVIDENCE_FAILURE_CODES.PRIORS_UNAVAILABLE, `unable to parse ${artifact}`, {
      issues: [{ artifact, rule: "json_parse", message: safeErrorMessage(error, "JSON parse failed"), location: safeFileLocation(file) }],
    });
  }
}

export async function assembleLocalEvidenceFromFiles(input, dependencies = {}) {
  const request = snapshotLocalEvidenceRequest(input, { includePaths: true });
  const seams = snapshotLocalEvidenceDependencies(dependencies);
  const read = seams.readFile ?? readFile;
  const priors = await readJson(request.priors_path ?? DEFAULT_PRIORS_PATH, "priors", read);
  const approval = await readJson(request.approval_path ?? DEFAULT_APPROVAL_PATH, "approval", read);
  return assembleLocalEvidence({
    strike_timestamp: request.strike_timestamp,
    situation_id: request.situation_id,
    capability_bundle_id: request.capability_bundle_id,
    priors,
    approval,
  }, seams);
}
