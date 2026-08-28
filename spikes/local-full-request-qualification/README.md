# Local full-request qualification

All plan and approval creation is offline. Neither command starts the adapter or
contains a provider path. Plans remain unapproved until a separately reviewed
owner decision is supplied to the approval command.

Create a canonical approval from an exact, independently reviewed plan (all
arguments are mandatory; plan and output are safe basenames under `plans/`):

```sh
npm run spike:full-request:approve -- \
  --plan PLAN.plan.json \
  --output PLAN-TIMESTAMP.approval.json \
  --plan-sha256 EXACT_PLAN_SHA256 \
  --run-id EXACT_RUN_UUID \
  --approved-by EXACT_OWNER_LABEL \
  --approved-at EXACT_CANONICAL_TIMESTAMP \
  --expires-at EXACT_CANONICAL_TIMESTAMP \
  --decision approved
```

The command validates canonical unapproved plan bytes, exact plan SHA/run
binding, closed approval fields and timestamps, refuses traversal and symlinks,
and creates the output with exclusive no-overwrite semantics.

Before any adapter start, the operator must separately supply a valid signed
activation snapshot and its authorized public trust-key map as
`LOCAL_FULL_REQUEST_ACTIVATION_SNAPSHOT` and
`LOCAL_FULL_REQUEST_ACTIVATION_TRUST_KEYS`. The repository contains neither an
authorized production signing key nor an authorized production trust-key map;
do not generate or substitute them. These are live preflight inputs, not fields
in the unapproved qualification plan.

This isolated, nonproduction spike retains independently verifiable evidence for one approval-gated request through the canonical Story 1.23 assembly. It is never a CI or deployment entrypoint.

- `npm run spike:full-request:plan -- --output <new.plan.json> --assembly-ref <current-assembly> --generation-ref <accepted-config-ref> --generation-role-ref <accepted-role-ref> --judge-ref <accepted-role-ref> --run-id <uuid> --strike-timestamp <canonical-iso> --route-ceiling-ms <n> --commit-reserve-ms <n> --provider-timeout-ms <n> --call-cap 6 --attempt-cap 3 --maximum-cost-usd <n>` writes one canonical unapproved plan and prints its exact path/hash/ref/run/limits/null-authority evidence. The command refuses traversal, malformed arguments, stale assembly identity, inconsistent deadlines, and overwrite; it makes no network or provider call.
- `npm run spike:full-request:self-test` runs offline synthetic fixtures only.
- `npm run spike:full-request:verify -- EVIDENCE PLAN APPROVAL` verifies arbitrary retained bytes without trusting the runner.

No adapter or provider may start until Justin separately approves the exact plan bytes. The current plan has `approval: null`, `execution: null`, and `allowance_consumed: false`.
