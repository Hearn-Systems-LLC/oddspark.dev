---
title: 'Story 1.20: Atomic Activation Contract and Release Decision View'
type: 'feature'
created: '2026-08-26'
status: 'in-progress'
baseline_revision: '3e75980c504d29eb71e3a70768aaca59dbe70681'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-24-4.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The v2 activation manifest currently proves only shape and hash syntax. It cannot reject stale or mutually inconsistent evidence, and there is no closed on-demand view showing why a candidate is or is not releasable.

**Approach:** Validate one immutable activation snapshot containing the sole canonical manifest plus independently verified evidence facts, derive the activation ref only from that manifest, and render a pure deterministic decision view over the exact applicable gates.

## Boundaries & Constraints

**Always:** Keep `ProductionActivationManifest` v2 closed and canonical: shared generation/judge refs occur once, mode objects contain only enablement and mode-specific refs, and `semantic_ref` remains forbidden. Validate the manifest and all applicable evidence as one value before enabling any assembled model role. Evidence facts are read-only verification outputs: bind expected refs to recomputed/current refs and distinguish `pass`, `blocked`, `stale`, and `unapproved`. The view is deterministic, closed, redacted, and performs no I/O or persistence. Missing/invalid snapshots expose only a stable reason code and cannot enable the assembled writer, claim copy, or reference handoff. Preserve the inactive legacy compatibility path and safe committed/approved-house behavior established by Story 1.25.

**Block If:** Implementation requires deciding a new approval authority, changing which evidence an existing verifier recognizes, activating receiver/claim delivery, changing production configuration, invoking a provider, deploying, or removing the Story 1.25 legacy compatibility path.

**Never:** Do not mint, repair, refresh, overwrite, or infer evidence or approvals; trust a caller-supplied status without ref/currentness checks; add parallel activation values; add `semantic_ref`; publish an activation manifest; edit retained qualification results; create remote resources; or merge to `main`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Ready local snapshot | Closed v2 manifest plus exact current generation, judge, catalog, assembly/source, and local full-request facts | Valid snapshot; canonical `activation_ref`; ordered view reports every applicable gate `pass` | No error expected |
| Stale evidence | A manifest ref or deployed identity differs from its independently recomputed/current fact | Snapshot cannot activate; corresponding decision row is `stale` | Stable redacted invalid/stale reason only |
| Incomplete or parallel publication | Missing applicable fact, extra/duplicate gate, alternate manifest/ref, or partial snapshot | Whole snapshot rejects; no activation ref is accepted | Closed-contract reason; no partial result |
| Unapproved or blocked evidence | Current fact lacks required approval or verifier reports a blocking condition | View reports `unapproved` or `blocked`; overall readiness false | No authority or persistence created |
| Missing/invalid runtime value | No snapshot, malformed JSON, invalid manifest, or invalid evidence closure | Assembled model roles, claim copy, and reference handoff remain disabled; safe legacy/house behavior remains available | One redacted posture code; no manifest data logged |

</intent-contract>

## Code Map

- `src/pipeline/activation.mjs` -- v2 manifest validation, canonical activation ref, and runtime activation port.
- `src/pipeline/release-decision.mjs` -- new pure atomic-snapshot validator and deterministic decision-view contract.
- `src/pipeline/assembly.mjs` -- consumes the activation decision before exposing the assembled writer.
- `src/worker.js` -- public runtime seam and redacted activation-posture logging.
- `scripts/release-decision.mjs` -- new offline, read-only CLI for rendering a supplied snapshot.
- `scripts/release-decision.test.mjs` -- closed-contract, currentness, determinism, and no-side-effect tests.
- `test.mjs` -- outer runtime fail-closed and safe compatibility assertions.
- `package.json` -- exposes decision-view verification commands.
- `runtime-assembly.json` -- frozen import-closure identity if the runtime module graph changes.

## Tasks & Acceptance

**Execution:**
- `src/pipeline/release-decision.mjs` -- define a versioned closed snapshot and exact ordered applicable-gate derivation from manifest mode/ref presence; validate each fact's gate ID, expected ref, current/recomputed ref, and verified outcome; reject omissions, extras, duplicates, partial/parallel values, prototypes/getters/cycles, and inconsistent identities; return a deeply frozen decision view without I/O.
- `src/pipeline/activation.mjs` and `src/pipeline/assembly.mjs` -- make runtime enablement consume only a valid atomic snapshot while retaining the pure manifest shape validator/ref derivation for tooling; add stable redacted snapshot failure codes and keep manifest internals out of posture.
- `scripts/release-decision.mjs`, `scripts/release-decision.test.mjs`, and `package.json` -- add an import-safe stdin/file JSON renderer with deterministic JSON output, nonzero exit for malformed or not-ready candidates, exhaustive closed-boundary tests, and a test script composed into `npm run check`.
- `test.mjs` -- prove current, stale, missing, malformed, partial, and parallel snapshots at the executable worker boundary; assert zero assembled provider/claim/reference activity on failure, one redacted posture line, and unchanged safe legacy/approved-house compatibility behavior.
- `runtime-assembly.json` and `scripts/writer-preflight.mjs` -- refresh and verify the frozen runtime closure and preflight expectations only where the new imported contract changes them.

**Acceptance Criteria:**
- Given a fully current closed snapshot, when activation validation runs, then the shared refs occur once, mode fields remain mode-specific, all applicable facts bind to the same immutable candidate, and `activation_ref` equals the v2 domain-separated hash of the sole manifest.
- Given unknown fields, invalid nullability, stale evidence, a missing/extra/duplicate fact, a parallel manifest/ref, or a partial update, when validation runs, then the whole snapshot rejects and no assembled role is enabled.
- Given existing verified evidence, when the decision view renders, then every and only applicable gate appears once in canonical order as `pass`, `blocked`, `stale`, or `unapproved`; omission rejects; and rendering performs no write, network, provider, coordinator, or environment mutation.
- Given a missing or invalid snapshot at runtime, when a strike resolves activation, then assembled model roles, claim copy, and reference handoff are disabled, only a redacted reason is observed, and the Story 1.25 safe legacy/committed-approved-house path remains unchanged.

## Spec Change Log

## Review Triage Log

## Design Notes

The snapshot is evidence transport, not authority. Its canonical gate order is `deployed_source`, `generation`, `judge`, `house_catalog`, then enabled-mode gates (`local_full_request`; `domain_evidence`, `domain_full_request`), followed by `receiver` and `receipt_claim` only when their nullable refs are present. Each closed fact binds its gate to the manifest's expected identity, an independently recomputed current identity, and verifier/approval outcome; identity mismatch is `stale`, a current negative verification is `blocked`, and a current approval absence is `unapproved`. Only exact current approved facts become `pass`. Null receiver/claim refs remain the current non-activation posture.

Planning baseline: `3e75980c504d29eb71e3a70768aaca59dbe70681` on `develop`.

## Verification

**Commands:**
- `npm run release-decision:test` -- expected: all snapshot/view/CLI adversarial tests pass offline.
- `npm run test` -- expected: activation and public worker boundaries pass with no provider calls.
- `npm run assembly:freeze && npm run assembly:verify` -- expected: intentional runtime closure is recorded and verifies.
- `npm run writer:preflight` -- expected: inactive deployment safety gate passes without remote mutation.
- `npm run check` -- expected: full repository gate passes.
