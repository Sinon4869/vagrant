import { describe, expect, it } from "vitest";
import { MockProviderAdapter } from "../adapters.js";
import { RuntimeKind, createProject, createRepositoryConfig } from "../domain.js";
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
