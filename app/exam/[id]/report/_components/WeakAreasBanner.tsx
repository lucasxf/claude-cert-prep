'use client'

import { useRouter } from 'next/navigation'
import type { DomainBreakdownRow } from '@/types'

interface WeakAreasBannerProps {
    weakDomains: DomainBreakdownRow[]
}

export function WeakAreasBanner({ weakDomains }: WeakAreasBannerProps) {
    const router = useRouter()

    if (weakDomains.length === 0) return null

    const domainsParam = weakDomains.map(d => d.domain).join(',')

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div>
                <h3 className="font-semibold text-amber-800">Áreas para Estudo</h3>
                <p className="text-sm text-amber-700 mt-1">
                    Você pontuou abaixo de 70% nos seguintes domínios:
                </p>
            </div>
            <ul className="space-y-1">
                {weakDomains.map(d => (
                    <li key={d.domain} className="flex items-center gap-2 text-sm text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span>
                            {d.label} — {d.percentage}%
                        </span>
                    </li>
                ))}
            </ul>
            <button
                onClick={() => router.push(`/practice?domains=${domainsParam}`)}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors"
            >
                Praticar Áreas Fracas
            </button>
        </div>
    )
}
