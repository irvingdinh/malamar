/**
 * Core Module - Logger
 *
 * Pretty format: [2025-01-14 12:00:00] INFO  Message here
 * JSON format:   {"level":"info","time":"...","msg":"..."}
 * Auto format:   Detect TTY and choose pretty/json
 */

import type { LogFormat, LogLevel } from './types'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
}

function formatTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function formatISOTimestamp(): string {
  return new Date().toISOString()
}

function shouldLog(messageLevel: LogLevel, configLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[configLevel]
}

function resolveFormat(format: LogFormat): 'pretty' | 'json' {
  if (format === 'auto') {
    return process.stdout.isTTY ? 'pretty' : 'json'
  }
  return format
}

export interface LoggerOptions {
  format: LogFormat
  level: LogLevel
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, data?: Record<string, unknown>): void
}

export function createLogger(options: LoggerOptions): Logger {
  const resolvedFormat = resolveFormat(options.format)

  function log(
    level: LogLevel,
    msg: string,
    data?: Record<string, unknown>
  ): void {
    if (!shouldLog(level, options.level)) {
      return
    }

    if (resolvedFormat === 'json') {
      const entry: Record<string, unknown> = {
        level,
        time: formatISOTimestamp(),
        msg,
        ...data,
      }
      console.log(JSON.stringify(entry))
    } else {
      const timestamp = formatTimestamp()
      const label = LEVEL_LABELS[level]
      let line = `[${timestamp}] ${label} ${msg}`
      if (data && Object.keys(data).length > 0) {
        line += ` ${JSON.stringify(data)}`
      }
      console.log(line)
    }
  }

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
  }
}

// Default logger instance (will be replaced during init)
let loggerInstance: Logger = createLogger({ format: 'auto', level: 'info' })

export function initLogger(options: LoggerOptions): Logger {
  loggerInstance = createLogger(options)
  return loggerInstance
}

export function getLogger(): Logger {
  return loggerInstance
}

// Convenience exports
export const log = {
  debug: (msg: string, data?: Record<string, unknown>) =>
    loggerInstance.debug(msg, data),
  info: (msg: string, data?: Record<string, unknown>) =>
    loggerInstance.info(msg, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    loggerInstance.warn(msg, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    loggerInstance.error(msg, data),
}
