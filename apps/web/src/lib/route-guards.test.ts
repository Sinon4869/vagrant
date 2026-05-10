import { describe, expect, it } from "vitest";
import { IssueType, createIssue } from "@vagrant/core";
import { assertRootIssueProject, createUniqueRootIssueId } from "./route-guards";

describe("route guards", () => {
  it("rejects dispatching a root issue through the wrong project", () => {
    const rootIssue = createIssue({
      id: "issue-1",
      projectId: "project-a",
      title: "Build settings",
      type: IssueType.Requirement,
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(() => assertRootIssueProject(rootIssue, "project-b")).toThrow(
      "Root issue issue-1 does not belong to project project-b"
    );
  });

  it("allocates a unique requirement id instead of overwriting same-title requirements", () => {
    expect(createUniqueRootIssueId("Build Settings", new Set([
      "issue-build-settings",
      "issue-build-settings-2"
    ]))).toBe("issue-build-settings-3");
  });
});
