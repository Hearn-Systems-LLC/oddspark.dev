# Independent Acceptance Review: `/how` Cache Repair

## Review Identification

- **Review Target Worktree:** `/Volumes/fast/Github/oddspark/.bmad-governor/worktrees/how-page-charts`
- **Baseline Commit:** `6b1927e348d33bac105df08059d049f9e893fac6`
- **Implementation Commit:** `a84e7e7343edfe5ba4f0bf86ca5f4ee532526f10`
- **Handoff Commit:** `aedd2a94a3ccb94d4c0d0177e3d1724262cf0911`
- **Governing Spec:** `_bmad-output/implementation-artifacts/spec-how-page-chart-cache-repair.md`
- **Handoff Document:** `_bmad-output/implementation-artifacts/how-page-charts-cache-repair-handoff.md`
- **Assembly Identity:** `17cce52081f4dfcf004c683ceaa3839d5d3e3630ee498e63db7d1f84ebede680`
- **Worker Entrypoint SHA-256:** `a3ae28e04caf0dcf76894077c64b2cb868af456f8ea401165a41a79c74fc5d97`

---

## Executive Summary

The `/how` cache repair makes only the outer `/how` HTML response non-storable by replacing its former five-minute public cache directive (`public, max-age=300`) with exact `Cache-Control: no-store`. This resolves the verified root cause of stale HTML across deployments without coupling the static explanatory page to dynamic-route `Vary` semantics, without altering upstream feed caching (`drand` and `NOAA`), and without altering any chart rendering, Mermaid 11.17.0 pinning, fallback lists, accessibility semantics, or keyboard navigation behavior.

The implementation has been verified independently through exact Git diff reconciliation, assembly verification, focused unit tests, controlled Chrome CDP tests, full repository test suite, and the governed CI runner.

**Verdict:** `APPROVE`

---

## Evaluation of Required Review Questions

### 1. Does only the outer `/how` HTML response change from `public, max-age=300` to exact `Cache-Control: no-store`?

**Verdict:** YES (PASS)

- **Reconciliation & Evidence:**
  - `git diff 6b1927e348d33bac105df08059d049f9e893fac6..a84e7e7343edfe5ba4f0bf86ca5f4ee532526f10 -- src/worker.js` confirms that exactly one line changed in `src/worker.js`:
    ```diff
    @@ -3299,7 +3299,7 @@ export default {
           // How it works
           if (path === "/how") {
             return new Response(howPage(), {
    -          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
    +          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
             });
           }
    ```
  - Dynamic responses (`DYNAMIC_HEADERS` at `src/worker.js:3094`) remain untouched with `{ vary: "Origin, Accept, Content-Type", "cache-control": "no-store" }`.
  - All other routes, upstream fetch options, and response headers across the Worker remain unchanged.

---

### 2. Do canonical `/how` and normalized `/how/` tests independently freeze that exact boundary while preserving existing content/header assertions?

**Verdict:** YES (PASS)

- **Reconciliation & Evidence:**
  - **Canonical route test (`scripts/how-page.test.mjs:19-25`):**
    ```javascript
    test("GET /how serves the complete honest pipeline explanation through the Worker", async () => {
      const response = await fetchHow();
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /^text\/html/);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assertHowPage(await response.text());
    });
    ```
  - **Normalized route test (`test.mjs:792-797`):**
    ```javascript
    const how = await worker.fetch(new Request("https://oddspark.dev/how/"), h.env);
    assert.equal(how.status, 200);
    assert.match(how.headers.get("content-type") || "", /text\/html/);
    assert.equal(how.headers.get("cache-control"), "no-store");
    assert.match(await how.text(), /<!doctype html>/i);
    ```
  - Both assertions independently freeze the exact `"no-store"` header value while retaining status (200), `content-type`, and full body assertions (`assertHowPage` and doctype regex).

---

### 3. Does the new upstream-cache regression inspect every matching call, enforce exact call counts, and preserve drand latest 3 seconds, drand round 3600 seconds, and NOAA 60 seconds with `cacheEverything: true`?

**Verdict:** YES (PASS)

- **Reconciliation & Evidence:**
  - `test.mjs:546-561` introduces the regression test `"upstream feed requests preserve their exact cache contracts"`:
    ```javascript
    await test("upstream feed requests preserve their exact cache contracts", async () => {
      const network = createNetwork();
      const h = createEnvironment();
      const response = await worker.fetch(sparkRequest(undefined), h.env);
      assert.equal(response.status, 200);

      const latestCalls = network.calls.filter(({ url }) => url.endsWith("/rounds/latest"));
      const roundCalls = network.calls.filter(({ url }) => url.includes("api.drand.sh/v2/beacons/quicknet/rounds/") && !url.endsWith("/rounds/latest"));
      const noaaCalls = network.calls.filter(({ url }) => url === NOAA_URL);
      assert.equal(latestCalls.length, 1);
      assert.equal(roundCalls.length, 1);
      assert.equal(noaaCalls.length, 1);
      for (const { init } of latestCalls) assert.deepEqual(init.cf, { cacheTtl: 3, cacheEverything: true });
      for (const { init } of roundCalls) assert.deepEqual(init.cf, { cacheTtl: 3600, cacheEverything: true });
      for (const { init } of noaaCalls) assert.deepEqual(init.cf, { cacheTtl: 60, cacheEverything: true });
    });
    ```
  - Inspects every matching call via array loops.
  - Enforces exact call counts (1 latest, 1 round, 1 NOAA).
  - Asserts exact TTLs and `cacheEverything: true` matching `src/worker.js:254-278`.

---

### 4. Are Mermaid rendering, pinning, fallback, accessibility, contrast, and keyboard behavior unchanged?

**Verdict:** YES (PASS)

- **Reconciliation & Evidence:**
  - `howPage()` markup, CSS theme tokens, Mermaid 11.17.0 pin (`https://cdn.jsdelivr.net/npm/mermaid@11.17.0/dist/mermaid.min.js`), and `reconcileDiagrams()` handler (`src/worker.js:2819-3078`) are byte-identical to the baseline chart fix.
  - Option A accessibility semantics (`aria-hidden="true"` on rendered figure and SVG, `tabindex="0"` on `.diagram-scroll` scrollers, visible ordered fallbacks) and 320px viewport keyboard behavior remain intact.
  - Retained live CDN evidence in handoff confirms 4/4 Mermaid 11.17.0 diagrams rendered with minimum text contrast 12.34:1 and stroke contrast 5.59:1.
  - Controlled Chrome browser test suite (`REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs`) executes and passes all 7 applicable tests (with 2 live-only CDN tests cleanly skipped).

---

### 5. Is `runtime-assembly.json` canonical and bound to assembly identity `17cce52081f4dfcf004c683ceaa3839d5d3e3630ee498e63db7d1f84ebede680`?

**Verdict:** YES (PASS)

- **Reconciliation & Evidence:**
  - `runtime-assembly.json` records:
    - Entrypoint: `src/worker.js` with SHA-256 `a3ae28e04caf0dcf76894077c64b2cb868af456f8ea401165a41a79c74fc5d97`
    - Assembly identity: `17cce52081f4dfcf004c683ceaa3839d5d3e3630ee498e63db7d1f84ebede680`
  - Verification command execution:
    ```
    > oddspark@1.0.0 assembly:verify
    > node scripts/assembly-identity.mjs verify

    OK  runtime-assembly identity 17cce52081f4dfcf004c683ceaa3839d5d3e3630ee498e63db7d1f84ebede680 matches (18 runtime-neutral modules)
    ```

---

### 6. Are protected paths and pre-existing untracked artifacts untouched?

**Verdict:** YES (PASS)

- **Reconciliation & Evidence:**
  - `git diff --stat 6b1927e348d33bac105df08059d049f9e893fac6..aedd2a94a3ccb94d4c0d0177e3d1724262cf0911` shows only 6 files modified across the entire branch history:
    1. `_bmad-output/implementation-artifacts/how-page-charts-cache-repair-handoff.md`
    2. `_bmad-output/implementation-artifacts/spec-how-page-chart-cache-repair.md`
    3. `runtime-assembly.json`
    4. `scripts/how-page.test.mjs`
    5. `src/worker.js`
    6. `test.mjs`
  - Zero protected paths (`sprint-status.yaml`, `deferred-work-ledger.md`, `spec-how-page-charts.md`, `epic-1-context.md`, `ux-decision-record-oddspark.md`, `prd.md`, `ARCHITECTURE-SPINE.md`, `wrangler*.toml`, credentials, secrets) were modified.
  - Pre-existing untracked artifacts remain untracked and unmodified.

---

### 7. Do relevant offline/focused tests and governed CI pass from the exact review target?

**Verdict:** YES (PASS)

- **Reconciliation & Evidence:**
  - `node --test scripts/how-page.test.mjs` — PASS (8/8 tests passed in 240ms).
  - `REQUIRE_CHROME=1 node --test scripts/how-page.browser.test.mjs` — PASS (7 passed, 2 live skipped).
  - `npm test` — PASS (109/109 passed).
  - `npm run assembly:verify` — PASS (OK, identity matches).
  - `node .github/check-ci.mjs` — PASS (exit code 0; all test suites, type checking, config checking, baseline verify, assembly verify, semantic regression, how-page unit, and how-page controlled browser tests passed).
  - `git diff --check` — PASS (exit code 0; no whitespace issues).

---

## Findings by Severity

- **Critical:** None
- **Major:** None
- **Minor:** None
- **Informational:**
  - A browser or shared cache that loaded `/how` under the former `public, max-age=300` header prior to deployment may retain that cached copy until its 5-minute TTL expires unless explicitly hard-refreshed by the visitor. This is expected standard HTTP caching behavior and requires no manual cache purge.
  - The deferred human accessibility walkthrough remains unperformed and is not claimed.

---

## Final Verdict

**Verdict:** `APPROVE`

The `/how` cache repair is complete, correct, minimal, and fully verified. It fulfills all acceptance criteria and constraints specified in `spec-how-page-chart-cache-repair.md`.
