import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { PREDICATE_ORACLE } from "../judge-fidelity/contract.mjs";
import {
  APPROVAL_WINDOW_MS,
  approvalTemplate,
  validateApproval,
  validateLegReport,
  validatePlan,
} from "./qualification.mjs";
import {
  attestConsumedRun,
  buildCurrentPlan,
  executeAuthorized,
  writePlan,
} from "./run.mjs";
import worker from "./worker.mjs";
import { verifyBundle } from "./verify.mjs";
import { loadSemanticRegressionCatalog } from "../../scripts/semantic-regression.mjs";

const mutate = (value) => structuredClone(value);
const retainedResponse = (catalog, request) => {
  const fixture = catalog.fixtures.find((x) => x.id === request.fixture_id),
    failed = new Set(fixture.verdict.failed_checks),
    check = (name) => ({
      pass: !failed.has(name),
      reason: `retained ${request.fixture_id} ${name}`,
    }),
    verdict = { pass: false };
  for (let i = 1; i <= 9; i++) verdict[`gate_${i}`] = check(`gate-${i}`);
  verdict.tone = check("tone");
  verdict.claims = check("claims");
  const conjunction = Object.entries(verdict)
    .filter(([key]) => key !== "pass")
    .every(([, value]) => value.pass);
  verdict.pass =
    fixture.verdict.top_level_pass === "conjunction"
      ? conjunction
      : fixture.verdict.top_level_pass;
  return {
    candidate_ref:
      fixture.verdict.candidate_ref === "bound"
        ? request.candidate_ref
        : "f".repeat(64),
    verdict,
  };
};
test("plan freezes exact 24/19/38 identities, ordering, cost, and zero generation", async () => {
  const plan = await buildCurrentPlan({
    run_id: "test-plan",
    created_at: "2026-08-24T00:00:00.000Z",
  });
  assert.equal(validatePlan(plan).valid, true);
  assert.equal(plan.requests.length, 38);
  assert.deepEqual(
    plan.requests.slice(0, 19).map((x) => x.leg),
    Array(19).fill("primary"),
  );
  assert.deepEqual(
    plan.requests.slice(19).map((x) => x.leg),
    Array(19).fill("fallback"),
  );
  assert.deepEqual(
    plan.requests.slice(0, 19).map((x) => x.fixture_id),
    plan.requests.slice(19).map((x) => x.fixture_id),
  );
  assert.equal(new Set(plan.requests.map((x) => x.request_sha256)).size, 38);
  assert.equal(plan.schedule.generation_calls, 0);
  assert.equal(plan.schedule.retries, 0);
  assert.equal(plan.pricing.total_calls, 38);
  assert.ok(plan.pricing.maximum_usd > 0);
});
test("arbitrary plan mutations fail closed without throwing", async () => {
  const plan = await buildCurrentPlan({
    run_id: "mutations",
    created_at: "2026-08-24T00:00:00.000Z",
  });
  for (const change of [
    (p) => p.requests.pop(),
    (p) => (p.schedule.retries = 1),
    (p) => p.requests.reverse(),
    (p) => (p.identities.judge_legs[0].model = "other"),
    (p) => (p.pricing.maximum_usd = 0),
  ]) {
    const value = mutate(plan);
    change(value);
    assert.doesNotThrow(() => validatePlan(value));
    assert.equal(validatePlan(value).valid, false);
  }
});
test("approval has an exclusive exact one-hour window", async () => {
  const plan = await buildCurrentPlan({
    run_id: "approval",
    created_at: "2026-08-24T00:00:00.000Z",
  });
  const approval = {
    ...approvalTemplate(plan),
    approved_at: "2026-08-24T01:00:00.000Z",
    expires_at: "2026-08-24T02:00:00.000Z",
    approved_by: "Justin",
    decision: "approved",
  };
  assert.equal(
    Date.parse(approval.expires_at) - Date.parse(approval.approved_at),
    APPROVAL_WINDOW_MS,
  );
  assert.equal(
    validateApproval(approval, plan, new Date("2026-08-24T01:00:00.000Z"))
      .valid,
    true,
  );
  assert.equal(
    validateApproval(approval, plan, new Date("2026-08-24T01:59:59.999Z"))
      .valid,
    true,
  );
  assert.equal(
    validateApproval(approval, plan, new Date(approval.expires_at)).valid,
    false,
  );
});
test("missing authority is a sanitized zero-call refusal", async () => {
  const plan = await buildCurrentPlan({
    run_id: "refusal",
    created_at: "2026-08-24T00:00:00.000Z",
  });
  let calls = 0;
  const result = await executeAuthorized({
    plan,
    approval: approvalTemplate(plan),
    invoke: async () => {
      calls++;
    },
    now: new Date("2026-08-24T00:00:00.000Z"),
  });
  assert.equal(result.ok, false);
  assert.equal(result.calls_started, 0);
  assert.equal(calls, 0);
});
test("authorized execution is single-pass and retains first failure without retry", async () => {
  const plan = await buildCurrentPlan({
    run_id: "single",
    created_at: "2026-08-24T00:00:00.000Z",
  });
  const approval = {
    ...approvalTemplate(plan),
    approved_at: "2026-08-24T00:00:00.000Z",
    expires_at: "2026-08-24T01:00:00.000Z",
    approved_by: "Justin",
    decision: "approved",
  };
  let calls = 0;
  const executionNow = new Date("2026-08-24T00:30:00.000Z");
  const result = await executeAuthorized({
    plan,
    approval,
    now: executionNow,
    clock: () => executionNow,
    invoke: async () => {
      calls++;
      if (calls === 3) throw new Error("terminal");
      return { ok: true };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(calls, 3);
  assert.equal(result.calls_started, 3);
  assert.equal(result.records.at(-1).state, "failed");
});
test("plan publication is canonical and offline", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "semantic-plan-"));
  const plan = await writePlan(directory, {
    run_id: "published",
    created_at: "2026-08-24T00:00:00.000Z",
  });
  assert.deepEqual(
    JSON.parse(
      await readFile(path.join(directory, "published.plan.json"), "utf8"),
    ),
    plan,
  );
  assert.equal(
    (
      await readFile(
        path.join(directory, "published.approval-template.json"),
        "utf8",
      )
    ).at(-1),
    "\n",
  );
});
test("leg validator rejects pooling, incomplete predicates, and reordered records", async () => {
  const plan = await buildCurrentPlan({
    run_id: "legs",
    created_at: "2026-08-24T00:00:00.000Z",
  });
  const records = plan.requests.slice(0, 19).map((r) => ({
    sequence: r.sequence,
    fixture_id: r.fixture_id,
    request_sha256: r.request_sha256,
    started_at: "2026-08-24T00:00:00.000Z",
    ended_at: "2026-08-24T00:00:01.000Z",
    state: "completed",
    response: { ok: true },
    response_sha256: null,
  }));
  for (const r of records)
    r.response_sha256 = (await import("./qualification.mjs")).sha256(
      JSON.stringify(r.response),
    );
  const regression_report = {
    fixtures: Array.from({ length: 24 }, (_, index) => ({
      fixture_id: `f-${index}`,
    })),
    summary: { mismatched: 0, judge_calls: 19 },
  };
  const report = {
    schema_version: "oddspark.semantic-qualification-leg-report/v1",
    run_id: plan.run_id,
    plan_ref: plan.plan_ref,
    leg: "primary",
    model: plan.requests[0].model,
    qualification_ref: plan.requests[0].qualification_ref,
    started_at: "2026-08-24T00:00:00.000Z",
    ended_at: "2026-08-24T00:01:00.000Z",
    records,
    regression_sha256: (await import("./qualification.mjs")).sha256(
      (await import("./qualification.mjs")).canonicalBytes(regression_report),
    ),
    regression_report,
    predicate_results: PREDICATE_ORACLE.map((x) => ({ id: x.id, pass: true })),
    outcome: "pass",
  };
  assert.equal(validateLegReport(report, plan, "primary").valid, true);
  const bad = mutate(report);
  bad.records.reverse();
  assert.equal(validateLegReport(bad, plan, "primary").valid, false);
});
test("adapter is approval-bound and each sequence can spend at most once", async () => {
  let calls = 0;
  const body = {
    model: "m",
    messages: [],
    temperature: 0,
    max_tokens: 1,
    response_format: {},
  };
  const env = {
    AUTHORITY: "a".repeat(64),
    APPROVAL_EXPIRES_AT: new Date(Date.now() + 60_000).toISOString(),
    REQUEST_BINDINGS: JSON.stringify([
      {
        sequence: 36,
        request_sha256: "c".repeat(64),
        body_sha256: createHash("sha256")
          .update(JSON.stringify(body))
          .digest("hex"),
        body,
      },
      {
        sequence: 38,
        request_sha256: "b".repeat(64),
        body_sha256: createHash("sha256")
          .update(JSON.stringify(body))
          .digest("hex"),
        body,
      },
    ]),
    AI: {
      run: async () => {
        calls++;
        return { choices: [] };
      },
    },
  };
  const make = (authority, sequence = "38", value = body) =>
    new Request("http://127.0.0.1/run", {
      method: "POST",
      headers: {
        "x-oddspark-semantic-authority": authority,
        "x-oddspark-semantic-sequence": sequence,
      },
      body: JSON.stringify(value),
    });
  assert.equal((await worker.fetch(make("b".repeat(64)), env)).status, 403);
  assert.equal(
    (await worker.fetch(make(env.AUTHORITY, "038"), env)).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        make(env.AUTHORITY, "36", { ...body, model: "other" }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(calls, 0);
  assert.equal((await worker.fetch(make(env.AUTHORITY), env)).status, 200);
  assert.equal((await worker.fetch(make(env.AUTHORITY), env)).status, 403);
  assert.equal(calls, 1);
});
test("adapter atomically reserves a canonical sequence under concurrency", async () => {
  let calls = 0;
  const body = {
      model: "m",
      messages: [],
      temperature: 0,
      max_tokens: 1,
      response_format: {},
    },
    env = {
      AUTHORITY: "c".repeat(64),
      APPROVAL_EXPIRES_AT: new Date(Date.now() + 60_000).toISOString(),
      REQUEST_BINDINGS: JSON.stringify([
        {
          sequence: 37,
          request_sha256: "d".repeat(64),
          body_sha256: createHash("sha256")
            .update(JSON.stringify(body))
            .digest("hex"),
          body,
        },
      ]),
      AI: {
        run: async () => {
          calls++;
          return {};
        },
      },
    },
    make = () =>
      new Request("http://127.0.0.1/run", {
        method: "POST",
        headers: {
          "x-oddspark-semantic-authority": env.AUTHORITY,
          "x-oddspark-semantic-sequence": "37",
        },
        body: JSON.stringify(body),
      });
  const first = worker.fetch(make(), env),
    second = worker.fetch(make(), env);
  const statuses = await Promise.all([first, second]).then((values) =>
    values.map((x) => x.status).sort(),
  );
  assert.deepEqual(statuses, [200, 403]);
  assert.equal(calls, 1);
});
test("immutable plan publication refuses every destination collision", async () => {
  const directory = await mkdtemp(
      path.join(os.tmpdir(), "semantic-collision-"),
    ),
    options = { run_id: "collision", created_at: "2026-08-24T00:00:00.000Z" };
  await writePlan(directory, options);
  await assert.rejects(
    writePlan(directory, options),
    (error) => error?.code === "EEXIST",
  );
});
test("public verifier contains arbitrary malformed bundles and emits no ref", async () => {
  for (const value of [
    null,
    {},
    [],
    { plan: { run_id: "x", created_at: "bad" } },
  ]) {
    const result = await verifyBundle(value);
    assert.equal(result.valid, false);
    assert.equal(result.semantic_ref, null);
  }
});
test("38 retained outputs derive two real 24-outcome reports and a verified SEMANTIC ref", async () => {
  const now = new Date(),
    plan = await buildCurrentPlan({
      run_id: "e2e-complete",
      created_at: now.toISOString(),
    }),
    catalog = await loadSemanticRegressionCatalog();
  const approval = {
    ...approvalTemplate(plan),
    approved_at: now.toISOString(),
    expires_at: new Date(now.getTime() + APPROVAL_WINDOW_MS).toISOString(),
    approved_by: "Justin",
    decision: "approved",
  };
  const directory = await mkdtemp(path.join(os.tmpdir(), "semantic-e2e-"));
  const result = await executeAuthorized({
    plan,
    approval,
    now,
    clock: () => now,
    outputDirectory: directory,
    invoke: async (request) => retainedResponse(catalog, request),
  });
  assert.equal(result.ok, true);
  assert.equal(result.bundle.reports.length, 2);
  assert.deepEqual(
    result.bundle.reports.map((x) => x.regression_report.fixtures.length),
    [24, 24],
  );
  const verified = await verifyBundle(result.bundle);
  assert.equal(verified.valid, true);
  assert.equal(verified.semantic_ref, result.bundle.semantic_ref);
  const forged = mutate(result.bundle);
  forged.evidence.records[0].response.verdict.pass = false;
  assert.equal((await verifyBundle(forged)).valid, false);
});
test("semantic NO-GO after 38 completions retains evidence and both reports without a ref", async () => {
  const now = new Date(),
    plan = await buildCurrentPlan({
      run_id: "e2e-no-go",
      created_at: now.toISOString(),
    }),
    catalog = await loadSemanticRegressionCatalog(),
    approval = {
      ...approvalTemplate(plan),
      approved_at: now.toISOString(),
      expires_at: new Date(now.getTime() + APPROVAL_WINDOW_MS).toISOString(),
      approved_by: "Justin",
      decision: "approved",
    },
    directory = await mkdtemp(path.join(os.tmpdir(), "semantic-no-go-"));
  const result = await executeAuthorized({
    plan,
    approval,
    now,
    clock: () => now,
    outputDirectory: directory,
    invoke: async (request) => {
      const value = retainedResponse(catalog, request);
      if (request.sequence === 1) {
        value.verdict.gate_1.pass = false;
        value.verdict.pass = false;
      }
      return value;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.calls_started, 38);
  assert.equal(result.bundle, null);
  assert.equal(result.terminal.code, "semantic_not_qualified");
  assert.equal(result.terminal.semantic_ref, null);
  assert.equal(result.reports.length, 2);
  assert.equal(result.reports[0].records.length, 19);
  assert.equal(result.reports[1].records.length, 19);
  assert.equal(
    JSON.parse(
      await readFile(path.join(directory, `${plan.run_id}.evidence.json`)),
    ).records.length,
    38,
  );
  await assert.rejects(
    readFile(path.join(directory, `${plan.run_id}.manifest.json`)),
  );
  await assert.rejects(
    readFile(path.join(directory, `${plan.run_id}.bundle.json`)),
  );
});
test("consumed-run attestation is append-only and records no invented results or retry", async () => {
  const plan = await buildCurrentPlan({
      run_id: "consumed-gap",
      created_at: "2026-08-24T00:00:00.000Z",
    }),
    directory = await mkdtemp(path.join(os.tmpdir(), "semantic-attest-")),
    output = path.join(directory, "attestation.json"),
    record = await attestConsumedRun({
      plan,
      output,
      attested_by: "Justin",
      observed_http_200: 38,
    });
  assert.equal(record.raw_responses_available, false);
  assert.equal(record.semantic_ref, null);
  assert.equal(record.retry_authorized, false);
  assert.equal(Object.hasOwn(record, "reports"), false);
  await assert.rejects(
    attestConsumedRun({
      plan,
      output,
      attested_by: "Justin",
      observed_http_200: 38,
    }),
    (error) => error?.code === "EEXIST",
  );
  await assert.rejects(
    attestConsumedRun({
      plan,
      output: path.join(directory, "bad.json"),
      attested_by: "Justin",
      observed_http_200: 37,
    }),
  );
});
test("terminal publication collision leaves raw evidence crash-visible and never overwrites", async () => {
  const now = new Date(),
    plan = await buildCurrentPlan({
      run_id: "terminal-collision",
      created_at: now.toISOString(),
    }),
    catalog = await loadSemanticRegressionCatalog(),
    approval = {
      ...approvalTemplate(plan),
      approved_at: now.toISOString(),
      expires_at: new Date(now.getTime() + APPROVAL_WINDOW_MS).toISOString(),
      approved_by: "Justin",
      decision: "approved",
    },
    directory = await mkdtemp(
      path.join(os.tmpdir(), "semantic-terminal-collision-"),
    ),
    occupied = path.join(directory, `${plan.run_id}.primary.report.json`);
  await (await import("node:fs/promises")).writeFile(occupied, "occupied");
  await assert.rejects(
    executeAuthorized({
      plan,
      approval,
      now,
      clock: () => now,
      outputDirectory: directory,
      invoke: async (request) => retainedResponse(catalog, request),
    }),
    (error) => error?.code === "EEXIST",
  );
  assert.equal(
    JSON.parse(
      await readFile(path.join(directory, `${plan.run_id}.evidence.json`)),
    ).records.length,
    38,
  );
  assert.equal(await readFile(occupied, "utf8"), "occupied");
  await assert.rejects(
    readFile(path.join(directory, `${plan.run_id}.terminal.json`)),
  );
});
