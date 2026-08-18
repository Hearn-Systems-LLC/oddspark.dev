---
title: Oddspark Coherence-Gated Opportunity Brief Pipeline
status: final
created: 2026-08-15
updated: 2026-08-16
---

# PRD: Oddspark Coherence-Gated Opportunity Brief Pipeline

## 0. Document Purpose

This PRD is the decision contract for replacing Oddspark's independent random-axis generation with a coherence-gated Opportunity Brief pipeline. It is written for Justin (builder/owner) and the downstream BMad workflow owners (UX, architecture, epics). It builds directly on `SPEC-oddspark-fun-coherent-idea-generation` (`_bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/`) — the spec's five companions carry the normative detail for generation modes, coherence gates, the result-card contract, acceptance criteria, and risks; this PRD references them rather than duplicating them. Structure: Glossary-anchored vocabulary, features grouped with globally numbered FRs, assumptions tagged inline and indexed in §9.

## 1. Vision

Oddspark is a public Hearn Systems lead-gen surface: one button, an optional domain field, and a generated "spark" — a business-improvement idea a small-business owner could plausibly act on. Today's generator composes four independent random axes (who, why, what, sting) seeded by drand + solar-flux randomness. The axes can collide into contrived ideas: duplicating a capability the business already has, assuming the wrong channel, mismatching solution scale, criticizing without a constructive intervention, or recommending work Hearn Systems could not deliver.

The Opportunity Brief pipeline keeps the exact interaction — one button, one optional domain — and replaces axis-collision with coherence. With a domain, the spark is grounded in evidence from the business's public website. Without one, it is grounded in Port Huron / Blue Water Area context, seasonality, and a compatible business situation. Every candidate must pass nine coherence gates before it can render, and every rendered result is a confident, retellable plan that names what stays the same and ends in a no-pressure invitation to talk.

The governing principle is preservation: do not break what already works. The smallest worthwhile change to a trusted routine, not a transformative pitch.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** a small-business owner (Port Huron / Blue Water Area or beyond) gets one concrete, believable idea for improving a recurring annoyance in their business — in language they understand, in under a minute.
- **Emotional:** feel understood, not audited; the spark should feel like it belongs to *their* business, without exposing that any research happened.
- **Social:** be able to retell the idea naturally to a friend, spouse, or partner without embarrassment.
- **For Hearn Systems (the operator):** each spark is a credible, low-friction entry into a bounded feasibility conversation — problem-solving-led, never a pitch.

### 2.2 Non-Users (v1)

- Enterprises and multi-location organizations — proportionality gates target small-business scale.
- Visitors seeking a website audit, SEO report, or grade — the product explicitly refuses fault-finding without a constructive plan.
- Existing Hearn Systems clients mid-engagement — this is a top-of-funnel surface, not a client tool. [ASSUMPTION: confirmed by spec non-goals.]

### 2.3 Key User Journeys

- **UJ-1. Dana presses the button cold.** Dana owns a two-truck HVAC outfit in Fort Gratiot and found oddspark.dev through a Hearn Systems social post. She lands on the page, skips the domain field, and presses the button. Within seconds she sees a spark: a named plan that recognizes a routine like hers (after-hours quote requests scribbled on paper), proposes the smallest useful version of a fix, says what gets better qualitatively, lists what stays the same, and ends with "talk through the problem, no pitch attached." She retells it to her husband at dinner verbatim. **Edge case:** if the bounded internal attempts cannot produce a gate-passing Candidate, she receives a curated, gate-passing local house Brief — never a near-miss idea, surfaced retry state, or error wall.

- **UJ-2. Marcus pastes his domain.** Marcus runs a bakery in Port Huron. He pastes `marcusbakery.example` into the domain field and presses the button. The spark references one charming breadcrumb from his public site — say, a photo gallery full of custom cakes — as the reason the plan belongs to him, then proposes a small improvement that keeps his existing ordering channel intact. Nothing else from the scan is shown; there is no audit list. He clicks the invitation, which asks how *this exact plan* could be implemented at its smallest useful version. **Edge case:** if his site can't be scanned, he gets the Coherent Local Mode spark with a plain-language notice — never an error wall.

## 3. Glossary

- **Spark** — a single generated business-improvement idea, rendered as one Opportunity Brief. One button press produces one Spark.
- **Opportunity Brief** — the rendered result card for a Spark, following the 8-element contract in `result-card-contract.md`.
- **Candidate** — an unrendered Spark under evaluation by the Coherence Gates. Candidates that fail any gate are never shown.
- **Coherence Gates** — the nine accept/reject tests defined in `coherence-gates.md`.
- **Gate** — the composite pipeline stage that combines local deterministic and privacy-policy checks with one candidate-bound semantic judge verdict. It is distinct from the nine Coherence Gates the judge evaluates.
- **JudgeResult / canonical verdict** — the candidate-bound outer judge result and its strict inner `{pass,gates[9],tone,claims}` verdict. An invalid or mismatched result fails the Candidate.
- **Strike** — one button-triggered pipeline execution, including evidence work, bounded generation/judging attempts, and any house-Brief fallback.
- **Model-call ledger** — the six-call per-Strike budget. Only complete generation-to-judge pairs may start, and failed, invalid, or timed-out model invocations still consume their call.
- **House Brief** — a curated, per-season Coherent Local Mode Brief that is gate-passing by construction and is returned when the live pipeline cannot safely complete.
- **Domain** — the optional website address submitted by the visitor; the only input besides the button. Its presence selects Website-Grounded Mode.
- **Website-Grounded Mode** — generation using the Domain's public website as evidence. See `generation-modes.md`.
- **Coherent Local Mode** — generation using Port Huron / Blue Water Area context, date/time, seasonality, and a compatible business situation. See `generation-modes.md`.
- **Breadcrumb** — the single restrained, charming website detail surfaced in Why-It-Fits (Website-Grounded Mode only). Exactly one per Brief. Charming means specific and positive-or-neutral; a Breadcrumb never points out a fault and never contains a person's name or personal contact details.
- **PII** — personally identifiable information: names, personal phone numbers or emails, photos of identifiable people, and any data identifying an individual rather than the business. Publicly posted *business* contact channels (the shop's phone, the studio's booking form) are business signals, not PII, but never appear as a Breadcrumb about a person.
- **Evidence Bundle** — the backstage collection of public-site signals (capabilities, CTAs, forms, channels, integrations, navigation, broken/stale items) assembled before generation. Never displayed as an audit.
- **Delivery Envelope** — work Hearn Systems could credibly deliver: custom software, AI automation, integrations, data workflows, adjacent digital systems.
- **Preservation Statement** — the What-Stays-the-Same element naming retained tools, decision authority, and untouched workflow steps.

## 4. Features

### 4.1 Two-Mode Generation

**Description:** A single button press generates one Spark. The presence of a Domain silently selects the mode — no mode switch, no new fields. Website-Grounded Mode builds the Candidate from the Evidence Bundle plus general vertical knowledge. Coherent Local Mode builds it from fixed local context, current date/time and seasonality, a compatible business situation, and a Delivery-Envelope capability bundle. Neither mode selects independent random axes and rationalizes their collision afterward — that composition strategy is removed, not layered over. Realizes UJ-1, UJ-2.

**Functional Requirements:**

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
- The Candidate contains no business-specific facts absent from the Evidence Bundle; "general vertical knowledge" means trade-level patterns (how bakeries typically take orders), never facts about *this* business learned off-site or from model pretraining.

### 4.2 Coherence Gating

**Description:** Every Candidate is evaluated against all nine Coherence Gates before rendering. A Candidate failing any gate is rejected and regeneration occurs; only gate-passing Candidates become Briefs. Gating is a hard pipeline stage, not a post-hoc style filter.

**Functional Requirements:**

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

### 4.3 Opportunity Brief Rendering

**Description:** Every rendered result is a confident plan following the 8-element contract: Spark title, The Plan, Why It Fits (with one Breadcrumb in Website-Grounded Mode), What Gets Better, Before/After, Change Level, What Stays the Same, and the implementation invitation. Tone: problem-solving-led, no pressure, no obligation.

**Functional Requirements:**

#### FR-5: Contract-complete rendering

Every Brief renders all eight elements in the order defined in `result-card-contract.md`.

**Consequences (testable):**
- Snapshot/structural tests confirm all eight elements present, in order, per render.
- Change Level always includes a preliminary time range plus workflow-step impact.
- What Stays the Same names preserved tools, decision authority, and untouched workflow steps (all three, where applicable).
- The Brief reads as a confident plan — no hypothetical framing ("you could maybe…"), no rhetorical questions posed to the owner.
- Before launch, a written voice rubric and at least 3 approved golden-reference Briefs (per mode) exist; sampled Briefs are reviewed against them (see SM-4, SM-5). Banned registers — consultant-speak, pitch voice, audit framing, hype adjectives — are enumerated in that rubric. [NOTE FOR PM: rubric + golden Briefs are a pre-launch deliverable, owner Justin.]

#### FR-6: Claim discipline

Numeric claims about the business's outcomes appear only when grounded in real numbers found on the public site; otherwise all effects are qualitative. The Change Level time range is Hearn Systems' own preliminary estimate, not a business-outcome number, and is always labeled preliminary.

**Consequences (testable):**
- In Coherent Local Mode, rendered Briefs contain no numeric ROI, percentages, or savings figures.
- In Website-Grounded Mode, every business-outcome number in the Brief is traceable to the public site.
- Qualitative effects name who is affected and what physically changes in their day (e.g., "the morning phone tag over quote requests stops"), never bare mush ("saves time," "more time with customers").
- No price for Hearn Systems work appears anywhere in a Brief.

#### FR-7: Spark-specific invitation

The CTA ties the invitation to this exact Spark and its smallest useful version, offering a bounded feasibility conversation.

**Consequences (testable):**
- The CTA references the Spark by name or content, not a generic "contact us."
- CTA copy contains no pricing, no urgency/pressure language, and no pitch register — it reads as an offer to think together ("talk through the problem"), in the plain voice defined by the voice rubric, not sales copy.
- CTA copy explicitly leaves room to conclude the idea is not worth changing — "say so if it is not worth changing" is the trust mechanism behind "no pitch attached."

### 4.4 Evidence Assembly

**Description:** Backstage evidence gathering per mode. Website-Grounded Mode scans the public site for stated and missing capabilities, CTAs, forms, links, contact channels, integrations, navigation complexity, technical behavior, broken images/links, and stale content. Coherent Local Mode assembles local, seasonal, business-situation, and Delivery-Envelope priors from current date/time. All research stays backstage.

**Functional Requirements:**

#### FR-8: Public-site evidence only

Website evidence is limited to the submitted public website plus general vertical knowledge and current date/time.

**Consequences (testable):**
- Submitted public-site responses may contain PII only in the ephemeral scan buffer needed to detect and exclude it. Detected PII is never retained, copied into the Evidence Bundle, sent to a model, used for personalization/generation, or rendered. Cookies, sessions, Google reviews, and off-site footprint data are neither fetched nor used.
- Server-side abuse-prevention rate limiting and short-lived KV caching are permitted as an explicit carve-out; they play no role in personalization, generation content, or cross-visit tracking of individuals.
- The scanner respects robots.txt; sites that disallow crawling fall back to Coherent Local Mode with the plain-language notice.
- Scan degradation (unreachable site, unclear purpose) falls back to Coherent Local Mode with a plain-language notice. [ASSUMPTION: existing scan limits and warnings carry over from the current worker.]

#### FR-9: One-breadcrumb ceiling

At most one business-specific detail from the Evidence Bundle appears in the rendered Brief; the rest remains backstage.

**Consequences (testable):**
- Rendered Briefs contain no capability inventory, audit list, or multi-item site findings.
- A Website-Grounded Brief is ephemeral to the session: no public permalink, shareable URL, or indexed page that persists a critique of a third-party business. (KV caching for reproducibility is internal and does not mint public URLs for domain-mode Briefs.)

### 4.5 Preserved Platform Behavior

**Description:** The interaction contract and the parts of the current system that already work are preserved unchanged. [ASSUMPTION: the drand + NOAA verifiable-seed "randomness with a receipt" mechanism, KV result caching/reproducibility, and the one-button playful brand voice are part of "what already works" and carry over; the spec governs *generation coherence*, not the seed/caching layer.]

**Functional Requirements:**

#### FR-10: Interaction preservation

The UI keeps exactly one button and one optional Domain field; no new inputs or steps.

**Consequences (testable):**
- UI diff shows no added form fields.
- Both modes trigger from the same single action.

#### FR-11: Verifiability preservation (resolved: cache-first)

Same window, same Spark — preserved through committed-artifact reproducibility, not model determinism. The first gate-passing Brief in a seed window (or per `(round, domain)` claim) is committed in the authoritative coordinator receipt; the existing KV pins are read projections, and all later requests in the window resolve the identical committed artifact. Domain-mode Briefs get no public permalink. UI copy makes no reproducibility promise until cache-first behavior is verified in production. (Resolved by architecture AD-7.)

**Consequences (testable):**
- Two requests in the same seed window with identical inputs return the identical committed Brief.
- Website-grounded Briefs have no `/s/:id` permalink.
- UI copy contains no reproducibility/verifiability promise until production verification.

## 5. Non-Goals (Explicit)

- Adding user-input fields or increasing interaction complexity.
- Conducting a website audit or surfacing faults without solutions.
- Using reviews, off-site business-footprint research, personal data, or behavioral surveillance.
- Producing generic sales copy, unsupported ROI, false precision, or pre-discovery pricing.
- Recommending unrelated operational purchases or work outside the Delivery Envelope.
- Replacing functioning tools or processes merely to make an idea appear transformative.
- v1 is not a client portal, audit tool, or analytics dashboard.

## 6. MVP Scope

### 6.1 In Scope

- Two-mode generation (FR-1, FR-2), coherence gating with bounded regeneration (FR-3, FR-4).
- Full 8-element Brief rendering with claim discipline and spark-specific CTA (FR-5, FR-6, FR-7).
- Evidence assembly within the privacy boundary (FR-8, FR-9).
- Preserved single-button interaction (FR-10).
- Cache-first committed-artifact reproducibility (FR-11); public claims about it remain withheld until production verification.
- Gate-rejection test harness using the contradiction set in `coherence-gates.md`.

### 6.2 Out of Scope for MVP

- Public verifiability claims in UI copy — FR-11 ships, but no UI promise until verified in production.
- Multi-language output — English only. [ASSUMPTION.]
- Accounts, saved sparks, history — stateless per-visit experience. [ASSUMPTION: consistent with current architecture.]
- Analytics dashboard for Hearn Systems — v2 candidate.
- A/B testing of CTA copy — v2 candidate.

## 7. Success Metrics

**Primary**
- **SM-1**: Approximate invitation-event rate — accepted `invitation_acted` events divided by authoritative `briefs_served` events. This aggregate, privacy-preserving measure is not unique per visitor or render and may be skewed by repeat actions; it must not be described as a true percentage of people or rendered Briefs. Target set after a 4-week baseline. Validates FR-7 directionally.
- **SM-2**: Gate integrity — 0 displayed Briefs failing any Coherence Gate in sampled review (weekly sample of 20 Briefs across both modes). Validates FR-3, FR-5.

**Secondary**
- **SM-3**: Feasibility conversations — number of inbound conversations referencing a specific Spark per month. Validates FR-5, FR-7.
- **SM-4**: Breadcrumb quality — in sampled Website-Grounded Briefs, exactly one Breadcrumb present (specific, positive-or-neutral, no personal details), and the Brief reads as retellable in review. Validates FR-2, FR-9.
- **SM-5**: Local grounding — in sampled Coherent Local Briefs, the seasonal/local context is accurate for the generation date and region, and the Brief reads as retellable in review. Validates FR-1.

**Counter-metrics (do not optimize)**
- **SM-C1**: Button presses per visit — optimizing raw generation volume encourages spam-pressing and low-quality sparks; counterbalances SM-1.
- **SM-C2**: Brief length/detail — longer Briefs are not better; audit-list creep violates the one-breadcrumb ceiling. Counterbalances SM-2.
- **SM-C3**: Claim specificity — never trade qualitative honesty for impressive-sounding numbers. Counterbalances SM-1 and SM-3.

## Cross-Cutting NFRs and Guardrails

- **Privacy:** detected PII is discarded from the ephemeral scan buffer before evidence persistence or model use; no PII, cookies, sessions, reviews, or off-site research enters personalization, generation, or rendered output. Server-side abuse-prevention rate limiting and short-lived KV caching are an explicit, declared carve-out with no tracking role. Robots.txt is respected.
- **Performance:** a strike completes within the architecture's hard `STRIKE_BUDGET_MS` wall-clock cap (AD-9) or degrades to the house Brief per FR-4; the existing 4s scan budget carries over. [ASSUMPTION: retained from the current worker until architecture measurement revisits it.]
- **Security:** Domain input remains validated and size-limited per existing worker guards (request body and URL limits, redirect caps).
- **Cost:** FR-4's six-call ledger is the LLM cost cap per button press.

## 8. Open Questions

1. ~~Does the drand/NOAA verifiable-seed "receipt" survive LLM-based gated generation?~~ **Resolved by architecture (AD-7):** cache-first commit — the first gate-passing Brief in a window is pinned and served to all later requests; the system claims committed-artifact reproducibility, never model determinism. Remaining: production verification before any UI copy claim.
2. ~~What is the regeneration bound (FR-4) and the exact fallback behavior when it trips?~~ **Resolved by architecture (AD-3, AD-9):** six model calls per strike; only complete generation-to-judge pairs may start; with `E` model-based evidence calls the Candidate ceiling is `min(3, floor((6 - E) / 2))` (`E=0` permits three, `E=1` permits two). The hard `STRIKE_BUDGET_MS` wall-clock cap still applies, and exhaustion falls back to a curated per-season house Brief that is gate-passing by construction.
3. **Partially reopened by the legacy Story 1.2 `NO-GO`; recovery is now Stories 1.3–1.4.** Settled by AD-2: the Gate combines local deterministic/policy validation with a separate one-call semantic judge and preserves the canonical internal verdict covering gates 1–9, tone, and claims. Unresolved pending AD-11 qualification: the exact judge provider/model, outer candidate-bound wire contract, lossless canonical adapter, and latency allocation. Invalid or unqualified results fail closed within the existing call ledger.
4. ~~Is there a persistence/analytics layer for SM-1/SM-3 measurement, and does adding measurement conflict with the no-cookies/no-sessions boundary?~~ **Resolved by architecture (AD-8):** server-side aggregate `briefs_served`, `house_briefs_served`, and `invitation_acted` counters atomically owned by COORD, with KV report snapshots and a `POST /api/cheer` invitation endpoint; 400/502 responses enter no served-outcome denominator, and there is no per-visitor tracking beyond the declared abuse carve-out. SM-1 is intentionally an approximate event rate, not a unique-person or per-render percentage; repeat actions may skew it.
5. ~~How does the pipeline stay honest when website evidence is incomplete, stale, or contradictory — what is the minimum evidence threshold below which Website-Grounded Mode must fall back to Coherent Local Mode?~~ **Resolved by architecture (AD-4):** `clarity=clear` ∧ ≥1 substring-verified observation ∧ non-empty detected-capabilities list; below threshold, downgrade happens before generation with the plain-language notice.
6. **Deferred to semantic qualification, not architecture:** Justin owns the Gate-3 examples in Story 1.5's versioned golden/anti-golden corpus; Story 1.18 must demonstrate the predeclared pass threshold before production. Revisit when the calibration corpus is approved.
7. **Deferred to semantic qualification, not architecture:** Justin owns the Gate-9 boundary in the voice rubric and versioned golden/anti-golden corpus; Story 1.18 must demonstrate the predeclared pass threshold before production. Revisit when the calibration corpus is approved.

## 9. Assumptions Index

- §2.2 — non-user boundary taken from spec non-goals without further confirmation.
- §4.4/FR-8 — existing scan limits and warning copy carry over.
- §4.5 — drand/NOAA seed, KV caching, and brand voice presumed part of "what already works" to preserve.
- §6.2 — English-only, stateless, no accounts assumed for MVP.
- Cross-Cutting NFRs — existing 4s scan budget presumed to carry over.
