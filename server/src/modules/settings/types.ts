/**
 * Settings Module - TypeScript Types
 */

import type { CliConfig, ServerConfig } from '../core/types'

/**
 * Settings response for API
 */
export interface Settings {
  /** CLI configurations */
  clis: CliConfig[]
  /** Server configuration */
  server: ServerConfig
}

/**
 * Update settings input
 */
export interface UpdateSettingsInput {
  /** CLI configurations */
  clis?: CliConfig[]
  /** Server configuration */
  server?: Partial<ServerConfig>
}

/**
 * CLI health check result
 */
export interface CliHealthResult {
  /** Whether the CLI is installed and accessible */
  installed: boolean
  /** CLI version if available */
  version: string | null
  /** Path to the CLI executable */
  path: string | null
  /** Timestamp of the health check */
  checkedAt: number
}

/**
 * Settings with runtime status
 */
export interface SettingsWithStatus extends Settings {
  /** Current runtime port (may differ from persisted if overridden by env/cli) */
  runtimePort: number
  /** Current runtime Claude path */
  runtimeClaudePath: string | null
  /** Current runtime max concurrent */
  runtimeMaxConcurrent: number | null
}
