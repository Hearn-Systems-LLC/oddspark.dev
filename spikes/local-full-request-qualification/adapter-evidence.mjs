import { providerErrorDetail } from "./provider-call.mjs";

export function qualificationCoordinator(now, hash) {
  let owner = null; let receipt = null; const events = [];
  return {
    events,
    async post(route, body) {
      events.push({ route, at: new Date(now()).toISOString(), body_sha256: await hash(body) });
      if (route === "/read") return receipt ?? { status: "missing" };
      if (route === "/claim") { owner = body.owner; return { status: "claimed", scope: body.scope, owner, lease_until: now() + 30000 }; }
      if (route === "/release") { owner = null; return { status: "released" }; }
      if (route === "/commit" && owner === body.owner) {
        receipt = { status: "committed", scope: body.scope, artifact: body.artifact, artifact_kind: "committed_brief", committed_at: now() };
        return receipt;
      }
      return { status: "uncertain" };
    },
    receipt: () => receipt,
  };
}

export function attemptsFrom(calls, strike) {
  const ledger = Array.isArray(strike?.ledger) ? strike.ledger : [];
  const generations = calls.filter((call) => call.stage === "generation");
  const judges = calls.filter((call) => call.stage === "judge");
  const retainedJudges = new Set();
  return generations.map((generation, index) => {
    const sequence = index + 1;
    const events = ledger.filter((entry) => entry?.attempt === sequence);
    const completed = events.find((entry) => entry.event === "generation_completed");
    const authoritativeRef = completed?.candidate_ref ?? generation.candidate_ref;
    if (authoritativeRef && generation.candidate_ref !== authoritativeRef) {
      generation.provider_candidate_ref = generation.candidate_ref;
      generation.candidate_ref = authoritativeRef;
    }
    const needsJudge = events.some((entry) => ["candidate_accepted", "gate_rejected", "judge_rejected"].includes(entry.event));
    const available = judges.filter((call) => !retainedJudges.has(call));
    const matching = available.filter((call) => call.candidate_ref === authoritativeRef);
    const fallback = needsJudge && matching.length === 0 ? available[0] : null;
    const judge = matching[0] ?? fallback ?? null;
    if (judge) { judge.candidate_ref = authoritativeRef; retainedJudges.add(judge); }
    if (events.some((entry) => entry.event === "candidate_accepted") && available.length !== 1) throw new Error("accepted attempt must retain exactly one judge call");
    const has = (event) => events.some((entry) => entry.event === event);
    let terminal = generation.success ? "generation_completed" : "provider_failed";
    if (has("generation_rejected") && generation.success) terminal = "generation_rejected";
    if (has("judge_reservation_released")) terminal = "deterministic_rejected";
    if (has("judge_not_admitted")) terminal = "judge_not_admitted";
    if (has("candidate_duplicate")) terminal = "candidate_duplicate";
    if (has("judge_rejected") || has("gate_rejected")) terminal = judge?.success === false ? "judge_provider_failed" : "judge_rejected";
    if (has("candidate_accepted")) terminal = "accepted";
    const deterministic = has("judge_reservation_released") ? false : (judge ? true : null);
    return { sequence, candidate_ref: authoritativeRef, generation, deterministic: { pass: deterministic }, judge, external_retries: 0, terminal };
  });
}

export function failureOutcome(strike, error) {
  const accepted = strike?.code === "accepted" || strike?.code === "house_accepted";
  return {
    source: strike?.code === "accepted" ? "candidate" : strike?.code === "house_accepted" ? "house" : "none",
    code: "pipeline_failed",
    failure_stage: accepted ? "post_strike" : "strike",
    error: providerErrorDetail(error),
  };
}
