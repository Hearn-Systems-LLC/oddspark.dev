# Epic 1 Context: A Coherent Brief From One Button — local mode live in production

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver local-mode generation in production so a press without a domain returns a committed, gate-passed Opportunity Brief or an approved house Brief, through independently qualified generation and judging, behind one atomic local-only activation. The active Candidate path is intentionally direct (superseding an earlier three-specialist/twelve-call design): generate one Candidate, run deterministic checks, and — only on a deterministic pass — invoke one lightweight quality judge exactly once. Cached/saved Sparks and house fallbacks are never (re-)judged.

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
- Story 1.18: Semantic Qualification (retained failed broad-judge history)
- Story 1.18.1: Judge Semantic Discrimination Recovery (retained failed prompt-only history)
- Story 1.18.2: Direct Quality Gate Simplification
- Story 1.19: Local Full-Request Qualification (rescoped to the direct path)
- Story 1.20: Atomic Activation Contract and Release Decision View
- Story 1.21: Local Artifact Retention Lifecycle
- Story 1.22: Honest Pipeline Explanation
- Story 1.23: Worker Runtime Assembly
- Story 1.24: Compatibility Reader Deployment
- Story 1.25: Inactive Writer Deployment
- Story 1.26: Atomic Local-Only Activation

## Requirements & Constraints

- Ground local Candidates in local context, date, seasonality, business situation, and the capability bundle; exclude legacy random-axis vocabulary.
- Gate order is fixed: deterministic schema, mode/Breadcrumb, grounding, PII, personal-name, and number-provenance checks run first; any fail or unknown rejects before any judge call. Only a deterministic survivor reaches exactly one candidate-bound quality-judge call; judge pass/reject/unknown/malformed/timeout/provider-failure all reject without retry on anything but pass.
- Bounded attempts with a hard route-entry deadline; the orchestrator owns all retries. On exhaustion, insufficient deadline, or grounding/infra failure that invalidates a Candidate, serve the pre-vetted, gate-passing-by-construction house Brief — never judged again.
- Render the closed, versioned eight-element Brief. Local output has no numeric ROI, percentages, savings, or pricing; effects are concrete and invitations are Spark-specific, pressure-free, and permit deciding against change.
- Qualify generation and judge independently without pooling primary/fallback evidence. Structural and full-request evidence are separate; live metered runs require fresh exact-run approval and never run in CI. There is no semantic qualification ref in the active design — three separately approved semantic runs terminated NO-GO, and further semantic-ref pursuit is not authorized.
- Preserve one button and one optional domain field. Before domain activation, domain requests stay domain-scoped but render effective local mode with a fixed notice; scanning, EvidenceProvider use, global local projections, and permalinks are prohibited.
- COORD authoritatively claims, reads, commits, and counts served outcomes; KV is projection-only. Concurrent requests converge on one receipt, uncertainty returns 502 without rendering, and local artifacts expire non-sliding after 30 days.

## Technical Decisions

- Use immutable, single-pass Evidence, Generate, Gate (deterministic + one judge call), Commit, and Render stages; only the strike orchestrator retries. `Evidence` never calls `Gate`; `Render` never sees free model text.
- Keep one runtime-neutral pipeline under `src/pipeline/`, shared by Worker and Node verification, with infrastructure supplied through explicit ports.
- Use versioned canonical hashes (`candidate_ref`, `evidence_ref`, etc.). Adapters decode one complete value from the frozen location without extraction, repair, coercion, invention, or omission; reference mismatch rejects.
- The generation role is qualified primary-only from the approved Story 1.11 sole-member role set; the fallback leg remains unwired, and generation exhaustion or failure uses the house Brief path. The existing broad `CanonicalVerdict` contract is retained as the single lightweight judge port.
- `ProductionActivationManifest` v2 (hash domain `oddspark-production-activation/v2`) binds exactly four proof kinds: generation structural ref, judge structural ref, house catalog ref, and per-mode full-request ref — plus separately governed nullable receiver/receipt-claim refs. There is no `semantic_ref`; a v1 manifest cannot validate.
- COORD receipts hold a closed, versioned `CommittedBrief`; readers accept supported versions or an explicit lossless shim. Request scope owns cache and permalink eligibility; effective mode owns presentation.
- Explicit JSON acceptance wins representation selection; browser forms and HTML-capable requests receive shell HTML. Dynamic responses are non-cacheable; 400 and 502 outcomes are not served events.
- Activation atomically replaces one canonical manifest. Invalid or stale refs disable model roles. Assembly, reader deployment, inactive-writer deployment, and activation retain separate authority and rollback.
- Cloudflare Workers Builds auto-deploys its configured production branch, currently `develop`. Story work merges only to `develop`, Justin owns `develop` to `main`, and deployment preflight must verify the live build trigger before approval.

## UX & Interaction Patterns

- Preserve the shell, breakpoints, one-button flow, and optional website field; the governed UX delta set is closed.
- Keep all eight elements ordered across representations. Domain-scoped results never get public permalinks.
- Suppress duplicate retries and use one status region. Enhanced results move focus once; full-document HTML does not. Errors and fallbacks remain inside the shell.
- Notices disclose causes without exposing rejected ideas or retry detail. Avoid reproducibility claims before production proof. `/how` explains the pipeline, privacy, call cap, fallback, and non-determinism accessibly, and must not overstate what the direct single-judge design guarantees.

## Cross-Story Dependencies

Frozen contracts (1.3–1.10) precede generation structural qualification (1.11) and the composite Gate/judge integration (1.12). Story 1.18.2 replaced the specialist-waterfall design in 1.12/1.13 with the direct deterministic-plus-one-judge path and removed the three-specialist/twelve-call machinery from active code. Stories 1.18 and 1.18.1 remain retained NO-GO history only — they are not active runtime or activation authority. Story 1.19 (rescoped by sprint-change-proposal-2026-08-24-4) measures the direct path end-to-end using current generation and judge structural refs, the house catalog ref, and an owner-approved route ceiling, and is a dependency of Stories 1.20 and 1.26's activation manifest. Release order is runtime assembly (1.23), compatibility reader deployment (1.24), inactive writer deployment (1.25), then separately authorized atomic local-only activation (1.26). Domain activation, production proof, receipt claims, receiver handoff, and legacy retirement remain later epics' authority.
