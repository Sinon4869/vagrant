import { describe, expect, it } from "vitest";
import { AgentRole, IssueType, createIssue } from "../domain.js";
import { ClaudeCliRuntimeAdapter, CodexCliRuntimeAdapter, FakeProcessRunner } from "../node.js";
import { buildIssuePrompt } from "../runtime-adapters.js";

const issue = createIssue({
  id: "issue-frontend",
  projectId: "project-vagrant",
  title: "Update issue tree UI",
  type: IssueType.Frontend,
  description: "Replace the placeholder tree with real persisted issue data.",
  ownerAgentRole: AgentRole.FrontendDeveloper,
  acceptanceCriteria: ["Shows root and child issues", "Supports selecting an issue"],
  evidenceRequirements: ["screenshot", "test_log"],
  now: "2026-05-10T00:00:00.000Z"
});

const runInput = {
  runId: "run-codex",
  issue,
  workingDirectory: "/repo/vagrant/.worktrees/issue-root"
};

describe("CLI runtime adapters", () => {
  it("runs Codex CLI in the issue worktree and returns log evidence", async () => {
    const runner = new FakeProcessRunner({
      exitCode: 0,
      stdout: "implemented change",
      stderr: ""
    });
    const adapter = new CodexCliRuntimeAdapter({ runner, binary: "codex" });

    const result = await adapter.startRun(runInput);

    expect(runner.calls[0]).toEqual({
      command: "codex",
      args: ["exec", "--json"],
      cwd: "/repo/vagrant/.worktrees/issue-root",
      input: buildIssuePrompt(runInput),
      timeoutMs: 900_000
    });
    expect(runner.calls[0]?.input).toContain("issue-frontend");
    expect(runner.calls[0]?.input).toContain("Update issue tree UI");
    expect(runner.calls[0]?.input).toContain("Replace the placeholder tree with real persisted issue data.");
    expect(runner.calls[0]?.input).toContain("frontend");
    expect(runner.calls[0]?.input).toContain("frontend_developer");
    expect(runner.calls[0]?.input).toContain("/repo/vagrant/.worktrees/issue-root");
    expect(runner.calls[0]?.input).toContain("Acceptance Criteria");
    expect(runner.calls[0]?.input).toContain("Evidence Requirements");
    expect(result.summary).toBe("Codex CLI completed successfully.");
    expect(result.evidence[0]?.kind).toBe("test_log");
    expect(result.evidence[0]?.body).toContain("implemented change");
  });

  it("runs Claude CLI in the issue worktree and returns log evidence", async () => {
    const runner = new FakeProcessRunner({
      exitCode: 0,
      stdout: "reviewed implementation",
      stderr: ""
    });
    const adapter = new ClaudeCliRuntimeAdapter({ runner, binary: "claude" });

    const result = await adapter.startRun({
      ...runInput,
      runId: "run-claude",
    });

    expect(runner.calls[0]).toEqual({
      command: "claude",
      args: ["--print"],
      cwd: "/repo/vagrant/.worktrees/issue-root",
      input: buildIssuePrompt({
        ...runInput,
        runId: "run-claude"
      }),
      timeoutMs: 900_000
    });
    expect(runner.calls[0]?.input).toContain("issue-frontend");
    expect(runner.calls[0]?.input).toContain("Update issue tree UI");
    expect(runner.calls[0]?.input).toContain("Replace the placeholder tree with real persisted issue data.");
    expect(runner.calls[0]?.input).toContain("frontend");
    expect(runner.calls[0]?.input).toContain("frontend_developer");
    expect(runner.calls[0]?.input).toContain("/repo/vagrant/.worktrees/issue-root");
    expect(runner.calls[0]?.input).toContain("Acceptance Criteria");
    expect(runner.calls[0]?.input).toContain("Evidence Requirements");
    expect(result.summary).toBe("Claude CLI completed successfully.");
    expect(result.evidence[0]?.body).toContain("reviewed implementation");
  });

  it("allows CLI timeout override", async () => {
    const runner = new FakeProcessRunner();
    const adapter = new CodexCliRuntimeAdapter({
      runner,
      binary: "codex",
      timeoutMs: 30_000
    });

    await adapter.startRun(runInput);

    expect(runner.calls[0]?.timeoutMs).toBe(30_000);
  });
});
