const normalize = (value) => String(value).replace(/<[^>]*>/g, " ").replace(/&middot;/g, "·").replace(/&rsquo;/g, "’").replace(/\s+/g, " ").trim();

export const HOW_PAGE_FLOWS = Object.freeze({
  pipeline: Object.freeze([
    ["evidence", "Evidence. Assemble an immutable, allowlisted grounding bundle."],
    ["generate", "Generate. Ask the active generation role for one Candidate."],
    ["local-gate", "Local Gate. Check schema, grounding, privacy, names, and number provenance without another model call."],
    ["judge", "Judge. Independently assess all nine gates, tone, and claims."],
    ["commit", "Commit. Ask COORD to authoritatively accept one qualified Brief."],
    ["render", "Render. Show only the committed Brief and its permitted receipt details."],
  ]),
  privacy: Object.freeze([
    ["allowlisted-inputs", "Use allowlisted inputs. Build Evidence only from approved local priors and permitted public observations."],
    ["privacy-boundary", "Keep the boundary. Exclude private sources, personal information, raw pages, and rejected Candidates before persistence or model use."],
    ["seed-separation", "Separate the seed. Pass the published seed to Generate as transparent input, not as Evidence or a reproduction guarantee."],
    ["evidence-ledger", "Count Evidence calls. Any metered Evidence request consumes the same shared call ledger used by generation and judging."],
  ]),
  attempts: Object.freeze([
    ["shared-cap", "Share six calls. Evidence, Generate, and Judge debit one request-level ledger capped at six model calls."],
    ["complete-pairs", "Start complete pairs only. A Candidate attempt begins only when both its Generate and Judge calls fit inside the budget and deadline."],
    ["qualified-result", "Use a qualified result. A Candidate proceeds only after both the Local Gate and Judge pass it."],
    ["house-fallback", "Fall back safely. On failure or exhaustion, select an approved house Brief only when its catalog authority is valid and COORD can safely commit it. A house Brief is curated content, not another model."],
  ]),
  receipt: Object.freeze([
    ["coord-authority", "Trust COORD. COORD alone claims, reads, commits, and counts served outcomes."],
    ["kv-projection", "Treat KV as projection-only. KV may support compatible reads but cannot authorize a commit."],
    ["bounded-receipt", "Read the receipt narrowly. It references the approved Evidence and binds the committed artifact; receipt-proof claims remain off until an active ReceiptClaimManifest authorizes exact wording."],
    ["nondeterminism", "Expect nondeterminism. The same published seed can lead a model to different valid wording on another run."],
  ]),
});

export const HOW_PAGE_REQUIRED_COPY = Object.freeze([
  "Evidence-to-Render pipeline",
  "shared call ledger used by generation and judging",
  "approved house Brief only when its catalog authority is valid and COORD can safely commit it",
  "Private sources, personal information, raw pages, and rejected Candidates are excluded before persistence or model use",
  "COORD alone claims, reads, commits, and counts served outcomes",
  "KV as projection-only",
  "active ReceiptClaimManifest",
  "Model output is nondeterministic",
]);

export const HOW_PAGE_PROHIBITED_COPY = Object.freeze([
  /four[- ]axis/i,
  /random axes/i,
  /same window,? same spark/i,
  /recompute it yourself/i,
  /reproducible by (?:a )?third part(?:y|ies)/i,
  /anyone can (?:recompute|reproduce|verify)/i,
  /third part(?:y|ies) can (?:recompute|reproduce|verify)/i,
  /same (?:seed|window)[^.]{0,40}(?:same|identical|exact) (?:brief|output|result|spark|words)/i,
  /seed[^.]{0,40}(?:guarantees?|proves?|recreates?) (?:the )?(?:brief|output|result|spark|words)/i,
  /house brief[^.]{0,40}model fallback/i,
]);

function oneMatch(source, pattern, label, errors) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) errors.push(`${label}: expected exactly one match, found ${matches.length}`);
  return matches[0];
}

export function visibleHowPageProse(html) {
  const source = String(html);
  const metadata = [
    ...[...source.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((match) => match[1]),
    ...[...source.matchAll(/<meta\b(?=[^>]*name=["']description["'])[^>]*content=["']([^"']*)["'][^>]*>/gi)].map((match) => match[1]),
  ].join(" ");
  return normalize(`${metadata} ${source
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<head\b[\s\S]*?<\/head>/gi, " ")
    .replace(/<div\b(?=[^>]*class="diagram-scroll")(?=[^>]*\shidden(?=[\s>]))[^>]*>[\s\S]*?<\/div>/gi, " ")}`);
}

export function validateHowPage(html) {
  const source = String(html);
  const visibleProse = visibleHowPageProse(source);
  const errors = [];

  for (const text of HOW_PAGE_REQUIRED_COPY) {
    if (!visibleProse.includes(text)) errors.push(`required visible copy missing: ${text}`);
  }
  for (const pattern of HOW_PAGE_PROHIBITED_COPY) {
    if (pattern.test(visibleProse)) errors.push(`prohibited public claim or legacy copy matched ${pattern}`);
  }

  for (const [flow, expectedSteps] of Object.entries(HOW_PAGE_FLOWS)) {
    const scroller = oneMatch(source, new RegExp(`<div\\b(?=[^>]*class="diagram-scroll")(?=[^>]*data-diagram="${flow}")(?=[^>]*role="region")(?=[^>]*tabindex="-1")(?=[^>]*aria-label="Scrollable diagram: [^"]+")(?=[^>]*\\shidden(?=[\\s>]))[^>]*>([\\s\\S]*?)<\\/div>`, "g"), `diagram ${flow}`, errors);
    if (scroller) {
      const body = scroller[1];
      if (!/<figure class="diagram-figure" aria-hidden="true">/.test(body)) errors.push(`diagram ${flow}: figure must remain hidden from assistive technology`);
      if (!/<pre class="mermaid">[\s\S]*accTitle:[\s\S]*accDescr:[\s\S]*<\/pre>/.test(body)) errors.push(`diagram ${flow}: Mermaid title or description missing`);
    }

    const list = oneMatch(source, new RegExp(`<ol class="flow" data-flow="${flow}">([\\s\\S]*?)<\\/ol>`, "g"), `fallback ${flow}`, errors);
    if (!list) continue;
    const actualSteps = [...list[1].matchAll(/<li data-step="([^"]+)">([\s\S]*?)<\/li>/g)].map((match) => [match[1], normalize(match[2])]);
    if (JSON.stringify(actualSteps) !== JSON.stringify(expectedSteps)) errors.push(`fallback ${flow}: exact ordered steps drifted`);
  }

  if ((source.match(/<figure class="diagram-figure" aria-hidden="true">/g) || []).length !== 4) errors.push("expected four aria-hidden diagram figures");
  if ((source.match(/<ol class="flow" data-flow=/g) || []).length !== 4) errors.push("expected four ordered text equivalents");
  if (/<noscript\b/i.test(source)) errors.push("ordered flows make noscript content unnecessary");
  if (!source.includes(".mermaid:not([data-processed]){visibility:hidden}")) errors.push("raw Mermaid source must remain hidden before processing");
  if (!source.includes('https://cdn.jsdelivr.net/npm/mermaid@11.17.0/dist/mermaid.min.js')) errors.push("Mermaid must remain pinned to the reviewed exact distributable version");
  if (!source.includes("--border-strong:#7E8B98") || !source.includes('lineColor: "#7E8B98"')) errors.push("diagram contrast tokens drifted");
  if (!source.includes('source.getAttribute("data-processed") !== "true"') || !source.includes('scroller.setAttribute("tabindex", "0")') || !source.includes("scroller.hidden = false")) errors.push("successful Mermaid processing must exclusively expose and enable each visual scroller");
  if (!source.includes('figure.setAttribute("aria-hidden", "true")') || !source.includes('svg.setAttribute("aria-hidden", "true")')) errors.push("rendered figure and SVG must remain hidden from assistive technology");
  if (source.includes('svg.setAttribute("role", "img")') || source.includes('svg.setAttribute("aria-labelledby"')) errors.push("ordered lists must remain the sole assistive-technology diagram equivalent");

  return Object.freeze(errors);
}

export function assertHowPage(html) {
  const errors = validateHowPage(html);
  if (errors.length) throw new Error(`invalid /how page:\n- ${errors.join("\n- ")}`);
}
