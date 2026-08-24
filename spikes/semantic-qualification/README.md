# Semantic qualification

This isolated harness derives the 24 frozen Story 1.17 projections and an exact, leg-major schedule of 19 judge-required requests for each qualified judge leg (38 calls total). It never calls generation, retries, replaces, or substitutes a judge result.

Offline commands:

```sh
node spikes/semantic-qualification/run.mjs plan
node --test spikes/semantic-qualification/test.mjs
node spikes/semantic-qualification/verify.mjs path/to/completed-bundle.json
```

The plan command writes a canonical plan and approval template. It performs no network access. Justin must separately fill and approve that exact template within its exclusive one-hour window, including its plan ref, request identities, 38-call cap, and maximum cost. An ordinary request to continue work is not approval.

Operator-only live sequence: inspect the generated plan and price disclosure; create the exact approval; run `node spikes/semantic-qualification/start-adapter.mjs <plan.json> <approved.json> <new-launch-receipt.json>` in one interactive terminal; then run `node spikes/semantic-qualification/run.mjs live <plan.json> <approved.json> <launch-receipt.json> <new-spend-receipt.json> <new-output-directory>` in another. Stop the adapter, then run `node spikes/semantic-qualification/verify.mjs <new-output-directory>/<run-id>.bundle.json`. Never run this from CI, deploy the adapter, or add its AI binding to production.

Cloudflare states that customer content is not used for model training or service improvement without explicit consent. This harness asserts no undocumented provider-side deletion period. Pricing uses the published current 70B rate ($0.29/M input and $2.25/M output). Because no exact published binding was found for the selected 8B fast endpoint, its conservative maximum substitutes the 70B rate; that is not an observed 8B price.

The input-cost ceiling treats every UTF-8 request byte as a token and adds 4,096 tokens per call for provider chat framing. Requests over 128 KiB are unpriceable and rejected offline.

For the already-consumed run whose pre-fix terminal publication lost raw responses, the operator may retain only the facts they directly observed with `node spikes/semantic-qualification/run.mjs attest-consumed <exact-plan.json> <new-attestation.json> <attested-by> 38`. This append-only record states the exact run/plan/request set, 38 authorized HTTP 200 completions, `semantic_not_qualified`, unavailable raw responses, no SEMANTIC ref, and no retry authority. It never reconstructs fixture or leg results.
