export const CONTRACT_VERSION = 1;
export const MAX_EXTRACTED_BYTES = 64 * 1024;
export const MODEL_IDS = Object.freeze([
  "@cf/openai/gpt-oss-120b",
  "@cf/openai/gpt-oss-20b",
]);

export const GATE_NAMES = Object.freeze([
  "recognizable routine",
  "constructive intervention",
  "capability inventory",
  "channel fit",
  "proportionality",
  "delivery fit",
  "preservation",
  "natural retelling",
  "novel but imaginable",
]);

const CHECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "reason"],
  properties: {
    pass: { type: "boolean" },
    reason: { type: "string", minLength: 1, pattern: "\\S" },
  },
};

export const VERDICT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Oddspark judge verdict v1",
  type: "object",
  additionalProperties: false,
  required: ["pass", "gates", "tone", "claims"],
  properties: {
    pass: { type: "boolean" },
    gates: {
      type: "array",
      minItems: 9,
      maxItems: 9,
      allOf: Array.from({ length: 9 }, (_, index) => ({
        contains: {
          type: "object",
          required: ["gate"],
          properties: { gate: { const: index + 1 } },
        },
        minContains: 1,
        maxContains: 1,
      })),
      items: {
        type: "object",
        additionalProperties: false,
        required: ["gate", "pass", "reason"],
        properties: {
          gate: { type: "integer", minimum: 1, maximum: 9 },
          pass: { type: "boolean" },
          reason: { type: "string", minLength: 1, pattern: "\\S" },
        },
      },
    },
    tone: CHECK_SCHEMA,
    claims: CHECK_SCHEMA,
  },
  allOf: [
    {
      if: {
        required: ["pass"],
        properties: { pass: { const: true } },
      },
      then: {
        properties: {
          gates: {
            items: {
              required: ["pass"],
              properties: { pass: { const: true } },
            },
          },
          tone: {
            required: ["pass"],
            properties: { pass: { const: true } },
          },
          claims: {
            required: ["pass"],
            properties: { pass: { const: true } },
          },
        },
      },
    },
  ],
};

export const VERDICT_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: VERDICT_SCHEMA,
};

export const SYSTEM_PROMPT = `You are the independent Oddspark judge. Evaluate the supplied synthetic Candidate Brief against every check below.

1. Recognizable routine: starts from a credible routine and recurring annoyance.
2. Constructive intervention: every friction leads to an imaginable solution.
3. Capability inventory: does not duplicate an existing capability.
4. Channel fit: uses an observed channel or clearly introduces a fitting one.
5. Proportionality: matches likely scale, complexity, and maintenance capacity.
6. Delivery fit: Hearn Systems could implement it as software, AI automation, integration, data workflow, or adjacent digital system.
7. Preservation: retains helpful tools, workflow steps, and decision rights it need not change.
8. Natural retelling: a person could naturally explain the situation, capability, and payoff.
9. Novel but imaginable: goes beyond the obvious while remaining concrete.

Also evaluate tone (confident plan, plain language, no pitch, no consultant-speak, no bare-mush effects) and claims (qualitative unless supplied evidence grounds a number). Use the supplied grounding report; do not add a grounding field or a tenth gate.

Return only one JSON value matching the supplied schema. Include gates 1 through 9 exactly once. Set top-level pass to true only when all nine gates, tone, and claims pass.`;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkKeys(value, required, allowed, path, errors) {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  for (const key of required) {
    if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key} is not allowed`);
  }
  return true;
}

function checkNonEmptyString(value, path, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
    return false;
  }
  return true;
}

function checkStringArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return false;
  }
  value.forEach((item, index) => checkNonEmptyString(item, `${path}[${index}]`, errors));
  return true;
}

function validateCheck(value, path, errors) {
  if (!checkKeys(value, ["pass", "reason"], ["pass", "reason"], path, errors)) return;
  if (typeof value.pass !== "boolean") errors.push(`${path}.pass must be a boolean`);
  checkNonEmptyString(value.reason, `${path}.reason`, errors);
}

export function validateVerdict(value) {
  const errors = [];
  if (!checkKeys(
    value,
    ["pass", "gates", "tone", "claims"],
    ["pass", "gates", "tone", "claims"],
    "verdict",
    errors,
  )) return { valid: false, errors };

  if (typeof value.pass !== "boolean") errors.push("verdict.pass must be a boolean");

  if (!Array.isArray(value.gates)) {
    errors.push("verdict.gates must be an array");
  } else {
    if (value.gates.length !== 9) errors.push("verdict.gates must contain exactly 9 entries");
    const seen = new Set();
    value.gates.forEach((gate, index) => {
      const path = `verdict.gates[${index}]`;
      if (!checkKeys(gate, ["gate", "pass", "reason"], ["gate", "pass", "reason"], path, errors)) return;
      if (!Number.isInteger(gate.gate) || gate.gate < 1 || gate.gate > 9) {
        errors.push(`${path}.gate must be an integer from 1 through 9`);
      } else if (seen.has(gate.gate)) {
        errors.push(`${path}.gate duplicates gate ${gate.gate}`);
      } else {
        seen.add(gate.gate);
      }
      if (typeof gate.pass !== "boolean") errors.push(`${path}.pass must be a boolean`);
      checkNonEmptyString(gate.reason, `${path}.reason`, errors);
    });
    for (let gate = 1; gate <= 9; gate += 1) {
      if (!seen.has(gate)) errors.push(`verdict.gates is missing gate ${gate}`);
    }
  }

  validateCheck(value.tone, "verdict.tone", errors);
  validateCheck(value.claims, "verdict.claims", errors);

  if (value.pass === true) {
    const allGatesPass = Array.isArray(value.gates)
      && value.gates.length === 9
      && value.gates.every((gate) => gate?.pass === true);
    if (!allGatesPass || value.tone?.pass !== true || value.claims?.pass !== true) {
      errors.push("verdict.pass cannot be true when any reported check fails");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateCandidate(candidate, errors) {
  const required = [
    "version", "mode", "title", "plan", "why_fits", "what_gets_better",
    "before_after", "change_level", "stays_same", "invitation", "grounded_numbers",
  ];
  const allowed = [...required, "notice"];
  if (!checkKeys(candidate, required, allowed, "input.candidate", errors)) return;

  if (!Number.isInteger(candidate.version) || candidate.version < 1) {
    errors.push("input.candidate.version must be a positive integer");
  }
  if (candidate.mode !== "local" && candidate.mode !== "domain") {
    errors.push("input.candidate.mode must be local or domain");
  }
  for (const key of ["title", "plan", "what_gets_better", "invitation"]) {
    checkNonEmptyString(candidate[key], `input.candidate.${key}`, errors);
  }
  if (candidate.notice !== undefined) checkNonEmptyString(candidate.notice, "input.candidate.notice", errors);

  if (checkKeys(candidate.why_fits, ["text"], ["text", "breadcrumb"], "input.candidate.why_fits", errors)) {
    checkNonEmptyString(candidate.why_fits.text, "input.candidate.why_fits.text", errors);
    if (candidate.mode === "domain") {
      if (!Object.hasOwn(candidate.why_fits, "breadcrumb")) {
        errors.push("input.candidate.why_fits.breadcrumb is required in domain mode");
      } else {
        checkNonEmptyString(candidate.why_fits.breadcrumb, "input.candidate.why_fits.breadcrumb", errors);
      }
    } else if (candidate.why_fits.breadcrumb !== undefined) {
      errors.push("input.candidate.why_fits.breadcrumb is not allowed in local mode");
    }
  }

  if (checkKeys(candidate.before_after, ["before", "after"], ["before", "after"], "input.candidate.before_after", errors)) {
    checkNonEmptyString(candidate.before_after.before, "input.candidate.before_after.before", errors);
    checkNonEmptyString(candidate.before_after.after, "input.candidate.before_after.after", errors);
  }

  if (checkKeys(
    candidate.change_level,
    ["time_range", "steps_changed", "steps_removed", "preliminary"],
    ["time_range", "steps_changed", "steps_removed", "preliminary"],
    "input.candidate.change_level",
    errors,
  )) {
    checkNonEmptyString(candidate.change_level.time_range, "input.candidate.change_level.time_range", errors);
    for (const key of ["steps_changed", "steps_removed"]) {
      if (!Number.isInteger(candidate.change_level[key]) || candidate.change_level[key] < 0) {
        errors.push(`input.candidate.change_level.${key} must be a non-negative integer`);
      }
    }
    if (candidate.change_level.preliminary !== true) {
      errors.push("input.candidate.change_level.preliminary must be true");
    }
  }

  if (checkKeys(
    candidate.stays_same,
    ["tools", "authority", "steps"],
    ["tools", "authority", "steps"],
    "input.candidate.stays_same",
    errors,
  )) {
    for (const key of ["tools", "authority", "steps"]) {
      checkStringArray(candidate.stays_same[key], `input.candidate.stays_same.${key}`, errors);
    }
  }
  checkStringArray(candidate.grounded_numbers, "input.candidate.grounded_numbers", errors);
}

function validateEvidence(input, errors) {
  const evidence = input.evidence_bundle;
  if (input.candidate?.mode === "domain") {
    const keys = ["vertical", "clarity", "capabilities", "channels", "observation", "scanned_urls"];
    if (!checkKeys(evidence, keys, keys, "input.evidence_bundle", errors)) return;
    checkNonEmptyString(evidence.vertical, "input.evidence_bundle.vertical", errors);
    if (evidence.clarity !== "clear" && evidence.clarity !== "unclear") {
      errors.push("input.evidence_bundle.clarity must be clear or unclear");
    }
    checkStringArray(evidence.capabilities, "input.evidence_bundle.capabilities", errors);
    checkStringArray(evidence.channels, "input.evidence_bundle.channels", errors);
    if (checkKeys(evidence.observation, ["url", "text"], ["url", "text"], "input.evidence_bundle.observation", errors)) {
      checkNonEmptyString(evidence.observation.url, "input.evidence_bundle.observation.url", errors);
      checkNonEmptyString(evidence.observation.text, "input.evidence_bundle.observation.text", errors);
    }
    checkStringArray(evidence.scanned_urls, "input.evidence_bundle.scanned_urls", errors);
  } else {
    if (!checkKeys(evidence, ["mode", "priors"], ["mode", "priors"], "input.evidence_bundle", errors)) return;
    if (evidence.mode !== "local") errors.push("input.evidence_bundle.mode must be local");
    const priorKeys = ["region", "season", "date", "situation", "capability_bundle"];
    if (checkKeys(evidence.priors, priorKeys, priorKeys, "input.evidence_bundle.priors", errors)) {
      for (const key of ["region", "season", "date", "situation"]) {
        checkNonEmptyString(evidence.priors[key], `input.evidence_bundle.priors.${key}`, errors);
      }
      checkStringArray(evidence.priors.capability_bundle, "input.evidence_bundle.priors.capability_bundle", errors);
    }
  }
}

function validateGrounding(input, errors) {
  const report = input.grounding_report;
  const keys = [
    "schema_version", "fixture_only", "valid", "claims", "numeric_claims",
    "breadcrumb_count", "pii_free", "issues",
  ];
  if (!checkKeys(report, keys, keys, "input.grounding_report", errors)) return;
  if (report.schema_version !== "synthetic-grounding-report/v1") {
    errors.push("input.grounding_report.schema_version must identify the fixture-only v1 shape");
  }
  if (report.fixture_only !== true) errors.push("input.grounding_report.fixture_only must be true");
  if (typeof report.valid !== "boolean") errors.push("input.grounding_report.valid must be a boolean");
  if (typeof report.pii_free !== "boolean") errors.push("input.grounding_report.pii_free must be a boolean");
  if (!Array.isArray(report.claims)) {
    errors.push("input.grounding_report.claims must be an array");
  } else {
    report.claims.forEach((claim, index) => {
      const path = `input.grounding_report.claims[${index}]`;
      const claimKeys = ["field", "source", "matched_text"];
      if (!checkKeys(claim, claimKeys, claimKeys, path, errors)) return;
      for (const key of claimKeys) checkNonEmptyString(claim[key], `${path}.${key}`, errors);
    });
  }
  checkStringArray(report.numeric_claims, "input.grounding_report.numeric_claims", errors);
  checkStringArray(report.issues, "input.grounding_report.issues", errors);
  if (!Number.isInteger(report.breadcrumb_count) || report.breadcrumb_count < 0) {
    errors.push("input.grounding_report.breadcrumb_count must be a non-negative integer");
  }
  if (report.valid === true && report.issues?.length !== 0) {
    errors.push("input.grounding_report.valid cannot be true when issues are present");
  }
  if (report.valid === true && report.pii_free !== true) {
    errors.push("input.grounding_report.valid cannot be true when pii_free is false");
  }

  if (input.candidate?.mode === "domain") {
    if (report.breadcrumb_count !== 1) errors.push("domain input must report exactly one breadcrumb");
    const breadcrumb = input.candidate?.why_fits?.breadcrumb;
    const observation = input.evidence_bundle?.observation?.text;
    if (typeof breadcrumb === "string" && typeof observation === "string" && !observation.includes(breadcrumb)) {
      errors.push("input.candidate.why_fits.breadcrumb must be an exact observation substring");
    }
  }
}

export function validateSpikeInput(input) {
  const errors = [];
  const keys = ["synthetic", "candidate", "evidence_bundle", "grounding_report"];
  if (!checkKeys(input, keys, keys, "input", errors)) return { valid: false, errors };
  if (input.synthetic !== true) errors.push("input.synthetic must be true");
  validateCandidate(input.candidate, errors);
  validateEvidence(input, errors);
  validateGrounding(input, errors);
  return { valid: errors.length === 0, errors };
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function fingerprintContractInput(input) {
  const validation = validateSpikeInput(input);
  if (!validation.valid) throw new TypeError(validation.errors.join("; "));
  const systemPrompt = SYSTEM_PROMPT;
  const fixture = stableStringify(input);
  const schema = stableStringify(VERDICT_SCHEMA);
  const combined = stableStringify({
    contract_version: CONTRACT_VERSION,
    fixture,
    schema,
    system_prompt: systemPrompt,
  });
  return {
    system_prompt_sha256: await sha256Hex(systemPrompt),
    fixture_sha256: await sha256Hex(fixture),
    schema_sha256: await sha256Hex(schema),
    contract_sha256: await sha256Hex(combined),
  };
}

export function buildJudgeMessages(input) {
  const validation = validateSpikeInput(input);
  if (!validation.valid) throw new TypeError(validation.errors.join("; "));
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: stableStringify(input) },
  ];
}

function contentCandidate(location, value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim().length === 0) return null;

  const kind = typeof value === "string" ? "text" : "json";
  let serialized;
  try {
    serialized = kind === "text" ? value : JSON.stringify(value);
  } catch {
    return { location, unserializable: true };
  }
  if (serialized === undefined) return { location, unserializable: true };
  return { location, kind, value, serialized };
}

export async function extractJudgeContent(envelope) {
  const candidates = [];
  if (isObject(envelope)) {
    const possible = [
      ["response", envelope.response],
      ["result", envelope.result],
      ["choices[0].message.content", envelope.choices?.[0]?.message?.content],
    ];
    for (const [location, value] of possible) {
      const candidate = contentCandidate(location, value);
      if (candidate) candidates.push(candidate);
    }
  }

  if (candidates.length === 0) return { status: "empty", candidates: [] };
  if (candidates.some(({ unserializable }) => unserializable)) {
    return { status: "unserializable", candidates };
  }

  for (const candidate of candidates) {
    candidate.utf8_bytes = new TextEncoder().encode(candidate.serialized).byteLength;
    candidate.sha256 = await sha256Hex(candidate.serialized);
    delete candidate.serialized;
  }

  const identities = new Set(candidates.map(({ kind, value }) => {
    const serialized = kind === "text" ? value : JSON.stringify(value);
    return `${kind}\u0000${serialized}`;
  }));
  if (identities.size !== 1) return { status: "ambiguous", candidates };

  return {
    status: "content",
    candidates,
    content: candidates[0].value,
    content_kind: candidates[0].kind,
    content_locations: candidates.map(({ location }) => location),
    utf8_bytes: candidates[0].utf8_bytes,
  };
}

function parsedClassification(value, repairKind = null) {
  const validation = validateVerdict(value);
  if (!validation.valid) {
    return {
      classification: "schema_invalid",
      repair_kind: repairKind,
      validation_errors: validation.errors,
    };
  }
  return {
    classification: repairKind ? "repaired_valid" : "direct_valid",
    repair_kind: repairKind,
    validation_errors: [],
    verdict: value,
  };
}

function parseAfterOneRepair(text, repairKind) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { classification: "unrecoverable_json", repair_kind: null, validation_errors: [] };
  }
  if (typeof parsed === "string") {
    return { classification: "unrecoverable_json", repair_kind: null, validation_errors: [] };
  }
  return parsedClassification(parsed, repairKind);
}

function balancedObjectRanges(text) {
  const ranges = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  let invalid = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === "\"") {
      inString = true;
    } else if (character === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === "}") {
      if (depth === 0) {
        invalid = true;
      } else {
        depth -= 1;
        if (depth === 0) ranges.push([start, index + 1]);
      }
    }
  }

  if (depth !== 0 || inString) invalid = true;
  return { ranges, invalid };
}

export function parseJudgeContent(content) {
  if (typeof content !== "string") return parsedClassification(content);

  let direct;
  try {
    direct = JSON.parse(content);
  } catch {
    direct = undefined;
  }

  if (direct !== undefined && typeof direct !== "string") {
    return parsedClassification(direct);
  }
  if (typeof direct === "string") {
    return parseAfterOneRepair(direct, "double_encoded_json");
  }

  if (content.startsWith("\uFEFF")) {
    return parseAfterOneRepair(content.slice(1), "bom");
  }

  const fence = content.match(/^\s*```json[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*\s*$/);
  if (fence) return parseAfterOneRepair(fence[1], "json_fence");

  if (content.includes("```")) {
    return { classification: "unrecoverable_json", repair_kind: null, validation_errors: [] };
  }
  const scan = balancedObjectRanges(content);
  if (scan.invalid || scan.ranges.length !== 1) {
    return { classification: "unrecoverable_json", repair_kind: null, validation_errors: [] };
  }
  const [start, end] = scan.ranges[0];
  if (start === 0 && end === content.length) {
    return { classification: "unrecoverable_json", repair_kind: null, validation_errors: [] };
  }
  return parseAfterOneRepair(content.slice(start, end), "surrounding_prose");
}

export async function classifyJudgeCall({ call_state, envelope, error_code }) {
  if (call_state === "provider_error") {
    return {
      classification: "provider_error",
      repair_kind: null,
      validation_errors: [],
      error_code: error_code ?? "provider_error",
      candidates: [],
    };
  }
  if (call_state === "timeout") {
    return {
      classification: "timeout",
      repair_kind: null,
      validation_errors: [],
      candidates: [],
    };
  }

  const extraction = await extractJudgeContent(envelope);
  if (extraction.status === "empty") {
    return { classification: "empty_response", repair_kind: null, validation_errors: [], candidates: [] };
  }
  if (extraction.status === "ambiguous") {
    return {
      classification: "ambiguous_envelope",
      repair_kind: null,
      validation_errors: [],
      candidates: extraction.candidates,
    };
  }
  if (extraction.status === "unserializable") {
    return {
      classification: "unrecoverable_json",
      repair_kind: null,
      validation_errors: [],
      candidates: extraction.candidates,
    };
  }
  if (extraction.utf8_bytes > MAX_EXTRACTED_BYTES) {
    return {
      classification: "output_too_large",
      repair_kind: null,
      validation_errors: [],
      candidates: extraction.candidates,
    };
  }

  const parsed = parseJudgeContent(extraction.content);
  const result = {
    ...parsed,
    candidates: extraction.candidates,
    content_locations: extraction.content_locations,
  };
  if (parsed.verdict) {
    result.verdict_sha256 = await sha256Hex(stableStringify(parsed.verdict));
  }
  return result;
}
