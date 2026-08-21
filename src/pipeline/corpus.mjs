// Canonical voice-corpus validation and semantic identity. Runtime-neutral:
// the Node fs loader and CLI stay in scripts/semantic-corpus.mjs. The public-
// hostname check reimplements the exact IPv4/IPv6 classification it needs
// instead of importing node:net.

import { domainSeparatedHash, encodeCanonicalJson } from "./contracts.mjs";

// The pinned corpus canonical-JSON error flavor is the contracts strict
// encoder; there is no second canonicalization algorithm.
export const canonicalJson = encodeCanonicalJson;

const ARTIFACTS = ["rubric", "goldens", "anti_goldens", "approval"];
const REQUIRED_CATEGORIES = [
  "consultant_speak",
  "unsupported_claims",
  "weak_preservation",
  "capability_duplication",
  "poor_scope",
  "invitation_pressure",
];
const ELEMENT_ORDER = [
  "spark_title",
  "the_plan",
  "why_it_fits",
  "what_gets_better",
  "before_after",
  "change_level",
  "what_stays_the_same",
  "implementation_invitation",
];
const CLAIM_QUANTITY_WORDS = "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|dozen|hundred|thousand|million|several|many|multiple";
const CLAIM_QUANTITY_UNITS = "percent|percentage|seconds?|minutes?|hours?|days?|weeks?|months?|years?|calls?|bookings?|orders?|customers?|guests?|clients?|leads?|inquir(?:y|ies)|messages?|dollars?|sales?|appointments?|jobs?|trips?|supporters?";
const WRITTEN_CLAIM_QUANTITY = new RegExp(`\\b(?:${CLAIM_QUANTITY_WORDS})\\s+(?:${CLAIM_QUANTITY_UNITS})\\b`, "gi");
const DIGIT_CLAIM = /\b\d+(?:\.\d+)?%?(?!\w)/g;
const PRESSURE_LANGUAGE = /\b(?:act now|book now|today only|limited time|before (?:it|this|the) (?:is )?(?:gone|ends?|expires?|disappears?)|don't miss|last chance|exclusive offer|sales call|transformation call|schedule (?:a|your|a quick)?\s*call|book (?:a|your)?\s*call|reserve your spot|apply now|while (?:spots|seats|supplies) last)\b/i;
const ANTI_GOLDEN_RULES = {
  consultant_speak: { gates: [8], rules: ["banned_register", "counter_level_language"] },
  unsupported_claims: { gates: [1], rules: ["claim_provenance"] },
  weak_preservation: { gates: [7], rules: ["preserved_tools", "decision_authority", "untouched_steps"] },
  capability_duplication: { gates: [3], rules: ["capability_inventory"] },
  poor_scope: { gates: [5, 6], rules: ["proportionality", "delivery_envelope"] },
  invitation_pressure: { gates: [8], rules: ["counter_level_invitation", "no_pressure", "confident_bounded_next_step"] },
};

function issue(artifact, rule, message, fixture = null) {
  return { artifact, fixture, rule, message };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPlainObject(value) {
  if (!isObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonblank(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function hasDuplicates(values) {
  return new Set(values).size !== values.length;
}

// Runtime-neutral replacement for the exact node:net isIP classifications this
// module relies on: dotted-quad IPv4 and parseable IPv6 (including embedded
// IPv4 tails). Invalid inputs classify as 0, matching isIP's rejections.
function ipVersion(host) {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    const octets = host.split(".");
    return octets.every((octet) => String(Number(octet)) === octet && Number(octet) <= 255) ? 4 : 0;
  }
  if (!host.includes(":")) return 0;
  try {
    return expandIpv6(host) !== null ? 6 : 0;
  } catch {
    return 0;
  }
}

function ipv4Number(host) {
  return host.split(".").reduce((value, octet) => (value << 8n) | BigInt(Number(octet)), 0n);
}

function inIpv4Range(value, start, prefix) {
  const shift = BigInt(32 - prefix);
  return value >> shift === ipv4Number(start) >> shift;
}

function expandIpv6(host) {
  let source = host.toLowerCase();
  if (source.includes(".")) {
    const lastColon = source.lastIndexOf(":");
    const ip = source.slice(lastColon + 1);
    if (ipVersion(ip) !== 4) return null;
    const value = ipv4Number(ip);
    source = `${source.slice(0, lastColon)}:${Number((value >> 16n) & 0xffffn).toString(16)}:${Number(value & 0xffffn).toString(16)}`;
  }
  const halves = source.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  if ([...left, ...right].some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group || "0"}`), 0n);
}

function inIpv6Range(value, start, prefix) {
  const shift = BigInt(128 - prefix);
  return value >> shift === expandIpv6(start) >> shift;
}

function isPublicHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".test") || host.endsWith(".invalid")) return false;
  if (ipVersion(host) === 4) {
    const value = ipv4Number(host);
    const blocked = [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]];
    return !blocked.some(([start, prefix]) => inIpv4Range(value, start, prefix));
  }
  if (ipVersion(host) === 6) {
    const value = expandIpv6(host);
    const blocked = [["::", 128], ["::1", 128], ["::ffff:0:0", 96], ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]];
    return value !== null && !blocked.some(([start, prefix]) => inIpv6Range(value, start, prefix));
  }
  return host.includes(".");
}

function quantityTokens(text) {
  return {
    digits: text.match(DIGIT_CLAIM) ?? [],
    written: text.match(WRITTEN_CLAIM_QUANTITY) ?? [],
  };
}

function exactTokenSet(text) {
  return new Set((text.match(DIGIT_CLAIM) ?? []).map((token) => token.toLowerCase()));
}

function parseChangeLevel(text) {
  if (!isNonblank(text) || !/^Preliminary change:/i.test(text)) return null;
  const range = text.match(/(?<![\d-])(-?\d+)\s*(?:-|–|to)\s*(-?\d+)\s+(?:business\s+)?(?:days?|weeks?)\b/i);
  const changed = text.match(/(?<![\d-])(-?\d+)\s+(?:[A-Za-z0-9_][\w-]*\s+){0,4}(?:step|steps)\s+changes?\b/i);
  const disappeared = text.match(/(?<![\d-])(-?\d+)\s+(?:[A-Za-z0-9_][\w-]*\s+){0,4}(?:step|steps|work|explanation|drafting)\s+disappears?\b/i);
  if (!range || !changed || !disappeared) return null;
  return { minimum: Number(range[1]), maximum: Number(range[2]), changed: Number(changed[1]), disappeared: Number(disappeared[1]) };
}

function exactKeys(value, keys, artifact, location, errors) {
  if (!isObject(value)) {
    errors.push(issue(artifact, "object", `${location} must be an object`));
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join("\0") !== expected.join("\0")) {
    const unknown = actual.filter((key) => !expected.includes(key));
    const missing = expected.filter((key) => !actual.includes(key));
    errors.push(issue(artifact, "closed_schema", `${location} keys differ; missing=[${missing.join(", ")}], unknown=[${unknown.join(", ")}]`));
    return false;
  }
  return true;
}

export function domainHash(domain, value) {
  return domainSeparatedHash("oddspark.semantic.voice.v1", domain, value);
}

function validateRubric(rubric, errors) {
  const keys = ["schema_version", "corpus_version", "authority", "element_order", "gate_order", "voice_rules", "banned_registers", "claim_rules", "preservation_requirements", "gate_boundary_examples", "thresholds"];
  if (!exactKeys(rubric, keys, "rubric", "rubric", errors)) return;
  exactKeys(rubric.authority, ["author", "owner", "status", "production_authorized"], "rubric", "authority", errors);
  exactKeys(rubric.voice_rules, ["register", "confidence", "effects", "preservation", "retelling", "breadcrumb", "scope", "invitation"], "rubric", "voice_rules", errors);
  exactKeys(rubric.claim_rules, ["local", "website", "all"], "rubric", "claim_rules", errors);
  exactKeys(rubric.gate_boundary_examples, ["gate_3_pass", "gate_3_fail", "gate_9_pass", "gate_9_fail"], "rubric", "gate_boundary_examples", errors);
  exactKeys(rubric.thresholds, ["minimum_goldens_per_mode", "required_anti_golden_categories", "required_gate_passes_per_golden", "website_breadcrumbs", "local_breadcrumbs", "maximum_banned_register_matches"], "rubric", "thresholds", errors);
  if (rubric.schema_version !== 1 || rubric.corpus_version !== "voice-v1") errors.push(issue("rubric", "version", "rubric must be schema 1 and corpus voice-v1"));
  if (canonicalJson(rubric.element_order) !== canonicalJson(ELEMENT_ORDER)) errors.push(issue("rubric", "element_order", "element_order must match the canonical eight elements"));
  if (canonicalJson(rubric.gate_order) !== canonicalJson([1, 2, 3, 4, 5, 6, 7, 8, 9])) errors.push(issue("rubric", "gate_order", "gate_order must contain gates 1 through 9"));
  if (!isObject(rubric.authority) || rubric.authority.author !== "developer" || rubric.authority.owner !== "Justin" || rubric.authority.status !== "pending_owner_approval" || rubric.authority.production_authorized !== false) errors.push(issue("rubric", "placeholder_authority", "rubric authority must remain a developer-authored, non-production placeholder"));
  if (!Array.isArray(rubric.banned_registers) || rubric.banned_registers.length < 8 || rubric.banned_registers.some((term) => typeof term !== "string" || term.trim() === "")) errors.push(issue("rubric", "banned_registers", "banned_registers must contain at least eight non-empty strings"));
  if (Array.isArray(rubric.banned_registers) && hasDuplicates(rubric.banned_registers.map((term) => typeof term === "string" ? term.trim().toLowerCase() : term))) errors.push(issue("rubric", "duplicate_banned_register", "banned registers must be unique"));
  if (!isObject(rubric.voice_rules) || Object.values(rubric.voice_rules).some((value) => !isNonblank(value))) errors.push(issue("rubric", "voice_rule_value", "every voice rule must be a nonblank string"));
  if (!isObject(rubric.claim_rules) || Object.values(rubric.claim_rules).some((value) => !isNonblank(value))) errors.push(issue("rubric", "claim_rule_value", "every claim rule must be a nonblank string"));
  if (!isObject(rubric.gate_boundary_examples) || Object.values(rubric.gate_boundary_examples).some((value) => !isNonblank(value))) errors.push(issue("rubric", "gate_boundary_value", "every gate boundary example must be a nonblank string"));
  if (canonicalJson(rubric.preservation_requirements) !== canonicalJson(["tools", "decision_authority", "untouched_steps"])) errors.push(issue("rubric", "preservation_requirements", "all preservation dimensions are required"));
  const t = rubric.thresholds;
  if (!isObject(t) || t.minimum_goldens_per_mode !== 3 || t.required_gate_passes_per_golden !== 9 || t.website_breadcrumbs !== 1 || t.local_breadcrumbs !== 0 || t.maximum_banned_register_matches !== 0 || canonicalJson(t.required_anti_golden_categories) !== canonicalJson(REQUIRED_CATEGORIES)) errors.push(issue("rubric", "fixed_thresholds", "pre-live thresholds must equal the closed voice-v1 values"));
}

function validateGolden(fixture, rubric, errors) {
  const id = isObject(fixture) && typeof fixture.id === "string" ? fixture.id : null;
  if (!exactKeys(fixture, ["id", "mode", "evidence", "effect", "preservation", "elements", "expected_gates"], "goldens", id ?? "fixture", errors)) return;
  exactKeys(fixture.evidence, ["sources", "breadcrumb", "supported_claims"], "goldens", `${id}.evidence`, errors);
  exactKeys(fixture.effect, ["who", "when", "physical_change"], "goldens", `${id}.effect`, errors);
  exactKeys(fixture.preservation, ["tools", "decision_authority", "untouched_steps"], "goldens", `${id}.preservation`, errors);
  if (!id || !/^[a-z0-9-]+$/.test(id)) errors.push(issue("goldens", "stable_id", "fixture id must be stable kebab-case", id));
  if (!['local', 'website'].includes(fixture.mode)) errors.push(issue("goldens", "mode", "mode must be local or website", id));
  if (!Array.isArray(fixture.elements) || fixture.elements.length !== 8) {
    errors.push(issue("goldens", "elements", "fixture must contain exactly eight elements", id));
  } else {
    const names = [];
    for (const [index, element] of fixture.elements.entries()) {
      exactKeys(element, ["element", "text"], "goldens", `${id}.elements[${index}]`, errors);
      names.push(isObject(element) ? element.element : null);
      if (!isObject(element) || typeof element.text !== "string" || element.text.trim() === "") errors.push(issue("goldens", "element_text", `element ${index + 1} must have text`, id));
    }
    if (canonicalJson(names) !== canonicalJson(ELEMENT_ORDER)) errors.push(issue("goldens", "element_order", "elements are not in canonical order", id));
    const allText = fixture.elements.map((element) => isObject(element) ? element.text : "").join(" ").toLowerCase();
    for (const term of Array.isArray(rubric?.banned_registers) ? rubric.banned_registers : []) {
      if (allText.includes(term.toLowerCase())) errors.push(issue("goldens", "banned_register", `contains banned register: ${term}`, id));
    }
    const claimText = fixture.elements.filter((element) => isObject(element) && element.element !== "change_level").map((element) => element.text).join(" ").toLowerCase();
    const quantities = quantityTokens(claimText);
    if (fixture.mode === "local" && (quantities.digits.length > 0 || quantities.written.length > 0)) errors.push(issue("goldens", "local_numeric_claim", "local fixtures cannot contain numeric or written quantity claims", id));
    if (fixture.mode === "website") {
      const supportText = Array.isArray(fixture.evidence?.supported_claims) ? fixture.evidence.supported_claims.join(" ").toLowerCase() : "";
      const supportedDigits = exactTokenSet(supportText);
      for (const number of quantities.digits) if (!supportedDigits.has(number.toLowerCase())) errors.push(issue("goldens", "number_provenance", `website number lacks exact supplied evidence: ${number}`, id));
      for (const quantity of quantities.written) if (!supportText.includes(quantity.toLowerCase())) errors.push(issue("goldens", "number_provenance", `website written quantity lacks supplied evidence: ${quantity}`, id));
    }
    if (/\b(audit|fault|stale|broken|failure)\b/.test(allText)) errors.push(issue("goldens", "audit_framing", "golden reads as an audit or fault report", id));
    if (/\b(replace|discard|remove)\s+(?:the\s+)?(?:existing|current)\b/.test(allText)) errors.push(issue("goldens", "helpful_work_replacement", "golden replaces an existing helpful tool or workflow", id));
    if (/\bnew\s+(?:appointment\s+)?scheduler\b/.test(allText) && /\bexisting\s+(?:appointment\s+)?scheduler\b/.test(allText)) errors.push(issue("goldens", "capability_duplication", "golden duplicates an existing capability", id));
    const changeLevel = fixture.elements.find((element) => isObject(element) && element.element === "change_level")?.text;
    const parsedChange = parseChangeLevel(changeLevel);
    if (!parsedChange) errors.push(issue("goldens", "change_level_shape", "Change Level must state a preliminary numeric time range and numeric changed/disappearing step counts", id));
    else if (parsedChange.minimum <= 0 || parsedChange.maximum <= 0 || parsedChange.minimum > parsedChange.maximum || parsedChange.changed < 0 || parsedChange.disappeared < 0) errors.push(issue("goldens", "change_level_bounds", "Change Level range must be positive and ordered; workflow-step counts must be nonnegative", id));
    const invitation = fixture.elements.find((element) => isObject(element) && element.element === "implementation_invitation")?.text;
    if (!isNonblank(invitation) || invitation.includes("?")) errors.push(issue("goldens", "rhetorical_invitation", "implementation invitation must be confident and not a rhetorical question", id));
    if (isNonblank(invitation) && /\b(?:not worth changing|call it off|if it is worth|if it sounds useful)\b/i.test(invitation)) errors.push(issue("goldens", "invitation_confidence", "implementation invitation must offer a confident bounded next step without undermining the Spark", id));
    if (isNonblank(invitation) && PRESSURE_LANGUAGE.test(invitation)) errors.push(issue("goldens", "invitation_pressure", "implementation invitation cannot use urgency, funnel, or pressure language", id));
  }
  if (!Array.isArray(fixture.expected_gates) || fixture.expected_gates.length !== 9 || fixture.expected_gates.some((value) => value !== true)) errors.push(issue("goldens", "expected_gates", "all nine gates must expect pass", id));
  if (!isObject(fixture.effect) || ["who", "when", "physical_change"].some((key) => typeof fixture.effect[key] !== "string" || fixture.effect[key].trim() === "")) errors.push(issue("goldens", "effect_shape", "effect must name who, when, and the physical change", id));
  if (!isObject(fixture.preservation) || !Array.isArray(fixture.preservation.tools) || fixture.preservation.tools.length === 0 || fixture.preservation.tools.some((value) => !isNonblank(value)) || !isNonblank(fixture.preservation.decision_authority) || !Array.isArray(fixture.preservation.untouched_steps) || fixture.preservation.untouched_steps.length === 0 || fixture.preservation.untouched_steps.some((value) => !isNonblank(value))) errors.push(issue("goldens", "preservation", "preservation must name nonblank tools, authority, and untouched steps", id));
  if (!isObject(fixture.evidence) || !Array.isArray(fixture.evidence.sources) || fixture.evidence.sources.length === 0 || fixture.evidence.sources.some((value) => !isNonblank(value)) || !Array.isArray(fixture.evidence.supported_claims) || fixture.evidence.supported_claims.some((value) => !isNonblank(value))) errors.push(issue("goldens", "evidence", "evidence must have nonblank sources and supported claims", id));
  if (fixture.mode === "local" && fixture.evidence?.breadcrumb !== null) errors.push(issue("goldens", "local_breadcrumb", "local fixtures must have no business breadcrumb", id));
  if (fixture.mode === "local" && fixture.evidence?.supported_claims?.length !== 0) errors.push(issue("goldens", "local_claims", "local fixtures must have no business-specific supported claims", id));
  if (fixture.mode === "website" && (typeof fixture.evidence?.breadcrumb !== "string" || fixture.evidence.breadcrumb.trim() === "")) errors.push(issue("goldens", "website_breadcrumb", "website fixtures must have exactly one breadcrumb string", id));
  if (fixture.mode === "website" && fixture.evidence?.supported_claims?.length === 0) errors.push(issue("goldens", "website_claims", "website fixtures must bind claims to public-site evidence", id));
  if (fixture.mode === "website" && Array.isArray(fixture.evidence?.sources)) {
    for (const source of fixture.evidence.sources) {
      try {
        const url = new URL(source);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !isPublicHostname(url.hostname)) throw new Error("not public HTTP(S)");
      } catch {
        errors.push(issue("goldens", "website_source_url", "website evidence sources must be public HTTP(S) URLs", id));
      }
    }
  }
  if (fixture.mode === "website" && isNonblank(fixture.evidence?.breadcrumb) && Array.isArray(fixture.evidence?.supported_claims) && !fixture.evidence.supported_claims.some((claim) => isNonblank(claim) && claim.toLowerCase().includes(fixture.evidence.breadcrumb.toLowerCase()))) errors.push(issue("goldens", "breadcrumb_evidence", "website breadcrumb must appear in supplied supported evidence", id));
  if (fixture.mode === "website" && typeof fixture.evidence?.breadcrumb === "string" && Array.isArray(fixture.elements)) {
    const breadcrumb = fixture.evidence.breadcrumb.toLowerCase();
    const occurrences = fixture.elements.reduce((count, element) => count + ((isObject(element) && typeof element.text === "string" ? element.text.toLowerCase() : "").split(breadcrumb).length - 1), 0);
    if (occurrences !== 1) errors.push(issue("goldens", "website_breadcrumb_count", `website breadcrumb must appear exactly once; found ${occurrences}`, id));
  }
}

function validateGoldens(goldens, rubric, errors) {
  if (!exactKeys(goldens, ["schema_version", "corpus_version", "authority", "fixtures"], "goldens", "goldens", errors)) return;
  if (goldens.schema_version !== 1 || goldens.corpus_version !== "voice-v1" || goldens.authority !== "developer_fixture_not_owner_approved") errors.push(issue("goldens", "metadata", "goldens metadata must identify unapproved voice-v1 developer fixtures"));
  if (!Array.isArray(goldens.fixtures)) return errors.push(issue("goldens", "fixtures", "fixtures must be an array"));
  const ids = new Set();
  for (const fixture of goldens.fixtures) {
    validateGolden(fixture, rubric, errors);
    if (isObject(fixture) && typeof fixture.id === "string") {
      if (ids.has(fixture.id)) errors.push(issue("goldens", "duplicate_id", `duplicate id: ${fixture.id}`, fixture.id));
      ids.add(fixture.id);
    }
  }
  for (const mode of ["local", "website"]) {
    const count = goldens.fixtures.filter((fixture) => isObject(fixture) && fixture.mode === mode).length;
    if (count < 3) errors.push(issue("goldens", "minimum_per_mode", `${mode} requires at least three fixtures`));
  }
}

function validateAntiGoldens(anti, errors) {
  if (!exactKeys(anti, ["schema_version", "corpus_version", "authority", "fixtures"], "anti_goldens", "anti_goldens", errors)) return;
  if (anti.schema_version !== 1 || anti.corpus_version !== "voice-v1" || anti.authority !== "developer_fixture_not_owner_approved") errors.push(issue("anti_goldens", "metadata", "anti-goldens metadata must identify unapproved voice-v1 developer fixtures"));
  if (!Array.isArray(anti.fixtures)) return errors.push(issue("anti_goldens", "fixtures", "fixtures must be an array"));
  const ids = new Set();
  const categories = new Set();
  for (const fixture of anti.fixtures) {
    const id = isObject(fixture) ? fixture.id : null;
    if (!exactKeys(fixture, ["id", "category", "mode", "sample", "expected_rejection"], "anti_goldens", id ?? "fixture", errors)) continue;
    exactKeys(fixture.expected_rejection, ["gates", "rubric_rules", "reason"], "anti_goldens", `${id}.expected_rejection`, errors);
    if (!isNonblank(id) || !/^[a-z0-9-]+$/.test(id)) errors.push(issue("anti_goldens", "stable_id", "anti-golden id must be stable kebab-case", id));
    if (ids.has(id)) errors.push(issue("anti_goldens", "duplicate_id", `duplicate id: ${id}`, id));
    ids.add(id);
    if (categories.has(fixture.category)) errors.push(issue("anti_goldens", "duplicate_category", `duplicate category: ${fixture.category}`, id));
    categories.add(fixture.category);
    if (!REQUIRED_CATEGORIES.includes(fixture.category)) errors.push(issue("anti_goldens", "category", `unknown category: ${fixture.category}`, id));
    if (!['local', 'website'].includes(fixture.mode)) errors.push(issue("anti_goldens", "mode", "mode must be local or website", id));
    if (typeof fixture.sample !== "string" || fixture.sample.trim() === "") errors.push(issue("anti_goldens", "sample", "sample must be non-empty", id));
    if (!Array.isArray(fixture.expected_rejection?.gates) || fixture.expected_rejection.gates.length === 0 || fixture.expected_rejection.gates.some((gate) => !Number.isInteger(gate) || gate < 1 || gate > 9)) errors.push(issue("anti_goldens", "rejection_gates", "expected rejection must name valid gates", id));
    if (Array.isArray(fixture.expected_rejection?.gates) && hasDuplicates(fixture.expected_rejection.gates)) errors.push(issue("anti_goldens", "duplicate_rejection_gate", "expected rejection gates must be unique", id));
    if (!Array.isArray(fixture.expected_rejection?.rubric_rules) || fixture.expected_rejection.rubric_rules.length === 0 || fixture.expected_rejection.rubric_rules.some((rule) => !isNonblank(rule)) || !isNonblank(fixture.expected_rejection?.reason)) errors.push(issue("anti_goldens", "rejection_reason", "expected rejection must name nonblank rubric rules and a nonblank reason", id));
    const policy = ANTI_GOLDEN_RULES[fixture.category];
    if (policy && Array.isArray(fixture.expected_rejection?.rubric_rules) && fixture.expected_rejection.rubric_rules.some((rule) => !policy.rules.includes(rule))) errors.push(issue("anti_goldens", "category_rubric_rule", "anti-golden rubric rules must belong to the category allowlist", id));
    if (policy && Array.isArray(fixture.expected_rejection?.gates) && canonicalJson(fixture.expected_rejection.gates) !== canonicalJson(policy.gates)) errors.push(issue("anti_goldens", "category_gates", "anti-golden gates must match the category metadata", id));
  }
  for (const category of REQUIRED_CATEGORIES) if (!categories.has(category)) errors.push(issue("anti_goldens", "category_coverage", `missing category: ${category}`));
}

function validateApprovalShape(approval, errors, nowMs) {
  if (!exactKeys(approval, ["schema_version", "status", "owner", "corpus_version", "hashes", "semantic_identity", "approved_at"], "approval", "approval", errors)) return;
  if (approval.schema_version !== 1 || approval.corpus_version !== "voice-v1") errors.push(issue("approval", "version", "approval must be schema 1 and corpus voice-v1"));
  if (!['pending_owner_approval', 'approved'].includes(approval.status)) errors.push(issue("approval", "status", "approval status is invalid"));
  if (approval.status === "pending_owner_approval" && !(approval.owner === null && approval.hashes === null && approval.semantic_identity === null && approval.approved_at === null)) errors.push(issue("approval", "pending_shape", "pending approval cannot bind owner, hashes, identity, or time"));
  if (approval.status === "approved") {
    if (approval.owner !== "Justin" || !isSha256(approval.semantic_identity) || !isNonblank(approval.approved_at)) errors.push(issue("approval", "approved_shape", "approved record must name Justin, a SHA-256 identity, and approval time"));
    if (isNonblank(approval.approved_at)) {
      const parsed = Date.parse(approval.approved_at);
      const normalizedInput = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(approval.approved_at) ? approval.approved_at.replace(/Z$/, ".000Z") : approval.approved_at;
      if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== normalizedInput) errors.push(issue("approval", "approval_timestamp", "approved_at must be a real canonical UTC timestamp"));
      else if (parsed > nowMs) errors.push(issue("approval", "approval_future", "approved_at cannot be in the future"));
    }
    if (exactKeys(approval.hashes, ["rubric", "goldens", "anti_goldens", "thresholds"], "approval", "approval.hashes", errors) && Object.values(approval.hashes).some((hash) => !isSha256(hash))) errors.push(issue("approval", "approval_hash", "every approved hash must be lowercase SHA-256 hex"));
  }
}

export function deriveIdentity({ rubric, goldens, anti_goldens: antiGoldens }) {
  const hashes = {
    rubric: domainHash("rubric", rubric),
    goldens: domainHash("goldens", goldens),
    anti_goldens: domainHash("anti_goldens", antiGoldens),
    thresholds: domainHash("thresholds", rubric?.thresholds),
  };
  return { hashes, semantic_identity: domainHash("semantic_identity", { corpus_version: rubric?.corpus_version, hashes }) };
}

export function validateCorpus(input, { nowMs = Date.now() } = {}) {
  try {
    const errors = [];
    if (!isObject(input)) return { valid: false, readiness: "invalid", approved_semantic_identity: null, semantic_identity: null, hashes: null, errors: [issue("corpus", "object", "corpus input must be an object")] };
    canonicalJson(input);
    exactKeys(input, ARTIFACTS, "corpus", "corpus", errors);
    validateRubric(input.rubric, errors);
    validateGoldens(input.goldens, input.rubric, errors);
    validateAntiGoldens(input.anti_goldens, errors);
    validateApprovalShape(input.approval, errors, nowMs);
    if (errors.length > 0) return { valid: false, readiness: "invalid", approved_semantic_identity: null, semantic_identity: null, hashes: null, errors };
    const identity = deriveIdentity(input);
    const approval = input.approval;
    if (approval.status !== "approved") return { valid: true, readiness: "pending_owner_approval", approved_semantic_identity: null, ...identity, errors: [] };
    const mismatch = Object.keys(identity.hashes).find((key) => approval.hashes[key] !== identity.hashes[key]);
    if (mismatch) return { valid: true, readiness: "approval_invalid", approved_semantic_identity: null, ...identity, errors: [issue("approval", "hash_mismatch", `approved ${mismatch} hash does not match current content`)] };
    if (approval.semantic_identity !== identity.semantic_identity) return { valid: true, readiness: "approval_invalid", approved_semantic_identity: null, ...identity, errors: [issue("approval", "identity_mismatch", "approved semantic identity does not match current content")] };
    return { valid: true, readiness: "approved", approved_semantic_identity: identity.semantic_identity, ...identity, errors: [] };
  } catch (error) {
    const rule = error.rule === "non_json_value" ? error.rule : "internal_validation_error";
    return { valid: false, readiness: "invalid", approved_semantic_identity: null, semantic_identity: null, hashes: null, errors: [issue("corpus", rule, error instanceof Error ? error.message : String(error))] };
  }
}
