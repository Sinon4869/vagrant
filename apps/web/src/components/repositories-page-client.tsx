"use client";

import { useState } from "react";
import { BranchesOutlined, CheckCircleOutlined, FolderOpenOutlined, LinkOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Empty, Flex, Form, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { type RepositoryRow, type RepositoryWorkspaceView } from "@/lib/workspace-store";

const { Text } = Typography;

export function RepositoriesPageClient({ view }: { view: RepositoryWorkspaceView }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const columns: ColumnsType<RepositoryRow> = [
    {
      title: "Repository",
      dataIndex: "name",
      render: (name, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{name}</Text>
          <Text type="secondary" className="mono-text">{record.localPath}</Text>
        </Space>
      )
    },
    { title: "Provider", dataIndex: "provider", width: 140, render: (provider) => <Tag>{provider}</Tag> },
    {
      title: "Remote",
      dataIndex: "remoteUrl",
      render: (url) => (url ? <Text copyable className="mono-text">{url}</Text> : <Text type="secondary">Local only</Text>)
    },
    { title: "Base", dataIndex: "baseBranch", width: 100, render: (branch) => <Text className="mono-text">{branch}</Text> },
    { title: "Requirements", dataIndex: "linkedRequirements", width: 130 },
    {
      title: "Health",
      dataIndex: "health",
      width: 210,
      render: (health, record) => (
        <Space size={6} wrap>
          <Tag icon={<FolderOpenOutlined />} color="success">Path tracked</Tag>
          <Tag icon={record.remoteUrl ? <LinkOutlined /> : <CheckCircleOutlined />} color={health === "Configured" ? "success" : "default"}>
            {health}
          </Tag>
        </Space>
      )
    }
  ];

  return (
    <Space direction="vertical" size={20} className="repositories-control-page">
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Repositories Control"
        description="Repositories are configurable per project and can point to GitHub, GitLab, Gitea, Bitbucket, a private git server, or a local checkout."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            Add repository
          </Button>
        }
      />

      <section className="queue-toolbar">
        <Flex align="center" justify="space-between" gap={16} wrap>
          <Space size={8} wrap>
            <Tag icon={<BranchesOutlined />}>{view.repositories.length} configured repositories</Tag>
            <Tag color={view.repositories.some((repo) => repo.remoteUrl) ? "success" : "default"}>
              {view.repositories.filter((repo) => repo.remoteUrl).length} remote-backed
            </Tag>
          </Space>
          <Text type="secondary">Provider can be any Git service or local-only.</Text>
        </Flex>
      </section>

      <section className="queue-panel">
        {view.repositories.length === 0 ? (
          <Empty description="No repositories configured for this project.">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
              Add repository
            </Button>
          </Empty>
        ) : (
          <Table rowKey="id" columns={columns} dataSource={view.repositories} pagination={false} />
        )}
      </section>

      <Drawer
        title="Add repository"
        open={drawerOpen}
        width={560}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form action="/repositories/create" method="post" layout="vertical" className="repository-form">
          <input type="hidden" name="projectId" value={view.project.id} />
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
      </Drawer>
    </Space>
  );
}
