import { NextResponse, type NextRequest } from "next/server";
import { MockProviderAdapter, MockRuntimeAdapter, RuntimeKind } from "@vagrant/core";
import { dispatchPersistedReadyIssue } from "@vagrant/core/node";
import { DEFAULT_REPOSITORY_ID, getWorkspaceStore } from "@/lib/workspace-store";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const rootIssueId = readRequiredString(formData, "rootIssueId");
  const store = await getWorkspaceStore();

  await dispatchPersistedReadyIssue({
    store,
    rootIssueId,
    repositoryId: DEFAULT_REPOSITORY_ID,
    triggerEventId: `manual-${Date.now()}`,
    runtimeKind: RuntimeKind.Mock,
    runtime: new MockRuntimeAdapter(),
    provider: new MockProviderAdapter(),
    workingDirectory: `/mock/workspaces/${rootIssueId}`
  });

  return NextResponse.redirect(new URL("/runs", request.url), 303);
}

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}
