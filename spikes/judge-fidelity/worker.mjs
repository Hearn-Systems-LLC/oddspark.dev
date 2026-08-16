import {
  MODEL_IDS,
  SYSTEM_PROMPT,
  VERDICT_RESPONSE_FORMAT,
  stableStringify,
  validateSpikeInput,
} from "./contract.mjs";

const MAX_REQUEST_BYTES = 256 * 1024;
const USAGE_KEYS = [
  "prompt_tokens",
  "completion_tokens",
  "total_tokens",
  "input_tokens",
  "output_tokens",
  "neurons",
];

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function safeErrorMessage(error) {
  return String(error?.message ?? error ?? "Workers AI request failed")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b[0-9a-f]{16,}\b/gi, "[redacted-id]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[redacted-id]")
    .slice(0, 500);
}

function allowlistedNumbers(value, keys) {
  const result = {};
  if (!value || typeof value !== "object") return result;
  for (const key of keys) {
    if (typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= 0) {
      result[key] = value[key];
    }
  }
  return result;
}

function validateRequest(body, env) {
  const errors = [];
  const keys = ["model", "messages", "max_tokens", "temperature", "response_format"];
  if (!body || typeof body !== "object" || Array.isArray(body)) return ["body must be an object"];
  for (const key of keys) if (!Object.hasOwn(body, key)) errors.push(`${key} is required`);
  for (const key of Object.keys(body)) if (!keys.includes(key)) errors.push(`${key} is not allowed`);

  if (!MODEL_IDS.includes(body.model)) errors.push("model is not allowlisted");
  if (env.AI_MODEL !== MODEL_IDS[0] || env.AI_MODEL_FALLBACK !== MODEL_IDS[1]) {
    errors.push("configured model IDs do not match the frozen spike contract");
  }
  if (body.model !== env.AI_MODEL && body.model !== env.AI_MODEL_FALLBACK) {
    errors.push("model does not match the configured spike models");
  }
  if (body.temperature !== 0) errors.push("temperature must be exactly 0");
  if (body.max_tokens !== 2048) errors.push("max_tokens must be exactly 2048");
  if (stableStringify(body.response_format) !== stableStringify(VERDICT_RESPONSE_FORMAT)) {
    errors.push("response_format does not match the frozen verdict schema");
  }

  if (!Array.isArray(body.messages) || body.messages.length !== 2) {
    errors.push("messages must contain the frozen system and user messages");
  } else {
    if (body.messages[0]?.role !== "system" || body.messages[0]?.content !== SYSTEM_PROMPT) {
      errors.push("system message does not match the frozen prompt");
    }
    if (body.messages[1]?.role !== "user" || typeof body.messages[1]?.content !== "string") {
      errors.push("user message must be serialized synthetic input");
    } else {
      try {
        const input = JSON.parse(body.messages[1].content);
        const validation = validateSpikeInput(input);
        if (!validation.valid) errors.push(...validation.errors);
        if (stableStringify(input) !== body.messages[1].content) {
          errors.push("user message is not the canonical frozen serialization");
        }
      } catch {
        errors.push("user message is not valid JSON");
      }
    }
  }
  return errors;
}

function sanitizedEnvelope(result) {
  const envelope = {};
  if (!result || typeof result !== "object") return envelope;
  if (result.response !== undefined) envelope.response = result.response;
  if (result.result !== undefined) envelope.result = result.result;
  const content = result.choices?.[0]?.message?.content;
  if (content !== undefined) {
    envelope.choices = [{ message: { content } }];
  }
  return envelope;
}

async function handleRun(request, env) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ ok: false, error: { code: "content_type" } }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, error: { code: "request_too_large" } }, 413);
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, error: { code: "request_too_large" } }, 413);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: { code: "invalid_json" } }, 400);
  }
  const errors = validateRequest(body, env);
  if (errors.length > 0) return json({ ok: false, error: { code: "invalid_request", details: errors } }, 400);

  let result;
  try {
    result = await env.AI.run(body.model, {
      messages: body.messages,
      max_tokens: body.max_tokens,
      temperature: body.temperature,
      response_format: body.response_format,
    });
  } catch (error) {
    return json({
      ok: false,
      error: { code: "ai_run_failed", message: safeErrorMessage(error) },
    }, 502);
  }

  return json({
    ok: true,
    model: body.model,
    envelope: sanitizedEnvelope(result),
    usage: allowlistedNumbers(result?.usage, USAGE_KEYS),
    reported_effective_values: allowlistedNumbers(result, ["temperature", "max_tokens"]),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, inference: false });
    }
    if (request.method === "POST" && url.pathname === "/run") {
      return handleRun(request, env);
    }
    return json({ ok: false, error: { code: "not_found" } }, 404);
  },
};
