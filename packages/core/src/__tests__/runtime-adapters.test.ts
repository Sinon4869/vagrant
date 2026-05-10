import { describe, expect, it } from "vitest";
import { IssueType, createIssue } from "../domain.js";
import { FakeProcessRunner } from "../process-runner.js";
import { ClaudeCliRuntimeAdapter, CodexCliRuntimeAdapter } from "../runtime-adapters.js";

const issue = createIssue({
  id: "issue-frontend",
  projectId: "project-vagrant",
  title: "Update issue tree UI",
  type: IssueType.Frontend,
  now: "2026-05-10T00:00:00.000Z"
});

describe("CLI runtime adapters", () => {
  it("runs Codex CLI in the issue worktree and returns log evidence", async () => {
    const runner = new FakeProcessRunner({
      exitCode: 0,
      stdout: "implemented change",
      stderr: ""
    });
    const adapter = new CodexCliRuntimeAdapter({ runner, binary: "codex" });

    const result = await adapter.startRun({
      runId: "run-codex",
      issue,
      workingDirectory: "/repo/vagrant/.worktrees/issue-root"
    });

    expect(runner.calls[0]).toEqual({
      command: "codex",
      args: ["exec", "--json"],
      cwd: "/repo/vagrant/.worktrees/issue-root",
      input: "Issue: Update issue tree UI\n\nImplement the assigned issue and produce verifiable evidence."
    });
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
      runId: "run-claude",
      issue,
      workingDirectory: "/repo/vagrant/.worktrees/issue-root"
    });

    expect(runner.calls[0]).toEqual({
      command: "claude",
      args: ["--print"],
      cwd: "/repo/vagrant/.worktrees/issue-root",
      input: "Issue: Update issue tree UI\n\nImplement the assigned issue and produce verifiable evidence."
    });
    expect(result.summary).toBe("Claude CLI completed successfully.");
    expect(result.evidence[0]?.body).toContain("reviewed implementation");
  });
});
