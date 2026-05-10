import { KnowledgePageClient } from "@/components/knowledge-page-client";
import { getKnowledgeWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const view = await getKnowledgeWorkspaceView();

  return <KnowledgePageClient view={view} />;
}
