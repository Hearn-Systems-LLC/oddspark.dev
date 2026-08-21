import {
  CANDIDATE_SCHEMA_VERSION,
  ContractValidationError,
  buildCandidate,
  buildEvidence,
  deepFreeze,
  deriveCandidateRef,
  utf8ByteLength,
} from "./contracts.mjs";

export const MAX_GENERATION_RESULT_BYTES = 64 * 1024;
export const MAX_GENERATION_REQUEST_BYTES = 64 * 1024;
export const MAX_GENERATION_VALUE_DEPTH = 32;
const SEED = /^[a-f0-9]{64}$/;

export const GENERATION_FAILURE_CODES = deepFreeze({
  INVALID_REQUEST: "invalid_request",
  INVALID_EVIDENCE: "invalid_evidence",
  PROVIDER_FAILURE: "provider_failure",
  INVALID_OUTPUT: "invalid_output",
  OUTPUT_TOO_LARGE: "output_too_large",
});

export class GenerationError extends Error {
  constructor(code, message, { issues = [], model_calls = 0 } = {}) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
    this.model_calls = model_calls;
    this.issues = sanitizeIssues(issues);
    deepFreeze(this);
  }
}

const issue = (path, rule, message) => ({ artifact: "generation", path, rule, message });

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownData(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, "value") ? descriptor.value : undefined;
}

function safeScalar(value, key) {
  if (!isPlainObject(value)) return undefined;
  const scalar = ownData(value, key);
  if (scalar === null || typeof scalar === "string" || typeof scalar === "boolean") return scalar;
  return typeof scalar === "number" && Number.isFinite(scalar) ? scalar : undefined;
}

function sanitizeIssues(issues) {
  if (!Array.isArray(issues)) return deepFreeze([]);
  try {
    return deepFreeze(issues.map((candidate) => {
      const safe = {};
      for (const key of ["artifact", "path", "rule", "message", "location"]) {
        const scalar = safeScalar(candidate, key);
        if (scalar !== undefined) safe[key] = scalar;
      }
      return Object.keys(safe).length ? safe : issue("output", "unsafe_issue", "dependency returned an unsafe issue");
    }));
  } catch {
    return deepFreeze([issue("output", "unsafe_issues", "dependency returned unsafe issues")]);
  }
}

function safeErrorIssues(error) {
  try {
    const descriptor = error && (typeof error === "object" || typeof error === "function")
      ? Object.getOwnPropertyDescriptor(error, "issues") : undefined;
    return descriptor && Object.hasOwn(descriptor, "value") && Array.isArray(descriptor.value)
      ? descriptor.value : [];
  } catch {
    return [];
  }
}

function copyPlainJson(value, path, { maxBytes = Infinity, maxDepth = MAX_GENERATION_VALUE_DEPTH, limitError } = {}, state = { seen: new Set(), bytes: 0 }, depth = 0) {
  if (depth > maxDepth) throw limitError?.("max_depth", `must not exceed ${maxDepth} nested levels`)
    ?? new RangeError(`${path} exceeds the maximum nesting depth`);
  const add = (amount) => {
    state.bytes += amount;
    if (state.bytes > maxBytes) throw limitError?.("max_bytes", `must not exceed ${maxBytes} UTF-8 bytes`)
      ?? new RangeError(`${path} exceeds the maximum byte size`);
  };
  const jsonStringBytes = (text) => {
    const rawBytes = utf8ByteLength(text);
    if (state.bytes + rawBytes > maxBytes) add(rawBytes);
    return utf8ByteLength(JSON.stringify(text));
  };
  if (value === null || typeof value === "boolean") { add(value === null ? 4 : value ? 4 : 5); return value; }
  if (typeof value === "string") { add(jsonStringBytes(value)); return value; }
  if (typeof value === "number" && Number.isFinite(value)) { add(utf8ByteLength(String(value))); return value; }
  if (typeof value !== "object") throw new TypeError(`${path} must contain only JSON values`);
  if (state.seen.has(value)) throw new TypeError(`${path} must not contain cycles`);
  if (Object.getOwnPropertySymbols(value).length) throw new TypeError(`${path} must not contain symbol keys`);
  if (!Array.isArray(value) && !isPlainObject(value)) throw new TypeError(`${path} must contain only plain objects`);
  state.seen.add(value);
  let copy;
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || value.some((_, index) => !Object.hasOwn(value, index))) throw new TypeError(`${path} must not contain sparse or supplemented arrays`);
    add(2 + Math.max(0, value.length - 1));
    copy = value.map((entry, index) => copyPlainJson(entry, `${path}[${index}]`, { maxBytes, maxDepth, limitError }, state, depth + 1));
  } else {
    copy = {};
    const keys = Object.keys(value);
    if (Reflect.ownKeys(value).length !== keys.length) throw new TypeError(`${path} must not contain hidden or symbol keys`);
    add(2 + Math.max(0, keys.length - 1));
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) throw new TypeError(`${path}.${key} must be an enumerable data property`);
      add(jsonStringBytes(key) + 1);
      Object.defineProperty(copy, key, {
        value: copyPlainJson(descriptor.value, `${path}.${key}`, { maxBytes, maxDepth, limitError }, state, depth + 1),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  state.seen.delete(value);
  return copy;
}

function exactKeys(value, expected) {
  if (!isPlainObject(value) || Object.getOwnPropertySymbols(value).length) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === expected.length && expected.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, "value");
  });
}

function snapshotRequest(input) {
  let seed; let evidenceValue;
  try {
    if (!exactKeys(input, ["evidence", "seed"])) throw new GenerationError(
      GENERATION_FAILURE_CODES.INVALID_REQUEST, "generation input must be a closed plain object",
      { issues: [issue("request", "closed_schema", "must contain exactly evidence and seed")] },
    );
    seed = ownData(input, "seed"); evidenceValue = ownData(input, "evidence");
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(GENERATION_FAILURE_CODES.INVALID_REQUEST, "generation input could not be safely inspected", {
      issues: [issue("request", "safe_reflection", "must permit safe plain-object inspection")],
    });
  }
  if (typeof seed !== "string" || !SEED.test(seed)) throw new GenerationError(
    GENERATION_FAILURE_CODES.INVALID_REQUEST, "seed must be an explicit canonical SHA-256",
    { issues: [issue("request.seed", "canonical_seed", "must be 64 lowercase hexadecimal characters")] },
  );
  let evidenceSnapshot;
  try {
    evidenceSnapshot = copyPlainJson(evidenceValue, "request.evidence", {
      maxBytes: MAX_GENERATION_REQUEST_BYTES,
      limitError(rule, message) {
        return new GenerationError(GENERATION_FAILURE_CODES.INVALID_EVIDENCE, "Evidence exceeds the generation request limit", {
          issues: [issue("request.evidence", rule, message)],
        });
      },
    });
  }
  catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(GENERATION_FAILURE_CODES.INVALID_EVIDENCE, "Evidence is not a safe plain value", {
      issues: [issue("request.evidence", "plain_json", "must be acyclic plain JSON data")],
    });
  }
  try { return deepFreeze({ evidence: buildEvidence(evidenceSnapshot), seed }); }
  catch (error) {
    throw new GenerationError(GENERATION_FAILURE_CODES.INVALID_EVIDENCE, "Evidence contract rejected the request", { issues: safeErrorIssues(error) });
  }
}

function snapshotDependencies(dependencies) {
  try {
    if (!exactKeys(dependencies, ["provider"]) || typeof ownData(dependencies, "provider") !== "function") throw new GenerationError(
      GENERATION_FAILURE_CODES.INVALID_REQUEST, "generation dependencies must contain exactly one provider function",
      { issues: [issue("dependencies.provider", "function", "must be the sole dependency and a function")] },
    );
    return ownData(dependencies, "provider");
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(GENERATION_FAILURE_CODES.INVALID_REQUEST, "generation dependencies could not be safely inspected", {
      issues: [issue("dependencies", "safe_reflection", "must permit safe plain-object inspection")],
    });
  }
}

export function classifyGenerationResult(value) {
  let direct;
  try {
    direct = copyPlainJson(value, "output", {
      maxBytes: MAX_GENERATION_RESULT_BYTES,
      limitError(rule, message) {
        const code = rule === "max_bytes" ? GENERATION_FAILURE_CODES.OUTPUT_TOO_LARGE : GENERATION_FAILURE_CODES.INVALID_OUTPUT;
        return new GenerationError(code, rule === "max_bytes" ? "generation output exceeds the offline adapter limit" : "generation output exceeds the nesting limit", {
          model_calls: 1, issues: [issue("output", rule, message)],
        });
      },
    });
  }
  catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(GENERATION_FAILURE_CODES.INVALID_OUTPUT, "provider returned a non-direct generation value", {
      model_calls: 1, issues: [issue("output", "direct_value", "must be one acyclic plain Candidate object")],
    });
  }
  if (!isPlainObject(direct)) throw new GenerationError(GENERATION_FAILURE_CODES.INVALID_OUTPUT, "provider returned a non-direct generation value", {
    model_calls: 1, issues: [issue("output", "candidate_object", "must be exactly one Candidate object")],
  });
  try {
    const candidate = buildCandidate(direct);
    const candidate_ref = deriveCandidateRef(CANDIDATE_SCHEMA_VERSION, candidate);
    return deepFreeze({ candidate, candidate_ref, model_calls: 1 });
  } catch (error) {
    const issues = error instanceof ContractValidationError ? error.issues : safeErrorIssues(error);
    throw new GenerationError(GENERATION_FAILURE_CODES.INVALID_OUTPUT, "provider output failed the Candidate contract", { model_calls: 1, issues });
  }
}

export async function generateCandidate(input, dependencies) {
  const request = snapshotRequest(input);
  const provider = snapshotDependencies(dependencies);
  let output;
  try { output = await provider(request); }
  catch {
    throw new GenerationError(GENERATION_FAILURE_CODES.PROVIDER_FAILURE, "generation provider failed", {
      model_calls: 1, issues: [issue("provider", "invocation_failed", "provider invocation did not return a value")],
    });
  }
  return classifyGenerationResult(output);
}
