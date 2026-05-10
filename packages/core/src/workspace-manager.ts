import { join, resolve } from "node:path";
import { type RepositoryConfig } from "./domain.js";
import { type ProcessRunner, type ProcessRunResult } from "./process-runner.js";

export interface WorkspaceManagerOptions {
  runner: ProcessRunner;
  worktreesDir: string;
}

export interface EnsureRootIssueWorktreeInput {
  repository: RepositoryConfig;
  rootIssueId: string;
}

export interface RootIssueWorktree {
  repositoryId: string;
  rootIssueId: string;
  branchName: string;
  workingDirectory: string;
}

export class WorkspaceManager {
  constructor(private readonly options: WorkspaceManagerOptions) {}

  async ensureRootIssueWorktree(input: EnsureRootIssueWorktreeInput): Promise<RootIssueWorktree> {
    const branchName = `${input.repository.branchNamePrefix}/${input.rootIssueId}`;
    const workingDirectory = join(this.options.worktreesDir, input.rootIssueId);

    await this.fetchRepository(input.repository);
    if (!(await this.hasWorktree(input.repository.localPath, workingDirectory))) {
      await this.runGit(input.repository.localPath, [
        "worktree",
        "add",
        "-B",
        branchName,
        workingDirectory,
        input.repository.defaultBaseBranch
      ]);
    }

    return {
      repositoryId: input.repository.id,
      rootIssueId: input.rootIssueId,
      branchName,
      workingDirectory
    };
  }

  private async fetchRepository(repository: RepositoryConfig): Promise<void> {
    const result = await this.runGit(repository.localPath, ["fetch", "--all", "--prune"], {
      throwOnError: false
    });

    if (result.exitCode === 0 || !repository.remoteUrl) {
      return;
    }

    throw new Error(`git fetch --all --prune failed: ${result.stderr || result.stdout}`);
  }

  private async hasWorktree(repositoryPath: string, workingDirectory: string): Promise<boolean> {
    const result = await this.runGit(repositoryPath, ["worktree", "list", "--porcelain"], {
      throwOnError: false
    });

    if (result.exitCode !== 0) {
      throw new Error(`git worktree list --porcelain failed: ${result.stderr || result.stdout}`);
    }

    const expectedPath = resolve(workingDirectory);
    const worktrees = result.stdout
      .split("\n")
      .filter((line) => line.startsWith("worktree "))
      .map((line) => resolve(line.slice("worktree ".length)));

    return worktrees.includes(expectedPath);
  }

  private async runGit(
    repositoryPath: string,
    args: string[],
    options: { throwOnError?: boolean } = {}
  ): Promise<ProcessRunResult> {
    const result = await this.options.runner.run({
      command: "git",
      args: ["-C", repositoryPath, ...args],
      cwd: repositoryPath
    });

    if ((options.throwOnError ?? true) && result.exitCode !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
    }

    return result;
  }
}
