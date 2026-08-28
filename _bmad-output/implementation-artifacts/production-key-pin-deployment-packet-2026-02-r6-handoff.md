# Production Key-Pin Deployment Packet r6 Handoff

## Governing state

- Status: `UNAPPROVED`; preparation only.
- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6.json`
- Exact packet SHA-256: `91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34`
- Successor: r6 succeeds r5 only because two control-plane attempts stopped before any retained packet command. Across both attempts: retained prerequisites `0`, deploys `0`, Cloudflare observations `0`, application GETs `0`, tail processes `0`, provider calls `0`, and remote writes `0`. No r5 approval transfers to r6.
- This preparation performed no deploy, Cloudflare query, application GET, provider call, signing, activation, credential/private-key access, commit, push, source edit, sprint-status edit, or deferred-ledger edit.

## Independent r6 review requirement

The reviewer must independently recompute the exact packet SHA-256, inspect the packet bytes and every inherited artifact including the four ignored attempt evidence/handoff files, validate every literal command/parser/schema/path, and determine whether r6 is executable within its exact bounds. The review must be written at:

`/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-review.md`

An accepting review must contain exactly one verdict record and no other line beginning `ODDSPARK_R6_REVIEW_VERDICT=`. The accepting record must be exactly:

`ODDSPARK_R6_REVIEW_VERDICT=APPROVE packet_sha256=91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34`

Prose verdicts do not authorize execution. A changed packet invalidates this required line and requires a new review.

## Fresh owner approval and non-self-referential binding

The packet deliberately does not embed its own SHA-256. After an accepting independent review exists, fresh owner approval must be these exact UTF-8 bytes followed by one LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r6 with SHA-256 91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34 for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

Before ordinal 1, the control plane must place only that line plus LF in an ignored or outside-project execution record and externally establish:

- `APPROVED_PACKET_SHA256=91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34`
- `APPROVAL_RECORD_PATH=<absolute ignored/outside-project approval-record path>`
- `APPROVAL_TEXT_SHA256=<lowercase SHA-256 of the exact approval-record bytes>`

The execution record must retain those three values and the independently recomputed packet hash. Authority ordinals 1–3 then mechanically verify packet bytes, the exact review line, approval bytes, and approval-record hash. This external binding avoids an impossible self-hash contract.

## Exact execution algorithm

After the single external approval-binding verification above, the execution prompt may say only: verify external approval binding, then execute the ordered retained command list.

The runner must resolve the packet's 21-entry `ordered_retained_command_inventory` and invoke each literal `command` or `command_template` exactly once, strictly in ordinal order. It may apply only each entry's retained parser. No extra preflight, regex, jq expression, command, interpretation, stricter assumption, repair, retry, or substitution is allowed. Same-ID wait/poll/resume continues one invocation and must never create a replacement process. Only the deploy parser may produce `NEW_VERSION_ID`, and that exact value is the sole permitted later template substitution. Any failure or ambiguity stops all later ordinals and preserves terminal evidence without rollback.

## Changed authority-command inventory

Ordinals 1–9 are new literal, self-parsing authority commands:

1. Exact external packet SHA-256 match.
2. Exact single independent-review machine verdict match.
3. Exact approval bytes and approval-record SHA-256 binding.
4. Byte-for-byte `LC_ALL=C` sorted Git untracked-set equality.
5. All 23 inherited artifact hashes, including r5 packet/handoff/review and four ignored attempt evidence/handoff files.
6. Branch, HEAD, `origin/develop`, rotation ancestor, and tracked/index cleanliness.
7. Five exact source/config file hashes.
8. Exact `runtime-assembly.json` assembly identity.
9. Exact installed Wrangler `4.123.0` identity.

Ordinals 10–21 preserve r5's offline gates, dry run, two immediate pre-deploy observations, exact deploy bytes, three post-deploy observations, three GETs, and one 300-second one-process version-bound tail lifecycle. Operational temporary paths were renamed from r5 to r6; target, source/assembly/key identities, deploy message/bytes, Cloudflare observations, metadata contracts, request URLs/headers, side-effect caps, forbidden operations, honest observational limits, and same-ID continuation semantics are otherwise preserved.

## Allowlist and retained evidence

At execution time, `git ls-files --others --exclude-standard | LC_ALL=C sort` must equal the packet's exact 22-path list byte-for-byte: the prior 19 governed project artifacts plus r6 packet, handoff, and independent review. The four ignored governor-session r5 attempt evidence/handoff files are separately bound by hashes and must not appear in that Git output. The approval/execution record must likewise remain ignored or outside the project-artifact set.

## Preparation validation

- JSON parsed successfully; all referenced packet paths and inventory ordinals resolve against the actual schema.
- Inventory is contiguous `1..21`: 9 authority, 2 offline, 2 pre-deploy, 1 deploy, 3 post-deploy, 3 GET, and 1 tail command.
- Exact allowlist count is 22; inherited-hash count is 23; ignored attempt evidence count is 4.
- All literal shell command strings passed `bash -n` syntax validation.
- The two inherited jq boolean/length precedence defects were corrected fail-closed in r6 for deployment-status and custom-domain result arrays; the runtime assembly path is `.assembly_identity_sha256`.
- Safe preparation checks covered inherited/source hashes, Git/source/assembly/Wrangler identities, offline repository gates, exact dry-run parity, installed Wrangler 4.123.0 help, allowlist timing, whitespace, and secret-pattern absence. Remote commands were not invoked.

## Preserved limits

Wrangler cannot truthfully expose pending/running Workers Builds before they create remotely visible version/deployment state; `--strict` remains the executable conflict guard. Tail outcomes are invocation outcomes, not HTTP status, and cannot prove zero 5xx responses, provider inactivity, or inactive posture beyond absent activation bindings. The three GETs may cause at most two served-metric writes and two KV projection-repair writes total. Rollback is not authorized.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-handoff.md
