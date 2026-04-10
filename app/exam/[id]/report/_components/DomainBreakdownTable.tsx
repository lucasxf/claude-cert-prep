import type { DomainBreakdownRow } from '@/types'

interface DomainBreakdownTableProps {
    rows: DomainBreakdownRow[]
}

export function DomainBreakdownTable({ rows }: DomainBreakdownTableProps) {
    return (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-700">Desempenho por Domínio</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-left">
                            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Domínio
                            </th>
                            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                Questões
                            </th>
                            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                Acertos
                            </th>
                            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                % de Acertos
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rows.map(row => (
                            <tr
                                key={row.domain}
                                className={row.is_weak_area ? 'bg-red-50' : undefined}
                            >
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-800 font-medium">
                                            {row.label}
                                        </span>
                                        {row.is_weak_area && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                                Área Fraca
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center text-gray-700 tabular-nums">
                                    {row.total_questions}
                                </td>
                                <td className="px-5 py-3 text-center text-gray-700 tabular-nums">
                                    {row.correct}
                                </td>
                                <td className="px-5 py-3 text-center tabular-nums">
                                    <span
                                        className={`font-semibold ${
                                            row.total_questions === 0
                                                ? 'text-gray-400'
                                                : row.is_weak_area
                                                  ? 'text-red-600'
                                                  : 'text-green-600'
                                        }`}
                                    >
                                        {row.total_questions === 0 ? '—' : `${row.percentage}%`}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
