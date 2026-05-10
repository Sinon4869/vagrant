import { describe, expect, it } from "vitest";

import { createNotificationDecision } from "../notifications.js";

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
});
