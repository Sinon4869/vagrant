# Vagrant Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable local execution foundation: project/repository persistence, generic git worktree management, Codex/Claude CLI runtime adapters, and a dispatcher path that records real run metadata without requiring GitHub or email.

**Architecture:** Keep Phase 2 inside `packages/core` so the behavior is testable without a daemon process or browser. Use a small file-backed JSON store under `.vagrant/runtime` as the persistence boundary for this phase, with interfaces that can later be backed by SQLite. Add generic git command wrappers and CLI runtime adapters behind dependency-injected process runners so tests never spawn real Codex, Claude, or git unless an integration test explicitly opts in.

**Tech Stack:** TypeScript, Node.js `fs/promises`, Node.js `child_process`, Vitest, existing pnpm workspace.

---

## Phase Boundary

This plan implements Phase 2 only:

1. Durable local project state in a JSON store.
2. Provider-neutral repository configuration.
3. Generic git clone/fetch/worktree helpers.
4. Codex CLI and Claude CLI runtime adapter skeletons.
5. Dispatcher integration that writes agent run and evidence records to the store.
6. Seed updates so the web app can read the persisted demo state in a later phase.

This phase does not implement SQLite migration, real daemon scheduling, GitHub/GitLab/Gitea provider sync, email notifications, wiki indexing, authenticated settings UI, or actual long-running process streaming in the web app.

## File Structure

Create these files:

- `packages/core/src/local-store.ts`: file-backed JSON persistence store and helper repository methods.
- `packages/core/src/local-store.test-helpers.ts`: temp runtime directory helper for tests.
- `packages/core/src/process-runner.ts`: process execution interface, node implementation, and test fake.
- `packages/core/src/workspace-manager.ts`: generic git repository and root issue worktree manager.
- `packages/core/src/runtime-adapters.ts`: Codex CLI and Claude CLI runtime adapters using `ProcessRunner`.
- `packages/core/src/persistent-dispatcher.ts`: dispatcher wrapper that loads root issue state, resolves worktree paths, starts runtime adapters, persists run records, and saves updated issues.
- `packages/core/src/__tests__/local-store.test.ts`: persistence behavior tests.
- `packages/core/src/__tests__/workspace-manager.test.ts`: git command planning tests with fake process runner.
- `packages/core/src/__tests__/runtime-adapters.test.ts`: Codex/Claude CLI command and evidence tests.
- `packages/core/src/__tests__/persistent-dispatcher.test.ts`: persisted dispatch tests.

Modify these files:

- `packages/core/src/domain.ts`: add `Project`, `RepositoryConfig`, `AgentRun`, runtime, and workspace state types.
- `packages/core/src/adapters.ts`: keep existing interfaces; no breaking changes.
- `packages/core/src/index.ts`: export new modules.
- `packages/core/src/seed.ts`: add persisted demo snapshot builder.
- `README.md`: document Phase 2 local runtime directory, configured repository support, and CLI adapter status.

---

### Task 1: Add Durable Domain Contracts

**Files:**
- Modify: `packages/core/src/domain.ts`
- Create: `packages/core/src/__tests__/domain-persistence.test.ts`

- [ ] **Step 1: Write the failing domain test**

Create `packages/core/src/__tests__/domain-persistence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AgentRole,
  createAgentRun,
  createProject,
  createRepositoryConfig,
  RuntimeKind
} from "../domain.js";

describe("durable domain contracts", () => {
  it("creates a project with provider-neutral repository configuration", () => {
    const project = createProject({
      id: "project-vagrant",
      name: "vagrant",
      now: "2026-05-10T00:00:00.000Z"
    });

    const repository = createRepositoryConfig({
      id: "repo-vagrant",
      projectId: project.id,
      name: "vagrant",
      localPath: "/Users/asuka/Documents/vagrant",
      remoteUrl: "https://git.example.local/team/vagrant.git",
      providerType: "generic_git",
      defaultBaseBranch: "main",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(project.name).toBe("vagrant");
    expect(repository.remoteUrl).toBe("https://git.example.local/team/vagrant.git");
    expect(repository.providerType).toBe("generic_git");
    expect(repository.defaultBaseBranch).toBe("main");
  });

  it("creates an agent run record for a local CLI runtime", () => {
    const run = createAgentRun({
      id: "run-1",
      projectId: "project-vagrant",
      issueId: "issue-1",
      agentRole: AgentRole.FrontendDeveloper,
      runtimeKind: RuntimeKind.CodexCli,
      workingDirectory: "/tmp/vagrant/worktrees/issue-1",
      prompt: "Implement the issue and report evidence.",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(run.status).toBe("queued");
    expect(run.runtimeKind).toBe(RuntimeKind.CodexCli);
    expect(run.logs).toEqual([]);
    expect(run.evidenceIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test -- domain-persistence.test.ts
```

Expected: FAIL because `createProject`, `createRepositoryConfig`, `createAgentRun`, and `RuntimeKind` are not exported from `domain.ts`.

- [ ] **Step 3: Add the domain types and factories**

Append these definitions to `packages/core/src/domain.ts` after `createIssue`:

```ts
export type RepositoryProviderType =
  | "generic_git"
  | "github"
  | "gitlab"
  | "gitea"
  | "bitbucket"
  | "local_only";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  id: string;
  name: string;
  description?: string;
  now?: string;
}

export function createProject(input: CreateProjectInput): Project {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    name: input.name,
    description: input.description ?? "",
    createdAt: now,
    updatedAt: now
  };
}

export interface RepositoryConfig {
  id: string;
  projectId: string;
  name: string;
  localPath: string;
  remoteUrl: string | null;
  providerType: RepositoryProviderType;
  defaultBaseBranch: string;
  credentialProfile: string | null;
  branchNamePrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryConfigInput {
  id: string;
  projectId: string;
  name: string;
  localPath: string;
  remoteUrl?: string | null;
  providerType?: RepositoryProviderType;
  defaultBaseBranch?: string;
  credentialProfile?: string | null;
  branchNamePrefix?: string;
  now?: string;
}

export function createRepositoryConfig(input: CreateRepositoryConfigInput): RepositoryConfig {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    name: input.name,
    localPath: input.localPath,
    remoteUrl: input.remoteUrl ?? null,
    providerType: input.providerType ?? "generic_git",
    defaultBaseBranch: input.defaultBaseBranch ?? "main",
    credentialProfile: input.credentialProfile ?? null,
    branchNamePrefix: input.branchNamePrefix ?? "vagrant",
    createdAt: now,
    updatedAt: now
  };
}

export enum RuntimeKind {
  Mock = "mock",
  CodexCli = "codex_cli",
  ClaudeCli = "claude_cli"
}

export type AgentRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface AgentRunLogEntry {
  stream: "stdout" | "stderr" | "system";
  body: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  projectId: string;
  issueId: string;
  agentRole: AgentRole;
  runtimeKind: RuntimeKind;
  status: AgentRunStatus;
  workingDirectory: string;
  prompt: string;
  summary: string;
  logs: AgentRunLogEntry[];
  evidenceIds: string[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRunInput {
  id: string;
  projectId: string;
  issueId: string;
  agentRole: AgentRole;
  runtimeKind: RuntimeKind;
  workingDirectory: string;
  prompt: string;
  now?: string;
}

export function createAgentRun(input: CreateAgentRunInput): AgentRun {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    issueId: input.issueId,
    agentRole: input.agentRole,
    runtimeKind: input.runtimeKind,
    status: "queued",
    workingDirectory: input.workingDirectory,
    prompt: input.prompt,
    summary: "",
    logs: [],
    evidenceIds: [],
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now
  };
}
```

- [ ] **Step 4: Run the domain test**

Run:

```bash
pnpm --filter @vagrant/core test -- domain-persistence.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain.ts packages/core/src/__tests__/domain-persistence.test.ts
git commit -m "feat: add durable project and run domain contracts"
```

---

### Task 2: Add File-Backed Local Store

**Files:**
- Create: `packages/core/src/local-store.ts`
- Create: `packages/core/src/local-store.test-helpers.ts`
- Create: `packages/core/src/__tests__/local-store.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing local store test**

Create `packages/core/src/local-store.test-helpers.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function withTempRuntimeDir<T>(run: (runtimeDir: string) => Promise<T>): Promise<T> {
  const runtimeDir = await mkdtemp(join(tmpdir(), "vagrant-runtime-"));

  try {
    return await run(runtimeDir);
  } finally {
    await rm(runtimeDir, { recursive: true, force: true });
  }
}
```

Create `packages/core/src/__tests__/local-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AgentRole,
  IssueType,
  RuntimeKind,
  createAgentRun,
  createIssue,
  createProject,
  createRepositoryConfig
} from "../domain.js";
import { LocalStore } from "../local-store.js";
import { withTempRuntimeDir } from "../local-store.test-helpers.js";

const now = "2026-05-10T00:00:00.000Z";

describe("LocalStore", () => {
  it("persists projects, repositories, root issues, agent runs, evidence, and dispatch keys", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();

      const project = createProject({ id: "project-vagrant", name: "vagrant", now });
      const repository = createRepositoryConfig({
        id: "repo-vagrant",
        projectId: project.id,
        name: "vagrant",
        localPath: "/repo/vagrant",
        remoteUrl: "ssh://git.example/vagrant.git",
        now
      });
      const rootIssue = createIssue({
        id: "issue-root",
        projectId: project.id,
        title: "Build feature",
        type: IssueType.Requirement,
        now
      });
      const run = createAgentRun({
        id: "run-1",
        projectId: project.id,
        issueId: rootIssue.id,
        agentRole: AgentRole.BackendDeveloper,
        runtimeKind: RuntimeKind.CodexCli,
        workingDirectory: "/repo/vagrant/.worktrees/issue-root",
        prompt: "Implement backend changes.",
        now
      });

      await store.upsertProject(project);
      await store.upsertRepository(repository);
      await store.upsertRootIssue(rootIssue);
      await store.upsertAgentRun(run);
      await store.addDispatchKey("issue-root:issue-root:backend_developer:event-1:run");

      const reloaded = new LocalStore({ runtimeDir });
      await reloaded.initialize();

      expect(await reloaded.getProject(project.id)).toEqual(project);
      expect(await reloaded.listRepositories(project.id)).toEqual([repository]);
      expect(await reloaded.getRootIssue(rootIssue.id)).toEqual(rootIssue);
      expect(await reloaded.listAgentRuns(rootIssue.id)).toEqual([run]);
      expect(await reloaded.hasDispatchKey("issue-root:issue-root:backend_developer:event-1:run")).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test -- local-store.test.ts
```

Expected: FAIL because `LocalStore` does not exist.

- [ ] **Step 3: Implement the local store**

Create `packages/core/src/local-store.ts`:

```ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  type AgentRun,
  type Evidence,
  type Issue,
  type Project,
  type RepositoryConfig
} from "./domain.js";

export interface LocalStoreOptions {
  runtimeDir: string;
}

export interface LocalWorkspaceState {
  schemaVersion: 1;
  projects: Project[];
  repositories: RepositoryConfig[];
  rootIssues: Issue[];
  agentRuns: AgentRun[];
  evidence: Evidence[];
  dispatchKeys: string[];
}

const emptyState: LocalWorkspaceState = {
  schemaVersion: 1,
  projects: [],
  repositories: [],
  rootIssues: [],
  agentRuns: [],
  evidence: [],
  dispatchKeys: []
};

export class LocalStore {
  private readonly statePath: string;

  constructor(private readonly options: LocalStoreOptions) {
    this.statePath = join(options.runtimeDir, "workspace-state.json");
  }

  async initialize(): Promise<void> {
    await mkdir(dirname(this.statePath), { recursive: true });

    try {
      await this.readState();
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        await this.writeState(emptyState);
        return;
      }

      throw error;
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    const state = await this.readState();
    return state.projects.find((project) => project.id === projectId) ?? null;
  }

  async upsertProject(project: Project): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      projects: upsertById(state.projects, project)
    }));
  }

  async listRepositories(projectId: string): Promise<RepositoryConfig[]> {
    const state = await this.readState();
    return state.repositories.filter((repository) => repository.projectId === projectId);
  }

  async upsertRepository(repository: RepositoryConfig): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      repositories: upsertById(state.repositories, repository)
    }));
  }

  async getRootIssue(rootIssueId: string): Promise<Issue | null> {
    const state = await this.readState();
    return state.rootIssues.find((issue) => issue.id === rootIssueId) ?? null;
  }

  async upsertRootIssue(rootIssue: Issue): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      rootIssues: upsertById(state.rootIssues, rootIssue)
    }));
  }

  async listAgentRuns(rootIssueId: string): Promise<AgentRun[]> {
    const state = await this.readState();
    const issueIds = new Set(flattenIssueIds(state.rootIssues.find((issue) => issue.id === rootIssueId)));
    return state.agentRuns.filter((run) => issueIds.has(run.issueId));
  }

  async upsertAgentRun(run: AgentRun): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      agentRuns: upsertById(state.agentRuns, run)
    }));
  }

  async appendEvidence(evidence: Evidence[]): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      evidence: evidence.reduce((items, item) => upsertById(items, item), state.evidence)
    }));
  }

  async hasDispatchKey(dispatchKey: string): Promise<boolean> {
    const state = await this.readState();
    return state.dispatchKeys.includes(dispatchKey);
  }

  async listDispatchKeys(): Promise<Set<string>> {
    const state = await this.readState();
    return new Set(state.dispatchKeys);
  }

  async addDispatchKey(dispatchKey: string): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      dispatchKeys: state.dispatchKeys.includes(dispatchKey)
        ? state.dispatchKeys
        : [...state.dispatchKeys, dispatchKey]
    }));
  }

  private async updateState(update: (state: LocalWorkspaceState) => LocalWorkspaceState): Promise<void> {
    const state = await this.readState();
    await this.writeState(update(state));
  }

  private async readState(): Promise<LocalWorkspaceState> {
    const body = await readFile(this.statePath, "utf8");
    return JSON.parse(body) as LocalWorkspaceState;
  }

  private async writeState(state: LocalWorkspaceState): Promise<void> {
    const temporaryPath = `${this.statePath}.tmp`;
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.statePath);
  }
}

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);

  if (index === -1) {
    return [...items, next];
  }

  return items.map((item) => (item.id === next.id ? next : item));
}

function flattenIssueIds(issue: Issue | undefined): string[] {
  if (!issue) {
    return [];
  }

  return [issue.id, ...issue.children.flatMap((child) => flattenIssueIds(child))];
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./domain.js";
export * from "./issue-tree.js";
export * from "./rule-planner.js";
export * from "./adapters.js";
export * from "./dispatcher.js";
export * from "./notifications.js";
export * from "./seed.js";
export * from "./local-store.js";
```

- [ ] **Step 4: Run local store tests**

Run:

```bash
pnpm --filter @vagrant/core test -- local-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/local-store.ts packages/core/src/local-store.test-helpers.ts packages/core/src/__tests__/local-store.test.ts packages/core/src/index.ts
git commit -m "feat: add file backed local store"
```

---

### Task 3: Add Generic Git Workspace Manager

**Files:**
- Create: `packages/core/src/process-runner.ts`
- Create: `packages/core/src/workspace-manager.ts`
- Create: `packages/core/src/__tests__/workspace-manager.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing workspace manager test**

Create `packages/core/src/__tests__/workspace-manager.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRepositoryConfig } from "../domain.js";
import { FakeProcessRunner } from "../process-runner.js";
import { WorkspaceManager } from "../workspace-manager.js";

const now = "2026-05-10T00:00:00.000Z";

describe("WorkspaceManager", () => {
  it("creates a root issue worktree using provider-neutral git commands", async () => {
    const runner = new FakeProcessRunner();
    const manager = new WorkspaceManager({
      runner,
      worktreesDir: "/repo/vagrant/.worktrees"
    });
    const repository = createRepositoryConfig({
      id: "repo-vagrant",
      projectId: "project-vagrant",
      name: "vagrant",
      localPath: "/repo/vagrant",
      remoteUrl: "ssh://git.example/vagrant.git",
      defaultBaseBranch: "main",
      branchNamePrefix: "vagrant",
      now
    });

    const result = await manager.ensureRootIssueWorktree({
      repository,
      rootIssueId: "issue-build-wiki"
    });

    expect(result.branchName).toBe("vagrant/issue-build-wiki");
    expect(result.workingDirectory).toBe("/repo/vagrant/.worktrees/issue-build-wiki");
    expect(runner.calls).toEqual([
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "fetch", "--all", "--prune"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: [
          "-C",
          "/repo/vagrant",
          "worktree",
          "add",
          "-B",
          "vagrant/issue-build-wiki",
          "/repo/vagrant/.worktrees/issue-build-wiki",
          "main"
        ],
        cwd: "/repo/vagrant"
      }
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test -- workspace-manager.test.ts
```

Expected: FAIL because `ProcessRunner`, `FakeProcessRunner`, and `WorkspaceManager` do not exist.

- [ ] **Step 3: Implement the process runner**

Create `packages/core/src/process-runner.ts`:

```ts
import { spawn } from "node:child_process";

export interface ProcessRunInput {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
}

export interface ProcessRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ProcessRunner {
  run(input: ProcessRunInput): Promise<ProcessRunResult>;
}

export class NodeProcessRunner implements ProcessRunner {
  async run(input: ProcessRunInput): Promise<ProcessRunResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(input.command, input.args, {
        cwd: input.cwd,
        env: { ...process.env, ...input.env },
        stdio: ["pipe", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (exitCode) => {
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr
        });
      });

      if (input.input) {
        child.stdin.write(input.input);
      }

      child.stdin.end();
    });
  }
}

export class FakeProcessRunner implements ProcessRunner {
  readonly calls: ProcessRunInput[] = [];

  constructor(private readonly result: ProcessRunResult = { exitCode: 0, stdout: "", stderr: "" }) {}

  async run(input: ProcessRunInput): Promise<ProcessRunResult> {
    this.calls.push(input);
    return this.result;
  }
}
```

- [ ] **Step 4: Implement the workspace manager**

Create `packages/core/src/workspace-manager.ts`:

```ts
import { join } from "node:path";
import { type RepositoryConfig } from "./domain.js";
import { type ProcessRunner } from "./process-runner.js";

export interface WorkspaceManagerOptions {
  runner: ProcessRunner;
  worktreesDir: string;
}

export interface EnsureRootIssueWorktreeInput {
  repository: RepositoryConfig;
  rootIssueId: string;
}

export interface RootIssueWorktree {
  repositoryId: string;
  rootIssueId: string;
  branchName: string;
  workingDirectory: string;
}

export class WorkspaceManager {
  constructor(private readonly options: WorkspaceManagerOptions) {}

  async ensureRootIssueWorktree(input: EnsureRootIssueWorktreeInput): Promise<RootIssueWorktree> {
    const branchName = `${input.repository.branchNamePrefix}/${input.rootIssueId}`;
    const workingDirectory = join(this.options.worktreesDir, input.rootIssueId);

    await this.runGit(input.repository.localPath, ["fetch", "--all", "--prune"]);
    await this.runGit(input.repository.localPath, [
      "worktree",
      "add",
      "-B",
      branchName,
      workingDirectory,
      input.repository.defaultBaseBranch
    ]);

    return {
      repositoryId: input.repository.id,
      rootIssueId: input.rootIssueId,
      branchName,
      workingDirectory
    };
  }

  private async runGit(repositoryPath: string, args: string[]): Promise<void> {
    const result = await this.options.runner.run({
      command: "git",
      args: ["-C", repositoryPath, ...args],
      cwd: repositoryPath
    });

    if (result.exitCode !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
    }
  }
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./domain.js";
export * from "./issue-tree.js";
export * from "./rule-planner.js";
export * from "./adapters.js";
export * from "./dispatcher.js";
export * from "./notifications.js";
export * from "./seed.js";
export * from "./local-store.js";
export * from "./process-runner.js";
export * from "./workspace-manager.js";
```

- [ ] **Step 5: Run workspace manager tests**

Run:

```bash
pnpm --filter @vagrant/core test -- workspace-manager.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/process-runner.ts packages/core/src/workspace-manager.ts packages/core/src/__tests__/workspace-manager.test.ts packages/core/src/index.ts
git commit -m "feat: add git workspace manager"
```

---

### Task 4: Add Codex CLI and Claude CLI Runtime Adapters

**Files:**
- Create: `packages/core/src/runtime-adapters.ts`
- Create: `packages/core/src/__tests__/runtime-adapters.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing runtime adapter tests**

Create `packages/core/src/__tests__/runtime-adapters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createIssue, IssueType } from "../domain.js";
import { FakeProcessRunner } from "../process-runner.js";
import { ClaudeCliRuntimeAdapter, CodexCliRuntimeAdapter } from "../runtime-adapters.js";

const issue = createIssue({
  id: "issue-frontend",
  projectId: "project-vagrant",
  title: "Update issue tree UI",
  type: IssueType.Frontend,
  now: "2026-05-10T00:00:00.000Z"
});

describe("CLI runtime adapters", () => {
  it("runs Codex CLI in the issue worktree and returns log evidence", async () => {
    const runner = new FakeProcessRunner({
      exitCode: 0,
      stdout: "implemented change",
      stderr: ""
    });
    const adapter = new CodexCliRuntimeAdapter({ runner, binary: "codex" });

    const result = await adapter.startRun({
      runId: "run-codex",
      issue,
      workingDirectory: "/repo/vagrant/.worktrees/issue-root"
    });

    expect(runner.calls[0]).toEqual({
      command: "codex",
      args: ["exec", "--json"],
      cwd: "/repo/vagrant/.worktrees/issue-root",
      input: "Issue: Update issue tree UI\n\nImplement the assigned issue and produce verifiable evidence."
    });
    expect(result.summary).toBe("Codex CLI completed successfully.");
    expect(result.evidence[0]?.kind).toBe("test_log");
    expect(result.evidence[0]?.body).toContain("implemented change");
  });

  it("runs Claude CLI in the issue worktree and returns log evidence", async () => {
    const runner = new FakeProcessRunner({
      exitCode: 0,
      stdout: "reviewed implementation",
      stderr: ""
    });
    const adapter = new ClaudeCliRuntimeAdapter({ runner, binary: "claude" });

    const result = await adapter.startRun({
      runId: "run-claude",
      issue,
      workingDirectory: "/repo/vagrant/.worktrees/issue-root"
    });

    expect(runner.calls[0]).toEqual({
      command: "claude",
      args: ["--print"],
      cwd: "/repo/vagrant/.worktrees/issue-root",
      input: "Issue: Update issue tree UI\n\nImplement the assigned issue and produce verifiable evidence."
    });
    expect(result.summary).toBe("Claude CLI completed successfully.");
    expect(result.evidence[0]?.body).toContain("reviewed implementation");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test -- runtime-adapters.test.ts
```

Expected: FAIL because `runtime-adapters.ts` does not exist.

- [ ] **Step 3: Implement the CLI runtime adapters**

Create `packages/core/src/runtime-adapters.ts`:

```ts
import { type AgentRunInput, type AgentRunResult, type RuntimeAdapter } from "./adapters.js";
import { type ProcessRunner } from "./process-runner.js";

export interface CliRuntimeAdapterOptions {
  runner: ProcessRunner;
  binary: string;
}

abstract class BaseCliRuntimeAdapter implements RuntimeAdapter {
  constructor(private readonly options: CliRuntimeAdapterOptions) {}

  protected abstract readonly successSummary: string;
  protected abstract buildArgs(): string[];

  async startRun(input: AgentRunInput): Promise<AgentRunResult> {
    const prompt = buildIssuePrompt(input);
    const result = await this.options.runner.run({
      command: this.options.binary,
      args: this.buildArgs(),
      cwd: input.workingDirectory,
      input: prompt
    });

    if (result.exitCode !== 0) {
      throw new Error(`${this.options.binary} failed: ${result.stderr || result.stdout}`);
    }

    return {
      runId: input.runId,
      summary: this.successSummary,
      evidence: [
        {
          id: `${input.runId}-cli-log`,
          issueId: input.issue.id,
          kind: "test_log",
          title: `${this.options.binary} execution log`,
          url: null,
          body: [result.stdout, result.stderr].filter(Boolean).join("\n"),
          createdAt: "2026-05-10T00:00:00.000Z"
        }
      ]
    };
  }
}

export class CodexCliRuntimeAdapter extends BaseCliRuntimeAdapter {
  protected readonly successSummary = "Codex CLI completed successfully.";

  protected buildArgs(): string[] {
    return ["exec", "--json"];
  }
}

export class ClaudeCliRuntimeAdapter extends BaseCliRuntimeAdapter {
  protected readonly successSummary = "Claude CLI completed successfully.";

  protected buildArgs(): string[] {
    return ["--print"];
  }
}

function buildIssuePrompt(input: AgentRunInput): string {
  return `Issue: ${input.issue.title}\n\nImplement the assigned issue and produce verifiable evidence.`;
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./domain.js";
export * from "./issue-tree.js";
export * from "./rule-planner.js";
export * from "./adapters.js";
export * from "./dispatcher.js";
export * from "./notifications.js";
export * from "./seed.js";
export * from "./local-store.js";
export * from "./process-runner.js";
export * from "./workspace-manager.js";
export * from "./runtime-adapters.js";
```

- [ ] **Step 4: Run runtime adapter tests**

Run:

```bash
pnpm --filter @vagrant/core test -- runtime-adapters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/runtime-adapters.ts packages/core/src/__tests__/runtime-adapters.test.ts packages/core/src/index.ts
git commit -m "feat: add local cli runtime adapters"
```

---

### Task 5: Add Persistent Dispatcher Path

**Files:**
- Create: `packages/core/src/persistent-dispatcher.ts`
- Create: `packages/core/src/__tests__/persistent-dispatcher.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing persistent dispatcher test**

Create `packages/core/src/__tests__/persistent-dispatcher.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MockProviderAdapter } from "../adapters.js";
import {
  RuntimeKind,
  createProject,
  createRepositoryConfig
} from "../domain.js";
import { LocalStore } from "../local-store.js";
import { withTempRuntimeDir } from "../local-store.test-helpers.js";
import { dispatchPersistedReadyIssue } from "../persistent-dispatcher.js";
import { FakeProcessRunner } from "../process-runner.js";
import { planIssueTree } from "../rule-planner.js";
import { CodexCliRuntimeAdapter } from "../runtime-adapters.js";
import { WorkspaceManager } from "../workspace-manager.js";

const now = "2026-05-10T00:00:00.000Z";

describe("persistent dispatcher", () => {
  it("loads persisted state, prepares the worktree, runs the selected runtime, and saves results", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({ id: "project-vagrant", name: "vagrant", now });
      const repository = createRepositoryConfig({
        id: "repo-vagrant",
        projectId: project.id,
        name: "vagrant",
        localPath: "/repo/vagrant",
        remoteUrl: null,
        providerType: "local_only",
        now
      });
      const rootIssue = planIssueTree({
        projectId: project.id,
        rootIssueId: "issue-root",
        title: "Change page button",
        description: "Change one page button behavior.",
        complexity: "small",
        area: "frontend",
        now
      });
      const runner = new FakeProcessRunner({ exitCode: 0, stdout: "done", stderr: "" });

      await store.upsertProject(project);
      await store.upsertRepository(repository);
      await store.upsertRootIssue(rootIssue);

      const result = await dispatchPersistedReadyIssue({
        store,
        rootIssueId: rootIssue.id,
        repositoryId: repository.id,
        triggerEventId: "event-1",
        runtimeKind: RuntimeKind.CodexCli,
        workspaceManager: new WorkspaceManager({
          runner,
          worktreesDir: "/repo/vagrant/.worktrees"
        }),
        runtime: new CodexCliRuntimeAdapter({ runner, binary: "codex" }),
        provider: new MockProviderAdapter()
      });

      const savedRoot = await store.getRootIssue(rootIssue.id);
      const savedRuns = await store.listAgentRuns(rootIssue.id);

      expect(result.dispatchedRuns).toHaveLength(1);
      expect(savedRoot?.children[0]?.evidence[0]?.title).toBe("codex execution log");
      expect(savedRuns).toHaveLength(1);
      expect(savedRuns[0]?.runtimeKind).toBe(RuntimeKind.CodexCli);
      expect(savedRuns[0]?.status).toBe("succeeded");
      expect(await store.hasDispatchKey(result.dispatchedRuns[0]!.dispatchKey)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test -- persistent-dispatcher.test.ts
```

Expected: FAIL because `dispatchPersistedReadyIssue` does not exist.

- [ ] **Step 3: Implement the persistent dispatcher**

Create `packages/core/src/persistent-dispatcher.ts`:

```ts
import { type ProviderAdapter, type RuntimeAdapter } from "./adapters.js";
import {
  AgentRole,
  type AgentRun,
  type RepositoryConfig,
  RuntimeKind,
  createAgentRun
} from "./domain.js";
import { dispatchReadyIssues, type DispatchReadyIssuesResult } from "./dispatcher.js";
import { type LocalStore } from "./local-store.js";
import { type WorkspaceManager } from "./workspace-manager.js";

export interface DispatchPersistedReadyIssueInput {
  store: LocalStore;
  rootIssueId: string;
  repositoryId: string;
  triggerEventId: string;
  runtimeKind: RuntimeKind;
  workspaceManager: WorkspaceManager;
  runtime: RuntimeAdapter;
  provider: ProviderAdapter;
}

export async function dispatchPersistedReadyIssue(
  input: DispatchPersistedReadyIssueInput
): Promise<DispatchReadyIssuesResult> {
  const root = await input.store.getRootIssue(input.rootIssueId);

  if (!root) {
    throw new Error(`Root issue not found: ${input.rootIssueId}`);
  }

  const repository = await findRepository(input.store, root.projectId, input.repositoryId);
  const worktree = await input.workspaceManager.ensureRootIssueWorktree({
    repository,
    rootIssueId: root.id
  });
  const previousDispatchKeys = await input.store.listDispatchKeys();

  const result = await dispatchReadyIssues({
    root,
    triggerEventId: input.triggerEventId,
    runtime: input.runtime,
    provider: input.provider,
    previousDispatchKeys
  });

  await input.store.upsertRootIssue(result.root);

  for (const run of result.dispatchedRuns) {
    await input.store.addDispatchKey(run.dispatchKey);
    const issue = findIssueById(result.root, run.issueId);
    const agentRun = createAgentRun({
      id: run.runId,
      projectId: result.root.projectId,
      issueId: run.issueId,
      agentRole: issue?.ownerAgentRole ?? AgentRole.EngineeringLead,
      runtimeKind: input.runtimeKind,
      workingDirectory: worktree.workingDirectory,
      prompt: issue ? `Issue: ${issue.title}` : `Issue: ${run.issueId}`,
      now: "2026-05-10T00:00:00.000Z"
    });
    await input.store.upsertAgentRun(markSucceeded(agentRun, run.summary));
  }

  return result;
}

async function findRepository(
  store: LocalStore,
  projectId: string,
  repositoryId: string
): Promise<RepositoryConfig> {
  const repositories = await store.listRepositories(projectId);
  const repository = repositories.find((item) => item.id === repositoryId);

  if (!repository) {
    throw new Error(`Repository not found: ${repositoryId}`);
  }

  return repository;
}

function findIssueById(issue: { id: string; children: typeof issue[] }, issueId: string): typeof issue | null {
  if (issue.id === issueId) {
    return issue;
  }

  for (const child of issue.children) {
    const found = findIssueById(child, issueId);

    if (found) {
      return found;
    }
  }

  return null;
}

function markSucceeded(run: AgentRun, summary: string): AgentRun {
  return {
    ...run,
    status: "succeeded",
    summary,
    startedAt: run.createdAt,
    completedAt: run.createdAt,
    updatedAt: run.createdAt
  };
}
```

Before running tests, fix the recursive helper signature in the implementation if TypeScript rejects the self-referential anonymous type. Use this exact replacement:

```ts
import { type Issue } from "./domain.js";

function findIssueById(issue: Issue, issueId: string): Issue | null {
  if (issue.id === issueId) {
    return issue;
  }

  for (const child of issue.children) {
    const found = findIssueById(child, issueId);

    if (found) {
      return found;
    }
  }

  return null;
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./domain.js";
export * from "./issue-tree.js";
export * from "./rule-planner.js";
export * from "./adapters.js";
export * from "./dispatcher.js";
export * from "./notifications.js";
export * from "./seed.js";
export * from "./local-store.js";
export * from "./process-runner.js";
export * from "./workspace-manager.js";
export * from "./runtime-adapters.js";
export * from "./persistent-dispatcher.js";
```

- [ ] **Step 4: Run persistent dispatcher tests**

Run:

```bash
pnpm --filter @vagrant/core test -- persistent-dispatcher.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/persistent-dispatcher.ts packages/core/src/__tests__/persistent-dispatcher.test.ts packages/core/src/index.ts
git commit -m "feat: persist dispatched agent runs"
```

---

### Task 6: Update Seed and README for Phase 2

**Files:**
- Modify: `packages/core/src/seed.ts`
- Create: `packages/core/src/__tests__/seed-persistence.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing seed persistence test**

Create `packages/core/src/__tests__/seed-persistence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../domain.js";
import { createPersistedDemoState } from "../seed.js";

describe("persisted demo seed", () => {
  it("creates provider-neutral repository config and default runtime preferences", () => {
    const state = createPersistedDemoState({
      repositoryLocalPath: "/Users/asuka/Documents/vagrant",
      repositoryRemoteUrl: "https://github.com/Sinon4869/vagrant",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(state.project.name).toBe("vagrant");
    expect(state.repository.providerType).toBe("generic_git");
    expect(state.repository.remoteUrl).toBe("https://github.com/Sinon4869/vagrant");
    expect(state.defaultRuntimeKind).toBe(RuntimeKind.CodexCli);
    expect(state.rootIssue.children.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test -- seed-persistence.test.ts
```

Expected: FAIL because `createPersistedDemoState` does not exist.

- [ ] **Step 3: Add the persisted demo state builder**

Modify `packages/core/src/seed.ts`:

```ts
import { aggregateIssueTree } from "./issue-tree.js";
import { planIssueTree } from "./rule-planner.js";
import {
  RuntimeKind,
  createProject,
  createRepositoryConfig
} from "./domain.js";

const DEMO_NOW = "2026-05-10T00:00:00.000Z";

export function createDemoProject() {
  const rootIssue = planIssueTree({
    projectId: "project-vagrant",
    rootIssueId: "issue-vagrant-knowledge",
    title: "Build agent knowledge wiki",
    description: "Create a Markdown wiki with structured indexes for agent context and delivery evidence.",
    complexity: "large",
    area: "full_stack",
    now: DEMO_NOW
  });

  return {
    project: {
      id: "project-vagrant",
      name: "vagrant",
      repositoryUrl: "https://github.com/Sinon4869/vagrant"
    },
    rootIssue,
    summary: aggregateIssueTree(rootIssue),
    attentionItems: [
      {
        id: "attention-1",
        type: "digest",
        title: "Autopilot is ready to start the first subissue",
        body: "The deterministic planner created a full-stack issue tree."
      }
    ]
  };
}

export interface CreatePersistedDemoStateInput {
  repositoryLocalPath: string;
  repositoryRemoteUrl: string | null;
  now?: string;
}

export function createPersistedDemoState(input: CreatePersistedDemoStateInput) {
  const now = input.now ?? DEMO_NOW;
  const project = createProject({
    id: "project-vagrant",
    name: "vagrant",
    description: "Local-first multi-agent engineering management platform.",
    now
  });
  const repository = createRepositoryConfig({
    id: "repo-vagrant",
    projectId: project.id,
    name: "vagrant",
    localPath: input.repositoryLocalPath,
    remoteUrl: input.repositoryRemoteUrl,
    providerType: input.repositoryRemoteUrl ? "generic_git" : "local_only",
    defaultBaseBranch: "main",
    branchNamePrefix: "vagrant",
    now
  });
  const rootIssue = planIssueTree({
    projectId: project.id,
    rootIssueId: "issue-vagrant-knowledge",
    title: "Build agent knowledge wiki",
    description: "Create a Markdown wiki with structured indexes for agent context and delivery evidence.",
    complexity: "large",
    area: "full_stack",
    now
  });

  return {
    project,
    repository,
    rootIssue,
    defaultRuntimeKind: RuntimeKind.CodexCli
  };
}
```

- [ ] **Step 4: Update README**

Append this section to `README.md`:

```md
## Phase 2 Runtime Foundation

Phase 2 adds the local execution foundation used by the future daemon:

- `LocalStore` persists projects, configured repositories, root issue trees, agent runs, evidence, and dispatch idempotency keys in `.vagrant/runtime/workspace-state.json`.
- Repository configuration is provider-neutral. A project repository can point to GitHub, GitLab, Gitea, Bitbucket, a private git server, or a local-only checkout.
- `WorkspaceManager` uses generic `git fetch` and `git worktree add` commands to isolate each root issue under a configurable worktree directory.
- `CodexCliRuntimeAdapter` and `ClaudeCliRuntimeAdapter` call local CLI binaries through an injectable process runner.

The Phase 2 CLI adapters are intentionally skeletal. They establish the command boundary and evidence capture contract; the daemon, streaming logs, approvals, email digests, provider sync, and wiki indexing are separate follow-up phases.
```

- [ ] **Step 5: Run seed test and full verification**

Run sequentially:

```bash
pnpm --filter @vagrant/core test -- seed-persistence.test.ts
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all commands PASS. Run these commands sequentially because `pnpm lint` and `pnpm build` can both touch `.next` when the web package runs Next type generation.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/seed.ts packages/core/src/__tests__/seed-persistence.test.ts README.md
git commit -m "docs: describe phase 2 runtime foundation"
```

---

## Self-Review

### Spec Coverage

- Local database/source of truth: covered by `LocalStore` with JSON persistence as the Phase 2 storage boundary.
- Repository is configurable and not GitHub-only: covered by `RepositoryConfig.providerType`, `remoteUrl`, `localPath`, and `WorkspaceManager`.
- Each root issue gets an isolated worktree: covered by `WorkspaceManager.ensureRootIssueWorktree`.
- Codex CLI and Claude CLI as AI ability sources: covered by `CodexCliRuntimeAdapter` and `ClaudeCliRuntimeAdapter`.
- Agent run records and evidence: covered by `createAgentRun`, runtime adapters, and `dispatchPersistedReadyIssue`.
- Idempotent dispatcher persistence: covered by `LocalStore.dispatchKeys` and persistent dispatcher tests.

### Intentional Gaps

- Email notification delivery and anti-email-storm digest rules remain in a later notification phase.
- External issue/subissue provider sync remains in a later provider phase.
- Wiki page authoring, indexing, and retrieval remain in a later knowledge phase.
- Web settings UI for configuring repositories and runtimes remains in a later app phase.
- Streaming logs and daemon scheduling remain in a later daemon phase.

### Placeholder Scan

This plan avoids `TBD`, unspecified placeholders, and unbounded steps. Every code-producing step gives concrete file paths, concrete code, and a verification command.

### Type Consistency Notes

- Local ESM imports use `.js` specifiers.
- `RuntimeKind` values match the persisted agent run test.
- `RepositoryConfig.providerType` includes `generic_git` and `local_only`, satisfying configurable non-GitHub repositories.
- `dispatchPersistedReadyIssue` accepts injected runtime/provider/workspace dependencies so Codex, Claude, and mocks share the same dispatcher contract.
