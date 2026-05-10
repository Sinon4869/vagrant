import { RepositoriesPageClient } from "@/components/repositories-page-client";
import { getRepositoryWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function RepositoriesPage() {
  const view = await getRepositoryWorkspaceView();

  return <RepositoriesPageClient view={view} />;
}
