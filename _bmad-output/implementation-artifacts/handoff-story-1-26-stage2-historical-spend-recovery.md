# Story 1.26 Stage 2 historical-spend recovery — development handoff

Date: 2026-08-26
Status: **done — uncommitted; stop for independent review**

## Baseline and scope

- Branch: `develop`.
- `HEAD`: `f877474389151f6e5dc9bbce8b006e12ad1abb0b`.
- `origin/develop`: `f877474389151f6e5dc9bbce8b006e12ad1abb0b`.
- The repository codebase-memory graph tools required by `AGENTS.md` were not exposed in this session. Direct reads of the named authority artifacts were completed first; discovery then used the permitted literal/file-search fallback.
- No commit or push was made.

## Contract and authority ordering

`oddspark.judge-historical-spend-closure/v1` independently reconstructs one exact terminal historical set from retained bytes. It requires a canonical `completed-spent` receipt, the exact 42-record evidence, matching Markdown, qualification bundle, completion marker, call cardinality/order, complete per-model usage, terminal `cycle_available:false`, and exact member byte lengths/SHA-256 values. Anything missing, partial, active, reserved, called-incomplete, corrupt, mismatched, replayed, aliased through a symlink, cost-ambiguous, or otherwise unverifiable remains blocking.

Authority order at the public executable boundary is:

1. Validate the historical closure and all retained member bytes.
2. Offline only: permit creation of a distinct unapproved successor plan whose new run ID differs from the closed historical run and whose canonical plan bytes bind the closure ref, historical invocation, cumulative calls/cap, source/runtime/request identities, zero reset, zero retries/replacements, and one successor allowance.
3. Stop for independent review and fresh exact owner approval.
4. On a later live attempt, validate closure before approval-file loading, allowance reservation, adapter health/diagnostics, runner invocation, or provider work.
5. Require the newly reviewed plan plus a fresh approval binding its exact plan ref/run ID, closure ref, identities, 42-call / `$0.3054702` successor cap, zero retries/replacements, and exactly one runner invocation.
6. Use a distinct successor receipt; the historical receipt remains in place and cumulative accounting never resets.

The former `--offline-requalification` planning exception alone no longer bypasses retained spend. It cannot authorize reuse of r2, approval transfer/backdating, diagnostics, retries, replacements, a second invocation, or an active/ambiguous receipt bypass.

## Historical closure reference and accounting

- Closure ref: `e827240fbc244ac2f526d32eef3cc01e785ddda40a79fe5d2d9f0b251f22d066`.
- Attempt: `f543d3d5-80d4-44f6-b7bf-41083197fcc9`.
- Approval run: `ba52ec91-fe85-4987-954d-71054a0acc3d`.
- Calls: exactly 42; one runner invocation; zero retries; zero replacements.
- Historical accounting: cumulative 42 calls; exact computable observed 70B cost `$0.032631059999999996`; selected 8B endpoint explicitly unpriced with complete usage; conservative full historical cap `$0.3054702` / `27770.018181818185` neurons; reset forbidden.
- Historical source identity: `76ff7f8a39d4552239b34c180fe9db0fcfc53b26f8d2e548795600c94b9ccec1`.
- Historical runtime identity: `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.
- Historical plan ref: `f60cd95a2f5c52b832665bb21d9631612cd5c1eed14e2613909b9b37d75ede1f`.

Exact retained bindings:

| Member | Bytes | SHA-256 |
|---|---:|---|
| `.judge-llama-cycle-spend.json` | 490 | `1047984cea40d0432df2e2e2d3fd98f8ddda7788e24ea88889f5bc5f4993312e` |
| `2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-v2.json` | 242317 | `051d5c7072d99a31de583b854cff6f1d3639b4ab113d472727d38d50c46abf75` |
| `2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-v2.md` | 3387 | `6e473cedd57f67078e95e3923edb6880e0aa5e231acf3a52eeffa6bb9e2ab259` |
| `2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-qualification.json` | 84028 | `5456d91ae2154e7edf0dc1b48576cbdc59433dd106351478fdd9ff3243b1549b` |
| `2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-v2.complete.json` | 832 | `80b6bddf3dc844494c8f19f93c293379c198ce032331a95ff77369eeb58e7d31` |

`git diff --quiet HEAD -- <each member>` passed for all five. No successor spend receipt, recovery lock, or result-directory temporary artifact exists.

## Changed and created files

Modified:

- `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md`
- `spikes/judge-fidelity/README.md`
- `spikes/judge-fidelity/evidence-v2.mjs`
- `spikes/judge-fidelity/qualification.mjs`
- `spikes/judge-fidelity/recovery-finder.mjs`
- `spikes/judge-fidelity/run.mjs`
- `spikes/judge-fidelity/test.mjs`

Created:

- `_bmad-output/implementation-artifacts/contract-story-1-26-stage2-historical-spend-recovery.md`
- `_bmad-output/implementation-artifacts/story-1-26-stage2-historical-spend-closure.json`
- `_bmad-output/implementation-artifacts/handoff-story-1-26-stage2-historical-spend-recovery.md`
- `spikes/judge-fidelity/historical-spend.mjs`

The pre-existing untracked work packet `_bmad-output/implementation-artifacts/work-packet-story-1-26-stage2-historical-spend-recovery-dev.md` remains present and was not modified by implementation.

No forbidden path changed: no historical result/receipt/evidence member, `sprint-status.yaml`, deferred-work ledger, `.env*`, secret/credential file, `wrangler*.toml`, `.github/**`, production `src/**`, runtime/baseline assembly, or other protected surface changed.

## Verification

- `npm run spike:judge:self-test` — **PASS: 85/85 tests, 79/79 shared fixtures, 18/18 evidence predicates**. Includes public executable authority-order failures; closure mutation/replay/open fields; missing member; active receipt; symlink alias; create-only collision/concurrency; distinct synthetic temp-only successor plan; existing recovery locks, crash retention, called-incomplete publication, and one-invocation behavior. No real plan was generated.
- `npm run baseline:verify` — **PASS: 1/1**, runtime identity `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.
- `npm run assembly:verify` — **PASS: 1/1**, assembly identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`, 18 modules.
- `npm test` — **PASS: 108/108**.
- `npm run check` — **PASS: all 22/22 configured offline command gates** using the completed full-check evidence. A later sandboxed duplicate reached `check:types` and failed only with Wrangler `listen EPERM 127.0.0.1`; a requested escalated duplicate was stopped and not rerun, per owner direction. Neither attempt contacted a provider or started the judge adapter.
- `git diff --check` — **PASS: 0 errors**.
- Exact changed-path/forbidden-boundary audit — **PASS: 11 implementation/handoff paths plus the unchanged pre-existing work packet; 0 forbidden paths**.
- Historical-byte preservation audit — **PASS: 5/5 retained members byte-identical to `HEAD`; exact hashes above**.

## Residual risks and untested boundaries

- Independent adversarial review of this uncommitted packet is still required.
- By scope, no real successor plan, approval, adapter, or live runner/provider execution was created or exercised. Public live closure ordering is tested with synthetic/temp-only inputs; the real later live path remains intentionally untested until a committed packet, a newly generated and reviewed plan, and fresh exact owner approval exist.
- The selected 8B endpoint's exact dollar price remains unavailable. The closure truthfully retains it as unpriced and uses the conservative historical cap; it is not treated as zero.
- The codebase-memory MCP graph was unavailable, so discovery used the expressly permitted fallback.

## Required next action

**Yes. A real new offline successor plan must be generated after the eventual commit.** It must be distinct from r2, bind the committed source identity and this historical closure, then receive independent review and a fresh exact owner approval before any live execution is considered. r2 must never be reused or mutated.

## Negative-action confirmation

During this packet there were exactly zero live approvals created, adapter starts, live runner invocations, provider calls, allowance consumption, deployments, signatures, activations, commits, pushes, secret/config changes, and Stage 3 actions.
