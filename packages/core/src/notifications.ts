export type NotificationType =
  | "approval_required"
  | "blocked"
  | "failed_after_retry"
  | "root_issue_completed"
  | "digest";

export interface NotificationDecisionInput {
  projectId: string;
  rootIssueId: string;
  type: NotificationType;
  subjectId: string;
  sentKeys: Set<string>;
}

export interface NotificationDecision {
  dedupeKey: string;
  shouldSendEmail: boolean;
  reason: string;
}

export function createNotificationDecision(input: NotificationDecisionInput): NotificationDecision {
  const dedupeKey = `${input.projectId}:${input.rootIssueId}:${input.type}:${input.subjectId}`;
  const immediateTypes: NotificationType[] = [
    "approval_required",
    "blocked",
    "failed_after_retry",
    "root_issue_completed"
  ];

  if (input.sentKeys.has(dedupeKey)) {
    return {
      dedupeKey,
      shouldSendEmail: false,
      reason: "Notification with the same dedupe key was already sent."
    };
  }

  const shouldSendEmail = immediateTypes.includes(input.type);

  return {
    dedupeKey,
    shouldSendEmail,
    reason: shouldSendEmail
      ? "Immediate email notification is allowed for this type."
      : "Event should be included in a digest."
  };
}
