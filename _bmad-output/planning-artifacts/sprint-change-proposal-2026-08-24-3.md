# Sprint Change Proposal — Direct Quality Gate Simplification

## Issue Summary

Story 1.18.2 expanded a basic quality check into three specialist judge calls, twelve-call accounting, multiple qualification authorities, and extensive evidence machinery. During implementation this obscured the product behavior and repeatedly failed review. Justin clarified that recommendations need to be useful and reasonably conservative, not proven perfect.

## Impact Analysis

- **Epic 1:** remains viable; Story 1.18.2 is simplified in place.
- **Architecture:** the active Candidate path becomes deterministic checks plus one lightweight quality judge. Specialist-waterfall rules are superseded historical context.
- **Code:** discard the uncommitted specialist, qualification, deadline, and retained-evidence implementation. Restore the existing single-judge Gate and bounded orchestrator.
- **UX:** unchanged. Users still request and receive a Spark; rejection uses the existing house fallback.
- **Cost/latency:** a successful new AI Spark uses one generation call plus one judge call. Cached/saved Sparks and house fallbacks use no judge call.

## Approved Approach

Direct adjustment and rollback of the uncommitted overengineered attempt:

1. Generate one Candidate.
2. Run deterministic checks.
3. Invoke one candidate-bound quality judge at most once.
4. Accept on pass; otherwise use the house fallback.

No judge retry, specialist waterfall, specialist qualification system, or twelve-call/four-slot reservation design.

## Artifact Changes

- Rewrite Story 1.18.2 around the direct quality gate.
- Add an architecture simplification override that supersedes specialist rules.
- Preserve Story 1.18/1.18.1 evidence as historical, non-runtime material.
- Keep Story 1.19 scoped to later end-to-end evidence only if still needed after the simplified implementation.

## Implementation Handoff

Scope: moderate course correction handled by Developer.

Success means production uses the existing deterministic Gate plus exactly one quality-judge call for a surviving newly generated Candidate; deterministic failures use zero judge calls; rejected attempts use the reviewed house fallback; cached/saved Sparks and house fallbacks are not judged; offline verification passes. No provider execution, deployment, or activation is included.

## Approval

Approved by Justin on 2026-08-24 in conversation: revise Story 1.18.2 and architecture, discard the uncommitted overengineered implementation, and implement the direct version.
