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
