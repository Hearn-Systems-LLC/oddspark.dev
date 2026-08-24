---
title: 'Story 1.18.2: Direct Quality Gate Simplification'
type: 'corrective-feature'
created: '2026-08-24'
status: 'done'
baseline_revision: 'ab6f12c'
provider_execution_authorized: false
deployment_authorized: false
activation_authorized: false
operator_actions: []
---

<intent-contract>

## Intent

Generate one Candidate, run deterministic safety/schema/linkage/grounding checks, then run at most one lightweight quality judge. If both pass, the Candidate may be saved and shown as the Spark. Otherwise use the existing safe house fallback.

## Boundaries

**Always:** Judge only newly generated AI Candidates; serve cached/previously saved Sparks without re-judging; keep deterministic checks before the judge; count the invoked judge call; fail closed on malformed, unknown, provider-error, or timeout results.

**Never:** Run a coherence/fit/quality waterfall; require three judge calls; retry the judge; judge house fallbacks; fabricate semantic authority; call a provider, deploy, activate, push, merge, or mutate remote state under this offline story.

</intent-contract>

## Contract

| Stage | Behavior |
|---|---|
| Generation | One generated Candidate per attempt |
| Deterministic gate | Existing schema, linkage, privacy, grounding, reference, and prohibited-token checks; rejection uses zero judge calls |
| Quality judge | One candidate-bound verdict: `pass` or `reject`; unknown/malformed/error/timeout rejects |
| Success | Save and show the Candidate as the Spark |
| Failure | Use the existing reviewed house fallback; no judge retry |
| Cached Spark | Serve directly; no generation or judge call |

## Tasks and Acceptance

- [x] Remove the uncommitted three-specialist implementation and its qualification/deadline artifacts.
- [x] Update architecture and epic authority so the direct single-judge contract supersedes the specialist waterfall.
- [x] Keep the existing deterministic `runCompositeGate` checks and one candidate-bound judge call.
- [x] Ensure production assembly uses the direct gate and existing bounded orchestration without specialist ports.
- [x] Add focused tests proving deterministic rejection uses zero judge calls, success uses exactly one, malformed/error/timeout rejects after one, and cached/house results are not judged.
- [x] Run `npm run composite-gate:test`, `npm run strike-orchestrator:test`, `npm test`, `npm run check`, governed CI, assembly verification, and `git diff --check`.

## Verification

- `npm run composite-gate:test`
- `npm run strike-orchestrator:test`
- `npm test`
- `npm run check`
- `CI=1 node .github/check-ci.mjs`
- `git diff --check`

## Decision History

The previously approved three-specialist architecture and five attempted implementations were rejected as overengineered. Justin explicitly approved this simpler contract on 2026-08-24. Historical Story 1.18/1.18.1 evidence remains historical only; no new live qualification is authorized.

## Auto Run Result

Status: done

The uncommitted specialist-waterfall implementation and its qualification/deadline artifacts were removed. The restored production code already implements the approved direct contract: deterministic checks precede one candidate-bound judge call; deterministic failures use zero judge calls; malformed, rejected, failed, or timed-out judgments fail closed after one call; the orchestrator uses the existing reviewed house fallback on exhaustion; cached and already saved Sparks bypass generation and judgment.

Verification passed: Composite Gate 8/8, strike orchestrator 15/15, root 102/102, `npm run check`, governed CI, controlled Chrome 6 pass with 2 intentional live-only skips, runtime assembly identity `865e455d6b3a1f3830d232499c4688340a48118c087f037e957d9d2a3f0b5d93`, and `git diff --check`. No provider execution, deployment, activation, push, merge, or remote mutation occurred.
