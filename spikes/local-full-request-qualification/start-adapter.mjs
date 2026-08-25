import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.CI || !process.stdin.isTTY || !process.stdout.isTTY) throw new Error("adapter requires an interactive non-CI session");
const authority = process.env.LOCAL_FULL_REQUEST_AUTHORITY_SHA256;
if (!/^[a-f0-9]{64}$/.test(authority ?? "")) throw new Error("exact approval authority is required before adapter start");

const configDirectory = await mkdtemp(path.join(tmpdir(), "oddspark-full-request-"));
const configPath = path.join(configDirectory, "adapter.jsonc");
const json = async (relative) => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
const qualificationContent = {
  priors: { priors: await json("../../content/local-priors/v1/priors.json"), approval: await json("../../content/local-priors/v1/approval.json") },
  house: { catalog: await json("../../content/house-briefs/v1/catalog.json"), approval: await json("../../content/house-briefs/v1/approval.json") },
  corpus: {
    rubric: await json("../../semantic/voice/v1/rubric.json"), goldens: await json("../../semantic/voice/v1/goldens.json"),
    anti_goldens: await json("../../semantic/voice/v1/anti-goldens.json"), approval: await json("../../semantic/voice/v1/approval.json"),
  },
};
const config = {
  name: "oddspark-local-full-request-qualification",
  main: fileURLToPath(new URL("./worker.mjs", import.meta.url)),
  compatibility_date: "2026-07-01",
  compatibility_flags: ["nodejs_compat"],
  ai: { binding: "AI", remote: true },
  vars: {
    AI_MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    AI_MODEL_FALLBACK: "unwired-house-fallback",
    AUTHORITY_SHA256: authority,
    QUALIFICATION_CONTENT: qualificationContent,
  },
};

try {
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  const child = spawn("npx", ["wrangler", "dev", "--config", configPath], {
    stdio: "inherit",
    env: process.env,
  });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  await rm(configDirectory, { recursive: true, force: true });
}
