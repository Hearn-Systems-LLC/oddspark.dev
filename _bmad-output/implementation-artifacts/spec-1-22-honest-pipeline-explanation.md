---
title: 'Story 1.22: Honest Pipeline Explanation'
type: 'feature'
created: '2026-08-23'
status: 'blocked'
baseline_revision: 'a8665c2ea0721977db80fcefc4f5e18786e5815f'
baseline_commit: 'a8665c2ea0721977db80fcefc4f5e18786e5815f'
review_loop_iteration: 2
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-decision-record-oddspark.md'
warnings:
  - 'Owner decision required: UX-DR2.12 and EXPERIENCE.md require rendered Mermaid SVGs to remain aria-hidden with the ordered lists as the accessible equivalent, while the rederived implementation exposes SVG semantics. The implementation spec cannot override those read-only authorities.'
  - 'Completion evidence is incomplete: the required axe matrix and recorded browser accessibility report do not exist.'
deferred: []
---

<intent-contract>

## Intent

**Problem:** `/how` still describes legacy four-axis deterministic generation and makes reproducibility claims that the current receipt-proof authority does not permit.

**Approach:** Rewrite the existing page around the adopted Evidence-to-Render pipeline, bounded and nondeterministic model behavior, privacy and house fallback, while pairing each accessible Mermaid diagram with a complete always-visible plain-language flow.

## Boundaries & Constraints

**Always:** Explain Evidence, Generate, Local Gate, Judge, Commit, Render, the shared six-call cap, complete generation/judge pairs, approved house fallback, privacy boundary, COORD authority, KV projection status, and model nondeterminism. Give all four diagrams accessible titles/descriptions, non-color text equivalents, labeled keyboard-scroll containers, robust contrast, and content that survives Mermaid/CDN failure.

**Block If:** Copy would claim same-window identity, public recomputation, third-party verification, or other receipt proof without an active ReceiptClaimManifest; or if implementation requires changing pipeline behavior rather than explaining it.

**Never:** Reintroduce random axes; describe house Briefs as model fallbacks; promise deterministic generated output; expose retries, rejected Candidates, PII, private sources, or implementation secrets; add routes, analytics, deployment, activation, or unrelated shell redesign.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Normal page | `GET /how` | 200 HTML explains the complete adopted pipeline with four diagrams and four equivalent ordered flows | No script required for meaning |
| Mermaid unavailable | CDN/script blocked | Every ordered flow and explanation remains visible and complete | Raw Mermaid source remains hidden |
| Keyboard/small viewport | Focused diagram at 320px | Labeled focusable scroller exposes overflow without clipping page content | No keyboard trap or horizontal page overflow |
| Receipt proof inactive | Default runtime | Only honest non-claiming receipt copy renders | Prohibited legacy/premature phrases fail fixtures |

</intent-contract>

## Code Map

- `src/worker.js:2486-2718` — `howPage()` owns current copy, Mermaid markup, styles, and four diagrams; replace the stale interior without changing route inventory.
- `src/worker.js:2940` — outer `GET /how` dispatch; exercise this surface through `worker.fetch` rather than testing template fragments alone.
- `_bmad-output/planning-artifacts/ux-decision-record-oddspark.md:90-91` — UX-DR2.12 governs accessible Mermaid metadata, text fallback, labeled scrollers, contrast, 320px behavior, and verification evidence.
- `_bmad-output/planning-artifacts/ux-designs/ux-oddspark-2026-08-17/EXPERIENCE.md:116-130` — four `/how` component groups and plain-language fallback contract; read-only.
- `scripts/how-page.fixture.mjs` — new closed required/prohibited visible-copy and per-flow structural assertion helper; no production behavior.
- `scripts/how-page.test.mjs` — new focused outer-route and adversarial mutation suite.
- `test.mjs` — existing Worker integration harness and environment fakes; reuse rather than inventing a second Worker shell.
- `sprint-status.yaml`, planning artifacts, completed specs, deferred-work, semantic content, pinned evidence, pipeline modules, and `wrangler*.toml` — read-only.

## Tasks & Acceptance

**Execution:**
- [x] `src/worker.js` — rewrite `/how` copy and diagrams to the adopted architecture; keep each figure hidden and out of the tab order until successful Mermaid processing, then expose its accessible title/description and labeled focusable scroller; retain four always-rendered ordered fallbacks and compliant contrast. Keep private sources outside the pipeline, distinguish seed input from Evidence, account for Evidence calls in the shared ledger, and describe house selection as conditional on safe authority/commit.
- [x] `scripts/how-page.fixture.mjs` — freeze required visible concepts, prohibited legacy/claim phrases, exact per-flow steps, accessibility attributes/state transition, contrast tokens, and the safe ledger/fallback wording.
- [x] `scripts/how-page.test.mjs` — fetch `/how` through the Worker and prove response semantics, complete per-flow fallbacks, no-Mermaid removal from the accessibility/tab surface, natural-language prohibited-copy mutations, and corruption of every diagram/fallback position.
- [x] `.github/check-ci.mjs` and `scripts/semantic-regression.test.mjs` — include the focused offline Story 1.22 test exactly once, fail on spawn error/signal/nonzero status, and pin that registration against deletion or duplication.
- [x] `runtime-assembly.json` — regenerate through the canonical assembly freeze command after the Worker entrypoint changes; never hand-edit identity hashes.

**Acceptance Criteria:**
- Given the adopted architecture, when a visitor fetches `/how`, then the returned page explains every required stage, privacy boundary, six-call cap, approved house fallback, COORD/KV authority distinction, and nondeterminism without legacy-axis language.
- Given Mermaid does not execute, when the same HTML is read, then four ordered plain-language flows remain visible and complete while raw Mermaid source is not exposed.
- Given inactive receipt proof, when all public `/how` copy is inspected, then no reproducibility or identical-output claim appears and prohibited-phrase mutations fail the focused fixture.
- Given keyboard, screen-reader, 320px, contrast, and axe verification, when the page is exercised, then each labeled scroller is operable, diagrams have equivalent metadata/text, and no serious or critical accessibility violation remains.

## Spec Change Log

- 2026-08-23 — Independent review found that hiding each entire figure with `aria-hidden` contradicted the required Mermaid title/description semantics and left invisible focusable scrollers when Mermaid failed; verification also asserted attributes rather than each fallback's content, CI registration, or the 320px browser boundary. Amend implementation to keep figures `hidden` and untabbable until successful Mermaid processing, expose the rendered accessible SVG afterward, verify every flow and CI dispatch, and retain browser evidence as a distinct completion gate. KEEP: the four-section information architecture, concise honest prose, ordered fallbacks, contrast token, outer Worker-route testing, governed CI integration, and canonical assembly refreeze.

## Review Triage Log

### 2026-08-23 — Review pass 2
- intent_gap: 1: (high 1, medium 0, low 0)
- bad_spec: 2: (high 2, medium 0, low 0)
- patch: 6: (high 0, medium 5, low 1)
- defer: 0
- reject: 0
- blocked_findings:
  - `[high]` `[intent_gap]` The implementation-spec change log overrides the controlling UX authority by exposing rendered SVGs to assistive technology; owner approval and an authoritative-artifact amendment are required before implementation can continue.
  - `[high]` `[bad_spec]` Restore or explicitly supersede the UX-DR2.12 accessibility model; the current story cannot simultaneously require an accessible SVG and an aria-hidden SVG.
  - `[high]` `[bad_spec]` Define and record the required eight-check browser/axe evidence matrix; source-level Node tests cannot establish rendered Mermaid, 320px keyboard, screen-reader, or axe acceptance.
  - `[medium]` `[patch-after-unblock]` Correct receipt copy to say it references or binds approved evidence rather than recording approved input values.
  - `[medium]` `[patch-after-unblock]` Strengthen visible-copy fixtures so hidden markup, metadata, and scripts cannot satisfy public-prose requirements.
  - `[medium]` `[patch-after-unblock]` Exercise Mermaid success/failure and focus transitions in a browser-level test.
  - `[medium]` `[patch-after-unblock]` Match the actual `hidden` attribute rather than any attribute containing the token `hidden`.
  - `[medium]` `[patch-after-unblock]` Prove the 320px page-width and keyboard-panning boundary.
  - `[low]` `[patch-after-unblock]` Detect duplicate focused-suite execution through composed npm/CI commands, not only duplicate command literals in `.github/check-ci.mjs`.

### 2026-08-23 — Review pass
- intent_gap: 0
- bad_spec: 2: (high 2, medium 0, low 0)
- patch: 11: (high 0, medium 9, low 2)
- defer: 0
- reject: 10: (high 0, medium 3, low 7)
- addressed_findings:
  - `[high]` `[bad_spec]` Remove the contradictory `aria-hidden` figure design; hide/untab diagrams only until Mermaid succeeds, then expose accessible metadata while keeping text equivalents.
  - `[high]` `[bad_spec]` Require per-flow, CI-registration, graceful-failure, and actual browser-boundary evidence instead of treating global string counts as accessibility completion.

## Design Notes

Use four concise flows: pipeline stages; evidence/privacy; bounded attempts/house fallback; receipt honesty. Keep the published seed formula only as input transparency—never as a claim that stochastic model output can be recomputed identically.

## Verification

**Commands:**
- `node --test scripts/how-page.test.mjs` -- expected: outer-route, mutation, copy, and fallback structure pass offline.
- `npm test` and `node .github/check-ci.mjs` -- expected: full Worker and governed offline CI gates pass; the protected DW-6 judge self-test remains omitted by repository policy.
- `git diff --check` -- expected: no whitespace errors or protected-file changes.

**Manual checks:**
- With Mermaid blocked, verify all four ordered flows remain readable and no raw graph source appears.
- At 320px and keyboard-only, verify four distinctly labeled scrollers focus and pan without trapping focus or causing page overflow.
- With a screen reader and axe, verify diagram titles/descriptions plus text equivalents are announced appropriately and zero serious/critical violations remain.
