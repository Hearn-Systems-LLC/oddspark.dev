# Oddspark production key-pin deployment packet r12 handoff

## Immutable identities

- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r12.json`
- Packet SHA-256: `a583c48307a6bcdc66cdf68267d4eb598fc4c598b91f32f1f89a2f7ff9d936cd`
- Embedded runner SHA-256: `675ec652bab8c30004504ecc8a87dd27ee686952122bb16078f687bb13416c10` (17,873 exact UTF-8 bytes)
- Handoff: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r12-handoff.md` (its final SHA-256 is reported with delivery because a file cannot contain its own cryptographic digest)
- Anticipated review: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r12-review.md`

The review must contain exactly one verdict line and no other `ODDSPARK_R12_REVIEW_VERDICT=` line:

`ODDSPARK_R12_REVIEW_VERDICT=APPROVE packet_sha256=a583c48307a6bcdc66cdf68267d4eb598fc4c598b91f32f1f89a2f7ff9d936cd`

Only after that exact packet is independently accepted, fresh approval must be exactly these bytes including the final LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r12 with SHA-256 a583c48307a6bcdc66cdf68267d4eb598fc4c598b91f32f1f89a2f7ff9d936cd for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

No r11 or earlier approval transfers.

## Safe extraction and operator launch

Run only after the anticipated review exists and fresh approval has been retained at an ignored/outside-project absolute path. Use an unrestricted operator shell with local loopback, ambient Cloudflare variables, Node, jq, pinned Wrangler 4.123.0, and cwd `/Volumes/fast/Github/oddspark`.

```sh
umask 077 && jq -rj '.machine_runner.embedded_script' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r12.json > /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r12-runner.mjs && test "$(shasum -a 256 /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r12-runner.mjs | awk '{print $1}')" = "$(jq -r '.machine_runner.embedded_script_sha256' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r12.json)"
```

```sh
test -n "$APPROVED_PACKET_SHA256" && test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && test -n "$CLOUDFLARE_API_TOKEN" && test "$CLOUDFLARE_ACCOUNT_ID" = e72c232411bedeed357f3c73e4f4f0aa && ! tmux -L oddspark-production-key-pin-r12 has-session 2>/dev/null && tmux -L oddspark-production-key-pin-r12 new-session -d -s oddspark-production-key-pin-r12 "cd /Volumes/fast/Github/oddspark && exec node /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r12-runner.mjs"
```

Read-only watch:

```sh
tmux -L oddspark-production-key-pin-r12 attach-session -r -t oddspark-production-key-pin-r12
```

Do not patch, wrap, substitute, rehearse with, or invoke the live runner before exact review and fresh approval.

## Preparation validation matrix

| Boundary | Result |
|---|---|
| Packet JSON and 21 retained-command resolution | PASS |
| Retained shell literal syntax | PASS |
| Embedded Node syntax and self-hash | PASS |
| Independent Node and deterministic `jq -rj` runner extraction | PASS — both `675ec652bab8c30004504ecc8a87dd27ee686952122bb16078f687bb13416c10`, 17,873 bytes |
| All 54 inherited project/ignored-record hashes | PASS |
| Current/future unique sorted allowlist: actual 37 plus r12 packet, handoff, anticipated review = 40 | PASS |
| Exact retained r11 ordinal-10 stdout replay: 72,275 bytes, SHA-256 `9ca4a8c7c7d04af02a26ff25c26220019b41989a5777c430c70f156662d6c4db`, exit 0, null signal, empty stderr | PASS |
| Exact retained r11 ordinal-11 stdout replay: 1,016 bytes, SHA-256 `c029d781f293b37077d6981b9b3f2958c8aeb7e2fe37b9ba9fa7bb0ea469aa70`, exit 0, null signal, empty stderr | PASS |
| Exact retained r11 ordinal-13 stdout replay: 4,171 bytes, SHA-256 `7dd5a69829a95284243bccb1cced60be981b7c498eb9725ffd5173a5617e48bb`, exactly 10 entries, exit 0, null signal, empty stderr | PASS |
| Ordinal-13 adversarial suite: 25 rejection/semantic classes covering cardinality, structure, IDs, metadata, production-ID confusion, duplicate objects, encoding/JSON, process terminal state, truncation, ANSI/Unicode/newlines, and operation ambiguity | PASS |
| Inherited ordinal-10/11 and all other parser fixtures; r11/r12 parity outside intended identity/path/cardinality and ordinal-13 changes | PASS |
| Wrangler 4.123.0 retained syntax, offline only | PASS |
| Side-effect caps, candidate rejection, evidence durability, stop/no-later-ordinal behavior, and isolated inherited-environment tmux | PASS |
| Secret/whitespace scan and exact two-project-file write boundary | PASS |
| Live runner or Cloudflare/application operation | NOT INVOKED |

## r11 terminal lineage

- r11 packet SHA-256: `87d139080dbc6e6ece8614c16dfa5bd5f2e916fcacbe98e5a4c3567e04f10489`
- r11 handoff SHA-256: `3d06634a790b5bab14c88c067959d4c6a1b5f50c90e5772d9e858f16319fbd8a`
- r11 review SHA-256: `832a3e7b868f1504b0c5c334bbf01aaada448d7a3f27229217f29a02d66db43b`
- r11 approval SHA-256: `a99a114c821ccc827f4256110bb5b00c90ba4ddba84df800bb2c3d9fc36bbe99`
- r11 execution evidence SHA-256: `37c17e5b1be18e7f4d1fa748a3b58a5d3da4657072d53012abd1131f6e7d85de`
- r11 execution handoff SHA-256: `b25aea53e79ec313fadc76d7d5cad450bb399df5daa3771aa4999fb4c4e2dc60`
- r11 runner SHA-256: `30ea188fe7d5940c9dd7b71f5f7801ad4d72f9c534858f01bf27c1056f3cb74b`
- r11 invoked ordinals 1-13 exactly once; 1-12 passed; ordinal 13 exited 0 with null signal, 4,171-byte valid ten-entry JSON stdout and empty stderr, then the latest-ten/current-production false-assumption parser rejected it terminally.
- Ordinals 14-21 invoked: zero. Cloudflare observations: exactly two. Deploys, smoke GETs, served/KV writes, provider calls, signing, activation, and rollback: zero.

## Limitations and boundary

r12 is unapproved preparation material. Fixture replay proves parser behavior over retained bytes only. It is not independent review, owner approval, current runtime authority, Cloudflare drift evidence, deployment proof, billing/provider provenance, signing, or activation authority. Wrangler syntax validation was offline only. The latest-ten inventory is an observation and does not claim that its historical `version_upload` annotations were caused by r12; ordinal 12 separately owns current-production identity. Any mismatch or ambiguity at execution is terminal; there is no retry, substitution, repair-in-place, cleanup, or rollback authority.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r12-handoff.md
