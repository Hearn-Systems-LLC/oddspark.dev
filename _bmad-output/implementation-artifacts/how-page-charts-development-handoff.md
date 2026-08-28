# `/how` Charts Development Handoff

## Status

Development is complete and ready for independent review. No push, PR, merge, deployment, Cloudflare operation, production request, provider call, activation, signing, secret access, or bookkeeping update occurred.

## Root Cause

`mermaid.run()` processes diagram nodes individually and can replace successful nodes with SVG before rejecting its aggregate promise because another node failed. `/how` reconciled diagram visibility only in the fulfillment handler, so a final rejection left every scroller hidden even when its node contained a successful processed SVG. The controlled partial double previously resolved instead of reproducing Mermaid's process-then-reject behavior.

The repair reconciles each diagram's actual DOM state after fulfillment or rejection. Only a source with `data-processed="true"` and a descendant SVG is exposed and made keyboard-focusable; failed or malformed diagrams remain hidden while all ordered flows remain visible.

## Changed Paths

- `_bmad-output/implementation-artifacts/spec-how-page-charts.md`
- `src/worker.js`
- `scripts/how-page.browser.test.mjs`
- `scripts/how-page.fixture.mjs`
- `runtime-assembly.json`
- `_bmad-output/implementation-artifacts/how-page-charts-development-handoff.md` (this handoff only)

The governor-created `_bmad-output/implementation-artifacts/how-page-charts-development-packet.md` remains unmodified, untracked, and unstaged.

## Implementation Commit

Full commit SHA: `d9098bc549f74ea26b9284c5c6c6af395dbcbd3e`

Commit subject: `fix: restore how page charts`

Assembly identity: `36e537a55848b90333c96901cdcb47f237d5c48e2aaa6e9716ce0371c679ccfa`

## Validation Results

- `node --test scripts/how-page.test.mjs` — PASS, 8/8 tests.
- `REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` — PASS, 7 passed, 0 failed, 2 live-network-only tests skipped as designed.
- `npm test` — PASS, 108/108 tests.
- `node .github/check-ci.mjs` — PASS end-to-end, including its governed focused and controlled Chrome stages.
- `npm run assembly:freeze` — PASS; canonical assembly refreshed.
- `npm run assembly:verify` — PASS; assembly identity verified.
- `git diff --check` — PASS.
- Explicit changed-path audit — PASS; the implementation commit contains only the maintenance spec, Worker, focused browser/fixture tests, and generated assembly.

The first Node 24 browser invocation encountered a native callback assertion in the local harness. Node 22 completed the controlled Chrome matrix, and the final governed CI invocation on the default Node subsequently passed the Chrome stage and all gates.

## Protected-Path Check

PASS. `sprint-status.yaml`, deferred-work ledgers, Story 1.22's historical spec, planning artifacts, activation artifacts, deployment packets, `wrangler*.toml`, secrets, credentials, and unrelated files were not edited or committed. Sprint synchronization was skipped because the maintenance spec has no epic story key.

## Remaining Risks

- The intentionally deferred human accessibility walkthrough remains unperformed and is not claimed by this maintenance work.
- Live CDN Mermaid and live axe cases were not run because this packet forbids external calls; the required controlled, network-free Chrome suite passed.
- Deployment and production confirmation remain outside this packet's authority.

## Review Focus

1. Confirm `src/worker.js` reconciles successful per-node DOM state on both aggregate promise outcomes without exposing raw Mermaid source.
2. Confirm process-then-reject and partial-rejection Chrome cases fail on the shipped fulfillment-only implementation.
3. Confirm Option A semantics: rendered figure/SVG stays AT-hidden; ordered flows remain the sole AT equivalents; labeled scrollers remain keyboard-pannable at 320px.
4. Confirm `runtime-assembly.json` matches the Worker change and the committed path set contains no protected artifact.

Independent review may begin against implementation commit `d9098bc549f74ea26b9284c5c6c6af395dbcbd3e` together with this handoff.
