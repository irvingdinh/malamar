/**
 * Events Module - Types
 *
 * Type definitions for the event system and SSE streaming.
 */

// Event types for different domain events
export type EventType =
  // Task events
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:comment:added'
  // Execution events
  | 'execution:created'
  | 'execution:updated'
  | 'execution:log'
  // Routing events
  | 'routing:updated'

// Base event structure
export interface BaseEvent<T extends EventType, P> {
  type: T
  payload: P
  timestamp: number
}

// Task event payloads
export interface TaskCreatedPayload {
  id: string
  workspaceId: string
  name: string
  status: string
}

export interface TaskUpdatedPayload {
  id: string
  workspaceId: string
  changes: Record<string, unknown>
}

export interface TaskDeletedPayload {
  id: string
  workspaceId: string
}

export interface TaskCommentAddedPayload {
  taskId: string
  commentId: string
  author: string
  authorType: 'human' | 'agent' | 'system'
}

// Execution event payloads
export interface ExecutionCreatedPayload {
  id: string
  taskId: string
  agentId: string
  agentName: string
  status: string
}

export interface ExecutionUpdatedPayload {
  id: string
  taskId: string
  status: string
  result?: string | null
}

export interface ExecutionLogPayload {
  executionId: string
  content: string
  timestamp: number
}

// Routing event payloads
export interface RoutingUpdatedPayload {
  taskId: string
  status: string
  currentAgentIndex: number
  iteration: number
}

// Event union type for all events
export type TaskCreatedEvent = BaseEvent<'task:created', TaskCreatedPayload>
export type TaskUpdatedEvent = BaseEvent<'task:updated', TaskUpdatedPayload>
export type TaskDeletedEvent = BaseEvent<'task:deleted', TaskDeletedPayload>
export type TaskCommentAddedEvent = BaseEvent<'task:comment:added', TaskCommentAddedPayload>
export type ExecutionCreatedEvent = BaseEvent<'execution:created', ExecutionCreatedPayload>
export type ExecutionUpdatedEvent = BaseEvent<'execution:updated', ExecutionUpdatedPayload>
export type ExecutionLogEvent = BaseEvent<'execution:log', ExecutionLogPayload>
export type RoutingUpdatedEvent = BaseEvent<'routing:updated', RoutingUpdatedPayload>

export type AppEvent =
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskDeletedEvent
  | TaskCommentAddedEvent
  | ExecutionCreatedEvent
  | ExecutionUpdatedEvent
  | ExecutionLogEvent
  | RoutingUpdatedEvent

// SSE message format
export interface SSEMessage {
  id?: string
  event?: string
  data: string
  retry?: number
}

// Subscriber callback type
export type EventSubscriber = (event: AppEvent) => void

// Execution log subscriber (for streaming logs to specific execution)
export type ExecutionLogSubscriber = (log: ExecutionLogPayload) => void
