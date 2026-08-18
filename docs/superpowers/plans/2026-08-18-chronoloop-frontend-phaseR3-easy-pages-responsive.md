# Phase R.3 — Dashboard, Reports, and Team Responsive Layouts

**Goal:** Make the Dashboard, Reports, and Team pages' grid layouts responsive at tablet (640–1023px) and mobile (<640px) breakpoints. These are the "straightforward" pages — their content naturally stacks or re-grids without needing new interaction patterns.

**Approach:** Pure CSS media queries added to existing component CSS Modules. Some inline `style` props on ReportsPage and TeamPage need to be moved to CSS Modules to be responsive (inline styles can't have media queries). No component logic changes.

---

## Dashboard Page

### Current layout:
- KPI Grid: `repeat(5, 1fr)` — already has `@media (max-width: 1280px) { repeat(3, 1fr) }`
- Middle row: `display: flex` with CriticalProjectsPanel (`flex: 1.6`) + TeamStatusPanel (`flex: 1`)
- CalendarWidget: has `overflow-x: auto` (already handles narrow widths via horizontal scroll)
- Team Status grid inside panel: `repeat(3, 1fr)` (4 members + 1 add tile)

### Changes needed:

**KPI Grid (`KpiGrid.module.css`):**
- Tablet (640–1023px): already 3-col via existing 1280px rule — adjust breakpoint to 1023px to match our scheme
- Mobile (<640px): `repeat(2, 1fr)` — 2 cards per row, 5th card spans or wraps naturally

**Middle row (`DashboardPage.module.css`):**
- Tablet + Mobile (<1024px): `flex-direction: column` — stack Critical Projects above Team Status

**Team Status grid (`TeamStatusPanel.module.css`):**
- Mobile (<640px): `repeat(2, 1fr)` or keep 3 columns (items are small enough at 3-col on 375px) — **flag: keep at 3 columns** since each member tile is just avatar + name, fits at ~110px per tile

---

## Reports Page

### Current layout (inline styles):
- KPI Grid: `repeat(5, 1fr)` (ReportsKpiGrid.module.css)
- Row 1: `gridTemplateColumns: '1.8fr 1fr'` (inline)
- Row 2: `gridTemplateColumns: '1fr 1fr 1fr'` (inline)
- Row 3: full-width (burndown)
- Row 4: `gridTemplateColumns: '1fr 1fr'` (inline)

### Changes needed:

**Problem:** The grid layouts are inline `style` props on `<div>` elements in `ReportsPage.tsx`. Inline styles can't have media queries. I need to extract these to a CSS Module.

**Create `ReportsPage.module.css`:**
```css
.chartRow2col { display: grid; grid-template-columns: 1.8fr 1fr; gap: 14px; }
.chartRow3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.tableRow2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

@media (max-width: 1023px) {
  .chartRow3col { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 639px) {
  .chartRow2col { grid-template-columns: 1fr; }
  .chartRow3col { grid-template-columns: 1fr; }
  .tableRow2col { grid-template-columns: 1fr; }
}
```

**KPI Grid (`ReportsKpiGrid.module.css`):**
- Tablet: `repeat(3, 1fr)`
- Mobile: `repeat(2, 1fr)`

**Tables:** Already use `width: 100%` inside their panels. On mobile, they may need `overflow-x: auto` on their container for horizontal scroll if columns don't fit. The panel already handles this since panel width is 100%.

---

## Team Page

### Current layout (inline styles + CSS Module):
- KPI Grid: `repeat(5, 1fr)` (TeamKpiGrid.module.css)
- Member grid: `repeat(auto-fill, minmax(256px, 1fr))` (TeamMemberGrid.module.css) — **already responsive** (collapses to 1 column when viewport narrows)
- Bottom row: `gridTemplateColumns: '1fr 1fr'` (inline) — Activity Feed + Performance Leaderboard

### Changes needed:

**KPI Grid (`TeamKpiGrid.module.css`):**
- Tablet: `repeat(3, 1fr)`
- Mobile: `repeat(2, 1fr)`

**Bottom 2-col row (inline style in TeamPage.tsx):** Needs extraction to CSS Module or using an existing class. At mobile: single column stack.

**Dept tabs (`TeamDeptTabs.module.css`):** The tab bar with 5 items may overflow on mobile. Already has `flex-wrap: wrap` — should be fine, but worth checking if it looks crowded. The view toggle (Grid/List) sits on the same row — may need to stack below tabs on mobile.

---

## Flags for Product Owner

1. **Dashboard Team Status grid on mobile:** Keep at 3 columns (tiles are small: avatar + 2-line text, ~110px each works at 375px) or reduce to 2? I recommend keeping 3 — it's a compact widget, not a full page grid.

2. **Reports KPI cards at mobile:** 2 per row means the 5th card is alone on its row. This looks fine (asymmetry is standard for odd-count grids) but flagging in case you want the 5th card to span full-width or be treated differently.

3. **Reports tables on mobile:** Tables with 5 columns (Project, Status, Progress, Due, Health) will be tight at 375px. The existing pattern elsewhere (Billing invoices, Settings team table) is to let tables scroll horizontally inside their panel. Apply same pattern here?

---

## File Changes

```
src/components/dashboard/KpiGrid.module.css           — MODIFIED: adjust breakpoint, add mobile rule
src/pages/DashboardPage.module.css                    — MODIFIED: add responsive middleRow stacking
src/components/reports/ReportsKpiGrid.module.css      — MODIFIED: add tablet + mobile breakpoints
src/pages/ReportsPage.tsx                             — MODIFIED: extract inline grid styles to classes
src/pages/ReportsPage.module.css                      — NEW: chart row grid classes with media queries
src/components/team/TeamKpiGrid.module.css            — MODIFIED: add tablet + mobile breakpoints
src/pages/TeamPage.tsx                                — MODIFIED: extract inline grid style to class
src/pages/TeamPage.module.css                         — NEW or MODIFIED: bottom row responsive class
src/components/team/TeamDeptTabs.module.css            — MODIFIED: stack view toggle below tabs on mobile
```

---

## Task Breakdown

### Task 1: Dashboard responsive
- KpiGrid: adjust 1280px → 1023px breakpoint, add `<640px: repeat(2, 1fr)`
- DashboardPage.module.css: `.middleRow` at `<1024px: flex-direction: column`
- Verify CalendarWidget (already has horizontal scroll — no change needed)

### Task 2: Reports responsive
- Create `ReportsPage.module.css` with grid row classes + media queries
- Update `ReportsPage.tsx` to use classes instead of inline grid styles
- ReportsKpiGrid.module.css: add tablet (3-col) + mobile (2-col) rules
- Tables: add `overflow-x: auto` wrapper if not already present

### Task 3: Team responsive
- TeamKpiGrid.module.css: add tablet (3-col) + mobile (2-col) rules
- TeamPage: extract bottom 2-col row to CSS class with mobile stacking
- TeamDeptTabs: stack row/toggle on mobile if needed

### Task 4: Verify + commit
- `pnpm test`, `pnpm typecheck`, `pnpm lint`
- Code-level walkthrough confirming: CSS cascade is correct, no specificity conflicts, inline styles properly replaced, no layout regressions at desktop
- Be explicit about what I can't verify (actual rendering at specific widths) vs. what I confirmed (correct CSS rules, proper media query ranges, no syntax errors)
