/**
 * Seed script — populates the database with questions from data/sample-questions.json.
 * Run with: npm run seed
 *
 * Idempotent: skips questions that already exist (matched by stem text).
 * The database and schema are created automatically if they don't exist yet.
 */

import fs from 'node:fs'
import path from 'node:path'
import { DatabaseClient } from './database.js'
import type { QuestionSeed } from '../types.js'

const DB_PATH = path.join(process.cwd(), 'data', 'ccaf.db')
const SEED_PATH = path.join(process.cwd(), 'data', 'sample-questions.json')

function main(): void {
    console.warn('Seeding database:', DB_PATH)

    const raw = fs.readFileSync(SEED_PATH, 'utf-8')
    const questions = JSON.parse(raw) as QuestionSeed[]

    const client = new DatabaseClient(DB_PATH)

    let inserted = 0
    let skipped = 0

    for (const q of questions) {
        try {
            client.insertQuestion(q, 'seed')
            inserted++
        } catch (err: unknown) {
            // Unique constraint violations indicate the question already exists.
            // better-sqlite3 surfaces these as SqliteError with code SQLITE_CONSTRAINT.
            if (
                typeof err === 'object' &&
                err !== null &&
                'code' in err &&
                (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
            ) {
                skipped++
            } else {
                throw err
            }
        }
    }

    const total = client.countQuestions()
    client.close()

    console.warn(`Seed complete: ${inserted} inserted, ${skipped} skipped.`)
    console.warn(`Total questions in database: ${total}`)
}

main()
