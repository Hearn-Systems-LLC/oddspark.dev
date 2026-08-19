# Generation structural qualification

This offline-first harness qualifies the frozen primary and fallback generation identities independently. It accepts only a direct closed Story 1.7 Candidate. Text, Markdown fences, wrappers, coercion, extraction, repair, retry, and replacement are hard failures and remain in the originating role's denominator.

Run `npm run spike:generation:self-test`, then generate a reviewable plan with `npm run spike:generation:plan -- <plan-id>`. Planning and verification make no network or inference calls. The public verifier accepts arbitrary evidence bytes with `npm run spike:generation:verify -- --file <evidence.json>`.

Live execution is deliberately separate from `npm run check`. An operator must review the exact plan, confirm provider/account/headroom/pricing/retention, and create a fresh closed approval record with schema `oddspark.generation-qualification-approval/v1`, the exact `plan_ref`, `approval_run_id`, `approved_at`, nonblank `approved_by`, call cap `42`, exact `approved_maximum_usd`, and authorization `execute-exact-plan-once`. Start the isolated adapter with `npm run spike:generation:dev`, then run `npm run spike:generation:live -- <plan.json> <approval.json>` interactively.

The runner refuses CI/non-TTY execution, non-loopback or credential-bearing URLs, stale/mismatched approval, adapter/source/runtime drift, and an existing spend receipt before inference. It reserves the immutable receipt before the first call, runs one probe then 20 sequential trials per role only after that role's probe succeeds, makes at most 42 calls, and publishes marker-bound evidence atomically. A NO-GO role requires architecture review; it never changes the other role's decision. Credentials, account IDs, and provider reasoning are not retained.
