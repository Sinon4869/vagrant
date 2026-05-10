"use client";

import Link from "next/link";
import {
  AlertOutlined,
  ArrowRightOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  NodeIndexOutlined,
  PlayCircleOutlined
} from "@ant-design/icons";
import { Button, Empty, Flex, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import type {
  CockpitAttentionItem,
  CockpitRequirementRow,
  CockpitWorkspaceView
} from "@/lib/workspace-store";

const { Paragraph, Text, Title } = Typography;

export function OperationsCockpitClient({ view }: { view: CockpitWorkspaceView }) {
  const requirementColumns: ColumnsType<CockpitRequirementRow> = [
    {
      title: "Requirement",
      dataIndex: "title",
      render: (title, record) => (
        <Space direction="vertical" size={2}>
          <Link href={`/issues/${record.id}`}>
            <Text strong>{title}</Text>
          </Link>
          <Text type="secondary" className="mono-text">
            {record.id}
          </Text>
        </Space>
      )
    },
    {
      title: "Owner",
      dataIndex: "owner",
      width: 160,
      render: (owner) => <Text>{owner}</Text>
    },
    {
      title: "State",
      dataIndex: "status",
      width: 150,
      render: (status) => <StatusBadge status={status} />
    },
    {
      title: "Progress",
      dataIndex: "progress",
      width: 180,
      render: (value: number) => <Progress percent={value} size="small" />
    },
    {
      title: "Signals",
      key: "signals",
      width: 230,
      render: (_, record) => (
        <Space size={6} wrap>
          <Tag icon={<NodeIndexOutlined />}>{record.subissues} nodes</Tag>
          <Tag icon={<AlertOutlined />} color={record.blocked > 0 ? "error" : "default"}>
            {record.blocked} blocked
          </Tag>
          <Tag icon={<PlayCircleOutlined />} color={record.activeRuns > 0 ? "processing" : "default"}>
            {record.activeRuns} active
          </Tag>
        </Space>
      )
    },
    {
      title: "Latest run",
      key: "latestRun",
      width: 180,
      render: (_, record) =>
        record.latestRun ? (
          <Space direction="vertical" size={0}>
            <StatusBadge status={record.latestRun.status} kind="run" compact />
            <Text type="secondary" className="mono-text">
              {record.latestRun.id}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">No run yet</Text>
        )
    }
  ];

  return (
    <Space direction="vertical" size={20} className="cockpit-page">
      <PageHeader
        eyebrow="Operations Cockpit"
        title={view.project.name}
        description={view.project.description}
        metadata={
          <Space size={8} wrap>
            <Tag icon={<DatabaseOutlined />}>PostgreSQL workspace</Tag>
            <Tag icon={<CodeOutlined />}>Codex CLI ready</Tag>
            <Tag icon={<BranchesOutlined />}>{view.summary.repositories} repositories</Tag>
          </Space>
        }
        actions={
          <Link href="/requirements">
            <Button type="primary" icon={<NodeIndexOutlined />}>
              New requirement
            </Button>
          </Link>
        }
      />

      <section className="health-strip" aria-label="Project health">
        {view.health.map((item) => (
          <div key={item.label} className={`health-cell health-${item.status}`}>
            <Text type="secondary">{item.label}</Text>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="cockpit-grid">
        <div className="cockpit-main-panel">
          <PanelHeader title="Active Requirement Map" actionHref="/requirements" actionLabel="Queue" />
          {view.requirements.length === 0 ? (
            <Empty description="No requirements planned yet." />
          ) : (
            <Table
              rowKey="id"
              columns={requirementColumns}
              dataSource={view.requirements}
              pagination={false}
              size="middle"
            />
          )}
        </div>

        <aside className="attention-rail">
          <PanelHeader title="Needs Attention" actionHref="/inbox" actionLabel="Inbox" />
          {view.attention.length === 0 ? (
            <div className="empty-inline">
              <CheckCircleOutlined />
              <Text>No blockers or approvals waiting.</Text>
            </div>
          ) : (
            <Space direction="vertical" size={10} className="full-width">
              {view.attention.map((item) => (
                <AttentionCard key={item.id} item={item} />
              ))}
            </Space>
          )}
        </aside>
      </section>

      <section className="cockpit-lower-grid">
        <div className="cockpit-panel">
          <PanelHeader title="Live Agent Runs" actionHref="/runs" actionLabel="Audit" />
          {view.runs.length === 0 ? (
            <Empty description="No agent runs have been dispatched." />
          ) : (
            <Space direction="vertical" size={0} className="dense-list">
              {view.runs.map((run) => (
                <Link key={run.id} href={`/issues/${run.rootIssueId}`} className="run-row">
                  <div>
                    <Text strong>{run.issue}</Text>
                    <Text type="secondary" className="mono-text">
                      {run.id}
                    </Text>
                  </div>
                  <Text>{run.agent}</Text>
                  <StatusBadge status={run.status} kind="run" compact />
                </Link>
              ))}
            </Space>
          )}
        </div>

        <div className="cockpit-panel">
          <PanelHeader title="Recent Evidence" actionHref="/knowledge" actionLabel="Knowledge" />
          {view.evidence.length === 0 ? (
            <div className="empty-inline">
              <FileSearchOutlined />
              <Text>Evidence will appear after agents produce logs, commits, reviews, or screenshots.</Text>
            </div>
          ) : (
            <Space direction="vertical" size={0} className="dense-list">
              {view.evidence.map((item) => (
                <a key={item.id} href={item.href ?? "/knowledge"} className="evidence-row">
                  <Tag>{item.kind}</Tag>
                  <div>
                    <Text strong>{item.title}</Text>
                    <Text type="secondary">{item.issue}</Text>
                  </div>
                  <Text type="secondary">{item.createdAt}</Text>
                </a>
              ))}
            </Space>
          )}
        </div>
      </section>
    </Space>
  );
}

function PanelHeader({
  title,
  actionHref,
  actionLabel
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Flex align="center" justify="space-between" gap={16} className="panel-header">
      <Title level={4}>{title}</Title>
      {actionHref && actionLabel ? (
        <Link href={actionHref}>
          <Button type="link" icon={<ArrowRightOutlined />}>
            {actionLabel}
          </Button>
        </Link>
      ) : null}
    </Flex>
  );
}

function AttentionCard({ item }: { item: CockpitAttentionItem }) {
  const icon = item.severity === "critical" ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />;

  return (
    <Link href={item.href} className={`attention-card attention-${item.severity}`}>
      <div className="attention-icon">{icon}</div>
      <div>
        <Flex align="center" gap={8} wrap>
          <Text strong>{item.title}</Text>
          <Tag>{item.source}</Tag>
        </Flex>
        <Paragraph type="secondary">{item.body}</Paragraph>
        <Flex align="center" justify="space-between" gap={12} wrap>
          <Text type="secondary">Owner: {item.owner}</Text>
          <Text strong>{item.action}</Text>
        </Flex>
      </div>
    </Link>
  );
}
