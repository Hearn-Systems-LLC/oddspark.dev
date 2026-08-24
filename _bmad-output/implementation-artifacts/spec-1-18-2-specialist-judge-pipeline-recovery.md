---
title: 'Story 1.18.2: Specialist Judge Pipeline Recovery'
type: 'corrective-feature'
created: '2026-08-24'
status: 'ready-for-dev'
baseline_revision: 'f6d271100996ea92ab5af3af8932f2898388a93b'
provider_execution_authorized: false
deployment_authorized: false
activation_authorized: false
operator_actions: []
---

<intent-contract>

## Intent

**Problem:** The broad single-call judge remained semantically unreliable after Decision protocol v2: primary matched `11/24`, fallback `8/24`, and no semantic authority exists.

**Approach:** Replace broad judgment with deterministic prechecks and a coherence → fit → quality specialist waterfall. Give each specialist disjoint checks and a closed, candidate-bound, pointer-supported result. Keep deterministic code as the sole overall verdict authority. Qualify specialist configurations independently and compose only complete current GO refs.

## Boundaries & Constraints

**Always:** Preserve historical evidence; keep the approved corpus and exact zero-mismatch expectations; reject unknown/ambiguous/contradictory/malformed results; retain invoked-call accounting; select fallback only before invocation; keep findings internal; use one composite judge ref and semantic ref downstream.

**Block If:** Check ownership overlaps or leaves a gap; a model can emit overall authority; pointers are not validated; a downstream reservation is released after invocation; a Candidate can be re-judged; any specialist/configuration pools evidence; composite authority can exist with a missing/stale member; focused or full offline verification fails.

**Never:** Change corpus outcomes or weaken zero-mismatch qualification; add result-driven retries, a fourth semantic call, majority voting, cross-specialist compensation, fixture labels in prompts, model/provider substitution, provider calls, deployment, activation, or remote mutation under this story's offline authority.

</intent-contract>

## Contract Matrix

| Boundary | Required behavior | Failure behavior |
|---|---|---|
| Deterministic precheck | Own mechanical schema/linkage/provenance/reference/token rules | Reject with zero specialist calls |
| Coherence | Exactly Gates 1/2/8 | Non-pass stops; fit/quality uninvoked |
| Fit | Exactly Gates 3/4/5/6 | Non-pass stops; quality uninvoked |
| Quality | Exactly Gate 7/Gate 9/tone/qualitative claims/invitation | Non-pass rejects |
| SpecialistResult | Exact binding/IDs/outcome/reason; canonical allowed RFC 6901 pointers across Candidate/Evidence/GroundingReport with non-empty targets and absence-field coverage | Contract reject |
| Selection | Freeze all three structurally+semantically qualified choices from one current canonical availability snapshot before coherence | Reject before specialists; no same-Candidate switch |
| Ledger | Twelve calls; four-slot attempt reservation; release only uninvoked slots | House fallback on insufficient capacity/time |
| Qualification | Exhaustive specialist execution; zero mismatches | No role/pipeline/semantic ref |
| Activation | One complete pipeline `judge_ref` plus combined `semantic_ref` | Partial/stale authority disables model pipeline |

## Tasks and Acceptance

- [ ] Define versioned deterministic precheck ownership and the closed `SpecialistResult` classifier.
- [ ] Define separate coherence, fit, and quality prompt/contracts without fixture-label leakage.
- [ ] Implement deterministic aggregation and internal-only diagnostic retention.
- [ ] Upgrade the strike ledger/reservation state machine to twelve calls and at most three specialists per Candidate.
- [ ] Implement independent per-specialist qualification/selection and pre-invocation fallback only.
- [ ] Implement three separately consumed structural-cycle authorities: exact plan/cap/approval/evidence/terminal state per specialist, batch disclosure permitted, no allowance transfer/resume, and same-source/runtime composition only.
- [ ] Add exhaustive structural and semantic harnesses plus `JudgePipelineQualificationSet` and combined semantic authority verification.
- [ ] Freeze the closed ownership and fixture expectation manifests, canonical RFC 6901 pointer rules/allowlists, CandidateJudgeSelection snapshot, and slot state machine.
- [ ] Bind configuration-specific semantic GO/NO-GO into three `SpecialistSemanticQualificationSet` values; runtime selection requires both structural and semantic GO before health routing, and one combined semantic ref requires all three specialist semantic roles GO.
- [ ] Add adversarial mutations for missing/extra checks, invalid pointers, generic reasons, unknowns, cross-specialist compensation, overall-verdict injection, reservation laundering, same-Candidate retry, partial composite refs, and identity drift.
- [ ] Produce a Story 1.19 deadline handoff that marks 15 seconds non-authoritative, names required per-stage/commit-reserve measurements, and proves activation rejects a missing or mismatched owner-approved finite ceiling.
- [ ] Run focused checks, governed CI, complete applicable repository verification, and `git diff --check` offline.
- [ ] Prepare—but do not approve or execute—fresh exact structural and semantic plan disclosures only after final offline identities are frozen.

## Verification

- Specialist contract and adversarial unit tests
- Semantic regression with all specialists independently exercised
- Strike ledger/reservation/fallback tests
- Composite qualification/activation verifier tests
- `CI=1 node .github/check-ci.mjs`
- `npm run check`
- `git diff --check`

## Authority

Justin approved the architecture decisions on 2026-08-24. That approval authorizes this offline story only. No provider execution, spend, deployment, activation, push, merge, or remote mutation is implied.

Coherence, fit, and quality each have one separately consumed structural cycle. Their exact plans may be disclosed and approved together, but every allowance, first-call consumption, incomplete state, evidence set, and terminal marker remains independent. No live plan or provider call exists under this offline story authority.

## Auto Run Result

Status: blocked

Blocking condition: dirty working tree before implementation. The required `bmad-build-auto` version-control gate found the approved but uncommitted Story 1.18.1 evidence/recovery changes, Story 1.18.2 architecture/spec/review artifacts, governor sanctum files, worktree metadata, and retained qualification evidence on `develop`. No implementation began. Establish a reviewed durable baseline with explicit path staging/commits, then rerun Story 1.18.2 from the clean baseline; do not reset, delete, or broadly stage the current work.
