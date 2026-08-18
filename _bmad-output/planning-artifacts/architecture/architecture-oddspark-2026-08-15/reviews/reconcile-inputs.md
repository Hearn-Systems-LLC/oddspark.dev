---
name: reconcile-inputs
type: review
reviews: ../ARCHITECTURE-SPINE.md
against:
  - ../../../specs/spec-oddspark-fun-coherent-idea-generation/SPEC.md
  - ../../../specs/spec-oddspark-fun-coherent-idea-generation/generation-modes.md
  - ../../../specs/spec-oddspark-fun-coherent-idea-generation/coherence-gates.md
  - ../../../specs/spec-oddspark-fun-coherent-idea-generation/result-card-contract.md
  - ../../../specs/spec-oddspark-fun-coherent-idea-generation/acceptance-criteria.md
  - ../../prds/prd-oddspark-2026-08-15/prd.md
created: '2026-08-15'
verdict: sound-with-flags
---

# Reconciliation — Architecture Spine vs SPEC + PRD

**Verdict: SOUND WITH FLAGS.** The spine governs all four capabilities, all eleven FRs have at least one binding AD or convention, and no AD flatly contradicts a spec constraint. Six gaps found — one requires a user/PM decision (AD-7 vs PRD §6.2), the rest are judgment requirements that currently live only in the deferred judge prompt.

## Finding 1 — AD-7 upgrades FR-11 beyond the PRD's MVP scope; the upgrade is defensible but must be flagged (DECISION NEEDED)

- **PRD position:** FR-11 is an explicit *interim* stance — "MVP makes **no same-window-identical reproducibility claim in UI copy** until architecture proves what gated generation can guarantee (OQ1)." PRD §6.2 lists "same-window reproducibility guarantees… deferred decision" as **Out of Scope for MVP**. OQ1's interim stance is "quiet… no reproducibility claim in UI copy until architecture proves feasibility."
- **Spine position:** AD-7 resolves OQ1 outright: first gate-passing Brief per window is committed via the existing `w:`/`pw:` pins + COORD claim/commit, later requests serve the committed artifact, and "the system claims *committed-artifact reproducibility*."
- **Assessment:** The upgrade is *technically sound and consistent with the PRD's delegation* — PRD §4.5 assumes the drand/NOAA seed and KV caching are preserved, OQ1 explicitly asks architecture to decide the receipt's form ("seed-as-input, seed-as-selection, or dropped"), and FR-11's second consequence says "whatever seed/caching behavior ships is documented honestly in the addendum by architecture." AD-7 is that decision, and cache-first commit is the one formulation of the receipt that survives LLM nondeterminism without lying. It does not contradict FR-8/FR-9 (domain-mode stays internal-cache-only, no `/s/:id` permalink — matches FR-9's ephemerality consequence).
- **The flag:** AD-7 silently moves a PRD-declared out-of-scope item into MVP scope, and it never states the **UI-copy stance**. FR-11's first testable consequence — "UI copy contains no reproducibility/verifiability promise while OQ1 is open" — becomes ambiguous once AD-7 closes OQ1: does the page regain a "randomness with a receipt" claim (now about the committed artifact, not the model)? The spine should either (a) explicitly state that UI copy stays quiet in v1 and the claim lives only in `/how`, or (b) state the new copy — and either way the PRD's §6.2 line should be amended by the PM so the two documents stop disagreeing. **Recommend flagging to Justin rather than letting the spine override the PRD by silence.**

## Finding 2 — PRD OQ6 (weakly-exposed existing capability) is neither resolved nor deferred

PRD Open Question 6 asks how gate 3 (capability inventory) stays honest when a capability exists on the site but is only weakly present in the Evidence Bundle. The spine resolves OQ1 (AD-7), OQ2 (AD-3), OQ3 (AD-2), OQ4 (AD-8), OQ5 (AD-4, marked ADOPTED), and defers OQ7 (gate-9 calibration). **OQ6 appears nowhere** — not in an AD, not in Deferred. It is presumably folded into judge calibration, but unlike OQ7 it is not named, so it can be lost. Add it to the Deferred list alongside gate-9 calibration.

## Finding 3 — Tone requirements have no structural hook; they ride entirely on the deferred judge prompt

Three quiet requirements from the inputs are real, testable, and currently ungoverned by anything structural:

- **FR-6 qualitative-specificity:** "Qualitative effects name who is affected and what physically changes in their day… never bare mush ('saves time')." AD-5 governs *numeric* discipline only; nothing in the schema, gates list, or conventions addresses mush.
- **FR-7 trust mechanism:** CTA copy must "explicitly leave room to conclude the idea is not worth changing" and carry no urgency/pressure/pitch register. AD-5 has an `invitation` field but no rule about its content.
- **FR-5 confident-plan register:** no hypothetical framing, no rhetorical questions to the owner; banned registers enumerated in the voice rubric.

The spine's Deferred section covers judge *prompt wording* and gate-9 calibration against the rubric, so this is arguably intended. But these are pass/fail PRD consequences, not tuning details — if the judge prompt is the only enforcement point, the spine should say so explicitly (one line in Deferred: "FR-5 register, FR-6 mush ban, and FR-7 trust mechanism are enforced solely by the judge prompt + voice rubric") so nobody assumes a structural check exists.

## Finding 4 — "Exactly one Breadcrumb" in domain mode is not structurally enforced

FR-2/CAP-2 require *exactly one* Breadcrumb in Website-Grounded Mode. AD-5's schema is `why_fits{breadcrumb?}` — optional and singular. Singularity gives the FR-9 ceiling (at most one) for free, but the *floor* (exactly one, in domain mode) is not in the schema, not in AD-4's grounding rule, and not listed among what the judge verifies (AD-2 names claim discipline and evidence grounding, not breadcrumb presence). A domain-mode Brief with zero breadcrumbs would pass every stated structural rule. Either make `breadcrumb` required-when-`mode=website_grounded` in the schema or add it to the judge's checklist in AD-2.

## Finding 5 — Latency NFR is unbounded while cost NFR is governed

PRD NFRs: "generation completes within the existing scan/response budgets or degrades gracefully"; total latency target is explicitly an architecture decision. AD-9 bounds *cost* (all calls through `modelFor`/NeuronMeter, 3-candidate cap), and AD-6 preserves scan budgets — but the pipeline now makes up to 6 model calls per strike (3 generate + 3 judge) plus evidence, and **no AD sets a total-latency bound, a per-call timeout, or a degradation trigger on slowness**. FR-4 promises "never a hang," but nothing in the spine enforces it on the time axis. Add a convention or AD line: per-call timeout + total-strike budget, with timeout degrading to the house Brief exactly like gate exhaustion.

## Finding 6 — Voice rubric + golden Briefs are a pre-launch *deliverable*, spine treats them as background tuning

FR-5 makes "a written voice rubric and at least 3 approved golden-reference Briefs (per mode)" a named pre-launch deliverable owned by Justin, and SM-2/SM-4/SM-5 sampling depends on it. The spine references the rubric in two Deferred bullets but never records it as a **launch-blocking deliverable with an owner**. Low structural risk (the pipeline works without it), but the reconciliation should note that "deferred to pre-launch" in the spine must not decay into "forgotten": the `/how` rewrite, rubric, and golden Briefs are all in Deferred with no readiness gate. Consider a one-line "Pre-launch checklist" section in the spine listing the three.

## Confirmed consistent (no action)

- AD-4's evidence threshold adopts user-reviewed OQ5 and matches FR-8's fallback-with-notice consequences, including robots.txt.
- AD-3's 3-candidate bound + gate-passing house Brief matches FR-4's "fallbacks are themselves gate-passing… never unvetted near-misses" — stronger than the PRD's "generic-local Spark or retry prompt" and compatible with it.
- AD-7's no-permalink-for-domain-mode matches FR-9's ephemerality consequence.
- AD-8's aggregate-only counters match the privacy guardrail and FR-8's carve-out; `/api/cheer` is the only new endpoint, consistent with AD-10/FR-10.
- AD-6's seam preserves router, KV scheme, both DOs, seed feeds, and scan budgets per §4.5's assumption; structural seed deletes the axis lists, satisfying FR-1's "no random-axis vocabulary" consequence.
- All 9 gates are named in AD-2's judge contract; the contradiction-set rejection harness (MVP scope) is implied by AD-1/AD-2 and the Deferred calibration work.
- Spec constraints (one button/one field, no PII/reviews/sessions, no pre-discovery pricing, delivery envelope, one-breadcrumb ceiling, no duplication of detected capabilities) each have at least one governing AD; pricing and duplication are enforced via gate list + AD-5 claim discipline.
