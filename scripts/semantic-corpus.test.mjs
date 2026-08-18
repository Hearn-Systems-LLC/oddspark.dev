import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { canonicalJson, deriveIdentity, domainHash, loadCorpus, validateCorpus } from "./semantic-corpus.mjs";

const corpusDirectory = fileURLToPath(new URL("../semantic/voice/v1/", import.meta.url));
const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const cliPath = fileURLToPath(new URL("./semantic-corpus.mjs", import.meta.url));
const corpus = await loadCorpus(corpusDirectory);
const clone = (value) => structuredClone(value);

function approve(input) {
  const approved = clone(input);
  const identity = deriveIdentity(approved);
  approved.approval = {
    schema_version: 1,
    status: "approved",
    owner: "Justin",
    corpus_version: "voice-v1",
    hashes: identity.hashes,
    semantic_identity: identity.semantic_identity,
    approved_at: "2026-08-18T12:00:00Z",
  };
  return approved;
}

test("developer corpus is structurally valid but pending and emits no approved identity", () => {
  const report = validateCorpus(corpus);
  assert.equal(report.valid, true);
  assert.equal(report.readiness, "pending_owner_approval");
  assert.equal(report.approved_semantic_identity, null);
  assert.match(report.semantic_identity, /^[a-f0-9]{64}$/);
});

test("contains three complete fixtures per mode in canonical element and gate order", () => {
  for (const mode of ["local", "website"]) assert.equal(corpus.goldens.fixtures.filter((fixture) => fixture.mode === mode).length, 3);
  for (const fixture of corpus.goldens.fixtures) {
    assert.deepEqual(fixture.elements.map(({ element }) => element), corpus.rubric.element_order);
    assert.deepEqual(fixture.expected_gates, Array(9).fill(true));
    assert.ok(fixture.effect.who && fixture.effect.when && fixture.effect.physical_change);
    assert.ok(fixture.preservation.tools.length && fixture.preservation.decision_authority && fixture.preservation.untouched_steps.length);
    assert.equal(fixture.mode === "website" ? typeof fixture.evidence.breadcrumb : fixture.evidence.breadcrumb, fixture.mode === "website" ? "string" : null);
    assert.match(fixture.elements.find(({ element }) => element === "change_level").text, /^Preliminary change: \d+-\d+ (?:days|weeks)/);
  }
});

test("covers every required anti-golden category with an explicit rejection", () => {
  assert.deepEqual(corpus.anti_goldens.fixtures.map(({ category }) => category).sort(), [...corpus.rubric.thresholds.required_anti_golden_categories].sort());
  for (const fixture of corpus.anti_goldens.fixtures) {
    assert.ok(fixture.expected_rejection.gates.length);
    assert.ok(fixture.expected_rejection.rubric_rules.length);
    assert.ok(fixture.expected_rejection.reason);
  }
});

test("public validator handles malformed containers and nested values without throwing", () => {
  for (const malformed of [null, [], {}, { rubric: null, goldens: [], anti_goldens: "bad", approval: 7 }, { ...clone(corpus), goldens: { ...clone(corpus.goldens), fixtures: [null] } }]) {
    assert.doesNotThrow(() => validateCorpus(malformed));
    assert.equal(validateCorpus(malformed).readiness, "invalid");
  }
});

test("rejects duplicate IDs", () => {
  const changed = clone(corpus);
  changed.goldens.fixtures.push(clone(changed.goldens.fixtures[0]));
  const report = validateCorpus(changed);
  assert.equal(report.readiness, "invalid");
  assert.ok(report.errors.some(({ rule }) => rule === "duplicate_id"));
});

test("rejects unknown fields at top-level and nested schemas", () => {
  const top = clone(corpus);
  top.surprise = true;
  assert.ok(validateCorpus(top).errors.some(({ rule }) => rule === "closed_schema"));
  const nested = clone(corpus);
  nested.goldens.fixtures[0].evidence.private_note = "not allowed";
  assert.ok(validateCorpus(nested).errors.some(({ rule }) => rule === "closed_schema"));
});

test("rejects blank and duplicate rubric leaves", () => {
  const cases = [
    ["voice_rule_value", (changed) => { changed.rubric.voice_rules.register = " "; }],
    ["claim_rule_value", (changed) => { changed.rubric.claim_rules.local = ""; }],
    ["gate_boundary_value", (changed) => { changed.rubric.gate_boundary_examples.gate_3_pass = "\t"; }],
    ["duplicate_banned_register", (changed) => { changed.rubric.banned_registers.push(changed.rubric.banned_registers[0].toUpperCase()); }],
  ];
  for (const [rule, mutate] of cases) {
    const changed = clone(corpus);
    mutate(changed);
    assert.ok(validateCorpus(changed).errors.some((error) => error.rule === rule), `missing ${rule}`);
  }
});

test("rejects malformed evidence, preservation, and anti-golden leaves", () => {
  const cases = [
    ["evidence", (changed) => { changed.goldens.fixtures[0].evidence.sources[0] = " "; }],
    ["evidence", (changed) => { changed.goldens.fixtures[3].evidence.supported_claims[0] = ""; }],
    ["website_source_url", (changed) => { changed.goldens.fixtures[3].evidence.sources[0] = "file:///private/site"; }],
    ["website_source_url", (changed) => { changed.goldens.fixtures[3].evidence.sources[0] = "http://127.0.0.1/site"; }],
    ["breadcrumb_evidence", (changed) => { changed.goldens.fixtures[3].evidence.supported_claims[0] = "The public menu names pies."; }],
    ["preservation", (changed) => { changed.goldens.fixtures[0].preservation.tools[0] = ""; }],
    ["preservation", (changed) => { changed.goldens.fixtures[0].preservation.decision_authority = " "; }],
    ["preservation", (changed) => { changed.goldens.fixtures[0].preservation.untouched_steps[0] = ""; }],
    ["stable_id", (changed) => { changed.anti_goldens.fixtures[0].id = "Bad ID"; }],
    ["rejection_reason", (changed) => { changed.anti_goldens.fixtures[0].expected_rejection.rubric_rules[0] = ""; }],
    ["rejection_reason", (changed) => { changed.anti_goldens.fixtures[0].expected_rejection.reason = " "; }],
    ["duplicate_rejection_gate", (changed) => { changed.anti_goldens.fixtures[0].expected_rejection.gates.push(8); }],
  ];
  for (const [rule, mutate] of cases) {
    const changed = clone(corpus);
    mutate(changed);
    assert.ok(validateCorpus(changed).errors.some((error) => error.rule === rule), `missing ${rule}`);
  }
});

test("canonical hashing rejects non-JSON programmatic values with structured validation", () => {
  const sparse = Array(1);
  for (const value of [undefined, Number.NaN, Number.POSITIVE_INFINITY, 1n, () => {}, Symbol("x"), new Date(), sparse]) {
    assert.throws(() => canonicalJson(value), (error) => error.rule === "non_json_value");
    assert.throws(() => domainHash("test", value), (error) => error.rule === "non_json_value");
    const changed = clone(corpus);
    changed.rubric.voice_rules.register = value;
    const report = validateCorpus(changed);
    assert.equal(report.readiness, "invalid");
    assert.equal(report.errors[0].rule, "non_json_value");
  }
});

test("fixed pre-live thresholds cannot be weakened", () => {
  const changed = clone(corpus);
  changed.rubric.thresholds.minimum_goldens_per_mode = 2;
  const report = validateCorpus(changed);
  assert.equal(report.readiness, "invalid");
  assert.ok(report.errors.some(({ rule }) => rule === "fixed_thresholds"));
});

test("rejects breadcrumb, claim, audit, duplication, and helpful-work replacement violations", () => {
  const cases = [
    ["website_breadcrumb_count", (changed) => { changed.goldens.fixtures[3].elements[0].text += " The rotating hand pies"; }],
    ["local_numeric_claim", (changed) => { changed.goldens.fixtures[0].elements[3].text += " Saves 40%."; }],
    ["number_provenance", (changed) => { changed.goldens.fixtures[3].elements[3].text += " Saves 40%."; }],
    ["audit_framing", (changed) => { changed.goldens.fixtures[0].elements[1].text += " This fixes a broken process."; }],
    ["capability_duplication", (changed) => { changed.goldens.fixtures[3].elements[1].text = "Add a new scheduler beside the existing scheduler."; }],
    ["helpful_work_replacement", (changed) => { changed.goldens.fixtures[0].elements[1].text = "Replace the current calendar with this plan."; }],
    ["rhetorical_invitation", (changed) => { changed.goldens.fixtures[0].elements[7].text = "Want to talk this through?"; }],
    ["change_level_shape", (changed) => { changed.goldens.fixtures[0].elements[5].text = "Preliminary change: a few days; 1 step changes and 1 step disappears."; }],
  ];
  for (const [rule, mutate] of cases) {
    const changed = clone(corpus);
    mutate(changed);
    assert.ok(validateCorpus(changed).errors.some((error) => error.rule === rule), `missing rejection for ${rule}`);
  }
});

test("numeric Change Level ranges are allowed while unsupported claim numbers are rejected", () => {
  assert.equal(validateCorpus(corpus).readiness, "pending_owner_approval");
  const localClaim = clone(corpus);
  localClaim.goldens.fixtures[0].elements[3].text += " Saves 2 hours.";
  assert.ok(validateCorpus(localClaim).errors.some(({ rule }) => rule === "local_numeric_claim"));
  const websiteClaim = clone(corpus);
  websiteClaim.goldens.fixtures[3].elements[1].text += " Handles 20 calls.";
  assert.ok(validateCorpus(websiteClaim).errors.some(({ rule }) => rule === "number_provenance"));
});

test("exact Justin approval emits the approved deterministic identity", () => {
  const approved = approve(corpus);
  const first = validateCorpus(approved);
  const second = validateCorpus(clone(approved));
  assert.equal(first.readiness, "approved");
  assert.equal(first.approved_semantic_identity, first.semantic_identity);
  assert.equal(second.semantic_identity, first.semantic_identity);
});

test("content drift invalidates a previously exact approval and names the artifact", () => {
  const approved = approve(corpus);
  approved.goldens.fixtures[0].elements[0].text += " Changed";
  const report = validateCorpus(approved);
  assert.equal(report.readiness, "approval_invalid");
  assert.equal(report.approved_semantic_identity, null);
  assert.ok(report.errors.some(({ rule, message }) => rule === "hash_mismatch" && message.includes("goldens")));
});

test("independently approved rubric and anti-golden drift name their hash domains", () => {
  const rubricDrift = approve(corpus);
  rubricDrift.rubric.voice_rules.register += " Still plain.";
  let report = validateCorpus(rubricDrift);
  assert.equal(report.readiness, "approval_invalid");
  assert.ok(report.errors.some(({ message }) => message.includes("rubric")));
  const antiDrift = approve(corpus);
  antiDrift.anti_goldens.fixtures[0].sample += " More jargon.";
  report = validateCorpus(antiDrift);
  assert.equal(report.readiness, "approval_invalid");
  assert.ok(report.errors.some(({ message }) => message.includes("anti_goldens")));
});

test("threshold drift invalidates approval even when the containing rubric hash is forged", () => {
  const approved = approve(corpus);
  approved.rubric.thresholds.website_breadcrumbs = 2;
  const identity = deriveIdentity(approved);
  approved.approval.hashes.rubric = identity.hashes.rubric;
  approved.approval.semantic_identity = identity.semantic_identity;
  const report = validateCorpus(approved);
  assert.equal(report.readiness, "invalid");
  assert.ok(report.errors.some(({ rule }) => rule === "fixed_thresholds"));
});

test("rejects forged owner, stale identity, missing hashes, and partial pending approval", () => {
  const forged = approve(corpus);
  forged.approval.owner = "Developer";
  assert.equal(validateCorpus(forged).readiness, "invalid");
  const stale = approve(corpus);
  stale.approval.semantic_identity = "0".repeat(64);
  assert.equal(validateCorpus(stale).readiness, "approval_invalid");
  const missing = approve(corpus);
  missing.approval.hashes = null;
  assert.equal(validateCorpus(missing).readiness, "invalid");
  const partial = clone(corpus);
  partial.approval.owner = "Justin";
  assert.equal(validateCorpus(partial).readiness, "invalid");
});

test("rejects invalid approval timestamps, hashes, and identity shapes", () => {
  const cases = [
    ["approval_timestamp", (changed) => { changed.approval.approved_at = "not-a-timestamp"; }],
    ["approval_hash", (changed) => { changed.approval.hashes.goldens = "abc"; }],
    ["approved_shape", (changed) => { changed.approval.semantic_identity = "A".repeat(64); }],
  ];
  for (const [rule, mutate] of cases) {
    const changed = approve(corpus);
    mutate(changed);
    assert.ok(validateCorpus(changed).errors.some((error) => error.rule === rule), `missing ${rule}`);
  }
});

test("CLI reports structured pending readiness and exits nonzero without owner approval", () => {
  const run = spawnSync(process.execPath, [cliPath], { cwd: projectDirectory, encoding: "utf8" });
  assert.equal(run.status, 1);
  const report = JSON.parse(run.stdout);
  assert.equal(report.valid, true);
  assert.equal(report.readiness, "pending_owner_approval");
  assert.equal(report.approved_semantic_identity, null);
  assert.equal(run.stderr, "");
});

test("CLI accepts an independently materialized exact approved directory", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-approved-corpus-"));
  try {
    const approved = approve(corpus);
    const files = { rubric: "rubric.json", goldens: "goldens.json", anti_goldens: "anti-goldens.json", approval: "approval.json" };
    await Promise.all(Object.entries(files).map(([key, filename]) => writeFile(path.join(directory, filename), `${JSON.stringify(approved[key], null, 2)}\n`, "utf8")));
    const run = spawnSync(process.execPath, [cliPath, directory], { cwd: projectDirectory, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const report = JSON.parse(run.stdout);
    assert.equal(report.readiness, "approved");
    assert.equal(report.approved_semantic_identity, approved.approval.semantic_identity);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
