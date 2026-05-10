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
