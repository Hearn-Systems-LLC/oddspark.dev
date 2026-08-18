---
name: review-course-correction-tech-currency
type: architecture-review
lens: technology currency / official documentation / project reality
target: ../ARCHITECTURE-SPINE.md
reviewed: '2026-08-16'
verdict: CHANGES REQUIRED
---

# Course-Correction Technology-Currency Review — ARCHITECTURE-SPINE.md

## Scope and method

This review checks every committed named platform, model, version, and provider assumption in the corrected architecture spine against current Cloudflare documentation and the checked-out project. It does not approve provider calls, implementation, deployment, or a provider change.

Evidence used:

- current official Cloudflare Workers, Workers AI, Workers KV, Durable Objects, Wrangler, and AI Gateway documentation fetched on 2026-08-16;
- `package.json`, `package-lock.json`, `wrangler.toml`, and the relevant `src/worker.js` storage/provider seams;
- `npm view wrangler version`, local `npx wrangler --version`, and a local-only `wrangler deploy --dry-run` (no upload or remote mutation).

## Verdict

**CHANGES REQUIRED.** The selected platform and model identifiers are real, the corrected judge-qualification caution is current, and the existing SQLite Durable Object declarations remain valid. Two architecture claims are not supportable as written on Workers KV, and the live Wrangler configuration does not currently enable preview URLs as its comment claims. Those issues should be resolved before implementation handoff. The remaining findings are non-blocking currency and operational clarifications.

## Verification matrix

| Committed item | Current result | Ruling |
| --- | --- | --- |
| Cloudflare Workers compatibility date `2026-07-01` | Valid and accepted by Wrangler 4.114.0. Cloudflare recommends periodically moving to a current date, but older dates remain supported. | Supported, intentionally stale; retain the deferred bump or update after regression testing. |
| `global_fetch_strictly_public` | Current documented compatibility flag. It forces global `fetch()` through the public Internet/front door, including fetches to the Worker's own zone. | Supported; retain and test same-zone scanning behavior. |
| `@cf/openai/gpt-oss-120b` and `@cf/openai/gpt-oss-20b` | Both remain Cloudflare-hosted Workers AI text-generation models and are present in the current catalog. | Supported as generation candidates, subject to Story 1.7 as stated. |
| Workers AI JSON Mode on the gpt-oss pair | Cloudflare's current JSON Mode support list still does **not** list either gpt-oss model, and Cloudflare explicitly says schema conformance is not guaranteed even for JSON Mode. Model pages expose a generic `response_format` field, but that is not proof of supported or reliable schema fidelity. | The spine's Story 1.2 `NO-GO`, unset recovery pair, and mandatory live qualification are current and correctly conservative. |
| Workers AI native binding | `[ai] binding = "AI"` and `env.AI.run(model, input)` are current. Workers AI access is remote and metered even during local development. | Supported; see Finding 4 for the operational guardrail. |
| Workers AI neuron budget | Current pricing retains 10,000 free Neurons/day and bills excess usage on paid plans; the two gpt-oss models have current neuron/token rates. | `NeuronMeter` remains a valid application-side guard, but provider/dashboard usage is the billing authority. |
| External provider / AI Gateway | AI Gateway can be accessed through the Workers AI binding and can route Workers AI and third-party models, but it changes provider, credentials, telemetry, pricing, and response contracts. | The spine correctly requires a separate security/operational decision; no external provider is currently committed. |
| Workers KV `SPARKS` | The binding and existing namespace id match `wrangler.toml`. KV remains eventually consistent and does not provide atomic read-modify-write. | Supported for cached artifacts; insufficient alone for the exact counter and immediate-global-receipt claims in Findings 2–3. |
| SQLite Durable Objects | `NeuronMeter` and `SparkCoordinator` match bindings and `new_sqlite_classes` migrations v1/v2. SQLite is required/recommended for new namespaces, and its KV storage API remains supported. | Supported. The existing legacy migrations format remains valid, although Cloudflare now prefers declarative `exports` for new projects. No migration is required solely for currency. |
| Wrangler `^4.114.0` | Manifest range and lockfile both resolve locally to 4.114.0. The npm registry reports 4.123.0 current on 2026-08-16. | Valid but nine patch releases behind; see Finding 5. |
| Static assets, custom domain, observability | `[assets]`, `[[routes]] custom_domain = true`, and `[observability] enabled = true` are current configuration forms and the dry-run recognizes their bindings/assets. | Supported. |
| Preview URLs | `preview_urls` is a top-level Wrangler key, but TOML table scope places the project setting under `[observability]`. Wrangler 4.114.0 warns that `observability.preview_urls` is unexpected. | Not configured as intended; Finding 1. |

## Findings

### F1 — HIGH: `preview_urls` is in the wrong TOML scope

`wrangler.toml:53-58` opens `[observability]` and then assigns `preview_urls = true`. In TOML, that property remains inside the observability table; comments do not return to the root. Current Wrangler documents `preview_urls` as a top-level-only key, and the project's pinned CLI reports:

> Unexpected fields found in observability field: "preview_urls"

The dry-run otherwise bundles successfully, so this is precise configuration drift rather than a general Workers incompatibility. Move `preview_urls = true` above the first table declaration (for example, beside `compatibility_flags`) if per-version preview URLs remain part of the operational envelope. Do not claim that Workers Builds receive them until a version upload confirms the resulting URL.

Official source: [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/).

### F2 — HIGH: AD-8's exact aggregate counters are not implementable as plain KV counters

AD-8 says `m:<day>:strikes`, `m:<day>:fallbacks`, and `m:<day>:invitations` are KV counters incremented once per event. Workers KV is eventually consistent, has no atomic read-modify-write transaction, and concurrent writes to a shared key can overwrite one another. A naive read/increment/write implementation therefore cannot substantiate `incremented once` or produce exact SM-1/SM-2/SM-3 measurements.

Choose one explicit mechanism before Story 2.3 implementation:

1. make COORD (or a dedicated analytics Durable Object) the atomic writer/authority and use KV only as a read cache/export; or
2. write one immutable, collision-resistant event key per aggregate event and define a bounded aggregation process; or
3. explicitly downgrade these to approximate counters and make the success-metric interpretation tolerate loss.

The first option best matches the spine's existing rule that cross-request coordination lives in a Durable Object. It is an architecture amendment, because AD-6 currently permits no additional DO change beyond AD-7.

Official source: [How Workers KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/), [Write key-value pairs](https://developers.cloudflare.com/kv/api/write-key-value-pairs/).

### F3 — HIGH: AD-7 overstates immediate global receipt visibility through KV

AD-7 promises that all later requests in a window serve the committed artifact. COORD can serialize and preserve the authoritative claim, but `w:` / `pw:` pointers and artifacts stored in KV are eventually consistent: another location may see an old value or a cached negative lookup for 60 seconds or more. The current domain flow mitigates this by returning the committed artifact from `SparkCoordinator`, but the spine's general local-mode `w:` flow and `Commit -> KV -> Render` diagram do not specify an authoritative DO read after a KV miss.

To preserve the strong `committed-artifact reproducibility` claim, require each cache miss/stale pointer to consult the authoritative COORD receipt (which must contain or resolve the committed Brief) before generating. Alternatively, narrow the product claim to eventual convergence. Production verification alone cannot turn an eventually consistent KV read into a guaranteed immediate-global invariant.

Official source: [How Workers KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/). Project reality: `SparkCoordinator` already uses strongly consistent storage for domain claims, while `buildSpark` reads and writes the local-mode `w:` pointer directly in KV.

### F4 — MEDIUM: local development can make metered Workers AI calls

Current Wrangler documentation states that Workers AI always accesses the Cloudflare account and incurs usage even during local development. The project has `[ai] remote = true`, and `npm run dev` serves the normal routes that can reach generation. The architecture correctly requires fresh approval for credentialed live qualification, but that rule is not yet enforced by configuration or routing.

Before implementation work begins, define an offline-default development guard: a disabled/mock AI binding, an explicit live-test configuration, or an environment flag that fails closed before `env.AI.run`. The existing spike's separate live command is the right pattern. This avoids accidental calls without changing the approved one-matrix authority.

Official source: [Wrangler configuration — AI binding](https://developers.cloudflare.com/workers/wrangler/configuration/), [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/).

### F5 — LOW: compatibility and Wrangler pins are valid, not current-latest

The stack table accurately reports project reality, but `2026-07-01` is 46 days behind the review date and Wrangler 4.114.0 is nine patch releases behind the live npm registry's 4.123.0. Cloudflare recommends keeping compatibility dates and Wrangler current, while supporting older compatibility dates indefinitely.

Treat both changes as tested maintenance, not automatic edits during Story 1.2. Upgrade Wrangler first, run the complete local suite and dry-run, then separately advance the compatibility date while reviewing intervening flags. The architecture's Deferred item already acknowledges the compatibility-date bump; it should also record the Wrangler update and the preview-key validation.

Official source: [Compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/), [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/). Project/registry evidence: lockfile 4.114.0; `npm view wrangler version` returned 4.123.0 on 2026-08-16.

### F6 — INFO: the corrected judge/provider posture is technologically current

The spine no longer assumes that the generation models can act as production judges. Its separation of deterministic validation, provider-wire fidelity, canonical mapping, candidate binding, semantic calibration, and full-pair latency is consistent with the current provider uncertainty. The two gpt-oss identifiers remain valid, but neither appears in Cloudflare's current JSON Mode supported-model list and JSON-schema compliance is not guaranteed. Keeping the recovery pair unset until a separately approved, bounded qualification run is the correct conclusion.

Official source: [Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/), [Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/), [gpt-oss-120b](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/), [gpt-oss-20b](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/).

## Required architecture corrections before implementation handoff

1. Correct `preview_urls` to top-level configuration and verify the warning disappears on the selected Wrangler version.
2. Amend AD-8 to name an atomic/append-only analytics mechanism, or explicitly classify the counters as approximate.
3. Amend AD-7 so a KV miss/stale read consults the authoritative COORD receipt, or narrow the receipt guarantee to eventual convergence.
4. Add an offline-default guard for development and preserve a separately invoked, freshly approved live configuration.
5. Record Wrangler 4.123.0 and a compatibility-date bump as tested maintenance decisions, not implicit Story 1.2 prerequisites.

## Authority conclusion

No provider probe was needed or performed for this review. The platform and documentation evidence is sufficient to identify the architecture gaps. Fixing the planning/configuration findings does not authorize the Story 1.2 live recovery matrix, an external provider, AI Gateway, deployment, commit, or push.
