import { NextResponse, type NextRequest } from "next/server";
import { RuntimeKind } from "@vagrant/core";
import {
  NodeProcessRunner,
  WorkspaceManager,
  executeDispatchAction,
  scanReadyDispatchActions
} from "@vagrant/core/node";
import { assertRootIssueProject } from "@/lib/route-guards";
import { buildRunsRedirectPath } from "@/lib/run-feedback";
import {
  createProviderAdapter,
  createRuntimeAdapter,
  getRuntimeBinary,
  normalizeProcessError,
  readRuntimeKindValue,
  validateRuntimeBinary
} from "@/lib/runtime-adapters";
import { getWorkspaceStore, resolveProjectId } from "@/lib/workspace-store";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const rootIssueId = readRequiredString(formData, "rootIssueId");
  const projectId = resolveProjectId(readOptionalString(formData, "projectId"));
  const repositoryId = readRequiredString(formData, "repositoryId");
  const runtimeKind = readRuntimeKind(formData);
  const runner = new NodeProcessRunner();
  const store = await getWorkspaceStore();
  const rootIssue = await store.getRootIssue(rootIssueId);

  if (!rootIssue) {
    throw new Error(`Root issue not found: ${rootIssueId}`);
  }

  assertRootIssueProject(rootIssue, projectId);

  const runtime = createRuntimeAdapter(runtimeKind, runner);
  const scanResult = await scanReadyDispatchActions({
    store,
    rootIssueId,
    triggerEventId: `manual-${rootIssueId}`
  });
  const startAction = scanResult.actions.find((action) => action.kind === "start_agent_run");

  if (!startAction) {
    return NextResponse.redirect(new URL(buildRunsRedirectPath({
      projectId,
      result: "dispatch",
      status: "idle",
      message: "No ready agent run found for the selected root issue.",
      actions: scanResult.actions.length,
      approvals: scanResult.approvals.length,
      runs: 0
    }), request.url), 303);
  }

  let execution;

  try {
    await validateRuntimeBinary({
      runtimeKind,
      runner,
      cwd: process.cwd()
    });
    execution = await executeDispatchAction({
      store,
      rootIssueId,
      actionId: startAction.id,
      runtimeKind,
      runtime,
      provider: createProviderAdapter(),
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
  } catch (error) {
    return NextResponse.redirect(new URL(buildRunsRedirectPath({
      projectId,
      result: "dispatch",
      status: "failed",
      message: normalizeProcessError(error, runtimeKind, getRuntimeBinary(runtimeKind) ?? "runtime"),
      actions: scanResult.actions.length,
      approvals: scanResult.approvals.length,
      runs: 0
    }), request.url), 303);
  }

  return NextResponse.redirect(new URL(buildRunsRedirectPath({
    projectId,
    result: "dispatch",
    status: execution.run?.status === "failed" ? "failed" : "executed",
    message: execution.run?.summary ?? "Dispatch completed.",
    actions: scanResult.actions.length,
    approvals: scanResult.approvals.length,
    runs: execution.run ? 1 : 0
  }), request.url), 303);
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
  return readRuntimeKindValue(value);
}
