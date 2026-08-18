---
name: reconcile-course-correction
type: architecture-review
reviews:
  - ../ARCHITECTURE-SPINE.md
  - ../solution-design.md
against:
  - ../../../sprint-change-proposal-2026-08-16.md
  - ../../../prds/prd-oddspark-2026-08-15/prd.md
  - ../../../prds/prd-oddspark-2026-08-15/addendum.md
created: '2026-08-16'
verdict: aligned-with-gaps
---

# Course-Correction Reconciliation — Architecture vs Approved Inputs

## Verdict

**ALIGNED WITH GAPS.** The architecture incorporates the approved load-bearing correction: the composite Gate, candidate-bound outer judge result, fail-closed canonical mapping, single-owner grounding/privacy policy, six-call arithmetic, role-specific metering, staged independent qualification, preserved Story 1.2 `NO-GO`, and bounded operational authority. No architectural redesign is required. Three reconciliation gaps remain; one privacy-language conflict should be resolved before implementation, while the other two are governance/document-maintenance clarifications.

## Reconciliation matrix

| Concern | Approved input | Architecture state | Result |
| --- | --- | --- | --- |
| AD-2 composite Gate | Local AD-4/AD-5 checks precede one semantic judge; malformed or unbound output fails | Spine AD-2 implements the ordering, exact inner verdict, frozen lossless adapter, and fail-closed conditions | Aligned |
| Candidate binding | Outer `JudgeResult {candidate_ref, verdict}`; equality proves binding, not semantic evaluation | Spine AD-2 and solution design state the exact distinction | Aligned |
| AD-3/AD-9 arithmetic | Six total calls; complete pairs only; `min(3, floor((6-E)/2))`; failed calls consume budget | Spine AD-3/AD-9 and solution design use identical arithmetic and deadline behavior | Aligned |
| Provider metering | Role-qualified selectors share ledger/deadline; Workers AI uses `NeuronMeter`; another provider needs an approved equivalent | Spine AD-9/AD-11 and solution design preserve this boundary | Aligned |
| Qualification stages and identities | Story 1.2 structural/binding/isolated judge; Story 1.7 generation; Story 1.13 semantic; Story 1.9 full-pair; exact identities, no pooling | Spine AD-11 and Verification convention preserve all four stages and structural/semantic invalidation rules | Aligned |
| PII policy ownership | Mechanical checks local; Story 1.5 owns tri-state personal-name policy; non-pass rejects without a model call | Spine AD-2/AD-4 and solution design assign the policy exactly once and make it non-overridable | Aligned, subject to Finding 1 |
| Story 1.2 evidence | Preserve 2026-08-16 v1 `NO-GO`; one separately approved recovery; second `NO-GO` triggers MVP review | Spine Deferred and solution design retain the exact outcome and one-attempt boundary | Aligned |
| Authority | No live calls before ratification, offline v2, frozen configuration, and fresh exact operational approval; no inferred deployment/provider authority | Spine requires fresh approval, bans credentialed CI tests, and requires a new decision for external provider/AI Gateway | Aligned, subject to Findings 2–3 |

## Finding 1 — PRD's “no PII is fetched” promise conflicts with the scan-and-filter architecture (MATERIAL CLARIFICATION)

- **PRD:** FR-8 says no PII “is fetched or used” (`prd.md:157-164`), and the cross-cutting privacy guardrail repeats no PII for personalization/generation (`prd.md:243-245`). The PRD definition includes names, personal phone numbers/emails, and identifiable photos (`prd.md:58`).
- **Architecture:** AD-4 fetches the submitted public site, canonicalizes scan text, then applies mechanical PII and personal-name checks to extracted evidence/Breadcrumbs (`ARCHITECTURE-SPINE.md:59-63`). The solution design promises no PII **in Breadcrumbs**, not that source HTML containing PII can never be fetched (`solution-design.md:38-40`).
- **Conflict:** a scanner cannot reliably know a public page contains a person's name or personal contact detail until it fetches at least the response containing it. The architectural control is therefore “do not retain, send to a model, use for generation, or render detected PII,” while the literal PRD sentence promises “do not fetch.” Both cannot be implemented together for arbitrary submitted sites.
- **Required ruling:** Product Manager and Solution Architect should choose precise data-lifecycle language. The minimally disruptive correction is to forbid detected PII from the Evidence Bundle/model input/output and define ephemeral scan-buffer handling, rather than claim it is never fetched. If “never fetched” is intended literally, the website scanner scope must be redesigned before Story 1.5.

## Finding 2 — Stack wording makes recovery selection look circular (GOVERNANCE CLARIFICATION)

- **Approved flow:** Story 1.2 freezes an exact primary/fallback recovery pair, receives fresh approval, and tests it before structural qualification (`sprint-change-proposal-2026-08-16.md:209-232`). Production remains blocked until all qualification stages are current (`:326-332`).
- **Architecture:** the Stack says “Judge provider/model — Unset until AD-11 structural and semantic qualification” (`ARCHITECTURE-SPINE.md:131-140`), while Deferred says it is unset “until recovery” (`:173-177`) and solution design says an exact pair is frozen for the recovery (`solution-design.md:64-68`).
- **Risk:** “unset” can mean either no recovery candidate may be selected or no production role may be configured. The former is circular: Story 1.2 cannot qualify an unselected pair.
- **Recommended edit:** distinguish `Recovery candidate pair: unset until frozen and separately approved` from `Production judge role: disabled until Stories 1.2, 1.13, and 1.9 are current for the exact identity`.

## Finding 3 — Architecture provenance does not record the approved correction as an authority source (TRACEABILITY)

- The spine is marked `status: final` and updated 2026-08-16, but its frontmatter sources only the original spec and PRD; `companions` is empty (`ARCHITECTURE-SPINE.md:1-15`).
- The substantive amendments came from the approved Sprint Change Proposal, and `solution-design.md` is an explicit companion. Omitting both makes it difficult to reconstruct why AD-2/AD-9/AD-11 and the one-recovery boundary changed on 2026-08-16.
- **Recommended edit:** add the approved Sprint Change Proposal and PRD addendum to `sources`, and add `solution-design.md` to `companions`. This is provenance only and grants no implementation or operational authority.

## Minor maintenance note — stale addendum item

The PRD resolves analytics Open Question 4 through AD-8 (`prd.md:250-255`), and the spine implements it (`ARCHITECTURE-SPINE.md:97-101`), but the addendum still parks the analytics approach as deferred (`addendum.md:13-18`). Remove or mark that line historical/resolved to avoid reopening a settled decision.

## Authority conclusion

This review does not approve provider selection, metered calls, external-provider use, implementation, deployment, commit, or push. After Findings 1–3 are reconciled, the architecture is fit to hand to Product Owner/Developer for the already-approved offline Story 1.2 evidence-v2 work. Any live recovery matrix still requires the frozen run plan and Justin's fresh approval for the exact account/plan, models, maximum calls, and maximum cost.
