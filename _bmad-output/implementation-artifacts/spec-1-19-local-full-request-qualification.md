---
title: 'Story 1.19: Local Full-Request Qualification'
type: 'feature'
created: '2026-08-24'
status: 'in-review'
baseline_commit: '3ed01d95b462fd38c0036fb6ac727d7604fd6c3a'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '3ed01d95b462fd38c0036fb6ac727d7604fd6c3a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-24-4.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Generation and judge are each structurally qualified in isolation and the direct path (Story 1.18.2) is reviewed, but no evidence proves the qualified pieces together through one real local request: Evidence assembly, one generation call, deterministic checks, at most one candidate-bound judge call per attempt, bounded attempts with house fallback, authoritative commit, and render — with latency, cost, attempt, and commit accounting retained.

**Approach:** Build an isolated, approval-gated full-request qualification harness (new spike, never CI, never production) that drives the Story 1.23 assembled runtime-neutral pipeline unchanged through one frozen local request plan against the real AI binding, retains every stage's immutable evidence, and derives a closed `LOCAL-FULL-REQUEST` ref only when every frozen predicate independently verifies. The spec freezes the contract and predicate families; the exact plan (run ID, route ceiling, call/cost caps, retained fields, timestamps) is prepared unapproved and requires Justin's fresh exact approval before any provider call.

## Boundaries & Constraints

**Always:** Exercise the real assembled pipeline bytes — the current runtime assembly identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` (governor-verified 2026-08-24 after the authorized PIPELINE_JUDGE wiring) — with no modification, shim, or re-implementation of `src/pipeline/*`. Bind the run to the current authority refs: STRUCT-GENERATION `34731e26…` (role `5cf5a547…`, Story 1.11 run l9), STRUCT-JUDGE `7dc1ec98a625a1dd16f1166067b496e4209a415e7f10854ff781f46d0d0062d0` (re-qualified run ba52ec91/f543d3d5, GO 20/20), the Story 1.8 house catalog ref, and the current `ProductionActivationManifest` v2 contract. Retain per-stage latency and timeout configuration, attempt count, judge-call count, candidate binding (`candidate_ref` per attempt), commit-reserve observance, route-ceiling observance, receipt identity, token usage, cost, and content/request/response hashes. Consume the run allowance at the first durable call-start; verified zero-call preflights are retained without consuming it. Derive the ref only from independently re-verifiable retained bytes; a NO-GO, incomplete, ambiguous, over-cap, or identity-mismatched run emits no ref and blocks activation. Mirror the hardened spike governance: exclusive stale-safe cycle lock, canonical plan/approval bytes, fsynced accounting, append-only attempt history, and an independent arbitrary-byte verifier.

**Ask First:** Any adapter start or provider call; approval of exact plan bytes, run ID, route ceiling, call/cost cap, or retention; changing the frozen pipeline, prompts, schemas, refs, or predicate set; any retry outside the bounded orchestrator; any deployment, activation, or CI invocation.

**Never:** Fabricate, repair, coerce, or re-run any stage outside the orchestrator's own bounded attempts; modify pinned Story 1.11/1.18.1/1.18.2/ba52ec91 evidence, activation.mjs, `src/pipeline/*`, deferred-work entries, or `sprint-status.yaml`; run live calls in CI; invoke generation or judge more times than the six-call ledger admits; judge a house Brief; deploy or activate; treat a green harness self-test as run evidence.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Happy path | Frozen approved plan; generation returns a closed Candidate; deterministic checks pass; judge passes | Exactly one generation call and one judge call; commit reserve and deadline observed; authoritative commit confirmed; render completes; all predicates pass; `LOCAL-FULL-REQUEST` ref emitted | Any predicate failure emits no ref |
| Deterministic rejection | Candidate fails a deterministic Gate check | Zero judge calls for that attempt (`judge_reservation_released`); next bounded attempt or house fallback | Attempt accounting must show no judge slot consumed |
| Judge rejection / exhaustion | All bounded attempts rejected or pair admission fails on deadline/capacity | House fallback selected and committed without being judged; ledger shows bounded attempts only | Missing/invalid house approval yields `house_unavailable`, evidence retained, no ref |
| Provider failure mid-run | Generation or judge call errors or times out | Orchestrator's existing bounded handling only; every attempt retained with terminal classification; no external retry | Ambiguous or incomplete attempts are terminal and preserved; run derives no ref |
| Coordinator uncertainty | COORD commit/read returns non-committal | `coordinator_uncertain` outcome; no render of uncommitted output; evidence retained; no ref | Never treat uncertainty as commit |
| Zero-call preflight | Plan/approval/content mismatch before first call | Refusal with zero calls, allowance unconsumed, preflight evidence retained | Ambiguous preflight fails closed |
| Plan tampering | Plan bytes, approval, or retained evidence mutate post-approval | Adapter refuses; verifier flags identity mismatch; no calls, no ref | Fail closed; preserve original bytes |

</intent-contract>

## Code Map

- `spikes/local-full-request-qualification/` — new isolated spike (contract, plan/approval, runner, evidence, predicates, independent verifier, adapter worker, wrangler config, README, tests), governed exactly like `spikes/generation-qualification/` and `spikes/semantic-qualification/` but driving the assembled pipeline, not a raw probe.
- `src/pipeline/assembly.mjs` — consumed unchanged; the harness must import the real assembled writer path so the run exercises Story 1.23's canonical runtime-neutral pipeline, not a re-wired copy.
- `src/pipeline/production-ports.mjs` — the frozen generation/judge provider envelope (`choices[0].message.content`, exactly one choice) is the wire shape under test; the run's live calls finally prove it against the real Workers AI binding (resolves the Story 1.25 deferred finding that the envelope is mock-only).
- `src/pipeline/strike.mjs` — the bounded orchestrator under observation; ledger events (`pair_reserved`, `generation_completed`, `judge_reservation_released`, `candidate_accepted`, `house_selected`, `coordinator_confirmed`, deadline events) are the attempt/judge-call/commit-reserve evidence source.
- `src/pipeline/gate.mjs` and `src/pipeline/judge.mjs` — deterministic-then-single-judge direct path; the evidence must show deterministic rejection consumes no judge slot and at most one candidate-bound judge call per attempt.
- `src/pipeline/activation.mjs` — v2 manifest contract the resulting `LOCAL-FULL-REQUEST` ref must satisfy (kind `full_request`); no edits.
- `src/worker.js` — reference only, for commit/receipt/render authority semantics; the harness does not deploy or modify the Worker.
- `runtime-assembly.json` — assembly identity the run binds; re-verified before the plan is frozen.
- `package.json` — add `spike:full-request:*` scripts (plan, self-test, verify) following the existing spike naming; no `check`/CI wiring of live entrypoints.
- `test.mjs` / spike `test.mjs` — offline fixtures only: closed-plan validation, zero-call refusal, tamper detection, predicate negatives (over-cap, extra judge call, missing commit reserve, identity mismatch), and independent verification of retained synthetic evidence.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/local-full-request-qualification/` — build the governed harness: closed plan/approval schema, stale-safe cycle lock, adapter worker exposing the assembled pipeline through the real AI binding under nonproduction isolated config, fsynced per-stage accounting, immutable evidence retention, and the frozen predicate set.
- [x] Independent verifier — recompute every identity from retained bytes and re-evaluate every predicate without trusting the runner; verify assembly identity, structural refs, plan/approval binding, and full attempt chronology.
- [x] Offline tests — self-test and fixtures covering the I/O matrix's refusal, accounting, and failure-preservation cases; prove no live entrypoint is reachable from `npm run check` or CI.
- [x] Prepare the exact unapproved plan bundle (run ID, route ceiling, call/cost caps with model pricing, retained-field list, schedule, predicate list) and present it for Justin's separate exact approval. No provider call before that approval.

**Acceptance Criteria:**
- Given current generation and judge structural refs, the house catalog ref, and an owner-approved finite route ceiling, when a frozen live plan is approved and run, then the full local request exercises Evidence through render on the direct path (one generation call, deterministic checks, at most one judge call per attempt, bounded attempts, house fallback on exhaustion), and per-stage latency/timeouts, attempt count, judge-call count, candidate binding, commit reserve, route ceiling, receipt identity, usage, cost, and hashes are retained, with no retry outside the bounded orchestrator, replacement, CI call, or deployment.
- Given verified results, when `LOCAL-FULL-REQUEST` is derived, then every frozen correctness, attempt/judge-call accounting, deadline/commit-reserve, cost, provenance, and authoritative-commit predicate passes; failure preserves evidence and blocks activation.
- Given the offline harness, when self-tests and the independent verifier run, then plan tampering, over-cap accounting, unbound judge calls, missing commit reserve, and identity mismatches all fail closed, and no live call is possible without an exactly matching fresh approval.

## Spec Change Log

- 2026-08-24 — Implemented the offline governed harness, independent arbitrary-byte verifier, isolated assembled-pipeline adapter/publication path, and 19-case adversarial self-test matrix. Regenerated the exact unapproved plan against assembly `02fb912…` and approved priors `2163f355…`; approval/execution remain null and allowance remains unconsumed. No provider call, live adapter start, deployment, or activation occurred. Story moved to `in-review` after all packet gates passed, with only the explicitly excepted unchanged DW-6 judge residual in `npm run check`.

- 2026-08-24 — Governor-approved assembly identity move `44662879…` → `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2`: the dev-authorized PIPELINE_JUDGE wiring (production-ports.mjs, closed STRUCT-JUDGE descriptor `7dc1ec98…`) changed the canonical bytes. Governor independently verified the new identity (`npm run assembly:verify`, 17 modules), confirmed `production-ports.mjs` is the only changed module hash, and confirmed gates green (npm test 102/102, spike self-test 15/15, `git diff --check`). The unapproved live plan must bind `02fb912…`; a plan bound to the old identity is not runnable.

- 2026-08-24 — Created from the Story 1.19 text rescoped by approved sprint-change-proposal-2026-08-24-4 (direct-path activation authority): no semantic ref exists or is required; activation binds generation structural, judge structural, house catalog, and this story's `LOCAL-FULL-REQUEST` ref. Judge structural ref updated to the ba52ec91/f543d3d5 re-qualification (PR #21); activation manifest is v2 (PR #20). The live run and its exact plan remain unapproved; this spec carries no live authority.

## Verification

**Commands:**
- `npm run spike:full-request:self-test` -- expected: offline harness fixtures pass.
- `npm test` -- expected: full offline suite green.
- `npm run assembly:verify` and `npm run check` -- expected: canonical assembly and full offline gate pass (known governed residual DW-6 excepted).
- `git diff --check` -- expected: no whitespace errors or protected-file changes.
- Post-run (after separate approval): independent verifier over the retained evidence set -- expected: all frozen predicates pass before any `LOCAL-FULL-REQUEST` ref is emitted.
