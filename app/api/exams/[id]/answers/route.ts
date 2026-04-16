import { getDb } from '@/db/database'
import type { AnswerChoice } from '@/types'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// POST /api/exams/[id]/answers — record a single question answer
// ---------------------------------------------------------------------------

export async function POST(request: Request, { params }: Params) {
    try {
        const { id: sessionId } = await params
        const body = (await request.json()) as {
            question_id: string
            selected_answer: AnswerChoice
            time_spent_seconds?: number
        }

        if (!body.question_id || !body.selected_answer) {
            return NextResponse.json(
                { error: 'question_id and selected_answer are required' },
                { status: 400 },
            )
        }

        const answer = getDb().submitAnswer(
            sessionId,
            body.question_id,
            body.selected_answer,
            body.time_spent_seconds,
        )

        return NextResponse.json({ answer })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error'
        console.error('POST /api/exams/[id]/answers error:', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// ---------------------------------------------------------------------------
// GET /api/exams/[id]/answers — fetch all answers for a session
// ---------------------------------------------------------------------------

export async function GET(_req: Request, { params }: Params) {
    try {
        const { id: sessionId } = await params
        const answers = getDb().getAnswers(sessionId)
        return NextResponse.json({ answers })
    } catch (err) {
        console.error('GET /api/exams/[id]/answers error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
