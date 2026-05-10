"use client";

import { CodeOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Button, Card, Form, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { type RunRow, type RunsWorkspaceView } from "@/lib/workspace-store";

const { Text } = Typography;

export function RunsPageClient({ view }: { view: RunsWorkspaceView }) {
  const columns: ColumnsType<RunRow> = [
    { title: "Run", dataIndex: "id" },
    {
      title: "Issue",
      dataIndex: "issue",
      render: (issue, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{issue}</Text>
          <Text type="secondary">{record.issueId}</Text>
        </Space>
      )
    },
    { title: "Agent", dataIndex: "agent", width: 160 },
    { title: "Runtime", dataIndex: "runtime", width: 140, render: (runtime) => <Tag color="blue">{runtime}</Tag> },
    { title: "Repository", dataIndex: "repository", width: 130 },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status) => <Tag color={status === "succeeded" ? "success" : "processing"}>{status}</Tag>
    },
    { title: "Evidence", dataIndex: "evidence" },
    { title: "Updated", dataIndex: "updatedAt", width: 180 }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Runs"
        description="Dispatch a ready subissue with the mock runtime, then inspect the persisted agent run history."
      />

      <Card title="Dispatch ready issue" extra={<PlayCircleOutlined />}>
        <Form action="/runs/dispatch" method="post" layout="vertical" className="run-dispatch-form">
          <input type="hidden" name="projectId" value={view.project.id} />
          <Form.Item label="Root requirement" name="rootIssueId" rules={[{ required: true }]}>
            <Select
              options={view.requirements.map((requirement) => ({
                label: requirement.title,
                value: requirement.id
              }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />}>
            Dispatch mock run
          </Button>
        </Form>
      </Card>

      <Card title="Agent run history" extra={<CodeOutlined />}>
        <Table rowKey="id" columns={columns} dataSource={view.runs} pagination={false} />
      </Card>
    </Space>
  );
}
