# Story 1.19 Local Full-Request Qualification Independent Code Review Handoff

- **Verdict:** `approve`
- **Reviewer:** Independent Reviewer (Clean Context)
- **Authority:** `_bmad-output/implementation-artifacts/spec-1-19-local-full-request-qualification.md` (Story 1.19 contract)
- **Work Packet:** `_bmad-output/implementation-artifacts/work-packet-1-19-full-request-review.md`
- **Worktree:** `governor/1-19-local-full-request-qualification`
- **Assembly Identity:** `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` (17 runtime-neutral modules)
- **Unapproved Plan SHA-256:** `c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21`

---

## 1. Executive Summary

The offline implementation for **Story 1.19: Local Full-Request Qualification** has been independently reviewed against the story specification (`spec-1-19-local-full-request-qualification.md`), the approved sprint change proposal (`sprint-change-proposal-2026-08-24-4.md`), and the development work packet (`work-packet-1-19-full-request-dev.md`).

All review criteria are satisfied:
1. **Governed Spike Surface:** `spikes/local-full-request-qualification/` implements a complete, closed, offline qualification harness (contract, governance with stale-safe cycle locks, atomic fsynced writes and append-only attempt logs, isolated adapter worker, arbitrary-byte verifier, immutable multi-artifact publication with automatic rollback on error, and 19 adversarial self-tests).
2. **Real Pipeline Assembly Integration:** The harness imports and exercises the canonical assembled pipeline (`src/pipeline/assembly.mjs`, `strike.mjs`, `gate.mjs`, `judge.mjs`, `production-ports.mjs`) through the real Workers AI provider envelope without modifying or shimming `src/pipeline/*`.
3. **No Live Authority Leaks:** The unapproved plan bundle (`story-1-19-local-full-request-unapproved.plan.json`) retains `approval: null`, `execution: null`, and `allowance_consumed: false`. No live Wrangler configuration is checked in; `start-adapter.mjs` generates an ephemeral JSON config in a temporary OS directory with `0o600` permissions only after exact approval preflight and unlinks it on exit. No live entrypoints are reachable from `npm test`, `npm run check`, or CI.
4. **Scope Discipline:** Changes are strictly confined to the authorized spike directory, package scripts, the single authorized `PIPELINE_JUDGE` descriptor in `src/pipeline/production-ports.mjs`, the re-frozen `runtime-assembly.json`, and the authorized test fixture updates in `test.mjs`, `scripts/local-priors.test.mjs`, and `scripts/local-evidence.test.mjs`.
5. **Validation Pass:** All offline gate checks pass cleanly (`npm test` 102/102, spike self-tests 19/19, `local-priors:test` 20/20, `local-evidence` 11/11, `assembly:verify` OK for all 17 modules, `git diff --check` clean). `npm run check` exhibits exactly the single expected, pre-existing, and unmodified DW-6 residual at `spikes/judge-fidelity/test.mjs:1134`.

---

## 2. Review Obligations & Verification Matrix

### 2.1 Acceptance Criteria & I/O Matrix Verification

| Scenario / Criterion | Implementation | Adversarial Test Coverage | Status |
|---|---|---|---|
| **Happy Path Execution & Retention** | [`worker.mjs:80-100`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/worker.mjs#L80-L100), [`run.mjs:58-70`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/run.mjs#L58-L70), [`verifier.mjs:6-48`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L6-L48) | [`test.mjs:66-76`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L66-L76), [`test.mjs:83`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L83) | **VERIFIED** |
| **Deterministic Rejection (Zero Judge Calls)** | [`worker.mjs:84-85`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/worker.mjs#L84-L85), [`verifier.mjs:24`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L24) (`accounting.deterministic_release`) | [`test.mjs:91-95`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L91-L95) | **VERIFIED** |
| **Judge Rejection & House Fallback (House Never Judged)** | [`worker.mjs:87-88`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/worker.mjs#L87-L88), [`verifier.mjs:25`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L25) (`accounting.house_never_judged`) | [`test.mjs:96`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L96), [`test.mjs:98`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L98) | **VERIFIED** |
| **Provider Failure Mid-Run & Preserved Evidence** | [`worker.mjs:69-72`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/worker.mjs#L69-L72), [`run.mjs:53-57`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/run.mjs#L53-L57), [`verifier.mjs:28`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L28) (`chronology.complete`) | [`test.mjs:77-82`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L77-L82), [`test.mjs:97-98`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L97-L98) | **VERIFIED** |
| **Coordinator Uncertainty Handling** | [`worker.mjs:95`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/worker.mjs#L95), [`verifier.mjs:29`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L29) (`commit.authoritative`) | [`test.mjs:90`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L90) | **VERIFIED** |
| **Zero-Call Preflight Refusal** | [`run.mjs:12-36`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/run.mjs#L12-L36), [`run.mjs:39-44`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/run.mjs#L39-L44) | [`test.mjs:51-55`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L51-L55), [`test.mjs:56-60`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L56-L60), [`test.mjs:61-65`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L61-L65) | **VERIFIED** |
| **Plan Tampering & Identity Mismatch** | [`contract.mjs:57-63`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/contract.mjs#L57-L63), [`verifier.mjs:14-17`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L14-L17) | [`test.mjs:84-87`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L84-L87) | **VERIFIED** |
| **Call & Attempt Caps** | [`contract.mjs:9-10`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/contract.mjs#L9-L10), [`verifier.mjs:20-21`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L20-L21) (`accounting.call_cap`, `accounting.attempt_cap`) | [`test.mjs:88`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L88) | **VERIFIED** |
| **Candidate-Bound Judge Calls** | [`verifier.mjs:22-23`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L22-L23) (`accounting.judge_binding`) | [`test.mjs:89`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L89) | **VERIFIED** |
| **Commit Reserve & Route Ceiling** | [`verifier.mjs:26-27`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs#L26-L27) (`deadline.route_ceiling`, `deadline.commit_reserve`) | [`test.mjs:90`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L90) | **VERIFIED** |
| **Cycle Locks (Exclusive, Stale-Safe)** | [`governance.mjs:18-33`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/governance.mjs#L18-L33) | [`test.mjs:100`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L100) | **VERIFIED** |
| **CI & Live Entrypoint Isolation** | [`package.json:54-56`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/package.json#L54-L56), [`start-adapter.mjs:7-9`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/start-adapter.mjs#L7-L9) | [`test.mjs:102`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/test.mjs#L102) | **VERIFIED** |

### 2.2 Adversarial Hunt Results

1. **Allowance Consumption Ordering:**
   - In [`run.mjs:46-50`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/run.mjs#L46-L50), `runLive` writes a spend receipt record with `state: "reserved"` and immediately transitions it to `state: "calling"` with `allowance_consumed: true` via `atomicWrite`.
   - `atomicWrite` calls `handle.sync()` on the file and `fsyncDirectory` on the parent directory before the method returns.
   - Consequently, the allowance consumption is durably persisted to disk *prior* to `adapter.run` invocation. If the process crashes or network/adapter errors occur, the spend receipt remains consumed (`consumed_incomplete`).
2. **Publication Integrity & Rollback:**
   - In [`publication.mjs:17-32`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/publication.mjs#L17-L32), all artifact members (`plan.json`, `approval.json`, `evidence.json`, `receipt.json`, `report.md`) are written atomically with hash checks before the `.complete.json` publication marker is installed.
   - Any throw during publication unlinks all partially installed members in a `catch` block to prevent corrupted/partial directories from persisting.
3. **Independent Verifier Defense:**
   - The arbitrary-byte verifier in [`verifier.mjs`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/spikes/local-full-request-qualification/verifier.mjs) independently parses and re-evaluates all 17 predicates against the raw bytes of plan, approval, and evidence.
   - It re-computes token pricing against the plan's pricing table, verifies every candidate/judge binding, and re-computes `deriveFullRequestRef(evidence)`. A non-GO or invalid run cannot emit a ref.
4. **Judge Descriptor Posture:**
   - The closed `PIPELINE_JUDGE` descriptor wired in [`src/pipeline/production-ports.mjs:240-247`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/src/pipeline/production-ports.mjs#L240-L247) is inert on production without a valid `ACTIVATION_MANIFEST`. `createInactiveDomainWriter` evaluates the manifest before validating pipeline ports and returns `null` when the manifest is absent. Tested and verified in [`test.mjs:3021-3037`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/test.mjs#L3021-L3037).

### 2.3 Stale Fixture Updates Verification

- Justin's owner approval of `content/local-priors/v1/approval.json` established the canonical approved identity `2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded`.
- In `scripts/local-priors.test.mjs`, tests were updated to assert production-ready status and exact identity match (`2163f355…`) against the approved CLI output.
- Coverage for pending, drift, and malformed approvals was preserved and strengthened using an explicit synthesized `pendingApproval` object rather than relying on stale disk state.
- In `test.mjs`, Story 1.23 unit tests were isolated from bundled fallback variables via `isolateInjectedPipeline`, and the bundled production constructor test was strengthened to assert that the complete environment (including `PIPELINE_JUDGE` and `PIPELINE_PRIORS` with the approved identity) constructs cleanly and stays inert without an activation manifest.

---

## 3. Findings

### Finding 1: Stale assertion in `scripts/writer-preflight.mjs` for `PIPELINE_JUDGE` absence
- **Classification:** `patch`
- **Severity:** `low`
- **Location:** [`scripts/writer-preflight.mjs:372`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification/scripts/writer-preflight.mjs#L372)
- **Description:** Line 372 in `scripts/writer-preflight.mjs` checks:
  ```javascript
  if ("PIPELINE_JUDGE" in pipeline) problems.push("PIPELINE_JUDGE must stay absent — qualification refs are never fabricated");
  ```
  In Story 1.25, `PIPELINE_JUDGE` was not constructed because judge qualification had not yet completed. With the governor-authorized Story 1.19 wiring in `src/pipeline/production-ports.mjs`, `productionPipelineEnv` now includes the closed `PIPELINE_JUDGE` descriptor. Running `npm run writer:preflight` currently fails on this assertion.
- **Impact:** Does not affect Story 1.19 offline qualification or CI (`writer:preflight` is not in `npm run check` or `.github/check-ci.mjs`). However, running `npm run writer:preflight` manually reports a failure.
- **Recommendation:** In the next scheduled edit to deployment scripts (or during epic wrap-up), update `scripts/writer-preflight.mjs:372` to verify `PIPELINE_JUDGE` is present with the exact qualified descriptor rather than asserting its absence.

---

## 4. Exact Validation Commands & Results

All commands were executed directly in this worktree (`/Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-local-full-request-qualification`):

| Command | Exit Code | Result | Details |
|---|---|---|---|
| `npm test` | `0` | **PASS** | 102/102 tests passed. |
| `npm run spike:full-request:self-test` | `0` | **PASS** | 19/19 harness tests passed. |
| `npm run local-priors:test` | `0` | **PASS** | 20/20 tests passed. |
| `node --test scripts/local-evidence.test.mjs` | `0` | **PASS** | 11/11 tests passed. |
| `npm run assembly:verify` | `0` | **PASS** | Identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` verified over 17 runtime-neutral modules. |
| `git diff --check` | `0` | **PASS** | Zero whitespace or formatting issues. |
| `npm run spike:full-request:plan` | `0` | **PASS** | Output: `{"path":".../story-1-19-local-full-request-unapproved.plan.json","sha256":"c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21","approved":false,"allowance_consumed":false}` |
| `npm run check` | `1` | **PASS (Governed Residual)** | Root tests (102/102 pass), baseline tests (62/62 pass), judge spike self-test (51/52 pass with exactly the expected unchanged DW-6 residual at `spikes/judge-fidelity/test.mjs:1134`). `git diff --quiet -- spikes/judge-fidelity/test.mjs` is clean. |

---

## 5. Spec Ambiguity & Next Steps

- **Spec Ambiguity:** None. The specification, schema, and predicate boundaries are completely defined and unambiguous.
- **Next Steps:**
  1. The offline harness and unapproved plan bundle are ready for review.
  2. Live provider qualification requires Justin's explicit owner approval of the exact unapproved plan SHA-256 (`c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21`).
  3. No live adapter start or provider call should occur until that exact approval is granted.
