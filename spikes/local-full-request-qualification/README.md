# Local full-request qualification

This isolated, nonproduction spike retains independently verifiable evidence for one approval-gated request through the canonical Story 1.23 assembly. It is never a CI or deployment entrypoint.

- `npm run spike:full-request:plan -- --output <new.plan.json> --assembly-ref <current-assembly> --generation-ref <accepted-config-ref> --generation-role-ref <accepted-role-ref> --judge-ref <accepted-role-ref> --run-id <uuid> --strike-timestamp <canonical-iso> --route-ceiling-ms <n> --commit-reserve-ms <n> --provider-timeout-ms <n> --call-cap 6 --attempt-cap 3 --maximum-cost-usd <n>` writes one canonical unapproved plan and prints its exact path/hash/ref/run/limits/null-authority evidence. The command refuses traversal, malformed arguments, stale assembly identity, inconsistent deadlines, and overwrite; it makes no network or provider call.
- `npm run spike:full-request:self-test` runs offline synthetic fixtures only.
- `npm run spike:full-request:verify -- EVIDENCE PLAN APPROVAL` verifies arbitrary retained bytes without trusting the runner.

No adapter or provider may start until Justin separately approves the exact plan bytes. The current plan has `approval: null`, `execution: null`, and `allowance_consumed: false`.
