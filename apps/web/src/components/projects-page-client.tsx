"use client";

import Link from "next/link";
import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { type ProjectRow, type ProjectsWorkspaceView } from "@/lib/workspace-store";

const { Text } = Typography;

export function ProjectsPageClient({ view }: { view: ProjectsWorkspaceView }) {
  const columns: ColumnsType<ProjectRow> = [
    {
      title: "Project",
      dataIndex: "name",
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <Link href="/">
            <Text strong>{name}</Text>
          </Link>
          <Text type="secondary">{record.description}</Text>
        </Space>
      )
    },
    { title: "Status", dataIndex: "status", render: (status) => <Tag color="blue">{status}</Tag> },
    { title: "Requirements", dataIndex: "requirements", width: 130 },
    { title: "Repositories", dataIndex: "repositories", width: 130 },
    { title: "Agents", dataIndex: "agents", width: 100 },
    { title: "Progress", dataIndex: "progress", width: 180, render: (value: number) => <Progress percent={value} /> },
    { title: "Updated", dataIndex: "updatedAt", width: 180 },
    {
      title: "",
      key: "action",
      width: 80,
      render: () => (
        <Link href="/">
          <Button icon={<ArrowRightOutlined />} />
        </Link>
      )
    }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Each project owns its requirements, wiki pages, repositories, agents, runs, inbox, and settings."
        actions={<Button type="primary" icon={<PlusOutlined />}>New project</Button>}
      />
      <Card title="Create project" extra={<PlusOutlined />}>
        <Form action="/projects/create" method="post" layout="vertical" className="project-form">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input name="name" placeholder="vagrant-services" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea name="description" rows={3} placeholder="Local-first multi-agent workspace for this product or repository group." />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Create project
          </Button>
        </Form>
      </Card>
      <Card title="Project registry">
        <Table rowKey="id" columns={columns} dataSource={view.projects} pagination={false} />
      </Card>
    </Space>
  );
}
