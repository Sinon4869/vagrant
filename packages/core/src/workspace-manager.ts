import { join } from "node:path";
import { type RepositoryConfig } from "./domain.js";
import { type ProcessRunner } from "./process-runner.js";

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

    await this.runGit(input.repository.localPath, ["fetch", "--all", "--prune"]);
    await this.runGit(input.repository.localPath, [
      "worktree",
      "add",
      "-B",
      branchName,
      workingDirectory,
      input.repository.defaultBaseBranch
    ]);

    return {
      repositoryId: input.repository.id,
      rootIssueId: input.rootIssueId,
      branchName,
      workingDirectory
    };
  }

  private async runGit(repositoryPath: string, args: string[]): Promise<void> {
    const result = await this.options.runner.run({
      command: "git",
      args: ["-C", repositoryPath, ...args],
      cwd: repositoryPath
    });

    if (result.exitCode !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
    }
  }
}
