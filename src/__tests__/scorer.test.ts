import { describe, expect, it } from 'vitest'
import { PASS_THRESHOLD, scoreExam } from '../scorer.js'
import type { AnswerRecord } from '../scorer.js'
import type { Domain } from '../types.js'

const WEIGHTS: Record<Domain, number> = {
    agentic_architecture: 0.27,
    claude_code: 0.20,
    prompt_engineering: 0.20,
    tool_design_mcp: 0.18,
    context_reliability: 0.15,
}

function makeAnswers(domain: Domain, correct: number, total: number): AnswerRecord[] {
    return [
        ...Array.from({ length: correct }, () => ({ domain, is_correct: true })),
        ...Array.from({ length: total - correct }, () => ({ domain, is_correct: false })),
    ]
}

describe('scoreExam', () => {
    it('scores 0 for zero correct answers', () => {
        const answers = makeAnswers('agentic_architecture', 0, 60)
        const result = scoreExam(answers, WEIGHTS)
        expect(result.score).toBe(0)
        expect(result.passed).toBe(false)
        expect(result.correct).toBe(0)
        expect(result.total_questions).toBe(60)
    })

    it('scores 1000 for all correct', () => {
        const answers = makeAnswers('agentic_architecture', 60, 60)
        const result = scoreExam(answers, WEIGHTS)
        expect(result.score).toBe(1000)
        expect(result.passed).toBe(true)
    })

    it('scores 750 for 45/60 (AC5 from spec)', () => {
        const answers = makeAnswers('agentic_architecture', 45, 60)
        const result = scoreExam(answers, WEIGHTS)
        expect(result.score).toBe(750)
        expect(result.passed).toBe(true)
    })

    it(`uses ${PASS_THRESHOLD} as the passing threshold`, () => {
        // 44/60 = 733 → pass
        const passing = makeAnswers('agentic_architecture', 44, 60)
        expect(scoreExam(passing, WEIGHTS).passed).toBe(true)
        expect(scoreExam(passing, WEIGHTS).score).toBe(733)

        // 43/60 = 717 → fail
        const failing = makeAnswers('agentic_architecture', 43, 60)
        expect(scoreExam(failing, WEIGHTS).passed).toBe(false)
        expect(scoreExam(failing, WEIGHTS).score).toBe(717)
    })

    it('handles empty answer list', () => {
        const result = scoreExam([], WEIGHTS)
        expect(result.score).toBe(0)
        expect(result.passed).toBe(false)
        expect(result.total_questions).toBe(0)
        expect(result.correct).toBe(0)
    })

    it('produces domain breakdown with correct percentages', () => {
        const answers = [
            ...makeAnswers('agentic_architecture', 8, 16),   // 50%
            ...makeAnswers('claude_code', 12, 12),            // 100%
            ...makeAnswers('prompt_engineering', 6, 12),      // 50%
            ...makeAnswers('tool_design_mcp', 0, 11),         // 0%
            ...makeAnswers('context_reliability', 9, 9),      // 100%
        ]
        const result = scoreExam(answers, WEIGHTS)
        const byDomain = Object.fromEntries(result.domain_breakdown.map(d => [d.domain, d]))

        expect(byDomain['agentic_architecture']!.percentage).toBe(50)
        expect(byDomain['claude_code']!.percentage).toBe(100)
        expect(byDomain['prompt_engineering']!.percentage).toBe(50)
        expect(byDomain['tool_design_mcp']!.percentage).toBe(0)
        expect(byDomain['context_reliability']!.percentage).toBe(100)
    })

    it('returns 0% for domains with no questions in the answer list', () => {
        const answers = makeAnswers('agentic_architecture', 10, 10)
        const result = scoreExam(answers, WEIGHTS)
        const noQ = result.domain_breakdown.filter(d => d.domain !== 'agentic_architecture')
        expect(noQ.every(d => d.percentage === 0)).toBe(true)
        expect(noQ.every(d => d.total_questions === 0)).toBe(true)
    })

    it('domain breakdown includes weight from the provided weights map', () => {
        const answers = makeAnswers('agentic_architecture', 5, 10)
        const result = scoreExam(answers, WEIGHTS)
        const aa = result.domain_breakdown.find(d => d.domain === 'agentic_architecture')!
        expect(aa.weight).toBe(0.27)
    })

    it('domain breakdown covers all domains in the weights map', () => {
        const answers = makeAnswers('agentic_architecture', 5, 10)
        const result = scoreExam(answers, WEIGHTS)
        const domains = result.domain_breakdown.map(d => d.domain).sort()
        expect(domains).toEqual(Object.keys(WEIGHTS).sort())
    })
})
