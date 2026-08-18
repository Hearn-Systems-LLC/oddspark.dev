# Judge Fidelity Spike

This is a non-production, opt-in structural-fidelity test for the configured Workers AI judge models. It does not deploy a Worker, modify production routes or bindings, prove semantic judgment quality, or authorize Story 1.8.

## Safety boundary

- The Worker runtime stays local on `127.0.0.1:8788`; only the `AI` binding is remote.
- Start it with `npm run spike:judge:dev`. Do not add `--remote`, `--local`, or run `wrangler deploy` with this config.
- `GET /health` makes no inference. Only an exact JSON `POST /run` can call an allowlisted model, and each accepted POST performs exactly one `AI.run` call.
- The live command is capped at 42 calls: a successful preflight runs both model probes first and then 20 counted trials for each model, while a rejected, timed-out, or empty probe stops after the two probes. It never retries. A timeout or provider error during a counted trial is retained in the denominator and the remaining scheduled trials continue.
- Results retain only allowlisted answer locations, sanitized provider errors, allowlisted numeric usage, and provider-reported effective values. Credentials, headers, account IDs, raw provider envelopes, tool calls, and reasoning are excluded.

The fixture is synthetic and uses `example.invalid`. Its `synthetic-grounding-report/v1` object is fixture-only; Story 1.5 owns the production Brief/grounding contract. This spike measures structural output fidelity, not whether the model shares the intended taste or applies the gates correctly.

## Offline verification

```sh
npm run spike:judge:self-test
```

The self-test executes the complete 79-case shared fixture catalog and tests all 18 frozen evidence-v2 predicates, including mutation routing. It produces synthetic NO-GO proof only; it does not verify a supplied artifact and uses no network.

Verify one or more explicit evidence-v2 JSON artifacts with the same shared fixture executor used by the self-test:

```sh
npm run spike:judge:verify:v2 -- path/to/evidence-v2.json [another-evidence-v2.json]
```

The v2 verifier independently reconstructs provider requests and adapter inputs, executes the fixture catalog, recomputes source/runtime/legacy identities, classifications, counts, rates, predicates, outcome, and Markdown. It accepts an exact permitted loopback health endpoint, including a non-default port. A supplied v1 artifact remains immutable historical evidence and is never dispatched through v2 rules; `npm run spike:judge:verify` remains the legacy v1 verifier.

The ordered v2 predicate oracle is versioned and hashed. Any predicate identity, ordering, description, or behavior change requires a new evidence version; it must not reinterpret retained v1 or v2 bytes in place.

Before an authorized live run, the separately invoked launcher check starts the pinned adapter on loopback, compares the complete served health descriptor with independently computed source/config/runtime identities, makes zero inference calls, and terminates the adapter:

```sh
npm run spike:judge:verify-launcher
```

## Authorized live protocol

1. Run `npx wrangler whoami --json` and confirm the active profile/account transiently. Do not copy an account ID into a file.
2. Check the Workers AI dashboard for the account plan and current daily neuron usage/headroom. The free allocation is 10,000 neurons per day and resets at 00:00 UTC; paid usage above it is currently priced at $0.011 per 1,000 neurons.
3. Run the offline self-test and start the local adapter in one terminal:

   ```sh
   npm run spike:judge:dev
   ```

4. In another terminal, run the exact approved matrix. For a free plan, include the observed remaining free neurons:

   ```sh
   npm run spike:judge:live -- \
     --approved-call-cap 42 \
     --profile-confirmed \
     --headroom-confirmed \
     --plan free \
     --remaining-free-neurons 10000
   ```

   For a paid plan, use `--plan paid`; the conservative gross estimate is printed before any inference. The flags are operator assertions and do not persist the account/profile identity.

5. Stop the local adapter and run `npm run spike:judge:verify:v2 -- <the printed evidence-v2.json path>`.

The runner records both probes before any trial. If either probe is a provider error, timeout, or empty response, it writes verifiable `NO-GO` evidence with both probe records and makes no matrix calls. Otherwise it performs exactly 20 sequential trials per model; every scheduled timeout/provider error remains counted and does not stop the matrix. Adapter identity or authorization preflight failure writes verifiable zero-call `NO-GO` evidence. Evidence is written before a post-call integrity failure is surfaced, so authorized spend always leaves an inspectable fail-closed artifact. Missing provider usage remains `null` and is reported as missing, never as zero usage.

`GO` requires both models to reach at least 19 direct-valid outputs out of 20 plus complete fixture and evidence integrity. Repaired results are reported separately and never inflate direct fidelity. Story 1.3 defines the judge recovery contract and offline verifier; Story 1.4 alone owns authorization and execution of any live provider run. Neither offline command authorizes inference.

## Story 1.8 handoff

Story 1.8 may adopt allowlisted extraction from `response`, `result`, or `choices[0].message.content`; type-sensitive byte-identical duplicate handling; the 64 KiB UTF-8 bound; and exactly one of these repairs followed by strict validation: BOM removal, a lowercase whole-value `json` fence, one double-encoded JSON string, or bounded prose around one balanced JSON object.

Empty or ambiguous envelopes, oversized output, truncated or multiple objects, guessed syntax, chained wrappers, coercion, schema drift, semantic omission, and `pass: true` alongside any reported failure remain hard failures. Semantic calibration still depends on Stories 1.3 and 1.8.
