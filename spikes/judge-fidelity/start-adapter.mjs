import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(spikeDir, "../..");
const digest = async (relative) => createHash("sha256").update(await readFile(path.join(root, relative))).digest("hex");
const [adapterHash, configHash, runtimeBaseline] = await Promise.all([
  digest("spikes/judge-fidelity/worker.mjs"), digest("spikes/judge-fidelity/wrangler.toml"), readFile(path.join(root, "runtime-baseline.json"), "utf8").then(JSON.parse),
]);
const wrangler = path.join(root, "node_modules/.bin/wrangler");
const args = ["dev", "--config", "spikes/judge-fidelity/wrangler.toml", "--ip", "127.0.0.1", "--port", "8788",
  "--var", `ADAPTER_SOURCE_SHA256:${adapterHash}`, "--var", `CONFIG_SOURCE_SHA256:${configHash}`, "--var", `RUNTIME_SHA256:${runtimeBaseline.runtime_identity_sha256}`];
const child = spawn(wrangler, args, { cwd: root, stdio: "inherit" });
child.on("exit", (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exitCode = code ?? 1; });
