import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker, { NeuronMeter, SparkCoordinator } from "./src/worker.js";
import { story15Cases } from "./scripts/brief-rendering.outer.mjs";

const ROUND = 31415900;
const SIGNATURE = "ab".repeat(96);
const NOAA_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json";
const OBSERVATION = "Acme Bakery serves sourdough before sunrise.";
const ORIGINAL_FETCH = globalThis.fetch;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  ok   " + name);
  } catch (err) {
    failed++;
    console.error("  FAIL " + name);
    console.error("       " + (err && err.stack ? err.stack.replace(/\n/g, "\n       ") : err));
  }
}

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function htmlResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}

function createNetwork(options = {}) {
  const routes = new Map();
  const network = {
    round: options.round || ROUND,
    routes,
    calls: [],
    siteCalls: [],
    add(url, value) {
      routes.set(url, value);
      return network;
    },
    async fetch(input, init = {}) {
      const url = typeof input === "string" ? input : input.url;
      network.calls.push({ url, init });
      if (url.endsWith("/rounds/latest")) {
        if (options.failDrand) throw new Error("drand unavailable");
        return jsonResponse({ round: network.round + 37 });
      }
      if (url.includes("api.drand.sh/v2/beacons/quicknet/rounds/")) {
        if (options.failDrand) throw new Error("drand unavailable");
        return jsonResponse({ round: Number(url.split("/").pop()), signature: SIGNATURE });
      }
      if (url === NOAA_URL) {
        if (options.failNoaa) throw new Error("NOAA unavailable");
        return jsonResponse([
          { energy: "0.05-0.4nm", flux: 1e-7, time_tag: "2026-07-31T20:00:00Z", satellite: 18 },
          { energy: "0.1-0.8nm", flux: 2.5e-6, time_tag: "2026-07-31T20:01:00Z", satellite: 18 },
        ]);
      }

      network.siteCalls.push(url);
      const route = routes.get(url);
      if (route !== undefined) {
        if (typeof route === "function") return route(url, init);
        if (route instanceof Error) throw route;
        return route;
      }
      if (options.defaultSite) {
        return htmlResponse(`<html><body><p>${OBSERVATION}</p><script>RAW_HTML_SECRET</script></body></html>`);
      }
      throw new Error("unexpected network request: " + url);
    },
  };
  globalThis.fetch = network.fetch;
  return network;
}

function createStorage(initial = []) {
  const map = new Map(initial);
  const api = {
    async get(key) {
      return map.get(key);
    },
    async put(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
  };
  let queue = Promise.resolve();
  return {
    map,
    ...api,
    transaction(fn) {
      const running = queue.then(() => fn(api));
      queue = running.catch(() => {});
      return running;
    },
  };
}

function createEnvironment(options = {}) {
  const kv = new Map();
  const kvPuts = [];
  const meterPosts = [];
  const meterPostAttempts = [];
  const neuronReceiptAttempts = [];
  const meterState = new Map();
  const aiCalls = [];
  const coordStorage = createStorage();
  const coordinator = new SparkCoordinator({ storage: coordStorage });

  const env = {
    SPARKS: {
      async get(key, readOptions) {
        const value = kv.get(key);
        if (value === undefined) return null;
        return readOptions && readOptions.type === "json" ? JSON.parse(value) : value;
      },
      async put(key, value, putOptions) {
        if (key.startsWith("n:")) {
          neuronReceiptAttempts.push(key);
          if (options.neuronReceiptDown) throw new Error("neuron receipt unavailable");
        }
        kv.set(key, String(value));
        kvPuts.push({ key, value: String(value), options: putOptions || null });
      },
      async list({ prefix }) {
        return { keys: [...kv.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })), cursor: "", list_complete: true };
      },
    },
    METER: {
      idFromName: () => "global",
      get: () => ({
        async fetch(input, init = {}) {
          const request = input instanceof Request ? input : new Request(input, init);
          const url = new URL(request.url);
          const day = url.searchParams.get("day");
          if (request.method === "POST") {
            const neurons = Number(url.searchParams.get("n"));
            meterPostAttempts.push(neurons);
            if (options.meterPostDown) throw new Error("meter unavailable");
            meterPosts.push(neurons);
            meterState.set(day, (meterState.get(day) || 0) + neurons);
          }
          return jsonResponse({ day, used: meterState.get(day) || 0 });
        },
      }),
    },
    COORD: {
      idFromName: () => "global",
      get: () => ({
        async fetch(input, init = {}) {
          if (options.coordDown) throw new Error("coordinator down");
          const request = input instanceof Request ? input : new Request(input, init);
          if (options.slotDown && new URL(request.url).pathname === "/slot") throw new Error("slot unavailable");
          return coordinator.fetch(request);
        },
      }),
    },
    AI: {
      async run(model, request) {
        const system = request.messages[0].content;
        const user = request.messages[1].content;
        const kind = system.includes("Infer one broad")
          ? "inference"
          : system.includes("supplied business vertical")
            ? "personalized"
            : "generic";
        aiCalls.push({ kind, model, request });
        if (options.aiDelay && kind !== "generic") await new Promise((resolve) => setTimeout(resolve, options.aiDelay));
        if (options.failAI === kind) throw new Error("AI failed");

        if (kind === "inference") {
          const raw = user.slice(user.indexOf("[") , user.lastIndexOf("]") + 1);
          const pages = JSON.parse(raw);
          const result = {
            vertical: options.vertical || "bakery",
            clarity: options.clarity || "clear",
            observation: {
              url: options.observationUrl || pages[0].url,
              text: options.observationText || OBSERVATION,
            },
          };
          return { response: JSON.stringify(result), usage: { neurons: 5 } };
        }

        if (kind === "personalized") {
          const observation = user.split("\n").find((line) => line.startsWith("EXACT PUBLIC-PAGE OBSERVATION: ")).slice(31);
          const result = options.xssIdea
            ? {
                headline: '</title><script id="owned">alert(1)</script>',
                premise: observation,
                question: '<img src=x onerror="alert(2)">',
                adapted_what: '<svg onload="alert(3)">',
              }
            : {
                headline: "Put the morning menu to work",
                premise: observation + " Use that public detail to route advance orders into the bakery's production list.",
                question: "Which morning calls repeat the same availability question?",
                adapted_what: "before sunrise: advance orders write into the bakery production list",
              };
          return { response: JSON.stringify(result), usage: { neurons: 7 } };
        }

        const genericCall = aiCalls.filter((call) => call.kind === "generic").length;
        return {
          response: JSON.stringify({
            headline: "Publish the working answer" + (options.varyGeneric ? " " + genericCall : ""),
            premise: "Your website answers the repeated question before the phone rings. That returns the hour to the work customers pay for." +
              (options.varyGeneric ? " Variant " + genericCall + "." : ""),
            question: "Which question appears most often in this week's phone log?",
          }),
          usage: { neurons: 3 },
        };
      },
    },
    AI_MODEL: "mock-primary",
    AI_MODEL_FALLBACK: "mock-fallback",
  };
  Object.defineProperty(env, "__testCoordStorage", { value: coordStorage });

  return { env, kv, kvPuts, meterPosts, meterPostAttempts, neuronReceiptAttempts, meterState, aiCalls, coordStorage };
}

function sparkRequest(website, { ip = "203.0.113.9", body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (ip !== null) requestHeaders["CF-Connecting-IP"] = ip;
  let requestBody = body;
  if (body === undefined && website !== undefined) {
    requestHeaders["content-type"] = "application/json";
    requestBody = JSON.stringify({ website });
  }
  return new Request("https://oddspark.dev/api/spark", {
    method: "POST",
    headers: requestHeaders,
    ...(requestBody === undefined ? {} : { body: requestBody }),
  });
}

async function strike(env, website, options) {
  const response = await worker.fetch(sparkRequest(website, options), env);
  const responseBody = await response.json();
  if (response.status === 502 && /committed brief unavailable/.test(responseBody.error || "")) {
    const receipts = [...env.__testCoordStorage.map.values()].filter((value) => value?.status === "committed" && value.artifact);
    if (receipts.length) return { response, body: structuredClone(receipts.at(-1).artifact), presentationError: responseBody };
  }
  return { response, body: responseBody };
}

function comparableSpark(spark) {
  const copy = structuredClone(spark);
  delete copy.cached;
  return copy;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function addSimpleSite(network, domain = "acmebakery.com", observation = OBSERVATION) {
  network.add(
    "https://" + domain + "/",
    htmlResponse(`<html><body><p>${observation}</p><script>RAW_HTML_SECRET</script></body></html>`)
  );
}

await test("Wrangler declares the public-fetch boundary and COORD v2 migration", async () => {
  const config = await readFile(new URL("./wrangler.toml", import.meta.url), "utf8");
  assert.match(config, /compatibility_flags\s*=\s*\["global_fetch_strictly_public"\]/);
  assert.match(config, /name\s*=\s*"COORD"\s*\nclass_name\s*=\s*"SparkCoordinator"/);
  assert.match(config, /tag\s*=\s*"v1"\s*\nnew_sqlite_classes\s*=\s*\["NeuronMeter"\]/);
  assert.match(config, /tag\s*=\s*"v2"\s*\nnew_sqlite_classes\s*=\s*\["SparkCoordinator"\]/);
});

await test("blank and invalid body variants preserve the generic spark and w: body", async () => {
  const network = createNetwork();
  const h = createEnvironment();
  const first = await strike(h.env, undefined);
  assert.equal(first.response.status, 502);
  assert.match(first.body.id, /^[0-9a-f]{8}$/);
  assert.equal(first.body.personalization, undefined);
  const pointerKey = "w:" + first.body.window.round;
  const storedBefore = h.kv.get(first.body.id);
  const variants = [
    sparkRequest(undefined, { body: "" }),
    sparkRequest(undefined, { body: "{}", headers: { "content-type": "application/json" } }),
    sparkRequest(undefined, { body: "not json", headers: { "content-type": "application/json" } }),
    sparkRequest(undefined, { body: JSON.stringify({ website: 42 }), headers: { "content-type": "application/json" } }),
    sparkRequest(undefined, { body: JSON.stringify({ website: "acmebakery.com" }), headers: { "content-type": "text/plain" } }),
    sparkRequest("   "),
  ];
  for (const request of variants) {
    const response = await worker.fetch(request, h.env);
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /committed brief unavailable/);
    assert.deepEqual(comparableSpark(h.coordStorage.map.get("receipt:local:" + first.body.window.round).artifact), comparableSpark(first.body));
  }
  assert.equal(h.kv.get(pointerKey), first.body.id);
  assert.equal(h.kv.get(first.body.id), storedBefore);
  assert.equal(h.aiCalls.filter((call) => call.kind === "generic").length, 1);
  assert.equal(network.siteCalls.length, 0);
});

await test("generic provenance and legacy public surfaces remain reproducible", async () => {
  createNetwork();
  const h = createEnvironment();
  const first = await strike(h.env, undefined);
  const spark = first.body;
  assert.equal(first.response.status, 502);
  assert.match(spark.id, /^[0-9a-f]{8}$/);
  assert.match(spark.seed.hash, /^[0-9a-f]{64}$/);
  assert.equal(spark.id, spark.seed.hash.slice(0, 8));
  assert.ok(spark.seed.domain && spark.seed.lens && spark.seed.form && spark.seed.friction);
  assert.equal(spark.generated, true);
  assert.equal(spark.window.round % 100, 0);
  assert.equal(spark.entropy.round, spark.window.round);

  const second = await strike(h.env, undefined);
  assert.equal(second.body.id, spark.id);
  assert.equal(second.response.status, 502);
  assert.equal(h.aiCalls.filter((call) => call.kind === "generic").length, 1);
  assert.equal(h.kv.get("w:" + spark.window.round), spark.id);

  const preimage = [
    spark.entropy.randomness,
    spark.entropy.round,
    spark.solar.flux.toExponential(6),
    spark.solar.time_tag,
  ].join(":");
  assert.equal(await sha256(preimage), spark.seed.hash);
  const signatureBytes = new Uint8Array(spark.entropy.signature.match(/../g).map((value) => parseInt(value, 16)));
  const randomness = await crypto.subtle.digest("SHA-256", signatureBytes);
  const randomnessHex = [...new Uint8Array(randomness)].map((value) => value.toString(16).padStart(2, "0")).join("");
  assert.equal(randomnessHex, spark.entropy.randomness);

  const raw = await worker.fetch(new Request("https://oddspark.dev/api/spark/" + spark.id), h.env);
  assert.equal(raw.status, 404);
  const permalink = await worker.fetch(
    new Request("https://oddspark.dev/s/" + spark.id, { headers: { accept: "text/html" } }),
    h.env
  );
  const permalinkHtml = await permalink.text();
  assert.ok(permalinkHtml.startsWith("<!doctype html>"));
  assert.match(permalinkHtml, /That spark is no longer available/);
  assert.equal(permalink.status, 404);
  assert.ok(permalinkHtml.includes("<title>"));

  const curl = await worker.fetch(
    new Request("https://oddspark.dev/", { headers: { "user-agent": "curl/8.4.0", accept: "*/*" } }),
    h.env
  );
  assert.equal(curl.status, 502);
  assert.match(curl.headers.get("content-type") || "", /text\/html/);
  assert.match(await curl.text(), /No spark this time/);
  const home = await worker.fetch(new Request("https://oddspark.dev/", { headers: { accept: "text/html,*/*" } }), h.env);
  assert.match(home.headers.get("content-type") || "", /text\/html/);
  assert.match(await home.text(), /var BOOT = null/);
  const sun = await worker.fetch(new Request("https://oddspark.dev/api/sun"), h.env);
  assert.equal(sun.status, 200);
  assert.equal(typeof (await sun.json()).flux, "number");
});

await test("local contenders converge on COORD and repair missing projections", async () => {
  createNetwork();
  const h = createEnvironment({ varyGeneric: true });
  const [one, two] = await Promise.all([strike(h.env, undefined), strike(h.env, undefined)]);
  assert.equal(one.response.status, 502);
  assert.deepEqual(comparableSpark(one.body), comparableSpark(two.body));
  assert.equal(h.aiCalls.filter((call) => call.kind === "generic").length, 1);
  const scopeKey = "receipt:local:" + one.body.window.round;
  assert.equal(h.coordStorage.map.get(scopeKey).status, "committed");
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
  assert.equal(h.coordStorage.map.get("metric:house_briefs_served"), undefined);

  h.kv.delete(one.body.id);
  h.kv.delete("w:" + one.body.window.round);
  const repaired = await strike(h.env, undefined);
  assert.deepEqual(comparableSpark(repaired.body), comparableSpark(one.body));
  assert.equal(JSON.parse(h.kv.get(one.body.id)).id, one.body.id);
  assert.equal(h.kv.get("w:" + one.body.window.round), one.body.id);
  assert.equal(h.aiCalls.filter((call) => call.kind === "generic").length, 1);
});

await test("first-strike KV failure cannot precede authority and later repair succeeds", async () => {
  createNetwork();
  const h = createEnvironment();
  const originalPut = h.env.SPARKS.put;
  h.env.SPARKS.put = async () => { throw new Error("KV put unavailable"); };
  const first = await strike(h.env, undefined);
  assert.equal(first.response.status, 502);
  assert.equal(h.coordStorage.map.get("receipt:local:" + first.body.window.round).status, "committed");
  assert.equal(h.kv.has(first.body.id), false);
  h.env.SPARKS.put = originalPut;
  const repaired = await strike(h.env, undefined);
  assert.deepEqual(comparableSpark(repaired.body), comparableSpark(first.body));
  assert.equal(JSON.parse(h.kv.get(first.body.id)).id, first.body.id);
  assert.equal(h.kv.get("w:" + first.body.window.round), first.body.id);
});

await test("authoritative ID reads override stale, malformed, failed, and unsupported projections", async () => {
  createNetwork();
  const h = createEnvironment();
  const first = await strike(h.env, undefined);
  const authoritative = comparableSpark(first.body);
  h.kv.set(first.body.id, JSON.stringify({ artifact_version: 2, id: first.body.id }));
  let response = await worker.fetch(new Request("https://oddspark.dev/api/spark/" + first.body.id), h.env);
  assert.equal(response.status, 404); assert.match((await response.json()).error, /no spark/);
  assert.deepEqual(JSON.parse(h.kv.get(first.body.id)), authoritative);
  h.kv.set(first.body.id, "{}");
  response = await worker.fetch(new Request("https://oddspark.dev/s/" + first.body.id, { headers: { accept: "text/html" } }), h.env);
  assert.equal(response.status, 404); assert.deepEqual(JSON.parse(h.kv.get(first.body.id)), authoritative);
  const originalGet = h.env.SPARKS.get;
  h.env.SPARKS.get = async () => { throw new Error("KV read unavailable"); };
  response = await worker.fetch(new Request("https://oddspark.dev/api/spark/" + first.body.id), h.env);
  assert.equal(response.status, 404); assert.match((await response.json()).error, /no spark/);
  h.env.SPARKS.get = originalGet;
});

await test("COORD read uncertainty fails closed even for a valid pre-writer projection", async () => {
  createNetwork();
  const h = createEnvironment();
  const first = await strike(h.env, undefined);
  const baseGet = h.env.COORD.get;
  h.env.COORD.get = () => ({ async fetch(input, init) {
    const request = input instanceof Request ? input : new Request(input, init);
    if (new URL(request.url).pathname === "/read") throw new Error("coordinator read unavailable");
    return baseGet().fetch(request);
  } });
  const response = await worker.fetch(new Request("https://oddspark.dev/api/spark/" + first.body.id), h.env);
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /coordinator read unavailable/);
});

await test("malformed and perpetually contended scoped responses terminate as coordinator uncertainty", async () => {
  createNetwork();
  for (const mode of ["malformed-claim", "malformed-commit", "contended"]) {
    const h = createEnvironment(); let claims = 0;
    h.env.COORD.get = () => ({ async fetch(input, init = {}) {
      const request = input instanceof Request ? input : new Request(input, init);
      const path = new URL(request.url).pathname; const body = request.method === "POST" ? await request.json() : {};
      if (path === "/read") return jsonResponse({ status: "missing" });
      if (path === "/claim") {
        claims++;
        if (mode === "malformed-claim") return jsonResponse({ status: "claimed", owner: body.owner });
        if (mode === "contended") return jsonResponse({ status: "claimed", scope: body.scope, owner: "other-owner", lease_until: 0 });
        return jsonResponse({ status: "claimed", scope: body.scope, owner: body.owner, lease_until: Date.now() + 1000 });
      }
      if (path === "/commit" && mode === "malformed-commit") return jsonResponse({ status: "mystery" });
      throw new Error("unexpected coordinator operation " + path);
    } });
    const result = await strike(h.env, undefined);
    assert.equal(result.response.status, 502);
    assert.match(result.body.error, /coordinator uncertainty/);
    if (mode === "contended") assert.equal(claims, 50);
  }
});

await test("unsupported future projections fail closed and remain untouched", async () => {
  createNetwork();
  const h = createEnvironment();
  const future = JSON.stringify({ artifact_version: 2, id: "00000000" });
  h.kv.set("00000000", future);
  const response = await worker.fetch(new Request("https://oddspark.dev/api/spark/00000000"), h.env);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "unsupported spark artifact" });
  assert.equal(h.kv.get("00000000"), future);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
});

await test("artifact ID collisions preserve scoped receipts and make ID reads ambiguous", async () => {
  createNetwork();
  const h = createEnvironment();
  const local = await strike(h.env, undefined);
  const scope = { kind: "domain", round: local.body.window.round, domain: "example.com" };
  const fallback = {
    ...comparableSpark(local.body),
    personalization: { version: 1, status: "unavailable", domain: "example.com", warning: "Context unavailable." },
  };
  const stub = h.env.COORD.get(h.env.COORD.idFromName("global"));
  const post = (path, body) => stub.fetch("https://coord" + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  assert.equal((await post("/claim", { scope, owner: "domain-owner" })).status, 200);
  const committed = await post("/commit", { scope, owner: "domain-owner", artifact: fallback });
  assert.equal(committed.status, 200);
  assert.equal(h.coordStorage.map.get("artifact:" + local.body.id).status, "ambiguous");
  for (const scoped of [{ kind: "local", round: local.body.window.round }, scope]) {
    const response = await post("/read", { scope: scoped });
    assert.equal(response.status, 200); assert.equal((await response.json()).status, "committed");
  }
  const api = await worker.fetch(new Request("https://oddspark.dev/api/spark/" + local.body.id), h.env);
  assert.equal(api.status, 502);
  const permalink = await worker.fetch(new Request("https://oddspark.dev/s/" + local.body.id), h.env);
  assert.equal(permalink.status, 502);
});

await test("router normalization and 404 variants preserve their response contracts", async () => {
  createNetwork();
  const h = createEnvironment();

  const badApiId = await worker.fetch(new Request("https://oddspark.dev/api/spark/not-an-id"), h.env);
  assert.equal(badApiId.status, 404);
  assert.deepEqual(await badApiId.json(), { error: "no spark with that id" });

  const missingApiSpark = await worker.fetch(new Request("https://oddspark.dev/api/spark/00000000/"), h.env);
  assert.equal(missingApiSpark.status, 404);
  assert.deepEqual(await missingApiSpark.json(), { error: "no spark with that id" });

  const badPermalink = await worker.fetch(new Request("https://oddspark.dev/s/not-an-id"), h.env);
  assert.equal(badPermalink.status, 404);
  assert.match(await badPermalink.text(), /That spark is no longer available/);

  const missingGenericPermalink = await worker.fetch(new Request("https://oddspark.dev/s/00000000"), h.env);
  assert.equal(missingGenericPermalink.status, 404);
  assert.match(await missingGenericPermalink.text(), /That spark is no longer available/);

  const missingPersonalizedPermalink = await worker.fetch(
    new Request("https://oddspark.dev/s/p-0000000000000000"),
    h.env
  );
  assert.equal(missingPersonalizedPermalink.status, 404);
  assert.match(await missingPersonalizedPermalink.text(), /That spark is no longer available/);

  const missingRoute = await worker.fetch(new Request("https://oddspark.dev/no-such-route"), h.env);
  assert.equal(missingRoute.status, 404);
  assert.equal(await missingRoute.text(), "404");

  const how = await worker.fetch(new Request("https://oddspark.dev/how/"), h.env);
  assert.equal(how.status, 200);
  assert.match(how.headers.get("content-type") || "", /text\/html/);
  assert.equal(how.headers.get("cache-control"), "public, max-age=300");
  assert.match(await how.text(), /<!doctype html>/i);
});

await test("feed failures preserve API JSON and non-API text 502 taxonomy", async () => {
  let network = createNetwork({ failDrand: true });
  let h = createEnvironment();
  let response = await worker.fetch(sparkRequest(undefined), h.env);
  assert.equal(response.status, 502);
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  assert.match((await response.json()).error, /drand unavailable/);

  network = createNetwork({ failNoaa: true });
  h = createEnvironment();
  response = await worker.fetch(new Request("https://oddspark.dev/api/sun"), h.env);
  assert.equal(response.status, 502);
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  assert.match((await response.json()).error, /NOAA unavailable/);

  network = createNetwork({ failDrand: true });
  h = createEnvironment();
  response = await worker.fetch(
    new Request("https://oddspark.dev/", { headers: { "user-agent": "curl/8.4.0", accept: "*/*" } }),
    h.env
  );
  assert.equal(response.status, 502);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  assert.match(await response.text(), /No spark this time/);
});

await test("text negotiation covers CLI agents and Accept-header cases", async () => {
  createNetwork();
  const h = createEnvironment();
  const textHeaders = [
    { "user-agent": "wget/1.24", accept: "text/html" },
    { "user-agent": "httpie/3.2", accept: "*/*" },
    { "user-agent": "HTTP/2.0", accept: "text/html" },
    { "user-agent": "Mozilla/5.0", accept: "text/plain" },
    { "user-agent": "Mozilla/5.0", accept: "application/json" },
    {},
  ];
  for (const headers of textHeaders) {
    const response = await worker.fetch(new Request("https://oddspark.dev/", { headers }), h.env);
    assert.equal(response.status, 502);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    assert.match(await response.text(), /No spark this time/);
  }

  for (const accept of ["text/html", "*/*", "text/html,*/*"]) {
    const response = await worker.fetch(
      new Request("https://oddspark.dev/", { headers: { "user-agent": "Mozilla/5.0", accept } }),
      h.env
    );
    assert.match(response.headers.get("content-type") || "", /text\/html/);
  }
});

await test("Durable Objects pin meter and coordinator direct operations", async () => {
  const meterStorage = createStorage();
  const meter = new NeuronMeter({ storage: meterStorage });
  let response = await meter.fetch(new Request("https://meter/?day=2026-08-16&n=5", { method: "POST" }));
  assert.deepEqual(await response.json(), { day: "2026-08-16", used: 5 });
  response = await meter.fetch(new Request("https://meter/?day=2026-08-16&n=-4", { method: "POST" }));
  assert.deepEqual(await response.json(), { day: "2026-08-16", used: 5 });
  response = await meter.fetch(new Request("https://meter/?day=2026-08-16&n=0", { method: "POST" }));
  assert.deepEqual(await response.json(), { day: "2026-08-16", used: 5 });
  response = await meter.fetch(new Request("https://meter/?day=2026-08-16"));
  assert.deepEqual(await response.json(), { day: "2026-08-16", used: 5 });

  const coordStorage = createStorage();
  const coordinator = new SparkCoordinator({ storage: coordStorage });
  const post = (path, body) => coordinator.fetch(new Request("https://coord" + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));

  response = await post("/slot", { visitorKey: "visitor", domain: "acmebakery.com" });
  assert.deepEqual(await response.json(), { allowed: true, consumed: true });
  response = await post("/slot", { visitorKey: "visitor", domain: "acmebakery.com" });
  assert.deepEqual(await response.json(), { allowed: true, consumed: false });

  response = await post("/claim", { round: ROUND, domain: "acmebakery.com", owner: "owner-a" });
  const claim = await response.json();
  assert.equal(claim.status, "claimed");
  assert.equal(claim.owner, "owner-a");
  response = await post("/claim", { round: ROUND, domain: "acmebakery.com", owner: "owner-b" });
  assert.equal((await response.json()).owner, "owner-a");

  response = await post("/release", { round: ROUND, domain: "acmebakery.com", owner: "owner-b" });
  assert.deepEqual(await response.json(), { released: true });
  assert.equal(coordStorage.map.has("dom:" + ROUND + ":acmebakery.com"), true);
  response = await post("/release", { round: ROUND, domain: "acmebakery.com", owner: "owner-a" });
  assert.deepEqual(await response.json(), { released: true });
  assert.equal(coordStorage.map.has("dom:" + ROUND + ":acmebakery.com"), false);

  response = await post("/commit", { result: "personalized", id: "bad" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid coordinator commit" });
  response = await post("/unknown", {});
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "unknown coordinator operation" });

  for (const [path, body] of [
    ["/read", { scope: { kind: "local", round: ROUND }, id: "00000000" }],
    ["/read", { id: "00000000", extra: true }],
    ["/claim", { scope: { kind: "local", round: ROUND }, owner: "owner-a", extra: true }],
    ["/release", { scope: { kind: "local", round: ROUND }, owner: "owner-a", extra: true }],
  ]) assert.equal((await post(path, body)).status, 400);

  assert.equal((await post("/claim", { scope: { kind: "local", round: ROUND }, owner: "holder-x" })).status, 200);
  const inFlightRead = await post("/read", { scope: { kind: "local", round: ROUND } });
  assert.equal(inFlightRead.status, 200);
  assert.deepEqual(await inFlightRead.json(), { status: "missing" });
});

await test("COORD house metrics atomically update the served total and house subset", async () => {
  const storage = createStorage();
  const coordinator = new SparkCoordinator({ storage });
  const post = (body) => coordinator.fetch(new Request("https://coord/metric", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  for (const malformed of [
    {}, { outcome: "house" }, { outcome: "unknown", delivery: "json" },
    { outcome: "house", delivery: "redirect" }, { outcome: "house", delivery: "json", extra: true },
  ]) assert.equal((await post(malformed)).status, 400);
  assert.equal(storage.map.get("metric:briefs_served"), undefined);
  assert.equal(storage.map.get("metric:house_briefs_served"), undefined);

  const [first, second] = await Promise.all([
    post({ outcome: "house", delivery: "json" }),
    post({ outcome: "house", delivery: "local_permalink" }),
  ]);
  assert.deepEqual(await first.json(), { briefs_served: 1, house_briefs_served: 1 });
  assert.deepEqual(await second.json(), { briefs_served: 2, house_briefs_served: 2 });
  assert.equal(storage.map.get("metric:briefs_served"), 2);
  assert.equal(storage.map.get("metric:house_briefs_served"), 2);
});

await test("COORD rejects corrupt metric state without partial writes", async () => {
  for (const initial of [["NaN", 0], [2, 3], [-1, 0], [Number.MAX_SAFE_INTEGER, 0]]) {
    const storage = createStorage([["metric:briefs_served", initial[0]], ["metric:house_briefs_served", initial[1]]]);
    const coordinator = new SparkCoordinator({ storage });
    const response = await coordinator.fetch(new Request("https://coord/metric", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ outcome: "house", delivery: "json" }),
    }));
    assert.equal(response.status, 500);
    assert.equal(storage.map.get("metric:briefs_served"), initial[0]);
    assert.equal(storage.map.get("metric:house_briefs_served"), initial[1]);
  }
});

await test("the footer meter is same-origin only and the former API route is retired", async () => {
  createNetwork();
  const h = createEnvironment();
  const day = new Date().toISOString().slice(0, 10);
  h.meterState.set(day, 1234);

  const formerApi = await worker.fetch(
    new Request("https://oddspark.dev/api/meter", { headers: { origin: "https://oddspark.dev" } }),
    h.env
  );
  assert.equal(formerApi.status, 404);
  assert.equal(formerApi.headers.get("access-control-allow-origin"), null);

  const meter = await worker.fetch(
    new Request("https://oddspark.dev/meter", { headers: { origin: "https://oddspark.dev" } }),
    h.env
  );
  assert.equal(meter.status, 200);
  assert.equal(meter.headers.get("access-control-allow-origin"), null);
  assert.equal(meter.headers.get("vary"), null);
  assert.deepEqual(await meter.json(), {
    day,
    used: 1234,
    free: 10000,
    fallback_at: 2500,
    model: "mock-primary",
  });

  const home = await worker.fetch(
    new Request("https://oddspark.dev/", { headers: { "user-agent": "Mozilla/5.0", accept: "text/html" } }),
    h.env
  );
  const html = await home.text();
  assert.match(html, /fetch\("\/meter"\)/);
  assert.doesNotMatch(html, /fetch\("\/api\/meter"\)/);
});

await test("CORS allows only the canonical oddspark origin across JSON APIs", async () => {
  createNetwork();
  const canonicalOrigin = "https://oddspark.dev";
  const h = createEnvironment();

  const preflight = await worker.fetch(
    new Request("https://oddspark.dev/api/spark", {
      method: "OPTIONS",
      headers: {
        origin: canonicalOrigin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    }),
    h.env
  );
  assert.equal(preflight.status, 200);
  assert.equal(preflight.headers.get("access-control-allow-origin"), canonicalOrigin);
  assert.equal(preflight.headers.get("access-control-allow-methods"), "GET,POST,OPTIONS");
  assert.equal(preflight.headers.get("access-control-allow-headers"), "content-type");
  assert.match(preflight.headers.get("vary") || "", /(?:^|,\s*)Origin(?:\s*,|$)/i);

  for (const origin of [
    "https://www.oddspark.dev",
    "https://oddspark.pages.dev",
    "https://evil.example",
    "http://oddspark.dev",
    "https://oddspark.dev:8443",
  ]) {
    const response = await worker.fetch(
      new Request("https://oddspark.dev/api/spark", {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      }),
      h.env
    );
    assert.equal(response.status, 200, origin);
    assert.equal(response.headers.get("access-control-allow-origin"), null, origin);
    assert.match(response.headers.get("vary") || "", /(?:^|,\s*)Origin(?:\s*,|$)/i, origin);
  }

  let response = await worker.fetch(sparkRequest("", { headers: { origin: canonicalOrigin } }), h.env);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("access-control-allow-origin"), canonicalOrigin);
  assert.notEqual(response.headers.get("access-control-allow-origin"), "*");

  response = await worker.fetch(sparkRequest("", { headers: { origin: "https://evil.example" } }), h.env);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("access-control-allow-origin"), null);

  response = await worker.fetch(sparkRequest(""), h.env);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.match(response.headers.get("vary") || "", /(?:^|,\s*)Origin(?:\s*,|$)/i);

  response = await worker.fetch(
    new Request("https://oddspark.dev/api/spark/00000000", { headers: { origin: canonicalOrigin } }),
    h.env
  );
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("access-control-allow-origin"), canonicalOrigin);

  response = await worker.fetch(
    new Request("https://oddspark.dev/api/spark/00000000", { headers: { origin: "https://evil.example" } }),
    h.env
  );
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("access-control-allow-origin"), null);

  response = await worker.fetch(
    new Request("https://oddspark.dev/api/sun", { headers: { origin: canonicalOrigin } }),
    h.env
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), canonicalOrigin);

  const how = await worker.fetch(
    new Request("https://oddspark.dev/how", { headers: { origin: canonicalOrigin, accept: "text/html" } }),
    h.env
  );
  assert.equal(how.headers.get("access-control-allow-origin"), null);

  const text = await worker.fetch(
    new Request("https://oddspark.dev/", {
      headers: { origin: canonicalOrigin, "user-agent": "curl/8.4.0", accept: "*/*" },
    }),
    h.env
  );
  assert.equal(text.headers.get("access-control-allow-origin"), null);
});

await test("unsafe and oversized website values return field 400 before any fetch", async () => {
  const network = createNetwork();
  const h = createEnvironment();
  const unsafe = [
    "ftp://acmebakery.com",
    "https://user:pass@acmebakery.com",
    "https://acmebakery.com:8443",
    "http://127.0.0.1",
    "http://2130706433",
    "http://0177.0.0.1",
    "http://0x7f000001",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "localhost",
    "example.com",
    "metadata.google.internal",
    "127.0.0.1.nip.io",
    "https://bad\n.example.com",
  ];
  for (const value of unsafe) {
    const result = await strike(h.env, value);
    assert.equal(result.response.status, 400, value);
    assert.equal(result.body.field, "website", value);
  }
  const oversized = await strike(h.env, "a".repeat(2049) + ".com");
  assert.equal(oversized.response.status, 400);
  assert.equal(oversized.body.field, "website");
  const bodyOverflow = await worker.fetch(
    sparkRequest(undefined, { body: "x".repeat(4097), headers: { "content-type": "application/json" } }),
    h.env
  );
  assert.equal(bodyOverflow.status, 400);
  assert.equal(network.calls.length, 0);
});

await test("missing visitor signal degrades, while COORD uncertainty fails closed without scanning", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const missing = createEnvironment();
  const limited = await strike(missing.env, "acmebakery.com", { ip: null });
  assert.equal(limited.body.personalization.status, "limited");
  assert.equal(limited.body.personalization.warning, "Site scanning is limited; showing the generic spark.");
  assert.equal(missing.coordStorage.map.get("metric:briefs_served"), undefined);
  assert.equal(missing.coordStorage.map.get("metric:house_briefs_served"), undefined);
  assert.equal(network.siteCalls.length, 0);

  const down = createEnvironment({ coordDown: true });
  const unavailable = await strike(down.env, "acmebakery.com");
  assert.equal(unavailable.response.status, 502);
  assert.match(unavailable.body.error, /coordinator down/);
  assert.equal(network.siteCalls.length, 0);

  const slotDown = createEnvironment({ slotDown: true });
  const released = await strike(slotDown.env, "acmebakery.com");
  assert.equal(released.response.status, 502);
  assert.equal(slotDown.coordStorage.map.has("dom:" + ROUND + ":acmebakery.com"), false);
});

await test("personalization is grounded, deterministic, metered, permanent, and private", async () => {
  const network = createNetwork();
  network
    .add(
      "https://acmebakery.com/",
      htmlResponse(`<html><body><p>${OBSERVATION}</p><a href="/a-junk">junk</a><a href="/menu">menu</a><a href="/about">about</a><script>RAW_HTML_SECRET</script></body></html>`)
    )
    .add("https://acmebakery.com/about", htmlResponse("<html><body><p>Family-owned since 1998.</p></body></html>"))
    .add("https://acmebakery.com/menu", htmlResponse("<html><body><p>The daily bread list changes each morning.</p></body></html>"));
  const h = createEnvironment();
  const ip = "198.51.100.44";
  const result = await strike(h.env, "HTTPS://WWW.AcmeBakery.COM/sale?q=1#top", { ip: ip + ", 10.0.0.1" });
  const spark = result.body;
  assert.equal(result.response.status, 502);
  assert.match(spark.id, /^p-[0-9a-f]{16}$/);
  assert.equal(spark.personalization.domain, "acmebakery.com");
  assert.equal(spark.personalization.vertical, "bakery");
  assert.equal(spark.personalization.observation.text, OBSERVATION);
  assert.ok(spark.idea.premise.includes(OBSERVATION));
  assert.deepEqual(spark.personalization.scanned_urls, [
    "https://acmebakery.com/",
    "https://acmebakery.com/about",
    "https://acmebakery.com/menu",
  ]);
  assert.equal(spark.personalization.what.seeded, spark.seed.form);
  assert.notEqual(spark.personalization.what.adapted, spark.seed.form);
  assert.equal([...h.kv.keys()].some((key) => key.startsWith("w:")), false);

  const profile = JSON.parse(h.kv.get("profile:acmebakery.com"));
  const profileInput = {
    version: 1,
    domain: profile.domain,
    scanned_urls: profile.scanned_urls,
    vertical: profile.vertical,
    clarity: profile.clarity,
    observation: profile.observation,
  };
  assert.equal(profile.profile_hash, await sha256(JSON.stringify(profileInput)));
  const personalizedPreimage = [
    "1",
    spark.window.round,
    spark.seed.hash,
    spark.personalization.domain,
    spark.personalization.profile_hash,
  ].join("|");
  assert.equal(spark.id, "p-" + (await sha256(personalizedPreimage)).slice(0, 16));
  const profilePut = h.kvPuts.find((put) => put.key === "profile:acmebakery.com");
  assert.equal(profilePut.options.expirationTtl, 86400);
  assert.equal(h.kv.get("pw:" + spark.window.round + ":acmebakery.com"), spark.id);
  assert.equal(JSON.parse(h.kv.get(spark.id)).id, spark.id);
  assert.deepEqual(h.aiCalls.map((call) => call.kind), ["inference", "personalized"]);
  assert.deepEqual(h.meterPosts, [5, 7]);
  const neuronReceiptIds = [...h.kv.keys()].filter((key) => key.startsWith("n:")).map((key) => key.split(":").pop());
  assert.ok(neuronReceiptIds.every((id) => /^(?:[0-9a-f]{8}|p-[0-9a-f]{16})$/.test(id)));
  const stored = JSON.stringify([...h.kv.entries()]) + JSON.stringify([...h.coordStorage.map.entries()]);
  assert.equal(stored.includes(ip), false);
  assert.equal(stored.includes("RAW_HTML_SECRET"), false);

  const raw = await worker.fetch(new Request("https://oddspark.dev/api/spark/" + spark.id), h.env);
  assert.equal(raw.status, 404);
  const permalink = await worker.fetch(new Request("https://oddspark.dev/s/" + spark.id, { headers: { accept: "text/html" } }), h.env);
  assert.equal(permalink.status, 404);
  const curlPermalink = await worker.fetch(
    new Request("https://oddspark.dev/s/" + spark.id, { headers: { "user-agent": "curl/8.4.0", accept: "*/*" } }),
    h.env
  );
  assert.match(curlPermalink.headers.get("content-type") || "", /text\/html/);
  assert.match(await curlPermalink.text(), /That spark is no longer available/);
  const missing = await worker.fetch(new Request("https://oddspark.dev/api/spark/p-0000000000000000"), h.env);
  assert.equal(missing.status, 404);
  h.kv.set("secret", JSON.stringify({ secret: true }));
  const guarded = await worker.fetch(new Request("https://oddspark.dev/api/spark/secret"), h.env);
  assert.equal(guarded.status, 404);
});

await test("hidden links cannot consume the deterministic page budget", async () => {
  const network = createNetwork();
  network
    .add(
      "https://acmebakery.com/",
      htmlResponse(`<html><body><p>${OBSERVATION}</p><script>const hidden = '<a href="/about">';</script><a href="/services">services</a><a href="/team">team</a></body></html>`)
    )
    .add("https://acmebakery.com/services", htmlResponse("<html><body>Custom bread orders.</body></html>"))
    .add("https://acmebakery.com/team", htmlResponse("<html><body>Meet the bakers.</body></html>"));
  const h = createEnvironment();
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "personalized");
  assert.equal(network.siteCalls.includes("https://acmebakery.com/about"), false);
  assert.deepEqual(result.body.personalization.scanned_urls, [
    "https://acmebakery.com/",
    "https://acmebakery.com/services",
    "https://acmebakery.com/team",
  ]);
});

await test("a generic pin stays byte-identical when the same window is personalized", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const h = createEnvironment();
  const generic = await strike(h.env, undefined);
  const pointerKey = "w:" + generic.body.window.round;
  const pointerBefore = h.kv.get(pointerKey);
  const bodyBefore = h.kv.get(pointerBefore);
  const personalized = await strike(h.env, "acmebakery.com");
  assert.match(personalized.body.id, /^p-/);
  assert.equal(personalized.body.seed.hash, generic.body.seed.hash);
  assert.equal(h.kv.get(pointerKey), pointerBefore);
  assert.equal(h.kv.get(pointerBefore), bodyBefore);
});

await test("profile hits skip scanning and consume no new-domain slot", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const h = createEnvironment();
  const first = await strike(h.env, "acmebakery.com");
  const siteCalls = network.siteCalls.length;
  network.round += 100;
  const second = await strike(h.env, "https://www.acmebakery.com/another-path");
  assert.match(first.body.id, /^p-/);
  assert.match(second.body.id, /^p-/);
  assert.notEqual(first.body.id, second.body.id);
  assert.equal(network.siteCalls.length, siteCalls);
  assert.equal(h.aiCalls.filter((call) => call.kind === "inference").length, 1);
  const visitorKey = await sha256("203.0.113.9");
  assert.equal(h.coordStorage.map.get("vis:" + visitorKey).length, 1);
});

await test("concurrent requests share one domain/window result", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const h = createEnvironment({ aiDelay: 35 });
  const [one, two] = await Promise.all([strike(h.env, "acmebakery.com"), strike(h.env, "acmebakery.com")]);
  assert.equal(one.body.id, two.body.id);
  assert.equal(one.body.personalization.profile_hash, two.body.personalization.profile_hash);
  assert.deepEqual(comparableSpark(one.body), comparableSpark(two.body));
  assert.equal(network.siteCalls.length, 1);
  assert.deepEqual(h.aiCalls.map((call) => call.kind), ["inference", "personalized"]);
});

await test("the coordinator receipt preserves convergence while personalized KV writes recover", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const h = createEnvironment({ aiDelay: 35 });
  const put = h.env.SPARKS.put.bind(h.env.SPARKS);
  let failReceiptWrites = true;
  h.env.SPARKS.put = async (key, ...args) => {
    if (failReceiptWrites && /^p-/.test(key)) throw new Error("KV write unavailable");
    return put(key, ...args);
  };

  const [one, two] = await Promise.all([strike(h.env, "acmebakery.com"), strike(h.env, "acmebakery.com")]);
  assert.equal(one.body.personalization.status, "personalized");
  assert.deepEqual(comparableSpark(one.body), comparableSpark(two.body));
  assert.equal(h.kv.has(one.body.id), false);

  failReceiptWrites = false;
  const recovered = await strike(h.env, "acmebakery.com");
  assert.deepEqual(comparableSpark(one.body), comparableSpark(recovered.body));
  assert.ok(h.kv.has(one.body.id));
  assert.equal(h.kv.get("pw:" + ROUND + ":acmebakery.com"), one.body.id);
});

await test("an expired domain lease can be taken over", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const h = createEnvironment();
  h.coordStorage.map.set("receipt:domain:" + ROUND + ":acmebakery.com", {
    status: "claimed",
    scope: { kind: "domain", round: ROUND, domain: "acmebakery.com" },
    owner: "dead-holder",
    lease_until: Date.now() - 1,
  });
  const result = await strike(h.env, "acmebakery.com");
  assert.match(result.body.id, /^p-/);
  assert.equal(h.coordStorage.map.get("receipt:domain:" + ROUND + ":acmebakery.com").status, "committed");
});

await test("site failure commits unavailable, writes no profile, and falls back generically", async () => {
  const network = createNetwork();
  network.add("https://acmebakery.com/", new Error("connection refused"));
  const h = createEnvironment();
  const result = await strike(h.env, "acmebakery.com");
  assert.match(result.body.id, /^[0-9a-f]{8}$/);
  assert.equal(result.body.personalization.status, "unavailable");
  assert.equal(result.body.personalization.warning, "Site context was unavailable; showing the generic spark.");
  assert.equal(h.kv.has("profile:acmebakery.com"), false);
  assert.equal(h.kv.get("pw:" + ROUND + ":acmebakery.com"), result.body.id);
  assert.equal(h.kv.has("w:" + ROUND), false);
});

await test("unsafe redirect Location returns 400 and is never fetched", async () => {
  const network = createNetwork();
  network.add("https://acmebakery.com/", new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }));
  const h = createEnvironment();
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.response.status, 400);
  assert.equal(result.body.field, "website");
  assert.deepEqual(network.siteCalls, ["https://acmebakery.com/"]);
  assert.equal(h.kv.has("profile:acmebakery.com"), false);

  network.add("https://acmebakery.com/", new Response(null, { status: 302, headers: { location: "https://otherpublic.com/path" } }));
  const crossDomain = await strike(h.env, "acmebakery.com");
  assert.equal(crossDomain.response.status, 400);
  assert.equal(crossDomain.body.field, "website");
  assert.equal(network.siteCalls.includes("https://otherpublic.com/path"), false);
});

await test("HTML sniffing succeeds while non-HTML and aggregate overflow fall back", async () => {
  let network = createNetwork();
  network.add("https://acmebakery.com/", new Response(`<html><body><p>${OBSERVATION}</p></body></html>`, { status: 200 }));
  let h = createEnvironment();
  let result = await strike(h.env, "acmebakery.com");
  assert.match(result.body.id, /^p-/);

  network = createNetwork();
  network.add("https://acmebakery.com/", new Response("plain response", { headers: { "content-type": "text/plain" } }));
  h = createEnvironment();
  result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "unavailable");

  network = createNetwork();
  const first = `<html><body><p>${OBSERVATION}</p><a href="/about">about</a>` + "a".repeat(300000) + "</body></html>";
  const second = "<html><body>" + "b".repeat(225000) + "</body></html>";
  network.add("https://acmebakery.com/", htmlResponse(first));
  network.add("https://acmebakery.com/about", htmlResponse(second));
  h = createEnvironment();
  result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "unavailable");
  assert.equal(h.kv.has("profile:acmebakery.com"), false);
});

await test("declared content length and the four-second scan deadline are enforced", async () => {
  let network = createNetwork();
  network.add(
    "https://acmebakery.com/",
    htmlResponse(`<html><body><p>${OBSERVATION}</p></body></html>`, 200, { "content-length": String(512 * 1024 + 1) })
  );
  let h = createEnvironment();
  let result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "unavailable");
  assert.equal(network.siteCalls.length, 1);
  assert.equal(h.kv.has("profile:acmebakery.com"), false);

  const originalNow = Date.now;
  let now = 1000;
  try {
    Date.now = () => now;
    network = createNetwork();
    network.add("https://acmebakery.com/", () => {
      now += 3999;
      return htmlResponse(`<html><body><p>${OBSERVATION}</p></body></html>`);
    });
    h = createEnvironment();
    result = await strike(h.env, "acmebakery.com");
    assert.equal(result.body.personalization.status, "personalized");

    now = 1000;
    network = createNetwork();
    network.add("https://acmebakery.com/", () => {
      now += 4000;
      return htmlResponse(`<html><body><p>${OBSERVATION}</p></body></html>`);
    });
    h = createEnvironment();
    result = await strike(h.env, "acmebakery.com");
  } finally {
    Date.now = originalNow;
  }
  assert.equal(result.body.personalization.status, "unavailable");
  assert.equal(h.kv.has("profile:acmebakery.com"), false);
});

await test("model fallback threshold and best-effort neuron recording are pinned", async () => {
  createNetwork();
  let h = createEnvironment();
  h.meterState.set(new Date().toISOString().slice(0, 10), 2499);
  let result = await strike(h.env, undefined);
  assert.equal(result.response.status, 502);
  assert.equal(h.aiCalls[0].model, "mock-primary");
  assert.equal(result.body.model, "mock-primary");

  createNetwork();
  h = createEnvironment();
  h.meterState.set(new Date().toISOString().slice(0, 10), 2500);
  result = await strike(h.env, undefined);
  assert.equal(result.response.status, 502);
  assert.equal(h.aiCalls[0].model, "mock-fallback");
  assert.equal(result.body.model, "mock-fallback");

  createNetwork();
  h = createEnvironment({ meterPostDown: true, neuronReceiptDown: true });
  result = await strike(h.env, undefined);
  assert.equal(result.response.status, 502);
  assert.equal(result.body.generated, true);
  assert.equal(h.meterPosts.length, 0);
  assert.deepEqual(h.meterPostAttempts, [3]);
  assert.equal(h.neuronReceiptAttempts.length, 1);
  assert.equal([...h.kv.keys()].some((key) => key.startsWith("n:")), false);
});

await test("the redirect allowance is aggregate across all scanned pages", async () => {
  const network = createNetwork();
  network
    .add("https://acmebakery.com/", new Response(null, { status: 302, headers: { location: "/r1" } }))
    .add("https://acmebakery.com/r1", new Response(null, { status: 302, headers: { location: "/home" } }))
    .add("https://acmebakery.com/home", htmlResponse(`<html><body><p>${OBSERVATION}</p><a href="/about">about</a></body></html>`))
    .add("https://acmebakery.com/about", new Response(null, { status: 302, headers: { location: "/r3" } }))
    .add("https://acmebakery.com/r3", new Response(null, { status: 302, headers: { location: "/r4" } }))
    .add("https://acmebakery.com/r4", htmlResponse("<html><body>should not be fetched</body></html>"));
  const h = createEnvironment();
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "unavailable");
  assert.equal(network.siteCalls.includes("https://acmebakery.com/r4"), false);
});

await test("ungrounded evidence fails; grounded text clamps to 280 Unicode code points", async () => {
  let network = createNetwork();
  addSimpleSite(network);
  let h = createEnvironment({ observationText: "A paraphrase that is not on the page." });
  let result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "unavailable");
  assert.equal(h.kv.has("profile:acmebakery.com"), false);

  network = createNetwork();
  addSimpleSite(network, "acmebakery.com", "A");
  h = createEnvironment({ observationText: "A" });
  result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "unavailable");

  const longObservation = "x".repeat(300);
  network = createNetwork();
  addSimpleSite(network, "acmebakery.com", longObservation);
  h = createEnvironment({ observationText: longObservation });
  result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "personalized");
  assert.equal([...result.body.personalization.observation.text].length, 280);
  assert.ok(longObservation.includes(result.body.personalization.observation.text));
});

await test("unclear vertical becomes small-business personalization with a warning", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const h = createEnvironment({ clarity: "unclear", vertical: "unknown" });
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "personalized");
  assert.equal(result.body.personalization.vertical, "small business");
  assert.equal(result.body.personalization.warning, "The site's purpose was unclear on the scanned pages.");
});

await test("a visitor receives ten new-domain scans per rolling hour; repeats do not consume", async () => {
  const network = createNetwork({ defaultSite: true });
  const h = createEnvironment();
  const results = [];
  for (let index = 0; index < 11; index++) results.push(await strike(h.env, "shop" + index + ".com"));
  assert.ok(results.slice(0, 10).every((result) => result.body.personalization.status === "personalized"));
  assert.equal(results[10].response.status, 502);
  assert.equal(network.siteCalls.length, 10);
  const visitorKey = await sha256("203.0.113.9");
  assert.equal(h.coordStorage.map.get("vis:" + visitorKey).length, 10);
});

await test("the coordinator keeps the first accepted profile under a race", async () => {
  createNetwork();
  const h = createEnvironment();
  const profileA = {
    version: 1,
    domain: "acmebakery.com",
    scanned_urls: ["https://acmebakery.com/"],
    vertical: "bakery",
    clarity: "clear",
    observation: { url: "https://acmebakery.com/", text: OBSERVATION },
    scan_time: "2026-07-31T20:00:00.000Z",
    profile_hash: "a".repeat(64),
  };
  const profileB = { ...profileA, vertical: "restaurant", profile_hash: "b".repeat(64) };
  const stub = h.env.COORD.get(h.env.COORD.idFromName("global"));
  const commit = (profile) => stub.fetch("https://coord/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ domain: "acmebakery.com", profile }),
  }).then((response) => response.json());
  const [first, second] = await Promise.all([commit(profileA), commit(profileB)]);
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
  assert.deepEqual(second.profile, profileA);
  assert.deepEqual(h.coordStorage.map.get("profile:acmebakery.com").profile, profileA);
});

await test("concurrent scan failure converges on the unavailable commit", async () => {
  const network = createNetwork();
  network.add("https://acmebakery.com/", new Error("connection refused"));
  const h = createEnvironment({ varyGeneric: true });
  const [one, two] = await Promise.all([strike(h.env, "acmebakery.com"), strike(h.env, "acmebakery.com")]);
  assert.equal(one.body.id, two.body.id);
  assert.equal(one.body.personalization.status, "unavailable");
  assert.equal(two.body.personalization.status, "unavailable");
  assert.equal(h.kv.get("pw:" + ROUND + ":acmebakery.com"), one.body.id);
  assert.equal(network.siteCalls.length, 1);
  assert.equal(h.aiCalls.filter((call) => call.kind === "generic").length, 1);
  const repeat = await strike(h.env, "acmebakery.com");
  assert.deepEqual(comparableSpark(one.body), comparableSpark(repeat.body));
  assert.equal(h.aiCalls.filter((call) => call.kind === "generic").length, 1);
});

await test("XSS-like model and observation text remain data in server and client render paths", async () => {
  const observation = '<img src=x onerror="alert(1)"> offers repairs.';
  const encoded = "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; offers repairs.";
  const network = createNetwork();
  addSimpleSite(network, "acmebakery.com", encoded);
  const h = createEnvironment({ observationText: observation, xssIdea: true });
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.body.personalization.status, "personalized");
  const response = await worker.fetch(
    new Request("https://oddspark.dev/s/" + result.body.id, { headers: { accept: "text/html" } }),
    h.env
  );
  const html = await response.text();
  assert.equal(html.includes('<script id="owned">'), false);
  assert.equal(response.status, 404);
  assert.match(html, /That spark is no longer available/);
  assert.equal(result.body.idea.headline, '</title><script id="owned">alert(1)</script>');
  assert.equal(result.body.personalization.observation.text, observation);
});

await test("final redirected page URLs are deduplicated and sorted in the profile", async () => {
  const network = createNetwork();
  network
    .add("https://acmebakery.com/", htmlResponse(`<html><body><p>${OBSERVATION}</p><a href="/a">a</a><a href="/m">m</a></body></html>`))
    .add("https://acmebakery.com/a", new Response(null, { status: 302, headers: { location: "/z-final" } }))
    .add("https://acmebakery.com/m", new Response(null, { status: 302, headers: { location: "/b-final" } }))
    .add("https://acmebakery.com/z-final", htmlResponse("<html><body>Z page</body></html>"))
    .add("https://acmebakery.com/b-final", htmlResponse("<html><body>B page</body></html>"));
  const h = createEnvironment();
  const result = await strike(h.env, "acmebakery.com");
  assert.deepEqual(result.body.personalization.scanned_urls, [
    "https://acmebakery.com/",
    "https://acmebakery.com/b-final",
    "https://acmebakery.com/z-final",
  ]);
});

const story15 = story15Cases({ ROUND, createNetwork, createEnvironment, sparkRequest, strike });
await test("committed local native form 303 then followed GET count exactly once", story15.localNative);
await test("committed domain and request-scope-domain mode-local downgrade direct 200 no share one count", story15.domainMatrix);
await test("explicit committed JSON 200 and one count", story15.explicitJson);
await test("house notice across JSON HTML and text", story15.house);
await test("legacy malformed lookup strike permalink and home text rejection with zero metric", story15.rejection);
await test("render failure before metric", story15.renderFailure);
await test("hostile committed text escapes server and enhanced branches while JSON stays literal", story15.hostile);
await test("enhanced settle executes share clipboard state focus history and cleanup", story15.enhanced);
await test("committed shell boot preserves awaiting-seed geometry provenance and accessibility", story15.shell);

globalThis.fetch = ORIGINAL_FETCH;
console.log("\n" + passed + "/" + (passed + failed) + " passed");
process.exit(failed ? 1 : 0);
