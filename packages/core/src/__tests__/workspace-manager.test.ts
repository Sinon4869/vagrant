import { describe, expect, it } from "vitest";
import { createRepositoryConfig } from "../domain.js";
import { FakeProcessRunner, WorkspaceManager } from "../node.js";

const now = "2026-05-10T00:00:00.000Z";

describe("WorkspaceManager", () => {
  it("creates a root issue worktree using provider-neutral git commands", async () => {
    const runner = new FakeProcessRunner();
    const manager = new WorkspaceManager({
      runner,
      worktreesDir: "/repo/vagrant/.worktrees"
    });
    const repository = createRepositoryConfig({
      id: "repo-vagrant",
      projectId: "project-vagrant",
      name: "vagrant",
      localPath: "/repo/vagrant",
      remoteUrl: "ssh://git.example/vagrant.git",
      defaultBaseBranch: "main",
      branchNamePrefix: "vagrant",
      now
    });

    const result = await manager.ensureRootIssueWorktree({
      repository,
      rootIssueId: "issue-build-wiki"
    });

    expect(result.branchName).toBe("vagrant/issue-build-wiki");
    expect(result.workingDirectory).toBe("/repo/vagrant/.worktrees/issue-build-wiki");
    expect(runner.calls).toEqual([
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "fetch", "--all", "--prune"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: [
          "-C",
          "/repo/vagrant",
          "worktree",
          "add",
          "-B",
          "vagrant/issue-build-wiki",
          "/repo/vagrant/.worktrees/issue-build-wiki",
          "main"
        ],
        cwd: "/repo/vagrant"
      }
    ]);
  });
});
