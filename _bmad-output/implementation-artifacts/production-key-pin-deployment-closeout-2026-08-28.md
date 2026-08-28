# Oddspark production key-pin deployment r14 closeout

Date: 2026-08-28

## Authoritative result

Production key-pin source deployment and qualification are complete for candidate `a71c3b44-6923-48fa-842e-3616b1dc3b1c`.

This closeout binds:

- r14 packet SHA-256: `1d67ffc5783cc7da4a48bda264d5c733ba1996e70fd5a5f18b3b94a54ae1f184`
- r14 independent review SHA-256: `204e43dbf88a2371c29fc1b3ad5783745c83fe738dcc567478ef4c41f6a53c2e`
- retained and project-copy evidence SHA-256: `65c9646fe2318a2305972b3f12e753853706a9c716e400101439de176af88b0d`
- retained and project-copy handoff SHA-256: `2e5f983fb1711f7ef5b43ebfed1b870f18d1da511b6a371ffee741c6875952ce`

The r14 evidence status is `COMPLETE`. Every retained command was invoked exactly once and passed its parser:

1. `authority_01_exact_external_packet_sha256` — PASS
2. `authority_02_exact_independent_review_verdict` — PASS
3. `authority_03_exact_approval_bytes_and_hash_binding` — PASS
4. `authority_04_exact_46_path_untracked_allowlist` — PASS
5. `authority_05_all_68_inherited_hashes` — PASS
6. `authority_06_git_source_index_and_rotation_identity` — PASS
7. `authority_07_exact_source_file_hashes` — PASS
8. `authority_08_exact_runtime_assembly_identity` — PASS
9. `authority_09_exact_pinned_wrangler_identity` — PASS
10. `offline_10_repository_gates` — PASS
11. `offline_11_exact_wrangler_dry_run` — PASS
12. `current_production_exact_candidate` — PASS
13. `custom_domain_state` — PASS
14. `candidate_version_metadata_and_bindings` — PASS
15. `legacy_text_permalink` — PASS
16. `legacy_json_view` — PASS
17. `version_bound_300_second_tail` — PASS

Qualification observed 3 Cloudflare GETs, 2 application GETs, one tail parent and one tail child. Write upper bounds were 2 served-metric writes and 2 KV projection-repair writes. Counts were zero for POST requests, new deployments, version uploads, provider calls, signing operations, activation operations, and rollback operations. The fixed-version 300-second tail produced zero events and zero stderr.

The Git baseline was branch `develop`, with both `HEAD` and `origin/develop` at `0e624016edd15a2308183f3ad0f045da05f5b728`.

## Proof boundary and limitations

This proves deployment/source/domain/binding/smoke/tail qualification only.

It does not prove or authorize signing, private-key access, `ACTIVATION_SNAPSHOT`, `ACTIVATION_MANIFEST`, local-full-request activation, provider calls, further deployment, or a `main` merge.

Story 1.26 must remain `awaiting-operator` unless its separate signing/activation contract is actually satisfied. This closeout does not change `sprint-status.yaml` or any story/spec status.

Story 1.22 remains for independent review and is not edited by this development job.
