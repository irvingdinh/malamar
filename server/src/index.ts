/**
 * Malamar Server - Entry Point
 *
 * Single-binary, zero-configuration autonomous task orchestration system.
 */

import { serve } from 'bun'
import { app } from './app'

const DEFAULT_PORT = 3456

function parseArgs(): { port: number; help: boolean; version: boolean } {
  const args = process.argv.slice(2)
  let port = DEFAULT_PORT
  let help = false
  let version = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      help = true
    } else if (arg === '--version' || arg === '-v') {
      version = true
    } else if (arg === '--port' || arg === '-p') {
      const nextArg = args[i + 1]
      if (nextArg) {
        const parsed = parseInt(nextArg, 10)
        if (!isNaN(parsed)) {
          port = parsed
          i++
        }
      }
    }
  }

  return { port, help, version }
}

function showHelp(): void {
  console.log(`
Malamar - Autonomous Task Orchestration System

Usage:
  malamar [options]

Options:
  -p, --port <number>   Server port (default: ${DEFAULT_PORT})
  -h, --help            Show this help message
  -v, --version         Show version number

Examples:
  malamar                    Start server on default port
  malamar --port 8080        Start server on port 8080
`)
}

function showVersion(): void {
  console.log('malamar v0.0.1')
}

function printBanner(port: number): void {
  console.log(`
┌─────────────────────────────────────────┐
│            Malamar v0.0.1               │
├─────────────────────────────────────────┤
│  Server:     http://localhost:${port.toString().padEnd(10)}│
└─────────────────────────────────────────┘
`)
}

async function main(): Promise<void> {
  const { port, help, version } = parseArgs()

  if (help) {
    showHelp()
    process.exit(0)
  }

  if (version) {
    showVersion()
    process.exit(0)
  }

  printBanner(port)

  serve({
    port,
    fetch: app.fetch,
  })
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
