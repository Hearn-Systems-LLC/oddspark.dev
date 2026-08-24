---
title: Sprint Change Proposal — Specialist Judge Pipeline Recovery
project: oddspark
date: 2026-08-24
status: approved
approved_by: Justin
approved_at: 2026-08-24
trigger: Story 1.18.1 Decision protocol v2 semantic NO-GO
scope: major
mode: incremental-coaching
provider_execution_authorized: false
deployment_authorized: false
activation_authorized: false
---

# Sprint Change Proposal — Specialist Judge Pipeline Recovery

## 1. Issue Summary

Story 1.18.1 proved that prompt-only correction is not a reliable recovery architecture. Its revised prompt qualified structurally at `20/20` for both configurations, but the separately approved semantic run `semantic-8baaad6c-95dc-4546-9a7b-1e4afd1f3f7e` retained a terminal `NO-GO`: primary matched `11/24`, fallback `8/24`, and no `SEMANTIC` ref was emitted. Primary still passed weak-preservation, capability-duplication, contradiction, and contract-control cases; fallback also rejected three approved goldens.

The failed approach asks one model call to judge nine gates, tone, and claims and then aggregate its own answers. Structural validity therefore coexists with broad semantic compensation, agreeable default-pass behavior, and over-rejection. The owner selected approval precision over recall: a Candidate earns approval through positive independent evidence; uncertainty, contradiction, or missing support rejects.

## 2. Impact Analysis

- **Epic 1:** remains viable, but Story 1.18.1 closes as retained failed evidence. Story 1.18.2 is inserted before Story 1.19 to own the specialist pipeline recovery.
- **Later epics:** no scope change. They remain downstream of current judge/semantic/full-request authority.
- **PRD:** visitor outcome and MVP remain unchanged; no PRD edit is required.
- **Architecture:** AD-2, AD-3, AD-9, and AD-11 change. The Gate becomes deterministic prechecks plus a three-specialist waterfall; the ledger becomes twelve calls; specialist qualification and composite authority replace one broad judge role.
- **UX:** unchanged. Visitors see an approved Brief or the existing house fallback, never internal specialist findings.
- **Implementation:** Gate, strike orchestrator, qualification harnesses, manifests, activation verification, and full-request evidence must adopt the new versioned contracts. Historical evidence remains immutable.
- **Operations:** the hard route deadline remains mandatory, but Story 1.19 must measure the full waterfall before Justin approves a numeric activation ceiling.

## 3. Options and Recommendation

1. **Another single-pass prompt revision — rejected.** Two semantic cycles show that structural instruction following does not establish reliable discrimination.
2. **Unstructured multi-agent voting — rejected.** Majority or pooled confidence can approve a Candidate despite a failed product check and weakens evidence attribution.
3. **Deterministic prechecks plus three isolated specialists — approved.** It narrows cognitive scope, makes check ownership enforceable, prevents compensation, supports early rejection, and preserves deterministic final authority.
4. **Rollback or MVP reduction — rejected.** Removing retained evidence does not solve discrimination; the existing MVP remains achievable with the approved recovery.

Effort is high and risk is medium-high because Gate, orchestration, qualification, and activation identities change. Risk is bounded by offline-first work, closed schemas, frozen corpus/thresholds, zero-mismatch qualification, independent refs, exact live approvals, and house fallback.

## 4. Approved Architecture Changes

### Evaluation topology

Deterministic code owns schemas, linkage, grounding/privacy/number provenance, required preservation fields, exact declared capability/channel references, banned phrases, SpecialistResult validation, and final conjunction.

The sequential specialists are:

1. **Coherence:** Gates 1, 2, 8.
2. **Fit:** Gates 3, 4, 5, 6.
3. **Quality:** Gate 7, Gate 9, non-token tone, qualitative unsupported claims, invitation pressure.

The first non-pass stops production evaluation. A specialist returns exactly its assigned checks through a closed candidate-bound, pointer-supported `SpecialistResult`; it never emits an overall verdict. Detailed findings remain internal.

### Selection and retry

Primary/fallback qualify and select independently per specialist. Availability/circuit routing happens before invocation. Once invoked, any rejection, unknown, invalid output, error, or timeout rejects the Candidate; the same Candidate is never re-judged and no fourth semantic call exists.

Coherence, fit, and quality each receive one separately consumed structural qualification cycle. Every cycle has its own exact plan, call/cost caps, approval, retained evidence, and terminal marker. The three disclosures may be approved in one batch, but first call-start consumes only the named specialist allowance; no allowance transfers or resumes, and composite authority requires three current GO refs from the same frozen source/runtime identity.

### Budget and deadline

The shared strike ledger increases from six to twelve calls. A full attempt reserves one generation plus three specialist slots. `E=0` preserves at most three Candidates and `E=1` preserves at most two. Only never-invoked downstream slots release. The hard route deadline remains, but its replacement numeric ceiling is deferred to full-waterfall evidence and separate owner approval.

### Qualification and activation

Every specialist/configuration qualifies independently. Semantic qualification runs all applicable specialists for every frozen fixture even where production would short-circuit. Zero mismatches remain required for approved goldens, deliberate negatives, contradictions, binding, unknown, pointer, and conjunction controls.

Three current specialist role refs form one closed `JudgePipelineQualificationSet`; its hash is the downstream `judge_ref`. One combined `semantic_ref` binds that pipeline ref, frozen corpus/expectations, all reports and identities, deterministic precheck/aggregator identities, and zero-mismatch outcome. The existing activation manifest continues to carry one `judge_ref` and one `semantic_ref`; it never carries partial specialist refs.

## 5. Implementation Handoff

Change scope is **major**. Story 1.18.2 owns:

1. Versioned deterministic precheck and `SpecialistResult` contracts.
2. Three prompt/adapter identities with fixture-label leakage protection.
3. Twelve-call reservation, early-release, pre-call selection, and no-rejudge orchestration.
4. Offline adversarial coverage of ownership, pointers, unknowns, cross-specialist compensation, release accounting, and composite refs.
5. Independent structural/semantic qualification harnesses and one composite pipeline authority.
6. Story 1.19 handoff for full-waterfall latency, cost, deadline, ledger, and authoritative-commit evidence.

Architecture approval authorizes offline artifact and implementation work only. Provider calls, spend, model/provider substitution, deployment, activation, push, merge, and remote mutation remain separately governed. Any live plan requires a fresh exact call schedule, identities, retention, expiry, retry policy, and maximum cost approval.

## 6. Checklist Record

- [x] Trigger: retained Story 1.18.1 semantic `NO-GO` with exact evidence.
- [x] Core problem: failed single-pass architecture, not schema or corpus drift.
- [x] Epic 1 remains viable; Story 1.18.2 required; later epics remain downstream.
- [x] PRD and UX reviewed; no visitor-facing requirement change.
- [x] Architecture, epics, implementation, testing, qualification, activation, cost, and deadline impacts identified.
- [x] Direct specialist-pipeline adjustment selected; rollback, prompt-only retry, voting, threshold weakening, and MVP reduction rejected.
- [x] Owner approved precision bias, three calls, independent specialist selection, pre-call fallback only, closed internal result contract, zero-mismatch qualification, twelve-call ledger, ownership map, and composite authority.
- [x] Owner approved three separately consumed specialist structural cycles; batch review is allowed but allowance/evidence/failure accounting remains independent.
- [x] `sprint-status.yaml` remains orchestrator-owned and untouched.
