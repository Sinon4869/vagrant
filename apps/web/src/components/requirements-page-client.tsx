"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FilterOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Empty, Flex, Form, Input, Progress, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  type RequirementRow,
  type RequirementsWorkspaceView
} from "@/lib/workspace-store";

const { Text } = Typography;

export function RequirementsPageClient({ view }: { view: RequirementsWorkspaceView }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filteredRequirements = useMemo(
    () =>
      statusFilter === "all"
        ? view.requirements
        : view.requirements.filter((requirement) => requirement.status === statusFilter),
    [statusFilter, view.requirements]
  );

  const columns: ColumnsType<RequirementRow> = [
    {
      title: "Requirement tree",
      dataIndex: "title",
      render: (title, record) => (
        <Space direction="vertical" size={2}>
          <Link href={`/issues/${record.id}`}>
            <Text strong>{title}</Text>
          </Link>
          <Text type="secondary" className="mono-text">
            {record.id}
          </Text>
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
    { title: "Progress", dataIndex: "progress", width: 180, render: (value: number) => <Progress percent={value} size="small" /> },
    { title: "Updated", dataIndex: "updatedAt", width: 180 }
  ];

  return (
    <Space direction="vertical" size={20} className="requirements-queue-page">
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Requirements Queue"
        description="Root issues are the execution queue. Each requirement links to its issue tree, repositories, knowledge, owner, and delivery state."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            Plan requirement
          </Button>
        }
      />

      <section className="queue-toolbar">
        <Flex align="center" justify="space-between" gap={16} wrap>
          <Space size={8} wrap>
            <Tag>{view.requirements.length} root requirements</Tag>
            <Tag>{view.repositories.length} repositories</Tag>
            <Tag color={view.repositories.length === 0 ? "warning" : "success"}>
              {view.repositories.length === 0 ? "Repository missing" : "Repository linked"}
            </Tag>
          </Space>
          <Space size={8} wrap>
            <FilterOutlined />
            <Select
              aria-label="Filter requirements by status"
              value={statusFilter}
              style={{ width: 180 }}
              onChange={setStatusFilter}
              options={[
                { label: "All statuses", value: "all" },
                { label: "Todo", value: "todo" },
                { label: "In progress", value: "in_progress" },
                { label: "Blocked", value: "blocked" },
                { label: "In review", value: "in_review" },
                { label: "Done", value: "done" },
                { label: "Cancelled", value: "cancelled" }
              ]}
            />
          </Space>
        </Flex>
      </section>

      <section className="queue-panel">
        {view.requirements.length === 0 ? (
          <Empty
            description={view.repositories.length === 0 ? "Configure a repository before planning requirements." : "No requirements planned yet."}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
              Plan requirement
            </Button>
          </Empty>
        ) : (
          <Table rowKey="id" columns={columns} dataSource={filteredRequirements} pagination={false} />
        )}
      </section>

      <Drawer
        title="Plan requirement"
        open={drawerOpen}
        width={560}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
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
      </Drawer>
    </Space>
  );
}
