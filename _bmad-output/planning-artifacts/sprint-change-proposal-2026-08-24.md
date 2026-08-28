---
title: Sprint Change Proposal — Judge Semantic Discrimination Recovery
project: oddspark
date: 2026-08-24
status: approved
approved_by: Justin
approved_at: 2026-08-24
trigger: Story 1.18 retained semantic NO-GO after lossless reanalysis
scope: moderate
mode: batch
historical_evidence_policy: preserve
provider_execution_authorized: false
deployment_authorized: false
activation_authorized: false
---

# Sprint Change Proposal — Judge Semantic Discrimination Recovery

## 1. Issue Summary

Story 1.18 completed an approved live semantic qualification cycle for the exact structurally qualified primary/fallback judge pair. The retained evidence is a genuine `NO-GO` after the provider-envelope decoding defect was corrected offline and the original response bytes were reanalysed losslessly.

- Run: `semantic-e2680787-efb5-4f18-81ff-bc3fd95f31eb`
- Frozen plan: `5dfd3b7a7915db3554c9f7f234a528edfd1ec3292487d1ec059a9a516859b89e`
- Frozen request set: `6bc8377184c464861cf9e39d2ca97810f5a9ddf0830f257db51920e4f3b9934c`
- Original retained evidence: `d28f0da7b1a1ffa72dc08b3c75b80653c3cb783873c0915db86bed06b72c83ba`
- Reanalysis code identity: `e3b44158e3df2f9ee2efa78fbbf92d5bc4614a2b59bba3f1b2f313424f9b82a8`
- Result: primary `11/24`; fallback `11/24`; no `SEMANTIC` ref emitted.

Both configurations recognized positive goldens and deterministic local rejections but failed to discriminate most deliberate semantic negatives. The primary accepted every provider-evaluated negative fixture; the fallback rejected only a small subset and also failed one golden. This is not a structural-schema failure, a corpus ambiguity, or a threshold failure. The current judge instruction describes the checks but does not require the model to establish each verdict from concrete Candidate/Evidence facts, test contradictions independently, or withhold an overall pass when evidence is insufficient.

The correction therefore changes frozen product intent at the judge prompt/contract boundary. Under AD-11, the prompt-template hash is part of structural identity. Existing structural judge refs remain valid historical evidence for the old prompt but cannot authorize the revised prompt or any downstream semantic, full-request, deployment, or activation evidence.

## 2. Impact Analysis

### Epic and story impact

Epic 1 remains viable. No MVP rollback, provider substitution, corpus weakening, threshold change, or new epic is required.

- Stories 1.3 and 1.4 remain immutable evidence of the original recovery contract and old-prompt structural qualification. Their results are not overwritten or reclassified.
- Story 1.17's fixture IDs, expected outcomes, rubric, goldens, anti-goldens, contradictions, contract-safety cases, and local deterministic cases remain frozen. They are the regression oracle, not values to tune after observing results.
- Story 1.18 retains both completed run histories and its terminal `NO-GO`. A new recovery story is inserted immediately after it: **Story 1.18.1 — Judge Semantic Discrimination Recovery**.
- Story 1.18.1 owns the revised prompt contract, offline adversarial proof, fresh judge structural qualification, and—only after structural `GO` and fresh exact-run approval—a new semantic qualification cycle.
- Stories 1.19, 1.20, and 1.23–1.26 remain blocked from qualification completion or activation until Story 1.18.1 emits current structural and semantic refs. Existing offline implementation may remain, but stale refs cannot be promoted.
- Epics 2–5 remain planned and unchanged; Epic 2 does not begin ahead of this unresolved Epic 1 gate.

### Artifact impact

- **PRD:** no product-scope change. FR-3 already requires 100% rejection of the contradiction set and fail-closed judgment. The correction makes the judge instruction enforce that existing intent.
- **Architecture:** AD-11 needs a narrow clarification that semantic-discrimination instructions and their version/hash are structural judge identity, and that changing them invalidates dependent evidence transitively while preserving old evidence.
- **Epics:** add Story 1.18.1 and update dependencies for Stories 1.19 and 1.20. Add no new provider allowance and weaken no existing acceptance criterion.
- **UX:** no visitor-facing copy, layout, interaction, accessibility, or state-transition change. The correction is below the rendering boundary.
- **Sprint status:** no direct edit. `sprint-status.yaml` is orchestrator-owned; the orchestrator may reconcile the approved story insertion and dependency state.
- **Historical evidence:** every plan, approval, spend record, raw response, evidence bundle, reanalysis, report, terminal record, completion marker, and old qualification ref remains byte-preserved.

### Technical impact

The principal implementation seam is `spikes/judge-fidelity/contract.mjs` (`SYSTEM_PROMPT`) plus the exact identity, fixtures, plan builders, qualification verifiers, semantic harness bindings, and story records that depend on its hash. Production runtime configuration remains inactive and unchanged until the entire qualification chain succeeds and later activation is separately approved.

## 3. Recommended Approach

### Selected path: Direct Adjustment

Revise the judge instruction without changing the canonical response schema, binding rules, provider pair, semantic corpus, thresholds, repair prohibitions, or top-level conjunction.

The revised contract must require the judge to:

1. Evaluate each gate, tone, and claims check independently against the supplied Candidate, Evidence, and grounding report.
2. Treat each check as unproven unless its required facts are present and mutually consistent; absence, ambiguity, or contradiction produces `pass:false` for that check.
3. Search for disqualifying evidence before passing, including capability duplication, channel mismatch, disproportionate scope, non-deliverable advice, weak preservation, consultant/pitch register, unsupported claims, and invitation pressure.
4. Make every reason identify the specific Candidate element and supplied fact or missing fact that controls the decision; generic restatement of the rubric is invalid.
5. Keep checks independent: strength in one check cannot compensate for failure or uncertainty in another.
6. Set top-level `pass:true` only when all nine gates, tone, and claims are individually proven true.
7. Never mention fixture IDs, expected outcomes, corpus labels, or instructions tailored to a known test case.

The response stays the same closed candidate-bound `JudgeResult` and canonical `{pass,gates[9],tone,claims}` shape. Candidate binding, strict schema validation, canonical mapping, ambiguity rejection, no-repair policy, temperature, model pair, and rate accounting remain unchanged.

### Alternatives rejected

- **Lower semantic thresholds or relabel negatives:** rejected because it would redefine success after observing failures and contradict FR-3/Story 1.17.
- **Teach to fixture IDs or expected labels:** rejected because it would measure memorization instead of semantic judgment.
- **Add a second corrective model call or majority vote:** rejected because it changes the six-call architecture and could mask rather than correct discrimination.
- **Switch models/providers now:** rejected because the failure points first to an under-specified judge instruction; AD-11 requires an owner architecture decision before another provider/model course.
- **Treat structural qualification as sufficient:** rejected because Story 1.18 exists specifically to prove product judgment separately from schema fidelity.
- **Rewrite old evidence or reuse old refs:** rejected because frozen identity and append-only evidence are authority boundaries.

### Scope, effort, and risk

- Scope: Moderate.
- Effort: Medium; prompt-contract design and offline mutation testing are small, but every affected live qualification stage requires new immutable plans and separate execution.
- Risk: Medium-high. A prompt can over-reject goldens or merely shift failure modes. Controls are frozen outcomes, adversarial offline fixtures, separate primary/fallback reporting, exact hash binding, no result-driven threshold changes, and a stop after any `NO-GO` for owner review.

## 4. Detailed Change Proposals

### 4.1 Architecture — AD-11

**Old:** structural identity freezes the `prompt-template hash`; Story 1.4 proves structural fidelity and Story 1.18 separately proves semantics.

**New:** retain that separation and explicitly state that the complete semantic-discrimination instruction is part of the judge prompt template. Any change to its decision rules, evidence requirements, reason requirements, uncertainty policy, or top-level pass rule changes structural identity. Old structural and semantic refs become historical/stale for activation; the revised identity must repeat judge structural qualification before semantic qualification.

Add that a semantic `NO-GO` may authorize one owner-approved prompt-contract recovery under a Sprint Change Proposal, but it does not authorize threshold/corpus changes, provider/model substitution, retries, or live calls. Each live stage still requires a fresh exact plan and approval.

### 4.2 Epic 1 — new Story 1.18.1

**Story 1.18.1: Judge Semantic Discrimination Recovery**

As a product owner and operator,  
I want a versioned, evidence-based judge instruction requalified against the frozen semantic oracle,  
So that a schema-valid judge cannot pass deliberate contradictions or unsupported negatives by agreeable default.

**Requirements:** FR3; FR5–FR7; AD-2; AD-11  
**Dependency:** Stories 1.3–1.5, 1.17, and the retained Story 1.18 `NO-GO`; owner approval of this proposal. Live stages additionally require fresh exact-run approval.

**Acceptance Criteria:**

**Given** the retained Story 1.18 evidence and frozen Story 1.17 corpus  
**When** the judge prompt contract is revised  
**Then** it requires independent evidence-based decisions, contradiction-first evaluation, fail-closed uncertainty, specific reasons, and strict top-level conjunction  
**And** response schema, candidate binding, model pair, request parameters, corpus outcomes, thresholds, repair prohibition, and call-budget policy remain unchanged  
**And** no fixture ID, expected label, or case-specific answer appears in the prompt.

**Given** provider fakes and adversarial prompt-contract fixtures  
**When** offline verification runs  
**Then** missing, contradictory, ambiguous, compensating-strength, generic-reason, unsafe-top-level-pass, and case-label leakage mutations reject  
**And** the complete repository verification required by the affected harnesses passes without network activity.

**Given** the final revised prompt identity and passing offline evidence  
**When** a fresh judge structural plan is separately approved and executed  
**Then** primary and fallback qualify independently under the unchanged Story 1.4 structural thresholds  
**And** no old structural ref is reused for the revised prompt  
**And** a required-role `NO-GO` stops before semantic calls and returns to owner review.

**Given** current structural `GO` refs and the unchanged frozen semantic corpus  
**When** a fresh semantic plan is separately approved and executed  
**Then** primary and fallback remain separate, all predeclared Story 1.18 thresholds apply unchanged, and immutable evidence is retained  
**And** only a verified `GO` emits new current `SEMANTIC` authority  
**And** `NO-GO`, incomplete, ambiguous, over-cap, or identity-mismatched evidence emits no ref and blocks Story 1.19.

### 4.3 Story dependency edits

- Story 1.19 dependency changes from `Stories 1.11–1.18` to `Stories 1.11–1.18 and Story 1.18.1`.
- Story 1.20 dependency changes from `Stories 1.14 and 1.17–1.19` to `Stories 1.14, 1.17–1.19, and Story 1.18.1`.
- Activation and release-decision validation must reject old-prompt judge/semantic refs as stale when the configured prompt identity is revised.

### 4.4 Prompt contract — conceptual old to new

**Old behavior:** enumerate the nine checks, tone, and claims; ask for schema-valid booleans/reasons; require the top-level conjunction.

**New behavior:** retain all old requirements, then add a fixed decision protocol: inspect the exact Candidate and supplied facts; identify positive and disqualifying evidence for every check; fail on absence, ambiguity, or contradiction; prohibit cross-check compensation; and write a specific evidence-linked reason. This protocol is normative prompt content and hash-bound qualification input, not hidden harness logic.

The implementation may refine wording during offline development, but it may not change these invariants without another owner decision.

## 5. Implementation Handoff

### Phase A — planning changes and offline implementation

Owner: Architect/Developer.

1. Apply the approved AD-11 and `epics.md` amendments and create the Story 1.18.1 implementation artifact.
2. Version the revised prompt contract and update all exact identity calculations.
3. Add adversarial offline tests for semantic decision discipline and identity invalidation.
4. Run affected focused suites and the repository's complete offline verification.
5. Prepare a fresh judge structural qualification plan from the final clean source/runtime identity.
6. Stop before any provider call, deployment, activation, or remote mutation.

### Phase B — structural qualification

Owner: Operator, after a new exact approval disclosing models, calls, retry policy, retention, maximum cost, expiry, and plan hash.

1. Execute only the approved structural plan.
2. Verify and retain evidence append-only.
3. Stop on `NO-GO`, incomplete evidence, identity drift, or cap breach.
4. On `GO`, prepare—but do not execute—a fresh semantic plan bound to the new structural refs.

### Phase C — semantic qualification

Owner: Operator, after another fresh exact approval.

1. Execute the unchanged frozen Story 1.17 corpus against the newly qualified prompt identity.
2. Retain primary/fallback outcomes separately and verify them independently.
3. Emit `SEMANTIC` authority only on the unchanged predeclared success rule.
4. On `NO-GO`, preserve evidence and return to owner architecture review; do not weaken thresholds, alter fixtures, substitute models, or retry.

### Authority boundary

Approval of this Sprint Change Proposal authorizes Phase A only. It does not authorize a provider call, paid spend, structural or semantic plan execution, deployment, production activation, git push/merge, or remote-resource mutation. Those remain separately governed.

## 6. Success Criteria

1. The revised prompt demands independently proven, evidence-linked decisions and fails closed on missing, ambiguous, or contradictory support.
2. The canonical JudgeResult schema and binding/adapter safety boundaries are unchanged.
3. Frozen semantic fixtures, expected outcomes, and thresholds are unchanged.
4. Old results and refs remain immutable historical evidence and cannot activate the revised identity.
5. Offline adversarial and complete repository verification pass with zero provider calls.
6. A new judge structural `GO` exists for the revised prompt before any semantic rerun begins.
7. A new semantic `GO` under unchanged thresholds exists before Story 1.19 or activation can complete.
8. Any failed or ambiguous stage stops cleanly without retries, substitutions, threshold changes, deployment, or activation.

## 7. Checklist Record

### Trigger and context

- [x] Trigger identified: retained, losslessly reanalysed Story 1.18 semantic `NO-GO`.
- [x] Root cause classified: prompt-contract semantic discrimination gap, not corpus/threshold/schema failure.
- [x] Exact run, plan, request-set, evidence, reanalysis, and result identities recorded.

### Epic impact

- [x] Epic 1 viability confirmed.
- [x] New recovery story and downstream dependency changes identified.
- [x] Epics 2–5 reviewed; unchanged but remain downstream of Epic 1 activation readiness.
- [x] No story rollback, result reclassification, provider bakeoff, or MVP reduction proposed.

### Artifact impact

- [x] PRD reviewed; no change required.
- [x] Architecture reviewed; AD-11 clarification required.
- [x] Epics reviewed; Story 1.18.1 and dependency edits required.
- [x] UX reviewed; no visitor-facing change required.
- [x] Technical contracts, identity builders, harnesses, evidence, and activation dependencies identified.
- [x] `sprint-status.yaml` explicitly left to the orchestrator.

### Path evaluation

- [x] Direct Adjustment evaluated and selected.
- [x] Rollback evaluated and rejected; it would remove evidence without resolving discrimination.
- [x] MVP review evaluated and deferred; existing scope remains achievable through one bounded prompt-contract recovery.
- [x] Threshold/corpus weakening, fixture teaching, extra judge calls, and immediate provider substitution rejected.

### Proposal and handoff

- [x] Issue summary, impact, recommendation, detailed old-to-new changes, responsibilities, and success criteria consolidated in Batch mode.
- [x] Historical evidence preservation and stale-ref behavior stated.
- [x] Phase A offline authority separated from paid structural and semantic execution approvals.
- [x] Justin approved the proposal and authorized Phase A on 2026-08-24.

## 8. Phase A Implementation Result

Phase A completed offline on 2026-08-24. AD-11 and Epic 1 now bind Story 1.18.1; Decision protocol v2 and adversarial contract tests are implemented; the old structurally-GO prompt identity and its zero-call siblings remain immutable owner-reviewed history; focused, governed-CI, and complete repository verification pass.

The fresh external structural plan has ref `3d202e5434fad29eae06a4cdc1bf9b8d4e3dad4a546eef1ebf0c28691a025ce0`, approval run id `7c2c3860-77da-4b9b-aad1-3313f9704c6b`, a 42-call cap, zero retries/replacements, and conservative maximum `$0.3054702`. Its approval template remains blank and unapproved. No provider call, spend, deployment, activation, push, merge, or remote mutation occurred. Story 1.18.1 is `awaiting-operator` for separate exact-run review.

## 9. Structural Result and Semantic Handoff

Justin subsequently approved and executed the exact structural plan within a one-hour authority window. The run completed `GO` after exactly 42 calls: primary and fallback each produced `20/20` direct-valid trials with zero repairs, provider errors, or timeouts. Independent evidence and qualification verification passed. The new role-level ref is `f13c31e02dbf9bce86df62e25775b768dd477a1ef5068c234c95f149e71b749c`.

A fresh semantic plan is prepared outside the repository with ref `2dee38c5cd4d004831999cc1e77e762bd4bccb0d12db6b459fe0f6d9b72d4531`, run id `semantic-1bcf7ce1-9be5-4324-80f4-891a36dc4886`, request-set ref `7cc644407a81d8b8beff144f8cbe241c53ad41decf2b4b4de7a5e64b34daee06`, exactly 38 calls, zero retries/replacements/substitutions, and maximum `$0.40066136`. It remains unapproved and unexecuted. No deployment, production activation, push, or merge occurred.

## 10. Semantic Result and Architecture Return

The first semantic disclosure expired without calls. Justin then approved a refreshed equivalent plan with unchanged request-set identity, schedule, models, policies, and `$0.40066136` maximum. Run `semantic-8baaad6c-95dc-4546-9a7b-1e4afd1f3f7e`, plan ref `2f6d330b61c77dac3c9a358b3371b69275ace32cecfbaa1abdb3ac7878b8c9ae`, completed exactly `38/38` calls with no retries, replacements, substitutions, or generation calls.

The terminal result is `NO-GO semantic_not_qualified`; no `SEMANTIC` ref was emitted. Primary matched `11/24`; fallback matched `8/24`. The primary preserved the approved goldens but continued to miss weak-preservation, capability-duplication, contradiction, and contract-control failures. The fallback over-rejected three approved goldens and still failed to isolate the expected negative checks. Evidence SHA-256 is `033c2c7d46fa920869caaa1a8e38f41ecac90f6423157756d6520cb066eb97c9`; report SHA-256 values are `fa59129f94161e3bc94dbc7cf48db0662f1dcf551a48d963e63d8986eca217e4` and `1f89042790c234220bf1887690af7721ac0eb42952f862803a72c8ce6b153c35`.

The approved stop rule now applies: preserve the evidence and return to owner architecture review. No retry, prompt iteration, fixture or threshold change, model substitution, deployment, or activation is authorized by this proposal. Story 1.18.1 and its downstream semantic dependents remain blocked until a new explicit course correction resolves the judge architecture or changes product intent.
