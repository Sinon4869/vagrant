import {
  type AgentRun,
  type Evidence,
  type Issue,
  type NotificationItem,
  type Project,
  type RepositoryConfig
} from "./domain.js";

export interface WorkspaceStore {
  initialize(): Promise<void>;
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
  appendEvidence(evidence: Evidence[]): Promise<void>;
  hasDispatchKey(dispatchKey: string): Promise<boolean>;
  listDispatchKeys(): Promise<Set<string>>;
  addDispatchKey(dispatchKey: string): Promise<void>;
}
