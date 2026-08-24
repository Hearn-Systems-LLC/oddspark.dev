---
title: Sprint Change Proposal — Direct-Path Activation Authority
project: oddspark
date: 2026-08-24
status: approved
approved_by: Justin
approved_at: 2026-08-24
trigger: Epic 1 wrap-up reconciliation after Story 1.18.2 simplification (`b521dd5`)
scope: moderate
mode: batch
provider_execution_authorized: false
deployment_authorized: false
activation_authorized: false
---

# Sprint Change Proposal — Direct-Path Activation Authority

## 1. Issue Summary

The 2026-08-24 Simplification Override (proposal `-3`, commit `b521dd5`) rewrote Story 1.18.2 and the spine's Candidate path around deterministic checks plus one lightweight quality judge. It did not rewrite the activation chain that sits downstream of that judge. As of `develop@b521dd5`:

- **Story 1.19** acceptance criteria still require "three-specialist pipeline, combined semantic ... refs", "all three pre-call selections, slot reservations/transitions/releases", a "twelve-call ledger", and "specialist/composite-integrity" predicates — machinery Story 1.18.2 removed from active architecture and code.
- **Story 1.20** and **Story 1.26** require a combined `SEMANTIC` ref in the `ProductionActivationManifest`.
- **ARCHITECTURE-SPINE** AD-11 (`ProductionActivationManifest.semantic_ref` non-null; `ActivationRecord` kinds `specialist_*`, `pipeline_semantic`, `deadline`), the "Production judge pipeline" row, CAP-3, the Verification row, and the AD-9 ledger/deadline rule all still bind to specialist and combined-semantic authority.
- **PRD** line 78 requires "the predeclared semantic threshold owned by Story 1.18" before production use.
- **`src/pipeline/activation.mjs`** rejects any manifest whose `semantic_ref` is not a SHA-256.

No `SEMANTIC` ref exists: three separately approved semantic runs terminated `NO-GO` (`semantic-e2680787…` 11/24 + 11/24; `semantic-8baaad6c…` 11/24 + 8/24). Story 1.18.2 forbids fabricating semantic authority and authorizes no new live qualification. Therefore Epic 1's local-only activation is unreachable as specified, independent of any further engineering.

Existing, current authority that the direct path can bind:

| Authority | Ref | Source |
|---|---|---|
| Generation structural (primary-only, 20/20) | STRUCT-GENERATION `34731e26…`, role `5cf5a547…` | Story 1.11 run l9 |
| Judge structural (both legs 20/20) | role `f13c31e0…` | Story 1.18.1 Decision protocol v2 structural matrix |
| House catalog | existing `house_catalog_ref` | Story 1.8 |

Open verification obligation (agent-doable, not a decision): whether the restored single-judge runtime identity (prompt template, wire schema, adapter, timeout policy) still matches the frozen identity behind `f13c31e0…`. If not, the judge structural ref is stale and one structural re-run is required before Story 1.19 — under fresh exact-plan approval.

## 2. Impact Analysis

**Epic impact.** Epic 1 remains viable and is the only epic touched. Epic 2's domain activation (Story 2.10) and Epic 3's receipt claim inherit the same manifest shape; they need no story text change now beyond the shared `semantic_ref` removal, which is applied once at AD-11.

**Story impact.** Rewrite Story 1.19; amend Stories 1.20 and 1.26 ref lists. Stories 1.18/1.18.1 remain retained `NO-GO` history. Story 1.22 is unaffected (owner-only manual accessibility checks remain awaiting-operator).

**Artifact conflicts.** Epics (1.19, 1.20, 1.26); ARCHITECTURE-SPINE (AD-9 ledger/deadline, AD-11 composite/atomic activation, Production judge pipeline row, CAP-3, Verification row, Specialist prompts note); PRD line 78. UX: none.

**Technical impact.** `src/pipeline/activation.mjs` and its tests: remove `semantic_ref`; bump `PRODUCTION_ACTIVATION_VERSION` to 2 and the hash domain to `oddspark-production-activation/v2` so no v1 manifest bytes can validate. Assembly identity changes; Story 1.23 assembly verification re-runs offline. No provider call, deployment, or activation.

## 3. Recommended Approach

**Direct adjustment** (Justin's decision, 2026-08-24): under the direct single-judge design, no semantic qualification ref is required for activation. Activation binds exactly four proof kinds — generation structural ref, judge structural ref, house catalog ref, and local full-request ref — plus the separately governed nullable receiver/receipt-claim refs. Story 1.19 rescopes to direct-path live evidence.

Rationale: three approved runs showed zero-mismatch calibration of this judge class is not achievable; the deterministic Gate, fail-closed judge handling, bounded attempts, and the reviewed house fallback already bound the downside; the owner's standard is "useful and reasonably conservative, not proven perfect." Risk: weaker Sparks can reach users than a semantically qualified judge would allow; mitigation is Epic 3's owner review cycle (Story 3.3) and the quiet-production checkpoint (3.5), which remain unchanged. Effort: one offline development/review cycle for code and artifact edits, then Story 1.19's approved live run.

## 4. Detailed Change Proposals

### Stories

**Story 1.19 — full replacement**

OLD title/ACs: "Local Full-Request Qualification" bound to three-specialist pipeline, three pre-call selections, slot reservations, twelve-call ledger, specialist/composite-integrity predicates, and `FULL-WATERFALL`.

NEW:

```
### Story 1.19: Local Full-Request Qualification

As an operator,
I want end-to-end local latency, cost, attempt, and commit evidence for the direct pipeline,
So that the qualified pieces are proven together through authoritative commit.

**Requirements:** FR1; FR3–FR7; FR11; NFR2; NFR4; NFR5

**Dependency:** Stories 1.11–1.17, 1.18.2, 1.23; current generation and judge structural refs; exact live authority is additionally required.

**Acceptance Criteria:**

**Given** current generation and judge structural refs, the house catalog ref, and an owner-approved finite route ceiling
**When** a frozen live plan is approved and run
**Then** the full local request exercises Evidence through render on the direct path (one generation call, deterministic checks, at most one judge call per attempt, bounded attempts, house fallback on exhaustion)
**And** per-stage latency/timeouts, attempt count, judge-call count, candidate binding, commit reserve, route ceiling, receipt identity, usage, cost, and hashes are retained
**And** no retry outside the bounded orchestrator, replacement, CI call, or deployment occurs.

**Given** verified results
**When** LOCAL-FULL-REQUEST is derived
**Then** every frozen correctness, attempt/judge-call accounting, deadline/commit-reserve, cost, provenance, and authoritative-commit predicate passes
**And** failure preserves evidence and blocks activation.
```

Rationale: binds 1.19 to the architecture that exists; retains the owner-approved route ceiling and immutable evidence discipline.

**Story 1.20 — AC 1**

OLD: "**Given** qualification, full-request, catalog, receiver, and claim refs ... **Then** shared generation/judge/semantic refs appear once"
NEW: "**Given** generation structural, judge structural, full-request, catalog, receiver, and claim refs ... **Then** shared generation and judge refs appear once"

Also OLD dependency "Stories 1.14, 1.17–1.19, and Story 1.18.2" → NEW "Stories 1.14, 1.17, 1.18.2, and 1.19".

**Story 1.25 — AC 1** (added after independent review): same ref-list substitution as Story 1.26 AC 1.

**Epic 1 overview / FR4 coverage** (added after independent review): lines 67, 68, 93 reworded to the direct path and three verification tiers.

**Deferred to the Epic 2 course correction:** Stories 2.7, 2.10, and 3.4 still reference the four-slot/twelve-call ledger and domain `FULL-WATERFALL`; the spine override governs meanwhile.

**Story 1.26 — AC 1 and AC 2**

OLD: "current judge-pipeline, STRUCT-GENERATION, combined SEMANTIC, local FULL-WATERFALL, and house-catalog refs"
NEW: "current STRUCT-GENERATION, judge structural, local LOCAL-FULL-REQUEST, and house-catalog refs"

OLD: "shared generation, judge, and semantic refs appear exactly once"
NEW: "shared generation and judge refs appear exactly once"

### PRD

Line 78 — append override: "*(2026-08-24 override: under the direct single-judge design no semantic qualification threshold gates production; Stories 1.18/1.18.1 remain retained NO-GO history. Owner review (Story 3.3) and the quiet-production checkpoint (3.5) are the post-activation quality controls.)*"

### Architecture (ARCHITECTURE-SPINE.md)

1. **Simplification Override section** — add a paragraph: "Activation authority under this override: `ProductionActivationManifest` v2 binds `generation_ref` (structural), `judge_ref` (structural role ref of the single quality judge), `house_catalog_ref`, and per-mode full-request refs. No semantic ref exists or is required. `ActivationRecord.kind` is exactly one of `activation_manifest|source_identity|runtime_identity|generation_role|judge_role|qualification_report|full_request|evidence_role|house_catalog|receiver|receipt_claim`. The `DeadlineAuthorityManifest`, twelve-token ledger, and specialist kinds are superseded; the orchestrator's existing bounded attempts, route ceiling, and commit reserve remain."
2. **AD-9 ledger/deadline** and **AD-11 composite/expectation/atomic-activation** passages — mark as superseded historical context by the override (no text deletion, consistent with the `-3` proposal's convention).
3. **Production judge pipeline row** — OLD "Disabled until all three specialist structural roles, combined semantic authority, and full-waterfall evidence are current" → NEW "Disabled until the judge structural role and local full-request evidence are current".
4. **CAP-3** — OLD "independently qualified coherence/fit/quality specialists + deterministic aggregator" → NEW "one structurally qualified lightweight quality judge".
5. **Verification row** — OLD four tiers → NEW three: deterministic fixtures; independently approved structural qualification for generation and judge; Story 1.19 direct-path full-request evidence.
6. **Specialist prompts note** — record that Story 1.18.2 owns only the single-judge contract.

### Code

`src/pipeline/activation.mjs`: remove `semantic_ref` from the closed key set and the SHA check; `PRODUCTION_ACTIVATION_VERSION = 2`; hash domain `oddspark-production-activation/v2`. Update the activation tests and any fixture manifests; re-run assembly verification and record the new runtime assembly identity in the Story 1.23 spec's evidence.

## 5. Implementation Handoff

**Scope: moderate.** Artifact edits are Developer work under this proposal; code and test edits go to an external development session with an independent review session per `HARNESS.md`.

Success criteria: epics/spine/PRD contain no active requirement for a semantic ref or specialist machinery; `validateProductionActivationManifest` rejects any manifest carrying `semantic_ref` or `version: 1`; `npm test`, `npm run check`, governed CI, assembly verification, and `git diff --check` pass; Story 1.19 spec drafted from the new text with no live authority. Then Story 1.19's exact plan (calls, cost ceiling, retained fields) is presented for separate approval.

## Approval

Approved by Justin on 2026-08-24 in conversation: drop the semantic-ref requirement under the direct single-judge design, rescope Story 1.19 to direct-path evidence, amend Stories 1.20/1.26, PRD, spine, and `activation.mjs` v2.
