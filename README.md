# CCA-F Exam Simulator

Practice exams and study tools for the **Claude Certified Architect – Foundations (CCA-F)** certification.

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
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS |
| Language | TypeScript (strict, ESM) |
| Storage | SQLite via `better-sqlite3` |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| MCP | `@modelcontextprotocol/sdk` |
| Tests | Vitest |

## Getting Started

> Setup instructions will be added after the `project-setup` spec is implemented.

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
