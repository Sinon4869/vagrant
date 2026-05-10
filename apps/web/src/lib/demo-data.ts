import { createDemoProject } from "@vagrant/core";

export function getDemoData() {
  const demo = createDemoProject();

  return {
    ...demo,
    project: {
      ...demo.project,
      description: "Local-first multi-agent engineering management platform.",
      health: "On track",
      updatedAt: "2026-05-10 18:40"
    },
    projects: [
      {
        id: demo.project.id,
        name: demo.project.name,
        description: "Local-first multi-agent engineering management platform.",
        status: "Active",
        requirements: 12,
        repositories: 3,
        agents: 14,
        progress: 42,
        updatedAt: "2026-05-10 18:40"
      },
      {
        id: "project-internal-ops",
        name: "internal-ops",
        description: "Automation workspace for notifications, approvals, and release gates.",
        status: "Planning",
        requirements: 5,
        repositories: 2,
        agents: 8,
        progress: 18,
        updatedAt: "2026-05-09 21:12"
      }
    ],
    requirements: [
      {
        id: demo.rootIssue.id,
        title: demo.rootIssue.title,
        repositoryIds: ["repo-vagrant"],
        knowledgeIds: ["wiki-agent-context", "wiki-runtime-policy"],
        owner: "Engineering Lead",
        status: demo.summary.aggregateStatus,
        progress: demo.summary.progress,
        subissues: demo.summary.total - 1,
        updatedAt: "2026-05-10 18:40"
      },
      {
        id: "issue-email-digests",
        title: "Add digest-first notification delivery",
        repositoryIds: ["repo-vagrant"],
        knowledgeIds: ["wiki-notification-policy"],
        owner: "Product Manager",
        status: "todo",
        progress: 0,
        subissues: 6,
        updatedAt: "2026-05-10 15:06"
      }
    ],
    repositories: [
      {
        id: "repo-vagrant",
        name: "vagrant",
        provider: "Generic Git",
        remoteUrl: "https://github.com/Sinon4869/vagrant",
        localPath: "/Users/asuka/Documents/vagrant",
        baseBranch: "main",
        linkedRequirements: 2,
        health: "Synced"
      },
      {
        id: "repo-vagrant-docs",
        name: "vagrant-docs",
        provider: "Local Only",
        remoteUrl: null,
        localPath: "/Users/asuka/Documents/vagrant-docs",
        baseBranch: "main",
        linkedRequirements: 1,
        health: "Local"
      },
      {
        id: "repo-vagrant-infra",
        name: "vagrant-infra",
        provider: "Gitea",
        remoteUrl: "ssh://git.internal.local/ai/vagrant-infra.git",
        localPath: "/Users/asuka/Documents/vagrant-infra",
        baseBranch: "main",
        linkedRequirements: 0,
        health: "Needs fetch"
      }
    ],
    knowledgePages: [
      {
        id: "wiki-agent-context",
        title: "Agent operating context",
        tags: ["agents", "manual"],
        linkedRequirements: [demo.rootIssue.id],
        linkedRepositories: ["repo-vagrant"],
        updatedAt: "2026-05-10 17:55"
      },
      {
        id: "wiki-runtime-policy",
        title: "Codex and Claude runtime policy",
        tags: ["runtime", "approval"],
        linkedRequirements: [demo.rootIssue.id],
        linkedRepositories: ["repo-vagrant", "repo-vagrant-infra"],
        updatedAt: "2026-05-10 16:20"
      },
      {
        id: "wiki-notification-policy",
        title: "Email digest and escalation policy",
        tags: ["email", "inbox"],
        linkedRequirements: ["issue-email-digests"],
        linkedRepositories: ["repo-vagrant"],
        updatedAt: "2026-05-10 15:30"
      }
    ],
    agents: [
      { role: "CEO", runtime: "Claude CLI", activeRuns: 0, scope: "Strategy and approvals" },
      { role: "CTO", runtime: "Codex CLI", activeRuns: 1, scope: "Technical decomposition" },
      { role: "Frontend Developer", runtime: "Codex CLI", activeRuns: 1, scope: "UI implementation" },
      { role: "Code Review", runtime: "Claude CLI", activeRuns: 0, scope: "Review gates" },
      { role: "QA", runtime: "Codex CLI", activeRuns: 0, scope: "Verification evidence" }
    ],
    runs: [
      {
        id: "run-issue-tree-ui",
        issue: demo.rootIssue.title,
        agent: "Frontend Developer",
        runtime: "Codex CLI",
        repository: "vagrant",
        status: "succeeded",
        evidence: "test log, screenshot",
        updatedAt: "2026-05-10 18:21"
      },
      {
        id: "run-technical-plan",
        issue: demo.rootIssue.title,
        agent: "CTO",
        runtime: "Codex CLI",
        repository: "vagrant",
        status: "in_progress",
        evidence: "worktree branch",
        updatedAt: "2026-05-10 18:37"
      }
    ],
    inbox: [
      {
        id: "inbox-approval-runtime",
        type: "Approval",
        title: "Codex CLI run wants repository write access",
        target: demo.rootIssue.title,
        severity: "High",
        delivery: "Page + next digest"
      },
      {
        id: "inbox-digest",
        type: "Digest",
        title: "3 requirements changed since last email",
        target: "vagrant",
        severity: "Normal",
        delivery: "Grouped email at 19:00"
      }
    ]
  };
}
