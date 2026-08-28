import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EVIDENCE_FILE,
  PINNED_REVISION,
  RETAINED_FILES,
  verifyRetainedBytes,
  verifyStructJudgeHistory,
} from "./verify-struct-judge-history.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function retainedShadow() {
  const shadow = await mkdtemp(path.join(tmpdir(), "oddspark-retained-shadow-"));
  for (const relativePath of RETAINED_FILES) {
    await cp(path.join(root, relativePath), path.join(shadow, relativePath), { recursive: true });
  }
  return shadow;
}

test("pinned source reconstruction verifies the immutable STRUCT-JUDGE authority", async () => {
  const shadow = await retainedShadow();
  await verifyStructJudgeHistory({ currentRoot: shadow, repositoryRoot: root });
});

test("an actual retained evidence-byte mutation fails before semantic verification", async () => {
  const shadow = await retainedShadow();
  const evidencePath = path.join(shadow, EVIDENCE_FILE);
  const evidence = await readFile(evidencePath);
  await writeFile(evidencePath, Buffer.concat([evidence, Buffer.from("\n")]));
  await assert.rejects(
    verifyRetainedBytes({ currentRoot: shadow, repositoryRoot: root }),
    /retained STRUCT-JUDGE artifact differs/,
  );
});

test("the current drifting source revision cannot substitute for the pinned authority", async () => {
  const shadow = await retainedShadow();
  await assert.rejects(
    verifyStructJudgeHistory({ currentRoot: shadow, repositoryRoot: root, pinnedRevision: "HEAD" }),
    /exited with code|Command failed|evidence verification failed|qualification verification failed/,
  );
  assert.notEqual(PINNED_REVISION, "HEAD");
});

test("CI runs current checks and the historical boundary exactly once without a direct current-source verifier", async () => {
  const workflow = await readFile(path.join(root, ".github/workflows/test.yml"), "utf8");
  const runner = await readFile(path.join(root, ".github/check-ci.mjs"), "utf8");
  assert.match(workflow, /- uses: actions\/checkout@v4\n\s+with:\n\s+fetch-depth: 0\n/);
  assert.equal(workflow.split("node --test .github/verify-struct-judge-history.test.mjs").length - 1, 1);
  assert.equal(workflow.split("node .github/verify-struct-judge-history.mjs").length - 1, 1);
  assert.doesNotMatch(workflow, /npm run spike:judge:(?:qualification:)?verify/);
  assert.doesNotMatch(runner, /skip\s+.*spike:judge:self-test|const SKIP/);
});
