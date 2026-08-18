---
name: review-rubric
type: architecture-review
subject: ../ARCHITECTURE-SPINE.md
reviewer: rubric-walker
created: '2026-08-15'
verdict: adequate
---

# Rubric Review — ARCHITECTURE-SPINE.md (oddspark pipeline)

Overall verdict: **adequate**. The spine is genuinely decisive where it matters (gate placement, schema, commit semantics, cost bound) and ratifies the brownfield accurately. It loses points on one silent dimension (testing/verification is nowhere decided, deferred, or raised), one enforceability gap in the cost AD, and a stale line-number citation. Nothing found is fatal.

## 1. Divergence points for the level below — **adequate**

The real forks a build unit would face are pinned: gate placement (AD-1), judge/generation split (AD-2), fallback policy (AD-3), evidence grounding + mode fallback threshold (AD-4), artifact shape (AD-5), preservation seam (AD-6), reproducibility semantics (AD-7), analytics shape (AD-8), per-strike cost bound (AD-9), UI surface (AD-10). The mermaid pipeline and the "Structural Seed" give each stage a home in the single file, which is the right granularity for a feature-altitude spine over one worker.

Two real forks are under-specified:

- **Concurrency/dup-press semantics during generation**: AD-7 covers committed artifacts but says nothing about concurrent in-flight strikes for the same window before a commit — does a second press wait on the claim (the current `acquireDomainClaim` loop, `src/worker.js:986`) or generate independently? The Rule ("first gate-passing Brief … is committed") implies claim-then-generate but never says who generates under lease. Two units could diverge here. (Finding F-2, minor.)
- **Renderer changes**: AD-5 says renderers consume the schema, but the page-shell rendering of `change_level`/`stays_same`/`before_after` (all new fields vs. the current `{headline,premise,question}`) has no layout/spine-level commitment beyond "consume Brief schema". Acceptable at feature altitude, but borderline. (Finding F-3, minor.)

## 2. AD Rules enforceable and prevent stated divergence — **adequate**

- AD-1 (no `Generate`→`Render` path skipping `Gate`): structurally checkable by code inspection of the pipeline section. Strong.
- AD-2 (separate judge call, structured verdict, temp ≈ 0, fixed checklist of what it judges): enforceable; listing tone enforcement as judge-only removes the most likely ambiguity. Strong.
- AD-3 (≤3 candidates, house Brief on exhaustion): countable, enforceable. Strong.
- AD-4 (substring grounding, threshold formula `clarity=clear ∧ ≥1 verified observation ∧ non-empty capabilities[]`): the threshold is concrete and testable; grounding extends an existing pattern. Strong.
- AD-5 (typed schema, numeric-string confinement): schema is explicit; "fields the judge has verified against site-supplied numbers" is enforceable through AD-2's judge. Strong.
- AD-6 (seam): "replaces only internals of `generate`/`generatePersonalized` behind existing call sites" is a checkable boundary. Strong.
- AD-7 (cache-first commit): enforceable against the `w:`/`pw:` pin pattern. It openly flags that it upgrades PRD §6.2 and asks the PRD be updated — good hygiene, but until the PRD is amended the two artifacts contradict; tracked as F-4 (minor).
- AD-8 (`m:` counters, no per-visitor keys beyond named carve-outs): enforceable. Strong.
- AD-9 (**weak**): "fail to the house Brief if the pipeline exceeds the existing response budget envelope (scan 4s + generation attempts)" — there is no existing generation wall-clock budget in the code; `SCAN_BUDGET_MS = 4000` exists (`src/worker.js:31`) but generation has no timeout today. "Existing response budget envelope" is not an enforceable reference; the Rule needs a number. (Finding F-1, major — this is the cost/latency AD, and its enforcement clause is unmeasurable.)
- AD-10: enforceable. Strong.

## 3. Deferred items divergence-safe — **adequate**

Deferred list (§Deferred): judge prompt text, gate-9/OQ6 calibration, launch-readiness gate, house Brief catalog, `/how` rewrite, KV TTL/CORS/meter cleanup, operational envelope. The calibration items are gated on golden Briefs that must exist pre-launch (the "Launch readiness gate" entry), so two units cannot both ship divergent calibrations — the sequencing is sound. Judge *wording* is deferred but AD-2 fixes judge *content*; residual divergence is stylistic, which is the legitimate thing to defer. The cleanup trio are pre-existing edges, correctly out of scope. No deferred item permits structural divergence between units.

## 4. Named tech verified-current — **strong**

- `@cf/openai/gpt-oss-120b` / `gpt-oss-20b` on Workers AI: current catalog models, and they match `wrangler.toml:12-13` exactly.
- wrangler 4.x: matches `package.json` (`^4.114.0`).
- Compatibility date `2026-07-01` + `global_fetch_strictly_public`: matches `wrangler.toml:3-4` verbatim.
- KV namespace, both SQLite DO classes with v1/v2 migrations: match `wrangler.toml:21-41`.

## 5. Ratifies rather than contradicts brownfield — **adequate**

Verified against `src/worker.js`:

- KV prefixes `w:`, `pw:`, `profile:`, `n:` all present (`src/worker.js:784, 1024, 1087, 1176`); SPARK_ID_RE matches the claimed `seed[0:8]` / `p-<hash[0:16]>` (`src/worker.js:39`). Consistency Conventions table is accurate.
- `modelFor` + NeuronMeter + fallback-fraction behavior as described in AD-9 exists (`src/worker.js:790-794`).
- COORD claim/commit/profile/slot and `coordPost`/`meterStub` helpers exist as described (`src/worker.js:661-764, 766-768, 966-974`).
- "Axis lists deleted" in the Structural Seed is consistent with the four-axis `derive` at `src/worker.js:221-235`.
- Scan budgets cited by AD-6/AD-9 (4s, byte/page/redirect limits) match `src/worker.js:31-34`.

One citation defect: AD-4 says substring grounding extends "the existing verification at `src/worker.js:886`" — line 886 is the page lookup; the actual grounding check is `src/worker.js:888-892`. Right mechanism, wrong line. (F-5, trivial.)

## 6. Driving spec capability coverage (CAP-1..4) — **strong**

The Capability → Architecture Map covers CAP-1 (Evidence+Generate, AD-1/3/6), CAP-2 (scan bundle, AD-4/6), CAP-3 (Gate+house Briefs, AD-1/2/3/9), CAP-4 (schema+renderers+`/api/cheer`, AD-5/7/8/10), plus FR-11 receipt and the privacy boundary as extra rows. `binds:` front-matter lists all four. Every CAP has at least one AD whose Rule is structural rather than aspirational. No capability is orphaned.

## 7. Every altitude-owned dimension decided, deferred, or open — **thin**

Decided: layout, naming, data/error formats, state/mutation, stack, paradigm, seam, cost, analytics, interaction, reproducibility. Deferred safely: prompts, calibration, catalog content, `/how`, cleanup edges. **But two dimensions are silent:**

- **Operational/environmental envelope**: addressed only by a single Deferred bullet ("single existing production Worker on oddspark.dev, wrangler deploy, `[observability]` platform logs; no new environments owned at this altitude"). That is a ratification, and wrangler.toml confirms it (`[observability] enabled`, custom-domain route) — but it is filed under "Deferred" when it is actually *decided*, and nothing states rollback/failure posture for a deploy that changes the commit artifact shape (old `{headline,premise,question}` sparks still pinned under `w:`/`pw:` in KV). Mixed-version pinned artifacts surviving a deploy is exactly the kind of envelope question this altitude owns. (F-6, minor.)
- **Testing/verification**: the repo has `test.mjs` and the code comments note worker.js is deliberately importable under plain Node (`src/worker.js:639-640`). The spine never mentions how the pipeline is to be tested — not decided, not deferred, not open. For a spine introducing a judge and a schema, this is a whole silent dimension. (F-7, minor-major.)

## Findings

| ID | Severity | Location | Summary |
| --- | --- | --- | --- |
| F-1 | major | AD-9 | Wall-clock budget Rule references an "existing response budget envelope" that does not exist for generation; unenforceable as written. Give it a number. |
| F-2 | minor | AD-7 | In-flight concurrent strikes before first commit: claim-wait vs. independent generation unstated. |
| F-3 | minor | AD-5 / Structural Seed | New Brief fields (`change_level`, `stays_same`, `before_after`) have no page-shell layout commitment. |
| F-4 | minor | AD-7 | Spine upgrades PRD §6.2 receipt decision; until PRD is amended the artifacts contradict (spine self-flags this). |
| F-5 | trivial | AD-4 | Grounding check cited at `src/worker.js:886`; actual check is `:888-892`. |
| F-6 | minor | §Deferred | Operational envelope is decided-in-fact but filed as Deferred; no posture on mixed-version pinned artifacts across deploy. |
| F-7 | minor-major | (silent) | Testing/verification strategy dimension entirely absent from the spine despite `test.mjs` being a designed-in affordance. |

Severity counts: **1 major, 5 minor, 1 trivial** (F-7 counted as minor-major ≈ minor+; tabulated as 1 major / 5 minor / 1 trivial with F-7 the strongest minor).

## Recommendation

Approve with required amendments: fix F-1 (numeric strike budget) and add a Testing line (decided or deferred) before build starts. F-2/F-6 can be resolved in the same pass. The rest are annotation-level.
