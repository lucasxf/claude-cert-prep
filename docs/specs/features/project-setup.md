# Project Setup & Infrastructure

> **Status:** Implemented
> **Created:** 2026-04-10
> **Implemented:** 2026-04-10

---

## Context

Greenfield project. The design doc (`CCAF_SIMULATOR_PROMPT.md`) defined the original CLI-based architecture. This spec establishes the scaffolding for the web frontend pivot: Next.js 16, SQLite, TypeScript, and shared types — the foundation every other spec depends on.

No UI pages are delivered here — only configs, the database layer, seed data, and type definitions.

**Related:**
- `CCAF_SIMULATOR_PROMPT.md` — original design doc (SQL schema, type definitions, seed questions)
- `docs/plans/web-frontend-pivot.md` — pivot decision and rationale

---

## Requirements

### Functional

- [ ] FR1: Next.js 16 (App Router) project initialized with TypeScript strict mode and ESM modules
- [ ] FR2: Tailwind CSS configured
- [ ] FR3: Vitest configured for unit tests; coverage reporting enabled
- [ ] FR4: SQLite database initialized from `src/db/schema.sql` on first run
- [ ] FR5: Database wrapper module (`src/db/database.ts`) with constructor injection pattern
- [ ] FR6: All shared TypeScript types defined in `src/types.ts` (Question, Domain, Scenario, ExamResult, ExamSession)
- [ ] FR7: Static reference data files: `data/domains.json`, `data/scenarios.json`
- [ ] FR8: Seed data: 30+ initial questions in `data/sample-questions.json`
- [ ] FR9: `npm run seed` script populates the database from seed JSON
- [ ] FR10: ESLint and Prettier configured, rules consistent with CLAUDE.md conventions

### Non-Functional

- [ ] NFR1: All entity IDs are UUID v7 (time-ordered)
- [ ] NFR2: Database file at `data/ccaf.db` — gitignored, created on first run
- [ ] NFR3: `better-sqlite3` operations are synchronous (no async wrappers needed)
- [ ] NFR4: TypeScript compilation must pass with zero errors before any commit

---

## Technical Constraints

**Stack:** Infrastructure / Web

**Technologies:**
- Node.js 20+
- Next.js 16 + React 19
- TypeScript 5 (strict mode, `"moduleResolution": "bundler"`)
- Tailwind CSS 4
- `better-sqlite3` + `@types/better-sqlite3`
- `uuid` (v7)
- `vitest` + `@vitest/coverage-v8`
- ESLint 9 + `eslint-config-next`
- Prettier

**Integration Points:**
- All other specs depend on the types defined here
- All other specs depend on the database layer defined here

**Out of Scope:**
- Any UI pages or API routes
- MCP server setup
- Question generator setup
- Authentication

---

## Acceptance Criteria

### AC1: Project builds cleanly
**GIVEN** a fresh clone of the repository
**WHEN** `npm install && npm run build` is executed
**THEN** the build completes with zero TypeScript errors and zero lint errors

### AC2: Database initializes on first run
**GIVEN** no `data/ccaf.db` file exists
**WHEN** the Next.js dev server starts (or seed script runs)
**THEN** the database file is created with the correct schema (all tables and indices present)

### AC3: Seed script populates questions
**GIVEN** a fresh database
**WHEN** `npm run seed` is executed
**THEN** the `questions` table contains 30+ rows covering all 5 domains

### AC4: Types are exhaustive
**GIVEN** the `src/types.ts` file
**WHEN** TypeScript compiles
**THEN** all interfaces (Question, Domain, Scenario, ExamSession, ExamResult) compile without errors and cover all fields from the original design doc

### AC5: Tests pass
**GIVEN** the project is set up
**WHEN** `npm test` is executed
**THEN** all tests pass (at minimum: database wrapper unit tests, type validation tests)

---

## Implementation Approach

### Architecture

The database layer is a singleton class instantiated at module load time:

```
src/db/
  schema.sql        — DDL for all tables + indices
  database.ts       — DatabaseClient class (wraps better-sqlite3, provides typed query methods)
  seed.ts           — reads data/sample-questions.json, inserts into questions table

data/
  ccaf.db           — gitignored, created at runtime
  domains.json      — 5 domains with weights and task statements
  scenarios.json    — 6 production scenarios
  sample-questions.json — 30+ seed questions

src/types.ts        — all shared interfaces and union types
```

The `DatabaseClient` in `database.ts` exposes typed methods for each query pattern (no raw SQL in application code). Methods are synchronous (better-sqlite3 is synchronous by design).

### Test Strategy

- [ ] Partial TDD (tests first for: `database.ts` wrapper methods, `src/types.ts` conformance)

### File Changes

**New:**
- `package.json` — dependencies and scripts
- `tsconfig.json` — strict TypeScript config
- `next.config.ts` — Next.js config (ESM, no src directory alias needed)
- `tailwind.config.ts` — Tailwind config
- `vitest.config.ts` — Vitest config with coverage
- `.eslintrc.json` — ESLint config
- `.prettierrc` — Prettier config
- `.gitignore` — ignore `data/ccaf.db`, `.env.local`, `node_modules`, `.next`
- `.env.example` — `ANTHROPIC_API_KEY=` placeholder
- `app/layout.tsx` — root layout (minimal shell with Tailwind base styles)
- `app/page.tsx` — home page stub ("Coming soon")
- `src/types.ts` — all shared types
- `src/db/schema.sql` — DDL
- `src/db/database.ts` — DatabaseClient class
- `src/db/seed.ts` — seed script
- `data/domains.json` — 5 domains
- `data/scenarios.json` — 6 scenarios
- `data/sample-questions.json` — 30+ seed questions
- `src/__tests__/database.test.ts` — database wrapper tests

---

## Implementation Plan

### Task 1: Initialize Next.js project and tooling
- **Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `.eslintrc.json`, `.prettierrc`, `.gitignore`, `.env.example`
- **Depends on:** _none_
- **Commit:** `chore: initialize Next.js 16 project with TypeScript, Tailwind, and Vitest`
- **Stack:** infra

### Task 2: Define shared types
- **Files:** `src/types.ts`
- **Depends on:** Task 1
- **Commit:** `feat: add shared TypeScript types (Question, Domain, Scenario, ExamSession, ExamResult)`
- **Stack:** web

### Task 3: Create database schema and wrapper
- **Files:** `src/db/schema.sql`, `src/db/database.ts`, `src/__tests__/database.test.ts`
- **Depends on:** Task 2
- **Commit:** `feat: add SQLite schema and DatabaseClient wrapper`
- **Stack:** infra

### Task 4: Add static reference data and seed
- **Files:** `data/domains.json`, `data/scenarios.json`, `data/sample-questions.json`, `src/db/seed.ts`
- **Depends on:** Task 3
- **Commit:** `feat: add domain/scenario data and seed script with 30+ questions`
- **Stack:** infra

### Task 5: Minimal app shell
- **Files:** `app/layout.tsx`, `app/page.tsx`
- **Depends on:** Task 1
- **Commit:** `feat: add minimal Next.js app shell`
- **Stack:** web

---

## Dependencies

**Blocked by:** None

**Blocks:** `exam-simulator.md`, `history-and-reports.md`, `focused-practice.md`, `mcp-server.md`, `question-generator.md`

**External:** None

---

## Post-Implementation Notes

### Commits

- `09c8c21` — chore: initialize Next.js project with TypeScript, Tailwind, and Vitest + shared types
- `2724588` — feat: add SQLite schema and DatabaseClient wrapper
- `1efaf63` — feat: add domain/scenario reference data and seed script with 30 questions
- `c343647` — feat: add minimal Next.js app shell
- `<fix>` — fix: flawed ordering test + better-sqlite3 binary resolved

### Architectural Decisions

- Used `STRFTIME`-based timestamps via JavaScript (`new Date().toISOString()`) for answer slots; SQLite `CURRENT_TIMESTAMP` has only second precision which causes non-deterministic ordering in tests created within the same second.
- `better-sqlite3` requires Node 20 LTS on Windows — no pre-built binary exists for Node 24 ABI 137. Project must run on Node 20+.

### Deviations from Spec

- Next.js resolved to **15.5.15** (spec said 16 — 16 does not exist yet). All other versions match.
- No `tailwind.config.ts` — Tailwind v4 uses CSS-based config (`@import "tailwindcss"` in globals.css + postcss.config.mjs). Config file is not needed.

### Lessons Learned

- `npm install --ignore-scripts` skips prebuild binary downloads for native modules, not just compilation. Always run `npm rebuild <package>` after switching Node versions when native modules are involved.
