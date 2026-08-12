# ChronoLoop Frontend Rewrite — Backlog

Running list of parked/flagged items from the `CHRONOLOOP-frontend` rewrite. Not tracked via git history because this is a multi-phase project — check here first before assuming something was missed.

Each item: what, where it was noticed, why it was parked instead of fixed inline.

## From Phase 1 review

- [ ] **Avatar fallback gradient** — `TopBar.tsx`'s team-avatar cluster and user-avatar button (`src/components/layout/TopBar.tsx`) render a bare `<img>` with no `onError` handling. If an avatar file 404s or fails to load, the user sees a broken-image icon instead of an initials-on-gradient placeholder. Parked because a real fallback belongs with the `Avatar` design-system primitive (Phase 2), not bolted onto TopBar directly.

- [ ] **Test-ordering footgun in `App.test.tsx`** — `useThemeStore` (`src/store/themeStore.ts`) is a module-level Zustand singleton with no reset between tests. `themeStore.test.tsx` resets it explicitly in `beforeEach`, but `App.test.tsx` does not. Any future test in that file that clicks a theme toggle (via `Sidebar`) will leak `theme` state into later tests in the same run, order-dependent and hard to debug. No visible failure yet — flagged so the next person adding an App-level test doesn't get bitten.

- [ ] **README polish** — `CHRONOLOOP-frontend/README.md` covers structure/setup/extension points adequately but wasn't given a final editing pass (tone, redundant phrasing, missing "Testing" conventions section). Cosmetic, deferred rather than blocking Phase 1 sign-off.

- [ ] **Focus-ring / parity conflict** — `global.css`'s `:focus-visible` rule (`outline: 2px solid var(--accent-blue); outline-offset: 2px; border-radius: 4px;`) hardcodes a 4px radius, but several ported components (nav items, buttons) use their own radius (e.g. Sidebar `.navItem` at 8px). The focus ring's corner radius doesn't match the element it outlines on those components. Original `index.html` may have had the same mismatch (true parity) or may not have — not yet verified against the source. Needs a decision in Phase 2 when Button/other primitives formalize focus styling.

- [ ] **Avatar payload size** — `public/avatars/*.png` are 600KB–1MB each (5 files, ~4MB total) for images displayed at 28–36px. Never compressed/resized after being copied from the old repo. Deferred because it's asset pipeline work, not component work, and doesn't block Phase 1/2 functionality.

## From Phase 1 scaffold plan

- [ ] **"Integration" label inconsistency** — the sidebar nav label for the integrations page reads "Integration" (singular), matching `index.html`'s original text verbatim (see `Sidebar.tsx` `NAV_ITEMS`, and the original at `index.html:3001-3003`), while the route (`/integrations`), the page component (`IntegrationsPage`), and the rest of the design doc use "Integrations" (plural). Preserved as literal parity rather than silently "fixed." Needs a product-owner call: keep the original typo, or correct it now that it's been surfaced.

- [ ] **Theme not persisting on reload** — `themeStore.ts`'s `useThemeStore` has no `localStorage`/`persist` middleware, matching `index.html`'s original `setTheme()` (which also doesn't persist — always resets to `dark` on full page load). Intentional parity, not a bug, but flagged because it's the kind of thing a product owner may want changed now that it's a proper SPA. If persistence is wanted, it's a deliberate behavior change beyond parity — call it out explicitly before adding it.

## From Phase 3.1 (Dashboard)

- [ ] **Team grid email vs. member-detail email mismatch** — `src/data/mockDashboardTeam.ts`'s `gridEmail` (`'Joedoe@gmail.com'`, shown under every name in the Team Status grid) and `detailEmail` (each person's real address, shown in the Member Detail modal) come from two different hardcoded sources in the original (`index.html:3247,3252,3257,3262` vs. `index.html:6639-6644`). Preserved as literal parity rather than silently unified. Needs a product-owner call: keep both, or make the grid show the real per-person email now that it's centralized in one data file.

- [ ] **Three-dot project-row menu is always visible, not hover-revealed** — `CriticalProjectsPanel.module.css`'s `.threeDotBtn` omits the original's `opacity: 0` / `.row:hover { opacity: 1 }` treatment (`index.html:544,548`) so keyboard and touch users can reach it. Deliberate accessibility improvement over strict parity, not an oversight — flagged in case a visual diff review calls it out as a regression.
