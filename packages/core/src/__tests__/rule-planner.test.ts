import { describe, expect, it } from "vitest";
import { AgentRole, IssueType } from "../domain.js";
import { planIssueTree } from "../rule-planner.js";

describe("rule planner", () => {
  it("plans a simple UI change as developer and review", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change the dashboard button label",
      description: "Update the primary button text on the dashboard",
      complexity: "small",
      area: "frontend"
    });

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.Frontend,
      IssueType.Review
    ]);
    expect(root.children[0]?.ownerAgentRole).toBe(AgentRole.FrontendDeveloper);
    expect(root.children[1]?.ownerAgentRole).toBe(AgentRole.CodeReview);
  });

  it("plans a full-stack feature with product, technical, implementation, review, qa, and docs", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-2",
      title: "Add project wiki search",
      description: "Add searchable markdown wiki pages backed by indexed metadata",
      complexity: "large",
      area: "full_stack"
    });

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.Product,
      IssueType.TechnicalPlan,
      IssueType.Frontend,
      IssueType.Backend,
      IssueType.Review,
      IssueType.QA,
      IssueType.Documentation
    ]);
  });
});
