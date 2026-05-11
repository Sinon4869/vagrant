import { type AgentRunInput, type AgentRunResult, type RuntimeAdapter } from "./adapters.js";
import { type ProcessRunner } from "./process-runner.js";

export interface CliRuntimeAdapterOptions {
  runner: ProcessRunner;
  binary: string;
  timeoutMs?: number;
}

const DEFAULT_CLI_TIMEOUT_MS = 15 * 60 * 1000;

abstract class BaseCliRuntimeAdapter implements RuntimeAdapter {
  private readonly timeoutMs: number;

  constructor(private readonly options: CliRuntimeAdapterOptions) {
    this.timeoutMs = resolveCliTimeoutMs(options.timeoutMs);
  }

  protected abstract readonly successSummary: string;
  protected abstract buildArgs(): string[];

  async startRun(input: AgentRunInput): Promise<AgentRunResult> {
    const prompt = buildIssuePrompt(input);
    const result = await this.options.runner.run({
      command: this.options.binary,
      args: this.buildArgs(),
      cwd: input.workingDirectory,
      input: prompt,
      timeoutMs: this.timeoutMs
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

function resolveCliTimeoutMs(timeoutMs?: number): number {
  return timeoutMs ?? readPositiveIntegerEnv("VAGRANT_CLI_TIMEOUT_MS") ?? DEFAULT_CLI_TIMEOUT_MS;
}

function readPositiveIntegerEnv(key: string): number | null {
  const value = process.env[key];

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

export function buildIssuePrompt(input: AgentRunInput): string {
  const acceptanceCriteria = input.issue.acceptanceCriteria.length > 0
    ? input.issue.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")
    : "- Complete the issue as described.";
  const evidenceRequirements = input.issue.evidenceRequirements.length > 0
    ? input.issue.evidenceRequirements.map((requirement) => `- ${requirement}`).join("\n")
    : "- Provide verifiable evidence of the completed work.";

  return [
    `Run ID: ${input.runId}`,
    `Issue ID: ${input.issue.id}`,
    `Issue Title: ${input.issue.title}`,
    `Issue Type: ${input.issue.type}`,
    `Agent Role: ${input.issue.ownerAgentRole ?? "unassigned"}`,
    `Working Directory: ${input.workingDirectory}`,
    "",
    "Description:",
    input.issue.description || "No description provided.",
    "",
    "Acceptance Criteria:",
    acceptanceCriteria,
    "",
    "Evidence Requirements:",
    evidenceRequirements,
    "",
    "Implement the assigned issue. When finished, report the changes made and include the requested evidence."
  ].join("\n");
}
