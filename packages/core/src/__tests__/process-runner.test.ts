import { describe, expect, it } from "vitest";
import { NodeProcessRunner } from "../process-runner.js";

describe("NodeProcessRunner", () => {
  it("kills a child process and rejects with a timeout error when timeoutMs elapses", async () => {
    const runner = new NodeProcessRunner();

    await expect(
      runner.run({
        command: process.execPath,
        args: ["-e", "setTimeout(() => {}, 1_000)"],
        cwd: process.cwd(),
        timeoutMs: 25
      })
    ).rejects.toThrow(/timeout.*25/i);
  });
});
