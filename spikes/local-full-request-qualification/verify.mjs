import { readFile } from "node:fs/promises";
import { verifyEvidenceBytes } from "./verifier.mjs";

const [evidencePath, planPath, approvalPath] = process.argv.slice(2);
try {
  if (!evidencePath || !planPath || !approvalPath) throw new Error("usage: verify.mjs EVIDENCE PLAN APPROVAL");
  const outcome = verifyEvidenceBytes(await readFile(evidencePath), { planBytes: await readFile(planPath), approvalBytes: await readFile(approvalPath) });
  if (!outcome.valid) { console.error(outcome.errors.join("\n")); process.exitCode = 1; } else console.log("LOCAL-FULL-REQUEST evidence PASS");
} catch (error) {
  console.error(`verification input unavailable: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
