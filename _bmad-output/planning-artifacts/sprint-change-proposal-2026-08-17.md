# Sprint Change Proposal — Deliverable Epic Boundaries and UX Contract

Date: 2026-08-17  
Project: Oddspark  
Trigger: Implementation Readiness Report 2026-08-17 (`implementation-readiness-report-2026-08-17.md`) — **NOT READY**  
Status: Approved by Justin 2026-08-17 — planning edits applied to `epics.md` and `sprint-status.yaml` in the same session  
Scope classification: **Moderate** (backlog reorganization; no requirement or architecture-decision change)  
Review mode: Batch  
Predecessor: `sprint-change-proposal-2026-08-16.md` (Judge Fidelity Recovery — approved; unchanged by this proposal)

> **Story IDs.** This proposal keeps every Epic 1 and Epic 2 story ID from the current `epics.md` stable and appends new stories at the end of each. Epic 3 is split into Epics 3–5, so its stories are renumbered. Section 4.9 carries the crosswalk. Historical IDs in the 2026-08-16 proposal and the 2026-08-16 legacy crosswalk are preserved, not rewritten.

## 1. Issue Summary

The 2026-08-17 Implementation Readiness Assessment found the requirements complete (11/11 FRs traced) but the plan **not ready to govern Phase 4** because of how the work is decomposed, not what it says:

1. **Epic 1 is not independently deliverable.** Its promised outcome ("one press produces a committed, gate-passed local Brief") is realized only by Story 3.6, which itself waits on Epic 2. Forward epic dependency.
2. **Epic 2 is not independently deliverable.** Domain scanning, grounding, lifecycle, and qualification finish in Epic 2, but production enablement is deferred to Story 3.6.
3. **Epic 3 is an operational omnibus** — measurement, `/how` content, storage cleanup, cross-repo contact integration, deployment, production proof, quiet observation, claim activation, handoff activation, destructive retirement, and ongoing owner review in one epic.
4. **No UX contract** despite substantial new visitor-facing states (eight-element card hierarchy, accessibility baseline, loading/degradation, notice/copy matrix, responsive preservation, contact handoff behaviour).
5. **Major story issues:** 2.7 / 3.3 / 3.6 too large; 3.5 not completable in this repository; 14 stories declare only "all required inputs are produced by earlier stories"; several ACs defer their test oracle ("every integrity predicate", "all preserved behavior").
6. **Minor:** broad FR/NFR range citations; 3.13 sequenced after retirement though it is an ongoing process; UX-DRs asserted absent.

**Additional finding during discovery:** `implementation-artifacts/sprint-status.yaml` still lists the *legacy* IDs (1.1–1.13, 2.1–2.7, 3.1–3.8) from before the 2026-08-16 reslice, while `epics.md` treats 1.1–1.20 / 2.1–2.9 / 3.1–3.13 as authoritative. Sprint status is stale independently of this proposal and must be regenerated.

Issue category: planning/decomposition defect. No technical approach failed; no requirement is wrong; no code, evidence, or approval is invalidated.

## 2. Impact Analysis

### 2.1 Epic impact

| Epic | Impact |
| --- | --- |
| Epic 1 | Remains achievable. Gains a **release tail** (retention lifecycle, `/how` rewrite, compatibility-reader deployment, local writer rollout + local-only atomic activation) so the epic ends with local mode live in production. Domain requests in that phase follow the governed local path with notice (Story 1.16, Justin decision 2026-08-17). |
| Epic 2 | Remains achievable. Gains **Story 2.10 Domain Production Activation** — atomic replacement of the activation manifest enabling domain with its Evidence and full-request refs. Story 2.9 is re-scoped: legacy becomes unreachable at Epic 1 rollout, so 2.9 verifies that domain activation introduces no legacy or parallel path and keeps quarantined code recoverable. |
| Epic 3 (old) | Split into three outcome-based epics: **Epic 3 Production Proof, Launch Gate, and Receipt Claim**; **Epic 4 Trustworthy Contact Handoff**; **Epic 5 Post-Proof Hygiene, Retirement, and Owner Review**. |
| Ordering | Unchanged in substance. Release slices are pulled forward into the epics whose outcomes they realize; every authority gate (deployment, quiet observation, promotion, claim activation, receiver activation, destructive retirement, live metered runs) is preserved verbatim. |

No requirement moves between epics except by way of the epic split; the FR coverage map is updated for the split only.

### 2.2 PRD impact

**None required.** MVP scope (§6.1) is unchanged; FR-1…FR-11 and all NFRs stand. The PRD's story references (FR-1 → Story 1.18; OQ3 → Stories 1.3–1.4; OQ6/OQ7 → Stories 1.5, 1.18) point at Epic 1 IDs, which remain stable. Phasing local-then-domain is a rollout order, not a requirement change; the interim domain notice is already an FR-8 behaviour ("plain-language notice").

### 2.3 Architecture impact

**No architectural decision changes.** AD-11's closed `ProductionActivationManifest` already permits local-only activation (`local.enabled=true`, `domain.enabled=false` with null domain refs) and requires atomic whole-value replacement for any later change — which is exactly the mechanism Stories 1.24 and 2.10 use. AD-7's 30-day local retention is assigned an owning story (1.21) rather than being implied by a later cleanup story.

Required edits are **story-ID synchronization only** in: spine *Deferred → Operational envelope* (references to 3.6/3.8/3.9/3.12), spine AD-11 (no change — cited stories 1.4/1.11/1.18/1.19/2.3/2.8 are stable), `solution-design.md` *Release order* and *Qualification is staged* paragraphs (3.6 → 1.24/2.10; 3.8 → 3.2; 3.9 → 3.3; 3.12 → 5.2).

### 2.4 UX impact

A compact **UX Decision Record** is required (readiness critical #3). Scope: the preserved shell is *not* redesigned. The record makes testable: eight-element card hierarchy; accessibility baseline (standard, keyboard/focus, screen-reader semantics, contrast); loading / "within seconds" / deadline behaviour with retry suppression; state-and-copy matrix (downgrade notice, house Brief, invalid input 400, COORD 502, unsupported version, inactive receiver, non-claiming receipt); responsive preservation criteria; invitation POST/303 and plain-link progressive-enhancement/failure/focus behaviour. It becomes a dependency of Stories 1.15, 1.16, 1.22, 4.1, 4.2 and replaces "UX Design Requirements: None" in `epics.md`.

### 2.5 Technical / operational impact

- No production code, tests, deployment configuration, live provider state, or remote resource changes through Correct Course.
- Story files `1-1-shell-safety-net-audit-and-extend-test-mjs.md` (done) and `1-2-judge-fidelity-spike.md` (in-progress; legacy ID = new 1.3–1.4) remain as-is; only sprint bookkeeping changes.
- The Hearn Systems receiver implementation is expressed as an external dependency, which removes an un-completable story from this repository's critical path.

## 3. Recommended Approach

**Direct Adjustment.** Restructure `epics.md` — add release-slice stories to Epics 1 and 2, split Epic 3 into three outcome epics, tighten dependencies and oracles — and commission the UX Decision Record. Effort: **Medium** (~1 day of PO/architect document work + the UX record). Risk: **Low** — nothing built is invalidated, and every safety/authority gate is retained.

Alternatives considered:
- **Rollback** — N/A; no completed story caused the defect.
- **MVP review** — not warranted; the product promise and requirements are unchanged.
- **Rewrite Epic 1 as a non-user-facing qualification milestone** — rejected; the readiness report prefers a real local release slice, and AD-11 already supports it without new architecture.
- **Keep legacy `generatePersonalized` live for domain during the local-only phase** — rejected by Justin (2026-08-17): it would run two live generators, preserve the contrived output the PRD exists to remove, and force rewrites of 1.16/2.9.

## 4. Detailed Change Proposals

All targets are under `_bmad-output/planning-artifacts/` unless stated. Edits are proposed, not yet applied.

### 4.1 `epics.md` — Overview and requirements inventory

- **Overview:** replace "No UX design contract exists … so there are no UX-DRs" with: "A compact UX Decision Record (`ux-decision-record-oddspark.md`) governs the preserved shell's new states; the one-button / optional-domain interaction is not redesigned."
- **UX Design Requirements:** replace "None" with UX-DR1…UX-DR6 (card hierarchy; accessibility baseline; loading/deadline behaviour; state-and-copy matrix; responsive preservation; invitation navigation/failure behaviour), each marked *pending the UX Decision Record*.
- **FR Coverage Map:** FR7 → Epics 1 and 4; FR11 → Epics 1 and 3; add "launch/measurement requirements → Epics 3–5".
- **Execution and Authority Rules:** add: "Domain requests during the local-only production phase follow Story 1.16's governed local path with the plain-language notice; the legacy generator is unreachable from Story 1.24 onward and is quarantined, not deleted, until Story 5.2."

### 4.2 Epic list (new)

```
Epic 1: A Coherent Brief From One Button — local mode live in production
  A press without a domain produces a committed, gate-passed local Brief or approved house Brief in production,
  through independently qualified generation and judging, behind one atomic local-only activation.
  FRs: FR1, FR3–FR7, FR10–FR11; NFR2, NFR4–NFR5

Epic 2: Website-Grounded Sparks — domain mode live in production
  A submitted public domain produces one safely grounded Brief or an honest local downgrade in production,
  domain data stays ephemeral, and activation is one atomic manifest replacement.
  FRs: FR2, FR6, FR8–FR11; NFR1–NFR5

Epic 3: Production Proof, Launch Gate, and Receipt Claim
  Same-window production behaviour is proven, the quiet-production house-rate gate is observed, and the
  receipt claim is activated only from current evidence — unlocking public promotion.
  FRs: FR11; NFR2, NFR4–NFR5; launch requirements

Epic 4: Trustworthy Contact Handoff
  The invitation measures aggregate engagement and carries an opaque reference to Hearn only when a verified
  receiver contract is active; otherwise it stays a plain link.
  FRs: FR7; NFR1, NFR3; AD-8, AD-10

Epic 5: Post-Proof Hygiene, Retirement, and Owner Review
  Dead paths are removed only after production proof, and owner review routes disagreements to the correct
  contract owner without moving thresholds.
  FRs: FR1–FR4, FR10; NFR5; SM-2, SM-3
```

### 4.3 Epic 1 — new stories 1.21–1.24 (appended; 1.1–1.20 IDs unchanged)

**Story 1.21: Local Artifact Retention Lifecycle** *(carved from old 3.3)*
As a developer, I want every local-scope persisted record to carry explicit, non-sliding expiry, so that production inherits no unbounded storage.
Requirements: FR11; NFR1; AD-7. Dependency: Story 1.14.
- Given local COORD receipts and `w:` projections, when committed, then `committed_at`/`expires_at` are immutable and exactly 30 days apart, and `/s/:id` and `/api/spark/:id` refuse at or after expiry.
- Given the pre-existing record families (profile 24h, abuse slots 1h, neuron receipts 2d, aggregate reports 90d), when retention is inventoried, then owner, authority, creation, read, expiry, and cleanup are explicit and covered by time-controlled tests.
- Given cleanup and projection repair, when they run, then expiry never slides, cleanup cannot cross scopes or restore eligibility, and COORD remains authoritative.
(Domain one-hour lifecycle remains Story 2.6.)

**Story 1.22: Honest Pipeline Explanation** *(old 3.2, moved; text unchanged)*
Dependency: Story 1.15; UX Decision Record for accessible Mermaid metadata and fallback text.

**Story 1.23: Compatibility Reader Deployment** *(carved from old 3.6)*
As an operator, I want the compatibility reader deployed and verified before any new writer, so that production never observes a mixed-version artifact it cannot read.
Requirements: FR11; NFR5; AD-7; AD-11. Dependency: Stories 1.2, 1.14, 1.16; explicit deployment approval.
- Given a candidate reader release, when preflight runs, then toolchain identity, reader acceptance of the current legacy shape, lossless shim or fail-closed rejection of `CommittedBrief` versions, and config isolation pass, and dry run creates no resource.
- Given explicit deployment approval, when the reader deploys, then legacy artifacts still read, no writer or activation manifest exists, and rollback restores the prior artifact without data change.

**Story 1.24: Local Writer Rollout and Atomic Local-Only Activation** *(carved from old 3.6)*
As an operator, I want the local pipeline live behind one atomic local-only activation value, so that visitors receive committed gate-passed local Briefs from production.
Requirements: FR1, FR3–FR7, FR10–FR11; NFR2, NFR4–NFR5; AD-11. Dependency: Stories 1.20–1.23; explicit deployment approval.
- Given the deployed reader and current STRUCT-JUDGE, STRUCT-GENERATION, SEMANTIC, local FULL-PAIR, and house-catalog refs, when preflight runs, then the enumerated release-decision view (Story 1.20) shows every applicable gate `pass`, and dry run creates no resource.
- Given explicit deployment approval, when rollout executes, then the writer deploys, and the `ProductionActivationManifest` is written atomically and last with `local.enabled=true`, `domain.enabled=false`, domain refs null, `receiver_ref` null, `receipt_claim_ref` null.
- Given a domain request in this phase, when it runs, then it follows Story 1.16's governed local path with the plain-language notice under domain request scope, and the legacy generator is unreachable.
- Given a rollback, when the prior compatible artifact is restored, then the whole activation value is removed or replaced atomically and stale refs cannot reactivate.

### 4.4 Epic 2 — Story 2.9 re-scope and new Story 2.10

**Story 2.9 (re-scoped):** retitle "Governed-Path Verification and Legacy Quarantine". Given the legacy generator is already unreachable after Story 1.24, when domain activation is prepared, then verification proves no flag, missing ref, provider failure, or fallback selects legacy or a domain-specific parallel path; legacy code is quarantined and recoverable, deletion deferred to Story 5.2. Dependency: Stories 1.24 and 2.1–2.8.

**Story 2.10: Domain Production Activation** *(carved from old 3.6)*
As an operator, I want domain mode enabled by one atomic activation-manifest replacement, so that website grounding goes live without partial state.
Requirements: FR2, FR8–FR9, FR11; NFR1–NFR5; AD-11. Dependency: Stories 2.8–2.9; explicit deployment approval.
- Given current STRUCT-EVIDENCE and domain FULL-PAIR refs, when preflight runs, then the release-decision view shows every domain gate `pass`, expiry is fail-closed, and dry run creates no resource.
- Given explicit approval, when activation executes, then the manifest is replaced atomically with `domain.enabled=true` plus exact Evidence and domain full-request refs; shared refs are unchanged and appear once.
- Given a rollback, when it executes, then the local-only manifest is restored atomically and domain expiry remains fail-closed.

### 4.5 Epic 3 (new) — Production Proof, Launch Gate, and Receipt Claim

| New | Old | Change |
| --- | --- | --- |
| 3.1 | 3.7 Production Receipt Verification Harness | Dependency → Stories 1.24 and 2.10 define the deployed contract; buildable offline earlier. |
| 3.2 | 3.8 Production Receipt Verification Run | Dependency → 3.1; LIVE-AUTH + RELEASE-ONLY approval. |
| 3.3 | 3.9 Quiet-Production House-Rate Gate | Dependency → 3.2 PASS; separate quiet-production approval. |
| 3.4 | 3.10 Receipt Claim Approval and Activation | Dependency → 3.2–3.3; separate wording/claim approval. |

Story text unchanged apart from ID references.

### 4.6 Epic 4 (new) — Trustworthy Contact Handoff

| New | Old | Change |
| --- | --- | --- |
| 4.1 | 3.1 Aggregate Invitation Event Endpoint | Dependency → 1.14–1.15, 2.6; UX Decision Record for invitation states. |
| 4.2 | 3.4 Hearn Sender Contract and Plain-Link Fallback | Dependency → 1.15, 4.1; UX Decision Record. |
| 4.3 | 3.5 → **Hearn Receiver Contract Verification** | Re-scoped to Oddspark-owned work only: closed `HearnReceiverManifest` fixture, contract-version/origin/path/query-key verification, plain-link fallback proof. The receiver form implementation is an **external dependency** with its own story in the Hearn Systems repository; its deployment revision is an input, not a deliverable. |
| 4.4 | 3.11 Hearn Reference Handoff Activation | Dependency → 4.3, 1.24 (activation manifest exists); separate reference-handoff approval. |

### 4.7 Epic 5 (new) — Post-Proof Hygiene, Retirement, and Owner Review

| New | Old | Change |
| --- | --- | --- |
| 5.1 | 3.3 (dead-code half) → **Executable Dead-Code Hygiene** | Only the reachability/removal AC; retention moved to 1.21. Dependency → 2.9, 3.3 PASS. |
| 5.2 | 3.12 Destructive Legacy Seam Retirement | Dependency → 2.9, 3.3 PASS, 5.1; separate destructive-retirement approval. |
| 5.3 | 3.13 Owner Review and Governed Requalification | Reframed as an **ongoing process**: begins after Story 1.24 first production sampling (local), adds domain samples after 2.10; not blocked on 5.1–5.2. Requalification limits (Story 1.4) unchanged. |

### 4.8 Dependency and oracle tightening (readiness major #3, #4; minor #1)

Replace every "All required inputs are produced by earlier stories" with exact IDs / external artifacts:

| Story | Dependency |
| --- | --- |
| 1.2 | 1.1 |
| 1.3 | 1.1; external: immutable v1 evidence `spikes/judge-fidelity/results/2026-08-16-d2b84005.json` + audit addendum |
| 1.5 | none; external: `coherence-gates.md`, `result-card-contract.md`; owner Justin |
| 1.6 | none; external: `generation-modes.md`; owner Justin |
| 1.7 | 1.1 |
| 1.8 | 1.5, 1.7; owner Justin |
| 1.9 | 1.6, 1.7 |
| 1.10 | 1.7, 1.9 |
| 1.14 | 1.1, 1.7 |
| 1.15 | 1.7, 1.8, 1.14; UX Decision Record |
| 1.16 | 1.1, 1.9, 1.13, 1.15; UX Decision Record (notice copy) |
| 2.1 | 1.1, 1.16 |
| 2.2 | 1.7, 2.1 |
| 2.4 | 1.13, 2.2 |
| 2.7 | split at a state transition: 2.7 keeps shared-pipeline integration (identity reuse, E=1 pair bound, domain-scoped commit); its cross-mode activation-identity AC group (byte-identical hash comparison, mode-specific override rejection) moves into Story 2.10's activation preflight, where it is actually enforced. Dependency 1.11–1.16, 2.1–2.6 unchanged. |

Bind deferred oracles:
- 1.1 "all preserved behavior is covered" → the enumerated behaviour inventory in the story file's task list (already completed; add the reference).
- 1.4 / 1.11 / 1.18 / 1.19 / 2.8 "every integrity predicate" (2.3 has no such phrase; no change) → the closed predicate list of the evidence-v2 verifier produced by Story 1.3, cited by version hash.
- 1.24 / 2.10 preflight → the enumerated gate list of the release-decision view (Story 1.20), cited by version.
- 3.2 "identity, isolation, expiry, ledger, denominator, artifact integrity" → the closed harness schema of Story 3.1.
Add an AC-to-requirement mapping table to Stories 1.24, 2.7, 2.8, 2.10, and 3.2 (broad FR/NFR ranges).

### 4.9 Story ID crosswalk (2026-08-16 reslice → this proposal)

| 2026-08-16 ID | New ID | | 2026-08-16 ID | New ID |
| --- | --- | --- | --- | --- |
| 1.1–1.20 | unchanged | | 3.6 | 1.23, 1.24, 2.10 |
| 2.1–2.6 | unchanged | | 3.7 | 3.1 |
| 2.7 | 2.7 (narrowed) + 2.10 | | 3.8 | 3.2 |
| 2.8 | unchanged | | 3.9 | 3.3 |
| 2.9 | 2.9 (re-scoped) | | 3.10 | 3.4 |
| — | 2.10 (new) | | 3.11 | 4.4 |
| 3.1 | 4.1 | | 3.12 | 5.2 |
| 3.2 | 1.22 | | 3.13 | 5.3 |
| 3.3 | 1.21 + 5.1 | | — | 1.21, 1.23, 1.24 (new/carved) |
| 3.4 | 4.2 | | | |
| 3.5 | 4.3 (Oddspark side only) | | | |

The existing "Legacy Story Crosswalk" table (approved legacy → 2026-08-16 IDs) is retained; this table is appended beneath it.

### 4.10 Architecture and solution-design ID sync

- `ARCHITECTURE-SPINE.md` › *Deferred › Operational envelope*: "Story 3.8 production verification" → 3.2; "Story 3.9's organic served-event sample" → 3.3; "Story 3.12's destructive seam retirement" → 5.2; add "Story 1.24 publishes the local-only manifest; Story 2.10 replaces it atomically to enable domain."
- `solution-design.md` › *Release order*: "Story 1.20 defines the single activation value, which Story 3.6 publishes atomically and last" → "…which Story 1.24 publishes atomically and last for local mode and Story 2.10 replaces atomically for domain mode"; "After Story 3.8 verification … Story 3.9's organic sample" → 3.2 / 3.3.
- No AD text changes.

### 4.11 UX Decision Record (new artifact)

Route to the UX Designer workflow (`bmad-ux`) with a constrained brief: **do not redesign the interaction (FR10/AD-10)**. Produce `_bmad-output/planning-artifacts/ux-decision-record-oddspark.md` covering the six UX-DRs in §4.1. It must exist before Story 1.15 begins.

### 4.12 `sprint-status.yaml` regeneration

Regenerate against the new story set (checklist 6.4). Proposed bookkeeping:
- `epic-1: in-progress`; `1-1-shell-safety-net: done`; `1-2-toolchain-and-isolated-runtime-baseline: backlog`; `1-3-judge-recovery-contract-and-offline-verifier: in-progress` (carries the legacy 1.2 spike's status; its story file remains `1-2-judge-fidelity-spike.md` as immutable history and is annotated, not renamed); `1-4 … 1-24: backlog`.
- `epic-2 … epic-5: backlog` with all stories `backlog`; retrospectives `optional`.
- Header comment records the 2026-08-16 legacy IDs and this crosswalk.

## 5. MVP Impact and Action Plan

**MVP impact: none.** Same product promise, same requirements, same authority gates. The change makes user value arrive earlier (local mode live at the end of Epic 1) and makes each epic independently assessable.

Ordered actions:
1. **Product Owner** — apply §4.1–4.9 to `epics.md`; regenerate `sprint-status.yaml` per §4.12.
2. **Solution Architect** — apply the §4.10 ID sync to the spine and solution design (no AD change).
3. **UX Designer (bmad-ux)** — produce the UX Decision Record per §4.11 before Story 1.15.
4. **Product Owner** — re-run `bmad-check-implementation-readiness`.
5. **Developer** — continue Story 1.3 (judge recovery contract) as planned; nothing in this proposal blocks or alters it.

## 6. Success Criteria

- Every epic states an outcome it delivers without a later epic (Epic 1 → local live; Epic 2 → domain live; Epic 3 → promotion/claim unlocked; Epic 4 → verified handoff; Epic 5 → clean retirement).
- No story depends on a later-numbered story or on work outside this repository's authority.
- Every dependency names exact IDs or external artifacts; every broad AC names its oracle.
- The UX Decision Record exists and is traced into rendering, notice, `/how`, and invitation stories.
- `sprint-status.yaml` matches `epics.md` IDs.
- Readiness re-assessment returns READY, or its remaining findings are explicitly accepted.

## 7. Handoff and Governance

| Role | Responsibility |
| --- | --- |
| Product Owner | `epics.md` restructure, crosswalk, sprint bookkeeping, readiness re-run |
| Solution Architect | Story-ID sync in spine/solution design; confirm no AD change |
| UX Designer | UX Decision Record (constrained scope) |
| Developer | Continue Story 1.3; adopt new IDs on next story creation |
| Operator / Justin | Approval of this proposal; later, each deployment/activation approval separately |

Approval of this proposal authorizes the planning-artifact edits above only. It authorizes no deployment, live call, provider change, commit, or push.

## 8. Checklist State

- §1 Trigger and context — Done (readiness report + stale sprint status as evidence).
- §2 Epic impact — Done.
- §3 Artifact conflicts — PRD: no change; Architecture: ID sync only; UX: **Action-needed** (§4.11); Other: sprint-status **Action-needed** (§4.12).
- §4 Path forward — Direct Adjustment selected; Rollback N/A; MVP review not needed.
- §5 Proposal components — Done.
- §6.1–6.2 — Done. §6.3 approval — Done (Justin, 2026-08-17). §6.4 sprint-status — Done (regenerated). §6.5 handoff — Done (§7).

## 9. Decision Record

Justin decisions captured 2026-08-17: trigger = readiness report (full scope incl. UX); review mode = Batch; local-only phase serves domain requests via the governed local path with notice (legacy not kept live).  
Approval: granted 2026-08-17; edits to `epics.md` and `sprint-status.yaml` applied in-session. Architecture ID sync (§4.10) applied 2026-08-17 (spine Operational envelope + sources/updated; solution-design Release order); no AD text changed. UX Decision Record (§4.11) produced 2026-08-17 via bmad-ux (`ux-decision-record-oddspark.md` + `ux-designs/ux-oddspark-2026-08-17/{DESIGN,EXPERIENCE}.md`; rubric + accessibility reviews resolved). Remaining: PO re-run of `bmad-check-implementation-readiness`.
