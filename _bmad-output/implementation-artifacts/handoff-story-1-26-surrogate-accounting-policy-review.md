# Story 1.26 Conservative Surrogate Accounting Policy Independent Review Handoff

Date: 2026-08-26
Reviewer: Independent Adversarial Reviewer
Baseline / HEAD: `f34c1e3ec3c8a8635de5a0e79e6a7eef72d37b01` on `develop` (equal to `origin/develop`)
Reviewed Run ID: `story-1-26-judge-requalification-20260826-r3`
Attempt ID: `cc246aab-3c0e-4a75-b237-07d0edc60652`
Developer Handoff: `_bmad-output/implementation-artifacts/handoff-story-1-26-surrogate-accounting-policy.md`
Owner Decision Artifact: `_bmad-output/implementation-artifacts/story-1-26-owner-decision-conservative-surrogate-accounting-2026-08-26.json`
Stage 2 r3 Reconciliation Artifact: `_bmad-output/implementation-artifacts/story-1-26-stage2-r3-surrogate-accounting-reconciliation-2026-08-26.json`
Stage 3 Unapproved Plan: `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json`
Review Action Verdict: **APPROVE**
Prospective Story 1.26 Stage 2 Verdict: **STAGE 2 r3 RECONCILED ACCEPTED**
Historical Story 1.26 Stage 2 Verdict: **ACCOUNTING NO-GO (PRESERVED UNCHANGED)**
Stage 3 Authority State: **CANONICAL PLAN GENERATED / UNAPPROVED AND UNEXECUTED**

---

## 1. Executive Summary & Verdict

An independent adversarial review was executed in `/Volumes/fast/Github/oddspark` against exact repository baseline `f34c1e3ec3c8a8635de5a0e79e6a7eef72d37b01` over the complete seven-path working-tree change introducing the Story 1.26 conservative surrogate accounting policy, Stage 2 r3 reconciliation, and canonical unapproved Stage 3 plan.

Zero provider API calls were made and no adapter was started during this review. The developer handoff was not trusted; all cryptographic hashes, canonical JSON encodings, token arithmetic, cost calculations, neuron conversions, cap compliance checks, prerequisite references, mutation tests, and contract invariants were independently verified from raw filesystem bytes.

### Independent Review Verdict: **APPROVE**

1. **Owner Decision**: Faithfully captures the verbatim decision (`"accept conservative surrogate accounting for unpriced endpoints"`), strictly confined to Story 1.26, conservatively requiring complete token usage, surrogate rates bounded below by the highest frozen rate among priced endpoints, strict cap compliance, free-first ordering, and fail-closed handling on any deviation.
2. **Historical Preservations**: The historical Stage 2 r3 accounting NO-GO verdict and all retained plan, approval, receipt, evidence, completion marker, and qualification bytes remain strictly preserved and bit-for-bit identical.
3. **Stage 2 Reconciliation**: The reconciliation binds the exact owner decision (`830ac2e4...`), r3 plan ref (`a3fce39d...`), approval (`7bfca70b...`), terminal attempt receipt (`8ab332d3...`), completion marker (`fad7ae13...`), and qualification bundle (`40677c50...`). Acceptance identity `02ac4f5a05b17bbe3d19a3492793d0c461c6da6dabe6c31d34cf7083e13ce1dc` independently recomputes.
4. **Independent Arithmetic**: Exact priced 70B cost is `$0.033470309999999996` (3,042.755454545454 neurons); 8B conservative surrogate cost is `$0.03148356` (2,862.141818181818 neurons); combined conservative exposure is `$0.06495387` (5,904.897272727273 neurons), strictly within the approved `$0.3054702` / `27,770.018181818185`-neuron and 42-call caps.
5. **Stage 3 Prerequisite Satisfaction**: The accepted Stage 1 generation refs (`cf602f14...`, `0473102c...`) and prospective Stage 2 reconciled judge ref (`64691773...`) satisfy the current governed Stage 3 creator contract against frozen assembly `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`.
6. **Stage 3 Plan Integrity**: The Stage 3 plan at `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json` is canonical, creator-produced, unapproved (`status: "unapproved"`), unexecuted (`execution: null`), with allowance false (`allowance_consumed: false`), zero provider calls, run ID `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`, and SHA-256 `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9`.
7. **Clean Boundaries & Safety**: No owner decision was stretched into Stage 3 approval, execution, deployment, signing, activation, or broader project policy. All protected boundaries hold.

---

## 2. Findings Ordered by Severity

### Critical Findings: None (0)
No security violations, unauthorized provider calls, premature approvals, or cryptographic mismatches were detected.

### Major Findings: None (0)
No contract violations, cap breaches, or data corruptions were found.

### Minor Findings: None (0)
All fail-closed mutation tests and verifiers passed cleanly.

### Informational / Low Observations:
1. **[LOW-01] Plan-Frozen Conservative Surrogate vs. Provider Billing**:
   The `@cf/meta/llama-3.1-8b-instruct-fast` endpoint lacks authoritative per-token pricing in the Cloudflare public catalog. The accepted spend figure of `$0.03148356` is an authorized conservative surrogate based on 70B rates, not observed provider invoice billing. This distinction is clearly disclosed and documented in both the owner decision and reconciliation records.
2. **[LOW-02] Free Neuron Remaining Balance Uncertainty**:
   The Cloudflare account's real-time remaining free neuron balance was not dynamically observable via offline logs. The reconciliation correctly implements free-first ordering and records a paid range from `0` to `5,904.897272727273` neurons, proving that even under worst-case 100% paid attribution (`$0.06495387`), spend remains within the approved `$0.3054702` cap.
3. **[LOW-03] Stage 3 Authority Separation**:
   The generated Stage 3 plan is strictly unapproved and provides zero execution authority. A separate, fresh owner approval referencing exact plan SHA-256 `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9` is required before starting the adapter or executing Stage 3.

---

## 3. Owner Decision Scope & Semantics Verification

The owner decision artifact `story-1-26-owner-decision-conservative-surrogate-accounting-2026-08-26.json` (SHA-256 `830ac2e4254a768102bdaa56e719d0e7ba9a90862af57c829c79703b9429548c`) was verified against the required governance invariants:

| Decision Invariant | Specification Requirement | Verification Evidence | Status |
|---|---|---|:---:|
| **Verbatim Quote** | `"accept conservative surrogate accounting for unpriced endpoints"` | `decision.decision_verbatim === "accept conservative surrogate accounting for unpriced endpoints"` | **PASS** |
| **Scope Limitation** | Confined strictly to Story 1.26 Stage 2 r3 & Stage 3 prerequisite reconciliation | `scope.generalizes_beyond_story_1_26: false`, `scope.kind: "prospective-accounting-policy"` | **PASS** |
| **Historical Immutability** | Historical packet bytes and original accounting verdict are immutable | `scope.historical_bytes_mutable: false`, `historical_verdict.preserved: true`, `original_stage_2_r3_accounting_verdict: "NO-GO"` | **PASS** |
| **Minimum Conservatism** | Surrogate rates must be at least the highest authoritative frozen rate among priced endpoints | `rates.plan_frozen_surrogate.prompt >= rates.highest_authoritative_frozen.prompt` ($0.29/M vs $0.29/M), `completion >= completion` ($2.25/M vs $2.25/M) | **PASS** |
| **Usage Completeness** | Usage tokens must be complete on every call | Complete usage across all 42 calls (43,428 prompt + 23,271 completion = 66,699 tokens) | **PASS** |
| **Cap Compliance** | Computed spend must remain within approved caps | 42 calls <= 42 calls, `$0.06495387 <= $0.3054702`, `5904.897 <= 27770.018` neurons | **PASS** |
| **Free-First Ordering** | Free neurons apply first, paid neurons bounded by plan cap | `free_neuron_ordering: "free-first-then-paid-bounded-by-plan-cap"`, worst-case paid `$0.06495387` | **PASS** |
| **Fail-Closed Standard** | Missing usage, missing binding, cap breach, rate undercutting, or substitution fails closed | Verified via 4 mutation vectors in `surrogate-accounting.test.mjs` | **PASS** |

---

## 4. Exact Independent Identities & Recomputation

Every cryptographic binding and identity was independently derived and verified:

```
====================================================================================================
ARTIFACT IDENTIFIERS AND CRYPTOGRAPHIC BINDINGS
====================================================================================================
Owner Decision Path:        _bmad-output/implementation-artifacts/story-1-26-owner-decision-conservative-surrogate-accounting-2026-08-26.json
Owner Decision SHA-256:     830ac2e4254a768102bdaa56e719d0e7ba9a90862af57c829c79703b9429548c
Owner Decision Binding:     MATCHES reconciliation.bindings.owner_decision.sha256

Reconciliation Path:        _bmad-output/implementation-artifacts/story-1-26-stage2-r3-surrogate-accounting-reconciliation-2026-08-26.json
Reconciliation SHA-256:     cdf19202505a401399725fe660d84583b4a1c88a4b235898c2e742c2fc15f328
Recorded Acceptance ID:     02ac4f5a05b17bbe3d19a3492793d0c461c6da6dabe6c31d34cf7083e13ce1dc
Derived Acceptance ID:      02ac4f5a05b17bbe3d19a3492793d0c461c6da6dabe6c31d34cf7083e13ce1dc
Acceptance Identity Match:  EXACT MATCH

Retained r3 Plan:           spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan.json
Retained r3 Plan SHA-256:   1f4fb793a4ff9a7dc5ab0da37d031134ad3e98a525329385ee5a9f827d1f2863 (MATCH)
Retained r3 Plan Ref:       a3fce39dc2af1afd34d36fa65d0005dab9c6a176ada118bb0d074771f4a19083 (MATCH)

Retained r3 Approval:       spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan-approval.json
Retained r3 Approval SHA:   7bfca70b1e228193bb129793a607714b384f203e32fb288afd1ecb8529ff8767 (MATCH)
Retained r3 Approval Run:   story-1-26-judge-requalification-20260826-r3 (MATCH)

Retained r3 Receipt:        spikes/judge-fidelity/results/.judge-llama-cycle-successor-spend.json
Retained r3 Receipt SHA:    8ab332d3e2a0ece14c44aa2d18d9bbd3b94f6a45a291bde19b8dc10d27932c76 (MATCH)
Retained r3 Attempt ID:     cc246aab-3c0e-4a75-b237-07d0edc60652 (MATCH)

Retained r3 Marker:         spikes/judge-fidelity/results/2026-08-26-story-1--44d8a8a7744d86fc-cc246aab-3c0e-4a75-b237-07d0edc60652-v2.complete.json
Retained r3 Marker SHA:     fad7ae13f9f55ec322939767c512e3577adc63d59848020c73efa6f3e2df8bd8 (MATCH)

Retained r3 Qualification:  spikes/judge-fidelity/results/2026-08-26-story-1--44d8a8a7744d86fc-cc246aab-3c0e-4a75-b237-07d0edc60652-qualification.json
Retained r3 Qual SHA:       40677c50aa352877a6a691388f8a7c825c9caf0bb990c6df3ef5570db90c6622 (MATCH)
Retained r3 Judge Role Ref: 64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799 (MATCH)
====================================================================================================
```

---

## 5. Independent Token Usage, Pricing & Arithmetic Verification

### Complete Token Count Audit:
- **Priced Model (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)**:
  - 21 provider calls (1 probe + 20 trials)
  - Prompt tokens: `21,714`
  - Completion tokens: `12,077`
  - Total tokens: `33,791`
- **Unpriced Model (`@cf/meta/llama-3.1-8b-instruct-fast`)**:
  - 21 provider calls (1 probe + 20 trials)
  - Prompt tokens: `21,714`
  - Completion tokens: `11,194`
  - Total tokens: `32,908`
- **Combined Token Totals (42 calls)**:
  - Combined prompt tokens: `43,428`
  - Combined completion tokens: `23,271`
  - Total token volume: `66,699`

### Exact Rate & Dollar Arithmetic:
- **Rate Basis**:
  - Highest authoritative frozen prompt rate: `$0.00000029` ($0.29 / million)
  - Highest authoritative frozen completion rate: `$0.00000225` ($2.25 / million)
  - Plan-frozen surrogate prompt rate: `$0.00000029`
  - Plan-frozen surrogate completion rate: `$0.00000225`
  - Standard neuron conversion factor: `$0.000011 / neuron`

- **Calculations**:
  $$\text{Priced 70B Cost} = (21,714 \times 0.00000029) + (12,077 \times 0.00000225) = \$0.00629706 + \$0.02717325 = \mathbf{\$0.033470309999999996}$$
  $$\text{Priced 70B Neurons} = \frac{\$0.033470309999999996}{\$0.000011} = \mathbf{3,042.755454545454}\text{ neurons}$$

  $$\text{Surrogate 8B Cost} = (21,714 \times 0.00000029) + (11,194 \times 0.00000225) = \$0.00629706 + \$0.02518650 = \mathbf{\$0.03148356}$$
  $$\text{Surrogate 8B Neurons} = \frac{\$0.03148356}{\$0.000011} = \mathbf{2,862.141818181818}\text{ neurons}$$

  $$\text{Combined Conservative Cost} = \$0.033470309999999996 + \$0.03148356 = \mathbf{\$0.06495387}$$
  $$\text{Combined Conservative Neurons} = \frac{\$0.06495387}{\$0.000011} = \mathbf{5,904.897272727273}\text{ neurons}$$

### Cap Verification:
- **Approved Call Cap**: `42` calls $\rightarrow$ Observed: `42` calls ($\le 42$) $\rightarrow$ **PASS**
- **Approved Maximum Cost**: `\$0.3054702` $\rightarrow$ Observed Conservative: `\$0.06495387` ($\le \$0.3054702$) $\rightarrow$ **PASS**
- **Approved Maximum Neurons**: `27,770.018181818185` $\rightarrow$ Observed Conservative: `5,904.897272727273` ($\le 27,770.018181818185$) $\rightarrow$ **PASS**
- **Daily Free Neuron Allocation**: `10,000` neurons ($0.11 value). Free-first ordering applies; remaining unobserved free neurons bound paid spend to $[0, \$0.06495387]$, fully inside all approved caps.

---

## 6. Stage 3 Creator Prerequisite & Contract Satisfaction

The Stage 3 qualification plan prerequisites were evaluated against current committed runtime authorities:

| Prerequisite Component | Bound Reference Hash | Authority Source | Status |
|---|---|---|:---:|
| **Runtime Assembly Identity** | `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` | Committed `scripts/runtime-assembly.json` (18 modules) | **PASS** |
| **Stage 1 Generation Config** | `cf602f143373958591b7a4954ec2ebe951160af45fa0fc45802eb0d96030f90c` | Accepted Stage 1 qualification | **PASS** |
| **Stage 1 Generation Role** | `0473102c40734947c91e8c605e6ae8e03b1e895a8c5b18867a9579dbb6abe514` | Accepted Stage 1 qualification | **PASS** |
| **Stage 2 Judge Role Ref** | `64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799` | Prospectively accepted Stage 2 reconciliation | **PASS** |
| **House Brief Catalog Ref** | `9334910e17f7fa610ee2a18d54b1485bf19d00b866f8e7cd8f5258a0d17e9ad8` | Committed house brief catalog contract | **PASS** |
| **Priors Ref** | `2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded` | Committed local priors contract | **PASS** |
| **Activation Version** | `2` | Pinned activation preflight version | **PASS** |

---

## 7. Stage 3 Canonical Unapproved Plan Verdict

The Stage 3 qualification plan artifact `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json` was independently inspected and validated against `spikes/local-full-request-qualification/contract.mjs`:

1. **Creator Derivation**: Executing `createUnapprovedPlan` with the verified authorities and limits produced canonical bytes byte-for-byte identical to the on-disk file.
2. **Plan SHA-256 / Ref**: `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9`.
3. **Run ID**: `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`.
4. **Limits**:
   - `route_ceiling_ms`: `120000` (120 s)
   - `commit_reserve_ms`: `1000` (1 s)
   - `provider_timeout_ms`: `19833` ($=\lfloor (120000 - 1000) / 6 \rfloor$)
   - `call_cap`: `6` provider calls
   - `attempt_cap`: `3` attempts
   - `maximum_cost_usd`: `0.06` ($0.060000)
5. **Authority State**:
   - `status`: `"unapproved"`
   - `approval`: `null`
   - `execution`: `null`
   - `allowance_consumed`: `false`
   - Provider calls started/received: `0`
6. **Plan Verdict**: **VALID CANONICAL UNAPPROVED PLAN**.
   This plan grants zero adapter start, provider call, execution, signing, deployment, or activation authority.

---

## 8. Changed-Path & Immutable-Byte Audit

### Working Tree State:
`git status --short` confirms exactly seven paths modified or created:
- Tracked modified (1):
  - `_bmad-output/implementation-artifacts/story-1-26-requalification-matrix-2026-08-26.md`
- Untracked permitted (6):
  - `_bmad-output/implementation-artifacts/handoff-story-1-26-surrogate-accounting-policy.md`
  - `_bmad-output/implementation-artifacts/story-1-26-owner-decision-conservative-surrogate-accounting-2026-08-26.json`
  - `_bmad-output/implementation-artifacts/story-1-26-stage2-r3-surrogate-accounting-reconciliation-2026-08-26.json`
  - `spikes/judge-fidelity/surrogate-accounting.mjs`
  - `spikes/judge-fidelity/surrogate-accounting.test.mjs`
  - `spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json`

### Immutable Historical File Verification:
- `git diff --name-status f34c1e3ec3c8a8635de5a0e79e6a7eef72d37b01` confirms only `story-1-26-requalification-matrix-2026-08-26.md` has modified tracked content.
- Production code `src/**`: **0 modifications**.
- Runtime assembly `scripts/runtime-assembly.json`: **0 modifications** (`assembly:verify` PASS at `9e20e723...`).
- Runtime baseline: **0 modifications** (`baseline:verify` PASS at `a3d5ae76...`).
- Deployment configs `wrangler.toml` and `wrangler.offline.toml`: **0 modifications** (`check:config` PASS).
- Sprint tracking `_bmad-output/sprint-status.yaml`: **0 modifications**.
- Story 1.26 Spec: **0 modifications**.
- Historical Stage 1 and Stage 2 evidence files and spend receipts: **0 modifications**.

---

## 9. Comprehensive Test & Validation Execution Results

| Test / Gate Command | Execution Scope | Result | Details |
|---|---|:---:|---|
| `node --test spikes/judge-fidelity/surrogate-accounting.test.mjs` | Unit & fail-closed mutation tests | **PASS** | 2/2 tests passed (4 mutations fail closed) |
| `node spikes/judge-fidelity/surrogate-accounting.mjs ...` | CLI verifier over decision + reconciliation | **PASS** | Recomputed decision SHA, rec SHA, acceptance ID |
| `npm run spike:judge:verify -- --file ...cc246aab...-v2.json` | r3 live evidence public verifier | **PASS** | 18/18 predicates, 79/79 fixtures |
| `npm run spike:judge:qualification:verify -- --file ...cc246aab...-qualification.json` | r3 qualification bundle public verifier | **PASS** | GO decision, 2 refs emitted |
| `npm run spike:judge:self-test` | Comprehensive judge spike test suite | **PASS** | 85/85 tests, 79/79 fixtures, 18 predicates |
| `npm run spike:full-request:self-test` | Local full request test suite | **PASS** | 30/30 unit & integration tests |
| `npm run assembly:verify` | Runtime assembly identity check | **PASS** | Identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` (18 modules) |
| `npm run baseline:verify` | Toolchain & configuration isolation check | **PASS** | Identity `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb` |
| `npm run writer:preflight` | Preflight writer assembly & config check | **PASS** | Inactive posture verified, zero remote mutations |
| `npm run check` | Complete repository verification suite | **PASS** | 108 tests, 12 activation tests, 8 reader tests, 17 house tests, 8 composite tests, 15 strike tests, typecheck & config |
| `git diff --check` | Whitespace & patch formatting check | **PASS** | Zero formatting or whitespace errors |
| **Port & Lock Cleanup Check** | Port 8788 listener + lock files | **PASS** | Port 8788 unallocated/free; zero lock files present |

---

## 10. Residual Risks & Governed Mitigation

1. **8B Rate Conservatism**:
   *Risk*: Cloudflare could theoretically charge higher rates if 8B fast pricing is ever published above 70B rates.
   *Mitigation*: The 70B model is Cloudflare's flagship tier ($0.29 / $2.25 per million tokens); smaller 8B models across all major providers are priced substantially lower (e.g., $0.05 / $0.15 per million). The 70B surrogate provides a robust upper bound.
2. **Free Neuron Depletion Exposure**:
   *Risk*: If free neurons are fully depleted by other account activity, the run incurs paid overage.
   *Mitigation*: Total gross exposure is strictly bounded at `$0.06495387`, which is well below the approved `$0.3054702` cap.
3. **Stage 3 Execution Discipline**:
   *Risk*: Premature adapter start or execution of the Stage 3 plan.
   *Mitigation*: The Stage 3 plan is explicitly created in `status: "unapproved"`, `approval: null`, `execution: null`, `allowance_consumed: false`. Pinned tooling fails closed if invoked without a signed, unexpired approval record.

---

## 11. Next Governed Authorization Gate

1. Retain the working tree in its current clean state. Do not commit, push, execute, deploy, sign, or activate.
2. Deliver this independent review handoff to the project owner (Justin Hearn).
3. Next Gate: The project owner must independently review the generated Stage 3 plan (`spikes/local-full-request-qualification/plans/story-1-26-local-full-request-09ad79e1-unapproved.plan.json`) and provide an exact, signed owner approval record bound to plan SHA-256 `95e4d4a23565c4e178cf5b7b2f1058f9c16da16b61b9abaa2ad00b2a44dcc8c9` and run ID `09ad79e1-f57d-4130-bfe9-ec0bce3aae68`.
4. No Stage 3 adapter start or provider invocation may occur prior to obtaining that explicit approval.
