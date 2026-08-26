# Runtime baseline (Story 1.2)

Every later live-evidence story (1.4, 1.11, 1.18, 1.19) and every deployment
(1.23–1.25) binds its evidence to a runtime. This document records the review
decisions behind that runtime and how the freeze works.

**No command described here deploys, uploads a version, or creates or mutates any
remote resource.** The Wrangler invocations used are `deploy --dry-run` and
`types`; everything else is plain Node. CI has no Cloudflare credentials.

## Wrangler pin: `^4.114.0` → exactly `4.123.0`

The caret range meant the toolchain could change under a green build, which would
silently invalidate frozen structural evidence. `devDependencies.wrangler` is now
the exact string `4.123.0` and `package-lock.json` is regenerated; the lockfile
also pins `workerd@1.20260811.1`, the runtime that local dev, tests, and dry runs
execute on (production runs Cloudflare's hosted runtime, whose behavior is governed
by the compatibility date and flags frozen alongside it). The same lockfile update
moved Wrangler's bundled Miniflare from `4.20260722.0` to `5.20260811.1-alpha` —
a major, pre-release bump of the local dev/dry-run harness that ships inside the
pinned Wrangler. It is not named in the identity (Wrangler and workerd are), but
it is covered by `package_lock_sha256`, so it cannot change without a refreeze.

Release notes from 4.115.0 through 4.123.0 were reviewed on 2026-08-17 against
the Wrangler changelog
(<https://raw.githubusercontent.com/cloudflare/workers-sdk/main/packages/wrangler/CHANGELOG.md>). Nothing in that window
changes the behavior this project depends on:

- No breaking changes in range. (Service environments / `legacy_env` were removed
  in 4.111.0, before the previous pin; this repo never used them.)
- Remote-binding fixes (4.115.0 auth-failure messaging, 4.122.0 stale remote
  session reuse) affect `wrangler dev` with remote bindings only.
- Preview work in 4.121.0 is scoped to the `wrangler preview` command family,
  which this project does not use.
- Local-dev additions (R2 S3 credentials, VPC `connect()`, Access mock identity,
  Miniflare `/cdn-cgi/local/*` path rewrites) are opt-in and unused here.
- Deploy-path changes (429 `Retry-After` retries, workers.dev subdomain pre-check,
  email `addresses`, declarative DO `exports`) do not alter the existing
  `migrations`-based Durable Object setup, which is retained as-is.
- Types generation changes are gated behind `--x-new-config`; `wrangler types` on
  the stable config path is unchanged.

## Compatibility date and flags: unchanged

Reviewed 2026-08-17 against
<https://developers.cloudflare.com/workers/configuration/compatibility-flags/>.

`compatibility_date = "2026-07-01"` with `compatibility_flags =
["global_fetch_strictly_public"]` are kept. Reviewing the window from 2026-07-01
to today (2026-08-17), the one behavioral change that would arrive with a bump is
compatibility date `2026-08-04`, at which workerd enables `nodejs_compat` and
`nodejs_compat_v2` by default. That must not turn on silently underneath frozen
evidence, so a compatibility-date bump is a separate, separately tested change.

## `preview_urls` placement fixed

`preview_urls = true` sat inside `[observability]`, where it is not a valid field —
Wrangler emitted an "Unexpected fields found in observability" warning and the
setting had no effect. It is now a top-level key, directly under
`compatibility_flags`, which is where the configuration reference documents it
(<https://developers.cloudflare.com/workers/wrangler/configuration/>). The dry
run is warning-free.

Note that this is not a no-op cleanup: the setting was previously **ineffective**,
so moving it to top level *activates* per-version `*.workers.dev` preview URLs
for uploaded versions. That is the intended behavior (it is what Workers Builds
uses for non-production branches), but it is a real behavioral change, not just a
warning fix.

## KV `remote = true` removed from the root config

The root config's `[[kv_namespaces]] remote = true` only affects `wrangler dev`:
it makes local dev read and write the **production** SPARKS namespace. Production
deploys bind the same namespace id either way, so removing it is the smallest
change that stops a bare `npx wrangler dev` from touching production data. The
`[ai]` binding keeps `remote = true` because Workers AI has no local emulation —
which is why offline development needs its own config rather than a flag
(<https://developers.cloudflare.com/workers-ai/configuration/bindings/>).

## Offline development config

`npm run dev` now runs `wrangler dev --config wrangler.offline.toml`. That config:

- omits the `[ai]` binding entirely, so no callable production AI binding exists in
  development (`src/worker.js` calls `env.AI.run` inside a try/catch and degrades
  to the raw seed, so generation still works — it just shows the unpolished seed);
- binds SPARKS to the local-only id `oddspark-offline-local`;
- keeps local Durable Objects with the same migrations, and the same `main`,
  `[vars]`, compatibility date/flags, and `[assets]` as production;
- sets `workers_dev = false`, `preview_urls = false`, and declares no routes.

`wrangler.offline.toml` is a development-only config and must never be passed to
`wrangler deploy`. The only commands that may use it are `wrangler dev` and
`wrangler deploy --dry-run`; `npm run deploy` deliberately uses the root config
with no `--config` flag.

A second file rather than `[env.offline]`: Wrangler bindings are non-inheritable,
so an env would warn "ai exists at the top level, but not on env.offline" — an
intended omission would look like a mistake and would break the zero-warning
config check enforced by `scripts/check-config.mjs`.

The judge-fidelity spike under `spikes/judge-fidelity/` remains the only
remote-AI path, invoked solely through the explicit `spike:*` scripts. Its config
is hashed as isolation evidence and is not modified by this story.

## The freeze

`runtime-baseline.json` records the runtime identity: pinned Wrangler and workerd
versions, `engines.node`, compatibility date/flags, `main`, per-config facts and
whole-file hashes for the root / offline / spike configs, and hashes of
`package-lock.json` and the generated `worker-configuration.d.ts`.

`package_lock_sha256` intentionally covers the **whole** lockfile, not just the
Wrangler and workerd entries. Any dev-dependency change is a change to the
toolchain that produced the evidence, so it is treated as a runtime-identity
change and requires a deliberate review and refreeze rather than passing quietly.

`frozen_from_commit` records the git HEAD at freeze time. It is advisory
provenance only — the hashed files are the authority, and verification never
consults git.

`runtime_identity_sha256` = `sha256("oddspark.runtime-baseline/v1\n" +
canonical_json(identity))`, where the identity excludes `frozen_at`,
`frozen_from_commit`, and the hash itself, and canonical JSON is key-sorted with
no whitespace. Later stories embed that hash in their qualification manifests;
if it changes, the evidence bound to the old value is invalid and must be rerun.

`process.version` is deliberately not part of the identity — the developer's Node
version differs per machine and is not what the Worker runs on. workerd is.

Commands:

- `npm run baseline:freeze` — rewrite `runtime-baseline.json` (sorted keys,
  2-space indent, trailing newline) with `frozen_from_commit = git rev-parse HEAD`.
- `npm run baseline:verify` — recompute and fail, naming each drifted field
  (expected vs actual), plus the isolation rules: the offline config may not
  declare `[ai]` or any `remote = true`, and the spike config may not bind KV,
  Durable Objects, or routes, nor share the production Worker name; neither the
  offline nor the spike config may declare `[env.*]` sections; and the root
  config's `[[kv_namespaces]]` may not be `remote = true` while its
  `preview_urls = true` must be top-level; and no `wrangler.json` /
  `wrangler.jsonc` may sit beside `wrangler.toml`, since Wrangler would read it
  instead of the frozen config. Sections declared via dotted keys
  (`ai.remote = true`) or top-level `route`/`routes` count the same as tables.
- `npm run check` — `test` + `test:baseline` + `check:types` + `check:config` +
  `baseline:verify`. This is what CI runs.
- `npm run check:config` (`scripts/check-config.mjs`) — dry-runs both configs with
  the pinned local Wrangler and fails on any `WARNING` or `Unexpected fields` in
  the output, on `env.AI` appearing in the offline binding table, or on `env.AI`
  being absent from the production one. It also refuses to judge `env.AI` unless
  the binding table itself was printed (`env.SPARKS` present), so a Wrangler
  output-format change fails loudly instead of passing as "AI absent". The
  inspection logic is `inspectDryRun` in `scripts/runtime-baseline.mjs`, unit
  tested against canned transcripts. Dry runs build and print; they upload,
  deploy, create, and mutate nothing.

`freeze` refuses to record a tree that violates those isolation rules, so a
violating config cannot be laundered into a new baseline.

`scripts/runtime-baseline.mjs` uses Node built-ins only and parses just the flat
top-level keys of each config plus section presence — no TOML dependency is added,
because nothing should sit between the repo and its own identity.

## Runtime-assembly identity (Story 1.23)

`src/worker.js` and Node verification import the same canonical pipeline modules.
The runtime-neutral implementations live under `src/pipeline/` (`contracts`,
`receipts`, `rendering`, `generation`, `judge`, `gate`, `corpus`, `priors`,
`house`, `evidence`, `strike`, `activation`, `retention`, `assembly`,
`identity`). The `scripts/*.mjs` files of the same concerns are thin re-export
shims plus the Node-only fs loaders and CLIs — they implement no closed
validator, canonical hash, grounding rule, ledger transition, receipt rule,
projection, or production writer themselves.

No canonical module may reference Node-only APIs. `scripts/assembly-identity.mjs`
enforces that by scanning for every import form (static, side-effect `import
"node:fs"`, re-export, literal or computed dynamic `import(...)`), `require()`,
`eval()`/`Function()`, the full Node builtin surface, and any
`process.*`/`process[...]`/`Buffer`/`globalThis.process`/`globalThis.Buffer`
reference (dot or bracket form). The scan is deliberately conservative: comments
and string literals are matched too, so a suspicious pattern fails closed rather
than being parsed away. Any `.mjs`/`.js` file under `src/pipeline/` whose name
does not match the canonical module pattern fails freeze/verify by name, so no
module can evade the identity or the scan.

`runtime-assembly.json` is the committed frozen identity:
`{schema_version: 1, modules: [{path, sha256}], assembly_identity_sha256}`, where
modules are the sorted canonical module paths with their source hashes and the
identity hash is `sha256("oddspark-runtime-assembly/v1\n" +
canonical_json({schema_version, modules}))`. It binds later gates to exact source
bytes; it creates no approval or deployment authority.

Commands:

- `npm run assembly:freeze` — rewrite `runtime-assembly.json` from the current
  canonical graph (refuses a graph that violates runtime neutrality).
- `npm run assembly:verify` — recompute and fail, naming each drifted or missing
  module; a missing or malformed `runtime-assembly.json` fails with a clean
  error. A fresh clone passes `check` because the frozen file is committed.
- `npm run assembly:test` — unit tests for freeze/verify/drift/usage and the
  neutrality scan. `npm run check` composes `assembly:test` and exactly one
  `assembly:verify`.

The assembled inactive-domain writer and its activation port read the
`PIPELINE_*`/`ACTIVATION_MANIFEST` bindings from the Worker's environment;
production wiring of those bindings is deferred to Stories 1.25/1.26, and
offline fixtures for them create test authority only.

## Inactive-writer deployment gate (Story 1.25)

Story 1.25 wires the production pipeline env in code while the writer stays
inactive: `src/pipeline/production-ports.mjs` constructs the `PIPELINE_*`
content and provider ports from **bundled content** — the owner-governed
priors, house catalog, and voice corpus are imported as modules
(`content/local-priors/v1/`, `content/house-briefs/v1/`,
`semantic/voice/v1/`), verified at construction by the real closed verifiers
(`verifyLocalPriors`, house `verifyApproval`, `validateCorpus`), with any
failure returning null and never a partial env. Nothing is var-bound, so
`wrangler.toml` carries zero Story 1.25 delta and the 1.24 reader-config
assertion keeps passing. The provider ports wrap `env.AI.run` through the
closed generation/judge adapters (frozen prompt/parameters/wire schema,
exactly one JSON value decoded from the frozen response location, no repair)
against `env.AI_MODEL`; `AI_MODEL_FALLBACK` is a presence-only misconfig
guard (fallback wiring is a Story 1.11 qualification product).
`PIPELINE_JUDGE` stays absent — its qualification refs do not exist yet and
are never fabricated. `ACTIVATION_MANIFEST` remains absent, so
`createInactiveDomainWriter` returns null before any port validation and
production strike/read behavior is byte-identical to the 1.24 artifact.

Note: `content/local-priors/v1/approval.json` is still
`pending_owner_approval`, so the bundled priors currently fail construction
(`productionPipelineEnv` returns null). That is fail-closed by design and
gates nothing while the manifest is absent; it must be revisited when exact
owner approval of the priors catalog lands.

`npm run writer:preflight` (`scripts/writer-preflight.mjs`) is the current
release gate for the inactive-writer deploy (`reader:preflight` remains the
1.24 lineage gate). It is fully offline, creates/mutates nothing, emits one
pass/fail line per check (crash-safe: malformed input yields a FAIL line,
never a stack trace), and exits non-zero on any failure:

1. runtime-baseline verify;
2. wrangler config dry runs (zero warnings = dry-run cleanliness);
3. `assembly:verify`;
4. entrypoint-bound import-closure identity — the deployed entrypoint and its
   parsed transitive closure (now including `production-ports.mjs` and the
   bundled content JSON) must hash byte-identical to the frozen assembly;
5. bundled-content verification, one line per content family: content bytes
   are pinned by **hash constants in the preflight script** (any drift
   FAILs) and approvals are re-verified by the real closed verifiers — this
   pinning is independent of the frozen assembly identity, which covers
   module sources only; a family still `pending_owner_approval` is reported
   as such, never silently treated as wireable;
6. inactive-posture config assertion — no `ACTIVATION_MANIFEST` or
   `PIPELINE_*`/`INACTIVE_DOMAIN_WRITER` vars/bindings, no `[env.*]`
   sections, `main` pinned, legacy AI/KV/DO bindings intact (section-parsed,
   key-order insensitive);
7. offline assembly smoke — the pipeline env is constructed through the
   module's offline content seam with a fully-approved content set and its
   ports asserted present (proving wireability), then absent and malformed
   manifests must each yield a null writer.

It is deliberately **not** composed into `npm run check`: it is a release
gate, run explicitly before a separately approved deployment. Deployment
itself requires separate explicit approval; rollback redeploys the 1.24
artifact with no data change.

## Atomic local-only activation packet (Story 1.26)

Activation preparation is offline and creates no authority. `npm run
activation:prepare -- <input.json>` re-runs the retained Story 1.20 verifiers,
closes the local-only manifest and production target, and emits canonical
payload bytes plus hashes for an owner-external Ed25519 signing handoff. It
does not call a provider, sign, deploy, change configuration, or mutate a
remote resource. The signing request exposes the exact domain-separated bytes
as base64url (plus their SHA-256), so an owner-controlled signer never has to
reconstruct or infer the signed message. `npm run activation:verify --
<input.json> <trust.json>` accepts only the exact prepared object, its hash,
and the externally produced signature. The separate owner-selected trust file
must contain exactly `expected_key_id` and `trusted_keys`; no public key in the
signed candidate is accepted as trust authority. Verification checks the
signature, validity, local-only shape, target, observation plan, and inactive
rollback before emitting the final hash-bound packet.

`scripts/activation-controller.mjs` has no production adapter by design. Its
library entry point requires a separate expiring one-shot authority record
that names the exact packet hash, target, and operation. It freezes the live
whole binding, then permits exactly one deadline-bearing compare-and-set from
that value to the approved replacement. Claim, mutation, and observation are
each bounded. It rejects target/value drift, reuse, or substitution; a failed
post-mutation observation is a distinct terminal outcome that explicitly says
the mutation may already have occurred. Activation observation binds every
field independently: installed snapshot hash, runtime identity, local
enablement, effective-local domain posture, and a zero terminal-error window.
Rollback is separately authorized and compare-and-sets only the exact frozen
snapshot to the inactive value, then observes inactive posture. Code rollback
is a different approval and deployment.

Operator authority remains intentionally incomplete and must not be inferred:

- production key id: `oddspark-production-activation-2026-01` (**owner-selected 2026-08-26**);
- production Ed25519 SPKI public key (base64url):
  `MCowBQYDK2VwAyEARHw4lHZum5v0FkNakqeIbOxAMDoMHMKbl9IS0Fknxcg`
  (**owner-selected 2026-08-26**; DER SHA-256
  `17cc333e3c59953bad278a2138ff53c579a793ec48f698dffabc780784fd450e`);
- source-pinning code/config deployment approval: **not granted**;
- external signing approval for exact payload bytes: **not granted**;
- one-shot activation approval for an exact packet/target: **not granted**;
- one-shot rollback approval: **not granted**.

Until the remaining approvals are explicitly supplied, the source-pinned
production trust map remains empty, `ACTIVATION_SNAPSHOT` must remain absent,
and both activation and rollback execution are blocked. No private key
material belongs in this repository, command output, packet, or operator
record.
