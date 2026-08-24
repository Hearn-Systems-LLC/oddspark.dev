---
title: 'Story 1.18: Semantic Qualification'
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings:
  - oversized
deferred: []
baseline_revision: 'e0d21d26c43f842d15f5f5755d39b3f73e470d0a'
---

<intent-contract>

## Intent

**Problem:** Production lacks approved live semantic evidence proving that the structurally qualified generation primary and both qualified judge legs satisfy the frozen voice corpus, every semantic threshold, and the inherited closed integrity oracle.

**Approach:** Add a separate, approval-bound semantic qualification family that reuses Story 1.17's immutable frozen Candidate projections without any new generation call, executes the 19 judge-required catalog entries once for each qualified judge leg in catalog order, binds exact structural identities, and emits a SEMANTIC ref only after total offline verification.

## Boundaries & Constraints

**Always:** Bind the approved corpus/catalog identities, sole generation-primary qualification, both judge qualifications, complete configuration/source/runtime/request hashes, predeclared thresholds, and all 18 ordered Story 1.3 predicates. Freeze exactly 38 judge calls: the 19 judge-required projections once through judge-primary, then once through judge-fallback, in catalog order. Validate a freshly generated exact plan and matching approval before any call; publish evidence atomically; retain consumed incomplete runs; report judge legs separately with no pooling or replacement.

**Block If:** The generated live plan does not bind the exact 38-call request set, exact qualified identities, sequential schedule, 120-second per-call timeout, zero retries/replacements/substitutions, exact conservative maximum cost, one-hour approval window, immutable evidence retention, provider data-use disclosure, and the closed SEMANTIC manifest/ref schema; or the owner has not approved that exact generated plan. Also block if authority requests a generation call or fallback, result-driven threshold changes, substitute models, or additional diagnostics.

**Never:** Modify the approved voice corpus, regression catalog/harness, canonical Candidate/Judge/Gate contracts, structural qualification artifacts, or completed specs; make a generation call; retry a judge call; call providers from CI; deploy or activate; repair provider output; pool results; treat the deterministic house Brief as a model configuration; infer live approval from this spec or a general request to continue project work.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Approved exact run | Fresh matching approval, frozen plan, current structural/corpus identities | Execute exactly the frozen schedule and atomically retain separate judge-leg evidence | No substitutions or extra calls |
| Offline plan | Current frozen projections and qualified refs | Canonical plan/template disclose 24 fixtures, 19 calls per leg, 38 total, request hashes, one-hour window, and exact conservative cost | Any unpriceable or oversized request blocks with zero calls |
| Missing, stale, or mismatched authority | Approval, plan, identity, runtime, source, or request hash differs | Zero calls and no SEMANTIC ref | Emit a sanitized zero-call refusal receipt |
| Partial or failed run | Any authorized call started but run cannot complete | Preserve consumed incomplete evidence with no qualification ref | Never retry beyond the frozen plan |
| Verified result | Both independent reports meet every threshold and all inherited predicates | Emit canonical SEMANTIC manifest/ref | Any failure blocks activation without weakening policy |

</intent-contract>

## Code Map

- `semantic/regression/v1/catalog.json` — immutable 24-fixture catalog and semantic identity; read-only.
- `scripts/semantic-regression.mjs:36-429` — reuse catalog validation, corpus projection, canonical Gate execution, and deterministic report encoding; keep live capability separate.
- `scripts/semantic-regression.test.mjs:38-190` — frozen coverage, 19 judge calls per offline slot, separation, drift refusal, and no-live boundary.
- `semantic/voice/v1/{rubric,goldens,anti-goldens,approval}.json` — approved thresholds and corpus identity; read-only.
- `spikes/judge-fidelity/qualification.mjs:171-616` — model for plan/approval/ref derivation, bundle construction, and total verification; do not alter pinned results.
- `spikes/judge-fidelity/contract.mjs:142-154` and `evidence-v2.mjs:212-375` — exact ordered 18-predicate oracle and verification implementation.
- `spikes/generation-qualification/qualification.mjs:5-79` and `run.mjs:17-62` — model for approval, atomic publication, zero-call refusal, and incomplete-run retention.
- `spikes/**/results/**` — authoritative structural refs: generation primary only; judge primary and fallback; read-only.
- `spikes/generation-qualification/results/story-1-11-2026-08-22-l9-406d10ea-8629-4a24-ab8f-8873b0332e96.qualification.json` — generation primary `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, config ref `34731e26b1c1ef79acd444ba8e775143d9a616c3ab915f52481bd81475796bfc`, sole-role ref `5cf5a547b29d31304af686c610da9c4c5959299faf12d434db28493de92404b1`; read-only.
- `spikes/judge-fidelity/results/2026-08-23-a0ed5363-01e3976da21ab40e-620e2f14-8f42-47a2-8f83-854c41f017e6-qualification.json` — qualified judge primary/fallback refs `648dcdb86c12b6169f6ae47ec7c0479977fd5ccbf8f651e39cad0c2589d85c2a` and `3b9f521048b3c6c8bc5b9cda3cc65b090066cbd28e0c845e574fa7c38648abdc`, role ref `4c70414b247316618f0a219eeecf1aa408d029af931abc45c15a65fda15b5d6a`; read-only.
- `spikes/semantic-qualification/` — new isolated plan, approval, runner, evidence, qualification, tests, and verifier surface once intent is frozen.
- `package.json`, `src/worker.js`, `wrangler*.toml`, `sprint-status.yaml`, and `deferred-work.md` — protected/read-only.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/semantic-qualification/qualification.mjs` — implement total closed validators and canonical hashes for plan, approval, two leg reports, SEMANTIC manifest, and domain-separated SEMANTIC ref; emit a ref only for two independent passing legs and all 18 inherited ordered predicates.
- [x] `spikes/semantic-qualification/run.mjs` — project the immutable catalog, build exact requests, compute the conservative current-price maximum, write canonical plan/approval template offline, and expose an interactive-only single-spend live path with zero-call refusal and consumed-incomplete terminalization.
- [x] `spikes/semantic-qualification/worker.mjs`, `start-adapter.mjs`, and `wrangler.toml` — add an isolated remote-AI-only loopback adapter whose lifetime and request access are bound to one unexpired, unconsumed approval; do not add production bindings.
- [x] `spikes/semantic-qualification/test.mjs` — adversarially prove exact 24/19/38 cardinality, leg-major/catalog ordering, qualified identity binding, one-hour exclusive expiry, zero retry, single spend, drift refusal, crash-visible publication, request/cost arithmetic, leg separation, total validation, and zero network access from offline commands.
- [x] `spikes/semantic-qualification/verify.mjs` — independently rederive request/result hashes, exact frozen expectations and thresholds, all 18 inherited predicates, per-leg reports, manifest bytes, and SEMANTIC ref from retained evidence.
- [x] `spikes/semantic-qualification/README.md` and `package.json` — document and expose offline plan/test/verify plus the exact operator-only live sequence; disclose Cloudflare data use, current 70B price and conservative 8B price substitution without claiming an observed 8B rate. `package.json` remains byte-identical because it is protected and part of the qualified judge source identity; direct Node commands are exposed in the README.
- [x] `spec-1-18-semantic-qualification.md` — retain exact plan identity/cost and later run outcome; no live step is permitted until Justin separately approves the generated disclosure.

**Acceptance Criteria:**
- Given the owner-frozen plan and fresh exact approval, when qualification runs, then only the authorized calls execute in the declared order and both judge legs remain separate against the same qualified generation primary.
- Given missing, stale, contradictory, incomplete, or drifted authority/evidence, when validation or verification runs, then no SEMANTIC ref is emitted and activation remains blocked.
- Given complete evidence, when the offline verifier derives SEMANTIC, then every frozen gate/tone/claims threshold and all 18 inherited predicates pass with complete hashes and deterministic bytes.
- Given any arbitrary or mutated plan, approval, evidence, or manifest JSON, when a public validator or verifier runs, then it returns a structured invalid result without throwing and emits no SEMANTIC ref.

## Spec Change Log

- 2026-08-23 — Planning halted on unresolved spend and evidence authority: live schedule/cardinality, Candidate source, retry/cost policy, and SEMANTIC schema are not defined by authoritative artifacts; primary-only generation topology must be reconciled explicitly.
- 2026-08-24 — Justin approved frozen Story 1.17 Candidate projections, independent qualified judge legs, no generation calls, and no retries or substitutions. The harness will generate the exact 38-call request/cost disclosure for separate live approval before execution.
- 2026-08-24 — The separately approved exact live run consumed all 38 judge calls once and terminated `semantic_not_qualified`. A publication-order defect discarded the in-memory raw responses before retention; no fixture or leg result can be reconstructed, no SEMANTIC ref exists, and no retry is authorized. The harness now publishes raw evidence and both reports before any terminal GO/NO-GO decision and supports an append-only loss attestation containing only observed facts.

## Review Triage Log

### 2026-08-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 10, medium 2, low 0)
- defer: 0
- reject: 8: (high 0, medium 1, low 7)
- addressed_findings:
  - `[high]` `[patch]` Validate the exact plan and approval at the provider-facing launcher, refuse CI, and pin the local Wrangler executable.
  - `[high]` `[patch]` Bind every canonical sequence to its frozen body, hash, model, settings, and qualified leg before provider invocation.
  - `[high]` `[patch]` Make approval/run consumption and per-sequence reservation durable, atomic, collision-resistant, and restart-safe.
  - `[high]` `[patch]` Revalidate the exclusive approval window immediately before every call and abort then await timed-out work without retry.
  - `[high]` `[patch]` Add an explicit interactive-only live CLI while preserving the offline and CI zero-call boundaries.
  - `[high]` `[patch]` Atomically publish sanitized zero-call, consumed-incomplete, and complete evidence without overwriting retained run identities.
  - `[high]` `[patch]` Independently replay all 24 outcomes per leg through the frozen Gate and derive the 18 inherited predicates from retained responses.
  - `[high]` `[patch]` Close and cross-bind nested plan, approval, evidence, report, manifest, identity, timestamp, and pricing schemas.
  - `[high]` `[patch]` Make the public verifier rederive reports, predicates, manifest bytes, and SEMANTIC ref instead of trusting supplied pass claims.
  - `[high]` `[patch]` Add a complete 38-response offline success vector plus authority, drift, collision, concurrency, failure, and mutation coverage.
  - `[medium]` `[patch]` Include every provider-authority and verification executable in the approved source identity.
  - `[medium]` `[patch]` Use a documented conservative billable-token bound including framing instead of labeling raw request bytes as exact tokens.

## Design Notes

Generation has one qualified primary and no model fallback. The two independent semantic configurations are therefore the qualified judge-primary and judge-fallback legs, each evaluating the same authorized Candidate population under the sole generation-primary identity. The deterministic house Brief is operational fallback, not a semantic trial.

The immutable catalog has 24 ordered projections: 19 require a judge and five are deterministic local failures. The live schedule calls only those same 19 judge-required entries per leg while retaining all 24 outcomes in each report. Primary completes before fallback starts. A failed/invalid/timed-out call is retained as that fixture's terminal result; it is never retried.

`SEMANTIC/v1` is canonical JSON with exact fields for outcome; provider; corpus version/semantic/catalog identities; generation config/role/cycle refs; judge role/cycle plus two ordered leg model/struct/report refs; execution source/count/order/timeouts/retry policy; rubric and corpus hashes; plan/approval/runtime/source/request/oracle/predicate bindings; evidence bundle/report hashes and immutable retention; and pricing basis/maximum. Its ref is `sha256("ODDSPARK:SEMANTIC:v1\n" + canonical_json(manifest))`, with no self-ref field. Current Cloudflare documentation says customer content is not used for model training or service improvement without explicit consent; the plan must bind that disclosure and must not imply a provider-side deletion period that is not documented.

## Verification

**Commands:**
- `node --test spikes/semantic-qualification/test.mjs` -- expected: the offline authority, execution, publication, and verifier matrix passes without provider calls.
- `node --test scripts/semantic-regression.test.mjs` -- expected: frozen offline suite passes unchanged.
- `npm run semantic:voice:verify` -- expected: approved corpus identity remains valid.
- `node .github/check-ci.mjs` and `npm run check` -- expected: full offline gate passes with no provider call.
- `git diff --check` -- expected: no whitespace errors or protected-file modifications.

## Auto Run Result

Status: done; the approved live qualification terminated NO-GO with no SEMANTIC ref and no retry authority.
Owner decision: use the immutable Story 1.17 projections; execute the 19 judge-required entries independently through each qualified judge leg, primary leg first and catalog order within each leg; make no generation calls, retries, replacements, substitutions, or additional diagnostics. Justin separately approved the exact generated plan identity, request identities, expiry, and conservative maximum cost before execution.

The first consumed cycle remains a terminal evidence gap exactly as recorded above. A separately approved second cycle retained all 38 responses: run ID `semantic-e2680787-efb5-4f18-81ff-bc3fd95f31eb`, plan ref `5dfd3b7a7915db3554c9f7f234a528edfd1ec3292487d1ec059a9a516859b89e`, request-set ref `6bc8377184c464861cf9e39d2ca97810f5a9ddf0830f257db51920e4f3b9934c`, and approved conservative maximum `$0.38664392`. Offline reanalysis fixed the envelope/Gate seam without provider activity and retained a new append-only `reanalysis-v1` artifact. Original evidence SHA-256 is `d28f0da7b1a1ffa72dc08b3c75b80653c3cb783873c0915db86bed06b72c83ba`; reanalysis code identity is `e3b44158e3df2f9ee2efa78fbbf92d5bc4614a2b59bba3f1b2f313424f9b82a8`.

Second-cycle terminal outcome remains `semantic_not_qualified`: primary mismatched 13 fixtures (`anti-consultant-speak`, `anti-unsupported-claims`, `anti-weak-preservation`, `anti-capability-duplication`, `anti-poor-scope`, `anti-invitation-pressure`, five contradiction fixtures, and both contract fixtures); fallback mismatched 13 fixtures (`golden-local-after-hours-callback-card`, five anti-goldens other than capability duplication, gate-2/gate-4/gate-9/tone contradictions, and both contract fixtures). The append-only artifact retains each exact code and gate/tone/claims decision. Fallback `anti-invitation-pressure` had no valid candidate-bound nested result and remained `judge_provider_failed`; all other retained provider envelopes replayed through the canonical Gate. No SEMANTIC ref exists and no retry is authorized.

Implemented files:
- `spikes/semantic-qualification/qualification.mjs` — total closed authority, report, manifest, and SEMANTIC derivation.
- `spikes/semantic-qualification/run.mjs` and `evidence.mjs` — exact offline planning, interactive-only execution, single-spend state, and immutable publication.
- `spikes/semantic-qualification/worker.mjs`, `start-adapter.mjs`, and `wrangler.toml` — isolated request-bound remote-AI adapter.
- `spikes/semantic-qualification/verify.mjs` — independent retained-evidence verifier.
- `spikes/semantic-qualification/test.mjs` — adversarial and complete offline success matrix.
- `spikes/semantic-qualification/README.md` and `plans/*` — operator contract, exact plan, and blank approval template.

Review outcome: 12 accepted findings were patched (high 10, medium 2, low 0); no item was deferred. Follow-up review is recommended because high-severity authority and verifier repairs were required; weighted score 56.

Verification:
- `node --test spikes/semantic-qualification/test.mjs` — PASS; includes envelope precedence/ambiguity, candidate binding, immutable terminal publication, and reanalysis checks.
- `node --test scripts/semantic-regression.test.mjs` — PASS, 10/10.
- `npm run semantic:voice:verify` — PASS; approved identity unchanged.
- `CI=1 node .github/check-ci.mjs` — PASS, including the controlled Chrome matrix.
- Exact plan rederivation and `git diff --check` — PASS.
- `npm run check` retains the governed DW-6 judge self-test residual: the immutable completed-spend receipt is absent from its frozen owner-review list. Governed CI intentionally skips that evidence-pinned assertion; this story does not weaken it.

Residual risk: no live semantic evidence or SEMANTIC ref exists until Justin approves and the operator executes this exact plan within its one-hour window. Any source, runtime, request, identity, pricing, or approval drift requires a new plan and approval rather than recovery or substitution.
