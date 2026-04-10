'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ConsolidatedRow, DomainBreakdownRow } from '@/types'
import { DomainBreakdownTable } from './_components/DomainBreakdownTable'
import { ExamSummaryBar } from './_components/ExamSummaryBar'
import { WeakAreasBanner } from './_components/WeakAreasBanner'
import { ExportButtons } from '../../../history/_components/ExportButtons'

interface ReportPayload {
    session: ConsolidatedRow
    breakdown: DomainBreakdownRow[]
}

export default function ExamReportPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [data, setData] = useState<ReportPayload | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch(`/api/reports/${id}`)
            .then(r => {
                if (!r.ok) throw new Error('Relatório não disponível.')
                return r.json() as Promise<ReportPayload>
            })
            .then(setData)
            .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : 'Erro ao carregar relatório.'),
            )
    }, [id])

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center p-8">
                <p className="text-red-600">{error}</p>
            </main>
        )
    }

    if (!data) {
        return (
            <main className="flex min-h-screen items-center justify-center p-8">
                <p className="text-gray-400">Carregando relatório...</p>
            </main>
        )
    }

    const weakDomains = data.breakdown.filter(d => d.is_weak_area)

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/history')}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            ← Histórico
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">
                            Relatório do Simulado #{data.session.exam_number}
                        </h1>
                    </div>
                    <ExportButtons
                        csvUrl={`/api/export/${id}?format=csv`}
                        xlsxUrl={`/api/export/${id}?format=xlsx`}
                    />
                </div>

                {/* Summary bar */}
                <ExamSummaryBar row={data.session} />

                {/* Weak areas banner */}
                <WeakAreasBanner weakDomains={weakDomains} />

                {/* Domain breakdown table */}
                <DomainBreakdownTable rows={data.breakdown} />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => router.push(`/exam/${id}/result`)}
                        className="flex-1 py-3 px-5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Ver Resultado
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="flex-1 py-3 px-5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                    >
                        Novo Simulado
                    </button>
                </div>
            </div>
        </main>
    )
}
