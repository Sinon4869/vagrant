"use client";

import { SettingOutlined } from "@ant-design/icons";
import { Card, Descriptions, Space, Tag } from "antd";
import { PageHeader } from "@/components/page-header";
import { getDemoData } from "@/lib/demo-data";

export default function SettingsPage() {
  const { project, repositories } = getDemoData();

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Project vagrant"
        title="Settings"
        description="Project-level defaults control repository selection, runtime preference, approval gates, and notification delivery."
      />
      <Card title="Project settings" extra={<SettingOutlined />}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Project name">{project.name}</Descriptions.Item>
          <Descriptions.Item label="Default runtime"><Tag color="blue">Codex CLI</Tag></Descriptions.Item>
          <Descriptions.Item label="Fallback runtime"><Tag color="purple">Claude CLI</Tag></Descriptions.Item>
          <Descriptions.Item label="Default repository">{repositories[0]?.name}</Descriptions.Item>
          <Descriptions.Item label="Approval gates">
            Production release, destructive git operations, credential access, external cost
          </Descriptions.Item>
          <Descriptions.Item label="Email policy">Digest first, immediate only for blocking approvals</Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}
