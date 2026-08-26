# Story 1.26 Stage 3 preflight repair — Independent Review

Date: 2026-08-26
Reviewer: Antigravity (Independent Adversarial Reviewer)
Baseline: `becb571f63a04a3c0d2f5392f8c67d9c232d24ea` on `develop`
Verdict: **APPROVE**
Status: **STAGE 3 REPAIR APPROVED / SUCCESSOR PLAN UNAPPROVED AND UNEXECUTED / STOPPED FOR OPERATOR GATE**

---

## 1. Executive Summary and Authority Audit

An independent, adversarial review was conducted on the working-tree diff against baseline `becb571f63a04a3c0d2f5392f8c67d9c232d24ea`. The review was executed completely offline with zero provider calls, zero adapter starts, zero network access, and zero approval creations.

The repair successfully addresses the zero-call preflight blockers identified in `handoff-story-1-26-stage3-live-preflight-review.md`:
1. Adapter worker health and authorization checks now derive assembly identity dynamically from `runtime-assembly.json` (SHA-256 `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`), eliminating the stale hardcoded assembly constant `7971844c...` without weakening exact identity equality.
2. A dedicated, offline, canonical approval creator (`spikes/local-full-request-qualification/approval-creator.mjs` and npm script `spike:full-request:approve`) has been introduced. It operates noninteractively, enforces closed input schemas, validates canonical plan bytes and exact SHA/run binding, enforces safe basenames under `plans/`, uses atomic creation with `O_EXCL` and directory fsync, and has no provider, adapter, network, or process-spawn path.
3. The retired plan `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9` (run ID `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`) remains completely unchanged, unexecuted, unapproved, and was not used to construct test approval authority.
4. Exactly one successor plan `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-d55480bb-unapproved.plan.json` was creator-generated. It is canonical, unapproved, unexecuted, with SHA-256 `4b8cb7d1c7d2b7e2002d5851bb1fc03053c3cdb87a7590ce79e94b3a5caa92ac`, run ID `d55480bb-601d-425c-be6b-5c33cdd66033`, binding the current 18-module assembly and accepted Stage 1/Stage 2 refs.
5. All 240 tracked historical plan and result files remain 100% byte-identical to `HEAD`.
6. Scope is strictly confined to the expected nine working-tree paths.

---

## 2. Findings Ordered by Severity

### Critical / High / Medium Severity Findings
**None.** All security, boundary, identity, accounting, and concurrency invariants hold.

### Low Severity / Informational Observations
1. **[Informational] Sandbox EPERM on Wrangler Logging during Offline Verification**
   - *File/Line*: `scripts/check-config.mjs`, `scripts/check-types.mjs`
   - *Evidence*: Standard sandboxed invocation of commands invoking `wrangler` CLI dry-runs (`check:types`, `check:config`, `writer:preflight`) attempt to write debug logs to `~/.wrangler/logs/` or read `~/.wrangler/metrics.json`, producing sandbox `EPERM` errors unless permitted. When run with local file access permissions, all dry-run checks and type generations pass with zero warnings, zero errors, and zero remote resource access.
2. **[Informational] Public Verification CLI Argument Syntax**
   - *File/Line*: `spikes/local-full-request-qualification/verify.mjs:10-18`
   - *Evidence*: `npm run spike:full-request:verify` requires three positional arguments: `EVIDENCE PLAN APPROVAL`. Independent verification against historical completed evidence (`results/a77bfb8a.../5ef8222e...`) emitted `LOCAL-FULL-REQUEST evidence PASS`.
3. **[Informational] Operator-Held Activation Snapshot Inputs**
   - *File/Line*: `spikes/local-full-request-qualification/README.md:26-32`, `spikes/local-full-request-qualification/worker.mjs:64-78`
   - *Evidence*: `LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT` and `LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS` are required environment variables at adapter launch time and are evaluated against `createInactiveDomainWriter`. They remain outside plan identity (which binds `activation_version: 2`). No secret or public key was fabricated or committed in the repository.

---

## 3. Working-Tree Scope and Diff Verification

Comparison against baseline `becb571f63a04a3c0d2f5392f8c67d9c232d24ea` confirms exactly nine files modified or untracked:

| # | Path | Status | Scope Verification |
|---|------|--------|---------------------|
| 1 | `spikes/local-full-request-qualification/approval-creator.mjs` | Untracked (New) | Offline, closed-field, noninteractive approval generator |
| 2 | `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-d55480bb-unapproved.plan.json` | Untracked (New) | Single canonical successor unapproved plan |
| 3 | `_bmad-output/implementation-artifacts/handoff-story-1-26-stage3-preflight-repair.md` | Untracked (New) | Developer handoff document |
| 4 | `package.json` | Modified | Adds script `spike:full-request:approve` |
| 5 | `spikes/local-full-request-qualification/README.md` | Modified | Documents `spike:full-request:approve` CLI usage & activation inputs |
| 6 | `spikes/local-full-request-qualification/contract.mjs` | Modified | Imports `runtime-assembly.json`, exposes `CURRENT_ASSEMBLY_IDENTITY`, validates current assembly |
| 7 | `spikes/local-full-request-qualification/test.mjs` | Modified | Adds 4 unit tests (approval creation, approval CLI, assembly derivation, writer integration) |
| 8 | `spikes/local-full-request-qualification/worker.mjs` | Modified | Derives `ASSEMBLY_IDENTITY` from `runtime-assembly.json` |
| 9 | `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md` | Modified | Documents Stage 3 offline preflight repair and successor plan |

No production `src/**` file, configuration (`wrangler*.toml`), GitHub workflow, planning artifact, or historical result file was modified. `git diff --check` passed cleanly.

---

## 4. Adversarial Verification Matrix

### 4.1 Retired Plan and Immutable Retained Bytes Integrity
- **Retired Plan**: `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json`
  - Byte length: 2,779 bytes
  - SHA-256: `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9`
  - Git diff vs HEAD: Exactly 0 bytes changed.
  - Status: `unapproved`, `approval: null`, `execution: null`, `allowance_consumed: false`.
  - Authority check: No approval was generated or referenced for run `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`.
  - Test safety: `test.mjs` constructs synthetic plans (`run_id: "22222222-2222-4222-8222-222222222222"`) for approval test fixtures, ensuring the retired plan is never used to construct test approval authority.
- **Tracked Retained Byte Audit**:
  - Total tracked plan/result/evidence files audited: 240 files across `spikes/**`.
  - Mismatches against `HEAD`: **0 mismatches**.

### 4.2 Worker Health & Current Plan Assembly Derivation
- `spikes/local-full-request-qualification/worker.mjs`:
  - Line 7: `import runtimeAssembly from "../../runtime-assembly.json" with { type: "json" };`
  - Line 9: `const ASSEMBLY_IDENTITY = runtimeAssembly.assembly_identity_sha256;`
  - Line 32: `if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, assembly_identity: ASSEMBLY_IDENTITY, inference_calls: 0 });`
  - Line 37: `if (!plan || plan.authorities?.assembly_identity !== ASSEMBLY_IDENTITY || body.approval?.run_id !== plan.run_id) return json({ error: "authority_mismatch", inference_calls: 0 }, 403);`
- `spikes/local-full-request-qualification/contract.mjs`:
  - Line 2: `import runtimeAssembly from "../../runtime-assembly.json" with { type: "json" };`
  - Line 5: `export const CURRENT_ASSEMBLY_IDENTITY = runtimeAssembly.assembly_identity_sha256;`
  - Lines 53-54: Validates that plan assembly identity matches `CURRENT_ASSEMBLY_IDENTITY` (`9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`).
- `npm run assembly:verify` confirms all 18 runtime-neutral modules match the declared hash.

### 4.3 Governed Approval Creator Verification
- **Module**: `spikes/local-full-request-qualification/approval-creator.mjs`
- **Imports & Capabilities**: Imports only `node:fs`, `node:fs/promises`, `node:path`, `node:url`, and `./contract.mjs`. Zero network (`fetch`), zero child processes (`child_process`), zero AI bindings, zero readline/stdin/isatty interactive paths.
- **Canonical Bytes**: Output encoded as sorted JSON with trailing newline via `canonicalBytes(approval)`.
- **Closed Field Sets**:
  - `createApproval`: Requires all and only `["planBytes", "plan_sha256", "run_id", "approved_by", "approved_at", "expires_at", "decision"]`.
  - `runCli`: Requires all and only `["plan", "output", "plan_sha256", "run_id", "approved_by", "approved_at", "expires_at", "decision"]`.
- **Validation**:
  - Plan bytes must be canonical JSON and pass `validatePlan(plan)`.
  - `plan_sha256` must match `sha256(planBytes)` exactly.
  - `run_id` must match `plan.run_id` exactly and adhere to UUID v4 format.
  - `approved_by` must be nonblank, trimmed string (<= 200 chars).
  - `approved_at` and `expires_at` must be canonical ISO-8601 strings (`new Date(ts).toISOString() === ts`), with `approved_at < expires_at`.
  - `decision` must be strictly `"approved"`.
- **Filesystem Safety**:
  - Filenames constrained by strict regex (`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(plan|approval)\.json$`).
  - Path traversal characters (`/`, `\`, `.`, `..`) rejected.
  - Symlink traversal blocked via `realpath(directory)` and `constants.O_NOFOLLOW`.
  - Atomic, refuse-overwrite file creation via `constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY`, permission `0o600`, with `handle.sync()` and directory handle `sync()`.

### 4.4 Successor Plan Verification
- **Path**: `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-d55480bb-unapproved.plan.json`
- **Byte Length**: 2,779 bytes
- **SHA-256 / Plan Ref**: `4b8cb7d1c7d2b7e2002d5851bb1fc03053c3cdb87a7590ce79e94b3a5caa92ac`
- **Run ID**: `d55480bb-601d-425c-be6b-5c33cdd66033`
- **Canonical Bytes Check**: `canonicalBytes(JSON.parse(bytes)).equals(bytes) === true`
- **Validation Check**: `validatePlan(plan) === true`
- **Authorities**:
  - `assembly_identity`: `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`
  - `generation_ref`: `cf602f143373958591b7a4954ec2ebe951160af45fa0fc45802eb0d96030f90c` (Stage 1 accepted config ref)
  - `generation_role_ref`: `0473102c40734947c91e8c605e6ae8e03b1e895a8c5b18867a9579dbb6abe514` (Stage 1 accepted role ref)
  - `judge_ref`: `64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799` (Stage 2 accepted judge role ref)
  - `house_catalog_ref`: `9334910e17f7fa610ee2a18d54b1485bf19d00b866f8e7cd8f5258a0d17e9ad8`
  - `priors_ref`: `2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded`
  - `activation_version`: `2`
- **Limits**:
  - `call_cap`: `6`
  - `attempt_cap`: `3`
  - `maximum_cost_usd`: `0.06`
  - `route_ceiling_ms`: `120000`
  - `commit_reserve_ms`: `1000`
  - `provider_timeout_ms`: `19833`
- **State**:
  - `status`: `"unapproved"`
  - `approval`: `null`
  - `execution`: `null`
  - `allowance_consumed`: `false`

### 4.5 Activation Operator Gate Disposition
- The contract and plan bind `activation_version: 2`.
- Production activation requires runtime inputs `LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT` and `LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS` signed with an operator-held Ed25519 key.
- No production key or snapshot was invented, stubbed, or committed in the repository.
- Live qualification preflight independently enforces the presence and cryptographic validity of these runtime inputs before activating the writer.

---

## 5. Validation Execution Summary

| Command | Status | Result / Detail |
|---------|--------|-----------------|
| `npm run spike:full-request:self-test` | **PASS** | 33/33 tests passing |
| `npm run assembly:verify` | **PASS** | 18 runtime-neutral modules matched (`9e20e723...`) |
| `npm run baseline:verify` | **PASS** | Runtime baseline matched (`a3d5ae76...`) |
| `npm run check:config` | **PASS** | Dry-run configs valid; AI env verified |
| `npm run writer:preflight` | **PASS** | 18 modules verified, projection identical, offline smoke passed |
| `npm run check` | **PASS** | Full suite passed across all tests, types, configs, and spike verifications |
| `git diff --check` | **PASS** | Clean diff with zero whitespace errors |
| Port check (`:8787`, `:8788`) | **PASS** | No listener active on qualification ports |
| Lock check | **PASS** | No `.lock` files present in spike directory |
| Process audit | **PASS** | Zero runner/adapter/wrangler dev processes running |

---

## 6. Next Governed Action

1. **Review Disposition**: This review **APPROVES** the Stage 3 preflight repair diff and successor plan.
2. **Current State**: Stage 3 remains **STOPPED / UNAPPROVED / UNEXECUTED**. No adapter, provider call, runner invocation, or remote mutation has occurred.
3. **Operator Gate Requirements**:
   - The operator must supply valid runtime activation environment variables:
     - `LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT` (signed v2 snapshot)
     - `LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS` (authorized public key map)
   - The operator must generate the canonical approval using the governed approval creator:
     ```sh
     npm run spike:full-request:approve -- \
       --plan story-1-26-local-full-request-d55480bb-unapproved.plan.json \
       --output story-1-26-local-full-request-d55480bb-<timestamp>.approval.json \
       --plan-sha256 4b8cb7d1c7d2b7e2002d5851bb1fc03053c3cdb87a7590ce79e94b3a5caa92ac \
       --run-id d55480bb-601d-425c-be6b-5c33cdd66033 \
       --approved-by Justin \
       --approved-at <CANONICAL_ISO_TIMESTAMP> \
       --expires-at <CANONICAL_ISO_TIMESTAMP> \
       --decision approved
     ```
   - Only after exact approval creation and activation input configuration may the single Stage 3 qualification execution proceed.
