/**
 * Workspaces Module Tests
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
  factory,
  type ErrorResponse,
} from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Workspaces Module', () => {
  let workspaceId: string

  test('POST /api/workspaces - creates workspace', async () => {
    const res = await post('/api/workspaces', { name: 'Test Workspace' })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      name: string
      createdAt: number
      updatedAt: number
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.name).toBe('Test Workspace')
    expect(typeof data.createdAt).toBe('number')
    expect(typeof data.updatedAt).toBe('number')

    workspaceId = data.id
  })

  test('POST /api/workspaces - rejects empty name', async () => {
    const res = await post('/api/workspaces', { name: '' })
    expect(res.status).toBe(400)

    const data = await json<ErrorResponse>(res)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('GET /api/workspaces - lists workspaces', async () => {
    const res = await get('/api/workspaces')
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; name: string }>>(res)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('GET /api/workspaces/:id - gets workspace by ID', async () => {
    const res = await get(`/api/workspaces/${workspaceId}`)
    expect(res.status).toBe(200)

    const data = await json<{ id: string; name: string }>(res)
    expect(data.id).toBe(workspaceId)
    expect(data.name).toBe('Test Workspace')
  })

  test('GET /api/workspaces/:id - returns 404 for non-existent ID', async () => {
    const res = await get('/api/workspaces/non-existent-id')
    expect(res.status).toBe(404)

    const data = await json<ErrorResponse>(res)
    expect(data.error.code).toBe('NOT_FOUND')
  })

  test('PUT /api/workspaces/:id - updates workspace', async () => {
    const res = await put(`/api/workspaces/${workspaceId}`, {
      name: 'Updated Workspace',
    })
    expect(res.status).toBe(200)

    const data = await json<{ id: string; name: string }>(res)
    expect(data.name).toBe('Updated Workspace')
  })

  test('DELETE /api/workspaces/:id - deletes workspace', async () => {
    const ws = await factory.createWorkspace('To Delete')

    const res = await del(`/api/workspaces/${ws.id}`)
    expect(res.status).toBe(204)

    // Verify it's gone
    const check = await get(`/api/workspaces/${ws.id}`)
    expect(check.status).toBe(404)
  })

  test('handles unicode in workspace name', async () => {
    const res = await post('/api/workspaces', { name: '工作空间 🚀' })
    expect(res.status).toBe(201)

    const data = await json<{ name: string }>(res)
    expect(data.name).toBe('工作空间 🚀')
  })

  test('handles very long workspace name', async () => {
    const longString = 'a'.repeat(10000)
    const res = await post('/api/workspaces', { name: longString })
    expect(res.status).toBe(201)

    const data = await json<{ name: string }>(res)
    expect(data.name).toBe(longString)
  })
})

describe('Workspace Settings', () => {
  let workspaceId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Settings Test Workspace')
    workspaceId = ws.id
  })

  test('GET /api/workspaces/:id/settings - gets workspace settings', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/settings`)
    expect(res.status).toBe(200)

    const data = await json<Record<string, unknown>>(res)
    expect(typeof data).toBe('object')
  })

  test('PUT /api/workspaces/:id/settings/:key - sets workspace setting', async () => {
    const res = await put(`/api/workspaces/${workspaceId}/settings/instruction`, {
      value: 'Test instruction for the workspace',
    })
    expect(res.status).toBe(200)

    const data = await json<{ key: string; value: unknown }>(res)
    expect(data.key).toBe('instruction')
    expect(data.value).toBe('Test instruction for the workspace')
  })

  test('PUT /api/workspaces/:id/settings/:key - handles null values', async () => {
    const res = await put(`/api/workspaces/${workspaceId}/settings/instruction`, {
      value: null,
    })
    expect(res.status).toBe(200)

    const data = await json<{ value: unknown }>(res)
    expect(data.value).toBeNull()
  })

  test('DELETE /api/workspaces/:id/settings/:key - deletes workspace setting', async () => {
    // First set a setting
    await put(`/api/workspaces/${workspaceId}/settings/testKey`, {
      value: 'test value',
    })

    // Then delete it
    const res = await del(`/api/workspaces/${workspaceId}/settings/testKey`)
    expect(res.status).toBe(204)
  })
})
