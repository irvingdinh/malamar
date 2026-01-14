/**
 * Recovery Module Tests
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  get,
  post,
  json,
  factory,
} from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Recovery Module', () => {
  test('POST /api/recovery/trigger - triggers recovery', async () => {
    const res = await post('/api/recovery/trigger')
    expect(res.status).toBe(200)

    const data = await json<{
      success: boolean
      message: string
      recoveredCount: number
      skippedCount: number
      failedCount: number
    }>(res)

    expect(data.success).toBe(true)
    expect(data.message).toBeDefined()
    expect(typeof data.recoveredCount).toBe('number')
    expect(typeof data.skippedCount).toBe('number')
    expect(typeof data.failedCount).toBe('number')
  })

  test('POST /api/recovery/trigger - counts are non-negative', async () => {
    const res = await post('/api/recovery/trigger')
    const data = await json<{
      recoveredCount: number
      skippedCount: number
      failedCount: number
    }>(res)

    expect(data.recoveredCount).toBeGreaterThanOrEqual(0)
    expect(data.skippedCount).toBeGreaterThanOrEqual(0)
    expect(data.failedCount).toBeGreaterThanOrEqual(0)
  })
})

describe('Task-specific Recovery', () => {
  let workspaceId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Recovery Task Test')
    workspaceId = ws.id
  })

  test('POST /api/recovery/tasks/:taskId - attempts to recover specific task', async () => {
    const task = await factory.createTask(workspaceId, { title: 'Recovery Test Task' })

    const res = await post(`/api/recovery/tasks/${task.id}`)
    // May return 200 (if routing exists) or 404 (if no routing)
    expect([200, 404]).toContain(res.status)
  })

  test('POST /api/recovery/tasks/:taskId - returns 404 for task without routing', async () => {
    const task = await factory.createTask(workspaceId, { title: 'No Routing Task' })

    // Task has no routing, so recovery should return 404
    const res = await post(`/api/recovery/tasks/${task.id}`)
    expect(res.status).toBe(404)
  })

  test('POST /api/recovery/tasks/:taskId - can recover task with pending routing', async () => {
    // Create a task and trigger routing
    await factory.createAgent(workspaceId, { name: 'Recovery Agent' })
    const task = await factory.createTask(workspaceId, { title: 'Pending Recovery Task' })
    await post('/api/routing/trigger', { taskId: task.id })

    // Wait a bit for routing to start
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Try to recover
    const res = await post(`/api/recovery/tasks/${task.id}`)
    expect(res.status).toBe(200)

    const data = await json<{
      success: boolean
      status: string
      routingId: string
      taskId: string
    }>(res)

    expect(data.success).toBe(true)
    expect(data.taskId).toBe(task.id)
    expect(data.routingId).toBeDefined()
  })
})

describe('Recovery Behavior', () => {
  let workspaceId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Recovery Behavior Test')
    workspaceId = ws.id
    await factory.createAgent(workspaceId, { name: 'Behavior Agent' })
  })

  test('recovery does not affect completed routings', async () => {
    const task = await factory.createTask(workspaceId, { title: 'Completed Task' })

    // Trigger routing
    await post('/api/routing/trigger', { taskId: task.id })

    // Wait for it to complete or cancel it
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Get initial routing state
    const beforeRes = await get(`/api/routing/task/${task.id}`)
    const beforeData = await json<{ status: string; iteration: number } | null>(beforeRes)

    // Trigger recovery
    await post('/api/recovery/trigger')

    // Verify routing state hasn't changed unexpectedly
    const afterRes = await get(`/api/routing/task/${task.id}`)
    const afterData = await json<{ status: string; iteration: number } | null>(afterRes)

    // If routing exists, verify it wasn't reset
    if (beforeData && afterData) {
      expect(afterData.iteration).toBeGreaterThanOrEqual(beforeData.iteration)
    }
  })

  test('recovery can be triggered multiple times safely', async () => {
    // Trigger recovery multiple times in succession
    const results = await Promise.all([
      post('/api/recovery/trigger'),
      post('/api/recovery/trigger'),
      post('/api/recovery/trigger'),
    ])

    // All should succeed
    for (const res of results) {
      expect(res.status).toBe(200)
    }
  })
})
