import { type Issue, IssueStatus } from "./domain.js";

export interface IssueTreeCounts {
  todo: number;
  in_progress: number;
  blocked: number;
  in_review: number;
  done: number;
  cancelled: number;
}

export interface IssueTreeSummary {
  rootIssueId: string;
  total: number;
  counts: IssueTreeCounts;
  progress: number;
  aggregateStatus: IssueStatus;
  blockedIssueIds: string[];
  activeIssueIds: string[];
}

export function flattenIssueTree(root: Issue): Issue[] {
  return [root, ...root.children.flatMap((child) => flattenIssueTree(child))];
}

export function aggregateIssueTree(root: Issue): IssueTreeSummary {
  const issues = flattenIssueTree(root);
  const counts: IssueTreeCounts = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    in_review: 0,
    done: 0,
    cancelled: 0
  };

  for (const issue of issues) {
    counts[issue.status] += 1;
  }

  const blockedIssueIds = issues
    .filter((issue) => issue.status === IssueStatus.Blocked)
    .map((issue) => issue.id);

  const activeIssueIds = issues
    .filter((issue) =>
      [IssueStatus.InProgress, IssueStatus.InReview, IssueStatus.Blocked].includes(issue.status)
    )
    .map((issue) => issue.id);

  const terminalCount = counts.done + counts.cancelled;
  const progress = issues.length === 0 ? 0 : Math.round((terminalCount / issues.length) * 100);

  return {
    rootIssueId: root.id,
    total: issues.length,
    counts,
    progress,
    aggregateStatus: chooseAggregateStatus(counts, issues.length),
    blockedIssueIds,
    activeIssueIds
  };
}

export function chooseAggregateStatus(counts: IssueTreeCounts, total: number): IssueStatus {
  if (counts.blocked > 0) return IssueStatus.Blocked;
  if (counts.in_review > 0) return IssueStatus.InReview;
  if (counts.in_progress > 0) return IssueStatus.InProgress;
  if (counts.done + counts.cancelled === total) return IssueStatus.Done;
  return IssueStatus.Todo;
}
