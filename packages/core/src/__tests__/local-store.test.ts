import { describe, expect, it } from "vitest";
import {
  AgentRole,
  IssueType,
  RuntimeKind,
  createAgentRun,
  createIssue,
  createKnowledgePage,
  createNotificationItem,
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
      const notification = createNotificationItem({
        id: "notification-1",
        projectId: project.id,
        rootIssueId: rootIssue.id,
        issueId: rootIssue.id,
        type: "approval_required",
        title: "Backend run needs approval",
        body: "The agent requested repository write access.",
        severity: "high",
        delivery: "immediate_email",
        dedupeKey: "project-vagrant:issue-root:approval_required:run-1",
        emailSentAt: now,
        now
      });
      const knowledgePage = createKnowledgePage({
        id: "wiki-runtime-policy",
        projectId: project.id,
        title: "Runtime policy",
        body: "Codex CLI is the default engineering runtime.",
        tags: ["runtime", "codex"],
        linkedRequirementIds: [rootIssue.id],
        linkedRepositoryIds: [repository.id],
        now
      });

      await store.upsertProject(project);
      await store.upsertRepository(repository);
      await store.upsertRootIssue(rootIssue);
      await store.upsertAgentRun(run);
      await store.upsertNotification(notification);
      await store.upsertKnowledgePage(knowledgePage);
      await store.addDispatchKey("issue-root:issue-root:backend_developer:event-1:run");

      const reloaded = new LocalStore({ runtimeDir });
      await reloaded.initialize();

      expect(await reloaded.getProject(project.id)).toEqual(project);
      expect(await reloaded.listRepositories(project.id)).toEqual([repository]);
      expect(await reloaded.listRootIssues(project.id)).toEqual([rootIssue]);
      expect(await reloaded.getRootIssue(rootIssue.id)).toEqual(rootIssue);
      expect(await reloaded.listAgentRuns(rootIssue.id)).toEqual([run]);
      expect(await reloaded.listProjectAgentRuns(project.id)).toEqual([run]);
      expect(await reloaded.listNotifications(project.id)).toEqual([notification]);
      expect(await reloaded.listKnowledgePages(project.id)).toEqual([knowledgePage]);
      expect(await reloaded.hasDispatchKey("issue-root:issue-root:backend_developer:event-1:run")).toBe(true);
    });
  });
});
