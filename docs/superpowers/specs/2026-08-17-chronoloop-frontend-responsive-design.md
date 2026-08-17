# ChronoLoop Frontend — Responsive / Mobile Design Doc

## 1. Context

The app is currently desktop-only: fixed 240px sidebar, `overflow: hidden` on the app layout, and all page content assumes ≥1024px viewport width. A partial responsive behavior exists at the 1024px breakpoint (sidebar collapses to 60px icon-only mode), but nothing below that — on a phone or small tablet the app is unusable.

This design doc defines how to make the app responsive across phone, tablet, and desktop without regressing the desktop experience or redesigning the visual system.

## 2. Breakpoint Strategy

Three breakpoints, matching standard device classes:

| Token | Range | Target |
|---|---|---|
| `--bp-mobile` | < 640px | Phones (iPhone SE → iPhone 15 Pro Max, most Android) |
| `--bp-tablet` | 640px – 1023px | iPads, Android tablets, small laptops in portrait |
| `--bp-desktop` | ≥ 1024px | Laptops, desktops (current design, unchanged) |

**Rationale:** 640px is the point below which two-column layouts genuinely don't work. 1024px is already in use (sidebar collapse). These align with Tailwind's default breakpoints (for familiarity) without using Tailwind itself.

**Implementation:** CSS media queries in component CSS Modules. No runtime JS breakpoint detection unless a component genuinely needs it (e.g., a swipeable carousel). Use `min-width` (mobile-first) media queries where adding responsive rules, but existing desktop CSS stays as-is (we're adding `@media (max-width: ...)` overrides to preserve the "additive, not replacement" principle).

## 3. Navigation Pattern — Collapsible Drawer

**Recommendation: Off-canvas drawer triggered by a hamburger icon in the TopBar.**

**Why not a bottom tab bar:**
- 9 nav items don't fit in a 5-tab bottom bar without grouping/hiding items
- Bottom tabs compete with in-page footer actions (Save buttons, card footers)
- A drawer is the established pattern for apps with >5 navigation items (Gmail, Notion, Linear mobile, Slack mobile all use drawers)

**How it works:**

- **Desktop (≥1024px):** Sidebar always visible, 240px or 60px (existing behavior, unchanged)
- **Tablet (640–1023px):** Sidebar starts hidden (off-canvas left). TopBar gains a hamburger button (left side). Tapping it slides the sidebar in as an overlay drawer (280px width, with a scrim/overlay behind it). Tapping a nav item navigates AND closes the drawer. Swipe-left or tap-scrim also closes.
- **Mobile (<640px):** Same drawer behavior as tablet. TopBar adjusts: search input collapses to an icon-only trigger (expands on tap), avatar cluster hides, notifications + user avatar remain.

**What changes in AppShell:**
- `grid-template-columns: 240px 1fr` → at mobile/tablet, becomes `1fr` (full width for content)
- Sidebar gets `position: fixed; transform: translateX(-100%); transition: transform 300ms` at small breakpoints
- A new `isDrawerOpen` state (or a small `uiStore` atom) controls visibility
- A hamburger `<button>` appears in TopBar at mobile/tablet breakpoints (hidden at desktop)
- An overlay scrim renders behind the open drawer (same pattern as detail panel overlays)

## 4. Per-Page Strategy

### Straightforward (content naturally stacks)

**Dashboard:** KPI grid goes from 5 columns → 2 columns (mobile) / 3 columns (tablet). Critical Projects / Team Status panels stack vertically. Calendar widget remains as-is (already small).

**Reports:** KPI grid → 2 columns. Chart rows → single column stack. Tables scroll horizontally with `overflow-x: auto`. All charts use `width: 100%` SVG (already responsive by nature of viewBox).

**Settings:** At mobile, the settings sidenav becomes a horizontal scrollable tab bar (or a dropdown selector) above the content area instead of a fixed left column. Content area takes full width.

**Team:** KPI grid → 2 columns. Member card grid naturally handles this via `repeat(auto-fill, minmax(256px, 1fr))` — on narrow screens it becomes 1 column automatically. The list view rows may need horizontal scroll or simplified columns.

**Integrations:** The 2-column layout (main + 320px sidebar) stacks at tablet/mobile — sidebar panels move below the catalogue. KPI grid → 2 columns.

### Needs rethinking

**Tasks Board View (Kanban):**

Options considered:
- (A) Horizontal scroll on the column container — user swipes left/right to see columns
- (B) Single-column-at-a-time with a column switcher (tabs/dropdown: "To Do | In Progress | Done | Overdue")
- (C) Collapse to list view automatically on mobile

**Recommendation: (B) — single column at a time with a tab switcher.** Horizontal scroll on 4+ columns is tedious on phones and loses context. A tab bar above the cards (matching the stat chips that already exist) lets the user jump between columns instantly. The column being viewed renders as a vertical card list. This is how Trello mobile and Jira mobile handle it.

**Sprints Board View:** Same approach as Tasks — tab switcher for columns (Active/Planning/Upcoming/Completed).

**Calendar Week View:**
The 7-column time grid doesn't fit on mobile. Options:
- (A) Show 3 days at a time with horizontal scroll
- (B) Auto-switch to Day view on mobile (week view not available below 768px)
- (C) Simplified agenda-style list for the week

**Recommendation: (B) — force Day view on mobile (<640px).** Week view only renders at tablet+ (≥640px) where there's enough width for 7 narrow columns. On mobile, the view-switcher hides "Week" or auto-redirects to Day view. Day view already works well vertically.

**Calendar Month View:** The 7×6 grid is tight on mobile but still readable if cells shrink. Event pills may need to collapse to just colored dots (no text) below a width threshold, with tap-to-expand showing the full pill or jumping to day view.

**Detail Panels (Task, Project, Sprint, Team Member):**
Currently: slide-in from right, 440–480px wide, with overlay behind.

**On mobile: full-screen takeover.** The panel becomes `width: 100%; height: 100%` instead of a 440px side panel. Close button remains top-right. This is the standard mobile pattern — there's no room for both the list and a side panel simultaneously.

**On tablet (640–1023px):** Panel can remain as an overlay slide-in but should be wider (e.g., 85vw max) so it doesn't fight with the sidebar drawer.

**Modals:**
On mobile (<640px), modals should become **full-screen sheets** that slide up from the bottom (or just take full viewport with minimal padding). The existing centered dialog pattern wastes space on phones where the modal is nearly viewport-width anyway.

This can be achieved by adjusting `.modal-card { max-width }` and adding `inset: 0; border-radius: 0` at the mobile breakpoint. Radix Dialog handles this — just change the CSS.

## 5. Touch Target & Interaction Considerations

- Minimum touch target: 44×44px (Apple HIG). Audit all buttons, nav items, and toggle switches. The existing 30px nav buttons and 28px action buttons need `min-height: 44px` on touch devices (use `@media (pointer: coarse)` where needed).
- Hover states that reveal content (e.g., card context menu appearing on `:hover`) → on touch, use long-press or always-visible icons. The 3-dot menu on team cards/list rows should always be visible on mobile (no hover-reveal gating).
- Swipe gestures: consider swipe-to-delete for webhooks/sessions lists, swipe-left-to-close for drawer. Nice-to-have, not required for MVP responsive.

## 6. Non-Negotiables

- Desktop behavior must not regress. All responsive rules are additive `@media` overrides, never replacing the desktop styles.
- The design token system (colors, radii, type scale, spacing) is untouched. Only layout/flow changes.
- Any ambiguous mobile interaction that doesn't have a clear analog (e.g., "how does the calendar event popup work on mobile when it's now a Dialog?") gets flagged, not silently decided.
- Test at real device widths: 375px (iPhone SE), 390px (iPhone 14), 768px (iPad Mini), 1024px (iPad Pro landscape). Not just "shrink the browser."

## 7. Delivery Sequence

| Phase | Scope | Why this order |
|---|---|---|
| R.1 | **AppShell + Sidebar + TopBar** — drawer nav, hamburger button, mobile TopBar adjustments | Foundation — every page depends on this working first |
| R.2 | **Modals + Detail Panels** — full-screen on mobile, wider on tablet | Cross-cutting primitives used by 5+ pages |
| R.3 | **Dashboard + Reports + Team** — straightforward stacking layouts | Easiest pages, build confidence in the pattern |
| R.4 | **Settings + Integrations** — sidebar-to-tab and 2-col-to-stack conversions | Medium complexity, self-contained |
| R.5 | **Tasks + Sprints** — board view column switcher, list view adjustments | Complex interaction change (kanban → tabs) |
| R.6 | **Calendar** — week view restriction, month pill compression, day view polish | Most complex responsive adaptation |
| R.7 | **Touch polish + final audit** — touch targets, hover-to-always-visible, swipe gestures, real device testing | Cross-cutting cleanup pass |

Each phase gets its own branch, own merge to master, same process as Phase 3.

## 8. Open Questions for Product Owner

1. **Board view on mobile: tab-switcher (B) vs. horizontal scroll (A)?** I recommended B (single column at a time) but if you have a strong preference for horizontal-scroll kanban on mobile, that's also viable.

2. **Calendar week view on mobile: hide it entirely (auto-redirect to Day), or try a 3-day truncated view?** Hiding is simpler and avoids a half-baked experience; 3-day is more feature-complete but needs design work.

3. **Settings nav on mobile: horizontal scrollable tab bar, or a dropdown/select?** Tab bar is more discoverable, dropdown is more compact. With 7 items, the tab bar requires horizontal scroll which some users find non-obvious.

4. **Month view event pills on mobile: collapse to colored dots (saves space) or keep text (readable but may overflow)?** Dots with tap-to-expand matches Google Calendar mobile. Text pills match the current desktop design but would overflow cells on narrow screens.

5. **Should the responsive pass include landscape phone orientation?** Some pages (calendar week, board view) could work at 667px+ landscape even if they don't work at 375px portrait. Or we can scope to portrait-only for mobile and let landscape be "tablet-class."

6. **Priority: ship responsive as a complete phase before starting backend work, or interleave?** The responsive pass is pure frontend — no store/data changes, just CSS + a few layout components. It could proceed in parallel with early backend work if there's a reason to.
