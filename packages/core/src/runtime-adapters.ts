import { type AgentRunInput, type AgentRunResult, type RuntimeAdapter } from "./adapters.js";
import { type ProcessRunner } from "./process-runner.js";

export interface CliRuntimeAdapterOptions {
  runner: ProcessRunner;
  binary: string;
}

abstract class BaseCliRuntimeAdapter implements RuntimeAdapter {
  constructor(private readonly options: CliRuntimeAdapterOptions) {}

  protected abstract readonly successSummary: string;
  protected abstract buildArgs(): string[];

  async startRun(input: AgentRunInput): Promise<AgentRunResult> {
    const prompt = buildIssuePrompt(input);
    const result = await this.options.runner.run({
      command: this.options.binary,
      args: this.buildArgs(),
      cwd: input.workingDirectory,
      input: prompt
    });

    if (result.exitCode !== 0) {
      throw new Error(`${this.options.binary} failed: ${result.stderr || result.stdout}`);
    }

    return {
      runId: input.runId,
      summary: this.successSummary,
      evidence: [
        {
          id: `${input.runId}-cli-log`,
          issueId: input.issue.id,
          kind: "test_log",
          title: `${this.options.binary} execution log`,
          url: null,
          body: [result.stdout, result.stderr].filter(Boolean).join("\n"),
          createdAt: "2026-05-10T00:00:00.000Z"
        }
      ]
    };
  }
}

export class CodexCliRuntimeAdapter extends BaseCliRuntimeAdapter {
  protected readonly successSummary = "Codex CLI completed successfully.";

  protected buildArgs(): string[] {
    return ["exec", "--json"];
  }
}

export class ClaudeCliRuntimeAdapter extends BaseCliRuntimeAdapter {
  protected readonly successSummary = "Claude CLI completed successfully.";

  protected buildArgs(): string[] {
    return ["--print"];
  }
}

function buildIssuePrompt(input: AgentRunInput): string {
  return `Issue: ${input.issue.title}\n\nImplement the assigned issue and produce verifiable evidence.`;
}
