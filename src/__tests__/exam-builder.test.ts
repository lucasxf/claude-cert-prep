import { describe, expect, it } from 'vitest'
import { allocateCounts, buildExam } from '../exam-builder.js'
import type { Domain, DomainInfo, Question } from '../types.js'

const DOMAINS: DomainInfo[] = [
    { id: 'agentic_architecture', label: 'Agentic', weight: 0.27, task_statements: [] },
    { id: 'claude_code', label: 'Claude Code', weight: 0.20, task_statements: [] },
    { id: 'prompt_engineering', label: 'Prompt', weight: 0.20, task_statements: [] },
    { id: 'tool_design_mcp', label: 'Tool Design', weight: 0.18, task_statements: [] },
    { id: 'context_reliability', label: 'Context', weight: 0.15, task_statements: [] },
]

function makeQuestion(domain: Domain, index: number): Question {
    return {
        id: `${domain}-${index}`,
        domain,
        scenario: 'customer_support_agent',
        stem: `Question ${index} in ${domain}`,
        options: { A: 'A', B: 'B', C: 'C', D: 'D' },
        correct_answer: 'A',
        explanation: 'explanation',
        wrong_explanations: {},
        difficulty: 'foundation',
        tags: [],
        source: 'seed',
    }
}

/** Pool with `perDomain` questions per domain (150 total by default). */
function makePool(perDomain = 30): Question[] {
    const domains: Domain[] = [
        'agentic_architecture',
        'claude_code',
        'prompt_engineering',
        'tool_design_mcp',
        'context_reliability',
    ]
    return domains.flatMap(d => Array.from({ length: perDomain }, (_, i) => makeQuestion(d, i)))
}

// ---------------------------------------------------------------------------
// allocateCounts
// ---------------------------------------------------------------------------

describe('allocateCounts', () => {
    it('sums to exactly 60', () => {
        const counts = allocateCounts(DOMAINS, 60)
        const total = [...counts.values()].reduce((s, n) => s + n, 0)
        expect(total).toBe(60)
    })

    it('matches the expected CCA-F distribution for 60 questions', () => {
        const counts = allocateCounts(DOMAINS, 60)
        // 27% * 60 = 16.2 → 16; 20% * 60 = 12; 18% * 60 = 10.8 → 11; 15% * 60 = 9
        expect(counts.get('agentic_architecture')).toBe(16)
        expect(counts.get('claude_code')).toBe(12)
        expect(counts.get('prompt_engineering')).toBe(12)
        expect(counts.get('tool_design_mcp')).toBe(11)
        expect(counts.get('context_reliability')).toBe(9)
    })

    it('sums to exactly 10 for a custom total', () => {
        const counts = allocateCounts(DOMAINS, 10)
        const total = [...counts.values()].reduce((s, n) => s + n, 0)
        expect(total).toBe(10)
    })
})

// ---------------------------------------------------------------------------
// buildExam
// ---------------------------------------------------------------------------

describe('buildExam', () => {
    it('returns exactly 60 questions when pool is sufficient', () => {
        const exam = buildExam(makePool(30), DOMAINS, 60)
        expect(exam).toHaveLength(60)
    })

    it('distributes questions by domain weight', () => {
        const exam = buildExam(makePool(30), DOMAINS, 60)

        const byDomain = new Map<Domain, number>()
        for (const q of exam) {
            byDomain.set(q.domain, (byDomain.get(q.domain) ?? 0) + 1)
        }

        expect(byDomain.get('agentic_architecture')).toBe(16)
        expect(byDomain.get('claude_code')).toBe(12)
        expect(byDomain.get('prompt_engineering')).toBe(12)
        expect(byDomain.get('tool_design_mcp')).toBe(11)
        expect(byDomain.get('context_reliability')).toBe(9)
    })

    it('does not return duplicate questions', () => {
        const exam = buildExam(makePool(30), DOMAINS, 60)
        const ids = exam.map(q => q.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('randomizes question order (different order across calls)', () => {
        const pool = makePool(30)
        const ids1 = buildExam(pool, DOMAINS, 60).map(q => q.id).join(',')
        const ids2 = buildExam(pool, DOMAINS, 60).map(q => q.id).join(',')
        // With 60! permutations, probability of identical order is negligible
        expect(ids1).not.toBe(ids2)
    })

    it('returns fewer questions when pool is smaller than target', () => {
        // 3 questions per domain = 15 total pool, 60 requested
        const exam = buildExam(makePool(3), DOMAINS, 60)
        expect(exam.length).toBeLessThan(60)
        expect(exam.length).toBe(15) // all 15 pool questions used
    })

    it('handles empty pool gracefully', () => {
        const exam = buildExam([], DOMAINS, 60)
        expect(exam).toHaveLength(0)
    })
})
