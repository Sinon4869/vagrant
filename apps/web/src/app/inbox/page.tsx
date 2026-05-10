import { InboxPageClient } from "@/components/inbox-page-client";
import { getInboxWorkspaceView } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const view = await getInboxWorkspaceView();

  return <InboxPageClient view={view} />;
}
