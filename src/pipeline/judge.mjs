// Canonical JudgeResult validator, promoted verbatim from the judge-fidelity
// spike (spikes/judge-fidelity/contract.mjs) so the composite Gate no longer
// depends on a spike module. The verdict shape is the closed CanonicalVerdict:
// {pass, gates[1..9], tone, claims} with every reason non-blank.

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

export function validateJudgeResult(value, expectedCandidateRef) {
  const errors = [];
  if (!checkKeys(value, ["candidate_ref", "verdict"], ["candidate_ref", "verdict"], "result", errors)) return { valid: false, errors };
  if (typeof value.candidate_ref !== "string") errors.push("result.candidate_ref must be a string"); else if (value.candidate_ref !== expectedCandidateRef) errors.push("result.candidate_ref does not match the frozen candidate");
  const verdict = validateVerdict(value.verdict); errors.push(...verdict.errors.map((error) => error.replace(/^verdict/, "result.verdict")));
  return { valid: errors.length === 0, errors };
}
