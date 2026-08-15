# ChronoLoop Frontend Rewrite — Phase 3.3 (Task Detail Side Panel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Task Detail side panel — the right-sliding panel opened by clicking a task row (list view) or a kanban card (board view) — from `index.html` into the new React codebase, with full visual/behavioral parity: status badge, editable meta grid, tags, an inline-editable description, a sub-task checklist with add/toggle, a conditional attachments list, and a comment thread with add. Replaces `TasksPage`'s current placeholder `handleOpenDetail` (which only shows a "Task detail coming soon" toast).

**Architecture:** A new `taskDetailStore` (Zustand) tracks which task id, if any, is open — mirroring the existing `taskModalStore` pattern. `tasksStore` gains four small mutation actions (`addSubtask`, `toggleSubtask`, `updateTaskDescription`, `addComment`). The panel itself is `src/components/tasks/TaskDetailPanel.tsx`, composed from four smaller pieces (`TaskDetailBody`, `TaskDetailSubtasks`, `TaskDetailAttachments`, `TaskDetailActivity`) — each independently testable, matching how Phase 3.1/3.2 split large sections into small files rather than one page-sized component. `TaskAssigneeBubble` (Phase 3.2) gets a small, backward-compatible extension.

**Tech Stack:** Existing stack (Vite, React 18, TypeScript strict, Zustand, CSS Modules, Vitest + RTL, lucide-react). No new dependencies — the panel is a hand-built overlay + fixed panel (not built on the `Modal`/Radix `Dialog` primitive; see the Global Constraints note on why).

**Spec:** `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\specs\2026-08-10-chronoloop-frontend-rewrite-design.md`

## Global Constraints

- **Location:** `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`. Never modify `C:\Users\HP\Downloads\Chronoloop dashboard\` itself (`index.html`, `design.md`, assets) — `docs/` in that repo is the shared planning-docs location and is fair game (Task 6 of this plan updates the backlog there).
- **Package manager:** pnpm. **TypeScript strict mode, no `any`.**
- **Source of truth for this phase:** `index.html:5499-5520` (the panel's static markup shell) and `index.html:7210-7399` (`openTaskDetail`, `closeTaskDetail`, and the subtask/comment/description-edit handlers). CSS: `index.html:999-1050`.
- **Pixel/behavior parity is required, with these deliberate, explicitly-flagged exceptions:**
  - **Escape now closes the panel — the original never wires this.** The original's single global `keydown`/`Escape` handler (`index.html:6330-6339`) closes dropdowns, modal overlays, the context menu, and the calendar task-popup, but never touches `task-detail-panel` — in the shipped app, Escape does nothing while the panel is open; only clicking the overlay or the explicit close (X) button closes it. The design doc's non-negotiable code-quality standard (§4a: "full keyboard navigation ... Escape to close") takes precedence here, the same way Phase 3.1's `CriticalProjectsPanel` made its three-dot menu always-visible instead of hover-only for keyboard reachability. Add Escape-to-close; record it in the backlog as a deliberate deviation, not an oversight.
  - **The overlay is a real click-blocker, not a `useOutsideClick`-style listener.** The original's `.detail-panel-overlay` is a full-viewport `position:fixed` element with `pointer-events:all` while `.open`, sitting at `z-index:250` (the panel itself is `z-index:260`) — while the panel is open, a click on anything else on the page (including a different task row) hits the overlay first and closes the panel; it does **not** also open whatever was clicked underneath in that same click. Implement the overlay as a real DOM element with `onClick={close}`, not via the existing `useOutsideClick` hook (that hook's `document`-level `mousedown` listener would let clicks fall through to the element underneath, letting a click on a different row both close and immediately reopen the panel with different content in one click — a real behavior change from the original's "one click closes, a second click opens the new task" flow). This is why `useOutsideClick` (used by `TaskPopup` in Phase 3.1) isn't reused here — that component has no blocking overlay of its own, so pointerdown-outside is its only signal; this panel already gets outside-click-to-close for free from the overlay's own `onClick`.
  - **The task title is never inline-editable — only the description is.** `index.html:1013`'s `.detail-title[contenteditable="true"]:focus` CSS rule is dead code in the original itself: `openTaskDetail` (`index.html:7228`) renders the title as a plain non-editable `<div>`; only `#detail-desc-field` (`index.html:7263`) carries `contenteditable="true"`. Do not add title editing — the CSS rule exists in the original with nothing that ever applies it.
  - **The description field's "placeholder" is real content, not an HTML placeholder — preserve that quirk.** When `task.description` is empty, the original renders the literal string `Click to add a description...` as the `contenteditable` div's actual text content (`index.html:7263`). Its blur handler unconditionally saves `descField.textContent.trim()` (`index.html:7358-7361`) — so a user who clicks into an empty description and blurs without typing anything saves the placeholder text itself as the real description. This is a genuine (if accidental-looking) behavior in the shipped app; port it exactly, don't "fix" it into a real non-submitting placeholder.
  - **The status badge (`detail-status-badge`) has `cursor:pointer` styling but no click handler in the original** (`index.html:1045`, same class already noted as dead/non-interactive for the list-row equivalent in the Phase 3.2 backlog entry). Do not add a status-change dropdown here either.
  - **Comment avatars always use one hardcoded blue→purple gradient** (`index.html:7318`: `linear-gradient(135deg,#4A90FF,#A855F7)`), regardless of which author wrote the comment — unlike task-assignee bubbles, which are colored per-assignee via `task.aColor`. Preserve the single hardcoded gradient for every comment avatar.
  - **The assignee-code→full-name lookup (`AS`/`RD`/`MV`/`RC` → full name) is duplicated a third time here**, separately from `AddTaskModal`'s own copy (`ASSIGNEE_NAME_BY_CODE`, Phase 3.2) — the original itself inlines a fresh literal object at `openTaskDetail` (`index.html:7237`) rather than sharing one with its Add/Edit modal code. This is the same class of intentional-looking duplication already flagged for the 4-project-list (Phase 3.2 backlog); don't extract a shared constant.
  - **Tags render in full here, unlike the list/board rows.** `TaskTagList` (Phase 3.2) truncates to `max` (default 2) tags for list/board rows; the detail panel's original markup renders every tag with no slicing and larger padding/font (`index.html:7259`: `font-size:11px;padding:3px 10px` vs. `TaskTagList`'s baked-in 9px/2px 7px). Because both the truncation behavior and the visual sizing differ, this phase does not reuse `TaskTagList` for the detail panel's tag row — it renders its own untruncated tag list locally (Task 4).
- **`TaskAssigneeBubble`'s `size` prop widens from the literal union `26 | 22` to `number`, and gains an optional `fontSize?: number`** (Task 2) — the original itself pairs "22px width" with two different font-sizes at two different call sites (board card vs. this panel's meta grid), so inferring font-size purely from size (the Phase 3.2 behavior) can't cover the panel's 22px/9px cell or the comment avatars' new 28px/10px case. Existing call sites (`TaskRow`, `TaskBoardCard`) keep working unchanged since they don't pass `fontSize` and the size numbers they already pass (26, 22) remain valid `number`s.
- **Reuse Phase 1/2/3.1/3.2 primitives where the shape actually matches; don't force a fit where it doesn't.** `TaskAssigneeBubble`/`Avatar` are reused throughout. The `Modal`/`Badge` primitives are **not** reused for the panel shell or status pill — `Modal` is a centered Radix `Dialog` with a header/footer shape that doesn't match a full-height, right-docked sliding panel with icon-only header actions and no title/subtitle slots, and `Badge`'s base CSS (9px pill, `2px 5px` padding, fixed dark background) would need nearly every property overridden to become the four-variant, icon+label `detail-status-badge` — the same "don't fight the primitive" reasoning already applied to `CalendarWidget`/`TaskPopup` in Phase 3.1.
- **Verification gate for the whole phase:** `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass after every task.

---

### Task 1: `taskDetailStore` + `tasksStore` mutation actions for subtasks/description/comments

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\taskDetailStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\taskDetailStore.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\tasksStore.ts`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\tasksStore.test.tsx`

**Interfaces:**
- Produces: `useTaskDetailStore` exposing `{ openTaskId: number | null; open: (id: number) => void; close: () => void }`. `useTasksStore` gains `addSubtask(id: number, text: string): void`, `toggleSubtask(id: number, index: number): void`, `updateTaskDescription(id: number, description: string): void`, `addComment(id: number, text: string): void`. `addComment` always writes `{ author: 'You', text, time: 'Just now' }` (matches `index.html:7392`'s hardcoded literals — this is the same "always 'You'/'Just now'" behavior noted for parity, no current-user lookup exists anywhere in the original).
- Consumes: existing `Task`, `TaskSubtask`, `TaskComment` types (`src/types/task.ts`).

Ported from `index.html:7327-7341` (add-subtask push + toggle), `:7358-7361` (description blur-save), `:7390-7398` (comment push).

- [ ] **Step 1: Write the failing tests**

```ts
// src/store/taskDetailStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskDetailStore } from './taskDetailStore'

describe('taskDetailStore', () => {
  beforeEach(() => {
    useTaskDetailStore.setState({ openTaskId: null })
  })

  it('open sets openTaskId to the given id', () => {
    useTaskDetailStore.getState().open(5)
    expect(useTaskDetailStore.getState().openTaskId).toBe(5)
  })

  it('close resets openTaskId to null', () => {
    useTaskDetailStore.getState().open(5)
    useTaskDetailStore.getState().close()
    expect(useTaskDetailStore.getState().openTaskId).toBeNull()
  })
})
```

```tsx
// src/store/tasksStore.test.tsx — ADD to the existing describe block, do not remove existing tests
describe('tasksStore — Phase 3.3 extensions', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
  })

  it('addSubtask appends a new, not-done subtask to the given task', () => {
    const before = useTasksStore.getState().tasks.find((t) => t.id === 3)!.subtasks.length
    useTasksStore.getState().addSubtask(3, 'New subtask')
    const after = useTasksStore.getState().tasks.find((t) => t.id === 3)!.subtasks
    expect(after).toHaveLength(before + 1)
    expect(after.at(-1)).toEqual({ t: 'New subtask', done: false })
  })

  it('toggleSubtask flips the done flag at the given index, leaving other subtasks untouched', () => {
    useTasksStore.getState().toggleSubtask(1, 2)
    const subtasks = useTasksStore.getState().tasks.find((t) => t.id === 1)!.subtasks
    expect(subtasks[2].done).toBe(true)
    expect(subtasks[0].done).toBe(true)
    expect(subtasks[1].done).toBe(true)
    useTasksStore.getState().toggleSubtask(1, 2)
    expect(useTasksStore.getState().tasks.find((t) => t.id === 1)!.subtasks[2].done).toBe(false)
  })

  it('updateTaskDescription replaces only the description field', () => {
    useTasksStore.getState().updateTaskDescription(2, 'Updated description text')
    const task = useTasksStore.getState().tasks.find((t) => t.id === 2)!
    expect(task.description).toBe('Updated description text')
    expect(task.title).toBe('Develop Landing Page for Eatz Website')
  })

  it('addComment appends a comment authored by "You" with time "Just now"', () => {
    const before = useTasksStore.getState().tasks.find((t) => t.id === 3)!.comments.length
    useTasksStore.getState().addComment(3, 'Looks good')
    const comments = useTasksStore.getState().tasks.find((t) => t.id === 3)!.comments
    expect(comments).toHaveLength(before + 1)
    expect(comments.at(-1)).toEqual({ author: 'You', text: 'Looks good', time: 'Just now' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/store/taskDetailStore.test.tsx src/store/tasksStore.test.tsx`
Expected: FAIL — `taskDetailStore` module doesn't exist; the four new `tasksStore` actions don't exist.

- [ ] **Step 3: Create `taskDetailStore.ts`**

```ts
// src/store/taskDetailStore.ts
import { create } from 'zustand'

interface TaskDetailState {
  openTaskId: number | null
  open: (id: number) => void
  close: () => void
}

export const useTaskDetailStore = create<TaskDetailState>((set) => ({
  openTaskId: null,
  open: (id) => set({ openTaskId: id }),
  close: () => set({ openTaskId: null }),
}))
```

- [ ] **Step 4: Extend `tasksStore.ts`**

Add to the `TasksState` interface:

```ts
  addSubtask: (id: number, text: string) => void
  toggleSubtask: (id: number, index: number) => void
  updateTaskDescription: (id: number, description: string) => void
  addComment: (id: number, text: string) => void
```

Add to the store body (alongside the existing actions):

```ts
  addSubtask: (id, text) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, subtasks: [...task.subtasks, { t: text, done: false }] } : task,
      ),
    }))
  },
  toggleSubtask: (id, index) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, subtasks: task.subtasks.map((s, i) => (i === index ? { ...s, done: !s.done } : s)) }
          : task,
      ),
    }))
  },
  updateTaskDescription: (id, description) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, description } : task)),
    }))
  },
  addComment: (id, text) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, comments: [...task.comments, { author: 'You', text, time: 'Just now' }] }
          : task,
      ),
    }))
  },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/store/taskDetailStore.test.tsx src/store/tasksStore.test.tsx`
Expected: PASS, all tests (existing + new).

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/store/taskDetailStore.ts src/store/taskDetailStore.test.tsx src/store/tasksStore.ts src/store/tasksStore.test.tsx
git commit -m "feat: add taskDetailStore and subtask/description/comment mutations to tasksStore"
```

---

### Task 2: Widen `TaskAssigneeBubble`; build `TaskDetailAttachments` and `TaskDetailActivity`

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskAssigneeBubble.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskAssigneeBubble.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailAttachments.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailAttachments.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailAttachments.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailActivity.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailActivity.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailActivity.test.tsx`

**Interfaces:**
- Produces: `<TaskAssigneeBubble assignee size fontSize? />` (widened, see Global Constraints). `<TaskDetailAttachments attachments={TaskAttachment[]} />` — renders `null` when `attachments.length === 0` (whole section omitted, not an empty-state message — this differs from Subtasks/Activity below, which always render a header). `<TaskDetailActivity comments={TaskComment[]} />` — renders "No comments yet." when empty.
- Consumes: `Task`, `TaskAttachment`, `TaskComment` types; `useToastStore` (Attachments' download button toasts, matching `index.html:7291`'s `onclick="showToast('Downloading ${a.name}...','info')"`).

Ported from `index.html:7284-7297` (attachments, icon/color maps) and `:7299-7311` (activity/comments list).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/tasks/TaskAssigneeBubble.test.tsx — ADD to the existing describe block
  it('accepts an explicit fontSize override independent of size', () => {
    render(<TaskAssigneeBubble assignee="AS" avatarSrc={undefined} color="linear-gradient(135deg,#4A90FF,#2563eb)" size={28} fontSize={10} />)
    expect(screen.getByText('AS')).toHaveStyle({ fontSize: '10px' })
  })

  it('falls back to the existing size-derived fontSize when none is given', () => {
    render(<TaskAssigneeBubble assignee="AS" avatarSrc={undefined} color="linear-gradient(135deg,#4A90FF,#2563eb)" size={26} />)
    expect(screen.getByText('AS')).toHaveStyle({ fontSize: '9px' })
  })
```

```tsx
// src/components/tasks/TaskDetailAttachments.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskDetailAttachments } from './TaskDetailAttachments'

describe('TaskDetailAttachments', () => {
  it('renders nothing when there are no attachments', () => {
    const { container } = render(<TaskDetailAttachments attachments={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders each attachment with its name and size', () => {
    render(<TaskDetailAttachments attachments={[{ name: 'wireframe_v2.fig', size: '1.2 MB', type: 'fig' }]} />)
    expect(screen.getByText('Attachments (1)')).toBeInTheDocument()
    expect(screen.getByText('wireframe_v2.fig')).toBeInTheDocument()
    expect(screen.getByText('1.2 MB')).toBeInTheDocument()
  })
})
```

```tsx
// src/components/tasks/TaskDetailActivity.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskDetailActivity } from './TaskDetailActivity'

describe('TaskDetailActivity', () => {
  it('shows "No comments yet." when there are no comments', () => {
    render(<TaskDetailActivity comments={[]} />)
    expect(screen.getByText('No comments yet.')).toBeInTheDocument()
  })

  it('renders each comment with author, text, and time', () => {
    render(<TaskDetailActivity comments={[{ author: 'Aspen H.', text: 'Looks great!', time: '2h ago' }]} />)
    expect(screen.getByText('Aspen H.')).toBeInTheDocument()
    expect(screen.getByText('Looks great!')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/tasks/TaskAssigneeBubble.test.tsx src/components/tasks/TaskDetailAttachments.test.tsx src/components/tasks/TaskDetailActivity.test.tsx`
Expected: FAIL — `fontSize` prop not accepted (TS error surfaces as a test failure once run through Vitest's esbuild transform ignoring types, so the runtime assertion fails instead); the two new components don't exist.

- [ ] **Step 3: Widen `TaskAssigneeBubble.tsx`**

```tsx
// src/components/tasks/TaskAssigneeBubble.tsx
import { Avatar } from '../ui/Avatar'
import styles from './TaskAssigneeBubble.module.css'

interface TaskAssigneeBubbleProps {
  assignee: string
  avatarSrc: string | undefined
  color: string
  size: number
  fontSize?: number
}

export function TaskAssigneeBubble({ assignee, avatarSrc, color, size, fontSize }: TaskAssigneeBubbleProps) {
  return (
    <Avatar
      src={avatarSrc}
      name={assignee}
      className={styles.bubble}
      style={{ width: size, height: size }}
      fallbackStyle={{ background: color, fontSize: fontSize ?? (size === 22 ? 8 : 9) }}
    />
  )
}
```

- [ ] **Step 4: Create `TaskDetailAttachments.module.css`**

Ported from `index.html:1038-1044`:

```css
.label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.list { display: flex; flex-direction: column; gap: 6px; }
.item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 7px; background: var(--bg-input); border: 1px solid var(--border-subtle); transition: background var(--duration-fast); }
.item:hover { background: var(--bg-card-hover); }
.icon { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon svg { width: 14px; height: 14px; }
.info { flex: 1; min-width: 0; }
.name { font-size: 12px; color: var(--text-primary); font-weight: 500; }
.size { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
.downloadBtn { width: 26px; height: 26px; border-radius: 5px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background var(--duration-fast), color var(--duration-fast); }
.downloadBtn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
```

- [ ] **Step 5: Implement `TaskDetailAttachments.tsx`**

```tsx
// src/components/tasks/TaskDetailAttachments.tsx
import { Figma, FileText, Archive, FileCode, Database, File as FileIcon, Download } from 'lucide-react'
import type { TaskAttachment } from '../../types/task'
import { useToastStore } from '../../store/toastStore'
import styles from './TaskDetailAttachments.module.css'

const ICON_MAP = { fig: Figma, pdf: FileText, zip: Archive, yml: FileCode, sql: Database } as const
const BG_COLOR: Record<string, string> = {
  fig: 'rgba(168,85,247,0.15)',
  pdf: 'rgba(255,77,77,0.15)',
  zip: 'rgba(234,179,8,0.15)',
  yml: 'rgba(74,144,255,0.15)',
  sql: 'rgba(0,212,170,0.15)',
}
const ICON_COLOR: Record<string, string> = {
  fig: 'var(--accent-purple)',
  pdf: 'var(--accent-red)',
  zip: 'var(--accent-yellow)',
  yml: 'var(--accent-blue)',
  sql: 'var(--accent-teal)',
}

interface TaskDetailAttachmentsProps {
  attachments: TaskAttachment[]
}

export function TaskDetailAttachments({ attachments }: TaskDetailAttachmentsProps) {
  const showToast = useToastStore((s) => s.showToast)
  if (attachments.length === 0) return null

  return (
    <div>
      <div className={styles.label}>Attachments ({attachments.length})</div>
      <div className={styles.list}>
        {attachments.map((a) => {
          const Icon = ICON_MAP[a.type as keyof typeof ICON_MAP] ?? FileIcon
          return (
            <div key={a.name} className={styles.item}>
              <div className={styles.icon} style={{ background: BG_COLOR[a.type] ?? 'var(--bg-input)' }}>
                <Icon aria-hidden="true" style={{ color: ICON_COLOR[a.type] ?? 'var(--text-muted)' }} />
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{a.name}</div>
                <div className={styles.size}>{a.size}</div>
              </div>
              <button
                type="button"
                className={styles.downloadBtn}
                aria-label={`Download ${a.name}`}
                onClick={() => showToast(`Downloading ${a.name}...`, 'info')}
              >
                <Download aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `TaskDetailActivity.module.css`**

Ported from `index.html:1030-1037`:

```css
.label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.empty { font-size: 12px; color: var(--text-muted); }
.item { display: flex; gap: 10px; }
.bubble { flex: 1; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 0 8px 8px 8px; padding: 10px 12px; font-size: 12px; color: var(--text-primary); line-height: 1.5; }
.author { font-weight: 600; font-size: 11px; color: var(--text-primary); margin-bottom: 3px; }
.time { font-size: 10px; color: var(--text-muted); margin-top: 4px; }
```

- [ ] **Step 7: Implement `TaskDetailActivity.tsx`**

```tsx
// src/components/tasks/TaskDetailActivity.tsx
import type { TaskComment } from '../../types/task'
import { TaskAssigneeBubble } from './TaskAssigneeBubble'
import styles from './TaskDetailActivity.module.css'

interface TaskDetailActivityProps {
  comments: TaskComment[]
}

export function TaskDetailActivity({ comments }: TaskDetailActivityProps) {
  return (
    <div>
      <div className={styles.label}>Activity</div>
      <div className={styles.list}>
        {comments.length === 0 ? (
          <div className={styles.empty}>No comments yet.</div>
        ) : (
          comments.map((c, i) => (
            <div key={`${c.author}-${i}`} className={styles.item}>
              <TaskAssigneeBubble
                assignee={c.author}
                avatarSrc={undefined}
                color="linear-gradient(135deg,#4A90FF,#A855F7)"
                size={28}
                fontSize={10}
              />
              <div className={styles.bubble}>
                <div className={styles.author}>{c.author}</div>
                {c.text}
                <div className={styles.time}>{c.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

(Comments have no stable `id` in `TaskComment` — same as the original, which re-renders the whole list from scratch on every change — so the list key is `` `${author}-${index}` ``, matching how `TaskDetailSubtasks` (Task 3) keys by index too.)

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm vitest run src/components/tasks/TaskAssigneeBubble.test.tsx src/components/tasks/TaskDetailAttachments.test.tsx src/components/tasks/TaskDetailActivity.test.tsx`
Expected: PASS, all tests (existing `TaskAssigneeBubble` tests + new ones).

- [ ] **Step 9: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 10: Commit**

```bash
git add src/components/tasks/TaskAssigneeBubble.tsx src/components/tasks/TaskAssigneeBubble.test.tsx src/components/tasks/TaskDetailAttachments.tsx src/components/tasks/TaskDetailAttachments.module.css src/components/tasks/TaskDetailAttachments.test.tsx src/components/tasks/TaskDetailActivity.tsx src/components/tasks/TaskDetailActivity.module.css src/components/tasks/TaskDetailActivity.test.tsx
git commit -m "feat: widen TaskAssigneeBubble sizing, add TaskDetailAttachments and TaskDetailActivity"
```

---

### Task 3: `TaskDetailSubtasks`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailSubtasks.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailSubtasks.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailSubtasks.test.tsx`

**Interfaces:**
- Produces: `<TaskDetailSubtasks subtasks={TaskSubtask[]} onToggle={(index: number) => void} onAdd={(text: string) => void} />`. Owns its own add-subtask input text as local state; calls `onAdd` with the trimmed text and clears the input, matching `index.html:7276-7282`'s `addSubtaskInput.value = ''` after push.
- Consumes: `TaskSubtask` type.

Ported from `index.html:7248-7256` (progress bar), `:7257-7262` (subtask list markup), `:7264-7282` (add-subtask input + Enter-to-submit), `:7286-7290` (toggle handler — note: the comment textarea in `TaskDetailPanel`, Task 5, does **not** get the same Enter-to-submit treatment; only this subtask input does, matching the original's asymmetry — `detail-comment-input` has no keydown listener at all).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/tasks/TaskDetailSubtasks.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailSubtasks } from './TaskDetailSubtasks'

const SUBTASKS = [
  { t: 'Build hero section', done: true },
  { t: 'Add CTA buttons', done: false },
]

describe('TaskDetailSubtasks', () => {
  it('shows the done/total count and computed percentage', () => {
    render(<TaskDetailSubtasks subtasks={SUBTASKS} onToggle={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('Sub-tasks (1/2)')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows 0% with no divide-by-zero when there are no subtasks', () => {
    render(<TaskDetailSubtasks subtasks={[]} onToggle={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('Sub-tasks (0/0)')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('clicking a subtask checkbox calls onToggle with its index', async () => {
    const onToggle = vi.fn()
    render(<TaskDetailSubtasks subtasks={SUBTASKS} onToggle={onToggle} onAdd={vi.fn()} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /reopen/i }))
    expect(onToggle).toHaveBeenCalledWith(0)
  })

  it('typing text and pressing Enter calls onAdd and clears the input', async () => {
    const onAdd = vi.fn()
    render(<TaskDetailSubtasks subtasks={SUBTASKS} onToggle={vi.fn()} onAdd={onAdd} />)
    const input = screen.getByPlaceholderText('Add a subtask...')
    await userEvent.type(input, 'New subtask{Enter}')
    expect(onAdd).toHaveBeenCalledWith('New subtask')
    expect(input).toHaveValue('')
  })

  it('clicking the add button with empty input does not call onAdd', async () => {
    const onAdd = vi.fn()
    render(<TaskDetailSubtasks subtasks={SUBTASKS} onToggle={vi.fn()} onAdd={onAdd} />)
    await userEvent.click(screen.getByLabelText('Add subtask'))
    expect(onAdd).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/tasks/TaskDetailSubtasks.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `TaskDetailSubtasks.module.css`**

Ported from `index.html:1021-1029` (list/item/check/text) and `:1022` (progress wrap; the track/fill classes reuse the same visual language as `progress-track`/`progress-fill` used elsewhere in the original, transcribed directly here since this file owns its own CSS per the established per-component convention):

```css
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0; }
.pct { font-size: 10px; color: var(--text-muted); }
.progressWrap { margin-bottom: 8px; }
.track { height: 5px; margin-bottom: 10px; border-radius: 4px; background: var(--bg-input); overflow: hidden; }
.fill { height: 100%; background: var(--accent-teal); transition: width 400ms var(--ease-out); }
.list { display: flex; flex-direction: column; gap: 6px; }
.item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 7px; background: var(--bg-input); border: 1px solid var(--border-subtle); transition: background var(--duration-fast); }
.item:hover { background: var(--bg-card-hover); }
.check { width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--border-default); background: transparent; padding: 0; cursor: pointer; flex-shrink: 0; }
.check[data-done="true"] { background: var(--accent-green); border-color: var(--accent-green); }
.text { font-size: 12px; color: var(--text-primary); flex: 1; }
.text[data-done="true"] { text-decoration: line-through; color: var(--text-muted); }
.addRow { display: flex; gap: 8px; margin-top: 8px; }
.input { flex: 1; height: 32px; padding: 6px 10px; font-size: 12px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary); font-family: 'DM Sans', sans-serif; }
.input::placeholder { color: var(--text-muted); }
.input:focus { outline: none; border-color: var(--accent-blue); }
.addBtn { height: 32px; padding: 0 10px; flex-shrink: 0; background: var(--accent-blue); color: #fff; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
```

- [ ] **Step 4: Implement `TaskDetailSubtasks.tsx`**

```tsx
// src/components/tasks/TaskDetailSubtasks.tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { TaskSubtask } from '../../types/task'
import styles from './TaskDetailSubtasks.module.css'

interface TaskDetailSubtasksProps {
  subtasks: TaskSubtask[]
  onToggle: (index: number) => void
  onAdd: (text: string) => void
}

export function TaskDetailSubtasks({ subtasks, onToggle, onAdd }: TaskDetailSubtasksProps) {
  const [text, setText] = useState('')
  const doneCount = subtasks.filter((s) => s.done).length
  const pct = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0

  const handleAdd = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setText('')
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.label}>Sub-tasks ({doneCount}/{subtasks.length})</div>
        <span className={styles.pct}>{pct}%</span>
      </div>
      <div className={styles.progressWrap}>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className={styles.list}>
        {subtasks.map((s, i) => (
          <div key={i} className={styles.item}>
            <button
              type="button"
              role="checkbox"
              aria-checked={s.done}
              aria-label={s.done ? `Reopen "${s.t}"` : `Mark "${s.t}" done`}
              className={styles.check}
              data-done={s.done}
              onClick={() => onToggle(i)}
            />
            <span className={styles.text} data-done={s.done}>{s.t}</span>
          </div>
        ))}
      </div>
      <div className={styles.addRow}>
        <input
          type="text"
          className={styles.input}
          placeholder="Add a subtask..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
        />
        <button type="button" className={styles.addBtn} aria-label="Add subtask" onClick={handleAdd}>
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/tasks/TaskDetailSubtasks.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskDetailSubtasks.tsx src/components/tasks/TaskDetailSubtasks.module.css src/components/tasks/TaskDetailSubtasks.test.tsx
git commit -m "feat: add TaskDetailSubtasks with progress bar, toggle, and add-subtask input"
```

---

### Task 4: `TaskDetailBody` (title, meta grid, tags, editable description)

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailBody.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailBody.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailBody.test.tsx`

**Interfaces:**
- Produces: `<TaskDetailBody task={Task} />` — self-contained; reads `updateTaskDescription` directly from `useTasksStore` (matching `TaskRow`'s own convention of importing simple store actions directly rather than prop-drilling them from the page, reserving props for things a page-level hook owns, like `onOpenDetail`/`onDelete` in Task 6).
- Consumes: `Task` type, `formatDue` (`src/lib/taskFormatters.ts`), `TaskAssigneeBubble` (Task 2), `useTasksStore`.

Ported from `index.html:7228` (title), `:7230-7247` (meta grid: assignee/due/priority/project), `:7259` (tags, untruncated — see Global Constraints), `:7263` (description).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/tasks/TaskDetailBody.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskDetailBody } from './TaskDetailBody'
import { useTasksStore } from '../../store/tasksStore'
import { MOCK_TASKS } from '../../data/mockTasks'

describe('TaskDetailBody', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
  })

  it('renders title, resolved assignee name, due date, priority, and project', () => {
    const task = MOCK_TASKS.find((t) => t.id === 1)!
    render(<TaskDetailBody task={task} />)
    expect(screen.getByText(task.title)).toBeInTheDocument()
    expect(screen.getByText('Aspen Herwitz')).toBeInTheDocument()
    expect(screen.getByText('Nov 2')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText(task.project)).toBeInTheDocument()
  })

  it('falls back to the raw assignee code when it has no name mapping', () => {
    const task = { ...MOCK_TASKS[0], assignee: 'ZZ' }
    render(<TaskDetailBody task={task} />)
    expect(screen.getAllByText('ZZ').length).toBeGreaterThan(0)
  })

  it('renders every tag with no truncation', () => {
    const task = { ...MOCK_TASKS[0], tags: ['One', 'Two', 'Three'] }
    render(<TaskDetailBody task={task} />)
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
    expect(screen.getByText('Three')).toBeInTheDocument()
  })

  it('shows placeholder text as content when description is empty, and saves whatever is present on blur', () => {
    const task = { ...MOCK_TASKS[0], description: '' }
    render(<TaskDetailBody task={task} />)
    const desc = screen.getByText('Click to add a description...')
    fireEvent.blur(desc)
    expect(useTasksStore.getState().tasks.find((t) => t.id === task.id)?.description).toBe(
      'Click to add a description...',
    )
  })

  it('saves edited description text on blur', () => {
    const task = MOCK_TASKS.find((t) => t.id === 3)!
    render(<TaskDetailBody task={task} />)
    const desc = screen.getByText(task.description)
    desc.textContent = 'Edited description'
    fireEvent.blur(desc)
    expect(useTasksStore.getState().tasks.find((t) => t.id === 3)?.description).toBe('Edited description')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/tasks/TaskDetailBody.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `TaskDetailBody.module.css`**

Ported from `index.html:1012-1020` (title/description) and `:1014-1018` (meta grid), plus `:962-965` (priority pill values) and a locally-owned tag style matching the detail-panel's own font-size/padding override (`index.html:7259`, see Global Constraints on why `TaskTagList`'s classes aren't reused):

```css
.title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
.label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cell { display: flex; flex-direction: column; gap: 5px; }
.val { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-primary); padding: 6px 10px; border-radius: 7px; background: var(--bg-input); border: 1px solid var(--border-subtle); }
.val svg { width: 13px; height: 13px; color: var(--text-muted); flex-shrink: 0; }
.priorityVal { display: inline-flex; width: fit-content; }
.priorityVal.high { color: var(--accent-red); }
.priorityVal.medium { color: var(--accent-yellow); }
.priorityVal.low { color: var(--accent-green); }
.projectText { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tagList { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 11px; padding: 3px 10px; border-radius: 4px; font-weight: 600; letter-spacing: 0.04em; background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-secondary); white-space: nowrap; }
.desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; min-height: 64px; outline: none; transition: border-color var(--duration-fast); }
.desc:focus { border-color: var(--accent-blue); }
```

- [ ] **Step 4: Implement `TaskDetailBody.tsx`**

```tsx
// src/components/tasks/TaskDetailBody.tsx
import { Calendar, Briefcase } from 'lucide-react'
import type { Task } from '../../types/task'
import { formatDue } from '../../lib/taskFormatters'
import { useTasksStore } from '../../store/tasksStore'
import { TaskAssigneeBubble } from './TaskAssigneeBubble'
import styles from './TaskDetailBody.module.css'

const ASSIGNEE_NAME_BY_CODE: Record<string, string> = {
  AS: 'Aspen Herwitz',
  RD: 'Roger Dokidis',
  MV: 'Marley Vaccaro',
  RC: 'Ryan Culhane',
}

interface TaskDetailBodyProps {
  task: Task
}

export function TaskDetailBody({ task }: TaskDetailBodyProps) {
  const updateTaskDescription = useTasksStore((s) => s.updateTaskDescription)

  return (
    <>
      <div className={styles.title}>{task.title}</div>

      <div>
        <div className={styles.label}>Details</div>
        <div className={styles.grid}>
          <div className={styles.cell}>
            <div className={styles.label}>Assignee</div>
            <div className={styles.val}>
              <TaskAssigneeBubble
                assignee={task.assignee}
                avatarSrc={undefined}
                color={task.aColor}
                size={22}
                fontSize={9}
              />
              {ASSIGNEE_NAME_BY_CODE[task.assignee] ?? task.assignee}
            </div>
          </div>
          <div className={styles.cell}>
            <div className={styles.label}>Due Date</div>
            <div className={styles.val}><Calendar aria-hidden="true" />{formatDue(task.due)}</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.label}>Priority</div>
            <div className={[styles.val, styles.priorityVal, styles[task.priority]].join(' ')}>
              {task.priority[0].toUpperCase() + task.priority.slice(1)}
            </div>
          </div>
          <div className={styles.cell}>
            <div className={styles.label}>Project</div>
            <div className={styles.val}>
              <Briefcase aria-hidden="true" />
              <span className={styles.projectText}>{task.project}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className={styles.label}>Tags</div>
        <div className={styles.tagList}>
          {task.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
        </div>
      </div>

      <div>
        <div className={styles.label}>Description</div>
        <div
          key={task.id}
          contentEditable
          suppressContentEditableWarning
          className={styles.desc}
          onBlur={(e) => updateTaskDescription(task.id, (e.currentTarget.textContent ?? '').trim())}
        >
          {task.description || 'Click to add a description...'}
        </div>
      </div>
    </>
  )
}
```

`key={task.id}` on the description `<div>` forces React to remount just that node (not the rest of `TaskDetailBody`) whenever the panel switches to a different task, so its `contentEditable` initial content is always freshly derived from the new task without ever letting React touch a mounted `contentEditable` element's children afterward — the same "remount instead of imperatively syncing into a live DOM node" reasoning `AddTaskModal` used (Phase 3.2) to dodge `react-hooks/set-state-in-effect`, applied here at the single-node level instead of the whole form.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/tasks/TaskDetailBody.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskDetailBody.tsx src/components/tasks/TaskDetailBody.module.css src/components/tasks/TaskDetailBody.test.tsx
git commit -m "feat: add TaskDetailBody with meta grid, tags, and editable description"
```

---

### Task 5: `TaskDetailPanel` shell

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailPanel.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailPanel.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\tasks\TaskDetailPanel.test.tsx`

**Interfaces:**
- Produces: `<TaskDetailPanel onDelete={(id: number, title: string) => void} />` — reads which task is open from `taskDetailStore`; renders nothing visible until a task has been opened at least once (matches the original, where the panel's DOM exists from page load but stays off-screen — see the "when task is null" branch below).
- Consumes: `taskDetailStore` (Task 1), `tasksStore` (`tasks`, `toggleSubtask`, `addSubtask`, `addComment`), `taskModalStore.openEdit` (Phase 3.2), `useToastStore`, `STATUS_CONFIG` (`src/lib/taskFormatters.ts`), `TaskDetailBody` (Task 4), `TaskDetailSubtasks` (Task 3), `TaskDetailAttachments`/`TaskDetailActivity` (Task 2).

Ported from `index.html:5499-5520` (static shell markup), `:7210-7226` (`openTaskDetail`'s status-badge render), `:7365-7370` (`closeTaskDetail`), `:7373-7399` (close/edit/delete/comment-send button wiring).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/tasks/TaskDetailPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailPanel } from './TaskDetailPanel'
import { useTaskDetailStore } from '../../store/taskDetailStore'
import { useTaskModalStore } from '../../store/taskModalStore'
import { useTasksStore } from '../../store/tasksStore'
import { MOCK_TASKS } from '../../data/mockTasks'

describe('TaskDetailPanel', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: MOCK_TASKS, todoKpiOverride: null })
    useTaskDetailStore.setState({ openTaskId: null })
    useTaskModalStore.setState({ isOpen: false, editingTaskId: null })
  })

  it('renders nothing identifiable when no task is open', () => {
    render(<TaskDetailPanel onDelete={vi.fn()} />)
    expect(screen.queryByText(MOCK_TASKS[0].title)).not.toBeInTheDocument()
  })

  it('shows the opened task\'s title and status label', () => {
    useTaskDetailStore.setState({ openTaskId: 1 })
    render(<TaskDetailPanel onDelete={vi.fn()} />)
    expect(screen.getByText(MOCK_TASKS[0].title)).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('clicking the overlay closes the panel', async () => {
    useTaskDetailStore.setState({ openTaskId: 1 })
    render(<TaskDetailPanel onDelete={vi.fn()} />)
    await userEvent.click(screen.getByTestId('task-detail-overlay'))
    expect(useTaskDetailStore.getState().openTaskId).toBeNull()
  })

  it('pressing Escape closes the panel', async () => {
    useTaskDetailStore.setState({ openTaskId: 1 })
    render(<TaskDetailPanel onDelete={vi.fn()} />)
    await userEvent.keyboard('{Escape}')
    expect(useTaskDetailStore.getState().openTaskId).toBeNull()
  })

  it('clicking Edit closes the panel and opens the edit modal for the same task', async () => {
    useTaskDetailStore.setState({ openTaskId: 3 })
    render(<TaskDetailPanel onDelete={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Edit task'))
    expect(useTaskDetailStore.getState().openTaskId).toBeNull()
    expect(useTaskModalStore.getState()).toMatchObject({ isOpen: true, editingTaskId: 3 })
  })

  it('clicking Delete closes the panel and calls onDelete with the task id and title', async () => {
    const onDelete = vi.fn()
    useTaskDetailStore.setState({ openTaskId: 3 })
    render(<TaskDetailPanel onDelete={onDelete} />)
    await userEvent.click(screen.getByLabelText('Delete task'))
    expect(useTaskDetailStore.getState().openTaskId).toBeNull()
    expect(onDelete).toHaveBeenCalledWith(3, MOCK_TASKS.find((t) => t.id === 3)!.title)
  })

  it('typing a comment and clicking send adds it and clears the input', async () => {
    useTaskDetailStore.setState({ openTaskId: 3 })
    render(<TaskDetailPanel onDelete={vi.fn()} />)
    const input = screen.getByPlaceholderText('Add a comment...')
    await userEvent.type(input, 'Nice work')
    await userEvent.click(screen.getByLabelText('Send comment'))
    expect(useTasksStore.getState().tasks.find((t) => t.id === 3)?.comments.at(-1)).toMatchObject({
      author: 'You',
      text: 'Nice work',
    })
    expect(input).toHaveValue('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/tasks/TaskDetailPanel.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `TaskDetailPanel.module.css`**

Ported from `index.html:999-1011` (overlay/panel/header/footer shell) and `:1045-1050` (status badge variants):

```css
.overlay { position: fixed; inset: 0; z-index: 250; background: rgba(0,0,0,0.5); opacity: 0; pointer-events: none; transition: opacity var(--duration-normal); backdrop-filter: blur(2px); }
.overlay[data-open="true"] { opacity: 1; pointer-events: all; }
.panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 260; width: 440px; max-width: 95vw; background: var(--bg-card); border-left: 1px solid var(--border-default); display: flex; flex-direction: column; transform: translateX(100%); transition: transform var(--duration-normal) var(--ease-out); box-shadow: -8px 0 40px rgba(0,0,0,0.4); }
.panel[data-open="true"] { transform: translateX(0); }
.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; gap: 10px; }
.actions { display: flex; align-items: center; gap: 6px; }
.headerBtn { width: 30px; height: 30px; border-radius: 8px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--duration-fast), color var(--duration-fast); flex-shrink: 0; }
.headerBtn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.headerBtn svg { width: 16px; height: 16px; }
.deleteBtn { color: var(--accent-red); }
.body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
.body::-webkit-scrollbar { width: 4px; }
.body::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }
.footer { padding: 14px 20px; border-top: 1px solid var(--border-subtle); display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0; }
.footerAvatar { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
.commentInput { flex: 1; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary); font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 9px 12px; resize: none; height: 36px; transition: border-color var(--duration-fast), height var(--duration-fast); }
.commentInput:focus { outline: none; border-color: var(--accent-blue); height: 72px; }
.commentInput::placeholder { color: var(--text-muted); }
.sendBtn { height: 34px; padding: 0 12px; flex-shrink: 0; background: var(--accent-blue); color: #fff; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.statusBadge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.statusBadge svg { width: 12px; height: 12px; }
.todo { background: rgba(74,144,255,0.1); color: var(--accent-blue); border: 1px solid rgba(74,144,255,0.25); }
.inProgress { background: rgba(234,179,8,0.1); color: var(--accent-yellow); border: 1px solid rgba(234,179,8,0.25); }
.done { background: rgba(34,197,94,0.1); color: var(--accent-green); border: 1px solid rgba(34,197,94,0.25); }
.overdue { background: rgba(255,77,77,0.1); color: var(--accent-red); border: 1px solid rgba(255,77,77,0.25); }
```

- [ ] **Step 4: Implement `TaskDetailPanel.tsx`**

```tsx
// src/components/tasks/TaskDetailPanel.tsx
import { useEffect, useState } from 'react'
import { Circle, Edit2, Trash2, X, Send } from 'lucide-react'
import { useTaskDetailStore } from '../../store/taskDetailStore'
import { useTasksStore } from '../../store/tasksStore'
import { useTaskModalStore } from '../../store/taskModalStore'
import { useToastStore } from '../../store/toastStore'
import { STATUS_CONFIG } from '../../lib/taskFormatters'
import { TaskDetailBody } from './TaskDetailBody'
import { TaskDetailSubtasks } from './TaskDetailSubtasks'
import { TaskDetailAttachments } from './TaskDetailAttachments'
import { TaskDetailActivity } from './TaskDetailActivity'
import styles from './TaskDetailPanel.module.css'

const STATUS_BADGE_CLASS = { todo: 'todo', 'in-progress': 'inProgress', done: 'done', overdue: 'overdue' } as const

interface TaskDetailPanelProps {
  onDelete: (id: number, title: string) => void
}

export function TaskDetailPanel({ onDelete }: TaskDetailPanelProps) {
  const openTaskId = useTaskDetailStore((s) => s.openTaskId)
  const close = useTaskDetailStore((s) => s.close)
  const tasks = useTasksStore((s) => s.tasks)
  const toggleSubtask = useTasksStore((s) => s.toggleSubtask)
  const addSubtask = useTasksStore((s) => s.addSubtask)
  const addComment = useTasksStore((s) => s.addComment)
  const openEdit = useTaskModalStore((s) => s.openEdit)
  const showToast = useToastStore((s) => s.showToast)

  const [lastTaskId, setLastTaskId] = useState<number | null>(null)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    if (openTaskId !== null) setLastTaskId(openTaskId)
  }, [openTaskId])

  const isOpen = openTaskId !== null

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  const displayTaskId = openTaskId ?? lastTaskId
  const task = tasks.find((t) => t.id === displayTaskId) ?? null

  if (!task) {
    return (
      <>
        <div className={styles.overlay} data-open={false} data-testid="task-detail-overlay" />
        <div className={styles.panel} data-open={false} />
      </>
    )
  }

  const statusCfg = STATUS_CONFIG[task.status]

  const handleEdit = () => {
    const id = task.id
    close()
    openEdit(id)
  }

  const handleDelete = () => {
    const id = task.id
    const title = task.title
    close()
    onDelete(id, title)
  }

  const handleSendComment = () => {
    const text = commentText.trim()
    if (!text) return
    addComment(task.id, text)
    setCommentText('')
    showToast('Comment added', 'success', 1500)
  }

  const handleAddSubtask = (text: string) => {
    addSubtask(task.id, text)
    showToast('Subtask added', 'success', 1500)
  }

  const handleToggleSubtask = (index: number) => {
    const willBeDone = !task.subtasks[index].done
    toggleSubtask(task.id, index)
    showToast(willBeDone ? 'Sub-task done!' : 'Sub-task reopened', willBeDone ? 'success' : 'info', 1500)
  }

  return (
    <>
      <div className={styles.overlay} data-open={isOpen} data-testid="task-detail-overlay" onClick={close} />
      <div className={styles.panel} data-open={isOpen}>
        <div className={styles.header}>
          <div className={[styles.statusBadge, styles[STATUS_BADGE_CLASS[task.status]]].join(' ')}>
            <Circle aria-hidden="true" />
            {statusCfg.label}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.headerBtn} title="Edit task" aria-label="Edit task" onClick={handleEdit}>
              <Edit2 aria-hidden="true" />
            </button>
            <button
              type="button"
              className={[styles.headerBtn, styles.deleteBtn].join(' ')}
              title="Delete task"
              aria-label="Delete task"
              onClick={handleDelete}
            >
              <Trash2 aria-hidden="true" />
            </button>
            <button type="button" className={styles.headerBtn} title="Close" aria-label="Close" onClick={close}>
              <X aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <TaskDetailBody task={task} />
          <TaskDetailSubtasks subtasks={task.subtasks} onToggle={handleToggleSubtask} onAdd={handleAddSubtask} />
          <TaskDetailAttachments attachments={task.attachments} />
          <TaskDetailActivity comments={task.comments} />
        </div>

        <div className={styles.footer}>
          <img className={styles.footerAvatar} src="/avatars/Ellipse 1.png" alt="Jacob Solayinka" />
          <textarea
            className={styles.commentInput}
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="button" className={styles.sendBtn} aria-label="Send comment" onClick={handleSendComment}>
            <Send aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}
```

Note on the "task is null" early-return branch: before any task has ever been opened, the original's panel DOM exists but is empty (`<!-- populated by JS -->`) — since it's permanently off-screen via `transform: translateX(100%)` until `.open` is applied, its exact contents in that state are never visible, so this port simplifies to a bare overlay+panel pair with no header/body/footer rather than reproducing an empty shell. This has no visible effect and isn't a parity concern.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/tasks/TaskDetailPanel.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskDetailPanel.tsx src/components/tasks/TaskDetailPanel.module.css src/components/tasks/TaskDetailPanel.test.tsx
git commit -m "feat: add TaskDetailPanel shell composing body/subtasks/attachments/activity"
```

---

### Task 6: Wire `TaskDetailPanel` into `TasksPage`; update the backlog

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\TasksPage.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\TasksPage.test.tsx`
- Modify: `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`

**Interfaces:**
- Consumes: `TaskDetailPanel` (Task 5), `taskDetailStore.open` (Task 1). `TaskRow`/`TaskBoardCard` already call `onOpenDetail(id)` correctly (Phase 3.2) — `taskDetailStore.open`'s signature (`(id: number) => void`) already matches, so it's passed straight through with no wrapper function needed.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/TasksPage.test.tsx — ADD to the existing describe block
  it('clicking a task row opens the detail panel showing that task', async () => {
    render(<TasksPage />)
    const target = MOCK_TASKS[0]
    await userEvent.click(screen.getByText(target.title))
    expect(screen.getAllByText(target.title).length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
  })

  it('opening a task then clicking its Edit button in the detail panel opens the edit modal', async () => {
    render(<TasksPage />)
    const target = MOCK_TASKS[0]
    await userEvent.click(screen.getByText(target.title))
    await userEvent.click(screen.getByLabelText('Edit task'))
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/pages/TasksPage.test.tsx`
Expected: FAIL — clicking a row still only shows the "Task detail coming soon" toast; no comment input or Edit task button exists yet.

- [ ] **Step 3: Update `TasksPage.tsx`**

```tsx
// src/pages/TasksPage.tsx
import { useState } from 'react'
import { TasksPageHeader } from '../components/tasks/TasksPageHeader'
import { TaskStatsRow } from '../components/tasks/TaskStatsRow'
import { TasksToolbar } from '../components/tasks/TasksToolbar'
import { TaskListView } from '../components/tasks/TaskListView'
import { TaskBoardView } from '../components/tasks/TaskBoardView'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { AddTaskModal } from '../components/tasks/modals/AddTaskModal'
import { useTasksStore } from '../store/tasksStore'
import { useTaskDetailStore } from '../store/taskDetailStore'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo'
import { PRIORITY_ORDER } from '../lib/taskFormatters'
import styles from './TasksPage.module.css'

export function TasksPage() {
  const tasks = useTasksStore((s) => s.tasks)
  const removeTask = useTasksStore((s) => s.removeTask)
  const restoreTask = useTasksStore((s) => s.restoreTask)
  const openDetail = useTaskDetailStore((s) => s.open)
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

  const handleDelete = (id: number, title: string) => {
    deleteWithUndo(id, title)
  }

  return (
    <div className={styles.page}>
      <TasksPageHeader view={view} onViewChange={setView} />
      <TaskStatsRow activeFilter={activeFilter} onFilterChange={setActiveFilter}>
        <TasksToolbar
          activeSort={activeSort}
          onSortChange={setActiveSort}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </TaskStatsRow>
      {view === 'list' ? (
        <TaskListView tasks={filteredTasks} onOpenDetail={openDetail} onDelete={handleDelete} />
      ) : (
        <TaskBoardView tasks={filteredTasks} onOpenDetail={openDetail} />
      )}
      <AddTaskModal />
      <TaskDetailPanel onDelete={handleDelete} />
    </div>
  )
}
```

(`useToastStore`'s `showToast` import is dropped along with the placeholder `handleOpenDetail` it only existed for — the real "Comment added"/"Subtask added" toasts now live inside `TaskDetailPanel`, which owns its own `useToastStore` import, Task 5.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/pages/TasksPage.test.tsx`
Expected: PASS, all tests (existing 4 + 2 new).

- [ ] **Step 5: Run the full suite, typecheck, and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all pass, zero regressions in `TaskRow.test.tsx`, `TaskBoardCard.test.tsx`, `TaskListView.test.tsx`, `TaskBoardView.test.tsx` (their `onOpenDetail` prop contract is unchanged — still `(id: number) => void`).

- [ ] **Step 6: Manually verify in the browser**

Run: `pnpm dev`, navigate to Tasks. Confirm: clicking a list row or a kanban card slides the panel in from the right with the correct status badge, meta grid, tags, description, sub-tasks (with working progress bar/checkboxes/add), attachments (present only on tasks that have them), and comments (with "No comments yet." on tasks that have none); clicking the overlay or the X closes it; pressing Escape closes it; clicking Edit closes the panel and opens the Edit Task modal pre-filled correctly; clicking Delete closes the panel and starts the same 5-second undo-toast flow as the row-level Delete button; typing a comment and clicking send appends it to Activity immediately; editing the description and clicking elsewhere saves it (re-open the same task to confirm persistence); confirm clicking a different task row while the panel is already open requires two clicks (first closes, second opens the new task) — this is the original's own behavior, not a bug (see Global Constraints).

- [ ] **Step 7: Append the Phase 3.3 backlog entries**

Append to `C:\Users\HP\Downloads\Chronoloop dashboard\docs\superpowers\backlog.md`:

```markdown

## From Phase 3.3 (Task Detail side panel)

- [ ] **Escape-to-close is a deliberate accessibility addition, not strict parity** — the original's global `Escape` handler (`index.html:6330-6339`) never closes `task-detail-panel`; only clicking the overlay or the explicit close button does in the shipped app. Added here per the design doc's non-negotiable keyboard-navigation standard (§4a), the same category of deviation as `CriticalProjectsPanel`'s always-visible three-dot menu (Phase 3.1).
- [ ] **The description field's empty-state placeholder is real, savable content** — when a task has no description, the `contenteditable` div's initial text is the literal string "Click to add a description...", and blur unconditionally saves whatever text is present. A user who clicks in and out without typing will overwrite an empty description with that literal placeholder string. This is the original's own behavior (`index.html:7263`, `:7358-7361`), preserved as-is, not fixed into a true non-submitting placeholder.
- [ ] **Clicking a different task row while the panel is already open takes two clicks** — the panel's full-screen overlay blocks/closes on the first click rather than also opening the newly-clicked row in the same click; a second click on the row is needed to open it. Matches the original's own overlay-blocking behavior exactly (see this plan's Global Constraints) — flagged here in case a future visual/UX review wants a "swap directly to the new task" affordance, which would be a deliberate improvement over parity, not a bug fix.
- [ ] **Comment/subtask avatars and the assignee-code→name map are duplicated a third time here**, separately from `AddTaskModal`'s own copies (Phase 3.2) — matches the original's own inline duplication at `openTaskDetail` (`index.html:7237`), not a missed shared-constant opportunity. Same category as the already-flagged 4-project-list duplication (Phase 3.2 backlog).
- [ ] **`TaskAssigneeBubble`'s `size` prop is now a bare `number`** instead of the earlier `26 | 22` literal union, which slightly weakens its compile-time guarantee that only two specific sizes are ever passed — acceptable since the component is small, internal to `src/components/tasks/`, and the original itself uses more than two size/font-size pairings across its call sites.
- [ ] **Phase 3.3 was never interactively verified in a real browser during implementation** — same standing caveat as Phases 3.1 and 3.2 (no browser available in the execution environment). Task 6 Step 6 above lists the manual `pnpm dev` walkthrough that should happen before/alongside starting Phase 3.4.
- [ ] *(Add any other deferred/parked items discovered during this phase's task-review loop here, following the same format as prior phases' entries — do not skip this step if any Minor findings were parked.)*
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/TasksPage.tsx src/pages/TasksPage.test.tsx
git commit -m "feat: wire TaskDetailPanel into TasksPage, replacing the placeholder detail toast"
cd "C:\Users\HP\Downloads\Chronoloop dashboard"
git add docs/superpowers/backlog.md
git commit -m "docs: flag Phase 3.3 Task Detail panel parity notes in the backlog"
```

---

## Phase 3.3 Exit Checklist

- [ ] `pnpm dev` shows a working Task Detail panel matching `index.html`'s slide-in panel, per Task 6 Step 6.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass on the final state.
- [ ] Phase 3.2's existing tests (`TaskRow.test.tsx`, `TaskBoardCard.test.tsx`, `TaskListView.test.tsx`, `TaskBoardView.test.tsx`, `AddTaskModal.test.tsx`) still pass unchanged in behavior.
- [ ] `docs/superpowers/backlog.md` (old repo) has the new Phase 3.3 entries from Task 6 Step 7.
- [ ] **Next up: Phase 3.4 (Projects page)** — start by re-reading `index.html`'s `renderProjectsPage` section and its modals (New Project/Project Detail) and mock data (`PROJECTS`) before writing that plan, same as every prior page phase. The Phase 3.2 backlog's "Select Project dropdown casing/sourcing" and "full project list has no shared data source yet" entries were explicitly deferred to "once the Projects page establishes a real shared project list" — revisit both when scoping Phase 3.4.
- [ ] **After Phase 3.4**, design doc's page order continues: Sprints → Calendar → Team → Reports → Integrations → Settings.
