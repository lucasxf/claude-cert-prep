/**
 * MCP tool handlers for the CCA-F question bank.
 *
 * Tools are executable actions (may modify state). Contrast with resources
 * (read-only data) and prompts (templates). This file practices Domain 2
 * (Tool Design & MCP Integration): defining tool schemas with correct
 * required/optional fields and returning structured error responses.
 */

import type { DatabaseClient } from '../src/db/database.js'
import type { AnswerChoice, Domain } from '../src/types.js'

// ---------------------------------------------------------------------------
// Tool definitions (returned by list_tools)
// ---------------------------------------------------------------------------

export const TOOL_DEFINITIONS = [
    {
        name: 'list_questions',
        description:
            'List exam questions from the question bank. Optionally filter by domain, difficulty, or exclude specific IDs. Questions are returned without the correct answer so they can be used for practice.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                domain: {
                    type: 'string',
                    enum: [
                        'agentic_architecture',
                        'tool_design_mcp',
                        'claude_code',
                        'prompt_engineering',
                        'context_reliability',
                    ],
                    description: 'Filter by domain (omit for all domains)',
                },
                difficulty: {
                    type: 'string',
                    enum: ['foundation', 'intermediate', 'advanced'],
                    description: 'Filter by difficulty level',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum questions to return (default: 10, max: 50)',
                },
                exclude_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Question UUIDs to exclude from results (e.g. already-seen questions)',
                },
            },
        },
    },
    {
        name: 'get_question',
        description:
            'Retrieve a specific question by ID with full details including the correct answer and all explanations.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                question_id: {
                    type: 'string',
                    description: 'The UUID of the question to retrieve',
                },
            },
            required: ['question_id'],
        },
    },
    {
        name: 'get_domains',
        description:
            'List all 5 CCA-F exam domains with their weights and task statements. Useful for understanding what the exam tests.',
        inputSchema: {
            type: 'object' as const,
            properties: {},
        },
    },
    {
        name: 'get_scenarios',
        description:
            'List all 6 production scenarios used to contextualize exam questions.',
        inputSchema: {
            type: 'object' as const,
            properties: {},
        },
    },
    {
        name: 'submit_answer',
        description:
            'Submit an answer for a question and receive immediate feedback: whether it was correct, the correct answer (if wrong), and the explanation.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                question_id: {
                    type: 'string',
                    description: 'The UUID of the question being answered',
                },
                answer: {
                    type: 'string',
                    enum: ['A', 'B', 'C', 'D'],
                    description: 'The selected answer choice',
                },
            },
            required: ['question_id', 'answer'],
        },
    },
    {
        name: 'get_progress',
        description:
            'Get study progress statistics: correct-answer rates by domain across all exam sessions. Returns overall stats and per-domain breakdown.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                domain: {
                    type: 'string',
                    enum: [
                        'agentic_architecture',
                        'tool_design_mcp',
                        'claude_code',
                        'prompt_engineering',
                        'context_reliability',
                    ],
                    description: 'Filter to a specific domain (omit for overall stats)',
                },
            },
        },
    },
]

// ---------------------------------------------------------------------------
// Tool call router
// ---------------------------------------------------------------------------

export interface ToolCallResult {
    content: Array<{ type: 'text'; text: string }>
    isError?: boolean
    [key: string]: unknown
}

type ToolArgs = Record<string, unknown>

export async function handleToolCall(
    name: string,
    args: ToolArgs,
    db: DatabaseClient,
    domainsData: unknown,
    scenariosData: unknown,
): Promise<ToolCallResult> {
    try {
        switch (name) {
            case 'list_questions':
                return handleListQuestions(args, db)
            case 'get_question':
                return handleGetQuestion(args, db)
            case 'get_domains':
                return ok(domainsData)
            case 'get_scenarios':
                return ok(scenariosData)
            case 'submit_answer':
                return handleSubmitAnswer(args, db)
            case 'get_progress':
                return handleGetProgress(args, db)
            default:
                return error(`Unknown tool: ${name}`)
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return error(`Tool execution failed: ${msg}`)
    }
}

// ---------------------------------------------------------------------------
// Individual handlers
// ---------------------------------------------------------------------------

function handleListQuestions(args: ToolArgs, db: DatabaseClient): ToolCallResult {
    const limit = Math.min(Number(args['limit'] ?? 10), 50)
    const domain = args['domain'] as Domain | undefined
    const difficulty = args['difficulty'] as string | undefined
    const exclude_ids = Array.isArray(args['exclude_ids'])
        ? (args['exclude_ids'] as string[])
        : undefined

    const questions = db.listQuestions({
        domain,
        difficulty: difficulty as 'foundation' | 'intermediate' | 'advanced' | undefined,
        limit,
        exclude_ids,
    })

    // Omit correct_answer from list results — use get_question for full details
    const sanitized = questions.map(q => ({
        id: q.id,
        domain: q.domain,
        scenario: q.scenario,
        difficulty: q.difficulty,
        stem: q.stem,
        options: q.options,
        tags: q.tags,
    }))

    return ok({ count: sanitized.length, questions: sanitized })
}

function handleGetQuestion(args: ToolArgs, db: DatabaseClient): ToolCallResult {
    const id = args['question_id']
    if (typeof id !== 'string') return error('question_id is required and must be a string')

    const question = db.getQuestion(id)
    if (!question) return error(`Question not found: ${id}`)

    return ok(question)
}

function handleSubmitAnswer(args: ToolArgs, db: DatabaseClient): ToolCallResult {
    const id = args['question_id']
    const answer = args['answer']

    if (typeof id !== 'string') return error('question_id is required')
    if (typeof answer !== 'string' || !['A', 'B', 'C', 'D'].includes(answer)) {
        return error('answer must be one of: A, B, C, D')
    }

    const question = db.getQuestion(id)
    if (!question) return error(`Question not found: ${id}`)

    const selected = answer as AnswerChoice
    const is_correct = question.correct_answer === selected

    const feedback: Record<string, unknown> = {
        is_correct,
        selected_answer: selected,
    }

    if (!is_correct) {
        feedback['correct_answer'] = question.correct_answer
        feedback['explanation'] = question.explanation
        const wrongExp = question.wrong_explanations[selected]
        if (wrongExp) feedback['why_wrong'] = wrongExp
    } else {
        feedback['explanation'] = question.explanation
    }

    return ok(feedback)
}

function handleGetProgress(args: ToolArgs, db: DatabaseClient): ToolCallResult {
    const domain = args['domain'] as Domain | undefined

    // Query correct-answer rates from exam_answers joined with questions
    const stats = db.getDomainStats(domain)
    return ok(stats)
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function ok(data: unknown): ToolCallResult {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

function error(message: string): ToolCallResult {
    return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
    }
}
