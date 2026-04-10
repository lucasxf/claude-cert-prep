import type { ConsolidatedRow } from '@/types'

interface ExamSummaryBarProps {
    row: ConsolidatedRow
}

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
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function ExamSummaryBar({ row }: ExamSummaryBarProps) {
    return (
        <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex flex-wrap items-center gap-4 justify-between">
                {/* Score */}
                <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Score</p>
                    <p
                        className={`text-4xl font-extrabold ${
                            row.passed ? 'text-green-600' : 'text-red-500'
                        }`}
                    >
                        {row.score ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">de 1000</p>
                </div>

                {/* Status */}
                <div className="text-center">
                    <span
                        className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
                            row.passed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                    >
                        {row.passed ? 'Aprovado' : 'Reprovado'}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-sm text-gray-600">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Data</p>
                        <p className="font-medium">{formatDate(row.date)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Duração</p>
                        <p className="font-medium tabular-nums">
                            {formatDuration(row.duration_seconds)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Resultado</p>
                        <p className="font-medium tabular-nums">
                            {row.correct_count != null
                                ? `${row.correct_count}/${row.total_questions}`
                                : `—/${row.total_questions}`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
