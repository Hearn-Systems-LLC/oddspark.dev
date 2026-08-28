# Release-Readiness CI Gate Repair: Independent Code Review

## Verdict

**CHANGES REQUESTED**

The core repair architecture — isolating historical STRUCT-JUDGE byte identity and semantic qualification to reconstructed Git snapshot `8e9a9e54cc564896f83e4aedba92b57d73bce63f` while running current unit suites in `check-ci.mjs` — is sound, credential-free, source-honest, and robust against evidence/source mutation.

However, a blocking CI runtime failure was discovered: `.github/workflows/test.yml` uses `actions/checkout@v4` without `fetch-depth: 0`. Under GitHub Actions default shallow checkout (`fetch-depth: 1`), historical commit `8e9a9e54cc564896f83e4aedba92b57d73bce63f` (which is 42 commits behind `HEAD`) is not fetched into the runner's Git object database, causing `git show` and `git archive` to fail.

---

## Severity-Ranked Findings

### [HIGH / BLOCKING] F-01: GitHub Actions Default Shallow Checkout Missing Historical Commit `8e9a9e54`

- **Location**: [.github/workflows/test.yml:12](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/release-ci-gate-repair/.github/workflows/test.yml#L12)
- **Problem**: `actions/checkout@v4` defaults to `fetch-depth: 1` (shallow checkout). In CI, only the tested ref/commit is fetched. Because pinned historical authority `8e9a9e54cc564896f83e4aedba92b57d73bce63f` is 42 commits behind `origin/develop`, `git show 8e9a9e54:...` and `git archive ... 8e9a9e54` fail immediately with `fatal: path '...' exists on disk, but not in '8e9a9e54cc564896f83e4aedba92b57d73bce63f'` or `fatal: Not a valid object name 8e9a9e54cc564896f83e4aedba92b57d73bce63f`.
- **Reproduction / Proof**:
  ```bash
  # In a shallow depth-1 clone of the repository:
  git clone --depth=1 file:///Volumes/fast/Github/oddspark /tmp/shallow-test
  cd /tmp/shallow-test
  git show 8e9a9e54cc564896f83e4aedba92b57d73bce63f:package.json
  # Output: fatal: path 'package.json' exists on disk, but not in '8e9a9e54cc564896f83e4aedba92b57d73bce63f'
  ```
- **Remediation**: In `.github/workflows/test.yml`, configure `actions/checkout@v4` with `fetch-depth: 0` so the full Git history is available locally in CI runners without credentials:
  ```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
  ```

---

## Detailed Evaluation Against Review Criteria

### 1. Authority & Evidence Source Manifest (`8e9a9e54cc564896f83e4aedba92b57d73bce63f`)
**Status: VERIFIED & CONFIRMED**

- Pinned commit `8e9a9e54cc564896f83e4aedba92b57d73bce63f` (`feat: re-qualify judge structural authority (ba52ec91, GO 20/20)`) is the exact immutable commit retaining the `ba52ec91` run.
- All 15 source files in `evidence.sources` match the tree at `8e9a9e54cc564896f83e4aedba92b57d73bce63f` with 100% SHA-256 parity:
  - `package.json`: `bbe7d7c9512bf6944c684867fe03052976349c07c5a0c444106c09b9c70ca7d1`
  - `spikes/judge-fidelity/contract.mjs`: `62f236799f4477dd10afd488a4331103aabb3cb00fc5b2a9b551a9228bcea2ed`
  - `spikes/judge-fidelity/evidence-v2.mjs`: `79e45ba8018be67d072f09b092493cf8b58ce961841ad50935231ea3b287e379`
  - `spikes/judge-fidelity/fixture-executor.mjs`: `bf31a9a618b5acf5feade7b1fc98b156f94ea70dfcd2671df1226323f1744f86`
  - `spikes/judge-fidelity/fixtures.json`: `8f2a4d7d3888abe8f39ee826d63d68ff171931c1a7b427e6adc85dc431823ec4`
  - `spikes/judge-fidelity/pricing.mjs`: `4ab46a4bd4ac34189a82344a4ca6540866364f7299aa9c5eb7e96c7572423b6e`
  - `spikes/judge-fidelity/qualification.mjs`: `cf4d15e2dd0d8579e26249603a16a9a00dd3ec2591e00f0bb34c6640cf305179`
  - `spikes/judge-fidelity/recovery-finder.mjs`: `514cb6537da3c4853576b013615c3d0ab907e001d46138ea6d4a28181d29f372`
  - `spikes/judge-fidelity/run.mjs`: `0aebe151eaee6bfea82fbcb2d526aaf22395cf1f535ce1becddf76937e8b984a`
  - `spikes/judge-fidelity/start-adapter.mjs`: `be5e8958f40c9b1f217cbf3bc6310c19bdc9276c5f5efc7e672b7b05baab7939`
  - `spikes/judge-fidelity/test.mjs`: `fd77eb207a0e7119879b61bfbe0ce4ff41c552bfc3eab32eb9bd9d11b3c65d94`
  - `spikes/judge-fidelity/worker.mjs`: `8101d91408b2a1dff65533107c94f2bf0bc6858236b600aaf0a6c20bc0da93e2`
  - `spikes/judge-fidelity/verify-launcher.mjs`: `4b493214762dfe77fa813fa0f4c3e1c23e1e1164ce2a7e2de8c63b88f2a8e6b3`
  - `spikes/judge-fidelity/verify-v2.mjs`: `fad9e45e6acc5266516ef92d67678bad3b3fcdd97a588f90d6eca7e8c71e48a5`
  - `spikes/judge-fidelity/wrangler.toml`: `70799cb70abb4fd3de5bfb04da359290c9226841acecb9be9ac309f80e42dd2d`
- All 4 publication members in the current checkout match `8e9a9e54` byte-for-byte:
  - `...-v2.json`: `051d5c7072d99a31de583b854cff6f1d3639b4ab113d472727d38d50c46abf75`
  - `...-v2.md`: `6e473cedd57f67078e95e3923edb6880e0aa5e231acf3a52eeffa6bb9e2ab259`
  - `...-v2.complete.json`: `80b6bddf3dc844494c8f19f93c293379c198ce032331a95ff77369eeb58e7d31`
  - `...-qualification.json`: `5456d91ae2154e7edf0dc1b48576cbdc59433dd106351478fdd9ff3243b1549b`

### 2. Byte Comparison Ordering & Marker Completeness
**Status: VERIFIED & CONFIRMED**

- `RETAINED_FILES` in [.github/verify-struct-judge-history.mjs:16-21](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/release-ci-gate-repair/.github/verify-struct-judge-history.mjs#L16-L21) contains all three files listed in `2026-08-24-ba52ec91-051d5c7072d99a31-f543d3d5-80d4-44f6-b7bf-41083197fcc9-v2.complete.json` as well as the `.complete.json` marker itself.
- `verifyRetainedBytes()` runs at line 84, before `reconstructPinnedCheckout()` (line 85) and before executing semantic verifiers `verify-v2.mjs` and `qualification.mjs` (lines 87-88).

### 3. Isolation & Contamination Defense
**Status: VERIFIED & CONFIRMED**

- `git archive --format=tar` extracts the immutable Git tree into a dedicated temporary directory (`mkdtemp`).
- The reconstructed tree does not inherit dirty workspace files or current checkout files.
- `ROOT` in `evidence-v2.mjs` is derived via `fileURLToPath(import.meta.url)` to `../..`, which resolves strictly to the isolated temp directory.
- `node_modules` is symlinked only to provide the pre-installed CLI binary (`wrangler 4.123.0`).

### 4. Toolchain Honesty & Pinned Node v24.18.0
**Status: VERIFIED & CONFIRMED**

- `package-lock.json` SHA-256 is `c5c31aa5474ec9d04a96a4744c5f41c4ffb2e644cbb0ec28950041edc60301ba`, identical between `8e9a9e54` and `HEAD`.
- `runtime-baseline.json` SHA-256 is `50d8e3fdb06b548a2b90d8f620cee6ed9620c33ed23314aa5f65db1ecec2cf35`, identical between `8e9a9e54` and `HEAD`.
- Reusing `node_modules` from `npm ci` is completely source-honest because the lockfile, Wrangler `4.123.0`, and Node `v24.18.0` are identical to the recorded execution environment.
- `verifyStructJudgeHistory()` strictly enforces `process.version === "v24.18.0"`.

### 5. Adversarial Testing Coverage
**Status: VERIFIED & CONFIRMED**

An expanded 8-case adversarial suite was executed against the repair harness:
1. `Baseline pass`: PASS (18 predicates, 79 fixtures, GO 2 refs).
2. `Evidence JSON byte mutation`: REJECTED before semantic verification.
3. `Markdown report byte mutation`: REJECTED before semantic verification.
4. `Completion marker byte mutation`: REJECTED before semantic verification.
5. `Qualification JSON byte mutation`: REJECTED before semantic verification.
6. `Drifting HEAD revision`: REJECTED.
7. `Non-existent / missing Git revision`: REJECTED (fails closed).
8. `Non-pinned Node version (v22.14.0)`: REJECTED with explicit version diagnostic.

### 6. Removal of DW-6 Self-Test Skip in `check-ci.mjs`
**Status: VERIFIED & CONFIRMED**

- `npm run check` includes `npm run spike:judge:self-test`.
- The self-test runs all 85 unit tests across 79 fixtures offline and credential-free, passing in ~90s.
- `check-ci.mjs` now runs every step in `package.json` `scripts.check`, eliminating the previous DW-6 skip.
- Current spike unit testing in `check-ci.mjs` and historical immutable STRUCT-JUDGE qualification in `verify-struct-judge-history.mjs` are distinct, complementary, and non-duplicative.

### 7. Workflow Integrity, Determinism & Credentials
**Status: DEFECT DETECTED ON SHALLOW CHECKOUT (See F-01)**

- Deterministic and credential-free: Confirmed. No network calls or secrets are needed.
- Shallow checkout compatibility: Failed due to missing `fetch-depth: 0` in `actions/checkout@v4`.

### 8. Preservation of Protected Surfaces
**Status: VERIFIED & CONFIRMED**

`git diff 779accf9d1aca14ecb374dab1108aa7098eb3283` confirms zero modifications to:
- `spikes/judge-fidelity/results/` (historical evidence unchanged)
- `runtime-assembly.json` (unchanged)
- `runtime-baseline.json` (unchanged)
- `src/` and `worker.js` (runtime assembly unchanged)
- `wrangler.toml` and `wrangler.offline.toml` (unchanged)
- `sprint-status.yaml` and `deferred-work.md` (unchanged)

---

## Test Execution Evidence

| Command | Status | Result |
| :--- | :--- | :--- |
| `node --test .github/verify-struct-judge-history.test.mjs` | PASS | 4/4 tests passed (5.9s) |
| `node .github/verify-struct-judge-history.mjs` | PASS | 18/18 predicates, 79 fixtures, GO (2 refs) |
| `npm run spike:judge:self-test` | PASS | 85/85 tests passed, 79 fixtures, 18 predicates |
| `npm run assembly:verify` | PASS | Identity `7ce7e16ac5e0feb2719d05e79f86dea410ab180a2f351f32402dc671403567a8` (18 modules) |
| `CI=1 node .github/check-ci.mjs` | PASS | All `npm run check` steps + semantic/how suites pass |
| Shallow clone reproduction | FAIL (Expected) | Proved F-01 failure under default `fetch-depth: 1` |

---

## Successor Instructions

1. **Fix F-01 in `.github/workflows/test.yml`**:
   Add `with: fetch-depth: 0` to `actions/checkout@v4`:
   ```yaml
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0
   ```
2. **Re-verify CI and test suites**:
   Run `.github/verify-struct-judge-history.test.mjs` and confirm the workflow YAML syntax is valid.
3. **Resubmit for final approval**:
   Once F-01 is remediated, this repair is ready for clean approval.
