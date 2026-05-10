import { type Issue } from "@vagrant/core";

export function assertRootIssueProject(rootIssue: Issue, projectId: string): void {
  if (rootIssue.projectId !== projectId) {
    throw new Error(`Root issue ${rootIssue.id} does not belong to project ${projectId}`);
  }
}

export function createUniqueRootIssueId(title: string, existingIds: Set<string>): string {
  const baseId = `issue-${slugify(title) || "requirement"}`;

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
