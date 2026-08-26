import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SHA = /^[a-f0-9]{64}$/;
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const acceptanceIdentity = (payload) => sha256(Buffer.from(canonical(payload)));

const finiteNonnegative = (value) => Number.isFinite(value) && value >= 0;
const same = (left, right, tolerance = 1e-15) => Math.abs(left - right) <= tolerance;

export async function verifySurrogateAcceptance(decisionPath, reconciliationPath) {
  const errors = [];
  const decisionBytes = await readFile(decisionPath);
  const reconciliationBytes = await readFile(reconciliationPath);
  const decision = JSON.parse(decisionBytes);
  const reconciliation = JSON.parse(reconciliationBytes);
  if (decision.decision_verbatim !== "accept conservative surrogate accounting for unpriced endpoints") errors.push("owner decision quote mismatch");
  if (decision.scope?.generalizes_beyond_story_1_26 !== false || decision.scope?.historical_bytes_mutable !== false) errors.push("owner decision scope is not closed");
  if (reconciliation.bindings?.owner_decision?.sha256 !== sha256(decisionBytes)) errors.push("owner decision byte binding mismatch");
  if (!SHA.test(reconciliation.acceptance_identity ?? "") || reconciliation.acceptance_identity !== acceptanceIdentity(reconciliation.identity_payload)) errors.push("acceptance identity mismatch");
  const accounting = reconciliation.identity_payload?.accounting;
  const usage = accounting?.usage;
  const rates = accounting?.rates_usd_per_token;
  const costs = accounting?.costs_usd;
  const neurons = accounting?.neurons;
  const caps = accounting?.caps;
  if (![usage?.priced?.prompt, usage?.priced?.completion, usage?.unpriced?.prompt, usage?.unpriced?.completion].every(Number.isSafeInteger)) errors.push("usage is absent or incomplete");
  if (![rates?.highest_authoritative_frozen?.prompt, rates?.highest_authoritative_frozen?.completion, rates?.plan_frozen_surrogate?.prompt, rates?.plan_frozen_surrogate?.completion].every(finiteNonnegative)) errors.push("rate binding is absent");
  if (rates?.plan_frozen_surrogate?.prompt < rates?.highest_authoritative_frozen?.prompt || rates?.plan_frozen_surrogate?.completion < rates?.highest_authoritative_frozen?.completion) errors.push("surrogate rate is nonconservative");
  const priced = usage.priced.prompt * rates.highest_authoritative_frozen.prompt + usage.priced.completion * rates.highest_authoritative_frozen.completion;
  const surrogate = usage.unpriced.prompt * rates.plan_frozen_surrogate.prompt + usage.unpriced.completion * rates.plan_frozen_surrogate.completion;
  const combined = priced + surrogate;
  if (!same(priced, costs?.priced_exact) || !same(surrogate, costs?.unpriced_surrogate) || !same(combined, costs?.combined_conservative)) errors.push("cost arithmetic mismatch");
  if (!same(combined / accounting.usd_per_neuron, neurons?.combined_conservative, 1e-9)) errors.push("neuron arithmetic mismatch");
  if (caps?.calls_observed !== 42 || caps?.calls_observed > caps?.calls_approved || combined > caps?.maximum_cost_usd || neurons.combined_conservative > caps?.maximum_neurons) errors.push("approved cap breached");
  if (accounting?.free_neuron_ordering !== "free-first-then-paid-bounded-by-plan-cap" || accounting?.remaining_free_neurons_observed !== null || !same(accounting?.worst_case_paid_usd, combined)) errors.push("free-neuron ordering or uncertainty mismatch");
  if (reconciliation.identity_payload?.historical_packet?.original_accounting_verdict !== "NO-GO" || reconciliation.identity_payload?.reconciled_verdict !== "ACCEPTED") errors.push("historical and reconciled verdicts are not distinct");
  return { valid: errors.length === 0, errors, decision_sha256: sha256(decisionBytes), reconciliation_sha256: sha256(reconciliationBytes), acceptance_identity: reconciliation.acceptance_identity };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4) throw new Error("usage: node surrogate-accounting.mjs DECISION RECONCILIATION");
  const result = await verifySurrogateAcceptance(process.argv[2], process.argv[3]);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}
