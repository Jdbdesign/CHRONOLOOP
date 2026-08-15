# Phase 3.5 — Sprints Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Sprints page (`renderSprintsPage` and everything it composes) from the legacy `index.html` into the React/TS rewrite at `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`, with pixel/behavior parity.

**Architecture:** Same layered approach as Phases 3.1–3.4: a Zustand `sprintsStore` holding the mock sprint list plus two small UI-state stores (`sprintDetailStore`, `sprintModalStore`), a `src/components/sprints/` tree of presentational components, and a `SprintsPage.tsx` that wires local `view`/`activeFilter`/`dropdownFilters`/`activeSort`/`searchQuery` state and passes it down — mirroring `ProjectsPage.tsx` exactly, not `TasksPage.tsx`. One new small hook (`useAnimatedStrokeOffset`) generalizes Phase 3.4's `useAnimatedWidth` reset-then-double-rAF pattern to SVG ring `stroke-dashoffset`. One existing shared component (`StatCard`, built in Phase 3.1) gets a small additive prop so Sprint's per-card icon-wrap colors can reuse it instead of forking a new stat-card component.

**Tech Stack:** Vite, React 18, TypeScript, Zustand, Radix (`Dropdown`, existing `Modal`), Vitest + Testing Library, `lucide-react` icons.

**Spec:** `docs/superpowers/specs/2026-08-10-chronoloop-frontend-rewrite-design.md` (this old repo). Source of truth for exact markup/behavior is `index.html` in this old repo — cited line ranges below are pinned to the file as read on 2026-08-15; re-verify a cited range before trusting it if this plan is executed later and the file has since changed.

## Global Constraints

- Re-architecture, not redesign: pixel/behavior parity with `index.html` is a hard requirement, verified per-component against the cited line ranges below.
- Follow `ProjectsPage.tsx` (`src/pages/ProjectsPage.tsx`), not `TasksPage.tsx`, as the structural precedent — Sprints' filter/sort/search shape matches Projects' (a single flat list with client-side filter+sort+search), not Tasks' list/board split logic.
- **Detail panel:** hand-built fixed overlay+panel (not the `Modal`/Radix `Dialog` primitive) — follow `ProjectDetailPanel.tsx` byte-for-byte as the template: `inert`-via-ref+`useEffect` (this project's `@types/react@18.3.31` doesn't declare the `inert` JSX attribute — do not add a JSX `inert` prop, an `any` cast, or a `@types/react` bump), click-blocking overlay (not `useOutsideClick`), Escape-closes-and-blurs-first via one `handleClose`, and the "keep last id displayed while sliding closed" `prevOpenId`/`lastId` state pair.
- **Modals:** hand-built `<form>` + `Modal` primitive, key-based session-counter form reset on close (see `NewProjectModal.tsx`) — never `useEffect`+`setState` to reset a form (trips `react-hooks/set-state-in-effect`, per Phase 3.2's incident).
- **No avatar images anywhere on this page.** Every team-member avatar in the original Sprints section (banner, list rows, board cards, detail panel) renders as a plain color-filled circle with initials — `<div style="background:${m.c}">${m.i}</div>` — never through `AVATAR_MAP`/real photos the way Projects/Dashboard avatars do. Use `<Avatar name={m.i} fallbackStyle={{ background: m.c, fontSize: ... }} style={{ width, height }} />` with **no `src` prop** at every call site on this page.
- **Filter dropdown is mixed-fidelity — do not "fix" either half.** `dd-sprint-filter`'s Status checkboxes (`sf-active`/`sf-planning`/`sf-upcoming`/`sf-completed`) are real and drive actual filtering (`index.html:8402-8408`, `sprintDropdownFilters` consumed at `:7976`). Its Project checkboxes (`sf-p1`/`sf-p2`/`sf-p3`) are decorative — `index.html`'s own Apply handler never reads them. Port both: Status checkboxes must be lifted to `SprintsPage` state and actually filter the list; Project checkboxes must be local-only `useState` that never reaches the parent (same "decorative filter group" pattern already used for Priority/Category in `ProjectsToolbar.tsx`, just don't assume *this whole dropdown* is decorative the way that one was — half of this one is real).
- **Two independent filters, ANDed, both computed against the same full list.** The stat-chip filter (`activeFilter`) and the dropdown Status filter (`dropdownFilters`) apply together, matching `index.html:7975-7976` — selecting a chip does not clear dropdown filters and vice versa. Neither is exclusive-OR with the other.
- **Chip counts and KPI values are always computed from the full unfiltered store list**, never from the currently filtered/sorted `list` — matches `_updateSprintChips()` (`index.html:8108-8116`) and `_renderSprintKPIs()` (`:8001-8006`), both of which read `SPRINTS` directly, not the local filtered variable. Follows the existing `ProjectStatsRow` precedent exactly.
- **Replay-on-every-query-change parity, extended to the banner.** Phase 3.4 resolved the "stable `key={id}` vs. replay-animation-on-rerender" contradiction by keying the *results subtree* on the combined filter+sort+search query state, so cards keep stable per-render `id` keys while the whole subtree remounts (and replays fill/entrance animations) on every query change — verified faithful to the original, which calls `renderProjectsPage()` unthrottled on every keystroke, filter click, and sort click, tearing down and rebuilding the DOM every time. **Sprints' original does the exact same thing, but one level bigger**: `renderSprintsPage()` (`index.html:7973-7999`) is the single entry point for view-toggle, chip-filter, dropdown-filter-apply, sort-select, *and* search-input, and it unconditionally calls `_renderActiveSprintBanner()` (which rebuilds the ring + mini burndown + task-breakdown numbers) on every one of those triggers — not just on sprint-data changes. Port this by giving `SprintsPage.tsx` **one shared remount key** covering the view toggle, filter/sort/search state, wrapping both the Active Sprint Banner and the List/Board results subtree: `key={`${view}|${activeFilter}|${dropdownFilters?.join(',') ?? 'none'}|${activeSort}|${searchQuery}`}`. Do this from the start — don't let it surface only at final review the way it did in Phase 3.4.
- **Board view column set and order is fixed and asymmetric**: `active, planning, upcoming, completed` (`index.html:8185-8190`) — this is a different order than the stat chips (`All, Active, Planning, Completed, Upcoming`) and there is no "All"/unassigned column. Board cards show only the first 2 team avatars with **no overflow "+N" indicator** (`index.html:8210`, `.slice(0,2)`, no more-count markup) — list rows show first 3 **with** a "+N" overflow (`:8147-8148`, matches `ProjectListRow`'s pattern). This asymmetry is original behavior, not a bug — same class of "the original itself is inconsistent between its own views" precedent already ruled on twice in Phase 3.4 (grid-only context menu, list-view has none).
- **Burndown polyline (banner) and velocity bars (detail panel) are static — do not animate them.** Neither has a CSS `transition` nor a JS rAF trick in the original; only the ring (`stroke-dashoffset`, CSS `transition: stroke-dashoffset 1000ms`) and the width-based progress bars use the reset-then-rAF animation trick. Render the polyline points and bar heights directly from data with no animation hook.
- **Do not build a new stat-card component.** Reuse `src/components/dashboard/StatCard.tsx` (Phase 3.1) for the 5 Sprint KPI cards — same `.stat-card` CSS class family as Dashboard's KPI grid in the original (`index.html`'s Sprint KPI markup literally reuses `class="stat-card"`). It needs one small additive prop first (Task 5) — do not fork a copy.
- Every new store/hook/component gets a co-located `.test.ts`/`.test.tsx`; run `pnpm test` and `pnpm lint` after each task, from **the assigned worktree**, not the main checkout (see the dedicated worktree-verification step required in every task below — this is a standing rule since the Phase 3.3 Task 4 incident, not new to this plan).
- **CSS ports verbatim** from the cited `index.html` line ranges — treat the source values (colors, sizes, radii, gaps) as ground truth to transcribe exactly, not to reinterpret or "clean up."

---

## File Structure

```
src/types/sprint.ts                                  — Sprint, SprintTeamMember, SprintTask types
src/data/mockSprints.ts                               — MOCK_SPRINTS (5 items, byte-verified from index.html:7870-7957)
src/lib/sprintFormatters.ts                            — status label/icon config, sort comparator, filter helper (JSX-free)
src/store/sprintsStore.ts                              — sprints list + addSprint/updateSprint/removeSprint/markComplete
src/store/sprintDetailStore.ts                          — openSprintId/open/close
src/store/sprintModalStore.ts                           — isNewOpen/editingSprintId + openNew/closeNew/openEdit/closeEdit
src/hooks/useAnimatedStrokeOffset.ts                    — ring-progress animation hook (+ .test.ts)

src/components/dashboard/StatCard.tsx                   — MODIFIED: + optional iconBackground prop
src/components/dashboard/StatCard.test.tsx              — MODIFIED: regression case for the new prop

src/components/sprints/SprintStatusBadge.tsx             (+ .test.tsx, + SprintBadges.module.css)
src/components/sprints/SprintsPageHeader.tsx              (+ .test.tsx, + .module.css)
src/components/sprints/SprintKpiGrid.tsx                  (+ .test.tsx, + .module.css)
src/components/sprints/ActiveSprintBanner.tsx              (+ .test.tsx, + .module.css)
src/components/sprints/SprintStatsRow.tsx                  (+ .test.tsx, + .module.css)
src/components/sprints/SprintsToolbar.tsx                  (+ .test.tsx, + .module.css)
src/components/sprints/SprintItem.tsx                      (+ .test.tsx, + .module.css)
src/components/sprints/SprintsListView.tsx                 (+ .test.tsx)
src/components/sprints/SprintBoardCard.tsx                 (+ .test.tsx, + .module.css)
src/components/sprints/SprintsBoardView.tsx                 (+ .test.tsx)
src/components/sprints/SprintDetailPanel.tsx                 (+ .test.tsx, + .module.css)
src/components/sprints/modals/NewSprintModal.tsx              (+ .test.tsx)
src/components/sprints/modals/EditSprintModal.tsx              (+ .test.tsx)

src/pages/SprintsPage.tsx                                — MODIFIED: replaces the `<h1>Sprints</h1>` stub
```

---

### Task 1: Sprint data layer — types, mock data, formatters, store

**Files:**
- Create: `src/types/sprint.ts`
- Create: `src/data/mockSprints.ts`
- Create: `src/lib/sprintFormatters.ts`
- Create: `src/lib/sprintFormatters.test.ts`
- Create: `src/store/sprintsStore.ts`
- Create: `src/store/sprintsStore.test.ts`

**Interfaces:**
- Produces: `Sprint`, `SprintStatus`, `SprintTeamMember`, `SprintTask`, `NewSprintInput`, `EditSprintInput` types; `MOCK_SPRINTS: Sprint[]`; `SPRINT_STATUS_CONFIG: Record<SprintStatus, { label: string; icon: LucideIcon }>`; `sprintSortComparator(sortMode: string): (a: Sprint, b: Sprint) => number`; `useSprintsStore` with `sprints`, `addSprint(input: NewSprintInput)`, `updateSprint(id: string, input: EditSprintInput)`, `removeSprint(id: string)`, `markComplete(id: string)`.

- [ ] **Step 1: Write `src/types/sprint.ts`**

```typescript
export type SprintStatus = 'active' | 'completed' | 'planning' | 'upcoming'

export interface SprintTeamMember {
  i: string
  c: string
}

export interface SprintTask {
  title: string
  status: 'done' | 'in-progress' | 'todo'
}

export interface Sprint {
  id: string
  number: string
  name: string
  goal: string
  status: SprintStatus
  startDate: string
  endDate: string
  startRaw?: string
  endRaw?: string
  daysLeft: number
  progress: number
  storyPoints: number
  completedPoints: number
  tasksTotal: number
  tasksDone: number
  inProgress: number
  todo: number
  color: string
  project: string
  velocity: number | null
  team: SprintTeamMember[]
  burndown: (number | null)[]
  sprintTasks: SprintTask[]
}

export interface NewSprintInput {
  name: string
  goal: string
  startRaw: string
  endRaw: string
  storyPoints: number
  project: string
}

export interface EditSprintInput {
  name: string
  goal: string
  storyPoints: number
  status: SprintStatus
  project: string
  startRaw: string
  endRaw: string
}
```

- [ ] **Step 2: Write `src/data/mockSprints.ts`**

Byte-verify every field against `index.html:7870-7957` — 5 sprints (`s1`–`s5`), transliterated verbatim including the `burndown` arrays (`s3` has 3 trailing `null`s, `s4`/`s5` have empty `[]`) and each sprint's full `sprintTasks` list.

```typescript
import type { Sprint } from '../types/sprint'

export const MOCK_SPRINTS: Sprint[] = [
  {
    id: 's1', number: 'SPRINT 01', name: 'Foundation & Architecture',
    goal: 'Establish the project foundation: repo setup, design system tokens, CI/CD pipeline, and core authentication flow.',
    status: 'completed', startDate: 'Oct 1, 2024', endDate: 'Oct 14, 2024', daysLeft: 0,
    progress: 100, storyPoints: 42, completedPoints: 42,
    tasksTotal: 12, tasksDone: 12, inProgress: 0, todo: 0,
    color: '#22C55E', project: 'Web 3 App for Fxtrade', velocity: 42,
    team: [{ i: 'AS', c: '#4A90FF' }, { i: 'RD', c: '#FF8C42' }, { i: 'RC', c: '#00D4AA' }],
    burndown: [42, 36, 30, 24, 18, 12, 6, 0],
    sprintTasks: [
      { title: 'Setup monorepo structure', status: 'done' }, { title: 'Configure CI/CD pipeline', status: 'done' },
      { title: 'Design token system', status: 'done' }, { title: 'Auth flow wireframes', status: 'done' },
      { title: 'JWT authentication backend', status: 'done' }, { title: 'Login & signup pages', status: 'done' },
      { title: 'Password reset flow', status: 'done' }, { title: 'Email verification', status: 'done' },
      { title: 'Role-based access control', status: 'done' }, { title: 'Session management', status: 'done' },
      { title: 'API error handling layer', status: 'done' }, { title: 'Deployment pipeline', status: 'done' },
    ],
  },
  {
    id: 's2', number: 'SPRINT 02', name: 'Core Dashboard Development',
    goal: 'Build the trading dashboard, wallet integration, and real-time data feeds from the blockchain.',
    status: 'completed', startDate: 'Oct 15, 2024', endDate: 'Oct 28, 2024', daysLeft: 0,
    progress: 100, storyPoints: 38, completedPoints: 38,
    tasksTotal: 10, tasksDone: 10, inProgress: 0, todo: 0,
    color: '#22C55E', project: 'Web 3 App for Fxtrade', velocity: 38,
    team: [{ i: 'AS', c: '#4A90FF' }, { i: 'RD', c: '#FF8C42' }, { i: 'MV', c: '#A855F7' }],
    burndown: [38, 34, 28, 22, 16, 10, 4, 0],
    sprintTasks: [
      { title: 'Dashboard layout & grid system', status: 'done' }, { title: 'Portfolio overview widget', status: 'done' },
      { title: 'MetaMask wallet connector', status: 'done' }, { title: 'Token price feed (WebSocket)', status: 'done' },
      { title: 'Transaction history table', status: 'done' }, { title: 'Candlestick chart component', status: 'done' },
      { title: 'Token swap interface', status: 'done' }, { title: 'Portfolio analytics panel', status: 'done' },
      { title: 'Responsive breakpoints', status: 'done' }, { title: 'Loading skeleton states', status: 'done' },
    ],
  },
  {
    id: 's3', number: 'SPRINT 03', name: 'UX Polish & Integrations',
    goal: 'Refine the user experience, integrate third-party APIs, complete the payment gateway, and perform UX audit revisions.',
    status: 'active', startDate: 'Nov 4, 2024', endDate: 'Nov 17, 2024', daysLeft: 7,
    progress: 58, storyPoints: 45, completedPoints: 26,
    tasksTotal: 11, tasksDone: 6, inProgress: 3, todo: 2,
    color: '#4A90FF', project: 'Web 3 App for Fxtrade', velocity: null,
    team: [{ i: 'AS', c: '#4A90FF' }, { i: 'RD', c: '#FF8C42' }, { i: 'MV', c: '#A855F7' }, { i: 'RC', c: '#00D4AA' }],
    burndown: [45, 41, 36, 30, 24, null, null, null],
    sprintTasks: [
      { title: 'Payment gateway (Stripe)', status: 'done' }, { title: 'UX audit revisions', status: 'done' },
      { title: 'Onboarding flow dev', status: 'done' }, { title: 'Mobile responsive tweaks', status: 'done' },
      { title: 'Dark mode refinement', status: 'done' }, { title: 'API rate limit handling', status: 'done' },
      { title: 'Notification system', status: 'in-progress' }, { title: 'Smart contract UI', status: 'in-progress' },
      { title: 'Performance optimization', status: 'in-progress' }, { title: 'Accessibility audit', status: 'todo' },
      { title: 'User testing sessions', status: 'todo' },
    ],
  },
  {
    id: 's4', number: 'SPRINT 04', name: 'Testing & Hardening',
    goal: 'QA testing across all features, security audit, performance benchmarks, and production deployment preparation.',
    status: 'planning', startDate: 'Nov 18, 2024', endDate: 'Dec 1, 2024', daysLeft: 21,
    progress: 0, storyPoints: 38, completedPoints: 0,
    tasksTotal: 9, tasksDone: 0, inProgress: 0, todo: 9,
    color: '#EAB308', project: 'Web 3 App for Fxtrade', velocity: null,
    team: [{ i: 'AS', c: '#4A90FF' }, { i: 'RD', c: '#FF8C42' }, { i: 'RC', c: '#00D4AA' }],
    burndown: [],
    sprintTasks: [
      { title: 'End-to-end test suite', status: 'todo' }, { title: 'Security penetration test', status: 'todo' },
      { title: 'Load testing (k6)', status: 'todo' }, { title: 'Bug triage & fixes', status: 'todo' },
      { title: 'Staging environment QA', status: 'todo' }, { title: 'App store screenshots', status: 'todo' },
      { title: 'Prod deployment checklist', status: 'todo' }, { title: 'Rollback strategy plan', status: 'todo' },
      { title: 'Launch announcement prep', status: 'todo' },
    ],
  },
  {
    id: 's5', number: 'SPRINT 05', name: 'Post-Launch Iteration',
    goal: 'Address user feedback from the initial launch, implement quick wins, and begin planning v2 features.',
    status: 'upcoming', startDate: 'Dec 2, 2024', endDate: 'Dec 15, 2024', daysLeft: 36,
    progress: 0, storyPoints: 30, completedPoints: 0,
    tasksTotal: 7, tasksDone: 0, inProgress: 0, todo: 7,
    color: '#A855F7', project: 'Web 3 App for Fxtrade', velocity: null,
    team: [{ i: 'AS', c: '#4A90FF' }, { i: 'MV', c: '#A855F7' }],
    burndown: [],
    sprintTasks: [
      { title: 'User feedback analysis', status: 'todo' }, { title: 'Critical bug fixes', status: 'todo' },
      { title: 'Onboarding improvements', status: 'todo' }, { title: 'Analytics integration', status: 'todo' },
      { title: 'v2 feature planning', status: 'todo' }, { title: 'Documentation updates', status: 'todo' },
      { title: 'Team retrospective', status: 'todo' },
    ],
  },
]
```

- [ ] **Step 3: Write the failing formatter tests — `src/lib/sprintFormatters.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { SPRINT_STATUS_CONFIG, sprintSortComparator } from './sprintFormatters'
import type { Sprint } from '../types/sprint'

const s = (over: Partial<Sprint>): Sprint => ({
  id: 'x', number: 'SPRINT 0X', name: 'A', goal: '', status: 'planning',
  startDate: '', endDate: '', daysLeft: 0, progress: 0, storyPoints: 0, completedPoints: 0,
  tasksTotal: 0, tasksDone: 0, inProgress: 0, todo: 0, color: '#000', project: '',
  velocity: null, team: [], burndown: [], sprintTasks: [], ...over,
})

describe('SPRINT_STATUS_CONFIG', () => {
  it('has a label and icon for every status', () => {
    expect(SPRINT_STATUS_CONFIG.active.label).toBe('Active')
    expect(SPRINT_STATUS_CONFIG.completed.label).toBe('Completed')
    expect(SPRINT_STATUS_CONFIG.planning.label).toBe('Planning')
    expect(SPRINT_STATUS_CONFIG.upcoming.label).toBe('Upcoming')
  })
})

describe('sprintSortComparator', () => {
  it('sorts by name A-Z', () => {
    const list = [s({ id: 'b', name: 'Beta' }), s({ id: 'a', name: 'Alpha' })]
    expect(list.sort(sprintSortComparator('name')).map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('sorts by progress descending', () => {
    const list = [s({ id: 'low', progress: 10 }), s({ id: 'high', progress: 90 })]
    expect(list.sort(sprintSortComparator('progress')).map((x) => x.id)).toEqual(['high', 'low'])
  })

  it('sorts by story points descending', () => {
    const list = [s({ id: 'small', storyPoints: 10 }), s({ id: 'big', storyPoints: 50 })]
    expect(list.sort(sprintSortComparator('storyPts')).map((x) => x.id)).toEqual(['big', 'small'])
  })

  it('falls back to id order for "number" (and any other) sort mode, matching index.html:7985', () => {
    const list = [s({ id: 's3' }), s({ id: 's1' }), s({ id: 's2' })]
    expect(list.sort(sprintSortComparator('number')).map((x) => x.id)).toEqual(['s1', 's2', 's3'])
  })
})
```

- [ ] **Step 4: Run tests, verify they fail** (`sprintFormatters.ts` doesn't exist yet)

Run: `pnpm vitest run src/lib/sprintFormatters.test.ts`
Expected: FAIL — cannot find module `./sprintFormatters`

- [ ] **Step 5: Implement `src/lib/sprintFormatters.ts`**

```typescript
import { PlayCircle, CheckCircle2, ClipboardList, Clock } from 'lucide-react'
import type { Sprint, SprintStatus } from '../types/sprint'

export const SPRINT_STATUS_CONFIG = {
  active: { label: 'Active', icon: PlayCircle },
  completed: { label: 'Completed', icon: CheckCircle2 },
  planning: { label: 'Planning', icon: ClipboardList },
  upcoming: { label: 'Upcoming', icon: Clock },
} as const satisfies Record<SprintStatus, { label: string; icon: unknown }>

// Matches renderSprintsPage()'s sort switch (index.html:7981-7986) exactly,
// including the id-order fallback for the default 'number' mode.
export function sprintSortComparator(sortMode: string) {
  return (a: Sprint, b: Sprint) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name)
    if (sortMode === 'progress') return b.progress - a.progress
    if (sortMode === 'storyPts') return b.storyPoints - a.storyPoints
    return a.id.localeCompare(b.id)
  }
}
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pnpm vitest run src/lib/sprintFormatters.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Write the failing store tests — `src/store/sprintsStore.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useSprintsStore } from './sprintsStore'
import { MOCK_SPRINTS } from '../data/mockSprints'

describe('sprintsStore', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
  })

  it('starts seeded with the 5 mock sprints', () => {
    expect(useSprintsStore.getState().sprints).toHaveLength(5)
  })

  it('addSprint prepends a new planning-status sprint with a computed number', () => {
    useSprintsStore.getState().addSprint({
      name: 'New Sprint', goal: '', startRaw: '2024-12-20', endRaw: '2025-01-02',
      storyPoints: 25, project: 'ChronoLoop Launch',
    })
    const [first] = useSprintsStore.getState().sprints
    expect(first.name).toBe('New Sprint')
    expect(first.status).toBe('planning')
    expect(first.number).toBe('SPRINT 06')
    expect(first.progress).toBe(0)
    expect(first.velocity).toBeNull()
    expect(first.team).toEqual([{ i: 'JA', c: '#4A90FF' }])
  })

  it('addSprint defaults goal to "No goal defined." when blank, matching index.html:8459', () => {
    useSprintsStore.getState().addSprint({
      name: 'X', goal: '', startRaw: '', endRaw: '', storyPoints: 40, project: 'Web 3 App for Fxtrade',
    })
    expect(useSprintsStore.getState().sprints[0].goal).toBe('No goal defined.')
  })

  it('updateSprint mutates fields in place and forces progress to 100 when status becomes completed', () => {
    useSprintsStore.getState().updateSprint('s4', {
      name: 'Testing & Hardening (updated)', goal: 'Updated goal', storyPoints: 50,
      status: 'completed', project: 'Web 3 App for Fxtrade', startRaw: '', endRaw: '',
    })
    const s4 = useSprintsStore.getState().sprints.find((s) => s.id === 's4')
    expect(s4?.name).toBe('Testing & Hardening (updated)')
    expect(s4?.status).toBe('completed')
    expect(s4?.progress).toBe(100)
  })

  it('removeSprint removes the sprint by id', () => {
    useSprintsStore.getState().removeSprint('s5')
    expect(useSprintsStore.getState().sprints.find((s) => s.id === 's5')).toBeUndefined()
  })

  it('markComplete sets status to completed and progress to 100, matching index.html:8385', () => {
    useSprintsStore.getState().markComplete('s3')
    const s3 = useSprintsStore.getState().sprints.find((s) => s.id === 's3')
    expect(s3?.status).toBe('completed')
    expect(s3?.progress).toBe(100)
  })
})
```

- [ ] **Step 8: Run tests, verify they fail**

Run: `pnpm vitest run src/store/sprintsStore.test.ts`
Expected: FAIL — cannot find module `./sprintsStore`

- [ ] **Step 9: Implement `src/store/sprintsStore.ts`**

```typescript
import { create } from 'zustand'
import type { EditSprintInput, NewSprintInput, Sprint } from '../types/sprint'
import { MOCK_SPRINTS } from '../data/mockSprints'

function formatDate(raw: string): string {
  return raw
    ? new Date(`${raw}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD'
}

interface SprintsState {
  sprints: Sprint[]
  addSprint: (input: NewSprintInput) => void
  updateSprint: (id: string, input: EditSprintInput) => void
  removeSprint: (id: string) => void
  markComplete: (id: string) => void
}

export const useSprintsStore = create<SprintsState>((set) => ({
  sprints: MOCK_SPRINTS,
  addSprint: (input) => {
    set((state) => {
      const number = `SPRINT ${String(state.sprints.length + 1).padStart(2, '0')}`
      const newSprint: Sprint = {
        id: `s_${Date.now()}`, number, name: input.name, goal: input.goal || 'No goal defined.',
        status: 'planning', startDate: formatDate(input.startRaw), endDate: formatDate(input.endRaw),
        startRaw: input.startRaw, endRaw: input.endRaw, daysLeft: 30,
        progress: 0, storyPoints: input.storyPoints, completedPoints: 0,
        tasksTotal: 0, tasksDone: 0, inProgress: 0, todo: 0,
        color: '#EAB308', project: input.project, velocity: null,
        team: [{ i: 'JA', c: '#4A90FF' }], burndown: [], sprintTasks: [],
      }
      return { sprints: [newSprint, ...state.sprints] }
    })
  },
  updateSprint: (id, input) => {
    set((state) => ({
      sprints: state.sprints.map((s) => {
        if (s.id !== id) return s
        return {
          ...s,
          name: input.name, goal: input.goal, storyPoints: input.storyPoints,
          status: input.status, project: input.project,
          startDate: input.startRaw ? formatDate(input.startRaw) : s.startDate,
          startRaw: input.startRaw || s.startRaw,
          endDate: input.endRaw ? formatDate(input.endRaw) : s.endDate,
          endRaw: input.endRaw || s.endRaw,
          progress: input.status === 'completed' ? 100 : s.progress,
        }
      }),
    }))
  },
  removeSprint: (id) => {
    set((state) => ({ sprints: state.sprints.filter((s) => s.id !== id) }))
  },
  markComplete: (id) => {
    set((state) => ({
      sprints: state.sprints.map((s) => (s.id === id ? { ...s, status: 'completed', progress: 100 } : s)),
    }))
  },
}))
```

- [ ] **Step 10: Run tests, verify they pass**

Run: `pnpm vitest run src/store/sprintsStore.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 11: Verify worktree location, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm both print the assigned worktree path/branch, not the main checkout. If not, STOP and report NEEDS_CONTEXT.

Run: `pnpm lint && pnpm test`
Expected: no new errors

```bash
git add src/types/sprint.ts src/data/mockSprints.ts src/lib/sprintFormatters.ts src/lib/sprintFormatters.test.ts src/store/sprintsStore.ts src/store/sprintsStore.test.ts
git commit -m "feat: add Sprints data layer — types, mock data, formatters, and store"
```

---

### Task 2: sprintDetailStore + sprintModalStore

**Files:**
- Create: `src/store/sprintDetailStore.ts`
- Create: `src/store/sprintDetailStore.test.ts`
- Create: `src/store/sprintModalStore.ts`
- Create: `src/store/sprintModalStore.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `useSprintDetailStore` with `openSprintId: string | null`, `open(id: string)`, `close()`. `useSprintModalStore` with `isNewOpen: boolean`, `editingSprintId: string | null`, `openNew()`, `closeNew()`, `openEdit(id: string)`, `closeEdit()`. Later tasks (SprintDetailPanel, list/board items, both modals) consume these.

- [ ] **Step 1: Write failing tests — `src/store/sprintDetailStore.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { useSprintDetailStore } from './sprintDetailStore'

describe('sprintDetailStore', () => {
  it('starts closed', () => {
    expect(useSprintDetailStore.getState().openSprintId).toBeNull()
  })

  it('open sets the id, close clears it', () => {
    useSprintDetailStore.getState().open('s3')
    expect(useSprintDetailStore.getState().openSprintId).toBe('s3')
    useSprintDetailStore.getState().close()
    expect(useSprintDetailStore.getState().openSprintId).toBeNull()
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm vitest run src/store/sprintDetailStore.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement `src/store/sprintDetailStore.ts`**

```typescript
import { create } from 'zustand'

interface SprintDetailState {
  openSprintId: string | null
  open: (id: string) => void
  close: () => void
}

export const useSprintDetailStore = create<SprintDetailState>((set) => ({
  openSprintId: null,
  open: (id) => set({ openSprintId: id }),
  close: () => set({ openSprintId: null }),
}))
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run src/store/sprintDetailStore.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write failing tests — `src/store/sprintModalStore.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { useSprintModalStore } from './sprintModalStore'

describe('sprintModalStore', () => {
  it('starts with both modals closed', () => {
    const s = useSprintModalStore.getState()
    expect(s.isNewOpen).toBe(false)
    expect(s.editingSprintId).toBeNull()
  })

  it('openNew/closeNew toggle isNewOpen without touching editingSprintId', () => {
    useSprintModalStore.getState().openNew()
    expect(useSprintModalStore.getState().isNewOpen).toBe(true)
    useSprintModalStore.getState().closeNew()
    expect(useSprintModalStore.getState().isNewOpen).toBe(false)
  })

  it('openEdit sets editingSprintId, closeEdit clears it', () => {
    useSprintModalStore.getState().openEdit('s2')
    expect(useSprintModalStore.getState().editingSprintId).toBe('s2')
    useSprintModalStore.getState().closeEdit()
    expect(useSprintModalStore.getState().editingSprintId).toBeNull()
  })
})
```

- [ ] **Step 6: Run, verify fail**

Run: `pnpm vitest run src/store/sprintModalStore.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 7: Implement `src/store/sprintModalStore.ts`**

```typescript
import { create } from 'zustand'

interface SprintModalState {
  isNewOpen: boolean
  editingSprintId: string | null
  openNew: () => void
  closeNew: () => void
  openEdit: (id: string) => void
  closeEdit: () => void
}

export const useSprintModalStore = create<SprintModalState>((set) => ({
  isNewOpen: false,
  editingSprintId: null,
  openNew: () => set({ isNewOpen: true }),
  closeNew: () => set({ isNewOpen: false }),
  openEdit: (id) => set({ editingSprintId: id }),
  closeEdit: () => set({ editingSprintId: null }),
}))
```

- [ ] **Step 8: Run, verify pass**

Run: `pnpm vitest run src/store/sprintModalStore.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/store/sprintDetailStore.ts src/store/sprintDetailStore.test.ts src/store/sprintModalStore.ts src/store/sprintModalStore.test.ts
git commit -m "feat: add sprintDetailStore and sprintModalStore"
```

---

### Task 3: useAnimatedStrokeOffset hook

**Files:**
- Create: `src/hooks/useAnimatedStrokeOffset.ts`
- Create: `src/hooks/useAnimatedStrokeOffset.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `useAnimatedStrokeOffset(circumference: number, progressPct: number): number` — returns the current `stroke-dashoffset` value, starting at `circumference` (fully unfilled) and animating to `circumference * (1 - progressPct / 100)` via the same reset-then-double-rAF pattern as `useAnimatedWidth` (`src/hooks/useAnimatedWidth.ts`), replaying on every `progressPct` (or `circumference`) change — consumed by `ActiveSprintBanner` (Task 6) for the `sprint-ring-fill` circle (`index.html:8042-8043, 8066-8069, 8102-8105`).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimatedStrokeOffset } from './useAnimatedStrokeOffset'

describe('useAnimatedStrokeOffset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts fully unfilled (offset === circumference) then animates to the target offset', () => {
    // circumference 264 (r=42), progress 58% -> target offset = 264 * (1 - 0.58) = 110.88
    const { result } = renderHook(() => useAnimatedStrokeOffset(264, 58))
    expect(result.current).toBe(264)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current).toBeCloseTo(110.88, 2)
  })

  it('replays from full-circumference on every progress change', () => {
    const { result, rerender } = renderHook(({ progress }) => useAnimatedStrokeOffset(264, progress), {
      initialProps: { progress: 20 },
    })

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBeCloseTo(264 * 0.8, 2)

    act(() => {
      rerender({ progress: 90 })
    })
    expect(result.current).toBe(264)

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBeCloseTo(264 * 0.1, 2)
  })

  it('returns 0 offset (fully filled) at 100% progress', () => {
    const { result } = renderHook(() => useAnimatedStrokeOffset(264, 100))
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBeCloseTo(0, 2)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm vitest run src/hooks/useAnimatedStrokeOffset.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement the hook**

```typescript
import { useEffect, useState } from 'react'

// Generalizes useAnimatedWidth's reset-then-double-rAF trick
// (src/hooks/useAnimatedWidth.ts) to an SVG ring's stroke-dashoffset.
// Mirrors index.html:8042-8043 (offset math) and :8102-8105 (the
// double-rAF that sets .style.strokeDashoffset after the ring first
// paints fully unfilled) — same "always replay, no mount-once guard"
// behavior as useAnimatedWidth, since the original rebuilds the whole
// banner on every renderSprintsPage() call.
export function useAnimatedStrokeOffset(circumference: number, progressPct: number): number {
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const target = circumference * (1 - progressPct / 100)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(circumference)
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setOffset(target))
    })
    return () => cancelAnimationFrame(frame)
  }, [circumference, progressPct])

  return offset
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm vitest run src/hooks/useAnimatedStrokeOffset.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/hooks/useAnimatedStrokeOffset.ts src/hooks/useAnimatedStrokeOffset.test.ts
git commit -m "feat: add useAnimatedStrokeOffset hook for ring-progress animation"
```

---

### Task 4: SprintStatusBadge

**Files:**
- Create: `src/components/sprints/SprintStatusBadge.tsx`
- Create: `src/components/sprints/SprintStatusBadge.test.tsx`
- Create: `src/components/sprints/SprintBadges.module.css`

**Interfaces:**
- Consumes: `SPRINT_STATUS_CONFIG` from `src/lib/sprintFormatters.ts` (Task 1), `SprintStatus` type from `src/types/sprint.ts` (Task 1).
- Produces: `<SprintStatusBadge status={SprintStatus} />` — consumed by `SprintItem`, `SprintBoardCard` (indirectly, via column headers using its color/label), and `SprintDetailPanel`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SprintStatusBadge } from './SprintStatusBadge'

describe('SprintStatusBadge', () => {
  it('renders the label for each status', () => {
    const { rerender } = render(<SprintStatusBadge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    rerender(<SprintStatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
    rerender(<SprintStatusBadge status="planning" />)
    expect(screen.getByText('Planning')).toBeInTheDocument()
    rerender(<SprintStatusBadge status="upcoming" />)
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintStatusBadge.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `SprintBadges.module.css`**

Port verbatim from `index.html:1292-1297`:

```css
.statusBadge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 5px; font-size: 10px; font-weight: 600; white-space: nowrap; }
.statusBadge svg { width: 10px; height: 10px; }
.active    { background: rgba(74,144,255,0.12);  color: var(--accent-blue);   border: 1px solid rgba(74,144,255,0.2); }
.completed { background: rgba(34,197,94,0.12);   color: var(--accent-green);  border: 1px solid rgba(34,197,94,0.2); }
.planning  { background: rgba(234,179,8,0.12);   color: var(--accent-yellow); border: 1px solid rgba(234,179,8,0.2); }
.upcoming  { background: rgba(168,85,247,0.12);  color: var(--accent-purple); border: 1px solid rgba(168,85,247,0.2); }
```

- [ ] **Step 4: Implement `SprintStatusBadge.tsx`**

```typescript
import { SPRINT_STATUS_CONFIG } from '../../lib/sprintFormatters'
import type { SprintStatus } from '../../types/sprint'
import styles from './SprintBadges.module.css'

const STATUS_CLASS: Record<SprintStatus, string> = {
  active: styles.active,
  completed: styles.completed,
  planning: styles.planning,
  upcoming: styles.upcoming,
}

interface SprintStatusBadgeProps {
  status: SprintStatus
}

export function SprintStatusBadge({ status }: SprintStatusBadgeProps) {
  const { label, icon: Icon } = SPRINT_STATUS_CONFIG[status]
  return (
    <span className={[styles.statusBadge, STATUS_CLASS[status]].join(' ')}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/SprintStatusBadge.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/SprintStatusBadge.tsx src/components/sprints/SprintStatusBadge.test.tsx src/components/sprints/SprintBadges.module.css
git commit -m "feat: add SprintStatusBadge"
```

---

### Task 5: SprintKpiGrid (extends StatCard with an iconBackground prop)

**Files:**
- Modify: `src/components/dashboard/StatCard.tsx`
- Modify: `src/components/dashboard/StatCard.test.tsx`
- Modify: `src/components/dashboard/StatCard.module.css`
- Create: `src/components/sprints/SprintKpiGrid.tsx`
- Create: `src/components/sprints/SprintKpiGrid.test.tsx`
- Create: `src/components/sprints/SprintKpiGrid.module.css`

**Interfaces:**
- Consumes: `StatCard` (modified), `useSprintsStore` (Task 1).
- Produces: `<SprintKpiGrid />` — reads the full `sprints` list and renders 5 `StatCard`s; consumed by `SprintsPage.tsx` (Task 13).

This is a cross-phase file: `StatCard.tsx` was built in Phase 3.1 for the Dashboard KPI grid. The extension must be additive — every existing Dashboard call site must render identically with the new prop omitted.

- [ ] **Step 1: Write the failing regression test for the new prop — append to `StatCard.test.tsx`**

```typescript
  it('accepts an optional iconBackground override without affecting the default background when omitted', () => {
    const { container, rerender } = render(
      <StatCard label="To-do" icon={<ClipboardList aria-hidden="true" />} target={45} delta="up" deltaText="x" index={0} />,
    )
    const defaultWrap = container.querySelector('[class*="iconWrap"]') as HTMLElement
    expect(defaultWrap.style.background).toBe('')

    rerender(
      <StatCard
        label="Active Sprint"
        icon={<ClipboardList aria-hidden="true" />}
        target={1}
        delta="up"
        deltaText="Currently running"
        index={1}
        iconBackground="rgba(74,144,255,0.12)"
      />,
    )
    const overriddenWrap = container.querySelector('[class*="iconWrap"]') as HTMLElement
    expect(overriddenWrap.style.background).toBe('rgba(74, 144, 255, 0.12)')
  })
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/components/dashboard/StatCard.test.tsx`
Expected: FAIL — `iconBackground` is not a valid prop / background assertion fails

- [ ] **Step 3: Add the prop in `StatCard.tsx`**

```typescript
// src/components/dashboard/StatCard.tsx
import type { CSSProperties, ReactNode } from 'react'
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
  iconBackground?: string
}

export function StatCard({ label, icon, target, delta, deltaText, index, overdue, iconBackground }: StatCardProps) {
  const value = useCountUp(target)
  const iconWrapStyle: CSSProperties | undefined = iconBackground ? { background: iconBackground } : undefined

  return (
    <Card
      hoverable
      tabIndex={0}
      className={styles.card}
      style={{ animationDelay: `${120 + index * 80}ms` }}
    >
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <div className={[styles.iconWrap, overdue && styles.overdue].filter(Boolean).join(' ')} style={iconWrapStyle}>{icon}</div>
      </div>
      <div className={styles.value}>{value}</div>
      <div className={[styles.delta, styles[delta]].join(' ')}>
        <span>{delta === 'up' ? '▲' : '▼'} {deltaText}</span>
      </div>
    </Card>
  )
}
```

No change needed to `StatCard.module.css` — the inline `style` prop overrides the CSS class's `background` declaration at the cascade level without touching the stylesheet.

- [ ] **Step 4: Run all StatCard + KpiGrid tests, verify pass and no regression**

Run: `pnpm vitest run src/components/dashboard/StatCard.test.tsx src/components/dashboard/KpiGrid.test.tsx`
Expected: PASS, all tests including the pre-existing Dashboard ones

- [ ] **Step 5: Write the failing test — `SprintKpiGrid.test.tsx`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SprintKpiGrid } from './SprintKpiGrid'
import { useSprintsStore } from '../../store/sprintsStore'
import { MOCK_SPRINTS } from '../../data/mockSprints'

describe('SprintKpiGrid', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
    vi.useFakeTimers()
  })

  it('renders 5 KPI cards computed from the full sprint list', () => {
    render(<SprintKpiGrid />)
    vi.advanceTimersByTime(400)

    expect(screen.getByText('Total Sprints')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // total
    expect(screen.getByText('Active Sprint')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // completed (s1, s2)
    expect(screen.getByText('Avg Velocity')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument() // round((42+38)/2)
    expect(screen.getByText('Points Delivered')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument() // 42+38+26+0+0
    vi.useRealTimers()
  })
})
```

- [ ] **Step 6: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintKpiGrid.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 7: Write `SprintKpiGrid.module.css`**

Port from `index.html:1220, 1349`:

```css
.grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

@media (max-width: 1280px) { .grid { grid-template-columns: repeat(3, 1fr); } }
```

- [ ] **Step 8: Implement `SprintKpiGrid.tsx`**

Values and static delta text ported from `index.html:8001-8033`.

```typescript
import { Zap, PlayCircle, CheckCircle2, TrendingUp, Target } from 'lucide-react'
import { StatCard } from '../dashboard/StatCard'
import { useSprintsStore } from '../../store/sprintsStore'
import styles from './SprintKpiGrid.module.css'

export function SprintKpiGrid() {
  const sprints = useSprintsStore((s) => s.sprints)

  const total = sprints.length
  const active = sprints.filter((s) => s.status === 'active').length
  const completed = sprints.filter((s) => s.status === 'completed').length
  const vSprints = sprints.filter((s) => s.velocity !== null)
  const avgVel = vSprints.length ? Math.round(vSprints.reduce((sum, s) => sum + (s.velocity ?? 0), 0) / vSprints.length) : 0
  const totalPts = sprints.reduce((sum, s) => sum + s.completedPoints, 0)

  return (
    <div className={styles.grid}>
      <StatCard index={0} label="Total Sprints" icon={<Zap aria-hidden="true" />} target={total} delta="up" deltaText="Across all projects" />
      <StatCard index={1} label="Active Sprint" icon={<PlayCircle aria-hidden="true" style={{ color: 'var(--accent-blue)' }} />} target={active} delta="up" deltaText="Currently running" iconBackground="rgba(74,144,255,0.12)" />
      <StatCard index={2} label="Completed" icon={<CheckCircle2 aria-hidden="true" style={{ color: 'var(--accent-green)' }} />} target={completed} delta="up" deltaText="Delivered" iconBackground="rgba(34,197,94,0.12)" />
      <StatCard index={3} label="Avg Velocity" icon={<TrendingUp aria-hidden="true" style={{ color: 'var(--accent-teal)' }} />} target={avgVel} delta="up" deltaText="Points per sprint" iconBackground="rgba(0,212,170,0.12)" />
      <StatCard index={4} label="Points Delivered" icon={<Target aria-hidden="true" style={{ color: 'var(--accent-purple)' }} />} target={totalPts} delta="up" deltaText="Story points total" iconBackground="rgba(168,85,247,0.12)" />
    </div>
  )
}
```

- [ ] **Step 9: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/SprintKpiGrid.test.tsx`
Expected: PASS

- [ ] **Step 10: Verify worktree, full test suite, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test` — full suite, confirm no Dashboard regressions

```bash
git add src/components/dashboard/StatCard.tsx src/components/dashboard/StatCard.test.tsx src/components/sprints/SprintKpiGrid.tsx src/components/sprints/SprintKpiGrid.test.tsx src/components/sprints/SprintKpiGrid.module.css
git commit -m "feat: add iconBackground to StatCard, add SprintKpiGrid"
```

---

### Task 6: ActiveSprintBanner

**Files:**
- Create: `src/components/sprints/ActiveSprintBanner.tsx`
- Create: `src/components/sprints/ActiveSprintBanner.test.tsx`
- Create: `src/components/sprints/ActiveSprintBanner.module.css`

**Interfaces:**
- Consumes: `useSprintsStore` (Task 1), `useAnimatedStrokeOffset` (Task 3), `Avatar` (existing `src/components/ui/Avatar.tsx`).
- Produces: `<ActiveSprintBanner />` — renders nothing (not even an empty wrapper, matching `banner.style.display = 'none'` at `index.html:8040`) when no sprint has `status === 'active'`; consumed by `SprintsPage.tsx` (Task 13), which applies the shared query-state remount key described in Global Constraints.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActiveSprintBanner } from './ActiveSprintBanner'
import { useSprintsStore } from '../../store/sprintsStore'
import { MOCK_SPRINTS } from '../../data/mockSprints'

describe('ActiveSprintBanner', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
  })

  it('renders nothing when there is no active sprint', () => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS.filter((s) => s.status !== 'active') })
    const { container } = render(<ActiveSprintBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the active sprint name, goal, and progress percentage', () => {
    render(<ActiveSprintBanner />)
    expect(screen.getByText('SPRINT 03 — UX Polish & Integrations')).toBeInTheDocument()
    expect(screen.getByText(/Refine the user experience/)).toBeInTheDocument()
    expect(screen.getByText('58%')).toBeInTheDocument()
    expect(screen.getByText('26/45 pts')).toBeInTheDocument()
  })

  it('renders the task breakdown counts', () => {
    render(<ActiveSprintBanner />)
    expect(screen.getByText('6')).toBeInTheDocument() // done
    expect(screen.getByText('3')).toBeInTheDocument() // in progress
    expect(screen.getByText('2')).toBeInTheDocument() // todo
  })

  it('draws a burndown polyline only from non-null points', () => {
    const { container } = render(<ActiveSprintBanner />)
    // s3.burndown = [45,41,36,30,24,null,null,null] -> 5 usable points
    const polyline = container.querySelector('polyline')
    expect(polyline?.getAttribute('points')?.trim().split(' ')).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm vitest run src/components/sprints/ActiveSprintBanner.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `ActiveSprintBanner.module.css`**

Port verbatim from `index.html:1222-1264`, `:1349-1350`. Full source ranges to transcribe: `.active-sprint-banner`, `::before`, `.sprint-banner-inner` (grid, 3 columns), `.sprint-banner-left`, `.sprint-banner-badge` (+svg), `.sprint-banner-name`, `.sprint-banner-goal`, `.sprint-banner-meta`, `.sprint-banner-meta-item` (+svg), `.sprint-meta-accent`, `.sprint-ring-wrap`, `.sprint-ring-svg` (rotate -90deg), `.sprint-ring-bg`, `.sprint-ring-fill` (transition), `.sprint-ring-pct`, `.sprint-ring-label`, `.sprint-task-breakdown`, `.sprint-breakdown-title`, `.sprint-breakdown-row`, `.sprint-breakdown-label`, `.sprint-breakdown-dot`, `.sprint-breakdown-count`, `.sprint-mini-burndown`, `.sprint-burndown-title`, `.sprint-burndown-svg`, and the `@media (max-width: 900px)` single-column collapse. Rename each to the local camelCase equivalent (`.banner`, `.bannerInner`, `.bannerLeft`, `.bannerBadge`, `.bannerName`, `.bannerGoal`, `.bannerMeta`, `.bannerMetaItem`, `.metaAccent`, `.ringWrap`, `.ringSvg`, `.ringBg`, `.ringFill`, `.ringPct`, `.ringLabel`, `.taskBreakdown`, `.breakdownTitle`, `.breakdownRow`, `.breakdownLabel`, `.breakdownDot`, `.breakdownCount`, `.miniBurndown`, `.burndownTitle`, `.burndownSvg`) — same rename convention `ProjectDetailPanel.module.css` used for `sprint-detail-*` → camelCase.

- [ ] **Step 4: Implement `ActiveSprintBanner.tsx`**

```typescript
import { Zap, Calendar, Clock, Briefcase } from 'lucide-react'
import { useSprintsStore } from '../../store/sprintsStore'
import { useAnimatedStrokeOffset } from '../../hooks/useAnimatedStrokeOffset'
import { Avatar } from '../ui/Avatar'
import styles from './ActiveSprintBanner.module.css'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ActiveSprintBanner() {
  const sprint = useSprintsStore((s) => s.sprints.find((x) => x.status === 'active'))

  const offset = useAnimatedStrokeOffset(CIRCUMFERENCE, sprint?.progress ?? 0)

  if (!sprint) return null

  const burndownPoints = sprint.burndown.filter((v): v is number => v !== null)
  const n = burndownPoints.length
  const W = 160, H = 36
  const polylinePoints = n > 1
    ? burndownPoints.map((v, i) => `${(i / (n - 1)) * W},${H - (v / sprint.storyPoints) * H}`).join(' ')
    : ''

  return (
    <div className={styles.banner}>
      <div className={styles.bannerInner}>
        <div className={styles.bannerLeft}>
          <span className={styles.bannerBadge}><Zap aria-hidden="true" /> ACTIVE SPRINT</span>
          <div className={styles.bannerName}>{sprint.number} — {sprint.name}</div>
          <div className={styles.bannerGoal}>{sprint.goal}</div>
          <div className={styles.bannerMeta}>
            <span className={styles.bannerMetaItem}><Calendar aria-hidden="true" />{sprint.startDate} — <span className={styles.metaAccent}>{sprint.endDate}</span></span>
            <span className={styles.bannerMetaItem}><Clock aria-hidden="true" /><span className={styles.metaAccent}>{sprint.daysLeft} days</span> remaining</span>
            <span className={styles.bannerMetaItem}><Briefcase aria-hidden="true" />{sprint.project}</span>
            <span className={styles.bannerMetaItem} style={{ gap: 0 }}>
              {sprint.team.map((m) => (
                <Avatar key={m.i} name={m.i} fallbackStyle={{ background: m.c, fontSize: 8 }} style={{ width: 20, height: 20, borderColor: 'var(--bg-card)' }} />
              ))}
            </span>
          </div>
        </div>

        <div className={styles.ringWrap}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <svg className={styles.ringSvg} width="100" height="100" viewBox="0 0 100 100">
              <circle className={styles.ringBg} cx="50" cy="50" r={RADIUS} />
              <circle
                className={styles.ringFill}
                cx="50" cy="50" r={RADIUS}
                stroke={sprint.color}
                strokeDasharray={CIRCUMFERENCE.toFixed(2)}
                strokeDashoffset={offset.toFixed(2)}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
              <div className={styles.ringPct}>{sprint.progress}%</div>
              <div className={styles.ringLabel}>complete</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>{sprint.completedPoints}/{sprint.storyPoints} pts</div>
        </div>

        <div className={styles.taskBreakdown}>
          <div className={styles.breakdownTitle}>Task Breakdown</div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}><span className={styles.breakdownDot} style={{ background: 'var(--accent-green)' }} />Done</span>
            <span className={styles.breakdownCount}>{sprint.tasksDone}</span>
          </div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}><span className={styles.breakdownDot} style={{ background: 'var(--accent-yellow)' }} />In Progress</span>
            <span className={styles.breakdownCount}>{sprint.inProgress}</span>
          </div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}><span className={styles.breakdownDot} style={{ background: 'var(--accent-blue)' }} />To Do</span>
            <span className={styles.breakdownCount}>{sprint.todo}</span>
          </div>
          <div className={styles.miniBurndown}>
            <div className={styles.burndownTitle}>Burndown</div>
            <svg className={styles.burndownSvg} viewBox="0 0 160 36" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="160" y2="36" stroke="var(--border-default)" strokeWidth="1.5" strokeDasharray="4,3" />
              {polylinePoints && (
                <polyline points={polylinePoints} fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm vitest run src/components/sprints/ActiveSprintBanner.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/ActiveSprintBanner.tsx src/components/sprints/ActiveSprintBanner.test.tsx src/components/sprints/ActiveSprintBanner.module.css
git commit -m "feat: add ActiveSprintBanner with ring progress and mini burndown"
```

---

### Task 7: SprintStatsRow + SprintsToolbar

**Files:**
- Create: `src/components/sprints/SprintStatsRow.tsx`
- Create: `src/components/sprints/SprintStatsRow.test.tsx`
- Create: `src/components/sprints/SprintStatsRow.module.css`
- Create: `src/components/sprints/SprintsToolbar.tsx`
- Create: `src/components/sprints/SprintsToolbar.test.tsx`
- Create: `src/components/sprints/SprintsToolbar.module.css`

**Interfaces:**
- Consumes: `useSprintsStore` (Task 1), `Dropdown` (existing `src/components/ui/Dropdown.tsx`), `useToastStore` (existing).
- Produces: `<SprintStatsRow activeFilter={string} onFilterChange={(f: string) => void}>{children}</SprintStatsRow>` (children-slot composition — same pattern as `ProjectStatsRow`, learned the hard way in Phase 3.2/3.3 about needing siblings assembled by their parent, not each other). `<SprintsToolbar activeSort={string} onSortChange={(s: string) => void} searchQuery={string} onSearchChange={(q: string) => void} />`. Both consumed as row-siblings inside `SprintStatsRow` by `SprintsPage.tsx` (Task 13): `<SprintStatsRow ...><SprintsToolbar .../></SprintStatsRow>`.

Note: unlike `ProjectsToolbar`, this toolbar has **no Filter dropdown** — Sprints' Filter button lives in `SprintsPageHeader` (Task 8), not here. Confirmed against `index.html:3442-3494`: `sprint-filter-btn` is a header-level sibling of the view toggle and New Sprint button; only Sort + Search live inside `.tasks-toolbar` next to the stat chips.

- [ ] **Step 1: Write the failing test — `SprintStatsRow.test.tsx`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintStatsRow } from './SprintStatsRow'
import { useSprintsStore } from '../../store/sprintsStore'
import { MOCK_SPRINTS } from '../../data/mockSprints'

describe('SprintStatsRow', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
  })

  it('renders live counts computed from the full store list, not a filtered one', () => {
    render(<SprintStatsRow activeFilter="all" onFilterChange={() => {}} />)
    expect(screen.getByText('All').previousSibling).toHaveTextContent('5')
    expect(screen.getByText('Active').previousSibling).toHaveTextContent('1')
    expect(screen.getByText('Planning').previousSibling).toHaveTextContent('1')
    expect(screen.getByText('Completed').previousSibling).toHaveTextContent('2')
    expect(screen.getByText('Upcoming').previousSibling).toHaveTextContent('1')
  })

  it('calls onFilterChange with the clicked chip\'s filter key', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(<SprintStatsRow activeFilter="all" onFilterChange={onFilterChange} />)
    await user.click(screen.getByText('Active'))
    expect(onFilterChange).toHaveBeenCalledWith('active')
  })

  it('renders children as a row sibling, not nested inside the chip list', () => {
    render(
      <SprintStatsRow activeFilter="all" onFilterChange={() => {}}>
        <div data-testid="toolbar-slot">toolbar</div>
      </SprintStatsRow>,
    )
    expect(screen.getByTestId('toolbar-slot')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintStatsRow.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `SprintStatsRow.module.css`**

Reuses the existing `.task-stats-row`/`.task-stat-chip` shape already established by `TaskStatsRow`/`ProjectStatsRow` — port the same class shapes locally (per this project's own established per-consumer-duplication precedent, e.g. `.weekBtn`/`.roleBtn`). Base it on `ProjectStatsRow.module.css`'s `.row`/`.chip`/`.dot`/`.num`/`.label` structure; the visual chip styling is identical across Tasks/Projects/Sprints in the original (all reuse `.task-stat-chip`).

- [ ] **Step 4: Implement `SprintStatsRow.tsx`**

Dot colors and status→filter mapping from `index.html:3460-3486`: All=accent-blue, Active=accent-blue, Planning=accent-yellow, Completed=accent-green, Upcoming=accent-purple.

```typescript
import type { ReactNode } from 'react'
import { useSprintsStore } from '../../store/sprintsStore'
import styles from './SprintStatsRow.module.css'

const CHIPS = [
  { filter: 'all', label: 'All', dot: 'var(--accent-blue)' },
  { filter: 'active', label: 'Active', dot: 'var(--accent-blue)' },
  { filter: 'planning', label: 'Planning', dot: 'var(--accent-yellow)' },
  { filter: 'completed', label: 'Completed', dot: 'var(--accent-green)' },
  { filter: 'upcoming', label: 'Upcoming', dot: 'var(--accent-purple)' },
] as const

interface SprintStatsRowProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  children?: ReactNode
}

export function SprintStatsRow({ activeFilter, onFilterChange, children }: SprintStatsRowProps) {
  const sprints = useSprintsStore((s) => s.sprints)

  const countFor = (filter: string) => (filter === 'all' ? sprints.length : sprints.filter((s) => s.status === filter).length)

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

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/SprintStatsRow.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Write the failing test — `SprintsToolbar.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintsToolbar } from './SprintsToolbar'

describe('SprintsToolbar', () => {
  it('renders the Sort trigger and search input', () => {
    render(<SprintsToolbar activeSort="number" onSortChange={() => {}} searchQuery="" onSearchChange={() => {}} />)
    expect(screen.getByText('Sort')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search sprints...')).toBeInTheDocument()
  })

  it('calls onSortChange when a sort option is selected', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    render(<SprintsToolbar activeSort="number" onSortChange={onSortChange} searchQuery="" onSearchChange={() => {}} />)
    await user.click(screen.getByText('Sort'))
    await user.click(await screen.findByText('Story Points'))
    expect(onSortChange).toHaveBeenCalledWith('storyPts')
  })

  it('calls onSearchChange as the user types', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    render(<SprintsToolbar activeSort="number" onSortChange={() => {}} searchQuery="" onSearchChange={onSearchChange} />)
    await user.type(screen.getByPlaceholderText('Search sprints...'), 'ux')
    expect(onSearchChange).toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintsToolbar.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 8: Write `SprintsToolbar.module.css`**

Port the `.tasks-toolbar` / `.search-wrap` (`max-width: 190px` for this page, per `index.html:3490`) / `.search-input` / `.search-icon` shapes locally, same structure as `ProjectsToolbar.module.css`'s equivalent classes minus the filter-panel rules (no filter dropdown here).

- [ ] **Step 9: Implement `SprintsToolbar.tsx`**

Sort options from `index.html:6070-6075`.

```typescript
import { ArrowUpDown, Search, Hash, Type, BarChart2, Zap } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { useToastStore } from '../../store/toastStore'
import styles from './SprintsToolbar.module.css'

const SORT_OPTIONS = [
  { key: 'number', label: 'Sprint Number', icon: <Hash aria-hidden="true" /> },
  { key: 'name', label: 'Name (A–Z)', icon: <Type aria-hidden="true" /> },
  { key: 'progress', label: 'Progress', icon: <BarChart2 aria-hidden="true" /> },
  { key: 'storyPts', label: 'Story Points', icon: <Zap aria-hidden="true" /> },
] as const

interface SprintsToolbarProps {
  activeSort: string
  onSortChange: (sort: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function SprintsToolbar({ activeSort, onSortChange, searchQuery, onSearchChange }: SprintsToolbarProps) {
  const showToast = useToastStore((s) => s.showToast)

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

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} aria-hidden="true" />
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search sprints..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/SprintsToolbar.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 11: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/SprintStatsRow.tsx src/components/sprints/SprintStatsRow.test.tsx src/components/sprints/SprintStatsRow.module.css src/components/sprints/SprintsToolbar.tsx src/components/sprints/SprintsToolbar.test.tsx src/components/sprints/SprintsToolbar.module.css
git commit -m "feat: add SprintStatsRow and SprintsToolbar"
```

---

### Task 8: SprintsPageHeader (view toggle + Filter dropdown + New Sprint)

**Files:**
- Create: `src/components/sprints/SprintsPageHeader.tsx`
- Create: `src/components/sprints/SprintsPageHeader.test.tsx`
- Create: `src/components/sprints/SprintsPageHeader.module.css`

**Interfaces:**
- Consumes: `Dropdown` (existing), `useToastStore` (existing).
- Produces: `<SprintsPageHeader view={'list'|'board'} onViewChange={(v) => void} statusFilters={{ active, planning, upcoming, completed }} onApplyStatusFilters={(checked: string[] | null) => void} onNewSprint={() => void} />` — consumed by `SprintsPage.tsx` (Task 13), which owns and lifts `dropdownFilters` state.

Per Global Constraints, the Status checkboxes here are real (drive `onApplyStatusFilters`) and the Project checkboxes are decorative (local `useState`, never escape this component) — both groups live in the same `dd-sprint-filter` dropdown, so this single component owns both.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintsPageHeader } from './SprintsPageHeader'

describe('SprintsPageHeader', () => {
  it('renders breadcrumb, heading, and both view-toggle buttons', () => {
    render(<SprintsPageHeader view="list" onViewChange={() => {}} onApplyStatusFilters={() => {}} onNewSprint={() => {}} />)
    expect(screen.getByText('Overview / Sprints')).toBeInTheDocument()
    expect(screen.getByText('Sprints')).toBeInTheDocument()
    expect(screen.getByText('List')).toBeInTheDocument()
    expect(screen.getByText('Board')).toBeInTheDocument()
  })

  it('calls onViewChange when the Board button is clicked', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(<SprintsPageHeader view="list" onViewChange={onViewChange} onApplyStatusFilters={() => {}} onNewSprint={() => {}} />)
    await user.click(screen.getByText('Board'))
    expect(onViewChange).toHaveBeenCalledWith('board')
  })

  it('calls onNewSprint when New Sprint is clicked', async () => {
    const user = userEvent.setup()
    const onNewSprint = vi.fn()
    render(<SprintsPageHeader view="list" onViewChange={() => {}} onApplyStatusFilters={() => {}} onNewSprint={onNewSprint} />)
    await user.click(screen.getByText('New Sprint'))
    expect(onNewSprint).toHaveBeenCalled()
  })

  it('Apply calls onApplyStatusFilters with the checked status keys, or null when all 4 remain checked', async () => {
    const user = userEvent.setup()
    const onApplyStatusFilters = vi.fn()
    render(<SprintsPageHeader view="list" onViewChange={() => {}} onApplyStatusFilters={onApplyStatusFilters} onNewSprint={() => {}} />)
    await user.click(screen.getByText('Filter'))
    await user.click(screen.getByLabelText('Active'))
    await user.click(screen.getByText('Apply'))
    expect(onApplyStatusFilters).toHaveBeenCalledWith(['planning', 'upcoming', 'completed'])
  })

  it('Clear resets all status checkboxes and calls onApplyStatusFilters(null)', async () => {
    const user = userEvent.setup()
    const onApplyStatusFilters = vi.fn()
    render(<SprintsPageHeader view="list" onViewChange={() => {}} onApplyStatusFilters={onApplyStatusFilters} onNewSprint={() => {}} />)
    await user.click(screen.getByText('Filter'))
    await user.click(screen.getByLabelText('Active'))
    await user.click(screen.getByText('Clear'))
    expect(onApplyStatusFilters).toHaveBeenCalledWith(null)
    expect(screen.getByLabelText('Active')).toBeChecked()
  })

  it('Project checkboxes are decorative and never reach onApplyStatusFilters', async () => {
    const user = userEvent.setup()
    const onApplyStatusFilters = vi.fn()
    render(<SprintsPageHeader view="list" onViewChange={() => {}} onApplyStatusFilters={onApplyStatusFilters} onNewSprint={() => {}} />)
    await user.click(screen.getByText('Filter'))
    await user.click(screen.getByLabelText('Web 3 App for Fxtrade'))
    await user.click(screen.getByText('Apply'))
    expect(onApplyStatusFilters).toHaveBeenCalledWith(null) // all 4 statuses still checked; project group is decorative
  })
})
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintsPageHeader.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `SprintsPageHeader.module.css`**

Port `.tasks-page-header`/`.view-toggle`/`.view-btn` (already-established shape, matching `ProjectsPageHeader.module.css`) plus the filter-panel classes (`filter-section-title`/`filter-check-item`/`filter-footer`/`filter-clear`/`filter-apply`), copied from the equivalent block in `ProjectsToolbar.module.css` (same visual spec, `index.html`'s `.filter-*` classes are shared globally in the original).

- [ ] **Step 4: Implement `SprintsPageHeader.tsx`**

Status list from `index.html:6079-6083`; project checkboxes (decorative) from `:6085-6088` — note only 3 projects listed here (not 4, unlike the New/Edit Sprint modal's project `<select>`), transcribe exactly.

```typescript
import { useState } from 'react'
import { List, LayoutTemplate, SlidersHorizontal, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dropdown } from '../ui/Dropdown'
import { useToastStore } from '../../store/toastStore'
import styles from './SprintsPageHeader.module.css'

const STATUS_KEYS = ['active', 'planning', 'upcoming', 'completed'] as const
const STATUS_LABELS: Record<(typeof STATUS_KEYS)[number], string> = {
  active: 'Active', planning: 'Planning', upcoming: 'Upcoming', completed: 'Completed',
}
const FILTER_PROJECTS = ['Web 3 App for Fxtrade', 'Healthydog Landing Page', 'Redesign of Website']

interface SprintsPageHeaderProps {
  view: 'list' | 'board'
  onViewChange: (view: 'list' | 'board') => void
  onApplyStatusFilters: (checked: string[] | null) => void
  onNewSprint: () => void
}

export function SprintsPageHeader({ view, onViewChange, onApplyStatusFilters, onNewSprint }: SprintsPageHeaderProps) {
  const showToast = useToastStore((s) => s.showToast)
  const [statusChecked, setStatusChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(STATUS_KEYS.map((k) => [k, true])),
  )
  // Decorative — index.html's sprint-filter-apply handler (:8402-8408) never
  // reads sf-p1/sf-p2/sf-p3, so this state never leaves the component.
  const [projectChecked, setProjectChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(FILTER_PROJECTS.map((p) => [p, true])),
  )

  const handleClear = () => {
    setStatusChecked(Object.fromEntries(STATUS_KEYS.map((k) => [k, true])))
    setProjectChecked(Object.fromEntries(FILTER_PROJECTS.map((p) => [p, true])))
    onApplyStatusFilters(null)
    showToast('Filters cleared', 'info', 1500)
  }

  const handleApply = () => {
    const checked = STATUS_KEYS.filter((k) => statusChecked[k])
    onApplyStatusFilters(checked.length === 4 ? null : checked)
    showToast('Filters applied', 'success', 1500)
  }

  return (
    <div className={styles.header}>
      <div>
        <div className={styles.breadcrumb}>Overview / Sprints</div>
        <div className={styles.heading}>Sprints</div>
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

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <Button variant="secondary">
              <SlidersHorizontal aria-hidden="true" /> Filter
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content className={styles.filterPanel}>
            <div className={styles.filterSectionTitle}>Status</div>
            {STATUS_KEYS.map((key) => (
              <label key={key} className={styles.filterCheckItem}>
                <input
                  type="checkbox"
                  checked={statusChecked[key]}
                  onChange={(e) => setStatusChecked((f) => ({ ...f, [key]: e.target.checked }))}
                />
                <span>{STATUS_LABELS[key]}</span>
              </label>
            ))}
            <Dropdown.Divider />
            <div className={styles.filterSectionTitle}>Project</div>
            {FILTER_PROJECTS.map((project) => (
              <label key={project} className={styles.filterCheckItem}>
                <input
                  type="checkbox"
                  checked={projectChecked[project]}
                  onChange={(e) => setProjectChecked((f) => ({ ...f, [project]: e.target.checked }))}
                />
                <span>{project}</span>
              </label>
            ))}
            <div className={styles.filterFooter}>
              <button type="button" className={styles.filterClear} onClick={handleClear}>Clear</button>
              <button type="button" className={styles.filterApply} onClick={handleApply}>Apply</button>
            </div>
          </Dropdown.Content>
        </Dropdown.Root>

        <Button onClick={onNewSprint}>
          <Plus aria-hidden="true" /> New Sprint
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm vitest run src/components/sprints/SprintsPageHeader.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/SprintsPageHeader.tsx src/components/sprints/SprintsPageHeader.test.tsx src/components/sprints/SprintsPageHeader.module.css
git commit -m "feat: add SprintsPageHeader with view toggle and mixed-fidelity Filter dropdown"
```

---

### Task 9: SprintItem + SprintsListView

**Files:**
- Create: `src/components/sprints/SprintItem.tsx`
- Create: `src/components/sprints/SprintItem.test.tsx`
- Create: `src/components/sprints/SprintItem.module.css`
- Create: `src/components/sprints/SprintsListView.tsx`
- Create: `src/components/sprints/SprintsListView.test.tsx`

**Interfaces:**
- Consumes: `SprintStatusBadge` (Task 4), `useAnimatedWidth` (existing, Phase 3.4), `Avatar`, `Dropdown` (existing), `sprintDetailStore`/`sprintModalStore`/`sprintsStore`.
- Produces: `<SprintItem sprint={Sprint} onOpenDetail={(id) => void} onEdit={(id) => void} onMarkComplete={(id) => void} onDelete={(id, name) => void} />`, `<SprintsListView sprints={Sprint[]} onOpenDetail={...} onEdit={...} onMarkComplete={...} onDelete={...} />` — consumed by `SprintsPage.tsx` (Task 13).

The three-dot context menu replaces the original's hand-positioned `dd-sprint-ctx` panel with the existing `Dropdown` primitive (same substitution `ProjectCard` made for its own three-dot menu in Phase 3.4) — same 4 actions: View Details, Edit Sprint, Mark Complete, Delete.

- [ ] **Step 1: Write the failing tests — `SprintItem.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintItem } from './SprintItem'
import { MOCK_SPRINTS } from '../../data/mockSprints'

const sprint = MOCK_SPRINTS[2] // s3, active, 58%, 4-person team

describe('SprintItem', () => {
  it('renders number, name, goal, status, dates, progress, points, and team', () => {
    render(<SprintItem sprint={sprint} onOpenDetail={() => {}} onEdit={() => {}} onMarkComplete={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('SPRINT 03')).toBeInTheDocument()
    expect(screen.getByText('UX Polish & Integrations')).toBeInTheDocument()
    expect(screen.getByText(/Refine the user experience/)).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('6/11 tasks')).toBeInTheDocument()
    expect(screen.getByText('58%')).toBeInTheDocument()
    expect(screen.getByText('26')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument() // 4-member team, 3 shown + overflow
  })

  it('calls onOpenDetail when the row is clicked', async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()
    render(<SprintItem sprint={sprint} onOpenDetail={onOpenDetail} onEdit={() => {}} onMarkComplete={() => {}} onDelete={() => {}} />)
    await user.click(screen.getByText('UX Polish & Integrations'))
    expect(onOpenDetail).toHaveBeenCalledWith('s3')
  })

  it('the three-dot menu stops propagation and does not also open the detail panel', async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()
    render(<SprintItem sprint={sprint} onOpenDetail={onOpenDetail} onEdit={() => {}} onMarkComplete={() => {}} onDelete={() => {}} />)
    await user.click(screen.getByLabelText('More options'))
    expect(onOpenDetail).not.toHaveBeenCalled()
    expect(await screen.findByText('Mark Complete')).toBeInTheDocument()
  })

  it('Delete in the context menu calls onDelete with id and name', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<SprintItem sprint={sprint} onOpenDetail={() => {}} onEdit={() => {}} onMarkComplete={() => {}} onDelete={onDelete} />)
    await user.click(screen.getByLabelText('More options'))
    await user.click(await screen.findByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('s3', 'UX Polish & Integrations')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintItem.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `SprintItem.module.css`**

Port verbatim from `index.html:1267-1290`: `.sprint-item` (+`:hover`), `.sprint-item-accent`, `.sprint-item-inner`, `.sprint-item-num`, `.sprint-item-main`, `.sprint-item-name`, `.sprint-item-goal`, `.sprint-item-dates` (+svg), `.sprint-item-progress`, `.sprint-item-prog-label`, `.sprint-item-prog-tasks`, `.sprint-item-prog-pct`, `.sprint-item-prog-track`, `.sprint-item-prog-fill` (transition), `.sprint-item-pts`, `.sprint-item-pts-num`, `.sprint-item-pts-label`, `.sprint-item-team`. Wrap the whole list in a `.sprintsList { display:flex; flex-direction:column; gap:10px; }` container class in `SprintsListView`'s own module (matches `index.html:8124`'s `<div class="sprints-list">`).

- [ ] **Step 4: Implement `SprintItem.tsx`**

```typescript
import { Calendar, MoreHorizontal, Eye, Edit2, CheckCircle2, Trash2 } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Dropdown } from '../ui/Dropdown'
import { SprintStatusBadge } from './SprintStatusBadge'
import { useAnimatedWidth } from '../../hooks/useAnimatedWidth'
import type { Sprint } from '../../types/sprint'
import styles from './SprintItem.module.css'

interface SprintItemProps {
  sprint: Sprint
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onMarkComplete: (id: string) => void
  onDelete: (id: string, name: string) => void
}

export function SprintItem({ sprint, onOpenDetail, onEdit, onMarkComplete, onDelete }: SprintItemProps) {
  const fillWidth = useAnimatedWidth(sprint.progress)
  const visibleTeam = sprint.team.slice(0, 3)
  const overflowCount = sprint.team.length - 3

  return (
    <div
      className={styles.item}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(sprint.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail(sprint.id)
        }
      }}
    >
      <div className={styles.accent} style={{ background: sprint.color }} />
      <div className={styles.inner}>
        <div className={styles.num}>{sprint.number}</div>
        <div className={styles.main}>
          <div className={styles.name}>{sprint.name}</div>
          <div className={styles.goal}>{sprint.goal}</div>
        </div>
        <SprintStatusBadge status={sprint.status} />
        <div className={styles.dates}><Calendar aria-hidden="true" />{sprint.startDate} — {sprint.endDate}</div>
        <div className={styles.progress}>
          <div className={styles.progLabel}>
            <span className={styles.progTasks}>{sprint.tasksDone}/{sprint.tasksTotal} tasks</span>
            <span className={styles.progPct}>{sprint.progress}%</span>
          </div>
          <div className={styles.progTrack}><div className={styles.progFill} style={{ background: sprint.color, width: `${fillWidth}%` }} /></div>
        </div>
        <div className={styles.pts}>
          <div className={styles.ptsNum}>{sprint.completedPoints}<span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Sans'" }}>/{sprint.storyPoints}</span></div>
          <div className={styles.ptsLabel}>pts</div>
        </div>
        <div className={styles.team}>
          {visibleTeam.map((m) => (
            <Avatar key={m.i} name={m.i} fallbackStyle={{ background: m.c, fontSize: 9 }} style={{ width: 24, height: 24, borderColor: 'var(--bg-card)' }} />
          ))}
          {overflowCount > 0 && <div className={styles.avatarMore}>+{overflowCount}</div>}
        </div>

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="More options"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation() }}
            >
              <MoreHorizontal aria-hidden="true" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item icon={<Eye aria-hidden="true" />} onSelect={() => onOpenDetail(sprint.id)}>View Details</Dropdown.Item>
            <Dropdown.Item icon={<Edit2 aria-hidden="true" />} onSelect={() => onEdit(sprint.id)}>Edit Sprint</Dropdown.Item>
            <Dropdown.Item icon={<CheckCircle2 aria-hidden="true" />} onSelect={() => onMarkComplete(sprint.id)}>Mark Complete</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item icon={<Trash2 aria-hidden="true" />} danger onSelect={() => onDelete(sprint.id, sprint.name)}>Delete</Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/SprintItem.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Write the failing test — `SprintsListView.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintsListView } from './SprintsListView'
import { MOCK_SPRINTS } from '../../data/mockSprints'

describe('SprintsListView', () => {
  it('renders one SprintItem per sprint', () => {
    render(<SprintsListView sprints={MOCK_SPRINTS} onOpenDetail={() => {}} onEdit={() => {}} onMarkComplete={() => {}} onDelete={() => {}} />)
    expect(screen.getAllByRole('button', { name: /^SPRINT 0/ })).toHaveLength(0) // rows aren't individually named; sanity-check via item count instead
    expect(screen.getByText('Foundation & Architecture')).toBeInTheDocument()
    expect(screen.getByText('Post-Launch Iteration')).toBeInTheDocument()
  })

  it('renders an empty state with a New Sprint button when the list is empty', async () => {
    const user = userEvent.setup()
    const onNewSprint = vi.fn()
    render(<SprintsListView sprints={[]} onOpenDetail={() => {}} onEdit={() => {}} onMarkComplete={() => {}} onDelete={() => {}} onNewSprint={onNewSprint} />)
    expect(screen.getByText('No sprints found')).toBeInTheDocument()
    await user.click(screen.getByText('New Sprint'))
    expect(onNewSprint).toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintsListView.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 8: Implement `SprintsListView.tsx`**

Empty state copy from `index.html:8121`.

```typescript
import { Zap, Plus } from 'lucide-react'
import { SprintItem } from './SprintItem'
import { Button } from '../ui/Button'
import type { Sprint } from '../../types/sprint'
import styles from './SprintItem.module.css'

interface SprintsListViewProps {
  sprints: Sprint[]
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onMarkComplete: (id: string) => void
  onDelete: (id: string, name: string) => void
  onNewSprint?: () => void
}

export function SprintsListView({ sprints, onOpenDetail, onEdit, onMarkComplete, onDelete, onNewSprint }: SprintsListViewProps) {
  if (sprints.length === 0) {
    return (
      <div className={styles.empty}>
        <Zap aria-hidden="true" width={44} height={44} />
        <div className={styles.emptyTitle}>No sprints found</div>
        <div className={styles.emptySub}>Try adjusting your filter or search</div>
        {onNewSprint && (
          <Button onClick={onNewSprint} style={{ marginTop: 8 }}>
            <Plus aria-hidden="true" /> New Sprint
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.sprintsList}>
      {sprints.map((sprint) => (
        <SprintItem key={sprint.id} sprint={sprint} onOpenDetail={onOpenDetail} onEdit={onEdit} onMarkComplete={onMarkComplete} onDelete={onDelete} />
      ))}
    </div>
  )
}
```

Add `.sprintsList`, `.empty`, `.emptyTitle`, `.emptySub` rules to `SprintItem.module.css` (reuse the `.proj-empty*` shape already established for Projects' empty state).

- [ ] **Step 9: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/SprintsListView.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 10: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/SprintItem.tsx src/components/sprints/SprintItem.test.tsx src/components/sprints/SprintItem.module.css src/components/sprints/SprintsListView.tsx src/components/sprints/SprintsListView.test.tsx
git commit -m "feat: add SprintItem and SprintsListView"
```

---

### Task 10: SprintBoardCard + SprintsBoardView

**Files:**
- Create: `src/components/sprints/SprintBoardCard.tsx`
- Create: `src/components/sprints/SprintBoardCard.test.tsx`
- Create: `src/components/sprints/SprintBoardCard.module.css`
- Create: `src/components/sprints/SprintsBoardView.tsx`
- Create: `src/components/sprints/SprintsBoardView.test.tsx`

**Interfaces:**
- Consumes: `useAnimatedWidth` (existing), `Avatar`.
- Produces: `<SprintBoardCard sprint={Sprint} onOpenDetail={(id) => void} />`, `<SprintsBoardView sprints={Sprint[]} onOpenDetail={(id) => void} />` — consumed by `SprintsPage.tsx` (Task 13).

Per Global Constraints: fixed column order `active, planning, upcoming, completed`; only 2 team avatars shown, no overflow indicator.

- [ ] **Step 1: Write the failing tests — `SprintBoardCard.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintBoardCard } from './SprintBoardCard'
import { MOCK_SPRINTS } from '../../data/mockSprints'

const sprint = MOCK_SPRINTS[2] // s3, 4-person team

describe('SprintBoardCard', () => {
  it('renders number, name, goal, and points', () => {
    render(<SprintBoardCard sprint={sprint} onOpenDetail={() => {}} />)
    expect(screen.getByText('SPRINT 03')).toBeInTheDocument()
    expect(screen.getByText('UX Polish & Integrations')).toBeInTheDocument()
    expect(screen.getByText('26/45 pts')).toBeInTheDocument()
  })

  it('shows only 2 team avatars with no overflow indicator, unlike the list row', () => {
    render(<SprintBoardCard sprint={sprint} onOpenDetail={() => {}} />)
    expect(screen.queryByText('+2')).not.toBeInTheDocument()
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument()
  })

  it('calls onOpenDetail when clicked', async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()
    render(<SprintBoardCard sprint={sprint} onOpenDetail={onOpenDetail} />)
    await user.click(screen.getByText('UX Polish & Integrations'))
    expect(onOpenDetail).toHaveBeenCalledWith('s3')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintBoardCard.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `SprintBoardCard.module.css`**

Port verbatim from `index.html:1299-1311`: `.sprint-board-view`, `.sprint-board-col` (+header, +title, +count), `.sprint-board-cards`, `.sprint-board-card` (+`:hover`), `.sprint-board-card-num`, `.sprint-board-card-name`, `.sprint-board-card-goal` (2-line clamp), `.sprint-board-card-footer`, `.sprint-board-card-pts`.

- [ ] **Step 4: Implement `SprintBoardCard.tsx`**

```typescript
import { Zap } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { useAnimatedWidth } from '../../hooks/useAnimatedWidth'
import type { Sprint } from '../../types/sprint'
import styles from './SprintBoardCard.module.css'

interface SprintBoardCardProps {
  sprint: Sprint
  onOpenDetail: (id: string) => void
}

export function SprintBoardCard({ sprint, onOpenDetail }: SprintBoardCardProps) {
  const fillWidth = useAnimatedWidth(sprint.progress)

  return (
    <div className={styles.card} onClick={() => onOpenDetail(sprint.id)}>
      <div className={styles.num}>{sprint.number}</div>
      <div className={styles.name}>{sprint.name}</div>
      <div className={styles.goal}>{sprint.goal}</div>
      <div className={styles.footer}>
        <span className={styles.pts}><Zap aria-hidden="true" />{sprint.completedPoints}/{sprint.storyPoints} pts</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {sprint.team.slice(0, 2).map((m) => (
            <Avatar key={m.i} name={m.i} fallbackStyle={{ background: m.c, fontSize: 8 }} style={{ width: 20, height: 20, borderColor: 'var(--bg-base)' }} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div className={styles.progTrack}><div className={styles.progFill} style={{ background: sprint.color, width: `${fillWidth}%` }} /></div>
      </div>
    </div>
  )
}
```

Add `.progTrack`/`.progFill` to `SprintBoardCard.module.css`, matching `.sprint-item-prog-track`/`.sprint-item-prog-fill`'s values (`index.html:1285-1286`) — reused inline here at card scope, matching `index.html:8213`'s reuse of the same class names on board cards.

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/SprintBoardCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Write the failing tests — `SprintsBoardView.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SprintsBoardView } from './SprintsBoardView'
import { MOCK_SPRINTS } from '../../data/mockSprints'

describe('SprintsBoardView', () => {
  it('renders 4 columns in the fixed order active, planning, upcoming, completed', () => {
    render(<SprintsBoardView sprints={MOCK_SPRINTS} onOpenDetail={() => {}} />)
    const titles = screen.getAllByText(/^(Active|Planning|Upcoming|Completed)$/).map((el) => el.textContent)
    expect(titles).toEqual(['Active', 'Planning', 'Upcoming', 'Completed'])
  })

  it('places each sprint card in the column matching its status', () => {
    render(<SprintsBoardView sprints={MOCK_SPRINTS} onOpenDetail={() => {}} />)
    // s1 and s2 are both 'completed' -> Completed column has 2 cards
    expect(screen.getByText('2').closest('[class*="colCount"]')).toBeInTheDocument()
  })

  it('shows a "No sprints" placeholder for an empty column', () => {
    render(<SprintsBoardView sprints={MOCK_SPRINTS.filter((s) => s.status !== 'upcoming')} onOpenDetail={() => {}} />)
    expect(screen.getByText('No sprints')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintsBoardView.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 8: Implement `SprintsBoardView.tsx`**

Column definitions and order from `index.html:8185-8190`.

```typescript
import { SprintBoardCard } from './SprintBoardCard'
import type { Sprint, SprintStatus } from '../../types/sprint'
import styles from './SprintBoardCard.module.css'

const COLUMNS: { key: SprintStatus; label: string; color: string }[] = [
  { key: 'active', label: 'Active', color: '#4A90FF' },
  { key: 'planning', label: 'Planning', color: '#EAB308' },
  { key: 'upcoming', label: 'Upcoming', color: '#A855F7' },
  { key: 'completed', label: 'Completed', color: '#22C55E' },
]

interface SprintsBoardViewProps {
  sprints: Sprint[]
  onOpenDetail: (id: string) => void
}

export function SprintsBoardView({ sprints, onOpenDetail }: SprintsBoardViewProps) {
  return (
    <div className={styles.boardView}>
      {COLUMNS.map((col) => {
        const colSprints = sprints.filter((s) => s.status === col.key)
        return (
          <div key={col.key} className={styles.boardCol}>
            <div className={styles.boardColHeader}>
              <div className={styles.boardColTitle}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                {col.label} <span className={styles.boardColCount}>{colSprints.length}</span>
              </div>
            </div>
            <div className={styles.boardCards}>
              {colSprints.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: '20px 0' }}>No sprints</div>
                : colSprints.map((sprint) => <SprintBoardCard key={sprint.id} sprint={sprint} onOpenDetail={onOpenDetail} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

Add `.boardView`, `.boardCol`, `.boardColHeader`, `.boardColTitle`, `.boardColCount`, `.boardCards` to `SprintBoardCard.module.css` (or split into a sibling `SprintsBoardView.module.css` if preferred — keep whichever keeps each file's responsibility clear per the file-structure guidance).

- [ ] **Step 9: Run tests, verify they pass**

Run: `pnpm vitest run src/components/sprints/SprintsBoardView.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 10: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/SprintBoardCard.tsx src/components/sprints/SprintBoardCard.test.tsx src/components/sprints/SprintBoardCard.module.css src/components/sprints/SprintsBoardView.tsx src/components/sprints/SprintsBoardView.test.tsx
git commit -m "feat: add SprintBoardCard and SprintsBoardView"
```

---

### Task 11: SprintDetailPanel

**Files:**
- Create: `src/components/sprints/SprintDetailPanel.tsx`
- Create: `src/components/sprints/SprintDetailPanel.test.tsx`
- Create: `src/components/sprints/SprintDetailPanel.module.css`

**Interfaces:**
- Consumes: `sprintDetailStore` (Task 2), `sprintsStore` (Task 1), `SprintStatusBadge` (Task 4), `useAnimatedWidth` (existing), `Avatar`.
- Produces: `<SprintDetailPanel onEdit={(id) => void} onDelete={(id, name) => void} />` — consumed by `SprintsPage.tsx` (Task 13). Follows `ProjectDetailPanel.tsx` byte-for-byte for the overlay/inert/Escape/last-id-while-closing scaffolding (see Global Constraints) — only the body content differs.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SprintDetailPanel } from './SprintDetailPanel'
import { useSprintDetailStore } from '../../store/sprintDetailStore'
import { useSprintsStore } from '../../store/sprintsStore'
import { MOCK_SPRINTS } from '../../data/mockSprints'

describe('SprintDetailPanel', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
    useSprintDetailStore.setState({ openSprintId: null })
  })

  it('renders nothing meaningfully open when no sprint is selected', () => {
    render(<SprintDetailPanel onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByTestId('sprint-detail-overlay')).toHaveAttribute('data-open', 'false')
  })

  it('renders sprint name, goal, meta grid, and progress when open', () => {
    useSprintDetailStore.setState({ openSprintId: 's3' })
    render(<SprintDetailPanel onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('UX Polish & Integrations')).toBeInTheDocument()
    expect(screen.getByText('Nov 4, 2024')).toBeInTheDocument()
    expect(screen.getByText('26 / 45')).toBeInTheDocument()
    expect(screen.getByText('6 of 11 tasks done')).toBeInTheDocument()
  })

  it('shows "—" for velocity on a sprint with velocity: null', () => {
    useSprintDetailStore.setState({ openSprintId: 's3' })
    render(<SprintDetailPanel onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the Team Velocity bar chart only when at least one sprint has recorded velocity, highlighting the current sprint', () => {
    useSprintDetailStore.setState({ openSprintId: 's3' })
    render(<SprintDetailPanel onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Team Velocity')).toBeInTheDocument()
    expect(screen.getByText('S01')).toBeInTheDocument()
    expect(screen.getByText('S02')).toBeInTheDocument()
  })

  it('renders the full sprint task checklist with done/in-progress/todo badges', () => {
    useSprintDetailStore.setState({ openSprintId: 's3' })
    render(<SprintDetailPanel onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Sprint Tasks (6/11)')).toBeInTheDocument()
    expect(screen.getByText('Payment gateway (Stripe)')).toBeInTheDocument()
    expect(screen.getByText('Accessibility audit')).toBeInTheDocument()
  })

  it('Escape closes the panel', () => {
    useSprintDetailStore.setState({ openSprintId: 's3' })
    render(<SprintDetailPanel onEdit={() => {}} onDelete={() => {}} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(useSprintDetailStore.getState().openSprintId).toBeNull()
  })

  it('Edit button calls onEdit with the open sprint id and closes the panel', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    useSprintDetailStore.setState({ openSprintId: 's3' })
    render(<SprintDetailPanel onEdit={onEdit} onDelete={() => {}} />)
    await user.click(screen.getByTitle('Edit sprint'))
    expect(onEdit).toHaveBeenCalledWith('s3')
    expect(useSprintDetailStore.getState().openSprintId).toBeNull()
  })
})
```

(Add `fireEvent` and `userEvent` imports alongside the existing `render`/`screen` import at the top, matching `ProjectDetailPanel.test.tsx`'s import list.)

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/SprintDetailPanel.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `SprintDetailPanel.module.css`**

Port verbatim from `index.html:1313-1347`: `.sprint-detail-overlay` (+`.open`), `.sprint-detail-panel` (+`.open`), `.sprint-detail-header`, `.sprint-detail-header-left`, `.sprint-detail-actions`, `.sprint-detail-body` (+scrollbar), `.sprint-detail-section`, `.sprint-detail-section-label`, `.sprint-detail-title-text`, `.sprint-detail-goal-text`, `.sprint-meta-grid`, `.sprint-meta-cell`, `.sprint-meta-cell-label`, `.sprint-meta-cell-value`, `.sprint-big-progress`, `.sprint-big-progress-bar`, `.sprint-big-progress-fill` (transition), `.sprint-big-progress-meta`, `.sprint-detail-task-list`, `.sprint-detail-task-item` (+`:hover`), `.sprint-detail-task-check` (+`.done`, +`::after`), `.sprint-detail-task-name` (+`.done`), `.velocity-bars`, `.velocity-bar-wrap`, `.velocity-bar`, `.velocity-bar-label`, `.velocity-bar-num`. Reuse `.headerBtn`/`.deleteBtn` names for the action buttons, matching `ProjectDetailPanel.module.css`'s local convention (these reuse the global `.task-action-btn`/`.detail-panel-close` visual spec — define locally, same duplication precedent already accepted for `ProjectDetailPanel`).

- [ ] **Step 4: Implement `SprintDetailPanel.tsx`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { Edit2, Trash2, X } from 'lucide-react'
import { useSprintDetailStore } from '../../store/sprintDetailStore'
import { useSprintsStore } from '../../store/sprintsStore'
import { Avatar } from '../ui/Avatar'
import { SprintStatusBadge } from './SprintStatusBadge'
import { useAnimatedWidth } from '../../hooks/useAnimatedWidth'
import styles from './SprintDetailPanel.module.css'

interface SprintDetailPanelProps {
  onEdit: (id: string) => void
  onDelete: (id: string, name: string) => void
}

export function SprintDetailPanel({ onEdit, onDelete }: SprintDetailPanelProps) {
  const openSprintId = useSprintDetailStore((s) => s.openSprintId)
  const close = useSprintDetailStore((s) => s.close)
  const sprints = useSprintsStore((s) => s.sprints)

  const [lastSprintId, setLastSprintId] = useState<string | null>(null)
  const [prevOpenSprintId, setPrevOpenSprintId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    if (document.activeElement instanceof HTMLElement && panelRef.current?.contains(document.activeElement)) {
      document.activeElement.blur()
    }
    close()
  }, [close])

  if (openSprintId !== prevOpenSprintId) {
    setPrevOpenSprintId(openSprintId)
    if (openSprintId !== null) setLastSprintId(openSprintId)
  }

  const isOpen = openSprintId !== null

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleClose])

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.inert = !isOpen
    }
  }, [isOpen])

  const displaySprintId = openSprintId ?? lastSprintId
  const sprint = sprints.find((s) => s.id === displaySprintId) ?? null

  const fillWidth = useAnimatedWidth(sprint?.progress ?? 0)

  const vSprints = sprints.filter((s) => s.velocity !== null)
  const maxVel = vSprints.length ? Math.max(...vSprints.map((s) => s.velocity as number)) : 1

  if (!sprint) {
    return (
      <>
        <div className={styles.overlay} data-open={false} data-testid="sprint-detail-overlay" />
        <div ref={panelRef} className={styles.panel} data-open={false} />
      </>
    )
  }

  const handleEdit = () => {
    const id = sprint.id
    handleClose()
    onEdit(id)
  }
  const handleDelete = () => {
    const id = sprint.id
    const name = sprint.name
    handleClose()
    onDelete(id, name)
  }

  return (
    <>
      <div className={styles.overlay} data-open={isOpen} data-testid="sprint-detail-overlay" onClick={handleClose} />
      <div ref={panelRef} className={styles.panel} data-open={isOpen}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.accentDot} style={{ background: sprint.color }} />
            <SprintStatusBadge status={sprint.status} />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.headerBtn} title="Edit sprint" aria-label="Edit sprint" onClick={handleEdit}>
              <Edit2 aria-hidden="true" />
            </button>
            <button type="button" className={[styles.headerBtn, styles.deleteBtn].join(' ')} title="Delete sprint" aria-label="Delete sprint" onClick={handleDelete}>
              <Trash2 aria-hidden="true" />
            </button>
            <button type="button" className={styles.headerBtn} title="Close" aria-label="Close" onClick={handleClose}>
              <X aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.titleText}>{sprint.name}</div>
            <div className={styles.goalText}>{sprint.goal}</div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Details</div>
            <div className={styles.metaGrid}>
              <div className={styles.metaCell}><div className={styles.metaLabel}>Start Date</div><div className={styles.metaValue}>{sprint.startDate}</div></div>
              <div className={styles.metaCell}><div className={styles.metaLabel}>End Date</div><div className={styles.metaValue}>{sprint.endDate}</div></div>
              <div className={styles.metaCell}><div className={styles.metaLabel}>Story Points</div><div className={styles.metaValue}>{sprint.completedPoints} / {sprint.storyPoints}</div></div>
              <div className={styles.metaCell}><div className={styles.metaLabel}>Velocity</div><div className={styles.metaValue}>{sprint.velocity !== null ? `${sprint.velocity} pts` : '—'}</div></div>
              <div className={styles.metaCell} style={{ gridColumn: '1/-1' }}><div className={styles.metaLabel}>Project</div><div className={styles.metaValue} style={{ fontSize: 12 }}>{sprint.project}</div></div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Progress</div>
            <div className={styles.bigProgress}>
              <div className={styles.bigProgressMeta}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sprint.tasksDone} of {sprint.tasksTotal} tasks done</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: 'var(--text-primary)' }}>{sprint.progress}%</span>
              </div>
              <div className={styles.bigProgressBar}><div className={styles.bigProgressFill} style={{ background: sprint.color, width: `${fillWidth}%` }} /></div>
              <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />Done: {sprint.tasksDone}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-yellow)', display: 'inline-block' }} />In Progress: {sprint.inProgress}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block' }} />To Do: {sprint.todo}</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Team</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {sprint.team.map((m) => (
                <div key={m.i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <Avatar name={m.i} fallbackStyle={{ background: m.c, fontSize: 12 }} style={{ width: 38, height: 38 }} />
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{m.i}</div>
                </div>
              ))}
            </div>
          </div>

          {vSprints.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Team Velocity</div>
              <div className={styles.velocityBars}>
                {vSprints.map((s) => (
                  <div key={s.id} className={styles.velocityBarWrap}>
                    <div className={styles.velocityBarNum}>{s.velocity}</div>
                    <div
                      className={styles.velocityBar}
                      style={{
                        height: Math.round(((s.velocity as number) / maxVel) * 48),
                        background: s.id === sprint.id ? 'var(--accent-blue)' : 'var(--border-default)',
                      }}
                    />
                    <div className={styles.velocityBarLabel}>{s.number.replace('SPRINT ', 'S')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Sprint Tasks ({sprint.tasksDone}/{sprint.tasksTotal})</div>
            <div className={styles.taskList}>
              {sprint.sprintTasks.map((t, index) => (
                <div key={index} className={styles.taskItem}>
                  <div className={[styles.taskCheck, t.status === 'done' && styles.done].filter(Boolean).join(' ')} />
                  <span className={[styles.taskName, t.status === 'done' && styles.done].filter(Boolean).join(' ')}>{t.title}</span>
                  <span className={styles.taskStatusBadge}>
                    {t.status === 'done' ? 'Done' : t.status === 'in-progress' ? 'Active' : 'Todo'}
                  </span>
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

`sprintTasks` items have no stable id in the source data shape (matches `index.html`'s own `{title, status}` shape) and this list is never reordered/appended within a sprint's lifetime here, so an index key is safe — same ruling already made for `ProjectDetailPanel`'s milestones list.

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm vitest run src/components/sprints/SprintDetailPanel.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 6: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/SprintDetailPanel.tsx src/components/sprints/SprintDetailPanel.test.tsx src/components/sprints/SprintDetailPanel.module.css
git commit -m "feat: add SprintDetailPanel with velocity chart and task checklist"
```

---

### Task 12: NewSprintModal + EditSprintModal

**Files:**
- Create: `src/components/sprints/modals/NewSprintModal.tsx`
- Create: `src/components/sprints/modals/NewSprintModal.test.tsx`
- Create: `src/components/sprints/modals/EditSprintModal.tsx`
- Create: `src/components/sprints/modals/EditSprintModal.test.tsx`
- Create: `src/components/sprints/modals/formStyles.module.css` (or reuse an existing shared form-styles module if one is importable across component folders — check `src/components/projects/modals/formStyles.module.css` first; if CSS Modules class names must stay folder-local in this codebase, duplicate it here rather than reaching across folders)

**Interfaces:**
- Consumes: `Modal`, `Button` (existing `src/components/ui/`), `sprintModalStore` (Task 2), `sprintsStore` (Task 1), `useToastStore` (existing).
- Produces: `<NewSprintModal />`, `<EditSprintModal />` — both consumed directly by `SprintsPage.tsx` (Task 13), reading their own open/close state from `sprintModalStore`.

- [ ] **Step 1: Write the failing tests — `NewSprintModal.test.tsx`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewSprintModal } from './NewSprintModal'
import { useSprintModalStore } from '../../../store/sprintModalStore'
import { useSprintsStore } from '../../../store/sprintsStore'
import { MOCK_SPRINTS } from '../../../data/mockSprints'

describe('NewSprintModal', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
    useSprintModalStore.setState({ isNewOpen: false })
  })

  it('is not rendered as open when isNewOpen is false', () => {
    render(<NewSprintModal />)
    expect(screen.queryByText('New Sprint')).not.toBeInTheDocument()
  })

  it('rejects submission with a blank name', async () => {
    const user = userEvent.setup()
    useSprintModalStore.setState({ isNewOpen: true })
    render(<NewSprintModal />)
    await user.click(screen.getByText('Create Sprint'))
    expect(useSprintsStore.getState().sprints).toHaveLength(5) // unchanged
  })

  it('creates a sprint and closes on valid submission', async () => {
    const user = userEvent.setup()
    useSprintModalStore.setState({ isNewOpen: true })
    render(<NewSprintModal />)
    await user.type(screen.getByLabelText('Sprint Name *'), 'Growth Experiments')
    await user.type(screen.getByLabelText('Story Point Capacity'), '35')
    await user.click(screen.getByText('Create Sprint'))
    expect(useSprintsStore.getState().sprints[0].name).toBe('Growth Experiments')
    expect(useSprintModalStore.getState().isNewOpen).toBe(false)
  })

  it('form resets after close (key-based reset, not stale on reopen)', async () => {
    const user = userEvent.setup()
    useSprintModalStore.setState({ isNewOpen: true })
    const { rerender } = render(<NewSprintModal />)
    await user.type(screen.getByLabelText('Sprint Name *'), 'Draft text')
    useSprintModalStore.setState({ isNewOpen: false })
    rerender(<NewSprintModal />)
    useSprintModalStore.setState({ isNewOpen: true })
    rerender(<NewSprintModal />)
    expect(screen.getByLabelText('Sprint Name *')).toHaveValue('')
  })
})
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/modals/NewSprintModal.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement `NewSprintModal.tsx`**

Field defaults and validation from `index.html:8456-8483`; project options from `:6131-6136`.

```typescript
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Zap } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useSprintModalStore } from '../../../store/sprintModalStore'
import { useSprintsStore } from '../../../store/sprintsStore'
import { useToastStore } from '../../../store/toastStore'
import formStyles from './formStyles.module.css'

const PROJECTS = ['Web 3 App for Fxtrade', 'Healthydog Landing Page', 'Redesign of Website', 'ChronoLoop Launch']

interface FormState {
  name: string
  goal: string
  startRaw: string
  endRaw: string
  pts: string
  project: string
}

const EMPTY_FORM: FormState = { name: '', goal: '', startRaw: '', endRaw: '', pts: '', project: PROJECTS[0] }

export function NewSprintModal() {
  const isOpen = useSprintModalStore((s) => s.isNewOpen)
  const closeModal = useSprintModalStore((s) => s.closeNew)

  const [session, setSession] = useState(0)
  const handleClose = () => {
    setSession((s) => s + 1)
    closeModal()
  }

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="New Sprint"
      subtitle="Plan and launch a new development sprint"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="form-newsprint">
            <Zap aria-hidden="true" /> Create Sprint
          </Button>
        </>
      }
    >
      <NewSprintFormFields key={session} onDone={handleClose} />
    </Modal>
  )
}

function NewSprintFormFields({ onDone }: { onDone: () => void }) {
  const addSprint = useSprintsStore((s) => s.addSprint)
  const showToast = useToastStore((s) => s.showToast)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      showToast('Sprint name is required', 'error', 2000)
      return
    }
    // form.pts falls back to 40 when blank/non-numeric, matching
    // index.html:8462's `parseInt(...) || 40`.
    const pts = parseInt(form.pts, 10) || 40
    addSprint({ name, goal: form.goal.trim(), startRaw: form.startRaw, endRaw: form.endRaw, storyPoints: pts, project: form.project })
    showToast(`Sprint "${name}" created!`, 'success', 3000)
    onDone()
  }

  return (
    <form id="form-newsprint" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className={formStyles.formGroup}>
        <label className={formStyles.formLabel} htmlFor="sprint-name-input">Sprint Name *</label>
        <input id="sprint-name-input" className={formStyles.formInput} type="text" placeholder="e.g. Authentication & Onboarding" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className={formStyles.formGroup}>
        <label className={formStyles.formLabel} htmlFor="sprint-goal-input">Sprint Goal</label>
        <textarea id="sprint-goal-input" className={formStyles.formTextarea} placeholder="Describe the main objective for this sprint..." style={{ minHeight: 60 }} value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} />
      </div>
      <div className={formStyles.formRow}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="sprint-start-input">Start Date</label>
          <input id="sprint-start-input" className={formStyles.formInput} type="date" value={form.startRaw} onChange={(e) => setForm((f) => ({ ...f, startRaw: e.target.value }))} />
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="sprint-end-input">End Date</label>
          <input id="sprint-end-input" className={formStyles.formInput} type="date" value={form.endRaw} onChange={(e) => setForm((f) => ({ ...f, endRaw: e.target.value }))} />
        </div>
      </div>
      <div className={formStyles.formRow}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="sprint-pts-input">Story Point Capacity</label>
          <input id="sprint-pts-input" className={formStyles.formInput} type="number" placeholder="e.g. 40" min={1} max={200} value={form.pts} onChange={(e) => setForm((f) => ({ ...f, pts: e.target.value }))} />
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="sprint-project-sel">Project</label>
          <select id="sprint-project-sel" className={formStyles.formSelect} value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}>
            {PROJECTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm vitest run src/components/sprints/modals/NewSprintModal.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing tests — `EditSprintModal.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditSprintModal } from './EditSprintModal'
import { useSprintModalStore } from '../../../store/sprintModalStore'
import { useSprintsStore } from '../../../store/sprintsStore'
import { MOCK_SPRINTS } from '../../../data/mockSprints'

describe('EditSprintModal', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
    useSprintModalStore.setState({ editingSprintId: null })
  })

  it('is not rendered as open when editingSprintId is null', () => {
    render(<EditSprintModal />)
    expect(screen.queryByText('Edit Sprint')).not.toBeInTheDocument()
  })

  it('pre-fills the form from the sprint being edited', () => {
    useSprintModalStore.setState({ editingSprintId: 's4' })
    render(<EditSprintModal />)
    expect(screen.getByLabelText('Sprint Name *')).toHaveValue('Testing & Hardening')
    expect(screen.getByLabelText('Story Point Capacity')).toHaveValue(38)
    expect(screen.getByLabelText('Status')).toHaveValue('planning')
  })

  it('saves the edited fields and closes', async () => {
    const user = userEvent.setup()
    useSprintModalStore.setState({ editingSprintId: 's4' })
    render(<EditSprintModal />)
    await user.clear(screen.getByLabelText('Sprint Name *'))
    await user.type(screen.getByLabelText('Sprint Name *'), 'Hardening Sprint')
    await user.click(screen.getByText('Save Changes'))
    expect(useSprintsStore.getState().sprints.find((s) => s.id === 's4')?.name).toBe('Hardening Sprint')
    expect(useSprintModalStore.getState().editingSprintId).toBeNull()
  })

  it('rejects a save with a blank name', async () => {
    const user = userEvent.setup()
    useSprintModalStore.setState({ editingSprintId: 's4' })
    render(<EditSprintModal />)
    await user.clear(screen.getByLabelText('Sprint Name *'))
    await user.click(screen.getByText('Save Changes'))
    expect(useSprintsStore.getState().sprints.find((s) => s.id === 's4')?.name).toBe('Testing & Hardening')
  })

  it('setting status to completed forces progress to 100', async () => {
    const user = userEvent.setup()
    useSprintModalStore.setState({ editingSprintId: 's4' })
    render(<EditSprintModal />)
    await user.selectOptions(screen.getByLabelText('Status'), 'completed')
    await user.click(screen.getByText('Save Changes'))
    expect(useSprintsStore.getState().sprints.find((s) => s.id === 's4')?.progress).toBe(100)
  })
})
```

- [ ] **Step 6: Run, verify it fails**

Run: `pnpm vitest run src/components/sprints/modals/EditSprintModal.test.tsx`
Expected: FAIL — cannot find module

- [ ] **Step 7: Implement `EditSprintModal.tsx`**

Pre-fill logic from `index.html:8414-8427`, save logic from `:8429-8453`. Unlike `NewSprintModal`, this modal's form must re-derive its initial values from the currently-editing sprint — use the same `key`-based reset trick, but keyed on `editingSprintId` itself (remount + re-derive whenever a *different* sprint is opened for editing, not just on close), which is the natural generalization of the session-counter pattern for a form that needs real pre-fill data rather than always resetting to empty.

```typescript
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useSprintModalStore } from '../../../store/sprintModalStore'
import { useSprintsStore } from '../../../store/sprintsStore'
import { useToastStore } from '../../../store/toastStore'
import type { Sprint, SprintStatus } from '../../../types/sprint'
import formStyles from './formStyles.module.css'

const PROJECTS = ['Web 3 App for Fxtrade', 'Healthydog Landing Page', 'Redesign of Website', 'ChronoLoop Launch']
const STATUSES: { value: SprintStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
]

export function EditSprintModal() {
  const editingSprintId = useSprintModalStore((s) => s.editingSprintId)
  const closeModal = useSprintModalStore((s) => s.closeEdit)
  const sprints = useSprintsStore((s) => s.sprints)
  const sprint = sprints.find((s) => s.id === editingSprintId) ?? null

  return (
    <Modal
      open={sprint !== null}
      onOpenChange={(open) => !open && closeModal()}
      title="Edit Sprint"
      subtitle="Update sprint details and settings"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
          <Button type="submit" form="form-editsprint">
            <Check aria-hidden="true" /> Save Changes
          </Button>
        </>
      }
    >
      {sprint && <EditSprintFormFields key={sprint.id} sprint={sprint} onDone={closeModal} />}
    </Modal>
  )
}

interface FormState {
  name: string
  goal: string
  pts: string
  status: SprintStatus
  project: string
  startRaw: string
  endRaw: string
}

function EditSprintFormFields({ sprint, onDone }: { sprint: Sprint; onDone: () => void }) {
  const updateSprint = useSprintsStore((s) => s.updateSprint)
  const showToast = useToastStore((s) => s.showToast)
  const [form, setForm] = useState<FormState>({
    name: sprint.name, goal: sprint.goal, pts: String(sprint.storyPoints), status: sprint.status,
    project: sprint.project, startRaw: sprint.startRaw ?? '', endRaw: sprint.endRaw ?? '',
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      showToast('Sprint name is required', 'error', 2000)
      return
    }
    const pts = parseInt(form.pts, 10) || sprint.storyPoints
    const goal = form.goal.trim() || sprint.goal
    updateSprint(sprint.id, { name, goal, storyPoints: pts, status: form.status, project: form.project, startRaw: form.startRaw, endRaw: form.endRaw })
    showToast(`Sprint "${name}" updated!`, 'success', 3000)
    onDone()
  }

  return (
    <form id="form-editsprint" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className={formStyles.formGroup}>
        <label className={formStyles.formLabel} htmlFor="edit-sprint-name-input">Sprint Name *</label>
        <input id="edit-sprint-name-input" className={formStyles.formInput} type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className={formStyles.formGroup}>
        <label className={formStyles.formLabel} htmlFor="edit-sprint-goal-input">Sprint Goal</label>
        <textarea id="edit-sprint-goal-input" className={formStyles.formTextarea} style={{ minHeight: 60 }} value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} />
      </div>
      <div className={formStyles.formRow}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="edit-sprint-start-input">Start Date</label>
          <input id="edit-sprint-start-input" className={formStyles.formInput} type="date" value={form.startRaw} onChange={(e) => setForm((f) => ({ ...f, startRaw: e.target.value }))} />
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="edit-sprint-end-input">End Date</label>
          <input id="edit-sprint-end-input" className={formStyles.formInput} type="date" value={form.endRaw} onChange={(e) => setForm((f) => ({ ...f, endRaw: e.target.value }))} />
        </div>
      </div>
      <div className={formStyles.formRow}>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="edit-sprint-pts-input">Story Point Capacity</label>
          <input id="edit-sprint-pts-input" className={formStyles.formInput} type="number" min={1} max={200} value={form.pts} onChange={(e) => setForm((f) => ({ ...f, pts: e.target.value }))} />
        </div>
        <div className={formStyles.formGroup}>
          <label className={formStyles.formLabel} htmlFor="edit-sprint-status-sel">Status</label>
          <select id="edit-sprint-status-sel" className={formStyles.formSelect} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SprintStatus }))}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className={formStyles.formGroup}>
        <label className={formStyles.formLabel} htmlFor="edit-sprint-project-sel">Project</label>
        <select id="edit-sprint-project-sel" className={formStyles.formSelect} value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}>
          {PROJECTS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
    </form>
  )
}
```

- [ ] **Step 8: Run tests, verify they pass**

Run: `pnpm vitest run src/components/sprints/modals/EditSprintModal.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 9: Verify worktree, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test`

```bash
git add src/components/sprints/modals/
git commit -m "feat: add NewSprintModal and EditSprintModal"
```

---

### Task 13: SprintsPage assembly

**Files:**
- Modify: `src/pages/SprintsPage.tsx`
- Create: `src/pages/SprintsPage.test.tsx`
- Create: `src/pages/SprintsPage.module.css`

**Interfaces:**
- Consumes: every component/store from Tasks 1–12.
- Produces: the assembled `<SprintsPage />` routed at `/sprints` (already wired in `App.tsx`).

This task is where the Global Constraints' "shared remount key across the banner and results subtree" and "chip filter AND dropdown filter, both against the full unfiltered list" requirements get wired together — re-read those two paragraphs before starting.

- [ ] **Step 1: Write the failing integration tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintsPage } from './SprintsPage'
import { useSprintsStore } from '../store/sprintsStore'
import { MOCK_SPRINTS } from '../data/mockSprints'

describe('SprintsPage', () => {
  beforeEach(() => {
    useSprintsStore.setState({ sprints: MOCK_SPRINTS })
  })

  it('renders the header, KPI grid, active sprint banner, stat chips, and list view by default', () => {
    render(<SprintsPage />)
    expect(screen.getByText('Sprints')).toBeInTheDocument()
    expect(screen.getByText('Total Sprints')).toBeInTheDocument()
    expect(screen.getByText('SPRINT 03 — UX Polish & Integrations')).toBeInTheDocument()
    expect(screen.getByText('Foundation & Architecture')).toBeInTheDocument()
  })

  it('switches to Board view and back without losing KPI/banner content', async () => {
    const user = userEvent.setup()
    render(<SprintsPage />)
    await user.click(screen.getByText('Board'))
    expect(screen.getByText('Active')).toBeInTheDocument() // board column title
    expect(screen.getByText('Total Sprints')).toBeInTheDocument() // KPI grid persists
  })

  it('chip filter and search compose (AND), both scoped to the visible list only', async () => {
    const user = userEvent.setup()
    render(<SprintsPage />)
    await user.click(screen.getByText('Completed'))
    expect(screen.getByText('Foundation & Architecture')).toBeInTheDocument()
    expect(screen.queryByText('Post-Launch Iteration')).not.toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Search sprints...'), 'core')
    expect(screen.queryByText('Foundation & Architecture')).not.toBeInTheDocument()
    expect(screen.getByText('Core Dashboard Development')).toBeInTheDocument()
  })

  it('opening the detail panel and clicking Delete removes the sprint from the list', async () => {
    const user = userEvent.setup()
    render(<SprintsPage />)
    await user.click(screen.getByText('Post-Launch Iteration'))
    await user.click(screen.getByTitle('Delete sprint'))
    expect(useSprintsStore.getState().sprints.find((s) => s.name === 'Post-Launch Iteration')).toBeUndefined()
    expect(screen.queryByText('Post-Launch Iteration')).not.toBeInTheDocument()
  })

  it('New Sprint button opens NewSprintModal, and creating one shows it in the list', async () => {
    const user = userEvent.setup()
    render(<SprintsPage />)
    await user.click(screen.getByText('New Sprint'))
    await user.type(screen.getByLabelText('Sprint Name *'), 'Launch Prep')
    await user.click(screen.getByText('Create Sprint'))
    expect(screen.getByText('Launch Prep')).toBeInTheDocument()
  })

  it('editing a sprint from its context menu opens EditSprintModal pre-filled', async () => {
    const user = userEvent.setup()
    render(<SprintsPage />)
    const row = screen.getByText('Foundation & Architecture').closest('[role="button"]') as HTMLElement
    await user.click(within(row).getByLabelText('More options'))
    await user.click(await screen.findByText('Edit Sprint'))
    expect(screen.getByLabelText('Sprint Name *')).toHaveValue('Foundation & Architecture')
  })
})
```

(Add `within` to the `@testing-library/react` import.)

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run src/pages/SprintsPage.test.tsx`
Expected: FAIL — current stub only renders `<h1>Sprints</h1>`

- [ ] **Step 3: Implement `SprintsPage.tsx`**

```typescript
import { useState } from 'react'
import { SprintsPageHeader } from '../components/sprints/SprintsPageHeader'
import { SprintKpiGrid } from '../components/sprints/SprintKpiGrid'
import { ActiveSprintBanner } from '../components/sprints/ActiveSprintBanner'
import { SprintStatsRow } from '../components/sprints/SprintStatsRow'
import { SprintsToolbar } from '../components/sprints/SprintsToolbar'
import { SprintsListView } from '../components/sprints/SprintsListView'
import { SprintsBoardView } from '../components/sprints/SprintsBoardView'
import { SprintDetailPanel } from '../components/sprints/SprintDetailPanel'
import { NewSprintModal } from '../components/sprints/modals/NewSprintModal'
import { EditSprintModal } from '../components/sprints/modals/EditSprintModal'
import { useSprintsStore } from '../store/sprintsStore'
import { useSprintDetailStore } from '../store/sprintDetailStore'
import { useSprintModalStore } from '../store/sprintModalStore'
import { useToastStore } from '../store/toastStore'
import { sprintSortComparator } from '../lib/sprintFormatters'
import styles from './SprintsPage.module.css'

export function SprintsPage() {
  const sprints = useSprintsStore((s) => s.sprints)
  const removeSprint = useSprintsStore((s) => s.removeSprint)
  const markComplete = useSprintsStore((s) => s.markComplete)
  const openDetail = useSprintDetailStore((s) => s.open)
  const openNewSprint = useSprintModalStore((s) => s.openNew)
  const openEditSprint = useSprintModalStore((s) => s.openEdit)
  const showToast = useToastStore((s) => s.showToast)

  const [view, setView] = useState<'list' | 'board'>('list')
  const [activeFilter, setActiveFilter] = useState('all')
  const [dropdownFilters, setDropdownFilters] = useState<string[] | null>(null)
  const [activeSort, setActiveSort] = useState('number')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSprints = sprints
    .filter((s) => activeFilter === 'all' || s.status === activeFilter)
    .filter((s) => (dropdownFilters ? dropdownFilters.includes(s.status) : true))
    .filter((s) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return s.name.toLowerCase().includes(q) || s.goal.toLowerCase().includes(q) || s.project.toLowerCase().includes(q)
    })
    .sort(sprintSortComparator(activeSort))

  const handleDelete = (id: string, name: string) => {
    removeSprint(id)
    showToast(`"${name}" deleted`, 'success', 3000)
  }

  const handleMarkComplete = (id: string) => {
    markComplete(id)
    showToast('Sprint marked complete', 'success')
  }

  // Shared remount key across the banner and the results subtree, matching
  // renderSprintsPage() (index.html:7973-7999) rebuilding both on every
  // view/filter/dropdown-filter/sort/search change — see Global Constraints.
  const queryKey = `${view}|${activeFilter}|${dropdownFilters?.join(',') ?? 'none'}|${activeSort}|${searchQuery}`

  return (
    <div className={styles.page}>
      <SprintsPageHeader
        view={view}
        onViewChange={setView}
        onApplyStatusFilters={setDropdownFilters}
        onNewSprint={openNewSprint}
      />
      <SprintKpiGrid />
      <div key={queryKey}>
        <ActiveSprintBanner />
      </div>
      <SprintStatsRow activeFilter={activeFilter} onFilterChange={setActiveFilter}>
        <SprintsToolbar activeSort={activeSort} onSortChange={setActiveSort} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      </SprintStatsRow>
      <div key={queryKey}>
        {view === 'list' ? (
          <SprintsListView
            sprints={filteredSprints}
            onOpenDetail={openDetail}
            onEdit={openEditSprint}
            onMarkComplete={handleMarkComplete}
            onDelete={handleDelete}
            onNewSprint={openNewSprint}
          />
        ) : (
          <SprintsBoardView sprints={filteredSprints} onOpenDetail={openDetail} />
        )}
      </div>
      <NewSprintModal />
      <EditSprintModal />
      <SprintDetailPanel onEdit={openEditSprint} onDelete={handleDelete} />
    </div>
  )
}
```

`SprintsPage.module.css`: port `#page-sprints`'s layout (`display:flex; flex-direction:column; gap:14px`, matching every other page's `.page` wrapper — check `ProjectsPage.module.css` for the exact established values and mirror them).

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm vitest run src/pages/SprintsPage.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Verify worktree, run full suite, lint, commit**

Run: `git rev-parse --show-toplevel && git branch --show-current` — confirm worktree path/branch; STOP and report NEEDS_CONTEXT if not.
Run: `pnpm lint && pnpm test` — full suite

```bash
git add src/pages/SprintsPage.tsx src/pages/SprintsPage.test.tsx src/pages/SprintsPage.module.css
git commit -m "feat: assemble Sprints page"
```

---

## Final Whole-Branch Review Checklist

Before merging, per the Phase 3.2/3.3/3.4 lesson that cross-task composition bugs only surface once everything is assembled:

- [ ] Confirm `ActiveSprintBanner` and the results subtree genuinely share one remount key in `SprintsPage.tsx` (not two independently-computed strings that could drift).
- [ ] Confirm the Filter dropdown's Status group actually narrows the visible list end-to-end (not just updates local checkbox state) — this is the one filter group across Tasks/Projects/Sprints that must be real, unlike its Projects-page sibling.
- [ ] Confirm no avatar `src` prop was accidentally added anywhere on this page during assembly (easy to copy-paste from `ProjectCard`/`ProjectListRow` without noticing the `src={PROJECT_AVATAR_SRC[...]}` line).
- [ ] Confirm `SprintKpiGrid`'s use of the modified `StatCard` doesn't regress `KpiGrid.test.tsx` (Dashboard) — run that file explicitly, not just the full suite pass/fail count.
- [ ] Do a manual `pnpm dev` walkthrough (still outstanding from Phase 3.1 onward per the backlog) covering: List↔Board toggle, chip filter, dropdown Status filter (Apply/Clear), sort, search, opening/editing/deleting a sprint from both the list row menu and the detail panel, marking a sprint complete, and creating a new sprint — confirm the ring and burndown visibly replay on each filter/search/sort interaction as designed, not just once on mount.
