# Epic 1 Context: A Coherent Brief From One Button — local mode live in production

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A press of the one button with no domain produces, in production, a committed, gate-passed local Brief (or an approved house Brief) grounded in Port Huron / Blue Water Area context. Generation and judging are independently qualified, all model spend runs under one six-call ledger and route-entry deadline, results are committed authoritatively before rendering, and the whole path goes live behind one atomic local-only activation. This is the foundation every later epic (domain mode, production proof, handoff, retirement) builds on.

## Stories

- Story 1.1: Shell Safety Net
- Story 1.2: Toolchain and Isolated Runtime Baseline
- Story 1.3: Judge Recovery Contract and Offline Verifier
- Story 1.4: Judge Structural Recovery Matrix
- Story 1.5: Voice Rubric and Golden Briefs
- Story 1.6: Local Priors Content
- Story 1.7: Brief, Attempt, and Grounding Contracts
- Story 1.8: Versioned House Brief Catalog
- Story 1.9: Local Evidence Assembly
- Story 1.10: Generation Contract and Offline Adapter
- Story 1.11: Generation Structural Qualification
- Story 1.12: Composite Gate and Qualified Judge Integration
- Story 1.13: Strike Orchestrator and House Fallbacks
- Story 1.14: Authoritative Commit and Compatibility Reader
- Story 1.15: Committed Brief Rendering
- Story 1.16: Request Hardening and Domain Downgrade Seam
- Story 1.17: Semantic Regression Suite
- Story 1.18: Semantic Qualification
- Story 1.19: Local Full-Request Qualification
- Story 1.20: Atomic Activation Contract and Release Decision View
- Story 1.21: Local Artifact Retention Lifecycle
- Story 1.22: Honest Pipeline Explanation
- Story 1.23: Compatibility Reader Deployment
- Story 1.24: Inactive Writer Deployment
- Story 1.25: Atomic Local-Only Activation

## Requirements & Constraints

- Local Briefs must be coherent with local context, current date/time, seasonality, and the delivery-envelope capability bundle; no legacy random-axis vocabulary in output.
- Every rendered Brief passes the Composite Gate: deterministic schema/grounding/privacy/number-provenance checks first, then exactly one candidate-bound semantic judge call covering 9 coherence gates, tone, and claims. Anything malformed, unbound, repaired, ambiguous, or unqualified fails closed; rejected candidates leave no visible trace.
- Bounded regeneration: one six-call ledger per strike, only complete generation+judge pairs start, at most 3 candidates in local mode; invoked failures/timeouts consume their call; exhaustion or insufficient deadline serves a gate-passing house Brief.
- Rendering is contract-complete: all 8 result-card elements in order, confident-plan voice; no numeric ROI/percentages or pricing in local mode; CTA references the specific Spark and allows "not worth changing."
- Interaction is preserved: one button, one optional domain field, same action for both modes.
- Cache-first verifiability: same window + same inputs resolve the identical versioned Brief from the authoritative coordinator receipt; KV entries are read projections only.
- Performance: strike completes within the strike wall-clock budget or degrades to house Brief. Security: existing worker input guards (4KB body, 2048-char URL, redirect caps, public hosts only) stay in force. Cost: no more than 6 model calls per strike; Workers AI meter stays best-effort/fail-open. Reliability: model/qualification/budget failure degrades to a committed or house Brief while the coordinator is reachable; coordinator uncertainty returns 502 and never renders uncommitted output.
- Owner deliverables gate the pipeline: voice rubric + at least 3 golden Briefs per mode, local priors content, and a curated integer-versioned house Brief catalog.

## Technical Decisions

- **Toolchain/runtime pinning (Story 1.2, gates all live evidence).** Pin an exact Wrangler version (lockfile currently `^4.114.0`; a newer release exists and must be reviewed, not silently adopted). Review release notes and compatibility-date behavior; the target compatibility date is 2026-07-01 (`global_fetch_strictly_public`). Move `preview_urls` to its supported placement — it currently sits under `[observability]`, which is wrong. Regenerate bindings/types, and require config validation plus a dry run that deploys, uploads, creates, or mutates nothing remote. Freeze the resulting runtime identity; every later structural qualification manifest embeds it, and any later change to Wrangler version, compat date, bindings, or runtime config transitively invalidates structural, semantic, full-request, production, launch, and activation evidence.
- **Offline-first isolation.** Offline development and CI expose no callable production AI binding. The only approval-bound remote-AI path is a separately invoked live-spike config, and it must never bind production KV, DO, routes, assets, or persistent Worker names. Live metered runs never run in CI and each requires fresh approval of exact configuration, call cap, cost, and retained fields; approval permits the run, not the outcome.
- **Independent role qualification.** Generation and judge use separate role configurations even on the same model. A structural identity freezes provider, resolved model, request parameters, prompt/wire-schema/adapter hashes, binding version, runtime, and timeout policy into a closed hash-bound qualification manifest; semantic identity versions rubric and golden/anti-golden corpus. Rates never pool; fallbacks never stand in for failed primaries. Story 1.4 (judge) and 1.11 (generation) are independent structural gates; 1.18 semantic; 1.19 full-pair latency/cost. A structurally valid NO-GO is retained immutable evidence and blocks dependents. The legacy judge v1 NO-GO evidence is preserved; at most one separately approved recovery matrix is permitted, and a second NO-GO triggers MVP review.
- **Pipeline shape.** Pipes-and-filters stages, single-pass, no stage calls another; the strike orchestrator alone owns the retry loop and reserves generation+judge slot pairs atomically (unused judge reservation released on local rejection; invoked calls stay consumed). Immutable staged ports: closed EvidenceContext → Candidate → GroundingReport → complete AttemptContext to the judge. Judge output is a candidate-bound outer result wrapping a closed canonical `{pass, gates[9], tone, claims}` verdict, adapted losslessly, fail-safe `pass:false`.
- **Data contracts.** Brief is a typed JSON schema (integer version, mode, 8 elements, notice, grounded_numbers) and the only renderer input. Committed artifacts use a versioned closed envelope; rollout is reader-first (compatibility reader deployed before inactive writer before atomic activation), and rollback only to a compatibility reader that rejects or losslessly shims new versions. Coordinator DO owns claim/read/commit receipts and atomic aggregate metrics; KV `w:`/`pw:`/`m:` are projections; missing/stale pins consult the coordinator before generating.
- **Transport.** One outcome, two representations: explicit JSON Accept wins; HTML-capable/browser-form requests get shell HTML; deterministic Content-Type, `Vary: Origin, Accept, Content-Type`, `Cache-Control: no-store`. Failure precedence: invalid input 400 → scan insufficiency downgrade → candidate/model failure retry then house → coordinator uncertainty 502; served metrics increment only after authoritative receipt resolution.
- **Conventions.** Single-file `src/worker.js` with banner sections per stage; constants hoisted; model IDs as wrangler vars; KV prefix namespacing preserved; pipeline stages and schema stay Node-importable pure functions; the pipeline replaces only the internals behind existing generate call sites and never calls back into router/page/render.

## UX & Interaction Patterns

The UX Decision Record (UX-DR1–UX-DR6) governs visitor-facing changes; DESIGN.md/EXPERIENCE.md are guidance only. Relevant here: eight-element result-card hierarchy, accessibility baseline (keyboard/focus, screen-reader semantics, contrast), loading/deadline behavior with retry suppression (enhanced paths move focus; fresh full-document responses set no scripted focus), the state-and-copy matrix (house Brief, negotiated 400/502, shared 404 shell, unsupported version), responsive/preservation criteria for the existing shell, and the invitation in plain-link posture only (POST/303 activation belongs to Epic 4). The /how page and mermaid rewrite need accessible diagram metadata and fallback text.

## Cross-Story Dependencies

- 1.1 is the verified baseline; 1.2 (toolchain/runtime freeze) gates every live-evidence story (1.4, 1.11, 1.18, 1.19) and every deployment (1.23–1.25).
- 1.3 depends on 1.1 plus the immutable v1 judge NO-GO evidence; 1.4 needs 1.2–1.3 and live approval; 1.12 needs 1.4 GO.
- Owner content (1.5, 1.6) has no code predecessor but feeds 1.8, 1.9, 1.12, 1.17.
- 1.7 contracts underpin 1.8–1.16; 1.13 orchestrator needs 1.7–1.12; 1.14 commit path is required before 1.19 live full-request evidence and 1.15 rendering.
- Release chain: 1.20 → 1.23 (reader) → 1.24 (inactive writer) → 1.25 (activation), each under separate approval. After 1.25, Epic 3 local proof and Epic 2 domain path proceed independently; domain requests during local-only production follow 1.16's downgrade seam.
- Any runtime-bound toolchain change after 1.2 invalidates downstream evidence and forces reruns before activation.
