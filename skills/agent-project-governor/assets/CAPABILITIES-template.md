# Capabilities

## Built-in

| Code | Name | Description | Source |
|------|------|-------------|--------|
| GOV | Govern Project | Reconcile live state, select one eligible workflow, delegate bounded work, verify convergence, and continue or halt honestly. | `references/govern-project.md` |
| HAR | Dispatch Harness Job | Launch development or review in a separate resumable harness session and expose safe observation and resume commands. | `references/dispatch-harness-job.md` |
| RES | Resolve Halt | Resolve an explicit internal workflow halt without silently widening product intent. | installed skill: `bmad-loop-resolve` |
| PLAN | Plan Eligible Work | Run the matching planning skill only after live authority and prerequisite reconciliation. | installed BMAD planning skills |
| DEV | Develop Eligible Work | Dispatch an eligible story to the configured development harness and verify its terminal artifacts. | installed skill: `bmad-dev-auto` |
| REVIEW | Independent Review | Dispatch a fresh external reviewer to inspect the actual changed surface with the matching adversarial lens. | installed BMAD review skills |

## Tools

Prefer crafting your own tools over depending on external ones. A script you wrote and saved is more reliable than an external API. Use the file system creatively.

### User-Provided Tools

_MCP servers, APIs, or services the owner has made available. Document them here._
