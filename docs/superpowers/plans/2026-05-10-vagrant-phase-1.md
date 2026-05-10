# Vagrant Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable Vagrant skeleton: core issue-tree domain logic, deterministic planning, mock dispatcher/runtime/provider flow, and a local web UI that shows a requirement tree and current processing state.

**Architecture:** Use a TypeScript pnpm monorepo. `packages/core` contains pure domain, planner, dispatcher, notification, and mock adapter logic with Vitest coverage. `apps/web` is a Next.js App Router UI that consumes seeded in-memory data from core so the first phase is runnable before real persistence, CLI runtimes, and provider sync are added.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, Next.js App Router, React, Tailwind CSS, ESLint.

---

## Phase Boundary

This plan implements Phase 1 only. It creates the engineering skeleton and a working local demo path:

1. Seed one project.
2. Create one root issue.
3. Plan a nested issue tree using deterministic rules.
4. Run a mock dispatcher.
5. Produce mock agent runs and evidence.
6. Render project dashboard, root issue tree, selected node details, activity, evidence, and notification attention items.

This phase does not implement real Codex CLI, Claude CLI, git worktrees, provider sync, SQLite/Postgres, email sending, authentication, or production sandboxing. It defines interfaces and mock implementations for those concerns so later phases can replace the mocks without changing UI/domain contracts.

## File Structure

Create these files:

- `package.json`: root scripts and workspace tooling.
- `pnpm-workspace.yaml`: workspace package globs.
- `tsconfig.base.json`: shared TypeScript config.
- `.gitignore`: generated files and local runtime data.
- `packages/core/package.json`: core package scripts.
- `packages/core/tsconfig.json`: core TypeScript config.
- `packages/core/vitest.config.ts`: Vitest config.
- `packages/core/src/index.ts`: public exports.
- `packages/core/src/domain.ts`: domain enums, types, helpers.
- `packages/core/src/issue-tree.ts`: tree building and status aggregation.
- `packages/core/src/rule-planner.ts`: deterministic issue tree templates.
- `packages/core/src/dispatcher.ts`: mock autopilot dispatcher and idempotency.
- `packages/core/src/adapters.ts`: runtime/provider adapter interfaces and mock adapters.
- `packages/core/src/notifications.ts`: attention and digest dedupe logic.
- `packages/core/src/seed.ts`: deterministic demo project data.
- `packages/core/src/__tests__/issue-tree.test.ts`: status aggregation tests.
- `packages/core/src/__tests__/rule-planner.test.ts`: planner tests.
- `packages/core/src/__tests__/dispatcher.test.ts`: dispatcher/idempotency tests.
- `packages/core/src/__tests__/notifications.test.ts`: notification dedupe tests.
- `apps/web/package.json`: web package scripts and dependencies.
- `apps/web/next.config.mjs`: Next config.
- `apps/web/tsconfig.json`: web TypeScript config.
- `apps/web/postcss.config.mjs`: PostCSS config.
- `apps/web/tailwind.config.ts`: Tailwind config.
- `apps/web/src/app/globals.css`: base styles.
- `apps/web/src/app/layout.tsx`: app shell metadata.
- `apps/web/src/app/page.tsx`: project dashboard.
- `apps/web/src/app/issues/[issueId]/page.tsx`: root issue detail page.
- `apps/web/src/components/app-shell.tsx`: navigation and layout.
- `apps/web/src/components/status-badge.tsx`: reusable status badge.
- `apps/web/src/components/issue-tree.tsx`: recursive issue tree.
- `apps/web/src/components/issue-detail-panel.tsx`: selected issue summary.
- `apps/web/src/components/activity-timeline.tsx`: activity list.
- `apps/web/src/components/evidence-list.tsx`: evidence list.
- `apps/web/src/components/attention-panel.tsx`: notification attention items.
- `apps/web/src/lib/demo-data.ts`: web-facing seeded data.

Modify these files:

- `docs/superpowers/specs/2026-05-10-vagrant-design.md`: no changes expected in Phase 1.
- `agent-operating-manual-v2-2026-05-10.md`: no changes expected in Phase 1.

---

### Task 1: Bootstrap Monorepo Tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package files**

Write `package.json`:

```json
{
  "name": "vagrant",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "pnpm --filter @vagrant/web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

Write `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Write `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Write `.gitignore`:

```gitignore
node_modules
.next
dist
coverage
.turbo
.env
.env.*
!.env.example
.DS_Store
.vagrant/runtime
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
pnpm install
```

Expected: pnpm creates `pnpm-lock.yaml` and exits successfully.

- [ ] **Step 3: Verify workspace scripts fail clearly before packages exist**

Run:

```bash
pnpm test
```

Expected: pnpm reports that no workspace packages have a `test` script or exits without running package tests. This is acceptable before package creation.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore pnpm-lock.yaml
git commit -m "chore: bootstrap pnpm workspace"
```

---

### Task 2: Add Core Domain Types

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/domain.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/__tests__/issue-tree.test.ts`

- [ ] **Step 1: Create core package config**

Write `packages/core/package.json`:

```json
{
  "name": "@vagrant/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}
```

Write `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "src/**/__tests__/**/*.ts"]
}
```

Write `packages/core/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
```

- [ ] **Step 2: Write failing domain import test**

Write `packages/core/src/__tests__/issue-tree.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createIssue, IssueStatus } from "../domain";

describe("domain", () => {
  it("creates an issue with default todo status", () => {
    const issue = createIssue({
      id: "issue-root",
      projectId: "project-1",
      title: "Build wiki",
      type: "requirement"
    });

    expect(issue.status).toBe(IssueStatus.Todo);
    expect(issue.parentIssueId).toBeNull();
    expect(issue.children).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test
```

Expected: FAIL because `packages/core/src/domain.ts` does not exist.

- [ ] **Step 4: Implement domain types**

Write `packages/core/src/domain.ts`:

```ts
export enum IssueStatus {
  Todo = "todo",
  InProgress = "in_progress",
  Blocked = "blocked",
  InReview = "in_review",
  Done = "done",
  Cancelled = "cancelled"
}

export enum GateConclusion {
  Pass = "pass",
  ConditionalPass = "conditional_pass",
  RequestChanges = "request_changes",
  Blocked = "blocked",
  Fail = "fail"
}

export enum AgentRole {
  CEO = "ceo",
  CTO = "cto",
  ProductManager = "product_manager",
  UxUi = "ux_ui",
  EngineeringLead = "engineering_lead",
  FrontendDeveloper = "frontend_developer",
  BackendDeveloper = "backend_developer",
  Database = "database",
  DevOps = "devops",
  CodeReview = "code_review",
  QA = "qa",
  Documentation = "documentation",
  ReleaseManager = "release_manager"
}

export enum IssueType {
  Requirement = "requirement",
  Product = "product",
  Design = "design",
  TechnicalPlan = "technical_plan",
  Frontend = "frontend",
  Backend = "backend",
  Database = "database",
  DevOps = "devops",
  Review = "review",
  QA = "qa",
  Release = "release",
  Documentation = "documentation",
  ProjectManagement = "project_management"
}

export type EvidenceKind =
  | "branch"
  | "commit"
  | "pull_request"
  | "diff"
  | "test_log"
  | "screenshot"
  | "running_url"
  | "review_conclusion"
  | "qa_report"
  | "release_conclusion"
  | "documentation_path";

export interface Evidence {
  id: string;
  issueId: string;
  kind: EvidenceKind;
  title: string;
  url: string | null;
  body: string;
  createdAt: string;
}

export interface Blocker {
  id: string;
  issueId: string;
  ownerAgentRole: AgentRole | null;
  reason: string;
  unblockCondition: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Issue {
  id: string;
  projectId: string;
  parentIssueId: string | null;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  ownerAgentRole: AgentRole | null;
  acceptanceCriteria: string[];
  evidenceRequirements: EvidenceKind[];
  children: Issue[];
  blockers: Blocker[];
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueInput {
  id: string;
  projectId: string;
  title: string;
  type: IssueType | `${IssueType}`;
  parentIssueId?: string | null;
  description?: string;
  status?: IssueStatus;
  ownerAgentRole?: AgentRole | null;
  acceptanceCriteria?: string[];
  evidenceRequirements?: EvidenceKind[];
  children?: Issue[];
  blockers?: Blocker[];
  evidence?: Evidence[];
  now?: string;
}

export function createIssue(input: CreateIssueInput): Issue {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    parentIssueId: input.parentIssueId ?? null,
    title: input.title,
    description: input.description ?? "",
    type: input.type as IssueType,
    status: input.status ?? IssueStatus.Todo,
    ownerAgentRole: input.ownerAgentRole ?? null,
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    evidenceRequirements: input.evidenceRequirements ?? [],
    children: input.children ?? [],
    blockers: input.blockers ?? [],
    evidence: input.evidence ?? [],
    createdAt: now,
    updatedAt: now
  };
}
```

Write `packages/core/src/index.ts`:

```ts
export * from "./domain.js";
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @vagrant/core test
pnpm --filter @vagrant/core typecheck
pnpm --filter @vagrant/core build
node -e "import('./packages/core/dist/index.js').then((m)=>{ if (!m.createIssue) process.exit(1); console.log('ok') })"
```

Expected: all commands pass, the Node import prints `ok`, and `packages/core/dist` does not contain compiled test files.

- [ ] **Step 6: Commit**

```bash
git add packages/core package.json pnpm-lock.yaml
git commit -m "feat: add core domain types"
```

---

### Task 3: Implement Issue Tree Aggregation

**Files:**
- Create: `packages/core/src/issue-tree.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/__tests__/issue-tree.test.ts`

- [ ] **Step 1: Replace issue-tree tests with aggregation coverage**

Write `packages/core/src/__tests__/issue-tree.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createIssue, IssueStatus, IssueType } from "../domain";
import { aggregateIssueTree, flattenIssueTree } from "../issue-tree";

describe("issue tree", () => {
  it("flattens nested issue trees in depth-first order", () => {
    const root = createIssue({
      id: "root",
      projectId: "project-1",
      title: "Root",
      type: IssueType.Requirement,
      children: [
        createIssue({
          id: "child-a",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Child A",
          type: IssueType.Frontend,
          children: [
            createIssue({
              id: "grandchild-a",
              projectId: "project-1",
              parentIssueId: "child-a",
              title: "Grandchild A",
              type: IssueType.QA
            })
          ]
        }),
        createIssue({
          id: "child-b",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Child B",
          type: IssueType.Documentation
        })
      ]
    });

    expect(flattenIssueTree(root).map((issue) => issue.id)).toEqual([
      "root",
      "child-a",
      "grandchild-a",
      "child-b"
    ]);
  });

  it("aggregates root issue progress and status counts", () => {
    const root = createIssue({
      id: "root",
      projectId: "project-1",
      title: "Root",
      type: IssueType.Requirement,
      children: [
        createIssue({
          id: "frontend",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Frontend",
          type: IssueType.Frontend,
          status: IssueStatus.Done
        }),
        createIssue({
          id: "review",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Review",
          type: IssueType.Review,
          status: IssueStatus.InReview
        })
      ]
    });

    const summary = aggregateIssueTree(root);

    expect(summary.total).toBe(3);
    expect(summary.counts.done).toBe(1);
    expect(summary.counts.in_review).toBe(1);
    expect(summary.progress).toBe(33);
    expect(summary.aggregateStatus).toBe(IssueStatus.InReview);
  });

  it("marks a root tree blocked when any descendant is blocked", () => {
    const root = createIssue({
      id: "root",
      projectId: "project-1",
      title: "Root",
      type: IssueType.Requirement,
      children: [
        createIssue({
          id: "backend",
          projectId: "project-1",
          parentIssueId: "root",
          title: "Backend",
          type: IssueType.Backend,
          status: IssueStatus.Blocked
        })
      ]
    });

    expect(aggregateIssueTree(root).aggregateStatus).toBe(IssueStatus.Blocked);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test
```

Expected: FAIL because `issue-tree.ts` does not exist.

- [ ] **Step 3: Implement aggregation**

Write `packages/core/src/issue-tree.ts`:

```ts
import { Issue, IssueStatus } from "./domain";

export interface IssueTreeCounts {
  todo: number;
  in_progress: number;
  blocked: number;
  in_review: number;
  done: number;
  cancelled: number;
}

export interface IssueTreeSummary {
  rootIssueId: string;
  total: number;
  counts: IssueTreeCounts;
  progress: number;
  aggregateStatus: IssueStatus;
  blockedIssueIds: string[];
  activeIssueIds: string[];
}

export function flattenIssueTree(root: Issue): Issue[] {
  return [root, ...root.children.flatMap((child) => flattenIssueTree(child))];
}

export function aggregateIssueTree(root: Issue): IssueTreeSummary {
  const issues = flattenIssueTree(root);
  const counts: IssueTreeCounts = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    in_review: 0,
    done: 0,
    cancelled: 0
  };

  for (const issue of issues) {
    counts[issue.status] += 1;
  }

  const blockedIssueIds = issues
    .filter((issue) => issue.status === IssueStatus.Blocked)
    .map((issue) => issue.id);

  const activeIssueIds = issues
    .filter((issue) =>
      [IssueStatus.InProgress, IssueStatus.InReview, IssueStatus.Blocked].includes(issue.status)
    )
    .map((issue) => issue.id);

  const terminalCount = counts.done + counts.cancelled;
  const progress = issues.length === 0 ? 0 : Math.round((terminalCount / issues.length) * 100);

  return {
    rootIssueId: root.id,
    total: issues.length,
    counts,
    progress,
    aggregateStatus: chooseAggregateStatus(counts, issues.length),
    blockedIssueIds,
    activeIssueIds
  };
}

function chooseAggregateStatus(counts: IssueTreeCounts, total: number): IssueStatus {
  if (counts.blocked > 0) return IssueStatus.Blocked;
  if (counts.in_review > 0) return IssueStatus.InReview;
  if (counts.in_progress > 0) return IssueStatus.InProgress;
  if (counts.done + counts.cancelled === total) return IssueStatus.Done;
  return IssueStatus.Todo;
}
```

Update `packages/core/src/index.ts`:

```ts
export * from "./domain";
export * from "./issue-tree";
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
pnpm --filter @vagrant/core test
pnpm --filter @vagrant/core typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/issue-tree.ts packages/core/src/index.ts packages/core/src/__tests__/issue-tree.test.ts
git commit -m "feat: aggregate issue tree status"
```

---

### Task 4: Add Rule Planner

**Files:**
- Create: `packages/core/src/rule-planner.ts`
- Create: `packages/core/src/__tests__/rule-planner.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing planner tests**

Write `packages/core/src/__tests__/rule-planner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AgentRole, IssueType } from "../domain";
import { planIssueTree } from "../rule-planner";

describe("rule planner", () => {
  it("plans a simple UI change as developer and review", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change the dashboard button label",
      description: "Update the primary button text on the dashboard",
      complexity: "small",
      area: "frontend"
    });

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.Frontend,
      IssueType.Review
    ]);
    expect(root.children[0]?.ownerAgentRole).toBe(AgentRole.FrontendDeveloper);
    expect(root.children[1]?.ownerAgentRole).toBe(AgentRole.CodeReview);
  });

  it("plans a full-stack feature with product, technical, implementation, review, qa, and docs", () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-2",
      title: "Add project wiki search",
      description: "Add searchable markdown wiki pages backed by indexed metadata",
      complexity: "large",
      area: "full_stack"
    });

    expect(root.children.map((issue) => issue.type)).toEqual([
      IssueType.Product,
      IssueType.TechnicalPlan,
      IssueType.Frontend,
      IssueType.Backend,
      IssueType.Review,
      IssueType.QA,
      IssueType.Documentation
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test
```

Expected: FAIL because `rule-planner.ts` does not exist.

- [ ] **Step 3: Implement deterministic planner**

Write `packages/core/src/rule-planner.ts`:

```ts
import { AgentRole, createIssue, Issue, IssueType } from "./domain";

export type RequirementComplexity = "small" | "medium" | "large";
export type RequirementArea = "frontend" | "backend" | "full_stack" | "devops" | "documentation";

export interface PlanIssueTreeInput {
  projectId: string;
  rootIssueId: string;
  title: string;
  description: string;
  complexity: RequirementComplexity;
  area: RequirementArea;
}

interface ChildTemplate {
  suffix: string;
  title: string;
  type: IssueType;
  ownerAgentRole: AgentRole;
  acceptanceCriteria: string[];
}

export function planIssueTree(input: PlanIssueTreeInput): Issue {
  const templates = chooseTemplates(input);
  const root = createIssue({
    id: input.rootIssueId,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    type: IssueType.Requirement,
    ownerAgentRole: AgentRole.CEO,
    acceptanceCriteria: [
      "Issue tree is complete",
      "Required gates have evidence",
      "Root issue status accurately reflects descendants"
    ]
  });

  return {
    ...root,
    children: templates.map((template, index) =>
      createIssue({
        id: `${input.rootIssueId}-${template.suffix}`,
        projectId: input.projectId,
        parentIssueId: input.rootIssueId,
        title: `${index + 1}. ${template.title}`,
        type: template.type,
        ownerAgentRole: template.ownerAgentRole,
        acceptanceCriteria: template.acceptanceCriteria
      })
    )
  };
}

function chooseTemplates(input: PlanIssueTreeInput): ChildTemplate[] {
  if (input.complexity === "small" && input.area === "frontend") {
    return [
      frontendTemplate(),
      reviewTemplate()
    ];
  }

  if (input.area === "full_stack" || input.complexity === "large") {
    return [
      productTemplate(),
      technicalTemplate(),
      frontendTemplate(),
      backendTemplate(),
      reviewTemplate(),
      qaTemplate(),
      documentationTemplate()
    ];
  }

  if (input.area === "backend") {
    return [
      technicalTemplate(),
      backendTemplate(),
      reviewTemplate(),
      qaTemplate(),
      documentationTemplate()
    ];
  }

  if (input.area === "devops") {
    return [
      technicalTemplate(),
      devopsTemplate(),
      reviewTemplate(),
      qaTemplate(),
      documentationTemplate()
    ];
  }

  return [
    documentationTemplate(),
    reviewTemplate()
  ];
}

function productTemplate(): ChildTemplate {
  return {
    suffix: "product",
    title: "Define product scope and acceptance criteria",
    type: IssueType.Product,
    ownerAgentRole: AgentRole.ProductManager,
    acceptanceCriteria: ["Scope, non-scope, and acceptance criteria are explicit"]
  };
}

function technicalTemplate(): ChildTemplate {
  return {
    suffix: "technical-plan",
    title: "Create technical plan",
    type: IssueType.TechnicalPlan,
    ownerAgentRole: AgentRole.CTO,
    acceptanceCriteria: ["Implementation boundaries and risks are documented"]
  };
}

function frontendTemplate(): ChildTemplate {
  return {
    suffix: "frontend",
    title: "Implement frontend changes",
    type: IssueType.Frontend,
    ownerAgentRole: AgentRole.FrontendDeveloper,
    acceptanceCriteria: ["Frontend behavior matches the requirement"]
  };
}

function backendTemplate(): ChildTemplate {
  return {
    suffix: "backend",
    title: "Implement backend changes",
    type: IssueType.Backend,
    ownerAgentRole: AgentRole.BackendDeveloper,
    acceptanceCriteria: ["Backend behavior matches the requirement"]
  };
}

function devopsTemplate(): ChildTemplate {
  return {
    suffix: "devops",
    title: "Implement infrastructure changes",
    type: IssueType.DevOps,
    ownerAgentRole: AgentRole.DevOps,
    acceptanceCriteria: ["Infrastructure changes are reproducible and documented"]
  };
}

function reviewTemplate(): ChildTemplate {
  return {
    suffix: "review",
    title: "Review implementation and evidence",
    type: IssueType.Review,
    ownerAgentRole: AgentRole.CodeReview,
    acceptanceCriteria: ["Review conclusion is pass, conditional pass, request changes, or blocked"]
  };
}

function qaTemplate(): ChildTemplate {
  return {
    suffix: "qa",
    title: "Validate acceptance criteria",
    type: IssueType.QA,
    ownerAgentRole: AgentRole.QA,
    acceptanceCriteria: ["QA report covers success and failure paths"]
  };
}

function documentationTemplate(): ChildTemplate {
  return {
    suffix: "docs",
    title: "Update delivery documentation",
    type: IssueType.Documentation,
    ownerAgentRole: AgentRole.Documentation,
    acceptanceCriteria: ["Wiki or delivery notes reference implementation evidence"]
  };
}
```

Update `packages/core/src/index.ts`:

```ts
export * from "./domain";
export * from "./issue-tree";
export * from "./rule-planner";
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
pnpm --filter @vagrant/core test
pnpm --filter @vagrant/core typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/rule-planner.ts packages/core/src/index.ts packages/core/src/__tests__/rule-planner.test.ts
git commit -m "feat: add deterministic issue planner"
```

---

### Task 5: Add Mock Runtime, Provider, and Dispatcher

**Files:**
- Create: `packages/core/src/adapters.ts`
- Create: `packages/core/src/dispatcher.ts`
- Create: `packages/core/src/__tests__/dispatcher.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing dispatcher tests**

Write `packages/core/src/__tests__/dispatcher.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IssueStatus } from "../domain";
import { dispatchReadyIssues } from "../dispatcher";
import { MockProviderAdapter, MockRuntimeAdapter } from "../adapters";
import { planIssueTree } from "../rule-planner";

describe("dispatcher", () => {
  it("runs the first ready todo child and records evidence", async () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change dashboard button",
      description: "Change dashboard button text",
      complexity: "small",
      area: "frontend"
    });

    const result = await dispatchReadyIssues({
      root,
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: new Set()
    });

    expect(result.dispatchedRuns).toHaveLength(1);
    expect(result.root.children[0]?.status).toBe(IssueStatus.Done);
    expect(result.root.children[0]?.evidence[0]?.kind).toBe("test_log");
    expect(result.dispatchKeys.size).toBe(1);
  });

  it("does not dispatch the same event twice", async () => {
    const root = planIssueTree({
      projectId: "project-1",
      rootIssueId: "root-1",
      title: "Change dashboard button",
      description: "Change dashboard button text",
      complexity: "small",
      area: "frontend"
    });

    const first = await dispatchReadyIssues({
      root,
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: new Set()
    });

    const second = await dispatchReadyIssues({
      root: first.root,
      triggerEventId: "event-1",
      runtime: new MockRuntimeAdapter(),
      provider: new MockProviderAdapter(),
      previousDispatchKeys: first.dispatchKeys
    });

    expect(second.dispatchedRuns).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test
```

Expected: FAIL because `dispatcher.ts` and `adapters.ts` do not exist.

- [ ] **Step 3: Implement adapter interfaces and mocks**

Write `packages/core/src/adapters.ts`:

```ts
import { Evidence, Issue } from "./domain";

export interface AgentRunInput {
  runId: string;
  issue: Issue;
  workingDirectory: string;
}

export interface AgentRunResult {
  runId: string;
  summary: string;
  evidence: Evidence[];
}

export interface RuntimeAdapter {
  startRun(input: AgentRunInput): Promise<AgentRunResult>;
}

export interface ProviderAdapter {
  syncIssue(issue: Issue): Promise<{ externalUrl: string | null }>;
}

export class MockRuntimeAdapter implements RuntimeAdapter {
  async startRun(input: AgentRunInput): Promise<AgentRunResult> {
    return {
      runId: input.runId,
      summary: `Mock run completed for ${input.issue.title}`,
      evidence: [
        {
          id: `${input.runId}-test-log`,
          issueId: input.issue.id,
          kind: "test_log",
          title: "Mock validation log",
          url: null,
          body: "Mock runtime completed successfully.",
          createdAt: "2026-05-10T00:00:00.000Z"
        }
      ]
    };
  }
}

export class MockProviderAdapter implements ProviderAdapter {
  async syncIssue(issue: Issue): Promise<{ externalUrl: string | null }> {
    return {
      externalUrl: `https://provider.example/issues/${issue.id}`
    };
  }
}
```

- [ ] **Step 4: Implement dispatcher**

Write `packages/core/src/dispatcher.ts`:

```ts
import { RuntimeAdapter, ProviderAdapter } from "./adapters";
import { Issue, IssueStatus } from "./domain";

export interface DispatchReadyIssuesInput {
  root: Issue;
  triggerEventId: string;
  runtime: RuntimeAdapter;
  provider: ProviderAdapter;
  previousDispatchKeys: Set<string>;
}

export interface DispatchedRun {
  runId: string;
  issueId: string;
  dispatchKey: string;
  summary: string;
}

export interface DispatchReadyIssuesResult {
  root: Issue;
  dispatchedRuns: DispatchedRun[];
  dispatchKeys: Set<string>;
}

export async function dispatchReadyIssues(
  input: DispatchReadyIssuesInput
): Promise<DispatchReadyIssuesResult> {
  const dispatchKeys = new Set(input.previousDispatchKeys);
  const dispatchedRuns: DispatchedRun[] = [];
  let didDispatch = false;

  const nextRoot = await mapIssueTree(input.root, async (issue) => {
    if (didDispatch || issue.id === input.root.id || issue.status !== IssueStatus.Todo) {
      return issue;
    }

    const dispatchKey = `${input.root.id}:${issue.id}:${issue.ownerAgentRole ?? "unassigned"}:${input.triggerEventId}:run`;
    if (dispatchKeys.has(dispatchKey)) {
      return issue;
    }

    dispatchKeys.add(dispatchKey);
    didDispatch = true;

    const runId = `run-${issue.id}-${input.triggerEventId}`;
    const runResult = await input.runtime.startRun({
      runId,
      issue,
      workingDirectory: `/mock/workspaces/${input.root.id}`
    });

    await input.provider.syncIssue(issue);

    dispatchedRuns.push({
      runId,
      issueId: issue.id,
      dispatchKey,
      summary: runResult.summary
    });

    return {
      ...issue,
      status: IssueStatus.Done,
      evidence: [...issue.evidence, ...runResult.evidence],
      updatedAt: "2026-05-10T00:00:00.000Z"
    };
  });

  return {
    root: nextRoot,
    dispatchedRuns,
    dispatchKeys
  };
}

async function mapIssueTree(issue: Issue, mapper: (issue: Issue) => Promise<Issue>): Promise<Issue> {
  const mapped = await mapper(issue);
  const children = [];

  for (const child of mapped.children) {
    children.push(await mapIssueTree(child, mapper));
  }

  return {
    ...mapped,
    children
  };
}
```

Update `packages/core/src/index.ts`:

```ts
export * from "./domain";
export * from "./issue-tree";
export * from "./rule-planner";
export * from "./adapters";
export * from "./dispatcher";
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @vagrant/core test
pnpm --filter @vagrant/core typecheck
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/adapters.ts packages/core/src/dispatcher.ts packages/core/src/index.ts packages/core/src/__tests__/dispatcher.test.ts
git commit -m "feat: add mock autopilot dispatcher"
```

---

### Task 6: Add Notification Dedupe and Demo Seed

**Files:**
- Create: `packages/core/src/notifications.ts`
- Create: `packages/core/src/seed.ts`
- Create: `packages/core/src/__tests__/notifications.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing notification tests**

Write `packages/core/src/__tests__/notifications.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createNotificationDecision } from "../notifications";

describe("notifications", () => {
  it("sends the first approval notification", () => {
    const decision = createNotificationDecision({
      projectId: "project-1",
      rootIssueId: "root-1",
      type: "approval_required",
      subjectId: "approval-1",
      sentKeys: new Set()
    });

    expect(decision.shouldSendEmail).toBe(true);
    expect(decision.dedupeKey).toBe("project-1:root-1:approval_required:approval-1");
  });

  it("dedupes a repeated blocker notification", () => {
    const sentKeys = new Set(["project-1:root-1:blocked:blocker-1"]);
    const decision = createNotificationDecision({
      projectId: "project-1",
      rootIssueId: "root-1",
      type: "blocked",
      subjectId: "blocker-1",
      sentKeys
    });

    expect(decision.shouldSendEmail).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @vagrant/core test
```

Expected: FAIL because `notifications.ts` does not exist.

- [ ] **Step 3: Implement notification decision logic**

Write `packages/core/src/notifications.ts`:

```ts
export type NotificationType =
  | "approval_required"
  | "blocked"
  | "failed_after_retry"
  | "root_issue_completed"
  | "digest";

export interface NotificationDecisionInput {
  projectId: string;
  rootIssueId: string;
  type: NotificationType;
  subjectId: string;
  sentKeys: Set<string>;
}

export interface NotificationDecision {
  dedupeKey: string;
  shouldSendEmail: boolean;
  reason: string;
}

export function createNotificationDecision(input: NotificationDecisionInput): NotificationDecision {
  const dedupeKey = `${input.projectId}:${input.rootIssueId}:${input.type}:${input.subjectId}`;
  const immediateTypes: NotificationType[] = [
    "approval_required",
    "blocked",
    "failed_after_retry",
    "root_issue_completed"
  ];

  if (input.sentKeys.has(dedupeKey)) {
    return {
      dedupeKey,
      shouldSendEmail: false,
      reason: "Notification with the same dedupe key was already sent."
    };
  }

  return {
    dedupeKey,
    shouldSendEmail: immediateTypes.includes(input.type),
    reason: immediateTypes.includes(input.type)
      ? "Immediate email notification is allowed for this type."
      : "Event should be included in a digest."
  };
}
```

- [ ] **Step 4: Add deterministic seed data**

Write `packages/core/src/seed.ts`:

```ts
import { aggregateIssueTree } from "./issue-tree";
import { planIssueTree } from "./rule-planner";

export function createDemoProject() {
  const rootIssue = planIssueTree({
    projectId: "project-vagrant",
    rootIssueId: "issue-vagrant-knowledge",
    title: "Build agent knowledge wiki",
    description: "Create a Markdown wiki with structured indexes for agent context and delivery evidence.",
    complexity: "large",
    area: "full_stack"
  });

  return {
    project: {
      id: "project-vagrant",
      name: "vagrant",
      repositoryUrl: "https://github.com/Sinon4869/vagrant"
    },
    rootIssue,
    summary: aggregateIssueTree(rootIssue),
    attentionItems: [
      {
        id: "attention-1",
        type: "digest",
        title: "Autopilot is ready to start the first subissue",
        body: "The deterministic planner created a full-stack issue tree."
      }
    ]
  };
}
```

Update `packages/core/src/index.ts`:

```ts
export * from "./domain";
export * from "./issue-tree";
export * from "./rule-planner";
export * from "./adapters";
export * from "./dispatcher";
export * from "./notifications";
export * from "./seed";
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @vagrant/core test
pnpm --filter @vagrant/core typecheck
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/notifications.ts packages/core/src/seed.ts packages/core/src/index.ts packages/core/src/__tests__/notifications.test.ts
git commit -m "feat: add notification dedupe and demo seed"
```

---

### Task 7: Bootstrap Next.js Web App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/app-shell.tsx`
- Create: `apps/web/src/components/status-badge.tsx`

- [ ] **Step 1: Create web package config**

Write `apps/web/package.json`:

```json
{
  "name": "@vagrant/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run --passWithNoTests",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vagrant/core": "workspace:*",
    "next": "^15.0.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.0.4",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "vitest": "^2.1.8"
  }
}
```

Write `apps/web/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@vagrant/core"]
};

export default nextConfig;
```

Write `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "noEmit": true,
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Write `apps/web/postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
```

Write `apps/web/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f7f8fa",
        ink: "#171717",
        muted: "#6b7280",
        line: "#d9dde3"
      }
    }
  },
  plugins: []
};

export default config;
```

- [ ] **Step 2: Add app shell and base styles**

Write `apps/web/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
  background: #f7f8fa;
  color: #171717;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f7f8fa;
  color: #171717;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}
```

Write `apps/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Vagrant",
  description: "Local-first multi-agent engineering management platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

Write `apps/web/src/components/app-shell.tsx`:

```tsx
import Link from "next/link";

const navItems = ["Projects", "Issues", "Agents", "Runs", "Wiki", "Providers", "Notifications", "Settings"];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-normal text-ink">
            Vagrant
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <span key={item} className="rounded px-2.5 py-1.5 text-xs font-medium text-muted">
                {item}
              </span>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
```

Write `apps/web/src/components/status-badge.tsx`:

```tsx
import { IssueStatus } from "@vagrant/core";

const styles: Record<IssueStatus, string> = {
  [IssueStatus.Todo]: "border-line bg-white text-muted",
  [IssueStatus.InProgress]: "border-blue-200 bg-blue-50 text-blue-700",
  [IssueStatus.Blocked]: "border-red-200 bg-red-50 text-red-700",
  [IssueStatus.InReview]: "border-amber-200 bg-amber-50 text-amber-700",
  [IssueStatus.Done]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [IssueStatus.Cancelled]: "border-zinc-200 bg-zinc-100 text-zinc-500"
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm install
```

Expected: dependencies install and `pnpm-lock.yaml` updates.

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm --filter @vagrant/web typecheck
```

Expected: PASS after Next generates required local type files, or fail only for missing `next-env.d.ts`.

If `next-env.d.ts` is missing, create `apps/web/next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is generated by Next.js in normal dev/build flows and is committed here for typecheck stability.
```

Run:

```bash
pnpm --filter @vagrant/web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web package.json pnpm-lock.yaml
git commit -m "feat: bootstrap web app shell"
```

---

### Task 8: Build Project Dashboard UI

**Files:**
- Create: `apps/web/src/lib/demo-data.ts`
- Create: `apps/web/src/components/attention-panel.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Add web demo data wrapper**

Write `apps/web/src/lib/demo-data.ts`:

```ts
import { createDemoProject } from "@vagrant/core";

export function getDemoData() {
  return createDemoProject();
}
```

- [ ] **Step 2: Add attention panel**

Write `apps/web/src/components/attention-panel.tsx`:

```tsx
interface AttentionItem {
  id: string;
  type: string;
  title: string;
  body: string;
}

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <section className="rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Current Attention</h2>
      </div>
      <div className="divide-y divide-line">
        {items.map((item) => (
          <article key={item.id} className="px-4 py-3">
            <div className="text-xs font-medium uppercase text-muted">{item.type}</div>
            <h3 className="mt-1 text-sm font-medium text-ink">{item.title}</h3>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Build dashboard page**

Write `apps/web/src/app/page.tsx`:

```tsx
import Link from "next/link";
import { AttentionPanel } from "@/components/attention-panel";
import { StatusBadge } from "@/components/status-badge";
import { getDemoData } from "@/lib/demo-data";

export default function DashboardPage() {
  const { project, rootIssue, summary, attentionItems } = getDemoData();

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase text-muted">Project</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-ink">{project.name}</h1>
          <p className="mt-2 text-sm text-muted">{project.repositoryUrl}</p>
        </div>
        <StatusBadge status={summary.aggregateStatus} />
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Total issues" value={summary.total} />
        <Metric label="Done" value={summary.counts.done} />
        <Metric label="In progress" value={summary.counts.in_progress} />
        <Metric label="In review" value={summary.counts.in_review} />
        <Metric label="Blocked" value={summary.counts.blocked} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Active Root Issues</h2>
            <span className="text-xs text-muted">{summary.progress}% complete</span>
          </div>
          <Link href={`/issues/${rootIssue.id}`} className="block px-4 py-4 hover:bg-surface">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-ink">{rootIssue.title}</h3>
                <p className="mt-1 text-sm text-muted">{rootIssue.description}</p>
              </div>
              <StatusBadge status={summary.aggregateStatus} />
            </div>
          </Link>
        </section>
        <AttentionPanel items={attentionItems} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-line bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run validation**

Run:

```bash
pnpm --filter @vagrant/web typecheck
pnpm --filter @vagrant/web build
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/demo-data.ts apps/web/src/components/attention-panel.tsx apps/web/src/app/page.tsx
git commit -m "feat: add project dashboard"
```

---

### Task 9: Build Root Issue Tree UI

**Files:**
- Create: `apps/web/src/components/issue-tree.tsx`
- Create: `apps/web/src/components/issue-detail-panel.tsx`
- Create: `apps/web/src/components/activity-timeline.tsx`
- Create: `apps/web/src/components/evidence-list.tsx`
- Create: `apps/web/src/app/issues/[issueId]/page.tsx`

- [ ] **Step 1: Add recursive issue tree component**

Write `apps/web/src/components/issue-tree.tsx`:

```tsx
import { Issue } from "@vagrant/core";
import { StatusBadge } from "@/components/status-badge";

export function IssueTree({ root }: { root: Issue }) {
  return (
    <div className="rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Issue Tree</h2>
      </div>
      <div className="p-3">
        <IssueNode issue={root} depth={0} />
      </div>
    </div>
  );
}

function IssueNode({ issue, depth }: { issue: Issue; depth: number }) {
  return (
    <div>
      <div
        className="grid grid-cols-[1fr_auto] items-center gap-3 rounded px-3 py-2 hover:bg-surface"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{issue.title}</div>
          <div className="mt-0.5 text-xs text-muted">
            {issue.ownerAgentRole ?? "unassigned"} · {issue.type} · {issue.evidence.length} evidence
          </div>
        </div>
        <StatusBadge status={issue.status} />
      </div>
      {issue.children.map((child) => (
        <IssueNode key={child.id} issue={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add detail and evidence components**

Write `apps/web/src/components/issue-detail-panel.tsx`:

```tsx
import { Issue, IssueTreeSummary } from "@vagrant/core";
import { StatusBadge } from "@/components/status-badge";

export function IssueDetailPanel({ issue, summary }: { issue: Issue; summary: IssueTreeSummary }) {
  return (
    <aside className="rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Requirement Status</h2>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-ink">{issue.title}</h3>
            <StatusBadge status={summary.aggregateStatus} />
          </div>
          <p className="text-sm text-muted">{issue.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Fact label="Progress" value={`${summary.progress}%`} />
          <Fact label="Total" value={String(summary.total)} />
          <Fact label="Done" value={String(summary.counts.done)} />
          <Fact label="Blocked" value={String(summary.counts.blocked)} />
        </div>
        <div>
          <h4 className="text-xs font-medium uppercase text-muted">Acceptance Criteria</h4>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {issue.acceptanceCriteria.map((criterion) => (
              <li key={criterion}>- {criterion}</li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}
```

Write `apps/web/src/components/evidence-list.tsx`:

```tsx
import { flattenIssueTree, Issue } from "@vagrant/core";

export function EvidenceList({ root }: { root: Issue }) {
  const evidence = flattenIssueTree(root).flatMap((issue) =>
    issue.evidence.map((item) => ({ ...item, issueTitle: issue.title }))
  );

  return (
    <section className="rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Evidence</h2>
      </div>
      <div className="divide-y divide-line">
        {evidence.length === 0 ? (
          <div className="px-4 py-4 text-sm text-muted">No evidence has been captured yet.</div>
        ) : (
          evidence.map((item) => (
            <article key={item.id} className="px-4 py-3">
              <div className="text-xs font-medium uppercase text-muted">{item.kind}</div>
              <h3 className="mt-1 text-sm font-medium text-ink">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">{item.issueTitle}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
```

Write `apps/web/src/components/activity-timeline.tsx`:

```tsx
import { flattenIssueTree, Issue } from "@vagrant/core";

export function ActivityTimeline({ root }: { root: Issue }) {
  const issues = flattenIssueTree(root);

  return (
    <section className="rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Activity Timeline</h2>
      </div>
      <div className="divide-y divide-line">
        {issues.map((issue) => (
          <article key={issue.id} className="px-4 py-3">
            <div className="text-sm font-medium text-ink">{issue.title}</div>
            <p className="mt-1 text-sm text-muted">
              {issue.ownerAgentRole ?? "unassigned"} is currently {issue.status.replace("_", " ")}.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Build root issue page**

Write `apps/web/src/app/issues/[issueId]/page.tsx`:

```tsx
import { aggregateIssueTree } from "@vagrant/core";
import { ActivityTimeline } from "@/components/activity-timeline";
import { EvidenceList } from "@/components/evidence-list";
import { IssueDetailPanel } from "@/components/issue-detail-panel";
import { IssueTree } from "@/components/issue-tree";
import { StatusBadge } from "@/components/status-badge";
import { getDemoData } from "@/lib/demo-data";

export default function RootIssuePage() {
  const { project, rootIssue } = getDemoData();
  const summary = aggregateIssueTree(rootIssue);

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase text-muted">{project.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-ink">{rootIssue.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">{rootIssue.description}</p>
        </div>
        <StatusBadge status={summary.aggregateStatus} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <IssueTree root={rootIssue} />
          <ActivityTimeline root={rootIssue} />
          <EvidenceList root={rootIssue} />
        </div>
        <IssueDetailPanel issue={rootIssue} summary={summary} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run validation**

Run:

```bash
pnpm --filter @vagrant/web typecheck
pnpm --filter @vagrant/web build
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/issue-tree.tsx apps/web/src/components/issue-detail-panel.tsx apps/web/src/components/activity-timeline.tsx apps/web/src/components/evidence-list.tsx apps/web/src/app/issues
git commit -m "feat: add root issue tree view"
```

---

### Task 10: Final Phase 1 Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add README**

Write `README.md`:

```md
# Vagrant

Vagrant is a local-first, open-source multi-agent engineering management platform.

Phase 1 includes:

- TypeScript pnpm monorepo
- Core issue-tree domain model
- Deterministic rule planner
- Mock autopilot dispatcher
- Mock runtime and provider adapters
- Notification dedupe logic
- Next.js local web UI
- Project dashboard
- Root issue tree view

## Development

Install dependencies:

```bash
pnpm install
```

Run tests:

```bash
pnpm test
```

Run type checks:

```bash
pnpm typecheck
```

Run the web app:

```bash
pnpm dev
```

Open `http://localhost:3000`.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:

- core tests pass
- web typecheck passes
- web build passes

- [ ] **Step 3: Start local dev server**

Run:

```bash
pnpm dev
```

Expected: Next.js starts on `http://localhost:3000`.

Open these pages manually:

- `http://localhost:3000`
- `http://localhost:3000/issues/issue-vagrant-knowledge`

Expected:

- dashboard renders project name `vagrant`
- dashboard shows active root issue
- root issue page renders nested issue tree
- right panel shows aggregate progress and status
- activity timeline renders all planned issues
- evidence panel renders empty state before mock dispatch data is wired into UI

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add phase 1 development guide"
```

---

## Self-Review Checklist

Spec coverage for Phase 1:

- Issue tree model: covered by Tasks 2 and 3.
- Rule planner: covered by Task 4.
- Dispatcher idempotency and mock autopilot: covered by Task 5.
- Runtime/provider abstraction: covered by Task 5.
- Notification dedupe: covered by Task 6.
- Project dashboard and issue tree UI: covered by Tasks 7, 8, and 9.
- Evidence model: covered by Tasks 2, 5, and 9.
- Full verification: covered by Task 10.

Deferred to separate plans:

- Real Codex CLI adapter.
- Real Claude CLI adapter.
- Git worktree manager.
- SQLite/Postgres persistence.
- GitHub provider implementation.
- Markdown wiki indexing.
- Email delivery.
- Approval policy guard beyond domain-level modeling.
- Read-only validation sandbox.

Type consistency:

- Domain exports come from `@vagrant/core`.
- UI imports `IssueStatus`, `Issue`, `IssueTreeSummary`, `aggregateIssueTree`, and `flattenIssueTree` from `@vagrant/core`.
- Planner returns an `Issue` root with nested `children`.
- Dispatcher returns a new root issue tree rather than mutating the input tree in place.
