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

const navGroups = [
  {
    label: "Primary",
    items: [
      { key: "/", href: "/", icon: <DashboardOutlined />, label: "Operations" },
      { key: "/requirements", href: "/requirements", icon: <NodeIndexOutlined />, label: "Requirements" },
      { key: "/runs", href: "/runs", icon: <CodeOutlined />, label: "Runs" },
      { key: "/inbox", href: "/inbox", icon: <BellOutlined />, label: "Inbox" }
    ]
  },
  {
    label: "Project",
    items: [
      { key: "/projects", href: "/projects", icon: <ProjectOutlined />, label: "Projects" },
      { key: "/repositories", href: "/repositories", icon: <BranchesOutlined />, label: "Repositories" },
      { key: "/knowledge", href: "/knowledge", icon: <BookOutlined />, label: "Knowledge" },
      { key: "/agents", href: "/agents", icon: <RobotOutlined />, label: "Agents" }
    ]
  },
  {
    label: "System",
    items: [
      { key: "/settings", href: "/settings", icon: <SettingOutlined />, label: "Settings" }
    ]
  }
];

const navItems = navGroups.flatMap((group) => group.items);

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

        <nav className="nav-groups" aria-label="Application navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <Text type="secondary" className="nav-group-label">
                {group.label}
              </Text>
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                className="side-nav"
                items={group.items.map((item) => ({
                  key: item.key,
                  icon: item.icon,
                  label: <Link href={item.href}>{item.label}</Link>
                }))}
              />
            </div>
          ))}
        </nav>

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
          <Space wrap>
            <Link href="/repositories">
              <Button icon={<FolderOpenOutlined />}>Repositories</Button>
            </Link>
            <Link href="/requirements">
              <Button type="primary" icon={<NodeIndexOutlined />}>
              New requirement
              </Button>
            </Link>
          </Space>
        </div>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
