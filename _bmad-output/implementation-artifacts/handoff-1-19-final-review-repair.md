# Story 1.19 Final-Review Repair Handoff

## Terminal Status

- **Status:** `done`
- **Baseline:** `ba42945f0ab95593859737126d4f88d171d111bf`
- **Resulting commit SHA:** recorded by `git rev-parse HEAD` immediately after the atomic commit and reported in the terminal delivery; a commit cannot contain its own content-addressed SHA.
- **Story status:** `in-progress` pending fresh exact-plan approval, live qualification, and final independent review.

## Files Changed

- `src/pipeline/contracts.mjs` — restrict the Title-Case allowance to lexical headline shapes whose words are Title Case or recognized lowercase headline connectors.
- `scripts/brief-contracts.test.mjs` — add the exact Taylor Morgan regression and punctuation-free, question-form, and introductory-clause mutations while retaining approved headline fixtures.
- `runtime-assembly.json` — repository-generated freeze for the repaired 17-module canonical assembly.
- `spikes/local-full-request-qualification/contract.mjs` — bind plan validation to the newly frozen assembly identity (explicit scope expansion authorized by Justin).
- `spikes/local-full-request-qualification/worker.mjs` — bind the public qualification adapter boundary to the newly frozen assembly identity (explicit scope expansion authorized by Justin).
- `spikes/local-full-request-qualification/test.mjs` — exercise the public adapter and synthetic verifier against the fresh plan without changing historical plan bytes.
- `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-5ef8222e-unapproved.plan.json` — fresh isolated-history exact plan for the repaired assembly.
- `_bmad-output/implementation-artifacts/spec-1-19-local-full-request-qualification.md` — record both accepted findings and resolutions, replace stale normative identity text, preserve old live evidence as non-promotable history, append the repair change log, and keep status `in-progress`.
- `_bmad-output/implementation-artifacts/handoff-1-19-final-review-repair.md` — this terminal record.

## Behavior Before and After

- **Before:** `personalNamePolicy("Ask Taylor Morgan to review each answer.")` returned `pass` because the sentence began with a capitalized word and contained three capitalized tokens. `npm run house-briefs:test` failed because the public catalog boundary accepted the mutated Brief.
- **After:** the exact regression and nearby mutations return `unknown`; the public catalog boundary rejects the mutation fail-closed. Approved headline cases `Plan Your Week in Ten Minutes`, `Summer Handoff Bridge`, and `Get Things Done Before Noon` continue to return `pass`.

## Assembly and Historical Evidence

- **Old flawed assembly:** `39f24a833694d50007ea5be41602b56ed492410bb458406ac6bd817167054743`.
- **New repaired assembly:** `7971844c5779fe1a435970eef522cd2c23f9b7c121708f6675299e58aff96ed6` over 17 runtime-neutral modules.
- Existing approvals, receipts, evidence, reports, markers, and plans for the old assembly were not modified. The retained `LOCAL-FULL-REQUEST` evidence for the old assembly remains immutable historical evidence and is not promotable.

## Fresh Exact Plan

- **Path:** `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-5ef8222e-unapproved.plan.json`
- **SHA-256:** `a77bfb8a3a933fd279ddff03d722fd1daee12ef4704d36e7a2beb49ba7dcba7d`
- **Run ID:** `5ef8222e-27e2-4d48-95f9-761991155e19`
- **Caps:** route `120000 ms`; commit reserve `1000 ms`; provider timeout `19833 ms`; `6` calls; `3` attempts; maximum `$0.06`.
- **Posture:** `status: unapproved`; `approval: null`; `execution: null`; `allowance_consumed: false`.

## Verification Results

| Command | Exit | Result |
|---|---:|---|
| `node --test scripts/brief-contracts.test.mjs` | 0 | PASS, 16/16 including exact regression and nearby mutations |
| `npm run house-briefs:test` | 0 | PASS, 17/17; public catalog boundary rejects the regression |
| `npm run brief-contracts:test` | 0 | PASS, 16/16 |
| `npm test` | 0 | PASS, 103/103 |
| `npm run spike:full-request:self-test` | 0 | PASS, 27/27 after fresh-plan fixture and adapter identity reconciliation |
| `npm run assembly:freeze` | 0 | PASS, froze `7971844c…` over 17 modules |
| `npm run assembly:verify` | 0 | PASS, exact identity match over 17 modules |
| `npm run writer:preflight` | 0 | PASS, all 9 checks; zero remote resources created, modified, or deleted |
| `npm run check` | 1 | Expected unchanged governed DW-6 residual only: judge self-test `owner-reviewed and prompt-superseded cycles are immutable history; unreviewed spend still blocks planning`, error `prior operational recovery already retained: null` |
| `npm run spike:judge:self-test` | 1 | Reproduced the exact unchanged DW-6 residual after all preceding cases passed |
| `CI=1 node .github/check-ci.mjs` | 0 | PASS after permitting Wrangler local log writes and loopback binding; no remote mutation |
| `git diff --check` | 0 | PASS |
| protected-path diff check from `ba42945…` | 0 | PASS, zero protected paths changed |
| exact plan validation/posture assertion | 0 | PASS, valid fresh plan with null approval/execution and unconsumed allowance |

The initial sandboxed CI attempt encountered Wrangler-only `EPERM` errors writing its local debug log and binding `127.0.0.1`; the authorized local-permission rerun passed with exit 0.

## Scope and Remote-Mutation Confirmation

- `sprint-status.yaml`, deferred-work ledgers, `src/pipeline/activation.mjs`, `src/worker.js`, production/deployment configuration, content authority, historical approvals/results, and unrelated work were not modified.
- Untracked `node_modules`, the final-surface review handoff, and unrelated work packets were preserved and excluded from the commit.
- Zero provider calls, inference calls, spend, adapter starts, deployments, activations, pushes, merges, branch deletions, history rewrites, or other remote mutations occurred.

## Remaining Authority Boundary

The fresh plan has no live authority. Justin must separately approve its exact bytes, SHA-256, run ID, caps, retention, and schedule before any adapter start or provider call. After a fresh governed live qualification, Story 1.19 still requires final independent review. Subject to those human/live gates, this branch is ready for fresh independent review of the repair.
