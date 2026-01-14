/**
 * Executions Module - Types
 *
 * Type definitions for execution tracking and logs.
 */

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed'

export type ExecutionResult = 'skip' | 'comment' | 'error' | null

export interface Execution {
  id: string
  taskId: string
  agentId: string
  agentName: string
  cliType: string
  status: ExecutionStatus
  result: ExecutionResult
  output: string | null
  startedAt: number | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateExecutionInput {
  taskId: string
  agentId: string
  agentName: string
  cliType?: string
}

export interface UpdateExecutionInput {
  status?: ExecutionStatus
  result?: ExecutionResult
  output?: string | null
  startedAt?: number | null
  completedAt?: number | null
}

// Database row type (snake_case)
export interface ExecutionRow {
  id: string
  task_id: string
  agent_id: string
  agent_name: string
  cli_type: string
  status: string
  result: string | null
  output: string | null
  started_at: number | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

// Execution log types
export interface ExecutionLog {
  id: string
  executionId: string
  content: string
  timestamp: number
}

// Database row type for execution logs
export interface ExecutionLogRow {
  id: string
  execution_id: string
  content: string
  timestamp: number
}

// Execution with logs
export interface ExecutionWithLogs extends Execution {
  logs?: ExecutionLog[]
}

// List filters
export interface ExecutionListFilters {
  taskId?: string
  status?: ExecutionStatus
  page?: number
  limit?: number
}

// Analytics types
export interface AgentAnalytics {
  agentId: string
  agentName: string
  totalExecutions: number
  completedExecutions: number
  failedExecutions: number
  successRate: number
  avgDurationMs: number | null
}
