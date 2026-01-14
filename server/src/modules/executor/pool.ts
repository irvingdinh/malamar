/**
 * Executor Module - Concurrency Pool
 *
 * Semaphore implementation for limiting concurrent executions.
 */

import type { PoolStats } from './types'

/**
 * A simple semaphore for controlling concurrent access to resources.
 * Used to limit the number of concurrent CLI executions.
 */
class ConcurrencyPool {
  private maxConcurrent: number | null
  private currentCount: number = 0
  private waitQueue: Array<() => void> = []

  /**
   * Create a new concurrency pool.
   * @param maxConcurrent Maximum concurrent acquisitions. null = unlimited.
   */
  constructor(maxConcurrent: number | null = null) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * Update the maximum concurrent limit.
   * Note: This does not affect already acquired slots.
   */
  setMaxConcurrent(max: number | null): void {
    this.maxConcurrent = max
    // Try to release waiting tasks if we now have capacity
    this.processWaitQueue()
  }

  /**
   * Get the current maximum concurrent limit.
   */
  getMaxConcurrent(): number | null {
    return this.maxConcurrent
  }

  /**
   * Acquire a slot from the pool.
   * If the pool is at capacity, this will wait until a slot is available.
   * Returns a release function that must be called when done.
   */
  async acquire(): Promise<() => void> {
    // If unlimited or under capacity, acquire immediately
    if (this.maxConcurrent === null || this.currentCount < this.maxConcurrent) {
      this.currentCount++
      return this.createReleaseFunction()
    }

    // Wait for a slot to become available
    return new Promise<() => void>((resolve) => {
      this.waitQueue.push(() => {
        this.currentCount++
        resolve(this.createReleaseFunction())
      })
    })
  }

  /**
   * Try to acquire a slot without waiting.
   * Returns a release function if successful, null if pool is at capacity.
   */
  tryAcquire(): (() => void) | null {
    // If unlimited or under capacity, acquire immediately
    if (this.maxConcurrent === null || this.currentCount < this.maxConcurrent) {
      this.currentCount++
      return this.createReleaseFunction()
    }

    return null
  }

  /**
   * Get current pool statistics.
   */
  getStats(): PoolStats {
    return {
      current: this.currentCount,
      max: this.maxConcurrent,
      available: this.maxConcurrent !== null
        ? Math.max(0, this.maxConcurrent - this.currentCount)
        : null,
    }
  }

  /**
   * Get the number of tasks waiting for a slot.
   */
  getWaitingCount(): number {
    return this.waitQueue.length
  }

  /**
   * Create a release function for an acquired slot.
   */
  private createReleaseFunction(): () => void {
    let released = false
    return () => {
      if (released) return // Prevent double-release
      released = true
      this.currentCount--
      this.processWaitQueue()
    }
  }

  /**
   * Process the wait queue and release waiting tasks if capacity allows.
   */
  private processWaitQueue(): void {
    while (
      this.waitQueue.length > 0 &&
      (this.maxConcurrent === null || this.currentCount < this.maxConcurrent)
    ) {
      const next = this.waitQueue.shift()
      if (next) {
        next()
      }
    }
  }
}

// Singleton instance
let poolInstance: ConcurrencyPool | null = null

/**
 * Initialize the concurrency pool with the given maximum.
 */
export function initPool(maxConcurrent: number | null): void {
  poolInstance = new ConcurrencyPool(maxConcurrent)
}

/**
 * Get the concurrency pool instance.
 * Throws if not initialized.
 */
export function getPool(): ConcurrencyPool {
  if (!poolInstance) {
    // Initialize with unlimited if not explicitly initialized
    poolInstance = new ConcurrencyPool(null)
  }
  return poolInstance
}

/**
 * Export the pool class for testing
 */
export { ConcurrencyPool }
