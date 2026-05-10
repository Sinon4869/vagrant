"use client";

import Link from "next/link";
import { Layout, Menu, Typography } from "antd";

const { Header, Content } = Layout;
const { Text } = Typography;

const navItems = ["Projects", "Issues", "Agents", "Runs", "Wiki", "Providers", "Notifications", "Settings"];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Link href="/" className="brand-link">
          Vagrant
        </Link>
        <Menu
          mode="horizontal"
          selectable={false}
          className="top-nav"
          items={navItems.map((item) => ({ key: item, label: <Text type="secondary">{item}</Text> }))}
        />
      </Header>
      <Content className="app-content">{children}</Content>
    </Layout>
  );
}
