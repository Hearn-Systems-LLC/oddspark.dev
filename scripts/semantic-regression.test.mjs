import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createOfflineConfigurations,
  deriveCatalogIdentity,
  encodeRegressionReport,
  loadSemanticRegressionCatalog,
  projectCorpusInput,
  runSemanticRegression,
  validateSemanticRegressionCatalog,
} from "./semantic-regression.mjs";
import { loadCorpus } from "./semantic-corpus.mjs";

const clone = structuredClone;
const catalog = await loadSemanticRegressionCatalog();
const corpus = await loadCorpus(fileURLToPath(new URL("../semantic/voice/v1/", import.meta.url)));

function trackedConfigurations({ alterPrimary = null } = {}) {
  const calls = { primary: [], fallback: [] };
  const configurations = createOfflineConfigurations().map((configuration) => ({
    ...configuration,
    judge_provider: (input) => {
      calls[configuration.slot].push(input.fixture_id);
      if (configuration.slot === "primary" && alterPrimary) return alterPrimary(input);
      return input.declared_result;
    },
  }));
  return { calls, configurations };
}

function fixture(report, slot, id) {
  return report.configurations.find((configuration) => configuration.slot === slot).fixtures.find((entry) => entry.fixture_id === id);
}

test("catalog binds the approved corpus and content-addresses every immutable expectation", () => {
  const validation = validateSemanticRegressionCatalog(catalog, corpus);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.ok(Object.isFrozen(catalog) && Object.isFrozen(catalog.fixtures) && Object.isFrozen(catalog.fixtures[0].expected));
  assert.equal(validation.catalog_identity, catalog.catalog_identity);
  assert.equal(deriveCatalogIdentity(catalog), catalog.catalog_identity);
  assert.deepEqual(catalog.corpus.golden_ids, corpus.goldens.fixtures.map(({ id }) => id));
  assert.deepEqual(catalog.corpus.anti_golden_ids, corpus.anti_goldens.fixtures.map(({ id }) => id));
  const corpusRefs = catalog.fixtures.filter(({ corpus_ref: corpusRef }) => corpusRef !== null).map(({ corpus_ref: corpusRef }) => corpusRef);
  assert.deepEqual(corpusRefs, [...catalog.corpus.golden_ids, ...catalog.corpus.anti_golden_ids]);
  const failedChecks = new Set(catalog.fixtures.flatMap(({ verdict }) => verdict?.failed_checks ?? []));
  assert.deepEqual([...failedChecks].sort(), [...Array.from({ length: 9 }, (_, index) => `gate-${index + 1}`), "tone", "claims"].sort());
});

test("malformed catalog containers fail closed without invoking a fake", async () => {
  const malformedVerdict = clone(catalog); malformedVerdict.fixtures[0].verdict = null;
  const malformedConfigurations = clone(catalog); malformedConfigurations.configurations = undefined;
  for (const value of [null, {}, malformedVerdict, malformedConfigurations]) {
    const validation = validateSemanticRegressionCatalog(value, corpus);
    assert.equal(validation.valid, false);
    let calls = 0;
    const configurations = createOfflineConfigurations().map((configuration) => ({ ...configuration, judge_provider: () => { calls += 1; } }));
    await assert.rejects(runSemanticRegression({ catalog: value, corpus, configurations }), /semantic regression validation failed/);
    assert.equal(calls, 0);
  }
});

test("approved offline run reports primary and fallback fixtures and counts independently", async () => {
  const { calls, configurations } = trackedConfigurations();
  const report = await runSemanticRegression({ catalog, corpus, configurations });
  assert.ok(Object.isFrozen(report) && Object.isFrozen(report.configurations) && Object.isFrozen(report.configurations[0].fixtures));
  assert.deepEqual(Object.keys(report), ["schema_version", "suite_version", "catalog_identity", "corpus_identity", "configurations"]);
  assert.deepEqual(report.configurations.map(({ slot }) => slot), ["primary", "fallback"]);
  for (const configuration of report.configurations) {
    assert.deepEqual(configuration.fixtures.map(({ fixture_id: fixtureId }) => fixtureId), catalog.fixtures.map(({ id }) => id));
    assert.deepEqual(configuration.summary, { total: 24, matched: 24, mismatched: 0, judge_calls: 19, provider_calls: 19 });
    assert.deepEqual(calls[configuration.slot], catalog.fixtures.filter(({ expected }) => expected.judge_calls === 1).map(({ id }) => id));
  }
  const bytes = encodeRegressionReport(report);
  for (const forbidden of ["pooled", "qualification", "threshold", "rate"]) assert.equal(bytes.includes(forbidden), false);
});

test("corpus fixtures send projected golden and anti-golden bytes into the Gate", async () => {
  const seen = { primary: {} };
  const configurations = createOfflineConfigurations().map((configuration) => ({
    ...configuration,
    judge_provider: (input) => {
      if (configuration.slot === "primary") seen.primary[input.fixture_id] = input.request.candidate;
      return input.declared_result;
    },
  }));
  const report = await runSemanticRegression({ catalog, corpus, configurations });
  for (const id of catalog.corpus.golden_ids) {
    const golden = corpus.goldens.fixtures.find((entry) => entry.id === id);
    const projected = projectCorpusInput(golden, "corpus_golden").candidate;
    const received = seen.primary[`golden-${id}`];
    assert.equal(fixture(report, "primary", `golden-${id}`).code, "passed");
    assert.equal(received.mode, golden.mode === "website" ? "domain" : "local");
    assert.equal(received.plan, projected.plan);
    assert.match(received.title, new RegExp(golden.elements.find((entry) => entry.element === "spark_title").text.slice(0, 3), "i"));
    assert.deepEqual(received, projected);
  }
  for (const id of catalog.corpus.anti_golden_ids) {
    const anti = corpus.anti_goldens.fixtures.find((entry) => entry.id === id);
    assert.equal(seen.primary[id].plan, anti.sample);
    assert.equal(seen.primary[id].mode, anti.mode === "website" ? "domain" : "local");
    assert.equal(fixture(report, "primary", id).code, "semantic_rejected");
  }
});

test("semantic contradictions retain exact sanitized gate, tone, and claims decisions", async () => {
  const report = await runSemanticRegression({ catalog, corpus, configurations: createOfflineConfigurations() });
  const cases = [
    ["anti-poor-scope", [5, 6], true, true],
    ["contradiction-gate-2", [2], true, true],
    ["contradiction-gate-4", [4], true, true],
    ["contradiction-gate-9", [9], true, true],
    ["contradiction-tone", [], false, true],
    ["contradiction-claims", [], true, false],
  ];
  for (const [id, failedGates, tone, claims] of cases) {
    const result = fixture(report, "primary", id);
    assert.equal(result.code, "semantic_rejected");
    assert.equal(result.judge_calls, 1);
    assert.equal(result.matched, true);
    assert.deepEqual(result.decision.gates.filter(({ pass }) => !pass).map(({ gate }) => gate), failedGates);
    assert.equal(result.decision.tone.pass, tone);
    assert.equal(result.decision.claims.pass, claims);
    assert.deepEqual(Object.keys(result.decision.gates[0]), ["gate", "pass"]);
  }
  for (const id of catalog.corpus.golden_ids) assert.equal(fixture(report, "primary", `golden-${id}`).code, "passed");
  for (const id of catalog.corpus.anti_golden_ids) assert.equal(fixture(report, "primary", id).code, "semantic_rejected");
});

test("candidate binding and top-level pass contradictions fail closed after one call", async () => {
  const report = await runSemanticRegression({ catalog, corpus, configurations: createOfflineConfigurations() });
  for (const id of ["contract-candidate-binding", "contract-pass-conjunction"]) {
    const result = fixture(report, "primary", id);
    assert.deepEqual(result, { fixture_id: id, code: "judge_contract_rejected", judge_calls: 1, decision: null, matched: true });
  }
});

test("invalid schema, mode linkage, personal name, number, and grounding reject with zero fake calls", async () => {
  const { calls, configurations } = trackedConfigurations();
  const report = await runSemanticRegression({ catalog, corpus, configurations });
  const ids = ["local-invalid-schema", "local-mode-linkage", "local-personal-name", "local-number", "local-grounding"];
  for (const slot of ["primary", "fallback"]) {
    for (const id of ids) {
      assert.deepEqual(fixture(report, slot, id), { fixture_id: id, code: "local_rejected", judge_calls: 0, decision: null, matched: true });
      assert.equal(calls[slot].includes(id), false);
    }
  }
});

test("approval, fixture content, fixture ID, and expectation drift fail before evaluation", async () => {
  const cases = [];
  const approvalDrift = clone(corpus); approvalDrift.approval.hashes.rubric = "0".repeat(64); cases.push({ driftedCatalog: catalog, driftedCorpus: approvalDrift });
  const contentDrift = clone(catalog); contentDrift.fixtures[0].input = "invalid_schema"; cases.push({ driftedCatalog: contentDrift, driftedCorpus: corpus });
  const idDrift = clone(catalog); idDrift.fixtures[0].id = "changed-golden-id"; cases.push({ driftedCatalog: idDrift, driftedCorpus: corpus });
  const expectationDrift = clone(catalog); expectationDrift.fixtures[0].expected.code = "semantic_rejected"; cases.push({ driftedCatalog: expectationDrift, driftedCorpus: corpus });
  for (const { driftedCatalog, driftedCorpus } of cases) {
    let calls = 0;
    const configurations = createOfflineConfigurations().map((configuration) => ({ ...configuration, judge_provider: () => { calls += 1; assert.fail("drift must reject before evaluation"); } }));
    await assert.rejects(runSemanticRegression({ catalog: driftedCatalog, corpus: driftedCorpus, configurations }), /semantic regression validation failed/);
    assert.equal(calls, 0);
  }
});

test("report bytes are deterministic and fake outcomes cannot cross configuration slots", async () => {
  const first = await runSemanticRegression({ catalog, corpus, configurations: createOfflineConfigurations() });
  const second = await runSemanticRegression({ catalog, corpus, configurations: createOfflineConfigurations() });
  assert.equal(encodeRegressionReport(first), encodeRegressionReport(second));

  const { calls, configurations } = trackedConfigurations({
    alterPrimary: ({ fixture_id: fixtureId, declared_result: declaredResult }) => fixtureId === "contradiction-gate-2"
      ? { ...clone(declaredResult), candidate_ref: "e".repeat(64) }
      : declaredResult,
  });
  const separated = await runSemanticRegression({ catalog, corpus, configurations });
  assert.equal(separated.configurations[0].summary.mismatched, 1);
  assert.equal(separated.configurations[1].summary.mismatched, 0);
  assert.equal(fixture(separated, "primary", "contradiction-gate-2").code, "judge_contract_rejected");
  assert.equal(fixture(separated, "fallback", "contradiction-gate-2").code, "semantic_rejected");
  assert.ok(calls.primary.length > 0 && calls.fallback.length > 0);
});

test("harness has no live-capable imports and CI dispatches the focused suite exactly once", async () => {
  const source = await readFile(fileURLToPath(new URL("./semantic-regression.mjs", import.meta.url)), "utf8");
  for (const forbidden of ["node:http", "node:https", "fetch(", "WebSocket", "wrangler", "provider_url", "api_key"]) assert.equal(source.includes(forbidden), false);
  assert.match(source, /runCompositeGate/);
  const ci = await readFile(fileURLToPath(new URL("../.github/check-ci.mjs", import.meta.url)), "utf8");
  assert.equal(ci.split("node --test scripts/semantic-regression.test.mjs").length - 1, 1);
});
