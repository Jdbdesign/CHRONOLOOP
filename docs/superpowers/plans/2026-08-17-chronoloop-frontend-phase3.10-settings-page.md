# Phase 3.10 — Settings Page Implementation Plan

**Goal:** Port the Settings page (7 tabbed panels with forms, toggles, radio-card selectors, tables, and a danger zone) from the legacy `index.html` into the React/TS rewrite, with pixel/behavior parity. This is the final page in the rewrite.

**Architecture:** The Settings page is a 2-column layout: left sidebar navigation (7 items across 3 groups) + right content area showing the active tab's content. The page is entirely form-based — no modals, no detail panels, no data mutations that persist. All form inputs are pre-filled with static mock data. The only functional behavior is: theme switching (wires to the existing `themeStore`), tab navigation, radio-card selection (visual only except theme), and "Save Changes" / danger zone buttons (toast only).

**Tech Stack:** Vite, React 18, TypeScript, Zustand (`themeStore` for theme switching), Vitest + Testing Library, `lucide-react` icons.

**Source of truth:** `index.html` lines 3901–5118 (HTML), 2581–2700 (CSS), 10217–10400 (JS).

**Note:** Page heading will use `<h1>` from day one (per the cross-page fix established in Phase 3.9).

---

## Global Constraints

- **CSS ports verbatim** from cited ranges.
- **All form data is static/hardcoded** — no backend, no persistence. Inputs are pre-filled with mock values. "Save Changes" shows a toast.
- **Theme radio cards are functional** — clicking Dark/Light/System updates `themeStore` and changes `data-theme` attribute on `<html>`. This is the ONLY setting that has a real effect.
- **All other settings are decorative** — toggles, selects, inputs, radio cards are interactive (they change visual state) but never persist or affect app behavior.
- **Danger zone buttons show confirmation toasts** — no destructive action occurs.
- **2-column fixed layout** — left nav is 214px, right content scrolls.

---

## Flags for Product Owner

1. **All settings except theme are decorative** — forms accept input, toggles toggle, radio cards select, but nothing persists or affects the app. Same pattern as other decorative controls, but here it's the entire page. Preserve as-is? (The Settings page is a UI shell awaiting a backend — same category as Reports' placeholder data.)

2. **Team & Roles tab sources from `TEAM_MEMBERS` + the logged-in user** — the original had a completely separate 8-person roster with no overlap with the Team page (different names, different email domains). This was determined to be an accidental mock-data artifact, not an intentional design distinction. Fix: the Team & Roles table will show Jacob Solayinka (Owner, the logged-in user — first row, non-removable) + the 8 members from `TEAM_MEMBERS` with assigned workspace roles (based on job title: developers/designers → Member, Product Manager → Admin). This keeps the member roster consistent across the app.

3. **Role Permissions table body is rendered by JS** (`id="role-perms-tbody"` populated by `renderSettingsPage`). The original fills it with a matrix of checkmarks. Port as static JSX since the data never changes.

4. **Security tab has a password form with strength indicator** — the original has 4 `.pwd-bar` divs that fill based on password length. Port as a simple visual (bars react to input length locally) with no real password validation backend.

5. **Billing tab's "Upgrade to Business" and "Switch to Annual" buttons just show toasts** — no real billing flow.

6. **Color swatches in Appearance tab are decorative** — clicking one adds `.active` class but doesn't change any CSS variable. The original does the same (it's a planned feature stub). Preserve?

---

## File Structure

```
src/data/mockSettingsData.ts                          — static data for team table, sessions, invoices, role permissions
src/components/settings/SettingsNav.tsx                 (+ .module.css)
src/components/settings/tabs/ProfileTab.tsx             (+ .module.css)
src/components/settings/tabs/WorkspaceTab.tsx
src/components/settings/tabs/NotificationsTab.tsx
src/components/settings/tabs/AppearanceTab.tsx
src/components/settings/tabs/SecurityTab.tsx
src/components/settings/tabs/BillingTab.tsx
src/components/settings/tabs/TeamRolesTab.tsx
src/components/settings/shared/SettingsCard.tsx         (+ .module.css) — reusable card wrapper
src/components/settings/shared/ToggleRow.tsx            (+ .module.css)
src/components/settings/shared/RadioCardGroup.tsx       (+ .module.css)

src/pages/SettingsPage.tsx                            — MODIFIED: replaces stub
```

---

## Task Breakdown

### Task 1: Settings mock data + shared components

**Files:** `src/data/mockSettingsData.ts`, `SettingsCard.tsx`, `ToggleRow.tsx`, `RadioCardGroup.tsx` (+ CSS modules)

**Details:**
- Static data: team members (8 rows), sessions (4 rows), login activity (4 rows), invoices (5 rows), role permissions matrix, pending invitations (2)
- `SettingsCard`: wrapper with title, subtitle, optional header-right slot
- `ToggleRow`: label + description + toggle switch
- `RadioCardGroup`: array of cards with icon + label, exclusive active selection

---

### Task 2: SettingsNav (left sidebar navigation)

**Files:** `src/components/settings/SettingsNav.tsx` (+ .module.css)

**Behavior:**
- 3 groups (Account, Preferences, Admin) with group labels
- 7 nav items: Profile, Workspace, Notifications, Appearance, Security, Billing, Team & Roles
- Active item gets blue bg, white text
- Each item has a lucide icon

---

### Task 3: ProfileTab

**Files:** `src/components/settings/tabs/ProfileTab.tsx` (+ .module.css)

**Behavior:**
- 3 cards: Personal Information (avatar + name/title/dept/bio), Contact & Links (email with verified badge + phone + LinkedIn + Twitter), Regional Settings (timezone + language + date/time format)
- Avatar row: image + name + role + "Upload Photo" / "Remove" buttons (toasts)
- All inputs pre-filled with mock data

---

### Task 4: WorkspaceTab

**Files:** `src/components/settings/tabs/WorkspaceTab.tsx`

**Behavior:**
- 3 sections: Workspace Identity (logo upload area + name + URL with copy button + description), Workspace Preferences (currency, fiscal year, week start, sprint duration, working hours), Danger Zone (Archive / Transfer / Delete buttons — all toast)

---

### Task 5: NotificationsTab

**Files:** `src/components/settings/tabs/NotificationsTab.tsx`

**Behavior:**
- 4 cards: Master toggles (All Notifications, Do Not Disturb), Email Notifications (7 toggles), In-App Notifications (5 toggles), Digest Frequency (radio-card group: Immediate/Daily/Weekly/Never)
- All toggles use `ToggleRow` component

---

### Task 6: AppearanceTab

**Files:** `src/components/settings/tabs/AppearanceTab.tsx`

**Behavior:**
- 5 cards: Theme (radio-card: Dark/Light/System — FUNCTIONAL, wires to themeStore), Accent Color (8 color swatches — decorative), Interface Density (radio-card: Compact/Comfortable/Spacious), Font Size (radio-card: Small/Medium/Large), Sidebar Behavior (3 toggles)
- Theme switching: clicking a theme card → `useThemeStore.setTheme(value)` + toast

---

### Task 7: SecurityTab

**Files:** `src/components/settings/tabs/SecurityTab.tsx`

**Behavior:**
- 4 cards: Change Password (form with current/new/confirm + strength bars + submit toast), Two-Factor Auth (status card + enable button toast + backup codes + toggle), Active Sessions (4 rows with device/location/time + revoke buttons + "Revoke All"), Login Activity (4 rows with success/fail dots + event + time)

---

### Task 8: BillingTab

**Files:** `src/components/settings/tabs/BillingTab.tsx`

**Behavior:**
- 4 cards: Current Plan (Pro plan details + features + price + upgrade/annual buttons), Usage (4 progress bars: projects/members/storage/API calls), Payment Method (VISA card display + edit/remove toasts), Invoice History (5-row table with download buttons)

---

### Task 9: TeamRolesTab

**Files:** `src/components/settings/tabs/TeamRolesTab.tsx`

**Behavior:**
- 4 cards: Team Members table (8 rows with avatar/name/email/role badge/status/last active + "···" buttons), Invite New Member (email + role + submit toast), Pending Invitations (2 items with resend/revoke buttons), Role Permissions (matrix table: Owner/Admin/Member/Viewer × ~8 permissions with checkmarks)

---

### Task 10: Assemble SettingsPage

**Files:** `src/pages/SettingsPage.tsx` (replaces stub)

**Layout:**
- Page header (breadcrumb + `<h1>` heading + Discard/Save buttons)
- 2-column grid: left SettingsNav (214px) + right scrollable content
- Active tab state (local `useState`, default 'profile')
- Renders the appropriate tab component based on active state

---

### Task 11: Final verification

- `pnpm test`, `pnpm typecheck`, `pnpm lint`
- Own `pnpm dev` walkthrough: all 7 tabs render, tab switching works, theme switch actually changes theme, toggles toggle, radio cards select, forms accept input, Save/Discard/danger buttons show toasts, sessions revoke, invoices download toast
- Commit and report

---

## Dependencies on Prior Phases

| Dependency | Source | Used By |
|---|---|---|
| `Button` primitive | Phase 2 | Header, forms, danger zone |
| `useToastStore` | Phase 3.2 | All decorative actions |
| `useThemeStore` | Phase 1 | Appearance tab theme switching |

---

## Estimated Scope

- ~12 new component files (+ CSS modules)
- 1 data file
- 1 modified file (SettingsPage.tsx)
- CSS: ~120 lines ported for the settings-specific styles
- Most complex tabs: SecurityTab (password form + sessions + login history), BillingTab (plan card + usage + payment + invoice table), TeamRolesTab (member table + invite form + permissions matrix)
- Simplest tabs: NotificationsTab (just toggles), AppearanceTab (radio cards + swatches + toggles)
