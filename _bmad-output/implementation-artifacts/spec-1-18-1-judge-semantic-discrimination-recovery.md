---
title: 'Story 1.18.1: Judge Semantic Discrimination Recovery'
type: 'corrective-feature'
created: '2026-08-24'
status: 'blocked'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-24.md'
baseline_revision: 'f6d271100996ea92ab5af3af8932f2898388a93b'
provider_execution_authorized: false
deployment_authorized: false
activation_authorized: false
operator_actions: []
---

<intent-contract>

## Intent

**Problem:** Story 1.18 retained a genuine semantic `NO-GO`: both structurally qualified judge legs matched only `11/24` frozen fixtures and failed to discriminate most deliberate negatives. The current prompt enumerates the rubric but does not require evidence-linked, independent, fail-closed decisions.

**Approach:** Introduce a hash-bound Decision protocol v2 inside the existing judge prompt. Keep the candidate-bound schema, adapter, model pair, request parameters, corpus, expected outcomes, thresholds, repair prohibition, and call policy unchanged. Prove the prompt contract and its identity invalidation offline, then prepare an unapproved structural qualification plan.

## Boundaries & Constraints

**Always:** Preserve all old structural and semantic evidence byte-for-byte. Treat old refs as historical/stale for the revised prompt. Require each gate/tone/claims decision to be independently supported by specific supplied facts; fail on absence, ambiguity, inconsistency, or contradiction; prohibit cross-check compensation and fixture/corpus label leakage.

**Block If:** Offline contract, identity, qualification, regression, CI, or complete repository verification fails; the clean source/runtime identity cannot be frozen; or planning would overwrite/consume historical evidence.

**Never:** Change semantic fixtures, expected outcomes, thresholds, models, provider, response schema, candidate binding, temperature, output cap, retries, or budget policy. Never call a provider, incur spend, deploy, activate, push, merge, or mutate a remote resource under Phase A authority.

</intent-contract>

## Evidence Baseline

- Story 1.18 run: `semantic-e2680787-efb5-4f18-81ff-bc3fd95f31eb`
- Frozen plan: `5dfd3b7a7915db3554c9f7f234a528edfd1ec3292487d1ec059a9a516859b89e`
- Request set: `6bc8377184c464861cf9e39d2ca97810f5a9ddf0830f257db51920e4f3b9934c`
- Original evidence SHA-256: `d28f0da7b1a1ffa72dc08b3c75b80653c3cb783873c0915db86bed06b72c83ba`
- Reanalysis code identity: `e3b44158e3df2f9ee2efa78fbbf92d5bc4614a2b59bba3f1b2f313424f9b82a8`
- Terminal result: primary `11/24`, fallback `11/24`, no `SEMANTIC` ref.

## Code Map

- `spikes/judge-fidelity/contract.mjs` — frozen system prompt, canonical schema, binding, and new offline prompt-contract validator.
- `spikes/judge-fidelity/test.mjs` — adversarial prompt-contract, structural, authority, and evidence tests.
- `spikes/judge-fidelity/recovery-finder.mjs` — exact owner-approved supersession of the old structurally-GO prompt identity while retaining its refs as history.
- `spikes/judge-fidelity/{evidence-v2,qualification,run,worker}.mjs` — identity derivation, plan construction, verifier, and isolated live boundary; no provider execution in Phase A.
- `spikes/semantic-qualification/**` and `semantic/regression/v1/catalog.json` — frozen semantic evidence and oracle; read-only except verification.
- `sprint-status.yaml` — orchestrator-owned; never edit here.

## Tasks & Acceptance

### Planning authority

- [x] Sprint Change Proposal 2026-08-24 approved by Justin for Phase A.
- [x] AD-11 records prompt decision discipline as structural identity and transitive invalidation.
- [x] Epic 1 includes Story 1.18.1 and blocks Stories 1.19/1.20 on it.

### Offline implementation

- [x] Decision protocol v2 requires independent checks, supporting/disqualifying evidence search, fail-closed uncertainty, specific evidence-linked reasons, strict conjunction, and no case-label leakage.
- [x] Canonical JudgeResult schema, binding, model pair, parameters, frozen corpus, outcomes, thresholds, and call policy remain unchanged.
- [x] Adversarial mutations cover missing independence, contradiction search, ambiguity policy, reason specificity, compensating strength, unsafe top-level pass, and fixture-label leakage.
- [x] The exact old structurally-GO identity is classified as owner-approved superseded history without reclassifying or deleting its evidence.

### Verification and plan

- [x] Focused judge, semantic regression, corpus identity, CI, and complete offline repository verification pass.
- [x] A fresh structural qualification plan is generated outside the repository from final source/runtime bytes with a blank, unapproved approval template.
- [x] The plan identity, call cap, cost cap, expiry rules, retention, and zero-retry policy are recorded here.
- [x] Stop before provider execution and request separate exact-run approval.

## Verification

- `node --test spikes/judge-fidelity/test.mjs`
- `node --test scripts/semantic-regression.test.mjs`
- `npm run semantic:voice:verify`
- `CI=1 node .github/check-ci.mjs`
- `npm run check`
- `git diff --check`

## Change Log

- 2026-08-24 — Story created from the approved Sprint Change Proposal; Phase A implementation started with no provider or remote authority.
- 2026-08-24 — Decision protocol v2, exact historical supersession, adversarial tests, planning amendments, and the external unapproved structural disclosure completed offline. Story moved to `awaiting-operator`; no provider call occurred.
- 2026-08-24 — The approved structural plan completed `GO`; both judge legs were `20/20` direct-valid and emitted the revised role/configuration refs.
- 2026-08-24 — The separately approved semantic cycle completed all `38/38` calls and retained a verified `NO-GO`: primary `11/24`, fallback `8/24`, no `SEMANTIC` ref. Story moved to `blocked` for architecture review; no retry is authorized.

## Phase A Result

Status: `awaiting-operator`. Offline implementation and structural requalification are complete; semantic execution remains unapproved.

### Frozen external disclosure

- Directory: `/tmp/oddspark-judge-decision-v2.HqtaOI/`
- Plan: `decision-v2-structural-plan.json`
- Approval template: `decision-v2-structural-plan-approval-template.json` — decision placeholder unchanged; `approved_at:null`; `expires_at:null`; not authority.
- Completion marker: `decision-v2-structural-plan-disclosure.complete.json`
- Plan ref: `3d202e5434fad29eae06a4cdc1bf9b8d4e3dad4a546eef1ebf0c28691a025ce0`
- Approval run id: `7c2c3860-77da-4b9b-aad1-3313f9704c6b`
- Plan file SHA-256: `1a78a1db4691e2220f9a76e066845154dbcdd612002844d98b066ceca9159120`
- Approval-template SHA-256: `b4219196b28921f7fbebf6721dbd85b7cea0c106116ba9887cfee8954280e645`
- Disclosure-marker SHA-256: `e03c7f048179dcfbc8ae83dfa23ca7934667e79d5e8e2aa3c6b6146d2084827e`
- Prompt-template SHA-256: `3b1128bfcd463380cff7fec0d1f14a2f8a63cc67dd61c50da4ae8cf3eca19056`
- Source identity: `66accddfa0c08e65ed8f79c75b5a03baa7a936f7b397cf6303bb28c48721ca91`
- Runtime identity: `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`

### Exact execution envelope

- Provider/profile/plan: Cloudflare Workers AI / `default` / Paid.
- Ordered models: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, then `@cf/meta/llama-3.1-8b-instruct-fast`.
- Schedule: one probe plus 20 sequential trials per model; 42 calls maximum.
- Parameters: temperature `0`, `max_tokens:2048`, strict `json_schema` response format.
- Timeouts: 10-second preflight, 120-second adapter call; probes complete before trials.
- Retries/replacements: `0` / `0`.
- Maximum: `$0.3054702` and `27770.018181818185` conservative neurons.
- Retention: the complete closed `retained_fields` list in the plan; credentials, headers, secrets, account IDs, tool calls, and provider reasoning are excluded by the harness contract.
- Execution is forbidden in CI; deployment and persistent resources are forbidden.

### Verification result

- Judge spike: PASS, `82/82`; shared fixtures `79/79`; evidence predicates `18/18`.
- Semantic regression: PASS, `10/10`.
- Voice identity: PASS, unchanged approved identity `b387b27c7fd91062ae7b0aec39ada8103b579655b5161e2556b614b1d2f6694e`.
- Governed CI: PASS, including controlled Chrome; live CDN/axe checks remained skipped as designed.
- Complete `npm run check`: PASS.
- Provider calls, spend, deployment, activation, push, merge, and remote mutation: none.

## Structural Execution Result

Justin approved the exact structural plan and authorized execution on 2026-08-24. A one-hour authority window was bound from `2026-08-24T06:35:08.000Z` through the exclusive expiry `2026-08-24T07:35:08.000Z`.

- Run: `7c2c3860-77da-4b9b-aad1-3313f9704c6b`; started `2026-08-24T06:36:28.308Z`; ended `2026-08-24T06:43:08.258Z`.
- Calls: exactly `42/42`, sequential; zero retries/replacements.
- Primary: `20/20` direct-valid, zero repairs/errors/timeouts; config ref `ffec86eebe95f8699b6c1b4ec1817bab005546e6404affa95561cc1d542265d6`.
- Fallback: `20/20` direct-valid, zero repairs/errors/timeouts; config ref `1c32d0c87e1b3c7b977c7f99c6b26ccdb8fbae3ecb2e6340f32dbebff2538cf4`.
- Role ref: `f13c31e02dbf9bce86df62e25775b768dd477a1ef5068c234c95f149e71b749c`.
- Primary observed cost: `$0.03284706` / `2986.0963636363635` neurons. The fallback's exact endpoint price remains unpublished/noncomputable; total spend remained bounded by the approved `$0.3054702` maximum.
- Both public verifiers passed: `18` predicates, `79` fixtures, `GO`, two configuration refs.
- Evidence basename: `2026-08-24-7c2c3860-cec14a30a3411043-3f980f8c-8e1d-45ba-bd87-ef961d1a808c`.

No deployment, production activation, push, merge, or persistent remote resource occurred. The isolated adapter was stopped after the run.

## Fresh Semantic Plan — Unapproved

- Directory: `/tmp/oddspark-semantic-decision-v2.v2fPY8/`
- Run: `semantic-1bcf7ce1-9be5-4324-80f4-891a36dc4886`
- Plan ref: `2dee38c5cd4d004831999cc1e77e762bd4bccb0d12db6b459fe0f6d9b72d4531`
- Plan file SHA-256: `9366007f77655aeb40cbcd28ac7d055d165bd464d1ac8d18f6b3ac779faf396f`
- Approval-template SHA-256: `50224c4a521f58c8b4d4e5d89c0a73ab19a310490f29058bb62f5356b6e5fbf3`
- Request-set SHA-256: `7cc644407a81d8b8beff144f8cbe241c53ad41decf2b4b4de7a5e64b34daee06`
- Source/runtime identities: `eb62bded131dfd7ccb439e6f6d3e4103eb413af19d8a884a5f8f4d28e1fe4a52` / `94805d460becf9ec246b6c2629f813aea451bc5d65ffa1e354323356403c2777`.
- Structural role/config refs: `f13c31e0...`, primary `ffec86ee...`, fallback `1c32d0c8...` as recorded above.
- Frozen semantic/catalog identities remain `b387b27c7fd91062ae7b0aec39ada8103b579655b5161e2556b614b1d2f6694e` / `a92f9d51a80f0e6aabffd75a014a74dddd09f920e1afa3e79aa54ee1a2f3b69b`.
- Schedule: primary then fallback; 19 calls per leg; `38` total; zero generation calls, retries, replacements, or substitutions; 120-second timeout.
- Maximum: `$0.40066136`; immutable retention, including incomplete runs.
- Approval template remains null/unapproved and requires separate exact approval within its exclusive one-hour window.

Semantic harness verification after rebinding passed `16/16`. No semantic provider call has occurred.

## Structural Change Log Addendum

- 2026-08-24 — The separately approved structural matrix completed `GO` with both legs at `20/20` direct-valid and emitted role ref `f13c31e0...`. Both public verifiers passed. A fresh semantic plan was prepared against the new refs and remains unapproved.

## Semantic Execution Result — Terminal NO-GO

Justin approved the refreshed equivalent semantic plan after the first disclosed plan expired without calls. The approved run completed within its one-hour authority window and then failed closed.

- Run: `semantic-8baaad6c-95dc-4546-9a7b-1e4afd1f3f7e`.
- Plan ref: `2f6d330b61c77dac3c9a358b3371b69275ace32cecfbaa1abdb3ac7878b8c9ae`.
- Request-set ref: `7cc644407a81d8b8beff144f8cbe241c53ad41decf2b4b4de7a5e64b34daee06` (unchanged from the expired disclosure).
- Calls: exactly `38/38`, primary then fallback; zero generation calls, retries, replacements, or substitutions.
- Terminal: `NO-GO semantic_not_qualified`; `semantic_ref:null`.
- Primary: `11/24` matched, `13` mismatched. It preserved all six provider-evaluated goldens, but still passed weak-preservation, capability-duplication, contradiction, and contract-control cases; several rejected anti-goldens also failed their more specific expected check pattern.
- Fallback: `8/24` matched, `16` mismatched. It rejected three approved local goldens, passed the unsupported-claims and contradiction-tone negatives, and did not isolate the predeclared contradiction/contract checks even when it rejected those fixtures.
- Evidence SHA-256: `033c2c7d46fa920869caaa1a8e38f41ecac90f6423157756d6520cb066eb97c9`.
- Primary/fallback report SHA-256: `fa59129f94161e3bc94dbc7cf48db0662f1dcf551a48d963e63d8986eca217e4` / `1f89042790c234220bf1887690af7721ac0eb42952f862803a72c8ce6b153c35`.
- Offline reanalysis code identity: `e3b44158e3df2f9ee2efa78fbbf92d5bc4614a2b59bba3f1b2f313424f9b82a8`; the derived append-only artifact independently preserves the same `NO-GO` and null ref.
- Retained directory: `spikes/semantic-qualification/results/semantic-8baaad6c-95dc-4546-9a7b-1e4afd1f3f7e/`.

Per the approved stop rule, this result authorizes no retry, corpus or threshold change, model substitution, deployment, or activation. Story 1.18.1 is blocked at owner architecture review: the next decision must determine whether to pursue a materially different judge architecture or revise product intent through another explicit course correction. Downstream semantic authority remains unavailable.
