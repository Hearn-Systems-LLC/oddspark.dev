---
title: 'Story 1.11: Llama Generation Structural Qualification Cycle'
type: 'feature'
created: '2026-08-20'
status: 'done'
baseline_commit: 'd8423d1bcf4fa8a4d71705d5dd54dbf5379ad624'
review_loop_iteration: 6
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Completed gpt-oss generation cycles are NO-GO and cannot authorize production generation. The harness still binds those obsolete identities and lacks the current-cycle accounting and role authority established by the approved Llama architecture.

**Approach:** Version the harness for one new qualification cycle using the approved Workers AI Llama pair, preserve all historical bytes and conclusions, mirror the hardened judge governance, and prepare—but do not execute—a fresh exact plan.

## Boundaries & Constraints

**Always:** Use primary `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and fallback `@cf/openai/gpt-oss-20b` (reselected per Justin 2026-08-22 after the 8B Llama's repeated structural NO-GOs; l2–l8 cycles preserved as legacy history). Complete both probes before trials; give each accepted role 20 sequential trials. Per Justin's 2026-08-22 governance amendment, a scheduled call may retry ONLY when its attempt ends in a transient call state (`provider_error` or `timeout`) — never for an output classification — at most 1 retry per scheduled call (2 attempts), every attempt retained in evidence, and a trial's outcome is its final attempt's classification; the call cap is 63 (42 scheduled + up to 21 retries) and cost estimates must cover retry headroom. Require 19/20 direct-valid trials plus every integrity predicate for configuration GO. Decode exactly one complete structured response value, then apply the unchanged closed Candidate classifier. Preserve and verify prior-cycle artifacts as legacy. Consume allowance at first durable call-start; retain verified zero-call preflights without consuming it; make any called incomplete/ambiguous attempt terminal `consumed_incomplete`. Bind source, runtime, request, fixtures, pricing, approval, attempt, and publication to retained bytes. Emit refs only for GO configurations and a closed generation `RoleQualificationSet`/role ref only when at least one member is GO.

**Ask First:** Any adapter start or provider call; approval of exact plan bytes, run ID, call/cost cap, profile, plan/headroom, or retention; changing selected models, threshold, retry policy, Candidate schema, role-set contract, or cycle allowance; deployment or activation.

**Never:** Reinterpret, overwrite, delete, or charge r2/r3 gpt-oss evidence against the Llama cycle; emit a ref for NO-GO or `consumed_incomplete`; pool role rates; extract prose/fences, inspect alternate locations, repair, coerce, default, or weaken schema; describe the conservative 70B-rate budget for 8B as observed pricing; modify `src/worker.js`, production Wrangler files, credentials, or bindings; modify `sprint-status.yaml` except for BMAD lifecycle synchronization of Story 1.11; perform network/provider/deployment activity during implementation or verification.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Independent probes | One rejects; peer accepts | Both probes finish; accepted peer gets 20 trials | Rejected role NO-GO; peer continues |
| Structured transport | One complete Candidate value | Decode once, classify unchanged | Wrapper, prose, ambiguity, repair, or schema violation rejects |
| Partial success | One GO; one NO-GO | Failed ref null; role set/ref identifies usable member | Never grant failed member authority |
| Interrupted run | Durable call-start; final set unverifiable | Retained `consumed_incomplete`; no refs | Block replacement pending owner review |
| Transient provider fault | Attempt ends `provider_error`/`timeout` | One retry of that scheduled call; both attempts retained; trial counts its final attempt | Second transient failure stands as the trial outcome; output classifications never retry |
| Historical bytes | Valid r2/r3 or forged legacy-looking set | Known history verifies without current authority | Unknown/malformed sibling blocks |

</frozen-after-approval>

## Code Map

- `spikes/generation-qualification/contract.mjs` -- split active Llama identities from immutable gpt-oss identities; retain Candidate classifier, schedule, and predicate bindings.
- `spikes/generation-qualification/qualification.mjs` -- version plan/approval/bundle domains, conservative pricing, GO-only refs, cycle identity, and closed role set/ref.
- `spikes/generation-qualification/run.mjs` -- validate canonical plan/ref and request manifest before calls; approval-bound entrypoints, two-probe-first schedule, fsynced accounting, source re-read, publication, and completion/reconciliation.
- `spikes/generation-qualification/{evidence-v2,fixture-executor,verify-v2}.mjs` -- independent arbitrary-byte verification, identities, fixtures, predicates, and report.
- `spikes/generation-qualification/{worker,start-adapter}.mjs`, `wrangler.toml` -- isolated loopback adapter and Llama allowlist; production/CI remain unreachable.
- `spikes/generation-qualification/results/` -- read-only gpt-oss history; pin exact facts without migration.
- `spikes/generation-qualification/recovery-finder.mjs` -- exact-name/hash legacy classification, append-only zero-call/called attempt history, closed state transitions, current plan allowlisting, and completed-marker sibling verification.
- `spikes/judge-fidelity/{qualification,run,recovery-finder,pricing}.mjs` -- reviewed cycle, recovery, role, fsync/publication re-read, and pricing patterns; adapt with generation domains.
- `spikes/generation-qualification/test.mjs`, `README.md`, `package.json`, `scripts/runtime-baseline.*` -- adversarial proof, operator flow, commands, and final runtime freeze.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/generation-qualification/` -- implement versioned Llama identities, complete immutable gpt-oss history, truthful unknown-cost aggregation in every summary/receipt, GO-only refs, and internally verified role authority.
- [x] `spikes/generation-qualification/run.mjs` -- hold one exclusive lock across discovery through terminal state; create/fsync/remove locks and atomic files with directory fsync and cleanup on partial failure; recover stale locks only through closed owner/liveness/age policy and release only the acquired inode; confine every exported publication basename/member; re-open and semantically verify publication before `completed-spent`; preserve both original and terminalization failures coherently.
- [x] Recovery contracts -- exhaustively classify all receipts and siblings before returning any state; bind receipt filename to attempt/run identity; require zero-call receipts share one plan/run cycle and unique attempts; compare receipt plan, approval, full chronology, spend, marker cycle/attempt/basename, evidence, and qualification; close marker member fields; validate all timestamps/schedule prefixes; use one no-follow handle and verify inode/size/mtime/read length stability.
- [x] `spikes/generation-qualification/evidence-v2.mjs` and qualification derivation -- enforce exact two-probes-first/configured trial order, full attempt/approval/call chronology, internally verified authority, and unknown-cost propagation in every aggregate.
- [x] `spikes/generation-qualification/test.mjs` and retained fixtures/results -- cover stale-lock recovery, lock replacement before release, directory fsync/cleanup failures, publication traversal, post-publication re-read failure, completed plus conflicting/orphan siblings, renamed/cross-plan/duplicate zero-call receipts, receipt-evidence mismatch, forged spend, impossible chronology/schedule, same-inode rewrite detection, and terminalization failure preservation.
- [x] `spikes/generation-qualification/{README.md,start-adapter.mjs,wrangler.toml}`, `package.json`, and runtime baseline -- exact shared plan/approval validation plus launcher refusal/spawn tests; bind adapter lifetime/request access to unexpired unconsumed authority or terminate at expiry; keep generation name distinct from production/offline/judge; re-freeze baseline.
- [x] Plan CLI -- subprocess-test that `spike:generation:plan` writes exactly plan/template/null-execution marker to an OS temp directory outside operational results, with null approval/execution and `allowance_consumed:false`; prepare the final unapproved bundle without calls.

**Acceptance Criteria:**
- Given legacy and current artifacts, when discovery runs, then exact gpt-oss evidence remains verifiable but grants no Llama authority, while forged or ambiguous history fails closed.
- Given any run outcome, when accounting closes, then calls are sequential/unretried, durable call-start consumes allowance, verified zero-call attempts do not, and called incomplete attempts end `consumed_incomplete` with no refs.
- Given verified results, when qualification derives, then only GO members receive refs and the generation role set/ref is reproducible from ordered members, source, and cycle identities.
- Given repository verification, when focused, arbitrary-artifact, baseline, full-check, and diff gates run, then in-scope offline gates pass with historical bytes and production files unchanged.

## Spec Change Log

### 2026-08-20 — Targeted post-cap implementation hardening
- Authorization: The owner authorized one bounded patch pass beyond the review cap; frozen intent was not changed.
- Closed: Exact state-specific receipts and chronology/approval/spend bindings; exhaustive malformed/current sibling blocking; marker-bound byte revalidation; exact global schedule verification; internally verified qualification authority; success re-read before terminal completion; inode/nonce lock release; unknown-cost preservation; and approval-bound loopback adapter access with expiry termination.
- Evidence: `npm run spike:generation:self-test` passes 35/35; baseline verification and 62/62 baseline tests pass; type/config and diff checks pass. Full `npm run check` reaches the unrelated semantic voice suite and stops on four pre-existing approval-state expectation failures.
- Boundary: No provider, adapter, deployment, or other network activity occurred.

### 2026-08-20 — Close plan, recovery, durability, and independent-verification gaps
- Trigger: Review found that a generated plan blocked its own live workflow; forged legacy prefixes were accepted; plan integrity and two-probe ordering were not independently enforced; attempt history/state transitions/durability were insufficiently bound; completed publication was trusted without sibling verification; and unknown 8B cost collapsed to zero.
- Amended: The Code Map and tasks now require canonical pre-call plan validation, exact historical names/hashes, append-only zero-call history, fsynced call-start, closed state transitions, attempt-bound evidence, verifier-enforced probe ordering, truthful unknown-cost propagation, marker/sibling re-read and interrupted-publication reconciliation, verified-only role derivation, distinct spike names, and real workflow tests.
- Known-bad state avoided: An approved run that cannot start, forged history bypass, provider calls under mutated plan bytes, lost or rewound cycle consumption, incomplete evidence granting authority, or understated spend.
- KEEP: Preserve the approved Llama pair, immutable gpt-oss bytes/non-authority, exact-one structured decoding, two-probes-first live schedule, independent role continuation, GO-only refs, closed generation role set/ref, conservative 8B budget label, isolated runtime, and zero provider/deployment activity.

### 2026-08-20 — Make fail-closed guarantees end-to-end rather than helper-local
- Trigger: Review iteration 2 found that post-call evidence/manifest failures could remain nonterminal; the independent verifier did not enforce probe ordering or bind the durable attempt; plan/schedule validation was open; attempt transitions could rewrite immutable fields; marker paths/members and orphan artifacts were unsafe or under-validated; and reconciliation checked hashes without semantic qualification verification.
- Amended: Execution now names the exact plan, state-machine, path-containment, orphan classification, attempt/evidence binding, verifier ordering, post-call catch-all, semantic reconciliation, and integration-test requirements. Only a verified zero-call terminal state is non-consuming; ambiguous preflight fails closed.
- Known-bad state avoided: Provider calls under an open or drifted plan, rewound consumption, path traversal, orphan publication coexisting with a new allowance, hash-valid but semantically invalid recovery, or a called attempt stranded in `calling`.
- KEEP: Retain iteration 1's Llama identity split, exact historical hashes, durable write intent, truthful pricing, GO-only authority, runtime isolation, and fully offline implementation boundary.

### 2026-08-20 — Bind retries, evidence, and recovery to exact attempts and bytes
- Trigger: Review iteration 3 proved zero-call retry could not create a new receipt; evidence still accepted trials before the peer probe; authority derivation accepted unverified inputs; completion did not bind marker cycle/attempt/basename or re-read canonical bytes; state fields and `last_call` remained open; orphan artifacts, missing legacy members, symlinks, and completed-state catch behavior were insufficiently closed.
- Amended: Tasks now require unique retained zero-call history with same-plan retry, canonical plan/approval/publication bytes, complete legacy sets, lstat path confinement, fully closed state fields, exact marker cycle/attempt/basename binding, exhaustive current-sibling classification, attempt/call history in evidence, verifier-internal ordering and authority checks, dependency-injected real workflow tests, and approval-gated adapter start.
- Known-bad state avoided: A zero-call preflight permanently blocking execution, cross-attempt publication authority, externally reordered evidence qualifying, path escape, incomplete history silently accepted, or completed authority being rewound by a later exception.
- KEEP: Preserve both prior KEEP sets, especially immutable legacy bytes, Llama identities, independent continuation, truthful pricing, GO-only refs, fsynced call-start, semantic recovery, isolated configuration, and no provider activity.

### 2026-08-20 — Make cycle reservation exclusive and adapter authority exact
- Trigger: Review iteration 4 found concurrent runners could both reserve; adapter start checked only authorization/ref; ambiguous reservations and unexpected preflight failures could be retried; recovery did not compare full attempt history; one cost summary converted unknown to zero; state chronology/schedule, exact marker basename, root adapter URL, semantic-recovery failure, and no-follow reads remained incomplete.
- Amended: Tasks now require an exclusive stale-safe cycle lock, exact shared plan/approval validation at adapter startup, ambiguous-reservation blocking, comprehensive pre-call zero-call containment, full attempt/approval/call-history binding, exact schedule prefixes and timestamps, one-handle no-follow reads, exact marker filename, coherent semantic-failure terminal state, truthful cost aggregation, and executable concurrency/launcher tests.
- Known-bad state avoided: Two paid matrices consuming one allowance, stale approval starting remote AI, ambiguous crashes reopening the cycle, cross-history recovery, unknown spend reported as zero, or filesystem replacement escaping retained-byte verification.
- KEEP: Preserve all prior KEEP instructions and the real offline lifecycle test seam; provider-backed execution remains forbidden.

### 2026-08-20 — Make completed recovery exhaustive and durability crash-safe
- Trigger: Review iteration 5 found completed discovery returned before contradictory siblings were classified; lock creation/release/stale handling and directory durability were incomplete; exported publication allowed unsafe names and lacked post-write semantic re-read; receipt filename, chronology, plan/approval/spend, schedule, and zero-call-cycle bindings were incomplete; unknown terminalization and plan-CLI regressions lacked proof.
- Amended: Tasks now require exhaustive classification before any result, inode-bound stale-safe locking, directory fsync and partial cleanup, publication confinement/re-read, complete receipt/evidence/approval/spend chronology, closed marker members, adapter lifetime authority, and subprocess proof of the external unapproved plan bundle.
- Known-bad state avoided: Coherent completion masking orphan state, successor-lock deletion, power-loss reopening allowance, path escape, forged spend/history, expired adapter authority, or planning artifacts contaminating operational recovery.
- KEEP: Preserve every prior KEEP instruction and all 27 real lifecycle tests where still applicable; no provider-backed execution.

### 2026-08-22 — Governance amendment (human renegotiation): transient-retry policy + gpt-oss-20b fallback
- Authorization: Justin, 2026-08-22, two explicit decisions after reviewing l6–l8 evidence: (1) reselect the fallback to `@cf/openai/gpt-oss-20b` after the 8B Llama's three distinct structural failure modes; (2) amend the zero-retry policy so transient provider faults (`provider_error`/`timeout`) may retry a scheduled call once, since a provider 502 evidences infrastructure, not model fidelity. Output classifications remain unretryable; denominators still count 20 scheduled trials per role; call cap rises to 63 with honest retry headroom in cost estimates.
- Amended: frozen Boundaries and I/O matrix updated above; contract, runner, evidence, qualification, and pricing modules to follow under this change log. `schedule.zero_retry` predicate becomes `schedule.transient_retry_only`.
- Known-bad state avoided: converting transient provider instability into repeated model NO-GOs (l7/l8) while pretending the zero-retry evidence says something about model fidelity; and any retry of a model-output failure, which would weaken the fidelity signal.

### 2026-08-22 — Topology decision (human renegotiation): primary-only generation role, house Brief is the fallback strategy
- Authorization: Justin, 2026-08-22, after reviewing l9 evidence (primary GO 20/20 for the fourth consecutive cycle; gpt-oss-20b fallback NO-GO at 17/20 with a genuine pricing-rule compliance gap plus residual provider instability beyond one retry).
- Decision: The generation role is qualified **primary-only**. The role qualification product is the sole-member `RoleQualificationSet` from run l9 (primary STRUCT-GENERATION ref `34731e26b1c1ef79acd444ba8e775143d9a616c3ab915f52481bd81475796bfc`, role_ref `5cf5a547b29d31304af686c610da9c4c5959299faf12d434db28493de92404b1`, cycle_ref `e615e7c03568bbf2ef9683131331909d1a5c5a6b6de2feabc3fd98bd9d0da8ae`) — the closed-set contract's "Partial success" row already authorizes exactly this shape. The generation **fallback model leg is closed unwired**: no further fallback model selection or qualification cycles under this story. The pipeline's fallback strategy is the Story 1.13 approved deterministic house Brief path, which the six-call ledger already selects on generation exhaustion or failure.
- Consequences: Story 1.11's open architecture decision (recorded at run l6) is closed. Downstream reconciliation: Story 1.13's operator action resolves the verified **primary** generation identity only; the activation manifest (Story 1.26) carries no generation-fallback identity; `AI_MODEL_FALLBACK` remains a presence-only misconfig guard in production ports.
- Known-bad state avoided: burning further paid cycles on a fallback candidate with a demonstrated prompt-compliance gap, while the designed house Brief path already provides the failure-mode coverage the pair was intended for.

## Design Notes

Share judge governance semantics, never judge hash domains or evidence bytes. Preserve generation-specific prompts, Candidate validation, fixtures, source/cycle identities, and role hashing. Use exact 70B pricing; budget 8B conservatively at that rate while reporting observed 8B cost unknown until authoritative pricing exists.

## Verification

**Commands:**
- `npm run spike:generation:self-test` -- expected: current/legacy, recovery, tamper, pricing, and publication suites pass offline.
- `npm run baseline:verify && npm run check:types && npm run check:config` -- expected: isolated runtime/static gates pass.
- `npm run check` -- expected: full offline gate passes, or unrelated pre-existing failures remain explicit.
- `git diff --check` -- expected: no whitespace errors.

## Suggested Review Order

**Governed execution boundary**

- Start with the locked, approval-bound execution and durable publication path.
  [`run.mjs:21`](../../spikes/generation-qualification/run.mjs#L21)

- Exact plan authority gates adapter startup and expires its local capability.
  [`start-adapter.mjs:12`](../../spikes/generation-qualification/start-adapter.mjs#L12)

**Recovery and authority**

- Exhaustive receipt and sibling classification prevents ambiguous allowance reuse.
  [`recovery-finder.mjs:69`](../../spikes/generation-qualification/recovery-finder.mjs#L69)

- Independent verification binds the complete configured call schedule and evidence.
  [`evidence-v2.mjs:79`](../../spikes/generation-qualification/evidence-v2.mjs#L79)

- Internally verified derivation emits only GO configuration and role authority.
  [`qualification.mjs:56`](../../spikes/generation-qualification/qualification.mjs#L56)

**Models and cost truthfulness**

- Active Llama identities remain explicitly separated from immutable gpt-oss history.
  [`contract.mjs:12`](../../spikes/generation-qualification/contract.mjs#L12)

- Conservative fallback budgeting never masquerades as observed 8B pricing.
  [`pricing.mjs:1`](../../spikes/generation-qualification/pricing.mjs#L1)

**Verification**

- Adversarial tests cover locks, receipts, tampering, recovery, and adapter authority.
  [`test.mjs:81`](../../spikes/generation-qualification/test.mjs#L81)

- Runtime identity now hash-binds and isolates the generation spike configuration.
  [`runtime-baseline.mjs:21`](../../scripts/runtime-baseline.mjs#L21)

### 2026-08-22 — Live Llama qualification run l2 executed: both roles NO-GO
- Run `story-1-11-2026-08-22-l2`, attempt `57ef2429-0bac-48a9-9486-7cbc07dd32c7`, plan_ref `686e93d9…`, under Justin's fresh exact approval (2026-08-22T13:11:02.000Z, cap 42, max $0.22452192). Independently verified post-run: all 23 predicates pass, evidence/report/qualification bytes reproducible.
- Outcome: both probes returned but echoed the request input instead of producing a closed Candidate (`invalid_output`, closed-schema rejection). Both roles NO-GO with zero trials; 2 calls, known spend $0.00016776; allowance consumed; no refs emitted. Evidence set retained immutably under `spikes/generation-qualification/results/story-1-11-2026-08-22-l2-*`.
- Harness fix preceding the run (commit `0f00d98`): recovery-finder excluded legacy gpt-oss r2/r3 artifacts from the malformed-name check but not from current-cycle classification, blocking any live run; fixed with a regression test (36/36 self-test).
- Next: per the governance rule, both NO-GO roles require architecture review (prompt/contract iteration and/or model selection) before any new qualification cycle; a new cycle needs a fresh plan and fresh exact approval.

### 2026-08-22 — Run l4 executed: both roles NO-GO on closed-contract semantics; prompt iterated again
- Run `story-1-11-2026-08-22-l4`, attempt `e8e33b1d-4902-4012-9e04-b1aba4def738`, plan_ref `9669d7e1…`, fresh exact approval (13:21:15Z superseded by 13:23:38Z record), independently verified post-run (all predicates pass).
- Outcome: both probes produced genuine ideas (input-echo fixed), but the 70B violated closed local-mode Candidate semantics (non-empty `grounded_numbers`, digits in narrative, invitation style) and the 8B emitted `why_fits.text` as a dotted literal key. Both NO-GO at probe; 2 calls; allowance consumed; no refs. Evidence retained under `results/story-1-11-2026-08-22-l4-*`.
- Root cause: the iterated prompt described schema fields but not the closed validator's local-mode semantics (empty `grounded_numbers`, qualitative narrative, Spark-naming confident invitation, nested object shapes). Prompt re-iterated to encode those rules verbatim from `src/pipeline/contracts.mjs`; a prompt-conformant synthetic Candidate now passes `validateCandidate` offline.
- Note: the l3 plan never made a call (adapter refused on approval-form mismatch — exact float and timestamp-ordering requirements); it is superseded by l4/l5 lineage.

### 2026-08-22 — Run l6 executed: PRIMARY GO (20/20), fallback NO-GO
- Run `story-1-11-2026-08-22-l6`, attempt `051e6560-6ba0-42f4-ba67-ff4af74f467c`, plan_ref `c9a53641…`, Justin's fresh exact approval (2026-08-22T13:36:51Z, cap 42, max $0.24480162). Independently verified post-run: `"valid": true`, all predicates pass.
- **Primary** (`llama-3.3-70b-instruct-fp8-fast`): **GO** — probe + 20/20 direct-valid trials, all 23 predicates. STRUCT-GENERATION ref `4f9270f783f2d986deb768e914b10d79c6aecb45749180c9fded3eb85a8cc7d3`. Known spend $0.0132045.
- **Fallback** (`llama-3.1-8b-instruct-fast`): **NO-GO** at probe — omitted the required `grounded_numbers` key (schema-shape error, third distinct structural failure mode for the 8B). No ref emitted.
- Role qualification set emitted with the GO primary as sole member; `role_ref` `632d5a709500bb2ce569058dd20a5708a81fa856c3867f34495f1df71cb3e8fa`; cycle_ref `924f1892fadee1cb3f81e070c96b83282a72fe1fcd5162d8f9ed7ad7eb6db57b`. 22 calls total, under cap and cost ceiling.
- Open architecture decision: the pipeline's generation role is designed with a primary/fallback pair; the fallback currently holds no qualification authority. Options: re-qualify the 8B with further prompt iteration, select a different fallback model, or redefine the role topology. Requires Justin's decision before Story 1.12/1.26 wiring.

### 2026-08-22 — Run l7 executed: primary GO again (new ref), gpt-oss-20b fallback NO-GO on provider error
- Run `story-1-11-2026-08-22-l7`, attempt `77253e3e-24a9-4e1a-bd48-6a64336d9643`, plan_ref `8a5e5797…`, fresh exact approval (2026-08-22T13:55:14Z, cap 42, max $0.15293019). Independently verified: `"valid": true`.
- **Primary** (`llama-3.3-70b-instruct-fp8-fast`): **GO** — 20/20 direct-valid under the current source identity; new STRUCT-GENERATION ref `257ae0fa088ddfe3d63ad8406618712ed0b85e1ef353a27bdbee900117410cba`; role_ref `7ff554dd0a59849bdd44c8b4af366b8bace22651d549fb655c7237e49e00ad55`. Known spend $0.013182.
- **Fallback** (`gpt-oss-20b`, reselected per Justin's 2026-08-22 decision): **NO-GO** — probe returned `provider_error` with no output/usage. The same model and adapter convention hold a judge-role GO (2026-08-19), so this reads as transient provider failure rather than model incapacity; a fresh cycle is the remedy.

### 2026-08-22 — Run l8 executed (full 42 calls): primary GO, fallback NO-GO at 16/20
- Run `story-1-11-2026-08-22-l8`, attempt `9b4eb2e4-9e59-407c-8a46-7ca2f44ec364`, plan_ref `dc5a45b1…`, fresh exact approval (2026-08-22T14:03:36Z, cap 42, max $0.15293019). Independently verified: `"valid": true`.
- **Primary**: **GO** — third consecutive 20/20 cycle; ref `686a7b31106644d68bdf835d48f3f9a01467dc111d90e28e461d9bb`; role_ref `159cd2e587fa21239d3ff8a7ba68174673918149462cbb7ec074ab5913bb1079`.
- **Fallback** (`gpt-oss-20b`): probe passed; 20 trials, **16/20 direct-valid < 19/20 threshold → NO-GO**. Failures: 3 transient `provider_error` (trials 3/16/18, no usage retained) + 1 genuine `invalid_output` (trial 20 mentioned pricing, forbidden by the closed contract). When the model responded, 16/17 were direct-valid.
- Assessment: the dominant failure mode is transient provider instability (~15% this cycle), which the zero-retry policy converts directly into threshold failure. Decision recorded as open for Justin: retry another cycle as-is, amend the retry policy for transient provider errors (governance change), change the role topology (qualified primary + house fallback), or reselect again.

### 2026-08-22 — Run l9 executed under transient-retry amendment: primary GO (4th consecutive), fallback NO-GO at 17/20
- Run `story-1-11-2026-08-22-l9`, attempt `406d10ea-8629-4a24-ab8f-8873b0332e96`, plan_ref `54260261…`, Justin's fresh exact approval (2026-08-22T14:43:55.000Z, cap 63, max $0.30586038). First cycle under the transient-retry amendment (1 retry per scheduled call on `provider_error`/`timeout` only; `schedule.transient_retry_only` predicate passes on both roles). Independently verified post-run: `"valid": true`, all 23 predicates.
- **Primary** (`llama-3.3-70b-instruct-fp8-fast`): **GO** — fourth consecutive 20/20 direct-valid cycle, zero retries needed; new STRUCT-GENERATION ref `34731e26b1c1ef79acd444ba8e775143d9a616c3ab915f52481bd81475796bfc`; role_ref `5cf5a547b29d31304af686c610da9c4c5959299faf12d434db28493de92404b1`; cycle_ref `e615e7c03568bbf2ef9683131331909d1a5c5a6b6de2feabc3fd98bd9d0da8ae`. Known spend $0.0130245.
- **Fallback** (`gpt-oss-20b`): **NO-GO** — 17/20 direct-valid < 19/20 threshold. Failures: 1 trial with `provider_error` on both attempts (retry exhausted, index 3); 2 genuine `invalid_output` pricing-language violations (indices 11, 17 — the model's plan text mentioned "pricing", forbidden by the closed contract). 3 further transient provider_errors (indices 9/14/19) were absorbed by the retry and classified direct-valid — the amendment worked as designed for recoverable transients.
- Assessment: the retry amendment eliminated recoverable transients as the dominant failure mode, but gpt-oss-20b still shows (a) residual provider instability beyond one retry and (b) a genuine prompt-compliance gap on the pricing rule (2/20 this cycle, 1/20 in l8). 46 records (2 probes + 40 trials + 4 retries), under cap and cost ceiling; fallback cost partially unknown (5 records without usage). Decision returns to Justin: another cycle as-is, further prompt iteration targeted at the pricing rule, topology change (qualified primary + house fallback), or reselect.
