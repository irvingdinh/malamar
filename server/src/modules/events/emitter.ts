/**
 * Events Module - Emitter
 *
 * In-memory event emitter for broadcasting events to SSE subscribers.
 */

import { now } from '../core'
import type {
  AppEvent,
  EventSubscriber,
  ExecutionLogSubscriber,
  ExecutionLogPayload,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskDeletedPayload,
  TaskCommentAddedPayload,
  ExecutionCreatedPayload,
  ExecutionUpdatedPayload,
  RoutingUpdatedPayload,
} from './types'

// Global subscribers for all events
const subscribers = new Set<EventSubscriber>()

// Execution-specific log subscribers (executionId -> Set of subscribers)
const executionLogSubscribers = new Map<string, Set<ExecutionLogSubscriber>>()

// Type map for event types to their payloads
interface EventPayloadMap {
  'task:created': TaskCreatedPayload
  'task:updated': TaskUpdatedPayload
  'task:deleted': TaskDeletedPayload
  'task:comment:added': TaskCommentAddedPayload
  'execution:created': ExecutionCreatedPayload
  'execution:updated': ExecutionUpdatedPayload
  'execution:log': ExecutionLogPayload
  'routing:updated': RoutingUpdatedPayload
}

/**
 * Event emitter for broadcasting events to all subscribers
 */
export const eventEmitter = {
  /**
   * Subscribe to all events
   * Returns an unsubscribe function
   */
  subscribe(callback: EventSubscriber): () => void {
    subscribers.add(callback)
    return () => {
      subscribers.delete(callback)
    }
  },

  /**
   * Subscribe to logs for a specific execution
   * Returns an unsubscribe function
   */
  subscribeToExecutionLogs(
    executionId: string,
    callback: ExecutionLogSubscriber
  ): () => void {
    if (!executionLogSubscribers.has(executionId)) {
      executionLogSubscribers.set(executionId, new Set())
    }
    executionLogSubscribers.get(executionId)!.add(callback)
    return () => {
      const subs = executionLogSubscribers.get(executionId)
      if (subs) {
        subs.delete(callback)
        if (subs.size === 0) {
          executionLogSubscribers.delete(executionId)
        }
      }
    }
  },

  /**
   * Emit an event to all subscribers
   */
  emit<T extends keyof EventPayloadMap>(
    type: T,
    payload: EventPayloadMap[T]
  ): void {
    const event = {
      type,
      payload,
      timestamp: now(),
    } as AppEvent

    // Broadcast to all general subscribers
    for (const subscriber of subscribers) {
      try {
        subscriber(event)
      } catch {
        // Ignore errors from subscribers to prevent cascade failures
      }
    }

    // If this is an execution log event, also broadcast to execution-specific subscribers
    if (type === 'execution:log') {
      const logPayload = payload as ExecutionLogPayload
      const subs = executionLogSubscribers.get(logPayload.executionId)
      if (subs) {
        for (const subscriber of subs) {
          try {
            subscriber(logPayload)
          } catch {
            // Ignore errors from subscribers
          }
        }
      }
    }
  },

  /**
   * Get the number of active subscribers
   */
  getSubscriberCount(): number {
    return subscribers.size
  },

  /**
   * Get the number of execution log subscribers for a specific execution
   */
  getExecutionLogSubscriberCount(executionId: string): number {
    return executionLogSubscribers.get(executionId)?.size ?? 0
  },

  /**
   * Clear all subscribers (useful for testing)
   */
  clear(): void {
    subscribers.clear()
    executionLogSubscribers.clear()
  },
}

// Convenience functions for emitting specific event types
export function emitTaskCreated(payload: TaskCreatedPayload): void {
  eventEmitter.emit('task:created', payload)
}

export function emitTaskUpdated(payload: TaskUpdatedPayload): void {
  eventEmitter.emit('task:updated', payload)
}

export function emitTaskDeleted(payload: TaskDeletedPayload): void {
  eventEmitter.emit('task:deleted', payload)
}

export function emitTaskCommentAdded(payload: TaskCommentAddedPayload): void {
  eventEmitter.emit('task:comment:added', payload)
}

export function emitExecutionCreated(payload: ExecutionCreatedPayload): void {
  eventEmitter.emit('execution:created', payload)
}

export function emitExecutionUpdated(payload: ExecutionUpdatedPayload): void {
  eventEmitter.emit('execution:updated', payload)
}

export function emitExecutionLog(payload: ExecutionLogPayload): void {
  eventEmitter.emit('execution:log', payload)
}

export function emitRoutingUpdated(payload: RoutingUpdatedPayload): void {
  eventEmitter.emit('routing:updated', payload)
}
