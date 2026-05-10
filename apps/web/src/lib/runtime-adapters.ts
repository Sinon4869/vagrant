import { MockProviderAdapter, MockRuntimeAdapter, RuntimeKind, type RuntimeAdapter } from "@vagrant/core";
import {
  ClaudeCliRuntimeAdapter,
  CodexCliRuntimeAdapter,
  NodeProcessRunner
} from "@vagrant/core/node";

export function readRuntimeKindValue(value: string): RuntimeKind {
  if (value === RuntimeKind.Mock || value === RuntimeKind.CodexCli || value === RuntimeKind.ClaudeCli) {
    return value;
  }

  throw new Error(`Unsupported runtime: ${value}`);
}

export function createRuntimeAdapter(runtimeKind: RuntimeKind, runner: NodeProcessRunner): RuntimeAdapter {
  if (runtimeKind === RuntimeKind.CodexCli) {
    return new CodexCliRuntimeAdapter({
      runner,
      binary: process.env.CODEX_CLI_BINARY ?? "codex"
    });
  }

  if (runtimeKind === RuntimeKind.ClaudeCli) {
    return new ClaudeCliRuntimeAdapter({
      runner,
      binary: process.env.CLAUDE_CLI_BINARY ?? "claude"
    });
  }

  return new MockRuntimeAdapter();
}

export function createProviderAdapter(): MockProviderAdapter {
  return new MockProviderAdapter();
}
