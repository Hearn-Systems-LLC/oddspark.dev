---
title: 'Story 1.17: Semantic Regression Suite'
type: 'feature'
created: '2026-08-23'
status: 'in-progress'
baseline_commit: 'bfd5d05a46272dce6ebc8e3356c64a11a5b0fdd7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Semantic qualification lacks one deterministic offline suite proving that the approved voice corpus, all nine canonical gates, tone, claims, pass safety, candidate binding, and local fail-closed behavior are measured consistently rather than inferred from provider luck.

**Approach:** Add a content-addressed regression catalog and Node-only harness that runs the existing composite Gate against immutable corpus/contradiction expectations through injected provider fakes, reporting primary and fallback configurations independently.

## Boundaries & Constraints

**Always:** Reuse the approved `semantic/voice/v1` corpus, Story 1.7 Candidate/Evidence identities, and Story 1.12 `runCompositeGate`; keep fixture IDs and expected outcomes inside the content-addressed suite identity; cover gates 1–9, tone, claims, top-level pass conjunction, echoed `candidate_ref`, and representative zero-call local rejections; emit separate per-configuration results without pooled rates or a qualification decision; run entirely offline.

**Ask First:** Any edit to the approved voice corpus, rubric thresholds, canonical Candidate/JudgeResult/Gate contracts, provider identities, or qualification policy.

**Never:** Call a provider or network, deploy, activate, publish or re-pin evidence, tune expectations or thresholds after observing results, add a second rubric/validator/writer, edit pinned judge/generation evidence or `spikes/judge-fidelity/test.mjs`, or modify `package.json`, root `src/worker.js`, `wrangler.toml`, `wrangler.offline.toml`, or `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Approved offline run | Approved voice-v1 corpus, immutable catalog, injected primary/fallback fakes | Every declared result matches; each configuration has its own fixture list and summary | N/A |
| Semantic contradiction | Fake verdict fails declared gates, tone, or claims | Harness records the exact sanitized decision and matches the immutable expectation | Mismatch fails the suite without changing policy |
| Unsafe provider verdict | Wrong candidate ref or top-level pass contradicts subordinate checks | Canonical Gate returns `judge_contract_rejected` with one call | Never repair or reinterpret output |
| Deterministic local failure | Invalid schema, mode linkage, personal name, number, or grounding | `local_rejected` with zero judge calls | Provider fake must not be invoked |
| Corpus/catalog drift | Approval hash, fixture content, ID, or expectation changes | Validation fails before evaluation | No partial or pooled report |

</frozen-after-approval>

## Code Map

- `semantic/voice/v1/{rubric,goldens,anti-goldens,approval}.json` — approved semantic identity and frozen voice/golden expectations; read-only input.
- `_bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/coherence-gates.md:1-23` — canonical gate order and representative contradiction sources, including gates 2–6.
- `src/pipeline/contracts.mjs:183-277` — closed Candidate/Evidence validation, canonical `candidate_ref`, and local policy boundaries; reuse through public exports.
- `src/pipeline/gate.mjs:178-251` — canonical local-first/single-call composite Gate, pass conjunction, candidate binding, and sanitized decisions; do not reimplement.
- `src/pipeline/judge.mjs:39-94` — canonical nine-gate/tone/claims verdict and candidate-ref validation.
- `scripts/semantic-corpus.mjs:12-35` — Node loader and exports for approved corpus validation/identity.
- `scripts/composite-gate.test.mjs:1-181` — established fake descriptor, valid Candidate/Evidence, and provider fault patterns to reuse without duplicating production logic.
- `.github/check-ci.mjs:1-30` — unpinned DW-6 CI dispatcher; append the focused Story 1.17 suite exactly once after the package-defined steps.
- `package.json`, `spikes/judge-fidelity/test.mjs`, `spikes/**/results/**`, root `src/worker.js`, `wrangler*.toml`, and `_bmad-output/implementation-artifacts/sprint-status.yaml` — read-only.

## Tasks & Acceptance

**Execution:**
- [x] `semantic/regression/v1/catalog.json` — declare closed, content-addressed corpus, contradiction, contract-safety, and local-failure fixtures with immutable IDs and exact expected outcomes.
- [x] `scripts/semantic-regression.mjs` — validate catalog/corpus identities, run the canonical Gate with injected primary/fallback configurations, and return frozen separate reports with no pooled rate or qualification authority.
- [x] `scripts/semantic-regression.test.mjs` — prove all gate/tone/claims coverage, golden and anti-golden inclusion, pass conjunction, candidate binding, zero-call local failures, drift rejection, deterministic bytes, fake separation, and absence of live-capable behavior.
- [x] `.github/check-ci.mjs` — run `node --test scripts/semantic-regression.test.mjs` exactly once without changing the pinned package manifest.

**Acceptance Criteria:**
- Given the approved corpus and contracts, when offline evaluation runs, then every golden/anti-golden ID is bound into the suite, gates 1–9 plus tone and claims are covered, pass safety and candidate binding fail closed, representative deterministic local failures call no judge, and every fixture ID/expectation contributes to the catalog identity.
- Given injected primary and fallback fakes, when the harness runs, then their calls, results, and summaries remain separate, no pooled result or threshold is emitted, and neither configuration can borrow the other's outcome.
- Given repository verification, when the focused suite, unpinned CI helper, pinned judge/generation identity verifiers, and `git diff --check` run, then all pass offline with protected files unchanged.

## Spec Change Log

- 2026-08-23 — Owner decision (Justin): corpus fixtures use a closed Candidate/Evidence projection from voice-v1 goldens/anti-goldens. Mechanical adapters only: website→domain, Before/After and Preliminary-change parsing, Spark invitation suffix when `\bSpark\b` is absent, interior-capitalization fold for the personal-name policy, and domain observation text equal to the Candidate claim set. Anti-golden `sample` is placed in `plan`. No second rubric; no live judging.

## Design Notes

- The suite verifies harness semantics and frozen expectations; Story 1.18 alone owns approved live execution, thresholds, manifests, and qualification outcomes.
- Content addressing detects fixture or expected-outcome drift while readable stable IDs preserve reviewability. Reports retain only fixture IDs, sanitized Gate decisions/codes, and per-slot counts.
- Corpus projection is owner-authorized (2026-08-23). Tests require the Gate request Candidate to equal `projectCorpusInput` of the bound corpus fixture.

## Verification

**Commands:**
- `node --test scripts/semantic-regression.test.mjs` -- expected: complete deterministic offline matrix passes.
- `node .github/check-ci.mjs` -- expected: existing offline CI gates plus Story 1.17 pass; only DW-6 judge self-test is skipped.
- `npm run spike:judge:verify -- spikes/judge-fidelity/results/2026-08-23-a0ed5363-01e3976da21ab40e-620e2f14-8f42-47a2-8f83-854c41f017e6-v2.json` -- expected: pinned STRUCT-JUDGE GO identity remains valid.
- `npm run spike:generation:verify -- --file spikes/generation-qualification/results/story-1-11-2026-08-22-l9-406d10ea-8629-4a24-ab8f-8873b0332e96.evidence.json` -- expected: pinned generation l9 identity remains valid.
- `git diff --check` -- expected: no whitespace errors or protected-file changes.
