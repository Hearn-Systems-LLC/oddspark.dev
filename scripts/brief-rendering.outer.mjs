import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import worker from "../src/worker.js";
import { buildCommittedBrief, CANDIDATE_SCHEMA_VERSION, deriveCandidateRef } from "./brief-contracts.mjs";
import { committedBriefPresentation, CONTACT_URL, RETENTION_COPY } from "./brief-rendering.mjs";
import { classifyCompatibleArtifact, LEGACY_ARTIFACT_KINDS } from "../src/pipeline/receipts.mjs";
import { legacySparkPresentation } from "../src/pipeline/legacy-rendering.mjs";

const HASH = "a".repeat(64);
function fixture({ id, mode = "local", requestScope = mode, notice, hostile = false, empty = false }) {
  const x = hostile ? '<script id="owned">& " \' attack</script>' : "ordinary text";
  const brief = { version: 1, mode, title: `Title ${x}`, plan: `Plan ${x}`,
    why_fits: { text: `Fit ${x}`, ...(mode === "domain" ? { breadcrumb: `Crumb ${x}` } : {}) }, what_gets_better: `Better ${x}`,
    before_after: { before: `Before ${x}`, after: `After ${x}` }, change_level: { time_range: `Short ${x}`, steps_changed: 1, steps_removed: 0, preliminary: true },
    stays_same: empty ? { tools: [], authority: [], steps: [] } : { tools: [`Tool ${x}`], authority: [`Authority ${x}`], steps: [`Step ${x}`] },
    invitation: `Bring this Spark ${x} and map a clear first step.`, grounded_numbers: [], ...(notice ? { notice } : {}) };
  return buildCommittedBrief({ artifact_version: 1, id, request_scope: requestScope, brief, brief_schema_version: 1, policy_identity: HASH, rubric_identity: HASH,
    provenance: { attempt_id: `attempt-${id}`, candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief), evidence_ref: HASH, grounding_report_version: 1, effective_mode: mode } });
}

async function seed(h, scope, artifact) {
  const stub = h.env.COORD.get(h.env.COORD.idFromName("global"));
  const post = (path, body) => stub.fetch("https://coord" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post("/claim", { scope, owner: "story-owner" })).status, 200);
  assert.equal((await post("/commit", { scope, owner: "story-owner", artifact })).status, 200);
}

const native = (website, headers = {}) => new Request("https://oddspark.dev/api/spark", { method: "POST", redirect: "manual", headers: { accept: "text/html", "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "203.0.113.88", ...headers }, body: new URLSearchParams({ website }).toString() });

export function story15Cases(harness) {
  const { ROUND, createNetwork, createEnvironment, sparkRequest, strike } = harness;
  return {
    async localNative() {
      createNetwork(); const h = createEnvironment(); const value = fixture({ id: "committed-local" }); await seed(h, { kind: "local", round: ROUND }, value);
      const redirect = await worker.fetch(native(""), h.env); assert.equal(redirect.status, 303); assert.equal(redirect.headers.get("location"), "/s/committed-local"); assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
      const followed = await worker.fetch(new Request("https://oddspark.dev/s/committed-local", { headers: { accept: "text/html" } }), h.env); assert.equal(followed.status, 200); assert.match(await followed.text(), /Title ordinary text/); assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
    },
    async domainMatrix() {
      for (const [domain, mode, id] of [["domain.test.com", "domain", "committed-domain"], ["down.test.com", "local", "committed-down"]]) {
        createNetwork(); const h = createEnvironment(); await seed(h, { kind: "domain", round: ROUND, domain }, fixture({ id, mode, requestScope: "domain" }));
        const response = await worker.fetch(native(domain), h.env); const html = await response.text(); assert.equal(response.status, 200); assert.match(html, /<span id="foot-links"><\/span>/); assert.doesNotMatch(html, new RegExp(`/s/${id}`)); assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
      }
      for (const [domain, includeVisitor] of [["page-fail-no-visitor.test.com", false], ["page-fail-visitor.test.com", true]]) {
        createNetwork(); const h = createEnvironment(); await seed(h, { kind: "domain", round: ROUND, domain }, fixture({ id: "page-fail-" + (includeVisitor ? "visitor" : "anonymous"), mode: "domain", requestScope: "domain" }));
        const headers = { accept: "text/html", "content-type": "application/x-www-form-urlencoded", ...(includeVisitor ? { "cf-connecting-ip": "203.0.113.88" } : {}) };
        const request = new Request("https://oddspark.dev/api/spark", { method: "POST", headers, body: new URLSearchParams({ website: domain }) });
        const original = JSON.stringify; JSON.stringify = (value, ...args) => { if (value?.projection) throw new Error("synthetic page failure"); return original(value, ...args); };
        try { assert.equal((await worker.fetch(request, h.env)).status, 502); } finally { JSON.stringify = original; }
        assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
      }
    },
    async explicitJson() {
      createNetwork(); const h = createEnvironment(); const value = fixture({ id: "committed-json" }); await seed(h, { kind: "local", round: ROUND }, value);
      const response = await worker.fetch(new Request("https://oddspark.dev/api/spark", { method: "POST", headers: { accept: "application/json" } }), h.env); assert.equal(response.status, 200); assert.deepEqual(await response.json(), value); assert.equal(h.coordStorage.map.get("metric:briefs_served"), 1);
    },
    async house() {
      createNetwork(); const h = createEnvironment(); const notice = "This plan is one of ours, not built for you."; await seed(h, { kind: "local", round: ROUND }, fixture({ id: "committed-house", notice }));
      for (const [path, accept] of [["/api/spark/committed-house", "application/json"], ["/s/committed-house", "text/html"], ["/s/committed-house", "text/plain"]]) { const response = await worker.fetch(new Request("https://oddspark.dev" + path, { headers: { accept } }), h.env); assert.equal(response.status, 200); const body = await response.text(); assert.match(body, new RegExp(notice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); if (accept !== "application/json") { assert.match(body, new RegExp(RETENTION_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); assert.match(body, new RegExp(CONTACT_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); } if (accept === "text/html") { assert.match(body, /<aside class="notice" role="note"><span class="sr-only">Note:<\/span> This plan is one of ours, not built for you\.<\/aside>/); assert.match(body, /<a href="https:\/\/hearn\.systems\/contact">/); } if (accept === "text/plain") assert.match(body, /^Note: This plan is one of ours, not built for you\./); }
      assert.equal(h.coordStorage.map.get("metric:briefs_served"), 3); assert.equal(h.coordStorage.map.get("metric:house_briefs_served"), 3);
    },
    async rejection() {
      // Story 1.24: legacy artifacts serve losslessly (200) and count once as
      // normal; malformed or unsupported versions still fail closed with zero
      // metric.
      createNetwork(); const h = createEnvironment(); const legacy = (await strike(h.env, undefined)).body;
      const { cached, ...storedLegacy } = legacy;
      const looked = await worker.fetch(new Request("https://oddspark.dev/api/spark/" + legacy.id), h.env);
      assert.equal(looked.status, 200); assert.deepEqual(await looked.json(), storedLegacy);
      assert.equal((await worker.fetch(sparkRequest(undefined), h.env)).status, 200);
      const legacyPermalink = await worker.fetch(new Request("https://oddspark.dev/s/" + legacy.id, { headers: { accept: "text/html" } }), h.env);
      assert.equal(legacyPermalink.status, 200); assert.match(await legacyPermalink.text(), /PROVENANCE|Provenance/);
      const homeText = await worker.fetch(new Request("https://oddspark.dev/", { headers: { accept: "text/plain" } }), h.env);
      assert.equal(homeText.status, 200); assert.match(await homeText.text(), /PROVENANCE/);
      assert.equal(h.coordStorage.map.get("metric:briefs_served"), 5);
      assert.equal(h.coordStorage.map.get("metric:house_briefs_served"), 0);
      h.kv.set("malformed", JSON.stringify({ artifact_version: 1, id: "malformed" })); assert.equal((await worker.fetch(new Request("https://oddspark.dev/api/spark/malformed"), h.env)).status, 404); assert.equal(h.coordStorage.map.get("metric:briefs_served"), 5);
    },
    async renderFailure() {
      createNetwork(); const h = createEnvironment(); await seed(h, { kind: "local", round: ROUND }, fixture({ id: "render-failure" })); const original = globalThis.structuredClone; globalThis.structuredClone = () => { throw new Error("synthetic renderer failure"); };
      try { assert.equal((await worker.fetch(new Request("https://oddspark.dev/api/spark/render-failure"), h.env)).status, 502); } finally { globalThis.structuredClone = original; } assert.equal(h.coordStorage.map.get("metric:briefs_served"), undefined);
      for (const id of ["contract/valid", "x".repeat(129)]) { createNetwork(); const invalid = createEnvironment(); await seed(invalid, { kind: "local", round: ROUND }, fixture({ id })); assert.equal((await worker.fetch(sparkRequest(undefined), invalid.env)).status, 502); assert.equal(invalid.coordStorage.map.get("metric:briefs_served"), undefined); }
    },
    async hostile() {
      createNetwork(); const h = createEnvironment(); const value = fixture({ id: "committed-hostile", mode: "domain", requestScope: "domain", notice: "Notice <script> &", hostile: true }); await seed(h, { kind: "domain", round: ROUND, domain: "hostile.test.com" }, value);
      assert.equal((await (await worker.fetch(new Request("https://oddspark.dev/api/spark/committed-hostile"), h.env)).json()).brief.title, value.brief.title);
      const html = await (await worker.fetch(native("hostile.test.com"), h.env)).text(); assert.doesNotMatch(html, /<script id="owned">/); assert.match(html, /&lt;script id=&quot;owned&quot;&gt;/);
      const payload = await (await worker.fetch(sparkRequest("hostile.test.com", { headers: { accept: "application/json", "x-oddspark-presentation": "1" } }), h.env)).json(); assert.doesNotMatch(payload.markup, /<script id="owned">/); assert.equal(payload.projection.title, value.brief.title); assert.equal(payload.provenance, undefined);
      assert.equal((payload.markup.match(/&lt;script id=&quot;owned&quot;&gt;/g) || []).length, 12); assert.match(payload.markup, /<h1 id="headline"[^>]*>Title &lt;script/); assert.match(payload.markup, /breadcrumb[^>]*>Crumb &lt;script/); assert.match(payload.markup, /retention/);
    },
    async enhanced() {
      const source = await readFile(new URL("../src/worker.js", import.meta.url), "utf8");
      // The slice starts at the injected shared legacy-kind set so the client
      // under test reads exactly what the server renders into the page.
      const executable = (source.slice(source.indexOf("  var LEGACY_KINDS = "), source.indexOf("  function solarColor")) + source.slice(source.indexOf("  document.querySelector(\"form.strike-row\").onsubmit"), source.indexOf("  if (BOOT)")))
        .replace("${JSON.stringify([...LEGACY_ARTIFACT_KINDS])}", JSON.stringify([...LEGACY_ARTIFACT_KINDS]));
      let mark;
      class Node { constructor(tag = "div") { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.focused = 0; this.hidden = false; this.textContent = ""; this.innerHTML = ""; this.value = ""; } replaceChildren(...x) { this.children = x; } append(...x) { this.children.push(...x); } setAttribute(k, v) { this.attributes[k] = String(v); } getAttribute(k) { return this.attributes[k] ?? null; } hasAttribute(k) { return k in this.attributes; } removeAttribute(k) { delete this.attributes[k]; } focus() { this.focused++; } replaceWith(x) { mark = x; } }
      const nodes = Object.fromEntries(["foot-links", "status", "website-error", "idea", "prov", "headline", "legend"].map((id) => [id, new Node()])); const form = new Node("form"); const btn = new Node("button"); const website = new Node("input"); mark = new Node("h1"); mark.innerHTML = "mark"; const historyCalls = []; const queue = [];
      const location = { origin: "https://oddspark.dev", pathname: "/" };
      const history = { replaceState(_state, _title, path) { historyCalls.push(path); location.pathname = path; } };
      const context = { Promise, location, history, navigator: {}, website, btn, el: (id) => nodes[id], fetch: async () => { const next = queue.shift(); return { ok: next.ok, status: next.status, json: async () => next.payload }; }, setTimeout, clearTimeout, document: { title: "oddspark", createElement: (tag) => new Node(tag), createTextNode: (text) => ({ text }), querySelector: (selector) => selector === "form.strike-row" ? form : mark }, console };
      vm.runInNewContext(`${executable};globalThis.render=render`, context);
      const local = committedBriefPresentation(fixture({ id: "enhanced-local" }));
      context.render(local, true); const clipboardCases = [undefined, { writeText(){ throw new Error("sync"); } }, { writeText(){ return Promise.reject(new Error("async")); } }];
      for (const clipboard of clipboardCases) { context.navigator.clipboard = clipboard; context.render(local, false); const copy = nodes["foot-links"].children.find((x) => x instanceof Node && x.tagName === "BUTTON"); copy.onclick(); await new Promise((resolve) => setTimeout(resolve, 0)); assert.equal(nodes.status.textContent, "The link could not be copied. Copy it from the address bar."); assert.equal(copy.textContent, "copy link"); }
      const submit = async (next) => { queue.push(next); form.onsubmit({ preventDefault(){} }); await new Promise((resolve) => setTimeout(resolve, 0)); await new Promise((resolve) => setTimeout(resolve, 0)); };
      location.pathname = "/"; historyCalls.length = 0; website.value = ""; await submit({ ok: true, status: 200, payload: local });
      assert.equal(nodes.headline.focused > 0, true); assert.equal(btn.textContent, "Strike again"); assert.equal(nodes.idea.hasAttribute("aria-busy"), false); assert.equal(nodes.idea.hidden, false); assert.equal(historyCalls.at(-1), "/s/enhanced-local");
      await submit({ ok: false, status: 400, payload: { error: "Enter a public website domain.", field: "website" } });
      assert.equal(website.focused, 1); assert.equal(nodes["website-error"].textContent, "Enter a public website domain."); assert.equal(website.getAttribute("aria-invalid"), "true"); assert.equal(btn.textContent, "Strike"); assert.equal(nodes.idea.hidden, true); assert.equal(nodes.prov.hidden, true); assert.equal(nodes["foot-links"].children.length, 0); assert.equal(location.pathname, "/"); assert.equal(context.document.title, "oddspark");
      await submit({ ok: true, status: 200, payload: local }); website.value = "domain.test"; const beforeFailure = historyCalls.length; await submit({ ok: false, status: 502, payload: { error: "unavailable" } });
      assert.equal(nodes.status.textContent, "No spark this time — a part of the system did not answer. Press Strike again."); assert.equal(nodes.status.className, "err"); assert.equal(nodes.status.getAttribute("tabindex"), "-1"); assert.equal(nodes.status.focused, 1); assert.equal(btn.textContent, "Strike"); assert.equal(nodes.idea.hasAttribute("aria-busy"), false); assert.equal(nodes.idea.hidden, true); assert.equal(location.pathname, "/"); assert.deepEqual(historyCalls.slice(beforeFailure), ["/"]); assert.doesNotMatch(source, /history\.pushState/);

      // Story 1.24: the enhanced submit path must accept and settle a legacy
      // presentation losslessly — production parity with the rollback
      // artifact includes the JS-enabled strike.
      const legacyArtifact = {
        id: "0a1b2c3d", struck: "2026-08-20T12:00:00.000Z",
        idea: { headline: "Legacy Enhanced Headline", premise: "A legacy premise for the enhanced client.", question: "What repeats every morning?" },
        seed: { domain: "content-for-local-shops", lens: "operations", form: "a short checklist", friction: "no new tools", hash: "f".repeat(64), preimage: "randomness:31415900:2.5e-6:tag" },
        window: { round: 31415900, rounds: 100, seconds: 300 },
        entropy: { source: "drand quicknet (League of Entropy)", round: 31415900, signature: "ab".repeat(96), randomness: "c".repeat(64), verify: "https://api.drand.sh/v2/beacons/quicknet/rounds/31415900" },
        solar: { source: "NOAA SWPC GOES XRS", band: "0.1-0.8nm", satellite: 18, flux: 2.5e-6, class: "C2.5", letter: "C", time_tag: "2026-08-20T11:59:00Z", verify: "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json" },
        model: "mock-primary", generated: true,
      };
      const legacy = legacySparkPresentation(classifyCompatibleArtifact(legacyArtifact));
      website.value = ""; const beforeLegacy = historyCalls.length; await submit({ ok: true, status: 200, payload: legacy });
      assert.equal(nodes.idea.hidden, false); assert.equal(nodes.idea.innerHTML, legacy.markup);
      assert.equal(nodes.prov.hidden, true); // legacy markup carries its own provenance; the shell placeholder block stays hidden
      assert.equal(nodes.headline.focused > 0, true);
      assert.equal(btn.textContent, "Strike again"); assert.equal(nodes.idea.hasAttribute("aria-busy"), false);
      assert.equal(nodes.status.textContent, ""); assert.equal(nodes.status.className, "sr-only");
      assert.equal(historyCalls.at(-1), "/s/0a1b2c3d"); assert.equal(location.pathname, "/s/0a1b2c3d");
      assert.equal(context.document.title, "Legacy Enhanced Headline / oddspark");
      const legacyLinks = nodes["foot-links"].children.filter((x) => x instanceof Node);
      assert.deepEqual(legacyLinks.map((x) => x.tagName), ["A", "A", "BUTTON"]);
      assert.equal(legacyLinks[0].href, "/s/0a1b2c3d");
      assert.equal(legacyLinks[1].href, "/api/spark/0a1b2c3d");
      assert.equal(historyCalls.slice(beforeLegacy).length, 1);
      // The seed-geometry placeholder stays untouched for a legacy projection:
      // no stale committed geometry is rendered into the legend or canvas.
      assert.equal(nodes.legend.innerHTML, "");
      assert.equal(nodes.legend.children.length, 0);
    },
    async shell() {
      createNetwork(); const h = createEnvironment(); await seed(h, { kind: "local", round: ROUND }, fixture({ id: "committed-shell", empty: true })); const html = await (await worker.fetch(new Request("https://oddspark.dev/s/committed-shell", { headers: { accept: "text/html" } }), h.env)).text();
      assert.equal((html.match(/<h1\b/g) || []).length, 1); assert.match(html, /<main>/); assert.match(html, /<canvas id="cv" aria-hidden="true">/); assert.match(html, /awaiting a seed/); assert.match(html, /drand round[\s\S]*signature[\s\S]*randomness[\s\S]*xray flux[\s\S]*flare class[\s\S]*observed[\s\S]*seed/); assert.match(html, /@media \(min-width:920px\)/); assert.match(html, /@media \(max-width:520px\)/); assert.match(html, /prefers-reduced-motion:reduce/); assert.match(html, /Nothing in the current routine is replaced/); assert.doesNotMatch(html, /Same window, same spark/);
      assert.match(html, /<span id="live">----<\/span> &middot; SUN NOW/); assert.match(html, /grid-template-columns:minmax\(0,660px\) minmax\(322px,1fr\)/); assert.match(html, /white-space:normal/); assert.match(html, /<form class="strike-row"[\s\S]*<input[\s\S]*<button/); assert.match(html, /<span id="foot-links">[\s\S]*<span id="meter">/);
    },
  };
}
