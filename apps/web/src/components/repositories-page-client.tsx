"use client";

import { BranchesOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { addRepositoryAction } from "@/app/repositories/actions";
import { PageHeader } from "@/components/page-header";
import { type RepositoryRow, type RepositoryWorkspaceView } from "@/lib/workspace-store";

const { Text } = Typography;

export function RepositoriesPageClient({ view }: { view: RepositoryWorkspaceView }) {
  const columns: ColumnsType<RepositoryRow> = [
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
    {
      title: "Remote",
      dataIndex: "remoteUrl",
      render: (url) => (url ? <Text copyable>{url}</Text> : <Text type="secondary">Local only</Text>)
    },
    { title: "Base", dataIndex: "baseBranch", width: 100 },
    { title: "Requirements", dataIndex: "linkedRequirements", width: 130 },
    {
      title: "Health",
      dataIndex: "health",
      width: 130,
      render: (health) => <Tag color={health === "Configured" ? "success" : "default"}>{health}</Tag>
    }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Repositories"
        description="Repositories are configurable per project and can point to GitHub, GitLab, Gitea, Bitbucket, a private git server, or a local checkout."
      />

      <Card title="Add repository" extra={<PlusOutlined />}>
        <Form action={addRepositoryAction} layout="vertical" className="repository-form">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input name="name" placeholder="vagrant-services" />
          </Form.Item>
          <Form.Item label="Local path" name="localPath" rules={[{ required: true }]}>
            <Input name="localPath" placeholder="/Users/asuka/Documents/vagrant-services" />
          </Form.Item>
          <Form.Item label="Provider" name="providerType" initialValue="generic_git" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Generic Git", value: "generic_git" },
                { label: "GitHub", value: "github" },
                { label: "GitLab", value: "gitlab" },
                { label: "Gitea", value: "gitea" },
                { label: "Bitbucket", value: "bitbucket" },
                { label: "Local Only", value: "local_only" }
              ]}
            />
          </Form.Item>
          <Form.Item label="Remote URL" name="remoteUrl">
            <Input name="remoteUrl" placeholder="ssh://git.internal.local/team/repo.git" />
          </Form.Item>
          <Form.Item label="Base branch" name="defaultBaseBranch" initialValue="main" rules={[{ required: true }]}>
            <Input name="defaultBaseBranch" placeholder="main" />
          </Form.Item>
          <Form.Item label="Branch prefix" name="branchNamePrefix" initialValue="vagrant">
            <Input name="branchNamePrefix" placeholder="vagrant" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Add repository
          </Button>
        </Form>
      </Card>

      <Card title="Configured repositories" extra={<BranchesOutlined />}>
        <Table rowKey="id" columns={columns} dataSource={view.repositories} pagination={false} />
      </Card>
    </Space>
  );
}
