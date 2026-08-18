# PRD Quality Review — Oddspark Coherence-Gated Opportunity Brief Pipeline

## Overall verdict

This is a strong, decision-ready PRD. It has a real thesis (replace axis-collision with coherence; "the governing principle is preservation"), every FR carries testable consequences, omissions are explicit, and the open questions are genuinely open rather than rhetorical. The main risk is concentrated, not diffuse: Open Question 1 (the drand/NOAA "receipt" vs. non-deterministic gated LLM generation) is brand-load-bearing and deferred out of MVP without stating what the shipped UI claims in the meantime. Nothing here is broken; the findings below are sharpening, not rescue.

## Decision-readiness — strong

Decisions are stated as decisions: "that composition strategy is removed, not layered over" (§4.1), "Gating is a hard pipeline stage, not a post-hoc style filter" (§4.2), and the §6.2 deferral is framed honestly as "deferred decision, not deferred forever." Trade-offs name what was given up — determinism is explicitly sacrificed (or at least risked) for coherence, with a `[NOTE FOR PM]` at exactly the right tension (FR-11: "full determinism may conflict with LLM-based gated generation"). The seven Open Questions are all real: none is answered in the next sentence, and several (OQ1, OQ3) correctly identify themselves as architecture-shaping.

### Findings

- **medium** OQ1 is brand-load-bearing but its MVP interim state is unspecified (§8 OQ1, §6.2, FR-11) — The PRD says the receipt is "the current site's joke" and defers FR-11 out of MVP, but never says what the live UI claims during MVP: does the "randomness with a receipt" copy stay up while reproducibility is silently gone? A decision-maker can approve the PRD and still ship a brand contradiction. *Fix:* add one line to §6.2 or OQ1 stating the interim UI/brand behavior (keep receipt claims, soften copy, or block launch on OQ1).

## Substance over theater — strong

No furniture. Two personas (Dana, Marcus), both load-bearing: UJ-1 realizes FR-1/FR-4's fallback behavior and UJ-2 drives FR-2, FR-8, FR-9. The Vision is unswappable — it names Port Huron / Blue Water Area, the four legacy axes, and the preservation principle; it could not be pasted into another PRD. NFRs are product-specific rather than boilerplate: privacy is a named hard boundary tied to FR-8, cost is capped structurally ("bounded regeneration (FR-4) doubles as the LLM cost cap"), and performance references the actual 4s scan budget. The differentiation is earned from the spec, not template-filling.

### Findings

(none)

## Strategic coherence — strong

The thesis is stated and bet on: coherence-gated, evidence-grounded sparks as a lead-gen surface where trust ("say so if it is not worth changing," FR-7) is the conversion mechanism. Prioritization follows the thesis — gating and contract-complete rendering are in MVP, reproducibility and analytics are not. Success metrics measure the thesis, not activity: SM-1 (invitation engagement) and SM-2 (gate integrity) are direct reads on "confident, believable plan," and three counter-metrics (SM-C1 volume, SM-C2 length, SM-C3 claim specificity) each name what they counterbalance. MVP scope kind is coherent: an experience-scope MVP with matching scope logic.

### Findings

- **low** SM-1 target is undefined at approval time (§7) — "Target set after a 4-week baseline" is defensible, but combined with OQ4 (no agreed measurement layer) the primary metric currently has neither a number nor a confirmed mechanism to observe it. *Fix:* either resolve OQ4 before green-light or state explicitly that SM-1 is unmeasurable until OQ4 lands, so reviewers know what they're approving.

## Done-ness clarity — strong

Every FR has at least one testable consequence, and most are genuinely verifiable: "rejected 100% of the time in testing" (FR-3), "no numeric ROI, percentages, or savings figures" in Coherent Local Mode (FR-6), "UI diff shows no added form fields" (FR-10). Adjective-drift is largely absent; where subjectivity remains it is flagged below. FR-4's unspecified bound is tagged `[ASSUMPTION]` and parked as OQ2 rather than hidden behind "graceful."

### Findings

- **low** Two review-based consequences lack a review rubric (FR-5, SM-4/SM-5) — "reads as a confident plan" (FR-5), "judged charming-not-creepy in review" (SM-4), and "reads as retellable in review" (SM-5) all depend on a reviewer and a standard that don't exist yet. Story creation can still proceed, but these will bounce back as "how do I test this?" *Fix:* a 3–5 item review checklist (or a pointer to one in the spec companions) defining charming-not-creepy and retellable.
- **low** FR-11 is written as a normative FR with testable consequences but is out of MVP (§4.5 vs §6.2) — "Two requests in the same seed window with identical inputs return the identical Brief" reads as an acceptance criterion a story could be written against, while §6.2 defers it. Downstream extraction may pull FR-11 into sprint scope. *Fix:* mark FR-11 "post-MVP / deferred" in its own heading or first line, not only in §6.2.

## Scope honesty — strong

The Non-Goals section does real work (refusing audits, reviews/off-site research, false precision, out-of-envelope recommendations — each kills a plausible misreading). Assumptions are tagged inline and indexed in §9 with a clean roundtrip (verified: §2.2, FR-4, FR-8, §4.5, §6.2 ×2, NFR 4s budget — all present both inline and in the index). De-scoping is explicit (§6.2) and each out-of-scope item carries a reason or a deferral pointer. Open-items density (7 OQs, ~8 assumptions) is appropriate for a PRD that defers architecture rather than pretending it's settled; the one item that crosses into green-light risk (OQ1) is covered above.

### Findings

(none beyond the OQ1 finding under Decision-readiness)

## Downstream usability — strong

This is a chain-top PRD (feeds UX → architecture → epics) and it is built for extraction: a tight 11-term Glossary used consistently, contiguous unique IDs (FR-1–11, UJ-1–2, SM-1–5, SM-C1–C3), all cross-references resolve, and both UJs have named protagonists carrying context inline. Normative detail is deliberately delegated to the five spec companions rather than duplicated, which keeps the PRD clean but creates the one mechanical caveat below. The addendum's brownfield claims are accurate — verified against `src/worker.js:29-34` (`SCAN_BUDGET_MS = 4000`, `SCAN_BYTE_LIMIT = 512 * 1024`, `SCAN_PAGE_LIMIT = 3`, `REDIRECT_LIMIT = 3`, `WEBSITE_LENGTH_LIMIT = 2048`, `REQUEST_BODY_LIMIT = 4096`).

### Findings

(none)

## Shape fit — strong

Brownfield done right: existing-system references are constant-level accurate (addendum), the legacy composition strategy is named for removal rather than vaguely "improved," and preserved behavior (§4.5) is explicitly fenced off from what changes. UJ density is right for a single-interaction consumer surface — two journeys, no UJ inflation. Rigor matches the lead-gen stakes: full traceability scaffolding without enterprise-process weight.

### Findings

(none)

## Mechanical notes

- **Glossary drift (low):** "generic-local Spark" (FR-4, UJ-2) vs. the Glossary term "Coherent Local Mode." FR-8 uses the Glossary term correctly ("falls back to Coherent Local Mode"); FR-4 and UJ-2 should match.
- **Cross-ref fragility (low):** the spec companions are cited by bare filename (`coherence-gates.md`, `result-card-contract.md`, `generation-modes.md`). §0 gives the spec directory, so this resolves inside the repo, but any extraction that lifts FR text alone loses the pointer. Consider a stable relative path on first mention in each feature section.
- **Assumptions Index roundtrip:** clean — every inline `[ASSUMPTION]` is indexed and every index entry appears inline.
- **ID continuity:** clean — no gaps, duplicates, or dangling cross-references found.
- **Required sections:** all present for a brownfield, chain-top PRD at these stakes (Vision, JTBD, UJs, Glossary, FRs, Non-Goals, MVP scope, SMs + counter-metrics, NFRs, Open Questions, Assumptions Index).
