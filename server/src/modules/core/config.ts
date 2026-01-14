/**
 * Core Module - Configuration Loading
 *
 * Priority: ENV > CLI flags > config.json > Defaults
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Config, LogFormat, LogLevel, PersistedConfig } from './types'

const DEFAULT_PORT = 3456
const DEFAULT_LOG_FORMAT: LogFormat = 'auto'
const DEFAULT_LOG_LEVEL: LogLevel = 'info'

function getDefaultDataDir(): string {
  return join(homedir(), '.malamar')
}

function getDefaultTmpDir(): string {
  return join(tmpdir(), 'malamar')
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function loadConfigFile(dataDir: string): Partial<PersistedConfig> {
  const configPath = join(dataDir, 'config.json')
  if (!existsSync(configPath)) {
    return {}
  }
  try {
    const content = readFileSync(configPath, 'utf-8')
    return JSON.parse(content) as Partial<PersistedConfig>
  } catch {
    return {}
  }
}

export function saveConfigFile(dataDir: string, config: PersistedConfig): void {
  ensureDir(dataDir)
  const configPath = join(dataDir, 'config.json')
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

function parseEnvInt(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? undefined : parsed
}

function parseLogFormat(value: string | undefined): LogFormat | undefined {
  if (value === 'pretty' || value === 'json' || value === 'auto') {
    return value
  }
  return undefined
}

function parseLogLevel(value: string | undefined): LogLevel | undefined {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value
  }
  return undefined
}

export interface CliArgs {
  port?: number
  dataDir?: string
  tmpDir?: string
  logFormat?: LogFormat
  logLevel?: LogLevel
}

export function parseCliArgs(args: string[]): CliArgs {
  const result: CliArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    if ((arg === '--port' || arg === '-p') && nextArg) {
      const parsed = parseInt(nextArg, 10)
      if (!isNaN(parsed)) {
        result.port = parsed
        i++
      }
    } else if (arg === '--data-dir' && nextArg) {
      result.dataDir = nextArg
      i++
    } else if (arg === '--tmp-dir' && nextArg) {
      result.tmpDir = nextArg
      i++
    } else if (arg === '--log-format' && nextArg) {
      const format = parseLogFormat(nextArg)
      if (format) {
        result.logFormat = format
        i++
      }
    } else if (arg === '--log-level' && nextArg) {
      const level = parseLogLevel(nextArg)
      if (level) {
        result.logLevel = level
        i++
      }
    }
  }

  return result
}

export function loadConfig(cliArgs: CliArgs = {}): Config {
  // Determine data directory first (needed to load config.json)
  const dataDir =
    process.env['MALAMAR_DATA_DIR'] ?? cliArgs.dataDir ?? getDefaultDataDir()

  // Ensure data directory exists
  ensureDir(dataDir)

  // Load config.json
  const fileConfig = loadConfigFile(dataDir)
  const claudeCliConfig = fileConfig.clis?.find((c) => c.type === 'claude')

  // Build config with priority: ENV > CLI > file > defaults
  const config: Config = {
    port:
      parseEnvInt(process.env['MALAMAR_PORT']) ??
      cliArgs.port ??
      fileConfig.server?.port ??
      DEFAULT_PORT,

    dataDir,

    tmpDir:
      process.env['MALAMAR_TMP_DIR'] ?? cliArgs.tmpDir ?? getDefaultTmpDir(),

    logFormat:
      parseLogFormat(process.env['MALAMAR_LOG_FORMAT']) ??
      cliArgs.logFormat ??
      DEFAULT_LOG_FORMAT,

    logLevel:
      parseLogLevel(process.env['MALAMAR_LOG_LEVEL']) ??
      cliArgs.logLevel ??
      DEFAULT_LOG_LEVEL,

    claudePath:
      process.env['MALAMAR_CLAUDE_CODE_PATH'] ??
      claudeCliConfig?.path ??
      null,

    maxConcurrent: claudeCliConfig?.maxConcurrent ?? null,
  }

  // Ensure temp directory exists
  ensureDir(config.tmpDir)

  return config
}

// Singleton config instance
let configInstance: Config | null = null

export function getConfig(): Config {
  if (!configInstance) {
    throw new Error('Config not initialized. Call initConfig() first.')
  }
  return configInstance
}

export function initConfig(cliArgs: CliArgs = {}): Config {
  configInstance = loadConfig(cliArgs)
  return configInstance
}
