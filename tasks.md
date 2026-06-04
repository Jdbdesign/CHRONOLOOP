# ChronoLoop Dashboard — Build Tasks

## Overview

This document breaks down the full implementation of the ChronoLoop dashboard into structured, sequenced tasks. Each task maps directly to a component or concern from `design.md`. Tasks are ordered for dependency-safe execution.

**Stack:** React (JSX) + CSS Variables + Lucide Icons + DM Sans / Syne / DM Mono (Google Fonts)
**Target file:** Single-file React artifact (`App.jsx`) or modular component build.

---

## Phase 0 — Foundation

### TASK-001: Project Setup & CSS Token System
**Priority:** Critical — must be first
**Effort:** S

- [ ] Import Google Fonts: `Syne` (600, 700), `DM Sans` (400, 500), `DM Mono` (500, 700)
- [ ] Define all CSS custom properties in `:root` (dark theme defaults):
  - Background layers: `--bg-base`, `--bg-sidebar`, `--bg-card`, `--bg-card-hover`, `--bg-input`
  - Border colors: `--border-subtle`, `--border-default`
  - Text: `--text-primary`, `--text-secondary`, `--text-muted`
  - Accent palette: blue, teal, orange, red, green, purple, cyan, yellow
  - Navigation: `--nav-active-bg`, `--nav-active-text`
- [ ] Define light theme overrides under `[data-theme="light"]`
- [ ] Apply base reset: `box-sizing: border-box`, `margin: 0`, `font-family: 'DM Sans'`
- [ ] Set `--bg-base` as `body` background, `--text-primary` as default color

---

### TASK-002: Root Layout Shell
**Priority:** Critical
**Effort:** S
**Depends on:** TASK-001

- [ ] Create `App` component with `data-theme` state (dark/light toggle)
- [ ] Implement outer layout: CSS grid — `240px` sidebar column + `1fr` main column
- [ ] Full viewport height (`100vh`), no overflow on outer container
- [ ] Main area: `overflow-y: auto` for scrollable content
- [ ] Pass `theme` + `setTheme` as props/context to child components

---

## Phase 1 — Sidebar

### TASK-003: Sidebar — Logo + Wordmark
**Priority:** High
**Effort:** S
**Depends on:** TASK-002

- [ ] Create `Sidebar` component with `#111111` background, full height
- [ ] Logo section at top: dot-grid SVG icon + "CHRONOLOOP" text in Syne Bold
- [ ] Dot-grid SVG: 3×3 or 4×4 grid of small circles, blue gradient fill (`#4A90FF`)
- [ ] Wordmark: 18px, `letter-spacing: 0.08em`, `--text-primary`
- [ ] Add bottom border separator beneath logo area

---

### TASK-004: Sidebar — Navigation Items
**Priority:** High
**Effort:** M
**Depends on:** TASK-003

- [ ] Define nav items array with `id`, `label`, `icon` (Lucide), `active` boolean
  ```
  Dashboard (active), Tasks, Projects, Sprints, Team, Reports, Integration, Settings
  ```
- [ ] Render each nav item: `icon` (18px) + label, 44px height, 16px horizontal padding
- [ ] Active state: `--nav-active-bg` background, full-width pill, white text + icon
- [ ] Hover state: `--bg-card` background, transition 150ms
- [ ] Use `useState` for `activeNav` — clicking changes active item
- [ ] Icons: import from `lucide-react` — `LayoutDashboard`, `CheckSquare`, `Briefcase`, `Zap`, `Users`, `BarChart2`, `GitMerge`, `Settings`

---

### TASK-005: Sidebar — Bottom Section (Theme Toggle + Invite)
**Priority:** Medium
**Effort:** S
**Depends on:** TASK-004

- [ ] Push bottom section to end using `margin-top: auto` in sidebar flex column
- [ ] Theme toggle: pill toggle switch — `Sun` icon + "Light" label / `Moon` icon + "Dark" label
  - Left half = Light (clickable), Right half = Dark (clickable with blue active bg)
  - Smooth color transition on toggle: 200ms ease
- [ ] "Invite teammates" button: envelope icon + label, `--border-default` border, full width, rounded
- [ ] Wire toggle to `setTheme` prop from TASK-002

---

## Phase 2 — Top Bar

### TASK-006: TopBar — Search Input
**Priority:** High
**Effort:** S
**Depends on:** TASK-002

- [ ] Create `TopBar` component
- [ ] Search input: full pill shape (`border-radius: 24px`), `--bg-card` bg, `--border-subtle` border
- [ ] `Search` icon (Lucide, `--text-muted`, 16px) left-padded inside input
- [ ] Placeholder text: "Search" in `--text-muted`
- [ ] Focus state: `--accent-blue` border ring, no outline default

---

### TASK-007: TopBar — Right Controls (Avatars, Share, Bell, User)
**Priority:** High
**Effort:** M
**Depends on:** TASK-006

- [ ] Avatar cluster: 3 stacked avatar circles (32px), overlapping by 8px using negative margin
  - Use initials-based avatars with distinct `--accent-*` background colors per user
- [ ] "Share" button: `--accent-blue` bg, `Share2` icon + "Share" label, 8px border-radius, white text
- [ ] Bell icon (`Bell`, 20px) with notification badge: red circle "2" top-right
- [ ] User avatar (36px circle) + chevron-down caret
- [ ] TopBar overall: flex row, `justify-content: space-between`, padding `12px 28px`, `--bg-base` bg, `--border-subtle` bottom border

---

## Phase 3 — Greeting + Action Bar

### TASK-008: Greeting Section
**Priority:** High
**Effort:** S
**Depends on:** TASK-002

- [ ] "Hello [Name]," in 14px `--text-secondary`, medium weight
- [ ] "Welcome Back," in 22px Syne 600, `--text-primary`
- [ ] Left-aligned, top of content area below TopBar

---

### TASK-009: Action Bar (Add Task, Filters)
**Priority:** High
**Effort:** M
**Depends on:** TASK-008

- [ ] Flex row, right-aligned buttons
- [ ] "Add Task" button: `--accent-blue` bg, `Plus` icon prefix, "Add Task" label, chevron-down suffix (dropdown arrow)
- [ ] Year selector: `Calendar` icon + "2024" text + chevron-down, `--bg-card` bg, `--border-subtle` border
- [ ] "Filter" button: `SlidersHorizontal` icon + "Filter" label, `--bg-card` bg
- [ ] "Export Data" button: `Upload` icon + "Export Data" label, `--bg-card` bg
- [ ] All secondary buttons: same height (36px), consistent `--border-subtle` border, 8px radius
- [ ] Greeting section + action bar in same row: `justify-content: space-between`

---

## Phase 4 — KPI Stat Cards

### TASK-010: KPI Card Component
**Priority:** Critical
**Effort:** M
**Depends on:** TASK-001

- [ ] Create reusable `StatCard` component accepting: `label`, `value`, `icon`, `delta`, `deltaType` (`up`/`down`), `deltaText`
- [ ] Card layout:
  - Top row: label (12px, `--text-secondary`) + icon (right, circle bg, 36px)
  - Middle: large number (28px, Syne 700, `--text-primary`)
  - Bottom: delta arrow (`▲`/`▼`) + delta text (11px)
- [ ] Delta green for positive, red for negative
- [ ] Icon circle: `--accent-blue-bg` bg, `--accent-blue` icon color
- [ ] Card: `--bg-card` bg, `--border-subtle` border, 10px radius, 20px padding
- [ ] Hover: `translateY(-1px)` + slight box-shadow increase, 150ms transition

---

### TASK-011: KPI Cards Row
**Priority:** Critical
**Effort:** S
**Depends on:** TASK-010

- [ ] Render 5 `StatCard` instances in a CSS grid: `grid-template-columns: repeat(5, 1fr)`, 12px gap
- [ ] Data:
  ```
  { label: "To-do",          value: 45, icon: Clipboard,     delta: +4.5%, deltaType: up,   text: "Up 4.5% since yesterday" }
  { label: "Total Project",  value: 10, icon: Briefcase,     delta: +4.5%, deltaType: up,   text: "Up 4.5% since yesterday" }
  { label: "Assigned Tasks", value: 15, icon: FileText,      delta: +4.5%, deltaType: up,   text: "Up 4.5% since past week"  }
  { label: "Completed Task", value:  7, icon: ClipboardCheck,delta: +12%,  deltaType: down, text: "Up 12% since three days"  }
  { label: "Overdue Tasks",  value:  5, icon: Clock,         delta: +10%,  deltaType: down, text: "Up 10% since yesterday"   }
  ```
- [ ] Count-up animation on mount: increment from 0 to final value over 600ms (requestAnimationFrame)

---

## Phase 5 — Critical Projects Panel

### TASK-012: Critical Projects — Container + Header
**Priority:** High
**Effort:** S
**Depends on:** TASK-002

- [ ] Panel: `--bg-card` bg, `--border-subtle` border, 10px radius, 20px padding
- [ ] Header row: "Critical Projects" (14px Syne 600) + "This week" dropdown (right-aligned, chevron)
- [ ] "This week" dropdown: `--bg-card-hover` bg, `--border-subtle` border, small select or custom dropdown

---

### TASK-013: Critical Projects — Project Row Component
**Priority:** High
**Effort:** M
**Depends on:** TASK-012

- [ ] Reusable `ProjectRow` component: `title`, `client`, `dueText`
- [ ] Row layout: title (14px, bold) + client (blue link color, `--accent-blue`) + "• " + due text (13px, `--text-secondary`)
- [ ] Three-dot overflow menu button (right-aligned, `MoreHorizontal` icon)
- [ ] Bottom border `--border-subtle` between rows (except last)
- [ ] Hover: `--bg-card-hover` background
- [ ] 3 project rows:
  ```
  { title: "Web 3 app for Fxtrade",       client: "Fxtrade Expert", due: "Due in 20hrs" }
  { title: "Healthydog Landing Page",     client: "DogXpert",       due: "Due in 3 days" }
  { title: "Redesign of Website",         client: "Fxtrade Expert", due: "Due in 5 days" }
  ```
- [ ] "Sell All" CTA at bottom: centered, `--text-secondary`, 13px, subtle top border

---

## Phase 6 — Team Status Panel

### TASK-014: Team Status — Header + Filters
**Priority:** High
**Effort:** S
**Depends on:** TASK-002

- [ ] Panel: same card style as TASK-012
- [ ] Header row: "Team Status" (14px Syne 600) + "Developer" dropdown filter
- [ ] Second row: "Select Project" dropdown (full-width, `--bg-card-hover` bg)

---

### TASK-015: Team Status — Progress Bar
**Priority:** Medium
**Effort:** S
**Depends on:** TASK-014

- [ ] Progress bar row: green filled bar (85%) + "85%" label + "View Activity" link (`--accent-blue`, right)
- [ ] Bar: 8px height, `--accent-teal` fill, `--border-subtle` track, border-radius 4px
- [ ] Animate width from 0% → 85% on mount: CSS transition 600ms ease-out

---

### TASK-016: Team Status — Team Member Grid
**Priority:** High
**Effort:** M
**Depends on:** TASK-014

- [ ] CSS grid: `repeat(3, 1fr)`, 10px gap
- [ ] Each member cell: avatar (40px circle, initials bg) + name (12px bold) + email (11px `--text-muted`)
  ```
  Aspen Herwitz  — Joedoe@gmail.com
  Roger Dokidis  — Joedoe@gmail.com
  Marley Vaccaro — Joedoe@gmail.com
  Ryan Culhane   — Joedoe@gmail.com
  ```
- [ ] 5th cell: "+ Add Individual" — plus icon in dashed circle border, "Add Individual" label
- [ ] Avatar colors: distinct accent colors per member (blue, orange, purple, teal)

---

## Phase 7 — Calendar View

### TASK-017: Calendar — Header + Day Columns
**Priority:** High
**Effort:** M
**Depends on:** TASK-002

- [ ] Full-width panel: `--bg-card` bg, `--border-subtle` border, 10px radius
- [ ] Section header row: "Calendar View" (Syne 600) + "This week" dropdown
- [ ] Month header: "NOVEMBER 2024" — centered, 13px, `--text-secondary`, letter-spacing
- [ ] Day columns: 19 columns (Fri 1 → Tue 19), each with day-name (Fri/Sat/Sun/Mon/Tue) + date number
- [ ] Column width: equal flex distribution
- [ ] Day column header: 11px `DM Mono`, `--text-secondary`
- [ ] Vertical grid lines: `--border-subtle` between columns

---

### TASK-018: Calendar — Task Pills
**Priority:** High
**Effort:** L
**Depends on:** TASK-017

- [ ] Implement task pill as absolutely positioned (or grid-column-span) horizontal bar
- [ ] Each pill: colored background, task name (12px, white, truncated), task badge (right edge: "Task N" in darker tint)
- [ ] 5 task pills with span/position:
  ```
  Task 1: "Homepage for CareyCare App"            — orange bg   — cols 1–2   (Fri 1 – Sat 2)
  Task 2: "Develop Landing Page for Eatz Website" — red/coral   — cols 5–7   (Tue 5 – Thu 7)
  Task 3: "Prepare Marketing Assets for ChronoLoop Launch" — blue — cols 8–15  (Fri 8 – Fri 15)
  Task 4: "Finalize User Onboarding Flow"          — magenta    — cols 5–9   (Tue 5 – Sat 9)
  Task 5: "Integrate Payment Gateway for E-commerce App" — cyan — cols 15–19 (Fri 15 – Tue 19)
  ```
- [ ] Pills stagger vertically (row 1, row 2, row 3) to avoid overlap
- [ ] Animate slide-in left → right on mount: `translateX(-20px)` → 0, staggered 100ms per pill

---

## Phase 8 — Panels Side-by-Side Layout

### TASK-019: Content Row Layout (Projects + Team Status)
**Priority:** High
**Effort:** S
**Depends on:** TASK-013, TASK-016

- [ ] Wrap Critical Projects + Team Status in a flex row
- [ ] Critical Projects: `flex: 1.6` (wider)
- [ ] Team Status: `flex: 1` (narrower)
- [ ] Gap: 16px between panels
- [ ] Both panels same height (stretch)

---

## Phase 9 — Animations & Polish

### TASK-020: Page Load Animations
**Priority:** Medium
**Effort:** M
**Depends on:** All previous tasks

- [ ] Sidebar nav items: fade in with stagger (`animation-delay: 50ms × index`)
- [ ] KPI cards: fade-up with stagger (`animation-delay: 80ms × index`)
- [ ] Panels (Critical Projects, Team Status): fade-up on mount, 300ms
- [ ] Calendar: slide-in from bottom, 400ms ease

---

### TASK-021: Micro-interactions
**Priority:** Medium
**Effort:** S
**Depends on:** All component tasks

- [ ] Add Task button: hover brighten + scale(1.02)
- [ ] Project row 3-dot menu: show/hide on click with smooth opacity transition
- [ ] Team member card: hover = subtle border color change + `translateY(-2px)`
- [ ] Notification bell: gentle ring animation on hover (rotate ±15deg, 3 cycles, 400ms)

---

## Phase 10 — Final Assembly & QA

### TASK-022: Full Page Assembly
**Priority:** Critical
**Effort:** S
**Depends on:** All component tasks

- [ ] Assemble all components in correct layout order inside `App.jsx`
- [ ] Verify theme toggle propagates correctly to all components
- [ ] Ensure no layout overflow or z-index conflicts
- [ ] Check KPI cards grid doesn't break at narrower widths

---

### TASK-023: Accessibility Pass
**Priority:** High
**Effort:** S
**Depends on:** TASK-022

- [ ] Add `aria-label` to all icon-only buttons: bell, share, search, three-dot menus
- [ ] Ensure all buttons have `type="button"`
- [ ] Add `role="navigation"` to sidebar `<nav>`
- [ ] Add `role="main"` to main content area
- [ ] Verify focus rings visible in keyboard navigation
- [ ] Test color contrast: all text vs background passes WCAG 2.1 AA (4.5:1 normal, 3:1 large)

---

### TASK-024: Responsive Polish
**Priority:** Medium
**Effort:** M
**Depends on:** TASK-022

- [ ] At `1280px`: full layout intact
- [ ] At `1024px`: KPI grid wraps to `repeat(3, 1fr)` first row + `repeat(2, 1fr)` second
- [ ] At `768px`: sidebar collapses to icon-only (icons only, no labels, 60px wide)
- [ ] Calendar: horizontal scroll on smaller screens
- [ ] Critical Projects + Team Status: stack vertically below `900px`

---

## Task Summary Table

| Task | Name | Phase | Effort | Depends On |
|------|------|-------|--------|------------|
| TASK-001 | CSS Token System | Foundation | S | — |
| TASK-002 | Root Layout Shell | Foundation | S | 001 |
| TASK-003 | Sidebar Logo | Sidebar | S | 002 |
| TASK-004 | Sidebar Nav Items | Sidebar | M | 003 |
| TASK-005 | Sidebar Bottom | Sidebar | S | 004 |
| TASK-006 | TopBar Search | TopBar | S | 002 |
| TASK-007 | TopBar Right Controls | TopBar | M | 006 |
| TASK-008 | Greeting Section | Greeting | S | 002 |
| TASK-009 | Action Bar | Greeting | M | 008 |
| TASK-010 | StatCard Component | KPI | M | 001 |
| TASK-011 | KPI Cards Row | KPI | S | 010 |
| TASK-012 | Projects Panel Shell | Projects | S | 002 |
| TASK-013 | Project Row Component | Projects | M | 012 |
| TASK-014 | Team Status Shell | Team | S | 002 |
| TASK-015 | Team Progress Bar | Team | S | 014 |
| TASK-016 | Team Member Grid | Team | M | 014 |
| TASK-017 | Calendar Day Columns | Calendar | M | 002 |
| TASK-018 | Calendar Task Pills | Calendar | L | 017 |
| TASK-019 | Panels Row Layout | Layout | S | 013, 016 |
| TASK-020 | Page Load Animations | Polish | M | All |
| TASK-021 | Micro-interactions | Polish | S | All components |
| TASK-022 | Full Assembly | Final | S | All |
| TASK-023 | Accessibility Pass | Final | S | 022 |
| TASK-024 | Responsive Polish | Final | M | 022 |

**Effort key:** S = Small (< 1hr) · M = Medium (1–2hrs) · L = Large (2–4hrs)

---

## Build Order (Recommended Sequence)

```
001 → 002 → 003 → 004 → 005    [Foundation + Sidebar]
            ↓
           006 → 007            [TopBar]
            ↓
           008 → 009            [Greeting]
            ↓
           010 → 011            [KPI Cards]
            ↓
      012 → 013                 [Critical Projects]
      014 → 015 → 016           [Team Status]
            ↓
           019                  [Side-by-side layout]
            ↓
      017 → 018                 [Calendar]
            ↓
      020 → 021 → 022 → 023 → 024   [Polish + QA]
```
