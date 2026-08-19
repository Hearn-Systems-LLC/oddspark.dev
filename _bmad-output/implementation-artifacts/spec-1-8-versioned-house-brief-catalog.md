---
title: 'Versioned House Brief Catalog'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
baseline_revision: '9667b3414e9b6bd4457ed0d8a0fb3c7be98de7ae'
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred: []
operator_actions:
  - 'Review and approve the exact semantic voice rubric and corpus in semantic/voice/v1 using its documented hash-bound owner-approval workflow.'
  - 'Review all eight house Briefs against the approved rubric, then record Justin approval in content/house-briefs/v1/approval.json for catalog hash 06f74672f2005a33c6ad030ac38d709e7021b70c45cf01dbd5d31741323ebc9b.'
  - 'Run npm run house-briefs:verify and confirm it reports production_ready true after both exact approvals are recorded.'
---

<intent-contract>

## Intent

**Problem:** Qualified generation failures need a useful fallback, but the repository has no validated, versioned, approval-bound catalog of seasonal house Briefs.

**Approach:** Add a pure offline catalog module and curated content that reuse the production Brief validator, validate explicit all-pass Gate expectations, select deterministically within a season, and bind owner approval to the exact canonical catalog hash.

## Boundaries & Constraints

**Always:** Provide at least two stable-ID complete local Briefs for every canonical season; reject closed-shape, schema, stable-ID, season, placeholder, duplication, Gate-expectation, and approval/hash drift; keep selection deterministic from an explicit non-placeholder selection key; validate entries through Story 1.7's production Brief contract; keep catalog and approval data integer-versioned and offline.

**Block If:** A change to the production Brief shape, canonical seasons, voice rubric, Gate set, approval semantics, or deterministic selection contract is required; owner approval must be recorded without Justin supplying it.

**Never:** Forge approval; silently promote golden Briefs into production catalog entries; claim semantic qualification from structural expected outcomes; add business-specific claims, pricing, percentages, hidden personalization, or personal names; wire runtime selection, orchestration, persistence, rendering, providers, deployments, or sprint status; modify Story 1.5/1.6 content, Story 1.7 contracts, retained spike evidence, or runtime configuration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Valid catalog | Exact catalog, canonical seasons, complete Briefs, all-pass expectations | Return a deeply frozen catalog and deterministic canonical hash | No error expected |
| Deterministic selection | Valid season and explicit stable selection key | Same inputs select the same stable entry; changed keys may select another entry | Reject blank or placeholder keys and unknown seasons |
| Catalog drift | Placeholder, duplicate ID/content, missing season, malformed Brief, bad Gate expectation, or unknown field | Produce no usable catalog or selection | Return stable structured issues and fail closed |
| Approval state | Pending or exact approved hash record | Pending remains non-ready; exact approved hash is ready | Reject forged, malformed, or drifted approval records |

</intent-contract>

## Code Map

- `_bmad-output/planning-artifacts/epics.md:387` -- authoritative Story 1.8 scope and acceptance boundary.
- `_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md:59` -- pre-vetted house exception; AD-3 at line 71 requires curated per-season local Briefs reviewed against the rubric.
- `scripts/brief-contracts.mjs:88` -- production closed Brief validator/builder to reuse; candidate identity helpers are not catalog authority.
- `scripts/local-priors.mjs:75` -- canonical JSON/domain-hash and strict catalog conventions; lines 183-260 establish season and pending/approved hash-binding patterns.
- `content/local-priors/v1/priors.json:15` -- canonical season IDs/order only; content and approval remain read-only.
- `scripts/semantic-corpus.mjs:318` -- pending-versus-approved verification semantics to mirror without altering voice artifacts.
- `semantic/voice/v1/rubric.json:10` -- exact element, Gate, voice, claim, and preservation rules; read-only authority.
- `content/house-briefs/v1/catalog.json` and `approval.json` -- new curated production catalog and closed owner-approval record.
- `scripts/house-briefs.mjs` -- new pure validator, canonical hash, approval verifier, and deterministic selector.
- `scripts/house-briefs.test.mjs` -- new positive, adversarial, drift, approval, and determinism coverage.
- `package.json` -- register focused test/verification commands and compose the test into `check`.

## Tasks & Acceptance

**Execution:**
- [x] `content/house-briefs/v1/catalog.json` and `approval.json` -- author at least two stable-ID complete local Briefs per canonical season with explicit expected all-pass Gate/tone/claims outcomes, plus a closed pending approval record bound to the catalog hash.
- [x] `scripts/house-briefs.mjs` -- implement strict loading/validation, deep freezing, domain-separated canonical hashing, deterministic season/key selection, and exact pending/approved hash verification by reusing Brief contracts and canonical season authority.
- [x] `scripts/house-briefs.test.mjs` -- cover every matrix row, all seasons, completeness/voice restrictions, stable selection, unknown keys, mutation attempts, placeholders, duplicates, drift, malformed expectations, and approval mismatch.
- [x] `package.json` -- expose `house-briefs:test` and `house-briefs:verify`, and include the focused offline test in `check`.

**Acceptance Criteria:**
- Given the production Brief validator, canonical seasons, and voice rubric, when the catalog test runs, then every season has at least two unique stable-ID complete local Briefs, each passes exact validation and declares Gates 1-9, tone, and claims as passing, with no business-specific claims, pricing, percentages, personal names, or hidden personalization.
- Given a valid season and explicit stable selection key, when offline selection and hashing run repeatedly, then catalog hashing and selected stable ID are deterministic, while placeholder, drifted, duplicate, missing-season, malformed, or invalid content fails closed with stable issues.
- Given the owner approval record, when offline verification runs, then only Justin's explicit approved state bound to the exact current catalog hash reports ready; pending approval or any content/hash drift reports non-ready and no approval is fabricated.
- Given repository verification, when `npm run house-briefs:test`, `npm run brief-contracts:test`, `npm run check`, and `git diff --check` run, then all offline tests pass without network, provider, runtime, deployment, retained-evidence, or sprint-status changes.

## Spec Change Log

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 3, medium 3, low 2)
- defer: 0
- reject: 12: (high 0, medium 4, low 8)
- addressed_findings:
  - `[high]` `[patch]` Required the rubric Gate authority to equal canonical Gates 1-9 exactly.
  - `[high]` `[patch]` Bound catalog qualification to the exact canonical priors and voice-rubric hashes so authority drift invalidates readiness.
  - `[high]` `[patch]` Added direct loader, CLI report, and executable exit-status verification for pending and malformed artifacts.
  - `[medium]` `[patch]` Rejected empty, blank, non-string, and untrimmed banned-register authority values.
  - `[medium]` `[patch]` Exercised deterministic selection for every canonical season.
  - `[medium]` `[patch]` Added fail-closed malformed-authority and approval-shape, status, version, and timestamp coverage.
  - `[low]` `[patch]` Tightened stable IDs to strict kebab case.
  - `[low]` `[patch]` Replaced tautological issue stability coverage with exact representative issue ordering.

## Design Notes

- Catalog entries wrap the production Brief with catalog-owned stable ID, season ID, and expected outcomes; the Brief itself remains the exact Story 1.7 schema.
- Selection hashes a domain-separated canonical pair of season and caller-provided selection key, then chooses modulo the season's stable catalog order. It never reads time or randomness.
- Expected all-pass declarations are structural review bindings, not evidence of a live semantic judge run; later qualification stories retain that responsibility.

## Verification

**Commands:**
- `npm run house-briefs:test` -- expected: catalog, selection, drift, and approval-contract tests pass offline.
- `npm run house-briefs:verify` -- expected: exits nonzero with an exact hash while approval is pending; exits zero only after exact owner approval.
- `npm run brief-contracts:test` -- expected: reused production Brief contracts remain green.
- `npm run check` -- expected: the full offline suite passes.
- `git diff --check` -- expected: no whitespace errors.

## Auto Run Result

Summary: Added a versioned offline house-Brief catalog with eight complete local Briefs, strict catalog and authority validation, deterministic selection, canonical hashing, and fail-closed owner-approval verification. All agent-doable work is complete; production readiness remains pending Justin's exact rubric and catalog approvals.

Files changed:
- `content/house-briefs/v1/catalog.json` -- two stable-ID, expected-all-pass local Briefs for each canonical season, bound to exact authority hashes.
- `content/house-briefs/v1/approval.json` -- closed pending owner-approval record bound to catalog hash `7a24d3b391820dcac1f2098ae130da627de0047e7dcc14909a4908074be5afd2`.
- `scripts/house-briefs.mjs` -- strict validation, deep freezing, authority and content hashing, deterministic selection, loading, reporting, and approval verification.
- `scripts/house-briefs.test.mjs` -- 17 positive, adversarial, authority-drift, approval, CLI, and all-season selection tests.
- `package.json` -- registered `house-briefs:test` and `house-briefs:verify` and composed the focused test into `check`.
- `_bmad-output/implementation-artifacts/spec-1-8-versioned-house-brief-catalog.md` -- planning, review evidence, verification, and operator handoff.

Review findings breakdown: 8 patches applied (high 3, medium 3, low 2); 0 items deferred; 12 non-actionable or out-of-scope suggestions rejected. Follow-up review recommendation: true; patched-finding score is overridden by the presence of high-severity patches (weighted non-high score: `3 × 3 + 1 × 2 = 11`).

Verification performed:
- `npm run house-briefs:test` -- 17/17 passed.
- `npm run brief-contracts:test` -- 15/15 passed.
- `npm run check` -- full offline repository suite passed, including 31/31 worker tests, 57/57 baseline tests, 76/76 judge-spike tests, 26/26 voice tests, 20/20 local-priors tests, type/config checks, and runtime-baseline verification.
- `git diff --check` -- passed.
- `npm run house-briefs:verify` -- expected exit 1; reported structurally valid, `pending_owner_approval`, `production_ready: false`, and exact hash `7a24d3b391820dcac1f2098ae130da627de0047e7dcc14909a4908074be5afd2`.
- Matrix audit -- every intent-contract row is exercised by the 17-test focused suite.

Residual risks: Semantic Gate passage and production readiness depend on Justin reviewing the authored prose under the exact approved voice rubric and recording the two hash-bound approvals. No live semantic qualification, runtime wiring, deployment, or sprint-state mutation was claimed or performed.

## Operator Confirmation

Confirmed by Justin on 2026-08-19 and recorded in pushed commit `c827295`:

- Approved voice-v1 semantic identity `b387b27c7fd91062ae7b0aec39ada8103b579655b5161e2556b614b1d2f6694e` after revising invitations to be confident, bounded, and low-pressure.
- Approved house Brief catalog hash `06f74672f2005a33c6ad030ac38d709e7021b70c45cf01dbd5d31741323ebc9b` covering all eight reviewed Briefs.
- `npm run semantic:voice:verify` reports `valid: true` and `readiness: approved`.
- `npm run house-briefs:verify` reports `structure_valid: true`, `readiness: approved`, and `production_ready: true`.

Story 1.8 is complete. This confirmation authorizes the exact approved voice and house-catalog artifacts only; it does not authorize provider calls, runtime activation, deployment, or release.
