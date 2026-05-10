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
import { PostgresStore } from "../node.js";

const databaseUrl = process.env.DATABASE_URL;
const describeIfDatabase = databaseUrl ? describe : describe.skip;
const now = "2026-05-10T00:00:00.000Z";

describeIfDatabase("PostgresStore", () => {
  it("persists workspace entities in PostgreSQL", async () => {
    const suffix = `test-${Date.now()}`;
    const store = new PostgresStore({ connectionString: databaseUrl! });
    await store.initialize();

    const project = createProject({ id: `project-${suffix}`, name: "vagrant-pg", now });
    const repository = createRepositoryConfig({
      id: `repo-${suffix}`,
      projectId: project.id,
      name: "vagrant-pg",
      localPath: "/repo/vagrant-pg",
      remoteUrl: "ssh://git.example/vagrant-pg.git",
      now
    });
    const rootIssue = createIssue({
      id: `issue-${suffix}`,
      projectId: project.id,
      title: "Persist issue",
      type: IssueType.Requirement,
      now
    });
    const run = createAgentRun({
      id: `run-${suffix}`,
      projectId: project.id,
      issueId: rootIssue.id,
      agentRole: AgentRole.BackendDeveloper,
      runtimeKind: RuntimeKind.Mock,
      workingDirectory: "/repo/vagrant-pg/.worktrees/issue",
      prompt: "Run persisted issue.",
      now
    });
    const notification = createNotificationItem({
      id: `notification-${suffix}`,
      projectId: project.id,
      rootIssueId: rootIssue.id,
      issueId: rootIssue.id,
      type: "blocked",
      title: "Issue is blocked",
      body: "A review gate needs attention.",
      severity: "high",
      delivery: "immediate_email",
      dedupeKey: `${project.id}:${rootIssue.id}:blocked:${run.id}`,
      emailSentAt: now,
      now
    });
    const knowledgePage = createKnowledgePage({
      id: `wiki-${suffix}`,
      projectId: project.id,
      title: "Runtime policy",
      body: "Codex CLI is the default engineering runtime.",
      tags: ["runtime", "codex"],
      linkedRequirementIds: [rootIssue.id],
      linkedRepositoryIds: [repository.id],
      now
    });
    const dispatchKey = `${rootIssue.id}:${rootIssue.id}:backend_developer:event-1:run`;

    await store.upsertProject(project);
    await store.upsertRepository(repository);
    await store.upsertRootIssue(rootIssue);
    await store.upsertAgentRun(run);
    await store.upsertNotification(notification);
    await store.upsertKnowledgePage(knowledgePage);
    await store.addDispatchKey(dispatchKey);

    expect(await store.getProject(project.id)).toEqual(project);
    expect((await store.listProjects()).some((item) => item.id === project.id)).toBe(true);
    expect(await store.listRepositories(project.id)).toEqual([repository]);
    expect(await store.listRootIssues(project.id)).toEqual([rootIssue]);
    expect(await store.getRootIssue(rootIssue.id)).toEqual(rootIssue);
    expect(await store.listAgentRuns(rootIssue.id)).toEqual([run]);
    expect(await store.listProjectAgentRuns(project.id)).toEqual([run]);
    expect(await store.listNotifications(project.id)).toEqual([notification]);
    expect(await store.listKnowledgePages(project.id)).toEqual([knowledgePage]);
    expect(await store.hasDispatchKey(dispatchKey)).toBe(true);
  });
});
