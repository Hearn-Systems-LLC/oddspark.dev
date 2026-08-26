# Work Packet — Story 1.26 Stage 2 historical-spend recovery (development)

## Authorized outcome

From clean `develop` baseline `f877474389151f6e5dc9bbce8b006e12ad1abb0b`, equal to refreshed `origin/develop`, reconcile Story 1.26 authority and the existing judge-cycle recovery architecture, then implement the narrowest sufficient fail-closed historical-spend recovery contract. Leave the packet uncommitted and stop for independent review.

Owner authorization, verbatim:

> I authorize preparation and independent review of the Stage 2 historical-spend recovery packet.

This authorizes offline preparation and independent review only. It does not authorize a live approval, adapter start, live runner/provider invocation, allowance consumption, deployment, signing, activation, commit, push, secret/config mutation, or Stage 3.

## Governing facts and required contract

The exact Stage 2 r2 live attempt stopped before approval creation, adapter start, runner invocation, provider call, or file change because `findPriorOperationalRecovery` found retained `.judge-llama-cycle-spend.json` evidence for completed attempt `f543d3d5-80d4-44f6-b7bf-41083197fcc9`, run `ba52ec91-fe85-4987-954d-71054a0acc3d`, 42 calls. The existing `--offline-requalification` exception permits plan disclosure only and grants no execution authority. Preserve every historical receipt/evidence byte. Never delete, rename, edit, conceal, supersede without evidence, or classify those bytes as zero-call.

Implement the smallest contract which:

- cryptographically identifies and validates a terminal completed historical spend/evidence set and its exact invocation/run/attempt/call/cost state;
- distinguishes closed historical spend from incomplete, active, ambiguous, corrupt, mismatched, or unverifiable invocation state; every non-closed state remains blocking;
- preserves the historical receipt as a durable audit fact and never resets cumulative accounting;
- permits only offline creation of a new, distinct, unapproved plan after the historical invocation is proven terminal and closed;
- permits later live execution only when a newly reviewed plan and fresh exact owner approval bind the new plan/run, the historical-closure reference, call/cost cap, source/runtime identities, zero retries/replacements, and exactly one runner invocation;
- cannot authorize reuse of r2, approval backdating or transfer, adapter/provider diagnostics, retries, replacements, second invocation, or bypass of an active/ambiguous receipt;
- maintains atomic create-only artifacts, locks, canonical JSON, retained arbitrary bytes, allowance/spend accounting, and crash-safe fail-closed recovery;
- exposes adversarial public-boundary tests for mutation, replay, missing members, stale/mismatched identities, ambiguous spend, partial artifacts, symlink/path issues where relevant, concurrent runs, and authority-order failures.

## Authority to read first

- `_bmad-output/implementation-artifacts/spec-1-26-atomic-local-only-activation.md`
- `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md`
- `_bmad-output/implementation-artifacts/handoff-story-1-26-stage2-r2-offline-plan.md`
- `_bmad-output/implementation-artifacts/handoff-story-1-26-stage2-r2-offline-plan-review.md`
- existing judge-fidelity recovery source, tests, fixtures, predicates, plans, receipts, evidence, and documentation under `spikes/judge-fidelity/`

Use the repository codebase-memory MCP graph tools for code discovery before grep/file search, as required by AGENTS.md. Direct reads of known authority artifacts and literal/error searches are fine.

## Worktree, write scope, and preservation

Work only in `/Volumes/fast/Github/oddspark` on `develop`. Confirm HEAD and `origin/develop` remain the exact baseline above before editing. Preserve unrelated work and stop if the baseline or boundary diverges.

Allowed writes, only when demonstrably necessary:

- the smallest existing judge-fidelity recovery implementation/test/doc surface under `spikes/judge-fidelity/**`;
- one explicit historical-spend recovery contract artifact under `_bmad-output/implementation-artifacts/`;
- `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md`;
- `_bmad-output/implementation-artifacts/handoff-story-1-26-stage2-historical-spend-recovery.md`;
- this work packet only if a factual terminal note is needed.

Forbidden writes/actions:

- any historical receipt/evidence/result byte except creation of new, distinct recovery artifacts explicitly required by the contract;
- `sprint-status.yaml`, deferred-work ledgers, other protected bookkeeping, `.env*`, secrets, credentials, `wrangler*.toml`, `.github/**`, production `src/**`, runtime/baseline assemblies unless the task is genuinely blocked without an authority expansion;
- creating a new live approval, starting any adapter, invoking any live runner/provider, consuming allowance, deploying, signing, activating, committing, pushing, changing secrets/config, or executing Stage 3.

Do not generate a new offline plan during this development packet unless the implemented public offline boundary itself must be exercised with temp-only synthetic inputs. The handoff must state whether a real new offline plan must be generated after the eventual commit. Never reuse or mutate r2.

## Implementation and verification discipline

Favor a direct closed schema and independent verifier over broad architecture. Retain arbitrary member bytes and bind their exact SHA-256 and lengths. Make all new durable artifacts canonical JSON, atomic create-only, and collision/symlink safe. Keep cumulative spend historical plus any future plan allowance; closed history is not a fresh zero balance.

Tests must exercise public executable boundaries and adversarial mutations, not only helpers/fixtures. Include authority-order assertions proving closure validation occurs before any approval creation, adapter/provider diagnostic, runner invocation, allowance reservation, or live side effect.

Run and record exact results for:

- focused historical-spend recovery tests;
- `npm run spike:judge:self-test` including all judge self-tests, shared fixtures, and predicates;
- `npm run baseline:verify`;
- `npm run assembly:verify`;
- repository tests proportionate to risk (at minimum `npm test`; run `npm run check` unless a precisely evidenced environment-only blocker exists);
- `git diff --check`;
- an exact changed-path and forbidden-boundary audit, including proof that historical receipt/evidence bytes are unchanged.

Tests must remain offline and must not start an adapter or call a provider.

## Terminal handoff

Write `_bmad-output/implementation-artifacts/handoff-story-1-26-stage2-historical-spend-recovery.md` containing:

- status (`done` or `blocked`);
- exact contract and authority ordering;
- every changed/created file;
- exact commands and pass/fail counts;
- exact historical invocation/run/attempt/call/cost closure reference and cryptographic bindings, with no secret material;
- preservation evidence for every historical receipt/evidence byte in scope;
- residual risks and any untested boundary;
- an explicit answer whether a new offline plan must be generated after commit;
- confirmation of zero live approvals, adapter starts, runner/provider calls, allowance consumption, deployment, signing, activation, commits, pushes, secret/config changes, and Stage 3 actions during this packet.

Stop when the handoff is complete. Do not commit. If the contract requires authority or writes beyond this packet, stop `blocked` with exact evidence rather than widening scope.
