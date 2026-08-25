# Story 1.19 Full-Request Development Handoff

## Status

`done`

The offline Story 1.19 implementation is complete and ready for review. The exact live plan remains deliberately unapproved and unexecuted. No provider call, adapter start against a live binding, deployment, activation, commit, push, or remote mutation occurred.

## Files changed

- `spikes/local-full-request-qualification/README.md`
- `spikes/local-full-request-qualification/contract.mjs`
- `spikes/local-full-request-qualification/governance.mjs`
- `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-unapproved.plan.json`
- `spikes/local-full-request-qualification/publication.mjs`
- `spikes/local-full-request-qualification/run.mjs`
- `spikes/local-full-request-qualification/start-adapter.mjs`
- `spikes/local-full-request-qualification/test.mjs`
- `spikes/local-full-request-qualification/verifier.mjs`
- `spikes/local-full-request-qualification/verify.mjs`
- `spikes/local-full-request-qualification/worker.mjs`
- `package.json` (scripts only)
- `src/pipeline/production-ports.mjs` (authorized closed `PIPELINE_JUDGE` descriptor)
- `runtime-assembly.json` (authorized re-freeze)
- `test.mjs` (authorized judge assertions and approved-priors fixture strengthening)
- `scripts/local-priors.test.mjs` (class-authorized approved-priors fixture update)
- `scripts/local-evidence.test.mjs` (class-authorized approved-priors fixture update)
- `_bmad-output/implementation-artifacts/spec-1-19-local-full-request-qualification.md` (status, tasks, and change log only)
- `_bmad-output/implementation-artifacts/handoff-1-19-full-request-dev.md`

Pre-existing/unrelated dirty artifacts were preserved without reset or staging, including `_bmad-output/implementation-artifacts/epic-1-context.md`, `content/local-priors/v1/approval.json`, the work packet, and `node_modules/`.

## Implementation result

- Added a closed plan/approval/evidence contract bound to runtime assembly `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2`, approved priors `2163f355be2e24e1a730938adcb81f70e72208619d34248116d6350c6d925ded`, generation structural authority, judge structural authority, and house authority.
- Added stale-safe exclusive locking, fsynced allowance/call accounting, append-only attempt history, immutable marker-bound publication with rollback, durable zero-call refusal and consumed-incomplete receipts, and independent arbitrary-byte verification.
- Added the offline live-runner orchestration/publication path and isolated temporary adapter configuration. It imports and invokes the real assembled pipeline and production provider envelopes; it was tested only with injected mocks and was never started against a live binding.
- Added 19 adversarial harness tests covering zero-call refusal, identity mismatch, allowance-before-call, immutable publication, provider failure preservation, plan tamper, caps, judge binding, commit reserve, coordinator uncertainty, deterministic rejection, house-never-judged, ambiguous attempts, locks, chronology, and CI/live-entrypoint isolation.
- Wired the qualified closed `PIPELINE_JUDGE` descriptor and re-froze the 17-module runtime assembly.
- Preserved pending, drift, and malformed priors coverage with synthesized pending records while strengthening checked-in-state assertions to the exact approved priors identity.

## Exact validation commands

- `npm test` — PASS, 102/102.
- `npm run spike:full-request:self-test` — PASS, 19/19.
- `npm run local-priors:test` — PASS, 20/20.
- `CI=1 node .github/check-ci.mjs` — initial sandboxed run reached `check:types` and failed because Wrangler could not write its user log or bind its temporary `127.0.0.1` socket; the approved rerun outside the sandbox PASS. Root 102/102, baseline 62/62, generation qualification 45/45, semantic corpus 26/26, local priors 20/20, local evidence 11/11, and browser 6 pass / 2 skip were among the completed gates. The governed CI runner skipped the known DW-6 judge self-test by design.
- `npm run check` — expected governed residual only: FAIL at the unchanged `spikes/judge-fidelity/test.mjs:1134` test `owner-reviewed and prompt-superseded cycles are immutable history; unreviewed spend still blocks planning`, thrown from `spikes/judge-fidelity/run.mjs:1442`. Before that residual, root tests PASS 102/102 and baseline tests PASS 62/62. `git diff --quiet -- spikes/judge-fidelity/test.mjs` exited 0.
- `npm run assembly:verify` — PASS; identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` matches 17 runtime-neutral modules.
- `git diff --check` — PASS.
- `npm run spike:full-request:plan` — PASS; exact plan regenerated with approval/execution null and allowance unconsumed.
- `shasum -a 256 spikes/local-full-request-qualification/plans/story-1-19-local-full-request-unapproved.plan.json` — `c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21`.

## Unapproved plan bundle

Location: `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-unapproved.plan.json`

Exact SHA-256: `c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21`

The exact bytes bind assembly `02fb912…` and priors `2163f355…`. They retain `approval: null`, `execution: null`, and `allowance_consumed: false`. They confer no provider-call or live execution authority.

## Deviations and residual risk

- Authorized scope expanded during development to cover the `PIPELINE_JUDGE` descriptor, assembly re-freeze, and approval-stale fixtures in `test.mjs`, `scripts/local-priors.test.mjs`, and `scripts/local-evidence.test.mjs`. No production code beyond the specifically authorized `production-ports.mjs` descriptor changed.
- The spike does not check in a forbidden Wrangler config. `start-adapter.mjs` creates an isolated JSON config in an OS temporary directory only after exact approval preflight and removes it on exit.
- `npm run check` retains the explicitly excepted, unchanged DW-6 evidence-pinned judge self-test residual. The independent CI runner recognizes and skips that residual; all other required CI gates passed.
- A real full-request qualification result and `LOCAL-FULL-REQUEST` ref do not exist. Running the exact plan still requires Justin's separate fresh approval and an explicitly authorized live action.

## Independent-review repair

- 2026-08-24 — Applied the governor-approved low patch in `scripts/writer-preflight.mjs`: the offline assembly smoke now requires `PIPELINE_JUDGE` to deep-equal the exact closed STRUCT-JUDGE descriptor (`cloudflare-workers-ai`, resolved `env.AI_MODEL`, qualification ref `7dc1ec98a625a1dd16f1166067b496e4209a415e7f10854ff781f46d0d0062d0`, `active`, `GO`) instead of requiring it to be absent. Updated the stale comment.
- Added `scripts/writer-preflight.test.mjs`: exact descriptor acceptance passed, while missing, every field mutation, and an extra field all fail the validator.
- `npm run writer:preflight` — PASS, all 9 checks; assembly `02fb912…` across 17 modules, approved bundled authorities, and absent/malformed manifest writer-null behavior confirmed.
- `node --test scripts/writer-preflight.test.mjs` — PASS, 2/2.
- `npm test` — PASS, 102/102.
- `npm run spike:full-request:self-test` — PASS, 19/19.
- `npm run assembly:verify` — PASS, identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` across 17 runtime-neutral modules.
- `git diff --check` — PASS.
- No provider call, adapter start against a live binding, deployment, activation, commit, push, or remote mutation occurred during the repair.

## Exact live-plan run report

- Owner approval: Justin at `2026-08-24T21:44:32Z`; approval expires `2026-08-24T22:44:32.000Z` with no extension authority.
- Approved plan: run `c2d9142a-bf7a-4a20-9f13-6ed403bd0e91`, SHA-256 `c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21`, caps 6 calls / 3 attempts / $0.06 / 15-second route ceiling / 1-second commit reserve.
- Approval record: `spikes/local-full-request-qualification/plans/story-1-19-local-full-request.approval.json`, SHA-256 `80468be1eb561d222964cbdb52995ee88f0055ccf83501c0bb1d9f667e32e3af`; closed-schema preflight passed with zero calls and allowance unconsumed.
- Result: `NO-GO` before runner invocation. The isolated adapter started on loopback, but Wrangler 4.123.0 reported the Workers AI binding as `not supported` because the frozen launcher passes `--local`, which disables remote bindings; Workers AI has no local simulator. The adapter was shut down immediately before `/run` or allowance consumption.
- Calls made: 0. Attempts: 0. Judge calls: 0. Cost: $0.00. Allowance consumed: false.
- Predicate results: not evaluated; no request execution occurred, so no predicate pass is claimed or fabricated.
- `LOCAL-FULL-REQUEST` ref: none.
- No retry, deployment, activation, commit, push, or remote mutation occurred. Changing the approved launcher posture to remove `--local` or use `--remote` requires separate authority; it was not inferred during the frozen run.

## Launcher-posture repair after zero-call NO-GO

- 2026-08-24 — Under governor repair authority, aligned `spikes/local-full-request-qualification/start-adapter.mjs` with the proven generation-qualification and judge-fidelity launchers by removing the contradictory `--local` argument from `wrangler dev`. The isolated temporary config still requires the Workers AI binding as `{ binding: "AI", remote: true }`; all other launcher behavior remains frozen.
- Added one offline regression to `spikes/local-full-request-qualification/test.mjs` that pins the remote-required AI binding, literal closed Wrangler spawn arguments, and the absence of `--local`. This raises the harness self-test total to 20.
- `npm run spike:full-request:self-test` — PASS, 20/20.
- `npm test` — PASS, 102/102.
- `npm run assembly:verify` — PASS, identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` across 17 runtime-neutral modules.
- `git diff --check` — PASS.
- The live run was not restarted. No adapter start, provider call, allowance consumption, deployment, activation, commit, push, or remote mutation occurred during this repair. Because the harness launcher bytes changed, the prior live approval is not reused; governor offline re-verification and fresh owner reconfirmation are required before another live attempt.

## Owner-reconfirmed live attempt — external disclosure gate

- 2026-08-25 — Restamped the unchanged plan for Justin's reconfirmation: `approved_at` `2026-08-25T05:22:00.000Z`, `expires_at` `2026-08-25T06:22:00.000Z`, plan SHA-256 `c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21`, run `c2d9142a-bf7a-4a20-9f13-6ed403bd0e91`, unchanged caps. Approval SHA-256: `20b4fbdf964751a2154633ca660ccaae4fed6bad76c40abf8729e224ecbe354b`.
- Closed-schema preflight passed with calls 0 and allowance unconsumed. The repaired adapter started successfully and Wrangler reported `env.AI` in `remote` mode.
- Before the runner process was created, the execution environment rejected the live invocation because sending the retained qualification payload (local priors, house catalog, and semantic corpus) to the external Workers AI binding lacked separately explicit disclosure authorization. The runner was not invoked; no spend receipt or evidence set was created.
- Adapter shutdown completed, including the remote connection, and the temporary launcher directory was removed. Retained results directory contains no files.
- Calls: 0. Attempts: 0. Judge calls: 0. Cost: $0.00. Allowance consumed: false. Predicates: not evaluated. `LOCAL-FULL-REQUEST` ref: none.
- No retry or workaround was attempted. No deployment, activation, commit, push, or other remote mutation occurred. Execution may proceed within the existing window only after explicit authorization to disclose those retained qualification payloads to Workers AI; otherwise the approval expires unspent.

## Frozen live qualification — terminal NO-GO

- 2026-08-25 — Justin explicitly authorized disclosure for this one frozen run of the actual Workers AI wire payloads: priors-derived Evidence plus seed for generation, and Candidate plus grounding for judging. House catalog and voice corpus remained local and were used only for local pipeline behavior and retained hashes.
- Revalidated plan SHA-256 `c9325f722c72debf70065f1d943a5a4a6266b16d85765589b4f76d35c75ece21`, approval SHA-256 `20b4fbdf964751a2154633ca660ccaae4fed6bad76c40abf8729e224ecbe354b`, run `c2d9142a-bf7a-4a20-9f13-6ed403bd0e91`, and the approval window ending `2026-08-25T06:22:00.000Z`. No earlier receipt existed.
- The repaired isolated adapter started successfully; Wrangler 4.123.0 reported `env.AI` in `remote` mode. The runner was invoked exactly once. Loopback health returned 200; `/run` returned 502 after 18,447 ms; the runner terminal was `adapter_failure`.
- Retained artifact: `spikes/local-full-request-qualification/results/c2d9142a-bf7a-4a20-9f13-6ed403bd0e91.spend-receipt.json`, SHA-256 `021e04a10d6d1d3ad0d889fcccf844737c01ac32e22fc5fa5b6783c6fa13f396`, state `consumed_incomplete`, `calls_started: 1`, `allowance_consumed: true`, first call start `2026-08-25T05:47:43.431Z`, failure `2026-08-25T05:48:01.896Z`.
- Calls: 1 runner-accounted call start. Attempts, judge calls, provider completion, usage, and cost are unknown because the adapter returned no evidence payload. No value is fabricated; the $0.06 cap cannot be independently recomputed from the retained receipt.
- The required 22-field evidence set was not produced. Independent verification was invoked over the only retained arbitrary bytes and failed closed, but the verifier itself threw `TypeError: Cannot read properties of undefined (reading 'started_at')` at `verifier.mjs:15` instead of returning structured predicate failures. Consequently 0/17 predicates are proven.
- Result: `NO-GO`. `LOCAL-FULL-REQUEST` ref: none.
- The adapter and remote connection were stopped and the temporary launch-authority/config directory was deleted. The consumed-incomplete receipt is intentionally retained. No retry, deployment, activation, commit, push, or other remote mutation occurred.

## Post-NO-GO repairs and new unapproved plan

- 2026-08-25 — Repaired `spikes/local-full-request-qualification/verifier.mjs` and its CLI so a retained spend receipt, including `consumed_incomplete`, or incomplete evidence returns structured fail-closed results for all 17 predicates instead of throwing. Regression coverage runs against the actual retained receipt; it proves all predicates false, no stack trace, and no ref.
- Added a route-derived inner provider timeout: `(route_ceiling_ms - commit_reserve_ms) / call_cap`, floored to `4,833 ms` for the new 30,000 ms route ceiling, 1,000 ms reserve, and six-call ledger. Each provider call retains its timeout, latency, request/failure-response hashes, known-zero usage/cost on timeout, and terminal attempt accounting. No retry exists outside the assembled orchestrator.
- The real adapter-worker integration test drives the unchanged assembled pipeline with a never-settling mocked provider. It completes bounded with three terminal `provider_failed` generation attempts, zero judge calls, commit reserve intact, no commit/render authority, and null ref. The worker returns structured NO-GO evidence; outer `runLive` independently verifies it and atomically publishes a five-member `completed_no_go` set instead of degrading to `consumed_incomplete`.
- Regenerated `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-unapproved.plan.json` with `route_ceiling_ms: 30000`, `provider_timeout_ms: 4833`, and unchanged `commit_reserve_ms: 1000`, 6-call, 3-attempt, and $0.06 caps. Run scope and run ID remain unchanged. Approval/execution are null and allowance is false.
- New exact plan SHA-256: `025401ebf2bf31560eb84ab8876624dfc878daeac92f6a7076f214246cd71d77`.
- The old approval record remains historical and binds the retired plan SHA `c9325f72…`; it cannot authorize the new plan. No new approval was stamped.
- Historical consumed receipt remains byte-identical at SHA-256 `021e04a10d6d1d3ad0d889fcccf844737c01ac32e22fc5fa5b6783c6fa13f396`.
- `npm run spike:full-request:self-test` — PASS, 20/20.
- `npm test` — PASS, 102/102.
- `npm run assembly:verify` — PASS, identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` across 17 runtime-neutral modules.
- `git diff --check` — PASS.
- No live run, adapter start, provider call, approval stamp, deployment, activation, commit, push, or remote mutation occurred. Workers AI computation may continue upstream after the local timeout because the binding exposes no proven cancellation guarantee; the harness itself stops awaiting at the frozen timeout and retains the attempt fail-closed.

## 120-second unapproved plan regeneration

- 2026-08-25 — Under Justin's route-ceiling choice, regenerated the same unapproved run scope with `route_ceiling_ms: 120000` and the frozen per-slot timeout `floor((120000 - 1000) / 6) = 19833 ms`.
- Preserved `commit_reserve_ms: 1000`, call cap 6, attempt cap 3, maximum cost $0.06, run ID, authorities, schedule, retention, and all 17 predicates. Approval/execution remain null and allowance remains false.
- New exact plan SHA-256: `ae0652e4329929afa1ca547328234d7dbee5e16d2d65cf865fa55955df878b86`.
- Historical consumed receipt remains byte-identical at SHA-256 `021e04a10d6d1d3ad0d889fcccf844737c01ac32e22fc5fa5b6783c6fa13f396`.
- `npm run spike:full-request:self-test` — PASS, 20/20. Node emitted one file-handle garbage-collection deprecation warning after the accounting/lock fixtures; the test command exited 0 with no failed tests.
- `npm test` — PASS, 102/102.
- `npm run assembly:verify` — PASS, identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` across 17 runtime-neutral modules.
- `git diff --check` — PASS.
- No live run, adapter start, provider call, approval stamp, deployment, activation, commit, push, or remote mutation occurred.

## 120-second frozen live qualification — terminal NO-GO

- 2026-08-25 — Justin approved exact plan SHA-256 `ae0652e4329929afa1ca547328234d7dbee5e16d2d65cf865fa55955df878b86` and carried forward the exact wire-disclosure authority. A new historical approval file was stamped at `2026-08-25T06:43:15.000Z`, expiring `2026-08-25T07:43:15.000Z`, SHA-256 `0b5b84a93f8ce625616921c4cad5dff4eb709b4f9242f4c7b39fcdaeec9014e6`. Earlier approval and consumed receipt bytes were not overwritten.
- Results were isolated under `spikes/local-full-request-qualification/results/ae0652e4329929afa1ca547328234d7dbee5e16d2d65cf865fa55955df878b86/`. The adapter reported the AI binding in remote mode; health returned 200 and the single `/run` invocation returned structured HTTP 200 NO-GO evidence. No second invocation occurred.
- Calls: 3 generation calls, 0 judge calls. All three attempts retained `provider_failed`, null Candidate refs, 19,833 ms configured timeouts, measured latencies 2/0/1 ms, zero reported input/output tokens, and recomputed cost $0.00. House Brief was never judged. Allowance consumed: true.
- Route elapsed 98 ms; 119,902 ms remained before the ceiling; the 1,000 ms commit reserve predicate passed. Outcome was `pipeline_failed`; no authoritative commit or render occurred.
- Independent verifier result: 15/17 predicates passed. Failures were exactly `commit.authoritative` (`authoritative commit not confirmed`) and `render.complete` (`render evidence missing`). The remaining accounting, authority, deadline/reserve, chronology, telemetry, cost, retry, and content-hash predicates passed.
- Result: `NO-GO`. `LOCAL-FULL-REQUEST` ref: none.
- Immutable five-member publication verified. Evidence SHA-256: `e0db737863316b8707986bc353a8059e9611700911acf11a4dd6ee60d9a01cf5`; receipt SHA-256: `72fefbc324e79178291cb946c49aa278589677d1fe6237dfe80a07741a57883d`; publication marker SHA-256: `3669ac3a35a2f992394a82fb83f50689da6c059a9d6cee7799ba6dca057d307f`.
- Adapter and remote connection shutdown completed; temporary launch-authority/config material was deleted. No retry, deployment, activation, commit, push, or other remote mutation occurred.

## Offline diagnosis of immediate generation failures

- 2026-08-25 — Diagnosed the three 0–2 ms generation failures without starting an adapter or making another provider call. The retained Wrangler debug log is `/Users/justin/Library/Preferences/.wrangler/logs/wrangler-2026-08-25_06-43-49_899.log`. It confirms `env.AI` was a `remote` AI binding, `env.AI_MODEL` was present (Wrangler redacted the displayed suffix), and `env.AI_MODEL_FALLBACK` was present as `unwired-house-fallback`. It contains remote connection lifecycle entries but no exception class, exception message, Workers AI response body, or request-level failure diagnostic. The already-closed adapter console likewise retained only successful `GET /health 200` and `POST /run 200` access lines, so the actual provider exception is not recoverable from the available logs.
- The temporary Wrangler config did define the exact primary model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and fallback string `unwired-house-fallback`. `productionPipelineEnv` requires nonblank values for both and returned a pipeline, ruling out missing model variables for this run. `generationProvider` captures `env.AI_MODEL` and passes that exact primary string as the first argument to `env.AI.run`; the fallback is not used for generation.
- The request that reached the instrumented binding was the production envelope: system and canonical-JSON user messages, `temperature: 0`, `max_tokens: 2048`, and `response_format: { type: "json_schema", json_schema: <the closed Candidate schema> }`. The three distinct retained request hashes prove three attempt-specific request byte sets reached the instrumentation boundary. They do not prove that the remote service accepted the envelope.
- The harness catch path is the decisive retention gap: it catches the actual thrown value, records only `success: false`, known-zero usage, latency, and `response_sha256 = sha256(canonical({ error: "provider_failure" }))` (`182ca0a34097c2836687b6eca301dfa59c51ada11bd4d60412496c6bcf2015dd` for all three calls), then rethrows. Neither error name/class, message, status/code, nor a privacy-reviewed provider diagnostic is retained. That missing diagnostic should be added in a separately authorized harness repair; it was intentionally not changed during this diagnosis.
- Evidence-weighted hypothesis: a timeout is excluded by the 0–2 ms latencies versus the 19,833 ms inner timeout. Missing `AI_MODEL` / `AI_MODEL_FALLBACK` is excluded. A missing local binding object is also inconsistent with Wrangler's remote-binding log, successful worker health, and pipeline construction. The unresolved leading possibilities are (a) an immediate remote/account/model availability or authorization rejection after `env.AI.run`, or (b) immediate validation rejection of the structured request shape, particularly the nested JSON Schema response format. Zero reported usage and identical failure hashes are consistent with rejection before inference, but the swallowed exception prevents ranking those two causes conclusively. No evidence supports changing production behavior yet.
- Scope observed: handoff append only. No harness repair, production-code change, live call, adapter start, deployment, activation, commit, push, or remote mutation occurred.

## Provider-diagnostic retention repair and unapproved one-call probe

- 2026-08-25 — Closed the provider-error retention gap in `spikes/local-full-request-qualification/worker.mjs`. Every failed instrumented provider call now retains a `provider_error` record containing the actual exception class, message, HTTP status, and code. String fields are safely extracted, cycle/getter tolerant, and capped at 512 characters. The failure response hash now binds this retained diagnostic rather than hashing only `{ error: "provider_failure" }`.
- Strengthened the independent verifier's `telemetry.retained` predicate: a failed call cannot pass independent verification unless its bounded provider-error details are present and well typed. Regression coverage proves a custom provider exception survives into returned evidence with class, bounded message, status, and code; hostile/cyclic error values do not escape the sanitizer.
- Added `compatibility_flags: ["nodejs_compat"]` to the ephemeral Wrangler configuration, matching the proven generation and judge qualification launcher configuration. The launcher posture self-test pins this flag alongside the remote AI binding and prohibition on `--local`.
- Added an executable closed diagnostic-plan profile. Its adapter boundary enforces the plan call cap before invoking `env.AI.run`, so the assembled pipeline can consume at most one real provider call even if it continues its internal bounded fallback path after that diagnostic call. The probe schedules one generation slot and zero judge slots, with call cap 1, attempt cap 1, cost ceiling $0.01, route ceiling 30,000 ms, commit reserve 1,000 ms, and provider timeout 29,000 ms.
- The production generation contract does not expose a plan-level token override. To avoid request-shape drift, the probe therefore pins and tests the frozen production envelope's `max_tokens: 2048`, plus its existing JSON Schema response format, rather than introducing a smaller diagnostic-only envelope.
- Unapproved probe plan: `spikes/local-full-request-qualification/plans/story-1-19-one-call-diagnostic-unapproved.plan.json`; run ID `8db05458-52dd-4f88-a2ab-3b8af1ef1f91`; exact SHA-256 `54b883b104dfaf490c55af61025aab8adfc6696c240d06c56f1069e75d4aed09`. Approval is null, execution is null, and `allowance_consumed` is false. No approval record was created or changed.
- Files changed for this directive: `spikes/local-full-request-qualification/worker.mjs`, `contract.mjs`, `verifier.mjs`, `start-adapter.mjs`, `test.mjs`, the new diagnostic plan, and this handoff.
- `npm run spike:full-request:self-test` — PASS, 22/22.
- `npm test` — PASS, 102/102.
- `npm run assembly:verify` — PASS, identity `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2` across 17 runtime-neutral modules.
- `git diff --check` — PASS after the handoff append.
- No live provider call, adapter start against a live binding, approval stamp, deployment, activation, commit, push, or remote mutation occurred.

## Approved one-call probe — blocked before execution

- 2026-08-25 — Stamped Justin's `approve the probe` authority for exact plan SHA-256 `54b883b104dfaf490c55af61025aab8adfc6696c240d06c56f1069e75d4aed09`, run `8db05458-52dd-4f88-a2ab-3b8af1ef1f91`. Approval window: `2026-08-25T14:30:08.000Z` to `2026-08-25T15:30:08.000Z`; approval SHA-256 `64dc1f18f7e2d72083cc11a91f46a95fb7dee6e64b5f4ed63c2d11ba32494264`.
- The isolated adapter launch reached Wrangler/workerd but failed before health: `TypeError: Incorrect type for map entry 'PROVIDER_ERROR_FIELD_MAX_LENGTH': the provided value is not of type 'function or ExportedHandler'.` The retention repair exported a numeric constant from the Worker entry module; workerd rejected that named non-handler export.
- The runner was not invoked. Calls: 0 generation / 0 judge; attempts: 0; cost: $0.00; allowance consumed: false. No provider evidence exists and no provider error details are claimed. Verdict: `BLOCKED_STARTUP`.
- Run report: `spikes/local-full-request-qualification/results/54b883b104dfaf490c55af61025aab8adfc6696c240d06c56f1069e75d4aed09/8db05458-52dd-4f88-a2ab-3b8af1ef1f91.probe-report.md`. Wrangler log: `/Users/justin/Library/Preferences/.wrangler/logs/wrangler-2026-08-25_14-30-43_853.log`.
- Adapter exit triggered ephemeral config/authority cleanup. No retry was attempted. The harness defect was not repaired under the stamped frozen execution authority; fresh governor review and execution authority are required after repair.

## Worker export-posture repair and replacement probe

- 2026-08-25 — Under Justin's `approve the repair` authority, moved `PROVIDER_ERROR_FIELD_MAX_LENGTH`, `providerErrorDetail`, and `boundedProviderCall` without behavioral changes into the non-entry module `spikes/local-full-request-qualification/provider-call.mjs`. `worker.mjs` now exports only its default Worker handler. A regression dynamically inspects the entry namespace and requires exactly `default`.
- Re-froze and verified the canonical runtime assembly with `npm run assembly:freeze` and `npm run assembly:verify`. Because the authorized repair changed only spike modules, the 17-module runtime assembly identity correctly remains `02fb91201bcdde62f9f1386b4011d0f0d4440ad3a559a4d6503f2207455e1ea2`; no runtime source bytes changed.
- Generated replacement unapproved probe `spikes/local-full-request-qualification/plans/story-1-19-one-call-diagnostic-f006d69d-unapproved.plan.json`, run `f006d69d-c479-471a-af44-7771a40fd6e5`, exact SHA-256 `ff25b671260cec6a1d0e9472484926a74c1bebbf5eb9c6738a43c860c8509faf`. It binds assembly `02fb912…`, retains the frozen 1 generation / 1 attempt / 0 judge / $0.01 / 30 s route / 29 s provider / 2,048-token profile, and has null approval/execution with allowance unconsumed.
- `npm run spike:full-request:self-test` — PASS, 23/23.
- `npm test` — PASS, 102/102.
- `git diff --check` — PASS after this handoff append.
- No adapter start, provider call, approval stamp for the replacement probe, deployment, activation, commit, push, or remote mutation occurred.

## Approved replacement one-call probe — generation succeeded

- 2026-08-25 — Stamped Justin's `approve the probe` authority for exact plan SHA-256 `ff25b671260cec6a1d0e9472484926a74c1bebbf5eb9c6738a43c860c8509faf`, run `f006d69d-c479-471a-af44-7771a40fd6e5`. Approval window: `2026-08-25T15:14:22.000Z` to `2026-08-25T16:14:22.000Z`; approval SHA-256 `d73ab016960a4fa4c78e15626f74a9b75ae06f47673ba0db224e7e3a3625a7ac`.
- The repaired isolated adapter started with its Workers AI binding in remote mode. The runner was invoked exactly once, then the adapter and remote connection were stopped and ephemeral launch material was deleted.
- The sole generation call succeeded: Candidate ref `7825c9cef0b285b506bbc8e6487e3a40146286d91ff139b1119545f9899255f0`, response SHA-256 `47d7fd4c6d5c41825089074a685aa53b045efc6ebecf3719143626c8b1ec44dd`, 606 input tokens, 283 output tokens, 10,459 ms latency, and `$0.00081249` cost. Because no provider exception occurred, no `provider_error` record is expected or fabricated.
- Accounting: 1 generation call, 1 attempt, 0 judge calls, no external retries, allowance consumed. Route elapsed 10,556 ms; provider timeout and route/cost caps plus commit reserve were observed.
- Evidence: `spikes/local-full-request-qualification/results/ff25b671260cec6a1d0e9472484926a74c1bebbf5eb9c6738a43c860c8509faf/f006d69d-c479-471a-af44-7771a40fd6e5.evidence.json`, SHA-256 `61f682c84a14fc5db8f6ffc667eeb72733581cec29457cdaf14c9d99eab70199`.
- Independent verdict: `NO-GO`, 15/17 predicates passed. Expected failures were `commit.authoritative` and `render.complete`, because the diagnostic plan permits no judge/commit/render continuation. No LOCAL-FULL-REQUEST ref was emitted.
- Probe report: `spikes/local-full-request-qualification/results/ff25b671260cec6a1d0e9472484926a74c1bebbf5eb9c6738a43c860c8509faf/f006d69d-c479-471a-af44-7771a40fd6e5.probe-report.md`.
- No retry, deployment, activation, commit, push, or other remote mutation occurred.

## Fresh-approved 120-second full qualification — NO-GO

- 2026-08-25 — Stamped Justin's `approve the full run` authority for exact plan SHA-256 `ae0652e4329929afa1ca547328234d7dbee5e16d2d65cf865fa55955df878b86`, frozen run `c2d9142a-bf7a-4a20-9f13-6ed403bd0e91`. Fresh approval window: `2026-08-25T15:26:37.000Z` to `2026-08-25T16:26:37.000Z`; approval SHA-256 `2848d201c3c3c9b33b60587e2c6ea74a3f3fd36b398507e2ed5c75d4b694e30c`. Results were isolated beneath the fresh approval hash, leaving prior immutable evidence untouched.
- The sole runner invocation made 2 successful generation calls, 0 judge calls, and no external retries. Candidate refs were `24f7ac9ae79728245de03d141b6ff952ddf8fc5620e0275b4a0d32287c0b92a5` and `99d133f4d4869293844aaacaa75ed1a2d4de3a52c33f0084d186945ed1e20b05`. No provider exception occurred, so no provider-error record is expected.
- Usage totaled 1,215 input and 600 output tokens; cost `$0.00170235`. Route elapsed 18,282 ms and all call, cost, timeout, route, retry, and reserve limits were observed.
- Evidence: `spikes/local-full-request-qualification/results/ae0652e4329929afa1ca547328234d7dbee5e16d2d65cf865fa55955df878b86/approval-2848d201c3c3c9b3/c2d9142a-bf7a-4a20-9f13-6ed403bd0e91.evidence.json`, SHA-256 `6147d941f21b893772957e8eccbd9464a492737fa608f74f56160ffb4fdcf2d0`.
- Independent verdict: `NO-GO`, 15/17 predicates passed. Failures: `commit.authoritative` and `render.complete`. The assembled pipeline ended after the second successful generation response without a judge call, authoritative commit, or render. No LOCAL-FULL-REQUEST ref was emitted.
- Full report: `spikes/local-full-request-qualification/results/ae0652e4329929afa1ca547328234d7dbee5e16d2d65cf865fa55955df878b86/approval-2848d201c3c3c9b3/c2d9142a-bf7a-4a20-9f13-6ed403bd0e91.full-run-report.md`.
- The adapter and remote connection were stopped; ephemeral launch material was deleted. No retry, deployment, activation, commit, push, or other remote mutation occurred.

## Deadline override and strike-ledger observability repair

- 2026-08-25 — Under Justin's `approve the deadline fix` authority, added a validated `PIPELINE_STRIKE_DEADLINE_BUDGET_MS` seam to `src/pipeline/assembly.mjs`. When absent, production behavior remains exactly 15,000 ms. An override must be a positive safe integer no greater than 120,000 ms; invalid values fail closed. The qualification worker supplies the frozen `route_ceiling_ms - commit_reserve_ms`, which is 119,000 ms for the replacement full plan.
- Added an optional, non-interfering `onStrikeResult` observer at the assembly dependency seam. It receives only the frozen strike terminal code, model-call count, and ledger; observer absence preserves production behavior and observer failure cannot affect the writer.
- The spike now retains top-level `strike: { code, model_calls, ledger }`, reconstructs deterministic/judge/terminal attempt state from those events, and never labels a successful generation `provider_failed`. The independent verifier requires a nonempty well-formed strike ledger and rejects successful-generation/provider-failure contradictions.
- Production regression coverage pins the 15,000 ms default, accepts the 119,000 ms qualification value, and fails closed on zero, negative, fractional, over-120,000, and string values. Spike coverage proves ledger visibility and independent rejection when it is absent.
- Re-froze the canonical 17-module runtime assembly. New identity: `59fd60d827b7b49981473ef3296d856593c0a629f20b531934d8f6989125a30e`.
- Regenerated full unapproved plan: `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-035f3ab7-unapproved.plan.json`; run `035f3ab7-96e1-444f-b6f4-e3917d23ccb3`; exact SHA-256 `80331b41b680ec31dd22aebd6495ed1e1b641fae94c5dc5fa513f27630e231f4`. It preserves the 120,000 ms route ceiling, 1,000 ms reserve, 19,833 ms per-call timeout, six-call/three-attempt generation+judge schedule, $0.06 cap, frozen 2,048-token production envelope, null approval/execution, and unconsumed allowance.
- `npm run spike:full-request:self-test` — PASS, 24/24. Node emitted the pre-existing file-handle garbage-collection warning after the lock/accounting fixtures; command exited 0.
- `npm test` — PASS, 103/103.
- `npm run assembly:freeze` — PASS, identity `59fd60d8…` over 17 modules.
- `npm run assembly:verify` — PASS, identity `59fd60d8…` over 17 modules.
- `git diff --check` — PASS after this handoff append.
- No live run, adapter start, provider call, approval stamp, deployment, activation, commit, push, or remote mutation occurred.

## Approved deadline-fixed full qualification — NO-GO

- 2026-08-25 — Stamped Justin's `approve the full run` authority for exact plan SHA-256 `80331b41b680ec31dd22aebd6495ed1e1b641fae94c5dc5fa513f27630e231f4`, run `035f3ab7-96e1-444f-b6f4-e3917d23ccb3`, and assembly `59fd60d827b7b49981473ef3296d856593c0a629f20b531934d8f6989125a30e`. Approval window: `2026-08-25T16:23:23.000Z` through `2026-08-25T17:23:23.000Z`; approval SHA-256 `408f498276f6014d4020a2787cd83c8f9cb1fefd49596f2495d8a48dfab4c3b1`.
- The runner was invoked exactly once. It made 3 successful generation calls, 0 judge calls, and no external retries across 3 attempts. Usage was 1,818 input and 929 output tokens; cost was `$0.00261747`; route elapsed was 31,607 ms with 88,393 ms remaining before commit.
- The retained strike terminal is `house_accepted`. Its ledger records three generated Candidates rejected deterministically for `candidate.title` / `personal_name`, zero judge calls, selection of house Brief `summer-handoff-bridge`, and coordinator status `resolved`. The adapter-facing pipeline result was nevertheless `pipeline_failed`, source `none`, without authoritative commit or render.
- Independent verdict: `NO-GO`, 15/17 predicates passed. Only `commit.authoritative` and `render.complete` failed. No `LOCAL-FULL-REQUEST` ref was emitted.
- Evidence: `spikes/local-full-request-qualification/results/80331b41b680ec31dd22aebd6495ed1e1b641fae94c5dc5fa513f27630e231f4/035f3ab7-96e1-444f-b6f4-e3917d23ccb3.evidence.json`, SHA-256 `baf29cc9bada6b321586de805a15eff38a0c56139dd9314fe61a360b9cefbe69`. Full report: `spikes/local-full-request-qualification/results/80331b41b680ec31dd22aebd6495ed1e1b641fae94c5dc5fa513f27630e231f4/035f3ab7-96e1-444f-b6f4-e3917d23ccb3.full-run-report.md`.
- The adapter and remote connection were stopped, and no ephemeral launch-authority receipt remains. No retry, deployment, activation, commit, push, or other remote mutation occurred.

## Authorized personal-name gate relaxation and replacement plan

- 2026-08-25 — Under Justin's `relax the gate` authority, replaced raw two-word capitalization as the personal-name signal with a deterministic curated common-given-name plus capitalized-surname rule. Titled names (`Mr`, `Mrs`, `Ms`, `Miss`, `Dr`, `Prof`) remain rejected, including punctuation variants; apostrophized, hyphenated, joined-capital surnames, and `John OBrien` remain covered.
- Headline-like strings beginning with at least three Title-Case words now pass, including `Plan Your Week in Ten Minutes`, `Summer Handoff Bridge`, and `Get Things Done Before Noon`. Existing sentence-case, Spark exemption, single-capitalized-token ambiguity, and all-caps ambiguity behavior remain pinned by tests.
- Added explicit contract regressions for `Sarah Chen`, `Dr. Smith`, and `John OBrien` rejection, the three approved Title-Case examples, and all prior cases.
- Re-froze and verified the canonical 17-module runtime assembly. New identity: `39f24a833694d50007ea5be41602b56ed492410bb458406ac6bd817167054743`.
- Replacement unapproved plan: `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-2385cc23-unapproved.plan.json`; run `2385cc23-8000-4029-b77c-0190963ba6bf`; exact SHA-256 `34cb0d6fa91d1a23137974db530dc5a3645971ef44e760b31b6472d385cbee93`. It binds the new assembly and retains the 120,000 ms route ceiling, 1,000 ms reserve, 19,833 ms provider timeout, six-call/three-attempt schedule, `$0.06` cap, 2,048-token production envelope, null approval/execution, and unconsumed allowance.
- Focused contract test: PASS, 16/16.
- `npm run spike:full-request:self-test` — PASS, 24/24.
- `npm test` — PASS, 103/103.
- `npm run assembly:freeze` — PASS, identity `39f24a83…` over 17 modules.
- `npm run assembly:verify` — PASS, identity `39f24a83…` over 17 modules.
- No live run, adapter start, provider call, approval stamp, deployment, activation, commit, push, or remote mutation occurred.

## Approved relaxed-gate full qualification — NO-GO

- 2026-08-25 — Stamped Justin's `approve the full run` authority for exact plan SHA-256 `34cb0d6fa91d1a23137974db530dc5a3645971ef44e760b31b6472d385cbee93`, run `2385cc23-8000-4029-b77c-0190963ba6bf`, and assembly `39f24a833694d50007ea5be41602b56ed492410bb458406ac6bd817167054743`. Approval window: `2026-08-25T17:10:54.000Z` through `2026-08-25T18:10:54.000Z`; approval SHA-256 `0b343d07dad614d76e7d6046fa2d2f1d2451f292cdc79a65234d67a6317b4ac2`.
- The runner was invoked exactly once. Strike/run accounting reports 2 model calls in 1 attempt, `$0.00168814` total cost, 20,129 ms elapsed, 99,871 ms remaining before commit, and no external retries. The retained generation call succeeded with 606 input / 288 output tokens, 13,550 ms latency, and `$0.00082374`; no provider exception occurred.
- The strike terminal is `accepted`; its retained ledger records pair reservation, generation completion, `candidate_accepted`, and coordinator status `resolved`. The evidence omitted the second call's stage record and telemetry, then returned `pipeline_failed`, source `none`, without authoritative commit or render.
- Independent verdict: `NO-GO`, 13/17 predicates passed. Failures: `accounting.call_cap`, `commit.authoritative`, `render.complete`, and `cost.recomputed`. No `LOCAL-FULL-REQUEST` ref was emitted.
- Evidence: `spikes/local-full-request-qualification/results/34cb0d6fa91d1a23137974db530dc5a3645971ef44e760b31b6472d385cbee93/2385cc23-8000-4029-b77c-0190963ba6bf.evidence.json`, SHA-256 `c16b7a6fe34c66a7ee796069525c2e23b1ff6034d3048d170ca4d541d665848a`. Full report: `spikes/local-full-request-qualification/results/34cb0d6fa91d1a23137974db530dc5a3645971ef44e760b31b6472d385cbee93/2385cc23-8000-4029-b77c-0190963ba6bf.full-run-report.md`.
- The immutable five-member publication verified successfully. Marker SHA-256: `7d0a098894a4a2e4aa1e4a7c95087bad8cb285956530c0ead876eaa4643edede`.
- The adapter and remote connection were stopped, and no ephemeral launch-authority receipt remains. No retry, deployment, activation, commit, push, or other remote mutation occurred.

## Spike-only coordinator, call-correlation, and failure-observability repairs

- 2026-08-25 — Under governor harness-fix authority, moved qualification coordinator and evidence correlation helpers into `spikes/local-full-request-qualification/adapter-evidence.mjs`; the Worker entry module remains default-export-only.
- The fake coordinator now emits integer epoch `committed_at` values. A new test passes its complete committed receipt through the production `parseReceipt` contract and requires acceptance. The existing provider-timeout integration is strengthened to require authoritative house commit, completed render, immutable publication, and a GO ref.
- Attempt reconstruction now uses strike attempt sequence and the ledger's authoritative post-notice `generation_completed.candidate_ref`. It retains the raw provider ref separately when it differs, binds exactly one judge record to an accepted attempt, and preserves judge usage/cost. The verifier now rejects an accepted attempt without its candidate-bound judge record.
- Failure evidence now preserves the known strike source (`candidate`, `house`, or `none`), a `strike`/`post_strike` failure stage, and bounded sanitized error class/details instead of blanket `source: none`.
- `npm run spike:full-request:self-test` — PASS, 27/27.
- `npm test` — PASS, 103/103.
- `npm run assembly:verify` — PASS, unchanged identity `39f24a833694d50007ea5be41602b56ed492410bb458406ac6bd817167054743` over 17 modules.
- `git diff --check` — PASS. Plan `34cb0d6fa91d1a23137974db530dc5a3645971ef44e760b31b6472d385cbee93` was not regenerated or modified.
- No live run, adapter start, provider call, approval stamp, deployment, activation, commit, push, or remote mutation occurred.

## Fresh-approved repaired-harness full qualification — GO

- 2026-08-25 — Reused the plan-authoritative run `2385cc23-8000-4029-b77c-0190963ba6bf` under the governor-corrected approval-isolated convention. Stamped Justin's fresh approval for plan SHA-256 `34cb0d6fa91d1a23137974db530dc5a3645971ef44e760b31b6472d385cbee93` and assembly `39f24a833694d50007ea5be41602b56ed492410bb458406ac6bd817167054743`. Approval window: `2026-08-25T18:16:49.000Z` through `2026-08-25T19:16:49.000Z`; approval SHA-256 `caf05ae677a2c91a79b6073a5d9bef267045e1bbfeda2e431d29b4f5d1952db9`.
- The runner was invoked exactly once. It retained 1 successful generation call plus exactly 1 candidate-bound successful judge call in 1 attempt, with no external retries. Total usage: 2,070 input / 496 output tokens; cost `$0.00171630`; elapsed 18,161 ms; 101,839 ms remained before commit.
- Strike terminal `accepted`; authoritative Candidate ref `08815fae6c3692ad9360804016a6c6b09e39f559d69390275999b1175af772fb`. Commit and render completed authoritatively.
- Independent verdict: `GO`, 17/17 predicates passed. Emitted LOCAL-FULL-REQUEST ref `02a174f5725e9c057e6c37aef9a56cc7905d2619bf22d7cc955c9282ac544ff2`.
- Evidence: `spikes/local-full-request-qualification/results/34cb0d6fa91d1a23137974db530dc5a3645971ef44e760b31b6472d385cbee93/approval-caf05ae677a2c91a/2385cc23-8000-4029-b77c-0190963ba6bf.evidence.json`, SHA-256 `0afd87723aedfc4bfae496a38ab35a6daebbc6cd6d8f8a8de8e870c22c200111`. Full report is alongside it as `2385cc23-8000-4029-b77c-0190963ba6bf.full-run-report.md`.
- Immutable five-member publication verified; marker SHA-256 `fdba17363578ad387a18f2e6369770f53667ad28479a23bce8e0734479c2233e`.
- The adapter and remote connection were stopped, and no ephemeral launch-authority receipt remains. No retry, deployment, activation, commit, push, or other remote mutation occurred.
