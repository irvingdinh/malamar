/**
 * Core Module - Database
 *
 * SQLite setup with migration runner.
 * Uses bun:sqlite with WAL mode for better concurrency.
 */

import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './logger'
import { withRetry } from './utils'

let dbInstance: Database | null = null

export function getDb(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dbInstance
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * Initialize the database connection and run migrations.
 */
export async function initDatabase(dataDir: string): Promise<Database> {
  ensureDir(dataDir)

  const dbPath = join(dataDir, 'malamar.db')
  log.info('Initializing database', { path: dbPath })

  const db = new Database(dbPath)

  // Enable WAL mode for better concurrency
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA busy_timeout = 5000')
  db.run('PRAGMA foreign_keys = ON')

  // Run migrations
  await runMigrations(db)

  dbInstance = db
  return db
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    log.info('Database connection closed')
  }
}

/**
 * Run all pending migrations.
 */
async function runMigrations(db: Database): Promise<void> {
  // Create migrations tracking table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version TEXT PRIMARY KEY
    )
  `)

  // Get applied migrations
  const applied = new Set<string>(
    db
      .query<{ version: string }, []>('SELECT version FROM _migrations')
      .all()
      .map((row) => row.version)
  )

  // Get migration files
  const migrationsDir = join(import.meta.dir, '../../../migrations')
  if (!existsSync(migrationsDir)) {
    log.debug('No migrations directory found', { path: migrationsDir })
    return
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const version = file.replace('.sql', '')
    if (applied.has(version)) {
      continue
    }

    log.info('Running migration', { version })

    const sql = readFileSync(join(migrationsDir, file), 'utf-8')

    // Execute migration with retry for busy database
    await withRetry(
      async () => {
        db.transaction(() => {
          // Split and execute statements
          const statements = sql
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)

          for (const statement of statements) {
            db.run(statement)
          }

          // Record migration
          db.run('INSERT INTO _migrations (version) VALUES (?)', [version])
        })()
      },
      { maxRetries: 3, baseDelay: 100 }
    )

    log.info('Migration completed', { version })
  }
}

/**
 * Execute a query with retry logic for database busy errors.
 */
export async function queryWithRetry<T>(
  operation: () => T
): Promise<T> {
  return withRetry(async () => operation(), {
    maxRetries: 3,
    baseDelay: 100,
  })
}
