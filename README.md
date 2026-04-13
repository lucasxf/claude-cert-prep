# CCA-F Exam Simulator

Simulador de provas e ferramentas de estudo para a certificação **Claude Certified Architect – Foundations (CCA-F)**.

---

## Como rodar

**Pré-requisito:** Node.js 20 LTS — use `nvm use` se tiver o nvm instalado, ou baixe em [nodejs.org](https://nodejs.org).

```bash
git clone https://github.com/lucasxf/claude-cert-prep.git
cd claude-cert-prep
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O banco SQLite é criado e populado automaticamente no primeiro `npm run dev` com 30 questões de exemplo.

### Opcional: gerar novas questões com a API da Claude

Copie o arquivo de exemplo e adicione sua chave:

```bash
cp .env.example .env.local
# edite .env.local e coloque sua ANTHROPIC_API_KEY
npm run generate
```

### Solução de problemas

**Erro ao instalar `better-sqlite3`?**
Confirme que está no Node 20 (`node -v`). Em Node 22+ não há binário pré-compilado; no Windows pode ser necessário `npm rebuild better-sqlite3` após instalar as Build Tools do Visual Studio.

---

## Getting Started

**Prerequisite:** Node.js 20 LTS.

```bash
git clone https://github.com/lucasxf/claude-cert-prep.git
cd claude-cert-prep
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database is created and seeded automatically on the first run.

**No environment variables are required to run the app.** Copy `.env.example` to `.env.local` only if you want to generate new questions via the Claude API (`npm run generate`).

---

## Purpose

Dual-purpose project:
1. **Study tool** — simulate the real exam (60 questions, 120 min, 720/1000 passing score)
2. **Learning exercise** — built with Anthropic SDK and MCP, the exact domains the exam tests

## Features

- Timed exam simulation (120-min countdown, pause/resume)
- Exam sessions identified by UUID, state persists across page refresh
- Domain-based performance breakdown per exam
- Consolidated exam history table (Histórico)
- Focused mini-exams targeting weak domains
- Export reports to CSV and XLSX
- Question generation via Claude API (`claude-sonnet-4-6`)
- MCP server for the question bank (learning exercise)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS v4 |
| Language | TypeScript (strict, ESM) |
| Storage | SQLite via `better-sqlite3` |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| MCP | `@modelcontextprotocol/sdk` |
| Tests | Vitest |

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full architecture description.

See [docs/specs/](./docs/specs/) for feature specifications.

## Exam Domains

| Domain | Weight |
|--------|--------|
| Agentic Architecture & Orchestration | 27% |
| Claude Code Configuration & Workflows | 20% |
| Prompt Engineering & Structured Output | 20% |
| Tool Design & MCP Integration | 18% |
| Context Management & Reliability | 15% |
