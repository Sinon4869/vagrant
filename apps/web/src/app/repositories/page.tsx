import { RepositoriesPageClient } from "@/components/repositories-page-client";
import { getRepositoryWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function RepositoriesPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const view = await getRepositoryWorkspaceView(projectId);

  return <RepositoriesPageClient view={view} />;
}
