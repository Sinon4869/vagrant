import { spawn } from "node:child_process";

export interface ProcessRunInput {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
}

export interface ProcessRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ProcessRunner {
  run(input: ProcessRunInput): Promise<ProcessRunResult>;
}

export class NodeProcessRunner implements ProcessRunner {
  async run(input: ProcessRunInput): Promise<ProcessRunResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(input.command, input.args, {
        cwd: input.cwd,
        env: { ...process.env, ...input.env },
        stdio: ["pipe", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (exitCode) => {
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr
        });
      });

      if (input.input) {
        child.stdin.write(input.input);
      }

      child.stdin.end();
    });
  }
}

export class FakeProcessRunner implements ProcessRunner {
  readonly calls: ProcessRunInput[] = [];

  constructor(private readonly result: ProcessRunResult = { exitCode: 0, stdout: "", stderr: "" }) {}

  async run(input: ProcessRunInput): Promise<ProcessRunResult> {
    this.calls.push(input);
    return this.result;
  }
}
