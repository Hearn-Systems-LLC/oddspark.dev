---
title: 'Story 1.26: Atomic Local-Only Activation'
type: 'feature'
created: '2026-08-26'
status: 'awaiting-operator'
baseline_commit: '5b375bae53906d01c2919d56ca57c45ba1be6235'
baseline_revision: '5b375ba'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-20-atomic-activation-contract-and-release-decision-view.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** The inactive production writer cannot consume any activation authority: the source-pinned trust-key map is intentionally empty, and no bounded operator path freezes, verifies, installs, observes, or rolls back one signed local-only activation snapshot.

**Approach:** Harden the traffic-era runtime bounds, build a fail-closed offline activation preflight/controller that freezes an exact signed-snapshot publication and rollback packet, then stop for separate owner authority to select the production public key, approve the exact code/config/deployment sequence, sign through the owner-controlled private-key boundary, and activate.

## Boundaries & Constraints

**Always:** Preserve the Story 1.20 authenticated trust boundary: runtime accepts exactly one closed `ACTIVATION_SNAPSHOT`, signed with Ed25519 under a source-pinned SPKI key and unexpired against the earliest verifier-derived approval expiry. The sole embedded manifest is v2 with `local.enabled=true`, `domain.enabled=false`, all domain/receiver/receipt refs null, and shared generation/judge refs occurring once. Preflight must recompute every applicable fact through retained verifiers, bind the deployed assembly/provider/content identities, freeze exact bytes and hashes before approval, prove inactive and rollback postures, and perform no remote mutation. Activation and rollback are atomic whole-value operations with independent post-change verification and no retry or substitution outside the approved packet.

**Block If:** A production public key/key id has not been explicitly selected; private signing requires agent access; any retained verifier is not pass/current/approved; the exact signed bytes, validity interval, deployed source identity, production target, mutation command, observation window, or rollback value are not frozen; production configuration or code deployment lacks fresh explicit approval; provider/deployment/activation/rollback execution is required; or current live state differs from the approved packet.

**Never:** Generate, store, print, commit, or request private key material; self-attest currentness or approval; weaken signature, expiry, verifier, manifest, or identity checks; publish a partial/parallel manifest; enable domain/receiver/receipt claims; invoke providers in tests or CI; mutate remote resources during preflight; retry or replace an approved activation attempt; merge to `main`; or treat a green local gate as production activation authority.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Offline candidate | Local-only manifest, closed selectors, chosen public key metadata | Verifiers emit one unsigned canonical payload and an exact signing request; no secret or remote mutation | Any stale/blocked/unapproved fact produces a redacted non-ready decision |
| Signed candidate | Exact owner-produced signature over frozen payload | Preflight verifies signature, expiry, identities, local-only shape, deployment target, and rollback packet | Byte drift, unknown key, expiry, or target drift rejects before mutation |
| Active local request | Approved snapshot installed atomically | Canonical writer returns one committed qualified local Brief or approved house Brief | Uncertainty fails closed; no late commit after terminal timeout |
| Domain request during local phase | Same active snapshot | Closed dispatch produces effective local mode with notice | Scanner, EvidenceProvider, global `w:` write, domain permalink, and legacy generator remain unreachable |
| Rollback | Exact frozen inactive value/removal | Whole snapshot is removed/replaced atomically and Story 1.25 posture returns | Stale snapshot cannot reactivate; code rollback remains separate authority |

</intent-contract>

## Code Map

- `src/pipeline/release-decision.mjs` -- closed attestation payload, signature/time verification, empty production trust-key map, and test-only key injection seam.
- `scripts/release-decision.mjs` -- trusted read-only builder that recomputes assembly, generation, judge, house, and local full-request facts.
- `src/pipeline/assembly.mjs:createInactiveDomainWriter` -- rejects parallel `ACTIVATION_MANIFEST`, checks signed snapshot and exact runtime identities, then exposes the local-only writer.
- `src/pipeline/production-ports.mjs` -- actual Workers AI provider ports and runtime identity descriptors; add bounded provider calls without changing qualified request bytes.
- `src/worker.js:runInactiveDomainWriter` -- 60-second response deadline currently abandons an in-flight write; traffic activation requires a terminal-safe cancellation/commit contract.
- `scripts/writer-preflight.mjs` -- inactive deployment gate and adversarial snapshot smoke; reuse its config/import-closure checks.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- pre-1.26 obligations: late commit after timeout, provider bounds, and per-request verification/mid-deployment flip risk.
- `runtime-assembly.json` and `docs/runtime-baseline.md` -- refreeze intentional runtime changes and document the exact activation/rollback operator boundary.

## Tasks & Acceptance

**Execution:**
- [x] `src/worker.js`, `src/pipeline/assembly.mjs`, and outer Worker tests -- replace abandon-only response timeout behavior with a bounded terminal contract that prevents a coordinator commit/served outcome after the client has received 502; preserve concurrent receipt recovery and negotiated errors.
- [x] `src/pipeline/production-ports.mjs` and tests -- bound generation and judge provider calls inside the route budget while preserving frozen provider request envelopes and fail-closed adapter behavior.
- [x] `src/pipeline/assembly.mjs` and tests -- cache only immutable verified activation/content assembly by exact signed-snapshot and content identity, invalidate on value/identity change, and prove no mid-request or mid-deployment authority flip; never cache request/coordinator state.
- [x] `scripts/activation-preflight.mjs`, focused tests, and `package.json` -- compose retained verifier construction, local-only manifest closure, public-key/signature verification, approval expiry, current runtime identity, exact production target, atomic whole-value mutation shape, observation checks, and inactive rollback into a deterministic redacted packet. Support unsigned preparation and signed verification as separate commands; neither command signs or mutates remote state.
- [x] `scripts/activation-controller.mjs` and tests -- consume only a hash-bound approved packet, re-check frozen local/live preconditions before one atomic set/remove operation, refuse retries/substitution, and emit a redacted terminal record. Production execution remains disabled unless an explicit one-shot authority token/file names the exact packet hash and target.
- [x] `runtime-assembly.json`, `docs/runtime-baseline.md`, and Story 1.26 verification evidence -- refreeze intentional runtime closure and document preparation, signing handoff, activation observation, and rollback without secret material.
- [ ] `docs/runtime-baseline.md` operator packet -- record, without secret material, the owner-selected production public key/key id and exact approvals for source pinning/config/deployment, owner-external signing, one-shot activation, and any rollback. No agent may infer these values or approvals.

**Acceptance Criteria:**
- Given a hung or late writer/provider operation, when its terminal budget expires, then the request returns the negotiated 502 and no later coordinator commit or served metric can occur.
- Given an unsigned local-only candidate, when activation preparation runs, then every applicable Story 1.20 verifier-derived gate is pass, exact canonical bytes and hashes are frozen, and no provider, deployment, signing, configuration, or remote mutation occurs.
- Given any stale, unapproved, expired, malformed, partial, parallel, domain-enabled, receiver-enabled, receipt-enabled, wrong-key, wrong-target, or identity-drifted candidate, when signed preflight runs, then it rejects with a stable redacted reason before mutation.
- Given a separately approved exact packet, when the controller performs activation once, then one whole `ACTIVATION_SNAPSHOT` value is installed atomically, local is enabled, domain remains effective-local with the pre-activation notice, and post-change checks bind the observed runtime to the approved packet.
- Given the frozen rollback packet, when separately authorized rollback runs once, then the whole snapshot is removed/replaced atomically, Story 1.25 inactive posture is observed, and stale refs cannot reactivate.

## Spec Change Log

## Review Triage Log

- 2026-08-26 source-pin approval and review — RECORD: the owner explicitly
  approved the exact single-key source-pinning code/config deployment while
  requiring `ACTIVATION_SNAPSHOT` to remain absent. The trust map now pins only
  `oddspark-production-activation-2026-01`; runtime assembly identity is
  `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`.
  Independent AGY adversarial review returned PASS after the full project gate.
  External signing, activation, and rollback approvals remain ungranted.

- 2026-08-26 operator authority update — RECORD: the owner selected production
  key id `oddspark-production-activation-2026-01` and supplied a valid Ed25519
  DER SPKI public key with SHA-256
  `17cc333e3c59953bad278a2138ff53c579a793ec48f698dffabc780784fd450e`.
  Source-pinning/config/deployment, external signing, activation, and rollback
  approvals remain ungranted; the production trust map remains empty.

- 2026-08-26 required-repair pass — PATCH: terminal race was real because the
  outer timeout could not revoke an already in-flight coordinator commit.
  Added a coordinator-enforced absolute terminal deadline at the transaction
  mutation boundary and proved it through `createInactiveDomainWriter` with a
  controllably delayed real coordinator commit.
- 2026-08-26 required-repair pass — PATCH: signed preflight had accepted the
  candidate-supplied SPKI as trust authority. Verification now requires a
  separate owner-selected trust-key map plus expected key id, rejects public
  key material in the signed candidate, and exposes the exact
  domain-separated signing bytes.
- 2026-08-26 required-repair pass — PATCH: controller mutation was not an
  explicit compare-and-set and adapter boundaries/observation failures were
  underspecified. Claim, CAS, and observation now carry deadlines; mutation
  compares against the frozen live whole value; every observation field has a
  direct mismatch test; post-mutation observation failures are distinct,
  terminal, and marked mutation-applied.
- 2026-08-26 required-repair pass — PATCH: pipeline construction performed
  content verification before consulting its cache. The cache now keys the
  same environment/provider identities plus canonical immutable content
  identity before verification, reuses the exact verified assembly, and
  invalidates on drift.
- 2026-08-26 required-repair pass — PATCH: provider abort listeners survived
  settled calls. Generation/judge and assembled provider races now remove
  their listeners in `finally`, with direct listener-accounting coverage.

## Design Notes

Source-pinned public trust and activation-by-value are two distinct gates. A production key pin may require a separately approved code deployment before the signed snapshot can be installed; that deployment must leave `ACTIVATION_SNAPSHOT` absent. The later activation remains a one-value mutation, uncoupled from application code deployment. Private signing stays entirely outside this repository and agent boundary.

## Verification

**Commands:**
- `npm run activation:test` -- expected: preparation, signed verification, controller, rollback, drift, and no-mutation adversarial fixtures pass offline.
- `npm test` -- expected: public Worker terminal, local-only, domain-downgrade, concurrency, and no-late-commit cases pass.
- `npm run check` -- expected: full offline repository gate passes without providers or remote mutation.
- `npm run writer:preflight` -- expected: inactive baseline remains valid until separately approved activation.
- `npm run assembly:freeze && npm run assembly:verify` -- expected: intentional runtime closure is frozen and verifies.
- `git diff --check` -- expected: clean.

## Implementation Verification — 2026-08-26

- `npm run activation:test`: PASS (7/7 offline preparation, independent
  trust-key verification, local-only rejection matrix, bounded CAS,
  observation mismatch, rollback, drift, and retry tests).
- `npm test`: PASS (108/108 public Worker and runtime tests, including the
  assembled-writer delayed coordinator commit, cache invalidation, provider
  listener cleanup, and deadline terminals).
- `npm run check`: PASS after rerunning with the local filesystem/loopback
  permissions required by pinned Wrangler type generation; no provider or
  remote mutation was invoked.
- `npm run writer:preflight`: PASS; no remote resource created, modified, or
  deleted.
- `npm run assembly:freeze && npm run assembly:verify`: PASS; frozen runtime
  identity `4388ba940e9518aa4a8d1dc112c3a1d220d01ed67ecc19da5fead216ddea8324`
  over 18 modules.
- `git diff --check`: PASS.
- Production key selection, source-pinning/config/deployment approval, external signature, one-shot activation, and rollback authority remain deliberately absent; the final operator-packet task and production activation/rollback acceptance criteria remain blocked by the spec's human-only gates.

## Auto Run Result

Agent-doable implementation is complete and the final independent adversarial
re-review passed. The story is `awaiting-operator`, not `done`: production key
selection, source-pinning/config/deployment approval, owner-external signing,
one-shot activation authority, and any rollback authority require separate
owner decisions. No deployment, provider call, signing operation, or remote
mutation was performed by this run.

## Suggested Review Order

**Terminal-safe runtime**

- Start with the coordinator-owned absolute deadline at the transaction boundary.
  [`worker.js:1002`](../../src/worker.js#L1002)

- Follow deadline propagation through the assembled writer's real commit path.
  [`assembly.mjs:200`](../../src/pipeline/assembly.mjs#L200)

- Confirm the controllably delayed assembled-writer race cannot commit late.
  [`test.mjs:3348`](../../test.mjs#L3348)

**Trust and mutation authority**

- Verify candidate bytes are checked only against independent owner trust.
  [`activation-preflight.mjs:55`](../../scripts/activation-preflight.mjs#L55)

- Review bounded whole-value CAS and terminal observation classification.
  [`activation-controller.mjs:22`](../../scripts/activation-controller.mjs#L22)

- Inspect signed local-only and candidate-key rejection coverage.
  [`activation-preflight.test.mjs:31`](../../scripts/activation-preflight.test.mjs#L31)

- Inspect direct mismatch and bounded-operation controller coverage.
  [`activation-controller.test.mjs:35`](../../scripts/activation-controller.test.mjs#L35)

**Verified assembly lifetime**

- Confirm exact content/provider identity reuse precedes content verification.
  [`production-ports.mjs:258`](../../src/pipeline/production-ports.mjs#L258)

- Confirm provider abort listeners are removed after every settled call.
  [`production-ports.mjs:186`](../../src/pipeline/production-ports.mjs#L186)

**Operator boundary and evidence**

- Review the independent trust-file, CAS, and residual authority contract.
  [`runtime-baseline.md:266`](../../docs/runtime-baseline.md#L266)

- Confirm the refrozen source identity covering all runtime-neutral modules.
  [`runtime-assembly.json:1`](../../runtime-assembly.json#L1)
