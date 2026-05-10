# Vagrant Local Agent Platform Design

Date: 2026-05-10
Project: vagrant
Repository: https://github.com/Sinon4869/vagrant

## 1. Purpose

Vagrant is a local-first, open-source multi-agent engineering management platform. It turns the `agent-operating-manual-v2-2026-05-10.md` workflow into a runnable system for projects, requirement issue trees, agent roles, handoffs, evidence, wiki knowledge, external provider sync, and local Codex CLI / Claude CLI execution.

The product is not a general chat UI. Its primary experience is a project and requirement control plane where users can see exactly how each requirement is decomposed, which agents are working, what evidence exists, what is blocked, and what needs approval.

## 2. Product Direction

The MVP is a local Web App plus a local daemon.

Core decisions:

- Local database is the source of truth.
- External providers are mirrors, collaboration channels, and delivery channels.
- A requirement is represented as a root issue.
- A root issue can have unlimited nested subissues.
- The UI shows the requirement as a clear issue tree.
- Each root issue gets an isolated git worktree.
- Development agents write to the root issue worktree.
- Review and QA agents validate in read-only or temporary sandboxes.
- Runtime adapters initially support Codex CLI and Claude CLI.
- Provider adapters are provider-neutral; GitHub is the first complete provider implementation.
- Autopilot runs by default, but production release, destructive operations, database migration, external cost, and credential access require manual approval.
- No account or permission system is included in the MVP.

## 3. Reference Products

Vagrant should learn from these products without copying their surface styling:

- Linear: fast issue creation, parent/sub-issues, issue relations, compact project workflow.
- GitHub Issues and Projects: sub-issues, progress indicators, PR/issue/code linkage, board/table/roadmap views.
- Sentry: issue detail pages with summary, context, timeline, evidence, and ownership.
- Vercel: project dashboard, active branches, deployment/activity logs, and engineering status clarity.
- Paperclip: agent/company governance, approvals, budgets, audit, and external agent runtimes.
- Multica: issue-driven coding agents, local daemon, workspace isolation, skills, and provider-backed collaboration.
- Vibe Kanban: coding-agent kanban, workspace previews, and diff-oriented task execution. It is a reference, not a dependency.
- OpenHands: full AI software development runtime and sandbox ideas. It is a possible execution/runtime reference, not the main product shape.

## 4. Architecture

Vagrant has these main components:

- Web App: project dashboard, issue tree, agent runs, evidence, wiki, notifications, settings, provider sync status.
- Local Daemon: runs agents, manages worktrees, calls Codex CLI and Claude CLI, captures logs and artifacts, enforces run policy.
- Local Database: stores Project, Repository, Issue, AgentProfile, AgentRun, Evidence, KnowledgePage, KnowledgeIndex, Notification, Approval, and ProviderSyncRecord.
- Workspace Manager: manages local repository mirrors, root issue worktrees, and read-only validation sandboxes.
- Runtime Adapters: provider-independent interface for Codex CLI and Claude CLI.
- Provider Adapters: provider-independent interface for Git, issue, review, and optional wiki capabilities.
- Autopilot Dispatcher: observes local events, determines ready actions, starts agent runs, records evidence, and advances issue tree state.
- Notification Engine: converts important events into page attention items, email alerts, and digest emails.
- Knowledge Engine: stores Markdown wiki content and builds structured indexes for retrieval.

## 5. Core Domain Model

### Workspace

A local Vagrant instance. It contains projects and shared local settings.

### Project

A product or code project. It owns repositories, root issues, agent profiles, wiki, provider configuration, and notification rules.

### Repository

A local and remote git repository mapping. A project can have multiple repositories.

Fields include:

- local path
- remote URL
- provider type
- default base branch
- credential profile
- branch naming policy

### Issue

The unified task model. It represents requirements, tasks, sub-tasks, gates, review work, QA work, release work, and documentation work.

Every issue can have:

- `parentIssueId`
- multiple subissues
- issue type
- status
- owner agent
- dependencies
- blockers
- acceptance criteria
- evidence requirements
- provider sync mapping

### Root Issue

A root issue is a user requirement and the root of an issue tree. It replaces the earlier two-level Epic/child issue model. It is the control plane for the whole requirement.

### IssueRelation

Relationships beyond the tree:

- `blocks`
- `depends_on`
- `duplicates`
- `supersedes`

### IssueTreeStatus

Aggregated status for a root issue and all descendants. It powers the page-level progress display.

Rules:

- A root issue can be `done` only when all required descendants are `done` or `cancelled` and gates are complete.
- If a critical descendant is blocked, the root issue is blocked or at risk.
- If descendants are executing, the root issue is in progress.
- If development is complete but gates are pending, the root issue is in review or gate pending.
- Cancelled nodes must remain visible with a reason.

### AgentProfile

The role definition for an agent. MVP profiles include:

- CEO
- CTO
- Product Manager
- UX/UI
- Engineering Lead
- Frontend Developer
- Backend Developer
- Database
- DevOps
- Code Review
- QA
- Documentation
- Release Manager

Not every profile runs for every requirement.

### AgentRun

A single execution of one agent on one issue.

It records:

- agent profile
- runtime adapter
- working directory
- prompt/input context
- logs
- structured output
- status
- artifacts
- evidence
- retry group

### Evidence

Verifiable delivery proof:

- branch
- commit
- PR/MR
- diff
- test/build/lint log
- screenshot
- running URL
- review conclusion
- QA report
- release conclusion
- documentation path

### HandoffAction

A structured next action. Agent text does not directly wake another agent. It becomes a HandoffAction and the dispatcher decides whether it is ready.

Fields:

- source issue
- target issue
- owner agent
- trigger condition
- required evidence
- blocked-by condition
- expected status
- idempotency key

### KnowledgePage and KnowledgeIndex

Markdown wiki pages plus structured metadata, tags, decisions, commands, failure patterns, related issues, related files, and evidence references.

### ProviderSyncRecord

Mapping between a local entity and an external issue, PR/MR, comment, wiki page, or provider object.

## 6. Status Model

Issue statuses:

- `todo`: created and waiting.
- `in_progress`: an agent is executing or has been explicitly started.
- `blocked`: blocked with owner, reason, and unblock condition.
- `in_review`: output exists and a gate decision is pending.
- `done`: acceptance criteria are met and evidence exists.
- `cancelled`: cancelled, duplicated, or superseded with a clear reason.

Gate conclusions:

- `pass`
- `conditional_pass`
- `request_changes`
- `blocked`
- `fail`

## 7. Issue Tree Planning

The planner has two layers.

### Rule Planner

Rule Planner creates the first issue tree using deterministic templates.

Examples:

- Text or button change: Developer -> Code Review.
- Frontend feature: Product Manager -> optional UX/UI -> Frontend -> Code Review -> QA -> Documentation.
- Full-stack feature: Product Manager -> CTO -> Frontend / Backend / Database -> Code Review -> QA -> Documentation.
- Infrastructure or release work: CTO -> DevOps -> Code Review -> QA or Release -> Documentation.
- High-risk work: add security, database, or release gates.

### LLM Planner

CEO and CTO agents inspect the requirement, repository context, wiki context, and default tree. They can:

- add subissues
- remove subissues
- adjust owner agents
- add dependencies
- mark risk
- explain omitted roles

All changes must be explicit and auditable.

## 8. Autopilot Dispatcher

The dispatcher listens to local events:

- issue created
- issue status changed
- subissue completed
- agent run completed
- evidence added
- blocker added or resolved
- approval granted or denied
- provider sync completed

Dispatcher loop:

1. Load the root issue and issue tree.
2. Aggregate descendant status.
3. Find ready subissues.
4. Check dependencies, blockers, evidence requirements, idempotency, and approval rules.
5. Create AgentRun records.
6. Invoke the runtime adapter.
7. Capture logs, artifacts, diff, test output, and structured result.
8. Create Evidence.
9. Update issue and root issue status.
10. Sync provider objects.
11. Generate new HandoffActions.

Idempotency key:

```text
rootIssueId + issueId + agentProfileId + triggerEventId + actionType
```

This prevents duplicate wakeups and notification loops.

## 9. Worktree and Runtime Isolation

Each project repository has a local mirror. Each root issue gets a dedicated worktree and branch.

Example layout:

```text
~/.vagrant/workspaces/<project-id>/repos/<repo-id>/main
~/.vagrant/workspaces/<project-id>/issues/<root-issue-id>/<repo-id>
```

Branch format:

```text
vagrant/issue-123-short-title
```

Rules:

- Development agents write only inside the root issue worktree.
- Different root issues can run in parallel without sharing working directories.
- Subissues inside the same root issue are serial by default.
- Review, QA, and Release validation run in read-only or temporary validation sandboxes.
- A validation agent must not write changes back. If it finds a problem, it creates a fix subissue.

## 10. Runtime Adapters

MVP runtime adapters:

- `CodexRuntimeAdapter`
- `ClaudeRuntimeAdapter`

Common interface:

```ts
startRun(input): AgentRunHandle
streamLogs(runId): AsyncIterable<LogEvent>
requestCancel(runId): void
collectArtifacts(runId): Evidence[]
getExitStatus(runId): RunStatus
```

AgentRun input includes:

- agent instructions
- root issue context
- current issue context
- relevant parent and child issue status
- acceptance criteria
- wiki summaries
- repository path
- allowed actions
- forbidden actions
- required evidence format

Structured output includes:

- summary
- changed files
- commands run
- tests/build result
- evidence references
- next actions
- blockers
- risk flags
- proposed status

## 11. Policy Guard and Approval

Autopilot can run without manual approval for normal engineering work, including code changes, commits, branch pushes, PR/MR creation, external issue updates, wiki updates, review, and QA.

Manual approval is required for:

- production release
- destructive delete or overwrite operations
- database migration
- external cost
- credential access

Approval records include:

- requested action
- requesting agent run
- reason
- risk summary
- expected command or provider operation
- affected files, services, or data
- status
- approver note
- expiry time

Without an approval token, the daemon must block the action.

Security controls:

- every run has an explicit working directory
- git diff is inspected for evidence and scope
- provider writes are recorded as sync records and evidence
- high-risk commands are detected and blocked
- credential access uses credential profiles
- secrets are redacted from logs
- agent output cannot directly trigger another run

## 12. Provider Adapters

Provider integration is capability-based:

- GitProvider: clone, fetch, push branch, read commits and diff.
- IssueProvider: create/update issues, comments, labels, statuses, and subissue mappings when supported.
- ReviewProvider: create/update PR or MR, read reviews, write review comments.
- WikiProvider: optional external wiki/document sync.
- NotificationProvider: optional external notification channel.

GitHub is the first complete provider implementation. The core model must remain provider-neutral.

Project provider configuration:

- provider type
- remote URL
- default branch
- issue sync mode
- PR/MR sync mode
- credential profile
- branch naming policy
- label/status mapping
- webhook or polling mode

MVP can use polling first; webhooks can be added later.

Sync rules:

- root issue maps to an external parent issue or issue equivalent.
- subissues map to external child issues/tasks when supported.
- providers without subissues use labels, title prefixes, body links, and parent comments.
- Evidence maps to comments or PR/MR artifacts.
- Review, QA, and Docs conclusions map to comments.
- PR/MR maps to the root issue or implementation subissue.

Conflict rules:

- local fields are authoritative for workflow state, owner, handoff, evidence, and wiki index.
- external comments, PR reviews, CI status, and external status can be imported.
- external edits to title, body, or status create provider conflict events and page alerts.
- external state cannot directly close local issues without local gates.

## 13. Wiki and Knowledge

Each project has Markdown wiki content and structured indexes.

Suggested layout:

```text
.vagrant/wiki/
  decisions/
  runbooks/
  architecture/
  requirements/
  failures/
  releases/
```

Automatic knowledge capture:

- root issue completion creates delivery notes
- blockers create failure/solution notes
- Review and QA findings create failure patterns
- CTO technical plans create architecture decisions
- release work creates release and rollback notes
- repeated commands and environment issues create runbooks

Agent knowledge retrieval:

- project
- repository
- issue title and description
- touched files or modules
- agent role
- issue type
- recent failures
- explicit tags

Agents receive concise summaries with cited wiki paths, not the whole wiki.

MVP search:

- Markdown frontmatter for tags and links
- database metadata
- SQLite FTS or Postgres text search
- vector search is optional and not required for MVP

## 14. Notifications and Email

Notifications are first-class but must not create email storms.

UI areas:

- Activity Timeline
- Current Attention
- Digest Preview
- Notification Settings
- email send history
- dedupe and throttle records

Default immediate emails:

- approval required
- blocked and requires user input
- failed after retry
- root issue completed

Digest emails:

- hourly digest
- daily digest

Default non-email events:

- individual agent run start/end
- ordinary issue status changes
- normal comments
- provider sync noise
- internal handoff events

Storm prevention:

- coalesce ordinary events per root issue
- send one email per blocker unless state changes or reminder interval expires
- group repeated failures by run group
- project-level minimum send interval, such as 15 minutes
- dedupe key:

```text
projectId + rootIssueId + notificationType + blockerId/approvalId
```

Email content:

- project name
- root issue title
- current state
- required user action
- blocker or risk
- completed issue count
- next autopilot action
- Vagrant page link
- external PR/issue links

## 15. UI Design

The interface is an engineering workbench. It should be compact, clear, and state-oriented.

Main navigation:

- Projects
- Issues
- Agents
- Runs
- Wiki
- Providers
- Notifications
- Settings

Project Dashboard shows:

- active root issues
- blocked, approval required, in progress, completed counts
- recent agent activity
- current attention items
- recent PR/MR links
- wiki updates
- provider sync health

Root Issue page is the core page:

- header with title, status, progress, owner, external links, and actions
- issue tree
- selected issue detail panel
- activity timeline
- evidence tab
- approvals tab
- provider sync tab

Issue tree nodes show:

- title
- status
- owner agent
- blocked marker
- approval marker
- evidence count
- latest run state
- provider sync marker

Root issue aggregated display:

- total node count
- done, in progress, blocked, in review, cancelled counts
- critical path
- next autopilot action
- close-gate status

Other pages:

- Agents: profiles, runtime preference, instructions, concurrency, task types, success rate, failure reasons.
- Runs: run status, issue, agent, runtime, working directory, logs, diff, evidence, retry/cancel.
- Wiki: file tree, Markdown editing, search, tags, related issues.
- Notifications: current attention, email history, digest preview, notification rules.
- Providers: provider accounts, repository mappings, sync status, conflicts.

Design style:

- high information density
- restrained status colors
- clear tree/table/timeline components
- no marketing hero screens
- no decorative gradients
- status and evidence should be visible without hunting

## 16. Error Handling

Error types:

- `runtime_failed`
- `runtime_timeout`
- `parse_failed`
- `git_conflict`
- `test_failed`
- `provider_sync_failed`
- `missing_evidence`
- `blocked_by_user`
- `policy_violation`
- `knowledge_conflict`

Each failure must:

- attach to the affected issue
- link the AgentRun logs
- record evidence when available
- set owner
- describe retry conditions
- either trigger automatic recovery or enter Current Attention

Retry rules:

- transient runtime/provider failures can retry a limited number of times
- test failures can create fix subissues
- repeated failures become blocked
- policy violations never auto-retry

## 17. MVP Scope

MVP includes:

- local Web App
- local daemon
- local database
- project and repository configuration
- issue tree
- agent profiles
- agent runs
- evidence records
- autopilot dispatcher
- Codex CLI adapter
- Claude CLI adapter
- git worktree manager
- GitHub provider adapter as first complete provider
- provider-neutral adapter interfaces
- Markdown wiki and index
- email digest and alert notifications
- root issue tree/detail UI
- runs/logs UI
- notifications UI
- settings UI

MVP excludes:

- multi-tenant accounts and permissions
- cloud execution
- plugin marketplace
- full organization chart and budget system
- required vector knowledge database
- complete implementations for all providers
- subissue-level parallel patch merge
- container or Firecracker sandboxing
- deep mobile adaptation
- complex BI/reporting

## 18. End-to-End MVP Scenario

The MVP is accepted when this path works:

1. User creates a Project and configures a repository.
2. User creates a root issue requirement.
3. CEO/CTO planning creates an issue tree.
4. Dispatcher starts ready subissues.
5. Daemon runs Codex CLI or Claude CLI.
6. Development agent modifies the root issue worktree.
7. Daemon captures diff, logs, commands, test output, and evidence.
8. Provider adapter creates or updates external issue and PR/MR.
9. Code Review and QA run in validation sandboxes.
10. Evidence is attached to the issue tree.
11. Documentation updates the Markdown wiki.
12. Notification Engine sends only required alerts or digest emails.
13. Root Issue page clearly shows tree, status, blockers, evidence, and next action.
14. Gates complete and the root issue reaches final review or done.

## 19. Test Strategy

Unit tests:

- issue tree status aggregation
- rule planner matching
- handoff readiness
- dispatcher idempotency
- provider mapping
- notification dedupe
- policy guard
- evidence validation

Integration tests:

- git worktree create/commit/push with mocks where needed
- runtime adapter mock run
- provider adapter mock
- wiki indexing
- email digest generation
- failure retry and blocker flow

End-to-end tests:

- create project -> create root issue -> plan issue tree -> mock agent edits file -> review/qa -> evidence -> wiki -> notification -> done
- failure path: test failed
- failure path: provider sync failed
- failure path: missing evidence
- approval path: approval required and approved

## 20. Implementation Plan Inputs

These are engineering choices for the implementation plan. The product requirements above are already settled:

- Choose SQLite or Postgres for local persistence.
- Choose web framework and daemon language.
- Decide whether Web App and daemon live in one monorepo package layout or separate apps.
- Decide initial email provider for local-first usage.
- Decide how to invoke Codex CLI and Claude CLI reliably on macOS/Linux.
