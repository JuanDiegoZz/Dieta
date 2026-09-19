# Dieta Personal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast personal meal-decision assistant that represents the real diet faithfully, works offline for reads, and remains usable on iPad Air iOS 12.5.8 Safari.

**Architecture:** A Vite/React/TypeScript SPA renders the shell and feature screens. A small Vercel API layer returns compact catalog/personal-state DTOs and validates writes before talking to Supabase. Macrofase B uses an in-memory/sessionStorage catalog cache plus `public/catalog.json` fallback; IndexedDB remains a Macrofase D enhancement.

**Tech Stack:** Vite, React, TypeScript, Vercel, Supabase/Postgres, browser IndexedDB, native `fetch`, and a small legacy build generated with `@vitejs/plugin-legacy`. No UI kit, router, image pipeline, or large state library is required for V1.

**Spec:** `00_contexto/` through `11_prompts/`; source material in `12_fuentes_dieta/`.

## Global Constraints

- The five main meal slots are always accessible; time only suggests the initial slot.
- `dieta.docx` is the current import source of truth; `DietaCompleta.docx` and other diet files remain validation/history material.
- Preserve original quantities, household measures, brands, notes, and raw ingredient text.
- Do not invent substitutions, quantities, cooking steps, or silent normalizations.
- The real compatibility target is iPad Air, iOS 12.5.8, Safari.
- The initial bundle should target the documented `<150 KB` compressed app-shell goal when viable.
- There is intentionally no application authentication, user model, session, JWT, cookie, or identity-based RLS.
- Supabase private credentials exist only in Vercel server-side environment variables; they never use a `VITE_*` prefix or enter browser code.

## 1. Proposed Repository Structure

```text
src/
  App.tsx              shell orchestration and route state
  domain/              types and pure search/recommendation/planning rules
  features/            today, explore, pantry, favorites, history, week, admin, kitchen
  components/          small reusable cards, tabs, states, controls
  data/                API client, cache, DTO mapping, sync status
  styles/              tokens, base styles, legacy-safe responsive CSS
api/                   Vercel handlers and server-side Supabase access
scripts/diet/          local DOCX parser, validation, report and seed preparation
supabase/migrations/  SQL schema
tests/                 domain/importer tests and fixtures derived from reviewed data
```

Keep catalog entities, installation state, and transport DTOs separate. Do not place parsing or recommendation rules inside React components.

## 2. Frontend

Start with the app shell, Today, and Explore. Use a small route map backed by the History API; add a routing dependency only if deep-link requirements justify it. Keep slot tabs horizontal and touch-scrollable on narrow screens. `Hoy` selects the configured slot from the local clock but always renders all five tabs.

Cards should expose title, component summary, pantry status, favorite state, last-eaten information, and one quick action. Details and Kitchen Mode show the complete component/ingredient hierarchy, exact quantities, notes, and large controls. Kitchen Mode must not depend on hover.

Represent UI states explicitly: loading, stale cache, empty, error, optimistic success, and pending write. Use system fonts, a small SVG icon set, 44px minimum touch targets, and reduced-motion behavior. Modern-only effects are optional; core layout and actions need non-modern fallbacks.

## 3. Backend and API

Use Vercel as the static host and a thin API boundary:

- `GET /api/bootstrap`: versioned catalog, preferences, and recent history for the single private installation.
- `POST /api/history`: record “Preparé esto”.
- `PATCH /api/preferences/:mealOptionId`: favorite, rating, hidden, or temporary dismissal.
- `DELETE /api/history/:id`: remove an accidental history entry.
- `PATCH /api/pantry/:ingredientId`: update `Tengo`, `No tengo`, and optional `Usar pronto`.
- `GET/POST /api/weekly`: read or persist a generated weekly plan.
- `PATCH/DELETE /api/weekly/entries/:id`: lock, change, or clear a weekly entry.
- `POST/PATCH /api/meals` and `/api/components`: CRUD for administration.
- `POST /api/meals` and `PATCH/DELETE /api/meals/:id`: create, edit, deactivate, and reactivate meals.
- `POST /api/ingredients`: find-or-create a canonical ingredient by normalized name.
- `GET /api/search?q=` remains optional; V1 search should run locally after bootstrap.

There are no protected-by-user endpoints because there is no user-authentication layer. The app is private by deployment and operational scope, not by an in-app login. If the Vercel URL is publicly reachable, anyone who knows it can call these endpoints; use Vercel project/deployment access controls or a private deployment if that exposure is unacceptable.

### Server-side data flow

1. The browser calls the same-origin BFF with native `fetch` and receives only the requested DTO.
2. The Vercel Function validates HTTP method, body shape, IDs, limits, and allowed operations.
3. The Function reads `SUPABASE_URL` and server-only `SUPABASE_SECRET_KEY` from runtime environment variables, then calls Supabase using server-side `fetch`. `SUPABASE_SERVICE_ROLE_KEY` is accepted only as a temporary legacy fallback.
4. Supabase responses are mapped to compact API responses; private keys and internal errors never leave the Function.

The BFF may use a server-only Supabase client later if it demonstrably reduces code, but native server `fetch` is the default. Supabase secret keys are allowed only in Vercel Functions and controlled import/admin scripts; they are never exposed to the browser. No request forwards a user JWT, and no table relies on `auth.uid()` or identity-based RLS.

## 4. Domain and Database Model

Keep the requested hierarchy:

```text
SourceMenu (provenance)
  -> MealOption (slot-level choice)
      -> DishComponent (ordered, possibly unnamed or labeled)
          -> DishIngredient (raw quantity + canonical link)
```

Use `daily_plans`, source order, source hash, and raw text so the repeated “Plan de Alimentación Diario” blocks remain reconstructable. `DishComponent.source_label` may be null when the document has no explicit label; do not invent a component name just to satisfy the UI.

Catalog tables: `daily_plans`, `meal_options`, `dish_components`, `ingredients`, `ingredient_aliases`, and `dish_ingredients`. Installation-state tables now include `meal_preferences`, `meal_history`, `pantry_items`, `weekly_plans`, and `weekly_plan_entries`; `favorite` and `hidden` live in preferences, not in `meal_options`.

`DishIngredient` stores numeric amount/unit when confidently parsed, household amount/unit as text, `original_text`, optional/importance, and a parse-status/warning. Never convert a solid measured in `ml`, and never merge brand-specific or preparation-specific variants without an explicit mapping.

Shopping lists are derived from weekly-plan items. Sum only identical ingredient identities with compatible mass or volume units; retain incompatible household measures as separate lines.

## 5. Legacy, Session Persistence, and Caching Strategy

Generate modern and legacy chunks with `@vitejs/plugin-legacy`, explicitly targeting iOS Safari 12.5-era browsers and testing the actual iPad. Treat polyfills as necessary but insufficient: audit `fetch`, IndexedDB, storage, date handling, observers, CSS, forms, and modals on the target.

The legacy browser executes only the app shell, native `fetch`, JSON, and the small cache wrapper. It does not load Supabase SDK code, handle login, decode JWTs, store credentials, or manage cookies.

The current online read path is:

```text
open -> render session/in-memory bootstrap -> call BFF -> update cache -> refresh UI
```

Use sessionStorage with an in-memory fallback for the first real-data release; never cache Supabase private credentials. If the BFF is unavailable, the app uses cached data or the generated `public/catalog.json`. Offline writes are not queued yet and surface an error; IndexedDB/read-write queues are deferred to Macrofase D.

V1 keeps writes online-only. A later write queue needs an idempotency key, retry state, and visible pending/error feedback.

## 6. Importer

The importer is a local, review-first tool, never a browser feature. Parse `dieta.docx` by source block, slot heading, meal/component heading, ingredient line, and note. Handle bullets, lines accidentally concatenated by document formatting, `Acompañamiento`, drinks, optional dressings, and multiple components in one slot.

Each run emits `valid`, `warnings`, and `unparsed` records plus source hash and source location. Examples that must warn rather than guess include `cantidad no especificada`, “aproximadamente” measures, brand variants, conflicting names, and unrelated notes. Compare the separated DOCX files against the primary output; use the PDF as visual/supplementary validation, not as the primary parser input.

## 7. Testing and Delivery Phases

Use native Node tests for pure domain/importer rules unless the scaffold demonstrates a smaller existing option. Keep a manual UI matrix for 320px, 375–430px, iPad portrait/landscape, desktop 1366px, ultrawide, reduced motion, keyboard, offline read, and real iOS 12 Safari. Test search, all slot navigation, pantry ranking, history/recency, CRUD, weekly locks, cache fallback, and API validation.

Implementation order:

- [x] Phase 0: scaffold, design tokens, legacy build, server-only environment handling, and baseline tests.
- [x] Phase 1: read-only importer, report review, provenance, normalization mappings, and seed preparation.
- [x] Phase 2: Today, Explore, detail, slot tabs, local search, and Kitchen Mode with real catalog fallback.
- [x] Phase 3: favorites, ratings, hidden options, history, and no-repeat scoring.
- [x] Phase 4: pantry, weighted compatibility, recommendations, and “No sé qué comer”.
- [x] Phase 5: weekly planning, locks, regeneration, and derived shopping list.
- [x] Phase 6: CRUD and admin editing with provenance preservation markers.
- [x] Phase 6b: cache de lectura, versionado, offline read-only y legacy performance pass.
- [x] Phase 7: pulido visual/accesible y preparación de producción; queda únicamente la validación física final en el iPad.

Las macrofases A y B están aprobadas. La Macrofase C está implementada con migración aditiva `002_macrofase_c.sql`, despensa, recomendaciones, planificación, lista del súper y administración. Falta ejecutar esa migración en Supabase y validar físicamente Safari iOS 12.5.8; la optimización final pertenece a Macrofase D.
## Local development and list UX correction

- `pnpm dev` runs `scripts/dev.ts`, a single Node process that mounts Vite middleware and the existing `api/*.ts` handlers at `/api/*`.
- `pnpm dev:vite` intentionally runs only Vite for visual work; it must not be used to validate persistence.
- `.env.local` is parsed server-side by the local adapter. `SUPABASE_SECRET_KEY` never enters the browser bundle.
- `public/catalog.json` is a read-only catalog fallback. Development displays `API`, `Cache`, or `Fallback local`; mutations roll back when the BFF is unavailable.
- Explore applies search, filters, and recommendation ranking before paginating 12 cards per page. Favorites, History, Admin, and Pantry use bounded pagination where their lists can grow; Today and Week remain summarized.
- `pnpm smoke:api` checks GET bootstrap/weekly and validation responses for write routes without mutating Supabase.

## Macrofase D stabilization decisions

- The client uses a small native IndexedDB wrapper for a persistent bootstrap cache, with sessionStorage and memory fallbacks when IndexedDB is unavailable.
- Bootstrap uses stale-while-revalidate behavior, stable catalog/state versioning, and an ETag. A 304 keeps the cached payload without downloading it again.
- Supabase REST reads that can exceed the provider page limit use the shared `selectAllRows` helper; writes remain online-only and are never queued.
- Offline reads show cached catalog data and a discreet connection status. Offline mutations are rejected before optimistic state changes.
- `/api/health` checks API and Supabase reachability without returning secrets. Vercel serves hashed assets with immutable caching and API routes with `no-store`.
- Legacy mode is capability-detected, not user-agent-driven. It reduces animation/effect cost while preserving the same navigation and actions.
