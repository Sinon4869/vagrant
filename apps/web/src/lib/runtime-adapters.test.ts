import { describe, expect, it } from "vitest";
import { RuntimeKind } from "@vagrant/core";
import { readRuntimeKindValue } from "./runtime-adapters";

describe("runtime adapter helpers", () => {
  it("accepts supported runtime kinds", () => {
    expect(readRuntimeKindValue("mock")).toBe(RuntimeKind.Mock);
    expect(readRuntimeKindValue("codex_cli")).toBe(RuntimeKind.CodexCli);
    expect(readRuntimeKindValue("claude_cli")).toBe(RuntimeKind.ClaudeCli);
  });

  it("rejects unsupported runtime kinds", () => {
    expect(() => readRuntimeKindValue("other")).toThrow("Unsupported runtime: other");
  });
});
