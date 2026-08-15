# ChronoLoop Frontend Rewrite — Phase 3.4 (Projects Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Projects page from `index.html` into the new React codebase with full visual/behavioral parity — grid and list views of the 10-project mock catalog, live status-filter chips, a Sort/Filter/Search toolbar, a right-sliding Project Detail panel (progress, meta grid, team, milestones), and a New Project creation modal — replacing the current `ProjectsPage` stub (`<h1>Projects</h1>`). Also resolves the Phase 3.1/3.2 backlog item flagging `TeamStatusPanel`'s Select Project dropdown casing/sourcing bug, now that a real Projects data model exists to compare it against.

**Architecture:** A new `projectsStore` (Zustand) holds the canonical `Project[]` list, seeded from a ported `MOCK_PROJECTS` (transliterated 1:1 from `index.html`'s `PROJECTS` array), plus `addProject`/`removeProject`. `projectDetailStore` and `projectModalStore` mirror the existing `taskDetailStore`/`taskModalStore` pattern for open/close state. The page follows the exact composition shape Phase 3.2 established for Tasks — `ProjectsPageHeader` + `ProjectStatsRow` (with a `children` slot for `ProjectsToolbar`) + a Grid/List view switch + a detail panel + a create modal — with small shared pieces (`ProjectStatusBadge`, `ProjectPriorityBadge`, a new `useAnimatedWidth` hook for the progress-bar fill-in animation) factored out because all three of grid/list/detail independently need them.

**Tech Stack:** Existing stack (Vite, React 18, TypeScript strict, Zustand, CSS Modules, Vitest + RTL, lucide-react). No new dependencies. `NewProjectModal` reuses the `Modal`/`Button` primitives (its shape — centered dialog, header/footer, form body — matches cleanly, unlike the detail panel). `ProjectDetailPanel` is a hand-built overlay + fixed panel, not built on `Modal`, mirroring `TaskDetailPanel` (Phase 3.3) for the same reason: a full-height, right-docked sliding panel with icon-only header actions doesn't fit `Modal`'s centered header/footer shape.

**Spec:** `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\specs\2026-08-10-chronoloop-frontend-rewrite-design.md`

## Global Constraints

- **Location:** `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`. Never modify `C:\Users\HP\Downloads\Chronoloop dashboard\` itself (`index.html`, `design.md`, assets) — `docs/` in that repo is the shared planning-docs location and is fair game (Task 10 of this plan updates the backlog there).
- **Package manager:** pnpm. **TypeScript strict mode, no `any`.**
- **Source of truth for this phase:**
  - Mock data: `index.html:7453-7524` (`PROJECTS`, 10 items) and `index.html:8521-8532` (`AVATAR_MAP`, code→avatar-file lookup — only the `JA`/`AS`/`RD`/`MV`/`RC` entries this phase's team members actually use).
  - Render/state logic: `index.html:7526-7865` (`renderProjectsPage`, `_renderProjGrid`, `_renderProjList`, `openProjectDetail`/`closeProjectDetail`, view-toggle/stat-chip/search/sort/filter/new-project wiring), `index.html:8485-8516` (`btn-create-project` handler).
  - Static markup: `index.html:3361-3432` (page shell + stat chips + toolbar), `index.html:5865-5961` (detail panel + context/sort/filter dropdown markup), `index.html:5963-6041` (New Project modal markup).
  - CSS: `index.html:1066-1216` (grid/card/list/empty/detail-panel/color-swatch rules — `.color-swatch` also appears at `:2702-2708` for the unrelated Settings appearance picker; use only the `:1170-1173` rule block, which is what the New Project modal actually uses), plus the shared `.priority-pill` rules at `index.html:840-847` (already ported once for `AddTaskModal`'s `formStyles.module.css` in Phase 3.2 — this phase gets its own copy in `projects/modals/formStyles.module.css`, matching that file's own established duplication).
- **Pixel/behavior parity is required, with these deliberate, explicitly-flagged exceptions and preserved-quirks:**
  - **Stat-chip counts are computed live from `projectsStore`, unlike the original.** The original's `#proj-stat-chips` counts (`10/4/2/2/1/1`) are static HTML literals — unlike Tasks' `updateChips()` (confirmed live and genuinely parity-correct in the Phase 3.2 backlog), **no function in `index.html` ever recomputes the Projects stat chips**; `renderProjectsPage()` never touches them. Preserving that literally would mean this same phase's own New Project modal (Task 9) and Delete action immediately desync the chips from the real list. Building `ProjectStatsRow` live (matching `TaskStatsRow`'s architecture) is a deliberate, flagged deviation — record it in the backlog (Task 10), don't silently "fix" it into looking like original parity.
  - **The Sort dropdown's "Status" option is visually present but a preserved no-op.** `dd-proj-sort` has 5 items (Name, Due Date, Progress, Priority, Status), but `renderProjectsPage()`'s sort switch (`index.html:7547-7552`) has no `'status'` case — selecting it in the shipped app changes the active dropdown item but leaves list order untouched, silently falling through to `return 0`. Render the option; do not add real status-sort logic.
  - **The Filter dropdown's Priority/Category checkboxes are decorative, matching the original.** `proj-filter-apply`'s handler (`index.html:8842-8846`) only closes the dropdown, toasts, and re-renders using the *stat-chip* filter (`projFilterMode`) — the checkboxes are never read. Same non-functional-checkbox pattern already established for `TasksToolbar` (Phase 3.2 backlog: "checkboxes are non-functional either way").
  - **New Project's "Lead Assignee" select is captured in the form but never used.** `btn-create-project`'s handler (`index.html:8485-8516`) never reads `proj-assignee-sel` — every new project gets the same hardcoded `team:[{i:'JA',c:'#4A90FF',n:'Jacobs A.'}]` regardless of which assignee is selected. Render the field; do not wire its value into `addProject`.
  - **New Project's `dueDays` is always hardcoded to `30`**, regardless of the chosen due date (`index.html:8498`). Preserve exactly — don't compute a real day-delta from the picked date.
  - **List-view column headers look interactive (`cursor:pointer`, hover color, a chevrons-up-down icon on "Project") but have no click handler anywhere in the original.** No sort-on-column-click; render them as plain non-interactive labels.
  - **List view has no per-row context menu; grid view does.** `_renderProjList` (`index.html:7639-7693`) never renders a `.proj-card-menu`-equivalent — only `_renderProjGrid` wires one. Don't add a three-dot menu to `ProjectListRow`.
  - **`TeamStatusPanel`'s Select Project dropdown gets a small parity fix (Task 10), not a new shared-data-source refactor.** The Phase 3.1/3.2 backlog flagged this dropdown's options as sourced from `DASHBOARD_CRITICAL_PROJECTS` (whose title is lowercase `'Web 3 app for Fxtrade'`) plus a bolted-on 4th item, while the original's actual dropdown (`index.html:5473-5480`) is **plain static markup with four literal button labels** — not derived from any array at all, and already capitalized `Web 3 App for Fxtrade`. The correct fix is a local 4-string `PROJECT_OPTIONS` literal in `TeamStatusPanel.tsx` (matching the casing/count `TasksToolbar`'s `PROJECT_NAMES` and `AddTaskModal`'s `PROJECTS` array already use), **not** a shared `projectsStore`-backed selector — the original itself independently hardcodes this same 4-item list in at least three places, so per-consumer duplication is the actual parity-correct pattern here, not a bug to unify away. Do not touch `DASHBOARD_CRITICAL_PROJECTS` itself or attempt to merge it with the new `MOCK_PROJECTS` — it's a genuinely separate, smaller, dashboard-only hardcoded list in the original (3 items, different shape, and its `client` field for "Redesign of Website" — `'Fxtrade Expert'` — doesn't even match `PROJECTS`' own `'Artstyle Co.'` for the same project name, a pre-existing drift in the original itself, not something this phase should reconcile).
  - **Escape-to-close and inert-while-closed on `ProjectDetailPanel` are deliberate accessibility additions, not strict parity** — same category of deviation, and same ref+effect `inert` workaround (this project's `@types/react@18.3.31` doesn't declare the `inert` JSX attribute), already established for `TaskDetailPanel` in Phase 3.3. The overlay is a real click-blocking DOM element (`onClick={close}`), not a `useOutsideClick` listener, for the same reasoning already recorded in the Phase 3.3 plan (a listener would let a click on a different card both close and immediately reopen the panel in one click).
  - **The progress-bar fill-in animation (grid cards, list rows, the detail panel's big bar) replays on every value change, not just on mount.** The original rebuilds the whole grid/list DOM from scratch on every sort/filter/search (`renderProjectsPage()` always starts fresh at `width:0%` then double-`requestAnimationFrame`s to the real width — `index.html:7609-7614`, `:7683-7688`, `:7740`). This is the opposite of `useCountUp`'s mount-once guard (Phase 3.1) — the new shared `useAnimatedWidth` hook (Task 2) intentionally has no "already animated" ref, so it re-triggers the 0%→target flourish on every `target` change, matching the original's actual re-render-from-scratch behavior rather than `useCountUp`'s snap-instantly-after-first-time behavior.
- **Reuse Phase 1–3.3 primitives where the shape actually matches:** `Avatar` is used directly for project team avatars (own `style`/`fallbackStyle` props already support the 24px stacked/40px team-grid/28px sizes needed here) — there's no dedicated `ProjectAvatarBubble` wrapper component, unlike `TaskAssigneeBubble`, because Projects' team members don't need a second consumer beyond this page to justify one. `Dropdown` (sort/filter/context menus), `Modal` (New Project), and `Button` are reused as-is.
- **Verification gate for the whole phase:** `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass after every task.

---

### Task 1: Data layer — types, mock data, and three small Zustand stores

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\types\project.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\data\mockProjects.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\projectsStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\projectsStore.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\projectDetailStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\projectDetailStore.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\projectModalStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\projectModalStore.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\lib\projectFormatters.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\lib\projectFormatters.test.tsx`

**Interfaces:**
- Produces: `Project`, `ProjectStatus`, `ProjectPriority`, `ProjectTeamMember`, `ProjectMilestone`, `NewProjectInput` types (`types/project.ts`). `MOCK_PROJECTS: Project[]` and `PROJECT_AVATAR_SRC: Record<string, string>` (`data/mockProjects.ts`). `useProjectsStore` exposing `{ projects: Project[]; addProject(input: NewProjectInput): void; removeProject(id: string): void }`. `useProjectDetailStore` exposing `{ openProjectId: string | null; open(id: string): void; close(): void }`. `useProjectModalStore` exposing `{ isOpen: boolean; open(): void; close(): void }`. `PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; icon: <lucide icon component> }>`, `priorityLabel(p: ProjectPriority): string`, `getProjDueClass(dueDays: number): 'normal' | 'soon' | 'overdue'` (`lib/projectFormatters.ts`).
- Consumes: nothing new (this is the foundation task).

- [ ] **Step 1: Write the failing tests**

```ts
// src/store/projectsStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectsStore } from './projectsStore'
import { MOCK_PROJECTS } from '../data/mockProjects'

describe('projectsStore', () => {
  beforeEach(() => {
    useProjectsStore.setState({ projects: MOCK_PROJECTS })
  })

  it('starts seeded with all 10 MOCK_PROJECTS', () => {
    expect(useProjectsStore.getState().projects).toHaveLength(10)
  })

  it('addProject prepends a new active project with 0 progress and dueDays hardcoded to 30', () => {
    useProjectsStore.getState().addProject({
      name: 'New Initiative',
      client: 'Acme',
      category: 'Development',
      priority: 'high',
      dueDate: 'Dec 25, 2024',
      color: '#4A90FF',
      desc: 'A new thing',
    })
    const projects = useProjectsStore.getState().projects
    expect(projects).toHaveLength(11)
    expect(projects[0]).toMatchObject({
      name: 'New Initiative',
      client: 'Acme',
      category: 'Development',
      status: 'active',
      priority: 'high',
      progress: 0,
      dueDays: 30,
      dueDate: 'Dec 25, 2024',
      tasksTotal: 0,
      tasksDone: 0,
      milestones: [],
    })
    expect(projects[0].team).toEqual([{ i: 'JA', c: '#4A90FF', n: 'Jacobs A.' }])
  })

  it('addProject falls back to "No client" and a placeholder description when left blank', () => {
    useProjectsStore.getState().addProject({
      name: 'Untitled', client: '', category: 'Design', priority: 'medium', dueDate: 'TBD', color: '#22C55E', desc: '',
    })
    const project = useProjectsStore.getState().projects[0]
    expect(project.client).toBe('No client')
    expect(project.desc).toBe('No description provided.')
  })

  it('removeProject removes the project with the given id and leaves the rest untouched', () => {
    useProjectsStore.getState().removeProject('p3')
    const projects = useProjectsStore.getState().projects
    expect(projects).toHaveLength(9)
    expect(projects.find((p) => p.id === 'p3')).toBeUndefined()
    expect(projects.find((p) => p.id === 'p1')).toBeDefined()
  })
})
```

```ts
// src/store/projectDetailStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectDetailStore } from './projectDetailStore'

describe('projectDetailStore', () => {
  beforeEach(() => {
    useProjectDetailStore.setState({ openProjectId: null })
  })

  it('open sets openProjectId to the given id', () => {
    useProjectDetailStore.getState().open('p5')
    expect(useProjectDetailStore.getState().openProjectId).toBe('p5')
  })

  it('close resets openProjectId to null', () => {
    useProjectDetailStore.getState().open('p5')
    useProjectDetailStore.getState().close()
    expect(useProjectDetailStore.getState().openProjectId).toBeNull()
  })
})
```

```ts
// src/store/projectModalStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectModalStore } from './projectModalStore'

describe('projectModalStore', () => {
  beforeEach(() => {
    useProjectModalStore.setState({ isOpen: false })
  })

  it('open sets isOpen to true', () => {
    useProjectModalStore.getState().open()
    expect(useProjectModalStore.getState().isOpen).toBe(true)
  })

  it('close sets isOpen to false', () => {
    useProjectModalStore.getState().open()
    useProjectModalStore.getState().close()
    expect(useProjectModalStore.getState().isOpen).toBe(false)
  })
})
```

```ts
// src/lib/projectFormatters.test.tsx
import { describe, it, expect } from 'vitest'
import { PROJECT_STATUS_CONFIG, priorityLabel, getProjDueClass } from './projectFormatters'

describe('projectFormatters', () => {
  it('has a label for every project status', () => {
    expect(PROJECT_STATUS_CONFIG.active.label).toBe('Active')
    expect(PROJECT_STATUS_CONFIG['in-progress'].label).toBe('In Progress')
    expect(PROJECT_STATUS_CONFIG.completed.label).toBe('Completed')
    expect(PROJECT_STATUS_CONFIG.overdue.label).toBe('Overdue')
    expect(PROJECT_STATUS_CONFIG['on-hold'].label).toBe('On Hold')
  })

  it('priorityLabel capitalizes the first letter', () => {
    expect(priorityLabel('high')).toBe('High')
    expect(priorityLabel('medium')).toBe('Medium')
    expect(priorityLabel('low')).toBe('Low')
  })

  it('getProjDueClass buckets by dueDays: negative is overdue, 0-7 is soon, above is normal', () => {
    expect(getProjDueClass(-1)).toBe('overdue')
    expect(getProjDueClass(0)).toBe('soon')
    expect(getProjDueClass(7)).toBe('soon')
    expect(getProjDueClass(8)).toBe('normal')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/store/projectsStore.test.tsx src/store/projectDetailStore.test.tsx src/store/projectModalStore.test.tsx src/lib/projectFormatters.test.tsx`
Expected: FAIL — none of the modules under test exist yet.

- [ ] **Step 3: Create `types/project.ts`**

```ts
// src/types/project.ts
export type ProjectStatus = 'active' | 'in-progress' | 'completed' | 'overdue' | 'on-hold'
export type ProjectPriority = 'high' | 'medium' | 'low'

export interface ProjectTeamMember {
  i: string
  c: string
  n: string
}

export interface ProjectMilestone {
  l: string
  done: boolean
  d: string
}

export interface Project {
  id: string
  name: string
  client: string
  category: string
  status: ProjectStatus
  priority: ProjectPriority
  progress: number
  color: string
  tasksTotal: number
  tasksDone: number
  dueDays: number
  dueDate: string
  desc: string
  team: ProjectTeamMember[]
  milestones: ProjectMilestone[]
}

export interface NewProjectInput {
  name: string
  client: string
  category: string
  priority: ProjectPriority
  dueDate: string
  color: string
  desc: string
}
```

- [ ] **Step 4: Create `data/mockProjects.ts`**

Transliterated verbatim from `index.html:7453-7524`.

```ts
// src/data/mockProjects.ts
import type { Project } from '../types/project'

export const PROJECT_AVATAR_SRC: Record<string, string> = {
  JA: '/avatars/Ellipse 1.png',
  AS: '/avatars/Ellipse 2.png',
  RD: '/avatars/Ellipse 3.png',
  MV: '/avatars/Ellipse 4.png',
  RC: '/avatars/Ellipse 5.png',
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1', name: 'Web 3 App for Fxtrade', client: 'Fxtrade Expert', category: 'Development',
    status: 'active', priority: 'high', progress: 45, color: '#4A90FF',
    tasksTotal: 18, tasksDone: 8, dueDays: -1, dueDate: 'Nov 20, 2024',
    desc: 'Building a comprehensive Web3 application with smart contract integration and DeFi features for the Fxtrade Expert trading platform.',
    team: [{ i: 'AS', c: '#4A90FF', n: 'Aspen H.' }, { i: 'RD', c: '#FF8C42', n: 'Roger D.' }, { i: 'MV', c: '#A855F7', n: 'Marley V.' }],
    milestones: [
      { l: 'Smart Contract Architecture', done: true, d: 'Oct 15' },
      { l: 'Frontend UI Framework', done: true, d: 'Nov 1' },
      { l: 'Wallet Integration', done: false, d: 'Nov 18' },
      { l: 'Security Audit', done: false, d: 'Nov 20' },
    ],
  },
  {
    id: 'p2', name: 'Healthydog Landing Page', client: 'DogXpert', category: 'Design',
    status: 'active', priority: 'medium', progress: 72, color: '#00D4AA',
    tasksTotal: 12, tasksDone: 9, dueDays: 3, dueDate: 'Nov 23, 2024',
    desc: 'A beautiful, conversion-optimized landing page for DogXpert premium pet nutrition products and services.',
    team: [{ i: 'RC', c: '#00D4AA', n: 'Ryan C.' }, { i: 'AS', c: '#4A90FF', n: 'Aspen H.' }],
    milestones: [
      { l: 'Wireframes & Mockups', done: true, d: 'Nov 2' },
      { l: 'Design System', done: true, d: 'Nov 8' },
      { l: 'Content & Copy', done: true, d: 'Nov 14' },
      { l: 'Development & QA', done: false, d: 'Nov 23' },
    ],
  },
  {
    id: 'p3', name: 'Redesign of Website', client: 'Artstyle Co.', category: 'Design',
    status: 'in-progress', priority: 'high', progress: 30, color: '#A855F7',
    tasksTotal: 20, tasksDone: 6, dueDays: 20, dueDate: 'Dec 10, 2024',
    desc: 'Complete overhaul of the Artstyle Co. corporate website with a focus on portfolio showcase and client acquisition flow.',
    team: [{ i: 'MV', c: '#A855F7', n: 'Marley V.' }, { i: 'AS', c: '#4A90FF', n: 'Aspen H.' }, { i: 'RD', c: '#FF8C42', n: 'Roger D.' }, { i: 'RC', c: '#00D4AA', n: 'Ryan C.' }],
    milestones: [
      { l: 'Discovery & Research', done: true, d: 'Nov 5' },
      { l: 'Information Architecture', done: false, d: 'Nov 22' },
      { l: 'Visual Design', done: false, d: 'Dec 1' },
      { l: 'Development', done: false, d: 'Dec 10' },
    ],
  },
  {
    id: 'p4', name: 'ChronoLoop Product Launch', client: 'Internal', category: 'Marketing',
    status: 'completed', priority: 'high', progress: 100, color: '#22C55E',
    tasksTotal: 24, tasksDone: 24, dueDays: 20, dueDate: 'Nov 1, 2024',
    desc: 'Full product launch campaign for ChronoLoop including marketing materials, press releases, and launch event coordination.',
    team: [{ i: 'AS', c: '#4A90FF', n: 'Aspen H.' }, { i: 'MV', c: '#A855F7', n: 'Marley V.' }],
    milestones: [
      { l: 'Marketing Strategy', done: true, d: 'Oct 5' },
      { l: 'Content Creation', done: true, d: 'Oct 20' },
      { l: 'Press Release', done: true, d: 'Oct 28' },
      { l: 'Launch Event', done: true, d: 'Nov 1' },
    ],
  },
  {
    id: 'p5', name: 'Mobile Banking App', client: 'FinTech Pro', category: 'Development',
    status: 'on-hold', priority: 'low', progress: 15, color: '#EAB308',
    tasksTotal: 30, tasksDone: 5, dueDays: 56, dueDate: 'Jan 15, 2025',
    desc: 'Native mobile banking app with biometric authentication, real-time push notifications, and AI-powered spending insights.',
    team: [{ i: 'RD', c: '#FF8C42', n: 'Roger D.' }],
    milestones: [
      { l: 'Requirements Gathering', done: true, d: 'Nov 8' },
      { l: 'UI/UX Design', done: false, d: 'Dec 10' },
      { l: 'Backend Development', done: false, d: 'Jan 5' },
      { l: 'Testing & QA', done: false, d: 'Jan 15' },
    ],
  },
  {
    id: 'p6', name: 'E-Commerce Platform Revamp', client: 'ShopMax', category: 'Development',
    status: 'active', priority: 'medium', progress: 60, color: '#06B6D4',
    tasksTotal: 22, tasksDone: 13, dueDays: 12, dueDate: 'Dec 2, 2024',
    desc: 'Modernizing the ShopMax e-commerce platform with improved performance, redesigned UX, and new payment gateway integrations.',
    team: [{ i: 'AS', c: '#4A90FF', n: 'Aspen H.' }, { i: 'RC', c: '#00D4AA', n: 'Ryan C.' }, { i: 'RD', c: '#FF8C42', n: 'Roger D.' }],
    milestones: [
      { l: 'Platform Audit', done: true, d: 'Oct 28' },
      { l: 'Architecture Design', done: true, d: 'Nov 10' },
      { l: 'Migration & Dev', done: false, d: 'Nov 28' },
      { l: 'Testing & Launch', done: false, d: 'Dec 2' },
    ],
  },
  {
    id: 'p7', name: 'Brand Identity System', client: 'Branders Inc.', category: 'Design',
    status: 'overdue', priority: 'high', progress: 25, color: '#FF4D4D',
    tasksTotal: 16, tasksDone: 4, dueDays: -10, dueDate: 'Nov 10, 2024',
    desc: 'Comprehensive brand identity redesign covering logo, typography system, color palette, and full brand guidelines.',
    team: [{ i: 'MV', c: '#A855F7', n: 'Marley V.' }, { i: 'AS', c: '#4A90FF', n: 'Aspen H.' }],
    milestones: [
      { l: 'Brand Discovery Workshop', done: true, d: 'Oct 20' },
      { l: 'Logo Concepts', done: false, d: 'Nov 5' },
      { l: 'Color & Typography', done: false, d: 'Nov 8' },
      { l: 'Brand Guidelines', done: false, d: 'Nov 10' },
    ],
  },
  {
    id: 'p8', name: 'API Integration Suite', client: 'TechCorp', category: 'Development',
    status: 'in-progress', priority: 'medium', progress: 55, color: '#EC4899',
    tasksTotal: 14, tasksDone: 8, dueDays: 8, dueDate: 'Nov 28, 2024',
    desc: "Unified API integration suite connecting 12 third-party services into TechCorp's central data platform with real-time sync.",
    team: [{ i: 'RD', c: '#FF8C42', n: 'Roger D.' }, { i: 'RC', c: '#00D4AA', n: 'Ryan C.' }],
    milestones: [
      { l: 'API Mapping & Docs', done: true, d: 'Nov 2' },
      { l: 'Core Integrations 1–6', done: true, d: 'Nov 12' },
      { l: 'Integrations 7–12', done: false, d: 'Nov 24' },
      { l: 'Testing & Docs', done: false, d: 'Nov 28' },
    ],
  },
  {
    id: 'p9', name: 'Analytics Dashboard', client: 'DataViz Ltd.', category: 'Design',
    status: 'completed', priority: 'low', progress: 100, color: '#22C55E',
    tasksTotal: 10, tasksDone: 10, dueDays: 20, dueDate: 'Oct 31, 2024',
    desc: 'Interactive analytics dashboard with real-time data visualizations, custom reporting tools, and AI-powered anomaly detection.',
    team: [{ i: 'AS', c: '#4A90FF', n: 'Aspen H.' }, { i: 'MV', c: '#A855F7', n: 'Marley V.' }],
    milestones: [
      { l: 'Data Architecture', done: true, d: 'Oct 15' },
      { l: 'Chart Components', done: true, d: 'Oct 22' },
      { l: 'Real-time Feed', done: true, d: 'Oct 28' },
      { l: 'Launch', done: true, d: 'Oct 31' },
    ],
  },
  {
    id: 'p10', name: 'Content Management System', client: 'MediaGroup', category: 'Development',
    status: 'active', priority: 'medium', progress: 40, color: '#FF8C42',
    tasksTotal: 18, tasksDone: 7, dueDays: 25, dueDate: 'Dec 15, 2024',
    desc: "Custom headless CMS for MediaGroup's network of 8 publications, supporting 50+ content editors with workflow automation.",
    team: [{ i: 'RC', c: '#00D4AA', n: 'Ryan C.' }, { i: 'RD', c: '#FF8C42', n: 'Roger D.' }, { i: 'AS', c: '#4A90FF', n: 'Aspen H.' }],
    milestones: [
      { l: 'Architecture & Stack', done: true, d: 'Nov 8' },
      { l: 'Content Modeling', done: false, d: 'Nov 22' },
      { l: 'Editor Interface', done: false, d: 'Dec 5' },
      { l: 'Publishing Pipeline', done: false, d: 'Dec 15' },
    ],
  },
]
```

- [ ] **Step 5: Create `lib/projectFormatters.ts`, `store/projectsStore.ts`, `store/projectDetailStore.ts`, `store/projectModalStore.ts`**

```ts
// src/lib/projectFormatters.ts
import { PlayCircle, Loader2, CheckCircle2, AlertCircle, PauseCircle } from 'lucide-react'
import type { ProjectPriority, ProjectStatus } from '../types/project'

export const PROJECT_STATUS_CONFIG = {
  active: { label: 'Active', icon: PlayCircle },
  'in-progress': { label: 'In Progress', icon: Loader2 },
  completed: { label: 'Completed', icon: CheckCircle2 },
  overdue: { label: 'Overdue', icon: AlertCircle },
  'on-hold': { label: 'On Hold', icon: PauseCircle },
} as const satisfies Record<ProjectStatus, { label: string; icon: unknown }>

export function priorityLabel(priority: ProjectPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

export function getProjDueClass(dueDays: number): 'normal' | 'soon' | 'overdue' {
  if (dueDays < 0) return 'overdue'
  if (dueDays <= 7) return 'soon'
  return 'normal'
}
```

If this project's installed TypeScript version predates 4.9 (`satisfies` support), drop `satisfies Record<...>` and leave the object as a plain `as const` — check `pnpm exec tsc --version` first; every other file in this codebase that builds a similar per-key lookup (e.g. `TaskRow.tsx`'s `PRIORITY_ICON`) uses plain `as const` with no exhaustiveness constraint, so falling back to that is consistent with precedent, not a regression.

```ts
// src/store/projectsStore.ts
import { create } from 'zustand'
import type { NewProjectInput, Project } from '../types/project'
import { MOCK_PROJECTS } from '../data/mockProjects'

interface ProjectsState {
  projects: Project[]
  addProject: (input: NewProjectInput) => void
  removeProject: (id: string) => void
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: MOCK_PROJECTS,
  addProject: (input) => {
    set((state) => ({
      projects: [
        {
          id: `p_new_${Date.now()}`,
          name: input.name,
          client: input.client || 'No client',
          category: input.category,
          status: 'active',
          priority: input.priority,
          progress: 0,
          color: input.color,
          tasksTotal: 0,
          tasksDone: 0,
          // Hardcoded to 30 regardless of the chosen due date — matches the
          // original's own btn-create-project handler (index.html:8498),
          // which never computes a real day-delta from proj-due-input.
          dueDays: 30,
          dueDate: input.dueDate,
          desc: input.desc || 'No description provided.',
          team: [{ i: 'JA', c: '#4A90FF', n: 'Jacobs A.' }],
          milestones: [],
        },
        ...state.projects,
      ],
    }))
  },
  removeProject: (id) => {
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }))
  },
}))
```

```ts
// src/store/projectDetailStore.ts
import { create } from 'zustand'

interface ProjectDetailState {
  openProjectId: string | null
  open: (id: string) => void
  close: () => void
}

export const useProjectDetailStore = create<ProjectDetailState>((set) => ({
  openProjectId: null,
  open: (id) => set({ openProjectId: id }),
  close: () => set({ openProjectId: null }),
}))
```

```ts
// src/store/projectModalStore.ts
import { create } from 'zustand'

interface ProjectModalState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useProjectModalStore = create<ProjectModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/store/projectsStore.test.tsx src/store/projectDetailStore.test.tsx src/store/projectModalStore.test.tsx src/lib/projectFormatters.test.tsx`
Expected: PASS.

- [ ] **Step 7: Typecheck and commit**

Run: `pnpm typecheck && pnpm lint`

```bash
git add src/types/project.ts src/data/mockProjects.ts src/store/projectsStore.ts src/store/projectsStore.test.tsx src/store/projectDetailStore.ts src/store/projectDetailStore.test.tsx src/store/projectModalStore.ts src/store/projectModalStore.test.tsx src/lib/projectFormatters.ts src/lib/projectFormatters.test.tsx
git commit -m "feat: add Projects data layer — types, mock data, and store"
```

---

### Task 2: `useAnimatedWidth` hook

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\hooks\useAnimatedWidth.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\hooks\useAnimatedWidth.test.tsx`

**Interfaces:**
- Produces: `useAnimatedWidth(target: number): number` — returns `0` on first render, then double-`requestAnimationFrame`s to `target`; replays from `0` on every later `target` change (see Global Constraints for why this differs from `useCountUp`'s mount-once behavior).
- Consumes: nothing.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/hooks/useAnimatedWidth.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimatedWidth } from './useAnimatedWidth'

describe('useAnimatedWidth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts at 0 then reaches the target after two animation frames', () => {
    const { result } = renderHook(() => useAnimatedWidth(72))
    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current).toBe(72)
  })

  it('replays from 0 on every target change, unlike a mount-once animation', () => {
    const { result, rerender } = renderHook(({ target }) => useAnimatedWidth(target), {
      initialProps: { target: 40 },
    })

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(40)

    act(() => {
      rerender({ target: 85 })
    })
    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(85)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/useAnimatedWidth.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useAnimatedWidth.ts
import { useEffect, useState } from 'react'

// Mirrors the original's own animation: reset to 0%, then double-rAF to the
// real width (index.html:7609-7614, :7683-7688, :7740). Unlike useCountUp
// (Phase 3.1), there is no "already animated" guard — the original always
// restarts this from 0% because it rebuilds the whole grid/list DOM on every
// sort/filter/search, so this hook intentionally replays on every `target`
// change, not just on mount.
export function useAnimatedWidth(target: number): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setWidth(0)
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setWidth(target))
    })
    return () => cancelAnimationFrame(frame)
  }, [target])

  return width
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/useAnimatedWidth.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAnimatedWidth.ts src/hooks/useAnimatedWidth.test.tsx
git commit -m "feat: add useAnimatedWidth hook for progress-bar fill animation"
```

---

### Task 3: `ProjectStatusBadge` + `ProjectPriorityBadge`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectStatusBadge.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectStatusBadge.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectPriorityBadge.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectPriorityBadge.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectBadges.module.css`

**Interfaces:**
- Consumes: `PROJECT_STATUS_CONFIG`, `priorityLabel` (Task 1). `ProjectStatus`/`ProjectPriority` types.
- Produces: `ProjectStatusBadge({ status: ProjectStatus })`, `ProjectPriorityBadge({ priority: ProjectPriority })`. Used by `ProjectCard`, `ProjectListRow`, `ProjectDetailPanel` (Tasks 6/7/8).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/projects/ProjectStatusBadge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectStatusBadge } from './ProjectStatusBadge'

describe('ProjectStatusBadge', () => {
  it('renders the label for a given status', () => {
    render(<ProjectStatusBadge status="in-progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders the Overdue label', () => {
    render(<ProjectStatusBadge status="overdue" />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })
})
```

```tsx
// src/components/projects/ProjectPriorityBadge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectPriorityBadge } from './ProjectPriorityBadge'

describe('ProjectPriorityBadge', () => {
  it('renders a capitalized priority label', () => {
    render(<ProjectPriorityBadge priority="high" />)
    expect(screen.getByText('High')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/projects/ProjectStatusBadge.test.tsx src/components/projects/ProjectPriorityBadge.test.tsx`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write the implementation**

```css
/* src/components/projects/ProjectBadges.module.css */
/* Ported verbatim from index.html:1109-1120 */
.statusBadge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 5px; font-size: 10px; font-weight: 600; white-space: nowrap; }
.statusBadge svg { width: 10px; height: 10px; }
.active { background: rgba(74,144,255,0.12); color: var(--accent-blue); border: 1px solid rgba(74,144,255,0.2); }
.completed { background: rgba(34,197,94,0.12); color: var(--accent-green); border: 1px solid rgba(34,197,94,0.2); }
.overdue { background: rgba(255,77,77,0.12); color: var(--accent-red); border: 1px solid rgba(255,77,77,0.2); }
.onHold { background: rgba(234,179,8,0.12); color: var(--accent-yellow); border: 1px solid rgba(234,179,8,0.2); }
.inProgress { background: rgba(168,85,247,0.12); color: var(--accent-purple); border: 1px solid rgba(168,85,247,0.2); }

.priorityBadge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 600; }
.high { background: rgba(255,77,77,0.1); color: var(--accent-red); }
.medium { background: rgba(234,179,8,0.1); color: var(--accent-yellow); }
.low { background: rgba(34,197,94,0.1); color: var(--accent-green); }
```

```tsx
// src/components/projects/ProjectStatusBadge.tsx
import { PROJECT_STATUS_CONFIG } from '../../lib/projectFormatters'
import type { ProjectStatus } from '../../types/project'
import styles from './ProjectBadges.module.css'

const STATUS_CLASS: Record<ProjectStatus, string> = {
  active: styles.active,
  'in-progress': styles.inProgress,
  completed: styles.completed,
  overdue: styles.overdue,
  'on-hold': styles.onHold,
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const { label, icon: Icon } = PROJECT_STATUS_CONFIG[status]
  return (
    <span className={[styles.statusBadge, STATUS_CLASS[status]].join(' ')}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
```

```tsx
// src/components/projects/ProjectPriorityBadge.tsx
import { priorityLabel } from '../../lib/projectFormatters'
import type { ProjectPriority } from '../../types/project'
import styles from './ProjectBadges.module.css'

const PRIORITY_CLASS: Record<ProjectPriority, string> = {
  high: styles.high,
  medium: styles.medium,
  low: styles.low,
}

interface ProjectPriorityBadgeProps {
  priority: ProjectPriority
}

export function ProjectPriorityBadge({ priority }: ProjectPriorityBadgeProps) {
  return <span className={[styles.priorityBadge, PRIORITY_CLASS[priority]].join(' ')}>{priorityLabel(priority)}</span>
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/projects/ProjectStatusBadge.test.tsx src/components/projects/ProjectPriorityBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/ProjectStatusBadge.tsx src/components/projects/ProjectStatusBadge.test.tsx src/components/projects/ProjectPriorityBadge.tsx src/components/projects/ProjectPriorityBadge.test.tsx src/components/projects/ProjectBadges.module.css
git commit -m "feat: add ProjectStatusBadge and ProjectPriorityBadge"
```

---

### Task 4: `ProjectsPageHeader` + `ProjectStatsRow`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsPageHeader.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsPageHeader.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsPageHeader.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectStatsRow.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectStatsRow.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectStatsRow.test.tsx`

**Interfaces:**
- Consumes: `useProjectsStore` (Task 1).
- Produces: `ProjectsPageHeader({ view: 'grid' | 'list'; onViewChange; onNewProject })`. `ProjectStatsRow({ activeFilter: string; onFilterChange; children? })` — same `children` slot pattern `TaskStatsRow` uses to host the toolbar (Task 5) as a row sibling instead of a separate flex row (the cross-task composition lesson from the Phase 3.2 final review).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/projects/ProjectsPageHeader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsPageHeader } from './ProjectsPageHeader'

describe('ProjectsPageHeader', () => {
  it('renders the breadcrumb and heading', () => {
    render(<ProjectsPageHeader view="grid" onViewChange={() => {}} onNewProject={() => {}} />)
    expect(screen.getByText('Overview / Projects')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('marks the active view button and calls onViewChange on click', async () => {
    const onViewChange = vi.fn()
    render(<ProjectsPageHeader view="grid" onViewChange={onViewChange} onNewProject={() => {}} />)
    expect(screen.getByRole('button', { name: /Grid/ })).toHaveAttribute('data-active', 'true')
    await userEvent.click(screen.getByRole('button', { name: /List/ }))
    expect(onViewChange).toHaveBeenCalledWith('list')
  })

  it('calls onNewProject when the New Project button is clicked', async () => {
    const onNewProject = vi.fn()
    render(<ProjectsPageHeader view="grid" onViewChange={() => {}} onNewProject={onNewProject} />)
    await userEvent.click(screen.getByRole('button', { name: /New Project/ }))
    expect(onNewProject).toHaveBeenCalled()
  })
})
```

```tsx
// src/components/projects/ProjectStatsRow.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectStatsRow } from './ProjectStatsRow'
import { useProjectsStore } from '../../store/projectsStore'
import { MOCK_PROJECTS } from '../../data/mockProjects'

describe('ProjectStatsRow', () => {
  beforeEach(() => {
    useProjectsStore.setState({ projects: MOCK_PROJECTS })
  })

  it('shows live counts for each status filter, computed from projectsStore', () => {
    render(<ProjectStatsRow activeFilter="all" onFilterChange={() => {}} />)
    // MOCK_PROJECTS: 3 active, 2 in-progress, 2 completed, 1 overdue, 1 on-hold, 10 total
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  it('calls onFilterChange with the clicked chip filter', async () => {
    const onFilterChange = vi.fn()
    render(<ProjectStatsRow activeFilter="all" onFilterChange={onFilterChange} />)
    await userEvent.click(screen.getByText('Overdue'))
    expect(onFilterChange).toHaveBeenCalledWith('overdue')
  })

  it('renders children as a row sibling of the chips', () => {
    render(
      <ProjectStatsRow activeFilter="all" onFilterChange={() => {}}>
        <div data-testid="toolbar-slot" />
      </ProjectStatsRow>,
    )
    expect(screen.getByTestId('toolbar-slot')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/projects/ProjectsPageHeader.test.tsx src/components/projects/ProjectStatsRow.test.tsx`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write the implementation**

```css
/* src/components/projects/ProjectsPageHeader.module.css — copy of TasksPageHeader.module.css (Phase 3.2); the original reuses the identical .tasks-page-header class for both pages. */
.header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
.breadcrumb { font-size: 11px; color: var(--text-muted); margin-bottom: 3px; }
.heading { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 600; color: var(--text-primary); }
.actions { display: flex; align-items: center; gap: 10px; }

.viewToggle { display: flex; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden; padding: 2px; gap: 2px; }
.viewBtn {
  display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 500;
  font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background var(--duration-fast), color var(--duration-fast);
}
.viewBtn svg { width: 13px; height: 13px; }
.viewBtn[data-active='true'] { background: var(--accent-blue); color: #fff; }
.viewBtn[data-active='false']:hover { color: var(--text-primary); background: var(--bg-card-hover); }
```

```tsx
// src/components/projects/ProjectsPageHeader.tsx
import { LayoutGrid, List, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import styles from './ProjectsPageHeader.module.css'

interface ProjectsPageHeaderProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
  onNewProject: () => void
}

export function ProjectsPageHeader({ view, onViewChange, onNewProject }: ProjectsPageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <div className={styles.breadcrumb}>Overview / Projects</div>
        <div className={styles.heading}>Projects</div>
      </div>
      <div className={styles.actions}>
        <div className={styles.viewToggle}>
          <button type="button" className={styles.viewBtn} data-active={view === 'grid'} onClick={() => onViewChange('grid')}>
            <LayoutGrid aria-hidden="true" /> Grid
          </button>
          <button type="button" className={styles.viewBtn} data-active={view === 'list'} onClick={() => onViewChange('list')}>
            <List aria-hidden="true" /> List
          </button>
        </div>
        <Button onClick={onNewProject}>
          <Plus aria-hidden="true" /> New Project
        </Button>
      </div>
    </div>
  )
}
```

```css
/* src/components/projects/ProjectStatsRow.module.css — copy of TaskStatsRow.module.css (Phase 3.2); same shared .task-stats-row class in the original. */
.row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.chip {
  display: flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 20px;
  background: var(--bg-card); border: 1px solid var(--border-subtle); cursor: pointer;
  transition: border-color var(--duration-fast), transform var(--duration-fast);
}
.chip:hover { border-color: var(--border-default); transform: translateY(-1px); }
.chip[data-active='true'] { border-color: var(--accent-blue); background: var(--accent-blue-bg); }

.dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.num { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text-primary); }
.label { font-size: 11px; color: var(--text-secondary); }
```

```tsx
// src/components/projects/ProjectStatsRow.tsx
import type { ReactNode } from 'react'
import { useProjectsStore } from '../../store/projectsStore'
import styles from './ProjectStatsRow.module.css'

// Dot colors match index.html:3382-3411 exactly, including Total and Active
// both using accent-blue.
const CHIPS = [
  { filter: 'all', label: 'Total', dot: 'var(--accent-blue)' },
  { filter: 'active', label: 'Active', dot: 'var(--accent-blue)' },
  { filter: 'in-progress', label: 'In Progress', dot: 'var(--accent-purple)' },
  { filter: 'completed', label: 'Completed', dot: 'var(--accent-green)' },
  { filter: 'overdue', label: 'Overdue', dot: 'var(--accent-red)' },
  { filter: 'on-hold', label: 'On Hold', dot: 'var(--accent-yellow)' },
] as const

interface ProjectStatsRowProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  children?: ReactNode
}

export function ProjectStatsRow({ activeFilter, onFilterChange, children }: ProjectStatsRowProps) {
  const projects = useProjectsStore((s) => s.projects)

  const countFor = (filter: string) => (filter === 'all' ? projects.length : projects.filter((p) => p.status === filter).length)

  return (
    <div className={styles.row}>
      {CHIPS.map(({ filter, label, dot }) => (
        <div
          key={filter}
          className={styles.chip}
          data-active={activeFilter === filter}
          role="button"
          tabIndex={0}
          onClick={() => onFilterChange(filter)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (e.key === ' ') e.preventDefault()
              onFilterChange(filter)
            }
          }}
        >
          <span className={styles.dot} style={{ background: dot }} />
          <span className={styles.num}>{countFor(filter)}</span>
          <span className={styles.label}>{label}</span>
        </div>
      ))}
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/projects/ProjectsPageHeader.test.tsx src/components/projects/ProjectStatsRow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/ProjectsPageHeader.tsx src/components/projects/ProjectsPageHeader.module.css src/components/projects/ProjectsPageHeader.test.tsx src/components/projects/ProjectStatsRow.tsx src/components/projects/ProjectStatsRow.module.css src/components/projects/ProjectStatsRow.test.tsx
git commit -m "feat: add ProjectsPageHeader and ProjectStatsRow"
```

---

### Task 5: `ProjectsToolbar` (Sort, Filter, Search)

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsToolbar.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsToolbar.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsToolbar.test.tsx`

**Interfaces:**
- Consumes: `Dropdown`, `Button` (existing primitives), `useToastStore`.
- Produces: `ProjectsToolbar({ activeSort: string; onSortChange; searchQuery: string; onSearchChange })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/projects/ProjectsToolbar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsToolbar } from './ProjectsToolbar'

function renderToolbar(overrides: Partial<Parameters<typeof ProjectsToolbar>[0]> = {}) {
  const props = {
    activeSort: 'name',
    onSortChange: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    ...overrides,
  }
  render(<ProjectsToolbar {...props} />)
  return props
}

describe('ProjectsToolbar', () => {
  it('calls onSortChange when a sort option is selected', async () => {
    const { onSortChange } = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: /Sort/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Due Date' }))
    expect(onSortChange).toHaveBeenCalledWith('dueDate')
  })

  it('offers a Status sort option that is present but does not need to be functional', async () => {
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: /Sort/ }))
    expect(await screen.findByRole('menuitem', { name: 'Status' })).toBeInTheDocument()
  })

  it('calls onSearchChange as the user types', async () => {
    const { onSearchChange } = renderToolbar()
    await userEvent.type(screen.getByPlaceholderText('Search projects...'), 'fx')
    expect(onSearchChange).toHaveBeenCalled()
  })

  it('Filter panel Clear/Apply do not throw and do not require onSortChange or onSearchChange', async () => {
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: /Filter/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Clear' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/projects/ProjectsToolbar.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```css
/* src/components/projects/ProjectsToolbar.module.css — copy of TasksToolbar.module.css (Phase 3.2); same shared .tasks-toolbar class in the original. */
.toolbar { margin-left: auto; display: flex; align-items: center; gap: 8px; }

.searchWrap { position: relative; max-width: 190px; }
.searchIcon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 13px; height: 13px; color: var(--text-muted); pointer-events: none; }
.searchInput {
  width: 100%; height: 34px; padding: 0 10px 0 30px;
  background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px;
  color: var(--text-primary); font-size: 12px; font-family: 'DM Sans', sans-serif;
  transition: border-color var(--duration-fast);
}
.searchInput:focus { outline: none; border-color: var(--accent-blue); }
.searchInput::placeholder { color: var(--text-muted); }

.filterPanel { min-width: 220px; padding: 0; }
.filterSectionTitle { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 12px 4px; }
.filterCheckItem { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.filterCheckItem:hover { background: var(--bg-card-hover); }
.filterCheckItem input { accent-color: var(--accent-blue); cursor: pointer; width: 13px; height: 13px; }
.filterCheckItem span { font-size: 12px; color: var(--text-secondary); }
.filterFooter { display: flex; gap: 8px; padding: 8px 8px 4px; border-top: 1px solid var(--border-subtle); margin-top: 4px; }
.filterClear { flex: 1; padding: 7px; border-radius: 7px; background: transparent; border: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 12px; cursor: pointer; font-family: 'DM Sans'; transition: background var(--duration-fast); }
.filterClear:hover { background: var(--bg-card-hover); }
.filterApply { flex: 1; padding: 7px; border-radius: 7px; background: var(--accent-blue); border: none; color: #fff; font-size: 12px; font-weight: 500; cursor: pointer; font-family: 'DM Sans'; transition: opacity var(--duration-fast); }
.filterApply:hover { opacity: 0.88; }
```

```tsx
// src/components/projects/ProjectsToolbar.tsx
import { useState } from 'react'
import { ArrowUpDown, SlidersHorizontal, Search, Type, Calendar, BarChart2, Flag, Circle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { useToastStore } from '../../store/toastStore'
import styles from './ProjectsToolbar.module.css'

const SORT_OPTIONS = [
  { key: 'name', label: 'Name (A–Z)', icon: <Type aria-hidden="true" /> },
  { key: 'dueDate', label: 'Due Date', icon: <Calendar aria-hidden="true" /> },
  { key: 'progress', label: 'Progress', icon: <BarChart2 aria-hidden="true" /> },
  { key: 'priority', label: 'Priority', icon: <Flag aria-hidden="true" /> },
  // Preserved for visual parity only — renderProjectsPage()'s sort switch
  // (index.html:7547-7552) has no 'status' case, so selecting this in the
  // shipped app silently no-ops. Do not wire real status-sort logic to it.
  { key: 'status', label: 'Status', icon: <Circle aria-hidden="true" /> },
] as const

const PRIORITY_KEYS = ['high', 'medium', 'low'] as const
const CATEGORY_KEYS = ['Development', 'Design', 'Marketing'] as const

interface ProjectsToolbarProps {
  activeSort: string
  onSortChange: (sort: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function ProjectsToolbar({ activeSort, onSortChange, searchQuery, onSearchChange }: ProjectsToolbarProps) {
  const showToast = useToastStore((s) => s.showToast)
  const [priorityChecked, setPriorityChecked] = useState<Record<string, boolean>>({ high: true, medium: true, low: true })
  const [categoryChecked, setCategoryChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORY_KEYS.map((k) => [k, true])),
  )

  return (
    <div className={styles.toolbar}>
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <Button variant="secondary">
            <ArrowUpDown aria-hidden="true" /> Sort
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          {SORT_OPTIONS.map(({ key, label, icon }) => (
            <Dropdown.Item
              key={key}
              icon={icon}
              active={activeSort === key}
              onSelect={() => { onSortChange(key); showToast(`Sorted by ${label}`, 'info', 1500) }}
            >
              {label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Root>

      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <Button variant="secondary">
            <SlidersHorizontal aria-hidden="true" /> Filter
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content className={styles.filterPanel}>
          <div className={styles.filterSectionTitle}>Priority</div>
          {PRIORITY_KEYS.map((key) => (
            <label key={key} className={styles.filterCheckItem}>
              <input
                type="checkbox"
                checked={priorityChecked[key]}
                onChange={(e) => setPriorityChecked((f) => ({ ...f, [key]: e.target.checked }))}
              />
              <span>{key[0].toUpperCase() + key.slice(1)}</span>
            </label>
          ))}
          <Dropdown.Divider />
          <div className={styles.filterSectionTitle}>Category</div>
          {CATEGORY_KEYS.map((key) => (
            <label key={key} className={styles.filterCheckItem}>
              <input
                type="checkbox"
                checked={categoryChecked[key]}
                onChange={(e) => setCategoryChecked((f) => ({ ...f, [key]: e.target.checked }))}
              />
              <span>{key}</span>
            </label>
          ))}
          <div className={styles.filterFooter}>
            <button
              type="button"
              className={styles.filterClear}
              onClick={() => {
                setPriorityChecked({ high: false, medium: false, low: false })
                setCategoryChecked(Object.fromEntries(CATEGORY_KEYS.map((k) => [k, false])))
                showToast('Filters cleared', 'info', 1500)
              }}
            >
              Clear
            </button>
            <button type="button" className={styles.filterApply} onClick={() => showToast('Filters applied', 'success', 1500)}>
              Apply
            </button>
          </div>
        </Dropdown.Content>
      </Dropdown.Root>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} aria-hidden="true" />
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
```

Note: the `Clear`/`Apply` buttons in the test are queried via `role: 'menuitem'` because they sit inside `Dropdown.Content` (a Radix `DropdownMenu.Content`), which gives all descendant interactive elements menu-item semantics by default — this matches how `TasksToolbar.test.tsx` already queries its own filter footer buttons (verify against that file if the role doesn't match; adjust the query, not the component, since the component's DOM shape is intentionally identical to `TasksToolbar`'s).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/projects/ProjectsToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/ProjectsToolbar.tsx src/components/projects/ProjectsToolbar.module.css src/components/projects/ProjectsToolbar.test.tsx
git commit -m "feat: add ProjectsToolbar with Sort, Filter, and Search"
```

---

### Task 6: `ProjectCard` + `ProjectsGridView`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectCard.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectCard.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectCard.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsGridView.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsGridView.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsGridView.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `Dropdown`, `Button` (primitives), `ProjectStatusBadge`, `ProjectPriorityBadge` (Task 3), `useAnimatedWidth` (Task 2), `getProjDueClass` (Task 1), `PROJECT_AVATAR_SRC` (Task 1), `useToastStore`, `useProjectModalStore` (Task 1).
- Produces: `ProjectCard({ project: Project; index: number; onOpenDetail: (id: string) => void; onDelete: (id: string, name: string) => void })`. `ProjectsGridView({ projects: Project[]; onOpenDetail; onDelete })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/projects/ProjectCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from './ProjectCard'
import { MOCK_PROJECTS } from '../../data/mockProjects'

describe('ProjectCard', () => {
  it('renders name, client, category, badges, and progress', () => {
    render(<ProjectCard project={MOCK_PROJECTS[0]} index={0} onOpenDetail={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Web 3 App for Fxtrade')).toBeInTheDocument()
    expect(screen.getByText('Fxtrade Expert')).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('8/18 tasks')).toBeInTheDocument()
  })

  it('calls onOpenDetail when the card is clicked', async () => {
    const onOpenDetail = vi.fn()
    render(<ProjectCard project={MOCK_PROJECTS[0]} index={0} onOpenDetail={onOpenDetail} onDelete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Web 3 App for Fxtrade' }))
    expect(onOpenDetail).toHaveBeenCalledWith('p1')
  })

  it('does not open the detail panel when the three-dot menu is clicked', async () => {
    const onOpenDetail = vi.fn()
    render(<ProjectCard project={MOCK_PROJECTS[0]} index={0} onOpenDetail={onOpenDetail} onDelete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'More options' }))
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('calls onDelete with id and name from the context menu', async () => {
    const onDelete = vi.fn()
    render(<ProjectCard project={MOCK_PROJECTS[0]} index={0} onOpenDetail={() => {}} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'More options' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }))
    expect(onDelete).toHaveBeenCalledWith('p1', 'Web 3 App for Fxtrade')
  })

  it('shows an overflow "+N" tile when the team has more than 3 members', () => {
    render(<ProjectCard project={MOCK_PROJECTS[2]} index={0} onOpenDetail={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})
```

```tsx
// src/components/projects/ProjectsGridView.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectsGridView } from './ProjectsGridView'
import { MOCK_PROJECTS } from '../../data/mockProjects'

describe('ProjectsGridView', () => {
  it('renders one card per project', () => {
    render(<ProjectsGridView projects={MOCK_PROJECTS} onOpenDetail={() => {}} onDelete={() => {}} />)
    expect(screen.getAllByRole('button', { name: /./, hidden: false }).filter((el) => el.getAttribute('aria-label'))).toHaveLength(10)
  })

  it('shows an empty state with a New Project button when there are no projects', () => {
    render(<ProjectsGridView projects={[]} onOpenDetail={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('No projects found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New Project/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/projects/ProjectCard.test.tsx src/components/projects/ProjectsGridView.test.tsx`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write the implementation**

```css
/* src/components/projects/ProjectCard.module.css — ported from index.html:1072-1138 */
.card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: transform var(--duration-normal), box-shadow var(--duration-normal), border-color var(--duration-normal); opacity: 0; animation: fadeUp 400ms var(--ease-out) forwards; }
.card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px hsla(230,80%,50%,0.15); border-color: var(--border-default); }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.accent { height: 3px; width: 100%; flex-shrink: 0; }
.body { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.name { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.35; flex: 1; }
.menuBtn { width: 26px; height: 26px; border-radius: 6px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity var(--duration-fast), background var(--duration-fast), color var(--duration-fast); flex-shrink: 0; margin-top: -2px; }
.card:hover .menuBtn { opacity: 1; }
.menuBtn:hover { background: var(--border-default); color: var(--text-primary); }
.menuBtn svg { width: 14px; height: 14px; }

.clientRow { display: flex; align-items: center; gap: 6px; }
.client { font-size: 11px; color: var(--text-secondary); }
.categoryTag { font-size: 10px; color: var(--text-muted); background: var(--bg-input); padding: 2px 7px; border-radius: 4px; }

.badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.progressSection { display: flex; flex-direction: column; gap: 6px; }
.progressLabel { display: flex; align-items: center; justify-content: space-between; }
.progressTasks { font-size: 11px; color: var(--text-secondary); }
.progressPct { font-size: 12px; font-weight: 700; color: var(--text-primary); font-family: 'DM Mono', monospace; }
.progressTrack { height: 5px; background: var(--border-subtle); border-radius: 3px; overflow: hidden; }
.progressFill { height: 100%; border-radius: 3px; transition: width 700ms var(--ease-out); }

.footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.due { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); }
.due svg { width: 11px; height: 11px; }
.overdue { color: var(--accent-red); }
.soon { color: var(--accent-yellow); }

.avatars { display: flex; align-items: center; }
.avatar { border: 1.5px solid var(--bg-card); }
.avatars > *:not(:first-child) { margin-left: -6px; }
.avatarMore { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border-default); background: var(--bg-input); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; flex-shrink: 0; margin-left: -6px; }
```

```tsx
// src/components/projects/ProjectCard.tsx
import { MoreHorizontal, Calendar, Eye, Edit2, Archive, Trash2 } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Dropdown } from '../ui/Dropdown'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ProjectPriorityBadge } from './ProjectPriorityBadge'
import { useAnimatedWidth } from '../../hooks/useAnimatedWidth'
import { getProjDueClass } from '../../lib/projectFormatters'
import { PROJECT_AVATAR_SRC } from '../../data/mockProjects'
import { useToastStore } from '../../store/toastStore'
import type { Project } from '../../types/project'
import styles from './ProjectCard.module.css'

interface ProjectCardProps {
  project: Project
  index: number
  onOpenDetail: (id: string) => void
  onDelete: (id: string, name: string) => void
}

export function ProjectCard({ project, index, onOpenDetail, onDelete }: ProjectCardProps) {
  const showToast = useToastStore((s) => s.showToast)
  const fillWidth = useAnimatedWidth(project.progress)
  const dueClass = getProjDueClass(project.dueDays)
  const visibleTeam = project.team.slice(0, 3)
  const overflowCount = project.team.length - 3

  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${60 + index * 60}ms` }}
      role="button"
      tabIndex={0}
      aria-label={project.name}
      onClick={() => onOpenDetail(project.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail(project.id)
        }
      }}
    >
      <div className={styles.accent} style={{ background: project.color }} />
      <div className={styles.body}>
        <div className={styles.top}>
          <div className={styles.name}>{project.name}</div>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className={styles.menuBtn}
                aria-label="More options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal aria-hidden="true" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <Dropdown.Item icon={<Eye aria-hidden="true" />} onSelect={() => onOpenDetail(project.id)}>
                View Details
              </Dropdown.Item>
              <Dropdown.Item icon={<Edit2 aria-hidden="true" />} onSelect={() => showToast('Edit project coming soon', 'info')}>
                Edit Project
              </Dropdown.Item>
              <Dropdown.Item icon={<Archive aria-hidden="true" />} onSelect={() => showToast('Project archived', 'success', 2000)}>
                Archive
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item icon={<Trash2 aria-hidden="true" />} danger onSelect={() => onDelete(project.id, project.name)}>
                Delete
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </div>

        <div className={styles.clientRow}>
          <span className={styles.client}>{project.client}</span>
          <span className={styles.categoryTag}>{project.category}</span>
        </div>

        <div className={styles.badges}>
          <ProjectStatusBadge status={project.status} />
          <ProjectPriorityBadge priority={project.priority} />
        </div>

        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>
            <span className={styles.progressTasks}>{project.tasksDone}/{project.tasksTotal} tasks</span>
            <span className={styles.progressPct}>{project.progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ background: project.color, width: `${fillWidth}%` }} />
          </div>
        </div>

        <div className={styles.footer}>
          <div className={[styles.due, dueClass !== 'normal' ? styles[dueClass] : ''].filter(Boolean).join(' ')}>
            <Calendar aria-hidden="true" />
            {project.dueDays < 0 ? 'Overdue · ' : 'Due · '}{project.dueDate}
          </div>
          <div className={styles.avatars}>
            {visibleTeam.map((member) => (
              <Avatar
                key={member.i}
                src={PROJECT_AVATAR_SRC[member.i]}
                name={member.n || member.i}
                className={styles.avatar}
                style={{ width: 24, height: 24 }}
                fallbackStyle={{ background: member.c, fontSize: 9 }}
              />
            ))}
            {overflowCount > 0 && <div className={styles.avatarMore}>+{overflowCount}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
```

```css
/* src/components/projects/ProjectsGridView.module.css — ported from index.html:1066-1070, :1164-1167, :1214-1216 */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; grid-column: 1 / -1; }
.empty svg { opacity: 0.3; }
.emptyTitle { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 600; color: var(--text-secondary); }
.emptySub { font-size: 13px; text-align: center; }

@media (max-width: 1280px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .grid { grid-template-columns: 1fr; } }
```

```tsx
// src/components/projects/ProjectsGridView.tsx
import { FolderOpen, Plus } from 'lucide-react'
import { ProjectCard } from './ProjectCard'
import { Button } from '../ui/Button'
import { useProjectModalStore } from '../../store/projectModalStore'
import type { Project } from '../../types/project'
import styles from './ProjectsGridView.module.css'

interface ProjectsGridViewProps {
  projects: Project[]
  onOpenDetail: (id: string) => void
  onDelete: (id: string, name: string) => void
}

export function ProjectsGridView({ projects, onOpenDetail, onDelete }: ProjectsGridViewProps) {
  const openNewProject = useProjectModalStore((s) => s.open)

  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <FolderOpen aria-hidden="true" width={44} height={44} />
        <div className={styles.emptyTitle}>No projects found</div>
        <div className={styles.emptySub}>Try adjusting your filter or search</div>
        <Button onClick={openNewProject} style={{ marginTop: 8 }}>
          <Plus aria-hidden="true" /> New Project
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} onOpenDetail={onOpenDetail} onDelete={onDelete} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/projects/ProjectCard.test.tsx src/components/projects/ProjectsGridView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/ProjectCard.tsx src/components/projects/ProjectCard.module.css src/components/projects/ProjectCard.test.tsx src/components/projects/ProjectsGridView.tsx src/components/projects/ProjectsGridView.module.css src/components/projects/ProjectsGridView.test.tsx
git commit -m "feat: add ProjectCard and ProjectsGridView"
```

---

### Task 7: `ProjectListRow` + `ProjectsListView`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectListRow.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectListRow.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectListRow.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsListView.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsListView.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectsListView.test.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 6 (`Avatar`, `ProjectStatusBadge`, `ProjectPriorityBadge`, `useAnimatedWidth`, `getProjDueClass`, `PROJECT_AVATAR_SRC`), minus the context dropdown (list rows have none — see Global Constraints).
- Produces: `ProjectListRow({ project: Project; onOpenDetail: (id: string) => void })`. `ProjectsListView({ projects: Project[]; onOpenDetail })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/projects/ProjectListRow.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectListRow } from './ProjectListRow'
import { MOCK_PROJECTS } from '../../data/mockProjects'

describe('ProjectListRow', () => {
  it('renders name, category, client, status, priority, progress, and due date', () => {
    render(<ProjectListRow project={MOCK_PROJECTS[0]} onOpenDetail={() => {}} />)
    expect(screen.getByText('Web 3 App for Fxtrade')).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('Fxtrade Expert')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('Nov 20, 2024')).toBeInTheDocument()
  })

  it('calls onOpenDetail on click', async () => {
    const onOpenDetail = vi.fn()
    render(<ProjectListRow project={MOCK_PROJECTS[0]} onOpenDetail={onOpenDetail} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onOpenDetail).toHaveBeenCalledWith('p1')
  })

  it('renders no three-dot menu, unlike ProjectCard', () => {
    render(<ProjectListRow project={MOCK_PROJECTS[0]} onOpenDetail={() => {}} />)
    expect(screen.queryByRole('button', { name: 'More options' })).not.toBeInTheDocument()
  })
})
```

```tsx
// src/components/projects/ProjectsListView.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectsListView } from './ProjectsListView'
import { MOCK_PROJECTS } from '../../data/mockProjects'

describe('ProjectsListView', () => {
  it('renders a head row with column labels', () => {
    render(<ProjectsListView projects={MOCK_PROJECTS} onOpenDetail={() => {}} />)
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('renders one row per project', () => {
    render(<ProjectsListView projects={MOCK_PROJECTS} onOpenDetail={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(10)
  })

  it('shows an empty state with no projects', () => {
    render(<ProjectsListView projects={[]} onOpenDetail={() => {}} />)
    expect(screen.getByText('No projects found')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/projects/ProjectListRow.test.tsx src/components/projects/ProjectsListView.test.tsx`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write the implementation**

```css
/* src/components/projects/ProjectListRow.module.css — ported from index.html:1146-1161 */
.row { display: grid; grid-template-columns: 2fr 1fr 1.1fr 0.9fr 1.6fr 1.2fr 1fr; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background var(--duration-fast); }
.row:last-child { border-bottom: none; }
.row:hover { background: var(--bg-card-hover); }

.nameCell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.name { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
.clientCell { font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.progCell { display: flex; align-items: center; gap: 8px; }
.pct { font-size: 11px; font-weight: 700; color: var(--text-primary); font-family: 'DM Mono', monospace; min-width: 30px; }
.track { flex: 1; height: 5px; background: var(--border-subtle); border-radius: 3px; overflow: hidden; }
.fill { height: 100%; border-radius: 3px; transition: width 700ms var(--ease-out); }

.dueCell { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); }
.dueCell svg { width: 11px; height: 11px; }
.overdue { color: var(--accent-red); }
.soon { color: var(--accent-yellow); }

.avatars { display: flex; align-items: center; }
.avatar { border: 1.5px solid var(--bg-card); }
.avatars > *:not(:first-child) { margin-left: -6px; }
.avatarMore { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border-default); background: var(--bg-input); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; flex-shrink: 0; margin-left: -6px; }
```

```tsx
// src/components/projects/ProjectListRow.tsx
import { Calendar } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ProjectPriorityBadge } from './ProjectPriorityBadge'
import { useAnimatedWidth } from '../../hooks/useAnimatedWidth'
import { getProjDueClass } from '../../lib/projectFormatters'
import { PROJECT_AVATAR_SRC } from '../../data/mockProjects'
import type { Project } from '../../types/project'
import styles from './ProjectListRow.module.css'

interface ProjectListRowProps {
  project: Project
  onOpenDetail: (id: string) => void
}

export function ProjectListRow({ project, onOpenDetail }: ProjectListRowProps) {
  const fillWidth = useAnimatedWidth(project.progress)
  const dueClass = getProjDueClass(project.dueDays)
  const visibleTeam = project.team.slice(0, 3)
  const overflowCount = project.team.length - 3

  return (
    <div
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(project.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpenDetail(project.id) }}
    >
      <div className={styles.nameCell}>
        <div className={styles.dot} style={{ background: project.color }} />
        <div>
          <div className={styles.name}>{project.name}</div>
          <div className={styles.cat}>{project.category}</div>
        </div>
      </div>
      <div className={styles.clientCell}>{project.client}</div>
      <div><ProjectStatusBadge status={project.status} /></div>
      <div><ProjectPriorityBadge priority={project.priority} /></div>
      <div className={styles.progCell}>
        <span className={styles.pct}>{project.progress}%</span>
        <div className={styles.track}><div className={styles.fill} style={{ background: project.color, width: `${fillWidth}%` }} /></div>
      </div>
      <div className={[styles.dueCell, dueClass !== 'normal' ? styles[dueClass] : ''].filter(Boolean).join(' ')}>
        <Calendar aria-hidden="true" />{project.dueDate}
      </div>
      <div className={styles.avatars}>
        {visibleTeam.map((member) => (
          <Avatar
            key={member.i}
            src={PROJECT_AVATAR_SRC[member.i]}
            name={member.n || member.i}
            className={styles.avatar}
            style={{ width: 24, height: 24 }}
            fallbackStyle={{ background: member.c, fontSize: 9 }}
          />
        ))}
        {overflowCount > 0 && <div className={styles.avatarMore}>+{overflowCount}</div>}
      </div>
    </div>
  )
}
```

```css
/* src/components/projects/ProjectsListView.module.css — ported from index.html:1141-1145, :1164-1167 */
.list { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden; }
.head { display: grid; grid-template-columns: 2fr 1fr 1.1fr 0.9fr 1.6fr 1.2fr 1fr; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border-subtle); }
.col { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; user-select: none; display: flex; align-items: center; gap: 4px; }
.col svg { width: 10px; height: 10px; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; }
.emptyTitle { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 600; color: var(--text-secondary); }
.emptySub { font-size: 13px; text-align: center; }
```

```tsx
// src/components/projects/ProjectsListView.tsx
import { ChevronsUpDown } from 'lucide-react'
import { ProjectListRow } from './ProjectListRow'
import type { Project } from '../../types/project'
import styles from './ProjectsListView.module.css'

interface ProjectsListViewProps {
  projects: Project[]
  onOpenDetail: (id: string) => void
}

export function ProjectsListView({ projects, onOpenDetail }: ProjectsListViewProps) {
  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>No projects found</div>
        <div className={styles.emptySub}>Try adjusting your filter</div>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      <div className={styles.head}>
        <div className={styles.col}>Project <ChevronsUpDown aria-hidden="true" /></div>
        <div className={styles.col}>Client</div>
        <div className={styles.col}>Status</div>
        <div className={styles.col}>Priority</div>
        <div className={styles.col}>Progress</div>
        <div className={styles.col}>Due Date</div>
        <div className={styles.col}>Team</div>
      </div>
      {projects.map((project) => (
        <ProjectListRow key={project.id} project={project} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/projects/ProjectListRow.test.tsx src/components/projects/ProjectsListView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/ProjectListRow.tsx src/components/projects/ProjectListRow.module.css src/components/projects/ProjectListRow.test.tsx src/components/projects/ProjectsListView.tsx src/components/projects/ProjectsListView.module.css src/components/projects/ProjectsListView.test.tsx
git commit -m "feat: add ProjectListRow and ProjectsListView"
```

---

### Task 8: `ProjectDetailPanel`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectDetailPanel.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectDetailPanel.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\ProjectDetailPanel.test.tsx`

**Interfaces:**
- Consumes: `useProjectDetailStore`, `useProjectsStore` (Task 1), `Avatar`, `ProjectStatusBadge` (Task 3), `useAnimatedWidth` (Task 2), `priorityLabel` (Task 1), `PROJECT_AVATAR_SRC` (Task 1), `useToastStore`.
- Produces: `ProjectDetailPanel({ onDelete: (id: string, name: string) => void })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/projects/ProjectDetailPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectDetailPanel } from './ProjectDetailPanel'
import { useProjectDetailStore } from '../../store/projectDetailStore'
import { useProjectsStore } from '../../store/projectsStore'
import { MOCK_PROJECTS } from '../../data/mockProjects'

describe('ProjectDetailPanel', () => {
  beforeEach(() => {
    useProjectDetailStore.setState({ openProjectId: null })
    useProjectsStore.setState({ projects: MOCK_PROJECTS })
  })

  it('renders nothing identifiable when closed', () => {
    render(<ProjectDetailPanel onDelete={() => {}} />)
    expect(screen.getByTestId('project-detail-overlay')).toHaveAttribute('data-open', 'false')
  })

  it('renders the project name, description, meta grid, team, and milestones when open', () => {
    useProjectDetailStore.setState({ openProjectId: 'p1' })
    render(<ProjectDetailPanel onDelete={() => {}} />)
    expect(screen.getByText('Web 3 App for Fxtrade')).toBeInTheDocument()
    expect(screen.getByText(/Building a comprehensive Web3 application/)).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('Aspen H.')).toBeInTheDocument()
    expect(screen.getByText('Security Audit')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    useProjectDetailStore.setState({ openProjectId: 'p1' })
    render(<ProjectDetailPanel onDelete={() => {}} />)
    await userEvent.keyboard('{Escape}')
    expect(useProjectDetailStore.getState().openProjectId).toBeNull()
  })

  it('closes on overlay click', async () => {
    useProjectDetailStore.setState({ openProjectId: 'p1' })
    render(<ProjectDetailPanel onDelete={() => {}} />)
    await userEvent.click(screen.getByTestId('project-detail-overlay'))
    expect(useProjectDetailStore.getState().openProjectId).toBeNull()
  })

  it('calls onDelete with id and name, and closes the panel', async () => {
    const onDelete = vi.fn()
    useProjectDetailStore.setState({ openProjectId: 'p1' })
    render(<ProjectDetailPanel onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete project' }))
    expect(onDelete).toHaveBeenCalledWith('p1', 'Web 3 App for Fxtrade')
    expect(useProjectDetailStore.getState().openProjectId).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/projects/ProjectDetailPanel.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```css
/* src/components/projects/ProjectDetailPanel.module.css — ported from index.html:1176-1212 */
.overlay { position: fixed; inset: 0; z-index: 250; background: rgba(0,0,0,0.5); opacity: 0; pointer-events: none; transition: opacity var(--duration-normal); backdrop-filter: blur(2px); }
.overlay[data-open='true'] { opacity: 1; pointer-events: all; }
.panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 260; width: 480px; max-width: 95vw; background: var(--bg-card); border-left: 1px solid var(--border-default); display: flex; flex-direction: column; transform: translateX(100%); transition: transform var(--duration-normal) var(--ease-out); box-shadow: -8px 0 40px rgba(0,0,0,0.4); }
.panel[data-open='true'] { transform: translateX(0); }
.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; gap: 12px; }
.headerLeft { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.accentDot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.headerBtn { width: 30px; height: 30px; border-radius: 8px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--duration-fast), color var(--duration-fast); flex-shrink: 0; }
.headerBtn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.headerBtn svg { width: 16px; height: 16px; }
.deleteBtn { color: var(--accent-red); }

.body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
.body::-webkit-scrollbar { width: 4px; }
.body::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }
.section { display: flex; flex-direction: column; gap: 10px; }
.sectionLabel { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.titleText { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
.clientText { font-size: 13px; color: var(--accent-blue); }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.7; }

.metaGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.metaCell { background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 12px; }
.metaLabel { font-size: 9px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 5px; }
.metaValue { font-size: 13px; color: var(--text-primary); font-weight: 500; }

.bigProgress { display: flex; flex-direction: column; gap: 8px; }
.bigProgressMeta { display: flex; justify-content: space-between; }
.tasksText { font-size: 12px; color: var(--text-secondary); }
.pct { font-size: 14px; font-weight: 700; font-family: 'DM Mono', monospace; color: var(--text-primary); }
.bigProgressBar { height: 8px; background: var(--border-subtle); border-radius: 4px; overflow: hidden; }
.bigProgressFill { height: 100%; border-radius: 4px; transition: width 800ms var(--ease-out); }

.teamGrid { display: flex; gap: 12px; flex-wrap: wrap; }
.teamMember { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.teamName { font-size: 10px; color: var(--text-secondary); text-align: center; }

.milestones { display: flex; flex-direction: column; gap: 8px; }
.milestoneItem { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; }
.milestoneCheck { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--border-default); }
.milestoneCheck.done { background: var(--accent-green); border-color: var(--accent-green); }
.milestoneCheck.done::after { content: '✓'; font-size: 9px; color: #fff; font-weight: 700; }
.milestoneText { font-size: 12px; color: var(--text-primary); flex: 1; }
.milestoneText.done { text-decoration: line-through; color: var(--text-muted); }
.milestoneDate { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
```

```tsx
// src/components/projects/ProjectDetailPanel.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Edit2, Trash2, X } from 'lucide-react'
import { useProjectDetailStore } from '../../store/projectDetailStore'
import { useProjectsStore } from '../../store/projectsStore'
import { useToastStore } from '../../store/toastStore'
import { Avatar } from '../ui/Avatar'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { useAnimatedWidth } from '../../hooks/useAnimatedWidth'
import { PROJECT_AVATAR_SRC } from '../../data/mockProjects'
import { priorityLabel } from '../../lib/projectFormatters'
import styles from './ProjectDetailPanel.module.css'

interface ProjectDetailPanelProps {
  onDelete: (id: string, name: string) => void
}

export function ProjectDetailPanel({ onDelete }: ProjectDetailPanelProps) {
  const openProjectId = useProjectDetailStore((s) => s.openProjectId)
  const close = useProjectDetailStore((s) => s.close)
  const projects = useProjectsStore((s) => s.projects)
  const showToast = useToastStore((s) => s.showToast)

  const [lastProjectId, setLastProjectId] = useState<string | null>(null)
  const [prevOpenProjectId, setPrevOpenProjectId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    if (document.activeElement instanceof HTMLElement && panelRef.current?.contains(document.activeElement)) {
      document.activeElement.blur()
    }
    close()
  }, [close])

  // Adjusting state during render (React docs), same pattern as
  // TaskDetailPanel (Phase 3.3): keeps the last-open project id available so
  // the panel can render its content while sliding out.
  if (openProjectId !== prevOpenProjectId) {
    setPrevOpenProjectId(openProjectId)
    if (openProjectId !== null) setLastProjectId(openProjectId)
  }

  const isOpen = openProjectId !== null

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleClose])

  // `inert` isn't in this project's @types/react HTMLAttributes yet, so it's
  // set as a real DOM property via the ref rather than as a JSX prop — same
  // workaround as TaskDetailPanel (Phase 3.3).
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.inert = !isOpen
    }
  }, [isOpen])

  const displayProjectId = openProjectId ?? lastProjectId
  const project = projects.find((p) => p.id === displayProjectId) ?? null

  const fillWidth = useAnimatedWidth(project?.progress ?? 0)

  if (!project) {
    return (
      <>
        <div className={styles.overlay} data-open={false} data-testid="project-detail-overlay" />
        <div className={styles.panel} data-open={false} />
      </>
    )
  }

  const handleDelete = () => {
    const id = project.id
    const name = project.name
    close()
    onDelete(id, name)
  }

  return (
    <>
      <div className={styles.overlay} data-open={isOpen} data-testid="project-detail-overlay" onClick={handleClose} />
      <div ref={panelRef} className={styles.panel} data-open={isOpen}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.accentDot} style={{ background: project.color }} />
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.headerBtn}
              title="Edit project"
              aria-label="Edit project"
              onClick={() => showToast('Edit project coming soon', 'info', 2000)}
            >
              <Edit2 aria-hidden="true" />
            </button>
            <button type="button" className={[styles.headerBtn, styles.deleteBtn].join(' ')} title="Delete project" aria-label="Delete project" onClick={handleDelete}>
              <Trash2 aria-hidden="true" />
            </button>
            <button type="button" className={styles.headerBtn} title="Close" aria-label="Close" onClick={handleClose}>
              <X aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.titleText}>{project.name}</div>
            <div className={styles.clientText}>{project.client}</div>
            <div className={styles.desc}>{project.desc}</div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Progress</div>
            <div className={styles.bigProgress}>
              <div className={styles.bigProgressMeta}>
                <span className={styles.tasksText}>{project.tasksDone} of {project.tasksTotal} tasks completed</span>
                <span className={styles.pct}>{project.progress}%</span>
              </div>
              <div className={styles.bigProgressBar}>
                <div className={styles.bigProgressFill} style={{ background: project.color, width: `${fillWidth}%` }} />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Details</div>
            <div className={styles.metaGrid}>
              <div className={styles.metaCell}>
                <div className={styles.metaLabel}>Priority</div>
                <div className={styles.metaValue}>{priorityLabel(project.priority)}</div>
              </div>
              <div className={styles.metaCell}>
                <div className={styles.metaLabel}>Category</div>
                <div className={styles.metaValue}>{project.category}</div>
              </div>
              <div className={styles.metaCell}>
                <div className={styles.metaLabel}>Due Date</div>
                <div className={styles.metaValue}>{project.dueDate}</div>
              </div>
              <div className={styles.metaCell}>
                <div className={styles.metaLabel}>Tasks</div>
                <div className={styles.metaValue}>{project.tasksDone} / {project.tasksTotal}</div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Team</div>
            <div className={styles.teamGrid}>
              {project.team.map((member) => (
                <div key={member.i} className={styles.teamMember}>
                  <Avatar
                    src={PROJECT_AVATAR_SRC[member.i]}
                    name={member.n || member.i}
                    style={{ width: 40, height: 40 }}
                    fallbackStyle={{ background: member.c, fontSize: 12 }}
                  />
                  <div className={styles.teamName}>{member.n || member.i}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Milestones</div>
            <div className={styles.milestones}>
              {/* Milestones have no stable id in the source data (index.html's
                  {l,done,d} shape) and this list is never reordered or
                  appended to within a project's lifetime here, so an index
                  key is safe. */}
              {project.milestones.map((milestone, index) => (
                <div key={index} className={styles.milestoneItem}>
                  <div className={[styles.milestoneCheck, milestone.done ? styles.done : ''].filter(Boolean).join(' ')} />
                  <span className={[styles.milestoneText, milestone.done ? styles.done : ''].filter(Boolean).join(' ')}>{milestone.l}</span>
                  <span className={styles.milestoneDate}>{milestone.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/projects/ProjectDetailPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/ProjectDetailPanel.tsx src/components/projects/ProjectDetailPanel.module.css src/components/projects/ProjectDetailPanel.test.tsx
git commit -m "feat: add ProjectDetailPanel"
```

---

### Task 9: `NewProjectModal`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\modals\NewProjectModal.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\modals\formStyles.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\projects\modals\NewProjectModal.test.tsx`

**Interfaces:**
- Consumes: `Modal`, `Button` (primitives), `useProjectModalStore`, `useProjectsStore.addProject` (Task 1), `useToastStore`.
- Produces: `NewProjectModal()` — no props, reads open state from `projectModalStore`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/projects/modals/NewProjectModal.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewProjectModal } from './NewProjectModal'
import { useProjectModalStore } from '../../../store/projectModalStore'
import { useProjectsStore } from '../../../store/projectsStore'
import { MOCK_PROJECTS } from '../../../data/mockProjects'

describe('NewProjectModal', () => {
  beforeEach(() => {
    useProjectModalStore.setState({ isOpen: false })
    useProjectsStore.setState({ projects: MOCK_PROJECTS })
  })

  it('renders nothing visible when closed', () => {
    render(<NewProjectModal />)
    expect(screen.queryByText('New Project')).not.toBeInTheDocument()
  })

  it('creates a project with the entered name and defaults, then closes and resets the form', async () => {
    useProjectModalStore.setState({ isOpen: true })
    render(<NewProjectModal />)

    await userEvent.type(screen.getByLabelText(/Project Name/), 'Launch Retro Site')
    await userEvent.click(screen.getByRole('button', { name: /Create Project/ }))

    expect(useProjectModalStore.getState().isOpen).toBe(false)
    const created = useProjectsStore.getState().projects[0]
    expect(created.name).toBe('Launch Retro Site')
    expect(created.priority).toBe('medium')
    expect(created.color).toBe('#4A90FF')
    expect(created.dueDays).toBe(30)
  })

  it('shows an error toast and does not create a project when the name is blank', async () => {
    useProjectModalStore.setState({ isOpen: true })
    render(<NewProjectModal />)
    const before = useProjectsStore.getState().projects.length
    await userEvent.click(screen.getByRole('button', { name: /Create Project/ }))
    expect(useProjectsStore.getState().projects.length).toBe(before)
  })

  it('lets the user pick a priority pill and an accent color before submitting', async () => {
    useProjectModalStore.setState({ isOpen: true })
    render(<NewProjectModal />)

    await userEvent.type(screen.getByLabelText(/Project Name/), 'Color Test')
    await userEvent.click(screen.getByRole('button', { name: 'High' }))
    await userEvent.click(screen.getByRole('button', { name: 'Purple' }))
    await userEvent.click(screen.getByRole('button', { name: /Create Project/ }))

    const created = useProjectsStore.getState().projects[0]
    expect(created.priority).toBe('high')
    expect(created.color).toBe('#A855F7')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/projects/modals/NewProjectModal.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```css
/* src/components/projects/modals/formStyles.module.css — same rules as tasks/modals/formStyles.module.css (Phase 3.2's own copy of index.html:840-847's shared .priority-pill/.form-* rules), plus color-swatch rules ported from index.html:1170-1173 */
.formGroup { display: flex; flex-direction: column; gap: 6px; }
.formLabel { font-size: 11px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }

.formInput, .formSelect, .formTextarea {
  background: var(--bg-input); border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 9px 12px; color: var(--text-primary);
  font-size: 13px; font-family: 'DM Sans', sans-serif;
  transition: border-color var(--duration-fast);
}
.formInput:focus, .formSelect:focus, .formTextarea:focus { outline: none; border-color: var(--accent-blue); }
.formInput::placeholder, .formTextarea::placeholder { color: var(--text-muted); }
.formTextarea { resize: vertical; min-height: 72px; }
.formSelect { appearance: none; cursor: pointer; }
.formRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.priorityGroup { display: flex; gap: 6px; flex-wrap: wrap; }
.priorityPill {
  padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border-subtle);
  background: transparent; color: var(--text-secondary); font-size: 11px; font-weight: 500;
  font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all var(--duration-fast);
}
.priorityPill.high:hover, .priorityPill.high[data-selected='true'] { background: rgba(255, 77, 77, 0.12); color: var(--accent-red); border-color: var(--accent-red); }
.priorityPill.medium:hover, .priorityPill.medium[data-selected='true'] { background: rgba(234, 179, 8, 0.12); color: var(--accent-yellow); border-color: var(--accent-yellow); }
.priorityPill.low:hover, .priorityPill.low[data-selected='true'] { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); border-color: var(--accent-green); }

.colorSwatchRow { display: flex; gap: 8px; flex-wrap: wrap; }
.colorSwatch { width: 28px; height: 28px; border-radius: 6px; cursor: pointer; border: 2px solid transparent; padding: 0; transition: transform var(--duration-fast), border-color var(--duration-fast); }
.colorSwatch:hover { transform: scale(1.15); }
.colorSwatch[data-selected='true'] { border-color: var(--text-primary); box-shadow: 0 0 0 2px var(--bg-card); transform: scale(1.1); }
```

```tsx
// src/components/projects/modals/NewProjectModal.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Briefcase } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useProjectModalStore } from '../../../store/projectModalStore'
import { useProjectsStore } from '../../../store/projectsStore'
import { useToastStore } from '../../../store/toastStore'
import type { ProjectPriority } from '../../../types/project'
import formStyles from './formStyles.module.css'

const CATEGORIES = ['Development', 'Design', 'Marketing', 'Research', 'Operations']
const ASSIGNEES = ['Aspen Herwitz', 'Roger Dokidis', 'Marley Vaccaro', 'Ryan Culhane']
const COLORS = [
  { hex: '#4A90FF', title: 'Blue' },
  { hex: '#22C55E', title: 'Green' },
  { hex: '#A855F7', title: 'Purple' },
  { hex: '#FF8C42', title: 'Orange' },
  { hex: '#00D4AA', title: 'Teal' },
  { hex: '#EC4899', title: 'Pink' },
  { hex: '#EAB308', title: 'Yellow' },
  { hex: '#FF4D4D', title: 'Red' },
  { hex: '#06B6D4', title: 'Cyan' },
]

interface FormState {
  name: string
  client: string
  category: string
  priority: ProjectPriority
  dueRaw: string
  assignee: string
  color: string
  desc: string
}

const EMPTY_FORM: FormState = {
  name: '', client: '', category: CATEGORIES[0], priority: 'medium',
  dueRaw: '', assignee: ASSIGNEES[0], color: COLORS[0].hex, desc: '',
}

function formatDueDate(dueRaw: string): string {
  return dueRaw
    ? new Date(`${dueRaw}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD'
}

export function NewProjectModal() {
  const isOpen = useProjectModalStore((s) => s.isOpen)
  const closeModal = useProjectModalStore((s) => s.close)

  // Same synchronous-reset-on-close-intent pattern as AddTaskModal (Phase
  // 3.2) — see that file for why a plain useEffect+setState reset isn't used.
  const [session, setSession] = useState(0)
  const handleClose = () => {
    setSession((s) => s + 1)
    closeModal()
  }

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="New Project"
      subtitle="Set up a new project for your team"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="form-newproject">
            <Briefcase aria-hidden="true" /> Create Project
          </Button>
        </>
      }
    >
      <NewProjectFormFields key={session} onDone={handleClose} />
    </Modal>
  )
}

interface NewProjectFormFieldsProps {
  onDone: () => void
}

function NewProjectFormFields({ onDone }: NewProjectFormFieldsProps) {
  const addProject = useProjectsStore((s) => s.addProject)
  const showToast = useToastStore((s) => s.showToast)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      showToast('Project name is required', 'error', 2000)
      return
    }
    // form.assignee ("Lead Assignee") is intentionally unused below — the
    // original's own btn-create-project handler (index.html:8485-8501) never
    // reads proj-assignee-sel either; every new project gets the same
    // hardcoded team:[{i:'JA', ...}] regardless of the selected assignee.
    addProject({
      name,
      client: form.client.trim(),
      category: form.category,
      priority: form.priority,
      dueDate: formatDueDate(form.dueRaw),
      color: form.color,
      desc: form.desc.trim(),
    })
    showToast(`Project "${name}" created!`, 'success', 3000)
    onDone()
  }

  return (
    <form id="form-newproject" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className={formStyles.formGroup}>
        <label className={formStyles.formLabel} htmlFor="proj-name-input">Project Name *</label>
        <input
          id="proj-name-input"
          className={formStyles.formInput}
          type="text"
          placeholder="e.g. Mobile App Redesign"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className={formStyles.formRow}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="proj-client-input">Client</label>
          <input
            id="proj-client-input"
            className={formStyles.formInput}
            type="text"
            placeholder="Client name"
            value={form.client}
            onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
          />
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="proj-cat-sel">Category</label>
          <select id="proj-cat-sel" className={formStyles.formSelect} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className={formStyles.formGroup}>
        <span className={formStyles.formLabel}>Priority</span>
        <div className={formStyles.priorityGroup}>
          {(['high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={[formStyles.priorityPill, formStyles[p]].join(' ')}
              data-selected={form.priority === p}
              onClick={() => setForm((f) => ({ ...f, priority: p }))}
            >
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={formStyles.formRow}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="proj-due-input">Due Date</label>
          <input id="proj-due-input" className={formStyles.formInput} type="date" value={form.dueRaw} onChange={(e) => setForm((f) => ({ ...f, dueRaw: e.target.value }))} />
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="proj-assignee-sel">Lead Assignee</label>
          <select id="proj-assignee-sel" className={formStyles.formSelect} value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}>
            {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className={formStyles.formGroup}>
        <span className={formStyles.formLabel}>Accent Color</span>
        <div className={formStyles.colorSwatchRow}>
          {COLORS.map(({ hex, title }) => (
            <button
              key={hex}
              type="button"
              className={formStyles.colorSwatch}
              data-selected={form.color === hex}
              style={{ background: hex }}
              title={title}
              aria-label={title}
              onClick={() => setForm((f) => ({ ...f, color: hex }))}
            />
          ))}
        </div>
      </div>

      <div className={formStyles.formGroup}>
        <label className={formStyles.formLabel} htmlFor="proj-desc-input">Description</label>
        <textarea
          id="proj-desc-input"
          className={formStyles.formTextarea}
          placeholder="What is this project about?"
          value={form.desc}
          onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
        />
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/projects/modals/NewProjectModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/modals/NewProjectModal.tsx src/components/projects/modals/formStyles.module.css src/components/projects/modals/NewProjectModal.test.tsx
git commit -m "feat: add NewProjectModal"
```

---

### Task 10: Assemble `ProjectsPage`; fix `TeamStatusPanel`'s Select Project dropdown; update the backlog

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\ProjectsPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\ProjectsPage.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\ProjectsPage.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\TeamStatusPanel.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\TeamStatusPanel.test.tsx`
- Modify: `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`

**Interfaces:**
- Consumes: every component/store from Tasks 1–9.
- Produces: a fully working `/projects` route.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pages/ProjectsPage.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsPage } from './ProjectsPage'
import { useProjectsStore } from '../store/projectsStore'
import { useProjectDetailStore } from '../store/projectDetailStore'
import { useProjectModalStore } from '../store/projectModalStore'
import { MOCK_PROJECTS } from '../data/mockProjects'

describe('ProjectsPage', () => {
  beforeEach(() => {
    useProjectsStore.setState({ projects: MOCK_PROJECTS })
    useProjectDetailStore.setState({ openProjectId: null })
    useProjectModalStore.setState({ isOpen: false })
  })

  it('renders the header and all 10 projects in grid view by default', () => {
    render(<ProjectsPage />)
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Web 3 App for Fxtrade')).toBeInTheDocument()
    expect(screen.getByText('Content Management System')).toBeInTheDocument()
  })

  it('switches to list view and back', async () => {
    render(<ProjectsPage />)
    await userEvent.click(screen.getByRole('button', { name: /List/ }))
    expect(screen.getByText('Client')).toBeInTheDocument() // list head column, absent in grid view
    await userEvent.click(screen.getByRole('button', { name: /Grid/ }))
    expect(screen.queryByText('Client')).not.toBeInTheDocument()
  })

  it('filters by stat chip', async () => {
    render(<ProjectsPage />)
    await userEvent.click(screen.getByText('Overdue'))
    expect(screen.getByText('Brand Identity System')).toBeInTheDocument()
    expect(screen.queryByText('Web 3 App for Fxtrade')).not.toBeInTheDocument()
  })

  it('filters by search query across name, client, and category', async () => {
    render(<ProjectsPage />)
    await userEvent.type(screen.getByPlaceholderText('Search projects...'), 'shopmax')
    expect(screen.getByText('E-Commerce Platform Revamp')).toBeInTheDocument()
    expect(screen.queryByText('Web 3 App for Fxtrade')).not.toBeInTheDocument()
  })

  it('opens the detail panel from a card and deletes the project from it', async () => {
    render(<ProjectsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Web 3 App for Fxtrade' }))
    expect(useProjectDetailStore.getState().openProjectId).toBe('p1')

    await userEvent.click(screen.getByRole('button', { name: 'Delete project' }))
    expect(useProjectsStore.getState().projects.find((p) => p.id === 'p1')).toBeUndefined()
  })

  it('opens the New Project modal from the header and creates a project that appears in the grid', async () => {
    render(<ProjectsPage />)
    await userEvent.click(screen.getByRole('button', { name: /New Project/ }))
    await userEvent.type(screen.getByLabelText(/Project Name/), 'Fresh Launch')
    await userEvent.click(screen.getByRole('button', { name: /Create Project/ }))
    expect(screen.getByText('Fresh Launch')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/pages/ProjectsPage.test.tsx`
Expected: FAIL — `ProjectsPage` is still the `<h1>Projects</h1>` stub.

- [ ] **Step 3: Assemble `ProjectsPage`**

```css
/* src/pages/ProjectsPage.module.css */
.page { display: flex; flex-direction: column; gap: 12px; }
```

```tsx
// src/pages/ProjectsPage.tsx
import { useState } from 'react'
import { ProjectsPageHeader } from '../components/projects/ProjectsPageHeader'
import { ProjectStatsRow } from '../components/projects/ProjectStatsRow'
import { ProjectsToolbar } from '../components/projects/ProjectsToolbar'
import { ProjectsGridView } from '../components/projects/ProjectsGridView'
import { ProjectsListView } from '../components/projects/ProjectsListView'
import { ProjectDetailPanel } from '../components/projects/ProjectDetailPanel'
import { NewProjectModal } from '../components/projects/modals/NewProjectModal'
import { useProjectsStore } from '../store/projectsStore'
import { useProjectDetailStore } from '../store/projectDetailStore'
import { useProjectModalStore } from '../store/projectModalStore'
import { useToastStore } from '../store/toastStore'
import styles from './ProjectsPage.module.css'

export function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects)
  const removeProject = useProjectsStore((s) => s.removeProject)
  const openDetail = useProjectDetailStore((s) => s.open)
  const openNewProject = useProjectModalStore((s) => s.open)
  const showToast = useToastStore((s) => s.showToast)

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeSort, setActiveSort] = useState('name')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects = projects
    .filter((p) => activeFilter === 'all' || p.status === activeFilter)
    .filter((p) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (activeSort === 'name') return a.name.localeCompare(b.name)
      if (activeSort === 'progress') return b.progress - a.progress
      if (activeSort === 'dueDate') return a.dueDays - b.dueDays
      if (activeSort === 'priority') {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.priority] - order[b.priority]
      }
      // 'status' falls through here, matching the original's dead sort case
      // (index.html:7547-7552) — see Global Constraints.
      return 0
    })

  const handleDelete = (id: string, name: string) => {
    removeProject(id)
    showToast(`"${name}" deleted`, 'success', 3000)
  }

  return (
    <div className={styles.page}>
      <ProjectsPageHeader view={view} onViewChange={setView} onNewProject={openNewProject} />
      <ProjectStatsRow activeFilter={activeFilter} onFilterChange={setActiveFilter}>
        <ProjectsToolbar
          activeSort={activeSort}
          onSortChange={setActiveSort}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </ProjectStatsRow>
      {view === 'grid' ? (
        <ProjectsGridView projects={filteredProjects} onOpenDetail={openDetail} onDelete={handleDelete} />
      ) : (
        <ProjectsListView projects={filteredProjects} onOpenDetail={openDetail} />
      )}
      <NewProjectModal />
      <ProjectDetailPanel onDelete={handleDelete} />
    </div>
  )
}
```

- [ ] **Step 4: Fix `TeamStatusPanel`'s Select Project dropdown**

In `src/components/dashboard/TeamStatusPanel.tsx`, remove the `DASHBOARD_CRITICAL_PROJECTS` import and its use in the Select Project dropdown, replacing it with a local literal list matching `index.html:5473-5480` exactly:

```tsx
// Replace this import:
// import { DASHBOARD_CRITICAL_PROJECTS } from '../../data/mockDashboardProjects'
// with nothing (no longer needed by this file) and add, near the top-level
// ROLES constant:

// Matches index.html:5473-5480 exactly — static markup in the original, not
// derived from any array. Deliberately its own local literal rather than a
// projectsStore-backed list: see this plan's Global Constraints for why
// DASHBOARD_CRITICAL_PROJECTS and the new Projects-page data model are both
// the wrong source for this dropdown.
const PROJECT_OPTIONS = ['Web 3 App for Fxtrade', 'Healthydog Landing Page', 'Redesign of Website', 'ChronoLoop Launch']
```

Replace the dropdown body:

```tsx
// Before:
//   {DASHBOARD_CRITICAL_PROJECTS.map((p) => (
//     <Dropdown.Item key={p.id} icon={<Briefcase aria-hidden="true" />} active={project === p.title} onSelect={() => selectProject(p.title)}>
//       {p.title}
//     </Dropdown.Item>
//   ))}
//   <Dropdown.Item icon={<Briefcase aria-hidden="true" />} active={project === 'ChronoLoop Launch'} onSelect={() => selectProject('ChronoLoop Launch')}>
//     ChronoLoop Launch
//   </Dropdown.Item>
//
// After:
{PROJECT_OPTIONS.map((title) => (
  <Dropdown.Item key={title} icon={<Briefcase aria-hidden="true" />} active={project === title} onSelect={() => selectProject(title)}>
    {title}
  </Dropdown.Item>
))}
```

Add a new test to `src/components/dashboard/TeamStatusPanel.test.tsx` (append inside the existing `describe` block, don't remove existing tests) asserting the casing fix:

```tsx
it('capitalizes "App" in the Web 3 project option, matching index.html:5476 exactly', async () => {
  render(<TeamStatusPanel />)
  await userEvent.click(screen.getByRole('button', { name: 'Select Project' }))
  expect(await screen.findByRole('menuitem', { name: 'Web 3 App for Fxtrade' })).toBeInTheDocument()
  expect(screen.queryByRole('menuitem', { name: 'Web 3 app for Fxtrade' })).not.toBeInTheDocument()
})
```

- [ ] **Step 5: Run all tests to verify everything passes**

Run: `pnpm vitest run src/pages/ProjectsPage.test.tsx src/components/dashboard/TeamStatusPanel.test.tsx`
Expected: PASS. Then run the full suite: `pnpm test` — expected: PASS, no regressions in existing Dashboard/Tasks tests.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 6: Update the backlog**

Append a new `## From Phase 3.4 (Projects page)` section to `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`, and close out the two Phase 3.1/3.2 items this phase resolves. Mark the existing "Select Project dropdown option casing/sourcing is inconsistent" bullet (Phase 3.1 section) as done — prefix its checkbox `[x]` and append a short resolution note — and add:

```markdown
## From Phase 3.4 (Projects page)

- [x] **"Select Project dropdown option casing/sourcing is inconsistent" (Phase 3.1 backlog item) — resolved.** `TeamStatusPanel` now sources its Select Project dropdown from a local `PROJECT_OPTIONS` literal (`'Web 3 App for Fxtrade'`, capitalized, matching `index.html:5476`) instead of mapping over `DASHBOARD_CRITICAL_PROJECTS` plus a bolted-on 4th item. `DASHBOARD_CRITICAL_PROJECTS` itself is untouched — it's a genuinely separate, smaller, dashboard-only hardcoded list in the original, not something this phase unified away.
- [ ] **Projects stat-chip counts are computed live, a deliberate deviation from the original's static HTML.** Unlike Tasks' `updateChips()` (confirmed genuinely live in the Phase 3.2 backlog), no function in `index.html` ever recomputes `#proj-stat-chips`' counts — they're static literals (`10/4/2/2/1/1`) that never update as `PROJECTS` changes. `ProjectStatsRow` computes them live from `projectsStore` instead, because leaving them static would desync immediately after using this same phase's own New Project/Delete actions. Flagged here in case a strict-parity visual diff calls it out.
- [ ] **Projects Sort dropdown's "Status" option is a preserved no-op**, matching `renderProjectsPage()`'s sort switch (`index.html:7547-7552`), which has no `'status'` case. Selecting it changes the active dropdown item but doesn't change list order, in both the original and this port.
- [ ] **New Project modal's "Lead Assignee" select is decorative** — its value is never read by `addProject`, matching the original's own `btn-create-project` handler (`index.html:8485-8516`), which never reads `proj-assignee-sel` either. Every new project gets the same hardcoded `team:[{i:'JA', c:'#4A90FF', n:'Jacobs A.'}]` regardless of the selected assignee.
- [ ] **New Project's `dueDays` is always hardcoded to `30`**, regardless of the chosen due date, matching `index.html:8498` exactly — not recomputed from the picked date.
- [ ] **Projects list-view column headers look interactive (cursor:pointer, hover color, a chevrons-up-down icon) but have no click handler**, matching the original — no click-to-sort wired to any column.
- [ ] **Phase 3.4 was never interactively verified in a real browser during implementation** — same standing caveat as Phases 3.1/3.2/3.3 (no browser available in the execution environment). Recommended: one manual `pnpm dev` pass through both Projects views, the detail panel, and the New Project modal before/alongside starting Phase 3.5 (Sprints).
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/ProjectsPage.tsx src/pages/ProjectsPage.module.css src/pages/ProjectsPage.test.tsx src/components/dashboard/TeamStatusPanel.tsx src/components/dashboard/TeamStatusPanel.test.tsx
git commit -m "feat: assemble Projects page; fix TeamStatusPanel's Select Project dropdown casing/sourcing"
```

```bash
cd "C:\Users\HP\Downloads\Chronoloop dashboard"
git add docs/superpowers/backlog.md
git commit -m "docs: close out Phase 3.1 Select Project backlog item, flag Phase 3.4 parity notes"
```

---

## After this plan

Phase 3.5 is next in the design doc's page order: **Sprints** (`renderSprintsPage`, `SPRINTS` mock data, Sprint Detail panel, New/Edit Sprint modals — `index.html:7868` onward). Before starting it: do the manual `pnpm dev` walkthrough flagged in Task 10's backlog update (Phases 3.1–3.4 have never been interactively browser-verified), and re-read `index.html`'s Sprints section fresh rather than assuming structural similarity to Projects — Sprints has a burndown chart and a distinct board/list toggle that Projects doesn't.
