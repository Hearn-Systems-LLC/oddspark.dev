# Reconciliation — Approved Course Correction → PRD and Addendum (2026-08-16)

Scope: the approved Sprint Change Proposal was checked against `prd.md` and `addendum.md` only for the PRD-level amendments to FR-3, FR-4/Open Question 2, and Open Question 3. Architecture, epic, story, evidence-v2, and operational changes are outside this review. Verdict: the normative PRD accurately incorporates all three approved changes; one material addendum contradiction remains, plus one minor placement concern.

## Covered

- **FR-3 fail-closed behavior:** FR-3 now states that malformed, incomplete, ambiguous, schema-invalid, candidate-unbound, or otherwise unqualified judge results reject the Candidate and count as failed attempts. It also prohibits repair, coercion, omission, or fallback interpretation from converting such a result into a pass. This preserves the approved observable consequence without weakening the nine-gate product promise.
- **FR-4 six-call arithmetic:** FR-4 now permits only complete generation-to-judge pairs within a six-model-call strike ledger, counts model-based evidence, generation, and judge invocations, and uses `min(3, floor((6 - E) / 2))`. Its examples correctly distinguish `E=0` (at most three pairs) from `E=1` (at most two), so three Candidates are a ceiling rather than an unconditional promise.
- **FR-4 failure consequences:** The testable consequences prevent partial pairs from starting, count failed/timed-out/invalid invocations against the ledger, retain the wall-clock bound, and return the curated house Brief on exhaustion. These match the approved correction.
- **Open Question 2:** OQ2 repeats the same six-call arithmetic and fallback behavior, resolving the earlier contradiction between a three-Candidate promise and evidence-call consumption.
- **Open Question 3 partial reopening:** OQ3 keeps the composite Gate and canonical internal verdict settled while identifying the exact judge provider/model, candidate-bound provider wire contract, lossless adapter, and latency allocation as unresolved pending qualification. It also retains one-call semantic judging and fail-closed behavior. This matches the approved boundary and does not reopen the product rubric.
- **Normative-versus-technical boundary:** The FR-3 failure consequence and FR-4 call ceiling are appropriate normative PRD content because they define acceptance, cost, and fallback behavior. Naming the unresolved OQ3 qualification dimensions is also justified because it records what remains undecided without selecting a provider or adapter implementation.

## Gaps

### G1 — Addendum Open Question 3 contradicts the approved partial resolution

- **Current addendum:** “Gate implementation shape ... model self-check vs. separate judge pass vs. hybrid.”
- **Approved/current PRD state:** the implementation shape is no longer wholly open. The Gate is a composite of local deterministic/policy validation and a separate one-call semantic judge. Only the exact provider/model, candidate-bound outer wire representation, lossless canonical adapter, independently qualified primary/fallback configurations, and latency allocation remain unresolved.
- **Why it matters:** A reader following the addendum as the technical-decision parking lot could reopen a settled architecture boundary or choose a self-check-only design that conflicts with FR-3 and OQ3.
- **Recommended addendum correction:** replace the stale option list with the settled composite-gate shape and park only the remaining provider/wire/adapter/qualification/latency decisions. Keep implementation specifics non-normative and defer their final values to architecture.

### G2 — Minor: provider-meter mechanism appears in the normative PRD cost guardrail

- **Current PRD:** the Cost guardrail says “role-specific provider meters enforce the same approved budget.”
- **Approved product requirement:** the six-call ledger is the per-press cost cap; the correction does not require the PRD to prescribe how each provider is metered.
- **Why it matters:** “role-specific provider meters” is an architecture/operations mechanism and can create unnecessary PRD churn if the provider or metering implementation changes while the six-call product cap remains intact.
- **Recommended placement:** keep the normative PRD sentence at “FR-4's six-call ledger is the LLM cost cap per button press.” Preserve provider-appropriate meter mechanics in the addendum and architecture. This is a placement refinement, not a blocker to the three approved PRD changes.

## Conclusion

No approved FR-3, FR-4/OQ2, or OQ3 content is missing from `prd.md`, and none is materially weakened. Before treating the PRD package as fully reconciled, update the addendum's stale OQ3 entry. The provider-meter wording may be relocated during that edit to keep the PRD product-normative and the addendum/architecture mechanism-specific.
