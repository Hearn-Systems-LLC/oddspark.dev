import { readFile } from "node:fs/promises";

import { verifyEvidenceV2 } from "./evidence-v2.mjs";
import { executeCurrentFixtureCatalog } from "./fixture-executor.mjs";

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Usage: npm run spike:judge:verify:v2 -- <evidence-v2.json> [...]");
  process.exitCode = 2;
} else {
  const fixtureResults = await executeCurrentFixtureCatalog();
  for (const suppliedPath of paths) {
    try {
      const evidence = JSON.parse(await readFile(suppliedPath, "utf8"));
      const result = await verifyEvidenceV2(evidence, { executeFixtures: async () => fixtureResults });
      if (!result.valid) {
        process.exitCode = 1;
        const failed = result.predicate_results.filter(({ pass }) => !pass).map(({ id }) => id);
        console.error(`${suppliedPath}: FAIL ${failed.join(", ")}`);
      } else {
        console.log(`${suppliedPath}: PASS (${result.predicate_results.length} predicates, ${fixtureResults.passing_ids.length} fixtures)`);
      }
    } catch (error) {
      process.exitCode = 1;
      console.error(`${suppliedPath}: FAIL ${String(error?.message ?? error)}`);
    }
  }
}

