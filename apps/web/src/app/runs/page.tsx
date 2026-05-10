import { RunsPageClient } from "@/components/runs-page-client";
import { getRunsWorkspaceView } from "@/lib/workspace-store";

export default async function RunsPage() {
  const view = await getRunsWorkspaceView();

  return <RunsPageClient view={view} />;
}
