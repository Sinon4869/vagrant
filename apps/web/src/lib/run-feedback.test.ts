import { describe, expect, it } from "vitest";
import { buildRunsRedirectPath, readRunsFeedback } from "./run-feedback";

describe("run feedback helpers", () => {
  it("builds a runs redirect path with encoded execution feedback", () => {
    expect(buildRunsRedirectPath({
      projectId: "project-vagrant",
      result: "dispatch",
      status: "executed",
      message: "Started 1 run for selected root",
      runs: 1,
      actions: 2,
      approvals: 0
    })).toBe(
      "/runs?projectId=project-vagrant&result=dispatch&status=executed&message=Started+1+run+for+selected+root&runs=1&actions=2&approvals=0"
    );
  });

  it("reads failed feedback from runs query params", () => {
    expect(readRunsFeedback(new URLSearchParams({
      result: "dispatch",
      status: "failed",
      message: "Codex CLI binary not found"
    }))).toEqual({
      result: "dispatch",
      status: "failed",
      type: "error",
      message: "Codex CLI binary not found"
    });
  });

  it("ignores incomplete feedback", () => {
    expect(readRunsFeedback(new URLSearchParams({ status: "executed" }))).toBeNull();
  });
});
