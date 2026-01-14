/**
 * CLI Module - Argument Parser
 *
 * Parses CLI arguments into structured format supporting commands and options.
 */

import type { LogFormat, LogLevel } from '../modules/core'
import type { Command, ParsedArgs } from './types'

const COMMANDS: Command[] = ['help', 'version', 'export', 'import', 'serve']

function parseLogFormat(value: string | undefined): LogFormat | undefined {
  if (value === 'pretty' || value === 'json' || value === 'auto') {
    return value
  }
  return undefined
}

function parseLogLevel(value: string | undefined): LogLevel | undefined {
  if (
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error'
  ) {
    return value
  }
  return undefined
}

/**
 * Parse CLI arguments into structured format.
 *
 * Supports:
 * - malamar [command] [options]
 * - Commands: help, version, export, import, serve (default)
 * - Global options: --port, --data-dir, --tmp-dir, --log-format, --log-level
 * - Export options: --output, --workspace
 * - Import: positional file argument
 */
export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: 'serve',
    cliArgs: {},
  }

  // Check for early help/version flags
  if (args.includes('--help') || args.includes('-h')) {
    result.command = 'help'
    return result
  }

  if (args.includes('--version') || args.includes('-v')) {
    result.command = 'version'
    return result
  }

  // Check for command as first argument
  if (args.length > 0) {
    const firstArg = args[0]!
    if (COMMANDS.includes(firstArg as Command)) {
      result.command = firstArg as Command
      args = args.slice(1)
    }
  }

  // Parse remaining arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    const nextArg = args[i + 1]

    // Skip flags that were already handled
    if (arg === '--help' || arg === '-h' || arg === '--version' || arg === '-v') {
      continue
    }

    // Global options
    if ((arg === '--port' || arg === '-p') && nextArg) {
      const parsed = parseInt(nextArg, 10)
      if (!isNaN(parsed)) {
        result.cliArgs.port = parsed
        i++
      }
    } else if (arg === '--data-dir' && nextArg) {
      result.cliArgs.dataDir = nextArg
      i++
    } else if (arg === '--tmp-dir' && nextArg) {
      result.cliArgs.tmpDir = nextArg
      i++
    } else if (arg === '--log-format' && nextArg) {
      const format = parseLogFormat(nextArg)
      if (format) {
        result.cliArgs.logFormat = format
        i++
      }
    } else if (arg === '--log-level' && nextArg) {
      const level = parseLogLevel(nextArg)
      if (level) {
        result.cliArgs.logLevel = level
        i++
      }
    }
    // Export options
    else if ((arg === '--output' || arg === '-o') && nextArg) {
      result.output = nextArg
      i++
    } else if ((arg === '--workspace' || arg === '-w') && nextArg) {
      result.workspace = nextArg
      i++
    }
    // Import: positional file argument
    else if (result.command === 'import' && !arg.startsWith('-')) {
      result.importFile = arg
    }
  }

  return result
}

/**
 * Check if help flag is present (for early exit)
 */
export function hasHelpFlag(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h') || args[0] === 'help'
}

/**
 * Check if version flag is present (for early exit)
 */
export function hasVersionFlag(args: string[]): boolean {
  return args.includes('--version') || args.includes('-v') || args[0] === 'version'
}
