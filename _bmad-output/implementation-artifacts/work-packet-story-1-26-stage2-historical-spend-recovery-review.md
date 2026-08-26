# Review Packet — Story 1.26 Stage 2 historical-spend recovery

## Role and outcome

Perform an independent adversarial code/contract review of the uncommitted Story 1.26 Stage 2 historical-spend recovery packet in `/Volumes/fast/Github/oddspark`. You are the reviewer, not the implementer. Do not inherit or seek the developer's reasoning; inspect the actual diff, authority artifacts, retained evidence, public executable boundaries, and test evidence yourself.

Owner authorization, verbatim:

> I authorize preparation and independent review of the Stage 2 historical-spend recovery packet.

Return `APPROVE` only if the packet is narrow, fail-closed, preserves every historical byte, and proves the exact public authority ordering. Otherwise return `CHANGES_REQUIRED` with concrete, reproducible findings. This review grants no live authority.

## Baseline and governing authority

- Expected branch/baseline: clean committed `develop` at `f877474389151f6e5dc9bbce8b006e12ad1abb0b`, equal to `origin/develop`, plus only the uncommitted packet under review.
- Read first:
  - `_bmad-output/implementation-artifacts/spec-1-26-atomic-local-only-activation.md`
  - `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md`
  - `_bmad-output/implementation-artifacts/contract-story-1-26-stage2-historical-spend-recovery.md`
  - `_bmad-output/implementation-artifacts/handoff-story-1-26-stage2-historical-spend-recovery.md`
  - this review packet
- Inspect the full tracked and untracked changed surface, especially `spikes/judge-fidelity/historical-spend.mjs`, `run.mjs`, `qualification.mjs`, `recovery-finder.mjs`, `evidence-v2.mjs`, tests, and the closure JSON.
- Use codebase-memory MCP graph tools first for code discovery if exposed, as required by AGENTS.md; use direct reads and literal/file-search fallbacks when unavailable.

## Historical facts that must remain immutable

The retained historical receipt is `spikes/judge-fidelity/results/.judge-llama-cycle-spend.json`, completed attempt `f543d3d5-80d4-44f6-b7bf-41083197fcc9`, approval run `ba52ec91-fe85-4987-954d-71054a0acc3d`, exactly 42 calls. The exact retained set asserted by the handoff is:

- receipt: 490 bytes, SHA-256 `1047984cea40d0432df2e2e2d3fd98f8ddda7788e24ea88889f5bc5f4993312e`;
- evidence JSON: 242317 bytes, SHA-256 `051d5c7072d99a31de583b854cff6f1d3639b4ab113d472727d38d50c46abf75`;
- Markdown: 3387 bytes, SHA-256 `6e473cedd57f67078e95e3923edb6880e0aa5e231acf3a52eeffa6bb9e2ab259`;
- qualification JSON `2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-qualification.json`: 84028 bytes, SHA-256 `5456d91ae2154e7edf0dc1b48576cbdc59433dd106351478fdd9ff3243b1549b`;
- completion marker: 832 bytes, SHA-256 `80b6bddf3dc844494c8f19f93c293379c198ce032331a95ff77369eeb58e7d31`.

Independently verify those hashes, sizes, and `git diff` immutability. Any mutation, rename, deletion, concealment, zero-call classification, accounting reset, or unbound supersession is critical.

## Adversarial review questions

Review the exact outer/public boundaries, not helper claims alone:

1. Does closure construction independently prove a terminal completed historical set, exact invocation/run/attempt/calls/cost state, canonical JSON, exact arbitrary member bytes, source/runtime/plan identities, and terminal completion? Does it reject active, incomplete, ambiguous, corrupt, mismatched, replayed, missing, or unverifiable state?
2. Is create-only publication atomic and crash-safe under collision, concurrent writers, symlink/path aliases, partial temp artifacts, and verification failure? Can any failure leave a misleading valid-looking closure?
3. Does offline planning require a verified closure, a genuinely distinct successor run, and no r2 reuse? Can `--offline-requalification`, injected dependencies, direct exported calls, alternate CLI flags, approval transfer/backdating, or stale identities bypass it?
4. At the real public live command, does closure verification happen before approval-file reading/parsing, adapter diagnostics or health, allowance/receipt reservation, runner invocation, provider call, retry/replacement, or any side effect? Probe the injected/test seams for fail-open behavior that could leak into production.
5. Does a later approval bind the exact new plan/ref/run, closure ref and historical identities, fresh source/runtime/request identities, caps, zero retries/replacements, and exactly one runner invocation? Is cumulative spend represented as history plus future allowance, never reset?
6. Does the successor use a distinct receipt while all active/ambiguous prior or successor receipts remain blocking? Can recovery finder selection/order conceal either receipt or allow a second invocation?
7. Are the 85 judge tests truly public-boundary/adversarial and sufficient for mutation, replay, missing members, stale/mismatched identities, ambiguous spend, partial artifacts, symlink/path issues, concurrency, crashes, and authority order? Identify helper-only assertions or untested executable paths.
8. Is the change surface the smallest sufficient design and limited to authorized paths? No production source/config, secret, protected ledger, historical result, commit, push, provider, adapter, deployment, signing, activation, or Stage 3 action is permitted.

Pay particular attention to any test-only bypass keyed merely on dependency presence (for example `Object.hasOwn(dependencies, ...)`), the distinction between verified closure truth and caller-injected truth, filename/member-set binding, hard-link/fsync semantics, exact cost representation, and whether the closure artifact is reproducible from retained bytes without trusting itself.

## Verification

Run at minimum:

- focused/relevant judge self-tests or exact narrower tests sufficient to validate findings;
- `npm run spike:judge:self-test` if environment/time permits;
- `npm run baseline:verify` and `npm run assembly:verify`;
- `npm test` proportionate to disputed risk;
- `git diff --check`;
- exact tracked/untracked changed-path audit and five-member byte-preservation audit.

All verification is offline. Do not start an adapter, invoke a live runner/provider, consume allowance, deploy, sign, activate, commit, push, change secrets/config, or execute Stage 3.

## Write scope and terminal handoff

The review is read-only except that you must write exactly one review record:

`_bmad-output/implementation-artifacts/handoff-story-1-26-stage2-historical-spend-recovery-review.md`

That record must contain:

- verdict `APPROVE` or `CHANGES_REQUIRED`;
- findings ordered by severity, with exact file/line or public-command evidence and reproduction steps;
- authority/byte-preservation/boundary audit results;
- commands run and exact outcomes;
- residual risks;
- explicit confirmation that review performed zero live approvals, adapter starts, runner/provider calls, allowance consumption, deployments, signatures, activations, commits, pushes, secret/config changes, and Stage 3 actions.

Do not modify implementation. Stop after writing the review handoff.
