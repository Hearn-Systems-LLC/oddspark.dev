// Lossless legacy Spark presentation (Story 1.24). This is a READER, not a
// revival: it renders a stored legacy artifact from its own fields and never
// converts, migrates, or fabricates it into a Brief. Every entry point
// consumes only a `supported` legacy classification from
// classifyCompatibleArtifact (src/pipeline/receipts.mjs) — anything else
// throws so callers fail closed before render and before any metric. Legacy
// kind membership comes from the single shared set exported by the receipts
// module; the projection's kind is the authoritative classification kind.
//
// The view model reproduces the pre-1.14 worker (9946847): the
// headline/premise/question slots, the personalized site-context block
// (site-summary / observation / warning), the domain/lens/form/constraint
// chips, the seven provenance rows, and the seed-formula footer; asText
// reproduces the plain-text rendering line for line. Every interpolated
// value is HTML-escaped; no Brief field is ever emitted.

import { defensiveFreeze, isLegacyArtifactKind } from "./receipts.mjs";
import { sha256Hex } from "./contracts.mjs";

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

// Code-point safe: an astral character straddling the cut must not emit a
// lone surrogate.
const shorten = (value, limit) => {
  const chars = [...String(value)];
  return chars.length > limit ? chars.slice(0, limit).join("") + "…" : String(value);
};

// Accepts the classification object and returns the frozen legacy artifact,
// failing closed on anything that is not a supported legacy classification.
function legacyValue(classification) {
  if (!classification || typeof classification !== "object" || classification.status !== "supported"
      || !isLegacyArtifactKind(classification.kind)) {
    throw new TypeError("legacy spark unavailable");
  }
  return classification.value;
}

// Numeric guards: the classification seam validates flux as a finite number,
// but rendering never trusts a number blindly — a non-finite flux or meter
// value degrades its own line rather than throwing NaN into the page.
const fluxLabel = (flux) => Number.isFinite(flux) ? flux.toExponential(3) : "n/a";

export function legacySparkJson(classification, { cached } = {}) {
  const spark = legacyValue(classification);
  return cached === undefined ? spark : defensiveFreeze({ ...spark, cached: cached === true });
}

export function projectLegacySpark(classification) {
  const spark = legacyValue(classification);
  return defensiveFreeze({
    kind: "legacy",
    legacy_kind: classification.kind,
    id: spark.id,
    geometry: defensiveFreeze({
      version: 1,
      hash: sha256Hex(`oddspark-seed-geometry/v1\0${classification.kind}\0${spark.id}`),
    }),
    title: spark.idea.headline,
    premise: spark.idea.premise,
    share: defensiveFreeze({ id: spark.id, path: `/s/${encodeURIComponent(spark.id)}` }),
  });
}

function siteContextMarkup(spark) {
  const p = spark.personalization;
  if (!p) return "";
  const personalized = p.status === "personalized";
  const summary = personalized
    ? `Public pages from ${p.domain} · ${p.vertical}`
    : `Website context · ${p.domain || "not scanned"}`;
  const observation = personalized ? `<p class="site-observation" id="site-observation">${escapeHtml(`Observed on ${p.observation.url}: ${p.observation.text}`)}</p>` : "";
  const warning = p.warning ? `<p class="site-warning" id="site-warning">${escapeHtml(p.warning)}</p>` : "";
  return `<div class="site-context" id="site-context"><p id="site-summary">${escapeHtml(summary)}</p>${observation}${warning}</div>`;
}

function chipsMarkup(spark) {
  const personalized = spark.personalization?.status === "personalized";
  const chips = [
    ["domain", personalized ? spark.personalization.vertical : spark.seed.domain],
    ["lens", spark.seed.lens],
    ["form", personalized ? spark.personalization.what.adapted : spark.seed.form],
    ["constraint", spark.seed.friction],
  ];
  return `<div class="chips" id="chips">${chips.map(([label, value]) => `<span class="chip"><i>${label}</i>${escapeHtml(value)}</span>`).join("")}</div>`;
}

function provenanceMarkup(spark) {
  const rows = [
    ["drand round", "cool", String(spark.entropy.round)],
    ["signature", "cool", shorten(spark.entropy.signature, 40)],
    ["randomness", "cool", shorten(spark.entropy.randomness, 40)],
    ["xray flux", "hot", `${fluxLabel(spark.solar.flux)} W/m²`],
    ["flare class", "hot", `${spark.solar.class}  ·  GOES-${spark.solar.satellite}`],
    ["observed", "", spark.solar.time_tag],
    ["seed", "", shorten(spark.seed.hash, 40)],
  ];
  const fields = rows.map(([label, tone, value]) =>
    `<div class="field"><dt>${label}</dt><dd${tone ? ` class="${tone}"` : ""}>${escapeHtml(value)}</dd></div>`
  ).join("");
  return `<section class="prov"><h2>Provenance</h2><dl>${fields}</dl><div class="formula">seed = <b>SHA256( randomness : round : flux : time_tag )</b><br>Recompute it yourself; every input above is published and archived.</div></section>`;
}

export function renderLegacySparkMarkup(classification) {
  const spark = legacyValue(classification);
  return [
    `<h1 id="headline" tabindex="-1">${escapeHtml(spark.idea.headline)}</h1>`,
    `<p class="premise" id="premise">${escapeHtml(spark.idea.premise)}</p>`,
    `<div class="question"><b>?</b><span id="question">${escapeHtml(spark.idea.question)}</span></div>`,
    siteContextMarkup(spark),
    chipsMarkup(spark),
    provenanceMarkup(spark),
  ].join("");
}

export function legacySparkPresentation(classification) {
  return defensiveFreeze({ projection: projectLegacySpark(classification), markup: renderLegacySparkMarkup(classification) });
}

function wrap(text, width) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      // Flush the current line before resetting; a single over-width word
      // starts fresh instead of pushing an empty line.
      if (current.trim()) lines.push(current.trim());
      current = word;
    } else {
      current += " " + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

// The pre-1.14 plain-text rendering, line for line. `origin` prefixes the
// JSON and permalink links; `meter` ({used, free, model}) is optional and
// adds the neuron readout line exactly as the legacy home-text strike did —
// but only when `used` and `free` are finite numbers, so a degraded meter
// readout can never render NaN.
export function legacySparkAsText(classification, origin, meter) {
  const s = legacyValue(classification);
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
  L.push("    xray flux      " + fluxLabel(s.solar.flux) + " W/m2  (" + s.solar.band + ")");
  L.push("    flare class    " + s.solar.class + "  GOES-" + s.solar.satellite);
  L.push("    observed       " + s.solar.time_tag);
  L.push("    seed           " + s.seed.hash);
  if (s.personalization && s.personalization.status === "personalized") {
    L.push("    website        " + s.personalization.domain);
    L.push("    vertical       " + s.personalization.vertical);
    L.push("    scanned        " + s.personalization.scanned_urls.join(", "));
    L.push("    observation    " + s.personalization.observation.text);
    L.push("    evidence URL   " + s.personalization.observation.url);
    L.push("    adapted WHAT   " + s.personalization.what.adapted);
    L.push("    profile hash   " + s.personalization.profile_hash);
  }
  if (s.personalization && s.personalization.warning) {
    L.push("    warning        " + s.personalization.warning);
  }
  if (meter && Number.isFinite(meter.used) && Number.isFinite(meter.free)) {
    L.push("    ai meter       " + meter.used.toFixed(1) + " / " + meter.free + " neurons today  (" + String(meter.model).split("/").pop() + ")");
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
