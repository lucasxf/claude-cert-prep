import { getDb } from '@/db/database'
import { exportToCSV, exportToXLSX } from '@/export'
import { buildConsolidatedRow } from '@/report-generator'
import type { ExportColumn } from '@/export'

const COLUMNS: ExportColumn[] = [
    { header: 'Número', key: 'exam_number', width: 10 },
    { header: 'Data', key: 'date_formatted', width: 14 },
    { header: 'Duração', key: 'duration_formatted', width: 12 },
    { header: 'Resultado', key: 'resultado', width: 14 },
    { header: '% de Acertos', key: 'percentage_formatted', width: 14 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
]

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

export async function GET(req: Request): Promise<Response> {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'csv'

    try {
        const db = getDb()
        const sessions = db.listCompletedSessions()
        const exportRows = sessions.map((session, idx) => {
            const row = buildConsolidatedRow(session, idx + 1)
            return {
                exam_number: row.exam_number,
                date_formatted: formatDate(row.date),
                duration_formatted: formatDuration(row.duration_seconds),
                resultado:
                    row.correct_count != null
                        ? `${row.correct_count}/${row.total_questions}`
                        : `—/${row.total_questions}`,
                percentage_formatted: row.percentage != null ? `${row.percentage}%` : '—',
                score: row.score ?? '—',
                status: row.passed === true ? 'Aprovado' : row.passed === false ? 'Reprovado' : '—',
            }
        })
        // Most recent first in the export
        exportRows.reverse()

        if (format === 'xlsx') {
            const buf = await exportToXLSX(exportRows, COLUMNS, 'Histórico')
            return new Response(new Uint8Array(buf), {
                headers: {
                    'Content-Type':
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': 'attachment; filename="historico.xlsx"',
                },
            })
        }

        const buf = await exportToCSV(exportRows, COLUMNS)
        return new Response(new Uint8Array(buf), {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="historico.csv"',
            },
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error'
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
