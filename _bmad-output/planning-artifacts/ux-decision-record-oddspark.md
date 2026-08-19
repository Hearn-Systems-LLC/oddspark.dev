---
title: UX Decision Record — oddspark
project: oddspark
date: 2026-08-17
updated: 2026-08-19
governing: true
status: final
author: BMad UX (bmad-ux) with Justin
inputs:
  - prds/prd-oddspark-2026-08-15/prd.md
  - prds/prd-oddspark-2026-08-15/addendum.md
  - architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md
  - architecture/architecture-oddspark-2026-08-15/solution-design.md
  - epics.md
  - implementation-readiness-report-2026-08-17.md
  - sprint-change-proposal-2026-08-17.md
  - implementation-readiness-report-2026-08-17-1057.md
  - sprint-change-proposal-2026-08-17-3.md
  - "as-built shell baseline: oddspark git 761c3dae989ca52a198f7b4f64a650f292fea3b9, src/worker.js::page()"
backing:
  - ux-designs/ux-oddspark-2026-08-17/DESIGN.md
  - ux-designs/ux-oddspark-2026-08-17/EXPERIENCE.md
constraint: "No FR10 / AD-10 redesign. One button, one optional domain field; revised AD-6/AD-12 authorize only D1, D1a, D2, D2a, and D3-D24."
---

# UX Decision Record — oddspark

## Purpose

Close the six UX alignment gaps in the 2026-08-17 implementation readiness report by making the preserved shell and its new visitor-facing states testable.
It does not redesign the one-button / optional-domain interaction (FR10, AD-10) and does not edit the page shell beyond the deltas listed below.
Each decision is phrased so a story dev can write a test from it; backing detail lives in `DESIGN.md` and `EXPERIENCE.md`.
This record is the governing UX companion that stories cite (UX-DR1–UX-DR6).
`DESIGN.md` and `EXPERIENCE.md` are backing spines, not a second governor.
Implementation-readiness assessments must include this file; it is not a duplicate of the spines.

## Scope and non-goals

**In scope:** eight-element card hierarchy and field mapping; accessibility baseline; loading/deadline behaviour; the state-and-copy matrix; responsive and preservation criteria; the invitation interaction contract.

**Non-goals:** new inputs, steps, or a mode switch; a new visual identity; Brief *content* wording (owned by the voice rubric and golden Briefs, Story 1.5); house-Brief catalogue content (Story 1.8); the approved receipt-claim string (Story 3.6); Hearn's contact-form behaviour (Stories 4.3–4.4, separate repo).

**Copy status:** every string in this record is a draft default. Fixed-by-source strings are marked *(fixed)*.

---

## UX-DR1 — Eight-element result-card hierarchy and field mapping

**Decision**

1. Every Brief renders all eight elements, always, in this order: Spark title, The Plan, Why It Fits, What Gets Better, Before/After, Change Level, What Stays the Same, the implementation invitation *(fixed — PRD FR-5)*.
2. Field mapping is exactly: `title` → 1; `plan` → 2; `why_fits.text` + optional `why_fits.breadcrumb` → 3; `what_gets_better` → 4; `before_after.before`/`.after` → 5; `change_level` → 6; `stays_same.tools`/`.authority`/`.steps` → 7; `invitation` → 8.
3. `notice`, when non-empty, renders as the `notice` component **above** element 1 and inside the result region. It is not one of the eight.
4. Element 6 always renders the literal word **preliminary** *(fixed)*, plus the time range, steps changed and steps removed.
5. Element 7 renders `tools`, `authority` and `steps` as three labelled `chip` groups; an empty array renders no group; all three empty renders "Nothing in the current routine is replaced."
6. At most one breadcrumb renders, only when `mode == "domain"`. Source URLs, grounding reports, scan fragments, capability inventories and multi-item findings never render.
7. `grounded_numbers` is a constraint list, never its own section.
8. Every Brief field is rendered as plain text; no field is interpreted as HTML (AD-5).
9. `mode` is the sole render branch; `personalization.status` is never consulted.
10. The three renderer surfaces are **HTML**, **`asText`** (plain text; the epics' "share" and the readiness report's "plain-text" are this one surface) and **JSON**. All three emit the same eight elements in the same order.
11. The share affordance (`/s/:id` id link and `copy link`) is omitted entirely for domain-scope Briefs — including downgraded ones. It is not rendered disabled or with an explanation.

**Rationale.** `ARCHITECTURE-SPINE.md § AD-5 — Brief is a typed schema; claim discipline is structural` fixes the data contract, PRD FR-5 fixes the order, and UX-DR1 fixes the presentation so all three renderers can be tested against one list.

**Traces to:** 1.7, 1.8, 1.15, 2.5, 2.6.
**Assumptions:** A13 (`asText` naming), A14 (share omitted), A15 (`grounded_numbers`), A16 (empty `stays_same`).
**Backing:** `EXPERIENCE.md § Component Patterns`; `DESIGN.md § Components → result-card`.

---

## UX-DR2 — Accessibility baseline

**Decision**

1. The standard is **WCAG 2.2 Level AA**.
2. The shell wrapper is `<main>`; the masthead is `<header>` and the footer `<footer>`. No `<nav>`.
3. Exactly one `h1` exists in the served HTML at all times, and never two. **Idle (and the not-found page): the masthead mark itself is the `h1`** — `<h1 class="mark">oddspark</h1>`, visually unchanged, with no extra visually-hidden heading. **After a strike: the mark reverts to `<p class="mark">` and the Spark title becomes `<h1 id="headline" tabindex="-1">`.** The server emits whichever is correct for the response it renders (idle, `/s/:id`, no-JS POST result); the JS path performs the same swap on settle. Section labels are `h2`; no level is skipped. `document.title` becomes the Spark title on settle, client and server alike.
4. DOM order equals reading order equals tab order: `website-input` → `strike-button` → result region → provenance → footer.
5. Every interactive element has a visible `:focus-visible` indicator: 2px `#6E8FB8` outline with **≥2px offset** so the ring sits on `#0B0D10` (5.82:1) — never inset, never `outline-offset: 0` (an inset ring on the accent fill measures 1.0–1.76:1 and fails). This includes `copy link` and `website-input`. Every interactive target is ≥24×24 CSS px (WCAG 2.5.8): `copy link` and the footer links take `padding: 4px 0` / `min-height: 24px` rather than relying on the current spacing exception, which breaks when the footer wraps at 320px. Chips are non-interactive and out of 2.5.8 scope.
6. **The result region is not a live region.** One dedicated `<p id="status" role="status" aria-live="polite">` (visually hidden, or the strike-note slot) carries exactly three transient messages: "Working. Your spark takes a few seconds.", "Link copied", and the 502 / not-found sentence. `notice` carries `role="note"` plus a visually-hidden "Note:" lead-in — never `alert`, never `status`. The 400 field message carries **no** role; it has a stable `id`, exists empty in the DOM at load, and the input points at it with `aria-describedby` while `aria-invalid="true"`. `role="alert"` is used nowhere: enhanced-path outcomes use the deliberate focus choreography below, while fresh documents rely on semantic order and headings, so an alert would create a competing announcement.
7. `aria-busy="true"` sits on the **result region** — the thing being updated — for the duration of a strike, never on the button. `strike-button` uses `aria-disabled="true"` with clicks ignored, never the `disabled` attribute, which drops keyboard focus to `<body>` in Chromium and Firefox and breaks 2.4.3 mid-strike.
8. `website-input` keeps an explicit `<label for="website">`; the placeholder is never the label.
9. Text contrast is ≥4.5:1 and identifying UI/border contrast ≥3:1. Four rules, all with computed ratios in `DESIGN.md § Contrast statement`:
   - `--faint` (`#3D4750`, 2.05:1) **and** `--dim` (`#67737F`, 4.02:1 on void / 3.82:1 on panel) are retired from **every** text role — `h2` section labels, `.live`, the question line, the `observed`/`seed` provenance values, the formula panel, site-context, field labels, chip prefixes, legend labels, footer — and replaced by `--dim-raised` `#7E8B98` (5.59:1 void, 5.31:1 panel).
   - `--rule` (`#1D242C`, 1.24:1) stays as a decorative hairline divider but is **not** an identifying control boundary: `website-input` and `chip` take a new `--border-strong` `#7E8B98` (5.59:1 on void, 5.31:1 on its own panel fill), satisfying 1.4.11.
   - A new fixed `--gold` `#C9A227` (8.04:1) carries every gold **text** role — provenance hot values, the `?` glyph, the accent bar, invitation link/button — so they never ride the live accent. `--solar` drives only the masthead accent half, the live dot, the strike-button background and the Seed Geometry canvas.
   - The button label is `#0B0D10` on B/C/M/X accents (5.37 / 8.04 / 5.84 / 5.25 — all pass) and flips to `#E4EAF0` on **A-class only** (void 3.31 fail → heading 4.85 pass). It must **not** flip on B: `#E4EAF0` on `#5E8CA8` is 2.99:1. The 13px/700 label is not WCAG large text, so 4.5:1 is the bar.
10. The existing `prefers-reduced-motion: reduce` rule (CSS and JS) is preserved; no new state introduces motion.
11. The Seed Geometry `<canvas>` is decorative: `aria-hidden="true"`, outside the tab order; the text legend beneath carries the same information. **WCAG 2.2.2:** the rotation and corona pulse stop automatically after **≤5 seconds** unless the stage is hovered or keyboard-focused. `prefers-reduced-motion` alone does not satisfy 2.2.2 (it is an OS setting, not a page mechanism); no visible control is added, which would breach FR10.
12. `/how` has **four** Mermaid diagrams (CDN-loaded), not one. Each carries its own accessible title and description and its own always-rendered plain-language ordered list of the same steps. The plain-language content has **no dependency on the CDN**, so no `<noscript>` block is needed or added. The raw `<pre class="mermaid">` source is hidden until processed; each rendered SVG is `aria-hidden` (the list is the equivalent); diagram strokes are ≥3:1; each `overflow-x` scroller is `tabindex="0"` with an accessible name.
13. **Acceptance-test baseline:** (a) `axe-core` reports zero serious/critical violations on `/` idle, `/` with local / domain / downgrade / house Briefs, the 400 and 502 states, `/s/:id`, the not-found page and `/how`; (b) a manual keyboard-only walkthrough of strike → result → invitation; (c) the **eight enumerated manual checks** in `EXPERIENCE.md § Accessibility Floor` — settle announcement on one SR + browser; focus continuity through the busy state; the 400 `aria-describedby` path; all five accent classes measured; the no-JS full path; motion stop/resume; 320px reflow and target sizes; permalink and 404 with JS off. Each is a pass/fail line in the Story 1.22 report.

**Rationale.** No source named a standard; the as-built shell fails contrast on six text roles and starts at `h2`. Naming AA and the axe baseline turns "accessibility is consistent" (Story 1.15 AC) into a runnable check.

**Traces to:** 1.15, 1.22.
**Assumptions:** A1 (WCAG 2.2 AA), A2 (`faint` + `dim` retired), A3 (button label flip, A-class only), A5 (input focus ring), A20 (persistent `h1`, masthead-as-`h1` idle), A22–A27, A29–A31.
**Backing:** `EXPERIENCE.md § Accessibility Floor`; `DESIGN.md § Colors → Contrast statement`.

---

## UX-DR3 — Loading, deadline, retry suppression, focus announcement

**Decision**

1. On submit, `strike-button` takes `aria-disabled="true"` and its loading label and ignores further activation; `aria-busy="true"` goes on the **result region**. It re-enables exactly once, on settle (success, 400, 502 or any other outcome). The `disabled` attribute is never used — it drops keyboard focus to `<body>`.
2. Loading labels are `Scanning` (only while `website-input` is non-empty, first 250ms) then `Striking` *(fixed — as-built)*. Settled label is `Strike again` *(fixed — as-built)*.
3. Button disabling is the **entire** retry-suppression mechanism. No client-side timer, throttle, backoff or re-press counter exists.
4. No spinner, skeleton, progress bar, percentage or elapsed-time display renders at any point. The only wait affordance beyond the button label is the live-region sentence "Working. Your spark takes a few seconds."
5. Server-side retries and internal attempts produce no visible state change.
6. The client enforces no timeout and never aborts the request; the server's provisional 15-second strike ceiling is the only deadline. Reaching it produces a house Brief, which renders as an ordinary Brief with the house-Brief notice (UX-DR4).
7. **On settle there is exactly one focus move and exactly one announcement.**
   - In-place enhanced-path Brief renders → the status region is cleared first, then focus moves once to `h1[tabindex="-1"]` (the Spark title). The heading is announced by the focus move alone.
   - In-place enhanced-path 400 → the message is written to `#website-error`, the input gains `aria-invalid` + `aria-describedby`, focus moves to the input.
   - In-place enhanced-path 502 → the sentence goes into the status region, which takes `tabindex="-1"` and receives focus. Focus was never dropped, because the button used `aria-disabled`.
   - Fresh full-document HTML 400 / 502 / 404 → no scripted focus is set; document order and the server-rendered heading govern the initial reading position.
8. The `notice` is **not** announced through a live region. It precedes the `h1` in the DOM with `role="note"` and a visually-hidden "Note:" lead-in, so a screen-reader user reaching the focused heading has it immediately above; announcing it as well would produce a double read and queue the whole card behind it.
9. **Native form / no-JS path (D1, D1a, D2, D2a).** `/api/spark` follows AD-12's deterministic representation precedence: explicit `Accept: application/json` wins even with a form-encoded body; otherwise, a request accepting HTML or carrying a browser-form content type receives shell HTML; remaining requests preserve the existing JSON representation. An HTML request in **local request scope** returns `303` to `/s/:id`, whose followed GET server-renders the full shell so refresh re-reads the permalink instead of re-striking. An HTML request in **domain request scope**, including a downgraded result, returns direct `200` home-shell HTML from `/api/spark`; the browser URL remains `/api/spark`, no redirect, permalink, or history mutation occurs, and refresh may re-post through the same authoritative domain claim/read path. A negotiated HTML 400 returns the shell with the message associated to the input; a negotiated HTML 502 returns the shell with the sentence in the status region. The enhanced path uses `fetch` with `Accept: application/json`, renders in place, and after a permalink-eligible local-scope strike updates the URL to `/s/:id` with `history.replaceState` (not `pushState`); domain request scope, including downgrade, leaves its current page URL unchanged. Fresh full-document HTML responses set no scripted focus. "400 behaviour unchanged" (Story 1.16) applies to the JSON representation only. AD-12 owns response headers, caching, and metric increment points; this record owns the shell presentation and focus behavior.

**Rationale.** The PRD promises "within seconds" while the architecture defines a hard deadline and no user-facing behaviour. Suppressing retries at the button — rather than with timers — keeps the interaction at one button and makes the state binary and testable.

**Traces to:** 1.13, 1.15, 1.16, 1.23, 2.1.
**Assumptions:** A11 (no spinner), A12 (no client timeout), A22 (single status region), A23 (`aria-disabled` + region-level `aria-busy`), A24 (400 association), A28 (content negotiation + `replaceState`).
**Backing:** `EXPERIENCE.md § Interaction Primitives`.
**Architecture:** revised AD-6 and AD-12.

---

## UX-DR4 — State-and-copy matrix

**Decision** — the visitor sees exactly one of these, and the shell always remains on screen.

| State | Visitor-visible copy (draft, plain text) | Retry |
|---|---|---|
| Loading | Button "Scanning"/"Striking"; live region "Working. Your spark takes a few seconds." | suppressed |
| Success — local | Eight-element card; id / `copy link` / `json` in footer | yes |
| Success — domain | Eight-element card with one breadcrumb; **no** id link, **no** `copy link`; `json` for one hour | yes |
| Downgrade — scan insufficiency | Notice above the title: "No usable pages came back from your website, so this plan is built from local patterns only." | yes |
| Pre-activation domain request | Notice above the title: "Website reading is not switched on yet, so this plan is built from local patterns only." | yes |
| House Brief | An ordinary local Brief with a quiet notice above the title: "This plan is one of ours, not built for you." No badge, no error styling, no other visual difference | yes |
| Invalid input (400) | Shell stays; `website-input` gets `aria-invalid="true"` + `aria-describedby="website-error"` and the API's stable field message renders into that element (no `role`); the enhanced path moves focus to the input, while fresh HTML sets no scripted focus; no strike starts; button returns to "Strike" | yes |
| Coordinator uncertainty (502) | Shell stays; the sentence "No spark this time — a part of the system did not answer. Press Strike again." is written into the status region; the enhanced path gives it `tabindex="-1"` and focus, while fresh HTML sets no scripted focus | yes |
| Unsupported version on `/` | Treated as a cache miss; a normal Brief renders; no visitor-visible difference | yes |
| Unsupported / expired / domain / unknown permalink | Shell with an empty result region and "That spark is no longer available. Press Strike for a new one."; button reads "Strike"; HTTP `404` | yes |
| Inactive receiver | Element 8 is a plain link to `https://hearn.systems/contact` *(fixed URL)*; no POST, no spark id, no event | n/a |
| Non-claiming receipt (default) | "seed = SHA256( randomness : round : flux : time_tag ). Every input above is published and archived." — inputs only, no reproducibility promise | n/a |
| Claiming receipt (gated) | The approved hash-bound string from the current `ReceiptClaimManifest` replaces the line above; wording owned by Story 3.6 | n/a |
| Retention disclosure | Always, adjacent to element 8: "Local references expire 30 days after they are created; website references expire one hour after they are created." No countdown, no recovery promise *(content fixed)* | n/a |

Additional rules:
1. **Three notice strings, one field.** `notice` carries all three causes; the scan-downgrade, pre-activation and house-Brief strings are distinct and each is stable.
2. No state renders as a full-page error, an error wall, a toast, a modal or a dismissible alert.
3. Rejected candidates, near-miss ideas, retry counts and the legacy seed are never rendered in any state.
4. `notice` never uses the error colour and never carries an icon.
5. The 400 body/copy is documented as-is and **not changed** — Story 1.16 requires "stable 400 behavior". That applies to the **JSON representation only**; the HTML representation returned to a no-JS form POST is new and is governed by UX-DR3.9.
6. `notice` carries `role="note"` with a visually-hidden "Note:" lead-in in every state that renders one, and every notice string names its cause in words.

**Rationale.** The "never an error wall" requirement in PRD UJ-1/UJ-2 and FR-4 Consequences, together with `ARCHITECTURE-SPINE.md § Failure precedence`, is satisfied by AD-12's content-negotiated JSON or shell-HTML representations while preserving the terminal 400/502 statuses and a live retry path. Quietly disclosing house Briefs (Justin, 2026-08-17) keeps the owner-voice honesty promise without a badge or error framing; rejected Candidates still leave no visible trace.

**Traces to:** 1.8, 1.14, 1.15, 1.16, 1.20, 1.21, 1.23, 1.26, 2.4, 2.6, 2.9, 3.6, 4.2.
**Assumptions:** A4, A7, A9, A10, A21. (A8 decided by Justin 2026-08-17: quiet disclosure.)
**Backing:** `EXPERIENCE.md § State Patterns`.

---

## UX-DR5 — Responsive and preservation criteria

**Decision**

1. Breakpoints `920px` and `520px` and the grid template at each are preserved verbatim: two-column with sticky visualization above 920px; single stacked column below; reduced serif sizes and single-column provenance below 520px.
2. The **only** responsive change is `chip { white-space: normal }`, so the chip row wraps inside the 20px gutter instead of overflowing on phones.
3. No new breakpoint, no light theme, no `prefers-color-scheme` branch.
4. **Preservation checklist** — Story 1.15 asserts each of these against the as-built baseline:
   1. Served HTML element order: header → strike row → error region → result region → Seed Geometry → Provenance → footer.
   2. The strike row holds exactly one button and exactly one optional input, input first, label "website, optional", placeholder `example.com`.
   3. Button labels `Strike` / `Scanning` / `Striking` / `Strike again`.
   4. Strike note default (non-claiming): "One idea, seeded by the sun and a randomness beacon." The sentence "Same window, same spark." is claim-gated (Story 3.6 / D24), not preserved as-built.
   5. Masthead `oddspark` with the accented second half; live readout `<class> · SUN NOW`, degrading to `---- · SUN NOW`.
   6. Section headings "Seed Geometry" and "Provenance"; the seven provenance row labels; the formula panel.
   7. Footer contents and order: id cluster (local only), `how does this work?`, `drand · NOAA SWPC`, `built by Hearn.`, neuron meter.
   8. All `DESIGN.md` tokens except the lines tagged `[ASSUMPTION]` there — **seven** token decisions (`notice-surface`/`notice-edge`, `dim-raised`, `gold`, `border-strong`, `website-input.focusRing`, `chip.whiteSpace`, `footer-link.minHeight`/`viz-stage.motionStop`), each carrying a Delta row below. No untagged `DESIGN.md` value differs from the deployed CSS: `chip.padding` is `4px 9px`, `accent-bar.paddingLeft` is `14px`, the provenance hot values are `flux` and `class` only, and the `.idea` 1px `rule` top divider is recorded as `result-card-idea`.
   9. Breakpoints 920 / 520 and their grid templates.
   10. The reduced-motion rule in both CSS and JS.
   11. Zero border radius everywhere except `live-dot`.

**Rationale.** "Keep the exact interaction" is not testable; an enumerated checklist is. The chip overflow is a defect visible in `screenshot-phone.png`, not a redesign.

**Traces to:** 1.1, 1.15, 1.16, 2.9.
**Assumptions:** A6 (chip wrap).
**Backing:** `EXPERIENCE.md § Responsive & Platform`; `DESIGN.md § Layout & Spacing`.

---

## UX-DR6 — Invitation interaction contract

**Decision**

1. **Active receiver:** element 8 is a native `<form method="post" action="/api/cheer">` with the validated spark id and anti-abuse fields as hidden inputs and one submit button whose label is the Brief's `invitation` text. Acceptance returns a fixed `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>` *(fixed)*.
2. **Inactive receiver:** element 8 is a plain `<a href="https://hearn.systems/contact">` *(fixed)* inside the invitation sentence. No form, no POST, no id, no event. Nothing on screen marks this as degraded.
3. **Progressive enhancement:** both postures function with JavaScript disabled. No script is required for the invitation in either posture.
4. **Failed submission** (invalid input, origin, artifact, expiry, rate limit, or COORD uncertainty): the visitor returns to the fully rendered Brief with the invitation region showing "That link could not be opened. Use the contact page directly." plus the plain contact link. No event is recorded; Brief content is unchanged.
5. **Focus restoration:** after a failed submission focus moves to that message. After success the visitor has left the origin; no restoration applies.
6. **External navigation:** both postures navigate in the **same tab**; neither uses `target="_blank"`. A `303` cannot open a new tab, so same-tab is the only behaviour identical across postures.
7. The plain link is never instrumented; clicks in inactive posture are invisible to SM-1 by design.
8. The retention disclosure renders adjacent to element 8 in **both** postures.
9. The invitation carries no price, no urgency, no deadline, no generic "contact us", and explicitly permits **"not worth changing"** *(fixed constraint — FR-7)*.
10. Only the opaque artifact id crosses origins — never a domain, Brief text, title, seed, Evidence, or visitor data.

**Rationale.** A native POST/303 is the only mechanism that satisfies "no new client state" and works without JS. Making the two postures visually and navigationally symmetric prevents the fallback from reading as a failure.

**Traces to:** 1.15, 4.1, 4.2, 4.3, 4.4.
**Assumptions:** A17 (same tab), A18 (failed-POST behaviour), A19 (native form for the strike itself), A21 (disclosure always).
**Backing:** `EXPERIENCE.md § Interaction Primitives → invitation contract`.

---

## Deltas from the as-built shell

These are the only UX/shell deltas this record specifies. Revised AD-6 authorizes every row in this closed table — D1, D1a, D2, D2a, and D3–D24 — while AD-12 owns its transport, route, caching, refresh, metric, and representation semantics. Everything else is preserved and requires architecture reconciliation.

| # | Delta | Why | Story |
|---|---|---|---|
| D1 | Wrap the strike row in a native `<form method="post" action="/api/spark">` — today the button is JS-only (`btn.onclick` → `fetch`), with no `<form>` at all | UX-DR6.3 progressive enhancement | 1.15 |
| D1a | Content-negotiate `/api/spark` with AD-12 precedence: explicit `Accept: application/json` wins; otherwise HTML acceptance or browser-form content selects shell HTML (`303 /s/:id` for local request scope; direct `200` home-shell HTML with the browser remaining at `/api/spark` for domain request scope, including downgrade) | UX-DR3.9 | 1.15, 1.16 |
| D2 | Server-render `/s/:id` content — today the permalink serves an empty card and hydrates from `BOOT` via JS | Permalinks must work without JS and be indexable | 1.15 |
| D2a | The enhanced path uses `history.replaceState` to `/s/:id` after a permalink-eligible local-scope strike (today: `pushState`) and leaves its current page URL unchanged for domain request scope, including downgrade. The native domain form is separately governed by D1a and remains at its `/api/spark` action URL | UX-DR3.9 — no domain path mints a permalink | 1.15 |
| D3 | Add `<main>` around the shell | UX-DR2.2 | 1.15 |
| D4 | Make the masthead mark the `h1` when idle, and swap it to `<p>` while the Spark title takes the `h1` after a strike — one `h1` at all times, server-emitted and JS-swapped | UX-DR2.3 | 1.15 |
| D5 | Add **one** `<p id="status" role="status" aria-live="polite">` for "Working…", "Link copied" and the 502 sentence. The result region is **not** a live region and `role="alert"` is used nowhere; 400 uses `aria-invalid` + `aria-describedby` to a role-less `#website-error`; `notice` uses `role="note"` + a visually-hidden "Note:" | UX-DR2.6, UX-DR3.7–8 | 1.15, 1.16 |
| D6 | Put `aria-busy="true"` on the **result region** during a strike, and use `aria-disabled="true"` + ignored clicks on `strike-button` instead of the `disabled` attribute, which drops keyboard focus | UX-DR2.7, UX-DR3.1 | 1.15 |
| D7 | Add visible focus indicators to `website-input` and `copy link` | UX-DR2.5 | 1.15 |
| D8 | Replace `--faint` **and `--dim`** with `--dim-raised` `#7E8B98` on all text roles: `h2` section labels, `.live`, the question line, the `observed`/`seed` provenance values, the formula panel, site-context, field labels, chip prefixes, legend labels, footer, input placeholder | UX-DR2.9 | 1.15 |
| D9 | Flip the button label to `#E4EAF0` on **A-class accents only**; keep `#0B0D10` on B/C/M/X (B passes at 5.37; `#E4EAF0` on B fails at 2.99) | UX-DR2.9 | 1.15 |
| D10 | `chip { white-space: normal }` | UX-DR5.2 | 1.15 |
| D11 | Add the `notice` component (panel + 2px entropy left bar) above the Spark title | UX-DR4 | 1.15, 1.16 |
| D12 | Add the invitation form / link and the retention disclosure to element 8 | UX-DR6 | 1.15, 4.1, 4.2 |
| D13 | Mark the Seed Geometry canvas `aria-hidden="true"` and remove it from tab order | UX-DR2.11 | 1.15 |
| D14 | Render 400/502 inside the shell rather than as plain-text HTTP bodies | UX-DR4 | 1.15, 1.16 |
| D15 | Add the shared not-found/expired page | UX-DR4 | 1.15, 1.21, 2.6 |
| D16 | Rewrite `/how`: accessible title/description on **each of the four** diagrams, an always-rendered ordered list per diagram with no CDN dependency, hidden pre-render source, ≥3:1 diagram strokes, focusable named scrollers | UX-DR2.12 | 1.22 |
| D17 | New fixed `--gold: #C9A227` token for gold **text** roles (provenance hot values, `?` glyph, accent bar, invitation link/button). `--solar` is limited to the masthead accent, live dot, button fill and canvas | UX-DR2.9 | 1.15 |
| D18 | New `--border-strong: #7E8B98` as the resting boundary of `website-input` and `chip`, replacing `--rule` (1.24:1) which cannot identify a control under 1.4.11. `--rule` stays on decorative dividers | UX-DR2.9 | 1.15 |
| D19 | Seed Geometry canvas stops animating after ≤5s unless hovered or keyboard-focused, in addition to `prefers-reduced-motion` | UX-DR2.11, WCAG 2.2.2 | 1.15 |
| D20 | `copy link` and the footer links get `padding: 4px 0` / `min-height: 24px` so each target is ≥24×24 CSS px independent of the spacing exception; `copy link` also announces "Link copied" through the status region, and is omitted when the page is served without JS enhancement | UX-DR2.5, WCAG 2.5.8 | 1.15 |
| D21 | The provenance formula panel renders the **non-claiming** copy by default: "seed = SHA256( randomness : round : flux : time_tag ). Every input above is published and archived." — replacing the as-built "Recompute it yourself; …". Story 3.6 gates the claiming string | UX-DR4 | 1.15, 3.6 |
| D22 | The result-card interior is replaced by the eight-element order: the `site-context` block and the `?` glyph's decorative role retire, and section labels become the six Brief headings | UX-DR1.1 | 1.15 |
| D23 | Focus rings are re-worded and re-implemented as 2px `#6E8FB8` with ≥2px **offset** — never inset, never `outline-offset: 0` (inset on the accent fill measures 1.0–1.76:1) | UX-DR2.5 | 1.15 |
| D24 | Strike note default drops the as-built sentence "Same window, same spark." Default is "One idea, seeded by the sun and a randomness beacon." That second sentence renders only when the current ReceiptClaimManifest authorizes those exact words. | UX-DR4, UX-DR5.4.4, FR-11, AD-7 | 1.15, 3.6 |

## Conflicts resolved

The ambiguities from the epics/readiness extraction:

1. **One `notice` field, multiple causes** → three distinct stable strings (scan downgrade, pre-activation, house Brief), one row each in the UX-DR4 matrix.
2. **"share" vs "plain-text" renderer** → one surface, named **`asText`**.
3. **1.15 invitation trace reconciled** → 1.15 now depends on UX-DR1–UX-DR6, renders element 8 in **plain-link posture**, and asserts its presence, order and copy; POST/303 activation remains tested by 4.2/4.4. This was a documentation correction with no scope change.
4. **Two POST targets** → the form `action` is `/api/cheer`; `/api/cheer` returns the `303` to `hearn.systems`. Failed-POST behaviour is UX-DR6.4.
5. **Retention disclosure visibility** → always, on the card, adjacent to element 8, in both postures.
6. **Inactive receiver and SM-1** → the plain link is deliberately uninstrumented; UX-DR6.7 states it so no story adds tracking to close the gap.
7. **Expired/refused reads have no visitor state** → one shared not-found page, HTTP `404`, live Strike button (UX-DR4, D15).
8. **400 "stable behavior" vs new copy** → the 400 **JSON** response is unchanged; the HTML representation returned to a no-JS form POST is new and is governed by UX-DR3.9. No conflict with Story 1.16.
9. **502 has no rendering owner** → owned here (UX-DR4); tested by 1.15's rendering fixtures and 2.9's error-behaviour coverage.
10. **"Within seconds" has no story** → UX-DR3 is testable via 1.15's accessibility/rendering fixtures (button `aria-disabled` + result-region `aria-busy` + status-region text). No new story required.
11. **Receipt-claim copy in three places** → `/how`, the formula panel, and the strike note switch **together**, all driven by the same current `receipt_claim_ref`; all three render non-claiming copy by default.
12. **Legacy crosswalk drift in historical readiness reports** → current artifacts use Stories 4.1–4.4, 3.3 and 3.6. Timestamped readiness reports remain immutable; future assessments use the current `epics.md` mapping.
13. **Domain-mode share affordance** → **omitted entirely**, not disabled and not explained (UX-DR1.11).

14. **Announcement vs focus double-read** → resolved in favour of focus: one status region for transient sentences, no live result region, no `role="alert"`, exactly one focus move per settle (UX-DR2.6, UX-DR3.7).
15. **Preservation checklist vs as-built DOM order** → the strike row is **input first, then button**; the earlier "in that DOM order" wording in `EXPERIENCE.md` read backwards and is corrected.
16. **Unenumerated shell edits** → the non-claiming formula copy, the card-interior restructure, the `--dim` text swaps and every `DESIGN.md` value that differs from the deployed CSS are now Deltas (D8, D17–D24), so the Deltas table remains the single authorising list.

These decisions remain within the approved product scope. Revised AD-6 authorizes exactly the closed delta table, while AD-12 owns its transport and representation subset. This UX record grants no authority outside those contracts.

## 2026-08-19 ownership reconciliation

No visitor-facing behavior, copy, layout, accessibility requirement, or state transition changes. Stories 1.15–1.16 own representation, rendering, request hardening, and the closed inactive-domain dispatch contract. Story 1.23 owns assembly and offline proof of the canonical cold writer path. Story 1.26 owns production local-only activation. A valid domain during the activated local-only phase follows Story 1.16's closed dispatch through Story 1.23's canonical assembled writer under Story 1.26 activation authority.

## Resolved owner decisions

No UX question remains open. Justin reviewed this set on 2026-08-17: A8 was set to quiet disclosure; A19, A7 and A14 were explicitly retained; A3 was corrected. See `EXPERIENCE.md § Resolved Decision Register` (A1–A31) for the full audit trail and the story each gates. The retained `[ASSUMPTION]` labels record decision provenance, not implementation freedom.

The five implementation-significant decisions retained in the record:

1. **A8 — resolved.** House Briefs carry a quiet disclosure notice (Justin, 2026-08-17). Wording is a draft routed with the other notice strings to the Story 1.5 voice review.
2. **A19 — retained.** The strike becomes a native form. This is the largest delta (D1), touches the preserved shell and is bounded by AD-12.
3. **A7 — retained.** Three distinct notice strings remain; their draft wording follows the Story 1.5 owner-voice review.
4. **A14 — retained.** The domain share affordance is omitted silently because an explanation would expose that a scan happened.
5. **A3 — corrected.** The button label flips to `#E4EAF0` on **A-class only**. The original "A and B" rule was based on a wrong estimate: on B, `#0B0D10` already passes at 5.37:1 and `#E4EAF0` would fail at 2.99:1. This and the new fixed `--gold` token are the only decisions that touch live-accent behaviour.
