# Reconciliation — SPEC-oddspark-fun-coherent-idea-generation → PRD (2026-08-15)

Scope: all six spec files (SPEC.md + 5 companions) checked against prd.md + addendum.md. ~30 load-bearing claims checked. Verdict: structural content (modes, gates, card contract, privacy boundary, claim discipline) survived well; losses concentrate in CTA posture nuance, contract-strength weakening, and the risks file.

## Covered

- **Two modes + mode selection by domain presence** (generation-modes.md) → FR-1, FR-2, §4.1, UJ-1/UJ-2. Random-axis strategy explicitly removed, not layered over.
- **All 9 coherence gates** (coherence-gates.md) → FR-3 enumerates all nine by name and defers normative detail to the companion file; gate integrity metric SM-2 samples gates weekly. Rejection-not-filter principle stated in §4.2.
- **Validation/contradiction set** (scheduler, channel mismatch, scale mismatch, unactionable criticism, non-digital) → FR-3 consequences (100% rejection) + MVP scope test harness.
- **All 8 result-card elements, in order** (result-card-contract.md) → FR-5, Glossary "Opportunity Brief". Change Level = preliminary time range + workflow-step impact preserved.
- **Evidence/privacy boundary** (SPEC constraints, generation-modes.md) → FR-8 + Cross-Cutting Privacy guardrail (PII, cookies, sessions, Google reviews, off-site footprint all excluded). Scan-degradation fallback preserved (FR-8 consequence).
- **Qualitative-claims rule** (no fabricated ROI, numbers only from the public site, no pre-discovery pricing) → FR-6 (both modes tested), non-goal, counter-metric SM-C3.
- **One-breadcrumb ceiling / research backstage** → FR-9, Glossary "Breadcrumb"/"Evidence Bundle", SM-4.
- **One button + one optional domain, no new inputs** → FR-10, non-goals, acceptance criterion carried.
- **Preservation governing principle** ("do not break what already works", smallest worthwhile change) → §1, gate 7, FR-5, §4.5.
- **Delivery envelope constraint** (custom software, AI automation, integrations, data workflows, adjacent digital systems) → Glossary, FR-1/FR-3, non-goals.
- **Retellable / novel-but-believable success signal** → gates 8–9 in FR-3, §2.1 social job, UJ-1 ("retells it verbatim").
- **Charming breadcrumb tone** → FR-2/§4.3 wording retained, SM-4 "charming-not-creepy".
- **No-pressure, no-obligation, spark-specific CTA** → FR-7 (named-spark reference, no pricing, no urgency language), §2.1 operator job, UJ-1.
- **Deferred determinism/seed tension** → Open Question 1, FR-11 note, addendum mechanics preserved (scan budgets, rate limits, KV caching).

## Gaps

### G1 — CTA posture: "say so if it is not worth changing" is missing
- **Source claim:** result-card-contract.md CTA posture and SPEC.md constraint: the CTA helps "test whether the idea fits, find the lowest-friction version, and **say so if it is not worth changing**"; it is "open to concluding the idea is not worth changing."
- **Where it should live:** FR-7 consequences (and §4.3 tone note).
- **Why it matters:** This is the trust mechanism that makes "no pitch attached" credible rather than a slogan. FR-7 tests only spark-specificity and absence of pricing/urgency — a CTA can pass FR-7 while still presuming the change should happen. The willingness to advise *against* the work is a testable copy requirement that evaporated.

### G2 — "What Stays the Same" weakened from "names all three" to "at least one"
- **Source claim:** SPEC.md CAP-4 success: "names preserved tools, decision authority, **and** untouched workflow steps"; result-card-contract.md element 7: "explicitly names preserved tools, decision authority, and untouched workflow steps."
- **Where it should live:** FR-5 third consequence.
- **Why it matters:** The PRD consequence reads "names **at least one** preserved tool, decision authority, or untouched step" — a conjunctive contract became a disjunctive test. A Brief naming one preserved tool while silently dropping the owner's decision authority would pass the PRD test and fail the spec. This is the preservation principle's enforcement point.

### G3 — risks-and-unknowns.md largely dropped; no risk section in the PRD
- **Source claims:** (a) website evidence may be incomplete/stale/contradictory; (b) proportionality judgments are estimates and may be uncertain; (c) capabilities can be present but poorly exposed → duplication risk (gate 3 false confidence); (d) the surprising-vs-implausible threshold needs evaluation; (e) avoiding obvious ideas while staying website-only is unproven.
- **Where it should live:** PRD Open Questions §8 and/or a new Risks section; (d) and (e) belong beside gate 9 / SM-2 as evaluation-harness concerns.
- **Why it matters:** Only the seed-determinism and gate-implementation unknowns made it into Open Questions. Risks (c)–(e) directly threaten the two headline promises (no duplication, novel-but-imaginable) and have no owner anywhere in the PRD. The gate test harness tests the contradiction set but nothing tests the *threshold* risks.

### G4 — Change Level detail: "repetitive steps that disappear" not carried
- **Source claim:** result-card-contract.md element 6: time range plus workflow steps that change "and, where applicable, **repetitive steps that disappear**."
- **Where it should live:** FR-5 second consequence ("workflow-step impact" is too compressed).
- **Why it matters:** "Steps that disappear" is the concretely retellable payoff metric — it's how an owner repeats the idea at dinner. Losing it flattens Change Level into an estimate table.

### G5 — No success metric or AC for local-mode seasonal/contextual grounding (FR-1)
- **Source claim:** acceptance-criteria.md: "the same action produces a coherent general/local spark without a domain"; SPEC CAP-1 success requires seasonal relevance in Port Huron context.
- **Where it should live:** §7 Success Metrics (SM-2 samples "both modes" for gate integrity but no metric checks seasonality/local fit specifically; FR-1's consequences are testable but unmeasured).
- **Why it matters:** The no-domain path is the default journey (UJ-1) and the fallback for every failed scan; it is the least instrumented. A seasonally wrong spark (patio-season idea in January) passes all current SMs.

### G6 — "Feel understood, not audited" / no-embarrassment qualities have no review checkpoint
- **Source claim:** SPEC success signal: result "a visitor could retell naturally to a friend"; generation-modes.md: "charming… do not present an audit." PRD §2.1 emotional/social jobs capture these, and gates 8–9 exist, but no SM or AC validates the *felt* qualities (confident-not-hypothetical voice, charming-not-creepy beyond the breadcrumb, zero embarrassment on retelling).
- **Where it should live:** §7 secondary metrics or the SM-2 review rubric (extend sampled review to a tone checklist).
- **Why it matters:** These are exactly the qualitative claims FR structure drops silently. SM-4 judges only the breadcrumb; the overall Brief voice ("confident plan, not a hypothetical question" — result-card-contract.md line 3) is asserted in §4.3 but has no FR consequence or test anywhere. If tone regresses to salesy or hedged, every FR still passes.

### Minor (noted, not load-bearing)
- FR-2 consequence drops the "restrained" qualifier on the breadcrumb (kept in Glossary); SM-4 partially backstops it.
- "Within seconds / under a minute" latency expectation (UJ-1, §2.1) has no numeric NFR — flagged as architecture decision; acceptable.
- Addendum correctly preserves scan budgets and rate limits; no gaps there.
