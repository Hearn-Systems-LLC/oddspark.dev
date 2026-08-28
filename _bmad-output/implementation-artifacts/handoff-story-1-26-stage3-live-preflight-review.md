# Story 1.26 Stage 3 live preflight independent review

Date: 2026-08-26
Committed baseline: `c3b49009b756eec6c3c9f0d2a4f32032ae34f9f3` on `develop` (`HEAD == origin/develop`)
Review Verdict: **APPROVE (confirm zero-call preflight NO-GO stop)**
Stage 3 Execution Verdict: **NO-GO (preflight tooling, identity, and activation blockers)**

---

## 1. Independent executive summary

An independent adversarial review was performed on the Stage 3 live preflight failure for Story 1.26. The developer handoff was not trusted; all claims, plan hashes, assembly identities, code paths, test suites, process/port states, and environment configurations were independently verified offline. Zero provider calls were made, zero adapters were started, zero allowances were consumed, and zero source/config mutations occurred.

The review **confirms** that the developer halted execution correctly before approval creation, adapter start, or runner invocation. Live execution was impossible because:
1. `spikes/local-full-request-qualification/worker.mjs` pins and advertises stale assembly identity `7971844c5779fe1a435970eef522cd2c23f9b7c121708f6675299e58aff96ed6`, whereas the authorized plan and the 18-module codebase require `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`. The runner's health preflight and worker authorization would both fail closed at zero calls.
2. Required launcher inputs `LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT` and `LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS` were absent.
3. The repository exposes schema validation for approvals (`contract.mjs`) but no governed approval-creation interface; manual JSON authorship is prohibited under governed execution.

Because the single execution authorized by the owner reached a terminal preflight blocker, this exact plan (`95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9`, run ID `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`) must be **retired**. It cannot be retried, resumed, or rerun. Any future Stage 3 live qualification requires separate tooling repair, a fresh unapproved plan, independent plan review, and a fresh owner authorization.

---

## 2. Independent identity, authority, and limit verification

### 2.1 Baseline and authorization
- **Committed baseline**: `c3b49009b756eec6c3c9f0d2a4f32032ae34f9f3` (`HEAD == origin/develop`).
- **Owner authorization verbatim**: `I authorize the exact Stage 3 plan with SHA-256 95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9 and run ID 09ad79e1-f57d-4130-bfe9-ec0bce3aae68 for one execution.`
- **Plan path**: `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json`.
- **Plan SHA-256**: `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9` (recomputed and verified exact).
- **Run ID**: `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`.

### 2.2 Bound authorities and limits in plan bytes
- **Assembly identity**: `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` (verified via `npm run assembly:verify` over 18 runtime-neutral modules).
- **Runtime baseline**: `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb` (verified via `npm run baseline:verify`).
- **Stage 1 accepted generation ref**: `cf602f143373958591b7a4954ec2ebe951160af45fa0fc45802eb0d96030f90c`.
- **Stage 1 accepted generation role ref**: `0473102c40734947c91e8c605e6ae8e03b1e895a8c5b18867a9579dbb6abe514`.
- **Stage 2 accepted judge role ref**: `64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799` (bound through Stage 2 r3 surrogate accounting reconciliation, acceptance identity `02ac4f5a05b17bbe3d19a3492793d0c461c6da6dabe6c31d34cf7083e13ce1dc`, reconciliation SHA-256 `cdf19202505a401399725fe660d84583b4a1c88a4b235898c2e742c2fc15f328`, owner decision SHA-256 `830ac2e4254a768102bdaa56e719d0e7ba9a90862af57c829c79703b9429548c`).
- **Static authorities**: House catalog ref `9334910e17f7fa610ee2a18d54b1485bf19d00b866f8e7cd8f5258a0d17e9ad8`, Local priors ref `2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded`, Activation version `2`.
- **Limits**: Call cap `6`, Attempt cap `3`, Maximum cost `$0.06`, Route ceiling `120000 ms`, Commit reserve `1000 ms`, Provider timeout `19833 ms`.
- **Plan state**: `status: "unapproved"`, `approval: null`, `execution: null`, `allowance_consumed: false`.

---

## 3. Exact zero-call and zero-spend evidence

An exhaustive check of the repository, process table, network listeners, and filesystem establishes that:
- **Approval files created**: `0` (no `.approval.json` exists for run ID `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`).
- **Adapter starts**: `0`.
- **Runner invocations**: `0`.
- **Orchestrated attempts**: `0`.
- **Provider calls started**: `0`.
- **Provider tokens consumed**: `0`.
- **Provider spend**: `$0.00`.
- **Allowance consumed**: `false`.
- **Locks & processes**:
  - `lsof -i :8787 -i :8788` confirmed ports 8787 and 8788 are clean (no active listeners).
  - No `.cycle.lock` or qualification locks exist on disk.
  - No background processes or orphan workers were spawned.
- **Offline test verification**:
  - `npm run assembly:verify`: PASS (18 modules).
  - `npm run baseline:verify`: PASS.
  - `npm run check:config`: PASS.
  - `node --test spikes/judge-fidelity/surrogate-accounting.test.mjs`: PASS (2/2).
  - `npm run spike:full-request:self-test`: PASS (30/30).

---

## 4. Findings ordered by severity and independent blocker assessment

### Finding 1 (Critical / Execution Blocker): Adapter Assembly Identity Mismatch (`worker.mjs`)
- **Location**: [spikes/local-full-request-qualification/worker.mjs:8](file:///Volumes/fast/Github/oddspark/spikes/local-full-request-qualification/worker.mjs#L8).
- **Evidence**: `worker.mjs` hardcodes:
  ```js
  const ASSEMBLY_IDENTITY = "7971844c5779fe1a435970eef522cd2c23f9b7c121708f6675299e58aff96ed6";
  ```
  The endpoint `/health` returns `assembly_identity: ASSEMBLY_IDENTITY` (`7971844c...`).
- **Impact**: The authorized plan requires current assembly `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`. In [spikes/local-full-request-qualification/run.mjs:41-45](file:///Volumes/fast/Github/oddspark/spikes/local-full-request-qualification/run.mjs#L41-L45), `runLive()` checks:
  ```js
  if (health?.ok !== true || health.assembly_identity !== checked.plan.authorities.assembly_identity) {
    const evidence = zeroCallEvidence(checked.plan, planBytes, approvalBytes, "adapter_identity_mismatch", now());
    await atomicWrite(path.join(resultsDirectory, `${runName}.zero-call.json`), canonicalBytes(evidence));
    return { ok: false, calls_started: 0, allowance_consumed: false, code: evidence.code, evidence };
  }
  ```
  Had the adapter been started, `runLive()` would immediately fail preflight with `adapter_identity_mismatch`, recording zero calls and zero allowance consumed before reserving spend or calling `/run`. Furthermore, [spikes/local-full-request-qualification/worker.mjs:36](file:///Volumes/fast/Github/oddspark/spikes/local-full-request-qualification/worker.mjs#L36) independently validates `plan.authorities?.assembly_identity === ASSEMBLY_IDENTITY` and would reject execution with 403 `authority_mismatch`.
- **Verdict**: Fail-closed boundary confirmed.

### Finding 2 (Critical / Launcher Blocker): Missing Qualification Activation Inputs
- **Location**: [spikes/local-full-request-qualification/start-adapter.mjs:10-15](file:///Volumes/fast/Github/oddspark/spikes/local-full-request-qualification/start-adapter.mjs#L10-L15).
- **Evidence**: `start-adapter.mjs` enforces:
  ```js
  const activationSnapshot = process.env.LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT;
  const activationTrustKeys = process.env.LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS;
  if (!activationSnapshot || !activationTrustKeys) throw new Error("signed qualification activation inputs are required before adapter start");
  ```
- **Independent Check**: Verified offline via non-disclosing environment inspection: both variables were unset (`false`).
- **Genuineness**: Inspected [worker.mjs:63-76](file:///Volumes/fast/Github/oddspark/spikes/local-full-request-qualification/worker.mjs#L63-L76). These inputs are required to invoke `createInactiveDomainWriter` with `ACTIVATION_SNAPSHOT` and `activationTrustedKeys`. Without them, the adapter cannot start.
- **Verdict**: Genuine launcher blocker confirmed.

### Finding 3 (High / Tooling Gap): Absence of Governed Approval-Creation Interface
- **Location**: `spikes/local-full-request-qualification/`.
- **Evidence**: [spikes/local-full-request-qualification/contract.mjs:75-81](file:///Volumes/fast/Github/oddspark/spikes/local-full-request-qualification/contract.mjs#L75-L81) provides `validateApproval()`, and `plan-creator.mjs` provides `createUnapprovedPlan()`, but there is no CLI script, sub-command, or tool in the repo to generate a governed approval artifact from owner input.
- **Impact**: Handcrafting raw JSON files directly in the repository violates BMAD governed execution rules. The developer properly refused to fabricate approval bytes manually.
- **Verdict**: Tooling gap confirmed.

---

## 5. Disposition of the authorization and plan

- **Authorization status**: **EXPIRED / TERMINATED**.
- **Plan status**: **RETIRED**.
- **Rationale**: The owner authorized plan `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9` for one single execution attempt. Preflight encountered terminal identity mismatches and missing activation inputs. Under BMAD and Story 1.26 governance, failed or blocked execution attempts consume the authorization and cannot be retried, resumed, repaired in-flight, or rerun under the same authorization.
- **Requirement for next live attempt**: A new, distinct plan with a new run ID and plan hash must be created and independently reviewed after tooling repairs are committed.

---

## 6. Smallest next governed repair packet

To prepare for a valid Stage 3 qualification, the following sequential actions must be taken under separate development authority:

1. **Tooling Repair 1 (Adapter Identity)**: Update `spikes/local-full-request-qualification/worker.mjs` and `contract.mjs` so the adapter advertises and validates current runtime assembly identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`.
2. **Tooling Repair 2 (Approval Creation)**: Add a governed approval creation tool/command (e.g. `npm run spike:full-request:approve` or similar) that takes owner approval parameters and writes a canonical `oddspark.local-full-request-approval/v1` file matching `validateApproval` rules.
3. **Environment Provisioning (Activation Inputs)**: Ensure valid non-secret/governed signed activation inputs (`LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT` and `LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS`) are available to `start-adapter.mjs` prior to launch.
4. **Plan Generation**: Run `npm run spike:full-request:plan` to generate a fresh, unapproved successor plan with a new run ID (e.g., `story-1-26-local-full-request-r2` or a fresh UUID), binding current assembly `9e20e723…` and accepted Stage 1/Stage 2 refs.
5. **Independent Offline Review**: Submit the fresh successor plan for independent review before requesting owner execution authorization.

---

## 7. Changed-path boundary and cleanliness audit

- **Worktree diff check**: `git diff --check` executed with code `0` (clean).
- **Changed-path boundary**:
  - `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md` (updated matrix record).
  - `_bmad-output/implementation-artifacts/handoff-story-1-26-stage3-live.md` (developer handoff artifact).
  - `_bmad-output/implementation-artifacts/handoff-story-1-26-stage3-live-preflight-review.md` (this independent review artifact).
- **Integrity**: No source code, tests, configuration, status files, deferred work items, deployment files, signing keys, or activations were mutated. No commits or pushes occurred. All historical artifacts and plan bytes remain byte-for-byte identical.

---

## 8. Final gate verdict

**APPROVE** developer zero-call preflight NO-GO handoff. Stage 3 execution is halted. Tooling repair packet required under separate authority before any future Stage 3 plan or authorization.
