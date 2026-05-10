import { describe, expect, it } from "vitest";
import { AgentRole, decideApproval, type Approval } from "../domain.js";

const pendingApproval: Approval = {
  id: "approval-1",
  projectId: "project-1",
  rootIssueId: "root-1",
  issueId: "issue-1",
  dispatchActionId: "dispatch-1",
  status: "pending",
  risk: "high",
  reason: "database_migration",
  requestedBy: AgentRole.Database,
  decidedBy: null,
  decisionNote: null,
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z",
  decidedAt: null
};

describe("decideApproval", () => {
  it("marks a pending approval as approved with decision metadata", () => {
    const decided = decideApproval(pendingApproval, {
      decision: "approved",
      decidedBy: "local-operator",
      decisionNote: "Reviewed migration plan.",
      now: "2026-05-10T01:00:00.000Z"
    });

    expect(decided).toEqual({
      ...pendingApproval,
      status: "approved",
      decidedBy: "local-operator",
      decisionNote: "Reviewed migration plan.",
      decidedAt: "2026-05-10T01:00:00.000Z",
      updatedAt: "2026-05-10T01:00:00.000Z"
    });
  });

  it("rejects non-pending approvals to keep decisions immutable", () => {
    expect(() =>
      decideApproval({ ...pendingApproval, status: "approved" }, {
        decision: "rejected",
        decidedBy: "local-operator",
        now: "2026-05-10T01:00:00.000Z"
      })
    ).toThrow("Only pending approvals can be decided");
  });
});
