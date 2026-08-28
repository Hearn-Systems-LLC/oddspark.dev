import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import worker from "../src/worker.js";
import { executeCiStep } from "../.github/check-ci-runner.mjs";
import {
  assertHowPage,
  HOW_PAGE_FLOWS,
  HOW_PAGE_PROHIBITED_COPY,
  validateHowPage,
  visibleHowPageProse,
} from "./how-page.fixture.mjs";

async function fetchHow() {
  return worker.fetch(new Request("https://oddspark.dev/how", { headers: { accept: "text/html" } }), {});
}

test("GET /how serves the complete honest pipeline explanation through the Worker", async () => {
  const response = await fetchHow();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assertHowPage(await response.text());
});

test("Mermaid failure leaves four complete ordered flows and no diagram in the initial accessibility or tab surface", async () => {
  const html = await (await fetchHow()).text();
  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  assert.equal((withoutScripts.match(/<ol class="flow" data-flow=/g) || []).length, 4);
  assert.equal((withoutScripts.match(/class="diagram-scroll"[^>]*tabindex="-1"[^>]* hidden>/g) || []).length, 4);
  assert.equal((withoutScripts.match(/<figure class="diagram-figure" aria-hidden="true">/g) || []).length, 4);
  for (const [flow, steps] of Object.entries(HOW_PAGE_FLOWS)) {
    assert.match(withoutScripts, new RegExp(`<ol class="flow" data-flow="${flow}">`));
    for (const [step, text] of steps) {
      assert.match(withoutScripts, new RegExp(`<li data-step="${step}">`));
      assert.ok(withoutScripts.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").includes(text));
    }
  }
});

test("natural-language legacy and premature receipt claims fail closed", async () => {
  const html = await (await fetchHow()).text();
  const mutations = [
    "Anyone can reproduce the exact Brief.",
    "The same window always returns identical output.",
    "A third party can verify the model result.",
    "Recompute it yourself from the seed.",
    "The house Brief is a model fallback.",
    "Generation still uses four random axes.",
  ];
  for (const mutation of mutations) {
    const errors = validateHowPage(html.replace("</main>", `<p>${mutation}</p></main>`).replace("</div>\n\n<script", `<p>${mutation}</p></div>\n\n<script`));
    assert.ok(errors.some((error) => error.includes("prohibited")), mutation);
  }
  assert.ok(HOW_PAGE_PROHIBITED_COPY.length >= mutations.length);
  for (const surface of [
    html.replace("<title>", "<title>Anyone can reproduce the exact Brief. "),
    html.replace('content="How oddspark', 'content="Anyone can reproduce the exact Brief. How oddspark'),
  ]) assert.ok(validateHowPage(surface).some((error) => error.includes("prohibited")));
  assert.equal(validateHowPage(html.replace("/* The ordered flows", "/* Anyone can reproduce the exact Brief. The ordered flows")).length, 0, "implementation-only script text is not public copy");
});

test("required public prose cannot be satisfied by hidden diagrams, metadata, styles, or scripts", async () => {
  const html = await (await fetchHow()).text();
  const required = "Model output is nondeterministic";
  assert.ok(visibleHowPageProse(html).includes(required));
  const hiddenOnly = html
    .replace(/Model output is\s+nondeterministic/, "Model behavior can vary")
    .replace("accTitle: The Evidence-to-Render pipeline", `accTitle: ${required}`);
  assert.ok(validateHowPage(hiddenOnly).some((error) => error === `required visible copy missing: ${required}`));
});

test("corruption of every diagram and every ordered fallback position is detected", async () => {
  const html = await (await fetchHow()).text();
  for (const flow of Object.keys(HOW_PAGE_FLOWS)) {
    const corrupted = html.replace(`data-diagram="${flow}"`, `data-diagram="corrupt-${flow}"`);
    assert.ok(validateHowPage(corrupted).some((error) => error.includes(`diagram ${flow}`)), `diagram ${flow}`);
  }
  for (const [flow, steps] of Object.entries(HOW_PAGE_FLOWS)) {
    for (const [step] of steps) {
      const corrupted = html.replace(`data-step="${step}"`, `data-step="corrupt-${step}"`);
      assert.ok(validateHowPage(corrupted).some((error) => error.includes(`fallback ${flow}`)), `${flow}/${step}`);
    }
  }
});

test("accessibility and contrast state transitions fail closed when weakened", async () => {
  const html = await (await fetchHow()).text();
  const mutations = [
    html.replace('tabindex="-1"', 'tabindex="0"'),
    html.replace(" hidden>", ">"),
    html.replace(" hidden>", ' data-hidden="true">'),
    html.replace("--border-strong:#7E8B98", "--border-strong:#3D4750"),
    html.replace('<figure class="diagram-figure" aria-hidden="true">', '<figure class="diagram-figure">'),
    html.replace('svg.setAttribute("aria-hidden", "true")', ""),
    html.replace("scroller.hidden = false", "scroller.hidden = true"),
  ];
  for (const mutation of mutations) assert.notEqual(validateHowPage(mutation).length, 0);
});

test("governed CI runner fails closed on spawn errors, signals, and nonzero exits", () => {
  const invoke = (result) => executeCiStep("test-step", { spawn: () => result });
  assert.deepEqual(invoke({ status: 0 }), { exitCode: 0, message: "" });
  assert.deepEqual(invoke({ error: new Error("missing executable") }), { exitCode: 1, message: "spawn failed for test-step: missing executable" });
  assert.deepEqual(invoke({ signal: "SIGTERM", status: null }), { exitCode: 1, message: "test-step terminated by signal SIGTERM" });
  assert.deepEqual(invoke({ status: 7 }), { exitCode: 7, message: "test-step exited nonzero" });
  assert.deepEqual(invoke({ status: null }), { exitCode: 1, message: "test-step exited nonzero" });
});

test("importing reusable Worker fixtures does not register or execute the full Worker suite", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", 'await import("./test.mjs"); console.log("fixtures imported")'], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "fixtures imported");
  assert.doesNotMatch(result.stdout, /\d+\/\d+ passed|ok\s+Wrangler declares/);
});
