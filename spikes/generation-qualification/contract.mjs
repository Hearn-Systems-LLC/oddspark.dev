import { createHash } from "node:crypto";
import { CANDIDATE_SCHEMA_VERSION, canonicalJson, deriveCandidateRef } from "../../scripts/brief-contracts.mjs";
import { GenerationError, classifyGenerationResult } from "../../scripts/generation.mjs";
import { PREDICATE_ORACLE, PREDICATE_ORACLE_HASH, PREDICATE_ORACLE_VERSION } from "../judge-fidelity/contract.mjs";

export const CONTRACT_VERSION = "oddspark.generation-qualification-contract/v2";
export const PROVIDER = "cloudflare-workers-ai";
export const LEGACY_ROLE_IDENTITIES = Object.freeze([
  Object.freeze({ role: "primary", resolved_model: "@cf/openai/gpt-oss-120b" }),
  Object.freeze({ role: "fallback", resolved_model: "@cf/openai/gpt-oss-20b" }),
]);
export const ROLE_IDENTITIES = Object.freeze([
  Object.freeze({ role: "primary", resolved_model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }),
  Object.freeze({ role: "fallback", resolved_model: "@cf/meta/llama-3.1-8b-instruct-fast" }),
]);
export const PARAMETERS = Object.freeze({ temperature: 0, max_tokens: 2048 });
export const TIMEOUT_POLICY = Object.freeze({ adapter_timeout_ms: 120000, preflight_timeout_ms: 10000, probes_must_complete_before_trials: true, execution: "sequential", retries: 0, replacements: 0 });
export const TRIALS_PER_ROLE = 20;
export const PROBES_PER_ROLE = 1;
export const CALL_CAP = 42;
export const DIRECT_VALID_THRESHOLD = 19;
export const MAX_RETAINED_OUTPUT_BYTES = 64 * 1024;
export const TAXONOMY = Object.freeze(["direct_valid", "invalid_output", "output_too_large", "provider_error", "timeout"]);
export const STORY_1_3_ORACLE_VERSION = PREDICATE_ORACLE_VERSION;
export const STORY_1_3_ORACLE_HASH = PREDICATE_ORACLE_HASH;
export const STORY_1_3_PREDICATES = Object.freeze(PREDICATE_ORACLE.map(({ id }) => id));
export const GENERATION_PREDICATES = Object.freeze([
  ...STORY_1_3_PREDICATES,
  "roles.independent", "output.direct_candidate", "schedule.zero_retry", "cost.recomputed", "manifest.independent",
]);
export const PROMPT = `You are a product strategist for small local businesses. The user message contains generation inputs (an evidence object — region, season, situation, capability_bundle — and a random seed). Your task: INVENT one new, practical improvement the business could make using software or workflow automation, and return it as exactly one JSON Candidate object matching the supplied JSON Schema.

Rules:
- The user message is input only. NEVER copy, echo, or reshape it into the output. The output is a new object describing your invented idea.
- Use these exact nested object shapes: why_fits is an object {"text": "..."} (never a dotted key, never a breadcrumb field); before_after is {"before": "...", "after": "..."}; change_level is {"time_range": "...", "steps_changed": 0, "steps_removed": 0, "preliminary": true} with non-negative integer step counts; stays_same is {"tools": [...], "authority": [...], "steps": [...]}.
- version is exactly 1; mode is exactly "local"; title, plan, what_gets_better, invitation are nonblank strings.
- grounded_numbers MUST be an empty array [] in local mode. Write every narrative field qualitatively: no digits or numeric tokens anywhere outside change_level's integer fields (use words like "one afternoon" instead).
- Never mention prices or costs: no currency symbols and none of the words price, pricing, cost, fee, subscription, per month, per year.
- invitation must contain the word "Spark" and be a confident, bounded next step addressed to the owner — a statement, not a question. Never hedge ("if it is worth", "if it sounds useful", "not worth changing", "call it off") and never use pitch language ("act now", "book now", "limited time", "schedule a call", "don't miss", "last chance").
- Do not include a candidate_ref. Do not wrap, fence, explain, or add any text outside the JSON object.`;

export const CANDIDATE_RESPONSE_FORMAT = Object.freeze({
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

export const stableStringify = canonicalJson;
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const exactObject = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function buildRequest(roleIdentity, input) {
  if (!ROLE_IDENTITIES.some((entry) => stableStringify(entry) === stableStringify(roleIdentity))) throw new TypeError("role identity is not frozen");
  const messages = [{ role: "system", content: PROMPT }, { role: "user", content: stableStringify(input) }];
  const adapter_input = { messages, ...PARAMETERS, response_format: CANDIDATE_RESPONSE_FORMAT };
  const body = { role: roleIdentity.role, model: roleIdentity.resolved_model, ...adapter_input };
  return { role: roleIdentity.role, resolved_model: roleIdentity.resolved_model, body, request_sha256: sha256(stableStringify(body)), adapter_input_sha256: sha256(stableStringify(adapter_input)) };
}

function safeRetained(value) {
  try {
    const bytes = Buffer.from(JSON.stringify(value));
    if (bytes.byteLength > MAX_RETAINED_OUTPUT_BYTES) return { retained: null, retained_sha256: sha256(bytes), retained_bytes: bytes.byteLength };
    return { retained: structuredClone(value), retained_sha256: sha256(bytes), retained_bytes: bytes.byteLength };
  } catch { return { retained: null, retained_sha256: null, retained_bytes: null }; }
}

export function normalizeUsage(value) {
  if (value === null) return null;
  if (!exactObject(value, ["input_tokens", "output_tokens"])) return undefined;
  if (![value.input_tokens, value.output_tokens].every((item) => Number.isSafeInteger(item) && item >= 0)) return undefined;
  return { input_tokens: value.input_tokens, output_tokens: value.output_tokens };
}

export function classifyCall(call) {
  if (call?.call_state === "timeout") return { classification: "timeout", candidate: null, candidate_ref: null, issues: [], ...safeRetained(null) };
  if (call?.call_state !== "received") return { classification: "provider_error", candidate: null, candidate_ref: null, issues: [], ...safeRetained(null) };
  const retained = safeRetained(call.output);
  if (retained.retained_bytes > MAX_RETAINED_OUTPUT_BYTES) return { classification: "output_too_large", candidate: null, candidate_ref: null, issues: [], ...retained };
  try {
    const result = classifyGenerationResult(call.output);
    return { classification: "direct_valid", candidate: result.candidate, candidate_ref: result.candidate_ref, issues: [], ...retained };
  } catch (error) {
    if (!(error instanceof GenerationError)) throw error;
    return { classification: error.code === "output_too_large" ? "output_too_large" : "invalid_output", candidate: null, candidate_ref: null, issues: error.issues, ...retained };
  }
}

export function fixtureInput() {
  return { evidence: { version: 1, mode: "local", priors: { region: "Blue Water Area", season: "summer", date: "2026-08-18", situation: "repeated inquiries", capability_bundle: ["software", "workflow automation"] } }, seed: "a".repeat(64) };
}
export function fixtureCandidate() {
  return { version: 1, mode: "local", title: "A calmer inquiry handoff", plan: "Route repeated questions into one reviewed response.", why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." }, what_gets_better: "The team starts with a useful draft instead of an empty page.", before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." }, change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true }, stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] }, invitation: "We can inspect this Spark together and map a clear first step.", grounded_numbers: [] };
}
export const canonicalCandidateRef = (candidate) => deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, candidate);
