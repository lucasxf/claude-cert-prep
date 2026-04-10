'use client'

import { useEffect, useRef } from 'react'

interface ExamTimerProps {
    /** Remaining seconds (controlled by parent). */
    remainingSeconds: number
    isPaused: boolean
    /** Called every second with the new remaining count. */
    onTick: (remaining: number) => void
    /** Called when timer reaches 0. */
    onExpire: () => void
}

/**
 * Countdown timer. Parent owns `remainingSeconds` state and passes it down.
 * This component owns only the interval — it calls onTick each second.
 */
export function ExamTimer({ remainingSeconds, isPaused, onTick, onExpire }: ExamTimerProps) {
    const remainingRef = useRef(remainingSeconds)
    remainingRef.current = remainingSeconds

    const onExpireRef = useRef(onExpire)
    onExpireRef.current = onExpire

    const onTickRef = useRef(onTick)
    onTickRef.current = onTick

    useEffect(() => {
        if (isPaused || remainingSeconds <= 0) return

        const interval = setInterval(() => {
            const next = remainingRef.current - 1
            if (next <= 0) {
                clearInterval(interval)
                onTickRef.current(0)
                onExpireRef.current()
            } else {
                onTickRef.current(next)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [isPaused, remainingSeconds > 0])

    const hours = Math.floor(remainingSeconds / 3600)
    const minutes = Math.floor((remainingSeconds % 3600) / 60)
    const seconds = remainingSeconds % 60

    const display =
        hours > 0
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    const isLow = remainingSeconds <= 300 // last 5 minutes

    return (
        <div
            className={`font-mono text-2xl font-bold tabular-nums ${
                isLow ? 'text-red-600 animate-pulse' : 'text-gray-800'
            }`}
            aria-label={`Tempo restante: ${display}`}
        >
            {display}
        </div>
    )
}
