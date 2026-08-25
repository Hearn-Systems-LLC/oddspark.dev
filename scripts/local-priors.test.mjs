import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import {
  approvalIdentity,
  canonicalJson,
  contentIdentity,
  projectLocalPrior,
  resolveSeason,
  runCli,
  validatePriors,
  verifyApproval,
  verifyLocalPriors,
} from "./local-priors.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const priors = JSON.parse(await readFile(path.join(ROOT, "content/local-priors/v1/priors.json"), "utf8"));
const checkedInApproval = JSON.parse(await readFile(path.join(ROOT, "content/local-priors/v1/approval.json"), "utf8"));
const clone = (value) => structuredClone(value);
const pendingApproval = {
  schema_version: 1,
  catalog_version: priors.catalog_version,
  status: "pending_owner_approval",
  approver: null,
  content_hash: null,
  identity: null,
  approved_at: null,
};

function approvedRecord(catalog = priors, overrides = {}) {
  const record = {
    schema_version: 1,
    catalog_version: catalog.catalog_version,
    status: "approved",
    approver: "Justin",
    content_hash: contentIdentity(catalog),
    identity: null,
    approved_at: "2026-08-18T12:00:00.000Z",
    ...overrides,
  };
  if (!("identity" in overrides)) record.identity = approvalIdentity(record);
  return record;
}

test("canonical catalog is structurally valid with complete delivery coverage", () => {
  const result = validatePriors(priors);
  assert.deepEqual(result, { valid: true, issues: [] });
  const categories = new Set(priors.capability_bundles.flatMap((bundle) => bundle.categories));
  assert.deepEqual([...categories].sort(), ["adjacent_digital_systems", "ai_automation", "data_workflows", "integrations", "online_opportunities", "software"]);
  for (const situation of priors.situations) {
    assert.ok(situation.compatible_capability_bundle_ids.length > 0);
    assert.deepEqual(Object.keys(situation.preservation).sort(), ["decision_authority", "tools", "untouched_steps"]);
  }
});

test("pending developer catalog verifies structurally without approved identity or production readiness", async () => {
  const report = verifyLocalPriors(priors, pendingApproval);
  assert.equal(report.structure_valid, true);
  assert.equal(report.readiness, "pending_owner_approval");
  assert.equal(report.production_ready, false);
  assert.equal(Object.hasOwn(report, "approved_identity"), false);
  assert.match(report.content_hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(report.issues, []);
});

test("checked-in approved CLI prints its exact production-ready identity and exits zero", async () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts/local-priors.mjs")], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.readiness, "approved");
  assert.equal(report.production_ready, true);
  assert.equal(report.approved_identity, "2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded");
  assert.deepEqual(await runCli(), report);
  assert.deepEqual(checkedInApproval.identity, report.approved_identity);
});

test("exact owner approval binds version, canonical content, identity, and timestamp", () => {
  const approval = approvedRecord();
  const report = verifyLocalPriors(priors, approval, { now: new Date("2026-08-19T00:00:00.000Z") });
  assert.equal(report.readiness, "approved");
  assert.equal(report.production_ready, true);
  assert.equal(report.approved_identity, approval.identity);
  assert.deepEqual(report.issues, []);
});

test("meteorological boundary dates and leap day resolve deterministically", () => {
  const cases = {
    "2024-02-29": "winter",
    "2026-03-01": "spring",
    "2026-05-31": "spring",
    "2026-06-01": "summer",
    "2026-08-31": "summer",
    "2026-09-01": "fall",
    "2026-11-30": "fall",
    "2026-12-01": "winter",
  };
  for (const [date, expected] of Object.entries(cases)) assert.equal(resolveSeason(date, priors).id, expected);
});

test("invalid dates and ambiguous or missing season coverage fail closed", () => {
  for (const date of ["2026-02-29", "2026-13-01", "2026-01-00", "08/18/2026", "2026-08-18T00:00:00Z"]) assert.throws(() => resolveSeason(date, priors), /valid ISO calendar date/);
  const ambiguous = clone(priors);
  ambiguous.seasons[1].months.push(2);
  assert.throws(() => resolveSeason("2026-02-01", ambiguous), /exactly one season/);
  const missing = clone(priors);
  missing.seasons[0].months = [12, 1];
  assert.throws(() => resolveSeason("2026-02-01", missing), /exactly one season/);
});

test("compatible projection returns only the closed judge evidence shape", () => {
  const projected = projectLocalPrior(priors, { date: "2026-08-18", situation_id: "repeated-inquiries", capability_bundle_id: "inquiry-handoff" });
  assert.deepEqual(Object.keys(projected), ["mode", "priors"]);
  assert.equal(projected.mode, "local");
  assert.deepEqual(Object.keys(projected.priors), ["region", "season", "date", "situation", "capability_bundle"]);
  assert.equal(projected.priors.region, "Port Huron / Blue Water Area");
  assert.match(projected.priors.season, /^summer:/);
  assert.ok(projected.priors.capability_bundle.every((entry) => typeof entry === "string" && entry.length > 0));
});

test("unknown, dangling, and incompatible projection references fail closed", () => {
  assert.throws(() => projectLocalPrior(priors, { date: "2026-08-18", situation_id: "missing", capability_bundle_id: "inquiry-handoff" }), /unknown situation/);
  assert.throws(() => projectLocalPrior(priors, { date: "2026-08-18", situation_id: "repeated-inquiries", capability_bundle_id: "missing" }), /unknown capability bundle/);
  assert.throws(() => projectLocalPrior(priors, { date: "2026-08-18", situation_id: "repeated-inquiries", capability_bundle_id: "operations-bridge" }), /incompatible/);
});

test("projection options must be an intentional plain object", () => {
  for (const options of [undefined, null, [], "options"]) assert.throws(() => projectLocalPrior(priors, options), { name: "TypeError", message: "projection options must be a plain object" });
});

test("closed schemas reject unknown top-level and nested keys without throwing", () => {
  const top = clone(priors);
  top.surprise = true;
  assert.equal(validatePriors(top).issues.some((entry) => entry.rule === "closed_schema"), true);
  const nested = clone(priors);
  nested.situations[0].preservation.cookie = "no";
  assert.equal(validatePriors(nested).issues.some((entry) => entry.rule === "closed_schema"), true);
  assert.doesNotThrow(() => validatePriors({ ...priors, region: null }));
});

test("non-JSON values are rejected by canonicalization and validation", () => {
  assert.throws(() => canonicalJson({ value: undefined }), /rejects undefined/);
  assert.throws(() => canonicalJson({ value: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalJson(new Date()), /non-plain/);
  const malformed = clone(priors);
  malformed.region.framing = undefined;
  const result = validatePriors(malformed);
  assert.equal(result.valid, false);
  assert.equal(result.issues[0].rule, "non_json_value");
});

test("duplicate IDs, empty bundles, missing coverage, and dangling references are rejected", () => {
  const duplicate = clone(priors);
  duplicate.capability_bundles[1].id = duplicate.capability_bundles[0].id;
  assert.equal(validatePriors(duplicate).issues.some((entry) => entry.rule === "duplicate_id"), true);
  const empty = clone(priors);
  empty.capability_bundles[0].capabilities = [];
  assert.equal(validatePriors(empty).issues.some((entry) => entry.rule === "string_array"), true);
  const uncovered = clone(priors);
  uncovered.capability_bundles.forEach((bundle) => { bundle.categories = bundle.categories.filter((category) => category !== "ai_automation"); });
  assert.equal(validatePriors(uncovered).issues.some((entry) => entry.rule === "category_coverage"), true);
  const dangling = clone(priors);
  dangling.situations[0].compatible_capability_bundle_ids.push("missing-bundle");
  assert.equal(validatePriors(dangling).issues.some((entry) => entry.rule === "dangling_bundle"), true);
});

test("prohibited claim classes are bound to the exact canonical restrictions", () => {
  const changed = clone(priors);
  changed.prohibited_claim_classes[0] = "some other restriction";
  assert.equal(validatePriors(changed).issues.some((entry) => entry.rule === "prohibited_claim_classes"), true);
  const reordered = clone(priors);
  reordered.prohibited_claim_classes.reverse();
  assert.equal(validatePriors(reordered).issues.some((entry) => entry.rule === "prohibited_claim_classes"), true);
});

test("identifier-like catalog values reject leading or trailing whitespace", () => {
  const mutations = [
    (catalog) => { catalog.seasons[0].id = "winter "; },
    (catalog) => { catalog.capability_bundles[0].id = " inquiry-handoff"; },
    (catalog) => { catalog.capability_bundles[0].categories[0] = "software "; },
    (catalog) => { catalog.situations[0].id = "repeated-inquiries "; },
    (catalog) => { catalog.situations[0].compatible_capability_bundle_ids[0] = "inquiry-handoff "; },
  ];
  for (const mutate of mutations) {
    const changed = clone(priors);
    mutate(changed);
    assert.equal(validatePriors(changed).issues.some((entry) => entry.rule === "identifier_whitespace"), true);
  }
});

test("malformed approval fails closed without unchecked-property exceptions", () => {
  const report = verifyLocalPriors(priors, { status: "approved" });
  assert.equal(report.readiness, "invalid");
  assert.equal(report.production_ready, false);
  assert.equal(report.issues.some((entry) => entry.rule === "closed_schema"), true);
});

test("standalone approval verifier contains malformed and non-JSON inputs", () => {
  const nonFinitePriors = clone(priors);
  nonFinitePriors.catalog_version = Number.POSITIVE_INFINITY;
  const circularPriors = clone(priors);
  circularPriors.circular = circularPriors;
  const nonJsonApproval = approvedRecord();
  nonJsonApproval.catalog_version = Number.NaN;
  const circularApproval = approvedRecord();
  circularApproval.circular = circularApproval;
  for (const [candidatePriors, candidateApproval] of [
    [null, pendingApproval],
    [nonFinitePriors, pendingApproval],
    [circularPriors, pendingApproval],
    [priors, nonJsonApproval],
    [priors, circularApproval],
  ]) {
    let result;
    assert.doesNotThrow(() => { result = verifyApproval(candidatePriors, candidateApproval); });
    assert.equal(result.approved, false);
    assert.equal(result.status, "invalid");
    assert.ok(result.issues.length > 0);
  }
});

test("invalid or non-Date verification clocks return structured invalid results", () => {
  for (const now of [new Date(Number.NaN), "2026-08-19T00:00:00.000Z", null, 0]) {
    let result;
    assert.doesNotThrow(() => { result = verifyApproval(priors, approvedRecord(), { now }); });
    assert.equal(result.approved, false);
    assert.equal(result.status, "invalid");
    assert.equal(result.issues.some((entry) => entry.rule === "clock"), true);
  }
});

test("CLI reports malformed JSON as structured issues instead of throwing", async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "oddspark-local-priors-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const priorsPath = path.join(directory, "priors.json");
  const approvalPath = path.join(directory, "approval.json");
  await Promise.all([
    writeFile(priorsPath, "{not-json", "utf8"),
    writeFile(approvalPath, JSON.stringify(pendingApproval), "utf8"),
  ]);
  const report = await runCli({ priorsPath, approvalPath });
  assert.equal(report.structure_valid, false);
  assert.equal(report.readiness, "invalid");
  assert.equal(report.issues.some((entry) => entry.rule === "json_parse"), true);
});

test("forged, stale, future-dated, version-mismatched, and content-drift approvals fail closed", () => {
  const now = new Date("2026-08-19T00:00:00.000Z");
  const cases = [
    approvedRecord(priors, { approver: "Developer", identity: "0".repeat(64) }),
    approvedRecord(priors, { content_hash: "0".repeat(64), identity: "0".repeat(64) }),
    approvedRecord(priors, { approved_at: "2026-08-20T00:00:00.000Z" }),
    approvedRecord(priors, { catalog_version: 2 }),
    approvedRecord(priors, { identity: "f".repeat(64) }),
  ];
  for (const approval of cases) assert.equal(verifyApproval(priors, approval, { now }).approved, false);
  const drifted = clone(priors);
  drifted.region.framing += " Drift.";
  assert.equal(verifyApproval(drifted, approvedRecord(), { now }).approved, false);
});

test("canonical identity is stable across object key insertion order", () => {
  const reordered = Object.fromEntries(Object.entries(priors).reverse());
  assert.equal(contentIdentity(reordered), contentIdentity(priors));
});
