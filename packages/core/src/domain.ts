export enum IssueStatus {
  Todo = "todo",
  InProgress = "in_progress",
  Blocked = "blocked",
  InReview = "in_review",
  Done = "done",
  Cancelled = "cancelled"
}

export enum GateConclusion {
  Pass = "pass",
  ConditionalPass = "conditional_pass",
  RequestChanges = "request_changes",
  Blocked = "blocked",
  Fail = "fail"
}

export enum AgentRole {
  CEO = "ceo",
  CTO = "cto",
  ProductManager = "product_manager",
  UxUi = "ux_ui",
  EngineeringLead = "engineering_lead",
  FrontendDeveloper = "frontend_developer",
  BackendDeveloper = "backend_developer",
  Database = "database",
  DevOps = "devops",
  CodeReview = "code_review",
  QA = "qa",
  Documentation = "documentation",
  ReleaseManager = "release_manager"
}

export enum IssueType {
  Requirement = "requirement",
  Product = "product",
  Design = "design",
  TechnicalPlan = "technical_plan",
  Frontend = "frontend",
  Backend = "backend",
  Database = "database",
  DevOps = "devops",
  Review = "review",
  QA = "qa",
  Release = "release",
  Documentation = "documentation",
  ProjectManagement = "project_management"
}

export type EvidenceKind =
  | "branch"
  | "commit"
  | "pull_request"
  | "diff"
  | "test_log"
  | "screenshot"
  | "running_url"
  | "review_conclusion"
  | "qa_report"
  | "release_conclusion"
  | "documentation_path";

export interface Evidence {
  id: string;
  issueId: string;
  kind: EvidenceKind;
  title: string;
  url: string | null;
  body: string;
  createdAt: string;
}

export interface Blocker {
  id: string;
  issueId: string;
  ownerAgentRole: AgentRole | null;
  reason: string;
  unblockCondition: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Issue {
  id: string;
  projectId: string;
  parentIssueId: string | null;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  ownerAgentRole: AgentRole | null;
  acceptanceCriteria: string[];
  evidenceRequirements: EvidenceKind[];
  children: Issue[];
  blockers: Blocker[];
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueInput {
  id: string;
  projectId: string;
  title: string;
  type: IssueType | `${IssueType}`;
  parentIssueId?: string | null;
  description?: string;
  status?: IssueStatus;
  ownerAgentRole?: AgentRole | null;
  acceptanceCriteria?: string[];
  evidenceRequirements?: EvidenceKind[];
  children?: Issue[];
  blockers?: Blocker[];
  evidence?: Evidence[];
  now?: string;
}

export function createIssue(input: CreateIssueInput): Issue {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    parentIssueId: input.parentIssueId ?? null,
    title: input.title,
    description: input.description ?? "",
    type: input.type as IssueType,
    status: input.status ?? IssueStatus.Todo,
    ownerAgentRole: input.ownerAgentRole ?? null,
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    evidenceRequirements: input.evidenceRequirements ?? [],
    children: input.children ?? [],
    blockers: input.blockers ?? [],
    evidence: input.evidence ?? [],
    createdAt: now,
    updatedAt: now
  };
}
