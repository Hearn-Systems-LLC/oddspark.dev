---
title: 'Story 1.4: Workers AI Llama Judge Qualification Cycle'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
epic: 1
story: 4
sprint_key: '1-4-judge-structural-recovery-matrix'
baseline_revision: '90f3bba0799ade70b74abd71fade5817e89907de'
baseline_commit: '90f3bba0799ade70b74abd71fade5817e89907de'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The completed gpt-oss judge matrices are immutable NO-GO evidence, while the amended AD-11 permits one new Workers AI judge matrix using a JSON-Mode-supported Llama pair. The current harness still binds active behavior to gpt-oss, treats the historical spent receipt as consuming all future allowance, requires both configurations to pass, and cannot publish the role-level qualification reference required by activation.

**Approach:** Version the post-review judge cycle without reinterpreting history; qualify `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and `@cf/meta/llama-3.1-8b-instruct-fast` independently under one matrix, derive a closed role qualification set, harden terminal accounting, verify offline, and prepare an exact external plan without executing it.

## Boundaries & Constraints

**Always:** Preserve every historical result and receipt byte; keep the closed JudgeResult/verdict schemas and 19/20 direct-valid threshold; run one probe plus 20 trials independently for each probe-accepted configuration with no retries; consume the new judge allowance at first durable call-start; emit a configuration ref only on its own GO and a role ref only when at least one configuration is GO. Re-freeze the exact Wrangler 4.123.0 runtime/config/source identity after offline changes. If Cloudflare does not publish an exact price binding for the selected 8B endpoint, derive the approval cap conservatively by charging its maximum tokens at the documented 70B rate and disclose that assumption without presenting it as observed 8B pricing.

**Ask First:** Any live adapter start, Workers AI call, approval creation, plan execution, model substitution, threshold/schema change, provider/gateway change, runtime upgrade, deployment, activation, commit, or push.

**Never:** Delete or overwrite old spend/evidence to manufacture allowance; transfer generation allowance; resume or retry a called incomplete matrix; pool model rates; repair/coerce semantic output; treat the documented `8b-instruct-fp8-fast` pricing row as an exact alias without authoritative evidence; modify production bindings/routes/model vars; or touch Story 1.11 implementation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Partial success | Exactly one configuration reaches GO | Role set is GO with one exact ref and one null ref | Failed configuration remains unselectable |
| Two failures | Both configurations are NO-GO | Role set is NO-GO with no qualification ref | Workers AI course ends pending owner review |
| Called interruption | First call-start exists but terminal publication is incomplete or ambiguous | Retain `consumed_incomplete`; emit no refs | Block role and all further matrices |
| Zero-call preflight | Complete marker-bound proof shows no call-start | Preserve new-cycle allowance only | Never emit qualification authority |

</frozen-after-approval>

## Code Map

- `spikes/judge-fidelity/contract.mjs:4-7` + `evidence-v2.mjs:24-94` -- separate active Llama identities from frozen legacy gpt-oss identities and hashes.
- `spikes/judge-fidelity/run.mjs:268-320,711-747,1118-1390` -- independent probe continuation, zero retries, first-call consumption, and terminal publication/accounting.
- `spikes/judge-fidelity/recovery-finder.mjs:43-352` -- scope the architecture-granted cycle while retaining old receipts and zero-call proof.
- `spikes/judge-fidelity/qualification.mjs:181-536` -- version plans/bundles and derive per-configuration manifests plus the closed AD-11 `RoleQualificationSet`.
- `spikes/judge-fidelity/pricing.mjs` + `wrangler.toml` -- bind exact candidate identities and a sourced or explicitly conservative cost ceiling only in the isolated spike.
- `spikes/judge-fidelity/test.mjs` + `README.md` -- adversarial accounting/partial-success coverage and operator boundary documentation.
- `runtime-baseline.json` -- re-freeze only after final isolated source/config identities; preserve Wrangler 4.123.0.
- `_bmad-output/planning-artifacts/epics.md:294-324` -- reconcile Story 1.4 acceptance with AD-11; historical specs/results remain read-only.

## Tasks & Acceptance

**Execution:**
- [x] Judge contracts/evidence/config -- introduce versioned active-versus-legacy identities, selected Llama pair, and honest pricing disclosure without changing historical bytes.
- [x] Runner/recovery accounting -- enforce independent probes, zero retries, new-cycle allowance, zero-call recovery, and terminal `consumed_incomplete` behavior.
- [x] Qualification -- emit independent configuration refs and one closed role set/ref with partial-success semantics.
- [x] Tests/docs/planning -- cover every edge case, reconcile Story 1.4, re-freeze the baseline, and prepare an external unapproved plan plus approval template/disclosure without starting the adapter.

**Acceptance Criteria:**
- Given historical gpt-oss artifacts, when all verifiers run after the active-pair change, then pinned bytes and prior NO-GO facts remain valid and consume none of the architecture-granted Llama cycle.
- Given either probe outcome combination, when the matrix protocol is simulated offline, then each accepted configuration receives exactly 20 sequential trials, rejected configurations receive none, no invocation retries, and total calls never exceed 42.
- Given complete or interrupted evidence, when qualification verification runs, then only independently passing configurations emit refs, role GO is equivalent to at least one passing member, and called incomplete or ambiguous evidence emits no ref and blocks another matrix.
- Given final offline source and runtime identity, when plan preparation runs, then it writes one external, unapproved, unexecuted judge plan binding both models, 42 calls, exact identities, retention, and a sourced conservative maximum cost.

## Spec Change Log

- 2026-08-19: Implemented the versioned Llama qualification cycle, independent configuration/role refs, fail-closed terminal accounting, pricing disclosure, tests, documentation, planning reconciliation, runtime re-freeze, and offline external plan preparation.
- 2026-08-22: Live cycle executed under plan ref `6fe936628ab26fbbc8ccb6604f3e5aec030ee748700728a74a00df43707bc496`, approval run `e848e2bd-dc86-40e0-90da-45bee83fcc6d` (Justin's fresh exact approval 2026-08-22T17:57:26.905Z, cap 42, max $0.28956312). Two zero-call preflight NO-GOs preceded execution (operator path mix-up; template timestamps/decision unedited — both non-consuming, `cycle_available: true`, retained as immutable zero-call history). Called run: all 42 calls completed 18:03:29–18:05:22Z. **Outcome: NO-GO on both configurations — 20/20 trials plus probe `schema_invalid` on each model; `mvp_review_required: true`, cycle spent (`cycle_available: false`).** Independently verified post-run: evidence PASS (18 predicates, 79 fixtures); qualification bundle PASS (NO-GO, 0 refs emitted). Evidence/qualification basename `2026-08-22-e848e2bd-d072356c9de6a906-c43fb299-6891-4f10-aebe-e49cbf3f770c`. Dominant failure detail: both Llama models returned a well-formed but noncanonical verdict on every call — `gates` as a boolean map keyed `"1".."9"` with no per-gate `reason`, and `tone`/`claims` as bare strings instead of `{pass, reason}` — despite the frozen `json_schema` response format and prompt. Working diagnosis for owner review: the canonical verdict wire schema relies on `allOf`/`contains`/`if-then`/`const` constructs the Workers AI structured-output engine does not enforce, so both models drifted to the simplified shape. Per this cycle's Two-failures row, the Workers AI judge course ends pending owner review; no further judge matrix may run without a new owner/architecture decision.


## Design Notes

The post-review cycle is new authority, not a third interpretation of the old recovery allowance. Its domain-separated `cycle_ref` hashes the exact plan ref, retained evidence SHA-256, and ordered configuration manifests; it is never a path or bare mutable run ID. The exact closed role set and its separate domain-separated role qualification ref are the values later bound by `ProductionActivationManifest.judge_ref`.

## Verification

**Commands:**
- `npm run spike:judge:self-test` -- all judge fixtures, predicates, accounting, history, and role-set cases pass offline.
- `npm run check` -- repository tests, types, configuration dry runs, and runtime baseline pass without provider calls.
- `git diff --check` -- no whitespace errors.

**Prepared external disclosure (unapproved, offline only):**
- Plan: `/private/tmp/oddspark-judge-review-final.D9HTvx/llama-judge-plan.json` -- SHA-256 `88b913d6093be406d65faf75135ce5960ba7ff7e7fdafab2a461b8c166d60e8a`, plan ref `f6450bde6ad65614e4fb678625042455571fd8784f9a8a3592983c7decd66a64`.
- Approval template: `/private/tmp/oddspark-judge-review-final.D9HTvx/llama-judge-plan-approval-template.json` -- SHA-256 `8abb52ee0a71fad9394fc43014a0959a800971c53d913b2d196f305592a06534`; timestamps remain null and decision remains unapproved.
- Completion marker: `/private/tmp/oddspark-judge-review-final.D9HTvx/llama-judge-plan-disclosure.complete.json` -- SHA-256 `38b4dcd6653c74af87cc01f01be15fff66f2f5a815925a03e84be659308f13c4`.

## Suggested Review Order

**Qualification authority**

- Start with per-configuration GO and the closed role-level activation authority.
  [`qualification.mjs:459`](../../spikes/judge-fidelity/qualification.mjs#L459)

- Confirm active Llama identities remain separate from immutable gpt-oss history.
  [`contract.mjs:4`](../../spikes/judge-fidelity/contract.mjs#L4)

**Call and recovery accounting**

- Verify both probes precede independent accepted-model trials with zero retries.
  [`run.mjs:271`](../../spikes/judge-fidelity/run.mjs#L271)

- Review historical/current-cycle discrimination and terminal receipt validation.
  [`recovery-finder.mjs:158`](../../spikes/judge-fidelity/recovery-finder.mjs#L158)

- Check called failures become durable `consumed_incomplete` instead of reusable allowance.
  [`run.mjs:1137`](../../spikes/judge-fidelity/run.mjs#L1137)

**Cost and operational identity**

- Confirm conservative budget pricing never masquerades as observed 8B cost.
  [`pricing.mjs:16`](../../spikes/judge-fidelity/pricing.mjs#L16)

- Review truthful worktree-source provenance and the re-frozen runtime identity.
  [`runtime-baseline.json:68`](../../runtime-baseline.json#L68)

**Acceptance and proof**

- Read the reconciled Story 1.4 outcome and terminal-governance rules.
  [`epics.md:294`](../planning-artifacts/epics.md#L294)

- Finish with partial-success, tamper, history, and publication tests.
  [`test.mjs:1250`](../../spikes/judge-fidelity/test.mjs#L1250)
