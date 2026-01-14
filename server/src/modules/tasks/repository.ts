/**
 * Tasks Module - Repository
 *
 * Database operations for tasks.
 */

import { getDb, generateId, now } from '../core'
import type {
  Task,
  TaskRow,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListFilters,
} from './types'

// Helper to convert database row to Task
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const taskRepository = {
  /**
   * Find all tasks for a workspace with optional filters
   */
  findByWorkspaceId(workspaceId: string, filters?: TaskListFilters): Task[] {
    const db = getDb()
    let sql = 'SELECT * FROM tasks WHERE workspace_id = ?'
    const params: (string | number)[] = [workspaceId]

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

    const rows = db.query<TaskRow, (string | number)[]>(sql).all(...params)
    return rows.map(rowToTask)
  },

  /**
   * Count tasks for a workspace with optional status filter
   */
  countByWorkspaceId(workspaceId: string, status?: TaskStatus): number {
    const db = getDb()
    let sql = 'SELECT COUNT(*) as count FROM tasks WHERE workspace_id = ?'
    const params: string[] = [workspaceId]

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    const result = db.query<{ count: number }, string[]>(sql).get(...params)
    return result?.count ?? 0
  },

  /**
   * Find a task by ID
   */
  findById(id: string): Task | null {
    const db = getDb()
    const row = db
      .query<TaskRow, [string]>('SELECT * FROM tasks WHERE id = ?')
      .get(id)
    return row ? rowToTask(row) : null
  },

  /**
   * Create a new task
   */
  create(workspaceId: string, data: CreateTaskInput): Task {
    const db = getDb()
    const id = generateId()
    const timestamp = now()

    db.run(
      `INSERT INTO tasks (id, workspace_id, title, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workspaceId,
        data.title,
        data.description ?? null,
        'todo',
        timestamp,
        timestamp,
      ]
    )

    return {
      id,
      workspaceId,
      title: data.title,
      description: data.description ?? null,
      status: 'todo',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },

  /**
   * Update a task
   */
  update(id: string, data: UpdateTaskInput): Task | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const timestamp = now()
    const title = data.title ?? existing.title
    const description =
      data.description !== undefined ? data.description : existing.description
    const status = data.status ?? existing.status

    db.run(
      `UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`,
      [title, description, status, timestamp, id]
    )

    return {
      ...existing,
      title,
      description,
      status,
      updatedAt: timestamp,
    }
  },

  /**
   * Update only the status of a task
   */
  updateStatus(id: string, status: TaskStatus): Task | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const timestamp = now()

    db.run(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`, [
      status,
      timestamp,
      id,
    ])

    return {
      ...existing,
      status,
      updatedAt: timestamp,
    }
  },

  /**
   * Delete a task (comments, attachments cascade via FK)
   */
  delete(id: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM tasks WHERE id = ?', [id])
    return result.changes > 0
  },

  /**
   * Find tasks by status (for recovery)
   */
  findByStatus(status: TaskStatus): Task[] {
    const db = getDb()
    const rows = db
      .query<TaskRow, [string]>(
        'SELECT * FROM tasks WHERE status = ? ORDER BY created_at ASC'
      )
      .all(status)
    return rows.map(rowToTask)
  },
}
