# Story 1.26 conservative surrogate accounting policy handoff

Date: 2026-08-26
Baseline: clean `develop` at `f34c1e3ec3c8a8635de5a0e79e6a7eef72d37b01`, equal to `origin/develop` at start
Status: **STAGE 2 r3 PROSPECTIVELY ACCEPTED / STAGE 3 PLAN UNAPPROVED AND UNEXECUTED**

## Exact changed files

- `_bmad-output/implementation-artifacts/story-1-26-owner-decision-conservative-surrogate-accounting-2026-08-26.json` — new immutable owner-decision record; SHA-256 `830ac2e4254a768102bdaa56e719d0e7ba9a90862af57c829c79703b9429548c`.
- `_bmad-output/implementation-artifacts/story-1-26-stage2-r3-surrogate-accounting-reconciliation-2026-08-26.json` — new immutable acceptance/reconciliation; SHA-256 `cdf19202505a401399725fe660d84583b4a1c88a4b235898c2e742c2fc15f328`.
- `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md` — prospective decision, reconciliation, and Stage 3 plan pointers; historical NO-GO section preserved.
- `spikes/judge-fidelity/surrogate-accounting.mjs` — offline public reconciliation/identity/arithmetic verifier.
- `spikes/judge-fidelity/surrogate-accounting.test.mjs` — focused happy-path and fail-closed mutation tests.
- `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json` — one creator-generated canonical unapproved Stage 3 plan; SHA-256 / plan ref `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9`.
- `_bmad-output/implementation-artifacts/handoff-story-1-26-surrogate-accounting-policy.md` — this handoff.

No Story 1.26 spec edit was necessary. `sprint-status.yaml`, protected deferred-work entries, production `src/**`, runtime assembly, configuration, Wrangler files, secrets, account IDs, approvals, execution records, and every retained historical plan/approval/receipt/evidence/completion/qualification/handoff byte are unchanged.

## Decision semantics

The owner decision is retained verbatim:

> accept conservative surrogate accounting for unpriced endpoints

For Story 1.26 only, complete usage for an endpoint without authoritative frozen pricing may be accounted with the plan-frozen conservative surrogate rate. Each surrogate input/output rate must be at least the highest corresponding authoritative frozen rate among the run's priced endpoints. The computed conservative exposure must stay inside the exact approved call/cost cap. Available free neurons apply first, followed by paid neurons bounded by the plan cap. Missing/incomplete usage, missing surrogate binding, cap breach, nonconservative substitution, or endpoint/run/plan/approval/attempt/evidence substitution fails closed. The decision does not generalize beyond Story 1.26.

## Historical versus reconciled verdict

- Historical Stage 2 r3 packet: **accounting NO-GO**, preserved. Its then-governing rule rejected a surrogate because exact published 8B pricing and exact provider billing were unavailable.
- New prospective reconciliation: **ACCEPTED under the owner-authorized Story 1.26 policy**. It does not claim the surrogate is observed 8B billing and does not rewrite the historical packet.
- Reconciliation acceptance identity: `02ac4f5a05b17bbe3d19a3492793d0c461c6da6dabe6c31d34cf7083e13ce1dc`.

## Bound refs and accounting

- r3 plan SHA-256 `1f4fb793a4ff9a7dc5ab0da37d031134ad3e98a525329385ee5a9f827d1f2863`; plan ref `a3fce39dc2af1afd34d36fa65d0005dab9c6a176ada118bb0d074771f4a19083`.
- r3 approval SHA-256 `7bfca70b1e228193bb129793a607714b384f203e32fb288afd1ecb8529ff8767`; approval run `story-1-26-judge-requalification-20260826-r3`.
- terminal attempt `cc246aab-3c0e-4a75-b237-07d0edc60652`; receipt SHA-256 `8ab332d3e2a0ece14c44aa2d18d9bbd3b94f6a45a291bde19b8dc10d27932c76`.
- completion marker SHA-256 `fad7ae13f9f55ec322939767c512e3577adc63d59848020c73efa6f3e2df8bd8`; qualification bundle SHA-256 `40677c50aa352877a6a691388f8a7c825c9caf0bb990c6df3ef5570db90c6622`.
- complete usage: 42 calls; 43,428 prompt + 23,271 completion = 66,699 tokens.
- exact priced 70B: `$0.033470309999999996` / `3,042.755454545454` neurons.
- plan-frozen 70B-rate surrogate for unpriced 8B: `$0.03148356` / `2,862.141818181818` neurons.
- combined conservative: `$0.06495387` / `5,904.897272727273` neurons.
- exact approved cap: 42 calls and `$0.3054702` / `27,770.018181818185` neurons.
- remaining free neurons were not observed. The reconciliation retains free-first ordering and a paid range of 0 through `5,904.897272727273` neurons; worst-case `$0.06495387` remains below the cap.
- judge configuration refs: primary `27c584f8f893653d26cbc12c2e83a3f9e86672e3878261c2cecb0afa5136e435`, fallback `d4b024cb990e3c483a4bf061eb3d939147f4a4c3a34ad5fc0f3dd9a54970c3cf`; cycle `48585c41872321c1060ce39c21bdf32b4d4da9328740f8ef6c713f13b61447cc`; accepted judge role `64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799`.

## Stage 3 plan

The existing accepted Stage 1 refs and new Stage 2 reconciliation satisfied the current creator's exact prerequisites against assembly `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`.

- Path: `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json`.
- SHA-256 / plan ref: `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9`.
- Run ID: `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`.
- Generation config ref `cf602f143373958591b7a4954ec2ebe951160af45fa0fc45802eb0d96030f90c`; generation role ref `0473102c40734947c91e8c605e6ae8e03b1e895a8c5b18867a9579dbb6abe514`; judge ref `64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799`.
- Limits: 120,000 ms route ceiling, 1,000 ms commit reserve, 19,833 ms provider timeout, 6 calls, 3 attempts, `$0.06` maximum.
- Authority state: `status:"unapproved"`, `approval:null`, `execution:null`, `allowance_consumed:false`; provider calls `0`.

## Validation results

- New reconciliation public verifier: PASS; decision SHA, reconciliation SHA, and acceptance identity recomputed independently.
- New focused tests: 2/2 PASS, including missing usage, nonconservative rate, cap breach, verdict, and identity mutations.
- `npm run spike:judge:self-test`: PASS, 85/85 tests, 79/79 fixtures, 18/18 predicates.
- r3 public evidence verifier: PASS, 18 predicates / 79 fixtures.
- r3 public qualification verifier: PASS, GO with two refs.
- `npm run spike:full-request:self-test`: PASS, 30/30.
- `npm run assembly:verify`: PASS at `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` over 18 modules.
- runtime baseline verify: PASS at `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.
- `npm run writer:preflight`: PASS; inactive posture and zero remote mutation.
- `npm run check`: PASS when rerun with the local filesystem/loopback permission required by pinned Wrangler; initial sandboxed attempt stopped only at Wrangler log/loopback `EPERM` during `check:types`.
- historical immutable-byte audit: PASS; `git diff` reports no changed path under retained generation/judge/full-request results or named prior Stage 1/Stage 2 evidence/handoffs.
- Stage 3 plan public contract validation: PASS; approval/execution null and allowance false.
- `git diff --check`: PASS.
- Cleanup: port 8788 has no listener; `.judge-recovery.lock` and `.cycle.lock` are absent; no adapter was started by this work.
- Provider/remote activity for this work: zero provider calls, zero allowance consumption, zero deployment/signing/activation/remote mutation.

## Residual risks and next authorization gate

- The 8B endpoint still lacks authoritative frozen pricing. The accepted figure is deliberately conservative surrogate accounting, not observed provider billing.
- Remaining free neurons were not observed; only free-first ordering and worst-case paid exposure are proven.
- The Stage 3 plan has not received independent review or owner approval and cannot authorize adapter start, provider calls, execution, signing, deployment, or activation.

Next gate: independently review the exact Stage 3 plan bytes and this decision/reconciliation chain, then obtain a fresh exact owner approval for plan SHA-256 `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9` before any Stage 3 adapter or runner action. Stop here; no commit or push was performed.
