# oddspark.dev

A button that hands you one practical recommendation, addressed to a small-business owner: what owning and controlling your own website, with software integrations and search visibility, can do for a small business. The recommendation is fine. The receipt underneath it is the point.

## What it actually does

Every spark is a deterministic function of two live public feeds:

| feed | what it is | why it's here |
|---|---|---|
| [drand quicknet](https://api.drand.sh/v2/beacons/quicknet/rounds/latest) | League of Entropy distributed randomness beacon, 3s rounds, run collectively by Cloudflare, Protocol Labs, EPFL, Kudelski and others | the **odds** |
| [NOAA SWPC GOES XRS](https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json) | real-time solar X-ray flux, 1-minute resolution, `0.1-0.8nm` band | the **spark** |

The domain name is the documentation.

### Derivation

```
window     = latest_round - (latest_round % 100)   # quicknet emits every 3s; floor to 5 minutes
randomness = SHA256(signature_of(window))          # drand's own definition for unchained beacons
seed       = SHA256(randomness : round : flux : time_tag)
id         = seed[0:8]
```

Four bytes of the seed index into four vocabularies: domain (WHO, a small-business trade archetype), lens (WHY, what the website is hired to do), form (WHAT, a concrete move anchored to a moment in the business day), and friction (the STING, the cost of not owning your web presence). Those four seed a Workers AI generation, which produces a headline, a two-sentence premise, and the first question worth answering.

Every input is published and archived, so anyone can recompute the seed and confirm the spark was not invented. There is a verification path on a toy that makes up business recommendations. That is the joke.

### The determinism property

The spark is a pure function of *when* you pressed the button, not *that* you pressed it. Quicknet emits a round every three seconds, which would make every visitor unique and defeat the point, so the entropy is anchored to every hundredth round: a five minute window, still a real published round anyone can pull by number.

The first strike in a window defines the spark for the whole window. KV holds a `w:<round>` pointer to the spark id, so this stays guaranteed even if NOAA publishes a new sample partway through. Sparks are enumerable slots; 288 a day, not infinite noise.

Generation cost is therefore bounded by wall-clock time rather than traffic. A thousand visitors in five minutes cost one generation.

## Routes

| route | behavior |
|---|---|
| `GET /` | the page. Or plain text, if the request came from curl |
| `POST /api/spark` | strike; optional `website` field personalizes; returns full JSON including provenance |
| `GET /s/:id` | permalink, server-hydrated. Also honors curl |
| `GET /api/spark/:id` | raw JSON for a stored spark |

Personalized ids (`p-` prefix) work everywhere a generic id (8 hex chars) does.
| `GET /api/sun` | current flare class only |
| `GET /api/meter` | today's neuron spend, free allocation, fallback threshold, active model |
| `GET /how` | how it works; Mermaid diagrams via CDN |

## Personalized sparks

The button stays a one-click toy. Next to Strike there's a secondary, optional `website` field. Leave it blank and nothing changes: same generic spark, same five-minute determinism, same everything above. Fill it in and the worker safely samples the site, infers a broad vertical, and adapts the spark to it — without turning into an audit, an ownership check, or a lead funnel.

**What personalization can and can't touch:**

| Axis | Personalized behavior |
|---|---|
| WHO (domain archetype) | Replaced by the inferred vertical (e.g. `bakery`), or `small business` if the site's purpose is unclear |
| WHY (lens) | Unchanged — stays exactly as seeded |
| WHAT (form) | Same seeded operational pattern, but its concrete nouns/wording are translated into the vertical when they'd otherwise conflict (`spark.personalization.what.seeded` vs `.adapted`) |
| STING (friction) | Unchanged — stays exactly as seeded |

**Scanning bounds** (all enforced before generation, all fail soft to the generic spark):

- One homepage fetch plus at most two same-origin links found on it — never a crawl.
- ≤4 seconds total, ≤512 KiB total response bytes, ≤3 redirects, HTML responses only.
- Only `http`/`https`, no userinfo, no non-default port, no IP-literal/private/special-use hostnames — rejected as a 400 before any fetch happens. Cloudflare's own `global_fetch_strictly_public` compatibility flag backstops this at the platform level.
- Page content (including any text that looks like instructions) is treated as untrusted data, never as directives to the model. Model output is rendered text-only — it cannot inject markup.

**Grounding:** a personalized result must directly quote one exact observation actually found on a scanned page. Gaps are phrased only as "not found on the scanned pages" — the copy never claims a business *lacks* a capability just because the scan didn't see it.

**Determinism & receipts:** the same normalized domain in the same 5-minute window produces the same personalized spark, id, and receipt — same guarantee as the generic spark, scoped per-domain. The public, permanent receipt (`spark.personalization`) records the normalized domain, scan time, scanned URLs, inferred vertical, the one supporting observation, the seeded/adapted WHAT pair, and a profile hash. It never stores raw HTML, and it never stores the visitor's IP (only a one-way hash of it is used for rate limiting, and that hash itself isn't persisted in the receipt).

```
p-id       = "p-" + SHA256("1|windowRound|genericSeedHash|domain|profileHash")[0:16]
profileHash = SHA256(JSON.stringify({               # insertion order matters
  version: 1, domain, scanned_urls, vertical, clarity,
  observation: { url, text }                        # scan_time is excluded
}))
```

Recompute `profileHash` from a receipt's own fields (`GET /api/spark/p-...`) to confirm nothing was altered after the fact — same spirit as recomputing the drand seed above, just scoped to what personalization is allowed to claim.

**Rate limits** (independent of generic strikes, which are unaffected):

- A site's evidence profile is cached 24h (`profile:<domain>`, KV `expirationTtl`).
- At most one personalization generation per normalized domain per 5-minute window; concurrent requests for the same domain/window share one 20-second lease and converge on its result.
- A visitor gets roughly 10 newly-scanned domains per rolling hour (revisiting an already-scanned domain in that window doesn't consume a slot). No visitor signal (e.g. no `CF-Connecting-IP`) falls back to generic with a warning rather than scanning.

### Operator reference: storage keys

`SPARKS` (KV, public data — anything here is one `GET /api/spark/:id` away from anyone):

| Key | Value | TTL |
|---|---|---|
| `<8-hex id>` | generic spark JSON | none |
| `w:<round>` | pointer: window round → generic spark id | none |
| `p-<16-hex id>` | personalized spark JSON (the public receipt) | none |
| `pw:<round>:<domain>` | pointer: round+domain → `p-` id, or `"unavailable"` | none |
| `profile:<domain>` | cached scan evidence (vertical, observation, scanned URLs) | 24h |
| `n:<day>:<neurons>:<id>` | append-only Workers AI neuron-spend receipt | 2 days |

`COORD` (`SparkCoordinator` Durable Object storage — internal coordination state, never served directly):

| Key | Value |
|---|---|
| `vis:<sha256(visitor IP)>` | rolling 1-hour history of scanned domains, for the 10/hour limit |
| `dom:<round>:<domain>` | claim/lease/commit state for the in-flight or completed generation |

To spot-check a personalized spark in production: `curl oddspark.dev/s/p-<id>` returns the same PROVENANCE block the browser gets, including the vertical, scanned URLs, observation, and profile hash — no dashboard access required.

## The layers

Casual visitor: clean page, click, get an idea.

Anyone who looks: the network tab shows requests to a federal space weather API and a decentralized randomness network. The provenance block is styled like it matters more than the generated text, which inverts the usual hierarchy on purpose. The page's accent color is not decoration; it is the current flare class, cold slate at A/B through to red at X.

`curl oddspark.dev` returns something the browser never sees.

There is a console message.

## Seed geometry

The panel beside the text is not decoration; it is the spark rendered as an object.

- **Core** is the sun. Radius, color and ray count read off the live GOES X-ray flux.
- **Shell** is the seed. Thirty-two nodes, one per byte of the SHA-256, seated on a Fibonacci sphere so the spacing is even, with each node's orbital radius set by its own byte value.
- **Weave** stride comes from byte 0, so the lacing pattern is seed-derived too.

Same seed, same object. The shape is the fingerprint of the spark, and a permalink always renders the identical form.

Hand-rolled projection and painter's-algorithm depth sorting on a 2D canvas. No Three.js, no CDN request, roughly 200 lines. Drag to rotate; `prefers-reduced-motion` paints one static frame and keeps the drag.

## Deploy

```bash
npm i -D wrangler
npx wrangler kv namespace create SPARKS      # paste the id into wrangler.toml
npx wrangler deploy
```

Local:

```bash
npx wrangler dev     # bindings are marked `remote = true`; Workers AI has no local emulation
```

Tests (runs against the live feeds, mocks only the AI binding):

```bash
node test.mjs
```

### Notes

- This is a **Worker**, not Pages. It needs the AI and KV bindings plus request-level routing, so Pages Functions would be fighting the shape.
- `AI_MODEL` and `AI_MODEL_FALLBACK` are vars. The Workers AI catalog changes often; if a configured model 404s, the code falls back to displaying the raw seed axes rather than erroring. Check the current catalog and swap the string if generation stops working.
- KV entries are written without a TTL. Add `expirationTtl` in `buildSpark` if you'd rather they expire.
- Workers AI includes 10,000 free neurons a day. The authoritative count lives in a `NeuronMeter` Durable Object (requires the Workers Paid plan); past 25% of the allocation (2,500 neurons) the worker switches from `AI_MODEL` to `AI_MODEL_FALLBACK` for the rest of the UTC day. Every generation also leaves an append-only `n:<date>:<neurons>:<id>` KV receipt with a 2-day TTL as the audit trail. Because sparks are cached per window, the ceiling is 288 generations a day regardless of traffic.
- `WINDOW_ROUNDS` at the top of the worker controls the window. 100 rounds is 5 minutes; drop it for more churn, raise it for fewer generations.
- Personalization needs one more binding: `COORD`, a `SparkCoordinator` Durable Object (also Workers Paid plan) that serializes visitor rate limits and per-domain generation leases — see [Operator reference](#operator-reference-storage-keys) above. It's declared in `wrangler.toml` alongside `METER`; no extra manual setup beyond `wrangler deploy`.

## Feeds and credit

Solar data from [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/). Randomness from [drand](https://drand.love/) and the League of Entropy.
