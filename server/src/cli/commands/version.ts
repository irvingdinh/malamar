/**
 * CLI Command - Version
 *
 * Displays the version number from package.json.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let cachedVersion: string | null = null

/**
 * Get the version from package.json
 */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion
  }

  try {
    // Try to read from package.json relative to this file
    const packagePath = join(import.meta.dir, '../../../package.json')
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
    cachedVersion = packageJson.version || '0.0.0'
    return cachedVersion
  } catch {
    // Fallback version if package.json is not found
    cachedVersion = '0.0.1'
    return cachedVersion
  }
}

export function showVersion(): void {
  console.log(`malamar v${getVersion()}`)
}

export async function runVersionCommand(): Promise<void> {
  showVersion()
}
