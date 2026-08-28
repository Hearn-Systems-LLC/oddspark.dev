# Story 1.19 Activation Manifest v2 Independent Code Review Handoff

- **Verdict:** `approve`
- **Reviewer:** Independent Reviewer (Clean Context)
- **Authority:** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-24-4.md` (approved by Justin, 2026-08-24)
- **Worktree:** `governor/1-19-direct-path-activation-authority`
- **Assembly Identity:** `446628799d96f044ea9f5bdb48d01477559b97c96ec15b58b676cf06f99307a5` (17 runtime-neutral modules)

---

## 1. Review Summary

The changes implement the approved Direct-Path Activation Authority proposal (`sprint-change-proposal-2026-08-24-4.md`) by:
1. Updating `src/pipeline/activation.mjs` to define `PRODUCTION_ACTIVATION_VERSION = 2`, dropping `semantic_ref` from the closed key set, and enforcing the domain separation prefix `oddspark-production-activation/v2\n` during `deriveActivationRef`.
2. Updating `test.mjs` to validate the closed v2 manifest schema, reject `version: 1` and `semantic_ref` keys, assert the v2 hash domain, and update pipeline test fixtures.
3. Updating `runtime-assembly.json` and `spec-1-23-worker-runtime-assembly.md` with the refrozen assembly identity `446628799d96f044ea9f5bdb48d01477559b97c96ec15b58b676cf06f99307a5`.
4. Updating planning artifacts (`ARCHITECTURE-SPINE.md`, `epics.md`, `prd.md`) to reflect direct-path activation authority under the approved override.

All code and offline gate checks pass cleanly. No protected files (`sprint-status.yaml`, `wrangler*.toml`, `.github/`, `.env*`) were touched. No commits, pushes, provider calls, deploys, or activations occurred.

---

## 2. Answers to Review Questions

### Question 1: Closed key set and rejection of v1 manifests
> *Does v2 reject every v1-shaped manifest (any `semantic_ref` key, `version: 1`) and accept only the closed v2 key set? Try to construct a manifest that validates but should not, or vice versa.*

**Answer: Yes.**

**Evidence:**
- `validateProductionActivationManifest` in [`src/pipeline/activation.mjs:36-40`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L36-L40) defines the exact 10-key closed array:
  `["version", "deployed_source_identity", "generation_ref", "judge_ref", "local", "domain", "house_catalog_ref", "receiver_ref", "receipt_claim_ref", "outcome"]`.
- `closed(value, keys)` ([`src/pipeline/activation.mjs:29-33`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L29-L33)) enforces `Object.keys(value).length === keys.length` and `keys.every((key) => Object.hasOwn(value, key))`.
- If any v1 manifest containing `semantic_ref` is presented:
  - If `semantic_ref` is an extra 11th key, `closed` fails immediately with `activation_manifest_not_closed`.
  - If `semantic_ref` replaces any of the 10 valid keys (keeping length 10), `closed` fails with `activation_manifest_not_closed`.
- If a manifest has `version: 1` with the 10 valid keys, `closed` passes but [`src/pipeline/activation.mjs:41-43`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L41-L43) rejects it with `activation_manifest_version`.
- Sub-objects `local` (keys: `["enabled", "full_request_ref"]`) and `domain` (keys: `["enabled", "evidence_ref", "full_request_ref"]`) are strictly closed via [`src/pipeline/activation.mjs:46-48`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L46-L48).
- Additional strict checks:
  - `outcome === "active"` ([line 44](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L44))
  - `deployed_source_identity` is non-empty trimmed string ([line 45](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L45))
  - `generation_ref`, `judge_ref`, `house_catalog_ref` match `/^[a-f0-9]{64}$/` ([line 52](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L52))
  - Mode ref nullability is exact based on `.enabled` boolean status ([lines 63-70](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L63-L70))
  - Rejects if neither mode is enabled (`activation_manifest_no_mode`, [line 71](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L71))

Adversarial testing probes confirmed all boundary scenarios reject properly and valid v2 manifests validate without error.

---

### Question 2: Hash domain separation
> *Is the hash domain `oddspark-production-activation/v2` used and asserted, so no v1 bytes can derive a v2 `activation_ref`?*

**Answer: Yes.**

**Evidence:**
- In [`src/pipeline/activation.mjs:75-79`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/src/pipeline/activation.mjs#L75-L79), `deriveActivationRef` computes:
  `sha256Hex("oddspark-production-activation/v2\n" + canonicalJson(manifest))`.
- Before computing the hash, `deriveActivationRef` invokes `validateProductionActivationManifest(manifest)` and throws `TypeError` if invalid. A v1 manifest will always fail validation and cannot derive an activation ref.
- In [`test.mjs:2250-2254`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/test.mjs#L2250-L2254), the test suite explicitly asserts:
  ```javascript
  assert.equal(
    valid.activation_ref,
    sha256Hex(`oddspark-production-activation/v2\n${canonicalJson(fixture.manifest)}`),
    "v2 refs must derive under the v2 hash domain",
  );
  ```
- Because of domain prefix separation, even if a v1 payload had identical fields, `sha256("oddspark-production-activation/v1\n...") !== sha256("oddspark-production-activation/v2\n...")`.

---

### Question 3: Planning artifacts consistency and active requirements
> *Do the epics/spine/PRD edits contain any remaining active requirement for a semantic ref, specialist waterfall, or twelve-call ledger that would contradict the code? Cite line numbers.*

**Answer: No active contradicting requirements remain.**

**Evidence:**
- **`ARCHITECTURE-SPINE.md`**:
  - [Lines 27–41](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md#L27-L41) establish the "2026-08-24 Simplification Override" section, which explicitly states:
    > *"This decision supersedes every active three-specialist, twelve-call, specialist-qualification, and composite-specialist-authority rule elsewhere in this document. Those passages remain historical context only."*
    > *"Activation authority under this override (sprint-change-proposal-2026-08-24-4, Justin 2026-08-24): `ProductionActivationManifest` v2 binds `generation_ref` (structural), `judge_ref` (structural role ref of the single quality judge), `house_catalog_ref`, and per-mode full-request refs; hash domain `oddspark-production-activation/v2`. No semantic ref exists or is required. `ActivationRecord.kind` is exactly one of `activation_manifest|source_identity|runtime_identity|generation_role|judge_role|qualification_report|full_request|evidence_role|house_catalog|receiver|receipt_claim`. The `DeadlineAuthorityManifest`, twelve-token ledger, specialist expectation/semantic/composite manifests, and specialist record kinds in AD-9 and AD-11 below are superseded historical context. The orchestrator's existing bounded attempts, owner-approved route ceiling, and commit reserve remain; Story 1.19 measures the direct path and emits the local full-request ref."*
  - [Line 197](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md#L197) (Verification row): Updated to 3 tiers: deterministic Gate fixtures, structural qualification for generation and single quality judge, and Story 1.19 direct-path full-request evidence.
  - [Line 227](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md#L227) (Production judge pipeline row): Updated to "Disabled until the judge structural role and local full-request evidence are current".
  - [Line 259](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md#L259) (CAP-3 row): Updated to "Gate + one structurally qualified lightweight quality judge + orchestrator + house Briefs".
  - [Line 265](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md#L265) (Deferred): "Story 1.18.2 owns only the direct single-judge contract; no semantic qualification authority is required (2026-08-24 override)."
- **`prd.md`**:
  - [Line 147](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/prd.md#L147): Overridden with explicit footnote:
    > *"*(2026-08-24 override, sprint-change-proposal-2026-08-24-4: under the direct single-judge design no semantic qualification threshold gates production; Stories 1.18/1.18.1 remain retained NO-GO history. Owner review (Story 3.3) and the quiet-production checkpoint (Story 3.5) are the post-activation quality controls.)*"*
- **`epics.md`**:
  - [Lines 71–100](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/epics.md#L71-L100) (Story 1.19): Rescoped to direct pipeline without specialist waterfall / twelve-call ledger / semantic ref.
  - [Lines 106–119](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/epics.md#L106-L119) (Story 1.20): Updated to generation structural, judge structural, full-request, catalog, receiver, and claim refs; shared generation and judge refs appear once.
  - [Lines 125, 134](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/epics.md#L125-L134) (Story 1.26): Updated to `LOCAL-FULL-REQUEST`, generation/judge refs only.
  *(See Informational Finding 1 regarding un-edited future story text in 1.25 / Epic 2 / Epic 3).*

---

### Question 4: Scope, safety, and protected files
> *Anything out of scope, unsafe, or that mutates protected files (`sprint-status.yaml`, `wrangler*.toml`, `.github/`, `.env*`)?*

**Answer: No.**

**Evidence:**
- Inspection of `git status` / `git diff`:
  - `sprint-status.yaml` — Untouched.
  - `wrangler.toml` — Untouched.
  - `wrangler.offline.toml` — Untouched.
  - `.github/` — Untouched.
  - `.env*` — None exist / untouched.
- The 7 files modified match exactly the scope authorized by `sprint-change-proposal-2026-08-24-4.md`:
  1. `_bmad-output/implementation-artifacts/spec-1-23-worker-runtime-assembly.md`
  2. `_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md`
  3. `_bmad-output/planning-artifacts/epics.md`
  4. `_bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/prd.md`
  5. `runtime-assembly.json`
  6. `src/pipeline/activation.mjs`
  7. `test.mjs`
- No provider execution, deployment, or activation was initiated. All execution is offline and deterministic.

---

## 3. Findings Ordered by Severity

### [Low / Informational] Finding 1: Story 1.25 AC 1 mentions `combined SEMANTIC, local FULL-WATERFALL`
- **Location:** [`_bmad-output/planning-artifacts/epics.md:1005`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/epics.md#L1005)
- **Description:** Story 1.25 Acceptance Criteria 1 currently reads:
  `Given the deployed reader and current judge-pipeline, STRUCT-GENERATION, combined SEMANTIC, local FULL-WATERFALL, and house-catalog refs`.
- **Impact / Failing Scenario:** In proposal `-4`, Section 4 ("Detailed Change Proposals") explicitly specified amendments for Stories 1.19, 1.20, and 1.26, but omitted Story 1.25 from its explicit list. The overriding paragraph in `ARCHITECTURE-SPINE.md:40` governs and supersedes this across all stories. However, when Story 1.25 is drafted, if an implementer reads Story 1.25 AC 1 in isolation without consulting the spine override, they might expect a semantic ref gate.
- **Recommendation:** When Story 1.25 spec is authored, align Story 1.25 AC 1 to reference `current STRUCT-GENERATION, judge structural, local LOCAL-FULL-REQUEST, and house-catalog refs` consistent with Stories 1.20 and 1.26.

### [Low / Informational] Finding 2: Epic 1 Overview summary in `epics.md` lines 67–68
- **Location:** [`_bmad-output/planning-artifacts/epics.md:67-68`](file:///Volumes/fast/Github/oddspark/.bmad-governor/worktrees/1-19-direct-path-activation-authority/_bmad-output/planning-artifacts/epics.md#L67-L68)
- **Description:** The introductory bullet points at the top of Epic 1 still mention "Four current verification tiers" and "combined semantic identity".
- **Impact:** Non-blocking context text overridden by `ARCHITECTURE-SPINE.md:40` and Story 1.19/1.20/1.26 ACs.
- **Recommendation:** Can be cleaned up during Epic 1 retro/wrap-up.

---

## 4. Commands Executed and Results

| Command | Result | Notes |
|---|---|---|
| `npm test` | **PASS** (102/102 passed) | Full test suite passed offline |
| `npm run check` | **PASS** (all 19 sub-suites passed) | Full offline verification passed: unit tests, baseline verify, spike self-tests, semantic voice, local priors, local evidence, generation, brief contracts/receipts/rendering, house briefs, composite gate, strike orchestrator, type check, config check, assembly test, reader preflight, and assembly verify |
| `npm run assembly:verify` | **PASS** | Assembly identity `446628799d96f044ea9f5bdb48d01477559b97c96ec15b58b676cf06f99307a5` verified over 17 runtime-neutral modules |
| `git diff --check` | **PASS** (clean, exit code 0) | No whitespace, newline, or merge marker issues |
| `git status` | **PASS** | Exactly 7 expected modified files, 0 protected files touched, 0 staged changes |
