---
title: 'Story 1.21: Local Artifact Retention Lifecycle'
type: 'feature'
created: '2026-08-23'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred: []
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

- `src/pipeline/retention.mjs:1-27` — canonical duration/boundary helpers; extend with exact local and named-family policies plus absolute remaining-lifetime logic.
- `src/pipeline/receipts.mjs:123-141` — closed commit/receipt parser; require safe immutable `expires_at` exactly 30 days after local commit.
- `src/worker.js:692-876` — SparkCoordinator read/claim/commit/profile/metric/slot authority; stamp once and expire only identity-bound local records.
- `src/worker.js:1088-1133` — authoritative read/commit ports; retain canonical receipt validation.
- `src/worker.js:1478-1518` — projection repair and shared artifact lookup used by both public surfaces; bind repair to receipt expiry.
- `src/worker.js:2776-2784,2904-2925` — `/api/spark/:id` and `/s/:id`; shared lookup must yield 404 at the exact boundary without metrics.
- `src/worker.js:651-720,888-900,1150-1176,1342-1343` — neuron, abuse, and profile lifecycle seams.
- `scripts/brief-receipts.mjs` — protected thin re-export; keep canonical logic in production modules.
- `scripts/brief-receipts.test.mjs` and `test.mjs` — closed receipt fixtures plus outer COORD/route/clock assertions.
- `m:<day>:*` — architecture-declared aggregate report namespace; no implementation exists in this checkout.

## Tasks & Acceptance

**Execution:**
- `_bmad-output/implementation-artifacts/spec-1-21-local-artifact-retention-lifecycle.md` and `epics.md` — record the owner-approved absent/deferred aggregate-report decision without creating that family.
- `src/pipeline/retention.mjs` — add exact immutable local expiry and scope-safe named-family lifecycle helpers.
- `src/pipeline/receipts.mjs` — close local receipt parsing around `committed_at` plus exact `expires_at`.
- `src/worker.js` — stamp authoritative expiry once, enforce it on read/claim/public lookup, and repair local projections with non-sliding absolute expiration.
- `scripts/brief-receipts.test.mjs` and `test.mjs` — prove exact boundaries, non-slide, collision safety, public 404 behavior, metrics, and every resolved family inventory path.

**Acceptance Criteria:**
- Given a local commit, when the receipt and projections are created or repaired, then immutable timestamps remain exactly 30 days apart and all derived storage shares the same absolute boundary.
- Given either public artifact route, when the authoritative clock reaches expiry, then the artifact is refused with the shared 404 behavior, no metric increments, and reads never extend eligibility.
- Given cleanup or repair, when keys, ids, or scopes conflict, then no domain or unrelated record is deleted or restored and COORD remains authority.
- Given every implemented BMAD-declared record family, when lifecycle verification runs under a controlled clock, then owner, authority, creation, read, exact expiry, and cleanup are executable and explicit; the nonexistent aggregate-report family is explicitly absent/deferred.

## Spec Change Log

- 2026-08-23 — Planning halted because authoritative BMAD names pre-existing 90-day aggregate reports but no executable report family or schema exists.
- 2026-08-23 — Justin approved recording `m:<day>:*` aggregate reports as absent/deferred. Story 1.21 implements only the defined local receipt/projection lifecycle and inventories existing profile, abuse, and neuron families; it must not invent aggregate-report behavior.

## Review Triage Log

## Design Notes

The receipt's absolute timestamp is the lifecycle fact. KV expiration is a projection of its remaining lifetime, never a fresh TTL. Legacy KV-only compatibility needs an explicit rule rather than accidental immortal service or retroactive eligibility.

## Verification

**Commands:**
- `node --test scripts/brief-receipts.test.mjs` -- expected: receipt schema and expiry mutations fail closed.
- `npm test` -- expected: time-controlled COORD and both public-route boundaries pass.
- `npm run assembly:verify` and `npm run check` -- expected: canonical assembly and full offline gate pass.
- `git diff --check` -- expected: no whitespace errors or protected-file changes.

## Auto Run Result

Status: resumed
Owner decision: aggregate reports are absent/deferred and are not implemented by this story. Development may proceed on the defined 30-day local lifecycle and implemented-family inventory.
