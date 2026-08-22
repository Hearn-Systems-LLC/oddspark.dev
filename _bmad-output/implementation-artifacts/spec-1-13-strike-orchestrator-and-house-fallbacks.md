---
title: 'Story 1.13: Strike Orchestrator and House Fallbacks'
type: 'feature'
created: '2026-08-18'
status: 'awaiting-operator'
baseline_revision: 'f2bed959ebba7714c4bd8f8abc45a0659b9eba46'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred: []
operator_actions:
  - 'Approve the exact current house Brief catalog as owner and preserve its computed catalog and approval identities.'
  - 'Approve the exact current voice-v1 semantic corpus as owner and preserve its computed hashes and semantic identity.'
  - 'Run and independently verify the live generation and judge qualification plans, retaining GO evidence for every production role identity.'
  - 'Resolve the verified primary generation identity (Story 1.11 run l9 sole-member role set) and the active STRUCT-JUDGE identity for the later activation manifest; the generation fallback leg stays unwired per Justin's 2026-08-22 topology decision — generation exhaustion or failure serves the approved house Brief.'
---

<intent-contract>

## Intent

**Problem:** Generation, local evidence, Composite Gate, and house-catalog stages exist, but no single owner enforces complete generation-to-judge pairs, the six-call ledger, role transitions, deadline pressure, or safe house fallback.

**Approach:** Add a pure injected strike orchestrator that snapshots one frozen Evidence input, reserves and accounts for complete generation/judge pairs, tries primary before fallback, never re-judges a Candidate, and returns either a passing Candidate path or an approved deterministic house Brief for a later coordinator commit.

## Boundaries & Constraints

**Always:** Freeze E before attempt planning; cap Candidates at `min(3, floor((6-E)/2))`; reserve only complete two-call pairs; count every invoked generation or judge call; release an unused judge reservation only after local rejection; switch roles only between attempts; use one route deadline; validate exact house approval before deterministic selection; return a closed frozen result and auditable safe ledger.

**Block If:** Implementation would invent production role activation, coordinator claim/commit semantics owned by Story 1.14, or treat pending catalog/rubric/model approval as live authority.

**Never:** Retry inside a stage, re-judge a Candidate, pool role identities, start a pair without capacity/time, expose provider-authored output or errors, perform network I/O directly, commit/render/serve, deploy, or modify/revert `sprint-status.yaml` or production Worker/config/runtime files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Primary pass | Frozen E, six-call capacity, qualified primary pair | One generation and one judge call; passing Candidate path returned | No error expected |
| Local reject | Generation returns Candidate; Gate rejects before judge | Generation consumes one slot; unused judge reservation releases; next complete pair may start | Record rejection without judging Candidate |
| Provider/semantic reject | Generation or judge is invoked and fails/rejects | Invoked slot remains consumed; next attempt uses remaining capacity | Safe typed ledger event; no raw error text |
| Role transition | Primary cannot yield an accepted Candidate | Fallback is selected only for a later complete pair | Never mutate the current attempt's role |
| Capacity/deadline exhaustion | Fewer than two reservable calls or insufficient remaining time | Select an exact approved house Brief | Unapproved/invalid house authority fails closed |
| Coordinator uncertainty | Injected coordinator cannot prove read/claim/commit outcome | Return typed `coordinator_uncertain` with no Brief | Never reinterpret uncertainty as fallback success |

</intent-contract>

## Code Map

- `scripts/generation.mjs:15-237` -- reuse `generateCandidate`; its typed failures report whether the single provider call was invoked.
- `scripts/composite-gate.mjs:17-253` -- reuse `runCompositeGate`; `judge_calls` distinguishes local rejection from invoked semantic evaluation.
- `scripts/house-briefs.mjs:152-189` -- reuse catalog construction, deterministic `selectHouseBrief`, and exact `verifyApproval`; pending content is never production-ready.
- `scripts/brief-contracts.mjs` -- reuse recursive freezing and closed Candidate/Evidence contracts.
- `scripts/strike-orchestrator.mjs` -- new sole retry/deadline/role/ledger owner with injected stages and coordinator boundary.
- `scripts/strike-orchestrator.test.mjs` -- new offline integration matrix with fake providers/coordinator/clock and zero network capability.
- `package.json` -- expose the focused test and compose it exactly once into `check`.
- `src/worker.js`, root `worker.js`, `wrangler*.toml`, `worker-configuration.d.ts`, qualification artifacts, and `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only.

## Tasks & Acceptance

**Execution:**
- `scripts/strike-orchestrator.mjs` -- implement hostile-input-safe snapshots, frozen E, candidate ceiling, pair reservation/release/accounting, primary-to-fallback attempt scheduling, deadline admission, approved house selection, safe ledger events, and an injected coordinator call that fails closed on uncertainty.
- `scripts/strike-orchestrator.test.mjs` -- cover all matrix rows, E values, every ledger transition, deadlines before/between calls, generation/local/judge rejection families, role changes, same-Candidate protection, house approval/selection failure, coordinator outcomes, mutations, and proof that the module owns no network capability.
- `package.json` -- add `strike-orchestrator:test` and include it once in the offline `check` chain.

**Acceptance Criteria:**
- Given frozen E, when a strike starts, then only complete generation-judge pairs reserve, the Candidate ceiling is `min(3, floor((6-E)/2))`, invoked calls consume their slots, and an unused judge reservation releases only after local rejection.
- Given primary errors, invalid output, deadline pressure, or exhaustion, when another attempt is considered, then fallback selection occurs only for a subsequent complete pair, the same Candidate is never judged twice, and insufficient capacity selects an exact approved house Brief.
- Given fake generation, Gate, house, clock, and coordinator dependencies, when offline integration runs, then every ledger transition, E value, timeout, role transition, rejection, fallback, and coordinator uncertainty is covered with no network activity.
- Given repository verification, when `npm run strike-orchestrator:test`, `npm run check`, and `git diff --check` run, then all offline gates pass and no production/runtime/orchestrator-owned file changed.

## Spec Change Log

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 18: (high 7, medium 9, low 2)
- defer: 0
- reject: 5: (high 0, medium 2, low 3)
- addressed_findings:
  - `[high]` `[patch]` Required the exact passing Composite Gate tuple and validated complete AttemptContext linkage before accepting a Candidate.
  - `[high]` `[patch]` Derived authoritative Candidate identities, rejected claimed-reference drift, and prevented repeat judging across attempts.
  - `[high]` `[patch]` Corrected zero-call, invoked-call, malformed-generation, and thrown-judge accounting so the six-call ledger remains auditable.
  - `[high]` `[patch]` Contained hostile Gate issues, clocks, and coordinator values and returned only a closed sanitized coordinator confirmation.
  - `[high]` `[patch]` Enforced the route deadline before pair admission, before judging, and before coordinator invocation with explicit failure events.
  - `[medium]` `[patch]` Added initial Evidence-call provenance and canonical Candidate references to ledger transitions.
  - `[medium]` `[patch]` Expanded offline integration coverage from 7 to 15 tests across admission, duplicate, linkage, mutation, authority, deadline, provider, Gate, and coordinator branches.

## Design Notes

- The orchestrator returns a commit-ready accepted source to an injected coordinator boundary; Story 1.14 owns authoritative persistence details. A coordinator result is accepted only when it explicitly proves `committed` or `resolved`; all ambiguous throws, shapes, or statuses are uncertainty.
- Each attempt begins with a two-slot reservation. Generation invocation consumes its slot. Gate `judge_calls: 1` consumes the judge slot; `judge_calls: 0` may release it only for `local_rejected`. Other zero-call Gate failures end the role path without laundering capacity into a retry.

## Verification

**Commands:**
- `npm run strike-orchestrator:test` -- expected: complete deterministic orchestration matrix passes without network access.
- `npm run check` -- expected: full offline repository gate passes with the new suite exactly once.
- `git diff --check` -- expected: no whitespace errors and no production/runtime/orchestrator-owned changes.

## Auto Run Result

- **Summary of implemented change:** Added a pure fail-closed strike orchestrator that freezes Evidence, enforces the six-call complete-pair ledger and route deadline, transitions from primary to fallback only between attempts, prevents Candidate re-judging, selects only an exactly approved deterministic house Brief, and accepts only a closed coordinator confirmation.
- **Files changed:**
  - `scripts/strike-orchestrator.mjs`: sole retry, role, deadline, Candidate-identity, ledger, house-selection, and coordinator-boundary owner.
  - `scripts/strike-orchestrator.test.mjs`: 15-test offline integration and hostile-boundary matrix.
  - `package.json`: added `strike-orchestrator:test` and composed it once into `check`.
  - `_bmad-output/implementation-artifacts/spec-1-13-strike-orchestrator-and-house-fallbacks.md`: captured contract, review triage, verification, and operator handoff.
- **Review findings breakdown:** Applied 18 patches (high 7, medium 9, low 2), deferred 0 items, and rejected 5 findings as later-story integration concerns or workflow-state observations.
- **Follow-up review recommendation:** `true`; patched severity score is 29 (`3 × 9 medium + 2 low`) and high-severity patches were applied.
- **Verification performed:** `npm run strike-orchestrator:test` passed 15/15; `npm run check` passed the full offline gate, including 31/31 application tests, 57/57 baseline tests, 76/76 judge spike tests, 16/16 generation qualification tests, and every contract/content suite; `git diff --check` passed; direct diff inspection confirmed no production Worker/config/runtime or `sprint-status.yaml` change.
- **Residual risks:** Production use remains fail closed until the operator approvals and live qualification actions above are complete. Story 1.14 still owns authoritative coordinator read/claim/commit persistence, and no deployment or activation was performed.
