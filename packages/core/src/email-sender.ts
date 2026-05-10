import {
  type EmailOutboxItem,
  markEmailOutboxItemFailed,
  markEmailOutboxItemSent
} from "./domain.js";
import type { WorkspaceStore } from "./workspace-store.js";

export type EmailTransportKind = "log" | "disabled";

export interface EmailSendResult {
  itemId: string;
  status: EmailOutboxItem["status"];
}

export interface SendQueuedEmailOutboxInput {
  store: WorkspaceStore;
  projectId: string;
  transport?: EmailTransportKind;
  now?: string;
}

export interface SendQueuedEmailOutboxResult {
  sent: number;
  failed: number;
  skipped: number;
  results: EmailSendResult[];
}

export async function sendQueuedEmailOutbox(
  input: SendQueuedEmailOutboxInput
): Promise<SendQueuedEmailOutboxResult> {
  const transport = input.transport ?? "log";
  const now = input.now ?? new Date().toISOString();
  const items = await input.store.listEmailOutbox(input.projectId);
  const results: EmailSendResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.status !== "queued") {
      results.push({ itemId: item.id, status: item.status });
      skipped += 1;
      continue;
    }

    if (transport === "disabled") {
      const failedItem = markEmailOutboxItemFailed(item, now);
      await input.store.upsertEmailOutboxItem(failedItem);
      results.push({ itemId: failedItem.id, status: failedItem.status });
      failed += 1;
      continue;
    }

    const sentItem = markEmailOutboxItemSent(item, now);
    await input.store.upsertEmailOutboxItem(sentItem);
    results.push({ itemId: sentItem.id, status: sentItem.status });
    sent += 1;
  }

  return {
    sent,
    failed,
    skipped,
    results
  };
}
