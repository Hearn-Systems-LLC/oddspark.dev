# Terminal handoff — production key-pin deployment packet 2026-02 r5

Status: **UNAPPROVED IMMUTABLE SUCCESSOR PREPARED — REAL R5 REVIEW ABSENT — NO EXECUTION**

## Immutable r5 identity

- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5.json`
- Exact packet SHA-256: `3bdbe828fa5330a5358bd54a2a9565e96d20d75b22cfd3060034eb4dd2a8666f`
- Status: `unapproved`
- Source branch/HEAD/`origin/develop`: `develop` / `0e624016edd15a2308183f3ad0f045da05f5b728` / `0e624016edd15a2308183f3ad0f045da05f5b728`
- Runtime assembly: `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`
- Target: account `e72c232411bedeed357f3c73e4f4f0aa`, Worker `oddspark`, production custom domain `oddspark.dev`, config `/Volumes/fast/Github/oddspark/wrangler.toml`
- Wrangler: installed pinned `4.123.0`

r4 is treated as non-executable. Its pre-execution parser stopped before any command invocation: prerequisite `0`, deploy `0`, GET `0`, Cloudflare observation `0`, provider `0`; no r4 execution evidence or handoff was created. The r4 approval is invalid for r5 and must not be reused.

Only this handoff and the r5 packet were written. All 16 inherited governed artifacts were preserved byte-for-byte and pinned by exact SHA-256 in the packet. No source, review, predecessor, execution evidence, sprint status, deferred-work ledger, credential, private key, or other repository path was changed. No deployment, read-only Cloudflare query, application GET, provider call, activation, signing, retry, rollback, commit, or push occurred.

## Changed observational contract

r5 removes every prose-only required execution surface:

- Current production is bound immediately before deploy with literal `wrangler deployments status --json`; the parser requires one version, `d7bdc546-04a5-4ee5-bd4a-9406b03c255e`, at numeric `100` percent.
- The immediately adjacent `wrangler versions list --json` inventory is retained canonically and must contain the sole production version. No intervening operation is allowed before deploy.
- Wrangler/Cloudflare expose no truthful read-only command in the validated surfaces for pending/running Workers Builds activity. r5 removes the impossible freshness/activity claim. The hashed historical owner observation is evidence only, not current truth. The strongest executable invariant is the adjacent deployment/version snapshots plus the preserved deploy command's `--strict` conflict rejection. Pending activity that has not produced remote version/deployment conflict remains unobservable.
- Post-deploy `deployments status --json` binds the returned `NEW_VERSION_ID` as the sole 100% production version. `versions view "$NEW_VERSION_ID" --json` binds source, exact message, all six bindings and their values/types, and absence of `ACTIVATION_MANIFEST`/`ACTIVATION_SNAPSHOT`.
- The official read-only Workers Domains API command requires exactly one `oddspark.dev` result mapped to service `oddspark`; the token may be used ambiently but is never printed, inspected, hashed, sourced, or retained.
- The three retained smoke GET endpoints now capture final status, content type, headers, and body in exactly three GET invocations. They require exact 200/content-type results and mechanically parsed body contracts/cross-view equality.
- The 300-second command invokes `wrangler tail` once with `--format json`, all supported invocation statuses, and `--version-id "$NEW_VERSION_ID"`. Same-ID polling continues the one outer process; the one tail PID is never recreated.
- Tail proves only observed Worker invocation outcomes and exceptions. Invocation outcome is not HTTP response status, so r5 makes no zero-5xx claim. Tail has no provider-call identity field, so it cannot prove zero provider calls. Zero provider calls remains a hard authorization cap and explicitly unproved residual risk. Absent activation bindings prove only that those activation-authority bindings are absent, not broader runtime inactivity.

## Literal-command inventory

Every command-bearing surface contains a literal command/template, `invocation_count: 1`, exact expected exit, output schema, parser, same-ID polling rule, and terminal ambiguity rule:

1. Git/source/index pins.
2. Exact 19-path execution-time allowlist.
3. All 16 inherited SHA-256 checks.
4. Pinned Wrangler `4.123.0` check.
5. Offline repository gates.
6. Exact Wrangler deploy dry-run and six-binding parser.
7. Immediate current production deployment snapshot.
8. Immediate versions inventory.
9. Preserved exact deploy command and returned-version parser.
10. Sole 100% post-deploy status.
11. New-version metadata/message/bindings/activation-absence view.
12. Custom-domain state query.
13. Root HTML smoke GET.
14. Legacy text permalink smoke GET.
15. Legacy JSON view smoke GET.
16. Version-bound continuous 300-second tail.

Same-ID wait/poll/resume calls are continuation and are counted separately from invocation count. Loss of the exact ID, incomplete retained output, missing/multiple terminal status, early tail exit, parser ambiguity, or replacement/restart is terminal and never authorizes retry.

## Exact execution-time allowlist

The packet contains exactly 19 unique bytewise-sorted paths: the 16 preserved governed artifacts plus this r5 packet, this r5 handoff, and the anticipated real review at `_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5-review.md`. The gate deliberately cannot pass until that real review exists. Any missing path or any additional untracked path fails closed.

## Validation completed

- JSON parse: `PASS`.
- Packet SHA-256 recomputation: `PASS` — `3bdbe828fa5330a5358bd54a2a9565e96d20d75b22cfd3060034eb4dd2a8666f`.
- Sixteen inherited artifact hashes: `PASS` against current bytes.
- Allowlist model: `PASS` — exactly 19, unique, bytewise sorted; timing is 17 paths after packet creation, 18 after this handoff, and exactly 19 only after the anticipated review.
- Command surface completeness: `PASS` — 16 literal command-bearing surfaces; every one has invocation count, expected exit, output schema, parser, same-ID rule, and terminal ambiguity.
- Shell syntax: `PASS` under `bash -n` for every extracted literal command/template; commands were not executed.
- Pinned local Wrangler help: `PASS` — version `4.123.0`; confirmed JSON support for `deployments status/list`, `versions list/view`; confirmed `tail --format json --status ... --version-id ...`; confirmed deploy `--strict` remote-conflict semantics.
- Official Cloudflare documentation: `PASS` — deployments represent active traffic; real-time tail statuses differ from HTTP status; Workers Domains `GET /accounts/{account_id}/workers/domains` is the supported read-only custom-domain list surface.
- Deploy parity: `PASS` — exact r4 command bytes preserved, including target, source, assembly, message, `--strict`, and no `--env`.
- Boundary parity: `PASS` — expected bindings `6`, unexpected `0`, smoke GETs `3`, forbidden entries `10`, served-metric cap `2`, KV projection-repair cap `2`, all other authorized side effects `0`.
- `git diff --check`: `PASS` for both authorized r5 artifacts using no-index whitespace checks because both are intentionally untracked.
- Secret/private-material scan: `PASS`; the packet contains only public identifiers/hashes and the literal ambient variable name `CLOUDFLARE_API_TOKEN`, never a value.
- Live/read-only Cloudflare queries and application GETs during preparation: `0`.

## Limitations and residual risks

- No independent r5 review exists. r5 authorizes nothing until review acceptance and fresh exact-SHA approval.
- Workers Builds pending/running activity is not observable through the validated read-only Wrangler/API surfaces. r5 does not claim otherwise. There remains a race after the immediate snapshots; `--strict` is the supported conflict guard only when remote changes become conflicting.
- `versions list` returns at most the ten most recent deployable versions; it is a bounded current inventory, not complete version history. `deployments status` is authoritative for the sole active production traffic assertion.
- The custom-domain API requires an already-authorized ambient API token. Missing authority is terminal, not grounds to inspect credentials or substitute commands. It proves the custom-domain mapping, not absence of unrelated zone route records account-wide.
- Tail may retain zero events. That means only no invocation was observed in the version-filtered window. It proves neither no traffic nor no provider call, and it cannot prove HTTP 5xx absence.
- Binding absence proves the two activation-authority bindings are absent from the deployed version. Broader inactive/provider posture remains unproved remotely.
- Rollback remains separately unauthorized even after a post-deploy failure.

## Exact fresh approval sentence

`I approve exactly one execution of r5 packet SHA-256 3bdbe828fa5330a5358bd54a2a9565e96d20d75b22cfd3060034eb4dd2a8666f against Cloudflare account e72c232411bedeed357f3c73e4f4f0aa, Worker oddspark, using the exact retained commands and exactly one invocation of each retained prerequisite, Cloudflare observation, deploy, metadata check, smoke GET, and 300-second version-bound tail command, with same-ID waiting or polling counted separately as continuation and never as retry or re-invocation, and with aggregate caps of two served-metric writes and two KV projection-repair writes; I acknowledge r4 is non-executable, its approval does not authorize r5, Workers Builds pending/running activity and provider-call absence remain unobservable as stated, tail outcomes are not HTTP status, and I do not authorize POST, strike creation, other KV or Durable Object writes, signing, private-key access, activation, ACTIVATION_SNAPSHOT, ACTIVATION_MANIFEST, provider calls, retry, substitution, restart, rollback, or any command not literally retained in r5.`

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5-handoff.md
