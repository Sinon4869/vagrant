"use client";

import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { type AgentRunStatus, IssueStatus } from "@vagrant/core";
import { Tag } from "antd";

type BadgeKind = "issue" | "run" | "approval";
type BadgeStatus = IssueStatus | AgentRunStatus | "approval_required" | "approved" | "changes_requested";
type BadgeConfig = { color: string; label: string; icon: React.ReactNode };

const issueConfig: Record<IssueStatus, BadgeConfig> = {
  [IssueStatus.Todo]: { color: "default", label: "Todo", icon: <ClockCircleOutlined /> },
  [IssueStatus.InProgress]: { color: "processing", label: "In progress", icon: <SyncOutlined spin /> },
  [IssueStatus.Blocked]: { color: "error", label: "Blocked", icon: <ExclamationCircleOutlined /> },
  [IssueStatus.InReview]: { color: "warning", label: "In review", icon: <ClockCircleOutlined /> },
  [IssueStatus.Done]: { color: "success", label: "Done", icon: <CheckCircleOutlined /> },
  [IssueStatus.Cancelled]: { color: "default", label: "Cancelled", icon: <CloseCircleOutlined /> }
};

const runConfig: Record<AgentRunStatus, BadgeConfig> = {
  queued: { color: "default", label: "Queued", icon: <ClockCircleOutlined /> },
  running: { color: "processing", label: "Running", icon: <SyncOutlined spin /> },
  succeeded: { color: "success", label: "Succeeded", icon: <CheckCircleOutlined /> },
  failed: { color: "error", label: "Failed", icon: <ExclamationCircleOutlined /> },
  cancelled: { color: "default", label: "Cancelled", icon: <CloseCircleOutlined /> }
};

const approvalConfig = {
  approval_required: { color: "warning", label: "Approval required", icon: <ClockCircleOutlined /> },
  approved: { color: "success", label: "Approved", icon: <CheckCircleOutlined /> },
  changes_requested: { color: "error", label: "Changes requested", icon: <ExclamationCircleOutlined /> }
} satisfies Record<"approval_required" | "approved" | "changes_requested", BadgeConfig>;

export function StatusBadge({
  status,
  kind = "issue",
  compact = false
}: {
  status: BadgeStatus;
  kind?: BadgeKind;
  compact?: boolean;
}) {
  const config = getConfig(status, kind);

  return (
    <Tag color={config.color} icon={config.icon} className={compact ? "status-badge compact" : "status-badge"}>
      {compact ? config.label : config.label}
    </Tag>
  );
}

function getConfig(status: BadgeStatus, kind: BadgeKind): BadgeConfig {
  if (kind === "run") {
    const runStatus = status as AgentRunStatus;
    return runConfig[runStatus] ?? runConfig.queued;
  }

  if (kind === "approval") {
    if (status === "approved" || status === "changes_requested" || status === "approval_required") {
      return approvalConfig[status];
    }

    return approvalConfig.approval_required;
  }

  const issueStatus = status as IssueStatus;
  return issueConfig[issueStatus] ?? issueConfig[IssueStatus.Todo];
}
