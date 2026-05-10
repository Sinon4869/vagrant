"use client";

import { BranchesOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { getDemoData } from "@/lib/demo-data";

const { Text } = Typography;

export default function RepositoriesPage() {
  const { repositories } = getDemoData();
  const columns: ColumnsType<(typeof repositories)[number]> = [
    {
      title: "Repository",
      dataIndex: "name",
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary">{record.localPath}</Text>
        </Space>
      )
    },
    { title: "Provider", dataIndex: "provider", width: 140, render: (provider) => <Tag>{provider}</Tag> },
    { title: "Remote", dataIndex: "remoteUrl", render: (url) => url ? <Text copyable>{url}</Text> : <Text type="secondary">Local only</Text> },
    { title: "Base", dataIndex: "baseBranch", width: 100 },
    { title: "Requirements", dataIndex: "linkedRequirements", width: 130 },
    {
      title: "Health",
      dataIndex: "health",
      width: 130,
      render: (health) => <Tag color={health === "Synced" ? "success" : health === "Needs fetch" ? "warning" : "default"}>{health}</Tag>
    }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Project vagrant"
        title="Repositories"
        description="Repositories are configurable per project and can point to GitHub, GitLab, Gitea, Bitbucket, a private git server, or a local checkout."
        actions={<Button type="primary" icon={<PlusOutlined />}>Add repository</Button>}
      />
      <Card title="Configured repositories" extra={<BranchesOutlined />}>
        <Table rowKey="id" columns={columns} dataSource={repositories} pagination={false} />
      </Card>
    </Space>
  );
}
