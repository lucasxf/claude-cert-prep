import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseClient } from '../db/database.js'
import type { QuestionSeed } from '../types.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEED_QUESTION: QuestionSeed = {
    domain: 'agentic_architecture',
    scenario: 'customer_support_agent',
    stem: 'What should the orchestrator do when stop_reason is "tool_use"?',
    options: {
        A: 'Execute the tool and send the result back to Claude',
        B: 'Return the tool result directly to the user',
        C: 'Start a new conversation with the tool result',
        D: 'Log the tool call and stop the loop',
    },
    correct_answer: 'A',
    explanation: 'The agentic loop continues: execute the tool and append the result to history.',
    wrong_explanations: {
        B: 'Bypassing Claude loses its reasoning capability.',
        C: 'Starting a new conversation discards all context.',
        D: 'The loop must not stop on tool_use.',
    },
    difficulty: 'foundation',
    tags: ['stop_reason', 'agentic_loop', 'tool_use'],
}

// ---------------------------------------------------------------------------
// Setup / teardown — use a temp file per test suite run
// ---------------------------------------------------------------------------

let dbPath: string
let client: DatabaseClient

beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `ccaf-test-${Date.now()}.db`)
    client = new DatabaseClient(dbPath)
})

afterEach(() => {
    client.close()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
})

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

describe('questions', () => {
    it('inserts and retrieves a question', () => {
        const q = client.insertQuestion(SEED_QUESTION)

        expect(q.id).toMatch(/^[0-9a-f-]{36}$/) // UUID format
        expect(q.domain).toBe('agentic_architecture')
        expect(q.options.A).toBe('Execute the tool and send the result back to Claude')
        expect(q.correct_answer).toBe('A')
        expect(q.tags).toEqual(['stop_reason', 'agentic_loop', 'tool_use'])
        expect(q.source).toBe('seed')
    })

    it('retrieves by id', () => {
        const inserted = client.insertQuestion(SEED_QUESTION)
        const retrieved = client.getQuestion(inserted.id)

        expect(retrieved).toBeDefined()
        expect(retrieved!.id).toBe(inserted.id)
    })

    it('returns undefined for unknown id', () => {
        expect(client.getQuestion('nonexistent')).toBeUndefined()
    })

    it('lists questions without filters', () => {
        client.insertQuestion(SEED_QUESTION)
        client.insertQuestion({ ...SEED_QUESTION, domain: 'claude_code' })

        const all = client.listQuestions()
        expect(all).toHaveLength(2)
    })

    it('filters by domain', () => {
        client.insertQuestion(SEED_QUESTION)
        client.insertQuestion({ ...SEED_QUESTION, domain: 'claude_code' })

        const filtered = client.listQuestions({ domain: 'claude_code' })
        expect(filtered).toHaveLength(1)
        expect(filtered[0]!.domain).toBe('claude_code')
    })

    it('respects exclude_ids filter', () => {
        const q1 = client.insertQuestion(SEED_QUESTION)
        client.insertQuestion(SEED_QUESTION)

        const result = client.listQuestions({ exclude_ids: [q1.id] })
        expect(result.every((q) => q.id !== q1.id)).toBe(true)
    })

    it('respects limit filter', () => {
        for (let i = 0; i < 5; i++) client.insertQuestion(SEED_QUESTION)
        expect(client.listQuestions({ limit: 3 })).toHaveLength(3)
    })

    it('counts questions', () => {
        client.insertQuestion(SEED_QUESTION)
        client.insertQuestion({ ...SEED_QUESTION, domain: 'claude_code' })

        expect(client.countQuestions()).toBe(2)
        expect(client.countQuestions('agentic_architecture')).toBe(1)
        expect(client.countQuestions('claude_code')).toBe(1)
        expect(client.countQuestions('tool_design_mcp')).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// Exam sessions
// ---------------------------------------------------------------------------

describe('exam sessions', () => {
    it('creates a session with default time limit', () => {
        const session = client.createSession({ mode: 'exam', total_questions: 60 })

        expect(session.id).toMatch(/^[0-9a-f-]{36}$/)
        expect(session.mode).toBe('exam')
        expect(session.status).toBe('active')
        expect(session.time_limit_seconds).toBe(7200)
        expect(session.total_questions).toBe(60)
        expect(session.passed).toBeNull()
    })

    it('creates a practice session with shorter time limit', () => {
        const session = client.createSession({ mode: 'practice', total_questions: 15 })
        expect(session.time_limit_seconds).toBe(1800)
    })

    it('stores domain_filter as JSON', () => {
        const session = client.createSession({
            mode: 'practice',
            total_questions: 10,
            domain_filter: ['agentic_architecture', 'claude_code'],
        })
        expect(session.domain_filter).toBe('["agentic_architecture","claude_code"]')
    })

    it('retrieves session by id', () => {
        const created = client.createSession({ mode: 'exam', total_questions: 60 })
        const retrieved = client.getSession(created.id)
        expect(retrieved).toBeDefined()
        expect(retrieved!.id).toBe(created.id)
    })

    it('returns undefined for unknown session id', () => {
        expect(client.getSession('nonexistent')).toBeUndefined()
    })

    it('updates session status', () => {
        const session = client.createSession({ mode: 'exam', total_questions: 60 })
        const updated = client.updateSession(session.id, { status: 'paused', duration_seconds: 300 })

        expect(updated.status).toBe('paused')
        expect(updated.duration_seconds).toBe(300)
    })

    it('lists sessions ordered by started_at desc', () => {
        client.createSession({ mode: 'exam', total_questions: 60 })
        client.createSession({ mode: 'practice', total_questions: 10 })

        const sessions = client.listSessions()
        expect(sessions).toHaveLength(2)
        // Most recent first
        expect(sessions[0]!.mode).toBe('practice')
    })
})

// ---------------------------------------------------------------------------
// Exam answers
// ---------------------------------------------------------------------------

describe('exam answers', () => {
    it('creates answer slots for all questions in a session', () => {
        const q1 = client.insertQuestion(SEED_QUESTION)
        const q2 = client.insertQuestion(SEED_QUESTION)
        const session = client.createSession({ mode: 'exam', total_questions: 2 })

        client.createAnswerSlots(session.id, [q1.id, q2.id])

        const answers = client.getAnswers(session.id)
        expect(answers).toHaveLength(2)
        expect(answers[0]!.question_order).toBe(1)
        expect(answers[1]!.question_order).toBe(2)
        expect(answers[0]!.selected_answer).toBeNull()
    })

    it('records a submitted answer and evaluates correctness', () => {
        const q = client.insertQuestion(SEED_QUESTION) // correct_answer = 'A'
        const session = client.createSession({ mode: 'exam', total_questions: 1 })
        client.createAnswerSlots(session.id, [q.id])

        const result = client.submitAnswer(session.id, q.id, 'A')
        expect(result.selected_answer).toBe('A')
        expect(result.is_correct).toBe(true)
        expect(result.answered_at).not.toBeNull()
    })

    it('records an incorrect answer', () => {
        const q = client.insertQuestion(SEED_QUESTION) // correct_answer = 'A'
        const session = client.createSession({ mode: 'exam', total_questions: 1 })
        client.createAnswerSlots(session.id, [q.id])

        const result = client.submitAnswer(session.id, q.id, 'B')
        expect(result.is_correct).toBe(false)
    })

    it('throws when submitting answer for unknown question', () => {
        const session = client.createSession({ mode: 'exam', total_questions: 1 })
        expect(() => client.submitAnswer(session.id, 'bad-id', 'A')).toThrow('not found')
    })
})
