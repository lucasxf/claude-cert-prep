import { getDb } from '@/db/database'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET /api/exams/[id] — fetch session with questions and answer state
// ---------------------------------------------------------------------------

export async function GET(_req: Request, { params }: Params) {
    try {
        const { id } = await params
        const result = getDb().getSessionWithQuestions(id)

        if (!result) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        return NextResponse.json(result)
    } catch (err) {
        console.error('GET /api/exams/[id] error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/exams/[id] — pause or resume the session
// ---------------------------------------------------------------------------

export async function PATCH(request: Request, { params }: Params) {
    try {
        const { id } = await params
        const body = (await request.json()) as {
            action: 'pause' | 'resume'
            duration_seconds?: number
        }

        const db = getDb()

        if (body.action === 'pause') {
            const durationSeconds = body.duration_seconds ?? 0
            const session = db.pauseSession(id, durationSeconds)
            return NextResponse.json({ session })
        }

        if (body.action === 'resume') {
            const session = db.resumeSession(id)
            return NextResponse.json({ session })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (err) {
        console.error('PATCH /api/exams/[id] error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
