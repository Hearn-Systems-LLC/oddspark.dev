# Story 1.26 Stage 1 r2 live-run handoff

## Governing baseline and authority

- Repository: `/Volumes/fast/Github/oddspark`
- Branch: `develop`
- Fetched baseline: `HEAD == origin/develop == 6a3f90a54e67d4c501269dd1b057bf8226e2a5cc`
- Initial state: clean repository; no current r2 approval, receipt, published artifact, or cycle lock.
- Exact plan: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826-r2.plan.json`
- Plan byte SHA-256: `3a03d20f8f66917caf52550cc3fdd2339d40aa42f624c8a5a2e26f40c6c0b1ad`
- Plan ref: `00135e29bbe0422ad77c1d8a6a5888a5ad714abb35f111bf07d4b9ea534de832`
- Canonical rebuild: exact byte equality; rebuilt SHA-256 and plan ref matched the retained plan.
- Runtime identity: Node `v24.18.0`; Wrangler `4.123.0`; runtime identity SHA-256 `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.
- Recovery before approval: `available`; `allowance_consumed:false`; no prior current-cycle attempt.
- Generation self-test: PASS, 48/48.

## Approval and execution count

- Approval: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826-r2.approval.json`
- Approval byte SHA-256: `eecb901d3ce2953738119b3d1bed5ef83476702444df1c69434af124c7968754`
- Approved at: `2026-08-26T16:16:50.000Z` by `Justin`.
- Approval validity: canonical UTC and valid when checked; the closed four-hour window ended at `2026-08-26T20:16:50.000Z`. The run began at `2026-08-26T16:18:14.748Z`.
- Authority: `execute-exact-plan-once`; call cap `63`; maximum authorized cost `$0.30586038`.
- Approval creation count: 1; create-only; no overwrite.
- Adapter starts: 1. No adapter-start recovery was needed.
- Adapter preflight: exact expected loopback health at `http://127.0.0.1:8789/`, identity match, `inference:false`, zero inference calls before the runner.
- Exact live runner invocation count: 1. No external retry, replacement, substitution, or diagnostic provider call occurred.
- Attempt ID: `fa7f66dd-d2ec-4635-89e4-3d80a5c2442c`.
- Run interval: `2026-08-26T16:18:14.748Z` through `2026-08-26T16:29:02.801Z`.
- Receipt terminal state: `completed-spent`; 46 calls started and made of 63 permitted.

## Schedule, outcomes, usage, and cost

- Primary `@cf/meta/llama-3.3-70b-instruct-fp8-fast`: 21 attempts (1 probe, 20 trials), 0 retries, 20/20 direct-valid trials, independent decision `GO`.
- Fallback `@cf/openai/gpt-oss-20b`: 25 attempts (2 probe attempts and 23 trial attempts), 4 retries, each immediately after one `provider_error`; 19/20 direct-valid trials, 1 classified `invalid_output`, independent decision `GO`.
- Retry predicate: PASS. No retry followed output classification; no scheduled call retried more than once; no replacement occurred.
- Primary usage across all attempts: 10,710 input tokens and 4,991 output tokens; known attempt cost `$0.01433565`. Trial-only summary cost: `$0.01364775`.
- Fallback known usage across 21 attempts: 11,487 input tokens and 30,661 output tokens; known partial attempt cost `$0.01149570`. Three transient provider-error attempts had no usage, and one transient probe error also had no usage, for four missing-usage attempts total across the fallback attempt record.
- Exact total spend: unknown because transient provider-error attempts returned no usage. Receipt records `actual_spend_known:false` and `actual_spend_usd:null`; the run remained bounded by 46/63 calls and the approved maximum `$0.30586038`.

## Independent verification

- Public verifier: PASS (`valid:true`, no errors).
- All 23 closed predicates PASS: `evidence.shape`, `oracle.identity`, `legacy.immutable`, `runtime.identity`, `source.identity`, `adapter.identity`, `candidate.binding`, `fixtures.executed`, `records.classified`, `records.closed`, `run.authorization`, `run.cardinality`, `run.ordering`, `run.common_request`, `summary.rates`, `outcome.deterministic`, `predicates.retained`, `report.deterministic`, `roles.independent`, `output.direct_candidate`, `schedule.transient_retry_only`, `cost.recomputed`, and `manifest.independent`.
- Marker/member audit: PASS. Every declared member byte length and SHA-256 matched the independently re-read file.
- Primary qualification ref: `cf602f143373958591b7a4954ec2ebe951160af45fa0fc45802eb0d96030f90c`.
- Fallback qualification ref: `2ac2f4bcb4a0a61bd7960c565ef3344e04b7e800d0bd84933deb6c71aea6c1d8`.
- Cycle ref: `62980c4be1cafdd38a98e21250b059c74024df22157e5e468fcf5e550d75ac33`.
- Role qualification ref: `0473102c40734947c91e8c605e6ae8e03b1e895a8c5b18867a9579dbb6abe514`.
- `git diff --check`: PASS.

## Retained exact artifacts

- Evidence: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826-r2-fa7f66dd-d2ec-4635-89e4-3d80a5c2442c.evidence.json` — SHA-256 `f8133f1d76ef266117c7d85d638f042cf104a3d0af4e8b75fd6e7bcb2c45d87e`.
- Report: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826-r2-fa7f66dd-d2ec-4635-89e4-3d80a5c2442c.report.md` — SHA-256 `df9f634ea75f5c840b846c633ddcd4df0007854e03c20adeb84c722ef13101f9`.
- Qualification: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826-r2-fa7f66dd-d2ec-4635-89e4-3d80a5c2442c.qualification.json` — SHA-256 `fb010dec2d7cfe2743d09b604e6fc2be3fd1a4c22a3066c95a05c765f8a65380`.
- Completion marker: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826-r2-fa7f66dd-d2ec-4635-89e4-3d80a5c2442c.complete.json` — SHA-256 `0ece2ad49afc880172159414a7c5e4c39d54e110745f7476745c0be69e67cb06`.
- Spend receipt: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826-r2-fa7f66dd-d2ec-4635-89e4-3d80a5c2442c.spend-receipt.json` — SHA-256 `81303967d0d946b73561100b0f812dc4f99aa92246ca9a0d6f16e5b5ea14323b`.
- Plan and approval paths/hashes are recorded above.
- The committed approval template and execution marker remain byte-unchanged; their retained hashes are `01ae97f46d6fdc5dc8b7c8666b0c4d9a9f21c17c5ee6abd52f69f5df598b1172` and `203693efbcd8e10ea8fea9a440fe8f7a258d7055e2b748ff8ede41c95ca802ce`, respectively.

## Cleanup and boundary

- Adapter stopped after runner termination; cycle lock absent.
- Runner-created artifacts were preserved exactly. No repair, rename, deletion, or rerun occurred.
- Exact allowed-path audit: PASS. Final Git status contains exactly seven untracked allowed files: the approval, five runner-created immutable artifacts (receipt, evidence, report, qualification, completion marker), and this handoff. There are no tracked modifications.
- No Stage 2 or Stage 3 action, deployment, signing, activation, commit, or push occurred.
- Stop state: terminal handoff for independent AGY evidence review.
