// All shared TypeScript types for the CCA-F Exam Simulator.
// Every entity ID is UUID v7 (time-ordered). See: data/domains.json, data/scenarios.json.

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export type Domain =
    | 'agentic_architecture' // 27%
    | 'tool_design_mcp' // 18%
    | 'claude_code' // 20%
    | 'prompt_engineering' // 20%
    | 'context_reliability' // 15%

export type Scenario =
    | 'customer_support_agent'
    | 'code_generation'
    | 'multi_agent_research'
    | 'developer_productivity'
    | 'ci_cd_claude_code'
    | 'structured_data_extraction'

export type Difficulty = 'foundation' | 'intermediate' | 'advanced'

export type AnswerChoice = 'A' | 'B' | 'C' | 'D'

// ---------------------------------------------------------------------------
// Question
// ---------------------------------------------------------------------------

export interface Question {
    id: string
    domain: Domain
    scenario: Scenario
    stem: string
    options: Record<AnswerChoice, string>
    correct_answer: AnswerChoice
    explanation: string
    wrong_explanations: Partial<Record<AnswerChoice, string>>
    difficulty: Difficulty
    tags: string[]
    source: 'seed' | 'generated'
    created_at?: string
}

/** Question as stored in the SQLite questions table (flat columns, no nested objects). */
export interface QuestionRow {
    id: string
    domain: Domain
    scenario: Scenario
    stem: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: AnswerChoice
    explanation: string
    wrong_explanation_a: string | null
    wrong_explanation_b: string | null
    wrong_explanation_c: string | null
    wrong_explanation_d: string | null
    difficulty: Difficulty
    tags: string // JSON array
    source: 'seed' | 'generated'
    created_at: string
}

/** JSON shape used in data/sample-questions.json and returned by the API. */
export interface QuestionSeed {
    domain: Domain
    scenario: Scenario
    stem: string
    options: Record<AnswerChoice, string>
    correct_answer: AnswerChoice
    explanation: string
    wrong_explanations: Partial<Record<AnswerChoice, string>>
    difficulty: Difficulty
    tags: string[]
}

// ---------------------------------------------------------------------------
// Exam session
// ---------------------------------------------------------------------------

export type ExamMode = 'exam' | 'practice'
export type ExamStatus = 'active' | 'paused' | 'completed'

export interface ExamSession {
    id: string
    mode: ExamMode
    status: ExamStatus
    started_at: string
    finished_at: string | null
    paused_at: string | null
    /** Accumulated elapsed seconds, excluding pauses. Updated on each pause/resume/submit. */
    duration_seconds: number
    /** Total seconds allowed (7200 = 120 min for full exam, 1800 = 30 min for practice). */
    time_limit_seconds: number
    total_questions: number
    correct_count: number | null
    score: number | null // Scaled 0–1000
    passed: boolean | null
    /** JSON array of Domain values, null for a full exam. */
    domain_filter: string | null
    /** ID of the parent exam this practice session was derived from. */
    source_exam_id: string | null
}

// ---------------------------------------------------------------------------
// Exam answers
// ---------------------------------------------------------------------------

export interface ExamAnswer {
    id: string
    exam_session_id: string
    question_id: string
    question_order: number // 1-based position within the exam
    selected_answer: AnswerChoice | null
    is_correct: boolean | null
    answered_at: string | null
    time_spent_seconds: number | null
}

// ---------------------------------------------------------------------------
// Reports / scoring
// ---------------------------------------------------------------------------

export interface DomainBreakdown {
    domain: Domain
    /** Exam weight expressed as a decimal (0.27, 0.20, etc.). */
    weight: number
    total_questions: number
    correct: number
    /** Percentage correct in this domain (0–100). */
    percentage: number
}

export interface ExamResult {
    session: ExamSession
    total_questions: number
    correct: number
    /** Scaled score 0–1000. */
    score: number
    passed: boolean
    duration_seconds: number
    domain_breakdown: DomainBreakdown[]
}

// ---------------------------------------------------------------------------
// Static reference data shapes (matches data/domains.json, data/scenarios.json)
// ---------------------------------------------------------------------------

export interface DomainInfo {
    id: Domain
    label: string
    weight: number
    task_statements: string[]
}

export interface ScenarioInfo {
    id: Scenario
    label: string
    description: string
}

// ---------------------------------------------------------------------------
// Question filters (used by DatabaseClient and API routes)
// ---------------------------------------------------------------------------

export interface QuestionFilter {
    domain?: Domain
    scenario?: Scenario
    difficulty?: Difficulty
    exclude_ids?: string[]
    limit?: number
}
