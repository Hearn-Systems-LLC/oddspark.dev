# Work Packet — Activation Manifest v2 (independent code review)

You are an independent reviewer. You have NOT seen the implementer's reasoning; judge only the artifacts.

## Authority
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-24-4.md` (approved by Justin, 2026-08-24) — the intent this change must implement.
- Story 1.20 / 1.26 acceptance criteria and the spine's "Activation authority under this override" paragraph as they now read in this worktree.

## Under review (uncommitted, in this worktree)
`git diff` — also saved at `_bmad-output/implementation-artifacts/review-diff-1-19-activation-v2.patch`. Code surface: `src/pipeline/activation.mjs`, `test.mjs`, `runtime-assembly.json`, Story 1.23 spec evidence note. Planning artifacts changed by the approved proposal are in scope for an intent-consistency check only.

## Evidence supplied (verify, do not trust)
`npm run check` passed; governed `CI=1 node .github/check-ci.mjs` passed (6 pass, 2 intentional live-only skips); `git diff --check` clean; assembly identity `446628799d96f044ea9f5bdb48d01477559b97c96ec15b58b676cf06f99307a5`. Re-run `npm test`, `npm run assembly:verify`, and `git diff --check` yourself.

## Review questions (answer each with evidence)
1. Does v2 reject every v1-shaped manifest (any `semantic_ref` key, `version: 1`) and accept only the closed v2 key set? Try to construct a manifest that validates but should not, or vice versa.
2. Is the hash domain `oddspark-production-activation/v2` used and asserted, so no v1 bytes can derive a v2 `activation_ref`?
3. Do the epics/spine/PRD edits contain any remaining active requirement for a semantic ref, specialist waterfall, or twelve-call ledger that would contradict the code? Cite line numbers.
4. Anything out of scope, unsafe, or that mutates protected files (`sprint-status.yaml`, `wrangler*.toml`, `.github/`, `.env*`)?

## Rules
Read-only review: do not edit source, planning artifacts, or protected files. No commit, push, provider call, deploy, or activation. Write your findings to `_bmad-output/implementation-artifacts/handoff-1-19-activation-v2-review.md` with: verdict (`approve`|`request-changes`), findings ordered by severity with file:line and a concrete failing scenario for each, and the exact commands you ran with results. Stop when written.
