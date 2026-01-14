/**
 * Routing Module - Routes
 *
 * HTTP endpoints for task routing operations.
 */

import { Hono } from 'hono'
import { routingService } from './service'
import type { RoutingStatus } from './types'

const routing = new Hono()

/**
 * GET /api/routing - List all routings with optional filters
 * Query params: status, taskId
 */
routing.get('/', (c) => {
  const status = c.req.query('status') as RoutingStatus | undefined
  const taskId = c.req.query('taskId')

  const routings = routingService.list({ status, taskId })
  return c.json(routings)
})

/**
 * GET /api/routing/pending - List pending/running routings
 * Used for recovery and monitoring
 */
routing.get('/pending', (c) => {
  const routings = routingService.findPending()
  return c.json(routings)
})

/**
 * GET /api/routing/:id - Get routing detail
 */
routing.get('/:id', (c) => {
  const id = c.req.param('id')!
  const routing = routingService.get(id)
  return c.json(routing)
})

/**
 * GET /api/routing/task/:taskId - Get routing by task ID
 */
routing.get('/task/:taskId', (c) => {
  const taskId = c.req.param('taskId')!
  const routing = routingService.getByTaskId(taskId)

  if (!routing) {
    return c.json(null)
  }

  return c.json(routing)
})

/**
 * POST /api/routing/trigger - Trigger routing for a task
 * Body: { taskId: string }
 */
routing.post('/trigger', async (c) => {
  const body = await c.req.json<{ taskId?: string }>()

  if (!body.taskId) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'taskId is required' } },
      400
    )
  }

  const routing = await routingService.trigger(body.taskId)
  return c.json(routing, 201)
})

/**
 * POST /api/routing/:id/resume - Resume a routing (for recovery)
 */
routing.post('/:id/resume', async (c) => {
  const id = c.req.param('id')!

  // Start resume in background and return immediately
  routingService.resume(id).catch(() => {
    // Errors are logged in the service
  })

  return c.json({ message: 'Routing resume initiated' })
})

/**
 * POST /api/routing/task/:taskId/cancel - Cancel routing for a task
 */
routing.post('/task/:taskId/cancel', async (c) => {
  const taskId = c.req.param('taskId')!
  const routing = await routingService.cancel(taskId)

  if (!routing) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'No routing found for task' } },
      404
    )
  }

  return c.json(routing)
})

/**
 * DELETE /api/routing/task/:taskId - Delete routing for a task
 */
routing.delete('/task/:taskId', (c) => {
  const taskId = c.req.param('taskId')!
  const deleted = routingService.delete(taskId)

  if (!deleted) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'No routing found for task' } },
      404
    )
  }

  return c.body(null, 204)
})

export { routing }
