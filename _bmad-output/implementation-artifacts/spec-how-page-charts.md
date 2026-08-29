---
title: 'Restore /how Mermaid Charts'
type: 'bugfix'
created: '2026-08-28'
status: 'done'
baseline_commit: 'f83641748ae205f637161afa013136c90884f262'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-decision-record-oddspark.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The outer `GET /how` route renders its explanatory prose and ordered fallbacks, but its four Mermaid visuals can remain hidden even after Mermaid has successfully replaced their source with SVG. The aggregate `mermaid.run()` promise may reject after per-node processing, while the current page reveals diagrams only on fulfillment.

**Approach:** Reconcile each diagram's actual post-run DOM state after either fulfillment or rejection. Expose only scrollers whose source is marked processed and contains SVG; keep failed or malformed diagrams hidden while all four ordered flows remain visible.

## Boundaries & Constraints

**Always:** Preserve Story 1.22's four-section information architecture, visible ordered-list fallbacks, privacy and receipt-honesty copy, exact Mermaid pin, and Option A contract: each rendered figure/SVG stays hidden from assistive technology while its labeled scroller is focusable and keyboard-pannable at 320px without page overflow or a trap. Reconciliation must be safe on repeated initialization and partial failure.

**Ask First:** Any change to pipeline behavior or visitor copy; any accessibility-model change; any edit outside the authorized maintenance spec, minimum `/how` implementation and focused tests, canonical generated assembly, and terminal handoff.

**Never:** Expose raw Mermaid source; hide or remove an ordered fallback; claim the deferred human accessibility walkthrough is complete; call production, an external provider, or Cloudflare; edit historical Story 1.22, planning, activation, deployment, bookkeeping, `wrangler*.toml`, secrets, credentials, or the governor packet.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Successful render | All four nodes contain processed SVGs | Four visible, labeled, focusable visual scrollers | Ordered flows remain visible |
| Aggregate rejection after processing | Some or all nodes contain processed SVGs before `run()` rejects | Every successful SVG scroller is visible; unsuccessful siblings stay hidden | No raw source; all four ordered flows remain complete |
| Blocked, absent, or malformed Mermaid | No valid processed SVG for a node | No failed visual scroller is exposed or tabbable | Ordered flows are the complete visible fallback |
| Repeated initialization | Enhancement runs again over current DOM | Valid scrollers remain exposed exactly once and retain Option A semantics | No duplicate focus stops or leaked source |

</frozen-after-approval>

## Code Map

- `src/worker.js:2819-3076` — `howPage()` owns `/how` markup, styles, pinned Mermaid initialization, and the fulfillment-only visibility reconciliation that causes the bug.
- `src/worker.js:3298` — outer `GET /how` dispatch; retain route-level coverage through `worker.fetch`.
- `scripts/how-page.browser.test.mjs:30-42` — controlled Mermaid browser doubles; add a production-shaped process-then-reject outcome.
- `scripts/how-page.browser.test.mjs:334-410` — real Chrome/CDP DOM, accessibility-tree, 320px keyboard, failure, partial, malformed, and repeated-init evidence.
- `scripts/how-page.fixture.mjs:80-108` — source/structure guard for hidden raw source and exclusive successful exposure; amend only if the implementation contract requires it.
- `scripts/how-page.test.mjs` — focused outer-route and adversarial fixture suite; preserve copy authority.
- `runtime-assembly.json` — generated identity only; refresh through canonical assembly commands if `src/worker.js` changes.
- `_bmad-output/implementation-artifacts/how-page-charts-development-packet.md`, Story 1.22 context and protected artifacts — read-only and excluded from staging.

## Tasks & Acceptance

**Execution:**
- [x] `src/worker.js` — make per-scroller post-run reconciliation execute after both Mermaid fulfillment and rejection, exposing only processed nodes containing SVG.
- [x] `scripts/how-page.browser.test.mjs` — model SVG replacement followed by aggregate rejection and assert actual browser DOM visibility, fallback, raw-source, accessibility, and keyboard boundaries.
- [x] `scripts/how-page.fixture.mjs` and `scripts/how-page.test.mjs` — retain or narrowly strengthen focused structural and outer-route regression coverage.
- [x] `runtime-assembly.json` — regenerate canonically after the Worker change and verify its identity.

**Acceptance Criteria:**
- Given Mermaid has replaced four sources with SVG before rejecting, when `/how` settles in Chrome, then all four charts are visually available and each visual stays AT-hidden inside one labeled keyboard scroller.
- Given Mermaid partially processes and then throws, when `/how` settles, then every successful chart is visible, each failed chart stays hidden, and all four ordered lists remain visible with no raw Mermaid source.
- Given a 320px viewport, when a sighted keyboard user tabs to each exposed scroller and pans it, then focus progresses through and out of the diagrams without page overflow or a keyboard trap.

## Spec Change Log

## Design Notes

Mermaid `run()` processes nodes individually and throws the first collected error after the loop. Promise outcome is therefore not a truthful proxy for every node's render outcome; the DOM (`data-processed` plus descendant SVG) is the per-diagram authority.

## Verification

**Commands:**
- `node --test scripts/how-page.test.mjs` — focused outer-route and mutation suite passes.
- `REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` — controlled network-free Chrome suite proves process-then-reject, failure, malformed, re-init, Option A, and 320px behavior.
- `npm test` — complete repository suite passes.
- `node .github/check-ci.mjs` — governed CI checks pass.
- `npm run assembly:freeze && npm run assembly:verify` — generated Worker assembly identity is current and valid.
- `git diff --check` — no whitespace errors.
- `git status --short` plus explicit changed-path comparison — only allowlisted paths changed; protected paths and governor packet remain untouched and unstaged.

## Suggested Review Order

**Failure reconciliation**

- Reconcile trustworthy per-node DOM state on both aggregate promise outcomes.
  [`worker.js:3062`](../../src/worker.js#L3062)

- Bind the same fail-closed reconciliation to fulfillment and rejection.
  [`worker.js:3074`](../../src/worker.js#L3074)

**Browser regression evidence**

- Model Mermaid processing followed by aggregate rejection without external networking.
  [`how-page.browser.test.mjs:30`](../../scripts/how-page.browser.test.mjs#L30)

- Prove all processed visuals remain visible and AT-hidden after rejection.
  [`how-page.browser.test.mjs:370`](../../scripts/how-page.browser.test.mjs#L370)

- Prove partial failure and repeated initialization preserve every boundary.
  [`how-page.browser.test.mjs:413`](../../scripts/how-page.browser.test.mjs#L413)

**Structural and generated evidence**

- Guard that active reconciliation handles both promise outcomes.
  [`how-page.fixture.mjs:108`](../../scripts/how-page.fixture.mjs#L108)

- Bind the generated assembly identity to the repaired Worker source.
  [`runtime-assembly.json:3`](../../runtime-assembly.json#L3)
