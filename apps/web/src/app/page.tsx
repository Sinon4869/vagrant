"use client";

import Link from "next/link";
import { ArrowRightOutlined, BranchesOutlined, BookOutlined, NodeIndexOutlined, RobotOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, List, Progress, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AttentionPanel } from "@/components/attention-panel";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDemoData } from "@/lib/demo-data";

const { Paragraph, Text, Title } = Typography;

export default function DashboardPage() {
  const { project, rootIssue, summary, attentionItems, requirements, repositories, knowledgePages, agents } =
    getDemoData();
  const requirementColumns: ColumnsType<(typeof requirements)[number]> = [
    {
      title: "Requirement",
      dataIndex: "title",
      render: (value, record) => (
        <Link href={record.id === rootIssue.id ? `/issues/${record.id}` : "/requirements"}>
          <Text strong>{value}</Text>
        </Link>
      )
    },
    {
      title: "Repository",
      dataIndex: "repositoryIds",
      render: (ids: string[]) => ids.map((id) => <Tag key={id}>{repositories.find((repo) => repo.id === id)?.name}</Tag>)
    },
    {
      title: "Knowledge",
      dataIndex: "knowledgeIds",
      render: (ids: string[]) => <Text type="secondary">{ids.length} linked</Text>
    },
    {
      title: "Progress",
      dataIndex: "progress",
      width: 160,
      render: (value: number) => <Progress percent={value} size="small" />
    }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Project overview"
        title={project.name}
        description="Requirements, knowledge, repositories, agents, and runs are managed inside this project workspace."
        actions={<StatusBadge status={summary.aggregateStatus} />}
      />

      <Row gutter={[12, 12]}>
        <Metric icon={<NodeIndexOutlined />} label="Requirements" value={requirements.length} />
        <Metric icon={<BranchesOutlined />} label="Repositories" value={repositories.length} />
        <Metric icon={<BookOutlined />} label="Knowledge pages" value={knowledgePages.length} />
        <Metric icon={<RobotOutlined />} label="Agent profiles" value={agents.length} />
        <Metric label="Issue nodes" value={summary.total} />
      </Row>

      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} xl={16}>
          <Card
            title="Active requirement map"
            extra={
              <Link href="/requirements">
                <Button type="link" icon={<ArrowRightOutlined />}>
                  View all
                </Button>
              </Link>
            }
          >
            <Table
              rowKey="id"
              columns={requirementColumns}
              dataSource={requirements}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <AttentionPanel items={attentionItems} />
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Repository linkage">
            <List
              dataSource={repositories}
              renderItem={(repo) => (
                <List.Item
                  actions={[
                    <Tag key="health" color={repo.health === "Synced" ? "success" : "default"}>
                      {repo.health}
                    </Tag>
                  ]}
                >
                  <List.Item.Meta
                    title={<Link href="/repositories">{repo.name}</Link>}
                    description={`${repo.provider} · ${repo.localPath}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Knowledge linked to delivery">
            <List
              dataSource={knowledgePages}
              renderItem={(page) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Link href="/knowledge">{page.title}</Link>}
                    description={`${page.tags.join(", ")} · ${page.linkedRequirements.length} requirement link`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return (
    <Col xs={12} md={8} xl={4}>
      <Card size="small">
        <Statistic title={<Space>{icon}{label}</Space>} value={value} />
      </Card>
    </Col>
  );
}
