# Plan: Update CLAUDE.md, README.md + Create SDD Spec Infrastructure

> **Status:** Approved
> **Created:** 2026-04-10

## Context

The project is pivoting from CLI to **web frontend**. The user added significant new requirements: pause/resume timer, exam history with consolidated reports, single-exam domain breakdown, mini-exams from weak areas, CSV/XLSX export. The repo has zero code — only design docs.

The engineering-daybook project (c:/repo/engineering-daybook) provides the SDD template and patterns to follow.

---

## Deliverables

### 1. Update `CLAUDE.md`

Key changes from current version:
- Replace `@inquirer/prompts` CLI references → Next.js 16 (App Router) + React 19 + Tailwind CSS
- Replace CLI commands → `npm run dev` (Next.js dev server), `npm run build`, etc.
- Replace 3-component architecture → **Web App** (pages) + **API Routes** (SQLite access) + **MCP Server** (kept) + **Question Generator** (kept)
- Add page routes: `/`, `/exam/[id]`, `/history`, `/exam/[id]/report`, `/practice`
- Add API routes: `/api/exams`, `/api/reports`, `/api/export`
- Add UUID convention, SDD reference, Portuguese UI note

### 2. Update `README.md`

Replace the one-liner with a proper project description covering: purpose (dual: study tool + learning exercise), features list, tech stack, placeholder for setup instructions.

### 3. Create Spec Infrastructure

Copy SDD structure from engineering-daybook:
- `docs/specs/README.md` — adapted from `c:/repo/engineering-daybook/docs/specs/README.md`
- `docs/specs/template.md` — copied from `c:/repo/engineering-daybook/docs/specs/template.md`
- `docs/specs/features/` — empty dir (specs go here)

### 4. Write 4 Feature Specs (Draft status)

Following the engineering-daybook template format (Context, Requirements FR/NFR, Technical Constraints, Acceptance Criteria, Screens, Implementation Approach, Implementation Plan, Dependencies).

#### Spec A: `docs/specs/features/project-setup.md`
Infrastructure: Next.js 16 + Tailwind + TypeScript strict + SQLite + Vitest + types + seed data.
No UI pages — just scaffolding.

#### Spec B: `docs/specs/features/exam-simulator.md`
Core exam flow: start exam (60q, domain-weighted), display questions, 120-min countdown timer, pause/resume (UUID sessions), answer navigation, submit, scoring (0-1000 scaled, 720 pass), auto-submit at timer=0, persist to SQLite, state survives page refresh.

#### Spec C: `docs/specs/features/history-and-reports.md`
- History page: "Histórico" button → table (Data, Número, Duração, Resultado, % Acertos, Status)
- Single exam report: domain breakdown, weak areas highlighted
- Export: CSV and XLSX for both report types
- Click history row → single exam report

#### Spec D: `docs/specs/features/focused-practice.md`
- "Praticar Áreas Fracas" from single exam report → mini-exam (10-15q, 30 min) from weak domains
- Manual domain selection screen at `/practice`
- Reuses exam session UI with mode=practice

**Deferred:** MCP server spec, question generator spec (not part of the immediate ask).

---

## Implementation Sequence

```
project-setup → exam-simulator → history-and-reports → focused-practice
```

Each spec can be implemented independently once its dependencies are met. Specs A and B are the critical path.

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js 16 + React 19 + Tailwind | Latest, matches engineering-daybook |
| Persistence | SQLite via better-sqlite3 through API Routes | Simple for personal tool, no external DB needed |
| UUID | v7 (time-ordered) | Sortable by creation time |
| Export lib | `exceljs` | Supports both CSV and XLSX, good TypeScript support |
| Timer persistence | localStorage + SQLite (belt-and-suspenders) | Survives refresh; DB is source of truth |
| UI language | Portuguese (labels, buttons, headers) | User specified PT column names and button labels |
| Spec language | English | Matches CLAUDE.md and engineering-daybook conventions |
| Schema additions | `exam_sessions` gets `duration_seconds`, `paused_at`, `source_exam_id` | Support pause/resume and practice-from-weak-areas |

---

## Schema Additions (vs. CCAF_SIMULATOR_PROMPT.md)

The original SQLite schema from the design doc needs these additions for the new requirements:

- `exam_sessions.duration_seconds INTEGER` — actual elapsed time (excluding pauses)
- `exam_sessions.paused_at DATETIME` — non-null when session is paused
- `exam_sessions.source_exam_id TEXT` — for practice exams generated from weak areas (FK to parent exam)
- Consider `exam_pauses` table to track pause/resume events for accurate duration

---

## Verification

- Review each spec against user's 9 requirements to confirm full coverage
- Confirm CLAUDE.md commands match the Next.js project structure
- Confirm spec template matches engineering-daybook format

---

## How to Resume

This plan can be executed in any session. To implement:

1. Start with Deliverables 1-3 (CLAUDE.md, README.md, spec infrastructure)
2. Write specs A-D in `docs/specs/features/`
3. Implement specs in order: A → B → C → D

Each spec is self-contained and can be implemented via `/implement-spec` or manually.
