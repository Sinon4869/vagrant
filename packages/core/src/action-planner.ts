import {
  AgentRole,
  type DispatchAction,
  type Issue,
  type IssueRelation,
  IssueStatus
} from "./domain.js";
import { flattenIssueTree } from "./issue-tree.js";

export interface PlanReadyActionsInput {
  root: Issue;
  relations?: IssueRelation[];
  previousDispatchKeys?: Set<string>;
  triggerEventId: string;
  now?: string;
}

export interface PlanReadyActionsResult {
  actions: DispatchAction[];
  blockedIssueIds: string[];
}

export function planReadyActions(input: PlanReadyActionsInput): PlanReadyActionsResult {
  const now = input.now ?? new Date().toISOString();
  const issues = flattenIssueTree(input.root);
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const previousDispatchKeys = input.previousDispatchKeys ?? new Set<string>();
  const blockedIssueIds: string[] = [];
  const actions: DispatchAction[] = [];

  for (const issue of issues) {
    if (issue.id === input.root.id || issue.status !== IssueStatus.Todo) {
      continue;
    }

    if (issue.blockers.some((blocker) => !blocker.resolvedAt)) {
      blockedIssueIds.push(issue.id);
      continue;
    }

    if (!dependenciesAreDone(issue, input.relations ?? [], issueById)) {
      continue;
    }

    const idempotencyKey = createDispatchIdempotencyKey(input.root.id, issue, input.triggerEventId);

    if (previousDispatchKeys.has(idempotencyKey)) {
      continue;
    }

    actions.push({
      id: `dispatch-${issue.id}-${input.triggerEventId}`,
      projectId: issue.projectId,
      rootIssueId: input.root.id,
      issueId: issue.id,
      kind: "start_agent_run",
      status: "pending",
      payload: {
        agentRole: issue.ownerAgentRole ?? AgentRole.CEO,
        issueType: issue.type
      },
      idempotencyKey,
      createdAt: now,
      updatedAt: now
    });
  }

  return {
    actions,
    blockedIssueIds
  };
}

function dependenciesAreDone(issue: Issue, relations: IssueRelation[], issueById: Map<string, Issue>): boolean {
  const dependencies = relations.filter(
    (relation) => relation.kind === "depends_on" && relation.sourceIssueId === issue.id
  );

  return dependencies.every((relation) => issueById.get(relation.targetIssueId)?.status === IssueStatus.Done);
}

function createDispatchIdempotencyKey(rootIssueId: string, issue: Issue, triggerEventId: string): string {
  return [rootIssueId, issue.id, issue.ownerAgentRole ?? "unassigned", triggerEventId, "run"].join(":");
}
