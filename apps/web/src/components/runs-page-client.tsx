"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CodeOutlined, FilterOutlined, PlayCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Form, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { type RunRow, type RunsWorkspaceView } from "@/lib/workspace-store";

const { Text } = Typography;

export function RunsPageClient({ view }: { view: RunsWorkspaceView }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [runtimeFilter, setRuntimeFilter] = useState("all");
  const [tickRuntimeKind, setTickRuntimeKind] = useState("mock");
  const [dispatchRootIssueId, setDispatchRootIssueId] = useState(view.requirements[0]?.id ?? "");
  const [dispatchRepositoryId, setDispatchRepositoryId] = useState(view.repositories[0]?.id ?? "");
  const [dispatchRuntimeKind, setDispatchRuntimeKind] = useState("mock");
  const filteredRuns = useMemo(
    () =>
      view.runs.filter((run) => {
        const statusMatch = statusFilter === "all" || run.status === statusFilter;
        const runtimeMatch = runtimeFilter === "all" || run.runtime === runtimeFilter;
        return statusMatch && runtimeMatch;
      }),
    [runtimeFilter, statusFilter, view.runs]
  );
  const runtimeOptions = Array.from(new Set(view.runs.map((run) => run.runtime))).map((runtime) => ({
    label: runtime,
    value: runtime
  }));

  const columns: ColumnsType<RunRow> = [
    {
      title: "Run",
      dataIndex: "id",
      render: (id) => <Text className="mono-text">{id}</Text>
    },
    {
      title: "Issue",
      dataIndex: "issue",
      render: (issue, record) => (
        <Space direction="vertical" size={0}>
          <Link href={`/issues/${record.rootIssueId}`}>
            <Text strong>{issue}</Text>
          </Link>
          <Text type="secondary" className="mono-text">{record.issueId}</Text>
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
      render: (status) => <StatusBadge status={status} kind="run" compact />
    },
    { title: "Evidence", dataIndex: "evidence" },
    { title: "Updated", dataIndex: "updatedAt", width: 180 }
  ];

  return (
    <Space direction="vertical" size={20} className="runs-audit-page">
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Runs Audit"
        description="Dispatch a ready subissue with mock, Codex CLI, or Claude CLI, then inspect the persisted agent run history."
      />

      <Card title="Dispatch ready issue" extra={<PlayCircleOutlined />}>
        <Flex gap={24} wrap align="flex-start">
          <Form action="/runs/tick" method="post" layout="vertical" className="run-dispatch-form">
            <input type="hidden" name="projectId" value={view.project.id} />
            <input type="hidden" name="runtimeKind" value={tickRuntimeKind} />
            <Form.Item label="Runtime" required>
              <Select value={tickRuntimeKind} options={[runtimeKindOptions[0]!]} onChange={setTickRuntimeKind} />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<ThunderboltOutlined />}>
              Run orchestration tick
            </Button>
          </Form>
          <Form action="/runs/dispatch" method="post" layout="vertical" className="run-dispatch-form">
            <input type="hidden" name="projectId" value={view.project.id} />
            <input type="hidden" name="rootIssueId" value={dispatchRootIssueId} />
            <input type="hidden" name="repositoryId" value={dispatchRepositoryId} />
            <input type="hidden" name="runtimeKind" value={dispatchRuntimeKind} />
            <Form.Item label="Root requirement" required>
              <Select
                value={dispatchRootIssueId}
                onChange={setDispatchRootIssueId}
                options={view.requirements.map((requirement) => ({
                  label: requirement.title,
                  value: requirement.id
                }))}
              />
            </Form.Item>
            <Form.Item label="Repository" required>
              <Select
                value={dispatchRepositoryId}
                onChange={setDispatchRepositoryId}
                options={view.repositories.map((repository) => ({
                  label: repository.name,
                  value: repository.id
                }))}
              />
            </Form.Item>
            <Form.Item label="Runtime" required>
              <Select value={dispatchRuntimeKind} options={runtimeKindOptions} onChange={setDispatchRuntimeKind} />
            </Form.Item>
            <Button htmlType="submit" icon={<PlayCircleOutlined />}>
              Dispatch selected root
            </Button>
          </Form>
        </Flex>
      </Card>

      <section className="queue-toolbar">
        <Flex align="center" justify="space-between" gap={16} wrap>
          <Space size={8} wrap>
            <Tag icon={<CodeOutlined />}>{view.runs.length} persisted runs</Tag>
            <Tag color={view.runs.some((run) => run.status === "failed") ? "error" : "success"}>
              {view.runs.filter((run) => run.status === "failed").length} failed
            </Tag>
          </Space>
          <Space size={8} wrap>
            <FilterOutlined />
            <Select
              aria-label="Filter runs by status"
              value={statusFilter}
              style={{ width: 160 }}
              onChange={setStatusFilter}
              options={[
                { label: "All statuses", value: "all" },
                { label: "Queued", value: "queued" },
                { label: "Running", value: "running" },
                { label: "Succeeded", value: "succeeded" },
                { label: "Failed", value: "failed" },
                { label: "Cancelled", value: "cancelled" }
              ]}
            />
            <Select
              aria-label="Filter runs by runtime"
              value={runtimeFilter}
              style={{ width: 180 }}
              onChange={setRuntimeFilter}
              options={[{ label: "All runtimes", value: "all" }, ...runtimeOptions]}
            />
          </Space>
        </Flex>
      </section>

      <section className="queue-panel">
        <Table rowKey="id" columns={columns} dataSource={filteredRuns} pagination={false} />
      </section>
    </Space>
  );
}

const runtimeKindOptions = [
  { label: "Mock Runtime", value: "mock" },
  { label: "Codex CLI", value: "codex_cli" },
  { label: "Claude CLI", value: "claude_cli" }
];
