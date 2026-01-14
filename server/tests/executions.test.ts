/**
 * Executions Module Tests
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
} from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Executions Module', () => {
  let workspaceId: string
  let taskId: string
  let agentId: string
  let executionId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Executions Test Workspace')
    workspaceId = ws.id
    const agent = await factory.createAgent(workspaceId, { name: 'Exec Agent' })
    agentId = agent.id
    const task = await factory.createTask(workspaceId, { title: 'Exec Task' })
    taskId = task.id
  })

  test('POST /api/executions - creates execution', async () => {
    const res = await post('/api/executions', {
      taskId,
      agentId,
      agentName: 'Exec Agent',
    })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      taskId: string
      agentId: string
      agentName: string
      status: string
      result: null
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.taskId).toBe(taskId)
    expect(data.agentId).toBe(agentId)
    expect(data.agentName).toBe('Exec Agent')
    expect(data.status).toBe('pending')
    expect(data.result).toBeNull()

    executionId = data.id
  })

  test('GET /api/executions - lists executions', async () => {
    const res = await get('/api/executions')
    expect(res.status).toBe(200)

    const data = await json<{
      executions: Array<{ id: string }>
      total: number
      page: number
      limit: number
    }>(res)

    expect(data.executions).toBeDefined()
    expect(Array.isArray(data.executions)).toBe(true)
    expect(typeof data.total).toBe('number')
  })

  test('GET /api/executions?taskId=xxx - filters by task', async () => {
    const res = await get(`/api/executions?taskId=${taskId}`)
    expect(res.status).toBe(200)

    const data = await json<{ executions: Array<{ taskId: string }> }>(res)
    for (const exec of data.executions) {
      expect(exec.taskId).toBe(taskId)
    }
  })

  test('GET /api/executions?status=pending - filters by status', async () => {
    const res = await get('/api/executions?status=pending')
    expect(res.status).toBe(200)

    const data = await json<{ executions: Array<{ status: string }> }>(res)
    for (const exec of data.executions) {
      expect(exec.status).toBe('pending')
    }
  })

  test('GET /api/executions/:id - gets execution detail', async () => {
    const res = await get(`/api/executions/${executionId}`)
    expect(res.status).toBe(200)

    const data = await json<{ id: string; status: string }>(res)
    expect(data.id).toBe(executionId)
  })

  test('GET /api/executions/:id?includeLogs=true - includes logs', async () => {
    const res = await get(`/api/executions/${executionId}?includeLogs=true`)
    expect(res.status).toBe(200)

    const data = await json<{ id: string; logs?: unknown[] }>(res)
    expect(data.id).toBe(executionId)
  })

  test('POST /api/executions/:id/start - starts execution', async () => {
    const res = await post(`/api/executions/${executionId}/start`)
    expect(res.status).toBe(200)

    const data = await json<{ status: string; startedAt: number }>(res)
    expect(data.status).toBe('running')
    expect(data.startedAt).toBeDefined()
    expect(typeof data.startedAt).toBe('number')
  })

  test('POST /api/executions/:id/logs - appends log', async () => {
    const res = await post(`/api/executions/${executionId}/logs`, {
      content: 'Test log entry',
    })
    expect(res.status).toBe(201)

    const data = await json<{ id: string; content: string; timestamp: number }>(res)
    expect(data.id).toBeDefined()
    expect(data.content).toBe('Test log entry')
    expect(typeof data.timestamp).toBe('number')
  })

  test('POST /api/executions/:id/logs - appends multiple logs', async () => {
    await post(`/api/executions/${executionId}/logs`, { content: 'Log 1' })
    await post(`/api/executions/${executionId}/logs`, { content: 'Log 2' })
    await post(`/api/executions/${executionId}/logs`, { content: 'Log 3' })

    const res = await get(`/api/executions/${executionId}/logs`)
    const data = await json<Array<{ content: string }>>(res)

    expect(data.length).toBeGreaterThanOrEqual(4) // Including the earlier log
  })

  test('GET /api/executions/:id/logs - gets execution logs', async () => {
    const res = await get(`/api/executions/${executionId}/logs`)
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; content: string }>>(res)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('POST /api/executions/:id/complete - completes execution', async () => {
    const res = await post(`/api/executions/${executionId}/complete`, {
      result: 'comment',
      output: 'Execution completed successfully',
    })
    expect(res.status).toBe(200)

    const data = await json<{
      status: string
      result: string
      output: string
      completedAt: number
    }>(res)

    expect(data.status).toBe('completed')
    expect(data.result).toBe('comment')
    expect(data.output).toBe('Execution completed successfully')
    expect(data.completedAt).toBeDefined()
    expect(typeof data.completedAt).toBe('number')
  })

  test('DELETE /api/executions/:id - deletes execution', async () => {
    const exec = await factory.createExecution({
      taskId,
      agentId,
      agentName: 'Delete Agent',
    })

    const res = await del(`/api/executions/${exec.id}`)
    expect(res.status).toBe(204)
  })
})

describe('Execution Failure', () => {
  let workspaceId: string
  let taskId: string
  let agentId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Failure Test Workspace')
    workspaceId = ws.id
    const agent = await factory.createAgent(workspaceId, { name: 'Fail Agent' })
    agentId = agent.id
    const task = await factory.createTask(workspaceId, { title: 'Fail Task' })
    taskId = task.id
  })

  test('POST /api/executions/:id/fail - fails execution', async () => {
    const exec = await factory.createExecution({
      taskId,
      agentId,
      agentName: 'Fail Agent',
    })

    // Start it first
    await post(`/api/executions/${exec.id}/start`)

    const res = await post(`/api/executions/${exec.id}/fail`, {
      error: 'Test failure message',
    })
    expect(res.status).toBe(200)

    const data = await json<{ status: string; output: string }>(res)
    expect(data.status).toBe('failed')
    expect(data.output).toBe('Test failure message')
  })
})

describe('Execution Analytics', () => {
  let workspaceId: string
  let taskId: string
  let agentId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Analytics Test Workspace')
    workspaceId = ws.id
    const agent = await factory.createAgent(workspaceId, { name: 'Analytics Agent' })
    agentId = agent.id
    const task = await factory.createTask(workspaceId, { title: 'Analytics Task' })
    taskId = task.id

    // Create some completed executions for analytics
    for (let i = 0; i < 3; i++) {
      const exec = await factory.createExecution({
        taskId,
        agentId,
        agentName: 'Analytics Agent',
      })
      await post(`/api/executions/${exec.id}/start`)
      await post(`/api/executions/${exec.id}/complete`, {
        result: 'comment',
        output: `Output ${i}`,
      })
    }
  })

  test('GET /api/executions/analytics - returns analytics', async () => {
    const res = await get('/api/executions/analytics')
    expect(res.status).toBe(200)

    const data = await json<
      Array<{
        agentId: string
        agentName: string
        totalExecutions: number
        completedExecutions: number
        failedExecutions: number
        successRate: number
        avgDurationMs: number | null
      }>
    >(res)

    expect(Array.isArray(data)).toBe(true)

    // Find our analytics agent
    const agentAnalytics = data.find((a) => a.agentId === agentId)
    if (agentAnalytics) {
      expect(agentAnalytics.totalExecutions).toBeGreaterThanOrEqual(3)
      expect(agentAnalytics.completedExecutions).toBeGreaterThanOrEqual(3)
      expect(typeof agentAnalytics.successRate).toBe('number')
    }
  })
})

describe('Execution Results', () => {
  let workspaceId: string
  let taskId: string
  let agentId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Results Test Workspace')
    workspaceId = ws.id
    const agent = await factory.createAgent(workspaceId, { name: 'Results Agent' })
    agentId = agent.id
    const task = await factory.createTask(workspaceId, { title: 'Results Task' })
    taskId = task.id
  })

  test('execution can complete with result=skip', async () => {
    const exec = await factory.createExecution({
      taskId,
      agentId,
      agentName: 'Results Agent',
    })
    await post(`/api/executions/${exec.id}/start`)

    const res = await post(`/api/executions/${exec.id}/complete`, {
      result: 'skip',
      output: null,
    })
    expect(res.status).toBe(200)

    const data = await json<{ result: string }>(res)
    expect(data.result).toBe('skip')
  })

  test('execution can complete with result=comment', async () => {
    const exec = await factory.createExecution({
      taskId,
      agentId,
      agentName: 'Results Agent',
    })
    await post(`/api/executions/${exec.id}/start`)

    const res = await post(`/api/executions/${exec.id}/complete`, {
      result: 'comment',
      output: 'Agent made a comment',
    })
    expect(res.status).toBe(200)

    const data = await json<{ result: string }>(res)
    expect(data.result).toBe('comment')
  })

  test('execution can complete with result=error', async () => {
    const exec = await factory.createExecution({
      taskId,
      agentId,
      agentName: 'Results Agent',
    })
    await post(`/api/executions/${exec.id}/start`)

    const res = await post(`/api/executions/${exec.id}/complete`, {
      result: 'error',
      output: 'Something went wrong',
    })
    expect(res.status).toBe(200)

    const data = await json<{ result: string }>(res)
    expect(data.result).toBe('error')
  })
})
