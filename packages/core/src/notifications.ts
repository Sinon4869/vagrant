import { type NotificationItem, type NotificationType } from "./domain.js";

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

export interface EmailNotificationPlan {
  id: string;
  projectId: string;
  notificationIds: string[];
  subject: string;
  body: string;
  delivery: "immediate" | "digest";
  dedupeKey: string;
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

export function planEmailNotifications(input: {
  projectId: string;
  notifications: NotificationItem[];
  sentDedupeKeys: Set<string>;
  now: string;
}): EmailNotificationPlan[] {
  const pending = input.notifications.filter((notification) => {
    return notification.emailSentAt === null && !input.sentDedupeKeys.has(notification.dedupeKey);
  });
  const immediate = pending
    .filter((notification) => notification.delivery === "immediate_email")
    .map((notification) => ({
      id: `email-${notification.id}`,
      projectId: input.projectId,
      notificationIds: [notification.id],
      subject: notification.title,
      body: notification.body || notification.title,
      delivery: "immediate" as const,
      dedupeKey: notification.dedupeKey
    }));
  const digestItems = pending.filter((notification) => notification.delivery === "digest");
  const digest = digestItems.length === 0
    ? []
    : [{
      id: `email-digest-${input.projectId}-${input.now.slice(0, 10)}`,
      projectId: input.projectId,
      notificationIds: digestItems.map((notification) => notification.id),
      subject: `${digestItems.length} project updates need attention`,
      body: digestItems.map((notification) => `- ${notification.title}`).join("\n"),
      delivery: "digest" as const,
      dedupeKey: `${input.projectId}:digest:${input.now.slice(0, 10)}`
    }];

  return [...immediate, ...digest];
}
