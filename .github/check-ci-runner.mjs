import { spawnSync } from "node:child_process";

export function executeCiStep(step, options = {}) {
  const spawn = options.spawn || spawnSync;
  const result = spawn(step, options.spawnOptions || {});
  if (result.error) return { exitCode: 1, message: `spawn failed for ${step}: ${result.error.message}` };
  if (result.signal) return { exitCode: 1, message: `${step} terminated by signal ${result.signal}` };
  if (result.status !== 0) return { exitCode: Number.isInteger(result.status) ? result.status : 1, message: `${step} exited nonzero` };
  return { exitCode: 0, message: "" };
}
