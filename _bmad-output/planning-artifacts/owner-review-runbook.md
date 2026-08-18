---
title: Oddspark Owner Review Runbook
project: oddspark
version: 1
governing: true
status: final
updated: 2026-08-17
---

# Oddspark Owner Review Runbook

Authority: Justin  
Sprint story: 3.3 establishes this runbook and completes the first cycle.  
Later weekly cycles are not sprint stories.

## Cadence

Weekly after Story 3.3.

## Record binding

Before sampling, compute the SHA-256 of this exact runbook file. Every cycle record retains the runbook version, exact runbook SHA-256, deployed identity, rubric identity, and review time. A later runbook change creates a new version; it never reinterprets a historical cycle record.

## Sample

Exactly 20 Briefs.

Fill from available local production serves first, then generated and house fixtures. Eligible domain Briefs may supplement the sample but are never required.

Do not manufacture traffic. The first cycle requires Story 3.2 `LOCAL PASS`; it does not wait for Story 2.10, Story 3.4 `DOMAIN PASS`, or organic volume.

## Record fields (each item)

- agree / should_fail
- stable reasons
- rationale
- mode
- source class
- runbook version
- exact runbook SHA-256
- rubric identity
- deployed identity
- review time

## Triage

Thresholds never move after observing results.

- Rubric issues → semantic fixtures
- House issues → catalog
- Structural identity change → invalidate that evidence and all dependents
- Story 1.4 recovery limits unchanged
- Any live rerun or reactivation needs its own authority

## SM-3

Count inbound conversations that reference a specific Spark that month.

Attribution is manual. Do not add visitor keys.

## Done vs ongoing

Story 3.3 is done when this runbook and one durable first-cycle record exist.

Weekly runs after that update review records only.
