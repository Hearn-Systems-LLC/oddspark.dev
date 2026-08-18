---
title: 'Voice Rubric and Golden Briefs'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: ['oversized']
deferred: []
epic: 1
story: 5
baseline_revision: 'c1edb55b981d466b461ad6032fb21fe4a8a87ec4'
baseline_commit: 'c1edb55b981d466b461ad6032fb21fe4a8a87ec4'
---

<intent-contract>

## Intent

**Problem:** Oddspark's semantic quality requirements name a confident, plain, retellable voice, but there is no versioned rubric or stable corpus that distinguishes that voice from consultant-speak, unsupported claims, weak preservation, duplicated capabilities, poor scope, or a pressured invitation. Without an exact owner-approved semantic identity, later calibration would judge against model defaults rather than product intent.

**Approach:** Add a closed, deterministic v1 semantic-corpus package containing an explicit voice rubric, at least three complete local and three complete website-grounded golden Briefs, categorized anti-goldens, fixed pre-live thresholds, and a hash-bound owner-approval record. Author developer fixtures as visibly non-authoritative and make verification fail closed for production readiness until Justin approves the exact version and content hashes.

## Boundaries & Constraints

**Always:** Keep all eight result-card elements in canonical order; evaluate all nine coherence gates; keep local claims qualitative and domain claims bound to supplied public-site evidence; require effects to name who, when, and what physically changes; name preserved tools, decision authority, and untouched workflow steps; keep one restrained domain breadcrumb; enumerate banned registers and counter-level CTA posture; version and hash rubric, goldens, anti-goldens, and thresholds deterministically; keep primary/fallback and later live results outside this story.

**Block If:** Any action would represent developer-authored fixtures as Justin-approved, select a disputed Gate-3 or Gate-9 boundary without an explicit corpus example, or activate the corpus for production without a matching owner approval over the exact canonical hashes.

**Never:** Call a provider, run semantic qualification, change judge/generation prompts or runtime identity, modify production Worker behavior, author the house Brief or local-priors catalogs, invent pricing/ROI, use off-site/private evidence, weaken the nine gates, or treat syntactic banned-word checks alone as proof of voice quality.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Complete developer corpus | Closed v1 rubric, 3+ goldens per mode, all required anti-golden categories, thresholds | Structural verification passes; readiness remains `pending_owner_approval` | Never reports production-ready |
| Exact owner approval | Approval names Justin, v1, and every current canonical content hash | Verification reports the exact semantic identity and `approved` | Reject any missing or mismatched field |
| Corpus drift | Any approved rubric, fixture, or threshold byte changes | Recomputed identity differs and prior approval becomes invalid | Fail closed with the mismatched artifact |
| Malformed or incomplete corpus | Unknown keys, duplicate IDs, missing card element/gate/category, bad mode/evidence, or invalid threshold | Structured invalid result; no semantic identity eligible for activation | Do not throw from unchecked nested data |
| Domain breadcrumb or claim violation | More than one breadcrumb, unsupported number/claim, audit framing, capability duplication, or replacement of helpful work | Relevant golden is invalid; anti-golden remains an expected rejection | Report exact fixture and rule |

</intent-contract>

## Code Map

- `_bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/coherence-gates.md:1-23` -- authoritative nine gates and representative contradiction set; every fixture must declare expected gate outcomes without redefining them.
- `_bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/result-card-contract.md:1-16` -- authoritative eight-element order, preservation detail, preliminary change-level shape, and no-pressure spark-specific invitation.
- `_bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/generation-modes.md:1-35` -- mode and evidence boundary; website fixtures get one public-site breadcrumb while local fixtures use regional/seasonal context without business assertions.
- `_bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/review-owner-voice.md:15-61` -- owner-voice failure modes and concrete rubric requirements: counter-sayable language, who/when/physical-change effects, specificity, retellability, breadcrumb restraint, and invitation shape.
- `semantic/voice/v1/rubric.json` -- new closed voice rules, banned registers, Gate-3/Gate-9 examples, thresholds, and explicit placeholder authority state.
- `semantic/voice/v1/goldens.json` -- new complete versioned corpus with at least three local and three website-grounded Briefs, each carrying evidence and expected all-gate pass decisions.
- `semantic/voice/v1/anti-goldens.json` -- new stable expected-rejection corpus covering consultant-speak, unsupported claims, weak preservation, capability duplication, poor scope, and invitation pressure.
- `semantic/voice/v1/approval.json` -- new fail-closed owner approval record; initially pending and incapable of authorizing production until Justin binds all exact hashes.
- `scripts/semantic-corpus.mjs` -- new pure closed-schema validator, canonical JSON/hash derivation, approval verification, and structured CLI report.
- `scripts/semantic-corpus.test.mjs` -- new deterministic tests for corpus completeness, exact content, malformed inputs, drift invalidation, category coverage, and approval mismatch.
- `package.json` -- expose offline corpus verification/test commands and include them in `npm run check`; no credentials, network, or provider calls.
- `src/worker.js`, `worker.js`, `spikes/judge-fidelity/**`, `wrangler*.toml`, `runtime-baseline.json`, and `_bmad-output/implementation-artifacts/sprint-status.yaml` -- read-only boundaries for this story.

## Tasks & Acceptance

**Execution:**
- [x] `semantic/voice/v1/rubric.json` -- encode the closed v1 voice, claim, preservation, retelling, breadcrumb, scope, Gate-3/Gate-9, invitation, and pre-live threshold rules; mark developer authorship and pending owner authority explicitly.
- [x] `semantic/voice/v1/goldens.json` -- author three or more complete fixtures per mode using all eight ordered elements, all nine expected passes, evidence provenance, specific people/moments/physical changes, preserved work, and mode-correct claims.
- [x] `semantic/voice/v1/anti-goldens.json` -- author stable minimal counterexamples for every required failure category with exact expected gate/rubric rejection reasons.
- [x] `semantic/voice/v1/approval.json` -- provide a closed pending approval record that can bind Justin, corpus version, and exact hashes without letting placeholder content activate production.
- [x] `scripts/semantic-corpus.mjs` -- validate all schemas and invariants, derive domain-separated canonical hashes and one semantic identity, verify approval exactly, and emit structured non-throwing results.
- [x] `scripts/semantic-corpus.test.mjs` -- independently test valid placeholder structure, six-mode minimums, all required anti-golden categories, malformed containers, duplicate IDs, unknown fields, threshold immutability, hash drift, and forged/stale/missing approval.
- [x] `package.json` -- add `semantic:voice:test` and `semantic:voice:verify`, and compose the offline test into `check`.

**Acceptance Criteria:**
- Given the nine gates, result-card contract, two evidence modes, and Oddspark voice boundary, when the v1 corpus is validated, then it contains at least three complete goldens per mode and stable anti-goldens for consultant-speak, unsupported claims, weak preservation, capability duplication, poor scope, and invitation pressure.
- Given each golden, when its contract and expected judgments are inspected, then all eight elements appear in canonical order, all nine gates expect pass, qualitative effects identify who/when/what changes, preservation names tools/authority/untouched steps, and website mode contains exactly one restrained supported breadcrumb.
- Given developer-authored fixtures and no matching owner approval, when verification runs, then structure can pass but production readiness is visibly `pending_owner_approval`, no approved semantic identity is emitted, and no live/provider action occurs.
- Given Justin's approval over the exact version and canonical content hashes, when verification runs, then the record binds those bytes and emits the deterministic approved semantic identity; any subsequent content or threshold drift invalidates it.
- Given arbitrary malformed corpus or approval JSON, when public validators and the CLI run, then they return a structured invalid result without unchecked nested-property exceptions and identify the artifact/rule that failed.
- Given repository verification, when `npm run semantic:voice:test`, `npm run semantic:voice:verify`, `npm run check`, and `git diff --check` run, then all offline structural tests pass without credentials, network, provider calls, production code changes, runtime changes, or orchestrator-state edits; the verify command remains nonzero or non-ready until exact owner approval exists.

## Spec Change Log

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 1, medium 6, low 0)
- defer: 0
- reject: 17: (high 0, medium 9, low 8)
- addressed_findings:
  - `[medium]` `[patch]` Hardened quantitative-claim validation across claim-bearing elements, including written quantities and exact supported-number token binding.
  - `[medium]` `[patch]` Added positive, ascending implementation-range and nonnegative workflow-step validation for Change Level.
  - `[high]` `[patch]` Required the explicit not-worth-changing exit and rejected pressure/urgency funnel language in golden invitations.
  - `[medium]` `[patch]` Expanded offline literal-IP classification and table-driven coverage across IPv4 and IPv6 special-use ranges.
  - `[medium]` `[patch]` Rejected future-dated owner approvals with an exact deterministic time boundary.
  - `[medium]` `[patch]` Rejected duplicate anti-golden categories.
  - `[medium]` `[patch]` Bound each anti-golden category to closed, category-appropriate rubric-rule and gate metadata.

## Design Notes

- The corpus is a semantic input, not a generated test snapshot. Stable IDs and explicit expected judgments make later Story 1.18 calibration reproducible without letting that story rewrite the taste boundary after seeing live results.
- Structural validity and production authority are separate results. Developer placeholders may be useful and fully tested while still being visibly incapable of activation.
- Hashes use canonical JSON plus distinct domains for each artifact and the aggregate semantic identity so cross-type substitution and formatting ambiguity cannot preserve approval accidentally.

## Verification

**Commands:**
- `npm run semantic:voice:test` -- expected: deterministic validator and drift/approval tests pass offline.
- `npm run semantic:voice:verify` -- expected before owner approval: structurally valid, explicitly pending, and not production-ready; expected after exact approval: approved identity printed.
- `npm run check` -- expected: the repository suite, including corpus tests, passes offline.
- `git diff --check` -- expected: no whitespace errors.

## Auto Run Result

Status: done

Summary: Added a closed v1 voice rubric and deterministic semantic corpus with three complete developer-authored golden Briefs per mode, six categorized anti-goldens, fixed thresholds, canonical content hashing, a fail-closed owner-approval record, and offline verification. Review hardening closed claim, scope, invitation, IP-source, approval-time, and anti-golden metadata bypasses.

Files changed:
- `semantic/voice/v1/rubric.json` -- versioned Oddspark voice rules, boundary examples, banned registers, and thresholds.
- `semantic/voice/v1/goldens.json` -- six complete local and website-grounded developer fixtures.
- `semantic/voice/v1/anti-goldens.json` -- six stable required rejection categories.
- `semantic/voice/v1/approval.json` -- non-authoritative pending approval record.
- `scripts/semantic-corpus.mjs` -- closed validation, canonical hashing, approval verification, and structured CLI output.
- `scripts/semantic-corpus.test.mjs` -- 26 deterministic corpus, matrix, drift, and adversarial tests.
- `package.json` -- semantic corpus commands and repository-check integration.

Review findings breakdown: 7 patches applied (high 1, medium 6, low 0); 0 items deferred; 17 items rejected as semantic-qualification work, owner authority already represented by the approval boundary, or heuristic overreach outside this story.

Follow-up review recommendation: true. Patch score = `3 × 6 medium + 0 low = 18`; one high patch also independently requires follow-up.

Verification performed:
- `npm run semantic:voice:test` -- 26/26 passed after review patches.
- `npm run semantic:voice:verify` -- expected exit 1; structurally valid and `pending_owner_approval`, with no approved identity emitted.
- `npm run check` -- passed on the required host context: 31/31 application tests, 57/57 runtime-baseline tests, 76/76 judge spike tests, 79/79 shared fixtures, 18/18 evidence predicates, 26/26 semantic corpus tests, type/config checks, and runtime-baseline verification.
- `git diff --check` -- passed.
- Matrix audit -- every matrix row ran through the semantic corpus suite, including pending, exact approval, drift, malformed input, and domain evidence/claim violations.

Residual risks: Justin has not approved the developer corpus. Production readiness remains fail-closed until approval binds semantic identity `8532fda97572a9be3bfab6c54e3593691791b9ad837244fd9b7efb8a9ddf77c8` and its exact hashes. Broader semantic taste judgment and live calibration remain Story 1.18 work; no provider, deploy, push, release, or production activation occurred.

## Suggested Review Order

**Validation and identity**

- Start with the fail-closed public validator and readiness decision.
  [`semantic-corpus.mjs:264`](../../scripts/semantic-corpus.mjs#L264)

- Review canonical domain hashing and aggregate semantic identity binding.
  [`semantic-corpus.mjs:254`](../../scripts/semantic-corpus.mjs#L254)

- Inspect golden invariants for evidence, claims, ranges, preservation, and invitations.
  [`semantic-corpus.mjs:132`](../../scripts/semantic-corpus.mjs#L132)

- Confirm exact pending and approved record shapes remain mutually exclusive.
  [`semantic-corpus.mjs:238`](../../scripts/semantic-corpus.mjs#L238)

**Corpus content**

- Read the owner-visible voice rules, boundary examples, and fixed thresholds.
  [`rubric.json:1`](../../semantic/voice/v1/rubric.json#L1)

- Evaluate all six complete Briefs against the intended taste boundary.
  [`goldens.json:5`](../../semantic/voice/v1/goldens.json#L5)

- Check each required failure category and its explicit rejection rationale.
  [`anti-goldens.json:5`](../../semantic/voice/v1/anti-goldens.json#L5)

- Verify the shipped approval record cannot authorize production.
  [`approval.json:1`](../../semantic/voice/v1/approval.json#L1)

**Verification and commands**

- Review independent approval-drift tests across every bound hash domain.
  [`semantic-corpus.test.mjs:187`](../../scripts/semantic-corpus.test.mjs#L187)

- Confirm the approved CLI path exits successfully with exact identity.
  [`semantic-corpus.test.mjs:249`](../../scripts/semantic-corpus.test.mjs#L249)

- Check offline commands and repository-suite composition.
  [`package.json:19`](../../package.json#L19)
