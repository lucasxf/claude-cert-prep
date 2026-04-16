'use client'

interface PauseOverlayProps {
    onResume: () => void
    isLoading?: boolean
}

export function PauseOverlay({ onResume, isLoading }: PauseOverlayProps) {
    return (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
            <div className="text-center space-y-4">
                <div className="text-4xl">⏸</div>
                <h2 className="text-xl font-bold text-gray-800">Simulado pausado</h2>
                <p className="text-gray-500 text-sm">
                    O conteúdo das questões está oculto durante a pausa.
                </p>
                <button
                    onClick={onResume}
                    disabled={isLoading}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Aguarde...' : 'Retomar'}
                </button>
            </div>
        </div>
    )
}
