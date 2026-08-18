# Sprint Change Proposal — Readiness Remediation (Epic 5, Story 3.5, Claim-Gated Strike Note)

Date: 2026-08-17  
Project: Oddspark  
Trigger: Implementation Readiness Report 2026-08-17 10:29 (`implementation-readiness-report-2026-08-17-1029.md`) — **NOT READY**  
Status: Approved by Justin 2026-08-17 — planning edits applied in the same session  
Scope classification: **Moderate** (backlog reorganization + UX contract copy; no requirement or architecture-decision change)  
Review mode: Incremental  
Predecessor: `sprint-change-proposal-2026-08-17.md` (Deliverable Epic Boundaries and UX Contract — approved; unchanged except as this proposal retargets Story 5.3)

> **Story IDs.** Epic 1–4 IDs 1.1–1.24, 2.1–2.10, 3.1–3.4, and 4.1–4.4 stay. Epic 5 keeps 5.1–5.2. Story 5.3 is replaced by Story 3.5 plus `owner-review-runbook.md`. Historical IDs in the 2026-08-16 and 2026-08-17 proposals are preserved, not rewritten.

## 1. Issue Summary

The 10:29 readiness re-run found numbered FR coverage complete (11/11) and Epics 1–4 independently deliverable, but judged the plan **not ready to govern Phase 4** because four contract defects remained after the morning correction:

1. **EPIC-QUALITY-1 (critical).** Epic 5 mixes bounded post-proof retirement (Stories 5.1–5.2) with an ongoing owner-review process (Story 5.3) that starts after Story 1.24, is not blocked on 5.1–5.2, and never ends. Epic completion has no meaning.
2. **STORY-QUALITY-1 (major).** Story 5.3 is explicitly an “ongoing process.” Its ACs describe how each review works, not when the story is `done`. “Insufficient organic cases remain incomplete” makes a terminal state impossible.
3. **UX-ALIGN-1 (major).** UX-DR5.4.4 and the EXPERIENCE idle row require the strike note *verbatim*: “One idea, seeded by the sun and a randomness beacon. Same window, same spark.” The second sentence is a reproducibility promise. FR-11, AD-7, UX-DR4 (claiming receipt is Story 3.4), and the UX voice ban all forbid that promise until `receipt_claim_ref` is current. Story 1.15’s preservation checklist and Story 3.4’s claim gate can demand opposite output.
4. **STORY-QUALITY-2 (major).** Stories 1.15, 1.16, 1.22, 4.1, and 4.2 cite `ux-decision-record-oddspark.md`. Justin’s 2026-08-17 UX decision already made that file the compact contract and `DESIGN.md` / `EXPERIENCE.md` the backing spines. The 10:29 assessor excluded the record as a duplicate, so those story ACs were not validated.

Issue category: planning-contract inconsistency discovered during readiness assessment. No technical approach failed. No requirement is wrong. No production code, Story 1.1 (done), or Story 1.3 (in progress) is invalidated.

Evidence: `implementation-readiness-report-2026-08-17-1029.md`; `epics.md` Epic 5 / Story 5.3; UX-DR5.4.4; EXPERIENCE idle row and preservation #4; as-built strike note in `src/worker.js`. The 10:29 report stays immutable.

## 2. Impact Analysis

### 2.1 Epic impact

| Epic | Impact |
| --- | --- |
| Epic 1 | Unchanged outcome. Story 1.15 gains a non-claiming default AC for the strike note and formula panel. |
| Epic 2 | None. |
| Epic 3 | Gains **Story 3.5 First Owner Review Cycle**. Story 3.4 becomes the sole owner of claiming wording, including “Same window, same spark.” FR line gains SM-2 / SM-3 for the first cycle. |
| Epic 4 | Stories 4.1 / 4.2 keep UX-DR citations. No story text change. |
| Epic 5 | Narrowed to post-proof hygiene and destructive retirement. Title, outcome, and FR/SM map change. Stories 5.1–5.2 stay. Story 5.3 is removed. |
| Order | Unchanged (1 → 5). UX copy + authority must be fixed before Story 1.15. Story 3.5 depends on 1.24 and 3.2 PASS, not on 2.10 or organic volume. |

### 2.2 Story impact

| Story | Change |
| --- | --- |
| 1.15 | Append AC: default strike note omits “Same window, same spark.”; formula panel stays non-claiming; 1.15 introduces no claiming copy. |
| 3.4 | Manifest lists every visitor-visible string it authorizes; missing/stale/mismatched proof restores non-claiming copy on formula panel, `/how`, and strike note. |
| 3.5 | **New.** Finite first review cycle + durable runbook + 20-Brief record. |
| 5.3 | **Removed** from sprint accounting. Recurrence is the runbook. |
| 1.1, 1.3 | Untouched. |

### 2.3 Artifact conflicts

| Artifact | Action |
| --- | --- |
| PRD (`prd.md`) | None. FR-11 / §6.1 / §6.2 already withhold public claims. |
| PRD addendum | One line: first SM-2 / SM-3 cycle is Story 3.5; weekly review is the runbook. |
| Architecture ADs | None. AD-7 and the receipt-claim gate already require non-claiming copy. |
| Architecture operational envelope | Mention Story 3.5 after Story 3.2. |
| UX Decision Record | Governor language; UX-DR5.4.4; D24; conflicts 11 and 12. |
| EXPERIENCE.md | Idle row and preservation #4. |
| DESIGN.md | None (no strike-note string). |
| `epics.md` | Epic 5 retitle; FR map; crosswalk; execution rule; 1.15 / 3.4 / 3.5 / drop 5.3. |
| `sprint-status.yaml` | Add `3-5-first-owner-review-cycle`; drop `5-3-…`. |
| New: `owner-review-runbook.md` | Named oracle for recurring review. |
| Code / deploy / CI | None in this workflow. Live strike note stays until Story 1.15. |

### 2.4 Technical impact

None in this pass. No production code, tests, deployment configuration, live provider state, or remote resource changes. Story 1.15 will implement D24 later.

## 3. Recommended Approach

**Direct Adjustment.** Modify stories and UX copy inside the current plan. Add Story 3.5. Write a runbook. Do not add Epic 6. Do not roll back the morning correction. Do not reopen MVP scope.

| Option | Verdict | Why |
| --- | --- | --- |
| Direct Adjustment | **Selected** | Four contract defects; same product; Story 1.3 continues. Effort Low–Medium. Risk Low. |
| Rollback | Rejected | Reverting the 2026-08-17 reslice restores non-deliverable Epics 1–2 and the Epic 3 omnibus. |
| MVP review | Rejected | MVP is unchanged. FR-11 already withholds the claim. |

Justin decisions captured this session: trigger = full 10:29 report; Incremental review; Epic 5 = retirement only; first cycle = Story 3.5 after 1.24 + 3.2; record remains governor; second strike-note sentence is claim-gated, not deleted.

## 4. Detailed Change Proposals

Approved Incremental edits. Targets are under `_bmad-output/` unless stated.

### 4.1 `planning-artifacts/epics.md` — Epic 5 / Story 3.5 *(edit 1, approved)*

**Epic list — Epic 5**

OLD:
```
### Epic 5: Post-Proof Hygiene, Retirement, and Owner Review
Dead paths are removed only after production proof, and owner review routes disagreements to the correct contract owner without moving thresholds.
**FRs covered:** FR1–FR4, FR10; NFR5; SM-2, SM-3
```

NEW:
```
### Epic 5: Post-Proof Hygiene and Legacy Retirement
Dead paths are removed only after quiet-production PASS, under a separate destructive-retirement approval.
**FRs covered:** FR1–FR4, FR10; NFR5
```

Match the Epic 5 section heading at the story block.

**FR Coverage Map**

OLD: `Launch, measurement, retirement, and owner-review requirements: Epics 3–5`

NEW:
```
- Launch, production proof, receipt claim, and the first owner-review cycle: Epic 3
- Retirement: Epic 5
- Recurring SM-2 / SM-3 review after Story 3.5: owner-review runbook (not a sprint story)
```

Update Epic 3’s FR line to include SM-2 / SM-3 for the first cycle.

**Append crosswalk** (do not rewrite 2026-08-17 rows):

```
### 2026-08-17 Readiness Crosswalk (current IDs → this correction)

| Prior ID | New ID | Change |
| --- | --- | --- |
| 5.1–5.2 | 5.1–5.2 | unchanged |
| 5.3 | 3.5 + owner-review runbook | first cycle is finite; weekly recurrence leaves the sprint |
```

**Execution and Authority Rules — add:**

```
- Recurring owner review after Story 3.5 follows the owner-review runbook and is not a sprint story.
```

**Remove Story 5.3. Insert after Story 3.4:**

```
### Story 3.5: First Owner Review Cycle

As the product owner,
I want one completed production review cycle and a durable runbook,
So that disagreements have an owner and weekly review can continue without a never-done sprint story.

**Requirements:** FR3; FR5–FR7; SM-2; SM-3; owner: Justin

**Dependency:** Stories 1.24 and 3.2 PASS. Story 2.10 is not required.
Recurring weekly review after this story is the owner-review runbook, not a sprint story.

**Acceptance Criteria:**

**Given** local production samples after Story 1.24 and a passing Story 3.2 receipt run
**When** the first review cycle is prepared
**Then** the owner-review runbook exists with sample sources, record fields,
        triage routes, requalification authority, and the rule that
        thresholds never move after observing results
**And** the cycle sample is exactly 20 Briefs, filled from available
        production serves first, then generated and house fixtures,
        plus any domain Briefs already eligible in the window
**And** the cycle does not wait for organic volume or Story 2.10.

**Given** the 20-Brief sample
**When** Justin reviews them
**Then** each item records agree/should_fail, stable reasons, rationale,
        mode, source class, rubric, deployed identity, and time
**And** a durable first-cycle review record is written
**And** the story is complete when that record and the runbook exist —
        insufficient organic volume does not leave the story incomplete.

**Given** a disagreement
**When** triage runs
**Then** rubric issues amend semantic fixtures
**And** house issues amend the catalog
**And** structural identity changes invalidate structural and all
        dependent evidence
**And** thresholds never change after observing results
**And** Story 1.4 recovery limits remain unchanged.

**Given** requalification is proposed during the cycle
**When** a new run is requested
**Then** exact scope, calls, cost, invalidation, and approval are explicit
**And** a failed attempt does not reactivate
**And** later weekly cycles follow the runbook and are not additional
        sprint stories.
```

### 4.2 `planning-artifacts/epics.md` — Stories 1.15 and 3.4 *(edit 2, approved)*

**Story 1.15 — append AC group**

```
**Given** no current receipt_claim_ref
**When** the idle shell and non-claiming receipt surfaces render
**Then** the strike note is exactly
        "One idea, seeded by the sun and a randomness beacon."
**And** it does not contain "Same window, same spark."
**And** the formula panel uses the UX-DR4 non-claiming receipt string
**And** Story 1.15 does not introduce claiming copy.
```

**Story 3.4 — replace ACs with:**

```
**Given** passing current production proof and quiet gate
**When** exact wording is reviewed
**Then** the ReceiptClaimManifest binds proof ref, deployed identity,
        copy hash, approver, time, and active outcome
**And** copy states committed-artifact reproducibility, not model
        determinism or universal availability
**And** the manifest lists every visitor-visible string it authorizes,
        including whether the strike-note sentence
        "Same window, same spark." is included.

**Given** separate claim approval
**When** the activation value is replaced atomically
**Then** receipt_claim_ref matches the exact manifest
**And** missing, stale, or mismatched proof renders non-claiming copy
        on every surface: formula panel, /how, and strike note
**And** "Same window, same spark." renders only when that exact
        wording is in the current approved copy hash.
```

### 4.3 UX Decision Record + EXPERIENCE.md *(edit 3, approved)*

**Purpose — after the backing sentence, add:**

```
This record is the governing UX companion that stories cite (UX-DR1–UX-DR6).
`DESIGN.md` and `EXPERIENCE.md` are backing spines, not a second governor.
Implementation-readiness assessments must include this file; it is not a duplicate of the spines.
```

Set frontmatter `updated:` to 2026-08-17.

**UX-DR5.4.4**

OLD: `Strike note verbatim: "One idea, seeded by the sun and a randomness beacon. Same window, same spark."`

NEW:
```
4. Strike note default (non-claiming): "One idea, seeded by the sun and a randomness beacon."
   The sentence "Same window, same spark." is claim-gated (Story 3.4 / D24), not preserved as-built.
```

**New delta D24**

```
| D24 | Strike note default drops the as-built sentence "Same window, same spark."
       Default is "One idea, seeded by the sun and a randomness beacon."
       That second sentence renders only when the current ReceiptClaimManifest
       authorizes those exact words. | UX-DR4, UX-DR5.4.4, FR-11, AD-7 | 1.15, 3.4 |
```

**Conflicts 11 and 12**

- 11: three surfaces (`/how`, formula panel, strike note) switch together on `receipt_claim_ref`; all three are non-claiming by default.
- 12: cite Story 3.5, not 5.3.

**EXPERIENCE.md**

- Idle row strike-note string → default only.
- Preservation criterion 4 → match UX-DR5.4.4.

`DESIGN.md` unchanged.

### 4.4 `sprint-status.yaml` + runbook *(edit 4, approved)*

Add `3-5-first-owner-review-cycle: backlog` after 3-4. Remove `5-3-owner-review-and-governed-requalification`. Header comment records 5.3 → 3.5 + runbook. Story 1.3 stays `in-progress`.

Create `planning-artifacts/owner-review-runbook.md` with: weekly cadence after 3.5; 20-Brief fill rule; record fields; triage routes; SM-3 manual attribution; Story 3.5 done when the runbook and one first-cycle record exist.

### 4.5 PRD addendum + architecture operational envelope *(edit 5, approved)*

**Addendum — add under preserved implementation / lifecycle constraints:**

```
- The first SM-2 / SM-3 review cycle is Story 3.5. Weekly review after that
  follows `owner-review-runbook.md` and is not a sprint story.
```

**ARCHITECTURE-SPINE.md Operational envelope** — after the Story 3.2 / 3.3 sentence, add that Story 3.5 is the first owner-review cycle and later weekly review follows the runbook. No AD text change.

## 5. Implementation Handoff

**Scope: Moderate.** Backlog reorganization plus UX contract copy. Not a fundamental replan. Not a Developer-only patch.

| Role | Responsibility |
| --- | --- |
| Product Owner | Apply §4.1, §4.2, §4.4, §4.5 addendum. Re-run `bmad-check-implementation-readiness` against the corrected corpus **including** `ux-decision-record-oddspark.md`. |
| UX Designer | Apply §4.3 (record + EXPERIENCE). No new UX workflow. |
| Solution Architect | Apply §4.5 operational-envelope mention. Confirm no AD change. |
| Developer | Continue Story 1.3. Adopt Story 3.5 / D24 on the next relevant story. Do not change `src/worker.js` strike-note copy in this pass. |
| Operator / Justin | Approve this proposal. Later deployment, quiet observation, promotion, claim activation, and destructive retirement stay separate approvals. |

Approval of this proposal authorizes the planning-artifact edits above only. It authorizes no deployment, live call, provider change, commit to the application repo, or push.

### Success criteria

- Epic 5 states one bounded retirement outcome and contains only 5.1–5.2.
- Story 3.5 has a terminal `done` condition that does not wait on organic volume or Story 2.10.
- Recurring SM-2 / SM-3 review is a runbook, not a sprint story.
- Default strike note has no reproducibility promise; “Same window, same spark.” is Story 3.4–gated.
- `ux-decision-record-oddspark.md` is the governing UX companion; readiness includes it.
- `sprint-status.yaml` matches `epics.md` IDs.
- Readiness re-assessment returns READY, or remaining findings are explicitly accepted.
- Story 1.3 remains in progress and unblocked.

## 6. Checklist State

- §1 Trigger and context — Done.
- §2 Epic impact — Done (Epic 5 narrowed; Story 3.5 after 1.24 + 3.2).
- §3 Artifact conflicts — PRD/ADs: no requirement change; UX: Action-needed then resolved by §4.3; Other: sprint-status + runbook.
- §4 Path forward — Direct Adjustment selected; Rollback and MVP review rejected.
- §5 Proposal components — Done.
- §6.1–6.2 — Done (this document). §6.3 approval — Done (Justin, 2026-08-17). §6.4 sprint-status — Done (3-5 added; 5-3 removed). §6.5 handoff — Done (§5).

## 7. Decision Record

Justin decisions 2026-08-17 (this session):

- Trigger = 10:29 readiness report, all four issues.
- Review mode = Incremental.
- Epic 5 = retirement only (5.1–5.2).
- First owner-review cycle = Story 3.5, depends on 1.24 + 3.2; no Epic 6.
- Recurring review = `owner-review-runbook.md`.
- UX authority = `ux-decision-record-oddspark.md` governs; spines are backing.
- Strike-note second sentence is claim-gated, not deleted.
- Include one-line PRD addendum + architecture operational-envelope mention.

Approval: granted 2026-08-17; planning-artifact edits applied in-session (`epics.md`, `sprint-status.yaml`, `ux-decision-record-oddspark.md`, `EXPERIENCE.md`, `owner-review-runbook.md`, PRD addendum, architecture operational envelope). Remaining: PO re-run of `bmad-check-implementation-readiness` with the UX Decision Record included in the corpus.
