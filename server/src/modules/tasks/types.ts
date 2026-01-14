/**
 * Tasks Module - Types
 */

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'

export interface Task {
  id: string
  workspaceId: string
  title: string
  description: string | null
  status: TaskStatus
  createdAt: number
  updatedAt: number
}

export interface CreateTaskInput {
  title: string
  description?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
}

// Database row type (snake_case)
export interface TaskRow {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: string
  created_at: number
  updated_at: number
}

// Comment types
export type AuthorType = 'human' | 'agent' | 'system'

export interface Comment {
  id: string
  taskId: string
  author: string
  authorType: AuthorType
  content: string
  log: string | null
  createdAt: number
}

export interface CreateCommentInput {
  author: string
  authorType: AuthorType
  content: string
  log?: string | null
}

// Database row type for comments
export interface CommentRow {
  id: string
  task_id: string
  author: string
  author_type: string
  content: string
  log: string | null
  created_at: number
}

// Attachment types
export interface Attachment {
  id: string
  taskId: string
  filename: string
  storedName: string
  mimeType: string | null
  size: number
  createdAt: number
}

export interface CreateAttachmentInput {
  filename: string
  storedName: string
  mimeType?: string | null
  size: number
}

// Database row type for attachments
export interface AttachmentRow {
  id: string
  task_id: string
  filename: string
  stored_name: string
  mime_type: string | null
  size: number
  created_at: number
}

// Task with related data
export interface TaskWithDetails extends Task {
  comments?: Comment[]
  attachments?: Attachment[]
}

// List filters
export interface TaskListFilters {
  status?: TaskStatus
  page?: number
  limit?: number
}
