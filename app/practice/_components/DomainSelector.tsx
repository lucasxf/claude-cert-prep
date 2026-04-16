import type { Domain } from '@/types'

const DOMAIN_LABELS: Record<Domain, string> = {
    agentic_architecture: 'Agentic Architecture & Orchestration',
    claude_code: 'Claude Code Configuration & Workflows',
    prompt_engineering: 'Prompt Engineering & Structured Output',
    tool_design_mcp: 'Tool Design & MCP Integration',
    context_reliability: 'Context Management & Reliability',
}

const ALL_DOMAINS: Domain[] = [
    'agentic_architecture',
    'claude_code',
    'prompt_engineering',
    'tool_design_mcp',
    'context_reliability',
]

interface DomainSelectorProps {
    selected: Set<Domain>
    onChange: (selected: Set<Domain>) => void
}

export function DomainSelector({ selected, onChange }: DomainSelectorProps) {
    const toggle = (domain: Domain) => {
        const next = new Set(selected)
        if (next.has(domain)) {
            next.delete(domain)
        } else {
            next.add(domain)
        }
        onChange(next)
    }

    return (
        <div className="space-y-2">
            {ALL_DOMAINS.map(domain => (
                <label
                    key={domain}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selected.has(domain)
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <input
                        type="checkbox"
                        checked={selected.has(domain)}
                        onChange={() => toggle(domain)}
                        className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-800">{DOMAIN_LABELS[domain]}</span>
                </label>
            ))}
        </div>
    )
}
