import { CANDIDATE_RESPONSE_FORMAT, PARAMETERS, PROMPT, ROLE_IDENTITIES, exactObject, fixtureInput, stableStringify } from "./contract.mjs";

const MAX_REQUEST_BYTES = 128 * 1024;
const json = (value, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
const redact = (error) => String(error?.message ?? error).replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/\b[0-9a-f-]{24,}\b/gi, "[redacted-id]").slice(0, 300);
export function decodeStructuredResponse(result) {
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
function validate(body, env) {
  const keys = ["role", "model", "messages", "temperature", "max_tokens", "response_format"]; const errors = [];
  if (!exactObject(body, keys)) return ["request must be the exact closed wire contract"];
  const role = ROLE_IDENTITIES.find((entry) => entry.role === body.role); if (!role || role.resolved_model !== body.model) errors.push("role and model are not a frozen identity");
  if (env.PRIMARY_MODEL !== ROLE_IDENTITIES[0].resolved_model || env.FALLBACK_MODEL !== ROLE_IDENTITIES[1].resolved_model) errors.push("configured identities drifted");
  if (body.temperature !== PARAMETERS.temperature || body.max_tokens !== PARAMETERS.max_tokens || stableStringify(body.response_format) !== stableStringify(CANDIDATE_RESPONSE_FORMAT)) errors.push("parameters or wire schema drifted");
  if (!Array.isArray(body.messages) || body.messages.length !== 2 || body.messages[0]?.role !== "system" || body.messages[0]?.content !== PROMPT || body.messages[1]?.role !== "user" || typeof body.messages[1]?.content !== "string") errors.push("messages drifted");
  else { try { const input = JSON.parse(body.messages[1].content); if (stableStringify(input) !== body.messages[1].content || stableStringify(input) !== stableStringify(fixtureInput())) errors.push("input does not equal the frozen qualification fixture"); } catch { errors.push("input is not canonical JSON"); } }
  return errors;
}
function health(env) { const complete = ["WORKER_SHA256", "CONFIG_SHA256", "RUNTIME_SHA256"].every((key) => /^[a-f0-9]{64}$/.test(env[key] ?? "")); return { ok: complete, inference: false, schema_version: "oddspark.generation-adapter-health/v1", provider: "cloudflare-workers-ai", roles: ROLE_IDENTITIES, parameters: PARAMETERS, binding: "AI", worker_sha256: complete ? env.WORKER_SHA256 : null, config_sha256: complete ? env.CONFIG_SHA256 : null, runtime_sha256: complete ? env.RUNTIME_SHA256 : null }; }
async function run(request, env) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ ok: false, error: { code: "content_type" } }, 415);
  const declared = request.headers.get("content-length"); if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_REQUEST_BYTES)) return json({ ok: false, error: { code: "request_too_large" } }, 413);
  const raw = await request.text(); if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return json({ ok: false, error: { code: "request_too_large" } }, 413);
  let body; try { body = JSON.parse(raw); } catch { return json({ ok: false, error: { code: "invalid_json" } }, 400); }
  const errors = validate(body, env); if (errors.length) return json({ ok: false, error: { code: "invalid_request", details: errors } }, 400);
  try {
    const result = await env.AI.run(body.model, { messages: body.messages, temperature: body.temperature, max_tokens: body.max_tokens, response_format: body.response_format });
    const output = decodeStructuredResponse(result); const rawUsage = result?.usage; const input = rawUsage?.input_tokens ?? rawUsage?.prompt_tokens; const outputTokens = rawUsage?.output_tokens ?? rawUsage?.completion_tokens; const usage = Number.isSafeInteger(input) && input >= 0 && Number.isSafeInteger(outputTokens) && outputTokens >= 0 ? { input_tokens: input, output_tokens: outputTokens } : null;
    return json({ ok: true, output, usage });
  } catch (error) { return json({ ok: false, error: { code: "ai_run_failed", message: redact(error) } }, 502); }
}
export default { async fetch(request, env) { const url = new URL(request.url); if (request.method === "GET" && url.pathname === "/health") return json(health(env), health(env).ok ? 200 : 503); if (request.method === "POST" && url.pathname === "/run") return run(request, env); return json({ ok: false, error: { code: "not_found" } }, 404); } };
