import { describe, expect, it } from "vitest";
import {
  AgentRole,
  RuntimeKind,
  createAgentRun,
  createProject,
  createRepositoryConfig
} from "../domain.js";

describe("durable domain contracts", () => {
  it("creates a project with provider-neutral repository configuration", () => {
    const project = createProject({
      id: "project-vagrant",
      name: "vagrant",
      now: "2026-05-10T00:00:00.000Z"
    });

    const repository = createRepositoryConfig({
      id: "repo-vagrant",
      projectId: project.id,
      name: "vagrant",
      localPath: "/Users/asuka/Documents/vagrant",
      remoteUrl: "https://git.example.local/team/vagrant.git",
      providerType: "generic_git",
      defaultBaseBranch: "main",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(project.name).toBe("vagrant");
    expect(repository.remoteUrl).toBe("https://git.example.local/team/vagrant.git");
    expect(repository.providerType).toBe("generic_git");
    expect(repository.defaultBaseBranch).toBe("main");
  });

  it("creates an agent run record for a local CLI runtime", () => {
    const run = createAgentRun({
      id: "run-1",
      projectId: "project-vagrant",
      issueId: "issue-1",
      agentRole: AgentRole.FrontendDeveloper,
      runtimeKind: RuntimeKind.CodexCli,
      workingDirectory: "/tmp/vagrant/worktrees/issue-1",
      prompt: "Implement the issue and report evidence.",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(run.status).toBe("queued");
    expect(run.runtimeKind).toBe(RuntimeKind.CodexCli);
    expect(run.logs).toEqual([]);
    expect(run.evidenceIds).toEqual([]);
  });
});
