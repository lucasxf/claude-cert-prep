'use client'

import type { AnswerChoice, Question } from '@/types'

interface QuestionCardProps {
    question: Question
    questionNumber: number
    totalQuestions: number
    selectedAnswer: AnswerChoice | null
    onAnswer: (answer: AnswerChoice) => void
    isPaused: boolean
}

const CHOICES: AnswerChoice[] = ['A', 'B', 'C', 'D']

export function QuestionCard({
    question,
    questionNumber,
    totalQuestions,
    selectedAnswer,
    onAnswer,
    isPaused,
}: QuestionCardProps) {
    return (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {question.domain.replace(/_/g, ' ')}
                </span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {question.scenario.replace(/_/g, ' ')}
                </span>
                <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                    {question.difficulty}
                </span>
            </div>

            {/* Stem */}
            <p className="text-gray-800 text-base leading-relaxed font-medium">
                {question.stem}
            </p>

            {/* Options */}
            <div className="space-y-2">
                {CHOICES.map(choice => {
                    const isSelected = selectedAnswer === choice
                    return (
                        <button
                            key={choice}
                            disabled={isPaused}
                            onClick={() => onAnswer(choice)}
                            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <span className="font-semibold mr-3">{choice}.</span>
                            {question.options[choice]}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
