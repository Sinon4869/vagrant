import { aggregateIssueTree } from "@vagrant/core";
import { notFound } from "next/navigation";
import { RootIssuePageClient } from "@/components/root-issue-page-client";
import { getPersistedRootIssue } from "@/lib/workspace-store";

type RootIssuePageProps = {
  params: Promise<{ issueId: string }>;
};

export default async function RootIssuePage({ params }: RootIssuePageProps) {
  const { issueId } = await params;
  const rootIssue = await getPersistedRootIssue(issueId);

  if (!rootIssue) {
    notFound();
  }

  const summary = aggregateIssueTree(rootIssue);

  return (
    <RootIssuePageClient
      project={{
        id: rootIssue.projectId,
        name: "vagrant",
        repositoryUrl: "local workspace"
      }}
      rootIssue={rootIssue}
      summary={summary}
    />
  );
}
