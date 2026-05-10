import "server-only";

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  aggregateIssueTree,
  type AgentRun,
  AgentRole,
  RuntimeKind,
  type Issue,
  type RepositoryConfig,
  type RepositoryProviderType,
  createPersistedDemoState
} from "@vagrant/core";
import { LocalStore } from "@vagrant/core/node";

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
  runs: RunRow[];
}

export function getRuntimeDir(): string {
  return process.env.VAGRANT_RUNTIME_DIR ?? join(process.cwd(), ".vagrant", "runtime");
}

export async function getWorkspaceStore(): Promise<LocalStore> {
  const runtimeDir = getRuntimeDir();
  await mkdir(runtimeDir, { recursive: true });
  const store = new LocalStore({ runtimeDir });
  await store.initialize();
  await ensureDefaultWorkspace(store);
  return store;
}

export async function getRepositoryWorkspaceView(): Promise<RepositoryWorkspaceView> {
  const store = await getWorkspaceStore();
  const project = await store.getProject(DEFAULT_PROJECT_ID);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${DEFAULT_PROJECT_ID}`);
  }

  const rootIssue = await store.getRootIssue("issue-vagrant-knowledge");
  const repositories = await store.listRepositories(project.id);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      defaultRuntimeKind: RuntimeKind.CodexCli
    },
    repositories: repositories.map((repository) => toRepositoryRow(repository, rootIssue?.id ? 1 : 0))
  };
}

export async function getRequirementsWorkspaceView(): Promise<RequirementsWorkspaceView> {
  const store = await getWorkspaceStore();
  const project = await store.getProject(DEFAULT_PROJECT_ID);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${DEFAULT_PROJECT_ID}`);
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

export async function getRunsWorkspaceView(): Promise<RunsWorkspaceView> {
  const store = await getWorkspaceStore();
  const project = await store.getProject(DEFAULT_PROJECT_ID);

  if (!project) {
    throw new Error(`Project not found after workspace initialization: ${DEFAULT_PROJECT_ID}`);
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
    runs: runs.map((run) => toRunRow(run, rootIssues, repositories))
  };
}

async function ensureDefaultWorkspace(store: LocalStore): Promise<void> {
  const existingProject = await store.getProject(DEFAULT_PROJECT_ID);

  if (existingProject) {
    return;
  }

  const seed = createPersistedDemoState({
    repositoryLocalPath: process.cwd(),
    repositoryRemoteUrl: "https://github.com/Sinon4869/vagrant"
  });

  await store.upsertProject(seed.project);
  await store.upsertRepository(seed.repository);
  await store.upsertRootIssue(seed.rootIssue);
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

function toRunRow(run: AgentRun, rootIssues: Issue[], repositories: RepositoryConfig[]): RunRow {
  const issue = findIssueById(rootIssues, run.issueId);

  return {
    id: run.id,
    issueId: run.issueId,
    issue: issue?.title ?? run.issueId,
    agent: agentRoleLabel(run.agentRole),
    runtime: runtimeLabel(run.runtimeKind),
    repository: repositories[0]?.name ?? "unassigned",
    status: run.status,
    evidence: run.evidenceIds.length > 0 ? `${run.evidenceIds.length} evidence items` : "Runtime log recorded",
    updatedAt: run.updatedAt
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
