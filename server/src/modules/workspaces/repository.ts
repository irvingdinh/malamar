/**
 * Workspaces Module - Repository
 *
 * Database operations for workspaces and workspace settings.
 */

import { getDb, generateId, now, safeJsonParse } from '../core'
import type {
  Workspace,
  WorkspaceRow,
  WorkspaceSetting,
  WorkspaceSettingRow,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from './types'

// Helper to convert database row to Workspace
function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Helper to convert database row to WorkspaceSetting
function rowToSetting(row: WorkspaceSettingRow): WorkspaceSetting {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    key: row.key,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// Workspace Repository
// ============================================================================

export const workspaceRepository = {
  /**
   * Find all workspaces ordered by updated_at desc
   */
  findAll(): Workspace[] {
    const db = getDb()
    const rows = db
      .query<WorkspaceRow, []>(
        'SELECT * FROM workspaces ORDER BY updated_at DESC'
      )
      .all()
    return rows.map(rowToWorkspace)
  },

  /**
   * Find a workspace by ID
   */
  findById(id: string): Workspace | null {
    const db = getDb()
    const row = db
      .query<WorkspaceRow, [string]>('SELECT * FROM workspaces WHERE id = ?')
      .get(id)
    return row ? rowToWorkspace(row) : null
  },

  /**
   * Create a new workspace
   */
  create(data: CreateWorkspaceInput): Workspace {
    const db = getDb()
    const id = generateId()
    const timestamp = now()

    db.run(
      'INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, data.name, timestamp, timestamp]
    )

    return {
      id,
      name: data.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },

  /**
   * Update a workspace
   */
  update(id: string, data: UpdateWorkspaceInput): Workspace | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const timestamp = now()
    const name = data.name ?? existing.name

    db.run('UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?', [
      name,
      timestamp,
      id,
    ])

    return {
      ...existing,
      name,
      updatedAt: timestamp,
    }
  },

  /**
   * Delete a workspace (cascades to settings, agents, tasks via FK)
   */
  delete(id: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM workspaces WHERE id = ?', [id])
    return result.changes > 0
  },
}

// ============================================================================
// Workspace Settings Repository
// ============================================================================

export const settingsRepository = {
  /**
   * Find all settings for a workspace
   */
  findByWorkspaceId(workspaceId: string): Record<string, unknown> {
    const db = getDb()
    const rows = db
      .query<WorkspaceSettingRow, [string]>(
        'SELECT * FROM workspace_settings WHERE workspace_id = ?'
      )
      .all(workspaceId)

    const settings: Record<string, unknown> = {}
    for (const row of rows) {
      const parsed = safeJsonParse(row.value)
      if (parsed !== undefined) {
        settings[row.key] = parsed
      }
    }
    return settings
  },

  /**
   * Get a single setting
   */
  get(workspaceId: string, key: string): unknown | null {
    const db = getDb()
    const row = db
      .query<WorkspaceSettingRow, [string, string]>(
        'SELECT * FROM workspace_settings WHERE workspace_id = ? AND key = ?'
      )
      .get(workspaceId, key)

    if (!row) {
      return null
    }

    return safeJsonParse(row.value) ?? null
  },

  /**
   * Set a setting (upsert)
   */
  set(workspaceId: string, key: string, value: unknown): WorkspaceSetting {
    const db = getDb()
    const existing = db
      .query<WorkspaceSettingRow, [string, string]>(
        'SELECT * FROM workspace_settings WHERE workspace_id = ? AND key = ?'
      )
      .get(workspaceId, key)

    const timestamp = now()
    const jsonValue = JSON.stringify(value)

    if (existing) {
      db.run(
        'UPDATE workspace_settings SET value = ?, updated_at = ? WHERE id = ?',
        [jsonValue, timestamp, existing.id]
      )
      return rowToSetting({
        ...existing,
        value: jsonValue,
        updated_at: timestamp,
      })
    }

    const id = generateId()
    db.run(
      'INSERT INTO workspace_settings (id, workspace_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, workspaceId, key, jsonValue, timestamp, timestamp]
    )

    return {
      id,
      workspaceId,
      key,
      value: jsonValue,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },

  /**
   * Delete a setting
   */
  delete(workspaceId: string, key: string): boolean {
    const db = getDb()
    const result = db.run(
      'DELETE FROM workspace_settings WHERE workspace_id = ? AND key = ?',
      [workspaceId, key]
    )
    return result.changes > 0
  },
}
