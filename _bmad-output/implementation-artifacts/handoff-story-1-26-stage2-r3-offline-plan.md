# Story 1.26 Stage 2 r3 offline successor-plan handoff

Date: 2026-08-26
Baseline / HEAD: `ef4fd0a19f7010e473e3358dafa385053839f258` on `develop`, equal to `origin/develop`
Status: **UNAPPROVED / STOP FOR INDEPENDENT REVIEW**

## Canonical disclosure bundle

- Plan: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan.json` — 63,111 bytes — SHA-256 `1f4fb793a4ff9a7dc5ab0da37d031134ad3e98a525329385ee5a9f827d1f2863`.
- Approval template: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan-approval-template.json` — 367 bytes — SHA-256 `38be160f7d0373f43724b11400191d7ada572e1d8aecdbcd90c17ee1ee7341cd`.
- Completion marker: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan-disclosure.complete.json` — 585 bytes — SHA-256 `b10c098f29a0876653eece27ec05f53807c38471bd15f7ead549851214bbc5b4`.

The marker binds exactly the plan and approval template names, byte lengths, and SHA-256 values above. All three are canonical two-space JSON with one trailing newline and were atomically published create-only. No r2 or earlier evidence was reused, mutated, renamed, deleted, or replaced.

## Closure, identities, and cumulative accounting

- Historical closure: `_bmad-output/implementation-artifacts/story-1-26-stage2-historical-spend-closure.json`.
- Closure ref: `e827240fbc244ac2f526d32eef3cc01e785ddda40a79fe5d2d9f0b251f22d066`.
- Closed historical attempt/run: `f543d3d5-80d4-44f6-b7bf-41083197fcc9` / `ba52ec91-fe85-4987-954d-71054a0acc3d`.
- Cumulative historical accounting: 42 calls, one runner invocation, zero retries, zero replacements; exact observed priced cost `$0.032631059999999996`; selected 8B endpoint remains explicitly unpriced; conservative historical cap `$0.3054702` / `27770.018181818185` neurons; reset forbidden.
- Current committed source identity: `db425506757d630e163667dad0d17352206a79e64e7923c645ac0f209153874b`.
- Current committed runtime identity: `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.
- Runtime assembly identity: `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` over 18 modules.

Independent closure reconstruction validates the closure ref and every retained historical member hash. Recovery discovery still classifies `.judge-llama-cycle-spend.json` as blocking because the receipt proves or cannot disprove provider invocation. The successor plan binds that terminal closure and cumulative accounting; it does not reset or consume history.

## Frozen successor authority and allowance

- Approval run ID: `story-1-26-judge-requalification-20260826-r3`, distinct from r2 and the closed historical run.
- Plan ref: `a3fce39dc2af1afd34d36fa65d0005dab9c6a176ada118bb0d074771f4a19083`.
- Account profile: `Hearn Systems account`.
- Workers plan: `paid`; 10,000 free neurons daily; free allocation first, then paid overage bounded by the approved plan cap.
- Models in reviewed order: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, then `@cf/meta/llama-3.1-8b-instruct-fast`.
- Request SHA-256 values in model order: `2e680669487fd2786cb05cbd0c116a71ce59a686933b53db97423e597f6efef0`, `713a7c345a34691f483cb1fdf432740c3fb5a8ed8db00df92da777fe31402ee9`.
- Retained request fields: temperature `0`, maximum output `2048`, response format `json_schema`; retained-fields SHA-256 `7270cf049ec8c9cb5ba10fb783e0e6c573b00a905341e0ef29cffe1c74018a73`.
- New allowance: maximum 42 calls (one probe plus 20 trials per model), `$0.3054702` / `27770.018181818185` neurons, sequential, zero retries, zero replacements, one future runner invocation.

The plan was created at `2026-08-26T18:41:22.215Z`. Its latest permissible approval creation is `2026-08-26T19:41:22.215Z` inclusive. Any later approval is invalid; a future `expires_at` must be exclusive and no more than four hours after `approved_at`. The immutable template has `approved_at:null`, `expires_at:null`, and `decision:"REPLACE_WITH_APPROVED_AFTER_REVIEW"`.

## Offline command and zero-call proof

The public command was:

```text
npm run spike:judge:plan -- --output spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan.json --account-profile 'Hearn Systems account' --plan paid --approval-run-id story-1-26-judge-requalification-20260826-r3 --historical-closure _bmad-output/implementation-artifacts/story-1-26-stage2-historical-spend-closure.json
```

It validated the historical closure before creating a distinct successor disclosure, ran offline fixture gates, and published the three siblings atomically/create-only. It created no approval, started no adapter, invoked no live runner/provider, consumed no allowance, and incurred `$0.00` new spend. Apart from the matrix note and this handoff, the only paths bearing the r3 run name are the three disclosure siblings; no approval record, receipt, lock, evidence, report, qualification, or execution artifact exists.

## Independent verification

- Exact reconstruction with `buildCurrentRecoveryPlan` using the retained `created_at`, verified closure, account, plan, and run ID: plan and template byte-for-byte **PASS**.
- `validateRecoveryPlan` with current retained legacy identity: **PASS**.
- `derivePlanRef`: **PASS**, exact ref `a3fce39dc2af1afd34d36fa65d0005dab9c6a176ada118bb0d074771f4a19083`.
- Historical closure reconstruction and retained member hashes: **PASS**.
- Completion marker, exact member set, lengths, and SHA-256 values: **PASS**.
- Recovery classification: **PASS**, historical spend remains blocking and reset is forbidden.
- Public plan boundary: **PASS**, one offline invocation created only the canonical unapproved bundle.
- `npm run spike:judge:self-test`: **PASS**, 85/85 tests, 79/79 shared fixtures, 18/18 evidence predicates.
- `npm run baseline:verify`: **PASS**, runtime identity `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.
- `npm run assembly:verify`: **PASS**, assembly identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`.
- `git diff --check`: **PASS**.
- Exact changed-path boundary: **PASS**, only the three r3 disclosure siblings, matrix note, and this handoff.

## Required fresh owner authorization

No prior approval transfers. Before any adapter start or live action, the owner must freshly authorize the exact r3 plan SHA-256, plan ref, run ID, historical closure ref, ordered models and retained fields, 42-call / `$0.3054702` new cap, zero retries, zero replacements, one runner invocation, and a valid canonical approval interval. That authorization must be created separately and independently reviewed while current.

Until then: no approval creation, adapter start, runner/provider call, allowance consumption, Stage 3 action, commit, push, deploy, sign, or activate. Stop for independent review.
