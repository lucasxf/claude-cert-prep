import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { v7 as uuidv7 } from 'uuid'

// import.meta.dirname is Node 22+; this works on Node 20 ESM
const _dirname = path.dirname(fileURLToPath(import.meta.url))
import type {
    AnswerChoice,
    Domain,
    ExamAnswer,
    ExamMode,
    ExamSession,
    ExamStatus,
    Question,
    QuestionFilter,
    QuestionRow,
    QuestionSeed,
} from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a flat QuestionRow from SQLite to the Question interface. */
function rowToQuestion(row: QuestionRow): Question {
    return {
        id: row.id,
        domain: row.domain,
        scenario: row.scenario,
        stem: row.stem,
        options: {
            A: row.option_a,
            B: row.option_b,
            C: row.option_c,
            D: row.option_d,
        },
        correct_answer: row.correct_answer,
        explanation: row.explanation,
        wrong_explanations: {
            ...(row.wrong_explanation_a ? { A: row.wrong_explanation_a } : {}),
            ...(row.wrong_explanation_b ? { B: row.wrong_explanation_b } : {}),
            ...(row.wrong_explanation_c ? { C: row.wrong_explanation_c } : {}),
            ...(row.wrong_explanation_d ? { D: row.wrong_explanation_d } : {}),
        },
        difficulty: row.difficulty,
        tags: JSON.parse(row.tags) as string[],
        source: row.source,
        created_at: row.created_at,
    }
}

/** Maps a flat exam_sessions row to ExamSession. */
function rowToSession(row: Record<string, unknown>): ExamSession {
    return {
        id: row['id'] as string,
        mode: row['mode'] as ExamMode,
        status: row['status'] as ExamStatus,
        started_at: row['started_at'] as string,
        finished_at: (row['finished_at'] as string | null) ?? null,
        paused_at: (row['paused_at'] as string | null) ?? null,
        duration_seconds: row['duration_seconds'] as number,
        time_limit_seconds: row['time_limit_seconds'] as number,
        total_questions: row['total_questions'] as number,
        correct_count: (row['correct_count'] as number | null) ?? null,
        score: (row['score'] as number | null) ?? null,
        passed: row['passed'] == null ? null : Boolean(row['passed']),
        domain_filter: (row['domain_filter'] as string | null) ?? null,
        source_exam_id: (row['source_exam_id'] as string | null) ?? null,
    }
}

/** Maps a flat exam_answers row to ExamAnswer. */
function rowToAnswer(row: Record<string, unknown>): ExamAnswer {
    return {
        id: row['id'] as string,
        exam_session_id: row['exam_session_id'] as string,
        question_id: row['question_id'] as string,
        question_order: row['question_order'] as number,
        selected_answer: (row['selected_answer'] as AnswerChoice | null) ?? null,
        is_correct: row['is_correct'] == null ? null : Boolean(row['is_correct']),
        answered_at: (row['answered_at'] as string | null) ?? null,
        time_spent_seconds: (row['time_spent_seconds'] as number | null) ?? null,
    }
}

// ---------------------------------------------------------------------------
// DatabaseClient
// ---------------------------------------------------------------------------

export class DatabaseClient {
    private readonly db: Database.Database

    constructor(dbPath: string) {
        const dir = path.dirname(dbPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        this.db = new Database(dbPath)
        this.initialize()
    }

    /** Applies schema.sql — idempotent (uses CREATE TABLE IF NOT EXISTS). */
    private initialize(): void {
        const schemaPath = path.join(_dirname, 'schema.sql')
        const schema = fs.readFileSync(schemaPath, 'utf-8')
        this.db.exec(schema)

        // Migration: add time_spent_seconds if it was added after the initial schema
        try {
            this.db.exec('ALTER TABLE exam_answers ADD COLUMN time_spent_seconds INTEGER')
        } catch {
            // Column already exists — ignore
        }
    }

    close(): void {
        this.db.close()
    }

    // -------------------------------------------------------------------------
    // Questions
    // -------------------------------------------------------------------------

    insertQuestion(seed: QuestionSeed, source: 'seed' | 'generated' = 'seed'): Question {
        const id = uuidv7()
        const stmt = this.db.prepare<[
            string, string, string, string,
            string, string, string, string,
            string, string,
            string | null, string | null, string | null, string | null,
            string, string, string,
        ]>(`
            INSERT INTO questions (
                id, domain, scenario, stem,
                option_a, option_b, option_c, option_d,
                correct_answer, explanation,
                wrong_explanation_a, wrong_explanation_b,
                wrong_explanation_c, wrong_explanation_d,
                difficulty, tags, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        stmt.run(
            id,
            seed.domain,
            seed.scenario,
            seed.stem,
            seed.options.A,
            seed.options.B,
            seed.options.C,
            seed.options.D,
            seed.correct_answer,
            seed.explanation,
            seed.wrong_explanations.A ?? null,
            seed.wrong_explanations.B ?? null,
            seed.wrong_explanations.C ?? null,
            seed.wrong_explanations.D ?? null,
            seed.difficulty,
            JSON.stringify(seed.tags),
            source,
        )

        const inserted = this.db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow
        return rowToQuestion(inserted)
    }

    getQuestion(id: string): Question | undefined {
        const row = this.db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow | undefined
        return row ? rowToQuestion(row) : undefined
    }

    listQuestions(filter: QuestionFilter = {}): Question[] {
        const conditions: string[] = []
        const params: (string | number)[] = []

        if (filter.domain) {
            conditions.push('domain = ?')
            params.push(filter.domain)
        }
        if (filter.scenario) {
            conditions.push('scenario = ?')
            params.push(filter.scenario)
        }
        if (filter.difficulty) {
            conditions.push('difficulty = ?')
            params.push(filter.difficulty)
        }
        if (filter.exclude_ids && filter.exclude_ids.length > 0) {
            const placeholders = filter.exclude_ids.map(() => '?').join(', ')
            conditions.push(`id NOT IN (${placeholders})`)
            params.push(...filter.exclude_ids)
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const limit = filter.limit ? `LIMIT ${filter.limit}` : ''
        const sql = `SELECT * FROM questions ${where} ORDER BY RANDOM() ${limit}`

        const rows = this.db.prepare(sql).all(...params) as QuestionRow[]
        return rows.map(rowToQuestion)
    }

    /**
     * Returns per-domain correctness stats across all exam sessions.
     * Used by the MCP server's get_progress tool.
     */
    getDomainStats(domain?: string): {
        overall: { total: number; correct: number; percentage: number }
        by_domain: Array<{ domain: string; total: number; correct: number; percentage: number }>
    } {
        const sql = `
            SELECT q.domain,
                   COUNT(*) AS total,
                   SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END) AS correct
            FROM exam_answers ea
            JOIN questions q ON ea.question_id = q.id
            WHERE ea.selected_answer IS NOT NULL
              ${domain ? 'AND q.domain = ?' : ''}
            GROUP BY q.domain
            ORDER BY q.domain
        `
        const rows = (
            domain
                ? this.db.prepare(sql).all(domain)
                : this.db.prepare(sql).all()
        ) as Array<{ domain: string; total: number; correct: number }>

        const by_domain = rows.map(r => ({
            domain: r.domain,
            total: r.total,
            correct: r.correct,
            percentage: r.total === 0 ? 0 : Math.round((r.correct / r.total) * 100),
        }))

        const overallTotal = by_domain.reduce((s, r) => s + r.total, 0)
        const overallCorrect = by_domain.reduce((s, r) => s + r.correct, 0)

        return {
            overall: {
                total: overallTotal,
                correct: overallCorrect,
                percentage: overallTotal === 0 ? 0 : Math.round((overallCorrect / overallTotal) * 100),
            },
            by_domain,
        }
    }

    /**
     * Returns questions for the given domains ordered by how many times they
     * have been answered correctly across all sessions (ascending — least
     * practiced first). Used for practice session question selection.
     */
    getLeastPracticedQuestions(domains: Domain[], count: number): Question[] {
        if (domains.length === 0) return []
        const placeholders = domains.map(() => '?').join(', ')
        const sql = `
            SELECT q.*,
                   COALESCE(SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_count
            FROM questions q
            LEFT JOIN exam_answers ea ON q.id = ea.question_id
            WHERE q.domain IN (${placeholders})
            GROUP BY q.id
            ORDER BY correct_count ASC
            LIMIT ?
        `
        const rows = this.db.prepare(sql).all(...domains, count) as QuestionRow[]
        return rows.map(rowToQuestion)
    }

    countQuestions(domain?: Domain): number {
        if (domain) {
            const result = this.db.prepare(
                'SELECT COUNT(*) as count FROM questions WHERE domain = ?'
            ).get(domain) as { count: number }
            return result.count
        }
        const result = this.db.prepare('SELECT COUNT(*) as count FROM questions').get() as { count: number }
        return result.count
    }

    // -------------------------------------------------------------------------
    // Exam sessions
    // -------------------------------------------------------------------------

    createSession(params: {
        mode: ExamMode
        total_questions: number
        time_limit_seconds?: number
        domain_filter?: Domain[]
        source_exam_id?: string
    }): ExamSession {
        const id = uuidv7()
        const time_limit = params.time_limit_seconds ?? (params.mode === 'exam' ? 7200 : 1800)

        this.db.prepare<[string, string, number, number, string | null, string | null]>(`
            INSERT INTO exam_sessions (id, mode, total_questions, time_limit_seconds, domain_filter, source_exam_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            id,
            params.mode,
            params.total_questions,
            time_limit,
            params.domain_filter ? JSON.stringify(params.domain_filter) : null,
            params.source_exam_id ?? null,
        )

        return this.getSession(id)!
    }

    getSession(id: string): ExamSession | undefined {
        const row = this.db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(id)
        return row ? rowToSession(row as Record<string, unknown>) : undefined
    }

    /** Returns all completed sessions ordered oldest → newest (for sequential numbering). */
    listCompletedSessions(): ExamSession[] {
        const rows = this.db
            .prepare(`SELECT * FROM exam_sessions WHERE status = 'completed' ORDER BY started_at ASC`)
            .all() as Record<string, unknown>[]
        return rows.map(rowToSession)
    }

    listSessions(limit = 50): ExamSession[] {
        const rows = this.db
            .prepare('SELECT * FROM exam_sessions ORDER BY started_at DESC LIMIT ?')
            .all(limit) as Record<string, unknown>[]
        return rows.map(rowToSession)
    }

    updateSession(id: string, updates: Partial<Pick<ExamSession,
        'status' | 'finished_at' | 'paused_at' | 'duration_seconds' |
        'correct_count' | 'score' | 'passed'
    >>): ExamSession {
        const fields: string[] = []
        const values: (string | number | null)[] = []

        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = ?`)
            values.push(value === true ? 1 : value === false ? 0 : (value as string | number | null))
        }

        if (fields.length === 0) {
            throw new Error(`updateSession(${id}): no fields to update`)
        }

        values.push(id)
        this.db.prepare(`UPDATE exam_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)

        const updated = this.getSession(id)
        if (!updated) throw new Error(`updateSession(${id}): session not found after update`)
        return updated
    }

    // -------------------------------------------------------------------------
    // Exam answers
    // -------------------------------------------------------------------------

    /** Pre-creates blank answer slots for all questions in a session. */
    createAnswerSlots(
        sessionId: string,
        questionIds: string[],
    ): void {
        const insert = this.db.prepare<[string, string, string, number]>(`
            INSERT INTO exam_answers (id, exam_session_id, question_id, question_order)
            VALUES (?, ?, ?, ?)
        `)
        const insertMany = this.db.transaction((ids: string[]) => {
            ids.forEach((qId, idx) => {
                insert.run(uuidv7(), sessionId, qId, idx + 1)
            })
        })
        insertMany(questionIds)
    }

    getAnswers(sessionId: string): ExamAnswer[] {
        const rows = this.db
            .prepare('SELECT * FROM exam_answers WHERE exam_session_id = ? ORDER BY question_order')
            .all(sessionId) as Record<string, unknown>[]
        return rows.map(rowToAnswer)
    }

    submitAnswer(
        sessionId: string,
        questionId: string,
        selected: AnswerChoice,
        timeSpentSeconds?: number,
    ): ExamAnswer {
        const question = this.getQuestion(questionId)
        if (!question) throw new Error(`submitAnswer: question ${questionId} not found`)

        const is_correct = question.correct_answer === selected ? 1 : 0
        const now = new Date().toISOString()

        this.db.prepare(`
            UPDATE exam_answers
            SET selected_answer = ?, is_correct = ?, answered_at = ?, time_spent_seconds = ?
            WHERE exam_session_id = ? AND question_id = ?
        `).run(selected, is_correct, now, timeSpentSeconds ?? null, sessionId, questionId)

        const row = this.db.prepare(
            'SELECT * FROM exam_answers WHERE exam_session_id = ? AND question_id = ?'
        ).get(sessionId, questionId) as Record<string, unknown>

        return rowToAnswer(row)
    }

    // -------------------------------------------------------------------------
    // Session lifecycle helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the session's questions in exam order (via exam_answers join),
     * alongside the answer slots.
     */
    getSessionWithQuestions(sessionId: string): {
        session: ExamSession
        questions: Question[]
        answers: ExamAnswer[]
    } | undefined {
        const session = this.getSession(sessionId)
        if (!session) return undefined

        const rows = this.db.prepare(`
            SELECT q.*, ea.question_order, ea.id as answer_id,
                   ea.selected_answer, ea.is_correct, ea.answered_at,
                   ea.time_spent_seconds, ea.exam_session_id
            FROM exam_answers ea
            JOIN questions q ON ea.question_id = q.id
            WHERE ea.exam_session_id = ?
            ORDER BY ea.question_order
        `).all(sessionId) as Record<string, unknown>[]

        const questions: Question[] = rows.map(r => rowToQuestion(r as unknown as QuestionRow))
        const answers: ExamAnswer[] = rows.map(r => ({
            id: r['answer_id'] as string,
            exam_session_id: r['exam_session_id'] as string,
            question_id: r['id'] as string,
            question_order: r['question_order'] as number,
            selected_answer: (r['selected_answer'] as AnswerChoice | null) ?? null,
            is_correct: r['is_correct'] == null ? null : Boolean(r['is_correct']),
            answered_at: (r['answered_at'] as string | null) ?? null,
            time_spent_seconds: (r['time_spent_seconds'] as number | null) ?? null,
        }))

        return { session, questions, answers }
    }

    /** Freezes the timer. Records current elapsed duration. */
    pauseSession(sessionId: string, durationSeconds: number): ExamSession {
        return this.updateSession(sessionId, {
            status: 'paused',
            paused_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
        })
    }

    /** Resumes a paused session. */
    resumeSession(sessionId: string): ExamSession {
        return this.updateSession(sessionId, {
            status: 'active',
            paused_at: null,
        })
    }
}

// ---------------------------------------------------------------------------
// Module-level singleton for use in Next.js API routes
// ---------------------------------------------------------------------------

let _client: DatabaseClient | undefined

export function getDb(): DatabaseClient {
    if (!_client) {
        const dbPath = process.env['DB_PATH'] ?? path.join(process.cwd(), 'data', 'ccaf.db')
        _client = new DatabaseClient(dbPath)
    }
    return _client
}
