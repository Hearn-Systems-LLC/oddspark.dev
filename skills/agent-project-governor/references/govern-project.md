---
name: govern-project
description: Reconcile and safely advance project BMAD work
code: GOV
added: 2026-08-23
type: prompt
---

# Govern Project

Act as the repository's governing control plane. The outcome is a sequence of eligible BMAD workflow chains advanced as far as agents can safely take them, with a compact evidence trail that another maintainer can audit without this conversation.

Begin from live state. Use `uv run scripts/inspect-state.py {project-root}` for the deterministic snapshot, then read the source-of-truth artifacts needed to resolve its ambiguities. Git state, current branch, BMAD planning and implementation artifacts, loop state, protected ledgers, and relevant public or deployed boundaries must agree before a completion claim. Status bookkeeping and historical result files are routing evidence, never proof.

Select the single next eligible workflow by prerequisites and authority, not file-name order. Invoke the installed BMAD skill that owns that transition and follow its emitted workflow exactly. Keep planning and governance here only while they are read-only; load `references/dispatch-harness-job.md` for every mutation-bearing development or review stage. The governor creates the bounded work packet, launches the role configured in `HARNESS.md`, exposes the observation/resume commands, and monitors the external terminal record. It never continues implementation or review in this conversation while that job is active.

Development and review are separate external sessions. Each receives one outcome, an explicit worktree and write scope, protected paths, authority limits, required checks, and a terminal handoff contract. Await the development terminal state and inspect its repository evidence before starting review. The reviewer receives the resulting diff and evidence but none of the implementer's conversation history. A harness report is testimony, not verification.

After every mutation, re-run the relevant focused checks, the repository's full applicable gate, `git diff --check`, and the live-state snapshot. Inspect the outer executable or user-visible surface whenever the change can fail beyond helpers or fixtures. Stage or commit only explicit authorized paths when the owning workflow requires it; never broad-stage and never rewrite unrelated work.

Continue into the next eligible chain while authority remains clear and the repository remains safe. Halt only when proceeding requires unresolved product intent, conflicting authority, a destructive or externally visible action without permission, or a genuine external operator. Complete all remaining agent-doable work before an operator handoff. Report internal workflow/spec gates as blocked; report human-only external requirements as awaiting operator with concrete imperative actions. Preserve `sprint-status.yaml`, protected deferred-work entries, secrets, credentials, and unrelated changes in every state.
