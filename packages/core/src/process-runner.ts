import { spawn } from "node:child_process";

export interface ProcessRunInput {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
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
      let settled = false;
      let timeout: NodeJS.Timeout | undefined;

      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }

        callback();
      };

      if (input.timeoutMs !== undefined) {
        timeout = setTimeout(() => {
          settle(() => {
            child.kill();
            reject(new Error(`Process timeout after ${input.timeoutMs}ms`));
          });
        }, input.timeoutMs);
      }

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("error", (error) => {
        settle(() => {
          reject(error);
        });
      });
      child.on("close", (exitCode: number | null) => {
        settle(() => {
          resolve({
            exitCode: exitCode ?? 1,
            stdout,
            stderr
          });
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
