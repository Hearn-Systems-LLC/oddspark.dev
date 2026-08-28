#!/usr/bin/env node
// CI runner for every current `npm run check` step plus the browser-backed and
// semantic suites that intentionally remain outside the package script.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { executeCiStep } from "./check-ci-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

for (const step of steps) {
  run(step);
}

run(SEMANTIC_REGRESSION);
run(HOW_PAGE);
run(HOW_PAGE_BROWSER);
