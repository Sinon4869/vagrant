import { describe, expect, it } from "vitest";
import { MockProviderAdapter, MockRuntimeAdapter, type ProviderAdapter } from "../adapters.js";
import { type Issue } from "../domain.js";
import { IssueStatus } from "../domain.js";
import { dispatchReadyIssues } from "../dispatcher.js";
import { planIssueTree } from "../rule-planner.js";

class SpyProviderAdapter implements ProviderAdapter {
  readonly syncedIssues: Issue[] = [];

  async syncIssue(issue: Issue): Promise<{ externalUrl: string | null }> {
    this.syncedIssues.push(issue);

    return {
      externalUrl: `https://provider.example/issues/${issue.id}`
    };
  }
}

describe("dispatcher", () => {
  it("runs the first ready todo child, records evidence, marks it done, and adds one dispatch key", async () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change dashboard button",
      description: "Change dashboard button text",
      complexity: "small",
      area: "frontend"
    });

    const result = await dispatchReadyIssues({
      root,
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: new Set()
    });

    expect(result.dispatchedRuns).toHaveLength(1);
    expect(result.root.children[0]?.status).toBe(IssueStatus.Done);
    expect(result.root.children[0]?.evidence[0]?.kind).toBe("test_log");
    expect(result.dispatchKeys.size).toBe(1);
  });

  it("does not dispatch the same event twice when previousDispatchKeys includes the key", async () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change dashboard button",
      description: "Change dashboard button text",
      complexity: "small",
      area: "frontend"
    });

    const first = await dispatchReadyIssues({
      root,
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: new Set()
    });

    const second = await dispatchReadyIssues({
      root: {
        ...first.root,
        children: first.root.children.slice(0, 1)
      },
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: first.dispatchKeys
    });

    expect(second.dispatchedRuns).toHaveLength(0);
  });

  it("dispatches another ready issue for the same event when the previous key belongs to a different issue", async () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change dashboard button",
      description: "Change dashboard button text",
      complexity: "small",
      area: "frontend"
    });
    const firstChild = root.children[0];
    const secondChild = root.children[1];

    expect(firstChild).toBeDefined();
    expect(secondChild).toBeDefined();

    const previousDispatchKey = [
      root.id,
      firstChild!.id,
      firstChild!.ownerAgentRole ?? "unassigned",
      "event-1",
      "run"
    ].join(":");

    const result = await dispatchReadyIssues({
      root: {
        ...root,
        children: [
          {
            ...firstChild!,
            status: IssueStatus.Done
          },
          secondChild!
        ]
      },
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: new Set([previousDispatchKey])
    });

    expect(result.dispatchedRuns).toHaveLength(1);
    expect(result.dispatchedRuns[0]?.issueId).toBe(secondChild!.id);
    expect(result.dispatchedRuns[0]?.dispatchKey).toBe(
      [
        root.id,
        secondChild!.id,
        secondChild!.ownerAgentRole ?? "unassigned",
        "event-1",
        "run"
      ].join(":")
    );
    expect(result.root.children[1]?.status).toBe(IssueStatus.Done);
  });

  it("syncs the provider with the updated done issue and runtime evidence", async () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change dashboard button",
      description: "Change dashboard button text",
      complexity: "small",
      area: "frontend"
    });
    const provider = new SpyProviderAdapter();

    await dispatchReadyIssues({
      root,
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider,
      previousDispatchKeys: new Set()
    });

    expect(provider.syncedIssues).toHaveLength(1);
    expect(provider.syncedIssues[0]?.id).toBe(root.children[0]?.id);
    expect(provider.syncedIssues[0]?.status).toBe(IssueStatus.Done);
    expect(provider.syncedIssues[0]?.evidence[0]?.kind).toBe("test_log");
  });
});
