import { getDb } from '@/db/database'
import { exportToCSV, exportToXLSX } from '@/export'
import { buildDomainBreakdown } from '@/report-generator'
import domainsJson from '@/../data/domains.json'
import type { ExportColumn } from '@/export'
import type { DomainInfo } from '@/types'

const DOMAINS = domainsJson as DomainInfo[]

const COLUMNS: ExportColumn[] = [
    { header: 'Domínio', key: 'label', width: 36 },
    { header: 'Questões no Domínio', key: 'total_questions', width: 20 },
    { header: 'Acertos', key: 'correct', width: 12 },
    { header: '% de Acertos', key: 'percentage_formatted', width: 14 },
    { header: 'Área Fraca', key: 'area_fraca', width: 12 },
]

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'csv'

    try {
        const db = getDb()
        const result = db.getSessionWithQuestions(id)
        if (!result) {
            return new Response(JSON.stringify({ error: 'Session not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const { questions, answers } = result
        const breakdown = buildDomainBreakdown(answers, questions, DOMAINS)
        const exportRows = breakdown.map(row => ({
            label: row.label,
            total_questions: row.total_questions,
            correct: row.correct,
            percentage_formatted: `${row.percentage}%`,
            area_fraca: row.is_weak_area ? 'Sim' : 'Não',
        }))

        if (format === 'xlsx') {
            const buf = await exportToXLSX(exportRows, COLUMNS, 'Relatório')
            return new Response(new Uint8Array(buf), {
                headers: {
                    'Content-Type':
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="relatorio-${id}.xlsx"`,
                },
            })
        }

        const buf = await exportToCSV(exportRows, COLUMNS)
        return new Response(new Uint8Array(buf), {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="relatorio-${id}.csv"`,
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
