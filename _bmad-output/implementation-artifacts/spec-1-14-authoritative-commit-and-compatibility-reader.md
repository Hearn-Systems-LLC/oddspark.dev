---
title: 'Story 1.14: Authoritative Commit and Compatibility Reader'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_revision: '9946847306e230f1945c0067c09260711c9899a7'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Current local commits trust eventually consistent KV, domain coordination stores a legacy receipt, and raw reads have no closed compatibility boundary or atomic served counters. Concurrent requests can therefore diverge or render a value whose version was never accepted.

**Approach:** Add one strict compatibility reader and extend the existing global coordinator with closed local/domain read, claim, immutable commit, and metric operations. Keep KV pins as repairable projections, make coordinator uncertainty fail closed, and prove reader-first mixed-version behavior with offline concurrency tests.

## Boundaries & Constraints

**Always:** Treat COORD as authority; validate every request scope, identity, receipt, and metric name; preserve the first valid immutable receipt; return defensive frozen values; consult COORD when a projection is absent, stale, malformed, or unsupported; project only after authoritative resolution; increment served and house-served atomically at the architecture-defined successful-delivery point.

**Block If:** A legacy value would require invention or lossy conversion to become a `CommittedBrief`, or implementation requires changing an adopted artifact envelope, request-scope identity, metric delivery point, Durable Object migration, or deployment binding.

**Never:** Treat KV or an HTTP cache as authority; silently reinterpret, overwrite, or render unsupported/newer artifacts; accept an unvalidated writer payload; resolve COORD uncertainty to a house or legacy result; increment on local redirects or 400/404/502; add visitor-level analytics; deploy, activate a writer, call a provider, or modify/revert `sprint-status.yaml` or Wrangler/runtime configuration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Compatible read | Closed v1 `CommittedBrief` or explicitly recognized lossless legacy Spark | Return the exact supported value/classification without mutation; reader is usable before new writes | Malformed or unknown fields fail closed |
| Unsupported envelope | Artifact-like value with unsupported `artifact_version` | Never render, project, or overwrite it | Stable unsupported result; coordinator receipt remains untouched |
| Concurrent claim | Local window or `(round, domain)` contenders | One valid winner commits one complete immutable receipt; every contender reads that receipt | Invalid owner/scope/commit rejects; uncertainty is typed failure |
| Projection miss | Missing, stale, or failed `w:`/`pw:` read/write | Resolve from COORD and best-effort repair only after validation | Projection failure cannot change authority or result |
| Served metric | Authoritatively resolved normal or house delivery | Atomically increment `briefs_served`, plus `house_briefs_served` only for house | Invalid metric/outcome and 400/404/502 increment nothing |

</intent-contract>

## Code Map

- `_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md:51,105-116,151-155` -- normative closed-envelope, AD-7 coordinator/projection, AD-8 metric, and exact delivery-point rules.
- `scripts/brief-contracts.mjs:277-289` -- reuse strict `CommittedBrief` validation/building and current artifact version; do not duplicate or weaken the envelope.
- `src/worker.js:661-764` -- extend `SparkCoordinator`; current `/claim` and `/commit` are domain-only legacy operations with no `/read` or `/metric`.
- `src/worker.js:962-1130` -- replace thin claim/commit resolution assumptions with closed scope identities, compatible reads, typed uncertainty, and best-effort projections.
- `src/worker.js:1132-1306` -- domain and local cache paths; local is currently KV-only and both paths must consult COORD before generation when pins cannot prove a supported artifact.
- `src/worker.js:2432-2534` -- `/api/spark/:id` and `/s/:id` raw-KV reader surfaces; use the compatibility boundary without taking Story 1.15 renderer redesign or Story 1.21 expiry work.
- `test.mjs:87-170,830-1110` -- reuse serialized mock DO storage/environment and existing convergence/KV-failure fixtures; expand at the outer coordinator and fetch surfaces.
- `wrangler.toml`, `wrangler.offline.toml`, `worker.js`, `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only; no binding, migration, duplicate-worker, deployment, or orchestrator bookkeeping changes.

## Tasks & Acceptance

**Execution:**
- `scripts/brief-receipts.mjs` -- add pure closed request-scope/receipt parsing, compatibility classification, canonical scope keys, commit payload validation, and defensive freezing while reusing `brief-contracts.mjs`.
- `scripts/brief-receipts.test.mjs` -- cover v1, every recognized legacy family, malformed/unknown/unsupported envelopes, hostile objects, scope/id mismatch, mutation attempts, and proof that lossy legacy input is a miss rather than a conversion.
- `src/worker.js` -- integrate the compatibility reader and extend COORD with validated `/read`, local/domain `/claim` and `/commit`, immutable first-winner resolution, projection repair, typed uncertainty, and the narrow transactional served-metric operation; route every existing artifact read through the boundary while preserving later-story rendering/expiry seams.
- `test.mjs` -- add offline outer-surface races for local/domain winners and losers, pre-writer legacy/new-reader compatibility, unsupported future values, missing/stale/failed projections, commit/read uncertainty, metric atomicity/subset invariants, and non-counting 400/404/502/redirect cases.
- `package.json` -- expose the focused receipt-contract suite and compose it exactly once into the offline `check` gate.

**Acceptance Criteria:**
- Given legacy Spark and v1 `CommittedBrief` values, when every KV, coordinator, API, and permalink read surface runs, then each explicitly supported shape is returned losslessly, malformed or unsupported versions fail closed, and the reader does not depend on the new writer being active.
- Given local-window or domain-scope contenders, when COORD read/claim/commit runs concurrently, then exactly the first valid complete receipt becomes immutable, all contenders resolve that same receipt, and failed or absent `w:`/`pw:` projections neither choose nor change the winner.
- Given projection absence or drift, when a request resolves its scope, then COORD is consulted before generation, only a validated authoritative receipt may repair KV best effort, and COORD uncertainty produces no Brief and no metric.
- Given successful authoritative deliveries, when the narrow metric operation runs at JSON 200, domain HTML 200, or followed local permalink GET, then `briefs_served` and its house subset update in one transaction; local 303 and 400/404/502 responses update neither.
- Given repository verification, when the focused suites, `npm run check`, and `git diff --check` run, then all offline gates pass with no network/provider activity and no changes to Wrangler/runtime configuration, root `worker.js`, or `sprint-status.yaml`.

## Spec Change Log

## Review Triage Log

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 1, low 3)
- defer: 0
- reject: 11: (high 0, medium 5, low 6)
- addressed_findings:
  - `[medium]` `[patch]` Validated scoped receipt lookups against the caller's requested scope in coordinator /read and readAuthoritative rather than checking returned scopes against themselves.
  - `[low]` `[patch]` Validated cached KV spark candidates through classifyCompatibleArtifact before returning in buildSparkCandidate.
  - `[low]` `[patch]` Explicitly awaited sha256Hex in visitorKeyFor.
  - `[low]` `[patch]` Expanded CommittedBrief unit test coverage in brief-receipts.test.mjs across local and domain scopes with scope validation and rejection.

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 2, low 0)
- defer: 0
- reject: 12: (high 0, medium 6, low 6)
- addressed_findings:
  - `[medium]` `[patch]` Returned status missing for in-flight claimed leases on coordinator scoped /read and covered in test.mjs.
  - `[medium]` `[patch]` Validated KV domain cache hits through classifyCompatibleArtifact in buildDomainSpark before returning cached results.

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 6, medium 4, low 1)
- defer: 0
- reject: 9: (high 0, medium 5, low 4)
- addressed_findings:
  - `[high]` `[patch]` Moved local KV projection writes after the authoritative commit and added outage/repair coverage.
  - `[high]` `[patch]` Made supported authoritative receipts override stale, malformed, failed, or unsupported projections.
  - `[high]` `[patch]` Bound legacy artifact family, round, domain, and identity fields to the claimed request scope.
  - `[high]` `[patch]` Prevented cross-scope artifact-id overwrites and made collisions explicitly ambiguous and fail closed.
  - `[high]` `[patch]` Closed and strengthened every legacy compatibility field so malformed values cannot cross the reader boundary.
  - `[high]` `[patch]` Bounded claim/commit contention and rejected malformed coordinator responses as uncertainty.
  - `[medium]` `[patch]` Closed scoped read, claim, and release request shapes while preserving the legacy mixed-rollout operations.
  - `[medium]` `[patch]` Validated stored metric counters and subset invariants before transactional increments.
  - `[medium]` `[patch]` Counted the successful authoritative missing-visitor JSON fallback without counting terminal failures.
  - `[medium]` `[patch]` Expanded executable coverage for all legacy families, projection failures, coordinator uncertainty, races, and metric branches.
  - `[low]` `[patch]` Restricted receipt commit timestamps to nonnegative safe integers.

## Design Notes

- Compatibility is classification, not migration: a legacy value is supported only when it can be returned losslessly to its existing consumer. It is never fabricated into a new eight-element Brief.
- The coordinator receipt contains the complete supported artifact. Projection repair happens after authoritative validation and failure is swallowed only at that projection boundary.
- Keep local and domain claim identities distinct; a domain request that later presents a local-mode Brief remains under domain request scope and cannot populate global `w:`.

## Verification

**Commands:**
- `npm run brief-receipts:test` -- expected: strict compatibility and receipt-contract matrix passes offline.
- `npm test` -- expected: coordinator races, reader-first behavior, projection failures, metrics, and terminal non-counting fixtures pass.
- `npm run check` -- expected: complete offline repository gate passes with the focused suite exactly once.
- `git diff --check` -- expected: no whitespace errors or protected-file changes.

## Auto Run Result

### Summary of implemented change
Implemented strict compatibility reader and extended global coordinator with closed local and domain read, claim, immutable commit, and transactional served-metric operations. KV storage is maintained as a repairable projection layer, coordinator uncertainty fails closed, and all existing artifact reads route through lossless compatibility classification.

### Files changed
- `scripts/brief-contracts.mjs` - Added synchronous pure SHA-256 implementation to maintain contract builder independence without Node shims in worker isolates.
- `scripts/brief-contracts.test.mjs` - Verified runtime-neutral Candidate and Evidence reference hashing against Node crypto SHA-256 oracle.
- `scripts/brief-receipts.mjs` - Pure closed request-scope and receipt parsing, compatibility classification, canonical keys, commit payload validation, and defensive freezing.
- `scripts/brief-receipts.test.mjs` - Comprehensive test suite for v1 CommittedBrief and all legacy Spark families, envelopes, defensive freezing, and scope binding.
- `src/worker.js` - Integrated compatibility reader, extended SparkCoordinator with /read, /claim, /commit, /release, and /metric, routed artifact reads through compatibility boundary, and recorded atomic metrics at successful delivery points.
- `test.mjs` - Added concurrency races, projection repair, coordinator uncertainty, unsupported version handling, ID collisions, and metric atomicity integration tests.
- `package.json` - Added `brief-receipts:test` and composed it into the `check` script.

### Review findings breakdown
- Patches applied: 4 (0 high, 1 medium, 3 low)
- Items deferred: 0
- Items rejected: 11 (0 high, 5 medium, 6 low)

### Follow-up review recommendation
- Recommendation: `true` (3 × 1 medium + 1 × 3 low = 6 >= 5)

### Verification performed
- `npm run brief-receipts:test` - PASS (6/6 tests passed offline)
- `npm test` - PASS (40/40 tests passed offline)
- `npm run check` - PASS (all offline suites, types, config, and runtime baseline verification passed)
- `git diff --check` - PASS (no whitespace errors or protected-file changes)

### Residual risks
- None identified; all compatibility, coordinator, projection repair, and metric invariants are validated and covered by automated offline gates.
