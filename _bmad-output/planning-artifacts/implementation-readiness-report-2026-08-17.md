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
    - prds/prd-oddspark-2026-08-15/prd.md
    - prds/prd-oddspark-2026-08-15/addendum.md
  architecture:
    - architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md
    - architecture/architecture-oddspark-2026-08-15/solution-design.md
  epics:
    - epics.md
  ux: []
  supporting:
    - sprint-change-proposal-2026-08-16.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-17
**Project:** Github

## Document Inventory

### PRD

- `prds/prd-oddspark-2026-08-15/prd.md`
- `prds/prd-oddspark-2026-08-15/addendum.md`

### Architecture

- `architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md`
- `architecture/architecture-oddspark-2026-08-15/solution-design.md`

### Epics and Stories

- `epics.md`

### UX Design

- No dedicated UX artifact found.

### Supporting Course-Correction Context

- `sprint-change-proposal-2026-08-16.md`

### Discovery Notes

- No conflicting whole-versus-sharded document duplicates were found.
- No `index.md`-based sharded document sets were found.
- Review and reconciliation files remain supporting evidence rather than primary specifications.

## PRD Analysis

### Functional Requirements

**FR-1: Coherent local generation.** Given no Domain, the system generates a Candidate grounded in Port Huron / Blue Water Area small-business context, current date/time, seasonality, and a Delivery-Envelope capability bundle.

**FR-2: Website-grounded generation.** Given a Domain, the system assembles an Evidence Bundle from the public website and generates a Candidate from it plus general vertical knowledge.

**FR-3: Gate evaluation.** The system evaluates every Candidate against gates 1–9 in `coherence-gates.md`: recognizable routine, constructive intervention, capability inventory, channel fit, proportionality, delivery fit, preservation, natural retelling, and novel-but-imaginable.

**FR-4: Bounded regeneration.** On gate failure the system retries only while a complete generation-to-judge pair fits within the six-model-call strike ledger and remaining wall-clock budget. Every model-based evidence, generation, and judge invocation consumes one call before invocation. If evidence consumes `E` model calls, the Candidate limit is `min(3, floor((6 - E) / 2))`: `E=0` permits at most three complete pairs and `E=1` permits at most two. Exhaustion or insufficient remaining time returns the curated house Brief rather than rendering a near-miss.

**FR-5: Contract-complete rendering.** Every Brief renders all eight elements in the order defined in `result-card-contract.md`: Spark title, The Plan, Why It Fits, What Gets Better, Before/After, Change Level, What Stays the Same, and the implementation invitation.

**FR-6: Claim discipline.** Numeric claims about the business's outcomes appear only when grounded in real numbers found on the public site; otherwise all effects are qualitative. The Change Level time range is Hearn Systems' own preliminary estimate, not a business-outcome number, and is always labeled preliminary.

**FR-7: Spark-specific invitation.** The CTA ties the invitation to the exact Spark and its smallest useful version, offering a bounded feasibility conversation.

**FR-8: Public-site evidence only.** Website evidence is limited to the submitted public website plus general vertical knowledge and current date/time.

**FR-9: One-breadcrumb ceiling.** At most one business-specific detail from the Evidence Bundle appears in the rendered Brief; the rest remains backstage.

**FR-10: Interaction preservation.** The UI keeps exactly one button and one optional Domain field, with no new inputs or steps.

**FR-11: Verifiability preservation (cache-first).** Same window, same Spark is preserved through committed-artifact reproducibility, not model determinism. The first gate-passing Brief in a seed window, or per `(round, domain)` claim, is committed in the authoritative coordinator receipt; existing KV pins are read projections, and later requests in the window resolve the identical committed artifact. Domain-mode Briefs get no public permalink. UI copy makes no reproducibility promise until cache-first behavior is verified in production.

**Total FRs: 11**

### Non-Functional Requirements

**NFR-1: Privacy and data minimization.** Detected PII is discarded from the ephemeral scan buffer before evidence persistence or model use. No PII, cookies, sessions, reviews, or off-site research enters personalization, generation, or rendered output. Server-side abuse-prevention rate limiting and short-lived KV caching are an explicit carve-out with no tracking role. Robots.txt is respected.

**NFR-2: Strike performance and graceful degradation.** A strike completes within the architecture's hard `STRIKE_BUDGET_MS` wall-clock cap or degrades to the house Brief under FR-4. The existing four-second scan budget carries over until architecture measurement revisits it.

**NFR-3: Input and scanner security.** Domain input remains validated and size-limited under the existing worker guards, including request-body and URL limits and redirect caps.

**NFR-4: Per-strike cost ceiling.** The six-call model ledger defined by FR-4 is the LLM cost cap for each button press; failed, invalid, and timed-out invocations still consume their reserved call.

**NFR-5: Accessibility and interaction simplicity.** The existing one-button, one-optional-domain interaction is preserved with no added form fields, steps, accounts, or saved-history workflow.

**NFR-6: Reliability and fail-closed behavior.** Every visitor receives either a gate-passing Brief or a curated gate-passing house Brief, never a failed Candidate, hang, near-miss, surfaced retry state, or error wall. Malformed, incomplete, ambiguous, schema-invalid, candidate-unbound, or otherwise unqualified judge results reject the Candidate.

**NFR-7: Reproducibility and artifact retention.** Identical inputs within the same seed window resolve the identical authoritative committed artifact. Local public artifacts and receipts expire exactly 30 days after commit. Domain-scoped artifacts expire exactly one hour after authoritative commit and have no public permalink.

**NFR-8: Claim integrity and tone quality.** Local-mode Briefs contain no numeric ROI, percentages, or savings figures; website-grounded business-outcome numbers must be traceable to the submitted public site. No Brief contains Hearn Systems pricing, unsupported precision, pressure language, audit framing, consultant-speak, or hype register.

**NFR-9: Launch quality threshold.** Before production, local grounding and retellability must pass the versioned golden/anti-golden corpus and predeclared semantic threshold owned by Story 1.18. A written voice rubric and at least three approved golden-reference Briefs per mode must exist before launch.

**NFR-10: Production launch fallback threshold.** After at least 100 authoritative production `briefs_served` events, public launch requires `house_briefs_served * 100 < briefs_served * 10`. Complete same-interval platform HTTP outcome coverage is separately required; unexplained 5xx responses or incomplete coverage block overall PASS pending reliability review.

**Total NFRs: 10**

### Additional Requirements

- Candidate output must use no legacy random-axis vocabulary from the `who`, `lens`, `form`, or `friction` lists.
- Website-grounded output must be traceable to at least one Evidence Bundle signal, must not duplicate an already-detected capability, and must contain no business-specific fact absent from the Evidence Bundle.
- The representative contradiction set must be rejected 100% in testing, and rejected Candidates must leave no visible UI trace.
- The gate is a hard composite stage: deterministic and privacy-policy validation precedes a separate candidate-bound semantic judge whose canonical verdict covers all nine gates, tone, and claims.
- Only complete generation-to-judge pairs may start. No strike may exceed six model calls.
- Change Level must contain a preliminary time range and workflow-step impact. What Stays the Same must name preserved tools, decision authority, and untouched workflow steps where applicable.
- Qualitative effects must name who is affected and what physically changes; generic claims such as “saves time” are insufficient.
- CTA copy must reference the specific Spark, contain no price or urgency, explicitly permit concluding that the idea is not worth changing, and use the approved plain voice.
- Website scanning may use only the submitted public site. Cookies, sessions, Google reviews, and off-site footprint sources must not be fetched or used. Scan failure, robots exclusion, or insufficient clarity downgrades before generation to local mode with a plain-language notice.
- The minimum website-evidence threshold is `clarity=clear`, at least one substring-verified observation, and a non-empty detected-capabilities list.
- A rendered Website-Grounded Brief may contain exactly one positive-or-neutral Breadcrumb and no capability inventory, audit list, multi-item findings, person's name, or personal contact detail.
- Public verifiability claims remain out of UI copy until production verification; domain-mode Briefs have no `/s/:id` permalink.
- Aggregate measurement is owned atomically by COORD through `briefs_served`, `house_briefs_served`, and `invitation_acted`, with KV report snapshots and `POST /api/cheer`. Failed 400/502 responses do not enter the served denominator, and metrics are not unique-person or unique-render rates.
- Production consumes one atomically written, closed canonical activation manifest binding deployed source identity and all applicable qualification, request, catalog, Hearn receiver, and receipt-claim references. Partial manifests reject.
- Stronger receipt/reproducibility copy renders only when its exact approved claim-proof reference is current; otherwise non-claiming copy remains.
- Invalid activation configuration disables model, claim, and reference features without crashing the shell.
- With an exact active `HearnReceiverManifest`, accepted `POST /api/cheer` returns `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>` and only the opaque artifact id crosses origins. Without a current receiver reference, Oddspark uses the fixed plain contact link, sends no reference, and records no invitation event.
- v1 is English-only, stateless per visit, and excludes accounts, saved sparks, history, dashboards, and CTA A/B testing.

### PRD Completeness Assessment

The PRD provides a clearly numbered set of 11 functional requirements, explicit testable consequences, cross-cutting guardrails, resolved architecture decisions, and bounded fallback behavior. The addendum supplies retention, activation, launch, measurement, and receiver constraints that materially affect implementation traceability.

Completeness risks remain: the PRD delegates normative details to companion specification files such as `coherence-gates.md`, `result-card-contract.md`, and mode definitions that were not part of the confirmed primary inventory; semantic qualification for the judge provider/model and the Gate-3/Gate-9 corpus thresholds remains explicitly deferred; the four-second scan budget is still an assumption pending measurement; and no dedicated UX artifact exists for validating interaction, voice, fallback notice, and accessibility details.

## Epic Coverage Validation

### Epic FR Coverage Extracted

- FR1: Epic 1 — coherent local generation; supporting implementation in Stories 1.6, 1.9–1.11, and 1.19; governed-path and retirement coverage in Stories 2.9, 3.6, and 3.12.
- FR2: Epic 2 — website-grounded generation; Stories 2.1–2.5 and 2.7–2.8; production activation in Story 3.6.
- FR3: Epic 1 — composite local/semantic Gate, structural qualification, and calibrated semantic judge; Stories 1.3–1.5, 1.7, 1.12, and 1.17–1.19, with integration/operations coverage in Stories 2.7–2.9, 3.2, 3.6, 3.12, and 3.13.
- FR4: Epic 1 — six-call complete-pair orchestration, deadline, role fallback, and house Brief; Stories 1.8–1.9 and 1.13, with shared-path coverage in Stories 2.7, 2.9, 3.2, 3.6, and 3.12.
- FR5: Epic 1 — contract-complete rendering; Stories 1.5, 1.7–1.8, 1.10, 1.15, and 1.17–1.19, with domain and operational coverage in Stories 2.7–2.8, 3.2, 3.6, and 3.13.
- FR6: Epic 1 and Epic 2 — local and website claim discipline; Stories 1.5–1.8, 1.10, 1.12, 1.15, and 1.17–1.19 plus Stories 2.5, 2.7–2.8, 3.6, and 3.13.
- FR7: Epics 1 and 3 — Spark-specific invitation and governed Hearn handoff; Stories 1.5, 1.7–1.8, 1.10, 1.15, and 1.17–1.19 plus Stories 3.1, 3.4–3.6, 3.11, and 3.13.
- FR8: Epic 2 — public-site evidence boundary; Stories 1.16, 2.1–2.5, and 2.7–2.9, with disclosure and activation coverage in Stories 3.2 and 3.6.
- FR9: Epics 2 and 3 — one-Breadcrumb ceiling and domain ephemerality; Stories 2.5–2.9 and Stories 3.3 and 3.6.
- FR10: Epic 1 — preserved interaction; Stories 1.1, 1.15–1.16, 2.7, 2.9, 3.6, and 3.12.
- FR11: Epics 1 and 3 — authoritative COORD receipts and projections, plus production proof before public claims; Stories 1.14–1.15 and 1.19–1.20, Stories 2.6–2.8, and Stories 3.2–3.3 and 3.6–3.10.

**Total FRs represented in epics: 11**

### Coverage Matrix

| FR | PRD Requirement | Epic and Story Coverage | Status |
| --- | --- | --- | --- |
| FR1 | Coherent local generation | Epic 1; Stories 1.6, 1.9–1.11, 1.19; governed lifecycle in 2.9, 3.6, 3.12 | Covered |
| FR2 | Website-grounded generation | Epic 2; Stories 2.1–2.5, 2.7–2.8; activation in 3.6 | Covered |
| FR3 | Nine-gate composite evaluation | Epic 1; Stories 1.3–1.5, 1.7, 1.12, 1.17–1.19; downstream operational stories | Covered |
| FR4 | Six-call bounded regeneration and house fallback | Epic 1; Stories 1.8–1.9, 1.13; shared-path and retirement stories | Covered |
| FR5 | Eight-element contract-complete rendering | Epic 1; Stories 1.5, 1.7–1.8, 1.10, 1.15, 1.17–1.19; domain/operational stories | Covered |
| FR6 | Numeric and qualitative claim discipline | Epics 1–2; local contract/gate/render stories and Stories 2.5, 2.7–2.8 | Covered |
| FR7 | Spark-specific bounded invitation | Epics 1 and 3; rendering, measurement, sender, receiver, activation, and owner-review stories | Covered |
| FR8 | Public-site-only evidence and privacy boundary | Epic 2; Stories 1.16, 2.1–2.5, 2.7–2.9; production disclosure/activation | Covered |
| FR9 | One-Breadcrumb ceiling and domain ephemerality | Epics 2–3; Stories 2.5–2.9, 3.3, 3.6 | Covered |
| FR10 | One-button and optional-domain interaction | Epic 1; Stories 1.1, 1.15–1.16, 2.7, 2.9, 3.6, 3.12 | Covered |
| FR11 | Cache-first authoritative reproducibility | Epics 1 and 3; receipt, lifecycle, qualification, rollout, verification, and claim-activation stories | Covered |

### Missing Requirements

No PRD functional requirements are missing from the epics and stories document. No functional requirements are claimed by the epics document that are absent from the PRD's FR1–FR11 set.

### Coverage Statistics

- Total PRD FRs: 11
- FRs covered in epics: 11
- Missing FRs: 0
- Coverage: 100%

## UX Alignment Assessment

### UX Document Status

**Not found.** No whole UX document or `index.md`-based UX package exists in the planning artifacts.

UX is nevertheless directly implied and material. Oddspark is a public user-facing web application whose PRD defines two user journeys, a one-button/optional-domain interaction, an eight-element result card, degradation notices, invitation behavior, preserved page behavior, “within seconds” expectations, and a requirement to avoid visible retries, hangs, near-misses, and error walls.

### PRD and Architecture Alignment

The architecture supports several implied UX contracts:

- It preserves the existing button, optional domain field, page, and shared action.
- A single typed Brief schema feeds HTML, plain-text, and JSON rendering, reducing cross-renderer drift.
- Gate failures remain backstage, while deadline or qualification failure selects a curated house Brief.
- Domain insufficiency produces an honest local downgrade with a notice.
- Domain artifacts cannot become public permalinks, and receipt claims remain hidden until supported by current production proof.
- Invitation rendering has explicit plain-link and reference-bearing states.

The epic plan also carries UX-adjacent acceptance criteria: consistent field order and escaping, notice behavior, invitation behavior, accessible output, accessible Mermaid metadata and fallback text, preservation of the one-button form, and fixed retention disclosures.

### Alignment Issues

- The planning set has no authoritative UX contract defining the visual hierarchy and presentation of the eight required Brief elements.
- “Accessibility” appears in story acceptance criteria but has no specified standard, keyboard/focus behavior, screen-reader semantics, contrast target, or acceptance-test baseline.
- The PRD promises a result “within seconds,” while architecture defines a hard deadline but no user-facing loading, delayed-response, timeout, retry-suppression, or focus-announcement behavior.
- Downgrade, house-Brief, invalid-input, COORD-502, unsupported-version, inactive-receiver, and non-claiming receipt states have architectural behavior but no consolidated copy/state matrix.
- Responsive/mobile behavior and preservation criteria for the existing page are not documented beyond “keep the exact interaction.”
- The invitation’s native POST/303 path and plain-link fallback lack a UX-level interaction contract covering progressive enhancement, failed submission, focus restoration, and external-navigation expectations.

### Warnings

⚠️ **UX documentation is missing despite substantial user-facing behavior.** Treating FR10 as proof that “no UX is needed” is insufficient: the workflow remains simple, but the result card, fallback notices, accessibility, latency states, claim copy, retention disclosure, and contact handoff all introduce UX decisions.

Before implementation reaches visitor-facing rendering and integration stories, create either a focused UX specification or an explicit UX decision record covering the above states. It does not need to redesign the preserved shell; it needs to make the preserved and newly introduced interaction states testable.

## Epic Quality Review

### Epic Structure

**Epic 1 — A Coherent Brief From One Button** has a user-centered title and outcome, but its 20-story scope mixes owner content, contracts, toolchain work, multiple live qualification programs, orchestration, persistence, rendering, security, and activation design. It does not actually deliver a production-usable local Brief within the epic because production rollout occurs in Epic 3 Story 3.6.

**Epic 2 — Website-Grounded Sparks** has a clear visitor outcome and depends only on Epic 1 outputs inside its own stated story graph. However, its production availability also depends on Epic 3 Story 3.6, so it is not independently usable when Epic 2 completes.

**Epic 3 — Launch Readiness, Contact, and Measurement** is primarily a release/operations program rather than one coherent user-value epic. It combines measurement, explanatory content, storage cleanup, a cross-repository contact integration, deployment, production proof, quiet observation, claim activation, handoff activation, destructive retirement, and ongoing owner review.

### Critical Violations

1. **Epic 1 is not independently deliverable.** Its stated outcome is that one press produces a committed gate-passed local Brief, but its final story only defines the activation contract and decision view. Actual production rollout is deferred to Epic 3 Story 3.6, which itself requires Epic 2 completion. This creates a forward epic dependency: Epic 1's promised user outcome requires Epics 2 and 3.
   - **Remediation:** Either add a local-only deploy/activation slice to Epic 1, or rewrite Epic 1's goal as a non-user-facing qualification milestone and reorganize the epics around deployable vertical slices. The former better satisfies the workflow standard.

2. **Epic 2 is not independently deliverable.** Domain scanning, grounding, lifecycle, integration, and full-request qualification finish in Epic 2, but production enablement is again deferred to Epic 3 Story 3.6.
   - **Remediation:** Give Epic 2 its own domain activation/release story using the already established compatible reader and atomic-manifest mechanism, leaving only public promotion and optional claim/handoff activation to a later epic.

3. **Epic 3 is a technical and operational omnibus.** Its title and goal describe launch machinery, and its stories span several separable outcomes. Users cannot benefit from “launch readiness” as a standalone capability, while measurement, contact handoff, public explanation, cleanup, deployment proof, and destructive retirement have distinct owners and release boundaries.
   - **Remediation:** Split it into coherent outcomes, for example: production-safe release and proof; trustworthy contact handoff; privacy-safe measurement and observation; and post-proof retirement. Each resulting epic should state the visitor or operator outcome it independently delivers.

### Major Issues

1. **Several stories are too large for independent completion.** Story 2.7 covers shared pipeline integration, retry accounting, request-scope isolation, commit behavior, and byte-identical cross-mode activation identity across most FRs and all NFRs. Story 3.6 combines preflight, reader-first deployment, atomic activation, and rollback. Story 3.3 combines record-retention design, cleanup/projection repair, and dead-code removal.
   - **Remediation:** Split each at independently testable state transitions. In particular, separate compatibility-reader deployment from writer/manifest activation, and separate persistence lifecycle from executable dead-code hygiene.

2. **Cross-repository Story 3.5 is not independently completable in this project.** It explicitly requires separate authority and changes to the Hearn Systems repository. That authority boundary is correct, but embedding the external implementation as a normal Oddspark story makes completion dependent on work outside this project's control.
   - **Remediation:** Treat the receiver implementation as an external dependency with its own governed story in the Hearn repository. Keep only Oddspark's receiver-contract fixture, manifest verification, and plain-link fallback here.

3. **Many dependency declarations are non-specific.** Stories 1.2, 1.3, 1.5–1.10, 1.14–1.16, 2.1–2.2, 2.4, and 3.2 say only that “all required inputs are produced by earlier stories.” This avoids a literal forward reference but does not establish which artifacts are prerequisites or whether the ordering is sufficient.
   - **Remediation:** Replace each generic dependency with exact story IDs or explicitly state “none” plus named external artifacts/authorities.

4. **Some acceptance criteria defer their test oracle.** Examples include “all preserved behavior is covered” (1.1), “every integrity predicate” (1.4 and later qualification stories), “as specified” normalization outcomes, and broad preflight lists that merely “pass” (3.6). These may be testable through referenced contracts, but the story does not identify the closed checklist or evidence schema that supplies the oracle.
   - **Remediation:** Bind each broad criterion to a versioned contract, fixture set, manifest schema, or enumerated predicate list with a stable path/hash.

5. **Epic 1's 20-story chain delays user value excessively.** Most early stories are owner, developer, test-architect, or operator enablers. This may reflect the genuine safety requirements, but the epic is closer to a program than a normal increment.
   - **Remediation:** Group stories into smaller deployable slices with explicit safe disabled states, while preserving the existing authority gates and immutable evidence rules.

### Minor Concerns

1. **Requirement ranges reduce audit clarity.** Entries such as `FR2–FR6; FR8–FR11; NFR1–NFR5` make traceability compact but obscure which acceptance criterion proves which requirement.
   - **Remediation:** Add an AC-to-requirement cross-reference for broad integration and rollout stories.

2. **Owner-review Story 3.13 is positioned after destructive retirement.** Its content describes ongoing weekly review and requalification, which begins before or during quiet production rather than only after all prior stories complete.
   - **Remediation:** Model it as an ongoing operational process triggered after first production sampling, or move initial review earlier and retain governed requalification as a later follow-up.

3. **No explicit UX design requirements are traced.** The epics state that none exist because interaction is preserved, yet multiple stories add notices, result states, disclosures, invitation paths, and accessible explanatory content.
   - **Remediation:** Add UX decision requirements and trace them to rendering, downgrade, `/how`, and contact-handoff stories.

### Checks Passed

- All 42 stories use an `As a / I want / So that` structure and Given/When/Then acceptance criteria.
- No story explicitly names a later-numbered story as its prerequisite.
- Within-epic explicit story dependencies point backward, and cross-epic dependencies point to earlier epics.
- Data/storage changes are attached to the stories that first need their corresponding receipts, metrics, or lifecycle behavior; there is no upfront “create every table” story.
- This is a brownfield single-file Worker change at existing `buildSpark`/`buildDomainSpark` call sites. The architecture does not prescribe a starter template, so an initial scaffold story is not required.
- FR traceability is maintained across every epic and story group.

## Summary and Recommendations

### Overall Readiness Status

**NOT READY**

The requirements themselves are unusually thorough, and functional traceability is complete at 11 of 11 FRs. The implementation plan is not ready to govern Phase 4 as written, however, because its epic boundaries violate independent-delivery rules: Epic 1 and Epic 2 require the later rollout epic to deliver their promised user outcomes, while Epic 3 combines multiple distinct operational and product outcomes. A user-facing UX contract is also absent despite substantial new rendering, fallback, disclosure, accessibility, latency, and contact states.

This status assesses planning readiness only. It does not invalidate completed implementation evidence or authorize changes to current story, branch, deployment, or release state.

### Critical Issues Requiring Immediate Action

1. **Restore independently deliverable epic boundaries.** Epic 1 needs a local-only production activation/release slice. Epic 2 needs a domain activation/release slice that depends only on Epic 1 and Epic 2 outputs. Do not require Epic 3 to realize either earlier epic's promised visitor outcome.
2. **Decompose Epic 3.** Separate production release/proof, contact handoff, aggregate measurement/observation, and post-proof cleanup/retirement into coherent outcome-based units with their own authority gates.
3. **Create an authoritative UX decision artifact.** Define the eight-element card hierarchy, accessibility baseline, loading/degradation behavior, state/copy matrix, responsive preservation criteria, and contact navigation/failure behavior. Trace those decisions into the affected stories.

### Recommended Next Steps

1. Run a focused course correction on `epics.md` that preserves FR1–FR11, all hash-bound qualification and authority gates, and the existing legacy crosswalk while changing only epic/story boundaries and dependencies.
2. Add a compact UX specification or UX decision record for the preserved shell and new states; avoid redesigning the one-button experience.
3. Split Stories 2.7, 3.3, and 3.6 at independently testable state transitions.
4. Move the Hearn receiver implementation into its owning repository and represent it in Oddspark as a versioned external contract/manifest dependency.
5. Replace every “all required inputs are produced by earlier stories” declaration with exact story IDs or named external artifacts and authorities.
6. Bind broad acceptance criteria such as “all integrity predicates pass” to exact versioned schemas, fixture sets, checklists, or hashes.
7. Add AC-to-requirement mappings for stories that cite broad FR/NFR ranges.
8. Re-run implementation readiness after the course correction and UX artifact are complete. Keep readiness separate from deployment, provider runs, quiet-production observation, public promotion, receipt-claim activation, Hearn reference activation, and destructive retirement approvals.

### Issue Summary

- UX alignment issues: 6
- Critical epic-quality violations: 3
- Major story/dependency issues: 5
- Minor planning concerns: 3
- Total issues requiring attention: 17 across 4 categories

### Final Note

The planning set has strong requirement content, complete FR coverage, explicit safety boundaries, and disciplined production authority gates. Its blocking weakness is decomposition: the current story graph is comprehensive but does not form independently valuable, deployable epics. Correcting the epic boundaries and making the implied UX contract explicit should make the plan reassessable without changing the product promise.

**Assessment date:** 2026-08-17  
**Assessor:** Codex — BMAD Implementation Readiness
