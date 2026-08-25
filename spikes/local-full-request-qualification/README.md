# Local full-request qualification

This isolated, nonproduction spike retains independently verifiable evidence for one approval-gated request through the canonical Story 1.23 assembly. It is never a CI or deployment entrypoint.

- `npm run spike:full-request:plan` prints the exact unapproved plan path and byte hash.
- `npm run spike:full-request:self-test` runs offline synthetic fixtures only.
- `npm run spike:full-request:verify -- EVIDENCE PLAN APPROVAL` verifies arbitrary retained bytes without trusting the runner.

No adapter or provider may start until Justin separately approves the exact plan bytes. The current plan has `approval: null`, `execution: null`, and `allowance_consumed: false`.
