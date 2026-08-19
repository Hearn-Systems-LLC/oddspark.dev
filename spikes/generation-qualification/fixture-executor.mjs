import { readFile } from "node:fs/promises";
import { classifyCall, fixtureCandidate } from "./contract.mjs";

export async function fixtureDocument() { return JSON.parse(await readFile(new URL("./fixtures.json", import.meta.url), "utf8")); }
export function callForShape(shape) {
  const candidate = fixtureCandidate();
  if (shape === "provider_error") return { call_state: "provider_error" };
  if (shape === "timeout") return { call_state: "timeout" };
  const outputs = {
    direct: candidate, missing: { ...candidate, plan: undefined }, extra: { ...candidate, extra: true }, mistyped: { ...candidate, title: 4 },
    wrapped: { candidate }, text: JSON.stringify(candidate), fenced: `\`\`\`json\n${JSON.stringify(candidate)}\n\`\`\``,
    coerced: { ...candidate, change_level: { ...candidate.change_level, steps_changed: "2" } },
    repaired: { ...candidate, title: ` ${candidate.title} ` }, ambiguous: [candidate, candidate], oversized: { ...candidate, title: "x".repeat(70000) },
  };
  return { call_state: "received", output: outputs[shape] };
}
export async function executeFixtures(document = null) {
  document ??= await fixtureDocument();
  const failures = []; const knownShapes = new Set(["direct", "missing", "extra", "mistyped", "wrapped", "text", "fenced", "coerced", "repaired", "ambiguous", "oversized", "provider_error", "timeout"]);
  if (!document || typeof document !== "object" || Array.isArray(document) || Object.keys(document).sort().join(",") !== "cases,schema_version" || document.schema_version !== "oddspark.generation-qualification-fixtures/v1" || !Array.isArray(document.cases)) return { declared_ids: [], passing_ids: [], failures: ["fixture document is not the closed v1 schema"], passed: false };
  for (const fixture of document.cases) if (!fixture || typeof fixture !== "object" || Array.isArray(fixture) || Object.keys(fixture).sort().join(",") !== "classification,id,shape" || typeof fixture.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(fixture.id) || !knownShapes.has(fixture.shape) || !["direct_valid", "invalid_output", "output_too_large", "provider_error", "timeout"].includes(fixture.classification)) failures.push("fixture case is malformed");
  const declared_ids = document.cases.map(({ id }) => id); const passing_ids = [];
  if (new Set(declared_ids).size !== declared_ids.length) failures.push("fixture IDs are not unique");
  for (const fixture of document.cases) {
    try { const actual = classifyCall(callForShape(fixture.shape)).classification; if (actual === fixture.classification) passing_ids.push(fixture.id); else failures.push(`${fixture.id}: expected ${fixture.classification}, got ${actual}`); }
    catch (error) { failures.push(`${fixture.id}: ${String(error?.message ?? error)}`); }
  }
  return { declared_ids, passing_ids, failures, passed: failures.length === 0 && passing_ids.length === declared_ids.length };
}
