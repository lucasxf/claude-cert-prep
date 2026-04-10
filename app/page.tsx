'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExamSession } from '@/types'

function formatScore(score: number | null): string {
    return score != null ? String(score) : '—'
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

export default function HomePage() {
    const router = useRouter()
    const [sessions, setSessions] = useState<ExamSession[]>([])
    const [isStarting, setIsStarting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/exams')
            .then(r => r.json())
            .then((d: { sessions: ExamSession[] }) => setSessions(d.sessions ?? []))
            .catch(() => setSessions([]))
    }, [])

    const handleStart = async () => {
        setIsStarting(true)
        setError(null)
        try {
            const res = await fetch('/api/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'exam' }),
            })
            const data = (await res.json()) as { session?: { id: string }; error?: string }
            if (!res.ok || !data.session) {
                setError(data.error ?? 'Erro ao criar simulado.')
                return
            }
            router.push(`/exam/${data.session.id}`)
        } catch {
            setError('Erro de conexão.')
        } finally {
            setIsStarting(false)
        }
    }

    const completedExams = sessions.filter(s => s.status === 'completed')
    const lastScore = completedExams[0]?.score ?? null
    const totalExams = completedExams.length

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
            <div className="max-w-xl w-full space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        CCA-F Exam Simulator
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Claude Certified Architect – Foundations
                    </p>
                </div>

                {/* Stats (only when exams exist) */}
                {totalExams > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl shadow p-4 text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Último score</p>
                            <p className={`text-3xl font-bold mt-1 ${
                                lastScore != null && lastScore >= 720 ? 'text-green-600' : 'text-red-500'
                            }`}>
                                {formatScore(lastScore)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">de 1000</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow p-4 text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Simulados</p>
                            <p className="text-3xl font-bold mt-1 text-gray-800">{totalExams}</p>
                            <p className="text-xs text-gray-400 mt-0.5">realizados</p>
                        </div>
                    </div>
                )}

                {/* Action card */}
                <div className="bg-white rounded-2xl shadow p-6 space-y-3">
                    {error && (
                        <p className="text-red-600 text-sm text-center">{error}</p>
                    )}
                    <button
                        onClick={handleStart}
                        disabled={isStarting}
                        className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isStarting ? 'Preparando simulado...' : 'Iniciar Simulado'}
                    </button>
                    <div className="flex gap-3 text-sm">
                        <button
                            onClick={() => router.push('/history')}
                            className="flex-1 text-center py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Histórico
                        </button>
                        <button
                            onClick={() => router.push('/practice')}
                            className="flex-1 text-center py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Praticar
                        </button>
                    </div>
                </div>

                {/* Recent exams */}
                {completedExams.length > 0 && (
                    <div className="bg-white rounded-2xl shadow divide-y divide-gray-100">
                        <h2 className="px-4 py-3 text-sm font-semibold text-gray-600">
                            Histórico recente
                        </h2>
                        {completedExams.slice(0, 3).map(s => (
                            <button
                                key={s.id}
                                onClick={() => router.push(`/exam/${s.id}/result`)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                            >
                                <span className="text-sm text-gray-600">{formatDate(s.started_at)}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold ${
                                        (s.score ?? 0) >= 720 ? 'text-green-600' : 'text-red-500'
                                    }`}>
                                        {formatScore(s.score)}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        s.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                    }`}>
                                        {s.passed ? 'Aprovado' : 'Reprovado'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Info */}
                <p className="text-center text-xs text-gray-400">
                    60 questões · 120 minutos · Nota mínima: 720/1000
                </p>
            </div>
        </main>
    )
}
