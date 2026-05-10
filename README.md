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

Open `http://localhost:3100`.

Run the web app with the shared local test runtime:

```bash
pnpm dev:test
```

`pnpm dev:test` uses `VAGRANT_RUNTIME_DIR=.vagrant/runtime` and the same fixed URL: `http://localhost:3100`.

## Local PostgreSQL

The backend data store is PostgreSQL. Local development uses a fixed Docker container:

```bash
pnpm pg:up
```

Connection string:

```bash
DATABASE_URL=postgres://vagrant:vagrant@localhost:5432/vagrant
```

The Compose service uses:

- container: `vagrant-postgres`
- image: `postgres:16`
- host port: `5432`
- database: `vagrant`
- user: `vagrant`
- password: `vagrant`
- volume: `vagrant-postgres-data`

The repository also includes `docker-compose.yml` for environments with Docker Compose. The package scripts use plain `docker run` so they work on Docker installations without the Compose plugin.

Stop the database:

```bash
pnpm pg:down
```

Follow logs:

```bash
pnpm pg:logs
```

## Phase 2 Runtime Foundation

Phase 2 adds the local execution foundation used by the future daemon:

- `LocalStore` persists projects, configured repositories, root issue trees, agent runs, evidence, and dispatch idempotency keys in `.vagrant/runtime/workspace-state.json`.
- Repository configuration is provider-neutral. A project repository can point to GitHub, GitLab, Gitea, Bitbucket, a private git server, or a local-only checkout.
- `WorkspaceManager` uses generic `git fetch` and `git worktree add` commands to isolate each root issue under a configurable worktree directory.
- `CodexCliRuntimeAdapter` and `ClaudeCliRuntimeAdapter` call local CLI binaries through an injectable process runner.

The Phase 2 CLI adapters are intentionally skeletal. They establish the command boundary and evidence capture contract; the daemon, streaming logs, approvals, email digests, provider sync, and wiki indexing are separate follow-up phases.

## Phase 3 Persisted Repository Page

The `/repositories` page now reads and writes the local workspace store instead of rendering only static demo rows.

Runtime data defaults to:

```text
apps/web/.vagrant/runtime/workspace-state.json
```

Set `VAGRANT_RUNTIME_DIR` before running the web app to store state somewhere else:

```bash
VAGRANT_RUNTIME_DIR=/Users/asuka/Documents/vagrant/.vagrant/runtime pnpm dev
```

When the store is empty, the web app seeds the `vagrant` project, its default repository, and the demo root issue. Adding a repository from the page posts to `/repositories/create`, writes a new `RepositoryConfig` record through `LocalStore`, and redirects back to `/repositories`.
