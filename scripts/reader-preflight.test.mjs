import assert from "node:assert/strict";
import test from "node:test";

import {
  findEnvSections,
  findForbiddenBindings,
  findForbiddenVars,
  parseImportSpecifiers,
  stripTomlComments,
  tomlSections,
} from "./reader-preflight.mjs";

test("tomlSections captures every line of a multi-line section", () => {
  const sections = tomlSections('top = 1\n[vars]\nA = "a"\nB = "b"\n\n[ai]\nbinding = "AI"\n');
  assert.deepEqual(sections.map((s) => s.name), ["", "vars", "ai"]);
  assert.match(sections[1].body, /A = "a"/);
  assert.match(sections[1].body, /B = "b"/);
});

test("a forbidden var on line 2+ of a multi-line [vars] section is caught", () => {
  const config = [
    'name = "oddspark"',
    'main = "src/worker.js"',
    "",
    "[vars]",
    'AI_MODEL = "@cf/openai/gpt-oss-120b"',
    'AI_MODEL_FALLBACK = "@cf/openai/gpt-oss-20b"',
    'PIPELINE_HOUSE = "sneaky"', // the evasion the lazy regex missed
    "",
    "[ai]",
    'binding = "AI"',
  ].join("\n");
  assert.deepEqual(findForbiddenVars(config), ["PIPELINE_HOUSE"]);
});

test("forbidden-var matching is case-insensitive and covers every forbidden family", () => {
  const config = '[vars]\npipeline_x = "1"\nactivation_manifest = "2"\nInactive_Domain_Writer = "3"\n';
  assert.deepEqual(findForbiddenVars(`${config}\nACTIVATION_SNAPSHOT = "off"\n`), ["PIPELINE_X", "ACTIVATION_MANIFEST", "INACTIVE_DOMAIN_WRITER", "ACTIVATION_SNAPSHOT"]);
});

test("forbidden names outside [vars] are not reported as vars", () => {
  const config = '[vars]\nAI_MODEL = "fine"\n\n[other]\nPIPELINE_JUDGE = "not-vars"\n';
  assert.deepEqual(findForbiddenVars(config), []);
});

test("commented-out forbidden vars do not trip the gate", () => {
  const config = '[vars]\n# ACTIVATION_MANIFEST = "off"\nAI_MODEL = "fine" # PIPELINE_HOUSE trailing comment\n';
  assert.deepEqual(findForbiddenVars(config), []);
  assert.equal(stripTomlComments('a = "b" # note'), 'a = "b" ');
});

test("forbidden bindings anywhere in the config are caught", () => {
  const config = '[[kv_namespaces]]\nbinding = "PIPELINE_KV"\n\n[[durable_objects.bindings]]\nname = "INACTIVE_DOMAIN_WRITER"\n';
  assert.deepEqual(findForbiddenBindings(config), ["PIPELINE_KV", "INACTIVE_DOMAIN_WRITER"]);
  assert.deepEqual(findForbiddenBindings('binding = "SPARKS"\nname = "COORD"\n'), []);
});

test("[env.*] sections are reported", () => {
  assert.deepEqual(findEnvSections('[env.production]\nmain = "src/other.js"\n\n[vars]\nA = "a"\n'), ["env.production"]);
  assert.deepEqual(findEnvSections('[vars]\nA = "a"\n\n[ai]\nbinding = "AI"\n'), []);
});

test("parseImportSpecifiers covers static, side-effect, re-export, and dynamic literal imports", () => {
  const source = [
    'import { a } from "./alpha.mjs";',
    'import "./side-effect.mjs";',
    'export { b } from "./beta.mjs";',
    'export * from "./gamma.mjs";',
    'const m = await import("./dynamic.mjs");',
    'import x from "node:fs";', // not relative — excluded
  ].join("\n");
  assert.deepEqual(
    parseImportSpecifiers(source).sort(),
    ["./alpha.mjs", "./beta.mjs", "./dynamic.mjs", "./gamma.mjs", "./side-effect.mjs"],
  );
});
