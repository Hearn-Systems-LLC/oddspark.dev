# Oddspark production key-pin deployment packet r11 handoff

## Immutable identities

- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r11.json`
- Packet SHA-256: `87d139080dbc6e6ece8614c16dfa5bd5f2e916fcacbe98e5a4c3567e04f10489`
- Embedded runner SHA-256: `30ea188fe7d5940c9dd7b71f5f7801ad4d72f9c534858f01bf27c1056f3cb74b` (16,471 exact UTF-8 bytes)
- Handoff: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r11-handoff.md` (its final SHA-256 is reported with delivery because a file cannot contain its own cryptographic digest)
- Anticipated review: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r11-review.md`

The review must contain exactly one verdict line and no other `ODDSPARK_R11_REVIEW_VERDICT=` line:

`ODDSPARK_R11_REVIEW_VERDICT=APPROVE packet_sha256=87d139080dbc6e6ece8614c16dfa5bd5f2e916fcacbe98e5a4c3567e04f10489`

Only after that exact packet is independently accepted, fresh approval must be exactly these bytes including the final LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r11 with SHA-256 87d139080dbc6e6ece8614c16dfa5bd5f2e916fcacbe98e5a4c3567e04f10489 for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

No r10 or earlier approval transfers.

## Safe extraction and operator launch

Run only after the anticipated review exists and fresh approval has been retained at an ignored/outside-project absolute path. Use an unrestricted operator shell with local loopback, ambient Cloudflare variables, Node, jq, pinned Wrangler 4.123.0, and cwd `/Volumes/fast/Github/oddspark`.

```sh
umask 077 && jq -rj '.machine_runner.embedded_script' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r11.json > /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r11-runner.mjs && test "$(shasum -a 256 /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r11-runner.mjs | awk '{print $1}')" = "$(jq -r '.machine_runner.embedded_script_sha256' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r11.json)"
```

```sh
test -n "$APPROVED_PACKET_SHA256" && test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && test -n "$CLOUDFLARE_API_TOKEN" && test "$CLOUDFLARE_ACCOUNT_ID" = e72c232411bedeed357f3c73e4f4f0aa && ! tmux -L oddspark-production-key-pin-r11 has-session 2>/dev/null && tmux -L oddspark-production-key-pin-r11 new-session -d -s oddspark-production-key-pin-r11 "cd /Volumes/fast/Github/oddspark && exec node /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r11-runner.mjs"
```

Read-only watch:

```sh
tmux -L oddspark-production-key-pin-r11 attach-session -r -t oddspark-production-key-pin-r11
```

Do not patch, wrap, substitute, rehearse with, or invoke the live runner before exact review and fresh approval.

## Preparation validation matrix

| Boundary | Result |
|---|---|
| Packet JSON and 21 retained-command resolution | PASS |
| Retained shell literal syntax | PASS |
| Embedded Node syntax and self-hash | PASS |
| Independent Node and deterministic `jq -rj` runner extraction | PASS — both `30ea188fe7d5940c9dd7b71f5f7801ad4d72f9c534858f01bf27c1056f3cb74b`, 16,471 bytes |
| All 47 inherited project/ignored-record hashes | PASS |
| Current/future unique sorted allowlist: actual 34 plus r11 packet, handoff, anticipated review = 37 | PASS |
| Exact retained r9 ordinal-10 stdout replay: 72,297 bytes, SHA-256 `1e7bbe597eda9f1c1864f7964e0d3eedbeda4b9f6a0d54862b787a0ca33b28ce` | PASS |
| Exact retained r10 ordinal-11 stdout replay: 1,016 bytes, SHA-256 `c029d781f293b37077d6981b9b3f2958c8aeb7e2fe37b9ba9fa7bb0ea469aa70`, exit 0, null signal, empty stderr | PASS |
| Ordinal-11 adversarial suite: 29 rejection classes including upload/deploy/version ambiguity, table mutations, encoding/newline variants, and terminal/trailing-output failures | PASS |
| All other parser fixtures and r10/r11 parity outside intended identity/path/cardinality and ordinal-11 parser changes | PASS |
| Wrangler 4.123.0 retained syntax, offline only | PASS |
| Side-effect caps, candidate rejection, evidence durability, stop/no-later-ordinal behavior, and isolated inherited-environment tmux | PASS |
| Secret/whitespace scan and exact two-project-file write boundary | PASS |
| Live runner or Cloudflare/application operation | NOT INVOKED |

## r10 terminal lineage

- r10 packet SHA-256: `a85a715501c753545c69aa2174219c148a20676d681d88bbb819202e7bfee488`
- r10 handoff SHA-256: `2e9d463dfbe4e42c207c2428f3f1ae75cb1c0a431a09fa36b666e9e9361e5acd`
- r10 review SHA-256: `0c1d326236a2b24b9ea3b09d415df0a368188b4d43d34aad11eb7afb8c692dc0`
- r10 approval SHA-256: `8020d45f0bea901eb344747662490ba8894bcab200db10c23328e19dfd358460`
- r10 execution evidence SHA-256: `7c1f5644052533a78afdd31247392dfe0fcc4a19c25bb476db605290608b4e02`
- r10 execution handoff SHA-256: `b2bf9d82d50730ac6a35bf8621115a0db2feaeb7b188579351b52ac7c8e4c1bc`
- r10 invoked ordinals 1-11 exactly once; 1-10 passed; ordinal 11 exited 0 with null signal, 1,016-byte stdout, and empty stderr, then the parser rejected it terminally.
- Ordinals 12-21 invoked: zero. Cloudflare observations, deploys, application GETs, served/KV writes, provider calls, signing, activation, and rollback: zero.

## Limitations and boundary

r11 is unapproved preparation material. Fixture replay proves parser behavior over retained bytes only. It is not independent review, owner approval, current runtime authority, Cloudflare drift evidence, deployment proof, billing/provider provenance, signing, or activation authority. Wrangler syntax validation was offline only. Any mismatch or ambiguity at execution is terminal; there is no retry, substitution, repair-in-place, cleanup, or rollback authority.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r11-handoff.md
