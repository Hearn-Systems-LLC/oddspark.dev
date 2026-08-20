---
name: oddspark-architecture-spine-adversarial-review
type: architecture-review
reviews: ../ARCHITECTURE-SPINE.md
stance: adversarial
created: '2026-08-19'
verdict: holes-found
---

# Adversarial Review — Governed Workers AI Qualification Correction

## Verdict

**NOT YET DIVERGENCE-SAFE.** The selected Workers AI pair is clear, the previous `gpt-oss` results remain immutable, and the ban on schema weakening and unapproved live calls is enforceable. However, AD-11 does not define the aggregate qualification object that production activation needs, does not say whether the four model-role matrices are one allowance or four, and permits opposite decisions when only part of the pair passes. Those are build- and governance-changing holes, not prompt-tuning details.

## Method

For each finding, two downstream units were independently derived from the current ADs. Each unit obeys the literal rules, but the units disagree in a way that changes retained authority, permitted live work, production selection, or the post-`NO-GO` course.

## H1 — Per-configuration evidence cannot fit the single activation ref

**Severity: CRITICAL**

AD-11 says rates never pool, fallbacks never replace failed primary trials, generation and judge qualify independently, and the primary and fallback are each subject to qualification. A `QualificationManifest`, however, contains one `role` and one `resolved_model`, so each model-role configuration necessarily produces its own `qualification_ref`. That yields up to four refs:

- generation / Llama 3.3 70B;
- generation / Llama 3.1 8B;
- judge / Llama 3.3 70B;
- judge / Llama 3.1 8B.

The `ProductionActivationManifest` has only one `generation_ref` and one `judge_ref`, while runtime is told to choose a qualified primary or qualified fallback.

Two compliant downstream builds diverge:

- **Unit A — primary-only activation:** stores the primary configuration's ref in each role field. The fallback has retained evidence but cannot be proven authorized by the deployed manifest, so runtime never selects it.
- **Unit B — composite-by-convention:** creates an ungoverned role bundle that hashes the two refs and places that new hash in `generation_ref`/`judge_ref`. Runtime can select both models, but neither the bundle schema, hash domain, ordering, partial-pass rules, nor validation is defined by any AD.

A third superficially plausible build puts the fallback ref in the role field whenever the fallback is selected, which would require mutating the activation manifest during an outage and contradict the intended request-time selector.

**Required correction:** define a closed role-qualification set (or put explicit `primary_ref` and `fallback_ref` fields in activation), including canonical hash, model-to-ref binding, nullability, validation, and whether each member is required. The production selector must consume that exact deployed structure.

## H2 — “Exactly one fresh cycle” has no countable allowance unit

**Severity: HIGH**

The owner review authorizes planning for “exactly one fresh ... structural qualification cycle” using two models for both roles. Elsewhere AD-11 calls Story 1.4 and Story 1.11 independent gates and says a marker-bound zero-call preflight consumes no “qualification allowance.” It never defines whether allowance attaches to the owner course, story/role, plan, model configuration, or executed matrix.

Two compliant qualification coordinators diverge:

- **Unit A — one course allowance:** treats the first call-start in any one of the four model-role matrices as consuming the sole cycle. A generation run that stops after two failed probes makes every judge call impermissible.
- **Unit B — per-role/per-configuration allowance:** permits four independently approved executions because each `QualificationManifest` binds one role and one resolved model. Generation and judge both run, and each model obtains independent rates.

Both retain zero-call preflights correctly and neither reruns a consumed matrix, yet their permitted call counts and evidence sets differ materially.

**Required correction:** enumerate the exact allowance inventory before plans are prepared—for example, one generation matrix containing two configurations plus one judge matrix containing two configurations—and state what event consumes each allowance, whether a matrix may stop after failed probes, and whether a stopped matrix consumes uncalled configuration rows.

## H3 — Partial success has two opposite, AD-compliant meanings

**Severity: HIGH**

The spine says each role qualifies independently, production uses the qualified primary when available and otherwise the qualified fallback, and a `NO-GO` for either required role ends the Workers AI course. It does not define whether “required role” means:

1. at least one qualified configuration for generation/judge; or
2. both the named primary and fallback must qualify for that role.

Consider this retained result: generation 70B `GO`, generation 8B `NO-GO`, judge 70B `GO`, judge 8B `NO-GO`.

- **Unit A — role viability:** declares both required roles `GO` because each has one qualified model, activates primary-only operation, and treats fallback as unavailable.
- **Unit B — pair integrity:** declares both roles `NO-GO` because primary/fallback rates cannot pool and each named configuration was “subject to independent qualification”; it ends the Workers AI course and returns to owner architecture review.

The inverse result (primary fails, fallback passes) is even less clear: “otherwise use the qualified fallback” supports shipping it, while “primary/fallback pair” and “a NO-GO ... ends this course” support halting.

**Required correction:** define a deterministic role outcome table for all four combinations (`primary GO/NO-GO × fallback GO/NO-GO`), then define the overall course outcome across independent generation and judge roles. State whether degraded single-model operation is allowed and what production label/observability it requires.

## H4 — Fallback selection is not a closed state machine

**Severity: HIGH**

AD-11 says “use the qualified primary when available, otherwise the qualified fallback,” and permits a subsequent new pair to select fallback after an invoked primary returns `unavailable`, `circuit_open`, `timeout`, or invalid provider output. “Available” is not a typed input or stable decision, and the text does not say whether fallback selection is sticky for the strike, request-local, process-local, or externally controlled.

Two runtime selectors obey the prose but diverge:

- **Unit A — pair-local selector:** every new pair probes/selects primary first. A primary timeout consumes generation; the next pair uses fallback generation but independently selects primary judge. This permits a mixed-model pair because roles qualify independently.
- **Unit B — strike-local failover:** after any listed primary failure, marks the primary unavailable for the whole strike and uses fallback for both roles on the next pair. It reads “once a pair starts, roles do not change” as permitting a new uniform fallback pair.

They spend different calls, exercise different qualified identities, and can yield different house-fallback rates. Neither changes roles during a pair or re-judges the same Candidate.

**Required correction:** define role-specific selection inputs and transitions. Explicitly state whether generation and judge may select different primary/fallback models in one pair, the scope and lifetime of an unavailability decision, whether invalid *schema* output triggers failover or only retry, and whether primary is reconsidered later in the same strike.

## H5 — A new Workers AI `NO-GO` has no complete terminal transition

**Severity: HIGH**

The Deferred section says any required-role `NO-GO` returns to an explicit provider decision and does not open another Workers AI bakeoff. AD-11 says no other model, provider, or AI Gateway evaluation may occur before a new owner architecture decision. The runtime failure table separately says missing/stale qualification serves a committed or house Brief.

Two governance/runtime units diverge after the new cycle fails:

- **Unit A — planning stop only:** retains all evidence, marks Stories 1.4/1.11 blocked, makes no activation manifest, and continues the approved house-only path. No existing deployed identity is changed.
- **Unit B — course-wide invalidation:** interprets “ends this Workers AI course” as invalidating Workers AI model-role authority generally, withdraws any activation containing Workers AI refs, and forces house fallback even if an older independently qualified identity existed.

The current project may have no active qualified identity, but the AD is a reusable architecture rule; the two implementations become materially different as soon as production exists. The text also does not identify the artifact/status that records the terminal course outcome or the exact stories that remain open versus complete-with-`NO-GO`.

**Required correction:** define the `NO-GO` transition explicitly: immutable evidence retained; exact attempted configuration barred from reclassification/retry; no new live qualification planning until owner architecture decision; affected story status; activation behavior; and whether unrelated/current production refs remain valid. State that house fallback is the runtime consequence only when no current applicable activation remains—not an inferred authority to withdraw a valid deployment.

## Minimal reconciliation needed before qualification planning

The spine need not change provider strategy or loosen any contract. It needs one compact governance/data amendment:

1. a closed per-role qualification-set schema that binds primary and fallback refs;
2. an exact two-matrix (generation and judge) allowance definition, including consumption events;
3. a partial-result decision table;
4. a role-specific fallback transition table; and
5. an explicit post-`NO-GO` terminal transition.

Until those are fixed, downstream planners cannot produce a uniquely authorized call plan, and runtime implementers cannot validate the fallback promised by the spine.

## Authority boundary

This review performs no provider call and grants no qualification, implementation, deployment, activation, commit, or push authority. It does not recommend another Workers AI model. It tests only whether independently built downstream units converge under the approved Llama course.

## Closure review — 2026-08-19 amendment

### Revised verdict

**MATERIALLY RECONCILED; ONE HIGH-SEVERITY TERMINAL-STATE GAP REMAINS.** The amendment closes the former activation-ref mismatch, defines two independent role allowances, makes partial success deterministic, and specifies role-local runtime failover. It does not yet close what happens when a consumed matrix cannot produce outcomes for both bound configurations, nor does it explicitly reject a role-level `no-go` ref from an active production manifest.

### Prior finding disposition

| Prior finding | Disposition | Evidence in amended AD-11 |
| --- | --- | --- |
| H1 — per-configuration refs do not fit activation | **CLOSED** | `RoleQualificationSet` binds both configuration outcomes and refs; activation's `generation_ref`/`judge_ref` are explicitly role-level refs. |
| H2 — allowance unit undefined | **CLOSED** | Exactly one generation matrix and one judge matrix exist; each consumes only its role allowance at first durable call-start; zero-call behavior and non-transfer are explicit. |
| H3 — partial success ambiguous | **CLOSED** | Role outcome is `go` iff at least one member is `go`; a sole passing configuration is the only selectable member; two failures end the Workers AI course. |
| H4 — fallback selection not closed | **CLOSED** | Each role resolves from its own role set before reservation; primary-first and the four runtime failover classes are explicit; switching occurs only for a subsequent complete pair. |
| H5 — post-`NO-GO` terminal transition incomplete | **PARTIALLY CLOSED / RECAST AS H6** | Two member `no-go` outcomes end the course and require owner architecture review, but interrupted/indeterminate matrix completion and activation rejection remain unspecified. |

## H6 — Consumed-but-incomplete matrices and `no-go` activation are not closed

**Severity: HIGH**

The amendment requires one matrix to bind both selected configurations and consumes the role allowance at the first durable call-start. `RoleQualificationSet`, however, permits only `go|no-go` for each member and requires both members to come from the same **completed** matrix. It defines no outcome for an infrastructure interruption, ambiguous provider accounting after a call-start, retained evidence failure, or other terminal condition that prevents one configuration from being tested. Because no retry or extra matrix is implied, such a run can consume the sole allowance without being representable as either a role set or an explicit course-ending result.

Two downstream coordinators still diverge:

- **Unit A — incomplete means course `NO-GO`:** records the untested member as `no-go`, emits a role set, and ends or degrades the course. That invents a model verdict without its required matrix evidence.
- **Unit B — incomplete means blocked forever:** emits no role set because the matrix was not completed, retains the consumed allowance, and cannot reach either the explicit owner-review transition or activation without another owner ruling.

There is a related activation fork. `ProductionActivationManifest` requires exact current role-level refs but does not explicitly require the referenced `RoleQualificationSet.outcome` to be `go`. One validator can reject a `no-go` role set because production requires applicable qualification stages current; another can accept it and rely on runtime's “otherwise the role is disabled and the strike uses the authoritative house path.” Both conform literally and produce different deployed authority.

**Required correction:** add a closed terminal matrix outcome for consumed-but-incomplete execution (for example `blocked` with an exact retained evidence ref and mandatory owner review, never synthesized as a configuration `no-go`), and state whether any new plan requires a new architecture decision. Require both `generation_ref` and `judge_ref` in an active manifest to resolve to current role sets whose outcome is `go`; house-only behavior should arise from a missing/invalid activation or an independently defined house-only manifest, not an active manifest carrying failed role evidence.

## Final closure review — 2026-08-19

### Final verdict

**PASS — DIVERGENCE-SAFE FOR THE REVIEWED CORRECTION.** No critical or high-severity finding remains from this adversarial review.

### H6 disposition — CLOSED

The latest amendment gives consumed-but-incomplete execution one explicit terminal state: after the first durable call-start, interruption, incomplete publication, missing terminal record, or ambiguous accounting is retained as `consumed_incomplete`; it emits no configuration or role ref, blocks the role, requires owner architecture review before another matrix, and cannot be recovered as zero-call or silently resumed. The former Unit A/Unit B divergence is therefore prohibited.

The activation fork is also closed: `generation_ref` and `judge_ref` must resolve to exact current `RoleQualificationSet` values with `outcome:"go"`, and refs to `no-go`, incomplete, ambiguous, stale, or superseded evidence explicitly reject. A production validator can no longer accept an active manifest carrying failed role evidence.

All prior critical/high findings H1–H6 are closed. This verdict concerns architecture convergence only; it grants no live call, implementation, deployment, activation, commit, or push authority.
