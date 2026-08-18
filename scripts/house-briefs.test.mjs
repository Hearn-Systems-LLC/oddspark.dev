import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  approvalIdentity,
  authorityHashes,
  buildCatalog,
  catalogIdentity,
  loadHouseBriefInputs,
  runCli,
  selectHouseBrief,
  validateCatalog,
  verifyApproval,
} from "./house-briefs.mjs";

const read = async (file) => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
const fixture = await (async () => ({
  catalog: await read("content/house-briefs/v1/catalog.json"),
  approval: await read("content/house-briefs/v1/approval.json"),
  priors: await read("content/local-priors/v1/priors.json"),
  rubric: await read("semantic/voice/v1/rubric.json"),
}))();
const authorities = { priors: fixture.priors, rubric: fixture.rubric };
const clone = (value) => structuredClone(value);
const rules = (result) => result.issues.map((entry) => entry.rule);

test("valid catalog covers every canonical season and returns a deterministic deeply frozen artifact", () => {
  const first = buildCatalog(fixture.catalog, authorities);
  const second = buildCatalog(clone(fixture.catalog), authorities);
  assert.deepEqual(first.issues, []);
  assert.equal(first.content_hash, second.content_hash);
  assert.equal(first.content_hash, catalogIdentity(fixture.catalog));
  assert.ok(Object.isFrozen(first.catalog));
  assert.ok(Object.isFrozen(first.catalog.entries));
  assert.ok(Object.isFrozen(first.catalog.entries[0].brief.stays_same.tools));
  assert.throws(() => { first.catalog.entries[0].brief.title = "changed"; }, TypeError);
  for (const season of fixture.priors.seasons.map(({ id }) => id)) {
    const entries = first.catalog.entries.filter((entry) => entry.season_id === season);
    assert.ok(entries.length >= 2);
    assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length);
    for (const entry of entries) {
      assert.deepEqual(Object.keys(entry.expected_outcome.gates), fixture.rubric.gate_order.map(String));
      assert.ok(Object.values(entry.expected_outcome.gates).every((outcome) => outcome === "pass"));
      assert.equal(entry.expected_outcome.tone, "pass");
      assert.equal(entry.expected_outcome.claims, "pass");
    }
    const selected = selectHouseBrief(fixture.catalog, { season_id: season, selection_key: `coverage-${season}` }, authorities);
    assert.equal(selected.selected.season_id, season);
    assert.ok(Object.isFrozen(selected.selected));
  }
});

test("stable IDs reject non-kebab separators, repeated hyphens, and edge hyphens", () => {
  for (const id of ["winter_answer", "winter--answer", "winter-answer-", "-winter-answer", "Winter-answer"]) {
    const catalog = clone(fixture.catalog);
    catalog.entries[0].id = id;
    assert.deepEqual(rules(buildCatalog(catalog, authorities)), ["stable_id"], id);
  }
});

test("selection is stable, season-bound, key-sensitive, and returns frozen catalog entries", () => {
  const a = selectHouseBrief(fixture.catalog, { season_id: "winter", selection_key: "stable-request-a" }, authorities);
  const repeat = selectHouseBrief(fixture.catalog, { season_id: "winter", selection_key: "stable-request-a" }, authorities);
  assert.equal(a.selected.id, repeat.selected.id);
  assert.ok(Object.isFrozen(a.selected));
  const alternate = Array.from({ length: 100 }, (_, index) => `stable-request-${index}`).map((selection_key) => selectHouseBrief(fixture.catalog, { season_id: "winter", selection_key }, authorities).selected.id).find((id) => id !== a.selected.id);
  assert.ok(alternate, "at least one changed stable key selects the other winter entry");
  assert.equal(selectHouseBrief(fixture.catalog, { season_id: "monsoon", selection_key: "stable" }, authorities).selected, null);
  for (const selection_key of ["", "   ", "TODO", "placeholder-request"]) {
    const result = selectHouseBrief(fixture.catalog, { season_id: "winter", selection_key }, authorities);
    assert.equal(result.selected, null);
    assert.deepEqual(rules(result), ["selection_key"]);
  }
});

test("catalog drift fails closed with stable issues and no usable catalog", () => {
  const cases = [
    ["unknown field", (catalog) => { catalog.extra = true; }, "closed_schema"],
    ["placeholder", (catalog) => { catalog.entries[0].brief.plan = "TODO later"; }, "placeholder"],
    ["duplicate id", (catalog) => { catalog.entries[1].id = catalog.entries[0].id; }, "duplicate_id"],
    ["duplicate content", (catalog) => { catalog.entries[1].brief = clone(catalog.entries[0].brief); }, "duplicate_content"],
    ["missing season", (catalog) => { catalog.entries = catalog.entries.filter((entry) => entry.season_id !== "fall"); }, "season_coverage"],
    ["unknown season", (catalog) => { catalog.entries[0].season_id = "monsoon"; }, "season"],
    ["malformed Brief", (catalog) => { delete catalog.entries[0].brief.plan; }, "brief_closed_schema"],
    ["business claim", (catalog) => { catalog.entries[0].brief.plan = "Guarantee more revenue with this plan."; }, "prohibited_claim"],
    ["pricing", (catalog) => { catalog.entries[0].brief.plan = "Add a tool with a monthly fee."; }, "brief_pricing"],
    ["percentage", (catalog) => { catalog.entries[0].brief.plan = "Reduce work by 20%."; }, "brief_local_qualitative"],
    ["personal name", (catalog) => { catalog.entries[0].brief.plan = "Ask Taylor Morgan to review each answer."; }, "personal_name"],
    ["banned register", (catalog) => { catalog.entries[0].brief.plan = "Create a best-in-class guide from approved answers."; }, "banned_register"],
    ["bad Gate", (catalog) => { catalog.entries[0].expected_outcome.gates[4] = "fail"; }, "gate_expectations"],
    ["bad tone", (catalog) => { catalog.entries[0].expected_outcome.tone = "unknown"; }, "tone_expectation"],
    ["bad claims", (catalog) => { catalog.entries[0].expected_outcome.claims = "fail"; }, "claims_expectation"],
  ];
  for (const [name, mutate, expectedRule] of cases) {
    const catalog = clone(fixture.catalog); mutate(catalog);
    const result = buildCatalog(catalog, authorities);
    assert.equal(result.catalog, null, name);
    assert.equal(result.content_hash, null, name);
    assert.ok(rules(result).includes(expectedRule), `${name}: expected ${expectedRule}, got ${rules(result)}`);
  }
});

test("representative drift emits stable issue codes in deterministic order", () => {
  const unknown = clone(fixture.catalog); unknown.extra = true;
  assert.deepEqual(rules(validateCatalog(unknown, authorities)), ["closed_schema"]);
  const combined = clone(fixture.catalog);
  combined.entries[0].brief.plan = "TODO later";
  combined.entries[0].expected_outcome.tone = "unknown";
  assert.deepEqual(rules(validateCatalog(combined, authorities)), ["placeholder", "personal_name", "tone_expectation"]);
  const duplicate = clone(fixture.catalog); duplicate.entries[1].id = duplicate.entries[0].id;
  assert.deepEqual(rules(validateCatalog(duplicate, authorities)), ["duplicate_id"]);
});

test("canonical authority drift fails closed", () => {
  const priors = clone(fixture.priors); priors.seasons.push({ id: "mud", months: [], cues: [] });
  assert.ok(rules(buildCatalog(fixture.catalog, { priors, rubric: fixture.rubric })).includes("canonical_seasons"));
  const rubric = clone(fixture.rubric); rubric.gate_order = [1, 2];
  assert.ok(rules(buildCatalog(fixture.catalog, { priors: fixture.priors, rubric })).includes("gate_set"));
});

test("Gate authority must be exactly canonical Gates 1-9", () => {
  for (const gate_order of [[1, 2, 3, 4, 5, 6, 7, 8, 10], [2, 1, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8, "9"]]) {
    const rubric = clone(fixture.rubric); rubric.gate_order = gate_order;
    assert.ok(rules(buildCatalog(fixture.catalog, { priors: fixture.priors, rubric })).includes("gate_set"));
  }
});

test("banned-register authority rejects empty, blank, non-string, and untrimmed values", () => {
  for (const banned_registers of [[], [""], ["   "], [42], [" leverage"], ["leverage "]]) {
    const rubric = clone(fixture.rubric); rubric.banned_registers = banned_registers;
    assert.ok(rules(buildCatalog(fixture.catalog, { priors: fixture.priors, rubric })).includes("banned_registers"));
  }
});

test("catalog authority hashes bind exact valid priors and voice-rubric content", () => {
  const hashes = authorityHashes(authorities);
  assert.equal(fixture.catalog.authority.canonical_priors_hash, hashes.priors);
  assert.equal(fixture.catalog.authority.canonical_voice_rubric_hash, hashes.voice_rubric);
  const priors = clone(fixture.priors); priors.region.framing += " This remains qualitative.";
  assert.deepEqual(rules(buildCatalog(fixture.catalog, { priors, rubric: fixture.rubric })), ["priors_authority_hash"]);
  const rubric = clone(fixture.rubric); rubric.voice_rules.confidence += " Keep it concise.";
  assert.deepEqual(rules(buildCatalog(fixture.catalog, { priors: fixture.priors, rubric })), ["voice_rubric_authority_hash"]);
});

test("omitted and malformed authority arguments fail closed without throwing", () => {
  for (const value of [undefined, null, [], "authority", {}, { priors: fixture.priors }, { rubric: fixture.rubric }]) {
    assert.doesNotThrow(() => validateCatalog(fixture.catalog, value));
    assert.equal(validateCatalog(fixture.catalog, value).valid, false);
    assert.ok(rules(validateCatalog(fixture.catalog, value)).some((rule) => ["canonical_seasons", "voice_rubric"].includes(rule)));
  }
});

test("pending approval is exact-hash-bound but never ready", () => {
  const result = verifyApproval(fixture.catalog, fixture.approval, authorities);
  assert.equal(result.status, "pending_owner_approval");
  assert.equal(result.ready, false);
  assert.equal(result.content_hash, fixture.approval.content_hash);
  assert.deepEqual(result.issues, []);
});

test("only Justin's explicit exact approved record is ready", () => {
  const approval = {
    schema_version: 1,
    catalog_version: 1,
    status: "approved",
    approver: "Justin",
    content_hash: catalogIdentity(fixture.catalog),
    identity: null,
    approved_at: "2026-08-18T12:00:00.000Z",
  };
  approval.identity = approvalIdentity(approval);
  const result = verifyApproval(fixture.catalog, approval, authorities, { now: new Date("2026-08-18T13:00:00.000Z") });
  assert.equal(result.status, "approved");
  assert.equal(result.ready, true);
  assert.deepEqual(result.issues, []);
  for (const mutate of [
    (record) => { record.approver = "developer"; },
    (record) => { record.content_hash = "0".repeat(64); },
    (record) => { record.identity = "0".repeat(64); },
    (record) => { record.approved_at = "not-a-date"; },
    (record) => { record.extra = true; },
  ]) {
    const drifted = clone(approval); mutate(drifted);
    assert.equal(verifyApproval(fixture.catalog, drifted, authorities, { now: new Date("2026-08-18T13:00:00.000Z") }).ready, false);
  }
});

test("approval shape, status, version, and time branches fail closed", () => {
  const approved = {
    schema_version: 1, catalog_version: 1, status: "approved", approver: "Justin",
    content_hash: catalogIdentity(fixture.catalog), identity: null, approved_at: "2026-08-18T12:00:00.000Z",
  };
  approved.identity = approvalIdentity(approved);
  const cases = [
    [null, "object"],
    [[], "object"],
    [{}, "closed_schema"],
    [{ ...approved, status: "unknown" }, "status"],
    [{ ...approved, schema_version: 2 }, "version"],
    [{ ...approved, catalog_version: 2 }, "version"],
    [{ ...approved, approved_at: "2026-08-18T12:00:00Z" }, "timestamp"],
    [{ ...approved, approved_at: "2026-08-19T12:00:00.000Z" }, "timestamp"],
    [{ ...fixture.approval, approver: "Justin" }, "pending_shape"],
    [{ ...fixture.approval, identity: "0".repeat(64) }, "pending_shape"],
    [{ ...fixture.approval, approved_at: "2026-08-18T12:00:00.000Z" }, "pending_shape"],
  ];
  for (const [record, expected] of cases) {
    const result = verifyApproval(fixture.catalog, record, authorities, { now: new Date("2026-08-18T13:00:00.000Z") });
    assert.equal(result.ready, false);
    assert.ok(rules(result).includes(expected), `${expected}: ${rules(result)}`);
  }
});

test("valid authority drift invalidates an otherwise exact approved record", () => {
  const approval = {
    schema_version: 1, catalog_version: 1, status: "approved", approver: "Justin",
    content_hash: catalogIdentity(fixture.catalog), identity: null, approved_at: "2026-08-18T12:00:00.000Z",
  };
  approval.identity = approvalIdentity(approval);
  assert.equal(verifyApproval(fixture.catalog, approval, authorities, { now: new Date("2026-08-18T13:00:00.000Z") }).ready, true);
  const priors = clone(fixture.priors); priors.region.framing += " Still qualitative.";
  assert.equal(verifyApproval(fixture.catalog, approval, { priors, rubric: fixture.rubric }).ready, false);
  const rubric = clone(fixture.rubric); rubric.voice_rules.scope += " Keep the intervention small.";
  assert.equal(verifyApproval(fixture.catalog, approval, { priors: fixture.priors, rubric }).ready, false);
});

test("catalog or approval hash drift never reports ready", () => {
  const catalog = clone(fixture.catalog);
  catalog.entries[0].brief.title = "A different ready answer card";
  const result = verifyApproval(catalog, fixture.approval, authorities);
  assert.equal(result.ready, false);
  assert.equal(result.status, "invalid");
  assert.ok(rules(result).includes("content_hash"));
});

test("loader and runCli report checked-in pending state and malformed JSON", async () => {
  const loaded = await loadHouseBriefInputs();
  assert.deepEqual(loaded.issues, []);
  assert.equal(loaded.catalog.catalog_version, 1);
  const pending = await runCli();
  assert.equal(pending.structure_valid, true);
  assert.equal(pending.readiness, "pending_owner_approval");
  assert.equal(pending.production_ready, false);
  assert.equal(pending.content_hash, fixture.approval.content_hash);

  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-house-briefs-"));
  try {
    const malformedPath = path.join(directory, "approval.json");
    await writeFile(malformedPath, "{not-json\n", "utf8");
    const malformedLoad = await loadHouseBriefInputs({ approvalPath: malformedPath });
    assert.deepEqual(rules(malformedLoad), ["json_parse"]);
    const malformed = await runCli({ approvalPath: malformedPath });
    assert.equal(malformed.structure_valid, false);
    assert.equal(malformed.readiness, "invalid");
    assert.equal(malformed.production_ready, false);
    assert.deepEqual(rules(malformed), ["json_parse"]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("executable emits JSON and exits one for pending and malformed states", async () => {
  const pending = spawnSync(process.execPath, ["scripts/house-briefs.mjs"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(pending.status, 1);
  assert.equal(JSON.parse(pending.stdout).readiness, "pending_owner_approval");
  assert.equal(pending.stderr, "");

  const directory = await mkdtemp(path.join(tmpdir(), "oddspark-house-cli-"));
  try {
    const malformedPath = path.join(directory, "approval.json");
    await writeFile(malformedPath, "{bad\n", "utf8");
    const program = `import { runCli } from ${JSON.stringify(new URL("./house-briefs.mjs", import.meta.url).href)}; const report = await runCli({ approvalPath: ${JSON.stringify(malformedPath)} }); process.stdout.write(JSON.stringify(report)); process.exitCode = report.production_ready ? 0 : 1;`;
    const malformed = spawnSync(process.execPath, ["--input-type=module", "--eval", program], { encoding: "utf8" });
    assert.equal(malformed.status, 1);
    assert.equal(JSON.parse(malformed.stdout).readiness, "invalid");
    assert.equal(malformed.stderr, "");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
