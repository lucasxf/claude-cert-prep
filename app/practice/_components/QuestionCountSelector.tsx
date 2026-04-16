const COUNT_OPTIONS = [5, 10, 15, 20] as const

interface QuestionCountSelectorProps {
    value: number
    onChange: (count: number) => void
}

export function QuestionCountSelector({ value, onChange }: QuestionCountSelectorProps) {
    return (
        <div className="flex gap-2">
            {COUNT_OPTIONS.map(n => (
                <button
                    key={n}
                    onClick={() => onChange(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        value === n
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    {n}
                </button>
            ))}
        </div>
    )
}
