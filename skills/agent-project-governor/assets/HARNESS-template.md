# External Harnesses

This file is the project-local routing authority for mutation-bearing delegated work. Change it to assign a different harness by role; never copy active session identifiers between projects.

## Role Routing

| Role | Harness | Start mode | Native resume |
|------|---------|------------|---------------|
| development | `codex` | Interactive Codex session in the assigned worktree | `codex -C <worktree> resume <session-id>` |
| code-review | `agy` | Interactive Antigravity conversation in the assigned worktree | `(cd <worktree> && agy --conversation <conversation-id>)` |

## Session Transport

- Launch every job through `uv run scripts/harness-session.py launch ...`. It creates a detached `tmux` session and a durable record under `harness-sessions/`.
- Start `uv run scripts/harness-monitor.py observe --record <record> ...` immediately after launch. Continue bounded observation runs with regular heartbeat reporting until a terminal handoff or governing stop; launch-and-return is not monitoring.
- Give the owner the emitted `watch_command` for a read-only live view and `attach_command` for interactive terminal control.
- Record the harness-native session identifier as soon as it is visible. The emitted `resume_command` then opens that conversation in another terminal. Native resume can be an additional interactive client; use read-only tmux attachment when observation must not send input.
- Keep development and review in different harness conversations. A review job receives the diff and evidence, never the implementer's conversation history.

## Safety Defaults

- Do not use approval-bypass or sandbox-bypass flags.
- The job worktree and allowed write paths come from the BMAD work packet, not from this routing table.
- One external job owns a worktree at a time. Do not run a reviewer concurrently with an active writer in the same worktree.
- Prompt and stall flags are conservative attention signals, never authorization. Submit input only on explicit instruction with `harness-monitor.py submit`; it refuses target read-only viewers unless explicitly allowed to detach those viewers, and it never detaches clients from other sessions.
- A terminal session ending, handoff-file existence, or pane output changing after submission is not proof of success or worker acceptance. Consume the job's terminal handoff and independently inspect its claims, the diff, scope boundaries, and live validation evidence.
