---
name: oddspark
description: Behavioural contract for the preserved one-button / optional-domain interaction and the result, notice, error, and invitation states built on it
status: final
created: 2026-08-17
updated: 2026-08-17
sources:
  - prds/prd-oddspark-2026-08-15/prd.md
  - prds/prd-oddspark-2026-08-15/addendum.md
  - architecture/architecture-oddspark-2026-08-15/ARCHITECTURE-SPINE.md
  - architecture/architecture-oddspark-2026-08-15/solution-design.md
  - epics.md
  - implementation-readiness-report-2026-08-17.md
  - sprint-change-proposal-2026-08-17.md
  - implementation-readiness-report-2026-08-17-1057.md
  - sprint-change-proposal-2026-08-17-3.md
  - "as-built shell baseline: oddspark git 761c3dae989ca52a198f7b4f64a650f292fea3b9, src/worker.js::page()"
---

# oddspark — Experience Spine

> The interaction is **not redesigned** (FR10 / AD-10). This spine documents the preserved behaviour and makes the new states testable. `DESIGN.md` is the visual reference; `../../ux-decision-record-oddspark.md` is the compact contract stories cite. Every line tagged `[ASSUMPTION]` is a decided default, listed again in **Resolved Decision Register**.

## Foundation

Single-surface responsive web. One Cloudflare Worker (`src/worker.js`) serves server-rendered HTML with no framework, no build step and no client router. Two external requests exist: Google Fonts, and the Mermaid bundle on `/how` from `cdn.jsdelivr.net`. The `/how` plain-language content must never depend on that CDN (see `/how` below); everywhere else there is no third-party script.

The whole product is one page: a masthead, one button, one optional field, and a result. There are no accounts, no sessions, no saved history, no per-visitor state (PRD "stateless per-visit experience"; AD-10 "no new … client state"). Everything the visitor sees is derived from a single committed Brief artifact.

**Progressive enhancement is the target posture, not the current one.** Today the strike is JS-only: there is no `<form>`, the button is bound with `fetch`, and even `/s/:id` renders its content client-side from a `BOOT` object. That is the delta Stories 1.15 and 4.1–4.2 must close. Where this spine says "native form", it is specifying the target.

Revised AD-6 authorizes only the governing UX record's closed D1, D1a, D2, D2a and D3–D24 rows; AD-12 owns the `/api/spark`, `/s/:id`, request-scope, response-header, caching and 400/502 representation mechanics. This backing spine grants no additional implementation authority.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| `/` | Direct, social post, Hearn Systems link | The shell: masthead, `website-input`, `strike-button`, and — after a strike — the `result-card` in place |
| `/s/:id` | The footer id link after a **local** strike; shared by the visitor | Permalink to a committed local Brief. Server-rendered. Local artifacts only; 30-day life |
| `/how` | Footer "how does this work?" | Honest pipeline explanation: Evidence, Generate, Local Gate, Judge, Commit, house fallback, privacy, call cap, non-determinism. **Four** Mermaid diagrams + always-rendered plain-language ordered lists |
| `/api/spark` (`POST`) | The strike form action | Creates one Brief through one outcome contract. **Content-negotiated per AD-12:** explicit `Accept: application/json` wins; otherwise HTML acceptance or a browser-form content type selects server-rendered shell HTML; remaining requests retain JSON. A native domain-scope `200` leaves the browser at `/api/spark`; an enhanced domain result renders at the current page URL. Neither creates a permalink or history mutation. See Interaction Primitives |
| `/api/spark/:id` (`GET`) | Footer "json" link | The same Brief as JSON. Local: 30 days. Domain: 1 hour |
| `/api/cheer` (`POST`) | The `invitation-button` form action | Records `invitation_acted`, returns a fixed `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>` |
| Not-found / expired | An expired `/s/:id`, a domain id, or an unsupported version | A single shell-shaped page, not an error wall. See State Patterns |

There is no navigation component. `/how` and the Hearn mark are footer links; `/s/:id` is the same shell hydrated server-side. The site is one level deep in every direction.

## Voice and Tone

Owner voice: confident, plain, problem-solving-led. It states what happens; it does not sell, ask, or apologise. Copy below is **draft** — the binding wording for Brief content comes from the voice rubric and golden Briefs (Story 1.5); the strings in this document are the *shell's* copy, which the rubric does not own.

| Do | Don't |
|---|---|
| "Your site did not answer in time, so this plan is built from local patterns only." | "Oops! We couldn't reach your website 😕" |
| "Talk through the problem. Say so if it is not worth changing." | "Ready to transform your business? Let's chat!" |
| "This reference expires 30 days after it was created." | "Act now — your spark won't last forever!" |
| "One idea, seeded by the sun and a randomness beacon." | "Leverage AI-driven insights to unlock growth." |
| "Preliminary: about two afternoons." | "Save 40% of your admin time!" |
| Name what physically changes: "the morning phone tag over quote requests stops." | "Saves time." / "More time with customers." |
| State the limit: "No site was scanned for this one." | "Something went wrong. Please try again later." |

**The CTA rule.** The invitation names *this* Spark and its smallest useful version, offers a bounded feasibility conversation, and explicitly leaves room for **"not worth changing"**. It carries no price, no urgency, no deadline, no generic "contact us". It reads as an offer to think together.

**Banned registers everywhere in the shell:** consultant-speak, pitch voice, audit framing, hype adjectives, rhetorical questions posed to the owner, hypothetical framing ("you could maybe…"), emoji, exclamation marks, and any reproducibility or verifiability promise until the claim-proof ref is current.

**Everything visitor-visible is plain text.** Per AD-5 no Brief field is HTML; renderers escape and set text content. Copy may not smuggle markup, links or line-break tags into a Brief field.

## Component Patterns

Visual specs live in `DESIGN.md § Components`. Names are identical across all three documents.

### `strike-button`
The only primary action. One press = one strike. Labels: `Strike` → `Scanning` (only when `website-input` is non-empty, first 250ms) → `Striking` → `Strike again`. It disables for the whole strike and re-enables exactly once, on settle. A hydrated permalink boots with `Strike again`. It never changes shape, position or size between states.

### `website-input`
Optional, single, free-text, `type="url"`, `maxlength=2048`, `autocomplete="url"`, placeholder `example.com`, label "website, optional". Presence of a value silently selects domain mode; there is no mode switch and no second field. It is never cleared by the system, never validated client-side, and never blocks the button. On a `400` with `field: "website"` it gains `aria-invalid="true"` and `aria-describedby="website-error"`, and the API's message renders into the `#website-error` element beside it. That element exists in the DOM at load, empty. It carries **no** `role` — the association plus the focus move is what conveys the problem; adding `role="alert"` as well would race the focus announcement.

### `result-card` — eight-element order and field mapping (**UX-DR1**)

Rendered in this exact order for every mode. `mode` is the sole render branch (AD-5).

| # | Element (PRD name) | Brief field | Presentation |
|---|---|---|---|
| — | (notice) | `notice?` | `notice` component, above the title, only when present |
| 1 | Spark title | `title` | `h1`, `{typography.h1}`, `{colors.heading}` |
| 2 | The Plan | `plan` | `{typography.premise}` serif paragraph, no heading label |
| 3 | Why It Fits | `why_fits.text`, `why_fits.breadcrumb?` | `section-heading` + paragraph. Breadcrumb, when present, is the final sentence, set off by `accent-bar`. Exactly one, domain mode only |
| 4 | What Gets Better | `what_gets_better` | `section-heading` + paragraph |
| 5 | Before/After | `before_after.before`, `.after` | `section-heading` + two labelled lines, "Before" then "After" |
| 6 | Change Level | `change_level.time_range`, `.steps_changed`, `.steps_removed` | `section-heading` + one line reading as `Preliminary — <time_range> · <steps_changed> steps changed · <steps_removed> removed`. The literal word **preliminary** always renders because `change_level.preliminary` is always `true` |
| 7 | What Stays the Same | `stays_same.tools`, `.authority`, `.steps` | `section-heading` + three labelled `chip` groups: `tools`, `authority`, `steps`. An empty array renders no group; all three empty renders the section with the single line "Nothing in the current routine is replaced." `[ASSUMPTION]` |
| 8 | The implementation invitation | `invitation` | `invitation-button` or `invitation-link` (see Interaction Primitives), with `retention-note` beneath |

`grounded_numbers` is a **constraint list, not a section** — it is never rendered as its own block; its strings appear only inside the eight elements. Source URLs, grounding reports, scan fragments, rejected candidates, retry counts and the legacy seed are never rendered. The Seed Geometry and Provenance sections are preserved as-is and sit **after** element 8, as page furniture, not as Brief content.

The third renderer surface is named **`asText`** (plain text) — Story 1.15's "share" renderer and the historical readiness report's "plain-text" renderer name the same surface. `asText` emits the same eight elements in the same order. `[ASSUMPTION]`

**Share affordance:** the footer id / `copy link` / `json` cluster renders for local Briefs. For domain and downgrade Briefs (both domain-scoped) the `/s/:id` id link and `copy link` are **omitted entirely** — not shown disabled, not shown with an explanation. `json` remains for the first hour. `[ASSUMPTION]`

### `notice`
One paragraph, above the title, rendered iff `notice` is non-empty. Never an icon, never `{colors.error}`, never dismissible, never a toast.

**Semantics.** It carries `role="note"` and a visually-hidden lead-in "Note:" as the first text in the element, so a non-visual user perceives *notice ≠ error* — today that distinction is carried only by colour (panel fill + entropy bar), which 1.4.1 does not accept on its own. It is **not** a live region and never takes `role="alert"` or `role="status"`. It is announced because it precedes the `h1` in the DOM and the reading cursor lands on the `h1` (see Accessibility Floor → Announcements). Every notice string must name its cause in words; all three drafts do, and that is now a rule for any future string.

### `invitation-button` / `invitation-link`
See Interaction Primitives (UX-DR6).

### `footer-link` / `copy link`
Static links plus one button. `copy link` writes the permalink with `navigator.clipboard` and swaps its label to "copied" for 1.6s; the swap is **also** announced by writing "Link copied" into the shared status region (see Accessibility Floor). Every footer link and `copy link` is ≥24×24 CSS px (`padding: 4px 0`, `min-height: 24px`) so WCAG 2.5.8 holds after the footer wraps at 320px, rather than relying on the spacing exception. **No-JS:** `copy link` is emitted hidden and revealed only by the page's stateless bootstrap script; with JavaScript unavailable it remains omitted, while the adjacent plain `<a href="/s/:id">` id link remains the share path. No session, storage, cookie, or persisted client marker is introduced. `[ASSUMPTION]`

### `masthead`
Static. `oddspark` with the "spark" half in the live accent; live readout `<class> · SUN NOW`, degrading to `---- · SUN NOW` when the solar feed fails (no error state, no retry). `live-dot` breathe is suppressed under `prefers-reduced-motion`. On an idle page the mark **is** the `h1` (see Accessibility Floor → Headings); after a strike it reverts to a `<p class="mark">`.

### `strike-note`, `section-heading`, `chip`
Static, no states. Chips are non-interactive: no hover, no focus, no target-size requirement.

### `prov-table`
Preserved verbatim: seven `dt`/`dd` rows plus the formula panel. The formula line and "Recompute it yourself; every input above is published and archived." are **claiming copy** and therefore gated: until a current claim-proof ref exists, the non-claiming variant renders (see State Patterns).

### `/how`
Prose plus **four** Mermaid diagrams (not one), rendered client-side from `cdn.jsdelivr.net`. Requirements:

1. **Each** of the four diagrams carries its own accessible title and description (`accTitle` / `accDescr`, or `role="img"` with an `aria-label`) and is immediately followed by its own **always-rendered ordered list** of the same steps in plain language.
2. The plain-language content has **no dependency on the CDN**: the ordered lists are in the served HTML and render whether or not Mermaid loads, is blocked, or fails. Because the lists always render, no `<noscript>` block is needed — and none is added.
3. The `<pre class="mermaid">` source is hidden until processed (`.mermaid:not([data-processed]) { visibility: hidden }`) so a JS-off visitor is not read the raw diagram source.
4. Each rendered diagram is wrapped so its SVG `<text>` is not read twice alongside the list: `<figure aria-hidden="true">` around the rendered SVG, with the ordered list as the accessible equivalent.
5. Diagram borders use a stroke of at least 3:1 against the page ground (`#7E8B98`, 5.59:1) — the current `#3D4750` is 2.05:1.
6. The `overflow-x: auto` scroller around each diagram carries `tabindex="0"` and an accessible name so it is keyboard-scrollable at 320px.

No stronger reproducibility claim appears while the claim proof is inactive.

## State Patterns (**UX-DR4**)

Copy strings below are **draft**. The **result region is not a live region.** "Focus & announcement" describes the in-place enhanced-path choreography and what the single dedicated status region (`<p id="status" role="status" aria-live="polite">`) contains. Fresh full-document HTML responses set no scripted focus unless a row explicitly says otherwise — see Accessibility Floor → Announcements.

| State | Trigger | What the visitor sees (plain text) | Focus & announcement | Retry allowed? |
|---|---|---|---|---|
| Idle | First load of `/`, no spark | Masthead, `website-input`, `strike-button` "Strike", strike-note "One idea, seeded by the sun and a randomness beacon.", Seed Geometry, footer. No result region content | No automatic focus is set on page load. The `h1` is the masthead mark "oddspark". Status region empty | n/a |
| Loading | Strike submitted, before settle | Button disabled, label "Scanning" (domain) then "Striking". No spinner, no progress bar, no percentage, no elapsed timer | Focus stays where the visitor left it (the button keeps focus: `aria-disabled="true"`, not `disabled`). `aria-busy="true"` on the **result region**. Status region: "Working. Your spark takes a few seconds." | **No** — clicks ignored for the whole strike |
| Provisional deadline reached | 15s ceiling hit server-side | A house Brief settles and renders as a normal Brief with the house-Brief notice | Same as success | Yes, after settle |
| Success — local | `mode: "local"`, no notice | Full eight-element card; footer id / `copy link` / `json` present | Focus moves **once** to `h1[tabindex="-1"]` (now the Spark title); the status region is cleared **before** the move so nothing double-announces. `aria-busy` removed from the result region | Yes ("Strike again") |
| Success — domain | `mode: "domain"` | Eight-element card with one breadcrumb in Why It Fits; **no** id link, **no** `copy link`; `json` present | Same | Yes |
| Downgrade — scan insufficiency | `mode: "local"`, domain request scope, `notice` from the scan-downgrade cause | Notice above the title: "No usable pages came back from your website, so this plan is built from local patterns only." | Same as success. The notice precedes the `h1` in the DOM and carries `role="note"`; SR users reach it by reading up from the focused heading. It is **not** re-announced via a live region | Yes |
| Pre-activation domain request | Valid domain submitted during the local-only phase (Story 1.16 / 1.25 governed local path) | Notice above the title: "Website reading is not switched on yet, so this plan is built from local patterns only." | Same | Yes |
| House Brief | Exhaustion, over budget, deadline, feed failure | An ordinary eight-element local Brief with the `notice` "This plan is one of ours, not built for you." above the title — no badge, no error styling, no other visual difference | Same as success | Yes |
| Invalid input — 400 | Guard rejects the website value | The shell stays on screen. `website-input` gets `aria-invalid="true"`; adjacent message = the API's stable field message, e.g. "That does not look like a public website address." No strike started, button returns to "Strike" | Enhanced path: `aria-describedby="website-error"` and focus moves to the input, which announces name, "invalid" and the message. Fresh HTML: no scripted focus. The message element has **no** `role` | Yes, immediately |
| Coordinator uncertainty — 502 | COORD read/claim/commit uncertainty | The shell stays on screen. Message in the result region: "No spark this time — a part of the system did not answer. Press Strike again." No stack trace, no code, no full-page error | Enhanced path: the status region takes `tabindex="-1"` and receives focus once. Fresh HTML: no scripted focus. The button's `aria-disabled` posture never drops focus to `<body>` | Yes, immediately |
| Unsupported version | Reader meets a newer artifact | Treated as a cache miss: a normal Brief renders. No visitor-facing difference on `/` | Same as success | Yes |
| Unsupported version on a permalink | `/s/:id` reads an unsupported artifact | The not-found page (below) | No automatic focus (full page load); the `h1` is first in `<main>` | Yes via "Strike" |
| Inactive receiver | No current `HearnReceiverManifest` ref | Element 8 renders as `invitation-link` — a plain link to `https://hearn.systems/contact`. No POST, no spark id, no event | Link is in the normal tab order | n/a |
| Non-claiming receipt (default) | No current claim-proof ref | Provenance formula panel reads: "seed = SHA256( randomness : round : flux : time_tag ). Every input above is published and archived." — statement of inputs only, no reproducibility promise | — | n/a |
| Claiming receipt (gated) | `receipt_claim_ref` matches a current manifest | The approved, hash-bound claim string replaces the line above. Its exact wording is owned by Story 3.6, not by this document | — | n/a |
| Expired / not-found permalink | `/s/:id` past 30 days, a domain id, or an unknown id | The full shell with an empty result region and one line: "That spark is no longer available. Press Strike for a new one." The button reads "Strike" | No automatic focus (full page load); the `h1` is first in `<main>` and reads "oddspark", followed by the line; page returns `404` | Yes — the button works on this page |
| Retention disclosure | Always, adjacent to element 8 | "Local references expire 30 days after they are created; website references expire one hour after they are created." No countdown, no timer, no promise of later recovery | Read as part of the invitation region | n/a |

Never rendered: rejected candidates, near-miss ideas, retry counts, a hang, or a full-page error wall.

## Interaction Primitives

### Loading, retry suppression, focus announcement (**UX-DR3**)

1. On submit, `strike-button` takes `aria-disabled="true"` and its loading label, and click/Enter/Space are ignored until settle. It **never** takes the `disabled` attribute: a focused `<button>` that becomes `disabled` has its focus dropped to `<body>` by Chromium and Firefox, which breaks 2.4.3 for the whole strike. `aria-disabled` keeps focus, still announces "dimmed", and re-enables exactly once on settle (success, 400, 502 or otherwise). This is the entire retry-suppression mechanism; there is no client-side timer, throttle or backoff.
2. `aria-busy="true"` goes on the **result region** — the thing being updated — for the duration of the strike, and is removed on settle. It is never placed on the button; `aria-busy` describes a region whose content is changing, and screen readers largely ignore it on a control.
3. There is **no** progress indicator, skeleton, spinner, percentage or elapsed-time display. The wait is expressed by the button label and by one sentence in the status region: "Working. Your spark takes a few seconds." `[ASSUMPTION]`
4. Server-side retries are invisible. No state change on the page marks an internal attempt.
5. The strike deadline is the server's provisional 15-second ceiling. The client does not enforce a timeout of its own and does not abort. `[ASSUMPTION]`
6. **Settle choreography — one announcement per settle.** The result region is **not** a live region. Exactly one dedicated `<p id="status" role="status" aria-live="polite">` (visually hidden, or the existing strike-note slot) carries transient messages. On settle:
   - **In-place enhanced-path Brief:** the status region is cleared first, then focus moves **once** to `h1[tabindex="-1"]`. The heading is announced by the focus move. If a `notice` is present it sits before the `h1` in the DOM with `role="note"`, so it is available on read-up; it is **not** also pushed through the status region, because that would announce it twice and then queue the whole card behind it.
   - **In-place enhanced-path 400:** `website-input` gets `aria-invalid="true"` and `aria-describedby="website-error"`, the message is written into `#website-error` (no `role`), and focus moves to the input. Clearing the value and resubmitting removes both attributes and empties the message.
   - **In-place enhanced-path 502:** the sentence is written into the status region, which takes `tabindex="-1"` and receives focus. Focus was never lost (the button used `aria-disabled`), so this is a deliberate single move, not a recovery.
   - **Fresh full-document HTML 400 / 502 / 404:** no scripted focus is set. Document order and the server-rendered heading govern the initial reading position.
   - **`copy link`:** writes "Link copied" into the same status region.
   Never more than one focus move and never more than one announcement per settle.
7. On settle, the button drops `aria-disabled` and takes the label "Strike again".
8. **Native form / no-JS path (D1, D1a, D2, D2a).** The strike row is a native `<form method="post" action="/api/spark">` and `/api/spark` follows AD-12's deterministic representation precedence: explicit `Accept: application/json` wins even with a form-encoded body; otherwise, a request accepting HTML or carrying a browser-form content type receives shell HTML; remaining requests preserve the existing JSON representation.
   - **HTML native-form path:** the response is the full home shell with the Brief server-rendered, not JSON. **Local request scope** returns a `303` redirect to `/s/:id`, so the followed GET and later refresh re-read the authoritative permalink instead of re-striking. **Domain request scope**, including downgrade, has no permalink and returns direct `200` HTML from `/api/spark`; the browser remains at `/api/spark`, and refresh may re-post through the same authoritative domain claim/read path. Negotiated HTML 400 returns the shell with the message associated to the input; negotiated HTML 502 returns the shell with the sentence in the status region. `[ASSUMPTION]`
   - **JS-enhanced path:** `fetch` explicitly accepts `application/json` and renders in place. After a permalink-eligible local-scope strike, the URL is updated to `/s/:id` with `history.replaceState` (not `pushState` — the strike is not a separate history entry, and Back should return to where the visitor came from). Domain request scope, including downgrade, leaves the URL alone because `/s/:id` is ineligible.
   - Local native and enhanced successes both settle at `/s/:id`. Domain native and enhanced successes deliberately retain different non-permalink URLs—`/api/spark` for the native POST response and the current page URL for enhanced fetch—while rendering the same committed artifact. `document.title` is set to the Spark title on settle by the client and by the server alike.
   - On any fresh full-document HTML path — success, 400, 502 or 404 — **no focus is set automatically**. Document order and the server-rendered heading provide the initial reading position. No `autofocus`, no scripted focus.
   - "The 400 response is unchanged" (Story 1.16) applies to the **JSON representation only**; the HTML representation is new and is governed here.

### The invitation contract (**UX-DR6**)

- **Active receiver.** Element 8 renders a native `<form method="post" action="/api/cheer">` containing the spark id and the anti-abuse fields as hidden inputs, and one submit button (`invitation-button`) whose label is the Brief's `invitation` CTA. Submission returns `303` to `https://hearn.systems/contact?source=oddspark&spark=<encoded-id>`. Only the opaque id crosses origins.
- **Inactive receiver.** Element 8 renders `invitation-link`: a plain `<a href="https://hearn.systems/contact">` in the sentence flow. No form, no POST, no id, no event. The plain link is never instrumented — clicks in this posture are invisible to SM-1 by design.
- **Progressive enhancement.** Both postures work with JavaScript disabled: the active posture because a native form POST plus a `303` needs no script, the inactive posture because it is an anchor. **Delta:** the current shell does not meet this — the strike itself is JS-only (`btn.onclick` → `fetch`) and there is no `<form>` at all. Stories 1.15 and 4.1–4.2 must close it. The strike row becomes a native `<form method="post" action="/api/spark">`; the content-negotiated response and the `303`/`200` split are specified in Loading, primitive 8. `[ASSUMPTION]`
- **Failed submission.** If `/api/cheer` rejects (invalid input, origin, artifact, expiry, rate limit or COORD uncertainty), the visitor returns to the Brief page with the invitation region showing: "That link could not be opened. Use the contact page directly." followed by the plain `https://hearn.systems/contact` link. No event is recorded. The Brief content is unchanged and still on screen. `[ASSUMPTION]`
- **Focus restoration.** After a failed submission, focus moves to the invitation region's message. After a successful submission the visitor has left the origin, so no restoration applies.
- **External navigation.** The invitation leaves oddspark **in the same tab**. A `303` cannot open a new tab, so same-tab is the only posture that is identical between the active and inactive states; the plain link therefore also omits `target="_blank"`. `[ASSUMPTION]` The invitation copy makes the handoff explicit ("talk through the problem") so the navigation is not a surprise.

## Accessibility Floor (**UX-DR2**)

**Standard: WCAG 2.2 Level AA.** `[ASSUMPTION]` — no source names a standard.

- **Landmarks.** The shell wrapper becomes `<main>`. The masthead is `<header>`, the footer `<footer>`. No `<nav>` (there is no navigation).
- **Headings — one `h1`, one node, no duplicates.** Exactly one `h1` exists in the served HTML at every moment. **On an idle `/` (and on the not-found page) the masthead mark *is* the `h1`** — `<h1 class="mark">oddspark</h1>`, visually unchanged, no visually-hidden extra heading. **After a strike the masthead reverts to `<p class="mark">` and the Spark title becomes the `h1`** (`<h1 id="headline" tabindex="-1">`). The server emits whichever of the two is correct for the response it is rendering (idle, `/s/:id`, no-JS POST result); the JS path performs the same swap on settle. There is never a moment with two `h1`s or none. Section labels are `h2`; no level is skipped. `document.title` is set to the Spark title on settle, by the client and by the server alike. `[ASSUMPTION]`
- **Keyboard and focus order.** DOM order = reading order = tab order: `website-input` → `strike-button` → result region (notice, title, elements 1–8, invitation) → provenance → footer. Every interactive element has a visible `:focus-visible` indicator of at least 2px `{colors.entropy}` with ≥2px **offset**, so the ring sits on `{colors.void}` at 5.82:1 — never inset, never `outline-offset: 0` (against the button fill an inset ring measures 1.0–1.76:1 and fails). This includes `copy link`, which currently has none. The Seed Geometry canvas is decorative and pointer-only; it is `aria-hidden="true"` and outside the tab order, and the legend beneath carries the same information as text.
- **Announcements — one status region, no live result region.** The result region is **not** `aria-live`. One dedicated `<p id="status" role="status" aria-live="polite">` (visually hidden, or the existing strike-note slot) carries exactly three kinds of transient message: "Working. Your spark takes a few seconds." on submit, "Link copied" after `copy link`, and the 502 / not-found sentence. Nothing else is ever announced through it. The `notice` uses `role="note"`, never `role="alert"` or `status`. The 400 field message uses `aria-describedby`, never `role="alert"`. `aria-busy="true"` sits on the **result region** during a strike, never on the button. Full choreography — including which element takes focus in each outcome — is in Interaction Primitives, Loading item 6.
- **Non-focus-dropping busy state.** `strike-button` uses `aria-disabled="true"` plus ignored clicks, never the `disabled` attribute, so keyboard focus is never dropped to `<body>` mid-strike.
- **Labels.** `website-input` keeps its explicit `<label for>`. The placeholder is never the label, and is set explicitly to `{colors.dim-raised}` rather than the browser default grey. Every form control in the invitation form is either labelled or `type="hidden"`.
- **Contrast.** Per `DESIGN.md § Colors → Contrast statement`, which carries the full pair-by-pair table: 4.5:1 for all text, 3:1 for identifying UI boundaries and focus rings. `{colors.faint}` (2.05:1) **and** `{colors.dim}` (4.02:1 on void, 3.82:1 on panel) are retired from every text role in favour of `{colors.dim-raised}` (5.59 / 5.31). `{colors.rule}` (1.24:1) stays as a decorative hairline but is replaced by `{colors.border-strong}` `#7E8B98` on the `website-input` and `chip` boundaries. Gold *text* is pinned to the fixed `{colors.gold}`; only the masthead accent, the live dot, the button background and the canvas follow `--solar`. The button label is `{colors.void}` on B/C/M/X and flips to `{colors.heading}` on **A-class only** (A: void 3.31 fail → heading 4.85 pass; B: void 5.37 pass → heading 2.99 fail).
- **Target size (2.5.8).** Every interactive target is at least 24×24 CSS px: `copy link` and the footer links get `padding: 4px 0` / `min-height: 24px` rather than relying on the current spacing exception, which breaks when the footer wraps at 320px. Chips are non-interactive and are explicitly out of scope for 2.5.8.
- **Reduced motion.** `prefers-reduced-motion: reduce` already disables all CSS animation and transition and the JS scramble, spin, pulse and rAF loop. Preserved unchanged; any new state must add no motion.
- **Pause / stop (2.2.2).** The Seed Geometry canvas rotation and the corona pulse **stop automatically after ≤5 seconds** unless the stage is hovered or keyboard-focused, in which case they run while it is. Honouring `prefers-reduced-motion` alone is not sufficient for 2.2.2: it is an OS setting, not a mechanism available to a visitor who has not set it. Drag-to-rotate is unaffected, and no visible control is added (which would breach FR10's "no new controls"). `[ASSUMPTION]`
- **`/how` diagrams.** Four diagrams, not one; each carries its own accessible title and description and its own always-rendered plain-language ordered list. The lists never depend on the Mermaid CDN, so no `<noscript>` fallback is needed. Full requirements in `§ Component Patterns → /how`.
- **Acceptance-test baseline.** (a) `axe-core` reports zero violations at serious or critical on `/` idle, `/` with each of local / domain / downgrade / house Briefs, the 400 and 502 states, `/s/:id`, the not-found page, and `/how`. (b) A manual keyboard walkthrough of the full strike → result → invitation path with no mouse. (c) The **manual checks below** — axe cannot see any of them.

**Manual checks (required; each is a pass/fail line in the 1.22 report):**

1. **Settle announcement**, one SR + one browser (VoiceOver/Safari and/or NVDA/Firefox): strike from the keyboard and confirm exactly one "Working…" sentence, then exactly one title announcement, the notice read once on read-up, and the card **not** read end-to-end unprompted. Repeat for a downgrade Brief and a house Brief.
2. **Focus continuity through the busy state:** Tab to Strike, press Enter, wait. On success focus is on the `h1`; on 502 focus is on the status region — in neither case on `<body>`. Tab once more and confirm the next stop is inside the card, not the top of the document.
3. **400 path:** type `not a url`, submit; focus lands in the input, the SR reads the field name + "invalid" + the message via `aria-describedby`, and correcting the value clears `aria-invalid` and the message.
4. **Five accent classes:** force `--solar` to each of A/B/C/M/X and measure the button label pair, the provenance hot values, the `?` glyph and the wordmark with a contrast picker. Confirm every gold *text* role stayed `#C9A227` on all five days.
5. **No-JS full path:** disable JS; submit empty (local → `303` to `/s/:id`) and with a domain (→ direct `200` HTML at `/api/spark`). Confirm HTML, not JSON, comes back, the browser remains at `/api/spark` for the domain response, the Spark title is both `<title>` and `h1`, and a bad URL returns the shell with the message beside the field.
6. **Motion:** with reduced-motion *off*, confirm the canvas stops within 5s and resumes on hover/focus; with it *on*, confirm no rAF is running and the scramble is skipped.
7. **Zoom / reflow:** at 320px CSS width (400% on 1280) and at 200%: no horizontal page scroll, chips wrap, provenance hashes break, footer targets still ≥24px, focus rings not clipped; on `/how` each diagram scroller is keyboard-focusable and every ordered list is present with Mermaid blocked.
8. **Permalink & 404:** open `/s/:id` with JS off (h1 / title / content present, no scripted focus); open an expired id and confirm the `h1` reads "oddspark", the "no longer available" line follows, and Strike works.

## Responsive & Platform (**UX-DR5**)

Breakpoints `{spacing.bp-wide}` (920px) and `{spacing.bp-phone}` (520px) are preserved exactly as built — the two-column sticky-visualization grid above 920px, the stacked column below it, the reduced serif sizes and single-column provenance below 520px.

**One fix:** `chip` gets `white-space: normal` so the chip row wraps inside the 20px gutter instead of overflowing on phones. No other responsive change.

**Preservation criteria — what must stay identical (Story 1.15 tests "shell preserved" against this list):**

1. Element order in the served HTML: header → strike row → error region → result region → Seed Geometry → Provenance → footer.
2. The strike row contains exactly one optional input and exactly one button, **input first, then button** (matching the as-built and record UX-DR5.4.2), with the label "website, optional" and the placeholder `example.com`.
3. Button labels: `Strike` / `Scanning` / `Striking` / `Strike again`.
4. Strike note default (non-claiming): "One idea, seeded by the sun and a randomness beacon." The sentence "Same window, same spark." is claim-gated (Story 3.6 / D24), not preserved as-built.
5. Masthead: `oddspark` with the "spark" half in the live accent; live readout `<class> · SUN NOW`, and `---- · SUN NOW` when the solar feed fails.
6. Section headings "Seed Geometry" and "Provenance"; the seven provenance row labels; the formula panel.
7. Footer contents and order: id cluster (local only), `how does this work?`, `drand · NOAA SWPC`, `built by Hearn.`, neuron meter.
8. All `DESIGN.md` tokens, except the lines tagged `[ASSUMPTION]` there — **seven** token decisions, each enumerated as a Delta in the record (`notice-surface`/`notice-edge`, `dim-raised`, `gold`, `border-strong`, `website-input.focusRing`, `chip.whiteSpace`, `footer-link.minHeight`/`viz-stage.motionStop`). No untagged `DESIGN.md` value differs from the deployed CSS.
9. Breakpoints 920 / 520 and the grid template at each.
10. The reduced-motion rule in CSS and JS.
11. Zero border radius everywhere except `live-dot`.

## Key Flows

### Flow 1 — "Dana presses the button cold" (UJ-1), local success

1. Dana arrives at `/` from a Hearn Systems social post. The `h1` is the masthead mark; nothing has focus.
2. She skips the website field and presses Strike.
3. The button takes `aria-disabled` and reads "Striking"; the status region says "Working. Your spark takes a few seconds."; `aria-busy` sits on the result region. Focus stays on the button.
4. **Climax:** within seconds the serif Spark title lands as the new `h1`, the status region is cleared, and focus moves once to it. The eight elements read as one plan — a routine she recognises (after-hours quote requests on paper), the smallest useful fix, what physically gets better, before/after, "Preliminary — about two afternoons", what stays the same, and the invitation to talk through the problem with "say so if it is not worth changing" in it.
5. The URL becomes `/s/:id` via `replaceState`; the footer shows the id, `copy link` and `json`. She retells it at dinner verbatim.

*Failure:* if COORD is uncertain the shell stays exactly as it is and the 502 row applies — one sentence in the status region, focus moved there once, button live again immediately.

### Flow 2 — "Marcus pastes his domain" (UJ-2), domain success

1. Marcus pastes `marcusbakery.example` into the website field and presses Strike.
2. The button reads "Scanning" for a moment, then "Striking".
3. **Climax:** the Brief lands with one breadcrumb in Why It Fits — the custom-cake gallery — as the reason the plan belongs to him. No audit list, nothing else from the scan.
4. There is no id link and no `copy link`. On the enhanced path the current URL is unchanged; on the native form path the direct response remains at `/api/spark`. Neither URL is a domain Brief permalink. The Brief is his, not the internet's.
5. He presses the invitation and lands on the Hearn contact page with his spark referenced.

*Pre-activation variant:* during the local-only phase the same press returns a local Brief with the notice "Website reading is not switched on yet, so this plan is built from local patterns only." above the title. The Brief is complete; nothing else differs.

*Failure:* a malformed address never starts a strike — the 400 row applies: `aria-invalid` + `aria-describedby` on the input, focus into the input, button back to "Strike", retry immediate.

### Flow 3 — downgrade and house Brief

1. Marcus's site is `robots.txt`-disallowed; the downgrade happens before generation.
2. He gets a local Brief with the notice "No usable pages came back from your website, so this plan is built from local patterns only." — `role="note"`, above the title, no error colour.
3. No error, no retry state, no near-miss is shown.
4. Separately, if the pipeline exhausts its attempts or its 15s ceiling, a curated house Brief renders as an ordinary Brief with the quiet notice "This plan is one of ours, not built for you." Dana is told plainly, once, and the card is otherwise identical.

*Failure:* if the house catalogue itself cannot be read, the 502 row applies — never a blank card and never an error wall.

### Flow 4 — invitation handoff

1. Active receiver: Dana presses the invitation button.
2. A native POST to `/api/cheer` records one `invitation_acted`.
3. **Climax:** a `303` takes her, in the same tab, to `hearn.systems/contact?source=oddspark&spark=<id>`. Only the opaque id crosses origins.
4. *Inactive receiver:* the same place in the Brief is a plain link to `hearn.systems/contact` — no id travels, no event is recorded, nothing on screen suggests a degraded state.

*Failure:* on a rejected POST she returns to her Brief, still fully rendered, with "That link could not be opened. Use the contact page directly." and the plain link; focus lands on that message.

### Flow 5 — expired permalink

1. Thirty-one days later Dana opens her saved `/s/:id`.
2. The server returns `404` with the full shell; the `h1` is the masthead mark and no focus is set.
3. **Climax:** one line reads "That spark is no longer available. Press Strike for a new one."
4. The button is live, so the page is a starting point, not a dead end.

*Failure:* a domain id or an unsupported artifact version reaches the same page with the same line — there is no separate error surface to fail into.

## Resolved Decision Register

Every `[ASSUMPTION]` appears here as decision provenance, not open implementation freedom. Reviewed by Justin 2026-08-17: A8 overridden (quiet house-Brief disclosure); A3 (as corrected below), A7, A14 and A19 explicitly accepted; all others accepted as defaults. A22–A31 are the decided defaults from the 2026-08-17 rubric + accessibility review pass. No row remains open; rows remain as the audit record of what was decided.

| # | Assumption (default decided) | Gates |
|---|---|---|
| A1 | Accessibility standard = **WCAG 2.2 AA** | 1.15, 1.22 |
| A2 | `{colors.faint}` **and `{colors.dim}`** retired from every text role; replaced by `{colors.dim-raised}` `#7E8B98` (5.59:1 void / 5.31:1 panel) | 1.15 |
| A3 | **Corrected 2026-08-17:** the button label flips to `{colors.heading}` on **A-class only** (3.31 → 4.85). It stays `{colors.void}` on B/C/M/X — on B, `void` already passes at 5.37 and `heading` would fail at 2.99 | 1.15 |
| A4 | `notice` uses `{colors.panel}` + 2px `{colors.entropy}` left bar, placed **above** the Spark title | 1.15, 1.16 |
| A5 | `website-input` gains a 2px offset focus ring (1px border alone is not sufficient) | 1.15 |
| A6 | `chip` `white-space: normal` — the only responsive change | 1.15 |
| A7 | Three distinct notice strings: scan-downgrade, pre-activation, house-Brief causes; wording routed to Story 1.5 voice review | 1.5, 1.8, 1.16, 1.25, 2.4 |
| A8 | **Decided (Justin 2026-08-17):** house Briefs carry a quiet notice; wording is a draft for the Story 1.5 voice review | 1.8, 1.15 |
| A9 | 400 and 502 render **in the shell**, never as a full-page error | 1.15, 1.16 |
| A10 | Expired / not-found / domain / unsupported permalink → one shared shell page with a live Strike button, HTTP `404` | 1.15, 1.21, 2.6 |
| A11 | Loading UI = button label + live-region sentence only; no spinner, skeleton or timer | 1.15 |
| A12 | No client-side timeout; the server's 15s ceiling is the only deadline | 1.13, 1.15 |
| A13 | Third renderer surface is named `asText` (= "share" = "plain-text") | 1.15 |
| A14 | Share affordance (id link, `copy link`) is **omitted** for domain and downgrade Briefs, not disabled | 1.15, 2.6 |
| A15 | `grounded_numbers` is never its own section | 1.7, 1.15 |
| A16 | All-empty `stays_same` renders "Nothing in the current routine is replaced." | 1.7, 1.15 |
| A17 | Invitation navigation is **same-tab** for both postures | 4.2, 4.4 |
| A18 | Failed `/api/cheer` returns to the Brief with a message + plain link; focus to the message | 4.1, 4.2 |
| A19 | The strike row becomes a native `<form method="post" action="/api/spark">` so the page works without JS | 1.15 |
| A20 | **Corrected:** exactly one `h1` at all times — the masthead mark *is* the `h1` when idle; after a strike the mark reverts to `<p>` and the Spark title becomes the `h1`. Server emits the right one; the JS path swaps | 1.15 |
| A22 | Result region is **not** `aria-live`; one dedicated `role="status" aria-live="polite"` region carries "Working…", "Link copied" and the 502 sentence. One focus move, one announcement per settle | 1.15, 1.22 |
| A23 | `strike-button` uses `aria-disabled="true"` + ignored clicks, never the `disabled` attribute (which drops keyboard focus); `aria-busy="true"` sits on the result region | 1.15 |
| A24 | 400 uses `aria-invalid` + `aria-describedby` to a `role`-less message element; no `role="alert"` anywhere | 1.15, 1.16 |
| A25 | `notice` carries `role="note"` and a visually-hidden "Note:" lead-in | 1.15, 1.16 |
| A26 | Fixed `{colors.gold}` token for gold *text*; `--solar` drives only the masthead accent, live dot, button fill and canvas | 1.15 |
| A27 | `{colors.border-strong}` `#7E8B98` is the resting boundary of `website-input` and `chip`; `{colors.rule}` stays decorative | 1.15 |
| A28 | `/api/spark` follows AD-12 precedence: explicit JSON acceptance wins; otherwise HTML acceptance or browser-form content selects shell HTML. Local request scope → `303 /s/:id`; domain request scope, including downgrade → direct `200` home-shell HTML with the browser remaining at `/api/spark`; the enhanced path uses JSON + `history.replaceState` only for eligible local scope and otherwise leaves its current page URL unchanged. Fresh full-document HTML sets no scripted focus | 1.15, 1.16 |
| A29 | Seed Geometry canvas stops animating after ≤5s unless hovered/focused (WCAG 2.2.2), in addition to `prefers-reduced-motion` | 1.15 |
| A30 | `copy link` and footer links are ≥24×24 CSS px (2.5.8); chips are non-interactive and out of scope | 1.15 |
| A31 | `/how` has **four** Mermaid diagrams, each with its own accessible title/description and its own always-rendered ordered list; the plain-language content never depends on the CDN | 1.22 |
| A21 | Retention disclosure renders **always**, adjacent to element 8, in both invitation postures | 4.2 |
