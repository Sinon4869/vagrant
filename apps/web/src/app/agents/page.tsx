"use client";

import { RobotOutlined } from "@ant-design/icons";
import { Card, List, Space, Statistic, Tag, Typography } from "antd";
import { PageHeader } from "@/components/page-header";
import { getDemoData } from "@/lib/demo-data";

const { Text } = Typography;

export default function AgentsPage() {
  const { agents } = getDemoData();

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow="Project vagrant"
        title="Agents"
        description="Agent profiles define ownership, runtime preference, execution scope, and review gates for this project."
      />
      <Card title="Agent profiles" extra={<RobotOutlined />}>
        <List
          grid={{ gutter: 16, xs: 1, md: 2, xl: 3 }}
          dataSource={agents}
          renderItem={(agent) => (
            <List.Item>
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Text strong>{agent.role}</Text>
                  <Text type="secondary">{agent.scope}</Text>
                  <Space>
                    <Tag color={agent.runtime === "Codex CLI" ? "blue" : "purple"}>{agent.runtime}</Tag>
                    <Statistic title="Active runs" value={agent.activeRuns} />
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
