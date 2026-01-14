/**
 * Malamar Server - Entry Point
 *
 * Single-binary, zero-configuration autonomous task orchestration system.
 */

import { serve } from 'bun'
import { app } from './app'
import {
  initConfig,
  initLogger,
  initDatabase,
  closeDatabase,
  log,
} from './modules/core'
import {
  parseArgs,
  hasHelpFlag,
  hasVersionFlag,
  runHelpCommand,
  runVersionCommand,
  runExportCommand,
  runImportCommand,
  getVersion,
} from './cli'

function printBanner(port: number, dataDir: string): void {
  const version = getVersion()
  console.log(`
┌─────────────────────────────────────────┐
│            Malamar v${version.padEnd(20)}│
├─────────────────────────────────────────┤
│  Server:     http://localhost:${port.toString().padEnd(10)}│
│  Data:       ${dataDir.slice(0, 26).padEnd(26)}│
└─────────────────────────────────────────┘
`)
}

async function runServeCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  // Parse CLI arguments and initialize config
  const config = initConfig(args.cliArgs)

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

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Quick check for help/version flags (before full parsing)
  if (hasHelpFlag(args)) {
    await runHelpCommand()
    process.exit(0)
  }

  if (hasVersionFlag(args)) {
    await runVersionCommand()
    process.exit(0)
  }

  // Parse arguments
  const parsedArgs = parseArgs(args)

  // Execute command
  switch (parsedArgs.command) {
    case 'help':
      await runHelpCommand()
      break

    case 'version':
      await runVersionCommand()
      break

    case 'export':
      await runExportCommand(parsedArgs)
      break

    case 'import':
      await runImportCommand(parsedArgs)
      break

    case 'serve':
    default:
      await runServeCommand(parsedArgs)
      break
  }
}

main().catch((error) => {
  console.error('Failed to start:', error)
  process.exit(1)
})
