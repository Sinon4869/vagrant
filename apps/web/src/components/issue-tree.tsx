"use client";

import { type Issue } from "@vagrant/core";
import { Tree, Typography, type TreeDataNode } from "antd";
import { StatusBadge } from "@/components/status-badge";

const { Text } = Typography;

export function IssueTree({ root }: { root: Issue }) {
  return <Tree blockNode defaultExpandAll showLine treeData={[toTreeNode(root)]} />;
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
