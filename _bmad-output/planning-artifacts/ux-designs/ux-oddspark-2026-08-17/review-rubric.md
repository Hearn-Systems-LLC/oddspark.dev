# Spine Pair Review — oddspark

Reviewed: `DESIGN.md`, `EXPERIENCE.md`, `../../ux-decision-record-oddspark.md` (record), `.memlog.md`, `.working/extract-*.md`, and the as-built shell `src/worker.js` (`page()` L1397–2151, `/how` L2160+). Method: mechanical extraction per category, then judgment. Contrast ratios were recomputed from the hex values in the frontmatter (WCAG relative-luminance formula) rather than trusted from the prose.

## Overall verdict

**Adequate — usable as a contract, with two accessibility decisions that are numerically wrong and one preservation criterion that contradicts the record.** Every token resolves, every source resolves, every UJ has a flow, the record's UX-DR1–6 agree with the spines in substance, and the [ASSUMPTION] discipline is good. The load-bearing defects are: (1) the A/B-class button-label flip (A3 / D9 / UX-DR2.9) makes B-class *worse* (`heading` on `solar-b` = 2.99:1) while `void` on `solar-b` already passes at 5.37:1 — only A-class needs the flip; (2) the AA baseline promises 4.5:1 text and 3:1 borders and an axe-clean run, but `{colors.dim}` (4.02:1) still carries content at 11–12.5px and `{colors.rule}` (1.24:1) is the only input/chip boundary, so the axe "zero serious" gate cannot pass as written; (3) EXPERIENCE preservation criterion 2 says "one button and one optional input, in that DOM order" while the record and the as-built say input first. Everything else is medium or lower and mostly documentation drift between DESIGN.md's "read from deployed CSS" claim and the actual CSS.

## 1. Flow coverage — adequate

Extracted from sources: UJ-1 (Dana presses the button cold, edge: house Brief), UJ-2 (Marcus pastes his domain, edge: unscannable site) from `prd.md` L39–41; UX-DR1–6 from the record. Checked each against `EXPERIENCE.md § Key Flows`.

| Requirement | Flow | Protagonist | Numbered steps | Climax | Failure path |
|---|---|---|---|---|---|
| UJ-1 | Flow 1 | Dana | no (prose) | yes | edge covered in Flow 3 (house Brief); 400/502 not in any flow |
| UJ-2 | Flow 2 | Marcus | no (prose) | yes | edge covered in Flow 3 (downgrade) + pre-activation variant |
| UX-DR1 card | Flow 1 | Dana | — | yes | — |
| UX-DR2 a11y | Flow 1 (focus, live region) | — | — | partial | — |
| UX-DR3 loading | Flow 1 | — | — | yes | — |
| UX-DR4 states | Flows 3, 5 | — | — | yes | yes |
| UX-DR5 responsive | none | — | — | — | n/a (checklist form is appropriate) |
| UX-DR6 invitation | Flow 4 | Dana | — | yes | yes (failed POST) |

### Findings
- **medium** Flows are prose paragraphs, not numbered steps under `###` headings as the shape example (`experience-example-shadcn.md § Key Flows`) uses; a story-dev cannot cite "Flow 1 step 3". (`EXPERIENCE.md § Key Flows`). *Fix:* number the beats in Flows 1, 2 and 4; keep the bold **Climax** line; add a one-line `Failure:` under Flows 1 and 2 pointing at the 400 / 502 rows.
- **low** No flow exercises the 400 or 502 states end-to-end (focus to input, `role="alert"`, button back to "Strike"). The state table has it; the flow does not. *Fix:* the `Failure:` line above.

## 2. Token completeness — adequate

Extracted 19 colour tokens (all hex), 19 typography roles, 5 `rounded`, 17 `spacing`, 18 `components` from the DESIGN.md frontmatter; extracted every `{path.to.token}` in DESIGN.md prose, EXPERIENCE.md and the record (66 distinct refs). **All 66 resolve** (`{colors.solar-*}` is a deliberate wildcard). No colour token lacks hex. Contrast targets are stated (4.5:1 text / 3:1 UI). Recomputed ratios against `#0B0D10`: text 12.3, heading 16.1, entropy 5.8, error 5.8, warning 7.7, solar-c 8.0, dim-raised 5.6, **dim 4.02**, **faint 2.05**, **rule 1.24**, oxide 3.8. Button pairings: void/solar-a **3.31**, void/solar-b **5.37**, void/C 8.0, void/M 5.8, void/X 5.3; heading/solar-a 4.85, **heading/solar-b 2.99**.

### Findings
- **high** The A/B label flip is wrong for B-class. DESIGN.md states void-on-solar-a ≈ 2.6:1 and void-on-solar-b ≈ 4.1:1 (both fail); recomputed they are 3.31:1 (fail) and 5.37:1 (**pass**). The prescribed fix — `{colors.heading}` label on A and B — yields 4.85:1 on A (pass) but **2.99:1 on B (fail)**, so D9 as written introduces a contrast failure the as-built does not have. (`DESIGN.md § Colors → Contrast statement`; `EXPERIENCE.md § Accessibility Floor → Contrast`, A3; record UX-DR2.9, D9). *Fix:* flip the label only for A-class; keep `{colors.void}` on B/C/M/X. Correct the quoted ratios. Note the 13px/700 button label does not qualify as WCAG "large text" (needs 18.66px bold), so 4.5:1 is the right bar.
- **high** The stated targets are not met by preserved tokens and the spines do not say so. `{colors.dim}` (4.02:1) still paints content in the as-built: `.question` line (12.5px), `.field dd` default values (`observed`, `seed`, 11.5px), `.formula` body (11px), `.site-context p`, `.built`. DESIGN.md's rule "any content at this size uses text or dim-raised" is stated but only `formula-panel` is silently re-tokened; no delta enumerates the `--dim` swaps, and D8 covers `--faint` only. axe-core reports colour-contrast failures as **serious**, so UX-DR2.13(a) "zero serious/critical" cannot pass without this. Separately `{colors.rule}` at 1.24:1 is the *only* boundary of `website-input` and `chip` — WCAG 1.4.11 wants 3:1 for input boundaries; the target sentence promises 3:1 for "UI borders" and the token cannot deliver it. (`DESIGN.md § Colors → Contrast statement`, `components.website-input.border`, `components.chip.border`; record UX-DR2.5/2.9/2.13). *Fix:* either (a) enumerate every `--dim` text role that becomes `{colors.dim-raised}` and add a D8b delta, and scope the 3:1 border promise to focus indicators + explicitly exempt the 1px `rule` hairlines (state that the input is identified by its label and panel fill, and accept the 1.4.11 risk), or (b) raise `rule` for the input/chip border to ≥3:1 and add it as a tagged [ASSUMPTION] token.
- **medium** DESIGN.md claims "every value above is read from the deployed CSS except the four lines tagged [ASSUMPTION]"; five lines are tagged, and several untagged values differ from the CSS: `chip.padding` 4px 8px (as-built 4px 9px), `accent-bar.paddingLeft` 12px (as-built 14px), `formula-panel.color` dim-raised (as-built `--dim`), `prov-table` hot values "flux, class, observed, seed" (as-built only flux and class are `.hot`; observed/seed are `--dim`), `result-card` "no border" (as-built `.idea{border-top:1px solid var(--rule)}`). Because record UX-DR5.4.8 says Story 1.15 asserts "all DESIGN.md tokens", these become false-positive test failures or silent shell edits. (`DESIGN.md` frontmatter + `§ Components → result-card / prov-table`). *Fix:* correct the five values to the CSS, or tag each as [ASSUMPTION] and add it to the Deltas table; fix "four" → "five" here, in `EXPERIENCE.md § Responsive` item 8 and record UX-DR5.4.8.
- **low** `typography.live`, `typography.mark`, `typography.input`, `spacing.unit`, `spacing.footer-gap`, `components.viz-stage`, `rounded.sm/md/lg` are defined but never referenced in either spine's prose. Harmless documentation of the as-built; not bloat worth removing. *Fix:* none required.

## 3. Component coverage — adequate

Extracted every component name used in DESIGN.md prose/frontmatter, EXPERIENCE.md and the record: `strike-button`, `website-input`, `field-label`, `strike-note`, `result-card`, `section-heading`, `accent-bar`, `notice`, `chip`, `invitation-link`, `invitation-button`, `retention-note`, `prov-table`, `formula-panel`, `footer-link`, `live-dot`, `viz-stage`. Names are identical wherever they appear in all three files. All 17 have a DESIGN.md frontmatter entry; 12 have a DESIGN.md `§ Components` section (field-label, strike-note, section-heading, accent-bar, retention-note, formula-panel, live-dot, viz-stage are frontmatter-only, acceptable for static pieces). EXPERIENCE.md `§ Component Patterns` has behavioural rules for `strike-button`, `website-input`, `result-card`, `notice`, `invitation-*`, `prov-table`, `/how`.

### Findings
- **medium** No behavioural row for `footer-link` / `copy link`: the as-built swaps the label to "copied" for 1.6s via `navigator.clipboard`, and it is JS-only — the spine's no-JS posture (D1/D2) leaves it undefined. Also unnamed: the masthead live readout (`<class> · SUN NOW`, `----` on feed failure — appears only in the preservation list) and the "neuron meter". (`EXPERIENCE.md § Component Patterns`, `§ Responsive` items 5, 7). *Fix:* add rows for `footer-link` (copy-link feedback, no-JS behaviour: omit or degrade to a plain permalink) and `masthead` (readout states, `live-dot` motion suppressed under reduced motion).
- **low** `chip` behaviour is spelled out only inside the `result-card` row 7 cell; `strike-note` and `section-heading` have no behavioural line. Acceptable for static components; a one-line "static, no states" row would remove doubt. *Fix:* optional.

## 4. State coverage — adequate

Walked every IA surface (`/`, `/s/:id`, `/how`, `/api/spark`, `/api/spark/:id`, `/api/cheer`, not-found). Expected states per surface vs the UX-DR4 table and Interaction Primitives: `/` idle, loading, local, domain, downgrade, pre-activation, house, 400, 502, unsupported, inactive receiver, claiming/non-claiming receipt, retention, solar-feed failure — **all covered**. `/s/:id` hydrated, expired, domain-id, unknown, unsupported — covered. `/how` — content only, covered. `/api/cheer` failure — covered.

### Findings
- **medium** URL and title behaviour after a strike is unspecified: the as-built does `history.pushState` to `/s/:id` and sets `document.title` on settle. With D1 (native `<form method=post action=/api/spark>`), the no-JS result page's URL is undefined — does the POST 303 to `/s/:id` (PRG) for local Briefs, and to what for domain Briefs which have no permalink? A refresh on a POST result would re-strike. (`EXPERIENCE.md § Interaction Primitives → invitation contract → Progressive enhancement`; record D1). *Fix:* add one rule: local strike → `303 /s/:id`; domain/downgrade strike → render inline at `/` (or `303 /`) with no pushState; document.title = Spark title on settle for JS and server paths alike.
- **low** The idle `h1` (A20) is "the product name" but the masthead `.mark` is preserved verbatim (item 5); whether the mark *becomes* the `h1` and is then replaced, or a second, visually hidden `h1` exists, is left to the dev. Focus-to-`h1` also needs `tabindex="-1"` on the heading, unstated. *Fix:* one sentence each.
- **low** `aria-busy="true"` is placed on the button; ARIA intends it for the region being updated. Not wrong for axe, but screen readers do little with it on a button. *Fix:* also set `aria-busy` on the result region during the strike, or move it there.

## 5. Visual reference coverage — strong (spine-only)

`mockups/` and `wireframes/` do not exist; `imports/` is empty. `.memlog.md` last entry records the decision: "creative tools/key-screen mocks skipped (fast path, preserved shell) — all surfaces spine-only". Consistent with a preserved as-built shell whose screenshots live in the repo. No findings.

## 6. Bloat & overspecification — adequate

DESIGN.md documents the whole as-built ramp, including roles the new states never touch (`live`, `mark`, `legend`, `viz-stage`); defensible because Story 1.15 tests preservation against it. EXPERIENCE.md `§ Voice and Tone` restates Brief-content voice that Story 1.5 owns (the spine says so itself). `§ Open Questions` duplicates the record's assumption list — acceptable since the record points at it as the canonical A1–A21 table. Nothing is overspecified to the point of constraining architecture.

### Findings
- **low** `§ Voice and Tone` Do/Don't rows 2, 5, 6 are Brief-content examples (owned by Story 1.5), not shell copy. *Fix:* trim to shell strings or label the rows "illustrative, non-binding".

## 7. Inheritance discipline — adequate

All seven `sources` paths resolve under `_bmad-output/planning-artifacts/`. Token references resolve (see §2). Glossary is consistent across the three files (`notice`, `mode`, `asText`, house Brief, downgrade, receiver, claim proof).

### Findings
- **low** Live-shell citation "src/worker.js page() L1380-2152" — `page()` actually starts at L1397 and ends at L2151; L1380 is the `FAVICON` constant. (`DESIGN.md`/`EXPERIENCE.md` frontmatter, record `inputs`). *Fix:* L1397–2151.
- **low** UJ names are paraphrased ("Dana, local success (UJ-1)") rather than the PRD titles ("Dana presses the button cold"); the PRD says "domain field", the spines say "website field / `website-input`" (the as-built label). Both are traceable, not verbatim. *Fix:* quote the PRD UJ title once in each flow heading.

## 8. Shape fit — adequate

DESIGN.md: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts — canonical order, all present. EXPERIENCE.md: Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Responsive & Platform, Key Flows — all required defaults present, Responsive triggered correctly (two breakpoints). `Inspiration & Anti-patterns` omitted — defensible (preserved shell, no reference products in memlog). Invented section `Open Questions` earns its place as the A1–A21 register the record cites.

### Findings
- **medium** Key Flows deviate from the shape (no `###` per flow, no numbered steps, no `Failure:` line) — see §1. *Fix:* as §1.

## 9. Record ↔ spine agreement — adequate

Walked UX-DR1.1–11, DR2.1–13, DR3.1–8, DR4 table + rules 1–5, DR5.1–4.11, DR6.1–10, Deltas D1–D16, Conflicts 1–13 against EXPERIENCE.md/DESIGN.md. Confirmed consistent: house-Brief notice = quiet disclosure "This plan is one of ours, not built for you." (record DR4 row, EXPERIENCE state table + Flow 3, memlog A8 override); three notice strings identical character-for-character in both files; native strike form D1/D2 = A19 in both; same-tab handoff DR6.6 = A17 + Interaction Primitives; share affordance omitted DR1.11 = A14; `asText` DR1.10 = A13; empty `stays_same` DR1.5 = A16; retention disclosure DR6.8 = A21; 400/502 in-shell DR4 = A9; not-found page DR4 = A10.

### Findings
- **medium** Contradiction on strike-row DOM order. Record UX-DR5.4.2: "exactly one button and exactly one optional input, **input first**". EXPERIENCE `§ Responsive` item 2: "exactly one button and exactly one optional input, **in that DOM order**" — which reads button-then-input. As-built is input first. A dev writing the 1.15 preservation test from the spine gets it backwards. *Fix:* rewrite EXPERIENCE item 2 to "input, then button".
- **medium** The record's Deltas table is narrower than what the spines require of the shell: (a) the as-built formula panel says "Recompute it yourself; every input above is published and archived." — the spines' non-claiming default changes that copy, but no delta lists it, and DR5.4.6 says "the formula panel" is preserved; (b) the result-card interior is restructured from headline/premise/question/site-context/chips to the eight-element order (removing `.question`'s "?" glyph and the `site-context` block) — implied by DR1 but not in D1–D16; (c) `formula-panel` colour dim → dim-raised (see §2). (record `§ Deltas`; `EXPERIENCE.md § State Patterns → Non-claiming receipt`, `§ Responsive` item 6). *Fix:* add D17 "formula panel copy switches to the non-claiming variant by default (Story 3.4 gates the claiming string)", D18 "result-card interior replaced by the eight-element order; `site-context` and the `?` glyph retire", and fold the `--dim` swaps into D8.
- **low** Record DR2.5 says `website-input` "currently has none" (focus indicator); the as-built has a border-colour change on focus. Immaterial, but the spine's wording ("1px border alone is not visible enough") is the accurate one. *Fix:* align the record's phrase.

## 10. Constraint compliance — adequate

Checked all three files against FR10 / AD-10 (one button, one optional field, no new inputs/steps/mode switch, shell preserved) and the enumerated Deltas. No file adds an input, step, mode switch, progress device, modal, toast, second primary action, or navigation. D1 (native form) wraps the existing controls without adding any; D12's hidden inputs live in the invitation form, not the strike row. `notice`, not-found page, 400/502-in-shell are all authorised deltas.

### Findings
- **medium** Unenumerated shell changes (see §9 second finding and §2 third finding): non-claiming formula copy, card-interior restructure, `--dim` text swaps, and the five DESIGN.md values that differ from the CSS. None redesigns FR10/AD-10, but each is a shell edit outside the "only changes this record authorises" list, so a strict reading of the record forbids them while the spines require them. *Fix:* extend the Deltas table as above so the record stays the single authorising list.

## Mechanical notes

- Token refs: 66 distinct `{…}` refs across three files; 0 unresolved. 19/19 colours have hex.
- Sources: 7/7 resolve. Live-shell line range off by ~17 lines.
- Component names: 17 names, identical spelling across all three files.
- Contrast recomputed (WCAG 2.x luminance): dim 4.02, faint 2.05, rule 1.24, dim-raised 5.59, void/solar-a 3.31, void/solar-b 5.37, heading/solar-a 4.85, heading/solar-b 2.99.
- As-built values that DESIGN.md misstates: `.idea` border-top (exists), `.chip` padding 4px 9px, `.question` padding-left 14px, `.formula` colour `--dim`, `.field dd.hot` only on flux and class.
- Directories: `mockups/`, `wireframes/` absent; `imports/` empty; spine-only choice logged in `.memlog.md`.
- Finding totals: critical 0 · high 2 · medium 8 · low 9.
