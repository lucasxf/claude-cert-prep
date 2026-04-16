/**
 * MCP resource handlers for the CCA-F question bank.
 *
 * Resources provide read-only, URI-addressable data. They differ from tools
 * in that they don't execute actions — they expose data that clients can
 * browse and cache. This practices Domain 2 (Tool Design & MCP Integration):
 * distinguishing tools vs resources vs prompts.
 */

// ---------------------------------------------------------------------------
// Resource definitions (returned by list_resources)
// ---------------------------------------------------------------------------

export const RESOURCE_DEFINITIONS = [
    {
        uri: 'exam://guide',
        name: 'CCA-F Exam Guide',
        description:
            'Overview of the Claude Certified Architect – Foundations exam: format, scoring, passing threshold, and domain weights.',
        mimeType: 'text/plain',
    },
    {
        uri: 'exam://domains',
        name: 'Exam Domains',
        description:
            'All 5 CCA-F exam domains with weights, descriptions, and task statements as JSON.',
        mimeType: 'application/json',
    },
    {
        uri: 'exam://scenarios',
        name: 'Exam Scenarios',
        description:
            'All 6 production scenarios used to contextualize exam questions as JSON.',
        mimeType: 'application/json',
    },
]

// ---------------------------------------------------------------------------
// Resource content
// ---------------------------------------------------------------------------

const EXAM_GUIDE = `CCA-F Exam Guide — Claude Certified Architect – Foundations
============================================================

FORMAT
- 60 multiple-choice questions (4 options each, single correct answer)
- 120 minutes total time
- Questions are scenario-based: each is anchored in one of 6 production scenarios

SCORING
- Scaled score: 0–1000
- Passing threshold: 720 / 1000
- Formula: round(correct / total × 1000)

DOMAINS & WEIGHTS
- Agentic Architecture & Orchestration    27%  (≈16 questions)
- Claude Code Configuration & Workflows   20%  (≈12 questions)
- Prompt Engineering & Structured Output  20%  (≈12 questions)
- Tool Design & MCP Integration           18%  (≈11 questions)
- Context Management & Reliability        15%  (≈9 questions)

WHAT THE EXAM TESTS
The exam tests architectural decision-making, not memorization. Questions
present realistic production scenarios and ask you to choose the correct
design pattern, configuration, or implementation approach.

Common patterns tested:
- stop_reason handling in agentic loops (tool_use → continue, end_turn → respond)
- MCP primitives: tools (executable), resources (read-only), prompts (templates)
- CLAUDE.md hierarchy: project root > subdirectory > .claude/ > global
- Programmatic enforcement > prompt-based guidance for safety-critical behavior
- Hub-and-spoke multi-agent patterns with least-privilege subagent permissions
- JSON schema validation with validation-retry loops (max 3 attempts)
- Prompt caching with cache_control for repeated system prompts
- Batch API for high-volume asynchronous workloads

SCENARIOS
1. Customer Support Resolution Agent
2. Code Generation with Claude Code
3. Multi-Agent Research System
4. Developer Productivity with Claude
5. Claude Code for Continuous Integration
6. Structured Data Extraction

STUDY TIPS
- Focus on why patterns are chosen, not just what they are
- Understand the tradeoffs between approaches
- Know when to use each MCP primitive
- Memorize the 3 valid escalation triggers
- Understand context window management strategies`

// ---------------------------------------------------------------------------
// Resource reader
// ---------------------------------------------------------------------------

export interface ResourceContent {
    uri: string
    mimeType: string
    text: string
}

export function readResource(
    uri: string,
    domainsData: unknown,
    scenariosData: unknown,
): ResourceContent | null {
    switch (uri) {
        case 'exam://guide':
            return { uri, mimeType: 'text/plain', text: EXAM_GUIDE }

        case 'exam://domains':
            return {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(domainsData, null, 2),
            }

        case 'exam://scenarios':
            return {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(scenariosData, null, 2),
            }

        default:
            return null
    }
}
