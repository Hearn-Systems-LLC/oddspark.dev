import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import worker from "../src/worker.js";
import { story15AxePages } from "./brief-rendering.outer.mjs";
import { ROUND, createNetwork, createEnvironment } from "../test.mjs";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (process.env.REQUIRE_CHROME === "1") assert.ok(CHROME, "governed browser verification requires Chrome");
const MERMAID_VERSION = "11.17.0";
const AXE_VERSION = "4.13.0";
const AXE_DISTRIBUTABLE_URL = `https://cdn.jsdelivr.net/npm/axe-core@${AXE_VERSION}/axe.min.js`;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function browserHtml(source, mermaidOutcome) {
  const withoutFonts = source.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, "");
  if (mermaidOutcome === "live") return withoutFonts;
  const stub = mermaidOutcome === "success"
    ? `<script>globalThis.mermaid={runCalls:0,initialize:function(){},run:function(options){this.runCalls+=1;options.nodes.forEach(function(node){var svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("width","640");svg.setAttribute("height","180");node.replaceChildren(svg);node.setAttribute("data-processed","true");});return Promise.resolve();}};</script>`
    : mermaidOutcome === "processed-reject"
      ? `<script>globalThis.mermaid={initialize:function(){},run:function(options){options.nodes.forEach(function(node){var svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("width","640");svg.setAttribute("height","180");node.replaceChildren(svg);node.setAttribute("data-processed","true");});return Promise.reject(new Error("aggregate Mermaid failure"));}};</script>`
    : mermaidOutcome === "partial"
      ? `<script>globalThis.mermaid={initialize:function(){},run:function(options){var node=options.nodes[0];var svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("width","640");svg.setAttribute("height","180");node.replaceChildren(svg);node.setAttribute("data-processed","true");return Promise.reject(new Error("partial Mermaid failure"));}};</script>`
      : mermaidOutcome === "malformed"
        ? `<script>globalThis.mermaid={initialize:function(){},run:function(options){options.nodes.forEach(function(node){node.setAttribute("data-processed","true");});return Promise.resolve();}};</script>`
        : `<script>globalThis.mermaid={initialize:function(){},run:function(){return Promise.reject(new Error("blocked Mermaid"));}};</script>`;
  return withoutFonts
    .replace(`<script src="https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js"></script>`, stub);
}

async function waitForFile(file, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const value = await readFile(file, "utf8");
      if (/^\d+(?:\s|$)/.test(value)) return value;
    } catch {
      /* Chrome may not have created the file yet. */
    }
    await sleep(25);
  }
  throw new Error(`timed out waiting for ${file}`);
}

async function connectCdp(webSocketDebuggerUrl, options = {}) {
  const WebSocketImpl = options.WebSocketImpl || WebSocket;
  const timeout = options.timeout || 10000;
  const socket = new WebSocketImpl(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`CDP socket open timed out after ${timeout}ms`)), timeout);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", (event) => { clearTimeout(timer); reject(event.error || new Error("CDP socket failed to open")); }, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const rejectPending = (error) => {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  };
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(timer);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  socket.addEventListener("close", () => rejectPending(new Error("CDP socket closed with commands pending")));
  socket.addEventListener("error", (event) => rejectPending(event.error || new Error("CDP socket error")));
  return {
    async send(method, params = {}) {
      const id = ++nextId;
      const response = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP command ${method} timed out after ${timeout}ms`));
        }, timeout);
        pending.set(id, { resolve, reject, timer });
      });
      try {
        socket.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        rejectPending(error);
      }
      return response;
    },
    close() {
      rejectPending(new Error("CDP client closed with commands pending"));
      socket.close();
    },
  };
}

async function evaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(cdp, expression, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await sleep(25);
  }
  throw new Error(`browser condition timed out: ${expression}`);
}

async function press(cdp, key, code, windowsVirtualKeyCode) {
  const params = { key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode };
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", ...params });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await waitFor(cdp, `location.href === ${JSON.stringify(url)} && document.readyState === "complete"`, 15000);
}

async function runAxe(cdp, axeSource) {
  await evaluate(cdp, `${axeSource}\n//# sourceURL=axe-core-${AXE_VERSION}.min.js`);
  const violations = await evaluate(cdp, `axe.run(document, { resultTypes: ["violations"] }).then(({ violations }) =>
    violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length, targets: nodes.map(node => node.target.join(" ")) })))`);
  const counts = violations.reduce((result, violation) => {
    result[violation.impact || "unknown"] = (result[violation.impact || "unknown"] || 0) + 1;
    return result;
  }, { minor: 0, moderate: 0, serious: 0, critical: 0, unknown: 0 });
  return { version: AXE_VERSION, violations, counts };
}

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;

async function stopSpawnedChild(child, timeout = 2000) {
  if (!child?.pid || childExited(child)) return;
  const waitForExit = () => Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(timeout),
  ]);
  const gracefulExit = waitForExit();
  child.kill("SIGTERM");
  await gracefulExit;
  if (!childExited(child)) {
    const forcedExit = waitForExit();
    child.kill("SIGKILL");
    await forcedExit;
  }
}

async function closeServerBounded(server, timeout = 2000) {
  let settled = false;
  const closed = new Promise((resolve) => server.close(() => { settled = true; resolve(); }));
  server.closeIdleConnections?.();
  await Promise.race([closed, sleep(timeout)]);
  if (!settled) {
    server.closeAllConnections?.();
    await Promise.race([closed, sleep(timeout)]);
  }
}

async function browserSession(htmlByPath, run) {
  assert.ok(CHROME, "Chrome is required for browser evidence; set CHROME_PATH when it is installed elsewhere");
  const profile = await mkdtemp(path.join(tmpdir(), "oddspark-how-chrome-"));
  const server = createServer((request, response) => {
    const html = htmlByPath[new URL(request.url, "http://localhost").pathname];
    response.writeHead(html ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
    response.end(html || "not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-gpu",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--window-size=320,900",
    "about:blank",
  ], { stdio: "ignore" });
  const chromeSpawnError = new Promise((resolve) => chrome.once("error", (error) => resolve({ error })));
  let cdp;
  try {
    const startup = await Promise.race([
      waitForFile(path.join(profile, "DevToolsActivePort")).then((activePort) => ({ activePort })),
      chromeSpawnError,
    ]);
    if (startup.error) throw startup.error;
    const activePort = startup.activePort;
    const [port] = activePort.trim().split(/\s+/);
    const targetUrl = `http://127.0.0.1:${address.port}/success`;
    const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, { method: "PUT" }).then((response) => response.json());
    cdp = await connectCdp(target.webSocketDebuggerUrl);
    await cdp.send("Runtime.enable");
    await cdp.send("Accessibility.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(cdp, 'document.readyState === "complete"');
    await run(cdp, { origin: `http://127.0.0.1:${address.port}` });
  } finally {
    cdp?.close();
    try {
      await stopSpawnedChild(chrome);
    } finally {
      try {
        await closeServerBounded(server);
      } finally {
        await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      }
    }
  }
}

const source = await worker.fetch(new Request("https://oddspark.dev/how", { headers: { accept: "text/html" } }), {}).then((response) => response.text());
const productPages = await story15AxePages({ ROUND, createNetwork, createEnvironment });
const REQUIRED_PRODUCT_STATES = ["home-idle", "local-brief", "domain-brief", "downgrade", "house-brief", "http-400", "http-502", "permalink", "not-found", "how"];

test("CDP client bounds commands and rejects pending work on close and error", async () => {
  class FakeSocket extends EventTarget {
    static latest;
    constructor() {
      super();
      FakeSocket.latest = this;
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    send() {}
    close() { this.dispatchEvent(new Event("close")); }
  }
  const timed = await connectCdp("ws://fake", { WebSocketImpl: FakeSocket, timeout: 10 });
  await assert.rejects(timed.send("Never.responds"), /timed out after 10ms/);
  timed.close();

  const closed = await connectCdp("ws://fake", { WebSocketImpl: FakeSocket, timeout: 1000 });
  const closedCommand = closed.send("Pending.onClose");
  FakeSocket.latest.close();
  await assert.rejects(closedCommand, /socket closed with commands pending/);

  const errored = await connectCdp("ws://fake", { WebSocketImpl: FakeSocket, timeout: 1000 });
  const erroredCommand = errored.send("Pending.onError");
  const errorEvent = new Event("error");
  Object.defineProperty(errorEvent, "error", { value: new Error("synthetic socket failure") });
  FakeSocket.latest.dispatchEvent(errorEvent);
  await assert.rejects(erroredCommand, /synthetic socket failure/);
  errored.close();
});

test("browser teardown force-kills only a stuck child and bounds active server connections", async () => {
  class FakeChild extends EventTarget {
    pid = 123;
    exitCode = null;
    signalCode = null;
    signals = [];
    once(name, callback) { this.addEventListener(name, callback, { once: true }); }
    kill(signal) {
      this.signals.push(signal);
      if (signal === "SIGKILL") {
        this.signalCode = signal;
        queueMicrotask(() => this.dispatchEvent(new Event("exit")));
      }
    }
  }
  const child = new FakeChild();
  await stopSpawnedChild(child, 5);
  assert.deepEqual(child.signals, ["SIGTERM", "SIGKILL"]);

  let closeCallback;
  const server = {
    idleClosed: 0,
    allClosed: 0,
    close(callback) { closeCallback = callback; },
    closeIdleConnections() { this.idleClosed += 1; },
    closeAllConnections() { this.allClosed += 1; closeCallback(); },
  };
  await closeServerBounded(server, 5);
  assert.deepEqual({ idle: server.idleClosed, all: server.allClosed }, { idle: 1, all: 1 });
});

test("Chrome: authoritative UX-DR2.12 route/state fixtures load in the controlled browser matrix", { skip: !CHROME }, async () => {
  assert.deepEqual(Object.keys(productPages).sort(), [...REQUIRED_PRODUCT_STATES].sort());
  const pages = Object.fromEntries(Object.entries(productPages).map(([name, html]) => [`/${name}`, name === "how" ? browserHtml(html, "failure") : browserHtml(html, "failure")]));
  pages["/success"] = pages["/home-idle"];
  await browserSession(pages, async (cdp, { origin }) => {
    for (const name of Object.keys(productPages)) {
      await navigate(cdp, `${origin}/${name}`);
      assert.ok(await evaluate(cdp, 'document.body && document.body.textContent.trim().length > 0'), name);
      assert.equal(await evaluate(cdp, 'document.querySelectorAll("h1").length'), 1, name);
    }
  });
});

test("Chrome: successful Mermaid rendering preserves Option A semantics at 320px and supports real keyboard panning", { skip: !CHROME }, async () => {
  await browserSession({ "/success": browserHtml(source, "success"), "/failure": browserHtml(source, "failure") }, async (cdp) => {
    await waitFor(cdp, 'document.querySelectorAll(".diagram-scroll:not([hidden])").length === 4');
    const layout = await evaluate(cdp, `(() => {
      const scrollers = [...document.querySelectorAll(".diagram-scroll")];
      return {
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollers: scrollers.map((scroller) => ({
          hidden: scroller.hidden,
          label: scroller.getAttribute("aria-label"),
          tabindex: scroller.getAttribute("tabindex"),
          overflow: scroller.scrollWidth > scroller.clientWidth,
          figureHidden: scroller.querySelector("figure").getAttribute("aria-hidden"),
          svgHidden: scroller.querySelector("svg").getAttribute("aria-hidden"),
        })),
      };
    })()`);
    assert.equal(layout.innerWidth, 320);
    assert.equal(layout.scrollWidth, layout.clientWidth, "diagram overflow must stay inside its scroller");
    assert.equal(layout.scrollers.length, 4);
    for (const scroller of layout.scrollers) {
      assert.equal(scroller.hidden, false);
      assert.match(scroller.label, /^Scrollable diagram: /);
      assert.equal(scroller.tabindex, "0");
      assert.equal(scroller.overflow, true);
      assert.equal(scroller.figureHidden, "true");
      assert.equal(scroller.svgHidden, "true");
    }

    for (let index = 0; index < 4; index += 1) {
      await evaluate(cdp, `(() => { const node=document.querySelectorAll(".diagram-scroll")[${index}]; node.scrollLeft=0; node.focus(); return document.activeElement===node; })()`);
      await press(cdp, "ArrowRight", "ArrowRight", 39);
      await press(cdp, "ArrowRight", "ArrowRight", 39);
      await sleep(250);
      assert.ok(await evaluate(cdp, `document.querySelectorAll(".diagram-scroll")[${index}].scrollLeft > 0`), `scroller ${index + 1} did not pan with ArrowRight`);
    }

    await evaluate(cdp, 'document.querySelector("header a").focus()');
    const tabStops = [];
    for (let index = 0; index < 6; index += 1) {
      await press(cdp, "Tab", "Tab", 9);
      tabStops.push(await evaluate(cdp, `({label:document.activeElement.getAttribute("aria-label"),href:document.activeElement.getAttribute("href")})`));
    }
    const diagramStops = tabStops.filter((stop) => stop.label?.startsWith("Scrollable diagram:"));
    assert.equal(diagramStops.length, 4);
    assert.ok(tabStops.findIndex((stop) => stop.href === "/") > tabStops.findIndex((stop) => stop.label?.includes("receipt limits")), "focus must leave the last diagram for the footer");

    const ax = await cdp.send("Accessibility.getFullAXTree");
    const namedScrollStops = ax.nodes.filter((node) => node.name?.value?.startsWith("Scrollable diagram:"));
    assert.equal(namedScrollStops.length, 4);
    assert.ok(namedScrollStops.every((node) => node.properties?.some((property) => property.name === "focusable" && property.value?.value === true)));
    assert.equal(ax.nodes.filter((node) => node.role?.value === "image" && /Evidence-to-Render|privacy boundary|six-call|receipt limits/i.test(node.name?.value || "")).length, 0);
    assert.ok(ax.nodes.filter((node) => node.role?.value === "list").length >= 4);
  });
});

test("Chrome: processed Mermaid diagrams remain exposed after aggregate rejection", { skip: !CHROME }, async () => {
  await browserSession({ "/success": browserHtml(source, "processed-reject") }, async (cdp) => {
    await waitFor(cdp, 'document.querySelectorAll(".diagram-scroll:not([hidden])").length === 4');
    const state = await evaluate(cdp, `(() => ({
      visibleScrollers: document.querySelectorAll(".diagram-scroll:not([hidden])").length,
      tabbableScrollers: document.querySelectorAll('.diagram-scroll[tabindex="0"]').length,
      hiddenFigures: document.querySelectorAll('.diagram-scroll:not([hidden]) figure[aria-hidden="true"]').length,
      hiddenSvgs: document.querySelectorAll('.diagram-scroll:not([hidden]) svg[aria-hidden="true"]').length,
      visibleFlows: [...document.querySelectorAll("ol.flow")].filter((node) => node.getClientRects().length > 0).length,
      visibleRawSources: [...document.querySelectorAll("pre.mermaid")].filter((node) => node.getClientRects().length > 0 && !node.querySelector("svg")).length,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }))()`);
    assert.deepEqual(state, {
      visibleScrollers: 4,
      tabbableScrollers: 4,
      hiddenFigures: 4,
      hiddenSvgs: 4,
      visibleFlows: 4,
      visibleRawSources: 0,
      pageOverflow: false,
    });
    const ax = await cdp.send("Accessibility.getFullAXTree");
    assert.equal(ax.nodes.filter((node) => node.name?.value?.startsWith("Scrollable diagram:")).length, 4);
    assert.equal(ax.nodes.filter((node) => node.role?.value === "image" && /Evidence-to-Render|privacy boundary|six-call|receipt limits/i.test(node.name?.value || "")).length, 0);
  });
});

test("Chrome: failed Mermaid rendering leaves only the four ordered equivalents exposed", { skip: !CHROME }, async () => {
  await browserSession({ "/success": browserHtml(source, "failure") }, async (cdp) => {
    await sleep(100);
    const state = await evaluate(cdp, `(() => ({
      visibleScrollers: [...document.querySelectorAll(".diagram-scroll")].filter((node) => !node.hidden).length,
      tabbableScrollers: [...document.querySelectorAll(".diagram-scroll")].filter((node) => node.tabIndex >= 0).length,
      visibleFlows: [...document.querySelectorAll("ol.flow")].filter((node) => node.getClientRects().length > 0).length,
      visibleRawSources: [...document.querySelectorAll("pre.mermaid")].filter((node) => node.getClientRects().length > 0).length,
    }))()`);
    assert.deepEqual(state, { visibleScrollers: 0, tabbableScrollers: 0, visibleFlows: 4, visibleRawSources: 0 });
    const ax = await cdp.send("Accessibility.getFullAXTree");
    assert.equal(ax.nodes.filter((node) => node.name?.value?.startsWith("Scrollable diagram:")).length, 0);
    assert.ok(ax.nodes.filter((node) => node.role?.value === "list").length >= 4);
  });
});

test("Chrome: partial, malformed, and repeated Mermaid initialization fail closed per scroller", { skip: !CHROME }, async () => {
  for (const [outcome, exposed] of [["partial", 1], ["malformed", 0]]) {
    await browserSession({ "/success": browserHtml(source, outcome) }, async (cdp) => {
      await waitFor(cdp, `document.querySelectorAll(".mermaid[data-processed=true]").length === ${outcome === "partial" ? 1 : 4}`);
      if (outcome === "partial") await waitFor(cdp, 'document.querySelectorAll(".diagram-scroll:not([hidden])").length === 1');
      const state = await evaluate(cdp, `(() => ({
        visibleScrollers: document.querySelectorAll(".diagram-scroll:not([hidden])").length,
        hiddenNonTabbableSiblings: document.querySelectorAll('.diagram-scroll[hidden][tabindex="-1"]').length,
        exposedVisualsInAccessibilityTree: document.querySelectorAll('.diagram-scroll:not([hidden]) figure:not([aria-hidden="true"]), .diagram-scroll:not([hidden]) svg:not([aria-hidden="true"])').length,
        visibleFlows: [...document.querySelectorAll("ol.flow")].filter((node) => node.getClientRects().length > 0).length,
        visibleRawSources: [...document.querySelectorAll("pre.mermaid")].filter((node) => node.getClientRects().length > 0 && !node.querySelector("svg")).length,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }))()`);
      assert.equal(state.visibleScrollers, exposed, outcome);
      assert.equal(state.hiddenNonTabbableSiblings, 4 - exposed, outcome);
      assert.equal(state.exposedVisualsInAccessibilityTree, 0, outcome);
      assert.equal(state.visibleFlows, 4, outcome);
      assert.equal(state.visibleRawSources, 0, outcome);
      assert.equal(state.pageOverflow, false, outcome);
    });
  }
  await browserSession({ "/success": browserHtml(source, "success") }, async (cdp) => {
    await waitFor(cdp, 'document.querySelectorAll(".diagram-scroll:not([hidden])").length === 4');
    assert.equal(await evaluate(cdp, "globalThis.mermaid.runCalls"), 1);
    const enhancement = await evaluate(cdp, `[...document.scripts].map(node => node.textContent).find(text => text.includes("mermaid.initialize"))`);
    await evaluate(cdp, `(() => {
      const scroller = document.querySelector(".diagram-scroll");
      scroller.hidden = true;
      scroller.setAttribute("tabindex", "-1");
      scroller.querySelector("svg").removeAttribute("aria-hidden");
    })()`);
    await evaluate(cdp, enhancement);
    await waitFor(cdp, 'globalThis.mermaid.runCalls === 2 && document.querySelectorAll(".diagram-scroll:not([hidden]) svg[aria-hidden=true]").length === 4');
    assert.equal(await evaluate(cdp, 'document.querySelectorAll(".diagram-scroll[tabindex=\\"0\\"]").length'), 4);
  });
});

test("Chrome live CDN: pinned Mermaid 11 renders every governed diagram", { skip: !CHROME || process.env.LIVE_MERMAID !== "1" }, async () => {
  await browserSession({ "/success": browserHtml(source, "live") }, async (cdp) => {
    await waitFor(cdp, 'document.querySelectorAll(".diagram-scroll:not([hidden]) svg[aria-hidden=true]").length === 4', 15000);
    assert.equal(await evaluate(cdp, 'document.querySelectorAll("pre.mermaid[data-processed=true]").length'), 4);
    const contrast = await evaluate(cdp, `(() => {
      const rgb = value => (value.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = value => rgb(value).map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      const ratio = (one, two) => { const values=[luminance(one), luminance(two)].sort((a,b)=>b-a); return (values[0]+.05)/(values[1]+.05); };
      const ground = "rgb(11, 13, 16)";
      const text = [...document.querySelectorAll(".diagram-scroll svg text, .diagram-scroll svg foreignObject span, .diagram-scroll svg foreignObject p")].map(node => getComputedStyle(node).fill !== "none" ? getComputedStyle(node).fill : getComputedStyle(node).color).filter(value => value && value !== "none");
      const strokes = [...document.querySelectorAll(".diagram-scroll svg path, .diagram-scroll svg rect, .diagram-scroll svg polygon")].map(node => getComputedStyle(node).stroke).filter(value => value && value !== "none");
      return { text: Math.min(...text.map(value => ratio(value, ground))), strokes: Math.min(...strokes.map(value => ratio(value, ground))), textCount:text.length, strokeCount:strokes.length };
    })()`);
    console.log(`Mermaid rendered contrast: ${JSON.stringify(contrast)}`);
    assert.ok(contrast.textCount > 0 && contrast.strokeCount > 0);
    assert.ok(contrast.text >= 4.5, `rendered Mermaid text contrast ${contrast.text}`);
    assert.ok(contrast.strokes >= 3, `rendered Mermaid stroke contrast ${contrast.strokes}`);
  });
});

test("Chrome live axe: authoritative UX-DR2.12 route/state matrix records every impact", { skip: !CHROME || process.env.LIVE_AXE !== "1" }, async () => {
  const response = await fetch(AXE_DISTRIBUTABLE_URL, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.ok, true, `could not fetch pinned axe-core ${AXE_VERSION} distributable`);
  const axeSource = await response.text();
  assert.match(axeSource, new RegExp(`axe v${AXE_VERSION.replaceAll(".", "\\.")}`));

  const states = Object.entries(productPages).filter(([name]) => name !== "how").map(([name, html]) => [name, browserHtml(html, "failure"), false]);
  states.push(["how-mermaid-blocked", browserHtml(productPages.how, "failure"), false]);
  states.push(["how-mermaid-live", browserHtml(productPages.how, "live"), true]);
  const pages = Object.fromEntries(states.map(([name, html]) => [`/${name}`, html]));
  pages["/success"] = states[0][1];
  await browserSession(pages, async (cdp, { origin }) => {
    for (const [name, , expectsDiagrams] of states) {
      await navigate(cdp, `${origin}/${name}`);
      if (expectsDiagrams) await waitFor(cdp, 'document.querySelectorAll(".diagram-scroll:not([hidden]) svg[aria-hidden=true]").length === 4', 15000);
      else await sleep(100);
      const result = await runAxe(cdp, axeSource);
      const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      console.log(`axe ${name}: version=${result.version} violations=${result.violations.length} minor=${result.counts.minor} moderate=${result.counts.moderate} serious=${result.counts.serious} critical=${result.counts.critical} unknown=${result.counts.unknown} rules=${JSON.stringify(result.violations)}`);
      if (name.startsWith("how-")) {
        assert.deepEqual(blocking, [], `${name} axe violations: ${JSON.stringify(blocking)}`);
      } else assert.deepEqual(blocking, [], `${name} axe violations: ${JSON.stringify(blocking)}`);
    }
  });
});
