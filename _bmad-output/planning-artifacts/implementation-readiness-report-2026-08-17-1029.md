---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
filesIncluded:
  prd:
    - _bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/prd.md
    - _bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/addendum.md
  architecture:
    - _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md
    - _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/solution-design.md
  epics:
    - _bmad-output/planning-artifacts/epics.md
  ux:
    - _bmad-output/planning-artifacts/ux-designs/ux-oddspark-2026-08-17/DESIGN.md
    - _bmad-output/planning-artifacts/ux-designs/ux-oddspark-2026-08-17/EXPERIENCE.md
excludedDuplicates:
  - _bmad-output/planning-artifacts/ux-decision-record-oddspark.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-17
**Project:** Github

## Document Discovery

### PRD Files Found

**Selected folder corpus:** `_bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/`

- `prd.md` (26,361 bytes; modified 2026-08-17 08:26:20 EDT)
- `addendum.md` (5,909 bytes; modified 2026-08-17 08:08:55 EDT)

Supporting reconciliation and review records remain in the same folder but are not treated as canonical PRD inputs.

### Architecture Files Found

**Selected folder corpus:** `_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/`

- `ARCHITECTURE-SPINE.md` (35,451 bytes; modified 2026-08-17 09:04:01 EDT)
- `solution-design.md` (12,367 bytes; modified 2026-08-17 09:04:01 EDT)

Supporting review records remain in the same folder but are not treated as canonical architecture inputs.

### Epics and Stories Files Found

**Selected whole document:**

- `_bmad-output/planning-artifacts/epics.md` (63,967 bytes; modified 2026-08-17 09:43:41 EDT)

### UX Design Files Found

**Selected folder corpus:** `_bmad-output/planning-artifacts/ux-designs/ux-oddspark-2026-08-17/`

- `DESIGN.md` (29,180 bytes; modified 2026-08-17 10:21:47 EDT)
- `EXPERIENCE.md` (44,284 bytes; modified 2026-08-17 10:21:47 EDT)

**Excluded duplicate:**

- `_bmad-output/planning-artifacts/ux-decision-record-oddspark.md` (32,345 bytes; modified 2026-08-17 10:21:47 EDT)

### Discovery Resolution

- All four required planning-document types were found.
- The newer UX folder corpus was confirmed as authoritative; the standalone UX decision record was excluded.
- The existing `implementation-readiness-report-2026-08-17.md` was preserved unchanged.
- This reassessment uses the distinct timestamped report filename `implementation-readiness-report-2026-08-17-1029.md`.

## PRD Analysis

### Functional Requirements

#### FR-1: Coherent local generation

Given no Domain, the system generates a Candidate grounded in Port Huron / Blue Water Area small-business context, current date/time, seasonality, and a Delivery-Envelope capability bundle. Realizes UJ-1.

**Consequences (testable):**

- The Candidate references season-appropriate context consistent with the generation date.
- The Candidate's proposed capability falls inside the Delivery Envelope.
- Before production use, local grounding and retellability pass the versioned local-mode golden/anti-golden corpus and predeclared semantic threshold owned by Story 1.18.
- No random-axis vocabulary from the legacy generator (who/lens/form/friction lists) appears in output.

#### FR-2: Website-grounded generation

Given a Domain, the system assembles an Evidence Bundle from the public website and generates a Candidate from it plus general vertical knowledge. Realizes UJ-2.

**Consequences (testable):**

- The Candidate is traceable to at least one signal in the Evidence Bundle.
- The rendered Brief contains exactly one Breadcrumb, and the Breadcrumb is specific and positive-or-neutral — never fault-finding, never a person's name or personal contact detail.
- The Candidate does not duplicate a capability the Evidence Bundle shows the site already has.
- The Candidate contains no business-specific facts absent from the Evidence Bundle; general vertical knowledge means trade-level patterns, never facts about this business learned off-site or from model pretraining.

#### FR-3: Gate evaluation

The system evaluates every Candidate against gates 1–9 in `coherence-gates.md` (recognizable routine, constructive intervention, capability inventory, channel fit, proportionality, delivery fit, preservation, natural retelling, novel-but-imaginable).

**Consequences (testable):**

- The representative contradiction set (existing scheduler, channel mismatch, undersized/oversized solution, unactionable criticism, non-digital advice) is rejected 100% of the time in testing.
- A malformed, incomplete, ambiguous, schema-invalid, candidate-unbound, or otherwise unqualified judge result rejects the Candidate and counts as a failed attempt. Repair, coercion, omission, and fallback interpretation can never turn it into a pass.
- A rejected Candidate leaves no visible trace in the UI.

#### FR-4: Bounded regeneration

On gate failure the system retries only while a complete generation-to-judge pair fits within the six-model-call strike ledger and the remaining wall-clock budget. Every model-based evidence, generation, and judge invocation consumes one call before invocation. If evidence consumes `E` model calls, the Candidate limit is `min(3, floor((6 - E) / 2))`: `E=0` permits at most three complete pairs; `E=1` permits at most two. Exhaustion or insufficient remaining time returns the curated house Brief rather than rendering a near-miss.

**Consequences (testable):**

- No response renders a Candidate that failed a gate — including graceful fallbacks, which are themselves gate-passing Coherent Local Mode Briefs, never unvetted near-misses.
- No strike starts a partial generation-to-judge pair or exceeds six model calls; failed, timed-out, and invalid invocations still consume their reserved call.
- The visitor always receives either a gate-passing Brief or a graceful fallback — never a hang or an error wall.

#### FR-5: Contract-complete rendering

Every Brief renders all eight elements in the order defined in `result-card-contract.md`.

**Consequences (testable):**

- Snapshot/structural tests confirm all eight elements present, in order, per render.
- Change Level always includes a preliminary time range plus workflow-step impact.
- What Stays the Same names preserved tools, decision authority, and untouched workflow steps (all three, where applicable).
- The Brief reads as a confident plan — no hypothetical framing and no rhetorical questions posed to the owner.
- Before launch, a written voice rubric and at least three approved golden-reference Briefs per mode exist; sampled Briefs are reviewed against them. Banned registers — consultant-speak, pitch voice, audit framing, and hype adjectives — are enumerated in that rubric. Justin owns this pre-launch deliverable.

#### FR-6: Claim discipline

Numeric claims about the business's outcomes appear only when grounded in real numbers found on the public site; otherwise all effects are qualitative. The Change Level time range is Hearn Systems' own preliminary estimate, not a business-outcome number, and is always labeled preliminary.

**Consequences (testable):**

- In Coherent Local Mode, rendered Briefs contain no numeric ROI, percentages, or savings figures.
- In Website-Grounded Mode, every business-outcome number in the Brief is traceable to the public site.
- Qualitative effects name who is affected and what physically changes in their day, never bare mush such as “saves time” or “more time with customers.”
- No price for Hearn Systems work appears anywhere in a Brief.

#### FR-7: Spark-specific invitation

The CTA ties the invitation to this exact Spark and its smallest useful version, offering a bounded feasibility conversation.

**Consequences (testable):**

- The CTA references the Spark by name or content, not a generic “contact us.”
- CTA copy contains no pricing, urgency/pressure language, or pitch register; it reads as an offer to think together in the plain voice defined by the voice rubric.
- CTA copy explicitly leaves room to conclude the idea is not worth changing; “say so if it is not worth changing” is the trust mechanism behind “no pitch attached.”

#### FR-8: Public-site evidence only

Website evidence is limited to the submitted public website plus general vertical knowledge and current date/time.

**Consequences (testable):**

- Submitted public-site responses may contain PII only in the ephemeral scan buffer needed to detect and exclude it. Detected PII is never retained, copied into the Evidence Bundle, sent to a model, used for personalization/generation, or rendered. Cookies, sessions, Google reviews, and off-site footprint data are neither fetched nor used.
- Server-side abuse-prevention rate limiting and short-lived KV caching are permitted as an explicit carve-out; they play no role in personalization, generation content, or cross-visit tracking of individuals.
- The scanner respects `robots.txt`; sites that disallow crawling fall back to Coherent Local Mode with the plain-language notice.
- Scan degradation (unreachable site or unclear purpose) falls back to Coherent Local Mode with a plain-language notice. Existing scan limits and warnings are assumed to carry over from the current worker.

#### FR-9: One-breadcrumb ceiling

At most one business-specific detail from the Evidence Bundle appears in the rendered Brief; the rest remains backstage.

**Consequences (testable):**

- Rendered Briefs contain no capability inventory, audit list, or multi-item site findings.
- A Website-Grounded Brief is ephemeral to the session: no public permalink, shareable URL, or indexed page persists a critique of a third-party business. KV caching for reproducibility is internal and does not mint public URLs for domain-mode Briefs.

#### FR-10: Interaction preservation

The UI keeps exactly one button and one optional Domain field; no new inputs or steps.

**Consequences (testable):**

- UI diff shows no added form fields.
- Both modes trigger from the same single action.

#### FR-11: Verifiability preservation (resolved: cache-first)

Same window, same Spark — preserved through committed-artifact reproducibility, not model determinism. The first gate-passing Brief in a seed window (or per `(round, domain)` claim) is committed in the authoritative coordinator receipt; the existing KV pins are read projections, and all later requests in the window resolve the identical committed artifact. Domain-mode Briefs get no public permalink. UI copy makes no reproducibility promise until cache-first behavior is verified in production. Resolved by architecture AD-7.

**Consequences (testable):**

- Two requests in the same seed window with identical inputs return the identical committed Brief.
- Website-grounded Briefs have no `/s/:id` permalink.
- UI copy contains no reproducibility/verifiability promise until production verification.

**Total FRs: 11**

### Non-Functional Requirements

#### NFR-1: Privacy

Detected PII is discarded from the ephemeral scan buffer before evidence persistence or model use; no PII, cookies, sessions, reviews, or off-site research enters personalization, generation, or rendered output. Server-side abuse-prevention rate limiting and short-lived KV caching are an explicit, declared carve-out with no tracking role. `robots.txt` is respected.

#### NFR-2: Performance

A strike completes within the architecture's hard `STRIKE_BUDGET_MS` wall-clock cap (AD-9) or degrades to the house Brief per FR-4; the existing four-second scan budget carries over until architecture measurement revisits it.

#### NFR-3: Security

Domain input remains validated and size-limited per existing worker guards, including request-body and URL limits and redirect caps.

#### NFR-4: Cost

FR-4's six-call ledger is the LLM cost cap per button press.

**Total NFRs: 4**

### Additional Requirements

#### Product and scope constraints

- Preserve one button, one optional Domain field, and the existing playful brand voice; do not add inputs or interaction steps.
- Do not conduct or surface a website audit, faults without solutions, generic sales copy, unsupported ROI, false precision, pre-discovery pricing, non-Delivery-Envelope work, or replacement of functioning tools merely to make the idea seem transformative.
- MVP remains English-only, stateless per visit, without accounts, saved Sparks, history, an analytics dashboard, or CTA A/B testing.
- Public reproducibility claims remain out of scope until production verification, even though FR-11 behavior ships.
- Enterprises, multi-location organizations, audit/SEO seekers, and existing Hearn Systems clients mid-engagement are v1 non-users.

#### Measurement requirements

- `SM-1` is an approximate invitation-event rate: accepted `invitation_acted` events divided by authoritative `briefs_served` events. It is not a unique-person or per-render percentage, may be skewed by repeat actions, and receives a target only after a four-week baseline.
- `SM-2` requires zero displayed Briefs failing any Coherence Gate in a weekly sampled review of 20 Briefs across both modes.
- `SM-3` counts inbound conversations referencing a specific Spark per month.
- `SM-4` requires exactly one specific, positive-or-neutral, non-personal Breadcrumb in sampled Website-Grounded Briefs and reviewed retellability.
- `SM-5` requires date/region-accurate seasonal/local context and reviewed retellability in sampled Coherent Local Briefs.
- Do not optimize button presses per visit, Brief length/detail, or impressive-looking claim specificity.

#### Architecture-resolved and deferred qualification constraints

- AD-7 resolves reproducibility as cache-first committed-artifact reproducibility, never model determinism; production verification precedes any UI claim.
- AD-3 and AD-9 resolve regeneration to a maximum six-call ledger, complete generation/judge pairs only, and a hard wall-clock cap with curated house-Brief fallback.
- AD-2 settles the Gate shape as local deterministic/policy validation followed by a separate one-call semantic judge preserving the canonical gates 1–9, tone, and claims verdict.
- AD-11 qualification remains required for the exact judge provider/model, candidate-bound outer wire contract, lossless canonical adapter, latency allocation, and qualified fallback. Invalid or unqualified results fail closed within the ledger.
- AD-8 resolves measurement to coordinator-owned aggregate counters, KV report snapshots, and `POST /api/cheer`, without per-visitor tracking beyond the abuse-prevention carve-out.
- AD-4 requires `clarity=clear`, at least one substring-verified observation, and a non-empty detected-capabilities list before Website-Grounded generation; otherwise downgrade before generation with the plain-language notice.
- Justin owns the Gate-3 and Gate-9 golden/anti-golden examples and voice boundary. Story 1.18 must meet a predeclared semantic threshold before production.

#### Preserved implementation and lifecycle constraints from the addendum

- Preserve the current drand quicknet plus NOAA GOES X-ray seed scheme unless architecture changes it, with a 100-round seed window of approximately five minutes.
- Existing site-scan limits are `SCAN_BUDGET_MS=4000`, `SCAN_BYTE_LIMIT=512KB`, `SCAN_PAGE_LIMIT=3`, `REDIRECT_LIMIT=3`, `WEBSITE_LENGTH_LIMIT=2048`, and request-body limit 4096.
- Existing abuse controls include a one-hour visitor window, ten-domain per-visitor limit, Spark-ID validation, a 20-second claim lease, and 24-hour profile TTL.
- Domain-result retention is exactly one hour from authoritative commit. Domain-scoped artifacts have no public permalink.
- Local public `/s/:id` artifacts and authoritative receipts expire exactly 30 days after commit.
- Every provider role shares the six-call ledger and hard deadline. Workers AI uses `NeuronMeter`; another provider requires an approved equivalent cost meter and budget before qualification.
- After at least 100 authoritative production `briefs_served` events, public launch requires `house_briefs_served * 100 < briefs_served * 10`. Complete same-interval platform HTTP outcome coverage is separately required; unexplained 5xx or incomplete coverage blocks overall PASS.
- Production consumes one atomically written, closed canonical activation-manifest deployment value binding deployed source identity and all applicable qualification, full-request, catalog, Hearn receiver, and receipt-claim references. Partial or separately supplied references reject.
- Stronger receipt/reproducibility copy renders only when its exact approved claim-proof reference is current; otherwise non-claiming copy remains.
- Fixed invitation copy states the 30-day local and one-hour domain expiries and never promises later Hearn recovery.
- Invalid activation configuration disables model, claim, and reference features without crashing the shell.
- Launch availability evidence is interval-based, aggregate, and privacy-safe. Receiver proof becomes stale after relevant contract or deployment behavior changes.
- A deterministic on-demand decision view shows every gate without creating state. Deployment, quiet observation, promotion, claim activation, and destructive retirement retain separate approvals.
- The activation manifest contains shared generation, judge, and semantic references once, nests only mode-specific Evidence/full-request state, is the sole deployed activation value, and has a runtime-derived hash.
- HTTP evidence uses a frozen interval rather than invented cumulative starting totals. Diagnostics use existing observability and create no new storage.
- With an exact matching active closed `HearnReceiverManifest`, accepted `POST /api/cheer` returns fixed `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>`. Only the opaque artifact ID crosses origins and is resolvable only during its approved lifetime. The Hearn contact form must preserve it in the submitted conversation record, requiring separately approved work in that repository.
- Without a current receiver reference, Oddspark renders the plain fixed contact link, sends no reference, and records no invitation event. SM-1 reports disclose receiver-activation coverage.

### PRD Completeness Assessment

The selected PRD corpus defines 11 globally numbered functional requirements, four cross-cutting NFRs, explicit non-goals, success and counter-metrics, and detailed architecture-resolved constraints. It is unusually strong on fail-closed behavior, privacy boundaries, bounded model cost, reproducibility semantics, retention, and separation of activation authorities.

The principal completeness risks to validate downstream are intentional dependencies rather than missing product intent: normative details live in referenced SPEC companion documents; judge/provider qualification and semantic thresholds are deferred to named stories; and production/claim/receiver activation requires exact external evidence. Epic coverage must therefore cover both the numbered FRs/NFRs and these non-numbered launch, qualification, lifecycle, and cross-repository constraints.

## Epic Coverage Validation

### Epic FR Coverage Extracted

- FR-1: Epic 1 — coherent local generation; supporting governed-path retirement in Epics 2 and 5.
- FR-2: Epic 2 — website-grounded generation.
- FR-3: Epic 1 — composite local/semantic Gate, structural qualification, and calibrated semantic judge; supporting activation and review coverage in Epics 2 and 5.
- FR-4: Epic 1 — six-call complete-pair orchestration, qualified fallback roles, deadline, and house Brief; supporting domain integration and retirement coverage in Epics 2 and 5.
- FR-5: Epic 1 — contract-complete rendering; supporting domain and owner-review coverage in Epics 2 and 5.
- FR-6: Epic 1 — local structural claim discipline plus semantic judgment; supporting domain grounding in Epic 2 and owner review in Epic 5.
- FR-7: Epic 1 — Spark-specific invitation rendering; Epic 4 — measured, reference-bearing Hearn handoff; supporting owner review in Epic 5.
- FR-8: Epic 2 — public-site evidence only, with the inactive-domain downgrade seam and visitor explanation established in Epic 1.
- FR-9: Epic 2 — one-Breadcrumb ceiling and domain ephemerality across every read path.
- FR-10: Epic 1 — interaction preservation; supporting governed-path verification and post-proof hygiene in Epics 2 and 5.
- FR-11: Epic 1 — authoritative COORD receipt, KV projections, local retention, compatible rollout, and activation; Epic 2 — domain retention and activation; Epic 3 — production proof before a public claim.

**Total PRD FR identifiers claimed in epics: 11**

### Coverage Matrix

| FR | PRD requirement | Epic/story coverage | Status |
| --- | --- | --- | --- |
| FR-1 | Coherent local generation | Epic 1: Stories 1.6, 1.9–1.11, 1.19, 1.24; Epic 2: Story 2.9; Epic 5: Story 5.2 | ✓ Covered |
| FR-2 | Website-grounded generation | Epic 2: Stories 2.1–2.5, 2.7–2.8, 2.10 | ✓ Covered |
| FR-3 | Gate evaluation | Epic 1: Stories 1.3, 1.5, 1.7, 1.12, 1.17–1.19, 1.22, 1.24; Epic 2: Stories 2.7–2.10; Epic 5: Stories 5.2–5.3 | ✓ Covered |
| FR-4 | Bounded regeneration | Epic 1: Stories 1.8–1.9, 1.13, 1.19, 1.22, 1.24; Epic 2: Stories 2.7–2.9; Epic 5: Story 5.2 | ✓ Covered |
| FR-5 | Contract-complete rendering | Epic 1: Stories 1.5, 1.7–1.8, 1.10, 1.15, 1.17–1.19, 1.22, 1.24; Epic 2: Stories 2.7–2.8; Epic 5: Story 5.3 | ✓ Covered |
| FR-6 | Claim discipline | Epic 1: Stories 1.5–1.8, 1.10, 1.12, 1.15, 1.17–1.19, 1.24; Epic 2: Stories 2.5, 2.7–2.8; Epic 5: Story 5.3 | ✓ Covered |
| FR-7 | Spark-specific invitation | Epic 1: Stories 1.5, 1.7–1.8, 1.10, 1.15, 1.17–1.19, 1.24; Epic 2: Stories 2.7–2.8; Epic 4: Stories 4.1–4.4; Epic 5: Story 5.3 | ✓ Covered |
| FR-8 | Public-site evidence only | Epic 1: Stories 1.16, 1.22, 1.24; Epic 2: Stories 2.1–2.5, 2.7–2.10 | ✓ Covered |
| FR-9 | One-Breadcrumb ceiling and domain ephemerality | Epic 2: Stories 2.5–2.10 | ✓ Covered |
| FR-10 | Interaction preservation | Epic 1: Stories 1.1, 1.15–1.16, 1.24; Epic 2: Stories 2.7, 2.9; Epic 5: Stories 5.1–5.2 | ✓ Covered |
| FR-11 | Cache-first committed-artifact reproducibility | Epic 1: Stories 1.14–1.15, 1.19–1.24; Epic 2: Stories 2.6–2.8, 2.10; Epic 3: Stories 3.1–3.2, 3.4 | ✓ Covered |

### Missing Requirements

No numbered PRD Functional Requirement is missing from the epics and stories document.

No extra FR identifier appears in the epics without a corresponding PRD FR. The epics use compact identifiers such as `FR1` while the PRD uses `FR-1`; this is a notation difference, not a traceability gap.

The epics introduce `NFR5: Reliability`, which is not numbered as an NFR in the PRD but accurately promotes PRD fail-closed and authoritative-commit constraints into an explicit cross-cutting requirement. This is not an extra functional requirement or a coverage defect.

### Coverage Statistics

- Total PRD FRs: 11
- FRs covered in epics: 11
- Missing PRD FRs: 0
- Extra epic FRs not in PRD: 0
- Coverage percentage: 100%

## UX Alignment Assessment

### UX Document Status

**Found.** The selected UX corpus is complete and final:

- `ux-designs/ux-oddspark-2026-08-17/DESIGN.md`
- `ux-designs/ux-oddspark-2026-08-17/EXPERIENCE.md`

The corpus explicitly binds the PRD, architecture spine, solution design, epics, current shell, and prior readiness assessment. It defines the visual system, eight-element result hierarchy, user journeys, responsive behavior, state/copy matrix, progressive enhancement, invitation handoff, WCAG 2.2 AA baseline, focus/announcement choreography, and manual acceptance checks.

### UX ↔ PRD Alignment

Alignment is strong across the principal product contract:

- UJ-1 and UJ-2 are reproduced as concrete local, domain, downgrade, house-Brief, invitation, and expiry flows.
- FR-5's eight result elements are mapped one-to-one and rendered in the required order.
- FR-6's preliminary estimate and qualitative-claim discipline are represented in the Change Level and copy rules.
- FR-7's Spark-specific, no-pressure invitation explicitly preserves “not worth changing.”
- FR-8 and FR-9 are reflected through backstage-only evidence, one visible Breadcrumb, omission of source/grounding data, no domain permalink, and one-hour domain JSON eligibility.
- FR-10's one-button/optional-domain interaction is preserved with no added mode switch, input, step, or progress control.
- Privacy, no-audit framing, no rejected-candidate leakage, and graceful non-error downgrade/house states are consistent.

### UX ↔ Architecture Alignment

The UX is materially supported by the architecture:

- AD-5's typed Brief is the sole field source for the eight-element render contract and `mode` is the sole rendering branch.
- AD-7 supports local permalink behavior, domain ephemerality, request-scope/effective-mode separation, expiry, unsupported-version behavior, and committed-artifact rendering.
- AD-8 and AD-10 support the two invitation postures, aggregate event semantics, fixed 303 destination, plain-link fallback, retention disclosure, and cross-origin data minimization.
- AD-9 supports the UX's bounded wait, invisible internal retries, house fallback, and no-hang expectation.
- Failure precedence supports the distinct 400, downgrade, house-Brief, and 502 states.
- The epics assign implementation and verification paths for the UX deltas, including the native form, accessibility, `/how`, renderer consistency, activation-aware copy, handoff, and expiry.

### Alignment Issues

#### UX-ALIGN-1 — Premature reproducibility claim in preserved idle copy

**Severity: Major**

The UX State Patterns and responsive-preservation list require the idle strike note:

> “One idea, seeded by the sun and a randomness beacon. Same window, same spark.”

The final sentence is a reproducibility promise. This conflicts directly with:

- PRD FR-11: UI copy contains no reproducibility/verifiability promise until production verification.
- Architecture AD-7: no reproducibility promise is added until cache-first behavior is verified in production.
- UX's own Voice and Tone rule banning any reproducibility/verifiability promise until the claim-proof ref is current.
- UX's non-claiming receipt posture, which intentionally states inputs without making a reproducibility promise.

**Impact:** Story 1.15's shell-preservation acceptance target and Story 3.4's claim-activation gate can demand contradictory output. Preserving the current sentence could expose an unverified public claim before Story 3.4; removing it could fail the UX preservation checklist as written.

**Required correction:** make the strike note activation-aware or replace its default with non-claiming copy. The phrase “Same window, same spark” must render only when the exact current `receipt_claim_ref` authorizes that wording, or be removed from the preserved default. Update the UX preservation criterion and relevant Story 1.15/3.4 acceptance criteria together so there is one copy authority.

### Warnings

- The UX records many assumptions as accepted defaults while retaining the `[ASSUMPTION]` labels. This is traceable through its Open Questions table and not presently an alignment failure, but implementation stories should bind the accepted table/version rather than treating those tags as unresolved design freedom.
- Progressive enhancement is a target delta, not current behavior. Readiness depends on the named implementation stories and no-JS/manual acceptance evidence; the UX documentation itself does not establish that the current shell already meets those requirements.

## Epic Quality Review

### Epic Structure Validation

| Epic | User-value outcome | Independence | Assessment |
| --- | --- | --- | --- |
| Epic 1 — A Coherent Brief From One Button | A visitor receives a committed, gate-passed local or house Brief from the preserved interaction | Stands alone as the local-mode product slice; later epics enhance but are not required for local operation | Pass |
| Epic 2 — Website-Grounded Sparks | A visitor submitting a domain receives a safely grounded Brief or honest downgrade | Uses Epic 1 outputs only; no dependency on Epics 3–5 | Pass |
| Epic 3 — Production Proof, Launch Gate, and Receipt Claim | The product owner can prove behavior and authorize only supportable public claims | Uses Epics 1–2; no forward dependency | Pass, operator-facing value |
| Epic 4 — Trustworthy Contact Handoff | A visitor can reach Hearn with a safe bounded reference when verified, or use a plain link otherwise | Uses prior Epic 1–2 contracts; does not depend on Epic 5 | Pass |
| Epic 5 — Post-Proof Hygiene, Retirement, and Owner Review | Mixes executable cleanup, destructive retirement, and an indefinite owner-review process | Uses only earlier epics, but lacks one cohesive standalone user outcome | Fail |

### Dependency Analysis

- No story declares a dependency on a higher-numbered story within its own epic.
- No epic requires a later-numbered epic to function.
- Cross-epic dependencies flow backward: Epic 2 uses Epic 1; Epic 3 uses Epics 1–2; Epic 4 uses established Epic 1–2 contracts; Epic 5 uses earlier production proof.
- Story 1.4's possible `NO-GO` blocks later activation without making the evidence story incomplete; this is a valid gated dependency, not a forward reference.
- Story 3.1 explicitly separates offline harness completion from the later authorized production run, avoiding a hidden live dependency.
- Story 4.3 correctly treats the Hearn receiver deployment as separately governed external input rather than an Oddspark deliverable.
- No up-front database/table epic exists. Coordinator receipt, metric, and retention changes are introduced where first needed in Stories 1.14, 1.21, 2.6, and 4.1.
- Architecture specifies a brownfield single-Worker project, not a starter template. Stories 1.1–1.2 appropriately establish characterization and toolchain/runtime baselines rather than recreating the application.

### Acceptance-Criteria Assessment

- All 45 stories use explicit Given/When/Then acceptance groups.
- Success, rejection, fail-closed behavior, authority boundaries, evidence retention, rollback, and offline-versus-live execution are generally concrete and testable.
- Broad predicates are bound to named closed oracles through the Execution and Authority Rules, avoiding open-ended phrases such as “all integrity checks.”
- Requirement traceability is present on every story and uses the same 11-FR inventory.

### Critical Violations

#### EPIC-QUALITY-1 — Epic 5 is a mixed technical/process container rather than one user-value epic

Epic 5 combines:

- Story 5.1: executable dead-code hygiene;
- Story 5.2: destructive legacy-seam retirement; and
- Story 5.3: ongoing owner review and requalification.

The first two are post-proof technical maintenance/retirement work. The third is a continuing product-governance process that explicitly begins before Stories 5.1–5.2 and is not blocked on them. They do not compose one independently valuable epic outcome, and the current title describes work categories rather than what one user can accomplish.

**Impact:** epic completion has no coherent meaning. The owner-review process can begin while the cleanup stories are pending, and it can continue indefinitely after both cleanup stories finish.

**Required correction:** separate the bounded retirement outcome from the recurring owner-review mechanism. Keep Stories 5.1–5.2 in a narrowly outcome-based retirement epic, and move Story 5.3 to an operational governance/runbook or a separately defined review epic with a bounded review-cycle outcome.

### Major Issues

#### STORY-QUALITY-1 — Story 5.3 has no terminal completion condition

Story 5.3 is explicitly an “ongoing process,” starts after first local production samples, expands after domain activation, and says insufficient organic cases remain incomplete. Its acceptance criteria define how each review/requalification should operate but do not define when the story itself is complete.

**Impact:** the story cannot reach a stable `done` state and therefore cannot participate honestly in sprint completion or epic readiness.

**Required correction:** convert it into a versioned operational runbook plus bounded recurring review records, or rewrite it as a finite story such as “establish and execute the first owner-review cycle” with a fixed sample/interval and durable output.

#### STORY-QUALITY-2 — Stories depend on a UX authority excluded from this assessment corpus

Stories 1.15, 1.16, 1.22, 4.1, and 4.2 explicitly cite `ux-decision-record-oddspark.md` and UX-DR1–UX-DR6. The epics overview says that compact record “governs” the new visitor-facing states, while the selected readiness corpus excluded it as a duplicate in favor of the backing `DESIGN.md` and `EXPERIENCE.md` spines.

**Impact:** the story acceptance contract points to an unvalidated governing artifact. Even if the backing spines contain equivalent detail, this assessment cannot establish that the exact UX-DR clauses cited by stories match them.

**Required correction:** classify `ux-decision-record-oddspark.md` as a governing companion rather than a duplicate and include it in the readiness corpus, or remove the story references and make the selected spines the sole UX authority. Do not leave two different documents claiming governance.

### Minor Concerns

- Functional-requirement identifiers use both `FR1` and `FR-1`. Traceability is currently unambiguous, but one notation would reduce mechanical comparison risk.
- Some release stories are deliberately broad: Story 1.24 combines preflight, writer deployment, atomic activation, domain-phase behavior, and rollback; Story 2.10 does the same for domain activation. Their ACs remain cohesive around one release event, but implementation planning should ensure each is executed as one governed slice rather than allowing partial completion to masquerade as story completion.

### Best-Practices Summary

- Epics with clear standalone value: 4 of 5
- Forward story dependencies: 0
- Forward epic dependencies: 0
- Stories with BDD acceptance groups: 45 of 45
- Stories lacking a terminal completion definition: 1
- Governing external/corpus references unresolved: 1 UX authority conflict affecting 5 stories

## Summary and Recommendations

### Overall Readiness Status

**NOT READY**

The planning corpus has complete numbered FR coverage and strong architecture, UX detail, dependency ordering, and acceptance-test specificity. Implementation should nevertheless not proceed from this revision as the authoritative Phase 4 plan because one critical epic-structure defect and three major contract/completion defects remain unresolved.

This status is a planning-readiness judgment only. It does not modify existing implementation evidence, authorize deployment, authorize live provider activity, or supersede any separate release or activation gate.

### Critical Issues Requiring Immediate Action

1. **EPIC-QUALITY-1 — Epic 5 lacks one coherent, independently valuable outcome.** It combines post-proof code cleanup/destructive retirement with an ongoing owner-review process that begins independently and never ends. Split bounded retirement from recurring governance.

### Major Issues Requiring Resolution

1. **UX-ALIGN-1 — The default idle copy makes a claim before its gate.** “Same window, same spark” conflicts with PRD FR-11, Architecture AD-7, and the UX claim-proof policy. Remove it from default copy or render it only under an exact current `receipt_claim_ref`.
2. **STORY-QUALITY-1 — Story 5.3 cannot reach a terminal state.** Replace the indefinite story with a runbook plus bounded review records, or define a finite first-review-cycle deliverable.
3. **STORY-QUALITY-2 — UX authority is unresolved.** Five stories cite the excluded `ux-decision-record-oddspark.md` as governing UX-DR1–UX-DR6. Either include and validate it as a companion authority or remove those citations and make `DESIGN.md`/`EXPERIENCE.md` solely authoritative.

### Recommended Next Steps

1. Resolve UX document authority first: treat the compact UX Decision Record as a governing companion if that remains the intended contract, then reconcile it byte-for-meaning with the two UX spines.
2. Correct the premature “Same window, same spark” default across the authoritative UX contract and Stories 1.15/3.4 so claim activation has one unambiguous owner.
3. Restructure Epic 5 into a bounded retirement epic and a separate recurring governance mechanism; rewrite Story 5.3 as a finite deliverable or remove it from sprint-story accounting.
4. Re-run implementation readiness against the corrected corpus. Preserve this report as the immutable pre-remediation assessment rather than overwriting it.
5. After a clean readiness result, make any provider qualification, deployment, quiet observation, public promotion, claim activation, reference activation, and destructive retirement decisions separately under their existing authority gates.

### Positive Findings to Preserve

- All 11 PRD FRs have explicit epic/story coverage: 100%, with no extra epic FR identifiers.
- All 45 stories use Given/When/Then acceptance groups and retain explicit requirement traceability.
- No forward story or epic dependency was found.
- The architecture and UX agree on the typed Brief contract, fail-closed pipeline, privacy boundary, bounded call ledger, domain ephemerality, aggregate-only measurement, progressive enhancement target, and activation separation apart from the one copy contradiction.
- Brownfield migration, compatibility-reader ordering, rollback, external Hearn ownership, live-run approval, and destructive-retirement authority are explicitly separated.

### Final Note

This assessment identified **four issues requiring remediation across three categories**: one critical epic-structure violation, one major UX/claim contradiction, and two major story/authority defects. Two additional advisory concerns cover accepted-assumption labeling and broad release-story sizing. Address the critical and major issues before treating this artifact set as implementation-ready.

**Assessment completed:** 2026-08-17 10:29 EDT  
**Assessor:** Codex, acting as BMAD implementation-readiness Product Manager
