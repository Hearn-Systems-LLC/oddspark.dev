#!/usr/bin/env node
// CI stand-in for `npm run check` that omits `spike:judge:self-test` (DW-6).
// package.json is evidence-pinned by the a0ed5363 STRUCT-JUDGE identity, so the
// skip cannot live in the `check` script. When self-test is removed from
// `check` (source-manifest split), this file must fail closed rather than
// silently drift.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { executeCiStep } from "./check-ci-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = "npm run spike:judge:self-test";
const SEMANTIC_REGRESSION = "node --test scripts/semantic-regression.test.mjs";
const HOW_PAGE = "node --test scripts/how-page.test.mjs";
const HOW_PAGE_BROWSER = "REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs";
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const steps = String(pkg.scripts?.check ?? "").split("&&").map((step) => step.trim()).filter(Boolean);

function run(step) {
  console.log(`run   ${step}`);
  const result = executeCiStep(step, { spawnOptions: { cwd: root, env: process.env, shell: true, stdio: "inherit" } });
  if (result.exitCode !== 0) {
    console.error(result.message);
    process.exit(result.exitCode);
  }
}

if (!steps.includes(SKIP)) {
  throw new Error(`${SKIP} is not in npm run check; delete the DW-6 CI exception and run npm run check`);
}

for (const step of steps) {
  if (step === SKIP) {
    console.log(`skip  ${step}  (DW-6: plan-governance assertion is evidence-pinned)`);
    continue;
  }
  run(step);
}

run(SEMANTIC_REGRESSION);
run(HOW_PAGE);
run(HOW_PAGE_BROWSER);
