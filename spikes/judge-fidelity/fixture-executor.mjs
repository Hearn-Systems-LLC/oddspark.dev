import { readFile } from "node:fs/promises";

import { MAX_EXTRACTED_BYTES, classifyJudgeCall, deriveCandidateRef, validateVerdict } from "./contract.mjs";
import { executeFixtureCatalog } from "./evidence-v2.mjs";

export async function loadFixtureDocument() {
  return JSON.parse(await readFile(new URL("./fixtures.json", import.meta.url), "utf8"));
}

const clone = (value) => structuredClone(value);
function mutatePath(target, dotted, value, remove = false) {
  const parts = dotted.split("."); const key = parts.pop(); let cursor = target;
  for (const part of parts) cursor = cursor[part];
  if (remove) delete cursor[key]; else cursor[key] = value;
}

function verdictCase(document, fixture) {
  const value = Object.hasOwn(fixture, "literal") ? clone(fixture.literal) : clone(document.valid_verdict);
  if (fixture.reverse_gates) value.gates.reverse();
  for (const [key, replacement] of Object.entries(fixture.set ?? {})) mutatePath(value, key, replacement);
  for (const key of fixture.delete ?? []) mutatePath(value, key, undefined, true);
  if (fixture.truncate_gates !== undefined) value.gates = value.gates.slice(0, fixture.truncate_gates);
  if (fixture.append_gate) value.gates.push(fixture.append_gate);
  return validateVerdict(value).valid === fixture.valid;
}

function normalizationCall(document, fixture) {
  const verdict = clone(document.valid_verdict); const text = JSON.stringify(verdict);
  const shapes = {
    provider_error: () => ({ call_state: "provider_error", error_code: "provider_rejected" }), timeout: () => ({ call_state: "timeout" }),
    empty: () => ({ call_state: "received", envelope: { response: "  " } }), unknown_location: () => ({ call_state: "received", envelope: { output: text } }),
    response_object: () => ({ call_state: "received", envelope: { response: verdict } }), response_text: () => ({ call_state: "received", envelope: { response: text } }),
    result_text: () => ({ call_state: "received", envelope: { result: text } }), choice_text: () => ({ call_state: "received", envelope: { choices: [{ message: { content: text } }] } }),
    identical_duplicates: () => ({ call_state: "received", envelope: { response: text, result: text } }), semantic_but_not_byte_duplicates: () => ({ call_state: "received", envelope: { response: text, result: JSON.stringify(verdict, null, 2) } }),
    object_and_text_duplicates: () => ({ call_state: "received", envelope: { response: verdict, result: text } }), bom: () => ({ call_state: "received", envelope: { response: `\uFEFF${text}` } }),
    json_fence: () => ({ call_state: "received", envelope: { response: `\`\`\`json\n${text}\n\`\`\`` } }), double_encoded_json: () => ({ call_state: "received", envelope: { response: JSON.stringify(text) } }),
    surrounding_prose: () => ({ call_state: "received", envelope: { response: `Start ${text} End` } }), surrounding_prose_with_string_braces: () => { verdict.gates[0].reason = "Uses {braces} and an escaped quote: \"okay\"."; return { call_state: "received", envelope: { response: `Start ${JSON.stringify(verdict)} End` } }; },
    truncated: () => ({ call_state: "received", envelope: { response: text.slice(0, -1) } }), two_objects: () => ({ call_state: "received", envelope: { response: `${text}\n${text}` } }),
    trailing_comma: () => ({ call_state: "received", envelope: { response: text.replace(/}$/, ",}") } }), single_quotes: () => ({ call_state: "received", envelope: { response: "{'pass':true}" } }),
    unquoted_keys: () => ({ call_state: "received", envelope: { response: "{pass:true}" } }), comments: () => ({ call_state: "received", envelope: { response: text.replace("{", "{/* no */") } }),
    unlabeled_fence: () => ({ call_state: "received", envelope: { response: `\`\`\`\n${text}\n\`\`\`` } }), multiple_fences: () => ({ call_state: "received", envelope: { response: `\`\`\`json\n${text}\n\`\`\`\n\`\`\`json\n${text}\n\`\`\`` } }),
    array: () => ({ call_state: "received", envelope: { response: "[]" } }), primitive: () => ({ call_state: "received", envelope: { response: "true" } }),
    schema_invalid: () => { verdict.pass = "true"; return { call_state: "received", envelope: { response: JSON.stringify(verdict) } }; },
    bom_plus_fence: () => ({ call_state: "received", envelope: { response: `\uFEFF\`\`\`json\n${text}\n\`\`\`` } }), fence_plus_prose: () => ({ call_state: "received", envelope: { response: `Start \`\`\`json\n${text}\n\`\`\` End` } }),
    double_double_encoded: () => ({ call_state: "received", envelope: { response: JSON.stringify(JSON.stringify(text)) } }),
    exact_size: () => ({ call_state: "received", envelope: { response: `${"x".repeat(MAX_EXTRACTED_BYTES - Buffer.byteLength(text) - 2)} ${text} ` } }),
    over_size: () => ({ call_state: "received", envelope: { response: "x".repeat(MAX_EXTRACTED_BYTES + 1) } }),
    conflict_with_oversize: () => ({ call_state: "received", envelope: { response: "x".repeat(MAX_EXTRACTED_BYTES + 1), result: text } }),
    identical_oversize: () => { const value = "x".repeat(MAX_EXTRACTED_BYTES + 1); return { call_state: "received", envelope: { response: value, result: value } }; },
  };
  const factory = shapes[fixture.shape]; if (!factory) throw new Error(`unknown normalization shape ${fixture.shape}`);
  return factory();
}

async function v2Call(document, fixture) {
  const ref = await deriveCandidateRef("oddspark-candidate/v1", document.synthetic_input.candidate);
  const result = { candidate_ref: ref, verdict: clone(document.valid_verdict) };
  let call;
  switch (fixture.shape) {
    case "bound_direct": call = { call_state: "received", envelope: { response: result } }; break;
    case "bound_text": call = { call_state: "received", envelope: { response: JSON.stringify(result) } }; break;
    case "bound_fence": call = { call_state: "received", envelope: { response: `\`\`\`json\n${JSON.stringify(result)}\n\`\`\`` } }; break;
    case "binding_missing": delete result.candidate_ref; call = { call_state: "received", envelope: { response: result } }; break;
    case "binding_extra": result.other_ref = ref; call = { call_state: "received", envelope: { response: result } }; break;
    case "binding_non_string": result.candidate_ref = 1; call = { call_state: "received", envelope: { response: result } }; break;
    case "binding_mismatch": result.candidate_ref = "0".repeat(64); call = { call_state: "received", envelope: { response: result } }; break;
    case "outer_extra": result.extra = true; call = { call_state: "received", envelope: { response: result } }; break;
    case "verdict_extra": result.verdict.extra = true; call = { call_state: "received", envelope: { response: result } }; break;
    case "verdict_blank_reason": result.verdict.gates[0].reason = " "; call = { call_state: "received", envelope: { response: result } }; break;
    case "verdict_duplicate_gate": result.verdict.gates[0].gate = 2; call = { call_state: "received", envelope: { response: result } }; break;
    case "verdict_unsafe_pass": result.verdict.tone.pass = false; call = { call_state: "received", envelope: { response: result } }; break;
    case "bound_chained_repair": call = { call_state: "received", envelope: { response: `\uFEFF\`\`\`json\n${JSON.stringify(result)}\n\`\`\`` } }; break;
    case "bound_ambiguous_size": call = { call_state: "received", envelope: { response: "x".repeat(MAX_EXTRACTED_BYTES + 1), result } }; break;
    case "bound_oversized": call = { call_state: "received", envelope: { response: "x".repeat(MAX_EXTRACTED_BYTES + 1) } }; break;
    case "provider_error": call = { call_state: "provider_error", error_code: "provider_rejected" }; break;
    case "timeout": call = { call_state: "timeout" }; break;
    default: throw new Error(`unknown v2 shape ${fixture.shape}`);
  }
  const classified = await classifyJudgeCall(call, ref);
  const expectedValid = ["direct_valid", "repaired_valid"].includes(fixture.classification);
  return classified.classification === fixture.classification
    && (classified.repair_kind ?? null) === (fixture.repair_kind ?? null)
    && (expectedValid ? classified.result?.candidate_ref === ref && classified.verdict !== undefined && classified.validation_errors.length === 0 : classified.verdict === undefined);
}

export function declaredFixtureCatalog(document) {
  return [
    ...document.verdict_contract_cases.map((fixture) => ({ category: "verdict", fixture, id: `verdict:${fixture.id}` })),
    ...document.normalization_cases.map((fixture) => ({ category: "normalization", fixture, id: `normalization:${fixture.id}` })),
    ...document.v2_cases.map((fixture) => ({ category: "v2", fixture, id: `v2:${fixture.id}` })),
  ];
}

export async function executeCurrentFixtureCatalog(document = null) {
  document ??= await loadFixtureDocument();
  return executeFixtureCatalog(declaredFixtureCatalog(document), async ({ category, fixture }) => {
    if (category === "verdict") return verdictCase(document, fixture);
    if (category === "normalization") {
      const classified = await classifyJudgeCall(normalizationCall(document, fixture));
      return classified.classification === fixture.classification && (classified.repair_kind ?? null) === (fixture.repair_kind ?? null);
    }
    return v2Call(document, fixture);
  });
}
