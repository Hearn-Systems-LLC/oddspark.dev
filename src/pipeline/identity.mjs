// Runtime-assembly identity: a deterministic hash over the canonical module
// graph (sorted module paths) and each module's source hash. It binds later
// gates to the exact assembled sources; it creates no approval or deployment
// authority. Reading and hashing the files is Node tooling
// (scripts/assembly-identity.mjs); this module only composes the identity.

import { canonicalJson, deepFreeze, sha256Hex } from "./contracts.mjs";

export const ASSEMBLY_IDENTITY_VERSION = 1;
export const ASSEMBLY_IDENTITY_DOMAIN = "oddspark-runtime-assembly/v1";

const MODULE_PATH = /^src\/pipeline\/[a-z][a-z0-9-]*\.mjs$/;
const SHA256 = /^[a-f0-9]{64}$/;

// modules: [{path, sha256}] — one entry per canonical pipeline module.
export function computeAssemblyIdentity(modules) {
  if (!Array.isArray(modules) || modules.length === 0) throw new TypeError("assembly identity requires the canonical module list");
  const seen = new Set();
  for (const entry of modules) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)
        || Object.keys(entry).sort().join(",") !== "path,sha256") throw new TypeError("each module entry must be exactly {path, sha256}");
    if (!MODULE_PATH.test(entry.path ?? "") || seen.has(entry.path)) throw new TypeError(`invalid or duplicate module path: ${entry.path}`);
    if (!SHA256.test(entry.sha256 ?? "")) throw new TypeError(`invalid module source hash: ${entry.path}`);
    seen.add(entry.path);
  }
  const sorted = modules.map(({ path, sha256 }) => ({ path, sha256 })).sort((a, b) => (a.path < b.path ? -1 : 1));
  const identity = { schema_version: ASSEMBLY_IDENTITY_VERSION, modules: sorted };
  return deepFreeze({
    ...identity,
    assembly_identity_sha256: sha256Hex(`${ASSEMBLY_IDENTITY_DOMAIN}\n${canonicalJson(identity)}`),
  });
}
