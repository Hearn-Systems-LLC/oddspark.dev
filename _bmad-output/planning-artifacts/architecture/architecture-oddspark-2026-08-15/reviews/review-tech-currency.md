---
name: review-tech-currency
type: architecture-review
lens: technology currency / web-researched vs. asserted
target: ../ARCHITECTURE-SPINE.md
reviewed: '2026-08-15'
verdict: PASS (with minor findings)
---

# Tech-Currency Review — ARCHITECTURE-SPINE.md

Scope: verify every committed technology claim in the spine's **Stack** table and in the ADs
against live documentation/web sources, and sanity-check architectural claims against the real
code (`src/worker.js`, `wrangler.toml`, `package.json`).

## Verdict

**PASS.** Every named technology exists, is current, and fits the role the spine assigns it.
Versions and defaults cited in the spine match the live state of the platform. Two minor
staleness notes and two low-severity fit caveats below; none block the spine.

## Verified claims

| Spine claim | Result | Source |
| --- | --- | --- |
| Workers AI `@cf/openai/gpt-oss-120b` (primary) | Confirmed — live on Workers AI since 2025-08-05; positioned "for production, general purpose" | [Cloudflare blog](https://blog.cloudflare.com/openai-gpt-oss-on-workers-ai/), [model docs](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/) |
| Workers AI `@cf/openai/gpt-oss-20b` (fallback) | Confirmed — live; positioned "for lower latency, agentic tasks" | [Workers AI models](https://developers.cloudflare.com/workers-ai/models/) |
| 10,000 free neurons/day allocation (AD-9 / NeuronMeter premise) | Confirmed — free tier is 10K neurons/day, shared across models | [model pricing note](https://www.ayautomate.com/free-models/cloudflare-workers-ai-cf-openai-gpt-oss-120b) |
| Compatibility flag `global_fetch_strictly_public` | Confirmed — real, publicly documented, usable | [compatibility flags docs](https://developers.cloudflare.com/workers/configuration/compatibility-flags/), [cfdata.lol workerd](https://cfdata.lol/workerd/) |
| `remote = true` on `[ai]` and `[[kv_namespaces]]` (wrangler.toml) | Confirmed — remote bindings GA since Wrangler v4.37.0 (2025-09), current syntax is `remote: true` | [remote bindings GA changelog](https://developers.cloudflare.com/changelog/post/2025-09-16-remote-bindings-ga/), [Cloudflare blog 2026-07-22](https://blog.cloudflare.com/cloudflare-developer-platform-keeps-getting-better-faster-and-more-powerful/) |
| wrangler 4.x (`^4.114.0` in package.json) | Confirmed — 4.x is the current major; latest is 4.120.0 (published 2026-08-13). Project pin is 6 patch releases behind latest — effectively current | [npm wrangler](https://www.npmjs.com/package/wrangler) |
| Durable Objects SQLite via `new_sqlite_classes` migrations (v1/v2) | Confirmed — matches code: `NeuronMeter` (worker.js:641), `SparkCoordinator` (worker.js:661), migrations v1/v2 in wrangler.toml | project code |
| AD-4 "existing verification at src/worker.js:886" | Mostly confirmed — substring grounding lives at `src/worker.js:889-890` (`page.text.includes(...)`); line cite is off by ~3 but the mechanism exists exactly as described | project code |
| AD-6 seam (`generate` / `generatePersonalized`, `modelFor` + NeuronMeter) | Confirmed — `modelFor` at worker.js:790, `generate` at :796, `generatePersonalized` at :911; spine's preservation seam matches reality | project code |

## Findings

### F1 — LOW: compatibility_date 2026-07-01 is past its freshness window

Valid date (in the past relative to today, 2026-08-15), but wrangler emits a
"compatibility date is more than 30 days old" warning once the date lags the current wrangler
release. 2026-07-01 is ~45 days stale against wrangler 4.120.0. Cosmetic, but the spine treats
the date as a pinned decision; expect a deploy-time nag and consider bumping to a 2026-08 date
at implementation time. The flag `global_fetch_strictly_public` itself is unaffected.

### F2 — LOW: judge "temperature ≈ 0" and structured verdict JSON on gpt-oss are not confirmed model capabilities

AD-2 commits the judge to a structured JSON verdict at near-zero temperature. The gpt-oss
models on Workers AI are OpenAI open-weight *reasoning* models; the spine was written as if
temperature control and reliable JSON-schema output are given. Model docs confirm the models
and their roles but the review could not confirm from public docs that gpt-oss-120b on Workers
AI honors `temperature` and emits schema-conformant JSON reliably (reasoning models are
notoriously loose on both). Mitigation already exists in the spine (AD-3 house-Brief fallback,
AD-9 graceful degradation), but judge-output parsing should be treated as a build-time
validation item, not an assumption. Recommend: add to Deferred — "verify temperature/JSON-mode
behavior of `@cf/openai/gpt-oss-120b` during judge calibration."

### F3 — LOW: wrangler pin `^4.114.0` vs latest 4.120.0

Spine says "wrangler 4.x (project lockfile)" — accurate and safe. Noted only so the record
shows the pin was checked against latest, not asserted: 4.114.0 is recent (within ~2 weeks of
latest). Note also wrangler ≤4.59.0 carried CVE-2026-0933 (OS command injection); project is
well clear of it. No action.

### F4 — INFO: no unconfirmed or hallucinated technologies

Every other named item — Workers KV, Durable Objects (SQLite), Workers AI neuron budgeting,
`[assets]`, `[observability]`, `preview_urls`, custom-domain `[[routes]]` — is either confirmed
against live Cloudflare docs or matches the project's own working `wrangler.toml`. The spine's
architectural claims (line numbers, seam functions, DO classes, KV key scheme) were
cross-checked against `src/worker.js` and hold, with only the ~3-line drift noted above
(:886 → :889).

## Recommendation

Adopt the spine as-is. Optionally record F2 in the spine's Deferred list so judge calibration
includes a live model-behavior check rather than assuming temperature/JSON fidelity.
