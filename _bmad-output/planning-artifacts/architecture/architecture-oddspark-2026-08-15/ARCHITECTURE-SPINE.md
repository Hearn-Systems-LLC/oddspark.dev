---
name: oddspark-opportunity-brief-pipeline
type: architecture-spine
purpose: build-substrate
altitude: feature
paradigm: pipes-and-filters
scope: The coherence-gated Opportunity Brief pipeline inside the oddspark Cloudflare Worker, and its seam with the preserved worker shell.
status: final
created: '2026-08-15'
updated: '2026-08-19'
binds: [CAP-1, CAP-2, CAP-3, CAP-4]
sources:
  - ../../../specs/spec-oddspark-fun-coherent-idea-generation/SPEC.md
  - ../../prds/prd-oddspark-2026-08-15/prd.md
  - ../../prds/prd-oddspark-2026-08-15/addendum.md
  - ../../sprint-change-proposal-2026-08-16.md
  - ../../sprint-change-proposal-2026-08-17.md
  - ../../sprint-change-proposal-2026-08-17-3.md
  - ../../ux-decision-record-oddspark.md
companions:
  - solution-design.md
---

# Architecture Spine — Oddspark Opportunity Brief Pipeline

## Design Paradigm

**Pipes-and-filters, single orchestrator.** The generator is a pipeline of typed, runtime-neutral ES-module stages assembled behind the single public Worker entrypoint. Stages are single-pass: each consumes only the previous stage's output and returns a typed value. The retry loop lives in exactly one place — the strike orchestrator at the existing `buildSpark` / `buildDomainSpark` call sites.

```mermaid
flowchart LR
    IN["POST /api/spark<br/>(button, optional domain)"] --> ORCH["Strike orchestrator<br/>(6-call ledger; complete pairs only)"]
    ORCH --> EV["1 · Evidence<br/>local priors | site scan"]
    EV --> GEN["2 · Generate<br/>one candidate Brief (seeded)"]
    GEN --> GATE["3 · Gate<br/>local checks + one semantic judge"]
    GATE -->|fail| ORCH
    GATE -->|pass| COMMIT["4 · Commit<br/>COORD authority → KV projection"]
    ORCH -->|exhausted| HOUSE["pre-vetted<br/>house Brief"]
    HOUSE --> COMMIT
    COMMIT --> RENDER["5 · Render<br/>HTML / text / JSON"]
```

`Evidence` never calls `Gate`; `Generate` never sees the judge's verdict except as a retry signal from the orchestrator; `Render` never sees free model text. The seed feeds (drand/NOAA) enter at `Generate`; the window pin enters at `Commit`.

## Shared Port Contracts

- `EvidenceContext {attempt_id,evidence,rubric_version}` is the immutable output of Evidence. `Generate` adds only `candidate` and its derived `candidate_ref`. Local Gate then derives and freezes `grounding_report`, producing the complete `AttemptContext {attempt_id,candidate,evidence,grounding_report,rubric_version,candidate_ref}` passed to the judge. No stage receives Gate inputs through closure or mutable shared state.
- `candidate_ref` is `sha256("oddspark-candidate-ref/v1\n" + canonical_json({candidate_schema_version,candidate}))`. Canonical JSON recursively sorts object keys and preserves array order. The provider must echo the exact reference; an adapter may not synthesize or repair it.
- `Evidence` is the closed tagged union defined in AD-4. `GroundingReport` is `{version:int,evidence_ref:string,entries:[{claim_ref:string,source_url:string,source_text:string,exact_match:boolean,pii_status:"pass"|"fail"|"unknown",number_status:"pass"|"fail"|"not_applicable",reason:string}],pass:boolean}` with no unknown fields. `evidence_ref` hashes the canonical Evidence Bundle with a versioned domain separator; every business-specific claim, Breadcrumb, and grounded number has exactly one passing entry. Story 1.7 owns the production validator and fixture detail without changing this port.
- `CanonicalVerdict` and every nested object are closed. Gates contain each integer id 1–9 exactly once and every reason is non-blank. `pass:true` is valid only when all gate, tone, and claims checks pass; `pass:false` remains a fail-safe rejection even if all represented checks are true.
- A committed value is `CommittedBrief {artifact_version, id, request_scope, brief, brief_schema_version, policy_identity, rubric_identity, provenance}`. Readers accept only explicitly supported versions; a supported legacy shim may map losslessly, otherwise the read is a cache miss and the request follows the normal coordinator/house-Brief path. Older code never reinterprets, silently overwrites, or renders a newer artifact.

## Invariants & Rules

### AD-1 — Gates are a pipeline stage, not a filter

- **Binds:** CAP-3, FR-3, FR-4
- **Prevents:** coherence checks decaying into post-hoc style nudges or being bypassed on the happy path
- **Rule:** every rendered Brief is the output of the `Gate` stage (or the pre-vetted house Brief). No code path from `Generate` to `Render` skips `Gate`.

### AD-2 — Gate combines local validation with a separate semantic judge

- **Binds:** CAP-3, FR-3
- **Prevents:** the generator grading its own homework; provider wire shape becoming the internal contract; semantic repair inventing a pass
- **Rule:** `Gate` first runs local AD-4/AD-5 checks for Brief schema, mode/Breadcrumb cardinality, exact grounding, mechanically decidable PII, grounded-number provenance, and Story 1.7's non-model personal-name policy (`fail` or `unknown` rejects without a judge call). A surviving Candidate is sent once to a structurally qualified `JudgeProvider` with its Evidence Bundle, grounding report, rubric/version, and immutable `candidate_ref`. The provider-facing logical result is `JudgeResult {candidate_ref, verdict: CanonicalVerdict}`; the exact echoed reference must match, which proves request/output binding but not semantic evaluation. `CanonicalVerdict` remains exactly `{pass:boolean,gates:[{gate:1..9,pass,reason}],tone:{pass,reason},claims:{pass,reason}}`. A frozen, versioned adapter may remove only validated wrapper metadata and map the inner verdict losslessly; missing reasons, coercion, omission, invention, ambiguity, unknown values, schema drift, or reference mismatch fail. Transport-wrapper repair stays separately measured. The composite Gate passes only when every local/policy check and every canonical semantic check passes.

### AD-3 — Bounded attempts, pre-vetted fallback

- **Binds:** CAP-3, FR-4; cost NFR
- **Prevents:** unbounded LLM spend per button press; near-miss ideas shipping under pressure
- **Rule:** the orchestrator starts only complete generation-to-judge pairs within AD-9's six-call ledger. If evidence consumes `E` model calls, the Candidate ceiling is `min(3, floor((6 - E) / 2))`: `E=0` permits at most 3 Candidates; `E=1` permits at most 2. On exhaustion, insufficient remaining deadline, or any grounding/infra failure that invalidates a Candidate, serve the house Brief: a curated, per-season Coherent Local Mode Brief stored in code, gate-passing by construction and reviewed against the voice rubric before launch.

### AD-4 — Evidence boundary with single-owner grounding

- **Binds:** CAP-2, FR-2, FR-8, FR-9; privacy guardrail
- **Prevents:** business-specific "facts" smuggled in from model pretraining; breadcrumb PII leaks; audit creep; two stages disagreeing about what "grounded" means
- **Rule:** Website-Grounded Evidence is exactly `{version:int,mode:"domain",vertical:string,clarity:"clear"|"unclear",capabilities:string[],channels:string[],observation:{source_id:string,url:string,text:string},scanned_urls:string[]}`. Coherent Local Evidence is exactly `{version:int,mode:"local",priors:{region:string,season:string,date:string,situation:string,capability_bundle:string[]}}`. All fields are required and unknown fields reject. A submitted public response may contain PII only in the ephemeral scan buffer; detected PII is discarded before evidence persistence or model input. After Generate, Local Gate derives grounding once against scan text canonicalized through the existing `normalizeSpace`/`observationSpan` helpers — never re-verified by the judge against raw HTML. Every business-specific claim and grounded number must trace to the bundle; every quoted Breadcrumb must be an exact substring of canonical text and pass mechanically decidable PII checks plus Story 1.7's pure, Node-importable personal-name policy. That policy returns `pass|fail|unknown`, records a stable reason in the grounding report, consumes no model call, and rejects on `fail` or `unknown`. A grounding/privacy failure rejects the Candidate (orchestrator retries per AD-3) — it never silently downgrades mode and the semantic judge cannot override it. Mode downgrade happens only at the evidence threshold (`clarity=clear` ∧ ≥1 verified observation ∧ non-empty `capabilities[]`), evaluated before generation, falling back to Coherent Local Mode with the plain-language notice. Scanning respects robots.txt. The bundle replaces `hashProfile`'s preimage; `profile_hash` is recomputed over the new bundle shape with a version bump. [ADOPTED: threshold from user-reviewed PRD OQ5.]

### AD-5 — Brief is a typed schema; claim discipline is structural

- **Binds:** CAP-4, FR-5, FR-6, FR-7
- **Prevents:** renderers consuming free text; fabricated numbers; audit-list drift; CTA pitch drift; Generate and Render diverging on field shape
- **Rule:** a Brief is one JSON object, all string fields plain text unless noted:
  ```
  {version: int, mode: "local"|"domain",
   title: string, plan: string,
   why_fits: {text: string, breadcrumb?: string},
   what_gets_better: string,
   before_after: {before: string, after: string},
   change_level: {time_range: string, steps_changed: int, steps_removed: int, preliminary: true},
   stays_same: {tools: string[], authority: string[], steps: string[]},
   invitation: string,
   notice?: string,            // plain-language fallback notice (AD-4)
   grounded_numbers: string[]} // the only numeric strings allowed outside change_level,
                               // each locally provenance-verified as site-supplied
  ```
  `version` is an integer bumped on any shape change (matching the `PERSONALIZATION_VERSION` precedent). `mode` is the single authority renderers branch on — the legacy `personalization.status` branching is removed. All renderers (HTML, `asText`, `/api/spark/:id`) consume this schema — never raw model output.

### AD-6 — Preservation seam at the generation port

- **Binds:** FR-10, FR-11; all preserved shell behavior
- **Prevents:** the pipeline rewrite entangling router, KV, DOs, page shell, or seed feeds
- **Rule:** the pipeline replaces only the internals of `generate` / `generatePersonalized` behind their existing call sites. Shell → pipeline dependency only; the pipeline never calls back into router, page, or render code. Router, KV key scheme, seed feeds, scan budgets, and the page shell remain preserved except for five closed architecture-authorized seams: AD-4 (`profile_hash` preimage), AD-7 (coordinator receipt/read/commit and id validation), AD-8 (atomic aggregate metrics), AD-10 (`POST /api/cheer`), and AD-12 (strike/result representations). AD-12 authorizes exactly the governing UX record's D1, D1a, D2, D2a, and D3–D24 rows—no more. It does not authorize new generation inputs, routes beyond `/api/cheer`, cache identities, persistence, client product state, analytics, provider activity, or cross-repository work. Any new, renumbered, or materially changed UX delta requires architecture reconciliation.

### AD-7 — Cache-first commit preserves the receipt

- **Binds:** FR-11, OQ1 (resolved)
- **Prevents:** LLM nondeterminism breaking same-window reproducibility; two visitors in one window seeing different sparks
- **Rule:** the first gate-passing Brief in a seed window (or per `(round, domain)` claim — including the house Brief, which commits like any other artifact) is committed authoritatively through COORD claim/commit. The coordinator receipt contains the complete `CommittedBrief`; `w:` / `pw:` remain best-effort read projections. On a missing or stale KV pin, readers consult COORD before generating, so same-window identity depends on the coordinator rather than KV propagation. Concurrent strikes converge on one committed receipt. The system claims *committed-artifact reproducibility*, never model determinism. Request scope owns the cache key: a domain request that downgrades to a local Brief remains under its `pw:`/domain claim and never populates global `w:`. Effective mode owns presentation; request scope constrains permalink eligibility. Local public artifacts and their authoritative receipts expire exactly 30 days after commit, approved by Justin on 2026-08-17; `/s/:id` returns not found at or after that boundary. Domain-scoped artifacts are internal-cache only: `/s/:id` always refuses them, while `/api/spark/:id` may return them only during the first hour after authoritative commit. The domain-result TTL is exactly one hour, approved by Justin on 2026-08-17 and implemented by Story 2.6; expiry applies consistently to the coordinator receipt, `pw:` projection, and API eligibility. **Carve-out to AD-6:** SparkCoordinator claim/read/commit validation and `SPARK_ID_RE` are amended to accept, store, and return the versioned Brief artifact; metrics add the narrow AD-8 coordinator operation. UI copy keeps the PRD FR-11 interim stance: no reproducibility promise is added until cache-first behavior is verified in production.

### AD-8 — Server-side aggregate analytics only

- **Binds:** SM-1 and aggregate operational measurement; privacy guardrail; OQ4 (resolved). SM-2 remains sampled Brief review; SM-3 remains separately attributed inbound-conversation review.
- **Prevents:** analytics reintroducing per-visitor tracking through the back door
- **Rule:** aggregate counters are atomically owned by a narrow COORD `/metric` operation: `briefs_served` increments only after an authoritative committed/house receipt is successfully resolved for rendering; `house_briefs_served` is its house-Brief subset; `invitation_acted` records an accepted `POST /api/cheer`. A `400`, `404`, or `502` response increments none of these served-outcome counters. SM-1 is the approximate aggregate event rate `invitation_acted / briefs_served`; it is intentionally not deduplicated per visitor or render, may be skewed by repeat actions, and must never be presented as a true people/render percentage. Reports disclose receiver-activation coverage for the interval because plain-link fallback actions intentionally emit no event; this is release-state metadata, not another visitor counter. The launch fallback gate is the served-event ratio `house_briefs_served / briefs_served`, measured from authoritative COORD totals over at least 100 production serve events; public launch requires the exact integer comparison `house_briefs_served * 100 < briefs_served * 10` (strictly below 10%), approved by Justin on 2026-08-17. Slow accumulation is a schedule observation: the sample remains incomplete and cannot be manufactured or weakened. The separate same-interval availability record retains only aggregate response-class totals, interval/coverage metadata, deployed identity, and hashes of the platform query/configuration; raw logs, IPs, URLs, query strings, submitted domains, and artifact ids never enter repository evidence. `m:<day>:*` KV values are report/read snapshots only, never the increment authority. No per-visitor analytics keys are introduced beyond the existing abuse carve-out (hashed-IP slot window, profile cache).

### AD-9 — All model spend shares one ledger and hard deadline

- **Binds:** cost NFR; AD-3
- **Prevents:** the gate stage silently multiplying per-press cost; a strike hanging
- **Rule:** the deadline starts at route entry and covers evidence, every model call, gating, and coordinator commit. Evidence freezes `E` before Candidate attempts begin. Before a pair, the orchestrator atomically reserves one generation slot and one judge slot; it consumes the generation slot immediately before invocation and consumes the judge slot immediately before judge invocation. If local validation rejects the Candidate, the unused judge reservation is released; invoked errors, invalid output, and timeouts remain consumed. No partial pair starts when the complete reservation or declared timeouts plus commit reserve cannot fit. Every call uses its role-specific AD-11 selector and the common six-call ledger/deadline. For Workers AI, `NeuronMeter` remains best-effort and fail-open by established convention: authorization/meter failure increments an anomaly but creates no additional ledger capacity. Another provider needs a separately approved cost-control convention before qualification. Story 1.4 measures isolated judge latency/cost; Story 1.19 sets role allocations and full-pair readiness under the provisional 15-second ceiling. Unknown, unavailable, unqualified, over-budget, or over-deadline configurations serve the house Brief.

### AD-10 — Interaction contract unchanged

- **Binds:** FR-10
- **Prevents:** pipeline complexity leaking into the UI
- **Rule:** one button, one optional domain field. Mode selection is implicit in domain presence. The only new endpoint is `/api/cheer` (AD-8); no new generation inputs, fields, or client state. The receiver identity is the closed `HearnReceiverManifest {version:int,contract_version:int,origin:"https://hearn.systems",path:"/contact",query_keys:["source","spark"],deployed_revision:string,verified_at:string,outcome:"pass"}` with no unknown fields, and `receiver_ref = sha256("oddspark-hearn-receiver/v1\n" + canonical_json(HearnReceiverManifest))`. With an exact matching active receiver ref, an accepted invitation POST atomically records `invitation_acted` and returns a fixed `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>`. The destination is allowlisted, never request-controlled, and carries only the opaque artifact id—no domain, Brief text, title, seed, Evidence, or visitor data. Before the action, adjacent fixed plain-language copy states that local references expire 30 days after creation and website/domain references expire one hour after creation; no countdown state is introduced. Hearn's contact form must visibly preserve that reference in its submission before activation; this cross-repository change requires separate authority. The reference identifies an exact committed artifact, and neither system promises later content availability. A change to the shared contract version, receiver deployment, approved origin/path/query keys, or reference-preservation behavior makes receiver proof stale and requires separately authorized Hearn re-verification. If the manifest/ref is malformed, unknown, stale, failed, mismatched, or withdrawn, the renderer uses the fixed plain Hearn contact link, does not POST `/api/cheer`, and records no `invitation_acted` event. Domain content remains subject to the one-hour Oddspark read boundary and is never copied into the contact URL or a new persistence path.

### AD-11 — Evidence, generation, and judge roles qualify independently

- **Binds:** FR-2, FR-3, FR-4; AD-2, AD-3, AD-9; Stories 1.4, 1.11, 1.19, 1.18, 2.3, 2.8
- **Prevents:** an unproven model reaching production; primary/fallback rates being pooled; Story 1.18 becoming an unbounded provider bakeoff
- **Rule:** generation and judge use separate role configurations even when they share a provider/model. A structural identity freezes provider, resolved model (after alias/default resolution), request parameters, prompt-template hash, provider-wire-schema hash, adapter hash, candidate-binding version, runtime/version, and timeout/call-policy hash. A semantic identity versions the rubric and golden/anti-golden corpus. The closed `QualificationManifest` is `{version,role,provider,resolved_model,request_parameters,prompt_template_sha256,wire_schema_sha256,adapter_sha256,binding_version,runtime,timeout_policy_sha256,semantic_identity_sha256,fixture_result_sha256,trial_counts,rates,latency_cost,outcome,approval_run_id,tested_source_identity}` and `qualification_ref = sha256("oddspark-qualification/v1\n" + canonical_json(QualificationManifest))`. Before any live qualification, Story 1.2 freezes a reviewed exact Wrangler version, compatibility date, generated bindings, and runtime configuration. Any later change to those inputs invalidates the affected structural evidence and every dependent semantic, full-request, production-verification, launch, and activation record; all affected stages rerun before activation. Story 1.4 and Story 1.11 are independent structural gates: Story 1.4 qualifies each judge primary/fallback for provider-wire/canonical fidelity, binding, and isolated latency/cost; Story 1.11 separately qualifies typed Candidate output. Story 1.18 qualifies semantics and exact predeploy identity; Story 1.19 may implement offline earlier but completes live full-pair latency/cost evidence only after Story 1.14's authoritative commit path exists. Production requires every applicable stage current. Rates never pool; fallbacks never replace failed primary trials. Workers AI is the first recovery provider; external provider or AI Gateway use requires a separate security/operational decision.
- **Atomic activation:** the only production activation input is one closed canonical `ProductionActivationManifest {version:int,deployed_source_identity:string,generation_ref:string,judge_ref:string,semantic_ref:string,local:{enabled:boolean,full_request_ref:string|null},domain:{enabled:boolean,evidence_ref:string|null,full_request_ref:string|null},house_catalog_ref:string,receiver_ref:string|null,receipt_claim_ref:string|null,outcome:"active"}` with no unknown fields. At least one mode is enabled. Local enablement requires its full-request ref; domain enablement requires its Evidence and full-request refs; disabled modes require their mode-specific refs to be null. The shared generation, judge, and semantic refs appear exactly once. The canonical manifest is the single deployment value, and runtime derives `activation_ref = sha256("oddspark-production-activation/v1\n" + canonical_json(ProductionActivationManifest))`; no second deployed hash or individually supplied ref exists. Runtime rejects partial updates, invalid nullability, and stale/failed/mismatched evidence. A missing or invalid manifest disables model roles, stronger receipt copy, and reference-bearing handoff without crashing the public shell; requests consult the authoritative committed/approved house path when COORD and the deployed catalog remain valid, otherwise they return the defined `502`. Existing platform observability exposes only a stable redacted activation reason code and creates no counter, KV key, or COORD record. The manifest is published only after the compatible reader, authoritative coordinator path, new writer, exact semantic/predeploy evidence, and full-request evidence are complete. Rollback preserves a compatible reader and atomically removes or replaces the whole value. Evidence-v2 is a new manifest, never an overwrite of v1. Production pair selection resolves each role before reservation: use the qualified primary when available, otherwise the qualified fallback. Once a pair starts, roles do not change. After an invoked primary returns `unavailable`, `circuit_open`, `timeout`, or invalid provider output, the failed call remains consumed; a subsequent new pair may select fallback only if a complete pair and deadline still fit. No other failure class switches roles, and the same Candidate is never re-judged.
- **Release decision:** the deterministic closed release-decision view is derived on demand from the deployed source identity, activation ref, and every applicable existing evidence and approval gate. It represents each gate as `pass|blocked|stale|unapproved` with an exact evidence ref or stable reason code; omission rejects and overall readiness requires every applicable gate to pass. It creates no new authority, persistence path, KV key, COORD record, or approval record. Deployment, quiet-production observation, public promotion, receipt-claim activation, and destructive legacy retirement remain separate owner decisions whose authority never transfers implicitly.
- **Receipt-claim gate:** the closed `ReceiptClaimManifest {version:int,production_verification_ref:string,deployed_source_identity:string,copy_sha256:string,approved_by:string,approved_at:string,outcome:"active"}` has no unknown fields and hashes as `receipt_claim_ref = sha256("oddspark-receipt-claim/v1\n" + canonical_json(ReceiptClaimManifest))`. Stronger receipt/reproducibility copy renders only when the single production activation manifest contains that exact current ref and its deployed identity and approved copy hash match runtime; otherwise non-claiming copy renders.
- **Evidence-role extension:** model-assisted domain Evidence uses a third, independently qualified `EvidenceProvider`, never a borrowed generation or judge qualification. Story 2.3 freezes and qualifies its primary/fallback configurations against the exact closed AD-4 domain Evidence shape; each configuration must independently meet its direct-valid threshold and isolated latency/cost allocation. One invoked Evidence call consumes `E=1`, leaving at most two complete generation-to-judge pairs. The domain section of the production activation manifest additionally names the exact Evidence structural ref and domain full-request evidence. Story 2.8 verifies the domain request including Evidence; Story 1.19's full-request evidence remains the local `E=0` path. An Evidence-role `NO-GO` blocks domain model inference and triggers architecture review without consuming Story 1.4's judge-recovery allowance.

### AD-12 — The strike transport has one outcome and two representations

- **Binds:** FR-4, FR-10, FR-11; UX-DR2–UX-DR5; D1, D1a, D2, D2a, D5, D14, D15
- **Prevents:** progressive enhancement creating a second generation path; representation choice changing terminal precedence, cache identity, permalink privacy, or aggregate metrics
- **Rule:** `POST /api/spark` invokes one validation, pipeline, authoritative commit, and outcome contract. Representation is selected only at the transport boundary:
  1. Explicit `Accept: application/json` wins, even with a form-encoded body.
  2. Otherwise, a request accepting HTML or carrying a browser-form content type receives shell HTML.
  3. Remaining requests preserve existing JSON behavior.
  Responses emit the selected `Content-Type`; the existing `Vary` value retains `Origin` and adds `Accept` and `Content-Type`.
- **Successful delivery:**
  - JSON success returns `200` with the committed artifact. An enhanced local response may apply `history.replaceState` to `/s/:id`; that client-only history mutation performs no request, generation, persistence, or metric increment. Domain-scoped results, including local-mode downgrades, never change the URL.
  - HTML success under local request scope returns `303 /s/:id` after authoritative commit. The redirect renders and counts nothing; the followed eligible `GET /s/:id` re-reads the AD-7 artifact, server-renders the shell, and increments the served metric once. Refresh repeats that GET and never re-strikes.
  - HTML success under domain request scope, including a local-mode downgrade, returns direct `200` home-shell HTML from `POST /api/spark`. The browser URL therefore remains `/api/spark`; no redirect, permalink, or history mutation occurs, and the served metric increments once. A browser refresh may re-submit, but every submission follows the same authoritative domain claim/read path.
  Redirect and permalink eligibility branch on request scope and AD-7 eligibility, not rendered `Brief.mode`.
- **Terminal delivery:** invalid input remains `400`; JSON returns stable `{error,field}`, while HTML returns the UX-governed shell. No strike starts and no served metric increments. COORD or required-infrastructure uncertainty remains `502`; JSON or shell HTML is selected by the same negotiation rule, no artifact renders, and no served metric increments. Unknown, expired, unsupported, or domain-scoped `/s/:id` returns the UX-governed `404` shell without generation or a served metric. Enhanced in-place `400`/`502`/not-found handling follows the governing UX focus rules; a fresh full-document HTML `400`/`502`/`404` response sets no scripted focus.
- **Caching and authority:** dynamic strike, redirect, JSON/HTML result, error, and permalink responses use `Cache-Control: no-store`. COORD remains authority; KV remains a projection; HTTP caches never become artifact authority. An unsupported projection encountered during strike resolution follows AD-7's compatibility/cache-miss rule and is never rendered or silently overwritten.
- **Metric point:** `briefs_served` increments exactly once at successful artifact delivery: the JSON `200`, the domain-scope HTML `200`, or the followed local permalink `GET`—never the local `303` or `history.replaceState`. `house_briefs_served` increments at the same delivery point for a house Brief. Each later successful refresh is a separate, intentionally non-deduplicated serve event; `400`, `404`, and `502` increment neither counter.

### AD-13 — One runtime-neutral pipeline source is assembled before deployment

- **Binds:** AD-1–AD-9, AD-11–AD-12; Stories 1.16 and 1.23–1.26
- **Prevents:** Node-only proof modules diverging from the Worker writer; a substitute Brief being invented at the route boundary; implementation, deployment, and activation authority collapsing into one event
- **Rule:** Evidence, generation, Local Gate, semantic-judge adaptation, strike orchestration, committed-receipt handling, and Brief projection have one canonical runtime-neutral ES-module implementation under `src/pipeline/`. `src/worker.js` imports and assembles those modules behind the existing request boundary, and Node verification imports those same modules. Files under `scripts/` may remain test, qualification, or CLI adapters, but may not contain a second production writer or independently reimplement a closed validator, canonical hash, grounding rule, ledger transition, receipt rule, or projection.
- **Assembly authority:** offline tests may assemble the Worker with injected fake providers, coordinator, clock, storage, and activation ports. This creates no production binding, provider-call, deployment, or activation authority. Model-backed writes remain unreachable until the single current `ProductionActivationManifest` authorizes them.
- **Inactive-domain path:** Story 1.16 derives one closed domain-scope/local-mode dispatch value and never constructs a Brief. Story 1.23 assembles and proves the canonical cold writer offline. During the Story 1.26 local-only activation phase, that writer handles a valid domain request under domain request scope with effective local mode and the fixed notice. No scanner or EvidenceProvider runs, no global `w:` projection is populated, no domain permalink is minted, and no legacy or substitute writer is available.

## Consistency Conventions

| Concern | Convention |
| --- | --- |
| Layout | `src/worker.js` remains the single public Worker entrypoint and route shell. Canonical runtime-neutral pipeline modules live under `src/pipeline/` and are bundled through ordinary local ES-module imports; banner boundaries remain explicit at the entrypoint assembly seam. Constants are hoisted; tunables are consts; model IDs are Wrangler vars. [ADOPTED] |
| Naming | KV keys keep prefix namespacing (`w:`, `pw:`, `profile:`, `n:`, new `m:`); persisted artifacts carry integer `version` + provenance; Brief ids stay `seed[0:8]` / `p-<hash[0:16]>`. [ADOPTED] |
| Data & formats | Failure outcomes follow the precedence table below; AD-12 selects JSON or shell HTML without changing the outcome. No path renders uncommitted generated output, raw model text, or the legacy seed. [ADOPTED] |
| State & mutation | All cross-request coordination via COORD transactions (claim/commit/profile/slot); DO access only through thin `coordPost`/`meterStub` helpers; side effects best-effort with justified try/catch. [ADOPTED] |
| Verification | Pipeline stages and the Brief schema stay Node-importable pure functions. Deterministic transport fixtures cover negotiation precedence, `Content-Type`, merged `Vary`, `Cache-Control`, request-scope redirect eligibility, server-rendered local permalinks, JSON/HTML/`asText` parity, metric increment points, domain permalink refusal, terminal non-counting, and enhanced-versus-fresh-document focus behavior without provider or remote activity. Domain native-form fixtures additionally assert direct `200` with no `Location`, final browser URL `/api/spark`, and refresh re-submission through the same authoritative domain claim/read path. Four provider/pipeline gates stay separate: local deterministic/privacy fixtures; manual live provider-wire/canonical/binding qualification; Story 1.18 semantic calibration against versioned goldens/anti-goldens; Story 1.19 full-pair latency/cost. Story 1.2 toolchain/runtime validation precedes them; later runtime-bound changes invalidate affected evidence transitively. Exact structural and semantic identities bind every retained result; credentialed live tests require fresh approval and never run in CI. |
| Story status | A mixed story remains `in-progress` until all required slices pass. A completed `SAFE` slice is retained evidence, not authority to mark `review`/`done`; `NO-GO`, missing approval, and blocked release work remain explicit despite green offline tests. |
| Mode and cache | Clear domain evidence → domain Brief under domain request scope. Domain downgrade → local Brief plus notice, still under domain request scope. Local request → local Brief under global window scope. Exhaustion → house Brief under the original request scope. Request scope owns claim/cache identity and AD-12 redirect/permalink eligibility; effective mode owns rendering. Dynamic HTTP responses are `no-store`; COORD remains authority and KV remains a projection. |
| Terminal outcomes | The failure-precedence table below is authoritative over generic error/degradation wording elsewhere in this document; AD-12 changes representation, never status or precedence. |
| Development safety | Offline development is the default and has no callable AI binding. A separately invoked live-spike config may use a remote AI binding only with fresh approval; preview/live-spike resources must not bind production KV, DO, routes, assets, or persistent Worker names. |

### Failure precedence

| Condition | Outcome |
| --- | --- |
| Invalid request/domain input | `400`; JSON receives stable `error` and `field`, while any request for which AD-12 selects HTML receives the UX-governed shell HTML representation; no strike starts or served metric increments. |
| Website scan transport failure or insufficient evidence | Explicit local-mode downgrade with notice before generation; no partial domain Evidence Bundle. |
| Seed/feed failure after existing local feed fallbacks are exhausted | Authoritative committed Brief if present; otherwise validated house Brief, provided COORD remains reachable. |
| Candidate local-validation/grounding failure | Release unused judge reservation; retry only when a complete pair and deadline fit. |
| Invoked model/provider/adapter/reference failure | Consume invoked slot; retry under AD-11 only when a complete new pair and deadline fit, otherwise house Brief. |
| Missing/stale qualification, ledger exhaustion, or insufficient model deadline | Read authoritative committed Brief if present; otherwise commit/serve the validated house Brief. |
| COORD read, claim, or commit uncertainty | `502` in the AD-12-selected JSON or shell HTML representation; never render an uncommitted generated or house artifact or increment a served metric. |
| Unrelated required infrastructure failure | `502` in the AD-12-selected JSON or shell HTML representation with the stable error meaning; never substitute an unverifiable result or increment a served metric. |
| Unknown, expired, unsupported, or domain-scoped `/s/:id` | UX-governed `404` shell; no generation and no served metric. |

The house path is therefore graceful only while the authoritative coordinator can confirm or commit the receipt; coordinator uncertainty outranks degradation.

## Stack

| Name | Version |
| --- | --- |
| Cloudflare Workers (compatibility date) | 2026-07-01 (`global_fetch_strictly_public`) |
| Generation candidate — primary | `@cf/openai/gpt-oss-120b` (subject to Story 1.11 qualification) |
| Generation candidate — fallback | `@cf/openai/gpt-oss-20b` (subject to Story 1.11 qualification) |
| Evidence-provider candidate pair | Unset until Story 2.3 freezes it and Justin separately approves the exact run plan |
| Judge recovery candidate pair | Unset until Story 1.4 freezes it and Justin separately approves the exact run plan |
| Production judge role | Disabled until the exact AD-11 structural, semantic, and full-pair qualification stages are current |
| Workers KV | `SPARKS` namespace (existing id) |
| Durable Objects (SQLite) | `NeuronMeter` (v1), `SparkCoordinator` (v2) |
| wrangler | ^4.114.0 (project lockfile) |

## Structural Seed

```text
src/worker.js
  /* Feeds: drand + solar */            (unchanged)
  /* Seed derivation */                 (unchanged; axis lists deleted)
  /* Website input + scan */            (+ robots.txt check)
  /* Evidence assembly */               (extends inferWebsiteProfile → Evidence Bundle, both modes)
  /* Pipeline: generate */              (one candidate Brief, seeded, per mode)
  /* Pipeline: gate */                  (local checks + candidate-bound JudgeResult per AD-2)
  /* House Briefs */                    (curated per season, integer-versioned)
  /* Brief schema + grounding */        (AD-5 shape; AD-4 single-owner grounding)
  /* Strike orchestrator */             (retry loop, STRIKE_BUDGET_MS, house fallback)
  /* Spark assembly + commit */         (cache-first pins; Brief schema stored)
  /* Renderers: page / asText / json */ (consume Brief schema, branch on mode)
  /* Durable Objects */                 (AD-7 receipt/read/commit + AD-8 atomic metrics)
  /* Router */                          (/api/spark negotiation + server-rendered eligible local /s/:id + POST /api/cheer; domain-scope /s/:id refused)
src/pipeline/
  /* Canonical runtime-neutral stages */ (Evidence, Generate, Gate, strike, receipt, projection; imported by Worker and Node verification)
```

## Capability → Architecture Map

| Capability / Area | Lives in | Governed by |
| --- | --- | --- |
| CAP-1 Coherent Local Mode | Evidence (local priors) + Generate | AD-1, AD-3, AD-6 |
| CAP-2 Website-Grounded Mode | Evidence (scan bundle) + independently qualified EvidenceProvider + Generate | AD-4, AD-6, AD-11 |
| CAP-3 Coherence gating | Gate + role-qualified judge + orchestrator + house Briefs | AD-1, AD-2, AD-3, AD-9, AD-11 |
| CAP-4 Result card + CTA | Brief schema + Renderers + `/api/cheer` | AD-5, AD-7, AD-8, AD-10, AD-12 |
| Progressive enhancement / representation parity | `/api/spark` negotiation + server page renderer + eligible local `/s/:id` | AD-6, AD-7, AD-12; governing UX D1, D1a, D2, D2a, D3–D24 |
| Receipt / verifiability (FR-11) | Commit stage + COORD receipt + KV projections | AD-7 |
| Privacy boundary | Evidence + schema grounding | AD-4, AD-8 |

## Deferred

- **Judge prompt text and semantic calibration** — Story 1.5 versions Justin's voice rubric and golden/anti-golden corpus; Story 1.18 proves Gate-3 and Gate-9 behavior for the unchanged AD-11 structural identity before production.
- **Judge structural recovery** — the legacy Story 1.2 run from 2026-08-16 is `NO-GO` for the tested gpt-oss configurations (0/20 direct-valid and post-repair-valid per model). Story 1.3 preserves that evidence and hardens the offline verifier; Story 1.4 may run one separately approved evidence-v2 recovery matrix for one frozen primary/fallback pair. A second `NO-GO` triggers MVP review, not a third bakeoff.
- **Judge provider/model** — unset until recovery. Current Workers AI JSON Mode documentation does not list either gpt-oss candidate and does not guarantee schema compliance. Another provider or AI Gateway requires a new security/operational decision.
- **Launch readiness gate** — the voice rubric + ≥3 golden Briefs per mode (PRD FR-5) must exist before the pipeline ships; judge calibration depends on them.
- **House Brief catalog** — content authored with the golden Briefs; spine fixes only that it exists, is versioned, and is gate-passing by construction.
- **`/how` page + mermaid update** — must be rewritten to the pipeline before launch; content decision, not structural.
- **Renderer layout for the 8-element card — resolved:** UX-DR1 governs the field-to-section mapping and renderer order within AD-5's schema and AD-6's closed shell-delta authority. This is an adopted implementation contract, not deferred design latitude.
- **KV TTL hygiene, CORS tightening, `/api/meter` exposure, wrangler compat-date bump** — pre-existing sharp edges; cleanup stories, not invariants.
- **Wrangler maintenance** — project lock remains `^4.114.0`; current documentation/release check found 4.123.0. Upgrade and compatibility-date validation are a separate maintenance change, not part of this planning correction, but Story 1.2 must complete that reviewed runtime baseline before any new live qualification. A later runtime-bound change makes affected evidence stale transitively.
- **Operational envelope** — decided in fact: single existing production Worker on oddspark.dev, wrangler deploy, `[observability]` platform logs, no new environments. The current `preview_urls` placement under `[observability]` must be corrected in an implementation/config story before relying on preview isolation. Offline development remains the default; the explicit live-spike config is the only approval-bound remote-AI path. Mixed-version rollout is reader-first: complete Story 1.2's reviewed toolchain/runtime baseline; establish authoritative COORD receipt/read and KV projections; complete Story 1.23's canonical Worker runtime assembly without deployment; deploy and verify the compatibility reader in Story 1.24; deploy the assembled compatible writer in Story 1.25's inactive safe posture without an active production manifest; and, under separate Story 1.26 activation authority, atomically publish the local-only manifest last. Story 1.19's live full-request evidence follows the authoritative commit path and remains separate from Worker assembly. After Story 1.26, two independent branches may complete in either order: Story 3.1 establishes the offline receipt harness, Story 3.2 performs local production proof, and Story 3.3 completes the first owner-review cycle from local production samples plus generated and house fixtures; independently, Stories 2.1–2.10 complete the domain path and atomically enable domain mode. Story 3.4 waits for both Story 3.3 and Story 2.10 before domain production proof. Neither prerequisite depends on or grants authority to the other. Later weekly SM-2 / SM-3 review follows `owner-review-runbook.md` and is not a sprint story. An explicitly approved Story 3.5 quiet-production checkpoint then gathers the organic served-event sample without promotion or synthetic traffic, and Story 3.6 separately governs receipt-claim approval and activation. The quiet-production result pairs COORD deltas with same-interval platform HTTP outcomes; incomplete coverage or unexplained 5xx blocks PASS pending reliability review without changing the house ratio. Public promotion, reproducibility-claim activation, and Story 5.2's destructive seam retirement wait for the applicable passing evidence and separate approval. Deployment, activation, production proof, observation, claim activation, promotion, and destructive retirement remain distinct authorities. Rollback is permitted only to a compatible reader and must atomically remove or replace the production activation manifest when it no longer matches rolled-back code; a legacy-only reader may not be redeployed. The closed envelope and dependency graph—not a bare integer assumption—provide safety without changing the existing KV namespace.
