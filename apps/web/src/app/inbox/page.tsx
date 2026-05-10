"use client";

import { BellOutlined } from "@ant-design/icons";
import { Card, List, Space, Tag, Typography } from "antd";
import { PageHeader } from "@/components/page-header";
import { getDemoData } from "@/lib/demo-data";

const { Text } = Typography;

export default function InboxPage() {
  const { inbox } = getDemoData();

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Project vagrant"
        title="Inbox"
        description="Project notifications are grouped into attention items and digest emails to avoid notification storms."
      />
      <Card title="Attention queue" extra={<BellOutlined />}>
        <List
          dataSource={inbox}
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
    </Space>
  );
}
