---
title: 'Judge Recovery Contract and Offline Verifier'
type: 'feature'
created: '2026-08-17'
status: 'done'
review_loop_iteration: 5
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: ['oversized']
deferred: []
epic: 1
story: 3
sprint_key: '1-3-judge-recovery-contract-and-offline-verifier'
baseline_revision: 'd69ddf1755e9d4afe7648988949d3458ece01a34'
baseline_commit: 'd69ddf1755e9d4afe7648988949d3458ece01a34'
---

<intent-contract>

## Intent

**Problem:** The legacy judge spike is honest NO-GO evidence, but its verifier does not prove candidate binding, recursively close and type-check retained evidence, bind a run to the exact adapter/runtime, or publish the hash-bound closed predicate oracle required by downstream qualification stories.

**Approach:** Preserve the v1 evidence and interpretation byte-for-byte, then add a coexisting versioned evidence-v2 offline contract, fixtures, exact verifier, deterministic report, and adapter-identity handshake. Story 1.3 performs no live inference; it makes the one separately governed Story 1.4 recovery run auditable before spending.

## Boundaries & Constraints

**Always:** Keep the outer result exactly `JudgeResult {candidate_ref, verdict}` and the inner verdict exactly `{pass,gates[9],tone,claims}` with closed nested objects, strict types, gate IDs 1–9 exactly once, nonblank reasons, and fail-safe pass semantics. Derive `candidate_ref` as `sha256("oddspark-candidate-ref/v1\n" + canonical_json({candidate_schema_version,candidate}))`; require the unmodified provider result to echo the exact reference and never let an adapter synthesize or repair it. Export an ordered machine-readable closed predicate list, hash its canonical form, embed that identity in v2 evidence and deterministic reports, and recompute every predicate offline. Bind evidence to the frozen runtime baseline and exact source/adapter/config identity. Count declared fixture cases and predicates, not test functions.

**Block If:** Implementing the verifier requires redefining the canonical judge contract, weakening candidate-echo requirements, authorizing a provider/configuration, or changing the approved single-recovery governance boundary.

**Never:** Overwrite, reclassify, rename, or regenerate the dated v1 JSON/Markdown/audit artifacts; use changed v2 rules to reinterpret v1; make live AI/network calls; request operator approval; deploy, upload, create, or mutate remote resources; edit production request paths, root deployment bindings, `runtime-baseline.json`, or orchestrator-owned `sprint-status.yaml`; broaden repair beyond the declared one-step transport-wrapper allowlist; invent, coerce, omit, or recompute semantic verdict content.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid bound result | Closed outer result, exact computed `candidate_ref`, exact valid inner verdict | Direct-valid classification; canonical verdict retained losslessly | No error expected |
| Binding failure | Missing, extra, non-string, synthesized, or mismatched `candidate_ref` | Predicate and classification fail; candidate is never accepted | Stable binding failure; no repair |
| Verdict drift | Unknown/missing field, wrong type, duplicate/missing gate, blank reason, or `pass:true` with any failed child | Exact validator rejects | Stable schema-invalid result; no coercion |
| Transport normalization | One allowed wrapper repair around one otherwise exact result | Separately classified repaired-valid with repair kind | Chained, ambiguous, syntactic, or semantic repair rejects |
| Ambiguous/large envelope | Conflicting response locations or content above the 64 KiB limit | Ambiguity/size precedence is deterministic | Stable fail-closed classification |
| Valid v2 evidence | Exact closed nested evidence with matching hashes, counts, rates, runtime, identity, authorization facts, and reports | Offline verifier recomputes all values and exits 0 without network | No error expected |
| Mutated v2 evidence | Any unknown/type/cardinality/hash/classification/rate/report/authorization/identity mutation | Offline verifier exits nonzero and names the failed predicate | No partial acceptance or first-truthy fallback |
| Legacy evidence | Original v1 JSON, Markdown, and audit addendum | Expected byte hashes and 0/20-per-model NO-GO facts remain unchanged | Drift or attempted reinterpretation fails tests |

</intent-contract>

## Code Map

- `spikes/judge-fidelity/contract.mjs:118-204` -- reuse strict key/check/verdict validation; extend with a separately versioned outer `JudgeResult` schema, candidate-ref derivation/match, and v2 classification without weakening the inner contract.
- `spikes/judge-fidelity/contract.mjs:360-401` -- reuse canonical JSON/hash/request fingerprint primitives; candidate and predicate identities need explicit domain separators. Reject candidates/schema versions that are not already valid canonical-JSON inputs, and pin the exact predicate-oracle hash in an independent test so implementation drift cannot self-certify under the same version.
- `spikes/judge-fidelity/contract.mjs:418-624` -- reuse envelope ambiguity, 64 KiB precedence, allowlisted one-step repair, and taxonomy; v2 parsing must operate on the outer bound result.
- `spikes/judge-fidelity/fixtures.json:110-145` -- extend the fixture catalog for outer binding, closed objects, every verdict invariant, repair/ambiguity/size precedence, chained-repair rejection, provider error, timeout, malformed evidence, duplicate fixture IDs, usage/timestamp validation, and contradictory outcome reasons. Fixture IDs are unique and the dedicated v2 verifier must actually execute each case and derive passing IDs from observed results.
- `spikes/judge-fidelity/run.mjs:283-335` -- deterministic Markdown renderer; v2 report must expose independently computed predicate identity/results, executed fixture coverage, taxonomy, rates, latency/usage, and provenance. Synthetic fixtures may demonstrate verifier behavior but must never produce or label an operational recovery `GO`.
- `spikes/judge-fidelity/run.mjs:342-396` -- reuse source/input/runtime capture, adding frozen `runtime-baseline.json` identity and an exact observed adapter/config handshake. Before calls, compare every health descriptor/hash field to independently derived expected values; retain the exact observed closed health response, endpoint, HTTP status, outbound request hash/body identity, and actual source/config/runtime byte identities so evidence proves which served adapter handled the run rather than only what local code expected.
- `spikes/judge-fidelity/run.mjs:526-624` -- replace shallow verification with a total general evidence-v2 verifier. Recursively close and strictly type every nested value, including identity/hash syntax, legacy facts, manifests, adapter/health descriptors, envelopes (no unallowlisted provider metadata), usage token arithmetic, record/run timestamps and bounds, summaries/rates, predicate booleans, authorization booleans/numbers, and reports. On structural failure mark dependent predicates not-passed rather than default-true. Require retained `{id,pass}` to equal recomputation. Operational evidence freezes the exact approved model pair/call cap/estimate and one common candidate/ref/request; no larger cap or extra calls/models qualify. Run both indexed probes before the first trial. Rejected/no-content probes retain NO-GO without requiring approval/headroom that preflight explicitly lacked; successful preflight requires exact boolean approval/headroom. Counted matrix failures remain in the denominator. Verification reruns fixtures and binds observed health/request/source/runtime evidence. Deterministic outcome may say GO only when every non-report integrity predicate passes; diagnostic reasons are exact. Construct operational evidence explicitly and recompute v1/runtime facts.
- `spikes/judge-fidelity/worker.mjs:25-147` -- the served adapter path must accept the candidate reference as frozen request input and return the provider's unmodified outer candidate-bound result; it must not advertise v2 until `/run` actually enforces v2. Bind the health identity to the full strict descriptor: prompt/messages, full wire schema, request parameters, model allowlist, candidate-binding version, adapter/config source hashes, and runtime identity; close and type-check the health response.
- `spikes/judge-fidelity/test.mjs:302-357` -- existing custom Node fixture harness; share actual fixture execution with self-test/artifact verification. Mutation-test each exact predicate and retained pass. Add complete operational matrices proving both probes precede the first trial, common candidate/request, strict approved cap/estimate, no undeclared calls, chronological non-overlap within run bounds, and verifier rejection of trial-before-second-probe. Cover forged/stale/missing/extra health identity, retained observed descriptor drift, truthy non-boolean authorization, nested envelope/provider metadata, symbol-keyed/non-JSON candidate state, probe index, malformed hashes/scalars, usage arithmetic, and supplied-path verification. Retain all prior stop/continuation, exception-safety, v1, identity, offline, and dev-script coverage.
- `spikes/judge-fidelity/results/2026-08-16-d2b84005.{json,md}` and `spikes/judge-fidelity/results/2026-08-16-d2b84005-audit.md` -- immutable/read-only v1 evidence. Pin current SHA-256 values `1cc4431088e37ba069e128e0059f19229551de2398db0d686524bc70aa752377`, `0fde75016daa6556ece35be8abd54faaebc4eed6a82156fd834bd127fd263562`, and `4695bae9056e14e8b961111f9be6802c8faab2ebf932963e6425315c43d4e16b` plus the conservative 0/20 facts.
- `spikes/judge-fidelity/README.md` -- document v1 preservation, v2 predicate/version rules, offline verification, and the Story 1.3/1.4 authority boundary.
- `package.json` -- preserve existing production scripts; add or version only explicit offline verifier/self-test commands if necessary.
- `runtime-baseline.json` -- read-only frozen runtime identity consumed by v2 verification.
- `src/worker.js`, root `worker.js`, `wrangler.toml`, `wrangler.offline.toml`, `worker-configuration.d.ts`, and `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only boundaries for this story.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/judge-fidelity/contract.mjs` -- add the versioned outer contract, cycle/prototype/non-JSON canonical-input validation, exact candidate-ref computation/match, ordered closed predicate oracle with a frozen independently asserted hash, and fail-closed v2 classification while retaining v1 behavior -- establish the canonical offline recovery contract without uncontrolled recursion or self-certifying drift.
- [x] `spikes/judge-fidelity/fixtures.json` + `spikes/judge-fidelity/test.mjs` -- execute and count every I/O matrix case and oracle predicate through one shared executor; assert each mutation fails under its exact predicate ID; cover malformed nested shapes without throws, provider error/timeout retention, exact operational cardinality, usage/timestamps, deterministic reasons, duplicate IDs, unknown versions, immutable v1, exact source handshake, and prohibited network use; repair the Story 1.2 dev-script expectation -- make the complete contract executable and truthful.
- [x] `spikes/judge-fidelity/run.mjs` -- implement closed evidence-v2 shapes and a total recursive verifier for arbitrary conforming or malformed evidence; explicitly construct operational evidence; independently recompute runtime/source/adapter binding from actual bytes, legacy facts, authorization/headroom/call accounting, executed fixtures, record states/hashes/classifications, cardinality/indices, rates, deterministic outcome/reasons, per-predicate results, and reports -- make future retained Story 1.4 results independently auditable offline without losing failure provenance.
- [x] `spikes/judge-fidelity/worker.mjs` -- make `/run` enforce the frozen candidate-bound v2 request/result boundary before advertising v2, and return a fully bound exact non-secret adapter identity from health that the runner verifies before provider invocation -- prevent an identity handshake from claiming behavior the served path does not implement.
- [x] `spikes/judge-fidelity/README.md` + `package.json` -- expose two truthfully named commands: a synthetic offline v2 self-test and artifact verification that accepts explicit v2 JSON paths; document probe/matrix stop rules and do not imply the self-test verified a supplied artifact -- make verification discoverable.

**Acceptance Criteria:**
- Given the immutable v1 evidence, when the Story 1.3 suite runs, then all three files match their pinned hashes, the audit remains NO-GO with 0/20 direct-valid and 0/20 post-repair-valid for each model, and no v2 code overwrites or reclassifies them.
- Given any outer result fixture, when v2 classification runs, then the result and every nested object are closed and exact, the echoed `candidate_ref` equals the independently computed candidate hash, gates 1–9/reasons/tone/claims/pass safety are all enforced, and missing, mismatched, synthesized, coerced, repaired-semantic, ambiguous, or oversized content fails closed with a stable class.
- Given the exported predicate oracle, when it is canonicalized, then its ordered entries produce a stable version hash embedded in every v2 evidence artifact and report, and downstream “every integrity predicate” checks can cite that exact hash.
- Given a synthetic valid evidence-v2 artifact, when the verifier runs with outbound network unavailable, then it recursively validates exact shapes and recomputes source/runtime/adapter identities, candidate binding, authorization invariants, per-record classifications/hashes, per-configuration probe/trial cardinalities, rates, outcome, predicate results, and byte-deterministic Markdown, exiting 0 only when every predicate passes.
- Given any arbitrary evidence-v2 artifact that satisfies the frozen schema and predicate oracle, when the offline verifier runs, then it verifies that artifact from its retained inputs rather than comparing it to a regenerated built-in fixture; unsupported or unknown schema versions reject explicitly and synthetic-only evidence cannot claim an operational recovery `GO`.
- Given the local adapter advertises v2, when `/run` is invoked with a frozen candidate reference and exact request, then the provider-facing request requires the unmodified outer result, the returned reference is never synthesized, and health identity changes whenever any prompt, message, full wire schema, parameter, model, binding, adapter/config source, or runtime input changes.
- Given any single nested v2 field, classification, hash, count, rate, report byte, authorization/headroom fact, runtime identity, source identity, or adapter handshake is altered or supplemented, when verification runs, then it exits nonzero and identifies the violated predicate.
- Given provider error, timeout, empty/malformed response, or received content, when evidence is retained and verified, then the original call state/error/envelope provenance survives and classification is recomputed from that state; malformed nested evidence returns named predicate failures without throwing.
- Given the dedicated v2 verification command, when it reports fixture coverage, then it has actually executed every unique declared case through the same shared executor as the test suite and derived passing IDs from observed results; changing one expected result makes the command fail.
- Given operational recovery evidence, when cardinality and authorization predicates run, then each unique configuration has exactly one probe and at least 20 sequential counted trials, call totals/caps/headroom estimates agree, usage and timestamps are closed and valid, and outcome plus reasons are deterministically recomputed. Synthetic self-test evidence is explicitly non-operational and can satisfy only its separate profile.
- Given the frozen approved run plan, when either probe is provider-rejected, times out, or returns no content, then no counted trial runs and a verifiable NO-GO artifact is retained; when both return nonempty content, the full authorized matrix proceeds even if probe content is schema-invalid, and counted failures remain in their denominators without replacement.
- Given retained evidence declares predicate results, fixtures, models, candidates, request fingerprints, and records, when artifact verification runs against an explicit JSON path, then declared predicate booleans equal independent recomputation, current fixtures are actually rerun, every record belongs to the frozen pair and common candidate/request, and JSON plus deterministic Markdown cannot disagree.
- Given a live adapter health response and outbound request, when preflight and evidence construction run, then every descriptor/hash field equals independently derived source/config/runtime/prompt/schema/request expectations, the exact observed closed response and request identity are retained, and any stale, forged, missing, extra, malformed, or locally synthesized-only identity fails before inference or during offline verification.
- Given a complete operational record set, when ordering verification runs, then both probe records have index 1 and end before the first counted trial starts; all subsequent records are chronological, non-overlapping, inside run bounds, and use only the frozen approved call envelope. Preflight-blocked evidence remains a verifiable NO-GO without pretending approval/headroom.
- Given repository validation, when `npm run spike:judge:self-test`, the offline v2 verifier tests, `npm run check`, and `git diff --check` run, then all pass without credentials, provider calls, deployment, upload, remote mutation, or changes to production/read-only files.

### Review Findings

- [x] [Review][Patch] Bind the provider-facing wrapped input candidate to `body.candidate`; the adapter can currently judge one candidate while binding another [spikes/judge-fidelity/worker.mjs:78]
- [x] [Review][Patch] Enforce correspondence between `candidate_schema_version` and the candidate version instead of accepting an internally inconsistent identity [spikes/judge-fidelity/worker.mjs:135]
- [x] [Review][Patch] Validate the complete retained `request_input` before rebuilding and accepting request manifests [spikes/judge-fidelity/evidence-v2.mjs:213]
- [x] [Review][Patch] Validate the frozen source-path manifest before reading any artifact-supplied paths [spikes/judge-fidelity/evidence-v2.mjs:212]
- [x] [Review][Patch] Remove the verifier's retained-fixture fallback and always execute the current shared fixture catalog independently [spikes/judge-fidelity/evidence-v2.mjs:240]
- [x] [Review][Patch] Enforce call-state-dependent record shapes for received, provider-error, and timeout provenance [spikes/judge-fidelity/evidence-v2.mjs:245]
- [x] [Review][Patch] Verify the exact frozen protocol order: both probes, then every first-model trial, then every second-model trial [spikes/judge-fidelity/evidence-v2.mjs:273]
- [x] [Review][Patch] Add a `runLive` boundary test proving adapter-identity failure makes zero inference calls and retains a verifiable NO-GO artifact [spikes/judge-fidelity/test.mjs:630]
- [x] [Review][Patch] Exercise the real adapter launcher, handle spawn errors, and prove the launched health descriptor and pinned executable/runtime identity [spikes/judge-fidelity/start-adapter.mjs:13]
- [x] [Review][Patch] Bound adapter health observation with a fail-closed timeout so preflight cannot hang before retaining zero-call evidence [spikes/judge-fidelity/run.mjs:154]
- [x] [Review][Patch] Restrict retained `response` and `result` envelope values to the allowlisted answer shapes instead of preserving arbitrary provider metadata [spikes/judge-fidelity/worker.mjs:103]
- [x] [Review][Patch] Recompute valid preflight blockers from authorization and adapter state rather than trusting any nonempty blocker string as the relaxed zero-call path [spikes/judge-fidelity/evidence-v2.mjs:260]
- [x] [Review][Patch] Retain partial-call evidence when an invocation or record-construction exception occurs after authorized provider spend [spikes/judge-fidelity/run.mjs:752]
- [x] [Review][Patch] Make JSON and Markdown evidence publication atomic or recover cleanly when the second write fails [spikes/judge-fidelity/run.mjs:711]
- [x] [Review][Patch] Require safe nonnegative integers for token usage so arithmetic cannot silently lose precision [spikes/judge-fidelity/evidence-v2.mjs:255]
- [x] [Review][Patch] Require canonical UTC timestamps and a nonblank safe run ID before deterministic report rendering [spikes/judge-fidelity/evidence-v2.mjs:272]
- [x] [Review][Patch] Strengthen shared fixture execution beyond classification and repair-kind equality to assert binding, locations, validation errors, and verdict identity where declared [spikes/judge-fidelity/fixture-executor.mjs:79]
- [x] [Review][Patch] Preserve integrity failures in deterministic outcome reasons even when preflight blockers are also present [spikes/judge-fidelity/evidence-v2.mjs:162]
- [x] [Review][Patch] Correct the live-call documentation to distinguish the 42-call full matrix from the two-call probe-stop path [spikes/judge-fidelity/README.md:10]

## Spec Change Log

### 2026-08-17 — Review loop 1
- Trigger: the first implementation regenerated one fixed synthetic artifact and compared evidence to it, allowed synthetic unauthorized data to say `GO`, hard-coded passing predicate/fixture claims, routed mutations to the wrong predicate IDs, and advertised v2 in health without implementing the v2 `/run` boundary.
- Amendment: made the general arbitrary-v2 verification surface, operational-vs-synthetic outcome boundary, independent predicate evaluation/routing, executed fixture accounting, strict version dispatch, independently pinned oracle identity, runtime/v1 recomputation, and complete served-adapter identity/enforcement explicit in the Code Map, tasks, and ACs.
- Known-bad state avoided: green self-comparison tests can no longer certify a verifier that rejects every future real Story 1.4 artifact or an adapter identity that claims behavior absent from `/run`.
- KEEP: preserve the exact v1 byte pins and NO-GO facts; retain the strict inner verdict validator, one-step repair/ambiguity/size behavior, domain-separated candidate binding, offline/no-network verification, deterministic Markdown, and Story 1.3/1.4 authority boundary.

### 2026-08-17 — Review loop 2
- Trigger: the rederived verifier still copied declared fixture IDs into passing IDs without execution, lost timeout/provider-error state in operational conversion, accepted arbitrary operational cardinalities, incompletely closed nested evidence, and could throw on malformed arrays/objects instead of returning predicate failures.
- Amendment: required a shared executed-fixture engine, total no-throw recursive validation, exact failure provenance, strict operational cardinality, closed usage/timestamps/run context, authorization/headroom/call accounting, deterministic reasons, explicit operational construction, actual-byte source identity, and expanded mutation fixtures.
- Known-bad state avoided: the standalone verifier can no longer claim unexecuted cases passed, erase the very provider failures a NO-GO must preserve, or crash on adversarial retained evidence.
- KEEP: all Review loop 1 KEEP items; also preserve the independently pinned 16-predicate-or-later oracle approach, exact schema dispatch, synthetic `SYNTHETIC-NO-GO`, candidate-bound `/run`, and the dedicated offline verifier command.

### 2026-08-17 — Review loop 3
- Trigger: the second rederivation still let rejected/empty probes run the matrix, did not bind records to one frozen model pair/candidate/request, accepted contradictory retained predicate booleans, trusted fixture ID arrays without rerunning cases during artifact verification, and wired the documented artifact command to a synthetic self-test.
- Amendment: made probe stop/continuation semantics, frozen run-plan consistency, declared-vs-recomputed predicate equality, verification-time fixture execution, explicit artifact-path CLI behavior, recursive nested closure, and failure-bearing evidence retention mandatory.
- Known-bad state avoided: operational spend cannot continue after a rejected/no-content probe, and an artifact cannot verify while hiding calls/models/candidate drift or contradicting its own report.
- KEEP: all earlier KEEP items; preserve at-least-20 counted trials (not reviewer-proposed exactly-20), continue counted trials after individual matrix failures so every authorized invocation remains in the denominator, and distinguish nonempty schema-invalid probe content from provider rejection/no content.

### 2026-08-17 — Review loop 4
- Trigger: the third rederivation compared only health key presence, synthesized adapter evidence locally instead of retaining the observed descriptor, accepted truthy non-boolean authorization, did not prove both probes preceded every trial, and incompletely closed nested envelope/identity/run-accounting values.
- Amendment: required end-to-end observed health/request identity, strict nested typing/closure and hash syntax, exact approval/cap semantics, not-passed dependent predicates after schema failure, run-bound/order proofs, preflight-blocked NO-GO handling, and GO dependence on all integrity predicates.
- Known-bad state avoided: a stale adapter or forged authorization cannot pass preflight, and paid trials cannot begin before both probes while the retained artifact still claims protocol compliance.
- KEEP: all earlier KEEP items; preserve explicit v2 artifact-path verification, executed fixture reruns, total no-throw verification, probe stop semantics, at-least-20 honest denominator, candidate-bound unmodified outer results, and no live execution in Story 1.3.

### 2026-08-17 — Review loop 5
- Trigger: the fourth rederivation still allowed the two model requests or adapter input to diverge from the bound candidate, self-certified mutable request manifests, lacked counted-trial failure-continuation proof, hard-coded the default endpoint during offline verification, and could lose all governed evidence on adapter preflight or post-call verification failure.
- Amendment: require candidate/schema/request equality across both model requests and the adapter input before inference; rebuild every manifest from frozen contract inputs; bind the observed loopback endpoint; retain verifiable fail-closed evidence for preflight and post-call integrity failure; validate runtime execution against the frozen baseline; and directly test timeout/provider-error continuation at counted-trial indices through the live protocol.
- Known-bad state avoided: paid calls cannot run against candidate-divergent or self-certified requests, and a failed preflight or post-call integrity check cannot erase the only auditable record of authorized spend.
- KEEP: all earlier KEEP items; preserve 79 shared fixture execution, the independently pinned 18-predicate oracle, strict recursive no-throw verification, exact v1 byte pins, two probes before trials, 42-call successful matrices, counted failures without replacement, deterministic reports, and untouched production/orchestrator files.

## Review Triage Log

### 2026-08-17 — Review pass
- intent_gap: 0
- bad_spec: 9: (high 3, medium 6, low 0)
- patch: 0
- defer: 0
- reject: 7: (high 0, medium 0, low 7)
- addressed_findings:
  - `[high]` `[bad_spec]` Generalize v2 verification beyond equality with one regenerated synthetic object and prohibit synthetic unauthorized evidence from claiming an operational GO.
  - `[high]` `[bad_spec]` Require the served `/run` path to enforce the outer candidate-bound v2 contract before health advertises v2; bind identity to every behavior-bearing input.
  - `[high]` `[bad_spec]` Replace hard-coded passing fixture/predicate claims with executed cases and independently recomputed named predicate results.
  - `[medium]` `[bad_spec]` Route closed-shape, cardinality, summary-rate, classification, outcome, and report mutations to their exact predicate IDs and assert each mapping.
  - `[medium]` `[bad_spec]` Recompute immutable-v1 facts and frozen runtime identity from pinned retained inputs rather than copying trusted claims.
  - `[medium]` `[bad_spec]` Reject unknown evidence schema versions explicitly instead of falling through to the v1 verifier.
  - `[medium]` `[bad_spec]` Pin the predicate oracle to an independent expected hash so compatible-looking implementation drift cannot self-certify.
  - `[medium]` `[bad_spec]` Validate canonical candidate inputs and schema-version form before deriving a binding hash.
  - `[medium]` `[bad_spec]` Close and type-check the complete adapter-health response and cover forged, stale, missing, extra, and malformed handshake fields.

### 2026-08-17 — Review pass (loop 2)
- intent_gap: 0
- bad_spec: 8: (high 3, medium 5, low 0)
- patch: 0
- defer: 0
- reject: 8: (high 0, medium 0, low 8)
- addressed_findings:
  - `[high]` `[bad_spec]` Execute every declared fixture in the dedicated verifier and derive passing IDs from observed results instead of copying declarations.
  - `[high]` `[bad_spec]` Retain provider-error/timeout call state and error provenance so authentic NO-GO records can be independently reclassified.
  - `[high]` `[bad_spec]` Make recursive verification total and no-throw for malformed nested evidence while returning stable failed predicate IDs.
  - `[medium]` `[bad_spec]` Enforce exact operational probe/trial/model/index cardinality separately from the explicitly non-operational synthetic profile.
  - `[medium]` `[bad_spec]` Recursively close usage, timestamps, records, identities, reasons, and all nested evidence objects.
  - `[medium]` `[bad_spec]` Recompute authorization headroom, estimates, call caps/totals, outcome, and deterministic reasons from retained inputs.
  - `[medium]` `[bad_spec]` Hash actual adapter/config/runtime source bytes and explicitly construct operational evidence rather than inheriting a synthetic template.
  - `[medium]` `[bad_spec]` Expand tests for duplicate IDs, cycle/prototype/non-JSON candidate inputs, verifier exception safety, and network restoration via `try/finally`.

### 2026-08-17 — Review pass (loop 3)
- intent_gap: 0
- bad_spec: 9: (high 4, medium 5, low 0)
- patch: 0
- defer: 0
- reject: 10: (high 0, medium 0, low 10)
- addressed_findings:
  - `[high]` `[bad_spec]` Stop before all counted trials and retain verifiable NO-GO evidence when either probe is rejected, times out, or returns no content.
  - `[high]` `[bad_spec]` Bind operational records/summaries to one frozen approved model pair, common candidate/reference, and exact request fingerprint; reject undeclared calls.
  - `[high]` `[bad_spec]` Compare retained predicate booleans with independently recomputed results and keep JSON/Markdown consistent.
  - `[high]` `[bad_spec]` Make the artifact-verification command accept and verify supplied v2 paths rather than silently running a synthetic self-test.
  - `[medium]` `[bad_spec]` Rerun the unique current fixture catalog during artifact verification and reject empty, duplicate, fabricated, or stale coverage claims.
  - `[medium]` `[bad_spec]` Verify cross-record sequential ordering while continuing counted matrix trials after individual failures so denominators remain honest.
  - `[medium]` `[bad_spec]` Recursively close/type-check predicate results, identities, summaries/rates, record scalars, envelope choices, and hashes.
  - `[medium]` `[bad_spec]` Retain the preflight estimate/approved maximum separately from after-the-fact calls made and preserve detailed failure diagnostics.
  - `[medium]` `[bad_spec]` Preserve the exact probe distinction: provider rejection/no content blocks the matrix; nonempty schema-invalid content does not pretend schema fidelity but may permit measurement.

### 2026-08-17 — Review pass (loop 4)
- intent_gap: 0
- bad_spec: 8: (high 3, medium 5, low 0)
- patch: 0
- defer: 0
- reject: 12: (high 0, medium 0, low 12)
- addressed_findings:
  - `[high]` `[bad_spec]` Bind and retain the exact observed health descriptor/request/endpoint to independently derived adapter, config, runtime, prompt, schema, and source identities.
  - `[high]` `[bad_spec]` Require both probes to complete before the first trial and verify full chronological non-overlap inside run bounds.
  - `[high]` `[bad_spec]` Strictly type authorization booleans/caps/estimates and prevent deterministic GO unless every integrity predicate passes.
  - `[medium]` `[bad_spec]` Recursively close nested envelope/provider values and all manifest, rate, usage, predicate, identity, and record scalars with hash syntax checks.
  - `[medium]` `[bad_spec]` Retain verifiable preflight-blocked NO-GO evidence without requiring the missing approval/headroom that caused the blocker.
  - `[medium]` `[bad_spec]` Bind every record to the exact common outbound request body/fingerprint and reject extra or hidden calls/models.
  - `[medium]` `[bad_spec]` Reconcile token usage arithmetic and keep approved maximum/estimate distinct from calls made.
  - `[medium]` `[bad_spec]` Mark structurally unexecuted dependent predicates not-passed rather than returning misleading default-pass results.

### 2026-08-17 — Review pass (loop 5)
- intent_gap: 0
- bad_spec: 7: (high 4, medium 3, low 0)
- patch: 0
- defer: 0
- reject: 14: (high 0, medium 0, low 14)
- addressed_findings:
  - `[high]` `[bad_spec]` Validate both model requests and the adapter input against one canonical candidate, reference, schema, and frozen provider request before any inference.
  - `[high]` `[bad_spec]` Rebuild outbound request manifests independently instead of accepting a retained body plus its self-reported recomputed hash.
  - `[high]` `[bad_spec]` Retain verifiable fail-closed evidence when adapter preflight fails or post-call integrity verification fails after authorized spend.
  - `[high]` `[bad_spec]` Exercise counted-trial timeout and provider-error continuation through the actual live protocol and prove all 42 records remain retained.
  - `[medium]` `[bad_spec]` Verify the exact observed permitted loopback endpoint rather than hard-coding only the default port.
  - `[medium]` `[bad_spec]` Compare the executing Node and Wrangler runtime to the frozen runtime baseline instead of hashing only the baseline file.
  - `[medium]` `[bad_spec]` Preserve missing provider usage as a typed absence or failure rather than coercing it to an exact zero accounting claim.

### 2026-08-17 — Review pass (loop 6)
- intent_gap: 0
- bad_spec: 7: (high 5, medium 2, low 0)
- patch: 0
- defer: 0
- reject: 13: (high 0, medium 0, low 13)
- addressed_findings:
  - none

## Design Notes

- Coexistence is deliberate: v1 is historical evidence with pinned bytes and facts; v2 is a new schema/predicate identity and must not silently dispatch legacy bytes through changed rules.
- The closed predicate list is an ordered machine-readable list of stable IDs and descriptions covering every integrity invariant above. Hash canonical JSON with an explicit evidence-v2 domain separator; individual predicate outcomes remain visible in evidence and reports so a single aggregate boolean cannot conceal a failure.
- Provider authorization and headroom remain evidence inputs for Story 1.4, but Story 1.3 tests their exact shape and logical consistency using synthetic fixtures only. No operator action is owed by this story.
- The handshake proves which local adapter/config/runtime bytes served a future run; it does not prove semantic quality or authorize a call.

## Verification

**Commands:**
- `npm run spike:judge:self-test` -- expected: all declared contract, binding, repair, evidence, mutation, preservation, and offline-isolation cases pass with case/predicate counts reported.
- `npm run check` -- expected: the repository's full offline test, generated-types, config dry-run, and runtime-baseline gates pass without credentials or remote mutation.
- `git diff --check` -- expected: no whitespace errors.
- `git status --short` -- expected: only Story 1.3 implementation/spec files are changed; `sprint-status.yaml` and immutable/read-only files are absent.

## Auto Run Result

Status: blocked
Blocking condition: review repair loop exceeded 5 iterations (non-convergence)

Summary: Re-derived the Story 1.3 evidence-v2 contract, offline verifier, shared 79-case fixture executor, adapter/runtime/request identity handshake, and two-probe/40-trial operational protocol through five review-repair loops. The sixth independent review still found external-boundary verification defects, so the workflow did not permit a completion commit.

Review findings breakdown: 0 patches applied, 0 items deferred, and 13 findings rejected as noise or contrary to the frozen probe semantics. Seven findings remained spec-level defects: artifact-supplied source paths are read before frozen-manifest equality is established; programmatic verification can default to retained fixture claims; call-state-dependent record shapes are incomplete; exact protocol ordering is underconstrained; live adapter-identity failure lacks a zero-call boundary test; the adapter launcher lacks executable invocation/exit proof; and preflight health observation lacks a bounded timeout.

Verification performed before the final review: `npm run spike:judge:self-test` passed 28/28 tests with 79/79 shared fixtures and 18/18 predicate mutation routes; `npm run check` passed 31/31 application tests and 57/57 baseline tests plus types/config/runtime checks; `git diff --check` passed; immutable v1 hashes matched; production/read-only files and `sprint-status.yaml` remained untouched.

Residual risk: the current uncommitted implementation must not be treated as verified for arbitrary retained evidence or a real served adapter boundary until the remaining review findings converge.
