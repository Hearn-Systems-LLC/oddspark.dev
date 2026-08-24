import { createHash, randomBytes } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  canonicalBytes,
  validateApproval,
  validatePlan,
} from "./qualification.mjs";
if (process.env.CI)
  throw new Error("provider-capable adapter is forbidden in CI");
const [planArg, approvalArg, stateArg] = process.argv.slice(2);
if (!planArg || !approvalArg || !stateArg)
  throw new Error(
    "Usage: node spikes/semantic-qualification/start-adapter.mjs <plan.json> <approved.json> <new-state-receipt.json>",
  );
const planBytes = await readFile(path.resolve(planArg)),
  approvalBytes = await readFile(path.resolve(approvalArg));
const plan = JSON.parse(planBytes),
  approval = JSON.parse(approvalBytes);
if (!validatePlan(plan).valid)
  throw new Error("plan is not the exact valid frozen plan");
if (!validateApproval(approval, plan, new Date()).valid)
  throw new Error(
    "approval does not freshly and exactly authorize the frozen plan",
  );
const statePath = path.resolve(stateArg),
  expectedState = path.join(
    path.dirname(path.resolve(planArg)),
    `${plan.run_id}.launch.json`,
  );
if (statePath !== expectedState)
  throw new Error(
    "launch receipt must use the canonical run-bound plan sibling path",
  );
const handle = await open(statePath, "wx", 0o600),
  authority = randomBytes(32).toString("hex");
try {
  await handle.writeFile(
    canonicalBytes({
      schema_version: "oddspark.semantic-adapter-launch/v1",
      run_id: plan.run_id,
      plan_ref: plan.plan_ref,
      approval_sha256: createHash("sha256").update(approvalBytes).digest("hex"),
      request_set_sha256: plan.identities.request_set_sha256,
      authority,
      launched_at: new Date().toISOString(),
      expires_at: approval.expires_at,
      state: "launched-unconsumed",
    }),
  );
  await handle.sync();
} finally {
  await handle.close();
}
const bindings = JSON.stringify(
  plan.requests.map(({ sequence, request_sha256, body }) => ({
    sequence,
    request_sha256,
    body_sha256: createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex"),
    body,
  })),
);
const child = spawn(
  path.resolve("node_modules/.bin/wrangler"),
  [
    "dev",
    "--config",
    "spikes/semantic-qualification/wrangler.toml",
    "--var",
    `AUTHORITY:${authority}`,
    "--var",
    `APPROVAL_EXPIRES_AT:${approval.expires_at}`,
    "--var",
    `REQUEST_BINDINGS:${bindings}`,
  ],
  { stdio: "inherit", env: { ...process.env } },
);
child.on("exit", (code) => (process.exitCode = code ?? 1));
