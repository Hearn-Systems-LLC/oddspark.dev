// Runtime-assembly identity: a deterministic hash over the canonical module
// graph (sorted module paths), each module's source hash, and — when present —
// the deployed entrypoint ({path, sha256}). It binds later gates to the exact
// assembled sources; it creates no approval or deployment authority. Reading
// and hashing the files is Node tooling (scripts/assembly-identity.mjs); this
// module only composes the identity.

import { canonicalJson, deepFreeze, sha256Hex } from "./contracts.mjs";

export const ASSEMBLY_IDENTITY_VERSION = 1;
export const ASSEMBLY_IDENTITY_DOMAIN = "oddspark-runtime-assembly/v1";

const MODULE_PATH = /^src\/pipeline\/[a-z][a-z0-9-]*\.mjs$/;
const ENTRYPOINT_PATH = /^src\/[a-z][a-z0-9-]*\.(?:mjs|js)$/;
const SHA256 = /^[a-f0-9]{64}$/;

// modules: [{path, sha256}] — one entry per canonical pipeline module.
// entrypoint: {path, sha256} | null — the deployed Worker entrypoint the
// assembly is bound to (Story 1.24); absent only in synthetic test projects.
export function computeAssemblyIdentity(modules, entrypoint = null) {
  if (!Array.isArray(modules) || modules.length === 0) throw new TypeError("assembly identity requires the canonical module list");
  const seen = new Set();
  for (const entry of modules) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)
        || Object.keys(entry).sort().join(",") !== "path,sha256") throw new TypeError("each module entry must be exactly {path, sha256}");
    if (!MODULE_PATH.test(entry.path ?? "") || seen.has(entry.path)) throw new TypeError(`invalid or duplicate module path: ${entry.path}`);
    if (!SHA256.test(entry.sha256 ?? "")) throw new TypeError(`invalid module source hash: ${entry.path}`);
    seen.add(entry.path);
  }
  if (entrypoint !== null) {
    if (typeof entrypoint !== "object" || Array.isArray(entrypoint)
        || Object.keys(entrypoint).sort().join(",") !== "path,sha256") throw new TypeError("entrypoint must be exactly {path, sha256} or null");
    if (!ENTRYPOINT_PATH.test(entrypoint.path ?? "")) throw new TypeError(`invalid entrypoint path: ${entrypoint.path}`);
    if (!SHA256.test(entrypoint.sha256 ?? "")) throw new TypeError("invalid entrypoint source hash");
    if (seen.has(entrypoint.path)) throw new TypeError("entrypoint must not duplicate a canonical module path");
  }
  const sorted = modules.map(({ path, sha256 }) => ({ path, sha256 })).sort((a, b) => (a.path < b.path ? -1 : 1));
  const identity = entrypoint
    ? { schema_version: ASSEMBLY_IDENTITY_VERSION, entrypoint: { path: entrypoint.path, sha256: entrypoint.sha256 }, modules: sorted }
    : { schema_version: ASSEMBLY_IDENTITY_VERSION, modules: sorted };
  return deepFreeze({
    ...identity,
    assembly_identity_sha256: sha256Hex(`${ASSEMBLY_IDENTITY_DOMAIN}\n${canonicalJson(identity)}`),
  });
}
