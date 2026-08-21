// Shim: the canonical runtime-neutral voice-corpus validation and semantic
// identity live in src/pipeline/corpus.mjs (Story 1.23). This file re-exports
// them and keeps only the Node fs loader and CLI.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { validateCorpus } from "../src/pipeline/corpus.mjs";

export * from "../src/pipeline/corpus.mjs";

function issue(artifact, rule, message, fixture = null) {
  return { artifact, fixture, rule, message };
}

export async function loadCorpus(directory) {
  const names = { rubric: "rubric.json", goldens: "goldens.json", anti_goldens: "anti-goldens.json", approval: "approval.json" };
  const result = {};
  for (const [key, name] of Object.entries(names)) result[key] = JSON.parse(await readFile(path.join(directory, name), "utf8"));
  return result;
}

async function main() {
  const directory = path.resolve(process.argv[2] ?? "semantic/voice/v1");
  let report;
  try {
    report = validateCorpus(await loadCorpus(directory));
  } catch (error) {
    report = { valid: false, readiness: "invalid", approved_semantic_identity: null, semantic_identity: null, hashes: null, errors: [issue("corpus", "load", error instanceof Error ? error.message : String(error))] };
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.readiness === "approved" ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
