# Phase 3.7 — Team Page Implementation Plan

**Goal:** Port the Team page (`renderTeamPage` and everything it composes — KPI grid, department tabs, member cards with grid/list toggle, workload distribution panel, activity feed, performance leaderboard, member detail panel, invite modal, member profile modal, context menu, sort/filter dropdowns) from the legacy `index.html` into the React/TS rewrite at `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`, with pixel/behavior parity.

**Architecture:** The Team page is self-contained with its own domain data (`TEAM_MEMBERS`, 8 members). A `teamStore` holds the member list. The page manages local view state: active department filter, sort mode, search query, grid/list toggle. Three sub-panels (Workload Distribution, Team Activity, Performance Leaderboard) render below the member grid. A slide-in detail panel (same pattern as `ProjectDetailPanel`/`SprintDetailPanel`) shows full member profile. Two modals: Invite Teammates and Member Profile (quick-view).

**Tech Stack:** Vite, React 18, TypeScript, Zustand, Radix Dialog (for modals via existing `Modal` primitive), existing `Dropdown` primitive for sort/filter/context, Vitest + Testing Library, `lucide-react` icons.

**Source of truth:** `index.html` in the sibling `Chronoloop dashboard` repo. Line ranges cited below pinned to the file as read on 2026-08-15.

---

## Global Constraints

- Re-architecture, not redesign: pixel/behavior parity with `index.html`.
- **CSS ports verbatim** from cited line ranges (1352–1490).
- **Detail panel:** slide-in fixed overlay+panel — follow `ProjectDetailPanel.tsx` / `SprintDetailPanel.tsx` as the template: `inert`-via-ref+`useEffect`, click-blocking overlay, Escape-closes, `prevOpenId`/`lastId` state pair for keeping content visible during close animation.
- **Modals:** use existing `Modal` primitive with key-based session-counter reset on close.
- **Member avatars:** initials-on-gradient circles (same as Sprint avatars) — `<Avatar name={initials} fallbackStyle={{ background: \`linear-gradient(135deg, ${color}, ${color}88)\` }} />` — no `src` prop, no real images.
- **Card context menu:** use existing `Dropdown` primitive, follows same pattern as project/sprint card menus.
- **Sort/Filter dropdowns:** use existing `Dropdown` primitive. Filter dropdown is decorative (checkboxes never actually filter the list — the only real filter is the department tabs). Sort is functional (name, completion, tasks, velocity).
- **KPI grid:** reuse `StatCard` component (Phase 3.1) — 5 cards with computed live values from the team store.
- **Grid/List toggle:** same pattern as Projects page — grid view uses `grid-template-columns: repeat(auto-fill, minmax(256px, 1fr))`, list view uses `grid-template-columns: 1fr`.
- **View button icons:** Grid = `layout-grid`, List = `list`.
- **Search:** filters by name, role, or department (case-insensitive, client-side).
- **Card click → detail panel.** Card menu button click → context dropdown. Footer "Message" → toast. Footer "Profile" → detail panel.
- **"Add Member" button → Invite modal.** `calSaveEvent`-style: validates email required, shows success toast, closes modal. Does NOT actually add a member to the store (matches original — `modal-invite`'s submit handler just shows a toast).
- **Member Profile modal** (quick-view from detail panel's "Quick View" button): shows avatar, name, role, email, active tasks count, 92% completion (hardcoded in original).

---

## Flags for Product Owner

1. **Filter dropdown is entirely decorative** — the original's Apply/Clear buttons show toasts ("Filters applied" / "Team filters cleared") but never actually filter the member list. Only the department tabs and search perform real filtering. Preserving this as-is (same as Projects/Sprints filter dropdown pattern from earlier phases).

2. **"Message" buttons everywhere show a toast ("Opening message composer…") but do nothing else** — matches original exactly. No message composer exists.

3. **Member Profile modal hardcodes "92%" completion** regardless of which member is viewed (`index.html:5850`) — the original never reads `m.completion` for this modal's completion cell. Preserving as literal parity.

4. **Context menu "Remove from Team" shows a toast but doesn't actually remove** — matches original. No destructive mutation.

5. **Activity feed shows first 8 activities from all members unsorted** — the original collects all members' activities in declaration order, flattens them, and takes `.slice(0,8)` (`index.html:8837-8839`). This means the feed order depends on `TEAM_MEMBERS` array order, not on timestamp. Preserving as-is.

6. **Workload Distribution legend dots use `border-radius: 2px`** (rounded squares, not circles) — matches the original's `.tm-workload-legend-dot` CSS. Not a bug.

---

## File Structure

```
src/types/teamMember.ts                              — TeamMember, TeamActivity, TeamProject types
src/data/mockTeamMembers.ts                          — TEAM_MEMBERS (8 items, byte-verified)
src/store/teamStore.ts                               — members list (read-only for now)
src/store/teamStore.test.ts
src/store/teamDetailStore.ts                         — openMemberId/open/close
src/store/teamDetailStore.test.ts

src/components/team/TeamPageHeader.tsx                 (+ .test.tsx, + .module.css)
src/components/team/TeamKpiGrid.tsx                    (+ .test.tsx, + .module.css)
src/components/team/TeamDeptTabs.tsx                   (+ .test.tsx, + .module.css)
src/components/team/TeamMemberCard.tsx                 (+ .test.tsx, + .module.css)
src/components/team/TeamMemberGrid.tsx                 (+ .test.tsx)
src/components/team/TeamWorkloadPanel.tsx              (+ .test.tsx, + .module.css)
src/components/team/TeamActivityFeed.tsx               (+ .test.tsx, + .module.css)
src/components/team/TeamPerfLeaderboard.tsx            (+ .test.tsx, + .module.css)
src/components/team/TeamDetailPanel.tsx                (+ .test.tsx, + .module.css)
src/components/team/modals/InviteModal.tsx             (+ .test.tsx)
src/components/team/modals/MemberProfileModal.tsx     (+ .test.tsx)

src/pages/TeamPage.tsx                               — MODIFIED: replaces stub
```

---

## Task Breakdown

### Task 1: Team data layer — types, mock data, stores

**Files:** `src/types/teamMember.ts`, `src/data/mockTeamMembers.ts`, `src/store/teamStore.ts`, `src/store/teamStore.test.ts`, `src/store/teamDetailStore.ts`, `src/store/teamDetailStore.test.ts`

**Details:**
- `TeamMember` interface: `id, name, initials, role, dept, email, color, online, activeTasks, completedTasks, velocity, completion, todoTasks, inProgressTasks, projects: TeamProject[], timezone, joinDate, location, activity: TeamActivity[]`
- `TeamProject`: `{ name: string; color: string }`
- `TeamActivity`: `{ text: string; time: string; dot: string }`
- `TEAM_MEMBERS`: 8 items byte-verified from `index.html:8540-8637`
- `useTeamStore`: `{ members: TeamMember[] }` (read-only, seeded with mock data)
- `useTeamDetailStore`: `{ openMemberId: string | null; open(id): void; close(): void }`

---

### Task 2: TeamPageHeader (breadcrumb, heading, search, sort/filter/add buttons)

**Files:** `src/components/team/TeamPageHeader.tsx` (+ test, + module.css)

**Behavior (from `index.html:3504-3529`):**
- Breadcrumb "Overview / Team", heading "Team"
- Search input (200px max-width), Filter button (decorative dropdown), Sort button (functional dropdown), "Add Member" button (opens Invite modal)
- Sort dropdown: Name A-Z (default), Completion Rate, Active Tasks, Velocity
- Filter dropdown: Status (Online/Offline checkboxes) + Department (Dev/Design/Mgmt/Mktg checkboxes) + Clear/Apply buttons — all decorative (toast only)

---

### Task 3: TeamKpiGrid (5 stat cards)

**Files:** `src/components/team/TeamKpiGrid.tsx` (+ test, + module.css)

**Behavior (from `index.html:8674-8713`):**
- 5 cards in a row: Total Members, Active Now (green), Offline (muted), Avg Completion (teal), Avg Velocity (purple)
- Computed live from `teamStore.members`
- Reuse `StatCard` component with `iconBackground` prop

---

### Task 4: TeamDeptTabs (department filter tabs + grid/list view toggle)

**Files:** `src/components/team/TeamDeptTabs.tsx` (+ test, + module.css)

**Behavior (from `index.html:3533-3540` + `:8715-8728`):**
- Tab bar: All Members (count), Development (count), Design (count), Management (count), Marketing (count)
- Active tab → blue bg, white text; inactive → muted with count badge
- Grid/List toggle buttons (same pattern as Projects view toggle)

---

### Task 5: TeamMemberCard

**Files:** `src/components/team/TeamMemberCard.tsx` (+ test, + module.css)

**Behavior (from `index.html:8746-8798`):**
- Card: colored accent strip (3px top), avatar with online dot, name, role, dept badge, email, 3 stat cells (Active Tasks, Completed, Velocity), completion progress bar, footer (Message + Profile buttons)
- Card click → open detail panel (unless menu/button clicked)
- Menu button (more-horizontal icon) → context dropdown (visible on hover only)
- Context menu: View Profile, Send Message, Assign Task, divider, Remove from Team

---

### Task 6: TeamMemberGrid (cards container + empty state)

**Files:** `src/components/team/TeamMemberGrid.tsx` (+ test)

**Behavior:**
- Renders filtered/sorted members as `TeamMemberCard` instances
- Grid layout: `repeat(auto-fill, minmax(256px, 1fr))` in grid view, `1fr` in list view
- Empty state: "No members found / Try a different search or filter"

---

### Task 7: TeamWorkloadPanel

**Files:** `src/components/team/TeamWorkloadPanel.tsx` (+ test, + module.css)

**Behavior (from `index.html:8816-8835` + `:3549-3567`):**
- Panel with title "Workload Distribution" + legend (Completed/In Progress/To Do with colored dots)
- Per-member row: avatar, first name, stacked horizontal bar (completed%/inProgress%/todo%), total count
- Bar widths computed from `completedTasks / total`, `inProgressTasks / total`, remainder

---

### Task 8: TeamActivityFeed + TeamPerfLeaderboard

**Files:** `src/components/team/TeamActivityFeed.tsx` (+ test, + module.css), `src/components/team/TeamPerfLeaderboard.tsx` (+ test, + module.css)

**Behavior (from `index.html:8837-8858` + `:3569-3582`):**
- Two panels side by side (2-column grid)
- Activity Feed: title "Team Activity" + "Today" dropdown (decorative), first 8 activity items with avatar + text + time
- Performance Leaderboard: title + "This Sprint" dropdown (decorative), members sorted by completion descending, rank + avatar + name + bar + percentage

---

### Task 9: TeamDetailPanel (slide-in member profile)

**Files:** `src/components/team/TeamDetailPanel.tsx` (+ test, + module.css)

**Behavior (from `index.html:6148-6165` + `openMemberDetail` at `:8861-8976`):**
- Fixed right-side panel (440px), overlay + slide-in transition
- Header: "Member Profile" + Quick View button + Close button
- Body: hero (avatar + name + role/dept + online status), Performance section (3 stat cells), Completion Rate (progress bar), Task Breakdown (3 horizontal bars: Completed/In Progress/To Do), Contact & Info (email, timezone, location, joined — 2×2 grid), Projects list, Recent Activity
- Footer: Message button + Assign Task button
- Quick View button → opens Member Profile modal
- Assign Task button → closes detail panel + opens Add Task modal (if it exists; otherwise toast)
- Escape closes, overlay click closes

---

### Task 10: InviteModal + MemberProfileModal

**Files:** `src/components/team/modals/InviteModal.tsx` (+ test), `src/components/team/modals/MemberProfileModal.tsx` (+ test)

**Invite modal (from `index.html:5797-5832`):**
- Title "Invite Teammates", subtitle "Add people to your workspace"
- Form: Email (required), Role (select: Developer/Designer/Manager/Viewer), Personal Message (optional textarea)
- Submit → validates email, shows toast "Invite sent!", closes modal
- Cancel closes

**Member Profile modal (from `index.html:5836-5865`):**
- Centered, narrower (360px max-width)
- Avatar (initials on gradient), name, role, email, 2-cell grid (Active Tasks from member data, 92% Completion hardcoded)
- Footer: Close + Message (toast)

---

### Task 11: Assemble TeamPage

**Files:** `src/pages/TeamPage.tsx` (replaces stub)

**Behavior:**
- Reads from `teamStore`, manages local state: `activeFilter` (dept tab), `sortMode`, `searchQuery`, `view` (grid/list), `isInviteOpen`, `isMemberProfileOpen` + `profileMemberId`
- Computes filtered/sorted list from store
- Renders: Header → KPI Grid → Dept Tabs + View Toggle → Member Grid → Workload Panel → Activity + Leaderboard (2-col) → Detail Panel (conditional) → Invite Modal → Member Profile Modal

---

### Task 12: Final verification

- Run `pnpm test`, `pnpm lint`, `pnpm typecheck`
- Do own `pnpm dev` walkthrough: check every view state, card click, menu, detail panel, modals, filters, sort, search, grid/list toggle
- Commit and report

---

## Dependencies on Prior Phases

| Dependency | Source | Used By |
|---|---|---|
| `StatCard` component | Phase 3.1 | `TeamKpiGrid` |
| `Modal` primitive | Phase 2 | `InviteModal`, `MemberProfileModal` |
| `Button` primitive | Phase 2 | All buttons |
| `Dropdown` primitive | Phase 2 | Sort, Filter, Context menu |
| `Avatar` component | Phase 2 | All member avatars |
| `useToastStore` | Phase 3.2 | Toast messages on decorative actions |
| Add Task modal (optional) | Phase 3.2 | Detail panel "Assign Task" button |

---

## Estimated Scope

- ~12 new component files (+ tests + CSS modules)
- ~4 new support files (types, mock data, 2 stores + tests)
- 1 modified file (`TeamPage.tsx` stub → full page)
- CSS: ~140 lines ported verbatim
- Most complex component: `TeamDetailPanel` (slide-in with 7 content sections)
- Most complex interaction: card grid with filter/sort/search + context menu + detail panel + 2 modals
