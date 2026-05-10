import { aggregateIssueTree } from "@vagrant/core";
import { notFound } from "next/navigation";
import { RootIssuePageClient } from "@/components/root-issue-page-client";
import { getDemoData } from "@/lib/demo-data";

type RootIssuePageProps = {
  params: Promise<{ issueId: string }>;
};

export default async function RootIssuePage({ params }: RootIssuePageProps) {
  const { issueId } = await params;
  const { project, rootIssue } = getDemoData();

  if (issueId !== rootIssue.id) {
    notFound();
  }

  const summary = aggregateIssueTree(rootIssue);

  return <RootIssuePageClient project={project} rootIssue={rootIssue} summary={summary} />;
}
