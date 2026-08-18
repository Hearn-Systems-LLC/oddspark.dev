# Judge Structural Recovery

This is the isolated, operator-only Story 1.4 recovery harness for the frozen Workers AI judge pair. It does not deploy a Worker, modify production routes or bindings, prove semantic judgment quality, select one production `judge_ref`, or authorize provider use by itself.

## Safety boundary

- The Worker executes locally on loopback. Only the `AI` binding is remote; Cloudflare documents that `remote = true` routes that binding to the remote resource while the Worker continues to execute locally.
- `GET /health` makes no inference. Only an exact JSON `POST /run` can call an allowlisted model, and each accepted POST performs exactly one `AI.run` call.
- The frozen protocol is capped at 42 calls: one probe per model followed, only when both probes return content, by 20 sequential trials per model. It never retries or replaces a counted call.
- A probe error, timeout, or empty response stops after both probes. A counted-trial failure remains in that model's denominator and does not stop later scheduled trials.
- CI and non-interactive live execution are rejected. Deployments, production bindings, routes, KV, Durable Objects, assets, persistent Worker names, additional providers, and additional models are prohibited.
- Retention is closed to the fields listed in the disclosed plan: the full closed plan and approval, candidate and request input, run authorization/timestamps/checks, bounded provider envelope and usage records, evidence identities/results, and the full qualification bundle/manifests/refs. Credentials, request headers, secrets, account IDs, tool calls, and provider reasoning are excluded. `--account-profile` accepts only a non-secret label and rejects a bare 32-hex Cloudflare account ID.

The fixture is synthetic and uses `example.invalid`. This matrix measures provider-wire and canonical structural fidelity only.

## Offline preparation and verification

Run the complete offline contract suite:

```sh
npm run spike:judge:self-test
```

It executes all 79 shared fixtures and covers all 18 frozen Story 1.3 predicates without network access. Verify a retained evidence-v2 artifact explicitly with:

```sh
npm run spike:judge:verify -- --file path/to/evidence-v2.json
```

Verify a qualification bundle and its sibling evidence file with:

```sh
npm run spike:judge:qualification:verify -- --file path/to/qualification-bundle.json
```

The normal `npm run check` gate includes the Story 1.4 self-test once; the self-test does not invoke `npm run check`, so CI coverage does not recurse.

The qualification verifier independently recomputes the evidence hash, plan ref, approval match, source/runtime/request identities, all evidence predicates and fixtures, per-model rates, AD-11 manifests, and domain-separated refs. A v1 artifact remains immutable historical evidence and is never interpreted as v2; the legacy verifier is available only as `npm run spike:judge:verify:v1 -- <v1.json>`.

The launcher check starts the pinned adapter on loopback, checks the complete health identity, makes zero inference calls, and terminates it:

```sh
npm run spike:judge:verify-launcher
```

## Frozen disclosure and approval

The operator first confirms the active Wrangler account/profile and Workers AI plan/headroom. Do not persist the account ID. Then generate a plan outside the repository; this makes no provider call:

```sh
npm run spike:judge:plan -- \
  --output /tmp/oddspark-judge-recovery-plan.json \
  --account-profile '<non-secret profile label>' \
  --plan paid
```

For a free plan, use `--plan free --remaining-free-neurons <observed remaining neurons>`. Plan creation refuses headroom below the conservative maximum.

The plan discloses and hashes the provider, ordered resolved models, full frozen request manifest and request hashes, prompt/wire-schema/adapter/binding/runtime/source identities, timeout and call policies, retained fields, 42-call cap, pricing basis, maximum estimated dollars and neurons, approval run id, and one-recovery governance. Plan output inside the repository is rejected. The command also atomically writes an `-approval-template.json` sibling or rolls the plan back. That template is not authority: both timestamp fields are deliberately `null`.

The frozen price basis is the Cloudflare Workers AI pricing table observed 2026-07-29: `gpt-oss-120b` at $0.35/M input and $0.75/M output tokens, `gpt-oss-20b` at $0.20/M input and $0.30/M output tokens, with the existing $0.011/1,000-neuron conversion and 10,000-neuron daily free allocation. The generated plan computes its exact conservative maximum from the frozen request and 2,048-token output cap; a changed basis changes the plan ref and requires new approval.

After reviewing the exact plan and cost, the operator must replace both `null` timestamp placeholders with canonical UTC `approved_at` and `expires_at` values no more than four hours apart, then change `decision` to `approved`. Changing only the decision can never authorize. `approved_at` cannot precede the disclosed plan's `created_at`. The resulting record is closed: missing or unknown fields, malformed JSON, a stale or future-dated timestamp, or any mismatch in plan ref, approval run id, call cap, or maximum cost fails closed.

## Operator-only live sequence

Only after the exact approval exists:

1. Start the isolated adapter in one terminal:

   ```sh
   npm run spike:judge:dev
   ```

2. In another terminal, run the approved plan:

   ```sh
   npm run spike:judge:live -- \
     --plan-file /tmp/oddspark-judge-recovery-plan.json \
     --approval-file /tmp/oddspark-judge-recovery-plan-approval.json
   ```

3. Stop the adapter. Run both explicit verifiers against the printed evidence and qualification paths.

Before adapter preflight, the runner reconstructs the plan from current bytes and requires an exact fresh approval. An omitted, nonexistent, or malformed approval file is treated as missing/invalid authority, not as a reason to skip evidence creation. Missing, stale, open, mismatched, or drifted authority produces verified zero-call `NO-GO` evidence and no qualification refs. The evidence retains precise plan, approval, offline-gate, adapter-skipped/failed, and run-start-expiry reasons; it does not claim an adapter observation when the handshake was skipped. Approval is checked again at `evidence.run.started_at` immediately before provider calls; the qualification bundle records that observation time and later verifiers recompute against it, so valid retained evidence remains verifiable after the approval window expires.

The entire prior scan, run, and publication is protected by an atomic local exclusive lock. A durable local spend receipt is created for the attempt and atomically advanced before every provider invocation. A live concurrent process cannot acquire the lock; after a crash, any receipt showing calls started—or any unreadable/unknown receipt—blocks another attempt. Only a stale reservation that proves zero calls and belongs to a dead process may be recovered.

Prior discovery fully verifies zero-call evidence, its deterministic Markdown, and its sibling qualification bundle before ignoring it. Truncated/tampered zero-call files, `*-v2-invalid.json`, spend receipts that show or cannot disprove calls, temporary/orphaned partial publication, and missing or invalid siblings all block. Qualification refs are printed only from an independently verified sibling bundle.

After provider calls, evidence must independently pass all 18 predicates and all 79 fixtures before evidence, Markdown, and the qualification bundle publish as one atomic set. Every execution attempt receives a unique basename containing its evidence digest and attempt id, and the qualification bundle binds the exact sibling evidence filename and bytes. Repeated zero-call blocks therefore remain available when a corrected approval uses the same plan and approval run id. Evidence, qualification, verification, or publication failure after a call retains a discoverable `*-v2-invalid.json` record whenever evidence construction completed and always preserves the spend receipt, so a failure cannot reopen the allowance. Publication failure rolls back the valid sibling set before failure retention.

`GO` requires each model independently to reach at least 19/20 direct-valid trials. Repaired-valid rates, latency, usage, cost, outcome, and manifest remain separate per model in every bundle. Only an overall `GO` derives the two exact `STRUCT-JUDGE` qualification refs; `NO-GO` emits none. Selecting or aggregating refs into a later production activation `judge_ref` is outside Story 1.4. Any spent `NO-GO` requires MVP review, blocks dependent work, and permits no third matrix.
