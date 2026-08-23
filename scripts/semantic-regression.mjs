import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { deepFreeze, domainSeparatedHash, encodeCanonicalJson } from "../src/pipeline/contracts.mjs";
import { validateCorpus } from "../src/pipeline/corpus.mjs";
import { runCompositeGate } from "../src/pipeline/gate.mjs";
import { loadCorpus } from "./semantic-corpus.mjs";

const CATALOG_NAMESPACE = "oddspark.semantic.regression.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const CHECKS = Object.freeze([...Array.from({ length: 9 }, (_, index) => `gate-${index + 1}`), "tone", "claims"]);
const INPUTS = Object.freeze(["corpus", "valid_local", "invalid_schema", "mode_linkage", "personal_name", "unsupported_number", "unsupported_grounding"]);
const NUMBER = /(?<![\w.])[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?%?(?![\w.])/g;
const SPARK_INVITATION_SUFFIX = " This Spark is the next step.";
const KINDS = Object.freeze(["corpus_golden", "corpus_anti_golden", "contradiction", "contract_safety", "local_failure"]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const same = (left, right) => encodeCanonicalJson(left) === encodeCanonicalJson(right);
const issue = (pathName, rule, message) => ({ path: pathName, rule, message });

function exactKeys(value, expected, pathName, errors) {
  if (!isObject(value)) {
    errors.push(issue(pathName, "object", "must be an object"));
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!same(actual, wanted)) {
    errors.push(issue(pathName, "closed_schema", "keys differ"));
    return false;
  }
  return true;
}

export function deriveCatalogIdentity(catalog) {
  if (!isObject(catalog)) throw new TypeError("catalog must be an object");
  const { catalog_identity: ignored, ...content } = catalog;
  return domainSeparatedHash(CATALOG_NAMESPACE, "catalog", content);
}

function expectedForFixture(fixture) {
  if (fixture.kind === "local_failure") return { ok: false, code: "local_rejected", judge_calls: 0, failed_checks: [] };
  if (fixture.kind === "contract_safety") return { ok: false, code: "judge_contract_rejected", judge_calls: 1, failed_checks: [] };
  const failed = fixture.verdict.failed_checks;
  return { ok: failed.length === 0, code: failed.length === 0 ? "passed" : "semantic_rejected", judge_calls: 1, failed_checks: failed };
}

function validateSemanticRegressionCatalogUnchecked(catalog, corpus) {
  const errors = [];
  const corpusReport = validateCorpus(corpus);
  if (corpusReport.readiness !== "approved") errors.push(issue("corpus", "approved_authority", "approved voice corpus is required"));
  if (!exactKeys(catalog, ["schema_version", "suite_version", "catalog_identity", "configurations", "corpus", "fixtures"], "catalog", errors)) return { valid: false, catalog_identity: null, errors };
  if (catalog.schema_version !== 1 || catalog.suite_version !== "semantic-regression-v1") errors.push(issue("catalog", "version", "catalog must be semantic-regression-v1 schema 1"));
  if (!SHA256.test(catalog.catalog_identity ?? "")) errors.push(issue("catalog.catalog_identity", "sha256", "must be a lowercase SHA-256"));
  let derivedIdentity = null;
  try {
    derivedIdentity = deriveCatalogIdentity(catalog);
    if (catalog.catalog_identity !== derivedIdentity) errors.push(issue("catalog.catalog_identity", "content_drift", "does not match catalog content"));
  } catch {
    errors.push(issue("catalog", "canonical_json", "catalog must be canonical JSON data"));
  }
  if (!same(catalog.configurations, ["primary", "fallback"])) errors.push(issue("catalog.configurations", "slots", "must declare primary and fallback separately"));

  if (exactKeys(catalog.corpus, ["corpus_version", "semantic_identity", "golden_ids", "anti_golden_ids"], "catalog.corpus", errors)) {
    const goldenIds = Array.isArray(corpus?.goldens?.fixtures) ? corpus.goldens.fixtures.map(({ id }) => id) : [];
    const antiIds = Array.isArray(corpus?.anti_goldens?.fixtures) ? corpus.anti_goldens.fixtures.map(({ id }) => id) : [];
    if (catalog.corpus.corpus_version !== corpus?.rubric?.corpus_version) errors.push(issue("catalog.corpus.corpus_version", "linkage", "does not match approved corpus"));
    if (catalog.corpus.semantic_identity !== corpusReport.approved_semantic_identity) errors.push(issue("catalog.corpus.semantic_identity", "linkage", "does not match approved corpus"));
    if (!same(catalog.corpus.golden_ids, goldenIds)) errors.push(issue("catalog.corpus.golden_ids", "corpus_drift", "must bind every golden ID in corpus order"));
    if (!same(catalog.corpus.anti_golden_ids, antiIds)) errors.push(issue("catalog.corpus.anti_golden_ids", "corpus_drift", "must bind every anti-golden ID in corpus order"));
  }

  if (!Array.isArray(catalog.fixtures) || catalog.fixtures.length === 0) errors.push(issue("catalog.fixtures", "array", "must be a non-empty array"));
  const ids = new Set();
  const corpusRefs = { corpus_golden: [], corpus_anti_golden: [] };
  const failedCoverage = new Set();
  for (const [index, fixture] of (Array.isArray(catalog.fixtures) ? catalog.fixtures : []).entries()) {
    const fixturePath = `catalog.fixtures[${index}]`;
    if (!exactKeys(fixture, ["id", "kind", "corpus_ref", "input", "verdict", "expected"], fixturePath, errors)) continue;
    if (typeof fixture.id !== "string" || !/^[a-z0-9-]+$/.test(fixture.id)) errors.push(issue(`${fixturePath}.id`, "stable_id", "must be kebab-case"));
    if (ids.has(fixture.id)) errors.push(issue(`${fixturePath}.id`, "duplicate", "fixture IDs must be unique"));
    ids.add(fixture.id);
    if (!KINDS.includes(fixture.kind)) errors.push(issue(`${fixturePath}.kind`, "enum", "unknown fixture kind"));
    if (!INPUTS.includes(fixture.input)) errors.push(issue(`${fixturePath}.input`, "enum", "unknown input recipe"));
    if (["corpus_golden", "corpus_anti_golden"].includes(fixture.kind)) {
      if (typeof fixture.corpus_ref !== "string") errors.push(issue(`${fixturePath}.corpus_ref`, "required", "corpus fixtures require a corpus reference"));
      else corpusRefs[fixture.kind].push(fixture.corpus_ref);
    } else if (fixture.corpus_ref !== null) errors.push(issue(`${fixturePath}.corpus_ref`, "forbidden", "non-corpus fixtures cannot name a corpus reference"));

    if (fixture.kind === "local_failure") {
      if (fixture.verdict !== null) errors.push(issue(`${fixturePath}.verdict`, "forbidden", "local failures cannot declare a provider verdict"));
    } else if (exactKeys(fixture.verdict, ["failed_checks", "candidate_ref", "top_level_pass"], `${fixturePath}.verdict`, errors)) {
      if (!Array.isArray(fixture.verdict.failed_checks) || fixture.verdict.failed_checks.some((check) => !CHECKS.includes(check)) || new Set(fixture.verdict.failed_checks).size !== fixture.verdict.failed_checks.length) errors.push(issue(`${fixturePath}.verdict.failed_checks`, "checks", "must contain unique canonical checks"));
      else fixture.verdict.failed_checks.forEach((check) => failedCoverage.add(check));
      if (!["bound", "mismatch"].includes(fixture.verdict.candidate_ref)) errors.push(issue(`${fixturePath}.verdict.candidate_ref`, "enum", "must be bound or mismatch"));
      if (fixture.verdict.top_level_pass !== "conjunction" && typeof fixture.verdict.top_level_pass !== "boolean") errors.push(issue(`${fixturePath}.verdict.top_level_pass`, "enum", "must be conjunction or a boolean contradiction"));
    }
    if (!exactKeys(fixture.expected, ["ok", "code", "judge_calls", "failed_checks"], `${fixturePath}.expected`, errors) || !same(fixture.expected, expectedForFixture(fixture))) errors.push(issue(`${fixturePath}.expected`, "expectation", "does not match the declared fixture semantics"));
  }

  if (!same(corpusRefs.corpus_golden, catalog.corpus?.golden_ids ?? [])) errors.push(issue("catalog.fixtures", "golden_binding", "golden fixtures must bind every declared golden exactly once"));
  if (!same(corpusRefs.corpus_anti_golden, catalog.corpus?.anti_golden_ids ?? [])) errors.push(issue("catalog.fixtures", "anti_golden_binding", "anti-golden fixtures must bind every declared anti-golden exactly once"));
  for (const fixture of corpus?.anti_goldens?.fixtures ?? []) {
    const declared = catalog.fixtures?.find((entry) => entry.kind === "corpus_anti_golden" && entry.corpus_ref === fixture.id);
    const expectedChecks = fixture.expected_rejection.gates.map((gate) => `gate-${gate}`);
    if (!declared || !same(declared.verdict?.failed_checks, expectedChecks)) errors.push(issue(`catalog.fixtures.${fixture.id}`, "anti_golden_expectation", "must preserve the approved anti-golden gate expectation"));
  }
  for (const check of CHECKS) if (!failedCoverage.has(check)) errors.push(issue("catalog.fixtures", "semantic_coverage", `missing explicit failure coverage for ${check}`));
  return { valid: errors.length === 0, catalog_identity: derivedIdentity, errors };
}

export function validateSemanticRegressionCatalog(catalog, corpus) {
  try {
    return validateSemanticRegressionCatalogUnchecked(catalog, corpus);
  } catch {
    return { valid: false, catalog_identity: null, errors: [issue("catalog", "validation_failure", "catalog could not be validated safely")] };
  }
}

export async function loadSemanticRegressionCatalog(directory = fileURLToPath(new URL("../semantic/regression/v1/", import.meta.url))) {
  return deepFreeze(JSON.parse(await readFile(path.join(directory, "catalog.json"), "utf8")));
}

function baseCandidate() {
  return {
    version: 1,
    mode: "local",
    title: "A calmer inquiry handoff",
    plan: "Route repeated questions into one reviewed response.",
    why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." },
    what_gets_better: "The team starts with a useful draft instead of an empty page.",
    before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." },
    change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true },
    stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] },
    invitation: "We can inspect this Spark together and map a clear first step.",
    grounded_numbers: [],
  };
}

function baseInput() {
  return {
    evidence_context: {
      attempt_id: "semantic-regression-attempt",
      evidence: { version: 1, mode: "local", priors: { region: "Blue Water Area", season: "summer", date: "current", situation: "repeated inquiries", capability_bundle: ["software"] } },
      rubric_version: "voice-v1",
    },
    candidate: baseCandidate(),
  };
}

function domainInputWithMissingGrounding() {
  const value = baseInput();
  value.candidate.mode = "domain";
  value.candidate.why_fits = { text: "The site emphasizes quick response.", breadcrumb: "Replies arrive within 24 hours" };
  value.candidate.grounded_numbers = ["24"];
  const claims = [
    value.candidate.title,
    value.candidate.why_fits.text,
    value.candidate.why_fits.breadcrumb,
    value.candidate.what_gets_better,
    value.candidate.before_after.before,
    value.candidate.before_after.after,
    value.candidate.change_level.time_range,
    ...value.candidate.stays_same.tools,
    ...value.candidate.stays_same.authority,
    ...value.candidate.stays_same.steps,
    value.candidate.invitation,
    ...value.candidate.grounded_numbers,
  ];
  value.evidence_context.evidence = {
    version: 1,
    mode: "domain",
    vertical: "services",
    clarity: "clear",
    capabilities: ["inquiry routing"],
    channels: [],
    observation: { source_id: "home", url: "https://example.com", text: claims.join(" | ") },
    scanned_urls: ["https://example.com"],
  };
  return value;
}

function corpusEntry(corpus, kind, id) {
  const collection = kind === "corpus_golden" ? corpus?.goldens?.fixtures : corpus?.anti_goldens?.fixtures;
  return Array.isArray(collection) ? collection.find((entry) => entry.id === id) : undefined;
}

function elementText(fixture, name) {
  return fixture?.elements?.find((entry) => entry.element === name)?.text ?? "";
}

function sparkInvitation(text) {
  return /\bSpark\b/.test(text) ? text : `${text}${SPARK_INVITATION_SUFFIX}`;
}

function nameSafe(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  return `${text.charAt(0)}${text.slice(1).replace(/\bSpark\b/g, "\u0000").toLowerCase().replaceAll("\u0000", "Spark")}`;
}

function parseBeforeAfter(text) {
  const match = /^Before:\s*([\s\S]*?)\s*After:\s*([\s\S]*)$/.exec(text);
  if (!match) throw new TypeError("golden before_after must contain Before:/After:");
  return { before: match[1].trim(), after: match[2].trim() };
}

function parseChangeLevel(text) {
  const match = /^Preliminary change:\s*([^;]+);\s*(\d+)\s+[\s\S]*?changes and\s+(\d+)\s+/.exec(text);
  if (!match) throw new TypeError("golden change_level must declare a preliminary time range and step counts");
  return { time_range: match[1].trim(), steps_changed: Number(match[2]), steps_removed: Number(match[3]), preliminary: true };
}

function numericTokens(text) {
  return typeof text === "string" ? [...text.matchAll(NUMBER)].map((match) => match[0]) : [];
}

function claimTexts(candidate) {
  return [
    candidate.title, candidate.plan, candidate.why_fits.text, candidate.why_fits.breadcrumb, candidate.what_gets_better,
    candidate.before_after.before, candidate.before_after.after, candidate.change_level.time_range,
    ...candidate.stays_same.tools, ...candidate.stays_same.authority, ...candidate.stays_same.steps,
    candidate.invitation, ...(candidate.notice ? [candidate.notice] : []), ...candidate.grounded_numbers,
  ].filter((value) => typeof value === "string");
}

function localEvidence(entry) {
  return {
    version: 1,
    mode: "local",
    priors: {
      region: "Blue Water Area",
      season: "current",
      date: "current",
      situation: Array.isArray(entry.evidence?.sources) ? entry.evidence.sources.join("; ") : "approved corpus",
      capability_bundle: ["software"],
    },
  };
}

function domainEvidence(entry, candidate) {
  const url = typeof entry.evidence?.sources?.[0] === "string" && entry.evidence.sources[0].startsWith("https://")
    ? entry.evidence.sources[0]
    : "https://example.com/oddspark-fixtures/corpus";
  return {
    version: 1,
    mode: "domain",
    vertical: "services",
    clarity: "clear",
    capabilities: Array.isArray(entry.evidence?.supported_claims) && entry.evidence.supported_claims.length
      ? [...entry.evidence.supported_claims]
      : ["public site"],
    channels: [],
    observation: { source_id: "corpus", url, text: claimTexts(candidate).join(" | ") },
    scanned_urls: [url],
  };
}

function finalizeCandidate(candidate) {
  const visit = (value) => {
    if (typeof value === "string") return nameSafe(value);
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, key === "mode" || key === "version" || typeof entry === "number" || typeof entry === "boolean" ? entry : visit(entry)]));
    return value;
  };
  const safe = visit(candidate);
  safe.invitation = sparkInvitation(safe.invitation);
  return safe;
}

export function projectCorpusInput(entry, kind) {
  if (kind === "corpus_anti_golden") {
    const mode = entry.mode === "website" ? "domain" : "local";
    const candidate = finalizeCandidate({
      version: 1,
      mode,
      title: "Approved corpus sample",
      plan: entry.sample,
      why_fits: mode === "domain"
        ? { text: "The public site already names the relevant offer.", breadcrumb: entry.evidence?.breadcrumb ?? "public site offer" }
        : { text: "Local seasonal work benefits from a smaller first pass." },
      what_gets_better: "The named worker starts from one concrete next step.",
      before_after: { before: "The team rebuilds the same reply.", after: "The team reviews one prepared reply." },
      change_level: { time_range: "a short setup window", steps_changed: 1, steps_removed: 0, preliminary: true },
      stays_same: {
        tools: ["current notebook"],
        authority: ["the owner still chooses the next job"],
        steps: ["doing the work"],
      },
      invitation: "We can inspect this Spark together and map a clear first step.",
      grounded_numbers: [],
    });
    if (mode === "domain") {
      const whyFits = { text: candidate.why_fits.text, breadcrumb: candidate.why_fits.breadcrumb };
      if (typeof entry.evidence?.breadcrumb === "string" && entry.evidence.breadcrumb) whyFits.breadcrumb = entry.evidence.breadcrumb;
      candidate.why_fits = whyFits;
      candidate.grounded_numbers = [...new Set(numericTokens([candidate.plan, candidate.why_fits.text, candidate.why_fits.breadcrumb].join(" ")))];
    }
    return {
      evidence_context: { attempt_id: `semantic-regression-${entry.id}`, evidence: mode === "domain" ? domainEvidence(entry, candidate) : localEvidence(entry), rubric_version: "voice-v1" },
      candidate,
    };
  }

  const mode = entry.mode === "website" ? "domain" : "local";
  const whyFits = { text: elementText(entry, "why_it_fits") };
  if (mode === "domain") whyFits.breadcrumb = entry.evidence?.breadcrumb ?? "";
  const candidate = finalizeCandidate({
    version: 1,
    mode,
    title: elementText(entry, "spark_title"),
    plan: elementText(entry, "the_plan"),
    why_fits: whyFits,
    what_gets_better: elementText(entry, "what_gets_better"),
    before_after: parseBeforeAfter(elementText(entry, "before_after")),
    change_level: parseChangeLevel(elementText(entry, "change_level")),
    stays_same: {
      tools: [...(entry.preservation?.tools ?? [])],
      authority: [entry.preservation?.decision_authority].filter((value) => typeof value === "string"),
      steps: [...(entry.preservation?.untouched_steps ?? [])],
    },
    invitation: elementText(entry, "implementation_invitation"),
    grounded_numbers: [],
  });
  if (mode === "domain") {
    const declared = Array.isArray(entry.evidence?.supported_claims) ? entry.evidence.supported_claims : [];
    candidate.grounded_numbers = [...new Set([
      ...declared.flatMap(numericTokens),
      ...numericTokens(claimTexts({ ...candidate, change_level: { ...candidate.change_level, time_range: "" }, grounded_numbers: [] }).join(" ")),
    ])];
  }
  return {
    evidence_context: { attempt_id: `semantic-regression-${entry.id}`, evidence: mode === "domain" ? domainEvidence(entry, candidate) : localEvidence(entry), rubric_version: "voice-v1" },
    candidate,
  };
}

function inputFor(fixture, corpus) {
  if (fixture.input === "corpus") {
    const entry = corpusEntry(corpus, fixture.kind, fixture.corpus_ref);
    if (!entry) throw new TypeError(`missing corpus fixture ${fixture.corpus_ref}`);
    return projectCorpusInput(entry, fixture.kind);
  }
  if (fixture.input === "unsupported_grounding") return domainInputWithMissingGrounding();
  const value = baseInput();
  if (fixture.input === "invalid_schema") value.candidate.extra = true;
  if (fixture.input === "mode_linkage") value.candidate.mode = "domain";
  if (fixture.input === "personal_name") value.candidate.plan = "Ask Alice Smith for approval.";
  if (fixture.input === "unsupported_number") value.candidate.plan = "Save 2 hours.";
  return value;
}

function declaredJudgeResult(fixture, candidateRef) {
  const failed = new Set(fixture.verdict.failed_checks);
  const gates = Array.from({ length: 9 }, (_, index) => ({ gate: index + 1, pass: !failed.has(`gate-${index + 1}`), reason: `offline ${fixture.id} gate ${index + 1}` }));
  const tone = { pass: !failed.has("tone"), reason: `offline ${fixture.id} tone` };
  const claims = { pass: !failed.has("claims"), reason: `offline ${fixture.id} claims` };
  const conjunction = gates.every(({ pass }) => pass) && tone.pass && claims.pass;
  return deepFreeze({
    candidate_ref: fixture.verdict.candidate_ref === "bound" ? candidateRef : "f".repeat(64),
    verdict: { pass: fixture.verdict.top_level_pass === "conjunction" ? conjunction : fixture.verdict.top_level_pass, gates, tone, claims },
  });
}

function failedChecks(decision) {
  if (!decision) return [];
  return [
    ...decision.gates.filter(({ pass }) => !pass).map(({ gate }) => `gate-${gate}`),
    ...(!decision.tone.pass ? ["tone"] : []),
    ...(!decision.claims.pass ? ["claims"] : []),
  ];
}

function projectOutcome(result) {
  return { ok: result.ok, code: result.code, judge_calls: result.judge_calls, failed_checks: failedChecks(result.decision) };
}

function validateConfigurations(configurations, slots) {
  if (!Array.isArray(configurations) || configurations.length !== slots.length) throw new TypeError("primary and fallback configurations are required");
  configurations.forEach((configuration, index) => {
    if (!exactKeys(configuration, ["slot", "judge", "judge_provider"], `configurations[${index}]`, [])) throw new TypeError("configuration must contain only slot, judge, and judge_provider");
    if (configuration.slot !== slots[index] || typeof configuration.judge_provider !== "function") throw new TypeError("configurations must provide separate primary and fallback fakes in catalog order");
  });
}

export async function runSemanticRegression({ catalog, corpus, configurations }) {
  const validation = validateSemanticRegressionCatalog(catalog, corpus);
  if (!validation.valid) throw new TypeError(`semantic regression validation failed: ${validation.errors.map(({ path: issuePath, rule }) => `${issuePath}:${rule}`).join(", ")}`);
  validateConfigurations(configurations, catalog.configurations);
  const reports = [];
  for (const configuration of configurations) {
    const fixtureResults = [];
    let providerCalls = 0;
    let judgeCalls = 0;
    for (const fixture of catalog.fixtures) {
      const result = await runCompositeGate(inputFor(fixture, corpus), {
        judge: configuration.judge,
        rubric: corpus,
        judge_provider: async (request) => {
          providerCalls += 1;
          const declaredResult = declaredJudgeResult(fixture, request.candidate_ref);
          return configuration.judge_provider(deepFreeze({ slot: configuration.slot, fixture_id: fixture.id, request, declared_result: declaredResult }));
        },
      });
      judgeCalls += result.judge_calls;
      const actual = projectOutcome(result);
      fixtureResults.push(deepFreeze({ fixture_id: fixture.id, code: result.code, judge_calls: result.judge_calls, decision: result.decision ?? null, matched: same(actual, fixture.expected) }));
    }
    const matched = fixtureResults.filter((result) => result.matched).length;
    reports.push(deepFreeze({
      slot: configuration.slot,
      fixtures: fixtureResults,
      summary: { total: fixtureResults.length, matched, mismatched: fixtureResults.length - matched, judge_calls: judgeCalls, provider_calls: providerCalls },
    }));
  }
  return deepFreeze({ schema_version: 1, suite_version: catalog.suite_version, catalog_identity: catalog.catalog_identity, corpus_identity: catalog.corpus.semantic_identity, configurations: reports });
}

export function createOfflineConfigurations() {
  return ["primary", "fallback"].map((slot) => ({
    slot,
    judge: { role: "STRUCT-JUDGE", provider: `offline-${slot}`, resolved_model: `semantic-regression-${slot}`, qualification_ref: slot === "primary" ? "a".repeat(64) : "b".repeat(64), status: "active", outcome: "GO" },
    judge_provider: ({ declared_result: declaredResult }) => declaredResult,
  }));
}

export function encodeRegressionReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

async function main() {
  const catalog = await loadSemanticRegressionCatalog();
  const corpus = await loadCorpus(fileURLToPath(new URL("../semantic/voice/v1/", import.meta.url)));
  const report = await runSemanticRegression({ catalog, corpus, configurations: createOfflineConfigurations() });
  process.stdout.write(encodeRegressionReport(report));
  process.exitCode = report.configurations.every(({ summary }) => summary.mismatched === 0) ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
