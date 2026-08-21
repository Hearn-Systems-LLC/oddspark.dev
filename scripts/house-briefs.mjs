// Shim: the canonical runtime-neutral house-Brief validation, identity,
// selection, and approval live in src/pipeline/house.mjs (Story 1.23). This
// file re-exports them and keeps only the Node fs loader and CLI.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { verifyApproval } from "../src/pipeline/house.mjs";

export * from "../src/pipeline/house.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "content/house-briefs/v1/catalog.json");
const APPROVAL_PATH = path.join(ROOT, "content/house-briefs/v1/approval.json");
const PRIORS_PATH = path.join(ROOT, "content/local-priors/v1/priors.json");
const RUBRIC_PATH = path.join(ROOT, "semantic/voice/v1/rubric.json");

const issue = (artifact, rule, message, location = null) => ({ artifact, rule, message, location });

export async function loadHouseBriefInputs({ catalogPath = CATALOG_PATH, approvalPath = APPROVAL_PATH, priorsPath = PRIORS_PATH, rubricPath = RUBRIC_PATH } = {}) {
  const read = async (file, artifact) => {
    try { return { value: JSON.parse(await readFile(file, "utf8")), issues: [] }; }
    catch (error) { return { value: null, issues: [issue(artifact, "json_parse", error.message)] }; }
  };
  const [catalog, approval, priors, rubric] = await Promise.all([read(catalogPath, "catalog"), read(approvalPath, "approval"), read(priorsPath, "priors"), read(rubricPath, "rubric")]);
  return { catalog: catalog.value, approval: approval.value, priors: priors.value, rubric: rubric.value, issues: [...catalog.issues, ...approval.issues, ...priors.issues, ...rubric.issues] };
}

export async function runCli(options = {}) {
  const input = await loadHouseBriefInputs(options);
  if (input.issues.length) return { schema_version: 1, structure_valid: false, readiness: "invalid", production_ready: false, content_hash: null, issues: input.issues };
  const result = verifyApproval(input.catalog, input.approval, { priors: input.priors, rubric: input.rubric });
  return { schema_version: 1, structure_valid: !result.issues.some((entry) => entry.artifact === "catalog" || entry.artifact === "authority"), readiness: result.status, production_ready: result.ready, content_hash: result.content_hash, issues: result.issues };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await runCli();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.production_ready ? 0 : 1;
}
