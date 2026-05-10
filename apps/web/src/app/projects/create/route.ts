import { redirect } from "next/navigation";
import { createProject } from "@vagrant/core";
import { getWorkspaceStore } from "@/lib/workspace-store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = readRequiredString(formData, "name");
  const description = readOptionalString(formData, "description");
  const now = new Date().toISOString();
  const store = await getWorkspaceStore();

  await store.upsertProject(createProject({
    id: `project-${slugify(name)}-${Date.now()}`,
    name,
    description,
    now
  }));

  redirect("/projects");
}

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "workspace";
}
