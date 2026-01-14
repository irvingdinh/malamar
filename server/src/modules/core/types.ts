/**
 * Core Module - Shared TypeScript Types
 */

export interface Config {
  /** Server port */
  port: number
  /** Data directory path (database, config, attachments) */
  dataDir: string
  /** Temporary directory path (task workspaces) */
  tmpDir: string
  /** Log format: pretty, json, auto */
  logFormat: 'pretty' | 'json' | 'auto'
  /** Log level: debug, info, warn, error */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** Path to Claude CLI executable */
  claudePath: string | null
  /** Maximum concurrent executions (null = unlimited) */
  maxConcurrent: number | null
}

export interface CliConfig {
  type: 'claude'
  path: string | null
  maxConcurrent: number | null
}

export interface ServerConfig {
  port: number
}

export interface PersistedConfig {
  clis: CliConfig[]
  server: ServerConfig
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogFormat = 'pretty' | 'json' | 'auto'
