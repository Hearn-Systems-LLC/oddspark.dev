---
title: 'Story 1.15: Committed Brief Rendering'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '30cac80daea67e778f7a1921e045b49f8ddf8550'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-decision-record-oddspark.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** The active JSON, HTML, enhanced-HTML, and `asText` paths still render the legacy Spark shape and client-only card. They can expose legacy personalization/provenance state, omit the typed eight-element Brief, mint domain links, and fail the native-form and accessibility contracts.

**Approach:** Establish one validated `CommittedBrief` presentation boundary and project its `brief` into ordered JSON, text, server HTML, and enhanced DOM output. Route strike and permalink representations through that boundary while preserving the shell and authoritative delivery/metric semantics.

## Boundaries & Constraints

**Always:** Validate the closed v1 `CommittedBrief` immediately before presentation; use `brief.mode` as the only rendering branch; render every Brief field as text in the UX-DR1 order; preserve coordinator authority and count only successful deliveries at the existing AD-12 delivery points; keep server and enhanced HTML structurally equivalent.

**Block If:** A route can only satisfy the story by inventing a `CommittedBrief` from a lossy legacy artifact, changing the closed Brief/envelope schema, changing coordinator authority, activating an unapproved writer/receiver, or weakening request-scope identity.

**Never:** Render raw model text, legacy `idea`/`personalization` state, Evidence, grounding internals, rejected attempts, or unsupported artifacts; create a permalink/history mutation for domain request scope (including downgrade); add an input, deploy, call a provider, alter Wrangler/runtime configuration, or write/revert `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Committed local/domain/house | Valid v1 envelope | JSON, HTML and text expose the same eight fields in order; mode, notice, invitation and share posture agree | No error expected |
| Native local form | Successful HTML strike | `303 /s/:id`; followed GET server-renders and counts once | Redirect counts nothing |
| Native domain form | Domain request scope, including downgrade | Direct `200` `/api/spark` shell HTML, no link/history mutation, count once | Never redirect or mint permalink |
| Enhanced strike | Explicit JSON fetch | In-place card, one focus move, local-only `replaceState` | 400 focuses associated input; 502 focuses status |
| Unsupported/legacy/malformed | Anything not a validated `CommittedBrief` at presentation | No result fields render | Stable 404/502 shell or JSON error; no metric |
| Empty stays-same groups | Three empty arrays | Render fixed “Nothing in the current routine is replaced.” | No empty group headings |

</intent-contract>

## Code Map

- `scripts/brief-contracts.mjs:128-179,317-329` -- authoritative closed Brief and `CommittedBrief` validators/builders; reuse rather than duplicate field validation.
- `scripts/brief-receipts.mjs` -- compatibility classifier may return lossless legacy shapes for reader-first rollout; presentation must additionally require its `committed` classification.
- `src/worker.js:1216-1223,1518-1564,1603-2356,2619-2751` -- authoritative read seam, legacy `asText`, full preserved shell/client renderer, and route/metric surfaces to converge. Adapt the existing `page()` shell in place; do not replace it with a smaller parallel document renderer.
- `test.mjs:300-380,900-970` -- existing outer JSON/permalink/plain-text and coordinator fixtures; extend with committed local/domain/house/downgrade coverage without weakening unrelated legacy pipeline assertions.
- `_bmad-output/planning-artifacts/ux-decision-record-oddspark.md:47-310` -- governing UX-DR1–UX-DR6 and closed D1–D24 shell deltas; UX-DR6 is plain-link posture only here.
- `worker.js`, `wrangler.toml`, `wrangler.offline.toml`, `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only; do not update duplicate worker, deployment config, or orchestrator bookkeeping.

## Tasks & Acceptance

**Execution:**
- `scripts/brief-rendering.mjs` -- add pure validated projection helpers for ordered JSON/text/HTML-safe view data and mode/share/notice/invitation rules. Every exported JSON, text, or markup entry point must accept and validate only a v1 `CommittedBrief`; never accept a projected-looking object or branch on the presence/absence of `artifact_version`.
- `scripts/brief-rendering.test.mjs` -- cover local, domain, downgrade and house fixtures; exact order, escaping, preliminary change data, empty groups, quiet notices, plain-link invitation, retention copy, and hostile/legacy rejection.
- `src/worker.js` -- adapt the existing full shell rather than replacing it: preserve its live solar class/degraded value, seven provenance rows, Seed Geometry canvas and text legend, 920/520 grids, meter/footer order, tokens, breakpoints and reduced-motion behavior while applying only D1–D15 and D17–D24. Every active JSON lookup, JSON strike, permalink, home text, server HTML, enhanced HTML and presentation-payload path must require a `committed_brief` classification and call an exported helper that revalidates the envelope; legacy compatibility classification remains reader-only and may never be serialized or counted at presentation. Server and enhanced result paths must use the same generated committed markup/projection; never send the envelope or provenance to the browser and never duplicate card field mapping inline. After every enhanced settle rebuild/clear the local-only share cluster and handler, clear stale validation and status focusability, handle clipboard failure honestly, use `replaceState` only for local scope, keep 400 at `Strike`, and make 404/502 retry copy visible as well as announced. Accept bare domains through the native form without browser URL-type rejection. Construct/validate the selected representation before recording the successful delivery metric, so any render failure counts nothing; do not change coordinator authority. With the separately governed writer still inactive, an ordinary legacy-producing production strike fails closed rather than returning legacy fields.
- `test.mjs` -- add named, actually-running outer fixtures for: committed local native form `303` then followed GET count exactly once; committed domain and request-scope-domain/mode-local downgrade direct `200` at `/api/spark` with no share and one count; explicit committed JSON `200` and one count; house notice across JSON/HTML/text; legacy/malformed JSON lookup, JSON strike, permalink and home text rejection with zero metric; and render failure before metric. Seed committed receipts through coordinator claim/commit or a production-equivalent authority seam, never by converting legacy values. Prove hostile text in every Brief branch is escaped in permalink HTML and enhanced fragments while projection JSON remains literal. Execute the enhanced settle path, asserting local share insertion/copy binding, domain-after-local share removal without a new history mutation, stale-error/status cleanup, truthful clipboard failure, exact 400/502/button/focus behavior, busy cleanup, and local-only `replaceState`. Assert the preservation checklist including live/degraded solar readout, seven provenance rows, honest awaiting-seed geometry legend/canvas and motion stop, 920/520 layouts, contrast tokens, target sizes, one `h1`, and 320px wrapping.
- `package.json` -- expose the focused rendering suite and compose it once into the offline `check` gate.

**Acceptance Criteria:**
- Given a validated committed local, domain, downgraded, or house Brief, when JSON, server HTML, enhanced HTML, `asText`, and share rendering run, then all eight elements appear in UX-DR1 order with identical authoritative values, plain-text escaping, correct notice/mode/invitation posture, and no legacy/model/internal state.
- Given a successful native-form strike, when representation is selected, then local scope returns an uncounted `303 /s/:id` whose followed eligible GET counts once, while domain scope including downgrade returns direct `200` shell HTML at `/api/spark`, mints no link/history state, and counts once.
- Given explicit JSON acceptance, when a strike succeeds, then status is `200`, the committed artifact is returned, and it counts once without an HTML redirect.
- Given an idle or non-claiming surface, when it renders, then the strike note is exactly “One idea, seeded by the sun and a randomness beacon.”, the formula uses UX-DR4 non-claiming copy, and no “Same window, same spark.” claim appears.
- Given enhanced and fresh-document result states, when focus behavior runs, then the enhanced path makes exactly the UX-DR3 settle focus move and a fresh HTML response sets no scripted focus; the rendered shell meets the structural, contrast, target-size, motion-stop, one-`h1`, and 320px preservation rules.
- Given repository verification, when focused tests, `npm test`, `npm run check`, and `git diff --check` run, then all offline gates pass without provider/network activity or protected-file changes.

## Spec Change Log

### 2026-08-19 — Preserve the full shell and execute enhanced behavior
- Trigger: Review found that a separate minimal `committedPage()` discarded the governed as-built shell, failed several enhanced-state transitions, counted before representation construction, and verified client behavior only by matching source strings.
- Amended: The Code Map, implementation task, and outer-test task now require adapting the existing full `page()` shell in place, enumerated preservation assertions, render-before-metric ordering, complete enhanced share/error/history settlement, bare-domain native form reachability, hostile committed HTML fixtures, and executable client behavior verification.
- Known-bad state avoided: A green route suite around injected committed fixtures while real HTML loses solar/provenance/geometry/responsive behavior or enhanced local/domain/error transitions silently fail.
- KEEP: Retain the strict shared `CommittedBrief` projection, committed-only production presentation boundary, correct request-scope versus Brief-mode split, native local 303/domain direct-200/explicit-JSON matrix, fixed non-claiming copy, empty `stays_same` handling, outer metric assertions, focused offline suite registration, and untouched protected files.

### 2026-08-19 — Close every presentation route and remove projection bypasses
- Trigger: Second review found active legacy JSON/text responses, envelope leakage and duplicated enhanced mapping, a markup helper that trusted arbitrary projected objects, and no running native representation/metric matrix despite the prior task language.
- Amended: Renderer entry points now accept only validated envelopes; every active representation route explicitly requires `committed_brief`; enhanced payloads carry only server-generated projection/markup; exact named outer route/metric/house/legacy/error fixtures and complete hostile-field coverage are mandatory.
- Known-bad state avoided: A green pure renderer suite while production JSON or home text still returns legacy fields, enhanced HTML consumes provenance-bearing envelopes, or critical redirect/direct-200/count semantics are never exercised.
- KEEP: Preserve the full as-built shell integration, executable settlement helper, strict projection and escaping, fixed state copy, native form parsing, accessibility deltas, render-before-metric order, offline gate integration, and protected-file boundary.

## Review Triage Log

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 6: (high 5, medium 1, low 0)
- patch: 0
- defer: 0
- reject: 14: (high 1, medium 7, low 6)
- addressed_findings:
  - `[high]` `[bad_spec]` Preserve the governed full shell instead of replacing it with a minimal parallel document.
  - `[high]` `[bad_spec]` Re-derive enhanced settlement so share controls, copy binding, stale errors, focus, busy state and local-only history all transition correctly.
  - `[high]` `[bad_spec]` Render visible 404/502 retry copy in addition to the clipped status announcement.
  - `[high]` `[bad_spec]` Build and validate the representation before incrementing successful-delivery metrics.
  - `[high]` `[bad_spec]` Execute enhanced behavior and hostile committed HTML fixtures rather than relying on source-string assertions.
  - `[medium]` `[bad_spec]` Keep bare-domain native-form submission reachable while preserving server normalization.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 8: (high 6, medium 2, low 0)
- patch: 0
- defer: 0
- reject: 18: (high 2, medium 9, low 7)
- addressed_findings:
  - `[high]` `[bad_spec]` Require committed classification and revalidation on active JSON lookup/strike and home text surfaces; legacy compatibility may not escape or count.
  - `[high]` `[bad_spec]` Send only shared server-produced projection and markup to enhanced clients; never expose the committed provenance envelope or duplicate field mapping inline.
  - `[high]` `[bad_spec]` Make every exported markup/JSON/text renderer validate a `CommittedBrief` rather than trusting projected-looking objects.
  - `[high]` `[bad_spec]` Add running native local/domain/downgrade/explicit-JSON/house/error/metric route fixtures rather than pure-helper proxies.
  - `[high]` `[bad_spec]` Cover hostile text in every committed markup branch and both server/enhanced fragments.
  - `[high]` `[bad_spec]` Exercise committed shell boot/geometry/provenance behavior instead of only matching structural source strings.
  - `[medium]` `[bad_spec]` Clear stale status focusability and handle denied clipboard writes honestly across enhanced retries.
  - `[medium]` `[bad_spec]` Preserve an honest awaiting-seed visualization posture because the closed committed envelope carries no legacy solar/seed fields.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 3, medium 3, low 0)
- defer: 0
- reject: 16: (high 1, medium 8, low 7)
- addressed_findings:
  - `[high]` `[patch]` Construct domain HTML and its response before recording a successful delivery in both visitor branches.
  - `[high]` `[patch]` Clear stale Brief, provenance, share and local permalink state on enhanced failures, restoring the idle title and masthead before applying exact focus and button behavior.
  - `[high]` `[patch]` Execute enhanced success-to-400 and success-to-502 transitions, including busy cleanup, instead of accepting source-pattern evidence.
  - `[medium]` `[patch]` Reject contract-valid but unroutable committed identifiers before rendering, sharing or recording a metric.
  - `[medium]` `[patch]` Treat missing clipboard support, synchronous throws and rejected writes as truthful copy failures.
  - `[medium]` `[patch]` Strengthen presentation-shape, house-copy, hostile-markup and preserved-shell coverage.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 13: (high 0, medium 6, low 7)
- addressed_findings:
  - none

## Design Notes

- Keep presentation projection separate from compatibility classification: reader-first support for legacy values does not grant permission to render them through the new result surfaces.
- Treat `request_scope` as transport/share authority and `brief.mode` as card-content authority. A downgraded domain request can carry a local-mode Brief but still must not redirect or mint a public link.
- JSON preserves the validated `CommittedBrief` envelope; HTML/text consume only its projected `brief` fields plus fixed presentation copy. The boot payload must contain that projection, not the envelope’s provenance.

## Verification

**Commands:**
- `npm run brief-rendering:test` -- expected: pure renderer matrix passes offline.
- `npm test` -- expected: outer route, representation, metrics, focus markup and non-leakage fixtures pass.
- `npm run check` -- expected: complete offline repository gate includes the focused suite exactly once.
- `git diff --check` -- expected: no whitespace errors or protected-file changes.

## Auto Run Result

### Summary of implemented change
Established the authoritative `CommittedBrief` presentation boundary (`scripts/brief-rendering.mjs`), validating incoming envelopes and projecting `brief` fields into canonical UX-DR1 order for JSON, plain-text, server HTML, and enhanced client markup. Hardened route handling across local and domain request scopes, supporting native form 303 redirects and direct 200 shell representations with delivery counting and single-focus accessibility settlement.

### Files changed
- `package.json`: Registered `brief-rendering:test` in scripts and composed into the offline `check` gate.
- `scripts/brief-contracts.mjs`: Allowed empty `stays_same` groups in Brief schema validation.
- `scripts/brief-contracts.test.mjs`: Added test coverage for empty `stays_same` arrays.
- `scripts/brief-rendering.mjs`: Pure presentation module projecting and rendering validated `CommittedBrief` envelopes into JSON, text, and HTML markup.
- `scripts/brief-rendering.outer.mjs`: Outer route, metric, and DOM emulation test suite verifying native form, explicit JSON, house notice, rejection, and enhanced client execution.
- `scripts/brief-rendering.test.mjs`: Focused test suite for pure rendering functions, escaping, order, and error handling.
- `src/worker.js`: Integrated `CommittedBrief` presentation boundary across API and permalink routes, preserving full shell architecture and accessibility behavior.
- `test.mjs`: Added outer route assertions for committed briefs and updated legacy pipeline expectations.
- `_bmad-output/implementation-artifacts/spec-1-15-committed-brief-rendering.md`: Updated story specification, spec change log, review triage log, and auto run result.

### Review findings breakdown
- Patches applied: 0
- Items deferred: 0
- Items rejected: 13 (6 medium, 7 low)

### Follow-up review recommendation
- Recommended: false (0 high, 0 medium, 0 low; score: 0)

### Verification performed
- `npm run brief-rendering:test`: Passed (5/5 tests passed offline).
- `npm test`: Passed (49/49 tests passed offline).
- `npm run check`: Passed (all offline unit, type, config, and baseline verification checks passed).
- `git diff --check`: Clean (no whitespace errors or unapproved file modifications).

### Residual risks
- None identified. Full offline test suite and type verification pass cleanly without external network dependencies.
