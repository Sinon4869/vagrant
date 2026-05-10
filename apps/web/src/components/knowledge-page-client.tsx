"use client";

import { BookOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, List, Space, Tag, Typography } from "antd";
import { PageHeader } from "@/components/page-header";
import { type KnowledgeWorkspaceView } from "@/lib/workspace-store";

const { Text } = Typography;

export function KnowledgePageClient({ view }: { view: KnowledgeWorkspaceView }) {
  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        eyebrow={`Project ${view.project.name}`}
        title="Knowledge"
        description="The project wiki stores architecture notes, runtime policy, decisions, commands, failure patterns, and evidence references."
        actions={<Button type="primary" icon={<PlusOutlined />}>New page</Button>}
      />
      <Card title="Wiki pages linked to delivery" extra={<BookOutlined />}>
        <List
          dataSource={view.knowledgePages}
          renderItem={(page) => (
            <List.Item>
              <List.Item.Meta
                title={page.title}
                description={
                  <Space direction="vertical" size={6}>
                    <Text type="secondary">Updated {page.updatedAt}</Text>
                    <Space wrap>
                      {page.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    </Space>
                    <Text type="secondary">
                      Requirements: {page.linkedRequirements.map((id) => view.requirements.find((item) => item.id === id)?.title ?? id).join(", ")}
                    </Text>
                    <Text type="secondary">
                      Repositories: {page.linkedRepositories.map((id) => view.repositories.find((item) => item.id === id)?.name ?? id).join(", ")}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
