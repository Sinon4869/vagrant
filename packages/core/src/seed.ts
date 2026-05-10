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
