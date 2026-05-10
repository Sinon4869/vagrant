import { describe, expect, it } from "vitest";
import { planReadyActions } from "../action-planner.js";
import { type IssueRelation, IssueStatus, IssueType } from "../domain.js";
import { planIssueTree } from "../rule-planner.js";

describe("planReadyActions", () => {
  it("plans multiple ready leaf actions without runtime side effects", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Build settings module",
      description: "Add settings UI and API",
      complexity: "large",
      area: "full_stack",
      now: "2026-05-10T00:00:00.000Z"
    });

    const result = planReadyActions({
      root,
      triggerEventId: "event-1",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(result.actions.map((action) => action.issueId)).toEqual(root.children.map((child) => child.id));
    expect(result.actions[0]).toMatchObject({
      kind: "start_agent_run",
      status: "pending",
      rootIssueId: root.id
    });
  });

  it("does not plan an issue until depends_on targets are done", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Build settings module",
      description: "Add settings UI and API",
      complexity: "large",
      area: "full_stack",
      now: "2026-05-10T00:00:00.000Z"
    });
    const frontend = root.children.find((issue) => issue.id.endsWith("-frontend"))!;
    const backend = root.children.find((issue) => issue.id.endsWith("-backend"))!;
    const review = root.children.find((issue) => issue.id.endsWith("-review"))!;
    const relations: IssueRelation[] = [
      relation(review.id, frontend.id),
      relation(review.id, backend.id)
    ];

    const blocked = planReadyActions({
      root,
      relations,
      triggerEventId: "event-1",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(blocked.actions.map((action) => action.issueId)).not.toContain(review.id);

    const unblocked = planReadyActions({
      root: {
        ...root,
        children: root.children.map((issue) =>
          issue.id === frontend.id || issue.id === backend.id ? { ...issue, status: IssueStatus.Done } : issue
        )
      },
      relations,
      triggerEventId: "event-1",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(unblocked.actions.map((action) => action.issueId)).toContain(review.id);
  });

  it("skips blocked issues and already planned idempotency keys", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change dashboard button",
      description: "Change dashboard button text",
      complexity: "small",
      area: "frontend",
      now: "2026-05-10T00:00:00.000Z"
    });
    const first = root.children[0]!;
    const second = root.children[1]!;
    const idempotencyKey = [root.id, second.id, second.ownerAgentRole ?? "unassigned", "event-1", "run"].join(":");

    const result = planReadyActions({
      root: {
        ...root,
        children: [
          {
            ...first,
            blockers: [
              {
                id: "blocker-1",
                issueId: first.id,
                ownerAgentRole: first.ownerAgentRole,
                reason: "Waiting for credentials",
                unblockCondition: "Credential profile is configured",
                createdAt: "2026-05-10T00:00:00.000Z",
                resolvedAt: null
              }
            ]
          },
          second
        ]
      },
      previousDispatchKeys: new Set([idempotencyKey]),
      triggerEventId: "event-1",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(result.blockedIssueIds).toEqual([first.id]);
    expect(result.actions).toEqual([]);
  });

  it("plans approval actions for high risk issue types before starting an agent run", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Run database migration",
      description: "Change schema",
      complexity: "medium",
      area: "backend",
      now: "2026-05-10T00:00:00.000Z"
    });
    const databaseIssue = {
      ...root.children[0]!,
      type: IssueType.Database
    };

    const result = planReadyActions({
      root: {
        ...root,
        children: [databaseIssue]
      },
      triggerEventId: "event-1",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(result.actions).toEqual([
      expect.objectContaining({
        issueId: databaseIssue.id,
        kind: "request_approval",
        payload: expect.objectContaining({
          risk: "high",
          reason: "database_migration"
        })
      })
    ]);
  });
});

function relation(sourceIssueId: string, targetIssueId: string): IssueRelation {
  return {
    id: `${sourceIssueId}-depends-on-${targetIssueId}`,
    projectId: "project-1",
    rootIssueId: "root-1",
    sourceIssueId,
    targetIssueId,
    kind: "depends_on",
    createdAt: "2026-05-10T00:00:00.000Z"
  };
}
