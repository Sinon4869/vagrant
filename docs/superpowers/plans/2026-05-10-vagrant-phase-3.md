# Vagrant Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the web app's repository management surface to the local persisted workspace state so project repositories are configurable instead of static demo rows.

**Architecture:** Keep Node-only persistence inside server-only web modules that import `@vagrant/core/node`. Convert the repositories route into a server page that loads persisted state, then renders an Ant Design client component for table and form UI. Use a server action for adding repositories and revalidate the route after writing to `LocalStore`.

**Tech Stack:** Next.js App Router, React Server Components, Next server actions, Ant Design, TypeScript, `@vagrant/core/node`.

---

## Phase Boundary

This phase implements the first persisted web loop only:

1. Initialize `.vagrant/runtime/workspace-state.json` from `createPersistedDemoState` when missing.
2. Read repository rows for the `vagrant` project from `LocalStore`.
3. Add a repository through the `/repositories` page.
4. Re-render `/repositories` with the newly persisted repository.

This phase does not implement full project CRUD, requirement creation, wiki editing, real daemon scheduling, real CLI execution from the UI, provider sync, or email delivery.

## File Structure

Create these files:

- `apps/web/src/lib/workspace-store.ts`: server-only helpers for runtime directory, initialization, and repository view models.
- `apps/web/src/app/repositories/actions.ts`: server action that validates form values and writes a new repository to `LocalStore`.
- `apps/web/src/components/repositories-page-client.tsx`: Ant Design table and add repository form.

Modify these files:

- `apps/web/src/app/repositories/page.tsx`: convert from static client page to async server page.
- `README.md`: document `VAGRANT_RUNTIME_DIR` and the persisted repository page.

---

## Tasks

### Task 1: Add Server Workspace Store

**Files:**
- Create: `apps/web/src/lib/workspace-store.ts`

- [ ] Create a server-only module that:
  - imports `LocalStore` from `@vagrant/core/node`
  - imports `createPersistedDemoState` from `@vagrant/core`
  - initializes default project, repository, and root issue if missing
  - returns repository table rows with provider labels and linked requirement counts

- [ ] Verify with:

```bash
pnpm typecheck
```

Expected: PASS.

### Task 2: Add Persisted Repository Server Action

**Files:**
- Create: `apps/web/src/app/repositories/actions.ts`

- [ ] Create `addRepositoryAction(formData: FormData)` with `"use server"`.
- [ ] Validate `name`, `localPath`, `providerType`, and `defaultBaseBranch`.
- [ ] Use `createRepositoryConfig` and `LocalStore.upsertRepository`.
- [ ] Call `revalidatePath("/repositories")`.

- [ ] Verify with:

```bash
pnpm typecheck
```

Expected: PASS.

### Task 3: Replace Static Repository Page With Persisted UI

**Files:**
- Create: `apps/web/src/components/repositories-page-client.tsx`
- Modify: `apps/web/src/app/repositories/page.tsx`

- [ ] Move the Ant Design table into `RepositoriesPageClient`.
- [ ] Add an Ant Design form using `Input`, `Select`, and `Button`, posted to `addRepositoryAction`.
- [ ] Update the route page to load `getRepositoryWorkspaceView()` and pass rows/action to the client component.

- [ ] Verify with:

```bash
pnpm typecheck
pnpm build
```

Expected: PASS.

### Task 4: Document and Verify End-to-End

**Files:**
- Modify: `README.md`

- [ ] Add docs for `VAGRANT_RUNTIME_DIR`, default `.vagrant/runtime`, and the persisted repository page.
- [ ] Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all commands PASS.

---

## Self-Review

- Project/repository persistence: covered by server workspace store and repository server action.
- Repository not GitHub-only: covered by selectable provider types and `RepositoryProviderType`.
- UI linked to local state: covered by `/repositories` reading `LocalStore`.
- Scope deliberately excludes daemon, email, provider sync, wiki CRUD, and real runtime execution.
