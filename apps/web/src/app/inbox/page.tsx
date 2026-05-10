import { InboxPageClient } from "@/components/inbox-page-client";
import { getInboxWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const view = await getInboxWorkspaceView(projectId);

  return <InboxPageClient view={view} />;
}
