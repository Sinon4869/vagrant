"use client";

import { flattenIssueTree, type Issue } from "@vagrant/core";
import { Card, Timeline, Typography } from "antd";

const { Text } = Typography;

export function ActivityTimeline({ root }: { root: Issue }) {
  const issues = flattenIssueTree(root);

  return (
    <Card title="Activity Timeline">
      <Timeline
        items={issues.map((issue) => ({
          key: issue.id,
          children: (
            <>
              <Text strong>{issue.title}</Text>
              <br />
              <Text type="secondary">
                {issue.ownerAgentRole ?? "unassigned"} is currently {issue.status.replace("_", " ")}.
              </Text>
            </>
          )
        }))}
      />
    </Card>
  );
}
