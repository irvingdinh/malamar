/**
 * Routing Module - Types
 *
 * Type definitions for task routing state management.
 */

export type RoutingStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface TaskRouting {
  id: string
  taskId: string
  status: RoutingStatus
  currentAgentIndex: number
  iteration: number
  anyAgentWorked: boolean
  lockedAt: number | null
  errorMessage: string | null
  retryCount: number
  createdAt: number
  updatedAt: number
}

export interface CreateRoutingInput {
  taskId: string
}

export interface UpdateRoutingInput {
  status?: RoutingStatus
  currentAgentIndex?: number
  iteration?: number
  anyAgentWorked?: boolean
  lockedAt?: number | null
  errorMessage?: string | null
  retryCount?: number
}

// Database row type (snake_case)
export interface TaskRoutingRow {
  id: string
  task_id: string
  status: string
  current_agent_index: number
  iteration: number
  any_agent_worked: number
  locked_at: number | null
  error_message: string | null
  retry_count: number
  created_at: number
  updated_at: number
}

// List filters
export interface RoutingListFilters {
  status?: RoutingStatus
  taskId?: string
}
