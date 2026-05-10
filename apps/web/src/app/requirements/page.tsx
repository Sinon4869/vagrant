import { RequirementsPageClient } from "@/components/requirements-page-client";
import { getRequirementsWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function RequirementsPage() {
  const view = await getRequirementsWorkspaceView();

  return <RequirementsPageClient view={view} />;
}
