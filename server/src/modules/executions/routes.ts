/**
 * Executions Module - Routes
 *
 * HTTP endpoints for execution operations.
 */

import { Hono } from 'hono'
import { executionService } from './service'
import type { ExecutionStatus } from './types'

const executions = new Hono()

/**
 * GET /api/executions - List all executions with optional filters
 * Query params: taskId, status, page, limit
 */
executions.get('/', (c) => {
  const taskId = c.req.query('taskId')
  const status = c.req.query('status') as ExecutionStatus | undefined
  const page = parseInt(c.req.query('page') || '1', 10)
  const limit = parseInt(c.req.query('limit') || '50', 10)

  const { executions: list, total } = executionService.list({
    taskId,
    status,
    page,
    limit,
  })

  return c.json({
    executions: list,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

/**
 * GET /api/executions/analytics - Get agent analytics
 */
executions.get('/analytics', (c) => {
  const analytics = executionService.analytics()
  return c.json(analytics)
})

/**
 * GET /api/executions/:id - Get execution detail
 */
executions.get('/:id', (c) => {
  const id = c.req.param('id')!
  const includeLogs = c.req.query('includeLogs') === 'true'
  const execution = executionService.get(id, includeLogs)
  return c.json(execution)
})

/**
 * GET /api/executions/:id/logs - Get execution logs
 */
executions.get('/:id/logs', (c) => {
  const id = c.req.param('id')!
  const logs = executionService.getLogs(id)
  return c.json(logs)
})

/**
 * POST /api/executions - Create a new execution
 */
executions.post('/', async (c) => {
  const body = await c.req.json<{
    taskId?: string
    agentId?: string
    agentName?: string
    cliType?: string
  }>()

  const execution = executionService.create({
    taskId: body.taskId ?? '',
    agentId: body.agentId ?? '',
    agentName: body.agentName ?? '',
    cliType: body.cliType,
  })

  return c.json(execution, 201)
})

/**
 * POST /api/executions/:id/start - Start an execution
 */
executions.post('/:id/start', (c) => {
  const id = c.req.param('id')!
  const execution = executionService.start(id)
  return c.json(execution)
})

/**
 * POST /api/executions/:id/complete - Complete an execution
 */
executions.post('/:id/complete', async (c) => {
  const id = c.req.param('id')!
  const body = await c.req.json<{
    result?: 'skip' | 'comment' | 'error' | null
    output?: string | null
  }>()

  const execution = executionService.complete(
    id,
    body.result ?? null,
    body.output
  )
  return c.json(execution)
})

/**
 * POST /api/executions/:id/fail - Mark an execution as failed
 */
executions.post('/:id/fail', async (c) => {
  const id = c.req.param('id')!
  const body = await c.req.json<{
    error?: string
  }>()

  const execution = executionService.fail(id, body.error)
  return c.json(execution)
})

/**
 * POST /api/executions/:id/logs - Append a log entry
 */
executions.post('/:id/logs', async (c) => {
  const id = c.req.param('id')!
  const body = await c.req.json<{
    content?: string
  }>()

  if (!body.content) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Content is required' } },
      400
    )
  }

  const log = executionService.appendLog(id, body.content)
  return c.json(log, 201)
})

/**
 * DELETE /api/executions/:id - Delete an execution
 */
executions.delete('/:id', (c) => {
  const id = c.req.param('id')!
  executionService.delete(id)
  return c.body(null, 204)
})

export { executions }
