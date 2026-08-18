# PRD Quality Review — Oddspark Coherence-Gated Opportunity Brief Pipeline (Course-Corrected)

## Overall verdict

**Adequate and decision-usable for the governed recovery path.** The PRD retains a specific product thesis, unusually concrete functional consequences, honest non-goals, and the fail-closed/six-call corrections required by the approved Story 1.2 response. Its remaining risks are mostly boundary clarity: two questions are simultaneously presented as open and resolved, FR-11's MVP placement is internally ambiguous, and some semantic success conditions and business metrics still need a predeclared operational threshold before launch decisions can be made.

## Decision-readiness — adequate

The document makes the central product and safety decisions explicit: preserve the one-button interaction, replace random-axis collision with a two-mode coherent pipeline, reject any candidate that fails a gate, and fail closed on malformed or candidate-unbound judge output (§1, lines 14–20; §4.2/FR-3, lines 85–98). FR-4 now carries the corrected six-call arithmetic and names what is given up: candidate count falls from three to two when evidence consumes one model call (§4.2/FR-4, lines 100–107). The approved course correction also makes the unresolved provider choice a controlled checkpoint rather than an implicit implementation choice (PRD §8/OQ-3, lines 243–248; Sprint Change Proposal §3, lines 70–82).

The remaining open decision is honestly exposed: the exact judge provider/model, outer wire representation, adapter, and latency allocation are not yet qualified. That does not prevent the next governed work item, because the proposal explicitly orders offline evidence-v2 work, configuration freeze, fresh approval, and one bounded matrix. However, the last two PRD questions do not clearly state whether they are open decisions or already-resolved architecture work.

### Findings

- **medium** Open Questions 6 and 7 have contradictory decision state (§8, lines 250–251) — Both remain numbered as open questions, yet each ends with a parenthetical architecture answer framed as resolved. A decision-maker cannot tell whether calibration ownership/acceptance is settled or still requires a ruling. *Fix:* Either mark each `Resolved` and point to the authoritative AD/story criterion, or keep it open and add owner, required evidence, and decision deadline.

## Substance over theater — strong

The personas and journeys are economical and load-bearing: Dana exercises local mode and failure behavior, while Marcus exercises domain grounding, the one-Breadcrumb ceiling, channel preservation, and the Spark-specific invitation (§2.3, lines 37–41). The differentiation is product-specific rather than generic: preservation, restrained public-site grounding, and retellable plans are expressed as requirements throughout FR-1–FR-11. NFRs are also concrete for this stage—six model calls per strike, a hard wall-clock degradation path, existing scan budget, input limits, and explicit privacy carve-outs (§Cross-Cutting NFRs, lines 236–241)—rather than boilerplate claims that the system should merely be fast, safe, and scalable.

### Findings

No substantive theater finding. The voice and preservation language is repeated, but each repetition constrains a different downstream surface rather than filling a template.

## Strategic coherence — adequate

The thesis is consistent from Vision through scope: retain the trusted one-button routine while replacing incoherent random-axis output with grounded, gated Opportunity Briefs (§1, lines 14–20; §6, lines 202–218). Every FR supports that arc, and the explicit non-goals prevent the domain path from drifting into an audit, surveillance surface, or generic sales funnel (§5, lines 192–200). The counter-metrics are notably useful: raw button presses, output length, and numeric specificity are explicitly rejected as proxies for success (§7, lines 231–234).

The strategic weakness is measurement readiness, not feature coherence. The primary conversion metric defers its target until after a four-week baseline, while the feasibility-conversation metric has no target or decision rule at all. Those measures can describe activity but cannot yet tell the owner whether the thesis worked well enough to continue.

### Findings

- **medium** Lead-generation success lacks a predeclared decision rule (§7/SM-1 and SM-3, lines 220–229) — SM-1 postpones its target until after measurement and SM-3 is only a monthly count. This permits retrospective target-setting and leaves the product thesis without a falsifiable business outcome. *Fix:* Before launch, define the baseline method, minimum sample/window, target-setting rule, and the continue/revise threshold for invitation engagement and Spark-referenced conversations.

## Done-ness clarity — adequate

FR-1–FR-11 are contiguous and nearly every requirement carries observable consequences. The corrected gate behavior is especially clear: contradiction fixtures reject 100%, unusable verdicts count as failed attempts, partial pairs never start, and visitors receive either a passing Brief or a house fallback (§4.2, lines 91–107). Rendering, claim discipline, privacy, interaction preservation, and cache-first reproducibility also name specific test surfaces (§4.3–§4.5, lines 109–190).

The least test-ready requirements are semantic adjectives in local generation. “Season-appropriate,” “compatible business situation,” and “reads as retellable” require a fixed evaluation corpus or rubric. FR-5 commits to a voice rubric and goldens before launch, which helps, but FR-1's local-grounding consequence and SM-5 do not name the corresponding acceptance set or pass rule.

### Findings

- **medium** Local-grounding semantic acceptance is not fully operationalized (§4.1/FR-1, lines 66–73; §7/SM-5, lines 226–229) — “season-appropriate,” “compatible,” and “retellable” can produce reviewer-dependent outcomes, and only the rendering/voice requirement explicitly commits to goldens. *Fix:* Bind FR-1 and SM-5 to a versioned local-mode fixture/golden set, named review rubric, sample size, and pass threshold owned by the semantic qualification story.

## Scope honesty — adequate

The PRD is candid about exclusions and assumptions. It has a real Non-Goals section, explicit MVP exclusions, tagged assumptions, and a partially reopened provider decision rather than pretending the Story 1.2 `NO-GO` did not change delivery sequencing (§5–§6, lines 192–218; §8–§9, lines 243–259). The course-correction proposal further bounds the response to one recovery matrix and makes a second `NO-GO` trigger MVP review rather than silent model shopping (Sprint Change Proposal §3, lines 70–90).

One scope boundary is internally awkward: FR-11 describes behavior that ships, but §6.1 omits FR-11 and §6.2 puts a sentence beginning “Public verifiability claims in UI copy” under Out of Scope while saying cache-first reproducibility itself ships. The intended distinction is recoverable, but story planners should not have to infer it.

### Findings

- **medium** FR-11 straddles In Scope and Out of Scope (§6.1–§6.2, lines 202–218) — Cache-first reproducibility is stated to ship, yet FR-11 is absent from the In Scope list and appears only inside an Out of Scope bullet. *Fix:* Add FR-11's committed-artifact/cache-first behavior to §6.1 and leave only the public UI reproducibility claim in §6.2.

## Downstream usability — adequate

This is a chain-top PRD, and most of its extraction surfaces are strong: a domain glossary, two named UJs, contiguous FRs, contiguous SMs, explicit consequence lists, and resolved architecture references (§0 and §3–§8). The course correction's fail-closed rule and six-call formula are now present in the normative PRD rather than living only in the handoff proposal (§4.2, lines 85–107), which materially improves story traceability.

Two extraction hazards remain. First, course-correction concepts such as the singular composite Gate, judge result, canonical verdict, strike, house Brief, and model-call ledger are used or depended upon without glossary entries; the addendum carries some of the technical distinction, but explicitly declares itself non-normative (Addendum, lines 1–3 and 13–17). Second, UJ-1 describes a failed generation as a “graceful retry,” whereas FR-4 specifies immediate degradation to a curated house Brief after the bounded internal attempts.

### Findings

- **medium** Corrected gate vocabulary is not source-extractable from the Glossary (§3, lines 43–56; §4.2, lines 85–107; Addendum, lines 13–17) — The Glossary defines the nine plural Coherence Gates but not the corrected singular composite Gate or its operational nouns. Downstream stories may conflate the semantic nine-gate verdict with the deterministic-plus-policy-plus-judge pipeline stage. *Fix:* Add short glossary definitions for composite Gate, `JudgeResult`/canonical verdict, strike, six-call ledger, and house Brief, while leaving provider mechanics to architecture.
- **medium** UJ-1 failure language conflicts with FR-4 (§2.3/UJ-1, line 39; §4.2/FR-4, lines 100–107) — “She gets a graceful retry” reads as another user action or surfaced retry state, while the requirement says internal bounded attempts end in a house Brief without an error wall. *Fix:* Replace the journey phrase with the exact observable behavior: she receives a curated, gate-passing local house Brief after internal attempts are exhausted.

## Shape fit — strong

The document fits a small consumer-facing lead-generation surface that feeds architecture and stories. Two named journeys are enough to cover the only meaningful mode split without persona inflation; feature sections then carry globally numbered requirements and test consequences. Existing-versus-new behavior is also distinguished appropriately for a brownfield change: the legacy random-axis mechanism is named, preserved platform behavior has its own section, and the addendum parks current implementation mechanics outside normative product requirements (§1; §4.5; Addendum, lines 3–11).

### Findings

No shape-fit finding. The formalism is proportionate because this PRD is an authority source for UX, architecture, qualification, and story creation—not a standalone idea note.

## Mechanical notes

- **medium** The addendum carries a stale OQ-1 state (Addendum, lines 13–16; PRD §8/OQ-1, line 245) — The addendum still calls deterministic-seed reconciliation a deferred decision with three options, while the normative PRD says AD-7 resolved it as cache-first committed-artifact reproducibility. *Fix:* Mark the addendum item resolved and summarize AD-7, or label the listed options explicitly as historical.
- **medium** The approved proposal's application-state sentence is now stale (Sprint Change Proposal §4, line 94) — It says the accepted edits “have not been applied to their source artifacts,” but the reviewed PRD already contains the FR-3, FR-4, and OQ-3 amendments. This does not weaken the PRD, but it can confuse governance readers about which artifact is current. *Fix:* Add a dated execution note to the proposal recording which source-artifact amendments were applied, without rewriting the approved decision record.
- **low** Assumptions Index does not round-trip exactly (§Cross-Cutting NFRs, line 239; §9, lines 253–259) — The index calls the carried-over 4-second scan budget a presumption, but the inline NFR sentence lacks an `[ASSUMPTION: ...]` tag. *Fix:* Tag the inline statement or remove it from the Assumptions Index after confirming it as a decision.
- FR IDs 1–11, UJ IDs 1–2, and primary/secondary SM IDs 1–5 are contiguous and unique. Counter-metrics use a clear separate `SM-C1`–`SM-C3` namespace.
- Every UJ has a named protagonist carrying context inline. Glossary capitalization is generally consistent; the main drift is the newly introduced singular composite Gate terminology noted above.

