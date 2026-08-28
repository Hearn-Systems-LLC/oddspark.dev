---
title: 'Story 1.25: Inactive Writer Deployment'
type: 'feature'
created: '2026-08-22'
status: 'done'
warnings: [oversized]
baseline_commit: '01a9e5253ef08a3cfe1cf1d587629085f90c4192'
baseline_revision: '01a9e52'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Production runs the 1.24 compatibility reader with the assembled pipeline present in the bundle but unwired: `createInactiveDomainWriter` sees no pipeline env, the redacted `activationPosture` has no consumer, and the writer port call has no deadline — so a future hung or misconfigured writer would be invisible and unbounded. The release sequence requires the compatible writer deployed with activation absent before 1.26 can activate by manifest flip alone.

**Approach:** Wire the production pipeline env in code (owner-approved content bundled and hash-verified, provider ports constructed from the `AI` binding through the closed adapters) while `ACTIVATION_MANIFEST` stays absent so the writer remains null and legacy strikes serve unchanged; bound `port.write(dispatch)` with a deadline that fails closed to the negotiated 502; emit redacted activation posture via structured Workers Logs; prove it with a `writer:preflight` release gate; deploy under separate explicit approval (NOT yet granted). Per Justin's 2026-08-22 ruling, the 1.16 writer-port deadline and the 1.23 activationPosture observability findings are folded into this story.

## Boundaries & Constraints

**Always:** Inactive posture is structural — with no `ACTIVATION_MANIFEST`, `createInactiveDomainWriter` returns null before any port validation, and production strike/read behavior is byte-identical to the 1.24 artifact (legacy writer serves, legacy/committed reads unchanged). Pipeline content (priors, house catalog, corpus) is bundled with the Worker and verified by the REAL closed verification functions at env construction; any verification failure must leave the writer null, never partially wired. Provider ports are constructed from `env.AI` through the closed generation/judge adapters only — no repair, coercion, or second writer. The port deadline is finite, below the platform wall-clock limit, fails closed to the existing negotiated 502 with no metric and no coordinator claim mutation beyond the writer's own semantics. Posture observability emits only the redacted `{ enabled, reason }` codes — never manifest internals, request data, or PII. Gitflow: merge to `develop` only.

**Ask First:** Any change to closed contract schemas, the committed presentation boundary, coordinator authority, metric names, the dispatch contract shape, or `wrangler.toml` bindings/vars (the intent is ZERO wrangler changes — content is bundled, not var-bound). Deployment requires separate explicit approval at deploy time.

**Never:** No `ACTIVATION_MANIFEST` or any activation authority in config or code; no qualification-ref fabrication (`PIPELINE_JUDGE` qualification refs stay absent until real qualification evidence exists); no provider calls in tests or CI; no scan/EvidenceProvider on the inactive-domain path; no legacy generator as fallback for the assembled writer; no remote-resource creation/deletion/reconfiguration; no merge to `main`; no stored data created by posture observability (logs only, no metrics/coordinator writes). Do not edit root `worker.js`, `wrangler.toml`, `wrangler.offline.toml`, or `sprint-status.yaml` (except the build-workflow status sync).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Strike, no manifest (production parity) | local or domain strike, `ACTIVATION_MANIFEST` absent | Legacy writer serves exactly as the 1.24 artifact; writer port null; posture logged `{enabled:false, reason:"MISSING"}` | N/A |
| Pipeline env construction, content valid | bundled priors/house/corpus, real verification | `PIPELINE_*` content + provider ports constructed; writer still null (manifest checked first) | N/A |
| Pipeline env construction, content drifted | hash/approval verification fails | Fail closed: no partial env, writer null, redacted failure logged | Never fabricate or repair content |
| Writer port hangs | injected writer whose `write()` never settles | Deadline expiry → negotiated 502, identical to writer-error path; no metric, no hang to wall-clock | Fail closed, bounded |
| Writer port settles before deadline | normal inactive-domain dispatch | Existing 1.16/1.23 outcome validation unchanged | N/A |
| Manifest appears malformed | invalid `ACTIVATION_MANIFEST` value | Writer null/fail-closed per 1.23 semantics; posture reason logged | Fail closed |
| Rollback | redeploy 1.24 artifact (version `d3fe3b3f`) | Prior artifact restored, no data change | N/A |

</frozen-after-approval>

## Code Map

- `src/pipeline/assembly.mjs:82-107` — `createInactiveDomainWriter(env, deps)`: manifest evaluated first (`:83-92`), null on absent/invalid; required env ports at `:93-107`; `WRITER_ERROR` `:39`; budget constants `:40-45`; `activationPosture` at `:339-342`.
- `src/pipeline/activation.mjs:10-19,83` — frozen `ACTIVATION_REASON_CODES`; `evaluateProductionActivation` accepts object or JSON string. Read-only here.
- `src/worker.js:1597-1621` — `runInactiveDomainWriter(port, dispatch)`: `port.write` awaited at `:1600` with NO deadline; fold the deadline in here. Outcome validation and negotiated-502 mapping already exist — timeout must reuse them.
- `src/worker.js:2784-2787` — route seam: `env.INACTIVE_DOMAIN_WRITER` wins, else `createInactiveDomainWriter(env, { coordPost })`. Wire the constructed pipeline env here (e.g. spread a `productionPipelineEnv(env)` result into the env passed to assembly — never mutate `env` itself).
- `src/worker.js:1519-1524` (`recordServed` via `coordPost("/metric")`) — existing observability pattern; posture logging is `console.log` of redacted JSON (Workers Logs enabled, `wrangler.toml:56`), NOT a coordinator metric.
- `test.mjs:139-279` — `createEnvironment(options)`: `options.pipeline` injection at `:265-276`, real-content fixture `pipelineFixture()` at `:290-379` (real `verifyLocalPriors`/house approval/`validateCorpus`). Extend for: deadline fakes (never-settling port), posture log capture, production-env wiring against fake `AI`.
- `test.mjs:1943-2492` — existing `INACTIVE_DOMAIN_WRITER` fake-injection seam tests; deadline tests belong beside them.
- `scripts/reader-preflight.mjs:62-158,213-228` — reusable helpers (`stripTomlComments`, `tomlSections`, `findForbiddenVars/Bindings/EnvSections`, `importClosure`, `sha256File`) and the forbidden-config assertion. `writer:preflight` reuses these; since content is bundled (zero new wrangler vars), the reader config assertion should still pass post-1.25 — verify, don't weaken.
- `scripts/assembly-identity.mjs` + `runtime-assembly.json` — worker.js and any new `src/pipeline/` module change ⇒ `npm run assembly:freeze` refreeze; preflight binds entrypoint hash.
- `content/local-priors/v1/`, `content/house-briefs/v1/`, `semantic/voice/v1/` — owner-governed content to bundle; hashes pinned per existing content-identity functions (see `test.mjs:295-299` for the priors identity pattern).
- Protected read-only: `worker.js` (root), `wrangler.toml`, `wrangler.offline.toml`, `sprint-status.yaml`.

## Tasks & Acceptance

**Execution:**
- [x] `src/pipeline/production-ports.mjs` — new runtime-neutral module (join assembly identity, neutrality-clean name): `productionPipelineEnv(env)` returning `{ PIPELINE_PRIORS, PIPELINE_HOUSE, PIPELINE_CORPUS, PIPELINE_GENERATE_PROVIDER, PIPELINE_JUDGE_PROVIDER }` from bundled content (imported, hash/approval-verified with the real closed verifiers at construction; any failure → return null, never partial) and provider functions wrapping `env.AI.run` through the closed generation/judge adapters against `env.AI_MODEL`. `AI_MODEL_FALLBACK` is validated present as a misconfig guard only — fallback wiring is a qualification product (Story 1.11) and stays unwired here; do not require more than presence. `PIPELINE_JUDGE` qualification config stays absent — no fabricated refs. The module must expose an offline content seam (an injectable content parameter) so tests and preflight can construct from a fully-approved content set; production always uses the bundled default.
- [x] `src/worker.js` — at the `:2784-2787` seam, pass `{ ...env, ...(productionPipelineEnv(env) ?? {}) }` (never mutate `env`) to `createInactiveDomainWriter`; log `activationPosture(env)` as redacted structured JSON once per writer-seam resolution (wrapped so a posture/logging throw can never fail the request); wrap `port.write(dispatch)` in `runInactiveDomainWriter` with a finite deadline whose expiry produces exactly the writer-error negotiated 502 (no metric, no double-count, in-flight write abandoned not cancelled into coordinator). The deadline timer must be cleared when the write settles first, the deadline value must be validated finite/positive with a safe fallback to the constant, and the constant must be exported so tests pin its value and ordering (above the writer's internal strike+claim budgets, below the platform wall-clock). On writer failure (timeout or port error), log a redacted failure-class line (error class only, no internals) so a deadline expiry is diagnosable.
- [x] `test.mjs` — fixtures for every I/O matrix row: content-valid construction (via the offline content seam) with writer still null and production strike parity (legacy serve byte-identical to no-pipeline env), current bundled content's pending-approval state reported/fail-closed as a deliberate tripwire, drifted-content fail-closed (corrupt one approval hash), never-settling port deadline → 502 with zero metric posts, settling port unaffected, malformed-manifest posture reason, and posture log lines captured and asserted redacted (no manifest internals). Deadline tests must inject the deadline through the exported seam (never monkeypatch a global timer with a magic-number predicate); pin the exported constant's value and ordering; failure-path tests assert the redacted posture and failure-class log lines on the 502 terminal.
- [x] `scripts/writer-preflight.mjs` + `package.json` — `writer:preflight` release gate composing: runtime-baseline verify, config dry runs, `assembly:verify`, entrypoint-bound import-closure identity (now including `production-ports.mjs` and the bundled content files), bundled-content verification, inactive-posture assertion (`ACTIVATION_MANIFEST` absent, no `[env.*]`, legacy `AI`/KV/DO bindings intact), dry-run cleanliness, and an offline assembly smoke. One pass/fail line per check; non-zero exit on any failure. Do not compose into `check`. The bundled-content check must (a) pin expected content hashes as constants and FAIL on any byte drift, and (b) re-verify approvals with the real closed verifiers, reporting each content family's readiness as its own explicit line — a family still `pending_owner_approval` is REPORTED as such (it gates nothing while the manifest is absent) but never silently treated as wireable. The offline smoke must NOT be vacuous: construct the pipeline env through the module's offline content seam with a fully-approved content set, assert ports are constructed, then assert absent AND malformed manifests each yield writer null — proving wireability and the inactive gate, not just the trivially-null path. Every check must be crash-safe: malformed JSON, missing hash fields, or unexpected verifier shapes produce a FAIL line, never a stack trace; TOML config matching must not depend on key order. Reused reader-preflight helpers must not execute the reader gate on import (entrypoint guard).
- [x] Assembly identity refreeze (`npm run assembly:freeze`) and `docs/runtime-baseline.md` — document `writer:preflight` as the current release gate (reader-preflight remains the 1.24 lineage gate) and the bundled-content convention, describing checks accurately (content bytes are pinned by the preflight's hash constants plus approval re-verification, not by the frozen assembly identity).
- [ ] Deploy ONLY under separate explicit approval: run `writer:preflight`, `npx wrangler deploy` from `develop`, verify production legacy strike + permalink 200 parity and posture log visibility, record version ID in Auto Run Result. Rollback: redeploy 1.24 artifact (`d3fe3b3f` lineage), no data change.

**Acceptance Criteria:**
- Given the candidate bundle, when `writer:preflight` runs, then assembly identity, entrypoint closure, bundled-content verification, inactive-posture config assertions, offline writer-null smoke, and dry-run cleanliness all pass and create no remote resource.
- Given deployment with `ACTIVATION_MANIFEST` absent, when production traffic arrives, then strikes and reads behave identically to the 1.24 artifact, the assembled writer is null, no model role runs, and redacted posture is visible in Workers Logs.
- Given an injected hung writer port, when the deadline expires, then the request fails closed to the negotiated 502 with no served metric and no coordinator claim mutation.
- Given drifted bundled content, when pipeline env construction runs, then it fails closed with no partial wiring and the writer stays unavailable.
- Given rollback, when the 1.24 artifact is redeployed, then the prior posture is restored without data change.

## Spec Change Log

### 2026-08-22 — Non-vacuous preflight smoke, content-hash pinning, and fallback clarification
- Trigger: Review found the offline assembly smoke was vacuous with the current bundled content (priors approval is `pending_owner_approval`, so env construction fails closed and the smoke proved nothing), preflight passed green while zero ports would wire in production without saying so, bundled content bytes were not pinned against drift, and `AI_MODEL_FALLBACK` was gate-enforced but never wired.
- Amended: Preflight task now requires pinned content-hash constants (FAIL on drift), per-family readiness reporting (pending approvals reported, never treated as wireable), and a smoke that constructs through the module's offline content seam with a fully-approved content set to prove wireability before asserting writer-null on absent/malformed manifests. Preflight checks must be crash-safe (FAIL line, never a stack trace) and key-order-insensitive; reused reader-preflight helpers need an entrypoint guard. The production-ports task gains the offline content seam explicitly and narrows `AI_MODEL_FALLBACK` to a presence guard (fallback wiring is a 1.11 qualification product). The worker task now requires deadline timer cleanup, finite/positive deadline validation, an exported pinned deadline constant, a try/catch around posture logging, and a redacted failure-class log on writer error; the test task bans global-timer monkeypatching and requires failure-path log assertions. Docs must describe the content pinning accurately.
- Known-bad state avoided: a green release gate that ships a bundle wiring zero pipeline ports without saying so, cannot detect content drift, crashes instead of failing on malformed input, and cannot prove the constructed-ports-plus-absent-manifest path it exists to prove.
- KEEP: The separate runtime-neutral `production-ports.mjs` module with fail-closed null (never partial) construction through the real closed verifiers; provider ports wrapping `env.AI.run` through the closed adapters with no repair/coercion; `PIPELINE_JUDGE` absence (no fabricated refs); the deadline race shape in `runInactiveDomainWriter` with injectable deadline and negotiated-502 reuse; redacted structured posture logging (never a coordinator metric); the `writer:preflight` composition and one-line-per-check contract; the bundled-content (zero wrangler changes) convention; the tripwire test on the pending priors approval.

## Design Notes

- Content is bundled (imported modules), not var-bound: wrangler.toml stays untouched, the 1.24 reader config assertion remains valid, and content hashes are provable at build/verify time. The only config delta 1.26 needs is the `ACTIVATION_MANIFEST` value itself.
- Provider ports are wired now so 1.26 is a manifest-only flip, but their qualified identity (per the approved Workers AI model pair, Story 1.11's fresh governed plan) is a qualification product: 1.25 wires the port shape through the closed adapters; qualification may adjust model identity before activation, and the 1.26 manifest pins only qualified refs.
- `PIPELINE_JUDGE` carries qualification refs that do not exist yet; it stays absent rather than fabricated. With the manifest absent this changes nothing (manifest check precedes port validation).
- The epics.md dependency on Story 1.20's release-decision view is read as "applicable gates" (per the 1.24 incident-recovery precedent): assembly identity, config posture, and safe-posture proofs apply; qualification-gated views apply only when their refs exist.

## Review Triage Log

### 2026-08-22 — Review pass (round 1)
- intent_gap: 0
- bad_spec: 1: (high 1, medium 0, low 0)
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - `[high]` `[bad_spec]` Vacuous offline smoke (bundled priors still `pending_owner_approval`, so env construction fails closed and the smoke proved nothing), preflight green while zero ports wire, unpinned content hashes, and gate-enforced-but-unwired `AI_MODEL_FALLBACK`; triggered loopback 1 with non-vacuous smoke, hash pinning, readiness reporting, and fallback clarification (see Spec Change Log).

### 2026-08-22 — Review pass (round 2)
- intent_gap: 0
- bad_spec: 0
- patch: 15: (high 2, medium 8, low 5)
- defer: 4: (high 0, medium 4, low 0)
- reject: 0
- addressed_findings:
  - `[high]` `[patch]` Throwing `ACTIVATION_MANIFEST` getter could 500 the request past the posture guard — seam now fails closed to null writer with a two-phase test.
  - `[high]` `[patch]` Vacuous redaction assertion in the malformed-manifest test — secret ref now planted.
  - `[medium]` `[patch]` Frozen provider prompt/parameter/response-format payloads now asserted against exported constants; judge params got a named frozen constant; misleading judge-validation comment corrected; judge null-request guard added; deadline constant pinned and comment de-claimed; sentinel rejection replaces double Error; log-spread shadowing fixed; smoke approval timestamp derived from current time; preflight spawnSync crash-safety; check-4 limitation documented; pending-approval asymmetry policy commented.
  - `[medium]` `[defer]` Deadline bounds the response, not the write (late-commit cancellation semantics) — logged for pre-1.26.
  - `[medium]` `[defer]` Provider `env.AI.run` calls carry no inner bound — logged for 1.26-era.
  - `[medium]` `[defer]` Per-request full content verification, no memoization, mid-deployment flip risk — logged alongside the existing 1.23 memoization entry.
  - `[medium]` `[defer]` Real Workers AI envelope shape unproven (mocks only) — belongs to qualification stories 1.11/1.19.
  - `[low]` `[patch]` Content-hash pin mirrored into `test.mjs` so `npm test` catches drift; `captureLogLines` hardened (raw-count assertions, null filtering, finally-restore).

### 2026-08-22 — Independent close-out review
- Result: PASS. Merge `f7a97ee` / feat `e840161`. Inactive writer wiring, 60s port deadline, redacted posture logs, and `writer:preflight` hold at HEAD. Production deploy remains gated on separate explicit approval (unchecked by design). Four deferred items remain accurate.

## Verification

**Commands:**
- `npm test` — expected: all offline fixtures pass, incl. deadline, posture, and wiring fixtures.
- `npm run check` — expected: full offline gate green with refrozen identity.
- `npm run writer:preflight` — expected: all checks pass, zero remote mutation.
- `npm run reader:preflight` — expected: still green against the bundled-content config (no new wrangler vars).
- `git diff --check` — expected: clean; no protected-file modifications.

## Suggested Review Order

**Production pipeline wiring (the deployable artifact)**

- The whole design in one function: bundled content verified fail-closed, provider ports constructed, null-never-partial.
  [`production-ports.mjs:212`](../../src/pipeline/production-ports.mjs#L212)
- Owner-governed content bundled as imported JSON, deep-frozen at module load.
  [`production-ports.mjs:40`](../../src/pipeline/production-ports.mjs#L40)
- Closed envelope decode: exactly one JSON value, no repair or coercion.
  [`production-ports.mjs:140`](../../src/pipeline/production-ports.mjs#L140)
- Generation/judge ports wrap `env.AI.run` through the frozen adapter constants; fallback var is presence-guard only.
  [`production-ports.mjs:166`](../../src/pipeline/production-ports.mjs#L166)

**Writer-seam hardening (worker.js)**

- The seam: posture logged redacted (try/catch), env spread null-safe, assembly fail-closed to null writer.
  [`worker.js:2825`](../../src/worker.js#L2825)
- Pinned 60s port deadline, exported so tests pin value and ordering.
  [`worker.js:1588`](../../src/worker.js#L1588)
- The deadline race: sentinel rejection, timer cleared on settle, redacted failure-class log, same negotiated 502.
  [`worker.js:1615`](../../src/worker.js#L1615)

**Release gate (writer:preflight)**

- Crash-safe check harness — any throw becomes a FAIL line, never a stack trace.
  [`writer-preflight.mjs:137`](../../scripts/writer-preflight.mjs#L137)
- Per-family content verification: pinned hash constants plus real approval re-verification, readiness reported.
  [`writer-preflight.mjs:235`](../../scripts/writer-preflight.mjs#L235)
- Inactive-posture TOML assertion, key-order-insensitive.
  [`writer-preflight.mjs:290`](../../scripts/writer-preflight.mjs#L290)
- Non-vacuous smoke: fully-approved seam content proves wireability, then absent/malformed manifests prove writer null.
  [`writer-preflight.mjs:333`](../../scripts/writer-preflight.mjs#L333)

**Peripherals**

- Content-hash pin mirrored into tests so `npm test` catches drift without the release gate.
  [`test.mjs:2620`](../../test.mjs#L2620)
- Provider wire payloads asserted against the exported frozen constants.
  [`test.mjs:2671`](../../test.mjs#L2671)
- Deadline behavior through the exported seam only — no global timer monkeypatching.
  [`test.mjs:2745`](../../test.mjs#L2745)
- Posture redaction with planted secret refs; failure-path log coverage on the 502 terminal.
  [`test.mjs:2812`](../../test.mjs#L2812)
