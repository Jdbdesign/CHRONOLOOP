# Phase R.2 — Modals + Detail Panels Responsive

**Goal:** Make all modals and detail panels work correctly on mobile (<640px) and tablet (640–1023px) without regressing desktop behavior. Modals become full-screen sheets on mobile. Detail panels become full-screen takeovers on mobile.

**Architecture:** Pure CSS additions — no component logic changes needed. The existing Modal primitive (Radix Dialog) and detail panels (fixed-position slide-in) already have the right structure. We only need to add `@media` overrides to their CSS Modules to change dimensions/positioning at small breakpoints.

---

## What Changes

### Modals (Modal.module.css)

**Current:** Centered dialog, `max-width: 480px`, `border-radius: 14px`, `padding: 20px` on overlay.

**Mobile (<640px):**
- `.card` → `max-width: none; width: 100%; height: 100%; max-height: 100vh; border-radius: 0;` (full-screen sheet)
- `.overlay` → `padding: 0;` (no padding around the full-screen card)
- Animation changes from scale/translateY to slide-up from bottom

**Tablet (640–1023px):**
- No change needed — 480px max-width centered already works fine at 640px+ viewports

### Detail Panels (TaskDetailPanel, ProjectDetailPanel, SprintDetailPanel, TeamDetailPanel)

**Current:** `width: 440px; max-width: 95vw; position: fixed; right: 0;`

All 4 panels share the same CSS pattern (they were built following the same template). The `max-width: 95vw` already makes them nearly full-width on mobile, but:

**Mobile (<640px):**
- `width: 100%; max-width: 100%;` (true full-screen, no visible content behind)
- Remove `border-left` (no longer a "side panel")
- Box-shadow optional (full-screen doesn't need a shadow suggesting depth)

**Tablet (640–1023px):**
- `width: 85vw; max-width: 500px;` (wider than desktop's 440px but not full-screen)

### Calendar Event Dialog (CalEventPopup via Radix Dialog)

**Current:** Centered Dialog with 300px popup content.

**Mobile (<640px):**
- Same full-screen treatment as other modals

---

## File Changes

```
src/components/ui/Modal.module.css                   — MODIFIED: add mobile media query
src/components/tasks/TaskDetailPanel.module.css       — MODIFIED: add mobile/tablet media queries
src/components/projects/ProjectDetailPanel.module.css — MODIFIED: same
src/components/sprints/SprintDetailPanel.module.css   — MODIFIED: same
src/components/team/TeamDetailPanel.module.css        — MODIFIED: same
src/components/calendar/CalEventPopup.module.css      — MODIFIED: add mobile query for dialog content
```

---

## Task Breakdown

### Task 1: Modal full-screen on mobile

Add to `Modal.module.css`:
```css
@media (max-width: 639px) {
  .overlay {
    padding: 0;
    align-items: flex-end;
  }

  .card {
    max-width: none;
    width: 100%;
    max-height: 100vh;
    height: 100%;
    border-radius: 16px 16px 0 0;
    border: none;
  }

  .card[data-state='open'] {
    animation: cardSlideUp var(--duration-normal) var(--ease-out);
  }

  .card[data-state='closed'] {
    animation: cardSlideDown var(--duration-normal) var(--ease-out);
  }
}

@keyframes cardSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes cardSlideDown {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
```

Note: On mobile, modals slide up from the bottom as full-screen sheets with rounded top corners — a standard mobile pattern (iOS action sheets, Android bottom sheets). This gives a clear "I came from the bottom, swipe/tap to dismiss" affordance.

### Task 2: Detail panels full-screen on mobile, wider on tablet

Add to each detail panel's `.module.css` (same rule for all 4):
```css
@media (max-width: 639px) {
  .panel {
    width: 100%;
    max-width: 100%;
    border-left: none;
    box-shadow: none;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .panel {
    width: 85vw;
    max-width: 500px;
  }
}
```

### Task 3: Calendar event dialog on mobile

Add to `CalEventPopup.module.css`:
```css
@media (max-width: 639px) {
  .dialogContent {
    width: 100%;
    max-width: none;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    border-radius: 16px 16px 0 0;
  }

  .popupContent {
    width: 100%;
    border-radius: 16px 16px 0 0;
  }
}
```

### Task 4: Verify + commit

- `pnpm test`, `pnpm typecheck`, `pnpm lint`
- pnpm dev walkthrough at 375px: open a modal (New Task, New Project, etc.), confirm it's full-screen from bottom. Open a detail panel (click a task, project, sprint, team member), confirm it's full-screen. Close each. Test at 768px: panel is ~85vw, modal is normal centered.
- Commit and report

---

## What This Phase Does NOT Do

- Does not change any component logic (no new props, no new state)
- Does not add swipe-to-dismiss (that's R.7)
- Does not change modal/panel content layout (form fields, sections, etc. still render the same)
- Does not add focus trap (deferred to R.7 cross-cutting a11y pass)
