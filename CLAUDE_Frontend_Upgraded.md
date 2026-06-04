# CLAUDE.md — Frontend Website Rules (v2)

---

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.
- **Before designing anything**, ask: Who uses this? What is the one thing they need to do? What is the emotional tone? Answer these three questions and let them drive every decision below.

---

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

---

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

---

## Screenshot Workflow
- Puppeteer is installed at `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. Chrome cache is at `C:/Users/nateh/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root. Use it as-is.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.

### Multi-pass Comparison Checklist
Each round, verify ALL of the following:
- [ ] Spacing/padding matches — check outer gutters and inner component padding
- [ ] Font size, weight, and line-height are correct
- [ ] Colors match (exact hex), including hover states
- [ ] Alignment (left edges, baselines, center axes)
- [ ] Border-radius values are consistent
- [ ] Shadows are layered and correctly tinted, not flat
- [ ] Images are correctly sized, cropped, and have overlay treatment
- [ ] Responsive layout holds at 375px (mobile), 768px (tablet), and 1440px (desktop)
- [ ] Dark mode renders correctly if implemented

---

## Output Defaults
- Single `index.html` file, all styles inline, unless user says otherwise
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

---

## Design Tokens (Use These Consistently)

Define all tokens as CSS custom properties at the `:root` level. Never hardcode raw values inside component styles.

```css
:root {
  /* === SPACING (4px base grid) === */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* === TYPE SCALE (1.25 Major Third ratio) === */
  --text-xs:   0.64rem;   /* 10.24px */
  --text-sm:   0.8rem;    /* 12.8px  */
  --text-base: 1rem;      /* 16px    */
  --text-lg:   1.25rem;   /* 20px    */
  --text-xl:   1.563rem;  /* 25px    */
  --text-2xl:  1.953rem;  /* 31.25px */
  --text-3xl:  2.441rem;  /* 39px    */
  --text-4xl:  3.052rem;  /* 48.8px  */

  /* === BORDER RADIUS === */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   20px;
  --radius-full: 9999px;

  /* === ELEVATION / SHADOW (color-tinted, low opacity) === */
  --shadow-sm:  0 1px 2px hsla(0,0%,0%,.06), 0 1px 3px hsla(0,0%,0%,.1);
  --shadow-md:  0 4px 6px -1px hsla(0,0%,0%,.07), 0 2px 4px -1px hsla(0,0%,0%,.06);
  --shadow-lg:  0 10px 15px -3px hsla(0,0%,0%,.08), 0 4px 6px -2px hsla(0,0%,0%,.04);
  --shadow-xl:  0 20px 25px -5px hsla(0,0%,0%,.1), 0 10px 10px -5px hsla(0,0%,0%,.04);
  /* Tint shadows with brand hue for elevated surfaces, e.g.: */
  /* --shadow-brand: 0 8px 30px -4px hsla(230,80%,50%,.2); */

  /* === Z-INDEX SYSTEM === */
  --z-below:   -1;
  --z-base:     0;
  --z-raised:  10;
  --z-sticky:  100;
  --z-overlay: 200;
  --z-modal:   300;
  --z-toast:   400;

  /* === ANIMATION === */
  --duration-instant: 80ms;
  --duration-fast:    150ms;
  --duration-normal:  250ms;
  --duration-slow:    400ms;
  --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:         cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:      cubic-bezier(0.65, 0, 0.35, 1);
}
```

---

## Color System

### Rules
- **Never use raw Tailwind palette names** (indigo-500, blue-600, etc.) as primary brand color.
- Define a custom brand color and derive all variants from it using HSL rotation or lightness shifts.
- Always define semantic color tokens that map to intent, not to appearance.

```css
:root {
  /* === BRAND (replace with actual brand hue) === */
  --color-brand:         hsl(230, 72%, 55%);
  --color-brand-light:   hsl(230, 72%, 70%);
  --color-brand-dark:    hsl(230, 72%, 40%);
  --color-brand-subtle:  hsl(230, 72%, 96%);

  /* === SEMANTIC === */
  --color-success:       hsl(142, 60%, 42%);
  --color-success-bg:    hsl(142, 60%, 95%);
  --color-warning:       hsl(38, 90%, 50%);
  --color-warning-bg:    hsl(38, 90%, 95%);
  --color-error:         hsl(0, 72%, 51%);
  --color-error-bg:      hsl(0, 72%, 96%);
  --color-info:          hsl(210, 80%, 50%);
  --color-info-bg:       hsl(210, 80%, 95%);

  /* === NEUTRAL SURFACE STACK === */
  --surface-1: hsl(0, 0%, 100%);   /* page background */
  --surface-2: hsl(220, 20%, 98%); /* cards, panels */
  --surface-3: hsl(220, 14%, 96%); /* inputs, tags */
  --surface-4: hsl(220, 12%, 92%); /* hover states */

  /* === TEXT === */
  --text-primary:   hsl(220, 15%, 10%);
  --text-secondary: hsl(220, 10%, 40%);
  --text-tertiary:  hsl(220,  8%, 60%);
  --text-disabled:  hsl(220,  6%, 75%);
  --text-inverse:   hsl(0, 0%, 100%);

  /* === BORDERS === */
  --border-subtle:  hsl(220, 12%, 92%);
  --border-default: hsl(220, 10%, 85%);
  --border-strong:  hsl(220, 10%, 70%);
}

/* Dark mode — always implement this */
@media (prefers-color-scheme: dark) {
  :root {
    --surface-1: hsl(220, 16%, 10%);
    --surface-2: hsl(220, 14%, 13%);
    --surface-3: hsl(220, 12%, 17%);
    --surface-4: hsl(220, 10%, 22%);
    --text-primary:   hsl(220, 15%, 92%);
    --text-secondary: hsl(220, 10%, 65%);
    --text-tertiary:  hsl(220,  8%, 45%);
    --text-disabled:  hsl(220,  6%, 35%);
    --border-subtle:  hsl(220, 12%, 18%);
    --border-default: hsl(220, 10%, 25%);
    --border-strong:  hsl(220, 10%, 38%);
    --color-success-bg: hsl(142, 50%, 12%);
    --color-error-bg:   hsl(0, 60%, 12%);
    --color-warning-bg: hsl(38, 70%, 12%);
    --color-info-bg:    hsl(210, 60%, 12%);
  }
}
```

### Contrast Requirements (WCAG 2.1 AA)
- Normal text on background: **minimum 4.5:1 ratio**
- Large text (18px+ or 14px+ bold) on background: **minimum 3:1**
- Interactive UI components and focus indicators: **minimum 3:1**
- Use https://webaim.org/resources/contrastchecker/ to verify. No exceptions.

---

## Typography System

### Rules
- Never use the same font family for headings and body.
- Pair a display/serif/expressive font for headings with a clean sans-serif for body.
- Apply tight tracking (`letter-spacing: -0.03em`) on large headings (2xl and above).
- Generous line-height (`1.7`) on body, tighter (`1.2–1.3`) on headings.
- **Always set a max-width on prose blocks**: `max-width: 65ch` — this is the optimal reading measure. Never let a paragraph span the full page width.
- Use `clamp()` for fluid, viewport-responsive font sizes at key breakpoints.

```css
/* === Fluid heading examples === */
h1 { font-size: clamp(2rem, 4vw + 1rem, 3.5rem); line-height: 1.15; letter-spacing: -0.04em; }
h2 { font-size: clamp(1.5rem, 3vw + 0.5rem, 2.5rem); line-height: 1.2;  letter-spacing: -0.03em; }
h3 { font-size: clamp(1.2rem, 2vw + 0.5rem, 1.75rem); line-height: 1.3; }

/* === Body === */
body { font-size: var(--text-base); line-height: 1.7; color: var(--text-primary); }
p    { max-width: 65ch; }

/* === Caption / label === */
.label { font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-secondary); }
```

---

## Responsive Design

### Breakpoints
```css
/* Mobile-first — min-width approach */
/* xs:  default (0px+)    */
/* sm:  640px+            */
/* md:  768px+            */
/* lg:  1024px+           */
/* xl:  1280px+           */
/* 2xl: 1536px+           */
```

### Rules
- **Touch targets must be at least 44×44px** for any tappable element (buttons, links, checkboxes). Use padding to achieve this without affecting visual size.
- Never use hover-only interactions. All hover states must have a touch/keyboard equivalent.
- Test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), and 1440px (desktop).
- Screenshot all four viewports before marking a task complete.

---

## Accessibility (Non-Negotiable)

Accessibility is not optional. Every component must pass these checks before the task is done.

### Semantic HTML First
- Use `<button>` not `<div>` for interactive elements.
- Use `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>` for layout landmarks.
- Use heading hierarchy correctly: one `<h1>` per page, `<h2>` for sections, `<h3>` for subsections. Never skip levels.
- Form `<input>` elements must always have an associated `<label>` (either wrapping or via `for`/`id`).

### ARIA
- Only use ARIA when native HTML semantics are insufficient.
- Icons that are purely decorative: `aria-hidden="true"`.
- Icon-only buttons: add `aria-label="Description"`.
- Dynamic content that updates: use `aria-live="polite"` (or `"assertive"` for urgent alerts).
- Modals: use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal title.

### Keyboard Navigation
- Every interactive element must be reachable and operable by keyboard alone.
- Tab order must follow logical reading order — never use `tabindex` values above `0`.
- Focus must never be trapped outside a modal — implement focus trap inside modals.
- Pressing `Escape` must close modals, dropdowns, and overlays.
- Implement `focus-visible` styles (not just `focus` — `focus` fires on click too):
```css
:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
/* Remove default outline for mouse users */
:focus:not(:focus-visible) { outline: none; }
```

### Skip Navigation
Always include a skip link as the very first element for keyboard users:
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<style>
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  background: var(--color-brand);
  color: var(--text-inverse);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  z-index: var(--z-toast);
  transition: top var(--duration-fast) var(--ease-out);
}
.skip-link:focus { top: 1rem; }
</style>
```

### Color & Contrast
- Never use color as the **only** means to convey information. Always pair with icon, label, or pattern.
- All interactive states (hover, focus, error) must meet 3:1 contrast against their resting state.

---

## Motion & Animation

### Safety First
**Every animation must be wrapped in a `prefers-reduced-motion` query:**

```css
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform var(--duration-normal) var(--ease-spring); }
  .card:hover { transform: translateY(-4px); }
}
/* Outside the query: instant or no animation — always still functional */
```

### Rules
- Only animate `transform` and `opacity`. Never `transition-all`, never animate layout properties (width, height, margin, padding) — they trigger reflow.
- Use `will-change: transform` sparingly — only on elements actively animating.
- Use `--ease-spring` for elements entering or responding to user action (feels alive).
- Use `--ease-out` for elements disappearing (feels natural, not mechanical).
- Animation durations: micro-interactions (`--duration-fast: 150ms`), page transitions (`--duration-slow: 400ms`).
- **Never auto-play looping animations** without a pause control. It violates WCAG 2.2.2.

### Spring Easing Reference
```css
--ease-spring-gentle: cubic-bezier(0.34, 1.3, 0.64, 1);   /* subtle bounce */
--ease-spring-bouncy: cubic-bezier(0.34, 1.7, 0.64, 1);   /* playful bounce */
--ease-spring-stiff:  cubic-bezier(0.5, 1.0, 0.89, 1);    /* snappy, no bounce */
```

---

## Component States (Required for Every Component)

Every interactive component must have all five of these states designed and implemented:

| State    | Visual Treatment |
|----------|-----------------|
| Default  | Base design |
| Hover    | Subtle background shift or shadow lift — use `--duration-fast` |
| Active   | `scale(0.97)` + slight darkening — feels tactile |
| Focus    | 2px brand-color outline via `:focus-visible` |
| Disabled | `opacity: 0.4`, `cursor: not-allowed`, `pointer-events: none` |

### Loading States
- Any operation taking >200ms must show a loading indicator.
- Prefer **skeleton screens** over spinners for content areas (reduce cognitive load).
- Buttons that trigger async actions: replace label with spinner + "Loading…" aria-label while pending, then restore.

```html
<!-- Skeleton pattern -->
<div class="skeleton" aria-hidden="true" style="
  height: 20px; border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--surface-3) 25%, var(--surface-4) 50%, var(--surface-3) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
"></div>
@keyframes shimmer { to { background-position: -200% 0; } }
```

### Error States
- Inline form errors: red border + icon + message below the field. Never use only color.
- Page-level errors: use an alert banner with `role="alert"` so screen readers announce it.

### Empty States
- Every list, table, or data view needs an empty state. Include: icon, headline, 1-line explanation, and a CTA to add content.

---

## Visual Hierarchy System

Apply these Gestalt principles deliberately on every layout:

1. **Proximity** — group related elements, separate unrelated ones. Use consistent spacing tokens; don't eyeball.
2. **Similarity** — same visual treatment = same meaning. Every CTA button looks identical; every secondary button looks identical.
3. **Contrast** — the most important thing on the page should be the most visually distinct. One primary action per view maximum.
4. **Continuity** — guide the eye. Align elements on an invisible grid; use F/Z reading patterns to place the most critical content top-left.
5. **Enclosure** — use cards, borders, or background color to group elements into units.
6. **Figure/Ground** — modals, tooltips, and dropdowns must be clearly elevated above the base surface.

### Reading Patterns
- **F-pattern** (content-heavy pages like feeds, search results): most important info top-left.
- **Z-pattern** (landing/marketing pages with CTA): logo top-left → scan right → diagonal → CTA bottom-right.
- Place primary CTAs at the end of the user's natural eye path, not randomly.

---

## Depth & Layering System

Surfaces must communicate elevation through consistent visual cues — not arbitrary styling.

```
Layer 0 (Base):     Page background. --surface-1.
Layer 1 (Raised):   Cards, panels. --surface-2 + --shadow-sm.
Layer 2 (Floating): Dropdowns, tooltips. --surface-1 + --shadow-lg.
Layer 3 (Overlay):  Modals, drawers. Dim scrim behind. --surface-1 + --shadow-xl.
Layer 4 (Toast):    Notifications. Always on top. --surface-1 + --shadow-xl + colored accent.
```

Rules:
- Higher layers always use `box-shadow`, never `border` alone to convey elevation.
- Scrim/overlay behind modals: `background: rgba(0,0,0,0.4)` — dark and legible.
- Never let two surfaces at the same layer compete visually (e.g., a card inside a card with the same background).

---

## Anti-Generic Design Guardrails

### Colors
- Never use default Tailwind palette as primary (no indigo-500, blue-600, etc.).
- Pick a custom brand hue and derive all variants from it using HSL.
- Tint shadows with the brand hue at low opacity (e.g., `hsla(230, 80%, 50%, 0.15)`) — never use `rgba(0,0,0,x)` on colored surfaces.

### Shadows
- Never use flat `shadow-md`. Use layered shadows: one ambient layer + one direct layer.
- Shadow opacity should be 0.06–0.15. Higher opacity looks cheap.
- Dark mode: reduce shadow opacity by ~50% (shadows are less visible on dark surfaces).

### Typography
- Never use the same font for headings and body.
- Use tight tracking (`-0.03em` to `-0.05em`) on display headings only — not on body text.
- Never set body text below `16px` — `14px` is only acceptable for captions, labels, and metadata.
- Distinguish heading weights clearly: headings 700–800, body 400, UI labels 500.

### Gradients
- Layer 2–3 radial gradients from different positions to create mesh depth (not a single linear sweep).
- Add SVG noise grain for texture at `opacity: 0.03–0.05` — prevents gradient banding.
- Gradients on text: only on display headings, never on body copy.

### Animations
- Only animate `transform` and `opacity`.
- Never `transition-all`.
- Use spring-style easing (`--ease-spring`) for interactive elements.
- Stagger entrance animations (`animation-delay: calc(N * 60ms)`) for list items.

### Interactive States
- Every clickable element needs hover, `focus-visible`, and active states. No exceptions.
- Hover: subtle background shift or shadow lift.
- Active: `scale(0.97)` + darken.
- Focus: 2px brand outline with 2px offset.

### Images
- Always add a gradient overlay: `background: linear-gradient(to top, rgba(0,0,0,0.6), transparent)`.
- Add color treatment layer with `mix-blend-mode: multiply` using brand hue.
- Use `object-fit: cover` with a defined aspect ratio — never let images distort.
- Use `loading="lazy"` on all non-hero images.
- Use `srcset` and `sizes` for responsive images. Prefer WebP/AVIF format.

### Spacing
- Use only spacing tokens from the defined scale — never arbitrary `px` values.
- Internal component padding: `--space-4` to `--space-6`.
- Between components: `--space-8` to `--space-12`.
- Section breathing room: `--space-16` or more.

---

## Performance Standards

- **Font loading**: Use `font-display: swap` on all custom fonts. Preload critical fonts with `<link rel="preload">`.
- **Images**: Use `loading="lazy"` on all non-above-the-fold images. Use `width` and `height` attributes on `<img>` to prevent layout shift (CLS).
- **No layout shift**: Do not insert content above existing content after load. Reserve space for async content with min-height.
- **No render-blocking**: Scripts go at end of `<body>` or use `defer`/`async`.
- **CSS containment**: Add `contain: layout style` to isolated components (cards, widgets) to improve repaint performance.
- **Target Core Web Vitals**: LCP < 2.5s, CLS < 0.1, FID/INP < 200ms.

---

## Brand Assets
- Always check the `brand_assets/` folder before designing.
- If assets exist there: use them. Do not use placeholders where real assets are available.
- If a logo is present: use it. If a color palette is defined: use those exact values — do not invent brand colors.

---

## Hard Rules
- Do not add sections, features, or content not in the reference.
- Do not "improve" a reference design — match it.
- Do not stop after one screenshot pass.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as primary color.
- Do not use color as the only differentiator for information (accessibility).
- Do not build interactive elements without keyboard support.
- Do not skip `prefers-reduced-motion` wrapping on animations.
- Do not let paragraph text exceed `65ch` in width.
- Do not hardcode spacing in `px` — use spacing tokens.
- Do not build a component without all five states: default, hover, active, focus, disabled.
- Do not use `position: fixed` inside iframes — it collapses the viewport.
- Do not set `font-size` below `16px` on body text (14px only for labels/captions).
- Do not ship a page without testing at mobile (375px), tablet (768px), and desktop (1440px) widths.
- Do not ship without a dark mode implementation when `@media (prefers-color-scheme: dark)` is relevant.
