---
title: 'Story 1.9: Local Evidence Assembly'
type: 'feature'
created: '2026-08-18'
status: 'done' # draft | ready-for-dev | in-progress | in-review | done | blocked
baseline_revision: '04bc3fc2c8142270f73359a5656a194573c82a36'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The approved local-priors catalog can be validated and projected, and the production Evidence contract already exists, but there is no single fail-closed assembly port that turns an explicit strike instant into immutable local Evidence without provider activity. Generate therefore lacks a deterministic, reference-bound regional input.

**Approach:** Add a pure Node-importable local Evidence assembler that loads or accepts approved priors, derives the America/Detroit calendar date and season from the supplied instant, builds the existing closed Evidence shape, derives its canonical reference, freezes the complete result, and converts every input/catalog/approval/contract failure into one typed failure family.

## Boundaries & Constraints

**Always:** Require an explicit canonical ISO-8601 strike timestamp representing an instant; derive `YYYY-MM-DD` in `America/Detroit` rather than from the host timezone. Require an exact current owner approval before assembly. Reuse Story 1.6 selection/validation and Story 1.7 `buildEvidence`, `deriveEvidenceRef`, and `deepFreeze` contracts. Return a frozen `{ evidence, evidence_ref, model_calls: 0 }` success value. Fail closed before returning any partial Evidence, with stable machine-readable failure codes and the original structured issues where safe. Keep selection deterministic for identical inputs.

**Block If:** Implementation requires changing the AD-4 local Evidence shape, the approved priors content or approval authority, or the Story 1.7 evidence-reference preimage.

**Never:** Call a model, provider, network, Worker route, storage service, or wall clock; infer a missing timestamp; use the host timezone; mutate the catalog or returned values; alter runtime generation/router/rendering behavior; approve pending content; deploy; or write `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Approved assembly | Approved catalog, compatible situation/bundle, explicit strike instant | Frozen closed local Evidence, deterministic `evidence_ref`, `model_calls: 0` | No error expected |
| Detroit boundary | Instants around DST, leap day, month/season, or year boundaries | Date and season follow the America/Detroit calendar day | No host-timezone dependence |
| Bad request | Missing/invalid/non-canonical timestamp or unknown/incompatible selection | No Evidence is exposed | Typed request/selection failure |
| Bad priors | Missing, malformed, pending, stale, or hash-mismatched catalog/approval | No partial Evidence is exposed | Typed priors/approval failure preserving structured issues |
| Contract rejection | Projected data cannot satisfy Story 1.7 Evidence validation/reference derivation | No partial Evidence is exposed | Typed contract failure; `model_calls` remains zero by construction |

</intent-contract>

## Code Map

- `scripts/local-priors.mjs:183` -- reuse `resolveSeason`; `projectLocalPrior` at line 193 already validates deterministic situation/bundle compatibility; `verifyLocalPriors` at line 249 binds exact owner approval.
- `scripts/brief-contracts.mjs:149` -- authoritative closed local Evidence validator/builder; `deriveEvidenceRef` at line 172 owns the versioned canonical identity and `deepFreeze` at line 76 owns recursive immutability.
- `content/local-priors/v1/priors.json` and `content/local-priors/v1/approval.json` -- default assembly inputs; read-only content and authority records.
- `scripts/local-priors.test.mjs` -- existing catalog, approval, leap-day, season-boundary, projection, and fail-closed fixtures to reuse rather than duplicate.
- `scripts/local-evidence.mjs` -- new assembly boundary and typed failure family; no runtime/provider dependencies.
- `scripts/local-evidence.test.mjs` -- new deterministic timezone, identity, freezing, failure-containment, and zero-provider-activity coverage.
- `package.json` -- expose the focused test and compose it into the offline `check` chain.
- `src/worker.js` -- read-only for this story; orchestration and production routing begin in later stories.

## Tasks & Acceptance

**Execution:**
- `scripts/local-evidence.mjs` -- implement file-backed and dependency-injected local Evidence assembly, canonical strike-instant validation, America/Detroit date derivation, approved-priors verification, deterministic projection, Story 1.7 construction/reference binding, recursive freezing, and stable typed failures.
- `scripts/local-evidence.test.mjs` -- cover the I/O matrix, including spring/fall DST transitions, local-midnight crossings, leap day, season/year boundaries, host-timezone independence, repeated-input identity, mutation attempts, malformed or unavailable files, pending/drifted approval, invalid selections, and proof that no provider/network seam exists or runs.
- `package.json` -- add `local-evidence:test` and include it in `check` so the contract remains an offline release gate.

**Acceptance Criteria:**
- Given approved priors, a compatible selection, and an explicit strike instant, when local Evidence assembles, then the result contains exactly a recursively frozen AD-4 local Evidence value, its Story 1.7 deterministic `evidence_ref`, and `model_calls: 0`.
- Given instants spanning Detroit DST transitions, leap day, month/season boundaries, and New Year, when assembly derives its date and season under any host timezone, then the output matches the America/Detroit calendar and remains byte-for-byte deterministic for identical inputs.
- Given missing, invalid, pending, unavailable, incompatible, or contract-rejected input, when assembly runs, then it returns or throws the documented typed evidence failure without exposing partial Evidence and without any provider or network activity.
- Given repository verification, when `npm run local-evidence:test`, `npm run check`, and `git diff --check` run, then all offline tests pass without runtime behavior, deployment, content approval, or sprint-state changes.

## Spec Change Log

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 0, low 4)
- defer: 0
- reject: 10: (high 0, medium 2, low 8)
- addressed_findings:
  - `[low]` `[patch]` Added function type validation to dependency overrides in `snapshotDependencies`, failing invalid overrides as `invalid_request`.
  - `[low]` `[patch]` Validated non-empty string path requirements for `priors_path` and `approval_path` in `assembleLocalEvidenceFromFiles`.
  - `[low]` `[patch]` Disambiguated `assembleLocalEvidence` fallback structured issue to attribute catalog structural invalidity to `{ artifact: "priors", rule: "priors_invalid" }`.
  - `[low]` `[patch]` Expanded test assertions covering invalid dependency types, empty/whitespace paths, non-string selection parameters, and catalog structural invalidity fallback diagnostics.

### 2026-08-18 — Initial review pass
- intent_gap: 0
- bad_spec: 0
- patch: 14: (high 2, medium 6, low 6)
- defer: 0
- reject: 7: (high 0, medium 3, low 4)
- addressed_findings:
  - `[medium]` `[patch]` Enforced true plain-object request/dependency inputs and snapshotted file-backed request fields before I/O so invalid requests cannot be masked or trigger later getters.
  - `[medium]` `[patch]` Restricted canonical instants to Gregorian years 0001–9999 and preserved four-digit Detroit dates across calendar boundaries.
  - `[medium]` `[patch]` Sanitized cyclic, accessor-bearing, and non-cloneable issue data so all contained failures remain `LocalEvidenceError` values.
  - `[low]` `[patch]` Added stable structured issues for unknown/incompatible selections and distinct read-versus-JSON-parse diagnostics with safe locations.
  - `[high]` `[patch]` Revalidated injected Evidence and reference results through the authoritative Story 1.7 builder and reference derivation before returning success.
  - `[medium]` `[patch]` Added direct containment coverage for both Evidence-build and reference-derivation rejection without partial output.
  - `[medium]` `[patch]` Expanded file-backed tests across malformed/unavailable priors and approval files, pending default approval, diagnostic fields, and frozen issue collections.
  - `[low]` `[patch]` Expanded deterministic-boundary and immutability coverage across every season transition, DST, leap/year edges, the complete success tree, and post-assembly input mutation.

## Design Notes

- Keep the assembler policy-oriented and synchronous after its optional file reads: timestamp conversion and catalog projection are pure, while the file-backed wrapper contains I/O errors in the same typed failure family.
- Canonical timestamp means `new Date(value).toISOString() === value`; this admits `Z` instants only and removes equivalent-spelling identity drift. Detroit date derivation uses a fixed `Intl.DateTimeFormat` configuration and reconstructs `YYYY-MM-DD` from `formatToParts`.
- The success envelope's `model_calls: 0` is an invariant, not a mutable ledger. Later orchestration may account for Evidence calls, but local assembly cannot receive a provider capability.

## Verification

**Commands:**
- `npm run local-evidence:test` -- expected: focused assembly and adversarial boundary tests pass offline.
- `npm run check` -- expected: the complete repository gate passes with the new suite included.
- `git diff --check` -- expected: no whitespace errors.

## Auto Run Result

### Implemented Change
Added pure, Node-importable local Evidence assembly modules (`scripts/local-evidence.mjs` and `scripts/local-evidence.test.mjs`) implementing `assembleLocalEvidence` and `assembleLocalEvidenceFromFiles`. The assembler enforces canonical ISO-8601 UTC instants, derives the America/Detroit calendar date and meteorological season deterministically regardless of host timezone, verifies exact owner approval against Story 1.6 priors, projects situation/capability selections, validates against Story 1.7 Evidence and canonical reference contracts, recursively deep-freezes output envelopes, and contains all failures in a typed `LocalEvidenceError` family with zero provider or network dependencies.

### Files Changed
- `scripts/local-evidence.mjs` -- Authoritative in-memory and file-backed local Evidence assembler, Detroit calendar derivation, and typed error definitions.
- `scripts/local-evidence.test.mjs` -- Comprehensive unit test suite covering timezone independence, canonical timestamps, boundary dates, immutability, failure containment, dependency injection, and zero-provider verification.
- `package.json` -- Added `local-evidence:test` npm script and added it to the offline `check` gate.
- `_bmad-output/implementation-artifacts/spec-1-9-local-evidence-assembly.md` -- Story specification, review triage log, design notes, and auto-run result record.

### Review Findings Breakdown
- Patches applied: 4 (0 high, 0 medium, 4 low)
- Items deferred: 0
- Items rejected: 10 (0 high, 2 medium, 8 low)

### Follow-up Review Recommendation
- Recommendation: `false`
- Patched counts by severity: `high: 0`, `medium: 0`, `low: 4`
- Score: `3 × 0 + 1 × 4 = 4` (below the threshold of 5; no high-severity findings)

### Verification Performed
- `npm run local-evidence:test` -- Passed (11/11 tests passing, 0 failures, 277ms).
- `npm run check` -- Passed (entire offline repository test suite, types check, config check, and runtime baseline verification passed with exit code 0).
- `git diff --check` -- Passed (0 whitespace or format errors).

### Residual Risks
- None. The assembler is a pure offline module without runtime side effects or network capabilities, adhering strictly to Story 1.6 catalog verification and Story 1.7 contract invariants.
