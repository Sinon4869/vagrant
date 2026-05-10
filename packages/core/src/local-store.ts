import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  type AgentRun,
  type Evidence,
  type Issue,
  type Project,
  type RepositoryConfig
} from "./domain.js";

export interface LocalStoreOptions {
  runtimeDir: string;
}

export interface LocalWorkspaceState {
  schemaVersion: 1;
  projects: Project[];
  repositories: RepositoryConfig[];
  rootIssues: Issue[];
  agentRuns: AgentRun[];
  evidence: Evidence[];
  dispatchKeys: string[];
}

const emptyState: LocalWorkspaceState = {
  schemaVersion: 1,
  projects: [],
  repositories: [],
  rootIssues: [],
  agentRuns: [],
  evidence: [],
  dispatchKeys: []
};

export class LocalStore {
  private readonly statePath: string;

  constructor(options: LocalStoreOptions) {
    this.statePath = join(options.runtimeDir, "workspace-state.json");
  }

  async initialize(): Promise<void> {
    await mkdir(dirname(this.statePath), { recursive: true });

    try {
      await this.readState();
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        await this.writeState(emptyState);
        return;
      }

      throw error;
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    const state = await this.readState();
    return state.projects.find((project) => project.id === projectId) ?? null;
  }

  async upsertProject(project: Project): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      projects: upsertById(state.projects, project)
    }));
  }

  async listRepositories(projectId: string): Promise<RepositoryConfig[]> {
    const state = await this.readState();
    return state.repositories.filter((repository) => repository.projectId === projectId);
  }

  async upsertRepository(repository: RepositoryConfig): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      repositories: upsertById(state.repositories, repository)
    }));
  }

  async getRootIssue(rootIssueId: string): Promise<Issue | null> {
    const state = await this.readState();
    return state.rootIssues.find((issue) => issue.id === rootIssueId) ?? null;
  }

  async listRootIssues(projectId: string): Promise<Issue[]> {
    const state = await this.readState();
    return state.rootIssues.filter((issue) => issue.projectId === projectId);
  }

  async upsertRootIssue(rootIssue: Issue): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      rootIssues: upsertById(state.rootIssues, rootIssue)
    }));
  }

  async listAgentRuns(rootIssueId: string): Promise<AgentRun[]> {
    const state = await this.readState();
    const issueIds = new Set(flattenIssueIds(state.rootIssues.find((issue) => issue.id === rootIssueId)));
    return state.agentRuns.filter((run) => issueIds.has(run.issueId));
  }

  async upsertAgentRun(run: AgentRun): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      agentRuns: upsertById(state.agentRuns, run)
    }));
  }

  async appendEvidence(evidence: Evidence[]): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      evidence: evidence.reduce((items, item) => upsertById(items, item), state.evidence)
    }));
  }

  async hasDispatchKey(dispatchKey: string): Promise<boolean> {
    const state = await this.readState();
    return state.dispatchKeys.includes(dispatchKey);
  }

  async listDispatchKeys(): Promise<Set<string>> {
    const state = await this.readState();
    return new Set(state.dispatchKeys);
  }

  async addDispatchKey(dispatchKey: string): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      dispatchKeys: state.dispatchKeys.includes(dispatchKey)
        ? state.dispatchKeys
        : [...state.dispatchKeys, dispatchKey]
    }));
  }

  private async updateState(update: (state: LocalWorkspaceState) => LocalWorkspaceState): Promise<void> {
    const state = await this.readState();
    await this.writeState(update(state));
  }

  private async readState(): Promise<LocalWorkspaceState> {
    const body = await readFile(this.statePath, "utf8");
    return JSON.parse(body) as LocalWorkspaceState;
  }

  private async writeState(state: LocalWorkspaceState): Promise<void> {
    const temporaryPath = `${this.statePath}.tmp`;
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.statePath);
  }
}

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);

  if (index === -1) {
    return [...items, next];
  }

  return items.map((item) => (item.id === next.id ? next : item));
}

function flattenIssueIds(issue: Issue | undefined): string[] {
  if (!issue) {
    return [];
  }

  return [issue.id, ...issue.children.flatMap((child) => flattenIssueIds(child))];
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
