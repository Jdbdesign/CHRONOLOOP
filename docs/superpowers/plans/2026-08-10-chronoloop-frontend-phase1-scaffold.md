# ChronoLoop Frontend Rewrite — Phase 1 (Scaffold) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new `CHRONOLOOP-frontend` project — Vite + React 18 + TypeScript, linting, a working test harness, the design-token system ported verbatim, and a working AppShell (Sidebar + TopBar + routing to all 9 nav items as empty page stubs), wrapped in a top-level error boundary.

**Architecture:** Fresh sibling project at `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`, own git repo, pnpm. The old `Chronoloop dashboard\index.html` is not touched — it stays running as the visual reference. This phase produces no page content, no mock data, no Radix primitives — those are Phase 2+. It produces the shell everything else will be built inside.

**Tech Stack:** Vite, React 18, TypeScript (strict), React Router, Zustand, CSS Modules over a ported `:root` token system, lucide-react, Vitest + React Testing Library.

## Global Constraints

- **Location:** new project lives at `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`, its own `git init`. Never modify `C:\Users\HP\Downloads\Chronoloop dashboard\`.
- **Package manager:** pnpm (per design doc §5). If `pnpm` is not on PATH, install it with `npm install -g pnpm` — do not use `corepack enable`, which requires writing to `C:\Program Files\nodejs` and fails with `EPERM` without admin rights on this machine.
- **React version:** React 18, not whatever the Vite template defaults to. Pin explicitly (Task 1) — do not assume the scaffolded `package.json` is already correct.
- **TypeScript strict mode, no `any`.** If an `any` is truly unavoidable, it must carry a comment explaining why. Enforced via `tsconfig` strict flags (already default in the Vite `react-ts` template — verified, not reconfigured) and an ESLint rule that errors on `any`.
- **Accessibility by default:** semantic HTML, ARIA on custom components, full keyboard nav, visible focus states matching the current `:focus-visible` styling: `outline: 2px solid var(--accent-blue); outline-offset: 2px; border-radius: 4px;`.
- **Pixel/behavior parity with `index.html`:** every color, spacing value, radius, and animation timing ported in this phase is copied exactly from the current `:root` / `[data-theme="light"]` blocks and component CSS — no rounding, no substituting a "close enough" value.
- **No backend, no mock data yet** — this phase is chrome only.
- **Verification gate for the whole phase:** `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass, and `pnpm dev` shows a working sidebar + topbar + routable page stubs that visually match `index.html`'s chrome.

---

### Task 1: Project scaffold, pinned to React 18, with Phase 1 runtime dependencies installed

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\` (entire Vite `react-ts` scaffold)

**Interfaces:**
- Produces: a working `pnpm dev` Vite dev server, React 18 pinned, `react-router-dom`, `zustand`, and `lucide-react` installed as dependencies, ready for later tasks to import from.

- [ ] **Step 1: Confirm pnpm is usable**

Run: `pnpm --version`
If it errors with "command not found": run `npm install -g pnpm`, then re-run `pnpm --version` to confirm. Do not use `corepack enable` — it fails with `EPERM` on this machine.

- [ ] **Step 2: Scaffold the Vite React+TS template**

Run (from `C:\Users\HP\Downloads\`):
```
pnpm create vite@latest CHRONOLOOP-frontend -- --template react-ts
cd C:\Users\HP\Downloads\CHRONOLOOP-frontend
pnpm install
```

- [ ] **Step 3: Pin React to v18**

Run:
```
pnpm add react@^18.3.0 react-dom@^18.3.0
pnpm add -D @types/react@^18.3.0 @types/react-dom@^18.3.0
```
Open `package.json` and confirm `react`/`react-dom` read `^18.x` (not `^19.x`).

- [ ] **Step 4: Install Phase 1 runtime dependencies**

Run:
```
pnpm add react-router-dom zustand lucide-react
```

- [ ] **Step 5: Verify tsconfig is strict**

Open `tsconfig.app.json` and confirm `"strict": true` is present under `compilerOptions` (the Vite `react-ts` template sets this by default). If missing, add it.

- [ ] **Step 6: Verify the dev server runs**

Run: `pnpm dev` (then stop it — this step is a manual visual check that the default Vite+React starter page loads at `http://localhost:5173`).

- [ ] **Step 7: git init and initial commit**

Run:
```
git init
git add -A
git commit -m "chore: scaffold Vite + React 18 + TypeScript project"
```

---

### Task 2: ESLint + Prettier

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\eslint.config.js`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\.prettierrc.json`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\.prettierignore`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\package.json` (scripts)

**Interfaces:**
- Consumes: nothing from Task 1 beyond the scaffolded project.
- Produces: `pnpm lint` and `pnpm format` scripts; an ESLint rule that errors on `any`, enforcing the Global Constraint.

- [ ] **Step 1: Install Prettier and the ESLint/Prettier bridge**

Run: `pnpm add -D prettier eslint-config-prettier`

- [ ] **Step 2: Overwrite `eslint.config.js` with the final configuration**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  eslintConfigPrettier,
)
```

- [ ] **Step 3: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 4: Create `.prettierignore`**

```
dist
pnpm-lock.yaml
```

- [ ] **Step 5: Add `lint` and `format` scripts to `package.json`**

Add to the `"scripts"` object:
```json
"lint": "eslint .",
"format": "prettier --write ."
```

- [ ] **Step 6: Verify lint passes on the current scaffold**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add eslint.config.js .prettierrc.json .prettierignore package.json pnpm-lock.yaml
git commit -m "chore: configure ESLint and Prettier, enforce no-explicit-any"
```

---

### Task 3: Vitest + React Testing Library harness

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\vite.config.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\test\setup.ts`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\App.test.tsx` (create — tests the default scaffolded `App.tsx` counter, which Task 10 will later replace along with this test)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\package.json` (scripts)

**Interfaces:**
- Produces: `pnpm test` (runs once) and `pnpm test:watch` scripts; `src/test/setup.ts` imported by every future test file's global config (via Vitest, not per-file imports).

- [ ] **Step 1: Install test dependencies**

Run: `pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
})
```

- [ ] **Step 3: Create the test setup file**

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Write the harness smoke test against the default scaffolded `App.tsx`**

```tsx
// src/App.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App (Vitest/RTL harness smoke test)', () => {
  it('renders and responds to a user interaction', async () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is/i })
    expect(button).toHaveTextContent('count is 0')

    await userEvent.click(button)

    expect(button).toHaveTextContent('count is 1')
  })
})
```

- [ ] **Step 5: Run it to verify it fails before setup, then passes**

Run: `pnpm vitest run` before Step 2/3 exist would fail with "no test found" / config errors — this is just documented for reviewers; in practice do Steps 2-4 together, then run:
Run: `pnpm vitest run`
Expected: PASS, 1 test.

- [ ] **Step 6: Add `test` and `test:watch` scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts src/test/setup.ts src/App.test.tsx package.json pnpm-lock.yaml
git commit -m "test: add Vitest + React Testing Library harness with smoke test"
```

---

### Task 4: Design tokens — `tokens.css` and `global.css` ported verbatim

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\styles\tokens.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\styles\global.css`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\index.html` (font links + title)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\main.tsx` (import the two stylesheets)

**Interfaces:**
- Consumes: nothing.
- Produces: every CSS custom property later tasks reference (`--bg-base`, `--text-primary`, `--accent-blue`, etc.), and the `[data-theme="light"|"dark"]` attribute contract that `themeStore` (Task 5) will set on `<html>`.

- [ ] **Step 1: Create `src/styles/tokens.css`, copied verbatim from `index.html`'s `:root` and `[data-theme="light"]` blocks**

```css
:root {
  --bg-base: #1a1a1a;
  --bg-sidebar: #111111;
  --bg-card: #242424;
  --bg-card-hover: #2c2c2c;
  --bg-input: #1e1e1e;
  --border-subtle: #2e2e2e;
  --border-default: #3a3a3a;
  --text-primary: #f0f0f0;
  --text-secondary: #9a9a9a;
  --text-muted: #666666;
  --accent-blue: #4A90FF;
  --accent-blue-bg: #1a2f52;
  --accent-teal: #00D4AA;
  --accent-orange: #FF8C42;
  --accent-red: #FF4D4D;
  --accent-green: #22C55E;
  --accent-purple: #A855F7;
  --accent-cyan: #06B6D4;
  --accent-yellow: #EAB308;
  --accent-magenta: #EC4899;
  --nav-active-bg: #2a4a8a;
  --nav-active-text: #ffffff;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="light"] {
  --bg-base: #f5f5f5;
  --bg-sidebar: #ffffff;
  --bg-card: #ffffff;
  --bg-card-hover: #f0f0f0;
  --bg-input: #f5f5f5;
  --border-subtle: #e5e5e5;
  --border-default: #d0d0d0;
  --text-primary: #111111;
  --text-secondary: #555555;
  --text-muted: #999999;
  --accent-blue-bg: #dbeafe;
}
```

- [ ] **Step 2: Create `src/styles/global.css`, copied verbatim from `index.html`'s base reset/body rules**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:focus-visible {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
  border-radius: 4px;
}

:focus:not(:focus-visible) {
  outline: none;
}

html, body {
  height: 100%;
  overflow: hidden;
}

#root {
  height: 100%;
}

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg-base);
  color: var(--text-primary);
  font-size: 13px;
  transition: background var(--duration-normal) var(--ease-out), color var(--duration-normal) var(--ease-out);
}
```

Note: `#root { height: 100% }` is a necessary addition (the original had no SPA mount div) so the grid layout in Task 9 can fill the viewport — this is required plumbing, not a design deviation.

- [ ] **Step 3: Update `index.html`'s `<head>` to match the original's font imports and title**

Replace the `<head>` contents with:
```html
<meta charset="UTF-8" />
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ChronoLoop Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Import both stylesheets in `src/main.tsx`, tokens before global**

At the top of `src/main.tsx`, add:
```ts
import './styles/tokens.css'
import './styles/global.css'
```

- [ ] **Step 5: Verify visually**

Run: `pnpm dev`, open the browser. Expected: dark background (`#1a1a1a`), light text, no visible layout yet (App.tsx is still the default counter at this point).

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/global.css index.html src/main.tsx
git commit -m "feat: port design tokens and global styles verbatim from index.html"
```

---

### Task 5: Zustand `themeStore` + DOM sync hook

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\themeStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\themeStore.test.tsx`

**Interfaces:**
- Produces: `useThemeStore` (Zustand hook exposing `{ theme: 'dark' | 'light', setTheme: (theme) => void }`) and `useThemeSync()` (a hook that must be called once near the app root — Task 10 will call it in `App.tsx` — which keeps `document.documentElement`'s `data-theme` attribute in sync with the store).

**Behavior flag (do not silently resolve):** `index.html`'s `setTheme()` (line 6386) does **not** persist the choice to `localStorage` — it defaults to `data-theme="dark"` on every full page load and only holds state in memory for the session. This store intentionally matches that: no `localStorage`/`persist` middleware. If the product owner wants persistence across reloads, that's a deliberate behavior change beyond parity and should be called out to them explicitly, not added quietly here.

- [ ] **Step 1: Write the failing test**

```tsx
// src/store/themeStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThemeStore, useThemeSync } from './themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'dark' })
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to dark theme', () => {
    const { result } = renderHook(() => useThemeStore((state) => state.theme))
    expect(result.current).toBe('dark')
  })

  it('updates theme state via setTheme', () => {
    const { result } = renderHook(() => useThemeStore((state) => state))
    act(() => result.current.setTheme('light'))
    expect(result.current.theme).toBe('light')
  })

  it('useThemeSync writes the current theme onto <html data-theme>', () => {
    renderHook(() => useThemeSync())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    act(() => useThemeStore.getState().setTheme('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/store/themeStore.test.tsx`
Expected: FAIL with "Cannot find module './themeStore'"

- [ ] **Step 3: Implement `themeStore.ts`**

```ts
// src/store/themeStore.ts
import { create } from 'zustand'
import { useEffect } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}))

export function useThemeSync(): void {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/store/themeStore.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/themeStore.ts src/store/themeStore.test.tsx
git commit -m "feat: add themeStore with DOM sync, no persistence (matches index.html parity)"
```

---

### Task 6: `ErrorBoundary`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\common\ErrorBoundary.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\common\ErrorBoundary.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\common\ErrorBoundary.test.tsx`

**Interfaces:**
- Produces: `<ErrorBoundary>` component (class component — React error boundaries require `componentDidCatch`, which hooks cannot provide) accepting `children: ReactNode` and rendering a fallback UI on unhandled render errors. Task 10 wraps the whole app in this at the top level, per the product owner's explicit Phase 1 requirement.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/common/ErrorBoundary.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>safe content</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('safe content')).toBeInTheDocument()
  })

  it('renders a fallback UI instead of crashing when a child throws', () => {
    // React logs the caught error to console.error; suppress that noise for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/common/ErrorBoundary.test.tsx`
Expected: FAIL with "Cannot find module './ErrorBoundary'"

- [ ] **Step 3: Implement `ErrorBoundary.module.css`**

```css
.fallback {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  height: 100vh;
  padding: 48px;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: 'DM Sans', sans-serif;
}

.heading {
  font-family: 'Syne', sans-serif;
  font-weight: 600;
  font-size: 22px;
}

.message {
  color: var(--text-secondary);
  font-size: 13px;
}

.reloadButton {
  height: 36px;
  padding: 0 16px;
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: opacity var(--duration-fast);
}

.reloadButton:hover {
  opacity: 0.88;
}
```

- [ ] **Step 4: Implement `ErrorBoundary.tsx`**

```tsx
// src/components/common/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ChronoLoop encountered an unhandled error:', error, errorInfo)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback}>
          <h1 className={styles.heading}>Something went wrong</h1>
          <p className={styles.message}>
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <button type="button" className={styles.reloadButton} onClick={this.handleReload}>
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/common/ErrorBoundary.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/ErrorBoundary.tsx src/components/common/ErrorBoundary.module.css src/components/common/ErrorBoundary.test.tsx
git commit -m "feat: add top-level ErrorBoundary with fallback UI"
```

---

### Task 7: `BrandLogo` + `Sidebar`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\BrandLogo.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\Sidebar.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\Sidebar.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useThemeStore` from Task 5.
- Produces: `<Sidebar />`, rendered by `AppShell` in Task 9. Nine `NavLink`s to `/`, `/tasks`, `/projects`, `/sprints`, `/team`, `/reports`, `/calendar`, `/integrations`, `/settings` — these paths are the contract Task 8's `App.tsx` routes must match exactly.

**Behavior flag:** the original sidebar nav label for the Integration/Integrations page reads **"Integration"** (singular — see `index.html:3001-3003`), while every other part of the design doc and the folder structure calls it "Integrations" (plural). This is preserved as literal parity below (`label: 'Integration'`) rather than silently "fixed" to match the plural naming used elsewhere — flag this to the product owner as a possible original typo when Phase 1 is reviewed.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/Sidebar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useThemeStore } from '../../store/themeStore'

describe('Sidebar', () => {
  it('renders all nine nav items with correct labels and hrefs', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    const expected: Array<[string, string]> = [
      ['Dashboard', '/'],
      ['Tasks', '/tasks'],
      ['Projects', '/projects'],
      ['Sprints', '/sprints'],
      ['Team', '/team'],
      ['Reports', '/reports'],
      ['Calendar', '/calendar'],
      ['Integration', '/integrations'],
      ['Settings', '/settings'],
    ]

    for (const [label, href] of expected) {
      const link = screen.getByRole('link', { name: label })
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('marks the current route as active via aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('switches the theme store when a theme toggle button is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /light/i }))
    expect(useThemeStore.getState().theme).toBe('light')

    await userEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(useThemeStore.getState().theme).toBe('dark')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/layout/Sidebar.test.tsx`
Expected: FAIL with "Cannot find module './Sidebar'"

- [ ] **Step 3: Create `BrandLogo.tsx`, the inline SVG copied verbatim from `index.html:2976`**

```tsx
// src/components/layout/BrandLogo.tsx
interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg className={className} width="159" height="76" viewBox="0 0 159 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ChronoLoop" role="img"><g clipPath="url(#clip0_logo_main)"><path d="M26.7075 50.2517C25.4318 50.2517 24.3477 50.0263 23.4638 49.5713C22.5799 49.1206 21.9007 48.4712 21.4348 47.6273C20.9689 46.7835 20.7077 45.7717 20.6511 44.5877C20.638 44.0177 20.6293 43.4036 20.6293 42.7497C20.6293 42.0959 20.638 41.4685 20.6511 40.8676C20.7077 39.6968 20.9689 38.6851 21.4435 37.8368C21.9181 36.9886 22.5973 36.3347 23.4812 35.884C24.3651 35.4334 25.4405 35.2036 26.7032 35.2036C27.6393 35.2036 28.4753 35.3273 29.2155 35.5792C29.9556 35.831 30.587 36.1756 31.1095 36.613C31.6319 37.0504 32.0369 37.5629 32.3242 38.1505C32.6116 38.7337 32.764 39.3699 32.777 40.0547C32.7901 40.1784 32.7509 40.2844 32.6638 40.3684C32.5724 40.4523 32.4679 40.4921 32.346 40.4921H30.391C30.2387 40.4921 30.1167 40.4523 30.0209 40.3772C29.9252 40.3021 29.8555 40.174 29.8163 39.9929C29.5986 39.0739 29.2198 38.4465 28.6843 38.1107C28.1487 37.775 27.4826 37.6071 26.6858 37.6071C25.7671 37.6071 25.0312 37.8678 24.4826 38.3891C23.934 38.9104 23.638 39.772 23.5988 40.9693C23.5596 42.1135 23.5596 43.2843 23.5988 44.4816C23.638 45.6789 23.934 46.5405 24.4826 47.0618C25.0312 47.5831 25.7671 47.8438 26.6858 47.8438C27.4826 47.8438 28.1531 47.6715 28.693 47.3313C29.2372 46.9911 29.6117 46.3682 29.8163 45.4625C29.8555 45.2681 29.9252 45.1355 30.0209 45.0648C30.1167 44.9941 30.2387 44.9588 30.391 44.9588H32.346C32.4679 44.9588 32.5768 44.9986 32.6638 45.0825C32.7509 45.1664 32.7901 45.2725 32.777 45.3962C32.764 46.081 32.6116 46.7128 32.3242 47.3004C32.0369 47.8836 31.6319 48.3961 31.1095 48.8379C30.587 49.2753 29.9556 49.6199 29.2155 49.8717C28.4753 50.1235 27.6393 50.2517 26.7075 50.2517Z" fill="currentColor"/><path d="M35.7291 50.0437C35.5897 50.0437 35.4765 49.9995 35.3807 49.9067C35.285 49.8184 35.2371 49.6947 35.2371 49.54V35.9323C35.2371 35.7777 35.285 35.654 35.3807 35.5568C35.4765 35.4596 35.5941 35.411 35.7291 35.411H37.6056C37.758 35.411 37.8756 35.4596 37.967 35.5568C38.0585 35.654 38.102 35.7777 38.102 35.9323V41.3268H44.1802V35.9323C44.1802 35.7777 44.2281 35.654 44.3239 35.5568C44.4197 35.4596 44.5372 35.411 44.6722 35.411H46.527C46.6794 35.411 46.8013 35.4596 46.8971 35.5568C46.9929 35.654 47.0408 35.7777 47.0408 35.9323V49.54C47.0408 49.6814 46.9929 49.7963 46.8971 49.8935C46.8013 49.9907 46.6794 50.0393 46.527 50.0393H44.6722C44.5329 50.0393 44.4197 49.9907 44.3239 49.8935C44.2281 49.7963 44.1802 49.677 44.1802 49.54V43.9379H38.0976V49.54C38.0976 49.6814 38.0541 49.7963 37.9627 49.8935C37.8712 49.9907 37.7537 50.0393 37.6013 50.0393H35.7291V50.0437Z" fill="currentColor"/><path d="M50.7461 50.0437C50.6068 50.0437 50.4936 49.9951 50.3978 49.8979C50.302 49.8007 50.2541 49.6814 50.2541 49.5445V35.9367C50.2541 35.7821 50.302 35.6584 50.3978 35.5612C50.4936 35.464 50.6111 35.4154 50.7461 35.4154H56.0798C57.743 35.4154 59.0536 35.8042 60.0158 36.5862C60.978 37.3682 61.457 38.5036 61.457 39.9925C61.457 41.022 61.2044 41.8791 60.7037 42.5639C60.203 43.2487 59.5325 43.7435 58.6965 44.0484L61.7052 49.3766C61.7443 49.4605 61.7661 49.5356 61.7661 49.6063C61.7661 49.73 61.7226 49.8361 61.6311 49.92C61.5397 50.0039 61.4439 50.0437 61.3307 50.0437H59.4541C59.219 50.0437 59.0405 49.9818 58.9186 49.8537C58.7967 49.73 58.7009 49.6019 58.6312 49.4782L55.9753 44.5255H53.1103V49.5445C53.1103 49.6858 53.0668 49.8007 52.9754 49.8979C52.8839 49.9951 52.7664 50.0437 52.614 50.0437H50.7461ZM53.1147 42.1618H56.0188C56.8548 42.1618 57.4818 41.9718 57.8954 41.5875C58.309 41.2031 58.5137 40.6641 58.5137 39.966C58.5137 39.268 58.309 38.7246 57.9041 38.3269C57.4992 37.9293 56.8722 37.7305 56.0188 37.7305H53.1147V42.1618Z" fill="currentColor"/><path d="M69.6164 50.2513C68.3929 50.2513 67.3436 50.0437 66.4641 49.6328C65.5846 49.2219 64.8966 48.5857 64.4046 47.7286C63.9083 46.8715 63.6427 45.8023 63.6035 44.5211C63.5904 43.9202 63.5817 43.3282 63.5817 42.745C63.5817 42.1618 63.5904 41.561 63.6035 40.9468C63.6427 39.6789 63.917 38.6185 64.4264 37.7702C64.9358 36.922 65.6325 36.2769 66.5163 35.8484C67.4046 35.4154 68.4365 35.1989 69.6164 35.1989C70.7963 35.1989 71.8326 35.4154 72.7252 35.8484C73.6177 36.2813 74.3187 36.922 74.8282 37.7702C75.3376 38.6185 75.6119 39.6789 75.6511 40.9468C75.6772 41.561 75.6902 42.1574 75.6902 42.745C75.6902 43.3282 75.6772 43.9246 75.6511 44.5211C75.6119 45.8023 75.3419 46.8715 74.8456 47.7286C74.3492 48.5857 73.6613 49.2219 72.7774 49.6328C71.8935 50.0437 70.8399 50.2513 69.6164 50.2513ZM69.6164 47.8479C70.509 47.8479 71.2361 47.5784 71.8021 47.0438C72.3638 46.5092 72.6686 45.6344 72.7077 44.4195C72.7339 43.8054 72.7469 43.2398 72.7469 42.7141C72.7469 42.1928 72.7339 41.6317 72.7077 41.0308C72.6816 40.2223 72.5336 39.564 72.2636 39.0559C71.998 38.5478 71.6367 38.1767 71.1838 37.947C70.731 37.7172 70.2085 37.6024 69.6164 37.6024C69.0417 37.6024 68.5235 37.7172 68.0707 37.947C67.6179 38.1767 67.2565 38.5478 66.9909 39.0559C66.7253 39.564 66.5773 40.2223 66.5468 41.0308C66.5337 41.6317 66.525 42.1928 66.525 42.7141C66.525 43.2354 66.5337 43.8054 66.5468 44.4195C66.586 45.63 66.8908 46.5048 67.4524 47.0438C68.0185 47.5784 68.7369 47.8479 69.6164 47.8479Z" fill="currentColor"/><path d="M78.8861 50.0437C78.7468 50.0437 78.6336 49.9951 78.5378 49.8979C78.442 49.8007 78.3941 49.6814 78.3941 49.5445V35.9367C78.3941 35.7821 78.442 35.6584 78.5378 35.5612C78.6336 35.464 78.7511 35.4154 78.8861 35.4154H80.471C80.6625 35.4154 80.8019 35.4596 80.8933 35.5524C80.9804 35.6451 81.0413 35.707 81.0675 35.7512L87.002 45.1175V35.9323C87.002 35.7777 87.0455 35.654 87.137 35.5568C87.2284 35.4596 87.346 35.411 87.4984 35.411H89.2269C89.3793 35.411 89.5012 35.4596 89.597 35.5568C89.6928 35.654 89.7407 35.7777 89.7407 35.9323V49.5179C89.7407 49.6726 89.6928 49.7963 89.597 49.8935C89.5012 49.9907 89.3836 50.0393 89.2487 50.0393H87.642C87.4505 50.0393 87.3111 49.9907 87.2284 49.8935C87.1457 49.7963 87.0847 49.7344 87.0412 49.7035L81.1284 40.5492V49.5356C81.1284 49.677 81.0805 49.7919 80.9847 49.8891C80.889 49.9863 80.767 50.0349 80.6146 50.0349H78.8861V50.0437Z" fill="currentColor"/><path d="M98.4966 50.2513C97.2731 50.2513 96.2238 50.0437 95.3443 49.6328C94.4648 49.2219 93.7768 48.5857 93.2848 47.7286C92.7885 46.8715 92.5229 45.8023 92.4793 44.5211C92.4663 43.9202 92.4576 43.3282 92.4576 42.745C92.4576 42.1618 92.4663 41.561 92.4793 40.9468C92.5185 39.6789 92.7972 38.6185 93.3023 37.7702C93.8117 36.922 94.5083 36.2769 95.3922 35.8484C96.276 35.4154 97.3123 35.1989 98.4922 35.1989C99.6722 35.1989 100.708 35.4154 101.601 35.8484C102.494 36.2813 103.195 36.922 103.704 37.7702C104.213 38.6185 104.488 39.6789 104.527 40.9468C104.553 41.561 104.566 42.1574 104.566 42.745C104.566 43.3282 104.553 43.9246 104.527 44.5211C104.488 45.8023 104.218 46.8715 103.721 47.7286C103.225 48.5857 102.537 49.2219 101.653 49.6328C100.774 50.0437 99.7201 50.2513 98.4966 50.2513ZM98.4966 47.8479C99.3892 47.8479 100.116 47.5784 100.682 47.0438C101.244 46.5092 101.549 45.6344 101.588 44.4195C101.614 43.8054 101.627 43.2398 101.627 42.7141C101.627 42.1928 101.614 41.6317 101.588 41.0308C101.562 40.2223 101.414 39.564 101.144 39.0559C100.878 38.5478 100.517 38.1767 100.064 37.947C99.6112 37.7172 99.0887 37.6024 98.4966 37.6024C97.9219 37.6024 97.4037 37.7172 96.9509 37.947C96.4981 38.1767 96.1367 38.5478 95.8711 39.0559C95.6012 39.564 95.4531 40.2223 95.427 41.0308C95.414 41.6317 95.4052 42.1928 95.4052 42.7141C95.4052 43.2354 95.414 43.8054 95.427 44.4195C95.4662 45.63 95.771 46.5048 96.3327 47.0438C96.8987 47.5784 97.6171 47.8479 98.4966 47.8479Z" fill="currentColor"/><path d="M107.766 50.0437C107.627 50.0437 107.514 49.9951 107.418 49.8979C107.322 49.8007 107.274 49.6814 107.274 49.5445V35.9102C107.274 35.7688 107.322 35.654 107.418 35.5568C107.514 35.4596 107.631 35.411 107.766 35.411H109.682C109.821 35.411 109.935 35.4596 110.035 35.5568C110.131 35.654 110.178 35.7733 110.178 35.9102V47.5519H116.709C116.862 47.5519 116.984 47.6005 117.08 47.6977C117.175 47.7949 117.223 47.9186 117.223 48.0732V49.5356C117.223 49.677 117.175 49.7919 117.08 49.8891C116.984 49.9863 116.862 50.0349 116.709 50.0349H107.766V50.0437Z" fill="currentColor"/><path d="M124.577 50.2513C123.354 50.2513 122.304 50.0437 121.425 49.6328C120.545 49.2219 119.857 48.5857 119.365 47.7286C118.869 46.8715 118.603 45.8023 118.56 44.5211C118.547 43.9202 118.538 43.3282 118.538 42.745C118.538 42.1618 118.547 41.561 118.56 40.9468C118.599 39.6789 118.878 38.6185 119.383 37.7702C119.892 36.922 120.589 36.2769 121.473 35.8484C122.357 35.4154 123.393 35.1989 124.573 35.1989C125.753 35.1989 126.789 35.4154 127.682 35.8484C128.574 36.2813 129.275 36.922 129.785 37.7702C130.294 38.6185 130.568 39.6789 130.607 40.9468C130.634 41.561 130.647 42.1574 130.647 42.745C130.647 43.3282 130.634 43.9246 130.607 44.5211C130.568 45.8023 130.298 46.8715 129.802 47.7286C129.306 48.5857 128.618 49.2219 127.734 49.6328C126.854 50.0437 125.801 50.2513 124.577 50.2513ZM124.577 47.8479C125.47 47.8479 126.197 47.5784 126.763 47.0438C127.324 46.5092 127.629 45.6344 127.668 44.4195C127.695 43.8054 127.708 43.2398 127.708 42.7141C127.708 42.1928 127.695 41.6317 127.668 41.0308C127.642 40.2223 127.494 39.564 127.224 39.0559C126.959 38.5478 126.597 38.1767 126.145 37.947C125.692 37.7172 125.169 37.6024 124.577 37.6024C124.002 37.6024 123.484 37.7172 123.031 37.947C122.579 38.1767 122.217 38.5478 121.952 39.0559C121.682 39.564 121.538 40.2223 121.508 41.0308C121.494 41.6317 121.486 42.1928 121.486 42.7141C121.486 43.2354 121.494 43.8054 121.508 44.4195C121.547 45.63 121.851 46.5048 122.413 47.0438C122.979 47.5784 123.698 47.8479 124.577 47.8479Z" fill="currentColor"/><path d="M138.893 50.2513C137.67 50.2513 136.62 50.0437 135.741 49.6328C134.861 49.2219 134.173 48.5857 133.681 47.7286C133.185 46.8715 132.919 45.8023 132.876 44.5211C132.863 43.9202 132.854 43.3282 132.854 42.745C132.854 42.1618 132.863 41.561 132.876 40.9468C132.915 39.6789 133.194 38.6185 133.699 37.7702C134.208 36.922 134.905 36.2769 135.789 35.8484C136.673 35.4154 137.709 35.1989 138.889 35.1989C140.069 35.1989 141.105 35.4154 141.998 35.8484C142.89 36.2813 143.591 36.922 144.101 37.7702C144.61 38.6185 144.884 39.6789 144.923 40.9468C144.95 41.561 144.963 42.1574 144.963 42.745C144.963 43.3282 144.95 43.9246 144.923 44.5211C144.884 45.8023 144.614 46.8715 144.118 47.7286C143.622 48.5857 142.934 49.2219 142.05 49.6328C141.17 50.0437 140.117 50.2513 138.893 50.2513ZM138.893 47.8479C139.786 47.8479 140.513 47.5784 141.079 47.0438C141.641 46.5092 141.945 45.6344 141.984 44.4195C142.011 43.8054 142.024 43.2398 142.024 42.7141C142.024 42.1928 142.011 41.6317 141.984 41.0308C141.958 40.2223 141.81 39.564 141.54 39.0559C141.275 38.5478 140.913 38.1767 140.461 37.947C140.008 37.7172 139.485 37.6024 138.893 37.6024C138.318 37.6024 137.8 37.7172 137.347 37.947C136.895 38.1767 136.533 38.5478 136.268 39.0559C135.998 39.564 135.854 40.2223 135.824 41.0308C135.811 41.6317 135.802 42.1928 135.802 42.7141C135.802 43.2354 135.811 43.8054 135.824 44.4195C135.863 45.63 136.168 46.5048 136.729 47.0438C137.295 47.5784 138.014 47.8479 138.893 47.8479Z" fill="currentColor"/><path d="M148.163 50.0437C148.024 50.0437 147.91 49.9951 147.815 49.8979C147.719 49.8007 147.671 49.6814 147.671 49.5445V35.9367C147.671 35.7821 147.719 35.6584 147.815 35.5612C147.91 35.464 148.028 35.4154 148.163 35.4154H153.684C154.755 35.4154 155.691 35.5877 156.488 35.9279C157.285 36.2681 157.903 36.785 158.343 37.4742C158.782 38.1635 159 39.025 159 40.0544C159 41.1015 158.778 41.9586 158.343 42.6346C157.903 43.3105 157.285 43.8142 156.488 44.15C155.691 44.4857 154.759 44.6536 153.684 44.6536H150.614V49.5445C150.614 49.6858 150.571 49.8007 150.479 49.8979C150.388 49.9951 150.27 50.0437 150.118 50.0437H148.163ZM150.575 42.3297H153.584C154.38 42.3297 154.99 42.1397 155.417 41.7554C155.843 41.371 156.057 40.8055 156.057 40.05C156.057 39.3519 155.856 38.7908 155.46 38.3667C155.06 37.9425 154.437 37.7305 153.584 37.7305H150.575V42.3297Z" fill="currentColor"/><path d="M33.5956 76C37.4335 76 40.5446 72.843 40.5446 68.9487C40.5446 65.0544 37.4335 61.8975 33.5956 61.8975C29.7578 61.8975 26.6466 65.0544 26.6466 68.9487C26.6466 72.843 29.7578 76 33.5956 76Z" fill="#2F60DE"/><path d="M48.8608 76C52.6986 76 55.8098 72.843 55.8098 68.9487C55.8098 65.0544 52.6986 61.8975 48.8608 61.8975C45.0229 61.8975 41.9117 65.0544 41.9117 68.9487C41.9117 72.843 45.0229 76 48.8608 76Z" fill="#2F60DE"/><path d="M64.2218 71.8426C68.0596 71.8426 71.1708 68.6856 71.1708 64.7913C71.1708 60.897 68.0596 57.74 64.2218 57.74C60.3839 57.74 57.2728 60.897 57.2728 64.7913C57.2728 68.6856 60.3839 71.8426 64.2218 71.8426Z" fill="#2F60DE"/><path d="M19.4929 70.3228C23.3308 70.3228 26.4419 67.1658 26.4419 63.2715C26.4419 59.3772 23.3308 56.2202 19.4929 56.2202C15.6551 56.2202 12.5439 59.3772 12.5439 63.2715C12.5439 67.1658 15.6551 70.3228 19.4929 70.3228Z" fill="#2F60DE"/><path d="M9.77042 58.416C13.6083 58.416 16.7194 55.259 16.7194 51.3647C16.7194 47.4704 13.6083 44.3134 9.77042 44.3134C5.93259 44.3134 2.82141 47.4704 2.82141 51.3647C2.82141 55.259 5.93259 58.416 9.77042 58.416Z" fill="#2F60DE"/><path d="M8.05676 42.5569C11.8455 41.9361 14.4209 38.3164 13.8092 34.4719C13.1974 30.6274 9.63013 28.0141 5.84142 28.6348C2.05271 29.2556 -0.522724 32.8754 0.0890261 36.7198C0.700777 40.5643 4.26805 43.1776 8.05676 42.5569Z" fill="#2F60DE"/><path d="M11.8604 28.1432C15.6982 28.1432 18.8094 24.9863 18.8094 21.092C18.8094 17.1976 15.6982 14.0407 11.8604 14.0407C8.02253 14.0407 4.91135 17.1976 4.91135 21.092C4.91135 24.9863 8.02253 28.1432 11.8604 28.1432Z" fill="#2F60DE"/><path d="M22.9979 17.7828C26.8357 17.7828 29.9469 14.6259 29.9469 10.7315C29.9469 6.83723 26.8357 3.68027 22.9979 3.68027C19.1601 3.68027 16.0489 6.83723 16.0489 10.7315C16.0489 14.6259 19.1601 17.7828 22.9979 17.7828Z" fill="#2F60DE"/><path d="M38.3633 14.1025C42.2011 14.1025 45.3123 10.9456 45.3123 7.05127C45.3123 3.15696 42.2011 0 38.3633 0C34.5254 0 31.4142 3.15696 31.4142 7.05127C31.4142 10.9456 34.5254 14.1025 38.3633 14.1025Z" fill="#2F60DE"/><path d="M53.0145 18.3925C56.8523 18.3925 59.9635 15.2356 59.9635 11.3413C59.9635 7.44694 56.8523 4.28998 53.0145 4.28998C49.1767 4.28998 46.0655 7.44694 46.0655 11.3413C46.0655 15.2356 49.1767 18.3925 53.0145 18.3925Z" fill="#2F60DE"/><path d="M63.7776 29.2345C67.6155 29.2345 70.7266 26.0775 70.7266 22.1832C70.7266 18.2889 67.6155 15.132 63.7776 15.132C59.9398 15.132 56.8286 18.2889 56.8286 22.1832C56.8286 26.0775 59.9398 29.2345 63.7776 29.2345Z" fill="#2F60DE"/></g><defs><clipPath id="clip0_logo_main"><rect width="159" height="76" fill="white"/></clipPath></defs></svg>
  )
}
```

- [ ] **Step 4: Create `Sidebar.module.css`, ported verbatim from `index.html:76-208`**

```css
.sidebar {
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  transition: background var(--duration-normal) var(--ease-out);
}

.logo {
  padding: 20px 16px 18px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 10px;
}

.brandLogo {
  height: 38px;
  width: auto;
  flex-shrink: 0;
  display: block;
  color: #ffffff;
}

:global([data-theme="light"]) .brandLogo {
  color: #111111;
}

.nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  border: none;
  background: transparent;
  text-decoration: none;
}

.navItem:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.navItemActive {
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
  font-weight: 500;
}

.navItemActive svg {
  color: #fff;
}

.sidebarBottom {
  padding: 14px 10px 18px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.themeToggle {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  height: 36px;
}

.themeBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 500;
  transition: background var(--duration-fast), color var(--duration-fast);
  border-radius: 6px;
  margin: 2px;
}

.themeBtnActive {
  background: var(--accent-blue);
  color: #fff;
}

.themeBtn:not(.themeBtnActive):hover {
  color: var(--text-primary);
}

.inviteBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
  width: 100%;
}

.inviteBtn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}
```

- [ ] **Step 5: Implement `Sidebar.tsx`**

```tsx
// src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  Briefcase,
  Zap,
  Users,
  BarChart2,
  CalendarDays,
  GitMerge,
  Settings,
  Sun,
  Moon,
  Mail,
} from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { BrandLogo } from './BrandLogo'
import styles from './Sidebar.module.css'

interface NavItemDef {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

// Label reads "Integration" (singular) to match the original index.html:3001-3003 exactly.
const NAV_ITEMS: NavItemDef[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/projects', label: 'Projects', icon: Briefcase },
  { to: '/sprints', label: 'Sprints', icon: Zap },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/integrations', label: 'Integration', icon: GitMerge },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <BrandLogo className={styles.brandLogo} />
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
            }
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.themeToggle} role="group" aria-label="Theme toggle">
          <button
            type="button"
            className={theme === 'light' ? `${styles.themeBtn} ${styles.themeBtnActive}` : styles.themeBtn}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >
            <Sun size={13} aria-hidden="true" /> Light
          </button>
          <button
            type="button"
            className={theme === 'dark' ? `${styles.themeBtn} ${styles.themeBtnActive}` : styles.themeBtn}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            <Moon size={13} aria-hidden="true" /> Dark
          </button>
        </div>
        <button type="button" className={styles.inviteBtn}>
          <Mail size={14} aria-hidden="true" />
          Invite teammates
        </button>
      </div>
    </aside>
  )
}
```

Note: `NavLink`'s `isActive` already renders `aria-current="page"` on the active link automatically — no manual wiring needed for the Step 1 test's second assertion.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/components/layout/Sidebar.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/BrandLogo.tsx src/components/layout/Sidebar.tsx src/components/layout/Sidebar.module.css src/components/layout/Sidebar.test.tsx
git commit -m "feat: add Sidebar with nav, theme toggle, and inline brand logo"
```

---

### Task 8: `TopBar`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\TopBar.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\TopBar.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\TopBar.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\Ellipse 1.png` (copied from old repo)
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\Ellipse 2.png` (copied)
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\Ellipse 3.png` (copied)
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\Ellipse 4.png` (copied)
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\Ellipse 5.png` (copied)

**Interfaces:**
- Produces: `<TopBar />`, rendered by `AppShell` in Task 9.

**Behavior flag:** the search input, notification bell, and user-avatar button are visually ported but **not functionally wired** in this phase — search filtering, the notifications panel, and the user dropdown menu all depend on state/UI systems (Dropdown, Toast, page-level search state) that don't exist until Phase 2+. This matches the design doc's phased sequencing (§6): Phase 1 is chrome, not behavior.

- [ ] **Step 1: Copy avatar assets from the old repo**

Run (PowerShell):
```
New-Item -ItemType Directory -Force "C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars"
Copy-Item "C:\Users\HP\Downloads\Chronoloop dashboard\avatars\Ellipse 1.png" "C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\"
Copy-Item "C:\Users\HP\Downloads\Chronoloop dashboard\avatars\Ellipse 2.png" "C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\"
Copy-Item "C:\Users\HP\Downloads\Chronoloop dashboard\avatars\Ellipse 3.png" "C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\"
Copy-Item "C:\Users\HP\Downloads\Chronoloop dashboard\avatars\Ellipse 4.png" "C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\"
Copy-Item "C:\Users\HP\Downloads\Chronoloop dashboard\avatars\Ellipse 5.png" "C:\Users\HP\Downloads\CHRONOLOOP-frontend\public\avatars\"
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/layout/TopBar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from './TopBar'

describe('TopBar', () => {
  it('renders the search input', () => {
    render(<TopBar />)
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })

  it('renders the team avatar cluster with accessible names', () => {
    render(<TopBar />)
    expect(screen.getByTitle('Aspen Herwitz')).toBeInTheDocument()
    expect(screen.getByTitle('Roger Dokidis')).toBeInTheDocument()
    expect(screen.getByTitle('Marley Vaccaro')).toBeInTheDocument()
    expect(screen.getByTitle('Ryan Culhane')).toBeInTheDocument()
  })

  it('renders the share button, notification bell with badge, and user avatar button', () => {
    render(<TopBar />)
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /jacob solayinka/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/components/layout/TopBar.test.tsx`
Expected: FAIL with "Cannot find module './TopBar'"

- [ ] **Step 4: Create `TopBar.module.css`, ported verbatim from `index.html:220-360`**

```css
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 28px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-base);
  flex-shrink: 0;
  gap: 16px;
}

.searchWrap {
  position: relative;
  flex: 1;
  max-width: 260px;
}

.searchIcon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.searchInput {
  width: 100%;
  height: 34px;
  padding: 0 14px 0 34px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  transition: border-color var(--duration-fast);
}

.searchInput::placeholder {
  color: var(--text-muted);
}

.searchInput:focus {
  border-color: var(--accent-blue);
  outline: none;
}

.topbarRight {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatarCluster {
  display: flex;
  align-items: center;
}

.avatarSm {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--bg-base);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--duration-fast);
  flex-shrink: 0;
}

.avatarSm:hover {
  transform: translateY(-2px) scale(1.1);
  z-index: 1;
}

.avatarSm:not(:first-child) {
  margin-left: -8px;
}

.avatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.shareBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 32px;
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
}

.shareBtn:hover {
  opacity: 0.88;
}

.shareBtn:active {
  transform: scale(0.97);
}

.iconBtn {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.iconBtn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.notifBadge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  background: var(--accent-red);
  border-radius: 50%;
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--bg-base);
}

.userAvatarBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px 6px;
  border-radius: 8px;
  transition: background var(--duration-fast);
}

.userAvatarBtn:hover {
  background: var(--bg-card);
}

.avatarMd {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Implement `TopBar.tsx`, ported verbatim from `index.html:3029-3057`**

```tsx
// src/components/layout/TopBar.tsx
import { Search, Share2, Bell, ChevronDown } from 'lucide-react'
import styles from './TopBar.module.css'

interface TeamAvatar {
  src: string
  name: string
}

const TEAM_AVATARS: TeamAvatar[] = [
  { src: '/avatars/Ellipse 2.png', name: 'Aspen Herwitz' },
  { src: '/avatars/Ellipse 3.png', name: 'Roger Dokidis' },
  { src: '/avatars/Ellipse 4.png', name: 'Marley Vaccaro' },
  { src: '/avatars/Ellipse 5.png', name: 'Ryan Culhane' },
]

export function TopBar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} aria-hidden="true" />
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search"
          autoComplete="off"
          aria-label="Search"
        />
      </div>

      <div className={styles.topbarRight}>
        <div className={styles.avatarCluster}>
          {TEAM_AVATARS.map(({ src, name }) => (
            <div key={name} className={styles.avatarSm} title={name}>
              <img className={styles.avatarImg} src={src} alt={name} />
            </div>
          ))}
        </div>

        <button type="button" className={styles.shareBtn}>
          <Share2 size={13} aria-hidden="true" /> Share
        </button>

        <button type="button" className={styles.iconBtn} aria-label="Notifications">
          <Bell size={16} aria-hidden="true" />
          <span className={styles.notifBadge}>2</span>
        </button>

        <button type="button" className={styles.userAvatarBtn} aria-label="Jacob Solayinka, account menu">
          <div className={styles.avatarMd}>
            <img className={styles.avatarImg} src="/avatars/Ellipse 1.png" alt="Jacob Solayinka" />
          </div>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/components/layout/TopBar.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/TopBar.tsx src/components/layout/TopBar.module.css src/components/layout/TopBar.test.tsx public/avatars
git commit -m "feat: add TopBar with search, avatar cluster, share, notifications, and user menu"
```

---

### Task 9: `AppShell`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\AppShell.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\AppShell.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\layout\AppShell.test.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Task 7), `TopBar` (Task 8).
- Produces: `<AppShell />`, a React Router layout route element rendering `<Sidebar />`, `<TopBar />`, and an `<Outlet />` for the active page. Task 10's router wires this in as the layout for all 9 page routes.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/AppShell.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders Sidebar, TopBar, and the routed child content together', () => {
    const router = createMemoryRouter(
      [
        {
          element: <AppShell />,
          children: [{ path: '/', element: <div>page content</div> }],
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
    expect(screen.getByText('page content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/layout/AppShell.test.tsx`
Expected: FAIL with "Cannot find module './AppShell'"

- [ ] **Step 3: Create `AppShell.module.css`, ported verbatim from `index.html:69-74` (`.app-layout`), `:210-218` (`.main-content`), and `:374-380` (`.content-scroll`)**

```css
.appLayout {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100vh;
  overflow: hidden;
}

.mainContent {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
  transition: background var(--duration-normal) var(--ease-out);
}

.contentScroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

- [ ] **Step 4: Implement `AppShell.tsx`**

```tsx
// src/components/layout/AppShell.tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.appLayout}>
      <Sidebar />
      <main className={styles.mainContent}>
        <TopBar />
        <div className={styles.contentScroll}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/layout/AppShell.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/AppShell.tsx src/components/layout/AppShell.module.css src/components/layout/AppShell.test.tsx
git commit -m "feat: add AppShell composing Sidebar, TopBar, and routed content"
```

---

### Task 10: Nine page stubs, routing, and the real `App.tsx` (replaces the default counter + Task 3's smoke test)

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\DashboardPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\TasksPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\ProjectsPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\SprintsPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\TeamPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\ReportsPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\CalendarPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\IntegrationsPage.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\pages\SettingsPage.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\App.tsx` (full rewrite)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\App.test.tsx` (full rewrite — supersedes Task 3's counter test)
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\main.tsx` (call `useThemeSync` is inside `App`, not `main.tsx` — no change needed here beyond Task 4's stylesheet imports)
- Delete: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\App.css` (Vite default counter styling, no longer used)
- Delete: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\assets\react.svg` (Vite default asset, unused — safe to leave if removal is inconvenient, but not referenced anywhere after this task)

**Interfaces:**
- Consumes: `AppShell` (Task 9), `ErrorBoundary` (Task 6), `useThemeSync` (Task 5).
- Produces: the fully routed application — `pnpm dev` now shows the real Sidebar/TopBar chrome with 9 navigable stub pages, matching the design doc's Phase 1 checkpoint.

- [ ] **Step 1: Create the nine page stub components**

```tsx
// src/pages/DashboardPage.tsx
export function DashboardPage() {
  return <h1>Dashboard</h1>
}
```

```tsx
// src/pages/TasksPage.tsx
export function TasksPage() {
  return <h1>Tasks</h1>
}
```

```tsx
// src/pages/ProjectsPage.tsx
export function ProjectsPage() {
  return <h1>Projects</h1>
}
```

```tsx
// src/pages/SprintsPage.tsx
export function SprintsPage() {
  return <h1>Sprints</h1>
}
```

```tsx
// src/pages/TeamPage.tsx
export function TeamPage() {
  return <h1>Team</h1>
}
```

```tsx
// src/pages/ReportsPage.tsx
export function ReportsPage() {
  return <h1>Reports</h1>
}
```

```tsx
// src/pages/CalendarPage.tsx
export function CalendarPage() {
  return <h1>Calendar</h1>
}
```

```tsx
// src/pages/IntegrationsPage.tsx
export function IntegrationsPage() {
  return <h1>Integrations</h1>
}
```

```tsx
// src/pages/SettingsPage.tsx
export function SettingsPage() {
  return <h1>Settings</h1>
}
```

- [ ] **Step 2: Write the failing integration test for the real `App.tsx`**

```tsx
// src/App.test.tsx (overwrites Task 3's counter test)
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders the Dashboard page by default, with the sidebar and topbar chrome', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })

  it('navigates to the Tasks page when the Tasks nav link is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('link', { name: 'Tasks' }))
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
  })

  it('navigates to the Integrations page when the "Integration" nav link is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('link', { name: 'Integration' }))
    expect(screen.getByRole('heading', { name: 'Integrations' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL — `App` still renders the default Vite counter, none of the new assertions match.

- [ ] **Step 4: Delete the unused Vite scaffold files**

Delete `src/App.css`. (`src/assets/react.svg` may be left in place — it costs nothing and Vite won't bundle it if unreferenced — but it's fine to remove for cleanliness.)

- [ ] **Step 5: Rewrite `App.tsx`**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { useThemeSync } from './store/themeStore'
import { DashboardPage } from './pages/DashboardPage'
import { TasksPage } from './pages/TasksPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SprintsPage } from './pages/SprintsPage'
import { TeamPage } from './pages/TeamPage'
import { ReportsPage } from './pages/ReportsPage'
import { CalendarPage } from './pages/CalendarPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  useThemeSync()

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="sprints" element={<SprintsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
```

The `ErrorBoundary` wraps everything, including `BrowserRouter` and `AppShell` — this is the "top-level error boundary on the AppShell" the product owner asked for: it catches render errors anywhere in the sidebar, topbar, router, or any routed page.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/App.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Run the full test suite**

Run: `pnpm test`
Expected: all tests across all files PASS (Sidebar, TopBar, AppShell, ErrorBoundary, themeStore, App).

- [ ] **Step 8: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 9: Manual visual check**

Run: `pnpm dev`, open `http://localhost:5173`. Expected: dark sidebar with the ChronoLoop wordmark, 9 nav items, working theme toggle, topbar with search/avatars/share/bell/user button, and clicking each nav item swaps the page heading. Compare side by side against the running `index.html` for color/spacing parity.

- [ ] **Step 10: Commit**

```bash
git add src/pages src/App.tsx src/App.test.tsx
git rm src/App.css
git commit -m "feat: wire routing, 9 page stubs, and top-level error boundary in App.tsx"
```

---

### Task 11: `README.md`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\README.md`

**Interfaces:**
- Consumes: nothing — this documents what Tasks 1-10 built.

- [ ] **Step 1: Write the README**

```markdown
# ChronoLoop Frontend

Re-architecture of the ChronoLoop dashboard (previously a single 11,000-line `index.html`) into a maintainable Vite + React + TypeScript codebase. Same look, same behavior — see `docs/superpowers/specs/2026-08-10-chronoloop-frontend-rewrite-design.md` in the sibling `Chronoloop dashboard` repo for the full design doc.

## Stack

- Vite + React 18 + TypeScript (strict, no `any`)
- React Router for page navigation
- Zustand for client state
- CSS Modules over a ported `:root` design-token system (`src/styles/tokens.css`) — no Tailwind
- lucide-react for icons
- Vitest + React Testing Library for tests

## Getting started

```
pnpm install
pnpm dev        # start the dev server
pnpm test       # run the test suite once
pnpm test:watch # run tests in watch mode
pnpm typecheck  # tsc --noEmit
pnpm lint       # eslint
pnpm format     # prettier --write
```

## Folder structure

```
src/
  main.tsx, App.tsx       # entry point, router, top-level error boundary
  styles/                 # tokens.css (design tokens, ported verbatim from index.html), global.css
  components/
    layout/                # AppShell, Sidebar, TopBar, BrandLogo — the persistent chrome
    common/                 # ErrorBoundary and other cross-cutting components
    ui/                      # design-system primitives (Button, Modal, Dropdown, Toast, Card, Chip, Avatar) — Phase 2
    tasks/, projects/, sprints/, team/, reports/, calendar/, integrations/, settings/   # per-page components — later phases
  pages/                   # one *Page.tsx per sidebar nav item, mounted by the router
  store/                    # Zustand stores (themeStore now; tasksStore, uiStore, etc. in later phases)
  data/                     # mock data — later phases
  services/                 # thin functions over mock data now, real API later — later phases
  types/                    # shared TypeScript types — later phases
  hooks/                    # shared hooks — later phases
  lib/                      # date/formatting utilities — later phases
```

## Adding a new page

1. Create `src/pages/YourPage.tsx` exporting a component.
2. Add a `<Route path="your-path" element={<YourPage />} />` inside the `<Route element={<AppShell />}>` block in `src/App.tsx`.
3. If it needs a sidebar entry, add it to `NAV_ITEMS` in `src/components/layout/Sidebar.tsx`.

## Adding a new component

- Shared across pages → `src/components/ui/` or `src/components/common/`.
- Specific to one page's domain → `src/components/<domain>/` (e.g. `src/components/tasks/`).
- Style with a co-located CSS Module (`Component.module.css`) using the tokens from `src/styles/tokens.css` — never hardcode a color, spacing, or radius value that already has a token.
- Write a co-located `Component.test.tsx` using Vitest + React Testing Library.

## Design parity

This is a re-architecture, not a redesign. Every color, spacing value, border radius, and animation timing is copied exactly from the original `index.html`. If you find inconsistent or seemingly-accidental behavior while porting a page, flag it — don't silently "fix" it.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README covering structure, setup, and how to extend"
```

---

## Self-Review

**Spec coverage against the design doc + the product owner's three additions:**
- Vite/React 18/TS strict scaffold — Task 1. ✅
- ESLint + Prettier — Task 2. ✅
- Vitest + React Testing Library harness from day one — Task 3. ✅
- `tokens.css` ported verbatim — Task 4. ✅
- Base AppShell (Sidebar + TopBar) with routing to all 9 nav items, empty stubs OK — Tasks 7, 8, 9, 10. ✅
- Checkpoint: dev server up, layout looks right — Task 10, Step 9. ✅
- TypeScript strict, no `any` (enforced via tsconfig + ESLint rule) — Tasks 1, 2 (Global Constraints). ✅
- Accessibility by default (semantic HTML, ARIA, keyboard nav, focus states) — `:focus-visible` carried in `global.css` (Task 4); `nav`/`aside`/`header`/`button` semantic elements and `aria-label`/`aria-pressed`/`aria-current` throughout Sidebar/TopBar (Tasks 7, 8). ✅
- Top-level React error boundary on AppShell — Task 6 (component) + Task 10 (wired at the top of the tree, above `BrowserRouter`/`AppShell`). ✅
- `tsc --noEmit` + `eslint` + `vitest run` all pass before the phase is done — Task 10, Step 8 + Step 7. ✅

**Placeholder scan:** no "TBD"/"add error handling later"/"similar to Task N" patterns — every step has literal file content. Page stub components are real, minimal, working code matching the design doc's explicit "empty page stubs OK" allowance, not deferred work.

**Type consistency:** `useThemeStore`/`useThemeSync` signature defined once in Task 5 and consumed identically in Task 7 (Sidebar) and Task 10 (App). `Theme` type (`'dark' | 'light'`) used consistently. `NAV_ITEMS` paths in Task 7's Sidebar (`/`, `/tasks`, `/projects`, `/sprints`, `/team`, `/reports`, `/calendar`, `/integrations`, `/settings`) match the `<Route path>` values in Task 10's `App.tsx` exactly.

**Flags raised for the product owner during this phase (carried into review, not silently resolved):**
1. Sidebar's "Integration" nav label is singular in the original `index.html`, inconsistent with "Integrations" used everywhere else (route path, page name, design doc). Preserved as literal parity in Task 7.
2. `index.html`'s theme toggle does not persist across page reloads (no `localStorage`) — `themeStore` matches that (session-only). Flagged in Task 5 in case persistence is actually wanted.
3. TopBar's search input, notification bell, and user-avatar dropdown are visual-only in this phase — no filtering, no panel, no menu — since those depend on Phase 2 primitives and later page-level state. Flagged in Task 8.
