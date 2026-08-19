---
title: Sprint Change Proposal — Qualification Transport and Zero-Call Recovery Boundaries
project: oddspark
date: 2026-08-19
status: approved
approved_by: Justin
approved_at: 2026-08-19
trigger: Story 1.11 generation probe NO-GO and Story 1.4 judge identity-preflight stop
scope: moderate
mode: incremental
historical_evidence_policy: preserve
provider_execution_authorized: false
---

# Sprint Change Proposal — Qualification Transport and Zero-Call Recovery Boundaries

## 1. Issue Summary

Two retained qualification attempts exposed boundary defects rather than evidence about the intended model roles.

1. Generation run `story-1-11-2026-08-19-r2` made two probe calls. Workers AI returned one structured Candidate as the complete JSON text value at the documented chat transport location, but the adapter forwarded the provider transport envelope to the Candidate validator. Both roles therefore produced structural `NO-GO` outcomes at the wrong boundary.
2. Judge recovery run `025daf8e-e455-44d1-840e-d67730f52279` stopped at adapter identity preflight with zero calls. Correcting the expected health identity changed current source hashes, after which the recovery finder treated the retained, marker-bound zero-call attempt as unverifiable and consumed/blocking even though no qualification allowance was spent.

The first defect conflates provider transport with the internal Candidate contract. The second conflates current-source qualification validity with the narrower historical fact that no provider call began.

## 2. Approved Policy

Justin approved the following exact boundaries on 2026-08-19:

- Transport-envelope decoding is an adapter responsibility.
- The adapter may decode exactly one structured response value from the frozen transport location.
- Decoding may not repair, coerce, extract prose, accept fenced or trailing content, weaken the Candidate schema, or synthesize any Candidate field.
- Candidate validation remains the existing closed, authoritative generation classifier after transport decoding.
- A completed, marker-bound, independently verified zero-call preflight attempt does not consume the judge recovery qualification allowance.
- Such an attempt remains retained. It is never deleted, overwritten, reclassified as a qualification result, or used to emit qualification refs.
- Source drift may invalidate the attempt for current qualification while leaving its independently proven zero-call accounting usable for allowance recovery.
- Replacement generation and judge plans may be prepared after offline correction, but neither plan may be executed without a new exact approval.

## 3. Impact Analysis

### Epic and story impact

Epic 1 remains viable. No epic, MVP, UX, or user-facing behavior changes.

- Story 1.4: clarify that verified preflight stops before the first durable call-start transition consume zero of the one governed recovery matrix; retained artifacts remain historical evidence.
- Story 1.11: clarify the provider-wire-to-Candidate mapping and permit one replacement plan for this disclosed adapter-boundary defect while preserving the two-call r2 evidence and its historical result.
- Stories 1.12–1.13: no implementation change is required; they remain blocked until current generation and judge structural refs exist.
- AD-2/AD-11: make the already established judge adapter principle explicit for generation: a frozen adapter may remove a validated provider transport envelope and parse its one complete JSON value, but may not alter the internal contract.

### Artifact impact

- PRD: no change.
- UX: no change. This correction is below the visitor-facing pipeline boundary.
- Architecture and epics: narrow clarifications only.
- Qualification harnesses: generation adapter/fixtures and judge recovery accounting/verifier tests change.
- Historical results: every existing plan, approval, spend receipt, evidence file, report, qualification bundle, and completion marker remains byte-preserved.

## 4. Recommended Approach

### Selected path: Direct Adjustment

Implement two closed seams:

1. A strict generation transport decoder that accepts only the frozen single-choice response location, parses the entire content as one JSON value, and passes that value unchanged to the existing Candidate classifier.
2. A historical zero-call verifier that grants only allowance recovery when a completed artifact set proves a preflight-blocked run, zero records, zero authorized calls made, and no durable call-start/spend evidence. Current-source verification remains mandatory for any called attempt, qualification outcome, manifest, or ref.

### Rejected alternatives

- Teaching the Candidate validator about provider envelopes would weaken the internal contract and couple production classification to transport details.
- Extracting a JSON-looking substring, stripping fences, filling fields, or coercing types would convert invalid output into invented output.
- Deleting the judge preflight artifact would violate retention and erase evidence.
- Counting every preflight attempt as the one matrix would turn safe fail-closed checks into irreversible spend despite zero calls.
- Executing replacement plans as part of this correction would exceed the approved offline scope.

### Risk and controls

Scope is moderate and owned by Architect plus Developer. Adversarial tests must prove rejection of multiple choices, alternate response locations, non-string content, prose/fences/trailing text, non-object JSON, malformed JSON, schema-invalid Candidates, marker tampering, nonzero records, call-start receipts, partial publication, and qualification/ref misuse.

## 5. Implementation Sequence

1. Amend architecture, Epic 1 acceptance language, and the affected story records without changing historical outcomes.
2. Implement and test strict generation transport decoding.
3. Implement and test retained historical zero-call accounting.
4. Run repository verification entirely offline.
5. Prepare a fresh generation plan and a fresh judge recovery plan from the final source/runtime identities.
6. Stop. Do not start adapters for inference, create approvals, or execute either plan.

## 6. Success Criteria

1. Exactly one complete structured Candidate value crosses the generation adapter boundary unchanged; every repair, coercion, prose extraction, ambiguity, and schema weakening case fails closed.
2. The existing Candidate classifier remains the sole Candidate-schema authority.
3. The retained judge preflight artifact remains present and independently proves zero calls despite later source correction.
4. Zero-call verification can only restore allowance; it cannot emit a GO, a qualification manifest, or a qualification ref.
5. Any evidence of a started call, ambiguous accounting, invalid marker, partial publication, or tampering remains blocking.
6. Fresh plans bind the final corrected source/runtime identities and remain unapproved and unexecuted.
7. No provider call, deployment, activation, production binding, remote mutation, commit, or push occurs.

## 7. Checklist Record

- [x] Triggering stories and retained attempts identified.
- [x] Root causes classified as adapter and qualification-accounting boundary defects.
- [x] Epic 1 remains viable; no MVP rollback or new epic required.
- [x] PRD and UX reviewed; no change required.
- [x] Architecture, epics, story records, harnesses, tests, and plans identified as affected.
- [x] Historical evidence preservation and non-reclassification policy stated.
- [x] Direct Adjustment selected; rollback and schema weakening rejected.
- [x] Provider execution, deployment, activation, remote mutation, commit, and push excluded.
- [x] Justin explicitly approved correct-course review and offline implementation on 2026-08-19.
- [x] Justin explicitly approved the transport-decoding and retained zero-call policies on 2026-08-19.
- [x] Architect/Developer handoff confirmed for offline implementation and plan preparation only.

## 8. Implementation Result

- Strict single-choice, whole-content JSON transport decoding implemented with adversarial rejection coverage; the closed Candidate classifier remains unchanged.
- Historical zero-call verification implemented as an allowance-only path. It requires marker-bound complete publication, exact evidence-byte binding, derived preflight blockers, zero records/call accounting/usage/cost, valid retained plan bindings, NO-GO manifests, and no qualification refs.
- The retained r2 generation evidence and retained judge preflight evidence remain present and unchanged.
- Generation r3 plan prepared: `5d372eaa391223059e64c95a7c4cf311ceb5313cca9a769bd9736d21e8cfe028`, run ID `story-1-11-2026-08-19-r3`, 42 calls, maximum `$0.07436835`.
- Judge r3 plan prepared outside the repository: `6c59946072b346de35b8b1a32ca8c3357e24957d8a84a3f767c5170e42e4eccf`, run ID `b792c8ec-fe38-4343-9c05-18bd4627cb53`, 42 calls, maximum `$0.13602225`, profile `default`, Paid plan.
- Focused verification passed: generation 17/17; judge 77/77 plus 79/79 fixtures and 18/18 predicates; application 49/49; baseline 57/57; local priors/evidence, production generation, Brief contracts/receipts/rendering, and strike-orchestrator suites; type/config/runtime-baseline and `git diff --check` passed.
- The aggregate `npm run check` remains nonzero only because existing semantic-corpus, house-catalog, and one composite-gate test still assert the pre-approval state after Justin's approved voice/catalog records. Those unrelated stale test expectations were not changed in this correction.
- No provider call, adapter inference session, plan execution, deployment, activation, remote mutation, commit, or push occurred.
