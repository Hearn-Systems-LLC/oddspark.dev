import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSemanticRegressionCatalog,
  runSemanticRegression,
} from "../../scripts/semantic-regression.mjs";
import { loadCorpus } from "../../scripts/semantic-corpus.mjs";
import {
  PREDICATE_ORACLE,
  stableStringify,
} from "../judge-fidelity/contract.mjs";
import { REPORT_VERSION, canonicalBytes, sha256 } from "./qualification.mjs";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const same = (a, b) => stableStringify(a) === stableStringify(b);
function wire(record) {
  if (record?.state !== "completed") throw new Error("record is not completed");
  const value = record.response,
    keys =
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.keys(value).sort()
        : [];
  const verdict = value?.verdict,
    verdictKeys =
      verdict && typeof verdict === "object" && !Array.isArray(verdict)
        ? Object.keys(verdict).sort()
        : [];
  const expected = ["candidate_ref", "verdict"],
    checks = [
      "claims",
      ...Array.from({ length: 9 }, (_, i) => `gate_${i + 1}`),
      "pass",
      "tone",
    ].sort();
  if (
    stableStringify(keys) !== stableStringify(expected) ||
    stableStringify(verdictKeys) !== stableStringify(checks)
  )
    throw new Error("retained judge output is not one closed result");
  return {
    candidate_ref: value.candidate_ref,
    verdict: {
      pass: verdict.pass,
      gates: Array.from({ length: 9 }, (_, index) => ({
        gate: index + 1,
        ...verdict[`gate_${index + 1}`],
      })),
      tone: verdict.tone,
      claims: verdict.claims,
    },
  };
}
export async function deriveReports(plan, evidence) {
  if (
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    stableStringify(Object.keys(evidence).sort()) !==
      stableStringify([
        "approval_sha256",
        "plan_ref",
        "records",
        "run_id",
        "schema_version",
      ]) ||
    evidence?.schema_version !==
      "oddspark.semantic-qualification-evidence/v1" ||
    evidence.run_id !== plan.run_id ||
    evidence.plan_ref !== plan.plan_ref ||
    !Array.isArray(evidence.records) ||
    evidence.records.length !== 38
  )
    throw new Error("evidence is not the closed complete record set");
  const catalog = await loadSemanticRegressionCatalog(),
    corpus = await loadCorpus(path.join(ROOT, "semantic/voice/v1"));
  const reports = [];
  for (const [legIndex, leg] of ["primary", "fallback"].entries()) {
    const requests = plan.requests.filter((x) => x.leg === leg),
      records = evidence.records.slice(legIndex * 19, legIndex * 19 + 19),
      byFixture = new Map(records.map((x) => [x.fixture_id, x]));
    const configurations = ["primary", "fallback"].map((slot) => ({
      slot,
      judge: {
        role: "STRUCT-JUDGE",
        provider: plan.provider,
        resolved_model: requests[0].model,
        qualification_ref: requests[0].qualification_ref,
        status: "active",
        outcome: "GO",
      },
      judge_provider: (value) =>
        slot === leg
          ? wire(byFixture.get(value.fixture_id))
          : value.declared_result,
    }));
    const regression = await runSemanticRegression({
        catalog,
        corpus,
        configurations,
      }),
      result = regression.configurations[legIndex];
    const integrity =
      records.length === 19 &&
      records.every(
        (r, i) =>
          r &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          stableStringify(Object.keys(r).sort()) ===
            stableStringify([
              "ended_at",
              "fixture_id",
              "request_sha256",
              "response",
              "response_sha256",
              "sequence",
              "started_at",
              "state",
            ]) &&
          Number.isFinite(Date.parse(r.started_at)) &&
          new Date(r.started_at).toISOString() === r.started_at &&
          Number.isFinite(Date.parse(r.ended_at)) &&
          new Date(r.ended_at).toISOString() === r.ended_at &&
          Date.parse(r.ended_at) >= Date.parse(r.started_at) &&
          (i === 0 ||
            Date.parse(r.started_at) >= Date.parse(records[i - 1].ended_at)) &&
          r.sequence === requests[i].sequence &&
          r.fixture_id === requests[i].fixture_id &&
          r.request_sha256 === requests[i].request_sha256 &&
          r.state === "completed" &&
          r.response_sha256 === sha256(stableStringify(r.response)),
      ) &&
      result.fixtures.length === 24 &&
      result.summary.total === 24 &&
      result.summary.judge_calls === 19 &&
      result.summary.provider_calls === 19 &&
      result.summary.mismatched === 0;
    reports.push({
      schema_version: REPORT_VERSION,
      run_id: plan.run_id,
      plan_ref: plan.plan_ref,
      leg,
      model: requests[0].model,
      qualification_ref: requests[0].qualification_ref,
      started_at: records[0].started_at,
      ended_at: records.at(-1).ended_at,
      records,
      regression_sha256: sha256(canonicalBytes(result)),
      regression_report: result,
      predicate_results: PREDICATE_ORACLE.map(({ id }) => ({
        id,
        pass: integrity,
      })),
      outcome: integrity ? "pass" : "fail",
    });
  }
  return reports;
}
export function reportsEqual(left, right) {
  return same(left, right);
}
