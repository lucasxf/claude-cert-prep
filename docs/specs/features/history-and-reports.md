# History & Reports

> **Status:** Approved
> **Created:** 2026-04-10
> **Implemented:** _pending_

---

## Context

After taking exams, users need two views:

1. **Consolidated history table** ("Histórico") — tracks overall progress over time; each row is one exam
2. **Single exam domain report** — breaks down one exam by domain to identify weak areas

Both report types must be exportable to CSV/XLSX for offline analysis in Excel (the user explicitly needs this for study planning). Reports use Portuguese labels to match the exam's language context.

**Related:**
- `docs/specs/features/exam-simulator.md` — produces the exam sessions and answers this spec reads
- `docs/specs/features/focused-practice.md` — consumes the weak area data this spec surfaces

---

## Requirements

### Functional

- [ ] FR1: "Histórico" button/link visible in the main navigation
- [ ] FR2: History page displays a consolidated table with columns: Data, Número, Duração, Resultado (acertos/totais e.g. "45/60"), % de Acertos, Status ("Aprovado" / "Reprovado")
- [ ] FR3: History table rows are ordered by date descending (most recent first)
- [ ] FR4: Exams are numbered sequentially (1, 2, 3…) in the Número column, assigned at submission time
- [ ] FR5: Clicking a history row navigates to the single exam report for that session
- [ ] FR6: Single exam report shows domain breakdown table: Domain, Questões no Domínio, Acertos, % de Acertos
- [ ] FR7: Domains scoring below 70% are visually highlighted as "áreas fracas" (weak areas)
- [ ] FR8: Single exam report also shows the exam summary header (date, total score, duration, pass/fail)
- [ ] FR9: "Exportar CSV" and "Exportar XLSX" buttons on the history page download the consolidated table
- [ ] FR10: "Exportar CSV" and "Exportar XLSX" buttons on the single exam report page download the domain breakdown
- [ ] FR11: CSV files use UTF-8 with BOM for Excel compatibility with Portuguese characters

### Non-Functional

- [ ] NFR1: History page renders in < 500ms for up to 200 exam sessions
- [ ] NFR2: Export files open correctly in Excel (Windows) without encoding issues
- [ ] NFR3: Export column headers use the same Portuguese labels as the UI

---

## Technical Constraints

**Stack:** Web

**Technologies:**
- Next.js 16 App Router (Server Components for data fetching)
- `exceljs` for XLSX generation; built-in `exceljs` CSV export for CSV (same library, no extra dep)
- `better-sqlite3` via API Routes

**Integration Points:**
- `src/db/database.ts` — query methods for exam sessions and attempts
- `src/types.ts` — `ExamSession`, `ExamResult`, domain breakdown types
- `data/domains.json` — domain display names and weights

**Out of Scope:**
- Charts or graphs (table-only views)
- Filtering or sorting the history table (beyond default date desc)
- Sharing or emailing reports
- PDF export

---

## Acceptance Criteria

### AC1: History table shows all completed exams
**GIVEN** the user has completed 5 exams
**WHEN** they navigate to "Histórico"
**THEN** the table shows 5 rows, ordered most-recent-first, with correct data in all columns

### AC2: Sequential numbering
**GIVEN** 3 exams completed on different dates
**WHEN** viewing "Histórico"
**THEN** the most recent exam shows Número = 3, the oldest shows Número = 1

### AC3: Duration calculation
**GIVEN** an exam that took 47 minutes and 23 seconds (accounting for pauses)
**WHEN** viewing the history row
**THEN** Duração shows "47:23"

### AC4: Domain report highlights weak areas
**GIVEN** an exam where the user scored 55% on tool_design_mcp and 85% on claude_code
**WHEN** viewing the single exam report
**THEN** tool_design_mcp row is highlighted (e.g., red/orange background), claude_code row is not

### AC5: CSV export opens in Excel without garbled characters
**GIVEN** a history table with Portuguese content
**WHEN** the user clicks "Exportar CSV" and opens the file in Excel
**THEN** all accented characters (ã, é, ó, etc.) display correctly

### AC6: XLSX export contains correct data
**GIVEN** an exam report
**WHEN** the user clicks "Exportar XLSX"
**THEN** an `.xlsx` file downloads with a header row and one data row per domain, matching the UI table

### AC7: Link from history to report
**GIVEN** the history table
**WHEN** the user clicks on row #3
**THEN** they are navigated to `/exam/{uuid}/report` for that exam

---

## Screens

### Screen: History (Histórico)

**Purpose:** Overview of all past exams; track progress over time.

**Route:** `/history`

**Layout:**
1. Page header — "Histórico de Simulados", export buttons ("Exportar CSV", "Exportar XLSX")
2. Table — columns: Número, Data, Duração, Resultado, % de Acertos, Status
3. Empty state — "Nenhum simulado realizado ainda. Iniciar Simulado."

**Components:**
- `<HistoryPage>` → `<ExportButtons />`, `<HistoryTable />`
- `<HistoryTable>` → `<HistoryTableRow />` (one per session)

**States:**
- Empty: no completed exams
- Loading: skeleton rows
- Populated: table with rows, export buttons enabled

**Interactions:**
- Row click → navigate to `/exam/[id]/report`
- "Exportar CSV" → GET `/api/export/consolidated?format=csv` → file download
- "Exportar XLSX" → GET `/api/export/consolidated?format=xlsx` → file download

---

### Screen: Single Exam Report

**Purpose:** Domain-level breakdown of one exam; identify weak areas.

**Route:** `/exam/[id]/report`

**Layout:**
1. Page header — "Relatório do Simulado #N", back link to Histórico
2. Summary bar — Data, Duração, Resultado (X/60), Score, Status badge
3. Export buttons — "Exportar CSV", "Exportar XLSX"
4. Domain breakdown table — columns: Domínio, Questões, Acertos, % de Acertos
5. Weak areas banner (if any domain < 70%) — "Áreas para Estudo", with "Praticar Áreas Fracas" button
6. Back to full result / back to dashboard links

**Components:**
- `<ExamReportPage>` → `<ExamSummaryBar />`, `<ExportButtons />`, `<DomainBreakdownTable />`, `<WeakAreasBanner />`
- `<DomainBreakdownTable>` — highlights rows below 70% threshold
- `<WeakAreasBanner>` → `<PracticeWeakAreasButton />` (links to focused-practice spec)

**States:**
- Loading: skeleton
- Loaded: all data present
- All domains strong: no weak areas banner
- Has weak areas: banner with "Praticar Áreas Fracas" button shown

**Interactions:**
- "Praticar Áreas Fracas" → navigate to `/practice?domains=tool_design_mcp,context_reliability` (pre-selected weak domains)
- "Exportar CSV" → GET `/api/export/[id]?format=csv` → file download
- "Exportar XLSX" → GET `/api/export/[id]?format=xlsx` → file download

---

## Implementation Approach

### Architecture

**Report Generator** (`src/report-generator.ts`): Pure functions.
- `buildDomainBreakdown(attempts, domains)` → domain breakdown rows with weak area flags (< 70%)
- `buildConsolidatedRow(session, attempts)` → one row for the history table

**Export** (`src/export.ts`): Wraps `exceljs`.
- `exportToCSV(rows, headers)` → `Buffer` (UTF-8 BOM)
- `exportToXLSX(rows, headers)` → `Buffer`

API routes stream the buffer as a file download response with appropriate `Content-Disposition` headers.

The history table's **sequential Número** is computed as: rank of the session ordered by `started_at ASC` among all completed exams.

**Weak area threshold:** 70% hardcoded (could be made configurable later, out of scope here).

### Test Strategy

- [ ] Full TDD for `src/report-generator.ts` (pure functions)
- [ ] Partial TDD for `src/export.ts` (test CSV output format and XLSX structure)

### File Changes

**New:**
- `src/report-generator.ts` — domain breakdown and consolidated row builders
- `src/export.ts` — CSV/XLSX export using exceljs
- `app/history/page.tsx` — history page (Server Component)
- `app/history/_components/HistoryTable.tsx`
- `app/history/_components/ExportButtons.tsx`
- `app/exam/[id]/report/page.tsx` — single exam report (Server Component)
- `app/exam/[id]/report/_components/DomainBreakdownTable.tsx`
- `app/exam/[id]/report/_components/WeakAreasBanner.tsx`
- `app/exam/[id]/report/_components/ExamSummaryBar.tsx`
- `app/api/reports/consolidated/route.ts` — GET consolidated history data
- `app/api/reports/[id]/route.ts` — GET single exam domain breakdown
- `app/api/export/consolidated/route.ts` — GET CSV/XLSX download for history
- `app/api/export/[id]/route.ts` — GET CSV/XLSX download for single exam report
- `src/__tests__/report-generator.test.ts`
- `src/__tests__/export.test.ts`

**Modified:**
- `app/layout.tsx` — add "Histórico" navigation link
- `app/page.tsx` — add "Histórico" link on dashboard
- `src/db/database.ts` — add query methods for consolidated history and domain breakdown

---

## Implementation Plan

### Task 1: Report generator (TDD)
- **Files:** `src/report-generator.ts`, `src/__tests__/report-generator.test.ts`
- **Depends on:** `exam-simulator`
- **Commit:** `feat: add report generator for domain breakdown and consolidated history`
- **Stack:** web

### Task 2: Export utility (TDD)
- **Files:** `src/export.ts`, `src/__tests__/export.test.ts`
- **Depends on:** Task 1
- **Commit:** `feat: add CSV/XLSX export utility with UTF-8 BOM support`
- **Stack:** web

### Task 3: Report API routes
- **Files:** `app/api/reports/consolidated/route.ts`, `app/api/reports/[id]/route.ts`, `app/api/export/consolidated/route.ts`, `app/api/export/[id]/route.ts`
- **Depends on:** Task 2
- **Commit:** `feat: add report and export API routes`
- **Stack:** web

### Task 4: History page
- **Files:** `app/history/page.tsx`, `app/history/_components/HistoryTable.tsx`, `app/history/_components/ExportButtons.tsx`
- **Depends on:** Task 3
- **Commit:** `feat: add history page with consolidated exam table and export`
- **Stack:** web

### Task 5: Single exam report page
- **Files:** `app/exam/[id]/report/page.tsx`, `app/exam/[id]/report/_components/DomainBreakdownTable.tsx`, `app/exam/[id]/report/_components/WeakAreasBanner.tsx`, `app/exam/[id]/report/_components/ExamSummaryBar.tsx`
- **Depends on:** Task 4
- **Commit:** `feat: add single exam report with domain breakdown and weak areas`
- **Stack:** web

### Task 6: Navigation wiring
- **Files:** `app/layout.tsx`, `app/page.tsx`
- **Depends on:** Task 5
- **Commit:** `feat: wire Histórico navigation into app shell`
- **Stack:** web

---

## Dependencies

**Blocked by:** `exam-simulator.md`

**Blocks:** `focused-practice.md`

**External:** `exceljs` (add to `package.json` in project-setup or here)

---

## Post-Implementation Notes

> _Fill after implementation._

### Commits

### Architectural Decisions

### Deviations from Spec

### Lessons Learned
