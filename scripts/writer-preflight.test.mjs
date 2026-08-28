import assert from "node:assert/strict";
import test from "node:test";

import { validatePipelineJudge } from "./writer-preflight.mjs";

const env = { AI_MODEL: "preflight-model" };
const descriptor = {
  role: "STRUCT-JUDGE",
  provider: "cloudflare-workers-ai",
  resolved_model: env.AI_MODEL,
  qualification_ref: "7dc1ec98a625a1dd16f1166067b496e4209a415e7f10854ff781f46d0d0062d0",
  status: "active",
  outcome: "GO",
};

test("writer preflight accepts only the exact qualified PIPELINE_JUDGE descriptor", () => {
  assert.deepEqual(validatePipelineJudge({ PIPELINE_JUDGE: descriptor }, env), []);
  assert.notDeepEqual(validatePipelineJudge({}, env), []);
});

test("writer preflight rejects every tampered PIPELINE_JUDGE field and extra fields", () => {
  for (const [field, value] of Object.entries({
    role: "OTHER",
    provider: "other-provider",
    resolved_model: "other-model",
    qualification_ref: "f".repeat(64),
    status: "inactive",
    outcome: "NO-GO",
  })) {
    assert.notDeepEqual(validatePipelineJudge({ PIPELINE_JUDGE: { ...descriptor, [field]: value } }, env), [], field);
  }
  assert.notDeepEqual(validatePipelineJudge({ PIPELINE_JUDGE: { ...descriptor, extra: true } }, env), []);
});
