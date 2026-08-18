# Course-Correction Architecture Rubric Review

**Artifact:** `ARCHITECTURE-SPINE.md`  
**Review lens:** Good-spine checklist  
**Date:** 2026-08-16  
**Verdict:** **CHANGES REQUIRED** — the composite Gate and staged model qualification are internally strong, but the spine is not yet a safe build substrate. One privacy invariant is incomplete, and several brownfield seams can still be implemented incompatibly.

## Gate result

- Deterministic lint: **PASS**, 0 findings.
- Real divergence points: **FAIL** — domain-artifact exposure/retention, persisted artifact compatibility, local atomic commit semantics, runtime qualification enforcement, and analytics semantics remain open or contradictory.
- AD enforceability: **PARTIAL** — AD-1 through AD-5, AD-9, and most of AD-11 are testable; AD-7, AD-8, and the production-enforcement portion of AD-11 need stronger rules.
- Deferred safety: **FAIL** — KV TTL hygiene is deferred even though bounded retention is part of the website-mode privacy contract.
- Brownfield fit: **FAIL** — the current local path has no coordinator claim, the public JSON route accepts personalized IDs, current cached values use the legacy Spark envelope, and branch preview URLs share remote bindings unless explicitly isolated.
- Capability coverage: **PARTIAL** — the four product capabilities are represented, but CAP-2's ephemerality and CAP-4/SM measurement mechanics are not fully governed.
- Operational envelope: **FAIL** — preview isolation, schema migration in both directions, rollback, and deployed qualification-manifest enforcement are absent.
- Named technology currency: **PASS with qualification** — the repository pins Wrangler 4.114.0 and compatibility date 2026-07-01; current Cloudflare documentation supports the configured Worker/KV/Durable Object/observability patterns and exposes both named gpt-oss model IDs. This does not establish structured-output fidelity for either model, which AD-11 correctly requires the stories to prove.

## Critical findings

### C1 — Website-grounded artifacts can remain publicly readable and indefinitely retained

**Evidence**

- The canonical spec forbids public persistence or broader exposure of website-grounded material (`SPEC.md:42-48`; PRD FR-9).
- AD-7 only prohibits `/s/:id`; it does not prohibit `/api/spark/:id` for `p-...` identifiers (`ARCHITECTURE-SPINE.md:94-98`).
- The Structural Seed likewise removes only domain-mode `/s/:id` (`ARCHITECTURE-SPINE.md:160-163`).
- The existing router accepts every ID matching `SPARK_ID_RE` on `/api/spark/:id` and returns the stored JSON (`src/worker.js:2440-2446`).
- The existing domain path stores the personalized artifact and pointer (`src/worker.js:1227-1230`).
- `KV TTL hygiene` is deferred as a cleanup concern (`ARCHITECTURE-SPINE.md:186`), even though bounded website-artifact retention is a privacy property, not generic hygiene.

**Why this blocks the gate**

Two story implementers can both comply with the written spine while one leaves `p-...` results retrievable from the public JSON route and/or retained indefinitely. That violates the product's backstage-research and ephemeral-domain requirements.

**Required disposition: autofix before handoff**

Amend AD-7 (and the Structural Seed) to require all public read paths to reject domain-mode IDs/artifacts, including `/api/spark/:id`, and set explicit maximum TTLs for the domain Brief, `pw:` pointer, evidence/profile records, and coordinator commit record. State whether expired internal records are deleted, become unreadable, or both. Keep the public local-mode receipt behavior separate.

## High findings

### H1 — The persisted artifact envelope and mixed-version migration rule are not defined

**Evidence**

- AD-5 defines a `Brief` object, while the current renderers and cache consume a larger Spark object containing `idea`, seed, window, entropy, and solar provenance (`ARCHITECTURE-SPINE.md:68-86`; `src/worker.js:1269-1304`).
- AD-7 refers to a “versioned Brief artifact,” and the Structural Seed says “Brief schema stored,” without deciding whether KV stores a bare Brief or a versioned Spark envelope (`ARCHITECTURE-SPINE.md:94-98, 160-161`).
- The operational note claims old renderers reject newer versions (`ARCHITECTURE-SPINE.md:187`), but the currently deployed renderer has no such version check and directly dereferences the legacy shape.
- Existing `w:`, `pw:`, profile, and artifact keys can contain legacy objects when the new Worker starts; a rollback can likewise make an old Worker encounter a new object.

**Why this blocks the gate**

The object crossing KV, coordinator, API, HTML, and text-renderer boundaries is a core divergence point. The current forward-only version statement cannot protect either deploy direction.

**Required disposition: discuss, then autofix**

Define one persisted envelope, for example `SparkArtifact { artifact_version, brief, seed, window, entropy, solar, provenance, ... }`, and state which version each reader accepts. Define deploy and rollback behavior for legacy cached values and new values: versioned key namespace, dual reader, cache miss/regenerate, or another explicit strategy. Do not rely on an old binary to reject a version field it was never written to inspect.

### H2 — AD-7 requires atomic local commits but forbids the coordinator change needed to make them real

**Evidence**

- AD-7 requires every local seed-window result to use COORD claim/commit and says concurrent strikes converge (`ARCHITECTURE-SPINE.md:94-98`).
- The current local `buildSpark` path performs independent KV reads and writes with no coordinator claim (`src/worker.js:1246-1305`).
- The existing coordinator claim key is domain-specific; “as today” applies only to `buildDomainSpark`, which calls `acquireDomainClaim` (`src/worker.js:1132-1148`).
- AD-7 simultaneously says the only Durable Object change is `/commit` validation and the ID pattern (`ARCHITECTURE-SPINE.md:98`; Structural Seed line 162).

**Why this blocks the gate**

KV alone cannot provide the stated first-writer convergence. One implementer may add a local coordinator key/operation; another may keep the current racy KV pattern because the spine forbids other DO changes.

**Required disposition: autofix**

Choose and bind the local claim identity and coordinator behavior (for example `local:<round>` using the existing claim/commit operations with an explicit mode discriminator), including lease, house-Brief commit, loser resolution, and failure fallback. Update the AD-6 carve-out so this required coordinator behavior is allowed.

### H3 — AD-11 defines qualification evidence but not the deploy/runtime enforcement mechanism

**Evidence**

- AD-11 correctly freezes structural and semantic identities and says production requires every applicable stage current (`ARCHITECTURE-SPINE.md:118-122`).
- Verification says retained evidence is bound to exact identities (`ARCHITECTURE-SPINE.md:132`).
- Neither rule defines the production authority that maps the deployed provider/model/prompt/schema/adapter/runtime to the approved evidence, nor the check that disables a mismatched role before a call.

**Why this blocks the gate**

“Current” can be interpreted as a manual release checklist, an environment flag, a source constant, or a verified manifest. Those choices have different failure behavior, and a configuration drift can otherwise reach a live call despite stale evidence.

**Required disposition: autofix**

Add an immutable qualification manifest/hash per role and fallback, define its authoritative storage and deploy input, and require the running selector to compare its self-reported structural/semantic identities against the approved manifest before reserving or invoking a model call. Missing or mismatched manifests must select the house Brief and emit an operational diagnostic. Specify the release check that makes “production disabled” enforceable.

### H4 — The preview/deploy operational envelope does not isolate production state

**Evidence**

- The spine says “single existing production Worker,” “no new environments,” and treats operations as decided (`ARCHITECTURE-SPINE.md:187`).
- The checked-in Wrangler config enables shareable preview URLs and configures Workers AI and SPARKS as remote bindings (`wrangler.toml:15-24, 56-58`), plus shared Durable Object bindings (`wrangler.toml:26-41`).
- The correction changes stored artifact shapes, coordinator validation, counters, and model-role configuration.

**Why this blocks the gate**

A branch preview or manual validation can plausibly mutate the same KV/DO state later read by production. The spine also provides no canary, rollback, cache quarantine, or post-deploy checks for a schema-changing release.

**Required disposition: discuss**

Bind one safe operational policy: either previews are read-only/offline for stateful routes, use isolated preview namespaces/DOs, or are prohibited for this feature. Add deploy order, migration/rollback behavior, smoke checks, and observability signals for gate failure, house-Brief rate, deadline exhaustion, qualification mismatch, and commit conflict.

### H5 — AD-8 cannot produce the measurements it claims without defining counter and deduplication semantics

**Evidence**

- AD-8 binds SM-1, SM-2, and SM-3 but defines only daily KV counts for strikes, fallbacks, and invitations (`ARCHITECTURE-SPINE.md:100-104`).
- SM-1 is a percentage of rendered Briefs whose invitation is acted on; SM-3 counts actual inbound conversations referencing a Spark. A cheer click is not a conversation.
- Server-side KV read-modify-write is not inherently an atomic counter, and the spine does not assign mutation ownership or define lost-update tolerance.
- “No per-visitor keys” leaves deduplication undefined. Per-artifact idempotency would undercount multiple visitors sharing the same committed local artifact; no idempotency makes retries double-count.

**Why this blocks the gate**

Independent implementations can report materially different rates while all using the named keys. SM-3 is not measured at all by the proposed endpoint.

**Required disposition: discuss or narrow the claim**

Define the event denominator, click semantics, duplicate/retry policy, counter consistency requirement, and mutation owner. Remove SM-2/SM-3 from AD-8 unless a real collection method is specified; sampled gate review and CRM/inbound attribution may remain separate manual measures. If the counters are intentionally approximate, say so and prohibit interpreting them as exact unique-user conversion.

## Medium findings

### M1 — The capability map understates shared rules

CAP-1 and CAP-2 rows omit the Gate, Brief schema, cost/deadline, and qualification ADs that every generated result depends on (`ARCHITECTURE-SPINE.md:166-175`). Expand the map so downstream story planning does not treat AD-2/AD-5/AD-9/AD-11 as CAP-3-only concerns. CAP-2 should explicitly include public-read blocking and retention once C1 is resolved.

### M2 — The Evidence Bundle leaves provenance shape implicit

AD-4 says every business-specific claim must trace to the bundle, but the website bundle contains arrays of strings and one observation rather than stable evidence item IDs/source spans (`ARCHITECTURE-SPINE.md:62-66`). `scanned_urls` alone cannot bind a capability or channel inference to source text. Add a typed evidence-item/provenance representation or explicitly state that only the single verified observation may ground business-specific claims. Otherwise two grounding modules can legitimately choose incompatible trace semantics.

### M3 — “Mechanically decidable PII” is not a closed contract

AD-2/AD-4 fail closed but do not enumerate the deterministic classes, canonicalization order, or stable reason taxonomy (`ARCHITECTURE-SPINE.md:50-54, 62-66`). Story 1.5 owning the implementation is good, but the feature-level spine should bind either a closed detector contract/version or the authority artifact that owns it. This is especially important because `unknown` rejects and therefore directly affects retry/cost/fallback behavior.

## AD-by-AD enforceability audit

| AD | Result | Review |
| --- | --- | --- |
| AD-1 | Pass | Clear reachability invariant; house Brief exception is explicit. |
| AD-2 | Pass | Canonical verdict, candidate reference, adapter limits, and fail-closed outcomes are executable and testable. |
| AD-3 | Pass | Ledger arithmetic and fallback outcome are deterministic. House content is safely launch-gated. |
| AD-4 | Partial | Single grounding owner and downgrade threshold are strong; evidence provenance and PII detector authority remain underspecified (M2/M3). |
| AD-5 | Partial | Brief field contract is clear, but the stored/rendered outer artifact is not (H1). |
| AD-6 | Partial | Brownfield seam matches the single-file Worker, but its DO carve-out contradicts AD-7's local atomicity requirement (H2). |
| AD-7 | Fail | Does not enforce all domain read/retention boundaries and cannot be implemented atomically under its stated DO limitation (C1/H2). |
| AD-8 | Fail | Named counters do not define accurate or compatible measurement semantics (H5). |
| AD-9 | Pass | Pre-invocation charging, pair reservation, deadline behavior, and fail-closed fallback are enforceable. |
| AD-10 | Pass | Interaction boundary is clear; route-internal privacy changes do not add UI surface. |
| AD-11 | Partial | Qualification criteria are rigorous; production binding/enforcement is missing (H3). |

## Deferred audit

### Safe to defer with the stated gates

- Judge prompt content and semantic calibration: safe because production is blocked by Story 1.13.
- Judge provider/model recovery: safe because the role remains disabled and one-attempt governance is explicit.
- Voice goldens and launch readiness: safe because the launch gate is explicit.
- House Brief content: safe if no deployment occurs until authored and reviewed.
- `/how` copy and renderer layout: safe as content/layout details, provided launch acceptance covers all output formats.

### Unsafe or incomplete to defer

- KV TTL hygiene: unsafe for website-grounded artifacts; move its privacy-relevant portion into AD-7 (C1).
- Operational envelope: not truly decided. Preview isolation, schema coexistence, rollout, rollback, and alerting need binding rules (H1/H4).
- CORS and `/api/meter`: may remain cleanup only if Story 1.1's current guards are treated as inherited and tested constraints; otherwise the new `/api/cheer` route needs an explicit same-origin/abuse posture before implementation.

## Brownfield fit summary

The chosen single-file, banner-section, pure-function structure ratifies the repository. Existing seams named in the spine are real: `buildSpark`, `buildDomainSpark`, `generate`, `generatePersonalized`, `normalizeSpace`, COORD, METER, KV pins, and the three renderers. The primary mismatches are behavioral rather than organizational:

1. local caching currently has no atomic coordinator path;
2. personalized artifacts are currently readable through the public JSON route;
3. current persisted values use a legacy Spark envelope with no top-level version guard; and
4. configured preview URLs can exercise remote state.

Those mismatches are repairable without changing the paradigm, but they must be explicit architecture work rather than left to independent stories.

## Capability and operational coverage summary

- CAP-1: covered after the local atomic-commit and artifact-envelope rules are fixed.
- CAP-2: functionally covered, but privacy/ephemerality is not yet guaranteed.
- CAP-3: strongly covered by AD-1/2/3/9/11; this is the best-resolved portion of the spine.
- CAP-4: schema and CTA are covered; measurement and persisted/rendered envelope need correction.
- Deployment/environment/provider strategy: provider selection is safely gated; environment/state isolation and rollout/rollback are not.
- Operations: platform logs are named, but actionable diagnostics, alert signals, counter consistency, and qualification-drift enforcement are missing.

## Recommended gate disposition

Resolve C1 and H1-H4 before treating the spine as final or starting stateful production implementation. H5 should be resolved before analytics work begins. M1-M3 can be fixed in the same architecture update without changing the approved product direction. No product pivot or new epic is required.
