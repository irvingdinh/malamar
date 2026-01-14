/**
 * Settings Module
 *
 * Global settings management and CLI health checks.
 */

export { settings } from './routes'
export { settingsService } from './service'
export type {
  Settings,
  UpdateSettingsInput,
  SettingsWithStatus,
  CliHealthResult,
} from './types'
