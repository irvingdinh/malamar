/**
 * Executions Module - Service
 *
 * Business logic for execution operations.
 */

import { NotFoundError, ValidationError, now } from '../core'
import { taskRepository } from '../tasks/repository'
import { agentRepository } from '../agents/repository'
import { executionRepository, executionLogRepository } from './repository'
import type {
  Execution,
  ExecutionWithLogs,
  ExecutionStatus,
  ExecutionResult,
  CreateExecutionInput,
  ExecutionListFilters,
  ExecutionLog,
  AgentAnalytics,
} from './types'

// Valid execution status transitions
const validTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
  pending: ['running', 'failed'],
  running: ['completed', 'failed'],
  completed: [], // Terminal state
  failed: [], // Terminal state
}

function isValidStatusTransition(
  from: ExecutionStatus,
  to: ExecutionStatus
): boolean {
  if (from === to) return true
  return validTransitions[from]?.includes(to) ?? false
}

export const executionService = {
  /**
   * List all executions with optional filters
   */
  list(
    filters?: ExecutionListFilters
  ): { executions: Execution[]; total: number } {
    const executions = executionRepository.findAll(filters)
    const total = executionRepository.count(filters)

    return { executions, total }
  },

  /**
   * Get an execution by ID with optional logs
   */
  get(id: string, includeLogs: boolean = false): ExecutionWithLogs {
    const execution = executionRepository.findById(id)
    if (!execution) {
      throw new NotFoundError(`Execution not found: ${id}`)
    }

    if (includeLogs) {
      const logs = executionLogRepository.findByExecutionId(id)
      return { ...execution, logs }
    }

    return execution
  },

  /**
   * Get all executions for a task
   */
  getByTask(taskId: string): Execution[] {
    // Verify task exists
    const task = taskRepository.findById(taskId)
    if (!task) {
      throw new NotFoundError(`Task not found: ${taskId}`)
    }

    return executionRepository.findByTaskId(taskId)
  },

  /**
   * Create a new execution
   */
  create(data: CreateExecutionInput): Execution {
    // Validate required fields
    if (!data.taskId) {
      throw new ValidationError('Task ID is required', {
        taskId: 'Task ID is required',
      })
    }
    if (!data.agentId) {
      throw new ValidationError('Agent ID is required', {
        agentId: 'Agent ID is required',
      })
    }
    if (!data.agentName) {
      throw new ValidationError('Agent name is required', {
        agentName: 'Agent name is required',
      })
    }

    // Verify task exists
    const task = taskRepository.findById(data.taskId)
    if (!task) {
      throw new NotFoundError(`Task not found: ${data.taskId}`)
    }

    // Verify agent exists
    const agent = agentRepository.findById(data.agentId)
    if (!agent) {
      throw new NotFoundError(`Agent not found: ${data.agentId}`)
    }

    // Verify task and agent belong to same workspace
    if (task.workspaceId !== agent.workspaceId) {
      throw new ValidationError('Task and agent must be in the same workspace')
    }

    return executionRepository.create(data)
  },

  /**
   * Start an execution (set status to running)
   */
  start(id: string): Execution {
    const execution = executionRepository.findById(id)
    if (!execution) {
      throw new NotFoundError(`Execution not found: ${id}`)
    }

    if (!isValidStatusTransition(execution.status, 'running')) {
      throw new ValidationError(
        `Cannot start execution in ${execution.status} status`,
        { status: 'Invalid status transition' }
      )
    }

    const updated = executionRepository.update(id, {
      status: 'running',
      startedAt: now(),
    })

    return updated!
  },

  /**
   * Complete an execution successfully
   */
  complete(
    id: string,
    result: ExecutionResult,
    output?: string | null
  ): Execution {
    const execution = executionRepository.findById(id)
    if (!execution) {
      throw new NotFoundError(`Execution not found: ${id}`)
    }

    if (!isValidStatusTransition(execution.status, 'completed')) {
      throw new ValidationError(
        `Cannot complete execution in ${execution.status} status`,
        { status: 'Invalid status transition' }
      )
    }

    const updated = executionRepository.update(id, {
      status: 'completed',
      result,
      output: output ?? null,
      completedAt: now(),
    })

    return updated!
  },

  /**
   * Mark an execution as failed
   */
  fail(id: string, error?: string): Execution {
    const execution = executionRepository.findById(id)
    if (!execution) {
      throw new NotFoundError(`Execution not found: ${id}`)
    }

    if (!isValidStatusTransition(execution.status, 'failed')) {
      throw new ValidationError(
        `Cannot fail execution in ${execution.status} status`,
        { status: 'Invalid status transition' }
      )
    }

    const updated = executionRepository.update(id, {
      status: 'failed',
      result: 'error',
      output: error ?? null,
      completedAt: now(),
    })

    return updated!
  },

  /**
   * Append a log entry to an execution
   */
  appendLog(executionId: string, content: string): ExecutionLog {
    const execution = executionRepository.findById(executionId)
    if (!execution) {
      throw new NotFoundError(`Execution not found: ${executionId}`)
    }

    return executionLogRepository.append(executionId, content)
  },

  /**
   * Get logs for an execution
   */
  getLogs(executionId: string): ExecutionLog[] {
    const execution = executionRepository.findById(executionId)
    if (!execution) {
      throw new NotFoundError(`Execution not found: ${executionId}`)
    }

    return executionLogRepository.findByExecutionId(executionId)
  },

  /**
   * Get agent analytics (success rates, durations, etc.)
   */
  analytics(): AgentAnalytics[] {
    const rawAnalytics = executionRepository.getAgentAnalytics()

    return rawAnalytics.map((row) => ({
      agentId: row.agentId,
      agentName: row.agentName,
      totalExecutions: row.total,
      completedExecutions: row.completed,
      failedExecutions: row.failed,
      successRate: row.total > 0 ? (row.completed / row.total) * 100 : 0,
      avgDurationMs: row.avgDuration,
    }))
  },

  /**
   * Delete an execution and its logs
   */
  delete(id: string): void {
    const execution = executionRepository.findById(id)
    if (!execution) {
      throw new NotFoundError(`Execution not found: ${id}`)
    }

    // Logs cascade via FK, no need to delete separately
    executionRepository.delete(id)
  },
}
