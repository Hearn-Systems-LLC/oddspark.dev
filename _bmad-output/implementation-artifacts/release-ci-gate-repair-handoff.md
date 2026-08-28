# Release-readiness CI gate repair handoff

## Status

Ready for independent review. No commit, push, merge, deployment, signing, activation, provider call, live run, or Cloudflare call was performed.

Worktree: `/Volumes/fast/Github/oddspark/.bmad-governor/worktrees/release-ci-gate-repair`  
Branch: `governor/release-ci-gate-repair-20260828`  
Base and current HEAD: `779accf9d1aca14ecb374dab1108aa7098eb3283` (`origin/develop`)

## Governing conclusion

GitHub Actions run 33184021359 applied the current-checkout `verify-v2.mjs` and qualification verifier directly to immutable `ba52ec91` evidence. That verifier is intentionally source-bound. Six members of the evidence source manifest have changed since the retained run (`package.json`, `evidence-v2.mjs`, `qualification.mjs`, `recovery-finder.mjs`, `run.mjs`, and `test.mjs`), so the direct current-source invocation truthfully fails `source.identity` and its derived predicates.

The retained publication is not current-source authority and must not be rewritten. The intended boundary has two independent obligations:

1. The four retained publication members in the current checkout must be byte-identical to the pinned Git revision that retained them.
2. The unchanged semantic verifiers must execute under the exact source/runtime snapshot the evidence binds.

Commit `8e9a9e54cc564896f83e4aedba92b57d73bce63f` contains both the retained publication and the exact source manifest bytes. Node `v24.18.0` and lockfile-pinned Wrangler `4.123.0` complete the recorded runtime boundary.

## Changes

- `.github/verify-struct-judge-history.mjs`
  - Pins revision `8e9a9e54cc564896f83e4aedba92b57d73bce63f` and Node `v24.18.0`.
  - Compares the current evidence JSON, Markdown report, completion marker, and qualification JSON byte-for-byte with that revision before semantic verification.
  - Reconstructs the pinned checkout in a temporary directory, exposes only the current lockfile-installed `node_modules` toolchain, and runs the unchanged evidence and qualification verifiers there.
  - Fails closed on retained-byte drift, missing/unreachable Git authority, wrong Node, missing toolchain, reconstruction failure, or either verifier failure.
- `.github/verify-struct-judge-history.test.mjs`
  - Proves the intended pinned source/runtime boundary passes.
  - Appends one byte to a copy of the actual retained evidence and proves rejection before semantic verification.
  - Substitutes current `HEAD` for the pinned revision and proves current-source drift cannot pass as historical authority.
  - Proves CI invokes the historical test/runner exactly once and contains no direct current-source evidence-verifier command.
- `.github/workflows/test.yml`
  - Replaces the two direct current-source verifier commands with the adversarial test and pinned historical runner.
  - Configures `actions/checkout@v4` with `fetch-depth: 0`, ensuring pinned commit `8e9a9e54cc564896f83e4aedba92b57d73bce63f` exists in the GitHub Actions object database.
- `.github/check-ci.mjs`
  - Removes the obsolete DW-6 skip. The governed runner now executes every current `npm run check` component, then its existing semantic/how-page suites.

No runtime-neutral source changed. `runtime-assembly.json` was verified but not refreshed.

## Historical byte audit

The protected `ba52ec91` publication remains unchanged:

- evidence JSON: `051d5c7072d99a31de583b854cff6f1d3639b4ab113d472727d38d50c46abf75`
- Markdown: `6e473cedd57f67078e95e3923edb6880e0aa5e231acf3a52eeffa6bb9e2ab259`
- completion marker: `80b6bddf3dc844494c8f19f93c293379c198ce032331a95ff77369eeb58e7d31`
- qualification: `5456d91ae2154e7edf0dc1b48576cbdc59433dd106351478fdd9ff3243b1549b`

`git diff` is empty for `spikes/judge-fidelity/results`, `runtime-assembly.json`, `sprint-status.yaml`, and `deferred-work.md`.

## Verification evidence

- Original failing commands under Node 24.18.0: reproduced the reported `source.identity`, `outcome.deterministic`, `predicates.retained`, `report.deterministic`, and evidence-byte-binding failures; qualification remained invalid because evidence independent verification failed.
- `node --test .github/verify-struct-judge-history.test.mjs`: PASS, 4/4.
- `node .github/verify-struct-judge-history.mjs`: PASS, 18/18 evidence predicates, 79/79 fixtures, qualification GO with 2 refs.
- `npm run spike:judge:self-test`: PASS, 85/85 tests, 79/79 fixtures, 18/18 predicates.
- `npm run check`: PASS under Node 24.18.0 and Wrangler 4.123.0. The sandboxed attempt reached `check:types` and hit local Wrangler log/loopback `EPERM`; the unchanged permission-enabled rerun passed.
- `CI=1 node .github/check-ci.mjs`: PASS, including every current check component, semantic regression, how-page tests, and controlled Chrome tests (6 pass, 2 intentional live-only skips).
- `git diff --check`: PASS.
- `npm run assembly:verify`: PASS; identity `7ce7e16ac5e0feb2719d05e79f86dea410ab180a2f351f32402dc671403567a8` over 18 runtime-neutral modules.

## Independent review repair

- Review: `release-ci-gate-repair-independent-review.md`, SHA-256 `80e07041c4504092313e5a0d8ba4f3265c754caa09be6b490b9ed7b12bc556e0`, preserved byte-for-byte.
- Verdict received: CHANGES REQUESTED with one blocking finding, F-01.
- F-01 repair: `actions/checkout@v4` now uses `fetch-depth: 0`; the focused workflow test requires that exact invariant, so the pinned historical Git authority cannot silently disappear under checkout's default depth-one behavior.
- Proportionate post-repair validation: focused 4-test suite, pinned historical runner, workflow YAML parse, `git diff --check`, protected-surface diff audit, and review SHA-256 audit.

## Review focus

1. Confirm `8e9a9e54cc564896f83e4aedba92b57d73bce63f` is the correct immutable Git authority: all source hashes in the retained evidence match it, and it is the commit that retained the four publication members.
2. Confirm byte comparison precedes reconstruction/semantic verification and covers every completion-marker member.
3. Confirm the reconstructed verifier cannot read current source bytes and fails under `HEAD`.
4. Confirm removal of the historical DW-6 skip is appropriate now that current `npm run check` passes.
5. Confirm no protected, runtime, activation, deployment, evidence, approval, or bookkeeping surface changed.
