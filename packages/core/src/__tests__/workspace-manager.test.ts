import { describe, expect, it } from "vitest";
import { createRepositoryConfig } from "../domain.js";
import { FakeProcessRunner, WorkspaceManager } from "../node.js";
import { type ProcessRunInput, type ProcessRunResult, type ProcessRunner } from "../process-runner.js";

const now = "2026-05-10T00:00:00.000Z";

class SequencedProcessRunner implements ProcessRunner {
  readonly calls: ProcessRunInput[] = [];

  constructor(private readonly results: ProcessRunResult[]) {}

  async run(input: ProcessRunInput): Promise<ProcessRunResult> {
    this.calls.push(input);
    return this.results.shift() ?? { exitCode: 0, stdout: "", stderr: "" };
  }
}

describe("WorkspaceManager", () => {
  it("creates a root issue worktree using provider-neutral git commands", async () => {
    const runner = new SequencedProcessRunner([
      { exitCode: 0, stdout: "true\n", stderr: "" },
      { exitCode: 0, stdout: "", stderr: "" },
      { exitCode: 0, stdout: "main\n", stderr: "" },
      { exitCode: 0, stdout: "", stderr: "" },
      { exitCode: 0, stdout: "", stderr: "" }
    ]);
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
        args: ["-C", "/repo/vagrant", "rev-parse", "--is-inside-work-tree"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "fetch", "--all", "--prune"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "rev-parse", "--verify", "main^{commit}"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "worktree", "list", "--porcelain"],
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

  it("reuses an existing root issue worktree", async () => {
    const runner = new SequencedProcessRunner([
      { exitCode: 0, stdout: "true\n", stderr: "" },
      { exitCode: 0, stdout: "", stderr: "" },
      { exitCode: 0, stdout: "main\n", stderr: "" },
      { exitCode: 0, stdout: "worktree /repo/vagrant/.worktrees/issue-build-wiki\n", stderr: "" }
    ]);
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
        args: ["-C", "/repo/vagrant", "rev-parse", "--is-inside-work-tree"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "fetch", "--all", "--prune"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "rev-parse", "--verify", "main^{commit}"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "worktree", "list", "--porcelain"],
        cwd: "/repo/vagrant"
      }
    ]);
  });

  it("creates a root issue worktree when fetch fails because the repository has no remote", async () => {
    const runner = new SequencedProcessRunner([
      { exitCode: 0, stdout: "true\n", stderr: "" },
      { exitCode: 1, stdout: "", stderr: "fatal: No remote repository specified." },
      { exitCode: 0, stdout: "main\n", stderr: "" },
      { exitCode: 0, stdout: "", stderr: "" },
      { exitCode: 0, stdout: "", stderr: "" }
    ]);
    const manager = new WorkspaceManager({
      runner,
      worktreesDir: "/repo/vagrant/.worktrees"
    });
    const repository = createRepositoryConfig({
      id: "repo-vagrant",
      projectId: "project-vagrant",
      name: "vagrant",
      localPath: "/repo/vagrant",
      remoteUrl: null,
      defaultBaseBranch: "main",
      branchNamePrefix: "vagrant",
      now
    });

    await expect(
      manager.ensureRootIssueWorktree({
        repository,
        rootIssueId: "issue-build-wiki"
      })
    ).resolves.toMatchObject({
      branchName: "vagrant/issue-build-wiki",
      workingDirectory: "/repo/vagrant/.worktrees/issue-build-wiki"
    });

    expect(runner.calls).toEqual([
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "rev-parse", "--is-inside-work-tree"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "fetch", "--all", "--prune"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "rev-parse", "--verify", "main^{commit}"],
        cwd: "/repo/vagrant"
      },
      {
        command: "git",
        args: ["-C", "/repo/vagrant", "worktree", "list", "--porcelain"],
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

  it("fails before fetching when the repository path is not a git repository", async () => {
    const runner = new SequencedProcessRunner([
      { exitCode: 128, stdout: "", stderr: "fatal: not a git repository" }
    ]);
    const manager = new WorkspaceManager({
      runner,
      worktreesDir: "/repo/vagrant/.worktrees"
    });
    const repository = createRepositoryConfig({
      id: "repo-vagrant",
      projectId: "project-vagrant",
      name: "vagrant",
      localPath: "/repo/vagrant",
      remoteUrl: null,
      defaultBaseBranch: "main",
      branchNamePrefix: "vagrant",
      now
    });

    await expect(
      manager.ensureRootIssueWorktree({
        repository,
        rootIssueId: "issue-build-wiki"
      })
    ).rejects.toThrow("Repository path is not a git repository: /repo/vagrant");

    expect(runner.calls).toHaveLength(1);
  });

  it("fails with an actionable message when the base branch is not available", async () => {
    const runner = new SequencedProcessRunner([
      { exitCode: 0, stdout: "true\n", stderr: "" },
      { exitCode: 0, stdout: "", stderr: "" },
      { exitCode: 128, stdout: "", stderr: "fatal: Needed a single revision" }
    ]);
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

    await expect(
      manager.ensureRootIssueWorktree({
        repository,
        rootIssueId: "issue-build-wiki"
      })
    ).rejects.toThrow("Repository base branch is not available: main");
  });
});
