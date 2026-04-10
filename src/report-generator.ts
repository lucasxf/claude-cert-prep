import type {
    ConsolidatedRow,
    DomainBreakdownRow,
    DomainInfo,
    ExamAnswer,
    ExamSession,
    Question,
} from './types.js'

/** Domains scoring below this threshold are flagged as weak areas. */
export const WEAK_AREA_THRESHOLD = 70

/**
 * Computes per-domain correctness from the answers of a completed session.
 * Domains with no questions are included with 0% but NOT flagged as weak areas.
 */
export function buildDomainBreakdown(
    answers: ExamAnswer[],
    questions: Question[],
    domainInfos: DomainInfo[],
): DomainBreakdownRow[] {
    // Map question_id → domain for O(1) lookup
    const questionDomain = new Map<string, string>()
    for (const q of questions) {
        questionDomain.set(q.id, q.domain)
    }

    // Aggregate per domain
    const byDomain = new Map<string, { total: number; correct: number }>()
    for (const answer of answers) {
        const domain = questionDomain.get(answer.question_id)
        if (!domain) continue
        const entry = byDomain.get(domain) ?? { total: 0, correct: 0 }
        entry.total++
        if (answer.is_correct) entry.correct++
        byDomain.set(domain, entry)
    }

    return domainInfos.map(info => {
        const entry = byDomain.get(info.id) ?? { total: 0, correct: 0 }
        const percentage =
            entry.total === 0 ? 0 : Math.round((entry.correct / entry.total) * 100)
        return {
            domain: info.id,
            label: info.label,
            weight: info.weight,
            total_questions: entry.total,
            correct: entry.correct,
            percentage,
            is_weak_area: entry.total > 0 && percentage < WEAK_AREA_THRESHOLD,
        }
    })
}

/**
 * Converts a completed ExamSession to a single consolidated history row.
 * @param examNumber - Chronological position (1 = oldest, N = most recent).
 */
export function buildConsolidatedRow(
    session: ExamSession,
    examNumber: number,
): ConsolidatedRow {
    const { correct_count, total_questions } = session
    const percentage =
        correct_count != null && total_questions > 0
            ? Math.round((correct_count / total_questions) * 100)
            : null

    return {
        session_id: session.id,
        exam_number: examNumber,
        mode: session.mode,
        date: session.started_at,
        duration_seconds: session.duration_seconds,
        correct_count,
        total_questions,
        percentage,
        score: session.score,
        passed: session.passed,
    }
}
