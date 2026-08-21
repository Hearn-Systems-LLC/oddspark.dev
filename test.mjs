import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import worker, { NeuronMeter, SparkCoordinator, deriveInactiveDomainDispatch, PRE_ACTIVATION_NOTICE } from "./src/worker.js";
import { story15Cases } from "./scripts/brief-rendering.outer.mjs";
import { buildCommittedBrief, CANDIDATE_SCHEMA_VERSION, deriveCandidateRef } from "./scripts/brief-contracts.mjs";
import { HOUSE_NOTICE } from "./scripts/brief-rendering.mjs";
import {
  contentIdentity as priorsContentIdentity,
  approvalIdentity as priorsApprovalIdentity,
  verifyLocalPriors,
} from "./scripts/local-priors.mjs";
import {
  catalogIdentity as houseCatalogIdentity,
  approvalIdentity as houseApprovalIdentity,
  verifyApproval as verifyHouseApproval,
} from "./scripts/house-briefs.mjs";
import { deriveIdentity as corpusIdentity, validateCorpus } from "./scripts/semantic-corpus.mjs";
import { ACTIVATION_REASON_CODES, deriveActivationRef, evaluateProductionActivation } from "./src/pipeline/activation.mjs";
import { activationPosture } from "./src/pipeline/assembly.mjs";
import { DOMAIN_RESULT_TTL_MS, LOCAL_RETENTION_MS, domainArtifactReadable, localArtifactLive } from "./src/pipeline/retention.mjs";
import { computeAssemblyIdentity } from "./src/pipeline/identity.mjs";

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

  // Story 1.23: offline assembly authority. The activation fixture and the
  // injected priors/house/corpus/provider ports create test authority only;
  // none of them can exist in a deployed Worker's configuration. Every
  // environment gets deep clones so a test's mutation can never leak into a
  // later environment through the shared fixture cache.
  if (options.pipeline) {
    const fixture = pipelineFixture();
    env.ACTIVATION_MANIFEST = "manifest" in options.pipeline
      ? (typeof options.pipeline.manifest === "string" ? options.pipeline.manifest : structuredClone(options.pipeline.manifest))
      : structuredClone(fixture.manifest);
    env.PIPELINE_PRIORS = structuredClone(fixture.priors);
    env.PIPELINE_HOUSE = structuredClone(fixture.house);
    env.PIPELINE_CORPUS = structuredClone(fixture.corpus);
    env.PIPELINE_JUDGE = structuredClone(fixture.judge);
    env.PIPELINE_GENERATE_PROVIDER = options.pipeline.generate ?? fixture.generateProvider;
    env.PIPELINE_JUDGE_PROVIDER = options.pipeline.judge ?? fixture.judgeProvider;
  }

  return { env, kv, kvPuts, meterPosts, meterPostAttempts, neuronReceiptAttempts, meterState, aiCalls, coordStorage };
}

/* ------------------------------------------------------------------ *
 * Story 1.23 fixtures: priors/house/corpus content loaded as data with
 * fixture approvals proven through the REAL verification functions
 * (verifyLocalPriors, house verifyApproval, validateCorpus readiness),
 * a local-enabled/domain-disabled activation manifest, and fake
 * generation/judge providers. Everything is offline and deterministic.
 * ------------------------------------------------------------------ */

let pipelineFixtureCache = null;
function pipelineFixture() {
  if (pipelineFixtureCache) return pipelineFixtureCache;
  const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const approvalNow = new Date("2026-08-19T00:00:00.000Z");

  const priorsCatalog = readJson("./content/local-priors/v1/priors.json");
  const priorsApproval = {
    schema_version: 1, catalog_version: 1, status: "approved", approver: "Justin",
    content_hash: priorsContentIdentity(priorsCatalog), identity: null, approved_at: "2026-08-18T12:00:00.000Z",
  };
  priorsApproval.identity = priorsApprovalIdentity(priorsApproval);
  assert.equal(
    verifyLocalPriors(priorsCatalog, priorsApproval, { now: approvalNow }).production_ready, true,
    "the priors fixture must pass the real priors verification",
  );

  const rubric = readJson("./semantic/voice/v1/rubric.json");
  const houseCatalog = readJson("./content/house-briefs/v1/catalog.json");
  const houseApproval = {
    schema_version: 1, catalog_version: 1, status: "approved", approver: "Justin",
    content_hash: houseCatalogIdentity(houseCatalog), identity: null, approved_at: "2026-08-18T12:00:00.000Z",
  };
  houseApproval.identity = houseApprovalIdentity(houseApproval);
  const houseAuthorities = { priors: priorsCatalog, rubric };
  assert.equal(
    verifyHouseApproval(houseCatalog, houseApproval, houseAuthorities, { now: approvalNow }).ready, true,
    "the house fixture must pass the real house approval verification",
  );

  const corpus = {
    rubric,
    goldens: readJson("./semantic/voice/v1/goldens.json"),
    anti_goldens: readJson("./semantic/voice/v1/anti-goldens.json"),
    approval: null,
  };
  const semantic = corpusIdentity(corpus);
  corpus.approval = {
    schema_version: 1, status: "approved", owner: "Justin", corpus_version: "voice-v1",
    hashes: semantic.hashes, semantic_identity: semantic.semantic_identity, approved_at: "2026-08-18T12:00:00Z",
  };
  const corpusReadiness = validateCorpus(corpus, { nowMs: approvalNow.valueOf() });
  assert.equal(corpusReadiness.readiness, "approved", "the corpus fixture must pass the real corpus readiness verification");
  assert.match(corpusReadiness.approved_semantic_identity, /^[a-f0-9]{64}$/);

  const manifest = {
    version: 1,
    deployed_source_identity: "offline-assembly-fixture",
    generation_ref: "a".repeat(64),
    judge_ref: "b".repeat(64),
    semantic_ref: "c".repeat(64),
    local: { enabled: true, full_request_ref: "d".repeat(64) },
    domain: { enabled: false, evidence_ref: null, full_request_ref: null },
    house_catalog_ref: "e".repeat(64),
    receiver_ref: null,
    receipt_claim_ref: null,
    outcome: "active",
  };
  const pipelineCandidate = (suffix = "") => ({
    version: 1, mode: "local", title: `A calmer inquiry handoff${suffix}`,
    plan: "Route repeated questions into one reviewed response.",
    why_fits: { text: "Seasonal inquiry bursts benefit from a consistent first pass." },
    what_gets_better: "The team starts with a useful draft instead of an empty page.",
    before_after: { before: "The team rewrites similar replies.", after: "The team reviews one prepared reply." },
    change_level: { time_range: "a short setup window", steps_changed: 2, steps_removed: 1, preliminary: true },
    stays_same: { tools: ["Current inbox"], authority: ["The team approves every reply"], steps: ["Staff handle exceptions"] },
    invitation: "We can inspect this Spark together and map a clear first step.",
    grounded_numbers: [],
  });
  const pipelineVerdict = (candidateRef, pass = true) => ({
    candidate_ref: candidateRef,
    verdict: {
      pass,
      gates: Array.from({ length: 9 }, (_, index) => ({ gate: index + 1, pass, reason: `fixture reason ${index + 1}` })),
      tone: { pass, reason: "fixture tone" },
      claims: { pass, reason: "fixture claims" },
    },
  });
  pipelineFixtureCache = {
    manifest,
    priors: { priors: priorsCatalog, approval: priorsApproval },
    house: { catalog: houseCatalog, approval: houseApproval, authorities: houseAuthorities },
    corpus,
    judge: { role: "STRUCT-JUDGE", provider: "offline-fixture", resolved_model: "fixture-judge-v1", qualification_ref: "a".repeat(64), status: "active", outcome: "GO" },
    generateProvider: async () => pipelineCandidate(),
    judgeProvider: async (request) => pipelineVerdict(request.candidate_ref),
    pipelineCandidate,
    pipelineVerdict,
  };
  return pipelineFixtureCache;
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

/* ------------------------------------------------------------------ *
 * Story 1.16: inactive-domain dispatch contract and request hardening
 * ------------------------------------------------------------------ */

const WRITER_HASH = "a".repeat(64);

function inactiveDomainCommitted(id, domain) {
  const brief = {
    version: 1,
    mode: "local",
    title: `Title for ${domain}`,
    plan: "One concrete plan for the week.",
    why_fits: { text: "It fits the slow season." },
    what_gets_better: "The phone stops ringing for the same question.",
    before_after: { before: "Calls interrupt the work.", after: "The page answers first." },
    change_level: { time_range: "One quiet afternoon", steps_changed: 1, steps_removed: 0, preliminary: true },
    stays_same: { tools: ["The phone"], authority: ["The owner"], steps: ["Taking the order"] },
    invitation: "Bring this Spark and map a clear first step.",
    grounded_numbers: [],
    notice: PRE_ACTIVATION_NOTICE,
  };
  return buildCommittedBrief({
    artifact_version: 1,
    id,
    request_scope: "domain",
    brief,
    brief_schema_version: 1,
    policy_identity: WRITER_HASH,
    rubric_identity: WRITER_HASH,
    provenance: {
      attempt_id: `attempt-${id}`,
      candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief),
      evidence_ref: WRITER_HASH,
      grounding_report_version: 1,
      effective_mode: "local",
    },
  });
}

function localCommitted(id) {
  const brief = {
    version: 1,
    mode: "local",
    title: `Local title ${id}`,
    plan: "One concrete plan for the week.",
    why_fits: { text: "It fits the slow season." },
    what_gets_better: "The phone stops ringing for the same question.",
    before_after: { before: "Calls interrupt the work.", after: "The page answers first." },
    change_level: { time_range: "One quiet afternoon", steps_changed: 1, steps_removed: 0, preliminary: true },
    stays_same: { tools: ["The phone"], authority: ["The owner"], steps: ["Taking the order"] },
    invitation: "Bring this Spark and map a clear first step.",
    grounded_numbers: [],
  };
  return buildCommittedBrief({
    artifact_version: 1,
    id,
    request_scope: "local",
    brief,
    brief_schema_version: 1,
    policy_identity: WRITER_HASH,
    rubric_identity: WRITER_HASH,
    provenance: {
      attempt_id: `attempt-${id}`,
      candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief),
      evidence_ref: WRITER_HASH,
      grounding_report_version: 1,
      effective_mode: "local",
    },
  });
}

async function seedCommitted(h, scope, artifact) {
  const stub = h.env.COORD.get(h.env.COORD.idFromName("global"));
  const post = (path, body) => stub.fetch("https://coord" + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal((await post("/claim", { scope, owner: "story-16" })).status, 200);
  assert.equal((await post("/commit", { scope, owner: "story-16", artifact })).status, 200);
}

function nativeForm(website, headers = {}) {
  return new Request("https://oddspark.dev/api/spark", {
    method: "POST",
    redirect: "manual",
    headers: {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
      "cf-connecting-ip": "203.0.113.88",
      ...headers,
    },
    body: new URLSearchParams({ website }).toString(),
  });
}

function assertDynamicHeaders(response) {
  const vary = (response.headers.get("vary") || "").split(",").map((token) => token.trim().toLowerCase());
  for (const token of ["origin", "accept", "content-type"]) assert.ok(vary.includes(token), `vary missing ${token}`);
  assert.equal(response.headers.get("cache-control"), "no-store");
}

await test("inactive-domain dispatch derivation is pure, closed, and deeply frozen", async () => {
  const network = createNetwork();
  const dispatch = deriveInactiveDomainDispatch({ domain: "acmebakery.com", url: "https://acmebakery.com/" }, ROUND);
  assert.deepEqual(Object.keys(dispatch).sort(), [
    "claim_key",
    "contract",
    "effective_mode",
    "evidence_provider_allowed",
    "notice",
    "notice_identity",
    "permalink_allowed",
    "request_scope",
    "scan_allowed",
  ]);
  assert.equal(dispatch.contract, "inactive-domain-dispatch/v1");
  assert.deepEqual(dispatch.request_scope, { kind: "domain", round: ROUND, domain: "acmebakery.com" });
  assert.equal(dispatch.effective_mode, "local");
  assert.equal(dispatch.claim_key, `domain:${ROUND}:acmebakery.com`);
  assert.equal(dispatch.notice_identity, "pre-activation");
  assert.equal(dispatch.notice, "Website reading is not switched on yet, so this plan is built from local patterns only.");
  assert.equal(dispatch.scan_allowed, false);
  assert.equal(dispatch.evidence_provider_allowed, false);
  assert.equal(dispatch.permalink_allowed, false);
  const deeplyFrozen = (value) => value === null || typeof value !== "object"
    || (Object.isFrozen(value) && Object.values(value).every(deeplyFrozen));
  assert.ok(Object.isFrozen(dispatch) && deeplyFrozen(dispatch));
  assert.throws(() => { dispatch.scan_allowed = true; }, TypeError);
  // Purity: derivation touched no network, and it never receives env, KV,
  // coordinator, AI, or a writer — it is a synchronous function of (website, round).
  assert.equal(network.calls.length, 0);
  assert.equal(network.siteCalls.length, 0);
});

await test("healthy injected writer renders domain HTML direct-200 and JSON parity, counting once each", async () => {
  const network = createNetwork();
  const h = createEnvironment();
  const artifact = inactiveDomainCommitted("inactive-domain-healthy", "acmebakery.com");
  const calls = [];
  h.env.INACTIVE_DOMAIN_WRITER = {
    async write(dispatch) {
      calls.push(dispatch);
      return { status: "committed", scope: dispatch.request_scope, artifact };
    },
  };

  const htmlResponse = await worker.fetch(nativeForm("acmebakery.com"), h.env);
  assert.equal(htmlResponse.status, 200);
  assert.match(htmlResponse.headers.get("content-type") || "", /text\/html/);
  assertDynamicHeaders(htmlResponse);
  const html = await htmlResponse.text();
  assert.match(html, /Title for acmebakery\.com/);
  assert.match(html, /Website reading is not switched on yet/);
  assert.doesNotMatch(html, /\/s\/inactive-domain-healthy/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].claim_key, `domain:${ROUND}:acmebakery.com`);
  assert.equal(Object.isFrozen(calls[0]), true);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
  // Dispatch path performed no scan, no AI call, and no KV projection.
  assert.equal(network.siteCalls.length, 0);
  assert.equal(h.aiCalls.length, 0);
  assert.equal(h.kvPuts.length, 0);

  // Explicit JSON acceptance wins even for a form-encoded body.
  const jsonResponse = await worker.fetch(nativeForm("acmebakery.com", { accept: "application/json" }), h.env);
  assert.equal(jsonResponse.status, 200);
  assert.match(jsonResponse.headers.get("content-type") || "", /application\/json/);
  assertDynamicHeaders(jsonResponse);
  assert.deepEqual(await jsonResponse.json(), JSON.parse(JSON.stringify(artifact)));
  assert.equal(calls.length, 2);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 2);
  assert.equal(network.siteCalls.length, 0);
});

await test("writer-port fault classes produce the negotiated 502 with zero metric", async () => {
  for (const [name, port] of Object.entries({
    "missing-result": { async write() { return null; } },
    throwing: { async write() { throw new Error("writer exploded"); } },
    malformed: { async write(dispatch) { return { status: "committed", scope: dispatch.request_scope, artifact: { junk: true } }; } },
    "non-committed-status": { async write(dispatch) { return { status: "failed", scope: dispatch.request_scope, artifact: inactiveDomainCommitted("inactive-domain-failed", "acmebakery.com") }; } },
    "extra-outcome-keys": { async write(dispatch) { return { status: "committed", scope: dispatch.request_scope, artifact: inactiveDomainCommitted("inactive-domain-extra", "acmebakery.com"), debug: true }; } },
    "hostile-outcome": {
      async write(dispatch) {
        return new Proxy({ status: "committed", scope: dispatch.request_scope, artifact: inactiveDomainCommitted("inactive-domain-hostile", "acmebakery.com") }, {
          get(target, key) { if (key === "artifact") throw new Error("hostile getter"); return target[key]; },
        });
      },
    },
    "scope-mismatched": {
      async write(dispatch) {
        return {
          status: "committed",
          scope: { kind: "domain", round: ROUND, domain: "other-domain.com" },
          artifact: inactiveDomainCommitted("inactive-domain-mismatch", "acmebakery.com"),
        };
      },
    },
    "local-scoped-artifact": {
      async write(dispatch) {
        const artifact = inactiveDomainCommitted("inactive-domain-local", "acmebakery.com");
        return { status: "committed", scope: dispatch.request_scope, artifact: { ...artifact, request_scope: "local" } };
      },
    },
  })) {
    const network = createNetwork();
    const h = createEnvironment();
    h.env.INACTIVE_DOMAIN_WRITER = port;

    const json = await worker.fetch(sparkRequest("acmebakery.com"), h.env);
    assert.equal(json.status, 502, name);
    assert.match((await json.json()).error, /inactive domain writer unavailable/, name);

    const html = await worker.fetch(nativeForm("acmebakery.com"), h.env);
    assert.equal(html.status, 502, name);
    assert.match(html.headers.get("content-type") || "", /text\/html/, name);
    assert.match(await html.text(), /No spark this time/, name);

    assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined, name);
    assert.equal(h.coordStorage.map.get("metric:house_briefs_served"), undefined, name);
    assert.equal(network.siteCalls.length, 0, name);
    assert.equal(h.aiCalls.length, 0, name);
  }
});

await test("the writer port is invoked exactly once per domain request", async () => {
  createNetwork();
  const h = createEnvironment();
  let calls = 0;
  h.env.INACTIVE_DOMAIN_WRITER = {
    async write(dispatch) {
      calls++;
      return { status: "committed", scope: dispatch.request_scope, artifact: inactiveDomainCommitted("inactive-domain-once", "acmebakery.com") };
    },
  };
  const response = await worker.fetch(sparkRequest("acmebakery.com"), h.env);
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
});

await test("dynamic responses carry the full Vary set and no-store across terminals", async () => {
  createNetwork();
  const h = createEnvironment();
  h.env.INACTIVE_DOMAIN_WRITER = {
    async write(dispatch) {
      return { status: "committed", scope: dispatch.request_scope, artifact: inactiveDomainCommitted("inactive-domain-vary", "acmebakery.com") };
    },
  };
  await seedCommitted(h, { kind: "local", round: ROUND }, localCommitted("vary-local"));

  assertDynamicHeaders(await worker.fetch(sparkRequest("acmebakery.com"), h.env)); // domain JSON 200
  assertDynamicHeaders(await worker.fetch(nativeForm("acmebakery.com"), h.env)); // domain HTML 200
  assertDynamicHeaders(await worker.fetch(sparkRequest("ftp://acmebakery.com"), h.env)); // JSON 400
  assertDynamicHeaders(await worker.fetch(nativeForm("ftp://acmebakery.com"), h.env)); // HTML 400
  assertDynamicHeaders(await worker.fetch(new Request("https://oddspark.dev/", { headers: { accept: "text/html" } }), h.env)); // home
  assertDynamicHeaders(await worker.fetch(new Request("https://oddspark.dev/s/00000000", { headers: { accept: "text/html" } }), h.env)); // permalink 404
  assertDynamicHeaders(await worker.fetch(new Request("https://oddspark.dev/no-such-route"), h.env)); // bare 404

  const redirect = await worker.fetch(nativeForm(""), h.env); // local native-form 303
  assert.equal(redirect.status, 303);
  assertDynamicHeaders(redirect);
  assertDynamicHeaders(await worker.fetch(new Request("https://oddspark.dev/s/vary-local", { headers: { accept: "text/html" } }), h.env)); // permalink 200 HTML
  assertDynamicHeaders(await worker.fetch(new Request("https://oddspark.dev/s/vary-local", { headers: { "user-agent": "curl/8.4.0", accept: "*/*" } }), h.env)); // permalink text/plain
  assertDynamicHeaders(await worker.fetch(new Request("https://oddspark.dev/api/spark/vary-local"), h.env)); // JSON 200 by id

  const failing = createEnvironment();
  failing.env.INACTIVE_DOMAIN_WRITER = { async write() { throw new Error("writer exploded"); } };
  const html502 = await worker.fetch(nativeForm("acmebakery.com"), failing.env); // negotiated HTML 502
  assert.equal(html502.status, 502);
  assertDynamicHeaders(html502);
  assertDynamicHeaders(await worker.fetch(sparkRequest("acmebakery.com"), failing.env)); // negotiated JSON 502
});

await test("a null or malformed writer binding behaves as absent and falls through to the legacy path", async () => {
  for (const port of [null, {}, 42]) {
    const network = createNetwork();
    const h = createEnvironment();
    h.env.INACTIVE_DOMAIN_WRITER = port;
    const result = await strike(h.env, "acmebakery.com");
    assert.equal(result.response.status, 502, String(port));
    // The quarantined legacy path ran: it scanned, failed, and committed an
    // unavailable fallback that cannot render as a committed_brief.
    assert.equal(result.body.personalization?.status, "unavailable", String(port));
    assert.equal(network.siteCalls.length, 1, String(port));
  }
});

await test("an injected writer port never sees local no-website strikes", async () => {
  createNetwork();
  const withPort = createEnvironment();
  let calls = 0;
  withPort.env.INACTIVE_DOMAIN_WRITER = {
    async write() {
      calls++;
      throw new Error("writer must not be called for local strikes");
    },
  };
  const withoutPort = createEnvironment();
  const a = await strike(withPort.env, undefined);
  const b = await strike(withoutPort.env, undefined);
  assert.equal(calls, 0);
  assert.equal(a.response.status, 502);
  assert.equal(a.response.status, b.response.status);
  assert.equal(a.body.id, b.body.id);
});

await test("the terminal catch negotiates HTML and JSON 400 representations", async () => {
  const network = createNetwork();
  network.add("https://acmebakery.com/", new Response(null, { status: 302, headers: { location: "https://otherpublic.com/path" } }));
  const h = createEnvironment(); // no writer port: quarantined legacy path throws past readSparkIntent

  const html = await worker.fetch(nativeForm("acmebakery.com"), h.env);
  assert.equal(html.status, 400);
  assert.match(html.headers.get("content-type") || "", /text\/html/);
  assertDynamicHeaders(html);
  const htmlBody = await html.text();
  assert.match(htmlBody, /Website redirects must stay on the submitted domain\./);
  assert.match(htmlBody, /id="website-error"/);
  assert.match(htmlBody, /aria-invalid="true"/);

  const json = await worker.fetch(sparkRequest("acmebakery.com"), h.env);
  assert.equal(json.status, 400);
  assert.deepEqual(await json.json(), { error: "Website redirects must stay on the submitted domain.", field: "website" });

  assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
  assert.deepEqual(network.siteCalls, ["https://acmebakery.com/", "https://acmebakery.com/"]);
});

/* ------------------------------------------------------------------ *
 * Story 1.23: worker runtime assembly — the canonical inactive-domain
 * writer behind the activation port, proven end-to-end offline.
 * ------------------------------------------------------------------ */

await test("activation manifest validation is closed, nullability-exact, and redacted", async () => {
  const fixture = pipelineFixture();
  const valid = evaluateProductionActivation(fixture.manifest);
  assert.equal(valid.enabled, true);
  assert.equal(valid.reason, null);
  assert.equal(valid.activation_ref, deriveActivationRef(fixture.manifest));
  assert.ok(Object.isFrozen(valid.manifest));

  // The production binding form: the manifest as a JSON string.
  const fromString = evaluateProductionActivation(JSON.stringify(fixture.manifest));
  assert.equal(fromString.enabled, true);
  assert.equal(fromString.activation_ref, valid.activation_ref);

  assert.equal(evaluateProductionActivation(undefined).reason, ACTIVATION_REASON_CODES.MISSING);
  assert.equal(evaluateProductionActivation(null).enabled, false);
  assert.equal(evaluateProductionActivation("not json").reason, ACTIVATION_REASON_CODES.NOT_CLOSED);
  assert.equal(evaluateProductionActivation({ ...fixture.manifest, extra: true }).reason, ACTIVATION_REASON_CODES.NOT_CLOSED);
  assert.equal(evaluateProductionActivation({ ...fixture.manifest, version: 2 }).reason, ACTIVATION_REASON_CODES.VERSION);
  assert.equal(evaluateProductionActivation({ ...fixture.manifest, outcome: "draft" }).reason, ACTIVATION_REASON_CODES.OUTCOME);
  assert.equal(evaluateProductionActivation({ ...fixture.manifest, generation_ref: "nope" }).reason, ACTIVATION_REASON_CODES.REF_MALFORMED);
  assert.equal(evaluateProductionActivation({ ...fixture.manifest, local: { enabled: true, full_request_ref: null } }).reason, ACTIVATION_REASON_CODES.REF_NULLABILITY);
  assert.equal(evaluateProductionActivation({ ...fixture.manifest, domain: { enabled: false, evidence_ref: "f".repeat(64), full_request_ref: null } }).reason, ACTIVATION_REASON_CODES.REF_NULLABILITY);
  assert.equal(evaluateProductionActivation({
    ...fixture.manifest,
    local: { enabled: false, full_request_ref: null },
  }).reason, ACTIVATION_REASON_CODES.NO_MODE);
  // Reason codes are stable and carry no manifest content.
  const reason = evaluateProductionActivation({ junk: fixture.manifest.generation_ref }).reason;
  assert.equal(JSON.stringify({ reason }).includes("a".repeat(64)), false);
});

await test("retention expiry predicates pin the 30-day local and one-hour domain boundaries", async () => {
  const t0 = 1_000_000_000_000;
  assert.equal(localArtifactLive(t0, t0 + LOCAL_RETENTION_MS - 1), true);
  assert.equal(localArtifactLive(t0, t0 + LOCAL_RETENTION_MS), false);
  assert.equal(domainArtifactReadable(t0, t0 + DOMAIN_RESULT_TTL_MS - 1), true);
  assert.equal(domainArtifactReadable(t0, t0 + DOMAIN_RESULT_TTL_MS), false);
  assert.throws(() => localArtifactLive(t0, Number.NaN), TypeError);
  assert.throws(() => domainArtifactReadable(-1, t0), TypeError);
});

await test("assembly identity is deterministic over sorted module paths and source hashes", async () => {
  const modules = [
    { path: "src/pipeline/strike.mjs", sha256: "b".repeat(64) },
    { path: "src/pipeline/contracts.mjs", sha256: "a".repeat(64) },
  ];
  const one = computeAssemblyIdentity(modules);
  const two = computeAssemblyIdentity([...modules].reverse());
  assert.equal(one.assembly_identity_sha256, two.assembly_identity_sha256);
  assert.deepEqual(one.modules.map(({ path }) => path), ["src/pipeline/contracts.mjs", "src/pipeline/strike.mjs"]);
  const drifted = computeAssemblyIdentity([{ ...modules[0] }, { ...modules[1], sha256: "c".repeat(64) }]);
  assert.notEqual(drifted.assembly_identity_sha256, one.assembly_identity_sha256);
  assert.throws(() => computeAssemblyIdentity([{ path: "scripts/strike.mjs", sha256: "a".repeat(64) }]), TypeError);
  assert.throws(() => computeAssemblyIdentity([{ path: "src/pipeline/a.mjs", sha256: "bad" }]), TypeError);
});

await test("assembled writer: cold domain request runs evidence, strike, gate, commit, render offline", async () => {
  const network = createNetwork();
  const fixture = pipelineFixture();
  const judged = [];
  const h = createEnvironment({
    pipeline: {
      judge: async (request) => {
        judged.push(structuredClone(request.candidate));
        return fixture.pipelineVerdict(request.candidate_ref);
      },
    },
  });

  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.response.status, 200);
  const artifact = result.body;
  assert.equal(artifact.request_scope, "domain");
  assert.equal(artifact.brief.mode, "local");
  assert.equal(artifact.brief.notice, PRE_ACTIVATION_NOTICE);
  assert.match(artifact.id, /^d-[0-9a-f]{16}$/);
  assert.equal(artifact.provenance.effective_mode, "local");
  // Adjudication ordering: the judge saw the candidate WITH the fixed notice,
  // and the committed provenance binds exactly that adjudicated value.
  assert.equal(judged.length, 1);
  assert.equal(judged[0].notice, PRE_ACTIVATION_NOTICE);
  assert.equal(artifact.provenance.candidate_ref, deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, judged[0]));
  assert.deepEqual(artifact.brief, judged[0]);
  // The receipt is authoritative in COORD.
  const receipt = h.coordStorage.map.get(`receipt:domain:${ROUND}:acmebakery.com`);
  assert.equal(receipt.status, "committed");
  assert.equal(receipt.artifact.id, artifact.id);
  // No scan, no EvidenceProvider, no legacy AI, no global w: projection, no KV writes.
  assert.equal(network.siteCalls.length, 0);
  assert.equal(h.aiCalls.length, 0);
  assert.equal(h.kvPuts.length, 0);
  assert.equal([...h.kv.keys()].some((key) => key.startsWith("w:")), false);
  // The served metric lands after successful rendering.
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
  assert.equal(h.coordStorage.map.get("metric:house_briefs_served"), 0);

  // Native HTML form: direct 200, no Location, fixed notice above the title.
  const html = await worker.fetch(nativeForm("acmebakery.com"), h.env);
  assert.equal(html.status, 200);
  assert.equal(html.headers.get("location"), null);
  assertDynamicHeaders(html);
  const htmlBody = await html.text();
  const noticeAt = htmlBody.indexOf(PRE_ACTIVATION_NOTICE);
  assert.ok(noticeAt > -1);
  assert.ok(htmlBody.indexOf("<h1") > noticeAt);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 2);
  // Domain scope mints no permalink and /s/:id refuses the artifact.
  assert.equal(htmlBody.includes(`/s/${artifact.id}`), false);
  const permalink = await worker.fetch(new Request(`https://oddspark.dev/s/${artifact.id}`, { headers: { accept: "text/html" } }), h.env);
  assert.equal(permalink.status, 404);
});

await test("assembled writer: a valid manifest as a JSON string (the production binding form) activates", async () => {
  createNetwork();
  const fixture = pipelineFixture();
  const h = createEnvironment({ pipeline: { manifest: JSON.stringify(fixture.manifest) } });
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.response.status, 200);
  assert.equal(result.body.request_scope, "domain");
  assert.equal(result.body.brief.notice, PRE_ACTIVATION_NOTICE);
});

await test("assembled writer: concurrent cold requests converge under realistic generation latency", async () => {
  const network = createNetwork();
  const fixture = pipelineFixture();
  let generations = 0;
  const h = createEnvironment({
    pipeline: {
      // Multi-second generation: the competitor's lease is live the whole
      // time, and the loser must wait it out rather than spuriously 502.
      generate: async () => {
        generations += 1;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return fixture.pipelineCandidate(generations === 1 ? "" : ` ${generations}`);
      },
    },
  });
  const [one, two] = await Promise.all([strike(h.env, "acmebakery.com"), strike(h.env, "acmebakery.com")]);
  assert.equal(one.response.status, 200);
  assert.equal(two.response.status, 200);
  assert.equal(one.body.id, two.body.id);
  assert.deepEqual(one.body, two.body);
  const receipts = [...h.coordStorage.map.keys()].filter((key) => key.startsWith("receipt:domain:"));
  assert.equal(receipts.length, 1);
  assert.equal(h.coordStorage.map.get(`receipt:domain:${ROUND}:acmebakery.com`).status, "committed");
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 2);
  assert.equal(network.siteCalls.length, 0);
});

await test("assembled writer: resubmission reads the authority without regeneration", async () => {
  createNetwork();
  let generations = 0;
  const fixture = pipelineFixture();
  const h = createEnvironment({
    pipeline: { generate: async () => { generations += 1; return fixture.pipelineCandidate(); } },
  });
  const first = await strike(h.env, "acmebakery.com");
  const second = await strike(h.env, "acmebakery.com");
  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);
  assert.equal(second.body.id, first.body.id);
  assert.equal(generations, 1);
});

await test("assembled writer: strike exhaustion commits a house Brief verbatim plus its catalog notice", async () => {
  createNetwork();
  const fixture = pipelineFixture();
  let generations = 0;
  const h = createEnvironment({
    pipeline: {
      generate: async () => { generations += 1; return fixture.pipelineCandidate(` ${generations}`); },
      judge: async (request) => fixture.pipelineVerdict(request.candidate_ref, false),
    },
  });
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.response.status, 200);
  assert.equal(generations, 3);
  const artifact = result.body;
  assert.equal(artifact.request_scope, "domain");
  assert.equal(artifact.provenance.attempt_id.startsWith("house-"), true);
  // The catalog artifact was never grounded in the locally assembled Evidence:
  // provenance binds the house/catalog authority (the approved catalog content
  // hash), not the evidence ref.
  assert.equal(artifact.provenance.evidence_ref, houseCatalogIdentity(fixture.house.catalog));
  // The catalog content is never rewritten: the served Brief is the selected
  // catalog entry verbatim plus the catalog's house notice, so house-metric
  // classification keeps working. The pre-activation notice is not smuggled
  // into catalog content.
  assert.equal(artifact.brief.notice, HOUSE_NOTICE);
  assert.notEqual(artifact.brief.notice, PRE_ACTIVATION_NOTICE);
  const entry = fixture.house.catalog.entries.find((candidate) => `house-${candidate.id}` === artifact.provenance.attempt_id);
  assert.ok(entry);
  assert.deepEqual({ ...artifact.brief, notice: undefined }, { ...entry.brief, notice: undefined });
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
  assert.equal(h.coordStorage.map.get("metric:house_briefs_served"), 1);
});

await test("assembled writer: a mid-claim writer failure finalizes the claim and counts nothing", async () => {
  createNetwork();
  const fixture = pipelineFixture();
  const h = createEnvironment({
    pipeline: { generate: async () => { throw new Error("provider exploded"); } },
  });
  // Generation faults are contained by the orchestrator; with no approved
  // house authority to fall back to, the writer fails closed mid-claim.
  h.env.PIPELINE_HOUSE = { catalog: {}, approval: {}, authorities: {} };
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.response.status, 502);
  assert.match(result.body.error, /inactive domain writer unavailable/);
  // Claim released, no partial commit, no metric.
  assert.equal(h.coordStorage.map.has(`receipt:domain:${ROUND}:acmebakery.com`), false);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
  // A later healthy request can claim and commit the same scope.
  h.env.PIPELINE_GENERATE_PROVIDER = fixture.generateProvider;
  h.env.PIPELINE_HOUSE = fixture.house;
  const recovered = await strike(h.env, "acmebakery.com");
  assert.equal(recovered.response.status, 200);
  assert.equal(recovered.body.request_scope, "domain");
});

await test("a valid manifest with a missing or unverified pipeline port fails closed — never legacy", async () => {
  const fixture = pipelineFixture();

  // Missing port: no corpus at all.
  {
    const network = createNetwork();
    addSimpleSite(network);
    const h = createEnvironment({ pipeline: {} });
    delete h.env.PIPELINE_CORPUS;
    const result = await strike(h.env, "acmebakery.com");
    assert.equal(result.response.status, 502);
    assert.match(result.body.error, /inactive domain writer unavailable/);
    assert.equal(network.siteCalls.length, 0);
    assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
  }

  // Unapproved corpus: readiness is not approved.
  {
    const network = createNetwork();
    addSimpleSite(network);
    const h = createEnvironment({ pipeline: {} });
    const drifted = structuredClone(fixture.corpus);
    drifted.approval = { schema_version: 1, status: "pending_owner_approval", owner: null, corpus_version: "voice-v1", hashes: null, semantic_identity: null, approved_at: null };
    h.env.PIPELINE_CORPUS = drifted;
    const result = await strike(h.env, "acmebakery.com");
    assert.equal(result.response.status, 502);
    assert.match(result.body.error, /inactive domain writer unavailable/);
    assert.equal(network.siteCalls.length, 0);
  }

  // Drifted priors: the approval no longer binds the content hash.
  {
    const network = createNetwork();
    addSimpleSite(network);
    const h = createEnvironment({ pipeline: {} });
    h.env.PIPELINE_PRIORS = {
      priors: fixture.priors.priors,
      approval: { ...fixture.priors.approval, content_hash: "f".repeat(64) },
    };
    const result = await strike(h.env, "acmebakery.com");
    assert.equal(result.response.status, 502);
    assert.match(result.body.error, /inactive domain writer unavailable/);
    assert.equal(network.siteCalls.length, 0);
  }
});

await test("assembled writer: a perpetually expired competitor lease hits the claim deadline and fails closed", async () => {
  createNetwork();
  const h = createEnvironment({ pipeline: {} });
  // The injected clock drives all lease/deadline math; advancing it outruns
  // the claim-wait budget in a few polls without real waiting.
  let now = Date.now();
  h.env.PIPELINE_NOW = () => (now += 11000);
  h.env.COORD.get = () => ({
    async fetch(input, init = {}) {
      const request = input instanceof Request ? input : new Request(input, init);
      const path = new URL(request.url).pathname;
      if (path === "/read") return jsonResponse({ status: "missing" });
      if (path === "/claim") {
        const body = await request.json();
        return jsonResponse({ status: "claimed", scope: body.scope, owner: "stuck-holder", lease_until: 1 });
      }
      throw new Error("unexpected coordinator operation " + path);
    },
  });
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.response.status, 502);
  assert.match(result.body.error, /inactive domain writer unavailable/);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
});

await test("a valid but out-of-phase manifest (domain enabled) fails closed — never legacy", async () => {
  const network = createNetwork();
  addSimpleSite(network);
  const h = createEnvironment({
    pipeline: {
      manifest: {
        ...pipelineFixture().manifest,
        domain: { enabled: true, evidence_ref: "f".repeat(64), full_request_ref: "0".repeat(64) },
      },
    },
  });
  // The manifest itself is valid; it just does not authorize this local-only
  // writer. The seam fails closed with the writer error and no scan.
  assert.equal(activationPosture(h.env).enabled, true);
  const result = await strike(h.env, "acmebakery.com");
  assert.equal(result.response.status, 502);
  assert.match(result.body.error, /inactive domain writer unavailable/);
  assert.equal(network.siteCalls.length, 0);
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
});

await test("worker pipeline imports resolve only to src/pipeline modules", async () => {
  // Import audit (precedent: scripts/generation.test.mjs): a regression that
  // re-imports a scripts/ shim from the Worker fails here and in `npm run check`.
  const source = await readFile(new URL("./src/worker.js", import.meta.url), "utf8");
  const imports = [...source.matchAll(/^import[\s\S]*?from\s+["']([^"']+)["'];$/gm)].map((match) => match[1]);
  assert.ok(imports.length > 0);
  for (const specifier of imports) assert.match(specifier, /^\.\/pipeline\/[a-z][a-z0-9-]*\.mjs$/, specifier);
  assert.ok(imports.includes("./pipeline/assembly.mjs"));
  assert.ok(imports.includes("./pipeline/receipts.mjs"));
  assert.ok(imports.includes("./pipeline/rendering.mjs"));
});

await test("without a valid manifest the assembled writer stays disabled and the legacy path is untouched", async () => {
  for (const [name, manifest] of Object.entries({
    absent: undefined,
    invalid: { version: 1, junk: true },
  })) {
    const network = createNetwork();
    addSimpleSite(network);
    const options = manifest === undefined ? {} : { pipeline: { manifest } };
    const h = createEnvironment(options);
    if (name === "absent") assert.equal(activationPosture(h.env).reason, ACTIVATION_REASON_CODES.MISSING);
    if (name === "invalid") {
      assert.equal(activationPosture(h.env).enabled, false);
      assert.equal(activationPosture(h.env).reason, ACTIVATION_REASON_CODES.NOT_CLOSED);
    }
    // Absent or invalid manifests leave the seam port-absent: the route keeps
    // its existing fallthrough to the quarantined legacy path, which scans.
    const result = await strike(h.env, "acmebakery.com");
    assert.equal(result.response.status, 502, name);
    assert.equal(result.body.personalization?.status, "personalized", name);
    assert.equal(network.siteCalls.length, 1, name);
  }
  const h = createEnvironment({ pipeline: {} });
  assert.equal(activationPosture(h.env).enabled, true);
  assert.equal(activationPosture(h.env).reason, null);
});

await test("an injected writer port still wins over the assembled writer", async () => {
  createNetwork();
  const h = createEnvironment({ pipeline: {} });
  let injected = 0;
  h.env.INACTIVE_DOMAIN_WRITER = {
    async write(dispatch) {
      injected += 1;
      return { status: "committed", scope: dispatch.request_scope, artifact: inactiveDomainCommitted("assembled-shadowed", "acmebakery.com") };
    },
  };
  const response = await strike(h.env, "acmebakery.com");
  assert.equal(response.response.status, 200);
  assert.equal(injected, 1);
  assert.equal(response.body.id, "assembled-shadowed");
  assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
});

globalThis.fetch = ORIGINAL_FETCH;
console.log("\n" + passed + "/" + (passed + failed) + " passed");
process.exit(failed ? 1 : 0);
