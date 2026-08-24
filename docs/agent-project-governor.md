# Using the autonomous BMAD governor

The project governor is the control plane for BMAD work. It inspects live repository and artifact state, selects the next eligible workflow, and verifies convergence. Mutation-bearing development and code review run in separate external harness conversations so the governor does not become the implementer or reviewer it is supervising.

The tracked source bundle is [`skills/agent-project-governor/`](../skills/agent-project-governor/). Each project gets an independent runtime sanctum at `_bmad/memory/agent-project-governor/`; do not share that directory between repositories.

## Prerequisites

- A BMAD-enabled repository with `_bmad/` configuration and the BMAD skills required by the selected workflow.
- Python 3.10 or newer and [`uv`](https://docs.astral.sh/uv/).
- [`tmux`](https://github.com/tmux/tmux) for detachable live terminals.
- Every harness assigned in `HARNESS.md`. The default routing is:
  - development: `codex`
  - code review: `agy`

Check the local tools before first use:

```sh
uv --version
tmux -V
codex --version
agy --version
```

The governor never adds approval-bypass or sandbox-bypass flags. Configure authentication and normal harness permissions before dispatching work.

## Install in another project

Copy the complete source bundle into a skill location recognized by that project's agent host. For a project-local installation:

```sh
TARGET_PROJECT=/absolute/path/to/project

mkdir -p "$TARGET_PROJECT/.agents/skills"
cp -R skills/agent-project-governor \
  "$TARGET_PROJECT/.agents/skills/agent-project-governor"
```

Keep the bundle intact: `SKILL.md`, `customize.toml`, `assets/`, `references/`, and `scripts/` are one versioned unit.

## Initialize the project sanctum

Run once from any directory, using absolute project and skill paths:

```sh
TARGET_PROJECT=/absolute/path/to/project
GOVERNOR_SKILL="$TARGET_PROJECT/.agents/skills/agent-project-governor"

uv run "$GOVERNOR_SKILL/scripts/init-sanctum.py" \
  "$TARGET_PROJECT" \
  "$GOVERNOR_SKILL"
```

This creates `_bmad/memory/agent-project-governor/` with the governor's identity, project preferences, external-harness routing, capabilities, operational references, and scripts. Initialization is intentionally idempotent: it refuses to overwrite an existing sanctum.

The first normal invocation also routes through First Breath when no sanctum exists. Manual initialization is useful for installation automation and for verifying paths before the first conversation.

## Invoke the governor

Invoke `agent-project-governor` through the agent host from the target project's root and ask it to govern or advance the project. For an unattended scheduled wake, invoke it with `--pulse` through the host's skill runner.

The governor will:

1. Load the project's sanctum and `HARNESS.md`.
2. Inspect Git and BMAD artifacts without mutating protected bookkeeping.
3. Select one eligible workflow chain.
4. Keep read-only planning and governance in the invoking conversation.
5. Dispatch development or review to an external harness session.
6. Verify the terminal handoff and live repository evidence before continuing.

It stops for unresolved product intent, authority conflicts, destructive actions, or genuine external operator requirements. A harness exit or worker claim is never completion proof by itself.

## Configure harnesses by role

Edit the project's live file:

```text
_bmad/memory/agent-project-governor/HARNESS.md
```

The default table routes development to Codex and code review to Antigravity:

```markdown
| Role | Harness |
|------|---------|
| development | `codex` |
| code-review | `agy` |
```

Development and review must use distinct conversations. Review starts only after the writer is terminal and receives the diff, authoritative artifacts, and evidence—not the implementer's conversation history.

## What a dispatched job produces

Before launch, the governor writes a self-contained work packet with:

- exact outcome and authoritative inputs;
- assigned worktree and allowed write paths;
- protected and forbidden paths;
- authority and stop conditions;
- focused and full validation gates;
- required terminal handoff fields.

The launcher creates a durable JSON record under:

```text
_bmad/memory/agent-project-governor/harness-sessions/<job-name>.json
```

The record contains the role, harness, worktree, prompt file, timestamps, exit status, native session identifier when known, and connection commands.

## Watch, attach, or resume

The launch result exposes three different connection modes.

### Watch without sending input

```sh
tmux attach-session -r -t gov-<job-name>
```

This is the safest way to observe live development or review. The `-r` client is read-only.

Detach from tmux without stopping the worker with `Ctrl-b`, then `d`.

### Attach interactively

```sh
tmux attach-session -t gov-<job-name>
```

This connects to the live terminal with input enabled. Use it only when you intend to interact with the worker.

### Resume the harness conversation

Once the native identifier has been recorded, the job record contains a `resume_command`.

Codex:

```sh
codex -C /absolute/path/to/worktree resume <session-id>
```

Antigravity:

```sh
(cd /absolute/path/to/worktree && agy --conversation <conversation-id>)
```

Native resume opens another interactive client; it is not passive observation. Prefer the read-only tmux command when you only want to watch.

## Manual dispatch and session recording

The governor normally performs these operations. They are documented for testing and recovery.

Launch development:

```sh
uv run _bmad/memory/agent-project-governor/scripts/harness-session.py launch \
  --project-root "$PWD" \
  --role development \
  --harness codex \
  --workdir /absolute/path/to/worktree \
  --prompt-file /absolute/path/to/work-packet.md \
  --name story-1-22-dev
```

Launch an independent review:

```sh
uv run _bmad/memory/agent-project-governor/scripts/harness-session.py launch \
  --project-root "$PWD" \
  --role code-review \
  --harness agy \
  --workdir /absolute/path/to/worktree \
  --prompt-file /absolute/path/to/review-work-packet.md \
  --name story-1-22-review
```

When the harness displays its session or conversation identifier, record it:

```sh
uv run _bmad/memory/agent-project-governor/scripts/harness-session.py record-id \
  --record _bmad/memory/agent-project-governor/harness-sessions/story-1-22-dev.json \
  --session-id <native-session-id>
```

Inspect current state:

```sh
uv run _bmad/memory/agent-project-governor/scripts/harness-session.py status \
  --record _bmad/memory/agent-project-governor/harness-sessions/story-1-22-dev.json
```

`terminal_active: false` means the harness process is no longer running. It does not mean the BMAD assignment succeeded; inspect the declared handoff and repository evidence.

## Update an existing installation

Updating the source bundle does not overwrite a project's existing sanctum. This protects accumulated memory and project-specific authority settings.

For a new project, install the latest bundle and initialize normally. For an existing project:

1. Replace the installed source bundle with the new version.
2. Review changes to the shipped templates and operational references.
3. Merge behavioral changes into the live sanctum deliberately.
4. Copy updated operational scripts and capability references only after review.
5. Preserve `PERSONA.md`, `BOND.md`, `MEMORY.md`, session logs, and project-specific `HARNESS.md` choices.

Never delete and recreate a live sanctum merely to upgrade the skill.

## Troubleshooting

### The job record remains `launching`

Run `status`, then inspect the tmux pane:

```sh
tmux capture-pane -e -p -S -100 -t gov-<job-name>
```

Confirm `uv`, `tmux`, and the selected harness are on the environment inherited by the tmux server.

### The terminal ended immediately

Read the dead pane and the JSON `exit_code`. Verify the worktree and prompt file still exist and the harness can authenticate when launched normally from that worktree.

### A job name already exists

Job names and records are immutable collision guards. Use a new attempt suffix after preserving the prior record, such as `story-1-22-dev-2`. Do not overwrite the earlier record.

### I only want to watch

Use the record's `watch_command`. Do not use `attach_command`, `codex resume`, or `agy --conversation`, because those modes accept input.

## Ownership and maintenance

The governor source bundle and this how-to are versioned together. Any change to role routing, launcher flags, session-record fields, sanctum initialization, or resume behavior must update this document in the same commit. Re-run the governor script tests and BMAD agent lint scans before release.
