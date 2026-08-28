# Oddspark production key-pin deployment packet r10 handoff

## Immutable identities

- Packet: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r10.json`
- Packet SHA-256: `a85a715501c753545c69aa2174219c148a20676d681d88bbb819202e7bfee488`
- Embedded runner SHA-256: `99ee387a5fe860f24e982647467b87c3df073e0bc9f9315eaaf98c1cbc89694d` (14,934 exact UTF-8 bytes)
- Anticipated review: `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r10-review.md`

The review must contain exactly one verdict line and no other `ODDSPARK_R10_REVIEW_VERDICT=` line:

`ODDSPARK_R10_REVIEW_VERDICT=APPROVE packet_sha256=a85a715501c753545c69aa2174219c148a20676d681d88bbb819202e7bfee488`

Only after that exact packet is independently accepted, fresh approval must be exactly these bytes including the final LF:

`I approve exactly the independently reviewed Oddspark production key-pin deployment packet r10 with SHA-256 a85a715501c753545c69aa2174219c148a20676d681d88bbb819202e7bfee488 for one execution under its retained command list and side-effect caps; no prior packet approval is reused.`

No r9 or earlier approval transfers.

## Safe extraction and operator launch

Run only after the anticipated review exists and fresh approval has been retained at an ignored/outside-project absolute path. Use an unrestricted operator shell with local loopback, ambient Cloudflare variables, Node, jq, pinned Wrangler 4.123.0, and cwd `/Volumes/fast/Github/oddspark`.

```sh
umask 077 && jq -rj '.machine_runner.embedded_script' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r10.json > /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r10-runner.mjs && test "$(shasum -a 256 /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r10-runner.mjs | awk '{print $1}')" = "$(jq -r '.machine_runner.embedded_script_sha256' /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r10.json)"
```

```sh
test -n "$APPROVED_PACKET_SHA256" && test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && test -n "$CLOUDFLARE_API_TOKEN" && test "$CLOUDFLARE_ACCOUNT_ID" = e72c232411bedeed357f3c73e4f4f0aa && ! tmux -L oddspark-production-key-pin-r10 has-session 2>/dev/null && tmux -L oddspark-production-key-pin-r10 new-session -d -s oddspark-production-key-pin-r10 "cd /Volumes/fast/Github/oddspark && exec node /Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r10-runner.mjs"
```

Read-only watch:

```sh
tmux -L oddspark-production-key-pin-r10 attach-session -r -t oddspark-production-key-pin-r10
```

Do not patch, wrap, substitute, rehearse with, or invoke the live runner before exact review and fresh approval.

## Preparation validation matrix

| Boundary | Result |
|---|---|
| Packet JSON and 21 retained-command resolution | PASS |
| Retained shell literal syntax | PASS |
| Embedded Node syntax, externally recomputed SHA, deterministic extraction | PASS |
| Inherited project hashes plus ignored r9 approval/evidence/handoff hashes | PASS |
| Current/future unique sorted allowlist: actual 31 plus r10 packet, handoff, anticipated review = 34 | PASS |
| Exact retained r9 ordinal-10 stdout replay: 72,297 bytes, SHA-256 `1e7bbe597eda9f1c1864f7964e0d3eedbeda4b9f6a0d54862b787a0ca33b28ce` | PASS |
| Ordinal-10 adversarial cases: missing tail, omitted/duplicate/reordered phase, `fail 1`, nonzero exit, stderr, warning line, provider request, remote upload/deploy, truncation | PASS (13/13 including positive replay) |
| Other parser fixtures and r9/r10 operational parity outside successor identity/path/cardinality and ordinal-10 parser | PASS |
| Wrangler 4.123.0 retained syntax, offline only | PASS |
| Secret scan, whitespace, exact two-project-file write boundary | PASS |
| Live runner or Cloudflare/application operation | NOT INVOKED |

## r9 terminal lineage

- r9 approval SHA-256: `f1f8e6e3a9c099dee99369767e242123cc242760ec6c635153b248add5532104`
- r9 execution evidence SHA-256: `f46c5891f6521e2b1a27c1f252bccd85766bc0a2baceb0ebcc6402969890ac1c`
- r9 execution handoff SHA-256: `f3f394acd2cc46bd98aa6786449da26a01a5e8afd2a5b51c801fce1e3dabf935`
- r9 invoked ordinals 1-10 exactly once; 1-9 passed; ordinal 10 command exited 0 with 72,297-byte stdout and empty stderr, then the parser rejected it terminally.
- Ordinals 11-21 invoked: zero. Cloudflare observations, deploys, GETs, remote writes, provider calls, signing, activation, and rollback: zero.

## Limitations and boundary

r10 is unapproved preparation material. The fixture replay proves only parser behavior over retained bytes. It is not independent review, owner approval, current runtime authority, Cloudflare drift evidence, deployment proof, billing/provider provenance, signing, or activation authority. Any mismatch or ambiguity at execution is terminal; there is no retry, substitution, repair-in-place, cleanup, or rollback authority.

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r10-handoff.md
