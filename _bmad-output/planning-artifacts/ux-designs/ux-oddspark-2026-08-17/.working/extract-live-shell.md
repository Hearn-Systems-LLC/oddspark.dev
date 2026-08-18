---
title: As-built extract — oddspark visitor page
date: 2026-08-17
sources:
  - /Volumes/fast/Github/oddspark/src/worker.js (deployed entry per wrangler.toml `main`; page() at L1397–2152, routes L2431–2532)
  - /Volumes/fast/Github/oddspark/worker.js (older root copy, 1115 lines, not the deployed entry)
  - /Volumes/fast/Github/oddspark/preview.html (static snapshot, 617 lines, dated Jul 25)
  - /Volumes/fast/Github/oddspark/public/og.png (exists, 660,769 bytes; served as static asset, referenced as https://oddspark.dev/og.png 1200x630)
  - /Volumes/fast/Github/oddspark/screenshot-desktop.png (2560x2094), screenshot-phone.png (846x3892) — both Jul 25
  - /Volumes/fast/Github/oddspark/wrangler.toml, README.md
---

# As-built: oddspark visitor page (factual record, no proposals)

Public URL: `https://oddspark.dev` (wrangler.toml `[[routes]] pattern = "oddspark.dev"`, custom_domain; README title "oddspark.dev"). Name: **oddspark**. Deployed entry is `src/worker.js` (`main = "src/worker.js"`).

Routes emitting HTML (src/worker.js L2431–2532): `GET /` → `page(null, live)` with `cache-control: no-store`; `GET /s/:id` → `page(s, {...})` (server-hydrated permalink); `GET /how` → `howPage()`. `wantsText()` (L2425) returns plain text instead for curl/wget/httpie UAs or non-HTML Accept. Non-HTML: `POST /api/spark`, `GET /api/spark/:id`, `GET /api/sun`, `GET /meter`.

## 1. Page structure (src/worker.js L1418–1698)

- `<!doctype html><html lang="en">`; `<meta charset="utf-8">`, viewport `width=device-width,initial-scale=1` (L1419–1422).
- `<title>`: `${esc(title)}` where `title = initial ? initial.idea.headline + " / oddspark" : "oddspark"` (L1404).
- `<meta name="description">`: premise when hydrated, else `"A recommendation seeded by verifiable distributed randomness and live solar flare activity."` (L1405–1407).
- `<link rel="canonical">`: `https://oddspark.dev/s/<id>` or `https://oddspark.dev/` (L1408).
- OG/Twitter (L1426–1437): `og:type=website`, `og:site_name=oddspark`, `og:title`, `og:description`, `og:url`, `og:image=https://oddspark.dev/og.png`, `og:image:width=1200`, `og:image:height=630`, `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- JSON-LD `WebSite` (L1409–1416): name oddspark, url, description "…Every spark is reproducible; the randomness has a receipt."
- Favicon: inline SVG data URI (L1380–1384): `#0B0D10` square, gold `#C9A227` dot r=3, two `#6E8FB8` rings.
- Fonts: Google Fonts preconnect + stylesheet `Courier+Prime:wght@400;700` and `Newsreader:opsz,wght@6..72,400;6..72,500` (L1440–1442). External network dependency.
- Body wrapper `div.shell` (no `<main>`).
- Landmarks/order:
  1. `<header>` (L1633): `div.mark` "odd<span>spark</span>"; `div.live`: `span.dot` + `span#live` (live class e.g. `C1.1` or `----`) + ` &middot; SUN NOW`.
  2. `div.strike-row` (L1638–1645) — **no `<form>` element**. Contains:
     - `div.website-field`: `<label for="website">website, optional</label>` and `<input id="website" name="website" type="url" inputmode="url" autocomplete="url" maxlength="2048" placeholder="example.com">` (L1640–1641). No `required`, no `pattern`, no helper text under it.
     - `<button class="strike" id="strike">Strike</button>` (L1643) — no `type`, no `action`/`method` (JS `fetch` POST to `/api/spark`, L2115–2119).
     - `div.strike-note`: "One idea, seeded by the sun and a randomness beacon. Same window, same spark."
  3. `div.err#err hidden` (L1647).
  4. `<article class="idea" id="idea" hidden>` (L1649–1659): `<h1 id="headline">`, `p.premise#premise`, `div.question` (`<b>?</b><span id="question">`), `div.site-context#site-context hidden` (`p#site-summary`, `p.site-observation#site-observation`, `p.site-warning#site-warning`), `div.chips#chips`.
  5. `<section class="viz">` (L1661–1665): `<h2>Seed Geometry</h2>`, `div.stage#stage > canvas#cv`, `div.legend#legend`. Always visible.
  6. `<section class="prov" id="prov" hidden>` (L1667–1682): `<h2>Provenance</h2>`, `<dl>` of seven `div.field` rows (`dt`/`dd`): drand round, signature, randomness, xray flux, flare class, observed, seed; then `div.formula`: "seed = <b>SHA256( randomness : round : flux : time_tag )</b><br>Recompute it yourself; every input above is published and archived."
  7. `<footer>` (L1684–1690): `span#foot-links` (JS-filled), `<a href="/how">how does this work?</a>`, `<span>drand &middot; NOAA SWPC</span>`, `<a class="built" href="https://hearn.systems" rel="noopener">built by ${HEARN_MARK}</a>` (inline SVG `role="img" aria-label="Hearn."`, L1394), `span#meter` (JS-filled).
- Links present: `/how`, `https://hearn.systems`, and after a strike `/s/<id>`, `/api/spark/<id>` ("json"), and a `button.copy#cp` "copy link". No contact/invitation link.
- Heading order: h1 (hidden until strike) → h2 "Seed Geometry" → h2 "Provenance". On first load with no spark, the first visible heading is an h2 and there is no visible h1.

## 2. Visible copy strings (verbatim)

- Masthead: `oddspark`; `C1.1 · SUN NOW` (or `---- · SUN NOW` if solar feed failed, L2516).
- Label: `website, optional`; placeholder `example.com`.
- Button: `Strike` → while loading `Scanning` (if website filled, for 250ms) then `Striking` → after any completion `Strike again` (L2110–2148). Hydrated permalink boots with `Strike again` (L2151).
- Note: `One idea, seeded by the sun and a randomness beacon. Same window, same spark.`
- Section labels: `Seed Geometry`, `Provenance`.
- Provenance dt labels: `drand round`, `signature`, `randomness`, `xray flux`, `flare class`, `observed`, `seed`; placeholder `—`.
- Formula: `seed = SHA256( randomness : round : flux : time_tag )` / `Recompute it yourself; every input above is published and archived.`
- Legend (JS, L1918–1930): `core  GOES X-ray flux <class>`; `shell  32 nodes, one per byte of the seed` / `awaiting a seed`; `radius  each node sits at its own byte value`; `weave  stride <n>, taken from byte 0`; `id  <8 hex>`; `drag to rotate`.
- Chips (JS, L1770–1775): `domain`, `lens`, `form`, `constraint` + value.
- Site-context (JS, L1758–1768): `Public pages from <domain> · <vertical>` or `Website context · <domain|not scanned>`; `Observed on <url>: <text>`; warning text from API.
- Errors (L2135–2141): field error message verbatim from API when `field==="website"`, else `No spark. A feed did not answer: <msg>. Try again.`
- Footer: `<id> · json · copy link` (→ `copied` for 1.6s), `how does this work?`, `drand · NOAA SWPC`, `built by Hearn.`, meter `ai · <used> / <free> neurons today · <model>` (L1721–1723).
- Console easter egg (L1710–1717): "oddspark  the randomness has a receipt", formula, verify URLs.

## 3. Visual identity (CSS L1443–1628)

Tokens (`:root`, L1444–1452):
- `--void:#0B0D10` (page bg), `--panel:#101419` (input/formula/site-context bg), `--rule:#1D242C` (borders/dividers)
- `--text:#C6CFD8`, `--dim:#67737F`, `--faint:#3D4750`
- `--entropy:#6E8FB8` (blue: links, focus rings, "cool" values, formula/site-context left border)
- `--solar:${accent}` — dynamic per live flare letter (L173–179): A `#4A6785`, B `#5E8CA8`, C `#C9A227` (default), M `#E06A3F`, X `#F2452E`. Used for button bg, mark "spark", dot, question bar, hot values; JS re-sets it after strike (L1791).
- Extra literal colours: h1 `#E4EAF0`; error/invalid `#E06A3F`; site-warning `#D89372`; oxide period in Hearn mark `#B4502E`.
- `--mono:"Courier Prime",ui-monospace,SFMono-Regular,Menlo,monospace` (body); `--serif:"Newsreader",Georgia,serif` (h1, premise).

Type: body 14px/1.6 mono; `.mark` 13px 700 tracking .14em lowercase; `.live` 11px tracking .1em; label 10.5px tracking .08em lowercase; input `font:12px var(--mono)`; button 13px 700 uppercase tracking .22em; note 11.5px tracking .04em; h1 serif 400 31px/1.24 tracking -.01em (25px ≤520px); premise serif 18px/1.62 (16.5px ≤520px); question 12.5px/1.65; h2 10.5px uppercase tracking .24em 400 dim; chips 10.5px; provenance fields 11.5px; formula 11px/1.7; footer 11px; legend 10.5px/1.8.

Spacing/shape: body `padding:0 20px 80px`; header `padding:22px 0 18px`; strike-row `padding:44px 0 40px; gap:18px; align-items:flex-end; flex-wrap:wrap`; input `padding:11px 12px; width:250px; border-radius:0`; button `padding:14px 30px; border:0` (square, no radius); idea `padding-top:34px; min-height:150px`; prov `margin-top:44px; padding-top:20px`; footer `margin-top:34px; padding-top:18px; gap:8px 22px`. Radius: only `.dot` 50%. Shadows: only the dot's `box-shadow` glow. Borders: 1px `--rule` everywhere; 2px left accents.

Layout: `.shell{max-width:660px}` single column. `@media (min-width:920px)` (L1466–1481): `.shell{max-width:1760px; display:grid; column-gap:54px; grid-template-columns:minmax(0,660px) minmax(322px,1fr)}` with areas head/strike/err full width; idea, prov, foot in left column; `.viz` right column spanning three rows, `position:sticky; top:24px`. `.stage` `aspect-ratio:1/1.06; max-height:352px` (desktop `max-height:min(82vh,1100px)`). `@media (max-width:919.98px)` `.viz{margin-top:38px}`. `@media (max-width:520px)` h1/premise smaller, `.field` single column. No light-mode/`prefers-color-scheme` rule; dark palette only.

Motion: `.dot` `animation:breathe 4.2s ease-in-out infinite`; button `transition:transform .12s, filter .12s`, hover `filter:brightness(1.12)`, active `translateY(1px)`; text scramble effect on provenance values (9 steps × 34ms, staggered 55ms; L1727–1746); canvas continuous rotation via rAF, 950ms assemble easing, corona pulse; drag-to-rotate with inertia. `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}` (L1626–1628) and JS `reduce` flag disables scramble, spin, pulse and rAF loop (L1706, L1728, L1946, L2062).

## 4. Result rendering

- Home `/`: server sends the shell with `BOOT = null`, `.idea`/`.prov`/`.err` `hidden`; only the live solar class is server-injected (`esc(liveClass)`) and `--solar` accent colour chosen server-side.
- Strike: entirely client JS — `btn.onclick` → `fetch("/api/spark", POST JSON {website})` → `render(s, true)` (L2109–2149). Not progressive-enhancement: with JS disabled the button does nothing and there is no `<form>` fallback; the input is never submitted.
- `render()` (L1753–1810) order: unhide idea+prov; set `textContent` for headline, premise, question; site-context (hidden unless `s.personalization`); rebuild chips via `createElement`/`textContent`; provenance values via `scramble()` (textContent); set `--solar` + `#live`; `VIZ.spark(s)`; footer links via `innerHTML` (id is server-validated hex/`p-` id); `history.pushState` to `/s/<id>`; `document.title`.
- Escaping: server template uses `esc()` for title/desc/live; BOOT JSON has `<` replaced with `<` (L1398). Client uses textContent everywhere except `#foot-links` innerHTML (id only) and legend innerHTML (esc()'d class/seed).
- Permalink `/s/:id`: same template with `BOOT` = stored spark; `render(BOOT,false)` runs on load, so content still requires JS to appear (h1 etc. are empty in the served HTML; only `<title>`/meta are server-filled).
- Loading state: button `disabled` (opacity .45, `cursor:wait`) with text `Scanning`/`Striking`; no spinner, no aria-live/aria-busy.
- Error: `#err` unhidden with message; website field gets `aria-invalid="true"` (border `#E06A3F`) if API returns `field:"website"`. Server-side non-API errors return plain text `A feed did not answer: …` 502 (L2529).
- Result surfaces sections: Idea (h1, premise, question, optional site-context, 4 chips) → Seed Geometry (canvas + legend) → Provenance (dl + formula) → footer links (id, json, copy link, meter).

## 5. Screenshots (Jul 25 state — pre-website-field)

- Desktop (2560x2094): two-column grid; masthead `oddspark` (spark in gold) left, `● C1.1 · SUN NOW` right; gold `STRIKE AGAIN` block button with grey note inline to its right; left column serif h1 (2 lines) + premise + gold-barred `?` question + 4 outlined chips wrapping to 3 rows; right column `SEED GEOMETRY` sticky with gold sun + blue node shell, legend beneath; `PROVENANCE` dl in two columns with blue "cool" and gold "hot" values, truncated hashes with `…`; formula panel with blue left border; footer `75829baf · json · copy link   drand · NOAA SWPC`. Right column canvas has large empty vertical space above/below the object. Nothing broken. No website input and no `how does this work?` / `built by` links visible (older build).
- Phone (846x3892): single column; button full-ish width above the note (wraps to 2 lines); h1 25px 2 lines; chips wrap and the `constraint one sentence has to work as a standalone post` chip runs to the right edge (appears to overflow/clip the 20px gutter — `white-space:nowrap` on `.chip`); canvas ~square with large dead space; legend; provenance stacked label-over-value; formula panel; footer on one line. Extremely long page (≈4.6 screens).

## 6. Accessibility observations

- `lang="en"` set. Label associated via `for="website"`/`id="website"`. Button is a real `<button>`; no `type`.
- Focus: `button.strike:focus-visible` 2px `--entropy` outline offset 3px; `a:focus-visible` same; input `outline:none` with focus indicated only by `border-color:var(--entropy)` (1px). `.copy` button and `.stage` canvas have no focus style; canvas is pointer-only (`drag to rotate`), no keyboard equivalent, no alt/aria on `<canvas>`.
- Contrast (estimated vs `#0B0D10`): `--text #C6CFD8` ≈13:1; h1 `#E4EAF0` ≈16:1; `--dim #67737F` ≈4.0:1 (borderline for 11–12.5px text used in question, chips, provenance dd, legend, meter); `--faint #3D4750` ≈2.0:1 (fails; used for label "website, optional", strike-note, chip prefixes, dt labels, legend labels, footer text); `--entropy #6E8FB8` ≈5.7:1; `--solar` C `#C9A227` ≈8.3:1, but A `#4A6785` ≈2.6:1 and B `#5E8CA8` ≈4.1:1 (button text `#0B0D10` on A-class bg ≈2.6:1); error `#E06A3F` ≈5.9:1. Placeholder colour is browser default on `--panel`.
- Heading order: h1 hidden pre-strike, so document starts at h2; `SUN NOW`/`Seed Geometry` are the only headings until JS renders. No `<main>`/`<nav>` landmarks; `.err` has no `role="alert"`/`aria-live`; loading state not announced.
- Reduced motion honoured in CSS and JS (see §3).
- Small type: many strings at 10.5–11.5px.

## 7. preview.html vs worker-emitted HTML

preview.html is a frozen July snapshot of an earlier template (matches root `worker.js`, not `src/worker.js`). Differences vs `src/worker.js` page():
- No `.website-field` label/input; `.strike-row` uses `align-items:center` (worker: `flex-end`); no `.website-field`, `input[aria-invalid]`, `.site-context` CSS or markup.
- Grid: `.shell{max-width:1000px; grid-template-columns:minmax(0,1fr) 322px}` and areas `"foot foot"`; worker: `max-width:1760px; minmax(0,660px) minmax(322px,1fr)`, `"foot viz"`, viz sticky, `.stage` desktop `max-height:min(82vh,1100px)`.
- Footer: only `#foot-links` + `drand · NOAA SWPC`; worker adds `how does this work?`, `built by Hearn.` mark, `#meter` (and `/meter` fetch).
- Static `BOOT` spark JSON hydrated (id 75829baf, headline "The audit trail for data broker licensing ends at a vendor"), title/OG hard-coded; `--solar:#C9A227` literal; `LIVE={"letter":"C","magnitude":1.1}`.
- Same tokens, fonts, favicon, breakpoints (920/520), reduced-motion rule, error copy and rendering pipeline otherwise.
