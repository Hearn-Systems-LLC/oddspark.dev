// Production pipeline environment (Story 1.25): constructs the PIPELINE_*
// content and provider ports the Story 1.23 assembly consumes, from content
// bundled with the Worker (imported modules — zero wrangler vars) and the AI
// binding. Every content bundle is verified by the REAL closed verification
// functions at construction; any verification failure returns null (never a
// partially wired environment), leaving the assembled writer unavailable.
//
// Provider ports wrap env.AI.run through the closed generation/judge
// adapters against env.AI_MODEL: the frozen prompt/parameter/wire shape,
// exactly one complete JSON value decoded from the frozen single response
// location, passed unchanged to the closed Candidate classifier and
// JudgeResult validator — no repair, coercion, prose/fence extraction, or
// alternate locations. AI_MODEL_FALLBACK is a presence-only misconfig guard:
// per Justin's 2026-08-22 topology decision (Story 1.11 spec change log) the
// generation role is qualified primary-only and the fallback model leg stays
// permanently unwired — generation exhaustion or failure serves the Story 1.13
// approved house Brief. PIPELINE_JUDGE carries the independently re-qualified
// Story 1.18.1 structural authority; its closed descriptor is constructed from
// the same resolved model/provider binding used by the frozen judge adapter.
//
// With ACTIVATION_MANIFEST absent none of this is consumed: the assembly
// evaluates the manifest first and returns null before any port validation.

import { canonicalJson, deepFreeze } from "./contracts.mjs";
import { verifyLocalPriors } from "./priors.mjs";
import { verifyApproval as verifyHouseApproval } from "./house.mjs";
import { validateCorpus } from "./corpus.mjs";

import priorsCatalog from "../../content/local-priors/v1/priors.json" with { type: "json" };
import priorsApproval from "../../content/local-priors/v1/approval.json" with { type: "json" };
import houseCatalog from "../../content/house-briefs/v1/catalog.json" with { type: "json" };
import houseApproval from "../../content/house-briefs/v1/approval.json" with { type: "json" };
import voiceRubric from "../../semantic/voice/v1/rubric.json" with { type: "json" };
import voiceGoldens from "../../semantic/voice/v1/goldens.json" with { type: "json" };
import voiceAntiGoldens from "../../semantic/voice/v1/anti-goldens.json" with { type: "json" };
import voiceCorpusApproval from "../../semantic/voice/v1/approval.json" with { type: "json" };

// The content bundled with the Worker. Hashes are provable at build/verify
// time: the closed verifiers below recompute content identity and bind it to
// the bundled approval records, so drifted content fails closed. The
// `writer:preflight` gate additionally pins the expected content hashes as
// constants and fails on any byte drift.
const BUNDLED_CONTENT = deepFreeze({
  priors: { priors: priorsCatalog, approval: priorsApproval },
  house: { catalog: houseCatalog, approval: houseApproval },
  corpus: { rubric: voiceRubric, goldens: voiceGoldens, anti_goldens: voiceAntiGoldens, approval: voiceCorpusApproval },
});

const nonblank = (value) => typeof value === "string" && value.trim() !== "";
const JUDGE_QUALIFICATION_REF = "7dc1ec98a625a1dd16f1166067b496e4209a415e7f10854ff781f46d0d0062d0";

/* ------------------------------------------------------------------ *
 * Frozen adapter wire shape (the governed generation/judge qualification
 * plans): prompts, parameters, and structured-response schemas. These are
 * the exact adapter constants the qualification evidence binds; model
 * identity comes from the frozen wrangler vars, never from this module.
 * ------------------------------------------------------------------ */

// Mirrors PROMPT in spikes/generation-qualification/contract.mjs (the governed
// source of truth); keep byte-identical so the qualified identity matches production.
export const GENERATION_PROMPT = `You are a product strategist for small local businesses. The user message contains generation inputs (an evidence object — region, season, situation, capability_bundle — and a random seed). Your task: INVENT one new, practical improvement the business could make using software or workflow automation, and return it as exactly one JSON Candidate object matching the supplied JSON Schema.

Rules:
- The user message is input only. NEVER copy, echo, or reshape it into the output. The output is a new object describing your invented idea.
- Use these exact nested object shapes: why_fits is an object {"text": "..."} (never a dotted key, never a breadcrumb field); before_after is {"before": "...", "after": "..."}; change_level is {"time_range": "...", "steps_changed": 0, "steps_removed": 0, "preliminary": true} with non-negative integer step counts; stays_same is {"tools": [...], "authority": [...], "steps": [...]}.
- version is exactly 1; mode is exactly "local"; title, plan, what_gets_better, invitation are nonblank strings.
- grounded_numbers MUST be an empty array [] in local mode. Write every narrative field qualitatively: no digits or numeric tokens anywhere outside change_level's integer fields (use words like "one afternoon" instead).
- Never mention prices or costs: no currency symbols and none of the words price, pricing, cost, fee, subscription, per month, per year.
- invitation must contain the word "Spark" and be a confident, bounded next step addressed to the owner — a statement, not a question. Never hedge ("if it is worth", "if it sounds useful", "not worth changing", "call it off") and never use pitch language ("act now", "book now", "limited time", "schedule a call", "don't miss", "last chance").
- Do not include a candidate_ref. Do not wrap, fence, explain, or add any text outside the JSON object.`;

export const GENERATION_PARAMETERS = deepFreeze({ temperature: 0, max_tokens: 2048 });

// Judge calls share the generation parameter identity.
export const JUDGE_PARAMETERS = deepFreeze({ temperature: 0, max_tokens: 2048 });

export const GENERATION_RESPONSE_FORMAT = deepFreeze({
  type: "json_schema",
  json_schema: {
    type: "object", additionalProperties: false,
    required: ["version", "mode", "title", "plan", "why_fits", "what_gets_better", "before_after", "change_level", "stays_same", "invitation", "grounded_numbers"],
    properties: {
      version: { const: 1 }, mode: { enum: ["local", "domain"] }, title: { type: "string", minLength: 1 }, plan: { type: "string", minLength: 1 },
      why_fits: { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string", minLength: 1 }, breadcrumb: { type: "string", minLength: 1 } } },
      what_gets_better: { type: "string", minLength: 1 },
      before_after: { type: "object", additionalProperties: false, required: ["before", "after"], properties: { before: { type: "string", minLength: 1 }, after: { type: "string", minLength: 1 } } },
      change_level: { type: "object", additionalProperties: false, required: ["time_range", "steps_changed", "steps_removed", "preliminary"], properties: { time_range: { type: "string", minLength: 1 }, steps_changed: { type: "integer", minimum: 0 }, steps_removed: { type: "integer", minimum: 0 }, preliminary: { const: true } } },
      stays_same: { type: "object", additionalProperties: false, required: ["tools", "authority", "steps"], properties: { tools: { type: "array", items: { type: "string", minLength: 1 } }, authority: { type: "array", items: { type: "string", minLength: 1 } }, steps: { type: "array", items: { type: "string", minLength: 1 } } } },
      invitation: { type: "string", minLength: 1 }, grounded_numbers: { type: "array", items: { type: "string", minLength: 1 } }, notice: { type: "string", minLength: 1 },
    },
    allOf: [{ if: { properties: { mode: { const: "domain" } } }, then: { properties: { why_fits: { required: ["text", "breadcrumb"] } } }, else: { properties: { why_fits: { not: { required: ["breadcrumb"] } } } } }],
  },
});

export const JUDGE_PROMPT = `You are the independent Oddspark judge. Evaluate the supplied synthetic Candidate Brief against every check below.

1. Recognizable routine: starts from a credible routine and recurring annoyance.
2. Constructive intervention: every friction leads to an imaginable solution.
3. Capability inventory: does not duplicate an existing capability.
4. Channel fit: uses an observed channel or clearly introduces a fitting one.
5. Proportionality: matches likely scale, complexity, and maintenance capacity.
6. Delivery fit: Hearn Systems could implement it as software, AI automation, integration, data workflow, or adjacent digital system.
7. Preservation: retains helpful tools, workflow steps, and decision rights it need not change.
8. Natural retelling: a person could naturally explain the situation, capability, and payoff.
9. Novel but imaginable: goes beyond the obvious while remaining concrete.

Also evaluate tone (confident plan, plain language, no pitch, no consultant-speak, no bare-mush effects) and claims (qualitative unless supplied evidence grounds a number). Use the supplied grounding report; do not add a grounding field or a tenth gate.

Return only one JSON value matching the supplied schema. Include gates 1 through 9 exactly once. Set top-level pass to true only when all nine gates, tone, and claims pass.`;

const JUDGE_CHECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "reason"],
  properties: {
    pass: { type: "boolean" },
    reason: { type: "string", minLength: 1, pattern: "\\S" },
  },
};

export const JUDGE_RESPONSE_FORMAT = deepFreeze({
  type: "json_schema",
  json_schema: {
    type: "object",
    additionalProperties: false,
    required: ["pass", "gates", "tone", "claims"],
    properties: {
      pass: { type: "boolean" },
      gates: {
        type: "array",
        minItems: 9,
        maxItems: 9,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["gate", "pass", "reason"],
          properties: {
            gate: { type: "integer", minimum: 1, maximum: 9 },
            pass: { type: "boolean" },
            reason: { type: "string", minLength: 1, pattern: "\\S" },
          },
        },
      },
      tone: JUDGE_CHECK_SCHEMA,
      claims: JUDGE_CHECK_SCHEMA,
    },
  },
});

/* ------------------------------------------------------------------ */

// The closed transport-envelope decode: exactly one complete JSON value from
// the frozen single response location. Anything else throws — the providers
// never repair, coerce, or search alternate locations.
function decodeStructuredResponse(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("provider response is not an envelope");
  if (!Array.isArray(result.choices) || result.choices.length !== 1) throw new Error("provider response must contain exactly one choice");
  const choice = result.choices[0];
  if (!choice || typeof choice !== "object" || Array.isArray(choice) || choice.index !== 0) throw new Error("provider choice is invalid");
  const message = choice.message;
  if (!message || typeof message !== "object" || Array.isArray(message) || typeof message.content !== "string") throw new Error("provider choice has no structured content text");
  let output;
  try { output = JSON.parse(message.content); } catch { throw new Error("provider content is not exactly one JSON value"); }
  if (!output || typeof output !== "object" || Array.isArray(output)) throw new Error("provider content is not one structured object");
  return output;
}

// Verify the whole bundled content bundle through the real closed
// verification functions. Any failure (drift, pending or invalid approval,
// unapproved corpus) fails the entire construction closed.
function contentReady(content, nowMs) {
  const now = new Date(nowMs);
  const priors = verifyLocalPriors(content?.priors?.priors, content?.priors?.approval, { now });
  if (priors.production_ready !== true) return false;
  const authorities = { priors: content.priors.priors, rubric: content?.corpus?.rubric };
  const house = verifyHouseApproval(content?.house?.catalog, content?.house?.approval, authorities, { now });
  if (house.ready !== true) return false;
  return validateCorpus(content?.corpus, { nowMs }).readiness === "approved";
}

function generationProvider(env) {
  const model = env.AI_MODEL;
  return async (request) => {
    const result = await env.AI.run(model, {
      messages: [
        { role: "system", content: GENERATION_PROMPT },
        { role: "user", content: canonicalJson(request) },
      ],
      ...GENERATION_PARAMETERS,
      response_format: GENERATION_RESPONSE_FORMAT,
    });
    return decodeStructuredResponse(result);
  };
}

function judgeProvider(env) {
  const model = env.AI_MODEL;
  return async (request) => {
    // The request must carry the frozen candidate_ref the Gate bound; a null
    // or malformed request is a closed provider error, never a leaked
    // TypeError from property access.
    if (!request || typeof request !== "object" || typeof request.candidate_ref !== "string") {
      throw new Error("judge request must carry the frozen candidate_ref");
    }
    const result = await env.AI.run(model, {
      messages: [
        { role: "system", content: JUDGE_PROMPT },
        { role: "user", content: canonicalJson(request) },
      ],
      ...JUDGE_PARAMETERS,
      response_format: JUDGE_RESPONSE_FORMAT,
    });
    // The wrapper metadata maps losslessly: the candidate_ref is the frozen
    // request value and the verdict is the one decoded value. This module
    // only decodes — the verdict itself is validated downstream by the
    // composite Gate's closed JudgeResult validator (validateJudgeResult).
    return { candidate_ref: request.candidate_ref, verdict: decodeStructuredResponse(result) };
  };
}

// Construct the production pipeline environment. Returns null — never a
// partial environment — when the AI binding or frozen model vars are absent,
// or when any bundled content fails the real closed verifiers. `content` is
// the offline content seam: tests and the writer:preflight smoke inject a
// fully-approved content set through it to prove wireability; production
// always takes the bundled default.
export function productionPipelineEnv(env, content = BUNDLED_CONTENT) {
  try {
    if (typeof env?.AI?.run !== "function") return null;
    if (!nonblank(env.AI_MODEL) || !nonblank(env.AI_MODEL_FALLBACK)) return null;
    if (!contentReady(content, Date.now())) return null;
    return deepFreeze({
      PIPELINE_PRIORS: content.priors,
      PIPELINE_HOUSE: deepFreeze({
        catalog: content.house.catalog,
        approval: content.house.approval,
        authorities: deepFreeze({ priors: content.priors.priors, rubric: content.corpus.rubric }),
      }),
      PIPELINE_CORPUS: content.corpus,
      PIPELINE_JUDGE: deepFreeze({
        role: "STRUCT-JUDGE",
        provider: "cloudflare-workers-ai",
        resolved_model: env.AI_MODEL,
        qualification_ref: JUDGE_QUALIFICATION_REF,
        status: "active",
        outcome: "GO",
      }),
      PIPELINE_GENERATE_PROVIDER: generationProvider(env),
      PIPELINE_JUDGE_PROVIDER: judgeProvider(env),
    });
  } catch {
    return null;
  }
}
