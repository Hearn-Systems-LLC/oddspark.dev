import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APPROVAL_MAX_AGE_MS, createPlan, validateApproval } from "./qualification.mjs";
import { findPriorOperationalRecovery } from "./recovery-finder.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(dir, "../..");
const digest = async (file, read = readFile) => createHash("sha256").update(await read(path.join(root, file))).digest("hex");

export async function startAdapter(planFile, approvalFile, dependencies = {}) {
  if (!planFile || !approvalFile) throw new Error("Usage: start-adapter.mjs <exact-plan.json> <exact-approval.json>");
  const read = dependencies.readFile ?? readFile; const now = dependencies.now ?? Date.now(); const spawnChild = dependencies.spawn ?? spawn;
  const plan = JSON.parse(await read(planFile, "utf8")); const approval = JSON.parse(await read(approvalFile, "utf8")); const rebuilt = await createPlan({ approval_run_id: plan.approval_run_id, created_at: plan.created_at, input: plan.input, authority: plan.authority }); if (rebuilt.plan_ref !== plan.plan_ref || JSON.stringify(rebuilt) !== JSON.stringify(plan)) throw new Error("adapter refuses drifted plan bytes"); const approvalCheck = validateApproval(approval, plan, now); if (!approvalCheck.valid) throw new Error(`adapter refuses approval: ${approvalCheck.errors.join("; ")}`);
  const recovery = await (dependencies.findRecovery ?? findPriorOperationalRecovery)(path.join(root, "spikes/generation-qualification/results")); if (recovery.allowance_consumed || (recovery.plan_ref && recovery.plan_ref !== plan.plan_ref)) throw new Error("adapter refuses consumed or cross-plan cycle authority");
  const baseline = JSON.parse(await read(path.join(root, "runtime-baseline.json"), "utf8")); const port = dependencies.port ?? process.env.ODDSPARK_GENERATION_ADAPTER_PORT ?? "8789"; if (!/^[0-9]{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new TypeError("ODDSPARK_GENERATION_ADAPTER_PORT is invalid");
  const [worker, config] = await Promise.all([digest("spikes/generation-qualification/worker.mjs", read), digest("spikes/generation-qualification/wrangler.toml", read)]);
  const authority = createHash("sha256").update(JSON.stringify(approval)).digest("hex"); const child = spawnChild(path.join(root, "node_modules/.bin/wrangler"), ["dev", "--config", "spikes/generation-qualification/wrangler.toml", "--ip", "127.0.0.1", "--port", port, "--var", `WORKER_SHA256:${worker}`, "--var", `CONFIG_SHA256:${config}`, "--var", `RUNTIME_SHA256:${baseline.runtime_identity_sha256}`, "--var", `AUTHORITY_SHA256:${authority}`], { cwd: root, stdio: "inherit" });
  const expiresIn = Date.parse(approval.approved_at) + APPROVAL_MAX_AGE_MS - now; if (expiresIn <= 0) { child.kill("SIGTERM"); throw new Error("adapter approval expired before spawn completed"); } const schedule = dependencies.setTimeout ?? setTimeout; const expiry = schedule(() => child.kill("SIGTERM"), expiresIn); expiry?.unref?.();
  if (dependencies.attachProcessHandlers !== false) { child.on("error", (error) => { console.error(error.message); process.exitCode = 1; }); child.on("exit", (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exitCode = code ?? 1; }); for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal)); }
  return { child, expiresIn };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await startAdapter(process.argv[2], process.argv[3]);
