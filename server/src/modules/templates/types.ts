/**
 * Templates Module - Types
 */

export interface TaskTemplate {
  id: string
  workspaceId: string
  name: string
  title: string
  description: string | null
  order: number
  createdAt: number
  updatedAt: number
}

export interface CreateTemplateInput {
  name: string
  title: string
  description?: string | null
}

export interface UpdateTemplateInput {
  name?: string
  title?: string
  description?: string | null
}

// Database row type (snake_case)
export interface TaskTemplateRow {
  id: string
  workspace_id: string
  name: string
  title: string
  description: string | null
  order: number
  created_at: number
  updated_at: number
}
