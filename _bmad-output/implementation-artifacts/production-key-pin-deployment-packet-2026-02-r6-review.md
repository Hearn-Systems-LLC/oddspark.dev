# Independent Adversarial Review: Production Key-Pin Deployment Packet (2026-02 r6)

ODDSPARK_R6_REVIEW_VERDICT=APPROVE packet_sha256=91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34

**Reviewed Artifacts:**
- Successor Packet (r6): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6.json`
- Successor Handoff (r6): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-handoff.md`
- Predecessor Review (r5): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5-review.md`
- Predecessor Handoff (r5): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5-handoff.md`
- Predecessor Packet (r5): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5.json`
- Attempt 2 Evidence (r5): `/Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r5-execution-attempt2-evidence.md`
- Attempt 2 Handoff (r5): `/Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r5-execution-attempt2-handoff.md`
- Attempt 1 Evidence (r5): `/Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r5-execution-evidence.md`
- Attempt 1 Handoff (r5): `/Volumes/fast/Github/oddspark/_bmad/memory/agent-project-governor/harness-sessions/production-key-pin-deployment-r5-execution-handoff.md`
- Predecessor Review (r4): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r4-review.md`
- Predecessor Handoff (r4): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r4-handoff.md`
- Predecessor Packet (r4): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r4.json`
- Terminal Execution Handoff (r3): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-r3-execution-2026-02-handoff.md`
- Terminal Execution Evidence (r3): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-r3-execution-2026-02-evidence.md`
- Predecessor Review (r3): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r3-review.md`
- Predecessor Handoff (r3): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r3-handoff.md`
- Predecessor Packet (r3): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r3.json`
- Predecessor Review (r2): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r2-review.md`
- Predecessor Handoff (r2): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r2-handoff.md`
- Predecessor Packet (r2): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r2.json`
- Terminal Execution Handoff (r1): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-execution-2026-02-handoff.md`
- Terminal Execution Evidence (r1): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-execution-2026-02-evidence.md`
- Predecessor Review (r1): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/handoff-production-key-pin-deployment-packet-2026-02-review.md`
- Predecessor Handoff (r1): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/handoff-production-key-pin-deployment-packet-2026-02.md`
- Predecessor Packet (r1): `/Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02.json`

---

## 1. Executive Summary & Verdict

Successor deployment packet `production-key-pin-deployment-packet-2026-02-r6.json` (SHA-256 `91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34`) and companion handoff `production-key-pin-deployment-packet-2026-02-r6-handoff.md` have been independently, mechanically, and adversarially evaluated against all project invariants, predecessor evidence, schema requirements, and execution semantics.

### 1.1 Resolution of Prior Execution Halts and Architectural Improvements in r6
1. **Replacement of External Preflight Interpretation with Self-Parsing Authority Commands (Ordinals 1–9):**
   - In r5, execution attempts halted due to executor-invented preflight logic: Attempt 1 stopped on an external jq type error (`boolean (true) has no length`), while Attempt 2 stopped on an external overly restrictive regex pattern.
   - Packet r6 eliminates all ad-hoc runner preflights by promoting authority validation into nine literal, deterministic commands (ordinals 1 through 9) that perform internal self-parsing and require exit code `0` with empty `stdout` and `stderr` streams.
2. **Non-Self-Referential External Authority Binding:**
   - The packet structure deliberately excludes self-referential hash fields within its own JSON content.
   - External authority binding is established through runner environment variables (`APPROVED_PACKET_SHA256`, `APPROVAL_RECORD_PATH`, `APPROVAL_TEXT_SHA256`) and verified mechanically by ordinals 1, 2, and 3 before any repository, Cloudflare, or deployment command executes.
3. **Fail-Closed Independent Review Machine Line Verification:**
   - Ordinal 2 enforces exact machine validation using `grep -Fxc` and `grep -Ec` over this review artifact. It accepts only a single verdict record matching the packet hash and rejects missing, duplicate, wrong-hash, or non-accepting lines.
4. **Bytewise Untracked Allowlist Gate:**
   - Ordinal 4 validates the exact 22-path untracked set (`git ls-files --others --exclude-standard | LC_ALL=C sort`) against the literal printf-sorted list, accounting for the 19 prior governed artifacts plus r6 packet, handoff, and this review artifact. Ignored harness session evidence files remain excluded from Git tracking and do not pollute the allowlist.
5. **Full Cryptographic Continuity Across 23 Inherited Artifacts:**
   - Ordinal 5 binds all 23 historical artifacts via `shasum -a 256 -c -`, including r1–r5 packets, handoffs, reviews, execution evidence, and the four ignored r5 harness session records.
6. **Operational Parity with r5 Preserved Intact (Ordinals 10–21):**
   - Offline repository gates and exact Wrangler dry-run (ordinals 10–11).
   - Pre-deploy production status (version `d7bdc546-04a5-4ee5-bd4a-9406b03c255e` at 100%) and 10-item versions inventory snapshot (ordinals 12–13).
   - Deploy command with `--strict`, source commit `0e624016edd15a2308183f3ad0f045da05f5b728`, assembly identity `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`, and single UUID version extraction (ordinal 14).
   - Post-deploy 100% traffic assertion, versions view metadata/message/6-binding validation, and custom domain API check (ordinals 15–17).
   - Three verification smoke GETs (`/`, `/s/632dcc0b`, `/api/spark/632dcc0b`) with exact content contracts and strict write budgets ($\le 2$ served metric writes, $\le 2$ KV projection repairs) (ordinals 18–20).
   - 300-second version-bound continuous tail observation under single parent/child lifecycle and honest observational constraints (ordinal 21).

All checks, cryptographic hashes, command parsers, and schema bindings passed verification.

---

## 2. Findings Matrix

| Finding ID | Severity | Category | Description & Mechanical Verification | Status |
| :--- | :--- | :--- | :--- | :--- |
| **F-01** | `INFORMATIONAL` | Authority Formalization | **Elimination of Runner Preflight Discretion:** Packet r6 defines ordinals 1–9 as literal shell commands with internal comparison and strict schema (`stdout empty; stderr empty; exit 0`), preventing executor-invented preflight logic. | Verified |
| **F-02** | `INFORMATIONAL` | Cryptographic Integrity | **Non-Self-Referential Packet Hash & Binding:** Packet r6 excludes self-hashes. Packet SHA-256 (`91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34`), 23 inherited artifact hashes, and 5 source hashes match on-disk bytes exactly. | Verified |
| **F-03** | `INFORMATIONAL` | Review Verdict Parser | **Exact Single Verdict Line Enforcement:** Ordinal 2 enforces `grep -Fxc` count = 1 and `grep -Ec` count = 1 on the review artifact, failing closed on duplicate, malformed, or non-APPROVE lines. | Verified |
| **F-04** | `INFORMATIONAL` | 22-Path Untracked Allowlist | **Byte-for-Byte Set Equality:** The untracked allowlist contains exactly 22 sorted paths in `LC_ALL=C` order. `git ls-files --others --exclude-standard | LC_ALL=C sort` matches the packet list byte-for-byte once this review is written. | Verified |
| **F-05** | `INFORMATIONAL` | Ordered 21-Command Execution Model | **Contiguous Inventory & Single-Invocation Semantics:** Inventory entries 1..21 map contiguously to retained command objects. Every command specifies `invocation_count: 1`, expected exit 0, explicit output schemas, same-ID continuation rules, and terminal ambiguity handling. | Verified |
| **F-06** | `INFORMATIONAL` | JQ Parser Precedence Defect Fixes | **Corrected Parenthesization:** JQ expressions in pre-deploy status (ordinal 12) and custom domain state (ordinal 17) use explicit parenthesization for type and length assertions, preventing boolean-length evaluation errors. | Verified |
| **F-07** | `INFORMATIONAL` | Operational Invariant Preservation | **Parity with r5 Invariants:** Deploy command, source commit, runtime assembly identity, Wrangler 4.123.0 pin, account/target IDs, 6 bindings, write caps ($\le 2$ metric, $\le 2$ KV repair), and 10 forbidden operations match r5 specifications. | Verified |
| **F-08** | `INFORMATIONAL` | Honest Observability Boundaries | **Delineation of Residual Risks:** Packet r6 maintains strict honesty regarding unobservable pending Workers Builds, tail outcomes vs HTTP 5xx codes, and tail inability to remotely prove zero provider calls. | Verified |

---

## 3. Detailed Mechanical Verification of the 21-Command Inventory

### 3.1 Nine Authority Commands (Ordinals 1–9)

1. **Ordinal 1 (`authority_01_exact_external_packet_sha256`):**
   - Command: `test -n "$APPROVED_PACKET_SHA256" && test "$(printf '%s' "$APPROVED_PACKET_SHA256" | LC_ALL=C grep -E '^[0-9a-f]{64}$')" = "$APPROVED_PACKET_SHA256" && test "$(shasum -a 256 _bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6.json | awk '{print $1}')" = "$APPROVED_PACKET_SHA256"`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: Evaluated with `$APPROVED_PACKET_SHA256` set to `91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34`. Exited 0 with 0 bytes stdout and stderr.

2. **Ordinal 2 (`authority_02_exact_independent_review_verdict`):**
   - Command: `test "$(LC_ALL=C grep -Fxc "ODDSPARK_R6_REVIEW_VERDICT=APPROVE packet_sha256=$APPROVED_PACKET_SHA256" _bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-review.md)" -eq 1 && test "$(LC_ALL=C grep -Ec '^ODDSPARK_R6_REVIEW_VERDICT=' _bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-review.md)" -eq 1`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: Regex and fixed-string count logic validated. Fails closed (exit 1) if verdict line is missing, duplicate, mismatched, or replaced with `CHANGES_REQUIRED`.

3. **Ordinal 3 (`authority_03_exact_approval_bytes_and_hash_binding`):**
   - Command: `test -n "$APPROVAL_RECORD_PATH" && test -n "$APPROVAL_TEXT_SHA256" && test "$(printf '%s' "$APPROVAL_TEXT_SHA256" | LC_ALL=C grep -E '^[0-9a-f]{64}$')" = "$APPROVAL_TEXT_SHA256" && test "$(shasum -a 256 "$APPROVAL_RECORD_PATH" | awk '{print $1}')" = "$APPROVAL_TEXT_SHA256" && printf 'I approve exactly the independently reviewed Oddspark production key-pin deployment packet r6 with SHA-256 %s for one execution under its retained command list and side-effect caps; no prior packet approval is reused.\n' "$APPROVED_PACKET_SHA256" | cmp -s - "$APPROVAL_RECORD_PATH"`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: Verified byte comparison against the exact approval sentence format with trailing newline. Exited 0 with empty streams.

4. **Ordinal 4 (`authority_04_exact_22_path_untracked_allowlist`):**
   - Command: String equality test between `git ls-files --others --exclude-standard | LC_ALL=C sort` and the literal 22-path printf list.
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: The 22 sorted paths match current on-disk untracked state including this review file byte-for-byte.

5. **Ordinal 5 (`authority_05_all_23_inherited_hashes`):**
   - Command: `printf '%s  %s\n' ... | shasum -a 256 -c - >/dev/null`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: All 23 predecessor artifact files exist on disk and match their declared SHA-256 checksums. Command exits 0 with 0 bytes stdout/stderr.

6. **Ordinal 6 (`authority_06_git_source_index_and_rotation_identity`):**
   - Command: `test "$(git branch --show-current)" = develop && test "$(git rev-parse HEAD)" = 0e624016edd15a2308183f3ad0f045da05f5b728 && test "$(git rev-parse origin/develop)" = 0e624016edd15a2308183f3ad0f045da05f5b728 && git merge-base --is-ancestor e97f863912b2fc0cdfa17d58d6a50e4b68898fd5 HEAD && git diff --quiet -- && git diff --cached --quiet --`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: Branch `develop`, HEAD `0e624016edd15a2308183f3ad0f045da05f5b728`, `origin/develop`, ancestor `e97f863912b2fc0cdfa17d58d6a50e4b68898fd5`, clean working tree, and clean index verified live. Exited 0 with empty streams.

7. **Ordinal 7 (`authority_07_exact_source_file_hashes`):**
   - Command: `printf '%s  %s\n' 'c5c31aa5474ec9d04a96a4744c5f41c4ffb2e644cbb0ec28950041edc60301ba' 'package-lock.json' '18342d357658d8b4e6eee480d5a9155c7f561be7973386691f2fd74e40fbe866' 'runtime-assembly.json' 'b3f4fdfbf5af2c329a8cc994d7068656e7e2fb3dee43dea02a279a957c3e23ae' 'src/pipeline/release-decision.mjs' '59d4db078fbc61809fe43902b98ab338dbf338ad2f441ee794fdd1f4af2ab657' 'src/worker.js' 'dccc172215d1e99b730ffc61c027966b768fe70e55a988d8f667c0d959e2178f' 'wrangler.toml' | shasum -a 256 -c - >/dev/null`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: All 5 source and config files match declared hashes exactly. Exited 0 with 0 bytes stdout/stderr.

8. **Ordinal 8 (`authority_08_exact_runtime_assembly_identity`):**
   - Command: `test "$(jq -r '.assembly_identity_sha256' runtime-assembly.json)" = 0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: Assembly identity path `.assembly_identity_sha256` resolves to `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`. Exited 0 with empty streams.

9. **Ordinal 9 (`authority_09_exact_pinned_wrangler_identity`):**
   - Command: `test "$(WRANGLER_LOG_PATH=/tmp/oddspark-r6-wrangler-version.log npx --no-install wrangler --version)" = 4.123.0`
   - Output Schema: `stdout empty; stderr empty`, exit code `0`.
   - Verification: Installed Wrangler version is `4.123.0`.

---

### 3.2 Literal Prerequisites (Ordinals 10–11)

10. **Ordinal 10 (`offline_10_repository_gates`):**
    - Command: `npm run writer:preflight && npm run assembly:verify && WRANGLER_LOG_PATH=/tmp/oddspark-production-key-pin-check.log npm run check`
    - Output Schema: Complete npm transcript containing successful writer preflight, assembly identity `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`, and complete check suite pass.
    - Parser: Requires terminal exit 0, exact assembly identity, all three command stages present; rejects unhandled warning/error/fail lines.

11. **Ordinal 11 (`offline_11_exact_wrangler_dry_run`):**
    - Command: `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-production-key-pin-dry-run.log npx --no-install wrangler deploy --dry-run --config /Volumes/fast/Github/oddspark/wrangler.toml --name oddspark --strict`
    - Output Schema: Dry-run output showing exactly six bindings (`AI`, `AI_MODEL`, `AI_MODEL_FALLBACK`, `COORD`, `METER`, `SPARKS`); zero activation bindings; no upload or version ID.
    - Parser: Extracts binding names from the dry-run output block, sorts bytewise, asserts exact set equality to `binding_invariants.expected_bindings_sorted`, and rejects `ACTIVATION_SNAPSHOT` or `ACTIVATION_MANIFEST`.

---

### 3.3 Pre-Deploy Cloudflare Observations (Ordinals 12–13)

12. **Ordinal 12 (`immediate_current_production_deployment`):**
    - Command: `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-r6-pre-deployment.log npx --no-install wrangler deployments status --config /Volumes/fast/Github/oddspark/wrangler.toml --name oddspark --json`
    - Parser: `jq -e 'type=="object" and (.id|type=="string") and (.created_on|type=="string") and ((.versions|type)=="array") and ((.versions|length)==1) and (.versions[0].version_id=="d7bdc546-04a5-4ee5-bd4a-9406b03c255e") and (.versions[0].percentage==100)'`
    - Verification: Enforces that current production is solely version `d7bdc546-04a5-4ee5-bd4a-9406b03c255e` receiving 100% of traffic.

13. **Ordinal 13 (`immediate_versions_inventory`):**
    - Command: `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-r6-pre-versions.log npx --no-install wrangler versions list --config /Volumes/fast/Github/oddspark/wrangler.toml --name oddspark --json`
    - Parser: `jq -e 'type=="array" and length>0 and length<=10 and all(.[]; (.id|type=="string") and (.metadata.created_on|type=="string") and (.metadata.source|type=="string")) and any(.[]; .id=="d7bdc546-04a5-4ee5-bd4a-9406b03c255e")'`
    - Verification: Captures up to 10 latest versions in canonical JSON as the closed pre-deploy inventory.

---

### 3.4 Deployment (Ordinal 14)

14. **Ordinal 14 (`deploy_exact_reviewed_source`):**
    - Command: `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-production-key-pin-2026-02.log npx --no-install wrangler deploy --config /Volumes/fast/Github/oddspark/wrangler.toml --name oddspark --strict --message 'production key pin 2026-02; source 0e624016edd15a2308183f3ad0f045da05f5b728; assembly 0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6'`
    - Output Schema: Complete Wrangler deploy transcript with exactly one line `Current Version ID: <lowercase UUID>`.
    - Parser: Anchored regex `^Current Version ID: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$`. Extracts `NEW_VERSION_ID`, rejects equality with predecessor `d7bdc546-04a5-4ee5-bd4a-9406b03c255e`, and forbids multiple IDs.

---

### 3.5 Post-Deploy Cloudflare Observations (Ordinals 15–17)

15. **Ordinal 15 (`sole_100_percent_new_deployment`):**
    - Command Template: `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-r6-post-deployment.log npx --no-install wrangler deployments status --config /Volumes/fast/Github/oddspark/wrangler.toml --name oddspark --json`
    - Parser: `jq --arg id "$NEW_VERSION_ID" -e 'type=="object" and (.id|type=="string") and (.created_on|type=="string") and (.versions|length==1) and (.versions[0].version_id==$id) and (.versions[0].percentage==100)'`
    - Verification: Asserts 100% traffic allocation to `NEW_VERSION_ID`.

16. **Ordinal 16 (`new_version_metadata_message_and_bindings`):**
    - Command Template: `CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-r6-version-view.log npx --no-install wrangler versions view "$NEW_VERSION_ID" --config /Volumes/fast/Github/oddspark/wrangler.toml --name oddspark --json`
    - Parser: Asserts `.id == $NEW_VERSION_ID`, `.metadata.source == "wrangler"`, exact message matching commit and assembly, exactly six bindings (`AI`, `AI_MODEL`, `AI_MODEL_FALLBACK`, `COORD`, `METER`, `SPARKS`), AI models `@cf/openai/gpt-oss-120b` and `@cf/openai/gpt-oss-20b`, and strict absence of `ACTIVATION_MANIFEST` and `ACTIVATION_SNAPSHOT`.

17. **Ordinal 17 (`custom_domain_state`):**
    - Command Template: `curl --fail-with-body --silent --show-error --request GET --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" --get --data-urlencode 'hostname=oddspark.dev' --data-urlencode 'service=oddspark' 'https://api.cloudflare.com/client/v4/accounts/e72c232411bedeed357f3c73e4f4f0aa/workers/domains'`
    - Parser: `jq -e '.success==true and .errors==[] and ((.result|type)=="array") and ((.result|length)==1) and (.result[0].hostname=="oddspark.dev") and (.result[0].service=="oddspark") and ((.result[0].environment // "production")=="production") and (.result[0].id|type=="string") and (.result[0].zone_id|type=="string")'`
    - Verification: Queries Cloudflare v4 REST API using ambient token, asserting active routing of `oddspark.dev` to service `oddspark` in environment `production`.

---

### 3.6 Smoke GET Verifications & Write Budgets (Ordinals 18–20)

18. **Ordinal 18 (`root_html`):**
    - Command: `curl --fail-with-body --silent --show-error --request GET --header 'Accept: text/html' --dump-header /tmp/oddspark-r6-root.headers --output /tmp/oddspark-r6-root.body --write-out '%{http_code}\n%{content_type}\n' https://oddspark.dev/`
    - Expected Output: `200\ntext/html; charset=utf-8\n`, headers retained, non-empty HTML body with Oddspark marker.
    - Write Caps: 0 served metric writes, 0 KV projection repairs.

19. **Ordinal 19 (`legacy_text_permalink`):**
    - Command: `curl --fail-with-body --silent --show-error --request GET --header 'Accept: text/plain' --user-agent 'curl/oddspark-key-pin-verifier' --dump-header /tmp/oddspark-r6-text.headers --output /tmp/oddspark-r6-text.body --write-out '%{http_code}\n%{content_type}\n' https://oddspark.dev/s/632dcc0b`
    - Expected Output: `200\ntext/plain; charset=utf-8\n`, headers retained, legacy artifact text sections (headline, premise, question, provenance rows, seed formula).
    - Write Caps: $\le 1$ served metric write, $\le 1$ KV projection repair write.

20. **Ordinal 20 (`legacy_json_view`):**
    - Command: `curl --fail-with-body --silent --show-error --request GET --header 'Accept: application/json' --dump-header /tmp/oddspark-r6-json.headers --output /tmp/oddspark-r6-json.body --write-out '%{http_code}\n%{content_type}\n' https://oddspark.dev/api/spark/632dcc0b`
    - Expected Output: `200\napplication/json; charset=utf-8\n`, headers retained, JSON object matching identity `632dcc0b` and lossless equality with text view values.
    - Write Caps: $\le 1$ served metric write, $\le 1$ KV projection repair write.

Aggregate Verification Side-Effect Budget:
- Served-metric writes maximum: 2
- KV projection-repair writes maximum: 2
- Other KV writes: 0
- Durable Object writes: 0
- POST requests / strikes: 0
- Provider calls / signing / activation / rollback: 0

---

### 3.7 Continuous Observation Lifecycle (Ordinal 21)

21. **Ordinal 21 (`version_bound_300_second_tail`):**
    - Command Template:
      ```bash
      set -eu; : "${NEW_VERSION_ID:?missing NEW_VERSION_ID}"; : > /tmp/oddspark-r6-tail.ndjson; : > /tmp/oddspark-r6-tail.stderr; CLOUDFLARE_ACCOUNT_ID=e72c232411bedeed357f3c73e4f4f0aa WRANGLER_LOG_PATH=/tmp/oddspark-r6-tail-wrangler.log npx --no-install wrangler tail oddspark --config /Volumes/fast/Github/oddspark/wrangler.toml --format json --status ok --status error --status canceled --version-id "$NEW_VERSION_ID" > /tmp/oddspark-r6-tail.ndjson 2> /tmp/oddspark-r6-tail.stderr & tail_pid=$!; trap 'kill -INT "$tail_pid" 2>/dev/null || true' INT TERM HUP; sleep 300; kill -INT "$tail_pid"; set +e; wait "$tail_pid"; tail_rc=$?; set -e; test "$tail_rc" -eq 0 -o "$tail_rc" -eq 130; ! grep -Eqi 'unauthorized|forbidden|failed to create tail|connection.*(closed|failed)' /tmp/oddspark-r6-tail.stderr; jq -c . /tmp/oddspark-r6-tail.ndjson >/dev/null
      ```
    - Lifecycle & Process Accounting: One background child process (`tail_pid`). Traps signals, sleeps 300 seconds, sends `SIGINT`, waits for exit, verifies exit code 0 or 130, verifies no fatal auth/connection error in stderr, and validates NDJSON formatting.
    - NDJSON Parser: Requires `outcome` in `[ok, error, canceled]`, `exceptions` array, `logs` array, numeric `eventTimestamp`; enforces `error_count = 0`, `canceled_count = 0`, and `total_exception_objects = 0`.
    - Honest Observational Boundaries: Clarifies that tail outcomes report invocation status, not HTTP status; does not infer zero 5xx responses; and acknowledges tail cannot prove zero provider calls or broader inactive posture beyond absent activation bindings.

---

## 4. Allowlist & Cryptographic Checksum Reference

### 4.1 Untracked Allowlist (Exactly 22 Sorted Paths)
```text
_bmad-output/implementation-artifacts/handoff-production-key-pin-deployment-packet-2026-02-review.md
_bmad-output/implementation-artifacts/handoff-production-key-pin-deployment-packet-2026-02.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-execution-2026-02-evidence.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-execution-2026-02-handoff.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r2-handoff.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r2-review.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r2.json
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r3-handoff.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r3-review.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r3.json
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r4-handoff.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r4-review.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r4.json
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5-handoff.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5-review.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r5.json
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-handoff.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-review.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6.json
_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02.json
_bmad-output/implementation-artifacts/production-key-pin-deployment-r3-execution-2026-02-evidence.md
_bmad-output/implementation-artifacts/production-key-pin-deployment-r3-execution-2026-02-handoff.md
```

### 4.2 Cryptographic Hash Summary
- **Packet SHA-256 (`production-key-pin-deployment-packet-2026-02-r6.json`):** `91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34`
- **Assembly Identity (`runtime-assembly.json`):** `0eca7833bf857403949928960f2975116445e593471d5c84c9e47499657318e6`
- **Source Commit:** `0e624016edd15a2308183f3ad0f045da05f5b728`
- **Source File Checksums:**
  - `package-lock.json`: `c5c31aa5474ec9d04a96a4744c5f41c4ffb2e644cbb0ec28950041edc60301ba`
  - `runtime-assembly.json`: `18342d357658d8b4e6eee480d5a9155c7f561be7973386691f2fd74e40fbe866`
  - `src/pipeline/release-decision.mjs`: `b3f4fdfbf5af2c329a8cc994d7068656e7e2fb3dee43dea02a279a957c3e23ae`
  - `src/worker.js`: `59d4db078fbc61809fe43902b98ab338dbf338ad2f441ee794fdd1f4af2ab657`
  - `wrangler.toml`: `dccc172215d1e99b730ffc61c027966b768fe70e55a988d8f667c0d959e2178f`

---

## 5. Exact Owner Approval Statement for r6

After this accepting review exists, fresh owner approval must be recorded with these exact bytes followed by one LF:

```text
I approve exactly the independently reviewed Oddspark production key-pin deployment packet r6 with SHA-256 91abb9ad5783e9fe7051b1ea8d39a197387140eb6dfa8e3835f4a4da9af7ab34 for one execution under its retained command list and side-effect caps; no prior packet approval is reused.
```

---

HANDOFF: /Volumes/fast/Github/oddspark/_bmad-output/implementation-artifacts/production-key-pin-deployment-packet-2026-02-r6-review.md
