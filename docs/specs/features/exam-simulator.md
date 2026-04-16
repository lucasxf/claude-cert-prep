# Exam Simulator

> **Status:** Implemented
> **Created:** 2026-04-10
> **Implemented:** 2026-04-10

---

## Context

The core feature: a timed, pausable exam session that simulates the real CCA-F exam. Users need to answer 60 questions under a 120-minute countdown, with the ability to pause and resume (study sessions are frequently interrupted). Each session gets a UUID so it can be resumed and later referenced in reports.

**Related:**
- `CCAF_SIMULATOR_PROMPT.md` — scoring formula, domain weights, question format
- `docs/specs/features/project-setup.md` — database layer and types this spec depends on

---

## Requirements

### Functional

- [ ] FR1: Start a new full exam session — 60 questions selected proportionally by domain weight, randomized order, assigned a UUID v7
- [ ] FR2: Display one question at a time with stem, four options (A/B/C/D), and a selection state
- [ ] FR3: Countdown timer visible at all times, starting at 120:00 and counting down
- [ ] FR4: Pause button freezes the timer and hides question content (prevents "pausing to think")
- [ ] FR5: Resume button restores timer and reveals the current question
- [ ] FR6: Navigate between questions via previous/next buttons and a question grid (shows answered/unanswered/flagged)
- [ ] FR7: Submit exam — calculate scaled score (0–1000), determine pass/fail (threshold: 720), save to database
- [ ] FR8: Auto-submit when timer reaches 00:00 with all answers recorded up to that point
- [ ] FR9: Exam state (current question index, answers, elapsed time) survives a page refresh
- [ ] FR10: Immediately after submission, show result screen with score, pass/fail, and domain breakdown preview
- [ ] FR11: Each submitted answer is persisted to the `attempts` table with `time_spent_seconds`

### Non-Functional

- [ ] NFR1: Timer accuracy within ±1 second over 120 minutes
- [ ] NFR2: State survives refresh: primary persistence in SQLite (source of truth); localStorage as cache for snappy restore
- [ ] NFR3: Questions are randomized per session (same question set, different order each time)
- [ ] NFR4: Scorer is a pure function with 100% unit test coverage

---

## Technical Constraints

**Stack:** Web

**Technologies:**
- Next.js 16 App Router (client and server components as appropriate)
- React 19 `useOptimistic` for answer submission feedback
- `better-sqlite3` via API Routes (server-side only)
- `uuid` v7 for session IDs

**Integration Points:**
- `src/db/database.ts` — `DatabaseClient` for all SQLite operations
- `src/types.ts` — `Question`, `Domain`, `ExamSession`, `ExamResult`
- `data/domains.json` — domain weights for question distribution

**Out of Scope:**
- Question generation (handled by `question-generator` spec)
- Full domain breakdown report (handled by `history-and-reports` spec)
- Practice mode (handled by `focused-practice` spec)

---

## Acceptance Criteria

### AC1: Full exam starts with correct question distribution
**GIVEN** the database has questions covering all 5 domains
**WHEN** the user clicks "Iniciar Simulado"
**THEN** a new exam session is created with 60 questions: 16 from agentic_architecture, 12 from claude_code, 12 from prompt_engineering, 11 from tool_design_mcp, 9 from context_reliability (±1 for rounding), timer starts at 120:00

### AC2: Pause and resume work correctly
**GIVEN** an active exam session with the timer running
**WHEN** the user clicks "Pausar"
**THEN** the timer stops, question content is hidden, and "Pausar" becomes "Retomar"
**AND WHEN** the user clicks "Retomar"
**THEN** the timer resumes from where it stopped and question content is revealed

### AC3: State survives page refresh
**GIVEN** the user is on question 23 with 87 minutes remaining
**WHEN** the page is refreshed
**THEN** the exam resumes on question 23 with the timer restored to approximately 87 minutes remaining

### AC4: Auto-submit on timer expiry
**GIVEN** an active exam with 3 questions unanswered
**WHEN** the timer reaches 00:00
**THEN** the exam is auto-submitted with the 57 answered questions, score is calculated and displayed

### AC5: Score calculation is correct
**GIVEN** an exam with 60 questions
**WHEN** the user answers 45 correctly (75%)
**THEN** the scaled score is approximately 750 (passing), pass/fail status is "Aprovado"

### AC6: Passing threshold
**GIVEN** a submitted exam
**WHEN** the scaled score is 719
**THEN** the status is "Reprovado"; when the score is 720, the status is "Aprovado"

---

## Screens

### Screen: Home / Dashboard

**Purpose:** Entry point — start a new exam or navigate to history/practice.

**Route:** `/`

**Layout:**
1. Header — logo/title "CCA-F Exam Simulator"
2. Action card — "Iniciar Simulado" primary button, secondary links to Histórico and Prática
3. Stats summary (if exams exist) — last score, number of exams taken

**Components:**
- `<HomePage>` → `<StartExamButton />`, `<QuickStatsCard />`, `<NavLinks />`

**States:**
- No exams yet: show only "Iniciar Simulado" button
- Has exams: show stats summary alongside the start button

**Interactions:**
- "Iniciar Simulado" → POST `/api/exams` → redirect to `/exam/[id]`

---

### Screen: Exam Session

**Purpose:** Answer questions under timed conditions with pause/resume.

**Route:** `/exam/[id]`

**Layout:**
1. Top bar — timer (prominent, center), pause/resume button (right), question progress (left: "Questão 12/60")
2. Question area — scenario badge, domain badge, stem, four option buttons (A/B/C/D)
3. Navigation — previous/next buttons, question grid (60 squares, color-coded: unanswered/answered/flagged)
4. Submit button — enabled when at least 1 question answered; confirmation dialog before submitting

**Components:**
- `<ExamPage>` → `<ExamTimer />`, `<PauseButton />`, `<QuestionCard />`, `<QuestionNavigator />`, `<SubmitButton />`
- `<PauseOverlay />` — covers question content when paused

**States:**
- Active: timer running, question visible
- Paused: timer frozen, `<PauseOverlay />` visible, "Retomar" button
- Submitting: loading state on submit button
- Expired: auto-submit triggered, redirect to result

**Interactions:**
- Option click → mark answer, auto-advance to next unanswered question
- Question grid square click → jump to that question
- "Pausar" → pause session (PATCH `/api/exams/[id]` with `{action: "pause"}`)
- "Retomar" → resume session (PATCH `/api/exams/[id]` with `{action: "resume"}`)
- "Entregar" → confirmation dialog → POST `/api/exams/[id]/submit`

---

### Screen: Exam Result

**Purpose:** Immediate feedback after exam submission.

**Route:** `/exam/[id]/result`

**Layout:**
1. Score display — large scaled score (0–1000), pass/fail badge ("Aprovado" / "Reprovado")
2. Domain preview — mini table with % correct per domain
3. Actions — "Ver Relatório Completo" → `/exam/[id]/report`, "Ver Histórico" → `/history`, "Novo Simulado" → `/`

**Components:**
- `<ResultPage>` → `<ScoreDisplay />`, `<DomainPreviewTable />`, `<ResultActions />`

**States:**
- Loaded: score and domain data available
- Error: failed to load result

---

## Implementation Approach

### Architecture

**Scoring** (`src/scorer.ts`): Pure function. Takes array of `{domain, isCorrect}` objects, applies domain weights, returns `ExamResult`. No side effects — fully unit-testable.

**Exam Builder** (`src/exam-builder.ts`): Pure function. Takes question pool and domain weights from `data/domains.json`, selects 60 questions proportionally, shuffles order. Returns `Question[]`.

**Timer** (`app/exam/[id]/_components/ExamTimer.tsx`): Client component using `useRef` for interval tracking. On pause: clears interval and persists elapsed seconds to DB via API. On resume: starts new interval from persisted elapsed time. On unmount/refresh: persists elapsed seconds before unload.

**Pause state**: Stored in `exam_sessions.paused_at` (non-null = paused). Elapsed time tracked as `exam_sessions.duration_seconds` (cumulative, updated on each pause and on submit).

**State persistence strategy:**
- `localStorage` key `exam:{id}`: `{currentQuestionIndex, answers, lastSyncedAt}` — updated on every answer, used for snappy page restore
- SQLite `attempts` table: authoritative record of answers, written via API on each answer submission
- On page load: if `localStorage` cache exists and `lastSyncedAt` is recent (< 5 min), use it; otherwise fetch from API

### Test Strategy

- [ ] Full TDD for `src/scorer.ts` (pure function, easy to test)
- [ ] Partial TDD for `src/exam-builder.ts` (test distribution correctness)
- [ ] Infrastructure only for timer component and UI components

### File Changes

**New:**
- `src/scorer.ts` — pure scoring function
- `src/exam-builder.ts` — question selection and shuffling
- `app/exam/[id]/page.tsx` — exam session page (client component)
- `app/exam/[id]/result/page.tsx` — result page
- `app/exam/[id]/_components/ExamTimer.tsx` — countdown timer
- `app/exam/[id]/_components/QuestionCard.tsx` — question display
- `app/exam/[id]/_components/QuestionNavigator.tsx` — question grid
- `app/exam/[id]/_components/PauseOverlay.tsx` — pause overlay
- `app/exam/[id]/_components/SubmitButton.tsx` — submit with confirmation
- `app/api/exams/route.ts` — POST (create session), GET (list)
- `app/api/exams/[id]/route.ts` — GET (session + questions), PATCH (pause/resume)
- `app/api/exams/[id]/submit/route.ts` — POST (submit exam, calculate score)
- `app/api/exams/[id]/answers/route.ts` — POST (record individual answer)
- `src/__tests__/scorer.test.ts` — scorer unit tests
- `src/__tests__/exam-builder.test.ts` — exam builder distribution tests

**Modified:**
- `app/page.tsx` — replace stub with actual dashboard
- `src/db/database.ts` — add exam session query methods
- `src/db/schema.sql` — add `paused_at` and `duration_seconds` columns (if not already in project-setup)

---

## Implementation Plan

### Task 1: Scorer logic (TDD)
- **Files:** `src/scorer.ts`, `src/__tests__/scorer.test.ts`
- **Depends on:** `project-setup`
- **Commit:** `feat: add exam scorer with scaled scoring and domain breakdown`
- **Stack:** web

### Task 2: Exam builder (TDD)
- **Files:** `src/exam-builder.ts`, `src/__tests__/exam-builder.test.ts`
- **Depends on:** Task 1
- **Commit:** `feat: add exam builder with proportional domain distribution`
- **Stack:** web

### Task 3: API routes — create, fetch, pause/resume
- **Files:** `app/api/exams/route.ts`, `app/api/exams/[id]/route.ts`, `app/api/exams/[id]/answers/route.ts`
- **Depends on:** Task 2
- **Commit:** `feat: add exam session API routes (create, fetch, pause/resume, record answer)`
- **Stack:** web

### Task 4: Submit API route and result page
- **Files:** `app/api/exams/[id]/submit/route.ts`, `app/exam/[id]/result/page.tsx`
- **Depends on:** Task 3
- **Commit:** `feat: add exam submit route and result page`
- **Stack:** web

### Task 5: Timer component
- **Files:** `app/exam/[id]/_components/ExamTimer.tsx`
- **Depends on:** Task 3
- **Commit:** `feat: add countdown timer with pause/resume and state persistence`
- **Stack:** web

### Task 6: Exam session UI
- **Files:** `app/exam/[id]/page.tsx`, `app/exam/[id]/_components/QuestionCard.tsx`, `app/exam/[id]/_components/QuestionNavigator.tsx`, `app/exam/[id]/_components/PauseOverlay.tsx`, `app/exam/[id]/_components/SubmitButton.tsx`
- **Depends on:** Task 5
- **Commit:** `feat: add exam session page with question display and navigation`
- **Stack:** web

### Task 7: Dashboard and wiring
- **Files:** `app/page.tsx`
- **Depends on:** Task 6
- **Commit:** `feat: update dashboard with start exam flow`
- **Stack:** web

---

## Dependencies

**Blocked by:** `project-setup.md`

**Blocks:** `history-and-reports.md`, `focused-practice.md`

**External:** None

---

## Post-Implementation Notes

### Commits

- `5dfddfb` — feat: add exam scorer with scaled scoring and exam builder with proportional domain distribution
- `43a1c91` — feat: add exam session API routes (create, fetch, pause/resume, record answer, submit)
- `5437883` — feat: add exam session page with timer, question display, navigation, and dashboard

### Architectural Decisions

- `useOptimistic` (React 19) used for answer selection — UI updates instantly before the API call completes. Prevents perceived lag on every click.
- Timer owns only the `setInterval` — parent (`ExamPage`) owns `remainingSeconds` state. This makes the timer a pure display + tick source; all persistence logic lives in the parent.
- Result data is written to `sessionStorage` after submit and read by the result page — avoids a re-fetch on the immediate redirect. Falls back to API fetch on page refresh.
- `time_spent_seconds` added to `exam_answers` schema via `ALTER TABLE` migration in `initialize()` — handles both fresh and existing databases without requiring a manual DB delete.

### Deviations from Spec

- Full-exam question selection via `buildExam()` (uses all questions in pool). When pool has fewer than 60 questions (current seed has 30), the builder uses all available — graceful degradation rather than error. The `loadLocal` TTL is 5 minutes (spec said "< 5 min" — interpreted as the boundary).
- Practice domain filtering in `POST /api/exams` uses only the first domain from `domain_filter` for `listQuestions()`. Multi-domain practice filtering is deferred to the focused-practice spec.
- `useOptimistic` required a stable `applyOptimistic` function — wrapped in `useCallback` with `answers` in the dependency array to avoid stale closure issues.

### Lessons Learned

- `useOptimistic` state and regular state must be kept in sync: `applyOptimistic` only affects the optimistic snapshot, so `setAnswers` must also be called to update the source of truth.
- Next.js App Router route params are `Promise<{ id: string }>` (not direct object) since Next.js 15 — all API routes must `await params`.
- `useEffect` dependency array with `remainingSeconds > 0` (boolean) as the restart trigger for the timer interval is cleaner than using the raw number, avoiding interval restarts on every tick.
