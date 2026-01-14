/**
 * Events Module - Routes
 *
 * SSE (Server-Sent Events) endpoints for real-time updates.
 */

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { eventEmitter } from './emitter'
import { executionLogRepository } from '../executions'
import { NotFoundError } from '../core'
import type { AppEvent, ExecutionLogPayload } from './types'

const events = new Hono()

// Keepalive interval in milliseconds
const KEEPALIVE_INTERVAL = 30000

/**
 * GET /api/events - General SSE endpoint for all events
 *
 * Streams events to connected clients in real-time.
 * Format: data: {"type":"...","payload":{...},"timestamp":...}\n\n
 */
events.get('/', (c) => {
  return streamSSE(c, async (stream) => {
    let isActive = true

    // Subscribe to all events
    const unsubscribe = eventEmitter.subscribe((event: AppEvent) => {
      if (!isActive) return
      try {
        stream.writeSSE({
          data: JSON.stringify(event),
        })
      } catch {
        // Stream closed, will be cleaned up
        isActive = false
      }
    })

    // Send keepalive every 30 seconds
    const keepaliveId = setInterval(() => {
      if (!isActive) {
        clearInterval(keepaliveId)
        return
      }
      try {
        stream.writeSSE({
          event: 'keepalive',
          data: JSON.stringify({ timestamp: Date.now() }),
        })
      } catch {
        isActive = false
        clearInterval(keepaliveId)
      }
    }, KEEPALIVE_INTERVAL)

    // Handle stream close
    stream.onAbort(() => {
      isActive = false
      clearInterval(keepaliveId)
      unsubscribe()
    })

    // Keep the stream open until aborted
    while (isActive) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Cleanup
    clearInterval(keepaliveId)
    unsubscribe()
  })
})

/**
 * GET /api/events/executions/:id/logs - Stream logs for a specific execution
 *
 * Streams existing logs first, then new logs as they arrive.
 * Stream closes when execution completes.
 */
events.get('/executions/:id/logs', async (c) => {
  const executionId = c.req.param('id')!

  // Import here to avoid circular dependency
  const { executionRepository } = await import('../executions')

  // Verify execution exists
  const execution = executionRepository.findById(executionId)
  if (!execution) {
    throw new NotFoundError(`Execution not found: ${executionId}`)
  }

  return streamSSE(c, async (stream) => {
    let isActive = true
    let lastLogTimestamp = 0

    // Send existing logs first
    const existingLogs = executionLogRepository.findByExecutionId(executionId)
    for (const log of existingLogs) {
      if (!isActive) break
      try {
        stream.writeSSE({
          event: 'log',
          data: JSON.stringify({
            content: log.content,
            timestamp: log.timestamp,
          }),
        })
        lastLogTimestamp = log.timestamp
      } catch {
        isActive = false
        break
      }
    }

    // If execution is already complete, close the stream
    if (execution.status === 'completed' || execution.status === 'failed') {
      stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({
          status: execution.status,
          result: execution.result,
        }),
      })
      return
    }

    // Subscribe to new logs
    const unsubscribe = eventEmitter.subscribeToExecutionLogs(
      executionId,
      (log: ExecutionLogPayload) => {
        if (!isActive) return
        // Only send logs newer than what we've already sent
        if (log.timestamp > lastLogTimestamp) {
          try {
            stream.writeSSE({
              event: 'log',
              data: JSON.stringify({
                content: log.content,
                timestamp: log.timestamp,
              }),
            })
            lastLogTimestamp = log.timestamp
          } catch {
            isActive = false
          }
        }
      }
    )

    // Subscribe to execution updates to detect completion
    const unsubscribeEvents = eventEmitter.subscribe((event: AppEvent) => {
      if (!isActive) return
      if (
        event.type === 'execution:updated' &&
        event.payload.id === executionId
      ) {
        const { status, result } = event.payload
        if (status === 'completed' || status === 'failed') {
          try {
            stream.writeSSE({
              event: 'complete',
              data: JSON.stringify({ status, result }),
            })
          } catch {
            // Ignore
          }
          isActive = false
        }
      }
    })

    // Keepalive
    const keepaliveId = setInterval(() => {
      if (!isActive) {
        clearInterval(keepaliveId)
        return
      }
      try {
        stream.writeSSE({
          event: 'keepalive',
          data: JSON.stringify({ timestamp: Date.now() }),
        })
      } catch {
        isActive = false
        clearInterval(keepaliveId)
      }
    }, KEEPALIVE_INTERVAL)

    // Handle stream close
    stream.onAbort(() => {
      isActive = false
      clearInterval(keepaliveId)
      unsubscribe()
      unsubscribeEvents()
    })

    // Keep the stream open until aborted or execution completes
    while (isActive) {
      // Check if execution has completed (polling backup)
      const currentExecution = executionRepository.findById(executionId)
      if (
        currentExecution &&
        (currentExecution.status === 'completed' ||
          currentExecution.status === 'failed')
      ) {
        try {
          stream.writeSSE({
            event: 'complete',
            data: JSON.stringify({
              status: currentExecution.status,
              result: currentExecution.result,
            }),
          })
        } catch {
          // Ignore
        }
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Cleanup
    clearInterval(keepaliveId)
    unsubscribe()
    unsubscribeEvents()
  })
})

export { events }
