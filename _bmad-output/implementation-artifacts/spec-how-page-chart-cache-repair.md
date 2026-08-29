---
title: 'Prevent Stale /how HTML Across Deployments'
type: 'bugfix'
created: '2026-08-28'
status: 'done'
baseline_commit: '6b1927e348d33bac105df08059d049f9e893fac6'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-how-page-charts.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-decision-record-oddspark.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The reviewed chart repair was promoted and its bytes were present in production, but `/how` explicitly returned `Cache-Control: public, max-age=300`. That contract permits a browser or shared cache to reuse pre-promotion HTML for five minutes, matching the owner's immediate post-promotion observation even though pinned Mermaid 11.17.0 renders the repaired page successfully.

**Approach:** Make only the `/how` HTML response non-storable and freeze that exact outer-route header boundary in focused and full-suite tests. Preserve every chart, accessibility, fallback, content, and unrelated cache contract.

## Boundaries & Constraints

**Always:** Return HTTP 200 HTML for normalized `GET /how` with exact `Cache-Control: no-store`; retain the reviewed `reconcileDiagrams` behavior, four ordered fallbacks, Option A accessibility semantics, 320px keyboard behavior, Mermaid 11.17.0 pin, and controlled/live browser evidence. Preserve upstream drand latest/round and NOAA fetch TTLs and all unrelated route headers.

**Ask First:** Any directive other than route-local `no-store`; any shared cache-helper change; any visitor copy, chart behavior, accessibility, Cloudflare configuration, or CI configuration change; any file outside the maintenance spec, `/how` response implementation, exact focused/full-suite header tests, generated assembly, and repair handoff.

**Never:** Purge a cache; call production; deploy, promote, push, merge, or open a PR; weaken fail-closed rendering; edit the prior completed spec, Story 1.22 history, sprint status, deferred-work ledgers, activation/release evidence, packets/reviews, `wrangler*.toml`, credentials, secrets, or unrelated/untracked artifacts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Canonical route | `GET /how` accepting HTML | 200 HTML with exact `Cache-Control: no-store` | Response cannot remain fresh across deployment |
| Normalized route | `GET /how/` | Same 200 HTML and exact non-storage boundary | Router normalization cannot restore the old five-minute cache window |
| Chart success or failure | Mermaid succeeds, rejects, is absent, partial, or malformed | Existing visual/fallback and Option A behavior is unchanged | No raw source or lost ordered flow |
| Unrelated cache consumers | drand latest/round and NOAA requests; other visitor routes | Existing TTLs and response headers remain unchanged | No shared cache-policy broadening |

</frozen-after-approval>

## Code Map

- `src/worker.js:254-278` — upstream drand and NOAA `cf` TTLs are intentional read-only cache behavior; do not change.
- `src/worker.js:3094` — shared dynamic response headers already use `no-store`; preserve their `Vary` contract and avoid a broad helper change.
- `src/worker.js:3299-3303` — outer `/how` response alone hard-codes the verified `public, max-age=300` stale window; change only this header value.
- `scripts/how-page.test.mjs:16-25` — focused outer-route response contract currently pins the defective cache header; make exact `no-store` the regression boundary while retaining content checks.
- `test.mjs:744-780` — full Worker router-normalization test covers `/how/` and currently pins the same defective header.
- `scripts/how-page.browser.test.mjs` — controlled and real-library browser evidence is read-only unless the route-header change unexpectedly requires a focused fixture adjustment.
- `runtime-assembly.json` — generated identity must be refreshed canonically after the Worker source changes.
- `_bmad-output/implementation-artifacts/spec-how-page-charts.md` and its frontmatter contexts — governing chart/accessibility authority; read-only.

## Tasks & Acceptance

**Execution:**
- [x] `src/worker.js` — replace only `/how`'s five-minute public cache directive with exact `no-store`.
- [x] `scripts/how-page.test.mjs` and `test.mjs` — assert the exact canonical and normalized outer-route cache boundary without weakening existing body/header checks.
- [x] `runtime-assembly.json` — regenerate and verify canonical Worker assembly identity.

**Acceptance Criteria:**
- Given a newly deployed `/how` document, when a browser requests either `/how` or `/how/`, then the response cannot be stored and reused under the former five-minute freshness window.
- Given the cache repair, when controlled and live pinned-Mermaid browser evidence runs, then all existing render, fail-closed, contrast, accessibility, and keyboard assertions remain unchanged and pass.
- Given unrelated routes and upstream fetches, when the full governed suite runs, then their existing caching contracts remain unchanged.

## Spec Change Log

## Design Notes

`no-store` is deliberately route-local. It prevents retaining `/how` HTML at browser/shared-cache layers without coupling this static explanatory page to dynamic-route `Vary` semantics or disturbing upstream data-fetch caching.

## Verification

**Commands:**
- `node --test scripts/how-page.test.mjs` — focused outer-route cache and content contract passes.
- `REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` — controlled Chrome matrix passes unchanged.
- `REQUIRE_CHROME=1 LIVE_MERMAID=1 node --test --test-name-pattern='Chrome live CDN: pinned Mermaid 11 renders every governed diagram' scripts/how-page.browser.test.mjs` — run once; four pinned real-library diagrams and contrast pass.
- `npm test` — full repository suite passes, including normalized `/how/` and unrelated cache behavior.
- `npm run assembly:freeze && npm run assembly:verify` — generated Worker assembly identity is current and valid.
- `node .github/check-ci.mjs` — full governed CI gate passes.
- `git diff --check` — no whitespace errors.
- `git status --short` plus explicit baseline/changed-path comparison — only allowlisted repair paths change; all protected and pre-existing untracked artifacts remain untouched and unstaged.

## Suggested Review Order

**Route-local cache boundary**

- Prevent browser and shared-cache reuse without changing other routes.
  [`worker.js:3300`](../../src/worker.js#L3300)

**Exact response regressions**

- Freeze canonical `/how` as non-storable while retaining content validation.
  [`how-page.test.mjs:19`](../../scripts/how-page.test.mjs#L19)

- Prove normalized `/how/` cannot restore the former cache window.
  [`test.mjs:792`](../../test.mjs#L792)

- Preserve every unrelated upstream cache TTL and call boundary.
  [`test.mjs:546`](../../test.mjs#L546)

**Generated identity**

- Bind runtime assembly to the route-header-only Worker change.
  [`runtime-assembly.json:3`](../../runtime-assembly.json#L3)
