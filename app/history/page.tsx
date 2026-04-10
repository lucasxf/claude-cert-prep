'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ConsolidatedRow } from '@/types'
import { ExportButtons } from './_components/ExportButtons'
import { HistoryTable } from './_components/HistoryTable'

export default function HistoryPage() {
    const router = useRouter()
    const [rows, setRows] = useState<ConsolidatedRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/reports/consolidated')
            .then(r => r.json())
            .then((d: { rows?: ConsolidatedRow[]; error?: string }) => {
                if (d.error) throw new Error(d.error)
                setRows(d.rows ?? [])
            })
            .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : 'Erro ao carregar histórico.'),
            )
            .finally(() => setLoading(false))
    }, [])

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            ← Início
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Histórico de Simulados
                        </h1>
                    </div>
                    {rows.length > 0 && (
                        <ExportButtons
                            csvUrl="/api/export/consolidated?format=csv"
                            xlsxUrl="/api/export/consolidated?format=xlsx"
                        />
                    )}
                </div>

                {/* Content */}
                {loading && (
                    <div className="bg-white rounded-2xl shadow p-8 text-center">
                        <p className="text-gray-400">Carregando...</p>
                    </div>
                )}
                {error && (
                    <div className="bg-white rounded-2xl shadow p-8 text-center">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}
                {!loading && !error && <HistoryTable rows={rows} />}

                {/* Summary */}
                {rows.length > 0 && (
                    <p className="text-xs text-gray-400 text-right">
                        {rows.length} simulado{rows.length !== 1 ? 's' : ''} realizado
                        {rows.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </main>
    )
}
