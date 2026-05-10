import { describe, expect, it } from "vitest";
import { createIssue, IssueStatus } from "../domain";

describe("domain", () => {
  it("creates an issue with default todo status", () => {
    const issue = createIssue({
      id: "issue-root",
      projectId: "project-1",
      title: "Build wiki",
      type: "requirement"
    });

    expect(issue.status).toBe(IssueStatus.Todo);
    expect(issue.parentIssueId).toBeNull();
    expect(issue.children).toEqual([]);
  });
});
