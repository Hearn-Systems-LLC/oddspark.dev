---
title: Sprint Change Proposal — Architecture, UX, and Production-Proof Reconciliation
project: oddspark
date: 2026-08-17
status: approved
approvedOn: 2026-08-17
approvalScope: planning-artifact-reconciliation-and-sprint-status-only
reconciliationStatus: reconciled-post-approval-decisions
postApprovalDecisions:
  - 1A-direct-domain-html-at-api-spark
  - 2A-parallel-prerequisites-converge-at-3-4
mode: incremental
trigger: implementation-readiness-report-2026-08-17-1057.md
changeScope: major-planning-correction
productScopeChange: none
approvedEditProposals:
  - architecture-authority-and-response-contract
  - solution-design-companion
  - ad12-precision-amendment
  - epic-3-production-proof-reslice
  - governed-legacy-retirement
  - deployment-activation-split
  - governing-ux-reconciliation
  - ux-backing-spine-reconciliation
  - local-proof-owner-review-chain
  - complete-epic-document-reconciliation
  - sprint-status-crosswalk
  - architecture-trace-completion
  - transport-story-acceptance-criteria
  - quiet-production-operational-checkpoint
---

# Sprint Change Proposal — Architecture, UX, and Production-Proof Reconciliation

## 1. Issue Summary

The 2026-08-17 implementation-readiness assessment found complete functional coverage but material contradictions between the architecture, governing UX record, epic dependency graph, and destructive-retirement plan. The conflicts were discovered during planning validation, before the affected implementation stories began.

### Trigger

This correction was triggered by `implementation-readiness-report-2026-08-17-1057.md`, not by an implementation failure. Story 1.3 is already in progress but is outside the affected seams and remains unchanged.

### Core problem

The planning set describes one product but grants incompatible authority and sequencing:

1. AD-6 preserves the router and shell and forbids unlisted edits, while the governing UX record specifies D1, D1a, D2, D2a, and D3–D24 shell and transport changes without an architecture carve-out.
2. Architecture declares JSON `400`/`502` outcomes, while UX requires content-negotiated shell HTML for native form requests.
3. Story 3.5 requires Story 3.2 PASS but says Story 2.10 is not required, even though Story 3.2 requires Story 2.10. The intended first local owner-review cycle is therefore transitively blocked by domain activation.
4. Story 1.24 combines deployment and activation authority.
5. Epic 5 is framed as technical cleanup, and Story 5.1 has no closed deletion oracle.
6. The quiet-production sample is tracked like implementation work even though completion depends on organic traffic.

### Evidence

- `ARCHITECTURE-SPINE.md § AD-6` limits shell/router edits to named architecture carve-outs.
- `ux-decision-record-oddspark.md § Deltas from the as-built shell` specifies the closed shell/transport delta table.
- `ARCHITECTURE-SPINE.md § Failure precedence` specifies JSON error representations.
- `UX-DR3` and `UX-DR4` specify native form HTML and shell-rendered terminal states.
- `epics.md` makes old Story 3.2 depend on Story 2.10 and old Story 3.5 depend on Story 3.2 while denying the transitive prerequisite.
- `owner-review-runbook.md` repeats the intended non-domain-blocking posture without naming a truthful local proof gate.
- `implementation-readiness-report-2026-08-17-1057.md` records the complete trace and quality findings.

## 2. Impact Analysis

### Epic impact

- **Epic 1:** Preserve product scope; split inactive writer deployment from local-only activation. Stories 1.15 and 1.16 gain explicit transport acceptance criteria.
- **Epic 2:** Product scope is unchanged. Story 2.9 and the local-only phase consume Story 1.25 as the activation boundary.
- **Epic 3:** Reslice combined production proof into local and domain runs. Move first owner review after local proof. Quiet-production and claim gates follow domain proof.
- **Epic 4:** Product scope is unchanged. Story 4.4 consumes Story 1.25 as the active local-production prerequisite.
- **Epic 5:** Reframe around a governed operator capability. Replace inferred cleanup scope with a closed, hash-bound retirement oracle.

No new product epic is required. No planned capability is removed or deferred.

### Artifact impact

| Artifact | Required change |
| --- | --- |
| PRD | No normative FR/NFR/MVP change |
| PRD addendum | Correct owner-review story and prerequisite |
| Architecture spine | Revise AD-6; add AD-12; update failure precedence, structural map, capability map, deferred decisions, and verification |
| Solution design | Explain the authorized UX seam, negotiated representations, and revised release dependency graph |
| Governing UX record | Correct authority, negotiation precedence, focus behavior, traces, sources, and resolved-decision status |
| UX backing spines | Mirror governing authority and current story IDs; retain non-governing status |
| Epics | Apply the 47-story dependency graph and all approved acceptance criteria |
| Owner-review runbook | Bind to Story 3.2 LOCAL PASS; version and hash-bind cycle records |
| Sprint status | Apply approved backlog crosswalk only; preserve live statuses |

Timestamped readiness reports and prior sprint-change proposals remain immutable historical evidence.

### Technical impact

No application code, deployment, remote resource, provider activity, or migration is authorized by this proposal. Later implementation will affect the existing Worker router/page seam, renderer behavior, response headers, server-rendered local permalink path, error representations, and aggregate metric increment points. The product still has one button, one optional domain field, one strike pipeline, and no new persistence authority.

## 3. Recommended Approach

### Selected path: Direct Adjustment

Correct the existing planning artifacts and backlog. Do not roll back implementation, add a product epic, or reduce MVP scope.

### Rationale

- All 11 PRD FRs already have story coverage.
- Affected implementation and release stories remain backlog.
- Story 1.3's in-progress judge-verifier work is unaffected.
- The correction makes existing intent implementable without adding product behavior.
- Explicit architecture ownership and closed destructive scope reduce long-term drift.

### Effort and risk

- **Planning effort:** Medium.
- **Implementation effect:** Reslicing and clearer tests; no added product feature.
- **Planning-change risk:** Low–medium because all renumbered/split stories are backlog.
- **If unchanged:** High risk of unauthorized shell work, divergent JS/no-JS behavior, false sequencing, and open-ended deletion.
- **Timeline effect:** A planning correction and readiness rerun precede implementation. Deployment, activation, domain proof, observation, claims, promotion, and retirement remain separately scheduled and authorized.

### Alternatives rejected

- **Rollback:** No relevant completed implementation caused the issue; rollback would destroy useful evidence.
- **MVP review:** Not justified. A future MVP review remains gated only by the separately governed judge-recovery outcome.

## 4. Detailed Change Proposals

### 4.1 Architecture spine

#### AD-6 — Preservation seam at the generation port

Replace the current rule with:

> The pipeline replaces only the internals of `generate` / `generatePersonalized` behind their existing call sites. Shell → pipeline dependency only; the pipeline never calls back into router, page, or render code. Router, KV key scheme, seed feeds, scan budgets, and the page shell remain preserved except for five closed architecture-authorized seams: AD-4 (`profile_hash` preimage), AD-7 (coordinator receipt/read/commit and id validation), AD-8 (atomic aggregate metrics), AD-10 (`POST /api/cheer`), and AD-12 (strike/result representations). AD-12 authorizes exactly the governing UX record's D1, D1a, D2, D2a, and D3–D24 rows—no more. It does not authorize new generation inputs, routes beyond `/api/cheer`, cache identities, persistence, client product state, analytics, provider activity, or cross-repository work. Any new, renumbered, or materially changed UX delta requires architecture reconciliation.

#### AD-12 — The strike transport has one outcome and two representations

Add:

> `POST /api/spark` invokes one validation, pipeline, authoritative commit, and outcome contract. Representation is selected only at the transport boundary.
>
> 1. Explicit `Accept: application/json` wins, even with a form-encoded body.
> 2. Otherwise, a request accepting HTML or carrying a browser-form content type receives shell HTML.
> 3. Remaining requests preserve existing JSON behavior.
>
> Responses emit the selected `Content-Type`; the existing `Vary` value retains `Origin` and adds `Accept` and `Content-Type`.

Successful delivery:

- JSON success: `200` with the committed artifact.
- HTML local request scope: `303 /s/:id`; the redirect counts nothing and the followed eligible GET server-renders and counts once.
- HTML domain request scope, including downgrade: direct `200` home-shell HTML from `POST /api/spark`; the browser remains at `/api/spark`, no redirect, permalink, or history mutation occurs, and one served-event increment occurs.
- Enhanced local JSON may use `history.replaceState`; it performs no request, generation, persistence, or metric increment.

Terminal delivery:

- Invalid input remains `400`; JSON returns stable `{error,field}`, HTML returns the UX-governed shell. No strike or served metric.
- COORD or required-infrastructure uncertainty remains `502`; representation is negotiated, no artifact renders, and no served metric increments.
- Unknown, expired, unsupported, or domain-scoped `/s/:id` returns the UX-governed `404` shell without generation or a served metric.

Caching and identity:

- Request scope, not rendered mode, owns redirect/permalink eligibility.
- Dynamic strike, redirect, JSON/HTML result, error, and permalink responses use `Cache-Control: no-store`.
- COORD remains authority; KV remains a projection; HTTP caches never become artifact authority.
- A domain-form refresh may re-submit, but every submission follows the same authoritative domain claim/read path.

#### Associated architecture edits

- Update failure-precedence rows to AD-12-selected representations.
- Update the structural router seed to include negotiation, server-rendered eligible local permalinks, `/api/cheer`, and domain-scope refusal.
- Add AD-12 to CAP-4 and add a progressive-enhancement capability row.
- Mark renderer layout resolved by UX-DR1 rather than deferred.
- Add deterministic fixtures for negotiation, headers, scope eligibility, renderer parity, metrics, permalink refusal, and non-counting terminal outcomes.

### 4.2 Solution design

Replace claims that the router/page remain byte-unchanged with a precise statement: the product shape and visual identity remain, while revised AD-6 authorizes only the closed UX deltas and AD-12 owns representation behavior.

Add a “one strike, two representations” explanation matching AD-12. Update the release dependency graph to:

1. Story 1.24 inactive writer deployment.
2. Story 1.25 atomic local-only activation.
3. After Story 1.25, two independent branches may complete in either order: Story 3.1 → 3.2 → 3.3 supplies the offline harness, local production proof, and first owner review; Stories 2.1–2.10 supply and activate the domain path.
4. Story 3.4 domain production proof waits for both Story 3.3 and Story 2.10; neither prerequisite depends on or grants authority to the other.
5. Story 3.5 quiet-production checkpoint.
6. Story 3.6 receipt-claim approval and activation.

### 4.3 Governing UX record

- Bind the as-built shell baseline to Oddspark commit `761c3dae989ca52a198f7b4f64a650f292fea3b9`, `src/worker.js::page()`.
- Add the current readiness report and this proposal to sources.
- State that UX specifies the closed delta rows while revised AD-6/AD-12 grant and bound authority.
- Mirror AD-12 negotiation precedence and request-scope branching.
- Distinguish enhanced-path focus moves from fresh full-document HTML responses, which set no scripted focus.
- Replace stale `NFR-6` with PRD UJ-1/UJ-2, FR-4 consequences, and architecture failure precedence.
- Replace brittle line-number citations with section names.
- Story 1.24 activation traces become Story 1.25.
- Story 3.4 receipt-claim traces become Story 3.6.
- Rename open questions to resolved owner decisions and record that none remains open.
- Preserve timestamped readiness reports rather than editing historical IDs.

### 4.4 UX backing spines

`DESIGN.md` and `EXPERIENCE.md` receive the same authority, source, negotiation, focus, and story-trace corrections. They remain backing guidance, not governors. Correct the `rule` token description to decorative dividers/hairlines only; input and chip boundaries use `border-strong`.

### 4.5 Epic 1 — deployment and activation split

#### Story 1.24 — Inactive Writer Deployment

Deploy the compatible writer with no active activation manifest. Model roles, new writes, claim copy, and reference handoff remain disabled. The architecture-approved committed/house safe posture remains; no legacy or unqualified generator runs. Deployment and rollback require explicit deployment authority and change no stored data or remote resource.

#### Story 1.25 — Atomic Local-Only Activation

After a separate activation approval, replace the whole manifest atomically with local enabled, domain disabled, and null domain/receiver/claim refs. Domain requests follow the governed local notice path under domain request scope. Activation rollback returns to Story 1.24's inactive safe posture. Code-deployment rollback is separate authority.

Downstream local-production and local-only-phase references move from 1.24 to 1.25. Epic 1 release range becomes 1.20–1.25.

### 4.6 Stories 1.15 and 1.16 — transport ownership

Add AD-12 and explicit acceptance criteria for:

- JSON/HTML/`asText` parity.
- Deterministic negotiation precedence.
- `Content-Type`, `Vary`, and `Cache-Control`.
- Local HTML `303` followed by server-rendered GET.
- Domain-scope direct `200` home-shell HTML from `/api/spark`, including downgrade; the browser remains at `/api/spark` and refresh may re-submit.
- `history.replaceState` with no side effect.
- Negotiated `400`/`502`, shared `404`, and non-counting outcomes.
- Enhanced focus moves versus no scripted focus on fresh documents.
- No provider, deployment, or remote-resource activity in transport fixtures.

### 4.7 Epic 3 — production proof reslice

| Prior | Revised | Change |
| --- | --- | --- |
| 3.1 | 3.1 | Offline mode-parameterized harness; no Story 2.10 prerequisite |
| 3.2 | 3.2 + 3.4 | Split local and domain live runs |
| 3.5 | 3.3 | First owner review after LOCAL PASS |
| 3.3 | 3.5 | Quiet-production checkpoint after DOMAIN PASS |
| 3.4 | 3.6 | Receipt claim after quiet-production PASS |

#### 3.1 — Production Receipt Verification Harness

Depends on Story 1.25. Builds the closed local/domain schema and offline fixtures without production activity.

#### 3.2 — Local Production Receipt Verification Run

Depends on Stories 1.25 and 3.1 plus exact live authority. Executes one cold local request followed by a synchronized burst of at least ten identical requests. Produces `LOCAL PASS` only when every applicable identity, isolation, expiry, ledger, denominator, and artifact-integrity predicate passes.

#### 3.3 — First Owner Review Cycle

Depends on Story 3.2 `LOCAL PASS`. Uses exactly 20 Briefs: local production first, then generated and house fixtures; eligible domain Briefs may supplement but are not required. It never waits for Story 2.10 or organic volume.

#### 3.4 — Domain Production Receipt Verification Run

Depends on Stories 2.10, 3.1, 3.2 `LOCAL PASS`, and 3.3 plus exact live authority. Stories 3.3 and 2.10 are independent prerequisites that may complete in either order and converge here; neither depends on or grants authority to the other. The run uses exactly ten synchronized domain requests, one winner and nine contenders, no preliminary request/retry/bypass/reset/distribution/replacement, and one six-call winning ledger. It produces `DOMAIN PASS` only when every applicable closed-harness predicate passes.

#### 3.5 — Quiet-Production House-Rate Gate — Operational Checkpoint

Depends on Story 3.4 `DOMAIN PASS` and separate observation approval. It is not implementation work and carries no delivery estimate. Slow organic accumulation remains legitimately in progress. Completion requires at least 100 eligible serves, complete interval coverage, cleared unexplained-5xx review, and the strict integer house-rate predicate.

#### 3.6 — Receipt Claim Approval and Activation

Depends on Story 3.4 `DOMAIN PASS` and Story 3.5 PASS plus separate exact-copy and activation approval.

### 4.8 Epic 5 — governed legacy retirement

#### Story 5.1 — Closed Legacy-Retirement Oracle

Produce `LegacyRetirementInventory v1`. Every target has an exact path, symbol/frozen range, pre-delete blob hash, unreachable-since activation ref, reachability command/output hash, and frozen characterization commands. No glob, directory, wildcard, related-helper wording, or inferred target is permitted.

Protected retains enumerate compatibility readers, migration/historical evidence, active routes, Durable Object exports/bindings, deployment config, rollback assets, and remote resources. Any reference uncertainty, drift, open rollback window, missing command, or failed characterization makes the result blocked and leaves code unchanged.

#### Story 5.2 — Destructive Legacy Seam Retirement

Depends on Story 5.1 PASS and separate destructive approval. Delete only exact matching inventory targets; revalidate all hashes and protected retains before editing; run frozen checks before and after; accept no expanded target or extra changed path; delete no remote resource.

### 4.9 Owner-review records

- PRD addendum and runbook point to Story 3.3 after Story 3.2 `LOCAL PASS`.
- Runbook becomes version 1 and governing.
- Every cycle record retains runbook version, exact runbook SHA-256, deployed identity, rubric identity, and review time.
- Weekly cadence begins after the first cycle; thresholds and historical records are never reinterpreted.

### 4.10 Epic and sprint crosswalk

The revised plan contains 47 stories. `sprint-status.yaml` changes only approved backlog keys:

- `1-24-local-writer-rollout-and-atomic-local-only-activation` → `1-24-inactive-writer-deployment` + `1-25-atomic-local-only-activation`.
- Epic 3 becomes six keys for Stories 3.1–3.6.
- `5-1-executable-dead-code-hygiene` → `5-1-closed-legacy-retirement-oracle`.

Preserve Story 1.1 done, Story 1.3 in progress, Epic 1 in progress, and every unaffected status. Append the new crosswalk comment; do not rewrite historical comments.

## 5. Implementation Handoff

### Scope classification

**Major planning correction.** Product scope is unchanged, but an architecture authority boundary and backlog graph change. PM/Architect involvement is required before Developer implementation.

### Handoff recipients

- **Solution Architect:** apply AD-6, AD-12, architecture maps/verification, and solution-design release narrative.
- **UX owner:** apply governing/backing trace corrections without changing approved behavior.
- **PM/Product Owner:** apply Epic 1, Epic 3, and Epic 5 reslices, crosswalks, and acceptance criteria.
- **Sprint owner:** update `sprint-status.yaml` only after final proposal approval and artifact edits.
- **Developer:** do not begin affected implementation until a new readiness assessment passes. Continue Story 1.3 only within its existing authority.

### Success criteria

1. AD-6 and AD-12 explicitly authorize and bound every UX delta row, including D1a and D2a.
2. Architecture, UX, and stories agree on negotiation precedence, request-scope eligibility, headers, caching, metrics, status codes, and focus behavior.
3. Local activation, local proof, and first owner review have a dependency path that does not include Story 2.10; Story 3.3 and Story 2.10 are independent prerequisites that converge only at Story 3.4.
4. Domain activation/proof, quiet observation, receipt claims, promotion, and retirement retain distinct gates and approvals.
5. Deployment and local activation are separate stories and authorities.
6. Legacy deletion scope is exact, hash-bound, non-inferred, and blocked on uncertainty.
7. The quiet-production checkpoint is explicitly non-estimated operational work.
8. Sprint status preserves every current completed/in-progress state.
9. Historical reports/proposals remain unchanged.
10. A fresh implementation-readiness run evaluates one internally consistent 47-story planning set.

### Explicit non-authority

Approval of this proposal authorizes planning-artifact reconciliation and the sprint-status crosswalk only. It does not authorize code implementation, commits, pushes, provider calls, deployment, remote-resource mutation, production observation, claim activation, promotion, Hearn changes, or destructive retirement.

## 6. Post-Approval Validation Record

The approved planning edits were applied on 2026-08-17. Independent cross-document validation then found two post-approval decisions, resolved by Justin on 2026-08-17:

1. **Decision 1A:** keep the direct domain-scope `200` response. Native HTML returns the home shell from `/api/spark`; the browser remains at `/api/spark`, refresh may re-submit, and no redirect, client state, permalink, or history mutation is added.
2. **Decision 2A:** Story 3.3 owner review and Story 2.10 domain activation are independent prerequisites that may complete in either order. Story 3.4 domain production proof waits for both; no forward dependency or additional reslice is introduced.

Both decisions are incorporated. Scope-preserving validation corrections also applied include the closed Story 5.1 deletion boundary, AD-12-selected failure wording, complete backing traces, stateless copy-link enhancement, qualified layout preservation, and an exact sprint-status crosswalk. A fresh readiness run remains required; this proposal itself claims no readiness PASS.
