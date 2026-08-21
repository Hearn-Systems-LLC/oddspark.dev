// Shim: the canonical runtime-neutral local-priors validation, identity, and
// projection live in src/pipeline/priors.mjs (Story 1.23). This file
// re-exports them and keeps only the Node fs loader and CLI.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { verifyLocalPriors } from "../src/pipeline/priors.mjs";

export * from "../src/pipeline/priors.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRIORS_PATH = path.join(ROOT, "content/local-priors/v1/priors.json");
const APPROVAL_PATH = path.join(ROOT, "content/local-priors/v1/approval.json");

function issue(artifact, rule, message, location = null) {
  return { artifact, rule, message, location };
}

async function readJson(file, artifact) {
  try {
    return { value: JSON.parse(await readFile(file, "utf8")), issues: [] };
  } catch (error) {
    return { value: null, issues: [issue(artifact, "json_parse", error.message)] };
  }
}

export async function runCli({ priorsPath = PRIORS_PATH, approvalPath = APPROVAL_PATH, now = new Date() } = {}) {
  const [priorsRead, approvalRead] = await Promise.all([readJson(priorsPath, "priors"), readJson(approvalPath, "approval")]);
  if (priorsRead.issues.length || approvalRead.issues.length) return { schema_version: 1, structure_valid: false, readiness: "invalid", production_ready: false, content_hash: null, issues: [...priorsRead.issues, ...approvalRead.issues] };
  return verifyLocalPriors(priorsRead.value, approvalRead.value, { now });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await runCli();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.readiness === "approved" ? 0 : 1;
}
