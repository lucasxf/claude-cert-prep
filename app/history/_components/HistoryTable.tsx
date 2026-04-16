'use client'

import { useRouter } from 'next/navigation'
import type { ConsolidatedRow } from '@/types'

interface HistoryTableProps {
    rows: ConsolidatedRow[]
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
    })
}

export function HistoryTable({ rows }: HistoryTableProps) {
    const router = useRouter()

    if (rows.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow p-8 text-center space-y-3">
                <p className="text-gray-500">Nenhum simulado realizado ainda.</p>
                <button
                    onClick={() => router.push('/')}
                    className="inline-block px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                    Iniciar Simulado
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-left">
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                                Nº
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Data
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Duração
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Resultado
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                % de Acertos
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Score
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rows.map(row => (
                            <tr
                                key={row.session_id}
                                onClick={() => router.push(`/exam/${row.session_id}/report`)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <td className="px-4 py-3 font-medium text-gray-500">
                                    {row.exam_number}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                    {formatDate(row.date)}
                                </td>
                                <td className="px-4 py-3 text-gray-700 tabular-nums">
                                    {formatDuration(row.duration_seconds)}
                                </td>
                                <td className="px-4 py-3 text-gray-700 tabular-nums">
                                    {row.correct_count != null
                                        ? `${row.correct_count}/${row.total_questions}`
                                        : `—/${row.total_questions}`}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                    <span
                                        className={
                                            row.percentage != null && row.percentage >= 70
                                                ? 'text-green-600 font-medium'
                                                : 'text-red-500 font-medium'
                                        }
                                    >
                                        {row.percentage != null ? `${row.percentage}%` : '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 tabular-nums font-semibold text-gray-800">
                                    {row.score ?? '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {row.mode === 'practice' ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                                            Prática
                                        </span>
                                    ) : (
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                row.passed
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-600'
                                            }`}
                                        >
                                            {row.passed ? 'Aprovado' : 'Reprovado'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
