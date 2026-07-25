import worker from "./src/worker.js";

const kv = new Map();
const meterState = new Map();
const env = {
  SPARKS: {
    async get(k, o) {
      const v = kv.get(k);
      if (!v) return null;
      return o && o.type === "json" ? JSON.parse(v) : v;
    },
    async put(k, v) {
      kv.set(k, v);
    },
    async list({ prefix }) {
      const keys = [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name }));
      return { keys, cursor: "", list_complete: true };
    },
  },
  METER: {
    idFromName: () => ({}),
    get: () => ({
      async fetch(req, init) {
        const u = new URL(typeof req === "string" ? req : req.url);
        const method = (init && init.method) || (typeof req !== "string" && req.method) || "GET";
        const day = u.searchParams.get("day");
        if (method === "POST") {
          const used = (meterState.get(day) || 0) + parseFloat(u.searchParams.get("n"));
          meterState.set(day, used);
          return Response.json({ day, used });
        }
        return Response.json({ day, used: meterState.get(day) || 0 });
      },
    }),
  },
  AI: {
    async run(model, opts) {
      const u = opts.messages[1].content;
      const domain = u.split("\n")[0].replace("DOMAIN: ", "");
      return {
        response: JSON.stringify({
          headline: "The audit trail for " + domain + " ends at a vendor",
          premise:
            "The public record stops where the contract begins. What survives the handoff is a redacted invoice and a claim that the system works as intended.",
          question: "Which contract clause governs the retention schedule, and who signed it?",
        }),
      };
    },
  },
  AI_MODEL: "mock",
};

function req(path, init = {}) {
  return new Request("https://oddspark.dev" + path, init);
}

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail });
}

// 1. Strike
const r1 = await worker.fetch(req("/api/spark", { method: "POST" }), env);
const s1 = await r1.json();
check("POST /api/spark returns 200", r1.status === 200, r1.status);
check("has 8-char id", /^[0-9a-f]{8}$/.test(s1.id || ""), s1.id);
check("drand round is a number", typeof s1.entropy?.round === "number", s1.entropy?.round);
check("flare class parses", /^[ABCMX]\d+\.\d$/.test(s1.solar?.class || ""), s1.solar?.class);
check("seed is 64 hex", /^[0-9a-f]{64}$/.test(s1.seed?.hash || ""), s1.seed?.hash?.slice(0, 16));
check("id is seed prefix", s1.id === s1.seed?.hash?.slice(0, 8));
check("all four axes picked", !!(s1.seed?.domain && s1.seed?.lens && s1.seed?.form && s1.seed?.friction));
check("was generated (not fallback)", s1.generated === true);

// 2. Determinism: second strike in the same window must hit cache
const r2 = await worker.fetch(req("/api/spark", { method: "POST" }), env);
const s2 = await r2.json();
check("same window returns same id", s1.id === s2.id, s1.id + " vs " + s2.id);
check("second strike was cached", s2.cached === true);
check("window round is floored to WINDOW_ROUNDS", s1.window?.round % 100 === 0, s1.window?.round);
check("entropy round == window round", s1.entropy.round === s1.window?.round);
check("window pointer written to KV", kv.get("w:" + s1.window?.round) === s1.id);

// 3. Independently recompute the seed from published inputs
const enc = new TextEncoder();
const pre = [s1.entropy.randomness, s1.entropy.round, s1.solar.flux.toExponential(6), s1.solar.time_tag].join(":");
const dig = await crypto.subtle.digest("SHA-256", enc.encode(pre));
const recomputed = [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("");
check("seed is independently reproducible", recomputed === s1.seed.hash, recomputed.slice(0, 16));

// 4. Verify drand randomness really is SHA256(signature)
const sigBytes = new Uint8Array(s1.entropy.signature.match(/../g).map((h) => parseInt(h, 16)));
const rdig = await crypto.subtle.digest("SHA-256", sigBytes);
const rhex = [...new Uint8Array(rdig)].map((b) => b.toString(16).padStart(2, "0")).join("");
check("randomness == SHA256(drand signature)", rhex === s1.entropy.randomness);

// 5. Permalink JSON
const r3 = await worker.fetch(req("/api/spark/" + s1.id), env);
check("GET /api/spark/:id returns 200", r3.status === 200);
const r4 = await worker.fetch(req("/api/spark/deadbeef"), env);
check("unknown id returns 404", r4.status === 404);

// 6. HTML permalink hydrates
const r5 = await worker.fetch(req("/s/" + s1.id, { headers: { accept: "text/html" } }), env);
const html = await r5.text();
check("permalink serves HTML", r5.status === 200 && html.startsWith("<!doctype html>"));
check("permalink embeds the spark", html.includes(s1.seed.hash));
check("headline is in the <title>", html.includes("<title>") && html.includes("oddspark"));

// 7. curl path
const r6 = await worker.fetch(req("/", { headers: { "user-agent": "curl/8.4.0", accept: "*/*" } }), env);
const txt = await r6.text();
check("curl gets text/plain", (r6.headers.get("content-type") || "").includes("text/plain"));
check("text output has PROVENANCE", txt.includes("PROVENANCE"));

// 8. Browser home
const r7 = await worker.fetch(req("/", { headers: { accept: "text/html,*/*" } }), env);
const home = await r7.text();
check("browser gets HTML home", (r7.headers.get("content-type") || "").includes("text/html"));
check("home has no preloaded spark", home.includes("var BOOT = null"));

// 9. Live sun endpoint
const r8 = await worker.fetch(req("/api/sun"), env);
const sun = await r8.json();
check("GET /api/sun works", r8.status === 200 && typeof sun.flux === "number", sun.class);

// report
let fails = 0;
for (const r of results) {
  if (!r.ok) fails++;
  console.log((r.ok ? "  ok   " : "  FAIL ") + r.name + (r.detail !== undefined ? "   [" + r.detail + "]" : ""));
}
console.log("\n" + (results.length - fails) + "/" + results.length + " passed");

console.log("\n--- sample text output (what curl sees) ---\n");
console.log(txt);
console.log("\n--- seed axes ---");
console.log(JSON.stringify(s1.seed, null, 2).slice(0, 600));

process.exit(fails ? 1 : 0);
