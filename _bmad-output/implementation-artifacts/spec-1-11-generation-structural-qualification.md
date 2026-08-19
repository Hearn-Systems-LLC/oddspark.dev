---
title: 'Story 1.11: Generation Structural Qualification'
type: 'feature'
created: '2026-08-18'
status: 'awaiting-operator'
baseline_revision: '334ec837ce7ed129a8e8b1b0ae68eef1ed032687'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred: []
operator_actions:
  - 'Review the frozen generation qualification plan, including both role identities, exact request contract, pricing maximum, retention disclosure, and 42-call cap.'
  - 'Provide a fresh exact approval record that binds the plan ref, approval run ID, approved maximum cost, call cap, approver, and approval timestamp.'
  - 'Start the isolated loopback generation adapter and run the approved live command interactively, retaining the marker-bound evidence and qualification outputs.'
  - 'Initiate architecture review for each role whose independent STRUCT-GENERATION manifest is NO-GO.'
---

<intent-contract>

## Intent

**Problem:** The offline Generate port rejects malformed Candidates, but no independently verifiable evidence binds the exact primary and fallback provider identities to direct Candidate fidelity. Production therefore cannot safely select either generation role.

**Approach:** Build a fail-closed, offline-verifiable generation qualification harness modeled on the hardened judge evidence-v2 boundary. Freeze each role independently, generate a reviewable live-run plan, and retain immutable per-call and manifest evidence; leave the metered 42-call execution to a separately approved operator action.

## Boundaries & Constraints

**Always:** Bind provider, resolved model, parameters, prompt, wire schema, adapter, runtime, timeout policy, exact inputs/fixtures, source hashes, approval, and tested source identity. Run one probe plus 20 sequential trials per role with zero retry/replacement, preserve failures in each role's denominator, report taxonomy/latency/usage/cost separately, require at least 19/20 direct-valid and every Story 1.3 evidence-v2 predicate for GO, and publish independently derived `STRUCT-GENERATION` manifests/refs.

**Block If:** A concrete provider wire contract cannot yield the closed Story 1.7 Candidate without repair; the frozen plan would require a provider, gateway, credential path, pricing assumption, or retention field not already authorized; or the offline verifier cannot validate arbitrary external artifact bytes independently of the live runner.

**Never:** Execute metered calls without fresh exact-run approval; pool primary/fallback rates; retry, replace, repair, coerce, extract from prose, or reclassify calls; overwrite historical evidence; expose credentials/account IDs/reasoning; deploy, activate, add production bindings, or modify/revert `sprint-status.yaml` or `src/worker.js`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Offline verification | Arbitrary marker-bound plan/evidence/bundle files | Recompute hashes, identities, fixtures, predicates, per-role rates, manifests, refs, and deterministic report | Any missing, extra, noncanonical, stale, mismatched, or path-unsafe value is NO-GO |
| Approved live run | Exact fresh approval matches frozen plan and healthy loopback adapter | One probe then 20 sequential trials per role; exactly 42 maximum calls | Probe failure prevents trials for that role; trial failure remains counted; no retry/replacement |
| Direct Candidate | Provider returns exactly one closed Candidate object | Classify `direct_valid`, derive the Story 1.7 reference, retain bounded envelope/usage/latency | Wrapper, text, fence, coercion, repair, extra/missing field, ambiguity, or oversize rejects |
| Independent role result | One role reaches 19/20 direct-valid and the other does not | Emit independent GO and NO-GO manifests; only the failed role is blocked | Never pool rates or substitute one role's trials for the other |
| Unapproved/noninteractive run | Approval absent/stale/mismatched, CI, or non-TTY | Zero inference calls and no partial evidence publication | Fail closed with explicit preflight blockers |

</intent-contract>

## Code Map

- `scripts/generation.mjs:194` -- authoritative direct-output classifier; qualification must reuse `classifyGenerationResult` and its no-repair boundary.
- `scripts/brief-contracts.mjs:88` and `:143` -- closed Candidate validator and canonical Story 1.7 `candidate_ref` derivation.
- `scripts/generation.test.mjs` -- reusable local/domain Candidate fixtures and adversarial direct-output matrix.
- `spikes/judge-fidelity/contract.mjs:101` -- authoritative Story 1.3 ordered predicate oracle/hash that generation evidence must satisfy rather than paraphrase.
- `spikes/judge-fidelity/evidence-v2.mjs` -- hardened independent evidence verification, deterministic report, arbitrary-artifact and marker-binding patterns to reuse.
- `spikes/judge-fidelity/qualification.mjs` -- closed plan/approval/manifests, canonical qualification refs, retention, per-role outcome, and cost-accounting patterns.
- `spikes/judge-fidelity/run.mjs` -- loopback-only preflight, 1+20 sequential schedule, no-retry accounting, atomic artifact publication, and noninteractive refusal patterns.
- `spikes/judge-fidelity/worker.mjs` and `wrangler.toml` -- isolated local Worker with one allowlisted remote AI binding; production Worker remains read-only.
- `package.json` -- add focused generation-qualification self-test/verifier/plan/live commands and include only the offline self-test in `check`.

## Tasks & Acceptance

**Execution:**
- `spikes/generation-qualification/contract.mjs` -- freeze the two generation role identities, prompt, closed wire schema, adapter classification taxonomy, fixtures, and imported Story 1.3 predicate oracle identity.
- `spikes/generation-qualification/evidence-v2.mjs` and `fixture-executor.mjs` -- build and independently verify arbitrary canonical evidence, exact source/runtime/request identities, fixture results, call schedule/accounting, deterministic reports, and the complete closed predicate list.
- `spikes/generation-qualification/qualification.mjs` -- implement closed plan/approval validation, bounded pricing and retention disclosure, per-role threshold derivation, independent manifests, and domain-separated qualification refs.
- `spikes/generation-qualification/run.mjs` -- implement reviewable plan creation and an interactive, exact-approval-gated 42-call maximum runner with loopback health validation, preflight-before-network, sequential calls, immutable spend receipt, and atomic marker-bound publication.
- `spikes/generation-qualification/worker.mjs`, `start-adapter.mjs`, and `wrangler.toml` -- add an isolated loopback adapter that accepts only the frozen request contract and makes exactly one allowlisted AI call per accepted POST.
- `spikes/generation-qualification/fixtures.json`, `test.mjs`, and `verify-v2.mjs` -- cover direct Candidate fidelity plus missing/extra/mistyped/wrapped/text/fenced/coerced/repaired/ambiguous/oversized/provider-error/timeout cases, tamper every retained identity and predicate, and prove the public verifier accepts external bytes without runner mocks.
- `spikes/generation-qualification/README.md` and `package.json` -- document the safety/approval/operator flow and expose offline commands without making live execution reachable from CI or `npm run check`.

**Acceptance Criteria:**
- Given a frozen primary/fallback plan, when identity construction and offline verification run, then every AD-11 field, exact input/fixture/source hash, Story 1.3 oracle predicate, role position, and domain-separated ref is recomputed from retained bytes, with no reliance on the live runner's claims.
- Given fresh exact-run approval and a matching healthy loopback adapter, when live qualification runs, then each role receives one probe followed by at least 20 sequential trials, no call is retried or replaced, and taxonomy, direct-valid/repair counts, latency, usage, cost, and call state are retained separately.
- Given verified evidence, when `STRUCT-GENERATION` is derived, then each role independently requires at least 19 of 20 `direct_valid` trials plus every closed predicate; a failed role receives NO-GO without changing the other role's result and triggers the documented architecture-review action.
- Given missing/stale/mismatched approval, CI/noninteractive execution, adapter mismatch, source drift, exhausted headroom, or prior spend receipt, when a live command is attempted, then it makes zero new inference calls and publishes no apparently complete evidence set.
- Given repository verification, when the focused self-test, public-verifier tamper suite, full `npm run check`, and `git diff --check` run, then all offline gates pass with no network, deployment, production binding, or sprint-state mutation.

## Spec Change Log

- 2026-08-18: Implemented the offline-verifiable qualification harness, isolated adapter, approval-gated runner, public verifier, focused tests, and package commands; moved to awaiting-operator because the metered live run requires fresh exact approval.

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 8, medium 4, low 0)
- defer: 0
- reject: 5: (high 0, medium 1, low 4)
- addressed_findings:
  - `[high]` `[patch]` Contained malformed timestamps and authenticated closed run metadata, call totals, bounds, and exact global chronology.
  - `[high]` `[patch]` Recomputed the retained plan reference and validated exact approval authority at the retained run start.
  - `[high]` `[patch]` Bound the exact loopback endpoint and observed adapter health instead of trusting a self-asserted match flag.
  - `[high]` `[patch]` Recomputed retained-output hashes and byte counts, closed call states, and made bounded oversized-output evidence verifiable.
  - `[high]` `[patch]` Enforced exact probe/trial indices, per-role cardinality, and globally sequential non-overlapping execution.
  - `[high]` `[patch]` Normalized usage and recomputed per-call and per-role costs against the frozen role-specific pricing authority.
  - `[high]` `[patch]` Tightened the provider response schema to the complete closed Story 1.7 Candidate structure.
  - `[high]` `[patch]` Made member publication rollback-safe and recorded terminal calls and actual spend in the durable receipt.
  - `[medium]` `[patch]` Imported the authoritative Story 1.3 oracle identity to invalidate drift automatically.
  - `[medium]` `[patch]` Closed and versioned fixture-document and fixture-case validation with a known shape set.
  - `[medium]` `[patch]` Added declared-length request prechecks and exact frozen-input validation at the isolated adapter.
  - `[medium]` `[patch]` Expanded the public-verifier, matrix, schema, publication, and receipt regression suite to cover every repaired boundary.

## Design Notes

- Keep judge and generation qualification as distinct directories and manifests even when both use Workers AI and the same candidate models. Share only stable, role-neutral primitives where doing so cannot couple their evidence histories.
- The live result is not agent-completable without fresh human approval. Complete and commit the harness first; if approval has not been supplied, finalize this spec as `awaiting-operator` with imperative actions to review the generated plan, provide the exact approval record, run the live command interactively, retain the marker-bound output, and initiate architecture review for any NO-GO role.

## Verification

**Commands:**
- `node --test spikes/generation-qualification/test.mjs` -- expected: offline fixture, plan, verifier, tamper, schedule, and no-network tests pass.
- `node spikes/generation-qualification/verify-v2.mjs --file <external-evidence.json>` -- expected: independently verifies a marker-bound externally produced artifact set and rejects any mutation.
- `npm run check` -- expected: all repository offline gates pass; no live adapter or inference starts.
- `git diff --check` -- expected: no whitespace errors.

## Auto Run Result

- **Summary of implemented change:** Added a fail-closed generation structural-qualification harness for the independently frozen primary and fallback Workers AI identities. The repository can now create an exact approval plan, run a separately authorized 42-call maximum loopback protocol, independently verify arbitrary retained evidence, and derive per-role `STRUCT-GENERATION` manifests and refs without pooling results.
- **Files changed:**
  - `spikes/generation-qualification/contract.mjs`, `fixtures.json`, and `fixture-executor.mjs`: closed generation request/response, identity, taxonomy, oracle, and adversarial fixture contracts.
  - `spikes/generation-qualification/evidence-v2.mjs`, `qualification.mjs`, and `verify-v2.mjs`: independent evidence, plan, approval, pricing, manifest, and public-verifier logic.
  - `spikes/generation-qualification/run.mjs`, `worker.mjs`, `start-adapter.mjs`, and `wrangler.toml`: isolated interactive runner, loopback adapter, strict preflight, spend receipt, and rollback-safe publication.
  - `spikes/generation-qualification/test.mjs`: 17 focused no-network tests covering matrix rows, strict transport decoding, arbitrary-byte verification, tampering, scheduling, costs, publication, and receipts.
  - `spikes/generation-qualification/README.md` and `results/story-1-11-2026-08-19-r3.plan.json`: operator procedure and current unapproved frozen review plan (`plan_ref` `5d372eaa391223059e64c95a7c4cf311ceb5313cca9a769bd9736d21e8cfe028`, run ID `story-1-11-2026-08-19-r3`, 42 calls, maximum `$0.07436835`).
  - `package.json`: added offline verification, plan, adapter, and live command entry points; only the no-network self-test joins `npm run check`.
  - `_bmad-output/implementation-artifacts/epic-1-context.md`: refreshed the workflow-required Epic 1 context from newer planning artifacts.
  - `_bmad-output/implementation-artifacts/spec-1-11-generation-structural-qualification.md`: captured the implementation contract, review repairs, verification, and operator handoff.
- **Review findings breakdown:** 12 patches applied (high 8, medium 4, low 0), 0 deferred, 5 rejected.
- **Follow-up review recommendation:** `true` (patched high: 8, medium: 4, low: 0; score: 12 plus high-severity trigger).
- **Verification performed:** `node --test spikes/generation-qualification/test.mjs` passed 17/17; the corrected judge suite passed 77/77 with 79/79 fixtures and 18/18 predicates; final repository-wide verification is recorded in the correct-course handoff. No live inference, deployment, or remote mutation occurred.
- **Residual risks:** The exact metered live qualification has not run. Fresh operator approval and interactive execution are required; resulting role decisions may be GO or NO-GO, and every NO-GO role requires architecture review.

## Correct-Course Amendment — 2026-08-19

- Run `story-1-11-2026-08-19-r2` remains immutable historical evidence: two probes were called and both retained `NO-GO` because the adapter passed the provider chat envelope, rather than its single complete structured content value, to the Candidate classifier.
- Justin approved transport-envelope decoding as the adapter's responsibility, limited to exactly one complete JSON object at the frozen single-choice response location. Prose/fence extraction, alternate locations, ambiguity, repair, coercion, omission filling, and Candidate-schema weakening remain forbidden.
- The adapter now performs only that transport decode; `classifyGenerationResult` remains the authoritative closed Candidate validator.
- The r2 evidence is not overwritten or reclassified. One fresh replacement plan may be prepared from corrected source identity, but execution requires new exact approval.
- Prepared, not executed: generation r3 plan `5d372eaa391223059e64c95a7c4cf311ceb5313cca9a769bd9736d21e8cfe028`, run ID `story-1-11-2026-08-19-r3`, cap 42, maximum `$0.07436835`.
