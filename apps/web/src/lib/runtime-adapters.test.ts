import { describe, expect, it } from "vitest";
import { RuntimeKind } from "@vagrant/core";
import {
  buildCliBinaryMissingMessage,
  getRuntimeBinary,
  isCliRuntimeKind,
  normalizeProcessError,
  readRuntimeKindValue,
  validateRuntimeBinary
} from "./runtime-adapters";

describe("runtime adapter helpers", () => {
  it("accepts supported runtime kinds", () => {
    expect(readRuntimeKindValue("mock")).toBe(RuntimeKind.Mock);
    expect(readRuntimeKindValue("codex_cli")).toBe(RuntimeKind.CodexCli);
    expect(readRuntimeKindValue("claude_cli")).toBe(RuntimeKind.ClaudeCli);
  });

  it("rejects unsupported runtime kinds", () => {
    expect(() => readRuntimeKindValue("other")).toThrow("Unsupported runtime: other");
  });

  it("resolves CLI binaries from runtime kind and env overrides", () => {
    expect(getRuntimeBinary(RuntimeKind.Mock, {})).toBeNull();
    expect(getRuntimeBinary(RuntimeKind.CodexCli, {})).toBe("codex");
    expect(getRuntimeBinary(RuntimeKind.ClaudeCli, {})).toBe("claude");
    expect(getRuntimeBinary(RuntimeKind.CodexCli, { CODEX_CLI_BINARY: "/opt/bin/codex" })).toBe("/opt/bin/codex");
    expect(getRuntimeBinary(RuntimeKind.ClaudeCli, { CLAUDE_CLI_BINARY: "/opt/bin/claude" })).toBe("/opt/bin/claude");
  });

  it("identifies CLI runtimes", () => {
    expect(isCliRuntimeKind(RuntimeKind.Mock)).toBe(false);
    expect(isCliRuntimeKind(RuntimeKind.CodexCli)).toBe(true);
    expect(isCliRuntimeKind(RuntimeKind.ClaudeCli)).toBe(true);
  });

  it("normalizes missing CLI binary errors into actionable copy", () => {
    const error = Object.assign(new Error("spawn codex ENOENT"), { code: "ENOENT" });

    expect(normalizeProcessError(error, RuntimeKind.CodexCli, "codex")).toBe(
      "Codex CLI binary not found: codex. Install Codex CLI or set CODEX_CLI_BINARY."
    );
    expect(buildCliBinaryMissingMessage(RuntimeKind.ClaudeCli, "claude")).toBe(
      "Claude CLI binary not found: claude. Install Claude CLI or set CLAUDE_CLI_BINARY."
    );
  });

  it("preflights CLI binaries with a short version command", async () => {
    const runner = new RecordingRunner({ exitCode: 0, stdout: "codex 1.0.0", stderr: "" });

    await validateRuntimeBinary({
      runtimeKind: RuntimeKind.CodexCli,
      runner,
      cwd: "/repo/vagrant",
      env: { CODEX_CLI_BINARY: "/opt/bin/codex" }
    });

    expect(runner.calls).toEqual([
      {
        command: "/opt/bin/codex",
        args: ["--version"],
        cwd: "/repo/vagrant",
        timeoutMs: 10_000
      }
    ]);
  });

  it("skips binary preflight for mock runtime", async () => {
    const runner = new RecordingRunner({ exitCode: 0, stdout: "", stderr: "" });

    await validateRuntimeBinary({
      runtimeKind: RuntimeKind.Mock,
      runner,
      cwd: "/repo/vagrant"
    });

    expect(runner.calls).toEqual([]);
  });

  it("reports failed CLI binary preflight as actionable copy", async () => {
    const runner = new RecordingRunner({ exitCode: 127, stdout: "", stderr: "not found" });

    await expect(validateRuntimeBinary({
      runtimeKind: RuntimeKind.ClaudeCli,
      runner,
      cwd: "/repo/vagrant"
    })).rejects.toThrow("Claude CLI preflight failed: not found");
  });
});

class RecordingRunner {
  readonly calls: Array<{ command: string; args: string[]; cwd: string; timeoutMs?: number }> = [];

  constructor(private readonly result: { exitCode: number; stdout: string; stderr: string }) {}

  async run(input: { command: string; args: string[]; cwd: string; timeoutMs?: number }) {
    this.calls.push(input);
    return this.result;
  }
}
