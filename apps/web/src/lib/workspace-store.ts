import "server-only";

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  aggregateIssueTree,
  flattenIssueTree,
  type AgentRun,
  type AgentRunStatus,
  AgentRole,
  RuntimeKind,
  IssueStatus,
  type Issue,
  type KnowledgePage,
  type NotificationItem,
  type Project,
  type RepositoryConfig,
  type RepositoryProviderType,
  createEmailOutboxItem,
  createPersistedDemoState,
  planEmailNotifications,
  sendQueuedEmailOutbox,
  type EmailTransportKind
} from "@vagrant/core";
import { LocalStore, PostgresStore, type WorkspaceStore } from "@vagrant/core/node";

export const DEFAULT_PROJECT_ID = "project-vagrant";
export const DEFAULT_REPOSITORY_ID = "repo-vagrant";

export interface RepositoryRow {
  id: string;
  name: string;
  provider: string;
  providerType: RepositoryProviderType;
  remoteUrl: string | null;
  localPath: string;
  baseBranch: string;
  linkedRequirements: number;
  health: string;
}

export interface RepositoryWorkspaceView {
  project: {
    id: string;
    name: string;
    description: string;
    defaultRuntimeKind: RuntimeKind;
  };
  repositories: RepositoryRow[];
}

export interface RequirementRow {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: Issue["status"];
  progress: number;
  subissues: number;
  repositoryIds: string[];
  knowledgeIds: string[];
  updatedAt: string;
}

export interface RequirementsWorkspaceView {
  project: {
    id: string;
    name: string;
  };
  requirements: RequirementRow[];
  repositories: RepositoryRow[];
}

export interface RunRow {
  id: string;
  issueId: string;
  rootIssueId: string;
  issue: string;
  agent: string;
  runtime: string;
  repository: string;
  status: AgentRun["status"];
  evidence: string;
  updatedAt: string;
}

export interface RunsWorkspaceView {
  project: {
    id: string;
    name: string;
  };
  requirements: RequirementRow[];
  repositories: RepositoryRow[];
  runs: RunRow[];
}

export interface InboxRow {
  id: string;
  type: string;
  title: string;
  target: string;
  severity: "High" | "Normal";
  delivery: string;
  updatedAt: string;
}

export interface EmailOutboxRow {
  id: string;
  subject: string;
  delivery: "Immediate" | "Digest";
  notifications: number;
  dedupeKey: string;
  status: string;
  sentAt: string | null;
}

export interface InboxWorkspaceView {
  project: {
    id: string;
    name: string;
  };
  inbox: InboxRow[];
  emailOutbox: EmailOutboxRow[];
}

export interface ProjectRow {
  id: string;
  name: string;
  description: string;
  status: string;
  requirements: number;
  repositories: number;
  agents: number;
  progress: number;
  updatedAt: string;
}

export interface ProjectsWorkspaceView {
  projects: ProjectRow[];
}

export interface KnowledgePageRow {
  id: string;
  title: string;
  tags: string[];
  linkedRequirements: string[];
  linkedRepositories: string[];
  updatedAt: string;
}

export interface KnowledgeWorkspaceView {
  project: {
    id: string;
    name: string;
  };
  knowledgePages: KnowledgePageRow[];
  requirements: RequirementRow[];
  repositories: RepositoryRow[];
}

export interface CockpitRequirementRow extends RequirementRow {
  blocked: number;
  activeRuns: number;
  evidence: number;
  latestRun: RunRow | null;
}

export interface CockpitAttentionItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  owner: string;
  source: string;
  action: string;
  href: string;
}

export interface CockpitEvidenceRow {
  id: string;
  title: string;
  kind: string;
  issue: string;
  createdAt: string;
  href: string | null;
}

export interface ProjectHealthItem {
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
}

export interface CockpitWorkspaceView {
  project: {
    id: string;
    name: string;
    description: string;
  };
  health: ProjectHealthItem[];
  requirements: CockpitRequirementRow[];
  attention: CockpitAttentionItem[];
  runs: RunRow[];
  evidence: CockpitEvidenceRow[];
  summary: {
    requirements: number;
    activeRuns: number;
    blockedIssues: number;
    pendingNotifications: number;
    repositories: number;
  };
}

export function getRuntimeDir(): string {
  return process.env.VAGRANT_RUNTIME_DIR ?? join(process.cwd(), ".vagrant", "runtime");
}

export function resolveProjectId(projectId?: string | null): string {
  return projectId && projectId.trim().length > 0 ? projectId.trim() : DEFAULT_PROJECT_ID;
}

export async function getWorkspaceStore(): Promise<WorkspaceStore> {
  if (process.env.VAGRANT_STORAGE === "postgres" || process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required when VAGRANT_STORAGE=postgres");
    }

    const store = new PostgresStore({ connectionString });
    await store.initialize();
    await ensureDefaultWorkspace(store);
    return store;
  }

  const runtimeDir = getRuntimeDir();
  await mkdir(runtimeDir, { recursive: true });
  const store = new LocalStore({ runtimeDir });
  await store.initialize();
  await ensureDefaultWorkspace(store);
  return store;
}

export async function getRepositoryWorkspaceView(projectId = DEFAULT_PROJECT_ID): Promise<RepositoryWorkspaceView> {
  const store = await getWorkspaceStore();
  const resolvedProjectId = resolveProjectId(projectId);
  const project = await store.getProject(resolvedProjectId);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${resolvedProjectId}`);
  }

  const rootIssues = await store.listRootIssues(project.id);
  const repositories = await store.listRepositories(project.id);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      defaultRuntimeKind: RuntimeKind.CodexCli
    },
    repositories: repositories.map((repository) => toRepositoryRow(repository, rootIssues.length))
  };
}

export async function getRequirementsWorkspaceView(projectId = DEFAULT_PROJECT_ID): Promise<RequirementsWorkspaceView> {
  const store = await getWorkspaceStore();
  const resolvedProjectId = resolveProjectId(projectId);
  const project = await store.getProject(resolvedProjectId);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${resolvedProjectId}`);
  }

  const repositories = await store.listRepositories(project.id);
  const rootIssues = await store.listRootIssues(project.id);

  return {
    project: {
      id: project.id,
      name: project.name
    },
    requirements: rootIssues.map((issue) => toRequirementRow(issue, repositories)),
    repositories: repositories.map((repository) => toRepositoryRow(repository, rootIssues.length))
  };
}

export async function getPersistedRootIssue(issueId: string): Promise<Issue | null> {
  const store = await getWorkspaceStore();
  return store.getRootIssue(issueId);
}

export async function getRunsWorkspaceView(projectId = DEFAULT_PROJECT_ID): Promise<RunsWorkspaceView> {
  const store = await getWorkspaceStore();
  const resolvedProjectId = resolveProjectId(projectId);
  const project = await store.getProject(resolvedProjectId);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${resolvedProjectId}`);
  }

  const repositories = await store.listRepositories(project.id);
  const rootIssues = await store.listRootIssues(project.id);
  const runs = await store.listProjectAgentRuns(project.id);

  return {
    project: {
      id: project.id,
      name: project.name
    },
    requirements: rootIssues.map((issue) => toRequirementRow(issue, repositories)),
    repositories: repositories.map((repository) => toRepositoryRow(repository, rootIssues.length)),
    runs: runs.map((run) => toRunRow(run, rootIssues, repositories))
  };
}

export async function getInboxWorkspaceView(projectId = DEFAULT_PROJECT_ID): Promise<InboxWorkspaceView> {
  const store = await getWorkspaceStore();
  const resolvedProjectId = resolveProjectId(projectId);
  const project = await store.getProject(resolvedProjectId);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${resolvedProjectId}`);
  }

  const rootIssues = await store.listRootIssues(project.id);
  const notifications = await store.listNotifications(project.id);
  const existingOutbox = await store.listEmailOutbox(project.id);
  const emailPlans = planEmailNotifications({
    projectId: project.id,
    notifications,
    sentDedupeKeys: new Set(existingOutbox.map((item) => item.dedupeKey)),
    now: new Date().toISOString()
  });
  const plannedOutbox = emailPlans.map((plan) => createEmailOutboxItem({
    id: plan.id,
    projectId: plan.projectId,
    notificationIds: plan.notificationIds,
    subject: plan.subject,
    body: plan.body,
    delivery: plan.delivery,
    dedupeKey: plan.dedupeKey
  }));

  for (const item of plannedOutbox) {
    await store.upsertEmailOutboxItem(item);
  }

  const emailOutbox = [...plannedOutbox, ...existingOutbox];

  return {
    project: {
      id: project.id,
      name: project.name
    },
    inbox: notifications.map((notification) => toInboxRow(notification, rootIssues)),
    emailOutbox: emailOutbox.map((item) => ({
      id: item.id,
      subject: item.subject,
      delivery: item.delivery === "immediate" ? "Immediate" : "Digest",
      notifications: item.notificationIds.length,
      dedupeKey: item.dedupeKey,
      status: item.status,
      sentAt: item.sentAt ? formatDateTime(item.sentAt) : null
    }))
  };
}

export async function sendProjectEmailOutbox(projectId = DEFAULT_PROJECT_ID): Promise<void> {
  const store = await getWorkspaceStore();
  const resolvedProjectId = resolveProjectId(projectId);
  const project = await store.getProject(resolvedProjectId);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${resolvedProjectId}`);
  }

  await sendQueuedEmailOutbox({
    store,
    projectId: project.id,
    transport: resolveEmailTransport()
  });
}

export async function getProjectsWorkspaceView(): Promise<ProjectsWorkspaceView> {
  const store = await getWorkspaceStore();
  const projects = await store.listProjects();
  const rows = await Promise.all(
    projects.map(async (project) => {
      const repositories = await store.listRepositories(project.id);
      const rootIssues = await store.listRootIssues(project.id);
      return toProjectRow(project, rootIssues, repositories);
    })
  );

  return {
    projects: rows
  };
}

export async function getKnowledgeWorkspaceView(projectId = DEFAULT_PROJECT_ID): Promise<KnowledgeWorkspaceView> {
  const store = await getWorkspaceStore();
  const resolvedProjectId = resolveProjectId(projectId);
  const project = await store.getProject(resolvedProjectId);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${resolvedProjectId}`);
  }

  const repositories = await store.listRepositories(project.id);
  const rootIssues = await store.listRootIssues(project.id);
  const knowledgePages = await store.listKnowledgePages(project.id);

  return {
    project: {
      id: project.id,
      name: project.name
    },
    knowledgePages: knowledgePages.map(toKnowledgePageRow),
    requirements: rootIssues.map((issue) => toRequirementRow(issue, repositories)),
    repositories: repositories.map((repository) => toRepositoryRow(repository, rootIssues.length))
  };
}

export async function getCockpitWorkspaceView(projectId = DEFAULT_PROJECT_ID): Promise<CockpitWorkspaceView> {
  const store = await getWorkspaceStore();
  const resolvedProjectId = resolveProjectId(projectId);
  const project = await store.getProject(resolvedProjectId);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${resolvedProjectId}`);
  }

  const repositories = await store.listRepositories(project.id);
  const rootIssues = await store.listRootIssues(project.id);
  const runs = await store.listProjectAgentRuns(project.id);
  const notifications = await store.listNotifications(project.id);
  const rootRows = rootIssues.map((issue) => toCockpitRequirementRow(issue, repositories, runs));
  const runRows = runs.map((run) => toRunRow(run, rootIssues, repositories));
  const activeRuns = runs.filter((run) => isActiveRunStatus(run.status)).length;
  const blockedIssues = rootIssues.reduce((total, issue) => total + countIssuesByStatus(issue, IssueStatus.Blocked), 0);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description
    },
    health: [
      {
        label: "Storage",
        value: process.env.VAGRANT_STORAGE === "postgres" || process.env.DATABASE_URL ? "PostgreSQL" : "Local JSON",
        status: process.env.VAGRANT_STORAGE === "postgres" || process.env.DATABASE_URL ? "healthy" : "warning"
      },
      {
        label: "Runtime",
        value: runtimeLabel(RuntimeKind.CodexCli),
        status: "healthy"
      },
      {
        label: "Repositories",
        value: repositories.length > 0 ? `${repositories.length} configured` : "Missing",
        status: repositories.length > 0 ? "healthy" : "critical"
      },
      {
        label: "Attention",
        value: notifications.length > 0 ? `${notifications.length} pending` : "Clear",
        status: notifications.some((notification) => notification.severity === "high") ? "critical" : notifications.length > 0 ? "warning" : "healthy"
      }
    ],
    requirements: rootRows,
    attention: buildCockpitAttention(rootIssues, notifications),
    runs: runRows.slice(0, 6),
    evidence: buildRecentEvidence(rootIssues).slice(0, 8),
    summary: {
      requirements: rootIssues.length,
      activeRuns,
      blockedIssues,
      pendingNotifications: notifications.length,
      repositories: repositories.length
    }
  };
}

async function ensureDefaultWorkspace(store: WorkspaceStore): Promise<void> {
  const seed = createPersistedDemoState({
    repositoryLocalPath: process.cwd(),
    repositoryRemoteUrl: "https://github.com/Sinon4869/vagrant"
  });
  const existingProject = await store.getProject(DEFAULT_PROJECT_ID);

  if (existingProject) {
    const repositories = await store.listRepositories(DEFAULT_PROJECT_ID);
    const rootIssue = await store.getRootIssue(seed.rootIssue.id);
    const notifications = await store.listNotifications(DEFAULT_PROJECT_ID);
    const knowledgePages = await store.listKnowledgePages(DEFAULT_PROJECT_ID);

    if (repositories.length === 0) {
      await store.upsertRepository(seed.repository);
    }

    if (!rootIssue) {
      await store.upsertRootIssue(seed.rootIssue);
    }

    if (!notifications.some((notification) => notification.id === seed.notification.id)) {
      await store.upsertNotification(seed.notification);
    }

    for (const page of seed.knowledgePages) {
      if (!knowledgePages.some((existing) => existing.id === page.id)) {
        await store.upsertKnowledgePage(page);
      }
    }

    return;
  }

  await store.upsertProject(seed.project);
  await store.upsertRepository(seed.repository);
  await store.upsertRootIssue(seed.rootIssue);
  await store.upsertNotification(seed.notification);
  for (const page of seed.knowledgePages) {
    await store.upsertKnowledgePage(page);
  }
}

function toRepositoryRow(repository: RepositoryConfig, linkedRequirements: number): RepositoryRow {
  return {
    id: repository.id,
    name: repository.name,
    provider: providerLabel(repository.providerType),
    providerType: repository.providerType,
    remoteUrl: repository.remoteUrl,
    localPath: repository.localPath,
    baseBranch: repository.defaultBaseBranch,
    linkedRequirements,
    health: repository.remoteUrl ? "Configured" : "Local"
  };
}

function toRequirementRow(issue: Issue, repositories: RepositoryConfig[]): RequirementRow {
  const summary = aggregateIssueTree(issue);

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    owner: issue.ownerAgentRole ?? "unassigned",
    status: summary.aggregateStatus,
    progress: summary.progress,
    subissues: Math.max(summary.total - 1, 0),
    repositoryIds: repositories.slice(0, 1).map((repository) => repository.id),
    knowledgeIds: issue.id === "issue-vagrant-knowledge" ? ["wiki-agent-context", "wiki-runtime-policy"] : [],
    updatedAt: issue.updatedAt
  };
}

function toCockpitRequirementRow(issue: Issue, repositories: RepositoryConfig[], runs: AgentRun[]): CockpitRequirementRow {
  const row = toRequirementRow(issue, repositories);
  const issueIds = new Set(flattenIssueTree(issue).map((node) => node.id));
  const issueRuns = runs.filter((run) => issueIds.has(run.issueId));
  const latestRun = issueRuns
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

  return {
    ...row,
    blocked: countIssuesByStatus(issue, IssueStatus.Blocked),
    activeRuns: issueRuns.filter((run) => isActiveRunStatus(run.status)).length,
    evidence: flattenIssueTree(issue).reduce((total, node) => total + node.evidence.length, 0),
    latestRun: latestRun ? toRunRow(latestRun, [issue], repositories) : null
  };
}

function toRunRow(run: AgentRun, rootIssues: Issue[], repositories: RepositoryConfig[]): RunRow {
  const issue = findIssueById(rootIssues, run.issueId);
  const rootIssue = findRootIssueForIssue(rootIssues, run.issueId);

  return {
    id: run.id,
    issueId: run.issueId,
    rootIssueId: rootIssue?.id ?? run.issueId,
    issue: issue?.title ?? run.issueId,
    agent: agentRoleLabel(run.agentRole),
    runtime: runtimeLabel(run.runtimeKind),
    repository: repositories[0]?.name ?? "unassigned",
    status: run.status,
    evidence: run.evidenceIds.length > 0 ? `${run.evidenceIds.length} evidence items` : "Runtime log recorded",
    updatedAt: run.updatedAt
  };
}

function toInboxRow(notification: NotificationItem, rootIssues: Issue[]): InboxRow {
  const issue = notification.issueId ? findIssueById(rootIssues, notification.issueId) : null;

  return {
    id: notification.id,
    type: notificationTypeLabel(notification.type),
    title: notification.title,
    target: issue?.title ?? notification.rootIssueId ?? "Project",
    severity: notification.severity === "high" ? "High" : "Normal",
    delivery: deliveryLabel(notification),
    updatedAt: notification.updatedAt
  };
}

function toProjectRow(project: Project, rootIssues: Issue[], repositories: RepositoryConfig[]): ProjectRow {
  const summaries = rootIssues.map(aggregateIssueTree);
  const done = summaries.reduce((total, summary) => total + summary.counts.done, 0);
  const nodes = summaries.reduce((total, summary) => total + summary.total, 0);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: "Active",
    requirements: rootIssues.length,
    repositories: repositories.length,
    agents: 14,
    progress: nodes > 0 ? Math.round((done / nodes) * 100) : 0,
    updatedAt: project.updatedAt
  };
}

function toKnowledgePageRow(page: KnowledgePage): KnowledgePageRow {
  return {
    id: page.id,
    title: page.title,
    tags: page.tags,
    linkedRequirements: page.linkedRequirementIds,
    linkedRepositories: page.linkedRepositoryIds,
    updatedAt: page.updatedAt
  };
}

function findIssueById(issues: Issue[], issueId: string): Issue | null {
  for (const issue of issues) {
    if (issue.id === issueId) {
      return issue;
    }

    const found = findIssueById(issue.children, issueId);

    if (found) {
      return found;
    }
  }

  return null;
}

function notificationTypeLabel(type: NotificationItem["type"]): string {
  const labels: Record<NotificationItem["type"], string> = {
    approval_required: "Approval",
    blocked: "Blocked",
    failed_after_retry: "Failed",
    root_issue_completed: "Completed",
    digest: "Digest"
  };

  return labels[type];
}

function deliveryLabel(notification: NotificationItem): string {
  if (notification.emailSentAt) {
    return `Email sent ${formatDateTime(notification.emailSentAt)}`;
  }

  const labels: Record<NotificationItem["delivery"], string> = {
    inbox: "Inbox only",
    digest: "Next digest email",
    immediate_email: "Immediate email pending"
  };

  return labels[notification.delivery];
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildCockpitAttention(rootIssues: Issue[], notifications: NotificationItem[]): CockpitAttentionItem[] {
  const items: CockpitAttentionItem[] = notifications.map((notification) => {
    const issue = notification.issueId ? findIssueById(rootIssues, notification.issueId) : null;

    return {
      id: notification.id,
      severity: notification.severity === "high" ? "critical" : notification.type === "digest" ? "info" : "warning",
      title: notification.title,
      body: notification.body,
      owner: issue?.ownerAgentRole ? agentRoleLabel(issue.ownerAgentRole) : "Project operator",
      source: notificationTypeLabel(notification.type),
      action: notification.type === "approval_required" ? "Review approval gate" : "Open requirement context",
      href: issue ? `/issues/${issue.parentIssueId ?? issue.id}` : "/inbox"
    };
  });

  const blocked = rootIssues.flatMap((root) =>
    flattenIssueTree(root)
      .filter((issue) => issue.status === IssueStatus.Blocked || issue.blockers.some((blocker) => !blocker.resolvedAt))
      .map((issue) => ({
        id: `blocked-${issue.id}`,
        severity: "critical" as const,
        title: issue.title,
        body: issue.blockers.find((blocker) => !blocker.resolvedAt)?.reason ?? "Issue is blocked and needs intervention.",
        owner: issue.ownerAgentRole ? agentRoleLabel(issue.ownerAgentRole) : "Unassigned",
        source: "Blocked issue",
        action: "Open issue tree",
        href: `/issues/${root.id}`
      }))
  );

  return [...blocked, ...items].slice(0, 6);
}

function buildRecentEvidence(rootIssues: Issue[]): CockpitEvidenceRow[] {
  return rootIssues
    .flatMap((root) =>
      flattenIssueTree(root).flatMap((issue) =>
        issue.evidence.map((item) => ({
          id: item.id,
          title: item.title,
          kind: item.kind,
          issue: issue.title,
          createdAt: item.createdAt,
          href: item.url
        }))
      )
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((item) => ({
      ...item,
      createdAt: formatDateTime(item.createdAt)
    }));
}

function countIssuesByStatus(issue: Issue, status: IssueStatus): number {
  return flattenIssueTree(issue).filter((node) => node.status === status).length;
}

function isActiveRunStatus(status: AgentRunStatus): boolean {
  return status === "queued" || status === "running";
}

function findRootIssueForIssue(rootIssues: Issue[], issueId: string): Issue | null {
  return rootIssues.find((root) => Boolean(findIssueById([root], issueId))) ?? null;
}

function agentRoleLabel(role: AgentRole): string {
  const labels: Record<AgentRole, string> = {
    [AgentRole.CEO]: "CEO",
    [AgentRole.CTO]: "CTO",
    [AgentRole.ProductManager]: "Product Manager",
    [AgentRole.UxUi]: "UX/UI",
    [AgentRole.EngineeringLead]: "Engineering Lead",
    [AgentRole.FrontendDeveloper]: "Frontend Developer",
    [AgentRole.BackendDeveloper]: "Backend Developer",
    [AgentRole.Database]: "Database",
    [AgentRole.DevOps]: "DevOps",
    [AgentRole.CodeReview]: "Code Review",
    [AgentRole.QA]: "QA",
    [AgentRole.Documentation]: "Documentation",
    [AgentRole.ReleaseManager]: "Release Manager"
  };

  return labels[role];
}

function runtimeLabel(runtimeKind: RuntimeKind): string {
  const labels: Record<RuntimeKind, string> = {
    [RuntimeKind.Mock]: "Mock Runtime",
    [RuntimeKind.CodexCli]: "Codex CLI",
    [RuntimeKind.ClaudeCli]: "Claude CLI"
  };

  return labels[runtimeKind];
}

export function providerLabel(providerType: RepositoryProviderType): string {
  const labels: Record<RepositoryProviderType, string> = {
    generic_git: "Generic Git",
    github: "GitHub",
    gitlab: "GitLab",
    gitea: "Gitea",
    bitbucket: "Bitbucket",
    local_only: "Local Only"
  };

  return labels[providerType];
}

function resolveEmailTransport(): EmailTransportKind {
  return process.env.VAGRANT_EMAIL_TRANSPORT === "disabled" ? "disabled" : "log";
}
