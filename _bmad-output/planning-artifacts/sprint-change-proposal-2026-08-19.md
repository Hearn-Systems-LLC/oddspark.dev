---
title: Sprint Change Proposal — Worker Runtime Assembly Boundary
project: oddspark
date: 2026-08-19
status: approved
approved_by: Justin
approved_at: 2026-08-19
trigger: Story 1.16 implementation verification failure
scope: moderate
mode: incremental
supersedes_for_future_execution:
  - Story 1.16 and release-tail numbering in current forward-looking planning artifacts
historical_evidence_policy: preserve
---

# Sprint Change Proposal — Worker Runtime Assembly Boundary

## 1. Issue Summary

### Trigger

Story 1.16, Request Hardening and Domain Downgrade Seam, was dispatched by bmad-loop run `20260819-035459-b4ae`. The run completed Story 1.15, merged it into `main`, and then paused on a critical Story 1.16 escalation.

### Problem

Story 1.16 requires an inactive-domain request to create a new domain-scoped, local-mode committed Brief before the production writer is deployed or activated. The current architecture provides no runtime-capable authoritative writer at that point: the pipeline is implemented as Node-importable modules under `scripts/*.mjs`, while the public request boundary is `src/worker.js` and the current release plan defers writer deployment and activation.

The story therefore requires behavior before its implementing runtime has been assembled. Reimplementing the Brief inside `src/worker.js` would create an unqualified second writer. Requiring a pre-existing receipt would make the first valid domain request return `502`, contradicting the cold-request acceptance criterion.

### Evidence

- The first implementation passed 32/32 tests and the full offline check, but independent review found that cold domain requests depended on prior local traffic and exposed additional claim, race, provenance, request-decoding, header, metric-ordering, and regression-coverage gaps.
- The repaired specification correctly required cold-start domain authority and preservation of the canonical pipeline.
- The re-derived implementation passed type checking and `git diff --check`, but failed 26/49 tests and still did not execute the required Evidence/strike path.
- All partial runtime and test changes were reverted. No failed implementation code remains on `main`.
- The protected sprint, Wrangler, and root-worker files were unchanged.
- `src/worker.js` does not import the existing pipeline modules.

### Classification

Technical limitation discovered during implementation, revealing an architecture and story-decomposition conflict. This is not a PRD, UX, or market change.

## 2. Impact Analysis

### Epic impact

Epic 1 remains achievable but needs one additional implementation story between transport hardening and deployment. Its release tail must distinguish four authorities:

1. Worker runtime assembly in repository code.
2. Compatibility-reader deployment.
3. Inactive-writer deployment.
4. Atomic local-only activation.

Epics 2–5 remain viable. Their product scope is unchanged; references to the activation boundary must move from Story 1.25 to Story 1.26.

No epic is added, removed, or reordered. Epic 1 gains one story and the project story count changes from 47 to 48.

### Story impact

- Story 1.16 is narrowed to request decoding, representation, security guards, dynamic response headers, terminal precedence, and a closed inactive-domain dispatch contract.
- New Story 1.23 owns canonical Worker runtime assembly and offline cold-domain proof.
- Current Stories 1.23–1.25 become Stories 1.24–1.26.
- Downstream dependencies in Stories 2.9, 3.1, 3.2, and 4.4 move to Story 1.26.
- Completed Stories 1.1–1.15 are preserved. No rollback is proposed.

### Artifact conflicts

#### PRD

No change. FR1–FR11, the MVP, user journeys, metrics, and non-goals remain achievable.

#### Architecture

The architecture says both that the pipeline lives inside the Worker and that its stages remain Node-importable, but it does not define a canonical module boundary that satisfies both. It also omits runtime assembly from the release sequence.

#### UX

No visitor-facing behavior changes. Current UX documents conflate Story 1.16's request responsibility with execution of the future assembled writer and refer to the old Story 1.25 activation boundary.

#### Tracking and context

`epic-1-context.md` and `sprint-status.yaml` do not contain the missing assembly story. Their release-tail numbering must be reconciled after approval.

#### Historical artifacts

Dated readiness reports, prior Sprint Change Proposals, run journals, and the blocked Story 1.16 artifact are historical evidence. They remain unchanged.

### Technical impact

Canonical production pipeline logic will move or be extracted into runtime-neutral ES modules under `src/pipeline/`. The Worker entrypoint and Node verification will import the same implementations. Files under `scripts/` may remain wrappers, tests, qualification drivers, or CLI adapters but may not implement a second production writer or duplicate closed contract behavior.

No code, deployment, provider call, production binding, activation, or remote-resource change is authorized by this proposal alone.

## 3. Recommended Approach

### Selected path: Direct Adjustment

Add the missing Worker Runtime Assembly story and revise Story 1.16 rather than rolling back completed work or reopening the MVP.

### Rationale

- Preserves validated contracts, local Evidence, generation, Gate, strike, receipt, and rendering work from Stories 1.7–1.15.
- Establishes one source of truth instead of creating a Worker-specific substitute writer.
- Keeps code implementation, deployment, and activation under separate authorities.
- Leaves product behavior and UX unchanged.
- Makes the cold inactive-domain acceptance criterion executable and testable before deployment.

### Alternatives rejected

#### Roll back completed work

Not viable. Rollback would discard validated components without solving the missing runtime boundary.

#### Reduce or redefine the MVP

Not currently necessary. Reconsider only if the dedicated assembly story proves that the closed pipeline cannot execute in the selected Worker runtime or within the established deadline/cost envelope.

### Estimate and risk

- Change scope: Moderate.
- Planning effort: Low to medium.
- Implementation effort: Medium.
- Technical risk: Medium, concentrated in Worker/Node portability and assembled boundary behavior.
- Schedule impact: One additional Epic 1 implementation story before deployment.

## 4. Detailed Change Proposals

### 4.1 Architecture source of truth

#### Current text

> The generator is a pipeline of typed stages, each a banner section in the single-file worker.

> The pipeline replaces only the internals of `generate` / `generatePersonalized` behind their existing call sites.

> Pipeline stages and the Brief schema stay Node-importable pure functions.

#### Proposed decision

Add:

> **AD-13 — One runtime-neutral pipeline source is assembled before deployment**
>
> Evidence, generation, local Gate, semantic-judge adaptation, strike orchestration, committed-receipt handling, and Brief projection have one canonical runtime-neutral ES-module implementation. Canonical production logic lives under `src/pipeline/`; `src/worker.js` imports and assembles those modules behind the existing request boundary, and Node verification imports those same modules. Files under `scripts/` may remain test, qualification, or CLI adapters, but may not contain a second production writer or independently reimplement a closed validator, hash, ledger transition, or projection.
>
> Runtime assembly is distinct from deployment and activation. Offline tests may assemble the Worker with injected fake providers, coordinator, clock, and storage ports. This creates no production binding or authority. Deployment requires its own approval, and model-backed writes remain unreachable until the single current `ProductionActivationManifest` authorizes them.
>
> A valid inactive-domain request is handled by the assembled canonical writer under domain request scope, with effective local mode and the fixed notice. No scanner or EvidenceProvider runs, no global `w:` key is populated, and no legacy or substitute writer is available.

Revise the layout convention to:

> `src/worker.js` remains the single public Worker entrypoint and route shell. Runtime-neutral pipeline modules live under `src/pipeline/` and are bundled through ordinary local ES-module imports. Banner boundaries remain explicit at the entrypoint assembly seam.

Revise release progression to place Story 1.23 assembly before Stories 1.24–1.26 deployment and activation.

### 4.2 Revised Story 1.16

#### New title

Request Hardening and Inactive-Domain Dispatch Contract

#### New intent

Harden request decoding, representation selection, response headers, and terminal precedence; derive a closed inactive-domain dispatch instruction that preserves domain request scope and selects effective local mode without performing scanning, generation, commit, deployment, or activation itself.

#### Dependencies

Stories 1.1, 1.14, and 1.15; UX-DR3–UX-DR5; AD-12 and AD-13.

#### Replacement acceptance criteria

Given a valid public domain while domain activation is absent, request derivation returns a closed dispatch value containing domain request scope, effective local mode, normalized domain claim identity, the fixed notice identity, and explicit prohibitions on scanning, EvidenceProvider use, and permalinks. Derivation performs no writer, coordinator, cache, metric, or remote operation.

The public route passes that dispatch exactly once to an injected inactive-domain writer port and renders only a returned validated committed outcome. Missing, throwing, malformed, or scope-mismatched results produce the negotiated `502`; the route never constructs, repairs, or substitutes a Brief.

Transport fixtures prove domain-scope HTML/JSON behavior with a fake writer without claiming the production pipeline is assembled. Story 1.23 owns cold canonical Evidence-through-commit execution.

All existing malformed-input, representation, CORS, meter, response-header, render-before-count, and terminal non-counting requirements remain.

### 4.3 New Story 1.23 — Worker Runtime Assembly

#### User story

As a developer, I want the canonical pipeline assembled behind the Worker request boundary, so that offline proof, deployment, and later activation all use the same writer implementation.

#### Requirements

FR1, FR3–FR8, FR10–FR11; NFR2, NFR4–NFR5; AD-1–AD-9, AD-11–AD-13.

#### Dependencies

Stories 1.7–1.16 and 1.20–1.21. Story 1.22 remains independently executable but precedes release deployment by story order.

#### Acceptance criteria

1. Canonical production implementations live under `src/pipeline/`; Worker and Node tests import the same modules. No script independently implements production writer or closed-contract behavior.
2. The Worker module graph contains no Node-only runtime API. Dependencies enter through explicit ports. Worker types and Wrangler dry-run pass without remote mutation.
3. With offline local-enabled/domain-disabled activation fixtures, a first domain request with no prior receipt executes local Evidence, strike, Gate, domain-scoped authoritative commit, and effective-local rendering with the fixed notice. It performs no scan/EvidenceProvider call, global `w:` write, or permalink creation.
4. Concurrent cold requests converge on one valid receipt. Incompatible winners reject, claims finalize safely, and resubmission reads authority rather than replacing it.
5. Without a valid production activation manifest, model roles and new writer execution remain disabled. Fake ports and fixtures create test authority only.
6. Full offline verification, Worker type generation, Wrangler dry-run, and whitespace checks pass. Existing scanner and personalization regression coverage remains intact.
7. A deterministic runtime-assembly identity binds the canonical module graph and source hashes for later gates without creating deployment or approval authority.

### 4.4 Release-tail renumbering

| Old | New |
| --- | --- |
| 1.23 Compatibility Reader Deployment | 1.24 Compatibility Reader Deployment |
| 1.24 Inactive Writer Deployment | 1.25 Inactive Writer Deployment |
| 1.25 Atomic Local-Only Activation | 1.26 Atomic Local-Only Activation |

Story 1.24 additionally depends on Story 1.23 and proves that the candidate assembly's compatibility-reader projection matches the runtime-assembly identity while the deployed reader artifact contains no new writer entrypoint.

Story 1.25 depends on Stories 1.20–1.24 and binds the candidate bundle to the assembly identity. Its deployment-only authority remains unchanged.

Story 1.26 depends on Story 1.25. During local-only activation, Story 1.16's dispatch invokes Story 1.23's canonical assembled writer under domain scope. Rollback returns to Story 1.25's inactive posture.

Update downstream dependencies and legacy-unreachability references from Story 1.25 to Story 1.26.

### 4.5 UX ownership and traces

Replace statements that assign the complete pre-activation domain path to Stories 1.16/1.25 with:

> Stories 1.15–1.16 own representation, rendering, request hardening, and the closed inactive-domain dispatch contract. Story 1.23 owns assembly and offline proof of the canonical cold writer path. Story 1.26 owns production local-only activation.

No UX behavior or copy changes.

### 4.6 Tracking and context

After final proposal approval, reconcile the affected sprint rows to:

```yaml
1-16-request-hardening-and-inactive-domain-dispatch-contract: backlog
1-23-worker-runtime-assembly: backlog
1-24-compatibility-reader-deployment: backlog
1-25-inactive-writer-deployment: backlog
1-26-atomic-local-only-activation: backlog
```

Preserve every unaffected status. Update sprint reconciliation notes and `epic-1-context.md` for 26 Epic 1 stories and 48 total stories.

Do not edit or resume the paused run state. Do not reuse the blocked Story 1.16 spec. After artifact reconciliation, validate the live loop policy and clean worktree, dry-run the revised story, and start a fresh loop run.

## 5. Implementation Handoff

### Classification

Moderate: backlog and architecture reconciliation followed by ordinary governed development.

### Responsibilities

#### Product Owner

- Approve or revise this proposal.
- Preserve separate authorization for deployment, activation, provider calls, and remote-resource activity.

#### Architect / planning owner

- Apply AD-13 and release-progression edits.
- Revise `epics.md`, UX trace ownership, and Epic 1 context.
- Reconcile sprint status only after approval.

#### Developer

- Implement revised Story 1.16 in a fresh dispatch.
- Implement Story 1.23 through the canonical runtime-neutral modules.
- Preserve unrelated worktree changes and protected files.
- Perform no provider, deployment, activation, or remote-resource action without separate authority.

#### Loop operator

- Leave run `20260819-035459-b4ae` as historical paused evidence.
- Validate configuration and clean-tree state after planning edits.
- Use a dry run, then start a fresh run rather than resuming the blocked story.

### Success criteria

1. Architecture names exactly one canonical pipeline implementation and distinguishes assembly, deployment, and activation.
2. Revised Story 1.16 passes its complete transport and dispatch-contract suite without constructing a Brief.
3. Story 1.23 proves a cold domain-scoped local downgrade through the same modules imported by the Worker and Node verification.
4. No scanner, EvidenceProvider, legacy writer, duplicate writer, global `w:` pollution, or domain permalink is reachable on that path.
5. No production binding, provider call, deployment, activation, or remote-resource mutation occurs during planning or offline implementation.
6. The compatibility reader, inactive writer, and local activation remain separately approved release events.

## 6. Checklist Record

### Trigger and context

- [x] 1.1 Triggering story identified.
- [x] 1.2 Core problem classified and stated.
- [x] 1.3 Supporting evidence recorded.

### Epic impact

- [x] 2.1 Epic 1 viability evaluated.
- [x] 2.2 Required Epic 1 change identified.
- [x] 2.3 Future epics reviewed.
- [x] 2.4 No epic invalidation or new epic required.
- [x] 2.5 Release-tail priority and order adjusted.

### Artifact impact

- [x] 3.1 PRD conflict reviewed; no change required.
- [x] 3.2 Architecture conflicts identified.
- [x] 3.3 UX impact limited to ownership and traces.
- [x] 3.4 Supporting artifacts and historical evidence policy identified.

### Path evaluation

- [x] 4.1 Direct Adjustment evaluated as viable.
- [x] 4.2 Rollback rejected.
- [x] 4.3 MVP review deferred unless assembly evidence fails.
- [x] 4.4 Direct Adjustment selected.

### Proposal and handoff

- [x] 5.1 Issue summary drafted.
- [x] 5.2 Epic and artifact impacts documented.
- [x] 5.3 Recommended path and alternatives documented.
- [x] 5.4 MVP impact and action sequence stated.
- [x] 5.5 Handoff responsibilities defined.
- [x] 6.1 Applicable checklist sections reviewed.
- [x] 6.2 Proposal consistency and accuracy verified.
- [x] 6.3 Justin explicitly approved the proposal on 2026-08-19.
- [x] 6.4 Current planning, UX trace, context, and sprint-ledger changes authorized for synchronization.
- [x] 6.5 Moderate-scope Architect/Product Owner/Developer handoff confirmed.
