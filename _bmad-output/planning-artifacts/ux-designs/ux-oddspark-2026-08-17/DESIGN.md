---
name: oddspark
description: The visual identity of the preserved oddspark one-button shell and the result card, notice, and invitation states built on top of it
status: final
created: 2026-08-17
updated: 2026-08-19
sources:
  - prds/prd-oddspark-2026-08-15/prd.md
  - prds/prd-oddspark-2026-08-15/addendum.md
  - architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md
  - architecture/architecture-oddspark-2026-08-15/solution-design.md
  - epics.md
  - implementation-readiness-report-2026-08-17.md
  - implementation-readiness-report-2026-08-17-1057.md
  - sprint-change-proposal-2026-08-17-3.md
  - "as-built shell baseline: oddspark git 761c3dae989ca52a198f7b4f64a650f292fea3b9, src/worker.js::page()"
colors:
  void: '#0B0D10'
  panel: '#101419'
  rule: '#1D242C'
  text: '#C6CFD8'
  dim: '#67737F'               # non-text only (see Contrast statement); retired from every content text role
  faint: '#3D4750'
  entropy: '#6E8FB8'
  solar-a: '#4A6785'
  solar-b: '#5E8CA8'
  solar-c: '#C9A227'
  solar-m: '#E06A3F'
  solar-x: '#F2452E'
  heading: '#E4EAF0'
  error: '#E06A3F'
  warning: '#D89372'
  oxide: '#B4502E'
  notice-surface: '#101419'      # [ASSUMPTION] reuses {colors.panel}; no new surface value invented
  notice-edge: '#6E8FB8'         # [ASSUMPTION] 2px left rule on the notice, reuses {colors.entropy}
  dim-raised: '#7E8B98'          # [ASSUMPTION] replacement for {colors.faint} AND {colors.dim} on text that must be read
  gold: '#C9A227'                # [ASSUMPTION] FIXED brand gold for text roles; byte-identical to {colors.solar-c} but never re-set by the solar feed
  border-strong: '#7E8B98'       # [ASSUMPTION] identifying boundary of interactive/bounded controls; 5.59:1 on void, 5.31:1 on panel
typography:
  body:
    fontFamily: '"Courier Prime", ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  h1:
    fontFamily: '"Newsreader", Georgia, serif'
    fontSize: 31px
    fontWeight: '400'
    lineHeight: '1.24'
    letterSpacing: -0.01em
  h1-mobile:
    fontFamily: '"Newsreader", Georgia, serif'
    fontSize: 25px
    fontWeight: '400'
    lineHeight: '1.24'
  premise:
    fontFamily: '"Newsreader", Georgia, serif'
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.62'
  premise-mobile:
    fontFamily: '"Newsreader", Georgia, serif'
    fontSize: 16.5px
    lineHeight: '1.62'
  question:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 12.5px
    lineHeight: '1.65'
  h2:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 10.5px
    fontWeight: '400'
    letterSpacing: 0.24em
    note: uppercase, {colors.dim-raised}
  label:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 10.5px
    letterSpacing: 0.08em
    note: lowercase
  input:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 12px
  button:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 13px
    fontWeight: '700'
    letterSpacing: 0.22em
    note: uppercase
  note:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 11.5px
    letterSpacing: 0.04em
  mark:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 13px
    fontWeight: '700'
    letterSpacing: 0.14em
    note: lowercase
  live:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 11px
    letterSpacing: 0.1em
  chip:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 10.5px
  prov-field:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 11.5px
  formula:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 11px
    lineHeight: '1.7'
  footer:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 11px
  legend:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 10.5px
    lineHeight: '1.8'
rounded:
  DEFAULT: 0px
  sm: 0px
  md: 0px
  lg: 0px
  full: 9999px    # only {components.live-dot}
spacing:
  unit: 2px
  gutter: 20px
  page-max: 660px
  page-max-wide: 1760px
  viz-min: 322px
  column-gap: 54px
  header-y: 22px 0 18px
  strike-row-y: 44px 0 40px
  strike-row-gap: 18px
  card-top: 34px
  prov-top: 44px
  footer-top: 34px
  footer-gap: 8px 22px
  bp-wide: 920px
  bp-phone: 520px
components:
  strike-button:
    background: '{colors.solar-*}'   # the live accent; C-class is the default
    color: '{colors.void}'
    typography: '{typography.button}'
    padding: 14px 30px
    border: none
    borderRadius: '{rounded.DEFAULT}'
    focusRing: 2px solid {colors.entropy}, offset 3px
    busyOpacity: '0.45'          # applied alongside aria-disabled; the disabled attribute is never used
  website-input:
    background: '{colors.panel}'
    color: '{colors.text}'
    border: 1px solid {colors.border-strong}   # [ASSUMPTION] was {colors.rule} (1.24:1); 1.4.11 needs 3:1 on the resting boundary
    placeholderColor: '{colors.dim-raised}'
    borderRadius: '{rounded.DEFAULT}'
    padding: 11px 12px
    width: 250px
    typography: '{typography.input}'
    focusBorder: '{colors.entropy}'
    focusRing: 2px solid {colors.entropy}, offset 2px   # [ASSUMPTION] new; 1px border alone is not a visible-enough indicator
    invalidBorder: '{colors.error}'
  field-label:
    color: '{colors.dim-raised}'
    typography: '{typography.label}'
  strike-note:
    color: '{colors.dim-raised}'
    typography: '{typography.note}'
  result-card:
    background: transparent
    paddingTop: '{spacing.card-top}'
    minHeight: 150px
    titleColor: '{colors.heading}'
    titleTypography: '{typography.h1}'
    bodyColor: '{colors.text}'
    bodyTypography: '{typography.premise}'
  section-heading:
    color: '{colors.dim-raised}'
    typography: '{typography.h2}'
  accent-bar:
    borderLeft: 2px solid {colors.gold}
    paddingLeft: 14px
  notice:
    background: '{colors.notice-surface}'
    borderLeft: 2px solid {colors.notice-edge}
    color: '{colors.text}'
    typography: '{typography.note}'
    padding: 10px 14px
    borderRadius: '{rounded.DEFAULT}'
  chip:
    border: 1px solid {colors.border-strong}   # [ASSUMPTION] was {colors.rule}; matched to the input so the two bounded shapes share one boundary token
    color: '{colors.text}'
    prefixColor: '{colors.dim-raised}'
    typography: '{typography.chip}'
    padding: 4px 9px
    borderRadius: '{rounded.DEFAULT}'
    whiteSpace: normal    # [ASSUMPTION] changed from nowrap; see Do's and Don'ts
  invitation-link:
    color: '{colors.gold}'
    typography: '{typography.body}'
    textDecoration: underline
    focusRing: 2px solid {colors.entropy}, offset 3px
  invitation-button:
    background: transparent
    color: '{colors.gold}'
    border: 1px solid {colors.gold}
    typography: '{typography.button}'
    padding: 12px 24px
    borderRadius: '{rounded.DEFAULT}'
    focusRing: 2px solid {colors.entropy}, offset 3px
  retention-note:
    color: '{colors.dim-raised}'
    typography: '{typography.note}'
  prov-table:
    layout: dl, dt over/left of dd
    labelColor: '{colors.dim-raised}'
    coolValueColor: '{colors.entropy}'
    hotValueColor: '{colors.gold}'
    hotValueFields: flux, class    # as-built; observed and seed are NOT hot
    typography: '{typography.prov-field}'
    dividers: 1px solid {colors.rule}
  formula-panel:
    background: '{colors.panel}'
    borderLeft: 2px solid {colors.entropy}
    color: '{colors.dim-raised}'   # [ASSUMPTION] as-built is {colors.dim} (3.82:1 on panel); see Delta D8
    typography: '{typography.formula}'
  footer-link:
    color: '{colors.dim-raised}'
    hoverColor: '{colors.entropy}'
    typography: '{typography.footer}'
    padding: 4px 0
    minHeight: 24px       # [ASSUMPTION] WCAG 2.5.8; see Do's and Don'ts
    focusRing: 2px solid {colors.entropy}, offset 3px
  live-dot:
    background: '{colors.solar-*}'   # live
    borderRadius: '{rounded.full}'
    animation: breathe 4.2s ease-in-out infinite
  viz-stage:
    aspectRatio: 1 / 1.06
    maxHeight: 352px
    maxHeightWide: min(82vh, 1100px)
    ariaHidden: 'true'
    motionStop: 'animation stops after <=5s unless hovered or focused'   # [ASSUMPTION] WCAG 2.2.2
  result-card-idea:
    borderTop: 1px solid {colors.rule}   # as-built .idea rule; the card itself has no border or fill
---

# oddspark — Visual Identity

> This file **documents the shell that already exists** (`src/worker.js` `page()`), plus the small number of tokens the new states genuinely require. It is not a rebrand. Every value above is read from the deployed CSS except the lines tagged `[ASSUMPTION]` — there are **seven distinct token decisions**: `notice-surface` / `notice-edge`, `dim-raised`, `gold`, `border-strong` (input + chip), `website-input.focusRing`, `chip.whiteSpace`, and `footer-link.minHeight` / `viz-stage.motionStop`. Each is enumerated in the record's Deltas table. Nothing else differs from the deployed CSS. The `[ASSUMPTION]` tags preserve decision provenance; all are accepted defaults in `EXPERIENCE.md § Resolved Decision Register`. Behaviour lives in `EXPERIENCE.md`; the testable contract lives in `../../ux-decision-record-oddspark.md`.

## Brand & Style

A terminal that happens to be beautiful. Near-black ground, monospace body, one serif voice reserved for the idea itself, one accent colour taken from the sun's current X-ray class. Nothing is rounded, nothing floats, nothing is decorated: structure is drawn with 1px rules and 2px accent bars. The instrument reads as an instrument — a readout, not a landing page — which is the visual half of the product's central joke, "the randomness has a receipt."

The tone constraint from the PRD applies to pixels as well as words: confident, no hype, no pitch. There is no hero image, no gradient, no card shadow, no marketing badge, no urgency device. The single moment of warmth is the serif headline and the breathing solar dot.

**Preservation is the first design rule.** FR10 / AD-10 fix the interaction at one button and one optional domain field. Revised AD-6 preserves the page shell except for the governing UX record's closed D1, D1a, D2, D2a and D3–D24 rows; AD-12 owns the transport and representation subset. New states are drawn *with the existing vocabulary* — a 1px rule, a 2px accent bar, an existing colour — before any new token is proposed.

**Behavioral mirror.** AD-12's precedence is exact: explicit `Accept: application/json` wins; otherwise HTML acceptance or a browser-form content type selects shell HTML, and remaining requests use JSON. Request scope—not rendered mode—owns local redirect/permalink eligibility. A native domain form, including downgrade, receives direct `200` home-shell HTML and remains at `/api/spark`; the enhanced domain path leaves its current page URL unchanged. Neither mints a permalink or performs history mutation. Enhanced results use the governing record's deliberate focus choreography, while fresh full-document `400`, `502`, and `404` responses set no scripted focus. Stories 1.15–1.16 own transport, rendering, request hardening, and the closed inactive-domain dispatch contract; Story 1.23 owns canonical Worker assembly and offline cold-path proof; Story 1.26 owns local-only activation; Story 3.3 owns the first owner review; and Story 3.6 owns receipt-claim copy. This visual spine grants none of those behaviors independently.

## Colors

Dark only. There is no light mode and no `prefers-color-scheme` branch; the palette is a deliberate single commitment.

| Token | Role | Not used for |
|---|---|---|
| `{colors.void}` | Page ground; also the text colour *on* the solar button | Never a text colour on any other surface |
| `{colors.panel}` | The only raised surface: input, formula block, site-context block, `{components.notice}` | Never a card background for the Brief itself |
| `{colors.rule}` | Decorative 1px dividers and hairlines | Never text or an identifying input/chip boundary |
| `{colors.text}` | Body copy, Brief prose, provenance values | — |
| `{colors.dim}` | **Non-text only.** Disabled ornament, hairline emphasis | Never text of any size — 4.02:1 on void, 3.82:1 on panel, both below 4.5:1 |
| `{colors.faint}` | **Legacy.** Currently carries labels, the strike note, chip prefixes, `dt` labels, legend labels, footer text | See contrast below — retire for text |
| `{colors.dim-raised}` | `[ASSUMPTION]` The replacement for `{colors.faint}` **and** `{colors.dim}` wherever either currently renders text: labels, strike note, chip prefixes, `dt` labels, legend labels, footer, `{typography.h2}` section headings, `.live` readout, the question line, the formula panel, site-context, the `observed` / `seed` provenance values | — |
| `{colors.border-strong}` | `[ASSUMPTION]` The identifying resting boundary of `{components.website-input}` and `{components.chip}` (same hex as `dim-raised`) | Not a text colour; decorative hairline dividers stay `{colors.rule}` |
| `{colors.gold}` | `[ASSUMPTION]` **Fixed** brand gold for every *text* role that must read as gold: provenance hot values, the `?` glyph on the question line, the accent bar, invitation link/button. Same hex as the C-class accent but **never** re-set by the solar feed | Never the button fill — that is the live accent |
| `{colors.entropy}` | The "cool"/verifiable register: links, focus rings, provenance cool values, formula and site-context left bars | Never the primary action |
| `{colors.solar-*}` | The **live** accent, selected server-side from the current GOES flare letter — A/B/C/M/X. It drives exactly four things: the masthead accent half (`.mark span`), `{components.live-dot}`, the `{components.strike-button}` background, and the Seed Geometry canvas. Nothing else. | Never used to signal error or success; **never a text colour** — gold-looking text uses `{colors.gold}` |
| `{colors.heading}` | The Brief title only | — |
| `{colors.error}` | Invalid-input border, error text | Never a background fill |
| `{colors.warning}` | Site-warning text | — |
| `{colors.oxide}` | The period in the "Hearn." mark | Nothing else |

### Contrast statement

**Target: WCAG 2.2 AA — 4.5:1 for text below 18.66px bold / 24px regular, 3:1 for UI boundaries and focus indicators.** `[ASSUMPTION]` (no standard was named in any source; see UX-DR2). Nothing on the page qualifies as WCAG "large text": the `h1` is 31px regular (it passes at 16.05:1 regardless), the premise is 18px regular, and the 13px/700 button label is **not** large text — 4.5:1 is the correct bar for it.

Every ratio below is computed from the exact hex values with the WCAG 2.x relative-luminance formula, not estimated.

| Foreground | Background | Ratio | Where it is used | Verdict |
|---|---|---|---|---|
| `{colors.text}` `#C6CFD8` | `{colors.void}` | 12.34 | body, Brief prose, provenance values | pass |
| `{colors.text}` | `{colors.panel}` | 11.72 | notice text, input value | pass |
| `{colors.heading}` `#E4EAF0` | `{colors.void}` | 16.05 | Spark title | pass |
| `{colors.dim-raised}` `#7E8B98` | `{colors.void}` | 5.59 | `h2` section labels, `.live`, question line, field labels, notes, footer, `dt` | pass |
| `{colors.dim-raised}` | `{colors.panel}` | 5.31 | formula panel, site-context, input placeholder | pass |
| `{colors.entropy}` `#6E8FB8` | `{colors.void}` | 5.82 | links, cool provenance values, focus ring on void | pass |
| `{colors.entropy}` | `{colors.panel}` | 5.53 | notice left bar (UI) | pass |
| `{colors.error}` `#E06A3F` | `{colors.void}` | 5.84 | field message text, invalid border | pass |
| `{colors.warning}` `#D89372` | `{colors.void}` | 7.72 | site-warning text | pass |
| `{colors.gold}` `#C9A227` | `{colors.void}` | 8.04 | hot values, `?` glyph, accent bar, invitation text | pass |
| `{colors.border-strong}` `#7E8B98` | `{colors.void}` | 5.59 | input / chip resting boundary (UI 3:1) | pass |
| `{colors.border-strong}` | `{colors.panel}` | 5.31 | same boundary against its own fill | pass |
| `{colors.oxide}` `#B4502E` | `{colors.void}` | 3.82 | the period in the "Hearn." mark | exempt (logotype) |
| `{colors.dim}` `#67737F` | `{colors.void}` | **4.02** | **retired from text** — non-text ornament only | fails as text |
| `{colors.dim}` | `{colors.panel}` | **3.82** | **retired from text** | fails as text |
| `{colors.faint}` `#3D4750` | `{colors.void}` | **2.05** | **retired from text** — hairline ornament only | fails as text |
| `{colors.rule}` `#1D242C` | `{colors.void}` | **1.24** | decorative 1px dividers and hairlines **only** | acceptable as decoration (1.4.11 exempt); **never** an identifying control boundary |
| **Button label on the live accent** | | | | |
| `{colors.void}` `#0B0D10` | `{colors.solar-a}` `#4A6785` | **3.31** | — | fail |
| `{colors.heading}` `#E4EAF0` | `{colors.solar-a}` | 4.85 | **the A-class label** | pass |
| `{colors.void}` | `{colors.solar-b}` `#5E8CA8` | 5.37 | **the B-class label** | pass |
| `{colors.heading}` | `{colors.solar-b}` | **2.99** | — | fail — do **not** flip on B |
| `{colors.void}` | `{colors.solar-c}` `#C9A227` | 8.04 | **the C-class label** | pass |
| `{colors.void}` | `{colors.solar-m}` `#E06A3F` | 5.84 | **the M-class label** | pass |
| `{colors.void}` | `{colors.solar-x}` `#F2452E` | 5.25 | **the X-class label** | pass |
| accent fill vs `{colors.void}` (button edge, non-text) | | 3.31 (A, worst case) | | pass (UI 3:1) |
| `{colors.entropy}` focus ring vs `{colors.void}` | | 5.82 | with offset ≥2px | pass |
| `{colors.entropy}` focus ring vs accent fill (inset) | | 1.0–1.76 | | **fail — the offset is load-bearing** |
| button at `aria-disabled` 0.45 α, any accent | | 1.9–2.5 | | exempt (inactive control) |

Three decisions follow, and they are the whole of the contrast policy:

1. **Button label flips on A-class only.** The label is `{colors.void}` on B-, C-, M- and X-class accents (5.37 / 8.04 / 5.84 / 5.25 — all pass). It flips to `{colors.heading}` **only** when the accent is A-class (`#4A6785`), where `void` fails at 3.31 and `heading` passes at 4.85. Flipping on B would *break* a passing pair (`heading` on `solar-b` = 2.99). `[ASSUMPTION]` The accent hue still tracks the sun; only the A-class label colour differs. The contrast fixture asserts all five classes, not just the served one.
2. **Gold text never rides the live accent.** `{colors.solar-*}` is a background/graphic variable. Every text role that reads as gold — provenance hot values (`flux`, `class`), the `?` glyph on the question line, `{components.accent-bar}`, `{components.invitation-link}` / `{components.invitation-button}` — is pinned to the fixed `{colors.gold}` (8.04:1). Only the masthead accent half, `{components.live-dot}`, the `{components.strike-button}` background and the Seed Geometry canvas follow `--solar`. Without this pin, an A-class day paints 10.5–12.5px text at 3.31:1. The masthead wordmark stays live under the logotype exemption.
3. **`dim` and `faint` are non-text tokens; `rule` is decoration only.** Both greys are retired from every *content* role — `{typography.h2}` section headings, `.live`, the question line, the `observed` / `seed` provenance values, the formula panel, site-context, field labels, chip prefixes, legend labels and the footer all take `{colors.dim-raised}` (5.59 on void, 5.31 on panel; passes on both grounds). The earlier rationale — "section labels are decorative repeats of information also present in the DOM heading" — was wrong: they *are* the DOM headings. `{colors.rule}` (1.24:1) remains fine as a decorative hairline divider, but it is no longer the identifying boundary of `{components.website-input}` or `{components.chip}`; those take `{colors.border-strong}` `#7E8B98`. `[ASSUMPTION]`

**Focus rings.** Every focus indicator is worded as "2px `{colors.entropy}` outline with ≥2px offset so the ring sits on `{colors.void}`" — never inset, never `box-shadow: inset`, never `outline-offset: 0`. Against the accent fill directly the ring measures 1.0–1.76:1 and fails; the offset is what makes it pass.

## Typography

Two families, both loaded from Google Fonts (an external dependency the shell already carries).

- **`{typography.body}` — Courier Prime 14px/1.6.** Everything that is machinery: labels, chips, provenance, notices, footer, the invitation's supporting copy.
- **`{typography.h1}` / `{typography.premise}` — Newsreader serif.** Reserved for the Brief's own voice: the Spark title and The Plan. The serif is the signal that a human-readable idea, not a readout, is on screen. It never appears in chrome.
- **`{typography.h2}` — 10.5px uppercase, 0.24em tracking, `{colors.dim-raised}`.** Structural labels ("Seed Geometry", "Provenance", and the new Brief section labels).
- Everything else is a size step of the mono face: `{typography.button}` (uppercase, 0.22em), `{typography.label}`, `{typography.note}`, `{typography.chip}`, `{typography.prov-field}`, `{typography.formula}`, `{typography.footer}`, `{typography.legend}`.

Rules: minimum rendered text size is 10.5px and that floor is reserved for uppercase tracked labels; the eight Brief elements never render below `{typography.question}` (12.5px). Serif never goes uppercase. Mono never goes above 14px.

## Layout & Spacing

Single column, `max-width: {spacing.page-max}` (660px), page gutter `{spacing.gutter}` (20px), bottom padding 80px. Vertical rhythm is coarse and consistent: header `{spacing.header-y}`, strike row `{spacing.strike-row-y}` with `{spacing.strike-row-gap}` between the field and the button, result card `{spacing.card-top}`, provenance `{spacing.prov-top}`, footer `{spacing.footer-top}`.

Two named breakpoints, both preserved verbatim:

- **`{spacing.bp-wide}` (920px and up)** — two-column grid, `max-width: {spacing.page-max-wide}`, columns `minmax(0, 660px) minmax({spacing.viz-min}, 1fr)`, `column-gap: {spacing.column-gap}`. Header / strike row / error span both columns; the Brief, provenance and footer sit left; Seed Geometry occupies the right column and is `position: sticky; top: 24px`.
- **`{spacing.bp-phone}` (520px and down)** — `{typography.h1-mobile}` and `{typography.premise-mobile}`; provenance fields collapse to a single column.

Between 520px and 920px the layout is the stacked single column with the visualization pushed below the Brief (`margin-top: 38px`).

## Elevation & Depth

There is no elevation. No shadow is used anywhere except the breathing glow on `{components.live-dot}`. Depth is expressed by exactly three devices:

1. A 1px `{colors.rule}` border or divider.
2. A 2px left accent bar — `{colors.entropy}` for verifiable/mechanical blocks (formula, site context, `{components.notice}`), fixed `{colors.gold}` for the Brief's question line.
3. A `{colors.panel}` fill, which is one step off `{colors.void}` and reads as recessed, not raised.

New states inherit this. A notice is a panel with a left bar; it is never a toast, never a modal, never an overlay.

## Shapes

`{rounded.DEFAULT}` is `0px` and every scale step is `0px`. The only radius in the system is `{rounded.full}` on `{components.live-dot}`. Buttons, inputs, chips, panels and notices are all hard rectangles. This is the strongest single carrier of the brand: **do not introduce a radius for any new component.**

## Components

### `strike-button`
Anatomy: a solid rectangle, uppercase tracked label, no icon, no border. Colour: `{components.strike-button.background}` = the live solar accent; label `{colors.void}` on B/C/M/X accents and `{colors.heading}` on **A-class only** (per the contrast decision — flipping on B would fail at 2.99:1).
States — `idle` label `Strike`; `loading` label `Scanning` (only when the website field is non-empty, first 250ms) then `Striking`, `aria-disabled="true"` (**not** the `disabled` attribute — `disabled` drops keyboard focus to `<body>`; clicks are ignored while the strike is in flight), opacity `{components.strike-button.busyOpacity}`, `cursor: wait`; `settled` label `Strike again` (persists for the rest of the session and on a hydrated permalink); `focus-visible` `{components.strike-button.focusRing}`; `hover` `filter: brightness(1.12)`; `active` `translateY(1px)`.

### `website-input`
Anatomy: `{components.field-label}` above ("website, optional"), a 250px `{colors.panel}` field with placeholder `example.com`, aligned to the button's baseline (`align-items: flex-end`). Colour: 1px `{colors.border-strong}` border (`[ASSUMPTION]`; `{colors.rule}` at 1.24:1 cannot identify a control under 1.4.11) → `{colors.entropy}` on focus, plus `{components.website-input.focusRing}` `[ASSUMPTION]`; `{colors.error}` border when `aria-invalid="true"`. It is optional, never required, never marked with an asterisk, and never gains a second field.

### `result-card`
Anatomy, top to bottom: Spark title (`{typography.h1}`, `{colors.heading}`) → The Plan (`{typography.premise}`) → the six remaining elements as `{components.section-heading}` + body, with the question/invitation line carrying `{components.accent-bar}` in fixed `{colors.gold}` (the `?` glyph is `{colors.gold}`, never `--solar`) → `{components.chip}` row. The card has no border of its own, no background and no shadow (the as-built `.idea` 1px `{colors.rule}` top divider is preserved as `{components.result-card-idea}`) — it is text on `{colors.void}`, separated from the strike row by `{spacing.card-top}` alone. Ordering and field mapping are normative in `EXPERIENCE.md § Component Patterns` (UX-DR1).

### `notice`
Anatomy: one paragraph, `{colors.panel}` fill, 2px `{colors.notice-edge}` left bar, `{typography.note}`, `{colors.text}`. It sits **above** the Spark title, inside the result region. It is not an error: it never uses `{colors.error}`, never uses an icon, and is never dismissible. `[ASSUMPTION]` on placement and on `{colors.notice-surface}` / `{colors.notice-edge}` (both alias existing values, so no new hue enters the palette).

### `chip`
Anatomy: 1px `{colors.border-strong}` rectangle, `{colors.dim-raised}` prefix + `{colors.text}` value, `{typography.chip}`. **Change:** `white-space` becomes `normal` and the chip row wraps within the 20px gutter — the current `nowrap` lets long constraint chips overflow the phone viewport. `[ASSUMPTION]`

### `invitation-link` / `invitation-button`
Two visual postures for one component. Active receiver → `{components.invitation-button}`: an outlined rectangle in fixed `{colors.gold}` on transparent, uppercase label. Inactive receiver → `{components.invitation-link}`: an inline fixed `{colors.gold}` underlined link in the flow of the invitation sentence. Both carry `{components.retention-note}` immediately beneath. Neither is ever filled solid — the filled solar rectangle is reserved for `strike-button`, so the page never shows two primary actions.

### `prov-table`
Anatomy: a `dl` of seven rows, `{components.prov-table.labelColor}` labels, values split between `{colors.entropy}` (cool: round, signature, randomness) and fixed `{colors.gold}` (hot: **flux and class only** — as-built; `observed` and `seed` are ordinary values and render in `{colors.dim-raised}`), with 1px `{colors.rule}` dividers, followed by `{components.formula-panel}`. Values arrive by a scramble transition (9 × 34ms, staggered 55ms) which is suppressed under `prefers-reduced-motion`.

### `footer-link`
`{typography.footer}`, `{colors.dim-raised}`, `{colors.entropy}` on hover, `{components.footer-link.focusRing}` on focus. Carries the spark id, `json`, `copy link`, `how does this work?`, `drand · NOAA SWPC`, the Hearn mark, and the neuron meter.

**Target size (WCAG 2.5.8).** `copy link` and every footer link carry `padding: 4px 0` and `min-height: 24px`, so each target is ≥24×24 CSS px in its own right rather than depending on the current 22px column / 8px row gaps surviving a wrap at 320px. `[ASSUMPTION]` Chips are non-interactive, so 2.5.8 does not apply to them — state that in the test rather than measuring them.

### `viz-stage` (Seed Geometry canvas)
`aria-hidden="true"`, outside the tab order, legend beneath carries the same information as text. **Motion (WCAG 2.2.2):** the rAF rotation and the corona pulse stop automatically after **≤5 seconds** unless the stage is hovered or keyboard-focused, at which point they resume; drag-to-rotate is unaffected. This is in addition to, not instead of, `prefers-reduced-motion: reduce`, which suppresses the animation entirely. `[ASSUMPTION]`

## Do's and Don'ts

**Do**
- Draw every new state with a 1px `{colors.rule}`, a 2px accent bar, or a `{colors.panel}` fill.
- Keep the solar accent as the single source of colour energy, and let it follow the live flare class.
- Keep the serif for the Brief's own words; keep everything else mono.
- Use `{colors.entropy}` when the meaning is "this is verifiable" and fixed `{colors.gold}` when the meaning is "this is the idea"; the live `{colors.solar-*}` means "this is the action" and appears only as the button fill, the masthead accent, the live dot and the canvas.
- Move every text string currently on `{colors.faint}` **or `{colors.dim}`** to `{colors.dim-raised}`.
- Use `{colors.gold}` for gold *text*; reserve `{colors.solar-*}` for the masthead accent, the live dot, the button fill and the canvas.
- Give every interactive target ≥24×24 CSS px, and every focus ring ≥2px offset so it lands on `{colors.void}`.

**Don't**
- Don't add a border radius. Anywhere. `{rounded.DEFAULT}` is `0px` by intent.
- Don't add a shadow, gradient, glow (except `{components.live-dot}`), icon set, or illustration.
- Don't add a second filled solar rectangle to the page.
- Don't render a notice, error or downgrade as a toast, modal, banner across the viewport, or dismissible alert.
- Don't add a light theme, a second accent family, or a success/green colour.
- Don't paint `{colors.error}` on a downgrade or a house Brief — those are not failures.
- Don't add a field, a step, a mode switch, or a progress bar to the strike row (FR10 / AD-10).
- Don't set `white-space: nowrap` on wrapping content.
- Don't paint any text in `{colors.dim}`, `{colors.faint}` or `{colors.rule}`.
- Don't paint text in `var(--solar)` — that variable moves with the sun and reaches 3.31:1 on an A-class day.
- Don't flip the button label on B-class accents (`{colors.heading}` on `{colors.solar-b}` = 2.99:1).
- Don't use `{colors.rule}` as the resting boundary of the input or a chip.
- Don't draw a focus ring inset or at `outline-offset: 0`.
- Don't let the Seed Geometry canvas animate indefinitely — it stops after ≤5s unless hovered or focused (WCAG 2.2.2).
- Don't use the `disabled` attribute on `strike-button`; use `aria-disabled="true"` so focus is not dropped.
