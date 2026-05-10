"use client";

import { type Issue, type IssueTreeSummary } from "@vagrant/core";
import { Card, Col, Flex, Row, Space, Typography } from "antd";
import { ActivityTimeline } from "@/components/activity-timeline";
import { EvidenceList } from "@/components/evidence-list";
import { IssueDetailPanel } from "@/components/issue-detail-panel";
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
  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Flex align="flex-start" justify="space-between" gap={24} wrap>
        <div>
          <Text type="secondary">{project.name}</Text>
          <Title level={2} style={{ margin: "4px 0 8px" }}>
            {rootIssue.title}
          </Title>
          <Paragraph type="secondary" style={{ maxWidth: 760, margin: 0 }}>
            {rootIssue.description}
          </Paragraph>
        </div>
        <StatusBadge status={summary.aggregateStatus} />
      </Flex>

      <Row gutter={[24, 24]} align="top">
        <Col xs={24} lg={16}>
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            <Card title="Issue Tree">
              <IssueTree root={rootIssue} />
            </Card>
            <ActivityTimeline root={rootIssue} />
            <EvidenceList root={rootIssue} />
          </Space>
        </Col>
        <Col xs={24} lg={8}>
          <IssueDetailPanel issue={rootIssue} summary={summary} />
        </Col>
      </Row>
    </Space>
  );
}
