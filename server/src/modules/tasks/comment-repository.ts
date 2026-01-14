/**
 * Tasks Module - Comment Repository
 *
 * Database operations for task comments.
 */

import { getDb, generateId, now } from '../core'
import type {
  Comment,
  CommentRow,
  CreateCommentInput,
  AuthorType,
} from './types'

// Helper to convert database row to Comment
function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    author: row.author,
    authorType: row.author_type as AuthorType,
    content: row.content,
    log: row.log,
    createdAt: row.created_at,
  }
}

export const commentRepository = {
  /**
   * Find all comments for a task ordered by created_at asc
   */
  findByTaskId(taskId: string): Comment[] {
    const db = getDb()
    const rows = db
      .query<CommentRow, [string]>(
        'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC'
      )
      .all(taskId)
    return rows.map(rowToComment)
  },

  /**
   * Find a comment by ID
   */
  findById(id: string): Comment | null {
    const db = getDb()
    const row = db
      .query<CommentRow, [string]>('SELECT * FROM comments WHERE id = ?')
      .get(id)
    return row ? rowToComment(row) : null
  },

  /**
   * Create a new comment
   */
  create(taskId: string, data: CreateCommentInput): Comment {
    const db = getDb()
    const id = generateId()
    const timestamp = now()

    db.run(
      `INSERT INTO comments (id, task_id, author, author_type, content, log, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        taskId,
        data.author,
        data.authorType,
        data.content,
        data.log ?? null,
        timestamp,
      ]
    )

    return {
      id,
      taskId,
      author: data.author,
      authorType: data.authorType,
      content: data.content,
      log: data.log ?? null,
      createdAt: timestamp,
    }
  },

  /**
   * Delete a comment
   */
  delete(id: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM comments WHERE id = ?', [id])
    return result.changes > 0
  },

  /**
   * Delete all comments for a task
   */
  deleteByTaskId(taskId: string): number {
    const db = getDb()
    const result = db.run('DELETE FROM comments WHERE task_id = ?', [taskId])
    return result.changes
  },

  /**
   * Count comments for a task
   */
  countByTaskId(taskId: string): number {
    const db = getDb()
    const result = db
      .query<{ count: number }, [string]>(
        'SELECT COUNT(*) as count FROM comments WHERE task_id = ?'
      )
      .get(taskId)
    return result?.count ?? 0
  },
}
