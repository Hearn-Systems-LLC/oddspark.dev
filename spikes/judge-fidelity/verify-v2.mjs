import { readFile } from "node:fs/promises";
import path from "node:path";

import { verifyEvidenceV2 } from "./evidence-v2.mjs";
import { executeCurrentFixtureCatalog } from "./fixture-executor.mjs";
import { parseCanonicalJsonBytes, verifyCompletedArtifactSet, verifyQualificationBundle } from "./qualification.mjs";

const supplied = process.argv.slice(2);
const paths = supplied[0] === "--file" ? supplied.slice(1) : supplied;
if (paths.length === 0) {
  console.error("Usage: npm run spike:judge:verify -- --file <evidence-v2.json> [...]");
  process.exitCode = 2;
} else {
  const fixtureResults = await executeCurrentFixtureCatalog();
  for (const suppliedPath of paths) {
    try {
      const resolved = path.resolve(suppliedPath);
      const directory = path.dirname(resolved);
      const evidenceName = path.basename(resolved);
      if (!evidenceName.endsWith("-v2.json")) throw new Error("evidence file must use the v2 publication basename");
      const publicationBase = evidenceName.slice(0, -".json".length);
      const markdownName = `${publicationBase}.md`;
      const qualificationName = `${publicationBase.replace(/-v2$/, "")}-qualification.json`;
      const completed = await verifyCompletedArtifactSet(directory, `${publicationBase}.complete.json`, [evidenceName, markdownName, qualificationName]);
      if (!completed.valid) throw new Error(completed.errors.join("; "));
      const evidenceBytes = await readFile(resolved);
      const evidenceParsed = parseCanonicalJsonBytes(evidenceBytes, "evidence");
      if (!evidenceParsed.valid) throw new Error(evidenceParsed.errors.join("; "));
      const evidence = evidenceParsed.value;
      const markdown = await readFile(path.join(directory, markdownName), "utf8");
      if (markdown !== evidence.report) throw new Error("publication Markdown does not exactly match the evidence report");
      const qualificationParsed = parseCanonicalJsonBytes(await readFile(path.join(directory, qualificationName)), "qualification bundle");
      if (!qualificationParsed.valid) throw new Error(qualificationParsed.errors.join("; "));
      const result = await verifyEvidenceV2(evidence, { executeFixtures: async () => fixtureResults });
      const qualification = await verifyQualificationBundle(qualificationParsed.value, evidence, evidenceBytes, { executeFixtures: async () => fixtureResults });
      if (!result.valid || !qualification.valid) {
        process.exitCode = 1;
        const failed = result.predicate_results.filter(({ pass }) => !pass).map(({ id }) => id);
        console.error(`${suppliedPath}: FAIL ${[...failed, ...qualification.errors].join(", ")}`);
      } else {
        console.log(`${suppliedPath}: PASS (${result.predicate_results.length} predicates, ${fixtureResults.passing_ids.length} fixtures)`);
      }
    } catch (error) {
      process.exitCode = 1;
      console.error(`${suppliedPath}: FAIL ${String(error?.message ?? error)}`);
    }
  }
}
