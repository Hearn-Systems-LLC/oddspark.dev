---
title: PRD UX Extract — Oddspark Opportunity Brief
date: 2026-08-17
sources:
  - _bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/prd.md
  - _bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/addendum.md
line_refs: "prd:N = prd.md line N; add:N = addendum.md line N"
scope: UX-relevant facts only; verbatim quotes where wording is load-bearing; "silent" where the PRD says nothing
---

# 1. Product, audience, journeys, voice

**One-liner (prd:16):** "Oddspark is a public Hearn Systems lead-gen surface: one button, an optional domain field, and a generated 'spark' — a business-improvement idea a small-business owner could plausibly act on."

**Governing principle (prd:20):** "preservation: do not break what already works. The smallest worthwhile change to a trusted routine, not a transformative pitch."

**Audience / JTBD (prd:26-29):**
- Functional: "a small-business owner (Port Huron / Blue Water Area or beyond) gets one concrete, believable idea for improving a recurring annoyance in their business — in language they understand, in under a minute."
- Emotional: "feel understood, not audited; the spark should feel like it belongs to *their* business, without exposing that any research happened."
- Social: "be able to retell the idea naturally to a friend, spouse, or partner without embarrassment."
- Operator (Hearn Systems): "each spark is a credible, low-friction entry into a bounded feasibility conversation — problem-solving-led, never a pitch."

**Non-users (prd:33-35):** enterprises/multi-location; "Visitors seeking a website audit, SEO report, or grade — the product explicitly refuses fault-finding without a constructive plan"; existing clients mid-engagement.

**Journeys — protagonists ARE named:**
- **UJ-1 "Dana presses the button cold" (prd:39).** Two-truck HVAC outfit, Fort Gratiot, arrived via Hearn Systems social post. "She lands on the page, skips the domain field, and presses the button. Within seconds she sees a spark: a named plan that recognizes a routine like hers (after-hours quote requests scribbled on paper), proposes the smallest useful version of a fix, says what gets better qualitatively, lists what stays the same, and ends with 'talk through the problem, no pitch attached.' She retells it to her husband at dinner verbatim." Edge: "if the bounded internal attempts cannot produce a gate-passing Candidate, she receives a curated, gate-passing local house Brief — never a near-miss idea, surfaced retry state, or error wall."
- **UJ-2 "Marcus pastes his domain" (prd:41).** Bakery, Port Huron. Pastes `marcusbakery.example`, presses. "The spark references one charming breadcrumb from his public site — say, a photo gallery full of custom cakes — as the reason the plan belongs to him, then proposes a small improvement that keeps his existing ordering channel intact. Nothing else from the scan is shown; there is no audit list. He clicks the invitation, which asks how *this exact plan* could be implemented at its smallest useful version." Edge: "if his site can't be scanned, he gets the Coherent Local Mode spark with a plain-language notice — never an error wall."

**Tone / voice constraints:**
- Brief tone (prd:117): "problem-solving-led, no pressure, no obligation."
- "The Brief reads as a confident plan — no hypothetical framing ('you could maybe…'), no rhetorical questions posed to the owner." (prd:129)
- "Banned registers — consultant-speak, pitch voice, audit framing, hype adjectives — are enumerated in that rubric." (prd:130) Voice rubric + ≥3 golden Briefs per mode are a pre-launch deliverable owned by Justin (prd:130); rubric itself is NOT in the PRD.
- Brand voice: "the one-button playful brand voice" is presumed part of "what already works" and carries over (prd:177). "randomness with a receipt" is "the site's central joke" (add:8).
- Honesty: "never trade qualitative honesty for impressive-sounding numbers" (SM-C3, prd:241). Qualitative effects "name who is affected and what physically changes in their day (e.g., 'the morning phone tag over quote requests stops'), never bare mush ('saves time,' 'more time with customers')." (prd:139)
- Retellability is a first-class quality bar (prd:28, 39, 235, 236).

# 2. FR-10 and every FR/NFR touching the visitor page

**FR-10 Interaction preservation (prd:181-187), verbatim:** "The UI keeps exactly one button and one optional Domain field; no new inputs or steps." Consequences: "UI diff shows no added form fields." / "Both modes trigger from the same single action."

Related (prd:67): "The presence of a Domain silently selects the mode — no mode switch, no new fields." Domain is "the only input besides the button" (prd:54).

Other visitor-facing FRs/NFRs:
- **FR-2 (prd:87):** rendered Brief "contains exactly one Breadcrumb ... specific and positive-or-neutral — never fault-finding, never a person's name or personal contact detail."
- **FR-3 (prd:104):** "A rejected Candidate leaves no visible trace in the UI."
- **FR-4 (prd:111,113):** "No response renders a Candidate that failed a gate — including graceful fallbacks, which are themselves gate-passing Coherent Local Mode Briefs"; "The visitor always receives either a gate-passing Brief or a graceful fallback — never a hang or an error wall."
- **FR-5 (prd:123-130):** all eight elements, in contract order; "Change Level always includes a preliminary time range plus workflow-step impact"; What Stays the Same names "preserved tools, decision authority, and untouched workflow steps (all three, where applicable)".
- **FR-6 (prd:134-140):** numeric claims only when grounded in site numbers; local mode "no numeric ROI, percentages, or savings figures"; Change Level time range "is Hearn Systems' own preliminary estimate ... always labeled preliminary"; "No price for Hearn Systems work appears anywhere in a Brief."
- **FR-7 (prd:144-149):** CTA "ties the invitation to this exact Spark and its smallest useful version, offering a bounded feasibility conversation"; "references the Spark by name or content, not a generic 'contact us'"; "no pricing, no urgency/pressure language, and no pitch register — it reads as an offer to think together ('talk through the problem')"; "explicitly leaves room to conclude the idea is not worth changing — 'say so if it is not worth changing' is the trust mechanism behind 'no pitch attached.'"
- **FR-8 (prd:164-165):** robots.txt-disallowed and degraded scans "fall back to Coherent Local Mode with the plain-language notice."
- **FR-9 (prd:172-173):** "Rendered Briefs contain no capability inventory, audit list, or multi-item site findings." Website-Grounded Brief "is ephemeral to the session: no public permalink, shareable URL, or indexed page".
- **FR-11 (prd:191-196):** "Domain-mode Briefs get no public permalink. UI copy makes no reproducibility promise until cache-first behavior is verified in production." / "Website-grounded Briefs have no `/s/:id` permalink." / "UI copy contains no reproducibility/verifiability promise until production verification."
- **NFR Performance (prd:246):** strike completes within `STRIKE_BUDGET_MS` or degrades to house Brief; "the existing 4s scan budget carries over."
- **NFR Security (prd:247):** "Domain input remains validated and size-limited per existing worker guards" (add:10: `WEBSITE_LENGTH_LIMIT=2048`, body 4096, `REDIRECT_LIMIT=3`).

# 3. The eight Opportunity Brief elements

Order as listed (prd:117; FR-5 says order is "defined in `result-card-contract.md`" — that companion is the normative source, not read for this extract):
1. Spark title
2. The Plan
3. Why It Fits ("with one Breadcrumb in Website-Grounded Mode")
4. What Gets Better
5. Before/After
6. Change Level — "always includes a preliminary time range plus workflow-step impact" (prd:127); time range labeled preliminary, is Hearn's estimate not a business-outcome number (prd:134)
7. What Stays the Same — the "Preservation Statement ... naming retained tools, decision authority, and untouched workflow steps" (prd:61, 128)
8. The implementation invitation (CTA) — per FR-7

Definitions in PRD: Breadcrumb (prd:57) "the single restrained, charming website detail surfaced in Why-It-Fits (Website-Grounded Mode only). Exactly one per Brief. Charming means specific and positive-or-neutral; a Breadcrumb never points out a fault and never contains a person's name or personal contact details." Other elements: PRD gives no per-element definitions beyond the above — see result-card-contract.md.

Length counter-metric (SM-C2, prd:240): "longer Briefs are not better; audit-list creep violates the one-breadcrumb ceiling."

# 4. Visitor-facing states and notices

| State | What the PRD says the visitor must / must not see | Refs |
|---|---|---|
| Downgrade / scan fallback notice | Site can't be scanned, robots.txt disallows, unreachable, unclear purpose, or below evidence threshold → Coherent Local Mode spark "with a plain-language notice — never an error wall." Downgrade "happens before generation with the plain-language notice." Notice copy: silent (ASSUMPTION prd:165 that "existing scan limits and warnings carry over"; add:10 names legacy warnings UNAVAILABLE / LIMITED / CLARITY). | prd:41,164,165,256; add:10 |
| House Brief (ledger/time exhausted) | "curated, gate-passing local house Brief — never a near-miss idea, surfaced retry state, or error wall." Whether visitor is told it's a house Brief: silent. | prd:39,53,108,113,253 |
| Rejected candidates / retries | "A rejected Candidate leaves no visible trace in the UI." No "surfaced retry state." | prd:104,39 |
| Hang / error wall | "never a hang or an error wall." | prd:113 |
| Latency expectation | "Within seconds she sees a spark"; JTBD "in under a minute"; hard `STRIKE_BUDGET_MS` cap (value not given); 4s scan budget. Loading/progress UI: silent. | prd:39,26,246 |
| Invalid input (400) | Only mentioned as measurement exclusion: "400/502 responses enter no served-outcome denominator." Visitor-facing copy for 400: silent (validation per existing worker guards). | prd:255; add:19 |
| Coordinator failure (502) | Same — measurement exclusion only. Visitor-facing presentation: silent (tension with "never an error wall" at prd:113 — see §7). | prd:255; add:19 |
| Unsupported version | Not mentioned in PRD or addendum. Silent. | — |
| Inactive receiver (no Hearn receiver ref) | "Without a current receiver ref, Oddspark renders the plain fixed contact link, sends no reference, and records no invitation event." | add:24 |
| Invitation / contact handoff | Accepted `POST /api/cheer` → "fixed `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>`. Only the opaque artifact id crosses origins, and it is resolvable only during the artifact's approved lifetime." | add:24 |
| Retention disclosure in invitation copy | "fixed reference-bearing invitation copy states the 30-day local and one-hour domain expiries and never promises later Hearn recovery." Local `/s/:id` artifacts + receipts expire 30 days after commit; domain-result TTL exactly 1h; domain Briefs get no permalink. | add:12,22,11; prd:173,191 |
| Receipt / reproducibility copy | "UI copy makes no reproducibility promise until cache-first behavior is verified in production." "Stronger receipt/reproducibility copy renders only when its exact approved claim-proof ref is current; otherwise the non-claiming copy remains." Two copy variants therefore exist: non-claiming (default) and claiming (gated). | prd:191,196,221; add:21 |
| Invalid activation config | "disables model/claim/reference features without crashing the shell." Visitor-facing presentation: silent. | add:22 |
| Local permalink `/s/:id` | Exists for local mode (30-day life). Domain mode: none. What the visitor sees on an expired permalink: silent. | add:12; prd:195 |
| /how explanation page | Not mentioned in PRD or addendum. Silent. | — |

# 5. Accessibility, responsive, i18n, privacy statements

- Accessibility: silent.
- Responsive / mobile: silent.
- i18n: "Multi-language output — English only. [ASSUMPTION.]" (prd:222, 265)
- Stateless: "Accounts, saved sparks, history — stateless per-visit experience." (prd:223)
- Privacy facts (whether shown to visitor is silent): no PII, cookies, sessions, reviews, or off-site research; PII discarded from ephemeral scan buffer; robots.txt respected; rate limiting + short-lived KV caching are an explicit carve-out "with no tracking role" (prd:162-163, 245). "Nothing else from the scan is shown; there is no audit list." (prd:41) "All research stays backstage." (prd:153) Emotional bar: "without exposing that any research happened" (prd:27).
- Retention statements the visitor DOES see: invitation copy states 30-day local / 1-hour domain expiries (add:22).

# 6. Explicit do-nots for the page

- No new inputs, fields, steps, or mode switch (prd:67,183,186,200).
- No audit list, capability inventory, multi-item site findings, fault-finding without a plan (prd:34,41,172,201).
- No near-miss, no visible retry state, no hang, no error wall (prd:39,104,113).
- No hypothetical framing, no rhetorical questions to the owner (prd:129).
- No consultant-speak, pitch voice, audit framing, hype adjectives (prd:130).
- No numeric ROI/percent/savings in local mode; no unsupported numbers anywhere; no bare mush (prd:137-139,203).
- No price for Hearn work; no pre-discovery pricing; no urgency/pressure language; no generic "contact us" (prd:140,147,148,203).
- No reproducibility/verifiability promise in UI copy until production-verified (prd:191,196,221).
- No public permalink / shareable URL / indexed page for domain-mode Briefs (prd:173,195).
- Breadcrumb: never a fault, never a person's name or personal contact detail; max one (prd:57,87,169).
- Do not optimize for button presses per visit or Brief length (SM-C1, SM-C2, prd:239-240).
- Invitation copy never promises later Hearn recovery of the artifact (add:22).
- No per-visitor tracking beyond abuse carve-out (prd:255).

# 7. Open questions / ambiguities left for UX

1. **Notice copy** for downgrade is unspecified beyond "plain-language"; PRD assumes legacy UNAVAILABLE/LIMITED/CLARITY warnings carry over (prd:165, add:10) — UX must decide whether one notice or three, and wording.
2. **House Brief disclosure**: PRD never says whether the visitor is told the Brief is a curated fallback. Silent.
3. **400 / 502 presentation**: PRD says "never an error wall" (prd:113) yet 400/502 responses exist as HTTP outcomes (prd:255). What the visitor sees for these is silent.
4. **Loading / "within seconds" state**: no guidance on progress indication, skeletons, or the playful voice during the wait; `STRIKE_BUDGET_MS` value not stated in PRD.
5. **Receipt / seed UI**: legacy "randomness with a receipt" is "the site's central joke" and presumed preserved (prd:177, add:8), but claiming copy is gated (add:21) — UX needs a non-claiming and a claiming variant, and the PRD does not say what the receipt looks like now.
6. **Two invitation variants**: reference-bearing (303 to hearn.systems with spark id, states 30-day/1-hour expiry) vs. plain fixed contact link when receiver inactive (add:22,24). Copy for both: silent beyond FR-7 constraints and the expiry statement.
7. **Expired-permalink and domain-permalink-refusal states**: silent.
8. **/how page, unsupported version, accessibility, responsive, mobile**: silent.
9. **Per-element definitions and exact order** live in `result-card-contract.md` (spec companion), not the PRD (prd:46,123).
10. **Voice rubric** and golden Briefs are pre-launch deliverables not yet in the PRD (prd:130); UX copy must be checkable against them once they exist.
11. Whether privacy/"nothing else from the scan is shown" is disclosed to visitors or merely enforced: silent.
