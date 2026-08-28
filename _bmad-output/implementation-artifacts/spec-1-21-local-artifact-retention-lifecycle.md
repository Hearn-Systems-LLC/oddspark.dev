---
title: 'Story 1.21: Local Artifact Retention Lifecycle'
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: true
baseline_revision: 'a086dd567e0e71b5c92451fe15526fc0d47207e0'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred:
  - summary: >-
      NeuronMeter daily totals have no declared retention or cleanup lifecycle.
    evidence: |-
      Review found that NeuronMeter persists day totals independently of the named neuron-receipt family. Story 1.21 owns profile, abuse-slot, neuron-receipt, and local receipt lifecycles; no authoritative artifact defines expiry for aggregate meter totals.
    location: >-
      src/worker.js:688
    severity: medium
  - summary: >-
      SparkCoordinator served/house metric counters have no declared retention or cleanup lifecycle.
    evidence: |-
      Review found persistent served metrics outside the named Story 1.21 record-family inventory. Deleting or expiring counters would change operational evidence without an authoritative retention decision.
    location: >-
      src/worker.js:883
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Local authoritative receipts and projections can remain eligible indefinitely, reads and repairs lack one non-sliding expiry authority, and the persisted-record inventory does not prove bounded lifecycle behavior at exact clock boundaries.

**Approach:** Make immutable COORD receipt timestamps authoritative for a 30-day local lifecycle, propagate only the remaining absolute lifetime to KV projections, enforce expiry once across both public read surfaces, test each implemented record family with controlled time and scope-safe cleanup, and truthfully inventory the nonexistent aggregate-report family as absent/deferred.

## Boundaries & Constraints

**Always:** Stamp `committed_at` and `expires_at` once with an exact 30-day delta; preserve them on idempotent commit and every read/repair; refuse at `now >= expires_at`; derive KV absolute expiration from the receipt; keep COORD authoritative; make cleanup collision-safe and scope-closed; inventory owner, authority, creation, read, expiry, and cleanup for every implemented named family; record aggregate reports as absent/deferred.

**Block If:** Work would require inventing an aggregate-report schema, snapshot schedule, writer, reader, authority relationship, or cleanup contract; those remain deferred unless separately authorized through BMAD.

**Never:** Extend or alter Story 2.6's domain one-hour lifecycle; make reads slide expiry; let stale KV restore eligibility; delete across `w:`/`pw:` or receipt scopes; turn KV into authority; silently grant legacy projections a new lifetime; modify activation, deployment, pinned evidence, deferred-work, or `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Local commit | New local authoritative receipt at `t0` | Immutable expiry is exactly `t0 + 30d`; projections share that absolute boundary | Invalid or overflowing timestamps reject |
| Boundary reads | Same receipt at `expiry - 1ms` and `expiry` | Both public surfaces serve before and return shared 404 at/after boundary | No served metric or projection repair after expiry |
| Repeated repair | Valid COORD receipt with missing/stale local KV | Repair uses remaining lifetime and never extends expiry | Refuse cross-scope keys and expired authority |
| Scoped cleanup | Expired local receipt/index collides with unrelated scope | Delete only identity-bound local records | Ambiguity fails closed without deleting another scope |
| Named family inventory | Profile, abuse, neuron receipt, absent aggregate report | Explicit lifecycle and time-controlled proof for implemented families; aggregate reports recorded absent/deferred | Missing implementation is disclosed, not invented |

</intent-contract>

## Code Map

- `src/pipeline/retention.mjs:1-27` — canonical duration/boundary helpers; extend with exact local and named-family policies, safe timestamp arithmetic, non-sliding absolute boundaries, and conservative whole-second KV expiration that never extends authority.
- `src/pipeline/receipts.mjs:123-141` — closed commit/receipt parser; require safe immutable `expires_at` exactly 30 days after local commit. For a supported pre-1.21 local receipt with immutable `committed_at` but no `expires_at`, derive only `committed_at + 30d` as its original absolute boundary; never derive from read time.
- `src/worker.js:692-876` — SparkCoordinator read/claim/commit/profile/metric/slot authority. Maintain collision-safe expiry-index records and the earliest Durable Object alarm for local receipts/indexes, profiles, abuse histories, and scoped claims so abandoned keys are physically bounded without waiting for another request. Alarm cleanup must re-read and identity-match scope, artifact id, timestamps, and family before deletion, tolerate stale index entries, reschedule the next boundary, and never cross local/domain scopes. Reject or deterministically migrate supported legacy local receipts from immutable `committed_at`; malformed state fails closed and is not granted a new lifetime.
- `src/worker.js:1088-1133` — authoritative read/commit ports; retain canonical receipt validation.
- `src/worker.js:1478-1518` — projection repair and shared artifact lookup used by both public surfaces; bind repair to receipt expiry. Profile KV is a cache only: every hit/repair must remain bound to live COORD profile authority and its original expiry, including near-boundary writes.
- `src/worker.js:2776-2784,2904-2925` — `/api/spark/:id` and `/s/:id`; shared lookup must yield 404 at the exact boundary without metrics.
- `src/worker.js:651-720,888-900,1150-1176,1342-1343` — neuron, abuse, and profile lifecycle seams.
- `scripts/brief-receipts.mjs` — protected thin re-export; keep canonical logic in production modules.
- `scripts/brief-receipts.test.mjs` and `test.mjs` — closed receipt fixtures plus outer COORD/route/clock assertions. Prove alarm cleanup of abandoned keys, stale-index/collision/malformed-state safety, legacy committed-time migration, exact artifact-id matching, separate before/at-boundary behavior for both public routes, ambiguous ID expiry, near-expiry profile cache repair/non-slide, validated family inputs, provider-TTL neuron cleanup semantics, and that neither KV nor an expired projection restores authority.
- `m:<day>:*` — architecture-declared aggregate report namespace; no implementation exists in this checkout.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/implementation-artifacts/spec-1-21-local-artifact-retention-lifecycle.md` and `epics.md` — record the owner-approved absent/deferred aggregate-report decision without creating that family.
- [x] `src/pipeline/retention.mjs` — add exact immutable local expiry, safe absolute-expiration conversion, and scope-safe named-family lifecycle helpers.
- [x] `src/pipeline/receipts.mjs` — close local receipt parsing around `committed_at` plus exact `expires_at`, including deterministic original-boundary migration for supported legacy local receipts.
- [x] `src/worker.js` — stamp authoritative expiry once, enforce it on read/claim/public lookup, schedule and execute identity-bound Durable Object alarm cleanup, keep profile KV subordinate to COORD, and repair projections with non-sliding absolute expiration.
- [x] `scripts/brief-receipts.test.mjs` and `test.mjs` — prove exact boundaries on each public surface, abandoned-record cleanup, non-slide, collision/legacy/malformed safety, profile cache authority, metrics, and every resolved family inventory path.

**Acceptance Criteria:**
- Given a local commit, when the receipt and projections are created or repaired, then immutable timestamps remain exactly 30 days apart and all derived storage shares the same absolute boundary.
- Given either public artifact route, when the authoritative clock reaches expiry, then the artifact is refused with the shared 404 behavior, no metric increments, and reads never extend eligibility.
- Given cleanup or repair, when keys, ids, or scopes conflict, then no domain or unrelated record is deleted or restored and COORD remains authority.
- Given every implemented BMAD-declared record family, when lifecycle verification runs under a controlled clock, then owner, authority, creation, read, exact expiry, and cleanup are executable and explicit; the nonexistent aggregate-report family is explicitly absent/deferred.
- Given no later request arrives for a local receipt, profile, abuse history, or scoped claim, when its Durable Object expiry boundary passes, then an indexed alarm physically removes only the identity-matched expired records and reschedules remaining work; provider-TTL KV records remain bounded by their absolute expiration.
- Given a supported legacy local receipt with immutable `committed_at` and no `expires_at`, when it is encountered, then its only permitted boundary is the original `committed_at + 30d`; read time can never create or extend eligibility.

## Spec Change Log

- 2026-08-23 — Planning halted because authoritative BMAD names pre-existing 90-day aggregate reports but no executable report family or schema exists.
- 2026-08-23 — Justin approved recording `m:<day>:*` aggregate reports as absent/deferred. Story 1.21 implements only the defined local receipt/projection lifecycle and inventories existing profile, abuse, and neuron families; it must not invent aggregate-report behavior.
- 2026-08-23 — Review loop 1: read-triggered deletion did not bound abandoned Durable Object records, collision cleanup omitted artifact identity, profile KV could outlive COORD authority, legacy receipts had no deterministic policy, whole-second KV expiry and near-boundary repair were underspecified, and tests did not independently prove both public surfaces or named-family cleanup. The Code Map, tasks, and acceptance now require indexed alarm cleanup, full identity matching, original-commit legacy migration, COORD-bound profile caching, conservative absolute KV expiration, and direct outer-boundary tests. KEEP: preserve exact 30-day immutable receipt boundaries, non-sliding repair, shared 404 semantics, local/domain scope separation, existing provider TTLs, absent/deferred aggregate reports, runtime neutrality, and no deployment/activation changes.

## Review Triage Log

### 2026-08-23 — Review pass
- intent_gap: 0
- bad_spec: 12: (high 7, medium 5, low 0)
- patch: 0
- defer: 2: (high 0, medium 2, low 0)
- reject: 6: (high 0, medium 2, low 4)
- addressed_findings:
  - `[high]` `[bad_spec]` Replace request-triggered deletion with identity-bound indexed alarms that physically bound abandoned Durable Object records.
  - `[high]` `[bad_spec]` Include artifact id, scope, family, and timestamps in every cleanup identity check.
  - `[high]` `[bad_spec]` Keep profile KV subordinate to live COORD authority and preserve the original expiry during near-boundary repair.
  - `[high]` `[bad_spec]` Define supported legacy local receipts from immutable `committed_at + 30d`, never read time.
  - `[high]` `[bad_spec]` Prove ambiguous by-ID expiry and independent before/at-boundary behavior for both public routes.
  - `[high]` `[bad_spec]` Contain malformed/cyclic family state and validate all family storage keys before persistence.
  - `[high]` `[bad_spec]` Require actual cleanup semantics for profile, abuse, claim, local receipt, and provider-TTL neuron families.
  - `[medium]` `[bad_spec]` Specify conservative whole-second KV expiration without extending authoritative eligibility.
  - `[medium]` `[bad_spec]` Prove stale expiry indexes and colliding domain/local identities cannot cause cross-record deletion.
  - `[medium]` `[bad_spec]` Add mutation-resistant near-expiry cache repair and non-slide verification.
  - `[medium]` `[bad_spec]` Separate authority refusal from physical provider cleanup in named-family tests.
  - `[medium]` `[bad_spec]` Make alarm rescheduling deterministic and safe under stale or concurrent expiry entries.

### 2026-08-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 3, medium 5, low 0)
- defer: 0
- reject: 12: (high 0, medium 4, low 8)
- addressed_findings:
  - `[high]` `[patch]` Move Durable Object alarm reads and writes out of transactions and preserve an already-scheduled earlier boundary.
  - `[high]` `[patch]` Reindex stale expiry entries to their actual target while retaining exact identity checks before deletion.
  - `[high]` `[patch]` Contain malformed or overflowing abuse-slot state so one bad record cannot abort cleanup of later eligible records.
  - `[medium]` `[patch]` Close stored-profile parsing around exact creation-derived expiry and live COORD authority.
  - `[medium]` `[patch]` Validate canonical multi-label domains before any family key is persisted.
  - `[medium]` `[patch]` Return an existing idempotent receipt or claim before applying fresh timestamp arithmetic.
  - `[medium]` `[patch]` Add independent route seeds and production-shaped alarm tests for both public boundaries and cleanup behavior.
  - `[medium]` `[patch]` Preserve valid cross-scope ambiguity while removing only the expired local member.

## Design Notes

The receipt's absolute timestamp is the lifecycle fact. KV expiration is a projection of its remaining lifetime, never a fresh TTL. Legacy KV-only compatibility needs an explicit rule rather than accidental immortal service or retroactive eligibility.

## Verification

**Commands:**
- `node --test scripts/brief-receipts.test.mjs` -- expected: receipt schema and expiry mutations fail closed.
- `npm test` -- expected: time-controlled COORD and both public-route boundaries pass.
- `npm run assembly:verify` and `npm run check` -- expected: canonical assembly and full offline gate pass.
- `git diff --check` -- expected: no whitespace errors or protected-file changes.

## Auto Run Result

Status: done

Owner decision: aggregate reports are absent/deferred and are not implemented by this story. The defined 30-day local lifecycle and implemented-family inventory are complete.

Implemented files:
- `src/pipeline/retention.mjs`
- `src/pipeline/receipts.mjs`
- `src/worker.js`
- `scripts/brief-receipts.test.mjs`
- `test.mjs`
- `runtime-assembly.json`
- `_bmad-output/planning-artifacts/epics.md`

Review outcome:
- First pass: 12 specification defects were incorporated into the executable contract; 2 pre-existing metric-family lifecycle questions were deferred because BMAD defines no expiry authority for them.
- Second pass: 8 implementation findings were patched and verified; no new intent gap or specification defect remained.
- Follow-up review recommended: true. High 3, medium 5, low 0; weighted score 15.

Verification:
- `node --test scripts/brief-receipts.test.mjs` — PASS, 7/7.
- `npm test` — PASS, 102/102.
- `npm run assembly:verify` — PASS; runtime identity `865e455d6b3a1f3830d232499c4688340a48118c087f037e957d9d2a3f0b5d93`.
- `CI=1 node .github/check-ci.mjs` — PASS, including browser checks.
- `git diff --check` — PASS.
- `npm run check` — known governed residual DW-6 only: the evidence-pinned semantic judge self-test refuses a new matrix after its spent GO cycle. The same failure reproduces on the Story 1.21 baseline and is not changed here.

Residuals:
- NeuronMeter daily totals and SparkCoordinator served/house counters remain explicitly deferred until BMAD defines their lifecycle.
- Story 1.18 must bind its semantic qualification plan to the current runtime identity; no pinned judge evidence is rewritten by Story 1.21.
