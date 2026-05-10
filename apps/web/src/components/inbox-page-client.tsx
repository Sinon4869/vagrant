"use client";

import { BellOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Card, Flex, List, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/page-header";
import { type EmailOutboxRow, type InboxWorkspaceView } from "@/lib/workspace-store";

const { Text } = Typography;

export function InboxPageClient({ view }: { view: InboxWorkspaceView }) {
  const emailColumns: ColumnsType<EmailOutboxRow> = [
    { title: "Subject", dataIndex: "subject" },
    {
      title: "Delivery",
      dataIndex: "delivery",
      width: 130,
      render: (delivery) => <Tag color={delivery === "Immediate" ? "warning" : "blue"}>{delivery}</Tag>
    },
    { title: "Items", dataIndex: "notifications", width: 90 },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status) => <Tag color={status === "sent" ? "success" : status === "failed" ? "error" : "default"}>{status}</Tag>
    },
    {
      title: "Sent",
      dataIndex: "sentAt",
      width: 150,
      render: (sentAt) => sentAt ?? <Text type="secondary">Not sent</Text>
    },
    {
      title: "Dedupe key",
      dataIndex: "dedupeKey",
      render: (dedupeKey) => <Text code>{dedupeKey}</Text>
    }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Inbox"
        description="Project notifications are grouped into attention items and digest emails to avoid notification storms."
      />
      <Card title="Attention queue" extra={<BellOutlined />}>
        <List
          dataSource={view.inbox}
          renderItem={(item) => (
            <List.Item actions={[<Tag key="severity" color={item.severity === "High" ? "error" : "default"}>{item.severity}</Tag>]}>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={item.type === "Approval" ? "warning" : "blue"}>{item.type}</Tag>
                    <Text strong>{item.title}</Text>
                  </Space>
                }
                description={`${item.target} · ${item.delivery}`}
              />
            </List.Item>
          )}
        />
      </Card>
      <Card
        title="Email outbox"
        extra={
          <Flex align="center" gap={8}>
            <MailOutlined />
            <form action="/inbox/send" method="post">
              <input type="hidden" name="projectId" value={view.project.id} />
              <Button htmlType="submit" size="small">
                Send queued
              </Button>
            </form>
          </Flex>
        }
      >
        <Table rowKey="id" columns={emailColumns} dataSource={view.emailOutbox} pagination={false} />
      </Card>
    </Space>
  );
}
