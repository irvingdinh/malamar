/**
 * Recovery Module - Routes
 *
 * HTTP endpoints for manual recovery operations.
 */

import { Hono } from 'hono'
import { ValidationError, NotFoundError, log } from '../core'
import { recoveryService } from './service'

const recovery = new Hono()

/**
 * POST /api/recovery/trigger
 * Manually trigger recovery process for all in-progress tasks
 */
recovery.post('/trigger', async (c) => {
  log.info('Manual recovery triggered via API')

  const result = await recoveryService.recoverAll()

  return c.json({
    success: true,
    message: `Recovery completed: ${result.recoveredCount} recovered, ${result.skippedCount} skipped, ${result.failedCount} failed`,
    ...result,
  })
})

/**
 * POST /api/recovery/tasks/:taskId
 * Manually trigger recovery for a specific task
 */
recovery.post('/tasks/:taskId', async (c) => {
  const taskId = c.req.param('taskId')

  if (!taskId) {
    throw new ValidationError('Task ID is required')
  }

  log.info('Manual task recovery triggered via API', { taskId })

  const result = await recoveryService.recoverTask(taskId)

  if (!result) {
    throw new NotFoundError(`No routing found for task: ${taskId}`)
  }

  return c.json({
    success: result.status === 'recovered',
    ...result,
  })
})

export { recovery }
