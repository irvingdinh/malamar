/**
 * Templates Module - Repository
 *
 * Database operations for task templates.
 */

import { getDb, generateId, now } from '../core'
import type {
  TaskTemplate,
  TaskTemplateRow,
  CreateTemplateInput,
  UpdateTemplateInput,
} from './types'

// Helper to convert database row to TaskTemplate
function rowToTemplate(row: TaskTemplateRow): TaskTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    title: row.title,
    description: row.description,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const templateRepository = {
  /**
   * Find all templates for a workspace ordered by order asc
   */
  findByWorkspaceId(workspaceId: string): TaskTemplate[] {
    const db = getDb()
    const rows = db
      .query<TaskTemplateRow, [string]>(
        'SELECT * FROM task_templates WHERE workspace_id = ? ORDER BY "order" ASC'
      )
      .all(workspaceId)
    return rows.map(rowToTemplate)
  },

  /**
   * Find a template by ID
   */
  findById(id: string): TaskTemplate | null {
    const db = getDb()
    const row = db
      .query<TaskTemplateRow, [string]>('SELECT * FROM task_templates WHERE id = ?')
      .get(id)
    return row ? rowToTemplate(row) : null
  },

  /**
   * Get the next order value for a workspace
   */
  getNextOrder(workspaceId: string): number {
    const db = getDb()
    const result = db
      .query<{ max_order: number | null }, [string]>(
        'SELECT MAX("order") as max_order FROM task_templates WHERE workspace_id = ?'
      )
      .get(workspaceId)
    return (result?.max_order ?? -1) + 1
  },

  /**
   * Create a new template
   */
  create(workspaceId: string, data: CreateTemplateInput): TaskTemplate {
    const db = getDb()
    const id = generateId()
    const timestamp = now()
    const order = this.getNextOrder(workspaceId)

    db.run(
      `INSERT INTO task_templates (id, workspace_id, name, title, description, "order", created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workspaceId,
        data.name,
        data.title,
        data.description ?? null,
        order,
        timestamp,
        timestamp,
      ]
    )

    return {
      id,
      workspaceId,
      name: data.name,
      title: data.title,
      description: data.description ?? null,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },

  /**
   * Update a template
   */
  update(id: string, data: UpdateTemplateInput): TaskTemplate | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const timestamp = now()
    const name = data.name ?? existing.name
    const title = data.title ?? existing.title
    const description =
      data.description !== undefined ? data.description : existing.description

    db.run(
      `UPDATE task_templates SET name = ?, title = ?, description = ?, updated_at = ? WHERE id = ?`,
      [name, title, description, timestamp, id]
    )

    return {
      ...existing,
      name,
      title,
      description,
      updatedAt: timestamp,
    }
  },

  /**
   * Delete a template
   */
  delete(id: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM task_templates WHERE id = ?', [id])
    return result.changes > 0
  },

  /**
   * Recompute order values after deletion
   */
  recomputeOrder(workspaceId: string): void {
    const db = getDb()
    const templates = this.findByWorkspaceId(workspaceId)
    const timestamp = now()

    db.transaction(() => {
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i]!
        if (template.order !== i) {
          db.run(
            `UPDATE task_templates SET "order" = ?, updated_at = ? WHERE id = ?`,
            [i, timestamp, template.id]
          )
        }
      }
    })()
  },
}
