---
title: 'Judge Structural Recovery Matrix'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: true
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
warnings: ['oversized']
deferred: []
epic: 1
story: 4
baseline_revision: 'c88fcd48af05319392c14198761ba83fc544f685'
baseline_commit: 'c88fcd48af05319392c14198761ba83fc544f685'
operator_actions:
  - id: 'story-1-4-live-authority'
    status: 'pending'
    action: 'Confirm the active Wrangler account/profile and plan headroom, review the exact frozen recovery plan and retained fields, and freshly approve its plan ref, approval run id, 42-call cap, and maximum cost before any provider call.'
---

<intent-contract>

## Intent

**Problem:** Story 1.3 now provides a candidate-bound evidence-v2 harness and offline verifier, but the live runner can treat command-line assertions as approval and cannot emit the closed per-configuration `QualificationManifest` records and exact `STRUCT-JUDGE` refs required by AD-11. Running it now would spend the single governed recovery allowance without proving that fresh authority matched the exact disclosed plan.

**Approach:** Add a closed, hash-bound recovery plan and approval handshake ahead of the existing isolated two-probe/40-trial protocol, then derive independently verified qualification manifests and refs from retained evidence. Complete all offline preparation unattended; stop for the pending operator action before any Workers AI call.

## Boundaries & Constraints

**Always:** Preserve the frozen model order and request identity; bind approval to provider, resolved models, prompt/wire schema/adapter/runtime/source identities, timeout policy, retained fields, 42-call cap, maximum-cost estimate, and one approval run id. Keep primary and fallback trial counts, direct-valid/post-repair rates, latency, usage, outcome, manifest, and ref independent. Require at least 19/20 direct-valid trials per configuration and all 18 Story 1.3 predicates for GO. Emit qualification refs only after the retained operational evidence and qualification bundle independently verify.

**Block If:** Exact live approval is absent or mismatched; current account/plan/headroom or maximum cost cannot be disclosed; frozen source/runtime/request identity drifts after approval; prior operational recovery evidence shows the allowance was already spent; a provider/configuration beyond the frozen Workers AI pair is proposed; or producing one activation-level `judge_ref` from the two structural refs is required in this story without an authoritative contract.

**Never:** Infer live-provider authority from this invocation, a clean Git tree, passing offline tests, or historic approval text. Never call Workers AI from CI or unattended execution; retry or replace a counted call; pool rates; synthesize provider `candidate_ref`; overwrite/reclassify immutable v1 evidence; create deployments, routes, KV/DO/assets, persistent Worker names, or production bindings; edit production Worker paths, root runtime/deployment configuration, `runtime-baseline.json`, or orchestrator-owned `sprint-status.yaml`; start a third matrix after a second NO-GO.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Exact approval | Closed fresh approval matches the frozen plan ref and approval run id | Preflight may proceed to the isolated adapter after every offline identity check passes | Any mismatch retains a zero-call blocked artifact |
| Probe stop | Both probes are recorded and either is rejected, times out, or returns no content | `NO-GO`; no counted trials and no qualification refs | Retain and independently verify the two-call evidence |
| Full matrix | Both probes return content under the exact request | Run 20 sequential trials per model, with no retries/replacements | Retain every failure in its model denominator |
| Structural GO | Each model has at least 19/20 direct-valid trials and all integrity predicates pass | Emit two closed `QualificationManifest` values and exact refs | Refuse output when any manifest field or evidence binding differs |
| Structural NO-GO | Either model misses threshold or any integrity predicate fails | Complete truthful `NO-GO`, emit no qualifying refs, block dependents, require MVP review | Refuse a third matrix |
| Prior recovery | A retained operational recovery artifact already exists | Zero provider calls | Report the existing evidence/ref and stop |

</intent-contract>

## Code Map

- `spikes/judge-fidelity/contract.mjs:1-113` -- frozen model pair, candidate-bound outer result, canonical verdict, 18-predicate oracle, and domain-separated hash primitives; reuse without weakening the contract.
- `spikes/judge-fidelity/evidence-v2.mjs:23-35,78-143,173-203,207-408` -- frozen source/v1/runtime identities, deterministic evidence finalization, operational builder, and total offline verifier; treat verified evidence as the only qualification input.
- `spikes/judge-fidelity/run.mjs:26-53,69-145,147-268,297-347,512-537,697-872` -- current cost disclosure, option authorization, request manifest, loopback preflight, exact recovery protocol, publication, and CLI dispatch. Recompute source/runtime/request identities from current bytes after the last call and before derivation/publication. A cross-process single-spend guard must bind one attempt nonce across lock and receipt, durably sync the receipt file and parent directory before each provider call, and never auto-recover a stale pathname through a check/unlink race; an unsafe or unprovable state blocks.
- `spikes/judge-fidelity/qualification.mjs` -- new pure closed-schema module for recovery plan/ref, approval matching, AD-11 `QualificationManifest` validation/ref derivation, and evidence-bound GO/NO-GO output. All public validators/verifiers must return structured invalid results for arbitrary JSON without throwing; aggregate usage arithmetic must remain safe; observed latency, reported/missing usage, actual computable cost, and conservative maximum cost remain distinct per model; pin an independently computed qualification-ref vector.
- `spikes/judge-fidelity/worker.mjs:49-182` -- exact request/binding and one-call isolated adapter boundary; read-only unless a plan identity must expose an already behavior-bearing value.
- `spikes/judge-fidelity/start-adapter.mjs:11-25`, `verify-launcher.mjs:8-39`, and `wrangler.toml:1-11` -- runtime-bound loopback launcher and remote-AI-only config; preserve zero-inference verification and isolation.
- `spikes/judge-fidelity/test.mjs:356-367,502-680,748-819` -- extend the existing 33-test/79-fixture/18-predicate harness with approval, governance, manifest, threshold, and ref cases. Include real child-process contention/termination at lock, receipt-renamed, call-started, and each publication boundary; unsafe stale-lock variants; exact expiry/future/over-four-hour approval boundaries; malformed nested values; safe-integer overflow; symlinked output parents; temporary cleanup; fixed hash/metric vectors; and the normal `check` composition.
- `spikes/judge-fidelity/README.md`, `package.json` -- document and expose plan/disclosure, explicit approval-file, live, evidence verification, and qualification verification commands; remove stale handoff wording. Use the generated approval-template filename consistently or document the exact reviewed rename/copy, and never describe a multi-file write as atomic unless a crash-visible completion protocol makes it so.
- `spikes/judge-fidelity/results/2026-08-16-d2b84005.{json,md}` and `-audit.md` -- immutable v1 NO-GO evidence; retain pinned bytes and 0/20 facts.
- `src/worker.js`, root `worker.js`, root `wrangler*.toml`, `worker-configuration.d.ts`, `runtime-baseline.json`, and `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only boundaries.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/judge-fidelity/qualification.mjs` -- implement total closed run-plan/approval validators plus canonical plan/ref and per-model AD-11 manifest/ref derivation; bind outputs to independently re-read evidence identities, approval run id, exact exclusive approval window, independent safe aggregates, observed usage/cost/missingness, and deterministic GO/NO-GO semantics; freeze an external expected qualification-ref vector.
- [x] `spikes/judge-fidelity/run.mjs` -- generate the frozen disclosure before authorization, accept one explicit approval record, and enforce one crash-safe cross-process recovery allowance. Bind lock and receipt to one attempt, sync parent-directory metadata before invocation, prefer fail-closed manual recovery over unsafe stale-lock takeover, re-read current identities after calls, and publish plan/template plus evidence/Markdown/qualification using completion markers or an equivalent reader-verifiable crash-consistent protocol. Validate physical output containment and safe basenames.
- [x] `spikes/judge-fidelity/test.mjs` -- test every I/O matrix row and every review-loop-1 failure mode with independent expected values and real child processes: simultaneous stale takeover, dead owner with missing/malformed/spent receipt, kill after receipt rename and before/after provider dispatch, kill at every publication boundary, post-call source/runtime drift, malformed closed containers, approval at/future/beyond each time boundary, free-plan ceiling, aggregate overflow, symlink-parent escape, temp cleanup, actual metrics, pinned ref, and exact CI gate composition.
- [x] `spikes/judge-fidelity/README.md` + `package.json` -- expose truthful offline plan/verify commands and the exact operator-only live sequence; disclose provider, models, identities, timeout policy, retained fields, cap, current price basis, maximum and observed cost, and outcomes without implying approval, atomicity, or GO beyond what crash tests prove.

**Acceptance Criteria:**
- Given passing offline gates and a frozen disclosed recovery plan, when authority is checked, then only one fresh closed approval with the exact plan ref and approval run id can permit provider calls; missing, stale, open, or mismatched approval yields verified zero-call evidence.
- Given exact approval and an identity-matching isolated adapter, when the run executes, then both probes precede all trials; a rejected, timed-out, or content-empty probe stops at two calls, otherwise exactly 20 sequential trials per model run with no retries, replacements, CI execution, deployment, or persistent resource.
- Given retained operational evidence, when offline verification and qualification derivation run, then all 18 predicates and 79 fixtures recompute, every record/rate/latency/usage/provenance field is checked, and primary/fallback results remain separate.
- Given each configuration independently reaches at least 95% direct-valid and all integrity predicates pass, when the qualification bundle is derived, then it contains two exact closed AD-11 manifests and domain-separated `qualification_ref` values bound to the approved run and tested source identity.
- Given any threshold, integrity, approval, identity, or governance failure, when the outcome is derived, then it is fail-closed, emits no qualifying refs, retains truthful evidence, blocks dependent work, and requires MVP review after a second NO-GO with no third matrix.
- Given a live process changes any frozen source/runtime/request byte after preflight or crashes at a lock, receipt, provider-dispatch, or publication boundary, when another process inspects the recovery directory, then current identities are independently re-read and the second process either observes one complete verified attempt or blocks with zero calls; it never unlinks a successor lock, loses proof of started spend, or treats a partial set as complete.
- Given arbitrary malformed plan, approval, evidence, or qualification JSON, when the public validators and standalone verifiers run, then they return or print a structured invalid result without throwing from an unchecked nested dereference; no malformed value can authorize calls or emit refs.
- Given deterministic records with complete, missing, and maximum-safe usage values, when per-model manifests are derived, then latency, reported/missing usage, observed computable cost, conservative maximum cost, and overflow handling match independently calculated fixtures and remain separate by model.
- Given the canonical example qualification manifest, when its ref is derived, then it matches an externally pinned SHA-256 for `oddspark-qualification/v1\n` plus canonical JSON and changes under a different domain.
- Given repository verification, when the offline suite, explicit artifact verifiers, config/runtime gates, immutable-v1 hash check, and `git diff --check` run, then they pass without credentials, provider calls, production/read-only changes, or remote mutation.

## Spec Change Log

### 2026-08-18 — Review loop 1
- Trigger: the first implementation passed its in-process suite but cached pre-call identities through publication, used an attempt-unbound check/unlink stale-lock recovery, did not sync receipt-directory metadata, exposed crash-partial multi-file publication, and left malformed-input, approval-boundary, metric/ref, and physical-path guarantees under-specified.
- Amendment: made post-call live identity re-reads, attempt-bound single-spend state, directory durability, fail-closed stale recovery, reader-verifiable completion, total validators, exclusive approval bounds, safe/actual metric derivation, independent hash vectors, physical output containment, and child-process crash/race tests explicit in the Code Map, tasks, ACs, and verification expectations.
- Known-bad state avoided: a second process can no longer race-unlink a successor lock or proceed after spend proof is lost, and a self-consistent implementation cannot certify stale identities, wrong refs/metrics, malformed verifier crashes, or partial artifacts as complete.
- KEEP: preserve the exact closed plan/approval concept; frozen two-model request and 42-call protocol; two probes before trials; independent 19/20 thresholds and two refs; zero-call missing-authority evidence; immutable v1 bytes; 79 fixtures and 18 predicates; offline/CI isolation; current official pricing basis; read-only production/runtime/orchestrator boundaries; and no provider, deployment, push, or release authority.

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 10: (high 4, medium 6, low 0)
- patch: 0
- defer: 0
- reject: 3: (high 0, medium 1, low 2)
- addressed_findings:
  - `[high]` `[bad_spec]` Re-read current source/runtime/request identities after calls instead of verifying and publishing against cached preflight snapshots.
  - `[high]` `[bad_spec]` Bind lock and spend receipt to one attempt and remove the check/unlink stale-takeover race that can admit concurrent callers.
  - `[high]` `[bad_spec]` Sync receipt parent-directory metadata before provider invocation so a completed rename cannot vanish after a crash.
  - `[high]` `[bad_spec]` Replace rollback-only multi-file writes with a reader-verifiable crash-consistent completion protocol for recovery evidence.
  - `[medium]` `[bad_spec]` Make plan, approval, and qualification validators total and no-throw for arbitrary malformed nested JSON.
  - `[medium]` `[bad_spec]` Freeze exclusive approval-time boundaries and honest free-plan ceiling behavior with zero-call negative tests.
  - `[medium]` `[bad_spec]` Derive safe observed per-model latency, usage, missingness, and cost separately from conservative maximum cost.
  - `[medium]` `[bad_spec]` Pin qualification domain separation and manifest metrics to independent expected vectors rather than production helpers.
  - `[medium]` `[bad_spec]` Make plan/artifact output physically contained and crash-consistent across symlink, basename, temporary, and template-name cases.
  - `[medium]` `[bad_spec]` Exercise the single-spend and publication boundaries with real child-process contention/termination and pin Story 1.4 in the normal CI gate.

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 3, medium 7, low 1)
- defer: 0
- reject: 14: (high 8, medium 5, low 1)
- addressed_findings:
  - `[high]` `[patch]` Require the immutable marker-bound disclosure pair on the real live path and move operator approval into a distinct canonical file.
  - `[medium]` `[patch]` Reject noncanonical or duplicate-key on-disk plan and approval records before authority evaluation.
  - `[medium]` `[patch]` Bound plan creation to approval by one hour in addition to the existing four-hour approval lifetime.
  - `[high]` `[patch]` Normalize complete unambiguous canonical or input/output token usage before evidence retention and treat unsupported shapes as missing.
  - `[medium]` `[patch]` Reopen a reserved zero-call receipt only when a complete verified artifact proves the same attempt completed without spend.
  - `[medium]` `[patch]` Make every unexplained temporary publication artifact block even when an older zero-call artifact verifies.
  - `[high]` `[patch]` Require both public verifier CLIs to validate the exact marker-bound evidence, Markdown, and qualification publication before PASS.
  - `[medium]` `[patch]` Bind plan and qualification verification to the independently retained immutable-v1 evidence hash.
  - `[medium]` `[patch]` Pin the CI-facing check composition to exactly one Story 1.4 self-test invocation.
  - `[medium]` `[patch]` Exercise valid completed on-disk plan and distinct approval loading through runLive with offline fake invocation seams.
  - `[low]` `[patch]` Prove the qualification CLI reports INVALID and exits nonzero for an invalid publication.

## Design Notes

- The Story 1.3 evidence-v2 schema remains the provider-call record. Story 1.4 layers a separately closed qualification bundle over verified evidence so approval and AD-11 manifests do not silently redefine the 18-predicate oracle.
- “Fresh approval” is an exact plan capability, not a boolean CLI assertion: disclosure creates the plan ref; the operator supplies the matching approval record; only then may the isolated live command run.
- This story emits one qualification ref per model configuration. Selection or aggregation into the later singular production activation `judge_ref` is outside Story 1.4 and must not be invented here.
- Crash consistency is defined at the reader surface: no consumer treats a multi-file set as complete until an atomically published completion marker binds every sibling name and byte hash. Orphans block or are safely ignored only when zero spend is independently proven.
- A lock pathname is not authority. A stale lock is automatically recoverable only through a race-free primitive that proves the exact dead attempt and its durably retained zero-call receipt; otherwise recovery is a separate operator action and this command blocks.
- The qualification verifier must recompute identities from current repository/runtime bytes at verification time. Test dependency injection may supply deterministic equivalents, but production live execution may not replace post-call current-state reads with cached closures.

## Verification

**Commands:**
- `npm run spike:judge:self-test` -- expected: all existing and new offline contract, approval, governance, manifest/ref, mutation, retention, isolation, child-process crash/race, pinned-vector, and physical-path cases pass with 79/79 fixtures and 18/18 predicates.
- `npm run spike:judge:verify -- --file <retained-evidence-v2.json>` -- expected: explicit retained evidence verifies without network access.
- `npm run spike:judge:qualification:verify -- --file <qualification-bundle.json>` -- expected: plan, approval, evidence hash, two manifests, rates, and refs independently recompute.
- `npm run check` -- expected: application, baseline, generated types, config dry-run, and runtime-baseline gates pass without provider or remote mutation.
- `git diff --check` -- expected: no whitespace errors.
- `git status --short` -- expected: only Story 1.4 harness/docs/spec files change; every read-only boundary stays absent.

## Auto Run Result

### Summary

Implemented the offline, approval-gated Story 1.4 judge structural recovery matrix. The harness now publishes and verifies closed recovery plans, canonical approvals, attempt-bound single-spend state, crash-consistent evidence sets, independent per-model qualification manifests, and exact structural refs without granting or exercising live-provider authority.

### Files Changed

- `package.json` -- exposes plan, evidence, qualification, and live commands and includes the Story 1.4 suite once in the normal check chain.
- `spikes/judge-fidelity/README.md` -- documents the immutable disclosure, distinct canonical approval, operator-only live sequence, and marker-bound verification contract.
- `spikes/judge-fidelity/evidence-v2.mjs` -- strengthens operational evidence identity, provenance, total validation, and independently retained legacy bindings.
- `spikes/judge-fidelity/run.mjs` -- adds disclosure/approval enforcement, usage normalization, crash-safe locking and receipts, recovery discovery, publication markers, and the governed live protocol.
- `spikes/judge-fidelity/test.mjs` -- provides 75 offline tests, including real child-process crash/race coverage and public verifier/CLI/operator-path regressions.
- `spikes/judge-fidelity/verify-v2.mjs` -- requires a canonical marker-bound completed publication before reporting evidence PASS.
- `spikes/judge-fidelity/qualification.mjs` -- adds closed plan/approval/manifest/bundle derivation and independent qualification/publication verification.

### Review Findings

- Patches applied: 11 (high 3, medium 7, low 1).
- Items deferred: 0.
- Items rejected after deduplication and code/test validation: 14 (already covered behavior, obsolete-path findings, duplicates, or unsupported threat-model/contract expansions).

### Follow-up Review Recommendation

- `true` -- the current pass patched 3 high, 7 medium, and 1 low findings. Patch score: `3 x 7 + 1 x 1 = 22`; the high-severity trigger also applies.

### Verification Performed

- `npm run spike:judge:self-test` -- PASS: 75/75 spike tests, 79/79 shared fixtures, 18/18 evidence predicates.
- `npm run check` -- PASS: 31/31 application tests, 57/57 baseline tests, the complete Story 1.4 suite, generated types, both config checks, and runtime baseline identity `4c9c52065a99596617970c3620b5d873c6465bfd6ab589681ef2fb13f3b311b8`.
- Public evidence and qualification CLI success/failure behavior -- PASS through marker-bound completed-set subprocess tests; no live artifact was fabricated.
- Immutable v1 evidence -- PASS: JSON `1cc4431088e37ba069e128e0059f19229551de2398db0d686524bc70aa752377`, Markdown `0fde75016daa6556ece35be8abd54faaebc4eed6a82156fd834bd127fd263562`, audit `4695bae9056e14e8b961111f9be6802c8faab2ebf932963e6425315c43d4e16b`.
- `git diff --check` and changed-file boundary audit -- PASS; only the seven Story 1.4 reviewed-diff files changed and production/runtime/orchestrator boundaries remained untouched.

### Residual Risks

- The operator action remains pending: confirm the active Wrangler profile and current plan/headroom, generate and review the exact disclosure, create a fresh matching approval, and deliberately execute the one permitted live matrix.
- No Workers AI/provider call occurred in this workflow, so there is no real operational evidence, live GO/NO-GO result, or production-usable `STRUCT-JUDGE` ref yet.
- This result grants no push, deployment, merge, release, or future-story authority.
