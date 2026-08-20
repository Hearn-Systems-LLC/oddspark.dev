---
title: Sprint Change Proposal — Production 502 Incident and Worker Runtime Assembly Recovery
project: oddspark
date: 2026-08-20
status: approved
approved_by: Justin
approved_at: 2026-08-20
trigger: Production 502 — deployed Worker requires committed_brief while the writer produces legacy Spark artifacts
scope: moderate
mode: incremental
historical_evidence_policy: preserve
provider_execution_authorized: false
deployment_authorized: false
---

# Sprint Change Proposal — Production 502 Incident and Worker Runtime Assembly Recovery

## 1. Issue Summary

### Trigger

On 2026-08-20 production returned **502 on every Strike** (`/api/spark`, and text-mode `/`).

### Problem

An out-of-band deployment of `main` shipped the Story 1.14/1.15 committed-brief reader requirement ahead of the approved release sequence (Story 1.23 assembly → 1.24 reader deployment → 1.25 inactive writer → 1.26 activation), while the live writer still produces legacy Spark artifacts.

Every serve path calls `requireCommittedArtifact` (src/worker.js:1514), which throws `committed brief unavailable` for any artifact whose compatibility classification is not `committed_brief`. The live writer (`buildSparkCandidate`, persisted at src/worker.js:1461) emits the legacy shape, which classifies as `legacy_local`/`legacy_personalized` — never `committed_brief`. The router catch maps the throw to 502 (src/worker.js:2752–2754).

### Evidence

- src/worker.js:1514–1522 — `requireCommittedArtifact` rejects all non-`committed_brief` kinds.
- src/worker.js:2627, 2702 — `/api/spark/:id` and `/s/:id` readers require `committed_brief`.
- src/worker.js:1460–1462 — the writer persists the legacy spark shape (no `artifact_version`).
- scripts/brief-receipts.mjs:98–112 — `classifyCompatibleArtifact` confirms the legacy shape classifies as `legacy_*`, not `committed_brief`.
- Git history: `1-14-authoritative-commit-and-compatibility-reader` (30cac80) and `1-15-committed-brief-rendering` (a496c46) are merged to `main`; Story 1.23 exists only as a backlog epic entry and no `src/pipeline/` exists.

### Classification

Process/sequence failure: an unplanned deployment violated the approved release ordering. Not a PRD, architecture, UX, or market change — the approved plan already contains the fix.

## 2. Impact Analysis

### Epic impact

Epic 1 remains viable with no new, removed, or renumbered stories. Story 1.23 (Worker Runtime Assembly, inserted by Sprint Change Proposal 2026-08-19) already owns exactly the recovery work. What changes is **priority**: Story 1.16 and Story 1.23 become the incident-recovery critical path, ahead of the review queue (1.7, 1.11) and awaiting-operator queue (1.12, 1.13). The release-tail order (1.23 → 1.24 → 1.25 → 1.26) is unchanged.

Epics 2–5 are unaffected.

### Story impact

- Story 1.16 and Story 1.23: promoted to incident-recovery critical path; statuses remain `backlog` until story files are created.
- Stories 1.7, 1.11 (review) and 1.12, 1.13 (awaiting-operator): unchanged in status; their queues are simply not the recovery lane.
- Stories 1.24–1.26: unchanged; they remain separately approved release events.
- Completed Stories 1.1–1.15: preserved. No rollback of repository work is proposed. (The interim mitigation below is a **deployment** rollback, not a code rollback.)

### Artifact conflicts

- **PRD**: no change.
- **Architecture**: no change. AD-13 and the approved release progression already prescribe the correct sequence; the incident is a violation of them, not a gap.
- **UX**: no change.
- **sprint-status.yaml**: add a dated 2026-08-20 reconciliation block recording the incident, the interim mitigation, and the 1.16/1.23 recovery priority.
- **epic-1-context.md**: add a cross-story-dependency note recording the same.
- **Historical artifacts**: prior proposals, readiness reports, run journals, and the blocked Story 1.16 artifact remain byte-preserved.

### Technical impact

None authorized by this proposal. The incident mechanism is documented for the record. The interim mitigation (redeploy of the pre-1.14 Worker artifact) requires **separate, explicit deployment approval** and is not authorized here. No provider call, activation, or remote-resource change is authorized.

## 3. Recommended Approach

### Selected path: Direct Adjustment

Promote the already-approved Story 1.16 + Story 1.23 sequence as the incident-recovery lane, with a separately approved interim deployment rollback to restore service.

### Rationale

- The approved plan already contains the complete fix; no replanning is needed.
- A deployment rollback to the pre-1.14 artifact restores production in minutes without touching validated Stories 1.1–1.15 code on `main`.
- Story 1.23's acceptance criteria (canonical `src/pipeline/` modules imported by both Worker and Node verification, offline cold-domain proof, no legacy fallback) close the exact mixed-version hole that caused the incident.
- Keeps implementation, deployment, and activation under separate authorities.

### Alternatives rejected

- **Fix forward without rollback**: leaves production hard-down for the full duration of two governed stories. Rejected as unnecessarily costly.
- **Hotfix the deployed reader to accept legacy artifacts**: would create an unqualified third artifact path and contradict the approved fail-closed reader contract. Rejected.
- **Repository rollback of 1.14/1.15**: discards validated, reviewed work that is correct under the approved sequence. Rejected.
- **MVP review**: not warranted; the incident is a sequencing violation, not a scope failure.

### Estimate and risk

- Change scope: Moderate.
- Planning effort: Low (tracking notes only).
- Interim mitigation: Low effort, low risk (redeploy of a known-good artifact), pending separate approval.
- Recovery implementation: Medium effort (Stories 1.16 and 1.23), medium risk concentrated in Worker/Node portability — already scoped by Sprint Change Proposal 2026-08-19.

## 4. Detailed Change Proposals

### 4.1 sprint-status.yaml (approved, incremental review)

Append after the 2026-08-19 reconciliation block:

```yaml
#
# 2026-08-20 PRODUCTION 502 INCIDENT RECONCILIATION
# (Sprint Change Proposal 2026-08-20, approved):
#   Production returned 502 on every Strike: an out-of-band deploy of main shipped the
#   Story 1.14/1.15 committed_brief reader requirement while the live writer still produces
#   legacy Spark artifacts, violating the approved release sequence (1.23 -> 1.24 -> 1.25 -> 1.26).
#   Interim mitigation: redeploy the pre-1.14 Worker artifact under separate deployment approval.
#   Recovery path: Story 1.16 and Story 1.23 are promoted to the incident-recovery critical
#   path and take precedence over review/operator queues (1.7, 1.11, 1.12, 1.13); their statuses
#   remain backlog until story files are created. No story is added, removed, or renumbered.
```

No status values change; `last_updated` remains 2026-08-20.

### 4.2 epic-1-context.md (approved, incremental review)

Append under **Cross-Story Dependencies**:

> 2026-08-20 incident: production deployed the Story 1.14/1.15 committed_brief reader requirement ahead of the approved sequence while the writer still produced legacy Spark artifacts, returning 502 on every Strike. Interim mitigation is a separately approved redeploy of the pre-1.14 Worker artifact. Recovery runs through Story 1.16 and Story 1.23, which are the incident-recovery critical path ahead of the review and operator queues; the release-tail order (1.23 assembly, 1.24 reader deployment, 1.25 inactive writer, 1.26 activation) is unchanged.

### 4.3 epics.md, PRD, architecture, UX (approved, incremental review)

No changes. Story 1.23's approved text, dependencies, and acceptance criteria already describe the recovery work; the incident is an execution-sequence violation, not a planning gap.

## 5. Implementation Handoff

### Classification

Moderate: backlog reprioritization plus an incident-driven operational action, then ordinary governed development.

### Responsibilities

#### Product Owner (Justin)

- Approve or revise this proposal.
- Separately and explicitly approve the interim redeploy of the pre-1.14 Worker artifact (the parent state of merge 30cac80, i.e. before Stories 1.14/1.15 landed on `main`). This proposal does not authorize it.
- Preserve separate authorization for any later deployment, activation, provider call, or remote-resource activity.

#### Operator (deployment)

- On separate approval only: redeploy the pre-1.14 Worker artifact; confirm Strike returns 200 with a legacy artifact served through the pre-1.14 reader path; record the redeploy as an operational incident action.

#### Developer agent

- Create and implement revised Story 1.16 in a fresh dispatch (per the 2026-08-19 proposal: fresh run, not a resume of run 20260819-035459-b4ae).
- Then create and implement Story 1.23 through the canonical runtime-neutral `src/pipeline/` modules, satisfying all six approved acceptance criteria groups including the offline cold-domain proof and runtime-assembly identity.
- No provider call, deployment, activation, or remote-resource action without separate authority.

#### Architect / planning owner

- Apply the two tracking edits (4.1, 4.2) after proposal approval.
- Verify the incident timeline is reflected in future readiness reports.

### Success criteria

1. Production Strike returns 200 via the interim redeploy, with no legacy-reader modification.
2. sprint-status.yaml and epic-1-context.md carry the 2026-08-20 reconciliation notes; no story is added, removed, renumbered, or has its status falsified.
3. Story 1.16 passes its complete transport and dispatch-contract suite without constructing a Brief.
4. Story 1.23 proves a cold domain-scoped local downgrade through the same modules imported by the Worker and Node verification, with no legacy or substitute writer reachable.
5. No deployment, activation, provider call, or remote-resource mutation occurs without its own explicit approval.
6. Stories 1.24–1.26 remain separately approved release events in the approved order.

## 6. Checklist Record

### Trigger and context

- [x] 1.1 Trigger identified: production 502 on every Strike, 2026-08-20.
- [x] 1.2 Classified: process/sequence failure (out-of-band deploy of `main` ahead of the approved release sequence).
- [x] 1.3 Evidence recorded from src/worker.js, scripts/brief-receipts.mjs, and git history.

### Epic impact

- [x] 2.1 Epic 1 viability confirmed.
- [x] 2.2 No epic-level scope change; priority promotion of 1.16/1.23 identified.
- [x] 2.3 Epics 2–5 reviewed; unaffected.
- [x] 2.4 No epic invalidated; no new epic needed.
- [x] 2.5 Release-tail order confirmed unchanged; recovery lane precedence recorded.

### Artifact impact

- [x] 3.1 PRD reviewed; no change.
- [x] 3.2 Architecture reviewed; no change (AD-13 already prescribes the fix).
- [x] 3.3 UX reviewed; no change.
- [x] 3.4 sprint-status.yaml and epic-1-context.md notes identified; historical evidence policy preserved.

### Path evaluation

- [x] 4.1 Direct Adjustment: viable, selected.
- [x] 4.2 Repository rollback: rejected; deployment rollback retained as separately approved interim mitigation.
- [x] 4.3 MVP review: not warranted.
- [x] 4.4 Direct Adjustment selected with the rationale above.

### Proposal and handoff

- [x] 5.1 Issue summary drafted.
- [x] 5.2 Epic and artifact impacts documented.
- [x] 5.3 Recommended path and alternatives documented.
- [x] 5.4 MVP unaffected; action sequence stated.
- [x] 5.5 Handoff responsibilities defined.
- [x] 6.1 Applicable checklist sections completed.
- [x] 6.2 Proposal consistency verified against code and ledger evidence.
- [x] 6.3 Justin explicitly approved the proposal on 2026-08-20.
- [x] 6.4 sprint-status.yaml reconciliation block applied; no status values changed.
- [x] 6.5 Moderate-scope handoff confirmed: PO approval recorded; interim redeploy awaits separate deployment approval; Developer proceeds to fresh Story 1.16 then Story 1.23.
