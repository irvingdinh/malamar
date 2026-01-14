/**
 * Executions Module - Repository
 *
 * Database operations for executions and execution logs.
 */

import { getDb, generateId, now } from '../core'
import type {
  Execution,
  ExecutionRow,
  ExecutionStatus,
  ExecutionResult,
  CreateExecutionInput,
  UpdateExecutionInput,
  ExecutionListFilters,
  ExecutionLog,
  ExecutionLogRow,
} from './types'

// Helper to convert database row to Execution
function rowToExecution(row: ExecutionRow): Execution {
  return {
    id: row.id,
    taskId: row.task_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    cliType: row.cli_type,
    status: row.status as ExecutionStatus,
    result: row.result as ExecutionResult,
    output: row.output,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Helper to convert database row to ExecutionLog
function rowToExecutionLog(row: ExecutionLogRow): ExecutionLog {
  return {
    id: row.id,
    executionId: row.execution_id,
    content: row.content,
    timestamp: row.timestamp,
  }
}

export const executionRepository = {
  /**
   * Find all executions with optional filters
   */
  findAll(filters?: ExecutionListFilters): Execution[] {
    const db = getDb()
    let sql = 'SELECT * FROM executions WHERE 1=1'
    const params: (string | number)[] = []

    if (filters?.taskId) {
      sql += ' AND task_id = ?'
      params.push(filters.taskId)
    }

    if (filters?.status) {
      sql += ' AND status = ?'
      params.push(filters.status)
    }

    sql += ' ORDER BY created_at DESC'

    if (filters?.limit !== undefined) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
      if (filters?.page !== undefined && filters.page > 1) {
        sql += ' OFFSET ?'
        params.push((filters.page - 1) * filters.limit)
      }
    }

    const rows = db.query<ExecutionRow, (string | number)[]>(sql).all(...params)
    return rows.map(rowToExecution)
  },

  /**
   * Count executions with optional filters
   */
  count(filters?: ExecutionListFilters): number {
    const db = getDb()
    let sql = 'SELECT COUNT(*) as count FROM executions WHERE 1=1'
    const params: (string | number)[] = []

    if (filters?.taskId) {
      sql += ' AND task_id = ?'
      params.push(filters.taskId)
    }

    if (filters?.status) {
      sql += ' AND status = ?'
      params.push(filters.status)
    }

    const result = db
      .query<{ count: number }, (string | number)[]>(sql)
      .get(...params)
    return result?.count ?? 0
  },

  /**
   * Find an execution by ID
   */
  findById(id: string): Execution | null {
    const db = getDb()
    const row = db
      .query<ExecutionRow, [string]>('SELECT * FROM executions WHERE id = ?')
      .get(id)
    return row ? rowToExecution(row) : null
  },

  /**
   * Find all executions for a task
   */
  findByTaskId(taskId: string): Execution[] {
    const db = getDb()
    const rows = db
      .query<ExecutionRow, [string]>(
        'SELECT * FROM executions WHERE task_id = ? ORDER BY created_at DESC'
      )
      .all(taskId)
    return rows.map(rowToExecution)
  },

  /**
   * Create a new execution
   */
  create(data: CreateExecutionInput): Execution {
    const db = getDb()
    const id = generateId()
    const timestamp = now()

    db.run(
      `INSERT INTO executions (id, task_id, agent_id, agent_name, cli_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.taskId,
        data.agentId,
        data.agentName,
        data.cliType ?? 'claude',
        'pending',
        timestamp,
        timestamp,
      ]
    )

    return {
      id,
      taskId: data.taskId,
      agentId: data.agentId,
      agentName: data.agentName,
      cliType: data.cliType ?? 'claude',
      status: 'pending',
      result: null,
      output: null,
      startedAt: null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },

  /**
   * Update an execution
   */
  update(id: string, data: UpdateExecutionInput): Execution | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const timestamp = now()
    const status = data.status ?? existing.status
    const result = data.result !== undefined ? data.result : existing.result
    const output = data.output !== undefined ? data.output : existing.output
    const startedAt =
      data.startedAt !== undefined ? data.startedAt : existing.startedAt
    const completedAt =
      data.completedAt !== undefined ? data.completedAt : existing.completedAt

    db.run(
      `UPDATE executions SET status = ?, result = ?, output = ?, started_at = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
      [status, result, output, startedAt, completedAt, timestamp, id]
    )

    return {
      ...existing,
      status,
      result,
      output,
      startedAt,
      completedAt,
      updatedAt: timestamp,
    }
  },

  /**
   * Delete an execution (logs cascade via FK)
   */
  delete(id: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM executions WHERE id = ?', [id])
    return result.changes > 0
  },

  /**
   * Find executions by status (for recovery)
   */
  findByStatus(status: ExecutionStatus): Execution[] {
    const db = getDb()
    const rows = db
      .query<ExecutionRow, [string]>(
        'SELECT * FROM executions WHERE status = ? ORDER BY created_at ASC'
      )
      .all(status)
    return rows.map(rowToExecution)
  },

  /**
   * Get analytics data for agents
   */
  getAgentAnalytics(): {
    agentId: string
    agentName: string
    total: number
    completed: number
    failed: number
    avgDuration: number | null
  }[] {
    const db = getDb()
    const rows = db
      .query<
        {
          agent_id: string
          agent_name: string
          total: number
          completed: number
          failed: number
          avg_duration: number | null
        },
        []
      >(
        `SELECT
          agent_id,
          agent_name,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
              THEN completed_at - started_at ELSE NULL END) as avg_duration
        FROM executions
        GROUP BY agent_id, agent_name
        ORDER BY total DESC`
      )
      .all()

    return rows.map((row) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      total: row.total,
      completed: row.completed,
      failed: row.failed,
      avgDuration: row.avg_duration,
    }))
  },
}

export const executionLogRepository = {
  /**
   * Find all logs for an execution
   */
  findByExecutionId(executionId: string): ExecutionLog[] {
    const db = getDb()
    const rows = db
      .query<ExecutionLogRow, [string]>(
        'SELECT * FROM execution_logs WHERE execution_id = ? ORDER BY timestamp ASC'
      )
      .all(executionId)
    return rows.map(rowToExecutionLog)
  },

  /**
   * Append a log entry to an execution
   */
  append(executionId: string, content: string): ExecutionLog {
    const db = getDb()
    const id = generateId()
    const timestamp = now()

    db.run(
      `INSERT INTO execution_logs (id, execution_id, content, timestamp) VALUES (?, ?, ?, ?)`,
      [id, executionId, content, timestamp]
    )

    return {
      id,
      executionId,
      content,
      timestamp,
    }
  },

  /**
   * Delete all logs for an execution
   */
  deleteByExecutionId(executionId: string): number {
    const db = getDb()
    const result = db.run('DELETE FROM execution_logs WHERE execution_id = ?', [
      executionId,
    ])
    return result.changes
  },

  /**
   * Get latest log entries for an execution
   */
  getLatest(executionId: string, limit: number = 100): ExecutionLog[] {
    const db = getDb()
    const rows = db
      .query<ExecutionLogRow, [string, number]>(
        'SELECT * FROM execution_logs WHERE execution_id = ? ORDER BY timestamp DESC LIMIT ?'
      )
      .all(executionId, limit)
    return rows.map(rowToExecutionLog).reverse()
  },
}
