# Epic 1 Context: A Coherent Brief From One Button — local mode live in production

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Replace the legacy random-axis generator with a coherence-gated local Opportunity Brief pipeline and safely activate it in production without changing the one-button interaction. A successful strike produces an authoritative, accessible, contract-complete local Brief grounded in approved regional priors; bounded failures resolve to an approved house Brief, while infrastructure uncertainty fails closed.

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

- Preserve the existing shell, security guards, one Strike button, and one optional domain field. Offline development and CI must have no callable production AI binding or remote activity.
- Local Evidence is deterministic, immutable, and built from owner-approved Port Huron/Blue Water Area seasonal priors. It makes no submitted-business or person assertions and consumes no model call.
- Every Candidate and pipeline handoff uses a closed, versioned, deeply frozen contract. Invalid, ambiguous, coerced, repaired, oversized, or reference-mismatched model output rejects before rendering.
- The composite Gate runs deterministic schema, grounding, privacy, name, and number checks before exactly one candidate-bound semantic judge call. A local failure or unknown cannot be overridden by the judge.
- A strike has a six-call ledger and a server-side deadline. It reserves only complete generation/judge pairs, never re-judges a Candidate, and uses the approved seasonal house catalog when qualified attempts cannot safely complete. Coordinator uncertainty returns `502`; no uncommitted result may render.
- Structural generation and judge identities qualify independently at at least 95% direct-valid and must pass the closed integrity predicate set. Live metered runs require fresh exact approval, never run in CI, and retain immutable provenance, usage, latency, taxonomy, and cost evidence.
- Semantic regression and owner-approved golden/anti-golden calibration are separate from structural qualification. Local full-request evidence must prove correctness, provenance, deadline, and cost before activation.
- Render only authoritative `CommittedBrief` values. Every Brief contains all eight ordered elements, is confident rather than hypothetical, makes no unsupported numeric claims or Hearn pricing claims, and ends with a spark-specific, low-pressure invitation.
- Activation is atomic, manifest-bound, and separate from implementation and deployment. Reader compatibility deploys first, the writer deploys inactive, and local-only activation occurs only when every applicable release gate is current. Rollback must restore the inactive safe posture atomically.

## Technical Decisions

- `src/worker.js` remains the only public Worker entrypoint. Runtime-neutral Evidence, generation, Gate, strike, receipt, and projection modules have one canonical ES-module implementation under `src/pipeline/`, shared by Worker assembly and Node verification; scripts cannot contain a second production writer.
- Workers AI remains the provider. The newly selected primary candidate is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; fallback is `@cf/meta/llama-3.1-8b-instruct-fast`. Each role and configuration needs its own current qualification. Existing gpt-oss evidence remains NO-GO.
- Model IDs are runtime variables, while prompts, schemas, parameters, adapter behavior, source hashes, runtime identity, timeout policy, and fixtures are qualification-bound. Transport adapters decode exactly one complete structured response value without extraction or repair.
- COORD is the cross-request authority for claim, read, commit, and atomic served counters. KV entries are best-effort projections and HTTP responses are `no-store`; unsupported versions fail closed or behave as cache misses according to the compatibility contract.
- Request scope owns claim/cache identity and permalink eligibility; effective mode owns rendering. During local-only activation, a valid domain request follows the canonical writer in domain request scope with effective local mode and a fixed pre-activation notice, but performs no scan and creates no permalink.
- Representation is a transport concern: explicit JSON acceptance wins; otherwise HTML acceptance or browser-form content selects shell HTML. Local HTML success redirects to an eligible `/s/:id`; domain-scope HTML returns direct `200`. Metrics increment only when the committed artifact is actually delivered.

## UX & Interaction Patterns

- Render the eight elements in fixed order: title, plan, why it fits, what gets better, before/after, change level, what stays the same, and invitation. Treat every field as plain text.
- The result region carries `aria-busy`; the Strike button uses `aria-disabled` and ignores repeat activation so keyboard focus is preserved. Enhanced results make exactly one focus move and one announcement; fresh full-document responses set no scripted focus.
- House and pre-activation outcomes look like ordinary complete Briefs with one quiet, stable notice above the title. Invalid input stays in the shell with field-linked error semantics; coordinator uncertainty stays in the shell with a retry message.
- Meet WCAG 2.2 AA, including visible offset focus indicators, minimum target sizes, contrast, 320px reflow, reduced/limited motion, semantic headings, no result live region, and equivalent no-JavaScript behavior.
- Local Briefs may expose sharing; domain-scope results never expose or mint a permalink. Until the invitation receiver is activated in a later epic, render the invitation as a plain Hearn contact link.

## Cross-Story Dependencies

Foundation contracts, approved content, deterministic Evidence, and offline adapters precede structural qualification. Qualified generation and judge identities unlock the composite Gate and strike orchestrator; those feed authoritative commit, rendering, request hardening, semantic/full-request qualification, and retention. Release then proceeds strictly through activation-contract proof, canonical Worker assembly, reader-first deployment, inactive writer deployment, and separately approved atomic local-only activation. Domain generation remains an Epic 2 concern, production receipt proof an Epic 3 concern, and active invitation handoff an Epic 4 concern.
- 2026-08-20 incident: production deployed the Story 1.14/1.15 committed_brief reader requirement ahead of the approved sequence while the writer still produced legacy Spark artifacts, returning 502 on every Strike. Interim mitigation is a separately approved redeploy of the pre-1.14 Worker artifact. Recovery runs through Story 1.16 and Story 1.23, which are the incident-recovery critical path ahead of the review and operator queues; the release-tail order (1.23 assembly, 1.24 reader deployment, 1.25 inactive writer, 1.26 activation) is unchanged.
