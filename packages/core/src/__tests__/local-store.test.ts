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
import { LocalStore } from "../node.js";
import { withTempRuntimeDir } from "./test-helpers.js";

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
      expect(await reloaded.listRootIssues(project.id)).toEqual([rootIssue]);
      expect(await reloaded.getRootIssue(rootIssue.id)).toEqual(rootIssue);
      expect(await reloaded.listAgentRuns(rootIssue.id)).toEqual([run]);
      expect(await reloaded.hasDispatchKey("issue-root:issue-root:backend_developer:event-1:run")).toBe(true);
    });
  });
});
