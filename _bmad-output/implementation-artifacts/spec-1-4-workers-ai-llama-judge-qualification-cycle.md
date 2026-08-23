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

- 2026-08-22 — Governance amendment (human renegotiation): flattened wire schema and one new granted matrix.
  - Authorization: Justin, 2026-08-22, after reviewing the e848e2bd NO-GO evidence and the wire-enforcement diagnosis; selected option 1 (flatten the wire schema) from the presented options.
  - Decision: The provider-facing wire schema is re-authored using only constructs the Workers AI structured-output engine enforces (`Oddspark judge wire verdict v2`: fixed `gate_1`…`gate_9` `{pass, reason}` properties plus `tone`/`claims`; no `allOf`/`contains`/`if-then`/`const`). The adapter maps the wire shape losslessly to the canonical verdict before classification; the canonical `JudgeResult`/verdict contract, 19/20 threshold, predicate oracle, and all governance bounds are unchanged. The completed e848e2bd cycle (both zero-call preflights and the called run) is reclassified as owner-reviewed immutable history — it no longer blocks plan generation — and exactly one new judge matrix is granted under the amended wire schema. One new matrix, not an open-ended course: a further NO-GO ends the Workers AI judge course again pending owner review.
  - Harness changes under this amendment: `contract.mjs` (wire schemas, `mapWireVerdictToCanonical`, `validateWireJudgeResult`, prompt instruction), `worker.mjs` (envelope sanitation validates the wire result), `evidence-v2.mjs` (`closedEnvelopeShape` accepts wire shape and retains canonical acceptance so pre-amendment evidence still verifies), `fixtures.json` v2 (`wire_valid_verdict`; duplicate-gate case re-expressed as missing-gate since key duplication is impossible in the wire shape), `fixture-executor.mjs`/`test.mjs` (provider content in wire shape; losslessness proof), `recovery-finder.mjs` (explicit allowlist reclassification of the three verified 2026-08-22 sets plus the bound completed-spend receipt).
  - Known-bad state avoided: spending another 42-call cycle on a schema the provider cannot enforce; and silently weakening the canonical verdict contract instead of moving the adaptation to the adapter boundary where the architecture already permits lossless mapping.
  - Post-amendment verification note: the standalone verifiers now report the e848e2bd artifacts as identity-drifted history (`source.identity`, `adapter.identity`, `fixtures.executed`, and derived predicates fail against current bytes) — expected drift semantics, identical to generation's owner-reviewed history. The retained facts (42 called, both configurations NO-GO on `schema_invalid`, zero refs) remain byte-pinned; recovery classification re-verifies marker bytes and bundle bindings without requiring current source identity.
  - Follow-up fix (same amendment): `reserveRecoveryAttempt` still refused any existing spend receipt. It now archives exactly the owner-reviewed completed-spend receipt (bytes preserved, renamed to `2026-08-22-e848e2bd-c43fb299.spend-receipt.json`) before reserving the new attempt, and continues to refuse any other receipt; recovery classification recognizes the archived receipt as history. Covered by a dedicated test.

- 2026-08-22: Granted wire-v2 matrix executed live under plan ref `217c0f82b02f4304ff6bc6a0ffc34347465b015eaea2171da770679aa678fdda`, approval run `467ba931-4e31-450a-93ce-f05f62e4db73` (Justin's fresh exact approval 2026-08-22T20:54:38.000Z, cap 42, max $0.28997724). All 42 calls completed. **Outcome: NO-GO on both configurations; cycle spent; `mvp_review_required: true`.** Independently verified post-run: evidence PASS (18 predicates, 79 fixtures), qualification PASS (NO-GO, 0 refs). Evidence basename `2026-08-22-467ba931-9be44152aeb9a440-20d88746-a496-4b34-b0a5-8a694a4989d2`. **The wire flattening worked**: every received call returned the enforced `gate_1`…`gate_9` shape with reasons and (on 70b) an exact `candidate_ref` echo. The dominant failure moved to the adapter boundary: Workers AI returns the structured result in two representations at once — `response` (parsed object) and `choices[0].message.content` (JSON string) — and `sanitizedEnvelope` retains both, so `extractJudgeContent` correctly classifies 39/42 calls `ambiguous_envelope` (json-kind vs text-kind identity conflict). Separately, the 8B corrupted the echoed `candidate_ref` hex on 3 calls (genuine model binding failure, `schema_invalid`; the 8B would NO-GO on its own at 17 ambiguous + 3 misbound). The adapter fix — retain exactly one frozen representation (validated wire `response` object, falling back to `choices` text only when no object is present) — is within the adapter's lossless-mapping authority, but the cycle is spent: another matrix requires a new owner grant.

- 2026-08-22 — Governance amendment (human renegotiation): adapter single-representation fix and one third granted matrix.
  - Authorization: Justin, 2026-08-22 ("I grant a third judge matrix"), after reviewing the 467ba931 NO-GO evidence showing the failure had moved from schema enforcement to the adapter retaining duplicate representations.
  - Decision: `sanitizedEnvelope` in the judge adapter now retains exactly one representation of the provider result — the validated wire `response`/`result` object when present, its string form otherwise, and `choices[0].message.content` only when no response/result value exists. This is the adapter's architecture-sanctioned selection of the one frozen response location; extraction's ambiguity contract is unchanged and still tested directly. The completed 467ba931 cycle and the two c0b94e4a zero-call preflights are reclassified as owner-reviewed immutable history alongside the e848e2bd sets; exactly one third judge matrix is granted. A further NO-GO ends the Workers AI judge course pending owner review.
  - Harness changes under this amendment: `worker.mjs` (single-representation sanitize), `recovery-finder.mjs` (owner-reviewed lists generalized to both completed cycles + archived receipts), `run.mjs` (reservation archives whichever owner-reviewed receipt occupies the slot, refusing archive overwrite), tests for the duplicate-representation regression and both reservation branches.
  - 8B note: independent of the adapter defect, `llama-3.1-8b-instruct-fast` corrupted the echoed `candidate_ref` hex on 3 of 21 calls in the 467ba931 cycle (genuine binding failure); it carries zero direct-valid trials into the third matrix and needs a clean 19/20 to qualify.
- 2026-08-23 — Outcome: third matrix executed live and returned verified **GO**.
  - Run: approval run `a0ed5363`, plan ref `bd862b49a3123769c2615d73ded1562f8007ea422b7dbc055bd4615f49555c9d`, 42 calls within the frozen cap (42 / $0.2900 / 26362 neurons), account profile `hearn-systems-oddspark` (paid).
  - Evidence: `spikes/judge-fidelity/results/2026-08-23-a0ed5363-01e3976da21ab40e-620e2f14-8f42-47a2-8f83-854c41f017e6-v2.json` (+ `.complete.json`, `.md`) and `…-qualification.json`.
  - Independent verification: `npm run spike:judge:verify` PASS (18 predicates, 79 fixtures); `npm run spike:judge:qualification:verify` PASS (GO; 2 refs).
  - Qualified identities: STRUCT-JUDGE-CONFIG `@cf/meta/llama-3.3-70b-instruct-fp8-fast` qualification_ref `648dcdb86c12b6169f6ae47ec7c0479977fd5ccbf8f651e39cad0c2589d85c2a`; STRUCT-JUDGE-CONFIG `@cf/meta/llama-3.1-8b-instruct-fast` qualification_ref `3b9f521048b3c6c8bc5b9cda3cc65b090066cbd28e0c845e574fa7c38648abdc`. Role set (both legs GO) role_qualification_ref `4c70414b247316618f0a219eeecf1aa408d029af931abc45c15a65fda15b5d6a`, cycle_ref `2bc68963f9ba590a80a113a3c96eafd58c309a0bf32de5c1b2826733b791708a`.
  - Zero-call preflight NO-GOs under the same plan window (approval-shape then missing-probe) are retained as non-consuming evidence: `…-a64f9601-bc745f5e…`, `…-a0ed5363-c024fbc0…`, `…-a0ed5363-e7a55294…`, `…-a0ed5363-5808d7c9…` sets; each carried `cycle_available: true`.
  - Story 1.12 operator actions 2–3 and Story 1.13's judge-identity resolution are now satisfiable; the active STRUCT-JUDGE identity for the later activation manifest is the role set above.



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
