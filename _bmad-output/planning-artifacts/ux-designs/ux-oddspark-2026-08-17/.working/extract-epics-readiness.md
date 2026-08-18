---
title: UX requirements ledger — extraction from epics and readiness report
date: 2026-08-17
sources:
  - _bmad-output/planning-artifacts/epics.md (full read; line numbers below refer to this file)
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-08-17.md (full read; "RR L<n>")
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md §2.4, §4.1, §4.11 ("SCP L<n>")
extractor: ux-extraction-subagent
note: All AC text is quoted verbatim, not paraphrased. Interpretive remarks are marked "[note]".
---

# UX Requirements Ledger — oddspark (2026-08-17)

## 1. UX-DR1..UX-DR6 (epics.md L70–79) and the proposal's framing

epics.md L70–79, verbatim:

> ### UX Design Requirements
>
> Pending the UX Decision Record (`ux-decision-record-oddspark.md`) required by the 2026-08-17 course correction. The preserved shell is not redesigned; each UX-DR makes an already-implied state testable.
>
> - UX-DR1: Eight-element result-card hierarchy and field-to-section mapping (AD-5 is the data contract; this is presentation).
> - UX-DR2: Accessibility baseline — named standard, keyboard/focus order, screen-reader semantics, contrast target, acceptance-test baseline.
> - UX-DR3: Loading / "within seconds" / deadline behaviour with retry suppression and focus announcement.
> - UX-DR4: State-and-copy matrix — downgrade notice, house Brief, invalid input 400, COORD 502, unsupported version, inactive receiver, non-claiming receipt copy.
> - UX-DR5: Responsive and preservation criteria for the existing page shell.
> - UX-DR6: Invitation interaction contract — native POST/303 path, plain-link fallback, progressive enhancement, failed submission, focus restoration, external-navigation expectation.

epics.md L18 (Overview framing):

> The one-button / optional-domain interaction is preserved unchanged by design (FR10) and is not redesigned; a compact UX Decision Record (`ux-decision-record-oddspark.md`, pending) governs the new visitor-facing states introduced by the pipeline and is traced through UX-DR1–UX-DR6 below.

Sprint change proposal framing:

SCP L53 (§2.4 UX impact):
> A compact **UX Decision Record** is required (readiness critical #3). Scope: the preserved shell is *not* redesigned. The record makes testable: eight-element card hierarchy; accessibility baseline (standard, keyboard/focus, screen-reader semantics, contrast); loading / "within seconds" / deadline behaviour with retry suppression; state-and-copy matrix (downgrade notice, house Brief, invalid input 400, COORD 502, unsupported version, inactive receiver, non-claiming receipt); responsive preservation criteria; invitation POST/303 and plain-link progressive-enhancement/failure/focus behaviour. It becomes a dependency of Stories 1.15, 1.16, 1.22, 4.1, 4.2 and replaces "UX Design Requirements: None" in `epics.md`.

SCP L77–78 (§4.1):
> - **Overview:** replace "No UX design contract exists … so there are no UX-DRs" with: "A compact UX Decision Record (`ux-decision-record-oddspark.md`) governs the preserved shell's new states; the one-button / optional-domain interaction is not redesigned."
> - **UX Design Requirements:** replace "None" with UX-DR1…UX-DR6 (card hierarchy; accessibility baseline; loading/deadline behaviour; state-and-copy matrix; responsive preservation; invitation navigation/failure behaviour), each marked *pending the UX Decision Record*.

SCP L80 (§4.1, execution rule added):
> - **Execution and Authority Rules:** add: "Domain requests during the local-only production phase follow Story 1.16's governed local path with the plain-language notice; the legacy generator is unreachable from Story 1.24 onward and is quarantined, not deleted, until Story 5.2."

SCP L232 (§4.11):
> Route to the UX Designer workflow (`bmad-ux`) with a constrained brief: **do not redesign the interaction (FR10/AD-10)**. Produce `_bmad-output/planning-artifacts/ux-decision-record-oddspark.md` covering the six UX-DRs in §4.1. It must exist before Story 1.15 begins.

SCP L285 (status): "UX Decision Record (§4.11) remains handed off."

Governing FRs from epics.md that constrain UX copy/behaviour (L24–34):
- L28 FR5: "Contract-complete rendering — all 8 result-card elements in order; Change Level = preliminary time range + workflow-step impact; What Stays the Same names tools + authority + steps; confident-plan voice (voice rubric + ≥3 golden Briefs per mode as pre-launch deliverable)."
- L29 FR6: "Claim discipline — no numeric ROI/percentages in local mode; domain-mode numbers traceable to the site; qualitative effects name who/what physically changes; no pricing anywhere."
- L30 FR7: "Spark-specific invitation — CTA references the exact Spark; no pricing/urgency/pitch register; explicitly allows "not worth changing.""
- L31 FR8 (tail): "scan insufficiency falls back to local mode with plain-language notice."
- L32 FR9: "One-breadcrumb ceiling — no capability inventory, audit list, or multi-item findings rendered; domain-mode Briefs ephemeral (no public permalink)."
- L33 FR10: "Interaction preservation — one button, one optional domain field; both modes from the same action."
- L34 FR11: "... domain-mode Briefs have no `/s/:id` permalink; no reproducibility UI claim until production-verified."
- L39 NFR2: "Performance — strike completes within STRIKE_BUDGET_MS wall-clock or degrades to house Brief; existing 4s scan budget carries over."
- L42 NFR5: "... COORD read/claim/commit uncertainty returns 502 and never renders uncommitted output."
- L52: "Typed Brief JSON schema (integer version, mode, 8 elements, notice, grounded_numbers) as the only renderer input; legacy personalization.status branching removed."
- L58: "... `POST /api/cheer`; served events occur only after authoritative receipt resolution/commit, so 400/502 responses enter neither denominator."
- L66: "Failure precedence is explicit: invalid input 400; scan insufficiency downgrades; eligible Candidate/model failures retry then house; COORD uncertainty 502; no uncommitted or raw-model output renders."
- L67: "Pre-launch deliverables (Justin): voice rubric + ≥3 golden Briefs per mode; house Brief catalog; /how page + mermaid rewrite."
- L179 (Execution rule): "Domain requests during the local-only production phase (Story 1.24 until Story 2.10) follow Story 1.16's governed local path with the plain-language notice under domain request scope. The legacy generator is unreachable from Story 1.24 onward and is quarantined, not deleted, until Story 5.2. (Justin decision, 2026-08-17.)"

## 2. Story-by-story ledger — ACs the UX record must satisfy or that will test it

Legend: [D] = story Dependency names the UX Decision Record; [T] = AC tests a UX-DR; [C] = AC constrains UX copy/behaviour.

### Story 1.1: Shell Safety Net (L186–202) — UX-DR5 [T]
- L194 Dependency: "No predecessor; this is the verified baseline."
- L198–202:
  > **Given** the current route, form, renderer, scanner, cache, and error behavior
  > **When** the baseline suite runs
  > **Then** every behavior in the story file's enumerated preservation inventory is covered
  > **And** the two known security guards are covered
  > **And** no fixture performs provider or production activity.
- [note] The "enumerated preservation inventory" lives in the story file, not epics.md; UX-DR5 preservation criteria must not contradict it.

### Story 1.5: Voice Rubric and Golden Briefs (L283–304) — UX-DR1/UX-DR6 copy register [C]
- L295–299:
  > **Given** the nine gates and Oddspark voice
  > **When** the corpus is authored
  > **Then** each mode has at least three complete goldens
  > **And** stable anti-goldens cover consultant-speak, unsupported claims, weak preservation, capability duplication, poor scope, and invitation pressure
  > **And** semantic thresholds are fixed before live results.
- L301–304: "**Given** developer placeholder fixtures / **When** owner review occurs / **Then** placeholders are visibly non-authoritative / **And** Justin approval binds the exact version and content hashes."

### Story 1.7: Brief, Attempt, and Grounding Contracts (L329–355) — UX-DR1, UX-DR4 data source [C]
- L341–344:
  > **Given** the Brief schema
  > **When** validation runs
  > **Then** the versioned local/domain union, eight elements, notice, grounded_numbers, exact keys, types, and cardinalities are enforced
  > **And** candidate_ref is deterministic over the validated Candidate.
- [note] `notice` is a Brief-schema field: the UX-DR4 downgrade notice is rendered from data, not injected by the renderer.

### Story 1.8: Versioned House Brief Catalog (L357–379) — UX-DR4 house Brief state [C]
- L369–373:
  > **Given** the approved rubric and Brief validator
  > **When** the catalog is authored
  > **Then** every season has at least two stable-ID complete Briefs
  > **And** each entry passes exact validation and expected Gate outcomes
  > **And** entries contain no business-specific claims, pricing, or hidden personalization.

### Story 1.13: Strike Orchestrator and House Fallbacks (L485–512) — UX-DR3 deadline [C]
- L503–507:
  > **Given** primary errors, invalid output, deadline pressure, or exhaustion
  > **When** another attempt is considered
  > **Then** fallback selection occurs only for a subsequent complete pair
  > **And** the same Candidate is never re-judged
  > **And** insufficient capacity selects the approved house Brief.
- L509–512 (offline): "**Then** every ledger transition, E value, timeout, role transition, rejection, fallback, and COORD uncertainty is covered".

### Story 1.14: Authoritative Commit and Compatibility Reader (L514–540) — UX-DR4 unsupported version / 400 / 502 [T]
- L526–529:
  > **Given** legacy and CommittedBrief values
  > **When** the compatibility reader runs
  > **Then** supported versions read losslessly and unsupported versions fail closed
  > **And** the reader is deployable before the new writer.
- L537–540:
  > **Given** served outcomes
  > **When** the narrow metric operation runs
  > **Then** briefs_served and its house subset increment atomically only after authoritative resolution
  > **And** 400/502 responses do not enter counters.

### Story 1.15: Committed Brief Rendering (L542–563) — UX-DR1..UX-DR5 [D][T]
- L550 Dependency: "Stories 1.7, 1.8, and 1.14; UX Decision Record (UX-DR1–UX-DR5)."
- L554–557:
  > **Given** a committed local, domain, downgrade, or house Brief
  > **When** HTML, JSON, and share rendering runs
  > **Then** field order, escaping, notice behavior, mode authority, invitation, and accessibility are consistent
  > **And** raw model text and legacy personalization state are unreachable.
- L559–563:
  > **Given** unsupported or domain-scoped public reads
  > **When** routes render
  > **Then** unsupported versions fail closed
  > **And** domain artifacts never receive /s/:id eligibility
  > **And** no provider activity occurs.

### Story 1.16: Request Hardening and Domain Downgrade Seam (L565–590) — UX-DR4 notice copy, UX-DR5 shell, 400 [D][T]
- L573 Dependency: "Stories 1.1, 1.9, 1.13, and 1.15; UX Decision Record (UX-DR4 notice copy)."
- L577–580:
  > **Given** the strike endpoint
  > **When** malformed or oversized input arrives
  > **Then** body, URL, scheme, credentials, port, redirect, and public-host guards retain stable 400 behavior
  > **And** one button and one optional domain field remain the only inputs.
- L582–585:
  > **Given** a valid domain before domain activation
  > **When** the request runs
  > **Then** it follows the deterministic local Evidence path with notice under domain request scope
  > **And** no scanner/EvidenceProvider or global w: pollution occurs.

### Story 1.20: Atomic Activation Contract and Release Decision View (L660–689) — UX-DR4 non-claiming copy / inactive receiver [C]
- L685–689:
  > **Given** a missing or invalid manifest
  > **When** runtime evaluates activation
  > **Then** model roles, claim copy, and reference handoff disable
  > **And** the authoritative committed/approved-house path remains available when safe
  > **And** existing observability emits only a redacted reason code.

### Story 1.21: Local Artifact Retention Lifecycle (L691–718) — retention disclosure / expired-read state [C]
- L703–707:
  > **Given** local COORD receipts and w: projections
  > **When** a local artifact commits
  > **Then** committed_at and expires_at are immutable and exactly 30 days apart
  > **And** /s/:id and /api/spark/:id refuse the artifact at or after expiry
  > **And** reads never slide expiry.

### Story 1.22: Honest Pipeline Explanation (L720–740) — UX-DR2 Mermaid, non-claiming copy [D][T]
- L728 Dependency: "Story 1.15; UX Decision Record (UX-DR2 for accessible Mermaid metadata and fallback text)."
- L732–735:
  > **Given** the adopted architecture
  > **When** the page is rewritten
  > **Then** Evidence, Generate, Local Gate, Judge, Commit, house fallback, privacy, call cap, and non-determinism are explained
  > **And** Mermaid has accessible metadata and plain-language fallback.
- L737–740:
  > **Given** receipt proof is not active
  > **When** copy renders
  > **Then** no stronger reproducibility claim appears
  > **And** fixtures prohibit legacy and premature-claim language.

### Story 1.24: Local Writer Rollout and Atomic Local-Only Activation (L765–797) — UX-DR4 notice [T]
- L789–792:
  > **Given** a domain request in this phase
  > **When** it runs
  > **Then** it follows Story 1.16's governed local path with the plain-language notice under domain request scope
  > **And** the legacy generator is unreachable.

### Story 2.1: Robots-Aware Public-Site Scanning (L801–823) — UX-DR3 4s budget, UX-DR4 downgrade [C]
- L817: "**And** 4s, 3-page, 512KB, and redirect limits remain enforced."
- L819–823:
  > **Given** retrieved responses
  > **When** canonical text is prepared
  > **Then** PII/contact strings are detected in the ephemeral buffer and discarded
  > **And** only allowlisted source text and source IDs survive
  > **And** insufficiency returns a typed downgrade reason.

### Story 2.4: Evidence Eligibility and Honest Downgrade (L869–891) — UX-DR4 downgrade notice [T]
- L887–891:
  > **Given** any downgrade
  > **When** local generation proceeds
  > **Then** effective mode is local with stable notice
  > **And** request scope remains domain-specific
  > **And** sanitized scan fragments never mix into local Evidence.

### Story 2.5: One Safe Breadcrumb and Domain Grounding (L893–915) — UX-DR1 domain card [T]
- L912–915:
  > **Given** rendering fixtures
  > **When** domain output renders
  > **Then** only the one Breadcrumb is visible
  > **And** source URLs and internal grounding reports are not exposed.

### Story 2.6: One-Hour Domain Result Lifecycle (L917–939) — retention disclosure / read refusal states [C]
- L929–933:
  > **Given** a committed domain-scope result
  > **When** COORD writes it
  > **Then** committed_at and expires_at are immutable and exactly one hour apart
  > **And** receipt, pw: projection, and API eligibility share the boundary
  > **And** reads never slide expiry.
- L935–939:
  > **Given** before, at, and after expiry
  > **When** every read path runs
  > **Then** /s/:id always refuses domain artifacts
  > **And** /api/spark/:id fails at or after expiry
  > **And** alarms are best-effort cleanup and cannot restore eligibility.

### Story 2.9: Governed-Path Verification and Legacy Quarantine (L996–1017) — UX-DR4/5 regression [T]
- L1011: "**And** domain insufficiency still downgrades through the governed local path"
- L1014–1017:
  > **Given** characterization and current tests
  > **When** verification runs
  > **Then** visitor-visible route, error, cache, scan, fallback, and rendering behavior remains covered
  > **And** deletion and rollback-reader retirement remain explicitly deferred to Story 5.2.

### Story 3.4: Receipt Claim Approval and Activation (L1146–1166) — UX-DR4 non-claiming receipt copy [T][C]
- L1158–1161:
  > **Given** passing current production proof and quiet gate
  > **When** exact wording is reviewed
  > **Then** the ReceiptClaimManifest binds proof ref, deployed identity, copy hash, approver, time, and active outcome
  > **And** copy states committed-artifact reproducibility, not model determinism or universal availability.
- L1163–1166:
  > **Given** separate claim approval
  > **When** the activation value is replaced atomically
  > **Then** receipt_claim_ref matches the exact manifest
  > **And** missing, stale, or mismatched proof renders non-claiming copy.

### Story 4.1: Aggregate Invitation Event Endpoint (L1170–1193) — UX-DR6 [D][T]
- L1178 Dependency: "Stories 1.14–1.15 and 2.6; UX Decision Record (UX-DR6)."
- L1182–1186:
  > **Given** POST /api/cheer
  > **When** a valid eligible committed artifact is submitted
  > **Then** COORD atomically records one invitation_acted event
  > **And** repeated actions remain separate events
  > **And** invalid input, origin, artifact, expiry, rate limit, or COORD uncertainty records none.
- L1188–1193:
  > **Given** reporting
  > **When** SM-1 is calculated
  > **Then** it is invitation_acted / briefs_served
  > **And** it is labeled approximate and non-deduplicated
  > **And** receiver-activation coverage is disclosed
  > **And** no visitor identity key is added.

### Story 4.2: Hearn Sender Contract and Plain-Link Fallback (L1195–1221) — UX-DR4 inactive receiver, UX-DR6, retention disclosure [D][T][C]
- L1203 Dependency: "Stories 1.15 and 4.1; UX Decision Record (UX-DR4, UX-DR6)."
- L1207–1210:
  > **Given** a rendered eligible Brief
  > **When** the invitation renders without an active receiver
  > **Then** it uses fixed https://hearn.systems/contact
  > **And** it does not POST, attach a spark ID, or count an invitation event.
- L1212–1216:
  > **Given** an active receiver fixture
  > **When** the native POST and redirect are tested
  > **Then** only validated spark and anti-abuse fields submit
  > **And** 303 destination is fixed and allowlisted
  > **And** no domain, Brief text, Evidence, provider, or visitor data enters the URL.
- L1218–1221:
  > **Given** reference disclosure
  > **When** copy renders
  > **Then** fixed text states local references expire after 30 days and website/domain references after one hour
  > **And** no later recovery promise or countdown state exists.

### Story 4.3: Hearn Receiver Contract Verification (L1223–1245) — UX-DR6 external-navigation expectation [C]
- L1235–1240:
  > **Given** a deployed Hearn contact-form revision
  > **When** the receiver fixture exercises source=oddspark and spark
  > **Then** the form visibly labels and preserves the bounded opaque reference through errors and submission
  > **And** malformed, duplicate, oversized, or unsafe query values are ignored
  > **And** no Brief content persistence is observed
  > **And** any failure keeps Oddspark in plain-link posture.

### Story 4.4: Hearn Reference Handoff Activation (L1247–1268) — UX-DR6 [T]
- L1264–1268:
  > **Given** separate release approval
  > **When** the production activation value is replaced
  > **Then** receiver_ref activates native POST, one invitation event, and fixed 303
  > **And** failure or withdrawal atomically restores plain-link posture
  > **And** no real contact submission is part of verification.

### Story 5.3: Owner Review and Governed Requalification (L1313–1342) — UX copy feedback loop [C]
- L1331–1336: "**Given** a disagreement / **When** triage runs / **Then** rubric issues amend semantic fixtures / **And** house issues amend the catalog / ..."
- [note] Copy issues in goldens/house Briefs route through the rubric/catalog, not through renderer changes.

Stories with no UX-relevant ACs: 1.2, 1.3, 1.4, 1.6, 1.9, 1.10, 1.11, 1.12, 1.17, 1.18, 1.19, 1.23, 2.2, 2.3, 2.7, 2.8, 2.10, 3.1, 3.2, 3.3, 5.1, 5.2 (grep for notice/card/render/accessib/Mermaid/invitation/receipt/claim/retention/seconds/deadline/retry/focus/responsive/shell/form/303/400/502 produced no visitor-facing hits in these beyond ledger/deadline internals).

## 3. Readiness report §UX Alignment Assessment — six gaps and remediation, verbatim

RR L186: "**Not found.** No whole UX document or `index.md`-based UX package exists in the planning artifacts."

RR L188: "UX is nevertheless directly implied and material. Oddspark is a public user-facing web application whose PRD defines two user journeys, a one-button/optional-domain interaction, an eight-element result card, degradation notices, invitation behavior, preserved page behavior, "within seconds" expectations, and a requirement to avoid visible retries, hangs, near-misses, and error walls."

RR L192–199 (implied contracts the architecture supports):
> - It preserves the existing button, optional domain field, page, and shared action.
> - A single typed Brief schema feeds HTML, plain-text, and JSON rendering, reducing cross-renderer drift.
> - Gate failures remain backstage, while deadline or qualification failure selects a curated house Brief.
> - Domain insufficiency produces an honest local downgrade with a notice.
> - Domain artifacts cannot become public permalinks, and receipt claims remain hidden until supported by current production proof.
> - Invitation rendering has explicit plain-link and reference-bearing states.

RR L201: "The epic plan also carries UX-adjacent acceptance criteria: consistent field order and escaping, notice behavior, invitation behavior, accessible output, accessible Mermaid metadata and fallback text, preservation of the one-button form, and fixed retention disclosures."

### The six Alignment Issues (RR L203–210)
> - The planning set has no authoritative UX contract defining the visual hierarchy and presentation of the eight required Brief elements.
> - "Accessibility" appears in story acceptance criteria but has no specified standard, keyboard/focus behavior, screen-reader semantics, contrast target, or acceptance-test baseline.
> - The PRD promises a result "within seconds," while architecture defines a hard deadline but no user-facing loading, delayed-response, timeout, retry-suppression, or focus-announcement behavior.
> - Downgrade, house-Brief, invalid-input, COORD-502, unsupported-version, inactive-receiver, and non-claiming receipt states have architectural behavior but no consolidated copy/state matrix.
> - Responsive/mobile behavior and preservation criteria for the existing page are not documented beyond "keep the exact interaction."
> - The invitation's native POST/303 path and plain-link fallback lack a UX-level interaction contract covering progressive enhancement, failed submission, focus restoration, and external-navigation expectations.

(Mapping: gap 1 → UX-DR1, 2 → UX-DR2, 3 → UX-DR3, 4 → UX-DR4, 5 → UX-DR5, 6 → UX-DR6.)

### Warnings and remediation lines
RR L214: "⚠️ **UX documentation is missing despite substantial user-facing behavior.** Treating FR10 as proof that "no UX is needed" is insufficient: the workflow remains simple, but the result card, fallback notices, accessibility, latency states, claim copy, retention disclosure, and contact handoff all introduce UX decisions."

RR L216: "Before implementation reaches visitor-facing rendering and integration stories, create either a focused UX specification or an explicit UX decision record covering the above states. It does not need to redesign the preserved shell; it needs to make the preserved and newly introduced interaction states testable."

RR L264–265 (Minor concern 3):
> 3. **No explicit UX design requirements are traced.** The epics state that none exist because interaction is preserved, yet multiple stories add notices, result states, disclosures, invitation paths, and accessible explanatory content.
>    - **Remediation:** Add UX decision requirements and trace them to rendering, downgrade, `/how`, and contact-handoff stories.

RR L290 (Critical issue 3): "3. **Create an authoritative UX decision artifact.** Define the eight-element card hierarchy, accessibility baseline, loading/degradation behavior, state/copy matrix, responsive preservation criteria, and contact navigation/failure behavior. Trace those decisions into the affected stories."

RR L295 (Next step 2): "2. Add a compact UX specification or UX decision record for the preserved shell and new states; avoid redesigning the one-button experience."

RR L301 (Next step 8): "8. Re-run implementation readiness after the course correction and UX artifact are complete. ..."

RR L305: "- UX alignment issues: 6"

Additional PRD-derived UX constraints captured in the readiness report (PRD Analysis section):
- RR L68 (FR-4 tail): "Exhaustion or insufficient remaining time returns the curated house Brief rather than rendering a near-miss."
- RR L70 (FR-5): "Every Brief renders all eight elements in the order defined in `result-card-contract.md`: Spark title, The Plan, Why It Fits, What Gets Better, Before/After, Change Level, What Stays the Same, and the implementation invitation."
- RR L72 (FR-6): "The Change Level time range is Hearn Systems' own preliminary estimate, not a business-outcome number, and is always labeled preliminary."
- RR L74 (FR-7): "The CTA ties the invitation to the exact Spark and its smallest useful version, offering a bounded feasibility conversation."
- RR L98 (NFR-6): "Every visitor receives either a gate-passing Brief or a curated gate-passing house Brief, never a failed Candidate, hang, near-miss, surfaced retry state, or error wall."
- RR L117: "Change Level must contain a preliminary time range and workflow-step impact. What Stays the Same must name preserved tools, decision authority, and untouched workflow steps where applicable."
- RR L118: "Qualitative effects must name who is affected and what physically changes; generic claims such as "saves time" are insufficient."
- RR L119: "CTA copy must reference the specific Spark, contain no price or urgency, explicitly permit concluding that the idea is not worth changing, and use the approved plain voice."
- RR L120: "... Scan failure, robots exclusion, or insufficient clarity downgrades before generation to local mode with a plain-language notice."
- RR L128: "With an exact active `HearnReceiverManifest`, accepted `POST /api/cheer` returns `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>` and only the opaque artifact id crosses origins. Without a current receiver reference, Oddspark uses the fixed plain contact link, sends no reference, and records no invitation event."
- RR L135: "... the four-second scan budget is still an assumption pending measurement; and no dedicated UX artifact exists for validating interaction, voice, fallback notice, and accessibility details."

## 4. Copy already fixed by the epics / readiness report (exact strings)

Exact literal strings the visitor must see (or URLs they must be sent to):
1. Plain-link CTA target: `https://hearn.systems/contact` (epics L1209: "it uses fixed https://hearn.systems/contact").
2. Reference-bearing 303 destination: `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>` (RR L128); epics L1215 requires "303 destination is fixed and allowlisted"; L1216 "no domain, Brief text, Evidence, provider, or visitor data enters the URL". Query keys `source=oddspark` and `spark` (epics L1236).
3. Eight result-card element names, in order (RR L70): "Spark title, The Plan, Why It Fits, What Gets Better, Before/After, Change Level, What Stays the Same, and the implementation invitation."
4. Invitation must "explicitly allow[] "not worth changing."" (epics L30 FR7; RR L119 "explicitly permit concluding that the idea is not worth changing").
5. Change Level "is always labeled preliminary" (RR L72) — the word "preliminary" is fixed.
6. Retention disclosure — content fixed, wording not: "fixed text states local references expire after 30 days and website/domain references after one hour / And no later recovery promise or countdown state exists" (epics L1220–1221).
7. Receipt-claim copy — content constraint, wording pending Justin approval: "copy states committed-artifact reproducibility, not model determinism or universal availability" (L1161); until then "non-claiming copy" (L1166) and on /how "no stronger reproducibility claim appears" (L739).
8. Downgrade / interim-domain notice — only qualified as "plain-language notice" (L31, L179, L791) and "stable notice" (L889); no string is fixed anywhere in the epics.
9. Endpoint: `POST /api/cheer` (L58, L1182). Routes: `/s/:id`, `/api/spark/:id`, `/how` (L67, L706, L937–938).
10. Numeric constants that copy may reference: 30 days (L705), one hour (L931), 4s scan budget (L39, L817), STRIKE_BUDGET_MS (L39, value not fixed).

## 5. Conflicts and ambiguities between stories about UI behaviour

1. **Notice: one field, at least two causes.** Story 1.7 (L343) defines a single Brief `notice` field. Story 2.4 (L889) requires "effective mode is local with stable notice" for scan-insufficiency downgrade; Stories 1.16 (L584) / 1.24 (L791) / L179 require "the plain-language notice under domain request scope" when domain mode is simply not yet activated. Nothing states whether these are the same string or distinct copy; the second cause is not a "downgrade" in FR8's sense (no scan ran — L585 "no scanner/EvidenceProvider"). UX-DR4 must decide whether the matrix has one downgrade-notice row or two.
2. **Renderer surface naming.** Story 1.15 (L555) lists "HTML, JSON, and share rendering"; readiness report L194 says "HTML, plain-text, and JSON rendering". "share" vs "plain-text" is unreconciled — UX-DR1/UX-DR4 must name the third surface.
3. **1.15 dependency omits UX-DR6 but its AC tests "invitation".** L550 binds 1.15 to "UX-DR1–UX-DR5" only, yet L556 requires "invitation ... consistent" across renderers. Stories 4.1/4.2 carry UX-DR6 (L1178, L1203). Ambiguity: does 1.15 render the invitation in plain-link posture only (per L1207–1210), deferring POST/303 to 4.2? Not stated.
4. **Two POST targets in the invitation path.** 4.1 defines `POST /api/cheer` (L1182); 4.2 says "the native POST and redirect" (L1213) with a "303 destination" (L1215); RR L128 clarifies /api/cheer returns 303 to hearn.systems. Epics alone do not say the form action is /api/cheer. UX-DR6 must state the form action, the 303 target, and what the visitor sees on failed POST (invalid input/origin/artifact/expiry/rate limit/COORD uncertainty — L1186 says "records none" but no visitor-facing behaviour is given).
5. **Retention disclosure visibility.** L1218–1221 "Given reference disclosure / When copy renders" — unclear whether the disclosure renders always, or only when a receiver is active (in plain-link posture no reference is attached — L1210). Also unclear whether it appears on the card, near the CTA, or on /how.
6. **Inactive-receiver state and measurement.** L1210 "does not ... count an invitation event" while L1190 SM-1 = invitation_acted / briefs_served — clicks in plain-link posture are invisible to SM-1 (disclosed via L1192 "receiver-activation coverage is disclosed"). Not a UI conflict, but UX-DR6 must not imply the plain link is instrumented.
7. **Expired/refused reads have no visitor state.** 1.21 (L706) "/s/:id and /api/spark/:id refuse the artifact at or after expiry"; 2.6 (L937) "/s/:id always refuses domain artifacts"; 1.15 (L561) "unsupported versions fail closed". No story specifies HTTP status or page copy for a refused/expired/unsupported read; UX-DR4 lists "unsupported version" but not "expired artifact" — gap.
8. **400 "stable behavior" vs new copy.** 1.16 (L579) requires guards "retain stable 400 behavior" (existing responses preserved, tested by 1.1's inventory), while UX-DR4 lists "invalid input 400" as a state to define. Whether UX-DR4 may change existing 400 body/copy or must document it as-is is unstated.
9. **502 has architectural behaviour but no rendering owner.** L42/L66 "COORD uncertainty 502"; L540 "400/502 responses do not enter counters"; no story AC describes what the visitor sees. UX-DR4 owns it, but no story tests it explicitly (closest: 1.13 L511 offline coverage, 2.9 L1016 "error ... behavior remains covered").
10. **"Within seconds" has no story.** RR L188/L207 raise it; NFR2 (L39) fixes STRIKE_BUDGET_MS (unvalued) + 4s scan (RR L135 "still an assumption pending measurement"). No AC covers loading state, delayed response, retry suppression, or focus announcement — UX-DR3 has no test owner beyond 1.15's "accessibility ... consistent" (L556).
11. **Receipt-claim copy lives in two places.** /how (1.22 L737–740) and the card/claim copy governed by ReceiptClaimManifest (3.4) and disabled by 1.20 (L687 "claim copy ... disable"). Whether /how switches copy when receipt_claim_ref activates, or stays permanently non-claiming, is not stated.
12. **Legacy crosswalk drift in readiness report.** RR L147 traces FR7 to "Stories 3.1, 3.4–3.6, 3.11, and 3.13" (2026-08-16 IDs); current IDs are 4.1–4.4, 3.4, 5.3 (epics L166–168). Not a UI conflict; noted so the UX record cites current IDs.
13. **Domain-mode share affordance.** L562 / L937 domain artifacts have no `/s/:id`; 1.15 renders a "share" surface (L555). Whether the share affordance is hidden, disabled, or shown-with-explanation for domain/downgrade Briefs (which are domain-scoped per L890) is unspecified.
