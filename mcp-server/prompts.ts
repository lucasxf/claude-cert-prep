/**
 * MCP prompt handlers for the CCA-F question bank.
 *
 * Prompts are reusable templates that guide AI interactions. They differ from
 * tools (actions) and resources (data) by providing structured conversation
 * starters. This practices Domain 2 (Tool Design & MCP Integration):
 * using MCP prompts as the third primitive.
 */

import type { DatabaseClient } from '../src/db/database.js'
import type { AnswerChoice } from '../src/types.js'

// ---------------------------------------------------------------------------
// Prompt definitions (returned by list_prompts)
// ---------------------------------------------------------------------------

export const PROMPT_DEFINITIONS = [
    {
        name: 'explain_answer',
        description:
            'Generate a prompt that asks Claude to explain why a specific answer choice is correct or incorrect for a given question. Useful for deep-dive study.',
        arguments: [
            {
                name: 'question_id',
                description: 'UUID of the question to explain',
                required: true,
            },
            {
                name: 'selected_answer',
                description: 'The answer choice the student selected (A/B/C/D)',
                required: true,
            },
        ],
    },
    {
        name: 'generate_similar',
        description:
            'Generate a prompt that asks Claude to create a new exam question similar to an existing one, in the same domain and scenario but testing a different aspect.',
        arguments: [
            {
                name: 'question_id',
                description: 'UUID of the question to base the new one on',
                required: true,
            },
        ],
    },
    {
        name: 'domain_study_guide',
        description:
            'Generate a prompt for a focused study guide on one of the 5 CCA-F domains, covering key concepts, common pitfalls, and architectural patterns.',
        arguments: [
            {
                name: 'domain',
                description:
                    'The domain to study (agentic_architecture, tool_design_mcp, claude_code, prompt_engineering, context_reliability)',
                required: true,
            },
        ],
    },
]

// ---------------------------------------------------------------------------
// Prompt message builder
// ---------------------------------------------------------------------------

export interface PromptMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface PromptResult {
    description: string
    messages: PromptMessage[]
}

export function buildPrompt(
    name: string,
    args: Record<string, string>,
    db: DatabaseClient,
): PromptResult | { error: string } {
    switch (name) {
        case 'explain_answer':
            return buildExplainAnswer(args, db)
        case 'generate_similar':
            return buildGenerateSimilar(args, db)
        case 'domain_study_guide':
            return buildDomainStudyGuide(args)
        default:
            return { error: `Unknown prompt: ${name}` }
    }
}

// ---------------------------------------------------------------------------
// explain_answer
// ---------------------------------------------------------------------------

function buildExplainAnswer(
    args: Record<string, string>,
    db: DatabaseClient,
): PromptResult | { error: string } {
    const { question_id, selected_answer } = args
    if (!question_id) return { error: 'question_id is required' }
    if (!selected_answer || !['A', 'B', 'C', 'D'].includes(selected_answer)) {
        return { error: 'selected_answer must be A, B, C, or D' }
    }

    const question = db.getQuestion(question_id)
    if (!question) return { error: `Question not found: ${question_id}` }

    const selected = selected_answer as AnswerChoice
    const isCorrect = question.correct_answer === selected
    const selectedText = question.options[selected]
    const correctText = question.options[question.correct_answer]

    const userMessage = `I'm studying for the CCA-F certification exam. Here is a question I ${isCorrect ? 'answered correctly' : 'answered incorrectly'}:

**Question (Domain: ${question.domain}, Scenario: ${question.scenario})**
${question.stem}

Options:
A) ${question.options.A}
B) ${question.options.B}
C) ${question.options.C}
D) ${question.options.D}

I selected: **${selected}) ${selectedText}**
${!isCorrect ? `Correct answer: **${question.correct_answer}) ${correctText}**` : ''}

${isCorrect
    ? `Please explain in depth WHY option ${selected} is correct, and why each of the other options is wrong. Help me understand the architectural principle this question is testing so I can apply it to similar questions.`
    : `Please explain:
1. Why my answer (${selected}) is incorrect
2. Why the correct answer (${question.correct_answer}) is right
3. What architectural principle or concept this question is testing
4. How to recognize similar questions and choose correctly in the future`
}`

    return {
        description: `Explain the answer to question ${question_id.slice(0, 8)}... (selected: ${selected}, correct: ${question.correct_answer})`,
        messages: [{ role: 'user', content: userMessage }],
    }
}

// ---------------------------------------------------------------------------
// generate_similar
// ---------------------------------------------------------------------------

function buildGenerateSimilar(
    args: Record<string, string>,
    db: DatabaseClient,
): PromptResult | { error: string } {
    const { question_id } = args
    if (!question_id) return { error: 'question_id is required' }

    const question = db.getQuestion(question_id)
    if (!question) return { error: `Question not found: ${question_id}` }

    const userMessage = `Generate a new CCA-F exam question similar to this one, but testing a different aspect of the same domain and concept area.

**Reference question:**
Domain: ${question.domain}
Scenario: ${question.scenario}
Difficulty: ${question.difficulty}
Tags: ${question.tags.join(', ')}

Stem: ${question.stem}

Options:
A) ${question.options.A}
B) ${question.options.B}
C) ${question.options.C}
D) ${question.options.D}

Correct: ${question.correct_answer}

Requirements for the new question:
- Same domain (${question.domain}) but can use any of the 6 scenarios
- Test a related but DIFFERENT concept from the same domain
- All 4 options must be plausible — no obviously wrong answers
- Difficulty: ${question.difficulty}

Return the new question as valid JSON:
{
  "stem": "...",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct_answer": "A"|"B"|"C"|"D",
  "explanation": "...",
  "wrong_explanations": { ... },
  "difficulty": "${question.difficulty}",
  "tags": [...]
}`

    return {
        description: `Generate a question similar to ${question_id.slice(0, 8)}... (${question.domain})`,
        messages: [{ role: 'user', content: userMessage }],
    }
}

// ---------------------------------------------------------------------------
// domain_study_guide
// ---------------------------------------------------------------------------

const DOMAIN_FOCUS: Record<string, string> = {
    agentic_architecture: `- stop_reason values: tool_use, end_turn, max_tokens
- Agentic loop structure: send → receive → handle stop_reason → repeat
- Hub-and-spoke multi-agent pattern
- Orchestrator vs subagent responsibilities
- Least-privilege principle for subagent permissions
- Valid escalation triggers (3) vs unreliable ones (2)
- Parallel vs sequential subagent execution`,

    tool_design_mcp: `- MCP primitives: tools (executable actions), resources (read-only data), prompts (templates)
- When to use tools vs resources vs prompts
- Tool schema design: required/optional fields, descriptions
- Structured error responses from tool handlers (4 error categories)
- stdio vs HTTP transport tradeoffs
- Resource URI conventions
- MCP server capabilities declaration`,

    claude_code: `- CLAUDE.md hierarchy: project root > subdirectory > .claude/commands > global
- The -p flag for non-interactive/CI execution
- Custom slash commands in .claude/commands/
- Permission configuration in .claude/settings.json
- Read vs Grep vs Glob: when to use each
- /compact and --continue for context management
- Integration with CI/CD pipelines`,

    prompt_engineering: `- Structured JSON output with schema definitions
- Validation-retry loop pattern (max 3 attempts)
- XML tags for section delimiting
- Few-shot examples for format specification
- Prefill technique for response format control
- Chain-of-thought placement (before vs after instruction)
- Temperature: 0 for deterministic, higher for creative`,

    context_reliability: `- Prompt caching with cache_control breakpoints
- Sliding window vs summarization strategies
- Batch API: use cases, async processing, cost optimization
- Token budgeting for tool results
- Retry strategies: exponential backoff, jitter
- Context window limits and overflow prevention
- Validation feedback loops`,
}

function buildDomainStudyGuide(
    args: Record<string, string>,
): PromptResult | { error: string } {
    const { domain } = args
    if (!domain) return { error: 'domain is required' }

    const focus = DOMAIN_FOCUS[domain]
    if (!focus) {
        return {
            error: `Unknown domain: ${domain}. Valid: ${Object.keys(DOMAIN_FOCUS).join(', ')}`,
        }
    }

    const userMessage = `Create a focused study guide for the CCA-F exam domain: **${domain}**

This domain covers ${Math.round(
    {
        agentic_architecture: 0.27,
        tool_design_mcp: 0.18,
        claude_code: 0.20,
        prompt_engineering: 0.20,
        context_reliability: 0.15,
    }[domain]! * 100,
)}% of the exam.

Key topics to cover in this domain:
${focus}

Structure your study guide as:
1. **Core Concepts** — 3-5 bullet points of the fundamental ideas
2. **Decision Framework** — how to decide between options on exam questions
3. **Common Wrong Answers** — patterns that distract test-takers, and why they're wrong
4. **Practice Questions** — 3 example questions with explanations

Make the content actionable: focus on decision-making under exam conditions, not just definitions.`

    return {
        description: `Study guide for domain: ${domain}`,
        messages: [{ role: 'user', content: userMessage }],
    }
}
