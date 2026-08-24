import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  canonicalBytes,
  buildManifest,
  deriveSemanticRef,
  sha256,
  validateApproval,
  validateManifest,
  validatePlan,
} from "./qualification.mjs";
import { stableStringify } from "../judge-fidelity/contract.mjs";
import { buildCurrentPlan } from "./run.mjs";
import { deriveReports, reportsEqual } from "./evidence.mjs";
async function reanalysisCodeIdentity() {
  const files = [
      new URL("./evidence.mjs", import.meta.url),
      new URL("./verify.mjs", import.meta.url),
    ],
    entries = [];
  for (const file of files) {
    const bytes = await readFile(file);
    entries.push({
      name: path.basename(file.pathname),
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  return { entries, sha256: sha256(stableStringify(entries)) };
}
export async function deriveReanalysis(plan, evidenceBytes) {
  if (!validatePlan(plan).valid) throw new Error("historical plan is invalid");
  const evidence = JSON.parse(Buffer.from(evidenceBytes).toString("utf8"));
  if (!Buffer.from(evidenceBytes).equals(canonicalBytes(evidence)))
    throw new Error("original evidence bytes are not canonical");
  const reports = await deriveReports(plan, evidence),
    qualified = reports.every((report) => report.outcome === "pass"),
    code_identity = await reanalysisCodeIdentity(),
    mismatches = reports.map((report) => ({
      leg: report.leg,
      fixtures: report.regression_report.fixtures
        .filter((fixture) => !fixture.matched)
        .map(({ fixture_id, code, decision }) => ({
          fixture_id,
          code,
          decision,
        })),
    }));
  const manifest = qualified
    ? buildManifest({ plan, reports, evidence })
    : null;
  const core = {
    schema_version: "oddspark.semantic-qualification-reanalysis/v1",
    run_id: plan.run_id,
    plan_ref: plan.plan_ref,
    original_evidence_sha256: sha256(evidenceBytes),
    reanalysis_code_identity: code_identity,
    reports,
    outcome: qualified ? "GO" : "NO-GO",
    terminal_code: qualified ? "semantic_qualified" : "semantic_not_qualified",
    mismatches,
    manifest,
  };
  const semantic_ref = qualified
    ? sha256(`ODDSPARK:SEMANTIC-REANALYSIS:v1\n${stableStringify(core)}`)
    : null;
  return { ...core, semantic_ref };
}
export async function verifyReanalysis(plan, evidenceBytes, artifact) {
  try {
    const derived = await deriveReanalysis(plan, evidenceBytes);
    if (stableStringify(derived) !== stableStringify(artifact))
      return {
        valid: false,
        errors: ["reanalysis differs from independent derivation"],
        semantic_ref: null,
      };
    return {
      valid: true,
      errors: [],
      semantic_ref: derived.semantic_ref,
      outcome: derived.outcome,
      mismatches: derived.mismatches,
    };
  } catch {
    return {
      valid: false,
      errors: ["reanalysis failed closed"],
      semantic_ref: null,
    };
  }
}
async function writeNew(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
  try {
    await link(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
export async function verifyBundle(bundle) {
  try {
    if (
      !bundle ||
      typeof bundle !== "object" ||
      Array.isArray(bundle) ||
      stableStringify(Object.keys(bundle).sort()) !==
        stableStringify([
          "approval",
          "evidence",
          "manifest",
          "plan",
          "reports",
          "schema_version",
          "semantic_ref",
        ]) ||
      bundle.schema_version !== "oddspark.semantic-qualification-bundle/v1"
    )
      return {
        valid: false,
        errors: ["bundle is not closed"],
        semantic_ref: null,
      };
    const current = await buildCurrentPlan({
      run_id: bundle?.plan?.run_id,
      created_at: bundle?.plan?.created_at,
    });
    if (stableStringify(current) !== stableStringify(bundle?.plan))
      return {
        valid: false,
        errors: ["plan differs from freshly derived frozen expectations"],
        semantic_ref: null,
      };
    const authorityAt = new Date(bundle.evidence?.records?.[0]?.started_at);
    if (
      !validateApproval(bundle.approval, bundle.plan, authorityAt).valid ||
      bundle.evidence.approval_sha256 !==
        sha256(canonicalBytes(bundle.approval))
    )
      return {
        valid: false,
        errors: ["retained approval binding is invalid"],
        semantic_ref: null,
      };
    const derived = await deriveReports(bundle.plan, bundle.evidence);
    if (!reportsEqual(derived, bundle.reports))
      return {
        valid: false,
        errors: ["leg reports differ from independent Gate derivation"],
        semantic_ref: null,
      };
    const result = validateManifest(bundle.manifest, {
      plan: bundle.plan,
      reports: derived,
      evidence: bundle.evidence,
    });
    if (!result.valid) return { ...result, semantic_ref: null };
    const ref = deriveSemanticRef(bundle.manifest);
    if (bundle.semantic_ref !== ref)
      return {
        valid: false,
        errors: ["SEMANTIC ref mismatch"],
        semantic_ref: null,
      };
    return {
      valid: true,
      errors: [],
      semantic_ref: ref,
      manifest_bytes: canonicalBytes(bundle.manifest),
    };
  } catch {
    return {
      valid: false,
      errors: ["bundle failed closed independent verification"],
      semantic_ref: null,
    };
  }
}
async function main(argv = process.argv.slice(2)) {
  if (argv[0] === "reanalyze" && argv.length === 4) {
    const plan = JSON.parse(await readFile(path.resolve(argv[1]), "utf8")),
      evidenceBytes = await readFile(path.resolve(argv[2])),
      artifact = await deriveReanalysis(plan, evidenceBytes),
      check = await verifyReanalysis(plan, evidenceBytes, artifact);
    if (!check.valid)
      throw new Error("independent reanalysis verification failed");
    await writeNew(path.resolve(argv[3]), canonicalBytes(artifact));
    console.log(
      artifact.outcome === "GO"
        ? `SEMANTIC ${artifact.semantic_ref}`
        : `NO-GO ${JSON.stringify(artifact.mismatches)}`,
    );
    return artifact.outcome === "GO" ? 0 : 1;
  }
  if (argv.length !== 1)
    throw new Error(
      "Usage: node spikes/semantic-qualification/verify.mjs <bundle.json> | reanalyze <plan.json> <evidence.json> <new-reanalysis.json>",
    );
  const file = path.resolve(argv[0]);
  const bundle = JSON.parse(await readFile(file, "utf8"));
  const result = await verifyBundle(bundle);
  if (!result.valid) {
    console.error(`INVALID ${file}\n- ${result.errors.join("\n- ")}`);
    return 1;
  }
  console.log(`PASS ${result.semantic_ref}`);
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main()
    .then((x) => (process.exitCode = x))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
