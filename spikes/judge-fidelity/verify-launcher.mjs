import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EVIDENCE_SOURCE_PATHS, currentRuntimeIdentity, currentSourceIdentity, expectedAdapterHealth } from "./evidence-v2.mjs";
import { stableStringify } from "./contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = process.env.ODDSPARK_ADAPTER_CHECK_PORT ?? "9877";
if (!/^[0-9]{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new TypeError("ODDSPARK_ADAPTER_CHECK_PORT must be a valid TCP port");
const endpoint = `http://127.0.0.1:${port}/health`;
const [sources, runtime] = await Promise.all([currentSourceIdentity(EVIDENCE_SOURCE_PATHS), currentRuntimeIdentity()]);
const expected = expectedAdapterHealth(sources, runtime);
const child = spawn(process.execPath, ["spikes/judge-fidelity/start-adapter.mjs"], {
  cwd: root,
  env: { ...process.env, ODDSPARK_ADAPTER_PORT: port },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

try {
  const deadline = Date.now() + 30_000;
  let observed;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`adapter launcher exited ${child.exitCode}: ${output}`);
    try {
      const response = await fetch(endpoint, { redirect: "error" });
      if (response.ok) { observed = await response.json(); break; }
    } catch { /* launcher is not ready yet */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (stableStringify(observed) !== stableStringify(expected)) throw new Error(`served adapter identity mismatch at ${endpoint}`);
  console.log(`PASS served adapter identity at ${endpoint}; zero inference calls`);
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}
