# Production Key-Pin Deployment Packet r8 Handoff

## Governing state

- Status: `UNAPPROVED`; immutable offline preparation only.
- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r8.json`
- Exact r8 packet SHA-256: `00093a70bb1b0c2a5a3c60617d02f80641a6d8986c2d741b6b92e137a8eedc51`
- Exact embedded runner SHA-256: `3780c4f54ef2cf802fcc242587c04e3c74b4b6738ce8701c11ab6daa0e7acda4`
- r7 received `CHANGES_REQUIRED`; no r7 approval or live execution occurred. r8 binds the r7 packet, handoff, and complete review by exact SHA-256. No prior approval transfers.
- The future execution-time allowlist is exactly 28 unique bytewise-sorted paths: the actual current 25 paths observed before r8 creation plus exactly r8 packet, handoff, and anticipated review. r6 and r7 packet/handoff/review paths each occur once.

## Independent review and fresh approval

The independent review must be written to `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r8-review.md`, independently verify the exact packet and runner bytes, and contain exactly one machine verdict record. The exact accepting record is:

`ODDSPARK_R8_REVIEW_VERDICT=APPROVE packet_sha256=00093a70bb1b0c2a5a3c60617d02f80641a6d8986c2d741b6b92e137a8eedc51`

A changed packet invalidates that verdict. Fresh owner approval must be these exact UTF-8 bytes followed by one LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r8 with SHA-256 00093a70bb1b0c2a5a3c60617d02f80641a6d8986c2d741b6b92e137a8eedc51 for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

The unrestricted operator shell must place only that line plus LF in an ignored approval record and export `APPROVED_PACKET_SHA256`, `APPROVAL_RECORD_PATH`, and `APPROVAL_TEXT_SHA256`. This handoff does not authorize approval or execution.

## Exact extraction, launch, and observation

Run only from an unrestricted operator shell with local loopback permitted, cwd `/Volumes/fast/Github/oddspark`, Node and jq available, installed Wrangler `4.123.0`, and authorized ambient `CLOUDFLARE_API_TOKEN` plus exact `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa`. Never use a sandboxed model command tool.

Extract and hash-check the reviewed runner exactly once:

```sh
umask 077 && jq -rj '.machine_runner.embedded_script' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r8.json > /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r8-runner.mjs && test "$(shasum -a 256 /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r8-runner.mjs | awk '{print $1}')" = "$(jq -r '.machine_runner.embedded_script_sha256' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r8.json)"
```

Launch through a new dedicated tmux server that inherits the unrestricted operator process environment. The command string contains no secret value. Missing authority, a mismatched account, or an existing same-label server fails closed before runner launch:

```sh
test -n "$APPROVED_PACKET_SHA256" && test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && test -n "$CLOUDFLARE_API_TOKEN" && test "$CLOUDFLARE_ACCOUNT_ID" = e72c232411bedeed357f3c73e4f4f0aa && ! tmux -L oddspark-production-key-pin-r8 has-session 2>/dev/null && tmux -L oddspark-production-key-pin-r8 new-session -d -s oddspark-production-key-pin-r8 "cd /Volumes/fast/Github/oddspark && exec node /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r8-runner.mjs"
```

Watch read-only:

```sh
tmux -L oddspark-production-key-pin-r8 attach-session -r -t oddspark-production-key-pin-r8
```

## Validation matrix

| Gate | Result |
|---|---|
| Packet JSON, exact ordinals `1..21`, retained literal Bash syntax | PASS |
| Embedded runner SHA, Node syntax, deterministic extraction parity | PASS |
| Actual current set and exact 28-path future allowlist; uniqueness; r6/r7 once each | PASS |
| All 32 inherited project and ignored terminal artifact hashes | PASS |
| Ordinal 14 real predecessor identity and adversarial rejection | PASS |
| Full JSON observation semantics: traffic/version, inventory, message, six exact bindings/values, absent activation bindings, domain state | PASS |
| GET stdout, final headers, bodies, legacy sections/schema/identity, cross-view equality | PASS |
| Tail lifecycle/file/NDJSON semantics, zero error/canceled/exceptions, honest zero-event result | PASS |
| Separate preparation-only success/adversarial rehearsal: 40/40 assertions | PASS |
| Duplicate/missing allowlist; malformed/semantic JSON; wrong HTTP/cross-view; tail error/canceled/exception/malformed/early child; later-ordinal stop | PASS |
| Wrangler identity `4.123.0`; deploy/dry-run/tail flags and r6 deploy/dry-run parity | PASS |
| Same-child process accounting, early tail detection, no later ordinal after failure | PASS |
| Secret scan, whitespace, exact two-file write boundary | PASS |

Fixture bytes were temporary and separate from the embedded runner and never became live execution authority. No live runner or retained remote command was invoked during preparation.

## Retained boundaries and limitations

- Retained order remains 21 commands. The only authorized remote mutation is one strict deploy after fresh exact review and approval. Side-effect caps and forbidden activation, signing, provider, rollback, retry, substitution, commit, and push boundaries remain unchanged from r6.
- The operator shell must be unrestricted because the repository gate requires local loopback. The isolated tmux server inherits ambient variables present when it starts; r8 intentionally neither prints nor retains their values.
- Wrangler cannot prove a pending/running Workers Build that has not created observable version/deployment state; `--strict` remains the executable conflict gate.
- Tail invocation outcomes are not HTTP response status. Zero events means only `no invocation observed`; it does not prove traffic or provider inactivity.
- The three retained GETs permit at most two served-metric writes and two KV projection-repair writes. Rollback remains unauthorized.
- Preparation performed no Cloudflare/application operation, credential/private-key inspection, deploy, provider call, signing, activation, source/status/ledger edit, commit, or push.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r8-handoff.md
