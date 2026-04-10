import type { Domain, DomainInfo, Question } from './types.js'

/**
 * Selects questions from the pool proportionally by domain weight,
 * then shuffles the final list. Pure function — no side effects.
 *
 * If the pool has fewer questions than the target for a domain, all available
 * questions from that domain are included (graceful degradation).
 *
 * @param pool - full question pool to draw from
 * @param domains - domain definitions including weights
 * @param totalQuestions - target exam length (default 60)
 */
export function buildExam(
    pool: Question[],
    domains: DomainInfo[],
    totalQuestions = 60,
): Question[] {
    const targetCounts = allocateCounts(domains, totalQuestions)

    // Group pool by domain
    const poolByDomain = new Map<Domain, Question[]>()
    for (const q of pool) {
        const list = poolByDomain.get(q.domain) ?? []
        list.push(q)
        poolByDomain.set(q.domain, list)
    }

    // Select questions per domain (shuffle within domain, take up to target)
    const selected: Question[] = []
    for (const [domain, target] of targetCounts) {
        const available = [...(poolByDomain.get(domain) ?? [])]
        shuffle(available)
        selected.push(...available.slice(0, target))
    }

    shuffle(selected)
    return selected
}

/**
 * Allocates exactly `total` questions across domains using the
 * largest-remainder method (prevents off-by-one from rounding).
 */
export function allocateCounts(
    domains: DomainInfo[],
    total: number,
): Map<Domain, number> {
    const allocations = domains.map(d => ({
        domain: d.id,
        floor: Math.floor(d.weight * total),
        remainder: (d.weight * total) % 1,
    }))

    const sumFloors = allocations.reduce((s, a) => s + a.floor, 0)
    const leftover = total - sumFloors

    // Award leftover slots to domains with the highest remainders
    const sorted = [...allocations].sort((a, b) => b.remainder - a.remainder)
    for (let i = 0; i < leftover; i++) {
        sorted[i]!.floor++
    }

    return new Map(sorted.map(a => [a.domain, a.floor]))
}

/** Fisher-Yates shuffle — mutates the array in place. */
function shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    }
}
