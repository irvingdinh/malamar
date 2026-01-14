/**
 * Settings Module - Service
 *
 * Handles reading and writing global settings to config.json,
 * merged with runtime config (env/CLI overrides not persisted).
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfig, saveConfigFile, log, ValidationError } from '../core'
import type { PersistedConfig, CliConfig } from '../core/types'
import type {
  UpdateSettingsInput,
  SettingsWithStatus,
  CliHealthResult,
} from './types'

// Cache for CLI health check (5 second TTL)
let healthCache: CliHealthResult | null = null
let healthCacheTime = 0
const HEALTH_CACHE_TTL_MS = 5000

/**
 * Load persisted config from config.json
 */
function loadPersistedConfig(): PersistedConfig {
  const config = getConfig()
  const configPath = join(config.dataDir, 'config.json')

  if (!existsSync(configPath)) {
    // Return defaults if config.json doesn't exist
    return {
      clis: [{ type: 'claude', path: null, maxConcurrent: null }],
      server: { port: 3456 },
    }
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(content) as Partial<PersistedConfig>

    // Ensure required fields with defaults
    return {
      clis: parsed.clis ?? [{ type: 'claude', path: null, maxConcurrent: null }],
      server: parsed.server ?? { port: 3456 },
    }
  } catch (error) {
    log.warn('Failed to parse config.json, using defaults', { error: String(error) })
    return {
      clis: [{ type: 'claude', path: null, maxConcurrent: null }],
      server: { port: 3456 },
    }
  }
}

/**
 * Validate CLI configuration
 */
function validateCliConfig(cli: CliConfig, index: number): void {
  if (cli.type !== 'claude') {
    throw new ValidationError(`Invalid CLI type at index ${index}`, {
      [`clis[${index}].type`]: 'Only "claude" type is supported',
    })
  }

  if (cli.path !== null && typeof cli.path !== 'string') {
    throw new ValidationError(`Invalid CLI path at index ${index}`, {
      [`clis[${index}].path`]: 'Path must be a string or null',
    })
  }

  if (cli.maxConcurrent !== null) {
    if (typeof cli.maxConcurrent !== 'number' || cli.maxConcurrent < 1) {
      throw new ValidationError(`Invalid maxConcurrent at index ${index}`, {
        [`clis[${index}].maxConcurrent`]: 'maxConcurrent must be a positive number or null',
      })
    }
  }
}

/**
 * Validate settings input
 */
function validateSettingsInput(input: UpdateSettingsInput): void {
  // Validate clis array if provided
  if (input.clis !== undefined) {
    if (!Array.isArray(input.clis)) {
      throw new ValidationError('Invalid clis configuration', {
        clis: 'clis must be an array',
      })
    }

    if (input.clis.length === 0) {
      throw new ValidationError('Invalid clis configuration', {
        clis: 'clis array cannot be empty',
      })
    }

    for (let i = 0; i < input.clis.length; i++) {
      const cli = input.clis[i]
      if (cli) {
        validateCliConfig(cli, i)
      }
    }
  }

  // Validate server config if provided
  if (input.server !== undefined) {
    if (input.server.port !== undefined) {
      if (typeof input.server.port !== 'number' || input.server.port < 1 || input.server.port > 65535) {
        throw new ValidationError('Invalid server port', {
          'server.port': 'Port must be a number between 1 and 65535',
        })
      }
    }
  }
}

export const settingsService = {
  /**
   * Get current settings with runtime status
   */
  get(): SettingsWithStatus {
    const persisted = loadPersistedConfig()
    const runtime = getConfig()

    return {
      clis: persisted.clis,
      server: persisted.server,
      runtimePort: runtime.port,
      runtimeClaudePath: runtime.claudePath,
      runtimeMaxConcurrent: runtime.maxConcurrent,
    }
  },

  /**
   * Update settings (persists to config.json)
   */
  update(input: UpdateSettingsInput): SettingsWithStatus {
    // Validate input
    validateSettingsInput(input)

    const config = getConfig()
    const current = loadPersistedConfig()

    // Merge updates, filtering out undefined values
    const serverUpdate = input.server ?? {}
    const mergedServer = {
      port: serverUpdate.port ?? current.server.port,
    }

    const updated: PersistedConfig = {
      clis: input.clis ?? current.clis,
      server: mergedServer,
    }

    // Save to config.json
    saveConfigFile(config.dataDir, updated)
    log.info('Settings updated', { dataDir: config.dataDir })

    // Return updated settings with runtime status
    return {
      clis: updated.clis,
      server: updated.server,
      runtimePort: config.port,
      runtimeClaudePath: config.claudePath,
      runtimeMaxConcurrent: config.maxConcurrent,
    }
  },

  /**
   * Check CLI health by executing `claude --version`
   * Results are cached for 5 seconds
   */
  async checkCliHealth(): Promise<CliHealthResult> {
    const now = Date.now()

    // Return cached result if still valid
    if (healthCache && now - healthCacheTime < HEALTH_CACHE_TTL_MS) {
      return healthCache
    }

    const config = getConfig()
    let claudePath = config.claudePath

    // Try to detect claude in PATH if not configured
    if (!claudePath) {
      try {
        const whichProc = Bun.spawn(['which', 'claude'], {
          stdout: 'pipe',
          stderr: 'pipe',
        })
        const output = await new Response(whichProc.stdout).text()
        const exitCode = await whichProc.exited

        // Only use the path if which command succeeded
        if (exitCode === 0 && output.trim()) {
          claudePath = output.trim()
        }
      } catch {
        claudePath = null
      }
    }

    if (!claudePath) {
      healthCache = {
        installed: false,
        version: null,
        path: null,
        checkedAt: now,
      }
      healthCacheTime = now
      return healthCache
    }

    // Check if file exists
    if (!existsSync(claudePath)) {
      healthCache = {
        installed: false,
        version: null,
        path: claudePath,
        checkedAt: now,
      }
      healthCacheTime = now
      return healthCache
    }

    // Execute claude --version
    try {
      const proc = Bun.spawn([claudePath, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const output = await new Response(proc.stdout).text()
      const exitCode = await proc.exited

      if (exitCode === 0) {
        // Parse version from output (e.g., "claude 1.0.0" or just "1.0.0")
        const versionMatch = output.trim().match(/[\d.]+/)
        const version = versionMatch ? versionMatch[0] : output.trim()

        healthCache = {
          installed: true,
          version,
          path: claudePath,
          checkedAt: now,
        }
      } else {
        healthCache = {
          installed: false,
          version: null,
          path: claudePath,
          checkedAt: now,
        }
      }
    } catch (error) {
      log.debug('CLI health check failed', { error: String(error) })
      healthCache = {
        installed: false,
        version: null,
        path: claudePath,
        checkedAt: now,
      }
    }

    healthCacheTime = now
    return healthCache
  },

  /**
   * Clear the CLI health cache (for testing)
   */
  clearHealthCache(): void {
    healthCache = null
    healthCacheTime = 0
  },
}
