"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellOutlined,
  BookOutlined,
  BranchesOutlined,
  BuildOutlined,
  CodeOutlined,
  DashboardOutlined,
  FolderOpenOutlined,
  NodeIndexOutlined,
  ProjectOutlined,
  RobotOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { Button, Flex, Layout, Menu, Space, Tag, Typography } from "antd";
import { getDemoData } from "@/lib/demo-data";

const { Content, Sider } = Layout;
const { Text, Title } = Typography;

const navItems = [
  { key: "/", href: "/", icon: <DashboardOutlined />, label: "Overview" },
  { key: "/projects", href: "/projects", icon: <ProjectOutlined />, label: "Projects" },
  { key: "/requirements", href: "/requirements", icon: <NodeIndexOutlined />, label: "Requirements" },
  { key: "/knowledge", href: "/knowledge", icon: <BookOutlined />, label: "Knowledge" },
  { key: "/repositories", href: "/repositories", icon: <BranchesOutlined />, label: "Repositories" },
  { key: "/agents", href: "/agents", icon: <RobotOutlined />, label: "Agents" },
  { key: "/runs", href: "/runs", icon: <CodeOutlined />, label: "Runs" },
  { key: "/inbox", href: "/inbox", icon: <BellOutlined />, label: "Inbox" },
  { key: "/settings", href: "/settings", icon: <SettingOutlined />, label: "Settings" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { project } = getDemoData();
  const selectedKey =
    navItems
      .filter((item) => item.key !== "/" && pathname.startsWith(item.key))
      .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? "/";

  return (
    <Layout className="app-shell" hasSider>
      <Sider width={264} className="app-sider" theme="light">
        <div className="sider-brand">
          <Link href="/" className="brand-link">
            <BuildOutlined />
            <span>Vagrant</span>
          </Link>
          <Tag color="blue">local</Tag>
        </div>

        <div className="project-switcher">
          <Text type="secondary">Current project</Text>
          <Title level={5}>{project.name}</Title>
          <Text type="secondary" className="project-path">
            {project.repositoryUrl}
          </Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          className="side-nav"
          items={navItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link href={item.href}>{item.label}</Link>
          }))}
        />

        <div className="sider-footer">
          <Text type="secondary">Autopilot</Text>
          <Flex align="center" justify="space-between" gap={12}>
            <Tag color="processing">Ready</Tag>
            <Text type="secondary">Codex CLI</Text>
          </Flex>
        </div>
      </Sider>

      <Layout className="main-layout">
        <div className="app-topbar">
          <Space direction="vertical" size={0}>
            <Text type="secondary">Project workspace</Text>
            <Text strong>{project.description}</Text>
          </Space>
          <Space>
            <Button icon={<FolderOpenOutlined />}>Open worktree</Button>
            <Button type="primary" icon={<NodeIndexOutlined />}>
              New requirement
            </Button>
          </Space>
        </div>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
