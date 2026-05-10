import { RunsPageClient } from "@/components/runs-page-client";
import { getRunsWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const view = await getRunsWorkspaceView(projectId);

  return <RunsPageClient view={view} />;
}
