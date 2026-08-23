#!/usr/bin/env node
// CI stand-in for `npm run check` that omits `spike:judge:self-test` (DW-6).
// package.json is evidence-pinned by the a0ed5363 STRUCT-JUDGE identity, so the
// skip cannot live in the `check` script. When self-test is removed from
// `check` (source-manifest split), this file must fail closed rather than
// silently drift.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = "npm run spike:judge:self-test";
const SEMANTIC_REGRESSION = "node --test scripts/semantic-regression.test.mjs";
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const steps = String(pkg.scripts?.check ?? "").split("&&").map((step) => step.trim()).filter(Boolean);

if (!steps.includes(SKIP)) {
  throw new Error(`${SKIP} is not in npm run check; delete the DW-6 CI exception and run npm run check`);
}

for (const step of steps) {
  if (step === SKIP) {
    console.log(`skip  ${step}  (DW-6: plan-governance assertion is evidence-pinned)`);
    continue;
  }
  console.log(`run   ${step}`);
  const result = spawnSync(step, { cwd: root, env: process.env, shell: true, stdio: "inherit" });
  if (result.status) process.exit(result.status);
}

console.log(`run   ${SEMANTIC_REGRESSION}`);
const semanticRegression = spawnSync(SEMANTIC_REGRESSION, { cwd: root, env: process.env, shell: true, stdio: "inherit" });
if (semanticRegression.status) process.exit(semanticRegression.status);
