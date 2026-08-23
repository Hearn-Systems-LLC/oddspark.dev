# Story 1.17 BMad Build Handoff

Status: implementation completed after Justin authorized canonical corpus→Candidate/Evidence projection. Verification is green; independent review remains the next workflow step.

## Implemented changes

- Added a content-addressed 24-case catalog at `semantic/regression/v1/catalog.json`.
- Added `scripts/semantic-regression.mjs` and `scripts/semantic-regression.test.mjs` for offline composite-Gate plumbing, contract safety, local fail-closed behavior, and separate primary/fallback reports.
- Added the focused suite once to the unpinned `.github/check-ci.mjs`; `package.json` and pinned evidence bytes remain unchanged.

The semantic fixtures evaluate the owner-authorized canonical corpus→Candidate/Evidence projection through the existing composite Gate.

## Verification completed

- `node --test scripts/semantic-regression.test.mjs`: 10/10 passed.
- `node .github/check-ci.mjs`: passed with host permissions required by existing Wrangler localhost/log behavior.
- Pinned judge verifier: passed 18 predicates and 79 fixtures.
- Pinned generation verifier: passed 23 predicates.
- `git diff --check` and protected-file audit: passed.

Green results prove the offline suite, corpus projection, fail-closed contract behavior, and pinned evidence identities remain consistent.

## Resolved intent gap

Justin authorized the canonical corpus→Candidate/Evidence projection recorded in the Story 1.17 spec change log. The implemented adapters are mechanical and the suite remains offline; no provider, network, deployment, activation, evidence re-pin, or threshold change occurred.
