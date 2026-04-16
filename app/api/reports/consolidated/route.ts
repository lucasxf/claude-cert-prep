import { NextResponse } from 'next/server'
import { getDb } from '@/db/database'
import { buildConsolidatedRow } from '@/report-generator'
import type { ConsolidatedRow } from '@/types'

export async function GET(): Promise<NextResponse> {
    try {
        const db = getDb()
        // Sessions ordered oldest→newest (for sequential numbering)
        const sessions = db.listCompletedSessions()
        const rows: ConsolidatedRow[] = sessions.map((session, idx) =>
            buildConsolidatedRow(session, idx + 1),
        )
        // Reverse for display: most recent first
        rows.reverse()
        return NextResponse.json({ rows })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
