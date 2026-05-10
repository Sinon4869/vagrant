import { RequirementsPageClient } from "@/components/requirements-page-client";
import { getRequirementsWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function RequirementsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const view = await getRequirementsWorkspaceView(projectId);

  return <RequirementsPageClient view={view} />;
}
