/**
 * Routing Module - Repository
 *
 * Database operations for task routing state management.
 */

import { getDb, generateId, now } from '../core'
import type {
  TaskRouting,
  TaskRoutingRow,
  RoutingStatus,
  CreateRoutingInput,
  UpdateRoutingInput,
  RoutingListFilters,
} from './types'

// Helper to convert database row to TaskRouting
function rowToRouting(row: TaskRoutingRow): TaskRouting {
  return {
    id: row.id,
    taskId: row.task_id,
    status: row.status as RoutingStatus,
    currentAgentIndex: row.current_agent_index,
    iteration: row.iteration,
    anyAgentWorked: row.any_agent_worked === 1,
    lockedAt: row.locked_at,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const routingRepository = {
  /**
   * Find routing by task ID
   */
  findByTaskId(taskId: string): TaskRouting | null {
    const db = getDb()
    const row = db
      .query<TaskRoutingRow, [string]>(
        'SELECT * FROM task_routings WHERE task_id = ?'
      )
      .get(taskId)
    return row ? rowToRouting(row) : null
  },

  /**
   * Find routing by ID
   */
  findById(id: string): TaskRouting | null {
    const db = getDb()
    const row = db
      .query<TaskRoutingRow, [string]>(
        'SELECT * FROM task_routings WHERE id = ?'
      )
      .get(id)
    return row ? rowToRouting(row) : null
  },

  /**
   * Find routings by status
   */
  findByStatus(status: RoutingStatus): TaskRouting[] {
    const db = getDb()
    const rows = db
      .query<TaskRoutingRow, [string]>(
        'SELECT * FROM task_routings WHERE status = ? ORDER BY created_at ASC'
      )
      .all(status)
    return rows.map(rowToRouting)
  },

  /**
   * Find all pending or running routings (for recovery)
   */
  findPending(): TaskRouting[] {
    const db = getDb()
    const rows = db
      .query<TaskRoutingRow, []>(
        `SELECT * FROM task_routings
         WHERE status IN ('pending', 'running')
         ORDER BY created_at ASC`
      )
      .all()
    return rows.map(rowToRouting)
  },

  /**
   * Find all routings with optional filters
   */
  findAll(filters?: RoutingListFilters): TaskRouting[] {
    const db = getDb()
    let sql = 'SELECT * FROM task_routings WHERE 1=1'
    const params: (string | number)[] = []

    if (filters?.status) {
      sql += ' AND status = ?'
      params.push(filters.status)
    }

    if (filters?.taskId) {
      sql += ' AND task_id = ?'
      params.push(filters.taskId)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.query<TaskRoutingRow, (string | number)[]>(sql).all(...params)
    return rows.map(rowToRouting)
  },

  /**
   * Create a new routing state for a task
   */
  create(data: CreateRoutingInput): TaskRouting {
    const db = getDb()
    const id = generateId()
    const timestamp = now()

    db.run(
      `INSERT INTO task_routings
       (id, task_id, status, current_agent_index, iteration, any_agent_worked, retry_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.taskId, 'pending', 0, 0, 0, 0, timestamp, timestamp]
    )

    return {
      id,
      taskId: data.taskId,
      status: 'pending',
      currentAgentIndex: 0,
      iteration: 0,
      anyAgentWorked: false,
      lockedAt: null,
      errorMessage: null,
      retryCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },

  /**
   * Update a routing state
   */
  update(id: string, data: UpdateRoutingInput): TaskRouting | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const timestamp = now()
    const status = data.status ?? existing.status
    const currentAgentIndex =
      data.currentAgentIndex !== undefined
        ? data.currentAgentIndex
        : existing.currentAgentIndex
    const iteration = data.iteration !== undefined ? data.iteration : existing.iteration
    const anyAgentWorked =
      data.anyAgentWorked !== undefined ? data.anyAgentWorked : existing.anyAgentWorked
    const lockedAt = data.lockedAt !== undefined ? data.lockedAt : existing.lockedAt
    const errorMessage =
      data.errorMessage !== undefined ? data.errorMessage : existing.errorMessage
    const retryCount =
      data.retryCount !== undefined ? data.retryCount : existing.retryCount

    db.run(
      `UPDATE task_routings
       SET status = ?, current_agent_index = ?, iteration = ?, any_agent_worked = ?,
           locked_at = ?, error_message = ?, retry_count = ?, updated_at = ?
       WHERE id = ?`,
      [
        status,
        currentAgentIndex,
        iteration,
        anyAgentWorked ? 1 : 0,
        lockedAt,
        errorMessage,
        retryCount,
        timestamp,
        id,
      ]
    )

    return {
      ...existing,
      status,
      currentAgentIndex,
      iteration,
      anyAgentWorked,
      lockedAt,
      errorMessage,
      retryCount,
      updatedAt: timestamp,
    }
  },

  /**
   * Update a routing state by task ID
   */
  updateByTaskId(taskId: string, data: UpdateRoutingInput): TaskRouting | null {
    const existing = this.findByTaskId(taskId)
    if (!existing) {
      return null
    }
    return this.update(existing.id, data)
  },

  /**
   * Delete a routing state
   */
  delete(id: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM task_routings WHERE id = ?', [id])
    return result.changes > 0
  },

  /**
   * Delete routing by task ID
   */
  deleteByTaskId(taskId: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM task_routings WHERE task_id = ?', [taskId])
    return result.changes > 0
  },

  /**
   * Lock a routing for processing (prevents concurrent access)
   * Returns true if lock was acquired, false if already locked
   */
  lock(id: string): boolean {
    const db = getDb()
    const timestamp = now()
    const existing = this.findById(id)

    if (!existing) {
      return false
    }

    // Check if already locked (within last 5 minutes to handle stale locks)
    if (existing.lockedAt && timestamp - existing.lockedAt < 5 * 60 * 1000) {
      return false
    }

    db.run(
      'UPDATE task_routings SET locked_at = ?, updated_at = ? WHERE id = ?',
      [timestamp, timestamp, id]
    )

    return true
  },

  /**
   * Unlock a routing after processing
   */
  unlock(id: string): boolean {
    const db = getDb()
    const timestamp = now()
    const result = db.run(
      'UPDATE task_routings SET locked_at = NULL, updated_at = ? WHERE id = ?',
      [timestamp, id]
    )
    return result.changes > 0
  },

  /**
   * Increment retry count
   */
  incrementRetryCount(id: string): TaskRouting | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }
    return this.update(id, { retryCount: existing.retryCount + 1 })
  },

  /**
   * Reset retry count
   */
  resetRetryCount(id: string): TaskRouting | null {
    return this.update(id, { retryCount: 0 })
  },

  /**
   * Advance to next agent
   */
  advanceToNextAgent(id: string): TaskRouting | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }
    return this.update(id, {
      currentAgentIndex: existing.currentAgentIndex + 1,
      retryCount: 0,
    })
  },

  /**
   * Start new iteration (reset agent index, increment iteration)
   */
  startNewIteration(id: string): TaskRouting | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }
    return this.update(id, {
      currentAgentIndex: 0,
      iteration: existing.iteration + 1,
      anyAgentWorked: false,
      retryCount: 0,
    })
  },

  /**
   * Mark that an agent worked in this iteration
   */
  markAgentWorked(id: string): TaskRouting | null {
    return this.update(id, { anyAgentWorked: true })
  },
}
