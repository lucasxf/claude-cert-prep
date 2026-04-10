import { NextResponse } from 'next/server'
import { buildExam, buildPracticeExam } from '@/exam-builder'
import { getDb } from '@/db/database'
import type { Domain, DomainInfo } from '@/types'
import domainsJson from '../../../data/domains.json'

const DOMAINS = domainsJson as DomainInfo[]

// ---------------------------------------------------------------------------
// POST /api/exams — create a new exam or practice session
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            mode?: 'exam' | 'practice'
            /** Domains to focus on (practice mode). */
            domains?: Domain[]
            /** Question count (practice mode, default 10). */
            total_questions?: number
            /** ID of the full exam this practice session derives from. */
            source_exam_id?: string
        }

        const mode = body.mode ?? 'exam'
        const db = getDb()

        let examQuestions

        if (mode === 'practice' && body.domains && body.domains.length > 0) {
            // Practice: prefer least-practiced questions in the selected domains
            const count = body.total_questions ?? 10
            const sorted = db.getLeastPracticedQuestions(body.domains, count)
            examQuestions = buildPracticeExam(sorted, count)
        } else {
            // Full exam: proportional domain distribution
            const totalQuestions = body.total_questions ?? 60
            examQuestions = buildExam(db.listQuestions(), DOMAINS, totalQuestions)
        }

        if (examQuestions.length === 0) {
            return NextResponse.json(
                { error: 'No questions available. Run `npm run seed` first.' },
                { status: 422 },
            )
        }

        const session = db.createSession({
            mode,
            total_questions: examQuestions.length,
            // Practice sessions use 30-min timer; full exam uses 120-min (default)
            time_limit_seconds: mode === 'practice' ? 1800 : undefined,
            domain_filter: body.domains,
            source_exam_id: body.source_exam_id,
        })

        db.createAnswerSlots(session.id, examQuestions.map(q => q.id))

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
