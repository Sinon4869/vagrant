import { MockProviderAdapter, MockRuntimeAdapter, RuntimeKind, type RuntimeAdapter } from "@vagrant/core";
import {
  ClaudeCliRuntimeAdapter,
  CodexCliRuntimeAdapter,
  NodeProcessRunner
} from "@vagrant/core/node";
import { type ProcessRunner } from "@vagrant/core/node";

type RuntimeEnv = Record<string, string | undefined>;

export function readRuntimeKindValue(value: string): RuntimeKind {
  if (value === RuntimeKind.Mock || value === RuntimeKind.CodexCli || value === RuntimeKind.ClaudeCli) {
    return value;
  }

  throw new Error(`Unsupported runtime: ${value}`);
}

export function isCliRuntimeKind(runtimeKind: RuntimeKind): boolean {
  return runtimeKind === RuntimeKind.CodexCli || runtimeKind === RuntimeKind.ClaudeCli;
}

export function getRuntimeBinary(runtimeKind: RuntimeKind, env: RuntimeEnv = process.env): string | null {
  if (runtimeKind === RuntimeKind.CodexCli) {
    return env.CODEX_CLI_BINARY ?? "codex";
  }

  if (runtimeKind === RuntimeKind.ClaudeCli) {
    return env.CLAUDE_CLI_BINARY ?? "claude";
  }

  return null;
}

export function buildCliBinaryMissingMessage(runtimeKind: RuntimeKind, binary: string): string {
  if (runtimeKind === RuntimeKind.ClaudeCli) {
    return `Claude CLI binary not found: ${binary}. Install Claude CLI or set CLAUDE_CLI_BINARY.`;
  }

  return `Codex CLI binary not found: ${binary}. Install Codex CLI or set CODEX_CLI_BINARY.`;
}

export function normalizeProcessError(error: unknown, runtimeKind: RuntimeKind, binary: string): string {
  if (hasErrorCode(error, "ENOENT")) {
    return buildCliBinaryMissingMessage(runtimeKind, binary);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Runtime preflight failed";
}

export async function validateRuntimeBinary({
  runtimeKind,
  runner,
  cwd,
  env = process.env
}: {
  runtimeKind: RuntimeKind;
  runner: ProcessRunner;
  cwd: string;
  env?: RuntimeEnv;
}): Promise<void> {
  const binary = getRuntimeBinary(runtimeKind, env);

  if (!binary) {
    return;
  }

  try {
    const result = await runner.run({
      command: binary,
      args: ["--version"],
      cwd,
      timeoutMs: 10_000
    });

    if (result.exitCode !== 0) {
      throw new Error(`${runtimeLabel(runtimeKind)} preflight failed: ${result.stderr || result.stdout || `exit ${result.exitCode}`}`);
    }
  } catch (error) {
    throw new Error(normalizeProcessError(error, runtimeKind, binary));
  }
}

export function createRuntimeAdapter(runtimeKind: RuntimeKind, runner: NodeProcessRunner): RuntimeAdapter {
  const binary = getRuntimeBinary(runtimeKind);

  if (runtimeKind === RuntimeKind.CodexCli) {
    return new CodexCliRuntimeAdapter({
      runner,
      binary: binary ?? "codex"
    });
  }

  if (runtimeKind === RuntimeKind.ClaudeCli) {
    return new ClaudeCliRuntimeAdapter({
      runner,
      binary: binary ?? "claude"
    });
  }

  return new MockRuntimeAdapter();
}

export function createProviderAdapter(): MockProviderAdapter {
  return new MockProviderAdapter();
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function runtimeLabel(runtimeKind: RuntimeKind): string {
  return runtimeKind === RuntimeKind.ClaudeCli ? "Claude CLI" : "Codex CLI";
}
