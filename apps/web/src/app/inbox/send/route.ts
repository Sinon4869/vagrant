import { redirect } from "next/navigation";
import { sendProjectEmailOutbox } from "@/lib/workspace-store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const projectId = String(formData.get("projectId") ?? "");

  await sendProjectEmailOutbox(projectId);
  redirect(`/inbox${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`);
}
