---
baseline_commit: 761c3dae989ca52a198f7b4f64a650f292fea3b9
created: 2026-08-16
---

# Story 1.2: Judge Fidelity Spike

Status: in-progress

> **ID note (2026-08-17):** this file keeps its original legacy ID as history. In the current `epics.md` this work is **Story 1.3 (Judge Recovery Contract and Offline Verifier)** and **Story 1.4 (Judge Structural Recovery Matrix)**; `sprint-status.yaml` tracks it under `1-3-judge-recovery-contract-and-offline-verifier`. Current Story 1.2 is *Toolchain and Isolated Runtime Baseline*. See the crosswalks in `epics.md` and `sprint-change-proposal-2026-08-17.md`.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to prove gpt-oss models emit reliable structured verdict JSON before building the gate stage on them,
so that the pipeline's core mechanism is de-risked at the cheapest possible point.

## Acceptance Criteria

1. **Given** a standalone, non-production harness calling the Workers AI binding with a complete synthetic Candidate Brief and the exact AD-2 verdict schema, **when** it runs, **then** it exercises the configured primary `@cf/openai/gpt-oss-120b` and fallback `@cf/openai/gpt-oss-20b` explicitly; it does not select through the usage-dependent `modelFor` switch.
2. **When** one recorded capability probe per model accepts the exact frozen `json_schema` request, and live provider use has explicit approval plus sufficient account headroom, **then** the fidelity matrix performs at least 20 counted trials **per model** (at least 40 total), sequentially at requested `temperature: 0`, with identical prompt/schema/fixture hashes and token cap for both models. Probe acceptance is not proof of schema enforcement. A thrown call, timeout, non-response, or invalid output remains in the denominator; retries never replace failed trials.
3. **Then** each model independently achieves at least 95% direct schema-valid verdicts after Workers AI envelope normalization but before content repair. The report also shows post-repair validity and aggregate rates separately; repaired outputs do not inflate the direct-fidelity claim.
4. **Then** every accepted verdict matches `{pass, gates[9], tone, claims}`: `pass` is boolean; `gates` contains each integer ID 1–9 exactly once with boolean `pass` and a non-empty string `reason`; `tone` and `claims` have the same `{pass, reason}` shape; a top-level `pass: true` is invalid if any reported gate, tone, or claims check fails.
5. **And** a deterministic JSON-repair path recovers 100% of the explicitly supported malformed-output fixtures, rejects 100% of the explicitly unsupported/ambiguous fixtures, revalidates after repair, removes only declared transport wrappers, never changes a parsed verdict field, never invents/coerces semantic content, and accepts a repaired `pass: true` only when every represented check passes.
6. **And** a dated machine-readable result plus a concise human-readable decision record are saved in the spike directory with the run-time baseline HEAD, a fingerprint of the harness/prompt/schema/fixtures actually executed, runtime/CLI versions, models, request parameters, trial counts, direct and repaired rates, failure taxonomy, latency/usage observations, and repair-fixture coverage for Story 1.8 to consume.
7. **And** the spike changes no production request path, storage, route, renderer, Durable Object, model-selection behavior, or root/production deployment configuration; a spike-local dev config is allowed. Live calls are opt-in and stay out of `npm test` and CI, while the existing `npm test` suite remains green.

## Tasks / Subtasks

- [x] Task 1: Pin the spike boundary and baseline (AC: 1, 7)
  - [x] Recheck the implementation checkout before editing: record `git rev-parse HEAD`, `git status --short --branch`, `node --version`, and `npx wrangler --version`. The context baseline is commit `761c3dae...`, with 31/31 `npm test` checks passing; if HEAD moved, use the live state and record the new SHA.
  - [x] Preserve the untracked `.agents/` directory and all unrelated central-control output. Do not alter the Story 1.1 file merely to reconcile its `review` text with sprint status `done`.
  - [x] Keep the spike observational: no deploy or persistent named Worker/storage/route creation, no production route, and no KV/METER/COORD access. An ephemeral authenticated remote-binding proxy and metered AI inference are expected; no production secrets or provider envelopes enter the repository.
- [x] Task 2: Define one strict, versioned structural contract (AC: 1, 4)
  - [x] Add a complete, clearly marked synthetic Candidate fixture using every required future AD-5 Brief field, plus synthetic Evidence Bundle and grounding-report prompt inputs. Validate those fixtures mechanically before any live call. They are structural placeholders, not Story 1.3 goldens and not evidence of semantic judge quality.
  - [x] Encode the AD-2 verdict once as the provider-facing JSON Schema used by `response_format`, alongside one explicit strict validator for this verdict contract (not a home-grown generic JSON Schema engine). Contract fixtures must prove the schema and validator agree on required/extra properties, types, gate cardinality/IDs, reasons, and the safety invariant.
  - [x] Add the safety invariant: `pass: true` requires all nine gates, `tone`, and `claims` to pass. Do not recompute a fail-safe `pass: false` into true.
  - [x] Version and hash the system prompt, Candidate fixture, and verdict schema so every result identifies exactly what was tested.
- [x] Task 3: Implement deterministic envelope normalization, repair, and offline self-tests (AC: 4, 5)
  - [x] Inspect only the observed/documented Workers AI result locations: a pre-parsed object or text from `response`, `result`, or `choices[0].message.content`. Accept exactly one non-empty location, or multiple byte-identical locations; conflicting values are `ambiguous_envelope`, never first-truthy precedence. Treat extraction as normalization, not proof of model fidelity.
  - [x] Enforce a 64 KiB maximum extracted-content size. Support only the repair whitelist in Dev Notes: UTF-8 BOM, one Markdown JSON fence, one double-encoded JSON string, or bounded leading/trailing prose around exactly one balanced JSON object. BOM/double-encoding are deliberately chosen safety fixtures, not claimed observed gpt-oss behavior.
  - [x] Add fixtures for every supported shape and for fail-closed cases: empty/truncated JSON, multiple/ambiguous objects, trailing-comma or guessed syntax repair, missing/extra fields, string-coerced booleans/integers, wrong/duplicate gate IDs, empty reasons, and `pass: true` with a reported failure.
  - [x] Make the self-test exit non-zero unless all recoverable and reject fixtures behave exactly as declared. Do not use `eval`, a permissive schema library, or a second model call as a repair mechanism.
- [x] Task 4: Build the opt-in live Workers AI harness (AC: 1–3, 7)
  - [x] Add a thin, dev-only Worker entrypoint/config under `spikes/judge-fidelity/` with a unique nonproduction name, only `[ai] binding = "AI", remote = true` and the two model vars. It must have no routes, assets, KV, Durable Objects, or deploy script.
  - [x] Bind only to loopback and start it with `wrangler dev --config spikes/judge-fidelity/wrangler.toml --ip 127.0.0.1`; forbid both `--remote` (moves the Worker runtime onto Cloudflare) and `--local` (disables the required remote AI binding).
  - [x] Make the adapter allowlist the configured two models and perform one `env.AI.run` call per request. Request `messages`, `max_tokens: 2048`, `temperature: 0`, and Cloudflare's generic `response_format: {type: "json_schema", json_schema: ...}` form. Record requested values, explicit provider rejections, and any effective values the provider actually returns; never infer that an unreported parameter was honored or that the provider enforced the schema.
  - [x] Add a Node runner that calls the local dev adapter sequentially, applies one explicit per-trial timeout, and counts every invocation exactly once. The timeout is a harness bound, not the later production `STRIKE_BUDGET_MS` decision.
  - [x] Add explicit package scripts for offline self-test, result verification, the dev adapter, and the live matrix. Preserve `dev`, `test`, and `deploy`; add no dependency and leave `package-lock.json` unchanged.
- [x] Task 5: Probe capability and authorize shared-account use (AC: 1–3, 7)
  - [x] Authenticate Wrangler without storing credentials in the repository, and confirm the active profile is the intended target before checking its account/plan or making any remote inference.
  - [x] Before any remote inference, verify the target Cloudflare account/plan and remaining daily neuron headroom without persisting account identifiers. Estimate and disclose the maximum approved run spend from current pricing/usage guidance; prefer isolated nonproduction credentials when available.
  - [x] Obtain explicit approval for the target account/profile and exact call cap: two capability probes plus the stated trial count for each model. Without approval or sufficient headroom, record `BLOCKED`, leave the story in progress, and make **no** remote calls. The spike bypasses the application's METER, so production `modelFor` cannot see this spend.
  - [x] Freeze and fingerprint all executable inputs, then run exactly one recorded capability probe per configured model using that contract. The probes are not part of the ≥20/model denominator.
  - [x] If either model rejects the `json_schema` request or returns no judge content, write `NO-GO` evidence and stop before the matrix. Request acceptance only permits the empirical test; it does not prove schema compliance.
- [ ] Task 6: Run and record the fidelity matrix honestly (AC: 2, 3, 5, 6)
  - [x] Reconfirm the approved Wrangler profile immediately before the matrix. Confirm that the dev adapter is loopback-local and only its AI binding is remote; calls are metered and may consume the shared free allocation or incur paid usage.
  - [x] Run at least 20 live calls for each configured model against the same fixture/prompt/schema. Do not cherry-pick, discard, or replace failed trials; a later rerun is a separate dated run.
  - [x] Assign exactly one terminal class to each counted trial using the ordered taxonomy in Dev Notes; terminal totals must equal the denominator. Retain the extracted answer content/canonical parsed value plus its hash so classifications can be recomputed, while excluding credentials, headers, account IDs, and provider reasoning/envelope metadata.
  - [x] Emit `GO` only if both probes accepted the frozen request, the approved matrix used identical frozen inputs, both models independently meet direct-valid ≥95%, every fixture/result-integrity check passes, and the complete report verifies. Otherwise emit `NO-GO`, preserve the evidence, keep Story 1.2 out of `review`/`done`, and block Story 1.8 pending architecture/correct-course; do not lower the threshold, swap models, or broaden repair locally.
- [x] Task 7: Verify the repository remains safe and hand off to Story 1.8 (AC: 5–7)
  - [x] Run the offline spike self-test, offline result verifier, `npm test`, assert that the package `test` script still maps to `node test.mjs`, and run `git diff --check`.
  - [x] Confirm `src/worker.js`, root `worker.js`, `test.mjs`, root `wrangler.toml`, `package-lock.json`, and `.github/workflows/test.yml` are unchanged. If the spike appears to require one of those edits, stop and amend the story through the appropriate architecture/correct-course authority before editing.
  - [x] In the decision record, state exactly which normalization/repair behavior Story 1.8 may adopt, which failure forms must remain hard failures, and that semantic calibration still depends on Stories 1.3 and 1.8.

## Dev Notes

### Purpose and scope

This is a risk-retirement spike, not the production judge. It answers one question: can both configured Workers AI gpt-oss models reliably return the exact AD-2 verdict structure at near-zero temperature, with a small deterministic safety net for known transport formatting failures?

The spike does **not** prove that the model shares Justin's taste or correctly applies the nine gates. Voice calibration, real goldens/anti-goldens, weak-capability judgment, gate-9 calibration, candidate binding, grounding behavior, and the production judge belong to Stories 1.3, 1.8, and 1.13. A structurally valid but semantically bad verdict is outside this story's success claim.

### Operational decisions that remove ambiguity

- **Trial count:** interpret “N≥20 across primary and fallback” as at least 20 per model. A pooled total could hide a broken fallback.
- **Fidelity metric:** the ≥95% gate applies per model to direct JSON/schema validity after envelope normalization and before content repair. Report post-repair validity separately; repair is a rare safety net, not a way to relabel poor model fidelity.
- **Malformed fixtures:** offline repair fixtures are a separate cohort. They neither inflate nor dilute live-model rates.
- **Configured models:** test the exact root `wrangler.toml` values. Do not let `modelFor` choose only one model based on the 2,500-neuron threshold.
- **Capability preflight:** Cloudflare documents the generic `json_schema` request shape, but its current JSON Mode supported-model list does not list either configured gpt-oss model and warns that schema compliance is not guaranteed. Recheck the live list on the implementation date, then probe once per model before starting the matrix. Acceptance proves only that the endpoint returned content; the measured direct-valid rate—not provider enforcement—is the evidence.
- **Temperature:** request exactly `0`. Record explicit rejection and any effective value returned by the provider; if no effective value is exposed, report only the request and observed output—never claim the setting was honored. Any diagnostic at another near-zero value is a separately fingerprinted run and cannot replace the required matrix.
- **Shared account budget:** live calls bypass the application's METER but consume account-level Workers AI usage. Approval and headroom are hard preconditions, not report footnotes.
- **Spike outcome:** an honest `NO-GO` report is valid research evidence but does not satisfy the reliability gate, move this story to `review`/`done`, or authorize Story 1.8. Keep it in progress and escalate for architecture/correct-course instead of claiming completion.

### Canonical verdict contract

```js
{
  pass: boolean,
  gates: [
    { gate: 1..9, pass: boolean, reason: nonEmptyString }
  ], // exactly nine entries; IDs 1–9 exactly once
  tone: { pass: boolean, reason: nonEmptyString },
  claims: { pass: boolean, reason: nonEmptyString }
}
```

Use a strict object schema (`additionalProperties: false` at each verdict object level) plus custom checks for unique gate IDs and the one-way safety invariant. Gate order may be normalized for reporting, but the input must already contain every ID exactly once.

AD-2 says the judge evaluates the schema-stage grounding report, but its normative output object contains no separate `grounding` property. Do not silently add a tenth gate or a new top-level field in this spike. Include a synthetic grounding report in the prompt context; keep the exact AD-2 output shape. If Story 1.8 needs a separately reported grounding result, that is a schema/architecture decision. A `pass: false` may remain false for an unrepresented safety concern; a `pass: true` may never coexist with any reported failure.

The nine gates are: recognizable routine, constructive intervention, capability inventory, channel fit, proportionality, delivery fit, preservation, natural retelling, and novel-but-imaginable. The full semantic definitions remain prompt context, not locally reimplemented heuristics.

### Repair contract

| Class | Expected handling | Fidelity accounting |
| --- | --- | --- |
| Pre-parsed verdict object or pure JSON text | Strict parse/validate | `direct_valid` |
| Exactly one known non-empty Workers AI envelope value, or byte-identical duplicates | Extract once, then classify content | normalization only |
| Conflicting non-empty `response`/`result`/choice values | Reject as `ambiguous_envelope` | failure |
| UTF-8 BOM before one JSON value | Strip BOM, parse, revalidate | `repaired_valid` |
| One fenced `json` block and no competing object | Remove one fence, parse, revalidate | `repaired_valid` |
| One double-encoded JSON string | Decode once, parse, revalidate | `repaired_valid` |
| Bounded prose around exactly one balanced JSON object, total extracted content ≤64 KiB | Extract with a string-aware balanced-brace scan, parse, revalidate | `repaired_valid` |
| Empty/truncated text, multiple objects, ambiguous braces, guessed syntax, schema drift, coercion, or semantic omission | Reject | failure |

Never repair by adding/removing/changing a parsed verdict field, changing booleans, manufacturing reasons, dropping extra gates, selecting one of multiple objects, or calling another model. Every repaired result passes the same strict validator as a direct result.

### Live trial and evidence record

The live runner should be sequential by default so concurrency/rate-limit behavior does not contaminate the structural test. Define a versioned result schema. Each trial record needs:

- run ID/date, run-time baseline HEAD and dirty-state marker, a deterministic fingerprint of every executed harness/prompt/schema/fixture source, and Node/Wrangler versions;
- model ID, fixture/prompt/schema hashes, requested temperature, any provider-reported effective value, token cap, and response-format mode;
- trial index, start/end/latency, response content location, exactly one terminal classification, repair kind, validation errors, available usage/neuron counts, the extracted answer/canonical value, and its hash;
- no credentials, authorization headers, account IDs, visitor/business data, or hidden reasoning payloads.

Use this ordered terminal taxonomy after a counted call: `provider_error` (including HTTP/non-2xx/adapter rejection), `timeout`, `empty_response`, `ambiguous_envelope`, `output_too_large`, `unrecoverable_json`, `schema_invalid`, `repaired_valid`, `direct_valid`. Each trial receives the first applicable class and exactly one class; totals must equal N. Capability-probe rejection and approval/headroom `BLOCKED` are run-level outcomes, not matrix trials.

The dated JSON is the auditable source; the Markdown summary derives counts from it and states per-model direct/repaired rates, aggregate rates, failure modes, repair coverage, and the `GO`/`NO-GO` decision. An offline `verify-result` command must recompute executable-input hashes, per-trial classifications from retained extracted content, totals/rates, outcome predicates, and the Markdown rendering. Do not hand-edit summary arithmetic or overwrite an earlier run ID.

### Current implementation state and preservation boundary

`src/worker.js` has no judge today. Existing model paths use `modelFor`, `env.AI.run`, `max_tokens: 2048`, neuron recording, and a permissive parser that checks `response`, `result`, or `choices[0].message.content`, strips a fence, slices first-to-last braces, and calls `JSON.parse`. That parser has no verdict schema and can accept or mis-extract arbitrary shapes. It is useful reconnaissance, not the repair contract. Do not modify or route production behavior through spike code. [Source: src/worker.js:616-618, 766-850]

`test.mjs` is the 31-test, dependency-free Node safety net from Story 1.1. CI executes it directly on Node 22 without installing packages. Keep credentialed/metered trials separate; use the spike's offline self-test for its pure parser fixtures. [Source: test.mjs:1-24, 112-233, 1135-1137; .github/workflows/test.yml:8-17]

`package.json` is the only expected existing file to update. **Current:** ESM, Node ≥20, scripts `dev`, `test`, `deploy`, and Wrangler as the sole dev dependency. **Change:** add explicit opt-in spike scripts only. **Preserve:** existing scripts, engines, dependency versions, and lockfile. [Source: package.json:1-17]

Root `worker.js` is stale legacy code; root `wrangler.toml` points to `src/worker.js`. Do not edit or import the root worker. Root `wrangler.toml`, production bindings, routes, compatibility date, and model vars remain unchanged. [Source: wrangler.toml:1-17; _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md#AD-6]

### File structure requirements

Expected implementation surface:

```text
package.json                                      UPDATE — opt-in spike scripts only
spikes/judge-fidelity/
  README.md                                       NEW — protocol, commands, interpretation
  wrangler.toml                                   NEW — dev-only AI binding; no routes/storage
  worker.mjs                                      NEW — one-call local adapter
  contract.mjs                                    NEW — pure schema/normalize/repair/validate exports
  run.mjs                                         NEW — side-effect-free-on-import live/result CLI
  fixtures.json                                   NEW — synthetic Candidate + repair/reject cases
  results/
    <YYYY-MM-DD>-<run-id>.json                     NEW — machine-readable trial evidence
    <YYYY-MM-DD>-<run-id>.md                       NEW — derived decision summary
```

Keep normalization, repair, validation, classification, and result verification centralized through `contract.mjs`; the Worker adapter and CLI must not implement divergent parsers. Story 1.8 consumes this repair contract and fixture corpus, then places production judge code in the single-file `src/worker.js` structure required by the architecture.

### Architecture compliance

- AD-1/AD-2: the eventual judge is a distinct stage; this spike tests its output contract without wiring a path from Generate to Render.
- AD-3/AD-9: do not add model-based repair. It would spend an extra call and undermine the later six-call ceiling. The spike's direct calls are bounded, manual development evidence rather than visitor strikes.
- AD-5: use the future typed Brief shape only as a fixture. Do not implement the production Brief validator or renderers before Story 1.5.
- AD-6: preserve router, KV keys, Durable Objects, feeds, scan budgets, page shell, and generation call sites.
- Verification convention: keep all spike parsing/validation pure and Node-testable; keep live Workers AI calls opt-in.
- AD-10/FR-10: no UI fields, modes, routes, or client state are added.

### Current library and platform information

- The repository is ESM on Node ≥20; CI uses Node 22. Use built-in `fetch`, `AbortController`, `crypto`, and assertions rather than adding a dependency.
- Current Cloudflare Workers AI docs show the generic Workers AI Run request accepting `messages`, `temperature`, `max_tokens`, and `response_format` with `type: "json_schema"`. The current JSON Mode supported-model list excludes these gpt-oss IDs and warns schema compliance is not guaranteed; the model pages establish Workers AI Run support, not JSON-Schema enforcement.
- AI bindings run against Cloudflare's network in local development when `[ai] remote = true`; those calls are metered against the account. Use a loopback-bound, spike-only Wrangler config with neither `--remote` nor `--local`, and never run `wrangler deploy` for the spike.
- The checkout has Wrangler 4.114.0 locked; the registry reported 4.123.0 on 2026-08-16. Do not upgrade Wrangler or the Worker compatibility date in this story—cleanup owns those changes. Record the actual version used.

### Previous story intelligence

- Story 1.1 committed the shell safety net at `761c3dae...`, extended the harness to 31 passing tests, moved the public meter readout to same-origin `/meter`, and tightened API CORS to exact `https://oddspark.dev`.
- Its final audit found a missing `Vary: Origin` cache invariant after the suite first went green. Apply that lesson here: passing trial arithmetic is not enough; separately verify schema completeness, fail-closed behavior, and result provenance.
- Story 1.1 kept package dependencies unchanged and established plain Node/custom assertions as the repository's test convention.
- The prior story file still says `review` while sprint status says `done`; live commit/test evidence supports proceeding, but this story must not rewrite unrelated bookkeeping.

### Git intelligence summary

- `761c3dae` — hardened Story 1.1 shell safety and expanded tests; no dependency change.
- `3fc6a9b3` — connected the project to central BMAD control through relative `_bmad` and `_bmad-output` symlinks.
- `6beb74c0` — documented personalization/storage and extended permalink provenance checks.
- `9407b906` — added domain-aware scanning, model response normalization, coordinator convergence, and the original test harness.
- `6015659f` — enabled Wrangler preview URLs only.

The implementation checkout was synced to its upstream at the context baseline and had only untracked `.agents/`. The central BMAD checkout contains unrelated dirty/untracked work; touch only the Oddspark Story 1.2 artifact and its sprint-status entry during story creation, and only the story-authorized code files during implementation.

### Testing requirements

Required verification evidence before implementation can claim the story complete:

1. Offline repair/reject fixture self-test: all expected recoveries and hard failures pass; no Workers AI call.
2. Capability/authority gates: both frozen probes accepted; account/plan/headroom checked; exact matrix call count explicitly approved.
3. Live fidelity run: ≥20 counted trials/model; both direct-valid rates ≥95%; all calls/failures retained; terminal totals equal N.
4. Result consistency: offline verifier recomputes source hashes, classifications, totals/rates, outcome predicate, and Markdown from the dated JSON.
5. Existing regression suite: `npm test` passes and still maps to `node test.mjs`.
6. Repository hygiene: `git diff --check`; no secret/config leakage; no production file or lockfile drift outside the declared surface.

### Out of scope

- Production judge wiring or prompt calibration.
- Real voice rubric, golden Briefs, anti-goldens, or semantic contradiction tests.
- Production Brief schema/grounding implementation.
- Retry orchestration, house Briefs, counters, cache-first commit, renderer/UI changes, domain scanning, or `/api/cheer`.
- Model replacement, threshold revision, Wrangler/compatibility-date upgrade, deployment, or persistent named Worker/storage/route creation.
- README's pre-existing stale `/api/meter` text and broader `/how` rewrite.

### References

- [Source: _bmad-output/planning-artifacts/epics.md:75-81, 97-127, 201-214] — Epic 1 sequencing, Story 1.2 contract, and Story 1.8 handoff.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md:20-57, 65-83, 103-134, 166-175] — pipeline separation, verdict/Brief schemas, verification, stack, deferred fidelity risk, and cleanup boundaries.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/solution-design.md:32-44, 62-65] — separate judge rationale and first-story warning.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-oddspark-2026-08-15/reviews/review-tech-currency.md:22-63] — configured model verification and the unproven temperature/JSON-fidelity caveat.
- [Source: _bmad-output/planning-artifacts/prds/prd-oddspark-2026-08-15/prd.md:85-105, 113-141, 241-249] — gate behavior, tone/claims requirements, and resolved separate-judge decision.
- [Source: _bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/coherence-gates.md:1-23] — exact nine gates and contradiction set.
- [Source: _bmad-output/specs/spec-oddspark-fun-coherent-idea-generation/result-card-contract.md:1-16] — complete synthetic Candidate fixture content contract.
- [Source: _bmad-output/implementation-artifacts/1-1-shell-safety-net-audit-and-extend-test-mjs.md:49-95, 121-146] — preservation boundary, test conventions, and prior audit learnings.
- [Source: src/worker.js:616-618, 766-850] — existing model selection, calls, usage recording, and permissive JSON extraction.
- [Source: test.mjs:1-24, 112-233, 1135-1137; package.json:1-17; wrangler.toml:1-17; .github/workflows/test.yml:8-17] — live code, scripts, binding, and CI baselines.
- [Cloudflare Workers AI model: gpt-oss-120b](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/)
- [Cloudflare Workers AI model: gpt-oss-20b](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/)
- [Cloudflare Workers local development](https://developers.cloudflare.com/workers/local-development/)
- [Cloudflare Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Workers AI documentation corpus](https://developers.cloudflare.com/workers-ai/llms-full.txt)

## Story Context Completion

- Status: `ready-for-dev`
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Implementation Plan

- Preserve the production shell and dependency graph; build the spike as pure contract logic, a thin local Worker adapter, and an opt-in Node CLI.
- Drive the strict verdict/repair/result contracts with offline failing fixtures before adding the implementation.
- Authenticate and confirm account headroom before the approved 42-call live run; preserve every counted result and derive the decision report mechanically.
- Re-run offline, regression, provenance, and preservation checks before changing status.

### Debug Log References

- 2026-08-16 baseline: HEAD `761c3dae989ca52a198f7b4f64a650f292fea3b9`, upstream divergence `0/0`, Node `v26.7.0`, Wrangler `4.114.0`; worktree contained only the pre-existing untracked `.agents/` directory.
- 2026-08-16 baseline regression: `npm test` passed 31/31 before spike implementation.
- 2026-08-16 Task 2 RED: the new spike test failed with `ERR_MODULE_NOT_FOUND` before `contract.mjs` existed.
- 2026-08-16 Task 2 GREEN: 6/6 contract/input/fingerprint checks and 31/31 regressions passed.
- 2026-08-16 Task 3 RED: normalization tests failed because `classifyJudgeCall` and `extractJudgeContent` were not yet exported.
- 2026-08-16 Task 3 GREEN: 9/9 spike checks and 31/31 regressions passed across direct, repaired, ambiguous, oversized, malformed, and schema-invalid fixtures.
- 2026-08-16 Task 4 RED: harness tests first failed on missing `worker.mjs`, then result tests failed on missing versioned result exports.
- 2026-08-16 Task 4 GREEN: 18/18 offline spike checks, syntax checks, and 31/31 regressions passed; `package-lock.json` retained baseline SHA-256 `d2f43c5b...`.
- 2026-08-16 Task 5: confirmed the active Wrangler identity against the single Hearn Systems account, Workers Paid plan, and dashboard daily usage of 278.72 neurons (9,721.28 free neurons remaining); no account ID was persisted.
- 2026-08-16 Task 5 authorization: Justin approved the exact 42-call cap. Conservative maximum was 10,547 neurons / $0.116 gross; both frozen probes returned judge content and were retained as `schema_invalid`, so the matrix was permitted without treating acceptance as schema enforcement.
- 2026-08-16 Task 6 live matrix: exactly 20 counted trials per model ran sequentially with no retries. Both models produced 0/20 direct-valid and 0/20 post-repair-valid verdicts; all 40 counted outputs were `schema_invalid`, so the retained outcome is `NO-GO`. Observed usage including probes totaled 2,923.7275 neurons across exactly 42 calls.
- 2026-08-16 Task 7 verification: the spike self-test passed 18/18 test functions, the original result/Markdown verifier passed, `npm test` passed 31/31, `git diff --check` passed, and every protected production/config/lockfile hash remained unchanged.
- 2026-08-16 closure audit: the NO-GO arithmetic and classifications are conservative, but the verifier does not strictly validate nested evidence/authorization consistency or bind the retained run to the exact live adapter, and the original report records test-function counts rather than granular fixture coverage while omitting required latency/usage details. A separate immutable-run audit addendum records these limitations.

### Completion Notes List

- Task 1 complete: captured baseline and protected-file SHA-256 values, confirmed the branch is synchronized, preserved existing untracked/central-control work, and established the no-deploy/no-production-path boundary.
- Task 2 complete: added the strict AD-2 provider schema and specialized validator, a complete synthetic AD-5 domain Brief plus fixture-only Evidence/grounding inputs, one-way aggregate safety checks, and deterministic SHA-256 fingerprints.
- Task 3 complete: added type-sensitive envelope normalization, a 64 KiB UTF-8 bound, exactly-one deterministic repair, strict revalidation, immutable fixture classification, and fail-closed precedence coverage.
- Task 4 complete: added a loopback-only local adapter with one AI call per accepted POST, frozen model/request enforcement, sequential no-retry runner, 120-second timeout, 42-call cap, versioned evidence/verifier scaffolding, and opt-in scripts without dependency drift.
- Task 5 complete: authenticated transiently, confirmed the paid account/headroom and exact authorization, froze all executable inputs, and recorded one accepted-content capability probe for each configured model without persisting account identity.
- Task 6 operational run complete but story gate incomplete: the approved matrix was retained without replacement or retry, yet both models missed AC3 at 0% direct validity. The valid research outcome is NO-GO, so Task 6 remains unchecked, Story 1.2 remains `in-progress`, and Story 1.8 is blocked.
- Task 7 complete: all repository-safety checks passed and the decision record preserves the allowed normalization/repair handoff and semantic-calibration boundary. The post-run audit identified evidence-integrity gaps that prevent treating the artifact as audit-grade provider proof or closing AC6.
- No source correction or provider rerun was attempted after the audit because the retained source fingerprint must remain honest. Correct-course/architecture authority and a new explicit live-call approval are required before another matrix.

### File List

- package.json (modified)
- spikes/judge-fidelity/README.md (new)
- spikes/judge-fidelity/contract.mjs (new)
- spikes/judge-fidelity/fixtures.json (new)
- spikes/judge-fidelity/run.mjs (new)
- spikes/judge-fidelity/test.mjs (new)
- spikes/judge-fidelity/worker.mjs (new)
- spikes/judge-fidelity/wrangler.toml (new)
- spikes/judge-fidelity/results/2026-08-16-d2b84005.json (new)
- spikes/judge-fidelity/results/2026-08-16-d2b84005.md (new)
- spikes/judge-fidelity/results/2026-08-16-d2b84005-audit.md (new)

## Change Log

- 2026-08-16: Comprehensive Story 1.2 implementation context created; no implementation, live model trial, deploy, commit, or push performed.
- 2026-08-16: Implemented the isolated judge-fidelity spike and retained a verified 42-call NO-GO run. Both models returned 0/20 valid verdicts; closure audit found evidence-integrity/reporting gaps. Story remains `in-progress`, Story 1.8 is blocked pending correct-course, and no deploy, commit, or push was performed.
