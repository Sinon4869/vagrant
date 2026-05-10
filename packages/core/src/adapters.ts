import { type Evidence, type Issue } from "./domain.js";

export interface AgentRunInput {
  runId: string;
  issue: Issue;
  workingDirectory: string;
}

export interface AgentRunResult {
  runId: string;
  summary: string;
  evidence: Evidence[];
}

export interface RuntimeAdapter {
  startRun(input: AgentRunInput): Promise<AgentRunResult>;
}

export interface ProviderAdapter {
  syncIssue(issue: Issue): Promise<{ externalUrl: string | null }>;
}

export class MockRuntimeAdapter implements RuntimeAdapter {
  async startRun(input: AgentRunInput): Promise<AgentRunResult> {
    return {
      runId: input.runId,
      summary: `Mock run completed for ${input.issue.title}`,
      evidence: [
        {
          id: `${input.runId}-test-log`,
          issueId: input.issue.id,
          kind: "test_log",
          title: "Mock validation log",
          url: null,
          body: "Mock runtime completed successfully.",
          createdAt: "2026-05-10T00:00:00.000Z"
        }
      ]
    };
  }
}

export class MockProviderAdapter implements ProviderAdapter {
  async syncIssue(issue: Issue): Promise<{ externalUrl: string | null }> {
    return {
      externalUrl: `https://provider.example/issues/${issue.id}`
    };
  }
}
