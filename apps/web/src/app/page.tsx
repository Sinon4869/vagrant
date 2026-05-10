"use client";

import Link from "next/link";
import { Card, Col, Flex, Progress, Row, Space, Statistic, Typography } from "antd";
import { AttentionPanel } from "@/components/attention-panel";
import { StatusBadge } from "@/components/status-badge";
import { getDemoData } from "@/lib/demo-data";

const { Paragraph, Text, Title } = Typography;

export default function DashboardPage() {
  const { project, rootIssue, summary, attentionItems } = getDemoData();

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Flex align="flex-start" justify="space-between" gap={24} wrap>
        <div>
          <Text type="secondary">Project</Text>
          <Title level={2} style={{ margin: "4px 0 8px" }}>
            {project.name}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {project.repositoryUrl}
          </Paragraph>
        </div>
        <StatusBadge status={summary.aggregateStatus} />
      </Flex>

      <Row gutter={[12, 12]}>
        <Metric label="Total issues" value={summary.total} />
        <Metric label="Done" value={summary.counts.done} />
        <Metric label="In progress" value={summary.counts.in_progress} />
        <Metric label="In review" value={summary.counts.in_review} />
        <Metric label="Blocked" value={summary.counts.blocked} />
      </Row>

      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} lg={16}>
          <Card
            title="Active Root Issues"
            extra={<Progress type="circle" percent={summary.progress} size={40} />}
          >
            <Link href={`/issues/${rootIssue.id}`}>
              <Flex align="center" justify="space-between" gap={16} wrap>
                <div>
                  <Title level={4} style={{ marginTop: 0 }}>
                    {rootIssue.title}
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {rootIssue.description}
                  </Paragraph>
                </div>
                <StatusBadge status={summary.aggregateStatus} />
              </Flex>
            </Link>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <AttentionPanel items={attentionItems} />
        </Col>
      </Row>
    </Space>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Col xs={12} md={8} lg={4}>
      <Card size="small">
        <Statistic title={label} value={value} />
      </Card>
    </Col>
  );
}
