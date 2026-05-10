import { type ProviderAdapter, type RuntimeAdapter } from "./adapters.js";
import { type Issue, IssueStatus } from "./domain.js";

export interface DispatchReadyIssuesInput {
  root: Issue;
  triggerEventId: string;
  runtime: RuntimeAdapter;
  provider: ProviderAdapter;
  previousDispatchKeys: Set<string>;
}

export interface DispatchedRun {
  runId: string;
  issueId: string;
  dispatchKey: string;
  summary: string;
}

export interface DispatchReadyIssuesResult {
  root: Issue;
  dispatchedRuns: DispatchedRun[];
  dispatchKeys: Set<string>;
}

export async function dispatchReadyIssues(
  input: DispatchReadyIssuesInput
): Promise<DispatchReadyIssuesResult> {
  const dispatchKeys = new Set(input.previousDispatchKeys);
  const dispatchedRuns: DispatchedRun[] = [];
  let didDispatch = false;

  const nextRoot = await mapIssueTree(input.root, async (issue) => {
    if (didDispatch || issue.id === input.root.id || issue.status !== IssueStatus.Todo) {
      return issue;
    }

    const dispatchKey = [
      input.root.id,
      issue.id,
      issue.ownerAgentRole ?? "unassigned",
      input.triggerEventId,
      "run"
    ].join(":");

    if (dispatchKeys.has(dispatchKey)) {
      return issue;
    }

    dispatchKeys.add(dispatchKey);
    didDispatch = true;

    const runId = `run-${issue.id}-${input.triggerEventId}`;
    const runResult = await input.runtime.startRun({
      runId,
      issue,
      workingDirectory: `/mock/workspaces/${input.root.id}`
    });

    const updatedIssue = {
      ...issue,
      status: IssueStatus.Done,
      evidence: [...issue.evidence, ...runResult.evidence],
      updatedAt: "2026-05-10T00:00:00.000Z"
    };

    await input.provider.syncIssue(updatedIssue);

    dispatchedRuns.push({
      runId,
      issueId: issue.id,
      dispatchKey,
      summary: runResult.summary
    });

    return updatedIssue;
  });

  return {
    root: nextRoot,
    dispatchedRuns,
    dispatchKeys
  };
}

export async function mapIssueTree(
  issue: Issue,
  mapper: (issue: Issue) => Promise<Issue>
): Promise<Issue> {
  const mapped = await mapper(issue);
  const children: Issue[] = [];

  for (const child of mapped.children) {
    children.push(await mapIssueTree(child, mapper));
  }

  return {
    ...mapped,
    children
  };
}
