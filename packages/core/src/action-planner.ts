import {
  AgentRole,
  type Approval,
  type DispatchAction,
  type Issue,
  type IssueRelation,
  IssueType,
  IssueStatus
} from "./domain.js";
import { flattenIssueTree } from "./issue-tree.js";

export interface PlanReadyActionsInput {
  root: Issue;
  relations?: IssueRelation[];
  approvals?: Approval[];
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

    const approvalReason = approvalReasonForIssue(issue);
    const approvedApproval = approvalReason ? findApprovedApproval(input.approvals ?? [], issue, approvalReason) : null;
    const actionKind = approvalReason && !approvedApproval ? "request_approval" : "start_agent_run";
    const idempotencyKey = createDispatchIdempotencyKey(input.root.id, issue, input.triggerEventId, actionKind);

    if (previousDispatchKeys.has(idempotencyKey)) {
      continue;
    }

    actions.push({
      id: createDispatchActionId(issue, input.triggerEventId, actionKind),
      projectId: issue.projectId,
      rootIssueId: input.root.id,
      issueId: issue.id,
      kind: actionKind,
      status: "pending",
      payload: actionKind === "request_approval"
        ? {
          risk: "high",
          reason: approvalReason,
          agentRole: issue.ownerAgentRole ?? AgentRole.CEO,
          issueType: issue.type
        }
        : {
          agentRole: issue.ownerAgentRole ?? AgentRole.CEO,
          issueType: issue.type,
          ...(approvedApproval ? { approvalId: approvedApproval.id } : {})
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

function createDispatchActionId(
  issue: Issue,
  triggerEventId: string,
  kind: DispatchAction["kind"]
): string {
  const suffix = kind === "request_approval" ? "approval" : "run";
  return `dispatch-${issue.id}-${triggerEventId}-${suffix}`;
}

function findApprovedApproval(approvals: Approval[], issue: Issue, reason: string): Approval | null {
  return approvals.find((approval) =>
    approval.issueId === issue.id &&
    approval.reason === reason &&
    approval.status === "approved"
  ) ?? null;
}

function dependenciesAreDone(issue: Issue, relations: IssueRelation[], issueById: Map<string, Issue>): boolean {
  const dependencies = relations.filter(
    (relation) => relation.kind === "depends_on" && relation.sourceIssueId === issue.id
  );

  return dependencies.every((relation) => issueById.get(relation.targetIssueId)?.status === IssueStatus.Done);
}

function createDispatchIdempotencyKey(
  rootIssueId: string,
  issue: Issue,
  triggerEventId: string,
  kind: DispatchAction["kind"]
): string {
  const suffix = kind === "request_approval" ? "approval" : "run";
  return [rootIssueId, issue.id, issue.ownerAgentRole ?? "unassigned", triggerEventId, suffix].join(":");
}

function approvalReasonForIssue(issue: Issue): string | null {
  if (issue.type === IssueType.Database) {
    return "database_migration";
  }

  if (issue.type === IssueType.DevOps || issue.type === IssueType.Release) {
    return "provider_or_environment_change";
  }

  return null;
}
