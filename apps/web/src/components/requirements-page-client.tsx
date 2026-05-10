"use client";

import Link from "next/link";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Progress, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  type RequirementRow,
  type RequirementsWorkspaceView
} from "@/lib/workspace-store";

const { Text } = Typography;

export function RequirementsPageClient({ view }: { view: RequirementsWorkspaceView }) {
  const columns: ColumnsType<RequirementRow> = [
    {
      title: "Requirement tree",
      dataIndex: "title",
      render: (title, record) => (
        <Space direction="vertical" size={0}>
          <Link href={`/issues/${record.id}`}>
            <Text strong>{title}</Text>
          </Link>
          <Text type="secondary">{record.subissues} subissues · owner {record.owner}</Text>
        </Space>
      )
    },
    {
      title: "Repositories",
      dataIndex: "repositoryIds",
      render: (ids: string[]) =>
        ids.map((id) => <Tag key={id}>{view.repositories.find((repository) => repository.id === id)?.name}</Tag>)
    },
    {
      title: "Knowledge",
      dataIndex: "knowledgeIds",
      render: (ids: string[]) =>
        ids.length > 0 ? ids.map((id) => <Tag key={id} color="geekblue">{id}</Tag>) : <Text type="secondary">Unlinked</Text>
    },
    { title: "Status", dataIndex: "status", width: 130, render: (status) => <StatusBadge status={status} /> },
    { title: "Progress", dataIndex: "progress", width: 180, render: (value: number) => <Progress percent={value} /> },
    { title: "Updated", dataIndex: "updatedAt", width: 180 }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Requirements"
        description="Root issues are the execution spine. Each requirement is immediately decomposed into visible subissues."
      />

      <Card title="Create requirement" extra={<PlusOutlined />}>
        <Form action="/requirements/create" method="post" layout="vertical" className="requirement-form">
          <input type="hidden" name="projectId" value={view.project.id} />
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input name="title" placeholder="Add repository settings screen" />
          </Form.Item>
          <Form.Item label="Description" name="description" rules={[{ required: true }]}>
            <Input.TextArea name="description" rows={3} placeholder="Describe expected behavior, constraints, and acceptance signals." />
          </Form.Item>
          <Form.Item label="Area" name="area" initialValue="frontend" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Frontend", value: "frontend" },
                { label: "Backend", value: "backend" },
                { label: "Full stack", value: "full_stack" },
                { label: "DevOps", value: "devops" },
                { label: "Documentation", value: "documentation" }
              ]}
            />
          </Form.Item>
          <Form.Item label="Complexity" name="complexity" initialValue="small" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Small", value: "small" },
                { label: "Medium", value: "medium" },
                { label: "Large", value: "large" }
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Plan requirement
          </Button>
        </Form>
      </Card>

      <Card title="Requirement linkage">
        <Table rowKey="id" columns={columns} dataSource={view.requirements} pagination={false} />
      </Card>
    </Space>
  );
}
