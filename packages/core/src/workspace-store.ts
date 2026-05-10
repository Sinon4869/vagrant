import {
  type AgentRun,
  type EmailOutboxItem,
  type Evidence,
  type Issue,
  type KnowledgePage,
  type NotificationItem,
  type Project,
  type RepositoryConfig
} from "./domain.js";

export interface WorkspaceStore {
  initialize(): Promise<void>;
  listProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  upsertProject(project: Project): Promise<void>;
  listRepositories(projectId: string): Promise<RepositoryConfig[]>;
  upsertRepository(repository: RepositoryConfig): Promise<void>;
  getRootIssue(rootIssueId: string): Promise<Issue | null>;
  listRootIssues(projectId: string): Promise<Issue[]>;
  upsertRootIssue(rootIssue: Issue): Promise<void>;
  listAgentRuns(rootIssueId: string): Promise<AgentRun[]>;
  listProjectAgentRuns(projectId: string): Promise<AgentRun[]>;
  upsertAgentRun(run: AgentRun): Promise<void>;
  listNotifications(projectId: string): Promise<NotificationItem[]>;
  upsertNotification(notification: NotificationItem): Promise<void>;
  listEmailOutbox(projectId: string): Promise<EmailOutboxItem[]>;
  upsertEmailOutboxItem(item: EmailOutboxItem): Promise<void>;
  hasEmailDedupeKey(dedupeKey: string): Promise<boolean>;
  listKnowledgePages(projectId: string): Promise<KnowledgePage[]>;
  upsertKnowledgePage(page: KnowledgePage): Promise<void>;
  appendEvidence(evidence: Evidence[]): Promise<void>;
  hasDispatchKey(dispatchKey: string): Promise<boolean>;
  listDispatchKeys(): Promise<Set<string>>;
  addDispatchKey(dispatchKey: string): Promise<void>;
}
