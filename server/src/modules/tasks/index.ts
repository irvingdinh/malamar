/**
 * Tasks Module
 *
 * Task management with comments and attachments.
 */

// Routes
export { workspaceTasks, tasks, attachments } from './routes'

// Service
export { taskService } from './service'

// Repositories
export { taskRepository } from './repository'
export { commentRepository } from './comment-repository'
export {
  attachmentRepository,
  generateStoredName,
  saveAttachmentFile,
  deleteAttachmentFile,
  copyAttachmentFile,
  getAttachmentPath,
  attachmentFileExists,
} from './attachment-repository'

// Types
export type {
  Task,
  TaskStatus,
  TaskRow,
  CreateTaskInput,
  UpdateTaskInput,
  TaskWithDetails,
  TaskListFilters,
  Comment,
  CommentRow,
  CreateCommentInput,
  AuthorType,
  Attachment,
  AttachmentRow,
  CreateAttachmentInput,
} from './types'
