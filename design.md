# ChronoLoop Dashboard — Design Specification

## 1. Product Overview

**ChronoLoop** is a project and task management SaaS platform built for teams — covering task tracking, sprint planning, team collaboration, and calendar scheduling. The dashboard is the primary interface users land on after login.

**Tagline:** Build Better Projects, Collaborate Seamlessly, and Work Smarter — All in One Place.

---

## 2. Design Aesthetic & Direction

| Attribute | Decision |
|-----------|----------|
| Theme | Dark mode (primary), Light mode (toggle) |
| Tone | Professional, dense-data, slightly futuristic |
| Mood | Focused productivity tool — structured, not playful |
| Visual language | Flat cards with subtle borders on dark backgrounds, accent highlights via blue/teal |

The dashboard is a **dense information interface** — inspired by Notion + Linear aesthetics. Every section earns its space. No decorative bloat. Sharp edges, controlled density, muted backgrounds, and crisp micro-typography.

---

## 3. Color System

### Dark Theme (Default)
```
--bg-base:        #1a1a1a   /* Page background */
--bg-sidebar:     #111111   /* Sidebar background */
--bg-card:        #242424   /* Card/panel surface */
--bg-card-hover:  #2c2c2c   /* Hover state */
--bg-input:       #1e1e1e   /* Input fields */

--border-subtle:  #2e2e2e   /* Card borders */
--border-default: #3a3a3a   /* Dividers */

--text-primary:   #f0f0f0   /* Headings, strong labels */
--text-secondary: #9a9a9a   /* Subtext, metadata */
--text-muted:     #666666   /* Disabled/placeholder */

--accent-blue:    #4A90FF   /* Primary CTA, links, active states */
--accent-blue-bg: #1a2f52   /* Blue tint backgrounds */
--accent-teal:    #00D4AA   /* Progress bars, positive indicators */
--accent-orange:  #FF8C42   /* Task label chips (warm) */
--accent-red:     #FF4D4D   /* Overdue, alerts, negative delta */
--accent-green:   #22C55E   /* Positive delta, completed status */
--accent-purple:  #A855F7   /* Sprint/tag chip (secondary) */
--accent-cyan:    #06B6D4   /* Calendar task pill (accent) */
--accent-yellow:  #EAB308   /* Warning/medium priority */

--nav-active-bg:  #2a4a8a   /* Active sidebar item bg */
--nav-active-text:#ffffff   /* Active sidebar item text */
```

### Light Theme
```
--bg-base:        #f5f5f5
--bg-sidebar:     #ffffff
--bg-card:        #ffffff
--border-subtle:  #e5e5e5
--text-primary:   #111111
--text-secondary: #555555
```

---

## 4. Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Logo wordmark | `Syne` | 700 | 18px |
| Page heading (Hello, Welcome) | `Syne` | 600 | 22px |
| Section heading | `Syne` | 600 | 14px |
| Stat number (KPI cards) | `DM Mono` or `Syne` | 700 | 28px |
| Body / Label | `DM Sans` | 400 | 13–14px |
| Meta / timestamp | `DM Sans` | 400 | 11–12px |
| Button text | `DM Sans` | 500 | 13px |
| Calendar date | `DM Mono` | 500 | 11px |

Import from Google Fonts: `Syne`, `DM Sans`, `DM Mono`.

---

## 5. Spacing & Grid

- **Layout grid:** 3-column — Sidebar (240px fixed) + Main content area (fluid)
- **Main content padding:** 28px horizontal, 24px vertical
- **Card gap:** 12px
- **Card padding:** 20px
- **Border radius (cards):** 10px
- **Border radius (chips/pills):** 6px
- **Border radius (buttons):** 8px
- **Border radius (inputs):** 24px (pill shape for search)

---

## 6. Layout Structure

```
┌────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)  │  MAIN CONTENT AREA (fluid)   │
│  ─────────────────────  │  ──────────────────────────   │
│  Logo                   │  TOP BAR                      │
│  ─────────────────────  │    Search | Avatars | Share   │
│  Nav: Dashboard         │    Notifications | User       │
│  Nav: Tasks             │  ──────────────────────────   │
│  Nav: Projects          │  GREETING + ACTION BAR        │
│  Nav: Sprints           │    Hello [Name] | Add Task    │
│  Nav: Team              │    Year selector | Filter     │
│  Nav: Reports           │  ──────────────────────────   │
│  Nav: Integration       │  KPI STAT CARDS (5 cols)      │
│  Nav: Settings          │  ──────────────────────────   │
│  ─────────────────────  │  CRITICAL PROJECTS | TEAM     │
│  Light / Dark toggle    │  ──────────────────────────   │
│  Invite teammates       │  CALENDAR VIEW                │
└────────────────────────────────────────────────────────┘
```

---

## 7. Component Specifications

### 7.1 Sidebar
- Fixed left, full height, `#111111` bg
- Logo: dot-grid icon + "CHRONOLOOP" wordmark (Syne Bold)
- Nav items: icon (lucide) + label, 44px height
- Active state: blue-bg pill `#2a4a8a`, white text
- Hover state: `#1e1e1e` bg tint
- Bottom section: theme toggle + "Invite teammates" CTA

### 7.2 Top Bar
- Full width strip at top of content area
- Left: pill-shaped search input with search icon
- Center-right: team member avatar cluster (3–4 stacked)
- Right: "Share" button (blue, with share icon), bell icon (with notification badge), user avatar + dropdown caret

### 7.3 Greeting + Action Bar
- Left: "Hello [Name]," + "Welcome Back," (bold, large)
- Right: "Add Task" button (blue, `+` prefix, with dropdown caret), Year selector, Filter, Export Data buttons

### 7.4 KPI Stat Cards (5 cards in a row)
Each card:
- White label: `To-do`, `Total Project`, `Assigned Tasks`, `Completed Task`, `Overdue Tasks`
- Large number in bold
- Icon (right-aligned, circle bg)
- Delta indicator: green arrow + text for up, red for negative/overdue
- `--bg-card` background, subtle border

| Card | Icon Style |
|------|-----------|
| To-do | Clipboard |
| Total Project | Briefcase |
| Assigned Tasks | Document |
| Completed Task | Checkmark clipboard |
| Overdue Tasks | Clock |

### 7.5 Critical Projects Panel
- Left panel (~60% width), "Critical Projects" heading + "This week" dropdown
- Each project row: title (bold) + client tag (blue link) + due date — with 3-dot overflow menu
- "Sell All" CTA at bottom of list
- Rows have subtle bottom border dividers

### 7.6 Team Status Panel
- Right panel (~38% width), "Team Status" heading + "Developer" filter dropdown
- "Select Project" secondary dropdown
- Progress bar (green, `85%` label) + "View Activity" link
- Team member grid: avatar + name + email (2×3 grid), last cell = "+ Add Individual"

### 7.7 Calendar View
- Full width panel
- Header: "Calendar View" + "This week" dropdown
- Month/year header: "NOVEMBER 2024"
- Day columns: Fri–Tue spanning 3 weeks worth of days
- Task pills: colored horizontal bars spanning relevant days
  - Orange pill: Homepage for CareyCare App — Task 1
  - Red/coral pill: Develop Landing Page for Eatz Website — Task 2
  - Magenta/pink pill: Finalize User Onboarding Flow — Task 4
  - Blue pill: Prepare Marketing Assets for ChronoLoop Launch — Task 3
  - Cyan pill: Integrate Payment Gateway for E-commerce App — Task 5
- Task pills have task number badge on right edge

---

## 8. Interactive States

| Element | Hover | Active | Focus |
|---------|-------|--------|-------|
| Nav items | `#1e1e1e` bg | `#2a4a8a` bg, white text | outline-none |
| Buttons | 8% lighter bg | scale(0.97) | ring-2 ring-blue |
| Cards | shadow elevation increase | — | — |
| Project rows | `#2c2c2c` bg | — | — |
| Calendar task pills | opacity 0.85 + tooltip | — | — |

---

## 9. Icons

Use **Lucide Icons** throughout. Key mappings:

| Location | Icon |
|----------|------|
| Dashboard nav | `LayoutDashboard` |
| Tasks nav | `CheckSquare` |
| Projects nav | `Briefcase` |
| Sprints nav | `Zap` |
| Team nav | `Users` |
| Reports nav | `BarChart2` |
| Integration nav | `GitMerge` |
| Settings nav | `Settings` |
| Search | `Search` |
| Notifications | `Bell` |
| Share | `Share2` |
| Add Task | `Plus` |
| Export Data | `Upload` |
| Filter | `SlidersHorizontal` |
| Calendar | `Calendar` |
| Light mode | `Sun` |
| Dark mode | `Moon` |

---

## 10. Motion & Animation

- **Sidebar nav items:** fade-in on load with staggered `animation-delay` (50ms per item)
- **KPI cards:** count-up animation on number display (300ms ease-out)
- **Progress bar (Team Status):** width transition from 0% → 85% on mount (600ms ease)
- **Calendar pills:** slide-in left → right on mount (400ms staggered)
- **Theme toggle:** smooth background color transition (200ms)
- **Hover on cards:** `transform: translateY(-1px)` + slight shadow increase (150ms)

---

## 11. Responsive Behavior

| Breakpoint | Behavior |
|-----------|---------|
| `>= 1280px` | Full layout as described |
| `1024–1279px` | KPI cards wrap to 3-col, calendar scrollable |
| `768–1023px` | Sidebar collapses to icon-only mode |
| `< 768px` | Mobile: sidebar becomes bottom tab bar |

---

## 12. Accessibility

- All interactive elements keyboard-navigable
- WCAG 2.1 AA contrast ratios on all text
- ARIA labels on icon-only buttons (search, bell, share)
- Focus rings visible in all interactive states
- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<section>`

---

## 13. Assets & External Resources

- **Fonts:** Google Fonts CDN — `Syne`, `DM Sans`, `DM Mono`
- **Icons:** Lucide Icons (React package `lucide-react` or CDN)
- **Avatar placeholders:** Use initials-based generated avatars or `/api/placeholder/32/32`
- **Logo dot-grid:** Custom SVG (concentric dot grid in blue, defined inline)

---

## 14. File Structure (for implementation)

```
chronoloop-dashboard/
├── index.html              # Entry point
├── src/
│   ├── App.jsx             # Root layout
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   ├── GreetingBar.jsx
│   │   ├── KpiCards.jsx
│   │   ├── CriticalProjects.jsx
│   │   ├── TeamStatus.jsx
│   │   └── CalendarView.jsx
│   ├── styles/
│   │   ├── tokens.css       # CSS variables
│   │   └── global.css       # Reset + base
│   └── data/
│       └── mockData.js      # Static mock data
└── public/
    └── favicon.ico
```
