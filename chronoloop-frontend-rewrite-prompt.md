# Prompt for Claude Code: Rewrite ChronoLoop Frontend

Copy everything below into Claude Code (in the repo root, with `index.html`, `design.md`, and `tasks.md` present) as your starting instruction.

---

## Context

I have an existing product called **ChronoLoop** — a project/task management dashboard (like Notion + Linear). The current implementation is a single 11,000-line `index.html` file with all CSS and JS inline, no framework, no build step, and no component structure. It works and the *design* is good, but the code is unmaintainable at this size and needs to be production-grade because real users will use this product.

Your job is **not** to redesign it. Your job is to **re-architect it** — same look, same behavior, same features, but built on a real, scalable frontend stack with proper structure. Treat `index.html` as the visual and functional spec, not as legacy code to reuse verbatim.

Read `design.md` and `tasks.md` first — they document the intended design system and were already written with a React rewrite in mind. Then read all of `index.html` (styles and the `<script>` block) end to end before writing any code, so you understand every page, modal, and interaction before touching a single file.

---

## Non-negotiable constraint: visual and functional parity

- Every color, font, spacing value, border-radius, and animation timing in `design.md` / the current `:root` CSS variables must be preserved exactly.
- Every page, modal, dropdown, toast, and interaction currently in `index.html` must exist in the new build with equivalent behavior. Do not silently drop features because they're inconvenient to port.
- If you find something ambiguous, broken, or inconsistent in the current implementation, stop and ask me rather than guessing or quietly "fixing" it in a way that changes behavior.
- If you think a UX or architectural improvement is warranted (e.g. a page's interaction is genuinely bad), flag it as a suggestion — don't just make the change unilaterally.

---

## Tech stack

- **Vite + React 18 + TypeScript** (strict mode)
- **React Router** for page navigation (`/dashboard`, `/tasks`, `/projects`, `/sprints`, `/team`, `/reports`, `/calendar`, `/integrations`, `/settings`) — replace the current manual `.style.display` page-switching entirely
- **Zustand** for global client state (theme, active modals/toasts, filters, in-memory task/project/sprint data)
- **CSS Modules or vanilla CSS with the existing custom-property token system** — do NOT introduce Tailwind or rewrite the design tokens into another syntax. Carry `:root` / `[data-theme="light"]` variables over verbatim into a single `tokens.css`, imported globally.
- **Radix UI primitives** (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`, etc.) underneath our own styling, to replace the hand-rolled dropdown positioning (`openDD`/`closeAllDD`), modal system, and outside-click handling — for accessibility (focus trap, keyboard nav, ARIA) that the current version doesn't have
- **lucide-react** for icons (direct React equivalent of the current `lucide` UMD usage)
- **date-fns** for all calendar/date logic
- No backend or database work yet — all data (tasks, projects, sprints, team members, calendar events, integrations) stays as in-memory mock data matching the current shapes in `index.html` (`tasksData`, `PROJECTS`, `SPRINTS`, `TEAM_MEMBERS`, `CAL_MEETINGS`, `INT_APPS`, etc.). Structure the data layer so swapping mock data for real API calls later is a small, contained change (e.g. a `services/` or `api/` folder with functions we can later point at a real backend).

---

## Feature inventory to preserve (confirm each exists before considering the migration done)

**Pages (from sidebar nav):**
Dashboard, Tasks, Projects, Sprints, Team, Reports, Calendar, Integrations, Settings

**Modals:**
Add Task, Share, Calendar Event, Activity, Invite (teammate), Member detail, New Project, New Sprint, Edit Sprint

**Systems:**
- Theme toggle (dark/light), persisted across the session
- Dropdown/menu system (sort, filter, context menus, three-dot menus) — currently hand-positioned with viewport-edge collision detection; Radix Popover/DropdownMenu should replicate this positioning behavior
- Toast notification system (success/error/info variants, auto-dismiss)
- Escape-key handling to close any open modal/dropdown/context-menu
- Search input (top bar)
- Kanban-style status columns (todo/in-progress/overdue/done) on the Tasks and Sprints pages
- Calendar month view with events/meetings rendered per day
- Sortable/filterable lists on Tasks, Projects, Sprints, Team, Reports pages

Go through `index.html` function by function (there are ~97 functions in the script block) and make sure nothing gets lost — build a checklist first if it helps you track coverage.

---

## Architecture

```
src/
  main.tsx
  App.tsx                 # Router setup, AppShell wrapper
  styles/
    tokens.css             # existing CSS variables, dark + light theme, unchanged
    global.css              # resets, base typography
  components/
    layout/
      AppShell.tsx
      Sidebar.tsx
      TopBar.tsx
    ui/                      # design-system primitives, reused everywhere
      Button.tsx
      Modal.tsx
      Dropdown.tsx
      Toast.tsx / ToastProvider.tsx
      Card.tsx
      Chip.tsx / Badge.tsx
      Avatar.tsx
    tasks/
    projects/
    sprints/
    team/
    reports/
    calendar/
    integrations/
    settings/
  pages/
    DashboardPage.tsx
    TasksPage.tsx
    ProjectsPage.tsx
    SprintsPage.tsx
    TeamPage.tsx
    ReportsPage.tsx
    CalendarPage.tsx
    IntegrationsPage.tsx
    SettingsPage.tsx
  store/
    themeStore.ts
    uiStore.ts               # modals, toasts, dropdowns
    tasksStore.ts
    projectsStore.ts
    sprintsStore.ts
    teamStore.ts
    calendarStore.ts
  data/
    mockTasks.ts, mockProjects.ts, mockSprints.ts, mockTeam.ts, mockCalendar.ts, mockIntegrations.ts
  services/                  # thin functions wrapping the mock data now; swap for real API later
    taskService.ts, projectService.ts, ...
  types/
    task.ts, project.ts, sprint.ts, teamMember.ts, calendarEvent.ts, integration.ts
  hooks/
    useOutsideClick.ts, useEscapeKey.ts, ...
  lib/
    dateUtils.ts, formatters.ts
```

Adjust this structure if you find a better organization once you've read the full codebase, but keep the principle: **one clear owner per concern**, no giant files, no global functions hanging off `window`.

---

## Code quality requirements (this is a real product)

- **TypeScript strict mode**, no `any` unless truly unavoidable (and commented why)
- Proper typed data models for Task, Project, Sprint, TeamMember, CalendarEvent, Integration — infer these from the shapes already used in `tasksData`, `PROJECTS`, etc. in `index.html`
- Accessible by default: semantic HTML, proper ARIA on custom components, full keyboard navigation (tab order, Escape to close, Enter/Space to activate), visible focus states (the current `:focus-visible` styling should carry over)
- Responsive: the current version appears desktop-only (fixed 240px sidebar, `overflow:hidden` body) — at minimum don't make responsiveness worse; flag if you think a basic responsive pass is worth doing now vs. later
- No inline styles except where truly one-off and dynamic (e.g. computed avatar gradient) — everything else goes through the CSS token system or component styles
- Consistent naming conventions and file organization — no mixed patterns
- Componentize anything that repeats (task cards, status pills, avatar chips, kanban columns, etc.) rather than duplicating markup
- Write a short `README.md` explaining the folder structure, how to run the dev server, and how to add a new page/component, so this is easy to hand off or return to later

---

## Process — work in phases, don't big-bang this

1. **Scaffold**: Vite + React + TS project, ESLint + Prettier config, `tokens.css` ported verbatim, base layout shell (Sidebar + TopBar) with routing wired up and all nav items present (even if pages are empty stubs). Confirm this looks/feels right before moving on.
2. **Design-system primitives**: Button, Modal, Dropdown, Toast, Card, Chip, Avatar — built once, styled to match exactly, used everywhere after this point.
3. **Port pages one at a time**, starting with Dashboard, in this order: Dashboard → Tasks → Projects → Sprints → Calendar → Team → Reports → Integrations → Settings. After each page, give me a way to view it (dev server running) before moving to the next.
4. **Cross-cutting systems**: theme persistence, toasts, escape-key/outside-click handling, search — verify these work globally across all ported pages.
5. **Final pass**: go back through the original `index.html` function list and confirm every interaction has a home in the new codebase. Report anything you skipped or couldn't cleanly port, and why.

At the end of each phase, summarize what you did, what you're not sure about, and what you'd like me to check visually before continuing.

---

## Where to build this

Do **not** modify or delete anything in the existing `CHRONOLOOP` folder. Scaffold the new project in a fresh sibling folder, e.g. `CHRONOLOOP-frontend/`, with its own git init. The old `index.html` stays untouched the whole time as the visual reference we compare against — and as a safe fallback since it's what's currently deployed. We'll only fold the new build into `CHRONOLOOP` (or repoint the deploy) once it has full parity and I've reviewed it.

## Questions to ask me before you start (if not already obvious from the repo)

- Any package manager preference (npm/pnpm/yarn)?
- Any preference on the new folder/repo name if not `CHRONOLOOP-frontend`?

Ask these before scaffolding, then proceed autonomously through the phases above, checking in after each one.
