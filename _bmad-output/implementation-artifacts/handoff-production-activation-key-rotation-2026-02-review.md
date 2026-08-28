# Independent Review: Production Activation Public-Key Rotation 2026-02

**Review Date:** 2026-08-26
**Commit Under Review:** [`e97f863912b2fc0cdfa17d58d6a50e4b68898fd5`](file:///Volumes/fast/Github/oddspark) on branch `develop` (`origin/develop`)
**Artifact Under Review:** [`_bmad-output/implementation-artifacts/handoff-production-activation-key-rotation-2026-02.md`](file:///Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/handoff-production-activation-key-rotation-2026-02.md)
**Review Verdict:** **`APPROVE`**

---

## Executive Summary

The production activation public key rotation from the superseded `oddspark-production-activation-2026-01` identity to the operator-generated `oddspark-production-activation-2026-02` identity is **correct, complete, narrowly scoped, strictly secret-safe, fail-closed, and fully verified by offline non-live evidence**.

Commit `e97f863912b2fc0cdfa17d58d6a50e4b68898fd5` cleanly advanced `develop` and was pushed to `origin/develop`. Exactly five files were changed in the commit, touching only the source-pinned trust map, exact test assertions, deterministic assembly identity, current governing documentation, and the operator handoff document. Historical planning and story records remain unaltered. The local working tree contains only the expected post-push metadata update recording the final commit SHA and push outcome in the handoff document.

---

## Findings Summary

| ID | Severity | Category | Description | Status |
|---|---|---|---|---|
| F-01 | INFO | Cryptographic Verification | Decoded Ed25519 SPKI DER and confirmed SHA-256 match `8e2f2502...` | Verified |
| F-02 | INFO | Trust Map Singleton | Verified singleton deeply frozen trust map in source and unit tests | Verified |
| F-03 | INFO | Assembly Identity Refresh | Verified deterministic `runtime-assembly.json` refresh (18 modules, no drift) | Verified |
| F-04 | INFO | Scope & Boundary | No private key material, secret leakage, or unauthorized actions | Verified |
| F-05 | INFO | Non-Live Gate Evidence | Verified `assembly:verify`, `release-decision:test`, and full `npm run check` | Verified |
| F-06 | INFO | Local Handoff Record | Confirmed post-push handoff metadata diff is accurate and terminal-bound | Verified |

*(No High, Medium, or Low severity findings / blockers identified)*

---

## Detailed Evaluation & Evidence

### 1. Scope & Commit Diff Authorization
- **Commit SHA:** `e97f863912b2fc0cdfa17d58d6a50e4b68898fd5`
- **Branch:** `develop` (matches `origin/develop` at `e97f863912b2fc0cdfa17d58d6a50e4b68898fd5`)
- **Committed Files (5 total):**
  1. [`src/pipeline/release-decision.mjs`](file:///Volumes/fast/Github/oddspark/src/pipeline/release-decision.mjs) (rotated trust map key ID and public SPKI)
  2. [`scripts/release-decision.test.mjs`](file:///Volumes/fast/Github/oddspark/scripts/release-decision.test.mjs) (updated test assertions and `Reflect.ownKeys` check)
  3. [`runtime-assembly.json`](file:///Volumes/fast/Github/oddspark/runtime-assembly.json) (updated SHA-256 for `release-decision.mjs` and assembly identity)
  4. [`docs/runtime-baseline.md`](file:///Volumes/fast/Github/oddspark/docs/runtime-baseline.md) (governing authority and trust map documentation)
  5. [`_bmad-output/implementation-artifacts/handoff-production-activation-key-rotation-2026-02.md`](file:///Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/handoff-production-activation-key-rotation-2026-02.md) (operator handoff record)
- **Historical Evidence Integrity:**
  Historical documents (including [`_bmad-output/implementation-artifacts/spec-1-26-atomic-local-only-activation.md`](file:///Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/spec-1-26-atomic-local-only-activation.md) and earlier sprint/story records) were left completely untouched, accurately preserving historical evidence of the prior 2026-01 state.

### 2. Singleton Frozen Trust Map Verification
- Source pin in [`src/pipeline/release-decision.mjs`](file:///Volumes/fast/Github/oddspark/src/pipeline/release-decision.mjs#L6-L8):
  ```javascript
  export const PRODUCTION_ACTIVATION_TRUST_KEYS = deepFreeze({
    "oddspark-production-activation-2026-02": "MCowBQYDK2VwAyEAh4GQdgxMP65vNfGmtKRBfb2Z4ayMCnzNvuvtsihM5pY",
  });
  ```
- Test pin in [`scripts/release-decision.test.mjs`](file:///Volumes/fast/Github/oddspark/scripts/release-decision.test.mjs#L102-L107):
  ```javascript
  assert.deepEqual(PRODUCTION_ACTIVATION_TRUST_KEYS, {
    "oddspark-production-activation-2026-02": "MCowBQYDK2VwAyEAh4GQdgxMP65vNfGmtKRBfb2Z4ayMCnzNvuvtsihM5pY",
  });
  assert.deepEqual(Reflect.ownKeys(PRODUCTION_ACTIVATION_TRUST_KEYS), ["oddspark-production-activation-2026-02"]);
  assert.equal(Object.isFrozen(PRODUCTION_ACTIVATION_TRUST_KEYS), true);
  ```
- The key ID and SPKI string match identically across source and tests. The trust map is deeply frozen and strictly constrained to exactly one key property.

### 3. Cryptographic SPKI & DER SHA-256 Verification
An independent Node.js module evaluation of the base64url SPKI was performed:
- **Base64url SPKI:** `MCowBQYDK2VwAyEAh4GQdgxMP65vNfGmtKRBfb2Z4ayMCnzNvuvtsihM5pY`
- **DER Byte Length:** 44 bytes (standard Ed25519 SPKI ASN.1 DER encoding)
- **DER SHA-256 Digest:** `8e2f2502d2ab783de6fb558663aa86ffd69c2d7f4a3fa98c2f2108358a047e6b`
- **Key Type:** `ed25519` asymmetric public key verified via `node:crypto.createPublicKey`
- **Digest Agreement:** Exact match with owner specification and documentation.

### 4. Deterministic Runtime-Assembly Refresh
- [`runtime-assembly.json`](file:///Volumes/fast/Github/oddspark/runtime-assembly.json) was refreshed strictly for the single modified module:
  - `src/pipeline/release-decision.mjs` SHA-256 changed from `95f3b69df...` to `b3f4fdfbf5af2c329a8cc994d7068656e7e2fb3dee43dea02a279a957c3e23ae`.
  - Assembly identity hash updated to `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`.
  - All other 17 modules and the entrypoint retained their exact SHA-256 hashes without any drift.
- `npm run assembly:verify` independently passed with:
  `OK runtime-assembly identity 0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6 matches (18 runtime-neutral modules)`

### 5. Test Suite & Quality Gates
- `npm run release-decision:test`: **PASS** (12/12 tests passing).
- `npm run assembly:verify`: **PASS** (18 modules matching identity).
- `npm run check`: **PASS** in full across all 21 sub-commands (activation tests, release-decision tests, baseline tests, baseline verify, spike self-tests, semantic tests, priors/evidence/contracts/receipts/rendering tests, house-briefs verify, composite gate tests, strike orchestrator tests, type-checking, configuration checks, and reader-preflight tests).
- All checks were executed non-live without provider calls, network mutations, deployment, activation, or signing.

### 6. Secret Safety & Fail-Closed Boundary
- **Secret Boundary:** No private keys, PEM contents, seed material, or secrets were committed, staged, or accessed. The operator metadata reference `/Users/justin/.config/oddspark/keys/oddspark-production-activation-2026-02.pem` exists solely as filesystem path metadata.
- **Fail-Closed Stance:** Unit tests verify that unsigned, mis-signed, forged, expired, unknown-key, and corrupted snapshots fail closed with designated failure codes (`activation_snapshot_key_unknown`, `activation_snapshot_signature_invalid`, etc.).
- **Local Working Tree:** The only unstaged change is the expected post-push recording of the commit SHA `e97f863912b2fc0cdfa17d58d6a50e4b68898fd5` and push status in [`_bmad-output/implementation-artifacts/handoff-production-activation-key-rotation-2026-02.md`](file:///Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/handoff-production-activation-key-rotation-2026-02.md).

---

## Remaining Gates & Operational State

The rotation is currently **source-pinned only** on branch `develop` (`origin/develop`). Production operations remain strictly gated and inactive:

1. **Deployment Gate:** The updated source pin on `develop` must be separately deployed by the owner to Cloudflare Workers before production runtime incorporates the new key pin.
2. **External Signing Gate:** External signing of an exact activation payload using the operator's private key `oddspark-production-activation-2026-02.pem` has not occurred and requires separate explicit owner action.
3. **Activation Gate:** The production `ACTIVATION_SNAPSHOT` Worker binding remains absent; setting the binding requires separate one-shot activation authorization.
4. **Merge Gate:** Merge from `develop` to `main` remains a separate gate.

---

## Conclusion & Verdict

**VERDICT: `APPROVE`**

The 2026-02 production activation key rotation is verified and approved for its authorized scope.
