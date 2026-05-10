"use client";

import { Flex, Space, Typography } from "antd";

const { Paragraph, Text, Title } = Typography;

export function PageHeader({
  eyebrow,
  title,
  description,
  metadata,
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Flex align="flex-start" justify="space-between" gap={24} wrap className="page-header">
      <Space direction="vertical" size={4}>
        <Text type="secondary">{eyebrow}</Text>
        <Title level={2}>{title}</Title>
        <Paragraph type="secondary">{description}</Paragraph>
        {metadata}
      </Space>
      {actions}
    </Flex>
  );
}
