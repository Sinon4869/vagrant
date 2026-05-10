"use client";

import Link from "next/link";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDemoData } from "@/lib/demo-data";

const { Text } = Typography;

export default function RequirementsPage() {
  const { rootIssue, requirements, repositories, knowledgePages } = getDemoData();
  const columns: ColumnsType<(typeof requirements)[number]> = [
    {
      title: "Requirement tree",
      dataIndex: "title",
      render: (title, record) => (
        <Space direction="vertical" size={0}>
          <Link href={record.id === rootIssue.id ? `/issues/${record.id}` : "/requirements"}>
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
        ids.map((id) => <Tag key={id}>{repositories.find((repository) => repository.id === id)?.name}</Tag>)
    },
    {
      title: "Knowledge",
      dataIndex: "knowledgeIds",
      render: (ids: string[]) =>
        ids.map((id) => <Tag key={id} color="geekblue">{knowledgePages.find((page) => page.id === id)?.title}</Tag>)
    },
    { title: "Status", dataIndex: "status", width: 130, render: (status) => <StatusBadge status={status} /> },
    { title: "Progress", dataIndex: "progress", width: 180, render: (value: number) => <Progress percent={value} /> },
    { title: "Updated", dataIndex: "updatedAt", width: 160 }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Project vagrant"
        title="Requirements"
        description="Root issues are the execution spine. Each requirement links to repositories for worktree isolation and knowledge pages for agent context."
        actions={<Button type="primary" icon={<PlusOutlined />}>New requirement</Button>}
      />
      <Card title="Requirement linkage">
        <Table rowKey="id" columns={columns} dataSource={requirements} pagination={false} />
      </Card>
    </Space>
  );
}
