'use client'

interface QuestionNavigatorProps {
    total: number
    currentIndex: number
    answeredIds: Set<string>
    flaggedIds: Set<string>
    questionIds: string[]
    onJump: (index: number) => void
}

export function QuestionNavigator({
    total,
    currentIndex,
    answeredIds,
    flaggedIds,
    questionIds,
    onJump,
}: QuestionNavigatorProps) {
    return (
        <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Navegação
            </h3>
            <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: total }, (_, i) => {
                    const qId = questionIds[i]
                    const isAnswered = qId ? answeredIds.has(qId) : false
                    const isFlagged = qId ? flaggedIds.has(qId) : false
                    const isCurrent = i === currentIndex

                    let bg = 'bg-gray-100 text-gray-600'
                    if (isCurrent) bg = 'bg-blue-600 text-white ring-2 ring-blue-300'
                    else if (isFlagged) bg = 'bg-yellow-200 text-yellow-800'
                    else if (isAnswered) bg = 'bg-green-500 text-white'

                    return (
                        <button
                            key={i}
                            onClick={() => onJump(i)}
                            title={`Questão ${i + 1}${isFlagged ? ' (marcada)' : ''}`}
                            className={`w-7 h-7 text-xs font-medium rounded transition-colors ${bg}`}
                        >
                            {i + 1}
                        </button>
                    )
                })}
            </div>
            <div className="flex gap-3 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Respondida
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-yellow-200 inline-block" /> Marcada
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block border border-gray-200" /> Pendente
                </span>
            </div>
        </div>
    )
}
