/**
 * oddspark.dev
 *
 * A recommendation generator whose randomness has a receipt.
 *
 * Every spark is a pure function of two live public feeds:
 *   1. drand / League of Entropy quicknet  - verifiable distributed randomness, 3s rounds
 *   2. NOAA SWPC GOES X-ray flux           - real solar flare activity, 1min resolution
 *
 * odds + spark. The domain name is the documentation.
 *
 * Because the seed is derived deterministically from (drand round, flux reading),
 * two people who press the button in the same window get the identical spark.
 * The result is cached in KV under an id derived from the seed itself, so the
 * whole thing is reproducible and third-party verifiable. On a button that
 * makes up business recommendations. That is the joke.
 */

const DRAND_BASE = "https://api.drand.sh/v2/beacons/quicknet/rounds/";
const NOAA = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json";
const BAND = "0.1-0.8nm"; // the band used for A/B/C/M/X flare classification

// quicknet emits a round every 3 seconds. Anchoring to every round would make
// each spark unique-per-visitor, which defeats the point. Floor to every 100th
// round instead: a 5 minute window, still a real published round anyone can pull.
const WINDOW_ROUNDS = 100;

/* ------------------------------------------------------------------ *
 * Seed vocabulary
 * Four axes. Domain names who benefits; lens is the angle; form is the
 * kind of move; friction is the constraint that keeps it from being obvious.
 * ------------------------------------------------------------------ */

const DOMAINS = [
  "your own portfolio and case study pages",
  "your dev tooling and default project stack",
  "your local development and deploy workflow",
  "your shop's recurring maintenance and care plans",
  "your shop's proposal and pricing process",
  "your shop's pipeline of local leads",
  "a Port Huron restaurant's online ordering and menu",
  "a local contractor's quote-request flow",
  "a marina's seasonal slip booking",
  "a downtown retailer's Google Business Profile",
  "a Blue Water area tourism or events page",
  "a service-area business with no storefront",
  "a real estate agent's listing pages",
  "a salon or barbershop's appointment booking",
  "a nonprofit or church donation page",
  "an industrial supplier's parts catalog",
];

const LENSES = [
  "the smallest version that pays for itself",
  "what the owner checks every single day",
  "where the manual work hides",
  "what breaks in the busy season",
  "what a customer does on a phone in a parking lot",
  "the question people call in to ask",
  "the competitor across the river already does it",
  "the part untouched for five years",
  "who maintains it after handoff",
  "what shows up on a slow connection",
  "the metric the client already cares about",
  "what makes the business referable",
];

const FORMS = [
  "Build: the tool or feature worth shipping",
  "Offer: the service to package and sell",
  "Fix: the repair with a visible payoff",
  "Pitch: the business to approach and the opener",
  "Learn: the skill that compounds",
  "Automate: the chore to delete",
];

const FRICTIONS = [
  "no new software subscription allowed",
  "shippable in one weekend",
  "the owner never logs into a dashboard",
  "it has to work on a five-year-old phone",
  "price it before you describe it",
  "no redesign; work with what is there",
  "the payoff must be measurable in dollars or hours",
  "assume it is January and the tourists are gone",
  "someone non-technical has to own it after you",
  "explain it without the word 'just'",
];

/* ------------------------------------------------------------------ *
 * Crypto helpers
 * ------------------------------------------------------------------ */

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input) {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/* ------------------------------------------------------------------ *
 * Flare classification
 * ------------------------------------------------------------------ */

function classifyFlare(flux) {
  const bands = [
    { letter: "X", floor: 1e-4 },
    { letter: "M", floor: 1e-5 },
    { letter: "C", floor: 1e-6 },
    { letter: "B", floor: 1e-7 },
    { letter: "A", floor: 1e-8 },
  ];
  for (const b of bands) {
    if (flux >= b.floor) {
      return { letter: b.letter, magnitude: +(flux / b.floor).toFixed(1) };
    }
  }
  return { letter: "A", magnitude: +(flux / 1e-8).toFixed(1) };
}

const SOLAR_COLOR = {
  A: "#4A6785",
  B: "#5E8CA8",
  C: "#C9A227",
  M: "#E06A3F",
  X: "#F2452E",
};

/* ------------------------------------------------------------------ *
 * Feeds
 * ------------------------------------------------------------------ */

async function currentWindow() {
  const res = await fetch(DRAND_BASE + "latest", { cf: { cacheTtl: 3, cacheEverything: true } });
  if (!res.ok) throw new Error("drand unreachable: " + res.status);
  const { round } = await res.json();
  return round - (round % WINDOW_ROUNDS);
}

async function readDrand(round) {
  const res = await fetch(DRAND_BASE + round, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) throw new Error("drand round " + round + " unreachable: " + res.status);
  const j = await res.json();
  // quicknet is unchained; drand defines randomness as the hash of the signature
  const randomness = await sha256Hex(hexToBytes(j.signature));
  return { round: j.round, signature: j.signature, randomness };
}

async function readSolar() {
  const res = await fetch(NOAA, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!res.ok) throw new Error("NOAA unreachable: " + res.status);
  const rows = await res.json();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].energy === BAND) {
      const flux = rows[i].flux;
      return { flux, timeTag: rows[i].time_tag, satellite: rows[i].satellite, ...classifyFlare(flux) };
    }
  }
  throw new Error("no " + BAND + " reading in NOAA payload");
}

/* ------------------------------------------------------------------ *
 * Derivation
 *
 * seed = SHA256( randomness : round : flux : time_tag )
 * Every input is published and archived, so anyone can recompute this.
 * ------------------------------------------------------------------ */

async function derive(entropy, solar) {
  const preimage = [entropy.randomness, entropy.round, solar.flux.toExponential(6), solar.timeTag].join(":");
  const seed = await sha256Hex(preimage);
  const bytes = hexToBytes(seed);
  const pick = (arr, offset) => arr[bytes[offset] % arr.length];
  return {
    seed,
    preimage,
    id: seed.slice(0, 8),
    domain: pick(DOMAINS, 0),
    lens: pick(LENSES, 1),
    form: pick(FORMS, 2),
    friction: pick(FRICTIONS, 3),
  };
}

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

const SYSTEM_PROMPT = [
  "You generate a single practical recommendation for a web developer who runs a small webdev shop in Port Huron, Michigan.",
  "Each recommendation must clearly benefit one of three parties: the developer's own skills or tooling, the shop's revenue or process, or a specific kind of local Port Huron area business the shop could serve.",
  "",
  "Rules:",
  "- Concrete. Name the thing to build, offer, fix, pitch, learn, or automate; an action, not a topic.",
  "- The payoff must be legible to a non-technical business owner: dollars, hours, calls, bookings, or search visibility.",
  "- Dry and precise. No hype, no urgency, no exclamation.",
  "- Never use: 'dive into', 'picture this', 'it's important to note', 'a testament to', 'navigating the complexities', 'have you ever wondered', 'not X, but Y'.",
  "- No em dashes. Use semicolons or commas.",
  "- Do not use three-item lists.",
  "- The headline names the action, flat and specific, under 12 words.",
  "- The premise is exactly two sentences: what it is, and why it pays off.",
  "- The question is the first thing to check before starting, answerable by looking at something real: a website, a ledger, a calendar, a search result.",
  "",
  'Respond with raw JSON only, no markdown fence: {"headline":"...","premise":"...","question":"..."}',
].join("\n");

function userPrompt(d) {
  return [
    "DOMAIN: " + d.domain,
    "LENS: " + d.lens,
    "FORM: " + d.form,
    "CONSTRAINT: " + d.friction,
    "",
    "Write the seed. Honor the constraint literally.",
  ].join("\n");
}

function stripFence(s) {
  return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}

/* Neuron budget. Workers AI includes 10,000 free neurons per day; the binding
 * reports per-call spend in usage.neurons. The authoritative count lives in a
 * Durable Object (single "global" instance, so increments are serialized and
 * strongly consistent) and the worker switches to the cheaper fallback model
 * past FALLBACK_FRACTION of the free day.
 *
 * Every generation also leaves an append-only KV receipt, n:<date>:<n>:<id>,
 * with a 2 day TTL. The receipts are the audit trail; the DO is the counter.
 * Metering is still best-effort: a hiccup in either store must never lose a
 * good generation. */

const NEURON_FREE_DAILY = 10000;
const NEURON_FALLBACK_FRACTION = 0.25;
const NEURON_RECEIPT_TTL = 172800; // 2 days; only the UTC day is ever live

function neuronDay() {
  return new Date().toISOString().slice(0, 10);
}

// Plain class with fetch(); deliberately NOT extending DurableObject from
// "cloudflare:workers" so test.mjs can import this file under plain Node.
export class NeuronMeter {
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const day = url.searchParams.get("day");
    const key = "total:" + day;
    if (request.method === "POST") {
      const n = parseFloat(url.searchParams.get("n"));
      const used = ((await this.state.storage.get(key)) || 0) + (n > 0 ? n : 0);
      await this.state.storage.put(key, used);
      return Response.json({ day, used });
    }
    return Response.json({ day, used: (await this.state.storage.get(key)) || 0 });
  }
}

function meterStub(env) {
  return env.METER.get(env.METER.idFromName("global"));
}

async function neuronsUsedToday(env) {
  const res = await meterStub(env).fetch("https://meter/?day=" + neuronDay());
  const j = await res.json();
  return j.used || 0;
}

async function recordNeurons(env, id, n) {
  if (!n || !(n > 0)) return;
  try {
    await meterStub(env).fetch("https://meter/?day=" + neuronDay() + "&n=" + n, { method: "POST" });
  } catch (e) {
    /* best-effort metering */
  }
  try {
    await env.SPARKS.put("n:" + neuronDay() + ":" + n + ":" + id, "1", { expirationTtl: NEURON_RECEIPT_TTL });
  } catch (e) {
    /* best-effort receipt */
  }
}

function modelFor(env, used) {
  const primary = env.AI_MODEL || "@cf/openai/gpt-oss-120b";
  const cheap = env.AI_MODEL_FALLBACK || "@cf/openai/gpt-oss-20b";
  return used >= NEURON_FREE_DAILY * NEURON_FALLBACK_FRACTION ? cheap : primary;
}

async function generate(env, d) {
  try {
    const model = modelFor(env, await neuronsUsedToday(env));
    const out = await env.AI.run(model, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(d) },
      ],
      // Reasoning models (gpt-oss) burn tokens on their chain of thought
      // before the JSON; 400 truncates them. The cap is not the spend:
      // non-reasoning models still stop when done.
      max_tokens: 2048,
      temperature: 0.85,
    });
    // Output location varies by model: llama returns `response` (a string, or
    // pre-parsed as an object when it is valid JSON); gpt-oss only populates
    // OpenAI-style choices[].message.content. Normalize to a string either way.
    const choice = out.choices && out.choices[0] && out.choices[0].message;
    const resp = out.response || out.result || (choice && choice.content) || "";
    const raw = stripFence(typeof resp === "string" ? resp : JSON.stringify(resp));
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("no json in model output");
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!parsed.headline || !parsed.premise) throw new Error("incomplete model output");
    await recordNeurons(env, d.id, out.usage && out.usage.neurons);
    return { ...parsed, generated: true, model };
  } catch (err) {
    // Never blank. Fall back to the raw juxtaposition, which is legible on its own.
    return {
      headline: d.domain,
      premise: "Angle: " + d.lens + ". Shape: " + d.form + ".",
      question: "Constraint: " + d.friction + ".",
      generated: false,
      model: null,
      note: "model unavailable; showing the raw seed",
    };
  }
}

/* ------------------------------------------------------------------ *
 * Spark assembly
 * ------------------------------------------------------------------ */

async function buildSpark(env) {
  const round = await currentWindow();

  // The first strike in a window defines the spark for that whole window.
  // Keying on the window rather than the seed keeps this guaranteed even if
  // NOAA publishes a new sample partway through.
  const pinned = await env.SPARKS.get("w:" + round);
  if (pinned) {
    const hit = await env.SPARKS.get(pinned, { type: "json" });
    if (hit) return { ...hit, cached: true };
  }

  const [entropy, solar] = await Promise.all([readDrand(round), readSolar()]);
  const d = await derive(entropy, solar);

  const cached = await env.SPARKS.get(d.id, { type: "json" });
  if (cached) {
    await env.SPARKS.put("w:" + round, d.id);
    return { ...cached, cached: true };
  }

  const idea = await generate(env, d);

  const spark = {
    id: d.id,
    struck: new Date().toISOString(),
    idea: { headline: idea.headline, premise: idea.premise, question: idea.question },
    seed: {
      domain: d.domain,
      lens: d.lens,
      form: d.form,
      friction: d.friction,
      hash: d.seed,
      preimage: d.preimage,
    },
    window: { round, rounds: WINDOW_ROUNDS, seconds: WINDOW_ROUNDS * 3 },
    entropy: {
      source: "drand quicknet (League of Entropy)",
      round: entropy.round,
      signature: entropy.signature,
      randomness: entropy.randomness,
      verify: "https://api.drand.sh/v2/beacons/quicknet/rounds/" + entropy.round,
    },
    solar: {
      source: "NOAA SWPC GOES XRS",
      band: BAND,
      satellite: solar.satellite,
      flux: solar.flux,
      class: solar.letter + solar.magnitude.toFixed(1),
      letter: solar.letter,
      time_tag: solar.timeTag,
      verify: NOAA,
    },
    model: idea.model,
    generated: idea.generated,
  };

  await env.SPARKS.put(d.id, JSON.stringify(spark));
  await env.SPARKS.put("w:" + round, d.id);
  return { ...spark, cached: false };
}

/* ------------------------------------------------------------------ *
 * Plain-text rendering, for people who reach for curl first
 * ------------------------------------------------------------------ */

function asText(s, origin, meter) {
  const L = [];
  L.push("  oddspark.dev");
  L.push("  a recommendation seeded by verifiable randomness and the sun");
  L.push("");
  L.push("  " + s.idea.headline.toUpperCase());
  L.push("");
  wrap(s.idea.premise, 66).forEach((l) => L.push("  " + l));
  L.push("");
  wrap("? " + s.idea.question, 66).forEach((l) => L.push("  " + l));
  L.push("");
  L.push("  " + "-".repeat(66));
  L.push("  PROVENANCE");
  L.push("    window         " + (s.window ? s.window.round + "  (" + s.window.seconds + "s)" : "n/a"));
  L.push("    drand round    " + s.entropy.round);
  L.push("    signature      " + s.entropy.signature.slice(0, 24) + "...");
  L.push("    randomness     " + s.entropy.randomness.slice(0, 24) + "...");
  L.push("    xray flux      " + s.solar.flux.toExponential(3) + " W/m2  (" + s.solar.band + ")");
  L.push("    flare class    " + s.solar.class + "  GOES-" + s.solar.satellite);
  L.push("    observed       " + s.solar.time_tag);
  L.push("    seed           " + s.seed.hash);
  if (meter) {
    L.push("    ai meter       " + meter.used.toFixed(1) + " / " + NEURON_FREE_DAILY + " neurons today  (" + String(meter.model).split("/").pop() + ")");
  }
  L.push("");
  L.push("  seed = SHA256(randomness : round : flux : time_tag)");
  L.push("  recompute it yourself. every input is published.");
  L.push("");
  L.push("    " + s.entropy.verify);
  L.push("    " + origin + "/api/spark/" + s.id);
  L.push("");
  L.push("  permalink: " + origin + "/s/" + s.id);
  L.push("");
  return L.join("\n");
}

function wrap(str, width) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur += " " + w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0B0D10"/><circle cx="16" cy="16" r="3" fill="#C9A227"/><circle cx="16" cy="16" r="9" fill="none" stroke="#6E8FB8" stroke-width="1.5" opacity=".7"/><circle cx="16" cy="16" r="14" fill="none" stroke="#6E8FB8" stroke-width="1" opacity=".3"/></svg>'
  );

function page(initial, live) {
  const boot = initial ? JSON.stringify(initial).replace(/</g, "\\u003c") : "null";
  const liveJson = live
    ? JSON.stringify({ letter: live.letter, magnitude: live.magnitude, flux: live.flux })
    : "null";
  const accent = SOLAR_COLOR[live && live.letter ? live.letter : "C"] || SOLAR_COLOR.C;
  const liveClass = live ? live.letter + live.magnitude.toFixed(1) : "----";
  const title = initial ? initial.idea.headline + " / oddspark" : "oddspark";
  const desc = initial
    ? initial.idea.premise
    : "A recommendation seeded by verifiable distributed randomness and live solar flare activity.";
  const canonical = initial ? "https://oddspark.dev/s/" + initial.id : "https://oddspark.dev/";
  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "oddspark",
    url: "https://oddspark.dev/",
    description:
      "A recommendation seeded by verifiable distributed randomness and live solar flare activity. Every spark is reproducible; the randomness has a receipt.",
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="oddspark">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://oddspark.dev/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="https://oddspark.dev/og.png">
<script type="application/ld+json">${ldJson}</script>
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
  :root{
    --void:#0B0D10; --panel:#101419; --rule:#1D242C;
    --text:#C6CFD8; --dim:#67737F; --faint:#3D4750;
    --entropy:#6E8FB8;
    --solar:${accent};
    --mono:"Courier Prime",ui-monospace,SFMono-Regular,Menlo,monospace;
    --serif:"Newsreader",Georgia,serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:var(--void); color:var(--text);
    font-family:var(--mono); font-size:14px; line-height:1.6;
    -webkit-font-smoothing:antialiased;
    display:flex; justify-content:center;
    padding:0 20px 80px;
  }
  .shell{width:100%; max-width:660px}

  /* two columns once there's room; stacked on phones -------------- */
  @media (min-width:920px){
    .shell{
      max-width:1760px; display:grid; column-gap:54px;
      /* text column capped for measure; the geometry takes the rest */
      grid-template-columns:minmax(0,660px) minmax(322px,1fr);
      grid-template-areas:
        "head   head"
        "strike strike"
        "err    err"
        "idea   viz"
        "prov   viz"
        "foot   viz";
    }
    header{grid-area:head} .strike-row{grid-area:strike} .err{grid-area:err}
    .idea{grid-area:idea} .prov{grid-area:prov} footer{grid-area:foot; align-self:start}
    .viz{grid-area:viz; margin-top:0; align-self:start; position:sticky; top:24px}
  }

  /* seed geometry -------------------------------------------------- */
  .viz{border-top:1px solid var(--rule); padding-top:20px}
  @media (max-width:919.98px){
    .viz{margin-top:38px}
  }
  .viz h2{
    font-size:10.5px; letter-spacing:.24em; text-transform:uppercase;
    color:var(--dim); font-weight:400; margin:0 0 14px;
  }
  .stage{
    position:relative; width:100%; aspect-ratio:1 / 1.06; max-height:352px;
    cursor:grab; touch-action:none;
  }
  @media (min-width:920px){
    .stage{max-height:min(82vh, 1100px)}
  }
  .stage:active{cursor:grabbing}
  .stage canvas{display:block; width:100%; height:100%}
  .legend{margin-top:14px; font-size:10.5px; line-height:1.8; color:var(--faint)}
  .legend div{display:flex; gap:9px}
  .legend b{color:var(--dim); font-weight:400; min-width:52px; letter-spacing:.06em}
  .legend em{font-style:normal; color:var(--solar)}
  .legend u{text-decoration:none; color:var(--entropy)}

  /* masthead ------------------------------------------------------- */
  header{
    display:flex; align-items:center; justify-content:space-between;
    gap:16px; padding:22px 0 18px; border-bottom:1px solid var(--rule);
  }
  .mark{font-weight:700; letter-spacing:.14em; text-transform:lowercase; font-size:13px}
  .mark span{color:var(--solar)}
  .live{display:flex; align-items:center; gap:8px; color:var(--dim); font-size:11px; letter-spacing:.1em}
  .dot{
    width:7px; height:7px; border-radius:50%; background:var(--solar);
    box-shadow:0 0 0 0 var(--solar); animation:breathe 4.2s ease-in-out infinite;
  }
  @keyframes breathe{
    0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0); opacity:.55}
    50%{box-shadow:0 0 10px 2px var(--solar); opacity:1}
  }

  /* strike --------------------------------------------------------- */
  .strike-row{padding:44px 0 40px; display:flex; align-items:center; gap:18px; flex-wrap:wrap}
  button.strike{
    font-family:var(--mono); font-size:13px; font-weight:700;
    letter-spacing:.22em; text-transform:uppercase;
    color:var(--void); background:var(--solar);
    border:0; padding:14px 30px; cursor:pointer;
    transition:transform .12s ease, filter .12s ease;
  }
  button.strike:hover:not(:disabled){filter:brightness(1.12)}
  button.strike:active:not(:disabled){transform:translateY(1px)}
  button.strike:disabled{opacity:.45; cursor:wait}
  button.strike:focus-visible{outline:2px solid var(--entropy); outline-offset:3px}
  .strike-note{color:var(--faint); font-size:11.5px; letter-spacing:.04em; flex:1; min-width:200px}

  /* idea ----------------------------------------------------------- */
  .idea{border-top:1px solid var(--rule); padding-top:34px; min-height:150px}
  .idea[hidden]{display:none}
  h1{
    font-family:var(--serif); font-weight:400; font-size:31px; line-height:1.24;
    margin:0 0 18px; color:#E4EAF0; letter-spacing:-.01em;
  }
  .premise{font-family:var(--serif); font-size:18px; line-height:1.62; color:var(--text); margin:0 0 26px}
  .question{
    display:flex; gap:12px; align-items:baseline;
    border-left:2px solid var(--solar); padding:2px 0 2px 14px;
    color:var(--dim); font-size:12.5px; line-height:1.65;
  }
  .question b{color:var(--solar); font-weight:400}

  /* seed chips ----------------------------------------------------- */
  .chips{display:flex; flex-wrap:wrap; gap:6px; margin:28px 0 0}
  .chip{
    font-size:10.5px; letter-spacing:.05em; color:var(--dim);
    border:1px solid var(--rule); padding:4px 9px; white-space:nowrap;
  }
  .chip i{color:var(--faint); font-style:normal; margin-right:6px}

  /* provenance ----------------------------------------------------- */
  .prov{margin-top:44px; border-top:1px solid var(--rule); padding-top:20px}
  .prov h2{
    font-size:10.5px; letter-spacing:.24em; text-transform:uppercase;
    color:var(--dim); font-weight:400; margin:0 0 16px;
  }
  .field{
    display:grid; grid-template-columns:118px 1fr; gap:10px;
    padding:3px 0; font-size:11.5px; align-items:baseline;
  }
  .field dt{color:var(--faint); letter-spacing:.06em}
  .field dd{margin:0; color:var(--dim); word-break:break-all}
  .field dd.hot{color:var(--solar)}
  .field dd.cool{color:var(--entropy)}
  .formula{
    margin-top:18px; padding:12px 14px; background:var(--panel);
    border-left:2px solid var(--entropy); font-size:11px; color:var(--dim); line-height:1.7;
  }
  .formula b{color:var(--text); font-weight:400}

  /* footer --------------------------------------------------------- */
  footer{
    margin-top:34px; padding-top:18px; border-top:1px solid var(--rule);
    display:flex; flex-wrap:wrap; gap:8px 22px; font-size:11px; color:var(--faint);
  }
  /* the live meter readout always gets its own line below the links */
  #meter{flex-basis:100%}
  a{color:var(--entropy); text-decoration:none; border-bottom:1px solid transparent}
  a:hover{border-bottom-color:var(--entropy)}
  a:focus-visible{outline:2px solid var(--entropy); outline-offset:2px}
  .copy{background:none;border:0;padding:0;font:inherit;color:var(--entropy);cursor:pointer}
  .copy:hover{text-decoration:underline}

  .err{color:#E06A3F; font-size:12px; padding:14px 0}

  @media (max-width:520px){
    h1{font-size:25px} .premise{font-size:16.5px}
    .field{grid-template-columns:1fr; gap:1px; padding:6px 0}
  }
  @media (prefers-reduced-motion:reduce){
    *{animation:none !important; transition:none !important}
  }
</style>
</head>
<body>
<div class="shell">

  <header>
    <div class="mark">odd<span>spark</span></div>
    <div class="live"><span class="dot"></span><span id="live">${esc(liveClass)}</span> &middot; SUN NOW</div>
  </header>

  <div class="strike-row">
    <button class="strike" id="strike">Strike</button>
    <div class="strike-note">One idea, seeded by the sun and a randomness beacon. Same window, same spark.</div>
  </div>

  <div class="err" id="err" hidden></div>

  <article class="idea" id="idea" hidden>
    <h1 id="headline"></h1>
    <p class="premise" id="premise"></p>
    <div class="question"><b>?</b><span id="question"></span></div>
    <div class="chips" id="chips"></div>
  </article>

  <section class="viz">
    <h2>Seed Geometry</h2>
    <div class="stage" id="stage"><canvas id="cv"></canvas></div>
    <div class="legend" id="legend"></div>
  </section>

  <section class="prov" id="prov" hidden>
    <h2>Provenance</h2>
    <dl>
      <div class="field"><dt>drand round</dt><dd class="cool" id="f-round">&mdash;</dd></div>
      <div class="field"><dt>signature</dt><dd class="cool" id="f-sig">&mdash;</dd></div>
      <div class="field"><dt>randomness</dt><dd class="cool" id="f-rand">&mdash;</dd></div>
      <div class="field"><dt>xray flux</dt><dd class="hot" id="f-flux">&mdash;</dd></div>
      <div class="field"><dt>flare class</dt><dd class="hot" id="f-class">&mdash;</dd></div>
      <div class="field"><dt>observed</dt><dd id="f-time">&mdash;</dd></div>
      <div class="field"><dt>seed</dt><dd id="f-seed">&mdash;</dd></div>
    </dl>
    <div class="formula">
      seed = <b>SHA256( randomness : round : flux : time_tag )</b><br>
      Recompute it yourself; every input above is published and archived.
    </div>
  </section>

  <footer>
    <span id="foot-links"></span>
    <a href="/how">how does this work?</a>
    <span>drand &middot; NOAA SWPC</span>
    <span id="meter"></span>
  </footer>

</div>

<script>
(function(){
  var BOOT = ${boot};
  var LIVE = ${liveJson};
  var HEX = "0123456789abcdef";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = function(id){ return document.getElementById(id); };
  var btn = el("strike");

  console.log(
    "%c oddspark %c the randomness has a receipt ",
    "background:#C9A227;color:#0B0D10;font-weight:bold;padding:2px 6px",
    "background:#101419;color:#6E8FB8;padding:2px 6px"
  );
  console.log("seed = SHA256( randomness : round : flux : time_tag )");
  console.log("verify: https://api.drand.sh/v2/beacons/quicknet/rounds/latest");
  console.log("json:   /api/spark/<id>");

  // live neuron meter in the footer; silent if the readout fails
  fetch("/api/meter")
    .then(function(r){ return r.json(); })
    .then(function(m){
      var node = el("meter");
      if (!node || typeof m.used !== "number") return;
      node.textContent =
        "ai · " + Math.round(m.used) + " / " + m.free + " neurons today · " +
        String(m.model).split("/").pop();
    })
    .catch(function(){});

  function scramble(node, finalText, delay){
    if (reduce || !finalText) { node.textContent = finalText || ""; return; }
    var steps = 9, i = 0;
    setTimeout(function(){
      var t = setInterval(function(){
        i++;
        if (i >= steps) {
          clearInterval(t);
          node.textContent = finalText;
          return;
        }
        var out = "";
        for (var k = 0; k < Math.min(finalText.length, 44); k++) {
          out += finalText[k] === " " ? " " : HEX[Math.floor(Math.random() * 16)];
        }
        node.textContent = out;
      }, 34);
    }, delay);
  }

  function shorten(s, n){
    if (!s) return "";
    return s.length > n ? s.slice(0, n) + "\\u2026" : s;
  }

  function render(s, push){
    el("err").hidden = true;
    el("idea").hidden = false;
    el("prov").hidden = false;

    el("headline").textContent = s.idea.headline;
    el("premise").textContent = s.idea.premise;
    el("question").textContent = s.idea.question || "";

    var chips = [
      ["domain", s.seed.domain],
      ["lens", s.seed.lens],
      ["form", s.seed.form],
      ["constraint", s.seed.friction]
    ];
    el("chips").innerHTML = chips.map(function(c){
      return '<span class="chip"><i>' + c[0] + '</i>' + esc(c[1]) + '</span>';
    }).join("");

    var fields = [
      ["f-round", String(s.entropy.round)],
      ["f-sig", shorten(s.entropy.signature, 40)],
      ["f-rand", shorten(s.entropy.randomness, 40)],
      ["f-flux", s.solar.flux.toExponential(3) + " W/m\\u00B2"],
      ["f-class", s.solar.class + "  \\u00B7  GOES-" + s.solar.satellite],
      ["f-time", s.solar.time_tag],
      ["f-seed", shorten(s.seed.hash, 40)]
    ];
    fields.forEach(function(f, i){ scramble(el(f[0]), f[1], i * 55); });

    document.documentElement.style.setProperty("--solar", solarColor(s.solar.letter));
    el("live").textContent = s.solar.class;
    VIZ.spark(s);

    var url = "/s/" + s.id;
    el("foot-links").innerHTML =
      '<a href="' + url + '">' + s.id + '</a> \\u00B7 ' +
      '<a href="/api/spark/' + s.id + '">json</a> \\u00B7 ' +
      '<button class="copy" id="cp">copy link</button>';
    el("cp").onclick = function(){
      navigator.clipboard.writeText(location.origin + url);
      el("cp").textContent = "copied";
      setTimeout(function(){ el("cp").textContent = "copy link"; }, 1600);
    };

    if (push) history.pushState({}, "", url);
    document.title = s.idea.headline + " / oddspark";
  }

  function solarColor(letter){
    return { A:"#4A6785", B:"#5E8CA8", C:"#C9A227", M:"#E06A3F", X:"#F2452E" }[letter] || "#C9A227";
  }

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
    });
  }

  /* ---------------------------------------------------------------- *
   * Seed geometry
   *
   * Nothing here is decorative. The shell is the seed: 32 nodes, one
   * per byte of SHA-256, seated on a Fibonacci sphere so the spacing
   * is even, with each node's orbital radius set by its own byte value.
   * The weave stride comes from byte 0. The core is the sun: radius,
   * color and ray count all read off the live GOES X-ray flux.
   *
   * Same seed, same object. The shape is the fingerprint of the spark.
   * Hand-rolled projection; no library, nothing to load.
   * ---------------------------------------------------------------- */
  var VIZ = (function(){
    var cv = el("cv"), stage = el("stage");
    if (!cv || !cv.getContext) return { spark:function(){}, live:function(){} };
    var ctx = cv.getContext("2d");

    var W = 0, H = 0, DPR = 1;
    var nodes = [], edges = [], stride = 7, hasSeed = false;
    var core = { r:0.16, rays:6, letter:"C", cls:"----" };
    var yaw = 0.7, pitch = -0.22, spin = 0.0024, vy = 0, vp = 0;
    var drag = false, lx = 0, ly = 0;
    var assembleAt = 0, running = false;
    var C_SOL = [201,162,39], C_ENT = [110,143,184];

    function hexRGB(h){
      h = h.replace("#","").trim();
      return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
    }
    function rgba(c, a){ return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
    function readColors(){
      var cs = getComputedStyle(document.documentElement);
      var s = cs.getPropertyValue("--solar").trim();
      var e = cs.getPropertyValue("--entropy").trim();
      if (s.charAt(0) === "#") C_SOL = hexRGB(s);
      if (e.charAt(0) === "#") C_ENT = hexRGB(e);
    }

    function resize(){
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      var r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (!running) draw(performance.now());
    }

    function setSeed(hex){
      var bytes = [], i;
      for (i = 0; i < 64; i += 2) bytes.push(parseInt(hex.substr(i,2), 16));
      var N = bytes.length;
      stride = 5 + (bytes[0] % 9);
      var ga = Math.PI * (3 - Math.sqrt(5));
      nodes = [];
      for (i = 0; i < N; i++){
        var y = 1 - (i / (N - 1)) * 2;
        var ring = Math.sqrt(Math.max(0, 1 - y * y));
        var th = ga * i;
        nodes.push({
          bx: Math.cos(th) * ring, by: y, bz: Math.sin(th) * ring,
          rad: 0.60 + (bytes[i] / 255) * 0.58,
          dot: 1.0 + (bytes[i] & 7) * 0.32,
          lit: 0.34 + (bytes[i] / 255) * 0.5
        });
      }
      edges = [];
      for (i = 0; i < N; i++){
        edges.push([i, (i + 1) % N]);
        edges.push([i, (i + stride) % N]);
      }
      hasSeed = true;
      assembleAt = performance.now();
    }

    function setCore(letter, cls, flux){
      var e = Math.log(Math.max(flux || 1e-8, 1e-9)) / Math.LN10;
      var t = Math.min(1, Math.max(0, (e + 8) / 4.5));
      core.r = 0.150 + t * 0.200;
      core.rays = 5 + Math.round(t * 11);
      core.letter = letter || "C";
      core.cls = cls || "----";
      readColors();
    }

    function legend(seedHex){
      var L = [];
      L.push('<div><b>core</b><span>GOES X-ray flux <em>' + esc(core.cls) + '</em></span></div>');
      if (hasSeed){
        L.push('<div><b>shell</b><span>32 nodes, one per byte of the seed</span></div>');
        L.push('<div><b>radius</b><span>each node sits at its own byte value</span></div>');
        L.push('<div><b>weave</b><span>stride <u>' + stride + '</u>, taken from byte 0</span></div>');
        L.push('<div><b>id</b><span><u>' + esc((seedHex || "").slice(0,8)) + '</u></span></div>');
      } else {
        L.push('<div><b>shell</b><span>awaiting a seed</span></div>');
      }
      L.push('<div><b></b><span>drag to rotate</span></div>');
      el("legend").innerHTML = L.join("");
    }

    // rotate, project, depth-sort, paint
    function draw(now){
      if (!W) return;
      ctx.clearRect(0, 0, W, H);

      if (!drag && !reduce){
        yaw += spin + vy; pitch += vp;
        vy *= 0.93; vp *= 0.93;
        pitch = Math.max(-1.15, Math.min(1.15, pitch));
      }

      var cx = W / 2, cy = H / 2;
      var dist = 3.15, fov = Math.min(W, H) * 0.60;
      var cy1 = Math.cos(yaw), sy1 = Math.sin(yaw);
      var cp1 = Math.cos(pitch), sp1 = Math.sin(pitch);

      var grow = 1, fade = 1;
      if (hasSeed && !reduce){
        var p = Math.min(1, (now - assembleAt) / 950);
        var ease = 1 - Math.pow(1 - p, 3);
        grow = 2.9 - 1.9 * ease;
        fade = ease;
      }

      var pulse = reduce ? 1 : 0.86 + 0.14 * Math.sin(now / 1100);

      function xform(x, y, z){
        var x1 = x * cy1 + z * sy1, z1 = -x * sy1 + z * cy1;
        var y2 = y * cp1 - z1 * sp1, z2 = y * sp1 + z1 * cp1;
        var cz = z2 + dist;
        var k = fov / Math.max(cz, 0.25);
        return { x: cx + x1 * k, y: cy + y2 * k, z: cz, k: k / fov };
      }

      // transform the shell
      var pts = [], i;
      for (i = 0; i < nodes.length; i++){
        var n = nodes[i], r = n.rad * grow;
        pts.push(xform(n.bx * r, n.by * r, n.bz * r));
      }

      // everything gets sorted against the core plane so the sun occludes properly
      var items = [];
      for (i = 0; i < edges.length; i++){
        var a = pts[edges[i][0]], b = pts[edges[i][1]];
        if (!a || !b) continue;
        items.push({ z: (a.z + b.z) / 2, kind: 0, a: a, b: b,
                     lit: (nodes[edges[i][0]].lit + nodes[edges[i][1]].lit) / 2 });
      }
      for (i = 0; i < pts.length; i++){
        items.push({ z: pts[i].z, kind: 1, p: pts[i], n: nodes[i] });
      }
      items.sort(function(u, v){ return v.z - u.z; });

      var coreR = core.r * fov / dist;

      function paintCore(){
        // corona
        var g = ctx.createRadialGradient(cx, cy, coreR * 0.15, cx, cy, coreR * 3.9);
        g.addColorStop(0, rgba(C_SOL, 0.60 * pulse));
        g.addColorStop(0.30, rgba(C_SOL, 0.20 * pulse));
        g.addColorStop(1, rgba(C_SOL, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // rays, count and reach follow the flare class
        ctx.lineWidth = 1;
        for (var r = 0; r < core.rays; r++){
          var ang = (r / core.rays) * Math.PI * 2 + yaw * 0.55;
          var len = coreR * (1.9 + 1.5 * Math.abs(Math.sin(r * 2.3 + now / 1600)));
          ctx.strokeStyle = rgba(C_SOL, 0.34 * pulse);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * coreR * 1.15, cy + Math.sin(ang) * coreR * 1.15);
          ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
          ctx.stroke();
        }

        // body
        var b = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
        b.addColorStop(0, rgba([255,255,255], 0.92));
        b.addColorStop(0.4, rgba(C_SOL, 0.95));
        b.addColorStop(1, rgba(C_SOL, 0.55));
        ctx.fillStyle = b;
        ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
      }

      var painted = false;
      for (i = 0; i < items.length; i++){
        var it = items[i];
        if (!painted && it.z < dist){ paintCore(); painted = true; }
        var depth = Math.max(0.22, Math.min(1, (dist + 1.25 - it.z) / 2.2));
        if (it.kind === 0){
          ctx.strokeStyle = rgba(C_ENT, (0.10 + it.lit * 0.46) * depth * fade);
          ctx.lineWidth = 0.7 + depth * 0.8;
          ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); ctx.stroke();
        } else {
          var rr = it.n.dot * depth * 1.75;
          ctx.fillStyle = rgba(C_ENT, (0.46 + it.n.lit * 0.54) * depth * fade);
          ctx.beginPath(); ctx.arc(it.p.x, it.p.y, rr, 0, Math.PI * 2); ctx.fill();
          // a touch of specular on the nearest nodes so the shell reads as 3D
          if (depth > 0.8){
            ctx.fillStyle = rgba([233, 240, 247], (depth - 0.8) * 2.4 * fade);
            ctx.beginPath(); ctx.arc(it.p.x, it.p.y, rr * 0.42, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      if (!painted) paintCore();
    }

    function loop(now){
      draw(now);
      if (running) requestAnimationFrame(loop);
    }
    function start(){
      if (running || reduce) return;
      running = true; requestAnimationFrame(loop);
    }
    function stop(){ running = false; }

    // drag to rotate, with a little inertia
    stage.addEventListener("pointerdown", function(e){
      drag = true; lx = e.clientX; ly = e.clientY;
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener("pointermove", function(e){
      if (!drag) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      yaw += dx * 0.008; pitch += dy * 0.006;
      pitch = Math.max(-1.15, Math.min(1.15, pitch));
      vy = dx * 0.0016; vp = dy * 0.0012;
      if (reduce) draw(performance.now());
    });
    function release(e){
      if (!drag) return;
      drag = false;
      try { stage.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
    else window.addEventListener("resize", resize);

    document.addEventListener("visibilitychange", function(){
      if (document.hidden) stop(); else start();
    });

    readColors();
    resize();
    start();

    return {
      spark: function(s){
        setCore(s.solar.letter, s.solar.class, s.solar.flux);
        setSeed(s.seed.hash);
        legend(s.seed.hash);
        if (reduce) draw(performance.now());
      },
      live: function(l){
        setCore(l ? l.letter : "C",
                l ? l.letter + l.magnitude.toFixed(1) : "----",
                l ? l.flux : 1e-6);
        legend(null);
        if (reduce) draw(performance.now());
      }
    };
  })();

  btn.onclick = function(){
    btn.disabled = true;
    btn.textContent = "Striking";
    fetch("/api/spark", { method:"POST" })
      .then(function(r){
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function(s){ render(s, true); })
      .catch(function(e){
        el("err").hidden = false;
        el("err").textContent = "No spark. A feed did not answer: " + e.message + ". Try again.";
      })
      .finally(function(){
        btn.disabled = false;
        btn.textContent = "Strike again";
      });
  };

  if (BOOT) {
    render(BOOT, false);
    btn.textContent = "Strike again";
  } else {
    VIZ.live(LIVE);
  }
})();
</script>
</body>
</html>`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ------------------------------------------------------------------ *
 * How it works. Mermaid from CDN; if the CDN is down the raw diagram
 * source is still legible in the <pre> blocks. No build step.
 * ------------------------------------------------------------------ */

function howPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>how oddspark works / oddspark</title>
<meta name="description" content="The plumbing behind oddspark: drand randomness, solar X-ray flux, one SHA-256, and a 5 minute window.">
<link rel="canonical" href="https://oddspark.dev/how">
<meta property="og:type" content="website">
<meta property="og:site_name" content="oddspark">
<meta property="og:title" content="how oddspark works / oddspark">
<meta property="og:description" content="The plumbing behind oddspark: drand randomness, solar X-ray flux, one SHA-256, and a 5 minute window.">
<meta property="og:url" content="https://oddspark.dev/how">
<meta property="og:image" content="https://oddspark.dev/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="how oddspark works / oddspark">
<meta name="twitter:description" content="The plumbing behind oddspark: drand randomness, solar X-ray flux, one SHA-256, and a 5 minute window.">
<meta name="twitter:image" content="https://oddspark.dev/og.png">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
  :root{
    --void:#0B0D10; --panel:#101419; --rule:#1D242C;
    --text:#C6CFD8; --dim:#67737F; --faint:#3D4750;
    --entropy:#6E8FB8; --solar:#C9A227;
    --mono:"Courier Prime",ui-monospace,SFMono-Regular,Menlo,monospace;
    --serif:"Newsreader",Georgia,serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:var(--void); color:var(--text);
    font-family:var(--mono); font-size:14px; line-height:1.6;
    -webkit-font-smoothing:antialiased;
    display:flex; justify-content:center;
    padding:0 20px 80px;
  }
  .shell{width:100%; max-width:760px}
  header{
    display:flex; align-items:center; justify-content:space-between;
    gap:16px; padding:22px 0 18px; border-bottom:1px solid var(--rule);
  }
  .mark{font-weight:700; letter-spacing:.14em; text-transform:lowercase; font-size:13px}
  .mark span{color:var(--solar)}
  a{color:var(--entropy); text-decoration:none}
  a:hover{border-bottom:1px solid var(--entropy)}
  header a{font-size:11px; letter-spacing:.1em}
  h1{
    font-family:var(--serif); font-weight:400; font-size:31px; line-height:1.24;
    margin:44px 0 14px; color:#E4EAF0; letter-spacing:-.01em;
  }
  .lede{font-family:var(--serif); font-size:18px; line-height:1.62; margin:0 0 8px}
  section{border-top:1px solid var(--rule); margin-top:44px; padding-top:20px}
  h2{
    font-size:10.5px; letter-spacing:.24em; text-transform:uppercase;
    color:var(--dim); font-weight:400; margin:0 0 14px;
  }
  p{font-family:var(--serif); font-size:16.5px; line-height:1.62; margin:0 0 18px}
  p code, li code{font-family:var(--mono); font-size:.85em; color:var(--solar)}
  .diagram{
    background:var(--panel); border:1px solid var(--rule);
    padding:22px 16px; margin:18px 0 26px; overflow-x:auto;
  }
  .mermaid{display:flex; justify-content:center; min-width:520px}
  footer{
    margin-top:44px; padding-top:18px; border-top:1px solid var(--rule);
    display:flex; flex-wrap:wrap; gap:8px 22px; font-size:11px; color:var(--faint);
  }
</style>
</head>
<body>
<div class="shell">

  <header>
    <div class="mark">odd<span>s</span>park</div>
    <a href="/">&larr; back to the button</a>
  </header>

  <h1>How does this work?</h1>
  <p class="lede">One button, one recommendation, and a receipt. The recommendation
  is a deterministic function of two live public feeds, so anyone can recompute
  the seed and confirm the spark was not invented after the fact.</p>

  <section>
    <h2>1 &middot; What happens when you press Strike</h2>
    <p>The Worker asks drand for the latest round and floors it to a multiple of
    100. Quicknet emits a round every 3 seconds, so that is a 5 minute window:
    the first strike in a window does the work, every later strike in the same
    window serves the same cached spark out of KV. A thousand visitors in five
    minutes cost one generation.</p>
    <div class="diagram"><pre class="mermaid">
sequenceDiagram
  autonumber
  participant B as Browser
  participant W as Worker
  participant D as drand quicknet
  participant N as NOAA SWPC
  participant K as Workers KV
  participant A as Workers AI
  B->>W: POST /api/spark
  W->>D: GET /rounds/latest
  D-->>W: round R
  Note over W: window = R - (R mod 100)
  W->>K: GET w:window
  alt already struck this window
    K-->>W: spark id
    W->>K: GET spark
    K-->>W: stored spark
    W-->>B: cached spark
  else first strike of the window
    W->>D: GET /rounds/window
    D-->>W: signature
    W->>N: GET xrays-1-day.json
    N-->>W: flux + time_tag
    Note over W: randomness = SHA256(signature)<br/>seed = SHA256(randomness : round : flux : time_tag)
    W->>A: run the model of the day on the four seed axes
    A-->>W: headline, premise, question
    Note over W,A: usage.neurons added to a Durable Object counter<br/>past 2,500/day the cheaper fallback model takes over
    W->>K: PUT spark + w:window pointer
    W-->>B: fresh spark
  end
    </pre></div>
  </section>

  <section>
    <h2>2 &middot; The seed derivation</h2>
    <p>Drand&rsquo;s own definition of randomness for unchained beacons like quicknet
    is the SHA-256 of the round signature. That, the floored round number, the
    current GOES X-ray flux, and its timestamp are hashed once more. Every input
    is published and archived by someone else, so the whole chain is reproducible
    by a third party. On a toy. That is the joke.</p>
    <div class="diagram"><pre class="mermaid">
flowchart LR
  sig["drand signature<br/>round floored to 100"] --> rnd["randomness = SHA256(signature)"]
  flx["GOES X-ray flux<br/>0.1-0.8nm + time_tag"] --> seed
  rnd --> seed["seed = SHA256(randomness : round : flux : time_tag)"]
  seed --> id["id = seed[0:8]<br/>the permalink"]
  seed --> axes["bytes 0-3 pick<br/>domain / lens / form / friction"]
  axes --> ai["Workers AI prompt<br/>one recommendation"]
    </pre></div>
  </section>

  <section>
    <h2>3 &middot; Same seed, same object</h2>
    <p>The panel beside the text is not decoration; it is the seed rendered as an
    object. The sun core reads the live flux. The shell seats one node per byte of
    the hash on a Fibonacci sphere, each byte setting its own node&rsquo;s orbital
    radius, and byte 0 sets the weave stride. A permalink always draws the
    identical form. Hand-rolled projection and painter&rsquo;s-algorithm depth
    sorting on a 2D canvas; no rendering library.</p>
    <div class="diagram"><pre class="mermaid">
flowchart TD
  seed["seed: 32 bytes"] --> shell["shell: 32 nodes, one per byte"]
  shell --> pos["position: Fibonacci sphere, even spacing"]
  shell --> rad["orbital radius: each byte's own value"]
  seed --> weave["byte 0: weave stride, the lacing pattern"]
  flx["live X-ray flux"] --> core["core: radius, color, ray count"]
  pos --> canvas["2D canvas<br/>hand-rolled projection + depth sort"]
  rad --> canvas
  weave --> canvas
  core --> canvas
    </pre></div>
  </section>

  <section>
    <h2>4 &middot; Routing, and the artifact curl sees</h2>
    <p>The Worker sniffs <code>User-Agent</code> and <code>Accept</code>. A browser
    gets the page; curl and wget get a plain-text rendering with the full
    provenance block, an artifact the browser never shows.</p>
    <div class="diagram"><pre class="mermaid">
flowchart TD
  req["request"] --> which{"path"}
  which -->|"/"| home{"who is asking?"}
  home -->|"browser (Accept: text/html)"| html["the page + canvas"]
  home -->|"curl / wget / no html"| text["strike + text/plain<br/>idea + full provenance"]
  which -->|"/s/:id"| perm["permalink, server-hydrated<br/>curl gets text here too"]
  which -->|"POST /api/spark"| strike["strike; full JSON with provenance"]
  which -->|"/api/spark/:id"| raw["one stored spark, raw JSON"]
  which -->|"/api/sun"| sun["current flare class only"]
    </pre></div>
  </section>

  <footer>
    <a href="/">oddspark.dev</a>
    <span>drand &middot; NOAA SWPC &middot; Workers AI</span>
    <span>diagrams: mermaid via CDN</span>
  </footer>

</div>

<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
mermaid.initialize({
  startOnLoad: true,
  securityLevel: "strict",
  theme: "base",
  themeVariables: {
    background: "#0B0D10",
    primaryColor: "#101419",
    primaryTextColor: "#C6CFD8",
    primaryBorderColor: "#3D4750",
    lineColor: "#67737F",
    secondaryColor: "#101419",
    tertiaryColor: "#0B0D10",
    clusterBkg: "#0B0D10",
    edgeLabelBackground: "#101419",
    actorBkg: "#101419",
    actorBorder: "#3D4750",
    actorTextColor: "#C6CFD8",
    actorLineColor: "#3D4750",
    signalColor: "#C6CFD8",
    signalTextColor: "#C6CFD8",
    noteBkgColor: "#101419",
    noteBorderColor: "#3D4750",
    noteTextColor: "#C6CFD8",
    fontFamily: "'Courier Prime', monospace",
    fontSize: "13px"
  }
});
</script>
</body>
</html>`;
}


/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

function wantsText(req) {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const accept = req.headers.get("accept") || "";
  if (/^(curl|wget|httpie|http)\b/.test(ua)) return true;
  return !accept.includes("text/html") && !accept.includes("*/*");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const origin = url.origin;

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      // JSON for an existing spark
      if (path.startsWith("/api/spark/")) {
        const id = path.split("/").pop();
        const s = await env.SPARKS.get(id, { type: "json" });
        if (!s) return json({ error: "no spark with that id" }, 404);
        return json(s);
      }

      // Strike
      if (path === "/api/spark") {
        const s = await buildSpark(env);
        return json(s);
      }

      // Live solar readout only
      if (path === "/api/sun") {
        return json(await readSolar());
      }

      // Neuron meter readout: today's spend and which model is active
      if (path === "/api/meter") {
        const used = await neuronsUsedToday(env);
        return json({
          day: neuronDay(),
          used,
          free: NEURON_FREE_DAILY,
          fallback_at: NEURON_FREE_DAILY * NEURON_FALLBACK_FRACTION,
          model: modelFor(env, used),
        });
      }

      // Permalink
      if (path.startsWith("/s/")) {
        const id = path.split("/").pop();
        const s = await env.SPARKS.get(id, { type: "json" });
        if (!s) return Response.redirect(origin + "/", 302);
        if (wantsText(request)) {
          return new Response(asText(s, origin), {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        return new Response(page(s, { letter: s.solar.letter, magnitude: parseFloat(s.solar.class.slice(1)) }), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      // How it works
      if (path === "/how") {
        return new Response(howPage(), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
        });
      }

      // Home
      if (path === "/") {
        if (wantsText(request)) {
          const s = await buildSpark(env);
          const used = await neuronsUsedToday(env);
          return new Response(asText(s, origin, { used, model: modelFor(env, used) }), {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        let live = null;
        try {
          live = await readSolar();
        } catch (e) {
          /* masthead degrades to ---- */
        }
        return new Response(page(null, live), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }

      return new Response("404", { status: 404 });
    } catch (err) {
      if (path.startsWith("/api/")) return json({ error: String(err.message || err) }, 502);
      return new Response("A feed did not answer: " + (err.message || err), { status: 502 });
    }
  },
};
