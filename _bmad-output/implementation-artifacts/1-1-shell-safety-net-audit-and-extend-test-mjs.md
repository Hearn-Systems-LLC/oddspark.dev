---
baseline_commit: 3fc6a9b322bcd49fdffd7d9df7fbef9da46eda5a
---

# Story 1.1: Shell Safety Net — Audit and Extend test.mjs

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the preserved shell behavior pinned by tests (with the two security guards fixed) before any pipeline surgery,
so that every later commit is provably deployable and the security sharp edges are closed while the shell is under test.

## Acceptance Criteria

1. **Given** the current `src/worker.js` and `test.mjs`, **when** I audit and extend the test suite, **then** existing shell behavior (routes, error taxonomy, KV key scheme, DO operations, scan budgets, seed derivation) is covered by passing tests.
2. `/api/meter` is no longer publicly readable (removed or access-guarded), with a test.
3. CORS on POST endpoints is tightened from `*` to the oddspark.dev origin, with a test.
4. The full suite runs green under Node as `test.mjs` does today (`npm test` → `node test.mjs`).

## Tasks / Subtasks

- [x] Task 1: Pin uncovered shell surface in `test.mjs` (AC: 1, 4)
  - [x] Route/404 matrix: `/api/spark/:id` bad-pattern vs KV-miss 404s (src/worker.js:2431-2433); `/s/:id` bad-id plain 404 vs generic-id KV-miss 302→`/` vs `p-` id KV-miss 404 (2476-2484); catch-all 404 (2516); trailing-slash normalization (2422); `/how` HTML + `cache-control: public, max-age=300` (2490-2494).
  - [x] Error taxonomy: 502 JSON `{error}` for `/api/*` failures (2519) and plain-text 502 for non-API paths (2520) — e.g. drand or NOAA unreachable; `/api/sun` failure path.
  - [x] `wantsText` matrix: `httpie`/`wget`/`http` UA prefixes and Accept-header cases (2412-2417), incl. the root curl path meter line via `asText` 3rd arg (2500-2501).
  - [x] DO direct-operation pins: `NeuronMeter` POST `n<=0` guard (651) and GET `?day=` (the class is currently never exercised — only mocked); `SparkCoordinator` `/commit` 400 `"invalid coordinator commit"` validation (715) and unknown-operation 404 (762); `/slot`, `/claim`, `/release` direct pins (currently only covered indirectly through flows).
  - [x] Scan budgets: 4s time budget (`SCAN_BUDGET_MS`, deadline checks at 479 and 509) and declared `content-length` overflow (527-531); keep byte-limit/redirect-aggregate tests as-is (already covered at test.mjs:609, 633).
  - [x] Seed derivation: personalized id preimage `1|<round>|<seed>|<domain>|<profile_hash]` → `p-`+16-hex (1198-1200) recomputed in-test; generic preimage math already pinned (test.mjs:296).
  - [x] Meter/model-fallback: `modelFor` switches to fallback at 2500 neurons (`NEURON_FREE_DAILY=10000` × `NEURON_FALLBACK_FRACTION=0.25`, 631-632, 790-794); `recordNeurons` best-effort failure swallowing (776-788).
- [x] Task 2: Close the `/api/meter` exposure (AC: 2)
  - [x] Decide with Justin (or apply the default below): remove the `GET /api/meter` route (2462-2471) **or** access-guard it. Default if no direction: remove the public route and serve the footer meter from a same-origin, non-CORS JSON path that reveals nothing beyond `{day, used, free, fallback_at, model}` — i.e. strip CORS headers from it rather than delete the footer feature.
  - [x] Update the two known consumers: page footer `fetch("/api/meter")` (1715) and root curl text meter line (2500-2501).
  - [x] Test: `/api/meter` (or its replacement) is not cross-origin readable (no `access-control-allow-origin` header), and the footer/curl consumers still work.
- [x] Task 3: Tighten CORS on POST endpoints (AC: 3)
  - [x] Replace blanket `access-control-allow-origin: *` (2400-2403) with origin-aware handling: `https://oddspark.dev` (decide whether `www.` and preview hostnames are in scope — record the decision) allowed on POST `/api/spark`; GET API routes may stay readable per Justin's call, default tighten uniformly.
  - [x] Add `access-control-allow-headers: content-type` so preflighted JSON POSTs work (absent today — cross-origin JSON POST currently fails preflight).
  - [x] OPTIONS handler (2425) reflects the same tightened policy.
  - [x] Tests: disallowed origin gets no allow-origin header (or a rejected preflight); oddspark.dev origin POST succeeds; same-origin browser flow unaffected; HTML/text routes unchanged (no CORS headers, as today).
- [x] Task 4: Keep the harness convention intact (AC: 4)
  - [x] All new tests use the existing `test.mjs` harness (`test(name, fn)` + `node:assert/strict`, `createNetwork`/`createStorage`/`createEnvironment` mocks) — no new framework, no new dependency.
  - [x] `npm test` green; suite still runs under plain Node (DO classes must not come to depend on `cloudflare:workers` imports — the src/worker.js:639-640 precedent).

## Dev Notes

### What this story is for

This is Epic 1's opening story: pin the preserved shell (AD-6 "Preservation seam") before Stories 1.5+ replace generation internals. Every later commit must keep `test.mjs` green and the live site deployable. **Do not touch generation internals, axis lists, renderers, or the router's route set** — pipeline surgery belongs to later stories. The only behavioral changes permitted here are the two security guards (Tasks 2-3); everything else is additive test coverage of behavior as it exists today.

### Current state — verified facts (read the cited lines before editing)

**Router** (src/worker.js:2419-2523): trailing slashes stripped (2422); routes are `OPTIONS *` (2425), `GET /api/spark/:id` (2429-2435), `POST /api/spark` (2438-2454), `GET /api/sun` (2457-2459), `GET /api/meter` (2462-2471), `GET /s/:id` (2474-2487), `GET /how` (2490-2494), `GET /` (2497-2514), catch-all 404 (2516). Note: `/api/spark` does not check method — any method strikes (2438). Non-JSON/malformed POST bodies are **not** errors today — they fall through to a generic strike (`readSparkIntent`, 344-390); pinning that as-is is correct (changing it to 400 is Story 1.12's job, not this one).

**Error taxonomy**: `WebsiteInputError` (class at 241) → 400 `{error, field:"website"}` (2518, also inline 2443). Any other error under `/api/*` → 502 `{error}` JSON (2519). Non-API path errors → 502 plain text `"A feed did not answer: ..."` (2520). DO-internal: 400 `"invalid coordinator commit"` (715), 404 `"unknown coordinator operation"` (762).

**`/api/meter`** (2462-2471): currently public, no auth, returns `{day, used, free: 10000, fallback_at: 2500, model}` and carries `access-control-allow-origin: *` via `json()` (2405-2410). Consumers: page footer fetch (1715), root curl text meter line (2500-2501). Both must keep working after the guard lands.

**CORS**: single const at 2400-2403 `{access-control-allow-origin: "*", access-control-allow-methods: "GET,POST,OPTIONS"}`, applied to every `json()` response; OPTIONS short-circuits globally at 2425; HTML/text routes carry no CORS headers; **no `access-control-allow-headers` today** (cross-origin JSON POST fails preflight — tightening must add the header or the button breaks for allowed origins).

**KV key scheme** (namespace `SPARKS`, bindings in wrangler.toml:27-41): `w:<round>` window pointer → 8-hex generic id (put 1263/1304, get 1024/1252); `<8-hex id>` full generic spark JSON (put 1303); `p-<16 hex>` full personalized spark (put 1086); `pw:<round>:<domain>` pointer → `p-` id or literal `"unavailable"` (1087/1124/1133-1134); `profile:<domain>` profile JSON with `PROFILE_TTL=86400` clamped to coordinator `expires_at` (1175-1176); `n:<day>:<n>:<id>` neuron receipts, `NEURON_RECEIPT_TTL=172800` (784). None of `w:`, `pw:`, spark PUTs carry TTLs today — **do not add TTLs in this story** (that is Story 3.6, and TTL choice is constrained by the receipt window).

**Durable Objects**: `NeuronMeter` (641-657) and `SparkCoordinator` (661-764) are deliberately plain classes not extending `cloudflare:workers` (comment at 639-640) so `test.mjs` can import them under Node — preserve this. Coordinator ops, all POST + transactional: `/slot` (670-689, `VISITOR_WINDOW_MS=3600000`, `VISITOR_DOMAIN_LIMIT=10`), `/claim` (691-705, `CLAIM_LEASE_MS=20000`), `/commit` (707-733, validates id `/^p-[0-9a-f]{16}$/` or 8-hex unavailable shape), `/release` (735-744), `/profile` (746-760, first-write-wins). Helpers: `meterStub` (766-768), `coordStub` (962-964), `coordPost` (966-974, throws "coordinator unavailable" on !ok), `claimOwner` (976-980), `acquireDomainClaim` poll loop (986-993), `finalizeClaim` (1108-1115), `commitUnavailable` (1117-1130), `readCommittedSpark` 50×20ms KV poll (1072-1079). `SPARK_ID_RE = /^(?:[0-9a-f]{8}|p-[0-9a-f]{16})$/` (39).

**Seed derivation & budgets**: `WINDOW_ROUNDS=100` (26, 5-min quicknet window), `currentWindow` (185-190), `readDrand` (192-199, `randomness = SHA256(hexToBytes(signature))`), `readSolar` (201-212, last `0.1-0.8nm` row, throws if absent), `derive` (221-235, preimage `randomness:round:flux.toExponential(6):time_tag`, id = seed[0:8]). Budgets: `SCAN_BUDGET_MS=4000` (31), `SCAN_BYTE_LIMIT=512*1024` (32), `SCAN_PAGE_LIMIT=3` (33), `REDIRECT_LIMIT=3` aggregate across pages (34, increment 520), `REQUEST_BODY_LIMIT=4096` (29), `WEBSITE_LENGTH_LIMIT=2048` (30). Public-host-only: `safeHostname` (286-305) + `hasIpLikeLabels` (277-284) + `isSpecialHostname` (251-275) + `parseSafeUrl` (307-325) + same-domain redirect enforcement `validateSiteUrl` (337-342), plus wrangler `compatibility_flags = ["global_fetch_strictly_public"]` (wrangler.toml:4, pinned at test.mjs:262).

### test.mjs conventions (match them exactly)

- Runner: `npm test` → `node test.mjs` (package.json:12), `"type": "module"`, Node ≥20, no framework.
- Imports `worker, { SparkCoordinator } from "./src/worker.js"` (test.mjs:3) — works because DOs are plain classes and module top-level has no Workers-only APIs. Any change that breaks Node-importability breaks the whole suite.
- Harness: custom `test(name, fn)` with pass/fail counters (14-24), exit 1 on failure (776). Mocks: `createNetwork` fetch mock with canned drand/NOAA (40-80), `createStorage` serialized-transaction DO storage (82-105), `createEnvironment` full env mock — KV map with `kvPuts` capture, METER stub, COORD backed by the **real** `SparkCoordinator`, AI mock with option flags (`failAI`, `aiDelay`, `coordDown`, `slotDown`, `xssIdea`, `varyGeneric`, `vertical`, `clarity`, `observationText`, `observationUrl`, `defaultSite`) (107-220). Helpers: `sparkRequest`/`strike` (222-240), `comparableSpark` (242-246), local `sha256` (248-251), `addSimpleSite` (253-258).
- 23 tests already cover: blank/invalid-body generic strike (268), generic provenance + seed math + permalinks + `/api/sun` (296), 14 unsafe-website 400s (352), limited/unavailable/slot-down paths (387), full personalized flow incl. profile KV + meter posts (407), script-hidden links (478), generic pin stability (498), profile cache hit (513), concurrency convergence (530), coordinator receipt under KV write failure (542), lease takeover (565), site-failure unavailable commit (579), cross-domain redirect 400 (592), non-HTML/byte-overflow (609), aggregate redirects (633), grounding evidence rules (648), unclear-vertical fallback (672), 10-scans/hour limit (682), profile first-write race (694), concurrent scan failure (721), XSS containment (737), redirected-URL dedupe (757).
- Extend the existing `createEnvironment`/AI-mock option flags rather than building parallel mocks.

### Coverage gaps this story closes (from full audit)

CORS/OPTIONS entirely untested · `/api/meter` untested · 502 paths untested · 404 variants untested · `NeuronMeter` class never exercised · coordinator `/commit` 400 and unknown-op 404 untested · trailing-slash + `/how` untested · `wantsText` matrix partial · personalized id preimage never recomputed · 4s time budget + content-length overflow untested · `modelFor` fallback switch untested.

### Architecture constraints that bind this story

- **AD-6**: router, KV key scheme, both DOs, seed feeds, scan budgets, page shell stay as they are. The two security guards are the only sanctioned shell edits here (they are the "pre-existing sharp edges" the spine's Deferred list assigns to cleanup stories — this story explicitly claims `/api/meter` and CORS; KV TTL hygiene and compat-date bump remain Story 3.6's).
- **Verification convention** (spine Consistency Conventions): pipeline stages and the Brief schema must stay Node-importable pure functions — this story's extended `test.mjs` is the harness later stories grow, so its import pattern must not be broken.
- **FR-10 / AD-10**: one button, one optional domain field — CORS/preflight changes must not break the existing same-origin browser POST.
- Root `worker.js` (1115 lines) is dead legacy code (wrangler `main` → `src/worker.js`, wrangler.toml:2). **Do not delete it in this story** — removal is Story 1.12's AC.

### Testing standards summary

Plain Node, `node:assert/strict`, custom `test()` harness, full env mock with real `SparkCoordinator`. New tests go in `test.mjs` alongside existing ones. No new dev dependencies. `npm test` must exit 0.

### Project Structure Notes

- All edits confined to `src/worker.js` (CORS const, OPTIONS handler, `/api/meter` route + its two consumers) and `test.mjs` (new tests). No other files.
- Single-file worker with banner sections and hoisted consts — keep CORS/origin config as hoisted consts near the existing `CORS` block (2400-2403).

### References

- [Source: _bmad-output/projects/oddspark/planning-artifacts/epics.md#Story 1.1] — story definition + ACs
- [Source: _bmad-output/projects/oddspark/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md#AD-6, #Consistency Conventions, #Deferred] — preservation seam, Node-importable verification convention, sharp-edges assignment
- [Source: src/worker.js:2400-2523] — router, CORS, /api/meter, error taxonomy
- [Source: src/worker.js:641-788] — Durable Objects and helpers
- [Source: src/worker.js:21-39, 157-342] — constants, seed feeds, input validation
- [Source: test.mjs:1-258] — harness and mocks; :260-776 existing tests
- [Source: wrangler.toml:2-4, 27-41] — main entry, compat flags, bindings

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Implementation Plan

- Extend the existing plain-Node harness with characterization coverage before changing shell behavior.
- Keep security changes isolated to request-aware CORS headers and a same-origin-only meter readout.
- Preserve router, generation, KV, Durable Object, and renderer behavior outside the two authorized guards.

### Debug Log References

- RED: `npm test` — 27/29 passed; expected failures proved missing feed-failure and metering-failure mock paths.
- GREEN: `npm test` — 29/29 passed after minimal mock extensions; exact 3999/4000 ms and 2499/2500-neuron boundaries verified.
- RED: `npm test` — 29/30 passed; the former public `/api/meter` route remained exposed.
- GREEN: `npm test` — 30/30 passed after moving the footer readout to non-CORS `/meter` and retiring `/api/meter`.
- RED: `npm test` — 30/31 passed; preflight still returned wildcard CORS.
- GREEN: `npm test` — 31/31 passed with request-aware exact-origin JSON CORS and matching OPTIONS behavior.
- VALIDATION: direct `node test.mjs` — 31/31 passed; `git diff --check` passed; package manifests unchanged.
- AUDIT RED: `npm test` — 30/31 passed after adding the missing no-Origin `Vary: Origin` cache assertion.
- AUDIT GREEN: `npm test` and direct `node test.mjs` — 31/31 passed with every API response varying on Origin.

### Completion Notes List

- Task 1 complete: added route/error/text-negotiation, direct Durable Object, scan-budget, personalized ID/KV, model-threshold, and best-effort metering coverage.
- Independent read-only audit confirmed every Task 1 subtask is represented and both quantitative boundaries are pinned.
- Task 2 complete: the five-field meter readout now lives at same-origin `/meter` without CORS; the HTML footer and root curl meter line remain covered.
- Task 3 complete: CORS allows only exact `https://oddspark.dev`; `www`, Pages previews, unrelated origins, alternate schemes, and ports are excluded. JSON GETs are tightened uniformly and allowed preflights include `content-type`.
- Task 4 complete: all tests remain in the dependency-free custom Node harness; no Workers-only imports or package changes were introduced.
- Task 2 follows its explicit default boundary: `/meter` is not cross-origin browser-readable, but remains directly readable because the same values are intentionally displayed in the public footer; this is a CORS boundary, not authentication.
- Final independent audit passed AC1, AC3, and AC4 and found no scope creep; its cache-variant finding was fixed and regression-tested.

### File List

- _bmad-output/implementation-artifacts/1-1-shell-safety-net-audit-and-extend-test-mjs.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/worker.js
- test.mjs

## Change Log

- 2026-08-16: Extended the shell safety-net suite, retired cross-origin `/api/meter`, and restricted API CORS to the canonical Oddspark origin.
