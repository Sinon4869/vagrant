import { RunsPageClient } from "@/components/runs-page-client";
import { readRunsFeedback } from "@/lib/run-feedback";
import { getRunsWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function RunsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const projectId = readSearchParam(params.projectId);
  const view = await getRunsWorkspaceView(projectId);

  return <RunsPageClient view={view} feedback={readRunsFeedback(toURLSearchParams(params))} />;
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toURLSearchParams(searchParams: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params;
}
