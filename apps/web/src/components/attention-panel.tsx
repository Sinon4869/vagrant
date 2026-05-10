"use client";

import { Card, List, Typography } from "antd";

const { Text, Title } = Typography;

interface AttentionItem {
  id: string;
  type: string;
  title: string;
  body: string;
}

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <Card title="Current Attention" size="small">
      <List
        dataSource={items}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Title level={5} style={{ margin: 0 }}>
                  {item.title}
                </Title>
              }
              description={
                <>
                  <Text type="secondary">{item.type}</Text>
                  <br />
                  <Text type="secondary">{item.body}</Text>
                </>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
