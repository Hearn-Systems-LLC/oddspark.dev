# Production Key-Pin Deployment Packet r7 Handoff

## Governing state

- Status: `UNAPPROVED`; immutable preparation only.
- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r7.json`
- Exact r7 packet SHA-256: `b5186ff64c87057ee896339bacd06cd7704aef0889283ece4a53c9b02b26023d`
- r6 is consumed. It invoked authority ordinals 1-9 successfully and ordinal 10 once; ordinal 10 exited 1 on sandbox-denied local loopback during `wrangler types`. Ordinals 11-21 were not invoked. All live/external boundary counts were zero.
- r7 binds the r6 packet, handoff, review, approval, terminal evidence, and terminal handoff by exact SHA-256. No r6 approval transfers.

## Independent review and fresh approval

Exact accepting review record:

`ODDSPARK_R7_REVIEW_VERDICT=APPROVE packet_sha256=b5186ff64c87057ee896339bacd06cd7704aef0889283ece4a53c9b02b26023d`

The review must be written to `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r7-review.md`, contain exactly one r7 verdict record, and independently verify packet and runner bytes. A changed packet invalidates the verdict.

Fresh owner approval must be these exact UTF-8 bytes followed by one LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r7 with SHA-256 b5186ff64c87057ee896339bacd06cd7704aef0889283ece4a53c9b02b26023d for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

The unrestricted operator shell must place only that line plus LF in an ignored approval record and export `APPROVED_PACKET_SHA256`, `APPROVAL_RECORD_PATH`, and `APPROVAL_TEXT_SHA256`. This handoff does not authorize execution.

## Exact runner extraction, launch, and observation

Run from an unrestricted root/operator shell with local loopback permitted, cwd `/Volumes/fast/Github/oddspark`, installed Wrangler `4.123.0`, Node and jq, and ambient Cloudflare authority only at execution time. Never use a sandboxed model command tool. No agent may interpret or reconstruct an ordinal.

After exporting the three fresh approval bindings, extract and hash-check exactly once:

```sh
umask 077 && jq -rj '.machine_runner.embedded_script' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r7.json > /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r7-runner.mjs && test "$(shasum -a 256 /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r7-runner.mjs | awk '{print $1}')" = "$(jq -r '.machine_runner.embedded_script_sha256' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r7.json)"
```

Launch in durable tmux:

```sh
test -n "$APPROVED_PACKET_SHA256" && test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && tmux new-session -d -s oddspark-production-key-pin-r7 "cd /Volumes/fast/Github/oddspark && exec env APPROVED_PACKET_SHA256='$APPROVED_PACKET_SHA256' APPROVAL_RECORD_PATH='$APPROVAL_RECORD_PATH' APPROVAL_TEXT_SHA256='$APPROVAL_TEXT_SHA256' node /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r7-runner.mjs"
```

Watch read-only:

```sh
tmux attach-session -r -t oddspark-production-key-pin-r7
```

The retained runner resolves packet entries directly, invokes ordinals exactly once in order, waits on the same child PID, captures streams/timestamps/exits/hashes, obtains `NEW_VERSION_ID` only from ordinal 14, and stops before later ordinals on failure. Ordinal 21 preserves one parent and one tail child for 300 seconds. Evidence and handoff go only to ignored governor-session paths.

## Preparation validation

- JSON, ordinals `1..21`, Bash syntax, embedded Node syntax, deterministic extraction, and runner hash parity passed.
- The execution-time allowlist is exactly 25 bytewise-sorted paths: the prior 22 plus r7 packet, handoff, and anticipated review.
- All 29 inherited hashes passed, including exact r6 approval/evidence/handoff.
- Wrangler `4.123.0` identity and local deploy/tail help syntax passed with logs redirected to `/private/tmp`; no remote operation occurred.
- Deploy bytes/parser/message and all operational boundaries retain r6 parity except r7 temporary filenames.
- A preparation-only temporary fixture replaced command bodies outside live runner bytes. Its offline rehearsal invoked all 21 ordinals once, produced one fixture `NEW_VERSION_ID`, and recorded boundary counts 5 Cloudflare observations, 3 smoke GETs, 1 tail parent, and 1 tail child.
- Secret inspection and `git diff --check` passed. Preparation performed no deploy, Cloudflare observation, application GET, provider call, remote write, signing, activation, rollback, commit, push, source/status/ledger edit, or credential/private-key access.

## Residual risks

- Wrangler cannot prove absent pending/running Workers Builds without remote observation; retained `--strict` remains the executable conflict gate.
- Tail outcomes are invocation outcomes, not HTTP status, and cannot prove zero 5xx responses or provider inactivity.
- Three retained GETs can cause at most two served-metric writes and two KV projection-repair writes. Rollback is unauthorized.
- Unrestricted operator execution is mandatory because ordinal 10 requires local loopback. A sandboxed model runner can reproduce r6's environmental failure and consume fresh approval.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r7-handoff.md
