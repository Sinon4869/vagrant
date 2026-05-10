"use server";

import { revalidatePath } from "next/cache";
import { type RepositoryProviderType, createRepositoryConfig } from "@vagrant/core";
import { DEFAULT_PROJECT_ID, getWorkspaceStore } from "@/lib/workspace-store";

const providerTypes = new Set<RepositoryProviderType>([
  "generic_git",
  "github",
  "gitlab",
  "gitea",
  "bitbucket",
  "local_only"
]);

export async function addRepositoryAction(formData: FormData): Promise<void> {
  const name = readRequiredString(formData, "name");
  const localPath = readRequiredString(formData, "localPath");
  const providerType = readProviderType(formData);
  const defaultBaseBranch = readRequiredString(formData, "defaultBaseBranch");
  const remoteUrl = readOptionalString(formData, "remoteUrl");
  const branchNamePrefix = readOptionalString(formData, "branchNamePrefix") ?? "vagrant";

  const store = await getWorkspaceStore();
  await store.upsertRepository(
    createRepositoryConfig({
      id: `repo-${slugify(name)}`,
      projectId: DEFAULT_PROJECT_ID,
      name,
      localPath,
      remoteUrl,
      providerType,
      defaultBaseBranch,
      branchNamePrefix
    })
  );

  revalidatePath("/repositories");
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

function readProviderType(formData: FormData): RepositoryProviderType {
  const value = readRequiredString(formData, "providerType");

  if (!providerTypes.has(value as RepositoryProviderType)) {
    throw new Error(`Unsupported provider type: ${value}`);
  }

  return value as RepositoryProviderType;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
