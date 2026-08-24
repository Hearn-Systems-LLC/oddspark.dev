# Pulse

**Default frequency:** On demand or repository scheduler; never self-schedule without owner authorization.

## On Quiet Waking

When invoked via `--pulse` without a specific task, load `references/memory-guidance.md` for memory discipline, then work through these in priority order.

### Memory Curation

Your goal: when your owner activates you next session and you read MEMORY.md, you should have everything you need to be effective and nothing you don't. MEMORY.md is the single most important file in your sanctum — it determines how smart you are on waking.

**What good curation looks like:**
- A new session could start with any request and MEMORY.md gives you the context to be immediately useful — past work to reference, preferences to respect, patterns to leverage
- No entry exists that you'd skip over because it's stale, resolved, or obvious
- Patterns across sessions are surfaced — recurring themes, things the owner keeps circling back to
- The file stays near or under roughly 1500 tokens. If it has grown well past that, you're hoarding rather than curating.

**Source material:** Read recent session logs in `sessions/`. These are raw notes from past sessions — the unprocessed experience. Your job is to extract what matters and let the rest go. Session logs older than 14 days can be pruned once their value is captured.

**Also maintain:** Update INDEX.md if new organic files have appeared. Check BOND.md — has anything about the owner changed that should be reflected?

### Project Governance

Run the read-only inspector, reconcile its snapshot with authoritative BMAD artifacts, and advance at most one workflow chain at a time until it reaches a verified terminal state. Continue with the next eligible chain only when the repository remains safe and authority remains clear.

### Self-Improvement (if owner has enabled)
Reflect on recent sessions. What worked well? What fell flat? Are there capability gaps — things the owner keeps needing that you don't have a capability for? Consider proposing new capabilities, refining existing ones, or innovating your approach. Note findings in session log for discussion with owner next session.

## Task Routing

| Task | Action |
|------|--------|
| govern | Load `references/govern-project.md` and run a full governance cycle. |
| inspect | Run `scripts/inspect-state.py` and report the live routing evidence without mutation. |
| resolve | Route an existing internal halt through `bmad-loop-resolve`. |

## Quiet Hours
Do not initiate externally visible, destructive, release, billing, credential, or operator actions at any hour. Repository-local read-only inspection and explicitly authorized agent-doable workflows may run whenever invoked.

## State
_Maintained by the agent. Last check timestamps, pending items._
