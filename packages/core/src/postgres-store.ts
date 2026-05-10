import pg from "pg";
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
import { type WorkspaceStore } from "./workspace-store.js";

const { Pool } = pg;

export interface PostgresStoreOptions {
  connectionString: string;
}

export class PostgresStore implements WorkspaceStore {
  private readonly pool: pg.Pool;

  constructor(options: PostgresStoreOptions) {
    this.pool = new Pool({ connectionString: options.connectionString });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      create table if not exists projects (
        id text primary key,
        name text not null,
        description text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );

      create table if not exists repositories (
        id text primary key,
        project_id text not null references projects(id) on delete cascade,
        name text not null,
        local_path text not null,
        remote_url text,
        provider_type text not null,
        default_base_branch text not null,
        credential_profile text,
        branch_name_prefix text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );

      create table if not exists root_issues (
        id text primary key,
        project_id text not null references projects(id) on delete cascade,
        issue jsonb not null,
        updated_at timestamptz not null
      );

      create table if not exists agent_runs (
        id text primary key,
        project_id text not null references projects(id) on delete cascade,
        root_issue_id text,
        issue_id text not null,
        agent_role text not null,
        runtime_kind text not null,
        status text not null,
        working_directory text not null,
        prompt text not null,
        summary text not null,
        logs jsonb not null,
        evidence_ids jsonb not null,
        started_at timestamptz,
        completed_at timestamptz,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );

      create table if not exists evidence (
        id text primary key,
        issue_id text not null,
        kind text not null,
        title text not null,
        url text,
        body text not null,
        created_at timestamptz not null
      );

      create table if not exists notifications (
        id text primary key,
        project_id text not null references projects(id) on delete cascade,
        root_issue_id text,
        issue_id text,
        type text not null,
        title text not null,
        body text not null,
        severity text not null,
        delivery text not null,
        dedupe_key text not null unique,
        email_sent_at timestamptz,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );

      create table if not exists knowledge_pages (
        id text primary key,
        project_id text not null references projects(id) on delete cascade,
        title text not null,
        body text not null,
        tags jsonb not null,
        linked_requirement_ids jsonb not null,
        linked_repository_ids jsonb not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );

      create table if not exists email_outbox (
        id text primary key,
        project_id text not null references projects(id) on delete cascade,
        notification_ids jsonb not null,
        subject text not null,
        body text not null,
        delivery text not null,
        status text not null,
        dedupe_key text not null unique,
        scheduled_for timestamptz not null,
        sent_at timestamptz,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );

      create table if not exists dispatch_keys (
        dispatch_key text primary key,
        created_at timestamptz not null default now()
      );
    `);
  }

  async getProject(projectId: string): Promise<Project | null> {
    const result = await this.pool.query<ProjectRow>(
      "select * from projects where id = $1",
      [projectId]
    );
    const row = result.rows[0];
    return row ? projectFromRow(row) : null;
  }

  async listProjects(): Promise<Project[]> {
    const result = await this.pool.query<ProjectRow>(
      "select * from projects order by updated_at desc"
    );
    return result.rows.map(projectFromRow);
  }

  async upsertProject(project: Project): Promise<void> {
    await this.pool.query(
      `insert into projects (id, name, description, created_at, updated_at)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set
         name = excluded.name,
         description = excluded.description,
         updated_at = excluded.updated_at`,
      [project.id, project.name, project.description, project.createdAt, project.updatedAt]
    );
  }

  async listRepositories(projectId: string): Promise<RepositoryConfig[]> {
    const result = await this.pool.query<RepositoryRow>(
      "select * from repositories where project_id = $1 order by created_at asc",
      [projectId]
    );
    return result.rows.map(repositoryFromRow);
  }

  async upsertRepository(repository: RepositoryConfig): Promise<void> {
    await this.pool.query(
      `insert into repositories (
        id, project_id, name, local_path, remote_url, provider_type, default_base_branch,
        credential_profile, branch_name_prefix, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      on conflict (id) do update set
        project_id = excluded.project_id,
        name = excluded.name,
        local_path = excluded.local_path,
        remote_url = excluded.remote_url,
        provider_type = excluded.provider_type,
        default_base_branch = excluded.default_base_branch,
        credential_profile = excluded.credential_profile,
        branch_name_prefix = excluded.branch_name_prefix,
        updated_at = excluded.updated_at`,
      [
        repository.id,
        repository.projectId,
        repository.name,
        repository.localPath,
        repository.remoteUrl,
        repository.providerType,
        repository.defaultBaseBranch,
        repository.credentialProfile,
        repository.branchNamePrefix,
        repository.createdAt,
        repository.updatedAt
      ]
    );
  }

  async getRootIssue(rootIssueId: string): Promise<Issue | null> {
    const result = await this.pool.query<{ issue: Issue }>(
      "select issue from root_issues where id = $1",
      [rootIssueId]
    );
    return result.rows[0]?.issue ?? null;
  }

  async listRootIssues(projectId: string): Promise<Issue[]> {
    const result = await this.pool.query<{ issue: Issue }>(
      "select issue from root_issues where project_id = $1 order by updated_at desc",
      [projectId]
    );
    return result.rows.map((row) => row.issue);
  }

  async upsertRootIssue(rootIssue: Issue): Promise<void> {
    await this.pool.query(
      `insert into root_issues (id, project_id, issue, updated_at)
       values ($1, $2, $3, $4)
       on conflict (id) do update set
         project_id = excluded.project_id,
         issue = excluded.issue,
         updated_at = excluded.updated_at`,
      [rootIssue.id, rootIssue.projectId, JSON.stringify(rootIssue), rootIssue.updatedAt]
    );
  }

  async listAgentRuns(rootIssueId: string): Promise<AgentRun[]> {
    const rootIssue = await this.getRootIssue(rootIssueId);
    const issueIds = new Set(flattenIssueIds(rootIssue));
    const result = await this.pool.query<AgentRunRow>(
      "select * from agent_runs where issue_id = any($1::text[]) order by updated_at desc",
      [[...issueIds]]
    );
    return result.rows.map(agentRunFromRow);
  }

  async listProjectAgentRuns(projectId: string): Promise<AgentRun[]> {
    const result = await this.pool.query<AgentRunRow>(
      "select * from agent_runs where project_id = $1 order by updated_at desc",
      [projectId]
    );
    return result.rows.map(agentRunFromRow);
  }

  async upsertAgentRun(run: AgentRun): Promise<void> {
    await this.pool.query(
      `insert into agent_runs (
        id, project_id, issue_id, agent_role, runtime_kind, status, working_directory,
        prompt, summary, logs, evidence_ids, started_at, completed_at, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      on conflict (id) do update set
        status = excluded.status,
        summary = excluded.summary,
        logs = excluded.logs,
        evidence_ids = excluded.evidence_ids,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        updated_at = excluded.updated_at`,
      [
        run.id,
        run.projectId,
        run.issueId,
        run.agentRole,
        run.runtimeKind,
        run.status,
        run.workingDirectory,
        run.prompt,
        run.summary,
        JSON.stringify(run.logs),
        JSON.stringify(run.evidenceIds),
        run.startedAt,
        run.completedAt,
        run.createdAt,
        run.updatedAt
      ]
    );
  }

  async listNotifications(projectId: string): Promise<NotificationItem[]> {
    const result = await this.pool.query<NotificationRow>(
      "select * from notifications where project_id = $1 order by updated_at desc",
      [projectId]
    );
    return result.rows.map(notificationFromRow);
  }

  async upsertNotification(notification: NotificationItem): Promise<void> {
    await this.pool.query(
      `insert into notifications (
        id, project_id, root_issue_id, issue_id, type, title, body, severity, delivery,
        dedupe_key, email_sent_at, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      on conflict (id) do update set
        project_id = excluded.project_id,
        root_issue_id = excluded.root_issue_id,
        issue_id = excluded.issue_id,
        type = excluded.type,
        title = excluded.title,
        body = excluded.body,
        severity = excluded.severity,
        delivery = excluded.delivery,
        dedupe_key = excluded.dedupe_key,
        email_sent_at = excluded.email_sent_at,
        updated_at = excluded.updated_at`,
      [
        notification.id,
        notification.projectId,
        notification.rootIssueId,
        notification.issueId,
        notification.type,
        notification.title,
        notification.body,
        notification.severity,
        notification.delivery,
        notification.dedupeKey,
        notification.emailSentAt,
        notification.createdAt,
        notification.updatedAt
      ]
    );
  }

  async listEmailOutbox(projectId: string): Promise<EmailOutboxItem[]> {
    const result = await this.pool.query<EmailOutboxRow>(
      "select * from email_outbox where project_id = $1 order by updated_at desc",
      [projectId]
    );
    return result.rows.map(emailOutboxFromRow);
  }

  async upsertEmailOutboxItem(item: EmailOutboxItem): Promise<void> {
    await this.pool.query(
      `insert into email_outbox (
        id, project_id, notification_ids, subject, body, delivery, status,
        dedupe_key, scheduled_for, sent_at, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      on conflict (id) do update set
        project_id = excluded.project_id,
        notification_ids = excluded.notification_ids,
        subject = excluded.subject,
        body = excluded.body,
        delivery = excluded.delivery,
        status = excluded.status,
        dedupe_key = excluded.dedupe_key,
        scheduled_for = excluded.scheduled_for,
        sent_at = excluded.sent_at,
        updated_at = excluded.updated_at`,
      [
        item.id,
        item.projectId,
        JSON.stringify(item.notificationIds),
        item.subject,
        item.body,
        item.delivery,
        item.status,
        item.dedupeKey,
        item.scheduledFor,
        item.sentAt,
        item.createdAt,
        item.updatedAt
      ]
    );
  }

  async hasEmailDedupeKey(dedupeKey: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      "select exists(select 1 from email_outbox where dedupe_key = $1)",
      [dedupeKey]
    );
    return result.rows[0]?.exists ?? false;
  }

  async listKnowledgePages(projectId: string): Promise<KnowledgePage[]> {
    const result = await this.pool.query<KnowledgePageRow>(
      "select * from knowledge_pages where project_id = $1 order by updated_at desc",
      [projectId]
    );
    return result.rows.map(knowledgePageFromRow);
  }

  async upsertKnowledgePage(page: KnowledgePage): Promise<void> {
    await this.pool.query(
      `insert into knowledge_pages (
        id, project_id, title, body, tags, linked_requirement_ids, linked_repository_ids,
        created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      on conflict (id) do update set
        project_id = excluded.project_id,
        title = excluded.title,
        body = excluded.body,
        tags = excluded.tags,
        linked_requirement_ids = excluded.linked_requirement_ids,
        linked_repository_ids = excluded.linked_repository_ids,
        updated_at = excluded.updated_at`,
      [
        page.id,
        page.projectId,
        page.title,
        page.body,
        JSON.stringify(page.tags),
        JSON.stringify(page.linkedRequirementIds),
        JSON.stringify(page.linkedRepositoryIds),
        page.createdAt,
        page.updatedAt
      ]
    );
  }

  async appendEvidence(evidence: Evidence[]): Promise<void> {
    for (const item of evidence) {
      await this.pool.query(
        `insert into evidence (id, issue_id, kind, title, url, body, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update set
           kind = excluded.kind,
           title = excluded.title,
           url = excluded.url,
           body = excluded.body`,
        [item.id, item.issueId, item.kind, item.title, item.url, item.body, item.createdAt]
      );
    }
  }

  async hasDispatchKey(dispatchKey: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      "select exists(select 1 from dispatch_keys where dispatch_key = $1)",
      [dispatchKey]
    );
    return result.rows[0]?.exists ?? false;
  }

  async listDispatchKeys(): Promise<Set<string>> {
    const result = await this.pool.query<{ dispatch_key: string }>("select dispatch_key from dispatch_keys");
    return new Set(result.rows.map((row) => row.dispatch_key));
  }

  async addDispatchKey(dispatchKey: string): Promise<void> {
    await this.pool.query(
      "insert into dispatch_keys (dispatch_key) values ($1) on conflict do nothing",
      [dispatchKey]
    );
  }
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

interface RepositoryRow {
  id: string;
  project_id: string;
  name: string;
  local_path: string;
  remote_url: string | null;
  provider_type: RepositoryConfig["providerType"];
  default_base_branch: string;
  credential_profile: string | null;
  branch_name_prefix: string;
  created_at: Date;
  updated_at: Date;
}

interface AgentRunRow {
  id: string;
  project_id: string;
  issue_id: string;
  agent_role: AgentRun["agentRole"];
  runtime_kind: AgentRun["runtimeKind"];
  status: AgentRun["status"];
  working_directory: string;
  prompt: string;
  summary: string;
  logs: AgentRun["logs"];
  evidence_ids: string[];
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface NotificationRow {
  id: string;
  project_id: string;
  root_issue_id: string | null;
  issue_id: string | null;
  type: NotificationItem["type"];
  title: string;
  body: string;
  severity: NotificationItem["severity"];
  delivery: NotificationItem["delivery"];
  dedupe_key: string;
  email_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface KnowledgePageRow {
  id: string;
  project_id: string;
  title: string;
  body: string;
  tags: string[];
  linked_requirement_ids: string[];
  linked_repository_ids: string[];
  created_at: Date;
  updated_at: Date;
}

interface EmailOutboxRow {
  id: string;
  project_id: string;
  notification_ids: string[];
  subject: string;
  body: string;
  delivery: EmailOutboxItem["delivery"];
  status: EmailOutboxItem["status"];
  dedupe_key: string;
  scheduled_for: Date;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function repositoryFromRow(row: RepositoryRow): RepositoryConfig {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    localPath: row.local_path,
    remoteUrl: row.remote_url,
    providerType: row.provider_type,
    defaultBaseBranch: row.default_base_branch,
    credentialProfile: row.credential_profile,
    branchNamePrefix: row.branch_name_prefix,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function agentRunFromRow(row: AgentRunRow): AgentRun {
  return {
    id: row.id,
    projectId: row.project_id,
    issueId: row.issue_id,
    agentRole: row.agent_role,
    runtimeKind: row.runtime_kind,
    status: row.status,
    workingDirectory: row.working_directory,
    prompt: row.prompt,
    summary: row.summary,
    logs: row.logs,
    evidenceIds: row.evidence_ids,
    startedAt: row.started_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function notificationFromRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    projectId: row.project_id,
    rootIssueId: row.root_issue_id,
    issueId: row.issue_id,
    type: row.type,
    title: row.title,
    body: row.body,
    severity: row.severity,
    delivery: row.delivery,
    dedupeKey: row.dedupe_key,
    emailSentAt: row.email_sent_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function knowledgePageFromRow(row: KnowledgePageRow): KnowledgePage {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    tags: row.tags,
    linkedRequirementIds: row.linked_requirement_ids,
    linkedRepositoryIds: row.linked_repository_ids,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function emailOutboxFromRow(row: EmailOutboxRow): EmailOutboxItem {
  return {
    id: row.id,
    projectId: row.project_id,
    notificationIds: row.notification_ids,
    subject: row.subject,
    body: row.body,
    delivery: row.delivery,
    status: row.status,
    dedupeKey: row.dedupe_key,
    scheduledFor: row.scheduled_for.toISOString(),
    sentAt: row.sent_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function flattenIssueIds(issue: Issue | null): string[] {
  if (!issue) {
    return [];
  }

  return [issue.id, ...issue.children.flatMap((child) => flattenIssueIds(child))];
}
