import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../domain.js";
import { createPersistedDemoState } from "../seed.js";

describe("persisted demo seed", () => {
  it("creates provider-neutral repository config and default runtime preferences", () => {
    const state = createPersistedDemoState({
      repositoryLocalPath: "/Users/asuka/Documents/vagrant",
      repositoryRemoteUrl: "https://github.com/Sinon4869/vagrant",
      now: "2026-05-10T00:00:00.000Z"
    });

    expect(state.project.name).toBe("vagrant");
    expect(state.repository.providerType).toBe("generic_git");
    expect(state.repository.remoteUrl).toBe("https://github.com/Sinon4869/vagrant");
    expect(state.defaultRuntimeKind).toBe(RuntimeKind.CodexCli);
    expect(state.rootIssue.children.length).toBeGreaterThan(1);
  });
});
