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

export type RepositoryProviderType =
  | "generic_git"
  | "github"
  | "gitlab"
  | "gitea"
  | "bitbucket"
  | "local_only";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  id: string;
  name: string;
  description?: string;
  now?: string;
}

export function createProject(input: CreateProjectInput): Project {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    name: input.name,
    description: input.description ?? "",
    createdAt: now,
    updatedAt: now
  };
}

export interface RepositoryConfig {
  id: string;
  projectId: string;
  name: string;
  localPath: string;
  remoteUrl: string | null;
  providerType: RepositoryProviderType;
  defaultBaseBranch: string;
  credentialProfile: string | null;
  branchNamePrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryConfigInput {
  id: string;
  projectId: string;
  name: string;
  localPath: string;
  remoteUrl?: string | null;
  providerType?: RepositoryProviderType;
  defaultBaseBranch?: string;
  credentialProfile?: string | null;
  branchNamePrefix?: string;
  now?: string;
}

export function createRepositoryConfig(input: CreateRepositoryConfigInput): RepositoryConfig {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    name: input.name,
    localPath: input.localPath,
    remoteUrl: input.remoteUrl ?? null,
    providerType: input.providerType ?? "generic_git",
    defaultBaseBranch: input.defaultBaseBranch ?? "main",
    credentialProfile: input.credentialProfile ?? null,
    branchNamePrefix: input.branchNamePrefix ?? "vagrant",
    createdAt: now,
    updatedAt: now
  };
}

export enum RuntimeKind {
  Mock = "mock",
  CodexCli = "codex_cli",
  ClaudeCli = "claude_cli"
}

export type AgentRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface AgentRunLogEntry {
  stream: "stdout" | "stderr" | "system";
  body: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  projectId: string;
  issueId: string;
  agentRole: AgentRole;
  runtimeKind: RuntimeKind;
  status: AgentRunStatus;
  workingDirectory: string;
  prompt: string;
  summary: string;
  logs: AgentRunLogEntry[];
  evidenceIds: string[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | "approval_required"
  | "blocked"
  | "failed_after_retry"
  | "root_issue_completed"
  | "digest";

export type NotificationSeverity = "normal" | "high";

export type NotificationDelivery = "inbox" | "digest" | "immediate_email";

export interface NotificationItem {
  id: string;
  projectId: string;
  rootIssueId: string | null;
  issueId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  severity: NotificationSeverity;
  delivery: NotificationDelivery;
  dedupeKey: string;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationItemInput {
  id: string;
  projectId: string;
  type: NotificationType;
  title: string;
  dedupeKey: string;
  rootIssueId?: string | null;
  issueId?: string | null;
  body?: string;
  severity?: NotificationSeverity;
  delivery?: NotificationDelivery;
  emailSentAt?: string | null;
  now?: string;
}

export function createNotificationItem(input: CreateNotificationItemInput): NotificationItem {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    rootIssueId: input.rootIssueId ?? null,
    issueId: input.issueId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    severity: input.severity ?? "normal",
    delivery: input.delivery ?? "digest",
    dedupeKey: input.dedupeKey,
    emailSentAt: input.emailSentAt ?? null,
    createdAt: now,
    updatedAt: now
  };
}

export type EmailOutboxDelivery = "immediate" | "digest";
export type EmailOutboxStatus = "queued" | "sent" | "failed" | "cancelled";

export interface EmailOutboxItem {
  id: string;
  projectId: string;
  notificationIds: string[];
  subject: string;
  body: string;
  delivery: EmailOutboxDelivery;
  status: EmailOutboxStatus;
  dedupeKey: string;
  scheduledFor: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailOutboxItemInput {
  id: string;
  projectId: string;
  notificationIds: string[];
  subject: string;
  body: string;
  delivery: EmailOutboxDelivery;
  dedupeKey: string;
  scheduledFor?: string;
  status?: EmailOutboxStatus;
  sentAt?: string | null;
  now?: string;
}

export function createEmailOutboxItem(input: CreateEmailOutboxItemInput): EmailOutboxItem {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    notificationIds: input.notificationIds,
    subject: input.subject,
    body: input.body,
    delivery: input.delivery,
    status: input.status ?? "queued",
    dedupeKey: input.dedupeKey,
    scheduledFor: input.scheduledFor ?? now,
    sentAt: input.sentAt ?? null,
    createdAt: now,
    updatedAt: now
  };
}

export interface KnowledgePage {
  id: string;
  projectId: string;
  title: string;
  body: string;
  tags: string[];
  linkedRequirementIds: string[];
  linkedRepositoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgePageInput {
  id: string;
  projectId: string;
  title: string;
  body?: string;
  tags?: string[];
  linkedRequirementIds?: string[];
  linkedRepositoryIds?: string[];
  now?: string;
}

export function createKnowledgePage(input: CreateKnowledgePageInput): KnowledgePage {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    title: input.title,
    body: input.body ?? "",
    tags: input.tags ?? [],
    linkedRequirementIds: input.linkedRequirementIds ?? [],
    linkedRepositoryIds: input.linkedRepositoryIds ?? [],
    createdAt: now,
    updatedAt: now
  };
}

export interface CreateAgentRunInput {
  id: string;
  projectId: string;
  issueId: string;
  agentRole: AgentRole;
  runtimeKind: RuntimeKind;
  workingDirectory: string;
  prompt: string;
  now?: string;
}

export function createAgentRun(input: CreateAgentRunInput): AgentRun {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    issueId: input.issueId,
    agentRole: input.agentRole,
    runtimeKind: input.runtimeKind,
    status: "queued",
    workingDirectory: input.workingDirectory,
    prompt: input.prompt,
    summary: "",
    logs: [],
    evidenceIds: [],
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now
  };
}
