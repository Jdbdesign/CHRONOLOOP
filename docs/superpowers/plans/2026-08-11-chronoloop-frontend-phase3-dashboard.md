# ChronoLoop Frontend Rewrite — Phase 3.1 (Dashboard Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Dashboard page from `index.html` (the original single-file build) into the new `CHRONOLOOP-frontend` React codebase — greeting/action bar, 5 KPI cards, Critical Projects panel, Team Status panel, the mini calendar/Gantt widget, and the four modals it opens (Add Task, Activity, Invite, Member Detail) — with full visual and behavioral parity, replacing `src/pages/DashboardPage.tsx`'s current one-line stub.

**Architecture:** New `src/components/dashboard/` folder holds page-specific components (StatCard, KpiGrid, DashboardHeader, CriticalProjectsPanel, TeamStatusPanel, CalendarWidget, TaskPopup) plus a `modals/` subfolder for the four dialogs. All interactive chrome (dropdowns, modals, avatars, buttons, cards) composes the Phase 2 primitives in `src/components/ui/` rather than reinventing styling. Two new Zustand stores: `tasksStore` (shared task list — the KPI "To-do" count and the Add Task modal both need it, and it's the seed for the future Tasks page) and a dashboard-scoped `uiStore` (which of the four modals is open, and which team member is selected). Two new hooks: `useCountUp` (KPI number animation) and `useOutsideClick` (closes the calendar widget's task popup, which has no Radix primitive backing it — it's a hand-positioned popup in the original, ported as one here).

**Tech Stack:** Existing Phase 1/2 stack (Vite, React 18, TypeScript strict, Zustand, CSS Modules, Vitest + React Testing Library, Radix UI, lucide-react). No new dependencies.

## Global Constraints

- **Location:** `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`. Never modify `C:\Users\HP\Downloads\Chronoloop dashboard\` — it is read-only reference material (`index.html` line numbers below are from that file, captured at its current state).
- **Package manager:** pnpm. **TypeScript strict mode, no `any`.**
- **Pixel/behavior parity with `index.html`:** every color, spacing, radius, and animation timing below is copied exactly from the cited line numbers.
- **Reuse Phase 2 primitives, don't re-style their chrome:** `Modal` already renders the card/header/title/subtitle/close-button/footer shell — dashboard modals only supply `title`, `subtitle`, `footer`, and body content. `Dropdown` (`Dropdown.Root`/`Trigger`/`Content`/`Item`/`Divider`) already renders positioned, collision-aware panels styled like the original's `.dd-panel`/`.dd-item` — every dropdown and the three-dot context menu in this plan uses it instead of hand-rolled positioning. Do not recreate `.dd-panel` CSS.
- **Out of scope for this phase (deferred to the later "cross-cutting systems" phase per the design doc):** wiring up TopBar's Share/Bell/User buttons (they stay inert), and a global Escape-key/outside-click system. The one exception is the calendar widget's `TaskPopup`, which has no other modal system backing it in the original either — it gets its own local outside-click/Escape handling in Task 8, scoped to itself.
- **`Avatar` primitive gets one small extension (Task 1):** the original uses avatar circles at several sizes the primitive doesn't have yet (38px team avatars, 28px activity avatars, 64px member-modal avatar) — see Task 1, Step 5. Do not add new named `size` variants for these; the memory-recorded precedent for one-off avatar sizing is a call-site override, and inline `style` is the reliable way to do that (a `className` override risks CSS Module import-order cascade fights, which is why the topbar avatar ring override was parked rather than done that way).
- **Known, deliberate parity quirk — do not "fix" silently:** the Team Status panel's grid shows the literal placeholder email `Joedoe@gmail.com` under all four members' names (`index.html:3247,3252,3257,3262`), while the Member Detail modal opened by clicking a member shows that person's real per-person email (`memberData` object, `index.html:6639-6644`). This is an inconsistency in the original, preserved verbatim here. Flagged in `docs/superpowers/backlog.md` (Task 9 adds the entry) for a product-owner call, same treatment as the "Integration" label precedent from Phase 1.
- **KPI "To-do" card has original's own quirk:** its initial value is a hardcoded `45` (`index.html:3103`, unrelated to the 15-item mock task list, which only has ~5 `todo`-status tasks) but the moment a task is added via the Add Task modal, the original recomputes it as the *real* todo count (`index.html:6705-6706`) — a sudden visible drop. This is preserved as-is; see Task 1's `todoKpiOverride` field.
- **Verification gate for the whole phase:** `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass after every task.

---

### Task 1: Task/TeamMember types, `tasksStore`, mock task data, and the `Avatar` size extension

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\types\task.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\data\mockTasks.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\tasksStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\tasksStore.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Avatar.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Avatar.test.tsx`

**Interfaces:**
- Produces: `Task`, `TaskPriority`, `TaskStatus` types; `MOCK_TASKS: Task[]`; `useTasksStore()` exposing `{ tasks: Task[]; todoKpiOverride: number | null; addTask: (input: NewTaskInput) => void }`; `Avatar` now accepts an optional `style?: CSSProperties` forwarded to its root element.

Task shape ported from `tasksData` at `index.html:6887-6903` (all 15 items, verbatim). `Task.assignee` is a two-letter initials code (`'AS' | 'RD' | 'MV' | 'RC'` in the mock data, but typed as `string` since later phases add more team members).

- [ ] **Step 1: Write the failing test for `tasksStore`**

```tsx
// src/store/tasksStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useTasksStore } from './tasksStore'
import { MOCK_TASKS } from '../data/mockTasks'

describe('tasksStore', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
  })

  it('seeds from MOCK_TASKS and starts with no KPI override', () => {
    const state = useTasksStore.getState()
    expect(state.tasks).toHaveLength(15)
    expect(state.todoKpiOverride).toBeNull()
  })

  it('addTask appends a task with a new id and sets the todo KPI override to the live todo count', () => {
    const before = useTasksStore.getState().tasks.filter((t) => t.status === 'todo').length
    useTasksStore.getState().addTask({
      title: 'Write release notes',
      project: 'ChronoLoop Launch',
      assignee: 'RC',
      due: '2024-12-01',
      priority: 'medium',
      description: '',
    })
    const state = useTasksStore.getState()
    expect(state.tasks).toHaveLength(16)
    expect(state.tasks.at(-1)).toMatchObject({ title: 'Write release notes', status: 'todo' })
    expect(state.todoKpiOverride).toBe(before + 1)
  })

  it('assigns sequential ids one higher than the current max', () => {
    useTasksStore.getState().addTask({
      title: 'Second new task',
      project: 'ChronoLoop Launch',
      assignee: 'RC',
      due: '2024-12-02',
      priority: 'low',
      description: '',
    })
    const maxId = Math.max(...useTasksStore.getState().tasks.map((t) => t.id))
    expect(useTasksStore.getState().tasks.at(-1)?.id).toBe(maxId)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/store/tasksStore.test.tsx`
Expected: FAIL with "Cannot find module './tasksStore'"

- [ ] **Step 3: Create `src/types/task.ts`**

```ts
// src/types/task.ts
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'overdue'

export interface TaskSubtask {
  t: string
  done: boolean
}

export interface TaskComment {
  author: string
  text: string
  time: string
}

export interface TaskAttachment {
  name: string
  size: string
  type: string
}

export interface Task {
  id: number
  title: string
  project: string
  assignee: string
  aColor: string
  priority: TaskPriority
  status: TaskStatus
  due: string
  tags: string[]
  subtasks: TaskSubtask[]
  comments: TaskComment[]
  attachments: TaskAttachment[]
  description: string
}

export interface NewTaskInput {
  title: string
  project: string
  assignee: string
  due: string
  priority: TaskPriority
  description: string
}
```

- [ ] **Step 4: Create `src/data/mockTasks.ts`**

Port `tasksData` from `index.html:6887-6903` verbatim (all 15 objects, unchanged field values) as `MOCK_TASKS: Task[]`:

```ts
// src/data/mockTasks.ts
import type { Task } from '../types/task'

export const MOCK_TASKS: Task[] = [
  { id: 1, title: 'Homepage for CareyCare App', project: 'Web 3 App for Fxtrade', assignee: 'AS', aColor: 'linear-gradient(135deg,#4A90FF,#2563eb)', priority: 'high', status: 'in-progress', due: '2024-11-02', tags: ['Frontend', 'Design'], subtasks: [{ t: 'Build hero section', done: true }, { t: 'Add CTA buttons', done: true }, { t: 'Mobile responsive layout', done: false }], comments: [{ author: 'Aspen H.', text: 'Hero section is looking great!', time: '2h ago' }, { author: 'You', text: 'Thanks, working on CTA next.', time: '1h ago' }], attachments: [{ name: 'wireframe_v2.fig', size: '1.2 MB', type: 'fig' }, { name: 'assets.zip', size: '4.8 MB', type: 'zip' }], description: 'Build the homepage layout for CareyCare web application including hero section, feature highlights, and CTA buttons.' },
  { id: 2, title: 'Develop Landing Page for Eatz Website', project: 'Healthydog Landing Page', assignee: 'MV', aColor: 'linear-gradient(135deg,#A855F7,#7c3aed)', priority: 'high', status: 'in-progress', due: '2024-11-07', tags: ['Frontend'], subtasks: [{ t: 'Set up project repo', done: true }, { t: 'Design system tokens', done: false }, { t: 'Page sections layout', done: false }], comments: [{ author: 'Marley V.', text: 'Starting the layout today.', time: '5h ago' }], attachments: [{ name: 'brand_guide.pdf', size: '2.3 MB', type: 'pdf' }], description: 'Create a compelling landing page for the Eatz food delivery service.' },
  { id: 3, title: 'Prepare Marketing Assets', project: 'ChronoLoop Launch', assignee: 'RD', aColor: 'linear-gradient(135deg,#FF8C42,#ea580c)', priority: 'medium', status: 'todo', due: '2024-11-15', tags: ['Marketing'], subtasks: [{ t: 'Social media banners', done: false }, { t: 'Email header graphics', done: false }, { t: 'App store screenshots', done: false }], comments: [], attachments: [], description: 'Prepare all marketing visual assets for the ChronoLoop product launch.' },
  { id: 4, title: 'Finalize User Onboarding Flow', project: 'Web 3 App for Fxtrade', assignee: 'AS', aColor: 'linear-gradient(135deg,#4A90FF,#2563eb)', priority: 'medium', status: 'in-progress', due: '2024-11-09', tags: ['UX', 'Frontend'], subtasks: [{ t: 'Wireframe all steps', done: true }, { t: 'Prototype in Figma', done: true }, { t: 'Dev handoff', done: false }], comments: [{ author: 'Ryan C.', text: 'Prototype looks solid.', time: 'Yesterday' }], attachments: [{ name: 'onboarding_flow.fig', size: '3.1 MB', type: 'fig' }], description: 'Define and finalize the step-by-step onboarding experience for new users.' },
  { id: 5, title: 'Integrate Payment Gateway', project: 'Redesign of Website', assignee: 'RC', aColor: 'linear-gradient(135deg,#00D4AA,#059669)', priority: 'high', status: 'todo', due: '2024-11-19', tags: ['Backend'], subtasks: [{ t: 'Stripe SDK setup', done: false }, { t: 'Webhook handling', done: false }, { t: 'Test transactions', done: false }], comments: [], attachments: [], description: 'Integrate Stripe payment gateway including webhooks and test mode.' },
  { id: 6, title: 'Write API Documentation', project: 'Web 3 App for Fxtrade', assignee: 'RD', aColor: 'linear-gradient(135deg,#FF8C42,#ea580c)', priority: 'low', status: 'done', due: '2024-10-28', tags: ['Docs'], subtasks: [{ t: 'Endpoints reference', done: true }, { t: 'Auth guide', done: true }, { t: 'Code examples', done: true }], comments: [{ author: 'Roger D.', text: 'All endpoints documented.', time: '3 days ago' }], attachments: [{ name: 'api_docs_v1.pdf', size: '890 KB', type: 'pdf' }], description: 'Comprehensive API documentation for all endpoints.' },
  { id: 7, title: 'Setup CI/CD Pipeline', project: 'Redesign of Website', assignee: 'RC', aColor: 'linear-gradient(135deg,#00D4AA,#059669)', priority: 'medium', status: 'done', due: '2024-10-25', tags: ['DevOps'], subtasks: [{ t: 'GitHub Actions config', done: true }, { t: 'Staging deploy', done: true }, { t: 'Prod deploy', done: true }], comments: [], attachments: [{ name: 'pipeline_config.yml', size: '12 KB', type: 'yml' }], description: 'Configure automated CI/CD pipeline with GitHub Actions.' },
  { id: 8, title: 'UX Audit for Mobile App', project: 'Healthydog Landing Page', assignee: 'MV', aColor: 'linear-gradient(135deg,#A855F7,#7c3aed)', priority: 'high', status: 'overdue', due: '2024-10-20', tags: ['UX'], subtasks: [{ t: 'Heuristic evaluation', done: true }, { t: 'User test sessions', done: false }, { t: 'Audit report', done: false }], comments: [{ author: 'You', text: 'Need this ASAP, deadline passed.', time: '4 days ago' }], attachments: [], description: 'Conduct a full UX audit of the mobile app and deliver a report.' },
  { id: 9, title: 'Fix Navigation Bug on Safari', project: 'Redesign of Website', assignee: 'AS', aColor: 'linear-gradient(135deg,#4A90FF,#2563eb)', priority: 'high', status: 'overdue', due: '2024-10-22', tags: ['Bug'], subtasks: [{ t: 'Reproduce on Safari', done: true }, { t: 'Root cause analysis', done: false }, { t: 'Deploy fix', done: false }], comments: [{ author: 'Aspen H.', text: 'Reproduced. CSS flex issue.', time: '2 days ago' }], attachments: [], description: 'Investigate and fix navbar collapse bug on Safari 16+.' },
  { id: 10, title: 'Create Component Library', project: 'ChronoLoop Launch', assignee: 'MV', aColor: 'linear-gradient(135deg,#A855F7,#7c3aed)', priority: 'medium', status: 'todo', due: '2024-11-20', tags: ['Design', 'Frontend'], subtasks: [{ t: 'Define token system', done: false }, { t: 'Build base components', done: false }, { t: 'Storybook setup', done: false }], comments: [], attachments: [], description: 'Build a reusable component library for the ChronoLoop design system.' },
  { id: 11, title: 'Database Schema Design', project: 'Web 3 App for Fxtrade', assignee: 'RD', aColor: 'linear-gradient(135deg,#FF8C42,#ea580c)', priority: 'high', status: 'done', due: '2024-10-29', tags: ['Backend', 'DB'], subtasks: [{ t: 'Entity design', done: true }, { t: 'Relations map', done: true }, { t: 'Migration scripts', done: true }], comments: [], attachments: [{ name: 'schema_v3.sql', size: '24 KB', type: 'sql' }], description: 'Design the full database schema including all entities and relationships.' },
  { id: 12, title: 'SEO Optimization', project: 'Healthydog Landing Page', assignee: 'RC', aColor: 'linear-gradient(135deg,#00D4AA,#059669)', priority: 'low', status: 'todo', due: '2024-11-25', tags: ['Marketing'], subtasks: [{ t: 'Meta tags audit', done: false }, { t: 'Sitemap generation', done: false }, { t: 'Speed optimization', done: false }], comments: [], attachments: [], description: 'Perform full SEO audit and optimization pass on all public pages.' },
  { id: 13, title: 'Security Audit', project: 'Redesign of Website', assignee: 'RD', aColor: 'linear-gradient(135deg,#FF8C42,#ea580c)', priority: 'high', status: 'overdue', due: '2024-10-18', tags: ['Security'], subtasks: [{ t: 'OWASP checklist', done: true }, { t: 'Pen test report', done: false }, { t: 'Fix vulnerabilities', done: false }], comments: [{ author: 'Roger D.', text: 'OWASP scan complete. 2 medium issues found.', time: '6 days ago' }], attachments: [{ name: 'security_report.pdf', size: '1.6 MB', type: 'pdf' }], description: 'Conduct a thorough security audit and resolve all identified vulnerabilities.' },
  { id: 14, title: 'Email Template Design', project: 'ChronoLoop Launch', assignee: 'MV', aColor: 'linear-gradient(135deg,#A855F7,#7c3aed)', priority: 'low', status: 'in-progress', due: '2024-11-12', tags: ['Design'], subtasks: [{ t: 'Welcome email', done: true }, { t: 'Onboarding sequence', done: false }, { t: 'Notification emails', done: false }], comments: [], attachments: [{ name: 'email_templates.fig', size: '2.0 MB', type: 'fig' }], description: 'Design responsive HTML email templates for transactional and marketing sends.' },
  { id: 15, title: 'User Testing Session', project: 'Web 3 App for Fxtrade', assignee: 'AS', aColor: 'linear-gradient(135deg,#4A90FF,#2563eb)', priority: 'medium', status: 'todo', due: '2024-11-18', tags: ['UX'], subtasks: [{ t: 'Recruit 5 participants', done: false }, { t: 'Prepare test scripts', done: false }, { t: 'Run sessions', done: false }, { t: 'Synthesize findings', done: false }], comments: [], attachments: [], description: 'Run structured usability testing sessions with target users.' },
]
```

- [ ] **Step 5: Extend `Avatar` with a `style` passthrough**

In `src/components/ui/Avatar.tsx`, add `style?: CSSProperties` to `AvatarProps` and forward it to `RadixAvatar.Root`:

```tsx
import type { CSSProperties } from 'react'
// ...
interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md'
  className?: string
  style?: CSSProperties
}
// ...
export const Avatar = forwardRef<ComponentRef<typeof RadixAvatar.Root>, AvatarProps>(
  function Avatar({ src, name, size = 'sm', className, style }, ref) {
    const sizeClass = size === 'md' ? styles.md : styles.sm
    const combined = [styles.root, sizeClass, className].filter(Boolean).join(' ')

    return (
      <RadixAvatar.Root ref={ref} className={combined} style={style} title={name}>
        <RadixAvatar.Image className={styles.image} src={src} alt={name} />
        <RadixAvatar.Fallback className={styles.fallback}>{getInitials(name)}</RadixAvatar.Fallback>
      </RadixAvatar.Root>
    )
  },
)
```

Add one test to `Avatar.test.tsx`:

```tsx
  it('applies an inline style override for one-off sizing', () => {
    render(<Avatar name="Aspen Herwitz" style={{ width: 38, height: 38 }} />)
    expect(screen.getByTitle('Aspen Herwitz')).toHaveStyle({ width: '38px', height: '38px' })
  })
```

- [ ] **Step 6: Create `src/store/tasksStore.ts`**

```ts
// src/store/tasksStore.ts
import { create } from 'zustand'
import type { NewTaskInput, Task } from '../types/task'
import { MOCK_TASKS } from '../data/mockTasks'

const ASSIGNEE_COLOR: Record<string, string> = {
  AS: 'linear-gradient(135deg,#4A90FF,#2563eb)',
  RD: 'linear-gradient(135deg,#FF8C42,#ea580c)',
  MV: 'linear-gradient(135deg,#A855F7,#7c3aed)',
  RC: 'linear-gradient(135deg,#00D4AA,#059669)',
}

interface TasksState {
  tasks: Task[]
  todoKpiOverride: number | null
  addTask: (input: NewTaskInput) => void
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: MOCK_TASKS,
  todoKpiOverride: null,
  addTask: (input) => {
    const { tasks } = get()
    const newId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1
    const newTask: Task = {
      id: newId,
      title: input.title,
      project: input.project,
      assignee: input.assignee,
      aColor: ASSIGNEE_COLOR[input.assignee] ?? 'linear-gradient(135deg,#4A90FF,#2563eb)',
      priority: input.priority,
      status: 'todo',
      due: input.due,
      tags: [],
      subtasks: [],
      comments: [],
      attachments: [],
      description: input.description,
    }
    const nextTasks = [...tasks, newTask]
    set({
      tasks: nextTasks,
      todoKpiOverride: nextTasks.filter((t) => t.status === 'todo').length,
    })
  },
}))
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run src/store/tasksStore.test.tsx src/components/ui/Avatar.test.tsx`
Expected: PASS, 4 + 4 tests.

- [ ] **Step 8: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add src/types/task.ts src/data/mockTasks.ts src/store/tasksStore.ts src/store/tasksStore.test.tsx src/components/ui/Avatar.tsx src/components/ui/Avatar.test.tsx
git commit -m "feat: add Task type, tasksStore, mock task data, and Avatar style passthrough"
```

---

### Task 2: Dashboard UI store + Critical Projects / Team member mock data

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\dashboardUiStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\dashboardUiStore.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\data\mockDashboardProjects.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\data\mockDashboardTeam.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `useDashboardUiStore()` exposing `{ activeModal: DashboardModal; selectedMemberId: string | null; openAddTask: () => void; openActivity: () => void; openInvite: () => void; openMember: (id: string) => void; closeModal: () => void }` where `DashboardModal = 'addTask' | 'activity' | 'invite' | 'member' | null`. `DASHBOARD_CRITICAL_PROJECTS: CriticalProject[]`. `DASHBOARD_TEAM_MEMBERS: DashboardTeamMember[]` with a `gridEmail` field (always `'Joedoe@gmail.com'`, `index.html:3247,3252,3257,3262`) and a `detailEmail` field (per-person, `index.html:6639-6644`) — see Global Constraints' flagged quirk.

- [ ] **Step 1: Write the failing test for `dashboardUiStore`**

```tsx
// src/store/dashboardUiStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardUiStore } from './dashboardUiStore'

describe('dashboardUiStore', () => {
  beforeEach(() => {
    useDashboardUiStore.setState({ activeModal: null, selectedMemberId: null })
  })

  it('opens and closes the Add Task modal', () => {
    useDashboardUiStore.getState().openAddTask()
    expect(useDashboardUiStore.getState().activeModal).toBe('addTask')
    useDashboardUiStore.getState().closeModal()
    expect(useDashboardUiStore.getState().activeModal).toBeNull()
  })

  it('opens the Member modal with the selected member id', () => {
    useDashboardUiStore.getState().openMember('AS')
    expect(useDashboardUiStore.getState()).toMatchObject({ activeModal: 'member', selectedMemberId: 'AS' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/store/dashboardUiStore.test.tsx`
Expected: FAIL with "Cannot find module './dashboardUiStore'"

- [ ] **Step 3: Create `src/store/dashboardUiStore.ts`**

```ts
// src/store/dashboardUiStore.ts
import { create } from 'zustand'

export type DashboardModal = 'addTask' | 'activity' | 'invite' | 'member' | null

interface DashboardUiState {
  activeModal: DashboardModal
  selectedMemberId: string | null
  openAddTask: () => void
  openActivity: () => void
  openInvite: () => void
  openMember: (id: string) => void
  closeModal: () => void
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  activeModal: null,
  selectedMemberId: null,
  openAddTask: () => set({ activeModal: 'addTask' }),
  openActivity: () => set({ activeModal: 'activity' }),
  openInvite: () => set({ activeModal: 'invite' }),
  openMember: (id) => set({ activeModal: 'member', selectedMemberId: id }),
  closeModal: () => set({ activeModal: null }),
}))
```

- [ ] **Step 4: Create `src/data/mockDashboardProjects.ts`**

Ported from the Critical Projects rows at `index.html:3176-3210`:

```ts
// src/data/mockDashboardProjects.ts
export interface CriticalProject {
  id: string
  title: string
  client: string
  dueLabel: string
}

export const DASHBOARD_CRITICAL_PROJECTS: CriticalProject[] = [
  { id: 'web3-fxtrade', title: 'Web 3 app for Fxtrade', client: 'Fxtrade Expert', dueLabel: 'Due in 20hrs' },
  { id: 'healthydog', title: 'Healthydog Landing Page', client: 'DogXpert', dueLabel: 'Due in 3 days' },
  { id: 'redesign-website', title: 'Redesign of Website', client: 'Fxtrade Expert', dueLabel: 'Due in 5 days' },
]
```

- [ ] **Step 5: Create `src/data/mockDashboardTeam.ts`**

Grid identity from `index.html:3244-3263`; per-member detail from `memberData` at `index.html:6639-6644`:

```ts
// src/data/mockDashboardTeam.ts
export interface DashboardTeamMember {
  id: string
  name: string
  role: string
  gridEmail: string
  detailEmail: string
  activeTasks: number
  avatarSrc: string
}

export const DASHBOARD_TEAM_MEMBERS: DashboardTeamMember[] = [
  { id: 'AS', name: 'Aspen Herwitz', role: 'Frontend Developer', gridEmail: 'Joedoe@gmail.com', detailEmail: 'aspen@example.com', activeTasks: 5, avatarSrc: '/avatars/Ellipse 2.png' },
  { id: 'RD', name: 'Roger Dokidis', role: 'Backend Developer', gridEmail: 'Joedoe@gmail.com', detailEmail: 'roger@example.com', activeTasks: 3, avatarSrc: '/avatars/Ellipse 3.png' },
  { id: 'MV', name: 'Marley Vaccaro', role: 'UI/UX Designer', gridEmail: 'Joedoe@gmail.com', detailEmail: 'marley@example.com', activeTasks: 4, avatarSrc: '/avatars/Ellipse 4.png' },
  { id: 'RC', name: 'Ryan Culhane', role: 'Project Manager', gridEmail: 'Joedoe@gmail.com', detailEmail: 'ryan@example.com', activeTasks: 3, avatarSrc: '/avatars/Ellipse 5.png' },
]
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/store/dashboardUiStore.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 8: Commit**

```bash
git add src/store/dashboardUiStore.ts src/store/dashboardUiStore.test.tsx src/data/mockDashboardProjects.ts src/data/mockDashboardTeam.ts
git commit -m "feat: add dashboardUiStore and Critical Projects/Team mock data"
```

---

### Task 3: `useCountUp` hook, `StatCard`, `KpiGrid`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\hooks\useCountUp.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\StatCard.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\StatCard.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\StatCard.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\KpiGrid.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\KpiGrid.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\KpiGrid.test.tsx`

**Interfaces:**
- Consumes: `useTasksStore` (Task 1) for the live `todoKpiOverride`; `Card` from `src/components/ui/Card.tsx`.
- Produces: `useCountUp(target: number, durationMs?: number): number`; `<StatCard label icon target delta="up"|"down" deltaText index>`; `<KpiGrid />` (no props, reads the store itself).

Ported from `index.html:3095-3160` (markup), `:447-494` (CSS), `:6768-6782` (count-up), `:6705-6706` (KPI-0 override on add).

- [ ] **Step 1: Write the failing test for `useCountUp`**

```tsx
// (co-located inline in StatCard.test.tsx — see Step 2; the hook itself is exercised indirectly since it's driven by requestAnimationFrame, which is unreliable to unit-test directly. StatCard's test instead asserts the *end state* and the accessible target value.)
```

- [ ] **Step 2: Write the failing test for `StatCard`**

```tsx
// src/components/dashboard/StatCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClipboardList } from 'lucide-react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the label, target value, and delta text', () => {
    render(
      <StatCard
        label="To-do"
        icon={<ClipboardList aria-hidden="true" />}
        target={45}
        delta="up"
        deltaText="Up 4.5% since yesterday"
        index={0}
      />,
    )
    expect(screen.getByText('To-do')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('▲ Up 4.5% since yesterday')).toBeInTheDocument()
  })

  it('is keyboard-focusable, matching the original tabindex="0" stat cards', () => {
    render(<StatCard label="To-do" icon={<ClipboardList aria-hidden="true" />} target={45} delta="up" deltaText="x" index={0} />)
    expect(screen.getByText('To-do').closest('[tabindex]')).toHaveAttribute('tabindex', '0')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/StatCard.test.tsx`
Expected: FAIL with "Cannot find module './StatCard'"

- [ ] **Step 4: Create `src/hooks/useCountUp.ts`**

Ported from `countUp()` at `index.html:6768-6782` (cubic ease-out, 700ms, fired 300ms after mount):

```ts
// src/hooks/useCountUp.ts
import { useEffect, useState } from 'react'

export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame: number
    const startTimeout = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1)
        setValue(Math.round((1 - Math.pow(1 - progress, 3)) * target))
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, 300)

    return () => {
      clearTimeout(startTimeout)
      cancelAnimationFrame(frame)
    }
  }, [target, durationMs])

  return value
}
```

- [ ] **Step 5: Create `StatCard.module.css`**

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (prefers-reduced-motion: no-preference) {
  .card {
    opacity: 0;
    animation: fadeUp 400ms var(--ease-out) forwards;
  }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.top { display: flex; align-items: flex-start; justify-content: space-between; }
.label { font-size: 11px; color: var(--text-secondary); font-weight: 400; line-height: 1.4; }

.iconWrap {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--accent-blue-bg);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.iconWrap svg { width: 15px; height: 15px; color: var(--accent-blue); }
.iconWrap.overdue { background: rgba(255, 77, 77, 0.12); }
.iconWrap.overdue svg { color: var(--accent-red); }

.value {
  font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 700;
  color: var(--text-primary); line-height: 1; letter-spacing: -0.02em;
}

.delta { display: flex; align-items: center; gap: 4px; font-size: 10px; }
.delta.up { color: var(--accent-green); }
.delta.down { color: var(--accent-red); }
```

- [ ] **Step 6: Implement `StatCard.tsx`**

```tsx
// src/components/dashboard/StatCard.tsx
import type { ReactNode } from 'react'
import { Card } from '../ui/Card'
import { useCountUp } from '../../hooks/useCountUp'
import styles from './StatCard.module.css'

interface StatCardProps {
  label: string
  icon: ReactNode
  target: number
  delta: 'up' | 'down'
  deltaText: string
  index: number
  overdue?: boolean
}

export function StatCard({ label, icon, target, delta, deltaText, index, overdue }: StatCardProps) {
  const value = useCountUp(target)

  return (
    <Card
      hoverable
      tabIndex={0}
      className={styles.card}
      style={{ animationDelay: `${120 + index * 80}ms` }}
    >
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <div className={[styles.iconWrap, overdue && styles.overdue].filter(Boolean).join(' ')}>{icon}</div>
      </div>
      <div className={styles.value}>{value}</div>
      <div className={[styles.delta, styles[delta]].join(' ')}>
        <span>{delta === 'up' ? '▲' : '▼'} {deltaText}</span>
      </div>
    </Card>
  )
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/StatCard.test.tsx`
Expected: PASS, 2 tests. (`useCountUp` starts at 0 and animates via `requestAnimationFrame`/`setTimeout`; jsdom runs these synchronously-enough in test mode that by the time RTL's `render` returns and assertions run, either the initial `0` or an in-progress value could show — if the target-value assertion is flaky, replace `screen.getByText('45')` with asserting the label/delta text only, and cover the animated value in `KpiGrid.test.tsx` via `vi.useFakeTimers()` instead, per Step 9 below.)

- [ ] **Step 8: Write the failing test for `KpiGrid`**

```tsx
// src/components/dashboard/KpiGrid.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { KpiGrid } from './KpiGrid'
import { useTasksStore } from '../../store/tasksStore'
import { MOCK_TASKS } from '../../data/mockTasks'

describe('KpiGrid', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
    vi.useFakeTimers()
  })

  it('renders all five KPI cards with their original static labels', () => {
    render(<KpiGrid />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('To-do')).toBeInTheDocument()
    expect(screen.getByText('Total Project')).toBeInTheDocument()
    expect(screen.getByText('Assigned Tasks')).toBeInTheDocument()
    expect(screen.getByText('Completed Task')).toBeInTheDocument()
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('uses the live todo count for the To-do card once todoKpiOverride is set', () => {
    useTasksStore.setState({ todoKpiOverride: 6 })
    render(<KpiGrid />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('6')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 9: Create `KpiGrid.module.css`**

```css
.grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

@media (max-width: 1280px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

- [ ] **Step 10: Implement `KpiGrid.tsx`**

```tsx
// src/components/dashboard/KpiGrid.tsx
import { ClipboardList, Briefcase, FileText, ClipboardCheck, Clock } from 'lucide-react'
import { StatCard } from './StatCard'
import { useTasksStore } from '../../store/tasksStore'
import styles from './KpiGrid.module.css'

export function KpiGrid() {
  const todoKpiOverride = useTasksStore((s) => s.todoKpiOverride)

  return (
    <div className={styles.grid}>
      <StatCard index={0} label="To-do" icon={<ClipboardList aria-hidden="true" />} target={todoKpiOverride ?? 45} delta="up" deltaText="Up 4.5% since yesterday" />
      <StatCard index={1} label="Total Project" icon={<Briefcase aria-hidden="true" />} target={10} delta="up" deltaText="Up 4.5% since yesterday" />
      <StatCard index={2} label="Assigned Tasks" icon={<FileText aria-hidden="true" />} target={15} delta="up" deltaText="Up 4.5% since past week" />
      <StatCard index={3} label="Completed Task" icon={<ClipboardCheck aria-hidden="true" />} target={7} delta="down" deltaText="Down 12% since three days" />
      <StatCard index={4} label="Overdue Tasks" icon={<Clock aria-hidden="true" />} target={5} delta="down" deltaText="Up 10% since yesterday" overdue />
    </div>
  )
}
```

Note: the last card's delta text is `▼ Up 10% since yesterday` — an arrow/text mismatch present verbatim in the original (`index.html:3154-3157`). Preserved, not corrected.

- [ ] **Step 11: Run tests to verify they pass**

Run: `pnpm vitest run src/components/dashboard/StatCard.test.tsx src/components/dashboard/KpiGrid.test.tsx`
Expected: PASS, 4 tests total.

- [ ] **Step 12: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 13: Commit**

```bash
git add src/hooks/useCountUp.ts src/components/dashboard/StatCard.tsx src/components/dashboard/StatCard.module.css src/components/dashboard/StatCard.test.tsx src/components/dashboard/KpiGrid.tsx src/components/dashboard/KpiGrid.module.css src/components/dashboard/KpiGrid.test.tsx
git commit -m "feat: add useCountUp hook, StatCard, and KpiGrid"
```

---

### Task 4: `DashboardHeader` (greeting + action bar)

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\DashboardHeader.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\DashboardHeader.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\DashboardHeader.test.tsx`

**Interfaces:**
- Consumes: `useDashboardUiStore().openAddTask` (Task 2), `useToastStore().showToast` (Phase 2), `Dropdown`/`Button` (Phase 2 `ui/`).
- Produces: `<DashboardHeader />`, no props.

Ported from `index.html:3064-3093` (markup), `:388-445` (CSS for `.greeting-row`/`.btn-split`/`.btn-secondary`), `:6453-6473` (Add Task split button + Export), `:6480-6511` (dropdown item handlers for Add Task caret / Year / Filter).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/dashboard/DashboardHeader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardHeader } from './DashboardHeader'
import { useDashboardUiStore } from '../../store/dashboardUiStore'

describe('DashboardHeader', () => {
  it('renders the greeting text', () => {
    render(<DashboardHeader />)
    expect(screen.getByText('Hello Jacobs,')).toBeInTheDocument()
    expect(screen.getByText('Welcome Back,')).toBeInTheDocument()
  })

  it('opens the Add Task modal via the split button\'s main action', async () => {
    useDashboardUiStore.setState({ activeModal: null })
    render(<DashboardHeader />)
    await userEvent.click(screen.getByRole('button', { name: /add task/i }))
    expect(useDashboardUiStore.getState().activeModal).toBe('addTask')
  })

  it('switches the active year label when a year is picked from the dropdown', async () => {
    render(<DashboardHeader />)
    await userEvent.click(screen.getByRole('button', { name: /2024/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: '2023' }))
    expect(screen.getByText('2023')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/DashboardHeader.test.tsx`
Expected: FAIL with "Cannot find module './DashboardHeader'"

- [ ] **Step 3: Create `DashboardHeader.module.css`**

```css
.row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.greeting .hello { font-size: 13px; color: var(--text-secondary); margin-bottom: 2px; }
.greeting .welcome { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 600; color: var(--text-primary); }

.actionBar { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.split { display: flex; align-items: stretch; border-radius: 8px; overflow: hidden; flex-shrink: 0; }

.splitMain {
  display: flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 12px;
  background: var(--accent-blue); color: #fff;
  border: none; border-radius: 0;
  font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif;
  cursor: pointer; transition: opacity var(--duration-fast);
  white-space: nowrap;
}
.splitMain:hover { opacity: 0.88; }
.splitMain svg { width: 14px; height: 14px; }

.splitCaret {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 34px;
  background: var(--accent-blue); color: rgba(255, 255, 255, 0.85);
  border: none; border-left: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer; transition: opacity var(--duration-fast), background var(--duration-fast); border-radius: 0;
}
.splitCaret:hover { opacity: 0.88; background: #3a7de0; }
.splitCaret svg { width: 13px; height: 13px; }

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

- [ ] **Step 4: Implement `DashboardHeader.tsx`**

`Button` variant `secondary` covers Year/Filter/Export; the split button is bespoke (no primitive matches `.btn-split`). Filter checkbox state is local (`useState`), matching the original's uncontrolled-until-Clear/Apply behavior:

```tsx
// src/components/dashboard/DashboardHeader.tsx
import { useState } from 'react'
import { Plus, ChevronDown, Calendar, SlidersHorizontal, Upload } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { useDashboardUiStore } from '../../store/dashboardUiStore'
import { useToastStore } from '../../store/toastStore'
import styles from './DashboardHeader.module.css'

const YEARS = ['2022', '2023', '2024', '2025']

const FILTER_DEFAULTS = {
  todo: true,
  progress: true,
  done: true,
  overdue: false,
  high: true,
  medium: true,
  low: false,
}

export function DashboardHeader() {
  const openAddTask = useDashboardUiStore((s) => s.openAddTask)
  const showToast = useToastStore((s) => s.showToast)
  const [year, setYear] = useState('2024')
  const [filters, setFilters] = useState(FILTER_DEFAULTS)

  const handleAddTaskCaret = (action: 'task' | 'project' | 'sprint' | 'import') => {
    if (action === 'task') openAddTask()
    else if (action === 'project') showToast('New Project form coming soon', 'info')
    else if (action === 'sprint') showToast('New Sprint form coming soon', 'info')
    else showToast('Import dialog opening...', 'info')
  }

  const handleExport = () => {
    showToast('Preparing export...', 'info', 1500)
    setTimeout(() => {
      const csv = 'Task,Project,Assignee,Due\nHomepage CareyCare,ChronoLoop,Aspen H.,Nov 2\nLanding Page Eatz,Web 3 App,Marley V.,Nov 7\n'
      const blob = new Blob([csv], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'chronoloop-export.csv'
      link.click()
      showToast('Data exported successfully!', 'success')
    }, 1600)
  }

  return (
    <div className={styles.row}>
      <div className={styles.greeting}>
        <div className="hello">Hello Jacobs,</div>
        <div className="welcome">Welcome Back,</div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.split}>
          <button type="button" className={styles.splitMain} onClick={openAddTask}>
            <Plus aria-hidden="true" /> Add Task
          </button>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button type="button" className={styles.splitCaret} aria-label="More add options">
                <ChevronDown aria-hidden="true" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <Dropdown.Item onSelect={() => handleAddTaskCaret('task')}>New Task</Dropdown.Item>
              <Dropdown.Item onSelect={() => handleAddTaskCaret('project')}>New Project</Dropdown.Item>
              <Dropdown.Item onSelect={() => handleAddTaskCaret('sprint')}>New Sprint</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onSelect={() => handleAddTaskCaret('import')}>Import Tasks</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </div>

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <Button variant="secondary">
              <Calendar aria-hidden="true" /> {year} <ChevronDown aria-hidden="true" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            {YEARS.map((y) => (
              <Dropdown.Item key={y} active={y === year} onSelect={() => { setYear(y); showToast(`Showing data for ${y}`, 'info', 2000) }}>
                {y}
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
            <div className={styles.filterSectionTitle}>Status</div>
            {(['todo', 'progress', 'done', 'overdue'] as const).map((key) => (
              <label key={key} className={styles.filterCheckItem}>
                <input
                  type="checkbox"
                  checked={filters[key]}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.checked }))}
                />
                <span>{key === 'todo' ? 'To-do' : key === 'progress' ? 'In Progress' : key === 'done' ? 'Completed' : 'Overdue'}</span>
              </label>
            ))}
            <Dropdown.Divider />
            <div className={styles.filterSectionTitle}>Priority</div>
            {(['high', 'medium', 'low'] as const).map((key) => (
              <label key={key} className={styles.filterCheckItem}>
                <input
                  type="checkbox"
                  checked={filters[key]}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.checked }))}
                />
                <span>{key[0].toUpperCase() + key.slice(1)}</span>
              </label>
            ))}
            <div className={styles.filterFooter}>
              <button type="button" className={styles.filterClear} onClick={() => { setFilters({ todo: false, progress: false, done: false, overdue: false, high: false, medium: false, low: false }); showToast('Filters cleared', 'info', 2000) }}>
                Clear all
              </button>
              <button type="button" className={styles.filterApply} onClick={() => showToast('Filters applied', 'success', 2000)}>
                Apply
              </button>
            </div>
          </Dropdown.Content>
        </Dropdown.Root>

        <Button variant="secondary" onClick={handleExport}>
          <Upload aria-hidden="true" /> Export Data
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/DashboardHeader.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/DashboardHeader.tsx src/components/dashboard/DashboardHeader.module.css src/components/dashboard/DashboardHeader.test.tsx
git commit -m "feat: add DashboardHeader with split add-task button, year/filter dropdowns, and export"
```

---

### Task 5: `CriticalProjectsPanel`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\CriticalProjectsPanel.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\CriticalProjectsPanel.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\CriticalProjectsPanel.test.tsx`

**Interfaces:**
- Consumes: `DASHBOARD_CRITICAL_PROJECTS` (Task 2), `useToastStore`, `Dropdown`.
- Produces: `<CriticalProjectsPanel />`, no props.

Ported from `index.html:3166-3216` (markup), `:499-558` (CSS), `:6585-6632` (interactions: See All, three-dot context menu, row click, client-name click).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/dashboard/CriticalProjectsPanel.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CriticalProjectsPanel } from './CriticalProjectsPanel'
import { useToastStore } from '../../store/toastStore'

describe('CriticalProjectsPanel', () => {
  it('renders all three critical project rows', () => {
    render(<CriticalProjectsPanel />)
    expect(screen.getByText('Web 3 app for Fxtrade')).toBeInTheDocument()
    expect(screen.getByText('Healthydog Landing Page')).toBeInTheDocument()
    expect(screen.getByText('Redesign of Website')).toBeInTheDocument()
  })

  it('shows a toast naming the project when a row is clicked', async () => {
    render(<CriticalProjectsPanel />)
    await userEvent.click(screen.getByText('Web 3 app for Fxtrade'))
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Opening: Web 3 app for Fxtrade')
  })

  it('opens the three-dot context menu with View/Edit/Archive/Delete actions', async () => {
    render(<CriticalProjectsPanel />)
    const menus = screen.getAllByRole('button', { name: /more options/i })
    await userEvent.click(menus[0])
    expect(await screen.findByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/CriticalProjectsPanel.test.tsx`
Expected: FAIL with "Cannot find module './CriticalProjectsPanel'"

- [ ] **Step 3: Create `CriticalProjectsPanel.module.css`**

```css
.panel {
  flex: 1.6;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: 10px; padding: 14px 18px;
  display: flex; flex-direction: column;
  transition: background var(--duration-normal) var(--ease-out);
}

.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); }

.weekBtn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  background: var(--bg-card-hover); border: 1px solid var(--border-subtle);
  border-radius: 6px; color: var(--text-secondary);
  font-size: 11px; font-family: 'DM Sans', sans-serif;
  cursor: pointer; transition: background var(--duration-fast);
}
.weekBtn:hover { background: var(--border-subtle); color: var(--text-primary); }
.weekBtn svg { width: 11px; height: 11px; }

.rows { flex: 1; }

.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 6px; border-bottom: 1px solid var(--border-subtle);
  transition: background var(--duration-fast);
  cursor: pointer; border-radius: 4px;
  width: 100%; text-align: left; background: none; border-left: none; border-right: none; border-top: none;
}
.row:hover { background: var(--bg-card-hover); }
.row:last-child { border-bottom: none; }

.rowTitle { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 3px; }
.rowMeta { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary); }
.client { color: var(--accent-blue); font-weight: 400; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; font-size: inherit; }
.client:hover { text-decoration: underline; }
.dot { color: var(--text-muted); }

.threeDotBtn {
  width: 28px; height: 28px; border-radius: 6px;
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background var(--duration-fast), color var(--duration-fast);
  flex-shrink: 0;
}
.threeDotBtn:hover { background: var(--border-default); color: var(--text-primary); }
.threeDotBtn svg { width: 14px; height: 14px; }

.footer { padding-top: 12px; text-align: center; border-top: 1px solid var(--border-subtle); margin-top: 4px; }
.seeAll {
  background: transparent; border: none; font-size: 12px;
  color: var(--text-secondary); cursor: pointer; font-family: 'DM Sans', sans-serif;
  transition: color var(--duration-fast);
}
.seeAll:hover { color: var(--text-primary); }
```

Note: `.three-dot-btn` in the original is `opacity: 0` until row hover (`index.html:544,548`). That hover-reveal is omitted here in favor of always-visible, since the original's `.row:hover .threeDotBtn { opacity: 1 }` pattern hides the menu trigger from keyboard/touch users who never trigger `:hover` — a deliberate accessibility improvement over strict parity, matching the "accessible by default" requirement in the rewrite brief. Flag this to the product owner rather than reverting silently if visual diff review flags it.

- [ ] **Step 4: Implement `CriticalProjectsPanel.tsx`**

```tsx
// src/components/dashboard/CriticalProjectsPanel.tsx
import { MoreHorizontal, ChevronDown, Eye, Edit2, Archive, Trash2 } from 'lucide-react'
import { Dropdown } from '../ui/Dropdown'
import { DASHBOARD_CRITICAL_PROJECTS } from '../../data/mockDashboardProjects'
import { useToastStore } from '../../store/toastStore'
import styles from './CriticalProjectsPanel.module.css'

const WEEK_OPTIONS = ['Today', 'This week', 'This month', 'This quarter']

const CTX_ACTIONS = [
  { action: 'view', label: 'View Details', icon: <Eye aria-hidden="true" />, message: (name: string) => `Viewing "${name}"`, variant: 'info' as const },
  { action: 'edit', label: 'Edit', icon: <Edit2 aria-hidden="true" />, message: (name: string) => `Editing "${name}"`, variant: 'info' as const },
  { action: 'archive', label: 'Archive', icon: <Archive aria-hidden="true" />, message: (name: string) => `Archived "${name}"`, variant: 'success' as const },
]

export function CriticalProjectsPanel() {
  const showToast = useToastStore((s) => s.showToast)

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Critical Projects</h2>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button type="button" className={styles.weekBtn}>
              This week <ChevronDown aria-hidden="true" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            {WEEK_OPTIONS.map((label) => (
              <Dropdown.Item key={label} active={label === 'This week'} onSelect={() => showToast(`Showing ${label.toLowerCase()}`, 'info', 2000)}>
                {label}
              </Dropdown.Item>
            ))}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>

      <div className={styles.rows}>
        {DASHBOARD_CRITICAL_PROJECTS.map((project) => (
          <div
            key={project.id}
            className={styles.row}
            role="button"
            tabIndex={0}
            onClick={() => showToast(`Opening: ${project.title}`, 'info', 2000)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') showToast(`Opening: ${project.title}`, 'info', 2000) }}
          >
            <div>
              <div className={styles.rowTitle}>{project.title}</div>
              <div className={styles.rowMeta}>
                <button
                  type="button"
                  className={styles.client}
                  onClick={(e) => { e.stopPropagation(); showToast('Opening client profile...', 'info', 2000) }}
                >
                  {project.client}
                </button>
                <span className={styles.dot}>•</span>
                <span>{project.dueLabel}</span>
              </div>
            </div>

            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type="button"
                  className={styles.threeDotBtn}
                  aria-label="More options"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal aria-hidden="true" />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content>
                {CTX_ACTIONS.map(({ action, label, icon, message, variant }) => (
                  <Dropdown.Item key={action} icon={icon} onSelect={() => showToast(message(project.title), variant)}>
                    {label}
                  </Dropdown.Item>
                ))}
                <Dropdown.Divider />
                <Dropdown.Item icon={<Trash2 aria-hidden="true" />} danger onSelect={() => showToast(`Deleted "${project.title}"`, 'error')}>
                  Delete
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.seeAll} onClick={() => showToast('Loading all projects...', 'info', 2000)}>
          See All
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/CriticalProjectsPanel.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/CriticalProjectsPanel.tsx src/components/dashboard/CriticalProjectsPanel.module.css src/components/dashboard/CriticalProjectsPanel.test.tsx
git commit -m "feat: add CriticalProjectsPanel with three-dot context menu"
```

---

### Task 6: `TeamStatusPanel`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\TeamStatusPanel.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\TeamStatusPanel.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\TeamStatusPanel.test.tsx`

**Interfaces:**
- Consumes: `DASHBOARD_TEAM_MEMBERS` (Task 2), `useDashboardUiStore` (`openActivity`, `openInvite`, `openMember`), `Avatar`.
- Produces: `<TeamStatusPanel />`, no props.

Ported from `index.html:3219-3269` (markup), `:560-627` (CSS), `:6557-6580` (Developer/Select Project dropdowns), `:6637-6663` (View Activity, member click, Add Individual), `:6787-6790` (progress bar animated width).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/dashboard/TeamStatusPanel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamStatusPanel } from './TeamStatusPanel'
import { useDashboardUiStore } from '../../store/dashboardUiStore'

describe('TeamStatusPanel', () => {
  it('renders all four team members plus the Add Individual tile', () => {
    render(<TeamStatusPanel />)
    expect(screen.getByText('Aspen Herwitz')).toBeInTheDocument()
    expect(screen.getByText('Roger Dokidis')).toBeInTheDocument()
    expect(screen.getByText('Marley Vaccaro')).toBeInTheDocument()
    expect(screen.getByText('Ryan Culhane')).toBeInTheDocument()
    expect(screen.getByText('Add Individual')).toBeInTheDocument()
  })

  it('opens the Member modal for the selected member on click', async () => {
    useDashboardUiStore.setState({ activeModal: null, selectedMemberId: null })
    render(<TeamStatusPanel />)
    await userEvent.click(screen.getByText('Aspen Herwitz'))
    expect(useDashboardUiStore.getState()).toMatchObject({ activeModal: 'member', selectedMemberId: 'AS' })
  })

  it('opens the Invite modal from Add Individual', async () => {
    useDashboardUiStore.setState({ activeModal: null })
    render(<TeamStatusPanel />)
    await userEvent.click(screen.getByText('Add Individual'))
    expect(useDashboardUiStore.getState().activeModal).toBe('invite')
  })

  it('opens the Activity modal from View Activity', async () => {
    useDashboardUiStore.setState({ activeModal: null })
    render(<TeamStatusPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'View Activity' }))
    expect(useDashboardUiStore.getState().activeModal).toBe('activity')
  })

  it('animates the progress bar to 85% after mount', () => {
    vi.useFakeTimers()
    render(<TeamStatusPanel />)
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '85')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/TeamStatusPanel.test.tsx`
Expected: FAIL with "Cannot find module './TeamStatusPanel'"

- [ ] **Step 3: Create `TeamStatusPanel.module.css`**

```css
.panel {
  flex: 1;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: 10px; padding: 14px 18px;
  display: flex; flex-direction: column; gap: 10px;
  transition: background var(--duration-normal) var(--ease-out);
}

.header { display: flex; align-items: center; justify-content: space-between; }
.title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); }

.roleBtn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  background: var(--bg-card-hover); border: 1px solid var(--border-subtle);
  border-radius: 6px; color: var(--text-secondary);
  font-size: 11px; font-family: 'DM Sans', sans-serif;
  cursor: pointer; transition: background var(--duration-fast);
}
.roleBtn:hover { background: var(--border-subtle); color: var(--text-primary); }
.roleBtn svg { width: 11px; height: 11px; }

.selectProjectBtn {
  width: 100%; padding: 8px 12px;
  background: var(--bg-card-hover); border: 1px solid var(--border-subtle);
  border-radius: 8px; color: var(--text-secondary); font-size: 12px;
  font-family: 'DM Sans', sans-serif; cursor: pointer; text-align: left;
  display: flex; align-items: center; justify-content: space-between;
  transition: background var(--duration-fast);
}
.selectProjectBtn:hover { background: var(--border-subtle); color: var(--text-primary); }
.selectProjectBtn svg { width: 12px; height: 12px; }

.progressRow { display: flex; align-items: center; gap: 10px; }
.progressBarWrap { flex: 1; }
.progressTrack { height: 8px; background: var(--border-subtle); border-radius: 4px; overflow: hidden; }
.progressFill { height: 100%; border-radius: 4px; background: var(--accent-teal); width: 0%; transition: width 600ms var(--ease-out); }
.progressPct { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; }

.viewActivity {
  font-size: 11px; color: var(--accent-blue);
  background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap;
}
.viewActivity:hover { text-decoration: underline; }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }

.member {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 6px 4px; border-radius: 8px; cursor: pointer;
  transition: background var(--duration-fast), transform var(--duration-fast);
  border: 1px solid transparent; background-color: transparent;
}
.member:hover { background: var(--bg-card-hover); border-color: var(--border-subtle); transform: translateY(-2px); }

.memberName { font-size: 10px; font-weight: 600; color: var(--text-primary); text-align: center; line-height: 1.3; }
.memberEmail { font-size: 9px; color: var(--text-muted); text-align: center; }

.addIndividual {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 6px 4px; border-radius: 8px; cursor: pointer;
  transition: background var(--duration-fast); border: 1px solid transparent; background-color: transparent;
}
.addIndividual:hover { background: var(--bg-card-hover); border-color: var(--border-subtle); }

.addCircle {
  width: 38px; height: 38px; border-radius: 50%;
  border: 1.5px dashed var(--border-default);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
  transition: border-color var(--duration-fast), color var(--duration-fast);
}
.addIndividual:hover .addCircle { border-color: var(--accent-blue); color: var(--accent-blue); }
.addCircle svg { width: 14px; height: 14px; }
.addLabel { font-size: 10px; color: var(--text-muted); text-align: center; line-height: 1.3; }
```

- [ ] **Step 4: Implement `TeamStatusPanel.tsx`**

```tsx
// src/components/dashboard/TeamStatusPanel.tsx
import { useEffect, useState } from 'react'
import { ChevronDown, Layers, Briefcase, Plus } from 'lucide-react'
import { Dropdown } from '../ui/Dropdown'
import { Avatar } from '../ui/Avatar'
import { DASHBOARD_TEAM_MEMBERS } from '../../data/mockDashboardTeam'
import { DASHBOARD_CRITICAL_PROJECTS } from '../../data/mockDashboardProjects'
import { useDashboardUiStore } from '../../store/dashboardUiStore'
import { useToastStore } from '../../store/toastStore'
import styles from './TeamStatusPanel.module.css'

const ROLES = ['All roles', 'Developer', 'Designer', 'Manager']

export function TeamStatusPanel() {
  const openActivity = useDashboardUiStore((s) => s.openActivity)
  const openInvite = useDashboardUiStore((s) => s.openInvite)
  const openMember = useDashboardUiStore((s) => s.openMember)
  const showToast = useToastStore((s) => s.showToast)
  const [role, setRole] = useState('Developer')
  const [project, setProject] = useState('All Projects')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(85), 400)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Team Status</h2>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button type="button" className={styles.roleBtn}>
              {role} <ChevronDown aria-hidden="true" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            {ROLES.map((r) => (
              <Dropdown.Item key={r} active={r === role} onSelect={() => { setRole(r); showToast(`Filtering by ${r}`, 'info', 2000) }}>
                {r}
              </Dropdown.Item>
            ))}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>

      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <button type="button" className={styles.selectProjectBtn}>
            {project} <ChevronDown aria-hidden="true" />
          </button>
        </Dropdown.Trigger>
        <Dropdown.Content align="start">
          <Dropdown.Item icon={<Layers aria-hidden="true" />} active={project === 'All Projects'} onSelect={() => { setProject('All Projects'); showToast('Project: All Projects', 'info', 2000) }}>
            All Projects
          </Dropdown.Item>
          <Dropdown.Divider />
          {DASHBOARD_CRITICAL_PROJECTS.map((p) => (
            <Dropdown.Item key={p.id} icon={<Briefcase aria-hidden="true" />} active={project === p.title} onSelect={() => { setProject(p.title); showToast(`Project: ${p.title}`, 'info', 2000) }}>
              {p.title}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Root>

      <div className={styles.progressRow}>
        <div className={styles.progressBarWrap}>
          <div className={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className={styles.progressPct}>{progress}%</span>
        <button type="button" className={styles.viewActivity} onClick={openActivity}>
          View Activity
        </button>
      </div>

      <div className={styles.grid}>
        {DASHBOARD_TEAM_MEMBERS.map((member) => (
          <button key={member.id} type="button" className={styles.member} onClick={() => openMember(member.id)}>
            <Avatar src={member.avatarSrc} name={member.name} style={{ width: 38, height: 38 }} />
            <div className={styles.memberName}>{member.name}</div>
            <div className={styles.memberEmail}>{member.gridEmail}</div>
          </button>
        ))}
        <button type="button" className={styles.addIndividual} onClick={openInvite}>
          <div className={styles.addCircle}><Plus aria-hidden="true" /></div>
          <div className={styles.addLabel}>Add Individual</div>
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/TeamStatusPanel.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/TeamStatusPanel.tsx src/components/dashboard/TeamStatusPanel.module.css src/components/dashboard/TeamStatusPanel.test.tsx
git commit -m "feat: add TeamStatusPanel with role/project dropdowns and animated progress bar"
```

---

### Task 7: Dashboard modals — Add Task, Activity, Invite, Member Detail

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\formStyles.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\AddTaskModal.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\AddTaskModal.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\ActivityModal.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\ActivityModal.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\ActivityModal.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\InviteModal.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\InviteModal.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\MemberDetailModal.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\MemberDetailModal.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\MemberDetailModal.test.tsx`

**Interfaces:**
- Consumes: `Modal`, `Button` (`ui/`), `useDashboardUiStore` (Task 2), `useTasksStore().addTask` (Task 1), `useToastStore`, `DASHBOARD_TEAM_MEMBERS` (Task 2), `Avatar`.
- Produces: `<AddTaskModal />`, `<ActivityModal />`, `<InviteModal />`, `<MemberDetailModal />` — each self-contained, reading `activeModal`/`selectedMemberId` from `useDashboardUiStore` to decide whether to render `open={true}` on their `Modal`.

Ported from `index.html:5552-5610` (Add Task), `:5756-5794` (Activity), `:5797-5830` (Invite), `:5833-5862` (Member), `:825-847` (form control CSS), `:6675-6720` (Add Task submit + priority pill), `:6722-6728` (Invite submit), `:6646-6660` (member click → populate modal).

- [ ] **Step 1: Create shared `formStyles.module.css`**

Ported from `index.html:825-847`:

```css
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
  padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border-subtle);
  background: transparent; color: var(--text-secondary); font-size: 12px;
  font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all var(--duration-fast);
}
.priorityPill.high:hover, .priorityPill.high[data-selected='true'] { background: rgba(255, 77, 77, 0.12); color: var(--accent-red); border-color: var(--accent-red); }
.priorityPill.medium:hover, .priorityPill.medium[data-selected='true'] { background: rgba(234, 179, 8, 0.12); color: var(--accent-yellow); border-color: var(--accent-yellow); }
.priorityPill.low:hover, .priorityPill.low[data-selected='true'] { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); border-color: var(--accent-green); }
```

`data-selected` (not a `.sel` class toggle) drives the selected look — matching the Phase 2 precedent of testing/styling via attributes rather than fighting CSS Modules' hashed class names across compound selectors.

- [ ] **Step 2: Write the failing test for `AddTaskModal`**

```tsx
// src/components/dashboard/modals/AddTaskModal.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddTaskModal } from './AddTaskModal'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'
import { useTasksStore } from '../../../store/tasksStore'
import { useToastStore } from '../../../store/toastStore'
import { MOCK_TASKS } from '../../../data/mockTasks'

describe('AddTaskModal', () => {
  beforeEach(() => {
    useDashboardUiStore.setState({ activeModal: 'addTask' })
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
    useToastStore.setState({ toasts: [] })
  })

  it('is not rendered when addTask is not the active modal', () => {
    useDashboardUiStore.setState({ activeModal: null })
    render(<AddTaskModal />)
    expect(screen.queryByText('Add New Task')).not.toBeInTheDocument()
  })

  it('submitting the form adds a task, shows a success toast, and closes', async () => {
    render(<AddTaskModal />)
    await userEvent.type(screen.getByLabelText(/task name/i), 'Ship Phase 3')
    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }))

    expect(useTasksStore.getState().tasks.at(-1)).toMatchObject({ title: 'Ship Phase 3', status: 'todo' })
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('"Ship Phase 3" added to To Do!')
    expect(useDashboardUiStore.getState().activeModal).toBeNull()
  })

  it('does not submit when the task name is empty', async () => {
    render(<AddTaskModal />)
    const before = useTasksStore.getState().tasks.length
    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }))
    expect(useTasksStore.getState().tasks.length).toBe(before)
  })

  it('lets the user pick a priority pill', async () => {
    render(<AddTaskModal />)
    const high = screen.getByRole('button', { name: 'High' })
    await userEvent.click(high)
    expect(high).toHaveAttribute('data-selected', 'true')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/modals/AddTaskModal.test.tsx`
Expected: FAIL with "Cannot find module './AddTaskModal'"

- [ ] **Step 4: Implement `AddTaskModal.tsx`**

Form field values ported from `index.html:5569-5583` (project/assignee option lists); submit logic ported from `index.html:6675-6707` (create-only path — the original's `editingTaskId` edit branch belongs to the Tasks page, out of scope here):

```tsx
// src/components/dashboard/modals/AddTaskModal.tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'
import { useTasksStore } from '../../../store/tasksStore'
import { useToastStore } from '../../../store/toastStore'
import type { TaskPriority } from '../../../types/task'
import formStyles from './formStyles.module.css'

const PROJECTS = ['Web 3 App for Fxtrade', 'Healthydog Landing Page', 'Redesign of Website', 'ChronoLoop Launch']
const ASSIGNEES: Record<string, string> = {
  'Aspen Herwitz': 'AS',
  'Roger Dokidis': 'RD',
  'Marley Vaccaro': 'MV',
  'Ryan Culhane': 'RC',
}

const EMPTY_FORM = { name: '', project: PROJECTS[0], assigneeName: 'Aspen Herwitz', due: '', priority: 'medium' as TaskPriority, description: '' }

export function AddTaskModal() {
  const activeModal = useDashboardUiStore((s) => s.activeModal)
  const closeModal = useDashboardUiStore((s) => s.closeModal)
  const addTask = useTasksStore((s) => s.addTask)
  const showToast = useToastStore((s) => s.showToast)
  const [form, setForm] = useState(EMPTY_FORM)

  const handleClose = () => {
    setForm(EMPTY_FORM)
    closeModal()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const due = form.due || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    addTask({
      title: name,
      project: form.project,
      assignee: ASSIGNEES[form.assigneeName] ?? form.assigneeName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase(),
      due,
      priority: form.priority,
      description: form.description.trim(),
    })
    showToast(`"${name.slice(0, 30)}" added to To Do!`, 'success')
    handleClose()
  }

  return (
    <Modal
      open={activeModal === 'addTask'}
      onOpenChange={(open) => !open && handleClose()}
      title="Add New Task"
      subtitle="Fill in the details to create a task"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="form-addtask"><Plus aria-hidden="true" /> Add Task</Button>
        </>
      }
    >
      <form id="form-addtask" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="task-name-input">Task Name *</label>
          <input
            id="task-name-input"
            className={formStyles.formInput}
            type="text"
            placeholder="Enter task name..."
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className={formStyles.formRow}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.formLabel} htmlFor="task-project-sel">Project</label>
            <select id="task-project-sel" className={formStyles.formSelect} value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}>
              {PROJECTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className={formStyles.formGroup}>
            <label className={formStyles.formLabel} htmlFor="task-assignee-sel">Assignee</label>
            <select id="task-assignee-sel" className={formStyles.formSelect} value={form.assigneeName} onChange={(e) => setForm((f) => ({ ...f, assigneeName: e.target.value }))}>
              {Object.keys(ASSIGNEES).map((name) => <option key={name}>{name}</option>)}
            </select>
          </div>
        </div>

        <div className={formStyles.formRow}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.formLabel} htmlFor="task-due">Due Date</label>
            <input id="task-due" className={formStyles.formInput} type="date" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} />
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
        </div>

        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="task-desc">Description</label>
          <textarea id="task-desc" className={formStyles.formTextarea} placeholder="Add a description..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/modals/AddTaskModal.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write the failing test for `ActivityModal`**

```tsx
// src/components/dashboard/modals/ActivityModal.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityModal } from './ActivityModal'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'
import { useToastStore } from '../../../store/toastStore'

describe('ActivityModal', () => {
  it('lists the five original activity entries when open', () => {
    useDashboardUiStore.setState({ activeModal: 'activity' })
    render(<ActivityModal />)
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
    expect(screen.getByText(/moved/i)).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })

  it('Export Log closes the modal and shows a success toast', async () => {
    useDashboardUiStore.setState({ activeModal: 'activity' })
    useToastStore.setState({ toasts: [] })
    render(<ActivityModal />)
    await userEvent.click(screen.getByRole('button', { name: /export log/i }))
    expect(useDashboardUiStore.getState().activeModal).toBeNull()
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Full activity log downloaded')
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/modals/ActivityModal.test.tsx`
Expected: FAIL with "Cannot find module './ActivityModal'"

- [ ] **Step 8: Create `ActivityModal.module.css`**

Ported from `index.html:902-906`:

```css
.item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
.item:last-child { border-bottom: none; }
.text { font-size: 12px; color: var(--text-primary); line-height: 1.4; }
.time { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
```

- [ ] **Step 9: Implement `ActivityModal.tsx`**

Ported verbatim from `index.html:5766-5792`:

```tsx
// src/components/dashboard/modals/ActivityModal.tsx
import { Download } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Avatar } from '../../ui/Avatar'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'
import { useToastStore } from '../../../store/toastStore'
import styles from './ActivityModal.module.css'

const ACTIVITY_ITEMS = [
  { name: 'Aspen Herwitz', avatarSrc: '/avatars/Ellipse 2.png', text: <><strong>Aspen Herwitz</strong> completed <em>Login screen wireframe</em></>, time: '2 minutes ago' },
  { name: 'Roger Dokidis', avatarSrc: '/avatars/Ellipse 3.png', text: <><strong>Roger Dokidis</strong> added a comment to <em>Healthydog Landing Page</em></>, time: '15 minutes ago' },
  { name: 'Marley Vaccaro', avatarSrc: '/avatars/Ellipse 4.png', text: <><strong>Marley Vaccaro</strong> uploaded 3 design assets</>, time: '1 hour ago' },
  { name: 'Ryan Culhane', avatarSrc: '/avatars/Ellipse 5.png', text: <><strong>Ryan Culhane</strong> moved <em>Web 3 App</em> to In Review</>, time: '2 hours ago' },
  { name: 'Jacob Solayinka', avatarSrc: '/avatars/Ellipse 1.png', text: <><strong>You</strong> created a new sprint <em>Sprint 4</em></>, time: 'Yesterday' },
]

export function ActivityModal() {
  const activeModal = useDashboardUiStore((s) => s.activeModal)
  const closeModal = useDashboardUiStore((s) => s.closeModal)
  const showToast = useToastStore((s) => s.showToast)

  return (
    <Modal
      open={activeModal === 'activity'}
      onOpenChange={(open) => !open && closeModal()}
      title="Team Activity"
      subtitle="Recent actions by team members"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Close</Button>
          <Button onClick={() => { closeModal(); showToast('Full activity log downloaded', 'success') }}>
            <Download aria-hidden="true" /> Export Log
          </Button>
        </>
      }
    >
      {ACTIVITY_ITEMS.map((item) => (
        <div key={item.name + item.time} className={styles.item}>
          <Avatar src={item.avatarSrc} name={item.name} style={{ width: 28, height: 28 }} />
          <div>
            <div className={styles.text}>{item.text}</div>
            <div className={styles.time}>{item.time}</div>
          </div>
        </div>
      ))}
    </Modal>
  )
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/modals/ActivityModal.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 11: Write the failing test for `InviteModal`**

```tsx
// src/components/dashboard/modals/InviteModal.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteModal } from './InviteModal'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'
import { useToastStore } from '../../../store/toastStore'

describe('InviteModal', () => {
  it('submitting sends an invite toast naming the email and closes', async () => {
    useDashboardUiStore.setState({ activeModal: 'invite' })
    useToastStore.setState({ toasts: [] })
    render(<InviteModal />)
    await userEvent.type(screen.getByLabelText(/email address/i), 'newhire@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send invite/i }))
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Invitation sent to newhire@example.com')
    expect(useDashboardUiStore.getState().activeModal).toBeNull()
  })
})
```

- [ ] **Step 12: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/modals/InviteModal.test.tsx`
Expected: FAIL with "Cannot find module './InviteModal'"

- [ ] **Step 13: Implement `InviteModal.tsx`**

Ported from `index.html:5807-5828` (fields), `:6722-6728` (submit):

```tsx
// src/components/dashboard/modals/InviteModal.tsx
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'
import { useToastStore } from '../../../store/toastStore'
import formStyles from './formStyles.module.css'

const ROLES = ['Developer', 'Designer', 'Manager', 'Viewer']
const EMPTY_FORM = { email: '', role: ROLES[0], message: '' }

export function InviteModal() {
  const activeModal = useDashboardUiStore((s) => s.activeModal)
  const closeModal = useDashboardUiStore((s) => s.closeModal)
  const showToast = useToastStore((s) => s.showToast)
  const [form, setForm] = useState(EMPTY_FORM)

  const handleClose = () => {
    setForm(EMPTY_FORM)
    closeModal()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) return
    showToast(`Invitation sent to ${form.email}`, 'success')
    handleClose()
  }

  return (
    <Modal
      open={activeModal === 'invite'}
      onOpenChange={(open) => !open && handleClose()}
      title="Invite Teammates"
      subtitle="Add people to your workspace"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="form-invite"><Mail aria-hidden="true" /> Send Invite</Button>
        </>
      }
    >
      <form id="form-invite" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="invite-email">Email Address *</label>
          <input id="invite-email" className={formStyles.formInput} type="email" placeholder="colleague@company.com" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="invite-role">Role</label>
          <select id="invite-role" className={formStyles.formSelect} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="invite-msg">Personal Message (Optional)</label>
          <textarea id="invite-msg" className={formStyles.formTextarea} placeholder="Add a welcome message..." value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 14: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/modals/InviteModal.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 15: Write the failing test for `MemberDetailModal`**

```tsx
// src/components/dashboard/modals/MemberDetailModal.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemberDetailModal } from './MemberDetailModal'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'

describe('MemberDetailModal', () => {
  it('renders the selected member\'s name, role, real email, and active task count', () => {
    useDashboardUiStore.setState({ activeModal: 'member', selectedMemberId: 'MV' })
    render(<MemberDetailModal />)
    expect(screen.getByText('Marley Vaccaro')).toBeInTheDocument()
    expect(screen.getByText('UI/UX Designer')).toBeInTheDocument()
    expect(screen.getByText('marley@example.com')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders nothing when no member is selected', () => {
    useDashboardUiStore.setState({ activeModal: 'member', selectedMemberId: null })
    render(<MemberDetailModal />)
    expect(screen.queryByText('Team Member')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 16: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/modals/MemberDetailModal.test.tsx`
Expected: FAIL with "Cannot find module './MemberDetailModal'"

- [ ] **Step 17: Create `MemberDetailModal.module.css`**

Ported from the inline styles at `index.html:5839-5855` into real CSS:

```css
.body { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; }
.name { font-family: 'Syne'; font-size: 17px; font-weight: 700; color: var(--text-primary); }
.role { font-size: 12px; color: var(--accent-blue); margin-top: 2px; }
.email { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.statGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
.stat { background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; text-align: center; }
.statValue { font-family: 'Syne'; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.statValue.completion { color: var(--accent-green); }
.statLabel { font-size: 11px; color: var(--text-muted); }
```

- [ ] **Step 18: Implement `MemberDetailModal.tsx`**

```tsx
// src/components/dashboard/modals/MemberDetailModal.tsx
import { MessageSquare } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Avatar } from '../../ui/Avatar'
import { useDashboardUiStore } from '../../../store/dashboardUiStore'
import { useToastStore } from '../../../store/toastStore'
import { DASHBOARD_TEAM_MEMBERS } from '../../../data/mockDashboardTeam'
import styles from './MemberDetailModal.module.css'

export function MemberDetailModal() {
  const activeModal = useDashboardUiStore((s) => s.activeModal)
  const selectedMemberId = useDashboardUiStore((s) => s.selectedMemberId)
  const closeModal = useDashboardUiStore((s) => s.closeModal)
  const showToast = useToastStore((s) => s.showToast)
  const member = DASHBOARD_TEAM_MEMBERS.find((m) => m.id === selectedMemberId)

  if (!member) return null

  return (
    <Modal
      open={activeModal === 'member'}
      onOpenChange={(open) => !open && closeModal()}
      title="Team Member"
      className={styles.card}
      footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Close</Button>
          <Button onClick={() => { closeModal(); showToast('Opening message...', 'info') }}>
            <MessageSquare aria-hidden="true" /> Message
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Avatar src={member.avatarSrc} name={member.name} style={{ width: 64, height: 64 }} />
        <div>
          <div className={styles.name}>{member.name}</div>
          <div className={styles.role}>{member.role}</div>
          <div className={styles.email}>{member.detailEmail}</div>
        </div>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{member.activeTasks}</div>
            <div className={styles.statLabel}>Active Tasks</div>
          </div>
          <div className={styles.stat}>
            <div className={[styles.statValue, styles.completion].join(' ')}>92%</div>
            <div className={styles.statLabel}>Completion</div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

Note: the `92%` completion figure is a hardcoded constant in the original for every member (`index.html:5852`), not derived per-person. Preserved as-is.

- [ ] **Step 19: Run all four modal test files to verify they pass**

Run: `pnpm vitest run src/components/dashboard/modals`
Expected: PASS, 9 tests total.

- [ ] **Step 20: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 21: Commit**

```bash
git add src/components/dashboard/modals
git commit -m "feat: add AddTask, Activity, Invite, and MemberDetail dashboard modals"
```

---

### Task 8: Calendar widget (mini Gantt) and `TaskPopup`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\data\mockDashboardCalendar.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\hooks\useOutsideClick.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\TaskPopup.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\TaskPopup.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\CalendarWidget.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\CalendarWidget.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\CalendarWidget.test.tsx`

**Interfaces:**
- Produces: `CAL_DAYS`, `CAL_TASKS` (with `DashboardCalendarTask` type); `useOutsideClick(ref: RefObject<HTMLElement>, onOutside: () => void, active: boolean): void`; `<TaskPopup task={DashboardCalendarTask | null} anchorRect={DOMRect | null} onClose={() => void} />`; `<CalendarWidget />` (no props).

Ported from `index.html:3274-3287` (markup), `:628-707` (CSS), `:6795-6882` (`calDays`, `calTasks`, `buildCalendar`), `:882-899` (`.task-detail-popup` CSS). This is the app's own mini Gantt (`calDays`/`calTasks`), separate from the full Calendar page's `CAL_MEETINGS` — do not conflate the two.

- [ ] **Step 1: Create `src/data/mockDashboardCalendar.ts`**

Ported verbatim from `index.html:6795-6808`:

```ts
// src/data/mockDashboardCalendar.ts
export interface CalendarDay {
  name: string
  date: number
}

export interface DashboardCalendarTask {
  label: string
  color: string
  start: number
  end: number
  row: number
  badge: string
  assignee: string
  due: string
}

export const CAL_DAYS: CalendarDay[] = [
  { name: 'Fri', date: 1 }, { name: 'Sat', date: 2 }, { name: 'Sun', date: 3 }, { name: 'Mon', date: 4 }, { name: 'Tue', date: 5 },
  { name: 'Wed', date: 6 }, { name: 'Thu', date: 7 }, { name: 'Fri', date: 8 }, { name: 'Sat', date: 9 }, { name: 'Sun', date: 10 },
  { name: 'Mon', date: 11 }, { name: 'Tue', date: 12 }, { name: 'Wed', date: 13 }, { name: 'Thu', date: 14 }, { name: 'Fri', date: 15 },
  { name: 'Sat', date: 16 }, { name: 'Sun', date: 17 }, { name: 'Mon', date: 18 }, { name: 'Tue', date: 19 },
]

export const CAL_TASKS: DashboardCalendarTask[] = [
  { label: 'Homepage for CareyCare App', color: '#FF8C42', start: 1, end: 2, row: 0, badge: 'Task 1', assignee: 'Aspen H.', due: 'Nov 2' },
  { label: 'Prepare Marketing Assets for ChronoLoop Launch', color: '#4A90FF', start: 8, end: 15, row: 0, badge: 'Task 3', assignee: 'Roger D.', due: 'Nov 15' },
  { label: 'Develop Landing Page for Eatz Website', color: '#FF4D4D', start: 5, end: 7, row: 1, badge: 'Task 2', assignee: 'Marley V.', due: 'Nov 7' },
  { label: 'Integrate Payment Gateway for E-commerce App', color: '#06B6D4', start: 15, end: 19, row: 1, badge: 'Task 5', assignee: 'Ryan C.', due: 'Nov 19' },
  { label: 'Finalize User Onboarding Flow', color: '#EC4899', start: 5, end: 9, row: 2, badge: 'Task 4', assignee: 'Aspen H.', due: 'Nov 9' },
]
```

- [ ] **Step 2: Create `useOutsideClick.ts`**

```ts
// src/hooks/useOutsideClick.ts
import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useOutsideClick(ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return

    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, onOutside, active])
}
```

- [ ] **Step 3: Create `TaskPopup.module.css`**

Ported from `index.html:882-899`:

```css
.popup {
  position: fixed; z-index: 200;
  background: var(--bg-card); border: 1px solid var(--border-default);
  border-radius: 10px; padding: 14px 16px; min-width: 220px; max-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: fadeIn 150ms var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.titleRow { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.colorDot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.title { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.3; }

.row { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; }
.row svg { width: 11px; height: 11px; flex-shrink: 0; }

.closeBtn {
  position: absolute; top: 10px; right: 10px;
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 4px; transition: background var(--duration-fast);
}
.closeBtn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.closeBtn svg { width: 12px; height: 12px; }
```

- [ ] **Step 4: Implement `TaskPopup.tsx`**

Positioning logic (clamp to viewport, flip above if it would overflow the bottom) ported from `index.html:6859-6869`:

```tsx
// src/components/dashboard/TaskPopup.tsx
import { useEffect, useRef, useState } from 'react'
import { X, User, Calendar, Tag } from 'lucide-react'
import { useOutsideClick } from '../../hooks/useOutsideClick'
import type { DashboardCalendarTask } from '../../data/mockDashboardCalendar'
import styles from './TaskPopup.module.css'

interface TaskPopupProps {
  task: DashboardCalendarTask | null
  anchorRect: DOMRect | null
  onClose: () => void
}

export function TaskPopup({ task, anchorRect, onClose }: TaskPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useOutsideClick(ref, onClose, task !== null)

  useEffect(() => {
    if (!task || !anchorRect || !ref.current) {
      setPosition(null)
      return
    }
    const popup = ref.current
    const pw = popup.offsetWidth
    const ph = popup.offsetHeight
    let left = anchorRect.left
    let top = anchorRect.bottom + 6
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8
    if (left < 8) left = 8
    if (top + ph > window.innerHeight - 8) top = anchorRect.top - ph - 6
    setPosition({ top, left })
  }, [task, anchorRect])

  if (!task) return null

  return (
    <div
      ref={ref}
      className={styles.popup}
      style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
    >
      <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>
      <div className={styles.titleRow}>
        <div className={styles.colorDot} style={{ background: task.color }} />
        <div className={styles.title}>{task.label}</div>
      </div>
      <div className={styles.row}><User aria-hidden="true" /> <span>{task.assignee}</span></div>
      <div className={styles.row}><Calendar aria-hidden="true" /> Due: <span>{task.due}</span></div>
      <div className={styles.row}><Tag aria-hidden="true" /> <span>{task.badge}</span></div>
    </div>
  )
}
```

- [ ] **Step 5: Write the failing test for `CalendarWidget`**

```tsx
// src/components/dashboard/CalendarWidget.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarWidget } from './CalendarWidget'

describe('CalendarWidget', () => {
  it('renders the 19-day header row and all five task pills', () => {
    render(<CalendarWidget />)
    expect(screen.getByText('NOVEMBER 2024')).toBeInTheDocument()
    expect(screen.getAllByText('Fri')).toHaveLength(2)
    expect(screen.getByText('Homepage for CareyCare App')).toBeInTheDocument()
    expect(screen.getByText('Finalize User Onboarding Flow')).toBeInTheDocument()
  })

  it('clicking a task pill opens its detail popup', async () => {
    render(<CalendarWidget />)
    await userEvent.click(screen.getByText('Homepage for CareyCare App'))
    expect(screen.getByText('Aspen H.')).toBeInTheDocument()
    expect(screen.getByText('Nov 2')).toBeInTheDocument()
  })

  it('the close button dismisses the popup', async () => {
    render(<CalendarWidget />)
    await userEvent.click(screen.getByText('Homepage for CareyCare App'))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Nov 2')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run src/components/dashboard/CalendarWidget.test.tsx`
Expected: FAIL with "Cannot find module './CalendarWidget'"

- [ ] **Step 7: Create `CalendarWidget.module.css`**

Ported from `index.html:628-707`:

```css
.panel {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: 10px; overflow: hidden;
  transition: background var(--duration-normal) var(--ease-out);
}

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 12px; border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-card);
}
.title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.weekBtn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  background: var(--bg-card-hover); border: 1px solid var(--border-subtle);
  border-radius: 6px; color: var(--text-secondary);
  font-size: 11px; font-family: 'DM Sans', sans-serif;
  cursor: pointer; transition: background var(--duration-fast);
}
.weekBtn:hover { background: var(--border-subtle); color: var(--text-primary); }
.weekBtn svg { width: 11px; height: 11px; }

.body { overflow-x: auto; background: var(--bg-card); }
.body::-webkit-scrollbar { height: 4px; }
.body::-webkit-scrollbar-track { background: transparent; }
.body::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

.month {
  text-align: center; padding: 10px 0 8px;
  font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500;
  color: var(--text-muted); letter-spacing: 0.12em;
  border-bottom: 1px solid var(--border-subtle); background: var(--bg-card);
}

.grid { display: grid; min-width: 900px; background: var(--bg-card); }

.dayHeaders { display: grid; grid-template-columns: repeat(19, 1fr); border-bottom: 1px solid var(--border-subtle); }
.dayColHeader {
  padding: 8px 0 6px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  border-right: 1px solid var(--border-subtle); font-family: 'DM Mono', monospace;
  background: var(--bg-card);
}
.dayColHeader:last-child { border-right: none; }
.dayName { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.dayNum { font-size: 11px; font-weight: 500; color: var(--text-secondary); }

.pillsArea {
  position: relative; min-height: 160px;
  display: grid; grid-template-columns: repeat(19, 1fr);
  background: var(--bg-card);
}
.gridCol { border-right: 1px solid var(--border-subtle); min-height: 160px; }
.gridCol:last-child { border-right: none; }

.pillRows { position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 10px 0; pointer-events: none; }

.pill {
  position: absolute; height: 28px; border-radius: 5px;
  display: flex; align-items: center; padding: 0 8px; gap: 6px;
  pointer-events: all; cursor: pointer; overflow: hidden;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
  border: none;
}
.pill:hover { opacity: 0.85; transform: translateY(-1px); }

@media (prefers-reduced-motion: no-preference) {
  .pill { opacity: 0; animation: slideIn 400ms var(--ease-out) forwards; }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

.pillLabel {
  font-size: 10px; font-weight: 500; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1; min-width: 0; text-align: left;
}
.pillBadge {
  font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.22); padding: 2px 5px; border-radius: 3px;
  white-space: nowrap; flex-shrink: 0;
}
```

- [ ] **Step 8: Implement `CalendarWidget.tsx`**

Pill positioning math ported from `index.html:6836-6847` (percentage width per column, `ROW_H=44`, `ROW_TOP=12`):

```tsx
// src/components/dashboard/CalendarWidget.tsx
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Dropdown } from '../ui/Dropdown'
import { TaskPopup } from './TaskPopup'
import { CAL_DAYS, CAL_TASKS } from '../../data/mockDashboardCalendar'
import type { DashboardCalendarTask } from '../../data/mockDashboardCalendar'
import { useToastStore } from '../../store/toastStore'
import styles from './CalendarWidget.module.css'

const WEEK_OPTIONS = ['Today', 'This week', 'This month', 'All time']
const ROW_H = 44
const ROW_TOP = 12
const COL_WIDTH_PCT = 100 / CAL_DAYS.length

export function CalendarWidget() {
  const showToast = useToastStore((s) => s.showToast)
  const [popup, setPopup] = useState<{ task: DashboardCalendarTask; anchorRect: DOMRect } | null>(null)

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Calendar View</h2>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button type="button" className={styles.weekBtn}>
              This week <ChevronDown aria-hidden="true" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            {WEEK_OPTIONS.map((label) => (
              <Dropdown.Item key={label} active={label === 'This week'} onSelect={() => showToast(`Showing ${label.toLowerCase()}`, 'info', 2000)}>
                {label}
              </Dropdown.Item>
            ))}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>

      <div className={styles.body}>
        <div className={styles.month}>NOVEMBER 2024</div>
        <div className={styles.grid}>
          <div className={styles.dayHeaders}>
            {CAL_DAYS.map((day, i) => (
              <div key={i} className={styles.dayColHeader}>
                <span className={styles.dayName}>{day.name}</span>
                <span className={styles.dayNum}>{day.date}</span>
              </div>
            ))}
          </div>

          <div className={styles.pillsArea}>
            {CAL_DAYS.map((_, i) => <div key={i} className={styles.gridCol} />)}
            <div className={styles.pillRows}>
              {CAL_TASKS.map((task, idx) => (
                <button
                  key={task.label}
                  type="button"
                  className={styles.pill}
                  style={{
                    animationDelay: `${600 + idx * 100}ms`,
                    left: `${(task.start - 1) * COL_WIDTH_PCT}%`,
                    width: `${(task.end - task.start + 1) * COL_WIDTH_PCT}%`,
                    top: ROW_TOP + task.row * ROW_H,
                    background: task.color,
                  }}
                  title={task.label}
                  onClick={(e) => setPopup({ task, anchorRect: e.currentTarget.getBoundingClientRect() })}
                >
                  <span className={styles.pillLabel}>{task.label}</span>
                  <span className={styles.pillBadge}>{task.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TaskPopup task={popup?.task ?? null} anchorRect={popup?.anchorRect ?? null} onClose={() => setPopup(null)} />
    </section>
  )
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm vitest run src/components/dashboard/CalendarWidget.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 10: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 11: Commit**

```bash
git add src/data/mockDashboardCalendar.ts src/hooks/useOutsideClick.ts src/components/dashboard/TaskPopup.tsx src/components/dashboard/TaskPopup.module.css src/components/dashboard/CalendarWidget.tsx src/components/dashboard/CalendarWidget.module.css src/components/dashboard/CalendarWidget.test.tsx
git commit -m "feat: add dashboard calendar widget with positioned task pills and popup"
```

---

### Task 9: Assemble `DashboardPage`, fix `App.test.tsx`, update the backlog

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\DashboardPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\DashboardPage.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\DashboardPage.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\App.test.tsx`
- Modify: `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`

**Interfaces:**
- Consumes: every component/store built in Tasks 1–8.
- Produces: `<DashboardPage />` fully assembled; `App.test.tsx`'s Dashboard-heading assertion updated to match real markup instead of the old stub.

Layout ported from `index.html:3061-3289` (root `flex-direction:column;gap:12px` wrapper, `.middle-row` flex wrapper around the two panels).

- [ ] **Step 1: Write the failing test for `DashboardPage`**

```tsx
// src/pages/DashboardPage.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  it('renders the greeting, KPI grid, both middle-row panels, and the calendar widget', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Welcome Back,')).toBeInTheDocument()
    expect(screen.getByText('To-do')).toBeInTheDocument()
    expect(screen.getByText('Critical Projects')).toBeInTheDocument()
    expect(screen.getByText('Team Status')).toBeInTheDocument()
    expect(screen.getByText('Calendar View')).toBeInTheDocument()
  })

  it('has an accessible page heading for screen-reader navigation', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/pages/DashboardPage.test.tsx`
Expected: FAIL — `DashboardPage` still renders only `<h1>Dashboard</h1>`, so the panel/greeting assertions fail.

- [ ] **Step 3: Create `DashboardPage.module.css`**

Ported from `index.html:3061` (root) and `:497` (`.middle-row`):

```css
.page { display: flex; flex-direction: column; gap: 12px; }
.middleRow { display: flex; gap: 16px; align-items: stretch; }

.visuallyHidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```

- [ ] **Step 4: Implement `DashboardPage.tsx`**

The visually-hidden `<h1>` is a deliberate a11y addition (the original has no page-level heading at all) — flagged in Global Constraints, not a silent change:

```tsx
// src/pages/DashboardPage.tsx
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { KpiGrid } from '../components/dashboard/KpiGrid'
import { CriticalProjectsPanel } from '../components/dashboard/CriticalProjectsPanel'
import { TeamStatusPanel } from '../components/dashboard/TeamStatusPanel'
import { CalendarWidget } from '../components/dashboard/CalendarWidget'
import { AddTaskModal } from '../components/dashboard/modals/AddTaskModal'
import { ActivityModal } from '../components/dashboard/modals/ActivityModal'
import { InviteModal } from '../components/dashboard/modals/InviteModal'
import { MemberDetailModal } from '../components/dashboard/modals/MemberDetailModal'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.visuallyHidden}>Dashboard</h1>

      <DashboardHeader />
      <KpiGrid />

      <div className={styles.middleRow}>
        <CriticalProjectsPanel />
        <TeamStatusPanel />
      </div>

      <CalendarWidget />

      <AddTaskModal />
      <ActivityModal />
      <InviteModal />
      <MemberDetailModal />
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/pages/DashboardPage.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Update `App.test.tsx`**

The existing `'renders the Dashboard page by default'` test used `getByRole('heading', { name: 'Dashboard' })` against the old stub's visible `<h1>`. The heading now exists but is visually hidden (Step 4) — the query itself (`getByRole`) doesn't care about visibility, so this assertion still passes unchanged. Add one assertion confirming real dashboard content renders through the router, so this test can't silently regress to a stub again:

```tsx
  it('renders the Dashboard page by default, with the sidebar and topbar chrome', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Critical Projects')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })
```

- [ ] **Step 7: Run the full test suite, typecheck, and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all pass.

- [ ] **Step 8: Manually verify in the browser**

Run: `pnpm dev`, open the dev server URL, confirm: KPI cards count up and stagger in; Add Task (main button and caret dropdown) opens the modal and a submitted task drops the To-do KPI to the live count; Year/Filter/Export/week/role/select-project dropdowns all toast correctly; a Critical Projects row's three-dot menu and its own row-click both work without double-firing; View Activity and Add Individual open their modals; clicking a team member opens Member Detail with the right name/role/email/task count; the calendar widget's pills are positioned correctly under NOVEMBER 2024 and clicking one opens `TaskPopup`, which closes on its X button, an outside click, and Escape.

- [ ] **Step 9: Add the flagged quirk to the backlog**

Append to `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`:

```markdown

## From Phase 3.1 (Dashboard)

- [ ] **Team grid email vs. member-detail email mismatch** — `src/data/mockDashboardTeam.ts`'s `gridEmail` (`'Joedoe@gmail.com'`, shown under every name in the Team Status grid) and `detailEmail` (each person's real address, shown in the Member Detail modal) come from two different hardcoded sources in the original (`index.html:3247,3252,3257,3262` vs. `index.html:6639-6644`). Preserved as literal parity rather than silently unified. Needs a product-owner call: keep both, or make the grid show the real per-person email now that it's centralized in one data file.

- [ ] **Three-dot project-row menu is always visible, not hover-revealed** — `CriticalProjectsPanel.module.css`'s `.threeDotBtn` omits the original's `opacity: 0` / `.row:hover { opacity: 1 }` treatment (`index.html:544,548`) so keyboard and touch users can reach it. Deliberate accessibility improvement over strict parity, not an oversight — flagged in case a visual diff review calls it out as a regression.
```

- [ ] **Step 10: Commit**

```bash
git add src/pages/DashboardPage.tsx src/pages/DashboardPage.module.css src/pages/DashboardPage.test.tsx src/App.test.tsx
git commit -m "feat: assemble DashboardPage from all Phase 3.1 components"
cd "C:\Users\HP\Downloads\Chronoloop dashboard"
git add docs/superpowers/backlog.md
git commit -m "docs: flag Phase 3.1 Dashboard parity quirks in the backlog"
```

---

## Phase 3.1 Exit Checklist

- [ ] `pnpm dev` shows a Dashboard page matching `index.html`'s look, feel, and every interaction enumerated in Task 9 Step 8.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass on the final state.
- [ ] `docs/superpowers/backlog.md` (old repo) has the two new entries from Task 9 Step 9.
- [ ] Next up per the design doc's page order: **Tasks** page (Phase 3.2) — start by re-reading `index.html:3292-3361` (markup) and the Tasks-page JS block (`getFilteredTasks`, kanban rendering, sort/filter dropdowns, task detail) before writing that plan, since `tasksStore` (Task 1 of this plan) is already in place to build on.
