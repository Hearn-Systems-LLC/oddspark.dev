---
title: 'Story 1.20: Atomic Activation Contract and Release Decision View'
type: 'feature'
created: '2026-08-26'
status: 'ready-for-dev'
baseline_revision: '3e75980c504d29eb71e3a70768aaca59dbe70681'
baseline_commit: '6f2546d68d98eaa9c3187c89ee11ecff0cb63065'
review_loop_iteration: 2
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

**Approach:** Build one immutable activation snapshot by running the existing retained-artifact verifiers and current source/runtime/content identity functions, then require an Ed25519 signature over its complete canonical payload before runtime can trust it. Derive the activation ref only from the sole canonical manifest, and render a pure deterministic decision view over the exact applicable gates before any separate signing or publication step.

## Boundaries & Constraints

**Always:** Keep `ProductionActivationManifest` v2 closed and canonical: shared generation/judge refs occur once, mode objects contain only enablement and mode-specific refs, and `semantic_ref` remains forbidden. Validate the manifest and all applicable evidence as one atomic candidate before enabling any assembled model role. The release validator must invoke existing retained-artifact verification and current identity seams for deployed source/runtime, generation, judge, catalog, and each enabled mode; caller JSON may select artifact locations but cannot supply `current`, `verified`, `approved`, or gate-status assertions. Bind manifest refs to recomputed identities and map verifier results to `pass`, `blocked`, `stale`, or `unapproved`. The view emits only an unsigned canonical signing payload when every gate passes and creates no authority or persistence. Runtime accepts only a closed payload carrying a valid Ed25519 signature under a source-pinned SPKI public key, a known key id, and an unexpired validity interval no later than the earliest verified approval expiry. Signature verification covers every payload field under a versioned domain; unknown keys, missing trust anchors, invalid signatures, and expired/not-yet-valid payloads fail closed with redacted reasons. The production trust-key map remains empty in this story—tests inject ephemeral keys—so no production activation becomes possible until a separately authorized activation change pins a public key and supplies a signed value. Preserve Story 1.25 inactive legacy and safe committed/approved-house behavior.

**Block If:** Implementation requires changing which evidence an existing verifier recognizes, selecting or generating a production signing key, storing private key material, activating receiver/claim delivery, changing production configuration, invoking a provider, deploying, or removing the Story 1.25 legacy compatibility path.

**Never:** Do not mint, repair, refresh, overwrite, or infer evidence or approvals; accept caller-supplied current refs, verification booleans, approval booleans, or gate statuses; treat an unkeyed digest as provenance; commit, log, generate, or persist private signing material; invent a production public key or key id; weaken or duplicate an existing verifier; add parallel activation values; add `semantic_ref`; publish an activation manifest; edit retained qualification results; create remote resources; or merge to `main`.

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
- `src/pipeline/release-decision.mjs` -- define the pure closed signed-payload and ordered decision-view contracts; canonicalize and domain-separate every signed field; verify Ed25519/SPKI signatures, key id, issued/expiry times, and injected trusted-key map/clock; keep the production map empty; close arrays/objects including symbols/descriptors, bound nesting, and reject duplicate/partial/parallel values.
- `scripts/release-decision.mjs` plus narrowly scoped verifier adapters -- implement the read-only trusted builder: safely load retained artifact sets, invoke existing generation, judge, full-request, assembly/source, house, and applicable receiver/claim verification seams, derive every status and earliest approval expiry, and emit an unsigned canonical signing payload only when every gate passes. Bound bytes/depth, reject duplicate JSON keys and traversal/symlink escapes, redact filesystem details, and never sign, rewrite, or persist evidence.
- `src/pipeline/activation.mjs` and `src/pipeline/assembly.mjs` -- make runtime enablement asynchronous where needed and consume only a signature-valid, time-valid payload; bind manifest identities to actual assembled source/content/provider descriptors, retain manifest shape/ref tooling, reject `ACTIVATION_MANIFEST` as parallel authority, and keep posture redacted.
- `scripts/release-decision.test.mjs`, existing verifier fixtures, and `package.json` -- prove real verifier invocation/currentness with copied or in-memory retained artifacts; use ephemeral Ed25519 test keys to cover valid, wrong-key, unknown-key, altered-field/signature, expiry, not-yet-valid, and empty-production-keyring behavior; reject self-attested fields and compose the offline test into `npm run check`.
- `test.mjs` -- prove current, stale, missing, malformed, partial, and parallel snapshots at the executable worker boundary; assert zero assembled provider/claim/reference activity on failure, one redacted posture line, and unchanged safe legacy/approved-house compatibility behavior.
- `scripts/reader-preflight.mjs`, `scripts/reader-preflight.test.mjs`, and `scripts/writer-preflight.mjs` -- forbid `ACTIVATION_SNAPSHOT` in inactive configuration as both vars and binding names; smoke absent, malformed, stale, blocked, unapproved, partial, and parallel candidates.
- `runtime-assembly.json` -- refresh and verify the frozen runtime closure only for intentional runtime imports.

**Acceptance Criteria:**
- Given a fully current closed snapshot, when activation validation runs, then the shared refs occur once, mode fields remain mode-specific, all applicable facts bind to the same immutable candidate, and `activation_ref` equals the v2 domain-separated hash of the sole manifest.
- Given unknown fields, invalid nullability, stale evidence, a missing/extra/duplicate fact, a parallel manifest/ref, or a partial update, when validation runs, then the whole snapshot rejects and no assembled role is enabled.
- Given existing verified evidence, when the decision view renders, then every and only applicable gate appears once in canonical order as `pass`, `blocked`, `stale`, or `unapproved`; omission rejects; and rendering performs no write, network, provider, coordinator, or environment mutation.
- Given a missing or invalid snapshot at runtime, when a strike resolves activation, then assembled model roles, claim copy, and reference handoff are disabled, only a redacted reason is observed, and the Story 1.25 safe legacy/committed-approved-house path remains unchanged.

## Spec Change Log

### 2026-08-26 — Owner-selected verifier-integrated authority
- Trigger: Review proved the attempted snapshot could self-attest `current_ref`, `verified`, and `approved`, while the intent admitted both trusted-transport and verifier-integrated readings.
- Amendment: Justin selected verifier-integrated authority. The execution contract now requires existing retained-artifact verifiers and current identity functions to derive every decision fact, forbids caller-supplied currentness/status assertions, binds available runtime descriptors, closes parser/array/config seams, and expands outer-boundary coverage.
- Known-bad state avoided: A syntactically closed JSON value reporting all-pass without consuming the evidence and approvals it claims to represent.
- KEEP: Closed canonical v2 manifest; deterministic gate order; sole manifest-derived `activation_ref`; stable redacted reasons; pure/no-persistence rendering; rejection of parallel activation authority; inactive legacy/approved-house compatibility; zero provider/coordinator activity on invalid activation.

### 2026-08-26 — Owner-selected authenticated runtime trust
- Trigger: Review proved that verifier-integrated output remained forgeable ordinary JSON when runtime trusted only a public digest.
- Amendment: Justin selected authenticated signing. Runtime now requires Ed25519 verification against a source-pinned SPKI key map, with all fields domain-separated and signed and validity bounded by verified approval expiry. The production key map stays empty; signing and production key provisioning remain separate authority.
- Known-bad state avoided: A caller recomputing a public digest over invented all-pass rows and activating without verifier provenance.
- KEEP: The verifier-integrated offline builder and all prior KEEP constraints; no private keys, production key generation, signing, publication, configuration, or activation in this story.

## Review Triage Log

### 2026-08-26 — Review pass
- intent_gap: 1: (high 1, medium 0, low 0)
- bad_spec: 0
- patch: 5: (high 1, medium 4, low 0)
- defer: 0
- reject: 15: (high 0, medium 8, low 7)
- addressed_findings:
  - none
- attempted_change: `story-1-20-attempt-9514448.patch`
- unresolved_question: Whether the activation snapshot is trusted evidence transport produced by an already-governed release process, or whether Story 1.20's validator/view must itself load and independently recompute current identities, verification outcomes, and approval state from retained evidence artifacts. The former permits caller-authored matching refs/booleans at the validation surface; the latter requires new concrete verifier integration and an exact artifact-input contract.

### 2026-08-26 — Verifier-integrated implementation review (iteration 2)
- intent_gap: 1 high
- patch findings held moot: duplicate-aware JSON parsing, bounded retained-artifact reads, symlink containment, and unsupported future applicable-gate adapters.
- finding: A builder-emitted runtime snapshot remains ordinary caller-controlled JSON. Its public unkeyed digest and publicly derivable fields cannot prove builder provenance, so a caller can author an all-pass snapshot and recompute the digest without invoking any verifier.
- consequence: Runtime activation can still be self-attested unless it re-verifies the retained evidence itself or consumes an authenticated attestation from an explicitly governed authority.
- required owner decision: Choose the trust mechanism for runtime consumption. Options include bundling/runtime-accessible verification evidence, defining an authenticated signing/attestation authority and key boundary, or narrowing Story 1.20 to an offline decision view while deferring runtime activation consumption. The current spec forbids inventing that authority.
- action: Reverted the iteration-2 implementation rather than retain a forgeable activation path.

## Design Notes

The runtime snapshot is authenticated transport, not evidence authority. Its canonical gate order is `deployed_source`, `generation`, `judge`, `house_catalog`, then enabled-mode gates (`local_full_request`; `domain_evidence`, `domain_full_request`), followed by `receiver` and `receipt_claim` only when their nullable refs are present. The builder obtains each current identity/outcome exclusively from existing verifiers: mismatch is `stale`, negative verification is `blocked`, and absent approval is `unapproved`; only exact current approved facts become `pass`. The signing payload contains version, key id, issued/expiry timestamps, manifest, and ordered evidence-bound gates; Ed25519 signs `oddspark-activation-attestation/v1\n` plus canonical JSON of that payload. The envelope adds only a base64url signature. Artifact selectors are closed traversal-safe paths, not evidence claims. No production key is pinned here; the empty production key map proves inactive posture until separate authorization.

Planning baseline: `3e75980c504d29eb71e3a70768aaca59dbe70681` on `develop`.

## Verification

**Commands:**
- `npm run release-decision:test` -- expected: all snapshot/view/CLI adversarial tests pass offline.
- `npm run test` -- expected: activation and public worker boundaries pass with no provider calls.
- `npm run assembly:freeze && npm run assembly:verify` -- expected: intentional runtime closure is recorded and verifies.
- `npm run writer:preflight` -- expected: inactive deployment safety gate passes without remote mutation.
- `npm run check` -- expected: full repository gate passes.

## Auto Run Result

Status: blocked

Blocking condition: intent gap

The first implementation produced a closed atomic snapshot, deterministic decision view, redacted fail-closed runtime posture, CLI, and executable-boundary tests. Independent review showed that its facts were self-attested by the same snapshot: matching `expected_ref`/`current_ref` values and `verified`/`approved` booleans could report ready without consuming existing verifier outputs or binding the qualified refs to the deployed source, runtime provider ports, house catalog, and full-request evidence.

The implementation commit `9514448` was reverted by `d6e2e62`; its recoverable patch is `story-1-20-attempt-9514448.patch`. KEEP on re-derivation: closed manifest/snapshot structure, deterministic canonical gate order, sole v2 manifest-derived `activation_ref`, stable redacted reason codes, pure/no-persistence decision rendering, rejection of parallel legacy activation authority, inactive legacy compatibility, and outer worker tests proving zero assembled provider/coordinator activity.

Review findings breakdown: one high intent gap; five lower patch findings held moot pending resolution (including the missing `ACTIVATION_SNAPSHOT` preflight prohibition, duplicate-key/array-closure checks, bounded parsing/depth, and blocked/unapproved outer-boundary coverage); fifteen findings rejected as duplicates, unsupported scope expansion, or consequences of the central authority question.

Verification before review: `npm run release-decision:test` 6/6 passed; `npm run test` 104/104 passed; `npm run assembly:verify` passed at `f4825f0c5a1d587501d04dbf979467395ec73984af739ff7a938a3a917513c0c`; `npm run writer:preflight` passed every non-Wrangler check but remained blocked because the isolated worktree lacked the pinned Wrangler executable. No provider call, dependency install, deployment, activation, or remote mutation occurred.

### Resumption — 2026-08-26

Justin selected option 1: verifier-integrated authority. The intent and execution contract are amended above; the story is reopened for complete re-derivation from retained verifier outputs. The prior patch remains diagnostic evidence only and must not be reapplied wholesale.

### Resumption — authenticated runtime trust

Justin selected option 2: signed runtime snapshots. The contract now authorizes the Ed25519 verification boundary while explicitly withholding production key provisioning, private signing material, publication, configuration, and activation.
