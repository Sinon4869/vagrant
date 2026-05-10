import { describe, expect, it } from "vitest";

import { createNotificationItem } from "../domain.js";
import { createNotificationDecision, planEmailNotifications } from "../notifications.js";

describe("notifications", () => {
  it("sends the first approval notification", () => {
    const decision = createNotificationDecision({
      projectId: "project-1",
      rootIssueId: "root-1",
      type: "approval_required",
      subjectId: "approval-1",
      sentKeys: new Set()
    });

    expect(decision.shouldSendEmail).toBe(true);
    expect(decision.dedupeKey).toBe("project-1:root-1:approval_required:approval-1");
  });

  it("dedupes a repeated blocker notification", () => {
    const sentKeys = new Set(["project-1:root-1:blocked:blocker-1"]);
    const decision = createNotificationDecision({
      projectId: "project-1",
      rootIssueId: "root-1",
      type: "blocked",
      subjectId: "blocker-1",
      sentKeys
    });

    expect(decision.shouldSendEmail).toBe(false);
  });

  it("groups digest notifications while keeping immediate emails separate", () => {
    const notifications = [
      createNotificationItem({
        id: "notification-approval",
        projectId: "project-1",
        rootIssueId: "root-1",
        type: "approval_required",
        title: "Approval needed",
        body: "A run needs approval.",
        severity: "high",
        delivery: "immediate_email",
        dedupeKey: "project-1:root-1:approval_required:approval-1",
        now: "2026-05-10T00:00:00.000Z"
      }),
      createNotificationItem({
        id: "notification-digest-a",
        projectId: "project-1",
        rootIssueId: "root-1",
        type: "digest",
        title: "Requirement changed",
        delivery: "digest",
        dedupeKey: "project-1:root-1:digest:a",
        now: "2026-05-10T00:00:00.000Z"
      }),
      createNotificationItem({
        id: "notification-digest-b",
        projectId: "project-1",
        rootIssueId: "root-1",
        type: "digest",
        title: "Run completed",
        delivery: "digest",
        dedupeKey: "project-1:root-1:digest:b",
        now: "2026-05-10T00:00:00.000Z"
      })
    ];

    const plans = planEmailNotifications({
      projectId: "project-1",
      notifications,
      sentDedupeKeys: new Set(),
      now: "2026-05-10T19:00:00.000Z"
    });

    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({
      delivery: "immediate",
      notificationIds: ["notification-approval"],
      subject: "Approval needed"
    });
    expect(plans[1]).toMatchObject({
      delivery: "digest",
      notificationIds: ["notification-digest-a", "notification-digest-b"],
      subject: "2 project updates need attention"
    });
  });

  it("does not plan email for sent dedupe keys", () => {
    const notification = createNotificationItem({
      id: "notification-approval",
      projectId: "project-1",
      rootIssueId: "root-1",
      type: "approval_required",
      title: "Approval needed",
      delivery: "immediate_email",
      dedupeKey: "project-1:root-1:approval_required:approval-1",
      now: "2026-05-10T00:00:00.000Z"
    });

    const plans = planEmailNotifications({
      projectId: "project-1",
      notifications: [notification],
      sentDedupeKeys: new Set([notification.dedupeKey]),
      now: "2026-05-10T19:00:00.000Z"
    });

    expect(plans).toEqual([]);
  });
});
