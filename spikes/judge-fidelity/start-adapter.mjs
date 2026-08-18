import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const spikeDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(spikeDir, "../..");
const execFileAsync = promisify(execFile);
const digest = async (relative) => createHash("sha256").update(await readFile(path.join(root, relative))).digest("hex");
const [adapterHash, configHash, runtimeBaseline] = await Promise.all([
  digest("spikes/judge-fidelity/worker.mjs"), digest("spikes/judge-fidelity/wrangler.toml"), readFile(path.join(root, "runtime-baseline.json"), "utf8").then(JSON.parse),
]);
const wrangler = path.join(root, "node_modules/.bin/wrangler");
const { stdout: wranglerVersion } = await execFileAsync(wrangler, ["--version"], { cwd: root });
if (wranglerVersion.trim() !== runtimeBaseline.wrangler) throw new Error(`Wrangler runtime mismatch: expected ${runtimeBaseline.wrangler}, observed ${wranglerVersion.trim()}`);
const port = process.env.ODDSPARK_ADAPTER_PORT ?? "8788";
if (!/^[0-9]{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new TypeError("ODDSPARK_ADAPTER_PORT must be a valid TCP port");
const args = ["dev", "--config", "spikes/judge-fidelity/wrangler.toml", "--ip", "127.0.0.1", "--port", port,
  "--var", `ADAPTER_SOURCE_SHA256:${adapterHash}`, "--var", `CONFIG_SOURCE_SHA256:${configHash}`, "--var", `RUNTIME_SHA256:${runtimeBaseline.runtime_identity_sha256}`];
const child = spawn(wrangler, args, { cwd: root, stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { if (!child.killed) child.kill(signal); });
