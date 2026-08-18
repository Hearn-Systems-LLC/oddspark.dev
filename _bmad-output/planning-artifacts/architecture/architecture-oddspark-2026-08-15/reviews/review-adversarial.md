---
name: oddspark-architecture-spine-adversarial-review
type: review
reviews: ../ARCHITECTURE-SPINE.md
stance: adversarial
created: '2026-08-15'
verdict: holes-found
---

# Adversarial Review — Oddspark Architecture Spine

## Verdict

**Not ready to build against.** The spine's ten ADs fix *that* stages exist and *what* each is forbidden from doing, but leave the *ports between stages* — the Brief's concrete field types, the retry-loop owner, the canonicalization of breadcrumb text, and the commit envelope — undefined. Below, each hole is demonstrated by constructing two build units that each obey every AD to the letter and still produce incompatible software. Citations to existing behavior refer to `src/worker.js` (current shell the spine preserves per AD-6).

## Method

For each hole: two hypothetical implementers ("Dev-A" and "Dev-B") are each assigned one unit one level below the spine (a pipeline stage or the schema/renderer pair). Each follows the ADs literally. The clash is then shown to be *permitted* by the AD text, i.e. no AD is violated by either side, yet the system does not compose.

---

## Hole H1 — Brief field types are unspecified; Generate and Render diverge legally

**Severity: HIGH**

- **Dev-A (Generate stage)** reads AD-5 and emits:
  `plan` as an array of step strings; `before_after` as `["before text", "after text"]`; `why_fits.breadcrumb` as a string; `invitation` as a plain sentence; `stays_same.tools` as objects `{name, note}`; `version` as the string `"brief-1"`.
- **Dev-B (Brief schema + renderers)** reads the same AD-5 and builds renderers expecting:
  `plan` as a single string; `before_after` as `{before, after}`; `stays_same.tools` as strings; `invitation` as `{label, href}` (it must render a CTA button per CAP-4/AD-10); `version` as the integer `1` (Consistency Conventions say "persisted artifacts carry `version` + provenance" — like `PERSONALIZATION_VERSION = 1`, an integer, at `src/worker.js:28`).

Both conform to every character of AD-5, which enumerates field *names* but not a single field *type*. The HTML renderer (`render(s, push)` at `src/worker.js:1751`) and `asText` (`src/worker.js:1312`) both hard-branch on shape today (`s.personalization.what.adapted`, `.observation.text`); the same hard-branching on an underspecified Brief schema means silent `undefined` rendering, not a parse error — the worst failure mode for a "never blank" system (Data & formats convention).

AD-5's claim-discipline rule adds a second axis of divergence: "numeric strings are permitted … in fields the judge has verified against site-supplied numbers." Nothing marks *which* fields were judge-verified, so Dev-A emits numbers in `what_gets_better` believing the judge cleared them, while Dev-B's renderer (and Dev-J's judge, see H3) believes numbers are legal *only* in `change_level`. Gate verdicts become model-call-dependent: same Brief passes one judge prompt, fails another.

**Failed ADs:** AD-5 (names without types; unmarked verification provenance), Consistency Conventions "persisted artifacts carry `version`" (integer vs string version precedent is ambiguous).

**Fix (tighten AD-5):** attach a normative field-type table to the AD (or a JSON Schema in the repo the AD points to), including: cardinality of `breadcrumb` (exactly-one in website mode, forbidden in local mode — see H5), `before_after` shape, `invitation` shape, and that `version` is a schema-version integer distinct from house-Brief content versions. Add: "fields carrying judge-verified numbers are listed in the verdict; no other field may contain digits."

---

## Hole H2 — The retry loop has no owner; Gate and Generate both implement it, doubling spend

**Severity: HIGH**

The mermaid diagram shows the edge `GATE -->|fail, attempts left| GEN`, and AD-2 says the generator "never sees the judge's verdict except as a retry signal." Neither AD-2, AD-3, nor AD-9 names a stage that owns the attempt counter and the loop.

- **Dev-A (Generate)** implements `generateWithRetry(env, evidence)`: calls the judge internally, loops up to 3 attempts, returns the first passing Brief. Fully compliant: the generator never *reads* verdict content, only a boolean retry signal; AD-3's 3-candidate cap is honored; AD-9's call bound is honored.
- **Dev-J (Gate)** implements `gateCandidate(candidate) -> verdict` and, reading "at most 3 candidates per strike" in AD-3 as its own remit, also loops: on fail it re-invokes the Generate port itself.

Composed, a single strike can make up to 3 generate + 3 judge calls *inside* Generate, each of which the Gate wrapper re-drives — up to 9 generations and 9 judge calls in pathological interleavings, while each unit's own instrumentation shows it respecting AD-9's "max 6 model calls" bound. The spine's "pipes-and-filters, each consuming only the previous stage's output" (Design Paradigm) actually forbids Dev-A's design (Generate would consume Gate's output), but AD-2's "retry signal" phrase explicitly permits it — the paradigm statement and AD-2 conflict, and AD-3 never says where the counter lives.

**Failed ADs:** AD-2 ("retry signal" legitimizes a back-edge into Generate), AD-3 (cap without an owner), AD-9 (cost bound stated per-stage, not per-strike orchestration).

**Fix (new AD):** name the orchestrator — e.g. "the strike handler in the Router-adjacent assembly section owns the attempt counter; Generate is pure `(seed, evidence) -> candidate`; Gate is pure `candidate -> verdict`; neither calls the other." Amend AD-2 to delete "retry signal" from the generator's inputs.

---

## Hole H3 — Breadcrumb canonicalization and rejection are doubly owned by Evidence and Judge

**Severity: HIGH**

AD-4 requires "every quoted Breadcrumb must be an exact substring of a scanned page (extending the existing verification at `src/worker.js:886`)." AD-2 makes the judge responsible for "evidence grounding (AD-4)" and "exactly-one-breadcrumb presence." Two stages are thus told to enforce the same rule.

- **Dev-E (Evidence)** extends the existing check at `src/worker.js:886-892`: normalize with `normalizeSpace`, clip with `observationSpan`, verify `page.text.includes(text)` where `page.text` is the already-normalized, entity-decoded extraction (`extractPage`, `src/worker.js:417-435`). Evidence rejects ungrounded breadcrumbs and stores the *normalized* text in the bundle.
- **Dev-J (Judge)** implements "exact substring of a scanned page" literally: substring against the raw fetched HTML (the actual "scanned page"), or against `page.text` without normalization. A breadcrumb containing an HTML entity (`&amp;`) or collapsed whitespace passes Dev-E's check and fails Dev-J's. Since AD-2 says the judge's verdict is authoritative and AD-1 says no path skips Gate, Dev-E's passing breadcrumbs get failed at the Gate; every retry regenerates an equivalent breadcrumb (the generator correctly copies the Evidence Bundle text); all 3 attempts burn and the strike falls to the house Brief. Website-Grounded Mode is effectively dead on any site whose text needs entity decoding — i.e. most real sites.

There is a second, independent clash: AD-2 makes breadcrumb *presence* a judge concern while AD-4 makes breadcrumb *admissibility* an evidence concern. When the judge fails a candidate on breadcrumb grounds, is that a retryable fail (burns an attempt, AD-3) or a mode downgrade to Coherent Local (AD-4 threshold language)? Dev-J treats grounding failure as gate fail → retry; Dev-E treats it as evidence-threshold failure → local mode with notice. Same input, two different user-visible outcomes, both AD-compliant.

**Failed ADs:** AD-4 ("exact substring" without defining the canonicalization function or the comparison corpus — raw HTML vs `extractPage().text`), AD-2 (grounding re-checked without pinning it to the Evidence stage's canonical form), AD-4/AD-3 overlap (no rule mapping grounding failure to retry-vs-downgrade).

**Fix (tighten AD-4 + AD-2):** "Canonicalization is `normalizeSpace` + `observationSpan` over `extractPage().text`, owned solely by the Evidence stage; the judge re-verifies presence of the canonical string in the Evidence Bundle and never re-derives text from raw pages. Grounding failure of a *generated* breadcrumb is a gate failure (retry); absence of a verified observation in the bundle is the mode-downgrade path (AD-4 threshold)."

---

## Hole H4 — House Brief cannot pass the preserved COORD `/commit` validation; AD-6 and AD-7 contradict

**Severity: HIGH**

AD-6 preserves both Durable Objects "as they are unless another AD says otherwise." AD-7 commits "the first gate-passing Brief … through the existing `w:` / `pw:` pins and COORD claim/commit." But the existing commit path is closed to the new artifact shapes:

- `/commit` accepts only `result ∈ {personalized, unavailable}`, requires `p-[0-9a-f]{16}` ids for personalized sparks, and for `unavailable` requires an 8-hex id *and* `spark.personalization.status === "unavailable"` (`src/worker.js:707-716`). `SPARK_ID_RE` (`src/worker.js:39`) admits only those two id shapes.
- **Dev-C (Commit stage)** builds the house-Brief path per AD-3/AD-7: a curated, versioned Brief ("house Brief catalog … is versioned", Deferred) has no seed-derived 8-hex id and no `p-` hash. Under domain mode, the claim key is `dom:<round>:<domain>` (`src/worker.js:692`); committing the house Brief as `result:"unavailable"` requires forging `personalization.status:"unavailable"` on a perfectly good Brief — which then renders with the "generic spark" warning copy (`UNAVAILABLE_WARNING`, `src/worker.js:41`) because renderers branch on `personalization.status` (`src/worker.js:1333`, `src/worker.js:1760`), not on any Brief field.
- **Dev-R (Renderers)** builds against AD-5's `mode` field as the single source of truth for mode, ignoring the legacy envelope. Now the committed artifact carries two mode authorities (`personalization.status` vs `brief.mode`) that disagree exactly on the fallback path — the path that fires whenever the model is down.

Worse, AD-7's "domain-mode Briefs are internal-cache only — no `/s/:id` permalink" collides with the house Brief in domain mode: Dev-C must either (a) commit it under `pw:` as `"unavailable"` (today's behavior, `src/worker.js:1124`) — lying about what was served — or (b) mint a permalink-less id the router's `/s/:id` can't resolve anyway. Both are consistent with AD-7's letter.

**Failed ADs:** AD-6 vs AD-7 (preserved DO validation rejects the artifact AD-7 mandates; no AD "says otherwise" about the DO, so AD-6 blocks the needed change), AD-7 (no artifact/envelope mapping for house Briefs; single-mode-authority unstated).

**Fix (new AD or amend AD-7):** "The commit envelope gains `result:'house'` (or a `brief_version` field); `SparkCoordinator` validation and `SPARK_ID_RE` are extended accordingly — this AD is the 'another AD says otherwise' for AD-6. `brief.mode` is the sole mode authority; `personalization.status` is derived from it at the envelope boundary and never consulted by renderers. House Briefs in domain mode commit under the `(round, domain)` claim with no permalink; local mode commits under `w:` with the house id."

---

## Hole H5 — The local-mode Evidence Bundle and the threshold "notice" have no defined shape or owner

**Severity: MEDIUM**

AD-4 defines the Evidence Bundle as `{vertical, clarity, capabilities[], channels[], observation{url,text}, scanned_urls}` — a scan-shaped object. But Coherent Local Mode (CAP-1) has no scan. Two readings:

- **Dev-E** emits `null` bundle in local mode; Generate special-cases null.
- **Dev-A (Generate)** expects a synthesized bundle (local priors filling `vertical`/`capabilities`), because the Capability Map puts "local priors" *inside* Evidence. Each unit tests green against AD-4's literal text; the integration crashes on `observation.url` of null.

The existing preserved code adds a third shape: `inferWebsiteProfile` returns `{version, domain, scanned_urls, vertical, clarity, observation, scan_time, profile_hash}` (`src/worker.js:904-908`) — no `capabilities[]`, no `channels[]`, and it carries `domain` and `profile_hash` that AD-4's bundle omits. AD-6 preserves the profile cache path (`/profile` DO op, `hashProfile` at `src/worker.js:568-578`), so the Evidence stage must *both* satisfy AD-4's new bundle shape *and* the preserved profile-hash preimage — and nothing says whether `capabilities`/`channels` join the hash (changing `profile_hash` semantics invalidates cached profiles silently).

Separately, AD-4's "plain-language notice" on mode downgrade has no home: AD-5's schema has no notice field, and today's notices ride `personalization.warning` (`src/worker.js:41-43`, rendered at `src/worker.js:1769`). Dev-A stuffs the notice into `why_fits`; Dev-R renders a separate warning slot fed from the envelope; the judge (Dev-J) fails `why_fits` for consultant-speak because the notice is boilerplate. All three obey their ADs.

**Failed ADs:** AD-4 (bundle undefined for the no-scan mode; relation to the preserved `profile_hash` preimage unstated), AD-5 (no channel for the mandated notice), AD-6 (profile cache preserved without reconciling its shape with the new bundle).

**Fix (tighten AD-4/AD-5):** define the local-mode bundle explicitly (e.g. `observation: null`, priors in `capabilities`), freeze the `hashProfile` preimage to its current fields with new fields excluded by rule, and add `notice?` to the Brief schema (or to the commit envelope — pick one, say which).

---

## Hole H6 — Verdict JSON and pass aggregation are unspecified; "9 gates" is a count, not a contract

**Severity: MEDIUM**

AD-2 specifies verdicts as "`{gate: pass|fail, reason}` per gate" — but not the gate identifiers, the top-level shape, or the aggregation rule.

- **Dev-J** emits `{"gates": {"grounding": {"verdict":"pass","reason":"..."}, ...}}` and requires all nine to pass.
- **Dev-C / strike handler** expects `[{gate: 1, pass: true, reason: "..."}]` and treats "attempts left" as the only signal, ignoring per-gate content (which AD-2 forbids the generator from seeing anyway — so nobody is specified to *log* the reasons, and AD-8 forbids per-visitor analytics, so gate-failure reasons may have no legal persistence path at all).

Also unresolved between AD-2 and AD-9: the judge sees "the candidate" — but in website mode, must the judge also receive the Evidence Bundle to check grounding and exactly-one-breadcrumb? AD-2 lists grounding as a judge duty; AD-4's privacy guardrail limits what flows where; the Evidence→Gate port is never declared in the paradigm paragraph (only "the seed feeds enter at Generate; the window pin enters at Commit"). Dev-J plumbs the bundle into the judge call; Dev-E, reading the paradigm's port list literally, never exposes it. Gate cannot function; both complied.

**Failed ADs:** AD-2 (verdict shape/aggregation/gate registry undefined; judge inputs undefined), Design Paradigm (port list omits Evidence→Gate), AD-8 (no sanctioned sink for verdict telemetry).

**Fix:** new AD declaring the Gate's input port (`candidate + Evidence Bundle + mode`), the verdict schema with named gate ids 1–9, all-must-pass aggregation, and that verdict reasons are logged only via platform logs (`[observability]`, per Operational envelope), never KV.

---

## Hole H7 — "fallback" is one word for three events; analytics and cost accounting fork

**Severity: LOW-MEDIUM**

AD-8's `m:<day>:fallbacks` counter, AD-3's exhaustion fallback, AD-4's evidence-threshold mode downgrade, and AD-9's unknown-model degrade-to-house all use "fallback."

- **Dev-C** increments `fallbacks` only on AD-3 exhaustion.
- **Dev-E** increments it on every AD-4 downgrade (far more common — every unclear site).
- **Dev-A** counts AD-9 model-degradation as a fallback too, and also double-counts exhaustion because Dev-C already counted it at commit time (both instrument "the strike fell back", in different stages; the Consistency Conventions' "side effects best-effort with justified try/catch" means duplicate increments are never reconciled).

SM-2/SM-3 measurement (AD-8 binds) now compares counters that mix populations. No AD is violated — AD-8 never defines the event.

**Failed ADs:** AD-8 (event definitions absent; increment site unstated — single-writer rule missing).

**Fix (tighten AD-8):** enumerate the counters' triggering events and assign each counter exactly one writer stage (e.g. `fallbacks` = house-Brief served for any reason, written only by the strike handler).

---

## Summary table

| Hole | Severity | Clash | Failed / missing ADs |
| --- | --- | --- | --- |
| H1 | HIGH | Brief field types diverge Generate↔Render | AD-5, version convention |
| H2 | HIGH | Retry loop owned by both Gate and Generate | AD-2, AD-3, AD-9, paradigm |
| H3 | HIGH | Breadcrumb canonicalization doubly owned; retry-vs-downgrade fork | AD-4, AD-2, AD-3 |
| H4 | HIGH | House Brief can't pass preserved COORD commit validation; dual mode authority | AD-6 vs AD-7 |
| H5 | MEDIUM | Local-mode bundle shape; notice homeless; profile-hash preimage drift | AD-4, AD-5, AD-6 |
| H6 | MEDIUM | Verdict schema, aggregation, judge input port undefined | AD-2, paradigm, AD-8 |
| H7 | LOW-MED | "fallback" counter triple-defined, double-written | AD-8 |

## Recommended new / tightened ADs (minimum set to close the above)

1. **AD-5+**: normative Brief JSON Schema (types, cardinalities, integer `version`, `notice?` channel, judge-verified-number field list).
2. **AD-11 (new) — Orchestration owner**: strike handler owns attempt counting and stage sequencing; Generate and Gate are pure and mutually non-calling; delete "retry signal" from AD-2.
3. **AD-4+**: single canonicalization function owned by Evidence; judge re-verifies against the bundle only; grounding-fail → retry, bundle-deficiency → mode downgrade.
4. **AD-7+**: commit envelope extended for house Briefs (explicitly the AD-6 "otherwise"); `brief.mode` as sole mode authority; pin behavior per (mode × fallback) matrix.
5. **AD-2+**: verdict schema with gate registry, all-must-pass aggregation, declared Gate input port (candidate + bundle + mode).
6. **AD-8+**: counter event definitions with single-writer assignment.
