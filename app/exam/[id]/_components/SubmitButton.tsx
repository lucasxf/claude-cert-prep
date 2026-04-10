'use client'

import { useState } from 'react'

interface SubmitButtonProps {
    answeredCount: number
    totalQuestions: number
    onSubmit: () => void
    isLoading?: boolean
}

export function SubmitButton({
    answeredCount,
    totalQuestions,
    onSubmit,
    isLoading,
}: SubmitButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false)
    const unanswered = totalQuestions - answeredCount

    if (showConfirm) {
        return (
            <div className="bg-white rounded-2xl shadow p-5 space-y-3 text-center">
                <p className="font-semibold text-gray-800">Entregar simulado?</p>
                {unanswered > 0 && (
                    <p className="text-amber-600 text-sm">
                        Você tem <strong>{unanswered}</strong> questão(ões) sem resposta.
                    </p>
                )}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isLoading}
                        className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isLoading}
                        className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Entregando...' : 'Confirmar entrega'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <button
            onClick={() => setShowConfirm(true)}
            disabled={answeredCount === 0 || isLoading}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
            Entregar Simulado
        </button>
    )
}
