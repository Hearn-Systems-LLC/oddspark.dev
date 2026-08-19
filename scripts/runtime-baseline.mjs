#!/usr/bin/env node
// Runtime identity freeze/verify for Story 1.2.
//
// Later live-evidence stories bind their manifests to `runtime_identity_sha256`,
// so any change to the pinned Wrangler/workerd version, the compatibility date
// or flags, the root/offline/spike configs, or the generated bindings must fail
// this check loudly rather than silently invalidating that evidence.
//
// Node built-ins only, on purpose: no runtime dependency (including a TOML
// library) may sit between the repo and its own identity.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 'oddspark.runtime-baseline/v1';
export const BASELINE_FILE = 'runtime-baseline.json';

const ROOT_CONFIG = 'wrangler.toml';
const OFFLINE_CONFIG = 'wrangler.offline.toml';
const SPIKE_CONFIG = 'spikes/judge-fidelity/wrangler.toml';
const TYPES_FILE = 'worker-configuration.d.ts';
const LOCK_FILE = 'package-lock.json';
// Alternate root config names Wrangler discovers implicitly; none may shadow wrangler.toml.
const SHADOW_CONFIGS = ['wrangler.json', 'wrangler.jsonc'];

// Top-level keys read out of a config. Anything below the first `[section]`
// header belongs to that section and is deliberately not parsed here.
const FLAT_KEYS = ['name', 'main', 'compatibility_date', 'compatibility_flags', 'preview_urls'];

export class BaselineError extends Error {}

function read(root, rel) {
  const path = join(root, rel);
  if (!existsSync(path)) throw new BaselineError(`missing required file: ${rel}`);
  return readFileSync(path, 'utf8');
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

// Strips a trailing `#` comment that is outside of any quoted string.
function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '#') {
      return line.slice(0, i);
    }
  }
  return line;
}

// Splits on commas that are at depth zero, so an inline table nested inside an
// array (`[{ a = 1, b = 2 }]`) survives as a single element.
function splitTopLevel(inner) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    if (ch === '[' || ch === '{') depth += 1;
    if (ch === ']' || ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (quote) throw new BaselineError(`unterminated string in TOML value: ${inner}`);
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Marker for an inline table; its contents are inspected, not modelled. */
class InlineTable {
  constructor(text) {
    this.text = text;
  }
}

export function parseTomlValue(raw, context = 'value') {
  const value = raw.trim();
  if (value === '') throw new BaselineError(`empty TOML ${context}`);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);

  if (value[0] === '"' || value[0] === "'") {
    const quote = value[0];
    const end = value.indexOf(quote, 1);
    if (end === -1) throw new BaselineError(`unterminated string in TOML ${context}: ${value}`);
    if (value.slice(end + 1).trim() !== '') {
      throw new BaselineError(`trailing content after string in TOML ${context}: ${value}`);
    }
    return value.slice(1, end);
  }

  if (value[0] === '[') {
    if (!value.endsWith(']')) {
      throw new BaselineError(`multi-line arrays are not supported in TOML ${context}: ${value}`);
    }
    return splitTopLevel(value.slice(1, -1)).map((part) => parseTomlValue(part, 'array element'));
  }

  if (value[0] === '{') {
    if (!value.endsWith('}')) {
      throw new BaselineError(`multi-line inline table in TOML ${context}: ${value}`);
    }
    return new InlineTable(value);
  }

  throw new BaselineError(`unparseable TOML ${context}: ${value}`);
}

const REMOTE_TRUE = /(^|[,{\s])remote\s*=\s*true(\s*[,}]|\s*$)/;

// Minimal, intentionally partial TOML reader: flat top-level keys before the
// first section header, which sections exist, and which of them declare
// `remote = true`. Anything it cannot parse confidently is an error, never a
// guess — a wrong identity must not be freezable.
export function parseConfig(text) {
  const flat = {};
  const sections = new Set();
  const remoteSections = new Set();
  const seenTopLevelKeys = new Set();
  let current = null;

  for (const rawLine of text.split('\n')) {
    const line = stripComment(rawLine).trim();
    if (!line) continue;

    const header = line.match(/^\[\[?\s*([A-Za-z0-9_.-]+)\s*\]\]?$/);
    if (header) {
      current = header[1].split('.')[0];
      sections.add(current);
      continue;
    }
    if (/^\[/.test(line)) throw new BaselineError(`unparseable TOML section header: ${line}`);

    const eq = line.indexOf('=');
    if (current !== null) {
      // Inside a section: only `remote` attribution matters here. Lines without
      // `=` are continuation lines of a multi-line array or table value (for
      // example a long `new_sqlite_classes = [` list under `[[migrations]]`);
      // they carry nothing this reader records, so they are skipped rather than
      // rejected.
      if (eq !== -1 && REMOTE_TRUE.test(line)) remoteSections.add(current);
      continue;
    }
    if (eq === -1) throw new BaselineError(`unparseable TOML line: ${line}`);
    const key = line.slice(0, eq).trim();
    const rest = line.slice(eq + 1);

    if (seenTopLevelKeys.has(key)) throw new BaselineError(`duplicate top-level TOML key: ${key}`);
    seenTopLevelKeys.add(key);

    const value = parseTomlValue(rest, `value for \`${key}\``);
    if (value instanceof InlineTable) {
      // `ai = { binding = "AI", remote = true }` declares the [ai] section.
      const name = key.split('.')[0];
      sections.add(name);
      if (REMOTE_TRUE.test(value.text)) remoteSections.add(name);
      continue;
    }
    if (Array.isArray(value) && value.some((item) => item instanceof InlineTable)) {
      const name = key.split('.')[0];
      sections.add(name);
      if (value.some((item) => item instanceof InlineTable && REMOTE_TRUE.test(item.text))) {
        remoteSections.add(name);
      }
      continue;
    }
    if (key.includes('.')) {
      // `ai.binding = "AI"` / `ai.remote = true` declare the [ai] table just as
      // a header would; record the section and attribute `remote` to it.
      const name = key.split('.')[0];
      sections.add(name);
      if (key.endsWith('.remote') && value === true) remoteSections.add(name);
      continue;
    }
    if (key === 'route' || key === 'routes') {
      // Top-level `route = "..."` / `routes = ["..."]` bind routes without a
      // [[routes]] table; the isolation rules must see them the same way.
      sections.add('routes');
      continue;
    }
    if (FLAT_KEYS.includes(key)) flat[key] = value;
  }

  return {
    flat,
    sections: [...sections].sort(),
    remoteSections: [...remoteSections].sort(),
    remote: remoteSections.size > 0,
  };
}

function configFacts(root, rel) {
  const text = read(root, rel);
  const { flat, sections, remoteSections, remote } = parseConfig(text);
  return {
    sha256: sha256(text),
    name: flat.name ?? null,
    main: flat.main ?? null,
    compatibility_date: flat.compatibility_date ?? null,
    compatibility_flags: flat.compatibility_flags ?? [],
    preview_urls: flat.preview_urls ?? null,
    sections,
    remote_sections: remoteSections,
    has_remote_binding: remote,
  };
}

function lockVersion(lock, pkg) {
  const entry = lock.packages?.[`node_modules/${pkg}`];
  if (!entry?.version) throw new BaselineError(`package-lock.json has no node_modules/${pkg} version`);
  return entry.version;
}

function readJson(root, rel) {
  const text = read(root, rel);
  try {
    return { text, value: JSON.parse(text) };
  } catch (error) {
    throw new BaselineError(`${rel} is not valid JSON: ${error.message}`);
  }
}

export function computeIdentity(root) {
  const { value: pkg } = readJson(root, 'package.json');
  const { text: lockText, value: lock } = readJson(root, LOCK_FILE);

  const configs = {
    root: configFacts(root, ROOT_CONFIG),
    offline: configFacts(root, OFFLINE_CONFIG),
    spike: configFacts(root, SPIKE_CONFIG),
  };

  const identity = {
    schema_version: SCHEMA_VERSION,
    wrangler: pkg.devDependencies?.wrangler ?? null,
    workerd: lockVersion(lock, 'workerd'),
    node_engines: pkg.engines?.node ?? null,
    compatibility_date: configs.root.compatibility_date,
    compatibility_flags: configs.root.compatibility_flags,
    main: configs.root.main,
    configs,
    package_lock_sha256: sha256(lockText),
    worker_types_sha256: sha256(read(root, TYPES_FILE)),
  };

  const lockedWrangler = lockVersion(lock, 'wrangler');
  if (identity.wrangler !== lockedWrangler) {
    throw new BaselineError(
      `wrangler pin drift: package.json ${identity.wrangler} vs package-lock.json ${lockedWrangler}`,
    );
  }

  identity.runtime_identity_sha256 = sha256(`${SCHEMA_VERSION}\n${canonicalJson(identity)}`);
  return identity;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const body = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',');
    return `{${body}}`;
  }
  return JSON.stringify(value ?? null);
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortDeep(value[k])]));
  }
  return value;
}

// Isolation rules the configs must satisfy regardless of what is frozen.
// These are structural invariants, not drift: `freeze` refuses to record a
// violating tree and `verify` fails on one.
export function checkIsolation(root) {
  const violations = [];
  const rootCfg = configFacts(root, ROOT_CONFIG);
  const offline = configFacts(root, OFFLINE_CONFIG);
  const spike = configFacts(root, SPIKE_CONFIG);

  if (offline.sections.includes('ai')) {
    violations.push('offline config must not declare an [ai] binding (no callable production AI in dev)');
  }
  if (offline.has_remote_binding) {
    violations.push(
      `offline config must not declare \`remote = true\` (found on: ${offline.remote_sections.join(', ')})`,
    );
  }
  for (const section of ['kv_namespaces', 'durable_objects', 'routes']) {
    if (spike.sections.includes(section)) {
      violations.push(`spike config must not declare [${section}]`);
    }
  }
  if (spike.name === rootCfg.name) {
    violations.push(`spike config name must differ from the production Worker name (${rootCfg.name})`);
  }
  for (const [label, cfg] of [['offline', offline], ['spike', spike]]) {
    if (cfg.sections.includes('env')) {
      violations.push(`${label} config must not declare [env.*] sections (bindings are non-inheritable)`);
    }
  }
  if (rootCfg.remote_sections.includes('kv_namespaces')) {
    violations.push('root config must not set `remote = true` on [[kv_namespaces]] (bare `wrangler dev` would use production KV)');
  }
  if (rootCfg.preview_urls !== true) {
    violations.push('root config must set top-level `preview_urls = true`');
  }
  for (const shadow of SHADOW_CONFIGS) {
    if (existsSync(join(root, shadow))) {
      violations.push(`${shadow} must not exist: Wrangler would read it instead of the frozen ${ROOT_CONFIG}`);
    }
  }
  return violations;
}

function flatten(value, prefix = '') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [[prefix, canonicalJson(value)]];
}

export function verify(root) {
  const frozenPath = join(root, BASELINE_FILE);
  if (!existsSync(frozenPath)) {
    return { ok: false, drift: [], violations: [`${BASELINE_FILE} is missing; run \`npm run baseline:freeze\``] };
  }
  let frozen;
  try {
    frozen = JSON.parse(readFileSync(frozenPath, 'utf8'));
  } catch (error) {
    return { ok: false, drift: [], violations: [`${BASELINE_FILE} is not valid JSON: ${error.message}`] };
  }
  if (!frozen || typeof frozen !== 'object' || Array.isArray(frozen)) {
    return { ok: false, drift: [], violations: [`${BASELINE_FILE} must contain a JSON object`] };
  }

  let actual;
  try {
    actual = computeIdentity(root);
  } catch (error) {
    if (error instanceof BaselineError) return { ok: false, drift: [], violations: [error.message] };
    throw error;
  }

  const expected = { ...frozen };
  delete expected.frozen_at;
  delete expected.frozen_from_commit;
  delete expected.base_commit;
  delete expected.source_state;

  const expectedFlat = new Map(flatten(expected));
  const actualFlat = new Map(flatten(actual));
  const drift = [];
  for (const key of new Set([...expectedFlat.keys(), ...actualFlat.keys()])) {
    const want = expectedFlat.get(key);
    const got = actualFlat.get(key);
    if (want !== got) drift.push({ field: key, expected: want ?? '(absent)', actual: got ?? '(absent)' });
  }
  drift.sort((a, b) => a.field.localeCompare(b.field));

  const violations = checkIsolation(root);
  return { ok: drift.length === 0 && violations.length === 0, drift, violations, identity: actual };
}

export function freeze(root) {
  const violations = checkIsolation(root);
  if (violations.length > 0) {
    throw new BaselineError(`refusing to freeze a config that violates isolation:\n  ${violations.join('\n  ')}`);
  }
  const identity = computeIdentity(root);
  let commit;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    throw new BaselineError(`could not read git HEAD in ${root}: ${error.message}`);
  }
  const record = sortDeep({
    ...identity,
    frozen_at: new Date().toISOString(),
    frozen_from_commit: commit,
    base_commit: commit,
    source_state: 'current hashes bind the uncommitted worktree; base_commit is provenance only',
  });
  writeFileSync(join(root, BASELINE_FILE), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

// The one line that legitimately differs between a normal `wrangler types` run
// and a check run is Wrangler's own provenance comment, which embeds the output
// path it was invoked with. Everything else — including every declared binding —
// is compared byte for byte.
const PROVENANCE_LINE = /^\/\/ Generated by Wrangler by running .*$/m;

function normalizeTypes(buffer) {
  return buffer.toString('utf8').replace(PROVENANCE_LINE, '// Generated by Wrangler');
}

// Inspect a `wrangler deploy --dry-run` transcript (stdout + stderr). Pure so
// the failure branches are unit-testable without spawning Wrangler. The
// binding-table sanity check guards the negative `env.AI` assertion: an
// output that never printed the table (format change, silent no-op) must not
// count as "AI absent".
export function inspectDryRun(output, { expectAi }) {
  const problems = [];
  if (output.includes('WARNING')) problems.push('dry run emitted a WARNING');
  if (output.includes('Unexpected fields')) problems.push('dry run reported unexpected config fields');
  const table = output.replaceAll(/^\s+/gm, '');
  if (!/^env\.SPARKS\b/m.test(table)) {
    problems.push('binding table not found in dry-run output (expected env.SPARKS); cannot judge env.AI');
    return problems;
  }
  const hasAi = /^env\.AI\b/m.test(table);
  if (expectAi && !hasAi) problems.push('expected env.AI in the binding table but it is absent');
  if (!expectAi && hasAi) problems.push('env.AI must not appear in the offline binding table');
  return problems;
}

export function typesCheck(root, generatedPath) {
  const committedPath = join(root, TYPES_FILE);
  if (!existsSync(committedPath)) return { ok: false, reason: `${TYPES_FILE} is not committed` };
  if (!existsSync(generatedPath)) return { ok: false, reason: `generated types not found at ${generatedPath}` };
  const committed = readFileSync(committedPath);
  const generated = readFileSync(generatedPath);
  if (normalizeTypes(committed) === normalizeTypes(generated)) return { ok: true };
  return {
    ok: false,
    reason: `${TYPES_FILE} differs from freshly generated types; run \`npm run types\` and commit the result`,
  };
}

function main(argv) {
  const [command] = argv;
  const root = process.cwd();

  if (command === 'freeze') {
    const record = freeze(root);
    console.log(`froze ${BASELINE_FILE} at commit ${record.frozen_from_commit}`);
    console.log(`runtime_identity_sha256 ${record.runtime_identity_sha256}`);
    return 0;
  }

  if (command === 'verify') {
    const result = verify(root);
    for (const violation of result.violations) console.error(`isolation: ${violation}`);
    for (const item of result.drift) {
      console.error(`drift: ${item.field}\n  expected ${item.expected}\n  actual   ${item.actual}`);
    }
    if (!result.ok) return 1;
    console.log(`runtime baseline OK`);
    console.log(`runtime_identity_sha256 ${result.identity.runtime_identity_sha256}`);
    return 0;
  }

  console.error('usage: runtime-baseline.mjs <freeze|verify>');
  return 2;
}

// Decode the URL and resolve both sides through realpath rather than comparing
// `import.meta.url` to an interpolated `file://${argv[1]}`: a checkout path with
// a space (percent-encoded in the URL) or reached through a symlink would fail
// that naive compare, and the CLI would silently exit 0 having checked nothing.
function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof BaselineError ? error.message : error);
    process.exit(1);
  }
}
