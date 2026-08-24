import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  loadSemanticRegressionCatalog,
  runSemanticRegression,
} from "../../scripts/semantic-regression.mjs";
import { loadCorpus } from "../../scripts/semantic-corpus.mjs";
import {
  JUDGE_RESULT_SCHEMA,
  PREDICATE_ORACLE,
  PREDICATE_ORACLE_HASH,
  PREDICATE_ORACLE_VERSION,
  SYSTEM_PROMPT,
  stableStringify,
} from "../judge-fidelity/contract.mjs";
import {
  BUDGET_PRICING,
  PRICING_AS_OF,
  PRICING_DISCLOSURE,
  PRICING_SOURCE,
} from "../judge-fidelity/pricing.mjs";
import {
  CALL_COUNT,
  CALL_TIMEOUT_MS,
  DATA_USE_DISCLOSURE,
  PLAN_VERSION,
  PROVIDER,
  approvalTemplate,
  buildManifest,
  canonicalBytes,
  derivePlanRef,
  deriveSemanticRef,
  sha256,
  validateApproval,
  validatePlan,
} from "./qualification.mjs";
import { deriveReports } from "./evidence.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const JUDGE_RESULT =
  "spikes/judge-fidelity/results/2026-08-23-a0ed5363-01e3976da21ab40e-620e2f14-8f42-47a2-8f83-854c41f017e6-qualification.json";
const GENERATION_RESULT =
  "spikes/generation-qualification/results/story-1-11-2026-08-22-l9-406d10ea-8629-4a24-ab8f-8873b0332e96.qualification.json";
const SOURCE_PATHS = [
  "scripts/semantic-regression.mjs",
  "semantic/regression/v1/catalog.json",
  "semantic/voice/v1/rubric.json",
  "semantic/voice/v1/goldens.json",
  "semantic/voice/v1/anti-goldens.json",
  "semantic/voice/v1/approval.json",
  JUDGE_RESULT,
  GENERATION_RESULT,
  "spikes/semantic-qualification/evidence.mjs",
  "spikes/semantic-qualification/qualification.mjs",
  "spikes/semantic-qualification/run.mjs",
  "spikes/semantic-qualification/start-adapter.mjs",
  "spikes/semantic-qualification/verify.mjs",
  "spikes/semantic-qualification/worker.mjs",
  "spikes/semantic-qualification/wrangler.toml",
];
const execFileAsync = promisify(execFile);
const clone = (value) => JSON.parse(JSON.stringify(value));
const hashFiles = async (paths) => {
  const entries = [];
  for (const name of paths) {
    const bytes = await readFile(path.join(ROOT, name));
    entries.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return { entries, sha256: sha256(stableStringify(entries)) };
};
async function runtimeHash() {
  const { stdout } = await execFileAsync(process.execPath, ["--version"]);
  return sha256(
    stableStringify({
      node: stdout.trim(),
      platform: process.platform,
      arch: process.arch,
    }),
  );
}

export async function buildCurrentPlan({
  run_id = `semantic-${randomUUID()}`,
  created_at = new Date().toISOString(),
} = {}) {
  const [catalog, corpus, judge, generation, sources] = await Promise.all([
    loadSemanticRegressionCatalog(),
    loadCorpus(path.join(ROOT, "semantic/voice/v1")),
    readFile(path.join(ROOT, JUDGE_RESULT), "utf8").then(JSON.parse),
    readFile(path.join(ROOT, GENERATION_RESULT), "utf8").then(JSON.parse),
    hashFiles(SOURCE_PATHS),
  ]);
  const captures = { primary: [], fallback: [] };
  const legs = [
    judge.role_qualification_set.primary,
    judge.role_qualification_set.fallback,
  ];
  await runSemanticRegression({
    catalog,
    corpus,
    configurations: legs.map((identity, index) => ({
      slot: ["primary", "fallback"][index],
      judge: {
        role: "STRUCT-JUDGE",
        provider: PROVIDER,
        resolved_model: identity.resolved_model,
        qualification_ref: identity.qualification_ref,
        status: "active",
        outcome: "GO",
      },
      judge_provider: (value) => {
        captures[["primary", "fallback"][index]].push({
          fixture_id: value.fixture_id,
          request: clone(value.request),
        });
        return value.declared_result;
      },
    })),
  });
  const requests = [];
  let sequence = 0;
  for (const [index, leg] of ["primary", "fallback"].entries())
    for (const item of captures[leg]) {
      sequence++;
      const identity = legs[index];
      const body = {
        model: identity.resolved_model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: stableStringify(item.request) },
        ],
        temperature: 0,
        max_tokens: 2048,
        response_format: {
          type: "json_schema",
          json_schema: JUDGE_RESULT_SCHEMA,
        },
      };
      const binding = {
        sequence,
        leg,
        fixture_id: item.fixture_id,
        model: identity.resolved_model,
        qualification_ref: identity.qualification_ref,
        candidate_ref: item.request.candidate_ref,
        body,
      };
      requests.push({
        ...binding,
        request_sha256: sha256(stableStringify(binding)),
      });
    }
  const requestIdentity = requests.map(
    ({
      sequence,
      leg,
      fixture_id,
      model,
      qualification_ref,
      candidate_ref,
      request_sha256,
    }) => ({
      sequence,
      leg,
      fixture_id,
      model,
      qualification_ref,
      candidate_ref,
      request_sha256,
    }),
  );
  const byModel = Object.fromEntries(
    legs.map((identity) => {
      const pricing = BUDGET_PRICING[identity.resolved_model];
      const legRequests = requests.filter(
        (r) => r.model === identity.resolved_model,
      );
      const largest_request_bytes = Math.max(
        ...legRequests.map((r) => Buffer.byteLength(stableStringify(r.body))),
      );
      if (largest_request_bytes > 128 * 1024)
        throw new Error("request exceeds the frozen adapter byte ceiling");
      // A tokenizer cannot emit more ordinary tokens than input bytes. Add a
      // deliberately large 4096-token allowance for provider chat framing.
      const input_tokens_upper_bound = largest_request_bytes + 4096;
      const input_usd =
        (legRequests.length *
          input_tokens_upper_bound *
          pricing.input_per_million_usd) /
        1e6;
      const output_usd =
        (legRequests.length * 2048 * pricing.output_per_million_usd) / 1e6;
      return [
        identity.resolved_model,
        {
          calls: legRequests.length,
          largest_request_bytes,
          framing_token_allowance: 4096,
          input_tokens_upper_bound,
          max_output_tokens_per_call: 2048,
          input_usd,
          output_usd,
          basis: pricing.basis,
        },
      ];
    }),
  );
  const maximum_usd = Object.values(byModel).reduce(
    (n, x) => n + x.input_usd + x.output_usd,
    0,
  );
  const plan = {
    schema_version: PLAN_VERSION,
    plan_ref: "",
    run_id,
    created_at,
    provider: PROVIDER,
    identities: {
      corpus_version: catalog.corpus.corpus_version,
      semantic_identity: catalog.corpus.semantic_identity,
      catalog_identity: catalog.catalog_identity,
      generation_model:
        generation.role_qualification_set.ordered_members[0].resolved_model,
      generation_config_ref: generation.qualification_refs.primary,
      generation_role_ref:
        "5cf5a547b29d31304af686c610da9c4c5959299faf12d434db28493de92404b1",
      judge_role_ref:
        "4c70414b247316618f0a219eeecf1aa408d029af931abc45c15a65fda15b5d6a",
      judge_legs: legs.map((x, i) => ({
        leg: ["primary", "fallback"][i],
        model: x.resolved_model,
        qualification_ref: x.qualification_ref,
      })),
      runtime_sha256: await runtimeHash(),
      source_sha256: sources.sha256,
      request_set_sha256: sha256(stableStringify(requestIdentity)),
    },
    schedule: {
      order: ["primary", "fallback"],
      execution: "sequential",
      timeout_ms: CALL_TIMEOUT_MS,
      retries: 0,
      replacements: 0,
      substitutions: 0,
      generation_calls: 0,
      judge_calls_per_leg: 19,
      total_calls: CALL_COUNT,
    },
    requests,
    thresholds: clone(corpus.rubric.thresholds),
    oracle: {
      version: PREDICATE_ORACLE_VERSION,
      hash: PREDICATE_ORACLE_HASH,
      predicates: clone(PREDICATE_ORACLE),
    },
    pricing: {
      as_of: PRICING_AS_OF,
      source: PRICING_SOURCE,
      disclosure: PRICING_DISCLOSURE,
      by_model: byModel,
      total_calls: CALL_COUNT,
      maximum_usd,
    },
    retention: { immutable: true, incomplete_runs_retained: true },
    data_use: DATA_USE_DISCLOSURE,
  };
  plan.plan_ref = derivePlanRef(plan);
  const valid = validatePlan(plan);
  if (!valid.valid) throw new Error(valid.errors.join("; "));
  return plan;
}
export async function atomicWrite(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
  try {
    await link(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
export async function writePlan(directory, options = {}) {
  const plan = await buildCurrentPlan(options);
  await atomicWrite(
    path.join(directory, `${plan.run_id}.plan.json`),
    canonicalBytes(plan),
  );
  await atomicWrite(
    path.join(directory, `${plan.run_id}.approval-template.json`),
    canonicalBytes(approvalTemplate(plan)),
  );
  return plan;
}
async function invokeBounded(invoke, request) {
  const controller = new AbortController();
  let timer;
  const operation = Promise.resolve().then(() =>
    invoke(request, { signal: controller.signal }),
  );
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ timeout: true }), CALL_TIMEOUT_MS);
    timer.unref?.();
  });
  const winner = await Promise.race([
    operation.then(
      (value) => ({ value }),
      () => ({ failed: true }),
    ),
    timeout,
  ]);
  clearTimeout(timer);
  if (winner.timeout) {
    controller.abort();
    await operation.catch(() => {});
    return { state: "timed_out", response: null };
  }
  return winner.failed
    ? { state: "failed", response: null }
    : { state: "completed", response: winner.value };
}
export async function publishTerminal(directory, plan, approval, records) {
  const evidence = {
    schema_version: "oddspark.semantic-qualification-evidence/v1",
    run_id: plan.run_id,
    plan_ref: plan.plan_ref,
    approval_sha256: sha256(canonicalBytes(approval)),
    records,
  };
  const reports = await deriveReports(plan, evidence);
  const qualified = reports.every((x) => x.outcome === "pass");
  const manifest = qualified
      ? buildManifest({ plan, reports, evidence })
      : null,
    semantic_ref = qualified ? deriveSemanticRef(manifest) : null,
    bundle = qualified
      ? {
          schema_version: "oddspark.semantic-qualification-bundle/v1",
          plan,
          approval,
          evidence,
          reports,
          manifest,
          semantic_ref,
        }
      : null;
  const terminal = {
    schema_version: "oddspark.semantic-qualification-terminal/v1",
    run_id: plan.run_id,
    plan_ref: plan.plan_ref,
    outcome: qualified ? "GO" : "NO-GO",
    code: qualified ? "semantic_qualified" : "semantic_not_qualified",
    calls_started: records.length,
    evidence_sha256: sha256(canonicalBytes(evidence)),
    report_sha256: reports.map((report) => sha256(canonicalBytes(report))),
    semantic_ref,
  };
  const members = [
    [`${plan.run_id}.evidence.json`, evidence],
    [`${plan.run_id}.primary.report.json`, reports[0]],
    [`${plan.run_id}.fallback.report.json`, reports[1]],
    [`${plan.run_id}.terminal.json`, terminal],
  ];
  if (qualified)
    members.push(
      [`${plan.run_id}.manifest.json`, manifest],
      [`${plan.run_id}.bundle.json`, bundle],
    );
  for (const [name, value] of members)
    await atomicWrite(path.join(directory, name), canonicalBytes(value));
  const marker = {
    schema_version: "oddspark.semantic-qualification-complete/v1",
    run_id: plan.run_id,
    files: members.map(([name, value]) => ({
      name,
      sha256: sha256(canonicalBytes(value)),
      bytes: canonicalBytes(value).length,
    })),
  };
  await atomicWrite(
    path.join(directory, `${plan.run_id}.complete.json`),
    canonicalBytes(marker),
  );
  return { qualified, bundle, terminal, reports, evidence };
}
export async function executeAuthorized({
  plan,
  approval,
  invoke,
  receiptPath,
  outputDirectory,
  now = new Date(),
  clock = () => new Date(),
}) {
  const validation = validateApproval(approval, plan, now);
  if (!validation.valid) {
    const refusal = {
      schema_version: "oddspark.semantic-qualification-refusal/v1",
      plan_ref: plan?.plan_ref ?? null,
      at: now.toISOString(),
      calls_started: 0,
      codes: ["authority_invalid"],
    };
    if (receiptPath) await atomicWrite(receiptPath, canonicalBytes(refusal));
    return { ok: false, calls_started: 0, refusal };
  }
  if (process.env.CI)
    throw new Error("live semantic qualification is forbidden in CI");
  if (receiptPath)
    await atomicWrite(
      receiptPath,
      canonicalBytes({
        schema_version: "oddspark.semantic-qualification-spend/v1",
        run_id: plan.run_id,
        plan_ref: plan.plan_ref,
        state: "reserved",
        calls_started: 0,
      }),
    );
  const records = [];
  for (const request of plan.requests) {
    if (!validateApproval(approval, plan, clock()).valid) {
      const incomplete = {
        schema_version: "oddspark.semantic-qualification-incomplete/v1",
        plan_ref: plan.plan_ref,
        run_id: plan.run_id,
        state: "consumed_incomplete",
        calls_started: records.length,
        records,
        code: "approval_expired",
      };
      if (outputDirectory)
        await atomicWrite(
          path.join(outputDirectory, `${plan.run_id}.incomplete.json`),
          canonicalBytes(incomplete),
        );
      return { ok: false, calls_started: records.length, records };
    }
    const started_at = new Date().toISOString(),
      result = await invokeBounded(invoke, request),
      record = {
        sequence: request.sequence,
        fixture_id: request.fixture_id,
        request_sha256: request.request_sha256,
        started_at,
        ended_at: new Date().toISOString(),
        state: result.state,
        response: result.response,
        response_sha256:
          result.state === "completed"
            ? sha256(stableStringify(result.response))
            : null,
      };
    records.push(record);
    if (result.state !== "completed") {
      const incomplete = {
        schema_version: "oddspark.semantic-qualification-incomplete/v1",
        plan_ref: plan.plan_ref,
        run_id: plan.run_id,
        state: "consumed_incomplete",
        calls_started: records.length,
        records,
        code: result.state,
      };
      if (outputDirectory)
        await atomicWrite(
          path.join(outputDirectory, `${plan.run_id}.incomplete.json`),
          canonicalBytes(incomplete),
        );
      return { ok: false, calls_started: records.length, records };
    }
  }
  const publication = outputDirectory
    ? await publishTerminal(outputDirectory, plan, approval, records)
    : null;
  return {
    ok: publication ? publication.qualified : true,
    calls_started: 38,
    records,
    bundle: publication?.bundle ?? null,
    terminal: publication?.terminal ?? null,
    reports: publication?.reports ?? null,
  };
}

export async function attestConsumedRun({
  plan,
  output,
  attested_by,
  observed_http_200,
}) {
  if (!validatePlan(plan).valid) throw new Error("attestation plan is invalid");
  if (
    observed_http_200 !== 38 ||
    typeof attested_by !== "string" ||
    !attested_by.trim()
  )
    throw new Error(
      "attestation requires an identified observer and exactly 38 observed HTTP 200 completions",
    );
  const record = {
    schema_version: "oddspark.semantic-qualification-loss-attestation/v1",
    run_id: plan.run_id,
    plan_ref: plan.plan_ref,
    request_set_sha256: plan.identities.request_set_sha256,
    attested_at: new Date().toISOString(),
    attested_by,
    observed_authorized_http_200_completions: 38,
    terminal_code: "semantic_not_qualified",
    raw_responses_available: false,
    evidence_gap:
      "raw responses unavailable because terminal publication preceded retention",
    semantic_ref: null,
    retry_authorized: false,
  };
  await atomicWrite(path.resolve(output), canonicalBytes(record));
  return record;
}

async function main(argv = process.argv.slice(2)) {
  if (argv[0] === "plan") {
    const dir = path.resolve(argv[1] ?? "spikes/semantic-qualification/plans");
    const plan = await writePlan(dir);
    console.log(
      `PLAN ${plan.plan_ref} ${plan.pricing.maximum_usd.toFixed(8)} USD; approval required before 38 calls`,
    );
    return 0;
  }
  if (argv[0] === "live") {
    if (process.env.CI || !process.stdin.isTTY || !process.stdout.isTTY)
      throw new Error(
        "live qualification requires an interactive terminal outside CI",
      );
    const [
      planFile,
      approvalFile,
      launchFile,
      receiptFile,
      outputDirectory,
      endpoint = "http://127.0.0.1:8787/run",
    ] = argv.slice(1);
    if (
      ![planFile, approvalFile, launchFile, receiptFile, outputDirectory].every(
        Boolean,
      )
    )
      throw new Error(
        "Usage: node spikes/semantic-qualification/run.mjs live <plan.json> <approved.json> <launch-receipt.json> <new-spend-receipt.json> <new-output-directory> [loopback-endpoint]",
      );
    const url = new URL(endpoint);
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/run"
    )
      throw new Error("live endpoint must be the loopback /run route");
    const [plan, approval, launch] = await Promise.all(
      [planFile, approvalFile, launchFile].map(async (file) =>
        JSON.parse(await readFile(path.resolve(file), "utf8")),
      ),
    );
    if (
      launch.run_id !== plan.run_id ||
      launch.plan_ref !== plan.plan_ref ||
      launch.request_set_sha256 !== plan.identities.request_set_sha256 ||
      typeof launch.authority !== "string"
    )
      throw new Error("launch receipt does not bind the exact plan");
    const result = await executeAuthorized({
      plan,
      approval,
      receiptPath: path.resolve(receiptFile),
      outputDirectory: path.resolve(outputDirectory),
      invoke: async (request, { signal }) => {
        const response = await fetch(url, {
          method: "POST",
          signal,
          headers: {
            "content-type": "application/json",
            "x-oddspark-semantic-authority": launch.authority,
            "x-oddspark-semantic-sequence": String(request.sequence),
          },
          body: JSON.stringify(request.body),
        });
        const value = await response.json();
        if (!response.ok || value?.ok !== true)
          throw new Error("adapter call failed");
        if (
          !value.provider_envelope ||
          typeof value.provider_envelope !== "object"
        )
          throw new Error("adapter omitted the provider envelope");
        return value.provider_envelope;
      },
    });
    console.log(
      result.ok
        ? `SEMANTIC ${result.bundle.semantic_ref}`
        : result.terminal
          ? `NO-GO ${result.terminal.code} ${result.calls_started}/38; no SEMANTIC ref`
          : `INCOMPLETE ${result.calls_started}/38`,
    );
    return result.ok ? 0 : 1;
  }
  if (argv[0] === "attest-consumed") {
    if (process.env.CI || !process.stdin.isTTY || !process.stdout.isTTY)
      throw new Error(
        "consumed-run attestation requires an interactive terminal outside CI",
      );
    const [planFile, output, attestedBy, count] = argv.slice(1);
    if (!planFile || !output)
      throw new Error(
        "Usage: node spikes/semantic-qualification/run.mjs attest-consumed <plan.json> <new-attestation.json> <attested-by> 38",
      );
    const plan = JSON.parse(await readFile(path.resolve(planFile), "utf8"));
    const record = await attestConsumedRun({
      plan,
      output,
      attested_by: attestedBy,
      observed_http_200: Number(count),
    });
    console.log(
      `ATTESTED ${record.run_id} ${record.terminal_code}; no retry authority`,
    );
    return 0;
  }
  throw new Error(
    "Usage: node spikes/semantic-qualification/run.mjs plan [directory]",
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main()
    .then((x) => (process.exitCode = x))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
