export default function HomePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <div className="max-w-xl w-full text-center space-y-4">
                <h1 className="text-3xl font-bold tracking-tight">
                    CCA-F Exam Simulator
                </h1>
                <p className="text-gray-600">
                    Simulador de exame para a certificação{' '}
                    <span className="font-medium text-gray-800">
                        Claude Certified Architect – Foundations
                    </span>
                    .
                </p>
                <p className="text-sm text-gray-400">
                    Em construção — implementar spec{' '}
                    <code className="bg-gray-100 px-1 rounded">exam-simulator</code>.
                </p>
            </div>
        </main>
    )
}
