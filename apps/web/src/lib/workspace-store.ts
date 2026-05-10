import "server-only";

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  aggregateIssueTree,
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
