# Story 1.26 Stage 2 historical-spend recovery contract

Date: 2026-08-26
Status: development packet; uncommitted; unapproved for live execution

## Closed historical fact

The only historical invocation closed by this contract is attempt `f543d3d5-80d4-44f6-b7bf-41083197fcc9`, approval run `ba52ec91-fe85-4987-954d-71054a0acc3d`, exactly 42 calls, one runner invocation, zero retries, and zero replacements. Its receipt remains at `.judge-llama-cycle-spend.json`; closure never renames, deletes, edits, or resets it.

The canonical closure schema is `oddspark.judge-historical-spend-closure/v1`, domain-separated by `oddspark-judge-historical-spend-closure/v1`, with closure ref `e827240fbc244ac2f526d32eef3cc01e785ddda40a79fe5d2d9f0b251f22d066`. It binds the exact receipt, evidence JSON, Markdown, qualification bundle, and completion marker by basename, byte length, and SHA-256. Verification reconstructs the closure independently from those retained bytes and requires exact equality.

Historical accounting is cumulative, never a fresh zero balance: 42 calls; exact computable observed 70B cost `$0.032631059999999996`; complete 8B token usage with exact endpoint price unavailable and therefore explicitly unpriced; conservative full-cycle cap `$0.3054702` / `27770.018181818185` neurons. No unpriced spend is classified as zero.

## State classification

Only the exact canonical record reconstructed from a valid `completed-spent` receipt, a 42-record completed artifact set, a matching qualification bundle, terminal `cycle_available:false`, exact call ordering/cardinality, complete per-model usage, and the exact member hashes is `terminal-closed`.

Missing, noncanonical, partial, active, reserved, `calls-started`, `consumed_incomplete`, malformed, mismatched, replayed, symlink-aliased, source/run/attempt-drifted, cost-ambiguous, or otherwise unverifiable state is blocking. Closure creation is canonical JSON, atomic create-only, collision-safe, and refuses symlink aliases.

## Authority ordering

1. Independently reconstruct and validate the historical closure from retained bytes.
2. For offline planning only, create a new distinct unapproved plan whose run ID differs from the historical run and whose canonical bytes bind the closure ref, historical invocation identity, cumulative 42 calls, conservative historical cap, and `reset_permitted:false`.
3. Stop for independent review and fresh exact owner approval. The old `--offline-requalification` exception alone no longer bypasses historical spend and grants no execution authority.
4. At any later public live boundary, validate the historical closure before CI/operator checks that could progress toward execution, approval-file loading, allowance reservation, adapter health/diagnostics, or runner/provider work.
5. Require the newly reviewed plan and fresh approval to bind the new plan ref/run ID, historical closure, source/runtime/request identities, 42-call successor cap, `$0.3054702` successor cap, zero retries/replacements, and one runner invocation.
6. Reserve and retain a distinct successor receipt. Never reuse, mutate, archive, or replace the closed historical receipt.

Any closure mutation, plan/closure mismatch, reused historical run ID, stale/transferred/backdated approval, active or ambiguous successor receipt, second invocation, retry, replacement, adapter/provider diagnostic before authority, or member-byte drift fails closed.

## Stage boundary

This contract authorizes offline closure preparation only. It creates no new plan, approval, adapter start, runner/provider call, allowance consumption, deployment, signature, activation, or Stage 3 action. After eventual commit, a real new offline successor plan must be generated through the public boundary, independently reviewed, and separately approved before any live execution can be considered.
