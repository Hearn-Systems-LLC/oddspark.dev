# Story 1.26 offline requalification tooling review record

Date: 2026-08-26
Reviewer: Independent Adversarial Reviewer
Baseline/HEAD: `9857bd4cdc80802ce78858889cb9a0aa10d0f07a` on `develop`
Matrix: `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md`
Developer Handoff: `_bmad-output/implementation-artifacts/handoff-story-1-26-requalification-tooling.md`
Overall Review Verdict: **REQUEST-CHANGES**

---

## Executive Summary & Verdict

An adversarial review was conducted over the complete uncommitted diff and untracked file packet in `/Volumes/fast/Github/oddspark` against baseline `9857bd4cdc80802ce78858889cb9a0aa10d0f07a`.

All core contracts, closed authority schemas, pricing ceilings, offline gates, rate limits, lock mechanics, and zero-call create-only invariants are properly implemented and fail-closed. However, Check #1 failed due to a test defect in `spikes/generation-qualification/test.mjs` line 71: the mutation test does not recompute `changed.plan_ref` from the mutated authority, causing the test to pass solely on a stale/mismatched plan reference (`plan.plan_ref !== derivePlanRef(plan)`) rather than proving that `validCurrentAuthority` rejected the mutated authority.

---

## Finding & Defect Report

### Finding 1 [Medium Severity - Test Quality & Adversarial Mutation Verification Flaw]

- **Affected File**: `spikes/generation-qualification/test.mjs`
- **Affected Line**: Line 71
- **Code under review**:
  ```javascript
  test("current generation authority is closed and paid plans require no free-neuron headroom", async () => {
    const authority = { account_profile: "Hearn Systems account", credential_path: "wrangler-remote-binding", headroom_confirmed: true, workers_plan: "paid", daily_free_neurons: 10_000, billing_order: "free-first-then-paid-bounded-by-plan-cap", remaining_free_neurons: null };
    const plan = await createPlan({ approval_run_id: "story-1-26-paid", created_at: at(0), input: fixtureInput(), authority });
    assert.equal(plan.schema_version, PLAN_VERSION);
    assert.equal(validatePlan(plan, { input: plan.input, requests: plan.requests }).valid, true);
    for (const mutate of [(x) => { x.authority.extra = true; }, (x) => { x.authority.daily_free_neurons = 9999; }, (x) => { x.authority.billing_order = "paid-first"; }, (x) => { x.authority.remaining_free_neurons = 0; }, (x) => { x.authority.account_profile = "../secret"; }]) {
      const changed = structuredClone(plan);
      mutate(changed);
      changed.plan_ref = (await createPlan({ approval_run_id: plan.approval_run_id, created_at: plan.created_at, input: plan.input, authority })).plan_ref;
      assert.equal(validatePlan(changed, { input: changed.input, requests: changed.requests }).valid, false);
    }
  });
  ```
- **Analysis**:
  Inside the mutation loop, `changed.plan_ref` is assigned `(await createPlan({ approval_run_id: plan.approval_run_id, created_at: plan.created_at, input: plan.input, authority })).plan_ref`. In this invocation, `authority` is the outer valid unmutated authority variable. As a result, `changed.plan_ref` is set to the unmutated plan's ref, not a ref derived from the mutated authority.
  When `validatePlan(changed)` executes, `plan.plan_ref !== derivePlanRef(plan)` is immediately true, generating the error `'plan identity is invalid'`. Because `errors.length > 0`, `validatePlan(changed).valid` is unconditionally `false`.
  Consequently, even if `validCurrentAuthority` had a regression or returned `true` for mutated authorities, the test assertion `assert.equal(validatePlan(changed, ...).valid, false)` would still pass. The test fails to satisfy the requirement: *"Verify mutation tests recompute refs from the mutated authority and cannot accidentally test only stale-ref mismatch."*
- **Reproducible Evidence**:
  When evaluating `validatePlan(changed)` as written in `test.mjs`, the returned errors are:
  `errors: [ 'plan identity is invalid', 'plan authority is invalid' ]`.
  If `changed.plan_ref = derivePlanRef(changed);` is used instead, `derivePlanRef` correctly recomputes the ref over the mutated authority, yielding:
  `errors: [ 'plan authority is invalid' ]` and `valid: false`.
- **Recommended Remediation**:
  In `spikes/generation-qualification/test.mjs`, update line 71 to recompute `changed.plan_ref` directly using `derivePlanRef(changed)` (mirroring the pattern in `spikes/judge-fidelity/test.mjs:1062`), and assert specifically that `errors` contains `/plan authority is invalid/` or `/authority/`.

---

## Adversarial Checklist Verification

### 1. Generation v3 Authority/Ref Binding & Backwards Compatibility
- **Status**: **FINDING RECORDED ABOVE** (Implementation valid; test mutation recomputation flaw).
- **Details**:
  - `PLAN_VERSION` is `"oddspark.generation-qualification-plan/v3"`, `PLAN_DOMAIN` is `"oddspark-generation-qualification-plan/v3"`.
  - `derivePlanRef(plan)` branches cleanly on `plan?.schema_version === LEGACY_PLAN_VERSION ? LEGACY_PLAN_DOMAIN : PLAN_DOMAIN`.
  - `validatePlan` supports both `PLAN_VERSION` and `LEGACY_PLAN_VERSION` with version-specific closed authority checkers (`validCurrentAuthority` vs `validLegacyAuthority`).
  - Retained v2 historical evidence (e.g. L8 zero-retry evidence) remains verified under the validator.

### 2. Exact Owner Label, Plan, Free Neurons, and Headroom Semantics
- **Status**: **VERIFIED**
- **Details**:
  - Exact profile label `Hearn Systems account` is enforced via `safeProfile` in generation and `safeAccountLabel` in judge.
  - Workers plan `paid` requires `remaining_free_neurons === null` and requires no live free-headroom observation.
  - Workers plan `free` requires finite non-negative `remaining_free_neurons >= estimate.maximum_usd / 0.000011` (generation) and `>= maximum_cost.gross_neurons` (judge).
  - Daily free allocation is 10,000 neurons; billing order is `free-first-then-paid-bounded-by-plan-cap`.
  - No account IDs, credentials, or private material are present in code or generated artifacts.

### 3. Generation & Judge Call Limits and Retry Semantics
- **Status**: **VERIFIED**
- **Details**:
  - **Generation**: Maximum 63 provider calls (`CALL_CAP = 63`). `TIMEOUT_POLICY` permits at most 1 internal retry (`transient_retries: 1`) only for `provider_error` and `timeout` (`retry_states: ["provider_error", "timeout"]`), 0 replacements, 0 external retries, 0 retry after output classification.
  - **Judge**: Maximum 42 provider calls (`RECOVERY_CALL_CAP = 42`). `TIMEOUT_POLICY` specifies 0 retries (`retries: 0`) and 0 replacements (`replacements: 0`).

### 4. Judge Account-Label Validation
- **Status**: **VERIFIED**
- **Details**:
  - Evaluated `safeAccountLabel` against hostile inputs:
    - Allowed: `"Hearn Systems account"`, `"Hearn-Systems"`, `"Hearn_Systems.1"`.
    - Rejected: Directory traversal (`"../secret"`), path separators (`"/etc/passwd"`, `"\\tmp"`), leading/trailing whitespace (`" Hearn"`, `"Hearn "`), double spaces (`"Hearn  Systems"`), control characters (`\n`, `\t`, `\0`), emails (`"user@example.com"`), punctuation/secrets (`"token;drop"`, `"key=val"`), 32-hex account IDs (`"0123456789abcdef0123456789abcdef"`), strings > 64 chars.

### 5. Scrutiny of `--offline-requalification`
- **Status**: **VERIFIED**
- **Details**:
  - In `spikes/judge-fidelity/run.mjs`, `--offline-requalification` is restricted solely to `planCommand` to bypass the `findPriorOperationalRecovery` historical-spend planning gate for files meeting all of the following conditions:
    1. `options.offline_requalification === true`
    2. `path.resolve(path.dirname(options.output)) === path.resolve(RESULTS_DIR)`
    3. `path.basename(options.output).startsWith("story-1-26-")`
    4. `path.basename(options.output).includes("unapproved")`
    5. `options.approval_run_id.startsWith("story-1-26-")`
  - Hostile testing verified that attempts to use `--offline-requalification` with paths outside `RESULTS_DIR`, traversal paths, filenames without `story-1-26-` or without `unapproved`, or to overwrite existing files, are all rejected (`prior operational recovery already retained` or `EEXIST`).
  - `--offline-requalification` is not accepted by `runLive`, grants no live execution authority, and makes no network/provider calls.

### 6. Fresh Artifact Bundles Independent Verification
- **Status**: **VERIFIED**

#### Stage 1 Generation Bundle
- **Plan File**: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826.plan.json`
  - Byte SHA-256: `79ed71acfe5e5e886b05ea1d2523b620cee9f71878976c2eb208cac87d9fc0bd`
  - Plan Ref: `9676b8fa3f42ab08890f3217a9c40c108b1ca5f2820f166c6b2388caace66486`
  - Run ID: `story-1-26-generation-requalification-20260826`
  - Limits: 63 calls / `$0.30586038` USD
  - Retained Validator (`validatePlan`): `{ valid: true, errors: [] }`
- **Approval Template**: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826.approval-template.json`
  - Byte SHA-256: `125e22723cc46c3b091ad33bf72702dbd4cd10637d447ebdb356e2bb72a940cc`
  - Authority: `approved_at: null`, `approved_by: null`, `authorization: null`
- **Execution Marker**: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826.execution.json`
  - Byte SHA-256: `92ef88c5300328087a7efcdcb58d93196922da15457b2db68acb0bd0313f79dc`
  - Authority: `approval: null`, `execution: null`, `allowance_consumed: false`, `provider_calls: 0`

#### Stage 2 Judge Disclosure Bundle
- **Plan File**: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-unapproved.plan.json`
  - Byte SHA-256: `741d207d1b3a054555a8f73afcf63e758875c276c84b0424a1718600558d42ad`
  - Plan Ref: `0e6a02d0a5971453ff429534ac91fa496219c0ed5cd1a039a96cfb1f7361b336`
  - Run ID: `story-1-26-judge-requalification-20260826`
  - Limits: 42 calls / `$0.3054702` USD / `27770.018181818185` neurons
  - Retained Validator (`validateRecoveryPlan` with `currentLegacyIdentity`): `{ valid: true, errors: [] }`
- **Approval Template**: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-unapproved.plan-approval-template.json`
  - Byte SHA-256: `022156ce0bd2c3b3c649218bb4a5a388682ea3f24a0b604af7efb3c13f1d75fc`
  - Authority: `approved_at: null`, `expires_at: null`, `decision: "REPLACE_WITH_APPROVED_AFTER_REVIEW"`
- **Completion Marker**: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-unapproved.plan-disclosure.complete.json`
  - Byte SHA-256: `0fffc8c262474b1d08888033487729345ce064958ea7eaa97830e97718296f3d`
  - Marker Verification (`verifyCompletedArtifactSet`): `{ valid: true, errors: [] }`

### 7. Local Full-Request Repairs & Stage 3 Invariants
- **Status**: **VERIFIED**
- **Details**:
  - Deterministic rejection zero judge, house fallback never judged, no external retry, exact current assembly identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` verified.
  - `spikes/local-full-request-qualification/plan-creator.mjs` enforces UUID run ID, current assembly ref, accepted SHA-256 Stage 1 & 2 refs, exact limits consistency, create-only `O_CREAT | O_EXCL`, directory fsync, and null execution/approval.
  - Confirmed no Stage 3 plan exists in the repository.

### 8. Preservation of Retained Artifacts & Boundary Audit
- **Status**: **VERIFIED**
- **Details**:
  - Zero modifications to existing retained results, evidence, receipts, approvals, or plans in `spikes/generation-qualification/results/`, `spikes/judge-fidelity/results/`, or `spikes/local-full-request-qualification/plans/`.
  - Zero changes to production code outside spikes, config files, secrets, or deployment configs.
  - Zero provider calls, zero adapter starts, zero network calls executed.

---

## Test Suite Execution Log

1. `npm run spike:generation:self-test`
   - Result: **PASS** (48/48 tests passed, duration: 2.29s)
2. `npm run spike:judge:self-test`
   - Result: **PASS** (82/82 spike tests passed, 79/79 shared fixtures passed, 18/18 evidence predicates covered, duration: ~75s)
3. `npm run spike:full-request:self-test`
   - Result: **PASS** (30/30 tests passed, duration: 1.47s)
4. `npm run assembly:verify`
   - Result: **PASS** (matches identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` across 18 runtime-neutral modules)
5. `git diff --check`
   - Result: **PASS** (clean, zero whitespace/conflict errors)

---

## Boundary and State Summary

- Provider calls: **0**
- Adapter starts: **0**
- Remote mutations: **0**
- Allowance consumed: **false**
- Approvals granted: **0**
- Executions run: **0**
- Existing retained receipts/evidence altered: **0**
- Production state changed: **0**

## Terminal Decision (Initial Review: 2026-08-26)

**REQUEST-CHANGES** due to Finding 1 (`spikes/generation-qualification/test.mjs:71`). Upon correcting the mutation test to recompute `plan_ref` from `derivePlanRef(changed)` and asserting the specific authority validation error, the offline requalification tooling will be ready for re-review and approval.

---

## Independent Re-Review & Terminal Verdict (2026-08-26)

- **Date**: 2026-08-26
- **Reviewer**: Independent Adversarial Reviewer
- **Baseline/HEAD**: `9857bd4cdc80802ce78858889cb9a0aa10d0f07a` on `develop`
- **Re-review Verdict**: **APPROVE**

### 1. Finding 1 Remediation Verification
- **Status**: **RESOLVED / VERIFIED**
- In `spikes/generation-qualification/test.mjs:71`, the mutated authority loop now properly derives the updated plan reference via `changed.plan_ref = derivePlanRef(changed)`.
- The test asserts `assert.equal(result.valid, false)` and `assert.deepEqual(result.errors, ["plan authority is invalid"])`.
- Verified across all 5 mutation cases (`extra`, `daily_free_neurons !== 10000`, `billing_order !== free-first-then-paid-bounded-by-plan-cap`, `remaining_free_neurons !== null` on paid plan, and `account_profile` traversal `"../secret"`):
  - In every case, `derivePlanRef(changed)` recalculates plan identity over the modified payload so no identity mismatch occurs.
  - In every case, the validator specifically and exclusively reports `plan authority is invalid` without reporting `plan identity is invalid`.
  - Proves that `validCurrentAuthority` is actively enforcing closed authority constraints rather than relying on stale ref rejection.
- Confirmed no out-of-scope edits or unintended behavioral changes.

### 2. Retained Artifact Bundle Integrity & Hash Invariance
All 6 fresh unapproved Stage 1 and Stage 2 retained artifacts were re-verified against independent byte SHA-256 digests and plan refs; all remain 100% identical to the prior review:

- **Stage 1 Generation Plan** (`story-1-26-generation-requalification-20260826.plan.json`):
  - SHA-256: `79ed71acfe5e5e886b05ea1d2523b620cee9f71878976c2eb208cac87d9fc0bd`
  - Plan Ref: `9676b8fa3f42ab08890f3217a9c40c108b1ca5f2820f166c6b2388caace66486`
  - Retained Validator (`validatePlan`): `{ valid: true, errors: [] }`
- **Stage 1 Approval Template** (`story-1-26-generation-requalification-20260826.approval-template.json`):
  - SHA-256: `125e22723cc46c3b091ad33bf72702dbd4cd10637d447ebdb356e2bb72a940cc`
  - Authority: `approved_at: null`, `approved_by: null`, `authorization: null`
- **Stage 1 Execution Marker** (`story-1-26-generation-requalification-20260826.execution.json`):
  - SHA-256: `92ef88c5300328087a7efcdcb58d93196922da15457b2db68acb0bd0313f79dc`
  - Authority: `approval: null`, `execution: null`, `allowance_consumed: false`, `provider_calls: 0`
- **Stage 2 Judge Plan** (`story-1-26-judge-requalification-20260826-unapproved.plan.json`):
  - SHA-256: `741d207d1b3a054555a8f73afcf63e758875c276c84b0424a1718600558d42ad`
  - Plan Ref: `0e6a02d0a5971453ff429534ac91fa496219c0ed5cd1a039a96cfb1f7361b336`
  - Retained Validator (`validateRecoveryPlan` with `currentLegacyIdentity`): `{ valid: true, errors: [] }`
- **Stage 2 Approval Template** (`story-1-26-judge-requalification-20260826-unapproved.plan-approval-template.json`):
  - SHA-256: `022156ce0bd2c3b3c649218bb4a5a388682ea3f24a0b604af7efb3c13f1d75fc`
  - Authority: `approved_at: null`, `expires_at: null`, `decision: "REPLACE_WITH_APPROVED_AFTER_REVIEW"`
- **Stage 2 Completion Marker** (`story-1-26-judge-requalification-20260826-unapproved.plan-disclosure.complete.json`):
  - SHA-256: `0fffc8c262474b1d08888033487729345ce064958ea7eaa97830e97718296f3d`
  - Retained Marker Verifier (`verifyCompletedArtifactSet`): `{ valid: true, errors: [] }`

### 3. Suite Re-Verification Results
1. `npm run spike:generation:self-test`: **PASS** (48/48 passed, duration: 2.08s)
2. `npm run spike:judge:self-test`: **PASS** (82/82 spike tests, 79/79 shared fixtures, 18/18 evidence predicates passed)
3. `npm run spike:full-request:self-test`: **PASS** (30/30 passed, duration: 1.52s)
4. `npm run assembly:verify`: **PASS** (`9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`, 18 runtime modules)
5. `git diff --check`: **PASS** (zero errors)

### 4. Boundary & Invariant Audit
- Provider calls: **0**
- Adapter starts: **0**
- Remote mutations: **0**
- Allowance consumed: **false**
- Approvals granted: **0**
- Executions run: **0**
- Retained historical evidence/results altered: **0**
- Stage 3 live plan fabricated: **0**
- Production code altered: **0**

### 5. Final Re-Review Conclusion

Finding 1 is conclusively repaired. All verification checks and safety boundaries pass without exception. The offline requalification tooling packet is in a complete, safe, fail-closed state.

**Verdict: APPROVE**
