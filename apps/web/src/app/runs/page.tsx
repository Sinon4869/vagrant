"use client";

import { CodeOutlined } from "@ant-design/icons";
import { Card, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { getDemoData } from "@/lib/demo-data";

export default function RunsPage() {
  const { runs } = getDemoData();
  const columns: ColumnsType<(typeof runs)[number]> = [
    { title: "Run", dataIndex: "id" },
    { title: "Issue", dataIndex: "issue" },
    { title: "Agent", dataIndex: "agent", width: 160 },
    { title: "Runtime", dataIndex: "runtime", width: 120, render: (runtime) => <Tag color="blue">{runtime}</Tag> },
    { title: "Repository", dataIndex: "repository", width: 130 },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status) => <Tag color={status === "succeeded" ? "success" : "processing"}>{status}</Tag>
    },
    { title: "Evidence", dataIndex: "evidence" },
    { title: "Updated", dataIndex: "updatedAt", width: 160 }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Project vagrant"
        title="Runs"
        description="Every agent execution records runtime, repository, worktree, logs, evidence, and handoff status."
      />
      <Card title="Agent run history" extra={<CodeOutlined />}>
        <Table rowKey="id" columns={columns} dataSource={runs} pagination={false} />
      </Card>
    </Space>
  );
}
