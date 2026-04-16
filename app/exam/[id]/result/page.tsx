'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { DomainBreakdown, ExamSession } from '@/types'

interface ResultData {
    session: ExamSession
    total_questions: number
    correct: number
    score: number
    passed: boolean
    duration_seconds: number
    domain_breakdown: DomainBreakdown[]
}

const DOMAIN_LABELS: Record<string, string> = {
    agentic_architecture: 'Agentic Architecture & Orchestration',
    claude_code: 'Claude Code Configuration & Workflows',
    prompt_engineering: 'Prompt Engineering & Structured Output',
    tool_design_mcp: 'Tool Design & MCP Integration',
    context_reliability: 'Context Management & Reliability',
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

export default function ResultPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [data, setData] = useState<ResultData | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Result data is stored in sessionStorage by the exam page after submit
        const cached = sessionStorage.getItem(`exam-result:${id}`)
        if (cached) {
            setData(JSON.parse(cached) as ResultData)
            return
        }

        // Fallback: try to reconstruct from session (for page refresh)
        fetch(`/api/exams/${id}`)
            .then(r => r.json())
            .then((payload: { session: ExamSession }) => {
                const s = payload.session
                if (s.status !== 'completed' || s.score == null) {
                    setError('Resultado não disponível.')
                    return
                }
                // Minimal result from session data (no domain breakdown on fallback)
                setData({
                    session: s,
                    total_questions: s.total_questions,
                    correct: s.correct_count ?? 0,
                    score: s.score,
                    passed: s.passed ?? false,
                    duration_seconds: s.duration_seconds,
                    domain_breakdown: [],
                })
            })
            .catch(() => setError('Erro ao carregar resultado.'))
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
                <p className="text-gray-500">Carregando resultado...</p>
            </main>
        )
    }

    const pct = Math.round((data.correct / data.total_questions) * 100)

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
            <div className="max-w-2xl w-full space-y-6">
                {/* Score card */}
                <div className="bg-white rounded-2xl shadow p-8 text-center space-y-3">
                    <h1 className="text-2xl font-bold text-gray-800">Resultado do Simulado</h1>
                    <div className={`text-7xl font-extrabold ${data.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {data.score}
                    </div>
                    <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                        data.passed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}>
                        {data.passed ? 'Aprovado' : 'Reprovado'}
                    </div>
                    <p className="text-gray-500 text-sm">
                        {data.correct} de {data.total_questions} corretas ({pct}%) &middot;{' '}
                        Duração: {formatDuration(data.duration_seconds)}
                    </p>
                    <p className="text-xs text-gray-400">Nota mínima: 720 / 1000</p>
                </div>

                {/* Domain breakdown */}
                {data.domain_breakdown.length > 0 && (
                    <div className="bg-white rounded-2xl shadow p-6 space-y-3">
                        <h2 className="font-semibold text-gray-700">Desempenho por Domínio</h2>
                        {data.domain_breakdown.map(d => (
                            <div key={d.domain} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{DOMAIN_LABELS[d.domain] ?? d.domain}</span>
                                    <span className={`font-medium ${
                                        d.percentage >= 72 ? 'text-green-600' : 'text-red-500'
                                    }`}>
                                        {d.correct}/{d.total_questions} ({d.percentage}%)
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            d.percentage >= 72 ? 'bg-green-500' : 'bg-red-400'
                                        }`}
                                        style={{ width: `${d.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => router.push(`/exam/${id}/report`)}
                        className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                        Ver Relatório Completo
                    </button>
                    <button
                        onClick={() => router.push('/history')}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        Ver Histórico
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        Novo Simulado
                    </button>
                </div>
            </div>
        </main>
    )
}
