import { NextResponse } from 'next/server'
import { getDb } from '@/db/database'
import { buildConsolidatedRow, buildDomainBreakdown } from '@/report-generator'
import domainsJson from '@/../data/domains.json'
import type { DomainInfo } from '@/types'

const DOMAINS = domainsJson as DomainInfo[]

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { id } = await params
    try {
        const db = getDb()
        const result = db.getSessionWithQuestions(id)
        if (!result) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        const { session, questions, answers } = result
        if (session.status !== 'completed') {
            return NextResponse.json({ error: 'Exam not yet completed' }, { status: 400 })
        }

        // Compute this exam's sequential number
        const allCompleted = db.listCompletedSessions()
        const examNumber = allCompleted.findIndex(s => s.id === id) + 1

        const breakdown = buildDomainBreakdown(answers, questions, DOMAINS)
        const consolidatedRow = buildConsolidatedRow(session, examNumber)

        return NextResponse.json({ session: consolidatedRow, breakdown })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
