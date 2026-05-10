import { AgentRole, createIssue, type Issue, IssueType } from "./domain.js";

export type RequirementComplexity = "small" | "medium" | "large";
export type RequirementArea = "frontend" | "backend" | "full_stack" | "devops" | "documentation";

export interface PlanIssueTreeInput {
  projectId: string;
  rootIssueId: string;
  title: string;
  description: string;
  complexity: RequirementComplexity;
  area: RequirementArea;
}

interface ChildTemplate {
  suffix: string;
  title: string;
  type: IssueType;
  ownerAgentRole: AgentRole;
  acceptanceCriteria: string[];
}

export function planIssueTree(input: PlanIssueTreeInput): Issue {
  const templates = chooseTemplates(input);
  const root = createIssue({
    id: input.rootIssueId,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    type: IssueType.Requirement,
    ownerAgentRole: AgentRole.CEO,
    acceptanceCriteria: [
      "Issue tree is complete",
      "Required gates have evidence",
      "Root issue status accurately reflects descendants"
    ]
  });

  return {
    ...root,
    children: templates.map((template, index) =>
      createIssue({
        id: `${input.rootIssueId}-${template.suffix}`,
        projectId: input.projectId,
        parentIssueId: input.rootIssueId,
        title: `${index + 1}. ${template.title}`,
        type: template.type,
        ownerAgentRole: template.ownerAgentRole,
        acceptanceCriteria: template.acceptanceCriteria
      })
    )
  };
}

function chooseTemplates(input: PlanIssueTreeInput): ChildTemplate[] {
  if (input.complexity === "small" && input.area === "frontend") {
    return [frontendTemplate(), reviewTemplate()];
  }

  if (input.area === "full_stack" || input.complexity === "large") {
    return [
      productTemplate(),
      technicalTemplate(),
      frontendTemplate(),
      backendTemplate(),
      reviewTemplate(),
      qaTemplate(),
      documentationTemplate()
    ];
  }

  if (input.area === "backend") {
    return [
      technicalTemplate(),
      backendTemplate(),
      reviewTemplate(),
      qaTemplate(),
      documentationTemplate()
    ];
  }

  if (input.area === "devops") {
    return [
      technicalTemplate(),
      devopsTemplate(),
      reviewTemplate(),
      qaTemplate(),
      documentationTemplate()
    ];
  }

  return [documentationTemplate(), reviewTemplate()];
}

function productTemplate(): ChildTemplate {
  return {
    suffix: "product",
    title: "Define product scope and acceptance criteria",
    type: IssueType.Product,
    ownerAgentRole: AgentRole.ProductManager,
    acceptanceCriteria: ["Scope, non-scope, and acceptance criteria are explicit"]
  };
}

function technicalTemplate(): ChildTemplate {
  return {
    suffix: "technical-plan",
    title: "Create technical plan",
    type: IssueType.TechnicalPlan,
    ownerAgentRole: AgentRole.CTO,
    acceptanceCriteria: ["Implementation boundaries and risks are documented"]
  };
}

function frontendTemplate(): ChildTemplate {
  return {
    suffix: "frontend",
    title: "Implement frontend changes",
    type: IssueType.Frontend,
    ownerAgentRole: AgentRole.FrontendDeveloper,
    acceptanceCriteria: ["Frontend behavior matches the requirement"]
  };
}

function backendTemplate(): ChildTemplate {
  return {
    suffix: "backend",
    title: "Implement backend changes",
    type: IssueType.Backend,
    ownerAgentRole: AgentRole.BackendDeveloper,
    acceptanceCriteria: ["Backend behavior matches the requirement"]
  };
}

function devopsTemplate(): ChildTemplate {
  return {
    suffix: "devops",
    title: "Implement infrastructure changes",
    type: IssueType.DevOps,
    ownerAgentRole: AgentRole.DevOps,
    acceptanceCriteria: ["Infrastructure changes are reproducible and documented"]
  };
}

function reviewTemplate(): ChildTemplate {
  return {
    suffix: "review",
    title: "Review implementation and evidence",
    type: IssueType.Review,
    ownerAgentRole: AgentRole.CodeReview,
    acceptanceCriteria: ["Review conclusion is pass, conditional pass, request changes, or blocked"]
  };
}

function qaTemplate(): ChildTemplate {
  return {
    suffix: "qa",
    title: "Validate acceptance criteria",
    type: IssueType.QA,
    ownerAgentRole: AgentRole.QA,
    acceptanceCriteria: ["QA report covers success and failure paths"]
  };
}

function documentationTemplate(): ChildTemplate {
  return {
    suffix: "docs",
    title: "Update delivery documentation",
    type: IssueType.Documentation,
    ownerAgentRole: AgentRole.Documentation,
    acceptanceCriteria: ["Wiki or delivery notes reference implementation evidence"]
  };
}
