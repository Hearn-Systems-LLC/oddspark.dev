---
title: 'Story 1.18: Semantic Qualification'
type: 'feature'
created: '2026-08-23'
status: 'blocked'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Production lacks approved live semantic evidence proving that the structurally qualified generation primary and both qualified judge legs satisfy the frozen voice corpus, every semantic threshold, and the inherited closed integrity oracle.

**Approach:** Add a separate, approval-bound semantic qualification family that reuses the immutable Story 1.17 catalog and canonical Gate, binds exact structural identities, reports each judge leg independently against the sole qualified generation primary, and emits a SEMANTIC ref only after total offline verification.

## Boundaries & Constraints

**Always:** Bind the approved corpus/catalog identities, sole generation-primary qualification, both judge qualifications, complete configuration/source/runtime/request hashes, predeclared thresholds, and all 18 ordered Story 1.3 predicates. Validate exact fresh approval before any call; publish evidence atomically; retain consumed incomplete runs; report judge legs separately with no pooling or replacement.

**Block If:** The owner has not frozen one exact live plan covering whether frozen corpus projections or fresh generated Candidates are judged, per-leg schedule/cardinality/order, total call and cost caps, retry/timeout rules, approval lifetime, and the closed SEMANTIC manifest/ref schema. Also block if authority requests a generation fallback, result-driven threshold changes, substitute models, or additional diagnostics.

**Never:** Modify the approved voice corpus, regression catalog/harness, canonical Candidate/Judge/Gate contracts, structural qualification artifacts, or completed specs; call providers from CI; deploy or activate; repair provider output; pool results; treat the deterministic house Brief as a model configuration; infer approval from this spec or a general request to continue project work.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Approved exact run | Fresh matching approval, frozen plan, current structural/corpus identities | Execute exactly the frozen schedule and atomically retain separate judge-leg evidence | No substitutions or extra calls |
| Missing, stale, or mismatched authority | Approval, plan, identity, runtime, source, or request hash differs | Zero calls and no SEMANTIC ref | Emit a sanitized zero-call refusal receipt |
| Partial or failed run | Any authorized call started but run cannot complete | Preserve consumed incomplete evidence with no qualification ref | Never retry beyond the frozen plan |
| Verified result | Both independent reports meet every threshold and all inherited predicates | Emit canonical SEMANTIC manifest/ref | Any failure blocks activation without weakening policy |

</intent-contract>

## Code Map

- `semantic/regression/v1/catalog.json` — immutable 24-fixture catalog and semantic identity; read-only.
- `scripts/semantic-regression.mjs:36-429` — reuse catalog validation, corpus projection, canonical Gate execution, and deterministic report encoding; keep live capability separate.
- `scripts/semantic-regression.test.mjs:38-190` — frozen coverage, 19 judge calls per offline slot, separation, drift refusal, and no-live boundary.
- `semantic/voice/v1/{rubric,goldens,anti-goldens,approval}.json` — approved thresholds and corpus identity; read-only.
- `spikes/judge-fidelity/qualification.mjs:171-616` — model for plan/approval/ref derivation, bundle construction, and total verification; do not alter pinned results.
- `spikes/judge-fidelity/contract.mjs:142-154` and `evidence-v2.mjs:212-375` — exact ordered 18-predicate oracle and verification implementation.
- `spikes/generation-qualification/qualification.mjs:5-79` and `run.mjs:17-62` — model for approval, atomic publication, zero-call refusal, and incomplete-run retention.
- `spikes/**/results/**` — authoritative structural refs: generation primary only; judge primary and fallback; read-only.
- `spikes/semantic-qualification/` — new isolated plan, approval, runner, evidence, qualification, tests, and verifier surface once intent is frozen.
- `package.json`, `src/worker.js`, `wrangler*.toml`, `sprint-status.yaml`, and `deferred-work.md` — protected/read-only.

## Tasks & Acceptance

**Execution:**
- `spec-1-18-semantic-qualification.md` — owner freezes the exact live plan and SEMANTIC contract before any implementation or call.
- `spikes/semantic-qualification/qualification.mjs` — implement closed plan/approval/manifest/ref contracts and total predicate derivation.
- `spikes/semantic-qualification/run.mjs` — implement interactive-only exact execution, refusal receipts, atomic publication, and consumed-incomplete terminalization.
- `spikes/semantic-qualification/test.mjs` — adversarially prove authority, binding, cardinality, separation, drift, atomicity, and fail-closed behavior offline.
- `spikes/semantic-qualification/verify.mjs` — independently rederive every threshold, inherited predicate, and SEMANTIC identity from retained evidence.

**Acceptance Criteria:**
- Given the owner-frozen plan and fresh exact approval, when qualification runs, then only the authorized calls execute in the declared order and both judge legs remain separate against the same qualified generation primary.
- Given missing, stale, contradictory, incomplete, or drifted authority/evidence, when validation or verification runs, then no SEMANTIC ref is emitted and activation remains blocked.
- Given complete evidence, when the offline verifier derives SEMANTIC, then every frozen gate/tone/claims threshold and all 18 inherited predicates pass with complete hashes and deterministic bytes.

## Spec Change Log

- 2026-08-23 — Planning halted on unresolved spend and evidence authority: live schedule/cardinality, Candidate source, retry/cost policy, and SEMANTIC schema are not defined by authoritative artifacts; primary-only generation topology must be reconciled explicitly.

## Review Triage Log

## Design Notes

Generation has one qualified primary and no model fallback. The two independent semantic configurations are therefore the qualified judge-primary and judge-fallback legs, each evaluating the same authorized Candidate population under the sole generation-primary identity. The deterministic house Brief is operational fallback, not a semantic trial.

## Verification

**Commands:**
- `node --test scripts/semantic-regression.test.mjs` -- expected: frozen offline suite passes unchanged.
- `npm run semantic:voice:verify` -- expected: approved corpus identity remains valid.
- `node .github/check-ci.mjs` and `npm run check` -- expected: full offline gate passes with no provider call.
- `git diff --check` -- expected: no whitespace errors or protected-file modifications.

## Auto Run Result

Status: blocked
Blocking condition: intent gap. Justin must freeze (1) Candidate source: approved corpus projections only or fresh generation-primary calls; (2) exact per-judge-leg schedule, cardinality, ordering, timeout/retry, call cap, cost cap, and approval lifetime; and (3) the closed SEMANTIC manifest/ref fields and derivation. The plan must explicitly reconcile the sole generation-primary topology with two separately reported judge legs.
