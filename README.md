# Vagrant

Vagrant is a local-first, open-source multi-agent engineering management platform.

Phase 1 includes:

- TypeScript pnpm monorepo
- Core issue-tree domain model
- Deterministic rule planner
- Mock autopilot dispatcher
- Mock runtime and provider adapters
- Notification dedupe logic
- Next.js local web UI
- Ant Design frontend components
- Project dashboard
- Root issue tree view

## Development

Install dependencies:

```bash
pnpm install
```

Run tests:

```bash
pnpm test
```

Run type checks:

```bash
pnpm typecheck
```

Run lint checks:

```bash
pnpm lint
```

Build all packages:

```bash
pnpm build
```

Run the web app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Phase 2 Runtime Foundation

Phase 2 adds the local execution foundation used by the future daemon:

- `LocalStore` persists projects, configured repositories, root issue trees, agent runs, evidence, and dispatch idempotency keys in `.vagrant/runtime/workspace-state.json`.
- Repository configuration is provider-neutral. A project repository can point to GitHub, GitLab, Gitea, Bitbucket, a private git server, or a local-only checkout.
- `WorkspaceManager` uses generic `git fetch` and `git worktree add` commands to isolate each root issue under a configurable worktree directory.
- `CodexCliRuntimeAdapter` and `ClaudeCliRuntimeAdapter` call local CLI binaries through an injectable process runner.

The Phase 2 CLI adapters are intentionally skeletal. They establish the command boundary and evidence capture contract; the daemon, streaming logs, approvals, email digests, provider sync, and wiki indexing are separate follow-up phases.
