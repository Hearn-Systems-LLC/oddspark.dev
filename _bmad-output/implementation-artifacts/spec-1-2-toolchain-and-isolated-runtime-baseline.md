---
title: 'Story 1.2: Toolchain and Isolated Runtime Baseline'
type: 'chore' # feature | bugfix | refactor | chore
created: '2026-08-17'
status: 'done' # draft | ready-for-dev | in-progress | in-review | done | blocked
review_loop_iteration: 0 # incremented by step-04 before each review loopback
followup_review_recommended: true # set by step-04 on status: done — true if the LLM decided another review pass is worthwhile
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
warnings: ['oversized']
deferred:
  - summary: >-
      CI's `node test.mjs` reaches the live drand and NOAA feeds, so the CI job is network-dependent (not a Cloudflare production binding, but not offline).
    evidence: |-
      Pre-existing: .github/workflows/test.yml comment and test.mjs design ("runs against the live feeds, mocks only the AI binding"); untouched by Story 1.2, surfaced by the intent-alignment audit.
    location: >-
      test.mjs
    severity: low
  - summary: >-
      The spike self-test spikes/judge-fidelity/test.mjs:336 asserts scripts.dev === "wrangler dev" and now fails, so npm run spike:judge:self-test and spike:judge:verify abort before their later isolation assertions run.
    evidence: |-
      Story 1.2's intent requires `npm run dev` to use `wrangler.offline.toml` AND forbids editing anything under `spikes/judge-fidelity/`; both cannot hold while the spike test pins the old dev script. Reproduced at HEAD: `node spikes/judge-fidelity/test.mjs` fails with AssertionError (actual 'wrangler dev --config wrangler.offline.toml', expected 'wrangler dev'). Not on the CI path (`npm run check` does not run the spike self-test), so CI stays green while this repo test is red. Relatedly, spike run.mjs hashes package.json in SOURCE_PATHS, so the recorded 2026-08-16 spike manifest source hashes no longer match after any package.json change — inherent to the required pin. Needs a human decision to relax the Never clause for the spike self-test assertion (and whether to add the spike self-test to `npm run check`).
    location: >-
      spikes/judge-fidelity/test.mjs:336
    severity: medium
epic: 1
story: 2
sprint_key: 1-2-toolchain-and-isolated-runtime-baseline
baseline_commit: 51743b4720172d66d7f86d7cd61c440ec606585f
baseline_revision: 51743b4720172d66d7f86d7cd61c440ec606585f
---

<intent-contract>

## Intent

**Problem:** Every later live-qualification story (1.4, 1.11, 1.18, 1.19) and every deployment (1.23–1.25) must bind its evidence to a stable runtime, but today Wrangler floats on `^4.114.0`, `preview_urls` sits in the wrong TOML scope (Wrangler warns), `npm run dev` binds the production KV namespace and metered Workers AI, and no machine-readable runtime identity exists.

**Approach:** Pin an exact reviewed Wrangler, fix `preview_urls`, give offline development its own config with no callable production binding, add generated types + config validation + dry run + a `runtime-baseline.json` freeze/verify script to `npm run check` and CI, and record the review decisions. No command deploys or mutates anything remote.

## Boundaries & Constraints

**Always:**
- Keep `compatibility_date = "2026-07-01"` and `compatibility_flags = ["global_fetch_strictly_public"]` (reviewed: the only flag defaulting on after that date is `nodejs_compat`/`nodejs_compat_v2` on 2026-08-04, which must not turn on silently — a bump is a separate tested change).
- Pin Wrangler exactly (`"wrangler": "4.123.0"`, no caret); regenerate `package-lock.json`; runtime identity records that version plus the bundled `workerd` version from the lockfile.
- Production `wrangler.toml` keeps name, main, bindings, migrations, assets, routes, observability, and `[ai] remote = true`; only `preview_urls` placement and the KV `remote = true` (dev-only semantics) change.
- Offline development (`npm run dev`) uses `wrangler.offline.toml`: no `[ai]` binding, KV id `oddspark-offline-local`, local DOs + same migrations, same vars/main/compat/assets, `workers_dev = false`, `preview_urls = false`, no routes.
- Every command in the story is non-mutating: `wrangler deploy --dry-run`, `wrangler types`, `node test.mjs`, `node scripts/runtime-baseline.mjs`. CI has no Cloudflare credentials.
- Existing tests stay green; `src/worker.js` and `test.mjs` are read-only for this story.

**Block If:** the pinned Wrangler cannot pass `npm test` + dry run + types generation on the existing config (would require code changes outside this story's scope).

**Never:** deploy, upload a version, create/mutate KV/DO/routes; add a new remote-AI dev path; edit anything under `spikes/judge-fidelity/` (its config is hashed as isolation evidence, not changed); bump the compatibility date; add runtime dependencies (a TOML library included) — the baseline script uses Node built-ins only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Verify, clean tree | `runtime-baseline.json` matches recomputed identity | `node scripts/runtime-baseline.mjs verify` exits 0, prints identity sha256 | No error expected |
| Verify, drift | any of: wrangler/workerd lock version, `wrangler.toml`, `wrangler.offline.toml`, spike `wrangler.toml`, `worker-configuration.d.ts`, compat date/flags differ from frozen | exit 1, lists each drifted field (expected vs actual) | Non-zero exit; nothing written |
| Verify, isolation | offline config contains `[ai]` or `remote = true`, or spike config contains kv/durable_objects/routes or shares root `name` | exit 1 with the violated rule named | Non-zero exit |
| Freeze | `node scripts/runtime-baseline.mjs freeze` | rewrites `runtime-baseline.json` deterministically (sorted keys, 2-space indent, trailing newline), `frozen_from_commit` = `git rev-parse HEAD` | Fails non-zero if git or a hashed file is missing |
| Types check | `wrangler types` regenerated to temp path | byte-identical to committed `worker-configuration.d.ts` | `npm run check` fails if it differs |

</intent-contract>

## Code Map

- `package.json` -- `devDependencies.wrangler` (`^4.114.0` → `4.123.0`); scripts: `dev` (→ offline config), add `types`, `check:types`, `check:config`, `baseline:freeze`, `baseline:verify`, `check`; keep `test`, `deploy`, `spike:*` untouched.
- `package-lock.json` -- regenerate via `npm install`; lock entries `node_modules/wrangler` (:1509) and `node_modules/workerd` (:1488) are the version sources the baseline reads.
- `wrangler.toml` -- `preview_urls = true` currently line 58 inside `[observability]` (:55) → move to top-level under `compatibility_flags` (:4); `[[kv_namespaces]] remote = true` (:24) → remove; everything else unchanged.
- `wrangler.offline.toml` -- NEW offline dev config (see Always).
- `worker-configuration.d.ts` -- NEW, generated by `wrangler types` from `wrangler.toml`; committed.
- `scripts/runtime-baseline.mjs` -- NEW; `freeze|verify`; Node built-ins only (`node:fs`, `node:crypto`, `node:child_process`); parses only top-level flat TOML keys (`name`, `main`, `compatibility_date`, `compatibility_flags`, `preview_urls`) before the first `[` header plus section-presence/`remote = true` checks; hashes whole files.
- `scripts/runtime-baseline.test.mjs` -- NEW; plain `node:assert` tests (same dependency-free style as `test.mjs`) covering every I/O-matrix row against temp fixture repos; the script must therefore expose its logic as importable functions taking a root directory (`computeIdentity(root)`, `verify(root)`, `freeze(root)`, `typesCheck(root, generatedPath)`), with the CLI (`freeze|verify|types-check`) as a thin wrapper; `check:types` runs `wrangler types` to a temp path and calls `types-check`.
- `runtime-baseline.json` -- NEW frozen identity: `{schema_version:"oddspark.runtime-baseline/v1", frozen_at, frozen_from_commit, wrangler, workerd, node_engines, compatibility_date, compatibility_flags, main, configs:{root,offline,spike:{sha256,name,...}}, package_lock_sha256, worker_types_sha256, runtime_identity_sha256}` where `runtime_identity_sha256 = sha256("oddspark.runtime-baseline/v1\n" + canonical_json(identity-without-frozen_at/commit/self))`.
- `.github/workflows/test.yml` -- add `npm ci` and run `npm run check` (replaces bare `node test.mjs`; still no secrets).
- `README.md` -- Deploy › Local (:143-147): `npm run dev` is offline (no AI binding, local KV/DO; generation shows the raw seed); root `npx wrangler dev` reaches metered Workers AI and is not the offline path; mention `npm run check`.
- `docs/runtime-baseline.md` -- NEW short decision record: Wrangler 4.115→4.123 release-note review, compat-flag review (2026-07-01→2026-08-17), `preview_urls` fix, KV `remote` removal, offline config, non-mutation statement, how later stories bind `runtime_identity_sha256`.
- Read-only evidence: `src/worker.js:796-835` — `env.AI.run` inside try/catch falls back to the raw seed, so an offline env without `AI` degrades gracefully; `spikes/judge-fidelity/wrangler.toml` — separate name, AI-only bindings, invoked only via explicit `spike:*` scripts.
- Prior review findings this story closes: architecture tech-currency review F1 (`preview_urls`), F4 (offline guard), F5 (pin/record as tested maintenance).

## Tasks & Acceptance

**Execution:**
- `package.json` + `package-lock.json` -- pin `wrangler` to `4.123.0`, `npm install`, add scripts -- exact toolchain identity.
- `wrangler.toml` -- move `preview_urls` to top level; drop KV `remote = true` -- validation warning gone; bare dev no longer touches production KV.
- `wrangler.offline.toml` -- create -- offline dev with no callable production binding.
- `worker-configuration.d.ts` -- generate with `npx wrangler types` -- generated bindings frozen.
- `scripts/runtime-baseline.mjs` + `runtime-baseline.json` -- implement freeze/verify/types-check, then freeze -- runtime identity for later evidence.
- `scripts/runtime-baseline.test.mjs` -- unit-test every I/O & Edge-Case Matrix row (clean verify, each drift field, each isolation rule, deterministic freeze, types check) using temp directories; wire as `test:baseline` inside `npm run check` -- the matrix is executable, not prose.
- `.github/workflows/test.yml` -- `npm ci` + `npm run check` -- CI validates without credentials.
- `README.md`, `docs/runtime-baseline.md` -- document -- reviewed decisions are auditable.

**Acceptance Criteria:**
- Given the repo at this commit, when `npm ci && npm run check` runs with no Cloudflare credentials, then tests, `check:types`, `check:config` (dry run, zero config warnings), and `baseline:verify` all pass and no remote resource is created, uploaded, deployed, or mutated.
- Given `wrangler.offline.toml`, when `npx wrangler deploy --dry-run --config wrangler.offline.toml` runs, then the binding table lists METER, COORD, SPARKS (`oddspark-offline-local`), and the two vars, and does **not** list `env.AI`.
- Given `wrangler.toml`, when the dry run runs, then no "Unexpected fields found in observability" warning appears and `preview_urls` is top-level.
- Given `package.json`, when read, then `devDependencies.wrangler` is exactly `4.123.0` and `runtime-baseline.json.wrangler` equals it.
- Given any later edit to wrangler version, workerd, compat date/flags, root/offline/spike config, or generated types, when `baseline:verify` runs, then it fails and names the drift.

## Spec Change Log

## Review Triage Log

### 2026-08-17 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 1, medium 5, low 3)
- defer: 1: (high 0, medium 0, low 1)
- reject: 12: (high 0, medium 0, low 12)
- addressed_findings:
  - `[high]` `[patch]` CLI entry guard compared `import.meta.url` to a hand-built `file://` string, so `baseline:verify`/`freeze` silently no-op on paths with spaces/percent-encoding — switched to `pathToFileURL(argv[1]).href` and added a spawn-based CLI test.
  - `[medium]` `[patch]` Partial TOML reader could freeze a wrong identity silently (trailing comments, multi-line arrays, single quotes, duplicate keys, inline tables, `[env.*]`) — hardened to strip comments and throw on unparseable input; parser unit tests added.
  - `[medium]` `[patch]` `remote = true` detection was line-anchored and not section-attributed; isolation could be bypassed and the root KV `remote` removal was pinned only by file hash — remote is now attributed per section; new rules: no `env` sections in offline/spike, root `kv_namespaces` never remote, root `preview_urls` true.
  - `[medium]` `[patch]` `freeze` did not run isolation checks, so a violating config set could be frozen — freeze now fails on violations.
  - `[medium]` `[patch]` `check:config` did not fail on Wrangler warnings and nothing asserted the offline binding table lacks `env.AI` — new `scripts/check-config.mjs` captures dry-run output, fails on `WARNING`/`Unexpected fields`, requires no `env.AI` offline and `env.AI` in root.
  - `[medium]` `[patch]` `check-types.mjs` shelled to `npx wrangler` (could resolve a non-pinned wrangler; raw stack on failure) — now runs the local pinned `node_modules/wrangler/bin/wrangler.js` with a clear error.
  - `[low]` `[patch]` Fixture git commits could fail under `commit.gpgsign`/hooks/outer repo; types-check fixture lacked the real second header line and had no negative test — fixed.
  - `[low]` `[patch]` Docs/README gaps: source URLs + review date for release-note/compat claims, whole-lockfile hash and advisory `frozen_from_commit` semantics, `preview_urls` activation callout, never-deploy note for the offline config, root `wrangler dev` KV-now-local note, refreeze recipe; CI `cache: npm` + `timeout-minutes`.
  - `[low]` `[patch]` Spec Code Map wrote the identity hash prefix as `oddspark-runtime-baseline/v1`; implementation and `schema_version` use `oddspark.runtime-baseline/v1` (consistent) — Code Map corrected to the dot form.

### 2026-08-17 — Review pass (follow-up, review_loop_iteration 0)
- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 1, low 2)
- defer: 1: (high 0, medium 1, low 0)
- reject: 32: (high 0, medium 0, low 32)
- addressed_findings:
  - `[medium]` `[patch]` `parseConfig` threw `unparseable TOML line` on any in-section line without `=`, so a valid multi-line array (e.g. a wrapped `new_sqlite_classes` under `[[migrations]]`) would spuriously fail freeze/verify/CI — continuation lines inside sections are now skipped (remote attribution preserved); parser test added (45/45).
  - `[low]` `[patch]` `scripts/check-types.mjs` called `process.exit(1)` inside `try`, so `finally` never removed `.worker-configuration.check.d.ts` on failure — switched to `process.exitCode`.
  - `[low]` `[patch]` `docs/runtime-baseline.md` claimed workerd "is the runtime the Worker actually runs on" and listed only 4 of the 7 enforced isolation rules — reworded and completed.

### 2026-08-17 — Review pass (follow-up, review_loop_iteration 0, third pass)
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 2, low 5)
- defer: 0
- reject: 25: (high 0, medium 0, low 25)
- addressed_findings:
  - `[medium]` `[patch]` `parseConfig` dropped dotted top-level keys (`ai.binding = "AI"`, `ai.remote = true`), so an offline config written that way declared no `ai` section and no remote binding, bypassing `checkIsolation` — dotted keys now record their first segment as a section and `.remote = true` attributes remote; parser + isolation tests added.
  - `[medium]` `[patch]` `check-config.mjs`'s WARNING / `Unexpected fields` / `env.AI` inspection lived only in the script and its failure branches had never executed — extracted as exported `inspectDryRun(output, {expectAi})` in `runtime-baseline.mjs`, added a positive sanity check that the binding table was printed (`env.SPARKS`) before trusting a negative `env.AI` result, and unit-tested against canned root/offline/warning/no-table transcripts.
  - `[low]` `[patch]` Spike config could bind routes via top-level `route = "..."` / `routes = [...]` without a `[[routes]]` table and pass isolation — top-level `route`/`routes` now count as a `routes` section; tests added.
  - `[low]` `[patch]` `verify()` `JSON.parse`d `runtime-baseline.json`, `package.json`, and `package-lock.json` unguarded, so a corrupted file surfaced as a raw `SyntaxError` stack — now reported as a named `BaselineError`/violation; tests added.
  - `[low]` `[patch]` A `wrangler.json`/`wrangler.jsonc` beside `wrangler.toml` would be read by Wrangler while `baseline:verify` still hashed only the TOML — new isolation rule fails if either exists; test added.
  - `[low]` `[patch]` `docs/runtime-baseline.md` did not mention that the lockfile bump moved Wrangler's bundled Miniflare to `5.20260811.1-alpha` (covered by `package_lock_sha256`, not named in identity), and its isolation-rule list lagged the code — noted, and rules/`inspectDryRun` documented.
  - `[low]` `[patch]` `runtime-baseline.mjs` kept an undocumented, unused `types-check` CLI subcommand (`check-types.mjs` imports `typesCheck` directly) — removed; usage string is now `<freeze|verify>`.

## Design Notes

- Second config file, not `[env.offline]`: Wrangler bindings are non-inheritable and it warns "ai exists at the top level, but not on env.offline" — an intended omission would look like a mistake and break the zero-warning check.
- Root config's KV `remote = true` only affects `wrangler dev`; production deploys the same namespace id either way. Removing it is the smallest change that makes bare `wrangler dev` stop reading/writing production KV. Workers AI has no local emulation, so the AI binding can only be excluded by config — hence `npm run dev` → offline config.
- Baseline identity deliberately excludes `process.version` (Node differs per machine); the Worker's runtime is workerd, whose version comes from the lockfile.

## Verification

**Commands:**
- `npm ci` -- expected: installs wrangler 4.123.0 exactly.
- `npm run check` -- expected: exit 0; test.mjs green; `test:baseline` green; types identical; dry run with no warnings; baseline verify OK.
- `npx wrangler deploy --dry-run --config wrangler.offline.toml` -- expected: no `env.AI` in bindings.
- `git status --short` after `npm run check` -- expected: clean (no generated files drift).

**Manual checks (if no CLI):**
- `docs/runtime-baseline.md` states the reviewed release-note and compat-flag findings and that no command mutated a remote resource.


## Auto Run Result

**Pass:** 2026-08-17 follow-up review (third review pass on a `done` spec; no re-implementation).

**Summary of implemented change (this pass):** Hardened the runtime-baseline reader and the dry-run config check against three isolation bypasses (dotted-key `[ai]` declarations, top-level `route`/`routes`, and a shadowing `wrangler.json(c)`), made malformed JSON inputs fail by name instead of raw stack, extracted the `check:config` inspection into a unit-tested pure function with a binding-table sanity check, dropped a dead CLI subcommand, and updated the docs.

**Files changed:**
- `scripts/runtime-baseline.mjs` — dotted-key section/remote attribution; top-level `route`/`routes` → `routes` section; `readJson` + guarded baseline parse (`BaselineError`); `SHADOW_CONFIGS` isolation rule; new exported `inspectDryRun`; removed `types-check` subcommand.
- `scripts/check-config.mjs` — delegates output inspection to `inspectDryRun`.
- `scripts/runtime-baseline.test.mjs` — 12 new tests (57 total): dotted keys, route/routes, shadow config, malformed baseline/lockfile JSON, `inspectDryRun` pass/warning/AI-mismatch/no-table.
- `docs/runtime-baseline.md` — Miniflare 5 alpha note; complete isolation-rule list; `inspectDryRun` sanity-check description.

**Review findings breakdown:** 7 patches applied (2 medium, 5 low); 0 items deferred (the 2 pre-existing `deferred` entries are untouched); 25 rejected (low-consequence, fails-closed, or design-as-intended: escaped-quote TOML strings, BOM, spawn timeouts, dirty-tree freeze warning, CRLF, `frozen_from_commit` provenance, spike dry-run, drift-matrix breadth, `npm run check` ordering, etc.). Intent-alignment audit: no divergence beyond the already-documented declaration-vs-executing-toolchain surface, which `check:types`/`check:config` cover inside `npm run check`.

**Follow-up review recommendation:** patched counts high 0, medium 2, low 5 → score 3×2 + 5 = 11 ≥ 5 → `true`.

**Verification performed:**
- `node scripts/runtime-baseline.test.mjs` — 57/57 passed.
- `npm run check` — exit 0: `test.mjs` 31/31, `test:baseline` 57/57, `check:types` OK (generated types match committed), `check:config` OK for both configs (no warnings, `env.AI` present/absent as expected), `baseline:verify` OK (`runtime_identity_sha256 4c9c5206…311b8`, unchanged — identity schema not altered).
- `git status --short` after `npm run check` — only the four patched files modified; no generated-file drift.
- No command deployed or mutated anything remote.

**Residual risks:**
- The hand-rolled TOML reader still fails closed (rather than parsing) on escaped quotes in basic strings and unquoted date scalars; the whole-file hash covers drift regardless.
- Runtime identity is declaration-derived (package.json/lockfile/TOML/committed d.ts); the executing toolchain is checked indirectly via `check:types` and `check:config` inside `npm run check`, not by `baseline:verify` alone.
- Pre-existing deferred item stands: `spikes/judge-fidelity/test.mjs:336` still pins the old `dev` script and needs a human decision.
