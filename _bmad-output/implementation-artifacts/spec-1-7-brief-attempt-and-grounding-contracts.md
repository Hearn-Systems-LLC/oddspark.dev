---
title: 'Brief, Attempt, and Grounding Contracts'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
baseline_commit: '5e1a5ae9a377bbe07c25c9148f5aa16a0aff0980'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Later generation, grounding, judging, commitment, and rendering stories need one production-grade contract boundary for Briefs and attempt state. The current spike schemas are incomplete or fixture-only, so promoting them directly would allow shape drift, stale references, ungrounded claims, and mutable evidence.

**Approach:** Add a pure, offline, Node-importable contract module that strictly validates and deeply freezes the versioned Brief/Evidence/port/envelope types, derives candidate identity canonically, verifies grounding coverage, and applies a deterministic fail-closed personal-name policy.

## Boundaries & Constraints

**Always:** Reject unknown or missing fields and unsupported versions; validate before hashing or freezing; use domain-separated SHA-256 over canonical JSON for `candidate_ref`; preserve exact local/domain tagged unions and cardinalities; distinguish `request_scope`, `effective_mode`, and Brief mode; require every business claim, domain Breadcrumb, and grounded number to have exactly one passing grounding entry; treat personal-name `fail` or `unknown` as rejection; keep all APIs pure, deterministic, deeply immutable, and usable without network or model access.

**Ask First:** Any change to the architecture-spine shapes, canonicalization rules, policy outcomes, or story boundary; any need to alter runtime routing, rendering, persistence, or legacy evidence.

**Never:** Reuse the spike's synthetic grounding schema or stale Evidence shape as production authority; wire generation, judging, rendering, coordinator/KV persistence, retries, or house Briefs; change profile hashes, Worker runtime behavior, Wrangler/configuration, semantic thresholds, retained spike evidence, provider state, deployments, sprint state, or Stories 1.8+.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Valid contract graph | Matching versioned Brief, Evidence, Candidate, GroundingReport, AttemptContext, and CommittedBrief | Closed values validate, references agree, candidate identity is deterministic, and returned graphs are deeply frozen | N/A |
| Shape or linkage drift | Unknown/missing fields, bad cardinality/type/version, stale ref, cross-attempt data, or mode/rubric/provenance mismatch | No contract object or identity is produced | Return structured, stable validation issues; fail closed |
| Grounding coverage | Claims, Breadcrumb, or grounded numbers each map once to passing evidence | Report passes only when coverage, PII, and numeric provenance all pass | Duplicate, missing, failed, or unknown coverage rejects the candidate |
| Personal-name policy | Plain text with allowed, disallowed, or indeterminate name use | Pure result is exactly `pass`, `fail`, or `unknown` with a stable reason | `fail` and `unknown` reject; never call AI or fetch |

</frozen-after-approval>

## Code Map

- `_bmad-output/planning-artifacts/epics.md:359` -- authoritative Story 1.7 acceptance boundary; generation qualification moved to Story 1.11.
- `_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md:45` -- normative EvidenceContext, AttemptContext, GroundingReport, CommittedBrief, Evidence, and Brief shapes plus canonical identity rules.
- `spikes/judge-fidelity/contract.mjs:131` -- strict-object helpers and candidate validator patterns; `deriveCandidateRef` at line 399 is the canonical-hash prototype to extract, while fixture grounding/evidence shapes remain read-only.
- `src/worker.js:243` and `src/worker.js:402` -- exported `normalizeSpace` and `observationSpan` canonicalization seams; runtime route/render/generation code is read-only.
- `scripts/local-priors.mjs:24` and `scripts/semantic-corpus.mjs:44` -- established closed validation, canonical JSON, domain hashing, and structured issue conventions.
- `scripts/brief-contracts.mjs` -- new pure production-contract boundary for validation, construction, identity, deep freezing, grounding coverage, and name policy.
- `scripts/brief-contracts.test.mjs` -- exhaustive positive, adversarial, mutation, canonicalization, and linkage coverage.
- `package.json:10` -- register the focused offline test and compose it into `check`.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/brief-contracts.mjs` -- implement closed validators/builders for the local/domain Brief union, Evidence union, Candidate, EvidenceContext, GroundingReport, AttemptContext, and CommittedBrief; canonical candidate identity; recursive freezing; exact grounding coverage; and tri-state personal-name policy.
- [x] `scripts/brief-contracts.test.mjs` -- exercise every matrix row, both modes, optional notice, exact eight-element/cardinality rules, claim and number discipline, unsupported versions, unknown keys, malformed nested values, key/array ordering, mutation attempts, stale/cross-attempt references, and adversarial name cases.
- [x] `package.json` -- expose `brief-contracts:test` and add it to the offline `check` chain.

**Acceptance Criteria:**
- Given any supported local or domain payload, when the Brief validator runs, then it accepts only the exact versioned union, eight required elements, permitted notice and grounded numbers, mode-specific Breadcrumb rules, qualitative local claims, traceable domain numbers, no pricing, and a Spark-specific non-pitch invitation that permits “not worth changing.”
- Given semantically identical validated Candidates with different object-key insertion order, when `candidate_ref` is derived, then both produce the same domain-separated SHA-256 identity; array-order or validated content changes produce a different identity.
- Given a complete attempt graph, when its ports and committed envelope are constructed, then all identities, modes, scope, rubric, provenance, evidence, candidate, and grounding references agree and every returned nested value is frozen; any drift fails closed with structured issues.
- Given repository verification, when `npm run brief-contracts:test`, `npm run check`, and `git diff --check` run, then all offline tests pass without network, provider, runtime behavior, deployment, evidence, or sprint-state changes.

## Spec Change Log

## Design Notes

- Keep the module policy-oriented rather than orchestration-oriented: it may construct validated immutable values, but it must not choose priors, retry candidates, invoke a judge, commit output, or render a Brief.
- Reuse the spike's canonical identity semantics while deliberately replacing its fixture-only grounding and incomplete Evidence validators with the architecture-spine production shapes.

## Verification

**Commands:**
- `npm run brief-contracts:test` -- expected: all contract, policy, mutation, and edge-case tests pass offline.
- `npm run check` -- expected: the full repository suite, including Brief contracts, passes without remote access.
- `git diff --check` -- expected: no whitespace errors.

## Suggested Review Order

**Core contract boundary**

- Start with the closed Brief union and structural claim discipline.
  [`brief-contracts.mjs:88`](../../scripts/brief-contracts.mjs#L88)

- Canonical candidate identity binds validated content without key-order drift.
  [`brief-contracts.mjs:143`](../../scripts/brief-contracts.mjs#L143)

**Grounding and immutable handoffs**

- Mechanical grounding proves claim text, source linkage, PII, and numeric provenance.
  [`brief-contracts.mjs:227`](../../scripts/brief-contracts.mjs#L227)

- Attempt validation closes and links every candidate, evidence, and grounding port.
  [`brief-contracts.mjs:264`](../../scripts/brief-contracts.mjs#L264)

- Committed envelopes preserve request scope while binding effective-mode provenance.
  [`brief-contracts.mjs:277`](../../scripts/brief-contracts.mjs#L277)

**Policy and verification**

- Pure tri-state name policy rejects definite and ambiguous personal-name signals.
  [`brief-contracts.mjs:184`](../../scripts/brief-contracts.mjs#L184)

- Adversarial tests cover grounding proof, failed reports, malformed input, and drift.
  [`brief-contracts.test.mjs:95`](../../scripts/brief-contracts.test.mjs#L95)

- Repository checks include the new focused offline contract suite.
  [`package.json:23`](../../package.json#L23)
