---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
inputDocuments:
  - prds/prd-oddspark-2026-08-15/prd.md
  - architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md
  - epics.md
  - ux-decision-record-oddspark.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-17
**Project:** Oddspark
**Assessor:** OpenAI Codex, BMAD Implementation Readiness workflow

## Document Discovery

### PRD Files Found

**Whole Documents:**

- `prds/prd-oddspark-2026-08-15/prd.md` (26,361 bytes; modified 2026-08-17 08:26:20 EDT)

**Sharded Documents:** None.

### Architecture Files Found

**Whole Documents:**

- `architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md` (35,655 bytes; modified 2026-08-17 10:49:33 EDT)

**Sharded Documents:** None.

### Epics and Stories Files Found

**Whole Documents:**

- `epics.md` (65,808 bytes; modified 2026-08-17 10:49:23 EDT)

**Sharded Documents:** None.

### UX Design Files Found

**Whole Documents:**

- `ux-decision-record-oddspark.md` (33,032 bytes; modified 2026-08-17 10:49:23 EDT)

**Sharded Documents:** None.

### Discovery Issues

- No required document types are missing.
- No whole-versus-sharded duplicate formats were found.
- Older `oddspark-polls` artifacts were excluded because the user-selected UX decision record belongs to this central `oddspark` artifact set.

## PRD Analysis

### Functional Requirements

**FR-1: Coherent local generation**

Given no Domain, the system generates a Candidate grounded in Port Huron / Blue Water Area small-business context, current date/time, seasonality, and a Delivery-Envelope capability bundle. Realizes UJ-1.

Testable consequences:

- The Candidate references season-appropriate context consistent with the generation date.
- The Candidate's proposed capability falls inside the Delivery Envelope.
- Before production use, local grounding and retellability pass the versioned local-mode golden/anti-golden corpus and predeclared semantic threshold owned by Story 1.18.
- No random-axis vocabulary from the legacy generator (who/lens/form/friction lists) appears in output.

**FR-2: Website-grounded generation**

Given a Domain, the system assembles an Evidence Bundle from the public website and generates a Candidate from it plus general vertical knowledge. Realizes UJ-2.

Testable consequences:

- The Candidate is traceable to at least one signal in the Evidence Bundle.
- The rendered Brief contains exactly one Breadcrumb, and the Breadcrumb is specific and positive-or-neutral — never fault-finding, never a person's name or personal contact detail.
- The Candidate does not duplicate a capability the Evidence Bundle shows the site already has.
- The Candidate contains no business-specific facts absent from the Evidence Bundle; "general vertical knowledge" means trade-level patterns (how bakeries typically take orders), never facts about this business learned off-site or from model pretraining.

**FR-3: Gate evaluation**

The system evaluates every Candidate against gates 1–9 in `coherence-gates.md` (recognizable routine, constructive intervention, capability inventory, channel fit, proportionality, delivery fit, preservation, natural retelling, novel-but-imaginable).

Testable consequences:

- The representative contradiction set (existing scheduler, channel mismatch, undersized/oversized solution, unactionable criticism, non-digital advice) is rejected 100% of the time in testing.
- A malformed, incomplete, ambiguous, schema-invalid, candidate-unbound, or otherwise unqualified judge result rejects the Candidate and counts as a failed attempt. Repair, coercion, omission, and fallback interpretation can never turn it into a pass.
- A rejected Candidate leaves no visible trace in the UI.

**FR-4: Bounded regeneration**

On gate failure the system retries only while a complete generation-to-judge pair fits within the six-model-call strike ledger and the remaining wall-clock budget. Every model-based evidence, generation, and judge invocation consumes one call before invocation. If evidence consumes `E` model calls, the Candidate limit is `min(3, floor((6 - E) / 2))`: `E=0` permits at most three complete pairs; `E=1` permits at most two. Exhaustion or insufficient remaining time returns the curated house Brief rather than rendering a near-miss.

Testable consequences:

- No response renders a Candidate that failed a gate — including graceful fallbacks, which are themselves gate-passing Coherent Local Mode Briefs, never unvetted near-misses.
- No strike starts a partial generation-to-judge pair or exceeds six model calls; failed, timed-out, and invalid invocations still consume their reserved call.
- The visitor always receives either a gate-passing Brief or a graceful fallback — never a hang or an error wall.

**FR-5: Contract-complete rendering**

Every Brief renders all eight elements in the order defined in `result-card-contract.md`.

Testable consequences:

- Snapshot/structural tests confirm all eight elements present, in order, per render.
- Change Level always includes a preliminary time range plus workflow-step impact.
- What Stays the Same names preserved tools, decision authority, and untouched workflow steps (all three, where applicable).
- The Brief reads as a confident plan — no hypothetical framing ("you could maybe…"), no rhetorical questions posed to the owner.
- Before launch, a written voice rubric and at least 3 approved golden-reference Briefs per mode exist; sampled Briefs are reviewed against them. Banned registers — consultant-speak, pitch voice, audit framing, hype adjectives — are enumerated in that rubric. Owner: Justin.

**FR-6: Claim discipline**

Numeric claims about the business's outcomes appear only when grounded in real numbers found on the public site; otherwise all effects are qualitative. The Change Level time range is Hearn Systems' own preliminary estimate, not a business-outcome number, and is always labeled preliminary.

Testable consequences:

- In Coherent Local Mode, rendered Briefs contain no numeric ROI, percentages, or savings figures.
- In Website-Grounded Mode, every business-outcome number in the Brief is traceable to the public site.
- Qualitative effects name who is affected and what physically changes in their day, never bare mush such as "saves time" or "more time with customers."
- No price for Hearn Systems work appears anywhere in a Brief.

**FR-7: Spark-specific invitation**

The CTA ties the invitation to this exact Spark and its smallest useful version, offering a bounded feasibility conversation.

Testable consequences:

- The CTA references the Spark by name or content, not a generic "contact us."
- CTA copy contains no pricing, urgency/pressure language, or pitch register; it reads as an offer to think together in the plain voice defined by the voice rubric.
- CTA copy explicitly leaves room to conclude the idea is not worth changing — "say so if it is not worth changing" is the trust mechanism behind "no pitch attached."

**FR-8: Public-site evidence only**

Website evidence is limited to the submitted public website plus general vertical knowledge and current date/time.

Testable consequences:

- Submitted public-site responses may contain PII only in the ephemeral scan buffer needed to detect and exclude it. Detected PII is never retained, copied into the Evidence Bundle, sent to a model, used for personalization/generation, or rendered. Cookies, sessions, Google reviews, and off-site footprint data are neither fetched nor used.
- Server-side abuse-prevention rate limiting and short-lived KV caching are permitted as an explicit carve-out; they play no role in personalization, generation content, or cross-visit tracking of individuals.
- The scanner respects robots.txt; sites that disallow crawling fall back to Coherent Local Mode with the plain-language notice.
- Scan degradation (unreachable site, unclear purpose) falls back to Coherent Local Mode with a plain-language notice. Existing scan limits and warnings are assumed to carry over from the current worker.

**FR-9: One-breadcrumb ceiling**

At most one business-specific detail from the Evidence Bundle appears in the rendered Brief; the rest remains backstage.

Testable consequences:

- Rendered Briefs contain no capability inventory, audit list, or multi-item site findings.
- A Website-Grounded Brief is ephemeral to the session: no public permalink, shareable URL, or indexed page that persists a critique of a third-party business. KV caching for reproducibility is internal and does not mint public URLs for domain-mode Briefs.

**FR-10: Interaction preservation**

The UI keeps exactly one button and one optional Domain field; no new inputs or steps.

Testable consequences:

- UI diff shows no added form fields.
- Both modes trigger from the same single action.

**FR-11: Verifiability preservation (resolved: cache-first)**

Same window, same Spark — preserved through committed-artifact reproducibility, not model determinism. The first gate-passing Brief in a seed window (or per `(round, domain)` claim) is committed in the authoritative coordinator receipt; the existing KV pins are read projections, and all later requests in the window resolve the identical committed artifact. Domain-mode Briefs get no public permalink. UI copy makes no reproducibility promise until cache-first behavior is verified in production. Resolved by architecture AD-7.

Testable consequences:

- Two requests in the same seed window with identical inputs return the identical committed Brief.
- Website-grounded Briefs have no `/s/:id` permalink.
- UI copy contains no reproducibility/verifiability promise until production verification.

**Total FRs: 11.**

### Non-Functional Requirements

**NFR-1: Privacy.** Detected PII is discarded from the ephemeral scan buffer before evidence persistence or model use; no PII, cookies, sessions, reviews, or off-site research enters personalization, generation, or rendered output. Server-side abuse-prevention rate limiting and short-lived KV caching are an explicit, declared carve-out with no tracking role. Robots.txt is respected.

**NFR-2: Performance.** A strike completes within the architecture's hard `STRIKE_BUDGET_MS` wall-clock cap (AD-9) or degrades to the house Brief per FR-4; the existing 4s scan budget carries over, pending architecture measurement.

**NFR-3: Security.** Domain input remains validated and size-limited per existing worker guards, including request-body and URL limits and redirect caps.

**NFR-4: Cost.** FR-4's six-call ledger is the LLM cost cap per button press.

**Total NFRs: 4.**

### Additional Requirements

**Product and scope constraints:**

- Preserve the one-button, one-optional-domain interaction and remove the legacy independent random-axis composition strategy.
- Every shown result must be a gate-passing Opportunity Brief; bounded failure returns a curated, per-season, gate-passing local house Brief without a surfaced retry or error wall.
- The result card follows the normative eight-element contract in `result-card-contract.md`.
- Enterprises, multi-location organizations, audit/SEO-report seekers, and existing Hearn Systems clients mid-engagement are non-users for v1.
- English-only, stateless per-visit operation, no accounts, saved sparks, history, analytics dashboard, or CTA A/B testing are outside MVP.
- Public verifiability claims remain absent from UI copy until cache-first behavior is verified in production.

**Success and qualification requirements:**

- Gate integrity target: zero displayed Briefs failing a Coherence Gate in a weekly sample of 20 across both modes.
- Before production, Story 1.18 must pass predeclared semantic thresholds against versioned golden/anti-golden corpora for local grounding, retellability, Gate 3, and Gate 9.
- Before launch, Justin owns a written voice rubric and at least three approved golden-reference Briefs per mode.
- Invitation measurement is an approximate aggregate event rate, not a unique-person or per-render percentage.

**Assumptions and unresolved dependencies:**

- Existing scan limits, warning copy, drand/NOAA seed, KV caching, one-button voice, English-only operation, statelessness, and the 4s scan budget are carry-over assumptions.
- The exact judge provider/model, candidate-bound wire contract, lossless canonical adapter, and latency allocation remain unresolved pending AD-11 qualification; invalid or unqualified results fail closed within the call ledger.
- Justin owns the Gate-3 and Gate-9 corpus boundaries; production qualification is deferred to Story 1.18.

### PRD Completeness Assessment

The PRD supplies a coherent product boundary, 11 globally numbered FRs with testable consequences, four explicit cross-cutting NFRs, resolved architecture references for the major pipeline mechanics, measurable outcomes, non-goals, and an assumptions index. It is strong enough for traceability analysis. Remaining completeness risks are explicit rather than hidden: several normative details live in companion specification files, semantic judge qualification remains pending AD-11 and Story 1.18, and multiple inherited runtime limits remain assumptions that must be verified before production readiness.

## Epic Coverage Validation

### Epic FR Coverage Extracted

- FR1: Epic 1 — coherent local generation; additionally protected during governed-path verification and retirement in Epics 2 and 5.
- FR2: Epic 2 — website-grounded generation.
- FR3: Epic 1 — composite local/semantic Gate, structural qualification, and calibrated semantic judge; production review in Epic 3.
- FR4: Epic 1 — six-call complete-pair orchestration, qualified fallback roles, deadline, and house Brief.
- FR5: Epic 1 — contract-complete rendering; production review in Epic 3.
- FR6: Epic 1 — local structural claim discipline plus semantic judgment; domain enforcement in Epic 2; production review in Epic 3.
- FR7: Epic 1 — Spark-specific invitation rendering; Epic 4 — measured, reference-bearing Hearn handoff; production review in Epic 3.
- FR8: Epic 2 — public-site evidence only; local-only activation and honest downgrade seam in Epic 1.
- FR9: Epic 2 — one-Breadcrumb ceiling and domain ephemerality across every read path.
- FR10: Epic 1 — interaction preservation; governed-path verification and retirement safeguards in Epics 2 and 5.
- FR11: Epic 1 — authoritative COORD receipt, KV projections, retention, and local activation; Epic 2 — domain lifecycle and activation; Epic 3 — production proof before public receipt claims.

**Total PRD FRs claimed in epics: 11.**

### Coverage Matrix

| FR Number | PRD Requirement | Epic and story coverage | Status |
| --- | --- | --- | --- |
| FR1 | Coherent local generation | Epic 1: Stories 1.6, 1.9–1.11, 1.19, 1.24; Epic 2 Story 2.9; Epic 5 Story 5.2 | Covered |
| FR2 | Website-grounded generation | Epic 2: Stories 2.1–2.5 and 2.7–2.10 | Covered |
| FR3 | Gate evaluation | Epic 1: Stories 1.3–1.5, 1.7, 1.12, 1.17–1.19, 1.22, 1.24; Epic 2: Stories 2.7, 2.9–2.10; Epic 3 Story 3.5; Epic 5 Story 5.2 | Covered |
| FR4 | Bounded regeneration | Epic 1: Stories 1.8–1.9, 1.13, 1.19, 1.22; Epic 2: Stories 2.7–2.9; Epic 5 Story 5.2 | Covered |
| FR5 | Contract-complete rendering | Epic 1: Stories 1.5, 1.7–1.8, 1.10, 1.15, 1.17–1.19, 1.22, 1.24; Epic 2: Stories 2.7–2.8; Epic 3 Story 3.5 | Covered |
| FR6 | Claim discipline | Epic 1: Stories 1.5–1.8, 1.10, 1.12, 1.15, 1.17–1.19, 1.24; Epic 2: Stories 2.5, 2.7–2.8; Epic 3 Story 3.5 | Covered |
| FR7 | Spark-specific invitation | Epic 1: Stories 1.5, 1.7–1.8, 1.10, 1.15, 1.17–1.19, 1.24; Epic 3 Story 3.5; Epic 4 Stories 4.1–4.4 | Covered |
| FR8 | Public-site evidence only | Epic 1: Stories 1.16, 1.22, 1.24; Epic 2: Stories 2.1–2.5 and 2.7–2.10 | Covered |
| FR9 | One-Breadcrumb ceiling | Epic 2: Stories 2.5–2.10 | Covered |
| FR10 | Interaction preservation | Epic 1: Stories 1.1, 1.15–1.16, 1.24; Epic 2 Story 2.9; Epic 5 Stories 5.1–5.2 | Covered |
| FR11 | Verifiability preservation | Epic 1: Stories 1.14–1.15, 1.19–1.24; Epic 2: Stories 2.6–2.8 and 2.10; Epic 3: Stories 3.1–3.4 | Covered |

### Missing Requirements

No PRD functional requirement is absent from the epic coverage map or story-level `Requirements` declarations.

No functional requirement appears in the epics without a corresponding PRD FR. The epics add an architecture-derived NFR5 (reliability) and detailed implementation/authority requirements, but these are not orphan FRs.

### Coverage Statistics

- Total PRD FRs: 11
- FRs covered in epics: 11
- Missing FRs: 0
- Coverage: 100%

## UX Alignment Assessment

### UX Document Status

**Found:** `ux-decision-record-oddspark.md` is a final, governing UX companion with six decision records (UX-DR1–UX-DR6) and a closed D1–D24 shell-delta list. It explicitly preserves one button and one optional Domain field while defining the new result, accessibility, loading, state, responsive, and invitation behaviors.

### UX ↔ PRD Alignment

**Aligned areas:**

- UX-DR1 maps the typed Brief into the PRD FR-5 eight-element order and enforces FR-2/FR-9's single Breadcrumb and backstage-evidence boundary.
- UX-DR3 turns UJ-1/UJ-2 and FR-4's bounded completion into a visible loading/settle contract without exposing internal retries or near-miss Candidates.
- UX-DR4 covers successful local/domain results, scan downgrade, pre-activation downgrade, house Brief, invalid input, coordinator uncertainty, unsupported/expired artifacts, inactive receiver, and claim-gated receipt copy while keeping the shell available.
- UX-DR5 preserves FR-10's one-button/optional-domain shell, existing breakpoints, brand treatment, and responsive structure.
- UX-DR6 implements FR-7's Spark-specific, no-pressure invitation and maintains the privacy and retention boundaries around the opaque artifact reference.
- UX-DR2 adds a concrete WCAG 2.2 AA baseline, focus/announcement rules, contrast targets, reduced-motion behavior, target sizing, and acceptance checks. These refine the PRD's user-facing intent without adding product inputs or a new user journey.

**UX requirements added beyond the PRD:**

- Native no-JS form operation and content negotiation for `/api/spark`.
- Server-rendered local permalinks and `history.replaceState` parity.
- Exact focus, live-region, heading, contrast-token, motion-stop, target-size, and Mermaid accessibility mechanics.
- Exact visitor copy and rendering behavior for 400, 502, not-found, inactive receiver, retention, and receipt-claim states.

These additions are consistent with the PRD's preservation, accessibility, privacy, graceful-fallback, and claim-discipline intent, but they require explicit architectural accommodation where they cross transport/router boundaries.

### UX ↔ Architecture Alignment

**Aligned areas:**

- AD-5's typed Brief schema directly supports UX-DR1's field mapping, plain-text rendering, mode-only branch, and HTML/`asText`/JSON parity.
- AD-3 and AD-9 support UX-DR3's single bounded wait and ordinary house-Brief settle state; internal retries remain invisible.
- AD-4, AD-5, and AD-7 support the one-Breadcrumb limit, notices, downgrade behavior, domain ephemerality, local 30-day retention, domain one-hour retention, and no domain permalink.
- AD-7 and AD-11 support default non-claiming copy and atomic activation of stronger receipt wording only after evidence-bound approval.
- AD-8 and AD-10 support UX-DR6's inactive plain-link posture, active native POST/303 handoff, fixed destination, aggregate event measurement, opaque-id-only cross-origin transfer, and fail-closed receiver activation.
- The single Worker/page-renderer architecture can implement the responsive and accessibility requirements without a new platform component.

### Alignment Issues

1. **High — AD-6 forbids the UX record's shell and router changes.** AD-6 says the page shell and router stay as they are except the explicit AD-4, AD-7, and AD-8 carve-outs, and that no other shell edits occur without a new AD. The governing UX record authorizes D1–D24, including a native strike form, content-negotiated `/api/spark`, server-rendered permalinks, new landmarks/status/error regions, changed heading structure, token changes, and changed result-card interior. Those are not all presentation-only details and no architecture decision expressly carves them out. **Required reconciliation:** amend AD-6 (or add a new AD) to bind the governing UX record's closed D1–D24 delta set before implementation.

2. **High — the architecture's failure-precedence representation conflicts with the UX no-JS contract.** The architecture specifies invalid input and unrelated infrastructure failure as `400`/`502` JSON. UX-DR3.9 and UX-DR4 require content-negotiated HTML shell representations for browser form POSTs while retaining JSON for API/fetch requests. **Required reconciliation:** define representation/content-negotiation behavior in architecture while preserving status codes and terminal precedence.

3. **Medium — transport behavior is owned only by UX/story text.** Native POST, local `303 /s/:id`, domain/downgrade direct `200`, server-rendered `/s/:id`, and history replacement affect routing, caching, refresh semantics, and metrics. The architecture map currently defers only eight-element renderer layout to UX and does not describe these transport semantics. **Required reconciliation:** bind these mechanics in architecture or explicitly classify them as approved UX-controlled implementation seams with invariant tests.

4. **Low — requirement identifier drift.** UX-DR4 cites “NFR-6” for the no-error-wall principle, but the selected PRD defines only NFR-1 through NFR-4 and the epics add NFR5. The behavior itself aligns with UJ-1/UJ-2 and FR-4, but the trace identifier is stale. **Required reconciliation:** replace the NFR-6 citation with the current PRD journey/FR and architecture failure-precedence references.

### Warnings

- The UX record is marked final and says defaults are in force, but it still highlights A19 (native strike form), A7 (notice wording), and A14 (silent domain-share omission) for deliberate owner review. This does not make the record incomplete, but any override would change D1/D2 or visitor-copy acceptance criteria and should occur before those stories begin.
- Architecture and UX both depend on separately owned pre-launch content: the voice rubric, approved goldens/anti-goldens, and house Brief catalog. UX alignment does not make those deliverables complete.

## Epic Quality Review

### Epic Structure Validation

| Epic | User-value assessment | Independence assessment | Result |
| --- | --- | --- | --- |
| Epic 1 — A Coherent Brief From One Button | Ends in a visitor receiving a committed, gate-passed local Brief in production. The internal qualification sequence is technical but supports a clear visitor outcome. | Uses only pre-existing platform/spec inputs and internally ordered Story 1.x outputs. | Pass with sizing concerns |
| Epic 2 — Website-Grounded Sparks | Ends in a business owner receiving a safely grounded Brief or honest downgrade. | Builds on Epic 1 and its own earlier stories; no dependency on a later epic. | Pass |
| Epic 3 — Production Proof, Launch Gate, and Receipt Claim | Provides trustworthy production behavior and prevents unsupported public receipt claims; value is operator/trust oriented rather than a new interaction. | Builds on Epics 1–2, but contains a contradictory transitive dependency in Story 3.5. | Fail pending dependency repair |
| Epic 4 — Trustworthy Contact Handoff | Gives owners a safe path from a specific Spark to a bounded conversation. | Uses outputs from Epics 1–2 and its own earlier stories; no later-epic dependency. | Pass |
| Epic 5 — Post-Proof Hygiene and Legacy Retirement | Framed as dead-code cleanup and destructive seam retirement, not as a user outcome. | Correctly depends only on earlier epics. | Structural violation: technical epic |

### Critical Violations

1. **Story 3.5 contains a contradictory dependency claim.** It requires Story 3.2 PASS while stating “Story 2.10 is not required.” Story 3.2 explicitly depends on Story 2.10 and its acceptance criteria require domain production verification. Therefore Story 2.10 is transitively required, and the stated local-only first-review path cannot occur as written.

   **Impact:** The first owner-review cycle cannot run after local rollout as promised; it is blocked behind domain activation and domain production proof. This undermines Epic 3 sequencing and delays semantic feedback intended to occur during local-only production.

   **Recommendation:** Either split Story 3.2 into local and domain production-proof stories and make Story 3.5 depend only on the local PASS, or change Story 3.5 to acknowledge Story 2.10 as required and remove its local-only timing claim. The former matches the stated intent.

### Major Issues

1. **Epic 5 is a technical milestone rather than a user-value epic.** “Executable Dead-Code Hygiene” and “Destructive Legacy Seam Retirement” produce codebase cleanliness and reduced maintenance risk, but the epic goal does not state an observable user or operator capability delivered independently.

   **Recommendation:** Move these stories to a governed post-launch maintenance track, or recast the epic around the operator outcome of a single supportable and safely reversible production path. Preserve the separate destructive-retirement approval.

2. **Story 5.1 lacks a closed deletion oracle.** “Duplicate Worker files and legacy helpers” and “only proven-unreachable executable code” do not name an enumerated inventory, reachability evidence format, or verification command. For destructive cleanup, this leaves scope open to interpretation.

   **Recommendation:** Add a versioned inventory of exact files/symbols, inbound-reference evidence, retained rollback readers/evidence, and before/after test commands. Require the story to stop without deletion when any target is unproven.

3. **Story 1.24 is release-sized and combines multiple independently risky outcomes.** It deploys the writer, atomically activates local mode, governs pre-domain requests, proves legacy unreachability, and defines rollback behavior. Each carries distinct verification and authority boundaries.

   **Recommendation:** Keep one story only if its story file has explicit gated tasks and separate evidence for deploy, activation, domain-phase behavior, and rollback. Otherwise split writer deployment from activation, preserving “activation manifest written last.”

4. **Story 3.3 has an externally paced completion condition.** It requires at least 100 organic authoritative serves while forbidding synthetic traffic and correctly allows slow accumulation to remain incomplete. This is a legitimate production gate but not a predictably completable sprint-sized story.

   **Recommendation:** Model it as an operational gate/checkpoint with an observation record rather than estimating it as a normal implementation story. Do not weaken or manufacture the sample.

### Minor Concerns

1. **Story 3.3 has an incomplete acceptance-criteria sentence.** “Then COORD baseline totals, deployed identity, catalog, exact HTTP interval, query/config hashes, and policy freeze” lacks a predicate. Replace it with an explicit result such as “are frozen and recorded.”

2. **Several technical-enabler stories express developer/operator value only.** Stories 1.2–1.4, 1.7, 1.10–1.14, 1.17–1.20, 1.23, 2.2–2.3, 2.7–2.8, 3.1–3.4, and 5.1–5.2 are acceptable in a brownfield, evidence-gated delivery plan, but their value depends on their parent epic outcome. Status reporting should not treat completion of an offline or evidence slice as delivered visitor value.

3. **Broad external-oracle wording must remain hash-bound.** Phrases such as “every behavior,” “every applicable gate,” and “every predicate” are testable only where the cited preservation inventory, Story 1.3 closed predicate list, Story 1.20 release-decision view, or Story 3.1 harness schema is immutable and version-bound. The execution rules say this, but individual story artifacts must preserve the exact reference.

### Dependency Analysis

- No story has a direct dependency on a higher-numbered story within its own epic.
- Epics 1, 2, 4, and 5 contain backward-only dependency chains.
- Epic 3's direct dependencies are backward-only, but Story 3.5's explicit denial of the transitive Story 2.10 dependency is internally inconsistent and must be repaired.
- The Hearn receiver work is correctly treated as a separately governed external dependency and an input to Story 4.3, not as work silently assigned to the Oddspark epic.
- Live provider runs, deployment, quiet observation, claim activation, receiver activation, and destructive retirement retain separate approval boundaries.

### Brownfield and Persistence Checks

- Brownfield integration is explicitly addressed through shell characterization, a compatibility reader, reader-first rollout, authoritative COORD commit, versioned artifacts, rollback, legacy quarantine, and delayed destructive retirement.
- Persistence changes are introduced when first needed: authoritative receipts/metrics in Story 1.14, local retention in Story 1.21, and domain retention in Story 2.6. No up-front “create all tables” story was found.
- No starter-template requirement applies; this is an existing Cloudflare Worker.

### Best-Practices Summary

- Functional traceability: pass, 11/11 FRs.
- Direct forward dependencies: pass.
- Transitive dependency consistency: fail, Story 3.5.
- Epic user-value framing: fail, Epic 5.
- Acceptance-criteria specificity: mostly strong; destructive scope and one malformed criterion require repair.
- Brownfield migration safety: strong.
- Story sizing: generally bounded, with Story 1.24 and operational Story 3.3 requiring special handling.

## Summary and Recommendations

### Overall Readiness Status

**NOT READY**

The planning set has complete functional traceability and strong brownfield safety, but implementation should not begin from the current artifacts because architecture, UX, and epic sequencing disagree on behavior that would materially affect the router, page shell, error representations, and the timing of owner review.

### Critical Issues Requiring Immediate Action

1. **Architecture must authorize or reject the UX delta set.** AD-6 currently forbids shell/router edits outside three named carve-outs, while UX D1–D24 authorizes substantial shell and transport changes. Amend AD-6 or add an explicit architecture decision binding the closed UX delta set.
2. **The 400/502 representation contract must be reconciled.** Architecture specifies JSON terminal outcomes; UX requires content-negotiated shell HTML for native form requests while retaining JSON for API/fetch requests. Define both representations and their cache, focus, refresh, and metrics semantics in architecture.
3. **Story 3.5's dependency chain must be repaired.** It cannot both depend on Story 3.2 PASS and state that Story 2.10 is unnecessary, because Story 3.2 requires Story 2.10. Split local and domain production proof or accept the domain dependency explicitly.

### Recommended Next Steps

1. Run architecture correction first: bind UX D1–D24, content negotiation, server-rendered permalink behavior, and error representations without weakening AD-6's preservation boundary.
2. Reconcile the UX record against the corrected architecture; remove the stale NFR-6 trace and resolve or explicitly retain the A19/A7/A14 defaults.
3. Correct Epic 3 sequencing so the first local owner-review cycle has a truthful dependency path.
4. Move Epic 5 to a governed maintenance track or restate its operator outcome, and add a closed, versioned deletion oracle before any destructive story is eligible.
5. Decide whether Story 1.24 remains one gated release story or splits into writer deployment and atomic activation; preserve separate authority and evidence for deployment, activation, rollback, and domain-phase behavior.
6. Treat Story 3.3 as an operational observation gate, repair its malformed acceptance-criteria sentence, and keep the 100-organic-serve threshold intact.
7. Re-run implementation readiness after the PRD, architecture, UX record, and epics share the same hashes and dependency graph.

### Final Note

This assessment identified 12 documented issues across UX/architecture alignment and epic quality: three implementation-blocking contradictions, five major/medium structural concerns, and four low/minor traceability or wording concerns. Functional coverage is complete at 11/11 FRs, so the needed work is reconciliation rather than feature expansion. Address the blocking contradictions before Phase 4 implementation; green offline tests or completed evidence slices would not override these planning defects.
