/**
 * Tasks Module - Routes
 *
 * HTTP endpoints for task operations.
 */

import { existsSync } from 'node:fs'
import { Hono } from 'hono'
import { taskService } from './service'
import type { TaskStatus } from './types'

// ============================================================================
// Workspace-scoped task routes (mounted under /api/workspaces/:id/tasks)
// ============================================================================

const workspaceTasks = new Hono<{ Variables: { workspaceId: string } }>()

// Extract workspace ID from path
workspaceTasks.use('*', async (c, next) => {
  const workspaceId = c.req.param('id')
  if (!workspaceId) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Workspace ID is required' } },
      400
    )
  }
  c.set('workspaceId', workspaceId)
  return next()
})

/**
 * GET /api/workspaces/:id/tasks - List all tasks for a workspace
 * Query params: status, page, limit
 */
workspaceTasks.get('/', (c) => {
  const workspaceId = c.get('workspaceId')
  const status = c.req.query('status') as TaskStatus | undefined
  const page = parseInt(c.req.query('page') || '1', 10)
  const limit = parseInt(c.req.query('limit') || '50', 10)

  const { tasks, total } = taskService.listByWorkspace(workspaceId, {
    status,
    page,
    limit,
  })

  return c.json({
    tasks,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

/**
 * POST /api/workspaces/:id/tasks - Create a new task
 */
workspaceTasks.post('/', async (c) => {
  const workspaceId = c.get('workspaceId')
  const body = await c.req.json<{
    title?: string
    description?: string
  }>()

  const task = taskService.create(workspaceId, {
    title: body.title ?? '',
    description: body.description,
  })

  return c.json(task, 201)
})

// ============================================================================
// Task routes (mounted under /api/tasks)
// ============================================================================

const tasks = new Hono()

/**
 * GET /api/tasks/:id - Get task detail with comments and attachments
 */
tasks.get('/:id', (c) => {
  const id = c.req.param('id')!
  const task = taskService.get(id)
  return c.json(task)
})

/**
 * PUT /api/tasks/:id - Update a task
 */
tasks.put('/:id', async (c) => {
  const id = c.req.param('id')!
  const body = await c.req.json<{
    title?: string
    description?: string | null
    status?: TaskStatus
  }>()

  const task = taskService.update(id, {
    title: body.title,
    description: body.description,
    status: body.status,
  })

  return c.json(task)
})

/**
 * DELETE /api/tasks/:id - Delete a task
 */
tasks.delete('/:id', (c) => {
  const id = c.req.param('id')!
  taskService.delete(id)
  return c.body(null, 204)
})

/**
 * POST /api/tasks/:id/cancel - Cancel an in-progress task
 */
tasks.post('/:id/cancel', async (c) => {
  const id = c.req.param('id')!
  const task = await taskService.cancel(id)
  return c.json(task)
})

/**
 * POST /api/tasks/:id/restart - Restart task execution
 */
tasks.post('/:id/restart', (c) => {
  const id = c.req.param('id')!
  const task = taskService.restart(id)
  return c.json(task)
})

// ============================================================================
// Comment routes (under /api/tasks/:id/comments)
// ============================================================================

/**
 * GET /api/tasks/:id/comments - List comments for a task
 */
tasks.get('/:id/comments', (c) => {
  const id = c.req.param('id')!
  const comments = taskService.listComments(id)
  return c.json(comments)
})

/**
 * POST /api/tasks/:id/comments - Add a comment to a task
 */
tasks.post('/:id/comments', async (c) => {
  const id = c.req.param('id')!
  const body = await c.req.json<{
    author?: string
    authorType?: 'human' | 'agent' | 'system'
    content?: string
  }>()

  const comment = taskService.addComment(id, {
    author: body.author ?? 'User',
    authorType: body.authorType ?? 'human',
    content: body.content ?? '',
  })

  return c.json(comment, 201)
})

// ============================================================================
// Attachment routes
// ============================================================================

/**
 * GET /api/tasks/:id/attachments - List attachments for a task
 */
tasks.get('/:id/attachments', (c) => {
  const id = c.req.param('id')!
  const attachments = taskService.listAttachments(id)
  return c.json(attachments)
})

/**
 * POST /api/tasks/:id/attachments - Upload an attachment
 */
tasks.post('/:id/attachments', async (c) => {
  const id = c.req.param('id')!
  const formData = await c.req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File is required' } },
      400
    )
  }

  const attachment = await taskService.uploadAttachment(id, file)
  return c.json(attachment, 201)
})

// ============================================================================
// Attachment routes (mounted under /api/attachments)
// ============================================================================

const attachments = new Hono()

/**
 * DELETE /api/attachments/:id - Delete an attachment
 */
attachments.delete('/:id', (c) => {
  const id = c.req.param('id')!
  taskService.deleteAttachment(id)
  return c.body(null, 204)
})

/**
 * GET /api/attachments/:id/download - Download an attachment file
 */
attachments.get('/:id/download', async (c) => {
  const id = c.req.param('id')!
  const { attachment, path } = taskService.getAttachmentFile(id)

  if (!existsSync(path)) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Attachment file not found' } },
      404
    )
  }

  const file = Bun.file(path)
  return new Response(file, {
    headers: {
      'Content-Type': attachment.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
      'Content-Length': String(attachment.size),
    },
  })
})

export { workspaceTasks, tasks, attachments }
