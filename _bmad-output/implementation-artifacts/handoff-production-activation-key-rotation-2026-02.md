# Production activation key rotation 2026-02 handoff

## Outcome

PASS. The source-pinned production activation public key was rotated from the
superseded 2026-01 identity to the operator-generated 2026-02 identity. The
exact production trust map remains a deeply frozen singleton. The deterministic
runtime-assembly identity was refreshed and verified. Historical evidence was
preserved.

This rotation does not authorize or perform signing, deployment, activation,
provider execution, live qualification, retry, rollback, or a `main` merge.

## Exact changed paths

- `src/pipeline/release-decision.mjs`
- `scripts/release-decision.test.mjs`
- `runtime-assembly.json`
- `docs/runtime-baseline.md`
- `_bmad-output/implementation-artifacts/handoff-production-activation-key-rotation-2026-02.md`

No status, ledger, historical evidence, generated result, dependency, harness,
secret, or private-key file was changed.

## Public identity rotation

- Superseded key ID: `oddspark-production-activation-2026-01`
- Superseded public SPKI base64url:
  `MCowBQYDK2VwAyEARHw4lHZum5v0FkNakqeIbOxAMDoMHMKbl9IS0Fknxcg`
- Superseded public SPKI DER SHA-256:
  `17cc333e3c59953bad278a2138ff53c579a793ec48f698dffabc780784fd450e`
- New key ID: `oddspark-production-activation-2026-02`
- New public SPKI base64url:
  `MCowBQYDK2VwAyEAh4GQdgxMP65vNfGmtKRBfb2Z4ayMCnzNvuvtsihM5pY`
- New public SPKI DER SHA-256:
  `8e2f2502d2ab783de6fb558663aa86ffd69c2d7f4a3fa98c2f2108358a047e6b`
- Rotation status: source-pinned for delivery to `develop`;
  undeployed and inactive.
- New runtime-assembly identity:
  `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`
  over 18 runtime-neutral modules.

## Operator-only private-key metadata

- Path metadata only:
  `/Users/justin/.config/oddspark/keys/oddspark-production-activation-2026-02.pem`
- Expected ownership and mode: `justin:staff`, `0600`
- Boundary: the private-key file was not opened, read, copied, hashed, printed,
  transformed, staged, or committed. No private key bytes are present here.

## Verification and results

- Initial branch/worktree: `develop`, tracking `origin/develop`; only this
  task's prior untracked handoff was present and no overlapping changes existed.
- Occurrence reconciliation: current authority was rotated in source, its exact
  test expectation, and current runtime documentation. The Story 1.26 record and
  prior activation-preparation request remain unchanged as historical evidence.
- Public-key boundary: decoding and hashing the supplied public SPKI reproduced
  the supplied SHA-256 exactly.
- `npm run assembly:freeze`: PASS; deterministically updated only
  `runtime-assembly.json`.
- `npm run assembly:verify`: PASS; 18 modules, identity
  `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`.
- `npm run release-decision:test`: PASS, 12/12.
- `npm run check`: PASS in full after rerunning with permission for Wrangler's
  local diagnostic log. The initial sandboxed attempt reached `check:types` and
  stopped only on `EPERM` writing that log; no code gate failed.
- `git diff --check`: PASS.
- Explicit changed-file review: PASS; exactly the five paths listed above.
- Private-material diff scan: PASS; no private-key material markers or bytes.
- Independent read-only review: PASS with no implementation findings; it
  confirmed the exact singleton/frozen trust map, generated identity boundary,
  historical-evidence preservation, allowlist, and secret boundary.

## Commit and push

- Commit SHA: pending atomic commit; the final local handoff will record it.
- Push result: pending normal push to `origin/develop`; the final local handoff
  will record it.

## Remaining gates

The new source pin must be separately deployed before production runs it.
External signing approval for exact payload bytes, one-shot activation approval
for an exact packet and target, and any rollback or code-deployment authority
remain separate owner gates. Production must remain inactive until those gates
are explicitly supplied and independently verified.
