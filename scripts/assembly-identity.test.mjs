import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeIdentityFromDir,
  diffIdentity,
  findNeutralityViolations,
  moduleSourcesFromDir,
  parseStoredIdentity,
  runCli,
  verify,
} from "./assembly-identity.mjs";

const cliPath = fileURLToPath(new URL("./assembly-identity.mjs", import.meta.url));
const root = fileURLToPath(new URL("..", import.meta.url));

async function tempProject(modules) {
  const dir = await mkdtemp(path.join(tmpdir(), "assembly-identity-"));
  const pipelineDir = path.join(dir, "src", "pipeline");
  await mkdir(pipelineDir, { recursive: true });
  for (const [name, source] of Object.entries(modules)) {
    await writeFile(path.join(pipelineDir, name), source);
  }
  return { dir, pipelineDir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

test("the neutrality scan covers static, side-effect, re-export, and dynamic Node imports", () => {
  const cases = [
    'import { readFile } from "node:fs/promises";',
    'import x from "fs";',
    'import "node:fs";',
    'export { x } from "node:path";',
    'export * from "node:os";',
    'const m = await import("node:crypto");',
    'const m = await import("child_process");',
    'const p = require("fs");',
    'console.log(process.env.HOME);',
    'process.exitCode = 1;',
    'const b = Buffer.from("x");',
    'const p = globalThis.process.argv;',
    'const B = globalThis.Buffer;',
    // Computed dynamic imports, bracket-access globals, and eval/Function.
    'const m = await import(name);',
    'const m = await import(`node:${mod}`);',
    'const e = process["env"];',
    'const p = globalThis["process"];',
    'const B = globalThis["Buffer"];',
    'eval("1+1");',
    'new Function("return 1")();',
    'const f = Function("x", "return x");',
  ];
  for (const source of cases) {
    assert.ok(findNeutralityViolations(source).length > 0, source);
  }
});

test("the neutrality scan accepts ordinary runtime-neutral modules", () => {
  for (const source of [
    'import { deepFreeze } from "./contracts.mjs";\nexport const X = deepFreeze({ a: 1 });',
    'import { readFile } from "../scripts/local-evidence.mjs";',
    'const later = await import("./optional.mjs");',
    'export const label = "processes buffers of joy";', // plain words, not the globals
  ]) {
    assert.deepEqual(findNeutralityViolations(source), [], source);
  }
});

test("a non-conforming .mjs/.js file name under src/pipeline fails freeze and verify by name", async () => {
  for (const badName of ["Helper.mjs", "utils.js", "_hidden.mjs"]) {
    const { dir, pipelineDir, cleanup } = await tempProject({
      "alpha.mjs": 'export const a = 1;\n',
    });
    try {
      assert.equal(runCli(["freeze"], dir), 0, `setup freeze ${badName}`);
      await writeFile(path.join(pipelineDir, badName), 'export const rogue = true;\n');
      // Freeze refuses to record a graph containing the rogue file.
      assert.equal(runCli(["freeze"], dir), 1, badName);
      // Verify names the rogue file rather than passing silently.
      const result = verify(dir);
      assert.equal(result.ok, false, badName);
      assert.ok(result.problems.some((problem) => problem.includes(badName)), `${badName}: ${result.problems.join("; ")}`);
    } finally {
      await cleanup();
    }
  }
});

test("every canonical src/pipeline module passes the neutrality scan", async () => {
  const sources = moduleSourcesFromDir(path.join(root, "src", "pipeline"));
  assert.ok(sources.length >= 14);
  for (const entry of sources) {
    assert.match(entry.path, /^src\/pipeline\/[a-z][a-z0-9-]*\.mjs$/);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  }
});

test("freeze then verify round-trips a temp project", async () => {
  const { dir, cleanup } = await tempProject({
    "alpha.mjs": 'export const a = 1;\n',
    "beta.mjs": 'import { a } from "./alpha.mjs";\nexport const b = a + 1;\n',
  });
  try {
    assert.equal(runCli(["freeze"], dir), 0);
    const stored = JSON.parse(await readFile(path.join(dir, "runtime-assembly.json"), "utf8"));
    assert.equal(stored.schema_version, 1);
    assert.equal(stored.modules.length, 2);
    assert.equal(verify(dir).ok, true);
  } finally {
    await cleanup();
  }
});

test("source drift and module-set drift fail verification with named problems", async () => {
  const { dir, pipelineDir, cleanup } = await tempProject({ "alpha.mjs": 'export const a = 1;\n' });
  try {
    assert.equal(runCli(["freeze"], dir), 0);
    await writeFile(path.join(pipelineDir, "alpha.mjs"), 'export const a = 2;\n');
    let result = verify(dir);
    assert.equal(result.ok, false);
    assert.ok(result.problems.some((problem) => problem.includes("alpha.mjs")), result.problems.join("; "));

    await writeFile(path.join(pipelineDir, "alpha.mjs"), 'export const a = 1;\n');
    await writeFile(path.join(pipelineDir, "gamma.mjs"), 'export const g = 3;\n');
    result = verify(dir);
    assert.equal(result.ok, false);
    assert.ok(result.problems.some((problem) => problem.includes("gamma.mjs")), result.problems.join("; "));
  } finally {
    await cleanup();
  }
});

test("a non-neutral canonical module fails freeze and verify with a clean error", async () => {
  const { dir, pipelineDir, cleanup } = await tempProject({ "bad.mjs": 'import { readFile } from "node:fs/promises";\n' });
  try {
    assert.equal(runCli(["freeze"], dir), 1);
    // Freeze a clean graph, then introduce the violation: verify must surface
    // the neutrality failure, not a stack trace.
    await writeFile(path.join(pipelineDir, "bad.mjs"), 'export const ok = 1;\n');
    assert.equal(runCli(["freeze"], dir), 0);
    await writeFile(path.join(pipelineDir, "bad.mjs"), 'import { readFile } from "node:fs/promises";\n');
    const result = verify(dir);
    assert.equal(result.ok, false);
    assert.ok(result.problems.some((problem) => problem.includes("not runtime-neutral")));
    assert.ok(result.problems.some((problem) => problem.includes("node:fs/promises")));
  } finally {
    await cleanup();
  }
});

test("malformed or missing runtime-assembly.json fails verification with a clean error, not a stack trace", async () => {
  const { dir, cleanup } = await tempProject({ "alpha.mjs": 'export const a = 1;\n' });
  try {
    // Missing file
    let result = verify(dir);
    assert.equal(result.ok, false);
    assert.ok(result.problems[0].includes("missing"));

    // Invalid JSON
    await writeFile(path.join(dir, "runtime-assembly.json"), "{not json");
    result = verify(dir);
    assert.equal(result.ok, false);
    assert.ok(result.problems[0].includes("not valid JSON"), result.problems[0]);
    assert.ok(!result.problems[0].includes("\n    at "), result.problems[0]);

    // Valid JSON, wrong shape
    await writeFile(path.join(dir, "runtime-assembly.json"), JSON.stringify({ hello: 1 }));
    result = verify(dir);
    assert.equal(result.ok, false);
    assert.ok(result.problems[0].includes("shape"), result.problems[0]);

    assert.throws(() => parseStoredIdentity("nope"), /not valid JSON/);
  } finally {
    await cleanup();
  }
});

test("the CLI prints usage and exits 1 without a command", () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /usage: node scripts\/assembly-identity\.mjs \[freeze\|verify\]/);
});

test("the committed runtime-assembly.json verifies against the live canonical graph", () => {
  const result = spawnSync(process.execPath, [cliPath, "verify"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK  runtime-assembly identity [a-f0-9]{64} matches/);
});

test("identity composition is deterministic and order-independent", async () => {
  const { dir, cleanup } = await tempProject({
    "one.mjs": 'export const one = 1;\n',
    "two.mjs": 'export const two = 2;\n',
  });
  try {
    const first = computeIdentityFromDir(path.join(dir, "src", "pipeline"));
    const second = computeIdentityFromDir(path.join(dir, "src", "pipeline"));
    assert.equal(first.assembly_identity_sha256, second.assembly_identity_sha256);
    assert.deepEqual(diffIdentity(parseStoredIdentity(JSON.stringify(first)), second), []);
  } finally {
    await cleanup();
  }
});
