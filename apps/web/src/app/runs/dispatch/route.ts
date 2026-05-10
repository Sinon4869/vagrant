import { NextResponse, type NextRequest } from "next/server";
import { MockProviderAdapter, MockRuntimeAdapter, RuntimeKind, type RuntimeAdapter } from "@vagrant/core";
import {
  ClaudeCliRuntimeAdapter,
  CodexCliRuntimeAdapter,
  NodeProcessRunner,
  WorkspaceManager,
  executeDispatchAction,
  scanReadyDispatchActions
} from "@vagrant/core/node";
import { getWorkspaceStore, resolveProjectId } from "@/lib/workspace-store";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const rootIssueId = readRequiredString(formData, "rootIssueId");
  const projectId = resolveProjectId(readOptionalString(formData, "projectId"));
  const repositoryId = readRequiredString(formData, "repositoryId");
  const runtimeKind = readRuntimeKind(formData);
  const runner = new NodeProcessRunner();
  const store = await getWorkspaceStore();
  const runtime = createRuntimeAdapter(runtimeKind, runner);
  const scanResult = await scanReadyDispatchActions({
    store,
    rootIssueId,
    triggerEventId: `manual-${rootIssueId}`
  });
  const startAction = scanResult.actions.find((action) => action.kind === "start_agent_run");

  if (startAction) {
    await executeDispatchAction({
      store,
      rootIssueId,
      actionId: startAction.id,
      runtimeKind,
      runtime,
      provider: new MockProviderAdapter(),
      workingDirectory: runtimeKind === RuntimeKind.Mock
        ? `/mock/workspaces/${rootIssueId}`
        : await prepareWorkspace({
          store,
          rootIssueId,
          repositoryId,
          runner,
          worktreesDir: process.env.VAGRANT_WORKTREES_DIR ?? "/tmp/vagrant-worktrees"
        })
    });
  }

  return NextResponse.redirect(new URL(`/runs?projectId=${encodeURIComponent(projectId)}`, request.url), 303);
}

async function prepareWorkspace({
  store,
  rootIssueId,
  repositoryId,
  runner,
  worktreesDir
}: {
  store: Awaited<ReturnType<typeof getWorkspaceStore>>;
  rootIssueId: string;
  repositoryId: string;
  runner: NodeProcessRunner;
  worktreesDir: string;
}): Promise<string> {
  const root = await store.getRootIssue(rootIssueId);

  if (!root) {
    throw new Error(`Root issue not found: ${rootIssueId}`);
  }

  const repositories = await store.listRepositories(root.projectId);
  const repository = repositories.find((item) => item.id === repositoryId);

  if (!repository) {
    throw new Error(`Repository not found: ${repositoryId}`);
  }

  const worktree = await new WorkspaceManager({
    runner,
    worktreesDir
  }).ensureRootIssueWorktree({
    repository,
    rootIssueId
  });

  return worktree.workingDirectory;
}

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function readRuntimeKind(formData: FormData): RuntimeKind {
  const value = readRequiredString(formData, "runtimeKind");

  if (value === RuntimeKind.Mock || value === RuntimeKind.CodexCli || value === RuntimeKind.ClaudeCli) {
    return value;
  }

  throw new Error(`Unsupported runtime: ${value}`);
}

function createRuntimeAdapter(runtimeKind: RuntimeKind, runner: NodeProcessRunner): RuntimeAdapter {
  if (runtimeKind === RuntimeKind.CodexCli) {
    return new CodexCliRuntimeAdapter({
      runner,
      binary: process.env.CODEX_CLI_BINARY ?? "codex"
    });
  }

  if (runtimeKind === RuntimeKind.ClaudeCli) {
    return new ClaudeCliRuntimeAdapter({
      runner,
      binary: process.env.CLAUDE_CLI_BINARY ?? "claude"
    });
  }

  return new MockRuntimeAdapter();
}
