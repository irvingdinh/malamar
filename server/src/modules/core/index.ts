/**
 * Core Module - Foundation utilities and services
 */

// Config
export {
  initConfig,
  getConfig,
  loadConfig,
  saveConfigFile,
  parseCliArgs,
  type CliArgs,
} from './config'

// Database
export { initDatabase, closeDatabase, getDb, queryWithRetry } from './database'

// Logger
export {
  createLogger,
  initLogger,
  getLogger,
  log,
  type Logger,
  type LoggerOptions,
} from './logger'

// Errors
export {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  DatabaseError,
  isAppError,
  type ErrorDetails,
  type ErrorResponse,
} from './errors'

// Utils
export {
  generateId,
  now,
  getTempDir,
  safeJsonParse,
  safeJsonStringify,
  sleep,
  withRetry,
} from './utils'

// Types
export type {
  Config,
  CliConfig,
  ServerConfig,
  PersistedConfig,
  LogLevel,
  LogFormat,
} from './types'
