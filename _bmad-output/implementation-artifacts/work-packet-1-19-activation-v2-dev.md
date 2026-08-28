# Work Packet — Activation Manifest v2 (development)

## Outcome
Implement `ProductionActivationManifest` v2 in `src/pipeline/activation.mjs` per the approved `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-24-4.md` (read it first; it is the authority):
- Remove `semantic_ref` from the closed key set and the SHA check. Closed keys become: `version, deployed_source_identity, generation_ref, judge_ref, local, domain, house_catalog_ref, receiver_ref, receipt_claim_ref, outcome`.
- `PRODUCTION_ACTIVATION_VERSION = 2`; hash domain `oddspark-production-activation/v2`.
- A manifest carrying `semantic_ref`, or `version: 1`, must reject (`activation_manifest_not_closed` / `activation_manifest_version`).
- Update the header comment to name the 2026-08-24 override.
- Update tests in `test.mjs` (around line 382) and any fixtures; add explicit tests that a v1-shaped manifest with `semantic_ref` rejects and that v2 without it validates and derives a ref under the v2 domain.
- Refreeze the runtime assembly identity (`npm run assembly:freeze`) since `activation.mjs` bytes change; record the new identity in `_bmad-output/implementation-artifacts/spec-1-23-worker-runtime-assembly.md` under a dated evidence note.

## Worktree and scope
- Work only in this worktree: `.bmad-governor/worktrees/1-19-direct-path-activation-authority` (branch `governor/1-19-direct-path-activation-authority`).
- Allowed writes: `src/pipeline/activation.mjs`, `test.mjs`, assembly identity artifacts written by `npm run assembly:freeze`, `_bmad-output/implementation-artifacts/spec-1-23-worker-runtime-assembly.md`, and this packet's handoff file.
- Forbidden: `sprint-status.yaml`, `wrangler*.toml`, `.github/`, `.env*`, any planning artifact (already edited and present uncommitted in this worktree — leave them as-is), any other `src/` or `scripts/` file unless a test failure proves it is required (then report why).
- Do NOT commit, push, deploy, call any provider, or mutate remote state. Leave changes uncommitted.

## Validation gates (all must pass)
`npm test`, `npm run check`, `CI=1 node .github/check-ci.mjs`, `git diff --check`.

## Terminal handoff
Write `_bmad-output/implementation-artifacts/handoff-1-19-activation-v2-dev.md` with: status (`done`|`blocked`), files changed, new assembly identity, exact commands run with pass/fail counts, and any deviation from this packet. Stop when it is written. Stop and report `blocked` instead of widening scope if the gates cannot pass within the allowed writes.
