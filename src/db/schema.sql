PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ---------------------------------------------------------------------------
-- Questions bank
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS questions (
    id              TEXT PRIMARY KEY,
    domain          TEXT NOT NULL,
    scenario        TEXT NOT NULL,
    stem            TEXT NOT NULL,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    option_c        TEXT NOT NULL,
    option_d        TEXT NOT NULL,
    correct_answer  TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation     TEXT NOT NULL,
    wrong_explanation_a TEXT,
    wrong_explanation_b TEXT,
    wrong_explanation_c TEXT,
    wrong_explanation_d TEXT,
    difficulty      TEXT NOT NULL DEFAULT 'intermediate'
                        CHECK (difficulty IN ('foundation', 'intermediate', 'advanced')),
    tags            TEXT NOT NULL DEFAULT '[]', -- JSON array of concept tag strings
    source          TEXT NOT NULL DEFAULT 'seed'
                        CHECK (source IN ('seed', 'generated')),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Exam sessions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exam_sessions (
    id                  TEXT PRIMARY KEY,
    mode                TEXT NOT NULL CHECK (mode IN ('exam', 'practice')),
    status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'paused', 'completed')),
    started_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at         DATETIME,
    paused_at           DATETIME,
    -- Accumulated elapsed seconds, pauses excluded. Updated on pause/resume/submit.
    duration_seconds    INTEGER NOT NULL DEFAULT 0,
    -- 7200 (120 min) for full exam; 1800 (30 min) for practice.
    time_limit_seconds  INTEGER NOT NULL DEFAULT 7200,
    total_questions     INTEGER NOT NULL,
    correct_count       INTEGER,
    score               INTEGER,  -- Scaled 0–1000
    passed              INTEGER,  -- SQLite boolean: 0 or 1
    -- JSON array of Domain values, NULL for a full exam.
    domain_filter       TEXT,
    -- FK to parent exam for practice-from-weak-areas sessions.
    source_exam_id      TEXT REFERENCES exam_sessions(id)
);

-- ---------------------------------------------------------------------------
-- Per-question answer slots (pre-created when exam session is opened)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exam_answers (
    id              TEXT PRIMARY KEY,
    exam_session_id TEXT NOT NULL REFERENCES exam_sessions(id),
    question_id     TEXT NOT NULL REFERENCES questions(id),
    question_order  INTEGER NOT NULL, -- 1-based position within the exam
    selected_answer     TEXT CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
    is_correct          INTEGER,          -- SQLite boolean: 0 or 1
    answered_at         DATETIME,
    time_spent_seconds  INTEGER,          -- seconds spent on this question
    UNIQUE (exam_session_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Indices
-- ---------------------------------------------------------------------------

-- Prevents duplicate questions from being inserted (e.g. running `npm run seed` twice).
-- seed.ts catches SQLITE_CONSTRAINT_UNIQUE on this index to skip existing records.
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_stem ON questions(stem);

CREATE INDEX IF NOT EXISTS idx_questions_domain     ON questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_scenario   ON questions(scenario);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_source     ON questions(source);

CREATE INDEX IF NOT EXISTS idx_sessions_status      ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started     ON exam_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_source_exam ON exam_sessions(source_exam_id);

CREATE INDEX IF NOT EXISTS idx_answers_session      ON exam_answers(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question     ON exam_answers(question_id);
