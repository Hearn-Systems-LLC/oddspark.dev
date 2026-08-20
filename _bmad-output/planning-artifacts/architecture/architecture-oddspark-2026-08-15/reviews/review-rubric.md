# Good-Spine Rubric Review

**Target:** `ARCHITECTURE-SPINE.md`  
**Review date:** 2026-08-19  
**Verdict:** **PASS WITH MEDIUM FINDINGS** — the amended spine remains a usable, fail-closed build substrate. The Workers AI candidate-pair decision preserves the existing contracts, separates role evidence, retains prior NO-GO evidence, and withholds live-call authority. No critical or high-severity divergence was found, but two qualification-cycle semantics should be made more mechanical before fresh plans are derived.

## Deterministic gate

`lint_spine.py` passes with zero findings: no placeholders, duplicate AD identifiers, malformed AD sections, or unpinned named stack entries were reported.

## Checklist walk

| Good-spine criterion | Result | Assessment |
| --- | --- | --- |
| Fixes the real divergence points for the level below and misses none | Pass with note | AD-11 fixes provider family, exact primary/fallback model IDs, independent generation/judge evidence, immutable prior results, preserved thresholds, and the next owner-review boundary. The exact accounting unit for the newly authorized “one cycle” is not closed enough for independent Story 1.4 and 1.11 planners. |
| Every AD Rule is enforceable and prevents its stated divergence | Pass with note | The qualification identities, closed manifests, role-specific refs, activation rules, and live-call approval boundary are mechanically testable. The stop condition uses the phrase “either required role,” which is compatible with fallback semantics but does not explicitly define when a role is NO-GO across its two configurations. |
| Nothing under Deferred could let two units diverge | Pass with note | Fresh plan details correctly remain with the governed story workflows. However, “Operational envelope — decided in fact” is a large collection of binding rollout and environment rules placed under Deferred; this is an older organization issue rather than a defect introduced by the model amendment. |
| Named technology is verified current | Pass | The exact Llama model IDs are pinned, and the memlog records an owner decision based on current Workers AI JSON Mode documentation with the explicit warning that schema compliance is not guaranteed. The architecture does not infer qualification from documentation support. |
| Ratifies rather than contradicts the brownfield codebase | Pass | The change stays behind the existing provider/adapter and qualification boundaries. It does not authorize a new provider, route, binding, persistence path, schema relaxation, or production activation. |
| Covers source capabilities and inherited constraints | Pass | CAP-2 through CAP-4 and the generation/judge story gates retain their existing ownership. The candidate amendment does not weaken the Evidence-role separation or production activation manifest. |
| Every feature-altitude structural dimension is decided, deferred, or open | Pass | Runtime assembly, provider strategy, state authority, failure behavior, rollout, operations, qualification, activation, and fallback behavior are all represented. |

## Findings

### M1 — Define the accounting unit and consumption rule for the one fresh cycle

- **Why it matters:** AD-11 authorizes “exactly one fresh ... structural qualification cycle,” while Story 1.4 and Story 1.11 qualify two configurations independently for two roles. Two planners could reasonably interpret this as one shared four-configuration cycle, one cycle per role, or one attempt per configuration. The existing zero-call recovery rule explains when an attempt does not consume allowance, but not what allowance this amendment creates or when a partial called run consumes the remaining work.
- **Divergence enabled:** generation and judge plans could assign different run groupings, replacement rights, or stop points while each claiming compliance.
- **Disposition:** **Autofix in AD-11 before plan derivation.** Name the cycle identity or closed set of four role/configuration cells, state whether execution approvals remain per role/plan, and state how call-start in one cell affects permission to execute the others. Preserve the existing verified zero-call exception.

### M2 — Make the required-role NO-GO predicate explicit

- **Why it matters:** The Rule says primary and fallback configurations qualify independently, production uses a qualified primary or qualified fallback, and a “NO-GO for either required role” ends the Workers AI course. It does not say explicitly whether one failed configuration plus one passing configuration leaves that role qualified, or whether both candidates must pass.
- **Divergence enabled:** one builder could activate a role on the passing fallback, while another could treat failure of the primary as the role-level NO-GO that ends the course.
- **Disposition:** **Discuss, then encode in AD-11.** Define role-level GO/NO-GO as a predicate over the primary and fallback results. If both configurations are mandatory, say so; if one qualified configuration is sufficient, define which production selection/fallback behaviors remain available.

### L1 — Move binding operational rules out of Deferred when the spine is next polished

- **Why it matters:** The operational-envelope item says it is “decided in fact” and contains binding deployment, activation, rollback, proof, and sequencing rules. That content is not genuinely deferred.
- **Divergence enabled:** a reader treating Deferred as non-binding could overlook rollout invariants.
- **Disposition:** **Defer to the next spine organization pass.** Promote the binding rules to an AD or Consistency Convention and leave only unresolved maintenance work under Deferred. This does not block the candidate-pair planning correction.

## Amendment-specific strengths

- It makes the scope small: retain Workers AI and change only the candidate model family.
- It freezes exact model IDs rather than aliases and keeps generation and judge identities/evidence non-transferable.
- It does not reinterpret or erase the gpt-oss NO-GO evidence.
- It preserves closed Candidate and CanonicalVerdict contracts and forbids repair/coercion/schema weakening.
- It separates architecture/model selection from fresh cost-capped execution approval.
- It defines the failure boundary: no further Workers AI model bakeoff and no provider/AI Gateway evaluation without another owner architecture decision.

## Re-review closure — 2026-08-19

**Updated verdict:** **PASS** — no critical, high, or medium finding remains from this review. The prior low-severity organization finding remains non-blocking.

### M1 — Closed

The new **Post-review cycle accounting** rule defines exactly one generation matrix and one judge matrix, binds both selected configurations within each matrix, preserves separate plans/approvals/caps/evidence/markers, consumes each role allowance at its first durable call-start, preserves the marker-bound zero-call exception, and prohibits retries, replacement models, extra matrices, and allowance transfer. Independent planners can no longer choose incompatible accounting units or replacement rights.

### M2 — Closed

The new closed `RoleQualificationSet` makes partial-success behavior mechanical: each configuration carries its own GO/ref or NO-GO/null result; a role is GO iff at least one configuration is GO; two NO-GO members end the Workers AI course; and a lone passing configuration is the only selectable configuration. Atomic activation now consumes role-level refs and defines primary/fallback selection from that exact set. The earlier “required role” wording is therefore resolved by an enforceable predicate rather than prose interpretation.

### L1 — Remains low, non-blocking

The binding operational envelope is still located under **Deferred** despite being labeled “decided in fact.” Its contents are explicit enough to prevent immediate implementation divergence, so it is not a critical/high handoff risk, but the next spine organization pass should promote those rules into an AD or Consistency Convention.

### Remaining critical/high findings

None.
