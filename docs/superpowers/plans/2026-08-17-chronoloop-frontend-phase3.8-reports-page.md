# Phase 3.8 — Reports Page Implementation Plan

**Goal:** Port the Reports page (`renderReportsPage` and all its chart/table rendering functions) from the legacy `index.html` into the React/TS rewrite at `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`, with pixel/behavior parity.

**Architecture:** The Reports page is entirely read-only — no mutations, no modals, no detail panels. It renders a KPI strip, 6 chart/visualization panels (bar chart, donut, velocity bars, priority horizontal bars, team output bars, burndown line chart), and 2 data tables. All data comes from a static `RPT_DATA` constant. Charts are rendered as inline SVG (same as the original), not via a charting library.

**Tech Stack:** Vite, React 18, TypeScript, inline SVG for charts (matching the original's approach), Vitest + Testing Library, `lucide-react` icons.

**Source of truth:** `index.html` in the sibling repo. Line ranges cited below pinned as read on 2026-08-17.

---

## Global Constraints

- **CSS ports verbatim** from cited line ranges (1488–1590).
- **Charts are inline SVG** — the original renders all charts as SVG strings in JS. Port as JSX `<svg>` elements with the same viewBox, dimensions, and positioning math.
- **No charting library** — the original doesn't use one, and adding one would be scope creep.
- **Tooltips on chart hover** — the original has `rpt-chart-tooltip` (a fixed-positioned div) that shows on bar/dot hover with event-based positioning. Port as a local state-driven tooltip div.
- **Range tabs (7D / 30D / 90D / 12M) are decorative** — they change the active tab styling and show a toast but never change the displayed data. The data is static.
- **Export button** shows a toast ("Preparing report export…" then "Report exported successfully!"). No real export.
- **Print button** shows a toast then calls `window.print()`.
- **Table filter dropdowns (Project Performance / Sprint Summary) are decorative** — they change the dropdown trigger label and show a toast but never filter the table data.

---

## Flags for Product Owner

1. **All chart data is static/hardcoded in `RPT_DATA`** — none of it is computed from the task/project/sprint stores. The original's reports page uses its own separate hardcoded dataset (different project names than `PROJECTS`, different team members than `TEAM_MEMBERS`). This is clearly placeholder data for a "real reports" feature that doesn't exist yet. Preserve as-is? Or compute any of it live from existing stores?

2. **Range tabs are decorative** — 7D/30D/90D/12M buttons show a toast but never change the charts. Same pattern as Team page's filter dropdown (approved as "preserve, log as gap"). Apply the same decision here?

3. **Table filter dropdowns are decorative** — "All Projects" and "Last 6 Sprints" dropdowns show toasts but never filter. Same pattern. Apply same decision?

4. **Chart tooltip positioning** — the original uses imperative mouse-event positioning (`positionRptTooltip`). In React, this maps to a local state with `{ x, y, content }` updated on `onMouseEnter`/`onMouseMove`. This is the correct React-idiomatic approach and doesn't have the same anchor/positioning issues as the Calendar popup (tooltips follow the cursor, not anchor to a trigger element). Proceed?

5. **The original's burndown chart hover dots use `onmouseenter` / `onmousemove` / `onmouseleave` inline handlers** — these work in React JSX as `onMouseEnter` etc. No issue, just noting for traceability.

6. **RPT_DATA uses different team member names than TEAM_MEMBERS** — "Jordan K.", "Sam R.", "Taylor B." appear in `teamOutput` but don't exist in the team store. This is the original's own data — not a bug, just separate datasets for different purposes. Preserve as-is.

---

## File Structure

```
src/data/mockReportsData.ts                           — RPT_DATA constant (all chart/table data)
src/components/reports/ReportsPageHeader.tsx            (+ .test.tsx, + .module.css)
src/components/reports/ReportsKpiGrid.tsx               (+ .test.tsx)
src/components/reports/RptTrendChart.tsx                (+ .test.tsx, + .module.css)
src/components/reports/RptDonutChart.tsx                (+ .test.tsx, + .module.css)
src/components/reports/RptVelocityChart.tsx             (+ .test.tsx)
src/components/reports/RptPriorityChart.tsx             (+ .test.tsx, + .module.css)
src/components/reports/RptTeamOutput.tsx                (+ .test.tsx, + .module.css)
src/components/reports/RptBurndownChart.tsx             (+ .test.tsx)
src/components/reports/RptProjectTable.tsx              (+ .test.tsx, + .module.css)
src/components/reports/RptSprintTable.tsx               (+ .test.tsx)
src/components/reports/RptChartTooltip.tsx              (+ .module.css)
src/pages/ReportsPage.tsx                             — MODIFIED: replaces stub
```

---

## Task Breakdown

### Task 1: Reports mock data

**Files:** `src/data/mockReportsData.ts`

**Details:** Byte-verified transcription of `RPT_DATA` from `index.html:9063-9133`. Typed interfaces for each data shape (KPI, WeeklyTask, ProjectStatus, SprintVelocity, PriorityBreakdown, TeamOutput, BurndownPoint, ProjectRow, SprintRow).

---

### Task 2: ReportsPageHeader

**Files:** `src/components/reports/ReportsPageHeader.tsx` (+ test, + module.css)

**Behavior (from `index.html:3587-3609`):**
- Breadcrumb "Overview / Reports", heading "Reports"
- Range tabs: 7D / 30D (active default) / 90D / 12M — clicking changes active tab styling, shows toast
- Export button (secondary, download icon) — shows toast sequence
- Print button (secondary, printer icon) — shows toast, calls `window.print()`

---

### Task 3: ReportsKpiGrid (5 stat cards)

**Files:** `src/components/reports/ReportsKpiGrid.tsx` (+ test)

**Behavior (from `index.html:9147-9171`):**
- 5 cards in a row, same `.stat-card` visual but with custom delta formatting (arrow SVG + delta text + sub text)
- Data from `RPT_DATA.kpis` — static, not computed
- Each card: label, value, icon (colored, on tinted bg), delta with direction arrow, sub text

---

### Task 4: RptTrendChart (Task Completion Trend — grouped bar chart)

**Files:** `src/components/reports/RptTrendChart.tsx` (+ test, + module.css)

**Behavior (from `index.html:9176-9210`):**
- SVG viewBox 560×160, bars for 12 weeks (assigned = blue@0.3, completed = teal@0.9)
- Grid lines at 0/10/20/30/40, x-labels every 2 weeks
- Panel header: title "Task Completion Trend", subtitle, legend (Completed dot + Assigned dot)
- Hover → tooltip showing week label, completed count, assigned count, rate%

---

### Task 5: RptDonutChart (Project Status — donut)

**Files:** `src/components/reports/RptDonutChart.tsx` (+ test, + module.css)

**Behavior (from `index.html:9213-9234`):**
- SVG donut (r=50, cx/cy=65, stroke-width=20), 4 segments colored by status
- Center text: total count + "Projects"
- Legend beside donut: color swatch + label + percentage
- Panel header: title "Project Status", subtitle

---

### Task 6: RptVelocityChart (Sprint Velocity — bar chart)

**Files:** `src/components/reports/RptVelocityChart.tsx` (+ test)

**Behavior (from `index.html:9236-9270`):**
- SVG viewBox 280×140, vertical bars for 6 sprints
- Color: blue if ≥40 (target), purple if below
- Dashed target line at 40pts with label
- Value label above each bar
- Hover → tooltip with sprint name, velocity, vs target diff
- Panel header: title "Sprint Velocity", subtitle

---

### Task 7: RptPriorityChart + RptTeamOutput (horizontal bar panels)

**Files:** `src/components/reports/RptPriorityChart.tsx` (+ test, + module.css), `src/components/reports/RptTeamOutput.tsx` (+ test, + module.css)

**Priority Breakdown (from `index.html:9272-9283`):**
- 4 horizontal bars (Critical/High/Medium/Low), colored, with count labels
- Panel header: title "Priority Breakdown", subtitle

**Team Output (from `index.html:9285-9297`):**
- 5 rows: avatar (22px), name, progress bar (colored), completed/total count
- Panel header: title "Team Output", subtitle

---

### Task 8: RptBurndownChart (Sprint Burndown — line chart)

**Files:** `src/components/reports/RptBurndownChart.tsx` (+ test)

**Behavior (from `index.html:9299-9333`):**
- SVG viewBox 560×160, full-width panel
- Dashed ideal line (gray, 80→0 over 14 days)
- Solid actual line (orange) with dots at each data point
- Orange area fill below the actual line
- X-axis labels every 2 days (D0, D2, ... D12)
- Y-axis grid at 0/20/40/60/80
- Hover dots → tooltip with day, ideal pts, actual pts, delta status
- Panel header: title "Sprint Burndown — Sprint 5: Team & Reports", subtitle, legend

---

### Task 9: RptProjectTable + RptSprintTable (data tables)

**Files:** `src/components/reports/RptProjectTable.tsx` (+ test, + module.css), `src/components/reports/RptSprintTable.tsx` (+ test)

**Project Performance table (from `index.html:9335-9354`):**
- Columns: Project, Status (dot + label), Progress (bar + %), Due, Health (badge)
- 6 rows from `RPT_DATA.projects`
- Filter dropdown: "All Projects" (decorative, shows toast)
- Panel header: title "Project Performance"

**Sprint Summary table (from `index.html:9358-9374`):**
- Columns: Sprint, Duration, Velocity, vs Target (colored +/-), Status (dot + label)
- 6 rows from `RPT_DATA.sprints`
- Filter dropdown: "Last 6 Sprints" (decorative)
- Panel header: title "Sprint Summary"

---

### Task 10: RptChartTooltip (shared tooltip component)

**Files:** `src/components/reports/RptChartTooltip.tsx` (+ module.css)

**Behavior (from `index.html:9430-9460`):**
- Fixed-positioned div, follows mouse cursor
- Shows on hover enter, hides on leave
- Content varies by chart type (trend/velocity/burndown)
- Dark bg, rounded corners, shadow — matching original's `#rpt-chart-tooltip` CSS

---

### Task 11: Assemble ReportsPage

**Files:** `src/pages/ReportsPage.tsx` (replaces stub)

**Layout:**
- Flex column, gap 14px
- Header → KPI Grid → Row 1 (2-col: Trend + Donut) → Row 2 (3-col: Velocity + Priority + Team Output) → Burndown (full width) → Row 4 (2-col: Project Table + Sprint Table)
- Tooltip state managed at page level, passed to chart components
- Range tab state (active tab label) — local, decorative

---

### Task 12: Final verification

- `pnpm test`, `pnpm typecheck`, `pnpm lint`
- Own `pnpm dev` walkthrough: all charts render, tooltips appear on hover, tabs/buttons show toasts, tables display correctly
- Commit and report

---

## Dependencies on Prior Phases

| Dependency | Source | Used By |
|---|---|---|
| `Button` primitive | Phase 2 | Header buttons |
| `Dropdown` primitive | Phase 2 | Table filter dropdowns |
| `useToastStore` | Phase 3.2 | Range tabs, Export, Print, filter dropdowns |
| `Avatar` component | Phase 2 | Team Output rows |

---

## Estimated Scope

- ~12 new component files (+ tests + CSS modules)
- 1 data file
- 1 modified file (`ReportsPage.tsx` stub → full page)
- CSS: ~100 lines ported verbatim
- Most complex components: `RptTrendChart` and `RptBurndownChart` (SVG math)
- Simplest components: `RptPriorityChart` and `RptTeamOutput` (horizontal bars, no SVG)
