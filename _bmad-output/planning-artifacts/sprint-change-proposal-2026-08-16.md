# Sprint Change Proposal — Judge Fidelity Recovery

Date: 2026-08-16  
Project: Oddspark  
Trigger: Story 1.2, Judge Fidelity Spike  
Status: Approved — finalized for governed handoff  
Scope classification: Major course correction for governance; moderate implementation change  

> **Historical story IDs:** this proposal records the pre-reslice plan and deliberately preserves its original IDs. The current development-ready mapping is authoritative in `epics.md`: legacy Story 1.2 maps to Stories 1.3–1.4, and all other legacy IDs are listed in the crosswalk there. Historical status instructions below do not override the current story boundaries.

## 1. Identified Issue

Story 1.2 tested the exact AD-2 verdict contract against the two configured Workers AI judge candidates:

- `@cf/openai/gpt-oss-120b`
- `@cf/openai/gpt-oss-20b`

The recorded matrix produced 0/20 direct-valid and 0/20 post-repair-valid verdicts for each model. All 40 counted outputs were parseable JSON but `schema_invalid`, so neither tested model/request/prompt/schema configuration approached the required per-configuration 95% structural-fidelity threshold. The retained result therefore supports only `NO-GO`; those exact configurations are unqualified and cannot be adopted by Story 1.8.

The post-run audit also found that the v1 evidence verifier is not audit-grade provider proof. It does not strictly close every nested evidence object, independently bind the retained output to the running adapter/configuration, or report the individual fixture cases. These limitations cannot turn any invalid verdict into a valid one and cannot improve the conservative `NO-GO`; they do prevent Story 1.2 from closing on the strength of the current artifact.

The problem is a failed technical approach inside Epic 1, not a failure of Oddspark's product goal. The one-button experience, typed Brief, grounding discipline, bounded retries, and house-Brief fallback remain viable. The architecture must separate deterministic checks from semantic judging, leave the judge provider unset until independently qualified, and permit one bounded recovery attempt with stronger evidence.

### Authoritative evidence

- Story: `_bmad-output/implementation-artifacts/1-2-judge-fidelity-spike.md`
- Immutable v1 decision: `spikes/judge-fidelity/results/2026-08-16-d2b84005.json` and its deterministic Markdown rendering
- Read-only audit addendum: `spikes/judge-fidelity/results/2026-08-16-d2b84005-audit.md`
- Run ID: `d2b84005-7c46-4379-88fa-abe8fe0e2d2d`
- Counted result: 0/40 direct-valid; 0/40 post-repair-valid; 40/40 `schema_invalid`
- Observed counted latency: 4,851–13,976 ms across the two model cohorts, with model p95 values of 9,160 ms and 13,744 ms

The v1 artifacts remain immutable historical evidence. The audit limitations are carried forward explicitly; the proposal does not reinterpret v1 as provider-proven evidence.

## 2. Impact Analysis

### 2.1 Epic impact

Epic 1 remains achievable, but not with the tested gpt-oss configurations serving directly as the strict AD-2 judge.

- Stories 1.3–1.6 can proceed because they define deterministic schemas, grounding, rubrics, and fixtures needed by qualification.
- Story 1.7 may proceed with pure request/schema work, but live generation-model integration waits for its own structured-output qualification.
- Stories 1.8 and 1.9 remain held until a judge configuration passes the revised Story 1.2 recovery gate.
- Stories 1.7 and 1.13 require explicit, independent qualification rules rather than inheriting the judge result.
- Epics 2 and 3 remain viable. They reuse the canonical Gate interface and evidence rules; they do not inherit a specific provider or model.
- No epic or story is added, removed, or renumbered.

### 2.2 PRD impact

The MVP promise is unchanged, but FR3 must explicitly state the fail-closed consequence of an invalid judge result. FR4 and Open Question 2 must express the actual six-call arithmetic rather than promising three candidate pairs after a model-based evidence call. Open Question 3 is partially reopened: the Gate and canonical internal verdict remain settled, while the provider encoding and qualified judge configuration are unresolved.

### 2.3 Architecture impact

The architecture needs an authoritative split between:

1. local checks of Brief shape, mode/breadcrumb cardinality, exact grounding, mechanically decidable PII classes, and grounded-number provenance, plus Story 1.5's conservative, local, non-model personal-name policy check; and
2. one semantic judge call through a qualified, role-specific `JudgeProvider`.

AD-2, AD-9, the Stack and Verification sections, and the solution-design summary require amendments. A new AD-11 must make provider/model qualification a blocking architectural rule.

### 2.4 UX and specification impact

No owner-facing interaction, page, route, field, or CTA changes. No standalone UX artifact exists or is required for this correction. The coherence, grounding, and voice specifications remain the product authority; the correction changes how their rules are enforced and qualified, not what they mean.

### 2.5 Operational impact

- A second live matrix consumes metered inference and requires fresh approval for the exact provider, models, account/plan, maximum call count, and cost/headroom estimate.
- The original broad probe approval does not carry forward to the recovery matrix.
- External providers or an AI Gateway path require a separate security and operational architecture decision before use.
- Correct Course itself performs no provider calls, deployment, remote-resource creation, commit, or push.

## 3. Recommended Path

Use a direct adjustment with an architecture checkpoint and exactly one bounded recovery attempt:

1. Ratify the PRD and architecture changes in this proposal.
2. Build and pass the evidence-v2 verifier entirely offline.
3. Predeclare one primary and one fallback judge configuration, including provider, model, request parameters, prompt, wire contract, adapter, runtime, pass thresholds, candidate binding, and latency allocation.
4. Present the exact models, account/plan, call cap, headroom evidence, and maximum cost for fresh operator approval.
5. Run one probe plus at least 20 counted trials per configuration, sequentially, without retries or replacement trials.
6. On structural `GO`, remove Story 1.2's fidelity hold and resume Story 1.8 implementation. Production remains blocked until Story 1.7 generation qualification, Story 1.13 semantic qualification using the Story 1.3 rubric/goldens, and Story 1.9 full-pair latency/cost qualification are all current.
7. On a second `NO-GO`, retain Story 1.2 as incomplete and trigger an MVP-scope review. Do not start a third model bakeoff.

This path preserves the product and safety invariants while limiting schedule and spend uncertainty. Estimated implementation effort is approximately 2–4 development days for the architecture amendment, evidence-v2 harness, qualification setup, and one matrix. A newly approved external-provider integration may add further work and is not included automatically.

### Alternatives considered

- **Rollback:** not viable because there is no previously qualified semantic judge to restore.
- **Weaken the verdict schema or coerce model output:** rejected because it would erase gate reasons, invent semantics, and violate fail-closed behavior.
- **Treat repaired output as direct compliance:** rejected; direct provider-wire and canonical rates must remain separately visible.
- **Open-ended model shopping:** rejected because it creates unbounded cost, schedule, and confirmation-bias risk.
- **Remove semantic gating immediately:** retained only as the MVP-review contingency after the single recovery attempt, not assumed in advance.

## 4. Detailed Artifact Change Proposals

These edits were accepted for inclusion during incremental review and have not been applied to their source artifacts. Final proposal approval authorizes finalization and handoff only; implementation, live calls, provider changes, deployment, commit, and push each retain their stated separate authority boundaries.

### 4.1 PRD — FR3 fail-closed rule

Target: `_bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/prd.md`

Add to FR3:

> A malformed, incomplete, ambiguous, schema-invalid, candidate-unbound, or otherwise unqualified judge result rejects the candidate and counts as a failed attempt. It never becomes a pass through repair, coercion, omission, or fallback interpretation.

Rationale: FR3 currently promises coherence gating without stating the observable failure consequence of an unusable verdict.

### 4.2 PRD — reconcile FR4 and Open Question 2 with the six-call ledger

Replace the unconditional “1 initial + 2 retries” interpretation with:

> A strike may attempt only complete generation-to-judge pairs within a six-model-call ledger. Every model-based evidence, generation, and judge invocation consumes one call before invocation. If evidence consumes `E` model calls, the Candidate limit is `min(3, floor((6 - E) / 2))`: zero model-evidence calls permit at most three pairs; one model-evidence call permits at most two. Exhaustion or insufficient remaining deadline returns the curated house Brief.

Apply the same arithmetic to FR4's testable consequences and replace Open Question 2's current “≤3 candidates, ≤6 calls” resolution. Three Candidates remain a ceiling, not an unconditional promise.

### 4.3 PRD — partially reopen Open Question 3

Preserve the Gate stage and canonical internal verdict as decided. Mark these items unresolved until qualification:

- exact provider and model for the semantic judge;
- exact provider-wire representation and lossless adapter;
- latency allocation within the full strike deadline; and
- the independently qualified primary/fallback configurations.

The judge remains one call per candidate, receives authoritative grounding context, and fails closed. This does not reopen the product rubric or authorize schema weakening.

### 4.4 Architecture AD-2 — composite Gate

Replace the single-model interpretation of AD-2 with **Gate combines deterministic validation with a separate semantic judge**:

1. Local checks run first and reject without a model call when the Candidate or its evidence violates AD-4/AD-5: schema, mode/breadcrumb cardinality, exact grounding, mechanically decidable PII classes, or grounded-number provenance. Story 1.5 owns a conservative, local, non-model personal-name policy that returns `pass`, `fail`, or `unknown`; `fail` and `unknown` reject the Candidate. Its result is included in the grounding report. It consumes no model-call ledger entry, and the semantic judge cannot override it.
2. A qualified `JudgeProvider` then performs exactly one semantic evaluation for one surviving Candidate against all nine gates, tone, and nonstructural claim discipline.
3. The judge receives the Candidate, Evidence Bundle, grounding report, rubric/version, and an immutable candidate reference.
4. The provider-facing logical result is an outer evaluation record:

   ```text
   JudgeResult { candidate_ref, verdict: CanonicalVerdict }
   ```

   The exact echoed `candidate_ref` is validated before the inner verdict is accepted. This establishes request/output reference binding; it does not by itself prove that the model semantically evaluated the referenced Candidate.
5. The inner canonical verdict remains exactly:

   ```json
   {
     "pass": true,
     "gates": [{ "gate": 1, "pass": true, "reason": "..." }],
     "tone": { "pass": true, "reason": "..." },
     "claims": { "pass": true, "reason": "..." }
   }
   ```

   The gates array contains exactly the IDs 1–9 once each. The abbreviated object is not permission to omit grounding checks; grounding is enforced before the judge and supplied as authoritative evaluation context.
6. A provider wire representation may differ only through a frozen, versioned adapter that is lossless with respect to the canonical semantics. It validates the outer reference, removes only validated wrapper metadata, and maps the inner verdict without invention or coercion. It may not invent reasons, fill omissions, reinterpret unknown values, or accept a mismatched candidate reference.
7. The composite Gate passes only when every deterministic and policy check and the canonical semantic verdict pass.
8. Transport-only repairs remain a separately measured whitelist. Missing semantics, schema drift, candidate mismatch, ambiguity, and unsupported repair remain hard failures.

### 4.5 Architecture AD-3/AD-9 — candidate bound, six-call ledger, and full deadline

Replace the inconsistent attempt/call language with:

- One strike has a six-model-call ledger.
- Every evidence, generation, and judge call consumes one ledger entry before invocation, including calls that throw, time out, or return invalid output.
- Only complete generation-to-judge pairs may start. If evidence consumes `E` model calls, the maximum candidate count is `min(3, floor((6 - E) / 2))`.
- Amend AD-3 so “1 initial + 2 regenerations” is a maximum only when `E=0`; `E=1` permits at most two complete candidate pairs.
- Every call uses its role-specific AD-11-qualified selector and the common ledger/deadline. Workers AI calls retain the existing `NeuronMeter`; another provider requires an approved equivalent cost meter and budget before qualification.
- Unknown, unavailable, unqualified, or budget-exhausted configurations return the house Brief; they never fail open.
- The full request has a hard deadline. Do not start a model call when the remaining budget cannot safely accommodate its declared timeout.
- Story 1.9 sets role allocations from measurements under the provisional 15-second ceiling. Do not enlarge the ceiling merely to accommodate a slow model.
- Story 1.2 measures the isolated judge-call allocation. Story 1.9 establishes orchestration readiness only when the complete generation-to-judge pair meets the declared latency and cost allocations.

### 4.6 Architecture AD-11 — provider/model qualification

Add **AD-11 — Generation and judge roles qualify independently**:

- Generation and judge use separate role configurations even if they share a provider or model.
- Each primary and fallback has two explicit identities:
  - **Structural identity:** provider, model, request parameters, prompt template, provider-wire schema, adapter, candidate-binding mechanism, runtime, and timeout/call policy.
  - **Semantic identity:** the separately versioned rubric and golden/anti-golden corpus supplied through the frozen prompt template.
- Qualification is staged. Story 1.2 must demonstrate at least 95% direct provider-wire structural fidelity, at least 95% direct canonical fidelity before repair, 100% candidate-reference binding, and acceptable isolated judge-call latency/cost. Story 1.13 supplies semantic qualification using the Story 1.3 rubric/goldens. Story 1.9 supplies full generation-to-judge latency/cost qualification. Production use requires all applicable stages to be current.
- A generation configuration must independently meet the Story 1.7 typed-Candidate threshold.
- Rates are evaluated per configuration and are never pooled. A fallback cannot replace failed primary trials.
- An unqualified, unavailable, changed, or unverifiable configuration cannot run in production; the system returns the house Brief.
- Any structural-identity change invalidates structural qualification, returns to MVP/governance review, and cannot be introduced through Story 1.13 as another recovery attempt. A semantic-identity-only change invalidates semantic evidence and reruns the semantic tier; if it also changes the prompt template, request parameters, or wire contract, it invalidates structural qualification too.
- Workers AI remains the first recovery candidate. Using an external provider or AI Gateway requires a new security and operational decision.

### 4.7 Architecture Stack, Verification, Deferred, and solution-design sync

- List the generation models as candidates subject to Story 1.7 qualification, not as implicitly approved production models.
- Leave the judge provider/model unset until AD-11 qualification passes.
- Verification has three distinct gates: local deterministic contract tests, live structural/binding qualification, and semantic calibration against goldens.
- Replace the deferred “judge fidelity unverified” risk with the dated Story 1.2 `NO-GO` and the one-attempt recovery decision.
- Update `solution-design.md` to describe the composite Gate, staged qualification, role-specific selectors/meters, six-call ledger, dynamic Candidate limit (`E=0` gives three pairs; `E=1` gives two), full request deadline, and unset judge role.

### 4.8 Epic 1 requirements and sequencing

Target: `_bmad-output/planning-artifacts/epics.md`

- Add the role-specific `JudgeProvider`, independent role qualification, and local deterministic Gate checks to Epic 1's additional requirements.
- Assign the non-model personal-name policy, tri-state report, fail-closed behavior, and fixtures to Story 1.5. The policy consumes no model-call ledger entry.
- Replace FR4's unconditional 1+2 retry inventory with the six-call formula and state the `E=0`/`E=1` consequences.
- Replace NFR4's single `modelFor` mandate with role-qualified generation/judge selectors under the shared ledger and circuit breaker. Workers AI uses `NeuronMeter`; any other provider needs an approved equivalent cost meter/budget.
- Preserve the v1 Story 1.2 `NO-GO` and audit limitations.
- Permit one bounded recovery attempt; prohibit an open-ended provider/model bakeoff.
- Allow Stories 1.3–1.6 to proceed.
- Allow Story 1.7 request/schema work, but hold its live integration pending generation qualification.
- Hold Stories 1.8–1.9 pending judge qualification.
- A second `NO-GO` triggers MVP review rather than another recovery matrix.
- Epic 2 reuses the interface and qualification rules, not a particular provider.
- Epic 3 recalibration invalidates the affected semantic qualification and requires new evidence.

### 4.9 Story 1.2 — Judge Contract Fidelity and Recovery Spike

Retitle the story and preserve completed v1 work as immutable history. Do not mark the original fidelity acceptance criterion satisfied.

Reframe the remaining tasks:

- **Task 6 — completed operational v1 `NO-GO`:** Record that the authorized v1 matrix ran and conservatively failed. Do not describe it as passing the Story 1.2 gate.
- **Task 8 — recovery boundary:** Bind the recovery to approved AD-2/AD-9/AD-11, preserve the v1 evidence, and scope planning to at most one recovery matrix. This task does not authorize any live call.
- **Task 9 — evidence v2, offline first:**
  - close and type-check every top-level and nested result object;
  - reject unknown and sensitive fields;
  - recompute approval, headroom, call cap, preflight blockers, terminal stage, outcome, and summary invariants;
  - fingerprint exact provider/model configuration, adapter, runtime, prompt, schema, request, and executable sources;
  - require the running adapter to self-report the frozen build/source/config/model-allowlist manifest in health and call responses, compare it with the expected manifest before the first live call, and retain each match;
  - bind each verdict to the exact Candidate reference under review, while stating that reference equality alone does not prove semantic evaluation;
  - record every contract/normalization fixture case by stable ID with expected and actual result;
  - report direct provider-wire, direct canonical, repaired, failure-taxonomy, latency, and allowlisted usage observations separately;
  - detect evidence tampering and source drift deterministically, disclose residual upstream-provenance limits, and label provider origin operationally attested unless an authoritative provider-issued identity is retained; and
  - make no live calls while building or validating v2.
- **Task 10 — freeze the recovery target:** Record the primary/fallback configurations, outer `JudgeResult` contracts, canonical-verdict adapters, prompts, parameters, thresholds, candidate-binding rule, isolated judge-call latency/cost allocations, documentation support, and maximum cost/call cap. Obtain fresh approval.
- **Task 11 — one live matrix:** Run one recorded probe and at least 20 counted trials per configuration, sequentially, with identical frozen inputs and no retries or replacement trials. Retain and verify all outcomes.
- **Task 12 — decision:**
  - Structural `GO` only when every configuration independently meets all structural, canonical, candidate-reference-binding, isolated judge-call latency/cost, fixture, artifact-integrity, provenance-disclosure, and report-integrity predicates. This removes Story 1.2's fidelity hold but is neither semantic qualification nor full orchestration readiness.
  - Otherwise produce `NO-GO`, keep Story 1.2 `in-progress`, preserve the evidence, block Story 1.8, and trigger MVP review. Do not authorize a third attempt.

No production code, root deployment configuration, persistent remote resources, deploy, commit, or push is part of the recovery spike.

### 4.10 Story 1.5 — grounding and personal-name policy ownership

Amend Story 1.5 so its grounding module owns the pure, Node-importable personal-name policy check and its fixtures. The grounding report records the policy result and stable reason; `fail` or `unknown` rejects before judging. This is a local policy layer, not another inference call, so it does not increase `E`.

### 4.11 Story 1.7 — generation-output qualification

Add a separate generation qualification using the evidence-v2 machinery and a frozen local bundle/seed:

- Test each proposed primary/fallback generation configuration with a recorded probe plus at least 20 counted trials.
- Require at least 95% direct-valid AD-5 Candidates per configuration; do not pool rates or replace failures.
- Report repair-assisted output separately.
- Treat missing fields, coercion, drift, or invented values as failures.
- Route generation through its qualified role selector and applicable cost meter. Do not retain Story 1.7's requirement that every role share the single `modelFor` switch.
- Live trials require separate approval and immutable evidence; they do not run in CI.
- `NO-GO` blocks live generation integration and triggers architecture review, but does not consume the single judge-recovery attempt.

### 4.12 Story 1.8 — composite Judge Stage

Change the objective and acceptance criteria so the stage:

1. runs deterministic AD-4/AD-5 checks and consumes Story 1.5's local personal-name policy result before judging;
2. sends only a surviving Candidate to a structurally qualified `JudgeProvider` during implementation;
3. makes exactly one judge call per Candidate;
4. uses only the approved wire contract and lossless adapter;
5. validates the outer `JudgeResult` candidate reference, then accepts only a complete inner canonical verdict covering gates 1–9, tone, and claims;
6. passes only when the deterministic checks, personal-name policy, and semantic verdict all pass;
7. treats repair failures, missing semantics, ambiguity, mismatch, timeout, and provider failure as a failed attempt; and
8. remains production-disabled until Story 1.7 generation qualification, Story 1.13 semantic qualification, and Story 1.9 full-pair latency/cost qualification are valid for the exact configuration.

### 4.13 Story 1.9 — orchestration and fallbacks

Align its acceptance criteria with revised AD-9:

- enforce the six-call ledger and `min(3, floor((6 - E) / 2))` candidate bound;
- reserve budget only for complete generation-to-judge pairs;
- enforce the measured role allocations and full request deadline under the provisional 15-second ceiling;
- allow only currently qualified AD-11 configurations;
- count every failed/invalid call before invocation accounting; and
- retain the existing house-Brief, circuit-breaker, aggregate-counter, provider-appropriate cost meter, and fail-closed behavior.

### 4.14 Story 1.13 — qualification and regression evidence

Split its harness into three explicit tiers:

1. deterministic schema/grounding/rubric fixtures, including personal-name policy `pass`, `fail`, and fail-closed `unknown` cases;
2. separately approved manual structural and candidate-binding qualification; and
3. semantic calibration against the authoritative golden set.

Bind evidence to exact production hashes and role configurations. Primary and fallback configurations pass independently. Report provider-wire, canonical, binding, repair, and semantic results separately. Manual metered tests are authorization-gated operations requiring fresh explicit approval; they do not run in CI.

Story 1.13 may rerun structural/pre-deploy evidence only for the exact provider, model, request parameters, prompt template, provider-wire schema, adapter, candidate-binding mechanism, runtime, and timeout/call policy that passed Story 1.2. It is verification of an already structurally qualified primary/fallback pair, not another provider/configuration bakeoff. A change to any structural-identity field returns to MVP/governance review and requires new authority outside Story 1.13. A rubric or golden/anti-golden corpus change invalidates semantic evidence and requires the semantic tier to rerun for the unchanged structural identity; a resulting prompt-template, request-parameter, or wire-contract change also invalidates structural qualification.

### 4.15 Story 2.4 — domain mode reuses the Gate

Clarify that domain mode reuses the canonical Gate, deterministic ownership, qualification machinery, schema, and orchestrator. It adds only domain Evidence Bundle, grounding, breadcrumb, and context rules. It may not introduce a domain-specific judge/provider/adapter, bypass qualification, or fork the canonical verdict contract.

### 4.16 Story 3.8 — recalibration invalidates qualification

Add that rubric or golden/anti-golden corpus changes invalidate semantic qualification. Production remains blocked until Story 1.13's semantic tier is rerun for the unchanged structural identity. A provider, model, request-parameter, prompt-template, provider-wire-schema, adapter, candidate-binding-mechanism, runtime, or timeout/call-policy change invalidates the structural base and returns to MVP/governance review; Story 1.13 cannot use recalibration as authority for a new structural configuration. If a semantic change also changes the prompt template, request parameters, or wire contract, both qualifications are invalidated. Recalibration may not bypass deterministic checks, lower the approved fidelity threshold, pool primary/fallback rates, or reinterpret malformed output.

### 4.17 Sprint status and preservation boundary

- Keep Story 1.2 `in-progress`.
- Keep Stories 1.7–1.9 in their current backlog states; express holds in the plan rather than inventing status values.
- Add, remove, or renumber no epics or stories. Therefore `sprint-status.yaml` requires no structural edit under checklist item 6.4.
- Preserve the v1 result pair and audit addendum byte-for-byte.
- Do not change production code, tests, root deployment configuration, live provider state, or remote resources through Correct Course.

## 5. MVP Impact and Action Plan

### MVP impact

The MVP's owner experience and core value proposition remain unchanged. The correction introduces a qualification checkpoint and may affect sequencing. Story 1.2 contains one structural recovery attempt for one frozen primary/fallback pair. Semantic gating remains in MVP scope, but its later Story 1.13 qualification tier evaluates that same pair and is not another structural recovery attempt. Only a second evidence-backed structural `NO-GO` opens an explicit decision about reducing or replacing semantic model gating in the MVP.

### Ordered action plan

1. **Product Manager and Solution Architect:** ratify the PRD, Epic 1, AD-2, AD-9, AD-11, Stack, Verification, Deferred, and solution-design amendments.
2. **Product Owner:** update the affected story text, confirm sequencing, and keep Story 1.2 `in-progress`.
3. **Developer/QA:** implement evidence v2 and prove its fixture, tamper, provenance, rendering, and source-drift behavior offline.
4. **Solution Architect:** approve the exact primary/fallback recovery configurations and any new provider security/operational boundary.
5. **Operator/Justin:** approve the exact account/plan, models, maximum calls, and maximum cost after seeing the frozen run plan and headroom evidence.
6. **Developer/QA:** execute the single structural matrix and produce evidence whose artifact integrity, runtime-manifest binding, and disclosed provenance limits are independently verifiable.
7. **Product Owner and Solution Architect:** rule structural `GO` or `NO-GO`; after `GO`, complete generation qualification, Story 1.13 semantic qualification, and Story 1.9 full-pair latency/cost qualification before production integration. On `NO-GO`, initiate MVP review.

Dependencies are deliberately ordered: no live recovery calls precede architecture ratification, offline evidence-v2 completion, frozen configuration, and fresh operational approval.

## 6. Success Criteria

The course correction succeeds when:

- the PRD and architecture express a consistent fail-closed composite Gate;
- every affected story uses the same role-specific qualification and six-call-ledger rules;
- v1 evidence remains immutable and is not overstated;
- evidence v2 rejects unknown/sensitive fields, detects tampering/drift, proves artifact and runtime-manifest consistency, reports every fixture and live classification transparently, and does not overstate upstream provider provenance;
- one exact primary and one exact fallback configuration are evaluated without pooling, retries, or replacement trials;
- Story 1.2 structural `GO` is issued only when each configuration meets all predeclared structural, canonical, candidate-reference-binding, isolated judge-call latency/cost, provenance-disclosure, and integrity predicates; production qualification additionally requires current Story 1.7 generation, Story 1.13 semantic, and Story 1.9 full-pair evidence; and
- a second `NO-GO` terminates model shopping and routes a concrete MVP decision.

## 7. Handoff and Governance

This proposal is a major course correction because it changes architectural authority, acceptance gates, and story sequencing. Its implementation size is moderate and does not constitute a product pivot.

| Role | Responsibility |
| --- | --- |
| Product Manager | PRD, Epic 1 scope, and MVP contingency |
| Solution Architect | AD-2, AD-9, AD-11, role configuration, adapters, qualification, latency, and external-provider boundary |
| Product Owner | Story contracts, dependency holds, sprint bookkeeping, and outcome ruling |
| Developer/QA | Evidence-v2 implementation, offline verification, approved matrix, and reproducible reports |
| Operator/Justin | Explicit approval for exact metered calls and the final course-correction decision |

No role may infer authority to weaken the canonical contract, run extra matrices, change providers, deploy, or publish from approval of this proposal.

## 8. Checklist State

- Sections 1–5: complete.
- Section 6.1, proposal completeness review: complete.
- Section 6.2, accuracy/consistency review: complete; PRD/Epic, architecture, and evidence reviews found no remaining release-blocking contradictions.
- Section 6.3, explicit user approval: complete; Justin approved on 2026-08-16.
- Section 6.4, sprint-status structural update: N/A because no epic/story IDs or membership change.
- Section 6.5, next steps and handoff: complete; route to Product Manager and Solution Architect first, then Product Owner and Developer/QA under the separate authority boundaries above.

## 9. Decision Record

Current decision: approved for finalization and governed handoff on 2026-08-16.  
Incremental review: Proposals 1–17 accepted for inclusion.  
Approval conditions: approval authorizes finalization and handoff only.  
Execution authorization: none; this document proposes planning changes and handoffs only.
