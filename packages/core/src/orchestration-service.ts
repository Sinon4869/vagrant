import { planReadyActions } from "./action-planner.js";
import { type ProviderAdapter, type RuntimeAdapter } from "./adapters.js";
import {
  AgentRole,
  type AgentRun,
  type Approval,
  type DispatchAction,
  type Issue,
  IssueStatus,
  RuntimeKind,
  createAgentRun
} from "./domain.js";
import { mapIssueTree } from "./dispatcher.js";
import { type WorkspaceStore } from "./workspace-store.js";

export interface ScanReadyDispatchActionsInput {
  store: WorkspaceStore;
  rootIssueId: string;
  triggerEventId: string;
  now?: string;
  plannedActions?: DispatchAction[];
}

export interface ScanReadyDispatchActionsResult {
  actions: DispatchAction[];
  approvals: Approval[];
}

export interface ExecuteDispatchActionInput {
  store: WorkspaceStore;
  rootIssueId: string;
  actionId: string;
  runtimeKind: RuntimeKind;
  runtime: RuntimeAdapter;
  provider: ProviderAdapter;
  workingDirectory: string;
  now?: string;
}

export interface ExecuteDispatchActionResult {
  action: DispatchAction;
  run: AgentRun | null;
}

export async function scanReadyDispatchActions(
  input: ScanReadyDispatchActionsInput
): Promise<ScanReadyDispatchActionsResult> {
  const root = await input.store.getRootIssue(input.rootIssueId);
  const relations = root ? await input.store.listIssueRelations(root.id) : [];
  const approvals = root ? await input.store.listApprovals(root.projectId) : [];
  const previousDispatchKeys = await input.store.listDispatchKeys();
  const existingActions = await input.store.listDispatchActions(input.rootIssueId);
  const reconciledExistingActions = await reconcileApprovalActions(input.store, existingActions, approvals);
  const resumableActions = existingActions.filter(
    (action) =>
      (action.status === "pending" || action.status === "running") &&
      (action.kind !== "request_approval" || !approvalIsDecidedForAction(approvals, action))
  );
  if (!input.plannedActions && resumableActions.length > 0) {
    return {
      actions: resumableActions,
      approvals: []
    };
  }
  const actions = input.plannedActions ?? (root
    ? planReadyActions({
      root,
      relations,
      approvals,
      previousDispatchKeys: new Set([
        ...previousDispatchKeys,
        ...reconciledExistingActions
          .filter((action) => action.kind === "request_approval" && approvalIsApprovedForAction(approvals, action))
          .map((action) => action.idempotencyKey)
      ]),
      triggerEventId: input.triggerEventId,
      ...(input.now ? { now: input.now } : {})
    }).actions
    : []);
  const createdApprovals: Approval[] = [];

  for (const action of actions) {
    await input.store.upsertDispatchAction(action);
    await input.store.addDispatchKey(action.idempotencyKey);

    if (action.kind === "request_approval") {
      const approval = createApprovalFromAction(action, input.now);
      await input.store.upsertApproval(approval);
      createdApprovals.push(approval);
    }
  }

  return {
    actions,
    approvals: createdApprovals
  };
}

async function reconcileApprovalActions(
  store: WorkspaceStore,
  actions: DispatchAction[],
  approvals: Approval[]
): Promise<DispatchAction[]> {
  const reconciled: DispatchAction[] = [];

  for (const action of actions) {
    if (action.kind !== "request_approval" || action.status !== "pending") {
      reconciled.push(action);
      continue;
    }

    const approval = approvals.find((item) => item.dispatchActionId === action.id);

    if (!approval || approval.status === "pending") {
      reconciled.push(action);
      continue;
    }

    const updatedAction = {
      ...action,
      status: approval.status === "approved" ? "succeeded" as const : "cancelled" as const,
      updatedAt: approval.updatedAt
    };
    await store.upsertDispatchAction(updatedAction);
    reconciled.push(updatedAction);
  }

  return reconciled;
}

function approvalIsDecidedForAction(approvals: Approval[], action: DispatchAction): boolean {
  return approvals.some((approval) =>
    approval.dispatchActionId === action.id &&
    (approval.status === "approved" || approval.status === "rejected")
  );
}

function approvalIsApprovedForAction(approvals: Approval[], action: DispatchAction): boolean {
  return approvals.some((approval) =>
    approval.dispatchActionId === action.id &&
    approval.status === "approved"
  );
}

export async function executeDispatchAction(
  input: ExecuteDispatchActionInput
): Promise<ExecuteDispatchActionResult> {
  const now = input.now ?? new Date().toISOString();
  const root = await input.store.getRootIssue(input.rootIssueId);

  if (!root) {
    throw new Error(`Root issue not found: ${input.rootIssueId}`);
  }

  const action = (await input.store.listDispatchActions(root.id)).find((item) => item.id === input.actionId);

  if (!action) {
    throw new Error(`Dispatch action not found: ${input.actionId}`);
  }

  if (action.kind !== "start_agent_run") {
    return {
      action,
      run: null
    };
  }

  if (action.status !== "pending") {
    return {
      action,
      run: null
    };
  }

  const issue = findIssueById(root, action.issueId);

  if (!issue) {
    throw new Error(`Issue not found for dispatch action: ${action.issueId}`);
  }

  const runningAction = {
    ...action,
    status: "running" as const,
    updatedAt: now
  };
  await input.store.upsertDispatchAction(runningAction);

  const run = createAgentRun({
    id: `run-${action.issueId}-${action.createdAt.replace(/[^0-9A-Za-z]/g, "")}`,
    projectId: root.projectId,
    issueId: issue.id,
    agentRole: isAgentRole(action.payload.agentRole) ? action.payload.agentRole : issue.ownerAgentRole ?? AgentRole.EngineeringLead,
    runtimeKind: input.runtimeKind,
    workingDirectory: input.workingDirectory,
    prompt: `Issue: ${issue.title}`,
    now
  });

  try {
    const runtimeResult = await input.runtime.startRun({
      runId: run.id,
      issue,
      workingDirectory: input.workingDirectory
    });
    const succeededRun: AgentRun = {
      ...run,
      status: "succeeded",
      summary: runtimeResult.summary,
      logs: [
        ...run.logs,
        {
          stream: "system",
          body: runtimeResult.summary,
          createdAt: now
        }
      ],
      evidenceIds: runtimeResult.evidence.map((evidence) => evidence.id),
      startedAt: now,
      completedAt: now,
      updatedAt: now
    };
    const updatedRoot = await mapIssueTree(root, async (candidate) => {
      if (candidate.id !== issue.id) {
        return candidate;
      }

      return {
        ...candidate,
        status: IssueStatus.Done,
        evidence: [...candidate.evidence, ...runtimeResult.evidence],
        updatedAt: now
      };
    });
    const updatedIssue = findIssueById(updatedRoot, issue.id);
    await input.store.upsertRootIssue(updatedRoot);
    await input.store.appendEvidence(runtimeResult.evidence);
    await input.store.upsertAgentRun(succeededRun);

    if (updatedIssue) {
      await input.provider.syncIssue(updatedIssue);
    }

    const succeededAction = {
      ...runningAction,
      status: "succeeded" as const,
      updatedAt: now
    };
    await input.store.upsertDispatchAction(succeededAction);

    return {
      action: succeededAction,
      run: succeededRun
    };
  } catch (error) {
    const failedRun: AgentRun = {
      ...run,
      status: "failed",
      summary: error instanceof Error ? error.message : "Runtime failed",
      startedAt: now,
      completedAt: now,
      updatedAt: now
    };
    const failedAction = {
      ...runningAction,
      status: "failed" as const,
      updatedAt: now
    };
    await input.store.upsertAgentRun(failedRun);
    await input.store.upsertDispatchAction(failedAction);

    return {
      action: failedAction,
      run: failedRun
    };
  }
}

function createApprovalFromAction(action: DispatchAction, now = new Date().toISOString()): Approval {
  return {
    id: `approval-${action.id}`,
    projectId: action.projectId,
    rootIssueId: action.rootIssueId,
    issueId: action.issueId,
    dispatchActionId: action.id,
    status: "pending",
    risk: action.payload.risk === "critical" || action.payload.risk === "medium"
      ? action.payload.risk
      : "high",
    reason: typeof action.payload.reason === "string" ? action.payload.reason : "manual_approval_required",
    requestedBy: isAgentRole(action.payload.agentRole) ? action.payload.agentRole : null,
    decidedBy: null,
    decisionNote: null,
    createdAt: now,
    updatedAt: now,
    decidedAt: null
  };
}

function findIssueById(issue: Issue, issueId: string | null): Issue | null {
  if (!issueId) {
    return null;
  }

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

function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && Object.values(AgentRole).includes(value as AgentRole);
}
