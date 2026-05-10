import { describe, expect, it } from "vitest";
import { createEmailOutboxItem } from "../domain.js";
import { sendQueuedEmailOutbox } from "../email-sender.js";
import type { WorkspaceStore } from "../workspace-store.js";

describe("sendQueuedEmailOutbox", () => {
  it("marks queued outbox items as sent with the log transport", async () => {
    const store = new MemoryEmailStore([
      createEmailOutboxItem({
        id: "email-1",
        projectId: "project-1",
        notificationIds: ["notification-1"],
        subject: "Approval required",
        body: "Review the gate.",
        delivery: "immediate",
        dedupeKey: "dedupe-1",
        now: "2026-05-10T00:00:00.000Z"
      })
    ]);

    const result = await sendQueuedEmailOutbox({
      store,
      projectId: "project-1",
      transport: "log",
      now: "2026-05-10T01:00:00.000Z"
    });

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect((await store.listEmailOutbox("project-1"))[0]).toMatchObject({
      id: "email-1",
      status: "sent",
      sentAt: "2026-05-10T01:00:00.000Z",
      updatedAt: "2026-05-10T01:00:00.000Z"
    });
  });

  it("marks queued outbox items as failed when transport is disabled", async () => {
    const store = new MemoryEmailStore([
      createEmailOutboxItem({
        id: "email-1",
        projectId: "project-1",
        notificationIds: ["notification-1"],
        subject: "Approval required",
        body: "Review the gate.",
        delivery: "immediate",
        dedupeKey: "dedupe-1",
        now: "2026-05-10T00:00:00.000Z"
      })
    ]);

    const result = await sendQueuedEmailOutbox({
      store,
      projectId: "project-1",
      transport: "disabled",
      now: "2026-05-10T01:00:00.000Z"
    });

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect((await store.listEmailOutbox("project-1"))[0]).toMatchObject({
      id: "email-1",
      status: "failed",
      sentAt: null,
      updatedAt: "2026-05-10T01:00:00.000Z"
    });
  });

  it("does not count previously sent items as newly sent", async () => {
    const store = new MemoryEmailStore([
      createEmailOutboxItem({
        id: "email-1",
        projectId: "project-1",
        notificationIds: ["notification-1"],
        subject: "Already sent",
        body: "This was sent earlier.",
        delivery: "digest",
        dedupeKey: "dedupe-1",
        status: "sent",
        sentAt: "2026-05-10T00:30:00.000Z",
        now: "2026-05-10T00:00:00.000Z"
      })
    ]);

    const result = await sendQueuedEmailOutbox({
      store,
      projectId: "project-1",
      transport: "log",
      now: "2026-05-10T01:00:00.000Z"
    });

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(1);
  });
});

class MemoryEmailStore implements Pick<WorkspaceStore, "listEmailOutbox" | "upsertEmailOutboxItem"> {
  constructor(private readonly items: Awaited<ReturnType<WorkspaceStore["listEmailOutbox"]>>) {}

  async listEmailOutbox(projectId: string) {
    return this.items.filter((item) => item.projectId === projectId);
  }

  async upsertEmailOutboxItem(item: Awaited<ReturnType<WorkspaceStore["listEmailOutbox"]>>[number]) {
    const index = this.items.findIndex((existing) => existing.id === item.id);
    if (index >= 0) {
      this.items[index] = item;
    } else {
      this.items.push(item);
    }
  }
}
