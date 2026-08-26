// Runtime assembly (Story 1.23): the one place the canonical pipeline modules
// are wired behind explicit ports into the Story 1.16 inactive-domain writer
// port. Every provider, judge, coordinator, clock, storage, house-catalog,
// priors, and activation dependency enters through the injected environment;
// nothing here reads the filesystem, scans, or mints permalinks.
//
// Posture rule (amended 2026-08-21):
//   - manifest absent/invalid            ⇒ no port (the 1.16 seam then behaves
//                                          exactly as port-absent today);
//   - manifest valid, local-only shape,  ⇒ the assembled writer below;
//     every port verified
//   - manifest valid but any required    ⇒ a fail-closed port whose write()
//     pipeline port missing/invalid        throws the 1.16 writer error —
//                                          never a silent legacy fallthrough.
// The assembled writer itself has no legacy generator fallback.

import {
  ARTIFACT_VERSION,
  CANDIDATE_SCHEMA_VERSION,
  GROUNDING_REPORT_VERSION,
  buildCandidate,
  buildCommittedBrief,
  canonicalJson,
  deepFreeze,
  deriveCandidateRef,
  sha256Hex,
} from "./contracts.mjs";
import { canonicalScopeKey, parseReceipt, parseRequestScope } from "./receipts.mjs";
import { HOUSE_NOTICE } from "./rendering.mjs";
import { assembleLocalEvidence, deriveDetroitDate } from "./evidence.mjs";
import { resolveSeason, verifyLocalPriors } from "./priors.mjs";
import { verifyApproval as verifyHouseApproval } from "./house.mjs";
import { generateCandidate } from "./generation.mjs";
import { runCompositeGate } from "./gate.mjs";
import { validateCorpus } from "./corpus.mjs";
import { STRIKE_CODES, runStrikeOrchestrator } from "./strike.mjs";
import { ACTIVATION_TRUST_KEYS_TEST_PORT, evaluateActivationSnapshot, SNAPSHOT_REASON_CODES } from "./release-decision.mjs";

const WRITER_ERROR = "inactive domain writer unavailable";
export const DEFAULT_STRIKE_DEADLINE_BUDGET_MS = 15000;
export const MAX_STRIKE_DEADLINE_BUDGET_MS = 120000;
const MINIMUM_CALL_TIME_MS = 1000;
// One full coordinator lease horizon plus takeover margin: a competitor's live
// lease is waited out against its real lease_until (with jitter), never
// truncated by a fixed short cap.
const CLAIM_WAIT_BUDGET_MS = 30000;

const DISPATCH_KEYS = [
  "contract", "request_scope", "effective_mode", "claim_key", "notice_identity",
  "notice", "scan_allowed", "evidence_provider_allowed", "permalink_allowed",
];

const nonblank = (value) => typeof value === "string" && value.trim() !== "";

function validateDispatch(dispatch) {
  if (dispatch === null || typeof dispatch !== "object" || Array.isArray(dispatch)
      || Object.keys(dispatch).length !== DISPATCH_KEYS.length
      || !DISPATCH_KEYS.every((key) => Object.hasOwn(dispatch, key))) throw new Error(WRITER_ERROR);
  const scope = parseRequestScope(dispatch.request_scope);
  if (dispatch.contract !== "inactive-domain-dispatch/v1" || !scope || scope.kind !== "domain"
      || dispatch.effective_mode !== "local" || dispatch.claim_key !== canonicalScopeKey(scope)
      || dispatch.notice_identity !== "pre-activation" || !nonblank(dispatch.notice)
      || dispatch.scan_allowed !== false || dispatch.evidence_provider_allowed !== false
      || dispatch.permalink_allowed !== false) throw new Error(WRITER_ERROR);
  return scope;
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomOwner() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `writer-${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function activationIdentitiesMatch(manifest, identities) {
  const keys = ["deployed_source_identity", "generation_ref", "judge_ref", "house_catalog_ref", "local_full_request_ref", "domain_evidence_ref", "domain_full_request_ref", "receiver_ref", "receipt_claim_ref"];
  if (identities === null || typeof identities !== "object" || Array.isArray(identities)
      || Object.getPrototypeOf(identities) !== Object.prototype || Reflect.ownKeys(identities).length !== keys.length
      || !keys.every((key) => Object.hasOwn(identities, key))) return false;
  return manifest.deployed_source_identity === identities.deployed_source_identity
    && manifest.generation_ref === identities.generation_ref
    && manifest.judge_ref === identities.judge_ref
    && manifest.house_catalog_ref === identities.house_catalog_ref
    && manifest.local.full_request_ref === identities.local_full_request_ref
    && manifest.domain.evidence_ref === identities.domain_evidence_ref
    && manifest.domain.full_request_ref === identities.domain_full_request_ref
    && manifest.receiver_ref === identities.receiver_ref
    && manifest.receipt_claim_ref === identities.receipt_claim_ref;
}

// Assemble the inactive-domain writer port from the environment. Returns null
// only when activation is absent or invalid (port-absent posture); a valid
// manifest that is out of phase for this writer (not local-enabled/
// domain-disabled) or that meets a missing/unverified pipeline port yields a
// fail-closed port instead — never a silent legacy fallthrough.
async function evaluateRuntimeActivation(env, injectedTrustedKeys) {
  if (env !== null && typeof env === "object" && Object.hasOwn(env, "ACTIVATION_MANIFEST")) {
    return deepFreeze({ ready: false, reason: SNAPSHOT_REASON_CODES.NOT_CLOSED, manifest: null });
  }
  const trustedKeys = injectedTrustedKeys ?? env?.[ACTIVATION_TRUST_KEYS_TEST_PORT];
  return evaluateActivationSnapshot(env?.ACTIVATION_SNAPSHOT, trustedKeys === undefined ? undefined : { trustedKeys });
}

export async function createInactiveDomainWriter(env, deps) {
  const activation = await evaluateRuntimeActivation(env, deps?.activationTrustedKeys);
  if (!activation.ready) return null;

  const failClosed = deepFreeze({
    write: async () => { throw new Error(WRITER_ERROR); },
  });

  const manifest = activation.manifest;
  if (manifest.local.enabled !== true || manifest.domain.enabled !== false) return failClosed;
  if (!activationIdentitiesMatch(manifest, env?.PIPELINE_ACTIVATION_IDENTITIES)) return failClosed;

  const coordPost = deps?.coordPost;
  const strikeObserver = deps?.onStrikeResult;
  if (strikeObserver !== undefined && typeof strikeObserver !== "function") return failClosed;
  const configuredStrikeBudget = env?.PIPELINE_STRIKE_DEADLINE_BUDGET_MS;
  const strikeDeadlineBudgetMs = configuredStrikeBudget === undefined ? DEFAULT_STRIKE_DEADLINE_BUDGET_MS : configuredStrikeBudget;
  if (!Number.isSafeInteger(strikeDeadlineBudgetMs) || strikeDeadlineBudgetMs <= 0
      || strikeDeadlineBudgetMs > MAX_STRIKE_DEADLINE_BUDGET_MS) return failClosed;
  const priorsInput = env.PIPELINE_PRIORS;
  const house = env.PIPELINE_HOUSE;
  const corpus = env.PIPELINE_CORPUS;
  const judge = env.PIPELINE_JUDGE;
  const generateProvider = env.PIPELINE_GENERATE_PROVIDER;
  const judgeProvider = env.PIPELINE_JUDGE_PROVIDER;
  if (typeof coordPost !== "function" || !priorsInput || !house || !corpus || !judge
      || typeof generateProvider !== "function" || typeof judgeProvider !== "function") {
    return failClosed;
  }

  const priors = priorsInput.priors;
  const priorsApproval = priorsInput.approval;
  const clock = typeof env.PIPELINE_NOW === "function" ? env.PIPELINE_NOW : () => Date.now();

  // Approvals and corpus readiness are verified through the real verification
  // functions before the writer is enabled; unapproved or drifted content
  // fails closed.
  const nowMs = clock();
  const priorsReady = verifyLocalPriors(priors, priorsApproval, { now: new Date(nowMs) }).production_ready === true;
  const houseReady = verifyHouseApproval(house.catalog, house.approval, house.authorities, { now: new Date(nowMs) }).ready === true;
  const corpusReadiness = validateCorpus(corpus, { nowMs });
  const rubricIdentity = corpusReadiness.approved_semantic_identity;
  if (!priorsReady || !houseReady || !/^[a-f0-9]{64}$/.test(rubricIdentity ?? "")) return failClosed;

  const policyIdentity = sha256Hex(`oddspark-policy-identity/v1\n${canonicalJson({
    candidate_schema_version: CANDIDATE_SCHEMA_VERSION,
    grounding_report_version: GROUNDING_REPORT_VERSION,
    notice_identity: "pre-activation",
  })}`);

  async function readAuthority(scope) {
    const value = await coordPost("/read", { scope });
    if (value?.status === "missing") return null;
    const receipt = parseReceipt(value, scope);
    if (!receipt) throw new Error(WRITER_ERROR);
    return receipt;
  }

  async function claim(scope, owner) {
    // Lease and deadline math use the same injected clock the strike deadlines
    // use. The hard budget is checked every iteration, so even a coordinator
    // that keeps returning an already-expired competitor lease terminates in
    // the writer error instead of retrying forever.
    const startedAt = clock();
    for (;;) {
      const elapsed = clock() - startedAt;
      if (!Number.isFinite(elapsed) || elapsed > CLAIM_WAIT_BUDGET_MS) throw new Error(WRITER_ERROR);
      const result = await coordPost("/claim", { scope, owner });
      if (result?.status === "committed") {
        const receipt = parseReceipt(result, scope);
        if (!receipt) throw new Error(WRITER_ERROR);
        return { committed: receipt };
      }
      if (result?.status === "claimed" && canonicalScopeKey(result.scope) === canonicalScopeKey(scope)
          && typeof result.owner === "string" && Number.isSafeInteger(result.lease_until)) {
        if (result.owner === owner) return { claimed: true };
        const remaining = result.lease_until - clock();
        if (remaining <= 0) continue; // expired lease: retry to take it over
        // Honor the real lease horizon, polling with jitter so a competitor
        // that commits mid-lease is picked up promptly.
        await pause(Math.min(remaining, 75 + Math.floor(Math.random() * 100)));
        continue;
      }
      throw new Error(WRITER_ERROR);
    }
  }

  async function commit(scope, owner, artifact) {
    const result = await coordPost("/commit", { scope, owner, artifact });
    if (result?.status === "committed") {
      const receipt = parseReceipt(result, scope);
      if (!receipt) throw new Error(WRITER_ERROR);
      return receipt;
    }
    // Distinguish a lost race (the winner's receipt is authoritative) from a
    // transient rejection (no receipt yet) before failing.
    const receipt = await readAuthority(scope);
    if (!receipt) throw new Error(WRITER_ERROR);
    return receipt;
  }

  // The orchestrator's coordinator dependency is the real authority status
  // port, not a stub: it reports the live receipt state for the held scope.
  async function coordinatorStatus(scope) {
    const value = await coordPost("/read", { scope });
    if (value?.status === "missing") return { status: "resolved" };
    const receipt = parseReceipt(value, scope);
    if (receipt) return { status: "committed" };
    throw new Error(WRITER_ERROR);
  }

  // Deterministic priors selection; fails closed when the chosen situation has
  // no capability bundle id that exists in the catalog.
  function selectLocalPriors(claimKey) {
    const situations = priors?.situations;
    if (!Array.isArray(situations) || situations.length === 0) throw new Error(WRITER_ERROR);
    const hash = sha256Hex(`oddspark-local-selection/v1\n${claimKey}`);
    const situation = situations[Number(BigInt(`0x${hash}`) % BigInt(situations.length))];
    const bundleIds = new Set((priors.capability_bundles ?? []).map((bundle) => bundle?.id));
    const capability_bundle_id = (situation?.compatible_capability_bundle_ids ?? []).find((id) => bundleIds.has(id));
    if (!nonblank(situation?.id) || capability_bundle_id === undefined) throw new Error(WRITER_ERROR);
    return { situation_id: situation.id, capability_bundle_id };
  }

  async function write(dispatchValue) {
    const scope = validateDispatch(dispatchValue);
    const dispatch = dispatchValue;

    // Defense in depth: the writer re-evaluates the activation port on every
    // dispatch and fails closed; a lapsed manifest can never fall through to
    // any generator.
    const current = await evaluateRuntimeActivation(env, deps?.activationTrustedKeys);
    if (!current.ready || current.manifest.local.enabled !== true || current.manifest.domain.enabled !== false) {
      throw new Error(WRITER_ERROR);
    }

    // Resubmission reads the authority: a committed receipt ends the request
    // with no generation and no replacement.
    const existing = await readAuthority(scope);
    if (existing) return { status: "committed", scope, artifact: existing.artifact };

    const owner = randomOwner();
    let claimHeld = false;
    try {
      const claimOutcome = await claim(scope, owner);
      if (claimOutcome.committed) return { status: "committed", scope, artifact: claimOutcome.committed.artifact };
      claimHeld = true;

      const startedMs = clock();
      if (!Number.isFinite(startedMs)) throw new Error(WRITER_ERROR);
      const strikeTimestamp = new Date(startedMs).toISOString();
      const selection = selectLocalPriors(dispatch.claim_key);
      const assembled = assembleLocalEvidence({
        strike_timestamp: strikeTimestamp,
        situation_id: selection.situation_id,
        capability_bundle_id: selection.capability_bundle_id,
        priors,
        approval: priorsApproval,
      });
      const seasonId = resolveSeason(deriveDetroitDate(strikeTimestamp), priors).id;
      const seed = sha256Hex(`oddspark-inactive-domain-writer/v1\n${dispatch.claim_key}`);
      const roleDependencies = () => ({
        generation: { provider: generateProvider },
        gate: { judge_provider: judgeProvider, judge, rubric: corpus },
      });
      const strike = await runStrikeOrchestrator({
        evidence: assembled.evidence,
        evidence_calls: 0,
        rubric_version: corpus.rubric.corpus_version,
        seed,
        season_id: seasonId,
        selection_key: dispatch.claim_key,
        deadline_ms: startedMs + strikeDeadlineBudgetMs,
        minimum_call_time_ms: MINIMUM_CALL_TIME_MS,
      }, {
        // Adjudication ordering: the fixed pre-activation notice is bound into
        // the Candidate before Gate validation and the judge call, so the
        // candidate_ref the Gate derives — and the committed provenance — bind
        // exactly the adjudicated value. No re-basing happens afterwards.
        generate: async (input, roleDeps) => {
          const generated = await generateCandidate(input, roleDeps);
          const candidate = buildCandidate({ ...structuredClone(generated.candidate), notice: dispatch.notice });
          return deepFreeze({ candidate, candidate_ref: deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, candidate), model_calls: generated.model_calls });
        },
        gate: runCompositeGate,
        primary: roleDependencies(),
        fallback: roleDependencies(),
        house,
        coordinator: () => coordinatorStatus(scope),
        now: clock,
      });
      if (strikeObserver) {
        try {
          strikeObserver(deepFreeze({ code: strike.code, model_calls: strike.model_calls, ledger: structuredClone(strike.ledger) }));
        } catch { /* qualification observability can never change writer behavior */ }
      }
      if (strike.code !== STRIKE_CODES.ACCEPTED && strike.code !== STRIKE_CODES.HOUSE_ACCEPTED) {
        throw new Error(WRITER_ERROR);
      }

      const source = strike.source;
      let brief;
      let candidateRef;
      let attemptId;
      let provenanceEvidenceRef;
      if (source.kind === "candidate") {
        // The committed Brief is the exact adjudicated Candidate (notice and
        // all); its reference is the one Gate and the judge bound.
        brief = source.attempt_context.candidate;
        candidateRef = source.attempt_context.candidate_ref;
        attemptId = source.attempt_context.attempt_id;
        provenanceEvidenceRef = assembled.evidence_ref;
      } else {
        // House Briefs serve with the catalog notice (the UX-governed house
        // disclosure), applied at commit time — catalog content and its
        // approval identity are never rewritten, and house-metric
        // classification by that notice keeps working. The catalog artifact
        // was never grounded in the locally assembled Evidence, so the
        // provenance binds the house/catalog authority (the approved catalog
        // content hash the orchestrator selected from), not the evidence ref.
        brief = buildCandidate({ ...structuredClone(source.entry.brief), notice: HOUSE_NOTICE });
        candidateRef = deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, brief);
        attemptId = `house-${source.entry.id}`;
        provenanceEvidenceRef = source.catalog_content_hash;
      }
      const id = `d-${sha256Hex(`oddspark-domain-artifact/v1\n${dispatch.claim_key}\n${candidateRef}`).slice(0, 16)}`;
      const committed = buildCommittedBrief({
        artifact_version: ARTIFACT_VERSION,
        id,
        request_scope: "domain",
        brief,
        brief_schema_version: brief.version,
        policy_identity: policyIdentity,
        rubric_identity: rubricIdentity,
        provenance: {
          attempt_id: attemptId,
          candidate_ref: candidateRef,
          evidence_ref: provenanceEvidenceRef,
          grounding_report_version: GROUNDING_REPORT_VERSION,
          effective_mode: "local",
        },
      });

      const receipt = await commit(scope, owner, committed);
      claimHeld = false;
      // Concurrent cold requests converge on one authoritative receipt: every
      // success resolves the artifact the coordinator committed first.
      return { status: "committed", scope, artifact: receipt.artifact };
    } catch (error) {
      // Every failure path finalizes a held claim best-effort; there is never
      // a partial commit, and the route negotiates the 1.16 terminal 502.
      if (claimHeld) {
        // The commit may actually have landed despite the rejection observed:
        // re-read the authority first. A committed receipt is authoritative —
        // return it and never release over it; only release when no receipt
        // exists.
        let receipt = null;
        try { receipt = await readAuthority(scope); } catch { /* fall through to release */ }
        if (receipt) return { status: "committed", scope, artifact: receipt.artifact };
        try { await coordPost("/release", { scope, owner }); } catch { /* the lease expires */ }
      }
      throw error instanceof Error && error.message === WRITER_ERROR ? error : new Error(WRITER_ERROR);
    }
  }

  return deepFreeze({ write });
}

// Redacted activation posture for observability: the stable reason code only.
export async function activationPosture(env) {
  const evaluation = await evaluateRuntimeActivation(env);
  return deepFreeze({ enabled: evaluation.ready, reason: evaluation.reason });
}
