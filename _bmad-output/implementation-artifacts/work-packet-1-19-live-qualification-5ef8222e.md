# Story 1.19 Fresh Live Qualification Execution Packet

## Exact owner authority

Justin approved this exact run in the governor conversation on 2026-08-25.

- Plan: `spikes/local-full-request-qualification/plans/story-1-19-local-full-request-5ef8222e-unapproved.plan.json`
- Plan SHA-256: `a77bfb8a3a933fd279ddff03d722fd1daee12ef4704d36e7a2beb49ba7dcba7d`
- Run ID: `5ef8222e-27e2-4d48-95f9-761991155e19`
- Assembly: `7971844c5779fe1a435970eef522cd2c23f9b7c121708f6675299e58aff96ed6`
- Approval window: `2026-08-25T20:18:08.000Z` through `2026-08-25T21:18:08.000Z`
- Limits: route ceiling 120,000 ms; commit reserve 1,000 ms; provider timeout 19,833 ms; call cap 6; attempt cap 3; maximum cost USD 0.06.
- Retry policy: no retry, replacement, substitution, or second runner invocation outside the assembled orchestrator.

Justin explicitly authorizes this one run to start the isolated live adapter, make the plan-bounded Workers AI calls, and disclose the exact production wire payloads required by the frozen pipeline: priors-derived Evidence plus seed for generation, and Candidate plus grounding for judging. House catalog and voice corpus remain local and must not be transmitted. This authority covers no deployment, activation, unrelated provider call, or remote mutation.

## Outcome

Stamp a new approval record that binds the exact plan bytes, approval window, owner, disclosure scope, caps, and no-external-retry rule. Execute the runner exactly once. Shut down the adapter and remote connection. Preserve all evidence immutably and run the independent arbitrary-byte verifier. Produce a terminal handoff without fabricating unknown values.

## Preconditions

Before any adapter start or allowance consumption, independently confirm:

- current HEAD is `dff0b82c7dff654b996bcb7cab445d1c773721bb`;
- exact plan SHA, run ID, assembly, structural refs, caps, schedule, retention, and predicates match this packet;
- plan is unapproved/unexecuted/unconsumed and no approval or receipt already exists for this new run/approval identity;
- assembly verification and focused offline qualification self-test pass;
- approval has not expired;
- no historical approval/result bytes will be overwritten.

If any precondition fails, stop with zero calls and a fail-closed handoff.

## Allowed writes

- one fresh approval record under `spikes/local-full-request-qualification/plans/` using the established isolated-history naming convention;
- new immutable result/evidence/receipt/report/marker artifacts under a fresh approval-isolated results directory for plan `a77bfb8a…` and run `5ef8222e…`;
- `_bmad-output/implementation-artifacts/handoff-1-19-live-qualification-5ef8222e.md`;
- append-only factual live-run/change-log/status evidence in `_bmad-output/implementation-artifacts/spec-1-19-local-full-request-qualification.md` only after the terminal run, keeping status `in-review` on a verified GO or `blocked` on NO-GO.

No other writes are authorized. Do not commit during live execution; terminal evidence must be independently reviewed before any commit decision.

## Forbidden actions

- No second runner invocation, external retry, model/provider substitution, changed prompt/schema/plan, deployment, activation, push, merge, branch deletion, history rewrite, or unrelated remote mutation.
- Never modify historical plan, approval, receipt, evidence, report, or marker bytes.
- Never modify `sprint-status.yaml`, deferred-work ledgers, production/deployment configuration, `src/pipeline/*`, tests, authority content, or unrelated files.
- Do not exceed the exact plan caps or approval window.

## Required terminal behavior

1. Stamp the exact approval without modifying the unapproved plan bytes.
2. Run closed-schema preflight and record zero-call posture.
3. Start the isolated adapter and verify the remote AI binding posture.
4. Invoke the live runner exactly once.
5. Stop the adapter/remote connection and remove ephemeral launch authority/configuration.
6. Independently verify retained arbitrary bytes and immutable publication.
7. Write `_bmad-output/implementation-artifacts/handoff-1-19-live-qualification-5ef8222e.md` with:
   - verdict `GO`, `NO-GO`, or `blocked`;
   - exact plan/approval/run/assembly identities and timestamps;
   - invocation count, calls, attempts, judge binding, usage, cost, latency, route reserve, terminal source, commit, and render evidence where known;
   - all 17 predicate results and derived ref or explicit absence;
   - artifact paths and SHA-256 values;
   - adapter cleanup confirmation;
   - exact writes and Git status;
   - confirmation of no external retry, deployment, activation, push, merge, or unapproved remote mutation;
   - next required independent-review gate.

If the run is ambiguous or incomplete, retain what is known, mark unknowns honestly, emit no ref, and stop. Do not repair and rerun under this approval.
