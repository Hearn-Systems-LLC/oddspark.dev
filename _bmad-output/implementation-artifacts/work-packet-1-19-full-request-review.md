# Work Packet — Story 1.19 Local Full-Request Qualification harness (code review)

## Outcome
Independently review the Story 1.19 offline implementation in this worktree. You did not write this code and have no access to the implementer's reasoning; judge only the diff, the authoritative artifacts, and live command evidence. Return a verdict: `approve`, or `changes-requested` with findings classified `intent_gap | bad_spec | patch | defer | reject` with severity.

## Authoritative inputs (read first, in this order)
1. `_bmad-output/implementation-artifacts/spec-1-19-local-full-request-qualification.md` — the story contract (note its change log: governor-approved assembly identity move to `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2`).
2. `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-24-4.md` — the approved direct-path rescoping.
3. `_bmad-output/implementation-artifacts/work-packet-1-19-full-request-dev.md` — the development scope, including both governor authorizations (PIPELINE_JUDGE wiring; approved-priors stale-fixture class).
4. `_bmad-output/implementation-artifacts/handoff-1-19-full-request-dev.md` — the implementer's terminal claim (testimony, not evidence).

## Changed surface under review
- New: `spikes/local-full-request-qualification/` (contract, governance, run, start-adapter, worker, publication, verifier, verify, test, README, one unapproved plan bundle).
- Modified: `src/pipeline/production-ports.mjs` (closed PIPELINE_JUDGE descriptor only), `runtime-assembly.json` (re-freeze), `package.json` (scripts only), `test.mjs`, `scripts/local-priors.test.mjs`, `scripts/local-evidence.test.mjs`.
- Preserved pre-existing dirt (not part of the change, do not review as new work): `_bmad-output/implementation-artifacts/epic-1-context.md`, `content/local-priors/v1/approval.json` (Justin's owner approval — authority, not code).

## Review obligations
- Verify every spec acceptance criterion and I/O-matrix row has implementing code AND adversarial test coverage (zero-call refusal, identity mismatch, over-cap, unbound judge call, missing commit reserve, coordinator uncertainty, deterministic rejection zero-judge, house-never-judged, ambiguous attempts, tamper, locks, chronology, CI/live-entrypoint isolation).
- Verify no live authority leaked: the plan retains approval/execution null and allowance_consumed false; no checked-in Wrangler config; no live entrypoint reachable from `check`/CI; no provider call evidence anywhere.
- Verify the stale-fixture updates strengthened rather than weakened: pending/drift/malformed coverage preserved via synthesized records; checked-in assertions bind the exact approved priors identity `2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded`.
- Verify scope discipline against the dev packet: anything outside the allowed writes is a finding.
- Hunt adversarially: fail-open paths in the runner/verifier, allowance consumption before durable call-start, publication that trusts the runner, identity checks that can be bypassed, judge descriptor that could activate without a manifest.

## Validation (run these yourself; do not trust the handoff)
`npm test`, `npm run spike:full-request:self-test`, `npm run local-priors:test`, `node --test scripts/local-evidence.test.mjs`, `npm run assembly:verify`, `git diff --check`. `npm run check` has exactly one known governed residual (DW-6, unchanged `spikes/judge-fidelity/test.mjs:1134`) — confirm it is the only failure and its source is unmodified.

## Boundaries
- Read-only review: do not modify, commit, push, deploy, or call any provider. Work only in this worktree.
- Do not review deferred-work.md, sprint-status.yaml, or other spikes' pinned evidence.

## Terminal handoff
Write `_bmad-output/implementation-artifacts/handoff-1-19-full-request-review.md` with: verdict, findings (classified + severity), the exact commands you ran with results, and any spec ambiguity that needs owner intent. Stop when written.
