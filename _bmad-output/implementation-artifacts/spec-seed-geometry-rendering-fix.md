---
title: 'Seed Geometry Rendering Fix'
type: 'bugfix'
created: '2026-08-28'
status: 'done'
baseline_commit: '0e624016edd15a2308183f3ad0f045da05f5b728'
baseline_revision: '0e624016edd15a2308183f3ad0f045da05f5b728'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-decision-record-oddspark.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-15-committed-brief-rendering.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-24-compatibility-reader-deployment.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Seed Geometry remains at “awaiting a seed” after server-rendered BOOT and successful enhanced strikes because the visualization still expects a private legacy artifact instead of either supported presentation contract. Its desktop stage can also grow to `82vh`/1100px and dominate the result.

**Approach:** Give committed and legacy presentations one closed, deterministic geometry descriptor derived only from their already-public validated identity, initialize it through one visualization seam on BOOT and enhanced success, and replace the desktop-only sizing override with an explicit viewport-aware height bound.

## Boundaries & Constraints

**Always:** Validate the descriptor as versioned 64-character lowercase SHA-256; derive it with a domain-separated hash of presentation family plus routable public id; describe the shell honestly as a presentation fingerprint rather than the receipt seed; retain the current live/degraded solar core; keep committed projection and legacy rendering lossless and provenance-safe; preserve the accessible region, focus/pointer controls, motion stop/reduced-motion rules, breakpoints, and mobile stage behavior.

**Ask First:** Any need to expose committed-envelope provenance/provider input, change a closed artifact schema, alter authoritative Brief/legacy content, or refresh `runtime-assembly.json` and its downstream identity consumers.

**Never:** Read or expose hidden provenance/arbitrary server state; synthesize a committed Brief from legacy data; hide/remove the geometry panel; change deployment/configuration; deploy, activate, sign, push, merge, access credentials, or edit protected bookkeeping.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Initial document | BOOT contains committed or legacy presentation | Fingerprint shell and truthful legend render; core uses current live/degraded solar value | Invalid descriptor is rejected without reading other state |
| Enhanced success | Either supported presentation follows idle or prior success | Geometry updates to that presentation without stale shell state; focus/share behavior is unchanged | Invalid presentation follows existing fail-closed settlement |
| Responsive layout | Desktop at wide or short viewport | Stage height stays within an explicit `clamp(220px, 52vh, 440px)` bound | Below 920px existing mobile rules remain authoritative |

</frozen-after-approval>

## Code Map

- `src/pipeline/contracts.mjs:14-56` -- reuse synchronous runtime-neutral `sha256Hex`; do not introduce browser/provider hashing.
- `src/pipeline/rendering.mjs:25-51,76-77` -- committed public projection/presentation seam; add the descriptor without copying envelope provenance.
- `src/pipeline/legacy-rendering.mjs:50-59,113-115` -- lossless legacy projection/presentation seam; derive from classification kind plus public id, not hidden fields.
- `src/worker.js:1994-1999,2090-2096,2375-2430,2442-2721,2781-2787` -- BOOT serialization, oversized desktop CSS, closed client validation/render settlement, visualization API, and missing BOOT initialization.
- `scripts/brief-rendering.test.mjs` -- pure committed projection contract, determinism, validation, and non-leakage coverage.
- `scripts/brief-rendering.outer.mjs:146-205` -- executable enhanced-client/legacy fixture and rendered outer HTML assertions currently pin the defect.
- `runtime-assembly.json` and protected status/deferred files -- read-only identity/bookkeeping evidence; source changes will intentionally require separately authorized assembly refresh.

## Tasks & Acceptance

**Execution:**
- [x] `src/pipeline/rendering.mjs` and `src/pipeline/legacy-rendering.mjs` -- add the same versioned geometry descriptor contract, domain-separated by presentation family and derived solely from the validated public id.
- [x] `src/worker.js` -- validate and consume the descriptor through one VIZ geometry initializer from both `render()` and BOOT; keep `live()` responsible for the solar core without clearing an initialized shell; update legend claims; bound only the desktop stage height.
- [x] `scripts/brief-rendering.test.mjs` and `scripts/brief-rendering.outer.mjs` -- prove descriptor determinism/non-leakage, BOOT initialization, successful enhanced initialization for committed and legacy families, live/degraded core retention, stale-shell replacement, desktop bounds, unchanged mobile/accessibility/motion markup, and actual rendered outer HTML behavior.

**Acceptance Criteria:**
- Given either supported presentation family, when a server document boots or an enhanced strike succeeds, then its validated deterministic fingerprint geometry replaces “awaiting a seed” without exposing prohibited state.
- Given live or degraded solar data, when geometry initializes or changes, then the core continues to reflect that current solar value.
- Given desktop widths including short viewports, when the page lays out, then the stage uses the explicit 220px/52vh/440px bound; given widths below 920px, existing mobile sizing and interaction behavior remain unchanged.
- Given repository verification, when focused tests, `npm test`, `npm run check`, and `git diff --check` run, then executable client and rendered-HTML boundaries pass or the known assembly-refresh authority gap is reported without modifying frozen identity artifacts.

## Spec Change Log

## Design Notes

The geometry hash is `SHA256("oddspark-seed-geometry/v1" + NUL + presentation-family + NUL + public-id)`. It is a visual fingerprint of an already-public presentation identity, not the receipt seed and not a reproducibility claim. Keeping the descriptor inside each validated projection preserves the existing `{projection, markup}` transport envelope and lets BOOT and enhanced rendering share one client path.

## Verification

**Commands:**
- `npm run brief-rendering:test` -- expected: pure and outer rendering regressions pass.
- `npm test` -- expected: full offline test suite passes.
- `npm run check` -- expected: all applicable checks run; assembly verification may stop on the intentionally unrefreshed frozen identity.
- `git diff --check` -- expected: no whitespace errors.
- `git status --short` plus protected-file SHA-256 comparison -- expected: only the spec and direct implementation/test files changed.

## Suggested Review Order

**Client settlement and visualization integrity**

- Start with the validated render/reset seam shared by every enhanced result.
  [`worker.js:2375`](../../src/worker.js#L2375)

- Geometry state stays independent while the live solar core remains authoritative.
  [`worker.js:2714`](../../src/worker.js#L2714)

- BOOT initializes the same descriptor path after establishing the current core.
  [`worker.js:2795`](../../src/worker.js#L2795)

**Presentation-safe identity boundary**

- Committed geometry derives only from the validated public presentation id.
  [`rendering.mjs:21`](../../src/pipeline/rendering.mjs#L21)

- Legacy geometry remains lossless and independent of hidden seed provenance.
  [`legacy-rendering.mjs:51`](../../src/pipeline/legacy-rendering.mjs#L51)

**Bounded layout and regression proof**

- Desktop height is explicitly bounded while mobile rules remain untouched.
  [`worker.js:2090`](../../src/worker.js#L2090)

- Executable BOOT/enhanced tests cover both families, core retention, and clearing.
  [`brief-rendering.outer.mjs:146`](../../scripts/brief-rendering.outer.mjs#L146)

- Pure contract tests prove deterministic committed-provenance independence.
  [`brief-rendering.test.mjs:31`](../../scripts/brief-rendering.test.mjs#L31)
