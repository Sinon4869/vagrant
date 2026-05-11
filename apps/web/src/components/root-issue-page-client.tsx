"use client";

import { useMemo, useState } from "react";
import {
  AlertOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  FileSearchOutlined,
  NodeIndexOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import { flattenIssueTree, type Issue, type IssueTreeSummary } from "@vagrant/core";
import { Button, Descriptions, Empty, Flex, List, Progress, Space, Tag, Typography } from "antd";
import { IssueTree } from "@/components/issue-tree";
import { StatusBadge } from "@/components/status-badge";

const { Paragraph, Text, Title } = Typography;

interface RootIssuePageClientProps {
  project: {
    id: string;
    name: string;
    repositoryUrl: string;
  };
  rootIssue: Issue;
  summary: IssueTreeSummary;
}

export function RootIssuePageClient({ project, rootIssue, summary }: RootIssuePageClientProps) {
  const [selectedIssueId, setSelectedIssueId] = useState(rootIssue.id);
  const issues = useMemo(() => flattenIssueTree(rootIssue), [rootIssue]);
  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? rootIssue;
  const selectedChildren = selectedIssue.children;
  const unresolvedBlockers = selectedIssue.blockers.filter((blocker) => !blocker.resolvedAt);
  const missingEvidence = selectedIssue.evidenceRequirements.filter(
    (requirement) => !selectedIssue.evidence.some((item) => item.kind === requirement)
  );

  return (
    <Space direction="vertical" size={20} className="issue-console-page">
      <header className="issue-console-header">
        <div>
          <Text type="secondary">{project.name}</Text>
          <Title level={2}>{rootIssue.title}</Title>
          <Paragraph type="secondary">{rootIssue.description}</Paragraph>
        </div>
        <div className="issue-console-summary">
          <StatusBadge status={summary.aggregateStatus} />
          <Progress percent={summary.progress} size="small" />
          <Text type="secondary">
            {summary.counts.done} done · {summary.counts.in_review} in review · {summary.counts.blocked} blocked · {summary.total} nodes
          </Text>
        </div>
      </header>

      <section className="issue-console-grid">
        <aside className="issue-tree-panel">
          <PanelTitle icon={<NodeIndexOutlined />} title="Issue Tree Navigator" />
          <IssueTree root={rootIssue} selectedIssueId={selectedIssue.id} onSelectIssue={setSelectedIssueId} />
        </aside>

        <main className="selected-issue-workspace">
          <Flex align="flex-start" justify="space-between" gap={16} wrap className="selected-issue-heading">
            <div>
              <Text type="secondary" className="mono-text">
                {selectedIssue.id}
              </Text>
              <Title level={3}>{selectedIssue.title}</Title>
              <Paragraph type="secondary">{selectedIssue.description || "No description provided."}</Paragraph>
            </div>
            <StatusBadge status={selectedIssue.status} />
          </Flex>

          <section className="issue-section">
            <PanelTitle icon={<SafetyCertificateOutlined />} title="Acceptance Criteria" />
            {selectedIssue.acceptanceCriteria.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No acceptance criteria recorded." />
            ) : (
              <List
                size="small"
                dataSource={selectedIssue.acceptanceCriteria}
                renderItem={(criterion) => (
                  <List.Item>
                    <CheckCircleOutlined className="list-leading-icon" />
                    <Text>{criterion}</Text>
                  </List.Item>
                )}
              />
            )}
          </section>

          <section className="issue-section">
            <PanelTitle icon={<AlertOutlined />} title="Blockers" />
            {unresolvedBlockers.length === 0 ? (
              <div className="empty-inline">
                <CheckCircleOutlined />
                <Text>No unresolved blockers for this node.</Text>
              </div>
            ) : (
              <List
                size="small"
                dataSource={unresolvedBlockers}
                renderItem={(blocker) => (
                  <List.Item>
                    <List.Item.Meta
                      title={blocker.reason}
                      description={`Owner ${blocker.ownerAgentRole ?? "unassigned"} · unblock when ${blocker.unblockCondition}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </section>

          <section className="issue-section">
            <PanelTitle icon={<NodeIndexOutlined />} title="Child Issue Summary" />
            {selectedChildren.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="This node has no subissues." />
            ) : (
              <List
                size="small"
                dataSource={selectedChildren}
                renderItem={(child) => (
                  <List.Item
                    className="child-issue-row"
                    actions={[
                      <Button key="open" type="link" onClick={() => setSelectedIssueId(child.id)}>
                        Inspect
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={child.title}
                      description={`${child.ownerAgentRole ?? "unassigned"} · ${child.type}`}
                    />
                    <StatusBadge status={child.status} compact />
                  </List.Item>
                )}
              />
            )}
          </section>
        </main>

        <aside className="execution-inspector">
          <PanelTitle icon={<ProfileOutlined />} title="Execution Inspector" />
          <Descriptions
            size="small"
            column={1}
            items={[
              { key: "owner", label: "Owner", children: selectedIssue.ownerAgentRole ?? "unassigned" },
              { key: "type", label: "Type", children: selectedIssue.type },
              { key: "status", label: "Status", children: <StatusBadge status={selectedIssue.status} compact /> },
              { key: "evidence", label: "Evidence", children: `${selectedIssue.evidence.length} captured` },
              { key: "missing", label: "Missing evidence", children: `${missingEvidence.length} required` }
            ]}
          />

          <section className="inspector-section">
            <PanelTitle icon={<FileSearchOutlined />} title="Evidence" compact />
            {selectedIssue.evidence.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No evidence captured for this node." />
            ) : (
              <List
                size="small"
                dataSource={selectedIssue.evidence}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={
                        <Space size={6} wrap>
                          <Tag>{item.kind}</Tag>
                          <Text type="secondary">{formatDateTime(item.createdAt)}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </section>

          <section className="inspector-section">
            <PanelTitle icon={<CodeOutlined />} title="Evidence Requirements" compact />
            {selectedIssue.evidenceRequirements.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No evidence requirements configured." />
            ) : (
              <Space direction="vertical" size={8} className="full-width">
                {selectedIssue.evidenceRequirements.map((kind) => (
                  <div key={kind} className="requirement-check-row">
                    {missingEvidence.includes(kind) ? <AlertOutlined /> : <CheckCircleOutlined />}
                    <Text>{kind}</Text>
                    <Tag color={missingEvidence.includes(kind) ? "warning" : "success"}>
                      {missingEvidence.includes(kind) ? "Missing" : "Captured"}
                    </Tag>
                  </div>
                ))}
              </Space>
            )}
          </section>
        </aside>
      </section>
    </Space>
  );
}

function PanelTitle({ icon, title, compact = false }: { icon: React.ReactNode; title: string; compact?: boolean }) {
  return (
    <Flex align="center" gap={8} className={compact ? "panel-title compact" : "panel-title"}>
      {icon}
      <Title level={compact ? 5 : 4}>{title}</Title>
    </Flex>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
