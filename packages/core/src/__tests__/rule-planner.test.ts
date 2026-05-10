import { describe, expect, it } from "vitest";
import { AgentRole, IssueType } from "../domain.js";
import {
  planIssueRelations,
  planIssueTree,
  type PlanIssueTreeInput
} from "../rule-planner.js";

const baseInput = (
  overrides: Partial<PlanIssueTreeInput> = {}
): PlanIssueTreeInput => ({
  projectId: "project-1",
  rootIssueId: "root-1",
  title: "Plan requested work",
  description: "Create an issue tree for the requested work",
  complexity: "medium",
  area: "backend",
  ...overrides
});

describe("rule planner", () => {
  it("plans a simple UI change as developer and review", () => {
    const root = planIssueTree(baseInput({
      title: "Change the dashboard button label",
      description: "Update the primary button text on the dashboard",
      complexity: "small",
      area: "frontend"
    }));

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.Frontend,
      IssueType.Review
    ]);
    expect(root.children[0]?.ownerAgentRole).toBe(AgentRole.FrontendDeveloper);
    expect(root.children[1]?.ownerAgentRole).toBe(AgentRole.CodeReview);
  });

  it("plans a full-stack feature with product, technical, implementation, review, qa, and docs", () => {
    const root = planIssueTree(baseInput({
      rootIssueId: "root-2",
      title: "Add project wiki search",
      description: "Add searchable markdown wiki pages backed by indexed metadata",
      complexity: "large",
      area: "full_stack"
    }));

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

  it("plans a medium frontend change with frontend delivery gates", () => {
    const root = planIssueTree(baseInput({
      rootIssueId: "root-frontend-medium",
      complexity: "medium",
      area: "frontend"
    }));

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.Product,
      IssueType.Frontend,
      IssueType.Review,
      IssueType.QA,
      IssueType.Documentation
    ]);
  });

  it("plans a large devops change without frontend or backend work", () => {
    const root = planIssueTree(baseInput({
      rootIssueId: "root-devops-large",
      complexity: "large",
      area: "devops"
    }));

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.TechnicalPlan,
      IssueType.DevOps,
      IssueType.Review,
      IssueType.QA,
      IssueType.Documentation
    ]);
  });

  it("plans a backend change with technical planning and delivery gates", () => {
    const root = planIssueTree(baseInput({
      rootIssueId: "root-backend",
      complexity: "medium",
      area: "backend"
    }));

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.TechnicalPlan,
      IssueType.Backend,
      IssueType.Review,
      IssueType.QA,
      IssueType.Documentation
    ]);
  });

  it("plans a documentation change as documentation and review only", () => {
    const root = planIssueTree(baseInput({
      rootIssueId: "root-docs",
      complexity: "large",
      area: "documentation"
    }));

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.Documentation,
      IssueType.Review
    ]);
  });

  it("assigns deterministic child IDs and parent IDs", () => {
    const root = planIssueTree(baseInput({
      rootIssueId: "root-ids",
      complexity: "large",
      area: "full_stack"
    }));

    expect(root.children.map((issue) => issue.id)).toEqual([
      "root-ids-product",
      "root-ids-technical-plan",
      "root-ids-frontend",
      "root-ids-backend",
      "root-ids-review",
      "root-ids-qa",
      "root-ids-docs"
    ]);
    expect(root.children.every((issue) => issue.parentIssueId === "root-ids")).toBe(true);
  });

  it("uses identical timestamps for repeated calls with the same input", () => {
    const input = baseInput({
      rootIssueId: "root-timestamps",
      complexity: "medium",
      area: "backend"
    });

    const first = planIssueTree(input);
    const second = planIssueTree(input);

    expect(timestamps(first)).toEqual(timestamps(second));
  });

  it("plans executable dependencies for a full-stack delivery flow", () => {
    const root = planIssueTree(baseInput({
      rootIssueId: "root-dag",
      complexity: "large",
      area: "full_stack"
    }));

    const relations = planIssueRelations(root);

    expect(relations.map((relation) => [
      relation.sourceIssueId,
      relation.targetIssueId,
      relation.kind
    ])).toEqual([
      ["root-dag-technical-plan", "root-dag-product", "depends_on"],
      ["root-dag-frontend", "root-dag-technical-plan", "depends_on"],
      ["root-dag-backend", "root-dag-technical-plan", "depends_on"],
      ["root-dag-review", "root-dag-frontend", "depends_on"],
      ["root-dag-review", "root-dag-backend", "depends_on"],
      ["root-dag-qa", "root-dag-review", "depends_on"],
      ["root-dag-docs", "root-dag-qa", "depends_on"]
    ]);
  });
});

function timestamps(issue: ReturnType<typeof planIssueTree>): string[] {
  return [issue, ...issue.children].flatMap((item) => [
    item.createdAt,
    item.updatedAt
  ]);
}
