---
title: 'Story 1.16: Request Hardening and Inactive-Domain Dispatch Contract'
type: 'feature'
created: '2026-08-20'
status: 'done'
baseline_commit: 'e6a34f5'
warnings: [oversized]
baseline_revision: 'e6a34f5'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-decision-record-oddspark.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Domain requests currently reach the live scanner/personalization path (`buildDomainSpark`) even though domain mode is not activated, and the route boundary has no closed contract separating request derivation from the future assembled writer. This story is the incident-recovery predecessor to Story 1.23 (Sprint Change Proposals 2026-08-19 and 2026-08-20).

**Approach:** Harden request decoding, representation selection, response headers, and terminal precedence at the existing route boundary, and derive one closed inactive-domain dispatch value that the route passes exactly once to an injected writer port, rendering only a returned validated committed outcome. The real writer is Story 1.23's job; here a fake port proves the transport contract.

## Boundaries & Constraints

**Always:** Explicit `Accept: application/json` wins representation even for form-encoded bodies; otherwise HTML-accepting or browser-form requests get shell HTML; all other requests keep JSON behavior. Every dynamic response emits matching `Content-Type`, `Vary: Origin, Accept, Content-Type`, and `Cache-Control: no-store`. Dispatch derivation is a pure function returning one deeply frozen closed value: request scope `domain`, effective mode `local`, normalized domain claim identity, fixed pre-activation notice identity, `scan_allowed=false`, `evidence_provider_allowed=false`, `permalink_allowed=false`. The route invokes the injected writer port exactly once per domain request and renders only a validated `committed_brief` outcome; missing, throwing, malformed, or scope-mismatched results produce the negotiated 502. Keep one button and one optional domain field as the only inputs; keep render-before-count ordering; 400/404/502 terminals increment no served metric.

**Ask First:** Any change to the closed Brief/envelope schemas, coordinator authority, UX copy beyond UX-DR3–UX-DR5, or wrangler configuration.

**Never:** Scan, call an EvidenceProvider or generator, mint a permalink, touch coordinator/KV/metrics, or perform any remote operation during dispatch derivation. Never construct, repair, or substitute a Brief in the route. Never claim the production pipeline is assembled (that is Story 1.23). No provider call, deployment, activation, or remote-resource mutation. Do not edit `wrangler.toml`, `wrangler.offline.toml`, root `worker.js`, or `sprint-status.yaml`. Do not reuse the blocked run `20260819-035459-b4ae` spec or code.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Explicit JSON strike | `Accept: application/json`, form body | JSON 200, committed artifact, counts once | N/A |
| Native form strike | form content type, HTML accept | Shell HTML (local 303 / domain direct 200), counts once | N/A |
| Malformed/oversized input | bad URL, scheme, credentials, port, redirect, size, public host | 400; JSON `{error,field}` or shell HTML per negotiation; no metric | Field-linked error state |
| Infrastructure uncertainty | COORD down / contention | Negotiated 502; no artifact renders; no metric | Retry copy visible + announced |
| Inactive-domain derivation | valid public domain, activation absent | One frozen closed dispatch value; zero I/O performed | Invalid domain rejected at existing guards |
| Writer port healthy | fake writer returns valid committed outcome, scope matches dispatch | Rendered per representation; counts once | N/A |
| Writer port missing/throwing/malformed/scope-mismatched | injected fault | Negotiated 502; no Brief constructed by route; no metric | Same 502 terminal as infrastructure uncertainty |

</frozen-after-approval>

## Code Map

- `src/worker.js:352-410` — `normalizeWebsite`, `parseSafeUrl`, `readSparkIntent`; existing input guards stay; dispatch derivation consumes their normalized `{domain}` output.
- `src/worker.js:1287-1400` — `buildDomainSpark`: the live scanning/personalization path the dispatch contract replaces at the route seam (scanner entry at `:1328`). The route must stop calling it for inactive-domain requests; the legacy internals remain quarantined, not deleted (Story 5.2).
- `src/worker.js:2582-2611,2634-2678,2750-2755` — `corsHeaders`, `json`/`apiJson`, `wantsText`/`wantsHtml`, `/api/spark` POST branches, terminal catch. Reconcile the 400 asymmetry: `WebsiteInputError` at `:2751` must honor HTML negotiation like `:2640-2642`.
- `src/worker.js:1509-1511` — `recordServed`; preserve render-before-count (construct/validate response before metric).
- `scripts/brief-receipts.mjs:48,60` — reuse `parseRequestScope`/`canonicalScopeKey` for the normalized domain claim identity and writer-result scope-match check.
- `scripts/brief-rendering.mjs` — existing committed presentation boundary; the route renders the writer's returned outcome through it unchanged.
- `test.mjs:113-260` — `createEnvironment`/`sparkRequest` fake-env pattern; the injected inactive-domain writer port rides on `env` the same way. Existing fixtures to preserve: malformed-input `test.mjs:828,288,1117,1076`, representation `:574`, CORS `:733`, meter `:696,601`, terminal taxonomy `:548,510,432,447`, story-15 representation matrix `:1327-1332`, inactive-adjacent `:863`.
- `worker.js`, `wrangler.toml`, `wrangler.offline.toml`, `_bmad-output/implementation-artifacts/sprint-status.yaml` — read-only; do not modify.

## Tasks & Acceptance

**Execution:**
- [x] `src/worker.js` — add a pure exported `deriveInactiveDomainDispatch(website, round)` (no I/O, deeply frozen closed value, reusing `parseRequestScope`/`canonicalScopeKey`); add an injected writer-port seam on `env` (absent in production config today); rewire the `/api/spark` domain branch to derive dispatch, invoke the port exactly once, validate the returned outcome (`committed_brief` + scope match) and render through the existing presentation boundary; fix `Vary` to include `Accept` and `Content-Type` on dynamic responses; reconcile the HTML/JSON 400 asymmetry at the terminal catch. Remove the route's reachability to `buildDomainSpark` for inactive-domain requests without deleting the quarantined legacy internals.
- [x] `test.mjs` — add named running fixtures: dispatch purity (no KV/coordinator/AI/fetch touched), writer-port exactly-once invocation, healthy fake-writer HTML direct-200 and JSON parity, each fault class (missing/throwing/malformed/scope-mismatched) → negotiated 502 with zero metric, `Vary` header completeness, HTML-vs-JSON 400 negotiation at the catch, and regression proof that all listed existing fixtures still pass unchanged.
- [x] `package.json` — no new script needed if fixtures live in `test.mjs`; compose nothing new into `check` beyond the existing gates.

**Acceptance Criteria:**
- Given a `POST /api/spark` request, when representation is selected, then explicit JSON acceptance wins even for a form-encoded body, HTML-accepting or browser-form requests receive shell HTML, and every remaining request preserves JSON behavior.
- Given any dynamic response, when headers are emitted, then `Content-Type` matches the representation, `Vary` retains `Origin` and adds `Accept` and `Content-Type`, and `Cache-Control: no-store` is present.
- Given malformed or oversized input, when guards fire, then status stays 400 with stable JSON `{error,field}` or governing shell HTML, and no strike or served metric occurs.
- Given COORD or infrastructure uncertainty, when the terminal is selected, then status stays 502 with negotiated JSON or shell HTML and no artifact renders or counts.
- Given a valid domain before domain activation, when intent is derived, then one closed frozen dispatch value contains domain request scope, effective local mode, normalized domain claim identity, fixed notice identity, and the three `*_allowed=false` prohibitions, and derivation performs no scanner, provider, generator, coordinator, metric, cache, writer, or remote operation.
- Given the route with an injected inactive-domain writer port, when dispatch is invoked, then it is passed exactly once, only a returned validated committed outcome renders, every fault class produces the negotiated 502, and the route never constructs, repairs, or substitutes a Brief.
- Given repository verification, when `npm test`, `npm run check`, and `git diff --check` run, then all offline gates pass with no provider/network activity and no protected-file changes.

## Spec Change Log

### 2026-08-22 — Independent close-out review
- Result: PASS. Merge `6e67992` / feat `e1a831b`. Frozen dispatch, writer-port fault matrix, Vary+no-store, and HTML/JSON 400 hold at HEAD. Writer-port timeout DW satisfied by Story 1.25.

## Design Notes

- The dispatch value is the contract Story 1.23's assembled writer will consume; keep it closed and frozen so no later writer can negotiate extra authority out of it.
- `request_scope: domain` with effective mode `local` is deliberate: claim identity is domain-scoped, rendering is local-mode with the fixed pre-activation notice — matching the approved 2026-08-19 boundary.

## Verification

**Commands:**
- `npm test` -- expected: all outer route fixtures pass, including the new dispatch/writer-port matrix.
- `npm run check` -- expected: complete offline gate passes (unit, types, config, baseline).
- `git diff --check` -- expected: no whitespace errors; no protected-file modifications.

## Suggested Review Order

**Inactive-domain dispatch contract**

- The closed, pure, deeply frozen dispatch value Story 1.23's writer will consume.
  [`worker.js:1543`](../../src/worker.js#L1543)
- Fail-closed writer-port invocation: exactly one call, validated committed outcome, constant error.
  [`worker.js:1561`](../../src/worker.js#L1561)
- Route seam: injected port replaces scanner/personalization reachability for domain requests.
  [`worker.js:2726`](../../src/worker.js#L2726)

**Header and terminal hardening**

- One header source of truth: `Vary: Origin, Accept, Content-Type` + `no-store` on every dynamic response.
  [`worker.js:2647`](../../src/worker.js#L2647)
- Terminal catch now negotiates HTML vs JSON 400 for `WebsiteInputError`, closing the asymmetry.
  [`worker.js:2831`](../../src/worker.js#L2831)

**Transport proof (fake writer, no production-pipeline claim)**

- Derivation purity, frozen shape, and closed-contract assertions.
  [`test.mjs:1440`](../../test.mjs#L1440)
- Fault matrix: non-committed, extra keys, hostile Proxy, scope mismatch, local-mode leak.
  [`test.mjs:1518`](../../test.mjs#L1518)
- Exactly-once invocation and the full dynamic-header sweep across all terminals.
  [`test.mjs:1563`](../../test.mjs#L1563)
