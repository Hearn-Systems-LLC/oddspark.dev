const MAX_BYTES = 256 * 1024,
  consumed = new Set();
const json = (value, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store" } });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health")
      return json({
        ok: true,
        inference: false,
        schema_version: "oddspark.semantic-adapter-health/v1",
        provider: "cloudflare-workers-ai",
        approval_expires_at: env.APPROVAL_EXPIRES_AT ?? null,
      });
    const hash = async (value) =>
      [
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(value),
          ),
        ),
      ]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
    if (request.method !== "POST" || url.pathname !== "/run")
      return json({ ok: false, error: { code: "not_found" } }, 404);
    const sequence = request.headers.get("x-oddspark-semantic-sequence") ?? "";
    if (
      !/^(?:[1-9]|[12][0-9]|3[0-8])$/.test(sequence) ||
      request.headers.get("x-oddspark-semantic-authority") !== env.AUTHORITY ||
      Date.now() >= Date.parse(env.APPROVAL_EXPIRES_AT ?? "")
    )
      return json(
        { ok: false, error: { code: "unauthorized_or_expired" } },
        403,
      );
    let bindings;
    try {
      bindings = JSON.parse(env.REQUEST_BINDINGS);
    } catch {
      return json({ ok: false, error: { code: "adapter_misconfigured" } }, 503);
    }
    const binding = bindings.find((x) => x.sequence === Number(sequence));
    if (!binding || consumed.has(sequence))
      return json(
        { ok: false, error: { code: "unauthorized_or_consumed" } },
        403,
      );
    // Reservation is deliberately before request-body I/O or hashing. Any bad
    // authorized attempt consumes its frozen slot and can never race inference.
    consumed.add(sequence);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BYTES)
      return json({ ok: false, error: { code: "request_too_large" } }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: { code: "invalid_json" } }, 400);
    }
    if (JSON.stringify(body) !== JSON.stringify(binding.body))
      return json({ ok: false, error: { code: "request_drift" } }, 400);
    if ((await hash(JSON.stringify(body))) !== binding.body_sha256)
      return json({ ok: false, error: { code: "request_hash_drift" } }, 400);
    try {
      const result = await env.AI.run(body.model, {
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        response_format: body.response_format,
      });
      return json({ ok: true, result });
    } catch {
      return json({ ok: false, error: { code: "ai_run_failed" } }, 502);
    }
  },
};
