'use client'

import { useCallback, useEffect, useOptimistic, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { AnswerChoice, ExamAnswer, ExamSession, Question } from '@/types'
import { ExamTimer } from './_components/ExamTimer'
import { PauseOverlay } from './_components/PauseOverlay'
import { QuestionCard } from './_components/QuestionCard'
import { QuestionNavigator } from './_components/QuestionNavigator'
import { SubmitButton } from './_components/SubmitButton'

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

interface LocalState {
    sessionId: string
    currentIndex: number
    answers: Record<string, AnswerChoice>
    flagged: string[]
    lastSyncedAt: number
}

const LS_TTL_MS = 5 * 60 * 1000 // 5 minutes

function saveLocal(state: LocalState) {
    try {
        localStorage.setItem(`exam:${state.sessionId}`, JSON.stringify(state))
    } catch {
        // ignore storage quota errors
    }
}

function loadLocal(sessionId: string): LocalState | null {
    try {
        const raw = localStorage.getItem(`exam:${sessionId}`)
        if (!raw) return null
        const parsed = JSON.parse(raw) as LocalState
        if (Date.now() - parsed.lastSyncedAt > LS_TTL_MS) return null
        return parsed
    } catch {
        return null
    }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExamPayload {
    session: ExamSession
    questions: Question[]
    answers: ExamAnswer[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExamPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [payload, setPayload] = useState<ExamPayload | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, AnswerChoice>>({})
    const [flagged, setFlagged] = useState<Set<string>>(new Set())
    const [isPaused, setIsPaused] = useState(false)
    const [remainingSeconds, setRemainingSeconds] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isPauseLoading, setIsPauseLoading] = useState(false)

    // Track when the current question was first displayed
    const questionStartRef = useRef<number>(Date.now())

    // optimistic answer updates for snappy UI
    const [optimisticAnswers, applyOptimistic] = useOptimistic(
        answers,
        (state, { questionId, choice }: { questionId: string; choice: AnswerChoice }) => ({
            ...state,
            [questionId]: choice,
        }),
    )

    // -------------------------------------------------------------------------
    // Load session on mount
    // -------------------------------------------------------------------------

    useEffect(() => {
        const local = loadLocal(id)

        fetch(`/api/exams/${id}`)
            .then(r => {
                if (!r.ok) throw new Error('Session not found')
                return r.json() as Promise<ExamPayload>
            })
            .then(data => {
                if (data.session.status === 'completed') {
                    router.replace(`/exam/${id}/result`)
                    return
                }

                setPayload(data)
                setIsPaused(data.session.status === 'paused')

                // Time remaining = limit - accumulated duration
                const remaining =
                    data.session.time_limit_seconds - data.session.duration_seconds
                setRemainingSeconds(Math.max(0, remaining))

                // Restore answers from API
                const serverAnswers: Record<string, AnswerChoice> = {}
                for (const a of data.answers) {
                    if (a.selected_answer) serverAnswers[a.question_id] = a.selected_answer
                }

                // Merge localStorage on top if fresh
                if (local && local.sessionId === id) {
                    const merged = { ...serverAnswers, ...local.answers }
                    setAnswers(merged)
                    setCurrentIndex(local.currentIndex)
                    setFlagged(new Set(local.flagged))
                } else {
                    setAnswers(serverAnswers)
                    // Jump to first unanswered question
                    const firstUnanswered = data.answers.findIndex(a => !a.selected_answer)
                    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0)
                }
            })
            .catch(() => setError('Erro ao carregar simulado.'))
    }, [id, router])

    // -------------------------------------------------------------------------
    // Persist local state on changes
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!payload) return
        saveLocal({
            sessionId: id,
            currentIndex,
            answers,
            flagged: [...flagged],
            lastSyncedAt: Date.now(),
        })
    }, [id, currentIndex, answers, flagged, payload])

    // -------------------------------------------------------------------------
    // Answer submission
    // -------------------------------------------------------------------------

    const handleAnswer = useCallback(
        async (choice: AnswerChoice) => {
            if (!payload || isPaused) return
            const question = payload.questions[currentIndex]
            if (!question) return

            const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000)

            // Optimistic update
            applyOptimistic({ questionId: question.id, choice })
            setAnswers(prev => ({ ...prev, [question.id]: choice }))

            // Persist to API (fire and forget — don't block UI)
            await fetch(`/api/exams/${id}/answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question_id: question.id,
                    selected_answer: choice,
                    time_spent_seconds: timeSpent,
                }),
            })

            // Auto-advance to next unanswered question
            const nextUnanswered = payload.questions.findIndex(
                (q, i) => i > currentIndex && !answers[q.id] && q.id !== question.id,
            )
            if (nextUnanswered >= 0) {
                setCurrentIndex(nextUnanswered)
                questionStartRef.current = Date.now()
            }
        },
        [payload, currentIndex, isPaused, id, answers, applyOptimistic],
    )

    // -------------------------------------------------------------------------
    // Pause / Resume
    // -------------------------------------------------------------------------

    const handlePause = useCallback(async () => {
        if (!payload) return
        setIsPauseLoading(true)
        const elapsed = payload.session.time_limit_seconds - remainingSeconds
        try {
            await fetch(`/api/exams/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pause', duration_seconds: elapsed }),
            })
            setIsPaused(true)
        } finally {
            setIsPauseLoading(false)
        }
    }, [payload, id, remainingSeconds])

    const handleResume = useCallback(async () => {
        setIsPauseLoading(true)
        try {
            await fetch(`/api/exams/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resume' }),
            })
            setIsPaused(false)
            questionStartRef.current = Date.now()
        } finally {
            setIsPauseLoading(false)
        }
    }, [id])

    // -------------------------------------------------------------------------
    // Submit
    // -------------------------------------------------------------------------

    const handleSubmit = useCallback(async () => {
        if (!payload || isSubmitting) return
        setIsSubmitting(true)

        const elapsed = payload.session.time_limit_seconds - remainingSeconds

        try {
            const res = await fetch(`/api/exams/${id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration_seconds: elapsed }),
            })
            const result = await res.json()

            // Cache result for the result page (avoids re-fetch on immediate navigation)
            try {
                sessionStorage.setItem(`exam-result:${id}`, JSON.stringify(result))
            } catch {
                // ignore
            }
            router.push(`/exam/${id}/result`)
        } catch {
            setIsSubmitting(false)
        }
    }, [payload, id, remainingSeconds, isSubmitting, router])

    // -------------------------------------------------------------------------
    // Navigation helpers
    // -------------------------------------------------------------------------

    const goTo = useCallback((index: number) => {
        setCurrentIndex(index)
        questionStartRef.current = Date.now()
    }, [])

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center p-8">
                <p className="text-red-600">{error}</p>
            </main>
        )
    }

    if (!payload) {
        return (
            <main className="flex min-h-screen items-center justify-center p-8">
                <p className="text-gray-500">Carregando simulado...</p>
            </main>
        )
    }

    const currentQuestion = payload.questions[currentIndex]!
    const answeredIds = new Set(Object.keys(optimisticAnswers))
    const flaggedIds = flagged
    const questionIds = payload.questions.map(q => q.id)

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top bar */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
                <span className="text-sm text-gray-600 font-medium">
                    Questão {currentIndex + 1}/{payload.session.total_questions}
                </span>
                <ExamTimer
                    remainingSeconds={remainingSeconds}
                    isPaused={isPaused}
                    onTick={setRemainingSeconds}
                    onExpire={handleSubmit}
                />
                <button
                    onClick={isPaused ? handleResume : handlePause}
                    disabled={isPauseLoading || isSubmitting}
                    className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    {isPauseLoading ? '...' : isPaused ? 'Retomar' : 'Pausar'}
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-4">
                {/* Question card with pause overlay */}
                <div className="relative">
                    {isPaused && (
                        <PauseOverlay onResume={handleResume} isLoading={isPauseLoading} />
                    )}
                    <QuestionCard
                        question={currentQuestion}
                        questionNumber={currentIndex + 1}
                        totalQuestions={payload.session.total_questions}
                        selectedAnswer={optimisticAnswers[currentQuestion.id] ?? null}
                        onAnswer={handleAnswer}
                        isPaused={isPaused}
                    />
                </div>

                {/* Prev / Next + Flag */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => goTo(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                        ← Anterior
                    </button>
                    <button
                        onClick={() => {
                            const qId = currentQuestion.id
                            setFlagged(prev => {
                                const next = new Set(prev)
                                next.has(qId) ? next.delete(qId) : next.add(qId)
                                return next
                            })
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                            flaggedIds.has(currentQuestion.id)
                                ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                                : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                        }`}
                    >
                        {flaggedIds.has(currentQuestion.id) ? '★ Marcada' : '☆ Marcar'}
                    </button>
                    <button
                        onClick={() =>
                            goTo(Math.min(payload.questions.length - 1, currentIndex + 1))
                        }
                        disabled={currentIndex === payload.questions.length - 1}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition-colors disabled:opacity-40 ml-auto"
                    >
                        Próxima →
                    </button>
                </div>

                {/* Navigator grid */}
                <QuestionNavigator
                    total={payload.session.total_questions}
                    currentIndex={currentIndex}
                    answeredIds={answeredIds}
                    flaggedIds={flaggedIds}
                    questionIds={questionIds}
                    onJump={goTo}
                />

                {/* Submit */}
                <SubmitButton
                    answeredCount={answeredIds.size}
                    totalQuestions={payload.session.total_questions}
                    onSubmit={handleSubmit}
                    isLoading={isSubmitting}
                />
            </div>
        </main>
    )
}
