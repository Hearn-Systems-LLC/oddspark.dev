# `/how` Chart Cache Repair Handoff

## Status

Development is complete and ready for independent review. No push, PR, merge, deployment, promotion, cache purge, production request, Cloudflare/GitHub configuration change, activation, credential access, or secret access occurred.

## Verified Root Cause

The promoted source and production response contained the reviewed `reconcileDiagrams` repair, and pinned Mermaid 11.17.0 rendered all four diagrams successfully in the real-library browser test. Source inspection then confirmed that the outer `/how` route alone returned `Cache-Control: public, max-age=300`. That directive permits browsers and shared caches to reuse pre-promotion HTML as fresh for five minutes, which is sufficient to produce the owner's immediate post-promotion pre-fix appearance.

The exact intermediary that served the observed stale response cannot be identified from repository evidence alone. The source, observed header, promoted-byte evidence, successful live renderer, and timing jointly establish the five-minute cache window as the supported root cause rather than a Mermaid or CSS failure.

The durable repair changes only `/how` to exact `Cache-Control: no-store`. It leaves chart behavior, Mermaid pinning, accessibility/fallback behavior, all other response headers, and upstream feed caching unchanged.

## Changed Paths

- `_bmad-output/implementation-artifacts/spec-how-page-chart-cache-repair.md`
- `src/worker.js`
- `scripts/how-page.test.mjs`
- `test.mjs`
- `runtime-assembly.json`
- `_bmad-output/implementation-artifacts/how-page-charts-cache-repair-handoff.md` (this handoff only)

The pre-existing untracked cache-repair job, original development packet, independent-review packet, and independent-review report remain unmodified and unstaged.

## Commits and Assembly

Implementation commit: `a84e7e7343edfe5ba4f0bf86ca5f4ee532526f10`

Implementation subject: `fix: prevent stale how page html`

Assembly identity: `17cce52081f4dfcf004c683ceaa3839d5d3e3630ee498e63db7d1f84ebede680`

Worker entrypoint SHA-256: `a3ae28e04caf0dcf76894077c64b2cb868af456f8ea401165a41a79c74fc5d97`

## Validation Commands and Results

- `node --test scripts/how-page.test.mjs` — PASS, 8/8.
- `REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` — PASS, 7 applicable tests passed and 2 live-only tests skipped.
- `REQUIRE_CHROME=1 LIVE_MERMAID=1 node --test --test-name-pattern='Chrome live CDN: pinned Mermaid 11 renders every governed diagram' scripts/how-page.browser.test.mjs` — PASS once, 1 matching test passed; all four Mermaid 11.17.0 diagrams rendered. Recorded minimum text contrast was 12.34:1 and minimum stroke contrast was 5.59:1.
- `npm test` — PASS, 109/109 after adding exact upstream cache-contract coverage.
- `npm run assembly:freeze` — PASS; canonical generated assembly refreshed.
- `npm run assembly:verify` — PASS; identity `17cce52081f4dfcf004c683ceaa3839d5d3e3630ee498e63db7d1f84ebede680` matched 18 runtime-neutral modules.
- `node .github/check-ci.mjs` — PASS, exit 0; governed stages included 109/109 full suite and controlled Chrome 7 applicable passes with 2 expected skips.
- `git diff --check` — PASS.
- Explicit baseline/changed-path audit — PASS; implementation commit contains only the new maintenance spec, route-local Worker header, focused/full-suite tests, and canonical generated assembly.

Two initial direct controlled-browser invocations under Node 24 encountered a Node native callback assertion. The same suite passed under Node 22 and later passed under Node 24 inside the elevated governed CI gate, so current evidence does not indicate a product defect.

## Protected-Path Audit

PASS. `sprint-status.yaml`, deferred-work ledgers, the completed chart spec, Story 1.22 historical authority, planning artifacts, activation artifacts, release/deployment packets and reviews, `wrangler*.toml`, Cloudflare/GitHub configuration, credentials, secrets, and unrelated files were not edited or committed. Sprint synchronization was skipped because this maintenance spec has no epic story key.

The new test also proves preservation of every intentional upstream cache contract: drand latest 3 seconds, drand round 3600 seconds, and NOAA 60 seconds, each with `cacheEverything: true` and exact call counts.

## Remaining Risks

- A response cached under the former directive before this repair is deployed may remain fresh until its existing five-minute lifetime expires; no purge or deployment action was authorized.
- The exact browser or intermediary responsible for the owner's historical stale response is not recoverable from local evidence.
- The deferred human accessibility walkthrough remains unperformed and is not claimed here.
- Deployment, promotion, and post-deployment production confirmation remain outside this job's authority.

## Review Focus

1. Confirm only `/how` changed from `public, max-age=300` to exact `no-store`.
2. Confirm canonical `/how` and normalized `/how/` independently freeze that boundary.
3. Confirm the upstream TTL regression checks every matching call and exact count.
4. Confirm controlled and live Mermaid evidence remained unchanged and passing.
5. Confirm assembly identity and protected-path scope.

Independent review may begin against implementation commit `a84e7e7343edfe5ba4f0bf86ca5f4ee532526f10` together with this handoff.
