/**
 * Tasks Module Tests
 *
 * Tests for tasks, comments, and attachments.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  get,
  post,
  put,
  del,
  json,
  request,
  factory,
  type ErrorResponse,
} from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Tasks Module', () => {
  let workspaceId: string
  let taskId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Tasks Test Workspace')
    workspaceId = ws.id
  })

  test('POST /api/workspaces/:id/tasks - creates task', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/tasks`, {
      title: 'Test Task',
      description: 'This is a test task',
    })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      workspaceId: string
      title: string
      description: string | null
      status: string
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.workspaceId).toBe(workspaceId)
    expect(data.title).toBe('Test Task')
    expect(data.description).toBe('This is a test task')
    expect(data.status).toBe('todo')

    taskId = data.id
  })

  test('POST /api/workspaces/:id/tasks - creates task without description', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/tasks`, {
      title: 'Task Without Description',
    })
    expect(res.status).toBe(201)

    const data = await json<{ description: null }>(res)
    expect(data.description).toBeNull()
  })

  test('GET /api/workspaces/:id/tasks - lists tasks', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/tasks`)
    expect(res.status).toBe(200)

    const data = await json<{
      tasks: Array<{ id: string; title: string }>
      total: number
      page: number
      limit: number
      totalPages: number
    }>(res)

    expect(data.tasks).toBeDefined()
    expect(Array.isArray(data.tasks)).toBe(true)
    expect(typeof data.total).toBe('number')
    expect(typeof data.page).toBe('number')
    expect(typeof data.limit).toBe('number')
  })

  test('GET /api/workspaces/:id/tasks?status=todo - filters tasks by status', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/tasks?status=todo`)
    expect(res.status).toBe(200)

    const data = await json<{ tasks: Array<{ status: string }> }>(res)
    for (const task of data.tasks) {
      expect(task.status).toBe('todo')
    }
  })

  test('GET /api/workspaces/:id/tasks?page=1&limit=10 - pagination', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/tasks?page=1&limit=10`)
    expect(res.status).toBe(200)

    const data = await json<{ page: number; limit: number }>(res)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(10)
  })

  test('GET /api/tasks/:id - gets task detail', async () => {
    const res = await get(`/api/tasks/${taskId}`)
    expect(res.status).toBe(200)

    const data = await json<{
      id: string
      title: string
      comments?: unknown[]
      attachments?: unknown[]
    }>(res)

    expect(data.id).toBe(taskId)
    expect(data.title).toBe('Test Task')
  })

  test('GET /api/tasks/:id - returns 404 for non-existent task', async () => {
    const res = await get('/api/tasks/non-existent-id')
    expect(res.status).toBe(404)

    const data = await json<ErrorResponse>(res)
    expect(data.error.code).toBe('NOT_FOUND')
  })

  test('PUT /api/tasks/:id - updates task', async () => {
    const res = await put(`/api/tasks/${taskId}`, {
      title: 'Updated Task Title',
      description: 'Updated description',
    })
    expect(res.status).toBe(200)

    const data = await json<{ title: string; description: string }>(res)
    expect(data.title).toBe('Updated Task Title')
    expect(data.description).toBe('Updated description')
  })

  test('PUT /api/tasks/:id - updates task status', async () => {
    const res = await put(`/api/tasks/${taskId}`, { status: 'done' })
    expect(res.status).toBe(200)

    const data = await json<{ status: string }>(res)
    expect(data.status).toBe('done')

    // Reset status for other tests
    await put(`/api/tasks/${taskId}`, { status: 'todo' })
  })

  test('POST /api/tasks/:id/restart - restarts task', async () => {
    const res = await post(`/api/tasks/${taskId}/restart`)
    expect(res.status).toBe(200)

    const data = await json<{ status: string }>(res)
    expect(data.status).toBeDefined()
  })

  test('DELETE /api/tasks/:id - deletes task', async () => {
    const task = await factory.createTask(workspaceId, { title: 'To Delete' })

    const res = await del(`/api/tasks/${task.id}`)
    expect(res.status).toBe(204)

    // Verify it's gone
    const check = await get(`/api/tasks/${task.id}`)
    expect(check.status).toBe(404)
  })
})

describe('Task Cancellation', () => {
  let workspaceId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Cancel Test Workspace')
    workspaceId = ws.id
    await factory.createAgent(workspaceId, { name: 'Test Agent' })
  })

  test('POST /api/tasks/:id/cancel - rejects non-in-progress task', async () => {
    const task = await factory.createTask(workspaceId, { title: 'Not In Progress' })

    const res = await post(`/api/tasks/${task.id}/cancel`)
    // Should return 400 because only in-progress tasks can be cancelled
    expect(res.status).toBe(400)

    const data = await json<ErrorResponse>(res)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('POST /api/tasks/:id/cancel - cancels in-progress task', async () => {
    const task = await factory.createTask(workspaceId, { title: 'Cancel Test' })

    // Trigger routing to make it in_progress
    await post('/api/routing/trigger', { taskId: task.id })

    // Wait for routing to start
    await new Promise((resolve) => setTimeout(resolve, 200))

    const res = await post(`/api/tasks/${task.id}/cancel`)
    expect(res.status).toBe(200)

    const data = await json<{ id: string; status: string }>(res)
    expect(data.id).toBe(task.id)
    // Status should be reset to todo after cancel
    expect(data.status).toBe('todo')
  })
})

describe('Comments', () => {
  let workspaceId: string
  let taskId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Comments Test Workspace')
    workspaceId = ws.id
    const task = await factory.createTask(workspaceId, { title: 'Comments Test Task' })
    taskId = task.id
  })

  test('POST /api/tasks/:id/comments - adds human comment', async () => {
    const res = await post(`/api/tasks/${taskId}/comments`, {
      author: 'Test User',
      authorType: 'human',
      content: 'This is a test comment',
    })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      taskId: string
      author: string
      authorType: string
      content: string
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.taskId).toBe(taskId)
    expect(data.author).toBe('Test User')
    expect(data.authorType).toBe('human')
    expect(data.content).toBe('This is a test comment')
  })

  test('POST /api/tasks/:id/comments - adds agent comment', async () => {
    const res = await post(`/api/tasks/${taskId}/comments`, {
      author: 'Agent Smith',
      authorType: 'agent',
      content: 'Agent response',
    })
    expect(res.status).toBe(201)

    const data = await json<{ authorType: string }>(res)
    expect(data.authorType).toBe('agent')
  })

  test('POST /api/tasks/:id/comments - adds system comment', async () => {
    const res = await post(`/api/tasks/${taskId}/comments`, {
      author: 'System',
      authorType: 'system',
      content: 'System message',
    })
    expect(res.status).toBe(201)

    const data = await json<{ authorType: string }>(res)
    expect(data.authorType).toBe('system')
  })

  test('GET /api/tasks/:id/comments - lists comments', async () => {
    const res = await get(`/api/tasks/${taskId}/comments`)
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; content: string }>>(res)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(3) // We added 3 comments above
  })

  test('GET /api/tasks/:id/comments - comments are ordered by creation time', async () => {
    const res = await get(`/api/tasks/${taskId}/comments`)
    const data = await json<Array<{ createdAt: number }>>(res)

    // Verify comments are in chronological order
    for (let i = 1; i < data.length; i++) {
      expect(data[i].createdAt).toBeGreaterThanOrEqual(data[i - 1].createdAt)
    }
  })
})

describe('Attachments', () => {
  let workspaceId: string
  let taskId: string
  let attachmentId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Attachments Test Workspace')
    workspaceId = ws.id
    const task = await factory.createTask(workspaceId, { title: 'Attachments Test Task' })
    taskId = task.id
  })

  test('POST /api/tasks/:id/attachments - uploads attachment', async () => {
    const formData = new FormData()
    const file = new File(['test file content'], 'test.txt', { type: 'text/plain' })
    formData.append('file', file)

    const res = await request('POST', `/api/tasks/${taskId}/attachments`, {
      formData,
    })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      taskId: string
      filename: string
      mimeType: string
      size: number
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.taskId).toBe(taskId)
    expect(data.filename).toBe('test.txt')
    expect(data.mimeType).toContain('text/plain')
    expect(data.size).toBe(17) // 'test file content'.length

    attachmentId = data.id
  })

  test('POST /api/tasks/:id/attachments - rejects request without file', async () => {
    const formData = new FormData()

    const res = await request('POST', `/api/tasks/${taskId}/attachments`, {
      formData,
    })
    expect(res.status).toBe(400)

    const data = await json<ErrorResponse>(res)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('GET /api/tasks/:id/attachments - lists attachments', async () => {
    const res = await get(`/api/tasks/${taskId}/attachments`)
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; filename: string }>>(res)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('GET /api/attachments/:id/download - downloads attachment', async () => {
    const res = await get(`/api/attachments/${attachmentId}/download`)
    expect(res.status).toBe(200)

    const contentType = res.headers.get('Content-Type')
    expect(contentType).toContain('text/plain')

    const contentDisposition = res.headers.get('Content-Disposition')
    expect(contentDisposition).toContain('attachment')
    expect(contentDisposition).toContain('test.txt')

    const content = await res.text()
    expect(content).toBe('test file content')
  })

  test('GET /api/attachments/:id/download - returns 404 for non-existent attachment', async () => {
    const res = await get('/api/attachments/non-existent-id/download')
    expect(res.status).toBe(404)
  })

  test('DELETE /api/attachments/:id - deletes attachment', async () => {
    // Create an attachment to delete
    const formData = new FormData()
    const file = new File(['delete me'], 'delete.txt', { type: 'text/plain' })
    formData.append('file', file)

    const uploadRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      formData,
    })
    const { id } = await json<{ id: string }>(uploadRes)

    const res = await del(`/api/attachments/${id}`)
    expect(res.status).toBe(204)

    // Verify it's gone
    const check = await get(`/api/attachments/${id}/download`)
    expect(check.status).toBe(404)
  })
})
