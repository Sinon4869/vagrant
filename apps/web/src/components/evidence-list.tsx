"use client";

import { flattenIssueTree, type Issue } from "@vagrant/core";
import { Card, Empty, List, Tag, Typography } from "antd";

const { Text } = Typography;

export function EvidenceList({ root }: { root: Issue }) {
  const evidence = flattenIssueTree(root).flatMap((issue) =>
    issue.evidence.map((item) => ({ ...item, issueTitle: issue.title }))
  );

  return (
    <Card title="Evidence">
      {evidence.length === 0 ? (
        <Empty description="No evidence has been captured yet." />
      ) : (
        <List
          dataSource={evidence}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.title}
                description={
                  <>
                    <Tag>{item.kind}</Tag>
                    <Text type="secondary">{item.issueTitle}</Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
