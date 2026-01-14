/**
 * Templates Module - Routes
 *
 * HTTP endpoints for task template operations.
 * Note: These routes are mounted under /api/workspaces/:id/templates
 */

import { Hono } from 'hono'
import { templateService } from './service'

const templates = new Hono<{ Variables: { workspaceId: string } }>()

// Extract workspace ID from path - it's guaranteed to exist when routes are mounted
templates.use('*', async (c, next) => {
  const workspaceId = c.req.param('id')
  if (!workspaceId) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Workspace ID is required' } },
      400
    )
  }
  c.set('workspaceId', workspaceId)
  return next()
})

/**
 * GET /api/workspaces/:id/templates - List all templates for a workspace
 */
templates.get('/', (c) => {
  const workspaceId = c.get('workspaceId')
  const list = templateService.listByWorkspace(workspaceId)
  return c.json(list)
})

/**
 * POST /api/workspaces/:id/templates - Create a new template
 */
templates.post('/', async (c) => {
  const workspaceId = c.get('workspaceId')
  const body = await c.req.json<{
    name?: string
    title?: string
    description?: string
  }>()

  const template = templateService.create(workspaceId, {
    name: body.name ?? '',
    title: body.title ?? '',
    description: body.description,
  })

  return c.json(template, 201)
})

/**
 * PUT /api/workspaces/:id/templates/:templateId - Update a template
 */
templates.put('/:templateId', async (c) => {
  const workspaceId = c.get('workspaceId')
  const templateId = c.req.param('templateId')!
  const body = await c.req.json<{
    name?: string
    title?: string
    description?: string | null
  }>()

  const template = templateService.update(workspaceId, templateId, {
    name: body.name,
    title: body.title,
    description: body.description,
  })

  return c.json(template)
})

/**
 * DELETE /api/workspaces/:id/templates/:templateId - Delete a template
 */
templates.delete('/:templateId', (c) => {
  const workspaceId = c.get('workspaceId')
  const templateId = c.req.param('templateId')!
  templateService.delete(workspaceId, templateId)
  return c.body(null, 204)
})

export { templates }
