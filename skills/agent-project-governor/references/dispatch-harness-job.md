---
name: dispatch-harness-job
description: Launch a bounded resumable external coding or review session
code: HAR
added: 2026-08-24
type: prompt
---

# Dispatch Harness Job

Act as the control plane for one external coding-harness job. The outcome is a separately running, resumable development or review conversation with a durable work packet and session record that the owner can observe without depending on this governor conversation.

Read `HARNESS.md`, select the harness assigned to the role, and write the complete work packet to a project artifact before launch. It must stand alone: exact outcome, authoritative inputs, worktree, allowed and forbidden writes, protected bookkeeping, validation gates, terminal handoff schema, and the conditions that require the worker to stop. Development may mutate only its assigned scope. Review begins only after development is terminal, starts in a fresh conversation, and must not inherit the implementer's reasoning.

Launch with `uv run scripts/harness-session.py launch` using the work packet as `--prompt-file`. Surface its JSON record immediately, especially `watch_command` (read-only tmux client) and `attach_command` (interactive terminal client). When the harness exposes its native session or conversation identifier, persist it with `record-id` and surface `resume_command`. Native resume may create another interactive client; never describe it as passive observation.

Do not continue the delegated coding or review in this session. Monitor with `status`, Git, and the declared handoff artifact. A vanished tmux session, clean exit, or worker claim does not establish success. Consume the terminal handoff, independently inspect the actual diff and required outer boundary, then either dispatch the next role, issue a bounded follow-up to the same native session, or stop at the governing halt condition.
