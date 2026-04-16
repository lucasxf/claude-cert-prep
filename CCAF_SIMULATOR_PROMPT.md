# PROMPT: CCA-F Mock Exam Simulator

## Contexto para Claude Code

Este prompt descreve um aplicativo de simulados para a certificação Claude Certified Architect – Foundations (CCA-F). O objetivo é DUPLO:

1. **Ferramenta de estudo** — simular o exame real (60 questões, 120 min, 720/1000)
2. **Projeto de aprendizado** — construir o app usando Claude SDK + MCP, que são exatamente os domínios mais testados na prova

O desenvolvedor (Lucas) nunca usou o Anthropic SDK nem MCP diretamente. Este projeto é a primeira experiência hands-on com ambos. Priorize clareza, código bem comentado, e mensagens de erro descritivas.

---

## Stack Técnica

- **Runtime:** Node.js 20+
- **Linguagem:** TypeScript (strict mode)
- **Anthropic SDK:** `@anthropic-ai/sdk` (latest)
- **MCP:** `@modelcontextprotocol/sdk` (latest)
- **Storage:** SQLite via `better-sqlite3` (banco local de questões + progresso)
- **Interface:** CLI interativo via `@inquirer/prompts`
- **Timer:** implementação própria (countdown 120 min)
- **Test runner:** Vitest

---

## Arquitetura

O app tem 3 componentes que mapeiam diretamente para domínios do exame:

```
┌─────────────────────────────────────────────────────┐
│                  CLI Interface                       │
│         (exam-runner — o cliente principal)           │
│                                                      │
│  • Inicia simulado (60q / custom)                   │
│  • Mostra timer countdown                           │
│  • Coleta respostas                                  │
│  • Exibe resultado por domínio                      │
│  • Chama MCP server para buscar questões            │
│  • Chama Claude API para gerar questões novas       │
└──────────┬──────────────────────┬────────────────────┘
           │                      │
           │ MCP Protocol         │ Anthropic SDK
           │ (stdio transport)    │ (Messages API)
           │                      │
┌──────────▼──────────┐  ┌───────▼────────────────────┐
│  MCP Server         │  │  Question Generator         │
│  (question-bank)    │  │  (claude-powered)            │
│                     │  │                              │
│  Tools:             │  │  • Gera questões novas       │
│  • list_questions   │  │    baseadas em domínio/       │
│  • get_question     │  │    cenário selecionado       │
│  • get_scenarios    │  │  • Retorna JSON estruturado  │
│  • get_domains      │  │  • Usa validation-retry      │
│  • submit_answer    │  │    loop para garantir        │
│  • get_progress     │  │    formato correto           │
│                     │  │                              │
│  Resources:         │  │  Modelo: claude-sonnet-4-6   │
│  • exam://guide     │  │  (custo-eficiente para       │
│  • exam://domains   │  │   geração em volume)         │
│  • exam://scenarios │  │                              │
│                     │  │                              │
│  SQLite backend     │  └──────────────────────────────┘
└─────────────────────┘
```

### Por que esta arquitetura?

- **MCP Server** → pratica Domínio 2 (Tool Design & MCP Integration)
- **Claude SDK client** → pratica Domínio 1 (Agentic Architecture — agentic loop com stop_reason)
- **Structured output (JSON)** → pratica Domínio 4 (Prompt Engineering & Structured Output)
- **CLAUDE.md deste projeto** → pratica Domínio 3 (Claude Code Configuration)
- **Error handling + retry** → pratica Domínio 5 (Context Management & Reliability)

---

## Estrutura do Projeto

```
ccaf-simulator/
├── CLAUDE.md                    # Regras do projeto para Claude Code
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                 # Entry point CLI
│   ├── exam-runner.ts           # Orquestra o simulado
│   ├── timer.ts                 # Countdown timer (120 min)
│   ├── scorer.ts                # Calcula score escalado (0-1000)
│   ├── reporter.ts              # Relatório por domínio
│   ├── mcp-client.ts            # Cliente MCP (conecta ao question-bank server)
│   ├── question-generator.ts    # Gera questões via Anthropic SDK
│   ├── types.ts                 # Tipos compartilhados
│   └── db/
│       ├── schema.sql           # Schema SQLite
│       ├── seed.sql             # Questões iniciais (seed)
│       └── database.ts          # Wrapper SQLite
├── mcp-server/
│   ├── index.ts                 # MCP Server entry point
│   ├── tools.ts                 # Tool handlers
│   ├── resources.ts             # Resource handlers
│   └── prompts.ts               # Prompt templates (MCP prompts primitive)
├── data/
│   ├── domains.json             # 5 domínios com pesos e task statements
│   ├── scenarios.json           # 6 cenários de produção
│   └── sample-questions.json    # Questões seed (30-50 iniciais)
└── tests/
    ├── scorer.test.ts
    ├── question-generator.test.ts
    └── mcp-server.test.ts
```

---

## Especificação Funcional

### 1. Modos de Operação

```
$ ccaf-sim exam          # Simulado completo: 60 questões, 120 min, scored
$ ccaf-sim practice      # Modo prática: escolhe domínio/cenário, sem timer
$ ccaf-sim generate      # Gera N questões novas via Claude API e salva no banco
$ ccaf-sim stats         # Mostra progresso: score por domínio, histórico, gaps
$ ccaf-sim review        # Revisa questões erradas com explicações detalhadas
```

### 2. Formato de Questão

Cada questão segue o formato exato do exame real:

```typescript
interface Question {
  id: string;                    // UUID
  scenario: Scenario;           // 1 dos 6 cenários
  domain: Domain;               // 1 dos 5 domínios
  stem: string;                 // Enunciado (contextualizado no cenário)
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;          // Por que a resposta correta é correta
  wrong_explanations: {         // Por que cada alternativa errada é errada
    [key: string]: string;
  };
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  tags: string[];               // Conceitos testados (ex: "stop_reason", "hub-and-spoke")
  source: 'seed' | 'generated'; // Se veio do seed ou foi gerada via API
}

type Domain =
  | 'agentic_architecture'      // 27%
  | 'tool_design_mcp'           // 18%
  | 'claude_code'               // 20%
  | 'prompt_engineering'        // 20%
  | 'context_reliability';      // 15%

type Scenario =
  | 'customer_support_agent'
  | 'code_generation'
  | 'multi_agent_research'
  | 'developer_productivity'
  | 'ci_cd_claude_code'
  | 'structured_data_extraction';
```

### 3. Geração de Questões via Claude API

O `question-generator.ts` usa o Anthropic SDK para gerar questões novas:

```typescript
// Pseudo-código — implementar com o SDK real
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// System prompt para geração de questões
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

KEY CONCEPTS TO TEST (examples):
- stop_reason handling in agentic loops ("tool_use" vs "end_turn")
- CLAUDE.md hierarchy (project root > subdirectory > .claude/commands)
- MCP primitives: tools (executable), resources (data), prompts (templates)
- Programmatic enforcement vs prompt-based guidance
- Hub-and-spoke multi-agent patterns
- JSON schema validation with retry loops
- The -p flag for Claude Code in CI/CD pipelines
- Structured error responses (4 error categories)
- Escalation patterns (3 valid triggers vs 2 unreliable ones)
- Grep vs Glob tool distinction
- Batch API for cost optimization
- Prompt caching strategies

OUTPUT FORMAT: Respond with valid JSON only. No markdown, no preamble.`;

// Implementar com validation-retry loop (Domínio 4 do exame!)
async function generateQuestion(domain: Domain, scenario: Scenario): Promise<Question> {
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate 1 exam question for:
Domain: ${domain}
Scenario: ${scenario}

Return as JSON matching this schema:
{
  "stem": "string — the question text, contextualized in the scenario",
  "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "correct_answer": "A" | "B" | "C" | "D",
  "explanation": "string — why the correct answer is correct",
  "wrong_explanations": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "difficulty": "foundation" | "intermediate" | "advanced",
  "tags": ["string — concept tags"]
}`
      }]
    });

    // Extrair texto da resposta
    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    try {
      const parsed = JSON.parse(text);
      // Validar schema (implementar validação real)
      if (isValidQuestion(parsed)) {
        return {
          id: crypto.randomUUID(),
          scenario,
          domain,
          source: 'generated',
          ...parsed
        };
      }
    } catch (e) {
      // Retry — o modelo às vezes inclui markdown fences
      console.log(`Attempt ${attempt + 1} failed, retrying...`);
    }
  }
  
  throw new Error(`Failed to generate valid question after ${MAX_RETRIES} attempts`);
}
```

### 4. MCP Server — Banco de Questões

O MCP server expõe o banco de questões como tools e resources:

```typescript
// mcp-server/index.ts — pseudo-código
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'ccaf-question-bank',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  }
});

// TOOLS — ações executáveis

// list_questions: lista questões filtradas por domínio/cenário/dificuldade
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_questions',
      description: 'List exam questions filtered by domain, scenario, or difficulty',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', enum: ['agentic_architecture', 'tool_design_mcp', 'claude_code', 'prompt_engineering', 'context_reliability'] },
          scenario: { type: 'string' },
          difficulty: { type: 'string', enum: ['foundation', 'intermediate', 'advanced'] },
          limit: { type: 'number', default: 10 },
          exclude_answered: { type: 'boolean', default: false }
        }
      }
    },
    {
      name: 'get_question',
      description: 'Get a specific question by ID with full details',
      inputSchema: {
        type: 'object',
        properties: {
          question_id: { type: 'string' }
        },
        required: ['question_id']
      }
    },
    {
      name: 'submit_answer',
      description: 'Submit an answer for a question and get feedback',
      inputSchema: {
        type: 'object',
        properties: {
          question_id: { type: 'string' },
          answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          time_spent_seconds: { type: 'number' }
        },
        required: ['question_id', 'answer']
      }
    },
    {
      name: 'get_progress',
      description: 'Get study progress stats by domain and overall',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Filter by domain, or omit for overall' }
        }
      }
    }
  ]
}));

// RESOURCES — dados estáticos consultáveis

// exam://guide — resumo do exam guide
// exam://domains — lista de domínios com pesos e task statements
// exam://scenarios — lista de cenários com descrições

// PROMPTS — templates reutilizáveis

// explain_answer — template para explicar por que uma resposta está errada
// generate_similar — template para gerar questão similar a uma existente
```

### 5. Scoring

O exame real usa scaled scoring (0-1000, mínimo 720). Implementar:

```typescript
// scorer.ts
interface ExamResult {
  total_questions: number;       // 60
  correct: number;
  score: number;                 // Scaled 0-1000
  passed: boolean;               // score >= 720
  time_elapsed_seconds: number;
  domain_breakdown: {
    domain: Domain;
    weight: number;              // 0.27, 0.20, etc.
    questions: number;
    correct: number;
    percentage: number;
  }[];
}

// Distribuição de questões por domínio (proporcional ao peso):
// Domínio 1: 16 questões (27% de 60)
// Domínio 3: 12 questões (20%)
// Domínio 4: 12 questões (20%)
// Domínio 2: 11 questões (18%)
// Domínio 5: 9 questões  (15%)
// Total: 60
```

### 6. CLI Interface

```
╔══════════════════════════════════════════════════════╗
║     CCA-F Exam Simulator v1.0                        ║
║     Claude Certified Architect – Foundations          ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  [1] Full Exam (60 questions, 120 min)               ║
║  [2] Practice Mode (choose domain/scenario)          ║
║  [3] Generate New Questions (via Claude API)         ║
║  [4] Review Wrong Answers                            ║
║  [5] View Stats & Progress                           ║
║  [6] Exit                                            ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

## Schema SQLite

```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  scenario TEXT NOT NULL,
  stem TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK(correct_answer IN ('A','B','C','D')),
  explanation TEXT NOT NULL,
  wrong_explanation_a TEXT,
  wrong_explanation_b TEXT,
  wrong_explanation_c TEXT,
  wrong_explanation_d TEXT,
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  tags TEXT,  -- JSON array
  source TEXT NOT NULL DEFAULT 'seed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_session_id TEXT NOT NULL,     -- Groups questions in a single exam
  question_id TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE exam_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,                -- 'exam' or 'practice'
  started_at DATETIME NOT NULL,
  finished_at DATETIME,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER,
  score INTEGER,                     -- Scaled 0-1000
  passed BOOLEAN,
  domain_filter TEXT,                -- NULL for full exam
  scenario_filter TEXT               -- NULL for full exam
);

-- Indices for common queries
CREATE INDEX idx_questions_domain ON questions(domain);
CREATE INDEX idx_questions_scenario ON questions(scenario);
CREATE INDEX idx_attempts_question ON attempts(question_id);
CREATE INDEX idx_attempts_session ON attempts(exam_session_id);
```

---

## Questões Seed (Exemplos — incluir 30-50 no seed.sql)

Estas questões seguem o formato real do exame. Incluir no `data/sample-questions.json`:

```json
[
  {
    "domain": "agentic_architecture",
    "scenario": "customer_support_agent",
    "stem": "Your Customer Support Agent processes a user request and receives a response from Claude with stop_reason set to 'tool_use'. The response includes a tool_use content block requesting execution of the lookup_order tool. What should your orchestration code do next?",
    "options": {
      "A": "Execute the tool, append the tool result to the conversation history, and send the updated history back to Claude in a new API call",
      "B": "Execute the tool and return the result directly to the user without sending it back to Claude",
      "C": "Check if the tool result is satisfactory before deciding whether to send it back to Claude or directly to the user",
      "D": "Execute the tool, start a new conversation with Claude containing only the tool result, discarding the previous history"
    },
    "correct_answer": "A",
    "explanation": "The agentic loop pattern requires appending tool results to the existing conversation history and sending the complete history back to Claude. This preserves context and allows Claude to interpret the tool result and decide on next steps (potentially calling another tool or generating a final response). Discarding history (D) breaks context. Returning directly to user (B) skips Claude's interpretation. Client-side filtering (C) undermines the agentic loop pattern.",
    "wrong_explanations": {
      "B": "Bypassing Claude after tool execution breaks the agentic loop. Claude needs to see the tool result to decide whether to call additional tools or compose the final response.",
      "C": "The orchestration layer should not second-guess Claude's tool calls. The agentic loop is: Claude requests tool → execute → return result → Claude decides next action.",
      "D": "Starting a new conversation discards all prior context. The agentic loop maintains a single conversation thread with accumulated history."
    },
    "difficulty": "foundation",
    "tags": ["stop_reason", "agentic_loop", "tool_use", "conversation_history"]
  },
  {
    "domain": "claude_code",
    "scenario": "ci_cd_claude_code",
    "stem": "Your team wants to integrate Claude Code into their CI/CD pipeline to automatically review pull requests. Claude Code needs to run non-interactively in the pipeline without prompting for user input. Which flag enables this behavior?",
    "options": {
      "A": "The --ci flag which enables continuous integration mode",
      "B": "The -p flag which accepts a prompt as an argument and runs non-interactively",
      "C": "The --batch flag which processes all files without interaction",
      "D": "The --headless flag which disables the interactive terminal interface"
    },
    "correct_answer": "B",
    "explanation": "Claude Code's -p flag (short for --print) accepts a prompt as a command-line argument and runs in non-interactive mode, outputting the result to stdout. This is the documented approach for CI/CD integration. The other flags are fabricated and do not exist in Claude Code.",
    "wrong_explanations": {
      "A": "There is no --ci flag in Claude Code. The -p flag is the correct mechanism for non-interactive operation.",
      "C": "There is no --batch flag in Claude Code. Batch processing of files is handled by providing appropriate prompts via -p.",
      "D": "There is no --headless flag in Claude Code. Non-interactive mode is achieved through the -p flag."
    },
    "difficulty": "foundation",
    "tags": ["-p_flag", "ci_cd", "non_interactive", "claude_code"]
  },
  {
    "domain": "tool_design_mcp",
    "scenario": "multi_agent_research",
    "stem": "You are designing an MCP server for your Multi-Agent Research System. The server needs to provide access to a research paper database. Some operations are read-only queries (searching papers, getting metadata) while others modify state (bookmarking, annotating). Following MCP best practices, how should you model these two categories?",
    "options": {
      "A": "Implement all operations as MCP tools since they all involve interacting with the database",
      "B": "Implement read-only operations as MCP resources and state-modifying operations as MCP tools",
      "C": "Implement all operations as MCP resources with different access levels",
      "D": "Implement read-only operations as MCP prompts and state-modifying operations as MCP tools"
    },
    "correct_answer": "B",
    "explanation": "MCP defines three primitives with distinct purposes: resources provide data (read-only, URI-addressable), tools execute actions (can modify state, require explicit invocation), and prompts provide templates. Read-only database queries map naturally to resources, while state-modifying operations map to tools. This separation follows MCP's design philosophy and enables clients to handle each type appropriately.",
    "wrong_explanations": {
      "A": "Making everything a tool loses the semantic distinction MCP provides. Resources signal to clients that an operation is safe and read-only, enabling caching and prefetching.",
      "C": "Resources in MCP are inherently read-only and data-oriented. State-modifying operations should be modeled as tools, which have explicit invocation semantics.",
      "D": "Prompts in MCP are reusable templates for common interactions, not data access mechanisms. Read-only data access should use resources."
    },
    "difficulty": "intermediate",
    "tags": ["mcp_primitives", "tools_vs_resources", "server_design"]
  }
]
```

---

## CLAUDE.md para o Projeto

Incluir este arquivo na raiz do projeto para que Claude Code siga as convenções:

```markdown
# CLAUDE.md — CCA-F Exam Simulator

## Projeto
Simulador de exame para a certificação Claude Certified Architect – Foundations.
Este projeto é TAMBÉM um exercício de aprendizado: construí-lo ensina os
conceitos que o exame testa (Claude SDK, MCP, structured output).

## Stack
- TypeScript (strict mode, ESM modules)
- Node.js 20+
- @anthropic-ai/sdk (latest)
- @modelcontextprotocol/sdk (latest)
- better-sqlite3 para storage
- @inquirer/prompts para CLI
- vitest para testes

## Convenções
- Usar constructor injection (nunca global state)
- Funções puras quando possível
- Todos os tipos em src/types.ts
- Erros descritivos com contexto (nunca throw genérico)
- Comentários apenas quando agregam decisão arquitetural
- 4 espaços de indentação

## Arquitetura
- src/ → código do CLI client (exam runner)
- mcp-server/ → MCP server que serve banco de questões
- data/ → JSON estáticos (domínios, cenários, seed questions)
- O MCP server conecta via stdio transport
- O question generator usa Anthropic SDK diretamente

## Testes
- Vitest para unit tests
- Testar scorer com cenários conhecidos
- Testar question generator com mock da API
- Testar MCP server tools isoladamente

## Como Rodar
npm run dev         → Inicia o CLI
npm run mcp-server  → Inicia o MCP server standalone
npm run generate    → Gera questões via Claude API
npm test            → Roda testes
npm run seed        → Popula banco com questões iniciais
```

---

## Roadmap de Implementação (ordem sugerida)

### Sprint 1 — Foundation (2-3h)
1. Setup do projeto (package.json, tsconfig, vitest)
2. Definir types.ts com todas as interfaces
3. Criar schema SQLite e database.ts wrapper
4. Seed com 10 questões hardcoded
5. Implementar scorer.ts com testes

### Sprint 2 — CLI + Exam Runner (3-4h)
1. CLI menu com @inquirer/prompts
2. Modo practice: seleciona domínio, mostra questões, coleta respostas
3. Modo exam: 60 questões, timer 120 min, score final
4. Reporter: breakdown por domínio
5. Review mode: mostra questões erradas com explicações

### Sprint 3 — Claude SDK Integration (2-3h)
1. Instalar @anthropic-ai/sdk
2. Implementar question-generator.ts
3. Validation-retry loop para JSON output
4. Comando `generate`: gera N questões por domínio e salva no banco
5. Testes com mock da API

### Sprint 4 — MCP Server (3-4h)
1. Criar MCP server com @modelcontextprotocol/sdk
2. Implementar tools: list_questions, get_question, submit_answer, get_progress
3. Implementar resources: exam://guide, exam://domains, exam://scenarios
4. Implementar prompt template: explain_answer
5. Conectar CLI ao MCP server via stdio transport
6. Testes do server

### Sprint 5 — Polish (2h)
1. Expandir seed para 50+ questões (mistura de manual + gerado)
2. Stats command: histórico de exames, curva de progresso, gaps por domínio
3. Adicionar questões dos sample questions do Exam Guide oficial
4. README.md com setup instructions

---

## Variáveis de Ambiente

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...    # Necessário apenas para modo generate
```

---

## Custo Estimado de API

Usando claude-sonnet-4-6 para geração:
- ~2000 tokens por questão gerada
- Gerar 100 questões ≈ 200K tokens ≈ ~$0.60
- Custo negligível para volume de estudo pessoal

---

## Notas para o Desenvolvedor

Este é seu PRIMEIRO projeto com Anthropic SDK e MCP. Algumas dicas:

1. **Comece pelo Sprint 1** — não toque no SDK/MCP até o scorer e CLI estarem funcionando
2. **A documentação oficial é sua amiga:**
   - SDK: https://docs.anthropic.com/en/docs/build-with-claude/typescript-sdk
   - MCP: https://modelcontextprotocol.io/docs
3. **O MCP server é mais simples do que parece** — é basicamente um servidor que expõe funções via JSON-RPC
4. **Validation-retry loop** é um padrão do exame — implementá-lo aqui é estudo direto
5. **Cada bug que você resolver é uma lição** — você vai entender stop_reason, tool_use blocks, e structured output na prática, não na teoria
