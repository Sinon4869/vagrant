import { NextResponse, type NextRequest } from "next/server";
import {
  type RequirementArea,
  type RequirementComplexity,
  planIssueTree
} from "@vagrant/core";
import { getWorkspaceStore, resolveProjectId } from "@/lib/workspace-store";

const complexities = new Set<RequirementComplexity>(["small", "medium", "large"]);
const areas = new Set<RequirementArea>(["frontend", "backend", "full_stack", "devops", "documentation"]);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const title = readRequiredString(formData, "title");
  const description = readRequiredString(formData, "description");
  const complexity = readComplexity(formData);
  const area = readArea(formData);
  const projectId = resolveProjectId(readOptionalString(formData, "projectId"));
  const rootIssueId = `issue-${slugify(title)}`;

  const store = await getWorkspaceStore();
  const rootIssue = planIssueTree({
    projectId,
    rootIssueId,
    title,
    description,
    complexity,
    area
  });

  await store.upsertRootIssue(rootIssue);

  return NextResponse.redirect(new URL(`/issues/${rootIssue.id}`, request.url), 303);
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

function readComplexity(formData: FormData): RequirementComplexity {
  const value = readRequiredString(formData, "complexity");

  if (!complexities.has(value as RequirementComplexity)) {
    throw new Error(`Unsupported complexity: ${value}`);
  }

  return value as RequirementComplexity;
}

function readArea(formData: FormData): RequirementArea {
  const value = readRequiredString(formData, "area");

  if (!areas.has(value as RequirementArea)) {
    throw new Error(`Unsupported area: ${value}`);
  }

  return value as RequirementArea;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
