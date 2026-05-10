import { NextResponse, type NextRequest } from "next/server";
import { RuntimeKind } from "@vagrant/core";
import { NodeProcessRunner, runOrchestrationTick } from "@vagrant/core/node";
import { createProviderAdapter, createRuntimeAdapter, readRuntimeKindValue } from "@/lib/runtime-adapters";
import { getWorkspaceStore, resolveProjectId } from "@/lib/workspace-store";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const projectId = resolveProjectId(readOptionalString(formData, "projectId"));
  const runtimeKind = readRuntimeKind(formData);
  const runner = new NodeProcessRunner();
  const store = await getWorkspaceStore();

  if (runtimeKind !== RuntimeKind.Mock) {
    throw new Error("Project orchestration tick currently supports Mock Runtime only. Use selected-root dispatch for Codex CLI or Claude CLI.");
  }

  await runOrchestrationTick({
    store,
    projectId,
    triggerEventId: `tick-${projectId}`,
    runtimeKind,
    runtime: createRuntimeAdapter(runtimeKind, runner),
    provider: createProviderAdapter(),
    workingDirectory: `/mock/workspaces/${projectId}`
  });

  return NextResponse.redirect(new URL(`/runs?projectId=${encodeURIComponent(projectId)}`, request.url), 303);
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function readRuntimeKind(formData: FormData): RuntimeKind {
  const value = readOptionalString(formData, "runtimeKind") ?? RuntimeKind.Mock;
  return readRuntimeKindValue(value);
}
