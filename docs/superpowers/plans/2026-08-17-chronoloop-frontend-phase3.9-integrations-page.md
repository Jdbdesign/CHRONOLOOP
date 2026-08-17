# Phase 3.9 — Integrations Page Implementation Plan

**Goal:** Port the Integrations page (`renderIntegrationsPage` and all its sub-renderers, Connect modal, Manage modal, New API Key modal) from the legacy `index.html` into the React/TS rewrite, with pixel/behavior parity.

**Architecture:** The Integrations page is the most complex page in the app — a 2-column layout (main content + right sidebar) with a rich catalogue of 12 apps, category filtering, search, 2 large modals (Connect and Manage), and 4 sidebar panels (Activity, API Keys, API Usage, Webhooks). A separate Sync Settings panel lives below the catalogue. Data is static (`INT_APPS`, `INT_APP_DATA`, `INT_ACTIVITY`, `INT_KEYS`, `INT_USAGE`, `INT_WEBHOOKS`, `INT_SYNC_ROWS`) with local mutations for toggles/deletes.

**Tech Stack:** Vite, React 18, TypeScript, Zustand (for integration state with toggle/delete mutations), existing `Modal` primitive, `Button`, Vitest + Testing Library, `lucide-react` icons.

**Source of truth:** `index.html` lines 9465–10054, HTML 3705–3831, CSS 1581–1690+.

---

## Global Constraints

- **CSS ports verbatim** from cited ranges.
- **Modals:** Connect modal and Manage modal are both large, multi-section dialogs. Use the existing `Modal` primitive. The Manage modal has tabbed content (Connection Details, Usage Stats, Configuration, Sync Log, Danger Zone) — implement as tab state within the modal body.
- **Webhooks and Sync toggles mutate local state** — webhook enable/disable and deletion, sync rule toggles — these should live in a `integrationsStore` so state persists within the session.
- **"New API Key" button opens a modal** with form fields (key name, permission scope, expiration, rate limit, IP whitelist). On submit → shows toast + adds key to list.

---

## Flags for Product Owner

1. **All data is static/hardcoded** — `INT_APPS`, `INT_APP_DATA`, etc. are self-contained mock data unrelated to the task/project/sprint stores. Same category as the Reports page placeholder data. Preserve as-is, log as known limitation.

2. **Connect modal "Authorize & Connect" button just shows a toast and changes app status to 'connected'** — no real OAuth flow. Parity behavior.

3. **Manage modal "Disconnect" button (Danger Zone) shows a toast and changes status to 'available'** — no real disconnection. Parity.

4. **API Key "Copy" button uses `navigator.clipboard.writeText`** — this works in secure contexts (HTTPS/localhost). On HTTP it would fail silently. Acceptable for dev?

5. **Webhook toggles and deletions mutate local state** — in the original, these directly mutate the `INT_WEBHOOKS` array and re-render. In React, this means a Zustand store with `toggleWebhook(index)` and `removeWebhook(index)` actions. Same for `INT_SYNC_ROWS` toggle. These mutations persist only within the session (page refresh resets them). Acceptable?

6. **Category filter tabs include "Analytics" and "Storage"** which only have 1 app each (Datadog, Google Drive/Dropbox). The original shows these as separate categories. Preserve as-is?

---

## File Structure

```
src/data/mockIntegrations.ts                          — INT_APPS, INT_APP_DATA, INT_ACTIVITY, INT_KEYS, INT_USAGE, INT_WEBHOOKS, INT_SYNC_ROWS + types
src/store/integrationsStore.ts                        — app statuses, webhooks, sync rules, API keys (with mutations)
src/store/integrationsStore.test.ts

src/components/integrations/IntPageHeader.tsx           (+ .test.tsx, + .module.css)
src/components/integrations/IntKpiGrid.tsx              (+ .test.tsx, + .module.css)
src/components/integrations/IntAppCard.tsx              (+ .test.tsx, + .module.css)
src/components/integrations/IntAppCatalogue.tsx         (+ .test.tsx)
src/components/integrations/IntSyncSettings.tsx         (+ .test.tsx, + .module.css)
src/components/integrations/IntActivityPanel.tsx        (+ .test.tsx, + .module.css)
src/components/integrations/IntApiKeysPanel.tsx         (+ .test.tsx, + .module.css)
src/components/integrations/IntUsagePanel.tsx           (+ .test.tsx, + .module.css)
src/components/integrations/IntWebhooksPanel.tsx        (+ .test.tsx, + .module.css)
src/components/integrations/modals/ConnectModal.tsx     (+ .test.tsx, + .module.css)
src/components/integrations/modals/ManageModal.tsx      (+ .test.tsx, + .module.css)
src/components/integrations/modals/NewApiKeyModal.tsx   (+ .test.tsx)

src/pages/IntegrationsPage.tsx                        — MODIFIED: replaces stub
```

---

## Task Breakdown

### Task 1: Integrations data layer + store

**Files:** `src/data/mockIntegrations.ts`, `src/store/integrationsStore.ts`, `src/store/integrationsStore.test.ts`

**Details:**
- Types: `IntApp`, `IntAppData`, `IntFeature`, `IntStep`, `IntConfig`, `IntSyncLogEntry`, `IntActivityItem`, `IntApiKey`, `IntUsageRow`, `IntWebhook`, `IntSyncRule`
- `INT_APPS` (12 apps), `INT_APP_DATA` (rich per-app data for 12 apps), `INT_ACTIVITY` (8 items), `INT_KEYS` (3 items), `INT_USAGE` (6 items), `INT_WEBHOOKS` (4 items), `INT_SYNC_ROWS` (6 items)
- Store: `useIntegrationsStore` with `apps`, `webhooks`, `syncRules`, `apiKeys` + actions: `connectApp(id)`, `disconnectApp(id)`, `toggleWebhook(index)`, `removeWebhook(index)`, `toggleSyncRule(index)`, `addApiKey(input)`

---

### Task 2: IntPageHeader + IntKpiGrid

**Files:** Header + KPI components

**Header:** Breadcrumb, heading, "API Docs" button (toast), "New API Key" button (opens modal)
**KPI Grid:** 4 cards (Connected Apps, API Calls Today, Active Webhooks, Sync Errors) — computed live from store

---

### Task 3: IntAppCard + IntAppCatalogue

**Files:** Card + catalogue container with category tabs + search

**Card:** Logo emoji, status badge, name, category, description, footer (sync time or "Not connected"), action button (Connect/Manage/Fix Auth)
**Catalogue:** Panel with title/subtitle, search input, category filter tabs (All + 6 categories), card grid, empty state

---

### Task 4: IntSyncSettings + Sidebar panels (Activity, API Keys, Usage, Webhooks)

**Files:** 5 panel components

**Sync Settings:** Toggle rows for 6 sync rules — toggles mutate store
**Activity:** 8 activity items with dot + bold app name + text + time
**API Keys:** 3 key rows with label, scope/dates, masked value, copy/revoke buttons
**Usage:** Total count + per-app progress bars
**Webhooks:** 4 rows with status dot, URL, event type, toggle, delete button; "Add Webhook" button (toast)

---

### Task 5: ConnectModal

**Files:** `src/components/integrations/modals/ConnectModal.tsx` (+ test, + module.css)

**Behavior:** Multi-section modal showing app features (3 items with icons), "How it works" steps (3 numbered items), permissions list, requirements list. Footer: Cancel + "Authorize & Connect" button → toast + `connectApp(id)`

---

### Task 6: ManageModal

**Files:** `src/components/integrations/modals/ManageModal.tsx` (+ test, + module.css)

**Behavior:** Tabbed modal with 5 sections:
- Connection Details: info grid (workspace, connected by, date, last sync) + 3 stat cards
- Usage Stats: (reuse usage data display)
- Configuration: per-app config rows (text inputs, selects, toggles) — changes show toast
- Sync Log: recent sync events list
- Danger Zone: disconnect button → toast + `disconnectApp(id)` + close modal

---

### Task 7: NewApiKeyModal

**Files:** `src/components/integrations/modals/NewApiKeyModal.tsx` (+ test)

**Behavior:** Form: key name (required), permission scope (radio: Full Access / Read Only / Write Only), expiration (date input), rate limit (number), IP whitelist (text). Submit → toast + `addApiKey(input)` + close.

---

### Task 8: Assemble IntegrationsPage

**Files:** `src/pages/IntegrationsPage.tsx` (replaces stub)

**Layout:** 2-column grid (`1fr 320px`):
- Left: Header → KPI Grid → App Catalogue panel → Sync Settings panel
- Right: Activity panel → API Keys panel → Usage panel → Webhooks panel
- Modals: Connect, Manage, NewApiKey (conditional renders)

---

### Task 9: Final verification

- `pnpm test`, `pnpm typecheck`, `pnpm lint`
- Own `pnpm dev` walkthrough: all cards render, category filter works, search works, Connect modal opens with correct per-app data, Manage modal shows tabs and disconnect, webhooks toggle/delete, sync toggles, API key copy/revoke, New API Key modal
- Commit and report

---

## Dependencies on Prior Phases

| Dependency | Source | Used By |
|---|---|---|
| `Modal` primitive | Phase 2 | All 3 modals |
| `Button` primitive | Phase 2 | Header, modal buttons |
| `useToastStore` | Phase 3.2 | All decorative actions |

---

## Estimated Scope

- ~13 new component files (+ tests + CSS modules)
- 2 new data/store files
- 1 modified file (IntegrationsPage.tsx)
- CSS: ~200+ lines ported
- Most complex components: ConnectModal and ManageModal (large multi-section modals with per-app dynamic content)
- Most data: `INT_APP_DATA` has ~250 lines of per-app rich content for 12 apps
