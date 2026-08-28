# Story 1.26 Stage 2 r3 live qualification handoff

Date: 2026-08-26
Baseline: clean `develop` at `ff9bdf1e252467e4b0a2a584c7e16c7594f63520`, equal to refreshed `origin/develop`
Terminal status: **STRUCTURAL GO / ACCOUNTING NO-GO — STOP FOR INDEPENDENT REVIEW**

## Exact authority binding

- Owner authorization: `I authorize the exact Stage 2 r3 judge live run described above for one execution.`
- Plan: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan.json`
- Plan SHA-256: `1f4fb793a4ff9a7dc5ab0da37d031134ad3e98a525329385ee5a9f827d1f2863`
- Plan ref: `a3fce39dc2af1afd34d36fa65d0005dab9c6a176ada118bb0d074771f4a19083`
- Historical closure ref: `e827240fbc244ac2f526d32eef3cc01e785ddda40a79fe5d2d9f0b251f22d066`
- Run ID: `story-1-26-judge-requalification-20260826-r3`
- Approval: `spikes/judge-fidelity/results/story-1-26-judge-requalification-20260826-r3-unapproved.plan-approval.json`
- Approval interval: `2026-08-26T18:57:27.300Z` through exclusive `2026-08-26T22:57:27.300Z`. The approval time is after plan creation `2026-08-26T18:41:22.215Z` and before the inclusive deadline `2026-08-26T19:41:22.215Z`.
- Account label and plan: `Hearn Systems account`, Workers `paid`, 10,000 daily free neurons first and bounded paid overage.
- Frozen allowance: 42 calls, `$0.3054702` / 27,770.018181818185 neurons, zero retries, zero replacements, one runner invocation.

## Preflight and timestamps

Before approval creation, independent checks confirmed clean HEAD/origin equality; exact plan/template/marker hashes and byte lengths; canonical marker membership; closure ref and every historical member hash; byte-for-byte plan reconstruction; current source identity `db425506757d630e163667dad0d17352206a79e64e7923c645ac0f209153874b`; runtime identity `a3d5ae76d31669bc1f008f7ef3d0fdde14d4a5b1fcb0fc63e70d290cdae32feb`; assembly identity `9e20e72300d2c84c85d62e98ff5d9bd9a2f806dc94b808d2305bad132f4217f5`; absent r3 approval/receipt/lock/evidence/invocation/call; verified successor recovery eligibility; credential availability without disclosure; and no active adapter or port listener. Offline evidence passed 85/85 judge tests, 79/79 fixtures, and 18/18 predicate coverage.

- Receipt reserved: `2026-08-26T19:03:40.026Z`.
- Runner start / approval observation: `2026-08-26T19:03:40.163Z`.
- Runner end: `2026-08-26T19:10:46.697Z`.
- Terminal receipt update: `2026-08-26T19:10:48.215Z`.
- Attempt ID: `cc246aab-3c0e-4a75-b237-07d0edc60652`.

## Results and retained closure

The assembled orchestrator was invoked exactly once. It started exactly 42 calls: two probes and 40 trials in the frozen order. All 42 records are `received`, all have `error_code:null`, all are `direct_valid`, and every record has complete usage. Retries: `0`. Replacements: `0`.

- Primary `@cf/meta/llama-3.3-70b-instruct-fp8-fast`: probe direct-valid; 20/20 trials direct-valid; 20/20 post-repair-valid; configuration ref `27c584f8f893653d26cbc12c2e83a3f9e86672e3878261c2cecb0afa5136e435`.
- Fallback `@cf/meta/llama-3.1-8b-instruct-fast`: probe direct-valid; 20/20 trials direct-valid; 20/20 post-repair-valid; configuration ref `d4b024cb990e3c483a4bf061eb3d939147f4a4c3a34ad5fc0f3dd9a54970c3cf`.
- Runner structural decision: `GO`.
- Role qualification ref: `64691773c52085f0241c81fb738ac8b849dceab73a9881bec7b38b3c4fb59799`.
- Receipt: `spikes/judge-fidelity/results/.judge-llama-cycle-successor-spend.json`, terminal `completed-spent`, 42 calls.
- Evidence: `spikes/judge-fidelity/results/2026-08-26-story-1--44d8a8a7744d86fc-cc246aab-3c0e-4a75-b237-07d0edc60652-v2.json`.
- Qualification: `spikes/judge-fidelity/results/2026-08-26-story-1--44d8a8a7744d86fc-cc246aab-3c0e-4a75-b237-07d0edc60652-qualification.json`.
- Completion marker and deterministic Markdown siblings are present and independently verified.

## Usage, cost, and fail-closed verdict

All usage is present: 43,428 prompt plus 23,271 completion equals 66,699 tokens. The 70B member used 21,714 prompt and 12,077 completion tokens; at the exact retained 70B rates this is `$0.033470309999999996` or 3,042.755454545454 neurons. The 8B member used 21,714 prompt and 11,194 completion tokens, but the exact selected 8B price is not published or bound by the plan, so its exact observed dollars and neurons are unverifiable. The plan's conservative 70B surrogate produces `$0.03148356` for that usage and `$0.06495387` / 5,904.897272727273 neurons combined, nominally within the 10,000 free-neuron allocation; this is a conservative estimate, not exact provider billing proof.

Independent verdicts:

- Model structural fidelity: **primary GO / fallback GO**.
- Retained runner qualification: **GO** with two configuration refs and one role ref.
- Story 1.26 Stage 2: **NO-GO**, because the owner's governing packet says unverifiable spend fails closed and exact 8B spend/free-neuron accounting cannot be proved. The structural refs must not be accepted into Stage 3 until independent review resolves this boundary with authoritative billing evidence or a fresh owner decision.

## Validation, cleanup, and changed paths

- Public evidence verifier: PASS, 18 predicates and 79 fixtures.
- Public qualification verifier: PASS, `GO`, two refs.
- Completion marker, evidence/Markdown binding, receipt attempt/basename/cardinality/final-call binding: PASS.
- Adapter stopped; remote development connection closed; port `8788` has no listener.
- Runner exited `0`; no runner process remains.
- `.judge-recovery.lock` absent. Terminal successor spend receipt intentionally retained.
- Historical receipt, closure, evidence, plan, template, marker, and member bytes remain unchanged.

Allowed changed paths only:

- the exact r3 approval;
- `.judge-llama-cycle-successor-spend.json`;
- the r3 evidence JSON, Markdown, qualification, and completion marker;
- this handoff;
- `story-1-26-requalification-matrix-2026-08-26.md`.

No source, test, config, secret, status, deferred-work, Stage 3, deployment, signing, activation, commit, push, or unrelated remote mutation occurred.

## Next gate

Stop for independent adversarial review of the exact changed surface, especially the distinction between the retained structural `GO` and the packet-mandated accounting `NO-GO`. Stage 3 remains blocked and unexecuted.
