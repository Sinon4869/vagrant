"use client";

import { type Issue } from "@vagrant/core";
import { Tree, Typography, type TreeDataNode } from "antd";
import { StatusBadge } from "@/components/status-badge";

const { Text } = Typography;

export function IssueTree({
  root,
  selectedIssueId,
  onSelectIssue
}: {
  root: Issue;
  selectedIssueId?: string;
  onSelectIssue?: (issueId: string) => void;
}) {
  return (
    <Tree
      blockNode
      defaultExpandAll
      showLine
      treeData={[toTreeNode(root)]}
      {...(selectedIssueId ? { selectedKeys: [selectedIssueId] } : {})}
      onSelect={(keys) => {
        const issueId = String(keys[0] ?? "");
        if (issueId) {
          onSelectIssue?.(issueId);
        }
      }}
    />
  );
}

function toTreeNode(issue: Issue): TreeDataNode {
  return {
    key: issue.id,
    title: (
      <div className="issue-tree-title">
        <div>
          <Text strong>{issue.title}</Text>
          <br />
          <Text type="secondary">
            {issue.ownerAgentRole ?? "unassigned"} · {issue.type} · {issue.evidence.length} evidence
          </Text>
        </div>
        <StatusBadge status={issue.status} />
      </div>
    ),
    children: issue.children.map(toTreeNode)
  };
}
