# Production public-key pin deployment packet handoff — 2026-02

Status: **unapproved; prepared only; no deployment, signing, activation, provider call, live qualification, retry, rollback, or remote mutation occurred.**

## Retained packet

- Packet: `_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02.json`
- Packet contract: `oddspark-production-public-key-pin-deployment-packet/v1`
- Exact packet SHA-256: `2215f584154fc592dae2c3d9d7ec243c34f3f226676c7c9d64256b827cad1f70`
- Source: clean `develop` and `origin/develop` at `0e624016edd15a2308183f3ad0f045da05f5b728`
- Rotation commit: `e97f863912b2fc0cdfa17d58d6a50e4b68898fd5`
- Assembly: `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`
- Public key: `oddspark-production-activation-2026-02`; SPKI DER SHA-256 `8e2f2502d2ab783de6fb558663aa86ffd69c2d7f4a3fa98c2f2108358a047e6b`

## Exact target and one-shot command

Target: Cloudflare account `e72c232411bedeed357f3c73e4f4f0aa`, existing Worker `oddspark`, production custom domain `oddspark.dev`, exact config `/Volumes/fast/Github/oddspark/wrangler.toml`.

```sh
CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-production-key-pin-2026-02.log npx --no-install wrangler deploy --config /Volumes/fast/Github/oddspark/wrangler.toml --name oddspark --strict --message 'production key pin 2026-02; source 0e624016edd15a2308183f3ad0f045da05f5b728; assembly 0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6'
```

Do not add `--env production`: the root config has no `[env.production]`, and that flag would select an alternate named Worker. The account, absolute config, and name are pinned explicitly. Run the command once only after every packet prerequisite is freshly rechecked and the exact packet-SHA approval below is recorded.

## Checks performed

- Live Git: **PASS** — branch `develop`; HEAD and `origin/develop` both exact; clean before artifact creation; rotation commit is an ancestor.
- `npm run writer:preflight`: **PASS** — exact 18-module assembly; projection identity; approved bundled content; inactive config; absent/malformed activation leaves writer null; no remote resource mutation.
- `npm run assembly:verify`: **PASS** — exact assembly identity.
- `WRANGLER_LOG_PATH=/tmp/oddspark-wrangler-check.log npm run check`: **PASS** — full offline repository gate. The first sandboxed attempt reached `check:types` and was blocked only by denied local loopback/log output; the authorized rerun passed.
- Exact pinned deploy dry run with `--strict`: **PASS** — Wrangler `4.123.0`; no upload; inventory exactly `METER`, `COORD`, `SPARKS`, `AI`, `AI_MODEL`, `AI_MODEL_FALLBACK`; no activation authority.
- Final verification required after artifact creation: JSON parse/canonical-byte check, packet hash, `git diff --check` limited to these two files, and private/secret-material scan.

## Read-only live observations

Cloudflare deployment metadata was queried read-only. The latest deployment still assigns `d7bdc546-04a5-4ee5-bd4a-9406b03c255e` at 100 percent. Version `130` is Wrangler-originated, has no preview, and exposes exactly the six expected bindings. `ACTIVATION_SNAPSHOT` and `ACTIVATION_MANIFEST` are absent.

Owner-observed Cloudflare dashboard evidence records: Git repository `Hearn-Systems-LLC/oddspark.dev`; production branch `main`; deploy command `npx wrangler deploy`; non-production branch builds enabled with version command `npx wrangler versions upload`; root directory `/`; no deploy hooks. Therefore `develop` can automatically upload an unpromoted version but cannot automatically change production traffic. Before approval and execution, the operator must re-verify every exact setting and confirm there is no conflicting pending or running build/version upload. Any drift aborts this packet.

## Post-deploy and failure boundary

The packet binds capture of the single returned version ID; proof that it alone is at 100 percent; exact source/assembly deployment annotations; exact six-binding inventory with snapshot/manifest absent; unchanged custom domain; the exact GET-only checks below; inactive `activation_snapshot_missing` posture; and zero unexpected 5xx attributable to the version during a retained 300-second observation window.

| Method | Exact URL | Exact request headers | Required response and contract | Maximum authorized side effects |
|---|---|---|---|---|
| `GET` | `https://oddspark.dev/` | `Accept: text/html` | `200`; `Content-Type: text/html; charset=utf-8`; production root renders successfully | zero metric writes; zero projection repairs |
| `GET` | `https://oddspark.dev/s/632dcc0b` | `Accept: text/plain`; `User-Agent: curl/oddspark-key-pin-verifier` | `200`; `Content-Type: text/plain; charset=utf-8`; retained pre-1.14 legacy view losslessly contains headline, premise, question, provenance rows, and seed formula | one served-metric write; one KV projection repair |
| `GET` | `https://oddspark.dev/api/spark/632dcc0b` | `Accept: application/json` | `200`; `Content-Type: application/json; charset=utf-8`; identifies retained artifact `632dcc0b` and agrees losslessly with the text permalink on legacy identity and contract | one served-metric write; one KV projection repair |

Execute each GET exactly once and no other application request. The aggregate authorization cap is **at most two served-metric writes and at most two KV projection-repair writes total**. Zero POST, strike creation, other KV write, other Durable Object write, provider call, signing, activation, retry, or rollback is authorized.

Any failure is terminal for this packet: stop, preserve evidence, do not retry, and request separate rollback authority.

## Authorization boundaries and limitations

This packet authorizes nothing while `status` is `unapproved`. A later approval can authorize exactly one execution of the exact command against the exact packet SHA and the capped GET-only verification side effects above. It does not authorize POST, strike creation, other KV or Durable Object writes, signing, activation, `ACTIVATION_SNAPSHOT`, `ACTIVATION_MANIFEST`, provider calls, live qualification, retry, traffic/resource/binding changes outside the deployment, or rollback.

The verified safe rollback candidate is current version `d7bdc546-04a5-4ee5-bd4a-9406b03c255e`; its exact Wrangler rollback command is retained in the JSON. That command is **not authorized** and requires a new exact rollback packet and fresh owner approval, even if post-deploy verification fails.

The earlier packet and `_bmad-output/implementation-artifacts/handoff-production-key-pin-deployment-packet-2026-02-review.md` required an unretained, mutating POST smoke. That review artifact is preserved unchanged as superseded historical evidence; it is not review or approval authority for these amended bytes.

## Exact owner approval statement

`I approve exactly one execution of packet SHA-256 2215f584154fc592dae2c3d9d7ec243c34f3f226676c7c9d64256b827cad1f70 against Cloudflare account e72c232411bedeed357f3c73e4f4f0aa, Worker oddspark, using the exact retained command and exactly one execution of each retained GET check with aggregate caps of two served-metric writes and two KV projection-repair writes; I do not authorize POST, strike creation, other KV or Durable Object writes, signing, activation, ACTIVATION_SNAPSHOT, ACTIVATION_MANIFEST, provider calls, retry, or rollback.`
