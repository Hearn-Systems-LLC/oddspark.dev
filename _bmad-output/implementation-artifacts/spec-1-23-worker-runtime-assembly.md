---
title: 'Story 1.23: Worker Runtime Assembly'
type: 'feature'
created: '2026-08-20'
status: 'done'
baseline_commit: '6e67992aeed4580887f7c6f2096a3b44e0a017cc'
warnings: [oversized]
baseline_revision: '6e67992'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The production Brief pipeline has no canonical runtime home: contracts, generation, Gate, strike, receipt, and rendering logic live in `scripts/*.mjs` (some Node-only, one importing a spike module) while `src/worker.js` re-implements strike/generation inline. This split caused the 2026-08-20 production 502 incident. Story 1.23 is the incident-recovery fix (Sprint Change Proposal 2026-08-20).

**Approach:** Assemble one canonical runtime-neutral ES-module graph under `src/pipeline/`, imported identically by `src/worker.js` and Node verification, with every provider/coordinator/clock/storage/activation dependency entering through explicit ports. `scripts/` modules become thin re-exports plus Node-only loaders/CLIs. Wire the assembled writer to Story 1.16's dispatch seam, gated by a minimal closed activation port: without a valid `ProductionActivationManifest` the new writer stays disabled and no legacy generator becomes a fallback. Per the approved 2026-08-20 decision, 1.23 ships only the minimal closed validators for activation-manifest and retention-expiry semantics (shapes per AD-11/AD-12); Stories 1.20/1.21 keep their governance surfaces.

## Boundaries & Constraints

**Always:** One canonical implementation per pipeline concern under `src/pipeline/`; `scripts/` may re-export and host Node-only loaders/CLIs/tests but must not independently implement a production Brief writer, closed validator, canonical hash, grounding rule, ledger transition, receipt rule, or projection. No canonical module imports Node-only APIs. Provider, judge, coordinator, clock, storage, house catalog, priors, and activation dependencies are injected ports. The assembled domain writer consumes exactly Story 1.16's closed dispatch value; it builds local Evidence, runs the existing strike and Gate contracts, commits under domain request scope, renders effective local mode with the fixed pre-activation notice, and records delivery only after successful rendering. Concurrent cold requests converge on one authoritative receipt. Absent a valid activation manifest, model roles and new writer execution remain disabled with a redacted reason code only. Emit a deterministic runtime-assembly identity binding the canonical module graph and source hashes for later gates; it creates no approval or deployment authority.

**Ask First:** Any change to closed contract schemas (Brief, Candidate, Evidence, CommittedBrief, receipts), the dispatch contract shape, coordinator authority, or wrangler configuration beyond what assembly strictly requires.

**Never:** No scan or EvidenceProvider call on the inactive-domain path; no global `w:` projection or permalink mint for domain scope; no legacy generator as fallback for the assembled writer; no provider call, deployment, activation, or remote-resource mutation; offline fake ports and activation fixtures create test authority only and must not be able to activate a deployed Worker. Do not delete the quarantined legacy writer/scanner internals (Story 5.2). Do not edit `wrangler.toml`, `wrangler.offline.toml`, root `worker.js`, or `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Cold domain request, test-activated fixture | Valid dispatch, no prior receipt, local-enabled/domain-disabled fixture | Evidence→strike→Gate→commit (domain scope)→render local mode + fixed notice; no scan, no `w:` write, no permalink; metric after render | Gate/strike failure resolves per existing house/terminal contracts |
| Concurrent cold requests, same domain | Two+ racing requests | One receipt wins; all successes resolve the same committed artifact; incompatible winners reject | Losers read the authoritative receipt |
| Resubmission after success | Prior committed receipt exists | Read authority; no regeneration, no replacement | N/A |
| No/invalid activation manifest | Writer evaluated in production posture | Writer disabled; model roles off; redacted reason code only; legacy path untouched | Fail closed |
| Writer failure mid-claim | Claim held, generation/Gate throws | Claim safely finalized/released; no partial commit; 502 terminal per 1.16 | Negotiated 502, no metric |
| Assembly identity | `npm run check` | Deterministic identity over the canonical module graph + source hashes; reproducible across runs | Drift fails verification |

</frozen-after-approval>

## Code Map

- `scripts/brief-contracts.mjs`, `scripts/brief-receipts.mjs`, `scripts/brief-rendering.mjs`, `scripts/generation.mjs` — already runtime-neutral; move (git-mv content) to `src/pipeline/` and re-export from `scripts/` for CLI/test consumers. `brief-contracts.mjs:17` ships a runtime-neutral sync SHA-256 — the canonical-hash single source.
- `scripts/strike-orchestrator.mjs:1,93-95` — `seedFor` uses `node:crypto`; swap to the contracts SHA-256 and move. Ports (`deps.generate/gate/now/coordinator/house`) already explicit.
- `scripts/composite-gate.mjs:14-15` — imports `semantic-corpus.mjs` (Node-only) and `spikes/judge-fidelity/contract.mjs:validateJudgeResult`. Promote the judge-result validator and the pure corpus validator into `src/pipeline/`; break the spike edge.
- `scripts/house-briefs.mjs`, `scripts/local-priors.mjs`, `scripts/local-evidence.mjs`, `scripts/semantic-corpus.mjs` — split pure validation/identity/projection (move to `src/pipeline/`, canonicalize the three duplicate `canonicalJson`/`domainHash` copies) from fs loaders and CLIs (stay in `scripts/`).
- `src/worker.js:1-13` — already imports receipts/rendering; re-point to `src/pipeline/`. `:1539-1585` — 1.16 dispatch + `runInactiveDomainWriter`; the assembled writer becomes the port implementation. `:2726` — the seam. Inline legacy generation/strike (`:605-1050, 1259-1500`) stay quarantined.
- `spikes/generation-qualification/qualification.mjs:22,61` and `spikes/judge-fidelity/qualification.mjs:397` — the closed-manifest + derived-ref + source-hash pattern to follow for the activation validator and assembly identity. AD-11 (architecture): `ProductionActivationManifest` shape and `activation_ref` derivation.
- `test.mjs:113-236` — `createEnvironment` port-injection pattern; extend with activation-fixture and priors/house fakes. `scripts/runtime-baseline.mjs:245-278` — identity-composition precedent; `package.json:32` — `check` gate to compose the new identity verification exactly once.
- `content/house-briefs/`, `content/local-priors/` — approved content the evidence/house ports consume; production wiring must receive them as injected data, not fs reads.
- Protected read-only: `worker.js`, `wrangler.toml`, `wrangler.offline.toml`, `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Tasks & Acceptance

**Execution:**
- [x] `src/pipeline/` — create the canonical module graph: `contracts.mjs`, `receipts.mjs`, `rendering.mjs`, `generation.mjs`, `gate.mjs` (+ promoted judge validator), `strike.mjs`, `evidence.mjs`, `priors.mjs`, `house.mjs`, `corpus.mjs` (pure parts), `activation.mjs` (minimal closed `ProductionActivationManifest` validator + redacted reason codes per AD-11), `retention.mjs` (minimal expiry semantics per AD-12/1.21 shape), `assembly.mjs` (port wiring; exposes the inactive-domain writer port consuming the 1.16 dispatch), `identity.mjs` (runtime-assembly identity over graph + source hashes). No `node:*` imports anywhere under `src/pipeline/`.
- [x] `scripts/*.mjs` — convert to re-export shims plus Node-only loaders/CLIs; remove every independent implementation of the closed concerns. All existing `scripts/*.test.mjs` must keep passing against the shims unchanged or with import-path-only updates.
- [x] `src/worker.js` — import the assembled graph; wire the 1.16 seam's default writer to the assembled writer gated by the activation port. Posture rule: manifest absent/invalid ⇒ disabled ⇒ seam behaves as port-absent today (legacy fallthrough); but manifest valid AND any required pipeline port missing/invalid ⇒ fail closed with the 1.16 writer error (never silently fall through to legacy). Fix the seam comment so it says the assembled writer has no legacy fallback without claiming the route loses its existing fallthrough. Preserve every other route, header, metric, and quarantined-legacy behavior.
- [x] `test.mjs` — extend `createEnvironment` with activation-fixture and injected priors/house data, constructing fixture approvals through the REAL verification functions (`verifyLocalPriors`, `verifyApproval`, corpus readiness) rather than hand-fabricated identities. Add named fixtures for every I/O matrix row, including offline cold-domain end-to-end proof (Evidence→strike→Gate→commit→render, no scan, no `w:` write, no permalink, metric after render), concurrency convergence under realistic multi-second generation latency (no spurious 502 while a competitor's lease is live), resubmission-reads-authority, claim release on writer failure, valid-manifest-plus-missing-port fail-closed, unapproved/drifted corpus or priors disabling the writer, disabled-without-manifest posture, and a valid manifest supplied as a JSON string (the production binding form).
- [x] `scripts/assembly-identity.mjs` (tooling, Node-only OK) + `package.json` — emit/verify the deterministic runtime-assembly identity; compose verification into `npm run check` exactly once. The runtime-neutrality scan must cover side-effect imports (`import "node:fs"`), dynamic imports (`import("node:...")`), `globalThis.process`/`globalThis.Buffer`, the full Node builtin surface (not a nine-module subset), and any `process.*` property; malformed `runtime-assembly.json` must fail verification with a clean error, not a stack trace. Add `scripts/assembly-identity.test.mjs` covering freeze/verify/drift/usage and the BANNED-pattern enforcement, wired into `check`. Commit the frozen `runtime-assembly.json` so a fresh clone passes `check`. Run Worker type generation and Wrangler dry run; both must pass without remote mutation.
- [x] `docs/runtime-baseline.md` — document the `assembly:freeze`/`assembly:verify` commands, the `runtime-assembly.json` contract, the `src/pipeline/` canonical-module convention, and the shim role of `scripts/*.mjs`; note that production wiring of the `PIPELINE_*`/`ACTIVATION_MANIFEST` bindings is deferred to Stories 1.25/1.26.

**Acceptance Criteria:**
- Given the validated contracts, local Evidence, generation adapter, composite Gate, strike orchestrator, receipt handling, and rendering projections, when runtime assembly completes, then their canonical implementations live under `src/pipeline/`, `src/worker.js` and Node verification import the same modules, and no `scripts/` file independently implements a closed production concern.
- Given the assembled module graph, when Worker build and offline verification run, then no canonical module imports Node-only APIs, every dependency enters through an explicit port, and Worker type generation plus Wrangler dry run pass without remote-resource mutation.
- Given 1.16's closed dispatch and an offline local-enabled/domain-disabled activation fixture, when the first valid domain request runs with no prior receipt, then the assembled pipeline builds local Evidence, executes existing strike/Gate contracts, commits under domain request scope, and renders effective local mode with the fixed notice — with no scan/EvidenceProvider call, no global `w:` projection, no permalink, and delivery recorded only after successful rendering.
- Given concurrent cold requests for the same domain, when they contend, then one valid receipt wins, every success resolves the same committed artifact, incompatible winners reject, claims finalize safely on failure, and resubmission reads the authoritative receipt.
- Given no valid production activation manifest, when the assembled Worker is evaluated, then model roles and new writer execution remain disabled, no legacy generator becomes a fallback, and offline fake ports/fixtures create test authority only.
- Given repository verification, when `npm test`, `npm run check`, Worker typegen, Wrangler dry run, and `git diff --check` run, then all pass offline with existing scanner/personalization regression tests intact and the runtime-assembly identity emitted without approval or deployment authority.

## Spec Change Log

### 2026-08-21 — Adjudication ordering, claim safety, approval verification, and scan hardening
- Trigger: Review found the committed artifact was re-based after adjudication (notice injected post-judge and `candidate_ref` re-derived, so provenance binds a value the judge never saw; house Briefs lost their catalog notice and house-metric classification), plus claim-safety and closed-gate gaps the spec left unpinned.
- Amended: Design Notes now fix adjudication ordering (notice bound before Gate/judge; house Briefs keep their catalog notice and the pre-activation posture is conveyed at the projection/presentation layer) and claim-lifecycle rules (claim inside try, release on any failure, honor real `lease_until` waits, distinguish lost-race from transient commit rejection by re-reading authority). Assembly must verify corpus readiness (`approved_semantic_identity`) and priors/house approvals through the existing verification functions before enabling; priors selection fails closed on missing bundle ids; the orchestrator's coordinator dependency is the real status port, not a stub. The seam fails closed (never legacy) when a valid manifest meets a missing/invalid pipeline port. The runtime-neutrality scan and its test coverage are strengthened; `runtime-assembly.json` is committed; docs updated.
- Known-bad state avoided: A green assembly whose committed provenance does not bind the adjudicated artifact, whose concurrency fails real-latency requests, whose enabled-but-misconfigured posture silently resurrects the legacy path, and whose neutrality gate is evadable by ordinary import syntax.
- KEEP: Preserve the `src/pipeline/` module layout and verbatim behavior-preserving moves, the single canonical-hash source, the re-export shim pattern, the explicit port shapes, the broad test matrix style, the redacted activation reason codes, and the deterministic identity emission.

## Review Triage Log

### 2026-08-21 — Review pass (round 1)
- intent_gap: 0
- bad_spec: 1: (high 1, medium 0, low 0)
- patch: 0
- defer: 2
- reject: 6: (high 0, medium 2, low 4)
- addressed_findings:
  - `[high]` `[bad_spec]` Committed artifact re-based after adjudication (notice injected post-judge, `candidate_ref` rebound); triggered loopback with claim-safety, approval-verification, fail-closed posture, and scan-hardening amendments.

### 2026-08-21 — Review pass (round 2)
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 3, medium 3, low 1)
- defer: 2
- reject: 11: (high 0, medium 4, low 7)
- addressed_findings:
  - `[high]` `[patch]` Claim loop: hard deadline guard and consistent injected-clock lease math.
  - `[high]` `[patch]` Commit-rejection catch no longer releases over an authoritatively committed artifact.
  - `[high]` `[patch]` Neutrality/identity scan fails on non-conforming module filenames and bans computed dynamic imports, bracket globals, and eval/Function.
  - `[medium]` `[patch]` House-fallback provenance binds the catalog content hash, not the local evidence ref.
  - `[medium]` `[patch]` Valid-but-out-of-phase manifest fails closed instead of falling through to the legacy scanner.
  - `[medium]` `[patch]` src/worker.js pipeline imports pinned to `./pipeline/` by an import audit.
  - `[low]` `[patch]` Pipeline fixtures cloned per environment; claim deadline-exceeded branch tested.

## Design Notes

- Move, don't rewrite: every canonical module keeps its validated logic; the only logic edits are Node-API excisions (`node:crypto` → contracts SHA-256) and deduplicating `canonicalJson`/`domainHash` to the contracts single source. Behavior-preserving moves are what make "Worker and Node import the same modules" auditable.
- The activation port defaults to disabled in every environment; the test fixture constructs a manifest-shaped value injected via `env`, which cannot exist in production config today — that asymmetry is the safety property, not a gap.
- Adjudication ordering: the fixed pre-activation notice is part of the Brief BEFORE Gate validation and the judge call, so `candidate_ref` binds exactly the adjudicated value. House Briefs keep their catalog notice verbatim (approval identity is untouched); when a house Brief serves on the pre-activation domain path, the fixed notice is conveyed by the presentation/projection layer (e.g. as the envelope-level notice), never by rewriting catalog content — so house-metric classification by catalog notice keeps working.
- Claim lifecycle: take the claim inside the try block so every failure path releases it; while a competitor's lease is live, wait up to the real `lease_until` (with jitter), never a fixed short cap; when commit is rejected, re-read authority to distinguish a lost race (read the winner's receipt) from a transient failure before throwing.

## Verification

**Commands:**
- `npm test` -- expected: all outer route fixtures pass, including the new cold-domain/concurrency/disabled-posture matrix.
- `npm run check` -- expected: full offline gate passes, including assembly-identity verification exactly once.
- `npx wrangler types` and `npx wrangler deploy --dry-run` -- expected: pass without creating or mutating remote resources.
- `git diff --check` -- expected: clean; no protected-file modifications.

## Suggested Review Order

**Canonical module graph**

- The assembled inactive-domain writer: ports, activation gate, claim lifecycle, adjudication ordering.
  [`assembly.mjs:82`](../../src/pipeline/assembly.mjs#L82)
- Closed activation-manifest validator with redacted reason codes (AD-11 shape, JSON-string binding form).
  [`activation.mjs`](../../src/pipeline/activation.mjs)
- Single canonical-hash and canonical-JSON source every other module reuses.
  [`contracts.mjs`](../../src/pipeline/contracts.mjs)

**Worker seam**

- Injected port wins; otherwise the assembled writer; absent manifest means port-absent behavior.
  [`worker.js:2735`](../../src/worker.js#L2735)
- Redacted posture surface (consumer lands with Story 1.25 wiring).
  [`assembly.mjs:339`](../../src/pipeline/assembly.mjs#L339)

**Offline proof**

- Cold domain end-to-end: Evidence→strike→Gate→commit→render, provenance binds the adjudicated candidate.
  [`test.mjs:1863`](../../test.mjs#L1863)
- Concurrency convergence under realistic latency and the claim deadline fail-closed branch.
  [`test.mjs:1929`](../../test.mjs#L1929)

**Identity tooling and shims**

- Freeze/verify the module graph and source hashes with the fail-closed neutrality scan.
  [`assembly-identity.mjs`](../../scripts/assembly-identity.mjs)
- Frozen identity committed so a fresh clone passes `npm run check`.
  [`runtime-assembly.json`](../../runtime-assembly.json)
