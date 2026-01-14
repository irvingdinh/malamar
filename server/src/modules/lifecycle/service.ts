/**
 * Lifecycle Module - Service
 *
 * Handles server lifecycle events including graceful shutdown.
 */

import { log, closeDatabase } from '../core'
import { executorService } from '../executor/service'
import { setLifecycleChecker } from '../routing/service'

// Maximum time to wait for in-flight executions during shutdown (30 seconds)
const SHUTDOWN_TIMEOUT_MS = 30000

// Poll interval to check if executions are complete (1 second)
const SHUTDOWN_POLL_INTERVAL_MS = 1000

// Flag to indicate if shutdown is in progress
let isShuttingDown = false

// Flag to indicate if new routing triggers should be accepted
let acceptingNewRoutings = true

// Lifecycle service object (defined before initialization)
export const lifecycleService = {
  /**
   * Check if new routing triggers are being accepted
   */
  isAcceptingRoutings(): boolean {
    return acceptingNewRoutings
  },

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return isShuttingDown
  },

  /**
   * Stop accepting new routing triggers
   */
  stopAcceptingRoutings(): void {
    acceptingNewRoutings = false
    log.info('Stopped accepting new routing triggers')
  },

  /**
   * Resume accepting routing triggers
   */
  resumeAcceptingRoutings(): void {
    acceptingNewRoutings = true
    log.info('Resumed accepting routing triggers')
  },

  /**
   * Get count of running executions
   */
  getRunningCount(): number {
    return executorService.getRunningExecutions().length
  },

  /**
   * Wait for all in-flight executions to complete
   * Returns true if all completed, false if timed out
   */
  async waitForExecutions(timeoutMs: number = SHUTDOWN_TIMEOUT_MS): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const runningCount = this.getRunningCount()

      if (runningCount === 0) {
        log.info('All executions completed')
        return true
      }

      log.info('Waiting for executions to complete', {
        runningCount,
        remainingMs: timeoutMs - (Date.now() - startTime),
      })

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_POLL_INTERVAL_MS))
    }

    return false
  },

  /**
   * Force kill all running executions
   */
  forceKillAll(): number {
    const runningExecutions = executorService.getRunningExecutions()

    if (runningExecutions.length === 0) {
      return 0
    }

    log.warn('Force killing remaining executions', {
      count: runningExecutions.length,
    })

    let killed = 0
    for (const executionId of runningExecutions) {
      if (executorService.cancel(executionId)) {
        killed++
      }
    }

    return killed
  },

  /**
   * Perform graceful shutdown
   * 1. Stop accepting new routing triggers
   * 2. Wait up to 30 seconds for in-flight executions
   * 3. Force kill remaining processes
   * 4. Close database connection
   * 5. Exit with code 0
   */
  async gracefulShutdown(): Promise<void> {
    if (isShuttingDown) {
      log.warn('Shutdown already in progress')
      return
    }

    isShuttingDown = true
    log.info('Starting graceful shutdown...')

    // Step 1: Stop accepting new routing triggers
    this.stopAcceptingRoutings()

    // Step 2: Wait for in-flight executions
    const runningCount = this.getRunningCount()
    if (runningCount > 0) {
      log.info('Waiting for in-flight executions', { count: runningCount })
      const completed = await this.waitForExecutions()

      if (!completed) {
        // Step 3: Force kill remaining processes
        const killed = this.forceKillAll()
        log.warn('Forcefully killed remaining executions', { count: killed })
      }
    }

    // Step 4: Close database connection
    closeDatabase()

    // Step 5: Exit with code 0
    log.info('Shutdown complete')
    process.exit(0)
  },
}

// Register lifecycle checker with routing service to avoid circular dependency
setLifecycleChecker(lifecycleService)
