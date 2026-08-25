import { createInactiveDomainWriter } from "../../src/pipeline/assembly.mjs";
import { CANDIDATE_SCHEMA_VERSION, canonicalJson, deriveCandidateRef } from "../../src/pipeline/contracts.mjs";
import { productionPipelineEnv } from "../../src/pipeline/production-ports.mjs";
import { HOUSE_NOTICE, committedBriefPresentation } from "../../src/pipeline/rendering.mjs";
import { boundedProviderCall, providerErrorDetail } from "./provider-call.mjs";
import { attemptsFrom, failureOutcome, qualificationCoordinator } from "./adapter-evidence.mjs";

const ASSEMBLY_IDENTITY = "39f24a833694d50007ea5be41602b56ed492410bb458406ac6bd817167054743";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const hex = (bytes) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const hash = async (value) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(typeof value === "string" ? value : canonicalJson(value))));
const usage = (value) => ({
  input_tokens: Number.isSafeInteger(value?.usage?.prompt_tokens) ? value.usage.prompt_tokens : value?.usage?.input_tokens,
  output_tokens: Number.isSafeInteger(value?.usage?.completion_tokens) ? value.usage.completion_tokens : value?.usage?.output_tokens,
});

function activation(plan) {
  return {
    version: 2, deployed_source_identity: ASSEMBLY_IDENTITY, generation_ref: plan.authorities.generation_ref,
    judge_ref: plan.authorities.judge_ref, local: { enabled: true, full_request_ref: "0".repeat(64) },
    domain: { enabled: false, evidence_ref: null, full_request_ref: null }, house_catalog_ref: plan.authorities.house_catalog_ref,
    receiver_ref: null, receipt_claim_ref: null, outcome: "active",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url); const authority = request.headers.get("x-qualification-authority");
    if (url.hostname !== "127.0.0.1" || authority !== env.AUTHORITY_SHA256) return json({ error: "forbidden" }, 403);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, assembly_identity: ASSEMBLY_IDENTITY, inference_calls: 0 });
    if (request.method !== "POST" || url.pathname !== "/run") return json({ error: "forbidden" }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "invalid_request", inference_calls: 0 }, 400); }
    const plan = body?.plan;
    if (!plan || plan.authorities?.assembly_identity !== ASSEMBLY_IDENTITY || body.approval?.run_id !== plan.run_id) return json({ error: "authority_mismatch", inference_calls: 0 }, 403);
    const startedMs = Date.now(); const calls = [];
    const instrumentedAI = {
      async run(model, providerRequest) {
        if (calls.length >= plan.limits.call_cap) throw new Error("provider_call_cap_exhausted");
        const callStarted = Date.now(); const required = providerRequest?.response_format?.json_schema?.required ?? [];
        const stage = required.includes("gates") ? "judge" : "generation";
        let candidateRef = null;
        if (stage === "judge") { try { candidateRef = JSON.parse(providerRequest.messages.at(-1).content).candidate_ref; } catch { /* retained null */ } }
        const record = { stage, calls: 1, candidate_ref: candidateRef, started_at: new Date(callStarted).toISOString(), timeout_ms: plan.limits.provider_timeout_ms, request_sha256: await hash(providerRequest) };
        try {
          const response = await boundedProviderCall(() => env.AI.run(model, providerRequest), plan.limits.provider_timeout_ms, env.QUALIFICATION_TIMERS); const finished = Date.now(); const retainedUsage = usage(response);
          if (stage === "generation") {
            try { record.candidate_ref = deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, JSON.parse(response.choices[0].message.content)); } catch { /* downstream rejects it */ }
          }
          Object.assign(record, { finished_at: new Date(finished).toISOString(), latency_ms: finished - callStarted, response_sha256: await hash(response), usage: retainedUsage, success: true });
          calls.push(record); return response;
        } catch (error) {
          const finished = Date.now(); const provider_error = providerErrorDetail(error);
          Object.assign(record, { finished_at: new Date(finished).toISOString(), latency_ms: finished - callStarted, response_sha256: await hash({ error: "provider_failure", provider_error }), provider_error, usage: { input_tokens: 0, output_tokens: 0 }, success: false });
          calls.push(record); throw error;
        }
      },
    };
    const pipeline = productionPipelineEnv({ ...env, AI: instrumentedAI }, env.QUALIFICATION_CONTENT);
    if (!pipeline) return json({ error: "pipeline_unavailable", inference_calls: 0 }, 503);
    const clock = () => Date.now(); const coord = qualificationCoordinator(clock, hash); const manifest = activation(plan); let strike = null;
    const writer = createInactiveDomainWriter({
      ...env, ...pipeline, ACTIVATION_MANIFEST: manifest, PIPELINE_NOW: clock,
      PIPELINE_STRIKE_DEADLINE_BUDGET_MS: plan.limits.route_ceiling_ms - plan.limits.commit_reserve_ms,
    }, { coordPost: (route, value) => coord.post(route, value), onStrikeResult: (value) => { strike = structuredClone(value); } });
    if (!writer) return json({ error: "writer_unavailable", inference_calls: 0 }, 503);
    try {
      const committed = await writer.write(plan.request.dispatch); const presentation = committedBriefPresentation(committed.artifact); const finishedMs = Date.now();
      const price = plan.pricing; for (const call of calls) call.cost_usd = call.usage.input_tokens * price.input_usd_per_token + call.usage.output_tokens * price.output_usd_per_token;
      const attempts = attemptsFrom(calls, strike);
      const source = committed.artifact.brief.notice === HOUSE_NOTICE ? "house" : "candidate";
      if (source === "candidate" && attempts.length) attempts.at(-1).terminal = "accepted";
      const receipt = coord.receipt(); const renderBytes = canonicalJson(presentation);
      const evidence = {
        schema_version: "oddspark.local-full-request-evidence/v1", plan_sha256: null, approval_sha256: null, authorities: null,
        run: { id: plan.run_id, started_at: new Date(startedMs).toISOString(), finished_at: new Date(finishedMs).toISOString(), elapsed_ms: finishedMs - startedMs, calls_started: calls.length, cost_usd: calls.reduce((sum, call) => sum + call.cost_usd, 0), remaining_before_commit_ms: Math.max(0, plan.limits.route_ceiling_ms - (finishedMs - startedMs)), commit_reserve_observed: finishedMs - startedMs <= plan.limits.route_ceiling_ms - plan.limits.commit_reserve_ms, terminal: true },
        attempts, strike, outcome: { source, code: source === "house" ? "house_accepted" : "accepted" },
        commit: { confirmed: Boolean(receipt), coordinator_status: receipt ? "committed" : "uncertain", receipt_sha256: receipt ? await hash(receipt) : null, artifact_sha256: await hash(committed.artifact) },
        render: { completed: true, sha256: await hash(renderBytes), bytes: new TextEncoder().encode(renderBytes).length },
        content_hashes: { priors: await hash(env.QUALIFICATION_CONTENT.priors), priors_approval_identity: env.QUALIFICATION_CONTENT.priors.approval.identity, house: await hash(env.QUALIFICATION_CONTENT.house), corpus: await hash(env.QUALIFICATION_CONTENT.corpus), activation_manifest: await hash(manifest), coordinator_events: await hash(coord.events) },
        predicate_results: [], full_request_ref: null,
      };
      return json({ evidence });
    } catch (error) {
      const finishedMs = Date.now(); const price = plan.pricing;
      for (const call of calls) call.cost_usd = call.usage.input_tokens * price.input_usd_per_token + call.usage.output_tokens * price.output_usd_per_token;
      const attempts = attemptsFrom(calls, strike);
      const elapsedMs = finishedMs - startedMs;
      const evidence = {
        schema_version: "oddspark.local-full-request-evidence/v1", plan_sha256: null, approval_sha256: null, authorities: null,
        run: { id: plan.run_id, started_at: new Date(startedMs).toISOString(), finished_at: new Date(finishedMs).toISOString(), elapsed_ms: elapsedMs, calls_started: calls.length, cost_usd: calls.reduce((sum, call) => sum + call.cost_usd, 0), remaining_before_commit_ms: Math.max(0, plan.limits.route_ceiling_ms - elapsedMs), commit_reserve_observed: elapsedMs <= plan.limits.route_ceiling_ms - plan.limits.commit_reserve_ms, terminal: true },
        attempts, strike, outcome: failureOutcome(strike, error),
        commit: { confirmed: false, coordinator_status: "uncertain", receipt_sha256: null, artifact_sha256: null },
        render: { completed: false, sha256: null, bytes: 0 },
        content_hashes: { priors: await hash(env.QUALIFICATION_CONTENT.priors), priors_approval_identity: env.QUALIFICATION_CONTENT.priors.approval.identity, house: await hash(env.QUALIFICATION_CONTENT.house), corpus: await hash(env.QUALIFICATION_CONTENT.corpus), activation_manifest: await hash(manifest), coordinator_events: await hash(coord.events) },
        predicate_results: [], full_request_ref: null,
      };
      return json({ evidence });
    }
  },
};
