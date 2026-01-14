/**
 * Settings Module - Routes
 *
 * HTTP endpoints for global settings management.
 */

import { Hono } from 'hono'
import { settingsService } from './service'
import type { UpdateSettingsInput } from './types'

const settings = new Hono()

/**
 * GET /api/settings - Get global settings with runtime status
 */
settings.get('/', (c) => {
  const result = settingsService.get()
  return c.json(result)
})

/**
 * PUT /api/settings - Update global settings
 */
settings.put('/', async (c) => {
  const body = await c.req.json<UpdateSettingsInput>()
  const result = settingsService.update(body)
  return c.json(result)
})

/**
 * GET /api/settings/cli/health - On-demand CLI health check
 */
settings.get('/cli/health', async (c) => {
  const result = await settingsService.checkCliHealth()
  return c.json(result)
})

export { settings }
