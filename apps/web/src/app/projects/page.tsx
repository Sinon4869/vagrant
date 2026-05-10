import { ProjectsPageClient } from "@/components/projects-page-client";
import { getProjectsWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const view = await getProjectsWorkspaceView();

  return <ProjectsPageClient view={view} />;
}
