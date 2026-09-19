# Repository Guidelines

## Scope and Source of Truth

This repository is a Vite/React/TypeScript personal meal-decision assistant. Before changing product behavior, read the relevant specifications in `00_contexto/` through `11_prompts/`. `12_fuentes_dieta/dieta.docx` is now the primary diet source; `DietaCompleta.docx` and the other documents remain historical validation material. Never modify the original specification or diet files.

## Product Invariants

- This is a personal decision assistant, not a generic recipe catalogue.
- The five main slots are always available: `Desayuno`, `Medio día`, `Comida`, `Media tarde`, and `Cena`. Time only selects the initial suggestion; it never filters or blocks another slot.
- Model a complete `MealOption` with ordered `DishComponent` records and `DishIngredient` records. A meal may include a main dish, side, salad, drink, dressing, or fruit.

## Data Fidelity

Preserve grams, milliliters, household measures, brand text, notes, and original ingredient text. Keep uncertain variants separate; aliases may improve search and grouping but must not silently change the plan. Do not invent substitutions, steps, quantities, or conversions. Import runs must expose warnings and ambiguous lines for human review.

## UX, Performance, and Compatibility

The frontend is critical: build a clear consumer-app experience with cards, touch targets of at least 44px, keyboard/focus states, loading/error/empty states, and restrained `transform`/`opacity` animation. The real target is iPad Air on iOS 12.5.8 Safari. Modern browsers may receive enhanced effects, but legacy browsers must retain the same core functions with safe fallbacks.

## Architecture and Security

Use Vite, React, and TypeScript with a legacy build. Keep business logic separate from UI, cache catalog data locally, and do not load any Supabase SDK in the client. There is intentionally no application authentication, user model, session, JWT, cookie, or identity-based RLS: this is a private single-user app. The BFF alone accesses Supabase with `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY`; these must never enter browser code, `VITE_*` variables, responses, or client storage. Validate API methods and payloads because the BFF has no user-authentication layer.

## Workflow and Validation

Keep source catalog data distinct from user state such as favorites, pantry, ratings, history, and temporary dismissals. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before handoff. Follow `09_testing/TEST_PLAN.md` and `10_fases/DEFINITION_OF_DONE.md`; every feature must be checked on desktop, mobile, and the target iPad. Use focused commits such as `docs: clarify import validation`.

## Macrofase D Rules

- IndexedDB/session cache is read-only for offline use; favorites, pantry, history, weekly plans, and CRUD always require a confirmed BFF response.
- `GET /api/health` must remain a small, secret-free Supabase connectivity check.
- Keep ETag/catalog versioning and explicit pagination for large Supabase REST reads; never assume the provider returns more than one 1,000-row page.
