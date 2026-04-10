import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'CCA-F Exam Simulator',
    description: 'Simulador de exame para a certificação Claude Certified Architect – Foundations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
            <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
                {children}
            </body>
        </html>
    )
}

// Navigation is embedded per-page to keep the layout minimal (no shared nav bar
// needed — each page has its own contextual back-link).
