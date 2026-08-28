import assert from "node:assert/strict";
import test from "node:test";
import { buildCommittedBrief, deriveCandidateRef, CANDIDATE_SCHEMA_VERSION, sha256Hex } from "./brief-contracts.mjs";
import { committedBriefAsText, committedBriefJson, committedBriefPresentation, projectCommittedBrief, renderCommittedBriefMarkup } from "./brief-rendering.mjs";

const hash = "a".repeat(64);
function fixture({ id = "brief-1", mode = "local", requestScope = mode, notice, empty = false } = {}) {
  const brief = {
    version: 1, mode, title: "A <quiet> Spark", plan: "Put & proof where the handoff happens.",
    why_fits: { text: "It fits the existing routine.", ...(mode === "domain" ? { breadcrumb: "Public page > service" } : {}) },
    what_gets_better: "The next action becomes clear.", before_after: { before: "A caller waits.", after: "A caller can act." },
    change_level: { time_range: "one short work session", steps_changed: 1, steps_removed: 0, preliminary: true },
    stays_same: empty ? { tools: [], authority: [], steps: [] } : { tools: ["The & ledger"], authority: ["Owner <approval>"], steps: ["Final review"] },
    invitation: "Bring this Spark to Hearn and map a clear first step.", grounded_numbers: [], ...(notice ? { notice } : {}),
  };
  return buildCommittedBrief({ artifact_version: 1, id, request_scope: requestScope, brief, brief_schema_version: 1,
    policy_identity: hash, rubric_identity: hash, provenance: { attempt_id: "attempt-1", candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief), evidence_ref: hash, grounding_report_version: 1, effective_mode: mode } });
}

test("projects the eight elements in UX-DR1 order and revalidates every entry point", () => {
  const envelope = fixture();
  const projection = projectCommittedBrief(envelope);
  assert.deepEqual(Object.keys(projection).slice(5, 13), ["title", "plan", "why_fits", "what_gets_better", "before_after", "change_level", "stays_same", "invitation"]);
  assert.deepEqual(committedBriefJson(envelope), envelope);
  for (const render of [projectCommittedBrief, renderCommittedBriefMarkup, committedBriefAsText, committedBriefPresentation]) {
    assert.throws(() => render({ ...envelope, legacy: true }));
    assert.throws(() => render(envelope.brief));
  }
});

test("derives a deterministic public-id-only committed geometry fingerprint", () => {
  const envelope = fixture({ id: "public-brief-id" });
  const expected = sha256Hex("oddspark-seed-geometry/v1\0committed_brief\0public-brief-id");
  assert.deepEqual(projectCommittedBrief(envelope).geometry, { version: 1, hash: expected });
  assert.deepEqual(projectCommittedBrief(envelope).geometry, projectCommittedBrief(structuredClone(envelope)).geometry);
  const changedProvenance = structuredClone(envelope);
  changedProvenance.provenance.attempt_id = "attempt-elsewhere";
  changedProvenance.provenance.evidence_ref = "b".repeat(64);
  changedProvenance.policy_identity = "c".repeat(64);
  changedProvenance.rubric_identity = "d".repeat(64);
  assert.deepEqual(projectCommittedBrief(changedProvenance).geometry, projectCommittedBrief(envelope).geometry);
  assert.equal(JSON.stringify(projectCommittedBrief(envelope).geometry).includes(envelope.provenance.attempt_id), false);
});

test("escapes every markup branch while JSON and text remain literal", () => {
  const envelope = fixture({ notice: "Quiet <notice> & honest." });
  const markup = renderCommittedBriefMarkup(envelope);
  assert.doesNotMatch(markup, /<quiet>|<notice>|<approval>/);
  assert.match(markup, /A &lt;quiet&gt; Spark/);
  assert.match(markup, /Quiet &lt;notice&gt; &amp; honest/);
  assert.equal(committedBriefJson(envelope).brief.title, "A <quiet> Spark");
  assert.match(committedBriefAsText(envelope), /A <quiet> Spark/);
});

test("mode controls breadcrumb while request scope controls sharing", () => {
  assert.ok(projectCommittedBrief(fixture()).share);
  const downgrade = projectCommittedBrief(fixture({ requestScope: "domain" }));
  assert.equal(downgrade.mode, "local"); assert.equal(downgrade.share, null); assert.equal(downgrade.why_fits.breadcrumb, null);
  const domain = projectCommittedBrief(fixture({ mode: "domain" }));
  assert.equal(domain.share, null); assert.equal(domain.why_fits.breadcrumb, "Public page > service");
});

test("empty stays-same groups render the fixed sentence without headings", () => {
  const markup = renderCommittedBriefMarkup(fixture({ empty: true }));
  assert.match(markup, /Nothing in the current routine is replaced\./);
  assert.doesNotMatch(markup, /<h2>Tools|<h2>Authority|<h2>Steps/);
});

test("contract-valid but unroutable ids fail at every presentation boundary", () => {
  for (const id of ["valid/by-envelope", "x".repeat(129)]) {
    const envelope = fixture({ id });
    for (const render of [committedBriefJson, projectCommittedBrief, renderCommittedBriefMarkup, committedBriefAsText, committedBriefPresentation]) {
      assert.throws(() => render(envelope), /not routable/);
    }
  }
});
