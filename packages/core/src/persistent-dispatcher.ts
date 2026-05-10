import { type ProviderAdapter, type RuntimeAdapter } from "./adapters.js";
import {
  AgentRole,
  type AgentRun,
  type Issue,
  type RepositoryConfig,
  RuntimeKind,
  createAgentRun
} from "./domain.js";
import { dispatchReadyIssues, type DispatchReadyIssuesResult } from "./dispatcher.js";
import { type LocalStore } from "./local-store.js";
import { type WorkspaceManager } from "./workspace-manager.js";

export interface DispatchPersistedReadyIssueInput {
  store: LocalStore;
  rootIssueId: string;
  repositoryId: string;
  triggerEventId: string;
  runtimeKind: RuntimeKind;
  workspaceManager: WorkspaceManager;
  runtime: RuntimeAdapter;
  provider: ProviderAdapter;
}

export async function dispatchPersistedReadyIssue(
  input: DispatchPersistedReadyIssueInput
): Promise<DispatchReadyIssuesResult> {
  const root = await input.store.getRootIssue(input.rootIssueId);

  if (!root) {
    throw new Error(`Root issue not found: ${input.rootIssueId}`);
  }

  const repository = await findRepository(input.store, root.projectId, input.repositoryId);
  const worktree = await input.workspaceManager.ensureRootIssueWorktree({
    repository,
    rootIssueId: root.id
  });
  const previousDispatchKeys = await input.store.listDispatchKeys();

  const result = await dispatchReadyIssues({
    root,
    triggerEventId: input.triggerEventId,
    runtime: input.runtime,
    provider: input.provider,
    previousDispatchKeys
  });

  await input.store.upsertRootIssue(result.root);

  for (const run of result.dispatchedRuns) {
    await input.store.addDispatchKey(run.dispatchKey);
    const issue = findIssueById(result.root, run.issueId);
    const agentRun = createAgentRun({
      id: run.runId,
      projectId: result.root.projectId,
      issueId: run.issueId,
      agentRole: issue?.ownerAgentRole ?? AgentRole.EngineeringLead,
      runtimeKind: input.runtimeKind,
      workingDirectory: worktree.workingDirectory,
      prompt: issue ? `Issue: ${issue.title}` : `Issue: ${run.issueId}`,
      now: "2026-05-10T00:00:00.000Z"
    });
    await input.store.upsertAgentRun(markSucceeded(agentRun, run.summary));
  }

  return result;
}

async function findRepository(
  store: LocalStore,
  projectId: string,
  repositoryId: string
): Promise<RepositoryConfig> {
  const repositories = await store.listRepositories(projectId);
  const repository = repositories.find((item) => item.id === repositoryId);

  if (!repository) {
    throw new Error(`Repository not found: ${repositoryId}`);
  }

  return repository;
}

function findIssueById(issue: Issue, issueId: string): Issue | null {
  if (issue.id === issueId) {
    return issue;
  }

  for (const child of issue.children) {
    const found = findIssueById(child, issueId);

    if (found) {
      return found;
    }
  }

  return null;
}

function markSucceeded(run: AgentRun, summary: string): AgentRun {
  return {
    ...run,
    status: "succeeded",
    summary,
    startedAt: run.createdAt,
    completedAt: run.createdAt,
    updatedAt: run.createdAt
  };
}
