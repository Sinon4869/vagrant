"use client";

import { type Issue, type IssueTreeSummary } from "@vagrant/core";
import { Card, Descriptions, Progress, Typography } from "antd";
import { StatusBadge } from "@/components/status-badge";

const { Text } = Typography;

export function IssueDetailPanel({ issue, summary }: { issue: Issue; summary: IssueTreeSummary }) {
  return (
    <Card title="Requirement Status" extra={<StatusBadge status={summary.aggregateStatus} />}>
      <Text type="secondary">{issue.description}</Text>
      <Progress percent={summary.progress} style={{ marginTop: 16 }} />
      <Descriptions
        size="small"
        column={2}
        style={{ marginTop: 16 }}
        items={[
          { key: "total", label: "Total", children: summary.total },
          { key: "done", label: "Done", children: summary.counts.done },
          { key: "review", label: "In review", children: summary.counts.in_review },
          { key: "blocked", label: "Blocked", children: summary.counts.blocked }
        ]}
      />
      <Descriptions
        title="Acceptance Criteria"
        size="small"
        column={1}
        style={{ marginTop: 16 }}
        items={issue.acceptanceCriteria.map((criterion) => ({
          key: criterion,
          label: "Criterion",
          children: criterion
        }))}
      />
    </Card>
  );
}
