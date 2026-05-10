import { RuntimeKind, createNotificationItem, createProject, createRepositoryConfig } from "./domain.js";
import { aggregateIssueTree } from "./issue-tree.js";
import { planIssueTree } from "./rule-planner.js";

const DEMO_NOW = "2026-05-10T00:00:00.000Z";

export function createDemoProject() {
  const rootIssue = planIssueTree({
    projectId: "project-vagrant",
    rootIssueId: "issue-vagrant-knowledge",
    title: "Build agent knowledge wiki",
    description: "Create a Markdown wiki with structured indexes for agent context and delivery evidence.",
    complexity: "large",
    area: "full_stack",
    now: DEMO_NOW
  });

  return {
    project: {
      id: "project-vagrant",
      name: "vagrant",
      repositoryUrl: "https://github.com/Sinon4869/vagrant"
    },
    rootIssue,
    summary: aggregateIssueTree(rootIssue),
    attentionItems: [
      {
        id: "attention-1",
        type: "digest",
        title: "Autopilot is ready to start the first subissue",
        body: "The deterministic planner created a full-stack issue tree."
      }
    ]
  };
}

export interface CreatePersistedDemoStateInput {
  repositoryLocalPath: string;
  repositoryRemoteUrl: string | null;
  now?: string;
}

export function createPersistedDemoState(input: CreatePersistedDemoStateInput) {
  const now = input.now ?? DEMO_NOW;
  const project = createProject({
    id: "project-vagrant",
    name: "vagrant",
    description: "Local-first multi-agent engineering management platform.",
    now
  });
  const repository = createRepositoryConfig({
    id: "repo-vagrant",
    projectId: project.id,
    name: "vagrant",
    localPath: input.repositoryLocalPath,
    remoteUrl: input.repositoryRemoteUrl,
    providerType: input.repositoryRemoteUrl ? "generic_git" : "local_only",
    defaultBaseBranch: "main",
    branchNamePrefix: "vagrant",
    now
  });
  const rootIssue = planIssueTree({
    projectId: project.id,
    rootIssueId: "issue-vagrant-knowledge",
    title: "Build agent knowledge wiki",
    description: "Create a Markdown wiki with structured indexes for agent context and delivery evidence.",
    complexity: "large",
    area: "full_stack",
    now
  });
  const notification = createNotificationItem({
    id: "notification-vagrant-digest-ready",
    projectId: project.id,
    rootIssueId: rootIssue.id,
    issueId: rootIssue.id,
    type: "digest",
    title: "Issue tree is ready for agent assignment",
    body: "The planner created parent and child issues for the vagrant project.",
    severity: "normal",
    delivery: "digest",
    dedupeKey: `${project.id}:${rootIssue.id}:digest:issue-tree-ready`,
    now
  });

  return {
    project,
    repository,
    rootIssue,
    notification,
    defaultRuntimeKind: RuntimeKind.CodexCli
  };
}
