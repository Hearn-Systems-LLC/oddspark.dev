---
type: ux-extract
date: '2026-08-17'
sources:
  - ../../../architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md (updated 2026-08-17, status final)
  - ../../../architecture/architecture-oddspark-2026-08-15/solution-design.md
scope: Only what constrains the visitor-facing UI/behaviour. Line refs are to ARCHITECTURE-SPINE.md unless prefixed "SD" (solution-design.md). "silent" = neither document says.
---

# Architecture → UX extract

## 1. AD-5 result-card data contract (SPINE L77–95)

Verbatim schema (L82–94):

```
{version: int, mode: "local"|"domain",
 title: string, plan: string,
 why_fits: {text: string, breadcrumb?: string},
 what_gets_better: string,
 before_after: {before: string, after: string},
 change_level: {time_range: string, steps_changed: int, steps_removed: int, preliminary: true},
 stays_same: {tools: string[], authority: string[], steps: string[]},
 invitation: string,
 notice?: string,            // plain-language fallback notice (AD-4)
 grounded_numbers: string[]} // the only numeric strings allowed outside change_level,
                             // each locally provenance-verified as site-supplied
```

- Field order as listed above (schema order; no separate display-order rule — display order is **silent**, and L218 explicitly defers "which existing card sections map to which Brief fields" to UX/implementation).
- Types: "all string fields plain text unless noted" (L81). No field is noted as HTML. So: **plain text, never HTML** — renderers must escape. Explicit escaping rule: **silent** (only "plain text" + "Render never sees free model text" L41 / "renderers consuming free text" prevented L80).
- Optional/nullable: only `why_fits.breadcrumb?` and `notice?` are optional. Everything else required. `change_level.preliminary` is literally `true` (always preliminary — SD L42 "the (always preliminary) change-level estimate").
- `stays_same` arrays may be empty? — **silent**.
- `grounded_numbers`: "the only numeric strings allowed outside change_level" (L92); each "locally provenance-verified as site-supplied". Whether/how they are displayed to the visitor: **silent** (they are a constraint list, not necessarily a card section).
- `mode` "is the single authority renderers branch on — the legacy `personalization.status` branching is removed" (L95).
- `version` integer bumped on any shape change (L95).
- SD L42: "the eight contract elements — title, plan, why-it-fits, what-gets-better, before/after, change level, what-stays-the-same, invitation." Card is referred to as "the 8-element card" (L218).
- Renderers: "All renderers (HTML, `asText`, `/api/spark/:id`) consume this schema — never raw model output" (L95). Component/template location: single-file `src/worker.js`, banner section `/* Renderers: page / asText / json */ (consume Brief schema, branch on mode)` (L194). No separate template files.
- Breadcrumb: "the single charming 'breadcrumb' must be an exact substring of canonicalized scan text" (SD L38); a quoted site substring, only in domain mode by construction (local evidence has no scan text — L75). Whether it must be rendered as a quotation: **silent**.
- Convention L143: "No path renders uncommitted generated output, raw model text, or the legacy seed." → the legacy seed is no longer shown on the card.

## 2. AD-10 interaction preservation, page shell, form, handoff (SPINE L121–125; AD-6 L97–101; SD L7, L52, L56)

- AD-10 verbatim (L125): "one button, one optional domain field. Mode selection is implicit in domain presence. The only new endpoint is `/api/cheer` (AD-8); no new generation inputs, fields, or client state."
- AD-6 (L101): "Router, KV key scheme, seed feeds, scan budgets, and the page shell stay as they are" — page shell is preserved; "No other shell edits without a new AD." SD L7: "Everything around it — the button, the optional domain field, the seed feeds, the caching, the page — stays." SD L52 adds "abuse limits" stay.
- Spark request endpoint: `POST /api/spark (button, optional domain)` (L30 diagram). Method for the button/form, `action`, JS vs no-JS, progressive enhancement, plain-link fallback for the *spark* button: **silent** (inherited from existing shell, which UX must read from the current worker, not from these docs).
- Router change (L196): `+ POST /api/cheer; domain-mode /s/:id removed`.
- **Invitation / contact handoff (L125):**
  - Receiver identity `HearnReceiverManifest {… origin:"https://hearn.systems", path:"/contact", query_keys:["source","spark"] …}`.
  - "With an exact matching active receiver ref, an accepted invitation POST atomically records `invitation_acted` and returns a fixed `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>`."
  - "The destination is allowlisted, never request-controlled, and carries only the opaque artifact id—no domain, Brief text, title, seed, Evidence, or visitor data."
  - **Retention copy (verbatim):** "Before the action, adjacent fixed plain-language copy states that local references expire 30 days after creation and website/domain references expire one hour after creation; no countdown state is introduced."
  - "The reference identifies an exact committed artifact, and neither system promises later content availability."
  - **Fallback:** "If the manifest/ref is malformed, unknown, stale, failed, mismatched, or withdrawn, the renderer uses the fixed plain Hearn contact link, does not POST `/api/cheer`, and records no `invitation_acted` event." SD L56: "Without it, the renderer uses the plain fixed Hearn contact link and records no invitation event." AD-8 L113: "plain-link fallback actions intentionally emit no event".
  - So the invitation CTA has two render states: (a) receiver active → form/POST to `/api/cheer` → 303; (b) receiver inactive → plain `<a href>` to Hearn contact (exact fallback URL beyond "fixed plain Hearn contact link": **silent** — presumably `https://hearn.systems/contact` without `spark` param, but not stated).
  - Whether the POST is a `<form method="post">` or JS fetch: **silent** ("POST" and "303" imply a native form works without JS; not stated).
  - Hearn's contact form "must visibly preserve that reference in its submission" — cross-repo, separate authority (L125). Not Oddspark UI.
- **Receipt / claim copy (L134, SD L36, L48):** "Stronger receipt/reproducibility copy renders only when the single production activation manifest contains that exact current ref … otherwise non-claiming copy renders." L107: "UI copy keeps the PRD FR-11 interim stance: no reproducibility promise is added until cache-first behavior is verified in production." SD L36: "We claim reproducibility of the committed artifact, not of the model." → Two copy variants for the receipt line: **non-claiming (default)** and **claiming (gated)**. Actual wording of either: **silent** (claiming copy is hash-bound via `copy_sha256`, so must be a fixed string).
- Brief ids stay `seed[0:8]` / `p-<hash[0:16]>` (L142) — the opaque id in the `spark=` param and `/s/:id`.

## 3. Responses / states the visitor can see

| State | Source | What the visitor sees |
| --- | --- | --- |
| Success — local Brief | L147, AD-5 | Full 8-element card, `mode:"local"`, permalink `/s/:id` eligible ("effective mode owns … permalink eligibility"). |
| Success — domain Brief | L107, L147, SD L40 | Card `mode:"domain"`, may include `why_fits.breadcrumb`; **no public permalink** ("`/s/:id` always refuses them"; "Website-grounded Briefs get no public permalink"). `/api/spark/:id` serves it only in first hour. |
| Domain downgrade → local + notice | L75, L147, L156 | "falling back to Coherent Local Mode with the plain-language notice"; card is a local Brief with `notice` populated. Failure table L156: "Explicit local-mode downgrade with notice before generation". Still domain request scope → **no permalink** (L107 "a domain request that downgrades to a local Brief remains under its `pw:`/domain claim and never populates global `w:`"; L147 "request scope constrains permalink eligibility"). Notice wording: **silent** (only "plain-language"). |
| House Brief (exhaustion / unqualified / over budget / deadline / feed failure) | L69, L119, L157, L160 | "a curated, per-season Coherent Local Mode Brief stored in code, gate-passing by construction". Commits like any artifact (L107). Whether the visitor is *told* it is a house Brief: **silent** — no notice field is mandated for house; the schema's `notice?` is described only for AD-4 fallback. |
| Invalid input | L155 | "`400` JSON with stable `error` and `field`; no strike starts." Visitor-facing HTML rendering of a 400: **silent** (JSON only is specified). |
| COORD uncertainty / infra failure | L161–162, L164 | "`502`; never render an uncommitted generated or house artifact." "`502` JSON with stable `error`". HTML error page: **silent**. |
| Unsupported artifact version | L49 | Reader treats as cache miss → "the request follows the normal coordinator/house-Brief path". Visitor sees a normal Brief; "Older code never … renders a newer artifact". |
| Missing/invalid activation manifest | L132 | "disables model roles, stronger receipt copy, and reference-bearing handoff without crashing the public shell"; serves authoritative/house path when COORD + catalog valid, "otherwise … the defined `502`". Visitor sees: house/committed Brief + non-claiming copy + plain contact link. |
| Inactive receiver | L125 | Plain Hearn contact link, no POST. |
| Non-claiming receipt | L134 | Default receipt copy makes no reproducibility promise. |
| Expired local permalink | L107 | "`/s/:id` returns not found at or after that boundary" (30 days after commit). Not-found page content: **silent**. |
| Domain permalink | L107, L196 | `/s/:id` refuses domain artifacts (route "removed"). Response code/body: **silent**. |
| Retention disclosure | L125 | Fixed copy adjacent to invitation action: local 30 days / domain one hour; no countdown. |
| Latency | L119 | "provisional 15-second ceiling" for the strike deadline (route entry → commit). "within seconds" phrasing: **silent** (not in these docs). Loading/pending UI: **silent**. |
| Retry suppression | L26, L69, L119 | Retries are entirely server-side within one request ("The retry loop lives in exactly one place — the strike orchestrator"). Nothing about client-side re-press throttling beyond existing "abuse limits"/"hashed-IP slot window" (L113, SD L52). Client-side retry UI: **silent**. |
| `/how` page | L217, SD L64 | "must be rewritten to the pipeline before launch; content decision, not structural." SD: "it still documents the axis-collision flow." Mermaid on /how, accessible metadata, fallback text: **silent** (the only mermaid mention is the spine's own diagram and "`/how` page + mermaid update", implying /how currently has a mermaid diagram that must be updated). |

Analytics as it affects UI (L113): served counters increment only after an authoritative render; `invitation_acted` on accepted `POST /api/cheer`; "No per-visitor analytics keys" — no client tracking, no per-visitor state to render.

## 4. Accessibility / responsive / caching / HTML structure

- Accessibility: **silent**.
- Responsive: **silent**.
- Headings/semantics: **silent** (only "8-element card" and schema field names).
- Client JS / no-JS: **silent** beyond "no new … client state" (L125) and preserved page shell (L101).
- CSP / security headers: **silent** ("CORS tightening" listed as a pre-existing cleanup, L219).
- Caching: cache-first commit; `w:`/`pw:` KV projections are best-effort; readers consult COORD on missing/stale pin (L107). Same-window visitors get the identical artifact (SD L36). Local artifact TTL 30 days; domain 1 hour (L107). HTTP cache headers: **silent**.
- Text renderer `asText` exists alongside HTML and JSON (L95, L194) — a plain-text representation of the card is a first-class output.

## 5. Explicitly out of scope / forbidden for UI

- No new generation inputs, fields, or client state (L125).
- No page-shell edits without a new AD (L101).
- Never render uncommitted generated output, raw model text, or the legacy seed (L143).
- No reproducibility/receipt promise in copy until production-verified and claim ref active (L107, L134).
- No countdown/timer for retention (L125).
- No public permalink for domain (website-grounded) Briefs (L107, SD L40).
- Contact handoff URL carries only the opaque id — never domain, Brief text, title, seed, evidence, or visitor data (L125).
- Domain content never copied into contact URL or new persistence (L125).
- No per-visitor analytics/tracking; SM-1 never presented as a true percentage (L113) — no client analytics scripts.
- Numbers only in `change_level` and `grounded_numbers` (L92) — UI must not invent figures.
- Renderers never branch on legacy `personalization.status` (L95).

## 6. Gaps left to UX

- Card layout: mapping of the 8 Brief fields to sections, order, headings (L218 explicit).
- Display of `grounded_numbers`, `stays_same` sub-lists, `change_level` (how "preliminary" is signalled), `breadcrumb` presentation.
- Wording of: downgrade `notice`, non-claiming vs claiming receipt copy, retention disclosure sentence(s), invitation CTA label, 400/502/404 visitor-facing pages, house-Brief disclosure (if any).
- Whether house Briefs are visually distinguished — silent.
- Form mechanics (native form vs JS, pending state during up-to-15 s strike, progressive enhancement, error display for 400 JSON).
- `/how` page content, diagram, accessibility fallback.
- Accessibility, responsive, semantics, CSP — all silent.
- Exact fallback plain Hearn contact link URL.
- Permalink UI for local Briefs (whether/how `/s/:id` is surfaced) — silent.
