import { redirect } from "next/navigation";
import { decideProjectApproval } from "@/lib/workspace-store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const projectId = String(formData.get("projectId") ?? "");
  const approvalId = String(formData.get("approvalId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (decision !== "approved" && decision !== "rejected") {
    throw new Error(`Unsupported approval decision: ${decision}`);
  }

  await decideProjectApproval({ projectId, approvalId, decision });
  redirect(`/inbox${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`);
}
