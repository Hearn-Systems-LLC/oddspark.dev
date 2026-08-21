# Epic 1 Context: A Coherent Brief From One Button — local mode live in production

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver local-mode (no-domain) generation of gate-passed Opportunity Briefs into production: the legacy LLM-free shell is preserved, a typed generation → gate → judge → commit pipeline replaces its internals behind the existing request boundary, every model role is independently qualified with approval-bound evidence, and release proceeds through four separately authorized events — runtime assembly in repository code, compatibility-reader deployment, inactive-writer deployment, and atomic local-only activation. Domain mode stays inactive throughout; a valid domain request runs the same canonical writer under domain request scope with effective local mode and a fixed notice.

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
- Story 1.16: Request Hardening and Inactive-Domain Dispatch Contract
- Story 1.17: Semantic Regression Suite
- Story 1.18: Semantic Qualification
- Story 1.19: Local Full-Request Qualification
- Story 1.20: Atomic Activation Contract and Release Decision View
- Story 1.21: Local Artifact Retention Lifecycle
- Story 1.22: Honest Pipeline Explanation
- Story 1.23: Worker Runtime Assembly
- Story 1.24: Compatibility Reader Deployment
- Story 1.25: Inactive Writer Deployment
- Story 1.26: Atomic Local-Only Activation

## Requirements & Constraints

- One button, one optional domain field; no new generation inputs, routes, or client state (the `/api/cheer` invitation endpoint and the AD-12 strike/result representations are the only authorized seams). Public launch of local mode additionally requires the served-event ratio `house_briefs_served / briefs_served` strictly below 10% over at least 100 production serve events.
- The Brief is a versioned typed schema (eight elements, `mode`, optional `notice`, `grounded_numbers`); every rendered result passes the composite Gate — local deterministic/policy checks first (fail-closed), then exactly one candidate-bound qualified judge call — or falls back to a curated per-season house Brief that is gate-passing by construction.
- All model spend shares one six-call ledger with a hard per-strike deadline (provisional 15s ceiling). Candidate ceiling is `min(3, floor((6 − E) / 2))` where `E` is frozen evidence calls (local mode: E=0). Only complete generation-judge pairs start; exhaustion or failure serves the house Brief.
- Generation and judge roles qualify independently: structural identity freezes provider, resolved model, parameters, prompt/schema/adapter hashes, runtime, and timeout policy; each configuration needs ≥95% direct-valid plus every verifier predicate for GO; primary/fallback are never pooled. Semantic qualification runs against a predeclared, owner-approved voice rubric and golden/anti-golden corpus. Every live run requires fresh exact approval; none ever runs in CI.
- The pinned Wrangler toolchain, compatibility date, generated bindings, and runtime configuration are frozen before qualification; later changes invalidate dependent evidence transitively.
- Privacy: no PII, cookies, sessions, or off-site research enters generation or output; analytics are server-side aggregate counters only (COORD-owned, atomic; 400/404/502 responses enter no served counter).
- Local artifacts (receipts and projections) expire exactly 30 days after commit, non-sliding; pre-existing record families (profile 24h, abuse slots 1h, neuron receipts 2d, aggregate reports 90d) keep their explicit lifecycles.

## Technical Decisions

- **Four separate authorities, in order:** (1) runtime assembly in repository code (Story 1.23), (2) compatibility-reader deployment (1.24), (3) inactive-writer deployment (1.25), (4) atomic local-only activation via whole-manifest replacement (1.26). Code, deployment, and activation never share approval; rollback restores the prior artifact/posture without data change.
- **One canonical pipeline source (AD-13):** production pipeline implementations live as runtime-neutral ES modules under `src/pipeline/`; `src/worker.js` and Node verification import the same modules. Nothing under `scripts/` may implement a second writer or reimplement a closed validator, hash, ledger transition, receipt rule, or projection. Assembly carries no deployment or activation authority.
- **Transport-envelope decoding is adapter-only:** the generation adapter decodes exactly one complete JSON value from the frozen single response location and passes it unchanged to the closed Candidate classifier — no repair, coercion, prose/fence extraction, alternate locations, or schema weakening. The judge adapter maps wrapper metadata losslessly to the canonical verdict.
- **Zero-call recovery boundary:** a completed, marker-bound, independently verified preflight stop with zero calls and zero durable call-start accounting is retained but consumes no qualification allowance; it can only restore allowance, never emit a manifest or ref. Source drift may stale it for qualification without changing the proven zero-call fact.
- **Commit:** COORD is authoritative for claim/read/commit; `w:`/`pw:` KV projections are best-effort. Concurrent strikes converge on one immutable receipt. Request scope owns claim/cache identity and permalink eligibility; effective mode owns rendering. The compatibility reader deploys before any new writer and fails closed on unsupported versions.
- **Strike transport (AD-12):** one outcome, two representations — explicit `Accept: application/json` wins; otherwise HTML. Local-scope HTML success returns `303 /s/:id` (redirect counts nothing; the followed GET increments once); domain-scope success returns direct `200` HTML at `/api/spark` with no permalink. All dynamic responses are `Cache-Control: no-store`; `Vary` retains `Origin` and adds `Accept` and `Content-Type`. `400`/`502`/`404` increment no served metric.
- **Inactive-domain dispatch:** Story 1.16 derives one closed dispatch value (domain request scope, effective local mode, normalized claim identity, fixed notice identity, scan/evidence-provider/permalink all prohibited) and performs no writer/coordinator/metric operation; the route invokes an injected writer port exactly once and never constructs a Brief.
- **Activation:** the sole activation input is one closed canonical `ProductionActivationManifest` with whole-value atomic replacement; missing/invalid manifest disables model roles and claim copy while the committed/approved-house path stays available when safe. The release-decision view derives gate status on demand and creates no authority or persistence.
- **Branch/deploy posture (post-incident):** Workers Builds auto-deploys its configured production branch; production branch is now `develop`, story work merges to `develop` only, and Justin owns `develop` → `main`. Story 1.24's deployment preflight must verify the Workers Builds trigger configuration before any deployment approval is exercised. Any branch that auto-deploys production must never carry code past the approved release sequence.

## UX & Interaction Patterns

- The governing UX Decision Record's closed delta table (D1, D1a, D2, D2a, D3–D24) is the only authorized shell change set; AD-12 owns its transport subset. Anything else requires architecture reconciliation.
- Strike becomes a native `<form method="post" action="/api/spark">` with progressive enhancement; enhanced local strikes may `history.replaceState` to `/s/:id` with no extra request, generation, or metric.
- Eight-element result-card hierarchy replaces the card interior; server-rendered permalinks work without JS; domain-scope results never mint permalinks and omit the share affordance entirely.
- Three distinct fixed notice strings (scan downgrade, pre-activation, house Brief) plus the retention disclosure adjacent to element 8. Default strike note is exactly "One idea, seeded by the sun and a randomness beacon." — claiming copy ("Same window, same spark.") and the claiming formula-panel string render only when a current `receipt_claim_ref` authorizes them (not in this epic).
- 400/502/404 render inside the governed shell; accessibility baseline: one `role="status"` region, no `role="alert"`, exactly one focus move per settle, and no scripted focus on fresh full-document responses. `/how` is rewritten to explain the real pipeline (Evidence, Generate, Gate, Judge, Commit, house fallback, privacy, call cap, non-determinism) with accessible Mermaid fallbacks and no premature reproducibility claims.

## Cross-Story Dependencies

- Phase flow: Foundations (1.1–1.10) → Qualification (1.11–1.19) → Release (1.20–1.26). Owner-gated content (1.5, 1.6, 1.8 — Justin approves exact versions and hashes) gates qualification and activation.
- Qualification chain: 1.4 (judge structural GO) and 1.11 (generation structural GO) → 1.17–1.18 (semantic) → 1.19 (local full-request) → 1.20 activation contract. Stories 1.12–1.13 remain blocked until current generation and judge structural refs exist.
- Release tail is strict: 1.23 → 1.24 → 1.25 → 1.26, each with separate explicit approval. Downstream epics (2.9, 3.1, 3.2, 4.4) depend on 1.26, not 1.25.
- 2026-08-20 incident: production deployed the Story 1.14/1.15 committed_brief reader requirement ahead of the approved sequence while the writer still produced legacy Spark artifacts, returning 502 on every Strike. Interim mitigation was a separately approved redeploy of the pre-1.14 Worker artifact (restored; production verified 200). Recovery ran through Story 1.16 and Story 1.23 as the incident-recovery critical path — both are now merged and code-complete (PRs #10, #11). The release-tail order (1.23 assembly, 1.24 reader deployment, 1.25 inactive writer, 1.26 activation) is unchanged.
- 2026-08-21 addendum: the Workers Builds integration auto-deploys the configured production branch; the PR #11 merge re-broke production until the approved rollback artifact was redeployed. Gitflow adopted (develop-only story merges; Justin owns develop → main); Story 1.24 preflight must verify the trigger configuration.
- Epics 2–5 (domain mode, activation of claim copy, invitations) are out of scope here; domain evidence provider, receiver activation, and receipt-claim activation are later, separately approved events.
