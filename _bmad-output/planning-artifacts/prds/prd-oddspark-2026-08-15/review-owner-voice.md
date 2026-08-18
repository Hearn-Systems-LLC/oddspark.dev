# Owner-Voice Review — Oddspark Opportunity Brief PRD

Reviewer stance: a skeptical Port Huron small-business owner (two-truck HVAC outfit, corner bakery, mowing-and-mulch landscaper) who found this through a Facebook post, plus the copywriter who would have to write for that person. One question only: **will the thing this PRD specifies actually produce sparks a busy owner believes, finds charming, and retells at dinner — or is it consultant-speak dressed up as a plan?**

Severity scale: impact on the launch product's credibility. **High** = a spark that smells like AI sales copy and kills trust on first render. **Medium** = a draftable escape hatch that lets bland output ship. **Low** = friction, not failure.

---

## Verdict

The PRD knows the right enemy — it's admirably explicit about refusing audits, ROI theater, and pressure CTAs. But it repeatedly **asserts voice instead of specifying it**. "Confident," "charming," "retellable," "qualitative" appear as requirements with no testable shape, and the fallback path (FR-4 generic-local spark) is precisely where the blandest possible output will land at scale. As written, a pipeline can pass every stated consequence and still render a spark that reads like a LinkedIn growth consultant's cold DM. Fixable — but the fixes belong in the PRD, not left to a judge model's vibes.

---

## Findings

### 1. HIGH — "Reads as a confident plan" (FR-5) is untestable as written, and it's the whole ballgame

FR-5's consequence — "no hypothetical framing ('you could maybe…'), no rhetorical questions" — bans two sentence shapes and calls it confidence. That's a regex, not a voice. An LLM can produce "We will route your after-hours quote requests into a single intake queue" — grammatically confident, zero banned phrases — and it still sounds like a McKinsey deck wearing a flannel shirt. The skeptical owner doesn't flinch at "maybe"; he flinches at **nouns like "intake queue" and verbs like "leverage."** Nothing in the PRD bans consultant vocabulary, specifies sentence register, or gives a pass/fail sample of confident-but-wrong versus confident-and-right. UJ-1 says Dana "retells it to her husband at dinner verbatim" — that's the actual acceptance test, and it appears nowhere in FR-5's consequences. Add a banned-register list and 3–5 golden reference Briefs the renderer is diffed against in review, or this FR certifies nothing.

### 2. HIGH — The fallback path is where blandness ships at scale (FR-4, FR-8, UJ-2 edge case)

FR-4 says after a bounded number of gate failures the system "degrades gracefully (generic-local Spark or retry prompt)." FR-8 does the same on scan degradation. So the three most common real-world conditions — flaky bakery website, thin one-page site, model having a bad afternoon — all funnel to the **generic-local spark**, which is also the highest-volume spark anyway (most people skip the domain field; that's UJ-1). The PRD never defines what makes a generic-local spark *not* generic. FR-1's consequences require only season-appropriateness and Delivery-Envelope fit. "It's August in Port Huron — get your fall furnace tune-up reminders set up before the rush" passes every gate and every consequence in this document, and it is exactly the filler advice a thousand marketing blogs already give. The counter-metric SM-C3 guards numbers, not blandness. The PRD needs a consequence for FR-1/FR-4 that generic-local sparks must still be *specific* — a named situation, not seasonal common sense — plus a floor on how often fallback sparks may be served before the product should just say "try again."

### 3. HIGH — "Qualitative" What Gets Better (FR-6, §1) will drift into vague mush without a shape

Claim discipline (FR-6) correctly bans invented ROI. Good. But the alternative it prescribes — "says what gets better qualitatively" (UJ-1) — has no required form. "Spend less time on paperwork and more time with customers" is qualitative, number-free, and utterly worthless; it's the first line of every AI-generated sales page ever made. The owner hears that sentence and knows nobody thought about his business. Qualitative claims need a testable rule, e.g.: every effect must name **who** (the owner, the tech, the wife answering the phone), **when** (7pm Saturday, Monday morning quotes), and **what physically changes** (no more sticky notes on the dash). SM-C3 says don't trade honesty for impressive numbers — fine — but there's no metric anywhere guarding against trading numbers for *cardboard*. SM-5's "reads as retellable in review" is the only backstop and it's a vibe check with no rubric.

### 4. MEDIUM — The one-breadcrumb charm mechanism (FR-2, FR-9, SM-4) is specified by count, not by charm

"Exactly one Breadcrumb" and "charming-not-creepy in review" (SM-4). Charming-not-creepy is the entire make-or-break of Website-Grounded Mode — UJ-2 hinges on Marcus being delighted, not feeling watched — and the PRD leaves it to a reviewer judgment with no criteria, no examples, and a sample of 20 Briefs *per week* (SM-2) which post-launch is way too late to catch a creepy-breadcrumb pattern. Also: the UJ-2 example breadcrumb — "a menu last updated two seasons ago" — is a **fault**, phrased politely. That's an audit item wearing a smile. The PRD's own non-goal ("surfacing faults without solutions") sits right next to a flagship example that is, at heart, "we noticed your site is stale." Either the example or the non-goal needs reconciling, and "charming" needs at minimum a short do/don't list before launch, not a weekly review after.

### 5. MEDIUM — CTA anti-pitchiness (FR-7) bans urgency words but not pitch *shape*

The consequences ban pricing and urgency/pressure language, and require an explicit "not worth changing" exit — genuinely good, that exit line is the strongest trust move in the document. But a CTA can contain zero urgency words and still read like a funnel: "Let's explore how this exact plan could transform your quoting workflow at its smallest useful version" — no pressure words, 100% pitch. The banned thing should be **register and abstractions**, not just urgency. Also, "bounded feasibility conversation" is consultant-speak; if that phrase or its cousins appear in rendered CTA copy, the no-pitch promise breaks at the last line — the line the owner reads most suspiciously. FR-7 needs a copy constraint like: the CTA must be writable as something you'd say across a counter ("Want to kick this around? No charge for the conversation, and if it's not worth doing, say so"). As written, the words are compliant and the smell is wrong.

### 6. MEDIUM — "Natural retelling" is Gate 8 and the social JTBD — and has zero consequences anywhere

§2.1 names retellability as the social job; gate 8 is "natural retelling"; SM-5 mentions "reads as retellable in review." No FR consequence defines it. A retellable spark survives being repeated from memory by a tired person at a dinner table: short title, one image, no jargon, one number at most (and FR-6 usually forbids even that). Nothing caps Brief length in service of this (SM-C2 says don't optimize for length, but there's no ceiling), nothing requires the title to be sayable aloud, nothing checks that the plan can be retold without the card in hand. Eight elements in fixed order (FR-5) is already a lot of card for a "one-minute" JTBD — the PRD should state a word budget per element, or the retelling gate is gate in name only.

### 7. LOW — The seed-receipt joke (FR-11, Open Question 1) is brand charm the owner actually gets — and it's parked

This is the one genuinely charming thing in the current product that a Port Huron owner would *retell* — "they seed it with space weather and cosmic randomness, you can check it yourself." That's a bar story. Open Question 1 admits LLM generation may kill it, and §6.2 defers it. Deferring the decision is fine; what's missing is the acknowledgment that if the receipt dies, the product loses its most owner-legible charm and the PRD's charm burden shifts entirely onto copy quality this document hasn't yet proven it can specify.

### 8. LOW — Success metrics measure compliance, not belief

SM-1 through SM-5 can all hit target while owners find the sparks bland: clicks measure curiosity, gate integrity measures the contradiction set, "judged charming" measures a reviewer. Nothing measures the JTBD directly — e.g., a periodic panel of actual local owners rating "would you repeat this at dinner?" That's the metric the whole product stands or falls on, and §2.1 already wrote it. Instrument it or admit the metrics validate the pipeline, not the product.

---

## What would change my verdict

1. FR-5 gains a banned-register list plus golden reference Briefs as the review standard.
2. FR-1/FR-4 gain a specificity consequence for generic-local sparks and a cap on fallback serving.
3. FR-6's qualitative claims get a required shape (who / when / what physically changes).
4. FR-2/FR-9 get a pre-launch breadcrumb do/don't list, and the UJ-2 stale-menu example gets reconciled with the no-faults non-goal.
5. FR-7's CTA gets a register constraint ("sayable across a counter"), and a word budget lands somewhere under FR-5 to make gate 8 real.
