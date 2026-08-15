# ChronoLoop Frontend Rewrite — Design

## 1. Problem

The current ChronoLoop dashboard is a single `index.html` (10,991 lines, all CSS and JS inline, ~112 functions hanging off the global script scope, no build step, no component structure). It works and its visual design is approved, but it's unmaintainable at this size and the product now has real users, so it needs a production-grade frontend architecture.

This is a **re-architecture, not a redesign**: same look, same behavior, same features, rebuilt on a real, scalable stack.

## 2. Ground truth

`design.md` and `tasks.md` in this repo only document the original single-page Dashboard build (the app's very first version). Since then `index.html` grew to 9 pages, ~10 modals, and 6 mock data collections (`tasksData`, `PROJECTS`, `SPRINTS`, `TEAM_MEMBERS`, `INT_APPS`, `CAL_MEETINGS`). **`index.html` itself is the only current, complete spec** — design.md/tasks.md are historical and only reliable for the CSS token values (colors, spacing, radii), which haven't drifted.

Confirmed inventory from `index.html`:
- Pages (sidebar nav + render functions): Dashboard, Tasks (`renderTasksPage`), Projects (`renderProjectsPage`), Sprints (`renderSprintsPage`), Team (`renderTeamPage`), Reports (`renderReportsPage`), Calendar (`renderCalendarPage`), Integrations (`renderIntegrationsPage`), Settings (`renderSettingsPage`)
- Modals: Add/Edit Task, Task Detail, Share, Calendar Event, Activity, Invite, Member Detail, New Project/Project Detail, New Sprint/Sprint Detail/Edit Sprint, Integration Connect/Manage
- Cross-cutting systems: dropdown positioning with viewport collision detection (`openDD`/`closeAllDD`), modal system (`openModal`/`closeModal`), toast system (`showToast`), theme (`setTheme`), count-up KPI animation (`countUp`), calendar rendering in month/week/day/agenda views

## 3. Non-negotiables (from product owner)

- Pixel/behavior parity with `index.html` — every color, spacing value, radius, animation timing from the CSS custom-property system is preserved exactly.
- Every page/modal/dropdown/toast/interaction gets an equivalent home in the new codebase — nothing silently dropped.
- Ambiguous or broken behavior in the current build gets flagged, not silently "fixed."
- No backend/database yet — mock data only, structured so a later API swap is contained to a `services/` layer.

## 4. Stack (specified by product owner, not re-litigated here)

Vite + React 18 + TypeScript (strict) · React Router · Zustand · CSS Modules over the existing `:root` token system (no Tailwind, no token rewrite) · Radix UI primitives (Dialog, DropdownMenu, Popover) under existing styling · lucide-react · date-fns · Vitest + React Testing Library for the test harness.

## 4a. Code quality standards (non-negotiable, carried forward from the original brief)

- **TypeScript strict mode**, no `any` — if an `any` is truly unavoidable, it must carry a comment explaining why.
- **Accessibility by default**: semantic HTML, ARIA attributes on custom components (dropdowns, modals, tabs), full keyboard navigation (tab order, Escape to close, Enter/Space to activate), visible focus states that match the current `:focus-visible` styling (`outline: 2px solid var(--accent-blue); outline-offset: 2px`).
- **Test harness from day one**: Vitest + React Testing Library scaffolded in Phase 1, not bolted on later. Coverage doesn't need to be heavy yet, but the tooling and a first passing test must exist before Phase 1 is considered done.
- **Error resilience**: a top-level React error boundary wraps `AppShell` so an unhandled render error surfaces a fallback UI instead of a blank white screen.

## 5. Folder structure

New sibling project at `c:\Users\HP\Downloads\CHRONOLOOP-frontend\`, own git init, pnpm. `Chronoloop dashboard/` (old `index.html`) stays untouched throughout as the running visual reference and current production fallback.

```
CHRONOLOOP-frontend/
  src/
    main.tsx, App.tsx
    styles/tokens.css, global.css
    components/layout/ (AppShell, Sidebar, TopBar)
    components/ui/ (Button, Modal, Dropdown, Toast/ToastProvider, Card, Chip/Badge, Avatar)
    components/{tasks,projects,sprints,team,reports,calendar,integrations,settings}/
    pages/*Page.tsx (one per nav item)
    store/ (themeStore, uiStore, tasksStore, projectsStore, sprintsStore, teamStore, calendarStore)
    data/ (mock*.ts per domain)
    services/ (thin functions over mock data now, real API later)
    types/ (task, project, sprint, teamMember, calendarEvent, integration)
    hooks/ (useOutsideClick, useEscapeKey, ...)
    lib/ (dateUtils, formatters)
```
One clear owner per concern; no file becomes a dumping ground the way the current script block is.

## 6. Delivery sequence

Work proceeds in checkpointed phases; each gets its own `writing-plans` implementation plan when we reach it, not planned in bulk now (avoids a plan that goes stale before we're 3 pages in):

1. **Scaffold** — Vite/React/TS project, ESLint+Prettier, Vitest+React Testing Library harness with one passing smoke test, `tokens.css` ported verbatim from the current `:root`/`[data-theme="light"]` block, base AppShell (Sidebar + TopBar) wrapped in a top-level error boundary, with routing to all 9 nav items (empty page stubs OK). Checkpoint: dev server up, layout looks right, `npm test` passes.
2. **Design-system primitives** — Button, Modal, Dropdown, Toast, Card, Chip, Avatar, built once against Radix, styled to match exactly. Everything after this point consumes these instead of raw markup.
3. **Pages, one at a time**, in order: Dashboard → Tasks → Projects → Sprints → Calendar → Team → Reports → Integrations → Settings. Each page's plan starts by re-reading that page's section of `index.html` (render function + its modals + its slice of mock data) so the plan reflects actual current behavior, not an assumption. Checkpoint after each: dev server running, page reviewable.
4. **Cross-cutting verification** — theme persistence, toasts, Escape/outside-click handling, search, confirmed working across all ported pages together (not just per-page).
5. **Final coverage pass** — walk the ~112-function list from `index.html` against the new codebase, report anything skipped or not cleanly portable and why.

## 7. Open flags for the product owner (raise, don't silently resolve)

- Current app is desktop-only (fixed 240px sidebar, `overflow: hidden` body). The rewrite will not make this worse, but a real responsive pass is out of scope unless requested — will flag again at the AppShell checkpoint.
- Any place index.html's behavior looks inconsistent or accidental (not an intentional design choice) gets called out inline in that page's phase rather than quietly normalized.

## 8. Testing / verification per phase

Vitest + React Testing Library harness exists from Phase 1 onward (see §4a). Coverage grows incrementally per phase — not exhaustive yet, but every phase that adds interactive logic (dropdown positioning, modal open/close, form validation) adds at least one test for it. Each phase's checkpoint is still a running dev server the product owner reviews visually against the old `index.html` side by side. `tsc --noEmit` + `eslint` + `vitest run` all pass before considering any phase done.
