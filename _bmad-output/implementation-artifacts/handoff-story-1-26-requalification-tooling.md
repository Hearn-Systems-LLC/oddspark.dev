# Story 1.26 offline requalification tooling handoff

Date: 2026-08-26
Baseline/HEAD: `9857bd4cdc80802ce78858889cb9a0aa10d0f07a` on `develop`
Status: **OFFLINE TOOLING COMPLETE / LIVE QUALIFICATION BLOCKED / UNAPPROVED**

## Completed

- Preserved and completed the existing local-full-request repair and safe plan creator. The focused suite is 30/30; no Stage 3 plan was created.
- Added generation plan v3 with a closed authority binding `Hearn Systems account`, Workers plan `paid`, 10,000 daily free neurons, billing order `free-first-then-paid-bounded-by-plan-cap`, and `remaining_free_neurons:null`. Paid requires no remaining-free-neuron headroom; free requires an exact finite observation at least equal to the disclosed maximum. Retained v2 plans/evidence continue using their original closed authority and plan-ref domain.
- Added generation plan publication that rejects traversal/unsafe IDs and overwrite. The retained bundle has approval and execution null, allowance false, and provider calls zero.
- Narrowed judge account-label validation to bounded printable non-secret labels while retaining path, traversal, account-ID, malformed-whitespace, length, and secret-like punctuation exclusions. Added an explicit Story 1.26 offline-requalification planning exception; it bypasses only the historical-spend planning gate and cannot authorize live execution.

## Retained Stage 1 plan bundle

- Plan: `spikes/generation-qualification/results/story-1-26-generation-requalification-20260826.plan.json`
- Plan bytes SHA-256: `79ed71acfe5e5e886b05ea1d2523b620cee9f71878976c2eb208cac87d9fc0bd`
- Plan ref: `9676b8fa3f42ab08890f3217a9c40c108b1ca5f2820f166c6b2388caace66486`
- Run ID: `story-1-26-generation-requalification-20260826`
- Maximum: 63 calls / `$0.30586038`; one in-orchestrator retry only after transient provider error/timeout, no output-classification retry, no replacement.
- Approval template SHA-256: `125e22723cc46c3b091ad33bf72702dbd4cd10637d447ebdb356e2bb72a940cc`; `approved_at:null`, `approved_by:null`, `authorization:null`.
- Execution marker SHA-256: `92ef88c5300328087a7efcdcb58d93196922da15457b2db68acb0bd0313f79dc`; approval/execution null, allowance false, provider calls 0.

## Retained Stage 2 plan disclosure

- Plan: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-unapproved.plan.json`
- Plan bytes SHA-256: `741d207d1b3a054555a8f73afcf63e758875c276c84b0424a1718600558d42ad`
- Plan ref: `0e6a02d0a5971453ff429534ac91fa496219c0ed5cd1a039a96cfb1f7361b336`
- Run ID: `story-1-26-judge-requalification-20260826`
- Maximum: 42 calls / `$0.3054702` / `27770.018181818185` neurons; zero retry and zero replacement.
- Approval template SHA-256: `022156ce0bd2c3b3c649218bb4a5a388682ea3f24a0b604af7efb3c13f1d75fc`; timestamps null and decision `REPLACE_WITH_APPROVED_AFTER_REVIEW`.
- Completion marker SHA-256: `0fffc8c262474b1d08888033487729345ce064958ea7eaa97830e97718296f3d`; marker verification passed against both retained member byte hashes.

## Verification

- `npm run spike:generation:self-test` — 48/48 passed.
- `npm run spike:judge:self-test` — 82/82 spike tests, 79/79 shared fixtures, 18/18 evidence predicates passed.
- `npm run spike:full-request:self-test` — 30/30 passed.
- Both fresh plan files are canonical JSON and pass their retained validators; the judge completion marker reopens and binds both disclosed members.
- `npm run assembly:verify` — PASS, assembly `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`, 18 modules.
- `git diff --check` and retained-file boundary checks — PASS.

## Boundary and terminal dependency

Provider calls **0**; adapter starts **0**; remote mutations **0**; allowance consumed **false**; approvals **0**; executions **0**; existing retained evidence/results/approvals/spend receipts changed **0**. No commit, push, deployment, signing, activation, config, secret, or production source change occurred.

Stage 3 remains blocked until fresh Stage 1 and Stage 2 live runs are separately approved, executed once, independently verified GO, and yield accepted generation and judge refs. The Stage 3 creator is tested only with synthetic refs. No Stage 3 live plan was fabricated. Stop at this handoff.

## Finding 1 repair and reverification addendum

- Repaired the generation v3 authority mutation loop to recompute each mutated plan's identity with the authoritative `derivePlanRef(changed)` derivation.
- Each mutation now asserts the exact validator result `errors: ["plan authority is invalid"]`, proving rejection is authority-specific and does not rely on `plan identity is invalid`.
- Standalone verification demonstrated all five mutations (`extra`, `daily_free_neurons`, `billing_order`, `remaining_free_neurons`, and `account_profile`) return only `plan authority is invalid` with `valid:false`.
- `npm run spike:generation:self-test` — PASS, 48/48.
- `git diff --check` — PASS.
- Terminal outcome: Finding 1 repaired and locally reverified. Provider calls **0**; adapters started **0**; approvals/executions **0**; retained plan bytes unchanged; no commit or push performed. Stop for independent re-review.
