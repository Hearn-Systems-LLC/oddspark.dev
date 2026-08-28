# Production Key-Pin Deployment Packet r9 Handoff

## Governing state

- Status: `UNAPPROVED`; immutable offline preparation only.
- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r9.json`
- Exact r9 packet SHA-256: `d7b6335f8bfb1dac60e476b3b1ac47decec8a0530ca8275bee4d400887bfbfa9`
- Exact embedded runner SHA-256: `3da811f2c3fa356b73d1543032d4eb306a0d0cb88020469c6a925364049f4e52`
- r8 passed independent review and the owner approved the exact r8 packet SHA-256 `00093a70bb1b0c2a5a3c60617d02f80641a6d8986c2d741b6b92e137a8eedc51`, but no retained r8 command or live operation was launched. That r8 approval remains unconsumed and non-transferable, does not authorize r9, and must not be reused as r9 execution authority.
- The execution-time allowlist is exactly 31 unique bytewise-sorted paths: the actual 28 untracked paths observed before r9 creation plus exactly the future r9 packet, handoff, and anticipated review paths. At completed preparation time, 30 paths exist and only the anticipated r9 review is absent.

## Independent review and fresh approval

The independent review must be written to `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r9-review.md`, independently verify the exact packet and runner bytes, and contain exactly one machine verdict record. The exact accepting record is:

`ODDSPARK_R9_REVIEW_VERDICT=APPROVE packet_sha256=d7b6335f8bfb1dac60e476b3b1ac47decec8a0530ca8275bee4d400887bfbfa9`

A changed packet invalidates every prior packet approval and review verdict. Fresh owner approval must be these exact UTF-8 bytes followed by one LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r9 with SHA-256 d7b6335f8bfb1dac60e476b3b1ac47decec8a0530ca8275bee4d400887bfbfa9 for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

The unrestricted operator shell must place only that line plus LF in an ignored or outside-project approval record and export `APPROVED_PACKET_SHA256`, `APPROVAL_RECORD_PATH`, and `APPROVAL_TEXT_SHA256`. This handoff does not authorize approval or execution.

## Exact extraction, launch, and observation

Run only from an unrestricted operator shell with local loopback permitted, cwd `/Volumes/fast/Github/oddspark`, Node and jq available, installed Wrangler `4.123.0`, and authorized ambient `CLOUDFLARE_API_TOKEN` plus exact `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa`. Never use a sandboxed model command tool.

Extract and hash-check the reviewed runner exactly once:

```sh
umask 077 && jq -rj '.machine_runner.embedded_script' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r9.json > /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r9-runner.mjs && test "$(shasum -a 256 /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r9-runner.mjs | awk '{print $1}')" = "$(jq -r '.machine_runner.embedded_script_sha256' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r9.json)"
```

Launch through a new dedicated tmux server that inherits the unrestricted operator process environment. The command string contains no secret value. Missing authority, a mismatched account, or an existing same-label server fails closed before runner launch:

```sh
test -n "$APPROVED_PACKET_SHA256" && test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && test -n "$CLOUDFLARE_API_TOKEN" && test "$CLOUDFLARE_ACCOUNT_ID" = e72c232411bedeed357f3c73e4f4f0aa && ! tmux -L oddspark-production-key-pin-r9 has-session 2>/dev/null && tmux -L oddspark-production-key-pin-r9 new-session -d -s oddspark-production-key-pin-r9 "cd /Volumes/fast/Github/oddspark && exec node /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r9-runner.mjs"
```

Watch read-only:

```sh
tmux -L oddspark-production-key-pin-r9 attach-session -r -t oddspark-production-key-pin-r9
```

## r7/r8 reference classification

- Legitimate immutable lineage/history: `successor_of.consumed_packet`, `consumed_packet_sha256`, and the successor reason name r8 as the independently reviewed and exactly approved predecessor whose approval remains unconsumed/non-transferable because no retained r8 command or live operation was launched; they name r7 only as the stale identity defect found inside r8.
- Legitimate retained identity: r7 and r8 packet, handoff, and review paths/hashes remain in `inherited_artifact_sha256`, the ordinal-5 retained hash command, and the exact execution-time allowlist.
- Legitimate operational history: the preserved r6 parity statement and all older artifact names/hashes remain historical evidence, never current r9 authority.
- Defect classification: no remaining r7/r8 reference appears in a current approval template, review template, r9 authority command, parser path, stop condition, runner path, tmux label, execution evidence path, preparation review path, or current cardinality claim.

## Validation matrix

| Gate | Result |
|---|---|
| Packet JSON; exact ordinals `1..21`; all 21 retained shell literals | PASS |
| Embedded runner SHA; Node syntax; deterministic extraction/hash parity | PASS |
| Actual now/future set and exact 31-path allowlist; uniqueness; sorted parity | PASS |
| All 35 inherited project and ignored terminal artifact hashes | PASS |
| Exact r9 review line, exact approval bytes, packet hash, and malformed authority rejection | PASS |
| Ordinal 14 real predecessor identity and adversarial rejection | PASS |
| Full JSON observation parsers: traffic/version, inventory, message, six bindings/values, absent activation bindings, domain | PASS |
| GET stdout, final headers, bodies, legacy sections/schema/identity, cross-view equality | PASS |
| Tail lifecycle/file/NDJSON semantics, zero error/canceled/exceptions, honest zero-event result | PASS |
| Separate preparation-only success/adversarial rehearsal: 40/40 assertions | PASS |
| Duplicate/missing allowlist; malformed/semantic JSON; wrong HTTP/cross-view; tail error/canceled/exception/malformed/early child; later-ordinal stop | PASS |
| Wrangler identity `4.123.0`; offline help syntax; deploy/dry-run command parity with r6 | PASS |
| Same-child process accounting, terminal stop, no later ordinal after failure, evidence durability schema | PASS |
| Stale r7/r8 current-authority scan, secret scan, whitespace, exact two-project-file write boundary | PASS |

Fixture bytes remained temporary and separate from the embedded runner and never became live execution authority. The live runner and every retained Cloudflare/application command were not invoked.

## Retained boundaries and limitations

- Retained order remains 21 commands. The only operation described by the packet is one strict deploy after a fresh exact independent r9 review and fresh owner approval. This preparation grants neither.
- Side-effect caps and forbidden activation, signing, provider, rollback, retry, substitution, commit, and push boundaries remain unchanged from r8.
- The operator shell must be unrestricted because the repository gate requires local loopback. The isolated tmux server inherits ambient variables present when it starts; r9 neither prints nor retains their values.
- Wrangler cannot prove a pending or running Workers Build that has not created observable version/deployment state; `--strict` remains the executable conflict gate.
- Tail invocation outcomes are not HTTP response status. Zero events means only `no invocation observed`; it does not prove traffic or provider inactivity.
- The three retained GETs permit at most two served-metric writes and two KV projection-repair writes. Rollback remains unauthorized.
- Preparation performed no Cloudflare/application operation, credential/private-key access, deploy, GET, provider call, signing, activation, source/status/ledger edit, commit, or push.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r9-handoff.md
