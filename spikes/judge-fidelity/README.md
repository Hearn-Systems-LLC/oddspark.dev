# Judge Structural Recovery

This is the isolated, operator-only Story 1.4 recovery harness for the frozen Workers AI judge pair. It does not deploy a Worker, modify production routes or bindings, prove semantic judgment quality, select one production `judge_ref`, or authorize provider use by itself.

## Safety boundary

- The Worker executes locally on loopback. Only the `AI` binding is remote; Cloudflare documents that `remote = true` routes that binding to the remote resource while the Worker continues to execute locally.
- `GET /health` makes no inference. Only an exact JSON `POST /run` can call an allowlisted model, and each accepted POST performs exactly one `AI.run` call.
- The frozen protocol is capped at 42 calls: both ordered probes complete before any trials, then each probe-accepted model independently receives 20 sequential trials. It never retries or replaces a call.
- A probe error, timeout, or empty response rejects only that configuration. A counted-trial failure remains in that model's denominator and does not stop later scheduled trials or the peer configuration.
- CI and non-interactive live execution are rejected. Deployments, production bindings, routes, KV, Durable Objects, assets, persistent Worker names, additional providers, and additional models are prohibited.
- Retention is closed to the fields listed in the disclosed plan: the full closed plan and approval, candidate and request input, run authorization/timestamps/checks, bounded provider envelope and usage records, evidence identities/results, and the full qualification bundle/manifests/refs. Credentials, request headers, secrets, account IDs, tool calls, and provider reasoning are excluded. `--account-profile` accepts only a non-secret label and rejects a bare 32-hex Cloudflare account ID.

The fixture is synthetic and uses `example.invalid`. This matrix measures provider-wire and canonical structural fidelity only.

The provider-facing wire schema (`Oddspark judge wire verdict v2`) uses only constructs the Workers AI structured-output engine enforces: gates are fixed `gate_1`…`gate_9` properties with `{pass, reason}` objects, alongside `tone` and `claims`. The adapter maps this wire shape losslessly to the canonical verdict (ordered `gates` array) before classification; canonical validation, including the pass-consistency rule, is unchanged. (Amended 2026-08-22 after the first live cycle proved `allOf`/`contains`/`if-then`/`const` are not enforced by the provider — both models returned boolean-map gates and string tone/claims on every call.)

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

Both public verifiers first require the exact marker-bound evidence JSON, deterministic Markdown, and qualification bundle publication set. The qualification verifier then independently recomputes the evidence hash, plan ref, approval match, source/runtime/request identities, all evidence predicates and fixtures, per-model rates, AD-11 manifests, and domain-separated refs. A v1 artifact remains immutable historical evidence and is never interpreted as v2; the legacy verifier is available only as `npm run spike:judge:verify:v1 -- <v1.json>`.

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

The plan discloses and hashes the provider, ordered resolved models, full frozen request manifest and request hashes, prompt/wire-schema/adapter/binding/runtime/source identities, timeout and call policies, retained fields, 42-call cap, pricing basis, maximum estimated dollars and neurons, approval run id, and one-recovery governance. Plan output inside the repository is rejected. The command prepares the plan and an `-approval-template.json` sibling, then publishes a completion marker binding both names and byte hashes. Readers must require that marker; without it the disclosure is incomplete. The template is not authority: both timestamp fields are deliberately `null`.

Account profiles are bounded printable non-secret labels (letters, digits, single spaces, `.`, `_`, and `-`, at most 64 characters); paths, traversal, account-ID-shaped values, and secret-like punctuation remain invalid. The exact Story 1.26 label `Hearn Systems account` is valid. Repository output remains rejected except for an explicitly requested `--offline-requalification` Story 1.26 uniquely named `unapproved` disclosure directly under this spike's `results/`; that flag bypasses only the historical-spend planning gate and grants no execution or allowance authority.

The price basis observed 2026-08-19 uses Cloudflare's exact published `llama-3.3-70b-instruct-fp8-fast` rates of $0.29/M input and $2.25/M output tokens. Cloudflare did not publish an exact price binding for the selected `llama-3.1-8b-instruct-fast` endpoint, so only its approval maximum is conservatively charged at the same 70B rates. That rate is not stored as observed 8B pricing, and observed 8B dollar cost remains unknown/noncomputable. The generated plan computes its exact conservative maximum from the frozen request and 2,048-token output cap; a changed basis changes the plan ref and requires new approval.

After reviewing the exact plan and cost, leave the generated plan/template pair immutable. Copy the template to the distinct canonical approval path, then edit only the copy:

```sh
cp /tmp/oddspark-judge-recovery-plan-approval-template.json /tmp/oddspark-judge-recovery-plan-approval.json
```

Replace both `null` timestamp placeholders in the copied `-approval.json` file with canonical UTC `approved_at` and `expires_at` values, then change `decision` to `approved`. Both on-disk records must remain canonical two-space JSON with exactly one trailing newline; duplicate keys and alternate byte serializations fail closed. Changing only the decision can never authorize. `approved_at` cannot precede the disclosed plan's `created_at` and must be no more than one hour after that plan/headroom disclosure; the approval lifetime remains capped at four hours. Authority is valid at `approved_at` and expires before `expires_at` itself. The resulting record is closed: missing or unknown fields, malformed JSON, a stale or future-dated timestamp, or any mismatch in plan ref, approval run id, call cap, or maximum cost fails closed.

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

Before authority checks or adapter preflight, the runner verifies the disclosure completion marker and exact immutable plan/template bytes, then reconstructs the plan from current bytes and requires an exact fresh approval from the distinct copied file. An omitted, nonexistent, or malformed approval file is treated as missing/invalid authority, not as a reason to skip evidence creation. Missing, stale, open, mismatched, or drifted authority produces verified zero-call `NO-GO` evidence and no qualification refs. The evidence retains precise plan, approval, offline-gate, adapter-skipped/failed, and run-start-expiry reasons; it does not claim an adapter observation when the handshake was skipped. Approval is checked again at `evidence.run.started_at` immediately before provider calls; the qualification bundle records that observation time and later verifiers recompute against it, so valid retained evidence remains verifiable after the approval window expires.

The entire prior scan, run, and publication is protected by an attempt-bound local exclusive lock. A durable receipt with the same attempt id is created and its file plus parent-directory metadata are synchronized before every provider invocation. A live concurrent process cannot acquire the lock. Any stale, unknown, or malformed lock requires manual recovery; the command never check/unlinks a stale pathname. A receipt showing calls started—or one that is unreadable or cannot be bound to the lock attempt—blocks another attempt.

Prior discovery classifies immutable gpt-oss history before applying current-cycle blockers. A historical completed set is ignored only after its v1 marker, every bound byte, evidence/Markdown relationship, legacy model identity, and bundle/evidence binding verify; a sibling claiming v1 is never trusted alone. Truncated/tampered current-cycle zero-call files, current-cycle `*-v2-invalid.json`, receipts that show or cannot disprove calls, temporary/orphaned current publication, and missing or invalid siblings all block. Configuration and role refs are returned only from an independently verified sibling bundle whose receipt binds the attempt-bearing basename, record count, and exact final call.

After the last call, source, runtime, and request identities are freshly re-read; cached preflight identities cannot certify the result. Evidence must then independently pass all 18 predicates and all 79 fixtures before publication. Evidence, Markdown, and qualification files are synchronized individually, and a completion marker is published last with every sibling name, length, and byte hash. The runner re-reads and independently verifies that complete set before changing the receipt to `completed-spent`; any mismatch becomes `consumed_incomplete`. Every execution attempt receives a unique basename containing its evidence digest and attempt id, and called failure retention uses the same attempt provenance. Evidence, qualification, verification, or publication failure after a call retains discoverable evidence whenever construction completed and always preserves terminal accounting, so a failure cannot reopen the cycle.

Each model independently reaches `GO` only at 19/20 direct-valid trials with every closed integrity predicate passing. Repaired-valid rates, latency, usage, cost, overflow, outcome, and manifest remain separate. Only a passing configuration emits its configuration ref. The closed `RoleQualificationSet` contains exactly `version`, `role`, `primary`, `fallback`, `tested_source_identity`, `cycle_ref`, and lowercase `outcome`; each member carries its resolved model, nullable ref, and lowercase outcome. The role is `go` exactly when at least one member is `go`, and its exact domain-separated `STRUCT-JUDGE` role ref is emitted for later activation. Called incomplete or ambiguous evidence emits no refs, records `consumed_incomplete`, and blocks another matrix.
