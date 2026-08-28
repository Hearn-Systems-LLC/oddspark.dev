# Oddspark production key-pin deployment packet r13 handoff

## Immutable identities

- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r13.json`
- Packet SHA-256: `2645be9a231de3ac128a20033eae764395f615eb0632d35ed571d454f657d1c4`
- Embedded runner SHA-256: `c3b0a968fd398388f171aac0250fb16b5ab6d4e38ffc5611b22ff6b13af8e7ec` (18,397 exact UTF-8 bytes)
- Handoff: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r13-handoff.md` (its final SHA-256 is reported with delivery because a file cannot contain its own cryptographic digest)
- Anticipated review: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r13-review.md`

The review must contain exactly one verdict line and no other `ODDSPARK_R13_REVIEW_VERDICT=` line:

`ODDSPARK_R13_REVIEW_VERDICT=APPROVE packet_sha256=2645be9a231de3ac128a20033eae764395f615eb0632d35ed571d454f657d1c4`

Only after that exact packet is independently accepted, fresh approval must be exactly these bytes including the final LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r13 with SHA-256 2645be9a231de3ac128a20033eae764395f615eb0632d35ed571d454f657d1c4 for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

No r12 or earlier approval transfers.

## Safe extraction and operator launch

Run only after the anticipated review exists and fresh approval has been retained at an ignored/outside-project absolute path. Use an unrestricted operator shell with local loopback, ambient Cloudflare variables, Node, jq, pinned Wrangler 4.123.0, and cwd `/Volumes/fast/Github/oddspark`.

```sh
umask 077 && jq -rj '.machine_runner.embedded_script' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r13.json > /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r13-runner.mjs && test "$(shasum -a 256 /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r13-runner.mjs | awk '{print $1}')" = "$(jq -r '.machine_runner.embedded_script_sha256' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r13.json)"
```

```sh
test -n "$APPROVED_PACKET_SHA256" && test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && test -n "$CLOUDFLARE_API_TOKEN" && test "$CLOUDFLARE_ACCOUNT_ID" = e72c232411bedeed357f3c73e4f4f0aa && ! tmux -L oddspark-production-key-pin-r13 has-session 2>/dev/null && tmux -L oddspark-production-key-pin-r13 new-session -d -s oddspark-production-key-pin-r13 "cd /Volumes/fast/Github/oddspark && exec node /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r13-runner.mjs"
```

Read-only watch:

```sh
tmux -L oddspark-production-key-pin-r13 attach-session -r -t oddspark-production-key-pin-r13
```

Do not patch, wrap, substitute, rehearse with, or invoke the live runner before exact review and fresh approval.

## Preparation validation matrix

| Boundary | Result |
|---|---|
| Packet JSON and 21 retained-command resolution | PASS |
| Retained shell literal syntax | PASS |
| Embedded Node syntax and self-hash | PASS |
| Independent Node and deterministic `jq -rj` runner extraction | PASS — both `c3b0a968fd398388f171aac0250fb16b5ab6d4e38ffc5611b22ff6b13af8e7ec`, 18,397 bytes |
| All 61 inherited project/ignored-record hashes, including all seven r12 terminal records | PASS |
| Current/future unique sorted allowlist: actual 40 plus r13 packet, handoff, anticipated review = 43 | PASS |
| Exact retained r12 ordinal-5 stdout replay: 5,555 bytes, SHA-256 `0b93dd6d7bbb9dca2474bbe96d7af6965e90ba6cb4a57c07bd85d7604b811123`, 54 exact ordered unique `<path>: OK` lines and final LF, exit 0, null signal, empty stderr | PASS |
| Ordinal-5 adversarial suite: 24 rejection classes covering missing/duplicate/reordered/extra/altered lines, failure and banners, whitespace/case/status, newline/encoding/ANSI/Unicode, truncation/trailing data, exit/signal/stderr | PASS |
| Exact retained r11 ordinal-10 stdout replay: 72,275 bytes, SHA-256 `9ca4a8c7c7d04af02a26ff25c26220019b41989a5777c430c70f156662d6c4db`, exit 0, null signal, empty stderr | PASS |
| Exact retained r11 ordinal-11 stdout replay: 1,016 bytes, SHA-256 `c029d781f293b37077d6981b9b3f2958c8aeb7e2fe37b9ba9fa7bb0ea469aa70`, exit 0, null signal, empty stderr | PASS |
| Exact retained r11 ordinal-13 stdout replay: 4,171 bytes, SHA-256 `7dd5a69829a95284243bccb1cced60be981b7c498eb9725ffd5173a5617e48bb`, exactly 10 entries, exit 0, null signal, empty stderr | PASS |
| Inherited ordinal-10/11/13 adversarial suites and all other parser fixtures; r12/r13 parity outside intended identity/path/cardinality and ordinal-5 changes | PASS |
| Wrangler 4.123.0 retained syntax, offline only | PASS |
| Side-effect caps, candidate rejection, evidence durability, stop/no-later-ordinal behavior, and isolated inherited-environment tmux | PASS |
| Secret/whitespace scan and exact two-project-file write boundary | PASS |
| Live runner or Cloudflare/application operation | NOT INVOKED |

## r12 terminal lineage

- r12 packet SHA-256: `a583c48307a6bcdc66cdf68267d4eb598fc4c598b91f32f1f89a2f7ff9d936cd`
- r12 handoff SHA-256: `9ca65c87fe76be674f1a512b7897da8b938cb5d2d2f9746d11a9b1babe7e6ffa`
- r12 review SHA-256: `c77579fa257d7d22a0616e16da1135f6807c1aa23a488f8d2dc9835ac5f7b685`
- r12 approval SHA-256: `52e6e0a229a54ae4b7071621f941095fd6b423d1366f98f241117f28dc616c60`
- r12 execution evidence SHA-256: `adc8594f0c4802a2ca5ff102db7608e27912816bbaaee535e9b25c8f36856a00`
- r12 execution handoff SHA-256: `afc1711000d67daa04702bee639299be50adb6595e9bcbab36e3aa3e5cd93003`
- r12 runner SHA-256: `675ec652bab8c30004504ecc8a87dd27ee686952122bb16078f687bb13416c10`
- r12 invoked ordinals 1-5 exactly once; 1-4 passed; ordinal 5 exited 0 with null signal, 5,555-byte stdout containing all 54 exact `<path>: OK` lines, empty stderr, then the empty-stdout parser rejected it terminally.
- Ordinals 6-21 invoked: zero. Cloudflare observations, deploys, smoke GETs, served/KV writes, provider calls, signing, activation, and rollback: zero.

## Limitations and boundary

r13 is unapproved preparation material. Fixture replay proves parser behavior over retained bytes only. It is not independent review, owner approval, current runtime authority, Cloudflare drift evidence, deployment proof, billing/provider provenance, signing, or activation authority. Wrangler syntax validation was offline only. Any mismatch or ambiguity at execution is terminal; there is no retry, substitution, repair-in-place, cleanup, or rollback authority.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r13-handoff.md
