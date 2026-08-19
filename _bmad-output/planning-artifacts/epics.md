---
stepsCompleted: [step-01-extraction, step-02-epic-design, step-03-stories, step-04-validation]
courseCorrectionStepsCompleted: [step-01-requirements-reconciliation, step-02-epic-design, step-03-deliverable-epic-boundaries-2026-08-17, step-04-readiness-remediation-2026-08-17, step-05-architecture-ux-production-proof-reconciliation-2026-08-17, step-06-worker-runtime-assembly-boundary-2026-08-19]
storyCount: 48
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/prd.md
  - _bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/solution-design.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-16.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-08-17.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md
  - _bmad-output/planning-artifacts/ux-decision-record-oddspark.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-08-17-1057.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17-3.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-19.md
---

# oddspark - Epic Breakdown

## Overview

This document provides the complete 48-story epic and story breakdown for oddspark, decomposing the requirements from the PRD and Architecture spine into implementable stories. The one-button / optional-domain product shape remains unchanged (FR10). The governing UX Decision Record (`ux-decision-record-oddspark.md`, 2026-08-17) specifies the closed visitor-facing deltas; revised AD-6, AD-12, and AD-13 grant and bound their implementation authority. The `DESIGN.md` and `EXPERIENCE.md` spines in `ux-designs/ux-oddspark-2026-08-17/` are backing guidance, not governors.

## Requirements Inventory

### Functional Requirements

- FR1: Coherent local generation — no domain → Candidate grounded in Port Huron / Blue Water Area context, current date/time, seasonality, Delivery-Envelope capability bundle; no legacy random-axis vocabulary in output.
- FR2: Website-grounded generation — domain → Evidence Bundle from public site + vertical knowledge; Candidate traceable to bundle; exactly one Breadcrumb (specific, positive/neutral, no personal details); no duplication of detected capabilities; no business-specific facts absent from the bundle.
- FR3: Composite Gate evaluation — deterministic schema, grounding, privacy-policy, and number-provenance checks run before one candidate-bound semantic judge evaluation of all 9 coherence gates, tone, and claims; malformed, incomplete, ambiguous, schema-invalid, candidate-unbound, repaired-semantic, or otherwise unqualified results fail closed; rejected Candidates leave no visible trace.
- FR4: Bounded regeneration — one six-model-call strike ledger starts only complete generation-to-judge pairs. With `E` model-based Evidence calls, the Candidate ceiling is `min(3, floor((6 - E) / 2))` (`E=0` permits at most 3; `E=1` permits at most 2); invoked failures/timeouts/invalid outputs consume their call; exhaustion or insufficient deadline returns a gate-passing house Brief.
- FR5: Contract-complete rendering — all 8 result-card elements in order; Change Level = preliminary time range + workflow-step impact; What Stays the Same names tools + authority + steps; confident-plan voice (voice rubric + ≥3 golden Briefs per mode as pre-launch deliverable).
- FR6: Claim discipline — no numeric ROI/percentages in local mode; domain-mode numbers traceable to the site; qualitative effects name who/what physically changes; no pricing anywhere.
- FR7: Spark-specific invitation — CTA references the exact Spark; no pricing/urgency/pitch register; explicitly allows "not worth changing."
- FR8: Public-site evidence only — submitted public responses may contain PII only in the ephemeral scan buffer used to detect and discard it; detected PII is never retained, bundled, sent to a model, used, or rendered; cookies/sessions/reviews/off-site data are not fetched; abuse-limit carve-out declared; robots.txt respected; scan insufficiency falls back to local mode with plain-language notice.
- FR9: One-breadcrumb ceiling — no capability inventory, audit list, or multi-item findings rendered; domain-mode Briefs ephemeral (no public permalink).
- FR10: Interaction preservation — one button, one optional domain field; both modes from the same action.
- FR11: Verifiability (cache-first) — same window + same inputs resolve the identical versioned Brief from the authoritative COORD receipt, with KV pins as read projections; domain-mode Briefs have no `/s/:id` permalink; no reproducibility UI claim until production-verified.

### NonFunctional Requirements

- NFR1: Privacy — no PII/cookies/sessions/reviews/off-site research for personalization or generation; abuse-limit carve-out has no tracking role; robots.txt respected.
- NFR2: Performance — strike completes within STRIKE_BUDGET_MS wall-clock or degrades to house Brief; existing 4s scan budget carries over.
- NFR3: Security — domain input validated/size-limited per existing worker guards (body 4KB, URL 2048, redirect caps, public-host-only).
- NFR4: Cost — ≤6 model calls per strike through independently qualified generation/judge role selectors and the shared ledger/deadline. Workers AI retains best-effort/fail-open `NeuronMeter` without creating extra capacity; another provider requires a separately approved cost-control convention.
- NFR5: Reliability — Candidate/model/qualification/budget failure degrades to an authoritative committed or house Brief while COORD is reachable; COORD read/claim/commit uncertainty returns 502 and never renders uncommitted output.

### Additional Requirements

From the architecture spine (AD-1..AD-13), solution design, governing UX Decision Record, and approved course corrections:

- Pipes-and-filters stage separation with the strike orchestrator as sole owner of the retry loop; stages single-pass, no stage calls another.
- One canonical runtime-neutral ES-module pipeline under `src/pipeline/`; `src/worker.js` and Node verification import the same production implementations. Runtime assembly, compatibility-reader deployment, inactive-writer deployment, and activation are separate authorities (AD-13).
- Immutable staged ports: closed `EvidenceContext` → Generate adds Candidate/reference → Local Gate derives the closed `GroundingReport` → complete `AttemptContext` goes to the judge; no mutable/closure-fed Gate input.
- Composite Gate with local AD-4/AD-5 checks, Story 1.5's pure tri-state personal-name policy, and exactly one structurally qualified `JudgeProvider` call for a surviving Candidate.
- Candidate-bound outer `JudgeResult` plus closed canonical `{pass,gates[9],tone,claims}` verdict; exact IDs/reasons, lossless versioned adapter, fail-safe `pass:false`, and no semantic invention/coercion/omission/ambiguity.
- Typed Brief JSON schema (integer version, mode, 8 elements, notice, grounded_numbers) as the only renderer input; legacy personalization.status branching removed.
- Closed tagged Evidence union and Candidate-derived grounding at Local Gate against canonicalized scan text; every business claim/Breadcrumb/number has one passing report entry; profile_hash preimage replaced with version bump.
- Versioned closed `CommittedBrief` envelope; reader-first mixed-version rollout; rollback only to a compatibility reader that rejects or losslessly shims the new envelope.
- COORD authoritatively owns claim/read/commit receipts and atomic aggregate metrics; `w:`/`pw:` and `m:` KV entries are read/report projections. Missing/stale pins consult COORD before generation.
- Request scope owns cache identity while effective mode owns rendering: a domain downgrade remains domain-scoped and never populates global `w:`; Story 2.6 implements the Justin-approved one-hour domain-result TTL before domain launch.
- House Brief catalog (curated per season, integer-versioned, gate-passing by construction).
- Atomic aggregate `briefs_served`, `house_briefs_served`, and `invitation_acted` events through COORD plus `POST /api/cheer`; served events occur only after authoritative receipt resolution/commit, so 400/502 responses enter neither denominator. SM-1 is an explicitly approximate, non-deduplicated event rate that may be skewed by repeat actions—not a person/render percentage. No per-visitor analytics keys beyond the abuse carve-out. SM-2 and SM-3 retain manual measurement authorities.
- Robots.txt check added to the scanner.
- Six-call pair-reservation state machine and route-entry deadline through authoritative commit; unused judge reservation releases after local rejection, invoked calls remain consumed, and fallback role selection occurs only on a subsequent complete pair.
- Closed hash-bound qualification manifests plus one atomic production activation manifest for generation/judge structural identity, semantic identity, and full-pair evidence; runtime mismatch disables the role.
- Four separate verification tiers: deterministic fixtures; manual structural/wire/canonical/binding qualification; Story 1.18 semantic calibration; Story 1.19 full-pair latency/cost. Live metered runs require fresh approval and never run in CI.
- Model-assisted domain Evidence uses a separately qualified `EvidenceProvider`; primary/fallback configurations qualify independently in Story 2.3 and consume `E=1`. Evidence qualification never borrows generation or judge evidence.
- Preserve the legacy Story 1.2 v1 `NO-GO` through new Story 1.3; permit at most one separately approved evidence-v2 recovery matrix in Story 1.4. A second `NO-GO` triggers MVP review, not another provider bakeoff.
- Offline development has no callable AI binding; approval-bound live spikes use isolated nonproduction configuration and never production KV/DO/routes/assets/persistent Worker names.
- Failure precedence is explicit: invalid input 400; scan insufficiency downgrades; eligible Candidate/model failures retry then house; COORD uncertainty 502; no uncommitted or raw-model output renders.
- AD-12 selects one of two representations only at the transport boundary: explicit `Accept: application/json` wins; otherwise HTML-capable or browser-form requests receive shell HTML; remaining requests preserve JSON. The selected `Content-Type`, `Vary: Origin, Accept, Content-Type`, request-scope permalink eligibility, `Cache-Control: no-store`, status, and non-counting terminal outcomes are deterministic.
- Pre-launch deliverables (Justin): voice rubric + ≥3 golden Briefs per mode; house Brief catalog; /how page + mermaid rewrite.
- Pre-existing maintenance concerns include KV TTL hygiene, CORS tightening, `/api/meter` exposure, preview config placement, and Wrangler upgrade/compat-date review. Historical mentions of `root worker.js` or duplicated parse/seed blocks are non-authoritative candidates only: they define no retirement target. Story 5.1 is the sole deletion oracle and must independently produce the exact path, symbol or frozen range, hashes, commands, and protected-retain inventory; no named candidate authorizes deletion.

### UX Design Requirements

The governing UX Decision Record (`ux-decision-record-oddspark.md`, 2026-08-17) specifies the closed D1, D1a, D2, D2a, and D3–D24 delta rows; revised AD-6 and AD-12 authorize exactly those changes and no others. The as-built shell baseline is Oddspark commit `761c3dae989ca52a198f7b4f64a650f292fea3b9`, `src/worker.js::page()`. The current sources include `implementation-readiness-report-2026-08-17-1057.md` and `sprint-change-proposal-2026-08-17-3.md`. Backing `DESIGN.md` and `EXPERIENCE.md` remain non-governing guidance.

- UX-DR1: Eight-element result-card hierarchy and field-to-section mapping (AD-5 is the data contract; this is presentation).
- UX-DR2: Accessibility baseline — named standard, keyboard/focus order, screen-reader semantics, contrast target, acceptance-test baseline.
- UX-DR3: Loading / "within seconds" / deadline behaviour with retry suppression; enhanced paths move focus as specified, while fresh full-document HTML responses set no scripted focus.
- UX-DR4: State-and-copy matrix — downgrade notice, house Brief, negotiated invalid-input 400, negotiated COORD 502, shared 404 shell, unsupported version, inactive receiver, and non-claiming receipt copy.
- UX-DR5: Responsive and preservation criteria for the existing page shell.
- UX-DR6: Invitation interaction contract — native POST/303 path, plain-link fallback, progressive enhancement, failed submission, focus restoration, external-navigation expectation.

### FR Coverage Map

- FR1: Epic 1 — coherent local generation
- FR2: Epic 2 — website-grounded generation
- FR3: Epic 1 — composite local/semantic Gate, structural qualification, and calibrated semantic judge
- FR4: Epic 1 — six-call complete-pair orchestration, qualified fallback roles, deadline, and house Brief
- FR5: Epic 1 — contract-complete rendering
- FR6: Epic 1 — local structural claim discipline plus semantic judgment
- FR7: Epic 1 — spark-specific invitation rendering; Epic 4 — measured, reference-bearing Hearn handoff
- FR8: Epic 2 — public-site evidence only
- FR9: Epic 2 — one-breadcrumb ceiling and domain ephemerality across every read path
- FR10: Epic 1 — interaction preservation (verified, unchanged)
- FR11: Epic 1 — functioning authoritative COORD receipt, KV projections, and local retention; Epic 3 — production proof required before enabling a public claim
- Launch, production proof, receipt claim, and the first owner-review cycle: Epic 3
- Retirement: Epic 5
- Recurring SM-2 / SM-3 review after Story 3.3: owner-review runbook (not a sprint story)

## Epic List

### Epic 1: A Coherent Brief From One Button — local mode live in production
A press without a domain produces a committed, gate-passed local Brief or approved house Brief in production, through independently qualified generation and judging, behind one atomic local-only activation.
**FRs covered:** FR1, FR3–FR7, FR10–FR11; NFR2, NFR4–NFR5

### Epic 2: Website-Grounded Sparks — domain mode live in production
A submitted public domain produces one safely grounded Brief or an honest local downgrade in production, domain data remains ephemeral, and activation is one atomic manifest replacement.
**FRs covered:** FR2, FR6, FR8–FR11; NFR1–NFR5

### Epic 3: Production Proof, Launch Gate, and Receipt Claim
Same-window production behaviour is proven, the quiet-production house-rate gate is observed, the receipt claim is activated only from current evidence, and the first owner-review cycle is completed — unlocking public promotion.
**FRs covered:** FR11; NFR2, NFR4–NFR5; SM-2; SM-3; launch requirements

### Epic 4: Trustworthy Contact Handoff
The invitation measures aggregate engagement and carries an opaque reference to Hearn only when a verified receiver contract is active; otherwise it stays a plain link.
**FRs covered:** FR7; NFR1, NFR3; AD-8, AD-10

### Epic 5: Governed Legacy Retirement
An operator can approve and execute removal of a closed, version-bound set of legacy paths after quiet-production PASS while compatibility readers, historical evidence, rollback windows, and remote resources remain protected.
**FRs covered:** FR1–FR4, FR10; NFR5

## Legacy Story Crosswalk

| Approved legacy ID | 2026-08-16 reslice ID (see the 2026-08-17 crosswalk below for current IDs) |
| --- | --- |
| 1.1 | 1.1 |
| 1.2 | 1.3–1.4 |
| 1.3 | 1.5 |
| 1.4 | 1.6 |
| 1.5 | 1.7 |
| 1.6 | 1.9 |
| 1.7 | 1.10–1.11 |
| 1.8 | 1.12 |
| 1.9 | 1.13, 1.19 |
| 1.10 | 1.14 |
| 1.11 | 1.15 |
| 1.12 | 1.16 |
| 1.13 | 1.17–1.18 |
| 2.1 | 2.1 |
| 2.2 | 2.2–2.3 |
| 2.3 | 2.4 |
| 2.4 | 2.7–2.8 |
| 2.5 | 2.5 |
| 2.6 | 2.6 |
| 2.7 | 2.9 and 3.12 |
| 3.1 | 1.8 |
| 3.2 | 3.1 |
| 3.3 | 3.2 |
| 3.4 | 3.7–3.8 and 3.10 |
| 3.5 | 3.9 |
| 3.6 | 1.2, 1.20, 3.3, and 3.6 |
| 3.7 | 3.4–3.5 and 3.11 |
| 3.8 | 3.13 |

The crosswalk preserves review history only. Current development, status, dependencies, and references use the current story IDs.

### 2026-08-17 Course-Correction Crosswalk (2026-08-16 reslice IDs → current IDs)

| 2026-08-16 ID | Current ID | Change |
| --- | --- | --- |
| 1.1–1.20 | 1.1–1.20 | unchanged |
| — | 1.21 | new — local retention lifecycle (carved from 3.3) |
| 3.2 | 1.22 | moved — /how rewrite precedes local rollout |
| — | 1.23 | new — compatibility reader deployment (carved from 3.6) |
| — | 1.24 | new — local writer rollout and local-only activation (carved from 3.6) |
| 2.1–2.6, 2.8 | 2.1–2.6, 2.8 | unchanged |
| 2.7 | 2.7 | narrowed — cross-mode identity ACs moved to 2.10 preflight |
| 2.9 | 2.9 | re-scoped — governed-path verification and legacy quarantine |
| — | 2.10 | new — domain production activation (carved from 3.6) |
| 3.7 / 3.8 / 3.9 / 3.10 | 3.1 / 3.2 / 3.3 / 3.4 | Epic 3 renumbered |
| 3.1 / 3.4 / 3.5 / 3.11 | 4.1 / 4.2 / 4.3 / 4.4 | Epic 4; 4.3 is Oddspark-side receiver verification only |
| 3.3 (dead-code half) / 3.12 / 3.13 | 5.1 / 5.2 / 5.3 | Epic 5; 5.3 is an ongoing process |

### 2026-08-17 Readiness Crosswalk (current IDs → this correction)

| Prior ID | New ID | Change |
| --- | --- | --- |
| 5.1–5.2 | 5.1–5.2 | unchanged |
| 5.3 | 3.5 + owner-review runbook | first cycle is finite; weekly recurrence leaves the sprint |

### 2026-08-17 Architecture/UX/Production-Proof Crosswalk (prior current IDs → revised IDs)

| Prior ID | Revised ID | Change |
| --- | --- | --- |
| 1.24 | 1.24 + 1.25 | split — inactive writer deployment and separately authorized local-only activation |
| 3.1 | 3.1 | narrowed — offline mode-parameterized harness; no Story 2.10 prerequisite |
| 3.2 | 3.2 + 3.4 | split — local and domain production receipt runs |
| 3.5 | 3.3 | moved — first owner review follows LOCAL PASS |
| 3.3 | 3.5 | moved — quiet-production gate becomes a non-estimated operational checkpoint after DOMAIN PASS |
| 3.4 | 3.6 | moved — receipt claim follows DOMAIN PASS and quiet-production PASS |
| 5.1 | 5.1 | re-scoped — closed, hash-bound legacy-retirement oracle; no deletion |
| 5.2 | 5.2 | hardened — exact inventory targets only under separate destructive authority |

### 2026-08-19 Worker Runtime Assembly Crosswalk (prior IDs → revised IDs)

| Prior ID | Revised ID | Change |
| --- | --- | --- |
| 1.16 | 1.16 | narrowed — request hardening and closed inactive-domain dispatch contract; no Brief construction |
| — | 1.23 | new — canonical Worker runtime assembly and offline cold-domain proof |
| 1.23 | 1.24 | renumbered — compatibility reader deployment |
| 1.24 | 1.25 | renumbered — inactive writer deployment |
| 1.25 | 1.26 | renumbered — atomic local-only activation |


## Execution and Authority Rules

- Stories are ordered by dependency; a story may use only prior story outputs or separately identified external authority.
- Offline fixtures never perform provider, production, deployment, remote-resource, or real-contact activity.
- Every metered/live run requires fresh approval for its exact frozen configuration, call cap, maximum cost, and retained fields. Approval permits the run, not a passing outcome.
- Deployment, local activation, domain activation, quiet observation, public promotion, receipt-claim activation, Hearn reference activation, and destructive retirement are separate approvals.
- A structurally valid model-evaluating NO-GO completes its evidence story but blocks dependent activation; evidence is immutable and cannot be replaced. A retained, marker-bound preflight stop that independently proves zero calls consumes no qualification allowance and may support a freshly bound replacement plan after the boundary defect is corrected; it remains historical evidence and never emits qualification refs.
- Runtime-bound toolchain changes invalidate affected structural evidence and all dependent semantic, full-request, production, launch, and activation evidence.
- Domain requests during the local-only production phase (Story 1.26 until Story 2.10) follow Story 1.16's closed dispatch through Story 1.23's canonical assembled writer with the plain-language notice under domain request scope. The legacy generator is unreachable from Story 1.26 onward and is quarantined, not deleted, until Story 5.2. (Justin decisions, 2026-08-17 and 2026-08-19.)
- Broad acceptance criteria bind to a named oracle: "every integrity predicate" means the closed predicate list of the Story 1.3 evidence-v2 verifier (cited by version hash); rollout preflight means the enumerated gate list of the Story 1.20 release-decision view; production-proof predicates mean the closed harness schema of Story 3.1.
- Recurring owner review after Story 3.3 follows the versioned, hash-bound owner-review runbook and is not a sprint story.
- Story 3.3 owner review and Story 2.10 domain activation are independent prerequisites that may complete in either order; Story 3.4 domain production proof waits for both. Neither prerequisite grants the other's authority.
- Story 3.5 is a non-estimated operational checkpoint, not implementation work; slow organic accumulation is legitimate in-progress state and creates no authority to manufacture traffic or weaken its PASS criteria.

## Epic 1: A Coherent Brief From One Button — local mode live in production

*Phases (labels, not epics): Foundations 1.1–1.10 · Qualification 1.11–1.19 · Release 1.20–1.26.*

### Story 1.1: Shell Safety Net

As a developer,
I want the existing shell and security guards pinned by deterministic tests,
So that later pipeline work cannot silently break the current product.

**Requirements:** FR10; NFR3; architecture development safety

**Dependency:** No predecessor; this is the verified baseline.

**Acceptance Criteria:**

**Given** the current route, form, renderer, scanner, cache, and error behavior
**When** the baseline suite runs
**Then** every behavior in the story file's enumerated preservation inventory is covered
**And** the two known security guards are covered
**And** no fixture performs provider or production activity.

### Story 1.2: Toolchain and Isolated Runtime Baseline

As a developer,
I want one reviewed, pinned Worker toolchain before live qualification,
So that later evidence binds a stable runtime instead of a moving dependency.

**Requirements:** NFR2–NFR5; AD-11

**Dependency:** Story 1.1.

**Acceptance Criteria:**

**Given** the Wrangler dependency, lockfile, compatibility date, generated bindings, and root/spike configs
**When** the baseline is prepared
**Then** the exact Wrangler version is pinned
**And** release-note and compatibility-date behavior is reviewed
**And** preview_urls uses its supported placement
**And** offline development and CI expose no callable production binding.

**Given** the complete offline suite and deployment configuration
**When** validation runs
**Then** tests, generated types, config validation, and dry run pass
**And** no command deploys, uploads, creates, or mutates a remote resource
**And** the runtime identity is frozen for later evidence.

### Story 1.3: Judge Recovery Contract and Offline Verifier

As a developer,
I want a strict offline recovery harness for the canonical judge contract,
So that the single allowed recovery run is auditable before spending begins.

**Requirements:** FR3; AD-2; AD-11

**Dependency:** Story 1.1; external: immutable v1 evidence `spikes/judge-fidelity/results/2026-08-16-d2b84005.json` and its audit addendum.

**Acceptance Criteria:**

**Given** the immutable v1 Story 1.2 NO-GO evidence
**When** the recovery baseline is recorded
**Then** the 0/20 direct and post-repair results per gpt-oss model remain unchanged
**And** v1 evidence is never overwritten or reclassified.

**Given** the outer candidate-bound JudgeResult and inner CanonicalVerdict
**When** fixtures and verification run
**Then** objects are closed and exact
**And** nine gate IDs and reasons, tone, claims, pass safety, binding, envelope ambiguity, size, and allowlisted repair are covered
**And** the verifier recomputes hashes, classifications, rates, and deterministic reports without network access.

### Story 1.4: Judge Structural Recovery Matrix

As an operator,
I want one frozen, approval-bound judge recovery matrix,
So that model-dependent work either gains trustworthy STRUCT-JUDGE evidence or stops cleanly.

**Requirements:** FR3; NFR2; NFR4; AD-11

**Dependency:** Stories 1.2–1.3; exact live authority is additionally required.

**Acceptance Criteria:**

**Given** the offline verifier passes and a frozen primary/fallback matrix is proposed
**When** live authority is requested
**Then** provider, models, prompt, schema, adapter, runtime, call cap, maximum cost, and retained fields are disclosed
**And** fresh approval authorizes only that run.

**Given** an approved matrix
**When** the run executes
**Then** one recorded capability probe runs per configuration before the counted matrix
**And** rejection of the exact frozen json_schema request or failure to return content produces NO-GO without spending the counted matrix
**And** a marker-bound preflight stop with zero call records and zero durable call-start accounting remains retained but does not consume the one recovery allowance, even when a later source correction makes it stale for qualification
**And** after accepted probes, at least 20 sequential counted trials run per configuration
**And** there are no retries, replacements, CI calls, deployments, or persistent resources
**And** direct-valid and post-repair rates, taxonomy, latency, usage, and provenance remain separate.

**Given** verified results
**When** the outcome is derived
**Then** each configuration independently requires at least 95% direct-valid plus every predicate in the Story 1.3 verifier's closed predicate list for GO
**And** GO produces exact STRUCT-JUDGE refs
**And** NO-GO completes the evidence story but blocks dependent work and triggers MVP review; no third matrix is allowed.

### Story 1.5: Voice Rubric and Golden Briefs

As the product owner,
I want a versioned voice rubric and approved golden/anti-golden corpus,
So that semantic quality is judged against explicit product intent.

**Requirements:** FR3; FR5–FR7; owner: Justin

**Dependency:** None; external: `coherence-gates.md`, `result-card-contract.md`, voice guidance from the spec companions; owner Justin.

**Acceptance Criteria:**

**Given** the nine gates and Oddspark voice
**When** the corpus is authored
**Then** each mode has at least three complete goldens
**And** stable anti-goldens cover consultant-speak, unsupported claims, weak preservation, capability duplication, poor scope, and invitation pressure
**And** semantic thresholds are fixed before live results.

**Given** developer placeholder fixtures
**When** owner review occurs
**Then** placeholders are visibly non-authoritative
**And** Justin approval binds the exact version and content hashes.

### Story 1.6: Local Priors Content

As the product owner,
I want approved seasonal Port Huron and Blue Water Area priors,
So that local Briefs are specific without pretending to know a submitted business.

**Requirements:** FR1; FR6; owner: Justin

**Dependency:** None; external: `generation-modes.md`; owner Justin.

**Acceptance Criteria:**

**Given** region, season, date, situation, and Delivery Envelope needs
**When** the catalog is authored
**Then** all four seasons have stable IDs, situations, and capability bundles
**And** entries contain no person or business assertions
**And** invalid, duplicate, empty, or out-of-envelope content rejects.

**Given** placeholder priors
**When** owner review occurs
**Then** they cannot activate production
**And** Justin approval binds the exact catalog hash.

### Story 1.7: Brief, Attempt, and Grounding Contracts

As a developer,
I want closed immutable contracts for every pipeline handoff,
So that no stage can smuggle unvalidated or mutable state downstream.

**Requirements:** FR3; FR5–FR7; AD-1; AD-4; AD-5

**Dependency:** Story 1.1.

**Acceptance Criteria:**

**Given** the Brief schema
**When** validation runs
**Then** the versioned local/domain union, eight elements, notice, grounded_numbers, exact keys, types, and cardinalities are enforced
**And** candidate_ref is deterministic over the validated Candidate.

**Given** EvidenceContext, GroundingReport, AttemptContext, and CommittedBrief
**When** their references are derived
**Then** all required fields are closed and deeply frozen
**And** attempt, evidence, candidate, grounding, rubric, provenance, request scope, and effective mode cannot drift.

**Given** personal-name policy inputs
**When** the pure policy runs
**Then** only pass, fail, or unknown with a stable reason returns
**And** fail and unknown reject
**And** no model call or network access occurs.

### Story 1.8: Versioned House Brief Catalog

As the product owner,
I want an approved seasonal house catalog,
So that qualified failures still return a useful gate-passing result.

**Requirements:** FR4–FR7; NFR5; owner: Justin

**Dependency:** Stories 1.5 and 1.7; owner Justin.

**Acceptance Criteria:**

**Given** the approved rubric and Brief validator
**When** the catalog is authored
**Then** every season has at least two stable-ID complete Briefs
**And** each entry passes exact validation and expected Gate outcomes
**And** entries contain no business-specific claims, pricing, or hidden personalization.

**Given** catalog selection and hashing
**When** offline fixtures run
**Then** selection is deterministic
**And** placeholder, drifted, duplicate, missing-season, or invalid content rejects
**And** Justin approval binds the exact catalog hash.

### Story 1.9: Local Evidence Assembly

As a developer,
I want deterministic frozen local Evidence,
So that Generate receives grounded regional context without consuming a model call.

**Requirements:** FR1; FR4; AD-4

**Dependency:** Stories 1.6 and 1.7.

**Acceptance Criteria:**

**Given** approved priors and an explicit America/Detroit strike timestamp
**When** Evidence assembles
**Then** it matches the closed local AD-4 shape
**And** season/date behavior covers DST, leap day, and year boundaries
**And** evidence_ref is deterministic and E freezes at 0.

**Given** invalid or unavailable priors
**When** assembly runs
**Then** a typed evidence failure returns instead of partial Evidence
**And** no provider activity occurs.

### Story 1.10: Generation Contract and Offline Adapter

As a developer,
I want a single-pass generation port with strict Candidate validation,
So that provider output cannot bypass the typed Brief contract.

**Requirements:** FR1; FR5–FR7; AD-1; AD-5

**Dependency:** Stories 1.7 and 1.9.

**Acceptance Criteria:**

**Given** closed local Evidence and seed inputs
**When** Generate runs through a fake provider
**Then** at most one call returns one direct-valid Candidate or typed failure
**And** validation precedes candidate_ref
**And** legacy axes and raw free text never reach downstream stages.

**Given** adapter fixtures
**When** normalization runs
**Then** direct values remain unchanged
**And** missing, extra, mistyped, coerced, invented, repaired, ambiguous, and oversized output is classified and rejected as specified
**And** no network activity occurs.

### Story 1.11: Generation Structural Qualification

As an operator,
I want independent primary and fallback generation evidence,
So that only directly reliable generation identities can be selected.

**Requirements:** FR1; NFR2; NFR4; AD-11

**Dependency:** Stories 1.2, 1.9, and 1.10; exact live authority is additionally required.

**Acceptance Criteria:**

**Given** a frozen provider/model configuration
**When** its identity is built
**Then** provider, resolved model, parameters, prompt, schema, adapter, runtime, timeout policy, inputs, fixtures, and source hashes are exact
**And** primary and fallback never pool.

**Given** offline verification and fresh exact-run approval
**When** live qualification executes
**Then** one probe and at least 20 sequential trials run per configuration
**And** no retry or replacement occurs
**And** the frozen adapter decodes only the complete text at exactly one provider response location as one JSON object before the unchanged closed Candidate classifier; multiple choices, prose, fences, trailing content, alternate locations, repair, coercion, omission filling, and schema weakening reject
**And** direct-valid, repair, taxonomy, latency, usage, and cost are reported separately.

**Given** verified results
**When** STRUCT-GENERATION is derived
**Then** each configuration independently meets at least 95% direct-valid plus every predicate in the Story 1.3 verifier's closed predicate list
**And** NO-GO blocks only the failed configuration and triggers architecture review.

### Story 1.12: Composite Gate and Qualified Judge Integration

As a developer,
I want local validation followed by one candidate-bound qualified judge call,
So that malformed, ungrounded, unsafe, or incoherent Candidates fail closed.

**Requirements:** FR3; FR6; AD-2

**Dependency:** Stories 1.4, 1.5, and 1.7; STRUCT-JUDGE must be GO.

**Acceptance Criteria:**

**Given** an EvidenceContext and Candidate
**When** Local Gate runs
**Then** schema, mode/Breadcrumb cardinality, grounding, PII, names, and numbers are checked first
**And** fail or unknown rejects before a judge call
**And** the immutable AttemptContext is produced once.

**Given** a locally valid AttemptContext and active STRUCT-JUDGE ref
**When** semantic evaluation runs
**Then** exactly one JudgeProvider call receives Candidate, Evidence, GroundingReport, rubric, and candidate_ref
**And** reference mismatch or noncanonical verdict rejects.

**Given** deterministic fixtures
**When** the composite Gate is tested
**Then** all local and semantic failure branches are distinct
**And** the judge cannot override local rejection
**And** retry decisions remain outside the stage.

### Story 1.13: Strike Orchestrator and House Fallbacks

As a developer,
I want one owner for retries, deadlines, role selection, and the six-call ledger,
So that a press finishes with a committed candidate path or validated house fallback.

**Requirements:** FR4; NFR2; NFR4; NFR5; AD-3; AD-9

**Dependency:** Stories 1.7–1.12, including approved house content and GO structural refs for live use.

**Acceptance Criteria:**

**Given** E is frozen
**When** a strike starts
**Then** only complete generation-judge pairs reserve
**And** candidate ceiling is min(3,floor((6-E)/2))
**And** invoked calls consume slots and unused judge reservations release only after local rejection.

**Given** primary errors, invalid output, deadline pressure, or exhaustion
**When** another attempt is considered
**Then** fallback selection occurs only for a subsequent complete pair
**And** the same Candidate is never re-judged
**And** insufficient capacity selects the approved house Brief.

**Given** fake providers and coordinator
**When** offline integration runs
**Then** every ledger transition, E value, timeout, role transition, rejection, fallback, and COORD uncertainty is covered
**And** no network activity occurs.

### Story 1.14: Authoritative Commit and Compatibility Reader

As a developer,
I want COORD-owned versioned receipts with reader-first rollout behavior,
So that concurrent requests converge without trusting KV propagation.

**Requirements:** FR11; NFR5; AD-7; AD-8

**Dependency:** Stories 1.1 and 1.7.

**Acceptance Criteria:**

**Given** legacy and CommittedBrief values
**When** the compatibility reader runs
**Then** supported versions read losslessly and unsupported versions fail closed
**And** the reader is deployable before the new writer.

**Given** a local or domain claim
**When** COORD claim/read/commit runs
**Then** the first valid winner commits one immutable receipt
**And** concurrent contenders resolve that receipt
**And** w:/pw: remain best-effort projections and missing pins consult COORD.

**Given** served outcomes
**When** the narrow metric operation runs
**Then** briefs_served and its house subset increment atomically only after authoritative resolution
**And** 400/502 responses do not enter counters.

### Story 1.15: Committed Brief Rendering

As a visitor,
I want all renderers to consume only validated CommittedBrief values,
So that the eight-element result stays complete and safe across every route.

**Requirements:** FR5–FR7; FR10; FR11; AD-12

**Dependency:** Stories 1.7, 1.8, and 1.14; governing UX Decision Record (UX-DR1–UX-DR6; UX-DR6 in plain-link posture only — invitation POST/303 activation is Stories 4.2/4.4).

**Acceptance Criteria:**

**Given** a committed local, domain, downgrade, or house Brief
**When** JSON, server-rendered HTML, enhanced HTML, `asText`, and share rendering run
**Then** the same authoritative artifact fields, order, escaping, notice behavior, mode authority, invitation, and accessibility are consistent
**And** raw model text and legacy personalization state are unreachable.

**Given** a successful native-form strike
**When** AD-12 selects the HTML representation
**Then** local request scope returns `303 /s/:id`, the redirect increments no served metric, and the followed eligible GET server-renders the committed Brief and increments exactly once
**And** domain request scope, including downgrade, returns direct `200` home-shell HTML from `/api/spark`, leaves the browser at `/api/spark`, creates no redirect, permalink, or history mutation, and increments exactly once.

**Given** a successful JSON strike
**When** the committed response renders
**Then** it returns `200` with the committed artifact
**And** enhanced local handling may use `history.replaceState` without another request, generation, persistence write, or metric increment
**And** enhanced domain scope, including downgrade, renders in place at the current browser URL without a permalink, history mutation, or extra metric increment.

**Given** unsupported or domain-scoped public reads
**When** routes render
**Then** unknown, expired, unsupported, and domain-scoped `/s/:id` requests return the governing UX `404` shell
**And** domain artifacts never receive /s/:id eligibility
**And** no generation, served metric, or provider activity occurs.

**Given** no current receipt_claim_ref
**When** the idle shell and non-claiming receipt surfaces render
**Then** the strike note is exactly "One idea, seeded by the sun and a randomness beacon."
**And** it does not contain "Same window, same spark."
**And** the formula panel uses the UX-DR4 non-claiming receipt string
**And** Story 1.15 does not introduce claiming copy.

**Given** enhanced and full-document result states
**When** focus behavior is exercised
**Then** the enhanced path moves focus according to the governing UX record
**And** a fresh full-document HTML response sets no scripted focus.

### Story 1.16: Request Hardening and Inactive-Domain Dispatch Contract

As a visitor,
I want the existing one-button interaction protected while domain mode remains inactive,
So that new internals cannot widen public input or remote-resource exposure.

**Requirements:** FR8; FR10; NFR3; AD-12; AD-13

**Dependency:** Stories 1.1, 1.14, and 1.15; governing UX Decision Record (UX-DR3–UX-DR5, including UX-DR4 notice and terminal-state copy).

**Acceptance Criteria:**

**Given** a `POST /api/spark` request
**When** representation is selected
**Then** explicit `Accept: application/json` wins even for a form-encoded body
**And** otherwise a request accepting HTML or carrying a browser-form content type receives shell HTML
**And** every remaining request preserves JSON behavior.

**Given** any dynamic strike, redirect, JSON/HTML result, error, or permalink response
**When** headers are emitted
**Then** `Content-Type` matches the selected representation
**And** `Vary` retains `Origin` and adds `Accept` and `Content-Type`
**And** `Cache-Control: no-store` prevents HTTP caches from becoming artifact authority.

**Given** the strike endpoint
**When** malformed or oversized input arrives
**Then** body, URL, scheme, credentials, port, redirect, and public-host guards retain status `400`
**And** JSON returns stable `{error,field}` while HTML returns the governing UX shell
**And** no strike or served metric occurs
**And** one button and one optional domain field remain the only inputs.

**Given** COORD or required-infrastructure uncertainty
**When** the terminal response is selected
**Then** status remains `502` with negotiated JSON or governing shell HTML
**And** no artifact renders and no served metric increments.

**Given** a valid domain before domain activation
**When** request intent is derived
**Then** one closed dispatch value contains request scope `domain`, effective mode `local`, the normalized domain claim identity, the fixed pre-activation notice identity, `scan_allowed=false`, `evidence_provider_allowed=false`, and `permalink_allowed=false`
**And** derivation performs no scanner, EvidenceProvider, generator, coordinator, metric, cache, writer, or remote-resource operation.

**Given** the public route with an injected inactive-domain writer port
**When** the closed dispatch is invoked
**Then** the route passes it exactly once and renders only a returned validated committed outcome
**And** a missing, throwing, malformed, or scope-mismatched writer result produces the negotiated `502`
**And** the route never constructs, repairs, or substitutes a Brief
**And** transport fixtures prove direct domain-scope HTML behavior and JSON parity with a fake writer without claiming that the production pipeline is assembled
**And** Story 1.23 owns cold canonical Evidence-through-commit execution.

**Given** CORS, meter, preview, and local-development surfaces
**When** security tests run
**Then** untrusted origins and public meter access reject
**And** negotiated `400`, `502`, and shared `404` outcomes increment no served metric
**And** CI/local transport fixtures have no callable provider or production binding and perform no deployment or remote-resource activity.

### Story 1.17: Semantic Regression Suite

As a test architect,
I want a deterministic contradiction and corpus suite,
So that semantic qualification measures the approved rubric instead of prompt luck.

**Requirements:** FR3; FR5–FR7; AD-2; AD-11

**Dependency:** Stories 1.5, 1.7, and 1.12.

**Acceptance Criteria:**

**Given** the approved corpus and contracts
**When** offline evaluation runs
**Then** all nine gates, tone, claims, pass safety, candidate binding, and deterministic local failures are covered
**And** fixture IDs and expected outcomes are immutable.

**Given** provider fakes
**When** the semantic harness runs
**Then** primary/fallback results remain separate
**And** no live call, deployment, or result-driven threshold change occurs.

### Story 1.18: Semantic Qualification

As an operator,
I want approved live semantic evidence for the exact structural pair,
So that production cannot confuse structural fidelity with product judgment.

**Requirements:** FR3; FR5–FR7; AD-11

**Dependency:** Stories 1.4, 1.11, and 1.17; exact live authority is additionally required.

**Acceptance Criteria:**

**Given** GO judge/generation refs, the frozen corpus, and fresh exact-run approval
**When** semantic qualification runs
**Then** predeclared thresholds and complete configuration hashes are used
**And** primary/fallback paths remain separately reported
**And** no replacements or unapproved diagnostics occur.

**Given** verified results
**When** SEMANTIC is derived
**Then** every required gate/tone/claims threshold and every predicate in the Story 1.3 verifier's closed predicate list passes
**And** failure blocks activation without weakening deterministic or structural contracts.

### Story 1.19: Local Full-Request Qualification

As an operator,
I want end-to-end local latency, cost, ledger, and commit evidence,
So that the qualified pieces are proven together through authoritative commit.

**Requirements:** FR1; FR3–FR7; FR11; NFR2; NFR4; NFR5

**Dependency:** Stories 1.11–1.18; exact live authority is additionally required.

**Acceptance Criteria:**

**Given** matching structural and semantic refs plus the authoritative commit path
**When** a frozen live plan is approved and run
**Then** the full local request exercises Evidence through render
**And** attempts, ledger, candidate binding, receipt identity, latency, usage, cost, and hashes are retained
**And** no retry, replacement, CI call, or deployment occurs.

**Given** verified results
**When** FULL-PAIR is derived
**Then** every frozen correctness, deadline, cost, provenance, and Story 1.3 closed-list integrity predicate passes
**And** failure preserves evidence and blocks activation.

### Story 1.20: Atomic Activation Contract and Release Decision View

As a developer,
I want one closed activation value and an on-demand readiness view,
So that partial configuration cannot activate an unproven pipeline.

**Requirements:** FR11; AD-11

**Dependency:** Stories 1.14 and 1.17–1.19.

**Acceptance Criteria:**

**Given** qualification, full-request, catalog, receiver, and claim refs
**When** ProductionActivationManifest validation runs
**Then** shared generation/judge/semantic refs appear once
**And** local/domain contain only enablement and mode-specific refs
**And** unknown fields, invalid nullability, stale evidence, parallel refs, and partial updates reject
**And** activation_ref is derived from the sole canonical value.

**Given** existing evidence and approvals
**When** the release-decision view renders
**Then** every applicable gate is pass, blocked, stale, or unapproved
**And** omission rejects
**And** the view creates no new authority or persistence.

**Given** a missing or invalid manifest
**When** runtime evaluates activation
**Then** model roles, claim copy, and reference handoff disable
**And** the authoritative committed/approved-house path remains available when safe
**And** existing observability emits only a redacted reason code.

### Story 1.21: Local Artifact Retention Lifecycle

As a developer,
I want every local-scope persisted record to carry explicit, non-sliding expiry,
So that production inherits no unbounded storage.

**Requirements:** FR11; NFR1; AD-7

**Dependency:** Story 1.14.

**Acceptance Criteria:**

**Given** local COORD receipts and w: projections
**When** a local artifact commits
**Then** committed_at and expires_at are immutable and exactly 30 days apart
**And** /s/:id and /api/spark/:id refuse the artifact at or after expiry
**And** reads never slide expiry.

**Given** the pre-existing record families (profile 24h, abuse slots 1h, neuron receipts 2d, aggregate reports 90d)
**When** retention is inventoried
**Then** owner, authority, creation, read, expiry, and cleanup are explicit
**And** time-controlled tests cover each family.

**Given** cleanup and projection repair
**When** they run
**Then** cleanup cannot cross scopes or restore eligibility
**And** COORD remains authoritative
**And** the domain one-hour lifecycle remains owned by Story 2.6.

### Story 1.22: Honest Pipeline Explanation

As a visitor,
I want the /how page to explain the real pipeline without premature claims,
So that trust comes from understandable behavior rather than marketing.

**Requirements:** FR3–FR5; FR8; FR11

**Dependency:** Story 1.15; UX Decision Record (UX-DR2 for accessible Mermaid metadata and fallback text).

**Acceptance Criteria:**

**Given** the adopted architecture
**When** the page is rewritten
**Then** Evidence, Generate, Local Gate, Judge, Commit, house fallback, privacy, call cap, and non-determinism are explained
**And** Mermaid has accessible metadata and plain-language fallback.

**Given** receipt proof is not active
**When** copy renders
**Then** no stronger reproducibility claim appears
**And** fixtures prohibit legacy and premature-claim language.

### Story 1.23: Worker Runtime Assembly

As a developer,
I want the canonical pipeline assembled behind the Worker request boundary,
So that offline proof, deployment, and later activation all use the same writer implementation.

**Requirements:** FR1; FR3–FR8; FR10–FR11; NFR2; NFR4–NFR5; AD-1–AD-9; AD-11–AD-13

**Dependency:** Stories 1.7–1.16 and 1.20–1.21. Story 1.22 remains independently executable but precedes release deployment by story order.

**Acceptance Criteria:**

**Given** the validated contracts, local Evidence, generation adapter, composite Gate, strike orchestrator, receipt handling, and rendering projections
**When** runtime assembly is complete
**Then** their canonical production implementations live under `src/pipeline/`
**And** `src/worker.js` and Node verification import the same modules
**And** no file under `scripts/` independently implements a production Brief writer, closed validator, canonical hash, grounding rule, ledger transition, receipt rule, or projection.

**Given** the assembled module graph
**When** Worker build and offline runtime verification run
**Then** no canonical runtime module imports Node-only APIs
**And** every provider, coordinator, clock, storage, and activation dependency enters through an explicit port
**And** generated Worker types and Wrangler dry run pass without creating or mutating a remote resource.

**Given** Story 1.16's closed domain dispatch and an offline local-enabled/domain-disabled activation fixture
**When** the first valid domain request runs with no prior receipt or global projection
**Then** the assembled canonical pipeline builds local Evidence, executes the existing strike and Gate contracts, commits under domain request scope, and renders effective local mode with the fixed notice
**And** it performs no scan or EvidenceProvider call, writes no global `w:` projection, mints no permalink, and records delivery only after successful rendering.

**Given** concurrent cold requests for the same domain claim
**When** they contend
**Then** one valid receipt wins and every successful response resolves the same committed artifact
**And** incompatible winners reject, claims are safely finalized on failure, and resubmission reads the authoritative receipt instead of generating a replacement.

**Given** no valid production activation manifest
**When** the assembled Worker is evaluated
**Then** model roles and new writer execution remain disabled
**And** no legacy generator becomes a fallback
**And** offline fake ports and activation fixtures create test authority only and cannot activate a deployed Worker.

**Given** repository verification
**When** the complete offline checks run
**Then** `npm test`, `npm run check`, Worker type generation, Wrangler dry run, and `git diff --check` pass without provider calls, deployment, production bindings, or protected configuration changes
**And** existing scanner and personalization regression tests remain intact
**And** a deterministic runtime-assembly identity binds the canonical module graph and source hashes for later gates without creating approval or deployment authority.

### Story 1.24: Compatibility Reader Deployment

As an operator,
I want the compatibility reader deployed and verified before any new writer,
So that production never observes a mixed-version artifact it cannot read.

**Requirements:** FR11; NFR5; AD-7; AD-11

**Dependency:** Stories 1.2, 1.14, 1.16, and 1.23; explicit deployment approval is required.

**Acceptance Criteria:**

**Given** a candidate reader release
**When** deployment preflight runs
**Then** toolchain identity, reader acceptance of the current legacy shape, lossless shim or fail-closed rejection of CommittedBrief versions, and config isolation pass
**And** the candidate Story 1.23 assembly proves its compatibility-reader projection matches the runtime-assembly identity while the deployed reader artifact contains no new writer entrypoint
**And** dry run creates no resource.

**Given** explicit deployment approval
**When** the reader deploys
**Then** legacy artifacts still read
**And** no writer or ProductionActivationManifest exists
**And** rollback restores the prior artifact without data change.

### Story 1.25: Inactive Writer Deployment

As an operator,
I want the compatible writer deployed while activation remains absent,
So that production can verify the deployable artifact before any new write path becomes active.

**Requirements:** FR1; FR3–FR8; FR10–FR11; NFR2; NFR4–NFR5; AD-11

**Dependency:** Stories 1.20–1.24, including Story 1.23's passing runtime-assembly identity and Story 1.24's deployed compatibility reader; explicit deployment approval is required.

**AC-to-requirement map:** deployment preflight → FR11, AD-11; inactive safe posture → FR3–FR8, FR10; rollback separation → NFR5.

**Acceptance Criteria:**

**Given** the deployed reader and current STRUCT-JUDGE, STRUCT-GENERATION, SEMANTIC, local FULL-PAIR, and house-catalog refs
**When** deployment preflight runs
**Then** every applicable gate in the Story 1.20 release-decision view is pass
**And** the candidate Worker bundle contains exactly the Story 1.23 canonical module graph with no duplicate writer or drifted runtime module
**And** dry run creates no resource.

**Given** explicit deployment approval
**When** the compatible writer deploys
**Then** no active ProductionActivationManifest exists
**And** model roles, new writes, claim copy, and reference handoff remain disabled
**And** the architecture-approved committed/house safe posture remains available
**And** no legacy or unqualified generator runs
**And** no stored data or remote resource is created, deleted, or reconfigured.

**Given** a deployment rollback
**When** it executes under separate deployment authority
**Then** the prior compatible artifact is restored without data change
**And** activation authority is neither inferred nor exercised.

### Story 1.26: Atomic Local-Only Activation

As an operator,
I want the deployed writer enabled by one separately approved local-only manifest replacement,
So that visitors receive committed gate-passed local Briefs without coupling activation to code deployment.

**Requirements:** FR1; FR3–FR8; FR10–FR11; NFR2; NFR4–NFR5; AD-11

**Dependency:** Story 1.25; separate activation approval is required.

**AC-to-requirement map:** activation preflight/replacement → FR11, AD-11; domain-phase behaviour → FR8, FR10; activation rollback → NFR5.

**Acceptance Criteria:**

**Given** Story 1.25's inactive writer and current STRUCT-JUDGE, STRUCT-GENERATION, SEMANTIC, local FULL-PAIR, and house-catalog refs
**When** activation preflight runs
**Then** every applicable local gate in the Story 1.20 release-decision view is pass
**And** the exact replacement value is frozen without changing deployment state.

**Given** separate activation approval
**When** the whole ProductionActivationManifest is replaced atomically
**Then** `local.enabled=true` and `domain.enabled=false`
**And** domain refs, `receiver_ref`, and `receipt_claim_ref` are null
**And** shared generation, judge, and semantic refs appear exactly once.

**Given** a domain request in this phase
**When** it runs
**Then** Story 1.16's closed dispatch invokes Story 1.23's canonical assembled writer under domain request scope and produces effective local mode with the plain-language notice
**And** no scanner, EvidenceProvider, legacy generator, global `w:` write, or domain permalink is reachable.

**Given** an activation rollback
**When** it executes
**Then** the whole manifest is removed or replaced atomically and runtime returns to Story 1.25's inactive safe posture
**And** stale refs cannot reactivate
**And** code-deployment rollback remains separate authority.

## Epic 2: Website-Grounded Sparks — domain mode live in production

### Story 2.1: Robots-Aware Public-Site Scanning

As a business owner,
I want only my submitted public site scanned within strict limits,
So that personalization never becomes surveillance or SSRF.

**Requirements:** FR2; FR8; NFR1; NFR3

**Dependency:** Stories 1.1 and 1.16.

**Acceptance Criteria:**

**Given** a validated public HTTP(S) domain
**When** the scanner runs
**Then** robots.txt is checked for the declared agent
**And** cookies, sessions, reviews, off-site links, private hosts, credentials, alternate ports, and disallowed redirects reject
**And** 4s, 3-page, 512KB, and redirect limits remain enforced.

**Given** retrieved responses
**When** canonical text is prepared
**Then** PII/contact strings are detected in the ephemeral buffer and discarded
**And** only allowlisted source text and source IDs survive
**And** insufficiency returns a typed downgrade reason.

### Story 2.2: Domain Evidence Contract and Offline Adapter

As a developer,
I want a strict EvidenceProvider port and source-bound AD-4 output,
So that untrusted scan material cannot become invented business evidence.

**Requirements:** FR2; FR8; AD-4; AD-11

**Dependency:** Stories 1.7 and 2.1.

**Acceptance Criteria:**

**Given** sanitized scan output
**When** the request is assembled
**Then** only canonical allowed text enters the provider
**And** the returned object is closed, versioned, source-traceable, and frozen before evidence_ref.

**Given** adapter fixtures
**When** offline validation runs
**Then** fabricated, PII-bearing, ambiguous, untraceable, malformed, oversized, and mistyped evidence rejects
**And** no partial Evidence or network call occurs.

### Story 2.3: EvidenceProvider Structural Qualification

As an operator,
I want independent live EvidenceProvider qualification,
So that domain inference uses no borrowed generation or judge evidence.

**Requirements:** FR2; FR8; NFR2; NFR4; AD-11

**Dependency:** Stories 1.2, 2.1, and 2.2; exact live authority is additionally required.

**Acceptance Criteria:**

**Given** frozen primary/fallback Evidence identities
**When** exact-run authority is requested
**Then** privacy preprocessing, prompt, schema, adapter, runtime, call cap, maximum cost, and retained fields are disclosed.

**Given** fresh approval
**When** qualification runs
**Then** one probe and at least 20 sequential trials run per configuration
**And** direct-valid source-bound Evidence requires at least 95% independently
**And** NO-GO blocks domain inference without consuming judge recovery.

### Story 2.4: Evidence Eligibility and Honest Downgrade

As a visitor,
I want deterministic domain eligibility with a useful local fallback,
So that the product never pretends weak evidence is personalization.

**Requirements:** FR2; FR8; NFR5

**Dependency:** Stories 1.13 and 2.2.

**Acceptance Criteria:**

**Given** validated domain Evidence
**When** eligibility runs
**Then** domain requires clarity clear, a verified observation, and nonempty capabilities
**And** failure before provider use freezes E=0; invoked Evidence failure freezes E=1
**And** no second Evidence call occurs.

**Given** any downgrade
**When** local generation proceeds
**Then** effective mode is local with stable notice
**And** request scope remains domain-specific
**And** sanitized scan fragments never mix into local Evidence.

### Story 2.5: One Safe Breadcrumb and Domain Grounding

As a developer,
I want mechanical one-Breadcrumb and claim grounding rules,
So that a business receives one useful observation, not an audit trail.

**Requirements:** FR2; FR6; FR8; FR9

**Dependency:** Stories 1.7, 2.1, and 2.2.

**Acceptance Criteria:**

**Given** a domain Candidate and source-bound Evidence
**When** Local Gate evaluates it
**Then** exactly one Breadcrumb is an exact canonical substring
**And** PII/name fail or unknown rejects
**And** every business claim and number has one passing grounding entry
**And** capability inventories, duplication, fabricated numbers, audit lists, and multi-findings reject.

**Given** rendering fixtures
**When** domain output renders
**Then** only the one Breadcrumb is visible
**And** source URLs and internal grounding reports are not exposed.

### Story 2.6: One-Hour Domain Result Lifecycle

As a business owner,
I want domain-scoped Briefs to expire exactly one hour after commit,
So that business-specific output cannot become a durable public artifact.

**Requirements:** FR9; FR11; NFR1; AD-7

**Dependency:** Story 1.14.

**Acceptance Criteria:**

**Given** a committed domain-scope result
**When** COORD writes it
**Then** committed_at and expires_at are immutable and exactly one hour apart
**And** receipt, pw: projection, and API eligibility share the boundary
**And** reads never slide expiry.

**Given** before, at, and after expiry
**When** every read path runs
**Then** /s/:id always refuses domain artifacts
**And** /api/spark/:id fails at or after expiry
**And** alarms are best-effort cleanup and cannot restore eligibility.

### Story 2.7: Domain Pipeline Integration

As a developer,
I want eligible website Evidence carried through the exact shared pipeline,
So that domain specificity cannot create a second ungoverned generation path.

**Requirements:** FR2–FR6; FR8–FR11; NFR1–NFR5

**Dependency:** Stories 1.11–1.16 and 2.1–2.6; all applicable structural refs must be GO for live use.

**AC-to-requirement map:** identity reuse → FR3, AD-11; E=1 pair bound and domain retries → FR4, NFR4; domain-scoped commit → FR9, FR11, AD-7.

**Acceptance Criteria:**

**Given** eligible Evidence
**When** Generate and Gate run
**Then** the exact Story 1.11 generation identity is reused
**And** only tagged Evidence/full-request inputs differ
**And** no mode-specific provider, prompt, schema, adapter, parameters, retries, or parallel path exists.

**Given** a domain attempt
**When** the orchestrator runs
**Then** E=1 permits at most two complete pairs
**And** grounding and semantic rejection remain domain retries
**And** accepted output commits under domain request scope and never populates global w:.

### Story 2.8: Domain Full-Request Qualification

As an operator,
I want source-bound end-to-end domain evidence,
So that the scanner, EvidenceProvider, shared pipeline, commit, and expiry are proven together.

**Requirements:** FR2–FR6; FR8–FR11; NFR1–NFR5

**Dependency:** Stories 1.18–1.20 and 2.3–2.7; exact live authority is additionally required.

**AC-to-requirement map:** frozen plan → FR8, NFR1; scan-through-commit run → FR2–FR6, FR11, NFR2, NFR4; readiness derivation → NFR5.

**Acceptance Criteria:**

**Given** matching Evidence, generation, judge, semantic, commit, and expiry evidence
**When** a controlled target plan is approved
**Then** targets, call cap, maximum cost, retained fields, and privacy treatment are frozen.

**Given** fresh live authority
**When** the run executes and verifies
**Then** scan through COORD read/commit is exercised
**And** grounding, binding, ledger, deadline, expiry, usage, cost, and hashes pass
**And** no retry, replacement, real contact, or deployment occurs.

**Given** verified results
**When** domain full-request readiness is derived
**Then** every predicate in the Story 1.3 verifier's closed predicate list must pass
**And** failure keeps domain disabled while local mode remains available.

### Story 2.9: Governed-Path Verification and Legacy Quarantine

As a developer,
I want proof that domain activation introduces no legacy or parallel generation path while quarantined code remains recoverable,
So that domain mode goes live on the same governed pipeline without premature destructive deletion.

**Requirements:** FR1–FR4; FR8–FR10; NFR5

**Dependency:** Stories 1.26 and 2.1–2.8.

**Acceptance Criteria:**

**Given** the legacy generator already unreachable since Story 1.26 and the domain pipeline about to activate
**When** routing is verified
**Then** no flag, missing ref, provider failure, or fallback selects legacy axis, personalization output, or a domain-specific parallel path
**And** domain insufficiency still downgrades through the governed local path
**And** legacy code is quarantined and unreachable but not destructively deleted.

**Given** characterization and current tests
**When** verification runs
**Then** visitor-visible route, error, cache, scan, fallback, and rendering behavior remains covered
**And** deletion and rollback-reader retirement remain explicitly deferred to Story 5.2.

### Story 2.10: Domain Production Activation

As an operator,
I want domain mode enabled by one atomic activation-manifest replacement,
So that website grounding goes live without partial state.

**Requirements:** FR2–FR3; FR8–FR9; FR11; NFR1–NFR5; AD-11

**Dependency:** Stories 2.8–2.9; explicit domain-activation approval is required.

**AC-to-requirement map:** cross-mode identity → FR3, AD-11; preflight/replacement → FR11, AD-11; expiry → FR9, NFR1; rollback → NFR5.

**Acceptance Criteria:**

**Given** cross-mode activation fixtures
**When** identity is compared
**Then** generation, judge, semantic, prompt, schema, adapter, runtime, and policy hashes are byte-identical between local and domain
**And** any mode-specific structural override rejects.

**Given** current STRUCT-EVIDENCE and domain FULL-PAIR refs
**When** domain-activation preflight runs
**Then** every domain gate in the Story 1.20 release-decision view is pass
**And** domain expiry is fail closed
**And** dry run creates no resource.

**Given** explicit domain-activation approval
**When** activation executes
**Then** the ProductionActivationManifest is replaced atomically with domain.enabled=true plus the exact Evidence and domain full-request refs
**And** shared generation, judge, and semantic refs are unchanged and appear once.

**Given** a rollback
**When** it executes
**Then** the local-only manifest is restored atomically
**And** domain expiry remains fail closed.

## Epic 3: Production Proof, Launch Gate, and Receipt Claim

### Story 3.1: Production Receipt Verification Harness

As a test architect,
I want a closed offline harness for same-window production proof,
So that later local and domain production runs cannot improvise their evidence or classifications.

**Requirements:** FR11; NFR2; NFR4; NFR5

**Dependency:** Story 1.26. The harness is mode-parameterized and completes offline; Story 2.10 and production activity are not required.

**Acceptance Criteria:**

**Given** local and domain verification cases
**When** the harness is built
**Then** revision, activation ref, scope, normalized inputs, timing, receipts, response hashes, ledger, and outcomes use a closed schema
**And** the verifier recomputes hashes, classifications, concurrency totals, byte identity, and deterministic Markdown.

**Given** domain rate limiting
**When** preflight is tested
**Then** all ten slots must be unused
**And** the live plan uses exactly ten synchronized requests with no preliminary, retry, bypass, reset, distribution, or replacement.

**Given** offline fixtures
**When** verification runs
**Then** unknown, sensitive, malformed, drifted, and inconsistent evidence rejects
**And** no provider or production activity occurs.

### Story 3.2: Local Production Receipt Verification Run

As an operator,
I want one approved local concurrency proof against the deployed artifact,
So that the first owner review rests on observed local production behavior.

**Requirements:** FR11; NFR2; NFR4; NFR5

**Dependency:** Stories 1.26 and 3.1; exact LIVE-AUTH and RELEASE-ONLY approval is required.

**AC-to-requirement map:** disclosure/approval → NFR4; local cold request and synchronized burst → FR11, NFR2, NFR5; LOCAL PASS derivation → FR11.

**Acceptance Criteria:**

**Given** a frozen revision and passing local preflight
**When** live authority is requested
**Then** origin, target, request and concurrency counts, call cap, maximum cost, interval, and retained fields are disclosed
**And** approval authorizes only this run.

**Given** the approved local run
**When** local verification executes
**Then** local verification uses one cold request followed by a synchronized burst of at least ten identical requests in the same seed window
**And** one winner commits for the local scope
**And** successful responses are byte-identical
**And** waiters finish within limits.

**Given** verified local evidence
**When** LOCAL PASS is derived
**Then** every applicable local identity, isolation, expiry, ledger, denominator, and artifact-integrity predicate from the Story 3.1 closed harness schema passes
**And** failure preserves evidence and blocks dependent review, observation, and claims
**And** a rerun requires a new plan and approval.

### Story 3.3: First Owner Review Cycle

As the product owner,
I want one completed production review cycle and a durable governing runbook,
So that disagreements have an owner and weekly review can continue without a never-done sprint story.

**Requirements:** FR3; FR5–FR7; SM-2; SM-3; owner: Justin

**Dependency:** Story 3.2 LOCAL PASS. Recurring weekly review after this story follows the owner-review runbook and is not a sprint story.

**Acceptance Criteria:**

**Given** local production samples after Story 3.2 LOCAL PASS
**When** the first review cycle is prepared
**Then** owner-review runbook version 1 exists as the governing record with sample sources, record fields, triage routes, requalification authority, and the rule that thresholds never move after observing results
**And** the cycle sample is exactly 20 Briefs, filled from available local production serves first, then generated and house fixtures
**And** already-eligible domain Briefs may supplement the sample but are never a prerequisite
**And** the cycle does not wait for Story 2.10 or organic volume.

**Given** the 20-Brief sample
**When** Justin reviews it
**Then** each item records agree/should_fail, stable reasons, rationale, mode, source class, rubric identity, deployed identity, runbook version, exact runbook SHA-256, and review time
**And** a durable first-cycle review record is written
**And** insufficient organic volume does not leave the story incomplete.

**Given** a disagreement
**When** triage runs
**Then** rubric issues amend semantic fixtures
**And** house issues amend the catalog
**And** structural identity changes invalidate structural and all dependent evidence
**And** thresholds and historical records are never reinterpreted after observing results
**And** Story 1.4 recovery limits remain unchanged.

**Given** requalification is proposed during the cycle
**When** a new run is requested
**Then** exact scope, calls, cost, invalidation, and approval are explicit
**And** a failed attempt does not reactivate
**And** later weekly cycles follow the same versioned, hash-bound runbook and are not additional sprint stories.

### Story 3.4: Domain Production Receipt Verification Run

As an operator,
I want one approved domain concurrency proof against the activated artifact,
So that launch and receipt claims rest on observed domain production behavior.

**Requirements:** FR11; NFR2; NFR4; NFR5

**Dependency:** Stories 2.10, 3.1, 3.2 LOCAL PASS, and 3.3; exact LIVE-AUTH and RELEASE-ONLY approval is required.

Stories 3.3 and 2.10 are independent prerequisites that may complete in either order and converge here; neither depends on or grants authority to the other.

**AC-to-requirement map:** disclosure/approval → NFR4; exact ten-request domain proof → FR11, NFR2, NFR5; DOMAIN PASS derivation → FR11.

**Acceptance Criteria:**

**Given** the activated domain contract and Story 3.1 harness
**When** domain preflight runs
**Then** all ten rate-limit slots are unused
**And** origins, targets, exact request and concurrency counts, call cap, maximum cost, interval, and retained fields are disclosed
**And** the plan contains exactly ten synchronized requests with no preliminary request, retry, bypass, reset, distribution, or replacement
**And** approval authorizes only this run.

**Given** the approved domain run
**When** the ten synchronized requests execute
**Then** there is one winner and nine contenders
**And** one winner commits for the domain scope
**And** successful responses are byte-identical
**And** waiters finish within limits
**And** the winning request has one six-call ledger.

**Given** verified domain evidence
**When** DOMAIN PASS is derived
**Then** every applicable identity, isolation, expiry, ledger, denominator, and artifact-integrity predicate from the Story 3.1 closed harness schema passes
**And** failure preserves evidence and disables dependent gates and claims
**And** a rerun requires a new plan and approval.

### Story 3.5: Quiet-Production House-Rate Gate — Operational Checkpoint

As the product owner,
I want the house-Brief served-event ratio observed before public promotion,
So that launch depends on real product behavior.

**Requirements:** NFR5; AD-8; owner: Justin

**Work type:** Non-estimated operational checkpoint; not implementation work.

**Dependency:** Story 3.4 DOMAIN PASS; separate quiet-production observation approval is required.

**Acceptance Criteria:**

**Given** Story 3.4 DOMAIN PASS and an approved quiet-production state
**When** the observation begins
**Then** COORD baseline totals, deployed identity, catalog, exact HTTP interval, query/config hashes, and policy are frozen and recorded
**And** the product is organically accessible but unpromoted.

**Given** organic events accumulate
**When** eligibility is evaluated
**Then** at least 100 authoritative serves are required
**And** synthetic, verification, monitoring, retry, and replacement traffic is excluded
**And** slow organic accumulation remains legitimately in progress and creates no delivery estimate or authority to manufacture traffic.

**Given** at least 100 eligible serves and a closed interval
**When** PASS is calculated
**Then** `house_briefs_served * 100 < briefs_served * 10` uses integer arithmetic
**And** complete aggregate HTTP class coverage is required
**And** every unexplained 5xx review is cleared before PASS and never changes the ratio
**And** raw logs and visitor-level data are not retained.

### Story 3.6: Receipt Claim Approval and Activation

As the product owner,
I want exact public receipt wording bound to verified evidence,
So that Oddspark claims no more than production proved.

**Requirements:** FR11; owner: Justin

**Dependency:** Story 3.4 DOMAIN PASS and Story 3.5 PASS; separate approval of exact wording and claim activation is required.

**Acceptance Criteria:**

**Given** passing current domain production proof and quiet-production gate
**When** exact wording is reviewed
**Then** the ReceiptClaimManifest binds proof ref, deployed identity, copy hash, approver, time, and active outcome
**And** copy states committed-artifact reproducibility, not model determinism or universal availability
**And** the manifest lists every visitor-visible string it authorizes, including whether the strike-note sentence "Same window, same spark." is included.

**Given** separate claim approval
**When** the activation value is replaced atomically
**Then** `receipt_claim_ref` matches the exact manifest
**And** missing, stale, or mismatched proof renders non-claiming copy on every surface: formula panel, /how, and strike note
**And** "Same window, same spark." renders only when that exact wording is in the current approved copy hash.

## Epic 4: Trustworthy Contact Handoff

### Story 4.1: Aggregate Invitation Event Endpoint

As the product owner,
I want privacy-preserving invitation-event measurement,
So that engagement is observable without visitor tracking.

**Requirements:** FR7; NFR1; AD-8

**Dependency:** Stories 1.14–1.15 and 2.6; UX Decision Record (UX-DR6).

**Acceptance Criteria:**

**Given** POST /api/cheer
**When** a valid eligible committed artifact is submitted
**Then** COORD atomically records one invitation_acted event
**And** repeated actions remain separate events
**And** invalid input, origin, artifact, expiry, rate limit, or COORD uncertainty records none.

**Given** reporting
**When** SM-1 is calculated
**Then** it is invitation_acted / briefs_served
**And** it is labeled approximate and non-deduplicated
**And** receiver-activation coverage is disclosed
**And** no visitor identity key is added.

### Story 4.2: Hearn Sender Contract and Plain-Link Fallback

As a developer,
I want a safe reference-bearing sender that defaults to an ordinary contact link,
So that contact remains available without false measurement or data leakage.

**Requirements:** FR7; NFR1; NFR3; AD-10

**Dependency:** Stories 1.15 and 4.1; UX Decision Record (UX-DR4, UX-DR6).

**Acceptance Criteria:**

**Given** a rendered eligible Brief
**When** the invitation renders without an active receiver
**Then** it uses fixed https://hearn.systems/contact
**And** it does not POST, attach a spark ID, or count an invitation event.

**Given** an active receiver fixture
**When** the native POST and redirect are tested
**Then** only validated spark and anti-abuse fields submit
**And** 303 destination is fixed and allowlisted
**And** no domain, Brief text, Evidence, provider, or visitor data enters the URL.

**Given** reference disclosure
**When** copy renders
**Then** fixed text states local references expire after 30 days and website/domain references after one hour
**And** no later recovery promise or countdown state exists.

### Story 4.3: Hearn Receiver Contract Verification

As a developer,
I want Oddspark to verify the deployed Hearn contact form against the closed receiver contract,
So that reference-bearing handoff activates only against a receiver that provably preserves the opaque reference.

**Requirements:** FR7; AD-10; external dependency: Hearn Systems repository

**Dependency:** Story 4.2; external: the Hearn Systems contact-form change (source=oddspark + spark preservation) is a separately governed story in the Hearn repository — its deployed revision is an input to this story, not a deliverable of it.

**Acceptance Criteria:**

**Given** a deployed Hearn contact-form revision
**When** the receiver fixture exercises source=oddspark and spark
**Then** the form visibly labels and preserves the bounded opaque reference through errors and submission
**And** malformed, duplicate, oversized, or unsafe query values are ignored
**And** no Brief content persistence is observed
**And** any failure keeps Oddspark in plain-link posture.

**Given** the shared contract and receiver deployment
**When** verification runs
**Then** origin, path, query keys, contract version, revision, reference preservation, and outcome form the closed HearnReceiverManifest
**And** no real person is contacted without separate approval.

### Story 4.4: Hearn Reference Handoff Activation

As an operator,
I want reference-bearing contact enabled only for a verified receiver,
So that the CTA remains safe across cross-repository drift.

**Requirements:** FR7; AD-10

**Dependency:** Stories 1.26 and 4.3; separate reference-handoff approval is required.

**Acceptance Criteria:**

**Given** a passing current HearnReceiverManifest
**When** handoff activation is proposed
**Then** contract version, origin, path, keys, deployed revision, and reference behavior match
**And** any relevant change on either side makes proof stale.

**Given** separate release approval
**When** the production activation value is replaced
**Then** receiver_ref activates native POST, one invitation event, and fixed 303
**And** failure or withdrawal atomically restores plain-link posture
**And** no real contact submission is part of verification.

## Epic 5: Governed Legacy Retirement

### Story 5.1: Closed Legacy-Retirement Oracle

As an operator,
I want a versioned, hash-bound inventory and reachability proof for every proposed deletion,
So that destructive retirement has a closed scope and cannot infer targets during execution.

**Requirements:** FR10; NFR5; AD-6; AD-11

**Dependency:** Stories 2.9 and 3.5 PASS.

**Acceptance Criteria:**

**Given** the frozen deployed revision and current evidence refs
**When** `LegacyRetirementInventory v1` is produced
**Then** every deletion target names one exact path and symbol or frozen range, its pre-delete blob hash, its unreachable-since activation ref, the reachability command and output hash, and frozen characterization commands
**And** no glob, directory, wildcard, "related helper," or inferred target is permitted
**And** compatibility readers, migration and historical evidence, active routes, Durable Object exports and bindings, deployment config, rollback assets, and remote resources are enumerated separately as protected retains.

**Given** an inventory target
**When** reachability is evaluated from every production entry point, export, route, binding, and dynamic-registration seam
**Then** every inbound reference is absent or names another exact target in the same inventory
**And** the frozen characterization commands pass before deletion
**And** reference uncertainty, dynamic-registration uncertainty, hash drift, an open rollback window, a missing command, or a failed characterization sets the inventory outcome to blocked
**And** a blocked outcome leaves code unchanged.

**Given** a passing inventory
**When** Story 5.1 completes
**Then** its exact canonical bytes and SHA-256 are retained
**And** no code or remote resource has been deleted.

### Story 5.2: Destructive Legacy Seam Retirement

As an operator,
I want only the exact approved legacy targets removed after quiet production passes,
So that one governed pipeline remains without sacrificing rollback safety or protected evidence.

**Requirements:** FR1–FR4; FR10; NFR5

**Dependency:** Story 5.1 PASS; separate destructive-retirement approval of the exact inventory SHA-256 is required.

**Acceptance Criteria:**

**Given** the passing `LegacyRetirementInventory v1` and current structural, semantic, local/domain full-request, activation, receipt, expiry, rollback, and quiet-gate evidence
**When** retirement preflight runs
**Then** every inventory target path, symbol or frozen range, pre-delete blob hash, evidence ref, and protected retain matches
**And** every frozen characterization command passes before editing
**And** any mismatch, drift, expanded target, or missing prerequisite leaves code unchanged.

**Given** explicit destructive-retirement approval for the exact inventory SHA-256
**When** deletion runs
**Then** only exact hash-matching inventory targets are removed
**And** no inferred target, expanded target, or extra changed path is accepted
**And** the frozen characterization commands pass after deletion
**And** every protected retain remains byte-identical for its documented window
**And** no remote namespace, binding, route, or resource is deleted.
