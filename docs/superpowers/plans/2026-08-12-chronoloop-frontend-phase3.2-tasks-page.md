# ChronoLoop Frontend Rewrite — Phase 3.2 (Tasks Page: List/Board Views) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Tasks page's list view, board (kanban) view, and their shared toolbar (stat-chip filters, sort, cosmetic filter checkboxes, search) from `index.html` into the new React codebase, with full visual/behavioral parity — replacing `src/pages/TasksPage.tsx`'s current one-line stub.

**Scope note:** the Tasks page has two largely independent subsystems: the list/board views (this plan) and the task detail side panel (subtasks, comments, attachments, inline description editing — a separate Phase 3.3 plan, not covered here). Splitting them mirrors how Phase 3.1 (Dashboard) was itself nine tasks; combining both subsystems into one plan would produce an unreviewable single document. The Edit/Delete actions this plan wires up are shared with the detail panel (both call the same `tasksStore` actions and the same shared Add/Edit modal), so Phase 3.3 builds on this plan's infrastructure rather than duplicating it.

**Architecture:** `src/components/tasks/` holds page-specific components (`TasksPageHeader`, `TaskStatsRow`, `TasksToolbar`, `TaskListView`/`TaskGroup`/`TaskRow`, `TaskBoardView`/`TaskBoardCard`) plus small cross-view-shared pieces (`TaskTagList`, `TaskAssigneeBubble`). `tasksStore` (Phase 3.1) gains `updateTask`, `removeTask`/`restoreTask` (undo-capable delete), and `setTaskStatus`. The Add/Edit Task modal — currently `src/components/dashboard/modals/AddTaskModal.tsx`, owned by `dashboardUiStore` — relocates to `src/components/tasks/modals/AddTaskModal.tsx` under a new, page-agnostic `taskModalStore`, since both the Dashboard and the Tasks page open the same modal (Dashboard: create-only; Tasks page: create and edit). `activeTaskFilter`/`activeSort`/search-query state lives as local `useState` in `TasksPage`, passed down as props — the original uses global mutable JS variables for these, and nothing outside the Tasks page reads them, so page-scoped React state is the direct equivalent (matching how Phase 3.1's per-widget dropdown selections stayed local rather than promoted to a shared store).

**Tech Stack:** Existing stack (Vite, React 18, TypeScript strict, Zustand, CSS Modules, Vitest + RTL, Radix UI via the `Dropdown`/`Card`/`Avatar`/`Button` primitives, lucide-react). No new dependencies.

## Global Constraints

- **Location:** `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`. Never modify `C:\Users\HP\Downloads\Chronoloop dashboard\` itself (`index.html`, `design.md`, assets) — `docs/` in that repo is the shared planning-docs location and is fair game (Task 9 of this plan updates the backlog there, same as Phase 3.1 did).
- **Package manager:** pnpm. **TypeScript strict mode, no `any`.**
- **Pixel/behavior parity with `index.html`** is required at every cited line range below — with the deliberate exceptions listed here, which are not to be "fixed":
  - **Filter dropdown's checkboxes are cosmetic, matching Dashboard's Filter panel.** `getFilteredTasks()` (`index.html:6920-6931`) never reads the priority/project checkbox states — only `activeTaskFilter` (from stat chips) and the search query actually filter the list. `tasks-filter-apply`'s handler (`index.html:7444-7448`) just closes the dropdown, toasts, and re-renders — it does not apply the checkboxes as a filter. Preserve this: the checkboxes are decorative UI with no filtering effect, same as Phase 3.1's Dashboard Filter dropdown.
  - **The Sort dropdown's trigger button text never changes** — it's always the literal `Sort` (`index.html:3339-3341`), unlike Dashboard's Year dropdown, which does update its trigger label on selection. Only the selected `dd-item`'s `active` state changes (`index.html:7427-7436`). Do not apply the trigger-label-sync pattern here — it does not match this specific dropdown's original behavior. (The Filter dropdown's trigger is likewise always the literal `Filter`, with no active-tracking concept at all, since checkboxes are multi-select.)
  - **Status changes only happen via the list-row checkbox, and only toggle `done ↔ todo`.** `index.html:6990-7004`: clicking `.task-checkbox` sets `status` to `'done'` if it wasn't, or to `'todo'` (not back to whatever it was before, e.g. `'in-progress'` or `'overdue'`) if it was. `.detail-status-badge` has `cursor: pointer` in its CSS (`index.html:1045`) but **no click handler is ever attached to it** — it's dead, non-interactive styling in the original. Do not invent a status-change dropdown for it in this phase.
  - **Kanban board view has no drag-and-drop.** Cards are click-to-open only (`index.html:7092-7094`, deferred to Phase 3.3 since task detail isn't built yet — see Task 8 below for what this phase does instead); there's no reordering or cross-column dragging anywhere in the original JS.
  - **Row-level Edit/Delete action buttons are always visible, not hover-revealed** — same accessibility deviation as Phase 3.1's Critical-Projects three-dot menu (already flagged in `docs/superpowers/backlog.md`), applied consistently here. The original hides `.task-row-actions` until `:hover` (`index.html:974-975`); this port keeps them visible for keyboard/touch reachability.
  - **The Filter dropdown's project checkboxes are a fourth instance of the same literal 4-name project list already duplicated three times in the original itself** (`dd-selectproject`, the Add Task modal's project `<select>`, and this filter panel all separately hardcode `Web 3 App for Fxtrade` / `Healthydog Landing Page` / `Redesign of Website` / `ChronoLoop Launch`). Duplicating it a fourth time here matches the original's own structure — do not "fix" this into a shared constant; a real shared project list is deferred to the Projects page phase per the existing backlog entry.
- **Reuse Phase 1/2/3.1 primitives, don't re-style their chrome:** `Dropdown` for the Sort and Filter dropdowns (same composition pattern as every Phase 3.1 dropdown), `Card` where its base styling already matches (verify per-task, don't assume), `Avatar` (with its Phase 3.1 `style` prop) for assignee bubbles, `Button`/`Modal`/`useToastStore` as already established.
- **`AddTaskModal` relocation (Task 2) touches already-shipped, reviewed Phase 3.1 code.** After the move, `pnpm test` must show zero regressions in `DashboardHeader.test.tsx`, `DashboardPage.test.tsx`, or any other Phase 3.1 test — the Dashboard's create-a-task behavior must work identically to before, just routed through the new shared store instead of `dashboardUiStore`.
- **Verification gate for the whole phase:** `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass after every task.

---

### Task 1: Extend `tasksStore` (update/delete/status) + shared task-formatting helpers

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\tasksStore.ts`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\tasksStore.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\lib\taskFormatters.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\lib\taskFormatters.test.ts`

**Interfaces:**
- Consumes: existing `Task`, `NewTaskInput`, `TaskStatus` types (`src/types/task.ts`, Phase 3.1).
- Produces: `useTasksStore` gains `updateTask(id: number, input: NewTaskInput): void`, `removeTask(id: number): { task: Task; index: number } | null`, `restoreTask(task: Task, index: number): void`, `setTaskStatus(id: number, status: 'todo' | 'done'): void`. New `src/lib/taskFormatters.ts` exports `STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dotColor: string }>`, `PRIORITY_ORDER: Record<TaskPriority, number>`, `STATUS_ORDER: Record<TaskStatus, number>`, `getDueClass(due: string, status: TaskStatus): 'normal' | 'soon' | 'overdue-chip'`, `formatDue(due: string): string` — later tasks (5, 7, 8) import these directly rather than redefining them. (Per-priority icon *components* are a separate concern from this data-only module — `TaskRow.tsx` in Task 7 defines its own local `PRIORITY_ICON` map of lucide-react components, since a "which icon component to render" mapping doesn't belong in a formatting-helpers module that has no React/JSX dependency. Don't add an icon export here — keep this file JSX-free.)

Ported from `index.html:6910-6945` (`statusConfig`, `priorityOrder`, `statusOrder`, `getDueClass`, `formatDue`), `:6689-6707` (update path within the existing submit handler — Task 2 wires the actual edit-mode UI, this task only adds the store action), `:7173-7208` (`deleteTaskWithUndo`'s splice/restore semantics), `:6990-7004` (checkbox status toggle).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/store/tasksStore.test.tsx — ADD to the existing describe block, do not remove existing tests
import { MOCK_TASKS } from '../data/mockTasks'

// ... (existing tests stay as-is) ...

describe('tasksStore — Phase 3.2 extensions', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
  })

  it('updateTask replaces the matching task\'s editable fields in place, preserving id/status/tags/subtasks/comments/attachments', () => {
    const before = useTasksStore.getState().tasks.find((t) => t.id === 1)!
    useTasksStore.getState().updateTask(1, {
      title: 'Renamed task',
      project: 'ChronoLoop Launch',
      assignee: 'RC',
      due: '2024-12-25',
      priority: 'low',
      description: 'updated description',
    })
    const after = useTasksStore.getState().tasks.find((t) => t.id === 1)!
    expect(after).toMatchObject({
      id: 1,
      title: 'Renamed task',
      project: 'ChronoLoop Launch',
      assignee: 'RC',
      aColor: 'linear-gradient(135deg,#00D4AA,#059669)',
      due: '2024-12-25',
      priority: 'low',
      description: 'updated description',
      status: before.status,
      tags: before.tags,
      subtasks: before.subtasks,
    })
  })

  it('removeTask removes the task and returns it with its original index; restoreTask re-inserts it at that index', () => {
    const before = useTasksStore.getState().tasks
    const removed = useTasksStore.getState().removeTask(3)
    expect(removed?.task.id).toBe(3)
    expect(removed?.index).toBe(2)
    expect(useTasksStore.getState().tasks.find((t) => t.id === 3)).toBeUndefined()
    expect(useTasksStore.getState().tasks).toHaveLength(before.length - 1)

    useTasksStore.getState().restoreTask(removed!.task, removed!.index)
    expect(useTasksStore.getState().tasks).toHaveLength(before.length)
    expect(useTasksStore.getState().tasks[2].id).toBe(3)
  })

  it('removeTask returns null for an id that does not exist', () => {
    expect(useTasksStore.getState().removeTask(9999)).toBeNull()
  })

  it('setTaskStatus toggles a task to done or back to todo, never to any other prior status', () => {
    useTasksStore.getState().setTaskStatus(1, 'done')
    expect(useTasksStore.getState().tasks.find((t) => t.id === 1)?.status).toBe('done')
    useTasksStore.getState().setTaskStatus(1, 'todo')
    expect(useTasksStore.getState().tasks.find((t) => t.id === 1)?.status).toBe('todo')
  })
})
```

```ts
// src/lib/taskFormatters.test.ts
import { describe, it, expect } from 'vitest'
import { getDueClass, formatDue, STATUS_CONFIG, PRIORITY_ORDER, STATUS_ORDER } from './taskFormatters'

describe('taskFormatters', () => {
  it('getDueClass returns "normal" for done tasks regardless of due date', () => {
    expect(getDueClass('2020-01-01', 'done')).toBe('normal')
  })

  it('getDueClass returns "overdue-chip" for a past due date on a non-done task', () => {
    expect(getDueClass('2000-01-01', 'todo')).toBe('overdue-chip')
  })

  it('getDueClass returns "soon" for a due date within 3 days', () => {
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    expect(getDueClass(soon, 'todo')).toBe('soon')
  })

  it('formatDue renders a short month-day string', () => {
    expect(formatDue('2024-11-02')).toBe('Nov 2')
  })

  it('STATUS_CONFIG has all four statuses with the original labels', () => {
    expect(STATUS_CONFIG.todo.label).toBe('To Do')
    expect(STATUS_CONFIG['in-progress'].label).toBe('In Progress')
    expect(STATUS_CONFIG.done.label).toBe('Done')
    expect(STATUS_CONFIG.overdue.label).toBe('Overdue')
  })

  it('PRIORITY_ORDER and STATUS_ORDER match the original sort weights', () => {
    expect(PRIORITY_ORDER).toEqual({ high: 0, medium: 1, low: 2 })
    expect(STATUS_ORDER).toEqual({ overdue: 0, 'in-progress': 1, todo: 2, done: 3 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/store/tasksStore.test.tsx src/lib/taskFormatters.test.ts`
Expected: FAIL — new tests reference functions/exports that don't exist yet.

- [ ] **Step 3: Create `src/lib/taskFormatters.ts`**

```ts
// src/lib/taskFormatters.ts
import type { TaskPriority, TaskStatus } from '../types/task'

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dotColor: string }> = {
  todo: { label: 'To Do', color: '#4A90FF', dotColor: 'var(--accent-blue)' },
  'in-progress': { label: 'In Progress', color: '#EAB308', dotColor: 'var(--accent-yellow)' },
  done: { label: 'Done', color: '#22C55E', dotColor: 'var(--accent-green)' },
  overdue: { label: 'Overdue', color: '#FF4D4D', dotColor: 'var(--accent-red)' },
}

export const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }
export const STATUS_ORDER: Record<TaskStatus, number> = { overdue: 0, 'in-progress': 1, todo: 2, done: 3 }

export function getDueClass(due: string, status: TaskStatus): 'normal' | 'soon' | 'overdue-chip' {
  if (status === 'done') return 'normal'
  const diffDays = (new Date(due).getTime() - Date.now()) / 86400000
  if (diffDays < 0) return 'overdue-chip'
  if (diffDays <= 3) return 'soon'
  return 'normal'
}

export function formatDue(due: string): string {
  return new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
```

- [ ] **Step 4: Extend `src/store/tasksStore.ts`**

```ts
// src/store/tasksStore.ts — modify the existing file
import { create } from 'zustand'
import type { NewTaskInput, Task, TaskStatus } from '../types/task'
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
  updateTask: (id: number, input: NewTaskInput) => void
  removeTask: (id: number) => { task: Task; index: number } | null
  restoreTask: (task: Task, index: number) => void
  setTaskStatus: (id: number, status: 'todo' | 'done') => void
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
  updateTask: (id, input) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              title: input.title,
              project: input.project,
              assignee: input.assignee,
              aColor: ASSIGNEE_COLOR[input.assignee] ?? task.aColor,
              due: input.due,
              priority: input.priority,
              description: input.description,
            }
          : task,
      ),
    }))
  },
  removeTask: (id) => {
    const { tasks } = get()
    const index = tasks.findIndex((t) => t.id === id)
    if (index < 0) return null
    const task = tasks[index]
    set({ tasks: [...tasks.slice(0, index), ...tasks.slice(index + 1)] })
    return { task, index }
  },
  restoreTask: (task, index) => {
    set((state) => {
      const next = [...state.tasks]
      next.splice(index, 0, task)
      return { tasks: next }
    })
  },
  setTaskStatus: (id, status) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, status: status as TaskStatus } : task)),
    }))
  },
}))
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/store/tasksStore.test.tsx src/lib/taskFormatters.test.ts`
Expected: PASS, all tests (existing + new).

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/store/tasksStore.ts src/store/tasksStore.test.tsx src/lib/taskFormatters.ts src/lib/taskFormatters.test.ts
git commit -m "feat: extend tasksStore with update/delete/status actions, add shared task-formatting helpers"
```

---

### Task 2: Relocate `AddTaskModal` to a shared location; add `taskModalStore` and edit-mode support

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\taskModalStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\taskModalStore.test.tsx`
- Move + modify: `src\components\dashboard\modals\AddTaskModal.tsx` → `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\modals\AddTaskModal.tsx`
- Move: `src\components\dashboard\modals\AddTaskModal.test.tsx` → `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\modals\AddTaskModal.test.tsx` (extend with edit-mode tests)
- Move: `src\components\dashboard\modals\formStyles.module.css` → `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\modals\formStyles.module.css`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\modals\InviteModal.tsx` (its `import formStyles from './formStyles.module.css'` must now point to the new shared location — see Step 2)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\DashboardHeader.tsx` (Add Task split button now calls `useTaskModalStore().openCreate()` instead of `useDashboardUiStore().openAddTask()`)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\dashboard\DashboardHeader.test.tsx` (update the assertion that checks the Add Task button opens the modal)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\dashboardUiStore.ts` (remove `'addTask'` from the `DashboardModal` union and the `openAddTask` action — it's no longer this store's concern)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\dashboardUiStore.test.tsx` (remove the now-invalid `openAddTask` test)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\DashboardPage.tsx` (import `AddTaskModal` from its new path)

**Interfaces:**
- Produces: `useTaskModalStore` exposing `{ isOpen: boolean; editingTaskId: number | null; openCreate: () => void; openEdit: (id: number) => void; close: () => void }`. `AddTaskModal` (relocated) now reads this store instead of `dashboardUiStore`, and — when `editingTaskId` is not null — pre-fills its form from `useTasksStore`, shows "Edit Task" / "Update the task details" / a "Save Changes" submit button, and calls `updateTask` instead of `addTask` on submit.
- Consumes: `useTasksStore` (Task 1's `updateTask`), existing `Modal`/`Button` primitives, `useToastStore`.

Ported from `index.html:7147-7168` (`openEditModal` — pre-fill + title/subtitle/button swap), `:7127-7141` (`_onCloseAddTaskModal` — reset back to create-mode on close, including re-selecting the Medium priority pill), `:6689-6707` (the update branch of the original's single submit handler, which this plan splits into `addTask` (Phase 3.1) vs `updateTask` (Task 1) — the create/edit UI branch lives here).

- [ ] **Step 1: Write the failing test for `taskModalStore`**

```tsx
// src/store/taskModalStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskModalStore } from './taskModalStore'

describe('taskModalStore', () => {
  beforeEach(() => {
    useTaskModalStore.setState({ isOpen: false, editingTaskId: null })
  })

  it('openCreate opens the modal with no editing task', () => {
    useTaskModalStore.getState().openCreate()
    expect(useTaskModalStore.getState()).toMatchObject({ isOpen: true, editingTaskId: null })
  })

  it('openEdit opens the modal with the given task id', () => {
    useTaskModalStore.getState().openEdit(7)
    expect(useTaskModalStore.getState()).toMatchObject({ isOpen: true, editingTaskId: 7 })
  })

  it('close resets both isOpen and editingTaskId', () => {
    useTaskModalStore.getState().openEdit(7)
    useTaskModalStore.getState().close()
    expect(useTaskModalStore.getState()).toMatchObject({ isOpen: false, editingTaskId: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails, then create `src/store/taskModalStore.ts`**

Run: `pnpm vitest run src/store/taskModalStore.test.tsx` — expect FAIL ("Cannot find module").

```ts
// src/store/taskModalStore.ts
import { create } from 'zustand'

interface TaskModalState {
  isOpen: boolean
  editingTaskId: number | null
  openCreate: () => void
  openEdit: (id: number) => void
  close: () => void
}

export const useTaskModalStore = create<TaskModalState>((set) => ({
  isOpen: false,
  editingTaskId: null,
  openCreate: () => set({ isOpen: true, editingTaskId: null }),
  openEdit: (id) => set({ isOpen: true, editingTaskId: id }),
  close: () => set({ isOpen: false, editingTaskId: null }),
}))
```

Run: `pnpm vitest run src/store/taskModalStore.test.tsx` — expect PASS, 3 tests.

- [ ] **Step 3: Move `formStyles.module.css` and `InviteModal.tsx`'s import**

```bash
mkdir -p src/components/tasks/modals
git mv src/components/dashboard/modals/formStyles.module.css src/components/tasks/modals/formStyles.module.css
```

`InviteModal.tsx` stays in `src/components/dashboard/modals/` (it's still Dashboard-only — only the Add Task modal is shared) but its CSS import path must follow the file:

```tsx
// src/components/dashboard/modals/InviteModal.tsx — only this one import line changes
import formStyles from '../../tasks/modals/formStyles.module.css'
```

- [ ] **Step 4: Move and rewrite `AddTaskModal.tsx`**

```bash
git mv src/components/dashboard/modals/AddTaskModal.tsx src/components/tasks/modals/AddTaskModal.tsx
git mv src/components/dashboard/modals/AddTaskModal.test.tsx src/components/tasks/modals/AddTaskModal.test.tsx
```

Rewrite the moved file to read `taskModalStore` instead of `dashboardUiStore`, and to branch on `editingTaskId` for create-vs-edit presentation and submit behavior. The `PROJECTS`/`ASSIGNEES` constants, the `data-selected` priority-pill pattern, and the form field JSX are otherwise unchanged from the Phase 3.1 version:

```tsx
// src/components/tasks/modals/AddTaskModal.tsx
import { useEffect, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useTaskModalStore } from '../../../store/taskModalStore'
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
const ASSIGNEE_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(ASSIGNEES).map(([name, code]) => [code, name]),
)

const EMPTY_FORM = { name: '', project: PROJECTS[0], assigneeName: 'Aspen Herwitz', due: '', priority: 'medium' as TaskPriority, description: '' }

export function AddTaskModal() {
  const isOpen = useTaskModalStore((s) => s.isOpen)
  const editingTaskId = useTaskModalStore((s) => s.editingTaskId)
  const closeModal = useTaskModalStore((s) => s.close)
  const tasks = useTasksStore((s) => s.tasks)
  const addTask = useTasksStore((s) => s.addTask)
  const updateTask = useTasksStore((s) => s.updateTask)
  const showToast = useToastStore((s) => s.showToast)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!isOpen) return
    if (editingTaskId === null) {
      setForm(EMPTY_FORM)
      return
    }
    const task = tasks.find((t) => t.id === editingTaskId)
    if (!task) return
    setForm({
      name: task.title,
      project: task.project,
      assigneeName: ASSIGNEE_NAME_BY_CODE[task.assignee] ?? task.assignee,
      due: task.due,
      priority: task.priority,
      description: task.description,
    })
    // Only re-derive the form when the modal opens or which task it targets changes —
    // not on every `tasks` array identity change, which would clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTaskId])

  const handleClose = () => {
    setForm(EMPTY_FORM)
    closeModal()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const due = form.due || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const assignee = ASSIGNEES[form.assigneeName] ?? form.assigneeName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()

    if (editingTaskId !== null) {
      updateTask(editingTaskId, { title: name, project: form.project, assignee, due, priority: form.priority, description: form.description.trim() })
      showToast('Task updated!', 'success')
    } else {
      addTask({ title: name, project: form.project, assignee, due, priority: form.priority, description: form.description.trim() })
      showToast(`"${name.slice(0, 30)}" added to To Do!`, 'success')
    }
    handleClose()
  }

  const isEditing = editingTaskId !== null

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title={isEditing ? 'Edit Task' : 'Add New Task'}
      subtitle={isEditing ? 'Update the task details' : 'Fill in the details to create a task'}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="form-addtask">
            {isEditing ? <><Save aria-hidden="true" /> Save Changes</> : <><Plus aria-hidden="true" /> Add Task</>}
          </Button>
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

- [ ] **Step 5: Add edit-mode tests to the moved `AddTaskModal.test.tsx`**

Update its imports to `useTaskModalStore` and add:

```tsx
  it('opens pre-filled when editing an existing task, and calls updateTask (not addTask) on submit', async () => {
    useTaskModalStore.setState({ isOpen: true, editingTaskId: 1 })
    render(<AddTaskModal />)
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
    expect(screen.getByLabelText(/task name/i)).toHaveValue('Homepage for CareyCare App')
    await userEvent.clear(screen.getByLabelText(/task name/i))
    await userEvent.type(screen.getByLabelText(/task name/i), 'Renamed')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(useTasksStore.getState().tasks.find((t) => t.id === 1)?.title).toBe('Renamed')
    expect(useTasksStore.getState().tasks).toHaveLength(15)
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Task updated!')
  })
```

(Keep every existing test from Phase 3.1's version, updating only the `useDashboardUiStore` references to `useTaskModalStore` and adjusting `activeModal: 'addTask'` setup to `isOpen: true, editingTaskId: null`.)

- [ ] **Step 6: Update `dashboardUiStore` — remove `addTask` from its concerns**

```ts
// src/store/dashboardUiStore.ts
export type DashboardModal = 'activity' | 'invite' | 'member' | null
// remove 'addTask' from the union, remove the openAddTask action and its implementation
```

Remove the corresponding `openAddTask` test from `dashboardUiStore.test.tsx`.

- [ ] **Step 7: Update `DashboardHeader.tsx` and its test**

```tsx
// src/components/dashboard/DashboardHeader.tsx — two changes
import { useTaskModalStore } from '../../store/taskModalStore'
// ... inside the component:
const openCreateTask = useTaskModalStore((s) => s.openCreate)
// ... the split-button main action and the 'task' caret item both now call openCreateTask() instead of the old openAddTask
```

Update `DashboardHeader.test.tsx`'s equivalent test to assert against `useTaskModalStore.getState().isOpen`/`editingTaskId` instead of `useDashboardUiStore`.

- [ ] **Step 8: Update `DashboardPage.tsx`'s import path**

```tsx
// src/pages/DashboardPage.tsx
import { AddTaskModal } from '../components/tasks/modals/AddTaskModal'
```

- [ ] **Step 9: Run the full suite to confirm zero regressions**

Run: `pnpm vitest run` (full suite, not scoped)
Expected: PASS — every pre-existing Phase 3.1 test still passes unchanged in behavior, plus the new `taskModalStore` and edit-mode tests.

- [ ] **Step 10: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: relocate AddTaskModal to a shared tasks/ location, add taskModalStore with edit-mode support"
```

---

### Task 3: Delete-with-undo toast mechanism

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\hooks\useDeleteWithUndo.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\hooks\useDeleteWithUndo.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\toastStore.ts`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\toastStore.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Toast.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Toast.module.css`

**Interfaces:**
- Produces: `useToastStore` gains an optional `action?: { label: string; onClick: () => void }` field on `ToastItem`, settable via a new `showActionToast(message: string, action: { label: string; onClick: () => void }, durationMs?: number): string` (returns the toast id, so callers can update its message text later — needed for the live countdown). `Toast` renders the action button when present. New `useDeleteWithUndo<T>(remove: (id: number) => { task: T; index: number } | null, restore: (item: T, index: number) => void)` hook returns `deleteWithUndo(id: number, label: string): void`, which removes immediately, shows a 5-second live-countdown toast with an Undo button, and restores on click or does nothing further once the countdown reaches zero (the removal already happened; the toast is just informational + undo, matching the original's actual behavior — see the note in Step 1 below on that behavior, which is a Global Constraints-relevant point).

Ported from `index.html:7173-7208` (`deleteTaskWithUndo` — immediate splice, then a manually-built toast element with a live `setInterval` countdown and an Undo button, not the standard `showToast()` path).

**Important semantic note (verify before writing tests):** the original deletes the task from `tasksData` *immediately* on click (`tasksData.splice(idx, 1)[0]`, `index.html:7176`) — the 5-second countdown is not a "you have 5 seconds to cancel before it's deleted," it's "the task is already gone; you have 5 seconds to click Undo before this toast disappears" (after 5s the toast just fades out — nothing further happens to the data, it was already removed). Undo re-inserts at the original index. This distinction matters: `useDeleteWithUndo`'s `remove` call must fire synchronously, not after a timer.

- [ ] **Step 1: Write the failing test for the toast store's action-toast support**

```tsx
// src/store/toastStore.test.tsx — ADD to existing describe block
describe('toastStore — action toasts', () => {
  it('showActionToast adds a toast carrying an action and returns its id', () => {
    const onClick = () => {}
    const id = useToastStore.getState().showActionToast('Deleting…', { label: 'Undo', onClick })
    const toast = useToastStore.getState().toasts.find((t) => t.id === id)
    expect(toast?.message).toBe('Deleting…')
    expect(toast?.action?.label).toBe('Undo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/store/toastStore.test.tsx`
Expected: FAIL — `showActionToast` doesn't exist.

- [ ] **Step 3: Extend `toastStore.ts`**

```ts
// src/store/toastStore.ts
import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
  action?: ToastAction
}

interface ToastState {
  toasts: ToastItem[]
  showToast: (message: string, variant?: ToastVariant, duration?: number) => string
  showActionToast: (message: string, action: ToastAction, duration?: number) => string
  updateToastMessage: (id: string, message: string) => void
  dismissToast: (id: string) => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, variant = 'info', duration = 3000) => {
    const id = `toast-${nextId++}`
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, duration }] }))
    return id
  },
  showActionToast: (message, action, duration) => {
    const id = `toast-${nextId++}`
    set((state) => ({ toasts: [...state.toasts, { id, message, variant: 'error', duration, action }] }))
    return id
  },
  updateToastMessage: (id, message) => {
    set((state) => ({ toasts: state.toasts.map((t) => (t.id === id ? { ...t, message } : t)) }))
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))
```

Note: `showToast`'s return type changes from `void` to `string`. Confirm this doesn't break any existing caller — every current call site discards the return value, so this is additive.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/store/toastStore.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `Toast`'s action-button rendering**

```tsx
// src/components/ui/Toast.tsx doesn't currently have its own test file (it's exercised via ToastProvider.test.tsx) —
// add a case to ToastProvider.test.tsx instead:
  it('renders an action button and calls its onClick handler when a toast carries an action', async () => {
    const onClick = vi.fn()
    render(<ToastProvider />)
    act(() => {
      useToastStore.getState().showActionToast('Task deleted', { label: 'Undo', onClick })
    })
    const undoBtn = await screen.findByRole('button', { name: 'Undo' })
    await userEvent.click(undoBtn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/ToastProvider.test.tsx`
Expected: FAIL — no action button rendered yet.

- [ ] **Step 7: Update `Toast.tsx` to render the action button**

Read the current `Toast.tsx` implementation first to match its existing structure (icon selection, close button, etc.) — add an action button between the message and the close button when `toast.action` is present:

```tsx
// src/components/ui/Toast.tsx — add near the existing toast-text span
{toast.action ? (
  <button type="button" className={styles.actionBtn} onClick={toast.action.onClick}>
    {toast.action.label}
  </button>
) : null}
```

- [ ] **Step 8: Add `.actionBtn` to `Toast.module.css`**

Ported from `index.html:7184`'s inline `.btn-undo-del` styles:

```css
.actionBtn {
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 6px;
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/ToastProvider.test.tsx`
Expected: PASS.

- [ ] **Step 10: Write the failing test for `useDeleteWithUndo`**

```tsx
// src/hooks/useDeleteWithUndo.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeleteWithUndo } from './useDeleteWithUndo'
import { useToastStore } from '../store/toastStore'

describe('useDeleteWithUndo', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('calls remove immediately and shows an action toast', () => {
    const remove = vi.fn().mockReturnValue({ task: { id: 1, title: 'Sample task' }, index: 0 })
    const restore = vi.fn()
    const { result } = renderHook(() => useDeleteWithUndo(remove, restore))

    act(() => result.current.deleteWithUndo(1, 'Sample task'))

    expect(remove).toHaveBeenCalledWith(1)
    const toast = useToastStore.getState().toasts.at(-1)
    expect(toast?.action?.label).toBe('Undo')
  })

  it('clicking Undo calls restore with the removed task and its original index, and dismisses the toast', () => {
    const removed = { task: { id: 1, title: 'Sample task' }, index: 2 }
    const remove = vi.fn().mockReturnValue(removed)
    const restore = vi.fn()
    const { result } = renderHook(() => useDeleteWithUndo(remove, restore))

    act(() => result.current.deleteWithUndo(1, 'Sample task'))
    const toastId = useToastStore.getState().toasts.at(-1)!.id
    act(() => useToastStore.getState().toasts.find((t) => t.id === toastId)?.action?.onClick())

    expect(restore).toHaveBeenCalledWith(removed.task, removed.index)
    expect(useToastStore.getState().toasts.find((t) => t.id === toastId)).toBeUndefined()
  })

  it('does nothing if remove returns null (task already gone)', () => {
    const remove = vi.fn().mockReturnValue(null)
    const restore = vi.fn()
    const { result } = renderHook(() => useDeleteWithUndo(remove, restore))

    act(() => result.current.deleteWithUndo(999, 'Ghost task'))

    expect(useToastStore.getState().toasts).toHaveLength(0)
    expect(restore).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 11: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/useDeleteWithUndo.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 12: Implement `useDeleteWithUndo.ts`**

Ported from `index.html:7173-7208` — the live countdown text (`"…" deletes in Ns`) is preserved via `updateToastMessage`:

```ts
// src/hooks/useDeleteWithUndo.ts
import { useCallback } from 'react'
import { useToastStore } from '../store/toastStore'

export function useDeleteWithUndo<T>(
  remove: (id: number) => { task: T; index: number } | null,
  restore: (item: T, index: number) => void,
) {
  const showActionToast = useToastStore((s) => s.showActionToast)
  const updateToastMessage = useToastStore((s) => s.updateToastMessage)
  const dismissToast = useToastStore((s) => s.dismissToast)

  const deleteWithUndo = useCallback(
    (id: number, label: string) => {
      const removed = remove(id)
      if (!removed) return

      const truncated = label.length > 22 ? `${label.slice(0, 22)}…` : label
      let secondsLeft = 5
      const toastId = showActionToast(`"${truncated}" deletes in ${secondsLeft}s`, {
        label: 'Undo',
        onClick: () => {
          clearInterval(interval)
          restore(removed.task, removed.index)
          dismissToast(toastId)
        },
      })

      const interval = setInterval(() => {
        secondsLeft -= 1
        if (secondsLeft <= 0) {
          clearInterval(interval)
          dismissToast(toastId)
          return
        }
        updateToastMessage(toastId, `"${truncated}" deletes in ${secondsLeft}s`)
      }, 1000)
    },
    [remove, restore, showActionToast, updateToastMessage, dismissToast],
  )

  return { deleteWithUndo }
}
```

- [ ] **Step 13: Run tests to verify they pass**

Run: `pnpm vitest run src/hooks/useDeleteWithUndo.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 14: Run the full suite, typecheck, lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`

- [ ] **Step 15: Commit**

```bash
git add src/hooks/useDeleteWithUndo.ts src/hooks/useDeleteWithUndo.test.tsx src/store/toastStore.ts src/store/toastStore.test.tsx src/components/ui/Toast.tsx src/components/ui/Toast.module.css src/components/ui/ToastProvider.test.tsx
git commit -m "feat: add action-toast support and a delete-with-undo hook"
```

---

### Task 4: Shared cross-view components — `TaskTagList`, `TaskAssigneeBubble`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskTagList.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskTagList.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskTagList.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskAssigneeBubble.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskAssigneeBubble.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskAssigneeBubble.test.tsx`

**Interfaces:**
- Produces: `<TaskTagList tags={string[]} max={2} />` (renders up to `max` `.task-tag` chips, identical markup in both list and board views — `index.html:6970 /*→7036*/` list row and `:7075` board card both render `t.tags.slice(0,2)`). `<TaskAssigneeBubble assignee={string} avatarSrc={string | undefined} color={string} size={26 | 22} />` (wraps `Avatar` with the Phase 3.1 `style` prop for sizing, a new `fallbackStyle` prop — added in Step 6 below — for the per-assignee gradient, and a border-ring the base `Avatar` primitive doesn't have — see CSS below).

Both list-row and board-card assignee bubbles differ from `index.html`'s `AVATAR_MAP` lookup (Tasks page module data doesn't include avatar images for the mock `tasksData` set — verify: none of the assignee 2-letter codes AS/RD/MV/RC appearing in `MOCK_TASKS` have a corresponding entry checked here, so this component always falls through to the gradient+initials path in practice for this phase's data, exactly like the original: `AVATAR_MAP[t.assignee] ? <img> : <div style="background:aColor">initials</div>` at `index.html:7038,7081` — `Avatar`'s own `src`/`name` fallback already reproduces this, so no extra branching is needed in this component; just pass `src={avatarSrc}` through and let `Avatar` decide).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/tasks/TaskTagList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskTagList } from './TaskTagList'

describe('TaskTagList', () => {
  it('renders up to 2 tags by default', () => {
    render(<TaskTagList tags={['Frontend', 'Design', 'Bug']} />)
    expect(screen.getByText('Frontend')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.queryByText('Bug')).not.toBeInTheDocument()
  })

  it('renders nothing when there are no tags', () => {
    const { container } = render(<TaskTagList tags={[]} />)
    expect(container.firstChild?.textContent).toBe('')
  })
})
```

```tsx
// src/components/tasks/TaskAssigneeBubble.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskAssigneeBubble } from './TaskAssigneeBubble'

describe('TaskAssigneeBubble', () => {
  it('renders initials-on-gradient fallback when no avatar image is given', () => {
    render(<TaskAssigneeBubble assignee="AS" avatarSrc={undefined} color="linear-gradient(135deg,#4A90FF,#2563eb)" size={26} />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('applies the requested size', () => {
    render(<TaskAssigneeBubble assignee="AS" avatarSrc={undefined} color="linear-gradient(135deg,#4A90FF,#2563eb)" size={22} />)
    expect(screen.getByTitle('AS')).toHaveStyle({ width: '22px', height: '22px' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/tasks/TaskTagList.test.tsx src/components/tasks/TaskAssigneeBubble.test.tsx`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Create `TaskTagList.module.css`**

Ported from `index.html:959-960`:

```css
.list { display: flex; gap: 4px; flex-shrink: 0; }
.tag {
  padding: 2px 7px; border-radius: 4px; font-size: 9px; font-weight: 600; letter-spacing: 0.04em;
  background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-secondary);
  white-space: nowrap;
}
```

- [ ] **Step 4: Implement `TaskTagList.tsx`**

```tsx
// src/components/tasks/TaskTagList.tsx
import styles from './TaskTagList.module.css'

interface TaskTagListProps {
  tags: string[]
  max?: number
}

export function TaskTagList({ tags, max = 2 }: TaskTagListProps) {
  return (
    <div className={styles.list}>
      {tags.slice(0, max).map((tag) => (
        <span key={tag} className={styles.tag}>{tag}</span>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `TaskAssigneeBubble.module.css`**

Ported from `index.html:967` — note the base `Avatar` primitive has no border, but the Tasks page's bubble does (`border: 1.5px solid var(--bg-card)`), so it's added here via `className`, not fighting the primitive's own sizing (which is overridden via `style`, per the established Phase 3.1 pattern):

```css
.bubble { border: 1.5px solid var(--bg-card); }
```

- [ ] **Step 6: Extend `Avatar` with a `fallbackStyle` prop**

`Avatar`'s inline `style` prop (added in Phase 3.1 Task 1) only reaches the root `RadixAvatar.Root` element. This component needs the per-assignee `color` gradient painted on the *fallback* element specifically (`RadixAvatar.Fallback`), which currently always paints `Avatar.module.css`'s own hardcoded `background: linear-gradient(135deg, #4A90FF, #A855F7)` — a fixed inline `style` on the root can't reach that child element, and CSS-Modules class overrides are the fragile pattern this project has already deliberately avoided (see the Phase 3.1 memory note on `Avatar` sizing). Add a second optional prop, mirroring the existing one:

```tsx
// src/components/ui/Avatar.tsx — add alongside the existing `style` prop
interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md'
  className?: string
  style?: CSSProperties
  fallbackStyle?: CSSProperties
}

export const Avatar = forwardRef<ComponentRef<typeof RadixAvatar.Root>, AvatarProps>(
  function Avatar({ src, name, size = 'sm', className, style, fallbackStyle }, ref) {
    const sizeClass = size === 'md' ? styles.md : styles.sm
    const combined = [styles.root, sizeClass, className].filter(Boolean).join(' ')

    return (
      <RadixAvatar.Root ref={ref} className={combined} style={style} title={name}>
        <RadixAvatar.Image className={styles.image} src={src} alt={name} />
        <RadixAvatar.Fallback className={styles.fallback} style={fallbackStyle}>{getInitials(name)}</RadixAvatar.Fallback>
      </RadixAvatar.Root>
    )
  },
)
```

Add one test to `Avatar.test.tsx`:

```tsx
  it('applies an inline style override on the fallback element for per-instance coloring', () => {
    render(<Avatar name="Aspen Herwitz" fallbackStyle={{ background: 'red' }} />)
    expect(screen.getByText('AH')).toHaveStyle({ background: 'red' })
  })
```

- [ ] **Step 7: Implement `TaskAssigneeBubble.tsx`**

```tsx
// src/components/tasks/TaskAssigneeBubble.tsx
import { Avatar } from '../ui/Avatar'
import styles from './TaskAssigneeBubble.module.css'

interface TaskAssigneeBubbleProps {
  assignee: string
  avatarSrc: string | undefined
  color: string
  size: 26 | 22
}

export function TaskAssigneeBubble({ assignee, avatarSrc, color, size }: TaskAssigneeBubbleProps) {
  return (
    <Avatar
      src={avatarSrc}
      name={assignee}
      className={styles.bubble}
      style={{ width: size, height: size }}
      fallbackStyle={{ background: color, fontSize: size === 22 ? 8 : 9 }}
    />
  )
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm vitest run src/components/tasks/TaskTagList.test.tsx src/components/tasks/TaskAssigneeBubble.test.tsx src/components/ui/Avatar.test.tsx`
Expected: PASS — 2 + 2 new component tests, plus Avatar's existing tests plus the new `fallbackStyle` test.

- [ ] **Step 9: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 10: Commit**

```bash
git add src/components/tasks/TaskTagList.tsx src/components/tasks/TaskTagList.module.css src/components/tasks/TaskTagList.test.tsx src/components/tasks/TaskAssigneeBubble.tsx src/components/tasks/TaskAssigneeBubble.module.css src/components/tasks/TaskAssigneeBubble.test.tsx src/components/ui/Avatar.tsx src/components/ui/Avatar.test.tsx
git commit -m "feat: add shared TaskTagList and TaskAssigneeBubble components; extend Avatar with fallbackStyle"
```

---

### Task 5: `TasksPageHeader` + `TaskStatsRow`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TasksPageHeader.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TasksPageHeader.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TasksPageHeader.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskStatsRow.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskStatsRow.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskStatsRow.test.tsx`

**Interfaces:**
- Consumes: `useTaskModalStore().openCreate` (Task 2), `useTasksStore().tasks` (for live counts).
- Produces: `<TasksPageHeader view={'list'|'board'} onViewChange={(v) => void} />`. `<TaskStatsRow activeFilter={string} onFilterChange={(filter: string) => void} />` (computes live counts from `tasks`, matching original's static `15/4/5/3/3` seed values naturally since they're derived from `MOCK_TASKS`, not hardcoded — verify this matches: `index.html:3315-3336`'s `45`/`4`/`5`/`3`/`3`... actually those are `15,4,5,3,3` — cross-check against `MOCK_TASKS`'s actual status distribution before assuming the static numbers are meant to be literal-only; the original computes nothing here, these ARE hardcoded literals unrelated to `tasksData`'s real counts (a demo-data mismatch, same flavor as the Dashboard KPI-45 quirk) — **decide and document**: since this phase already has live `tasksData`/`tasksStore` wired everywhere else and a mismatched static count would look broken next to a real, filterable list, compute the counts live from `tasks` rather than reproducing the hardcoded-and-wrong literals; this is a deliberate, disclosed departure from strict parity, not a silent one).

Ported from `index.html:3294-3350` (markup), `:911-928` (CSS for header/view-toggle/stat-chips/toolbar shell — the toolbar's own dropdowns are Task 6), `:7404-7420` (view-toggle + filter-chip click handlers).

- [ ] **Step 1: Write the failing test for `TasksPageHeader`**

```tsx
// src/components/tasks/TasksPageHeader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasksPageHeader } from './TasksPageHeader'
import { useTaskModalStore } from '../../store/taskModalStore'

describe('TasksPageHeader', () => {
  it('renders the breadcrumb and heading', () => {
    render(<TasksPageHeader view="list" onViewChange={vi.fn()} />)
    expect(screen.getByText('Overview / Tasks')).toBeInTheDocument()
    expect(screen.getByText('My Tasks')).toBeInTheDocument()
  })

  it('opens the create-task modal when Add Task is clicked', async () => {
    useTaskModalStore.setState({ isOpen: false, editingTaskId: null })
    render(<TasksPageHeader view="list" onViewChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /add task/i }))
    expect(useTaskModalStore.getState()).toMatchObject({ isOpen: true, editingTaskId: null })
  })

  it('calls onViewChange with the clicked view', async () => {
    const onViewChange = vi.fn()
    render(<TasksPageHeader view="list" onViewChange={onViewChange} />)
    await userEvent.click(screen.getByRole('button', { name: /board/i }))
    expect(onViewChange).toHaveBeenCalledWith('board')
  })

  it('marks the active view button', () => {
    render(<TasksPageHeader view="board" onViewChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /board/i })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('button', { name: /^list/i })).toHaveAttribute('data-active', 'false')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TasksPageHeader.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `TasksPageHeader.module.css`**

Ported from `index.html:911-919`:

```css
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

- [ ] **Step 4: Implement `TasksPageHeader.tsx`**

```tsx
// src/components/tasks/TasksPageHeader.tsx
import { Plus, List, LayoutTemplate } from 'lucide-react'
import { Button } from '../ui/Button'
import { useTaskModalStore } from '../../store/taskModalStore'
import styles from './TasksPageHeader.module.css'

interface TasksPageHeaderProps {
  view: 'list' | 'board'
  onViewChange: (view: 'list' | 'board') => void
}

export function TasksPageHeader({ view, onViewChange }: TasksPageHeaderProps) {
  const openCreate = useTaskModalStore((s) => s.openCreate)

  return (
    <div className={styles.header}>
      <div>
        <div className={styles.breadcrumb}>Overview / Tasks</div>
        <div className={styles.heading}>My Tasks</div>
      </div>
      <div className={styles.actions}>
        <div className={styles.viewToggle}>
          <button type="button" className={styles.viewBtn} data-active={view === 'list'} onClick={() => onViewChange('list')}>
            <List aria-hidden="true" /> List
          </button>
          <button type="button" className={styles.viewBtn} data-active={view === 'board'} onClick={() => onViewChange('board')}>
            <LayoutTemplate aria-hidden="true" /> Board
          </button>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" /> Add Task
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/tasks/TasksPageHeader.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write the failing test for `TaskStatsRow`**

```tsx
// src/components/tasks/TaskStatsRow.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskStatsRow } from './TaskStatsRow'
import { useTasksStore } from '../../store/tasksStore'
import { MOCK_TASKS } from '../../data/mockTasks'

describe('TaskStatsRow', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
  })

  it('shows live counts per status derived from the task list, plus a total', () => {
    render(<TaskStatsRow activeFilter="all" onFilterChange={vi.fn()} />)
    const todoCount = MOCK_TASKS.filter((t) => t.status === 'todo').length
    expect(screen.getByText(String(MOCK_TASKS.length))).toBeInTheDocument()
    expect(screen.getByText(String(todoCount))).toBeInTheDocument()
  })

  it('calls onFilterChange with the clicked chip\'s filter key', async () => {
    const onFilterChange = vi.fn()
    render(<TaskStatsRow activeFilter="all" onFilterChange={onFilterChange} />)
    await userEvent.click(screen.getByText('Completed').closest('div')!)
    expect(onFilterChange).toHaveBeenCalledWith('done')
  })

  it('marks the active chip', () => {
    render(<TaskStatsRow activeFilter="overdue" onFilterChange={vi.fn()} />)
    expect(screen.getByText('Overdue').closest('[data-active]')).toHaveAttribute('data-active', 'true')
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TaskStatsRow.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 8: Create `TaskStatsRow.module.css`**

Ported from `index.html:921-928`:

```css
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

- [ ] **Step 9: Implement `TaskStatsRow.tsx`**

```tsx
// src/components/tasks/TaskStatsRow.tsx
import { useTasksStore } from '../../store/tasksStore'
import styles from './TaskStatsRow.module.css'

const CHIPS = [
  { filter: 'all', label: 'Total', dot: 'var(--accent-blue)' },
  { filter: 'in-progress', label: 'In Progress', dot: 'var(--accent-yellow)' },
  { filter: 'todo', label: 'To Do', dot: 'var(--accent-blue)' },
  { filter: 'done', label: 'Completed', dot: 'var(--accent-green)' },
  { filter: 'overdue', label: 'Overdue', dot: 'var(--accent-red)' },
] as const

interface TaskStatsRowProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
}

export function TaskStatsRow({ activeFilter, onFilterChange }: TaskStatsRowProps) {
  const tasks = useTasksStore((s) => s.tasks)

  const countFor = (filter: string) => (filter === 'all' ? tasks.length : tasks.filter((t) => t.status === filter).length)

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
    </div>
  )
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `pnpm vitest run src/components/tasks/TaskStatsRow.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 11: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 12: Commit**

```bash
git add src/components/tasks/TasksPageHeader.tsx src/components/tasks/TasksPageHeader.module.css src/components/tasks/TasksPageHeader.test.tsx src/components/tasks/TaskStatsRow.tsx src/components/tasks/TaskStatsRow.module.css src/components/tasks/TaskStatsRow.test.tsx
git commit -m "feat: add TasksPageHeader and TaskStatsRow with live status counts"
```

---

### Task 6: `TasksToolbar` (Sort, Filter, Search)

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TasksToolbar.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TasksToolbar.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TasksToolbar.test.tsx`

**Interfaces:**
- Consumes: `Dropdown` primitive, `useToastStore`.
- Produces: `<TasksToolbar activeSort={string} onSortChange={(sort: string) => void} searchQuery={string} onSearchChange={(q: string) => void} />`.

Ported from `index.html:3338-3349` (markup), `:928` (`.tasks-toolbar` CSS — the search-wrap/search-input classes already exist as generic classes elsewhere in the app; port their values directly here since this is this component's own CSS module and cannot reference another page's classes), `:5523-5547` (`dd-tasks-sort`/`dd-tasks-filter` dropdown panels), `:7425-7448` (sort/filter dropdown wiring), `:7422-7423` (search input wiring).

**Reminder from Global Constraints — do not apply the trigger-label-sync pattern here.** The Sort button's own text is always the literal `Sort` (never becomes "Due Date" / "Priority" / etc.); only the selected `Dropdown.Item`'s `active` state changes. The Filter button's text is always the literal `Filter`, with no active-item concept (checkboxes, not single-select). Both are simpler than every dropdown built in Phase 3.1 — resist adding a `useState` for the trigger label on either.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/tasks/TasksToolbar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasksToolbar } from './TasksToolbar'

describe('TasksToolbar', () => {
  it('search input reflects the controlled value and calls onSearchChange while typing', async () => {
    const onSearchChange = vi.fn()
    render(<TasksToolbar activeSort="due" onSortChange={vi.fn()} searchQuery="" onSearchChange={onSearchChange} />)
    await userEvent.type(screen.getByPlaceholderText('Search tasks...'), 'x')
    expect(onSearchChange).toHaveBeenCalledWith('x')
  })

  it('Sort dropdown keeps its trigger label static as "Sort" after selecting an option', async () => {
    const onSortChange = vi.fn()
    render(<TasksToolbar activeSort="due" onSortChange={onSortChange} searchQuery="" onSearchChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sort' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /priority/i }))
    expect(onSortChange).toHaveBeenCalledWith('priority')
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument()
  })

  it('marks the currently active sort item', async () => {
    render(<TasksToolbar activeSort="priority" onSortChange={vi.fn()} searchQuery="" onSearchChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sort' }))
    expect(await screen.findByRole('menuitem', { name: /priority/i })).toHaveClass(/active/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TasksToolbar.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `TasksToolbar.module.css`**

Ported from `index.html:928` and the app-wide `.search-wrap`/`.search-input`/`.filter-*` rules used elsewhere (same values already established in `DashboardHeader.module.css` for the filter checkbox styling — reproduce them here since CSS Modules don't share across files):

```css
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

- [ ] **Step 4: Implement `TasksToolbar.tsx`**

```tsx
// src/components/tasks/TasksToolbar.tsx
import { useState } from 'react'
import { ArrowUpDown, SlidersHorizontal, Search, Calendar, Flag, Type, Briefcase, User } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { useToastStore } from '../../store/toastStore'
import styles from './TasksToolbar.module.css'

const SORT_OPTIONS = [
  { key: 'due', label: 'Due Date', icon: <Calendar aria-hidden="true" /> },
  { key: 'priority', label: 'Priority', icon: <Flag aria-hidden="true" /> },
  { key: 'name', label: 'Name (A–Z)', icon: <Type aria-hidden="true" /> },
  { key: 'project', label: 'Project', icon: <Briefcase aria-hidden="true" /> },
  { key: 'assignee', label: 'Assignee', icon: <User aria-hidden="true" /> },
] as const

const PRIORITY_KEYS = ['high', 'medium', 'low'] as const
const PROJECT_NAMES = ['Web 3 App for Fxtrade', 'Healthydog Landing Page', 'Redesign of Website', 'ChronoLoop Launch']

interface TasksToolbarProps {
  activeSort: string
  onSortChange: (sort: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function TasksToolbar({ activeSort, onSortChange, searchQuery, onSearchChange }: TasksToolbarProps) {
  const showToast = useToastStore((s) => s.showToast)
  const [priorityChecked, setPriorityChecked] = useState<Record<string, boolean>>({ high: true, medium: true, low: true })
  const [projectChecked, setProjectChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(PROJECT_NAMES.map((name) => [name, true])),
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
          <div className={styles.filterSectionTitle}>Project</div>
          {PROJECT_NAMES.map((name) => (
            <label key={name} className={styles.filterCheckItem}>
              <input
                type="checkbox"
                checked={projectChecked[name]}
                onChange={(e) => setProjectChecked((f) => ({ ...f, [name]: e.target.checked }))}
              />
              <span>{name}</span>
            </label>
          ))}
          <div className={styles.filterFooter}>
            <button
              type="button"
              className={styles.filterClear}
              onClick={() => {
                setPriorityChecked({ high: false, medium: false, low: false })
                setProjectChecked(Object.fromEntries(PROJECT_NAMES.map((name) => [name, false])))
                showToast('Task filters cleared', 'info', 1500)
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
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/tasks/TasksToolbar.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TasksToolbar.tsx src/components/tasks/TasksToolbar.module.css src/components/tasks/TasksToolbar.test.tsx
git commit -m "feat: add TasksToolbar with sort/filter dropdowns and search"
```

---

### Task 7: `TaskListView` + `TaskGroup` + `TaskRow`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskRow.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskRow.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskRow.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskGroup.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskGroup.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskGroup.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskListView.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskListView.test.tsx`

**Interfaces:**
- Consumes: `Task` type, `STATUS_CONFIG`/`STATUS_ORDER`/`getDueClass`/`formatDue` (Task 1), `TaskTagList`/`TaskAssigneeBubble` (Task 4), `useTaskModalStore().openEdit` (Task 2), `useTasksStore().setTaskStatus` (Task 1), `useDeleteWithUndo` + `useTasksStore().removeTask`/`restoreTask` (Task 1 + Task 3).
- Produces: `<TaskListView tasks={Task[]} onOpenDetail={(id: number) => void} />` (`onOpenDetail` is a prop, not wired to anything yet — Phase 3.3 passes the real handler; this phase can pass a no-op or a placeholder toast, see Step below).

Ported from `index.html:6947-7045` (`buildListView` + `buildTaskRowHTML`), `:930-978` (CSS for `.task-group`/`.task-row`/etc.).

**Reminder from Global Constraints:** `.task-row-actions` (Edit/Delete buttons) are always visible in this port, not hover-revealed — same deliberate a11y deviation as Phase 3.1's `CriticalProjectsPanel`.

**On `onOpenDetail`:** the original's row click opens the task detail side panel (`index.html:6984-6987`), which is Phase 3.3's deliverable, not built yet. This phase should NOT stub in a fake detail view — accept `onOpenDetail: (id: number) => void` as a prop from the start (so `TaskListView`'s own logic and tests are complete and won't need touching again in Phase 3.3), and have `TasksPage` (Task 9) pass a temporary handler that shows a toast (`"Task detail coming soon"`) until Phase 3.3 replaces it with the real one. This keeps the row click wired end-to-end and testable now, with a single one-line swap later.

- [ ] **Step 1: Write the failing test for `TaskRow`**

```tsx
// src/components/tasks/TaskRow.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskRow } from './TaskRow'
import { useTaskModalStore } from '../../store/taskModalStore'
import { useTasksStore } from '../../store/tasksStore'
import { MOCK_TASKS } from '../../data/mockTasks'

const task = MOCK_TASKS[0]

describe('TaskRow', () => {
  it('renders the title, project, tags, priority, assignee, and due date', () => {
    render(<TaskRow task={task} onOpenDetail={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(task.title)).toBeInTheDocument()
    expect(screen.getByText(task.project)).toBeInTheDocument()
  })

  it('clicking the row calls onOpenDetail with the task id', async () => {
    const onOpenDetail = vi.fn()
    render(<TaskRow task={task} onOpenDetail={onOpenDetail} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByText(task.title))
    expect(onOpenDetail).toHaveBeenCalledWith(task.id)
  })

  it('clicking the checkbox toggles status to done and does not open the detail view', async () => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
    const onOpenDetail = vi.fn()
    render(<TaskRow task={task} onOpenDetail={onOpenDetail} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(useTasksStore.getState().tasks.find((t) => t.id === task.id)?.status).toBe('done')
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('clicking Edit opens the edit modal for this task and does not open the detail view', async () => {
    useTaskModalStore.setState({ isOpen: false, editingTaskId: null })
    const onOpenDetail = vi.fn()
    render(<TaskRow task={task} onOpenDetail={onOpenDetail} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(useTaskModalStore.getState()).toMatchObject({ isOpen: true, editingTaskId: task.id })
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('clicking Delete calls onDelete with the task id and does not open the detail view', async () => {
    const onDelete = vi.fn()
    const onOpenDetail = vi.fn()
    render(<TaskRow task={task} onOpenDetail={onOpenDetail} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith(task.id, task.title)
    expect(onOpenDetail).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TaskRow.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `TaskRow.module.css`**

Ported from `index.html:943-978` (`.task-row-actions` intentionally omits the original's `opacity:0`/hover-reveal per Global Constraints):

```css
.row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background var(--duration-fast); position: relative; }
.row:last-child { border-bottom: none; }
.row:hover { background: var(--bg-card-hover); }

.checkbox {
  width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border-default);
  background: transparent; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  transition: background var(--duration-fast), border-color var(--duration-fast); padding: 0;
}
.checkbox:hover { border-color: var(--accent-blue); }
.checkbox[data-checked='true'] { background: var(--accent-green); border-color: var(--accent-green); }
.checkbox[data-checked='true']::after { content: '✓'; font-size: 9px; color: #fff; font-weight: 700; }

.nameCol { flex: 1; min-width: 0; text-align: left; }
.name { font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
.name[data-done='true'] { text-decoration: line-through; color: var(--text-muted); }
.projectTag { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.projectTag svg { width: 9px; height: 9px; }

.priority { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 600; flex-shrink: 0; }
.priority svg { width: 11px; height: 11px; }
.priority.high { background: rgba(255,77,77,0.12); color: var(--accent-red); }
.priority.medium { background: rgba(234,179,8,0.12); color: var(--accent-yellow); }
.priority.low { background: rgba(34,197,94,0.12); color: var(--accent-green); }

.due { font-size: 11px; white-space: nowrap; flex-shrink: 0; padding: 2px 8px; border-radius: 5px; display: flex; align-items: center; }
.due svg { width: 10px; height: 10px; margin-right: 3px; }
.due.normal { color: var(--text-muted); }
.due.soon { color: var(--accent-yellow); background: rgba(234,179,8,0.1); }
.due.overdueChip { color: var(--accent-red); background: rgba(255,77,77,0.1); }

.actions { display: flex; gap: 4px; flex-shrink: 0; }
.actionBtn { width: 26px; height: 26px; border-radius: 5px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--duration-fast), color var(--duration-fast); }
.actionBtn:hover { background: var(--border-default); color: var(--text-primary); }
.actionBtn svg { width: 13px; height: 13px; }
.deleteBtn { color: var(--accent-red); }
```

- [ ] **Step 4: Implement `TaskRow.tsx`**

```tsx
// src/components/tasks/TaskRow.tsx
import { AlertCircle, MinusCircle, CheckCircle, Briefcase, Calendar, Edit2, Trash2 } from 'lucide-react'
import type { Task } from '../../types/task'
import { getDueClass, formatDue } from '../../lib/taskFormatters'
import { TaskTagList } from './TaskTagList'
import { TaskAssigneeBubble } from './TaskAssigneeBubble'
import { useTaskModalStore } from '../../store/taskModalStore'
import { useTasksStore } from '../../store/tasksStore'
import styles from './TaskRow.module.css'

const PRIORITY_ICON = { high: AlertCircle, medium: MinusCircle, low: CheckCircle } as const
const DUE_CLASS_MAP = { normal: styles.normal, soon: styles.soon, 'overdue-chip': styles.overdueChip } as const

interface TaskRowProps {
  task: Task
  onOpenDetail: (id: number) => void
  onDelete: (id: number, title: string) => void
}

export function TaskRow({ task, onOpenDetail, onDelete }: TaskRowProps) {
  const openEdit = useTaskModalStore((s) => s.openEdit)
  const setTaskStatus = useTasksStore((s) => s.setTaskStatus)
  const isDone = task.status === 'done'
  const dueClass = getDueClass(task.due, task.status)
  const PriorityIcon = PRIORITY_ICON[task.priority]

  return (
    <div className={styles.row} onClick={() => onOpenDetail(task.id)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
        className={styles.checkbox}
        data-checked={isDone}
        onClick={(e) => { e.stopPropagation(); setTaskStatus(task.id, isDone ? 'todo' : 'done') }}
      />

      <div className={styles.nameCol}>
        <div className={styles.name} data-done={isDone}>{task.title}</div>
        <div className={styles.projectTag}><Briefcase aria-hidden="true" />{task.project}</div>
      </div>

      <TaskTagList tags={task.tags} />

      <div className={[styles.priority, styles[task.priority]].join(' ')}>
        <PriorityIcon aria-hidden="true" />
        {task.priority[0].toUpperCase() + task.priority.slice(1)}
      </div>

      <TaskAssigneeBubble assignee={task.assignee} avatarSrc={undefined} color={task.aColor} size={26} />

      <div className={[styles.due, DUE_CLASS_MAP[dueClass]].join(' ')}>
        <Calendar aria-hidden="true" />{formatDue(task.due)}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          title="Edit"
          aria-label="Edit"
          onClick={(e) => { e.stopPropagation(); openEdit(task.id) }}
        >
          <Edit2 aria-hidden="true" />
        </button>
        <button
          type="button"
          className={[styles.actionBtn, styles.deleteBtn].join(' ')}
          title="Delete"
          aria-label="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id, task.title) }}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/tasks/TaskRow.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Write the failing test for `TaskGroup`**

```tsx
// src/components/tasks/TaskGroup.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskGroup } from './TaskGroup'
import { MOCK_TASKS } from '../../data/mockTasks'

const todoTasks = MOCK_TASKS.filter((t) => t.status === 'todo')

describe('TaskGroup', () => {
  it('renders the status label, count, and every task row in the group', () => {
    render(<TaskGroup status="todo" tasks={todoTasks} onOpenDetail={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText(String(todoTasks.length))).toBeInTheDocument()
    todoTasks.forEach((t) => expect(screen.getByText(t.title)).toBeInTheDocument())
  })

  it('collapses and expands when the header is clicked, without opening any row\'s detail view', async () => {
    const onOpenDetail = vi.fn()
    render(<TaskGroup status="todo" tasks={todoTasks} onOpenDetail={onOpenDetail} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByText('To Do'))
    expect(screen.queryByText(todoTasks[0].title)).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('To Do'))
    expect(screen.getByText(todoTasks[0].title)).toBeInTheDocument()
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('the group Add button opens the create-task modal without toggling collapse', async () => {
    render(<TaskGroup status="todo" tasks={todoTasks} onOpenDetail={vi.fn()} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(screen.getByText(todoTasks[0].title)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TaskGroup.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 8: Create `TaskGroup.module.css`**

Ported from `index.html:930-941`:

```css
.group { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden; transition: background var(--duration-normal) var(--ease-out); }

.header { display: flex; align-items: center; gap: 10px; padding: 11px 16px; cursor: pointer; border-bottom: 1px solid var(--border-subtle); user-select: none; transition: background var(--duration-fast); width: 100%; text-align: left; background: none; border-left: none; border-right: none; border-top: none; }
.header:hover { background: var(--bg-card-hover); }
.header[data-collapsed='true'] { border-bottom: none; }

.chevron { width: 14px; height: 14px; color: var(--text-muted); transition: transform var(--duration-fast); flex-shrink: 0; }
.chevron[data-collapsed='true'] { transform: rotate(-90deg); }

.statusDot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.label { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.count { font-size: 10px; color: var(--text-muted); background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 1px 8px; }

.addBtn {
  margin-left: auto; display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px;
  background: transparent; border: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px;
  font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background var(--duration-fast), color var(--duration-fast);
}
.addBtn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.addBtn svg { width: 11px; height: 11px; }
```

- [ ] **Step 9: Implement `TaskGroup.tsx`**

```tsx
// src/components/tasks/TaskGroup.tsx
import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { Task, TaskStatus } from '../../types/task'
import { STATUS_CONFIG } from '../../lib/taskFormatters'
import { TaskRow } from './TaskRow'
import { useTaskModalStore } from '../../store/taskModalStore'
import styles from './TaskGroup.module.css'

interface TaskGroupProps {
  status: TaskStatus
  tasks: Task[]
  onOpenDetail: (id: number) => void
  onDelete: (id: number, title: string) => void
}

export function TaskGroup({ status, tasks, onOpenDetail, onDelete }: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const openCreate = useTaskModalStore((s) => s.openCreate)
  const cfg = STATUS_CONFIG[status]

  if (tasks.length === 0) return null

  return (
    <div className={styles.group}>
      <button type="button" className={styles.header} data-collapsed={collapsed} onClick={() => setCollapsed((c) => !c)}>
        <ChevronDown aria-hidden="true" className={styles.chevron} data-collapsed={collapsed} />
        <span className={styles.statusDot} style={{ background: cfg.dotColor }} />
        <span className={styles.label}>{cfg.label}</span>
        <span className={styles.count}>{tasks.length}</span>
        <span
          role="button"
          tabIndex={0}
          className={styles.addBtn}
          onClick={(e) => { e.stopPropagation(); openCreate() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); openCreate() } }}
        >
          <Plus aria-hidden="true" /> Add
        </span>
      </button>
      {!collapsed && (
        <div>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onOpenDetail={onOpenDetail} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `pnpm vitest run src/components/tasks/TaskGroup.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 11: Write the failing test for `TaskListView`**

```tsx
// src/components/tasks/TaskListView.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskListView } from './TaskListView'
import { MOCK_TASKS } from '../../data/mockTasks'

describe('TaskListView', () => {
  it('groups tasks by status in the order Overdue, In Progress, To Do, Done, skipping empty groups', () => {
    render(<TaskListView tasks={MOCK_TASKS} onOpenDetail={vi.fn()} onDelete={vi.fn()} />)
    const headings = screen.getAllByText(/^(Overdue|In Progress|To Do|Done)$/).map((el) => el.textContent)
    expect(headings).toEqual(['Overdue', 'In Progress', 'To Do', 'Done'])
  })

  it('renders nothing for a status group with zero matching tasks', () => {
    const onlyTodo = MOCK_TASKS.filter((t) => t.status === 'todo')
    render(<TaskListView tasks={onlyTodo} onOpenDetail={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
    expect(screen.getByText('To Do')).toBeInTheDocument()
  })
})
```

- [ ] **Step 12: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TaskListView.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 13: Implement `TaskListView.tsx`**

Group order ported from `index.html:6950` (`const statusOrder = ['overdue','in-progress','todo','done']` — note this is a *different, display-order* array from the sort-comparator `statusOrder` object in `taskFormatters.ts`; the original also has two same-named-but-different `statusOrder`s in this exact spot, so don't try to unify them):

```tsx
// src/components/tasks/TaskListView.tsx
import type { Task, TaskStatus } from '../../types/task'
import { TaskGroup } from './TaskGroup'

const GROUP_DISPLAY_ORDER: TaskStatus[] = ['overdue', 'in-progress', 'todo', 'done']

interface TaskListViewProps {
  tasks: Task[]
  onOpenDetail: (id: number) => void
  onDelete: (id: number, title: string) => void
}

export function TaskListView({ tasks, onOpenDetail, onDelete }: TaskListViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {GROUP_DISPLAY_ORDER.map((status) => (
        <TaskGroup
          key={status}
          status={status}
          tasks={tasks.filter((t) => t.status === status)}
          onOpenDetail={onOpenDetail}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 14: Run tests to verify they pass**

Run: `pnpm vitest run src/components/tasks/TaskListView.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 15: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 16: Commit**

```bash
git add src/components/tasks/TaskRow.tsx src/components/tasks/TaskRow.module.css src/components/tasks/TaskRow.test.tsx src/components/tasks/TaskGroup.tsx src/components/tasks/TaskGroup.module.css src/components/tasks/TaskGroup.test.tsx src/components/tasks/TaskListView.tsx src/components/tasks/TaskListView.test.tsx
git commit -m "feat: add TaskListView with collapsible status groups and TaskRow actions"
```

---

### Task 8: `TaskBoardView` + `TaskBoardCard`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskBoardCard.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskBoardCard.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskBoardCard.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskBoardView.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskBoardView.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskBoardView.test.tsx`

**Interfaces:**
- Consumes: `Task` type, `getDueClass`/`formatDue` (Task 1), `TaskTagList`/`TaskAssigneeBubble` (Task 4), `useTaskModalStore().openCreate` (Task 2).
- Produces: `<TaskBoardView tasks={Task[]} onOpenDetail={(id: number) => void} />`.

Ported from `index.html:7047-7097` (`buildBoardView`), `:981-996` (kanban CSS). **No drag-and-drop** (Global Constraints) — cards are click-to-open-detail only, same `onOpenDetail` prop contract as `TaskListView` (again a temporary toast placeholder in `TasksPage` until Phase 3.3).

- [ ] **Step 1: Write the failing test for `TaskBoardCard`**

```tsx
// src/components/tasks/TaskBoardCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskBoardCard } from './TaskBoardCard'
import { MOCK_TASKS } from '../../data/mockTasks'

const task = MOCK_TASKS[0]

describe('TaskBoardCard', () => {
  it('renders the title and project', () => {
    render(<TaskBoardCard task={task} onOpenDetail={vi.fn()} />)
    expect(screen.getByText(task.title)).toBeInTheDocument()
    expect(screen.getByText(task.project)).toBeInTheDocument()
  })

  it('calls onOpenDetail with the task id when clicked', async () => {
    const onOpenDetail = vi.fn()
    render(<TaskBoardCard task={task} onOpenDetail={onOpenDetail} />)
    await userEvent.click(screen.getByText(task.title))
    expect(onOpenDetail).toHaveBeenCalledWith(task.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TaskBoardCard.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `TaskBoardCard.module.css`**

Ported from `index.html:991-996` plus the board-specific inline-style overrides at `index.html:7078,7080-7081` (smaller priority badge, smaller assignee bubble):

```css
.card {
  background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;
  cursor: pointer; transition: box-shadow var(--duration-fast), transform var(--duration-fast), border-color var(--duration-fast);
  width: 100%; text-align: left;
}
.card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.3); transform: translateY(-2px); border-color: var(--border-default); }

.tags { margin-bottom: 10px; }
.title { font-size: 12px; font-weight: 500; color: var(--text-primary); line-height: 1.4; margin-bottom: 8px; }
.footer { display: flex; align-items: center; justify-content: space-between; }
.footerRight { display: flex; align-items: center; gap: 6px; }

.priority { display: flex; align-items: center; padding: 2px 6px; border-radius: 5px; font-size: 9px; font-weight: 600; }
.priority.high { background: rgba(255,77,77,0.12); color: var(--accent-red); }
.priority.medium { background: rgba(234,179,8,0.12); color: var(--accent-yellow); }
.priority.low { background: rgba(34,197,94,0.12); color: var(--accent-green); }

.due { font-size: 10px; }
.due.normal { color: var(--text-muted); }
.due.soon { color: var(--accent-yellow); }
.due.overdueChip { color: var(--accent-red); }

.project { margin-top: 8px; font-size: 10px; color: var(--text-muted); }
```

- [ ] **Step 4: Implement `TaskBoardCard.tsx`**

Note the original's board card omits the priority icon (only the list row shows it, `index.html:7078` has no `<i data-lucide>`) — preserve that:

```tsx
// src/components/tasks/TaskBoardCard.tsx
import type { Task } from '../../types/task'
import { getDueClass, formatDue } from '../../lib/taskFormatters'
import { TaskTagList } from './TaskTagList'
import { TaskAssigneeBubble } from './TaskAssigneeBubble'
import styles from './TaskBoardCard.module.css'

const DUE_CLASS_MAP = { normal: styles.normal, soon: styles.soon, 'overdue-chip': styles.overdueChip } as const

interface TaskBoardCardProps {
  task: Task
  onOpenDetail: (id: number) => void
}

export function TaskBoardCard({ task, onOpenDetail }: TaskBoardCardProps) {
  const dueClass = getDueClass(task.due, task.status)

  return (
    <button type="button" className={styles.card} onClick={() => onOpenDetail(task.id)}>
      <div className={styles.tags}><TaskTagList tags={task.tags} /></div>
      <div className={styles.title}>{task.title}</div>
      <div className={styles.footer}>
        <div className={[styles.priority, styles[task.priority]].join(' ')}>
          {task.priority[0].toUpperCase() + task.priority.slice(1)}
        </div>
        <div className={styles.footerRight}>
          <div className={[styles.due, DUE_CLASS_MAP[dueClass]].join(' ')}>{formatDue(task.due)}</div>
          <TaskAssigneeBubble assignee={task.assignee} avatarSrc={undefined} color={task.aColor} size={22} />
        </div>
      </div>
      <div className={styles.project}>{task.project}</div>
    </button>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/tasks/TaskBoardCard.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Write the failing test for `TaskBoardView`**

```tsx
// src/components/tasks/TaskBoardView.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskBoardView } from './TaskBoardView'
import { useTaskModalStore } from '../../store/taskModalStore'
import { MOCK_TASKS } from '../../data/mockTasks'

describe('TaskBoardView', () => {
  it('renders all four status columns with correct counts', () => {
    render(<TaskBoardView tasks={MOCK_TASKS} onOpenDetail={vi.fn()} />)
    const todoCount = MOCK_TASKS.filter((t) => t.status === 'todo').length
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText(String(todoCount))).toBeInTheDocument()
  })

  it('shows a "No tasks" placeholder for an empty column', () => {
    const noneOverdue = MOCK_TASKS.filter((t) => t.status !== 'overdue')
    render(<TaskBoardView tasks={noneOverdue} onOpenDetail={vi.fn()} />)
    expect(screen.getAllByText('No tasks').length).toBeGreaterThan(0)
  })

  it('each column\'s + button opens the create-task modal', async () => {
    useTaskModalStore.setState({ isOpen: false, editingTaskId: null })
    render(<TaskBoardView tasks={MOCK_TASKS} onOpenDetail={vi.fn()} />)
    await userEvent.click(screen.getAllByRole('button', { name: /add task to column/i })[0])
    expect(useTaskModalStore.getState()).toMatchObject({ isOpen: true, editingTaskId: null })
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run src/components/tasks/TaskBoardView.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 8: Create `TaskBoardView.module.css`**

Ported from `index.html:981-990`:

```css
.board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; align-items: start; }

.col { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden; }
.colHeader { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); }
.colTitle { display: flex; align-items: center; gap: 8px; }
.colDot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.colTitleText { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.colCount { font-size: 10px; padding: 1px 7px; border-radius: 10px; background: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border-subtle); }

.addColBtn { width: 24px; height: 24px; border-radius: 6px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--duration-fast), color var(--duration-fast); }
.addColBtn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.addColBtn svg { width: 13px; height: 13px; }

.cards { padding: 10px; display: flex; flex-direction: column; gap: 8px; min-height: 80px; }
.empty { text-align: center; color: var(--text-muted); font-size: 11px; padding: 20px 0; }
```

- [ ] **Step 9: Implement `TaskBoardView.tsx`**

```tsx
// src/components/tasks/TaskBoardView.tsx
import { Plus } from 'lucide-react'
import type { Task, TaskStatus } from '../../types/task'
import { TaskBoardCard } from './TaskBoardCard'
import { useTaskModalStore } from '../../store/taskModalStore'
import styles from './TaskBoardView.module.css'

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: '#4A90FF' },
  { key: 'in-progress', label: 'In Progress', color: '#EAB308' },
  { key: 'done', label: 'Done', color: '#22C55E' },
  { key: 'overdue', label: 'Overdue', color: '#FF4D4D' },
]

interface TaskBoardViewProps {
  tasks: Task[]
  onOpenDetail: (id: number) => void
}

export function TaskBoardView({ tasks, onOpenDetail }: TaskBoardViewProps) {
  const openCreate = useTaskModalStore((s) => s.openCreate)

  return (
    <div className={styles.board}>
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key)
        return (
          <div key={col.key} className={styles.col}>
            <div className={styles.colHeader}>
              <div className={styles.colTitle}>
                <span className={styles.colDot} style={{ background: col.color }} />
                <span className={styles.colTitleText}>{col.label}</span>
                <span className={styles.colCount}>{colTasks.length}</span>
              </div>
              <button type="button" className={styles.addColBtn} aria-label="Add task to column" onClick={openCreate}>
                <Plus aria-hidden="true" />
              </button>
            </div>
            <div className={styles.cards}>
              {colTasks.length === 0 ? (
                <div className={styles.empty}>No tasks</div>
              ) : (
                colTasks.map((task) => <TaskBoardCard key={task.id} task={task} onOpenDetail={onOpenDetail} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `pnpm vitest run src/components/tasks/TaskBoardView.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 11: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 12: Commit**

```bash
git add src/components/tasks/TaskBoardCard.tsx src/components/tasks/TaskBoardCard.module.css src/components/tasks/TaskBoardCard.test.tsx src/components/tasks/TaskBoardView.tsx src/components/tasks/TaskBoardView.module.css src/components/tasks/TaskBoardView.test.tsx
git commit -m "feat: add TaskBoardView (kanban) with per-column empty states"
```

---

### Task 9: Assemble `TasksPage`, wire filtering/sorting/search, update the backlog

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\TasksPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\TasksPage.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\TasksPage.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\App.test.tsx`
- Modify: `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`

**Interfaces:**
- Consumes: everything from Tasks 1–8, plus the relocated `AddTaskModal` (Task 2).
- Produces: `<TasksPage />` fully assembled, including the `getFilteredTasks()` filter/sort/search logic (`index.html:6920-6931`) that no earlier task in this plan implements — it's page-level orchestration, not any one component's concern.

- [ ] **Step 1: Write the failing test for `TasksPage`**

```tsx
// src/pages/TasksPage.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasksPage } from './TasksPage'
import { useTasksStore } from '../store/tasksStore'
import { MOCK_TASKS } from '../data/mockTasks'

describe('TasksPage', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
  })

  it('renders the header, stat chips, toolbar, and the list view by default', () => {
    render(<TasksPage />)
    expect(screen.getByText('My Tasks')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument()
    expect(screen.getByText('To Do')).toBeInTheDocument()
  })

  it('switching to Board view renders the kanban columns instead of the grouped list', async () => {
    render(<TasksPage />)
    await userEvent.click(screen.getByRole('button', { name: /board/i }))
    expect(screen.getAllByText('To Do').length).toBeGreaterThan(0)
    expect(screen.queryByText(MOCK_TASKS.find((t) => t.status === 'overdue')!.title)).toBeInTheDocument()
  })

  it('clicking a stat chip filters the visible tasks to that status', async () => {
    render(<TasksPage />)
    const doneTask = MOCK_TASKS.find((t) => t.status === 'done')!
    const otherStatusTask = MOCK_TASKS.find((t) => t.status === 'todo')!
    await userEvent.click(screen.getByText('Completed').closest('div')!)
    expect(screen.getByText(doneTask.title)).toBeInTheDocument()
    expect(screen.queryByText(otherStatusTask.title)).not.toBeInTheDocument()
  })

  it('typing in search filters by title', async () => {
    render(<TasksPage />)
    const target = MOCK_TASKS[0]
    const other = MOCK_TASKS[1]
    await userEvent.type(screen.getByPlaceholderText('Search tasks...'), target.title.slice(0, 8))
    expect(screen.getByText(target.title)).toBeInTheDocument()
    expect(screen.queryByText(other.title)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/pages/TasksPage.test.tsx`
Expected: FAIL — `TasksPage` still renders only `<h1>Tasks</h1>`.

- [ ] **Step 3: Create `TasksPage.module.css`**

Matches the same pattern already established by `DashboardPage.module.css` (Phase 3.1): `AppShell.module.css`'s `.contentScroll` (the shared page wrapper every page renders inside) already applies `display:flex; flex-direction:column; gap:12px` to its own children, of which the page root is a single item — so this second, page-level `gap:12px` only spaces *this page's own* direct children (header/stats/toolbar/list-or-board) and does not compound into a double gap, exactly as it already doesn't in the shipped Dashboard page:

```css
.page { display: flex; flex-direction: column; gap: 12px; }
```

- [ ] **Step 4: Implement `TasksPage.tsx`**

`getFilteredTasks` ported from `index.html:6920-6931`:

```tsx
// src/pages/TasksPage.tsx
import { useState } from 'react'
import { TasksPageHeader } from '../components/tasks/TasksPageHeader'
import { TaskStatsRow } from '../components/tasks/TaskStatsRow'
import { TasksToolbar } from '../components/tasks/TasksToolbar'
import { TaskListView } from '../components/tasks/TaskListView'
import { TaskBoardView } from '../components/tasks/TaskBoardView'
import { AddTaskModal } from '../components/tasks/modals/AddTaskModal'
import { useTasksStore } from '../store/tasksStore'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo'
import { useToastStore } from '../store/toastStore'
import { PRIORITY_ORDER } from '../lib/taskFormatters'
import styles from './TasksPage.module.css'

export function TasksPage() {
  const tasks = useTasksStore((s) => s.tasks)
  const removeTask = useTasksStore((s) => s.removeTask)
  const restoreTask = useTasksStore((s) => s.restoreTask)
  const showToast = useToastStore((s) => s.showToast)
  const { deleteWithUndo } = useDeleteWithUndo(removeTask, restoreTask)

  const [view, setView] = useState<'list' | 'board'>('list')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeSort, setActiveSort] = useState('due')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTasks = tasks
    .filter((t) => activeFilter === 'all' || t.status === activeFilter)
    .filter((t) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.project.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      if (activeSort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (activeSort === 'name') return a.title.localeCompare(b.title)
      if (activeSort === 'project') return a.project.localeCompare(b.project)
      if (activeSort === 'assignee') return a.assignee.localeCompare(b.assignee)
      return new Date(a.due).getTime() - new Date(b.due).getTime()
    })

  const handleOpenDetail = () => {
    showToast('Task detail coming soon', 'info', 1500)
  }

  const handleDelete = (id: number, title: string) => {
    deleteWithUndo(id, title)
  }

  return (
    <div className={styles.page}>
      <TasksPageHeader view={view} onViewChange={setView} />
      <TaskStatsRow activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      <TasksToolbar
        activeSort={activeSort}
        onSortChange={setActiveSort}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {view === 'list' ? (
        <TaskListView tasks={filteredTasks} onOpenDetail={handleOpenDetail} onDelete={handleDelete} />
      ) : (
        <TaskBoardView tasks={filteredTasks} onOpenDetail={handleOpenDetail} />
      )}
      <AddTaskModal />
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/pages/TasksPage.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Update `App.test.tsx`**

The existing Tasks-page navigation test (`'navigates to the Tasks page when the Tasks nav link is clicked'`) currently asserts `getByRole('heading', { name: 'Tasks' })` against the old stub's `<h1>`. `TasksPage` has no literal "Tasks" heading now — it has "My Tasks". Update the assertion:

```tsx
  it('navigates to the Tasks page when the Tasks nav link is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('link', { name: 'Tasks' }))
    expect(screen.getByText('My Tasks')).toBeInTheDocument()
  })
```

- [ ] **Step 7: Run the full test suite, typecheck, and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all pass.

- [ ] **Step 8: Manually verify in the browser**

Run: `pnpm dev`, navigate to Tasks. Confirm: stat chips filter the list and update the active chip's border; Sort dropdown re-sorts without changing its own "Sort" label; Filter dropdown's checkboxes toggle freely but don't actually filter anything (matches original); search filters live as you type; List view groups render collapsed/expanded correctly and the group Add button and each row's Edit/Delete buttons work without also opening detail (there is no detail view yet — confirm the "Task detail coming soon" toast fires instead); Board view shows all four columns with correct per-column counts and empty-state text where applicable; clicking Edit pre-fills the Add/Edit modal correctly and Save Changes updates the row in place; clicking Delete shows the 5-second countdown toast with a working Undo button, and confirms the row actually reappears in its original group position if Undo is clicked before the countdown ends.

- [ ] **Step 9: Append the Phase 3.2 scope note and any new deferred items to the backlog**

Append to `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`:

```markdown

## From Phase 3.2 (Tasks page — list/board views)

- [ ] **Task Stats Row counts are live, not the original's mismatched hardcoded literals** — the original's `chip-total`/`chip-inprogress`/etc. (`index.html:3313-3337`) are static `15/4/5/3/3`, unrelated to `tasksData`'s actual distribution (a demo-data mismatch, same flavor as the Dashboard KPI-45 quirk). This port computes them live from `tasksStore`, a deliberate departure from strict parity — flagged here per the project's convention for any such departure, not because it's in doubt.
- [ ] **Task detail (row click / kanban card click) shows a placeholder toast, not a detail view** — Phase 3.3 will replace `TasksPage`'s `handleOpenDetail` with the real task detail side panel. Until then, `TaskRow`/`TaskBoardCard` correctly call `onOpenDetail(id)`, they just don't have anywhere real to send it yet.
- [ ] *(Add any other deferred/parked items discovered during this phase's task-review loop here, following the same format as prior phases' entries — do not skip this step if any Minor findings were parked.)*
```

- [ ] **Step 10: Commit**

```bash
git add src/pages/TasksPage.tsx src/pages/TasksPage.module.css src/pages/TasksPage.test.tsx src/App.test.tsx
git commit -m "feat: assemble TasksPage with filter/sort/search orchestration"
cd "C:\Users\HP\Downloads\Chronoloop dashboard"
git add docs/superpowers/backlog.md
git commit -m "docs: flag Phase 3.2 Tasks-page parity notes in the backlog"
```

---

## Phase 3.2 Exit Checklist

- [ ] `pnpm dev` shows a Tasks page matching `index.html`'s list/board views, toolbar, and stat chips, per Task 9 Step 8.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass on the final state.
- [ ] Dashboard's existing tests (`DashboardHeader.test.tsx`, `DashboardPage.test.tsx`, etc.) still pass unchanged in behavior after Task 2's `AddTaskModal` relocation.
- [ ] `docs/superpowers/backlog.md` (old repo) has the new Phase 3.2 entries from Task 9 Step 9.
- [ ] **Next up: Phase 3.3 (Task Detail side panel)** — start by re-reading `index.html:5499-5520` (markup) and `:7211-7364` (`openTaskDetail`/`closeTaskDetail` plus subtask/comment/description-edit handlers) before writing that plan. `tasksStore` will likely need further extension (subtask add/toggle, comment add, description update) — verify against the actual source rather than assuming scope, same as this plan did for `updateTask`/`removeTask`/`setTaskStatus`. Phase 3.3's `TasksPage` integration is a small, surgical change: swap the placeholder `handleOpenDetail` for the real panel-opening call.
- [ ] **After Phase 3.3**, design doc's page order continues: Projects → Sprints → Calendar → Team → Reports → Integrations → Settings.
