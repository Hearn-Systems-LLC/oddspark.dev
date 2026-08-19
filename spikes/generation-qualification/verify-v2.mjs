#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { verifyEvidence } from "./evidence-v2.mjs";

export async function verifyBytes(bytes) { let value; try { value = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch (error) { return { valid: false, errors: [`invalid JSON: ${error.message}`] }; } return verifyEvidence(value); }
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const index = process.argv.indexOf("--file"); const file = index >= 0 ? process.argv[index + 1] : process.argv[2];
  if (!file) { console.error("Usage: node verify-v2.mjs --file <external-evidence.json>"); process.exitCode = 2; }
  else { const result = await verifyBytes(await readFile(file)); console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1; }
}
