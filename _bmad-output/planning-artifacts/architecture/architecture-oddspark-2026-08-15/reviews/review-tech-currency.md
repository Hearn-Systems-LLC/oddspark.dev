---
name: review-tech-currency
type: architecture-review
lens: technology currency / documented vs asserted
target: ../ARCHITECTURE-SPINE.md
reviewed: '2026-08-19'
verdict: PASS — PRIOR FINDINGS CLOSED
---

# Tech-Currency Review — ARCHITECTURE-SPINE.md

## Verdict

**PASS WITH MATERIAL CORRECTIONS.** The newly selected Workers AI candidate pair is real, current, and explicitly listed by Cloudflare for JSON Mode. The spine correctly refuses to infer schema fidelity from that listing and keeps both models subject to independent generation and judge qualification. The architecture therefore has a technologically credible next course without changing provider.

Two checked-out-state assertions are stale: the Wrangler version recorded in the Stack/Deferred text and the claim that `preview_urls` is still nested under `[observability]`. These should be corrected before the spine is treated as the exact source for fresh qualification-plan identities. The deployed/runtime model variables also still name the prior gpt-oss pair; that is safe before qualification but should be stated as current implementation state rather than left implicit.

## Evidence and method

- Current Cloudflare Workers AI documentation was fetched through Context7 from Cloudflare's official documentation corpus.
- Current Workers SDK configuration documentation was fetched through Context7 from the official `cloudflare/workers-sdk` repository.
- Repository reality was checked against `package.json`, `package-lock.json`, `wrangler.toml`, and a non-deploying `npx wrangler deploy --dry-run`.
- Registry currency was checked with `npm view wrangler version` on 2026-08-19.

## Verified technology claims

| Spine claim | Verdict | Evidence |
| --- | --- | --- |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` supports Workers AI JSON Mode | Confirmed | Cloudflare's current JSON Mode documentation lists the exact model ID. |
| `@cf/meta/llama-3.1-8b-instruct-fast` supports Workers AI JSON Mode | Confirmed | Cloudflare's current JSON Mode documentation lists the exact model ID. |
| JSON Mode support is not proof of closed-schema fidelity | Confirmed | Cloudflare warns that models may fail the requested JSON Schema and return `JSON Mode couldn't be met`; streaming is unsupported. The spine's mandatory live qualification remains necessary. |
| Compatibility date `2026-07-01` plus `global_fetch_strictly_public` is accepted by the checked-out runtime toolchain | Confirmed operationally | Wrangler 4.123.0 completed a dry-run without a configuration or compatibility-flag warning. |
| AI, KV, SQLite Durable Objects, assets, custom domain, and observability forms remain accepted | Confirmed operationally | The same dry-run resolved `AI`, `SPARKS`, `NeuronMeter`, and `SparkCoordinator`, read assets, and bundled successfully. Official Workers SDK templates continue to use `new_sqlite_classes`, `durable_objects.bindings`, and `observability`. |
| Candidate selection does not activate production use | Confirmed by repository state | `wrangler.toml` still supplies the prior gpt-oss IDs. This is safe while the selected pair is only a governed qualification candidate. |

Official documentation: [Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/), [Workers AI documentation corpus](https://developers.cloudflare.com/workers-ai/), and [Workers SDK](https://github.com/cloudflare/workers-sdk).

## Findings

### F1 — MEDIUM: the Wrangler Stack and maintenance assertions are stale

The Stack says `wrangler | ^4.114.0 (project lockfile)` and Deferred says the project lock remains `^4.114.0` while 4.123.0 is current. Checked-out reality is now different:

- `package.json` specifies `4.123.0`, not `^4.114.0`;
- `package-lock.json` resolves 4.123.0;
- the dry-run reports Wrangler 4.123.0;
- the npm registry reports 4.124.0 current on 2026-08-19.

This matters because AD-11 binds qualification evidence to the exact runtime/version and makes later runtime changes transitively stale. A plan derived from the spine could freeze the wrong version before making any calls.

**Required correction:** record checked-out Wrangler `4.123.0` in the Stack and update the maintenance note to say 4.124.0 is available. Story 1.2 should still decide whether to retain 4.123.0 or upgrade and then freeze the reviewed exact version before qualification; this review does not authorize an upgrade.

### F2 — MEDIUM: the `preview_urls` maintenance claim describes an already-corrected defect

Deferred says the current `preview_urls` placement is under `[observability]` and must be corrected. In the current `wrangler.toml`, `preview_urls = true` is top-level, before `[vars]`; `[observability]` contains only `enabled = true`. Wrangler's generated schema likewise defines `preview_urls` as an environment/top-level property, not an Observability property, and the dry-run emits no unexpected-field warning.

**Required correction:** remove the stale claim that placement still needs correction. Keep preview isolation itself subject to verification before relying on it; configuration validity is not proof of resource isolation or production safety.

### F3 — LOW: distinguish approved candidate configuration from current Wrangler runtime variables

The Stack accurately labels the Llama pair as generation/judge **candidates**, and AD-11 withholds live and production authority. However, the Consistency Convention says model IDs are Wrangler vars while current `wrangler.toml` still names `@cf/openai/gpt-oss-120b` and `@cf/openai/gpt-oss-20b`. A reader could mistake the Stack for current runtime configuration.

**Required clarification:** state that the Llama pair is frozen for separately approved qualification planning only and that production/default Wrangler vars remain unchanged until a later implementation and activation gate. Do not update production/default variables merely to reconcile this planning document.

### F4 — INFO: the Llama candidate decision is technologically current but remains empirical

Cloudflare's current list includes both exact selected model IDs among nine JSON Mode models. Cloudflare also states that JSON Schema compliance is not guaranteed. The previous gpt-oss structural failures therefore do not predict failure or success for this pair, and documentation support must not be converted into qualification evidence.

The spine handles this correctly: exact IDs are pinned, generation and judge qualify independently, schemas and repair prohibitions remain unchanged, and no call is authorized by architecture approval. No correction is required.

### F5 — LOW: compatibility date is valid but should be re-frozen with Story 1.2

`2026-07-01` is valid and accepted by the current checked-out Wrangler, but it is approximately seven weeks behind the review date. That is not itself an incompatibility. Because AD-11 treats the compatibility date and runtime configuration as evidence identity, Story 1.2 should explicitly review and freeze it alongside Wrangler before any new qualification. Advancing it later would invalidate affected evidence under the spine's own rules.

## Conclusion

The architecture's new model course is current and credible. Correct F1 and F2 before deriving exact qualification plans; clarify F3 so no one treats candidate selection as a production configuration edit. None of these corrections authorizes model calls, configuration mutation, deployment, activation, commit, or push.

## Closure re-review — 2026-08-19

**Verdict: PASS.** The amended spine closes every prior technology-currency finding. No critical, high, or medium finding remains.

| Prior finding | Closure evidence | Status |
| --- | --- | --- |
| F1 — stale Wrangler baseline/current release | Stack now records reviewed baseline 4.123.0; Deferred records 4.124.0 as the available release and requires Story 1.2 to re-freeze the exact runtime before either matrix. | Closed |
| F2 — stale `preview_urls` placement claim | Operational envelope now states that `preview_urls` is already top-level and that no placement correction is pending. | Closed |
| F3 — candidate/runtime ambiguity | Workers AI qualification text now states that runtime configuration retains the prior gpt-oss IDs until a separately reviewed offline adapter/config change; architecture selection alone does not mutate configuration. | Closed |
| F5 — compatibility/runtime baseline refreeze | AD-11 and Wrangler maintenance now expressly bind both matrices to a freshly reviewed exact Wrangler version, compatibility date, generated bindings, and runtime configuration. | Closed |

The Llama primary/fallback model claim remains current under the official Cloudflare JSON Mode documentation already cited above, and the amended spine still treats documentation support as candidate eligibility rather than qualification proof. The review found no remaining critical or high technology-currency issue.
