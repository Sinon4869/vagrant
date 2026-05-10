import { describe, expect, it } from "vitest";
import { MockProviderAdapter, MockRuntimeAdapter } from "../adapters.js";
import { IssueStatus } from "../domain.js";
import { dispatchReadyIssues } from "../dispatcher.js";
import { planIssueTree } from "../rule-planner.js";

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
      root: first.root,
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: first.dispatchKeys
    });

    expect(second.dispatchedRuns).toHaveLength(0);
  });
});
