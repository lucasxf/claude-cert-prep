import { buildExam } from '@/exam-builder'
import { getDb } from '@/db/database'
import type { Domain, DomainInfo } from '@/types'
import domainsJson from '../../../data/domains.json'
import { NextResponse } from 'next/server'

const DOMAINS = domainsJson as DomainInfo[]

// ---------------------------------------------------------------------------
// POST /api/exams — create a new exam session
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            mode?: 'exam' | 'practice'
            domain_filter?: Domain[]
            total_questions?: number
        }

        const mode = body.mode ?? 'exam'
        const totalQuestions = body.total_questions ?? (mode === 'exam' ? 60 : 15)

        const db = getDb()

        // Select questions from pool
        const pool = db.listQuestions(
            body.domain_filter ? { domain: body.domain_filter[0] } : {},
        )

        // For domain-filtered practice, use all matching questions
        const examQuestions =
            body.domain_filter && body.domain_filter.length > 0
                ? (() => {
                      const filtered = pool
                      // shuffle and take totalQuestions
                      const shuffled = [...filtered].sort(() => Math.random() - 0.5)
                      return shuffled.slice(0, totalQuestions)
                  })()
                : buildExam(db.listQuestions(), DOMAINS, totalQuestions)

        if (examQuestions.length === 0) {
            return NextResponse.json(
                { error: 'No questions available. Run `npm run seed` first.' },
                { status: 422 },
            )
        }

        // Create session
        const session = db.createSession({
            mode,
            total_questions: examQuestions.length,
            domain_filter: body.domain_filter,
        })

        // Pre-create answer slots in exam order
        db.createAnswerSlots(
            session.id,
            examQuestions.map(q => q.id),
        )

        return NextResponse.json({ session, questions: examQuestions }, { status: 201 })
    } catch (err) {
        console.error('POST /api/exams error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// ---------------------------------------------------------------------------
// GET /api/exams — list recent sessions
// ---------------------------------------------------------------------------

export async function GET() {
    try {
        const sessions = getDb().listSessions()
        return NextResponse.json({ sessions })
    } catch (err) {
        console.error('GET /api/exams error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
