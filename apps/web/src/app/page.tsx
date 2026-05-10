import { OperationsCockpitClient } from "@/components/operations-cockpit-client";
import { getCockpitWorkspaceView } from "@/lib/workspace-store";

export default async function OperationsCockpitPage() {
  const view = await getCockpitWorkspaceView();
  return <OperationsCockpitClient view={view} />;
}
