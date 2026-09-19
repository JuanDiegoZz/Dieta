# Macrofase B Data Integration Implementation Plan

> **For agentic workers:** Execute this plan in the current session. Do not add authentication or begin Macrofase C.

**Goal:** Parse `DietaCompleta.docx` reproducibly, store its real catalog in Supabase through a server-only BFF, and connect Today, Explore, detail, Kitchen Mode, Favorites, and History to persistent data.

**Architecture:** A local Node importer produces reviewable JSON and SQL-ready records. Vercel Functions call Supabase PostgREST with server-only credentials. The browser uses same-origin `fetch`, a session cache, and optimistic local state; it never receives Supabase keys or loads `supabase-js`.

**Tech Stack:** Existing Vite/React/TypeScript/pnpm stack, `mammoth` for DOCX text extraction, native `fetch`, Supabase PostgREST, Vercel Node handlers, Vitest, and IndexedDB with an in-memory/session fallback.

**Spec:** `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, `TECHNICAL_DECISIONS.md`, `00_contexto/`, `01_producto/`, `02_datos/`, `03_logica/`, `06_backend/`, `07_importacion/`, `08_admin/`, `09_testing/`, `10_fases/`, and `12_fuentes_dieta/`.

## Global Constraints

- No authentication, users, roles, sessions, JWTs, cookies, RLS identity, or `supabase-js` in the browser.
- Preserve source file, paragraph/block index, raw text, slot, component labels, quantities, units, household measures, notes, and warnings.
- Equal titles are not identifiers; stable source keys include source file, daily-plan index, slot, option position, and a content hash.
- Parse and validate never write Supabase; import is the only explicit seed command and requires server-side environment variables.
- Existing frontend visual language remains intact; adapt only data states and controls required by real data.

### Task 1: Importer contracts and DOCX parser

Create parser types, normalization/quantity helpers, a conservative daily-plan/slot/component parser, stable keys, and tests for quantities, slots, aliases, fused lines, multiple components, notes, and warnings.

### Task 2: Parse, validate, and inspect real output

Add `diet:parse` and `diet:validate`, generate `scripts/import-output/*.json`, compare counts against the source structure and document subsets, and fail validation for missing plans/slots or malformed records without guessing.

### Task 3: Supabase schema and explicit import

Create SQL migrations for provenance, catalog, preferences, history, tags, and updated timestamps. Add `.env.example`, ignore secrets, and an idempotent `diet:import` script that upserts by stable source keys only after validation.

### Task 4: BFF and DTO mapping

Add `api/bootstrap.ts`, preference/history handlers, shared server validation and PostgREST helpers. Return compact nested bootstrap data and generic 4xx/5xx errors without credentials or internal details.

### Task 5: Real frontend data and persistence

Add a small API client and session cache, load bootstrap with loading/error/retry/empty states, map DTOs to existing domain types, and preserve mock fixtures as test fallback only.

### Task 6: Personalization and pages

Implement optimistic favorite/hidden/rating writes, history creation/deletion, recency labels and no-repeat scoring, then replace Favorites and History placeholders while reusing existing cards/detail components.

### Task 7: Verification and documentation

Run importer statistics plus `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; report real counts, warnings, payload/bundle sizes, manual Supabase setup, remaining risks, and Macrofase C in `PROJECT_STATUS.md`.
