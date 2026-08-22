### DW-1: CI's `node test.mjs` reaches the live drand and NOAA feeds, so the CI job is network-dependent (not a Cloudflare production binding, but not offline).
origin: spec-deferred 08b1a26d33d2
location: test.mjs
source_spec: `spec-1-2-toolchain-and-isolated-runtime-baseline.md`
severity: low
reason: Pre-existing: .github/workflows/test.yml comment and test.mjs design ("runs against the live feeds, mocks only the AI binding"); untouched by Story 1.2, surfaced by the intent-alignment audit.
status: open

### DW-2: The spike self-test spikes/judge-fidelity/test.mjs:336 asserts scripts.dev === "wrangler dev" and now fails, so npm run spike:judge:self-test and spike:judge:verify abort before their later isolation
origin: spec-deferred 28143efbc400
location: spikes/judge-fidelity/test.mjs:336
source_spec: `spec-1-2-toolchain-and-isolated-runtime-baseline.md`
severity: medium
reason: Story 1.2's intent requires `npm run dev` to use `wrangler.offline.toml` AND forbids editing anything under `spikes/judge-fidelity/`; both cannot hold while the spike test pins the old dev script. Reproduced at HEAD: `node spikes/judge-fidelity/test.mjs` fails with AssertionError (actual 'wrangler dev --config wrangler.offline.toml', expected 'wrangler dev'). Not on the CI path (`npm run check` does not run the spike self-test), so CI stays green while this repo test is red. Relatedly, spike run.mjs hashes package.json in SOURCE_PATHS, so the recorded 2026-08-16 spike manifest source hashes no longer match after any package.json change — inherent to the required pin. Needs a human decision to relax the Never clause for the spike self-test assertion (and whether to add the spike self-test to `npm run check`).
status: open

### DW-3: Follow-up review still recommended for 1-2-toolchain-and-isolated-runtime-baseline after the damping cap was spent
origin: review-budget-followup
location: n/a
source_spec: `spec-1-2-toolchain-and-isolated-runtime-baseline.md`
severity: low
reason: The follow-up-review damping cap (limits.max_followup_reviews = 1) was spent with the story finalized (status: done, verify green) while the review pass still recommended an independent follow-up. The work was committed by bmad-loop run 20260817-142403-84c0; this entry preserves the lingering recommendation for a deliberate later review.
status: open

### DW-4: Domain Evidence and GroundingReport contracts accept declared non-HTTP, credential-bearing, or private-network source URLs.
origin: spec-deferred 7184ecebddd6
location: scripts/brief-contracts.mjs:227
source_spec: `spec-1-12-composite-gate-and-qualified-judge-integration.md`
severity: medium
reason: Composite Gate correctly reuses the Story 1.7 validators, but those pre-existing contracts require only a nonblank source URL that belongs to the declared Evidence URL set; URL safety is not enforced at that authority boundary.
status: open

### DW-5: Follow-up review still recommended for 1-14-authoritative-commit-and-compatibility-reader after the damping cap was spent
origin: review-budget-followup
location: n/a
source_spec: `spec-1-14-authoritative-commit-and-compatibility-reader.md`
severity: low
reason: The follow-up-review damping cap (limits.max_followup_reviews = 1) was spent with the story finalized (status: done, verify green) while the review pass still recommended an independent follow-up. The work was committed by bmad-loop run 20260818-211736-da17; this entry preserves the lingering recommendation for a deliberate later review.
status: open
- source_spec: none
  summary: Reconcile Story 1.11 generation structural qualification with the approved Workers AI Llama pair and prepare its fresh governed plan.
  evidence: Split from the current build because generation qualification has an independent contract, allowance, cost cap, evidence set, and review surface from Story 1.4 judge qualification.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-16-request-hardening-and-inactive-domain-dispatch-contract.md`
  summary: Bound inactive-domain writer-port latency with a deadline so a hung writer cannot park a request until the platform wall-clock limit.
  evidence: Story 1.16 review found `port.write(dispatch)` is awaited without a timeout; tolerable with the test fake but matters once Story 1.23 wires the real assembled writer.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-23-worker-runtime-assembly.md`
  summary: Wire the redacted activationPosture reason codes into Worker observability so a disabled/misconfigured writer is operationally visible.
  evidence: Story 1.23 review found activationPosture is exported and tested but has no consumer; relevant when Story 1.25 deploys the inactive writer.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-23-worker-runtime-assembly.md`
  summary: Memoize per-request pipeline verification (corpus readiness, priors/house approval hashing) in the assembled writer's hot path.
  evidence: Story 1.23 review found createInactiveDomainWriter re-runs full verification on every domain request; tolerable pre-activation, worth bounding before Story 1.26 traffic.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-25-inactive-writer-deployment.md`
  summary: A writer that settles after the port deadline still commits — the deadline bounds the response, not the write; cancellation semantics into the orchestrator are needed before activation traffic.
  evidence: Story 1.25 review found `runInactiveDomainWriter` abandons but cannot cancel an in-flight `port.write`; a slow writer's coordinator side effects can land after the client received the negotiated 502. Inert while the writer is null (no manifest); must be resolved before Story 1.26 activation.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-25-inactive-writer-deployment.md`
  summary: Provider ports wrap `env.AI.run` with no inner bound, so a hung provider call is only abandoned by the outer port deadline, never cancelled — orphan AI work per request.
  evidence: Story 1.25 review of `src/pipeline/production-ports.mjs`; relevant once providers actually run post-activation (Story 1.26-era).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-25-inactive-writer-deployment.md`
  summary: `productionPipelineEnv` re-runs full content verification per request with no per-isolate memoization, and a time-bound approval could flip the wiring mid-deployment between requests.
  evidence: Story 1.25 review; same class as the deferred 1.23 hot-path memoization finding, worth bounding before Story 1.26 traffic.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-25-inactive-writer-deployment.md`
  summary: The frozen provider envelope decode (`choices[0].message.content`, exactly one choice) is asserted only against hand-written mocks; the real Workers AI wire shape is unproven.
  evidence: Story 1.25 review; proving it requires live calls, which belong to the qualification stories (1.11/1.19), not this deployment story.
