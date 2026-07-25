# oddspark.dev

A button that hands you one practical recommendation: something worth building, offering, fixing, or pitching for a web developer, a webdev shop, or a local Port Huron business. The recommendation is fine. The receipt underneath it is the point.

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

Four bytes of the seed index into four vocabularies: domain, lens, form, constraint. Those four seed a Workers AI generation, which produces a headline, a two-sentence premise, and the first question worth answering.

Every input is published and archived, so anyone can recompute the seed and confirm the spark was not invented. There is a verification path on a toy that makes up business recommendations. That is the joke.

### The determinism property

The spark is a pure function of *when* you pressed the button, not *that* you pressed it. Quicknet emits a round every three seconds, which would make every visitor unique and defeat the point, so the entropy is anchored to every hundredth round: a five minute window, still a real published round anyone can pull by number.

The first strike in a window defines the spark for the whole window. KV holds a `w:<round>` pointer to the spark id, so this stays guaranteed even if NOAA publishes a new sample partway through. Sparks are enumerable slots; 288 a day, not infinite noise.

Generation cost is therefore bounded by wall-clock time rather than traffic. A thousand visitors in five minutes cost one generation.

## Routes

| route | behavior |
|---|---|
| `GET /` | the page. Or plain text, if the request came from curl |
| `POST /api/spark` | strike; returns full JSON including provenance |
| `GET /s/:id` | permalink, server-hydrated. Also honors curl |
| `GET /api/spark/:id` | raw JSON for a stored spark |
| `GET /api/sun` | current flare class only |
| `GET /how` | how it works; Mermaid diagrams via CDN |

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
- Workers AI includes 10,000 free neurons a day. The worker meters every generation append-only — one `n:<date>:<neurons>:<id>` KV key per generation, summed with a single `list()` — and switches from `AI_MODEL` to `AI_MODEL_FALLBACK` once the day passes 25% of the allocation (2,500 neurons). No read-modify-write, so concurrent strikes can't clobber the meter; KV list is eventually consistent, so the total can lag a fresh generation by seconds. Because sparks are also cached per window, the ceiling is 288 generations a day regardless of traffic.
- `WINDOW_ROUNDS` at the top of the worker controls the window. 100 rounds is 5 minutes; drop it for more churn, raise it for fewer generations.

## Feeds and credit

Solar data from [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/). Randomness from [drand](https://drand.love/) and the League of Entropy.
