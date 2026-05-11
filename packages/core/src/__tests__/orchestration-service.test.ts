import { describe, expect, it } from "vitest";
import { LocalStore } from "../local-store.js";
import { executeDispatchAction, runOrchestrationTick, scanReadyDispatchActions } from "../orchestration-service.js";
import { MockProviderAdapter, MockRuntimeAdapter, type AgentRunInput, type AgentRunResult, type RuntimeAdapter } from "../adapters.js";
import { AgentRole, RuntimeKind, createProject, decideApproval, type DispatchAction } from "../domain.js";
import { buildIssuePrompt } from "../runtime-adapters.js";
import { planIssueTree } from "../rule-planner.js";
import { withTempRuntimeDir } from "./test-helpers.js";

describe("orchestration service", () => {
  it("persists newly planned ready dispatch actions and their idempotency keys", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const root = planIssueTree({
        projectId: project.id,
        rootIssueId: "root-1",
        title: "Build settings module",
        description: "Add settings UI and API",
        complexity: "small",
        area: "frontend",
        now: "2026-05-10T00:00:00.000Z"
      });
      await store.upsertProject(project);
      await store.upsertRootIssue(root);

      const result = await scanReadyDispatchActions({
        store,
        rootIssueId: root.id,
        triggerEventId: "event-1",
        now: "2026-05-10T00:00:00.000Z"
      });

      const saved = await store.listDispatchActions(root.id);
      expect(result.actions).toHaveLength(root.children.length);
      expect(saved.map((action) => action.id).sort()).toEqual(
        result.actions.map((action) => action.id).sort()
      );
      expect(await store.hasDispatchKey(result.actions[0]!.idempotencyKey)).toBe(true);
    });
  });

  it("uses persisted issue relations to hold downstream work until dependencies complete", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const root = planIssueTree({
        projectId: project.id,
        rootIssueId: "root-1",
        title: "Build settings module",
        description: "Add settings UI and API",
        complexity: "large",
        area: "full_stack",
        now: "2026-05-10T00:00:00.000Z"
      });
      await store.upsertProject(project);
      await store.upsertRootIssue(root);
      await store.upsertIssueRelation({
        id: "root-1-review-depends-on-root-1-frontend",
        projectId: project.id,
        rootIssueId: root.id,
        sourceIssueId: "root-1-review",
        targetIssueId: "root-1-frontend",
        kind: "depends_on",
        createdAt: "2026-05-10T00:00:00.000Z"
      });

      const result = await scanReadyDispatchActions({
        store,
        rootIssueId: root.id,
        triggerEventId: "event-1",
        now: "2026-05-10T00:00:00.000Z"
      });

      expect(result.actions.map((action) => action.issueId)).not.toContain("root-1-review");
    });
  });

  it("creates a pending approval when persisting an approval dispatch action", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const action: DispatchAction = {
        id: "dispatch-database-event-1",
        projectId: project.id,
        rootIssueId: "root-1",
        issueId: "database-1",
        kind: "request_approval",
        status: "pending",
        payload: {
          risk: "high",
          reason: "database_migration",
          agentRole: "database",
          issueType: "database"
        },
        idempotencyKey: "root-1:database-1:database:event-1:approval",
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z"
      };
      await store.upsertProject(project);

      const result = await scanReadyDispatchActions({
        store,
        rootIssueId: "root-1",
        triggerEventId: "event-1",
        now: "2026-05-10T00:00:00.000Z",
        plannedActions: [action]
      });

      const approvals = await store.listApprovals(project.id);
      expect(result.approvals).toHaveLength(1);
      expect(approvals).toEqual([
        expect.objectContaining({
          id: "approval-dispatch-database-event-1",
          dispatchActionId: action.id,
          issueId: action.issueId,
          status: "pending",
          risk: "high",
          reason: "database_migration"
        })
      ]);
    });
  });

  it("returns existing pending actions so an interrupted scan can resume execution", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const root = planIssueTree({
        projectId: project.id,
        rootIssueId: "root-1",
        title: "Change button",
        description: "Change one page button behavior",
        complexity: "small",
        area: "frontend",
        now: "2026-05-10T00:00:00.000Z"
      });
      const existingAction = startAction(project.id, root.id, root.children[0]!.id);
      await store.upsertProject(project);
      await store.upsertRootIssue(root);
      await store.upsertDispatchAction(existingAction);
      await store.addDispatchKey(existingAction.idempotencyKey);

      const result = await scanReadyDispatchActions({
        store,
        rootIssueId: root.id,
        triggerEventId: "event-1",
        now: "2026-05-10T00:00:00.000Z"
      });

      expect(result.actions).toEqual([existingAction]);
    });
  });

  it("plans a run action after a high risk approval is granted without overwriting approval audit", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const root = {
        ...planIssueTree({
          projectId: project.id,
          rootIssueId: "root-1",
          title: "Change schema",
          description: "Add a database migration",
          complexity: "medium",
          area: "backend",
          now: "2026-05-10T00:00:00.000Z"
        }),
        children: []
      };
      const databaseIssue = {
        ...planIssueTree({
          projectId: project.id,
          rootIssueId: "root-1",
          title: "Change schema",
          description: "Add a database migration",
          complexity: "medium",
          area: "backend",
          now: "2026-05-10T00:00:00.000Z"
        }).children[0]!,
        type: "database" as const,
        ownerAgentRole: AgentRole.Database
      };
      const rootWithDatabase = {
        ...root,
        children: [databaseIssue]
      };
      await store.upsertProject(project);
      await store.upsertRootIssue(rootWithDatabase);

      const approvalScan = await scanReadyDispatchActions({
        store,
        rootIssueId: root.id,
        triggerEventId: "event-1",
        now: "2026-05-10T00:00:00.000Z"
      });
      const approvalAction = approvalScan.actions[0]!;
      const pendingApproval = (await store.listApprovals(project.id))[0]!;
      await store.upsertApproval(decideApproval(pendingApproval, {
        decision: "approved",
        decidedBy: "local-operator",
        now: "2026-05-10T01:00:00.000Z"
      }));

      const runScan = await scanReadyDispatchActions({
        store,
        rootIssueId: root.id,
        triggerEventId: "event-1",
        now: "2026-05-10T01:00:00.000Z"
      });

      const savedActions = await store.listDispatchActions(root.id);
      expect(runScan.actions).toEqual([
        expect.objectContaining({
          kind: "start_agent_run",
          issueId: databaseIssue.id,
          payload: expect.objectContaining({
            approvalId: pendingApproval.id
          })
        })
      ]);
      expect(savedActions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: approvalAction.id,
          kind: "request_approval",
          status: "succeeded"
        }),
        expect.objectContaining({
          kind: "start_agent_run",
          status: "pending"
        })
      ]));
      expect(new Set(savedActions.map((action) => action.id)).size).toBe(savedActions.length);
    });
  });

  it("cancels approval actions after rejection and does not start the run", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const root = databaseRoot(project.id);
      await store.upsertProject(project);
      await store.upsertRootIssue(root);

      const approvalScan = await scanReadyDispatchActions({
        store,
        rootIssueId: root.id,
        triggerEventId: "event-1",
        now: "2026-05-10T00:00:00.000Z"
      });
      const approvalAction = approvalScan.actions[0]!;
      const pendingApproval = (await store.listApprovals(project.id))[0]!;
      await store.upsertApproval(decideApproval(pendingApproval, {
        decision: "rejected",
        decidedBy: "local-operator",
        now: "2026-05-10T01:00:00.000Z"
      }));

      const runScan = await scanReadyDispatchActions({
        store,
        rootIssueId: root.id,
        triggerEventId: "event-1",
        now: "2026-05-10T01:00:00.000Z"
      });

      const savedActions = await store.listDispatchActions(root.id);
      expect(runScan.actions).toEqual([]);
      expect(savedActions).toEqual([
        expect.objectContaining({
          id: approvalAction.id,
          kind: "request_approval",
          status: "cancelled"
        })
      ]);
    });
  });

  it("executes a pending start action and persists run, evidence, issue status, and action status", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const root = planIssueTree({
        projectId: project.id,
        rootIssueId: "root-1",
        title: "Change button",
        description: "Change one page button behavior",
        complexity: "small",
        area: "frontend",
        now: "2026-05-10T00:00:00.000Z"
      });
      const action = startAction(project.id, root.id, root.children[0]!.id);
      await store.upsertProject(project);
      await store.upsertRootIssue(root);
      await store.upsertDispatchAction(action);

      const result = await executeDispatchAction({
        store,
        actionId: action.id,
        rootIssueId: root.id,
        runtimeKind: RuntimeKind.Mock,
        runtime: new MockRuntimeAdapter(),
        provider: new MockProviderAdapter(),
        workingDirectory: "/mock/workspaces/root-1",
        now: "2026-05-10T00:00:00.000Z"
      });

      const savedRoot = await store.getRootIssue(root.id);
      const savedRuns = await store.listAgentRuns(root.id);
      const savedActions = await store.listDispatchActions(root.id);
      expect(result.run?.status).toBe("succeeded");
      expect(savedRuns).toHaveLength(1);
      expect(savedRuns[0]).toMatchObject({
        issueId: root.children[0]!.id,
        status: "succeeded",
        runtimeKind: RuntimeKind.Mock,
        prompt: buildIssuePrompt({
          runId: savedRuns[0]!.id,
          issue: root.children[0]!,
          workingDirectory: "/mock/workspaces/root-1"
        })
      });
      expect(savedRuns[0]?.prompt).toContain(root.children[0]!.id);
      expect(savedRuns[0]?.prompt).toContain(root.children[0]!.title);
      expect(savedRuns[0]?.prompt).toContain(root.children[0]!.description);
      expect(savedRuns[0]?.prompt).toContain(root.children[0]!.type);
      expect(savedRuns[0]?.prompt).toContain(root.children[0]!.ownerAgentRole!);
      expect(savedRuns[0]?.prompt).toContain("/mock/workspaces/root-1");
      expect(savedRuns[0]?.prompt).toContain("Acceptance Criteria");
      expect(savedRuns[0]?.prompt).toContain("Evidence Requirements");
      expect(savedRoot?.children[0]?.status).toBe("done");
      expect(savedRoot?.children[0]?.evidence[0]?.title).toBe("Mock validation log");
      expect(savedActions.find((item) => item.id === action.id)?.status).toBe("succeeded");
    });
  });

  it("persists failed runs with an error log when the runtime throws", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const root = planIssueTree({
        projectId: project.id,
        rootIssueId: "root-1",
        title: "Change button",
        description: "Change one page button behavior",
        complexity: "small",
        area: "frontend",
        now: "2026-05-10T00:00:00.000Z"
      });
      const action = startAction(project.id, root.id, root.children[0]!.id);
      await store.upsertProject(project);
      await store.upsertRootIssue(root);
      await store.upsertDispatchAction(action);

      const result = await executeDispatchAction({
        store,
        actionId: action.id,
        rootIssueId: root.id,
        runtimeKind: RuntimeKind.CodexCli,
        runtime: new ThrowingRuntimeAdapter(new Error("codex exploded")),
        provider: new MockProviderAdapter(),
        workingDirectory: "/mock/workspaces/root-1",
        now: "2026-05-10T00:00:00.000Z"
      });

      const savedRuns = await store.listAgentRuns(root.id);
      const savedActions = await store.listDispatchActions(root.id);
      expect(result.run?.status).toBe("failed");
      expect(savedRuns[0]).toMatchObject({
        status: "failed",
        summary: "codex exploded",
        prompt: buildIssuePrompt({
          runId: savedRuns[0]!.id,
          issue: root.children[0]!,
          workingDirectory: "/mock/workspaces/root-1"
        })
      });
      expect(savedRuns[0]?.logs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          stream: "system",
          body: expect.stringContaining("codex exploded")
        })
      ]));
      expect(savedActions.find((item) => item.id === action.id)?.status).toBe("failed");
    });
  });

  it("runs a project orchestration tick across root issues and reports actions, runs, and approvals", async () => {
    await withTempRuntimeDir(async (runtimeDir) => {
      const store = new LocalStore({ runtimeDir });
      await store.initialize();
      const project = createProject({
        id: "project-1",
        name: "Vagrant",
        now: "2026-05-10T00:00:00.000Z"
      });
      const frontendRoot = planIssueTree({
        projectId: project.id,
        rootIssueId: "root-frontend",
        title: "Change button",
        description: "Change one page button behavior",
        complexity: "small",
        area: "frontend",
        now: "2026-05-10T00:00:00.000Z"
      });
      const databaseRootIssue = databaseRoot(project.id);
      await store.upsertProject(project);
      await store.upsertRootIssue(frontendRoot);
      await store.upsertRootIssue(databaseRootIssue);

      const result = await runOrchestrationTick({
        store,
        projectId: project.id,
        triggerEventId: "daemon-1",
        runtimeKind: RuntimeKind.Mock,
        runtime: new MockRuntimeAdapter(),
        provider: new MockProviderAdapter(),
        workingDirectory: "/mock/workspaces/project-1",
        now: "2026-05-10T00:00:00.000Z"
      });

      const runs = await store.listProjectAgentRuns(project.id);
      const approvals = await store.listApprovals(project.id);
      expect(result.scannedRootIssues).toBe(2);
      expect(result.executedRuns).toHaveLength(1);
      expect(result.createdApprovals).toHaveLength(1);
      expect(runs).toHaveLength(1);
      expect(approvals).toEqual([
        expect.objectContaining({
          rootIssueId: databaseRootIssue.id,
          status: "pending"
        })
      ]);
    });
  });
});

function startAction(projectId: string, rootIssueId: string, issueId: string): DispatchAction {
  return {
    id: "dispatch-frontend-event-1",
    projectId,
    rootIssueId,
    issueId,
    kind: "start_agent_run",
    status: "pending",
    payload: {
      agentRole: AgentRole.FrontendDeveloper,
      issueType: "frontend"
    },
    idempotencyKey: `${rootIssueId}:${issueId}:frontend_developer:event-1:run`,
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z"
  };
}

function databaseRoot(projectId: string) {
  const planned = planIssueTree({
    projectId,
    rootIssueId: "root-1",
    title: "Change schema",
    description: "Add a database migration",
    complexity: "medium",
    area: "backend",
    now: "2026-05-10T00:00:00.000Z"
  });

  return {
    ...planned,
    children: [
      {
        ...planned.children[0]!,
        type: "database" as const,
        ownerAgentRole: AgentRole.Database
      }
    ]
  };
}

class ThrowingRuntimeAdapter implements RuntimeAdapter {
  constructor(private readonly error: Error) {}

  async startRun(_input: AgentRunInput): Promise<AgentRunResult> {
    throw this.error;
  }
}
