"use client";

import { IssueStatus } from "@vagrant/core";
import { Tag } from "antd";

const colors: Record<IssueStatus, string> = {
  [IssueStatus.Todo]: "default",
  [IssueStatus.InProgress]: "processing",
  [IssueStatus.Blocked]: "error",
  [IssueStatus.InReview]: "warning",
  [IssueStatus.Done]: "success",
  [IssueStatus.Cancelled]: "default"
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return <Tag color={colors[status]}>{status.replace("_", " ")}</Tag>;
}
