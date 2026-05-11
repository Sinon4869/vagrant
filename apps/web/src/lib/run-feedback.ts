export type RunsFeedbackResult = "tick" | "dispatch";
export type RunsFeedbackStatus = "executed" | "idle" | "failed";
export type RunsFeedbackType = "success" | "info" | "error";

export interface RunsRedirectFeedback {
  projectId: string;
  result: RunsFeedbackResult;
  status: RunsFeedbackStatus;
  message: string;
  runs?: number;
  actions?: number;
  approvals?: number;
}

export interface RunsFeedback {
  result: RunsFeedbackResult;
  status: RunsFeedbackStatus;
  type: RunsFeedbackType;
  message: string;
}

export function buildRunsRedirectPath(feedback: RunsRedirectFeedback): string {
  const params = new URLSearchParams({
    projectId: feedback.projectId,
    result: feedback.result,
    status: feedback.status,
    message: feedback.message
  });

  appendNumber(params, "runs", feedback.runs);
  appendNumber(params, "actions", feedback.actions);
  appendNumber(params, "approvals", feedback.approvals);

  return `/runs?${params.toString()}`;
}

export function readRunsFeedback(params: URLSearchParams): RunsFeedback | null {
  const result = params.get("result");
  const status = params.get("status");
  const message = params.get("message");

  if (!isRunsFeedbackResult(result) || !isRunsFeedbackStatus(status) || !message) {
    return null;
  }

  return {
    result,
    status,
    type: feedbackType(status),
    message
  };
}

function appendNumber(params: URLSearchParams, key: string, value: number | undefined): void {
  if (value !== undefined) {
    params.set(key, String(value));
  }
}

function feedbackType(status: RunsFeedbackStatus): RunsFeedbackType {
  if (status === "failed") {
    return "error";
  }

  return status === "executed" ? "success" : "info";
}

function isRunsFeedbackResult(value: string | null): value is RunsFeedbackResult {
  return value === "tick" || value === "dispatch";
}

function isRunsFeedbackStatus(value: string | null): value is RunsFeedbackStatus {
  return value === "executed" || value === "idle" || value === "failed";
}
