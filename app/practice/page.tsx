'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Domain } from '@/types'
import { DomainSelector } from './_components/DomainSelector'
import { QuestionCountSelector } from './_components/QuestionCountSelector'

// ---------------------------------------------------------------------------
// Inner component — needs Suspense boundary because of useSearchParams
// ---------------------------------------------------------------------------

function PracticeSetup() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Pre-select domains from ?domains=a,b query param (from WeakAreasBanner)
    const preSelected = (searchParams.get('domains') ?? '')
        .split(',')
        .filter(Boolean) as Domain[]

    // Source exam (passed when launched from a specific exam report)
    const sourceExamId = searchParams.get('source') ?? undefined

    const [selectedDomains, setSelectedDomains] = useState<Set<Domain>>(
        new Set(preSelected),
    )
    const [questionCount, setQuestionCount] = useState(10)
    const [isStarting, setIsStarting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleStart = async () => {
        if (selectedDomains.size === 0) return
        setIsStarting(true)
        setError(null)
        try {
            const res = await fetch('/api/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'practice',
                    domains: [...selectedDomains],
                    total_questions: questionCount,
                    source_exam_id: sourceExamId,
                }),
            })
            const data = (await res.json()) as { session?: { id: string }; error?: string }
            if (!res.ok || !data.session) {
                setError(data.error ?? 'Erro ao criar sessão de prática.')
                return
            }
            router.push(`/exam/${data.session.id}`)
        } catch {
            setError('Erro de conexão.')
        } finally {
            setIsStarting(false)
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        ← Início
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Prática Focada</h1>
                </div>

                {/* Domain selector */}
                <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                    <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
                        Selecionar Domínios
                    </h2>
                    <DomainSelector
                        selected={selectedDomains}
                        onChange={setSelectedDomains}
                    />
                </div>

                {/* Question count selector */}
                <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                    <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
                        Número de Questões
                    </h2>
                    <QuestionCountSelector value={questionCount} onChange={setQuestionCount} />
                </div>

                {/* Info */}
                <p className="text-xs text-gray-400 text-center">
                    {questionCount} questões · 30 minutos · Prioriza questões menos praticadas
                </p>

                {/* Error */}
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                {/* Start button */}
                <button
                    onClick={handleStart}
                    disabled={selectedDomains.size === 0 || isStarting}
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isStarting ? 'Preparando prática...' : 'Iniciar Prática'}
                </button>
            </div>
        </main>
    )
}

// ---------------------------------------------------------------------------
// Page — Suspense wrapper required for useSearchParams in Next.js App Router
// ---------------------------------------------------------------------------

export default function PracticePage() {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen items-center justify-center">
                    <p className="text-gray-400">Carregando...</p>
                </main>
            }
        >
            <PracticeSetup />
        </Suspense>
    )
}
