---
title: 'Story 1.12: Composite Gate and Qualified Judge Integration'
type: 'feature'
created: '2026-08-18'
status: 'awaiting-operator'
baseline_revision: 'cec6d943ff2745da6c7587931e06f3e7b7fbcf15'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Domain Evidence and GroundingReport contracts accept declared non-HTTP, credential-bearing, or private-network source URLs.
    evidence: |-
      Composite Gate correctly reuses the Story 1.7 validators, but those pre-existing contracts require only a nonblank source URL that belongs to the declared Evidence URL set; URL safety is not enforced at that authority boundary.
    location: >-
      scripts/brief-contracts.mjs:227
    severity: medium
operator_actions:
  - 'Approve the exact voice-v1 semantic corpus as owner, preserving its computed hashes and semantic identity.'
  - 'Approve and run the Story 1.4 live judge recovery matrix, then retain independently verified GO qualification evidence for each passing judge identity.'
  - 'Resolve one verified per-model STRUCT-JUDGE qualification into the active judge descriptor supplied to Composite Gate before enabling real provider use.'
---

<intent-contract>

## Intent

**Problem:** Closed Candidate and Attempt contracts exist, but no single-pass stage guarantees that deterministic local failures stop before semantic judging or that a surviving Candidate is evaluated exactly once by an already-qualified, candidate-bound judge.

**Approach:** Add a pure Composite Gate that derives and validates the local GroundingReport, emits one immutable AttemptContext only on local success, then invokes one injected qualified JudgeProvider and accepts only the exact canonical candidate-bound verdict.

## Boundaries & Constraints

**Always:** Validate closed EvidenceContext/Candidate inputs, exact mode and Breadcrumb cardinality, grounding coverage/linkage, the tri-state personal-name policy, privacy and number provenance before judging; treat fail and unknown as rejection; require an injected already-resolved active STRUCT-JUDGE descriptor; pass Candidate, Evidence, GroundingReport, rubric, and candidate_ref exactly once; return recursively frozen typed outcomes with distinct local, qualification, provider, judge-contract, and semantic-rejection codes.

**Block If:** Implementation requires weakening Story 1.7 contracts, inventing how two Story 1.4 per-model refs become one production activation ref, treating pending rubric or structural qualification as live authority, or changing exact-source grounding into semantic inference.

**Never:** Repair, coerce, default, parse prose, synthesize candidate_ref, let the judge override local rejection, retry, select roles, choose fallback, manage call ledgers/deadlines, commit/render Candidates, scan qualification artifacts inside the stage, call a network or production binding, deploy, or modify/revert sprint-status.yaml or production Worker/config/runtime files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Local pass | Valid local EvidenceContext and Candidate; active injected judge; canonical pass verdict | Empty passing GroundingReport, one frozen AttemptContext, exactly one judge call, frozen pass result | No error expected |
| Domain pass | Every required claim is an exact canonical observation substring with allowed URL/name/number status | Complete passing GroundingReport and exactly one judge call | Missing, duplicate, unexpected, or unsupported coverage rejects locally |
| Local invalid | Schema/mode/Breadcrumb/grounding/privacy/name/number failure or unknown | No AttemptContext escapes and judge calls remain zero | Stable `local_rejected` result with safe structured issues |
| Judge unavailable | Missing, malformed, inactive, mismatched, or NO-GO descriptor | Locally valid attempt is not sent | Stable `judge_unqualified` with zero calls |
| Judge failure | Provider throws/rejects or returns malformed, wrapped, unbound, noncanonical, or ambiguous output | Exactly one call, no retry, no Candidate exposure | Stable provider or judge-contract rejection with `judge_calls: 1` |
| Semantic fail | Canonical bound verdict has `pass: false` | Candidate rejects and cannot be reinterpreted as pass | Stable `semantic_rejected` with safe check metadata |

</intent-contract>

## Code Map

- `scripts/brief-contracts.mjs:88-275` -- authoritative Candidate/Evidence/GroundingReport/Attempt validators, candidate/evidence refs, exact grounding coverage, personal-name policy, builders, and recursive freezing; reuse without duplicating schema policy.
- `spikes/judge-fidelity/contract.mjs:9-113,173-219,404-436` -- authoritative ordered nine gates and exact `JudgeResult`/verdict validation; reuse validation but not synthetic spike request builders.
- `spikes/judge-fidelity/qualification.mjs:383-450` -- Story 1.4 per-model manifest/ref boundary; evidence that Gate must receive a resolved active descriptor instead of selecting or aggregating refs.
- `semantic/voice/v1/rubric.json` and `scripts/semantic-corpus.mjs` -- validate the complete closed rubric payload and its authority fields; pending approval must reject before a judge call.
- `scripts/composite-gate.mjs` -- new pure local-gate and single-call semantic stage.
- `scripts/composite-gate.test.mjs` -- new deterministic local/domain, qualification, provider, canonical-verdict, mutation, and stage-ownership matrix.
- `package.json` -- expose the focused offline gate test and compose it exactly once into `check`.
- `src/worker.js`, root `worker.js`, `wrangler*.toml`, `worker-configuration.d.ts`, `runtime-baseline.json`, judge v1 results, and `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only.

## Tasks & Acceptance

**Execution:**
- `scripts/composite-gate.mjs` -- implement defensive input/dependency snapshots, deterministic GroundingReport derivation, fail-closed local validation, one immutable AttemptContext, closed approved-rubric and active-descriptor validation, one injected JudgeProvider call, exact result validation, call accounting, and frozen typed outcomes that project only safe decision metadata and never provider-authored reasons.
- `scripts/composite-gate.test.mjs` -- cover every matrix row plus cycles/accessors/prototypes/sparse arrays, input/provider mutation, stale refs, both modes, all local branches, pending/malformed rubric authority, sync/async provider failures, every malformed verdict family, redaction for passing and every rejecting check family, safe diagnostics, and proof of zero retry/fallback/network/commit behavior.
- `package.json` -- add `composite-gate:test` and include it once in the offline `check` command.

**Acceptance Criteria:**
- Given an EvidenceContext and Candidate, when local validation runs, then closed schema, mode/Breadcrumb cardinality, exact grounding, privacy/name policy, and number provenance are decided first; fail or unknown returns `local_rejected` with zero judge calls, while success produces exactly one recursively frozen AttemptContext.
- Given a locally valid AttemptContext, a completely valid owner-approved rubric, and an injected active STRUCT-JUDGE descriptor, when semantic evaluation runs, then exactly one JudgeProvider call receives only Candidate, Evidence, GroundingReport, rubric, candidate_ref, and the resolved judge identity; exact candidate-reference mismatch or any noncanonical result rejects with no repair, and every returned outcome excludes provider-authored reason text.
- Given deterministic local and semantic fixtures, when Composite Gate is exercised, then local, qualification, provider, judge-contract, and semantic failures remain distinguishable, the judge cannot override local rejection, and no retry, role-selection, fallback, ledger, commit, render, or network capability exists in the stage.
- Given repository verification, when `npm run composite-gate:test`, `npm run check`, and `git diff --check` run, then every offline gate passes without provider calls, production mutation, deployment, or sprint-state changes.

## Spec Change Log

### 2026-08-18 — Review loop 1
- Trigger: the first implementation returned the complete passing judge verdict, including provider-authored reason strings, despite the Epic-level no-raw-model-text boundary.
- Amendment: require the Composite Gate result to project only safe decision metadata, explicitly forbid provider-authored reasons in every returned outcome, and make complete approved-rubric validation and redaction coverage explicit in the implementation map and acceptance surface.
- Known-bad state avoided: a syntactically passing judge result can no longer carry arbitrary sensitive or oversized model prose through the Gate to downstream consumers.
- KEEP: preserve deterministic local/domain grounding, zero-call local rejection, one immutable AttemptContext, the injected resolved judge boundary, exact candidate binding and canonical verdict validation, distinct typed failures, one-call accounting, mutation isolation, and offline-only package composition.

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 1: (high 1, medium 0, low 0)
- patch: 3: (high 1, medium 0, low 2)
- defer: 0
- reject: 14: (high 0, medium 4, low 10)
- addressed_findings:
  - `[high]` `[bad_spec]` Project safe pass metadata instead of returning provider-authored judge reasons, and require redaction coverage for every terminal outcome.

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 2, medium 3, low 1)
- defer: 1: (high 0, medium 1, low 0)
- reject: 15: (high 0, medium 6, low 9)
- addressed_findings:
  - `[high]` `[patch]` Enforced exact equivalence between top-level semantic pass and all nine gates, tone, and claims so contradictory verdicts reject as noncanonical.
  - `[high]` `[patch]` Closed hostile input and dependency snapshots over every own property, prototype, accessor, array shape, reflection trap, and `__proto__` data key before provider invocation.
  - `[medium]` `[patch]` Contained candidate-reference and AttemptContext construction failures as frozen typed local rejections.
  - `[medium]` `[patch]` Added exact provider-request value assertions and complete domain grounding coverage/linkage with one-call accounting.
  - `[medium]` `[patch]` Added exported-boundary coverage for unknown names, rubric-version mismatch, hostile dependencies, async provider failure, and local number/Breadcrumb branches.
  - `[low]` `[patch]` Expanded safe semantic-decision coverage across gate, tone, claims, and simultaneous rejection families.

## Design Notes

- The descriptor is a narrow injected authorization fact for one already-resolved judge role; it does not define activation aggregation. Production use remains impossible until separately approved rubric and STRUCT-JUDGE GO evidence exist.
- Domain GroundingReport derivation follows Story 1.7's deliberately strict exact-substring rule. Local mode has zero scan-grounding entries, but all Candidate text still passes the deterministic personal-name and qualitative-number policies before AttemptContext construction.

## Verification

**Commands:**
- `npm run composite-gate:test` -- expected: deterministic composite-stage tests pass with no network activity.
- `npm run check` -- expected: the complete offline repository gate passes with the new suite included once.
- `git diff --check` -- expected: no whitespace errors and no read-only/orchestrator files changed.

## Auto Run Result

- **Summary of implemented change:** Added a pure fail-closed Composite Gate that validates local/domain Candidates and grounding before judging, builds one immutable AttemptContext, requires a complete owner-approved semantic corpus and injected active STRUCT-JUDGE descriptor, invokes one injected JudgeProvider, validates exact candidate-bound canonical verdicts, and returns only frozen typed outcomes with provider-authored reasons removed.
- **Files changed:**
  - `scripts/composite-gate.mjs`: Composite local/semantic gate with hostile-input containment, qualification checks, one-call accounting, canonical verdict enforcement, and safe decision projection.
  - `scripts/composite-gate.test.mjs`: Offline local/domain, qualification, mutation, hostile-value, provider, verdict, redaction, and call-accounting coverage.
  - `package.json`: Added `composite-gate:test` and composed it once into the offline `check` gate.
  - `_bmad-output/implementation-artifacts/spec-1-12-composite-gate-and-qualified-judge-integration.md`: Captured the implementation contract, review repair, triage evidence, verification, and operator handoff.
- **Review findings breakdown:** Latest pass applied 6 patches (high 2, medium 3, low 1), deferred 1 pre-existing Story 1.7 URL-contract issue, and rejected 15 findings as noise, trusted-injection boundary objections, or out-of-scope orchestration/activation concerns.
- **Follow-up review recommendation:** `true` because the latest pass patched high-severity boundary defects; weighted medium/low score was 10 and the high-severity trigger also applies.
- **Verification performed:** `npm run composite-gate:test` passed 8/8; `npm run check` passed the complete offline repository gate, including 31/31 application tests, 57/57 baseline tests, judge/generation qualification suites, contracts, corpus, config, type, and runtime checks; `git diff --check` passed; the reviewed path diff contains no production Worker/config/runtime, immutable judge result, or `sprint-status.yaml` change.
- **Residual risks:** Real provider use remains fail closed until the owner approves the exact semantic corpus and an operator completes Story 1.4 live qualification and supplies a verified active STRUCT-JUDGE descriptor. No live inference, deployment, activation, or remote mutation was performed.
