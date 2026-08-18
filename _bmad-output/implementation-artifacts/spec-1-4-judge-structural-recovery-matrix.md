---
title: 'Story 1.4: Judge Structural Recovery Matrix'
type: 'feature' # feature | bugfix | refactor | chore
created: '2026-08-17'
status: 'blocked' # draft | ready-for-dev | in-progress | in-review | done | blocked
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
warnings: []
deferred: []
---

# Story 1.4: Judge Structural Recovery Matrix

Planning was halted before a spec was drafted because a hard prerequisite is missing. This file records the evidence gathered so the story can resume cheaply once the prerequisite exists.

## Why this halted

Story 1.4 (epics.md §"Story 1.4", lines 282–314) declares **Dependency: Stories 1.2–1.3; exact live authority is additionally required.** Its acceptance criteria are defined *in terms of Story 1.3's outputs*:

- AC1: "**Given** the offline verifier passes and a frozen primary/fallback matrix is proposed" — the offline verifier is Story 1.3's evidence-v2 verifier.
- AC3: "each configuration independently requires at least 95% direct-valid **plus every predicate in the Story 1.3 verifier's closed predicate list** for GO" — epics.md line 207 and sprint-change-proposal-2026-08-17.md line 201 bind "every integrity predicate" to "the closed predicate list of the Story 1.3 evidence-v2 verifier (cited by version hash)".
- Story 1.3's own ACs (epics.md lines 264–280) require the **outer candidate-bound `JudgeResult {candidate_ref, verdict}` and inner `CanonicalVerdict`** contract, closed/exact objects, and a verifier that recomputes hashes/classifications/rates without network.

None of that exists in the repository at HEAD `a757497775b6feca89728612136dca83767202e0`:

- `grep -rIl "JudgeResult\|CanonicalVerdict\|candidate_ref"` across the repo (excluding node_modules/.git) returns nothing.
- `sprint-status.yaml` has `1-3-judge-recovery-contract-and-offline-verifier: in-progress` — that row is the carried-over legacy spike (`implementation-artifacts/1-2-judge-fidelity-spike.md`, Task 6 open, v1 `NO-GO`), not evidence-v2 work; the loop skipped it and dispatched 1-4 directly (`.bmad-loop/runs/20260817-142403-84c0/journal.jsonl`: `story-done` 1-2 → `story-start` 1-4).
- No branch or stash carries Story 1.3 work (`git branch -a`, `git stash list`).

Building 1.4 without 1.3 would mean inventing the JudgeResult contract and the closed predicate list inside 1.4 — a scope widening that Story 1.3 would then collide with, and a "recovery matrix" that is not the evidence-v2 matrix the architecture authorizes (ARCHITECTURE-SPINE.md line 235: "at most one separately approved evidence-v2 recovery matrix"; only one is allowed, so it must not be spent on the wrong contract). This is a dependency gap, not an operator action, so `awaiting-operator` would misrepresent the state.

## Investigation carried forward (for the resume)

- **Existing harness to extend (v1):** `spikes/judge-fidelity/` — `contract.mjs` (624 lines: AD-2 schema, strict validator, envelope normalization, repair whitelist, taxonomy), `run.mjs` (779 lines: `verify` and `live` commands; probe-then-matrix, 42-call cap, sequential trials, no retries), `worker.mjs` (loopback dev adapter, remote `AI` binding only), `test.mjs` (offline self-test), `wrangler.toml` (spike-only config), `README.md` (authorized live protocol). Package scripts: `spike:judge:self-test`, `spike:judge:verify`, `spike:judge:dev`, `spike:judge:live`.
- **Immutable v1 evidence (never overwrite/reclassify):** `spikes/judge-fidelity/results/2026-08-16-d2b84005.{json,md}` + `-audit.md` — NO-GO, 0/20 direct and post-repair per model for `@cf/openai/gpt-oss-120b` and `@cf/openai/gpt-oss-20b`; 40/40 `schema_invalid`. The audit lists three integrity limitations (verifier does not close/type-check nested objects or recompute authorization/headroom; evidence not bound to running adapter/config fingerprint; fixture count is test-function count) that Story 1.3 must fix before a new run.
- **Runtime identity to embed (Story 1.2, done):** `runtime-baseline.json` frozen by `scripts/runtime-baseline.mjs`; Wrangler pinned `4.123.0`; `spec-1-2-toolchain-and-isolated-runtime-baseline.md` notes the spike self-test (`spikes/judge-fidelity/test.mjs:336`) currently fails on a stale `scripts.dev === "wrangler dev"` assertion (deferred item) — must be fixed before 1.4's "offline verifier passes" precondition can be true.
- **Architecture anchors for 1.4:** ARCHITECTURE-SPINE.md line 133 (closed `QualificationManifest` fields and `qualification_ref = sha256("oddspark-qualification/v1\n" + canonical_json(...))` — the "exact STRUCT-JUDGE refs" GO must produce), line 65 (JudgeResult binding rule; provider response must itself contain `candidate_ref`, adapter may not synthesize it — see reviews/review-course-correction-adversarial.md line 26), line 195 (judge recovery pair unset until 1.4 freezes it and Justin approves).
- **Operator actions that 1.4 will owe once buildable** (record under `operator_actions:` at that time): confirm the Wrangler profile/account and plan headroom; grant fresh approval of the disclosed frozen matrix (provider, models, prompt/schema/adapter hashes, runtime identity, call cap, maximum cost, retained fields); run the live matrix from a terminal (`spike:judge:dev` + `spike:judge:live`), since live metered calls must never run in CI or unattended.

## Suggested unblock

Set `1-3-judge-recovery-contract-and-offline-verifier` to a dispatchable state (or run `bmad-build-auto 1-3-...` explicitly) so Story 1.3 produces the JudgeResult contract, hardened verifier, and closed predicate list; then re-dispatch 1-4. `spec-1-4-...` can be deleted or reused as the resume point.

## Auto Run Result

Status: blocked
Blocking condition: dependency Story 1.3 (Judge Recovery Contract and Offline Verifier) is not done — its evidence-v2 verifier, closed predicate list, and candidate-bound JudgeResult contract do not exist in the repository, and Story 1.4's ACs 1 and 3 are defined in terms of them. Sprint status shows 1-3 as in-progress (legacy carry-over) and the loop dispatched 1-4 past it. No code was changed; working tree left clean at HEAD a757497775b6feca89728612136dca83767202e0.
