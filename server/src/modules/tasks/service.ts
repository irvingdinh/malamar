/**
 * Tasks Module - Service
 *
 * Business logic for task operations.
 */

import { NotFoundError, ValidationError, log } from '../core'
import { workspaceRepository } from '../workspaces/repository'
import { taskRepository } from './repository'
import { commentRepository } from './comment-repository'
import {
  attachmentRepository,
  generateStoredName,
  saveAttachmentFile,
  getAttachmentPath,
} from './attachment-repository'
import { routingService } from '../routing/service'
import { executorService } from '../executor/service'
import type {
  Task,
  TaskWithDetails,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskListFilters,
  Comment,
  CreateCommentInput,
  Attachment,
} from './types'

// Valid task status transitions
const validTransitions: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress', 'done'],
  in_progress: ['todo', 'in_review', 'done'],
  in_review: ['todo', 'in_progress', 'done'],
  done: ['todo'],
}

function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true
  return validTransitions[from]?.includes(to) ?? false
}

export const taskService = {
  /**
   * List all tasks for a workspace with optional filters
   */
  listByWorkspace(
    workspaceId: string,
    filters?: TaskListFilters
  ): { tasks: Task[]; total: number } {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    const tasks = taskRepository.findByWorkspaceId(workspaceId, filters)
    const total = taskRepository.countByWorkspaceId(workspaceId, filters?.status)

    return { tasks, total }
  },

  /**
   * Get a task by ID with comments and attachments
   */
  get(id: string): TaskWithDetails {
    const task = taskRepository.findById(id)
    if (!task) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    const comments = commentRepository.findByTaskId(id)
    const attachments = attachmentRepository.findByTaskId(id)

    return {
      ...task,
      comments,
      attachments,
    }
  },

  /**
   * Create a new task
   */
  create(workspaceId: string, data: CreateTaskInput): Task {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Task title is required', {
        title: 'Title is required',
      })
    }

    const task = taskRepository.create(workspaceId, {
      title: data.title.trim(),
      description: data.description?.trim() || null,
    })

    // TODO: Trigger routing if status is todo (will be implemented in routing module)

    return task
  },

  /**
   * Update a task
   */
  update(id: string, data: UpdateTaskInput): Task {
    const existing = taskRepository.findById(id)
    if (!existing) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    // Validate title if provided
    if (data.title !== undefined && data.title.trim().length === 0) {
      throw new ValidationError('Task title cannot be empty', {
        title: 'Title cannot be empty',
      })
    }

    // Validate status transition if provided
    if (data.status && !isValidStatusTransition(existing.status, data.status)) {
      throw new ValidationError(
        `Invalid status transition from ${existing.status} to ${data.status}`,
        { status: 'Invalid status transition' }
      )
    }

    const updateData: UpdateTaskInput = {}
    if (data.title !== undefined) {
      updateData.title = data.title.trim()
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }

    const updated = taskRepository.update(id, updateData)
    if (!updated) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    return updated
  },

  /**
   * Update task status
   */
  updateStatus(id: string, status: TaskStatus): Task {
    const existing = taskRepository.findById(id)
    if (!existing) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    if (!isValidStatusTransition(existing.status, status)) {
      throw new ValidationError(
        `Invalid status transition from ${existing.status} to ${status}`,
        { status: 'Invalid status transition' }
      )
    }

    const updated = taskRepository.updateStatus(id, status)
    if (!updated) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    return updated
  },

  /**
   * Delete a task (also cleans up attachments)
   */
  delete(id: string): void {
    const task = taskRepository.findById(id)
    if (!task) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    // Delete attachments (files will be cleaned up by repository)
    attachmentRepository.deleteByTaskId(id)

    // Delete task (comments cascade via FK)
    taskRepository.delete(id)
  },

  /**
   * Cancel an in-progress task
   * - Kills running CLI process for task
   * - Sets task status back to todo
   * - Adds system comment: "Task cancelled by user"
   * - Updates routing state to failed
   */
  async cancel(id: string): Promise<Task> {
    const task = taskRepository.findById(id)
    if (!task) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    if (task.status !== 'in_progress') {
      throw new ValidationError('Only in-progress tasks can be cancelled', {
        status: 'Task is not in progress',
      })
    }

    log.info('Cancelling task', { taskId: id })

    // Cancel routing (this will kill processes and update routing state to failed)
    await routingService.cancel(id)

    // Also explicitly cancel any running executions for this task
    const cancelledCount = executorService.cancelByTask(id)
    if (cancelledCount > 0) {
      log.info('Cancelled running executions', { taskId: id, count: cancelledCount })
    }

    // Fetch the updated task (routing.cancel already updates status and adds comment)
    const updated = taskRepository.findById(id)
    if (!updated) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    return updated
  },

  /**
   * Restart a task execution
   */
  restart(id: string): Task {
    const task = taskRepository.findById(id)
    if (!task) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    if (task.status === 'in_progress') {
      throw new ValidationError('Task is already in progress', {
        status: 'Task is already in progress',
      })
    }

    // Add system comment noting restart
    commentRepository.create(id, {
      author: 'system',
      authorType: 'system',
      content: 'Task restarted by user',
    })

    // Set task status to todo to trigger routing
    const updated = taskRepository.updateStatus(id, 'todo')
    if (!updated) {
      throw new NotFoundError(`Task not found: ${id}`)
    }

    // TODO: Trigger routing (will be implemented in routing module)

    return updated
  },

  // ============================================================================
  // Comment Operations
  // ============================================================================

  /**
   * List comments for a task
   */
  listComments(taskId: string): Comment[] {
    const task = taskRepository.findById(taskId)
    if (!task) {
      throw new NotFoundError(`Task not found: ${taskId}`)
    }

    return commentRepository.findByTaskId(taskId)
  },

  /**
   * Add a comment to a task
   */
  addComment(taskId: string, data: CreateCommentInput): Comment {
    const task = taskRepository.findById(taskId)
    if (!task) {
      throw new NotFoundError(`Task not found: ${taskId}`)
    }

    // Validate content
    if (!data.content || data.content.trim().length === 0) {
      throw new ValidationError('Comment content is required', {
        content: 'Content is required',
      })
    }

    const comment = commentRepository.create(taskId, {
      author: data.author,
      authorType: data.authorType,
      content: data.content.trim(),
      log: data.log,
    })

    // Handle comment trigger logic
    // When human comment added and status is in_review or todo: trigger routing
    // When human comment added and status is done: no action
    // System comments never trigger routing
    if (data.authorType === 'human' && task.status !== 'done') {
      // TODO: Trigger routing (will be implemented in routing module)
    }

    return comment
  },

  // ============================================================================
  // Attachment Operations
  // ============================================================================

  /**
   * List attachments for a task
   */
  listAttachments(taskId: string): Attachment[] {
    const task = taskRepository.findById(taskId)
    if (!task) {
      throw new NotFoundError(`Task not found: ${taskId}`)
    }

    return attachmentRepository.findByTaskId(taskId)
  },

  /**
   * Upload an attachment to a task
   */
  async uploadAttachment(taskId: string, file: File): Promise<Attachment> {
    const task = taskRepository.findById(taskId)
    if (!task) {
      throw new NotFoundError(`Task not found: ${taskId}`)
    }

    const storedName = generateStoredName(file.name)
    await saveAttachmentFile(file, storedName)

    const attachment = attachmentRepository.create(taskId, {
      filename: file.name,
      storedName,
      mimeType: file.type || null,
      size: file.size,
    })

    return attachment
  },

  /**
   * Get attachment file path for download
   */
  getAttachmentFile(attachmentId: string): { attachment: Attachment; path: string } {
    const attachment = attachmentRepository.findById(attachmentId)
    if (!attachment) {
      throw new NotFoundError(`Attachment not found: ${attachmentId}`)
    }

    const path = getAttachmentPath(attachment.storedName)
    return { attachment, path }
  },

  /**
   * Delete an attachment
   */
  deleteAttachment(attachmentId: string): void {
    const attachment = attachmentRepository.findById(attachmentId)
    if (!attachment) {
      throw new NotFoundError(`Attachment not found: ${attachmentId}`)
    }

    attachmentRepository.delete(attachmentId)
  },
}
