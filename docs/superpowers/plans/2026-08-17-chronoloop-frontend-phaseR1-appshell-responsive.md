# Phase R.1 — AppShell / Sidebar / TopBar Responsive Foundation

**Goal:** Make the app's chrome (sidebar navigation, top bar, and overall layout container) responsive across mobile (<640px), tablet (640–1023px), and desktop (≥1024px), adding an off-canvas drawer navigation triggered by a hamburger icon at smaller breakpoints. Desktop behavior must not regress.

**Architecture:** The existing AppShell uses `grid-template-columns: 240px 1fr` (desktop) with a 1024px breakpoint already collapsing to `60px 1fr`. This phase extends it to support `1fr` (sidebar hidden, full-width content) at <1024px, with the sidebar rendered as a fixed off-canvas drawer controlled by a `useDrawerStore` (simple `isOpen: boolean` + `open()`/`close()`/`toggle()` actions). The TopBar gains a hamburger button (visible only at <1024px). All existing page content renders inside the same `<Outlet>` — no page-level changes in this phase.

**Owner decisions applied from design doc review:**
- Navigation: off-canvas drawer (not bottom tabs)
- Landscape phone: "doesn't break" target, no bespoke layout
- Ship responsive as complete phase before backend

---

## Global Constraints

- **Additive only** — all responsive rules are `@media (max-width: ...)` overrides. Desktop CSS unchanged.
- **No page-level layout changes in this phase** — only the AppShell/Sidebar/TopBar/global primitives. Pages will adapt in later phases (R.3–R.6).
- **Touch targets** — hamburger button and drawer nav items must be ≥44px tap target.
- **No JS breakpoint detection** — pure CSS media queries. The drawer open/close state is the only JS addition.
- **Test widths:** 375px (iPhone SE), 390px (iPhone 14), 768px (iPad Mini), 1024px (existing collapse).

---

## File Changes

```
src/store/drawerStore.ts                    — NEW: isOpen, open, close, toggle
src/store/drawerStore.test.ts               — NEW: basic tests
src/components/layout/AppShell.tsx          — MODIFIED: add drawer overlay, pass drawer state
src/components/layout/AppShell.module.css   — MODIFIED: add mobile/tablet media queries
src/components/layout/Sidebar.tsx           — MODIFIED: add close-on-nav handler, accept isDrawer prop
src/components/layout/Sidebar.module.css    — MODIFIED: add drawer positioning at mobile/tablet
src/components/layout/TopBar.tsx            — MODIFIED: add hamburger button
src/components/layout/TopBar.module.css     — MODIFIED: hide/show elements at breakpoints
```

---

## Task Breakdown

### Task 1: Create drawerStore

**Files:** `src/store/drawerStore.ts`, `src/store/drawerStore.test.ts`

```typescript
interface DrawerState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}
```

Simple boolean store. The sidebar drawer reads `isOpen` to control its transform. TopBar's hamburger calls `toggle()`. Nav item click calls `close()`.

---

### Task 2: Modify AppShell — add drawer overlay + responsive grid

**Changes to `AppShell.tsx`:**
- Import `useDrawerStore`
- Render a `<div className={styles.drawerOverlay}>` (click → close drawer) that only shows when drawer is open
- Pass a `onNavClick` callback to Sidebar that calls `drawerStore.close()`

**Changes to `AppShell.module.css`:**

```css
/* Existing desktop stays as-is */

/* Below 1024px: single-column layout, sidebar is off-canvas */
@media (max-width: 1023px) {
  .appLayout {
    grid-template-columns: 1fr;
  }
}

.drawerOverlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 199;
  backdrop-filter: blur(2px);
}

@media (max-width: 1023px) {
  .drawerOverlayOpen {
    display: block;
  }
}
```

---

### Task 3: Modify Sidebar — drawer mode at mobile/tablet

**Changes to `Sidebar.tsx`:**
- Accept `onNavClick?: () => void` prop
- Each `NavLink` `onClick` calls `onNavClick?.()` in addition to navigating
- Component otherwise unchanged — CSS handles the positioning

**Changes to `Sidebar.module.css`:**

```css
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 300ms var(--ease-out);
    box-shadow: 8px 0 30px rgba(0, 0, 0, 0.3);
  }

  .sidebarOpen {
    transform: translateX(0);
  }

  /* Restore full nav text (override the 1024px collapse that hides labels) */
  .navItem span,
  .sidebarBottom {
    display: flex;
  }
  .navItem {
    justify-content: flex-start;
    padding: 0 16px;
  }
  .logo {
    justify-content: flex-start;
    padding: 20px 16px;
  }
  .brandLogo {
    height: 38px;
  }
}
```

Key point: the existing `@media (max-width: 1024px)` rule hides nav labels and makes the sidebar icon-only. The new `@media (max-width: 1023px)` rule (one pixel below) overrides that to RESTORE labels inside the drawer. This means:
- At exactly 1024px: icon-only sidebar (existing behavior)
- At <1024px: full-label drawer (slides in from left)

---

### Task 4: Modify TopBar — add hamburger button, responsive adjustments

**Changes to `TopBar.tsx`:**
- Import `useDrawerStore`
- Add a `<button className={styles.hamburger}>` with `Menu` icon (from lucide) that calls `toggle()`
- This button is hidden at ≥1024px via CSS

**Changes to `TopBar.module.css`:**

```css
.hamburger {
  display: none;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast), color var(--duration-fast);
  flex-shrink: 0;
}

.hamburger:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

@media (max-width: 1023px) {
  .hamburger {
    display: flex;
  }

  .searchWrap {
    /* Collapse search to icon-only on mobile */
    max-width: 44px;
    overflow: hidden;
  }

  .searchInput {
    opacity: 0;
    width: 0;
    padding: 0;
  }

  .avatarCluster {
    display: none;
  }

  .shareBtn {
    display: none;
  }
}

@media (max-width: 639px) {
  .searchWrap {
    display: none; /* Hide search entirely on phones — too narrow */
  }
}
```

---

### Task 5: Escape key closes drawer + close on route change

**In AppShell or Sidebar:**
- `useEffect` listens for Escape key when drawer is open → calls `close()`
- `useLocation` from react-router — when path changes, call `close()` (handles programmatic navigation that bypasses the NavLink click)

---

### Task 6: Adjust contentScroll padding at mobile

**In `AppShell.module.css`:**
```css
@media (max-width: 639px) {
  .contentScroll {
    padding: 12px 16px 16px;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .contentScroll {
    padding: 14px 20px 18px;
  }
}
```

Reduces padding at smaller viewports to maximize content space.

---

### Task 7: Final verification

- `pnpm test`, `pnpm typecheck`, `pnpm lint`
- Own `pnpm dev` walkthrough at 375px, 768px, and 1024px+ (resize browser):
  - Desktop (≥1024px): sidebar always visible, no hamburger, no regression ✓
  - Tablet (768px): sidebar hidden, hamburger visible in TopBar, click opens drawer, click nav item navigates + closes drawer, click overlay closes, Escape closes ✓
  - Mobile (375px): same as tablet but search hidden, avatar cluster hidden, tighter padding ✓
- Commit and report

---

## Dependencies

| Dependency | Source | Used By |
|---|---|---|
| `useThemeStore` | Phase 1 | Sidebar theme toggle (unchanged) |
| All existing page routes | Phase 1–3 | NavLink targets (unchanged) |
| `--ease-out`, `--duration-fast` tokens | `tokens.css` | Drawer transition |

---

## What This Phase Does NOT Do

- Does not adjust any page-level layouts (KPI grids, tables, charts, etc.) — those come in R.3–R.6
- Does not change modal or detail panel behavior — that's R.2
- Does not add swipe gestures — that's R.7
- Does not modify the Sidebar's nav item list or labels — only layout/visibility changes
