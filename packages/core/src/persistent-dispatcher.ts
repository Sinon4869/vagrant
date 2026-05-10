import { type ProviderAdapter, type RuntimeAdapter } from "./adapters.js";
import { type Issue, type RepositoryConfig, RuntimeKind } from "./domain.js";
import { type DispatchReadyIssuesResult } from "./dispatcher.js";
import { executeDispatchAction, scanReadyDispatchActions } from "./orchestration-service.js";
import { type WorkspaceStore } from "./workspace-store.js";
import { type WorkspaceManager } from "./workspace-manager.js";

export interface DispatchPersistedReadyIssueInput {
  store: WorkspaceStore;
  rootIssueId: string;
  repositoryId: string;
  triggerEventId: string;
  runtimeKind: RuntimeKind;
  workspaceManager?: WorkspaceManager;
  runtime: RuntimeAdapter;
  provider: ProviderAdapter;
  workingDirectory?: string;
}

export async function dispatchPersistedReadyIssue(
  input: DispatchPersistedReadyIssueInput
): Promise<DispatchReadyIssuesResult> {
  const root = await input.store.getRootIssue(input.rootIssueId);

  if (!root) {
    throw new Error(`Root issue not found: ${input.rootIssueId}`);
  }

  const scanResult = await scanReadyDispatchActions({
    store: input.store,
    rootIssueId: root.id,
    triggerEventId: input.triggerEventId,
  });
  const action = scanResult.actions.find((item) => item.kind === "start_agent_run");
  const dispatchedRuns = [];

  if (action) {
    const workingDirectory = await resolveWorkingDirectory(input, root);
    const result = await executeDispatchAction({
      store: input.store,
      rootIssueId: root.id,
      actionId: action.id,
      runtimeKind: input.runtimeKind,
      runtime: input.runtime,
      provider: input.provider,
      workingDirectory,
    });

    if (result.run) {
      dispatchedRuns.push({
        runId: result.run.id,
        issueId: result.run.issueId,
        dispatchKey: action.idempotencyKey,
        summary: result.run.summary
      });
    }
  }

  return {
    root: await input.store.getRootIssue(root.id) ?? root,
    dispatchedRuns,
    dispatchKeys: await input.store.listDispatchKeys()
  };
}

async function resolveWorkingDirectory(input: DispatchPersistedReadyIssueInput, root: Issue): Promise<string> {
  if (!input.workspaceManager) {
    return input.workingDirectory ?? `/mock/workspaces/${root.id}`;
  }

  const repository = await findRepository(input.store, root.projectId, input.repositoryId);
  const worktree = await input.workspaceManager.ensureRootIssueWorktree({
    repository,
    rootIssueId: root.id
  });

  return worktree.workingDirectory;
}

async function findRepository(
  store: WorkspaceStore,
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
