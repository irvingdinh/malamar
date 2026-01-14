/**
 * CLI Command - Help
 *
 * Displays usage information and available commands.
 */

import { getVersion } from './version'

export function showHelp(): void {
  const version = getVersion()
  console.log(`
Malamar v${version} - Autonomous Task Orchestration System

Usage:
  malamar [command] [options]

Commands:
  serve              Start the server (default)
  help               Show this help message
  version            Show version number
  export             Export workspaces to JSON
  import <file>      Import workspaces from JSON

Global Options:
  -p, --port <number>       Server port (default: 3456)
  --data-dir <path>         Data directory (default: $HOME/.malamar)
  --tmp-dir <path>          Temp directory (default: os.tmpdir()/malamar)
  --log-format <format>     Log format: pretty, json, auto (default: auto)
  --log-level <level>       Log level: debug, info, warn, error (default: info)
  -h, --help                Show this help message
  -v, --version             Show version number

Export Options:
  -o, --output <file>       Output file (default: stdout)
  -w, --workspace <id>      Export single workspace by ID

Examples:
  malamar                         Start server on default port
  malamar --port 8080             Start server on port 8080
  malamar --log-level debug       Start with debug logging
  malamar export                  Export all workspaces to stdout
  malamar export -o backup.json   Export all workspaces to file
  malamar export -w abc123        Export single workspace to stdout
  malamar import backup.json      Import workspaces from file
`)
}

export async function runHelpCommand(): Promise<void> {
  showHelp()
}
