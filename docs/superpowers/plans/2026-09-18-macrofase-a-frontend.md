# Macrofase A Frontend Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current session. Steps use checkbox syntax for tracking.

**Goal:** Deliver a responsive, fast frontend prototype with mock diet data, local search, core navigation, detail view, and Kitchen Mode.

**Architecture:** A small Vite + React + TypeScript SPA owns presentation and pure local domain rules. The prototype uses fixtures and browser-local state only; Supabase, Vercel Functions, authentication, and real document import remain out of scope.

**Tech Stack:** pnpm, Vite, React, TypeScript, official React and legacy Vite plugins, ESLint, native CSS, and a minimal test runner for pure domain behavior.

**Spec:** `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, `TECHNICAL_DECISIONS.md`, `01_producto/`, `03_logica/`, `04_ux_ui/`, `05_compatibilidad/`, `09_testing/`, and `10_fases/`.

## Global Constraints

- All five meal slots remain reachable; the clock only selects the initial slot.
- Mock data must preserve `MealOption -> DishComponent -> DishIngredient`, quantities, household measures, notes, and aliases.
- No login, Supabase SDK, Supabase credentials, BFF, real import, or sensitive browser configuration.
- Use system fonts, 44px minimum touch targets, native CSS, and `transform`/`opacity` animation with reduced-motion support.
- Generate a legacy bundle targeting Safari/iOS 12-era browsers and keep modern-only effects non-critical.

### Task 1: Tooling and legacy build

Create `package.json`, `pnpm-lock.yaml`, `index.html`, `tsconfig*.json`, `vite.config.ts`, ESLint configuration, and `src/main.tsx`. Configure React, legacy targets, scripts for `dev`, `build`, `lint`, `typecheck`, and `test`.

### Task 2: Domain fixtures and tests

Create `src/domain/types.ts`, `src/domain/slots.ts`, `src/domain/search.ts`, `src/data/mockData.ts`, and focused tests for time-based initial slot selection, all-slot availability, title/component/ingredient/alias search, and multi-token ranking. Run the tests red before implementing each pure rule, then green.

### Task 3: Design system and reusable UI

Create tokens/base styles plus `Icon`, `MealTabs`, `MealCard`, `SkeletonCard`, `EmptyState`, and navigation components. Keep icons as inline SVG and expose normal, hover, pressed, focus, disabled, loading, and selected states.

### Task 4: App shell and screens

Create route state using the History API and implement Today, Explore, detail, Kitchen Mode, and visual placeholder screens for Pantry, Favorites, Week, History, and Admin. Keep search local and reuse the same meal card/detail data.

### Task 5: Responsive and progressive enhancement pass

Tune desktop sidebar, mobile bottom navigation, tablet/iPad layout, horizontal slot tabs, kitchen targets, 320px–ultrawide breakpoints, reduced motion, and legacy-safe CSS/JS fallbacks. Avoid blur, `:has()`, container queries, and required hover behavior.

### Task 6: Verification and status

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; inspect output sizes and verify modern/legacy assets. Update `PROJECT_STATUS.md` with dependencies, architecture, responsive strategy, legacy strategy, bundle results, risks, and the next macrofase.
