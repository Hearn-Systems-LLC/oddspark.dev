# Ad-hoc Review — Privacy Guardrails & Claims Honesty

**Subject:** `prd.md` (PRD: Oddspark Coherence-Gated Opportunity Brief Pipeline, draft 2026-08-15) + `addendum.md`
**Lens:** privacy guardrails (no PII, cookies, sessions, reviews, off-site footprint) and claims discipline (qualitative-unless-sourced, no pre-discovery pricing, no fabricated ROI). Severity = legal/reputational risk at launch.
**Verdict:** The guardrails are well-intentioned but enforced mostly by non-goals and a single FR (FR-8) whose key terms are undefined and whose consequences are largely untestable. Several load-bearing mechanisms (LLM world knowledge, per-visitor rate limiting, analytics for SM-1, KV reproducibility receipts) can each silently defeat the stated boundary. **Not launch-ready without the fixes below.**

---

## Critical / High findings

### H1. "General vertical knowledge" is an unbounded evidence loophole (FR-2, FR-8, §4.1)
FR-8 limits evidence to "the submitted public website plus general vertical knowledge and current date/time," but "general vertical knowledge" is never defined or bounded. In an LLM-based pipeline, the model's pretraining may contain exactly the things the PRD forbids — Google reviews, off-site footprint, prior knowledge of the specific named business. Nothing in any FR or gate prohibits the model from using memorized business-specific facts; FR-2's consequence ("traceable to at least one signal in the Evidence Bundle") only requires *one* signal, leaving all other content unconstrained. A Brief that references something the model "knew" rather than scanned would violate the Non-Goal (§5: "no reviews, off-site business-footprint research") while passing every stated test.
**Fix:** define "general vertical knowledge" (industry-generic patterns only, never business-specific facts), add an FR consequence: "no business-specific fact appears in the Brief unless traceable to the Evidence Bundle," and add it to the coherence-gate or judge checklist (Open Question 3).

### H2. "PII" is undefined; scanning a public site inevitably ingests personal data (FR-8, FR-9, §4.4)
Small-business sites routinely publish the owner's personal name, mobile number, home address, family photos. FR-8's consequence — "No PII, cookies, sessions, Google reviews, or off-site footprint data is fetched or used" — is impossible as literally written: fetching the public site *is* fetching whatever PII is on it. The guardrail as stated is untestable and will be interpreted downstream as either "no PII collected" (impossible) or "no PII shown" (not required anywhere). FR-9 caps the Breadcrumb at one detail but does not bar that detail from being personal — a "charming" Breadcrumb naming the owner's kid ("since 2019, run by Maria and her daughter…") is a reputational incident waiting to happen, and SM-4's "charming-not-creepy" review is post-hoc sampling, not prevention.
**Fix:** reword FR-8 to "no PII beyond what is published on the submitted site; personal names, personal phone numbers, and personal addresses are excluded from generation context and from the Breadcrumb." Add a testable consequence to FR-9: "the Breadcrumb references business artifacts (menus, hours, services), never personal details."

### H3. Per-visitor rate limiting conflicts with the no-cookies/no-sessions boundary — unflagged (addendum, Cross-Cutting NFRs, Open Question 4)
The addendum (preserved mechanics) lists "visitor window 1h, domain limit 10 per visitor" rate limiting. Per-visitor limiting without cookies or sessions implies server-side identification by IP (or fingerprint) — IP addresses are personal data under GDPR/CCPA-adjacent regimes, and "no sessions" is a stated hard guardrail (Cross-Cutting NFRs: "hard guardrail, not a default"). This conflict is nowhere flagged: Open Question 4 covers analytics only, not the rate limiter or the 24h "profile TTL" (whose contents — a stored per-domain profile built from scans — are never specified or retention-justified).
**Fix:** add an Open Question (or FR) explicitly covering what "visitor" means under the no-cookies/no-sessions rule, how rate limiting is implemented without visitor identification (e.g., IP hashed with rotating salt, documented retention), and what the 24h KV profile contains and why 24h is the right TTL.

### H4. No consent/ownership/robots handling for scanning arbitrary third-party domains (FR-8, §4.4, UJ-2)
Anyone can submit *any* domain — including a competitor's, an ex-employer's, or a stranger's business. The PRD contains no FR for: robots.txt / crawl-directive respect, submitter attestation that they own or are authorized to scan the site, or handling of sparks generated *about* a business whose owner never asked. The generated Brief (with Breadcrumb) is reproducible and third-party verifiable per FR-11 — i.e., a persistent, shareable artifact describing a third party's business weaknesses, generated without their knowledge. Combined with the "receipt" brand joke (Open Question 1), this is the highest reputational exposure in the document.
**Fix:** add FRs: respect robots.txt/ToS signals during scan; display a plain-language "you confirm this is your business or you have permission" line at the domain field; decide in Open Question 1 whether receipts/briefs for third-party domains are publicly fetchable and for how long.

---

## Medium findings

### M1. FR-6 self-contradicts FR-5 on numbers (§4.3)
FR-6 consequence: "In Website-Grounded Mode, every number in the Brief is traceable to the public site." FR-5 consequence: "Change Level always includes a preliminary time range." A time range is a number that cannot come from the site — it is precisely the fabricated precision §5 bans ("false precision"). As written, FR-6's test would fail every compliant FR-5 render, or downstream implementers will quietly exempt time estimates, reopening the door to invented figures.
**Fix:** carve out explicitly in FR-6: "the only permitted non-site numbers are qualitative change-level ranges from a fixed, labeled-estimate vocabulary (e.g., 'an afternoon', 'a week'), never hours/dollars/percentages."

### M2. SM-1 is a primary launch metric with no privacy-compliant measurement path (§7, §8 Q4)
SM-1 (invitation engagement %) requires per-Brief click measurement; Open Question 4 admits this may conflict with the guardrail but the PRD neither gates launch on resolving it nor defines an acceptable minimum (e.g., aggregate, no-visitor-ID event counts). Risk: pressure to hit the 4-week baseline becomes the argument that weakens the no-cookies boundary post-launch. SM-2's weekly sample of 20 Briefs likewise implies Brief retention/logging that no FR authorizes or bounds.
**Fix:** either de-primary SM-1 until Q4 resolves, or specify now: "measurement is aggregate-only, server-side, no visitor identifiers, Briefs retained ≤ N days for sampling."

### M3. Logging/retention of domains, scans, and briefs is unaddressed (§4.4, §4.5, addendum)
The guardrails regulate what is *fetched or used in generation*, but nothing regulates what the operator *stores*: submitted domains (queries revealing which businesses prospects are researching — commercially sensitive), full Evidence Bundles, KV-cached briefs, request logs. A privacy posture that says "we never collect PII" while retaining scan bundles and access logs indefinitely is a claims-honesty problem in its own right.
**Fix:** add an FR covering data lifecycle: what is stored (domains, bundles, briefs), retention periods, and deletion.

### M4. §2.1 "without exposing that any research happened" conflicts with the Breadcrumb mechanic (§2.1, FR-9, UJ-2)
The emotional job says the spark should feel like it belongs to the business "without exposing that any research happened," while UJ-2 and FR-9 surface a Breadcrumb that *explicitly reveals* the site was scanned. Beyond UX tension, this is a disclosure-honesty question: the product performs automated research on the visitor's business; the PRD should decide whether that is disclosed (recommended) rather than concealed.
**Fix:** resolve the contradiction in UJ copy — the Breadcrumb *is* the disclosure; delete "without exposing that any research happened."

### M5. Guardrail enforcement rests on Non-Goals, which have no FRs or tests (§5, FR-8)
"No PII… reviews… off-site research" appears in §5 (non-goals) and the NFR list, but the only normative hook is FR-8's single untestable sentence. There is no gate among the nine (FR-3) that checks privacy/claims compliance of a Candidate, so a candidate citing a review-sourced fact or an invented number is not rejected by the pipeline — only by FR-6 rendering tests that check *form* (numbers present) not *provenance*.
**Fix:** add a tenth gate or extend FR-3's representative test set with privacy/claims adversarial cases (model cites off-site fact; model invents percentage; Breadcrumb contains personal name).

---

## Low findings

- **L1 — SM-4/SM-5 human review is unstaffed and uncosted** (§7): "judged charming-not-creepy in review" assumes a reviewer and rubric that don't exist as an FR; low legal risk but the safeguard is illusory until defined.
- **L2 — FR-4 fallback notice copy is unspecified** (FR-8 consequence): "plain-language notice" when a scan fails is the one place the product admits it tried to scan the site; the copy is parked as an ASSUMPTION. If it says nothing, combined with M4 the product scans silently; if it says too much, it contradicts §2.1. Needs an explicit decision, not an assumption.
- **L3 — Open Question 5's "minimum evidence threshold" has no privacy direction** (§8 Q5): falling back is defined for *insufficient* evidence but not for *over-reached* evidence (site with heavy personal content); the fallback criteria should include privacy-sensitive triggers, not just clarity ones.

## Open Questions audit (§8)

- Q4 correctly flags analytics vs no-cookies, but **under-scopes the conflict**: it omits the rate limiter (H3), the 24h KV profile, SM-2's sampling retention, and request logging (M2/M3). Should be rewritten as "what state, if any, may the system keep about visitors, domains, scans, and briefs?"
- Q1 (seed receipt) has an unflagged privacy dimension: reproducible, third-party-verifiable briefs mean third-party business analyses are publicly fetchable artifacts (H4).
- No open question covers the arbitrariness of submitted domains (H4) — the single biggest unflagged exposure.

## Summary of required pre-launch changes

1. Bound "general vertical knowledge" and prohibit business-specific facts not in the Evidence Bundle (H1).
2. Define PII operationally and exclude personal details from context and Breadcrumb (H2).
3. Reconcile rate limiting, KV profiles, and any analytics with the no-cookies/no-sessions guardrail; expand Open Question 4 (H3, M2, M3).
4. Add robots/permission handling and a submitter attestation; decide receipt publicity for third-party domains (H4).
5. Fix the FR-5/FR-6 numeric contradiction with an explicit estimate vocabulary (M1).
6. Add a privacy/claims gate or adversarial test cases to FR-3 (M5).
