---
title: 'Story 1.10: Generation Contract and Offline Adapter'
type: 'feature'
created: '2026-08-18'
status: 'done' # draft | ready-for-dev | in-progress | in-review | done | blocked
baseline_revision: '503affc8e15e2787c333dc009c1a657b6f18c4f1'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Evidence and Candidate are closed production contracts, but no generation boundary currently guarantees that one seed-bound request produces only one directly valid Candidate. Provider-shaped output could otherwise be coerced, repaired, or leak legacy/free-text state downstream.

**Approach:** Add a pure Node-importable Generate port and offline adapter that accept closed Evidence plus an explicit seed, invoke only an injected fake provider at most once, classify the provider result without repair, validate the exact Candidate through Story 1.7, and derive `candidate_ref` only after validation.

## Boundaries & Constraints

**Always:** Snapshot and validate plain input/dependency objects before invocation; require closed Story 1.7 Evidence and an explicit canonical seed; make at most one provider call; preserve direct structured values exactly; require exactly one Candidate-shaped result; validate before deriving `candidate_ref`; return recursively frozen success and stable typed failures with safe structured issues; count an invoked provider call even when it fails or returns invalid output.

**Block If:** Implementation requires changing the Story 1.7 Brief/Candidate or Evidence shapes, the candidate-reference preimage, or selecting a production provider wire protocol that Story 1.11 must qualify.

**Never:** Retry, repair, coerce, trim, fill defaults, select among multiple candidates, extract JSON from text, accept Markdown/code fences or wrapper prose, expose partial Candidate, pass legacy axes or raw provider text downstream, import a production provider/binding, call the network, alter Worker routing/rendering, deploy, or write `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Direct-valid generation | Closed Evidence, explicit seed, fake provider returns one exact Candidate object | One frozen `{ candidate, candidate_ref, model_calls: 1 }`; returned Candidate equals the direct value and reference matches Story 1.7 | No error expected |
| Invalid request | Missing/malformed Evidence, seed, provider, or dependency object | Provider is never invoked and no Candidate is exposed | Typed request/evidence failure with `model_calls: 0` |
| Provider failure | Fake provider throws or rejects | Exactly one invocation; no retry or Candidate | Typed provider failure with `model_calls: 1` |
| Non-direct output | Missing/extra/mistyped/coerced/invented/repaired/ambiguous/oversized result, array/multiple candidates, wrapper, or raw text | Nothing is normalized into a Candidate | Typed adapter/contract failure with `model_calls: 1` |

</intent-contract>

## Code Map

- `scripts/brief-contracts.mjs:88` -- authoritative closed Brief/Candidate validator; reuse `buildCandidate` rather than duplicating schema policy.
- `scripts/brief-contracts.mjs:143` -- `deriveCandidateRef` validates again and owns the domain-separated `brief/v1` identity; call only after direct validation.
- `scripts/brief-contracts.mjs:149` -- authoritative Evidence validator/builder; reject invalid Evidence before provider invocation.
- `scripts/brief-contracts.mjs:76` -- recursive `deepFreeze` utility for success envelopes, failures, and snapshotted provider inputs.
- `scripts/local-evidence.mjs:22` -- established typed-failure, safe-issue sanitization, dependency snapshot, and fail-closed style to follow without coupling Generate to local-prior I/O.
- `scripts/brief-contracts.test.mjs:53` -- reusable valid local/domain Candidate and Evidence fixture patterns plus mutation, closed-schema, reference, and immutability assertions.
- `scripts/generation.mjs` -- new provider-agnostic single-pass port and offline result classifier; no production adapter or network imports.
- `scripts/generation.test.mjs` -- new fake-provider contract matrix, invocation accounting, direct-value preservation, failure containment, and forbidden legacy/free-text coverage.
- `package.json` -- expose a focused offline generation test and compose it into `check`.
- `src/worker.js` -- read-only; runtime orchestration and provider selection belong to later stories.

## Tasks & Acceptance

**Execution:**
- `scripts/generation.mjs` -- implement request/dependency snapshotting, Evidence and seed validation, one-call fake-provider invocation, strict direct-result classification, authoritative Candidate construction/reference binding, recursive freezing, safe typed failures, and model-call accounting.
- `scripts/generation.test.mjs` -- cover both Evidence modes and every I/O-matrix branch, including sync/async provider failures, getters/cycles/non-plain objects, input mutation, exact direct-value preservation, missing/unknown/nested-extra fields, scalar/array/wrapper/text/code-fence output, coercion/default/repair attempts, oversized output, stale or injected reference behavior, one-call maximum, and zero network/production capability.
- `package.json` -- add `generation:test` and include it in the offline `check` gate.

**Acceptance Criteria:**
- Given closed local or domain Evidence and an explicit seed, when Generate runs through a fake provider, then it invokes that provider at most once and yields exactly one recursively frozen direct-valid Candidate with a post-validation Story 1.7 `candidate_ref`, or a typed failure carrying the correct `model_calls` count.
- Given any adapter fixture whose output is missing, extra, mistyped, coerced, invented, repaired, ambiguous, multiple, wrapped, textual, fenced, or oversized, when classification runs, then it rejects without mutation, extraction, retry, fallback, partial Candidate exposure, or reference derivation.
- Given repository verification, when `npm run generation:test`, `npm run check`, and `git diff --check` run, then all offline tests pass without network, production provider/binding, runtime behavior, deployment, or sprint-state changes.

## Spec Change Log

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 2, low 3)
- defer: 0
- reject: 13: (high 0, medium 2, low 11)
- addressed_findings:
  - `[low]` `[patch]` Contained top-level request Proxy and reflection traps as frozen `invalid_request` failures before provider invocation.
  - `[low]` `[patch]` Contained dependency Proxy and reflection traps as frozen `invalid_request` failures before provider invocation.
  - `[medium]` `[patch]` Added a 64 KiB aggregate UTF-8 bound and explicit structured diagnostics for request Evidence inspection.
  - `[medium]` `[patch]` Added a 32-level nesting ceiling with typed pre-call and post-call failures rather than relying on stack exhaustion.
  - `[low]` `[patch]` Added focused multibyte aggregate-size, nesting-depth, reflection-trap, and provider-call-accounting regression coverage.

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 0
- reject: 12: (high 0, medium 0, low 12)
- addressed_findings:
  - `[low]` `[patch]` Guarded `snapshotRequest` seed type explicitly before regex testing to safely fail `Symbol` and non-string seeds as `invalid_request`.
  - `[low]` `[patch]` Used `Object.defineProperty` in `copyPlainJson` plain-object cloning to safely preserve own data properties without triggering prototype setters.

## Design Notes

- Keep the provider contract deliberately minimal and injected: it receives only an immutable snapshot of the validated Evidence and seed, and its direct return value is the adapter fixture. Story 1.11 owns concrete wire schemas and provider identities.
- Treat call accounting as part of every result. Validation failures occur before invocation (`0`); once invocation begins, provider and adapter failures report `1` even when no Candidate exists.
- Bound adapter input before expensive traversal. Oversize rejection must not depend on lossy coercion or parsing untrusted text into an object.

## Verification

**Commands:**
- `npm run generation:test` -- expected: all single-pass and adversarial offline adapter tests pass with zero network activity.
- `npm run check` -- expected: the complete offline repository gate passes with the generation suite included.
- `git diff --check` -- expected: no whitespace errors.

## Auto Run Result

- **Summary of implemented change:** Implemented the single-pass offline Generate port and adapter in `scripts/generation.mjs` with full test coverage in `scripts/generation.test.mjs` and wired `generation:test` into `package.json` and `check`. It accepts closed Evidence and an explicit seed, enforces acyclic plain-data boundaries, invokes an injected provider at most once, and classifies direct Candidate output with post-validation `candidate_ref` derivation and model call accounting.
- **Files changed:**
  - `scripts/generation.mjs`: Pure Node-importable Generate port and offline adapter with defensive request/dependency snapshotting, single-pass fake-provider execution, and strict direct-Candidate classification.
  - `scripts/generation.test.mjs`: Unit tests asserting direct-valid generation, closed schema validation, failure classification, non-string/Symbol seeds, reflection traps, mutation isolation, call accounting, and zero network imports.
  - `package.json`: Added `generation:test` script and included it in the offline `check` script.
  - `_bmad-output/implementation-artifacts/spec-1-10-generation-contract-and-offline-adapter.md`: Spec, triage logs, and run results.
- **Review findings breakdown:** 2 patches applied (`snapshotRequest` seed type safety and `copyPlainJson` `Object.defineProperty` own-property protection), 0 deferred, 12 rejected.
- **Follow-up review recommendation:** `false` (high: 0, medium: 0, low: 2, score: 2 < 5).
- **Verification performed:**
  - `npm run generation:test`: passed (14/14 tests passing).
  - `npm run check`: passed (full repository offline verification gate).
  - `git diff --check`: passed (zero whitespace issues).
- **Residual risks:** None. Concrete production wire protocols and live provider bindings are intentionally deferred to Story 1.11.
