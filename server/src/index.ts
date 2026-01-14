/**
 * Malamar Server - Entry Point
 *
 * Single-binary, zero-configuration autonomous task orchestration system.
 */

import { serve } from 'bun'
import { app } from './app'
import {
  initConfig,
  parseCliArgs,
  initLogger,
  initDatabase,
  closeDatabase,
  log,
} from './modules/core'

const VERSION = '0.0.1'

function showHelp(): void {
  console.log(`
Malamar - Autonomous Task Orchestration System

Usage:
  malamar [options]

Options:
  -p, --port <number>     Server port (default: 3456)
  --data-dir <path>       Data directory (default: $HOME/.malamar)
  --tmp-dir <path>        Temp directory (default: os.tmpdir()/malamar)
  --log-format <format>   Log format: pretty, json, auto (default: auto)
  --log-level <level>     Log level: debug, info, warn, error (default: info)
  -h, --help              Show this help message
  -v, --version           Show version number

Examples:
  malamar                    Start server on default port
  malamar --port 8080        Start server on port 8080
  malamar --log-level debug  Start with debug logging
`)
}

function showVersion(): void {
  console.log(`malamar v${VERSION}`)
}

function printBanner(port: number, dataDir: string): void {
  console.log(`
┌─────────────────────────────────────────┐
│            Malamar v${VERSION}               │
├─────────────────────────────────────────┤
│  Server:     http://localhost:${port.toString().padEnd(10)}│
│  Data:       ${dataDir.padEnd(26)}│
└─────────────────────────────────────────┘
`)
}

function hasFlag(args: string[], ...flags: string[]): boolean {
  return args.some((arg) => flags.includes(arg))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Handle help and version flags early
  if (hasFlag(args, '--help', '-h')) {
    showHelp()
    process.exit(0)
  }

  if (hasFlag(args, '--version', '-v')) {
    showVersion()
    process.exit(0)
  }

  // Parse CLI arguments and initialize config
  const cliArgs = parseCliArgs(args)
  const config = initConfig(cliArgs)

  // Initialize logger
  initLogger({
    format: config.logFormat,
    level: config.logLevel,
  })

  // Initialize database
  await initDatabase(config.dataDir)

  // Print banner
  printBanner(config.port, config.dataDir)

  // Handle graceful shutdown
  const shutdown = async () => {
    log.info('Shutting down...')
    closeDatabase()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  // Start server
  serve({
    port: config.port,
    fetch: app.fetch,
  })

  log.info('Server started', { port: config.port })
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
