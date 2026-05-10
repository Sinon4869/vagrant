import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function withTempRuntimeDir<T>(run: (runtimeDir: string) => Promise<T>): Promise<T> {
  const runtimeDir = await mkdtemp(join(tmpdir(), "vagrant-runtime-"));

  try {
    return await run(runtimeDir);
  } finally {
    await rm(runtimeDir, { recursive: true, force: true });
  }
}
