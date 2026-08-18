---
title: 'Local Priors Content'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: ['oversized']
deferred: []
epic: 1
story: 6
baseline_revision: 'dbb38370943e3dfa21337864b01664a0c6c716c7'
baseline_commit: 'dbb38370943e3dfa21337864b01664a0c6c716c7'
---

<intent-contract>

## Intent

**Problem:** Local mode promises coherent ideas grounded in Port Huron / Blue Water Area context, current season, a compatible small-business situation, and a Hearn-deliverable capability bundle, but those priors do not exist as a versioned, reviewable content artifact. Without a closed catalog and exact authority boundary, later evidence assembly would either reuse the legacy random axes or invent local claims at runtime.

**Approach:** Add a deterministic v1 local-priors package containing bounded regional context, four-season operating cues, compatible situation/capability pairings, explicit claim/privacy restrictions, and a hash-bound owner-approval record. Validate it offline and keep production readiness fail-closed until Justin approves the exact canonical content hash.

## Boundaries & Constraints

**Always:** Keep `Port Huron / Blue Water Area` as the fixed region; model season as content selected from the current date rather than a fabricated live observation; pair each situation only with capabilities Hearn Systems can credibly deliver; cover software, AI automation, integrations, data workflows, online opportunities, and adjacent digital systems; preserve existing tools and owner decision rights; keep local effects qualitative; use no business-specific assertions, PII, reviews, cookies, sessions, or off-site research; version and hash content deterministically; distinguish structural validity from owner authority.

**Block If:** Exact owner-authored wording or a disputed local factual assertion is required to proceed, or any action would represent developer-authored priors as Justin-approved or activate them for production without an exact matching approval.

**Never:** Modify Worker generation/rendering, prompts, judge behavior, live evidence, runtime configuration, semantic thresholds, the Story 1.5 voice corpus, house Briefs, provider state, deployment state, or orchestrator-owned sprint state; do not encode weather forecasts, events, changing business facts, unsupported numbers, random independent axes, or a production selection algorithm.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Complete developer catalog | Closed v1 region, seasonal cues, situations, capability bundles, constraints | Structural verification passes and reports `pending_owner_approval` | Never emits production-ready authority |
| Exact owner approval | Justin, version 1, canonical content hash, approval timestamp | Verification reports the bound identity and `approved` | Reject missing, stale, future-dated, or mismatched approval |
| Date-to-season lookup | Valid ISO calendar date | Returns exactly one deterministic season identifier and its catalog cues | Reject invalid dates and ambiguous/missing season coverage |
| Compatible prior selection | Known situation plus referenced capability bundle | Produces a closed local-prior record matching the judge evidence fields | Reject dangling IDs, duplicate IDs, empty bundles, or incompatible pairings |
| Content drift or malformed JSON | Approved bytes change, unknown keys appear, or nested values are invalid | Prior identity changes or validation returns structured issues | Fail closed without unchecked-property exceptions |

</intent-contract>

## Code Map

- `_bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/SPEC.md:20-48` -- canonical CAP-1 boundary: coherent regional/date/situation/capability composition, all-nine-gate outcome, qualitative local claims, and Hearn delivery fit.
- `_bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/generation-modes.md:18-35` -- authoritative four-part local-mode evidence composition and privacy boundary; this story supplies content without wiring runtime selection.
- `spikes/judge-fidelity/contract.mjs:292-319` -- existing closed local evidence surface requires `region`, `season`, `date`, `situation`, and `capability_bundle`; read-only contract to target with exported fixture projection.
- `semantic/voice/v1/goldens.json:5-59` -- Story 1.5 local examples demonstrate acceptable regional/seasonal grounding and qualitative claims; read-only examples, not source content to silently promote.
- `scripts/semantic-corpus.mjs:136-179` -- reusable behavior for plain-object checks, exact keys, canonical JSON, and domain-separated hashes; keep algorithms consistent without coupling the two validators.
- `content/local-priors/v1/priors.json` -- new closed catalog for one region, four seasons, reusable small-business situations, capability bundles, compatibility pairings, and explicit prohibited claim classes.
- `content/local-priors/v1/approval.json` -- new pending/exact owner-approval record bound to version and canonical content hash.
- `scripts/local-priors.mjs` -- new pure validator, deterministic date-to-season resolver, judge-shape projector, canonical identity derivation, approval verifier, and structured CLI report.
- `scripts/local-priors.test.mjs` -- new tests for complete coverage, closed schemas, compatibility references, deterministic season boundaries, malformed input, drift, and approval failures.
- `package.json` -- expose `local-priors:test` and `local-priors:verify`; compose the offline tests into `check`.
- `src/worker.js`, `worker.js`, `wrangler*.toml`, `runtime-baseline.json`, `semantic/voice/v1/**`, and `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only boundaries.

## Tasks & Acceptance

**Execution:**
- [x] `content/local-priors/v1/priors.json` -- author a closed v1 developer catalog with fixed regional framing, exactly one entry for each meteorological season, multiple recognizable small-business situations, named Hearn-deliverable capability bundles spanning every required delivery category, explicit compatibility references, preservation cues, and prohibited local-claim classes.
- [x] `content/local-priors/v1/approval.json` -- add a closed pending approval record that can bind Justin, catalog version, content hash, identity, and timestamp without authorizing placeholder content.
- [x] `scripts/local-priors.mjs` -- validate every nested schema and invariant, reject duplicate/dangling/incompatible records, resolve season deterministically from a valid ISO date, project a selected compatible pair into the existing closed judge evidence shape, derive domain-separated canonical hashes, verify approval exactly, and emit non-throwing structured CLI results.
- [x] `scripts/local-priors.test.mjs` -- test all matrix rows plus four-season boundary dates, leap day, invalid dates, unknown keys, non-JSON values, duplicate IDs, empty capabilities, missing category coverage, dangling references, forged/stale/future approval, and content drift.
- [x] `package.json` -- add offline verification commands and include the test command in the repository `check` chain without credentials, network, provider calls, or remote mutation.

**Acceptance Criteria:**
- Given the canonical local-mode contract, when the v1 catalog is validated, then it fixes the region to Port Huron / Blue Water Area, covers all four seasons, and represents situations and capability bundles as compatible pairings rather than independent random axes.
- Given the Hearn delivery envelope, when catalog coverage is inspected, then software, AI automation, integrations, data workflows, online opportunities, and adjacent digital systems are all present and every situation preserves existing tools, decision authority, and untouched steps.
- Given any supported calendar date and compatible situation/bundle IDs, when the pure projector runs, then it returns only `{mode:'local', priors:{region,season,date,situation,capability_bundle}}` with deterministic season selection and nonempty capability strings.
- Given developer-authored content without exact owner approval, when `npm run local-priors:verify` runs, then structure passes, readiness is `pending_owner_approval`, no approved identity is emitted, and the command cannot imply production activation.
- Given exact owner approval over version and canonical hashes, when verification runs, then it emits the deterministic approved identity; any content, version, identity, timestamp, or hash mismatch fails closed with structured issues.
- Given repository verification, when `npm run local-priors:test`, `npm run local-priors:verify`, `npm run check`, and `git diff --check` run, then all offline structural checks pass without production-code, runtime, semantic-corpus, provider, deployment, or sprint-state changes; the verify command remains intentionally non-ready until exact approval exists.

## Spec Change Log

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 1, medium 4, low 1)
- defer: 0
- reject: 11: (high 0, medium 6, low 5)
- addressed_findings:
  - `[high]` `[patch]` Made the executable verifier exit successfully only for an exactly approved catalog and added direct pending-CLI status coverage.
  - `[medium]` `[patch]` Rejected invalid and non-Date verification clocks with structured issues so future approvals cannot bypass an untrustworthy clock.
  - `[medium]` `[patch]` Contained malformed, circular, non-JSON, and non-finite standalone approval inputs instead of allowing verifier exceptions.
  - `[medium]` `[patch]` Bound prohibited claim classes to the exact canonical six restrictions and added drift tests.
  - `[medium]` `[patch]` Rejected surrounding whitespace in identifier-like catalog values to prevent visually duplicate or unresolvable references.
  - `[low]` `[patch]` Added an intentional projection-options guard and direct omitted/null/non-object tests.

## Design Notes

- Treat the catalog as curated content with stable IDs, not a randomizer. Story 1.9 may assemble a prior from these compatible references, but this story only proves the content and projection contract.
- Use meteorological seasons with explicit UTC calendar boundaries for deterministic, timezone-independent fixtures; the current date remains an input and the catalog makes no live-weather claim.
- Keep prior identity independent from Story 1.5 semantic identity so either owner-governed artifact can drift and invalidate its own approval without silently blessing the other.

## Verification

**Commands:**
- `npm run local-priors:test` -- expected: deterministic catalog, projection, malformed-input, drift, and approval tests pass offline.
- `npm run local-priors:verify` -- expected before owner approval: structurally valid, visibly `pending_owner_approval`, and non-production-ready; expected after exact approval: approved identity printed.
- `npm run check` -- expected: the repository suite includes local-priors tests and passes offline.
- `git diff --check` -- expected: no whitespace errors.

## Auto Run Result

Status: done

Summary: Added a closed v1 Port Huron / Blue Water Area local-priors catalog, a pending exact-hash owner-approval record, deterministic season and compatible-prior projection, canonical identity and fail-closed approval verification, and offline validation integrated into the repository check. Review hardening corrected executable readiness status and malformed-input boundaries.

Files changed:
- `content/local-priors/v1/priors.json` -- developer-authored region, four-season cues, compatible small-business situations, Hearn-deliverable capability bundles, preservation cues, and canonical prohibited claims.
- `content/local-priors/v1/approval.json` -- non-authoritative pending owner-approval record.
- `scripts/local-priors.mjs` -- closed validator, deterministic season resolver, compatible judge-shape projector, canonical hashing, approval verification, and structured CLI.
- `scripts/local-priors.test.mjs` -- 20 deterministic catalog, projection, CLI, malformed-input, drift, and approval tests.
- `package.json` -- local-priors test/verify commands and offline check integration.

Review findings breakdown: 6 patches applied (high 1, medium 4, low 1); 0 items deferred; 11 items rejected as production-wiring, cryptographic-authority, approval-expiry, trace-envelope, or heuristic-policy work outside the captured content-only intent, or as duplicates/noise.

Follow-up review recommendation: true. Patch score = `3 × 4 medium + 1 low = 13`; one high patch also independently requires follow-up.

Verification performed:
- `npm run local-priors:test` -- 20/20 passed after review patches; every I/O matrix row ran through focused coverage.
- `npm run local-priors:verify` -- expected exit 1; structurally valid and `pending_owner_approval`, `production_ready: false`, no approved identity, content hash `0d80450e2958633446a1cc9c3269888fdb8b6d1063071052c089d3d692ec3253`.
- `npm run check` -- passed with host permissions: 31/31 application tests, 57/57 runtime-baseline tests, 76/76 judge spike tests, 79/79 shared fixtures, 18/18 evidence predicates, 26/26 semantic-corpus tests, 20/20 local-priors tests, generated types/config checks, and runtime-baseline verification.
- `git diff --check` -- passed.
- Read-only boundary audit -- no Worker, runtime, semantic corpus, provider/deployment configuration, or sprint-state changes.

Residual risks: Justin has not approved the developer-authored catalog. Production readiness remains fail-closed until an exact approval binds catalog version 1, the canonical content hash, approval identity, and timestamp. Runtime selection and Brief generation remain later-story work; no provider, deploy, push, release, or production activation occurred.
