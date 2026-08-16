# Judge Fidelity Spike

This is a non-production, opt-in structural-fidelity test for the configured Workers AI judge models. It does not deploy a Worker, modify production routes or bindings, prove semantic judgment quality, or authorize Story 1.8.

## Safety boundary

- The Worker runtime stays local on `127.0.0.1:8788`; only the `AI` binding is remote.
- Start it with `npm run spike:judge:dev`. Do not add `--remote`, `--local`, or run `wrangler deploy` with this config.
- `GET /health` makes no inference. Only an exact JSON `POST /run` can call an allowlisted model, and each accepted POST performs exactly one `AI.run` call.
- The live command is capped at 42 calls: one probe and 20 counted trials for each of the two configured models. It never retries. A timeout stops the matrix because aborting the local fetch does not prove the remote inference stopped.
- Results retain only allowlisted answer locations, sanitized provider errors, allowlisted numeric usage, and provider-reported effective values. Credentials, headers, account IDs, raw provider envelopes, tool calls, and reasoning are excluded.

The fixture is synthetic and uses `example.invalid`. Its `synthetic-grounding-report/v1` object is fixture-only; Story 1.5 owns the production Brief/grounding contract. This spike measures structural output fidelity, not whether the model shares the intended taste or applies the gates correctly.

## Offline verification

```sh
npm run spike:judge:self-test
npm test
```

The self-test covers the strict AD-2 schema, complete AD-5-shaped synthetic input, envelope ambiguity, the 64 KiB bound, exactly-one repair rules, hard-fail shapes, call counting, result arithmetic, and the 95% per-model threshold. It uses no network.

After a live run, verify all retained evidence with:

```sh
npm run spike:judge:verify
```

The verifier recomputes executable-source and semantic hashes, fixture results, per-call classifications, counts, rates, outcome, and the Markdown decision record. Source drift is an explicit failure.

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

5. Stop the local adapter and run `npm run spike:judge:verify`.

The runner records one probe per model first. If either request is rejected or returns no judge content, it writes `NO-GO` evidence and makes no matrix calls. If both return content, it performs exactly 20 sequential trials per model. `GO` requires both models to reach at least 19 direct-valid outputs out of 20, plus complete fixture and evidence integrity. Repaired results are reported separately and never inflate direct fidelity.

## Story 1.8 handoff

Story 1.8 may adopt allowlisted extraction from `response`, `result`, or `choices[0].message.content`; type-sensitive byte-identical duplicate handling; the 64 KiB UTF-8 bound; and exactly one of these repairs followed by strict validation: BOM removal, a lowercase whole-value `json` fence, one double-encoded JSON string, or bounded prose around one balanced JSON object.

Empty or ambiguous envelopes, oversized output, truncated or multiple objects, guessed syntax, chained wrappers, coercion, schema drift, semantic omission, and `pass: true` alongside any reported failure remain hard failures. Semantic calibration still depends on Stories 1.3 and 1.8.
