/**
 * Recovery Module - Service
 *
 * Handles recovery of in-progress tasks on server startup
 * and provides manual recovery capabilities.
 */

import { log } from '../core'
import { routingService } from '../routing/service'
import type { TaskRouting } from '../routing/types'

export interface RecoveryResult {
  recoveredCount: number
  skippedCount: number
  failedCount: number
  details: RecoveryDetail[]
}

export interface RecoveryDetail {
  routingId: string
  taskId: string
  status: 'recovered' | 'skipped' | 'failed'
  reason?: string
  iteration?: number
  agentIndex?: number
}

export const recoveryService = {
  /**
   * Recover all in-progress tasks
   * Called automatically on server startup
   */
  async recoverAll(): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      recoveredCount: 0,
      skippedCount: 0,
      failedCount: 0,
      details: [],
    }

    try {
      log.info('Starting in-progress task recovery...')

      // Find all pending/running routings
      const pendingRoutings = routingService.findPending()

      if (pendingRoutings.length === 0) {
        log.info('No in-progress tasks to recover')
        return result
      }

      log.info('Found tasks to recover', { count: pendingRoutings.length })

      // Recover each routing
      for (const routing of pendingRoutings) {
        const detail = await this.recoverSingle(routing)
        result.details.push(detail)

        switch (detail.status) {
          case 'recovered':
            result.recoveredCount++
            break
          case 'skipped':
            result.skippedCount++
            break
          case 'failed':
            result.failedCount++
            break
        }
      }

      log.info('Recovery complete', {
        recovered: result.recoveredCount,
        skipped: result.skippedCount,
        failed: result.failedCount,
      })

      return result
    } catch (error) {
      log.error('Task recovery failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },

  /**
   * Recover a single routing
   */
  async recoverSingle(routing: TaskRouting): Promise<RecoveryDetail> {
    const detail: RecoveryDetail = {
      routingId: routing.id,
      taskId: routing.taskId,
      status: 'recovered',
      iteration: routing.iteration,
      agentIndex: routing.currentAgentIndex,
    }

    try {
      // Check if routing is in a recoverable state
      if (routing.status !== 'pending' && routing.status !== 'running') {
        detail.status = 'skipped'
        detail.reason = `Routing in terminal state: ${routing.status}`
        log.debug('Skipping recovery for routing in terminal state', {
          routingId: routing.id,
          status: routing.status,
        })
        return detail
      }

      log.info('Recovering routing', {
        routingId: routing.id,
        taskId: routing.taskId,
        currentAgentIndex: routing.currentAgentIndex,
        iteration: routing.iteration,
      })

      // Resume the routing
      await routingService.resume(routing.id)

      detail.status = 'recovered'
      return detail
    } catch (error) {
      detail.status = 'failed'
      detail.reason = error instanceof Error ? error.message : String(error)

      log.error('Failed to recover routing', {
        routingId: routing.id,
        taskId: routing.taskId,
        error: detail.reason,
      })

      return detail
    }
  },

  /**
   * Manually trigger recovery for a specific task
   */
  async recoverTask(taskId: string): Promise<RecoveryDetail | null> {
    const routing = routingService.getByTaskId(taskId)

    if (!routing) {
      return null
    }

    return this.recoverSingle(routing)
  },
}
