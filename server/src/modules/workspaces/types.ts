/**
 * Workspaces Module - Types
 */

export interface Workspace {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface WorkspaceWithSettings extends Workspace {
  settings: Record<string, unknown>
}

export interface WorkspaceSetting {
  id: string
  workspaceId: string
  key: string
  value: string // JSON encoded
  createdAt: number
  updatedAt: number
}

export interface CreateWorkspaceInput {
  name: string
}

export interface UpdateWorkspaceInput {
  name?: string
}

// Known settings keys
export type SettingKey = 'instruction'

// Database row types (snake_case)
export interface WorkspaceRow {
  id: string
  name: string
  created_at: number
  updated_at: number
}

export interface WorkspaceSettingRow {
  id: string
  workspace_id: string
  key: string
  value: string
  created_at: number
  updated_at: number
}
