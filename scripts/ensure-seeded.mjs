/**
 * Checks whether the SQLite database has been seeded.
 * Runs automatically before `npm run dev` and `npm run start`.
 * Idempotent — does nothing if the database already contains questions.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dbPath = join(root, 'data', 'ccaf.db')

let shouldSeed = false

if (!existsSync(dbPath)) {
    shouldSeed = true
} else {
    try {
        const { default: Database } = await import('better-sqlite3')
        const db = new Database(dbPath, { readonly: true })
        try {
            const row = db.prepare('SELECT COUNT(*) as n FROM questions').get()
            shouldSeed = row.n === 0
        } finally {
            db.close()
        }
    } catch {
        // DB exists but schema not applied yet — seed will create it
        shouldSeed = true
    }
}

if (shouldSeed) {
    console.log('[setup] First run — seeding database with sample questions...')
    execSync('npm run seed', { stdio: 'inherit', cwd: root })
}
