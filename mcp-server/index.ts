/**
 * CCA-F Question Bank MCP Server
 *
 * Exposes the local SQLite question bank via the Model Context Protocol (MCP)
 * using stdio transport. Intended as a learning exercise for Domain 2 of the
 * CCA-F exam (Tool Design & MCP Integration).
 *
 * Run: npm run mcp-server
 *
 * Capabilities:
 *   Tools     — list_questions, get_question, get_domains, get_scenarios,
 *               submit_answer, get_progress
 *   Resources — exam://guide, exam://domains, exam://scenarios
 *   Prompts   — explain_answer, generate_similar, domain_study_guide
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
    CallToolRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { getDb } from '../src/db/database.js'
import domainsJson from '../data/domains.json' with { type: 'json' }
import scenariosJson from '../data/scenarios.json' with { type: 'json' }
import { TOOL_DEFINITIONS, handleToolCall } from './tools.js'
import { RESOURCE_DEFINITIONS, readResource } from './resources.js'
import { PROMPT_DEFINITIONS, buildPrompt } from './prompts.js'

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
    { name: 'ccaf-question-bank', version: '1.0.0' },
    {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {},
        },
    },
)

const db = getDb()

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
}))

server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params
    return handleToolCall(
        name,
        (args ?? {}) as Record<string, unknown>,
        db,
        domainsJson,
        scenariosJson,
    )
})

// ---------------------------------------------------------------------------
// Resource handlers
// ---------------------------------------------------------------------------

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCE_DEFINITIONS,
}))

server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const { uri } = request.params
    const content = readResource(uri, domainsJson, scenariosJson)
    if (!content) {
        throw new Error(`Resource not found: ${uri}`)
    }
    return {
        contents: [
            {
                uri: content.uri,
                mimeType: content.mimeType,
                text: content.text,
            },
        ],
    }
})

// ---------------------------------------------------------------------------
// Prompt handlers
// ---------------------------------------------------------------------------

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPT_DEFINITIONS,
}))

server.setRequestHandler(GetPromptRequestSchema, async request => {
    const { name, arguments: args } = request.params
    const result = buildPrompt(name, (args ?? {}) as Record<string, string>, db)

    if ('error' in result) {
        throw new Error(result.error)
    }

    return {
        description: result.description,
        messages: result.messages.map(m => ({
            role: m.role,
            content: { type: 'text' as const, text: m.content },
        })),
    }
})

// ---------------------------------------------------------------------------
// Connect and start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport()
await server.connect(transport)

// Log to stderr so it doesn't interfere with the stdio MCP protocol
process.stderr.write('CCA-F Question Bank MCP server started (stdio transport)\n')
