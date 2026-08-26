import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { acceptanceIdentity, verifySurrogateAcceptance } from "./surrogate-accounting.mjs";

const root = new URL("../../", import.meta.url);
const decision = new URL("_bmad-output/implementation-artifacts/story-1-26-owner-decision-conservative-surrogate-accounting-2026-08-26.json", root);
const reconciliation = new URL("_bmad-output/implementation-artifacts/story-1-26-stage2-r3-surrogate-accounting-reconciliation-2026-08-26.json", root);

test("retained Story 1.26 r3 reconciliation verifies", async () => {
  const result = await verifySurrogateAcceptance(decision, reconciliation);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("missing usage, nonconservative rates, cap breach, and identity drift fail closed", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "surrogate-accounting-"));
  const original = JSON.parse(await readFile(reconciliation, "utf8"));
  for (const mutate of [
    (value) => { value.identity_payload.accounting.usage.unpriced.prompt = null; },
    (value) => { value.identity_payload.accounting.rates_usd_per_token.plan_frozen_surrogate.prompt = 0; },
    (value) => { value.identity_payload.accounting.caps.maximum_cost_usd = 0.01; },
  ]) {
    const value = structuredClone(original); mutate(value); value.acceptance_identity = acceptanceIdentity(value.identity_payload);
    const candidate = path.join(directory, `${Math.random()}.json`); await writeFile(candidate, `${JSON.stringify(value, null, 2)}\n`);
    assert.equal((await verifySurrogateAcceptance(decision, candidate)).valid, false);
  }
  const drift = structuredClone(original); drift.identity_payload.reconciled_verdict = "REJECTED";
  const candidate = path.join(directory, "identity-drift.json"); await writeFile(candidate, `${JSON.stringify(drift, null, 2)}\n`);
  assert.match((await verifySurrogateAcceptance(decision, candidate)).errors.join(";"), /identity|verdict/);
});
