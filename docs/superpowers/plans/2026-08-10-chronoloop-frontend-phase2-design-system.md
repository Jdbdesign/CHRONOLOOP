# ChronoLoop Frontend Rewrite — Phase 2 (Design-System Primitives) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the seven `src/components/ui/` design-system primitives — Button, Card, Badge, Chip, Avatar, Dropdown, Modal, Toast/ToastProvider — once each, styled to match `index.html`'s existing visual treatment exactly. Everything built in later phases (pages, modals, per-domain components) consumes these instead of writing raw markup.

**Architecture:** Interactive/overlay primitives (Dropdown, Modal, Toast, Avatar) wrap the corresponding Radix UI primitive (`@radix-ui/react-dropdown-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-toast`, `@radix-ui/react-avatar`) for accessibility and behavior (focus trap, Escape handling, portal rendering, roving focus), styled with a co-located CSS Module ported from `index.html`. Static/display primitives (Button, Card, Badge, Chip) have no Radix equivalent and are plain styled components. Toast state is centralized in a new Zustand store (`toastStore`), matching the existing `themeStore` pattern, so any component can call `showToast(message, variant)` without prop-drilling.

**Tech Stack:** Existing Phase 1 stack (Vite, React 18, TypeScript strict, Zustand, CSS Modules, Vitest + React Testing Library) plus four new runtime dependencies: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-toast`, `@radix-ui/react-avatar`.

## Global Constraints

- **Location:** `C:\Users\HP\Downloads\CHRONOLOOP-frontend\`. Never modify `C:\Users\HP\Downloads\Chronoloop dashboard\` — it is read-only reference material for this plan (`index.html` line numbers cited below are from that file).
- **Package manager:** pnpm.
- **TypeScript strict mode, no `any`.** ESLint already errors on `@typescript-eslint/no-explicit-any` (Phase 1 Task 2) — this plan's code has no `any`.
- **Radix only where Radix has a primitive:** Dropdown → `@radix-ui/react-dropdown-menu`, Modal → `@radix-ui/react-dialog`, Toast → `@radix-ui/react-toast`, Avatar → `@radix-ui/react-avatar`. Button, Card, Badge, Chip are plain components — Radix does not ship primitives for these, so do not force a dependency where none fits.
- **Pixel/behavior parity with `index.html`:** every color, spacing, radius, and animation timing below is copied exactly from the cited line numbers — no rounding, no "close enough" substitutions.
- **No `className`-based test assertions against CSS Module classes.** Vite hashes CSS Module class names at build/test time, so `toHaveClass('primary')` would fail against the real hashed name. Follow the Phase 1 precedent (`Sidebar.test.tsx` asserts `aria-current`, not a class) — test via ARIA attributes, `data-*` attributes, or visible text/roles instead.
- **Known open flag, do not silently fix here:** `global.css`'s `:focus-visible` rule hardcodes `border-radius: 4px`, but these primitives use their own radii (Button 8px, Card/Dropdown panel 10px, Modal 14px, Chip 20px) — see `docs/superpowers/backlog.md` → "Focus-ring / parity conflict". Every primitive in this plan inherits that same pre-existing mismatch by using the shared global focus style; that's intentional (fixing it once, later, for all components beats a piecemeal per-component fix now). Do not add a component-specific focus override to "fix" it.
- **No demo/preview page.** Verification is via each component's own test file plus `pnpm dev` + a visual spot-check by temporarily mounting a component in a page during development (revert before committing). A dedicated `/ui-preview` route is not requested by the design doc and would be scope beyond this phase — flag it to the product owner if a living style-guide page is wanted later.
- **Verification gate for the whole phase:** `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass after every task.

---

### Task 1: Install Radix UI dependencies

**Files:**
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\package.json` (dependencies)

**Interfaces:**
- Produces: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-toast`, `@radix-ui/react-avatar` installed and importable by Tasks 6–9.

- [ ] **Step 1: Install the four Radix packages**

Run:
```
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast @radix-ui/react-avatar
```

- [ ] **Step 2: Verify the install**

Run: `pnpm typecheck`
Expected: passes (no code imports these yet, so this just confirms the install didn't break the existing build).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add Radix UI Dialog, DropdownMenu, Toast, and Avatar dependencies"
```

---

### Task 2: `Button`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Button.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Button.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Button.test.tsx`

**Interfaces:**
- Produces: `<Button variant?: 'primary' | 'secondary' | 'danger' | 'ghost'>` accepting all native `<button>` attributes, rendering `data-variant={variant}` for test/CSS hooks.

Ported from `index.html:423-445` (`.btn-primary`, `.btn-secondary`), `index.html:2742-2751` (`.btn-danger`), `index.html:2912-2917` (`.btn-ghost-sm`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children and defaults to the primary variant', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('data-variant', 'primary')
  })

  it('applies the requested variant', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('data-variant', 'danger')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('respects the disabled attribute', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Button.test.tsx`
Expected: FAIL with "Cannot find module './Button'"

- [ ] **Step 3: Create `Button.module.css`**

```css
.button {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
}

.button svg { width: 14px; height: 14px; }

.button:disabled { cursor: default; opacity: 0.5; }

.primary {
  height: 34px;
  padding: 0 14px;
  background: var(--accent-blue);
  color: #fff;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
}
.primary:hover:not(:disabled) { opacity: 0.88; }
.primary:active:not(:disabled) { transform: scale(0.97); }

.secondary {
  height: 34px;
  padding: 0 12px;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  font-weight: 400;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.secondary:hover:not(:disabled) { background: var(--bg-card-hover); color: var(--text-primary); }
.secondary:active:not(:disabled) { transform: scale(0.97); }
.secondary svg { width: 13px; height: 13px; }

.danger {
  height: 30px;
  padding: 0 12px;
  background: transparent;
  color: var(--accent-red);
  border: 1px solid rgba(255, 77, 77, 0.35);
  font-size: 12px;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.danger:hover:not(:disabled) { background: rgba(255, 77, 77, 0.1); border-color: var(--accent-red); }
.danger svg { width: 12px; height: 12px; }

.ghost {
  height: auto;
  padding: 3px 9px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 400;
  transition: all var(--duration-fast);
}
.ghost:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-default); }
```

- [ ] **Step 4: Implement `Button.tsx`**

```tsx
// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  ghost: styles.ghost,
}

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  const combined = [styles.button, VARIANT_CLASS[variant], className].filter(Boolean).join(' ')

  return (
    <button type="button" className={combined} data-variant={variant} {...rest}>
      {children}
    </button>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Button.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.module.css src/components/ui/Button.test.tsx
git commit -m "feat: add Button primitive with primary/secondary/danger/ghost variants"
```

---

### Task 3: `Card`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Card.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Card.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Card.test.tsx`

**Interfaces:**
- Produces: `<Card hoverable?: boolean>` accepting all native `<div>` attributes (including `className`, which is merged rather than overwritten).

Ported from `index.html:450-468` (`.stat-card` base surface + hover-lift; the entrance-animation/`nth-child` delay rules are page-specific KPI-grid behavior, not part of the generic primitive, and are left for the Dashboard page task in Phase 3).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('forwards a caller-supplied className alongside its own styling', () => {
    render(
      <Card className="custom" data-testid="card">
        Content
      </Card>,
    )
    expect(screen.getByTestId('card')).toHaveClass('custom')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Card.test.tsx`
Expected: FAIL with "Cannot find module './Card'"

- [ ] **Step 3: Create `Card.module.css`**

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 14px 16px;
  transition: background var(--duration-normal) var(--ease-out);
}

@media (prefers-reduced-motion: no-preference) {
  .hoverable {
    transition:
      transform var(--duration-fast),
      box-shadow var(--duration-fast),
      background var(--duration-normal) var(--ease-out);
  }
  .hoverable:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px hsla(230, 80%, 50%, 0.12);
  }
}
```

- [ ] **Step 4: Implement `Card.tsx`**

```tsx
// src/components/ui/Card.tsx
import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  children: ReactNode
}

export function Card({ hoverable, className, children, ...rest }: CardProps) {
  const combined = [styles.card, hoverable && styles.hoverable, className].filter(Boolean).join(' ')

  return (
    <div className={combined} {...rest}>
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Card.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/Card.module.css src/components/ui/Card.test.tsx
git commit -m "feat: add Card primitive with optional hover-lift"
```

---

### Task 4: `Badge`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Badge.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Badge.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Badge.test.tsx`

**Interfaces:**
- Produces: `<Badge>` — a small solid text pill, e.g. for the count overlay on colored calendar-event pills.

Ported from `index.html:703-707` (`.pill-badge`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Badge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>3</Badge>)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Badge.test.tsx`
Expected: FAIL with "Cannot find module './Badge'"

- [ ] **Step 3: Create `Badge.module.css`**

```css
.badge {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.22);
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
```

- [ ] **Step 4: Implement `Badge.tsx`**

```tsx
// src/components/ui/Badge.tsx
import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  children: ReactNode
}

export function Badge({ children }: BadgeProps) {
  return <span className={styles.badge}>{children}</span>
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Badge.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Badge.tsx src/components/ui/Badge.module.css src/components/ui/Badge.test.tsx
git commit -m "feat: add Badge primitive"
```

---

### Task 5: `Chip`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Chip.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Chip.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Chip.test.tsx`

**Interfaces:**
- Produces: `<Chip dotColor: string, count: number | string, label: string, active?: boolean, onClick?: () => void>` — the clickable stat-filter chip (e.g. Tasks page's To-do/Assigned/Completed/Overdue row).

Ported from `index.html:921-927` (`.task-stat-chip`, `.chip-dot`, `.chip-num`, `.chip-label`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Chip.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

describe('Chip', () => {
  it('renders the count and label', () => {
    render(<Chip dotColor="#4A90FF" count={45} label="To-do" />)
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('To-do')).toBeInTheDocument()
  })

  it('reflects the active state via aria-pressed', () => {
    render(<Chip dotColor="#4A90FF" count={45} label="To-do" active />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Chip dotColor="#4A90FF" count={45} label="To-do" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Chip.test.tsx`
Expected: FAIL with "Cannot find module './Chip'"

- [ ] **Step 3: Create `Chip.module.css`**

```css
.chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: border-color var(--duration-fast), transform var(--duration-fast);
  font-family: 'DM Sans', sans-serif;
}

.chip:hover { border-color: var(--border-default); transform: translateY(-1px); }

.active { border-color: var(--accent-blue); background: var(--accent-blue-bg); }

.dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.num { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text-primary); }
.label { font-size: 11px; color: var(--text-secondary); }
```

- [ ] **Step 4: Implement `Chip.tsx`**

```tsx
// src/components/ui/Chip.tsx
import styles from './Chip.module.css'

interface ChipProps {
  dotColor: string
  count: number | string
  label: string
  active?: boolean
  onClick?: () => void
}

export function Chip({ dotColor, count, label, active, onClick }: ChipProps) {
  const combined = [styles.chip, active && styles.active].filter(Boolean).join(' ')

  return (
    <button type="button" className={combined} onClick={onClick} aria-pressed={Boolean(active)}>
      <span className={styles.dot} style={{ background: dotColor }} aria-hidden="true" />
      <span className={styles.num}>{count}</span>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Chip.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Chip.tsx src/components/ui/Chip.module.css src/components/ui/Chip.test.tsx
git commit -m "feat: add Chip primitive for stat-filter chips"
```

---

### Task 6: `Avatar`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Avatar.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Avatar.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Avatar.test.tsx`

**Interfaces:**
- Produces: `<Avatar src?: string, name: string, size?: 'sm' | 'md'>`, wrapping `@radix-ui/react-avatar` so a broken/missing image falls back to an initials-on-gradient circle instead of a broken-image icon.

Ported from `index.html:265-285` (`.avatar-sm`, `.avatar-img`) and `index.html:358-369` (`.avatar-md`, the `linear-gradient(135deg, #4A90FF, #A855F7)` fallback background used by `.user-menu-avatar`). This directly addresses the "Avatar fallback gradient" item flagged in `docs/superpowers/backlog.md` — `TopBar.tsx` still renders raw `<img>` tags for its avatars and is **not** being retrofitted to use this component in this task (that's page/chrome-wiring work, out of scope for "build the primitive" — flag it to the product owner as a natural follow-up once this exists).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Avatar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders two-letter initials for a first+last name', () => {
    render(<Avatar name="Jacob Solayinka" />)
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('renders a single-letter fallback for a one-word name', () => {
    render(<Avatar name="Aspen" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('exposes the name as a title for identification', () => {
    render(<Avatar name="Roger Dokidis" />)
    expect(screen.getByTitle('Roger Dokidis')).toBeInTheDocument()
  })
})
```

Note: jsdom (the test environment) never actually loads images, so `Avatar.Image` never reaches the `loaded` state regardless of whether `src` is passed — `Avatar.Fallback` renders in every test here. That is the behavior this component exists to guarantee (no broken-image icon), so it is exactly what should be tested.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Avatar.test.tsx`
Expected: FAIL with "Cannot find module './Avatar'"

- [ ] **Step 3: Create `Avatar.module.css`**

```css
.root {
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm { width: 30px; height: 30px; }
.md { width: 32px; height: 32px; }

.image { width: 100%; height: 100%; object-fit: cover; display: block; }

.fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4A90FF, #A855F7);
  color: #fff;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
}

.sm .fallback { font-size: 11px; }
.md .fallback { font-size: 12px; }
```

- [ ] **Step 4: Implement `Avatar.tsx`**

```tsx
// src/components/ui/Avatar.tsx
import * as RadixAvatar from '@radix-ui/react-avatar'
import styles from './Avatar.module.css'

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md'
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function Avatar({ src, name, size = 'sm' }: AvatarProps) {
  const sizeClass = size === 'md' ? styles.md : styles.sm

  return (
    <RadixAvatar.Root className={`${styles.root} ${sizeClass}`} title={name}>
      <RadixAvatar.Image className={styles.image} src={src} alt={name} />
      <RadixAvatar.Fallback className={styles.fallback}>{getInitials(name)}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Avatar.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Avatar.tsx src/components/ui/Avatar.module.css src/components/ui/Avatar.test.tsx
git commit -m "feat: add Avatar primitive with initials-on-gradient fallback"
```

---

### Task 7: `Dropdown`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Dropdown.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Dropdown.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Dropdown.test.tsx`

**Interfaces:**
- Produces: `Dropdown.Root` (= `DropdownMenu.Root`), `Dropdown.Trigger` (= `DropdownMenu.Trigger`), `Dropdown.Content({ children, align? })`, `Dropdown.Item({ children, icon?, active?, danger?, onSelect? })`, `Dropdown.Divider()`. Compound-component usage: `<Dropdown.Root><Dropdown.Trigger>…</Dropdown.Trigger><Dropdown.Content><Dropdown.Item>…</Dropdown.Item></Dropdown.Content></Dropdown.Root>`.

Ported from `index.html:710-737` (`.dd-panel`, `.dd-item`, `.dd-divider`, the `ddFadeIn` open animation). The trigger button's own appearance (e.g. `.dropdown-btn`) is page-specific chrome, not part of this primitive — callers style their own trigger element and pass it via `asChild` if they need a custom trigger tag.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Dropdown.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dropdown } from './Dropdown'

describe('Dropdown', () => {
  it('opens the panel and lists items when the trigger is clicked', async () => {
    render(
      <Dropdown.Root>
        <Dropdown.Trigger>Open</Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item>This week</Dropdown.Item>
          <Dropdown.Item>This month</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('menuitem', { name: 'This week' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'This month' })).toBeInTheDocument()
  })

  it('calls onSelect when an item is clicked', async () => {
    const onSelect = vi.fn()
    render(
      <Dropdown.Root>
        <Dropdown.Trigger>Open</Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item onSelect={onSelect}>This week</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'This week' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('closes the panel when Escape is pressed', async () => {
    render(
      <Dropdown.Root>
        <Dropdown.Trigger>Open</Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item>This week</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menuitem', { name: 'This week' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem', { name: 'This week' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Dropdown.test.tsx`
Expected: FAIL with "Cannot find module './Dropdown'"

- [ ] **Step 3: Create `Dropdown.module.css`**

```css
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 4px;
  min-width: 160px;
  z-index: 500;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
}

.panel[data-state='open'] { animation: fadeIn 150ms var(--ease-out); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'DM Sans', sans-serif;
  transition: background var(--duration-fast), color var(--duration-fast);
  outline: none;
}

.item:hover,
.item[data-highlighted] {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.active { color: var(--accent-blue); font-weight: 500; }
.active::before { content: '✓'; margin-right: -2px; }

.danger { color: var(--accent-red); }
.danger:hover,
.danger[data-highlighted] { background: rgba(255, 77, 77, 0.08); color: var(--accent-red); }

.item svg { width: 13px; height: 13px; flex-shrink: 0; }

.divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 2px;
}
```

- [ ] **Step 4: Implement `Dropdown.tsx`**

```tsx
// src/components/ui/Dropdown.tsx
import * as RadixDropdown from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import styles from './Dropdown.module.css'

interface DropdownContentProps {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
}

function DropdownContent({ children, align = 'end' }: DropdownContentProps) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content className={styles.panel} align={align} sideOffset={6}>
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  )
}

interface DropdownItemProps {
  children: ReactNode
  icon?: ReactNode
  active?: boolean
  danger?: boolean
  onSelect?: () => void
}

function DropdownItem({ children, icon, active, danger, onSelect }: DropdownItemProps) {
  const combined = [styles.item, active && styles.active, danger && styles.danger].filter(Boolean).join(' ')

  return (
    <RadixDropdown.Item className={combined} onSelect={onSelect}>
      {icon}
      {children}
    </RadixDropdown.Item>
  )
}

function DropdownDivider() {
  return <RadixDropdown.Separator className={styles.divider} />
}

export const Dropdown = {
  Root: RadixDropdown.Root,
  Trigger: RadixDropdown.Trigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Divider: DropdownDivider,
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Dropdown.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Dropdown.tsx src/components/ui/Dropdown.module.css src/components/ui/Dropdown.test.tsx
git commit -m "feat: add Dropdown primitive over Radix DropdownMenu"
```

---

### Task 8: `Modal`

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Modal.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Modal.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Modal.test.tsx`

**Interfaces:**
- Produces: `<Modal open: boolean, onOpenChange: (open: boolean) => void, title: string, subtitle?: string, footer?: ReactNode, children: ReactNode>`.
- Consumes: nothing from earlier tasks in this phase (self-contained), but later phases will pass `<Button>` elements (Task 2) into its `footer` slot.

Ported from `index.html:791-823` (`.modal-overlay`, `.modal-card`, `.modal-header`, `.modal-title`, `.modal-subtitle`, `.modal-close-btn`, `.modal-body`, `.modal-footer`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders title, subtitle, and children when open', () => {
    render(
      <Modal open onOpenChange={() => {}} title="New task" subtitle="Add a task to this project">
        <p>Body content</p>
      </Modal>,
    )

    expect(screen.getByRole('heading', { name: 'New task' })).toBeInTheDocument()
    expect(screen.getByText('Add a task to this project')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('does not render its content when closed', () => {
    render(
      <Modal open={false} onOpenChange={() => {}} title="New task">
        <p>Body content</p>
      </Modal>,
    )

    expect(screen.queryByText('Body content')).not.toBeInTheDocument()
  })

  it('calls onOpenChange(false) when the close button is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <Modal open onOpenChange={onOpenChange} title="New task">
        <p>Body content</p>
      </Modal>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders the footer when provided', () => {
    render(
      <Modal open onOpenChange={() => {}} title="New task" footer={<button>Save</button>}>
        <p>Body content</p>
      </Modal>,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Modal.test.tsx`
Expected: FAIL with "Cannot find module './Modal'"

- [ ] **Step 3: Create `Modal.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.overlay[data-state='open'] { animation: overlayIn var(--duration-normal); }
.overlay[data-state='closed'] { animation: overlayOut var(--duration-normal); }

@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.card[data-state='open'] { animation: cardIn var(--duration-normal) var(--ease-out); }
.card[data-state='closed'] { animation: cardOut var(--duration-normal) var(--ease-out); }

@keyframes cardIn {
  from { transform: translateY(16px) scale(0.97); }
  to { transform: translateY(0) scale(1); }
}
@keyframes cardOut {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(16px) scale(0.97); }
}

.header { padding: 20px 20px 0; display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
.title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.closeBtn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast), color var(--duration-fast);
  flex-shrink: 0;
  margin-top: -4px;
}
.closeBtn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.closeBtn svg { width: 16px; height: 16px; }

.body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.footer { padding: 0 20px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
```

- [ ] **Step 4: Implement `Modal.tsx`**

```tsx
// src/components/ui/Modal.tsx
import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ open, onOpenChange, title, subtitle, footer, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay}>
          <Dialog.Content className={styles.card}>
            <div className={styles.header}>
              <div>
                <Dialog.Title className={styles.title}>{title}</Dialog.Title>
                {subtitle ? <Dialog.Description className={styles.subtitle}>{subtitle}</Dialog.Description> : null}
              </div>
              <Dialog.Close className={styles.closeBtn} aria-label="Close">
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <div className={styles.body}>{children}</div>
            {footer ? <div className={styles.footer}>{footer}</div> : null}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Modal.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/ui/Modal.module.css src/components/ui/Modal.test.tsx
git commit -m "feat: add Modal primitive over Radix Dialog"
```

---

### Task 9: `toastStore`, `Toast`, and `ToastProvider` (wired into `App.tsx`)

**Files:**
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\toastStore.ts`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\store\toastStore.test.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Toast.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\Toast.module.css`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\ToastProvider.tsx`
- Create: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\components\ui\ToastProvider.test.tsx`
- Modify: `C:\Users\HP\Downloads\CHRONOLOOP-frontend\src\App.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks in this phase.
- Produces: `useToastStore` (Zustand hook exposing `{ toasts: ToastItem[], showToast: (message: string, variant?: ToastVariant) => void, dismissToast: (id: string) => void }`, `ToastVariant = 'success' | 'error' | 'info'`) and `<ToastProvider>`, mounted once in `App.tsx`, which renders any component's queued toasts. Any later component calls `useToastStore.getState().showToast(...)` (or subscribes via the hook) — no prop drilling needed, matching how the original `showToast(msg, type, duration)` global function worked.

Ported from `index.html:850-870` (`.toast-container`, `.toast`, `toastIn`/`toastOut` keyframes) and `index.html:6369-6381` (the `showToast(msg, type = 'info', duration = 3000)` function — default variant `'info'`, default duration `3000`ms, icons `check-circle`/`x-circle`/`info` are preserved as `CheckCircle`/`XCircle`/`Info` from `lucide-react`).

**Test-ordering note:** this store is a module-level singleton, same as `themeStore`. Both test files below reset it in `beforeEach` — this is the fix for the "test-ordering footgun" flagged in `docs/superpowers/backlog.md` against `App.test.tsx`'s use of `themeStore`, applied here from the start instead of being retrofitted later.

- [ ] **Step 1: Write the failing store test**

```tsx
// src/store/toastStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore } from './toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('starts with no toasts', () => {
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('adds a toast via showToast, defaulting to the info variant', () => {
    useToastStore.getState().showToast('Task saved')
    const [toast] = useToastStore.getState().toasts
    expect(toast.message).toBe('Task saved')
    expect(toast.variant).toBe('info')
  })

  it('adds a toast with an explicit variant', () => {
    useToastStore.getState().showToast('Something failed', 'error')
    const [toast] = useToastStore.getState().toasts
    expect(toast.variant).toBe('error')
  })

  it('removes a toast via dismissToast', () => {
    useToastStore.getState().showToast('Task saved')
    const [toast] = useToastStore.getState().toasts
    useToastStore.getState().dismissToast(toast.id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/store/toastStore.test.tsx`
Expected: FAIL with "Cannot find module './toastStore'"

- [ ] **Step 3: Implement `toastStore.ts`**

```ts
// src/store/toastStore.ts
import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastState {
  toasts: ToastItem[]
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, variant = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: `toast-${nextId++}`, message, variant }],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/store/toastStore.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Create `Toast.module.css`**

```css
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  color: var(--text-primary);
  font-family: 'DM Sans', sans-serif;
  min-width: 240px;
  max-width: 320px;
}

.toast svg { width: 15px; height: 15px; flex-shrink: 0; }

.success { border-left: 3px solid var(--accent-green); }
.success svg { color: var(--accent-green); }
.error { border-left: 3px solid var(--accent-red); }
.error svg { color: var(--accent-red); }
.info { border-left: 3px solid var(--accent-blue); }
.info svg { color: var(--accent-blue); }

.text { flex: 1; }

.toast[data-state='open'] { animation: toastIn 300ms var(--ease-out); }
.toast[data-state='closed'] { animation: toastOut 250ms var(--ease-out); }

@keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(20px); } }

.viewport {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 600;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  list-style: none;
  padding: 0;
  margin: 0;
  outline: none;
}
```

- [ ] **Step 6: Implement `Toast.tsx`**

```tsx
// src/components/ui/Toast.tsx
import * as RadixToast from '@radix-ui/react-toast'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import { useToastStore, type ToastItem } from '../../store/toastStore'
import styles from './Toast.module.css'

const ICONS = { success: CheckCircle, error: XCircle, info: Info }
const VARIANT_CLASS = { success: styles.success, error: styles.error, info: styles.info }

interface ToastProps {
  toast: ToastItem
}

export function Toast({ toast }: ToastProps) {
  const dismissToast = useToastStore((state) => state.dismissToast)
  const Icon = ICONS[toast.variant]

  return (
    <RadixToast.Root
      className={`${styles.toast} ${VARIANT_CLASS[toast.variant]}`}
      data-variant={toast.variant}
      duration={3000}
      onOpenChange={(open) => {
        if (!open) dismissToast(toast.id)
      }}
    >
      <Icon aria-hidden="true" />
      <RadixToast.Description className={styles.text}>{toast.message}</RadixToast.Description>
    </RadixToast.Root>
  )
}
```

- [ ] **Step 7: Implement `ToastProvider.tsx`**

```tsx
// src/components/ui/ToastProvider.tsx
import * as RadixToast from '@radix-ui/react-toast'
import type { ReactNode } from 'react'
import { useToastStore } from '../../store/toastStore'
import { Toast } from './Toast'
import styles from './Toast.module.css'

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <RadixToast.Provider swipeDirection="right">
      {children}
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
      <RadixToast.Viewport className={styles.viewport} />
    </RadixToast.Provider>
  )
}
```

- [ ] **Step 8: Write the failing provider test**

```tsx
// src/components/ui/ToastProvider.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider } from './ToastProvider'
import { useToastStore } from '../../store/toastStore'

describe('ToastProvider', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('renders its children', () => {
    render(
      <ToastProvider>
        <div>App content</div>
      </ToastProvider>,
    )
    expect(screen.getByText('App content')).toBeInTheDocument()
  })

  it('renders a toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <div>App content</div>
      </ToastProvider>,
    )

    act(() => {
      useToastStore.getState().showToast('Task saved', 'success')
    })

    expect(await screen.findByText('Task saved')).toBeInTheDocument()
  })

  it('removes the toast from the store when dismissed', () => {
    render(
      <ToastProvider>
        <div>App content</div>
      </ToastProvider>,
    )

    act(() => {
      useToastStore.getState().showToast('Task saved', 'success')
    })
    const toastId = useToastStore.getState().toasts[0].id

    act(() => {
      useToastStore.getState().dismissToast(toastId)
    })

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm vitest run src/components/ui/ToastProvider.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 10: Wire `ToastProvider` into `App.tsx`**

In `src/App.tsx`, import `ToastProvider` and wrap the router with it, inside the existing `ErrorBoundary`:

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastProvider } from './components/ui/ToastProvider'
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
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  useThemeSync()

  return (
    <ErrorBoundary>
      <ToastProvider>
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
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
```

- [ ] **Step 11: Run the full suite to confirm nothing else broke**

Run: `pnpm test`
Expected: all tests PASS, including the pre-existing `App.test.tsx`.

- [ ] **Step 12: Commit**

```bash
git add src/store/toastStore.ts src/store/toastStore.test.tsx src/components/ui/Toast.tsx src/components/ui/Toast.module.css src/components/ui/ToastProvider.tsx src/components/ui/ToastProvider.test.tsx src/App.tsx
git commit -m "feat: add Toast/ToastProvider over Radix Toast, wired into App root"
```

---

## Phase 2 checkpoint

After Task 9:
- `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass.
- `pnpm dev` still runs; chrome (Sidebar/TopBar/AppShell) is unchanged, since no chrome component was retrofitted to use the new primitives in this phase.
- All seven primitives exist under `src/components/ui/` with passing tests, ready for Phase 3 (pages) to import instead of writing raw markup.
- Two backlog items (`docs/superpowers/backlog.md`) are now partially addressed as side effects, not silently closed: **Avatar fallback gradient** has a real fix available (`<Avatar>`) but TopBar hasn't adopted it yet — flag for the product owner. **Test-ordering footgun** has its intended fix pattern demonstrated in `toastStore.test.tsx`/`ToastProvider.test.tsx`, but `App.test.tsx`'s original instance against `themeStore` is untouched — flag for the product owner whether to backport the `beforeEach` reset there now or during a later cleanup pass.
