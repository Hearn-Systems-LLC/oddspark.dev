---
title: 'Story 1.22: Honest Pipeline Explanation'
type: 'feature'
created: '2026-08-23'
status: 'awaiting-operator'
baseline_revision: 'a8665c2ea0721977db80fcefc4f5e18786e5815f'
baseline_commit: 'a8665c2ea0721977db80fcefc4f5e18786e5815f'
review_loop_iteration: 2
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-decision-record-oddspark.md'
warnings:
  - 'The eight enumerated manual checks, including a human screen-reader walkthrough, remain operator-owned and unperformed.'
operator_actions:
  - 'Perform and record the eight UX-DR2.12 manual accessibility checks, including one named screen-reader and browser pairing.'
deferred: []
---

<intent-contract>

## Intent

**Problem:** `/how` still describes legacy four-axis deterministic generation and makes reproducibility claims that the current receipt-proof authority does not permit.

**Approach:** Rewrite the existing page around the adopted Evidence-to-Render pipeline, bounded and nondeterministic model behavior, privacy and house fallback. Mermaid retains descriptive metadata in source and visual rendering, but its figure/SVG stays hidden from assistive technology; each complete always-visible ordered flow is the sole AT equivalent.

## Boundaries & Constraints

**Always:** Explain Evidence, Generate, Local Gate, Judge, Commit, Render, the shared six-call cap, complete generation/judge pairs, approved house fallback, privacy boundary, COORD authority, KV projection status, and model nondeterminism. Give all four visual diagrams source/render metadata, an always-visible ordered-list AT equivalent, labeled keyboard-scroll containers, robust contrast, and content that survives Mermaid/CDN failure.

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
- `scripts/how-page.browser.test.mjs` — dependency-free Chrome/CDP evidence for controlled Mermaid success/failure/partial/malformed/re-init, Option A accessibility-tree semantics, rendered contrast, and the 320px keyboard boundary; exact live Mermaid and pinned axe-core distributable exercises are opt-in.
- `.github/check-ci-runner.mjs` — injectable synchronous step-result classifier used by governed CI and behaviorally tested for success, spawn error, signal, and nonzero status.
- `test.mjs` — existing Worker integration harness and environment fakes; reuse rather than inventing a second Worker shell.
- `sprint-status.yaml`, planning artifacts, completed specs, deferred-work, semantic content, pinned evidence, pipeline modules, and `wrangler*.toml` — read-only.

## Tasks & Acceptance

**Execution:**
- [x] `src/worker.js` — preserve controlling UX-DR2.12/EXPERIENCE semantics: keep each figure hidden and untabbable until successful Mermaid processing, then expose the labeled keyboard-scroll container visually while keeping the rendered figure/SVG `aria-hidden`; the four ordered lists remain the sole assistive-technology equivalents. Correct privacy and receipt wording without changing pipeline behavior.
- [x] `scripts/how-page.fixture.mjs` — freeze required visible prose independently from hidden diagram metadata/scripts, match the exact `hidden` attribute, and enforce the Option A accessibility transition.
- [x] `scripts/how-page.test.mjs` — retain outer-route/adversarial coverage and add browser-level Mermaid success/failure plus 320px focus, panning, and no-page-overflow evidence where repository tooling permits.
- [x] `.github/check-ci.mjs` and `scripts/semantic-regression.test.mjs` — include the focused offline Story 1.22 test exactly once, fail on spawn error/signal/nonzero status, and detect duplicate focused-suite execution through composed npm/CI commands.
- [x] `runtime-assembly.json` — regenerate through the canonical assembly freeze command after the Worker entrypoint changes; never hand-edit identity hashes.
- [x] `scripts/how-page.browser.test.mjs` — fetch and inject the pinned axe-core 4.13.0 browser distributable only when `LIVE_AXE=1`, exercise both rendered-Mermaid and blocked-Mermaid states, and fail on every serious or critical violation without adding a package dependency.
- [x] Pin production Mermaid to exact version 11.17.0; register the deterministic network-free Chrome suite exactly once in governed CI; cover partial, malformed, and repeated initialization; and exercise live axe against actual Mermaid output.
- [x] Complete UX-DR2.12's product-wide axe route/state matrix using reused Worker integration fixtures for `/` idle, local/domain/downgrade/house Briefs, 400, 502, `/s/:id`, not-found, and `/how` blocked/live states; fix the shared `#stage` generic-role violation and enforce zero serious/critical findings.
- [ ] Operator: complete UX-DR2.12's eight manual accessibility checks, including the human screen-reader walkthrough.

**Acceptance Criteria:**
- Given the adopted architecture, when a visitor fetches `/how`, then the returned page explains every required stage, privacy boundary, six-call cap, approved house fallback, COORD/KV authority distinction, and nondeterminism without legacy-axis language.
- Given Mermaid does not execute, when the same HTML is read, then four ordered plain-language flows remain visible and complete while raw Mermaid source is not exposed.
- Given inactive receipt proof, when all public `/how` copy is inspected, then no reproducibility or identical-output claim appears and prohibited-phrase mutations fail the focused fixture.
- Given keyboard, screen-reader, 320px, contrast, and axe verification, when the page is exercised, then each labeled visual scroller is operable, source/render metadata remains hidden from AT with the ordered lists as the sole AT equivalents, and no serious or critical accessibility violation remains.

## Spec Change Log

- 2026-08-23 — Final harness hardening proved imported Worker fixtures do not register or rerun the 91-test suite, bounded CDP open/commands, rejected all pending commands on socket close/error, and added a 15-second abort to the live axe download. Controlled, live, full, assembly, and governed gates passed before restoring `awaiting-operator` for the manual eight-check report only.
- 2026-08-23 — Closed the matrix's shared serious finding narrowly: the already named and keyboard-focusable Seed Geometry `#stage` is now an explicit `region`, with focused shell regression coverage. All required axe states now enforce zero serious and zero critical violations; only the manual operator checks remain.
- 2026-08-23 — Completed the full automated UX-DR2.12 axe matrix by exporting the existing Worker integration harness and adding a narrow state-page builder. `/how` remains zero serious/critical in blocked and live Mermaid states. All nine non-`/how` shell states share one pre-existing serious `aria-prohibited-attr` finding at `#stage`, a baseline surface unchanged by Story 1.22; it is recorded and drift-pinned rather than silently remediated here. Automated work is complete; status is `awaiting-operator` for the eight manual checks.
- 2026-08-23 — Final patch pass pinned Mermaid 11.17.0 exactly, added controlled browser CI, live-Mermaid axe and rendered-contrast evidence, malformed/partial/re-init coverage, public title/meta claim scanning, and behavioral CI-runner terminal tests. Reverted status to `in-progress` after re-reading UX-DR2.12: its product-wide axe matrix and manual eight-check report remain incomplete.
- 2026-08-23 — Added the opt-in live axe-core 4.13.0 matrix. Its first run found four serious `aria-prohibited-attr` nodes because the labeled focusable scrollers had only a generic role; declaring each scroller as a named `region` fixed the violation while preserving Option A's aria-hidden figure/SVG and ordered-list AT equivalent. The rerun reported zero serious and zero critical violations in both Mermaid-success and Mermaid-blocked states.
- 2026-08-23 — Owner approved Option A: preserve controlling UX-DR2.12/EXPERIENCE. Rendered Mermaid figures/SVGs remain `aria-hidden`; the four ordered lists are the sole assistive-technology equivalents. Successfully rendered visual scrollers remain distinctly labeled and keyboard-pannable for sighted and low-vision keyboard users without creating empty or confusing AT focus stops. Re-armed the story from `blocked` to `in-progress`; browser/axe evidence remains a distinct completion gate.
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
- `REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` -- governed network-free suite: controlled Mermaid success/failure/partial/malformed/re-init, Option A accessibility-tree semantics, and 320px Tab/Arrow-key/no-page-overflow checks pass.
- `LIVE_MERMAID=1 LIVE_AXE=1 REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` -- expected where network is available: exact Mermaid 11.17.0 rendering, computed visual contrast, and axe-core 4.13.0 across the authoritative product route/state matrix pass their exact drift-pinned baselines.
- `LIVE_AXE=1 REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` -- expected where Chrome and network are available: fetch pinned axe-core 4.13.0, exercise every authoritative route/state plus live and blocked Mermaid, and fail on serious or critical violations.
- `npm test` and `node .github/check-ci.mjs` -- expected: full Worker and governed offline CI gates pass; the protected DW-6 judge self-test remains omitted by repository policy.
- `git diff --check` -- expected: no whitespace errors or protected-file changes.

**Manual checks:**
- With Mermaid blocked, verify all four ordered flows remain readable and no raw graph source appears.
- At 320px and keyboard-only, verify four distinctly labeled scrollers focus and pan without trapping focus or causing page overflow.
- With a screen reader, verify the four ordered text equivalents are announced appropriately and the visual-only diagram regions do not create confusing stops. This human walkthrough is not established by automated accessibility-tree or axe results.

**Recorded browser evidence (2026-08-23):** Local headless Chrome passed controlled Mermaid success/failure/partial/malformed/repeated-init cases, Chrome accessibility-tree checks, a 320px viewport with no page-level horizontal overflow, real Tab traversal through four named scrollers, real ArrowRight panning for each scroller, focus exit after the fourth scroller, and live rendering through exact Mermaid 11.17.0. Live computed evidence covered 68 text samples (minimum contrast 12.34:1) and 96 stroke samples (minimum contrast 5.59:1). This is browser automation, not a human screen-reader walkthrough.

**Recorded axe evidence (2026-08-23):** `LIVE_MERMAID=1 LIVE_AXE=1 REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` fetched exact Mermaid 11.17.0 and injected pinned axe-core 4.13.0 without installing either.

| Required state | Minor | Moderate | Serious | Critical | Exact rules / classification |
|---|---:|---:|---:|---:|---|
| `/` idle | 0 | 0 | 0 | 0 | No violations |
| local Brief | 0 | 0 | 0 | 0 | No violations |
| domain Brief | 0 | 0 | 0 | 0 | No violations |
| downgrade | 0 | 0 | 0 | 0 | No violations |
| house Brief | 0 | 0 | 0 | 0 | No violations |
| 400 | 0 | 0 | 0 | 0 | No violations |
| 502 | 0 | 0 | 0 | 0 | No violations |
| `/s/:id` | 0 | 0 | 0 | 0 | No violations |
| not-found page | 0 | 0 | 0 | 0 | No violations |
| `/how`, Mermaid blocked | 0 | 2 | 0 | 0 | `landmark-one-main` (1 node), `region` (15 nodes) |
| `/how`, Mermaid 11.17.0 live | 0 | 2 | 0 | 0 | `landmark-one-main` (1 node), `region` (15 nodes) |

**Residual evidence:** Only UX-DR2.12's eight manual checks remain, including a named human screen-reader/browser walkthrough. Do not claim those checks or human announcement quality until the operator records them.
