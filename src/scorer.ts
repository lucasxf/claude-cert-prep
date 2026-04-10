import type { Domain, DomainBreakdown } from './types.js'

export const PASS_THRESHOLD = 720

export interface AnswerRecord {
    domain: Domain
    is_correct: boolean
}

export interface ScoreResult {
    total_questions: number
    correct: number
    /** Scaled score 0–1000: round(correct / total * 1000). */
    score: number
    passed: boolean
    domain_breakdown: DomainBreakdown[]
}

/**
 * Pure scoring function. Takes the answer records for a completed exam and
 * returns the scaled score and per-domain breakdown.
 *
 * @param answers - one record per question (domain + correctness)
 * @param domainWeights - map of Domain → weight fraction (must sum to 1)
 */
export function scoreExam(
    answers: AnswerRecord[],
    domainWeights: Record<Domain, number>,
): ScoreResult {
    const correct = answers.filter(a => a.is_correct).length
    const total = answers.length
    const score = total === 0 ? 0 : Math.round((correct / total) * 1000)
    const passed = score >= PASS_THRESHOLD

    // Aggregate per-domain counts
    const byDomain = new Map<Domain, { total: number; correct: number }>()
    for (const answer of answers) {
        const entry = byDomain.get(answer.domain) ?? { total: 0, correct: 0 }
        entry.total++
        if (answer.is_correct) entry.correct++
        byDomain.set(answer.domain, entry)
    }

    const domain_breakdown: DomainBreakdown[] = Object.entries(domainWeights).map(
        ([domainKey, weight]) => {
            const domain = domainKey as Domain
            const entry = byDomain.get(domain) ?? { total: 0, correct: 0 }
            return {
                domain,
                weight,
                total_questions: entry.total,
                correct: entry.correct,
                percentage:
                    entry.total === 0 ? 0 : Math.round((entry.correct / entry.total) * 100),
            }
        },
    )

    return { total_questions: total, correct, score, passed, domain_breakdown }
}
