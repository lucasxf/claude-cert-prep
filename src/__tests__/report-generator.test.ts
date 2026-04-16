import { describe, expect, it } from 'vitest'
import {
    WEAK_AREA_THRESHOLD,
    buildConsolidatedRow,
    buildDomainBreakdown,
} from '../report-generator.js'
import type { DomainInfo, ExamAnswer, ExamSession, Question } from '../types.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const domainInfos: DomainInfo[] = [
    { id: 'agentic_architecture', label: 'Agentic Architecture', weight: 0.27, task_statements: [] },
    { id: 'claude_code', label: 'Claude Code', weight: 0.20, task_statements: [] },
    { id: 'prompt_engineering', label: 'Prompt Engineering', weight: 0.20, task_statements: [] },
    { id: 'tool_design_mcp', label: 'Tool Design & MCP', weight: 0.18, task_statements: [] },
    { id: 'context_reliability', label: 'Context Management', weight: 0.15, task_statements: [] },
]

function makeQuestion(id: string, domain: DomainInfo['id']): Question {
    return {
        id,
        domain,
        scenario: 'code_generation',
        stem: 'Question?',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        correct_answer: 'A',
        explanation: '',
        wrong_explanations: {},
        difficulty: 'foundation',
        tags: [],
        source: 'seed',
    }
}

function makeAnswer(questionId: string, isCorrect: boolean): ExamAnswer {
    return {
        id: `ans-${questionId}`,
        exam_session_id: 'session-1',
        question_id: questionId,
        question_order: 1,
        selected_answer: isCorrect ? 'A' : 'B',
        is_correct: isCorrect,
        answered_at: '2026-04-10T10:00:00.000Z',
        time_spent_seconds: 30,
    }
}

const baseSession: ExamSession = {
    id: 'session-1',
    mode: 'exam',
    status: 'completed',
    started_at: '2026-04-10T10:00:00.000Z',
    finished_at: '2026-04-10T12:00:00.000Z',
    paused_at: null,
    duration_seconds: 3600,
    time_limit_seconds: 7200,
    total_questions: 60,
    correct_count: 45,
    score: 750,
    passed: true,
    domain_filter: null,
    source_exam_id: null,
}

// ---------------------------------------------------------------------------
// buildConsolidatedRow
// ---------------------------------------------------------------------------

describe('buildConsolidatedRow', () => {
    it('maps all session fields to a consolidated row', () => {
        const row = buildConsolidatedRow(baseSession, 3)
        expect(row.session_id).toBe('session-1')
        expect(row.exam_number).toBe(3)
        expect(row.mode).toBe('exam')
        expect(row.date).toBe('2026-04-10T10:00:00.000Z')
        expect(row.duration_seconds).toBe(3600)
        expect(row.correct_count).toBe(45)
        expect(row.total_questions).toBe(60)
        expect(row.score).toBe(750)
        expect(row.passed).toBe(true)
    })

    it('calculates percentage correctly (45/60 = 75%)', () => {
        const row = buildConsolidatedRow(baseSession, 1)
        expect(row.percentage).toBe(75)
    })

    it('returns null percentage when correct_count is null', () => {
        const session = { ...baseSession, correct_count: null, score: null, passed: null }
        const row = buildConsolidatedRow(session, 1)
        expect(row.percentage).toBeNull()
    })

    it('assigns the given exam number', () => {
        const row1 = buildConsolidatedRow(baseSession, 1)
        const row5 = buildConsolidatedRow(baseSession, 5)
        expect(row1.exam_number).toBe(1)
        expect(row5.exam_number).toBe(5)
    })
})

// ---------------------------------------------------------------------------
// buildDomainBreakdown
// ---------------------------------------------------------------------------

describe('buildDomainBreakdown', () => {
    it('returns one row per domainInfo entry', () => {
        const rows = buildDomainBreakdown([], [], domainInfos)
        expect(rows).toHaveLength(5)
    })

    it('aggregates correct and total counts per domain', () => {
        const questions = [
            makeQuestion('q1', 'agentic_architecture'),
            makeQuestion('q2', 'agentic_architecture'),
            makeQuestion('q3', 'claude_code'),
        ]
        const answers = [
            makeAnswer('q1', true),
            makeAnswer('q2', false),
            makeAnswer('q3', true),
        ]
        const rows = buildDomainBreakdown(answers, questions, domainInfos)
        const agentic = rows.find(r => r.domain === 'agentic_architecture')!
        const cc = rows.find(r => r.domain === 'claude_code')!
        expect(agentic.total_questions).toBe(2)
        expect(agentic.correct).toBe(1)
        expect(agentic.percentage).toBe(50)
        expect(cc.total_questions).toBe(1)
        expect(cc.correct).toBe(1)
        expect(cc.percentage).toBe(100)
    })

    it('flags domain as weak area when percentage < WEAK_AREA_THRESHOLD', () => {
        const questions = Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`q${i}`, 'tool_design_mcp'),
        )
        // 6/10 = 60% — below 70%
        const answers = questions.map((q, i) => makeAnswer(q.id, i < 6))
        const rows = buildDomainBreakdown(answers, questions, domainInfos)
        const row = rows.find(r => r.domain === 'tool_design_mcp')!
        expect(row.percentage).toBe(60)
        expect(row.is_weak_area).toBe(true)
    })

    it('does NOT flag domain as weak area when percentage >= WEAK_AREA_THRESHOLD', () => {
        const questions = Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`q${i}`, 'claude_code'),
        )
        // 7/10 = 70% — exactly at threshold, NOT weak
        const answers = questions.map((q, i) => makeAnswer(q.id, i < 7))
        const rows = buildDomainBreakdown(answers, questions, domainInfos)
        const row = rows.find(r => r.domain === 'claude_code')!
        expect(row.percentage).toBe(70)
        expect(row.is_weak_area).toBe(false)
    })

    it('does NOT flag domain as weak area when it has no questions', () => {
        const rows = buildDomainBreakdown([], [], domainInfos)
        expect(rows.every(r => r.is_weak_area === false)).toBe(true)
    })

    it('returns zero counts for domains with no answers', () => {
        const rows = buildDomainBreakdown([], [], domainInfos)
        for (const row of rows) {
            expect(row.total_questions).toBe(0)
            expect(row.correct).toBe(0)
            expect(row.percentage).toBe(0)
        }
    })

    it('WEAK_AREA_THRESHOLD is 70', () => {
        expect(WEAK_AREA_THRESHOLD).toBe(70)
    })

    it('correctly calculates percentage (rounds to nearest integer)', () => {
        const questions = Array.from({ length: 3 }, (_, i) =>
            makeQuestion(`q${i}`, 'context_reliability'),
        )
        // 2/3 ≈ 66.67% → rounds to 67
        const answers = questions.map((q, i) => makeAnswer(q.id, i < 2))
        const rows = buildDomainBreakdown(answers, questions, domainInfos)
        const row = rows.find(r => r.domain === 'context_reliability')!
        expect(row.percentage).toBe(67)
    })
})
