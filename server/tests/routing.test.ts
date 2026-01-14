/**
 * Routing Module Tests
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  get,
  post,
  del,
  json,
  factory,
  type ErrorResponse,
} from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Routing Module', () => {
  let workspaceId: string
  let taskId: string
  let routingId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Routing Test Workspace')
    workspaceId = ws.id
    // Create an agent so routing has something to work with
    await factory.createAgent(workspaceId, { name: 'Routing Agent' })
    const task = await factory.createTask(workspaceId, { title: 'Routing Task' })
    taskId = task.id
  })

  test('POST /api/routing/trigger - triggers routing', async () => {
    const res = await post('/api/routing/trigger', { taskId })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      taskId: string
      status: string
      currentAgentIndex: number
      iteration: number
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.taskId).toBe(taskId)
    expect(['pending', 'running']).toContain(data.status)

    routingId = data.id
  })

  test('POST /api/routing/trigger - requires taskId', async () => {
    const res = await post('/api/routing/trigger', {})
    expect(res.status).toBe(400)

    const data = await json<ErrorResponse>(res)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('GET /api/routing - lists routings', async () => {
    const res = await get('/api/routing')
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; taskId: string }>>(res)
    expect(Array.isArray(data)).toBe(true)
  })

  test('GET /api/routing?status=running - filters by status', async () => {
    const res = await get('/api/routing?status=running')
    expect(res.status).toBe(200)

    const data = await json<Array<{ status: string }>>(res)
    for (const routing of data) {
      expect(routing.status).toBe('running')
    }
  })

  test('GET /api/routing?taskId=xxx - filters by taskId', async () => {
    const res = await get(`/api/routing?taskId=${taskId}`)
    expect(res.status).toBe(200)

    const data = await json<Array<{ taskId: string }>>(res)
    for (const routing of data) {
      expect(routing.taskId).toBe(taskId)
    }
  })

  test('GET /api/routing/pending - lists pending/running routings', async () => {
    const res = await get('/api/routing/pending')
    expect(res.status).toBe(200)

    const data = await json<Array<{ status: string }>>(res)
    expect(Array.isArray(data)).toBe(true)
    for (const routing of data) {
      expect(['pending', 'running']).toContain(routing.status)
    }
  })

  test('GET /api/routing/:id - gets routing detail', async () => {
    const res = await get(`/api/routing/${routingId}`)
    expect(res.status).toBe(200)

    const data = await json<{
      id: string
      taskId: string
      status: string
      currentAgentIndex: number
      iteration: number
      anyAgentWorked: boolean
      retryCount: number
    }>(res)

    expect(data.id).toBe(routingId)
    expect(data.taskId).toBe(taskId)
    expect(typeof data.currentAgentIndex).toBe('number')
    expect(typeof data.iteration).toBe('number')
    expect(typeof data.anyAgentWorked).toBe('boolean')
    expect(typeof data.retryCount).toBe('number')
  })

  test('GET /api/routing/task/:taskId - gets routing by task ID', async () => {
    const res = await get(`/api/routing/task/${taskId}`)
    expect(res.status).toBe(200)

    const data = await json<{ taskId: string } | null>(res)
    if (data) {
      expect(data.taskId).toBe(taskId)
    }
  })

  test('GET /api/routing/task/:taskId - returns null for task without routing', async () => {
    // Create a task without triggering routing
    const task = await factory.createTask(workspaceId, { title: 'No Routing Task' })

    const res = await get(`/api/routing/task/${task.id}`)
    expect(res.status).toBe(200)

    const data = await json<null>(res)
    expect(data).toBeNull()
  })

  test('POST /api/routing/:id/resume - resumes routing', async () => {
    const res = await post(`/api/routing/${routingId}/resume`)
    expect(res.status).toBe(200)

    const data = await json<{ message: string }>(res)
    expect(data.message).toBe('Routing resume initiated')
  })
})

describe('Routing Cancellation', () => {
  let workspaceId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Cancel Routing Test')
    workspaceId = ws.id
    await factory.createAgent(workspaceId, { name: 'Cancel Agent' })
  })

  test('POST /api/routing/task/:taskId/cancel - cancels routing', async () => {
    const task = await factory.createTask(workspaceId, { title: 'Cancel Test' })
    await post('/api/routing/trigger', { taskId: task.id })

    // Wait for routing to start
    await new Promise((resolve) => setTimeout(resolve, 100))

    const res = await post(`/api/routing/task/${task.id}/cancel`)
    // May return 200 or 404 depending on timing
    expect([200, 404]).toContain(res.status)

    if (res.status === 200) {
      const data = await json<{ status: string }>(res)
      expect(data.status).toBe('failed')
    }
  })

  test('POST /api/routing/task/:taskId/cancel - returns 404 for non-existent routing', async () => {
    const res = await post('/api/routing/task/non-existent-task/cancel')
    expect(res.status).toBe(404)
  })
})

describe('Routing Deletion', () => {
  let workspaceId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Delete Routing Test')
    workspaceId = ws.id
    await factory.createAgent(workspaceId, { name: 'Delete Agent' })
  })

  test('DELETE /api/routing/task/:taskId - deletes routing', async () => {
    const task = await factory.createTask(workspaceId, { title: 'Delete Routing Test' })
    await post('/api/routing/trigger', { taskId: task.id })

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Cancel first to stop execution
    await post(`/api/routing/task/${task.id}/cancel`)

    const res = await del(`/api/routing/task/${task.id}`)
    expect([204, 404]).toContain(res.status)
  })

  test('DELETE /api/routing/task/:taskId - returns 404 for non-existent routing', async () => {
    const res = await del('/api/routing/task/non-existent-task')
    expect(res.status).toBe(404)
  })
})

describe('Routing State', () => {
  let workspaceId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Routing State Test')
    workspaceId = ws.id
  })

  test('routing starts at iteration 0 and agent index 0', async () => {
    await factory.createAgent(workspaceId, { name: 'State Agent' })
    const task = await factory.createTask(workspaceId, { title: 'State Test Task' })

    const res = await post('/api/routing/trigger', { taskId: task.id })
    const data = await json<{
      currentAgentIndex: number
      iteration: number
      anyAgentWorked: boolean
    }>(res)

    expect(data.currentAgentIndex).toBe(0)
    expect(data.iteration).toBe(0)
    expect(data.anyAgentWorked).toBe(false)
  })

  test('routing updates task status to in_progress', async () => {
    const task = await factory.createTask(workspaceId, { title: 'Status Test Task' })

    // Task starts as todo
    const before = await get(`/api/tasks/${task.id}`)
    const beforeData = await json<{ status: string }>(before)
    expect(beforeData.status).toBe('todo')

    // Trigger routing
    await post('/api/routing/trigger', { taskId: task.id })

    // Wait for status update
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Task should now be in_progress
    const after = await get(`/api/tasks/${task.id}`)
    const afterData = await json<{ status: string }>(after)
    expect(afterData.status).toBe('in_progress')
  })
})
