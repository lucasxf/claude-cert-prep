#!/usr/bin/env tsx
/**
 * Question Generator — generates new CCA-F exam questions via the Anthropic API
 * and saves them directly to the SQLite question bank.
 *
 * Practices Domain 1 (Agentic Architecture): agentic loop with stop_reason handling.
 * Practices Domain 4 (Prompt Engineering): structured JSON output with validation-retry.
 *
 * Usage (from project root):
 *   npm run generate                                 # 5 questions, auto-distribute by domain weight
 *   npm run generate -- --count=10                   # 10 questions
 *   npm run generate -- --domain=claude_code         # 5 questions for a specific domain
 *   npm run generate -- --count=3 --difficulty=advanced
 *   npm run generate -- --domain=tool_design_mcp --count=2 --difficulty=intermediate
 */

import Anthropic from '@anthropic-ai/sdk'
import { getDb } from './db/database.js'
import domainsJson from '../data/domains.json' with { type: 'json' }
import scenariosJson from '../data/scenarios.json' with { type: 'json' }
import type {
    Difficulty,
    Domain,
    DomainInfo,
    QuestionSeed,
    Scenario,
    ScenarioInfo,
} from './types.js'

const DOMAINS = domainsJson as DomainInfo[]
const SCENARIOS = scenariosJson as ScenarioInfo[]
const MAX_RETRIES = 3

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an exam question writer for the Claude Certified Architect – Foundations (CCA-F) certification exam.

You create scenario-based multiple-choice questions that test architectural decision-making, NOT trivia or memorization.

RULES:
1. Every question MUST be anchored to one of the 6 production scenarios
2. Every question MUST test a specific concept from one of the 5 domains
3. All 4 options MUST be plausible — no obviously wrong answers
4. The correct answer should reward architectural judgment, not memorization
5. Include detailed explanations for the correct answer AND for why each wrong answer is wrong
6. The most common correct pattern: programmatic enforcement > prompt-based guidance
7. Questions should test understanding of when/why, not just what

DOMAIN WEIGHTS (generate proportionally):
- Agentic Architecture & Orchestration: 27%
- Claude Code Configuration & Workflows: 20%
- Prompt Engineering & Structured Output: 20%
- Tool Design & MCP Integration: 18%
- Context Management & Reliability: 15%

SCENARIOS (randomly assign):
1. Customer Support Resolution Agent
2. Code Generation with Claude Code
3. Multi-Agent Research System
4. Developer Productivity with Claude
5. Claude Code for Continuous Integration
6. Structured Data Extraction

KEY CONCEPTS TO TEST:
- stop_reason handling ("tool_use" vs "end_turn" vs "max_tokens")
- CLAUDE.md hierarchy (project root > subdirectory > .claude/commands)
- MCP primitives: tools (executable), resources (read-only data), prompts (templates)
- Programmatic enforcement vs prompt-based guidance
- Hub-and-spoke multi-agent patterns with trust boundaries
- JSON schema validation with retry loops
- The -p flag for Claude Code in CI/CD pipelines
- Structured error responses from tool handlers
- Escalation patterns (3 valid triggers)
- Batch API for cost optimization
- Prompt caching with cache_control
- Least-privilege principle for subagent permissions

OUTPUT FORMAT: Respond with valid JSON only. No markdown, no preamble, no code fences.`

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface GenerateOptions {
    count: number
    domain: Domain | null
    difficulty: Difficulty | null
}

function parseArgs(): GenerateOptions {
    const args = process.argv.slice(2)
    let count = 5
    let domain: Domain | null = null
    let difficulty: Difficulty | null = null

    for (const arg of args) {
        const [key, val] = arg.replace(/^--/, '').split('=')
        if (key === 'count' && val) count = parseInt(val, 10)
        if (key === 'domain' && val) domain = val as Domain
        if (key === 'difficulty' && val) difficulty = val as Difficulty
    }

    return { count, domain, difficulty }
}

// ---------------------------------------------------------------------------
// Domain distribution (proportional, same largest-remainder as exam-builder)
// ---------------------------------------------------------------------------

function distributeDomains(count: number): { domain: Domain; scenario: Scenario }[] {
    // Allocate counts proportionally
    const allocations = DOMAINS.map(d => ({
        domain: d.id,
        floor: Math.floor(d.weight * count),
        remainder: (d.weight * count) % 1,
    }))
    const leftover = count - allocations.reduce((s, a) => s + a.floor, 0)
    ;[...allocations]
        .sort((a, b) => b.remainder - a.remainder)
        .slice(0, leftover)
        .forEach(a => a.floor++)

    const result: { domain: Domain; scenario: Scenario }[] = []
    for (const alloc of allocations) {
        for (let i = 0; i < alloc.floor; i++) {
            const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]!
            result.push({ domain: alloc.domain, scenario: scenario.id })
        }
    }
    // Shuffle the order
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j]!, result[i]!]
    }
    return result
}

// ---------------------------------------------------------------------------
// JSON extraction — strips markdown code fences if present
// ---------------------------------------------------------------------------

function extractJson(text: string): string {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fenceMatch?.[1]) return fenceMatch[1]
    // Try to find the first { ... } block
    const objMatch = text.match(/\{[\s\S]*\}/)
    if (objMatch) return objMatch[0]
    return text.trim()
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D'])
const VALID_DIFFICULTIES = new Set(['foundation', 'intermediate', 'advanced'])
const VALID_DOMAINS = new Set(DOMAINS.map(d => d.id))
const VALID_SCENARIOS = new Set(SCENARIOS.map(s => s.id))

interface RawQuestion {
    stem?: unknown
    options?: unknown
    correct_answer?: unknown
    explanation?: unknown
    wrong_explanations?: unknown
    difficulty?: unknown
    tags?: unknown
}

function validateQuestion(raw: RawQuestion, domain: Domain, scenario: Scenario): QuestionSeed {
    if (typeof raw.stem !== 'string' || raw.stem.trim().length < 20) {
        throw new Error('Invalid or missing stem')
    }
    if (
        typeof raw.options !== 'object' ||
        raw.options === null ||
        typeof (raw.options as Record<string, unknown>)['A'] !== 'string' ||
        typeof (raw.options as Record<string, unknown>)['B'] !== 'string' ||
        typeof (raw.options as Record<string, unknown>)['C'] !== 'string' ||
        typeof (raw.options as Record<string, unknown>)['D'] !== 'string'
    ) {
        throw new Error('Invalid or missing options (A/B/C/D required)')
    }
    if (typeof raw.correct_answer !== 'string' || !VALID_ANSWERS.has(raw.correct_answer)) {
        throw new Error(`Invalid correct_answer: ${String(raw.correct_answer)}`)
    }
    if (typeof raw.explanation !== 'string' || raw.explanation.trim().length < 10) {
        throw new Error('Invalid or missing explanation')
    }
    const difficulty = typeof raw.difficulty === 'string' && VALID_DIFFICULTIES.has(raw.difficulty)
        ? (raw.difficulty as Difficulty)
        : 'intermediate'

    // wrong_explanations — at minimum one key required, missing keys are OK
    const wrongExplanations: Partial<Record<'A' | 'B' | 'C' | 'D', string>> = {}
    if (typeof raw.wrong_explanations === 'object' && raw.wrong_explanations !== null) {
        for (const key of ['A', 'B', 'C', 'D'] as const) {
            const val = (raw.wrong_explanations as Record<string, unknown>)[key]
            if (typeof val === 'string') wrongExplanations[key] = val
        }
    }

    const tags = Array.isArray(raw.tags) ? (raw.tags as unknown[]).filter(t => typeof t === 'string') as string[] : []

    // Infer domain/scenario from response if provided and valid, else use requested values
    const rawDomain = typeof (raw as Record<string, unknown>)['domain'] === 'string'
        ? (raw as Record<string, unknown>)['domain'] as string : domain
    const rawScenario = typeof (raw as Record<string, unknown>)['scenario'] === 'string'
        ? (raw as Record<string, unknown>)['scenario'] as string : scenario

    return {
        domain: VALID_DOMAINS.has(rawDomain as Domain) ? (rawDomain as Domain) : domain,
        scenario: VALID_SCENARIOS.has(rawScenario as Scenario) ? (rawScenario as Scenario) : scenario,
        stem: raw.stem.trim(),
        options: raw.options as Record<'A' | 'B' | 'C' | 'D', string>,
        correct_answer: raw.correct_answer as 'A' | 'B' | 'C' | 'D',
        explanation: raw.explanation.trim(),
        wrong_explanations: wrongExplanations,
        difficulty,
        tags,
    }
}

// ---------------------------------------------------------------------------
// Single-question generation with validation-retry loop
// ---------------------------------------------------------------------------

async function generateQuestion(
    client: Anthropic,
    domain: Domain,
    scenario: Scenario,
    difficulty: Difficulty | null,
): Promise<QuestionSeed> {
    const difficultyInstruction = difficulty ? `\nDifficulty: ${difficulty}` : ''
    const prompt = `Generate 1 exam question for:
Domain: ${domain}
Scenario: ${scenario}${difficultyInstruction}

Return as JSON matching this exact schema:
{
  "stem": "string — the question text, contextualized in the scenario",
  "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "correct_answer": "A" | "B" | "C" | "D",
  "explanation": "string — why the correct answer is correct (2-4 sentences)",
  "wrong_explanations": {
    "A": "string — why A is wrong (if A is not correct)",
    "B": "string — why B is wrong (if B is not correct)",
    "C": "string — why C is wrong (if C is not correct)",
    "D": "string — why D is wrong (if D is not correct)"
  },
  "difficulty": "foundation" | "intermediate" | "advanced",
  "tags": ["string — concept tags, e.g. stop_reason, hub_and_spoke, mcp_primitives"]
}`

    let lastError: Error | undefined
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Agentic loop: call → extract text from stop_reason=end_turn response
            const response = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 2048,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: prompt }],
            })

            // Extract text from content blocks (stop_reason should be 'end_turn')
            const text = response.content
                .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                .map(block => block.text)
                .join('')

            const jsonStr = extractJson(text)
            const parsed = JSON.parse(jsonStr) as RawQuestion
            return validateQuestion(parsed, domain, scenario)
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))
            if (attempt < MAX_RETRIES) {
                process.stderr.write(
                    `  Attempt ${attempt}/${MAX_RETRIES} failed (${lastError.message}), retrying...\n`,
                )
            }
        }
    }
    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const opts = parseArgs()

    if (!process.env['ANTHROPIC_API_KEY']) {
        console.error('Error: ANTHROPIC_API_KEY environment variable is not set.')
        console.error('Create a .env.local file with ANTHROPIC_API_KEY=sk-ant-...')
        process.exit(1)
    }

    const client = new Anthropic()
    const db = getDb()

    // Build the list of (domain, scenario) pairs to generate
    let targets: { domain: Domain; scenario: Scenario }[]
    if (opts.domain) {
        const scenarioIds = SCENARIOS.map(s => s.id as Scenario)
        targets = Array.from({ length: opts.count }, () => ({
            domain: opts.domain!,
            scenario: scenarioIds[Math.floor(Math.random() * scenarioIds.length)]!,
        }))
    } else {
        targets = distributeDomains(opts.count)
    }

    console.log(`\nGenerating ${targets.length} question(s) via claude-sonnet-4-6...\n`)

    let saved = 0
    let failed = 0

    for (let i = 0; i < targets.length; i++) {
        const { domain, scenario } = targets[i]!
        const label = `[${i + 1}/${targets.length}] ${domain} / ${scenario}`
        process.stdout.write(`${label}...`)

        try {
            const seed = await generateQuestion(client, domain, scenario, opts.difficulty)
            db.insertQuestion(seed, 'generated')
            saved++
            const preview = seed.stem.length > 60 ? seed.stem.slice(0, 57) + '...' : seed.stem
            console.log(` ✓  "${preview}"`)
        } catch (err) {
            failed++
            const msg = err instanceof Error ? err.message : String(err)
            console.log(` ✗  ${msg}`)
        }
    }

    console.log(`\nDone: ${saved}/${targets.length} questions saved to database.`)
    if (failed > 0) {
        console.log(`Failed: ${failed} (check stderr for retry details)`)
        process.exit(1)
    }
}

main().catch(err => {
    console.error('Unexpected error:', err)
    process.exit(1)
})
