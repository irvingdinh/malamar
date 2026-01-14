/**
 * Events Module
 *
 * Real-time event streaming via SSE for UI updates.
 */

// Routes
export { events } from './routes'

// Emitter
export {
  eventEmitter,
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted,
  emitTaskCommentAdded,
  emitExecutionCreated,
  emitExecutionUpdated,
  emitExecutionLog,
  emitRoutingUpdated,
} from './emitter'

// Types
export type {
  EventType,
  AppEvent,
  BaseEvent,
  SSEMessage,
  EventSubscriber,
  ExecutionLogSubscriber,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskDeletedPayload,
  TaskCommentAddedPayload,
  ExecutionCreatedPayload,
  ExecutionUpdatedPayload,
  ExecutionLogPayload,
  RoutingUpdatedPayload,
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  TaskCommentAddedEvent,
  ExecutionCreatedEvent,
  ExecutionUpdatedEvent,
  ExecutionLogEvent,
  RoutingUpdatedEvent,
} from './types'
