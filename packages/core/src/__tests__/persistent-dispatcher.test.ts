import { describe, expect, it } from "vitest";
import { MockProviderAdapter } from "../adapters.js";
import { AgentRole, IssueStatus, IssueType, RuntimeKind, createProject, createRepositoryConfig } from "../domain.js";
import {
  CodexCliRuntimeAdapter,
  FakeProcessRunner,
  LocalStore,
  WorkspaceManager,
  dispatchPersistedReadyIssue
} from "../node.js";
import { planIssueTree } from "../rule-planner.js";
import { withTempRuntimeDir } from "./test-helpers.js";

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
      const runner = new FakeProcessRunner({ exitCode: 0, stdout: "true", stderr: "" });

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
      expect(savedRoot?.children[0]?.status).toBe(IssueStatus.InReview);
      expect(await store.hasDispatchKey(result.dispatchedRuns[0]!.dispatchKey)).toBe(true);
    });
  });

  it("persists an approval gate instead of running high risk issues directly", async () => {
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
      const planned = planIssueTree({
        projectId: project.id,
        rootIssueId: "issue-root",
        title: "Change database schema",
        description: "Add a database migration.",
        complexity: "medium",
        area: "backend",
        now
      });
      const rootIssue = {
        ...planned,
        children: [
          {
            ...planned.children[0]!,
            type: IssueType.Database,
            ownerAgentRole: AgentRole.Database
          }
        ]
      };
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

      const approvals = await store.listApprovals(project.id);
      const savedRuns = await store.listAgentRuns(rootIssue.id);
      expect(result.dispatchedRuns).toEqual([]);
      expect(savedRuns).toEqual([]);
      expect(approvals).toEqual([
        expect.objectContaining({
          issueId: rootIssue.children[0]!.id,
          status: "pending",
          reason: "database_migration"
        })
      ]);
      expect(runner.calls).toEqual([]);
    });
  });
});
