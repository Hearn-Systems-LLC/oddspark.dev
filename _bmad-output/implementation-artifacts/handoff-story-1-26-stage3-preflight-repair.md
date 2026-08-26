# Story 1.26 Stage 3 preflight repair handoff

Date: 2026-08-26
Baseline: `develop` at `becb571f63a04a3c0d2f5392f8c67d9c232d24ea`
Status: **REPAIR COMPLETE / SUCCESSOR UNAPPROVED / STOPPED FOR INDEPENDENT REVIEW**

## Authority and safety

Authority was `handoff-story-1-26-stage3-live-preflight-review.md`. Retired plan
`95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9`
(run `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`) was not modified, retried,
resumed, approved, or executed.

Repair counts: live approvals `0`; adapter starts `0`; runner invocations `0`;
attempts `0`; provider calls `0`; usage `0`; cost `$0`; allowance consumed
`false`; deployments, activations, signatures, key rotations, and remote
mutations `0`.

## Changed files

- `spikes/local-full-request-qualification/worker.mjs`
- `spikes/local-full-request-qualification/contract.mjs`
- `spikes/local-full-request-qualification/approval-creator.mjs` (new)
- `spikes/local-full-request-qualification/test.mjs`
- `spikes/local-full-request-qualification/README.md`
- `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-d55480bb-unapproved.plan.json` (new; only successor)
- `package.json` (one approval script)
- `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md`
- `_bmad-output/implementation-artifacts/handoff-story-1-26-stage3-preflight-repair.md` (new)

No production `src/**`, runtime assembly module/identity, existing retained
plan/result/approval/receipt bytes, status/deferred ledger, Wrangler/config,
secret, deployment, signing, or activation file changed. No commit or push.

## Repair

1. Worker health and authorization now consume `runtime-assembly.json`; the
   current-plan contract consumes the same source. `assembly:verify` proves
   identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`
   over 18 runtime-neutral modules. Exact identity equality remains enforced.
2. `npm run spike:full-request:approve` is offline and noninteractive. It
   requires all and only explicit owner metadata/timestamps, decision, plan SHA,
   and run ID; validates canonical unapproved plan bytes; writes canonical
   `oddspark.local-full-request-approval/v1` bytes; confines safe basenames under
   `plans/`; refuses symlinks, traversal, and overwrite; and has no provider,
   adapter, network, or process-spawn path.
3. Activation v2 uses an operator-held Ed25519 signature and operator-selected
   public trust-key map. No authorized production key map is committed, so no
   agent-safe values could be assembled without inventing authority. Exact valid
   JSON values for `LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT` and
   `LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS` remain the fail-closed operator
   gate. They are live preflight inputs outside plan identity; the plan binds
   activation version `2`.

## Successor plan

- Path: `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-d55480bb-unapproved.plan.json`
- SHA-256/ref: `4b8cb7d1c7d2b7e2002d5851bb1fc03053c3cdb87a7590ce79e94b3a5caa92ac`
- Run: `d55480bb-601d-425c-be6b-5c33cdd66033`
- Assembly: `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`
- Generation ref: `cf602f143373958591b7a4954ec2ebe951160af45fa0fc45802eb0d96030f90c`
- Generation role ref: `0473102c40734947c91e8c605e6ae8e03b1e895a8c5b18867a9579dbb6abe514`
- Judge ref: `64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799`
- Caps: six calls, three attempts, `$0.06`, route `120000` ms, reserve `1000` ms, provider timeout `19833` ms
- State: unapproved; approval/execution null; allowance false; calls zero

## Validation

- `npm run spike:full-request:self-test`: PASS, 33/33.
- `npm run assembly:verify`: PASS, 18 modules.
- `npm run baseline:verify`: PASS,
  `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.
- `npm run check:config`: PASS.
- `npm run writer:preflight`: PASS offline/no remote resources.
- `npm run check`: PASS after a local-permission rerun; the sandboxed attempt
  reached `check:types` and failed only on Wrangler local log/loopback `EPERM`.
- Public plan/approval verification, immutable retained-byte audit,
  `git diff --check`, exact changed paths, and listener/lock/process checks:
  PASS. Public retained verifier reported `LOCAL-FULL-REQUEST evidence PASS`;
  successor canonical validation recomputed the exact hash and null/false state;
  all 74 tracked retained plan/result files matched their `HEAD` bytes;
  `git diff --check` passed; exactly the nine paths listed above are changed or
  new; ports 8787/8788 have no listeners; no qualification/cycle lock exists;
  and the process audit found no adapter, runner, or Wrangler dev child (the
  active Codex control process contains the work-packet text only).

## Next exact gate

Independent review must inspect the diff, rerun offline gates, and recompute the
successor hash. No approval exists. Only after acceptance may the operator
provide authorized activation inputs and issue a fresh exact owner decision
binding SHA `4b8cb7d1c7d2b7e2002d5851bb1fc03053c3cdb87a7590ce79e94b3a5caa92ac`
and run `d55480bb-601d-425c-be6b-5c33cdd66033`. Stage 3 remains stopped.
