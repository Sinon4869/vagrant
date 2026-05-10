import { describe, expect, it } from "vitest";
import { createIssue, IssueStatus, IssueType } from "../domain.js";
import { aggregateIssueTree, flattenIssueTree } from "../issue-tree.js";

describe("issue tree", () => {
  it("flattens nested issue trees in depth-first order", () => {
    const root = createIssue({
      id: "root",
      projectId: "project-1",
      title: "Root",
      type: IssueType.Requirement,
      children: [
        createIssue({
          id: "child-a",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Child A",
          type: IssueType.Frontend,
          children: [
            createIssue({
              id: "grandchild-a",
              projectId: "project-1",
              parentIssueId: "child-a",
              title: "Grandchild A",
              type: IssueType.QA
            })
          ]
        }),
        createIssue({
          id: "child-b",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Child B",
          type: IssueType.Documentation
        })
      ]
    });

    expect(flattenIssueTree(root).map((issue) => issue.id)).toEqual([
      "root",
      "child-a",
      "grandchild-a",
      "child-b"
    ]);
  });

  it("aggregates root issue progress and status counts", () => {
    const root = createIssue({
      id: "root",
      projectId: "project-1",
      title: "Root",
      type: IssueType.Requirement,
      children: [
        createIssue({
          id: "frontend",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Frontend",
          type: IssueType.Frontend,
          status: IssueStatus.Done
        }),
        createIssue({
          id: "review",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Review",
          type: IssueType.Review,
          status: IssueStatus.InReview
        })
      ]
    });

    const summary = aggregateIssueTree(root);

    expect(summary.total).toBe(3);
    expect(summary.counts.done).toBe(1);
    expect(summary.counts.in_review).toBe(1);
    expect(summary.progress).toBe(33);
    expect(summary.aggregateStatus).toBe(IssueStatus.InReview);
  });

  it("marks a root tree blocked when any descendant is blocked", () => {
    const root = createIssue({
      id: "root",
      projectId: "project-1",
      title: "Root",
      type: IssueType.Requirement,
      children: [
        createIssue({
          id: "backend",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Backend",
          type: IssueType.Backend,
          status: IssueStatus.Blocked
        })
      ]
    });

    expect(aggregateIssueTree(root).aggregateStatus).toBe(IssueStatus.Blocked);
  });
});
