/**
 * Workspaces Module - Routes
 *
 * HTTP endpoints for workspace operations.
 */

import { Hono } from 'hono'
import { workspaceService } from './service'

const workspaces = new Hono()

/**
 * GET /api/workspaces - List all workspaces
 */
workspaces.get('/', (c) => {
  const list = workspaceService.list()
  return c.json(list)
})

/**
 * POST /api/workspaces - Create a new workspace
 */
workspaces.post('/', async (c) => {
  const body = await c.req.json<{ name?: string }>()
  const workspace = workspaceService.create({ name: body.name ?? '' })
  return c.json(workspace, 201)
})

/**
 * GET /api/workspaces/:id - Get a workspace by ID
 */
workspaces.get('/:id', (c) => {
  const id = c.req.param('id')
  const workspace = workspaceService.get(id)
  return c.json(workspace)
})

/**
 * PUT /api/workspaces/:id - Update a workspace
 */
workspaces.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ name?: string }>()
  const workspace = workspaceService.update(id, { name: body.name })
  return c.json(workspace)
})

/**
 * DELETE /api/workspaces/:id - Delete a workspace
 * Query params:
 *   - force: If true, cancel in-progress tasks before deletion
 */
workspaces.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const force = c.req.query('force') === 'true'
  await workspaceService.delete(id, force)
  return c.body(null, 204)
})

/**
 * GET /api/workspaces/:id/settings - Get all settings for a workspace
 */
workspaces.get('/:id/settings', (c) => {
  const id = c.req.param('id')
  const settings = workspaceService.getSettings(id)
  return c.json(settings)
})

/**
 * PUT /api/workspaces/:id/settings/:key - Set a setting
 */
workspaces.put('/:id/settings/:key', async (c) => {
  const id = c.req.param('id')
  const key = c.req.param('key')
  const body = await c.req.json<{ value: unknown }>()
  workspaceService.setSetting(id, key, body.value)
  return c.json({ key, value: body.value })
})

/**
 * DELETE /api/workspaces/:id/settings/:key - Delete a setting
 */
workspaces.delete('/:id/settings/:key', (c) => {
  const id = c.req.param('id')
  const key = c.req.param('key')
  workspaceService.deleteSetting(id, key)
  return c.body(null, 204)
})

export { workspaces }
