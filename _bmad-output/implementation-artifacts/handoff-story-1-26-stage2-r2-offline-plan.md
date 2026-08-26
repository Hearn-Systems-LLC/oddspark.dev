# Story 1.26 Stage 2 r2 Offline Plan Handoff

Date: 2026-08-26
Baseline / HEAD: `61542f82f854cf4ca4193e8df2f6a7927d039394` on `develop`, equal to refreshed `origin/develop` before creation
Status: **UNAPPROVED / STOP FOR INDEPENDENT REVIEW**

## Canonical disclosure bundle

- Plan: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r2-unapproved.plan.json` — SHA-256 `0872d0524b6c0eec59eb9c94320d3fe42cbdb35339a4b4c9f6c9dfeb60218801`.
- Approval template: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r2-unapproved.plan-approval-template.json` — SHA-256 `52d4a22295b70364281b0b38b3710c6618d7df15dbfb9a3809bf4dd0204ff7d8`.
- Completion marker: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r2-unapproved.plan-disclosure.complete.json` — SHA-256 `5206919cc5bd519b5e57832eaf2fca201e20da95b7cf69add0ecd67a0120d480`.

The completion marker binds exactly the 62,770-byte plan and 367-byte approval template with the member hashes above. All three files are canonical two-space JSON with one trailing newline and were created once; no prior plan or historical evidence byte was changed.

## Frozen authority and budget

- Approval run ID: `story-1-26-judge-requalification-20260826-r2`.
- Plan ref: `d95fd794b424307d97494c536f2018b94be715ea5c5e909e9f48f86e50d3d0e5`.
- Account label: `Hearn Systems account`.
- Workers plan: `paid`; 10,000 free neurons daily, with free allocation used first and paid overage bounded by the approved plan cap.
- Ordered models: primary `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; fallback `@cf/meta/llama-3.1-8b-instruct-fast`.
- Frozen request: temperature `0`, maximum output `2048`, `json_schema`; request SHA-256 values `2e680669487fd2786cb05cbd0c116a71ce59a686933b53db97423e597f6efef0` and `713a7c345a34691f483cb1fdf432740c3fb5a8ed8db00df92da777fe31402ee9` in model order.
- Call policy: 1 probe plus 20 trials per model, 42 calls maximum, sequential, zero retries, zero replacements.
- Conservative ceiling: `$0.3054702` / `27770.018181818185` neurons. The exact 70B published rate is `$0.29/M` input and `$2.25/M` output; the unresolved exact selected 8B endpoint price is conservatively charged at the same 70B rates.
- Source identity: `f8cfc0c2600e4df098f029aa708db65f9e455e98f83205040c044e36ce5a8bb0`.
- Runtime identity: `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`.

## Timing and supersession

- r2 `created_at`: `2026-08-26T17:07:24.533Z`.
- Latest permissible r2 approval creation: `2026-08-26T18:07:24.533Z` (inclusive one-hour creation limit). A later approval is invalid; `expires_at` must remain exclusive and no more than four hours after `approved_at`.
- The first Stage 2 plan was created at `2026-08-26T15:27:01.231Z`; its latest permissible approval creation was `2026-08-26T16:27:01.231Z`. That window expired with no approval or execution and the bundle is historical only.

The r2 template retains `approved_at:null`, `expires_at:null`, and `decision:"REPLACE_WITH_APPROVED_AFTER_REVIEW"`. No distinct approval exists. The only files bearing the r2 run ID are the plan, template, and completion marker; there is no r2 adapter, runner, receipt, evidence, report, qualification, provider call, spend, or allowance consumption.

## Offline creation and verification

The plan command used only the bounded `--offline-requalification` planning exception. That exception bypassed the historical-spend planning gate only; it granted no execution authority. The command started no adapter and made zero provider calls.

- `npm run spike:judge:self-test`: PASS, including all 82 tests, all 79 fixtures, and all 18 retained predicates.
- Canonical retained-plan validation: PASS.
- Independent reconstruction from current source/runtime with the retained creation timestamp: byte-for-byte PASS.
- Disclosure completion marker, exact member set, lengths, and SHA-256 values: PASS.
- Recovery classification: the pre-existing completed-spend receipt remains a blocking historical-spend fact; the planning-only exception did not alter, consume, or convert it.
- `git diff --check`: PASS.
- Exact boundary audit: PASS. Git reports exactly the three r2 disclosure siblings, this matrix note, and this handoff; no other path changed.

Fresh exact owner approval must name the r2 plan SHA-256, plan ref, run ID, ordered models, 42-call cap, `$0.3054702` ceiling, zero retries/replacements, exact retained fields, and canonical approval interval. Until that separate approval exists and is independently checked while current, no adapter may start and no runner/provider call is authorized. Stage 3 remains untouched and blocked.
