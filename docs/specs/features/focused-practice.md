# Focused Practice (Mini-Exams)

> **Status:** Approved
> **Created:** 2026-04-10
> **Implemented:** _pending_

---

## Context

After reviewing a single exam report, users see which domains they scored poorly on. Rather than retaking a full 60-question exam, they need a shorter focused session targeting only their weak areas. This accelerates learning by concentrating repetition where it's most needed.

Two entry points exist:
1. **From a report** — one-click "Praticar Áreas Fracas" pre-selects weak domains
2. **Manual selection** — user picks domains and question count from `/practice`

**Related:**
- `docs/specs/features/exam-simulator.md` — reuses exam session UI and scoring
- `docs/specs/features/history-and-reports.md` — produces the weak area data; links to this spec

---

## Requirements

### Functional

- [ ] FR1: Single exam report shows "Praticar Áreas Fracas" button when ≥ 1 domain is below 70%
- [ ] FR2: Clicking the button navigates to `/practice` with weak domains pre-selected (via query params)
- [ ] FR3: Practice page shows a domain selection UI (checkboxes for all 5 domains) and a question count control (5, 10, 15, 20 questions)
- [ ] FR4: Starting a practice session creates an exam session with `mode = 'practice'`, `source_exam_id` set (if launched from a report), and a 30-minute timer
- [ ] FR5: Practice session uses the same question display and navigation UI as the full exam
- [ ] FR6: Practice sessions appear in the history table with a visual "Prática" badge in the Status column (instead of Aprovado/Reprovado)
- [ ] FR7: Practice sessions have their own domain breakdown report accessible from the history table
- [ ] FR8: If fewer questions than requested exist for the selected domains, use all available questions (no error)

### Non-Functional

- [ ] NFR1: Practice sessions reuse the exam session components with minimal code duplication (pass `mode` and `timerDuration` as props/config)
- [ ] NFR2: Question selection for practice avoids questions already answered correctly ≥ 2 times (prefer least-practiced questions)

---

## Technical Constraints

**Stack:** Web

**Technologies:**
- Same as `exam-simulator` spec (Next.js 16, SQLite, React 19)

**Integration Points:**
- `src/exam-builder.ts` — extended to support domain-filtered and count-limited question selection
- `src/db/database.ts` — query for least-practiced questions in selected domains
- `app/exam/[id]/page.tsx` — reused for practice sessions (timer duration configurable)
- `app/exam/[id]/report/page.tsx` — reused for practice session reports

**Out of Scope:**
- Automatic question generation when the pool is exhausted (handled by `question-generator` spec)
- Scheduling or spaced repetition algorithms
- Sharing practice sessions

---

## Acceptance Criteria

### AC1: Pre-selected domains from weak area report
**GIVEN** a single exam report where `tool_design_mcp` (55%) and `context_reliability` (60%) are below 70%
**WHEN** the user clicks "Praticar Áreas Fracas"
**THEN** they land on `/practice?domains=tool_design_mcp,context_reliability` with those two domains pre-checked

### AC2: Practice session starts with filtered questions
**GIVEN** the practice page with `tool_design_mcp` and `context_reliability` selected, count = 10
**WHEN** the user clicks "Iniciar Prática"
**THEN** a new exam session is created with exactly 10 questions (or all available if < 10) from only those two domains, and a 30-minute timer

### AC3: Practice session in history
**GIVEN** a completed practice session
**WHEN** the user views "Histórico"
**THEN** the session appears in the table with a "Prática" badge; Aprovado/Reprovado is not shown for practice mode

### AC4: Practice report shows domain breakdown
**GIVEN** a completed practice session
**WHEN** the user clicks the history row
**THEN** the domain breakdown report shows only the domains that were practiced

### AC5: Least-practiced question preference
**GIVEN** a question bank where Q1 has been answered correctly 3 times and Q2 has never been answered
**WHEN** a practice session is created for Q1's domain
**THEN** Q2 appears in the session; Q1 is deprioritized (excluded if enough other questions exist)

---

## Screens

### Screen: Practice Setup

**Purpose:** Select domains and question count to create a focused mini-exam.

**Route:** `/practice`

**Layout:**
1. Page header — "Prática Focada"
2. Domain selector — 5 checkboxes (one per domain), each showing the domain name and the user's overall % in that domain
3. Question count selector — segmented control: 5 / 10 / 15 / 20
4. "Iniciar Prática" button — disabled if no domain selected
5. Cancel / back link to dashboard

**Components:**
- `<PracticePage>` → `<DomainSelector />`, `<QuestionCountSelector />`, `<StartPracticeButton />`

**States:**
- Pre-filled: domains pre-checked via query params (from report's "Praticar Áreas Fracas")
- Empty: no domains checked, button disabled
- Ready: ≥ 1 domain checked, button enabled

**Interactions:**
- Domain checkbox toggle → update selection state
- "Iniciar Prática" → POST `/api/exams` with `{mode: 'practice', domains, questionCount, sourceExamId?}` → redirect to `/exam/[id]`

---

## Implementation Approach

### Architecture

**Exam builder extension**: `src/exam-builder.ts` gets a new function `buildPracticeExam(domains, count, db)` that:
1. Queries questions filtered by the selected domains
2. Sorts by "times answered correctly" ascending (least practiced first)
3. Takes the first `count` (or all available if fewer)
4. Shuffles the selected subset

**Timer duration**: The exam session page (`app/exam/[id]/page.tsx`) reads `mode` from the session record. If `mode === 'practice'`, it passes `timerDuration = 30 * 60` seconds instead of `120 * 60`.

**History table badge**: `<HistoryTableRow />` checks `mode` field — renders "Prática" badge instead of pass/fail for practice sessions.

**Query for least-practiced questions**: Joins `questions` with `attempts` (grouped by `question_id`, counting correct answers), orders by correct count ASC.

### Test Strategy

- [ ] Partial TDD for `src/exam-builder.ts` extension (test domain filtering and least-practiced ordering)

### File Changes

**New:**
- `app/practice/page.tsx` — practice setup page
- `app/practice/_components/DomainSelector.tsx`
- `app/practice/_components/QuestionCountSelector.tsx`

**Modified:**
- `src/exam-builder.ts` — add `buildPracticeExam` function
- `src/__tests__/exam-builder.test.ts` — add tests for practice exam building
- `app/api/exams/route.ts` — handle `mode = 'practice'` and `sourceExamId` in POST body
- `app/exam/[id]/page.tsx` — read `mode` from session, configure timer duration accordingly
- `app/history/_components/HistoryTableRow.tsx` — add "Prática" badge for practice mode
- `src/db/database.ts` — add `getLeastPracticedQuestions(domains, count)` query method
- `app/layout.tsx` or `app/page.tsx` — add link to `/practice`

---

## Implementation Plan

### Task 1: Extend exam builder for practice mode (TDD)
- **Files:** `src/exam-builder.ts`, `src/__tests__/exam-builder.test.ts`
- **Depends on:** `history-and-reports`
- **Commit:** `feat: extend exam builder with domain-filtered, least-practiced question selection`
- **Stack:** web

### Task 2: Practice session API support
- **Files:** `app/api/exams/route.ts`, `src/db/database.ts`
- **Depends on:** Task 1
- **Commit:** `feat: support practice mode in exam session creation API`
- **Stack:** web

### Task 3: Practice setup page
- **Files:** `app/practice/page.tsx`, `app/practice/_components/DomainSelector.tsx`, `app/practice/_components/QuestionCountSelector.tsx`
- **Depends on:** Task 2
- **Commit:** `feat: add practice setup page with domain selection`
- **Stack:** web

### Task 4: Exam session page — practice mode adjustments
- **Files:** `app/exam/[id]/page.tsx`, `app/history/_components/HistoryTableRow.tsx`
- **Depends on:** Task 3
- **Commit:** `feat: adapt exam session and history for practice mode`
- **Stack:** web

### Task 5: Wiring from report to practice
- **Files:** `app/exam/[id]/report/_components/WeakAreasBanner.tsx`, `app/layout.tsx`
- **Depends on:** Task 4
- **Commit:** `feat: wire Praticar Áreas Fracas button from report to practice page`
- **Stack:** web

---

## Dependencies

**Blocked by:** `history-and-reports.md`

**Blocks:** None (MCP server and question generator are independent)

**External:** None

---

## Post-Implementation Notes

> _Fill after implementation._

### Commits

### Architectural Decisions

### Deviations from Spec

### Lessons Learned
