import { KnowledgePageClient } from "@/components/knowledge-page-client";
import { getKnowledgeWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const view = await getKnowledgeWorkspaceView(projectId);

  return <KnowledgePageClient view={view} />;
}
