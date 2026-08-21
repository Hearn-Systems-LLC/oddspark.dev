---
title: 'Story 1.24: Compatibility Reader Deployment'
type: 'feature'
created: '2026-08-21'
status: 'in-progress'
baseline_commit: '16ac963'
warnings: [oversized]
baseline_revision: '16ac963'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Production runs a pre-1.14 rollback artifact because develop's reader rejects legacy artifacts at presentation (the 2026-08-20 incident). Before any new writer deploys, production needs a reader that serves both the legacy artifacts that exist today and the committed v1 artifacts the assembled writer will produce — otherwise every subsequent release step ships broken.

**Approach:** Add a lossless legacy presentation path (the pre-1.14 view model: headline/premise/question plus provenance rows and the personalized site-context block) alongside the committed-brief presentation boundary, classify at the existing compatibility seam, fail closed on unknown versions, prove the offline preflight (toolchain identity, config isolation, reader-projection identity match, no writer entrypoint, no manifest, dry-run cleanliness, Workers Builds trigger state documented), then deploy the reader artifact under Justin's 2026-08-21 deployment approval. Per Justin's 2026-08-21 ruling, "legacy artifacts still read" means rendered losslessly to visitors; this supersedes Story 1.15's no-legacy-at-presentation boundary for the reader deployment only.

## Boundaries & Constraints

**Always:** Classification stays at `classifyCompatibleArtifact`; legacy values are rendered losslessly from their own fields and are NEVER converted, migrated, or fabricated into a Brief. Committed v1 renders exclusively through the 1.15 presentation boundary. Unsupported/newer artifact versions fail closed (stable 404/502, no metric). Legacy serves record delivery with outcome `normal` (they are real serves, never house). No writer entrypoint, activation manifest, or `PIPELINE_*`/`ACTIVATION_MANIFEST`/`INACTIVE_DOMAIN_WRITER` binding may exist in the deployed configuration. Domain-scope legacy behavior (personalized/fallback) renders through the legacy view model exactly as the pre-1.14 worker did. Gitflow: work merges to `develop` only.

**Ask First:** Any change to closed contract schemas, the committed presentation boundary, coordinator authority, metric names, or wrangler.toml bindings/vars.

**Never:** No new writer activation, no production activation manifest, no schema migration or rewrite of stored artifacts, no remote-resource creation/deletion/reconfiguration, no merge to `main`, no provider calls beyond what the legacy inline generator already performs. Do not edit root `worker.js`, `wrangler.offline.toml`, or `sprint-status.yaml` (except the build-workflow status sync). Do not weaken the 1.16 dispatch contract, the 1.23 assembly, or the neutrality/identity gates.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Legacy local artifact read | `legacy_local` in KV/coordinator | Renders headline/premise/question + provenance, lossless; counts once as normal | N/A |
| Legacy personalized/fallback | `legacy_personalized` / `legacy_fallback` | Legacy view model incl. site-context/warning blocks; no permalink mint beyond legacy behavior | N/A |
| Committed v1 read | `committed_brief` | 1.15 presentation boundary, unchanged | N/A |
| Unknown/unsupported version | malformed or newer `artifact_version` | Stable 404/502; no render, no metric | Fail closed |
| Strike with legacy writer | develop's inline legacy generator | Artifact produced and rendered via legacy path (production parity with rollback artifact) | Coordinator uncertainty stays 502 |
| Preflight | `npm run check` + reader-projection check + dry run | Toolchain identity, config isolation, identity match, no writer/manifest in config, zero remote resources | Any failure blocks deploy |
| Rollback | redeploy pre-1.14 artifact (9946847 / version 025cfac9) | Prior artifact restored, no data change | N/A |

</frozen-after-approval>

## Code Map

- `src/pipeline/receipts.mjs:66-109` — `validLegacySpark` + legacy kinds; the classification seam. Read-only here.
- `src/pipeline/rendering.mjs` — committed-only entry points; do NOT loosen them. Add the legacy presentation as a separate module, e.g. `src/pipeline/legacy-rendering.mjs` (runtime-neutral; join the assembly identity).
- `git show 9946847:src/worker.js` — the legacy view model to reproduce losslessly: `asText` (headline/premise/question + provenance), `page()` DOM slots (`<h1 id="headline">`, `.premise`, `.question`, site-context block, seven provenance `<dl>` rows, seed-formula footer), and personalized `site-summary`/observation/warning rendering. Reproduce fields and structure; adapt into the current shell rather than resurrecting the old file.
- `src/worker.js:1517-1521` (`requireCommittedArtifact`), `:2696` (`/api/spark/:id`), `:2796` (`/s/:id`), `:2715,2825` (home/text strike) — the read-path seams that currently reject legacy; route legacy kinds to the legacy presentation, committed to the 1.15 boundary, else fail closed.
- `src/worker.js:1509-1511` (`recordServed`) — extend outcome detection: legacy kinds count as `normal`; committed house detection unchanged.
- `scripts/assembly-identity.mjs` — `diffIdentity`/`moduleSourcesFromDir`/`computeIdentityFromDir` exports to reuse for the reader-projection check: the modules the reader deploy exercises (contracts, receipts, rendering, legacy-rendering, retention, identity) must hash byte-identical to `runtime-assembly.json` entries.
- `scripts/runtime-baseline.mjs`, `scripts/check-config.mjs`, `package.json:35` — existing preflight gates to compose.
- Protected read-only: `worker.js`, `wrangler.toml` (bindings/vars must stay without writer/manifest entries — verify, don't edit), `wrangler.offline.toml`, `sprint-status.yaml`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/pipeline/legacy-rendering.mjs` — runtime-neutral lossless legacy presentation: `legacySparkJson/text/presentation` (or equivalent) consuming only a `supported` legacy classification from `classifyCompatibleArtifact`; reproduce the pre-1.14 view model's fields and structure; escape everything; never emit Brief fields. Add to the assembly identity (refreeze) with a neutrality-clean module name.
- [ ] `src/worker.js` — route read paths by classification kind: `committed_brief` → 1.15 boundary; `legacy_*` → legacy presentation; otherwise stable 404/502 with no metric. Preserve all 1.16 headers/dispatch behavior, the inactive-domain seam semantics, and render-before-count ordering. Legacy serves count as `normal`.
- [ ] `test.mjs` — named fixtures for every I/O matrix row: legacy local/personalized/fallback rendering losslessness (field-for-field against the stored artifact), committed v1 unchanged, unknown-version fail-closed with zero metric, strike parity with the rollback artifact's observable behavior, and house/normal metric split.
- [ ] `scripts/reader-preflight.mjs` (Node tooling) + `package.json` — one offline preflight composing: runtime-baseline verify, config dry runs, assembly:verify, reader-projection identity match (reader module set ⊆ `runtime-assembly.json`, hashes byte-identical), and a wrangler-config assertion that no writer entrypoint, activation manifest, or `PIPELINE_*`/`ACTIVATION_MANIFEST`/`INACTIVE_DOMAIN_WRITER` binding exists. Wire as `reader:preflight`; do not compose into `check` (it is a release gate, not a commit gate).
- [ ] Deploy under the recorded approval: run preflight, `npx wrangler deploy` from develop, verify production serves both a legacy strike and existing legacy artifacts (200, legacy rendering), and record the deployed version ID in the spec's Auto Run Result. Document the Workers Builds trigger state observed at deploy time. Rollback path: redeploy 9946847 (version 025cfac9 lineage), no data change.

**Acceptance Criteria:**
- Given the candidate reader release, when deployment preflight runs, then toolchain identity, reader acceptance of the legacy shape, lossless read or fail-closed rejection per artifact version, config isolation, reader-projection identity match, absence of any writer entrypoint, and dry-run cleanliness all pass and create no resource.
- Given the deployed reader, when production traffic arrives, then legacy local/personalized/fallback artifacts render losslessly, committed v1 artifacts render through the 1.15 boundary, unsupported versions fail closed without metrics, and no writer or ProductionActivationManifest exists in the deployment.
- Given a deployment rollback, when it executes, then the prior (pre-1.14) artifact is restored without data change.
- Given repository verification, when `npm test` and `npm run check` run, then all offline gates pass with the refrozen assembly identity and no protected-file changes.

## Spec Change Log

## Design Notes

- The legacy path is a READER, not a revival: it renders stored legacy artifacts from their own fields. The 1.15 boundary stands for committed artifacts; the supersession is scoped to this story by explicit human ruling (2026-08-21).
- The reader-projection check is the deployable proof that the candidate's reader modules are exactly the identity-frozen ones — it binds Story 1.23's assembly identity to this release without granting any writer authority.

## Verification

**Commands:**
- `npm test` -- expected: legacy/committed/unknown-version route matrix passes offline.
- `npm run check` -- expected: full offline gate passes with refrozen identity.
- `npm run reader:preflight` -- expected: all preflight checks pass, zero remote mutation.
- `git diff --check` -- expected: clean; no protected-file modifications.
