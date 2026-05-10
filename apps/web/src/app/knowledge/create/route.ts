import { NextResponse, type NextRequest } from "next/server";
import { createKnowledgePage } from "@vagrant/core";
import { getWorkspaceStore, resolveProjectId } from "@/lib/workspace-store";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const projectId = resolveProjectId(readOptionalString(formData, "projectId"));
  const title = readRequiredString(formData, "title");
  const body = readOptionalString(formData, "body") ?? "";
  const tags = splitTags(readOptionalString(formData, "tags"));
  const linkedRequirementIds = readStringList(formData, "linkedRequirementIds");
  const linkedRepositoryIds = readStringList(formData, "linkedRepositoryIds");
  const now = new Date().toISOString();
  const store = await getWorkspaceStore();

  await store.upsertKnowledgePage(createKnowledgePage({
    id: `wiki-${slugify(title)}-${Date.now()}`,
    projectId,
    title,
    body,
    tags,
    linkedRequirementIds,
    linkedRepositoryIds,
    now
  }));

  return NextResponse.redirect(new URL(`/knowledge?projectId=${encodeURIComponent(projectId)}`, request.url), 303);
}

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function readStringList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

function splitTags(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "page";
}
