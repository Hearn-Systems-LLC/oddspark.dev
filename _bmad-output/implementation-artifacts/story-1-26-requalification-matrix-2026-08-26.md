# Story 1.26 requalification matrix — UNAPPROVED

Date: 2026-08-26  
Repository tooling baseline: `9857bd4cdc80802ce78858889cb9a0aa10d0f07a` on `develop`
Overall status: **BLOCKED / UNAPPROVED**  
Provider calls: **0**  
Remote mutations: **0**  
Allowance consumed: **false**

This document is a planning artifact only. It is not approval to start an adapter, call a provider, consume an allowance, sign, deploy, activate, retry, replace, or mutate retained evidence. Historical plans, approvals, runs, manifests, and refs are templates only.

## Current frozen identities and shared constraints

- Current runtime assembly: `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`, independently verified from `runtime-assembly.json` over 18 runtime-neutral modules.
- Generation qualification runtime identity: `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb` (`runtime-baseline.json` SHA-256 `50d8e3fdb06b548a2b90d8f620cee6ed9620c33ed23314aa5f65db1ecec2cf35`, Node `v24.18.0`, Wrangler `4.123.0`).
- Provider: Cloudflare Workers AI through an isolated loopback Worker with only the AI binding remote. No adapter may start before exact owner approval.
- Story 1.26 signing preparation cannot resume until all three stages below have current, independently reviewed GO evidence and unexpired approvals. Stage order is strict: generation, then judge, then local full-request.
- Every live stage is a single exact approved invocation. No external retry, replacement, substitution, diagnostic call, or second runner invocation is authorized. Any called incomplete or ambiguous run is terminal and requires a new owner decision; it does not create authority.
- Retained secrets, credentials, account IDs, headers, and provider reasoning are forbidden.

## Stage 1 — generation structural qualification

Status: **BLOCKED / UNAPPROVED**

### Current exact contract

- Models, independently reported:
  - primary: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  - fallback: `@cf/openai/gpt-oss-20b`
- Parameters: temperature `0`, maximum output `2048` tokens.
- Schedule implemented by current tooling: one probe plus 20 sequential trials per role; probes precede trials; threshold is at least 19/20 `direct_valid` per role plus every retained predicate.
- Deadlines: 10,000 ms adapter preflight; 120,000 ms per adapter call.
- Current repository-authoritative pricing basis, as of 2026-08-22: 70B `$0.29/M` input and `$2.25/M` output; gpt-oss-20b `$0.20/M` input and `$0.30/M` output.
- Current tool-computed conservative ceiling: `$0.30586038` and 63 calls. This ceiling includes one transient retry after `provider_error` or `timeout` for each scheduled slot; it permits no retry after an output classification and no replacement.
- Approval freshness: approval must bind the exact plan and be observed no later than four hours after `approved_at`.
- Retention: plan, approval, every attempt record, bounded output envelopes, usage, latency, cost, source/runtime/adapter identities, predicate results, manifests, and completion marker; no unbounded output or forbidden sensitive fields.
- Expected output authority: independently verified per-role `STRUCT-GENERATION/v2` manifests/configuration refs, plus a closed generation role set/ref only for GO members.

### Narrow blocker

The governing Story 1.11-2 contract authorizes at most one retry inside the exact generation orchestrator only after a transient `provider_error` or `timeout`, retains every attempt, and enforces the 63-call cap. It permits no retry after an output classification, no replacement, and no external retry. This governed policy is current authority and is not a blocker or an amendment request.

The remaining blocker is the owner choice: the exact non-secret Cloudflare account profile label and `paid` versus `free` plan; if `free`, exact observed remaining headroom is also required. Historical approvals do not supply or authorize those choices. No approvable plan, run ID, or plan hash was written.

### Exact proposed command after the blockers are resolved

```sh
npm run spike:generation:plan -- story-1-26-generation-<owner-selected-run-id>
```

After the owner supplies the non-secret profile/plan choice and, for `free`, observed remaining headroom, the current generation plan machinery can write a fresh OS-temporary unapproved bundle without starting an adapter or making a provider call. The exact emitted plan bytes must then be independently reviewed before any separate execution approval is requested.

### Future exact owner approval statement

The final statement must replace every placeholder with values copied from the verified emitted plan:

> I approve exactly generation plan SHA-256 `<PLAN_SHA256>`, plan ref `<PLAN_REF>`, run ID `<RUN_ID>`, Cloudflare Workers AI models `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and `@cf/openai/gpt-oss-20b`, maximum 63 provider calls, maximum `$<MAXIMUM_USD>`, at most one retry inside the exact generation orchestrator only after a transient `provider_error` or `timeout`, retention of every attempt, no retry after output classification, no replacement, and the exact retained fields in those plan bytes, for execution once from `<APPROVED_AT>` until `<EXPIRES_AT>`. No substitution, diagnostic call, external retry, or second runner invocation is approved.

## Stage 2 — judge qualification

Status: **BLOCKED / UNAPPROVED**

Sequencing dependency: Stage 1 must first produce independently reviewed current generation GO evidence and an accepted generation role/configuration ref.

### Current exact contract

- Models, independently reported:
  - primary: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  - fallback: `@cf/meta/llama-3.1-8b-instruct-fast`
- Parameters: temperature `0`, maximum output `2048` tokens, candidate-bound structured judge verdict.
- Schedule: one probe plus 20 sequential trials per model; both probes precede trials; 42 calls maximum; zero retries and zero replacements.
- Deadlines: 10,000 ms preflight; 120,000 ms per call.
- Repository-authoritative conservative pricing basis, as of 2026-08-19: exact 70B price `$0.29/M` input and `$2.25/M` output; the 8B fast endpoint is conservatively budgeted at the same rates and is not represented as observed 8B pricing.
- Current tool-computed ceiling: `$0.3054702`, 27,770.018181818185 neurons, 42 calls.
- Approval timing: `approved_at` cannot precede plan creation or be more than one hour after the plan/headroom disclosure; `expires_at` is exclusive and at most four hours after `approved_at`.
- Retention: the plan's closed `retained_fields` list, including full plan/approval/bundle, candidate and request input, all call records, bounded provider envelope, usage, hashes, source/runtime/adapter identities, fixtures, predicate results, manifests and refs. Credentials, headers, secrets, account IDs, tool calls, and provider reasoning are excluded.
- Expected output authority: independently verified configuration refs and one closed `STRUCT-JUDGE` role ref only for passing members.

### Narrow blocker

The owner has not selected the exact non-secret Cloudflare account profile label and `paid` versus `free` plan. A free plan additionally requires exact observed remaining neurons of at least the conservative maximum. Historical approvals do not supply or authorize those choices.

Standalone judge structural qualification does not require a generation-authority field in its plan schema. The current judge plan machinery needs no schema or source change for that purpose; Story 1.26 binds accepted generation and judge refs together later in the local full-request plan and activation payload. No plan file, approval template, run ID, or approvable plan hash was produced.

### Exact proposed command after the blockers are resolved

```sh
npm run spike:judge:plan -- \
  --output /tmp/story-1-26-judge-requalification.plan.json \
  --account-profile '<OWNER_SELECTED_NON_SECRET_PROFILE>' \
  --plan '<paid|free>' \
  --approval-run-id '<OWNER_SELECTED_RUN_ID>'
```

For `free`, append `--remaining-free-neurons <EXACT_OBSERVED_REMAINING_NEURONS>`. After the owner supplies the profile/plan choice and any required headroom, the current judge plan machinery can produce this fresh unapproved plan without starting an adapter or making a provider call. Its exact bytes must be independently reviewed before any separate execution approval. Stage sequencing still requires accepted generation evidence before judge execution advances.

### Future exact owner approval statement

> I approve exactly judge plan SHA-256 `<PLAN_SHA256>`, plan ref `<PLAN_REF>`, run ID `<RUN_ID>`, Cloudflare Workers AI models `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and `@cf/meta/llama-3.1-8b-instruct-fast`, maximum 42 provider calls, maximum `$0.3054702`, zero retries and zero replacements, and the exact retained fields in those plan bytes, for execution once from `<APPROVED_AT>` until `<EXPIRES_AT>`. No substitution, diagnostic call, retry, or second runner invocation is approved.

## Stage 3 — local full-request qualification

Status: **BLOCKED / UNAPPROVED**

Sequencing dependency: Stages 1 and 2 must first produce independently reviewed current GO evidence and accepted generation/judge refs.

### Required exact contract

- Frozen runtime assembly: `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`.
- Provider/model envelope: Cloudflare Workers AI using the accepted generation and judge model/ref identities from Stages 1 and 2.
- Historical template limits only: 120,000 ms route ceiling; 1,000 ms commit reserve; 19,833 ms provider timeout; three attempts; six calls maximum; `$0.06` maximum. These values are **not current authority** and must be regenerated and verified against the Story 1.26 assembly and accepted refs.
- Historical schedule shape: attempt 1 primary generation/judge slots 1–2; attempts 2–3 fallback generation/judge slots 3–6. No external retry; deterministic rejection uses no judge call; house fallback is never judged.
- Retention must include exact plan/approval/activation bytes; content/request/response hashes; bounded provider error and strike-terminal data; full strike ledger; stage timestamps/latencies/timeouts; attempt and candidate/judge binding; usage/cost; route/commit observations; receipt identity; render bytes/hash; and all 17 predicate results.
- Approval template window: the retained v1 approval contract uses canonical `approved_at` and exclusive `expires_at`; historical approved examples used a one-hour window. A fresh plan must state the exact window.
- Expected output authority: a marker-bound, independently verified evidence set passing all 17 predicates and one derived `LOCAL-FULL-REQUEST` ref.

### Narrow blockers

1. `npm run spike:full-request:self-test` currently fails 2 of 29 tests: provider-error accounting expected one call but observed zero, and provider-failure/exhaustion expected `house_accepted` but observed `pipeline_failed` / `inactive domain writer unavailable`.
2. `npm run spike:full-request:plan` rejects the checked-in plan as `unapproved plan is invalid` because the command points to a stale Story 1.19 plan bound to assembly `39f24a…`, not the current assembly.
3. Current tooling only reads that fixed pre-existing plan. It cannot safely create a new uniquely named plan binding assembly `9e20e723…` and the future accepted Stage 1/2 refs without source changes.

This narrow tooling/test repair must complete before an exact Stage 3 plan can exist. Stage 3 also awaits independently accepted generation and judge refs. Therefore no current plan hash, run ID, cap/cost approval record, or template artifact exists for this stage. Historical plan values and refs are non-promotable.

### Exact proposed invocation after the blockers are resolved

The current command has no safe creation form. A compliant retained plan command must first be added or repaired to accept a fresh output name, current assembly identity, accepted generation/judge refs, exact run ID, route/deadline/call/cost limits, and expiry; it must produce only unapproved zero-call artifacts. After that narrow tooling work, the proposed operation is:

```sh
npm run spike:full-request:plan -- \
  --output spikes/local-full-request-qualification/plans/story-1-26-local-full-request-<RUN_ID>-unapproved.plan.json \
  --assembly-ref 9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5 \
  --generation-ref '<ACCEPTED_STAGE_1_REF>' \
  --judge-ref '<ACCEPTED_STAGE_2_REF>' \
  --run-id '<RUN_ID>'
```

That interface does not exist at this baseline and is documented only as the required future invocation contract, not as an executable command.

### Future exact owner approval statement

> I approve exactly local full-request plan SHA-256 `<PLAN_SHA256>`, run ID `<RUN_ID>`, assembly `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`, accepted generation ref `<GENERATION_REF>`, accepted judge ref `<JUDGE_REF>`, maximum `<CALL_CAP>` provider calls, maximum `$<MAXIMUM_USD>`, route ceiling `<ROUTE_CEILING_MS>` ms, commit reserve `<COMMIT_RESERVE_MS>` ms, provider timeout `<PROVIDER_TIMEOUT_MS>` ms, no external retry or replacement, and the exact retained fields in those plan bytes, for one runner invocation from `<APPROVED_AT>` until `<EXPIRES_AT>`. No adapter restart, diagnostic call, substitution, external retry, or second invocation is approved.

## Independent review gates and stop conditions

For each stage, in order:

1. Run the focused offline/self-test suite and require a complete pass.
2. Generate one fresh unapproved plan from final current bytes and owner-supplied non-secret choices.
3. Independently verify canonical plan bytes, plan hash/ref, current source/runtime identities, request hashes, models, pricing, cap, schedule, expiry contract, retention, allowance=false, and approval/execution null.
4. Obtain the exact owner statement for only that plan. Approval of one stage grants no authority for another stage.
5. Before any call, independently recheck plan/approval/run/source/runtime/adapter identity and unconsumed allowance. Stop with zero calls on any drift or ambiguity.
6. Invoke the approved runner exactly once. Stop on expiry, source/runtime/request drift, prior spend, lock ambiguity, adapter mismatch, cap exhaustion, provider ambiguity, incomplete publication, or verifier failure. Do not repair, replace, or rerun.
7. Independently verify arbitrary retained bytes and require a GO authority ref before advancing to the next stage.

Final signing preparation remains blocked until all three current refs pass retained verifiers, all applicable approvals are unexpired, and an independent reviewer confirms the exact assembly/ref chain. This matrix grants no signing or activation authority.

## 2026-08-26 offline tooling evidence at `9857bd4`

- Local-full-request offline regressions are repaired against the current inactive-domain writer behavior: the stale synthetic expectations now prove fail-closed `pipeline_failed` with zero provider dispatch. The focused suite passes 30/30 without production-pipeline changes.
- A traversal-safe, refuse-overwrite local-full-request plan creator now requires assembly `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`, exact synthetic Stage 1 configuration/role refs, exact Stage 2 role ref, UUID run ID, canonical strike timestamp, and explicit route/deadline/call/cost limits. Tests prove valid synthetic creation, collision refusal, stale assembly/ref rejection, inconsistent deadline rejection, approval/execution null, and `allowance_consumed:false`. No Stage 3 plan was created.
- The expanded packet completed Stage 1 offline planning. Generation plan v3 binds `Hearn Systems account`, `paid`, 10,000 daily free neurons, `free-first-then-paid-bounded-by-plan-cap`, and no paid remaining-free-neuron requirement. Retained v2 authority/ref validation remains available unchanged. The canonical retained plan is `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826.plan.json`: bytes SHA-256 `79ed71acfe5e5e886b05ea1d2523b620cee9f71878976c2eb208cac87d9fc0bd`, plan ref `9676b8fa3f42ab08890f3217a9c40c108b1ca5f2820f166c6b2388caace66486`, run ID `story-1-26-generation-requalification-20260826`, 63-call cap, `$0.30586038` ceiling. Approval/execution are null, allowance false, calls zero.
- The expanded packet completed Stage 2 offline planning. The exact bounded non-secret label is valid without weakening path/traversal/account-ID/secret exclusions. The canonical retained plan is `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-unapproved.plan.json`: bytes SHA-256 `741d207d1b3a054555a8f73afcf63e758875c276c84b0424a1718600558d42ad`, plan ref `0e6a02d0a5971453ff429534ac91fa496219c0ed5cd1a039a96cfb1f7361b336`, run ID `story-1-26-judge-requalification-20260826`, 42-call cap, `$0.3054702` ceiling, zero retry/replacement. The marker-bound approval template remains unapproved with null timestamps.
- Final focused verification: generation 48/48; judge 82/82 plus 79/79 fixtures and 18/18 predicates; local full-request 30/30; retained validators and judge disclosure marker PASS; assembly verify PASS at `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5` over 18 modules; diff/boundary checks PASS.
- Provider calls: **0**. Remote mutations: **0**. Allowance consumed: **false**. No adapter was started and no plan was approved.

This terminal update supersedes the earlier Stage 1/2 missing-owner-input and validator-blocker paragraphs above. Stage 1 and Stage 2 now each have exactly one fresh unapproved offline plan, not execution authority. Stage 3 still depends on fresh separately approved and independently accepted Stage 1/2 GO refs; no Stage 3 plan exists.

## 2026-08-26 Stage 1 r2 offline supersession

The first Stage 1 plan remains immutable and unexecuted, but its retained source identity predates the reviewed mutation-test repair at baseline `b54d376bda1705f9426f5095145a39763b111541`; the fail-closed attempt made zero runner or provider calls and consumed no allowance. The only fresh approvable Stage 1 plan is the canonical, still-UNAPPROVED r2 bundle for run ID `story-1-26-generation-requalification-20260826-r2`: plan SHA-256 `3a03d20f8f66917caf52550cc3fdd2339d40aa42f624c8a5a2e26f40c6c0b1ad`, plan ref `00135e29bbe0422ad77c1d8a6a5888a5ad714abb35f111bf07d4b9ea534de832`, 63-call cap, and `$0.30586038` ceiling. It rebuilt byte-for-byte from the current committed sources and runtime, passed the retained validator, and retains null approval/execution, `allowance_consumed:false`, and zero calls. Fresh exact owner approval is required before any adapter start or execution.

## 2026-08-26 Stage 1 r2 accepted GO

Stage 1 is accepted for attempt `fa7f66dd-d2ec-4635-89e4-3d80a5c2442c`: primary ref `cf602f143373958591b7a4954ec2ebe951160af45fa0fc45802eb0d96030f90c`, fallback ref `2ac2f4bcb4a0a61bd7960c565ef3344e04b7e800d0bd84933deb6c71aea6c1d8`, and unified generation role qualification ref `0473102c40734947c91e8c605e6ae8e03b1e895a8c5b18867a9579dbb6abe514`. The independently reviewed result is GO / GO after 46 of 63 permitted calls, including 4 internal transient retries. Exact spend is unknown because four transient provider errors returned no usage; known partial spend is `$0.02583135`. Independent review verdict: **APPROVE**. Stage 2 remains unapproved, and Stage 3 remains blocked.
