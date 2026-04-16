import { getDb } from '@/db/database'
import { scoreExam } from '@/scorer'
import type { AnswerRecord } from '@/scorer'
import domainsJson from '../../../../../data/domains.json'
import type { Domain } from '@/types'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// POST /api/exams/[id]/submit — score and finalize the exam
// ---------------------------------------------------------------------------

export async function POST(request: Request, { params }: Params) {
    try {
        const { id: sessionId } = await params
        const body = (await request.json()) as { duration_seconds?: number }

        const db = getDb()
        const result = db.getSessionWithQuestions(sessionId)

        if (!result) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        if (result.session.status === 'completed') {
            return NextResponse.json({ error: 'Session already submitted' }, { status: 409 })
        }

        // Build domain weights map from domains.json
        const domainWeights = Object.fromEntries(
            domainsJson.map(d => [d.id as Domain, d.weight]),
        ) as Record<Domain, number>

        // Build answer records for scoring — one record per question in original
        // order, treating unanswered questions as incorrect. Using maps keyed by
        // question_id avoids index misalignment after any filtering.
        const questionDomainById = new Map(result.questions.map(q => [q.id, q.domain]))
        const answerByQuestionId = new Map(result.answers.map(a => [a.question_id, a]))

        const answerRecords: AnswerRecord[] = result.questions.map(q => {
            const answer = answerByQuestionId.get(q.id)
            return {
                domain: questionDomainById.get(q.id)!,
                is_correct: answer?.is_correct === true,
            }
        })

        const scoreResult = scoreExam(answerRecords, domainWeights)
        const durationSeconds = body.duration_seconds ?? result.session.duration_seconds

        const updatedSession = db.updateSession(sessionId, {
            status: 'completed',
            finished_at: new Date().toISOString(),
            correct_count: scoreResult.correct,
            score: scoreResult.score,
            passed: scoreResult.passed,
            duration_seconds: durationSeconds,
        })

        return NextResponse.json({
            session: updatedSession,
            total_questions: result.answers.length,
            correct: scoreResult.correct,
            score: scoreResult.score,
            passed: scoreResult.passed,
            duration_seconds: durationSeconds,
            domain_breakdown: scoreResult.domain_breakdown,
        })
    } catch (err) {
        console.error('POST /api/exams/[id]/submit error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
