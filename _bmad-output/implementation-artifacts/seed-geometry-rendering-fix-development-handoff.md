# Seed Geometry Rendering Fix — Development Handoff

## Outcome

**Complete at the authorized source/spec/test boundary.** The Seed Geometry shell now initializes honestly for committed and legacy presentations on server BOOT and successful enhanced rendering, clears stale geometry on failed settlement, and uses a bounded desktop height. Release/runtime-assembly qualification remains intentionally incomplete because refreshing frozen assembly identity was not authorized.

## BMAD workflow and specification

- Workflow: installed `bmad-build`, plan-code-review route, completed through independent three-layer review and terminal presentation.
- Specification: `_bmad-output/implementation-artifacts/spec-seed-geometry-rendering-fix.md`
- Final spec status: `done`
- Baseline: `0e624016edd15a2308183f3ad0f045da05f5b728`
- No commit was created, per the development packet.

## Final `git status --short`

```text
 M scripts/brief-rendering.outer.mjs
 M scripts/brief-rendering.test.mjs
 M src/pipeline/legacy-rendering.mjs
 M src/pipeline/rendering.mjs
 M src/worker.js
?? _bmad-output/implementation-artifacts/seed-geometry-rendering-fix-development-handoff.md
?? _bmad-output/implementation-artifacts/spec-seed-geometry-rendering-fix.md
```

## Changed files and purpose

- `_bmad-output/implementation-artifacts/spec-seed-geometry-rendering-fix.md` — hardened freeform BMAD defect spec, completed task state, and suggested review trail.
- `src/pipeline/rendering.mjs` — derives a versioned committed-presentation geometry fingerprint solely from the validated public id.
- `src/pipeline/legacy-rendering.mjs` — derives the corresponding legacy-family fingerprint without using hidden seed/provenance fields.
- `src/worker.js` — validates and initializes geometry on BOOT/enhanced success, preserves the live/degraded solar core, clears stale shells on failure, uses truthful fingerprint legend copy, and bounds desktop stage height with `clamp(220px, 52vh, 440px)`.
- `scripts/brief-rendering.test.mjs` — proves committed fingerprint determinism and independence from prohibited provenance.
- `scripts/brief-rendering.outer.mjs` — executes real client BOOT/VIZ/enhanced behavior for both presentation families, invalid settlement, core retention, non-leakage, and rendered HTML/CSS structure.
- `_bmad-output/implementation-artifacts/seed-geometry-rendering-fix-development-handoff.md` — this terminal evidence record.

## Contract and design decision

Geometry consumes `SHA256("oddspark-seed-geometry/v1" + NUL + presentation-family + NUL + public-id)`. This value is a deterministic visual fingerprint of an already-public validated presentation identity; it is not the receipt seed, does not imply model reproducibility, and exposes no committed envelope provenance, provider input, or arbitrary server state. The solar core remains driven only by the current live/degraded solar value.

## Verification evidence

- `npm run brief-rendering:test` — PASS, 6/6 tests.
- `npm test` — PASS, 108/108 tests.
- `npm run check` — STOPPED FAIL-CLOSED in `release-decision:test`: the real retained assembly adapter returned `blocked` where the frozen baseline expects `pass`. This is the expected consequence of changed `src/worker.js`/pipeline source with intentionally unchanged `runtime-assembly.json`; subsequent composed checks did not run.
- `git diff --check` — PASS, no whitespace errors.
- Rendered outer HTML/client boundary — PASS through the registered `story15.shell` and executable enhanced-client cases in the 108-test suite; coverage includes committed/legacy BOOT, successful enhanced replacement, invalid-response clearing, live `M2.4` and degraded `----` core retention, accessible region/canvas, reduced motion, mobile media rules, and desktop height declaration.
- Three-layer BMAD review — completed. One real stale-fingerprint finding was patched; verification/non-leakage fixtures were strengthened. No unresolved intent gap or bad-spec finding remains.
- Protected hashes remained byte-identical:
  - `sprint-status.yaml`: `d19fe13c09dc1a72b0bfd0bea19193c921b29cdcfd7e4d05a8de9561d3571318`
  - `deferred-work.md`: `8876023e79fcab4d2c5b6b9a26641fac3a4d56ef3d8ce0b860b7f0b7c9aeebd9`

## Remaining risk and follow-on authority

- `runtime-assembly.json` is now intentionally stale relative to the changed canonical entrypoint/modules. A separately authorized continuation must run the governed assembly refresh, update any authorized identity consumers, and then rerun `npm run check`/assembly verification before release use.
- No deployment or production runtime verification was attempted. This worktree is not release-qualified until the assembly follow-on passes.

## Explicit boundary confirmation

No deployment, activation, signing, push, merge, credential access, commit, sprint-status edit, deferred-ledger edit, frozen runtime-assembly refresh, duplicate-root-worker edit, Wrangler edit, or unrelated artifact mutation occurred.
